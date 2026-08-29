/* 見逃さん Service Worker
   - 同じ場所にある HTML / campaigns.js は「ネットワーク優先」（最新を取りに行き、失敗したらキャッシュ）
   - React・フォントなどの外部ファイルは「キャッシュ優先」（初回オンライン後はオフラインでも動く）
   キャッシュを作り直したいときは下の CACHE の数字を上げてください。 */
const CACHE = "minogasan-cache-v2";
const CORE = [
  "./index.html",
  "./campaigns.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const freshFirst = sameOrigin && /\.(html|js)$/.test(url.pathname) && !url.pathname.endsWith("sw.js");

  if (freshFirst) {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
  }
});
