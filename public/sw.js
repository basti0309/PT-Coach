// Minimaler Service Worker: macht die App installierbar und zeigt offline einen Hinweis.
// Bewusst kein Caching von Seiten mit persönlichen Daten.
const OFFLINE_HTML = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>Keine Verbindung</h1><p>PT-Coach braucht eine Internetverbindung. Bitte versuche es gleich noch einmal.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});
