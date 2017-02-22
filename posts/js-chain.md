---
title: 'Anatomy of JavaScript Method Chaining'
author: "Yiran Sheng"
date: "02/25/2017"
output: html_document
---

Method chaining is ubiquitous in javaScript libraries. It's a useful patten for designing apis in a convenient and succinct fashion. Resulting code is usually a series of on-liners that declaratively communicates the underlying data flow without getting distracted by implementation details.

It's found in `jQuery`:

```javascript
$(selector)
  .addClass(className)
  .css("display", "block")
  .fadeIn();
```

In `lodash`:

```javascript
_(collection)
  .map(transform)
  .filter(predicate)
  .find({ id: 123 });
```

Even in vanilla code:

```javascript
fetch(httpOptions)
  .then(res => res.json())
  .then(data => data.articles)
  .catch(err => console.error(err));
```



In this article, we will try to distill method chaining to its essence, making a distinction of mutable vs immutable chaining, and draw some parallels with composition in functional programming. Let's begin with a very simple example.



## Introductory Example

A 2d `Point` data structure is commonly used in many programming language tutorials to demonstrate basic usage of certain language features such as classes or structs. Operations of interests include vector addition, dot product, normalization and so on. In javaScript it's natural to use a `class` for such a task.

```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
```

This is a good starting point. To implement addition of two `Point`s:

```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(otherPoint) {
    this.x += otherPoint.x;
    this.y += otherPoint.y;
    return this;
  }
}
```

This version of `add` mutates `Point` instances, and by returning `this` we can chain as many `add` calls as needed, and get back the original point with `x` and `y` properties updated in-place. An alternative version may opt not to change original point:

```javascript
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(otherPoint) {
    return new Point(
      this.x + otherPoint.x,
      this.y + otherPoint.y
    );
  }
}
```

When using `Point` class:

```javascript
const p0 = new Point(0, 0);
const p1 = new Point(0, 1);
const p2 = new Point(1, 0);

const p = p0.add(p1).add(p2);
```

Both implementation with return a `Point` with `x = 1` and `y = 1`, differences here, of course are the enforcement of immutability. It's very important to recognize these two different type of method chaining with regards to immutability. And depending on the context and convention, one variation may be more favorable than the other.

## Immutable and Mutable Chaining in other Languages  

In java, the builder pattern is a common recipie to construct object in a concise and readable way:
```java
User user = User.builder()
  .email("user@example.com")
  .age(30)
  .phone("1234567")
  .address("1234 Somewhere")
  .build();
```

`Builder` objects are mutable, all the build steps returns the same instance with its internal state modified. A final `build` call constructs the underlying structure it tries to build. Many mutable method chaining apis tend to have a definitive "final" call to indicate the finalization / completion of the chain of calls, with names like `build`, `finalize`, `done`, `value` etc.

Another JVM language, Scala, is a language where perhaps immutable method chaining is most often spotted. 


```scala
textFile.flatMap(line => line.split(" "))
                 .map(word => (word, 1))
                 .reduceByKey(_ + _)
```

In the above code (Spark), each step returns a new value of the same type (RDD in this case); previous value is kept intact and unchanged.

The wikpedia [article](https://en.wikipedia.org/wiki/Method_chaining) on this topic has a few more examples from various languages.

## To Mutate or not to Mutate
Although most of the time when designing an api, it's necessary to decide on immutable vs mutable representations upfront, it's still possible to offer the benefits of both worlds while maintaining an unified front of the entire api surface. An example is [`immutable-js`](https://facebook.github.io/immutable-js/). For instance, consider the following code:

```javascript
const map1 = Immutable.Map();
function setABC(map) {
  return map.set("a", 1).set("b", 2).set("c", 3);
}
const map2 = setABC(map1);
```

`map.set("a", 1).set("b", 2).set("c", 3)` creates two intermediary `Map`s that are not needed at all. Fortunately, the library does offer a solution, `withMutations`, used like this:

```javascript
function setABC(map) {
  return map.withMutations(mutMap => {
    mutMap.set('a', 1).set('b', 2).set('c', 3);
  });
}
```

The implementation of `withMutation`, can be found [here](https://github.com/facebook/immutable-js/blob/c65062599ecad54a1ad5bacd72f65e8f9ef7449b/src/Map.js#L165):

```javascript
// ...
  withMutations(fn) {
    var mutable = this.asMutable();
    fn(mutable);
    return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
  }
// ...
```

Without going into too much details, the library offers a mutable version of its immutable data structure (in this case `Map`) sharing much of the same api, and allow for the conversion between the two seamlessly. To explore this idea with a toy example, let's revisit the `Point` class.

First, create a both mutable and immutable version of `Point`:

```javascript
class PointerInterface {
  add(otherPoint) {
    return this;
  }
}

class PointMut extends PointerInterface {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add({ x, y }) {
    this.x += x;
    this.y += y;
    return this;
  }
}
class Point extends PointerInterface {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add({ x, y }) {
    return new Point(this.x+x, this.y+y);
  }
}
```

Then, implement `asMutable` for `Point` to `PointMut` conversion:

```javascript
class Point extends PointerInterface {
  // ...
  asMutable() {
    return new PointMut(this.x, this.y);
  }
}
```

Similarly,

```javascript
class PointMut extends PointerInterface {
  // ...
  asImmutable() {
    return new Point(this.x, this.y);
  }
}
```

Then we can write `withMutations` similar to how `immutable-js` does things:

```javascript
// only export immutable Point
export default class Point extends PointerInterface {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add({ x, y }) {
    return new Point(this.x+x, this.y+y);
  }
  asMutable() {
    return new PointMut(this.x, this.y);
  }
  withMutations(fn) {
    var mutable = this.asMutable();
    fn(mutable);
    return mutable.asImmutable();
  }
}
```



## Immutable Method Chaining: a Functional View

It seems fairly obvious how to design immutable, chainable apis, just write methods returning new (immutable) instances of the class.

```javascript
class Chainable {
  transform(...args) {
    // implementation
    return new Chainable(/* ... */);
  }
}
```
As a simpler alternative, the following code does the exact same thing as above, with a plain function:
```javascript
function transform(chainable, ...args) {
  // implementation
  return new Chainable(/* ... */);
}
```

The type signature of `transform` is: `(Chainable, ...any) -> Chainable`. Of course, when we have multiple `transform`s on `Chainable` (either multiple calls or multiple types of transforms), the function version quickly becomes very cumbersome to use. Compare the following:

```javascript
transform3(
  transform2(
    transform1(chainable, args1), args2), args3);
```

vs.

```javascript
chainable
  .transform1(args1)
  .transform2(args2)
  .transform3(args3);
```

However, this does not mean function-only strategy is not possible to achieve the same level of flatness and readability, we have a few tricks that can help from functional programming: function currying and composition.

First, lets rearrange the arguments position for `transform`s, and make them curried:

```javascript
const transform1 = (arg) => (chainable) => {
  // code
  return new Chainable(/* ... */);
}
const transform2 = (arg) => (chainable) => {
  // code
  return new Chainable(/* ... */);
}
const transform3 = (arg) => (chainable) => {
  // code
  return new Chainable(/* ... */);
}
```

How do we proceed in using them? We could carefully write down all the necessary calls:

```javascript
transform3(arg3)(transform2(arg2)(transform(arg1)(chainable)))
```

But there is a better way. To get to it, we will need to introduce a higher order function: `compose`. It is a variadic function than takes any number of functions, and produce a single function that runs all input functions (right to left per convention). For a case with two input functions $f$ and $g$:

$$
\text{compose}(f, g) = f \circ g := x \rightarrow f(g(x))
$$

`compose` is not particularly common in javaScript ecosystem; but not unheard of either. For example `redux` ships it and makes heavy use of the function in its middleware / enhancer architecture. To implement `compose` from scratch is not hard either with ES2015 syntactic sugar:

```javascript
function compose(...funcs) {
  return funcs.reduceRight((g, f) => (...args) => f(g(...args)), x => x);
}
```

 Now, back to the problem (piping input value through a series of `transform`s):

```javascript
const result = compose(
  transform3(arg3),
  transform2(arg2),
  transform1(arg1)
)(chainable);
```

Why does this work? Recall transform functions are curried. `transform1(arg1)` produces a function / closure that takes a `Chainable` and returns another `Chainable`, so does `transform2(arg2)` and `transform3(arg3)`. When composed together (right to left), we get a function than takes an input, and call all three functions in order (1, 2, 3).

Compare the code with the version based on method chaining:

```javascript
const result = chainable
  .transform1(arg1)
  .transform2(arg2)
  .transform3(arg3);
```

Both has pretty good readability and conveys the underlying intent of the code well. Chaining based api has been commonplace in javaScript ecosystem pretty much since forever. `compose`-based ones on the other hand, have only seen a surge in popularity in the last few years. Here's a few high-profile examples:

### `redux` enhancers

A `redux` [enhancer](https://github.com/reactjs/redux/blob/master/docs/Glossary.md) defined by its types:

> `type StoreCreator = (reducer: Reducer, preloadedState: ?State) => Store`
>
> `type StoreEnhancer = (next: StoreCreator) => StoreCreator`

Enhancers are higher order functions that takes a store creator and returns a new one. Multiple enhancers can be composed together, and applied to the base store creator - providing rich extensions to core redux functionality. Example:

```javascript
const createStoreWithEnhancers = compose(
  applyMiddlewares(...),
  batchStoreEnhancer,
  createAgendaEnhancer
)(createStore);

const store = createStoreWithEnhancers(reducer, initialState);
```

### `recompose`

Another example from `React` ecosystem. As the name suggests, `recompose` is all about provide higher order react components (which are just functions with `Component -> Component` signature), and compose them together. Example:

```javascript
const enhancer = compose(
  withState("counter", "setCounter", 0),
  withProps(derivingProps)
  pure
);
const EnrichedComponent = enhancer(BaseComponent);
```

### `transducers`

[Transducer](http://phuu.net/2014/08/31/csp-and-transducers.html) is a powerful idea coming from the clojure world. A javaScript [implementation](https://github.com/cognitect-labs/transducers-js) exists. Example:

```javascript
import t from 'transducers-js';

const xf = compose(
  t.map(x => x + 1),
  t.filter(x => x % 2 === 0)
  t.takeWhile(x => x < 5)
)
t.into([], xf, range(20)); // [2, 4]
```



## More on `compose`

A unique library where both chaining and compose based apis are provided is `lodash` / `lodash-fp`. Some time back in `lodash` v3, the following code is encouraged to take advantage of lazy evaluation:

```javascript
_(array)
  .map(x => x + 1)
  .filter(x => x > 0)
  .value();
```

This practice is now discouraged due to consideration of bundle size. In order to use lodash wrapping and chaining, all lodash helpers needs to be defined on the wrapper class prototype, forcing the user to load the entire library, even if only a couple methods are used.

Instead, with `lodash-fp`:

```javascript
compose(
  map(x => x + 1),  // a function of type: [a] -> [a]
  filter(x => x > 0) // a function of type: [a] -> [a]
)(array);
```

Only `map` and `filter` needs to be imported. Of course in this particular example, underlying performance characteristics may be different (with respect to allocating intermediary arrays).

This is a good example outlining the benefits of `compose` based apis: they do not require the data type being manipulated to be a `class`. A chaining based api requires all desired transformations defined as prototype methods beforehand. On the other hand, with `compose`, new transformations can be defined and created much easier, and the underlying mechanism is more extensible and flexible. As long as we can express the problem at hand with some data type `a`, and model the operations we intend to perform on it as functions of type `a -> a`, `compose` can be used to build bigger computations from small units. the type `a` can even be other functions (like redux `createStore`).

One last little observation, notice anything about the `a -> a` signature? Can you come up with a function that satisfies this? Well, the most trival one come to mind first:

```javascript
function id(x) {
  return x;
}
```

`id` can be in fact be composed together with other `a -> a` functions, providing a no-op step in the pipeline. This is equivalent to providing `return this` as a method on chaining based approaches.

## Closing Remarks

After exploring the various aspects of method chaining, a couple of useful principles or takeaways can be summarized:

* Decide on mutable vs. immutable chaining when designing an api
* But know that you can have both with pattens like `withMutations`
* When your api targets a functional audience, do the following to facilitate composition:
    - make the functions curried (at least optionally)
    - arrange the function arguments such that the last argument is the primary data type 