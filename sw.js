// Offline support for the whole tools site.
// On install it caches the home page, tools.json and every listed tool's page plus the
// files that page references, so all tools work offline after one visit to the home page.
// - Pages and tools.json: network first, cached copy when offline.
// - Other files: serve from cache, refresh in the background.
// Tools that ship their own sw.js (e.g. barpilot/) take over their own folder once visited.
// The deploy workflow stamps VERSION with the commit id, so every deploy re-caches.
const VERSION = "__BUILD__";
const PREFIX = "random-tools-";
const CACHE = PREFIX + VERSION;
const NETWORK_TIMEOUT_MS = 3000;

// Relative src/href values in a page (skips absolute URLs, anchors, data: etc.).
function localRefs(html, base) {
  const out = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const v = m[1];
    if (/^(?:[a-z]+:|\/\/|#)/i.test(v)) continue;
    const u = new URL(v, base);
    if (u.href.startsWith(self.registration.scope)) out.add(u.href.split("#")[0]);
  }
  return [...out];
}

async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll([new Request("./", { cache: "reload" }), new Request("./tools.json", { cache: "reload" })]);
  const { tools = [] } = await (await cache.match("./tools.json")).json();
  await Promise.allSettled(
    tools.map(async ({ slug }) => {
      const pageUrl = new URL(`./${encodeURIComponent(slug)}/`, self.registration.scope).href;
      const res = await fetch(pageUrl, { cache: "reload" });
      if (!res.ok) return;
      await cache.put(pageUrl, res.clone());
      const refs = localRefs(await res.text(), pageUrl);
      await Promise.allSettled(refs.map((u) => cache.add(u)));
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  });
  try {
    return await withTimeout(network, NETWORK_TIMEOUT_MS);
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return network;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await network) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === "navigate" || url.pathname.endsWith("/tools.json")) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
