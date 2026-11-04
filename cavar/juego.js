// Ruta: cavar/juego.js
// «Cavar»: un terreno con una casita (solo decorativa) y una zona de excavación. Se cava un hoyo hacia abajo,
// se juntan minerales de $1, $2, $5, $10, $20, $50 y $100 y se venden en la caja. Las reglas están en logica.js.
import {
  ANCHO, ALTO, FILA_SUELO, PROFUNDIDAD, ZONA_X0, ZONA_X1, CAJA_X, INICIO_X, T, CAPAS, MINERALES, MEJORAS, COSTO_CUERDA,
  capaDe, generarMundo, idx, dentro, enZona, profundidad, pasable, cavable, cavarCelda, iluminar, tiempoCavar,
  velPala, capacidad, radioLuz, costoSiguiente, comprarMejora, comprarCuerda, estadoNuevo,
  bolsaCantidad, bolsaValor, bolsaLlena, recoger, venderTodo, mapaAB64, aplicarMapaB64,
} from "./logica.js";

// ----- Ajustes -----
const ID = "cavar";
const MOVER_S = 0.11;          // segundos para pasar a una casilla libre
const PUNTOS_LOTE = 10;        // puntos que se juntan antes de enviarlos al perfil
const AUTOGUARDADO_MS = 5000;
const CLAVE = "cavar_partida";
const CLAVE_SONIDO = "cavar_sonido";

const $ = (id) => document.getElementById(id);
const cv = $("lienzo");
const ctx = cv.getContext("2d");
const reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ----- Pantalla -----
let W = 300, H = 300, S = 40, DPR = 1;
function ajustar() {
  const r = cv.parentElement.getBoundingClientRect();
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(200, Math.floor(r.width));
  H = Math.max(200, Math.floor(r.height));
  cv.width = W * DPR;
  cv.height = H * DPR;
  S = Math.max(32, Math.min(56, Math.round(Math.min(W / 9.5, H / 11))));
}
addEventListener("resize", ajustar);

// ----- Partida -----
let est, mundo;
const jug = { x: INICIO_X, y: FILA_SUELO, mov: null, cara: 1, cavando: null };
const cam = { x: 0, y: 0 };
let parts = [], flot = [];
let pausa = false, sucio = false, tv = 0, tickSonido = 0, ultimoAviso = 0;
let sumar = null;
import("../compartido/jugador.js").then((m) => { sumar = m.sumarPuntos; }).catch(() => {});

function nuevaPartida() {
  est = estadoNuevo();
  mundo = generarMundo(est.semilla);
  jug.x = INICIO_X; jug.y = FILA_SUELO; jug.mov = null; jug.cavando = null;
  parts = []; flot = [];
  iluminar(mundo, jug.x, jug.y, radioLuz(est));
  sucio = true;
}

function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE));
    if (!s || s.v !== 1 || !s.est) return false;
    const base = estadoNuevo(s.est.semilla);
    est = Object.assign(base, s.est);
    mundo = generarMundo(est.semilla);
    if (!aplicarMapaB64(mundo, s.mapa)) return false;
    const x = s.jx | 0, y = s.jy | 0;
    if (pasable(mundo, x, y)) { jug.x = x; jug.y = y; } else { jug.x = INICIO_X; jug.y = FILA_SUELO; }
    return true;
  } catch (e) {
    return false;
  }
}

function guardar() {
  if (!sucio) return;
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ v: 1, est, jx: jug.x, jy: jug.y, mapa: mapaAB64(mundo) }));
    sucio = false;
  } catch (e) {}
}

// Puntos al perfil: 1 por cada DOLARES_POR_PUNTO dólares vendidos, en lotes
function enviar(forzar) {
  if (!sumar) return;
  let n = Math.floor(est.ptsPend);
  if (n < 1 || (!forzar && n < PUNTOS_LOTE)) return;
  est.ptsPend -= n;
  sucio = true;
  while (n > 0) {
    const c = Math.min(n, 1000);
    n -= c;
    try { const r = sumar(ID, c); if (r && r.catch) r.catch(() => {}); } catch (e) {}
  }
}

// ----- Sonido (WebAudio, sin archivos) -----
let ac = null;
let sonando = true;
try { sonando = localStorage.getItem(CLAVE_SONIDO) !== "0"; } catch (e) {}
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}
function tono(f, dur, tipo = "square", vol = 0.05, f2 = 0, retraso = 0) {
  if (!sonando || !ac) return;
  const t0 = ac.currentTime + retraso;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const sTic = () => tono(110 + Math.random() * 50, 0.06, "triangle", 0.06);
const sRoto = () => tono(90, 0.12, "triangle", 0.08, 50);
const sMineral = (i) => { const f = 520 * Math.pow(1.19, i); tono(f, 0.09, "square", 0.05); tono(f * 1.5, 0.14, "square", 0.05, 0, 0.08); };
const sVenta = () => [1047, 1319, 1568, 2093].forEach((f, k) => tono(f, 0.12, "square", 0.045, 0, k * 0.07));
const sCompra = () => { tono(660, 0.1, "triangle", 0.07); tono(990, 0.18, "triangle", 0.07, 0, 0.09); };
const sError = () => tono(140, 0.18, "sawtooth", 0.05, 90);
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, audio, { passive: true });

// ----- HUD -----
const fmt = (n) => "$" + (Math.round(n * 100) / 100).toLocaleString("es-MX");
function hud() {
  $("dinero").textContent = fmt(est.dinero);
  $("prof").textContent = profundidad(jug.y) + " m";
  const n = bolsaCantidad(est), cap = capacidad(est);
  $("bolsa").textContent = n + "/" + cap;
  $("bolsaValor").textContent = fmt(bolsaValor(est));
  $("barraBolsa").style.width = Math.min(100, (n / cap) * 100) + "%";
  $("barraBolsa").classList.toggle("llena", n >= cap);
  $("btnCuerda").hidden = !est.cuerda;
  $("btnSonido").textContent = sonando ? "🔊" : "🔇";
}
let tAviso = 0;
function aviso(txt, ms = 2200) {
  const a = $("aviso");
  a.textContent = txt;
  a.classList.add("ver");
  clearTimeout(tAviso);
  tAviso = setTimeout(() => a.classList.remove("ver"), ms);
}

// ----- Entrada -----
const DIRS = { arriba: { x: 0, y: -1 }, abajo: { x: 0, y: 1 }, izq: { x: -1, y: 0 }, der: { x: 1, y: 0 } };
const TECLAS = { ArrowUp: "arriba", w: "arriba", ArrowDown: "abajo", s: "abajo", ArrowLeft: "izq", a: "izq", ArrowRight: "der", d: "der" };
let dirPuntero = null, dirPad = null;
const teclasAbajo = [];
const dirActual = () => dirPuntero || dirPad || (teclasAbajo.length ? DIRS[teclasAbajo[teclasAbajo.length - 1]] : null);
function limpiarEntrada() { dirPuntero = null; dirPad = null; teclasAbajo.length = 0; document.querySelectorAll("#pad button").forEach((b) => b.classList.remove("activo")); }

addEventListener("keydown", (e) => {
  if (pausa || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k) return;
  e.preventDefault();
  if (!teclasAbajo.includes(k)) teclasAbajo.push(k);
});
addEventListener("keyup", (e) => {
  const k = TECLAS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  const i = teclasAbajo.indexOf(k);
  if (i >= 0) teclasAbajo.splice(i, 1);
});
addEventListener("blur", limpiarEntrada);

// Mantener pulsado en el terreno: va hacia donde tocas (respecto al jugador)
function dirDesdePuntero(e) {
  const r = cv.getBoundingClientRect();
  const p = posJug();
  const dx = e.clientX - r.left - (Math.round((p.rx - cam.x) * S) + S / 2);
  const dy = e.clientY - r.top - (Math.round((p.ry - cam.y) * S) + S / 2);
  if (Math.abs(dx) < S * 0.35 && Math.abs(dy) < S * 0.35) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? DIRS.der : DIRS.izq;
  return dy > 0 ? DIRS.abajo : DIRS.arriba;
}
cv.addEventListener("pointerdown", (e) => { if (pausa) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} dirPuntero = dirDesdePuntero(e); });
cv.addEventListener("pointermove", (e) => { if (dirPuntero) dirPuntero = dirDesdePuntero(e); });
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) cv.addEventListener(ev, () => { dirPuntero = null; });

document.querySelectorAll("#pad button").forEach((b) => {
  const d = DIRS[b.dataset.d];
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} dirPad = d; b.classList.add("activo"); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { if (dirPad === d) dirPad = null; b.classList.remove("activo"); });
  b.addEventListener("contextmenu", (e) => e.preventDefault());
});

// ----- Efectos -----
function chispas(wx, wy, color, n) {
  for (let i = 0; i < n; i++) {
    parts.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, vida: 0.5 + Math.random() * 0.4, color, t: 0.08 + Math.random() * 0.08 });
  }
}
function flotante(wx, wy, texto, color) { flot.push({ x: wx, y: wy, texto, color, vida: 1.3 }); }

// ----- Reglas en juego -----
const posJug = () => {
  if (!jug.mov) return { rx: jug.x, ry: jug.y };
  const e = Math.min(1, jug.mov.t / MOVER_S);
  return { rx: jug.mov.x0 + (jug.mov.x1 - jug.mov.x0) * e, ry: jug.mov.y0 + (jug.mov.y1 - jug.mov.y0) * e };
};

function vender() {
  if (bolsaCantidad(est) === 0) return false;
  const monto = venderTodo(est);
  flotante(jug.x + 0.5, jug.y - 0.3, "+" + fmt(monto), "#ffe08a");
  chispas(CAJA_X + 0.5, FILA_SUELO + 0.4, "#ffd23f", 14);
  sVenta();
  enviar(false);
  sucio = true;
  hud();
  guardar();
  return true;
}

function alLlegar() {
  const nuevas = iluminar(mundo, jug.x, jug.y, radioLuz(est));
  const p = profundidad(jug.y);
  if (p > est.profMax) {
    est.profMax = p;
    if (p === PROFUNDIDAD) aviso("¡Llegaste al fondo de la mina! (" + PROFUNDIDAD + " m)", 3500);
  }
  if (jug.x === CAJA_X + 1 && jug.y === FILA_SUELO) vender();
  sucio = true;
  hud();
  return nuevas;
}

function romper(x, y) {
  const prof = profundidad(y);
  const capa = capaDe(prof);
  const m = cavarCelda(mundo, x, y);
  chispas(x + 0.5, y + 0.5, capa.claro, 8);
  sRoto();
  if (m >= 0) {
    recoger(est, m);
    const mn = MINERALES[m];
    flotante(x + 0.5, y, "+" + fmt(mn.valor) + " " + mn.nombre, mn.brillo);
    chispas(x + 0.5, y + 0.5, mn.color, 10);
    sMineral(m);
    if (bolsaLlena(est)) aviso("Mochila llena: llévala a la caja 🪵 para venderla");
  }
  sucio = true;
  hud();
}

function logica(dt) {
  for (const p of parts) { p.vy += 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; }
  parts = parts.filter((p) => p.vida > 0);
  for (const f of flot) { f.y -= 1.1 * dt; f.vida -= dt; }
  flot = flot.filter((f) => f.vida > 0);

  if (jug.mov) {
    jug.mov.t += dt;
    if (jug.mov.t < MOVER_S) return;
    jug.x = jug.mov.x1; jug.y = jug.mov.y1; jug.mov = null;
    alLlegar();
  }
  const d = dirActual();
  if (!d) { jug.cavando = null; return; }
  if (d.x) jug.cara = d.x;
  const nx = jug.x + d.x, ny = jug.y + d.y;
  if (!dentro(nx, ny)) { jug.cavando = null; return; }
  if (nx === CAJA_X && ny === FILA_SUELO) { vender(); jug.cavando = null; return; }
  if (pasable(mundo, nx, ny)) {
    jug.mov = { x0: jug.x, y0: jug.y, x1: nx, y1: ny, t: 0 };
    jug.cavando = null;
    return;
  }
  if (cavable(mundo, nx, ny)) {
    const hay = mundo.mineral[idx(nx, ny)] > 0;
    if (hay && bolsaLlena(est)) {
      jug.cavando = null;
      if (tv - ultimoAviso > 2) { ultimoAviso = tv; aviso("Mochila llena: vende en la caja 🪵 o mejora la mochila"); sError(); }
      return;
    }
    if (!jug.cavando || jug.cavando.x !== nx || jug.cavando.y !== ny) {
      jug.cavando = { x: nx, y: ny, prog: 0, total: tiempoCavar(profundidad(ny), hay, est.pala) };
    }
    const c = jug.cavando;
    c.prog += dt;
    tickSonido -= dt;
    if (tickSonido <= 0) { tickSonido = 0.17; sTic(); }
    if (c.prog >= c.total) { jug.cavando = null; romper(nx, ny); }
    return;
  }
  jug.cavando = null; // roca firme, cerca, cielo...
}

function moverCamara(inicial) {
  const p = posJug();
  const vw = W / S, vh = H / S;
  let tx = p.rx + 0.5 - vw / 2, ty = p.ry + 0.5 - vh * 0.42;
  tx = vw >= ANCHO ? (ANCHO - vw) / 2 : Math.max(0, Math.min(ANCHO - vw, tx));
  ty = Math.max(0, Math.min(ALTO - vh, ty));
  if (inicial) { cam.x = tx; cam.y = ty; return; }
  cam.x += (tx - cam.x) * 0.2;
  cam.y += (ty - cam.y) * 0.2;
}

// ----- Dibujo -----
const X = (wx) => Math.round((wx - cam.x) * S);
const Y = (wy) => Math.round((wy - cam.y) * S);
function h(n) { n = Math.imul(n ^ 61, 2654435761) ^ (n >>> 13); n = Math.imul(n, 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function rect(x, y, w, hh, c) { const x1 = X(x), y1 = Y(y); ctx.fillStyle = c; ctx.fillRect(x1, y1, X(x + w) - x1, Y(y + hh) - y1); }
function poli(pts, c, borde) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.fillStyle = c; ctx.fill();
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
}
function circ(wx, wy, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(wx), Y(wy), r * S, 0, 7); ctx.fill(); }

function decorFondo() {
  // sol y nubes
  circ(28.5, 1.5, 1.1, "rgba(255,236,150,.25)");
  circ(28.5, 1.5, 0.7, "#ffe38a");
  const nubes = [[3, 1.0, 1.2], [10, 2.2, 0.9], [19, 0.8, 1.1], [26, 2.4, 1.0]];
  for (const [bx, by, sc] of nubes) {
    const cx = ((bx + (reducir ? 0 : tv * 0.15)) % (ANCHO + 6)) - 3;
    ctx.globalAlpha = 0.92;
    circ(cx, by, 0.45 * sc, "#fff"); circ(cx + 0.55 * sc, by + 0.08, 0.38 * sc, "#fff"); circ(cx - 0.55 * sc, by + 0.1, 0.34 * sc, "#fff");
    rect(cx - 0.6 * sc, by + 0.1, 1.2 * sc, 0.33 * sc, "#fff");
    ctx.globalAlpha = 1;
  }
  // casa (solo decorativa: no se puede entrar)
  rect(0.4, 3.3, 7.4, 3.7, "#efe3c8");
  rect(0.4, 6.55, 7.4, 0.45, "#d8c8a4");
  rect(5.5, 1.2, 0.65, 1.1, "#b9a68a"); rect(5.4, 1.15, 0.85, 0.15, "#8f7d62");
  poli([[X(0), Y(3.45)], [X(8.2), Y(3.45)], [X(7.2), Y(1.9)], [X(1.0), Y(1.9)]], "#c4572f");
  ctx.strokeStyle = "#a54222"; ctx.lineWidth = Math.max(1, S * 0.04);
  for (const ty of [2.3, 2.7, 3.1]) { ctx.beginPath(); ctx.moveTo(X(0.9 - (ty - 1.9) * 0.78 * 0.5 + 0.35), Y(ty)); ctx.lineTo(X(7.3 + (ty - 1.9) * 0.78 * 0.5 - 0.35), Y(ty)); ctx.stroke(); }
  rect(0.85, 1.82, 6.5, 0.16, "#8f3a1c");
  rect(3.2, 4.6, 1.3, 2.4, "#2f6f8f"); rect(3.32, 4.72, 1.06, 1.0, "#3d86a8"); rect(3.32, 5.82, 1.06, 1.1, "#3d86a8");
  circ(4.25, 5.85, 0.06, "#ffd23f");
  for (const wx of [1.3, 5.6]) {
    rect(wx - 0.18, 4.2, 0.18, 1.2, "#2f6f8f"); rect(wx + 1.2, 4.2, 0.18, 1.2, "#2f6f8f");
    rect(wx, 4.2, 1.2, 1.2, "#a9dcec"); rect(wx + 0.57, 4.2, 0.06, 1.2, "#f5f1e6"); rect(wx, 4.77, 1.2, 0.06, "#f5f1e6");
    rect(wx - 0.05, 5.4, 1.3, 0.1, "#c9b78f");
    circ(wx + 0.3, 5.3, 0.12, "#e35d7a"); circ(wx + 0.85, 5.3, 0.12, "#f2b441");
  }
  // árbol
  rect(13.15, 4.7, 0.35, 2.3, "#6b4426");
  circ(13.3, 3.95, 1.0, "#3f8f45"); circ(12.6, 4.5, 0.8, "#3f8f45"); circ(14.0, 4.5, 0.8, "#3f8f45");
  circ(12.95, 3.65, 0.35, "#5bb25a"); circ(13.8, 4.2, 0.3, "#5bb25a");
  // arbusto y piedra del lado derecho
  circ(29.2, 6.6, 0.5, "#3f8f45"); circ(29.8, 6.7, 0.4, "#4da252"); circ(30.9, 6.85, 0.28, "#8d8a84");
}

function decorFrente() {
  // cerca blanca delante de la casa
  rect(0, 6.38, CAJA_X, 0.09, "#e0d8c6"); rect(0, 6.72, CAJA_X, 0.09, "#e0d8c6");
  for (let x = 0.1; x < CAJA_X - 0.1; x += 0.42) {
    rect(x, 6.15, 0.22, 0.85, "#f7f3ea");
    poli([[X(x), Y(6.15)], [X(x + 0.11), Y(6.02)], [X(x + 0.22), Y(6.15)]], "#f7f3ea");
  }
  // caja de venta
  rect(CAJA_X + 0.06, 6.12, 0.88, 0.88, "#a9753f");
  rect(CAJA_X + 0.06, 6.12, 0.88, 0.1, "#c28b52"); rect(CAJA_X + 0.06, 6.5, 0.88, 0.07, "#85592b"); rect(CAJA_X + 0.06, 6.84, 0.88, 0.07, "#85592b");
  ctx.fillStyle = "#ffe08a"; ctx.font = "bold " + Math.round(S * 0.5) + "px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("$", X(CAJA_X + 0.5), Y(6.58));
  ctx.font = "bold " + Math.round(S * 0.26) + "px system-ui"; ctx.fillStyle = "#fff";
  ctx.fillText("Vender", X(CAJA_X + 0.5), Y(5.88));
  if (bolsaCantidad(est) > 0) { const b = reducir ? 0 : Math.sin(tv * 6) * 0.08; ctx.fillStyle = "#ffd23f"; ctx.fillText("▼", X(CAJA_X + 0.5), Y(5.55 + b)); }
  // estacas y cinta de la zona
  const xa = ZONA_X0 - 0.25, xb = ZONA_X1 + 1.0;
  for (let x = xa + 0.07; x < xb; x += 0.5) rect(x, 5.2, 0.5, 0.11, Math.round((x - xa) / 0.5) % 2 ? "#222" : "#ffd23f");
  rect(xa, 4.95, 0.14, 2.05, "#8a5a2b"); rect(xb, 4.95, 0.14, 2.05, "#8a5a2b");
  // letrero
  rect(18.6, 4.6, 0.12, 0.65, "#8a5a2b"); rect(23.2, 4.6, 0.12, 0.65, "#8a5a2b");
  rect(18.3, 3.85, 5.3, 0.85, "#c8955a"); rect(18.3, 3.85, 5.3, 0.07, "#e0b07a"); rect(18.3, 4.63, 5.3, 0.07, "#7b5129");
  ctx.fillStyle = "#3a2410"; ctx.font = "bold " + Math.round(S * 0.4) + "px system-ui";
  ctx.fillText("Zona de excavación", X(20.95), Y(4.28));
}

function dibujarMineral(i, id, sx, sy, w, luz) {
  const m = MINERALES[id];
  const grande = id >= 4;
  if (id === 6) {
    const cx = sx + w * 0.5, cy = sy + w * 0.52, r = w * 0.34;
    poli([[cx, cy - r], [cx + r, cy - r * 0.2], [cx, cy + r], [cx - r, cy - r * 0.2]], m.color, "rgba(0,40,60,.6)");
    poli([[cx, cy - r], [cx + r * 0.4, cy - r * 0.2], [cx, cy + r], [cx - r * 0.4, cy - r * 0.2]], "#e6fdff");
    poli([[cx - r, cy - r * 0.2], [cx, cy - r * 0.2], [cx - r * 0.4, cy - r * 0.2]], "#bdf3ff");
    ctx.strokeStyle = "rgba(0,60,80,.45)"; ctx.beginPath(); ctx.moveTo(cx - r, cy - r * 0.2); ctx.lineTo(cx + r, cy - r * 0.2); ctx.stroke();
  } else {
    for (let k = 0; k < 3; k++) {
      const px = sx + w * (0.22 + 0.56 * h(i * 3 + k)), py = sy + w * (0.25 + 0.52 * h(i * 5 + k + 7));
      const r = w * (grande ? 0.16 : 0.12) + w * 0.04 * h(i * 11 + k);
      if (id === 5) poli([[px, py - r * 1.15], [px + r, py], [px, py + r * 1.15], [px - r, py]], m.color, "rgba(70,0,10,.6)");
      else if (id === 4) poli([0, 1, 2, 3, 4, 5].map((a) => [px + Math.cos(a * 1.0472) * r * 1.05, py + Math.sin(a * 1.0472) * r * 1.05]), m.color, "rgba(0,60,30,.6)");
      else { ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.4)"; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = m.brillo; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.3, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  if (id >= 3 && luz) {
    const a = (Math.sin(tv * 2.6 + h(i) * 6.28) + 1) / 2;
    if (a > 0.7) {
      const px = sx + w * (0.3 + 0.4 * h(i + 99)), py = sy + w * (0.3 + 0.4 * h(i + 7)), r = w * 0.2 * a;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px - r, py); ctx.lineTo(px + r, py); ctx.moveTo(px, py - r); ctx.lineTo(px, py + r); ctx.stroke();
    }
  }
}

function dibujarCelda(x, y, R, amb, pj) {
  const i = idx(x, y), t = mundo.tipo[i], prof = y - FILA_SUELO;
  const sx = X(x), sy = Y(y), w = X(x + 1) - sx, hh = Y(y + 1) - sy;
  const visto = (mundo.flags[i] & 2) !== 0;
  if (t === T.AIRE) {
    ctx.fillStyle = "#1f150f"; ctx.fillRect(sx, sy, w, hh);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(sx, sy, w, Math.ceil(hh * 0.12));
  } else {
    const fondo = y >= ALTO - 1, cimiento = !enZona(x) && y > FILA_SUELO + 1;
    const capa = capaDe(prof);
    ctx.fillStyle = fondo ? "#1b1820" : cimiento ? "#3b3744" : capa.color;
    ctx.fillRect(sx, sy, w, hh);
    if (cimiento || fondo) {
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(sx, sy + Math.floor(hh / 2), w, 1);
      ctx.fillRect(sx + ((y + x) % 2 ? Math.floor(w / 3) : Math.floor(w * 0.66)), sy, 1, Math.floor(hh / 2));
      ctx.fillRect(sx + ((y + x) % 2 ? Math.floor(w * 0.66) : Math.floor(w / 3)), sy + Math.floor(hh / 2), 1, Math.ceil(hh / 2));
    } else {
      for (let k = 0; k < 4; k++) {
        const px = sx + h(i * 7 + k) * w * 0.8, py = sy + h(i * 13 + k + 3) * hh * 0.8, s = w * (0.1 + 0.12 * h(i * 17 + k));
        ctx.fillStyle = k % 2 ? capa.oscuro : capa.claro;
        ctx.fillRect(px, py, s, s * 0.8);
      }
    }
    if (y === FILA_SUELO + 1) { // pasto de la superficie
      ctx.fillStyle = "#4f9a43"; ctx.fillRect(sx, sy, w, Math.ceil(hh * 0.22));
      ctx.fillStyle = "#6bb957"; ctx.fillRect(sx, sy, w, Math.ceil(hh * 0.08));
    }
    const m = mundo.mineral[i];
    if (m && visto) {
      const d = Math.hypot(x - pj.rx, y - pj.ry);
      dibujarMineral(i, m - 1, sx, sy, w, d <= R + 0.4);
      if (d <= R + 0.4) {
        ctx.font = "bold " + Math.round(w * 0.3) + "px system-ui"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.fillStyle = MINERALES[m - 1].brillo;
        ctx.strokeText("$" + MINERALES[m - 1].valor, sx + w - 2, sy + hh - 3);
        ctx.fillText("$" + MINERALES[m - 1].valor, sx + w - 2, sy + hh - 3);
      }
    }
  }
  // oscuridad según profundidad y luz de la linterna
  {
    const d = Math.hypot(x - pj.rx, y - pj.ry);
    let a;
    if (d <= R) a = amb * Math.min(1, Math.max(0, (d - R * 0.45) / (R * 0.55)));
    else if (!visto) a = Math.min(0.92, amb + 0.22 * Math.min(1, (d - R) / 1.5));
    else a = amb * (1 - 0.15 * Math.min(1, (d - R) / 1.5));
    if (prof <= 1) a = 0;
    if (a > 0.01) { ctx.fillStyle = "rgba(0,0,0," + a.toFixed(3) + ")"; ctx.fillRect(sx, sy, w, hh); }
  }
}

function dibujarGrietas(c) {
  const p = c.prog / c.total, sx = X(c.x), sy = Y(c.y), w = X(c.x + 1) - sx, i = idx(c.x, c.y);
  ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineWidth = 1.5;
  const n = 2 + Math.floor(p * 5);
  for (let k = 0; k < n; k++) {
    const a = h(i * 3 + k) * 6.28, r1 = w * 0.1, r2 = w * (0.3 + 0.2 * h(i * 5 + k));
    ctx.beginPath(); ctx.moveTo(sx + w / 2 + Math.cos(a) * r1, sy + w / 2 + Math.sin(a) * r1);
    ctx.lineTo(sx + w / 2 + Math.cos(a + 0.3) * r2 * 0.7, sy + w / 2 + Math.sin(a + 0.3) * r2 * 0.7);
    ctx.lineTo(sx + w / 2 + Math.cos(a) * r2, sy + w / 2 + Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255," + (0.12 * p).toFixed(3) + ")"; ctx.fillRect(sx, sy, w, w);
}

function dibujarJugador(p) {
  const u = S, cx = X(p.rx) + u / 2, cy = Y(p.ry) + u / 2;
  const camina = !!jug.mov, trabaja = !!jug.cavando;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(jug.cara || 1, 1);
  const bal = camina ? Math.sin(tv * 22) : 0;
  const rebote = camina ? Math.abs(bal) * -0.03 * u : 0;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 0.47 * u, 0.26 * u, 0.06 * u, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#34425f";
  ctx.fillRect(-0.17 * u + bal * 0.07 * u, 0.2 * u, 0.14 * u, 0.24 * u);
  ctx.fillRect(0.03 * u - bal * 0.07 * u, 0.2 * u, 0.14 * u, 0.24 * u);
  ctx.fillStyle = "#2a1d14";
  ctx.fillRect(-0.19 * u + bal * 0.07 * u, 0.4 * u, 0.18 * u, 0.07 * u);
  ctx.fillRect(0.03 * u - bal * 0.07 * u, 0.4 * u, 0.18 * u, 0.07 * u);
  ctx.translate(0, rebote);
  ctx.fillStyle = "#e0652b"; ctx.fillRect(-0.22 * u, -0.08 * u, 0.44 * u, 0.32 * u);
  ctx.fillStyle = "#f2b441"; ctx.fillRect(-0.22 * u, 0.1 * u, 0.44 * u, 0.05 * u);
  ctx.fillStyle = "#f2c391"; ctx.beginPath(); ctx.arc(0.02 * u, -0.2 * u, 0.15 * u, 0, 7); ctx.fill();
  ctx.fillStyle = "#2a1d14"; ctx.fillRect(0.08 * u, -0.22 * u, 0.04 * u, 0.05 * u);
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(0.02 * u, -0.23 * u, 0.17 * u, Math.PI, 0); ctx.fill();
  ctx.fillRect(-0.15 * u, -0.25 * u, 0.4 * u, 0.05 * u);
  ctx.fillStyle = "#fffbe0"; ctx.fillRect(0.12 * u, -0.34 * u, 0.07 * u, 0.07 * u);
  // pico
  let ang = 0.55;
  if (trabaja) {
    const d = dirActual();
    const base = d && d.y > 0 ? 1.25 : d && d.y < 0 ? -1.25 : 0.1;
    ang = base + (reducir ? 0 : Math.sin(tv * 16) * 0.6);
  }
  ctx.save();
  ctx.translate(0.12 * u, 0.04 * u);
  ctx.rotate(ang);
  ctx.fillStyle = "#7a5230"; ctx.fillRect(0, -0.02 * u, 0.4 * u, 0.045 * u);
  ctx.fillStyle = "#aeb6c0"; ctx.fillRect(0.36 * u, -0.15 * u, 0.06 * u, 0.3 * u);
  ctx.restore();
  ctx.restore();
}

function dibujar() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = ctx.createLinearGradient(0, Y(0), 0, Y(FILA_SUELO + 1));
  g.addColorStop(0, "#5fb0e4"); g.addColorStop(0.7, "#b9e3ef"); g.addColorStop(1, "#f1eed0");
  ctx.fillStyle = "#1a120d"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, Y(FILA_SUELO + 1)));
  decorFondo();

  const p = posJug();
  const prof = Math.max(0, p.ry - FILA_SUELO);
  const amb = Math.min(0.72, 0.05 + (prof / 85) * 0.67);
  const R = radioLuz(est);
  const x0 = Math.max(0, Math.floor(cam.x)), x1 = Math.min(ANCHO - 1, Math.ceil(cam.x + W / S));
  const y0 = Math.max(FILA_SUELO + 1, Math.floor(cam.y)), y1 = Math.min(ALTO - 1, Math.ceil(cam.y + H / S));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dibujarCelda(x, y, R, amb, p);
  decorFrente();

  if (jug.cavando) dibujarGrietas(jug.cavando);
  dibujarJugador(p);

  for (const q of parts) { ctx.globalAlpha = Math.min(1, q.vida * 2); ctx.fillStyle = q.color; ctx.fillRect(X(q.x), Y(q.y), Math.max(2, q.t * S), Math.max(2, q.t * S)); }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold " + Math.round(S * 0.38) + "px system-ui"; ctx.lineWidth = 4; ctx.lineJoin = "round";
  for (const f of flot) {
    ctx.globalAlpha = Math.min(1, f.vida * 1.5);
    ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.strokeText(f.texto, X(f.x), Y(f.y));
    ctx.fillStyle = f.color; ctx.fillText(f.texto, X(f.x), Y(f.y));
  }
  ctx.globalAlpha = 1;
}

// ----- Panel de mejoras -----
const EFECTOS = {
  pala: (v) => "Velocidad ×" + v,
  mochila: (v) => "Capacidad " + v + " minerales",
  linterna: (v) => "Alcance de luz " + v + " m",
};
function pintarPanel() {
  const cuerpo = $("panelCuerpo");
  let html = '<div class="chip" style="display:inline-block">💰 <b>' + fmt(est.dinero) + "</b></div>";
  html += '<h3>Herramientas</h3>';
  for (const clave of ["pala", "mochila", "linterna"]) {
    const mj = MEJORAS[clave], nivel = est[clave], max = mj.niveles.length, costo = costoSiguiente(est, clave);
    const ahora = EFECTOS[clave](mj.niveles[nivel - 1]);
    const sig = costo === null ? "Nivel máximo" : "Siguiente: " + EFECTOS[clave](mj.niveles[nivel]);
    html += '<div class="fila"><div class="ico">' + mj.icono + '</div><div><b>' + mj.nombre + " · nivel " + nivel + '</b><div class="det">' + ahora + " — " + sig + '</div><div class="niveles">' +
      mj.niveles.map((_, k) => '<i class="' + (k < nivel ? "on" : "") + '"></i>').join("") + "</div></div>" +
      (costo === null ? "<span>✔</span>" : '<button class="btn" data-mejora="' + clave + '"' + (est.dinero < costo ? " disabled" : "") + ">" + fmt(costo) + "</button>") + "</div>";
  }
  html += '<div class="fila"><div class="ico">🪢</div><div><b>Cuerda de rescate</b><div class="det">Te sube de golpe a la superficie desde cualquier profundidad.</div></div>' +
    (est.cuerda ? "<span>✔</span>" : '<button class="btn" data-mejora="cuerda"' + (est.dinero < COSTO_CUERDA ? " disabled" : "") + ">" + fmt(COSTO_CUERDA) + "</button>") + "</div>";
  html += "<h3>Minerales</h3><div class=\"mins\">";
  MINERALES.forEach((m, i) => {
    html += '<div class="min"><span class="gema" style="background:' + m.color + '"></span><div><b>' + m.nombre + " " + fmt(m.valor) + "</b><small>mochila " + est.bolsa[i] + " · hallados " + est.hallados[i] + "</small></div></div>";
  });
  html += "</div>";
  html += '<div class="pie"><span>Máxima profundidad: ' + est.profMax + " m · Vendido: " + fmt(est.ganado) + '</span><button class="btn2" id="nueva">Nueva partida</button></div>';
  cuerpo.innerHTML = html;
}
function abrirPanel() {
  pausa = true; limpiarEntrada(); jug.cavando = null;
  pintarPanel();
  $("panel").hidden = false;
  $("cerrarPanel").focus();
}
function cerrarPanel() { $("panel").hidden = true; pausa = false; hud(); guardar(); $("btnMejoras").focus(); }
$("btnMejoras").addEventListener("click", abrirPanel);
$("cerrarPanel").addEventListener("click", cerrarPanel);
$("panel").addEventListener("click", (e) => { if (e.target === $("panel")) cerrarPanel(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("panel").hidden) cerrarPanel(); });
$("panelCuerpo").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.id === "nueva") {
    if (confirm("¿Empezar de nuevo? Se borra todo tu progreso.")) { nuevaPartida(); moverCamara(true); hud(); guardar(); cerrarPanel(); aviso("Mantén pulsado hacia abajo para cavar"); }
    return;
  }
  const clave = b.dataset.mejora;
  const ok = clave === "cuerda" ? comprarCuerda(est) : comprarMejora(est, clave);
  if (!ok) { sError(); return; }
  sCompra();
  if (clave === "linterna") iluminar(mundo, jug.x, jug.y, radioLuz(est));
  sucio = true; hud(); pintarPanel(); guardar();
});

// ----- Cuerda y sonido -----
$("btnCuerda").addEventListener("click", () => {
  if (!est.cuerda || jug.y === FILA_SUELO || pausa) return;
  chispas(jug.x + 0.5, jug.y + 0.5, "#fff", 12);
  jug.mov = null; jug.cavando = null; jug.y = FILA_SUELO;
  chispas(jug.x + 0.5, jug.y + 0.5, "#fff", 12);
  tono(400, 0.25, "triangle", 0.07, 900);
  alLlegar();
});
$("btnSonido").addEventListener("click", () => {
  sonando = !sonando;
  try { localStorage.setItem(CLAVE_SONIDO, sonando ? "1" : "0"); } catch (e) {}
  audio(); hud();
});

// ----- Arranque -----
let continuada = cargar();
if (!continuada) nuevaPartida();
ajustar();
moverCamara(true);
hud();
if (!continuada) aviso("Mantén pulsado hacia abajo, sobre el terreno marcado, para cavar", 4500);
else if (jug.y === FILA_SUELO) aviso("Bienvenido de nuevo");
iluminar(mundo, jug.x, jug.y, radioLuz(est));

let ultimo = 0, acum = 0, ultimoGuardado = 0;
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (ts - ultimo) / 1000 || 0);
  ultimo = ts;
  tv = ts / 1000;
  if (!pausa) {
    acum += dt;
    while (acum >= 1 / 60) { logica(1 / 60); acum -= 1 / 60; }
  }
  moverCamara(false);
  dibujar();
  if (ts - ultimoGuardado > AUTOGUARDADO_MS) { ultimoGuardado = ts; guardar(); enviar(false); }
}
requestAnimationFrame(bucle);

function salida() { guardar(); enviar(true); guardar(); }
addEventListener("pagehide", salida);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { limpiarEntrada(); salida(); } });
