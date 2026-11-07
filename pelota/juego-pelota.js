// Ruta: pelota/juego-pelota.js
// Una pelota que rueda, brinca, empuja cajas y aplasta monstruos. 5 niveles.
// Ajustes de física arriba. Los niveles están al final de este bloque (NIVELES).
const T = 40;          // tamaño de cada cuadro
const FILAS = 10;      // alto de todos los niveles (en cuadros)
const GRAV = 1900;
const VEL = 230;       // velocidad máxima al rodar
const SALTO = 650;     // fuerza de salto (alcanza ~2.8 cuadros; con una caja debajo, 3 cuadros de muro)

// Cada nivel es una lista de operaciones [letra, x0, y0, x1, y1] sobre una cuadrícula (x1,y1 opcionales).
// Letras: # bloque, . vacío (para hacer huecos), P inicio, B caja, M monstruo, o moneda, G bandera, ^ pinchos
const suelo = (w) => ["#", 0, 8, w - 1, 9];
const NIVELES = [
  { nombre: "Primeros pasos", ancho: 40, ops: [
    suelo(40), ["P", 2, 7], ["B", 12, 7], ["M", 20, 7], ["#", 27, 7], ["M", 32, 7], ["G", 36, 7],
    ["o", 10, 5, 12, 5], ["o", 27, 5], ["o", 30, 5, 32, 5],
  ] },
  { nombre: "El muro", ancho: 44, ops: [
    suelo(44), [".", 30, 8, 32, 9], ["#", 22, 5, 22, 7], ["P", 2, 7], ["B", 10, 7], ["M", 16, 7],
    ["M", 36, 7], ["G", 41, 7], ["o", 22, 4], ["o", 31, 6],
  ] },
  { nombre: "Aplasta monstruos", ancho: 46, ops: [
    suelo(46), [".", 16, 8, 18, 9], [".", 29, 8, 31, 9], ["#", 11, 6, 14, 6], ["#", 18, 5, 21, 5],
    ["P", 2, 7], ["M", 8, 7], ["M", 24, 7], ["M", 36, 7], ["M", 19, 4], ["G", 44, 7],
    ["o", 20, 4, 21, 4], ["o", 17, 6], ["o", 30, 6],
  ] },
  { nombre: "Dos muros", ancho: 44, ops: [
    suelo(44), ["#", 12, 5, 12, 7], ["#", 28, 5, 28, 7], ["P", 2, 7], ["B", 6, 7], ["B", 18, 7],
    ["M", 22, 7], ["M", 34, 7], ["G", 40, 7], ["o", 12, 4], ["o", 28, 4], ["o", 20, 5, 24, 5],
  ] },
  { nombre: "Gran final", ancho: 60, ops: [
    suelo(60), [".", 14, 8, 16, 9], [".", 40, 8, 47, 9], ["#", 22, 6, 22, 7], ["^", 26, 7, 28, 7],
    ["#", 36, 5, 36, 7], ["#", 41, 7, 42, 7], ["#", 45, 7, 46, 7],
    ["P", 2, 7], ["M", 8, 7], ["M", 30, 7], ["B", 32, 7], ["M", 52, 7], ["M", 56, 7], ["B", 50, 7], ["G", 58, 7],
    ["o", 15, 6], ["o", 27, 5], ["o", 41, 5], ["o", 45, 5], ["o", 36, 4],
  ] },
];

const $ = (id) => document.getElementById(id);
const cv = $("c"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1, esc = 1;
function ajustar() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  esc = Math.max(0.5, Math.min(H / (FILAS * T), W / 560));
}
addEventListener("resize", ajustar);
ajustar();

// ----- Estado -----
let COLS = 0, grid = [], cajas = [], monstruos = [], monedas = [], meta = null, bola = null;
let nivel = 0, inicio = 0, estado = "menu", tMuerte = 0, tiempo = 0, buffer = 0;
let nMonedas = 0, nMuertos = 0, intentos = 0;
const cam = { x: 0, y: 0 };

function cargar(i) {
  nivel = i;
  const N = NIVELES[i];
  COLS = N.ancho;
  grid = Array.from({ length: FILAS }, () => Array(COLS).fill("."));
  for (const [ch, x0, y0, x1 = x0, y1 = y0] of N.ops) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = ch;
  cajas = []; monstruos = []; monedas = []; meta = null; bola = null; nMonedas = 0; nMuertos = 0;
  for (let y = 0; y < FILAS; y++) for (let x = 0; x < COLS; x++) {
    const c = grid[y][x];
    if (c === "P") { bola = { x: x * T + 5, y: (y + 1) * T - 30, w: 30, h: 30, vx: 0, vy: 0, suelo: false, rot: 0, coyote: 0, saltando: false }; grid[y][x] = "."; }
    else if (c === "B") { cajas.push({ x: x * T, y: y * T, w: T, h: T, vy: 0, suelo: false }); grid[y][x] = "."; }
    else if (c === "M") { monstruos.push({ x: x * T + 3, y: (y + 1) * T - 28, w: 34, h: 28, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, vivo: true, t: 0, suelo: false }); grid[y][x] = "."; }
    else if (c === "o") { monedas.push({ x: x * T + 20, y: y * T + 20, c: false }); grid[y][x] = "."; }
    else if (c === "G") { meta = { x: x * T + 6, y: y * T - T, w: T - 12, h: T * 2 }; grid[y][x] = "."; }
  }
  cam.x = Math.max(0, bola.x - 200);
}

// ----- Colisiones -----
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const solido = (tx, ty) => (tx < 0 || tx >= COLS ? true : ty < 0 || ty >= FILAS ? false : grid[ty][tx] === "#");
function tilesHit(e, fn) {
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.001) / T);
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solido(tx, ty)) fn(tx, ty);
}
function puntoSolido(px, py) {
  if (solido(Math.floor(px / T), Math.floor(py / T))) return true;
  return cajas.some((c) => px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h);
}
function moverCajaX(c, dx) {
  c.x += dx;
  tilesHit(c, (tx) => { c.x = dx > 0 ? tx * T - c.w : (tx + 1) * T; });
  for (const o of cajas) if (o !== c && ov(c, o)) c.x = dx > 0 ? o.x - c.w : o.x + o.w;
}
// empuja = true solo para la pelota: mueve las cajas con las que choca
function moverX(e, dx, empuja) {
  if (!dx) return false;
  e.x += dx;
  let bloq = false;
  tilesHit(e, (tx) => { e.x = dx > 0 ? tx * T - e.w : (tx + 1) * T; bloq = true; });
  for (const c of cajas) {
    if (c === e || !ov(e, c)) continue;
    if (empuja) moverCajaX(c, dx);
    if (ov(e, c)) { e.x = dx > 0 ? c.x - e.w : c.x + c.w; bloq = true; }
  }
  return bloq;
}
function moverY(e, dy, esCaja) {
  e.y += dy;
  tilesHit(e, (tx, ty) => { if (dy > 0) { e.y = ty * T - e.h; e.suelo = true; } else e.y = (ty + 1) * T; e.vy = 0; });
  for (const c of cajas) {
    if (c === e || !ov(e, c)) continue;
    if (dy > 0) { e.y = c.y - e.h; e.suelo = true; } else e.y = c.y + c.h;
    e.vy = 0;
  }
  if (esCaja && ov(e, bola)) { if (dy > 0) { e.y = bola.y - e.h; e.suelo = true; } e.vy = 0; } // una caja que cae se apoya en la pelota
}

// ----- Controles -----
const tecla = {}, toque = { izq: false, der: false, salto: false };
const esSalto = (k) => k === " " || k === "arrowup" || k === "w";
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (esSalto(k) || k.startsWith("arrow")) e.preventDefault();
  if (esSalto(k) && !e.repeat) buffer = 0.12;
  tecla[k] = true;
});
addEventListener("keyup", (e) => (tecla[e.key.toLowerCase()] = false));
// Si la ventana pierde el foco (cambiar de pestaña, llamada…) se sueltan todas las teclas y botones para que la pelota no siga rodando sola
const soltarTodo = () => { for (const k in tecla) tecla[k] = false; toque.izq = toque.der = toque.salto = false; document.querySelectorAll(".ctl-wrap .b3d").forEach((b) => b.classList.remove("on")); };
addEventListener("blur", soltarTodo);
document.addEventListener("visibilitychange", () => { if (document.hidden) soltarTodo(); });
for (const [id, k] of [["izq", "izq"], ["der", "der"], ["salto", "salto"]]) {
  const b = $(id);
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); toque[k] = true; b.classList.add("on"); if (k === "salto") buffer = 0.12; b.setPointerCapture(e.pointerId); });
  const fin = () => { toque[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerup", fin); b.addEventListener("pointercancel", fin);
}
const izq = () => tecla.arrowleft || tecla.a || toque.izq;
const der = () => tecla.arrowright || tecla.d || toque.der;
const saltoDown = () => tecla[" "] || tecla.arrowup || tecla.w || toque.salto;

// ----- Reglas del juego -----
function morir() { estado = "muerto"; tMuerte = 0; intentos++; }

function paso(dt) {
  if (estado !== "jugando") return;
  const b = bola;
  const dir = (izq() ? -1 : 0) + (der() ? 1 : 0);
  if (dir) {
    const acc = (b.suelo ? 1700 : 1000) * dt, dif = dir * VEL - b.vx;
    b.vx += Math.sign(dif) * Math.min(Math.abs(dif), acc);
  } else {
    const f = (b.suelo ? 900 : 150) * dt;
    b.vx = Math.abs(b.vx) <= f ? 0 : b.vx - Math.sign(b.vx) * f;
  }
  b.vy = Math.min(b.vy + GRAV * dt, 900);
  b.coyote = b.suelo ? 0.1 : b.coyote - dt;
  buffer -= dt;
  if (buffer > 0 && b.coyote > 0) { b.vy = -SALTO; b.coyote = 0; buffer = 0; b.saltando = true; }
  if (b.saltando && !saltoDown() && b.vy < -220) { b.vy = -220; b.saltando = false; }
  if (b.vy >= 0) b.saltando = false;
  if (moverX(b, b.vx * dt, true)) b.vx = 0;
  b.suelo = false;
  moverY(b, b.vy * dt, false);
  b.rot += (b.vx * dt) / 15;

  for (const c of cajas) { c.vy = Math.min(c.vy + GRAV * dt, 900); c.suelo = false; moverY(c, c.vy * dt, true); }

  for (const m of monstruos) {
    if (!m.vivo) { m.t += dt; continue; }
    m.vy = Math.min(m.vy + GRAV * dt, 900);
    if (moverX(m, m.dir * 55 * dt, false)) m.dir *= -1;
    else if (m.suelo) {
      const px = m.dir > 0 ? m.x + m.w + 2 : m.x - 2;
      if (!puntoSolido(px, m.y + m.h + 6)) m.dir *= -1; // da la vuelta en los bordes
    }
    m.suelo = false;
    moverY(m, m.vy * dt, false);
    for (const c of cajas) if (ov(m, c)) { m.vivo = false; m.t = 0; } // una caja lo aplasta
  }
  for (const m of monstruos) {
    if (!m.vivo || !ov(b, m)) continue;
    if (b.vy > 0 && b.y + b.h - m.y < 22) { m.vivo = false; m.t = 0; nMuertos++; b.vy = saltoDown() ? -620 : -450; b.saltando = false; }
    else return morir();
  }
  // pinchos
  let pincho = false;
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w) / T), y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (ty >= 0 && ty < FILAS && tx >= 0 && tx < COLS && grid[ty][tx] === "^" && ov(b, { x: tx * T + 6, y: ty * T + 22, w: T - 12, h: T - 22 })) pincho = true;
  }
  if (pincho || b.y > FILAS * T + 100) return morir();
  for (const c of monedas) if (!c.c && Math.hypot(c.x - (b.x + 15), c.y - (b.y + 15)) < 24) { c.c = true; nMonedas++; }
  if (ov(b, meta)) completar();
}

async function completar() {
  estado = "ganado";
  const puntos = 100 + nMonedas * 10 + nMuertos * 50;
  const ultimo = nivel === NIVELES.length - 1;
  $("fin").querySelector("h2").textContent = ultimo ? "🏆 ¡Ganaste el juego!" : "¡Nivel " + (nivel + 1) + " completo!";
  $("texto").textContent = "Monedas: " + nMonedas + " · Monstruos aplastados: " + nMuertos + " · Puntos: " + puntos + (intentos ? " · Intentos fallidos: " + intentos : "");
  inicio = ultimo ? 0 : nivel + 1;
  marcarNivel();
  $("jugar").textContent = ultimo ? "Jugar otra vez" : "Siguiente nivel";
  $("msg").textContent = "";
  $("fin").hidden = false; $("hud").hidden = true;
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    const ok = await sumarPuntos("pelota", puntos);
    $("msg").textContent = ok ? "Puntos guardados en tu perfil." : "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) {
    $("msg").textContent = "No se pudieron guardar los puntos (sin conexión).";
  }
}

function empezar() {
  intentos = 0; // los fallos se cuentan por nivel
  cargar(inicio);
  estado = "jugando";
  $("fin").hidden = true; $("hud").hidden = false;
}

// ----- Menú de niveles -----
// Color = dificultad: verde → azul → morado → dorado → rojo
const COLOR_NIVEL = ["b-verde", "b-azul", "b-morado", "b-oro", "b-rojo"];
function marcarNivel() { document.querySelectorAll("#niveles .b3d").forEach((b, i) => b.classList.toggle("on", i === inicio)); }
NIVELES.forEach((n, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d chico " + COLOR_NIVEL[i % COLOR_NIVEL.length]; b.textContent = i + 1; b.title = n.nombre;
  b.addEventListener("click", () => { inicio = i; marcarNivel(); });
  $("niveles").appendChild(b);
});
marcarNivel();
$("jugar").addEventListener("click", empezar);
cargar(0);

// ----- Dibujo -----
function dibujarFondo() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#6cc8ff"); g.addColorStop(1, "#e6f6ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 - cam.x * 0.15 * esc) % (W + 300) + W + 300) % (W + 300) - 150, y = 50 + (i % 3) * 40;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.arc(x + 26, y + 6, 18, 0, 7); ctx.arc(x - 24, y + 8, 16, 0, 7); ctx.fill();
  }
  ctx.fillStyle = "#a6dc8c";
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.72 - Math.sin((x + cam.x * esc * 0.3) / 140) * 26 - 20);
  ctx.lineTo(W, H); ctx.fill();
}

function dibujarMonstruo(m, t) {
  const cx = m.x + m.w / 2, base = m.y + m.h;
  ctx.save();
  ctx.translate(cx, base);
  if (!m.vivo) { ctx.scale(1.25, Math.max(0.05, 0.3 - m.t)); ctx.globalAlpha = Math.max(0, 1 - m.t * 1.5); }
  const salto = m.vivo ? Math.abs(Math.sin(t * 8 + m.x)) * 2 : 0;
  ctx.fillStyle = "#4caf50";
  ctx.beginPath(); ctx.ellipse(0, -m.h / 2 - salto, m.w / 2, m.h / 2, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#2e7d32"; ctx.fillRect(-m.w / 2 + 3, -4 - salto, 8, 4); ctx.fillRect(m.w / 2 - 11, -4 - salto, 8, 4);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-7, -m.h / 2 - 3 - salto, 5.5, 0, 7); ctx.arc(7, -m.h / 2 - 3 - salto, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(-7 + m.dir * 1.5, -m.h / 2 - 3 - salto, 2.5, 0, 7); ctx.arc(7 + m.dir * 1.5, -m.h / 2 - 3 - salto, 2.5, 0, 7); ctx.fill();
  ctx.strokeStyle = "#1b5e20"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-12, -m.h + 2 - salto); ctx.lineTo(-3, -m.h + 6 - salto); ctx.moveTo(12, -m.h + 2 - salto); ctx.lineTo(3, -m.h + 6 - salto); ctx.stroke();
  ctx.restore();
}

function dibujarBola(b) {
  const r = 15, cx = b.x + r, cy = b.y + r;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,0,0,.0)";
  ctx.rotate(b.rot);
  const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, r);
  g.addColorStop(0, "#ff9a8a"); g.addColorStop(1, "#d8322a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(0, -8, 2.5, 0, 7); ctx.fill();
  ctx.strokeStyle = "#7a1410"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r - 0.7, 0, 7); ctx.stroke();
  ctx.restore();
  // ojos: no giran con la pelota
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 4, cy - 2, 4, 0, 7); ctx.arc(cx + 5, cy - 2, 4, 0, 7); ctx.fill();
  ctx.fillStyle = "#111"; const o = Math.max(-1.5, Math.min(1.5, b.vx / 150));
  ctx.beginPath(); ctx.arc(cx - 4 + o, cy - 2, 2, 0, 7); ctx.arc(cx + 5 + o, cy - 2, 2, 0, 7); ctx.fill();
}

function dibujar(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dibujarFondo();
  const viewW = W / esc, viewH = H / esc;
  cam.y = (FILAS * T - viewH) / 2;
  ctx.setTransform(dpr * esc, 0, 0, dpr * esc, -cam.x * dpr * esc, -cam.y * dpr * esc);

  // tierra bajo el nivel
  ctx.fillStyle = "#6b4423"; ctx.fillRect(cam.x - 10, FILAS * T, viewW + 20, viewH);
  const tx0 = Math.max(0, Math.floor(cam.x / T)), tx1 = Math.min(COLS - 1, Math.ceil((cam.x + viewW) / T));
  for (let ty = 0; ty < FILAS; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = grid[ty][tx];
    if (c === "#") {
      ctx.fillStyle = "#8d5a2b"; ctx.fillRect(tx * T, ty * T, T + 0.5, T + 0.5);
      ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(tx * T + 6, ty * T + 14, 8, 6); ctx.fillRect(tx * T + 22, ty * T + 27, 10, 6);
      if (!solido(tx, ty - 1)) { ctx.fillStyle = "#58b947"; ctx.fillRect(tx * T, ty * T, T + 0.5, 9); ctx.fillStyle = "#3f9a35"; ctx.fillRect(tx * T, ty * T + 8, T + 0.5, 3); }
    } else if (c === "^") {
      ctx.fillStyle = "#b8bfcc";
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(tx * T + k * 13 + 1, (ty + 1) * T); ctx.lineTo(tx * T + k * 13 + 7, ty * T + 14); ctx.lineTo(tx * T + k * 13 + 13, (ty + 1) * T); ctx.fill(); }
    }
  }
  // bandera
  ctx.fillStyle = "#eee"; ctx.fillRect(meta.x + 14, meta.y + 6, 4, T * 2 - 6);
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(meta.x + 18, meta.y + 6); ctx.lineTo(meta.x + 18 + 28, meta.y + 16 + Math.sin(t * 5) * 2); ctx.lineTo(meta.x + 18, meta.y + 28); ctx.fill();
  // monedas
  for (const c of monedas) {
    if (c.c) continue;
    const a = Math.abs(Math.cos(t * 3 + c.x));
    ctx.fillStyle = "#ffcf33"; ctx.beginPath(); ctx.ellipse(c.x, c.y + Math.sin(t * 4 + c.x) * 2, 9 * a + 2, 10, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2; ctx.stroke();
  }
  // cajas
  for (const c of cajas) {
    ctx.fillStyle = "#c98a3a"; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = "#6e4210"; ctx.lineWidth = 3; ctx.strokeRect(c.x + 1.5, c.y + 1.5, c.w - 3, c.h - 3);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x + 4, c.y + 4); ctx.lineTo(c.x + c.w - 4, c.y + c.h - 4); ctx.moveTo(c.x + c.w - 4, c.y + 4); ctx.lineTo(c.x + 4, c.y + c.h - 4); ctx.stroke();
  }
  for (const m of monstruos) if (m.vivo || m.t < 0.7) dibujarMonstruo(m, t);
  if (estado !== "muerto" || tMuerte < 0.3) dibujarBola(bola);

  // cartel al caer
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (estado === "muerto") {
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#fff"; ctx.font = "800 34px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("¡Ups! Otra vez", W / 2, H / 2);
  }
  const h = $("hud"), txt = "Nivel " + (nivel + 1) + ": " + NIVELES[nivel].nombre + "  ·  🪙 " + nMonedas + "/" + monedas.length;
  if (h.textContent !== txt) h.textContent = txt;
}

// ----- Bucle -----
let ultimo = performance.now(), reloj = 0;
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora; reloj += dt;
  if (estado === "jugando") {
    const n = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < n; i++) paso(dt / n);
  } else if (estado === "muerto") {
    tMuerte += dt;
    if (tMuerte > 0.9) { cargar(nivel); estado = "jugando"; }
  }
  // cámara: sigue a la pelota sin salirse del nivel
  const viewW = W / esc, maxX = COLS * T - viewW;
  const objetivo = maxX <= 0 ? maxX / 2 : Math.max(0, Math.min(maxX, bola.x + 15 - viewW / 2));
  cam.x += (objetivo - cam.x) * Math.min(1, dt * 8);
  dibujar(reloj);
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
