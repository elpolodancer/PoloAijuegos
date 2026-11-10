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
// Última versión: 135 = «supermercado» con la computadora de mejoras sobre un escritorio, botones cuadrados tipo aplicación y ℹ️ Info en ☰ Pausa; 134 = «supermercado» en vista isométrica con calle alrededor, granja (huevo, leche, pollo, res y tocino), botón ⏩ de velocidad (x1 a x8), «🎮 Juegos» y «☰ Pausa» estándar, chip de monedas dorado y fondo de madera clara/oscura; 133 = «paperio» con los niveles de los estados jugables (progreso en orden, bonos que se abren al pasar el nivel), «🎮 Juegos» y «☰ Pausa» estándar, chip de monedas dorado; mapa.js ahora es paperio-mapa.js; 132 = «zuma» con el mapa de niveles estándar (México con agua, un estado de 10 niveles; compartido/mapa-niveles.js, etapas-mapa.js y geografia-mapa.js), botón «🎮 Juegos» azul oscuro y chip de monedas dorado; 131 = «rubik» ahora con cubos de 2×2 hasta 10×10; botón «🎮 Juegos» azul oscuro alargado y chip de monedas estándar en compartido/inmersivo.css (rubik y estacionamiento); 130 = se agregó «rubik» (Cubo de Rubik: 2×2, 3×3 y 4×4, con mezcla, deshacer, cronómetro y mejor tiempo por tamaño); 129 = «estacionamiento» con 22 600 niveles, mapa de México con agua y mundo, monedas y boosts (niveles, etapas, geografia y mapa); 128 = «zuma» con 100 formas de banda para el modo Infinito (formas-zuma.js; se abren al pasar la ronda 1 de cada nivel), fondo de madera clara/oscura con botón 🌙/☀️ y especificación de botones fijos en compartido/inmersivo.css; 127 = «bloques» con 30 niveles fijos (21 a 30: puntos y candados simples); 126 = imagen de tarjeta de «deslizante» (imagenes/deslizante.webp); 125 = «deslizante» pasa a la zona «Juegos» (terminado, primero de la lista) con botones cuadrados en el inicio y en la navegación; 124 = fondo de madera (clara y oscura) estándar en el modo inmersivo con botón 🌙/☀️ para alternarlas (compartido/fondo-madera.js e imagenes/fondomadera*.webp), estrenado en «deslizante»; 123 = menú de pausa estándar (compartido/menu-pausa.js + estilos en inmersivo.css) y «deslizante» con «☰ Pausa» (Continuar / Guardar progreso de este nivel y salir / Salir) y partidas guardadas por nivel; 122 = «deslizante» con estrellas (doradas y moradas) y monedas por nivel en los 3×3; 121 = «deslizante» con el modo libre como primer botón del menú (luego Continuar y Niveles) y botones ◀ ▶ para ir al nivel anterior/siguiente dentro de un nivel; 120 = «deslizante» con cronómetro en décimas, mejor tiempo por nivel y botones de nivel cuadrados con su mejor tiempo; 119 = «deslizante» con modo libre (tableros al azar sin fin; cada tamaño se abre al desbloquear su etapa); 118 = «deslizante» con los 280 niveles (hasta 30×30); 117 = «deslizante» con los niveles del 11×11 al 20×20; 116 = «deslizante» con los niveles del 5×5 al 10×10; 115 = «deslizante» con los 10 niveles del 4×4; 114 = «deslizante» con menú de inicio (Jugar / Niveles), niveles fijos que se desbloquean en orden (por ahora los 10 del 3×3) y botones «🎮 Juegos» y «☰ Menú principal»; todos los juegos pasan a «Juegos en desarrollo»; 113 = «imperio» con castillo en ruinas (piedras, vigas y andamio) y refugio en forma de cabaña de troncos, mapa de 98×98 (5 veces el área anterior), 75 minas de 500 (10 % oro, 20 % plata, 30 % cobre, 40 % carbón) bien separadas y sin animales hostiles a menos de 15 casillas de donde empiezas (las partidas viejas de 44×44 se siguen abriendo); 112 = «imperio» con refugio (aquí se crean las tropas), barra de 8 recursos, 250 monedas iniciales y README-imperio.md; 111 = «imperio»: el botón ☰ abre un menú de pausa (Continuar / Salir); 110 = «imperio» con botón «🎮 Juegos» y «☰ Menú principal» arriba a la izquierda (estándar en compartido/inmersivo.css), botones cuadrados con figuras de hombres y personaje dibujado como aldeano; 109 = «bloques» con pantalla de inicio «Polo Blocks», 3 dificultades en el infinito y niveles fijos (niveles-bloques.js); 108 = se agregó «bloques» (Bloques de madera, estilo Wood Block Puzzle); 107 = se agregó «fate» (Aldea y Mazmorra, RPG de pueblo y mazmorra); 106 = «defendercastillo»: se corrigió un paréntesis de más que impedía abrirlo y el service worker ahora guarda infinito-defendercastillo.js y mapas-desbloqueados-defendercastillo.js (los usa el juego) y ya no niveles-defendercastillo.js (no se usa); 105 = se agregó «flappybird» (Aleteo, estilo Flappy); 104 = se agregó «pasteles» (Pasteles en la banda); 103 = «defendercastillo» con meteoro de pago, 10 oleadas, cañón desde el nivel 2, jefes únicos más vencibles y su imagen de tarjeta; 102 = «defendercastillo» con 12 oleadas por mapa (antes 20 a 40) y dificultad recalibrada, y billete verde dibujado en lugar del emoji 💵; 101 = «defendercastillo» con billetes 💵 en lugar de monedas, el botón de dinero 25 % más grande y 👹 en lugar de la ola; 100 = «defendercastillo» con el texto de ayuda fuera del mapa (en vertical sobre el dock, en horizontal en un panel a la derecha) y, en celulares, sin la ayuda 5 s después de iniciar la primera oleada; 99 = «defendercastillo» con marcadores (monedas, vida, oleada) en botones 3D cuadrados pegados al mapa y emoji de monedas 💰 (el 🪙 no se veía en algunos equipos); 98 = «compartido/progreso.js»: un envío de puntos rechazado por el servidor ya no bloquea la cola; 97 = «jetpack» con puntos pendientes y récord sincronizado con la cuenta, «rompeladrillos» con el audio despertado en iPhone y sin avisos tardíos del perfil, «fusionanumeros» guarda el mejor puntaje al salir a medias; 96 = «zuma» con puntos pendientes y progreso (estrellas, récords, monedas, boosts) sincronizado con la cuenta; 95 = «solitario» y «rompeladrillos» con puntos pendientes y progreso/récords sincronizados con la cuenta (y ya no dependen de Firebase para abrir); 94 = «pradera», «restaurantes» y «rompecabezas» con puntos pendientes («pradera»: récord sincronizado; «restaurantes»: 6 partidas y récord sincronizados con la cuenta); 93 = «plantasvszombies» con puntos pendientes y progreso/récords sincronizados con la cuenta (gana el mayor de cada dato); 92 = «pequenos-puzles» y «piano» con puntos pendientes y progreso sincronizado con la cuenta, «minas» con puntos pendientes y partida compacta sincronizada (gana la copia cuyo progreso cambió más tarde), «paperio» con puntos pendientes y nivel/récord/monedas/boosts sincronizados, «pixelart» con puntos pendientes; 91 = «rana» con puntos pendientes y nivel desbloqueado sincronizado con la cuenta (gana el nivel más alto); 90 = «pantano» con puntos pendientes y progreso (monedas, mejoras, armas, niveles y récord) sincronizado con la cuenta; 89 = «guerrerodepuntos», «hoyo» e «imperio» con puntos pendientes (e «imperio» con partidas sincronizadas con la cuenta); 88 = «isla» con puntos pendientes y partida sincronizada con la cuenta (gana la isla más reciente); 87 = «dulces», «deslizante» y «doodle» con puntos pendientes y progreso/récords sincronizados con la cuenta; 86 = «estacionamiento» y «fichas» con puntos pendientes y progreso sincronizados con la cuenta; 85 = «cavar», «corredor» y «defendercastillo» con puntos pendientes y progreso sincronizados con la cuenta (y «corredor» ya no depende de Firebase para abrir); 84 = «burbujas», «buscaminas» y «cadenanumeros» con puntos pendientes y récords sincronizados con la cuenta (y «buscaminas» ya no depende de Firebase para abrir); 83 = «2048», «agario» y «ajedrez» con puntos pendientes y progreso sincronizados con la cuenta (y «ajedrez» ya no depende de Firebase para abrir); 82 = progreso y puntos pendientes que se sincronizan con la cuenta al haber internet (compartido/progreso.js y cola-puntos.js) en «botellascolores» y «pelota»; 81 = «defendercastillo» con 100 niveles de Michoacán (generador y calibración), 15 enemigos y 10 torres; 80 = «estacionamiento» conserva la vista al cambiar de tamaño y avisa de puntos solo si se guardaron, «fichas» con el aviso de puntos corregido, «ejemplo» con el blanco fuera del botón ⛶; 79 = «dulces» sin esperas al guardar puntos, sin trabarse si falla una animación y con el tablero completo en horizontal; 78 = «defendercastillo» sin confirm() y con marcadores en columna en horizontal, «deslizante» sin tapar el tablero con el ⛶, «doodle» con la pantalla de inicio desplazable; 77 = «cadenanumeros» con tablero más grande en horizontal y «corredor» con la pantalla de inicio desplazable; 76 = «botellascolores» con mesa ancha en horizontal y espacio libre para el ⛶, «burbujas» con pantallas que se desplazan; 75 = «2048» con diseño en horizontal y «agario» con pantallas que se desplazan y ← siempre visible; 74 = «solitario»: marcadores en 2 filas en celulares angostos y mesa más grande en horizontal; 73 = manifest con orientación libre ("any"); 72 = «cadenanumeros» con el marco en proporción 3:4; 71 = modo inmersivo en «solitario», «rompeladrillos», «rompecabezas», «imperio» y «ejemplo»; 70 = portal sin fondo ni borde en la cabecera y con botón de pantalla completa; 69 = modo inmersivo en «supermercado»; 68 = modo inmersivo en «restaurantes»; 67 = modo inmersivo en «plantasvszombies», «pradera» y «rana»; 66 = modo inmersivo en «piano», «pequenos-puzles» y «pixelart»; 65 = modo inmersivo en «pelota»; 64 = modo inmersivo en «paperio»; 63 = modo inmersivo en «isla», «minas», «jetpack» y «ladrillosnumerados»; 62 = modo inmersivo en «pantano»; 61 = modo inmersivo en «fusionanumeros», «globos», «gominolas», «guerrerodepuntos» y «hoyo»; 60 = modo inmersivo en «fichas»; 59 = modo inmersivo en «estacionamiento»; 58 = modo inmersivo en «corredor», «defendercastillo», «dulces», «deslizante» y «doodle»; 57 = modo inmersivo en «cavar»; 56 = modo inmersivo (pantalla completa, botones 3D, sin azul) en «2048», «agario», «ajedrez», «botellascolores» y «burbujas»; paleta neutra en estilos.css; 55 = modo inmersivo (compartido/inmersivo.css, botones 3D y pantalla completa en PC y Android) en «zuma»; 54 = «zuma»: si te quedas con pocas bolas la cadena sale rápido hasta mostrar tu color; 53 = «zuma» con 10 niveles fijos (generados y comprobados con bots) y más fáciles; 52 = se agregó «zuma» (nivel de prueba); 51 = «botellascolores» con los 3200 niveles de los 32 estados; 50 = «botellascolores» con 2200 niveles (22 estados); 49 = «botellascolores» con mapa (mundo → México → estado, 12 etapas con niveles y 20 por venir); 48 = «botellascolores» con 1200 niveles (12 mundos × 100) y progreso reiniciado; 47 = se agregó «fichas» (Fichas de frutas); 46 = «imperio» sin oleadas y con personaje, inventario y cajones; 45 = «imperio» con menú, partidas guardadas, biomas y animales; 44 = se agregó «imperio»; 43 = el solitario guarda también sus hojas de estilo (estilos-solitario.css, mesa-solitario.css), niveles y victoria; 42 = todos los archivos se llaman «tipo-carpeta» (index-ajedrez.html, juego-ajedrez.js…); 41 = se agregaron «2048» y «ajedrez».
const VERSION = 135;
const CACHE = "juegos-v" + VERSION;
const ESPERA_RED = 3000;

// Carpeta de cada juego y los archivos que tiene además de su página.
// Los que se llaman juego/logica/niveles/ia reciben el sufijo de la carpeta; cualquier otro (mapa.js, grande.js…) se usa tal cual.
const CON_SUFIJO = ["juego", "logica", "niveles", "ia", "victoria", "formas"];
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
  defendercastillo: ["juego.js", "logica.js", "generador-defendercastillo.js", "calibracion-defendercastillo.js", "infinito-defendercastillo.js", "mapas-desbloqueados-defendercastillo.js"], // los cuatro últimos llevan su nombre completo
  guerrerodepuntos: ["juego.js", "niveles.js"],
  agario: ["juego.js"],
  pantano: ["juego.js"],
  plantasvszombies: ["juego.js", "niveles.js"],
  botellascolores: ["juego.js", "logica.js", "niveles.js", "mapa.js"],
  ladrillosnumerados: ["juego.js"],
  estacionamiento: ["juego.js", "niveles.js", "etapas-estacionamiento.js", "geografia-estacionamiento.js", "mapa-estacionamiento.js"], // los tres últimos llevan su nombre completo
  fusionanumeros: ["juego.js"],
  cadenanumeros: ["juego.js"],
  hoyo: ["juego.js"],
  pelota: ["juego.js"],
  rana: ["juego.js"],
  deslizante: ["juego.js", "niveles.js"],
  isla: ["juego.js"],
  minas: ["juego.js", "logica.js", "grande.js"],
  cavar: ["juego.js", "logica.js"],
  jetpack: ["juego.js"],
  "2048": ["juego.js"],
  imperio: ["juego.js"],
  fichas: ["juego.js", "logica.js", "piezas-fichas.js"], // piezas-fichas.js lleva su nombre completo
  zuma: ["juego.js", "logica.js", "niveles.js", "formas.js"],
  pasteles: ["juego.js"],
  flappybird: ["juego.js"],
  fate: ["juego.js", "datos-fate.js", "mazmorra-fate.js"], // los dos últimos llevan su nombre completo
  bloques: ["juego.js", "logica.js", "niveles.js"],
  rubik: ["juego.js", "logica.js"],
  paperio: ["juego.js", "niveles.js", "paperio-mapa.js", "michoacan.js", "colima.js", "bajacaliforniasur.js", "campeche.js", "etapas.js"],
};

const ARCHIVOS = [
  "./", "index.html", "juegos.js", "manifest.webmanifest",
  "iconos/icono-180.png", "iconos/icono-192.png", "iconos/icono-512.png",
  "compartido/estilos.css", "compartido/inmersivo.css", "imagenes/agario.webp", "imagenes/gominolas.webp", "imagenes/restaurante.webp", "imagenes/rompecabezas.webp", "imagenes/pradera.webp", "imagenes/ajedrez.webp", "imagenes/solitario.webp", "imagenes/botellascolores.webp", "imagenes/buscaminas.webp", "imagenes/corredor.webp", "imagenes/pantano.webp", "imagenes/piano.webp", "imagenes/saltarin.webp", "imagenes/dulces.webp", "imagenes/defendercastillo.webp", "imagenes/deslizante.webp", "compartido/firebase.js", "compartido/jugador.js", "compartido/configs.js", "compartido/pantalla-completa.js", "compartido/progreso.js", "compartido/cola-puntos.js", "compartido/menu-pausa.js", "compartido/fondo-madera.js", "compartido/mapa-niveles.js", "compartido/etapas-mapa.js", "compartido/geografia-mapa.js", "imagenes/fondomaderaclara.webp", "imagenes/fondomaderaoscura.webp",
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
