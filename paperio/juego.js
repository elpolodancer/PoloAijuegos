// Ruta: paperio/juego.js
// «Paperio» (estilo Paper.io 2): sales de tu territorio dejando una estela y, al volver, te quedas con todo lo que encerraste.
// - Si alguien toca tu estela (o tú la tuya), pierdes todo; si tú tocas la estela de otro, pierde él.
// - Si te quedas sin territorio, pierdes. Los bots reaparecen solos; tú no (se acaba la partida).
// - Cada nivel tiene un mapa con una forma distinta (ver niveles.js). Todos se mueven LIBRES (por ángulo), girando en curvas.
// - Para pasar de nivel hay que conquistar el % de mapa que pide el nivel («meta»).
// - El territorio vive en una rejilla fina (cada casilla es muy pequeña) que se dibuja estirada y suavizada,
//   así los bordes se ven redondeados y no «cuadrados».
import { NIVELES, crearForma } from "./niveles.js";
const ID = "paperio";

// ----- Ajustes -----
const RADIO = 300;                    // «tamaño» de los mapas: el cuadrado de -1 a 1 de niveles.js mide 2·RADIO casillas finas
const VEL = 38;                       // velocidad (casillas por segundo)
const GIRO = 5.5;                     // giro de los bots (radianes por segundo): más alto = giros más cerrados
const ANGULO_CHOQUE = 15;             // grados: si llegas al borde con menos de esto respecto a ir «de frente», mueres; si no, te deslizas
const COS_CHOQUE = Math.cos(ANGULO_CHOQUE * Math.PI / 180);
const GIRO_JUGADOR = 8;               // giro del jugador (más alto = responde más rápido y preciso a las teclas/dedo)
const MARGEN_PARED = 2.5;             // distancia a la pared a la que ya cuenta como roce
const PUNTOS_POR_NIVEL = 50;          // puntos extra por pasar un nivel
const DESBLOQUEAR_TODOS = false;      // true = todos los niveles disponibles desde el inicio (útil para probar)
const R_CABEZA = 3;                   // tamaño de la cabeza (para choques)
const R_RASTRO = 2;                   // grosor de la estela
const R_INICIO = 9;                   // radio del territorio inicial
const GRACIA = 12;                    // pasos recientes de tu estela que no cuentan al girar (para no chocar contigo)
const NUM_BOTS = 7;                   // máximo 7 (hay 8 colores/nombres)
const CELDAS_VISTA = 110;             // casillas finas que caben en el lado corto de la pantalla (menos = más cerca)
const REAPARECE_BOT = [2, 4];         // segundos que tarda un bot en volver
const PUNTOS_POR_PCT = 10;            // puntos por cada 1 % de mapa (el máximo que lograste)
const PUNTOS_POR_BAJA = 25;           // puntos por cada bot eliminado
const NOMBRES = ["Tú", "Lola", "Pepe", "Nico", "Rosa", "Toño", "Mara", "Beto"];
const TONOS = [255, 5, 38, 135, 178, 300, 340, 55]; // color de cada uno (el primero es el jugador)
const TEXTO_AYUDA = "Sal de tu territorio y regresa para quedarte con todo lo que encierres. Si alguien toca tu estela, pierdes; si tú tocas la suya, pierde él. Mantén el dedo pulsado y arrástralo hacia donde quieras ir, o usa las flechas / WASD.";

// ----- Estado -----
const G = 2 * RADIO + 40, C = G / 2;  // lado de la rejilla y su centro (con un margen alrededor del mapa)
const N = G * G;
const SIM = 1 / 60;                   // paso fijo de simulación
const TAU = Math.PI * 2;
const dueno = new Uint8Array(N);      // id del dueño de cada casilla (0 = nadie)
const rastro = new Uint8Array(N);     // id de quien dejó estela en la casilla (0 = ninguna)
const rastroIdx = new Int32Array(N);  // número de paso en que se dejó esa estela
const dentro = new Uint8Array(N);     // 1 = casilla dentro del mapa del nivel
const distM = new Float32Array(N);    // distancia de cada casilla a la pared más cercana (0 fuera del mapa)
const etiqueta = new Int32Array(N), cola2 = new Int32Array(N); // memoria de trabajo para cerrar zonas
let AREA = 0;                         // casillas que tiene el mapa del nivel actual
const cuenta = new Int32Array(NUM_BOTS + 2);

function disco(r) {
  const l = [], q = Math.ceil(r);
  for (let dy = -q; dy <= q; dy++) for (let dx = -q; dx <= q; dx++) if (dx * dx + dy * dy <= r * r) l.push(dx, dy);
  return l;
}
const D_RASTRO = disco(R_RASTRO), D_INICIO = disco(R_INICIO);

let ents = [], yo = null;
let estado = "demo";                  // demo | jugando | fin
let sucio = true, bajas = 0, maxPct = 0, tiempo = 0, mejorPct = 0;
let fx = [];
let nivelActual = 0, nivelConstruido = -1, desbloqueado = 0, ganado = false;
let reloj = 0;                        // pasos de simulación transcurridos (60 por segundo)
const cam = { x: C, y: C };

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), ctx = cv.getContext("2d");
let vw = 300, vh = 300, cs = 4;

try { mejorPct = Number(localStorage.getItem("paperio_mejor")) || 0; } catch (e) {}
try { desbloqueado = Math.min(NIVELES.length - 1, Number(localStorage.getItem("paperio_nivel")) || 0); } catch (e) {}
const nivelMax = () => (DESBLOQUEAR_TODOS ? NIVELES.length - 1 : desbloqueado);

// ----- Sesión y puntos (opcional: sin conexión el juego funciona igual) -----
let J = null, usuario = null;
import("../compartido/jugador.js")
  .then((m) => { J = m; m.alCambiarSesion((u) => { usuario = u; marcarEntrar(); }); })
  .catch(() => {});

// ----- Capas de territorio (un píxel por casilla, luego se estiran suavizadas) -----
// A = colores claros (territorio y estela), B = colores oscuros (el «grosor» de abajo)
const cvA = document.createElement("canvas"), cvB = document.createElement("canvas");
cvA.width = cvA.height = cvB.width = cvB.height = G;
const ctxA = cvA.getContext("2d"), ctxB = cvB.getContext("2d");
const imgA = ctxA.createImageData(G, G), imgB = ctxB.createImageData(G, G);
const u32A = new Uint32Array(imgA.data.buffer), u32B = new Uint32Array(imgB.data.buffer);
let sx0 = 0, sy0 = 0, sx1 = G - 1, sy1 = G - 1; // zona que cambió y hay que subir a las capas

function pix(i) {
  const o = dueno[i], r = rastro[i];
  let a = 0, b = 0;
  if (r) { const e = ents[r - 1]; a = e.pRl; b = e.pRd; }
  else if (o) { const e = ents[o - 1]; a = e.pTl; b = e.pTd; }
  u32A[i] = a; u32B[i] = b;
  const x = i % G, y = (i / G) | 0;
  if (x < sx0) sx0 = x;
  if (x > sx1) sx1 = x;
  if (y < sy0) sy0 = y;
  if (y > sy1) sy1 = y;
}
function subirCapas() {
  if (sx1 < sx0) return;
  const w = sx1 - sx0 + 1, h = sy1 - sy0 + 1;
  ctxA.putImageData(imgA, 0, 0, sx0, sy0, w, h);
  ctxB.putImageData(imgB, 0, 0, sx0, sy0, w, h);
  sx0 = G; sy0 = G; sx1 = -1; sy1 = -1;
}

// ----- Colores -----
function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
const pack = (c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; // ABGR (little endian)

// ----- Mapa del nivel -----
// Capas del fondo: M = suelo claro, S = su sombra (más oscura, se dibuja un poco más abajo)
const cvM = document.createElement("canvas"), cvS = document.createElement("canvas");
cvM.width = cvM.height = cvS.width = cvS.height = G;
const ctxM = cvM.getContext("2d"), ctxS = cvS.getContext("2d");
const imgM = ctxM.createImageData(G, G), imgS = ctxS.createImageData(G, G);
const u32M = new Uint32Array(imgM.data.buffer), u32S = new Uint32Array(imgS.data.buffer);
const tmpD = new Float32Array(N);

function chamfer(d) { // distancia (aprox.) al origen más cercano, en dos pasadas
  const D2 = 1.4142;
  for (let y = 1; y < G; y++)
    for (let x = 1; x < G - 1; x++) {
      const i = y * G + x;
      d[i] = Math.min(d[i], d[i - 1] + 1, d[i - G] + 1, d[i - G - 1] + D2, d[i - G + 1] + D2);
    }
  for (let y = G - 2; y >= 0; y--)
    for (let x = G - 2; x >= 1; x--) {
      const i = y * G + x;
      d[i] = Math.min(d[i], d[i + 1] + 1, d[i + G] + 1, d[i + G + 1] + D2, d[i + G - 1] + D2);
    }
}
function construirNivel(n) {
  const f = crearForma(NIVELES[n].forma);
  dentro.fill(0);
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const u = (x + 0.5 - C) / RADIO, v = (y + 0.5 - C) / RADIO;
      if (u > -1 && u < 1 && v > -1 && v < 1 && f(u, v)) dentro[y * G + x] = 1;
    }
  // quedarse solo con la pieza más grande (por si la forma deja pedacitos sueltos)
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s0 = 0; s0 < N; s0++) {
    if (!dentro[s0] || etiqueta[s0]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s0; etiqueta[s0] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  AREA = 0;
  for (let i = 0; i < N; i++) {
    if (dentro[i] && etiqueta[i] !== mayor) dentro[i] = 0;
    if (dentro[i]) AREA++;
  }
  // distancia a la pared (dentro) y al mapa (fuera): sirve para los roces, los bots y para suavizar el borde al dibujar
  for (let i = 0; i < N; i++) { distM[i] = dentro[i] ? 1e4 : 0; tmpD[i] = dentro[i] ? 0 : 1e4; }
  chamfer(distM); chamfer(tmpD);
  for (let i = 0; i < N; i++) {
    const sd = dentro[i] ? distM[i] - 0.5 : -(tmpD[i] - 0.5);
    const a = Math.max(0, Math.min(1, 0.5 + sd * 0.8)), a8 = Math.round(a * 255);
    u32M[i] = a8 ? ((a8 << 24) | (247 << 16) | (255 << 8) | 236) >>> 0 : 0;
    u32S[i] = a8 ? ((a8 << 24) | (195 << 16) | (214 << 8) | 169) >>> 0 : 0;
  }
  ctxM.putImageData(imgM, 0, 0);
  ctxS.putImageData(imgS, 0, 0);
}
function distEn(x, y) {
  const cx = x | 0, cy = y | 0;
  return cx >= 0 && cy >= 0 && cx < G && cy < G ? distM[cy * G + cx] : 0;
}

// ----- Entidades -----
// Qué tan agresivos son los bots en este nivel (0 a 1). Sube sola con el número de nivel;
// un nivel puede fijarla con «dificultad: 0.8» en niveles.js.
function dificultad() {
  const nv = NIVELES[nivelActual];
  return typeof nv.dificultad === "number" ? Math.max(0, Math.min(1, nv.dificultad)) : Math.min(1, 0.4 + nivelActual * 0.07);
}
// Rasgos extra del nivel actual (mordisco, venganza, acoso, veloz), de 0 a 1; sin ellos valen 0
function rasgo(n) {
  const r = NIVELES[nivelActual].rasgos;
  return r && typeof r[n] === "number" ? Math.max(0, Math.min(1, r[n])) : 0;
}
function crear(id) {
  const tono = TONOS[id - 1];
  return {
    id, jugador: id === 1, nombre: NOMBRES[id - 1], tono,
    cT: "hsl(" + tono + ",55%,66%)", cC: "hsl(" + tono + ",42%,56%)", cD: "hsl(" + tono + ",38%,34%)",
    pTl: pack(hslRgb(tono, 55, 66)), pTd: pack(hslRgb(tono, 48, 46)),   // territorio claro / oscuro
    pRl: pack(hslRgb(tono, 62, 78)), pRd: pack(hslRgb(tono, 45, 60)),   // estela clara / oscura
    x: 0, y: 0, px: 0, py: 0, ang: 0, meta: 0,
    cola: [], ruta: [], seq: 0, vivo: false, espera: 0,
    plan: null, wp: 0, vuelta: false, casa: null, casaT: 0, vagar: 0, desv: 0, ia: 0,
    caza: null, cazaT: 0, defiende: false, alarma: null, agr: 0.5 + Math.random() * 0.5, dif: dificultad(),
    // personalidad: solo algunos bots son «mordedores» (así no todos van por ti a la vez)
    mordedor: Math.random() < 0.3 + 0.6 * rasgo("mordisco"), vel: 1 + Math.min(0.1, rasgo("veloz")), gir: 1 + Math.min(0.4, rasgo("giro")),
  };
}

function discoLibre(cx, cy, r) {
  for (let dy = -r; dy <= r; dy += 2)
    for (let dx = -r; dx <= r; dx += 2) {
      const i = (cy + dy) * G + cx + dx;
      if (dueno[i] || rastro[i]) return false;
    }
  return true;
}
function lejos(cx, cy, r) {
  for (const o of ents) if (o.vivo && Math.hypot(o.x - cx, o.y - cy) < r) return false;
  return true;
}
function aparecer(e) {
  let cx = C, cy = C, ok = false;
  for (let k = 0; k < 2500 && !ok; k++) {
    cx = Math.round(C + (Math.random() * 2 - 1) * RADIO); cy = Math.round(C + (Math.random() * 2 - 1) * RADIO);
    ok = distM[cy * G + cx] > R_INICIO + 8 && discoLibre(cx, cy, R_INICIO + 5) && lejos(cx, cy, k < 1200 ? 60 : 30);
  }
  for (let k = 0; k < 6000 && !ok; k++) { // plan B: cualquier lugar despejado
    cx = Math.round(C + (Math.random() * 2 - 1) * RADIO); cy = Math.round(C + (Math.random() * 2 - 1) * RADIO);
    ok = distM[cy * G + cx] > R_INICIO + 3;
  }
  for (let k = 0; k < D_INICIO.length; k += 2) {
    const i = (cy + D_INICIO[k + 1]) * G + cx + D_INICIO[k];
    if (dentro[i]) { dueno[i] = e.id; pix(i); }
  }
  e.x = e.px = cx + 0.5; e.y = e.py = cy + 0.5;
  let mejorA = 0, mejorS = -1; // mira hacia donde hay más espacio libre
  for (let k = 0; k < 16; k++) {
    const a = k * TAU / 16 + Math.random() * 0.2;
    let sc = 1e9;
    for (const d of [30, 60, 90]) sc = Math.min(sc, distEn(cx + Math.cos(a) * d, cy + Math.sin(a) * d));
    if (sc > mejorS) { mejorS = sc; mejorA = a; }
  }
  e.ang = e.meta = mejorA;
  e.cola = []; e.ruta = []; e.seq = 0; e.plan = null; e.caza = null; e.casa = null; e.vuelta = false; e.alarma = null; e.defiende = false;
  e.vivo = true;
  sucio = true;
}

function recontar() {
  cuenta.fill(0);
  for (let i = 0; i < N; i++) { const o = dueno[i]; if (o) cuenta[o]++; }
  sucio = false;
  if (estado === "jugando" && yo.vivo) { const p = cuenta[1] * 100 / AREA; if (p > maxPct) maxPct = p; }
}

function matar(v, por) {
  if (!v.vivo) return;
  v.vivo = false;
  for (const i of v.cola) if (rastro[i] === v.id) { rastro[i] = 0; pix(i); }
  v.cola = []; v.ruta = [];
  for (let i = 0; i < N; i++) if (dueno[i] === v.id) { dueno[i] = 0; pix(i); }
  fx.push({ x: v.x, y: v.y, t: 0, tono: v.tono });
  sucio = true;
  if (por && por.jugador && por !== v && estado === "jugando") {
    bajas++;
    const ven = rasgo("venganza"); // los demás bots se enteran: unos cuantos van a por ti un rato
    if (ven > 0) for (const o of ents) if (o !== v && !o.jugador && o.vivo && Math.random() < ven * o.agr) o.alarma = { por, hasta: reloj + 60 * (4 + 6 * ven) };
  }
  if (v.jugador) { if (estado === "jugando") terminar(); }
  else v.espera = REAPARECE_BOT[0] + Math.random() * (REAPARECE_BOT[1] - REAPARECE_BOT[0]);
}

// Si el territorio de alguien quedó partido en pedazos sueltos, se queda solo con el más grande
// y los pedazos aislados se vuelven zona vacía.
function podar(id) {
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s = 0; s < N; s++) {
    if (dueno[s] !== id || etiqueta[s]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s; etiqueta[s] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  if (nEt <= 1) return;
  for (let s = 0; s < N; s++) if (etiqueta[s] && etiqueta[s] !== mayor) { dueno[s] = 0; pix(s); }
}

// Cierra el bucle: la estela pasa a ser territorio y se queda con las zonas encerradas.
// Se separan las zonas «no mías» en grupos; el grupo más grande es el exterior y todos los demás quedan encerrados.
function cerrar(e) {
  const afectados = new Set(); // dueños a los que esta captura les quita casillas
  for (const i of e.cola) { const o = dueno[i]; if (o && o !== e.id) afectados.add(o); if (rastro[i] === e.id) rastro[i] = 0; dueno[i] = e.id; pix(i); }
  e.cola = []; e.ruta = [];
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s = 0; s < N; s++) {
    if (!dentro[s] || dueno[s] === e.id || etiqueta[s]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s; etiqueta[s] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  for (let s = 0; s < N; s++) {
    const l = etiqueta[s];
    if (l && l !== mayor) { const o = dueno[s]; if (o && o !== e.id) afectados.add(o); dueno[s] = e.id; pix(s); }
  }
  for (const id of afectados) { // a quien le quitan territorio se entera y irá a revisar
    const v = ents[id - 1];
    if (v && v.vivo && !v.jugador) v.alarma = { por: e, hasta: reloj + 60 * 8 };
  }
  for (const id of afectados) podar(id); // lo que les quedó suelto, desaparece
  recontar();
  for (const o of ents) if (o !== e && o.vivo && cuenta[o.id] === 0) matar(o, e); // sin territorio = fuera
}

// Deja la estela (un círculo pequeño) en la posición de la cabeza
function sellar(e) {
  e.seq++;
  const cx = e.x | 0, cy = e.y | 0;
  for (let k = 0; k < D_RASTRO.length; k += 2) {
    const i = (cy + D_RASTRO[k + 1]) * G + cx + D_RASTRO[k];
    if (!dentro[i] || dueno[i] === e.id || rastro[i]) continue;
    rastro[i] = e.id; rastroIdx[i] = e.seq; e.cola.push(i); pix(i);
  }
  e.ruta.push(e.x, e.y);
}

// ----- Bots -----
function lim(ox, oy, x, y) { // acerca un punto a (ox,oy) hasta que quede lejos de las paredes
  for (let t = 1; t > 0; t -= 0.1) {
    const px = ox + (x - ox) * t, py = oy + (y - oy) * t;
    if (px > 2 && py > 2 && px < G - 3 && py < G - 3 && distM[(py | 0) * G + (px | 0)] >= 14) return [px, py];
  }
  return [ox, oy];
}
function esMia(e, x, y) {
  const cx = x | 0, cy = y | 0;
  return cx >= 0 && cy >= 0 && cx < G && cy < G && dueno[cy * G + cx] === e.id;
}
function libre(e, a) { // ¿puedo seguir en esta dirección sin chocar con la pared o con mi propia estela?
  const c = Math.cos(a), s = Math.sin(a);
  for (const d of [6, 12, 18]) {
    const px = e.x + c * d, py = e.y + s * d;
    if (distEn(px, py) < 7) return false;
    const i = (py | 0) * G + (px | 0);
    if (rastro[i] === e.id && e.seq - rastroIdx[i] > GRACIA) return false;
  }
  return true;
}
function casaCercana(e) { // punto de mi territorio al que volver (un poco hacia adentro)
  let mejor = 1e12, mx = e.x, my = e.y, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < G; y += 2) {
    const f = y * G;
    for (let x = 0; x < G; x += 2)
      if (dueno[f + x] === e.id) {
        n++; sx += x; sy += y;
        const d = (x - e.x) * (x - e.x) + (y - e.y) * (y - e.y);
        if (d < mejor) { mejor = d; mx = x; my = y; }
      }
  }
  if (!n) return [e.x, e.y];
  const dx = sx / n - mx, dy = sy / n - my, l = Math.hypot(dx, dy) || 1, m = Math.min(7, l);
  return [mx + dx / l * m, my + dy / l * m];
}
// Mordisco: sale directo hacia tu territorio, se mete un poco, gira y vuelve a su casa para quedarse con lo que encierre
function empezarMordisco(e) {
  const j = estado === "jugando" && yo && yo.vivo && cuenta[1] > 0 ? yo : null;
  if (!j || j.cola.length > 400) return false;
  let mejor = 1e12, mx = 0, my = 0, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < G; y += 3) {
    const f = y * G;
    for (let x = 0; x < G; x += 3)
      if (dueno[f + x] === 1) {
        n++; sx += x; sy += y;
        const d = (x - e.x) * (x - e.x) + (y - e.y) * (y - e.y);
        if (d < mejor) { mejor = d; mx = x; my = y; }
      }
  }
  if (!n || mejor > 160 * 160 || mejor < 12 * 12) return false;
  const dx = sx / n - mx, dy = sy / n - my, l = Math.hypot(dx, dy) || 1;
  const A = lim(e.x, e.y, mx + dx / l * 14, my + dy / l * 14);          // punto dentro de tu zona
  const a = Math.atan2(A[1] - e.y, A[0] - e.x), s = Math.random() < 0.5 ? 1 : -1;
  const W = 22 + Math.random() * 30;
  const B = lim(A[0], A[1], A[0] + Math.cos(a + s * Math.PI / 2) * W, A[1] + Math.sin(a + s * Math.PI / 2) * W);
  e.plan = [A, B]; e.wp = 0; e.vuelta = false; e.casa = null;
  return true;
}
function empezarPlan(e) { // excursión: salir recto, girar de lado y volver
  if (e.mordedor && Math.random() < 0.15 + 0.5 * rasgo("mordisco") * e.agr && empezarMordisco(e)) return;
  const s = Math.random() < 0.5 ? 1 : -1;
  let a = e.ang;
  const j = estado === "jugando" && yo && yo.vivo ? yo : null;
  if (j && Math.random() < 0.15 + 0.6 * e.dif * e.agr) { // a veces sale directo a rondar al jugador
    const dj = Math.hypot(j.x - e.x, j.y - e.y);
    if (dj > 20 && dj < 300) a = Math.atan2(j.y - e.y, j.x - e.x) + (Math.random() - 0.5) * 0.5;
  }
  const L = 22 + Math.random() * 60, W = 18 + Math.random() * 50;
  const A = lim(e.x, e.y, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L);
  const b = a + s * Math.PI / 2;
  const B = lim(A[0], A[1], A[0] + Math.cos(b) * W, A[1] + Math.sin(b) * W);
  e.plan = [A, B]; e.wp = 0; e.vuelta = false; e.casa = null;
}
function pensarBot(e) {
  if (!e.cola.length) { e.plan = null; e.vuelta = false; }
  let meta = e.ang;
  const larga = e.cola.length > 700;

  const dif = e.dif * (0.6 + 0.4 * e.agr); // agresividad de este bot

  // 1) DEFENSA: si alguien está dentro de su territorio o le quitó un pedazo, va a revisar y a cortarle la estela.
  //    Reacciona mucho más rápido contra el jugador que contra otros bots.
  let amenaza = null;
  for (const o of ents) if (o !== e && o.vivo && dueno[(o.y | 0) * G + (o.x | 0)] === e.id) { amenaza = o; break; }
  if (!amenaza && e.alarma && reloj < e.alarma.hasta && e.alarma.por.vivo) amenaza = e.alarma.por;
  if (amenaza && !larga && !(e.caza && e.defiende) && Math.random() < (amenaza.jugador ? 0.4 + 0.6 * dif : 0.25 * dif)) {
    e.caza = amenaza; e.cazaT = 70; e.defiende = true;
  }

  // 2) ATAQUE: sigue de cerca al jugador (bastante más que a otros bots) y le corta la estela
  if (e.caza && (!e.caza.vivo || e.cazaT-- <= 0 || larga || Math.hypot(e.caza.x - e.x, e.caza.y - e.y) > 220)) { e.caza = null; e.defiende = false; }
  if (!e.caza && !larga && e.cola.length < 350) {
    let presa = null, mejorP = 0;
    for (const o of ents) {
      if (o === e || !o.vivo || o.ruta.length < 30) continue;
      const rad = o.jugador ? 120 : 40, d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d > rad) continue;
      const pt = (o.jugador ? 3 : 1) * (1 - d / rad);
      if (pt > mejorP) { mejorP = pt; presa = o; }
    }
    const largo = presa && presa.jugador ? 1 + rasgo("acoso") * 2 * Math.min(1, presa.ruta.length / 300) : 1; // estela larga = más tentador
    if (presa && Math.random() < 0.05 * dif * (presa.jugador ? 3 : 0.5) * largo) { e.caza = presa; e.cazaT = 45; e.defiende = false; }
  }
  let cazando = false;
  if (e.caza) {
    const o = e.caza, r = o.ruta;
    let mejor = 1e12, tx = o.x, ty = o.y;
    for (let k = 0; k < r.length - 24; k += 8) {
      const d = (r[k] - e.x) * (r[k] - e.x) + (r[k + 1] - e.y) * (r[k + 1] - e.y);
      if (d < mejor) { mejor = d; tx = r[k]; ty = r[k + 1]; }
    }
    if (mejor < 1e12 || e.defiende) { meta = Math.atan2(ty - e.y, tx - e.x); cazando = true; } // sin estela que cortar: va hacia el intruso
    else { e.caza = null; e.defiende = false; }
  }

  if (!cazando) {
    if (e.cola.length && !e.plan) { e.plan = []; e.wp = 0; e.vuelta = true; e.casa = null; } // salió cazando: ahora vuelve
    if (e.plan) {
      let obj = null;
      if (!e.vuelta) {
        const w = e.plan[e.wp];
        if (Math.hypot(w[0] - e.x, w[1] - e.y) < 13) { e.wp++; if (e.wp >= e.plan.length) e.vuelta = true; }
        if (!e.vuelta) obj = e.plan[e.wp];
      }
      if (e.vuelta || larga) {
        e.vuelta = true;
        e.casa = casaCercana(e); // se recalcula en cada decisión: así no persigue un punto viejo
        obj = e.casa;
      }
      meta = Math.atan2(obj[1] - e.y, obj[0] - e.x);
    } else { // en casa: pasea y sale cuando llega a la orilla
      if (--e.vagar <= 0) { e.vagar = 8 + Math.random() * 12; e.desv = (Math.random() - 0.5) * 1.6; }
      meta = e.ang + e.desv * 0.5;
      if (!esMia(e, e.x + Math.cos(e.ang) * 10, e.y + Math.sin(e.ang) * 10) || Math.random() < 0.02 + 0.03 * e.dif) empezarPlan(e);
    }
  }

  // elegir la dirección libre más parecida a la que quiere
  let a = null;
  for (const o of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.3, -2.3]) if (libre(e, meta + o)) { a = meta + o; break; }
  e.meta = a === null ? e.ang + 1 : a;
}

// ----- Un paso de juego -----
function paso() {
  reloj++;
  for (const e of ents) {
    if (!e.vivo) continue;
    if (e.jugador) e.meta = metaTeclas !== null ? metaTeclas : metaDedo !== null ? metaDedo : e.ang;
    else if (--e.ia <= 0) { e.ia = 5; pensarBot(e); }

    // giro suave hacia la dirección deseada
    let da = e.meta - e.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    const mx = (e.jugador ? GIRO_JUGADOR : GIRO * e.gir) * SIM;
    e.ang += Math.max(-mx, Math.min(mx, da));

    e.px = e.x; e.py = e.y;
    const v = VEL * SIM * (e.jugador ? 1 : e.vel);
    e.x += Math.cos(e.ang) * v;
    e.y += Math.sin(e.ang) * v;

    const xi = e.x | 0, yi = e.y | 0, d0 = distM[yi * G + xi];
    if (d0 < MARGEN_PARED) { // tocó una pared (el borde del mapa o un hueco)
      const gx = distM[yi * G + xi + 2] - distM[yi * G + xi - 2], gy = distM[(yi + 2) * G + xi] - distM[(yi - 2) * G + xi];
      const gl = Math.hypot(gx, gy);
      if (gl < 1e-3) { matar(e, null); continue; }
      const nx = -gx / gl, ny = -gy / gl, hx = Math.cos(e.ang), hy = Math.sin(e.ang); // (nx,ny) apunta hacia la pared
      const dot = hx * nx + hy * ny;                       // 1 = de frente contra la pared, 0 = paralelo
      if (dot > COS_CHOQUE) { matar(e, null); continue; }  // muy de frente: muere
      const sale = MARGEN_PARED - d0;                      // si no, lo saca de la pared y se desliza
      e.x -= nx * sale; e.y -= ny * sale;
      if (dot > 0) e.ang = Math.atan2(hy - dot * ny, hx - dot * nx); // su rumbo se alinea con la pared
    }
    const i = (e.y | 0) * G + (e.x | 0), r = rastro[i];
    if (r) {
      if (r !== e.id) matar(ents[r - 1], e);                       // cortaste la estela de otro
      else if (e.seq - rastroIdx[i] > GRACIA) { matar(e, null); continue; } // te pisaste tu propia estela
    }
    if (dueno[i] === e.id) { if (e.cola.length) cerrar(e); }
    else sellar(e);
  }
  // choque de frente: mueren los dos si ambos van fuera de casa
  const R2 = (R_CABEZA * 2) * (R_CABEZA * 2);
  for (let a = 0; a < ents.length; a++) {
    const A = ents[a];
    if (!A.vivo || !A.cola.length) continue;
    for (let b = a + 1; b < ents.length; b++) {
      const B = ents[b];
      if (!B.vivo || !B.cola.length) continue;
      if ((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y) < R2) { matar(A, null); matar(B, null); break; }
    }
  }
  if (sucio) recontar();
}

// ----- Partida -----
function iniciar(demo) {
  dueno.fill(0); rastro.fill(0); rastroIdx.fill(0); u32A.fill(0); u32B.fill(0);
  sx0 = 0; sy0 = 0; sx1 = G - 1; sy1 = G - 1;
  fx = []; metaDedo = null;
  if (nivelConstruido !== nivelActual) { construirNivel(nivelActual); nivelConstruido = nivelActual; }
  const nBots = Math.max(1, Math.min(NUM_BOTS, NIVELES[nivelActual].bots || 4));
  ents = [];
  for (let id = 1; id <= nBots + 1; id++) ents.push(crear(id));
  yo = ents[0];
  bajas = 0; maxPct = 0; tiempo = 0;
  estado = demo ? "demo" : "jugando";
  for (const e of ents) if (!(demo && e.jugador)) aparecer(e);
  recontar();
  if (!demo) { cam.x = yo.x; cam.y = yo.y; }
}

function etiquetaNivel() {
  const nv = NIVELES[nivelActual];
  $("nivelNum").textContent = "Nivel " + (nivelActual + 1) + " de " + NIVELES.length;
  $("nivelNom").textContent = nv.nombre + " · meta " + nv.meta + " %";
  $("nivelAnt").disabled = nivelActual <= 0;
  $("nivelSig").disabled = nivelActual >= nivelMax();
  $("stNivel").textContent = "Nv " + (nivelActual + 1);
}
function elegirNivel(i) {
  if (i < 0 || i > nivelMax() || i >= NIVELES.length) return;
  nivelActual = i; ganado = false;
  iniciar(true);
  mostrarVelo("Paperio", TEXTO_AYUDA, []);
}
$("nivelAnt").addEventListener("click", () => elegirNivel(nivelActual - 1));
$("nivelSig").addEventListener("click", () => elegirNivel(nivelActual + 1));

function fmtTiempo(s) { s = Math.floor(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

async function terminar(gano) {
  estado = "fin";
  ganado = !!gano;
  if (gano) { // se detiene al jugador (conserva su territorio) y se desbloquea el siguiente nivel
    yo.vivo = false;
    for (const i of yo.cola) if (rastro[i] === 1) { rastro[i] = 0; pix(i); }
    yo.cola = []; yo.ruta = [];
    if (nivelActual + 1 < NIVELES.length && nivelActual + 1 > desbloqueado) {
      desbloqueado = nivelActual + 1;
      try { localStorage.setItem("paperio_nivel", String(desbloqueado)); } catch (e) {}
    }
  }
  const pct = Math.max(maxPct, 0);
  const puntos = Math.round(pct * PUNTOS_POR_PCT) + bajas * PUNTOS_POR_BAJA + (gano ? PUNTOS_POR_NIVEL : 0);
  if (pct > mejorPct) {
    mejorPct = pct;
    try { localStorage.setItem("paperio_mejor", String(pct)); } catch (e) {}
  }
  let guardado = "";
  if (puntos > 0 && J && usuario) {
    try { guardado = (await J.sumarPuntos(ID, puntos)) ? "guardados en tu perfil" : ""; } catch (e) { guardado = "no se pudieron guardar"; }
  } else if (puntos > 0 && !usuario) guardado = "entra con Google para guardarlos";
  setTimeout(() => {
    if (estado !== "fin") return;
    mostrarVelo(gano ? "¡Nivel superado!" : "Te eliminaron", "", [
      ["Territorio máximo", pct.toFixed(1) + " %"],
      ["Bajas", String(bajas)],
      ["Tiempo", fmtTiempo(tiempo)],
      ["Puntos", "+" + puntos + (guardado ? " (" + guardado + ")" : "")],
    ]);
    cargarRanking();
  }, 700);
}

function mostrarVelo(titulo, texto, datos) {
  $("velTitulo").textContent = titulo;
  $("velTexto").textContent = texto;
  $("velTexto").hidden = !texto;
  const ul = $("velDatos");
  ul.innerHTML = "";
  for (const [k, v] of datos) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = v;
    li.append(k + ": ", b);
    ul.appendChild(li);
  }
  $("jugar").textContent = estado === "fin" ? (ganado && nivelActual + 1 < NIVELES.length ? "Siguiente nivel" : "Jugar otra vez") : "Jugar";
  etiquetaNivel();
  marcarEntrar();
  $("velo").hidden = false;
}

function marcarEntrar() { $("entrar").hidden = !J || !!usuario; }
$("entrar").addEventListener("click", () => { if (J) J.entrar().catch((e) => alert(e.message)); });
$("jugar").addEventListener("click", () => {
  if (ganado && nivelActual + 1 < NIVELES.length) nivelActual++;
  ganado = false;
  $("velo").hidden = true; iniciar(false);
});

async function cargarRanking() {
  const caja = $("ranking");
  if (!J) return;
  try {
    const lista = await J.mejores(ID, 5);
    if (!lista.length) return;
    caja.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = "Mejores jugadores";
    const ol = document.createElement("ol");
    for (const j of lista) {
      const li = document.createElement("li");
      li.textContent = (j.nombre || "Jugador") + " · " + (j.mejor || 0) + " pts";
      ol.appendChild(li);
    }
    caja.append(h, ol);
    caja.hidden = false;
  } catch (e) {}
}

// ----- Controles -----
// Dedo / ratón: mantén pulsado y arrastra: la cabeza gira hacia donde apuntes (como una palanca flotante).
// Teclado: flechas / WASD (se pueden combinar dos para ir en diagonal).
let metaDedo = null, metaTeclas = null;
const TECLAS = { arrowup: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", a: "l", arrowright: "r", d: "r" };
const puls = new Set();
function recalcularTeclas() {
  const vx = (puls.has("r") ? 1 : 0) - (puls.has("l") ? 1 : 0), vy = (puls.has("d") ? 1 : 0) - (puls.has("u") ? 1 : 0);
  metaTeclas = vx || vy ? Math.atan2(vy, vx) : null;
}
addEventListener("keydown", (ev) => {
  const t = TECLAS[ev.key.toLowerCase()];
  if (t) { ev.preventDefault(); puls.add(t); recalcularTeclas(); }
});
addEventListener("keyup", (ev) => {
  const t = TECLAS[ev.key.toLowerCase()];
  if (t) { puls.delete(t); recalcularTeclas(); }
});
addEventListener("blur", () => { puls.clear(); metaTeclas = null; });

const RADIO_PALANCA = 60; // px: si arrastras más lejos, el punto de origen te sigue (así puedes cambiar de rumbo rápido)
let arrastra = false, ox = 0, oy = 0;
cv.addEventListener("pointerdown", (ev) => {
  arrastra = true; ox = ev.clientX; oy = ev.clientY;
  try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
});
cv.addEventListener("pointermove", (ev) => {
  if (!arrastra) return;
  const dx = ev.clientX - ox, dy = ev.clientY - oy, d = Math.hypot(dx, dy);
  if (d < 10) return;
  metaDedo = Math.atan2(dy, dx);
  if (d > RADIO_PALANCA) { ox = ev.clientX - dx / d * RADIO_PALANCA; oy = ev.clientY - dy / d * RADIO_PALANCA; }
});
const soltar = () => { arrastra = false; metaDedo = null; };
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);

// ----- Dibujo -----
function ajustar() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = Math.max(1, r.width); vh = Math.max(1, r.height);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cs = Math.max(2, Math.min(vw, vh) / CELDAS_VISTA);
}
addEventListener("resize", ajustar);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(ajustar).observe($("escena"));

const SX = (x) => (x - cam.x) * cs + vw / 2;
const SY = (y) => (y - cam.y) * cs + vh / 2;

function cuadro(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dibujar(k) {
  subirCapas();

  // fuera del mapa (azul)
  ctx.fillStyle = "#2c6e9e";
  ctx.fillRect(0, 0, vw, vh);

  // el suelo del mapa (con su sombra abajo) y, encima, territorio y estelas.
  // Todas son capas finas estiradas y suavizadas: por eso los bordes se ven redondeados.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(cvS, SX(0), SY(0) + Math.max(3, cs * 1.6), G * cs, G * cs);
  ctx.drawImage(cvM, SX(0), SY(0), G * cs, G * cs);
  ctx.drawImage(cvB, SX(0), SY(0) + Math.max(2, cs * 1.1), G * cs, G * cs);
  ctx.drawImage(cvA, SX(0), SY(0), G * cs, G * cs);

  // cabezas: cubito redondeado con ojos que miran hacia donde van
  const lado = cs * 6.2, grosor = cs * 1.4;
  ctx.textAlign = "center";
  ctx.font = "700 " + Math.max(11, Math.round(cs * 4)) + "px system-ui, sans-serif";
  for (const e of ents) {
    if (!e.vivo) continue;
    const hx = e.px + (e.x - e.px) * k, hy = e.py + (e.y - e.py) * k;
    const X = SX(hx), Y = SY(hy);
    if (X < -lado * 3 || Y < -lado * 3 || X > vw + lado * 3 || Y > vh + lado * 3) continue;
    ctx.fillStyle = e.cD;
    cuadro(X - lado / 2, Y - lado / 2 + grosor, lado, lado, lado * 0.22); ctx.fill();
    ctx.fillStyle = e.cC;
    cuadro(X - lado / 2, Y - lado / 2, lado, lado, lado * 0.22); ctx.fill();
    const fxx = Math.cos(e.ang), fyy = Math.sin(e.ang), sxx = -fyy, syy = fxx;
    const ex0 = X + fxx * lado * 0.1, ey0 = Y + fyy * lado * 0.1;
    for (const s of [-1, 1]) {
      const ex = ex0 + sxx * s * lado * 0.2, ey = ey0 + syy * s * lado * 0.2;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex, ey, lado * 0.14, 0, TAU); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(ex + fxx * lado * 0.06, ey + fyy * lado * 0.06, lado * 0.07, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(20,26,46,.85)";
    ctx.fillText(e.nombre, X, Y - lado * 0.8);
  }

  // aros al morir
  for (const f of fx) {
    ctx.strokeStyle = "hsla(" + f.tono + ",80%,50%," + Math.max(0, 1 - f.t / 0.6) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SX(f.x), SY(f.y), cs * (3 + f.t * 40), 0, TAU);
    ctx.stroke();
  }

  // marcador de los primeros lugares
  const top = ents.filter((e) => e.vivo && cuenta[e.id] > 0).sort((a, b) => cuenta[b.id] - cuenta[a.id]).slice(0, 5);
  if (top.length) {
    const ancho = 128, alto = 10 + top.length * 17, bx = vw - ancho - 8, by = 8;
    ctx.fillStyle = "rgba(20,26,46,.6)";
    ctx.fillRect(bx, by, ancho, alto);
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    top.forEach((e, n) => {
      const yy = by + 8 + n * 17;
      ctx.fillStyle = e.cT; ctx.fillRect(bx + 6, yy, 10, 10);
      ctx.fillStyle = e.jugador ? "#fff" : "#c9d0ee";
      ctx.fillText(e.nombre, bx + 22, yy + 9);
      ctx.textAlign = "right";
      ctx.fillText((cuenta[e.id] * 100 / AREA).toFixed(1) + "%", bx + ancho - 6, yy + 9);
      ctx.textAlign = "left";
    });
  }
}

// ----- Ciclo principal -----
let ultimo = 0, acum = 0, hud = "";
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, Math.max(0, (ts - ultimo) / 1000));
  ultimo = ts;
  acum += dt;
  while (acum >= SIM) { paso(); acum -= SIM; }
  if (estado === "jugando" && yo.vivo) tiempo += dt;
  for (const e of ents) if (!e.vivo && !e.jugador) { e.espera -= dt; if (e.espera <= 0) aparecer(e); }
  if (sucio) recontar();
  if (estado === "jugando" && yo.vivo && cuenta[1] * 100 / AREA >= NIVELES[nivelActual].meta) terminar(true);
  for (const f of fx) f.t += dt;
  fx = fx.filter((f) => f.t < 0.6);

  // la cámara sigue al jugador (o, mientras no juegas, al bot más grande)
  const k = acum / SIM;
  let seg = yo && yo.vivo ? yo : null;
  if (!seg) for (const e of ents) if (e.vivo && (!seg || cuenta[e.id] > cuenta[seg.id])) seg = e;
  if (seg) {
    const tx = seg.px + (seg.x - seg.px) * k, ty = seg.py + (seg.y - seg.py) * k;
    const a = seg === yo ? 1 : Math.min(1, dt * 8); // al jugador la cámara lo sigue pegada (sin retraso)
    cam.x += (tx - cam.x) * a; cam.y += (ty - cam.y) * a;
  }
  dibujar(k);

  const pct = (yo ? cuenta[1] * 100 / AREA : 0);
  const txt = [pct.toFixed(1), bajas, Math.max(mejorPct, maxPct).toFixed(1)].join("|");
  if (txt !== hud) {
    hud = txt;
    $("stTerr").textContent = "▦ " + pct.toFixed(1) + " %";
    $("stBajas").textContent = "☠ " + bajas;
    $("stMejor").textContent = "🏆 " + Math.max(mejorPct, maxPct).toFixed(1) + " %";
  }
}

ajustar();
iniciar(true);
mostrarVelo("Paperio", TEXTO_AYUDA, []);
cargarRanking();
requestAnimationFrame((ts) => { ultimo = ts; bucle(ts); });
