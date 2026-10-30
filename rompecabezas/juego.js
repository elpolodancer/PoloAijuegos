// Ruta: rompecabezas/juego.js
// Rompecabezas con piezas de lengüeta, 32/64/128/256/512 piezas, zoom (pellizco, rueda y botones)
// y subida segura de la imagen a imgbb a través de un Apps Script (la API key NUNCA va aquí).

import { URL_SUBIDA_IMAGENES } from "../compartido/configs.js";

// ---------- AJUSTES ----------
const ID = "rompecabezas";
const URL_SUBIDA = URL_SUBIDA_IMAGENES;         // se cambia en compartido/configs.js
const OPCIONES = [32, 64, 128, 256, 512];
const LADO_MAX = 2000;          // la imagen se reduce a este lado máximo (px) antes de usarse/subirse
const IMAGEN_MAX_MB = 15;       // tamaño máximo del archivo elegido
const PIEZA_W = 80;             // ancho de pieza en unidades del «mundo» (no son píxeles)
const IMAN = 0.35;              // qué tan cerca (fracción de pieza) para que encaje sola
const ZOOM_MIN = 0.05, ZOOM_MAX = 6;
const PIEZAS_POR_PUNTO = 8;     // al perfil: 1 punto por cada 8 piezas
const GUARDADAS_MAX = 12;
const CLAVE_GALERIA = "rompecabezas:imagenes";

// ---------- ESTADO ----------
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const g = lienzo.getContext("2d");
let dpr = 1;
let fuente = null;              // canvas con la imagen (ya reducida)
let pendiente = null;           // base64 JPEG listo para subir (solo si viene de un archivo local)
let urlNube = null;
let n = 64, cols = 0, rows = 0;
let pw = PIEZA_W, ph = PIEZA_W, BW = 0, BH = 0, M = 0, padW = 0, kS = 1;
let piezas = [], sueltas = [], colocadas = 0;
let cam = { x: 0, y: 0, s: 1 };
let guia = false;
let t0 = 0, tiempo = 0, reloj = null, terminado = false;
let sucio = false, temporizadorMsg = null;

const clamp = (s) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

function aviso(texto, fijo) {
  const m = $("msg");
  m.textContent = texto;
  m.hidden = false;
  clearTimeout(temporizadorMsg);
  if (!fijo) temporizadorMsg = setTimeout(() => (m.hidden = true), 4000);
}

// ---------- RESPONSIVE / DIBUJO ----------
function tamano() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const r = lienzo.getBoundingClientRect();
  lienzo.width = Math.max(1, Math.round(r.width * dpr));
  lienzo.height = Math.max(1, Math.round(r.height * dpr));
  pedir();
}
new ResizeObserver(tamano).observe(lienzo);

function pedir() {
  if (sucio) return;
  sucio = true;
  requestAnimationFrame(dibujar);
}

function dibujar() {
  sucio = false;
  const W = lienzo.width, H = lienzo.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  if (!fuente) return;
  const s = cam.s * dpr;
  g.setTransform(s, 0, 0, s, -cam.x * s, -cam.y * s);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";

  // Tablero + imagen guía tenue
  g.fillStyle = "rgba(255,255,255,.06)";
  g.fillRect(0, 0, BW, BH);
  g.globalAlpha = guia ? 0.6 : 0.13;
  g.drawImage(fuente, 0, 0, BW, BH);
  g.globalAlpha = 1;
  g.strokeStyle = "rgba(255,255,255,.35)";
  g.lineWidth = 2 / cam.s;
  g.strokeRect(0, 0, BW, BH);

  const vx1 = cam.x + W / s, vy1 = cam.y + H / s;
  const dp = (p) => {
    if (p.x + pw + padW < cam.x || p.x - padW > vx1 || p.y + ph + padW < cam.y || p.y - padW > vy1) return;
    g.drawImage(p.cv, p.x - padW, p.y - padW, p.cv.width * kS, p.cv.height * kS);
  };
  for (const p of piezas) if (p.ok) dp(p);
  for (const p of sueltas) dp(p);
}

// ---------- PIEZAS ----------
// Elige columnas×filas con producto exacto n y proporción parecida a la de la imagen
function rejilla(total, asp) {
  let mejor = null;
  for (let c = 2; c <= total / 2; c++) {
    if (total % c) continue;
    const r = total / c;
    if (Math.min(c, r) < 4) continue;
    const d = Math.abs(Math.log(c / r / asp));
    if (!mejor || d < mejor.d) mejor = { c, r, d };
  }
  return mejor;
}

// Dibuja una arista de (ax,ay) a (bx,by). s: 0 plana, +1 lengüeta hacia afuera, -1 hacia adentro. t: alto de la lengüeta
function arista(ctx, ax, ay, bx, by, s, t) {
  if (!s) { ctx.lineTo(bx, by); return; }
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L, nx = uy * s, ny = -ux * s;
  const p = (u, v) => [ax + ux * L * u + nx * v * t, ay + uy * L * u + ny * v * t];
  ctx.lineTo(...p(0.37, 0));
  ctx.bezierCurveTo(...p(0.37, 0.35), ...p(0.28, 0.45), ...p(0.28, 0.75));
  ctx.bezierCurveTo(...p(0.28, 1.15), ...p(0.72, 1.15), ...p(0.72, 0.75));
  ctx.bezierCurveTo(...p(0.72, 0.45), ...p(0.63, 0.35), ...p(0.63, 0));
  ctx.lineTo(bx, by);
}

function hacerPieza(r, c, w, h, t, pad, s) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w + 2 * pad);
  cv.height = Math.ceil(h + 2 * pad);
  const x = cv.getContext("2d");
  x.translate(pad, pad);
  x.beginPath();
  x.moveTo(0, 0);
  arista(x, 0, 0, w, 0, s.arr, t);
  arista(x, w, 0, w, h, s.der, t);
  arista(x, w, h, 0, h, s.aba, t);
  arista(x, 0, h, 0, 0, s.izq, t);
  x.closePath();
  x.save();
  x.clip();
  x.drawImage(fuente, c * w - pad, r * h - pad, w + 2 * pad, h + 2 * pad, -pad, -pad, w + 2 * pad, h + 2 * pad);
  x.restore();
  x.lineWidth = Math.max(1, w * 0.02);
  x.strokeStyle = "rgba(0,0,0,.45)";
  x.stroke();
  return cv;
}

function iniciar() {
  if (!fuente) return;
  clearInterval(reloj);
  t0 = 0; tiempo = 0; terminado = false; colocadas = 0;
  $("msg").hidden = true;

  const rj = rejilla(n, fuente.width / fuente.height);
  cols = rj.c; rows = rj.r;
  const pwS = fuente.width / cols, phS = fuente.height / rows;   // tamaño de pieza en px de la imagen
  kS = PIEZA_W / pwS;
  pw = PIEZA_W; ph = phS * kS;
  BW = cols * pw; BH = rows * ph;
  M = Math.max(pw * 3, 0.5 * Math.min(BW, BH));

  const t = 0.22 * Math.min(pwS, phS);        // alto de lengüeta
  const pad = Math.ceil(t * 1.1) + 2;
  padW = pad * kS;

  const aba = [], der = [];
  for (let r = 0; r < rows; r++) {
    aba[r] = []; der[r] = [];
    for (let c = 0; c < cols; c++) {
      aba[r][c] = r < rows - 1 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      der[r][c] = c < cols - 1 ? (Math.random() < 0.5 ? 1 : -1) : 0;
    }
  }
  piezas = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const s = { arr: r > 0 ? -aba[r - 1][c] : 0, der: der[r][c], aba: aba[r][c], izq: c > 0 ? -der[r][c - 1] : 0 };
      piezas.push({ r, c, x: 0, y: 0, ok: false, cv: hacerPieza(r, c, pwS, phS, t, pad, s) });
    }
  }
  // Dispersar alrededor del tablero
  for (const p of piezas) {
    let x, y, i = 0;
    do {
      x = -M + Math.random() * (BW + 2 * M - pw);
      y = -M + Math.random() * (BH + 2 * M - ph);
      i++;
    } while (i < 40 && x + pw > 0 && x < BW && y + ph > 0 && y < BH);
    p.x = x; p.y = y;
  }
  sueltas = piezas.slice().sort(() => Math.random() - 0.5);
  ajustar();
  info();
}

function ajustar() {
  const W = lienzo.width / dpr, H = lienzo.height / dpr;
  const ww = BW + 2 * M, hh = BH + 2 * M;
  cam.s = clamp(Math.min(W / ww, H / hh));
  cam.x = -M - (W / cam.s - ww) / 2;
  cam.y = -M - (H / cam.s - hh) / 2;
  pedir();
}

function info() {
  $("info").textContent = colocadas + " / " + piezas.length + " · " + fmt(tiempo);
}

function iniciarReloj() {
  if (t0 || terminado) return;
  t0 = Date.now();
  reloj = setInterval(() => { tiempo = Math.floor((Date.now() - t0) / 1000); info(); }, 1000);
}

async function ganar() {
  clearInterval(reloj);
  terminado = true;
  tiempo = t0 ? Math.floor((Date.now() - t0) / 1000) : 0;
  info();
  const pts = Math.max(1, Math.round(piezas.length / PIEZAS_POR_PUNTO));
  aviso("¡Rompecabezas completo! 🎉 " + fmt(tiempo) + " · +" + pts + " pts (si tienes sesión)", true);
  try {
    const mod = await import("../compartido/jugador.js");
    await mod.sumarPuntos(ID, pts);
  } catch (e) {}
}

// ---------- ZOOM Y ARRASTRE ----------
const punt = new Map();
let arr = null, pan = false, pinch = null;
const pos = (e) => { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const aMundo = (px, py) => ({ x: cam.x + px / cam.s, y: cam.y + py / cam.s });

function zoom(f, px, py) {
  const wx = cam.x + px / cam.s, wy = cam.y + py / cam.s;
  cam.s = clamp(cam.s * f);
  cam.x = wx - px / cam.s;
  cam.y = wy - py / cam.s;
  pedir();
}
const centro = () => [lienzo.clientWidth / 2, lienzo.clientHeight / 2];

function buscar(wx, wy) {
  const h = 0.1 * pw;
  for (let i = sueltas.length - 1; i >= 0; i--) {
    const p = sueltas[i];
    if (wx >= p.x - h && wx <= p.x + pw + h && wy >= p.y - h && wy <= p.y + ph + h) return p;
  }
  return null;
}

function soltar() {
  const p = arr.pz;
  arr = null;
  if (Math.hypot(p.x - p.c * pw, p.y - p.r * ph) < IMAN * Math.min(pw, ph)) {
    p.x = p.c * pw; p.y = p.r * ph; p.ok = true;
    sueltas.splice(sueltas.indexOf(p), 1);
    colocadas++;
    if (navigator.vibrate) navigator.vibrate(12);
    info();
    if (colocadas === piezas.length) ganar();
  }
  pedir();
}

lienzo.addEventListener("pointerdown", (e) => {
  if (!fuente) return;
  lienzo.setPointerCapture(e.pointerId);
  const p = pos(e);
  punt.set(e.pointerId, p);
  if (punt.size === 1) {
    const w = aMundo(p.x, p.y);
    const pz = buscar(w.x, w.y);
    if (pz) {
      arr = { pz, dx: w.x - pz.x, dy: w.y - pz.y };
      sueltas.splice(sueltas.indexOf(pz), 1);
      sueltas.push(pz);                     // queda encima
      iniciarReloj();
      pedir();
    } else pan = true;
  } else if (punt.size === 2) {
    if (arr) soltar();
    pan = false;
    const [a, b] = [...punt.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  e.preventDefault();
});

lienzo.addEventListener("pointermove", (e) => {
  if (!punt.has(e.pointerId)) return;
  const p = pos(e), ant = punt.get(e.pointerId);
  punt.set(e.pointerId, p);
  if (punt.size === 1) {
    if (arr) {
      const w = aMundo(p.x, p.y);
      arr.pz.x = w.x - arr.dx; arr.pz.y = w.y - arr.dy;
      pedir();
    } else if (pan) {
      cam.x -= (p.x - ant.x) / cam.s; cam.y -= (p.y - ant.y) / cam.s;
      pedir();
    }
  } else if (punt.size === 2 && pinch) {
    const [a, b] = [...punt.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    const wx = cam.x + pinch.cx / cam.s, wy = cam.y + pinch.cy / cam.s;
    cam.s = clamp(cam.s * d / pinch.d);
    cam.x = wx - cx / cam.s; cam.y = wy - cy / cam.s;
    pinch.d = d; pinch.cx = cx; pinch.cy = cy;
    pedir();
  }
});

function fin(e) {
  if (!punt.has(e.pointerId)) return;
  punt.delete(e.pointerId);
  if (arr) soltar();
  pinch = null;
  pan = punt.size === 1;                    // si queda un dedo, sigue moviendo la vista
}
lienzo.addEventListener("pointerup", fin);
lienzo.addEventListener("pointercancel", fin);

lienzo.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = pos(e);
  zoom(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
}, { passive: false });

$("zmas").addEventListener("click", () => zoom(1.4, ...centro()));
$("zmenos").addEventListener("click", () => zoom(1 / 1.4, ...centro()));
$("ajustar").addEventListener("click", ajustar);
$("ver").addEventListener("click", () => { guia = !guia; pedir(); });
$("reiniciar").addEventListener("click", () => {
  if (colocadas > 0 && !terminado && !confirm("Se mezclarán de nuevo las piezas. ¿Continuar?")) return;
  iniciar();
});

// ---------- OPCIONES DE PIEZAS ----------
function pintarOpciones() {
  const cont = $("opciones");
  cont.innerHTML = "";
  for (const v of OPCIONES) {
    const b = document.createElement("button");
    b.className = "btn" + (v === n ? " sel" : "");
    b.textContent = v;
    b.addEventListener("click", () => {
      if (v === n) return;
      if (colocadas > 0 && !terminado && !confirm("Se reiniciará el rompecabezas con " + v + " piezas. ¿Continuar?")) return;
      n = v;
      pintarOpciones();
      iniciar();
    });
    cont.appendChild(b);
  }
}

// ---------- IMAGEN: LOCAL, EJEMPLO Y NUBE ----------
function cargar(src) {
  return new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error("No se pudo abrir la imagen"));
    i.src = src;
  });
}

function reducir(img) {
  const k = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  const x = c.getContext("2d");
  x.fillStyle = "#fff";                      // fondo blanco para PNG/GIF con transparencia
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function ejemplo() {
  const c = document.createElement("canvas");
  c.width = 1600; c.height = 1000;
  const x = c.getContext("2d");
  const gr = x.createLinearGradient(0, 0, 1600, 1000);
  gr.addColorStop(0, "#ff7e5f"); gr.addColorStop(0.5, "#feb47b"); gr.addColorStop(1, "#6a82fb");
  x.fillStyle = gr;
  x.fillRect(0, 0, 1600, 1000);
  for (let i = 0; i < 70; i++) {
    x.fillStyle = "hsla(" + Math.floor(Math.random() * 360) + ",80%,60%,.55)";
    x.beginPath();
    x.arc(Math.random() * 1600, Math.random() * 1000, 30 + Math.random() * 120, 0, 7);
    x.fill();
  }
  return c;
}

$("archivo").addEventListener("change", async () => {
  const f = $("archivo").files[0];
  $("archivo").value = "";
  if (!f) return;
  if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return aviso("Usa una imagen JPG, PNG, WEBP o GIF");
  if (f.size > IMAGEN_MAX_MB * 1048576) return aviso("La imagen pesa más de " + IMAGEN_MAX_MB + " MB");
  const u = URL.createObjectURL(f);
  try {
    fuente = reducir(await cargar(u));
    pendiente = fuente.toDataURL("image/jpeg", 0.88).split(",")[1];
    urlNube = null;
    $("guardar").disabled = false;
    $("enlace").disabled = true;
    iniciar();
  } catch (e) {
    aviso(e.message);
  } finally {
    URL.revokeObjectURL(u);
  }
});

// Solo se aceptan imágenes alojadas en imgbb (https://i.ibb.co/...)
function urlValida(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" && /(^|\.)ibb\.co$/.test(x.hostname);
  } catch (e) { return false; }
}

async function cargarUrl(u) {
  if (!urlValida(u)) return aviso("Enlace de imagen no permitido");
  try {
    aviso("Cargando imagen…");
    fuente = reducir(await cargar(u));
    pendiente = null;
    urlNube = u;
    $("guardar").disabled = true;
    $("enlace").disabled = false;
    $("msg").hidden = true;
    iniciar();
  } catch (e) {
    aviso(e.message);
  }
}

function leerGaleria() {
  try { return JSON.parse(localStorage.getItem(CLAVE_GALERIA) || "[]").filter(urlValida); } catch (e) { return []; }
}
function pintarGaleria() {
  const lista = leerGaleria();
  $("galeria").hidden = lista.length === 0;
  const cont = $("miniaturas");
  cont.innerHTML = "";
  for (const u of lista) {
    const b = document.createElement("button");
    const im = document.createElement("img");
    im.src = u; im.loading = "lazy"; im.alt = "Imagen guardada";
    b.appendChild(im);
    b.addEventListener("click", () => cargarUrl(u));
    cont.appendChild(b);
  }
}
function guardarGaleria(u) {
  const l = [u, ...leerGaleria().filter((x) => x !== u)].slice(0, GUARDADAS_MAX);
  try { localStorage.setItem(CLAVE_GALERIA, JSON.stringify(l)); } catch (e) {}
}

// El token de Firebase demuestra al Apps Script que quien sube tiene sesión iniciada
async function tokenSesion() {
  const fb = await import("../compartido/firebase.js");
  const u = fb.auth && fb.auth.currentUser;
  if (!u) throw new Error("Entra con Google en el portal para guardar imágenes");
  return u.getIdToken();
}

$("guardar").addEventListener("click", async () => {
  if (!pendiente) return;
  if (URL_SUBIDA.startsWith("PEGA")) return aviso("Falta pegar la URL de tu Apps Script en juego.js");
  const b = $("guardar");
  b.disabled = true;
  aviso("Subiendo imagen…", true);
  try {
    const token = await tokenSesion();
    // Sin cabecera Content-Type (text/plain) para evitar el preflight CORS de Apps Script
    const r = await fetch(URL_SUBIDA, { method: "POST", body: JSON.stringify({ token, imagen: pendiente }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "No se pudo subir");
    urlNube = j.url;
    pendiente = null;
    guardarGaleria(j.url);
    pintarGaleria();
    $("enlace").disabled = false;
    aviso("Imagen guardada ☁️");
  } catch (e) {
    b.disabled = false;
    aviso(e.message || "Error al subir");
  }
});

$("enlace").addEventListener("click", async () => {
  if (!urlNube) return;
  const link = location.origin + location.pathname + "?img=" + encodeURIComponent(urlNube);
  try { await navigator.clipboard.writeText(link); aviso("Enlace copiado"); } catch (e) { prompt("Copia el enlace:", link); }
});

// ---------- ARRANQUE ----------
pintarOpciones();
pintarGaleria();
tamano();
const q = new URLSearchParams(location.search).get("img");
if (q && urlValida(q)) cargarUrl(q);
else { fuente = ejemplo(); iniciar(); }
