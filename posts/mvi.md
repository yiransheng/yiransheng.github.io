# Make A JS Framework

## Introduction

## A Counter App

First, make a Component using `jsx`, and export it.

```javascript
// App.js

// use React namespace so babel-react plugin can translate jsx for us
import React from 'lib'; 

export default function App(state) {
  return (
    <div>
      <h1>
        Counter Example
      </h1>
      <button onClick={() => ({ type: "DECREMENT" })}>
        -
      </button>
      <button onClick={() => ({ type: "INCREMENT" })}>
        +
      </button>
      <span> Counter: {state.toString()} </span>
    </div>
  );
}
```

Second, make a reducer like how you would with `redux`:

```javascript
// reducer.js
export default function(state, action) {
  if (action.type === "INCREMENT") {
    return state + 1;
  }
  if (action.type === "DECREMENT") {
    return Math.max(0, state - 1);
  }
  return state;
}
```

Finally, bootstrap the app:

```javascript
import { app } from "./lib";

import App from "./App";
import reducer from "./reducer";

// app :: Component -> Reducer -> HTMLElement -> IO ()
const main = app(App, reducer, document.getElementById("root"));

main(/* initialState = */ 0).runIO();
```

Comparing this to a main-stream `react`, `redux`, `react-redux` setup, notice a couple of differences:

* there's no `createStore` or even the notion of a `redux` `store`
* there's no `connect`, `mapStateToProps`/`select` etc. introduced by `react-redux`
* dom events handlers are specified as pure functions with `Event -> Action` signature, and there's no effectful `dispatch` involved
* a library function `app` bootstraps the app with a Component, a reducer and a host DOM element
* no stateful components are used (they are in fact, not supported)
* every single line of application code utilizes only pure functions; up until `main(0).runIO()`, there's no side effect

## Representing View

### v = f(d)

The core of `react` design philosophy is this equation: `v = f(d)`, expressing view as a (usually) pure function of data. Data `d` is maintained by application authors, preferably modeled using something immutable. View `v` is represented as `ReactElement` data structures (commonly known as virtual dom), produced by `React.createElement` calls. The function `f` corresponds to `react` `render` functions (or Stateless Components). 

### View `v`

In many vitual-dom implementations and react clones, (eg. `virtual-dom`, `Inferno`, `Preact`, `Elm` `Html`), you tend to find a data structure / class, named `VNode` or `VirtualNode` , these structures fully describes the resulting DOM tree with lightweight javaScript objects. Often enough, they also has methods for normalization and prop validation. In our toy framework, we will simplify it even further, by representing virtual dom nodes with object literals. For example, here's a `div` element you can return from a `render` function:

```json
{
  tag : "div",
  attrs : {
    className : "pretty"
  },
  children : "Hello World"
}
```

To turn this into a actual DOM Node, we can try something like:

```javascript
function createDomElement(vnode) {
  const {tag, attrs, children} = vnode;
  const node = document.createElement(tag);
  for (const [attr, value] of attrs.entries()) {
    node.setAttribut(attr, value);
  }
  const textChild = document.createTextNode(children);
  node.appendChild(textChild);
  return node;
}
```

Of course, we would like additional tasks accomplished by `createDomElement`:

* some recursion to handled nested `vnode`s

* more flexible `children` types: 

  * ```javascript
    Children :: Child | [Child]
    Child :: null | String | VNode
    VNode :: Shape{ tag:: String, attrs:: Object, children:: Children }
    ```

We will deal with these later. But for now, another deficiency better deserves our attention: lacking of mechanisms to register event handlers. 

## Modeling Side Effects

If we stay in the pure land of functions, it's impossible to create an app or do anything useful. We can create  `vnode`s all we want, but mounting actual DOM nodes are inherently effectful and unavoidable. In `react`, this task is accomplished by `react-dom` package, for example:

```javascript
ReactDOM.render(<App />, document.getElementById('root'));
```

`ReactDOM.render` generates correct DOM api calls (such as `document.createElement`) and sync actual DOM with given vitual dom.

A useful conceptual model for this function is: `ReactDOM.render :: VNode -> IO ()` <sup>[1]</sup>. However, this signature does not capture the full story.

### Notation for Effectful Function

Let's intruduce a simple notation: `~>`, like `->` it can be used to express function types while we reserve the latter for pure functions only. A function of type: `a ~> b` signifies calling it will trigger DOM mutations (the only type of effect we care about in this exercise); otherwise, like pure functions it takes an argument of type `a` and returns some value of type `b`, unit type `undefined` is written as `()` for functions with no `return` statement. Here's an example.

```javascript
// clearNode :: HTMLElement ~> ()
function clearNode(domNode) {
  domNode.innerHTML = "";
}
```

If a function `f` calls another function `g :: a ~> b` in its body, f cannot be pure either.

```javascript
// increment :: Number ~> Number
function increment(x) {
  clearNode(document.getElementById("root"));
  return x + 1;
}
```

In addition, an effectful function could trigger dom mutations asynchronously:

```javascript
// clearOnClick :: HTMLElement ~> ()
function clearOnClick(node) {
  node.addEventListener(() => clearNode(node));
}
```

### IO

```javascript
// IO :: (() ~> a) -> IO a
class IO {
  constructor(effectful) {
    this._runIO = effectful;
  }
}
```

Take an example from earlier, here's how we can make `clearOnClick` a pure function, while preserving its intent and structure:

```javascript
// clearOnClick :: HTMLElement -> IO ()
function clearOnClick(node) {
  return new IO(() => {
    node.addEventListener(() => clearNode(node));
  });
}
```

Now, instead of dealing with functions of type `a ~> b`, we can transform all of them into `a -> IO b` and manipulate / compose them without fear of side effects. Of course, this just moves the problem of running IO effects elsewhere, we still need to run them at some point, and here's how:

```javascript
class IO {
  // (() ~> a | Promise a) -> IO a
  constructor(effectful) {
    this._runIO = effectful;
  }
  // runIO :: (IO a) ~> Promise a 
  runIO() {
    return Promise.resolve(this._runIO());
  }
}
```

By wrapping the result of `_runIO()` with `Promise.resolve`, we made `runIO` method both effectful and asynchronous, this is to accommodate the potential presence of event listeners. Here's an example.

```javascript
// listenOnce :: String -> HTMLElement -> IO 
function listenOnce(event, node) {
  return new IO(() => {
    return new Promise((resolve) => {
      node.addEventListener(event, resolve);
    });
  });
}
```

TODO: Functor and monad

```javascript
class IO {
  // (() ~> a | Promise a) -> IO a
  constructor(effectful) {
    this._runIO = effectful;
  }
  // runIO :: (IO a) ~> Promise a 
  runIO() {
    return Promise.resolve(this._runIO());
  }
  // map :: IO a -> (a -> b) -> IO b
  map(f) {
    return new IO(() => {
      return this.runIO().then(f);
    });
  }
  // chain :: IO a -> (a -> IO b) -> IO b
  chain(f) {
    return new IO(() => {
      return this.runIO().then(x => f(x).runIO());
    });
  }
}
```

```javascript
function clearOnClick(node) {
  return listenOnce("click", node)
    .chain(() => {
      return new IO(() => { node.innerHTML = ""; });
    });
}
```

### Expressing Mount 

```javascript
// mount :: HTMLElement -> VNode -> IO Action
// Action :: Shape { type:: String }
function mount(host, vnode) {
  // implementation
}
```

## Tie it All Together

```javascript
// render :: State -> VNode
// reducer :: State -> Action -> State
// host :: HTMLElement
function app(render, reducer, host) {
  const run = state => (
    mount(host, render(state))
      .map(action => reducer(state, action))
      .chain(run)
  );
  return run;
}
```

And, that's it. To kickstart the app, as shown at the beginning: `app(Component, reducer, root)(initialState).runIO()`.

This code is very condensed, and can almost only be understood by mentally tracking types of each call. Let's look at the inner function `run` line by line:

```javascript
mount(host, render(state))
```

Given the signature of `mount :: HTMLElement -> VNode -> IO Action`, this call returns an `IO Action`, which represents a promise of some UI action triggered by the user.

```javascript
.map(action => reducer(state, action))
```

`.map` on `IO Action` takes a function of type `Action -> State` and returns an `IO State`. The anonymous function `action => reducer(state, action)` satisfies `Action -> State`. After the call to `map`, we obtain an `IO State` object which represents a future state resulting from user action processed by a given reducer. 

```javascript
.chain(run);
```

This recursive call enables the app to run forever. `run` has a type of `State -> ???`, if we try to reason about its types, a self-reference in calling `.chain(run)` will cause an infinite expansion. Nonetheless, the code will not create a infinite loop or stack overflow, and we shall see why after we finish implementing `mount`.

## Implementing Effects

Now, the only missing piece is `mount`. 

```javascript
// mount :: HTMLElement -> VNode -> IO Action
// Action :: Shape{ type:: String }
function mount(host, vnode) {
  // implementation
}
```

Well, a lot of what needs to be done is already encoded in the type signature. For starter, we need to create an anonymous function `() => { ... }` and pass it to the `IO` constructor - in order to get an `IO` instance. In addition, this function should to return a `Promise` that resolves to an `Action` (a plain object with type property, something our reducer can process). Furthermore, after running the `IO` returned by mount, the `host` node should contains the exact html structure described by `vnode`. To achieve this goal, we will create a helper funciton `createElement`:

```javascript
function createTextNode(text) {
  return document.createTextNode(text);
}

const eventAttribs = new Map(
  Object.entries({
    onClick: null,
    onChange: null
  })
);

function createElement(vnode) {
  if (typeof vnode === "string") {
    return createTextNode(vnode);
  }

  const { tag, attrs = {}, children = "" } = vnode;
  const node = document.createElement(tag);
  
  for (const [attr, value] of Object.entries(attrs)) {
    if (eventAttribs.has(attr)) {
      // do nothing for now
    } else if (value !== undefined) {
      node.setAttribute(attr, value);
    }
  }
  ...
```

We create a static `Map` of `eventAttribs`, which has two keys `"onClick"` and `"onChange"`. This `Map` serves as a black list for now. We simply ignore any `"onClick"` an d`"onChange"` props stored in `vnode`'s `attrs`. Anything else gets assigned to resulting DOM node's attribute (there are exceptions such as `className` and `style` that warrants special treatments, we will ignore them for now as well). 

```javascript

  // children :: [VNode] | String
  const childNodes  =
     (Array.isArray(children) ? children : [children]).map(createElement);
  
  for (const child of childNodes) {
    node.appendChild(child);
  }
  return node;
}
```

Lastly, we recursively call `createElement` on `vnode.children`, and add in checks in case `children` is a string. This code is not type safe, but captures enough variations to cover common call paths.

Next, we fill in `mount` with `createElement`, and satisfy its type constraint:

```javascript
function mount(host, vnode) {
  return new IO(() => {
    host.innerHTML = "";
    host.appendChild(createElement(vnode));
    
    return new Promise((resolve) => null);
  });
}
```

`mount` returns an `IO` object when evaluated produces a `Promise` that never resolves. `new Promise((resolve) => null)` technically matches the type `Promise Action`, and certainly enough to not throw runtime type errors.

At this stage, the whole framework is functional, we can run the example counter app without any js errors. However, if you try that you are greeted with a static page, and the buttons do nothing at all.

### Attaching Event Handlers

Since `vnode` stores pure action creators to transform DOM events to `Action` objects (under eg. `vnode.attrs.onClick`), e just need to acquire a promise of dom event. To do this we use an array `events` to store 3-element tuples: `[domNode, eventName, transformFunction]`, and turn each tuple to a `Promise` that resolves when ever user triggers `eventName`:

```javascript
const actionPromises =
  events.map(([domNode, eventName, transformFunction]) => {
    return new Promise((resolve) => {
      domNode.addEventListener(eventName, resolve);
    }).then(transformFunction);
  });
```

And combine these `Promise`s into one with `Promise.race`:

```javascript
function mount(host, vnode) {
  return new IO(() => {
    host.innerHTML = "";
    host.appendChild(createElement(vnode));
  
    // ... compute events
    
    const actionPromises =
      events.map(([domNode, eventName, transformFunction]) => {
        return new Promise((resolve) => {
          domNode.addEventListener(eventName, resolve);
        }).then(transformFunction);
      });
    
    return Promises.race(actionPromises);
  });
}
```

How do we get the data for `events`? We could just modify `createElement` to collect events in addition to returning DOM node:

```javascript
function createTextNode(text) {
  return [document.createTextNode(text), []];
}

const eventAttribs = new Map(
  entries({
    onClick: (transform, domNode) => [domNode, "click", transform],
    onChange: (transform, domNode) => [domNode, "change", transform]
  })
);

// createElement :: 
//   VNode -> [HTMLElement, [HTMLElement, String, HTMLEvent -> Action]]
function createElement(vnode) {
  if (typeof vnode === "string") {
    return createTextNode(vnode);
  }

  const { tag, attrs = {}, children = "" } = vnode;
  const node = document.createElement(tag);

  const events = [];
  for (const [attr, value] of entries(attrs)) {
    if (eventAttribs.has(attr)) {
      events.push(eventAttribs.get(attr)(value, node));
    } else if (attr === "className") {
      node.className = value;
    } else if (value !== undefined) {
      node.setAttribute(attr, value);
    }
  }

  return (Array.isArray(children) ? children : [children])
    .map(createElement)
    .reduce(appendChild, [node, events]);
}

function appendChild([node, events], [childNode, childEvents]) {
  node.appendChild(childNode);
  return [node, [...events, ...childEvents]];
}

```

And the final version of `mount`, where some proper listener cleanup is added:

```javascript
function mount(host, vnode) {
  return new IO(() => {
    host.innerHTML = "";
    const [node, events] = createElement(vnode);
    host.appendChild(node);

    const dispose = new WeakMap();
    const actionPromises = events.map(([node, eventName, mapper]) => {
      return new Promise(resolve => {
        const listener = e => {
          events.forEach(([node]) => {
            node.removeEventListener(eventName, dispose.get(node));
          });
          resolve(mapper(e));
        };
        dispose.set(node, listener);
        node.addEventListener(eventName, listener);
      });
    });

    return Promise.race(actionPromises);
  });
```

