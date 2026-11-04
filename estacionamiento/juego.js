// Ruta: estacionamiento/juego.js
// Saca todos los autos de un estacionamiento de 25×25 casillas (vista isométrica).
// - Cada auto avanza solo hacia donde apunta su flecha; si algo le estorba, no se mueve.
// - Alrededor del estacionamiento hay una vía de un solo sentido (horario) con la salida en las 4 esquinas.
// - Los niveles se generan con una semilla fija y siempre tienen solución:
//   cada auto se coloca con su camino libre respecto a los ya colocados, y se resuelve en orden inverso.

const N = 25;                       // casillas por lado
const TW = 16, TH = 8;              // medio ancho / medio alto de una casilla (isométrico)
const VEL = 16;                     // casillas por segundo al salir
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const ID_JUEGO = "estacionamiento";
const CLAVE = "estacionamiento-progreso";

// 5 niveles: semilla fija, autos objetivo, proporción de autos largos (1×3) y esfuerzo de "desorden"
const NIVELES = [
  { seed: 101, obj: 40, p3: 0.3, K: 6 },
  { seed: 202, obj: 75, p3: 0.4, K: 10 },
  { seed: 303, obj: 105, p3: 0.45, K: 16 },
  { seed: 404, obj: 130, p3: 0.5, K: 24 },
  { seed: 505, obj: 150, p3: 0.6, K: 30 },
];
const TONOS = [0, 22, 48, 120, 165, 198, 225, 265, 300, 335];

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Puntos con sesión de Google (si no hay sesión o conexión, el juego funciona igual)
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => (sumarPuntos = m.sumarPuntos)).catch(() => {});

// ----- Progreso guardado (solo en este dispositivo) -----
let prog = { max: 1, hecho: 0 };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} };

// ----- Generador de niveles -----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

function generar(cfg) {
  const rnd = mulberry32(cfg.seed);
  const occ = new Array(N * N).fill(-1);
  const autos = [];
  const candidato = () => {
    const dir = (rnd() * 4) | 0, len = rnd() < cfg.p3 ? 3 : 2, h = dir % 2 === 1;
    const x = (rnd() * (N - (h ? len : 1) + 1)) | 0, y = (rnd() * (N - (h ? 1 : len) + 1)) | 0;
    const c = { x, y, len, dir, h };
    const celdas = [];
    for (let i = 0; i < len; i++) {
      const cx = h ? x + i : x, cy = h ? y : y + i;
      if (occ[cy * N + cx] !== -1) return null;
      celdas.push(cy * N + cx);
    }
    // su camino hacia afuera debe estar libre respecto a los autos ya colocados
    const [hx, hy] = cabeza(c);
    let rx = hx + DX[dir], ry = hy + DY[dir];
    while (rx >= 0 && ry >= 0 && rx < N && ry < N) {
      if (occ[ry * N + rx] !== -1) return null;
      rx += DX[dir]; ry += DY[dir];
    }
    // más puntos mientras más autos ya colocados le estorben a este (más enredo)
    const set = new Set(celdas);
    let score = 0;
    for (const o of autos) {
      const [ox, oy] = cabeza(o);
      let ax = ox + DX[o.dir], ay = oy + DY[o.dir];
      while (ax >= 0 && ay >= 0 && ax < N && ay < N) {
        if (set.has(ay * N + ax)) { score++; break; }
        ax += DX[o.dir]; ay += DY[o.dir];
      }
    }
    return { c, celdas, score };
  };
  for (let intento = 0; autos.length < cfg.obj && intento < 4000; intento++) {
    let mejor = null;
    for (let k = 0; k < cfg.K; k++) {
      const r = candidato();
      if (r && (!mejor || r.score > mejor.score)) mejor = r;
    }
    if (!mejor) continue;
    const id = autos.length;
    mejor.celdas.forEach((i) => (occ[i] = id));
    mejor.c.id = id;
    mejor.c.tono = TONOS[(rnd() * TONOS.length) | 0];
    mejor.c.luz = 46 + ((rnd() * 12) | 0);
    autos.push(mejor.c);
  }
  return autos;
}

// ----- Estado -----
let nivel = 1, autos = [], occ = [], restantes = 0, movs = 0, T = 0, ganado = false;
let cam = { s: 1, ox: 0, oy: 0 }, camMin = 0.3, camMax = 6;

function cargarNivel(n) {
  nivel = n;
  autos = generar(NIVELES[n - 1]);
  occ = new Array(N * N).fill(-1);
  for (const c of autos) {
    c.estado = 0; c.bump = 0; c.flash = 0;
    celdasDe(c).forEach(([x, y]) => (occ[y * N + x] = c.id));
  }
  restantes = autos.length;
  movs = 0; ganado = false;
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
  if (d === 0) { s0 = hx + 1; esquinaS = 26; sd = [1, 0]; esquina = [25.5, -0.5]; }
  else if (d === 1) { s0 = 26 + (hy + 1); esquinaS = 52; sd = [0, 1]; esquina = [25.5, 25.5]; }
  else if (d === 2) { s0 = 52 + (N - hx); esquinaS = 78; sd = [-1, 0]; esquina = [-0.5, 25.5]; }
  else { s0 = 78 + (N - hy); esquinaS = 104; sd = [0, -1]; esquina = [-0.5, -0.5]; }
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

function tocarAuto(c) {
  if (c.estado !== 0 || ganado) return;
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
function ajustarCamara() {
  const s = Math.min(cw / (54 * TW + 30), ch / (54 * TH + 70));
  camMin = s * 0.8; camMax = s * 7;
  cam.s = s; cam.ox = cw / 2; cam.oy = ch / 2 - 25 * TH * s + 10;
}
function zoom(f, mx, my) {
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
  poli(rect(-1, -1, 26, 26), "#2a2e39");
  poli(rect(0, 0, 25, 25), "#3c4254");
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,.07)";
  ctx.beginPath();
  for (let i = 1; i < N; i++) {
    let a = P(i, 0), b = P(i, N); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    a = P(0, i); b = P(N, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.lineWidth = Math.max(1, 2 * cam.s);
  poli(rect(0, 0, 25, 25), null, "#9aa3b8");

  // flechas de la vía (sentido horario)
  ctx.fillStyle = "rgba(240,215,80,.55)";
  const flecha = (cx, cy, dx, dy) => {
    const px = -dy, py = dx;
    poli([P(cx + dx * 0.3, cy + dy * 0.3), P(cx - dx * 0.2 + px * 0.25, cy - dy * 0.2 + py * 0.25), P(cx - dx * 0.2 - px * 0.25, cy - dy * 0.2 - py * 0.25)], "rgba(240,215,80,.55)");
  };
  for (let i = 2; i < 25; i += 3) {
    flecha(i + 0.5, -0.5, 1, 0);
    flecha(25.5, i + 0.5, 0, 1);
    flecha(i + 0.5, 25.5, -1, 0);
    flecha(-0.5, i + 0.5, 0, -1);
  }
  // salidas en las esquinas
  const fs = Math.max(8, Math.round(9 * cam.s * 2));
  ctx.font = "bold " + fs + "px system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [x, y] of [[-1, -1], [25, -1], [25, 25], [-1, 25]]) {
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
  ctx.fillStyle = "#1a1d26";
  ctx.fillRect(0, 0, cw, ch);
  ctx.lineJoin = "round";
  dibujarSuelo();
  const lista = autos.filter((c) => c.estado !== 2).map((c) => ({ c, p: poseDe(c) }));
  lista.sort((a, b) => a.p.cx + a.p.cy - (b.p.cx + b.p.cy));
  for (const it of lista) dibujarAuto(it.c);
}

// ----- Bucle -----
function actualizar(dt) {
  T += dt;
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
  $("movs").textContent = movs;
  $("autos").textContent = restantes + " / " + autos.length;
}

function victoria() {
  ganado = true;
  let txt = "Lo lograste en " + movs + " movimientos.";
  if (nivel > prog.hecho) {
    const pts = 100 * nivel;
    prog.hecho = nivel;
    if (sumarPuntos) { sumarPuntos(ID_JUEGO, pts).catch(() => {}); txt += " +" + pts + " puntos (si tienes sesión)."; }
  }
  prog.max = Math.max(prog.max, Math.min(NIVELES.length, nivel + 1));
  guardar();
  hudNiveles();
  const ultimo = nivel >= NIVELES.length;
  $("vtitulo").textContent = ultimo ? "¡Terminaste los 5 niveles! 🎉" : "¡Nivel " + nivel + " completado!";
  $("vtexto").textContent = txt;
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

function hudNiveles() {
  const z = $("niveles");
  z.innerHTML = "";
  for (let i = 1; i <= NIVELES.length; i++) {
    const b = document.createElement("button");
    b.className = "btn sec" + (i === nivel ? " on" : "");
    b.textContent = i;
    b.disabled = i > prog.max;
    b.addEventListener("click", () => cargarNivel(i));
    z.appendChild(b);
  }
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
    if (g.moved) { cam.ox += nuevo.x - viejo.x; cam.oy += nuevo.y - viejo.y; }
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
$("siguiente").addEventListener("click", () => cargarNivel(Math.min(NIVELES.length, nivel + 1)));
addEventListener("resize", () => { redim(); ajustarCamara(); });

// ----- Inicio -----
redim();
cargarNivel(clamp(prog.max, 1, NIVELES.length));
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
