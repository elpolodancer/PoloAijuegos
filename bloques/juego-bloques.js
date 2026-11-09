// Ruta: bloques/juego-bloques.js
// Bloques de madera: arrastra cada una de las 3 piezas al tablero de 8×8. Cada fila o columna completa se limpia.
// Cada ronda trae piezas que SÍ caben, pero con trampas: poner una en otro hueco válido puede dejar sin sitio a las demás.
// Pierdes cuando ninguna de las piezas que te quedan cabe en el tablero. La lógica y el generador están en logica-bloques.js.
// Zonas: ♾️ Infinito (3 dificultades: Fácil, Normal, Difícil) y 🗺️ Niveles fijos (cada nivel tiene un reto: llegar a N puntos o eliminar bloques con candado). Sus reglas están en niveles-bloques.js.
// Guardado: la partida en curso (bloques_partida_v1) queda solo en el dispositivo; el récord de cada dificultad y las estrellas de los niveles
// (bloques_record_v1 = { mejor (Normal), facil, dificil, est: [estrellas del nivel 1, 2…] }) se sincronizan con la cuenta.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { N, FORMAS, cabe, hayLugar, colocar, capas, puntosJugada } from "./logica-bloques.js";
import { DIFICULTADES, ORDEN_DIF, NIVELES_FIJOS, RETOS, nivelFijo, estrellasDe, partidaInfinita, partidaNivel, avanzarRonda, actualizarObj, restantes, cumplido } from "./niveles-bloques.js";

const ID = "bloques", CLAVE_PARTIDA = "bloques_partida_v1", CLAVE_RECORD = "bloques_record_v1";
const W = 480, H = 720, CELL = 50, BX = 40, BY = 156;       // lienzo y tablero (8 × 50 = 400 px)
const SLOT_Y = 572, SLOT_CY = 640, ESC = 0.52, ELEVAR = 95; // bandeja de piezas; la pieza arrastrada se muestra por encima del dedo
const PUNTOS_NIVEL = 5;                                     // puntos de perfil la primera vez que pasas cada nivel fijo (en el infinito, ver «puntosPor» de cada dificultad)
const cv = document.getElementById("lienzo"), ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);

// ----- Partida y récord -----
// Une dos récords (el de este dispositivo y el de la nube): gana el mayor de cada marca y la mayor estrella de cada nivel
const unirRecord = (a, b) => {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  const r = {};
  for (const k of ["mejor", "facil", "dificil"]) { const v = Math.max(Number(a[k]) || 0, Number(b[k]) || 0); if (v) r[k] = v; }
  const n = Math.max(Array.isArray(a.est) ? a.est.length : 0, Array.isArray(b.est) ? b.est.length : 0);
  if (n) { r.est = []; for (let i = 0; i < n; i++) r.est[i] = Math.max((a.est && a.est[i]) | 0, (b.est && b.est[i]) | 0); }
  return r;
};
function cargarPartida() {
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_PARTIDA));
    if (o && Array.isArray(o.tab) && (o.tab.length === N || o.tab.length === 2 * N || o.tab.length === 3 * N) && o.tab.every((v) => Number.isInteger(v) && v >= 0 && v < 256) &&
        Array.isArray(o.pz) && o.pz.length === 3 && o.pz.every((v) => v === null || !!FORMAS[v])) {
      const tab = o.tab.slice(); while (tab.length < 3 * N) tab.push(0); // partidas guardadas antes de los candados (8 números) o antes de los dobles y triples (16)
      const base = { tab, pz: o.pz, pt: o.pt | 0, ro: (o.ro | 0) || 1, env: o.env | 0 };
      if (o.m === "n") {
        // los niveles fijos se rehicieron (retos, v: 2): una partida de nivel guardada con los niveles viejos se descarta
        const L = o.v === 2 ? nivelFijo(o.n | 0, o.sem) : null;
        if (!L) return null;
        const obj = Array.isArray(o.obj) && o.obj.length === N && o.obj.every((v) => Number.isInteger(v) && v >= 0 && v < 256) ? o.obj : null;
        if (L.reto === "candados" && !obj) return null;
        return { ...base, m: "n", n: o.n | 0, sem: L.sem, v: 2, obj, lin: o.lin | 0 };
      }
      return { ...base, m: "i", d: DIFICULTADES[o.d] ? o.d : "normal" }; // las partidas de antes de las dificultades cuentan como Normal
    }
  } catch (e) {}
  return null;
}
function leerRecord() { try { return unirRecord(JSON.parse(localStorage.getItem(CLAVE_RECORD)), null); } catch (e) { return null; } }
let S = cargarPartida() || partidaInfinita("normal");
let REC = leerRecord() || {}, nube = null, vaciar = null, fin = false;
const estrellasDeNivel = (n) => (REC.est && REC.est[n - 1]) | 0;
const TODOS = new URLSearchParams(location.search).has("todos"); // ?todos abre todos los niveles para probar

function guardarPartida() { if (!fin) try { localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(S)); } catch (e) {} }
function guardarRecord() {
  REC = unirRecord(REC, null) || {};
  try { localStorage.setItem(CLAVE_RECORD, JSON.stringify(REC)); } catch (e) {}
  if (nube) nube.guardado();
}
// Puntos de perfil de la zona infinita: se anotan siempre (aunque no haya sesión) y se envían en cuanto se puede
function pagar(minimo = 1) { // minimo: junta puntos para no mandar muchos envíos chicos (al terminar siempre se manda todo)
  if (S.m !== "i") return;
  const debe = Math.floor(S.pt / DIFICULTADES[S.d].puntosPor) - S.env;
  if (debe >= minimo) { S.env += debe; encolarPuntos(ID, debe); try { if (vaciar) vaciar(); } catch (e) {} }
}
function cierre() { // al terminar, reiniciar o salir: récord y puntos al día
  if (S.m !== "i") return;
  const k = DIFICULTADES[S.d].clave;
  if (S.pt > (REC[k] || 0)) { REC[k] = S.pt; guardarRecord(); }
  pagar();
}
import("../compartido/progreso.js").then((m) => {
  vaciar = m.vaciarPuntos;
  nube = m.conectar(ID, {
    clave: CLAVE_RECORD, fusionar: unirRecord,
    alCambiar: (u) => { REC = unirRecord(REC, u) || REC; },
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

function nuevaRonda() { // las reglas de cada zona están en avanzarRonda (niveles-bloques.js); aquí solo se avisa de los candados nuevos
  for (const [r, c] of avanzarRonda(S)) textos.push({ x: BX + (c + 0.5) * CELL, y: BY + (r + 0.5) * CELL, t: "🔒", vida: 1.2 });
  pagar(5);
}

// ----- Colocar -----
function celdaDe(f, x, y) { // casilla (esquina superior izquierda) donde caería la pieza arrastrada
  const c = Math.round((x - (f.w * CELL) / 2 - BX) / CELL), r = Math.round((y - ELEVAR - (f.h * CELL) / 2 - BY) / CELL);
  return { r, c, ok: cabe(S.tab, f, r, c) };
}
function poner(i, f, r, c) {
  const res = colocar(S.tab, f, r, c);
  const ganados = puntosJugada(f, res), faltaAntes = S.obj ? restantes(S) : 0;
  S.tab = res.t; S.pz[i] = null; S.pt += ganados;
  if (S.m === "n") { S.lin += res.lineas; actualizarObj(S); }
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
  if (S.obj && restantes(S) < faltaAntes) { // se eliminó un bloque con candado del todo
    textos.push({ x: BX + (c + f.w / 2) * CELL, y: BY + (r + f.h / 2) * CELL - 28, t: "🔓", vida: 1.1 });
    setTimeout(() => sonido(780, 0.2, "triangle", 0.06), 120);
  }
  if (S.m === "n" && cumplido(S)) { ganar(); return; }
  if (S.pz.every((x) => x === null)) nuevaRonda();
  else if (!hayMovimiento()) { terminar(); return; }
  guardarPartida();
}

// ----- Menús, fin y carteles -----
const boton = (color, attr, txt) => '<button class="b3d txt chico ' + color + '" ' + attr + ">" + txt + "</button>";
function mostrar(html) { $("velo").innerHTML = '<div class="caja">' + html + "</div>"; $("velo").hidden = false; dlg = true; }
function ocultar() { $("velo").hidden = true; dlg = false; }
const hayPartida = () => !fin && (S.pt > 0 || S.ro > 1 || (S.lin | 0) > 0);
const nombreModo = () => (S.m === "n" ? "Nivel " + S.n : DIFICULTADES[S.d].nombre);
const estrellasTxt = (e) => "★".repeat(e) + "☆".repeat(3 - e);

function menuPrincipal() {
  const difs = ORDEN_DIF.map((id) => { const D = DIFICULTADES[id];
    return '<button class="b3d dif ' + D.color + '" data-dif="' + id + '"><span class="b-ico">' + D.icono + "</span><b>" + D.nombre + "</b><small>👑 " + (REC[D.clave] || 0) + "</small></button>"; }).join("");
  let hechos = 0; for (let n = 1; n <= NIVELES_FIJOS; n++) if (estrellasDeNivel(n)) hechos++;
  mostrar("<h2>Polo Blocks</h2>" +
    (hayPartida() ? '<div class="fila">' + boton("b-verde", "data-cont", "▶ Continuar · " + nombreModo() + " · " + S.pt) + '</div><p class="nota">Si empiezas otra partida, esta se pierde.</p>' : "") +
    "<p>♾️ Infinito: elige la dificultad</p>" + '<div class="difs">' + difs + "</div>" +
    '<div class="fila">' + boton("b-azul", "data-lista", "🗺️ Niveles fijos · " + hechos + "/" + NIVELES_FIJOS) + "</div>");
}
let pag = 0;
const POR_PAG = 50; // niveles por página de la lista (con 2000 niveles son 40 páginas)
function menuNiveles() {
  const paginas = Math.max(1, Math.ceil(NIVELES_FIJOS / POR_PAG));
  pag = Math.min(Math.max(0, pag), paginas - 1);
  let estrellas = 0; for (let n = 1; n <= NIVELES_FIJOS; n++) estrellas += estrellasDeNivel(n);
  let lista = "";
  for (let n = pag * POR_PAG + 1; n <= Math.min(NIVELES_FIJOS, (pag + 1) * POR_PAG); n++) {
    const e = estrellasDeNivel(n);
    lista += TODOS || n === 1 || estrellasDeNivel(n - 1) > 0
      ? '<button class="b3d nvl ' + (e ? "b-oro" : "b-azul") + '" data-nivel="' + n + '"><span class="b-ico">' + n + "</span><small>" + (e ? estrellasTxt(e) : RETOS[nivelFijo(n).reto].icono) + "</small></button>"
      : '<button class="b3d nvl b-gris" disabled><span class="b-ico">🔒</span><small></small></button>';
  }
  mostrar("<h2>🗺️ Niveles fijos</h2><p>Cumple el reto de cada nivel. ⭐ " + estrellas + "/" + NIVELES_FIJOS * 3 + "</p>" + '<div class="nivs">' + lista + "</div>" +
    '<div class="fila">' + (paginas > 1 ? boton("b-gris", 'data-pag="-1"' + (pag ? "" : " disabled"), "◀") + '<span class="pg">' + (pag + 1) + "/" + paginas + "</span>" + boton("b-gris", 'data-pag="1"' + (pag < paginas - 1 ? "" : " disabled"), "▶") : "") +
    boton("b-gris", "data-menu", "Atrás") + "</div>");
}

function terminar() {
  fin = true; arr = null;
  const inf = S.m === "i", k = inf ? DIFICULTADES[S.d].clave : "";
  const nuevo = inf && S.pt > (REC[k] || 0) && S.pt > 0;
  cierre();
  try { localStorage.removeItem(CLAVE_PARTIDA); } catch (e) {}
  sonido(130, 0.5, "sawtooth", 0.05);
  mostrar('<h2>Sin espacio</h2><p>Ya no cabe ninguna de tus piezas.</p><div class="grande-num">' + S.pt + "</div><p>" +
    (inf ? (nuevo ? "¡Nuevo récord! 👑" : "Récord " + DIFICULTADES[S.d].nombre + ": " + (REC[k] || 0)) : RETOS[nivelFijo(S.n).reto].falta(S, nivelFijo(S.n))) +
    '</p><div class="fila">' + boton("b-verde", "data-rep", inf ? "Jugar de nuevo" : "Reintentar") + boton("b-gris", "data-menu", "Menú") + "</div>");
}
function ganar() { // meta del nivel fijo cumplida
  fin = true; arr = null;
  const L = nivelFijo(S.n), e = estrellasDe(S.n, S.ro), antes = estrellasDeNivel(S.n);
  if (e > antes) { REC.est = REC.est || []; for (let i = 0; i < S.n; i++) REC.est[i] = REC.est[i] | 0; REC.est[S.n - 1] = e; guardarRecord(); }
  if (!antes) { encolarPuntos(ID, PUNTOS_NIVEL); try { if (vaciar) vaciar(); } catch (err) {} } // los puntos de perfil solo se dan la primera vez
  try { localStorage.removeItem(CLAVE_PARTIDA); } catch (err) {}
  sonido(660, 0.25, "triangle", 0.07); setTimeout(() => sonido(880, 0.3, "triangle", 0.07), 160);
  mostrar('<h2>¡Nivel superado!</h2><div class="estrellas">' + estrellasTxt(e) + "</div><p>Lo lograste en " + S.ro + " ronda" + (S.ro === 1 ? "" : "s") + " (par: " + L.par + ").</p>" +
    (!antes ? "<p>+" + PUNTOS_NIVEL + " puntos de perfil 🎉</p>" : "") + (S.n >= NIVELES_FIJOS ? "<p>Por ahora es el último nivel: ¡pronto habrá más!</p>" : "") +
    '<div class="fila">' + (S.n < NIVELES_FIJOS ? boton("b-verde", "data-sig", "Siguiente ▶") : "") + boton("b-azul", "data-rep", "Repetir") + boton("b-gris", "data-lista", "Niveles") + "</div>");
}
function empezar(P, intro = false) { // empieza una partida nueva (guarda antes el récord y los puntos de la que había). intro: muestra el cartel del reto (niveles fijos)
  cierre();
  S = P; fin = false; arr = null; parts = []; textos = []; flashes = [];
  ocultar(); guardarPartida();
  if (intro && S.m === "n") cartelNivel();
}
function cartelNivel() { // instrucciones del reto antes de jugar el nivel
  const L = nivelFijo(S.n), R = RETOS[L.reto];
  mostrar("<h2>Nivel " + S.n + "</h2><p>" + R.icono + " <b>" + R.titulo + "</b></p>" + R.texto(L) + '<div class="fila">' + boton("b-verde", "data-no", "¡Jugar!") + "</div>");
}
const reiniciar = () => empezar(S.m === "n" ? partidaNivel(S.n) : partidaInfinita(S.d));
$("velo").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b || b.disabled) return;
  const d = b.dataset;
  if (d.no !== undefined || d.cont !== undefined) ocultar();
  else if (d.dif) empezar(partidaInfinita(d.dif));
  else if (d.nivel) empezar(partidaNivel(Number(d.nivel)), true);
  else if (d.lista !== undefined) { pag = S.m === "n" ? Math.floor((S.n - 1) / POR_PAG) : 0; menuNiveles(); }
  else if (d.pag) { pag += Number(d.pag); menuNiveles(); }
  else if (d.menu !== undefined) menuPrincipal();
  else if (d.sig !== undefined) empezar(partidaNivel(S.n + 1), true);
  else reiniciar(); // data-si (partida nueva) y data-rep (jugar de nuevo / reintentar / repetir)
});
$("bNueva").addEventListener("click", () => {
  if (fin || dlg) return;
  if (!hayPartida()) { reiniciar(); return; }
  mostrar("<h2>" + (S.m === "n" ? "¿Reiniciar el nivel?" : "¿Partida nueva?") + "</h2><p>" + (S.m === "n" ? "Empiezas el nivel desde cero." : "Se pierde la partida actual (los puntos que ya ganaste se conservan).") +
    '</p><div class="fila">' + boton("b-rojo", "data-si", "Sí, empezar") + boton("b-gris", "data-no", "Seguir jugando") + "</div>");
});
$("bMenu").addEventListener("click", () => { if (dlg) return; cierre(); guardarPartida(); menuPrincipal(); });

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
// Colores por número de capas: 1 = hierro gris, 2 = acero azul, 3 = hierro morado. Además se dibujan tantos puntitos abajo como capas (para distinguirlos sin depender del color)
const CAPAS = { 1: ["#b4bcc6", "#6f7883", "#3f464e", "#2b2f35"], 2: ["#a9cdf2", "#4f7fb8", "#1f4068", "#17304d"], 3: ["#d2b0f5", "#7a4bb3", "#38195f", "#2a1247"] };
function bloqueCandado(x, y, s, k = 1) { // bloque de hierro con candado: pierde una capa cada vez que se completa su línea
  const [c1, c2, borde, oscuro] = CAPAS[k] || CAPAS[1];
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = "rgba(40,45,52,.55)"; rr(x + 1, y + 2, s - 2, s - 2, s * 0.09); ctx.fill();
  ctx.fillStyle = g; rr(x + 1, y + 1, s - 3, s - 3, s * 0.09); ctx.fill();
  ctx.strokeStyle = borde; ctx.lineWidth = Math.max(2, s * (0.05 + 0.015 * k)); rr(x + 3, y + 3, s - 7, s - 7, s * 0.07); ctx.stroke();
  const cx = x + s / 2 - 1, cy = y + s / 2 + (k > 1 ? 0 : 2);
  ctx.strokeStyle = oscuro; ctx.lineWidth = s * 0.075; ctx.beginPath(); ctx.arc(cx, cy - s * 0.07, s * 0.135, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = oscuro; rr(cx - s * 0.2, cy - s * 0.06, s * 0.4, s * 0.3, s * 0.05); ctx.fill();
  ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(cx, cy + s * 0.06, s * 0.04, 0, 6.2832); ctx.fill(); ctx.fillRect(cx - s * 0.015, cy + s * 0.06, s * 0.03, s * 0.09);
  if (k > 1) for (let i = 0; i < k; i++) { ctx.fillStyle = oscuro; ctx.beginPath(); ctx.arc(x + s / 2 - 1 + (i - (k - 1) / 2) * s * 0.17, y + s - s * 0.13, s * 0.055, 0, 6.2832); ctx.fill(); ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x + s / 2 - 1 + (i - (k - 1) / 2) * s * 0.17, y + s - s * 0.13, s * 0.03, 0, 6.2832); ctx.fill(); }
}
function marcaObjetivo(x, y, s) { // aro rojo: este bloque hay que eliminarlo del todo (también cuando ya no le quedan candados)
  ctx.strokeStyle = "#ff4d2e"; ctx.lineWidth = Math.max(2, s * 0.06); rr(x + 1.5, y + 1.5, s - 4, s - 4, s * 0.1); ctx.stroke();
  ctx.fillStyle = "#ff4d2e"; ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + s * 0.3, y + 2); ctx.lineTo(x + 2, y + s * 0.3); ctx.closePath(); ctx.fill();
}
function forma(f, x0, y0, s, a = 1) { for (const [r, c] of f.celdas) bloque(x0 + c * s, y0 + r * s, s, a); }
function texto(t, x, y, tam, color) { ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(60,30,10,.85)"; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y); }

function dibujar() {
  ctx.drawImage(fondo, 0, 0);
  // marcadores: récord (morado) y puntos
  const esN = S.m === "n", rec = esN ? 0 : Math.max(REC[DIFICULTADES[S.d].clave] || 0, S.pt), hud = esN ? RETOS[nivelFijo(S.n).reto].hud(S, nivelFijo(S.n)) : null;
  ctx.font = "30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(esN ? hud.icono : "👑", 150, 72);
  const g = ctx.createLinearGradient(0, 78, 0, 134); g.addColorStop(0, "#9a6cf5"); g.addColorStop(1, "#6a3fd0");
  ctx.fillStyle = "#3a2410"; rr(68, 78, 164, 60, 14); ctx.fill(); ctx.fillStyle = g; rr(72, 80, 156, 52, 11); ctx.fill();
  ctx.fillStyle = "#3a2410"; rr(248, 78, 164, 60, 14); ctx.fill(); ctx.fillStyle = "#5a3418"; rr(252, 80, 156, 52, 11); ctx.fill();
  const izq = esN ? hud.txt : String(rec); texto(izq, 150, 118, izq.length > 5 ? 26 : 34, "#ffe27a"); texto(String(S.pt), 330, 118, 34, "#fff4d6");
  texto(nombreModo(), 240, 46, 22, "#fff4d6");
  // tablero
  ctx.fillStyle = "#8a5226"; rr(BX - 14, BY - 14, N * CELL + 28, N * CELL + 28, 16); ctx.fill();
  ctx.fillStyle = "#d39a52"; rr(BX - 11, BY - 11, N * CELL + 22, N * CELL + 22, 14); ctx.fill();
  ctx.fillStyle = "#3e2414"; rr(BX - 6, BY - 6, N * CELL + 12, N * CELL + 12, 10); ctx.fill();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((S.tab[r] >> c) & 1) {
      const k = capas(S.tab, r, c);
      if (k) bloqueCandado(BX + c * CELL, BY + r * CELL, CELL, k); else bloque(BX + c * CELL, BY + r * CELL, CELL);
      if (S.obj && ((S.obj[r] >> c) & 1)) marcaObjetivo(BX + c * CELL, BY + r * CELL, CELL);
    }
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
menuPrincipal(); // al abrir siempre se ve el menú (con «Continuar» si había una partida a medias)
requestAnimationFrame(bucle);
