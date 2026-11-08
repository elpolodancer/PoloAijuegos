// Ruta: bloques/juego-bloques.js
// Bloques de madera: arrastra cada una de las 3 piezas al tablero de 8×8. Cada fila o columna completa se limpia.
// Cada ronda trae piezas que SÍ caben, pero con trampas: poner una en otro hueco válido puede dejar sin sitio a las demás.
// Pierdes cuando ninguna de las piezas que te quedan cabe en el tablero. La lógica y el generador están en logica-bloques.js.
// Guardado: la partida en curso (bloques_partida_v1) queda solo en el dispositivo; el récord (bloques_record_v1) se sincroniza con la cuenta.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { N, FORMAS, cabe, hayLugar, colocar, tableroInicial, rellenar, agregarBloqueo, generarRonda } from "./logica-bloques.js";

const ID = "bloques", CLAVE_PARTIDA = "bloques_partida_v1", CLAVE_RECORD = "bloques_record_v1";
const W = 480, H = 720, CELL = 50, BX = 40, BY = 156;       // lienzo y tablero (8 × 50 = 400 px)
const SLOT_Y = 572, SLOT_CY = 640, ESC = 0.52, ELEVAR = 95; // bandeja de piezas; la pieza arrastrada se muestra por encima del dedo
const PUNTOS_POR = 40;                                      // 1 punto de perfil por cada 40 del juego
const cv = document.getElementById("lienzo"), ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);

// ----- Partida y récord -----
const nuevaPartida = () => { const tab = tableroInicial(); return { tab, pz: generarRonda(tab, 0), pt: 0, ro: 1, env: 0 }; };
function cargarPartida() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_PARTIDA));
    if (o && Array.isArray(o.tab) && (o.tab.length === N || o.tab.length === 2 * N) && o.tab.every((v) => Number.isInteger(v) && v >= 0 && v < 256) &&
        Array.isArray(o.pz) && o.pz.length === 3 && o.pz.every((v) => v === null || !!FORMAS[v])) {
      const tab = o.tab.slice(); while (tab.length < 2 * N) tab.push(0); // partidas guardadas antes de los candados
      return { tab, pz: o.pz, pt: o.pt | 0, ro: (o.ro | 0) || 1, env: o.env | 0 };
    }
  } catch (e) {}
  return null;
}
function leerRecord() { try { return Number(JSON.parse(localStorage.getItem(CLAVE_RECORD)).mejor) || 0; } catch (e) { return 0; } }
let S = cargarPartida() || nuevaPartida();
let record = leerRecord(), nube = null, vaciar = null, fin = false;

function guardarPartida() { if (!fin) try { localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(S)); } catch (e) {} }
function guardarRecord() {
  try { localStorage.setItem(CLAVE_RECORD, JSON.stringify({ mejor: record })); } catch (e) {}
  if (nube) nube.guardado();
}
// Puntos de perfil: se anotan siempre (aunque no haya sesión) y se envían en cuanto se puede
function pagar(minimo = 1) { // minimo: junta puntos para no mandar muchos envíos chicos (al terminar siempre se manda todo)
  const debe = Math.floor(S.pt / PUNTOS_POR) - S.env;
  if (debe >= minimo) { S.env += debe; encolarPuntos(ID, debe); try { if (vaciar) vaciar(); } catch (e) {} }
}
function cierre() { // al terminar, reiniciar o salir: récord y puntos al día
  if (S.pt > record) { record = S.pt; guardarRecord(); }
  pagar();
}
import("../compartido/progreso.js").then((m) => {
  vaciar = m.vaciarPuntos;
  nube = m.conectar(ID, {
    clave: CLAVE_RECORD, fusionar: m.unirMaximos,
    alCambiar: (u) => { record = Math.max(record, Number(u && u.mejor) || 0); },
  });
}).catch(() => {});

// ----- Sonido sencillo -----
let ac = null;
function sonido(f, d = 0.08, tipo = "triangle", v = 0.05) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.7, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
// En iPhone el audio solo se activa dentro de un toque o tecla: se despierta en el primero que haya
const despertarAudio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {} };
for (const ev of ["pointerup", "click", "keydown"]) addEventListener(ev, despertarAudio, true);

// ----- Estado de la interfaz -----
let arr = null;                 // pieza que se está arrastrando: { i, x, y, id } (x, y en coordenadas del lienzo)
let parts = [], textos = [], flashes = [], dlg = false;
const hayMovimiento = () => S.pz.some((id) => id !== null && hayLugar(S.tab, FORMAS[id]));

function nuevaRonda() {
  S.ro++;
  S.tab = rellenar(S.tab);
  if (S.ro >= 3) { // de vez en cuando aparece un cubo con candado (más seguido conforme avanzas)
    const veces = (Math.random() < Math.min(0.55, 0.2 + 0.01 * S.ro) ? 1 : 0) + (S.ro >= 15 && Math.random() < 0.25 ? 1 : 0);
    for (let k = 0; k < veces; k++) {
      const antes = S.tab, nuevo = agregarBloqueo(antes);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (((nuevo[N + r] >> c) & 1) && !((antes[N + r] >> c) & 1)) textos.push({ x: BX + (c + 0.5) * CELL, y: BY + (r + 0.5) * CELL, t: "🔒", vida: 1.2 });
      S.tab = nuevo;
    }
  }
  S.pz = generarRonda(S.tab, Math.min(1, (S.ro - 1) / 35)); // la dificultad sube poco a poco (35 rondas hasta el máximo)
  pagar(5);
}

// ----- Colocar -----
function celdaDe(f, x, y) { // casilla (esquina superior izquierda) donde caería la pieza arrastrada
  const c = Math.round((x - (f.w * CELL) / 2 - BX) / CELL), r = Math.round((y - ELEVAR - (f.h * CELL) / 2 - BY) / CELL);
  return { r, c, ok: cabe(S.tab, f, r, c) };
}
function poner(i, f, r, c) {
  const res = colocar(S.tab, f, r, c);
  const ganados = f.n + (res.lineas ? 10 * res.lineas * res.lineas : 0) + 5 * res.rotos.length;
  S.tab = res.t; S.pz[i] = null; S.pt += ganados;
  if (res.lineas) {
    flashes.push({ filas: res.filas, cols: res.cols, vida: 0.4 });
    const cel = (rr, cc, color) => { for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28, v = 50 + Math.random() * 120; parts.push({ x: BX + (cc + 0.5) * CELL, y: BY + (rr + 0.5) * CELL, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, vida: 0.6, c: color }); } };
    for (const rr of res.filas) for (let cc = 0; cc < N; cc++) cel(rr, cc);
    for (let cc = 0; cc < N; cc++) if ((res.cols >> cc) & 1) for (let rr = 0; rr < N; rr++) cel(rr, cc);
    for (const [rr, cc] of res.rotos) cel(rr, cc, "#aeb6c0"); // candado roto
    sonido(520 + 120 * Math.min(4, res.lineas), 0.28, "triangle", 0.07);
    if (res.rotos.length) sonido(240, 0.12, "square", 0.06);
  } else sonido(300, 0.08, "square", 0.04);
  textos.push({ x: BX + (c + f.w / 2) * CELL, y: BY + (r + f.h / 2) * CELL, t: "+" + ganados, vida: 0.9 });
  if (S.pz.every((x) => x === null)) nuevaRonda();
  else if (!hayMovimiento()) { terminar(); return; }
  guardarPartida();
}

// ----- Fin, reinicio y carteles -----
const boton = (color, attr, txt) => '<button class="b3d txt chico ' + color + '" ' + attr + ">" + txt + "</button>";
function mostrar(html) { $("velo").innerHTML = '<div class="caja">' + html + "</div>"; $("velo").hidden = false; dlg = true; }
function ocultar() { $("velo").hidden = true; dlg = false; }
function terminar() {
  fin = true; arr = null;
  const nuevo = S.pt > record && S.pt > 0;
  cierre();
  try { localStorage.removeItem(CLAVE_PARTIDA); } catch (e) {}
  sonido(130, 0.5, "sawtooth", 0.05);
  mostrar("<h2>Sin espacio</h2><p>Ya no cabe ninguna de tus piezas.</p><div class=\"grande-num\">" + S.pt + "</div><p>" +
    (nuevo ? "¡Nuevo récord! 👑" : "Récord: " + record) + "</p><div class=\"fila\">" + boton("b-verde", "data-otra", "Jugar de nuevo") + "</div>");
}
function reiniciar() {
  cierre();
  S = nuevaPartida(); fin = false; arr = null; parts = []; textos = []; flashes = [];
  ocultar(); guardarPartida();
}
$("velo").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.no !== undefined) ocultar(); else reiniciar();
});
$("bNueva").addEventListener("click", () => {
  if (fin || dlg) return;
  if (S.pt === 0 && S.ro === 1) { reiniciar(); return; }
  mostrar("<h2>¿Partida nueva?</h2><p>Se pierde la partida actual (los puntos que ya ganaste se conservan).</p><div class=\"fila\">" +
    boton("b-rojo", "data-si", "Sí, empezar") + boton("b-gris", "data-no", "Seguir jugando") + "</div>");
});

// ----- Entrada: arrastrar piezas -----
const aLienzo = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height }; };
cv.addEventListener("contextmenu", (e) => e.preventDefault());
cv.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (fin || dlg || arr) return;
  const p = aLienzo(e);
  if (p.y < SLOT_Y - 24) return;
  const i = Math.min(2, Math.max(0, Math.floor(p.x / (W / 3))));
  if (S.pz[i] === null) return;
  arr = { i, x: p.x, y: p.y, id: e.pointerId };
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  sonido(420, 0.05, "square", 0.02);
});
cv.addEventListener("pointermove", (e) => {
  if (!arr || e.pointerId !== arr.id) return;
  const p = aLienzo(e); arr.x = p.x; arr.y = p.y;
});
function soltar(e) {
  if (!arr || e.pointerId !== arr.id) return;
  const i = arr.i, f = FORMAS[S.pz[i]], d = celdaDe(f, arr.x, arr.y);
  arr = null;
  if (d.ok) poner(i, f, d.r, d.c); else sonido(160, 0.1, "square", 0.03);
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", () => { arr = null; });
addEventListener("pagehide", () => { cierre(); guardarPartida(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { cierre(); guardarPartida(); } });

// ----- Dibujo -----
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const fondo = document.createElement("canvas"); // madera de fondo, dibujada una sola vez
fondo.width = W; fondo.height = H;
(() => {
  const g = fondo.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#c47c3e"); gr.addColorStop(1, "#a96a33"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  let s = 7; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W; g.strokeStyle = rnd() < 0.5 ? "rgba(255,220,160,.07)" : "rgba(80,40,10,.07)"; g.lineWidth = 1 + rnd() * 2;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 14 - 7, H * 0.3, x + rnd() * 14 - 7, H * 0.6, x + rnd() * 10 - 5, H); g.stroke();
  }
})();
function bloque(x, y, s, a = 1) {
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, "#f6da95"); g.addColorStop(1, "#e0af55");
  ctx.fillStyle = "rgba(90,50,15,.45)"; rr(x + 1, y + 2, s - 2, s - 2, s * 0.09); ctx.fill(); // sombra
  ctx.fillStyle = g; rr(x + 1, y + 1, s - 3, s - 3, s * 0.09); ctx.fill();
  ctx.strokeStyle = "rgba(255,246,214,.75)"; ctx.lineWidth = Math.max(1, s * 0.04); rr(x + 2, y + 2, s - 5, s - 5, s * 0.07); ctx.stroke();
  ctx.strokeStyle = "rgba(160,100,40,.28)"; ctx.lineWidth = 1;
  for (const k of [0.3, 0.55, 0.78]) { ctx.beginPath(); ctx.moveTo(x + s * 0.12, y + s * k); ctx.lineTo(x + s * 0.88, y + s * k + 1); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function bloqueCandado(x, y, s) { // bloque de hierro con candado: hay que completar su línea dos veces
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, "#b4bcc6"); g.addColorStop(1, "#6f7883");
  ctx.fillStyle = "rgba(40,45,52,.55)"; rr(x + 1, y + 2, s - 2, s - 2, s * 0.09); ctx.fill();
  ctx.fillStyle = g; rr(x + 1, y + 1, s - 3, s - 3, s * 0.09); ctx.fill();
  ctx.strokeStyle = "#3f464e"; ctx.lineWidth = Math.max(2, s * 0.06); rr(x + 3, y + 3, s - 7, s - 7, s * 0.07); ctx.stroke();
  const cx = x + s / 2 - 1, cy = y + s / 2 + 2;
  ctx.strokeStyle = "#2b2f35"; ctx.lineWidth = s * 0.075; ctx.beginPath(); ctx.arc(cx, cy - s * 0.07, s * 0.135, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = "#2b2f35"; rr(cx - s * 0.2, cy - s * 0.06, s * 0.4, s * 0.3, s * 0.05); ctx.fill();
  ctx.fillStyle = "#b4bcc6"; ctx.beginPath(); ctx.arc(cx, cy + s * 0.06, s * 0.04, 0, 6.2832); ctx.fill(); ctx.fillRect(cx - s * 0.015, cy + s * 0.06, s * 0.03, s * 0.09);
}
function forma(f, x0, y0, s, a = 1) { for (const [r, c] of f.celdas) bloque(x0 + c * s, y0 + r * s, s, a); }
function texto(t, x, y, tam, color) { ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(60,30,10,.85)"; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y); }

function dibujar() {
  ctx.drawImage(fondo, 0, 0);
  // marcadores: récord (morado) y puntos
  const rec = Math.max(record, S.pt);
  ctx.font = "30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("👑", 150, 72);
  const g = ctx.createLinearGradient(0, 78, 0, 134); g.addColorStop(0, "#9a6cf5"); g.addColorStop(1, "#6a3fd0");
  ctx.fillStyle = "#3a2410"; rr(68, 78, 164, 60, 14); ctx.fill(); ctx.fillStyle = g; rr(72, 80, 156, 52, 11); ctx.fill();
  ctx.fillStyle = "#3a2410"; rr(248, 78, 164, 60, 14); ctx.fill(); ctx.fillStyle = "#5a3418"; rr(252, 80, 156, 52, 11); ctx.fill();
  texto(String(rec), 150, 118, 34, "#ffe27a"); texto(String(S.pt), 330, 118, 34, "#fff4d6");
  // tablero
  ctx.fillStyle = "#8a5226"; rr(BX - 14, BY - 14, N * CELL + 28, N * CELL + 28, 16); ctx.fill();
  ctx.fillStyle = "#d39a52"; rr(BX - 11, BY - 11, N * CELL + 22, N * CELL + 22, 14); ctx.fill();
  ctx.fillStyle = "#3e2414"; rr(BX - 6, BY - 6, N * CELL + 12, N * CELL + 12, 10); ctx.fill();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((S.tab[r] >> c) & 1) { if ((S.tab[N + r] >> c) & 1) bloqueCandado(BX + c * CELL, BY + r * CELL, CELL); else bloque(BX + c * CELL, BY + r * CELL, CELL); }
    else { ctx.fillStyle = "#4a2a18"; rr(BX + c * CELL + 1, BY + r * CELL + 1, CELL - 2, CELL - 2, 5); ctx.fill(); }
  }
  for (const fl of flashes) { ctx.globalAlpha = Math.min(1, fl.vida * 2.5); ctx.fillStyle = "#fff6c8"; for (const r of fl.filas) ctx.fillRect(BX, BY + r * CELL, N * CELL, CELL); for (let c = 0; c < N; c++) if ((fl.cols >> c) & 1) ctx.fillRect(BX + c * CELL, BY, CELL, N * CELL); }
  ctx.globalAlpha = 1;
  // sombra de dónde caería la pieza (y las líneas que limpiaría)
  if (arr) {
    const f = FORMAS[S.pz[arr.i]], d = celdaDe(f, arr.x, arr.y);
    if (d.ok) {
      const res = colocar(S.tab, f, d.r, d.c);
      ctx.fillStyle = "rgba(255,236,140,.32)";
      for (const r of res.filas) ctx.fillRect(BX, BY + r * CELL, N * CELL, CELL);
      for (let c = 0; c < N; c++) if ((res.cols >> c) & 1) ctx.fillRect(BX + c * CELL, BY, CELL, N * CELL);
      for (const [r, c] of f.celdas) bloque(BX + (d.c + c) * CELL, BY + (d.r + r) * CELL, CELL, 0.55);
    }
  }
  // bandeja: las piezas que ya no caben se ven apagadas
  for (let i = 0; i < 3; i++) {
    const id = S.pz[i]; if (id === null || (arr && arr.i === i)) continue;
    const f = FORMAS[id], s = CELL * ESC, cx = (W / 6) * (2 * i + 1);
    forma(f, cx - (f.w * s) / 2, SLOT_CY - (f.h * s) / 2, s, hayLugar(S.tab, f) ? 1 : 0.35);
  }
  if (arr) { const f = FORMAS[S.pz[arr.i]]; forma(f, arr.x - (f.w * CELL) / 2, arr.y - ELEVAR - (f.h * CELL) / 2, CELL, 0.96); }
  // efectos
  for (const q of parts) { ctx.globalAlpha = Math.max(0, q.vida * 1.6); ctx.fillStyle = q.c || "#f2c765"; ctx.fillRect(q.x - 3, q.y - 3, 6, 6); }
  ctx.globalAlpha = 1;
  for (const t of textos) { ctx.globalAlpha = Math.min(1, t.vida * 2); texto(t.t, t.x, t.y, 26, "#fff4d6"); }
  ctx.globalAlpha = 1;
}
function actualizar(dt) {
  for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.vida -= dt; }
  parts = parts.filter((q) => q.vida > 0);
  for (const t of textos) { t.y -= 34 * dt; t.vida -= dt; }
  textos = textos.filter((t) => t.vida > 0);
  for (const f of flashes) f.vida -= dt;
  flashes = flashes.filter((f) => f.vida > 0);
}
let ultimo = performance.now();
function bucle(t) {
  const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
  actualizar(dt); dibujar();
  requestAnimationFrame(bucle);
}

// ----- Arranque -----
if (S.pz.every((x) => x === null)) nuevaRonda();
if (!hayMovimiento()) terminar(); else guardarPartida();
requestAnimationFrame(bucle);
