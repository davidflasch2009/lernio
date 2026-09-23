# WebUntis CORS-Proxy auf Cloudflare Workers

Fallback für den Fall, dass die öffentlichen CORS-Proxies (allorigins,
corsproxy.io, cors.x2u.in, codetabs) für den WebUntis-Login nicht (mehr)
funktionieren. Stand Herbst 2026 sind sie das meistens auch nicht.

## Was das ist

Ein winziger Cloudflare Worker, der eingehende Requests durchreicht (nur an
`*.webuntis.com`) und die passenden CORS-Header dranhängt.

- **Kosten:** 0 € (Free-Plan reicht — 100.000 Requests/Tag).
- **Speicher/State:** keiner, reines Forwarding.
- **Whitelist:** nur `*.webuntis.com` (kein offener Proxy).

## Einmal-Setup — Weg A: Über die Cloudflare-Website (kein CLI, ~3 Min)

1. Auf https://dash.cloudflare.com/sign-up einen Account anlegen
   (oder einloggen).
2. Im Dashboard links: **Workers & Pages** → **Create application** →
   **Create Worker**.
3. Namen wählen (z.B. `lernio-untis-proxy`) → **Deploy**.
4. **Edit code** → den kompletten Inhalt von [`worker.js`](./worker.js) einfügen
   → **Deploy**.
5. Oben steht die URL, z.B. `https://lernio-untis-proxy.<dein-name>.workers.dev`.
   → in der App unter **Mehr → WebUntis → "Fortgeschritten: eigener CORS-Proxy"**
   eintragen als:
   ```
   https://lernio-untis-proxy.<dein-name>.workers.dev/?url=
   ```
   (mit dem `?url=` am Ende — daran hängt die App die WebUntis-URL an)
6. Auf **Speichern** drücken → Ferien laden.

## Einmal-Setup — Weg B: Über die CLI (für Updates handlicher)

1. Node ≥ 18 lokal installiert haben. Dann Wrangler:
   ```
   npm install -g wrangler
   wrangler login
   ```
2. Deploy:
   ```
   cd cf-worker
   wrangler deploy
   ```
   Wrangler gibt am Ende die URL aus. Rest wie oben Punkt 5–6.

## Optional härten

In `worker.js` unter `ALLOWED_ORIGINS` die eigenen Domains eintragen,
damit der Proxy nur von der lernio-App aus genutzt werden kann:

```js
const ALLOWED_ORIGINS = [
  'https://davidflasch2009.github.io',
  'http://localhost:8080'
];
```

## Testen ohne Deploy (CLI)

```
cd cf-worker
wrangler dev
```
Dann im Browser:
```
http://127.0.0.1:8787/?url=https://mobile.webuntis.com/ms/schoolquery2
```
sollte 405 (Method Not Allowed vom WebUntis-Backend) zurückgeben — heißt:
Proxy läuft, Whitelist greift, Upstream ist erreichbar.
