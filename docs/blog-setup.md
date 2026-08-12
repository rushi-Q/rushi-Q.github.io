# Blog setup

The blog lives at `/blog/` and shares the front page's "ivory & ink" treatment:
Fraunces over Source Serif 4, light/dark themes, one oxblood accent.

## What is where

| File | Purpose |
|:-----|:--------|
| `_pages/blog.md` | The index at `/blog/`, grouped by year |
| `_layouts/post.html` | Single post layout |
| `_includes/section-nav.html` | About / Blog tabs above the content |
| `_includes/post-reactions.html` | Like button |
| `_includes/post-nav.html` | Older / newer post links |
| `_includes/comments.html` | Comment thread and form |
| `_includes/reading-time.html` | Reading time (characters for Chinese, words otherwise) |
| `_sass/_blog.scss` | Every blog style, dark theme included |
| `assets/js/blog.js` | Likes and in-page links |
| `assets/js/comments.js` | Comment thread behaviour |
| `docs/worker.js` | Cloudflare Worker: globe, likes, comments |
| `_drafts/2026-08-12-a-style-test.md` | Typography specimen, never published |

## Writing a post

Create `_posts/YYYY-MM-DD-slug.md`:

```markdown
---
title: "Title"
subtitle: "One line, shown under the title and in the index"   # optional
date: 2026-09-01
tags: [rl, agents]        # optional
lang: zh                  # only for Chinese posts, so reading time is right
comments: false           # optional, hides comments on this post
likes: false              # optional, hides the like button on this post
---

Body…
```

The URL comes out as `/blog/2026/slug/`, set by `permalink` in `_config.yml`.

Preview locally with `bundle exec jekyll serve`; add `--drafts` to include
anything in `_drafts/`.

## Section tabs

`_data/navigation.yml` drives the tab strip above the content:

```yaml
main:
  - title: "About"
    url: /
    match: exact     # highlighted on the front page only
  - title: "Blog"
    url: /blog/
    match: prefix    # highlighted on /blog/ and every post under it
```

Add a section by adding an entry; `_includes/section-nav.html` renders whatever
is in the list.

## Entries published elsewhere

Give a post an `external` URL to point the index at someone else's site:

```yaml
external: https://some-site.com/the-post
source: "some-site.com"    # optional, replaces the reading time in the index
```

The title picks up a ↗ and links straight out. Jekyll still generates
`/blog/2026/slug/`, but that page carries a `meta refresh` and a canonical link
to the original, so it bounces immediately — a sentence of summary in the body
is enough.

## Math

MathJax 3, configured in `_includes/head/custom.html`.

- Inline: `$x$` or `$$x$$`
- Display: `$$ … $$` as its own paragraph
- Numbered: `\begin{equation} … \end{equation}`
- Predefined macros: `\R` `\E` `\argmax` `\argmin`

kramdown compiles `$$…$$` into `<script type="math/tex">`, which MathJax 3 does
not read. The `pageReady` hook in `head/custom.html` rewrites those tags into
`\(…\)` / `\[…\]` before the first typeset. Going through kramdown's math parser
also keeps Markdown from eating underscores and asterisks inside a formula.

## Images

Use `<figure>` when the image needs a caption:

```html
<figure>
  <img src="{{ '/images/foo.png' | relative_url }}" alt="Description" loading="lazy">
  <figcaption>Caption</figcaption>
</figure>
```

- `class="figure--wide"` — runs past the reading measure, for large diagrams
- `class="figure--row"` — two images side by side

Keep images in `images/` and always write the path as
`{{ '/images/x.png' | relative_url }}` with the leading slash, or it will 404
from a deep URL like `/blog/2026/slug/`.

## Likes

The front end is in `assets/js/blog.js`; storage is the same Cloudflare Worker
and KV namespace that backs the visitor globe.

1. Redeploy the Worker — the `/likes` routes are already in it:
   ```bash
   cd docs && npx wrangler deploy
   ```
2. Leave `likes_url` blank in `_config.yml`; it falls back to
   `visitor_stats_url`.

API:

- `GET /likes?slug=/blog/2026/foo/` → `{"count": 12}`
- `POST /likes?slug=…` with body `{"delta": 1}` or `{"delta": -1}` → `{"count": 13}`

Like state lives in the browser's `localStorage`, so the same person can like
again from another device — fine for a personal blog. Before the Worker is
deployed the heart still toggles, it just shows no number.

Like keys are prefixed `like|` in KV, and `/stats` filters them out so they never
show up as cities on the globe.

## Comments

A small comment system of its own, on the same Worker and KV, with three
identities:

| Identity | How | Shown as |
|:---------|:----|:---------|
| Anonymous | Write and post, fill in nothing | Diamond mark, italic "Anonymous" |
| Named | Fill in Name (and optionally Website) | Monogram chip and the name |
| Verified | "Sign in with GitHub" | GitHub avatar, username, `GitHub` tag |

Front end in `assets/js/comments.js`, styles in `_sass/_blog.scss`. It is the
site's own markup rather than an embedded iframe, so it follows the light/dark
theme instead of dragging in GitHub's.

### Deploying

```bash
cd docs && npx wrangler deploy
```

Leave `comments.endpoint` blank in `_config.yml` to fall back to
`visitor_stats_url`. Set it to `"off"` to hide comments site-wide, or put
`comments: false` in a post's front matter to hide them on one post.

### GitHub sign-in (optional)

Skip this and anonymous and named comments still work — the button just stays
hidden, because the Worker reports `github: false` in the `/comments` response.

1. <https://github.com/settings/developers> → New OAuth App
   - Homepage URL: `https://rushi-q.github.io`
   - Authorization callback URL: `https://visits.rushi-qiang.workers.dev/auth/callback`
2. Put the Client ID in `docs/wrangler.toml`:
   ```toml
   [vars]
   GITHUB_CLIENT_ID = "Iv1.xxxxxxxxxxxx"
   ```
3. Keep the secret out of the repo:
   ```bash
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```
4. `npx wrangler deploy` again

Only `read:user` is requested, and only the login, avatar URL, and profile link
are stored. The access token is never kept — it is exchanged for a random
session id with a 30-day expiry in KV, and that is all the browser ever holds.

### Removing a comment

```bash
npx wrangler secret put ADMIN_TOKEN      # once
curl -X DELETE -H "X-Admin-Token: <your token>" \
  "https://visits.rushi-qiang.workers.dev/comments?slug=/blog/2026/foo/&id=<id>"
```

Ids come back from `GET /comments?slug=…`.

### Abuse handling

- Five comments per IP per ten minutes; only the first eight bytes of the
  SHA-256 of the IP are stored, never the address
- A honeypot field — anything that fills it is dropped silently
- 4000 characters of body, 40 of name; control characters stripped
- Rendering goes through `textContent` end to end, so comment text can never
  become markup
- The website field accepts `http(s)://` only, and shows only when a name is given

If you would rather not run this yourself, [Waline](https://waline.js.org/) and
[Twikoo](https://twikoo.js.org/) both support anonymous plus social login, at the
cost of another backend and database to deploy.

## Turning the blog off

Delete `_pages/blog.md` and remove the Blog entry from `_data/navigation.yml`.
