// Ruta: fusionanumeros/juego.js
// 5 columnas de 8 bloques. Dejas caer el bloque de arriba en una columna; los bloques iguales que quedan
// pegados (abajo, a los lados o arriba) se fusionan y suman sus valores, y la fusión puede encadenarse.
// El juego termina cuando las 5 columnas están llenas y el bloque actual no encaja con ninguna.

const COLS = 5, FILAS = 8, CELDA = 64, BX = 20, BY = 112, W = 360, H = 650;
const ID_JUEGO = "fusionanumeros";
const CLAVE = "fusionanumeros-record";
const VENTANA = 5;          // cuántos valores distintos pueden salir a la vez (se desplaza al subir el máximo)
const ATRASO_MAX = 2;       // el valor más alto que sale es: máximo conseguido ÷ 2^ATRASO_MAX (mínimo 32)
const PROB_UTIL = 0.3;      // probabilidad de que salga un número igual a alguno que esté arriba de una columna
const PUNTOS_LOTE = 25;     // fusiones por cada envío de puntos al perfil

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), ctx = cv.getContext("2d");
const dpr = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * dpr; cv.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// Puntos con sesión de Google (si no hay sesión o conexión, el juego funciona igual)
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => (sumarPuntos = m.sumarPuntos)).catch(() => {});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const expo = (v) => Math.round(Math.log2(v));

// ----- Números con abreviatura (K, M, B, T…) para valores muy altos -----
const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td"];
function fmt(v) {
  if (v < 10000) return String(v);
  const i = Math.floor(Math.log10(v) / 3);
  if (i >= SUF.length) return v.toExponential(1).replace("+", "");
  return parseFloat((v / Math.pow(10, 3 * i)).toPrecision(3)) + SUF[i];
}

// ----- Estado -----
let cols, actual, siguiente, hover = 2, activo, estado, puntos, maxBloque, pend, espera, flyers, aviso;
let record = { bloque: 2, puntos: 0 };
try { record = Object.assign(record, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(record)); } catch (e) {} };

const nuevoBloque = (v, y) => ({ v, y, vy: 0, pulse: 0 });

function nuevaPartida() {
  cols = Array.from({ length: COLS }, () => []);
  puntos = 0; maxBloque = 2; pend = 0; espera = 0;
  flyers = []; activo = null; aviso = null;
  actual = 2;                 // siempre se empieza con un 2
  siguiente = valorAzar();
  estado = "listo";
  $("fin").hidden = true;
  hud();
}

// Valor al azar: sube con el bloque más alto conseguido
function valorAzar() {
  // a veces sale un número igual a alguno que quedó arriba de una columna (evita callejones sin salida)
  const arriba = cols.filter((c) => c.length).map((c) => c[c.length - 1].v);
  const eu = Math.max(5, expo(maxBloque) - ATRASO_MAX);
  if (arriba.length && Math.random() < PROB_UTIL) {
    const v = arriba[(Math.random() * arriba.length) | 0];
    if (expo(v) <= eu) return v;
  }
  const el = Math.max(1, eu - VENTANA);
  let tot = 0;
  const pesos = [];
  for (let e = el; e <= eu; e++) { const p = Math.pow(0.65, e - el); pesos.push([e, p]); tot += p; }
  let r = Math.random() * tot;
  for (const [e, p] of pesos) if ((r -= p) < 0) return Math.pow(2, e);
  return Math.pow(2, el);
}

// ----- Reglas -----
const get = (c, r) => (c >= 0 && c < COLS ? cols[c][r] : undefined);
function pos(b) {
  for (let c = 0; c < COLS; c++) { const r = cols[c].indexOf(b); if (r >= 0) return { c, r }; }
  return { c: -1, r: -1 };
}
// Bloque + sus vecinos iguales (abajo, izquierda, derecha, arriba)
function grupo(b) {
  const p = pos(b);
  if (p.c < 0) return null;
  const g = [b];
  for (const [dc, dr] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
    const n = get(p.c + dc, p.r + dr);
    if (n && n.v === b.v) g.push(n);
  }
  return g.length > 1 ? g : null;
}
// Hace UNA fusión (primero alrededor del último bloque movido, luego en todo el tablero). Devuelve true si fusionó
function fusionar() {
  let g = activo ? grupo(activo) : null;
  if (!g) {
    for (let r = 0; r < FILAS + 1 && !g; r++) for (let c = 0; c < COLS && !g; c++) { const b = get(c, r); if (b) g = grupo(b); }
  }
  if (!g) return false;
  // sobrevive el bloque más bajo del grupo (en empate, el central)
  const info = g.map((b) => ({ b, p: pos(b) }));
  let s = info[0];
  for (const it of info) if (it.p.r < s.p.r) s = it;
  const k = g.length - 1;                  // vecinos absorbidos: 1 → suma de dos (×2); 2 → ×4; 3 → ×8
  const nuevo = s.b.v * Math.pow(2, k);
  info.filter((it) => it !== s).sort((a, b) => b.p.r - a.p.r).forEach((it) => {
    flyers.push({ c0: it.p.c, y0: it.b.y, c1: s.p.c, y1: s.b.y, v: it.b.v, t: 0 });
    cols[it.p.c].splice(it.p.r, 1);
  });
  s.b.v = nuevo;
  s.b.pulse = 1;
  activo = s.b;
  puntos += nuevo;
  pend++;
  if (pend >= PUNTOS_LOTE) enviarPuntos();
  if (nuevo > maxBloque) maxBloque = nuevo;
  if (nuevo > record.bloque) record.bloque = nuevo;
  hud();
  return true;
}

function soltar(c) {
  if (estado !== "listo") return;
  const col = cols[c];
  if (col.length >= FILAS && col[col.length - 1].v !== actual) {
    aviso = { txt: "Columna llena", t: 1.2 };
    return;
  }
  const b = nuevoBloque(actual, FILAS + 0.375);
  b.vy = 6;
  col.push(b);
  activo = b;
  actual = siguiente;
  siguiente = valorAzar();
  estado = "resolviendo";
  espera = 0;
}

function hayJugada() {
  return cols.some((c) => c.length < FILAS) || cols.some((c) => c[c.length - 1].v === actual);
}

function terminar() {
  estado = "fin";
  if (puntos > record.puntos) record.puntos = puntos;
  guardar();
  enviarPuntos();
  $("ftexto").textContent = "Puntos: " + fmt(puntos) + " · Bloque más alto: " + fmt(maxBloque);
  $("fin").hidden = false;
}

function enviarPuntos() {
  if (!sumarPuntos || pend <= 0) return;
  const n = Math.min(pend, 1000);
  pend -= n;
  sumarPuntos(ID_JUEGO, n).catch(() => {});
}
document.addEventListener("visibilitychange", () => { if (document.hidden) enviarPuntos(); });
addEventListener("pagehide", enviarPuntos);

function hud() {
  $("puntos").textContent = fmt(puntos);
  $("maximo").textContent = fmt(maxBloque);
  $("record").textContent = fmt(record.bloque);
}

// ----- Actualización -----
function actualizar(dt) {
  let mov = false;
  for (const col of cols) {
    col.forEach((b, i) => {
      if (b.y > i + 1e-4) {
        b.vy += 140 * dt;
        b.y = Math.max(i, b.y - b.vy * dt);
        if (b.y <= i + 1e-4) { b.y = i; b.vy = 0; } else mov = true;
      } else { b.y = i; b.vy = 0; }
      if (b.pulse > 0) b.pulse = Math.max(0, b.pulse - dt * 4);
    });
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    flyers[i].t += dt / 0.16;
    if (flyers[i].t >= 1) flyers.splice(i, 1); else mov = true;
  }
  if (aviso) { aviso.t -= dt; if (aviso.t <= 0) aviso = null; }
  if (estado !== "resolviendo" || mov) return;
  espera -= dt;
  if (espera > 0) return;
  if (fusionar()) { espera = 0.06; return; }
  activo = null;
  estado = "listo";
  if (!hayJugada()) terminar();
}

// ----- Dibujo -----
const colorDe = (v) => "hsl(" + ((expo(v) * 47 + 10) % 360) + ",62%,48%)";
const xCol = (c) => BX + c * CELDA;
const yFila = (r) => BY + (FILAS - 1 - r) * CELDA;

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function bloque(x, y, tam, v, escala, alfa) {
  const s = tam * (escala || 1), cx = x + tam / 2, cy = y + tam / 2;
  const m = 3;
  ctx.globalAlpha = alfa == null ? 1 : alfa;
  rr(cx - s / 2 + m, cy - s / 2 + m, s - 2 * m, s - 2 * m, 10);
  ctx.fillStyle = colorDe(v);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.stroke();
  const t = fmt(v), n = t.length;
  const fs = (n <= 2 ? 30 : n === 3 ? 26 : n === 4 ? 22 : n === 5 ? 19 : 16) * (tam / CELDA) * (escala || 1);
  ctx.font = "bold " + fs + "px system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillText(t, cx + 1, cy + 2);
  ctx.fillStyle = "#fff";
  ctx.fillText(t, cx, cy + 1);
  ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.fillStyle = "#0f1220";
  ctx.fillRect(0, 0, W, H);

  // tablero
  rr(BX - 6, BY - 6, COLS * CELDA + 12, FILAS * CELDA + 12, 14);
  ctx.fillStyle = "#1b2036";
  ctx.fill();
  for (let c = 0; c < COLS; c++) {
    ctx.fillStyle = c === hover && estado === "listo" ? "rgba(124,92,255,.22)" : c % 2 ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.07)";
    ctx.fillRect(xCol(c), BY, CELDA, FILAS * CELDA);
  }

  // guía de caída del bloque actual
  if (estado === "listo") {
    const h = cols[hover].length;
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "rgba(255,255,255,.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xCol(hover) + CELDA / 2, BY - 18);
    ctx.lineTo(xCol(hover) + CELDA / 2, yFila(Math.min(h, FILAS - 1)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // bloques
  for (let c = 0; c < COLS; c++) {
    for (const b of cols[c]) bloque(xCol(c), yFila(b.y), CELDA, b.v, 1 + 0.2 * Math.sin(b.pulse * Math.PI), 1);
  }
  for (const f of flyers) {
    const e = f.t * f.t * (3 - 2 * f.t);
    const x = xCol(f.c0) + (xCol(f.c1) - xCol(f.c0)) * e;
    const y = yFila(f.y0) + (yFila(f.y1) - yFila(f.y0)) * e;
    bloque(x, y, CELDA, f.v, 1 - 0.25 * e, 1 - 0.5 * e);
  }

  // bloque actual (sobre la columna elegida) y siguiente
  if (estado !== "fin") {
    if (estado === "listo") bloque(xCol(hover), 24, CELDA, actual, 1, 1);
    ctx.font = "12px system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#aab2d8";
    ctx.fillText("Siguiente", 322, 24);
    bloque(300, 28, 44, siguiente, 1, 1);
  }

  if (aviso) {
    ctx.globalAlpha = Math.min(1, aviso.t * 2);
    ctx.font = "bold 20px system-ui,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(aviso.txt, W / 2, H / 2);
    ctx.globalAlpha = 1;
  }
}

// ----- Controles -----
function colDe(e) {
  const r = cv.getBoundingClientRect();
  return clamp(Math.floor(((e.clientX - r.left) / r.width * W - BX) / CELDA), 0, COLS - 1);
}
cv.addEventListener("pointerdown", (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  hover = colDe(e);
});
cv.addEventListener("pointermove", (e) => { hover = colDe(e); });
cv.addEventListener("pointerup", (e) => { hover = colDe(e); soltar(hover); });
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") hover = Math.max(0, hover - 1);
  else if (e.key === "ArrowRight") hover = Math.min(COLS - 1, hover + 1);
  else if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); soltar(hover); }
  else if (e.key >= "1" && e.key <= "5") { hover = Number(e.key) - 1; soltar(hover); }
});
$("reiniciar").addEventListener("click", () => { enviarPuntos(); nuevaPartida(); });
$("otra").addEventListener("click", nuevaPartida);

// ----- Bucle -----
nuevaPartida();
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.033, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
