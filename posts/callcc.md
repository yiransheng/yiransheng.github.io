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

Now that we have built some useful CPS primitives, finally, we are ready to talk about `call/cc`. 

```typescript
function callcc<T>(f: (k: Callback<T>) => void): Cont<T> {
  return new Cont((cc: Callback<T>) => f(cc)); // or just return new Cont(f);
}
```

This one-liner is deceptively difficult, and understanding it can be challenging. Let's explore it through an extended example from the previous section:

```typescript
const Main = _do(function* () {
  const sum = yield Add(1, 2);    // sum=3
  const prod = yield Mul(sum, 1); // prod=3
    
  yield Print(`start prod = ${prod}`);

  const value = yield callcc((cc) => {
    if (prod !== 3) {
      cc(4);
    }
  });

  yield Print(`log value: ${value}`);
  yield Print("end");

  return value;
});

Main.run((result) => {});
```

`callcc` calls a supplied lambda with "the current continuation", which represents "the rest of the program". The language here is woefully imprecise and probably doesn't clarity anything, we must discuss in more concrete terms. In this example, the "current continuation" at the point of `callcc` represents the remaining computations, particularly these statements:

```typescript
yield Print(`log value: ${value}`);
yield Print("end");
```

Inside the lambda passed to `callcc`, `cc` is invoked only if `prod !== 3`. If we run the math, we find out the value of `prod` is in fact `3`, therefore, `cc` is not called - meaning the rest of computations are skipped. If we run the program, indeed, only the following line is printed:

```text
start prod = 3
```

To understand how it works, let's desugar the `_do` body manually from the point of `callcc` onwards:

```typescript
callcc((cc) => {
  if (prod !== 3) {
    cc(4);
  }
}).flatMap((value) => {
  Print(`log value: ${value}`).flatMap(() => Print("end"));
});

// 1) substitute with callcc's body
new Cont((cc) => {
  if (prod !== 3) {
    cc(4);
  }
}).flatMap((value) => {
  Print(`log value: ${value}`).flatMap(() => Print("end"));
});

// 2) substitute with flatMap's implementation
new Cont((k) => {
  ((cc) => {
    if (prod !== 3) {
      cc(4);
    }
  })((t) => {
    ((value) => {
      Print(`log value: ${value}`).flatMap(() => Print("end"));
    })(t).run(k);
  });
});

// 3) further simplify
new Cont((k) => {
  if (prod !== 3) {
    Print(`log value: ${4}`)
      .flatMap(() => Print("end"))
      .run(k);
  }
});
```

Key points:

* `callcc` returns a `Cont` monad, thus we can call `flatMap` on it
* The lambda passed to `callcc(...).flatMap` is clearly "the rest of the program" (the `Cont` monads from the remaining `Print` calls)
* Step 3) takes quite a bit of mental energy to perform, but hopefully the final expression should convince you it does what was advertised

## Some really cursed stuff

For our next example, we'll forgo the `_do` helper and use `flatMap` directly, since generators are stateful and cannot truly and properly model the `Do` notation (which is syntactic sugar only).

```typescript
let ccStash;
const Main2 = Add(1, 2)
  .flatMap((sum) => Mul(sum, 1))
  .flatMap((prod) => {
    return callcc((cc) => {
      ccStash = cc;

      cc(prod);
    });
  })
  .flatMap((v) => Print(`v = ${v}`).map(() => v + 1))
  .flatMap((v) => new Cont((k) => ccStash && ccStash(v)));

Main2.run((r) => {});
```

At the `callcc` call site, we sneakily stash away the `cc` variable, which is a lambda representing "the rest of the program" consisting of:

```typescript
  .flatMap((v) => Print(`v = ${v}`).map(() => v + 1))
  .flatMap((v) => new Cont((k) => ccStash && ccStash(v)));
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
