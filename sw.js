// Ruta: sw.js (raíz del repo)
// Service worker: guarda el portal y los juegos para abrirlos sin internet.
// - Archivos del repo: primero intenta la red (así siempre ves la versión nueva) y si no hay conexión
//   o tarda más de 3 s, usa la copia guardada.
// - SDK de Firebase (www.gstatic.com/firebasejs): se guarda la primera vez y se reutiliza.
// - Login, Firestore y demás llamadas a Google NO se tocan.
// Al agregar un juego: añádelo a «JUEGOS» de abajo. Para forzar que todos vuelvan a descargar todo, sube el número de VERSION.
const VERSION = 2;
const CACHE = "juegos-v" + VERSION;
const ESPERA_RED = 3000;

// Carpeta de cada juego y los archivos que tiene además de index.html
const JUEGOS = {
  ejemplo: ["juego.js"],
  doodle: ["juego.js"],
  piano: ["juego.js"],
  corredor: ["juego.js"],
  solitario: ["juego.js"],
  dulces: ["juego.js", "logica.js", "niveles.js"],
  gominolas: ["juego.js"],
  rompeladrillos: ["juego.js"],
  burbujas: ["juego.js"],
  globos: ["juego.js"],
  "pequenos-puzles": ["juego.js", "logica.js", "niveles.js"],
  pixelart: ["juego.js"],
  buscaminas: ["juego.js"],
  ajedrez: ["juego.js", "logica.js", "ia.js"],
};

const ARCHIVOS = [
  "./", "index.html", "juegos.js", "manifest.webmanifest",
  "iconos/icono-180.png", "iconos/icono-192.png", "iconos/icono-512.png",
  "compartido/estilos.css", "compartido/firebase.js", "compartido/jugador.js", "compartido/configs.js",
];
for (const [carpeta, extra] of Object.entries(JUEGOS)) {
  ARCHIVOS.push(carpeta + "/", carpeta + "/index.html", ...extra.map((f) => carpeta + "/" + f));
}

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Uno por uno: si un archivo no existe (o falla), los demás se guardan igual
      await Promise.all(
        ARCHIVOS.map(async (u) => {
          try {
            const r = await fetch(new Request(u, { cache: "reload" }));
            if (r.ok) await cache.put(u, r);
          } catch (e) {}
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("juegos-") && k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })()
  );
});

async function redLuegoCopia(req) {
  const cache = await caches.open(CACHE);
  const red = fetch(req).then((r) => {
    if (r && r.ok) cache.put(req, r.clone());
    return r;
  });
  try {
    return await Promise.race([
      red,
      new Promise((_, no) => setTimeout(() => no(new Error("lento")), ESPERA_RED)),
    ]);
  } catch (e) {
    const copia = await cache.match(req, { ignoreSearch: true });
    if (copia) return copia;
    return red; // sin copia: espera la red (o falla si no hay conexión)
  }
}

async function copiaLuegoRed(req) {
  const cache = await caches.open(CACHE);
  const copia = await cache.match(req);
  if (copia) return copia;
  const r = await fetch(req);
  if (r && (r.ok || r.type === "opaque")) cache.put(req, r.clone());
  return r;
}

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    ev.respondWith(redLuegoCopia(req));
  } else if (url.hostname === "www.gstatic.com" && url.pathname.startsWith("/firebasejs/")) {
    ev.respondWith(copiaLuegoRed(req));
  }
});
