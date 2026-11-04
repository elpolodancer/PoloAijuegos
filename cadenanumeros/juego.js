// Ruta: cadenanumeros/juego.js
// Tablero de 6 columnas × 7 filas. Desliza el dedo por números pegados (también en diagonal):
// los dos primeros deben ser iguales y cada siguiente puede ser igual al anterior o su doble.
// Al soltar, la cadena se fusiona en un solo bloque (la suma, redondeada hacia arriba a potencia de 2)
// en la última casilla; el resto desaparece, lo de arriba cae y llegan números nuevos.

const COLS = 6, FILAS = 7, CELDA = 56, BX = 12, BY = 76, W = 360, H = 480;
const VALORES = [[2, 30], [4, 25], [8, 20], [16, 12], [32, 8], [64, 4], [128, 1]]; // [valor, peso]
const ID_JUEGO = "cadenanumeros";
const CLAVE = "cadenanumeros-record";
const PUNTOS_LOTE = 30;     // puntos acumulados antes de enviarlos al perfil

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
const potencia = (n) => { let p = 2; while (p < n) p *= 2; return p; }; // menor potencia de 2 ≥ n

// ----- Números con abreviatura (K, M, B…) -----
const SUF = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
function fmt(v) {
  if (v < 10000) return String(v);
  const i = Math.floor(Math.log10(v) / 3);
  if (i >= SUF.length) return v.toExponential(1).replace("+", "");
  return parseFloat((v / Math.pow(10, 3 * i)).toPrecision(3)) + SUF[i];
}

// ----- Estado -----
let cols, sel, estado, puntos, maxBloque, pend, flyers, aviso, chispas;
let record = { bloque: 2, puntos: 0 };
try { record = Object.assign(record, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(record)); } catch (e) {} };

const PESO_TOTAL = VALORES.reduce((s, v) => s + v[1], 0);
function valorAzar() {
  let r = Math.random() * PESO_TOTAL;
  for (const [v, p] of VALORES) if ((r -= p) < 0) return v;
  return 2;
}
const nuevoBloque = (v, y) => ({ v, y, vy: 0, pulse: 0 });

function nuevaPartida() {
  cols = Array.from({ length: COLS }, () => []);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < FILAS; r++) cols[c].push(nuevoBloque(valorAzar(), r));
  sel = []; flyers = []; aviso = null; chispas = [];
  puntos = 0; maxBloque = 2; pend = 0;
  estado = "listo";
  asegurarJugada(false);
  hud();
}

// ----- Reglas -----
const get = (c, r) => (c >= 0 && c < COLS ? cols[c][r] : undefined);
const vecinas = (a, b) => Math.abs(a.c - b.c) <= 1 && Math.abs(a.r - b.r) <= 1 && !(a.c === b.c && a.r === b.r);
const valorDe = (p) => get(p.c, p.r).v;

// ¿Se puede añadir la casilla p a la cadena actual?
function sePuede(p) {
  const b = get(p.c, p.r);
  if (!b) return false;
  if (!sel.length) return true;
  const ult = sel[sel.length - 1];
  if (!vecinas(ult, p) || sel.some((s) => s.c === p.c && s.r === p.r)) return false;
  const lv = valorDe(ult);
  return sel.length === 1 ? b.v === lv : b.v === lv || b.v === lv * 2;
}
const sumaSel = () => sel.reduce((s, p) => s + valorDe(p), 0);

// ¿Hay al menos un par de números iguales pegados (en cualquier dirección)?
function hayJugada() {
  for (let c = 0; c < COLS; c++) for (let r = 0; r < FILAS; r++) {
    const b = get(c, r);
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      if (!dc && !dr) continue;
      const n = get(c + dc, r + dr);
      if (n && n.v === b.v) return true;
    }
  }
  return false;
}
// Si no hay jugadas, reordena los números (sin cambiar cuáles hay) hasta que haya
function asegurarJugada(avisar) {
  if (hayJugada()) return;
  mezclar(false);
  if (avisar) aviso = { txt: "Sin jugadas: mezclando", t: 1.5 };
}
function mezclar(manual) {
  const todos = cols.flat();
  const vals = todos.map((b) => b.v);
  for (let intento = 0; intento < 60; intento++) {
    for (let i = vals.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [vals[i], vals[j]] = [vals[j], vals[i]]; }
    todos.forEach((b, i) => (b.v = vals[i]));
    if (hayJugada()) break;
  }
  if (!hayJugada()) { // por si acaso: fuerza un par igual
    const a = get(0, 0), b = get(1, 0);
    b.v = a.v;
  }
  todos.forEach((b) => (b.pulse = 1));
  if (manual) aviso = { txt: "¡Mezclado!", t: 1 };
}

function confirmar() {
  if (sel.length < 2) { sel = []; return; }
  const total = sumaSel();
  const nuevo = potencia(total);
  const fin = sel[sel.length - 1];
  const sobrev = get(fin.c, fin.r);
  const quitar = sel.slice(0, -1).map((p) => ({ p, b: get(p.c, p.r) }));
  for (const q of quitar) flyers.push({ c0: q.p.c, y0: q.b.y, c1: fin.c, y1: sobrev.y, v: q.b.v, t: 0 });
  // se quitan de las columnas (de arriba hacia abajo para no desordenar índices)
  quitar.sort((a, b) => b.p.r - a.p.r).forEach((q) => cols[q.p.c].splice(q.p.r, 1));
  sobrev.v = nuevo;
  sobrev.pulse = 1;
  // llegan números nuevos por arriba
  for (let c = 0; c < COLS; c++) {
    let k = 0;
    while (cols[c].length < FILAS) cols[c].push(nuevoBloque(valorAzar(), FILAS + k++));
  }
  puntos += nuevo;
  pend += sel.length - 1;
  if (pend >= PUNTOS_LOTE) enviarPuntos();
  if (nuevo > maxBloque) maxBloque = nuevo;
  if (nuevo > record.bloque) record.bloque = nuevo;
  if (puntos > record.puntos) record.puntos = puntos;
  guardar();
  sel = [];
  estado = "resolviendo";
  hud();
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
        b.vy += 90 * dt;
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
  if (estado === "resolviendo" && !mov) {
    estado = "listo";
    asegurarJugada(true);
  }
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
function bloque(x, y, tam, v, escala, alfa, marcado) {
  const s = tam * (escala || 1), cx = x + tam / 2, cy = y + tam / 2, m = 3;
  ctx.globalAlpha = alfa == null ? 1 : alfa;
  rr(cx - s / 2 + m, cy - s / 2 + m, s - 2 * m, s - 2 * m, 10);
  ctx.fillStyle = colorDe(v);
  ctx.fill();
  ctx.lineWidth = marcado ? 4 : 2;
  ctx.strokeStyle = marcado ? "#fff" : "rgba(255,255,255,.3)";
  ctx.stroke();
  const t = fmt(v), n = t.length;
  const fs = (n <= 2 ? 26 : n === 3 ? 22 : n === 4 ? 19 : n === 5 ? 16 : 13) * (tam / CELDA) * (escala || 1);
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
  rr(BX - 5, BY - 5, COLS * CELDA + 10, FILAS * CELDA + 10, 14);
  ctx.fillStyle = "#1b2036";
  ctx.fill();

  // bloques
  const marcados = new Set(sel.map((p) => p.c + "," + p.r));
  for (let c = 0; c < COLS; c++) {
    cols[c].forEach((b, r) => {
      const m = marcados.has(c + "," + r);
      bloque(xCol(c), yFila(b.y), CELDA, b.v, (m ? 0.9 : 1) + 0.2 * Math.sin(b.pulse * Math.PI), 1, m);
    });
  }
  for (const f of flyers) {
    const e = f.t * f.t * (3 - 2 * f.t);
    bloque(xCol(f.c0) + (xCol(f.c1) - xCol(f.c0)) * e, yFila(f.y0) + (yFila(f.y1) - yFila(f.y0)) * e, CELDA, f.v, 1 - 0.3 * e, 1 - 0.5 * e);
  }

  // línea de la cadena
  if (sel.length) {
    ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    sel.forEach((p, i) => {
      const x = xCol(p.c) + CELDA / 2, y = yFila(get(p.c, p.r).y) + CELDA / 2;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  // resultado de la cadena
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (sel.length >= 2) {
    const total = sumaSel(), nuevo = potencia(total);
    ctx.font = "13px system-ui,sans-serif";
    ctx.fillStyle = "#aab2d8";
    ctx.fillText("Suma " + fmt(total) + " →", W / 2 - 34, 22);
    bloque(W / 2 + 6, 6, 34, nuevo, 1, 1);
  } else if (sel.length === 1) {
    ctx.font = "14px system-ui,sans-serif";
    ctx.fillStyle = "#aab2d8";
    ctx.fillText("Sigue con uno igual", W / 2, 24);
  } else {
    ctx.font = "14px system-ui,sans-serif";
    ctx.fillStyle = "#aab2d8";
    ctx.fillText("Une números iguales (y luego dobles)", W / 2, 24);
  }

  if (aviso) {
    ctx.globalAlpha = Math.min(1, aviso.t * 2);
    ctx.font = "bold 20px system-ui,sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(aviso.txt, W / 2, 50);
    ctx.globalAlpha = 1;
  }
}

// ----- Controles -----
// Casilla bajo el dedo (se exige estar cerca del centro para que las diagonales no se confundan)
function casilla(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
  const c = Math.floor((x - BX) / CELDA), f = FILAS - 1 - Math.floor((y - BY) / CELDA);
  if (c < 0 || c >= COLS || f < 0 || f >= FILAS) return null;
  const cx = xCol(c) + CELDA / 2, cy = yFila(f) + CELDA / 2;
  if (Math.hypot(x - cx, y - cy) > CELDA * 0.42) return null;
  return { c, r: f };
}
function mover(e) {
  if (estado !== "listo" || !sel.length) return;
  const p = casilla(e);
  if (!p) return;
  const ult = sel[sel.length - 1];
  if (p.c === ult.c && p.r === ult.r) return;
  // volver a la casilla anterior deshace el último paso
  if (sel.length >= 2) {
    const ant = sel[sel.length - 2];
    if (p.c === ant.c && p.r === ant.r) { sel.pop(); return; }
  }
  if (sePuede(p)) sel.push(p);
}
cv.addEventListener("pointerdown", (e) => {
  if (estado !== "listo") return;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  const p = casilla(e);
  sel = p ? [p] : [];
});
cv.addEventListener("pointermove", mover);
function soltar() { if (estado === "listo") confirmar(); else sel = []; }
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", () => { sel = []; });

$("mezclar").addEventListener("click", () => { if (estado === "listo") { sel = []; mezclar(true); } });
$("reiniciar").addEventListener("click", () => { enviarPuntos(); nuevaPartida(); });

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
