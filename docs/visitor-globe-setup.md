# Visitor globe — backend setup (one time, ~5 minutes)

The sidebar globe renders and rotates entirely on the site. To make it show real
visitor locations and counts, it needs a tiny free backend that records where
visits come from. The ready-made code is in `docs/visitor-globe-worker.js` and runs
on Cloudflare Workers (free tier: 100k requests/day, far more than enough).

It stores **only aggregated city-level counts** — no IP addresses, no cookies
(the site uses `sessionStorage` so one browsing session counts once).

## Steps (all in the Cloudflare dashboard, no CLI)

1. Create a free account at https://dash.cloudflare.com/sign-up if you don't have
   one.
2. **Storage & Databases → KV → Create namespace** — name it `visitor-globe`.
3. **Workers & Pages → Create → Worker** — name it `visits` (this becomes the
   URL), click **Deploy**, then **Edit code**, replace the sample with the
   contents of `docs/visitor-globe-worker.js`, and **Deploy** again.
4. In the worker: **Settings → Bindings → Add → KV namespace** — variable name
   `VISITS`, namespace `visitor-globe`. Save (it redeploys).
5. Copy the worker URL, e.g. `https://visits.<your-subdomain>.workers.dev`, and
   paste it into `_config.yml`:

   ```yaml
   visitor_stats_url        : "https://visits.<your-subdomain>.workers.dev"
   ```

6. Commit and push. Done — the globe starts counting from the next visit and
   shows a bordeaux diamond per city, sized by visit count, with a
   "N visits · M places" line underneath.

## Notes

- The worker only accepts requests from `https://rushi-q.github.io` (CORS). If
  the site ever moves to a custom domain, update `Access-Control-Allow-Origin`
  in the worker.
- `GET <worker-url>/stats` in a browser shows the raw JSON at any time.
- To reset all counts, delete the keys in the KV namespace (or the namespace
  itself and re-create it).
