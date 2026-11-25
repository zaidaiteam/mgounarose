/* Replacement for the previous origin-wide V0.2 worker. No fetch interception. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("rose-care-shell-")) await caches.delete(key);
      await self.registration.unregister();
    })(),
  );
});
