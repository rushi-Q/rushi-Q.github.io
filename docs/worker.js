/* Cloudflare Worker backing the site's three interactive bits:
 *   - the sidebar visitor globe
 *   - blog post likes
 *   - blog comments (anonymous, named, or GitHub-verified)
 *
 * Endpoints
 *   POST   /hit                  count the current visitor (geo from request.cf)
 *   GET    /stats                { points: [{ label, lat, lon, count }] }
 *   GET    /likes?slug=…         { count }
 *   POST   /likes?slug=…         body { delta: 1 | -1 } → { count }
 *   GET    /comments?slug=…      { comments: [...], github: bool }
 *   POST   /comments?slug=…      body { body, name?, website? } → { ok, comment }
 *   DELETE /comments?slug=&id=   header X-Admin-Token → { ok }
 *   GET    /auth/github?return=  302 → GitHub authorize
 *   GET    /auth/callback        302 → <return>#gh=<session>
 *   GET    /auth/me              header Authorization: Bearer → { login, avatar, url }
 *
 * Bindings
 *   VISITS               KV namespace (required)
 *   GITHUB_CLIENT_ID     var    — optional; without it the sign-in button hides
 *   GITHUB_CLIENT_SECRET secret — wrangler secret put GITHUB_CLIENT_SECRET
 *   ADMIN_TOKEN          secret — optional; enables DELETE
 *
 * See docs/blog-setup.md.
 */

const ORIGIN = 'https://rushi-q.github.io';

const LIKE_PREFIX = 'like|';
const COMMENT_PREFIX = 'comment|';

const MAX_SLUG = 200;
const MAX_BODY = 4000;
const MAX_NAME = 40;
const MAX_URL = 200;
const RATE_MAX = 5;        // comments per window, per IP
const RATE_WINDOW = 600;   // seconds
const SESSION_TTL = 60 * 60 * 24 * 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json',
    };
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), { status, headers: { ...headers, ...extra } });

    if (request.method === 'OPTIONS') return new Response(null, { headers });

    /* ================================================================ globe */

    if (url.pathname === '/hit' && request.method === 'POST') {
      const cf = request.cf || {};
      if (cf.latitude == null || cf.longitude == null) return json({ ok: false });
      const key = [
        cf.country || '??',
        cf.city || '',
        (+cf.latitude).toFixed(1),
        (+cf.longitude).toFixed(1),
      ].join('|');
      const current = parseInt((await env.VISITS.get(key)) || '0', 10);
      await env.VISITS.put(key, String(current + 1));
      return json({ ok: true });
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      const list = await env.VISITS.list({ limit: 1000 });
      const visitKeys = list.keys.filter((k) => !isReserved(k.name));
      const points = await Promise.all(
        visitKeys.map(async (k) => {
          const [country, city, lat, lon] = k.name.split('|');
          const count = parseInt((await env.VISITS.get(k.name)) || '0', 10);
          return { label: city ? city + ', ' + country : country, lat: +lat, lon: +lon, count };
        })
      );
      return json({ points }, 200, { 'Cache-Control': 'public, max-age=300' });
    }

    /* ================================================================ likes */

    if (url.pathname === '/likes') {
      const slug = cleanSlug(url.searchParams.get('slug'));
      if (!slug) return json({ error: 'bad slug' }, 400);
      const key = LIKE_PREFIX + slug;

      if (request.method === 'GET') {
        const count = parseInt((await env.VISITS.get(key)) || '0', 10);
        return json({ count }, 200, { 'Cache-Control': 'public, max-age=30' });
      }

      if (request.method === 'POST') {
        let delta = 1;
        try {
          const b = await request.json();
          delta = b && b.delta === -1 ? -1 : 1;
        } catch (e) { /* empty body means +1 */ }
        const current = parseInt((await env.VISITS.get(key)) || '0', 10);
        const count = Math.max(0, current + delta);
        await env.VISITS.put(key, String(count));
        return json({ count }, 200, { 'Cache-Control': 'no-store' });
      }
    }

    /* ============================================================= comments */

    if (url.pathname === '/comments') {
      const slug = cleanSlug(url.searchParams.get('slug'));
      if (!slug) return json({ error: 'bad slug' }, 400);
      const prefix = COMMENT_PREFIX + slug + '|';

      if (request.method === 'GET') {
        const list = await env.VISITS.list({ prefix, limit: 500 });
        const comments = (
          await Promise.all(
            list.keys.map(async (k) => {
              const raw = await env.VISITS.get(k.name);
              if (!raw) return null;
              try {
                const c = JSON.parse(raw);
                c.id = k.name.slice(prefix.length);
                return c;
              } catch (e) {
                return null;
              }
            })
          )
        ).filter(Boolean);
        return json(
          { comments, github: Boolean(env.GITHUB_CLIENT_ID) },
          200,
          { 'Cache-Control': 'public, max-age=15' }
        );
      }

      if (request.method === 'POST') {
        let payload;
        try {
          payload = await request.json();
        } catch (e) {
          return json({ error: 'bad request' }, 400);
        }

        const body = clean(payload.body, MAX_BODY);
        if (body.length < 2) return json({ error: 'Say a little more than that.' }, 400);

        const ip = request.headers.get('CF-Connecting-IP') || '0';
        const bucket = RATE_PREFIX + (await shortHash(ip)) + '|' +
          Math.floor(Date.now() / 1000 / RATE_WINDOW);
        const used = parseInt((await env.VISITS.get(bucket)) || '0', 10);
        if (used >= RATE_MAX) {
          return json({ error: 'That is a lot of comments at once — try again shortly.' }, 429);
        }
        await env.VISITS.put(bucket, String(used + 1), { expirationTtl: RATE_WINDOW * 2 });

        const comment = { body, at: new Date().toISOString() };

        const session = bearer(request);
        const who = session ? await getSession(env, session) : null;
        if (who) {
          comment.gh = { login: who.login, avatar: who.avatar, url: who.url };
        } else {
          const name = clean(payload.name, MAX_NAME);
          if (name) comment.name = name;
          const site = safeUrl(payload.website);
          if (site && name) comment.website = site;
        }

        const id = String(Date.now()).padStart(14, '0') + '-' +
          Math.random().toString(36).slice(2, 8);
        await env.VISITS.put(prefix + id, JSON.stringify(comment));
        comment.id = id;
        return json({ ok: true, comment }, 201, { 'Cache-Control': 'no-store' });
      }

      if (request.method === 'DELETE') {
        if (!env.ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN) {
          return json({ error: 'forbidden' }, 403);
        }
        const id = (url.searchParams.get('id') || '').slice(0, 40);
        if (!id) return json({ error: 'bad id' }, 400);
        await env.VISITS.delete(prefix + id);
        return json({ ok: true });
      }
    }

    /* ========================================================= github oauth */

    if (url.pathname === '/auth/github' && request.method === 'GET') {
      if (!env.GITHUB_CLIENT_ID) return json({ error: 'github sign-in not configured' }, 400);
      const back = url.searchParams.get('return') || ORIGIN;
      if (!back.startsWith(ORIGIN)) return json({ error: 'bad return url' }, 400);

      const state = crypto.randomUUID();
      await env.VISITS.put(STATE_PREFIX + state, back, { expirationTtl: 600 });

      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
      authorize.searchParams.set('scope', 'read:user');
      authorize.searchParams.set('state', state);
      authorize.searchParams.set('redirect_uri', url.origin + '/auth/callback');
      return Response.redirect(authorize.toString(), 302);
    }

    if (url.pathname === '/auth/callback' && request.method === 'GET') {
      const state = url.searchParams.get('state') || '';
      const code = url.searchParams.get('code') || '';
      const back = await env.VISITS.get(STATE_PREFIX + state);
      if (!back) return new Response('expired sign-in link', { status: 400 });
      await env.VISITS.delete(STATE_PREFIX + state);

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: url.origin + '/auth/callback',
        }),
      });
      const tok = await tokenRes.json().catch(() => ({}));
      if (!tok.access_token) return Response.redirect(back + '#gh_error=1', 302);

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: 'Bearer ' + tok.access_token,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'rushi-q-blog',
        },
      });
      const u = await userRes.json().catch(() => ({}));
      if (!u.login) return Response.redirect(back + '#gh_error=1', 302);

      const session = crypto.randomUUID().replace(/-/g, '');
      await env.VISITS.put(
        SESSION_PREFIX + session,
        JSON.stringify({ login: u.login, avatar: u.avatar_url, url: u.html_url }),
        { expirationTtl: SESSION_TTL }
      );
      return Response.redirect(back + '#gh=' + session, 302);
    }

    if (url.pathname === '/auth/me' && request.method === 'GET') {
      const who = await getSession(env, bearer(request));
      if (!who) return json({ error: 'not signed in' }, 401);
      return json(who, 200, { 'Cache-Control': 'no-store' });
    }

    return new Response('not found', { status: 404 });
  },
};

/* -------------------------------------------------------------------- bits */

const RATE_PREFIX = 'rate|';
const STATE_PREFIX = 'state|';
const SESSION_PREFIX = 'sess|';

/* Keys the globe must ignore when it lists the namespace. */
function isReserved(key) {
  return key.startsWith(LIKE_PREFIX) || key.startsWith(COMMENT_PREFIX) ||
    key.startsWith(RATE_PREFIX) || key.startsWith(STATE_PREFIX) ||
    key.startsWith(SESSION_PREFIX);
}

function cleanSlug(raw) {
  const slug = (raw || '').slice(0, MAX_SLUG);
  if (!slug.startsWith('/') || slug.includes('|')) return null;
  return slug;
}

/* Plain text only: strip control characters, collapse runs of blank lines. */
function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function safeUrl(value) {
  const v = clean(value, MAX_URL);
  if (!/^https?:\/\/[^\s]+$/i.test(v)) return '';
  return v;
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  const m = /^Bearer\s+([A-Za-z0-9]+)$/.exec(h);
  return m ? m[1] : '';
}

async function getSession(env, token) {
  if (!token) return null;
  const raw = await env.VISITS.get(SESSION_PREFIX + token);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function shortHash(value) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buf)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
