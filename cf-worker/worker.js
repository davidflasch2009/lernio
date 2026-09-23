/**
 * lernio WebUntis CORS-Proxy — Cloudflare Worker
 *
 * Aufruf aus dem Frontend:
 *   fetch('https://<worker-subdomain>.workers.dev/?url=' + encodeURIComponent(target), {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(rpc)
 *   });
 *
 * Erlaubt sind nur WebUntis-Hosts (*.webuntis.com). Alles andere → 403.
 */

const ALLOWED_HOST_SUFFIX = '.webuntis.com';

// Optional: nur eigene Origins erlauben. Leer lassen = alle Origins (praktisch für
// GitHub Pages + lokale Tests). Zum Härten die eigenen Domains hier eintragen.
const ALLOWED_ORIGINS = [
  // 'https://davidflasch2009.github.io',
  // 'http://localhost:8080',
];

function corsHeaders(origin) {
  const allowOrigin =
    ALLOWED_ORIGINS.length === 0
      ? (origin || '*')
      : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function isAllowedTarget(u) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === 'webuntis.com' || host.endsWith(ALLOWED_HOST_SUFFIX);
  } catch (e) {
    return false;
  }
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const baseCors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: baseCors });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response(
        'lernio webuntis proxy — pass ?url=<https://…webuntis.com/…>',
        { status: 400, headers: { ...baseCors, 'Content-Type': 'text/plain' } }
      );
    }

    if (!isAllowedTarget(target)) {
      return new Response('Forbidden target host', {
        status: 403,
        headers: { ...baseCors, 'Content-Type': 'text/plain' },
      });
    }

    // Nur Content-Type/Accept durchreichen, sonst nichts (kein Cookie, kein UA-Weiterreichen).
    const fwdHeaders = new Headers();
    const ct = request.headers.get('Content-Type');
    if (ct) fwdHeaders.set('Content-Type', ct);
    const accept = request.headers.get('Accept');
    if (accept) fwdHeaders.set('Accept', accept);

    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers: fwdHeaders,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
        redirect: 'follow',
      });
    } catch (e) {
      return new Response('Upstream fetch failed: ' + (e && e.message ? e.message : e), {
        status: 502,
        headers: { ...baseCors, 'Content-Type': 'text/plain' },
      });
    }

    const respHeaders = new Headers(baseCors);
    const upstreamCT = upstream.headers.get('Content-Type');
    if (upstreamCT) respHeaders.set('Content-Type', upstreamCT);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  },
};
