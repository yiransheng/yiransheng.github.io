---
title: "Exponentiation"
author: "Yiran Sheng"
date: "01/15/2024"
output: html_document
---

**Summary:** Some laughably simple mathematical exercises I should have done in middle school.

In middle school, we learned about exponentiation which is repeated multiplication. Similar to how multiplication is introduced to us as repeated additions in grade school.

$$
m \times n = \underbrace{m + m + \dots + m}_{n \text{ times}} \\
m^n = \underbrace{m \times m \times \dots \times m}_{n \text{ times}}
$$

This definition of exponentiation could not address the cases when $n$ is not a natural number. For example, $n = \frac{1}{2}$ or $n = -1$? We were spoon-fed (at least I was) the answer:

$$
m^{\frac{1}{2}} = \sqrt{m} \\
m^{-1} = \frac{1}{m}
$$

It feels kind of arbitrary and unsatisfying to merely learn these formulas. Alas, I was not curious enough back then to explore on my own and simply memorized the results for exams. Decades later, I am slightly more mathematically literate and I'd like to think I am somewhat improved in abstract thinking since middle school, and decided to take a stab at understanding _how_ one might arrive at these formulas and the generalized exponentiation function defined on real numbers.

Start from the basic version of repeated multiplications, we note down a few interesting properties of a function $f(x) = m^{x}$ where $f: \mathbb{N} \rightarrow \mathbb{N}$, $m \in \mathbb{N}$ and $m > 1$:

1. $f$ is monotone
2. $f(x_1 + x_2) = f(x_1)f(x_2)$

Property 2) is a natural concequence of the associativity of multiplications, and turns out to be the very essence of exponentiation. Suppose we are generalizing $f$ to, say, rational numbers, we would like its generalized version $f: \mathbb{Q} \rightarrow \mathbb{Q}$ to preserve these properties.

Note, this property $\forall x_1, x_2 \ f(x_1 + x_2) = f(x_1)f(x_2)$ alone connects to the initial "repeated multiplication" definition of  exponentiation, for $n \in \mathbb{N}$, let $m = f(1)$:

$$
f(n) = \underbrace{f(1) \times f(1) \dots \times f(1)}_{n\ \text{times}} \equiv m^n
$$

Playing around more:

$$
f(0) = f(0 + 0) = f(0)f(0)
$$

Therefore, $f(0) = 0$ or $f(0) = 1$. Consider $f(0) = 0$ first:

$$
\forall x.f(x) = f(x + 0) = f(x)f(0) = 0
$$

$f$ is simply a constant function $0$ here, which is not very interesting, we will go with $f(0) = 1$ instead.

$$
\forall x. f(0) = f(x + (-x)) = f(x)f(-x) \implies \\
\forall x. f(-x) = \frac{1}{f(x)}
$$

We have accomplished the first generalization: negative integers. For example, $m^{-n} = \frac{1}{m^n}$ where $n > 0$.

To tackle fractions, we would extend property 2) slightly:

$$
f(x_1 + x_2 + ... + x_k) = f(x_1)f(x_2) \dots f(x_k)
$$

Applying this version:

$$
\forall p. f(p) = f(\underbrace{\frac{p}{q}+\frac{p}{q}+ \dots + \frac{p}{q}}_{q\ \text{times}})=
\underbrace{f(\frac{p}{q})f(\frac{p}{q}) \dots f(\frac{p}{q})}_{q\ \text{times}}
$$

Therefore:

$$
f(\frac{p}{q}) = \pm\sqrt[q]{f(p)}
$$

This is a generalization to rational numbers where $p$ and $q$ are natural numbers, however, we do have a choice to make. Consider for example $m^\frac{1}{2}$ where $m > 1$, we have two choices: $m^\frac{1}{2} = \sqrt{m}$ or $-\sqrt{m}$. Recall $f$ defined on natural numbers is monotone, we choose $m^\frac{1}{2} = \sqrt{m}$ so that $m^\frac{1}{2} > 1 = m^0$ to preserve monotonicity.

At this point, we have covered the two formulas using a pretty basic yet powerful idea in math: generalizing a concept by preserving its essential properties. Throughout the exercise, we had a couple choices - there were no wrong answers, the ones we picked were simply the most convenient.

The final step for today is generalization to real numbers. We will throw away the crutches entirely, and start from the essential and abstract properties only, and forget about what we know of exponentiations. Consider a function $f: \mathbb{R} \rightarrow \mathbb{R}$:

a. $f$ is monotonically increasing (therefore it cannot be a constant function)

b. $\forall x_1, x_2 \ f(x_1 + x_2) = f(x_1)f(x_2)$

c. $f$ is differentiable


$$
\begin{aligned}
f'(x) &= \lim_{h \to 0} \frac{f(x + h) - f(x)}{h} \\
      &= \lim_{h \to 0} \frac{f(x)f(h) - f(x)}{h} \\
      &= f(x)\lim_{h \to 0} \frac{f(h) - 1}{h}
\end{aligned}
$$

We know the limit exists as $f$ is required to be differentiable, and its value does not depend on $x$. Therefore:

$$
f'(x) = Kf(x) \ \text{for some constant } K
$$

We also have the result from before that only depended on property a) and b):

$$
f(0) = 1
$$

Applying in **Inverse function theorem** (conditions apply, but our requirements ensures its applicability) suppose the inverse of $f(x)$ is $g(x)$:

$$
\begin{aligned}
g'(x) &= \frac{1}{f'(g(x))} \\
      &= \frac{1}{K f(g(x))} \\
      &= \frac{1}{Kx}
\end{aligned}
$$

Given $g(1) = 0$, this is sufficient to define $g$ concretely for $x > 0$, where $C = \frac{1}{K}$:

$$
g(x) = C \int_1^{x} \frac{dx}{x}
$$

This of course is commonly known as logarithm: $\log: (0, \infty) \rightarrow \mathbb{R}$. There we have it, exponentiation on $\mathbb{R}$ can be defined as the inverse of logarithm $g^{-1}(x)$ which in turn is a simple integral. The property described by the equation $f(x_1 + x_2) = f(x_1)f(x_2)$  is commonly known as the **exponential property** or the functional equation of exponential functions. This is a defining characteristic of exponential functions and is integral to their unique behavior in various mathematical contexts.
 
In a broader sense, this property is a specific case of what is known as a Cauchy functional equation. The general form of a Cauchy functional equation is $f(x_1 + x_2) = f(x_1) + f(x_2)$, and it is a key equation in the study of functional equations and the theory of group homomorphisms. The exponential property equation can be seen as a multiplicative variant of this, relating to exponential functions specifically. [Link to Wikipedia](https://en.wikipedia.org/wiki/Cauchy%27s_functional_equation).
