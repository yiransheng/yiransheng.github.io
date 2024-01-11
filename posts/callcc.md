---
title: "Understanding call/cc"
author: "Yiran Sheng"
date: "01/10/2024"
output: html_document
---
## Intro

I set up this blog almost eight years ago. I was learning about functional programming at the time, and chose to implement the static site building pipelines in JavaScript - with a custom made monadic CPS framework. It was the worst code I have ever written, even if it is still functional. Every single bug fix over the years was hair-pulling difficult, truly one of the worst in terms of maintainability (I am too embarrassed to link the code here).

Nonetheless, I still consider the knowledge gained in learning about and implementing an ill-advised version of continuation monads valuable. The problem was, I had forgotten about most of what I learned back then. I wrote this article as a refresher for myself.

## Perhaps better written articles on this topic

[The Mother of all Monads](https://www.schoolofhaskell.com/user/dpiponi/the-mother-of-all-monads)

[A page about `call/cc`](http://www.madore.org/~david/computers/callcc.html)

## Continuations in JavaScript

Continuation Passing Style (CPS) is a programming pattern where control is passed explicitly through continuation functions. In simpler terms, instead of returning the result of a function traditionally, the function passes the result to another function (the continuation function) that you define and which dictates what happens next.

In JavaScript, a language with first class functions, CPS can be implemented using callback functions. A callback function is a function passed into another function as an argument, which is then invoked inside the outer function to complete some kind of routine or action. Here's a basic example in JavaScript:

```javascript
function add(a, b, callback) {
    const sum = a + b;
    callback(sum); // passing the result to the callback function
}

function print(result) {
    console.log('The sum is:', result);
}

add(5, 7, print); // This will log "The sum is: 12"
```

## A Continuation Monad in TypeScript

First a named callback type to improve readability before things get complicated:

```typescript
type Callback<T> = (arg: T) => void;
```

While a standard function returns a value directly, as in `const ret3 = () => 3`, a CPS-style function, such as `const Ret3 = (k: Callback<number>) => k(3)`, invokes a provided callback with its result.

<aside>
<div>
#### Side Note
Throughout the rest of this article, I shall use Uppercase identifiers for CPS function names and lowercase names for regular/direct-style function names to distinguish the two styles.
</div>
</aside>

To formalize this approach, we encapsulate such functions in a `class`, enabling us to implement monadic interfaces, the most significant of which is `flatMap` (analogous to `>>=` or `bind` in Haskell):

```typescript
class Cont<T> {
  static of<U>(a: U): Cont<U> {
    return new Cont((k) => k(a));
  }

  constructor(private runCont: (k: Callback<T>) => void) {}

  run(k: Callback<T>) {
    this.runCont(k);
  }

  map<U>(f: (arg: T) => U): Cont<U> {
    return new Cont((k) => {
      this.runCont((t) => k(f(t)));
    });
  }

  flatMap<U>(f: (arg: T) => Cont<U>): Cont<U> {
    return new Cont((k: Callback<U>) => {
      this.runCont((t) => f(t).run(k));
    });
  }
}
```

An example of a simple `add` function in this style:

```typescript 
const Add = (a: number, b: number): Cont<number> => new Cont((k) => k(a + b));
```

In fact, we can transform any regular style function to CPS function with this helper:

```typescript
function xform<F extends Function>(
  f: F,
): (...args: Parameters<F>) => Cont<ReturnType<F>> {
  return (...args) =>
    new Cont((k) => {
      const ret = f(...args);
      k(ret);
    });
}

const mul = (a: number, b: number) => a * b;
const Mul: (a: number, b: number) => Cont<number> = xform(mul);
```

Let's compare a full program translation with both regular and CPS styles:

```typescript
// Regular
const sum = add(1, 2);
const prod = mul(sum, 1);
console.log(prod);

// CPS
Add(1, 2)
  .flatMap((sum) => Mul(sum, 1))
  .run((prod) => console.log(prod));
```

## `Do` Notation

Writing code in CPS can be cumbersome and reminiscent of the "callback hell". To alleviate this, we introduce a simplified version of Haskell's `Do` notation into JavaScript/TypeScript using generator functions:

```typescript
function _do<R>(genFn: Generator<Cont<unknown>, R, unknown>): Cont<R> {
  const gen = genFn();
  const recurr = (val) => {
    const { value, done } = gen.next(val);
    if (!done) {
      return value.flatMap(recurr);
    } else {
      return Cont.of(value);
    }
  };
  return recurr();
}
```

Due to TypeScript's expressive yet constrained type system, fully typing this helper function is challenging. It uses `unknown` types since there's no single type for the yielded values or the values sent into the generator. Here's an example usage:

```typescript
const print = (x: any) => console.log(x);
const Print = xform(print);

_do(function *() {
  const sum = yield Add(1, 2);
  const prod = yield Mul(sum, 1);
    
  yield Print(prod);
  return prod;
}).run(k => {});
```

In true functional programming style, this approach allows us to construct a large `Cont` monad that represents the entire program as a data structure. The final `run(k => {})` call initiates the actual computations.

## `call/cc` Magic

Now that we have built some useful CPS primitives, finally, we are ready to talk about `call/cc` (call with current continuation).

```typescript
type CC<T> = (x: T) => Cont<any>;

function callcc<T>(f: (cc: CC<T>) => Cont<T>) {
  return new Cont(k => f(a => new Cont(_ => k(a))).run(k));
}
```

When `callcc` is invoked, it gives the function access to the current continuation as an argument. This continuation can be called with a value to "jump back" to the point where `callcc` was called, effectively allowing functions to control the flow of the program in non-linear ways. I understand this description is hand-wavy, and the one liner implementation of `callcc` might look impenetrable and hard to make sense of. Let's consider a concrete example expanded from the previous section.  

```typescript
const Main = _do(function *() {
  const sum = yield Add(1, 2);
  const prod = yield Mul(sum, 1);

  yield Print(`start prod = ${prod}`);

  const value = yield callcc(raise => _do(function *(){
    yield Print("about to raise 4");
    const never = yield raise(4);
    yield Add(never, 44);
    yield Print("unreachable!");

    return -1;
  }));

  yield Print(`log value: ${value}`);
  yield Print('end');

  return value;
});


Main.run((result) => {});
```

When `raise(4)` is called within `callcc`, it effectively "jumps" back to the `callcc` invocation, replacing the continuation with the value `4`. This makes the program flow jump to the logging of `value`, skipping the remaining code, namely these statements:

```typescript
yield Add(never, 44);
yield Print("unreachable!");
```

The output demonstrates this flow:

```text
start prod = 3
about to raise 4
log value: 4
end
```

### Breaking Down `callcc` in Detail

In this section, we'll take a deep dive into how the `callcc` function operates in the provided TypeScript code. This detailed breakdown will involve expanding the code step-by-step and explaining each part to illustrate the underlying mechanism of `callcc`. We start with the original `callcc` function definition:

```typescript
function callcc<T>(f: (cc: CC<T>) => Cont<T>) {
  return new Cont(k => f(a => new Cont(_ => k(a))).run(k));
}
```

In the code example, `callcc` is used as follows (after desugaring the `_do` notation):

```typescript
callcc((raise) =>
  raise(4).flatMap((never) =>
    Add(never, 44).flatMap((_) =>
      Print("unreachable!").flatMap((_) => Cont.of(-1)),
    ),
  ),
);
```

#### First Level of Expansion

We expand the `callcc` usage by substituting the lambda function passed to `f` in `callcc`:

```typescript
new Cont((k) =>
  ((raise) =>
    raise(4).flatMap((never) =>
      Add(never, 44).flatMap((_) =>
        Print("unreachable!").flatMap((_) => Cont.of(-1)),
      ),
    ))((a) => new Cont((_) => k(a))).run(k)
);
```

In this expanded form:

1. `new Cont(k => ...)`: A new continuation is created, where `k` is the continuation representing the rest of the computation after `callcc`.
2. `(raise => ...)`: A lambda function is provided, taking `raise` as its argument. `raise` is a function that will capture the current continuation.

#### Second Level of Expansion

At this stage, we'll replace `raise` with the function `(a) => new Cont((_) => k(a))`. Here's how it looks after this expansion:

```typescript
new Cont((k) =>
  ((a) => new Cont((_) => k(a)))(4)
    .flatMap((never) =>
      Add(never, 44).flatMap((_) =>
        Print("unreachable!").flatMap((_) => Cont.of(-1)),
      ),
    )
    .run(k),
);
```

In this expanded form:

1. `((a) => new Cont((_) => k(a)))(4)`: The lambda function `(a) => new Cont((_) => k(a))` is immediately invoked with the value `4`.
2. `new Cont((_) => k(4))`: The invocation results in a new `Cont` instance. Inside this `Cont`, the unused parameter `_` is ignored, and `k` is directly called with `4`, full code below:

```typescript
new Cont((k) =>
  new Cont((_) => k(4))
    .flatMap((never) =>
      Add(never, 44).flatMap((_) =>
        Print("unreachable!").flatMap((_) => Cont.of(-1)),
      ),
    )
    .run(k),
);
```

#### Implication of the Expansion

This expansion illustrates the key operation of `callcc`. The new `Cont` instance created (`new Cont((_) => k(4))`) is a continuation that, when run, bypasses the remaining computation in the lambda function and directly applies `4` to the continuation `k`. This effectively "jumps" back to the continuation point where `callcc` was invoked, using the value `4`. As a result, the `flatMap` chain that follows this new `Cont` instance is never executed, and any code within it becomes unreachable.

## Some really cursed stuff

For our next example, we'll forgo the `_do` helper and use `flatMap` directly, since generators are stateful and cannot truly and properly model the `Do` notation (which is syntactic sugar only).

```typescript
let ccStash;
const Main2 = Add(1, 2)
  .flatMap(sum => Mul(sum, 1))
  .flatMap(prod => {

    return callcc(cc => {
      ccStash = cc;

      return cc(prod);
    });
  })
  .flatMap((v) => Print(`v = ${v}`).map(() => v + 1))
  .flatMap((v) => ccStash(v));

Main2.run((r) => {});
```

At the `callcc` call site, we sneakily stash away the `cc` variable, which is a lambda representing "the rest of the program" consisting of:

```typescript
.flatMap((v) => Print(`v = ${v}`).map(() => v + 1))
.flatMap((v) => ccStash(v));
```

Note `ccStash` is invoked as a final part of `ccStash` itself! Unsurprisingly, running this leads to an infinite loop and stack overflow:

```bash
v = 1271
v = 1272
v = 1273
v = 1274
v = 1275
v = 1276
error: Uncaught (in promise) RangeError: Maximum call stack size exceeded
  console.log(x);
  ^
    at print (file:/dev/cont/index.ts:68:3)
    at Cont.runCont (file:/dev/cont/index.ts:36:17)
    at Cont.runCont (file:/dev/cont/index.ts:17:12)
    at Cont.run (file:/dev/cont/index.ts:12:10)
    at file:/dev/cont/index.ts:26:14
    at Cont.runCont (file:/dev/cont/index.ts:100:44)
    at Cont.run (file:/dev/cont/index.ts:12:10)
    at file:/dev/cont/index.ts:26:14
    at file:/dev/cont/index.ts:18:9
    at Cont.runCont (file:/dev/cont/index.ts:37:5)
```

This illustrates the powerful and potentially dangerous nature of continuations and `call/cc` in programming.

## Why we might want to use CPS

In JavaScript particularly, using callbacks for computation lifts the restriction of returning results synchronously. This is why old style nodejs api for async IO were all callback-based. Consider the following addition to our toy CPS machineary:

```typescript
function xformAsync<T, F extends (...args: any[]) => Promise<T>>(f: F): 
  (...args: Parameters<F>) => Cont<T> {

  return (...args) => new Cont(k => {
    const retPromise = f(...args);
    retPromise.then(k);
  });
}
```

Similar to `xform`, this helper function transforms an async function that returns a `Promise` into a CPS function. We can mix and match sync and async functions in the same framework, as shown below:

```typescript
_do(function *() {
  const id = yield Join("prefix_", 3);
  const res = yield Fetch(`objects/{id}`);
  
  yield Print(res);
});
```

This is but one simple taste of what a unified CPS framework could bring. Continuation is a pretty general and powerful concept that can be used to implement advanced control flows such as exceptions and coroutines. The [Wikipedia article](https://en.wikipedia.org/wiki/Continuation-passing_style) on CPS also mentions using CPS as an IR for functional language compilers as an alternative for SSA (an idea I would like to explore some day).

As another fun exercise to showcase CPS's powerful nature, we will implement a basic form of coroutines using `call/cc`. Coroutines are program components that generalize subroutines by allowing multiple entry points and suspending and resuming execution at certain locations. Unlike the generators we've used in `_do` notation, here we will manually control the flow of execution using `call/cc`.

#### Stashing `cc` for Later Use

The key to implementing coroutines is to capture the current continuation (`cc`) and save it for later use. This allows us to pause the coroutine's execution and resume it from the same point.

First, we need a place to store our continuation:

```typescript
let savedContinuation: CC<void> | null = null;
```

#### Defining Coroutine Functions

We can now define functions that use `call/cc` to save their continuation and yield control:

```typescript
function pause() {
  return callcc<void>((cc) => {
    savedContinuation = cc; // Save the continuation
    return new Cont(k => {}); // Return a continuation that aborts
  });
}

function resume() {
  if (savedContinuation) {
    const cc = savedContinuation;
    savedContinuation = null; // Clear the saved continuation
    return cc(undefined); // Resume the saved continuation
  } else {
    return Cont.of(); // No-op if there's nothing to resume
  }
}
```

#### Using Coroutines

With `pause` and `resume`, we can now write coroutine-like functions. For example:

```typescript
const CoroutineExample = _do(function* () {
  const tstart = Date.now();
  console.log("Coroutine started");
  yield pause();
  const elapsed = Date.now() - tstart;
  console.log(`Coroutine resumed after ${elapsed}ms`);

  return 42;
});

CoroutineExample.run((result) => console.log(`Coroutine completed with ${result}`));
```
Somewhere else in the code, we can resume the coroutine:
```typescript
// This would typically be triggered by some event or condition
setTimeout(() => {
  resume().run(() => {});
}, 1000);
```

Outputs:

```text
Coroutine started
Coroutine resumed after 1003ms
Coroutine completed with 42
```

#### Explanation

- `pause`: When called within a coroutine, `pause` uses `call/cc` to capture the current continuation (the rest of the coroutine) and saves it in `savedContinuation`. It then returns a no-op continuation, effectively pausing the coroutine.
- `resume`: When invoked, `resume` checks if there is a saved continuation. If so, it resumes the coroutine from where it was paused, using the saved continuation.
- `CoroutineExample`: This is a simple coroutine that starts execution, pauses, and then resumes.
