/* Cloudflare Worker backing the sidebar visitor globe.
 * Records one aggregated, city-level count per visit (no IPs, no cookies)
 * and serves the totals back as JSON.
 *
 * Endpoints:
 *   POST /hit    — count the current visitor (geo comes from request.cf)
 *   GET  /stats  — { points: [{ label, lat, lon, count }] }
 *
 * Requires a KV namespace bound as VISITS. See docs/visitor-globe-setup.md.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': 'https://rushi-q.github.io',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'application/json',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers });

    if (url.pathname === '/hit' && request.method === 'POST') {
      const cf = request.cf || {};
      if (cf.latitude == null || cf.longitude == null) {
        return new Response('{"ok":false}', { headers });
      }
      const key = [
        cf.country || '??',
        cf.city || '',
        (+cf.latitude).toFixed(1),
        (+cf.longitude).toFixed(1),
      ].join('|');
      const current = parseInt((await env.VISITS.get(key)) || '0', 10);
      await env.VISITS.put(key, String(current + 1));
      return new Response('{"ok":true}', { headers });
    }

    if (url.pathname === '/stats' && request.method === 'GET') {
      const list = await env.VISITS.list({ limit: 1000 });
      const points = await Promise.all(
        list.keys.map(async (k) => {
          const [country, city, lat, lon] = k.name.split('|');
          const count = parseInt((await env.VISITS.get(k.name)) || '0', 10);
          return { label: city ? city + ', ' + country : country, lat: +lat, lon: +lon, count };
        })
      );
      return new Response(JSON.stringify({ points }), {
        headers: { ...headers, 'Cache-Control': 'public, max-age=300' },
      });
    }

    return new Response('not found', { status: 404 });
  },
};
