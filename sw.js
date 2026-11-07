// Ruta: sw.js (raíz del repo)
// Service worker: guarda el portal y los juegos para abrirlos sin internet.
// - Archivos del repo: primero intenta la red (así siempre ves la versión nueva) y si no hay conexión
//   o tarda más de 3 s, usa la copia guardada.
// - SDK de Firebase (www.gstatic.com/firebasejs): se guarda la primera vez y se reutiliza.
// - Login, Firestore y demás llamadas a Google NO se tocan.
// Nombres: la página de cada juego es «index-<carpeta>.html» y los archivos juego, logica, niveles e ia se llaman
// «juego-<carpeta>.js», etc. Abajo se escriben con el nombre corto ("juego.js") y aquí se completan solos.
// Al agregar un juego: añádelo a «JUEGOS» de abajo (carpeta: [archivos extra además de la página]) y sube VERSION.
// Si el juego tiene imagen de tarjeta, agrégala a «ARCHIVOS» (imagenes/nombre.webp).
// Subir VERSION fuerza a todos a descargar todo de nuevo y borra las copias viejas (juegos-vN).
// Última versión: 49 = «botellascolores» con mapa (mundo → México → estado, 12 etapas con niveles y 20 por venir); 48 = «botellascolores» con 1200 niveles (12 mundos × 100) y progreso reiniciado; 47 = se agregó «fichas» (Fichas de frutas); 46 = «imperio» sin oleadas y con personaje, inventario y cajones; 45 = «imperio» con menú, partidas guardadas, biomas y animales; 44 = se agregó «imperio»; 43 = el solitario guarda también sus hojas de estilo (estilos-solitario.css, mesa-solitario.css), niveles y victoria; 42 = todos los archivos se llaman «tipo-carpeta» (index-ajedrez.html, juego-ajedrez.js…); 41 = se agregaron «2048» y «ajedrez».
const VERSION = 49;
const CACHE = "juegos-v" + VERSION;
const ESPERA_RED = 3000;

// Carpeta de cada juego y los archivos que tiene además de su página.
// Los que se llaman juego/logica/niveles/ia reciben el sufijo de la carpeta; cualquier otro (mapa.js, grande.js…) se usa tal cual.
const CON_SUFIJO = ["juego", "logica", "niveles", "ia", "victoria"];
const nombreArchivo = (carpeta, f) => {
  const base = f.replace(/\.js$/, "");
  return CON_SUFIJO.includes(base) ? base + "-" + carpeta + ".js" : f;
};
const JUEGOS = {
  ejemplo: ["juego.js"],
  doodle: ["juego.js"],
  piano: ["juego.js"],
  corredor: ["juego.js"],
  solitario: ["juego.js", "niveles.js", "victoria.js", "estilos-solitario.css", "mesa-solitario.css"], // los .css llevan su nombre completo
  dulces: ["juego.js", "logica.js", "niveles.js"],
  gominolas: ["juego.js"],
  rompeladrillos: ["juego.js"],
  burbujas: ["juego.js"],
  globos: ["juego.js"],
  "pequenos-puzles": ["juego.js", "logica.js", "niveles.js"],
  pixelart: ["juego.js"],
  rompecabezas: ["juego.js"],
  supermercado: ["juego.js"],
  pradera: ["juego.js", "logica.js", "niveles.js"],
  buscaminas: ["juego.js"],
  restaurantes: ["juego.js"],
  ajedrez: ["juego.js", "logica.js", "ia.js"],
  defendercastillo: ["juego.js", "logica.js", "niveles.js"],
  guerrerodepuntos: ["juego.js", "niveles.js"],
  agario: ["juego.js"],
  pantano: ["juego.js"],
  plantasvszombies: ["juego.js", "niveles.js"],
  botellascolores: ["juego.js", "logica.js", "niveles.js", "mapa.js"],
  ladrillosnumerados: ["juego.js"],
  estacionamiento: ["juego.js"],
  fusionanumeros: ["juego.js"],
  cadenanumeros: ["juego.js"],
  hoyo: ["juego.js"],
  pelota: ["juego.js"],
  rana: ["juego.js"],
  deslizante: ["juego.js"],
  isla: ["juego.js"],
  minas: ["juego.js", "logica.js", "grande.js"],
  cavar: ["juego.js", "logica.js"],
  jetpack: ["juego.js"],
  "2048": ["juego.js"],
  imperio: ["juego.js"],
  fichas: ["juego.js", "logica.js", "piezas-fichas.js"], // piezas-fichas.js lleva su nombre completo
  paperio: ["juego.js", "niveles.js", "mapa.js", "michoacan.js", "colima.js", "bajacaliforniasur.js", "campeche.js", "etapas.js"],
};

const ARCHIVOS = [
  "./", "index.html", "juegos.js", "manifest.webmanifest",
  "iconos/icono-180.png", "iconos/icono-192.png", "iconos/icono-512.png",
  "compartido/estilos.css", "imagenes/agario.webp", "imagenes/gominolas.webp", "imagenes/restaurante.webp", "imagenes/rompecabezas.webp", "imagenes/pradera.webp", "imagenes/ajedrez.webp", "imagenes/solitario.webp", "imagenes/botellascolores.webp", "imagenes/buscaminas.webp", "imagenes/corredor.webp", "imagenes/pantano.webp", "imagenes/piano.webp", "imagenes/saltarin.webp", "imagenes/dulces.webp", "compartido/firebase.js", "compartido/jugador.js", "compartido/configs.js", "compartido/pantalla-completa.js",
];
for (const [carpeta, extra] of Object.entries(JUEGOS)) {
  ARCHIVOS.push(carpeta + "/", carpeta + "/index-" + carpeta + ".html", ...extra.map((f) => carpeta + "/" + nombreArchivo(carpeta, f)));
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
    if (r && r.ok) cache.put(req, r.clone()).catch(() => {}); // si el almacenamiento está lleno, no rompe
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
  if (r && (r.ok || r.type === "opaque")) cache.put(req, r.clone()).catch(() => {});
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
