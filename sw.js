/* 우리집 유치원 · 서비스 워커 — 오프라인 지원 (앱 셸 캐시)
   버전을 올리면 이전 캐시를 비우고 새 버전을 받습니다. */
const V = "yuchiwon-v1";
const CORE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;               // 저장/동기화(POST 등)는 그대로 통과
  const url = new URL(req.url);

  // HTML 화면 이동: 네트워크 우선 → 최신 유지, 오프라인이면 캐시된 앱으로
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put("./index.html", cp)); return r; })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // 그 외 자원: 캐시 우선 → 없으면 네트워크(같은 출처만 캐시에 저장)
  e.respondWith(
    caches.match(req).then((c) =>
      c || fetch(req).then((r) => {
        if (r && r.ok && url.origin === location.origin) {
          const cp = r.clone(); caches.open(V).then((cc) => cc.put(req, cp));
        }
        return r;
      }).catch(() => c)
    )
  );
});
