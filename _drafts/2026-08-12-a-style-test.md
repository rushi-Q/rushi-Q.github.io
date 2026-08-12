---
title: "A Style Test"
subtitle: "Everything the blog knows how to render, on one page — delete this file when the real writing starts."
date: 2026-08-12
tags: [meta, typography]
# lang: zh   # uncomment for Chinese posts so reading time counts characters
---

This is a draft. It lives in `_drafts/`, so it never ships — run
`bundle exec jekyll serve --drafts` to see it locally, or move it into `_posts/`
with a `YYYY-MM-DD-` filename to publish. It exists to prove out every element
a post might use: headings, math, figures, code, tables, quotes, footnotes.

## Headings and running text

Body text is Source Serif 4 at a 40rem measure — about seventy-eight characters,
which is where long-form prose reads most comfortably. Headings are Fraunces, the
same display face as the front page, so a post never looks like it came from a
different site.

Inline styling behaves as expected: **bold**, *italic*, `inline code`, and
[a link](https://example.com) that carries the oxblood underline. A link to
[another page on this site]({{ '/blog/' | relative_url }}) stays in the same tab.

### A third level

Third-level headings are quieter — same face, no extra rule, just enough weight
to break up a long section.

> The best way to have a good idea is to have a lot of ideas.
> <cite>Linus Pauling</cite>

## Math

Inline math sits in the line without disturbing it: the loss $\mathcal{L}(\theta)$
is minimized over $\theta \in \R^d$, and the update costs $O(d \log d)$ per step.

Display math gets its own air, and scrolls sideways on a phone rather than
breaking the layout:

$$
\theta_{t+1} = \theta_t - \eta \nabla_\theta \, \E_{x \sim \mathcal{D}}
\big[ \ell(f_\theta(x), y) \big]
$$

Numbered equations work through the AMS environments:

$$
\begin{equation}
J(\pi) = \E_{\tau \sim \pi} \left[ \sum_{t=0}^{T} \gamma^t r(s_t, a_t) \right]
\end{equation}
$$

A few macros are predefined in `_includes/head/custom.html`: `\R`, `\E`,
`\argmax`, `\argmin`. So $\argmax_{a} Q(s, a)$ needs no setup.

## Figures

A `<figure>` gets a caption, a soft shadow, and centering:

<figure>
  <img src="{{ '/images/500x300.png' | relative_url }}" alt="A placeholder image" loading="lazy">
  <figcaption>Use <code>&lt;figure&gt;</code> when the image needs a caption. Plain markdown <code>![alt](src)</code> works too — it just has no caption.</figcaption>
</figure>

Add `class="figure--wide"` to let a diagram run past the reading measure, and
`class="figure--row"` to sit two images side by side.

## Code

```python
def gradient_step(theta, batch, lr=1e-3):
    """One step of SGD — nothing clever."""
    grad = compute_gradient(theta, batch)
    return theta - lr * grad
```

## Tables

| Method | Environments | Pass@1 | Notes |
|:-------|:-------------|-------:|:------|
| Baseline | 12 | 31.4% | no retrieval |
| + retrieval | 12 | 38.9% | top-5 documents |
| + self-critique | 12 | 44.2% | two rounds |

Tables scroll horizontally on narrow screens instead of squeezing.

## Lists

- Diamond markers, matching the research list on the front page
- Nested items keep the same rhythm
  - like this one
- And ordered lists work too:

1. First
2. Second
3. Third

## Footnotes

Footnotes land at the bottom, behind a hairline rule, and clicking one stays in
this tab.[^1] A second one, for good measure.[^2]

[^1]: This is the footnote text. It can contain `code` and [links](https://example.com).
[^2]: Kramdown numbers them automatically, in order of first reference.

---

Below this rule sit the like button and the comment thread. Both are part of the
post layout, so every post gets them for free.
