// Ruta: hoyo/juego.js
// Estilo Hole.io en vista isométrica, con 3 mapas: «ciudad», «playa» (islas) y «campo».
// El hoyo tiene 15 niveles de tamaño; los objetos también (solo traga los de su nivel o menores). Ver «Niveles de tamaño» abajo.
// Ajustes rápidos aquí arriba:
const DURACION = 120;      // segundos por partida
let MUNDO = 3000;          // tamaño del mapa (px); cada mapa puede traer el suyo con «mundo»
const NUM_BOTS = 7;         // bots por defecto (cada mapa puede traer los suyos con «bots»)
const R_INICIAL = 22;
const OBJETOS = 620;       // objetos por defecto (cada mapa puede traer los suyos con «objetos»)
let totalObjetos = OBJETOS, duracionMapa = DURACION;
const PISO_DESPRENDE = 0.35; // probabilidad de que, al tragar un piso, el piso de arriba se desprenda y quede tirado como bloque
const R_PEQUENO = 15;      // los objetos con radio hasta este valor cuentan como «pequeños» (los que come el hoyo inicial)
const PEQUENOS = 0.4;      // cuántos objetos pequeños quedan respecto a antes (0.4 = 60 % menos; 1 = como antes)

// ----- Niveles de tamaño del hoyo -----
// El hoyo tiene NIVELES tamaños fijos. Sube de nivel al juntar puntos y solo puede tragar objetos de su nivel o menores.
// Cada objeto tiene un nivel de tamaño (o.t), que sale de su radio (en edificios, el de un piso).
const NIVELES = 15;
const PUNTOS_TOTALES = 1000000;  // el millón que se divide en los niveles (define los umbrales de abajo)
// Puntos que realmente hay repartidos en los objetos del mapa. Con 1 000 000 (= PUNTOS_TOTALES) para llegar al nivel 15
// habría que comerse el 93 % de todo el mapa, algo imposible en una partida (en pruebas, ni el mejor jugador simulado
// pasaba del nivel 2-3). Con más puntos en el mapa se sube de nivel comiendo solo una parte; baja o sube este número para ajustar la dificultad.
const PUNTOS_EN_MAPA = 12000000;
const PUNTOS_NIVEL_2 = 10;       // con solo 10 puntos se llega al nivel 2
const CRECE_NIVEL = 1.15;        // cada nivel el radio del hoyo es 15 % mayor (nivel 15 = radio ~156)
const DIF_DEVORAR = 2;           // un hoyo se come a otro si tiene 2 niveles o más que él
const R_NIVEL = [0];             // radio del hoyo en cada nivel (R_NIVEL[1] = R_INICIAL)
for (let n = 1; n <= NIVELES; n++) R_NIVEL[n] = R_INICIAL * CRECE_NIVEL ** (n - 1);
// Puntos con los que empieza cada nivel: nivel 1 = 0, nivel 2 = 10 y del 2 al 15 el millón se divide en partes iguales
const UMBRAL = [0, 0];
for (let n = 2; n <= NIVELES; n++) UMBRAL[n] = Math.round(PUNTOS_NIVEL_2 + ((n - 2) * (PUNTOS_TOTALES - PUNTOS_NIVEL_2)) / (NIVELES - 1));
// Nivel de tamaño de un objeto: el primer nivel cuyo hoyo lo abarca (radio del objeto < 0.8 × radio del hoyo)
function tierDe(rc) {
  for (let n = 1; n <= NIVELES; n++) if (rc < R_NIVEL[n] * 0.8) return n;
  return NIVELES;
}
let VALOR = []; // puntos que da un objeto (o un piso) de cada nivel; se calcula en cargarMapa para que el mapa sume PUNTOS_TOTALES
const fmt = (n) => Math.floor(n).toLocaleString("es-MX");
let reloj = 0;
const pesoTipo = (t) => t.w * (t.r <= R_PEQUENO ? PEQUENOS : 1);

// ----- Ajustes de los bots (más tontos) -----
const BOT_COMER = 1;              // cuántos puntos ganan los bots al comer, respecto a ti (1 = igual; menos = suben de nivel más lento)
const BOT_PROB_PERSEGUIR = 0.2;   // probabilidad de que decidan ir tras un hoyo más chico (tú incluido) cuando lo ven (0.2 = 80 % menos)
const BOT_PERSECUCION_MAX = 2;    // segundos máximos que persiguen a un hoyo (antes: sin límite)
const BOT_ENFRIAR = 6;            // segundos que descansan sin perseguir a nadie después de una persecución
const BOT_VISION_HOYOS = 250;     // a qué distancia notan a un hoyo más chico (antes: 450)
const BOT_VISION_OBJETOS = 400;   // a qué distancia ven objetos para comer (antes: todo el mapa)
const BOT_HUIR_DIST = 200;        // a qué distancia notan el peligro de un hoyo más grande (antes: 380)
const BOT_PROB_HUIR = 0.5;        // probabilidad de que huyan cuando notan el peligro
const BOT_PROB_VAGAR = 0.3;       // probabilidad de que deambulen sin rumbo en vez de buscar comida

// Velocidad de los hoyos: entre más grande, más rápido (hasta V_MAX)
const V_BASE = 190, V_EXP = 0.25, V_MAX = 340;

const $ = (id) => document.getElementById(id);
const cv = $("c"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1;
function ajustar() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
}
addEventListener("resize", ajustar);
ajustar();

const rnd = (a, b) => a + Math.random() * (b - a);

// ----- Vista isométrica -----
// Mundo (x, y) -> pantalla: gira 45° y aplasta a la mitad. Los objetos se dibujan «de pie» con recto().
const K = Math.SQRT1_2;
const proj = (x, y) => [(x - y) * K, (x + y) * K / 2];
function recto(x, y, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(K, -K, 2 * K, 2 * K, 0, 0); // inversa de la isométrica: vuelve a ejes de pantalla
  fn();
  ctx.restore();
}

// ----- Mapas -----
const CALLE = 500, ANCHO_CALLE = 120;
const enCalle = (x, y) => Math.abs(((x + CALLE / 2) % CALLE) - CALLE / 2) < ANCHO_CALLE / 2 || Math.abs(((y + CALLE / 2) % CALLE) - CALLE / 2) < ANCHO_CALLE / 2;
let islas = [];
const CAMPO_CALLE = 600, CAMPO_ANCHO = 90;
const CAMPOS = ["#6aa84f", "#8fbc5a", "#c9b458", "#7a9a3e", "#a67c52", "#9acd62"];
const enCalleCampo = (x, y) => Math.abs(((x + CAMPO_CALLE / 2) % CAMPO_CALLE) - CAMPO_CALLE / 2) < CAMPO_ANCHO / 2 || Math.abs(((y + CAMPO_CALLE / 2) % CAMPO_CALLE) - CAMPO_CALLE / 2) < CAMPO_ANCHO / 2;

// Isla al azar, más probable entre más grande es (así hay la misma densidad de objetos en todas)
function islaAlAzar() {
  for (let i = 0; i < 20; i++) { const s = islas[Math.floor(Math.random() * islas.length)]; if (Math.random() < (s.R / 360) ** 2) return s; }
  return islas[0];
}

// Edificios altos para los niveles 9 a 15: [radio, pisos, alto de piso, pf, peso]. Se comen piso por piso (el piso mide r × pf)
const TORRES = [[70, 5, 26, 0.72, 0.28], [80, 6, 28, 0.72, 0.19], [92, 7, 30, 0.72, 0.14], [104, 8, 32, 0.72, 0.1], [118, 9, 34, 0.72, 0.07], [134, 10, 36, 0.72, 0.05], [152, 12, 40, 0.75, 0.035]];
const torres = (col) => TORRES.map(([r, pisos, fh, pf, w]) => ({ est: true, r, pisos, fh, pf, col, w }));

// Cada mapa debe traer objetos de los 15 niveles de tamaño (el comentario de cada grupo dice el nivel).
// Los pesos (w) bajan con el nivel: muchos objetos chicos y pocos enormes.
const MAPAS = {
  ciudad: {
    mundo: 7500, objetos: 3875, bots: 12, duracion: 300, // 15×15 cuadras de 500 px
    bg: "#13182b",
    tipos: [
      // nivel 1
      { e: "🌷", r: 7, w: 30 }, { e: "🧍", r: 7, w: 14 }, { e: "🐈", r: 9, w: 8 },
      { e: "🚧", r: 10, w: 20, calle: true }, { e: "🪑", r: 12, w: 12 }, { e: "🛢️", r: 13, w: 14 },
      { caja: true, r: 11, w: 12, col: "#c98b4a", alt: 0.85 },
      // nivel 2
      { e: "🛵", r: 19, w: 9, calle: true }, { e: "🚲", r: 18, w: 5, calle: true },
      // nivel 3
      { e: "🚗", r: 22, w: 7, calle: true }, { e: "🌲", r: 21, w: 4.5 },
      // nivel 4
      { e: "⛲", r: 25, w: 5 }, { caja: true, r: 26, w: 4.4, col: "#2f7fd1", alt: 0.7 },
      // nivel 5
      { e: "🌳", r: 28, w: 4.2 }, { e: "🏠", r: 30, w: 3.5 },
      // nivel 6
      { e: "🚚", r: 34, w: 3.6, calle: true }, { est: true, r: 48, w: 1.35, pisos: 2, fh: 26, pf: 0.66, col: "#d9534f" },
      // nivel 7
      { e: "🚌", r: 40, w: 3.1, calle: true }, { est: true, r: 62, w: 0.52, pisos: 4, fh: 28, pf: 0.6, col: "#c62f3a" },
      // nivel 8
      { e: "🏥", r: 44, w: 2.6 }, { est: true, r: 78, w: 0.29, pisos: 6, fh: 28, pf: 0.55, col: "#4b6cb7" },
      // niveles 9 a 15
      { e: "⛪", r: 50, w: 2.1 }, { e: "🏭", r: 58, w: 1.7 }, { e: "🏟️", r: 66, w: 1.4 }, { e: "🏗️", r: 75, w: 1.1 },
      { e: "🏰", r: 88, w: 0.95 }, { e: "🗼", r: 100, w: 0.8 }, { e: "🗽", r: 112, w: 0.65 },
      ...torres("#6f7d99"),
    ],
    preparar() {},
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        let x, y;
        if (t.calle) {
          const v = Math.random() < 0.5, c = Math.floor(rnd(0, MUNDO / CALLE)) * CALLE;
          x = v ? Math.max(60, c + rnd(-40, 40)) : rnd(100, MUNDO - 100); // max(60, …): la calle del borde (c = 0) no deja objetos fuera del mapa
          y = v ? rnd(100, MUNDO - 100) : Math.max(60, c + rnd(-40, 40));
        } else {
          x = rnd(60, MUNDO - 60); y = rnd(60, MUNDO - 60);
          if (enCalle(x, y) || enCalle(x + t.r, y + t.r) || enCalle(x - t.r, y - t.r)) continue;
        }
        return [x, y];
      }
      return null;
    },
    spawn: () => [rnd(200, MUNDO - 200), rnd(200, MUNDO - 200)],
    factor: () => 1,
    suelo() {
      ctx.fillStyle = "#5f9e4a"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      ctx.fillStyle = "#454b5c";
      for (let k = 0; k * CALLE <= MUNDO; k++) {
        ctx.fillRect(k * CALLE - ANCHO_CALLE / 2, 0, ANCHO_CALLE, MUNDO);
        ctx.fillRect(0, k * CALLE - ANCHO_CALLE / 2, MUNDO, ANCHO_CALLE);
      }
      ctx.strokeStyle = "rgba(255,224,102,.55)"; ctx.lineWidth = 3; ctx.setLineDash([24, 20]);
      ctx.beginPath();
      for (let k = 0; k * CALLE <= MUNDO; k++) { ctx.moveTo(k * CALLE, 0); ctx.lineTo(k * CALLE, MUNDO); ctx.moveTo(0, k * CALLE); ctx.lineTo(MUNDO, k * CALLE); }
      ctx.stroke(); ctx.setLineDash([]);
    },
  },
  playa: {
    mundo: 7500, objetos: 3875, bots: 12, duracion: 300, // igual de grande que la ciudad (15×15 cuadras de 500 px)
    bg: "#0c4a63",
    tipos: [
      // nivel 1
      { e: "🐚", r: 7, w: 30 }, { e: "🥥", r: 7, w: 20 }, { e: "🦀", r: 8, w: 14 }, { e: "🏐", r: 10, w: 14 },
      { e: "⛱️", r: 14, w: 16 }, { caja: true, r: 11, w: 12, col: "#a0693a", alt: 0.85 },
      // nivel 2
      { e: "🦩", r: 19, w: 14 },
      // nivel 3
      { e: "🛶", r: 22, w: 11.5, agua: true },
      // nivel 4
      { e: "🐢", r: 24, w: 9.4 },
      // nivel 5
      { e: "🌴", r: 28, w: 4.2 }, { est: true, r: 46, w: 1.7, pisos: 2, fh: 24, pf: 0.66, col: "#e8c98a" },
      // nivel 6
      { e: "🚤", r: 34, w: 3.8, agua: true }, { e: "⛺", r: 33, w: 2.5 },
      // nivel 7
      { e: "⛵", r: 40, w: 3.1, agua: true }, { est: true, r: 62, w: 0.52, pisos: 4, fh: 28, pf: 0.6, col: "#f0b27a" },
      // nivel 8
      { e: "🚢", r: 44, w: 2.6, agua: true }, { est: true, r: 78, w: 0.29, pisos: 6, fh: 28, pf: 0.55, col: "#2aa6c9" },
      // niveles 9 a 15
      { e: "🗿", r: 50, w: 2.1 }, { e: "⛴️", r: 58, w: 1.7, agua: true }, { e: "🎡", r: 66, w: 1.4 }, { e: "🌋", r: 75, w: 1.1 },
      { e: "🛳️", r: 88, w: 0.95, agua: true }, { e: "🏯", r: 100, w: 0.8 }, { e: "🗽", r: 112, w: 0.65 },
      ...torres("#d98c5f"),
    ],
    preparar() {
      islas = [];
      for (let i = 0; i < 8000 && islas.length < 40; i++) {
        const R = rnd(190, 360), x = rnd(R + 80, MUNDO - R - 80), y = rnd(R + 80, MUNDO - R - 80);
        if (islas.every((s) => Math.hypot(s.x - x, s.y - y) > s.R + R + 140)) islas.push({ x, y, R });
      }
    },
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        if (t.agua) {
          const x = rnd(100, MUNDO - 100), y = rnd(100, MUNDO - 100);
          if (islas.every((s) => Math.hypot(s.x - x, s.y - y) > s.R + 50 + t.r)) return [x, y];
        } else {
          const s = islaAlAzar(), m = s.R - t.r - 10;
          if (m < 10) continue;
          const a = rnd(0, 6.2832), d = Math.sqrt(Math.random()) * m;
          return [s.x + Math.cos(a) * d, s.y + Math.sin(a) * d];
        }
      }
      return null;
    },
    spawn() { const s = islas[Math.floor(Math.random() * islas.length)], a = rnd(0, 6.2832), d = rnd(0, s.R * 0.5); return [s.x + Math.cos(a) * d, s.y + Math.sin(a) * d]; },
    factor: () => 1, // misma velocidad en el agua que en la isla (antes: 0.45 en el agua)
    suelo() {
      ctx.fillStyle = "#1f9cc4"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      for (const [dr, col] of [[70, "#3fc0d8"], [38, "#7fe0e6"], [0, "#f0d78c"]]) {
        ctx.fillStyle = col;
        for (const s of islas) { ctx.beginPath(); ctx.arc(s.x, s.y, s.R + dr, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = "#e6c877";
      for (const s of islas) { ctx.beginPath(); ctx.arc(s.x, s.y, s.R * 0.82, 0, 7); ctx.fill(); }
    },
  },
  campo: {
    // Mapa grande: 15×15 cuadras de 600 px
    mundo: 9000, objetos: 5400, bots: 18, duracion: 420,
    bg: "#3f6b34",
    tipos: [
      // nivel 1
      { e: "🌾", r: 7, w: 30 }, { e: "🌻", r: 7, w: 18 }, { e: "🐔", r: 8, w: 14 }, { e: "🐑", r: 11, w: 14 },
      { e: "🪵", r: 12, w: 10 }, { e: "🐄", r: 15, w: 12 }, { caja: true, r: 12, w: 14, col: "#d8b84a", alt: 0.8 },
      // nivel 2
      { e: "🐎", r: 18, w: 14 },
      // nivel 3
      { e: "🐂", r: 22, w: 11.5 },
      // nivel 4
      { e: "🚜", r: 26, w: 9.4, calle: true },
      // nivel 5
      { e: "🌳", r: 28, w: 4.2 }, { est: true, r: 46, w: 1.7, pisos: 2, fh: 24, pf: 0.66, col: "#ece0b3" },
      // nivel 6
      { e: "🏚️", r: 33, w: 3.6 }, { est: true, r: 50, w: 1.35, pisos: 2, fh: 26, pf: 0.62, col: "#b3412f" },
      // nivel 7
      { e: "🛖", r: 40, w: 3.1 }, { est: true, r: 62, w: 0.52, pisos: 4, fh: 28, pf: 0.6, col: "#c9a15a" },
      // nivel 8
      { e: "🏡", r: 44, w: 2.6 }, { est: true, r: 78, w: 0.29, pisos: 6, fh: 28, pf: 0.55, col: "#7a7f8c" },
      // niveles 9 a 15
      { e: "⛪", r: 50, w: 2.1 }, { e: "🏫", r: 58, w: 1.7 }, { e: "🎪", r: 66, w: 1.4 }, { e: "⛰️", r: 75, w: 1.1 },
      { e: "🏰", r: 88, w: 0.95 }, { e: "🗻", r: 100, w: 0.8 }, { e: "🏔️", r: 112, w: 0.65 },
      ...torres("#8d8f99"),
    ],
    preparar() {},
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        let x, y;
        if (t.calle) {
          const v = Math.random() < 0.5, c = Math.floor(rnd(0, MUNDO / CAMPO_CALLE)) * CAMPO_CALLE;
          x = v ? Math.max(60, c + rnd(-35, 35)) : rnd(100, MUNDO - 100);
          y = v ? rnd(100, MUNDO - 100) : Math.max(60, c + rnd(-35, 35));
        } else {
          x = rnd(60, MUNDO - 60); y = rnd(60, MUNDO - 60);
          if (enCalleCampo(x, y) || enCalleCampo(x + t.r, y + t.r) || enCalleCampo(x - t.r, y - t.r)) continue;
        }
        return [x, y];
      }
      return null;
    },
    spawn: () => [rnd(200, MUNDO - 200), rnd(200, MUNDO - 200)],
    factor: () => 1,
    suelo() {
      ctx.fillStyle = "#5f9e4a"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      const n = Math.ceil(MUNDO / CAMPO_CALLE), m = CAMPO_ANCHO / 2 + 10;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { // parcelas de cultivo, cada una de un color fijo
        ctx.fillStyle = CAMPOS[(((i * 73856093) ^ (j * 19349663)) >>> 0) % CAMPOS.length];
        ctx.fillRect(i * CAMPO_CALLE + m, j * CAMPO_CALLE + m, CAMPO_CALLE - 2 * m, CAMPO_CALLE - 2 * m);
      }
      ctx.fillStyle = "#b08d57"; // caminos de tierra
      for (let k = 0; k * CAMPO_CALLE <= MUNDO; k++) {
        ctx.fillRect(k * CAMPO_CALLE - CAMPO_ANCHO / 2, 0, CAMPO_ANCHO, MUNDO);
        ctx.fillRect(0, k * CAMPO_CALLE - CAMPO_ANCHO / 2, MUNDO, CAMPO_ANCHO);
      }
    },
  },
};
const NOMBRES = ["Lalo", "Mimi", "Toño", "Kiki", "Chuy", "Nena", "Beto", "Pepa", "Rulo", "Cuca", "Tita", "Lupe", "Memo", "Chela", "Nacho", "Güera", "Tere", "Paco"];
const COLORES = ["#ff5c7a", "#ffb347", "#4ad6a7", "#5cb8ff", "#c77dff", "#ffe066", "#ff8fab", "#9be564", "#7de0e6", "#f2a65a"];

let mapaId = "ciudad", mapa = MAPAS.ciudad;

function nuevoObjeto() {
  const tipos = mapa.tipos, total = tipos.reduce((s, t) => s + pesoTipo(t), 0);
  let k = Math.random() * total, t = tipos[0];
  for (const x of tipos) { if ((k -= pesoTipo(x)) < 0) { t = x; break; } }
  const p = mapa.colocar(t);
  if (!p) return null;
  const o = { e: t.e, r: t.r, x: p[0], y: p[1], t: tierDe(t.est ? t.r * t.pf : t.r) };
  if (t.est) Object.assign(o, { pisos: t.pisos, fh: t.fh, rp: t.r * t.pf, col: t.col, lift: 0, cd: 0 });
  else if (t.caja) Object.assign(o, { caja: true, col: t.col, alt: t.alt, vent: !!t.vent });
  return o;
}

// ----- Estado -----
let objetos = [], caidas = [], hoyos = [], yo = null, tiempo = 0, jugando = false;
const cam = { x: MUNDO / 2, y: MUNDO / 2, z: 0.3 };

function cargarMapa(id) {
  mapaId = id; mapa = MAPAS[id];
  MUNDO = mapa.mundo || 3000; const base = mapa.objetos || OBJETOS, wTodos = mapa.tipos.reduce((a, t) => a + t.w, 0), wPeq = mapa.tipos.reduce((a, t) => a + (t.r <= R_PEQUENO ? t.w : 0), 0);
  totalObjetos = Math.round(base * (1 - (wPeq / wTodos) * (1 - PEQUENOS))); duracionMapa = mapa.duracion || DURACION;
  mapa.preparar();
  objetos = []; caidas = []; hoyos = []; yo = null;
  while (objetos.length < totalObjetos) { const o = nuevoObjeto(); if (o) objetos.push(o); }
  calcularValores();
  cam.x = cam.y = MUNDO / 2; cam.z = 0.3;
}
// Reparte PUNTOS_EN_MAPA entre los 15 niveles de objetos. El nivel 1 vale 1 punto por objeto (10 puntos = nivel 2);
// el resto se reparte a partes iguales entre los niveles 2 a 15 y cada parte se divide entre los objetos de ese nivel
// (por eso, como hay menos objetos grandes, cada uno vale más).
function calcularValores() {
  const n = new Array(NIVELES + 1).fill(0);
  for (const o of objetos) n[o.t] += o.pisos || 1; // cada piso de un edificio cuenta como un objeto
  const porNivel = (PUNTOS_EN_MAPA - n[1]) / (NIVELES - 1);
  VALOR = [0, 1];
  for (let t = 2; t <= NIVELES; t++) VALOR[t] = n[t] ? Math.max(1, Math.round(porNivel / n[t])) : 0;
}
// Suma puntos (los bots ganan menos) y sube de nivel si llega al siguiente umbral
function ganar(h, v) {
  v *= h.esBot ? BOT_COMER : 1;
  h.puntos += v; h.prog += v;
  while (h.nivel < NIVELES && h.prog >= UMBRAL[h.nivel + 1]) { h.nivel++; h.aviso = 2; }
}
function crearHoyo(nombre, color, esBot) {
  const h = { nombre, color, esBot, x: 0, y: 0, r: R_INICIAL, puntos: 0, prog: 0, nivel: 1, aviso: 0, dx: 0, dy: 0, meta: null, t: 0, cazaT: 0, enfriar: rnd(0, BOT_ENFRIAR) };
  reaparecer(h);
  return h;
}
function reaparecer(h) {
  h.r = R_NIVEL[1]; h.nivel = 1; h.prog = 0; h.meta = null; h.cazaT = 0; // al reaparecer vuelve al nivel 1 (los puntos del marcador se conservan)
  for (let i = 0; i < 20; i++) {
    [h.x, h.y] = mapa.spawn();
    if (!hoyos.some((o) => o !== h && Math.hypot(o.x - h.x, o.y - h.y) < 400)) break;
  }
}
function empezar() {
  cargarMapa(mapaId);
  yo = crearHoyo("Tú", "#7c5cff", false);
  hoyos.push(yo);
  for (let i = 0, nb = mapa.bots || NUM_BOTS; i < nb; i++) hoyos.push(crearHoyo(NOMBRES[i % NOMBRES.length], COLORES[i % COLORES.length], true));
  tiempo = duracionMapa; jugando = true;
  $("fin").hidden = true;
  cam.x = yo.x; cam.y = yo.y; cam.z = Math.min(W, H) / (yo.r * 9);
}

// ----- Controles: arrastrar el dedo (joystick flotante) o teclado. Se leen en pantalla y se pasan al mundo isométrico -----
const joy = { activo: false, ox: 0, oy: 0, x: 0, y: 0 };
cv.addEventListener("pointerdown", (e) => { joy.activo = true; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => { if (joy.activo) { joy.x = e.clientX; joy.y = e.clientY; } });
const soltar = () => (joy.activo = false);
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
const teclas = {};
addEventListener("keydown", (e) => (teclas[e.key.toLowerCase()] = true));
addEventListener("keyup", (e) => (teclas[e.key.toLowerCase()] = false));

function direccionJugador() {
  let sx = 0, sy = 0, f = 1;
  if (joy.activo) {
    sx = joy.x - joy.ox; sy = joy.y - joy.oy;
    const m = Math.hypot(sx, sy);
    if (m < 6) return [0, 0];
    f = Math.min(m, 60) / 60;
  } else {
    if (teclas.arrowleft || teclas.a) sx -= 1;
    if (teclas.arrowright || teclas.d) sx += 1;
    if (teclas.arrowup || teclas.w) sy -= 1;
    if (teclas.arrowdown || teclas.s) sy += 1;
    if (!sx && !sy) return [0, 0];
  }
  // pantalla -> mundo (inversa de la isométrica)
  const wx = K * sx + 2 * K * sy, wy = -K * sx + 2 * K * sy, m = Math.hypot(wx, wy) || 1;
  return [(wx / m) * f, (wy / m) * f];
}

// ----- IA de los bots -----
function pensar(b) {
  // Si va en plena persecución, sigue un ratito más (hasta que se acabe su tiempo)
  if (b.cazaT > 0 && b.meta && b.meta.nombre) {
    const p = b.meta;
    if (b.nivel >= p.nivel + DIF_DEVORAR && Math.hypot(p.x - b.x, p.y - b.y) < BOT_VISION_HOYOS * 1.5) return;
    b.cazaT = 0;
  }
  let peligro = null, presa = null;
  for (const h of hoyos) {
    if (h === b) continue;
    const d = Math.hypot(h.x - b.x, h.y - b.y);
    if (h.nivel >= b.nivel + DIF_DEVORAR && d < BOT_HUIR_DIST + h.r * 0.5) peligro = h;
    else if (b.nivel >= h.nivel + DIF_DEVORAR && d < BOT_VISION_HOYOS && (!presa || d < Math.hypot(presa.x - b.x, presa.y - b.y))) presa = h;
  }
  const vagar = () => ({ x: rnd(100, MUNDO - 100), y: rnd(100, MUNDO - 100) });
  if (peligro && Math.random() < BOT_PROB_HUIR) {
    b.meta = { x: b.x - (peligro.x - b.x), y: b.y - (peligro.y - b.y) };
  } else if (presa && b.enfriar <= 0 && Math.random() < BOT_PROB_PERSEGUIR) {
    b.meta = presa; b.cazaT = rnd(1, BOT_PERSECUCION_MAX); b.enfriar = BOT_ENFRIAR;
  } else if (Math.random() < BOT_PROB_VAGAR) {
    b.meta = vagar();
  } else {
    let mejor = null, d2 = BOT_VISION_OBJETOS * BOT_VISION_OBJETOS;
    for (const o of objetos) {
      if (o.t > b.nivel) continue;
      const d = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
      if (d < d2) { d2 = d; mejor = o; }
    }
    b.meta = mejor || vagar();
  }
}

// ----- Actualización -----
const velocidad = (h) => Math.min(V_MAX, V_BASE * Math.pow(h.r / R_INICIAL, V_EXP)); // más grande = más rápido

function actualizar(dt) {
  if (!jugando) return;
  tiempo -= dt; reloj += dt;
  if (tiempo <= 0) return terminar();

  [yo.dx, yo.dy] = direccionJugador();
  for (const h of hoyos) {
    h.r += (R_NIVEL[h.nivel] - h.r) * Math.min(1, dt * 5); // crece con suavidad hasta el tamaño de su nivel
    if (h.aviso > 0) h.aviso -= dt;
    if (h.esBot) {
      h.t -= dt; h.cazaT -= dt; h.enfriar -= dt;
      if (h.t <= 0 || !h.meta) { pensar(h); h.t = rnd(0.3, 0.7); }
      const m = h.meta, a = Math.hypot(m.x - h.x, m.y - h.y) || 1;
      h.dx = (m.x - h.x) / a; h.dy = (m.y - h.y) / a;
      if (a < 10) h.t = 0;
    }
    const v = velocidad(h) * (h.esBot ? 0.9 : 1) * mapa.factor(h.x, h.y);
    h.x = Math.max(h.r * 0.3, Math.min(MUNDO - h.r * 0.3, h.x + h.dx * v * dt));
    h.y = Math.max(h.r * 0.3, Math.min(MUNDO - h.r * 0.3, h.y + h.dy * v * dt));

    for (let i = objetos.length - 1; i >= 0; i--) {
      const o = objetos[i];
      if (o.pisos) { // edificio: el hoyo se traga un piso a la vez (el de abajo); los de arriba bajan
        const d = Math.hypot(o.x - h.x, o.y - h.y);
        if (o.t <= h.nivel && d < h.r - o.rp * 0.3 && reloj >= o.cd) {
          o.cd = reloj + 0.45;
          caidas.push({ piso: { w: o.r, h: o.fh, col: o.col }, r: o.r, x: o.x, y: o.y, t: 0, h });
          ganar(h, VALOR[o.t]);
          o.pisos--; o.lift = o.fh;
          if (o.pisos >= 2 && Math.random() < PISO_DESPRENDE) { // se desprende el piso de arriba y cae al suelo
            o.pisos--;
            const a = rnd(0, 6.2832), dist = o.r * 1.3;
            objetos.push({ e: "🧱", t: o.t, r: o.rp * 0.8, x: Math.max(60, Math.min(MUNDO - 60, o.x + Math.cos(a) * dist)), y: Math.max(60, Math.min(MUNDO - 60, o.y + Math.sin(a) * dist)), caja: true, col: o.col, alt: 0.9, vent: true, drop: o.fh * 3 });
          }
          if (o.pisos <= 0) { objetos[i] = objetos[objetos.length - 1]; objetos.pop(); }
        }
        continue;
      }
      if (o.t <= h.nivel && Math.hypot(o.x - h.x, o.y - h.y) < h.r - o.r * 0.3) {
        objetos[i] = objetos[objetos.length - 1]; objetos.pop();
        caidas.push({ e: o.e, r: o.r, x: o.x, y: o.y, t: 0, h });
        ganar(h, VALOR[o.t]);
      }
    }
  }
  for (const a of hoyos) for (const b of hoyos) {
    if (a === b || a.nivel < b.nivel + DIF_DEVORAR) continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < a.r * 0.7) {
      ganar(a, PUNTOS_NIVEL_2 + UMBRAL[b.nivel] * 0.1); // premio por devorar un hoyo: 10 + el 10 % de los puntos con que empieza su nivel
      reaparecer(b);
    }
  }
  for (let i = caidas.length - 1; i >= 0; i--) { caidas[i].t += dt / 0.35; if (caidas[i].t >= 1) caidas.splice(i, 1); }
  if (objetos.length === 0) return terminar(); // no reaparecen objetos: al acabarse todos, termina el mapa

  const zObj = Math.min(W, H) / (yo.r * 9);
  cam.z += (Math.max(0.12, Math.min(2.2, zObj)) - cam.z) * Math.min(1, dt * 2.5);
  cam.x += (yo.x - cam.x) * Math.min(1, dt * 8);
  cam.y += (yo.y - cam.y) * Math.min(1, dt * 8);
}

// ----- Dibujo -----
// ----- Objetos 3D (cajas y edificios por pisos), dibujados con caras sombreadas en la vista isométrica -----
function tono(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return "rgb(" + c(16) + "," + c(8) + "," + c(0) + ")";
}
function poli(pts, fill) {
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
}
// Caja: w = semiancho del rombo de la base, h = alto, y0 = altura de la base (0 = en el suelo, negativo = más arriba)
function bloque(w, h, col, y0, vent, puerta) {
  const top = y0 - h, v = w / 2;
  poli([-w, top, 0, top + v, 0, y0 + v, -w, y0], tono(col, 1));      // cara izquierda
  poli([0, top + v, w, top, w, y0, 0, y0 + v], tono(col, 0.7));      // cara derecha (más oscura)
  poli([0, top - v, w, top, 0, top + v, -w, top], tono(col, 1.3));   // tapa
  ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.beginPath(); ctx.moveTo(-w, top); ctx.lineTo(0, top + v); ctx.lineTo(w, top); ctx.stroke();
  if (!vent && !puerta) return;
  for (const izq of [true, false]) {
    ctx.save();
    if (izq) ctx.transform(1, 0.5, 0, 1, -w, top); else ctx.transform(1, -0.5, 0, 1, 0, top + v);
    if (vent) {
      ctx.fillStyle = izq ? "#cfeeff" : "#86b4d8"; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = Math.max(1, w * 0.025);
      for (const ux of [w * 0.14, w * 0.6]) { ctx.fillRect(ux, h * 0.2, w * 0.26, h * 0.42); ctx.strokeRect(ux, h * 0.2, w * 0.26, h * 0.42); }
    }
    if (puerta && !izq) { ctx.fillStyle = "#5a3b2a"; ctx.fillRect(w * 0.38, h * 0.5, w * 0.24, h * 0.5); }
    ctx.restore();
  }
}
function dibujarEdificio(o) {
  o.lift = o.lift > 0.5 ? o.lift * 0.82 : 0; // al tragarse el piso de abajo, los de arriba bajan
  for (let i = 0; i < o.pisos; i++) bloque(o.r, o.fh, o.col, -i * o.fh - o.lift, true, i === 0);
  bloque(o.r * 1.06, o.fh * 0.16, "#f4f0e8", -o.pisos * o.fh - o.lift, false, false); // techo
}
function emoji(e, r, alfa) {
  ctx.globalAlpha = alfa; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = Math.max(4, r * 2) + "px serif"; ctx.fillStyle = "#000";
  ctx.fillText(e, 0, 0); ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = mapa.bg; ctx.fillRect(0, 0, W, H);
  const [cx, cy] = proj(cam.x, cam.y);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cx, -cy);
  ctx.transform(K, K / 2, -K, K / 2, 0, 0); // a partir de aquí se dibuja en coordenadas del mundo, en isométrico

  mapa.suelo();

  const vw = W / 2 / cam.z + 200, vh = H / 2 / cam.z + 200;
  const visible = (o) => {
    const [px, py] = proj(o.x, o.y), m = (o.r || 0) * 2 + (o.pisos ? o.pisos * o.fh : 0);
    return Math.abs(px - cx) < vw + m && Math.abs(py - cy) < vh + m;
  };

  // hoyos (debajo de los objetos): círculos del mundo que en isométrico se ven como elipses
  for (const h of hoyos) {
    if (!visible(h)) continue;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 4, 0, 7); ctx.fillStyle = h.color; ctx.fill();
    const g = ctx.createRadialGradient(h.x, h.y, h.r * 0.2, h.x, h.y, h.r);
    g.addColorStop(0, "#000"); g.addColorStop(1, "#141420");
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fillStyle = g; ctx.fill();
  }
  // objetos cayendo: se encogen hacia el centro y se recortan dentro del hoyo
  for (const c of caidas) {
    const h = c.h, k = c.t, x = c.x + (h.x - c.x) * k, y = c.y + (h.y - c.y) * k;
    ctx.save();
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.clip();
    if (c.piso) recto(x, y, () => { ctx.scale(1 - k * 0.85, 1 - k * 0.85); bloque(c.piso.w, c.piso.h, c.piso.col, 0, true, false); });
    else recto(x, y, () => { ctx.translate(0, -c.r * 0.8 * (1 - k)); emoji(c.e, c.r * (1 - k * 0.9), 1 - k * 0.4); });
    ctx.restore();
  }
  // objetos en el suelo, de atrás hacia adelante (x + y = profundidad en isométrico)
  const vis = objetos.filter(visible).sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const o of vis) {
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.8, 0, 7); ctx.fill();
  }
  for (const o of vis) {
    if (o.pisos) recto(o.x, o.y, () => dibujarEdificio(o));
    else if (o.caja) {
      if (o.drop) o.drop = o.drop > 0.5 ? o.drop * 0.8 : 0; // los bloques desprendidos caen desde arriba
      recto(o.x, o.y, () => bloque(o.r, o.r * o.alt, o.col, -(o.drop || 0), o.vent, false));
    } else recto(o.x, o.y, () => { ctx.translate(0, -o.r * 0.8); emoji(o.e, o.r, 1); });
  }
  // nombres
  for (const h of hoyos) {
    if (!visible(h)) continue;
    recto(h.x, h.y, () => {
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.font = "700 " + Math.max(12, h.r * 0.42) + "px system-ui, sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.fillStyle = "#fff";
      const y = -h.r * 0.5 - 12;
      ctx.strokeText(h.nombre, 0, y); ctx.fillText(h.nombre, 0, y);
    });
  }
  ctx.restore();

  // ----- interfaz (en pantalla) -----
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (joy.activo) {
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 60, 0, 7); ctx.stroke();
    const m = Math.min(60, Math.hypot(joy.x - joy.ox, joy.y - joy.oy)), a = Math.atan2(joy.y - joy.oy, joy.x - joy.ox);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * m, joy.oy + Math.sin(a) * m, 24, 0, 7); ctx.fill();
  }
  if (!yo) return;
  ctx.fillStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.6)";
  ctx.font = "800 26px system-ui, sans-serif";
  const t = Math.max(0, Math.ceil(tiempo)), txt = Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  ctx.strokeText(txt, W / 2, 36); ctx.fillText(txt, W / 2, 36);
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.strokeText(fmt(yo.puntos) + " pts", W / 2, 62); ctx.fillText(fmt(yo.puntos) + " pts", W / 2, 62);
  // nivel de tamaño y barra hacia el siguiente
  ctx.font = "700 15px system-ui, sans-serif"; ctx.lineWidth = 3;
  const ntxt = "Nivel " + yo.nivel + " / " + NIVELES;
  ctx.strokeText(ntxt, W / 2, 84); ctx.fillText(ntxt, W / 2, 84);
  const bw = 150, ini = UMBRAL[yo.nivel], fin = UMBRAL[yo.nivel + 1];
  const frac = yo.nivel >= NIVELES ? 1 : Math.max(0, Math.min(1, (yo.prog - ini) / (fin - ini)));
  ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(W / 2 - bw / 2 - 2, 94, bw + 4, 10);
  ctx.fillStyle = "#7c5cff"; ctx.fillRect(W / 2 - bw / 2, 96, bw * frac, 6);
  if (yo.aviso > 0) {
    ctx.globalAlpha = Math.min(1, yo.aviso); ctx.font = "800 34px system-ui, sans-serif"; ctx.fillStyle = "#ffe066"; ctx.lineWidth = 5;
    ctx.strokeText("¡Nivel " + yo.nivel + "!", W / 2, H * 0.28); ctx.fillText("¡Nivel " + yo.nivel + "!", W / 2, H * 0.28);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#fff"; ctx.lineWidth = 4; ctx.font = "600 14px system-ui, sans-serif";
  const top = [...hoyos].sort((a, b) => b.puntos - a.puntos).slice(0, 5);
  ctx.textAlign = "right"; ctx.font = "600 14px system-ui, sans-serif";
  top.forEach((h, i) => {
    ctx.fillStyle = h === yo ? "#ffe066" : "#fff";
    const s = (i + 1) + ". " + h.nombre + "  " + fmt(h.puntos);
    ctx.strokeText(s, W - 12, 24 + i * 20); ctx.fillText(s, W - 12, 24 + i * 20);
  });
}

// ----- Fin de la partida -----
async function terminar() {
  jugando = false;
  const orden = [...hoyos].sort((a, b) => b.puntos - a.puntos);
  const lugar = orden.indexOf(yo) + 1;
  const motivo = objetos.length === 0 ? "Se acabaron los objetos" : "Terminó el tiempo";
  $("fin").querySelector("h2").textContent = lugar === 1 ? "🏆 ¡Ganaste!" : motivo + ": lugar " + lugar;
  $("rank").innerHTML = "";
  orden.slice(0, 5).forEach((h, i) => {
    const li = document.createElement("li");
    const n = document.createElement(h === yo ? "b" : "span");
    n.textContent = (i + 1) + ". " + h.nombre + " — " + fmt(h.puntos) + " pts (nivel " + h.nivel + ")";
    li.appendChild(n); $("rank").appendChild(li);
  });
  $("jugar").textContent = "Jugar otra vez";
  $("fin").hidden = false;
  $("msg").textContent = "";
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    const ok = await sumarPuntos("hoyo", Math.floor(yo.puntos / 1000)); // 1 punto de perfil por cada 1000 del juego (1 000 000 = tope de 1000)
    $("msg").textContent = ok ? "Puntos guardados en tu perfil." : "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) {
    $("msg").textContent = "No se pudieron guardar los puntos (sin conexión).";
  }
}

// ----- Menú: elegir mapa y jugar -----
document.querySelectorAll("#mapas .btn").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll("#mapas .btn").forEach((x) => x.classList.toggle("sel", x === b));
    cargarMapa(b.dataset.mapa); // el fondo del menú muestra el mapa elegido
  })
);
$("jugar").addEventListener("click", empezar);

// ----- Bucle -----
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
  actualizar(dt); dibujar();
  requestAnimationFrame(bucle);
}
cargarMapa("ciudad");
requestAnimationFrame(bucle);
