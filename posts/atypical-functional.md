# An Atypical Intro to Functional Programming 

## Lambda Set

In this section, we will be implementing a ES6 language feature: [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), a collection of values and a way to test membership of individual elements. We may scratch out an abstract `Set` interface, in OO thinking it could map to something like (typescript):

```typescript
interface ISet<T> {
  has(elem: T): boolean;
}
```

A concrete implementation would take the form of a `class`,  which will implement the `has` method. We can expand the interface to include common set operations such as `union`, `difference`, `intersect` etc., and enrich its functionality. However, the crucial part of a `set` remains the same: it is a method/function (`has`) that takes an element and returns a boolean.

In fact, we can just focus on this critical aspect, and represent a set as the function `has` itself. With this strategy in mind, we can define two trivial but important sets, empty set $\varnothing$ and universal set $\Omega$:

```javascript
const ∅ = (x) => false;
const Ω = (x) => true;
```

Next simplest type of sets are singletons or unit set. A function that takes an given element and return a singleton set of that element is also pretty easy to write using closures:

```javascript
const unit = (elem) => (x) => x === elem; 
```

What about other (finite) sets with multiple elements? Armed with just three basic building blocks, we can construct them through well-defined mathmetical set operators:

* union ($\cup$): $A \cup B := \{ x | x \in A \text{ or } x \in B \}$
* intersect ($\cap$): $A \cap B := \{ x | x \in A \text{ and } x \in B \}$
* complement : $\bar{A} := \{x | x \in \Omega \text{ and } x \notin A \}$
* difference($/$): $A / B := A \cap \bar{B}$

With the exception of complement (assuming implicit universal set), all operators are binary operations, implying they can be implemented as 2-ary functions, we shall name them: `union2`, `intersect2`  and `difference2`to highlight this fact.

```javascript
const union2 = (set1, set2) => 
  (x) => set1(x) || set2(x);
const intersect2 = (set1, set2) => 
  (x) => set1(x) && set2(x);

const complement = (set) => (x) => !set(x);
const difference2 = (set1, set2) => 
  intersect2(set1, complement(set2))
```

All four functions are higher order function with the signiture of `set`$\rightarrow$`set` - since a `set` itself is a function (of type: `<T>(elem: T): boolean`). A particular neat aspect of `difference2` is that it is entirely expressed with other set operators, and directly derived from mathematical definition. Even if we change ethe underlying implementation of `union2` and `complement`, `difference2` would still work as expected. If we incline to be more explicit, we can also define higher-order function `has` this way:

```javascript
function has(set, element) {
  return set(element);
}
// curried form
const has = (set) => (element) => set(element); // or
const has = (set) => set;
```

Furthermore, we can take advantage of the variadic nature of javaScript functions and implement more versatile `union` and `intersect`:

```javascript
const union = (...sets) => sets.reduce(union2, ∅);
const intersect = (...sets) => sets.reduce(intersect2, Ω);
```

If you are not already familiar with `reduce` or `foldl`, it's helpful to think reduce as repeated application of a binary operator over a list. 
$$
[a_1, a_2, a_3, \dots,  a_n].\text{reduce}(\text{op}, a_0) := a_0 \diamond a_1  \diamond a_2 \diamond a_3 \dots \diamond a_n
$$
where :
$$
x \diamond y := \text{op}(x, y)
$$
Finally we can build a set from a list(array) with two steps:

1. using `map` and `unit` to create an array of singletons sets 
2. apply `union` on the array of sets

```javascript
const fromList = (list) => union(...list.map(unit));
```

```javascript
fromList([1, 2, 2, 3, 9])(2); // true
fromList(["hello", "world"])("goodbye"); // false
```

Lastly, we may want to wrap all these functions into a `class`-based api. JavaScript is a multi-paradigm language, and a lot of times, a `class`-based api works better even for functional purposes. We will talk a bit more about this after presenting a `MyImmutableSet` class. It is a wrapper around `set` functions and operations. We put "immutable" in the name because set operations on the objects always return new  instances.

```javascript
class MyImmutableSet {
  constructor(set) {
    this._set = set || ∅;
  }
  has(x) {
    return this._set(x);
  }
  add(x) {
    return new MyImmutableSet(
      union(this._set, unit(x))
    );
  }
  delete(x) {
    return new MyImmutableSet(
      difference2(this._set, unit(x))
    );
  }
}
```

```javascript
const frozenset = new MyImmutableSet()
  .add(1)
  .add(2)
  .add(2)
  .add(3)
  .delete(2);

frozenset.has(1); // true
frozenset.has(2); // false
frozenset.has(3); // true
```

`MyImmutableSet` obviously implements `ISet` we outlined earlier, it also mirrors `ES6` `Set` apis: `add`, `has` and `delete`, with the exception `add` and `delete` are immutable. The reason to use `class` as a wrapper is it prevides a nice mechanism of function chaining, and much better readability. For example, this spinet looks a lot more clustered and unnatural: 

```javascript
const set = difference(union(unit(1), unit(2), unit(2), unit(3)), unit(2));
```

Keep in mind, this `Set` implementation is just a toy example to illustrate the idea of using functions to represent data, it does not have the full api of ES6 `Set` (notably does not support enumeration), and is very inefficient in some common use cases (eg. set of `string`s).

But are there any practical benefits at all? Well, there actually is. It turns out, we can actually represent infinite `Set`s ($\Omega$ provides an example already). For instance, a set of all odd positive numbers:

```javascript
const evenNumbers = (x) => x % 2 === 0;
const positiveNumbers = (x) => x > 0;
const oddPositiveNumbers = 
      difference2(positiveNumbers, evenNumbers); 
```

## Lambda Finite State Machine

We have explored the possibility of using functions to represent data, it is a conceptually refreshing idea. In this section, the same idea will be used to provide a strategy for implementing [deterministic finite state machines](https://en.wikipedia.org/wiki/Deterministic_finite_automaton). Particularity, this one:

![](https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/DFA_example_multiplies_of_3.svg/500px-DFA_example_multiplies_of_3.svg.png) 

A natural and straight-forward way of designing a DFA api might look something like this:

```javascript
const config = {
  "s0" : {
    "0" : "s0",
    "1" : "s1"
  },
  "s1" : {
    "0" : "s2",
    "1" : "s0"
  },
  "s2" : {
    "0" : "s1",
    "1" : "s2"
  }
}
const machine = fsm(config, /*startState = */"s0");
```

State transition table can be represented as a nested hashmap, a.k.a objects. States are identitied by a string key (eg. `"s1"`, `"s2"`, `"s0"`) and so are transition symbols (eg. `"0"` and `"1"`). The library function `fsm` could use the transition table (`config`) to create transition functions, which looks up next state based on a tuple of inputs: `currentState` and `transition`. To be more principled, we may use types to encode states and transitions, for instance in typescript:

```typescript
enum State {
  S0,
  S1,
  S2
};
enum Symbol {
  T0, // 0
  T1  // 1
}
interface TransitionFunction {
  (currentState: State): (transition: Symbol) => State; // curried
}
```

Here's an example of a particular transition function for state `"s0"`:

```javascript
function s0Transition(symbol) {
  switch(symbol) {
    case "0":
      return "s0";
    case "1":
      return "s1";
    default:
      throw Error("Unknown Symbol");
  }
}
```

We can then create one such function for each state in transition table. At run time, a single variable storing current state is kept internally, and we use it to look up next state transition function. This concludes a very basic finite state machine implementation.

```javascript
function fsm(config, startState, acceptStates) {
  
  let currentState = startState;
  
  ...
  
  return {
    _next (symbol) {
      const transition = lookup(table, currentState);
      currentState = transition(symbol);
    }
    matches(symbols) {
      for (const symbol of symbols) {
        this._next(symbol);
      }
      return acceptStates.includes(currentState);
    }
  };
}
```



You may know in functional programming, mutable state is kind of frowned upon, can we do away the `currentState` then? It's in fact fairly easy with `reduce`:

```javascript
...
{
  matches(symbols) {
    const finalState = symbols.reduce((state, symbol) => {
      return lookup(table, state)(symbol);
    }, stateState);
    return acceptStates.includes(finalState);
  }
};
```

The impure method `_next` is replaced with a anonymous "reducer",  which takes current state, a transition symbol and returns a next state (this may reminds you of `redux`).  Now squint at the body of this "reducer":

```javascript
(state, symbol) => {
  return lookup(table, state)(symbol);
}
```

What if we get rid of the call to the result of `lookup` closure:

```javascript
(state, symbol) => {
  return lookup(table, state);  // a function of type: Symbol -> State
}
```

It will break the code of course, since the "reducer" expects input to be a state (string or Enum), and we will pass in a function instead in the next reduce step. To fix it, what if we represent the state itself as functions, i.e. (using typescript notation):

```typescript
type State = (s: Symbol) => State;
```

Now let's rewrite the transition function from earlier, modifying the return statements to return functions instead.

```javascript
function s0Transition(symbol) {
  switch(symbol) {
    case "0":
      return s0Transition;
    case "1":
      return s1Transition;
    default:
      throw Error("Unknown Symbol");
  }
}
```

This is a partial function, as the `default` branch in `switch` statement throws error. We can fix this by adding a [`trap`](http://jflap.org/tutorial/fa/trapstate/index.html) state.  A trap state is a state where any undefined transitions on any state ends up.

```javascript
function s0Transition(symbol) {
  switch(symbol) {
    case "0":
      return s0Transition;
    case "1":
      return s1Transition;
    default:
      return trap;
  }
}
function trap(symbol) {
  return trap;
}
```

Now, of course is the time to revisit the reduce expression in our `matches` implementation:

```javascript
function matches(symbols, acceptStates) {
  const finalState = symbols.reduce(
      (state, symbol) => state(symbol),
      stateState
  );
  return acceptStates.includes(finalState);
}
```

One immediate observation is the "reducer" no longer needs to be a closure. That is to say, `(state, symbol) => state(symbol)` does not capture values from its surronding environment. In fact we can just use a named function here:

```javascript
function applyFunction(f, x) { // known as `$` in haskell
  return f(x);
}
function matches(symbols, acceptStates) {
  const finalState = symbols.reduce(applyFunction, startState);
  return acceptStates.includes(finalState);
}
```

And finally, the full DFA illustrated at the beginning of this section:

```javascript
const trap = (symbol) => trap;
const s0 = (symbol) => {
  switch(symbol) {
    case "0":
      return s0;
    case "1":
      return s1;
    default:
      return trap;
  }
}
const s1 = (symbol) => {
  switch(symbol) {
    case "0":
      return s2;
    case "1":
      return s0;
    default:
      return trap;
  }
}
const s2 = (symbol) => {
  switch(symbol) {
    case "0":
      return s1;
    case "1":
      return s2;
    default:
      return trap;
  }
}
function applyFunction(f, x) {
  return f(x);
}
function matches(symbols, startState, acceptStates) {
  const finalState = symbols.reduce(applyFunction, startState);
  return acceptStates.includes(finalState);
}
// example use:
matches(
  "0010101010101".split(""),
  s0,
  [s2]
);
```

The pattern may be reused to handle async transitions, for instance using `Rx`, given a stream of `symbols$`:

```javascript
const states$ = symbols$
  .scan(applyFunction, startState)
  .takeWhile(state => state !== trap);
```

This creates a stream of `states$`, which terminates when enters `trap` state, and input `symbols$` are async and potentially infinite.