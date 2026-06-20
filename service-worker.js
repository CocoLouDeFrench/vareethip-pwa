// Vareethip Thai Noodle Bar — Service Worker
// Zweck: macht die Seite als PWA installierbar (Voraussetzung für "Zum
// Home-Bildschirm hinzufügen" auf Android/Chrome). Es wird bewusst NICHT
// aggressiv gecacht, damit Speisekarte, Preise, Öffnungsstatus und
// Zubereitungszeit immer aktuell bleiben.

const CACHE_NAME = "vareethip-shell-v1";

// Nur das App-Shell-Minimum cachen (Icons), damit die App auch offline
// startet und ihr Icon/Branding zeigt — der eigentliche Inhalt kommt
// immer frisch vom Netz.
const PRECACHE_ASSETS = [
  "logo-192.png",
  "logo-512.png",
  "manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first: immer versuchen, frisch vom Server zu laden.
// Nur falls komplett offline, auf den Cache zurückfallen (z.B. Icons).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then((cached) => cached || Promise.reject("offline"))
    )
  );
});
