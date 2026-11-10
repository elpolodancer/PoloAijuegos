// Proyecto: Juegos (portal) · juego «Supervivencia»
// Ruta: supervivencia/juego-supervivencia.js
// Base del juego estilo Last Day on Earth: mapa de 50×50 casillas en vista isométrica, piso que se coloca, árboles y un personaje que camina.
// La lógica vive en un mapa plano (x, y en casillas; la casilla (i, j) ocupa x∈[i, i+1), y∈[j, j+1)) y solo se PROYECTA a rombos 2:1:
//   x crece hacia abajo-derecha · y crece hacia abajo-izquierda · z es la altura en píxeles (a escala 1 = casilla de 64 px de ancho).
// Todo lo ajustable está en las constantes de abajo. No usa Firebase ni puntos todavía (ver README-supervivencia.md).
import { crearMenuPausa } from "../compartido/menu-pausa.js";   // menú ☰ Pausa estándar (no usa Firebase: funciona sin internet)

// ---------- Ajustes ----------
const N = 50;                       // el mapa es de N×N casillas
const CLAVE = "supervivencia_mundo_v1";
const VEL = 4;                      // velocidad del personaje, casillas por segundo
const RADIO = 0.25;                 // radio del personaje para chocar con los árboles (casillas)
const GROSOR = 4;                   // grosor de una losa de piso (px a escala 1)
const PROF_BORDE = 26;              // profundidad del acantilado de tierra en el borde sur del mapa (px a escala 1)
const ZOOM_MIN = 0.55, ZOOM_MAX = 1.8;
const CAMARA_SUAVE = 6;             // qué tan rápido la cámara alcanza al personaje
const AUTOGUARDADO_MS = 10000;      // si solo te moviste, se guarda la posición cada tanto (los cambios al mapa se guardan casi al instante)
const SPAWN = { x: N / 2 + 0.5, y: N / 2 + 0.5 };   // donde empieza el personaje: el centro del mapa

// Pisos (id guardado en el mapa: 0 = nada/césped)
const PISOS = {
  1: { top: "#c58f52", alt: "#bb8647", lado1: "#8f5e2c", lado2: "#74491f" },   // madera
  2: { top: "#a7acb3", alt: "#9ca1a8", lado1: "#7d828a", lado2: "#666b72" },   // piedra
  3: { top: "#e7edf5", alt: "#86abd8", lado1: "#b4bdc9", lado2: "#98a2b0" },   // baldosa
};
const PISO_DE = { madera: 1, piedra: 2, baldosa: 3 };
const NOMBRE_HERR = {
  mover: "✋ Mover", madera: "Piso de madera", piedra: "Piso de piedra", baldosa: "Piso de baldosas",
  quitar: "🧽 Quitar piso", arbol: "🌳 Plantar / talar árbol",
};
const CESPED = ["#7bb661", "#74ae5b", "#82bd68"], CESPED_OSC = ["#4f7d45", "#4a763f", "#55854a"];

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo"), ctx = lienzo.getContext("2d");
const btnMenu = document.getElementById("btnMenu");
const chipHerr = document.getElementById("chipHerr");
const barra = document.getElementById("herramientas");
const ayuda = document.getElementById("ayudaMapa");
const info = document.getElementById("info");
const raiz = document.documentElement;

// ---------- Estado ----------
const piso = new Uint8Array(N * N);        // 0 = sin piso; 1 madera; 2 piedra; 3 baldosa   (índice = j * N + i)
const arboles = new Uint8Array(N * N);     // 0 = sin árbol; 1 roble; 2 pino
const jugador = { x: SPAWN.x, y: SPAWN.y, fx: 1, mov: false, paso: 0 };
let camX = jugador.x, camY = jugador.y;
let W = 0, H = 0, dpr = 1, base = 64, zoom = 1, TW = 64, TH = 32, U = 1;
let ruta = null, marca = null;             // camino que sigue el personaje y anillo que marca el destino
let herramienta = "mover", modoArbol = "poner";
let pausado = false, hover = null;
let sucio = false, ultCambio = 0, ultGuardado = 0, movido = false;
const teclas = {};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dentro = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const bloqueado = (i, j) => !dentro(i, j) || arboles[j * N + i] !== 0;
function hash(i, j) {
  let h = Math.imul(i + 1, 374761393) ^ Math.imul(j + 1, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---------- Mundo: generar, guardar, cargar ----------
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Pocos árboles sueltos y algunos bosquecillos; el centro (donde empieza el personaje) queda despejado
function generarMundo() {
  piso.fill(0); arboles.fill(0);
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  const s = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (Math.hypot(i + 0.5 - SPAWN.x, j + 0.5 - SPAWN.y) < 3.5) continue;
    const n = (Math.sin(i * 0.37 + s[0]) + Math.sin(j * 0.29 + s[1]) + Math.sin((i + j) * 0.21 + s[2]) + Math.sin((i - j) * 0.17 + s[3])) / 4;
    if (rnd() < (n > 0.3 ? 0.28 : 0.03)) arboles[j * N + i] = rnd() < 0.5 ? 1 : 2;
  }
  jugador.x = SPAWN.x; jugador.y = SPAWN.y; ruta = null; marca = null;
  camX = jugador.x; camY = jugador.y;
}
function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({
      v: 1, piso: Array.from(piso).join(""), arboles: Array.from(arboles).join(""),
      x: +jugador.x.toFixed(2), y: +jugador.y.toFixed(2), t: Date.now(),
    }));
    sucio = false; movido = false; ultGuardado = performance.now();
    return true;
  } catch (e) { return false; }
}
function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (!d || d.v !== 1 || typeof d.piso !== "string" || typeof d.arboles !== "string" || d.piso.length !== N * N || d.arboles.length !== N * N) return false;
    for (let k = 0; k < N * N; k++) {
      const p = +d.piso[k], a = +d.arboles[k];
      piso[k] = p >= 0 && p <= 3 ? p : 0;
      arboles[k] = a >= 0 && a <= 2 ? a : 0;
    }
    const x = Number(d.x), y = Number(d.y);
    if (Number.isFinite(x) && Number.isFinite(y) && libre(x, y)) { jugador.x = x; jugador.y = y; }
    else colocarEnLibre();
    return true;
  } catch (e) { return false; }
}
function colocarEnLibre() {   // si el guardado dejó al personaje dentro de un árbol, lo pone en la casilla libre más cercana al centro
  let mejor = null, d2 = 1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!libre(i + 0.5, j + 0.5)) continue;
    const d = Math.hypot(i + 0.5 - SPAWN.x, j + 0.5 - SPAWN.y);
    if (d < d2) { d2 = d; mejor = { x: i + 0.5, y: j + 0.5 }; }
  }
  if (mejor) { jugador.x = mejor.x; jugador.y = mejor.y; }
}
function cambio() { sucio = true; ultCambio = performance.now(); }

// ---------- Choques y rutas ----------
function libre(x, y) {
  for (const sx of [-RADIO, RADIO]) for (const sy of [-RADIO, RADIO]) if (bloqueado(Math.floor(x + sx), Math.floor(y + sy))) return false;
  return true;
}
function lineaLibre(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), pasos = Math.max(1, Math.ceil(d / 0.15));
  for (let s = 1; s <= pasos; s++) if (!libre(a.x + ((b.x - a.x) * s) / pasos, a.y + ((b.y - a.y) * s) / pasos)) return false;
  return true;
}
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Búsqueda en anchura (50×50 = 2500 casillas: es instantánea). Devuelve los centros de las casillas del camino o null
function buscarRuta(ti, tj) {
  const si = Math.floor(jugador.x), sj = Math.floor(jugador.y);
  if (si === ti && sj === tj) return [{ x: ti + 0.5, y: tj + 0.5 }];
  const prev = new Int16Array(N * N).fill(-2), cola = new Int16Array(N * N);
  const s = sj * N + si, meta = tj * N + ti;
  let a = 0, b = 0;
  prev[s] = -1; cola[b++] = s;
  while (a < b) {
    const c = cola[a++];
    if (c === meta) break;
    const ci = c % N, cj = (c / N) | 0;
    for (const [di, dj] of D4) {
      const ni = ci + di, nj = cj + dj;
      if (bloqueado(ni, nj)) continue;
      const k = nj * N + ni;
      if (prev[k] !== -2) continue;
      prev[k] = c; cola[b++] = k;
    }
  }
  if (prev[meta] === -2) return null;
  const r = [];
  for (let c = meta; c !== s; c = prev[c]) r.push({ x: (c % N) + 0.5, y: ((c / N) | 0) + 0.5 });
  return r.reverse();
}
// Quita los zigzags de la cuadrícula: salta a la casilla más lejana a la que se llega en línea recta
function suavizar(r) {
  const out = [];
  let a = { x: jugador.x, y: jugador.y }, i = 0;
  while (i < r.length) {
    let k = r.length - 1;
    while (k > i && !lineaLibre(a, r[k])) k--;
    out.push(r[k]); a = r[k]; i = k + 1;
  }
  return out;
}
function irA(wx, wy) {
  let ti = Math.floor(wx), tj = Math.floor(wy);
  if (!dentro(ti, tj)) return;
  if (bloqueado(ti, tj)) {   // tocaste un árbol: va a la casilla libre más cercana
    let mejor = null, d2 = 1e9;
    for (let r = 1; r <= 4 && !mejor; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r || bloqueado(ti + di, tj + dj)) continue;
      const d = Math.hypot(ti + di + 0.5 - wx, tj + dj + 0.5 - wy);
      if (d < d2) { d2 = d; mejor = { i: ti + di, j: tj + dj }; }
    }
    if (!mejor) return;
    ti = mejor.i; tj = mejor.j;
  }
  const r = buscarRuta(ti, tj);
  if (!r) return;
  ruta = suavizar(r);
  marca = { x: ti + 0.5, y: tj + 0.5, t: 0 };
}
function chocaJugador(i, j) {   // ¿la casilla se cruza con el cuerpo del personaje?
  return jugador.x + RADIO > i && jugador.x - RADIO < i + 1 && jugador.y + RADIO > j && jugador.y - RADIO < j + 1;
}

// ---------- Movimiento ----------
function mover(ax, ay) {
  let m = false;
  if (ax && libre(jugador.x + ax, jugador.y)) { jugador.x += ax; m = true; }
  if (ay && libre(jugador.x, jugador.y + ay)) { jugador.y += ay; m = true; }
  if (m) {
    movido = true; jugador.mov = true;
    const sx = ax - ay;                       // hacia dónde va en la pantalla (derecha/izquierda)
    if (Math.abs(sx) > 1e-6) jugador.fx = sx > 0 ? 1 : -1;
  }
}
function actualizar(dt) {
  jugador.mov = false;
  let dx = 0, dy = 0;
  // En pantalla «arriba» es (−1, −1) del mapa, «derecha» es (+1, −1), «abajo» (+1, +1) e «izquierda» (−1, +1)
  if (teclas.arrowup || teclas.w) { dx -= 1; dy -= 1; }
  if (teclas.arrowdown || teclas.s) { dx += 1; dy += 1; }
  if (teclas.arrowleft || teclas.a) { dx -= 1; dy += 1; }
  if (teclas.arrowright || teclas.d) { dx += 1; dy -= 1; }
  if (dx || dy) {
    ruta = null; marca = null;
    const l = Math.hypot(dx, dy);
    mover((dx / l) * VEL * dt, (dy / l) * VEL * dt);
  } else if (ruta && ruta.length) {
    const t = ruta[0], vx = t.x - jugador.x, vy = t.y - jugador.y, d = Math.hypot(vx, vy);
    if (d < 0.08) ruta.shift();
    else { const p = Math.min(d, VEL * dt); mover((vx / d) * p, (vy / d) * p); }
    if (!ruta.length) { ruta = null; }
  }
  if (jugador.mov) jugador.paso += dt * VEL * 2.6;
  if (marca) { marca.t += dt; if (!ruta && marca.t > 0.7) marca = null; }
}

// ---------- Proyección isométrica ----------
const SX = (x, y) => (x - y - camX + camY) * (TW / 2) + W / 2;
const SY = (x, y, z = 0) => (x + y - camX - camY) * (TH / 2) + H / 2 - z * U;
function aMundo(sx, sy) {   // lo contrario de SX/SY (z = 0)
  const a = (sx - W / 2) / (TW / 2) + (camX - camY), b = (sy - H / 2) / (TH / 2) + (camX + camY);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
function ajustar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = lienzo.clientWidth; H = lienzo.clientHeight;
  lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
  base = clamp(Math.min(W, H * 1.3) / 8, 52, 88);   // ≈ 8 casillas de ancho en cualquier pantalla
}
window.addEventListener("resize", ajustar);

// ---------- Dibujo ----------
function poli(pts, relleno, borde) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
}
function diamante(i, j, z, w = 1) {   // rombo de la casilla (i, j) a la altura z (w = lado, por si se dibuja un cuarto de casilla)
  ctx.beginPath();
  ctx.moveTo(SX(i, j), SY(i, j, z)); ctx.lineTo(SX(i + w, j), SY(i + w, j, z));
  ctx.lineTo(SX(i + w, j + w), SY(i + w, j + w, z)); ctx.lineTo(SX(i, j + w), SY(i, j + w, z));
  ctx.closePath();
}
function trazo(x0, y0, x1, y1, z, col, ancho = 1) {   // línea sobre el suelo, en coordenadas del mapa
  ctx.strokeStyle = col; ctx.lineWidth = ancho;
  ctx.beginPath(); ctx.moveTo(SX(x0, y0), SY(x0, y0, z)); ctx.lineTo(SX(x1, y1), SY(x1, y1, z)); ctx.stroke();
}
function caja(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function elipse(x, y, rx, ry, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function circulo(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function dibujarCesped(i, j, oscura) {
  const h = hash(i, j), col = (oscura ? CESPED_OSC : CESPED)[h % 3];
  diamante(i, j, 0);
  ctx.fillStyle = col; ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();   // el borde del mismo color tapa las rendijas entre rombos
  if (h % 7 === 0) {   // matitas de pasto
    const x = SX(i + 0.5, j + 0.5), y = SY(i + 0.5, j + 0.5);
    ctx.strokeStyle = oscura ? "#3d6636" : "#5c9a49"; ctx.lineWidth = Math.max(1, U * 1.6);
    ctx.beginPath();
    for (const o of [-6, 0, 6]) { ctx.moveTo(x + o * U, y + 2 * U); ctx.lineTo(x + (o - 2) * U, y - 3 * U); }
    ctx.stroke();
  }
}
function dibujarPiso(i, j, p) {
  const t = PISOS[p], g = GROSOR, h = hash(i, j);
  poli([SX(i, j + 1), SY(i, j + 1, g), SX(i + 1, j + 1), SY(i + 1, j + 1, g), SX(i + 1, j + 1), SY(i + 1, j + 1, 0), SX(i, j + 1), SY(i, j + 1, 0)], t.lado1, "rgba(0,0,0,.2)");
  poli([SX(i + 1, j), SY(i + 1, j, g), SX(i + 1, j + 1), SY(i + 1, j + 1, g), SX(i + 1, j + 1), SY(i + 1, j + 1, 0), SX(i + 1, j), SY(i + 1, j, 0)], t.lado2, "rgba(0,0,0,.2)");
  diamante(i, j, g);
  ctx.fillStyle = p === 1 && h % 2 ? t.alt : t.top; ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 1; ctx.stroke();
  if (p === 1) {          // tablones
    for (const m of [0.25, 0.5, 0.75]) trazo(i, j + m, i + 1, j + m, g, "rgba(60,30,5,.35)");
  } else if (p === 2) {   // adoquines en hileras desencontradas
    trazo(i, j + 0.5, i + 1, j + 0.5, g, "rgba(40,44,50,.4)");
    trazo(i + 0.5, j, i + 0.5, j + 0.5, g, "rgba(40,44,50,.4)");
    trazo(i + 0.25, j + 0.5, i + 0.25, j + 1, g, "rgba(40,44,50,.4)");
    trazo(i + 0.75, j + 0.5, i + 0.75, j + 1, g, "rgba(40,44,50,.4)");
  } else {                // baldosas en tablero
    for (const [a, b] of [[0, 0], [0.5, 0.5]]) { diamante(i + a, j + b, g, 0.5); ctx.fillStyle = t.alt; ctx.fill(); }
  }
}
function dibujarArbol(i, j, tipo) {
  const x = SX(i + 0.5, j + 0.5), y = SY(i + 0.5, j + 0.5), u = U * (0.92 + (hash(i, j) % 28) / 100);
  elipse(x, y + 1 * u, 19 * u, 9 * u, "rgba(0,0,0,.22)");
  ctx.fillStyle = "#7a4f2a"; ctx.fillRect(x - 4 * u, y - 28 * u, 8 * u, 28 * u);
  ctx.fillStyle = "#5f3d20"; ctx.fillRect(x + 0.5 * u, y - 28 * u, 3.5 * u, 28 * u);
  if (tipo === 1) {   // roble
    circulo(x, y - 40 * u, 21 * u, "#3f8f3a");
    circulo(x - 11 * u, y - 31 * u, 14 * u, "#4aa043");
    circulo(x + 12 * u, y - 33 * u, 15 * u, "#379033");
    circulo(x - 6 * u, y - 47 * u, 9 * u, "rgba(120,200,95,.55)");
  } else {            // pino
    const pisos = [[-18, 23, 26, "#2f6f3f"], [-34, 19, 25, "#388049"], [-50, 14, 24, "#43915a"]];
    for (const [yb, w, hh, col] of pisos) {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(x - w * u, y + yb * u); ctx.lineTo(x + w * u, y + yb * u); ctx.lineTo(x, y + (yb - hh) * u); ctx.closePath(); ctx.fill();
    }
  }
}
function dibujarJugador() {
  const i = Math.floor(jugador.x), j = Math.floor(jugador.y);
  const z = dentro(i, j) && piso[j * N + i] ? GROSOR : 0;
  const x = SX(jugador.x, jugador.y), y = SY(jugador.x, jugador.y, z), u = U, f = jugador.fx;
  const s = jugador.mov ? Math.sin(jugador.paso) : 0, bob = jugador.mov ? Math.abs(s) * 2 * u : 0;
  elipse(x, y, 10 * u, 5 * u, "rgba(0,0,0,.25)");
  // piernas (se levantan una y otra al caminar)
  ctx.fillStyle = "#33415c";
  ctx.fillRect(x - 6 * u, y - 11 * u - Math.max(0, s) * 3 * u, 5 * u, 11 * u);
  ctx.fillRect(x + 1 * u, y - 11 * u - Math.max(0, -s) * 3 * u, 5 * u, 11 * u);
  // mochila (detrás del cuerpo), torso, cinturón
  ctx.fillStyle = "#7a5c2e"; caja(x - f * 11 * u - 4 * u, y - 25 * u - bob, 8 * u, 14 * u, 3 * u); ctx.fill();
  ctx.fillStyle = "#4a7fb5"; caja(x - 7.5 * u, y - 27 * u - bob, 15 * u, 17 * u, 5 * u); ctx.fill();
  ctx.fillStyle = "#2d2f36"; ctx.fillRect(x - 7.5 * u, y - 14 * u - bob, 15 * u, 2.5 * u);
  // cabeza, pelo y ojo
  circulo(x, y - 35 * u - bob, 7.5 * u, "#f0c9a0");
  ctx.fillStyle = "#3a2a1c"; ctx.beginPath(); ctx.arc(x, y - 36 * u - bob, 7.8 * u, Math.PI, 0); ctx.fill();
  circulo(x + f * 3 * u, y - 34 * u - bob, 1.3 * u, "#2b1a3a");
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);   // transparente: fuera del mapa se ve la madera
  TW = base * zoom; TH = TW / 2; U = TW / 64;
  const oscura = raiz.classList.contains("oscura");
  const D = PROF_BORDE * U;

  // Borde de tierra al sur del mapa (las dos caras que se ven)
  poli([SX(N, 0), SY(N, 0), SX(N, N), SY(N, N), SX(N, N), SY(N, N) + D, SX(N, 0), SY(N, 0) + D], oscura ? "#4a3220" : "#6b4a2b", "rgba(0,0,0,.3)");
  poli([SX(0, N), SY(0, N), SX(N, N), SY(N, N), SX(N, N), SY(N, N) + D, SX(0, N), SY(0, N) + D], oscura ? "#5c3f29" : "#85603a", "rgba(0,0,0,.3)");

  // Suelo, de atrás hacia adelante (por diagonales); se anotan las casillas visibles y los árboles que se ven
  const visibles = [], ents = [];
  for (let d = 0; d <= 2 * N - 2; d++) {
    for (let i = Math.max(0, d - N + 1); i <= Math.min(N - 1, d); i++) {
      const j = d - i, cx = SX(i + 0.5, j + 0.5), cy = SY(i + 0.5, j + 0.5);
      if (cx < -TW || cx > W + TW || cy < -TH * 4 || cy > H + TH * 4) continue;
      const k = j * N + i;
      visibles.push(i, j);
      if (piso[k]) dibujarPiso(i, j, piso[k]); else dibujarCesped(i, j, oscura);
      if (arboles[k]) ents.push({ k: i + j + 1, arbol: arboles[k], i, j });
    }
  }
  // Cuadrícula de ayuda mientras se construye
  if (herramienta !== "mover") {
    ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1;
    for (let v = 0; v < visibles.length; v += 2) {
      const i = visibles[v], j = visibles[v + 1];
      diamante(i, j, piso[j * N + i] ? GROSOR : 0); ctx.stroke();
    }
  }
  // Casilla señalada (ratón o último toque)
  if (herramienta !== "mover" && hover && dentro(hover.i, hover.j)) {
    diamante(hover.i, hover.j, piso[hover.j * N + hover.i] ? GROSOR : 0);
    ctx.fillStyle = "rgba(255,255,255,.28)"; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
  }
  // Anillo del destino al caminar
  if (marca) {
    const x = SX(marca.x, marca.y), y = SY(marca.x, marca.y), r = (10 + Math.min(marca.t, 0.7) * 10) * U;
    ctx.strokeStyle = "rgba(255,255,255," + (0.9 - Math.min(marca.t, 0.7) * 0.6) + ")"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x, y, r, r / 2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Árboles y personaje, ordenados por profundidad (más al sur-este = más adelante)
  ents.push({ k: jugador.x + jugador.y, jugador: true });
  ents.sort((a, b) => a.k - b.k);
  for (const e of ents) { if (e.jugador) dibujarJugador(); else dibujarArbol(e.i, e.j, e.arbol); }
}

// ---------- Construir: piso y árboles ----------
let avisoT = 0;
function avisar(txt) {
  ayuda.textContent = txt; ayuda.classList.remove("fuera");
  clearTimeout(avisoT); avisoT = setTimeout(() => ayuda.classList.add("fuera"), 2600);
}
function aplicar(i, j, inicio) {
  if (!dentro(i, j)) return;
  const k = j * N + i;
  if (herramienta in PISO_DE) {
    if (arboles[k]) { if (inicio) avisar("Hay un árbol: tálalo primero (🌳)."); return; }
    if (piso[k] !== PISO_DE[herramienta]) { piso[k] = PISO_DE[herramienta]; cambio(); }
  } else if (herramienta === "quitar") {
    if (piso[k]) { piso[k] = 0; cambio(); }
  } else if (herramienta === "arbol") {
    if (modoArbol === "quitar") { if (arboles[k]) { arboles[k] = 0; cambio(); } return; }
    if (arboles[k]) return;
    if (piso[k]) { if (inicio) avisar("Quita el piso primero para plantar aquí (🧽)."); return; }
    if (chocaJugador(i, j)) { if (inicio) avisar("Ahí estás parado tú."); return; }
    arboles[k] = (hash(i, j) >>> 3) % 2 + 1; cambio();
    if (ruta) { ruta = null; marca = null; }   // el camino pudo quedar tapado
  }
}
function elegirHerramienta(h) {
  herramienta = h; hover = null;
  chipHerr.textContent = NOMBRE_HERR[h];
  for (const b of barra.querySelectorAll("[data-h]")) {
    const on = b.dataset.h === h;
    b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
  }
}
barra.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-h]");
  if (b) elegirHerramienta(b.dataset.h);
});

// ---------- Entrada ----------
const punteros = new Map();
let pinch = null, ignorar = false, pulsando = false, ultCasilla = -1, ultDestino = -1;
const posRel = (ev) => { const r = lienzo.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
function accion(ev, inicio) {
  const p = posRel(ev), w = aMundo(p.x, p.y), i = Math.floor(w.x), j = Math.floor(w.y);
  if (!dentro(i, j)) return;
  const k = j * N + i;
  if (herramienta === "mover") {
    if (k === ultDestino) return;
    ultDestino = k; irA(w.x, w.y);
  } else {
    hover = { i, j };
    if (k === ultCasilla) return;
    ultCasilla = k;
    if (inicio && herramienta === "arbol") modoArbol = arboles[k] ? "quitar" : "poner";
    aplicar(i, j, inicio);
  }
}
lienzo.addEventListener("pointerdown", (ev) => {
  try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
  punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (punteros.size === 2) {   // dos dedos: zoom
    const [a, b] = [...punteros.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: zoom };
    ignorar = true; pulsando = false;
    return;
  }
  if (punteros.size > 2 || ignorar || pausado) return;
  pulsando = true; ultCasilla = -1; ultDestino = -1;
  ayuda.classList.add("fuera");
  accion(ev, true);
});
lienzo.addEventListener("pointermove", (ev) => {
  if (punteros.has(ev.pointerId)) punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && punteros.size >= 2) {
    const [a, b] = [...punteros.values()];
    zoom = clamp((pinch.z0 * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.d0, ZOOM_MIN, ZOOM_MAX);
    return;
  }
  if (pulsando && !pausado) { accion(ev, false); return; }
  if (ev.pointerType === "mouse" && herramienta !== "mover") {
    const p = posRel(ev), w = aMundo(p.x, p.y);
    hover = { i: Math.floor(w.x), j: Math.floor(w.y) };
  }
});
function finPuntero(ev) {
  punteros.delete(ev.pointerId);
  if (punteros.size < 2) pinch = null;
  if (punteros.size === 0) { pulsando = false; ignorar = false; }
  if (ev.pointerType !== "mouse") hover = null;
}
lienzo.addEventListener("pointerup", finPuntero);
lienzo.addEventListener("pointercancel", finPuntero);
lienzo.addEventListener("pointerleave", (ev) => { if (ev.pointerType === "mouse") hover = null; });
lienzo.addEventListener("wheel", (ev) => {
  ev.preventDefault();
  zoom = clamp(zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1), ZOOM_MIN, ZOOM_MAX);
}, { passive: false });

window.addEventListener("keydown", (ev) => {
  if (pausado || !info.hidden) return;
  const k = ev.key.toLowerCase();
  if (k.startsWith("arrow")) ev.preventDefault();
  teclas[k] = true;
});
window.addEventListener("keyup", (ev) => { teclas[ev.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

// ---------- ☰ Pausa (estándar: compartido/menu-pausa.js) ----------
let armado = 0;   // «Mundo nuevo» pide tocar dos veces para no borrar por accidente
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => info.hidden,
  alAbrir: () => { pausado = true; pulsando = false; ruta = null; marca = null; for (const k in teclas) teclas[k] = false; guardar(); },
  alContinuar: () => { pausado = false; },
  extras: () => [
    { icono: "ℹ️", texto: "Info", clase: "b-azul", alElegir: () => { info.hidden = false; } },   // el juego sigue en pausa mientras lees
    { icono: "🌱", texto: armado ? "⚠️ ¿Seguro? Toca otra vez" : "Mundo nuevo", clase: "b-oro", ayuda: "Borra tu piso y genera árboles nuevos. No se puede deshacer.", alElegir: () => {
      if (!armado) { armado = setTimeout(() => { armado = 0; }, 3500); pausa.abrir(); return; }
      clearTimeout(armado); armado = 0;
      generarMundo(); guardar(); pausado = false;
    } },
  ],
  ayudaSalir: "Se guarda tu mundo y vuelves al portal.",
  alSalir: () => { guardar(); location.href = "../"; },
});
function cerrarInfo() { info.hidden = true; pausa.abrir(); }
document.getElementById("infoVolver").addEventListener("click", cerrarInfo);
window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !info.hidden) { ev.preventDefault(); cerrarInfo(); } });

// ---------- Bucle ----------
let ultimo = 0;
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;
  if (!pausado) actualizar(dt);
  const f = Math.min(1, dt * CAMARA_SUAVE);
  camX += (jugador.x - camX) * f; camY += (jugador.y - camY) * f;
  if (sucio && ahora - ultCambio > 800) guardar();
  else if (movido && ahora - ultGuardado > AUTOGUARDADO_MS) guardar();
  dibujar();
  requestAnimationFrame(bucle);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") guardar(); });
addEventListener("pagehide", () => guardar());

// ---------- Arranque ----------
if (!cargar()) { generarMundo(); guardar(); }
camX = jugador.x; camY = jugador.y;
elegirHerramienta("mover");
ajustar();
setTimeout(() => ayuda.classList.add("fuera"), 9000);
requestAnimationFrame((t) => { ultimo = t; ultGuardado = t; bucle(t); });
