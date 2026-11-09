// Ruta: estacionamiento/juego-estacionamiento.js
// Saca todos los autos de un estacionamiento cuadrado (vista isométrica). El tamaño cambia con cada nivel (de 10×10 a 50×50).
// - Cada auto avanza solo hacia donde apunta su flecha; si algo le estorba, no se mueve.
// - Alrededor del estacionamiento hay una vía de un solo sentido (horario) con la salida en las 4 esquinas.
// - Hay 22 600 niveles (3200 de México y 100 por cada país). Todos salen de niveles-estacionamiento.js: tamaño, autos y premio dependen solo del número
//   de nivel, y siempre tienen solución (cada auto se coloca con su camino libre respecto a los ya colocados).

import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
import { TOTAL_NIVELES, configNivel, generarNivel } from "./niveles-estacionamiento.js";
import { montarMapa } from "./mapa-estacionamiento.js";   // menú principal: México con agua, mundo y listas de niveles
import { crearMenuPausa } from "../compartido/menu-pausa.js";

let N = 25;                         // casillas por lado (cambia con cada nivel)
const TW = 16, TH = 8;              // medio ancho / medio alto de una casilla (isométrico)
const VEL = 16;                     // casillas por segundo al salir
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const ID_JUEGO = "estacionamiento";
const CLAVE = "estacionamiento-progreso";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ----- Progreso: se guarda SIEMPRE en el dispositivo y se sincroniza con la cuenta cuando hay internet y sesión -----
let nube = null; // se llena al cargar compartido/progreso.js (si no carga, el juego sigue igual)
let prog = { max: 1, hecho: 0 };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };

// ----- Monedas (cartera): por ahora solo en el dispositivo. Las monedas se gastan, así que NO van en «prog» (unirMaximos las inflaría);
//       cuando se haga la sincronización (paso 3) necesitarán su propia regla de fusión. -----
const CLAVE_MONEDAS = "estacionamiento-monedas";
let cartera = { monedas: 0 };
try { cartera = Object.assign(cartera, JSON.parse(localStorage.getItem(CLAVE_MONEDAS) || "{}")); } catch (e) {}
cartera.monedas = Math.max(0, Math.floor(Number(cartera.monedas)) || 0);
const guardarCartera = () => { try { localStorage.setItem(CLAVE_MONEDAS, JSON.stringify(cartera)); } catch (e) {} };
const chipMonedas = document.createElement("span");
chipMonedas.className = "chip";
chipMonedas.title = "Monedas";
const pintarMonedas = () => { chipMonedas.textContent = "🪙 " + cartera.monedas.toLocaleString("es-MX"); };
pintarMonedas();
document.querySelector(".hud-centro").appendChild(chipMonedas);

// ----- Boosts (paso 2a): «Quitar un auto» (30 🪙, o gratis si ya tienes usos) y «Paquete ×3» (50 🪙 = 3 usos). La bomba va aparte (2b). -----
// «Quitar un auto» se paga AL USARLO: tocas el botón, tocas el auto y entonces se gasta un uso (o 30 monedas). Si te arrepientes, tocas el botón otra vez.
const PRECIO_QUITAR = 30, PRECIO_PAQUETE = 50, USOS_PAQUETE = 3;
const PRECIO_BOMBA = 100, LADO_BOMBA = 5; // la bomba se paga al soltarla (no se guarda en inventario) y borra una zona de 5×5 casillas
cartera.quitar = Math.max(0, Math.floor(Number(cartera.quitar)) || 0); // usos de «quitar un auto» que tienes
let modoQuitar = false;
let modoBomba = false, zonaBomba = null, efectoBomba = null; // zonaBomba = { x, y } esquina de la zona de 5×5 elegida; efectoBomba = destello tras explotar

function botonBoost(clase, icono, titulo) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d " + clase; b.title = titulo; b.setAttribute("aria-label", titulo);
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = icono;
  const info = document.createElement("span"); info.className = "b-info";
  b.append(i, info);
  return { b, info };
}
const bQuitar = botonBoost("b-azul", "🚗", "Quitar un auto");
const bPaquete = botonBoost("b-oro sin", "📦", "Paquete ×3: tres usos de «Quitar un auto»");
bPaquete.info.textContent = PRECIO_PAQUETE + "🪙";
const bBomba = botonBoost("b-rojo sin", "💣", "Bomba: borra los autos de una zona de 5×5");
bBomba.info.textContent = PRECIO_BOMBA + "🪙";
const zBoosts = document.createElement("div");
zBoosts.style.cssText = "display:flex;gap:10px";
zBoosts.setAttribute("role", "group"); zBoosts.setAttribute("aria-label", "Boosts");
zBoosts.append(bQuitar.b, bPaquete.b, bBomba.b);
{ // los boosts van arriba del selector de nivel, abajo al centro
  const zN = $("niveles"), padre = zN.parentElement;
  padre.style.flexDirection = "column";
  padre.insertBefore(zBoosts, zN);
}

function pintarBoosts() {
  const tiene = cartera.quitar > 0;
  bQuitar.info.textContent = tiene ? "×" + cartera.quitar : PRECIO_QUITAR + "🪙";
  bQuitar.b.classList.toggle("sin", !tiene);
  bQuitar.b.classList.toggle("on", modoQuitar);
  bQuitar.b.setAttribute("aria-pressed", String(modoQuitar));
  bBomba.b.classList.toggle("on", modoBomba);
  bBomba.b.setAttribute("aria-pressed", String(modoBomba));
}
function salirModoQuitar() {
  modoQuitar = false;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
function salirModoBomba() {
  modoBomba = false; zonaBomba = null;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
bQuitar.b.addEventListener("click", () => {
  if (modoQuitar) { salirModoQuitar(); return; }
  if (ganado) return;
  if (cartera.quitar <= 0 && cartera.monedas < PRECIO_QUITAR) { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); return; }
  salirModoBomba();
  modoQuitar = true;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca el auto que quieres quitar");
});
bBomba.b.addEventListener("click", () => {
  if (modoBomba) { salirModoBomba(); return; }
  if (ganado) return;
  if (cartera.monedas < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); return; }
  salirModoQuitar();
  modoBomba = true; zonaBomba = null;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca donde quieres la bomba; toca otra vez dentro del cuadro para soltarla");
});
bPaquete.b.addEventListener("click", () => {
  if (cartera.monedas < PRECIO_PAQUETE) { aviso("Necesitas " + PRECIO_PAQUETE + " monedas"); return; }
  cartera.monedas -= PRECIO_PAQUETE; cartera.quitar += USOS_PAQUETE;
  guardarCartera(); pintarMonedas(); pintarBoosts();
  aviso("Paquete comprado: +" + USOS_PAQUETE + " usos de quitar un auto");
});
pintarBoosts();

// ----- Niveles: el generador vive en niveles-estacionamiento.js -----
const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

// ----- Estado -----
let nivel = 1, cfg = null, autos = [], occ = [], restantes = 0, movs = 0, T = 0, ganado = false;
let cam = { s: 1, ox: 0, oy: 0 }, camMin = 0.3, camMax = 6;
let camTocada = false; // true cuando el jugador movió o acercó la vista (así un cambio de tamaño de ventana no se la deshace)
let ultAutos = "", ultMovs = -1; // últimos textos puestos en pantalla (para no reescribirlos 60 veces por segundo)

function cargarNivel(n) {
  n = clamp(Math.floor(Number(n)) || 1, 1, TOTAL_NIVELES);
  nivel = n;
  cfg = configNivel(n);
  N = cfg.tam;
  autos = generarNivel(cfg);
  occ = new Array(N * N).fill(-1);
  for (const c of autos) {
    c.estado = 0; c.bump = 0; c.flash = 0;
    celdasDe(c).forEach(([x, y]) => (occ[y * N + x] = c.id));
  }
  restantes = autos.length;
  movs = 0; ganado = false;
  salirModoQuitar();
  salirModoBomba();
  efectoBomba = null;
  $("victoria").hidden = true;
  hudNiveles();
  ajustarCamara();
}
function celdasDe(c) {
  const r = [];
  for (let i = 0; i < c.len; i++) r.push(c.h ? [c.x + i, c.y] : [c.x, c.y + i]);
  return r;
}

// ----- Salida: camino libre, vía ocupada, animación -----
function caminoLibre(c) {
  const [hx, hy] = cabeza(c);
  let x = hx + DX[c.dir], y = hy + DY[c.dir];
  while (x >= 0 && y >= 0 && x < N && y < N) {
    if (occ[y * N + x] !== -1) return false;
    x += DX[c.dir]; y += DY[c.dir];
  }
  return true;
}

// Datos de la ruta de un auto: de su casilla a la vía y por la vía (horario) hasta la esquina de salida
function planear(c) {
  const [hx, hy] = cabeza(c);
  const d = c.dir;
  const n = d === 0 ? hy + 1 : d === 1 ? N - hx : d === 2 ? N - hy : hx + 1; // casillas hasta la vía
  const entrada = [hx + DX[d] * n, hy + DY[d] * n];
  let s0, esquinaS, sd, esquina;
  const V = N + 1; // largo de cada lado de la vía
  if (d === 0) { s0 = hx + 1; esquinaS = V; sd = [1, 0]; esquina = [N + 0.5, -0.5]; }
  else if (d === 1) { s0 = V + (hy + 1); esquinaS = 2 * V; sd = [0, 1]; esquina = [N + 0.5, N + 0.5]; }
  else if (d === 2) { s0 = 2 * V + (N - hx); esquinaS = 3 * V; sd = [-1, 0]; esquina = [-0.5, N + 0.5]; }
  else { s0 = 3 * V + (N - hy); esquinaS = 4 * V; sd = [0, -1]; esquina = [-0.5, -0.5]; }
  const P0 = [hx + 0.5, hy + 0.5];
  const P1 = [entrada[0] + 0.5, entrada[1] + 0.5];
  const ext = c.len + 6;
  const P3 = [esquina[0] + sd[0] * ext, esquina[1] + sd[1] * ext];
  const pts = [P0, P1, esquina, P3];
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const enEsquina = n + (esquinaS - s0);
  return { n, s0, corner: esquinaS, pts, acum, nLib: n + c.len, enEsquina, tFin: enEsquina + c.len + 4 };
}

// Tramo de la vía que ocupa un auto en el instante tAbs (null si no está en la vía)
function cobertura(c, tAbs) {
  const t = (tAbs - c.t0) * VEL;
  if (t < c.n) return null;
  const head = c.s0 + (t - c.n);
  if (head - c.len + 0.5 >= c.corner + 0.5) return null;
  const lo = Math.max(c.s0 - 0.5, head - c.len + 0.5);
  const hi = Math.min(head, c.corner) + 0.5;
  return [lo, hi];
}
function viaOcupada(nuevo) {
  const ini = nuevo.t0 + nuevo.n / VEL;
  const fin = nuevo.t0 + (nuevo.n + (nuevo.corner - nuevo.s0) + nuevo.len) / VEL;
  for (let t = ini; t <= fin; t += 0.04) {
    const a = cobertura(nuevo, t);
    if (!a) continue;
    for (const o of autos) {
      if (o.estado !== 1) continue;
      const b = cobertura(o, t);
      if (b && a[0] < b[1] - 0.05 && b[0] < a[1] - 0.05) return true;
    }
  }
  return false;
}

// Boost «Quitar un auto»: gasta un uso (o 30 monedas) y el auto desaparece; sus casillas quedan libres
function quitarAuto(c) {
  if (cartera.quitar > 0) cartera.quitar--;
  else if (cartera.monedas >= PRECIO_QUITAR) cartera.monedas -= PRECIO_QUITAR;
  else { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); salirModoQuitar(); return; }
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
  guardarCartera(); pintarMonedas();
  salirModoQuitar();
}

// Saca un auto del tablero sin animación (lo usa la bomba)
function retirarAuto(c) {
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
}
// Bomba: el primer toque coloca el cuadro de 5×5 (centrado en la casilla tocada, sin salirse del tablero); un toque dentro del cuadro la suelta
function tocarBomba(p) {
  if (ganado) return;
  const [gx, gy] = suelo(p.x, p.y, 0);
  const x = Math.floor(gx), y = Math.floor(gy);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const z = zonaBomba;
  if (z && x >= z.x && x < z.x + LADO_BOMBA && y >= z.y && y < z.y + LADO_BOMBA) { soltarBomba(); return; }
  zonaBomba = { x: clamp(x - 2, 0, N - LADO_BOMBA), y: clamp(y - 2, 0, N - LADO_BOMBA) };
}
function soltarBomba() {
  const z = zonaBomba;
  const dentro = (c) => celdasDe(c).some(([x, y]) => x >= z.x && x < z.x + LADO_BOMBA && y >= z.y && y < z.y + LADO_BOMBA);
  const blancos = autos.filter((c) => c.estado === 0 && dentro(c)); // los autos que ya van saliendo no cuentan
  if (!blancos.length) { aviso("No hay autos en esa zona: mueve el cuadro"); return; } // no se cobra
  if (cartera.monedas < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); salirModoBomba(); return; }
  cartera.monedas -= PRECIO_BOMBA;
  for (const c of blancos) retirarAuto(c);
  efectoBomba = { x: z.x, y: z.y, t: 0.5 };
  guardarCartera(); pintarMonedas();
  aviso("💥 " + blancos.length + (blancos.length === 1 ? " auto eliminado" : " autos eliminados"));
  salirModoBomba();
}

function tocarAuto(c) {
  if (c.estado !== 0 || ganado) return;
  if (modoQuitar) { quitarAuto(c); return; }
  if (!caminoLibre(c)) {
    c.bump = 0.35; c.flash = 0.4;
    aviso("Algo le estorba");
    return;
  }
  const plan = planear(c);
  const cand = Object.assign({ len: c.len, t0: T }, plan);
  if (viaOcupada(cand)) {
    c.bump = 0.35; c.flash = 0.4;
    aviso("La vía de salida está ocupada, espera un momento");
    return;
  }
  Object.assign(c, plan, { estado: 1, t0: T, liberado: false });
  movs++;
}

// ----- Posición de un auto: cabeza y cola siguen la ruta, así gira en las curvas -----
function puntoEn(c, d) {
  const pts = c.pts, ac = c.acum;
  if (d <= 0) {
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], L = Math.hypot(dx, dy) || 1;
    return [pts[0][0] + (dx / L) * d, pts[0][1] + (dy / L) * d];
  }
  for (let i = 1; i < pts.length; i++) {
    if (d <= ac[i] || i === pts.length - 1) {
      const L = ac[i] - ac[i - 1] || 1, f = (d - ac[i - 1]) / L;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
  }
  return pts[pts.length - 1];
}
function poseDe(c) {
  let cab, col, alfa = 1;
  if (c.estado === 1) {
    const t = (T - c.t0) * VEL;
    cab = puntoEn(c, t);
    col = puntoEn(c, t - (c.len - 1));
    alfa = 1 - clamp((t - c.enEsquina - 1) / (c.len + 2), 0, 1);
  } else {
    const [hx, hy] = cabeza(c);
    cab = [hx + 0.5, hy + 0.5];
    col = [cab[0] - DX[c.dir] * (c.len - 1), cab[1] - DY[c.dir] * (c.len - 1)];
    if (c.bump > 0) {
      const off = Math.sin((1 - c.bump / 0.35) * Math.PI) * 0.22;
      cab = [cab[0] + DX[c.dir] * off, cab[1] + DY[c.dir] * off];
      col = [col[0] + DX[c.dir] * off, col[1] + DY[c.dir] * off];
    }
  }
  let dx = cab[0] - col[0], dy = cab[1] - col[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-3) { dx = DX[c.dir]; dy = DY[c.dir]; } else { dx /= L; dy /= L; }
  return { cx: (cab[0] + col[0]) / 2, cy: (cab[1] + col[1]) / 2, dx, dy, alfa };
}

// ----- Cámara -----
const cv = $("lienzo"), ctx = cv.getContext("2d");
let cw = 300, ch = 300, dpr = 1;
function redim() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cw = r.width; ch = r.height;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
const escalaAjustada = () => Math.min(cw / ((2 * N + 4) * TW + 30), ch / ((2 * N + 4) * TH + 70));
function ajustarCamara() {
  const s = escalaAjustada();
  camMin = s * 0.8; camMax = s * 7;
  cam.s = s; cam.ox = cw / 2; cam.oy = ch / 2 - N * TH * s + 10;
  camTocada = false;
}
function zoom(f, mx, my) {
  camTocada = true;
  const s2 = clamp(cam.s * f, camMin, camMax), k = s2 / cam.s;
  cam.ox = mx - (mx - cam.ox) * k;
  cam.oy = my - (my - cam.oy) * k;
  cam.s = s2;
}
const P = (gx, gy, z) => [cam.ox + (gx - gy) * TW * cam.s, cam.oy + (gx + gy) * TH * cam.s - (z || 0) * cam.s];
function suelo(sx, sy, z) {
  const u = (sx - cam.ox) / (TW * cam.s), v = (sy + z * cam.s - cam.oy) / (TH * cam.s);
  return [(u + v) / 2, (v - u) / 2];
}

// ----- Dibujo -----
function poli(pts, fill, stroke) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
const rect = (x0, y0, x1, y1, z) => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];

function dibujarSuelo() {
  poli(rect(-1, -1, N + 1, N + 1), "#2a2e39");
  poli(rect(0, 0, N, N), "#3c4254");
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.beginPath();
  for (let i = 1; i < N; i++) {
    let a = P(i, 0), b = P(i, N); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    a = P(0, i); b = P(N, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 2 * cam.s);
  poli(rect(0, 0, N, N), null, "#9aa3b8");

  // flechas de la vía (sentido horario)
  ctx.fillStyle = "rgba(240,215,80,.55)";
  const flecha = (cx, cy, dx, dy) => {
    const px = -dy, py = dx;
    poli([P(cx + dx * 0.3, cy + dy * 0.3), P(cx - dx * 0.2 + px * 0.25, cy - dy * 0.2 + py * 0.25), P(cx - dx * 0.2 - px * 0.25, cy - dy * 0.2 - py * 0.25)], "rgba(240,215,80,.55)");
  };
  for (let i = 2; i < N; i += 3) {
    flecha(i + 0.5, -0.5, 1, 0);
    flecha(N + 0.5, i + 0.5, 0, 1);
    flecha(i + 0.5, N + 0.5, -1, 0);
    flecha(-0.5, i + 0.5, 0, -1);
  }
  // salidas en las esquinas
  const fs = Math.max(8, Math.round(9 * cam.s * 2));
  ctx.font = "bold " + fs + "px system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [x, y] of [[-1, -1], [N, -1], [N, N], [-1, N]]) {
    poli(rect(x, y, x + 1, y + 1), "rgba(46,204,113,.9)", "#1e8449");
    const p = P(x + 0.5, y + 0.5, 1);
    ctx.fillStyle = "#fff";
    ctx.fillText("SALIDA", p[0], p[1]);
  }
}

// Prisma con base rotada: lados visibles sombreados + tapa
function prisma(cx, cy, dx, dy, l, w, z0, z1, lado, tapa) {
  const px = -dy, py = dx;
  const q = [
    [cx + dx * l / 2 + px * w / 2, cy + dy * l / 2 + py * w / 2],
    [cx + dx * l / 2 - px * w / 2, cy + dy * l / 2 - py * w / 2],
    [cx - dx * l / 2 - px * w / 2, cy - dy * l / 2 - py * w / 2],
    [cx - dx * l / 2 + px * w / 2, cy - dy * l / 2 + py * w / 2],
  ];
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const nx = (a[0] + b[0]) / 2 - cx, ny = (a[1] + b[1]) / 2 - cy;
    if (nx + ny <= 0) continue; // cara que mira hacia atrás
    const m = Math.hypot(nx, ny) || 1;
    poli([P(a[0], a[1], z0), P(b[0], b[1], z0), P(b[0], b[1], z1), P(a[0], a[1], z1)], lado(nx / m, ny / m));
  }
  poli(q.map((p) => P(p[0], p[1], z1)), tapa);
}

function dibujarAuto(c) {
  const { cx, cy, dx, dy, alfa } = poseDe(c);
  const L = c.len - 0.18, Wd = 0.72, ZB = 8, ZC = 13;
  ctx.globalAlpha = alfa;
  const sombra = (nx, ny) => 0;
  // sombra en el suelo
  prisma(cx + 0.05, cy + 0.05, dx, dy, L, Wd, 0, 0, sombra, "rgba(0,0,0,.28)");
  const col = (f) => "hsl(" + c.tono + ",68%," + (c.luz * f).toFixed(1) + "%)";
  const ladoCarro = (nx, ny) => col(0.8 + 0.14 * (ny - nx));
  prisma(cx, cy, dx, dy, L, Wd, 1, ZB, ladoCarro, col(1.12));
  // cabina
  const sh = 0.08 * c.len;
  prisma(cx - dx * sh, cy - dy * sh, dx, dy, L * 0.5, Wd * 0.82, ZB, ZC,
    (nx, ny) => "hsl(200,30%," + (60 + 14 * (ny - nx)).toFixed(1) + "%)", col(1.2));
  // flecha en el cofre
  const qx = -dy, qy = dx, pcx = cx + dx * L * 0.34, pcy = cy + dy * L * 0.34;
  poli([P(pcx + dx * 0.22, pcy + dy * 0.22, ZB), P(pcx - dx * 0.08 + qx * 0.17, pcy - dy * 0.08 + qy * 0.17, ZB), P(pcx - dx * 0.08 - qx * 0.17, pcy - dy * 0.08 - qy * 0.17, ZB)], "rgba(255,255,255,.92)");
  // luces
  const delante = dx + dy > 0;
  const fx = cx + (delante ? dx : -dx) * L / 2, fy = cy + (delante ? dy : -dy) * L / 2;
  ctx.fillStyle = delante ? "#fff6a8" : "#ff4d4d";
  for (const sg of [-1, 1]) {
    const p = P(fx + qx * sg * 0.24, fy + qy * sg * 0.24, 4.5);
    ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1, 1.9 * cam.s), 0, Math.PI * 2); ctx.fill();
  }
  if (c.flash > 0) {
    const m = [[cx + dx * L / 2 + qx * Wd / 2, cy + dy * L / 2 + qy * Wd / 2], [cx + dx * L / 2 - qx * Wd / 2, cy + dy * L / 2 - qy * Wd / 2], [cx - dx * L / 2 - qx * Wd / 2, cy - dy * L / 2 - qy * Wd / 2], [cx - dx * L / 2 + qx * Wd / 2, cy - dy * L / 2 + qy * Wd / 2]];
    poli(m.map((p) => P(p[0], p[1], ZB + 0.2)), "rgba(255,50,50," + (0.6 * c.flash / 0.4).toFixed(2) + ")");
  }
  ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch); // transparente: detrás se ve el fondo de madera (compartido/fondo-madera.js)
  ctx.lineJoin = "round";
  dibujarSuelo();
  const lista = autos.filter((c) => c.estado !== 2).map((c) => ({ c, p: poseDe(c) }));
  lista.sort((a, b) => a.p.cx + a.p.cy - (b.p.cx + b.p.cy));
  for (const it of lista) dibujarAuto(it.c);
  if (modoBomba && zonaBomba) { // vista previa de la zona que borrará la bomba
    ctx.lineWidth = 2;
    poli(rect(zonaBomba.x, zonaBomba.y, zonaBomba.x + LADO_BOMBA, zonaBomba.y + LADO_BOMBA, 0.3), "rgba(255,70,50,.28)", "rgba(255,110,70,.95)");
    ctx.lineWidth = 1;
  }
  if (efectoBomba) { // destello que crece y se desvanece
    const f = efectoBomba.t / 0.5, g2 = (1 - f) * 1.2, e = efectoBomba;
    ctx.globalAlpha = f;
    poli(rect(e.x - g2, e.y - g2, e.x + LADO_BOMBA + g2, e.y + LADO_BOMBA + g2, 0.5), "rgba(255,170,40,.8)");
    ctx.globalAlpha = 1;
  }
}

// ----- Bucle -----
function actualizar(dt) {
  T += dt;
  if (efectoBomba) { efectoBomba.t -= dt; if (efectoBomba.t <= 0) efectoBomba = null; }
  for (const c of autos) {
    if (c.bump > 0) c.bump = Math.max(0, c.bump - dt);
    if (c.flash > 0) c.flash = Math.max(0, c.flash - dt);
    if (c.estado !== 1) continue;
    const t = (T - c.t0) * VEL;
    if (!c.liberado && t >= c.nLib) {
      c.liberado = true;
      celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
    }
    if (t >= c.tFin) {
      c.estado = 2;
      restantes--;
    }
  }
  if (!ganado && restantes <= 0) victoria();
  if (movs !== ultMovs) { ultMovs = movs; $("movs").textContent = movs; }
  const txtAutos = restantes + " / " + autos.length;
  if (txtAutos !== ultAutos) { ultAutos = txtAutos; $("autos").textContent = txtAutos; }
}

function victoria() {
  ganado = true;
  let txt = "Lo lograste en " + movs + " movimientos.";
  const mio = nivel;
  let pts = 0;
  if (nivel > prog.hecho) {
    // Monedas: igual que los puntos, solo la primera vez que se pasa el nivel (repetirlo no da monedas)
    cartera.monedas += cfg.premio;
    guardarCartera();
    pintarMonedas();
    txt += " +" + cfg.premio + " 🪙";
    // Los puntos del nivel se dan una sola vez: se anotan en la cola local (nunca se pierden) y se envían al haber sesión y conexión
    pts = 10 * cfg.premio; // 150 a 600 puntos según el tamaño del nivel (antes 100 × nivel, que en el nivel 22 600 sería enorme)
    prog.hecho = mio;
    encolarPuntos(ID_JUEGO, pts);
    import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).then((faltan) => {
      // el ✓ solo sale si de verdad ya se enviaron
      if (faltan === 0 && ganado && nivel === mio && !$("victoria").hidden) $("vtexto").textContent = txt + " +" + pts + " puntos ✓";
    }).catch(() => {});
  }
  prog.max = Math.max(prog.max, Math.min(TOTAL_NIVELES, nivel + 1));
  guardar();
  hudNiveles();
  const ultimo = nivel >= TOTAL_NIVELES;
  $("vtitulo").textContent = ultimo ? "¡Terminaste los " + TOTAL_NIVELES.toLocaleString("es-MX") + " niveles! 🎉" : "¡Nivel " + nivel + " completado!";
  $("vtexto").textContent = txt + (pts ? " +" + pts + " puntos" : "");
  $("siguiente").hidden = ultimo;
  $("victoria").hidden = false;
}

let tMsg = 0;
function aviso(t) {
  const m = $("msg");
  m.textContent = t;
  m.classList.add("ver");
  clearTimeout(tMsg);
  tMsg = setTimeout(() => m.classList.remove("ver"), 1600);
}

// Rótulo del nivel en juego. El cambio de nivel se hace desde el mapa (antes había un selector ◀ ▶ provisional).
function hudNiveles() {
  const z = $("niveles");
  z.innerHTML = "";
  const info = document.createElement("span");
  info.className = "chip";
  const pe = document.createElement("small"); pe.textContent = "Nivel";
  const num = document.createElement("b"); num.textContent = nivel;
  const det = document.createElement("small"); det.style.cssText = "margin:0 0 0 8px";
  det.textContent = cfg.tam + "×" + cfg.tam + " · 🪙" + cfg.premio;
  info.append(pe, num, det);
  z.append(info);
}

// ----- Controles: tocar, arrastrar, pellizcar, rueda -----
const dedos = new Map();
let g = null;
const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

cv.addEventListener("pointerdown", (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  dedos.set(e.pointerId, pos(e));
  g = { moved: dedos.size > 1, x0: pos(e).x, y0: pos(e).y };
});
cv.addEventListener("pointermove", (e) => {
  if (!dedos.has(e.pointerId)) return;
  const nuevo = pos(e), viejo = dedos.get(e.pointerId);
  if (dedos.size === 1) {
    if (!g.moved && Math.hypot(nuevo.x - g.x0, nuevo.y - g.y0) > 8) g.moved = true;
    if (g.moved) { cam.ox += nuevo.x - viejo.x; cam.oy += nuevo.y - viejo.y; camTocada = true; }
    dedos.set(e.pointerId, nuevo);
  } else if (dedos.size === 2) {
    const otro = [...dedos.entries()].find(([id]) => id !== e.pointerId)[1];
    const d0 = Math.hypot(viejo.x - otro.x, viejo.y - otro.y) || 1;
    const d1 = Math.hypot(nuevo.x - otro.x, nuevo.y - otro.y) || 1;
    const m0 = { x: (viejo.x + otro.x) / 2, y: (viejo.y + otro.y) / 2 };
    const m1 = { x: (nuevo.x + otro.x) / 2, y: (nuevo.y + otro.y) / 2 };
    cam.ox += m1.x - m0.x; cam.oy += m1.y - m0.y;
    zoom(d1 / d0, m1.x, m1.y);
    g.moved = true;
    dedos.set(e.pointerId, nuevo);
  }
});
function soltar(e) {
  if (!dedos.has(e.pointerId)) return;
  const eraUno = dedos.size === 1;
  dedos.delete(e.pointerId);
  if (eraUno && g && !g.moved && e.type === "pointerup") {
    const p = pos(e);
    if (modoBomba) { tocarBomba(p); return; }
    for (const z of [6, 0]) {
      const [gx, gy] = suelo(p.x, p.y, z);
      const x = Math.floor(gx), y = Math.floor(gy);
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const id = occ[y * N + x];
      if (id !== -1) { tocarAuto(autos[id]); break; }
    }
  }
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = pos(e);
  zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
}, { passive: false });

$("mas").addEventListener("click", () => zoom(1.3, cw / 2, ch / 2));
$("menos").addEventListener("click", () => zoom(1 / 1.3, cw / 2, ch / 2));
$("centrar").addEventListener("click", ajustarCamara);
$("reiniciar").addEventListener("click", () => cargarNivel(nivel));
$("repetir").addEventListener("click", () => cargarNivel(nivel));
// Al terminar el último nivel de un estado/país se abre el mapa principal para VER SUBIR el agua; si no, la lista de niveles de su etapa
$("al-mapa").addEventListener("click", () => { $("victoria").hidden = true; abrirMapa(nivel % 100 === 0); });
$("siguiente").addEventListener("click", () => cargarNivel(Math.min(TOTAL_NIVELES, nivel + 1)));
addEventListener("resize", () => {
  const w0 = cw, h0 = ch;
  redim();
  if (!camTocada || (w0 > h0) !== (cw > ch)) ajustarCamara(); // vista sin tocar, o el celular giró: se encuadra de nuevo
  else { // el jugador ya movió la vista: se conserva y solo se recentra
    cam.ox += (cw - w0) / 2; cam.oy += (ch - h0) / 2;
    const s = escalaAjustada();
    camMin = s * 0.8; camMax = s * 7;
    cam.s = clamp(cam.s, camMin, camMax);
  }
});

// ----- Mapa (menú principal), botón ☰ y menú de pausa -----
// Botón ☰ (estándar): en el mapa principal NO se muestra; en el resto del mapa dice «Menú principal» y vuelve al mapa principal;
// dentro de una partida dice «Pausa» y abre el menú de pausa.
const btnMenu = $("btn-menu");
function botonMenu() {
  const enMapa = mapa.abierto();
  btnMenu.hidden = enMapa && mapa.esPrincipal();
  btnMenu.innerHTML = '<span class="b-ico">☰</span> ' + (enMapa ? "Menú principal" : "Pausa");
  btnMenu.title = enMapa ? "Volver al mapa principal" : "Pausa";
}
const mapa = montarMapa({
  progreso: () => prog,
  jugarNivel: (n) => { mapa.cerrar(); cargarNivel(n); botonMenu(); },
  alCambiarVista: () => botonMenu(),
});
function abrirMapa(aguaSube) {
  $("victoria").hidden = true;
  mapa.abrir(nivel, !!aguaSube);
  botonMenu();
}
const pausa = crearMenuPausa({
  puedeAbrir: () => !mapa.abierto(), // en el mapa no hay nada que pausar
  extras: () => [{ icono: "🔄", texto: "Reiniciar nivel", clase: "b-oro", alElegir: () => cargarNivel(nivel) }],
  textoSalir: "Salir al mapa",
  alSalir: () => abrirMapa(false),
});
btnMenu.addEventListener("click", () => { if (mapa.abierto()) mapa.principal(); else pausa.abrir(); });

// ----- Inicio -----
redim();
cargarNivel(clamp(prog.max, 1, TOTAL_NIVELES));
mapa.abrir(); // el juego empieza en el mapa (México de cerca)
botonMenu();
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  if (!mapa.abierto()) dibujar(); // con el mapa encima no hace falta dibujar el tablero
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// ----- Sincronizar con la cuenta (al final, tras cargar el progreso local) -----
// prog = { max, hecho }: se queda con el mayor de cada uno (unirMaximos)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID_JUEGO, {
    clave: CLAVE,
    fusionar: m.unirMaximos,
    alCambiar: (v) => {
      prog.max = clamp(Number(v.max) || 1, 1, TOTAL_NIVELES);
      prog.hecho = Math.max(0, Number(v.hecho) || 0);
      hudNiveles(); // repinta el rótulo con lo que trajo la nube
      mapa.refrescar(); // y el mapa, por si está abierto
    },
  });
}).catch(() => {});
