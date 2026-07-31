# Gödel's First Incompleteness Theorem (working title)

## Introduction

*(placeholder — written last, once the technical spine is fixed)*

## 1 Notation and conventions

### 1.1 Sets, numbers, functions

- $\mathbb{N}$ — the natural numbers $\{0, 1, 2, 3, \dots\}$. **Zero is
  included.**
- $x \in X$, $X \subseteq Y$, $\{x : \dots\}$ — set membership, subset, and
  set-builder notation, all standard.
- $f : X \to Y$ — a function from $X$ to $Y$. Nomenclature: $X$ is the
  **domain**, $Y$ is the **codomain**, and the **image** is the set of values
  actually produced, $\mathrm{im}(f) := \{ f(x) : x \in X \} \subseteq Y$.
  Every function in this article is **total** — defined on all of its domain —
  unless explicitly called partial.
- **Injective** — $f$ is injective when distinct inputs give distinct outputs:
  $x \neq y \implies f(x) \neq f(y)$. (This is the property an encoding must
  have to be decodable.)
- $:=$ — definitional equality: the left side is being *defined* as the right
  side. The right side must consist of things already defined.
- **Digit grouping.** Long decimal numerals may be written with underscore
  separators for readability: $100\_040\_120$ is the same number as
  $100040120$. The underscores mean nothing; the convention is borrowed from
  programming languages.

### 1.2 Logical shorthand

The standard logical symbols:

- $\forall$ ("for all"), $\exists$ ("there exists")
- $\land$ (and), $\lor$ (or), $\lnot$ (not)
- $\implies$ (implies), $\iff$ (if and only if; in prose, "iff")

These symbols are used in ordinary mathematical statements only. EasyLang is
an ASCII language: it spells its logical operators as ASCII words such as
`forall`, `exists`, `and`, `not` (Section 2). Consequently EasyLang material
is always set in typewriter font, as a literal string — never in math type.

### 1.3 Strings

*(to be filled as needed)*

### 1.4 Variables

Lowercase letters $m, n, k, a, b$ range over $\mathbb{N}$; $s, t$ range over
strings. Conventions for naming EasyLang formulas are registered in Section 2,
where formulas are defined.

## 2 The language EasyLang

EasyLang is a **first-order language** about natural numbers. Nomenclature,
from logic: *first-order* means the quantifiers range over the objects of
discourse themselves — here, individual natural numbers — never over sets of
them or over formulas. EasyLang can say "every number has a successor"; it
cannot directly say "every set of numbers has a least element."

One design stance, stated before any grammar: **a formula is its string.**
An EasyLang formula is a specific ASCII character string, nothing more
abstract. Two different strings are two different formulas, even when they
say the same thing — `0=0` and `(0=0)` are distinct formulas. (Whitespace is
the one calibrated exception: spellings that differ only in whitespace are
the same formula — see the whitespace rule in 2.1.)

### 2.1 Tokens

Every EasyLang string is a sequence of **tokens**, each a short ASCII string:

| kind             | tokens                                          |
|------------------|-------------------------------------------------|
| numerals         | `0`, and any digit string not starting with `0` — `1`, `42`, `100040120041061048` |
| variables        | `v`, and `v` followed by a digit string not starting with `0` — `v1`, `v2`, … |
| function symbols | `+`, `*` (binary, infix); `D` (unary, always written `D(…)`) |
| relation symbols | `=`, `<`                                        |
| logical operators| `not`, `and`, `or`, `->`                        |
| quantifiers      | `forall`, `exists`                              |
| punctuation      | `(`, `)`, `.`                                   |

Three remarks:

- **Numerals are decimal literals.** A numeral is a single token denoting a
  number directly; there is no successor symbol, and no `S(S(0))` towers —
  `2` is a numeral, and `v+1` plays the role of successor where one is
  needed. Long numerals may be *displayed* with underscore grouping
  (`100_040_120`), but the underscores are display sugar only: the actual
  string contains none. This is the single exception to the rule that
  typewriter text is verbatim.
- **Keywords are reserved.** As in programming languages, the word tokens
  `not`, `and`, `or`, `forall`, `exists` are reserved: no variable may be
  spelled like a keyword. The variables above (`v`, `v1`, `v2`, …) satisfy
  this by construction.
- **Function symbols are capital-cased.** Word-like function symbols are
  spelled with capital letters; variables and keywords are lowercase. A
  variable can therefore never be confused with a function symbol. `D` is the only capital-cased symbol. It is an ordinary unary function symbol as far as the grammar is concerned (interpretation: 2.5).

**Whitespace rule.** Whitespace separates tokens and carries no meaning of
its own: consecutive whitespace characters collapse into one, and whitespace
between tokens that need no separating may be dropped. Two spellings that
differ only in whitespace are the *same formula* — `D( v ) = 0` and `D(v)=0`
are one formula, not two. Every formula therefore has a single **canonical
spelling**: no whitespace at all, except one space exactly where two adjacent
tokens would otherwise merge — where the first token ends and the second
begins with a letter or digit. The canonical spelling of the example above is
`D(v)=0`; the spelling `forall v.not v<v` is already canonical, both of its
spaces being forced. Whenever this article measures or encodes a formula
(Section 4), it is the canonical spelling that is measured or encoded.

### 2.2 Terms

A **term** is a token string built by these rules:

```
term ::= numeral
       | variable
       | D ( term )
       | term + term
       | term * term
       | ( term )
```

with the usual conventions making every term readable in exactly one way:
`*` binds tighter than `+`, and both associate to the left. So `1+2*3` is
the sum of `1` and the product, and `1+2+3` is `(1+2)+3`. Parentheses may
always be added — remembering that `(1+2)` and `1+2` are then *distinct
terms* (distinct strings) that will turn out to have equal value.

Terms are the noun phrases of the language: each one, once its variables are
given values, names a number.

### 2.3 Formulas

An **atomic formula** compares two terms:

```
atom ::= term = term
       | term < term
```

and a **formula** is built from atomic formulas by connectives and
quantifiers:

```
formula ::= atom
          | not formula
          | formula and formula
          | formula or formula
          | formula -> formula
          | forall variable . formula
          | exists variable . formula
          | ( formula )
```

Reading conventions, again making every formula readable in exactly one way:
`not` binds tightest, then `and`, then `or`, then `->` (which associates to
the right); `and` and `or` associate to the left; the body of a quantifier
extends as far to the right as possible. So `forall v.not v<v and 0=0`
means `forall v.((not v<v) and 0=0)` — the quantifier swallows everything
after its dot. Parentheses override all of this.

### 2.4 Free variables, sentences, and naming

An occurrence of a variable is **bound** if it lies in the body of a
quantifier over that variable (or is the variable written next to the
quantifier), and **free** otherwise. In `exists v1.v1+v=v1*v1`, all
three `v1` after the dot are bound; the `v` is free. A formula with no
free occurrences is a **sentence** (also called a *closed formula*);
one with free occurrences is an **open formula** — no claim by itself,
but a property a number may or may not have.

Four names, each a metalevel set of strings:

- $\mathbb{S}$ — all finite strings over the EasyLang character set;
- $\mathbb{L}$ — all numerals (mnemonic: *literal*). Numerals are
  strings, not numbers — `42` $\in \mathbb{L}$ is two characters,
  $42 \in \mathbb{N}$ is a number — and taking decimal values is a
  bijection between $\mathbb{L}$ and $\mathbb{N}$;
- $\mathbb{F}$ — all formulas, each identified with its canonical
  spelling;
- $\mathbb{F}_0$ — all sentences. So
  $\mathbb{F}_0 \subseteq \mathbb{F} \subseteq \mathbb{S}$ and
  $\mathbb{L} \subseteq \mathbb{S}$.

These sets are domains and codomains: a metalevel function on syntax is
declared like any function, e.g. $f : \mathbb{F} \to \mathbb{F}$.

Naming conventions:

- Capital letters $A$, $B$ name formulas at the metalevel; the letters
  are not EasyLang text.
- $A[\texttt{v}]$ denotes the same string as $A$; the bracket is an
  annotation asserting that at most `v` occurs free. (The `v` inside
  the brackets is *mentioned*, not used — the use–mention distinction
  of logic.)
- $A[\texttt{v} := t]$ denotes the string obtained by replacing every
  free `v` in $A$ with the term $t$. Substitution in general must dodge
  variable capture; this article substitutes numerals and closed
  `D`-terms, which contain no variables — plus one renaming-guarded
  `v1` in Section 7 — so it is literal string replacement.

### 2.5 Meaning: structures and the standard model

So far EasyLang is pure syntax — rules about which strings are formulas. The
meaning side is handled by basic **model theory**.

A **structure** (also called a **model** or an **interpretation**) for
EasyLang consists of:

- a nonempty set $M$, called the **domain** (or **universe**) — the objects
  the quantifiers range over;
- for each function symbol, an actual function on $M$ of the right arity —
  a function $M \times M \to M$ for `+` and `*`, a function $M \to M$ for
  `D`;
- for each relation symbol, an actual relation on $M$;
- for each numeral, an element of $M$.

The structure this article cares about is the **standard model**: the
interpretation EasyLang is *designed* to have.

- Domain: $\mathbb{N}$.
- Each numeral denotes its decimal value: `42` denotes $42$.
- `+`, `*`, `<`, `=` denote ordinary addition, multiplication, order, and
  equality on $\mathbb{N}$.
- `D` denotes a specific total function $\mathbb{N} \to \mathbb{N}$ that is
  defined later — its definition requires the encoding of formulas
  as numbers (Section 4), which does not exist yet. Until then, nothing depends on
  which function it is; the grammar above is already fixed regardless.

In the standard model, every **closed term** (a term with no variables)
denotes a number, computed the obvious way: `2+3*4` denotes $14$. The
metalevel word for this is **denotation**, or the **value** of the term.

A sentence is **true** or **false** in a structure — this is the
fundamental relation of model theory, called **satisfaction** and written
with the double turnstile $\models$:

$$\mathbb{N} \models A$$

reads "$A$ is true in the standard model" (here $\mathbb{N}$ names the
standard model, a harmless overload of the symbol for its domain). The
crossed version $\mathbb{N} \not\models A$ says $A$ is false there.
Examples:

- $\mathbb{N} \models$ `not 0=1`
- $\mathbb{N} \models$ `forall v.not v<v`
- $\mathbb{N} \not\models$ `exists v.v+1=v`
- `D(0)=0` — true or false in the standard model, but *which* is not
  determined until the interpretation of `D` is fixed.

An *open* formula is neither true nor false outright; it becomes so only
relative to an **assignment** — a choice of value for each free variable.
The open formula `v<3` is satisfied by the assignment $\texttt{v} \mapsto
1$ and not by $\texttt{v} \mapsto 7$. Under this reading an open formula
$A[\texttt{v}]$ carves out a set of numbers — the numbers whose assignment
satisfies it — which is why open formulas are the language's way of
expressing *properties*.

Two facts about satisfaction, both immediate from the readings above: **substitution** — for $A[\texttt{v}]$ and a
closed term $t$ of value $k$, the sentence $A[\texttt{v} := t]$ is true
iff $A$ is satisfied by $\texttt{v} \mapsto k$; **renaming** — rewriting
a bound variable to a fresh one changes no truth value and no
satisfaction.

## 3 Levels: the object language and the metalevel

Section 2 quietly involved two languages at once, and every section after it
does too. This section names them, once, so the distinction can be used without comment. The vocabulary is standard in logic:

- The **object language** is the formal language under study — here,
  EasyLang. Its formulas are ASCII strings: pieces of data, to be inspected,
  measured, and encoded. A formula claims something only in
  the sense of 2.5, relative to a structure.
- The **metalanguage** is the language the study itself is written in:
  mathematical English plus the notation of Section 1. Reasoning carried out
  in it is called **metatheory**, and "at the metalevel" means "in the
  metalanguage, speaking about the object language." Nothing at this level
  is exotic — it is ordinary mathematics, applied to strings and structures.

By this classification, everything in Section 2 apart from the displayed
EasyLang strings was metalevel: the grammar in 2.2 is not an EasyLang
formula but a metalevel description of which strings are terms; "every
formula has a single canonical spelling" is a metalevel fact about strings;
$\mathbb{N} \models$ `not 0=1` is a metalevel statement relating one string
to one structure.

Functions need the most care, because they occur on both sides of the
divide. The rule, already applied in 2.5 and kept for the rest of
the article: **when a function is defined, the definition states its domain,
its codomain, and its level.** Three kinds occur:

1. metalevel functions on numbers — for instance, the function
   $\mathbb{N} \to \mathbb{N}$ that the symbol `D` will denote;
2. metalevel functions on strings or formulas — for instance, the encoding
   built in Section 4;
3. function symbols *inside* EasyLang — `+`, `*`, `D`. These are not
   functions at all; they are characters occurring in strings. Each one
   *denotes* a function only relative to a structure (2.5).

The kinds interlock without merging: kind 3 is syntax, and what a kind-3
symbol denotes in the standard model is an object of kind 1.

Typography carries the level by default: typewriter text is verbatim
EasyLang, always; prose and math notation are metalevel, always. Beyond
that, **not every displayed formula, equation, or code block is annotated
with its level** — most need no annotation, because the font and the
surrounding sentence settle it. But whenever a display could honestly be
read at two levels — a number that is also a code, an equation whose two
sides live on different sides of the divide — the text says which level is
meant, explicitly, next to the display. Silence is a promise that only one
reading is possible.

## 4 Gödel numbering: formulas as numbers

EasyLang talks about natural numbers and nothing else. Its formulas are
strings — not numbers — so as it stands, EasyLang cannot say anything about
its own formulas. The bridge is an encoding: assign to every string a number,
injectively, so that talk about strings can be re-expressed as talk about
numbers. Nomenclature: such an encoding is a **Gödel numbering**, the number
assigned to a string is its **Gödel number**, and the whole maneuver — recast
syntax as arithmetic — is called the **arithmetization of syntax**. Any
injective, mechanically computable assignment does the job; Gödel's original
(1931) used exponents of prime numbers. This article uses the simplest one
available: read the ASCII codes of the characters as decimal digits.

### 4.1 Character codes

**ASCII** (American Standard Code for Information Interchange) is the
standard assignment of the numbers 0–127 to characters. The characters
EasyLang uses, with their ASCII codes:

| characters | codes |
|---|---|
| space | 32 |
| `(` `)` | 40, 41 |
| `*` `+` | 42, 43 |
| `-` `.` | 45, 46 |
| `0` … `9` | 48 … 57 |
| `<` `=` `>` | 60, 61, 62 |
| `D` | 68 |
| `a` … `z` | 97 … 122 |

(Of the lowercase letters, only those occurring in keywords and in variables
actually appear; assigning the whole range is harmless. The variable letter
`v` is 118.)

**Annotated display.** When character-level detail matters, this article
writes a string with the ASCII code of each character aligned beneath it:

```
 0   =   0
048 061 048
```

### 4.2 The Gödel number of a string

Definition. The Gödel numbering of this article is the metalevel function

$$\ulcorner \cdot \urcorner \;:\; \mathbb{S} \to \mathbb{N}$$

read **the corners** — the standard notation for Gödel numbers; in
this article they mean one thing only: *the Gödel number of*. $\mathbb{S}$ is the set
of strings named in 2.4. The function is total on $\mathbb{S}$ and defined
by two cases:

- a nonempty string: write each character's ASCII code as a three-digit
  block (`048`, not `48`), concatenate the blocks in order, and read the
  result as a decimal number;
- the empty string (the string with no characters): assigned $0$.

Examples, in annotated display:

```
 0   =   0
048 061 048
```
The Gödel number of `0=0` is 48_061_048. It recurs as the article's running
example — name it: let $Z$ be the sentence `0=0`.

```
 D   (   v   )   =   0
068 040 118 041 061 048
```
The Gödel number of `D(v)=0` is 68_040_118_041_061_048.

```
 n   o   t       0   =   1
110 111 116 032 048 061 049
```
The Gödel number of `not 0=1` is 110_111_116_032_048_061_049 — the forced
space of the canonical spelling is a character like any other, coded 032.

Two reading aids visible in the examples:

- A number does not keep leading zeros, so when the first character's code
  is below 100 (as with `0` = 048 or `D` = 068), the Gödel number has
  $3n - 1$ digits instead of $3n$. Nothing is lost — see the decoding lemma
  below.
- The underscore grouping of 1.1, applied in threes from the right, lands
  exactly on the character blocks. Displayed this way, a Gödel number can be
  read back character by character.

**Inside the corners: a name, never raw text.** The corners always
*evaluate* what is inside. $\ulcorner A \urcorner$ is the Gödel number of
the string that the metalevel name $A$ denotes — not anything to do with
the letter "A" — and the same reading holds under quantification: in "for
every formula $B$, $\ulcorner B \urcorner$ is even", $\ulcorner r
\urcorner$ is the Gödel number of whichever formula $B$ stands for.
Verbatim EasyLang text may **not** be written inside corners; the Gödel
number of a concrete formula is stated in words instead, as in "the Gödel
number of `2+2` is 50_043_050". This costs a few words and buys freedom
from a classic ambiguity — no reader ever has to decide whether corners
around the text 2+2 mean the code of a three-character string or the code
of `4` (which is 52).

Two side rules:

- What is inside the corners must denote a *string*: the domain of
  $\ulcorner \cdot \urcorner$ is $\mathbb{S}$, so corners around a
  number-denoting expression are a type error.
- Nomenclature note, for reading the literature: corner quotes descend from
  Quine's **quasi-quotation**, in which object-language symbols inside the
  corners stand for themselves while metalevel variables are evaluated —
  both mixed in a single expression. Texts also split on whether
  $\ulcorner A \urcorner$ means the Gödel *number* or the *numeral*
  denoting it. This article uses no mixture and takes no side: corners
  take a metalevel name and produce a number, always.

**Worked usage.** The discipline in practice, on each shape of thing the
corners can meet:

- *A concrete formula.* Corners cannot enclose `0=0` directly; a name must
  be assigned first, in English — which is what $Z$ is for. $\ulcorner Z \urcorner$ = 48_061_048.
- *An annotated name.* Let $A[\texttt{v}]$ be the open formula `D(v)=0`.
  Then $\ulcorner A[\texttt{v}] \urcorner$ = 68_040_118_041_061_048 — the
  annotation adds no operation (2.4), so this is exactly the Gödel number
  of the string $A$ names.
- *The output of a metalevel function.* Let
  $f : \mathbb{F} \to \mathbb{F}$ be the metalevel function
  that wraps its input in a negation: $f(B)$ is the string `not(`, then
  $B$, then `)`. Then $\ulcorner f(Z) \urcorner$ is computed inside-out —
  first $f(Z)$, which is the formula

  ```
   n   o   t   (   0   =   0   )
  110 111 116 040 048 061 048 041
  ```

  and then its code: $\ulcorner f(Z) \urcorner$ =
  110_111_116_040_048_061_048_041. The corners see only the finished
  string; they know nothing of how $f$ built it. (And
  $\ulcorner f \urcorner$ by itself is a type error — $f$ is a function,
  not a string.)

### 4.3 Decoding

> **Lemma 4.1 (decoding).** From $\ulcorner S
\urcorner$ the string $s$ is
> recoverable: write the number in decimal, left-pad with zeros until the
> length is a multiple of three, cut into three-digit blocks, and map each
> block back to its character. Consequently $\ulcorner \cdot \urcorner$ is
> injective: distinct strings have distinct Gödel numbers.

*Proof.* Every code in the table lies between 32 and 122, so every block is
three digits with at most one leading zero, and only the first block's
leading zero can be lost when the concatenation is read as a number. The
decimal expansion of $\ulcorner S
\urcorner$ therefore has $3n$ or $3n-1$
digits for a string of length $n$, and left-padding to a multiple of three
restores exactly the original blocks. The special value $0$ pads to the
block `000`, which is no character's code — consistent with its assignment
to the empty string, and colliding with nothing, since a nonempty string's
first block is never `000`. $\square$

Two remarks:

- **Not surjective.** Most numbers are nobody's Gödel number: $1$ pads to
  `001`, which is no character's code, and even when all blocks are valid
  characters the resulting string need not be a formula. Being a Gödel
  number of a formula is a *special property* of a number.
- **Both directions are mechanical.** Encoding and decoding are each a
  short, deterministic procedure — no search, no ingenuity.

### 4.4 Gödel numbers inside the language

$\ulcorner A \urcorner$ is a metalevel number. To *mention* it inside
EasyLang, write its decimal numeral — and because EasyLang numerals are
decimal literals, the numeral is the same digit string as the number.
Convention: a metalevel number appearing inside typewriter text stands for
its decimal numeral — its partner in $\mathbb{L}$ under the bijection of
2.4. For example, let $A[\texttt{v}]$ be the open formula
`v<10`, and recall $Z$ (4.2), with
$\ulcorner Z \urcorner$ = 48_061_048:

$$A[\texttt{v} := \ulcorner Z \urcorner] \;\;\text{is}\;\;
\texttt{48061048<10}$$

a sentence claiming that the Gödel number of $Z$ is below ten (false — it
is eight digits long).

One size fact:

> The numeral for $\ulcorner S
\urcorner$ is $3n$ or $3n - 1$ characters
> long, where $n$ is the length of $s$, for nonempty $s$. Writing a string's Gödel numeral
> inside EasyLang costs about **three times the string's own length**.

It already shows that no sentence can contain its own Gödel
numeral verbatim — the numeral alone would be three times as long as the
whole sentence it must fit inside.

## 5 The diagonal: gsub and diag

### 5.1 The set $\mathbb{F}_1$

The subscript pattern of 2.4 extends:

- $\mathbb{F}_1$ — all formulas whose free variables are *at most* `v`:
  every free occurrence of a variable, if any, is an occurrence of `v`.

"At most" makes the sets nest: $\mathbb{F}_0 \subseteq \mathbb{F}_1
\subseteq \mathbb{F}$. Examples: `D(v)=0` is in $\mathbb{F}_1$; `0=0` — $Z$ — is in $\mathbb{F}_1$ (and in $\mathbb{F}_0$); `exists v1.v=v1+v1` is
in $\mathbb{F}_1$ (its `v1` occurrences are bound; only `v` is free);
`v<v1` is not (its `v1` is free).

### 5.2 gsub

Definition. The metalevel function

$$\mathrm{gsub} \;:\; \mathbb{F}_1 \times \mathbb{F} \to \mathbb{F}_0,
\qquad \mathrm{gsub}(B, A) \;=\; B[\texttt{v} := \ulcorner A \urcorner]$$

— in words: take the Gödel number of $A$, write it as a numeral (4.4), and
substitute that numeral for every free occurrence of `v` in $B$. The name
abbreviates *Gödel-number substitution*.

The two arguments play different roles. $B$ expresses a property of a
number. $A$ is the *subject*: the formula being talked about, entering
only through its Gödel number. So $\mathrm{gsub}(B, A)$ is a sentence
asserting, of the number $\ulcorner A \urcorner$, the property that $B$
expresses.

Typing facts, in the discipline of Section 3:

- **Total.** Every formula has a Gödel number, every number has a numeral,
  and substitution of a numeral is literal string replacement (2.4) — no
  case fails.
- **The output is always a sentence.** $B$'s free variables are at most
  `v`, and every free `v` is replaced by a numeral, which contains no
  variables; nothing free remains.
- **Level.** Metalevel throughout: $\mathrm{gsub}$ consumes and produces
  strings. No EasyLang expression computes it.

Worked examples, all about $Z$ ($\ulcorner Z \urcorner$ = 48_061_048):

- $B$ = `v<10`:  $\mathrm{gsub}(B, Z)$ is `48061048<10` — "the Gödel
  number of $Z$ is below ten." False.
- $B$ = `exists v1.v=v1+v1`:  $\mathrm{gsub}(B, Z)$ is
  `exists v1.48061048=v1+v1` — "the Gödel number of $Z$ is even." True.
- $B$ = `v<v+1`:  $\mathrm{gsub}(B, Z)$ is `48061048<48061048+1` —
  both free occurrences of `v` are replaced. True.

Each output is a sentence about a *number* that happens to be the code of
a *formula* — the arithmetization of Section 4, now in active use.

### 5.3 diag

Definition. The metalevel function

$$\mathrm{diag} \;:\; \mathbb{F}_1 \to \mathbb{F}_0, \qquad
\mathrm{diag}(A) \;=\; \mathrm{gsub}(A, A)$$

— the special case where property and subject are the *same formula*: $A$,
asked to state its own property of its own Gödel number. Nomenclature: this
is **diagonalization**, and the name comes from a picture. $\mathbb{F}_1$
is a countably infinite set (strings can be listed by length, then
alphabetically), so fix any such listing $A_1, A_2, A_3, \dots$ and lay out
every value of $\mathrm{gsub}$ as an infinite matrix — first arguments down
the rows, subjects across the columns, each cell a sentence:

```
                              subjects
                     A1              A2              A3         …
              ┌────────────────────────────────────────────────────
           A1 │ ▶gsub(A1,A1)◀    gsub(A1,A2)     gsub(A1,A3)    …
           A2 │  gsub(A2,A1)    ▶gsub(A2,A2)◀    gsub(A2,A3)    …
           A3 │  gsub(A3,A1)     gsub(A3,A2)    ▶gsub(A3,A3)◀   …
           ⋮  │       ⋮               ⋮               ⋮          ⋱
```

Row $i$ collects everything the formula $A_i$ can say about Gödel numbers
of formulas: one sentence per subject. The highlighted cells are the **main
diagonal** — the cells where the subject is the row's own formula — and
$\mathrm{diag}$ is exactly the function that reads them off:
$\mathrm{diag}(A_i) = \mathrm{gsub}(A_i, A_i)$. The same shape drives
Cantor's diagonal argument.

The central example of the article. Let $A[\texttt{v}]$ be `D(v)=0`, with
$\ulcorner A \urcorner$ = 68_040_118_041_061_048 (computed in 4.2). Then
$\mathrm{diag}(A)$ is the 22-character sentence

```
D(68_040_118_041_061_048)=0
   D   (   v   )   =   0
```

— top line: $\mathrm{diag}(A)$ itself, the numeral written with the
underscore grouping of 1.1; bottom line: each three-digit block decoded
back to its character (4.3), spelling out exactly $A$ = `D(v)=0`. (The
first block reads 68 rather than 068 — the dropped leading zero of 4.2.)

Read it at face value: "`D` of the number
68_040_118_041_061_048 equals zero." Two observations:

- The number appearing inside $\mathrm{diag}(A)$ is
  $\ulcorner A \urcorner$ — the Gödel number of exactly the formula the
  construction started from. The sentence carries its own ancestry in its
  digits.
- Whether this sentence has anything to do with *itself* depends
  entirely on what the symbol `D` means — and `D` still means nothing.

Like the coding (4.3), $\mathrm{gsub}$ and $\mathrm{diag}$ are
mechanical: encode, write digits, replace characters.

### 5.4 ndiag: the diagonal on Gödel numbers

$\mathrm{diag}$ maps formulas to formulas. The Gödel numbering gives it a
shadow that maps numbers to numbers — the metalevel function

$$\mathrm{ndiag} \;:\; \mathbb{N} \to \mathbb{N}$$

total, defined by two cases:

- if $n = \ulcorner A \urcorner$ for some $A \in \mathbb{F}_1$, then
  $\mathrm{ndiag}(n) := \ulcorner \mathrm{diag}(A) \urcorner$. This is
  well-defined: by Lemma 4.1 the Gödel numbering is injective, so $n$
  determines at most one such $A$;
- otherwise, $\mathrm{ndiag}(n) := 0$. (An arbitrary default, to keep the function total.)

The defining case, as one equation to remember:

$$\mathrm{ndiag}(\ulcorner A \urcorner) \;=\;
\ulcorner \mathrm{diag}(A) \urcorner
\qquad \text{for every } A \in \mathbb{F}_1.$$

The relationship between the two diagonals is a square:

```
                diag
      F1 ─────────────────▶ F0
       │                     │
   ⌜·⌝ │                     │ ⌜·⌝
       ▼                     ▼
       N  ─────────────────▶ N
                ndiag
```

Starting from any formula in the top-left corner, the two routes to the
bottom-right — diagonalize then encode, or encode then apply
$\mathrm{ndiag}$ — give the same number. The standard phrase for this is
that the square **commutes**. In one sentence: $\mathrm{ndiag}$ is
$\mathrm{diag}$ watched through the Gödel numbering.

On the central example, with $A[\texttt{v}]$ = `D(v)=0`:

$$\mathrm{ndiag}(68\_040\_118\_041\_061\_048) =
68\_040\_054\_056\_048\_052\_048\_049\_049\_056\_048\_052\_049\_048\_054\_049\_048\_052\_056\_041\_061\_048$$

— the input is $\ulcorner A \urcorner$ (17 digits), the output is the
Gödel number of the 22-character sentence displayed in 5.3 (65 digits).
Both sides are just numbers; a bystander shown only this equation would
see arithmetic, with no hint that formulas are involved.

Two closing observations:

- $\mathrm{ndiag}$ is mechanical: decode, diagonalize (5.3), encode.
- $\mathrm{ndiag}$ is a total function $\mathbb{N} \to \mathbb{N}$ — which
  is the kind of object a unary function symbol of EasyLang
  can denote in a structure (2.5).

## 6 A sentence that talks about itself

The goal of this section, in plain words: build an EasyLang sentence that
says *"this sentence is empty."* The property is silly on purpose.
Emptiness is the simplest thing a string can be or fail to be, so every
difficulty met on the way is a difficulty of *self-reference itself*, not
of the property being self-attributed.

### 6.1 What "says" means

EasyLang sentences are about numbers, so a sentence can be about a
*sentence* only through the Gödel numbering. For emptiness the translation
is immediate: by 4.2 and Lemma 4.1, the empty string is the only
string with Gödel number $0$, so

$$s \text{ is empty} \iff \ulcorner S \urcorner = 0.$$

And "says" is made precise through truth: a sentence **says** a metalevel
statement $P$ when its **truth condition** is $P$ — that is, when the
sentence is true in the standard model if and only if $P$ holds.
(Nomenclature: *truth condition* is the standard term for the "if and only
if" a sentence's truth amounts to.)

The definition is deliberately weak — a material biconditional, nothing
more. Any false sentence \"says,\" in this sense, every false statement:
both sides of the iff fail together. The constructions ahead deliver
more than the definition asks: their sentences contain a closed term
whose value *is* the sentence's own Gödel number, and the truth
condition follows from that. Results are stated with the weak reading;
the structure is where the content lives.

One gap matters here. The interpretation of `D` was deliberately
left open in 2.5 — `D` is, so far, an unspecified unary function symbol,
and until it denotes something, a sentence containing `D` has no truth
value and says nothing. Its interpretation is chosen in 6.4, once the
requirements on it are in view.

### 6.2 The naive attempt

The sentence "this sentence is empty" should assert
$\ulcorner S \urcorner = 0$ of itself, so the direct approach writes a
sentence of the shape

```
N=0
```

One clarification before weighing the idea, owed under the annotation
policy of Section 3: this display is **not an EasyLang string** — `N` is
not even a character of the language. The display is a **template**, and
`N` in it is a **metavariable**: a metalevel placeholder standing, inside
displayed EasyLang text, for a piece of object-language syntax to be
filled in. The type of this one: numerals — elements of the set
$\mathbb{L}$ of 2.4. (Nomenclature: *metavariable*
is the standard logic term for a metalanguage variable ranging over
object-language syntax; the capital names $A$, $B$, $Z$ have been
metavariables for formulas all along.) The naive plan is to fill `N` with
the numeral of the finished sentence's own Gödel number.

This fails by counting. If the numeral of $\ulcorner S \urcorner$ occurs anywhere inside
$S$ — as `N=0` requires — then, writing $n = \mathrm{len}(s)$, the
substring alone has length $3n$ or $3n-1$ (4.4), so $n \geq 3n - 1$,
forcing $n = 0$: no sentence contains the numeral of its own Gödel number.
If self-reference is possible at all, the sentence must *compute* its
Gödel number instead of containing its numeral.

### 6.3 The template `D(X)=0`

Computing is what function symbols are for. So assume the sentence has the
form

```
D(X)=0
```

where two things are unknown:

- `X` — a metavariable for a numeral, exactly as `N` was in 6.2, left
  blank while we solve for it; the display `D(X)=0` is again a template,
  not a sentence.
- the meaning of `D` — suppose it **denotes** some total function
  $d : \mathbb{N} \to \mathbb{N}$, to be chosen. (Same letter, two
  faces: typewriter `D` is the symbol, italic $d$ is the function it
  denotes.)

Fix any candidate $d$, and suppose the blank `X` has been filled with an
actual numeral, an element of $\mathbb{L}$; let $x \in \mathbb{N}$ be the
number that numeral denotes — its partner under the bijection of 2.4. Then
the completed sentence — call it $S^{*}$ — asserts:

$$d(x) = 0.$$

We want it to say $\ulcorner S^{*} \urcorner = 0$. The two match if, as a plain fact about numbers,

$$d(x) = \ulcorner S^{*} \urcorner.$$

Read what this demands: from the number $x$ sitting *inside* the
sentence, $d$ must compute the Gödel number of the *whole* sentence —
prefix `D(`, the digits of `X`, suffix `)=0` and all. The sentence holds
a small number and delegates to $d$ the job of expanding it into the
sentence's own Gödel number — exactly the indirection 6.2 said was
mandatory. In this form the two sides live on different floors: a function of a
bare number on the left; the code of a sentence — a string, one floor
up — on the right.

So rewrite both sides as codes of strings. The input, if it is to carry
any structure, should be the Gödel number of some string $Y$:
$x = \ulcorner Y \urcorner$. The output is the code of the finished
sentence, and the sentence must be *built from* $Y$ somehow: write $h$
for the unknown builder, a metalevel operation of type
$h : \mathbb{S} \to \mathbb{F}_0$ — string in, sentence out — so
$S^{*} = h(Y)$. In this notation the demand becomes:

$$d(\ulcorner Y \urcorner) \;=\; \ulcorner h(Y) \urcorner \tag{$*$}$$

— the **shadow equation**: it ties the number-floor function to a
string-floor operation. It says a square commutes. Chased on elements:

```
                     h
         Y ───────────────────▶ h(Y) = s*        (strings)
         │                         │
     ⌜·⌝ │                         │ ⌜·⌝
         ▼                         ▼
         x ───────────────────▶ d(x) = ⌜s*⌝      (numbers)
                     g
```

Top floor: strings, where sentences get built. Bottom floor: numbers,
where `D` computes. All the unknowns are in the picture: the bottom-left
corner $x$ is the value of the numeral `X`, the bottom edge is $d$, and
the top edge $h$ is the string operation whose shadow $d$ is asked to be.

### 6.4 Guessing g

This square has been seen before. Set the wanted equation beside the one
equation Section 5 ended with:

$$\text{wanted } (*):\;\; d(\ulcorner Y \urcorner) =
\ulcorner h(Y) \urcorner \qquad\qquad \text{owned (5.4):}\;\;
\mathrm{ndiag}(\ulcorner A \urcorner) =
\ulcorner \mathrm{diag}(A) \urcorner$$

Same shape, edge for edge. A match of shapes proves nothing — nothing
here says $h$ must be $\mathrm{diag}$, and other conventions for building
a sentence around the numeral of $\ulcorner Y \urcorner$ could be made to
work — but the match
is exact in form, and $\mathrm{diag}$ is already defined. Guess:

$$h := \mathrm{diag}, \qquad d := \mathrm{ndiag}.$$

**Interpreting `D`.** The standard model's one open entry (2.5) is now
filled: **`D` denotes $\mathrm{ndiag}$.** Every EasyLang sentence has,
from here on, a truth value. (The example left open in 2.5 is settled
too: $0$ is the Gödel number of the empty string, which is not a formula,
so $\mathrm{ndiag}(0) = 0$ by the default case — `D(0)=0` is *true*.)

**Verifying the guess.** It is enough to verify it on this section's
sentence. Write $A$ for the string $Y$ — with $h = \mathrm{diag}$, the
input must lie in $\mathrm{diag}$'s domain $\mathbb{F}_1$ (the guess
narrows $h$'s declared domain; one input is all that is needed). The
recast already set $S^{*} = h(Y)$, so the guess reads

$$\mathrm{diag}(A) = S^{*}.$$

But $S^{*}$ is `D(X)=0` with `X` the numeral of $\ulcorner A \urcorner$,
and $\mathrm{diag}(A) = A[\texttt{v} := \ulcorner A \urcorner]$ — the
numeral of $\ulcorner A \urcorner$ standing exactly where `v` stood free.
Un-substituting it, $A$ must be the template with `v` restored in `X`'s
place:

$$A \;=\; \texttt{D(v)=0}$$

— the formula of Section 5's central example.

So define $S^{*} := \mathrm{diag}(A)$ for $A[\texttt{v}]$ = `D(v)=0` —
concretely, the 22-character sentence of 5.3:

```
D(68_040_118_041_061_048)=0
   D   (   v   )   =   0
```

(top line: $S^{*}$, numeral in underscore grouping; bottom line: the
three-digit blocks decoded, spelling out $A$.)

Verification, using only facts already established:

1. $\ulcorner A \urcorner$ = 68_040_118_041_061_048 (4.2).
2. $S^{*} = \mathrm{diag}(A)$ = `D(68040118041061048)=0` (5.3).
3. In the standard model, $S^{*}$ asserts:
   $\mathrm{ndiag}(68\_040\_118\_041\_061\_048) = 0$ — since `D` denotes
   $\mathrm{ndiag}$ (6.4).
4. $\mathrm{ndiag}(68\_040\_118\_041\_061\_048) = \ulcorner
   \mathrm{diag}(A) \urcorner = \ulcorner S^{*} \urcorner$ — the 65-digit
   number computed in 5.4.
5. Therefore $S^{*}$ is true if and only if $\ulcorner S^{*} \urcorner =
   0$, i.e. if and only if $S^{*}$ is empty. **$S^{*}$ says: "this
   sentence is empty."**

The same sentence read on two layers — layer 0 is plain arithmetic,
layer 1 reads every number through the coding — part by part:

| part of $S^{*}$        | layer 0 (arithmetic)                                        | layer 1 (through the coding)                                                                                   |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `68040118041061048`    | the number 68_040_118_041_061_048                           | the formula `D(v)=0` (decode the blocks)                                                                       |
| `D(68040118041061048)` | $\mathrm{ndiag}$ of that number — the 65-digit value of 5.4 | the Gödel number of the diagonalization of `D(v)=0` — which is $\ulcorner S^{*} \urcorner$, this very sentence |
| `=0`                   | equals $0$                                                  | is the empty string ($0$ codes nothing else)                                                                   |
| all of $S^{*}$         | $\mathrm{ndiag}(68\_040\_118\_041\_061\_048) = 0$           | "this sentence is empty"                                                                                       |

Both layers are the same sentence with the same truth value — false;
only the metalevel gloss differs.

Nothing in the construction depends on the particular property asserted:
swap emptiness for another property of Gödel numbers and it goes through
unchanged.

## 7 diag is not special

Section 6 produced its sentence by a guess: interpret `D` as
$\mathrm{ndiag}$, then verify. This section replaces the guess with the requirements.

### 7.1 Numbers in string positions

For $n \in \mathbb{N}$, $n.\texttt{toString()} \in \mathbb{L}$ is the
decimal numeral of $n$ — the $\mathbb{N} \to \mathbb{L}$ direction of
the bijection of 2.4, named as in programming languages (JavaScript:
`(123).toString()` evaluates to `"123"`). From here on the conversion
is **implicit**, as type coercion: wherever a number stands in a string
position — a piece of a concatenation, or inside typewriter text — it
means its numeral. The reading is unambiguous, because a number is not
a string: $\ulcorner Y \urcorner \in \mathbb{N}$ cannot literally occur
inside a sentence, so `D(` $\frown \ulcorner Y \urcorner \frown$ `)`
can only mean
`D(` $\frown \ulcorner Y \urcorner.\texttt{toString()} \frown$ `)` —
the numeral of $\ulcorner Y \urcorner$ spliced between the fixed
pieces. $\texttt{toString()}$ is not written again. (The
display convention of 4.4 — a metalevel number inside typewriter text
stands for its numeral — was this coercion already, informally.)

### 7.2 From the requirements to an equation

Fix a property: an open formula $\mathcal{P} \in \mathbb{F}_1$ that
uses `v`. (Typography: the calligraphic marks the parameter of the
construction; plain capitals $A$, $B$ name incidental formulas.)
Wanted: a sentence $S$ that says — in the truth-condition sense of
6.1 — "this sentence's Gödel number satisfies $\mathcal{P}$."

The requirements, collected from Section 6:

1. **Shape.** By 6.2, $S$ cannot contain its own Gödel numeral; it
   must compute its Gödel number, through `D` applied to a numeral it
   *can* contain. That numeral codes some string — call it $Y$, the
   second unknown:

   $$s \;=\; \mathcal{P}[\texttt{v} :=
   \texttt{D(}\,\ulcorner Y \urcorner\,\texttt{)}]
   \tag{1}$$

2. **Computation.** $S$ is manufactured out of $Y$ by a string
   operation $h$ (as in 6.3, codomain relaxed to strings):

   $$h(Y) \;=\; s \tag{2}$$

3. **Shadow.** `D` denotes the number-floor shadow of $h$, on the
   whole domain of $h$ — writing $d$ for what `D` denotes,

   $$d(\ulcorner W \urcorner) \;=\; \ulcorner h(W) \urcorner
   \quad \text{for every } W \in \mathrm{dom}(h). \tag{3}$$

Equations (1) and (2) are the system, with two string unknowns $S$ and
$Y$; equation (3) is language design, fixed once with $h$, before any
$\mathcal{P}$ arrives.

> **Theorem 7.1 (truth condition).** Suppose (1), (2), (3) hold. Then
> $S$ is true in the standard model if and only if the assignment
> $\texttt{v} \mapsto \ulcorner S \urcorner$ satisfies $\mathcal{P}$ —
> that is, $S$ says "this sentence's Gödel number satisfies
> $\mathcal{P}$."

*Proof.* The closed term inside $S$ evaluates as
$d(\ulcorner Y \urcorner) = \ulcorner h(Y) \urcorner = \ulcorner S
\urcorner$, by (3) at $W = Y$ and then (2). By (1), $S$ is
$\mathcal{P}$ with every free `v` filled by a closed term of value
$\ulcorner S \urcorner$, and truth of such a sentence is satisfaction
of $\mathcal{P}$ at that value (2.5). $\square$

Eliminating $S$ — substitute (2) into (1) — leaves one equation in the
single unknown $Y$:

$$h(Y) \;=\; \mathcal{P}[\texttt{v} :=
\texttt{D(}\,\ulcorner Y \urcorner\,\texttt{)}]$$

### 7.3 The self-reference equation

Every property is equivalent to one of a single fixed shape. Bump
$\mathcal{P}$'s numbered variables (each `vi` to `v(i+1)`, so `v1` is
unused), write $\mathcal{P}^{+}$ for the bumped formula, and let
the *core* be $\mathcal{P}^{+}[\texttt{v} := \texttt{v1}]$ —
the one substitution of a non-numeral in this article, capture-safe because of the bump — and form

$$\mathcal{P}' \;=\; \texttt{exists v1.v=v1 and (} \frown
\text{core} \frown \texttt{)}$$

($\frown$ is string concatenation): "some number equals `v` and has
the property." $\mathcal{P}'$ is satisfied by exactly the numbers $\mathcal{P}$ is —
the renaming fact of 2.5, plus the leading `exists` merely naming the
value — and it contains the token `v` exactly once, with everything
after it in one `v`-free piece. That piece is the **block**

$$Q \;=\; \texttt{=v1 and (} \frown \text{core} \frown \texttt{)}$$

— set in plain type because it is a string, not a formula: on its own
$Q$ is ill-formed, and what it owes the grammar is only that `D(0)`
$\frown Q$ be a formula with free variables at most `v1`.

Substituting the D-term for $\mathcal{P}'$'s single `v` turns the
equation of 7.2 into pure concatenation. This is the final form:

**The self-reference equation.**

$$h(Y) \;=\; \texttt{exists v1.D(} \frown
\ulcorner Y \urcorner \frown \texttt{)} \frown Q$$

A fixed **head**, the numeral of $Y$'s own code, the block. The head
does two jobs: its D-term computes the sentence's own Gödel number (by
the shadow (3)), and its quantifier binds `v1`, the block's *pronoun*
for that number — the sentence reads "there is a number: it is my
code, and it has the property." Theorem 7.1, applied to
$\mathcal{P}'$, gives the truth condition for $\mathcal{P}$.

Running example, emptiness: $\mathcal{P}$ = `v=0`, core `v1=0`, block
$Q$ = `=v1 and (v1=0)`. (Evenness: core `exists v2.v1=v2+v2`.)

### 7.4 The one requirement

The block is manufactured from the property; the solution is
manufactured from the block. A convention is a *recipe*: a metalevel
function

$$\mathrm{pack} : Q \mapsto Y$$

together with an $h$ satisfying the self-reference equation at
$Y = \mathrm{pack}(Q)$ for every $Q$.

> **Theorem 7.2 (injectivity).** Such an $h$ exists if and only if
> $\mathrm{pack}$ is injective.

*Proof.* If $\mathrm{pack}(Q_1) = \mathrm{pack}(Q_2) = Y$, the
equation demands that $h(Y)$ be the head-and-numeral (the same for
both — same $Y$, same code) followed by $Q_1$, and also followed by
$Q_2$; $h(Y)$ is one string, so $Q_1 = Q_2$. Conversely, for injective
$\mathrm{pack}$, define $h$ on the image by the equation itself,

$$h(\mathrm{pack}(Q)) \;:=\; \texttt{exists v1.D(} \frown
\ulcorner \mathrm{pack}(Q) \urcorner \frown
\texttt{)} \frown Q,$$

well-defined because each $Y$ in the image arises from exactly one
$Q$; arbitrary elsewhere. $\square$

The boundary case is the recipe that ignores its input —
$\mathrm{pack}(Q)$ = `1=1` for every $Q$ — which merges all blocks
into one $Y$ and fails for every pair. Injectivity is the exact
content of "the recipe must use $Q$": transform, decorate, or bury the
block at will, but lose no part of it, for $h$ can return only what
$Y$ still determines.

Theorem 7.2 is pure existence. A convention someone can actually
operate needs more: $\mathrm{pack}$ and $h$ must be given by rules —
computable, specifiable in advance. Every entry in the catalogue below
meets this.

### 7.5 The catalogue

Every injective $\mathrm{pack}$ is a convention. Seven, on the
emptiness block $Q$ = `=v1 and (v1=0)`:

| $\mathrm{pack}(Q)$          | $Y$                            | $h(Y)$                                                                                                       |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| $Q$                         | `=v1 and (v1=0)`               | `exists v1.D(` $\frown \ulcorner Y \urcorner \frown$ `)` $\frown Y$                                          |
| `v` $\frown Q$              | `v=v1 and (v1=0)`              | `exists v1.D(` $\frown \ulcorner Y \urcorner \frown$ `)` $\frown$ ($Y$ minus its leading `v`)                |
| `exists v1.D(v)` $\frown Q$ | `exists v1.D(v)=v1 and (v1=0)` | $Y$ with $\ulcorner Y \urcorner$ substituted for its free `v` — **diag**                                     |
| `exists v1.D()` $\frown Q$  | `exists v1.D()=v1 and (v1=0)`  | $Y$ with $\ulcorner Y \urcorner$ inserted into its `()` gap                                                  |
| `)` $\frown Q$              | `)=v1 and (v1=0)`              | `exists v1.D(` $\frown \ulcorner Y \urcorner \frown$ `)` $\frown$ ($Y$ minus its first character)            |
| `D(` $\frown Q \frown$ `)`  | `D(=v1 and (v1=0))`            | `exists v1.D(` $\frown \ulcorner Y \urcorner \frown$ `)` $\frown$ ($Y$ minus its `D(` prefix and `)` suffix) |
| $Q \frown Q$                | `=v1 and (v1=0)=v1 and (v1=0)` | `exists v1.D(` $\frown \ulcorner Y \urcorner \frown$ `)` $\frown$ (first half of $Y$)                        |

All seven sentences are identical except for the numeral in the head —
the code of the row's $Y$.

Three remarks:

- **The diag row is Section 6's convention.** Its $Y$ is a formula in
  $\mathbb{F}_1$, its $h$ is $\mathrm{diag}$, and `D` denotes
  $\mathrm{ndiag}$ — the guess of 6.4, one row among seven. Section
  6's own $S^{*}$ = `D(68040118041061048)=0` is the same convention on
  the un-normalized shape of 7.2: a simple property can fit the D-term
  directly into its own `v`-slot and needs no head. The normalized
  shape trades that economy for one form serving every property.
- **$Y$ owes distinctness, nothing else.** The junk row's $Y$ opens
  with a stray parenthesis and is no formula; the doubling row's $h$
  throws half of $Y$ away unread. Meaning and economy are both
  optional — only losing part of $Q$ is fatal.
- **Each row is a different language.** Different $h$, hence a
  different shadow, hence a different interpretation of `D` completing
  2.5 — different machines, agreeing only on what the equation
  demands, every one of them satisfying Theorem 7.1.

### 7.6 What is left of diag

What every row shares: the sentence carries the numeral of $Y$'s own
code, so $\ulcorner S \urcorner$ exceeds the cube of
$\ulcorner Y \urcorner$ — the counting fact of 6.2 returned as a
growth law, ruling out any cheap interpretation of `D`; infinitely
many $Y$ are needed; and $Q$ must be recoverable from $Y$. Beyond
that, nothing is forced — the catalogue is the proof. What is then
left of $\mathrm{diag}$: it is the one row whose $Y$ is a well-formed
formula and whose $h$ is substitution, an operation the grammar itself
defines rather than a string edit invented for the convention.
`exists v1.D(v)=v1 and (v1=0)` can be *read*; `)=v1 and (v1=0)` can
only be decoded. diag is not special; the article keeps it because it is the one
convention that stays inside the grammar.
