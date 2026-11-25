// Ruta: agario/sw-agario.js
// Service worker SOLO de «Agario» (su alcance es esta carpeta). Es independiente de sw.js, el del portal:
// - Guarda únicamente lo que este juego necesita (su página, sus niveles (todavía vacíos), los módulos de compartido/ que usa, la madera, las banderas y juegos.js).
//   NO descarga ninguno de los demás juegos del portal.
// - Misma estrategia que sw.js: primero la red (así siempre ves la versión nueva) y, sin conexión o si tarda más de 3 s, la copia guardada.
// - Su caché se llama «app-agario-vN» (NO empieza con «juegos-», para que sw.js del portal no la borre al actualizarse).
// CUÁNDO SUBIR VERSION: solo si agregas o quitas archivos de la lista de abajo (los archivos que ya están se actualizan solos con la red).
const VERSION = 1;
const CACHE = "app-agario-v" + VERSION;
const ESPERA_RED = 3000;

// Las rutas son relativas a ESTE archivo (la carpeta agario/). «../» es la raíz del repo.
const ARCHIVOS = [
  "./", "index-agario.html", "juego-agario.js", "niveles-agario.js", "manifest-agario.webmanifest",
  "icono-180-agario.png", "icono-192-agario.png", "icono-512-agario.png", "icono-maskable-512-agario.png",
  "../juegos.js", // jugador.js lo importa (lista EN_DESARROLLO)
  "../compartido/estilos.css", "../compartido/inmersivo.css",
  "../compartido/pantalla-completa.js", "../compartido/fondo-madera.js",
  "../compartido/cola-puntos.js", "../compartido/progreso.js", "../compartido/jugador.js", "../compartido/firebase.js", "../compartido/configs.js",
  "../compartido/menu-pausa.js", "../compartido/almacen.js", "../compartido/mapa-niveles.js", "../compartido/etapas-mapa.js", "../compartido/geografia-mapa.js",
  "../compartido/contornos-paises.js", "../compartido/posiciones-paises.js",
  "../imagenes/fondomaderaclara.webp", "../imagenes/fondomaderaoscura.webp",
];
// Banderas del mapa (ISO en minúsculas). Se guardan «lo mejor posible»: si alguna falla no se cancela la instalación (se guardan al verlas).
const BANDERAS = "MX GT HN SV NI CR PA CU DO HT CO VE EC PE BR BO PY CL AR UY BZ JM GY SR US UZ LI GM ES UG TJ LY IL MM NO AD BI IT EE TN RW BS NZ DM BN NA FJ KR UA SM MH CA AF PG CF FR MR RS LK HR MC OM SS BA TH VN FI AM BD VA MV LT RO GD MG PL SN BJ TZ CY SE BH MA KN PT ME CV AZ SC AO SB BG CG ZM LC AG GE PK KH TR TV GH DK WS SZ ER SG VU DE AU AT BW AL LV YE BF ST CZ NP SO BB MK CH GA AE KI IQ PH NE SL PS IN MZ KZ DZ IR IE TM SA LA MT VC BY ZA KM KE NR GB ML SY CI KW LU DJ NL MN ET TD CD GN LB MY ZW TL BE GQ SD TT GR PW BT RU ID LR CM SI TG MU KP SK LS QA IS MD NG JO FM JP HU MW TO GW EG KG CN".split(" ").map((c) => "../imagenes-banderas/" + c.toLowerCase() + ".svg");

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const noExisten = [];
      let sinRed = 0;
      const guardar = async (u, esencial) => {
        try {
          const r = await fetch(new Request(u, { cache: "reload" }));
          if (r.ok) await cache.put(u, r);
          else if (esencial) noExisten.push(u + " (" + r.status + ")");
        } catch (e) { if (esencial) sinRed++; }
      };
      // De 8 en 8 (cientos de descargas a la vez saturan el celular y GitHub Pages)
      for (let i = 0; i < ARCHIVOS.length; i += 8) await Promise.all(ARCHIVOS.slice(i, i + 8).map((u) => guardar(u, true)));
      if (noExisten.length) console.warn("sw-agario.js: archivos que no se pudieron guardar:", noExisten);
      // Si falló la red, se cancela: el service worker anterior (con su copia completa) sigue activo y se reintenta después
      if (sinRed > 0) throw new Error("sw-agario.js: la red falló en " + sinRed + " archivos; se reintentará más tarde");
      for (let i = 0; i < BANDERAS.length; i += 8) await Promise.all(BANDERAS.slice(i, i + 8).map((u) => guardar(u, false)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    (async () => {
      // Solo borra copias VIEJAS DE ESTE JUEGO; nunca toca las del portal (juegos-vN)
      for (const k of await caches.keys()) if (k.startsWith("app-agario-") && k !== CACHE) await caches.delete(k);
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
  red.catch(() => {});
  try {
    const r = await Promise.race([
      red,
      new Promise((_, no) => setTimeout(() => no(new Error("lento")), ESPERA_RED)),
    ]);
    if (r && r.status >= 500) { // servidor caído: mejor la copia guardada que una página de error
      const copia = await cache.match(req, { ignoreSearch: true });
      if (copia) return copia;
    }
    return r;
  } catch (e) {
    const copia = await cache.match(req, { ignoreSearch: true }); // ignoreSearch: la app se abre con «?app=1»
    if (copia) return copia;
    return red;
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
    ev.respondWith(copiaLuegoRed(req)); // SDK de Firebase: se guarda la primera vez
  }
});
