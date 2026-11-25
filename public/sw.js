const CACHE_PREFIX = "rose-care-shell-";
const CACHE = CACHE_PREFIX + "v2";
const SHELL = "/offline-demo";
const PUBLIC_FILES = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];
const staticAsset =
  /^\/_next\/static\/(?:chunks|media)\/[a-z0-9._/-]+\.(?:js|css|woff2?|png|svg)$/i;

async function fetchPublic(path, shell = false) {
  const response = await fetch(path, {
    credentials: "omit",
    redirect: "error",
    cache: "reload",
  });
  const cacheControl = response.headers.get("Cache-Control") ?? "";
  const vary = response.headers.get("Vary") ?? "";
  if (
    !response.ok ||
    response.redirected ||
    response.headers.has("Set-Cookie") ||
    /\b(?:private|no-store)\b/i.test(cacheControl) ||
    /(?:^|,)\s*(?:cookie|authorization|\*)\s*(?:,|$)/i.test(vary)
  ) {
    throw new Error("Response is not eligible for the public demo cache");
  }
  if (
    shell &&
    (response.headers.get("X-Rose-Offline-Shell") !== "public-demo-v2" ||
      !response.headers.get("Content-Type")?.startsWith("text/html"))
  ) {
    throw new Error("Offline shell did not opt in to caching");
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const page = await fetchPublic(SHELL, true);
        const html = await page.clone().text();
        const paths = [
          ...new Set(
            [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
              .map((entry) => entry[1])
              .filter((url) => staticAsset.test(url)),
          ),
        ];
        if (!paths.some((path) => path.endsWith(".js")))
          throw new Error("Offline demo scripts were not found");
        const assets = await Promise.all(
          [...PUBLIC_FILES, ...paths].map(async (path) => [
            path,
            await fetchPublic(path),
          ]),
        );
        const cache = await caches.open(CACHE);
        await Promise.all(
          [[SHELL, page], ...assets].map(([path, response]) =>
            cache.put(path, response),
          ),
        );
      } catch {
        // Retire the old worker even when no content is safe to precache.
        await caches.delete(CACHE);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.search ||
    request.headers.has("Authorization") ||
    request.headers.has("Cookie") ||
    request.headers.has("Range")
  )
    return;
  if (request.mode === "navigate" && url.pathname === "/") {
    // Always pass through HTTP responses, including auth failures. Only network errors get the fixture shell.
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await (await caches.open(CACHE)).match(SHELL)) ?? Response.error(),
      ),
    );
  } else if (
    staticAsset.test(url.pathname) ||
    PUBLIC_FILES.includes(url.pathname)
  ) {
    event.respondWith(
      (async () =>
        (await (await caches.open(CACHE)).match(url.pathname)) ??
        fetch(request))(),
    );
  }
  // No runtime writes. Live documents, API responses and RSC requests are never cached.
});
