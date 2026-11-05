// Ruta: isla/juego-isla.js
// «Isla»: supervivencia sencilla en vista isométrica. Tala árboles, mina rocas, fabrica hacha y pico y construye pisos y paredes.
// El terreno es una imagen suave (no cuadros): se genera una vez con ruido y se proyecta en isométrico; árboles y rocas son sprites dibujados con canvas.
const ID = "isla";

// ----- Ajustes -----
const N = 80;                 // la isla ocupa N×N casillas (las casillas solo sirven para colocar y caminar)
const S = 6;                  // píxeles de textura por casilla
const HW = 32, HH = 16;       // medio ancho / medio alto de una casilla en pantalla (isométrico 2:1)
const MAR = 0.40;             // altura del nivel del mar
const VEL = 3.4;              // casillas por segundo
const ALCANCE = 7;            // distancia máxima para colocar/demoler
const HP = { 1: 6, 2: 5 };    // golpes de mano que aguanta un árbol (1) y una roca (2); hacha/pico pegan ×3
const PUNTOS_LOTE = 10, RECURSOS_POR_PUNTO = 5; // al perfil: 1 punto por cada 5 recursos, por lotes
const COSTES = { pisoM: { madera: 1 }, pisoP: { piedra: 1 }, paredM: { madera: 2 }, paredP: { piedra: 2 } };
const RECETAS = { hacha: { madera: 3, piedra: 2, cuerda: 2 }, pico: { madera: 3, piedra: 3, cuerda: 2 } };
const USOS_LANZA = 20;           // golpes que aguanta la lanza (cada golpe a un árbol o roca gasta 1)
const DANO_LANZA = 0.6;          // daño por golpe de la lanza: un árbol (6) cae en 10 golpes y una roca (5) en 9 (la mano hace 1, hacha/pico 3)
const ICO = { madera: "🪵", piedra: "🪨", cuerda: "🪢" };
// Cosas sueltas del suelo (sin física: no estorban, se recogen al pasar por encima).
// En el arreglo «suelto»: 1 = arbusto de fibra (da cuerda), 2 = palo, 3 = piedrita, 4 = arbusto sin fibra (rebrota solo)
const MAX_SUELTO = { 1: 50, 2: 35, 3: 30 };  // cuántas puede haber a la vez en la isla
const REBROTE = 50;                          // segundos (aprox.) que tarda un arbusto en volver a dar fibra
const CRECE_CADA = 6;                        // cada cuántos segundos (aprox.) sale una cosa nueva (siempre lejos del jugador)
const ITEMS = [["n", "🖐️", "Explorar"], ["pisoM", "🟫", "Piso"], ["pisoP", "⬜", "Piso"], ["paredM", "🪵", "Pared"], ["paredP", "🧱", "Pared"], ["dem", "🧹", "Demoler"]];
const GUARDA = "isla_partida";

// <ruido>
let semilla = 1;
const hash = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vn(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function altura(x, y) {
  const f = vn(x / 18, y / 18, semilla) * 0.55 + vn(x / 9, y / 9, semilla + 1) * 0.28 + vn(x / 4, y / 4, semilla + 2) * 0.17;
  const d = Math.hypot(x - N / 2, y - N / 2) / (N * 0.47);
  return f * 0.5 + (1 - Math.min(1, d * d)) * 0.7 - 0.1;
}
// </ruido>

// ----- Datos del mundo -----
const tierra = new Uint8Array(N * N), obj = new Uint8Array(N * N), vari = new Uint8Array(N * N), hp = new Float32Array(N * N);
const piso = new Uint8Array(N * N), pared = new Uint8Array(N * N);   // 1 = madera, 2 = piedra
const suelto = new Uint8Array(N * N), alt = new Float32Array(N * N), rebrote = new Map();  // rebrote: casilla → segundos que faltan
let inv = { madera: 0, piedra: 0, cuerda: 0 }, herr = { hacha: false, pico: false, lanza: 0 };   // lanza = usos que le quedan (0 = no tienes)
const pj = { x: N / 2, y: N / 2, ruta: [], obj: -1, t: 0, dir: 1, anim: 0, mov: false };
let tex = null, pend = 0;
const ok = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const bloq = (i, j) => !ok(i, j) || !tierra[i * N + j] || obj[i * N + j] || pared[i * N + j];

const libreSuelto = (k) => tierra[k] && alt[k] >= 0.43 && !obj[k] && !pared[k] && !piso[k] && !suelto[k];
function generar() {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = i * N + j, h = altura(i + 0.5, j + 0.5), r = hash(i, j, semilla + 5), f = vn(i / 6, j / 6, semilla + 9);
    tierra[k] = h >= MAR + 0.005 ? 1 : 0; obj[k] = piso[k] = pared[k] = 0; alt[k] = h; suelto[k] = 0;
    if (!tierra[k] || h < 0.43) continue;
    if (h < 0.5) { if (r < 0.05) { obj[k] = 1; vari[k] = 4; } }                    // palmeras en la arena
    else if (r < (f > 0.52 ? (f - 0.45) * 0.8 : 0.015)) { obj[k] = 1; vari[k] = Math.floor(hash(i, j, 3) * 4); }
    else if (r > 0.985 - (h < 0.55 ? 0.02 : 0)) { obj[k] = 2; vari[k] = Math.floor(hash(i, j, 4) * 3); }
    if (obj[k]) hp[k] = HP[obj[k]];
  }
  let b = null, bd = 1e9;                                                          // punto de inicio: tierra firme más cerca del centro
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (altura(i + 0.5, j + 0.5) > 0.5) { const d = Math.hypot(i - N / 2, j - N / 2); if (d < bd) { bd = d; b = [i, j]; } }
  pj.x = b[0] + 0.5; pj.y = b[1] + 0.5;
  for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (ok(b[0] + a, b[1] + c)) obj[(b[0] + a) * N + b[1] + c] = 0;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {                       // cosas sueltas iniciales (más densas cerca del inicio)
    const k = i * N + j;
    if (!libreSuelto(k) || (i === b[0] && j === b[1])) continue;
    const r = hash(i, j, semilla + 41) / (Math.hypot(i - b[0], j - b[1]) < 8 ? 3 : 1);
    if (r < 0.02) { if (alt[k] >= 0.5) suelto[k] = 1; } else if (r < 0.032) { if (alt[k] >= 0.45) suelto[k] = 2; } else if (r < 0.042) suelto[k] = 3;
  }
}

// ----- Textura del terreno (suave, no por cuadros) -----
const PARADAS = [[0, [14, 48, 100]], [0.2, [20, 70, 130]], [0.33, [40, 140, 180]], [0.4, [110, 205, 205]], [0.415, [236, 230, 190]], [0.46, [226, 210, 150]], [0.52, [150, 180, 95]], [0.6, [108, 158, 72]], [0.85, [78, 132, 56]], [1.3, [62, 112, 48]]];
function colorAltura(h) {
  for (let i = 1; i < PARADAS.length; i++) {
    const [a, ca] = PARADAS[i - 1], [b, cb] = PARADAS[i];
    if (h <= b || i === PARADAS.length - 1) { const t = Math.max(0, Math.min(1, (h - a) / (b - a))); return ca.map((v, k) => v + (cb[k] - v) * t); }
  }
}
function crearTextura() {
  const W = N * S, c = document.createElement("canvas"); c.width = c.height = W;
  const g = c.getContext("2d"), im = g.createImageData(W, W), d = im.data;
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const u = x / S, v = y / S, h = altura(u, v), col = colorAltura(h);
    const r = (vn(u * 2.5, v * 2.5, semilla + 7) - 0.5) * (h > MAR ? 22 : 8) + (hash(x, y, 3) - 0.5) * (h > MAR ? 9 : 3);
    const p = (y * W + x) * 4; d[p] = col[0] + r; d[p + 1] = col[1] + r; d[p + 2] = col[2] + r * 0.8; d[p + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  tex = c;
}

// ----- Sprites (árboles y rocas dibujados con canvas) -----
const lienzo = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
const elipse = (g, x, y, rx, ry, f) => { g.fillStyle = f; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
function bola(g, x, y, r, c0, c1) { const q = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); q.addColorStop(0, c0); q.addColorStop(1, c1); elipse(g, x, y, r, r * 0.92, q); }
function crearArbol(v) {
  const [c, g] = lienzo(128, 160), bx = 64, by = 140;
  elipse(g, bx + 10, by + 2, 34, 12, "rgba(0,0,0,.25)");
  const tr = g.createLinearGradient(bx - 8, 0, bx + 8, 0); tr.addColorStop(0, "#5a3c20"); tr.addColorStop(0.5, "#8a6238"); tr.addColorStop(1, "#47301a");
  g.fillStyle = tr; g.strokeStyle = tr; g.lineCap = "round";
  if (v === 4) {                                                                   // palmera
    g.lineWidth = 9; g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 4, by - 45, bx + 18, by - 88); g.stroke();
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * 6.28, ex = bx + 18 + Math.cos(a) * 42, ey = by - 88 + Math.sin(a) * 16 + 14;
      g.strokeStyle = k % 2 ? "#2f8a3a" : "#3ea04a"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(bx + 18, by - 90); g.quadraticCurveTo((bx + 18 + ex) / 2, by - 112, ex, ey); g.stroke();
    }
    bola(g, bx + 15, by - 84, 5, "#8b5a2b", "#5a3a1a");
  } else if (v < 2) {                                                              // frondoso
    g.beginPath(); g.moveTo(bx - 8, by); g.lineTo(bx - 4, by - 62); g.lineTo(bx + 4, by - 62); g.lineTo(bx + 8, by); g.fill();
    const [a, b] = v ? ["#9cc94f", "#3c7a2a"] : ["#7dbb4f", "#2f6b2a"];
    [[0, -78, 34], [-24, -64, 26], [24, -66, 27], [0, -104, 25], [-12, -92, 26], [14, -90, 26]].forEach(([x, y, r]) => bola(g, bx + x, by + y, r, a, b));
  } else {                                                                         // pino
    g.fillRect(bx - 5, by - 34, 10, 34);
    for (let t = 0; t < 5; t++) {
      const yb = by - 22 - t * 21, hw = 36 - t * 6, q = g.createLinearGradient(bx - hw, 0, bx + hw, 0);
      q.addColorStop(0, v === 3 ? "#4e9a7a" : "#3f9a55"); q.addColorStop(1, v === 3 ? "#1d4d44" : "#1b4d2f");
      g.fillStyle = q; g.beginPath(); g.moveTo(bx, yb - 36); g.lineTo(bx + hw, yb); g.quadraticCurveTo(bx, yb + 8, bx - hw, yb); g.closePath(); g.fill();
    }
  }
  return c;
}
function crearRoca(v) {
  const [c, g] = lienzo(90, 70), cx = 45, cy = 50, s = [17, 23, 30][v];
  elipse(g, cx + 6, cy + 4, s + 8, s * 0.38, "rgba(0,0,0,.28)");
  const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, r = s * (0.8 + hash(k, v, 77) * 0.35); pts.push([cx + Math.cos(a) * r, cy - s * 0.5 + Math.sin(a) * r * 0.75]); }
  const q = g.createLinearGradient(cx - s, cy - s * 1.3, cx + s, cy + s * 0.3); q.addColorStop(0, "#c6c9cd"); q.addColorStop(1, "#5d626a");
  const trazo = (p, f) => { g.fillStyle = f; g.beginPath(); p.forEach(([x, y], n) => n ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  trazo(pts, q); g.strokeStyle = "rgba(40,44,50,.6)"; g.lineWidth = 1.5; g.stroke();
  trazo(pts.slice(0, 5).map(([x, y]) => [cx + (x - cx) * 0.6 - 2, cy - s * 0.5 + (y - cy + s * 0.5) * 0.6 - 4]), "rgba(255,255,255,.22)");
  g.strokeStyle = "rgba(30,34,40,.45)"; g.beginPath(); g.moveTo(cx - s * 0.2, cy - s * 0.2); g.lineTo(cx + s * 0.1, cy - s * 0.75); g.stroke();
  if (v) elipse(g, cx - s * 0.2, cy - s * 0.95, s * 0.45, s * 0.14, "rgba(100,150,60,.55)");
  return c;
}
function crearArbusto(v) {                                                         // 0 y 1: con fibra; 2: sin fibra (solo tallos cortos)
  const [c, g] = lienzo(60, 48), cx = 30, cy = 40;
  elipse(g, cx + 3, cy + 2, 20, 6, "rgba(0,0,0,.22)"); g.lineCap = "round";
  if (v === 2) {
    g.strokeStyle = "#8a7a4a"; g.lineWidth = 2;
    for (let k = 0; k < 6; k++) { const x = cx + (k - 2.5) * 3; g.beginPath(); g.moveTo(x, cy); g.lineTo(x + (k - 2.5) * 1.5, cy - 7 - hash(k, 5, 5) * 5); g.stroke(); }
    return c;
  }
  const [a, b] = v ? ["#c9d86a", "#8fae3c"] : ["#b4d35a", "#6f9a2e"];
  bola(g, cx, cy - 8, 14, a, b);
  for (let k = 0; k < 14; k++) {
    const x = cx + (k - 6.5) * 2.2, d = (k / 13 - 0.5) * 2.2, len = 18 + hash(k, v, 6) * 10;
    g.strokeStyle = k % 3 === 0 ? "#e8dc8c" : k % 2 ? a : "#7fa23a"; g.lineWidth = 2.2;                  // los tallos claros son la fibra
    g.beginPath(); g.moveTo(x, cy - 2); g.quadraticCurveTo(x + Math.sin(d) * 8, cy - len * 0.6, x + Math.sin(d) * len * 0.7, cy - len); g.stroke();
  }
  return c;
}
function crearPalo(v) {
  const [c, g] = lienzo(44, 24), L = [16, 13, 18][v], y0 = 14 + (v - 1) * 2, y1 = 10 - (v - 1) * 2;
  elipse(g, 24, 17, L, 3.5, "rgba(0,0,0,.22)"); g.lineCap = "round";
  g.strokeStyle = "#5e4022"; g.lineWidth = 4.5; g.beginPath(); g.moveTo(22 - L, y0); g.lineTo(22 + L, y1); g.stroke();
  g.strokeStyle = "#9a6d3a"; g.lineWidth = 2; g.beginPath(); g.moveTo(22 - L, y0 - 1); g.lineTo(22 + L, y1 - 1); g.stroke();
  g.strokeStyle = "#5e4022"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(22 + (v - 1) * 4, (y0 + y1) / 2); g.lineTo(26 + (v - 1) * 4, (y0 + y1) / 2 - 7); g.stroke();
  return c;
}
function crearPiedrita(v) {
  const [c, g] = lienzo(30, 20);
  elipse(g, 16, 15, 11 + v, 3.5, "rgba(0,0,0,.25)");
  bola(g, 14, 11, 6 + v * 1.5, "#d2d5d9", "#6b7078"); bola(g, 21, 13, 3.5 + v * 0.5, "#c0c3c8", "#5d626a");
  return c;
}
const arboles = [0, 1, 2, 3, 4].map(crearArbol), rocas = [0, 1, 2].map(crearRoca);
const arbustos = [0, 1, 2].map(crearArbusto), palos = [0, 1, 2].map(crearPalo), piedritas = [0, 1, 2].map(crearPiedrita);

// ----- Cámara y proyección -----
const cv = document.getElementById("mundo"), ctx = cv.getContext("2d");
let cw = 0, ch = 0, dpr = 1, zoom = 1, camx = 0, camy = 0, ox = 0, oy = 0;
const P = (i, j, z) => [(i - j) * HW, (i + j) * HH - z];
const iso = (i, j) => P(i, j, 0);
function tileAt(sx, sy) { const a = ((sx - ox) / zoom) / HW, b = ((sy - oy) / zoom) / HH; return [(a + b) / 2, (b - a) / 2]; }
function ajustar() {
  dpr = Math.min(1.5, devicePixelRatio || 1);   // tope 1.5: menos píxeles que pintar = menos lag en celulares
  cw = innerWidth; ch = innerHeight;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
addEventListener("resize", ajustar);

// ----- Dibujo -----
const poly = (pts, f) => { ctx.fillStyle = f; ctx.beginPath(); pts.forEach(([x, y], n) => n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
function caja(i0, i1, j0, j1, z1, C) {
  poly([P(i0, j0, z1), P(i1, j0, z1), P(i1, j1, z1), P(i0, j1, z1)], C[0]);
  poly([P(i1, j0, 0), P(i1, j1, 0), P(i1, j1, z1), P(i1, j0, z1)], C[1]);
  poly([P(i0, j1, 0), P(i1, j1, 0), P(i1, j1, z1), P(i0, j1, z1)], C[2]);
  ctx.strokeStyle = "rgba(0,0,0,.16)"; ctx.lineWidth = 1; ctx.beginPath();
  for (let z = z1 / 4; z < z1; z += z1 / 4) { let a = P(i1, j0, z), b = P(i1, j1, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); a = P(i0, j1, z); b = P(i1, j1, z); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  ctx.stroke();
}
const MAT = { 1: ["#c9a066", "#9a6d3a", "#7c5628"], 2: ["#cfd2d6", "#a0a5ab", "#80868d"] };
function dibPared(i, j, k) {
  const C = MAT[pared[k]], t = 0.15, ci = i + 0.5, cj = j + 0.5, z = 56, m = (a, b) => ok(a, b) && pared[a * N + b];
  if (m(i - 1, j)) caja(i, ci - t, cj - t, cj + t, z, C);
  if (m(i, j - 1)) caja(ci - t, ci + t, j, cj - t, z, C);
  caja(ci - t, ci + t, cj - t, cj + t, z, C);
  if (m(i + 1, j)) caja(ci + t, i + 1, cj - t, cj + t, z, C);
  if (m(i, j + 1)) caja(ci - t, ci + t, cj + t, j + 1, z, C);
}
function dibPiso(i, j, t) {
  const q = [P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)];
  poly(q, t === 1 ? "rgb(" + (180 + hash(i, j, 1) * 14) + ",136,84)" : "rgb(" + (150 + hash(i, j, 1) * 14) + ",154,160)");
  ctx.strokeStyle = t === 1 ? "rgba(60,35,10,.35)" : "rgba(40,44,50,.35)"; ctx.lineWidth = 1; ctx.beginPath();
  for (const f of [0.25, 0.5, 0.75]) {
    let a = P(i + f, j, 0), b = P(i + f, j + 1, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    if (t === 2) { a = P(i, j + f, 0); b = P(i + 1, j + f, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
  }
  ctx.stroke(); ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); q.forEach(([x, y], n) => n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
}
const sac = new Map(), fx = [];
function dibObj(i, j, k) {
  const [x, y] = iso(i + 0.5, j + 0.5), s = sac.get(k) || 0, off = s > 0 ? Math.sin(s * 60) * 3 : 0;
  if (obj[k] === 1) ctx.drawImage(arboles[vari[k]], x - 64 + off, y - 140); else ctx.drawImage(rocas[vari[k]], x - 45 + off * 0.5, y - 52);
}
function dibJugador() {
  const [sx, sy] = iso(pj.x, pj.y), w = pj.mov ? Math.sin(pj.anim * 11) * 4 : 0, golpe = pj.obj >= 0;
  elipse(ctx, sx, sy + 1, 13, 5, "rgba(0,0,0,.28)");
  ctx.save(); ctx.translate(sx, sy); ctx.scale(pj.dir, 1);
  ctx.fillStyle = "#34384f"; ctx.fillRect(-6, -15 - Math.min(0, w), 5, 15); ctx.fillRect(1, -15 + Math.max(0, w), 5, 15);
  ctx.fillStyle = "#3d78d8"; ctx.fillRect(-8, -37, 16, 23);
  ctx.fillStyle = "#2f60b0"; ctx.fillRect(-8, -18, 16, 4);
  elipse(ctx, 0, -45, 7, 7.5, "#efc39b");
  ctx.fillStyle = "#4b3422"; ctx.beginPath(); ctx.arc(0, -46, 7.6, Math.PI, 0); ctx.fill();
  ctx.save(); ctx.translate(7, -32); ctx.rotate(golpe ? Math.sin(pj.t * 14) * 0.8 - 0.4 : 0.1);
  const t = golpe ? obj[pj.obj] : 0, arma = { hacha: 1, pico: 2, lanza: 3 }[herrPara(t)] || 0;
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 3; ctx.lineCap = "round";
  if (arma === 3) {                                       // lanza: palo largo con punta de piedra afilada
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(15, -19); ctx.stroke();
    ctx.fillStyle = "#b8bcc2"; ctx.beginPath(); ctx.moveTo(14, -16); ctx.lineTo(20, -17); ctx.lineTo(19, -27); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#d9c9a0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(12, -17); ctx.lineTo(17, -15); ctx.stroke(); ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 3;
  } else if (arma) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, -15); ctx.stroke(); ctx.fillStyle = "#b8bcc2"; ctx.fillRect(arma === 1 ? 8 : 4, -22, arma === 1 ? 10 : 16, 5); }
  else elipse(ctx, 2, 6, 3.5, 3.5, "#efc39b");
  ctx.restore(); ctx.restore();
}

const L = [], numCmp = (a, b) => a - b;
function dibSuelto(i, j, s) {
  const h = hash(i, j, 31), [x, y] = iso(i + 0.5 + (h - 0.5) * 0.4, j + 0.5 + (hash(i, j, 32) - 0.5) * 0.4), v = (h * 3) | 0;
  if (s === 1) ctx.drawImage(arbustos[v % 2], x - 30, y - 40);
  else if (s === 4) ctx.drawImage(arbustos[2], x - 30, y - 40);
  else if (s === 2) ctx.drawImage(palos[v], x - 22, y - 16);
  else ctx.drawImage(piedritas[v], x - 15, y - 14);
}

function dibujar(tm) {
  const [px, py] = iso(pj.x, pj.y);
  camx += (px - camx) * 0.12; camy += (py - 24 - camy) * 0.12;
  ox = cw / 2 - camx * zoom; oy = ch / 2 - camy * zoom;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#123564"; ctx.fillRect(0, 0, cv.width, cv.height);
  const m = dpr * zoom;
  let i0 = N, i1 = 0, j0 = N, j1 = 0;                                                  // casillas visibles (con margen)
  for (const [x, y] of [[0, -70], [cw, -70], [0, ch + 130], [cw, ch + 130]]) { const [i, j] = tileAt(x, y); i0 = Math.min(i0, i); i1 = Math.max(i1, i); j0 = Math.min(j0, j); j1 = Math.max(j1, j); }
  i0 = Math.max(0, Math.floor(i0) - 1); j0 = Math.max(0, Math.floor(j0) - 1); i1 = Math.min(N - 1, Math.ceil(i1) + 1); j1 = Math.min(N - 1, Math.ceil(j1) + 1);
  if (i1 >= i0 && j1 >= j0) {                                                          // el terreno se pinta solo en la parte que se ve (no la textura entera)
    ctx.setTransform(m * HW / S, m * HH / S, -m * HW / S, m * HH / S, dpr * ox, dpr * oy);
    const rx = i0 * S, ry = j0 * S, rw = (i1 - i0 + 1) * S, rh = (j1 - j0 + 1) * S;
    ctx.drawImage(tex, rx, ry, rw, rh, rx, ry, rw, rh);
  }
  ctx.setTransform(m, 0, 0, m, dpr * ox, dpr * oy);
  for (let i = i0 & ~1; i <= i1; i += 2) for (let j = j0 & ~1; j <= j1; j += 2) {      // brillos del agua
    if (tierra[i * N + j]) continue;
    const a = Math.sin(tm / 700 + hash(i, j, 11) * 6.28);
    if (a > 0.7) { const [x, y] = iso(i + 0.5, j + 0.5); ctx.strokeStyle = "rgba(255,255,255," + (a - 0.7) * 1.1 + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.stroke(); }
  }
  L.length = 0;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const k = i * N + j, s = suelto[k];
    if (piso[k]) dibPiso(i, j, piso[k]);
    if (s === 2 || s === 3) dibSuelto(i, j, s);                                         // palos y piedritas: van planos en el suelo
    if (obj[k] || pared[k] || s === 1 || s === 4) L.push((i + j + 1) * 16384 + k);       // lo que tiene altura se ordena junto con el jugador
  }
  if (modo !== "n" && hov && ok(hov[0], hov[1])) {                                      // marca de la casilla elegida
    const q = [P(hov[0], hov[1], 0), P(hov[0] + 1, hov[1], 0), P(hov[0] + 1, hov[1] + 1, 0), P(hov[0], hov[1] + 1, 0)];
    const lejos = Math.hypot(hov[0] + 0.5 - pj.x, hov[1] + 0.5 - pj.y) > ALCANCE;
    poly(q, lejos ? "rgba(255,80,80,.35)" : "rgba(255,230,90,.35)");
  }
  L.sort(numCmp);
  const pk = (pj.x + pj.y) * 16384; let jug = false;
  for (let n = 0; n < L.length; n++) {
    const v = L[n]; if (!jug && v >= pk) { dibJugador(); jug = true; }
    const k = v % 16384, i = (k / N) | 0, j = k % N;
    if (obj[k]) dibObj(i, j, k); else if (pared[k]) dibPared(i, j, k); else dibSuelto(i, j, suelto[k]);
  }
  if (!jug) dibJugador();
  for (const f of fx) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.v * 1.6));
    if (f.txt) { ctx.font = "bold 16px system-ui"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText(f.txt, f.x, f.y); ctx.fillStyle = "#fff"; ctx.fillText(f.txt, f.x, f.y); }
    else elipse(ctx, f.x, f.y, 2.5, 2.5, f.c);
  }
  ctx.globalAlpha = 1;
}

// ----- Caminos (búsqueda en anchura, 8 direcciones sin cortar esquinas) -----
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function camino(si, sj, meta, adj) {
  const prev = new Int32Array(N * N).fill(-2), cola = [si * N + sj]; prev[cola[0]] = -1;
  let mejor = -1, md = 1e9;
  for (let q = 0; q < cola.length; q++) {
    const k = cola[q], i = (k / N) | 0, j = k % N;
    const d = adj ? Math.max(Math.abs(i - meta[0]), Math.abs(j - meta[1])) : Math.hypot(i - meta[0], j - meta[1]);
    if (adj ? d <= 1 : d < md) { if (adj) { mejor = k; break; } md = d; mejor = k; }
    for (const [a, b] of DIRS) {
      const ni = i + a, nj = j + b, nk = ni * N + nj;
      if (bloq(ni, nj) || prev[nk] !== -2) continue;
      if (a && b && (bloq(i + a, j) || bloq(i, j + b))) continue;
      prev[nk] = k; cola.push(nk);
    }
  }
  const r = []; for (let k = mejor; k >= 0 && prev[k] >= 0; k = prev[k]) r.push([((k / N) | 0) + 0.5, (k % N) + 0.5]);
  return mejor < 0 ? null : r.reverse();
}

// ----- Interacción -----
let modo = "n", hov = null, down = null, ultimo = -1;
const $ = (id) => document.getElementById(id);
function aviso(t) { const a = $("aviso"); a.textContent = t; a.style.opacity = 1; clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.style.opacity = 0), 1800); }
const puede = (c) => Object.entries(c).every(([r, n]) => inv[r] >= n);
const pagar = (c, s = -1) => { for (const r in c) inv[r] += c[r] * s; hud(); };
function objetivar(i, j) {
  const k = i * N + j, r = camino(Math.floor(pj.x), Math.floor(pj.y), [i, j], true);
  if (!r) { aviso("No se puede llegar"); return; }
  pj.ruta = r; pj.obj = k; pj.t = 0;
}
function irA(i, j) { const r = camino(Math.floor(pj.x), Math.floor(pj.y), [i, j], false); if (r) { pj.ruta = r; pj.obj = -1; } }
function tocar(sx, sy) {
  for (const dy of [0, 30, 60, 90]) {
    const [a, b] = tileAt(sx, sy + dy * zoom), i = Math.floor(a), j = Math.floor(b);
    if (ok(i, j) && obj[i * N + j] && (dy <= 30 || obj[i * N + j] === 1)) { objetivar(i, j); return; }
  }
  for (const dy of [0, 14, 28]) {                                                      // arbustos: se camina hasta ellos y se recogen al pisarlos
    const [a, b] = tileAt(sx, sy + dy * zoom), i = Math.floor(a), j = Math.floor(b);
    if (ok(i, j) && suelto[i * N + j] === 1) { irA(i, j); return; }
  }
  const [a, b] = tileAt(sx, sy); irA(Math.max(0, Math.min(N - 1, Math.floor(a))), Math.max(0, Math.min(N - 1, Math.floor(b))));
}
function colocar(i, j) {
  const k = i * N + j;
  if (!ok(i, j) || !tierra[k]) return;
  if (Math.hypot(i + 0.5 - pj.x, j + 0.5 - pj.y) > ALCANCE) { aviso("Muy lejos: acércate"); return; }
  if (modo === "dem") {
    if (pared[k]) { pagar(COSTES[pared[k] === 1 ? "paredM" : "paredP"], 1); pared[k] = 0; }
    else if (piso[k]) { pagar(COSTES[piso[k] === 1 ? "pisoM" : "pisoP"], 1); piso[k] = 0; }
    return;
  }
  const esPared = modo.startsWith("pared"), t = modo.endsWith("M") ? 1 : 2;
  if (obj[k] || (esPared ? pared[k] : piso[k])) return;
  if (esPared && Math.floor(pj.x) === i && Math.floor(pj.y) === j) { aviso("Tú estás ahí"); return; }
  if (!puede(COSTES[modo])) { aviso("Te faltan materiales"); return; }
  pagar(COSTES[modo]); (esPared ? pared : piso)[k] = t; suelto[k] = 0; rebrote.delete(k);
}
function elegir(id) { modo = id; $("fab").hidden = true; $("invp").hidden = true; $("mesa").hidden = true; hud(); }

cv.addEventListener("pointerdown", (e) => {
  cv.setPointerCapture(e.pointerId);
  down = { x: e.offsetX, y: e.offsetY, mov: false };
  const [a, b] = tileAt(e.offsetX, e.offsetY); hov = [Math.floor(a), Math.floor(b)];
  if (modo !== "n") { ultimo = hov[0] * N + hov[1]; colocar(hov[0], hov[1]); }
  $("fab").hidden = true; $("invp").hidden = true; $("mesa").hidden = true;
});
cv.addEventListener("pointermove", (e) => {
  const [a, b] = tileAt(e.offsetX, e.offsetY); hov = [Math.floor(a), Math.floor(b)];
  if (!down) return;
  if (Math.hypot(e.offsetX - down.x, e.offsetY - down.y) > 8) down.mov = true;
  if (modo !== "n" && hov[0] * N + hov[1] !== ultimo) { ultimo = hov[0] * N + hov[1]; colocar(hov[0], hov[1]); }
});
cv.addEventListener("pointerup", (e) => { if (down && !down.mov && modo === "n") tocar(e.offsetX, e.offsetY); down = null; });
cv.addEventListener("pointercancel", () => (down = null));
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoom = Math.max(0.5, Math.min(1.8, zoom * Math.exp(-e.deltaY * 0.001))); }, { passive: false });
$("mas").onclick = () => (zoom = Math.min(1.8, zoom * 1.2));
$("menos").onclick = () => (zoom = Math.max(0.5, zoom / 1.2));
const teclas = new Set();
addEventListener("keydown", (e) => { if (e.key.startsWith("Arrow") || "wasd".includes(e.key.toLowerCase())) { teclas.add(e.key.toLowerCase()); e.preventDefault(); } });
addEventListener("keyup", (e) => teclas.delete(e.key.toLowerCase()));

// ----- Recursos y fabricación -----
function sumaRecurso(r, n, i, j) {
  inv[r] += n; pend += n / RECURSOS_POR_PUNTO; hud(); enviar(PUNTOS_LOTE);
  const [x, y] = iso(i + 0.5, j + 0.5); fx.push({ x, y: y - 60, vy: -30, v: 1, txt: "+" + n + " " + ICO[r] });
}
function recoger(k) {                                                                  // se llama al pisar un arbusto con fibra, un palo o una piedrita
  const s = suelto[k]; if (s < 1 || s > 3) return;
  const i = (k / N) | 0, j = k % N;
  if (s === 1) { suelto[k] = 4; rebrote.set(k, REBROTE * (0.7 + Math.random() * 0.6)); sumaRecurso("cuerda", 2, i, j); }
  else { suelto[k] = 0; sumaRecurso(s === 2 ? "madera" : "piedra", 1, i, j); }
}
function brotar() {                                                                    // hace salir una cosa nueva, lejos de lo que se ve
  const cuenta = [0, 0, 0, 0, 0];
  for (let k = 0; k < N * N; k++) cuenta[suelto[k]]++;
  cuenta[1] += cuenta[4];
  const libres = [1, 2, 3].filter((t) => cuenta[t] < MAX_SUELTO[t]);
  if (!libres.length) return;
  const t = libres[(Math.random() * libres.length) | 0], lejos = Math.max(10, 12 / zoom);
  for (let n = 0; n < 12; n++) {
    const i = (Math.random() * N) | 0, j = (Math.random() * N) | 0, k = i * N + j;
    if (!libreSuelto(k) || (t === 1 && alt[k] < 0.5) || (t === 2 && alt[k] < 0.45)) continue;
    if (Math.hypot(i + 0.5 - pj.x, j + 0.5 - pj.y) < lejos) continue;
    suelto[k] = t; return;
  }
}
// Qué usa el jugador contra un árbol (1) o roca (2): hacha/pico si los tiene, si no la lanza (mientras le queden usos), si no la mano
function herrPara(t) { if (t === 1 && herr.hacha) return "hacha"; if (t === 2 && herr.pico) return "pico"; return herr.lanza > 0 ? "lanza" : null; }
function golpe() {
  const k = pj.obj, t = obj[k], i = (k / N) | 0, j = k % N, h = herrPara(t);
  hp[k] = Math.max(0, hp[k] - (h === "lanza" ? DANO_LANZA : h ? 3 : 1)); sac.set(k, 0.25);
  if (h === "lanza") { herr.lanza--; if (herr.lanza <= 0) aviso("¡Tu lanza se rompió!"); hud(); }
  const [x, y] = iso(i + 0.5, j + 0.5);
  for (let n = 0; n < 5; n++) fx.push({ x, y: y - 25, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 60, v: 0.8, c: t === 1 ? "#5aa03a" : "#9aa0a6", g: 160 });
  if (hp[k] <= 0.001) { obj[k] = 0; pj.obj = -1; sumaRecurso(t === 1 ? "madera" : "piedra", t === 1 ? 2 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2), i, j); }
}
function fabricar(n) { if (herr[n] || !puede(RECETAS[n])) return; pagar(RECETAS[n]); herr[n] = true; pend += 5; aviso(n === "hacha" ? "¡Hacha lista! Talas mucho más rápido" : "¡Pico listo! Minas mucho más rápido"); hud(); }
const etq = (c) => Object.entries(c).map(([r, n]) => ICO[r] + n).join(" ");
function hud() {
  $("rec").textContent = "🪵 " + inv.madera + "   🪨 " + inv.piedra + "   🪢 " + inv.cuerda + (herr.hacha ? "  🪓" : "") + (herr.pico ? "  ⛏️" : "") + (herr.lanza > 0 ? "  🔱" + herr.lanza : "");
  for (const [id] of ITEMS) { const b = botones[id]; b.classList.toggle("sel", modo === id); b.classList.toggle("no", !!COSTES[id] && !puede(COSTES[id])); }
  botones.fab.classList.toggle("sel", !$("fab").hidden);
  if (botones.inv) botones.inv.classList.toggle("sel", !$("invp").hidden);
  if (botones.mesa) botones.mesa.classList.toggle("sel", !$("mesa").hidden);
  const f = $("fab"); f.innerHTML = "<h3>⚒️ Fabricar</h3>";
  [["hacha", "🪓 Hacha (tala ×3)"], ["pico", "⛏️ Pico (mina ×3)"]].forEach(([n, t]) => {
    const b = document.createElement("button"); b.className = "btn"; b.disabled = herr[n] || !puede(RECETAS[n]);
    b.textContent = herr[n] ? "✔ " + t : t + " — " + etq(RECETAS[n]); b.onclick = () => fabricar(n); f.appendChild(b);
  });
  pintarInv();
  pintarMesa();
}
const botones = {};
ITEMS.forEach(([id, ico, nom]) => {
  const b = document.createElement("button"); b.className = "it"; b.title = nom;
  b.innerHTML = "<span>" + ico + "</span><small>" + (COSTES[id] ? etq(COSTES[id]) : nom) + "</small>";
  b.onclick = () => elegir(id); $("barra").appendChild(b); botones[id] = b;
});
{ const b = document.createElement("button"); b.className = "it"; b.innerHTML = "<span>⚒️</span><small>Fabricar</small>"; b.onclick = () => { $("fab").hidden = !$("fab").hidden; $("invp").hidden = true; $("mesa").hidden = true; hud(); }; $("barra").appendChild(b); botones.fab = b; }

// ----- Inventario (8 casillas en 2 filas de 4) y crafteo 2×2 -----
// «inv» sigue siendo la cuenta real de recursos (la usan las construcciones). Las casillas la muestran;
// al poner algo en el crafteo se mueve de «inv» a la cuadrícula, y al sacarlo vuelve.
const RECURSOS = ["madera", "piedra", "cuerda"];
const NOM = { madera: "Madera", piedra: "Piedra", cuerda: "Cuerda", hacha: "Hacha", pico: "Pico", lanza: "Lanza" };
const ICO_H = { hacha: "🪓", pico: "⛏️", lanza: "🔱" };
let rej = [null, null, null, null], rej3 = Array(9).fill(null), selInv = null;          // rej: las 4 casillas del crafteo, cada una null o { r, n }
const enRej = (r) => rej.reduce((a, c) => a + (c && c.r === r ? c.n : 0), 0);
function invTotal() { const t = Object.assign({}, inv); for (const c of rej.concat(rej3)) if (c) t[c.r] += c.n; return t; }   // para guardar
function itemsInv() {
  const l = RECURSOS.filter((r) => inv[r] > 0).map((r) => ({ r, n: inv[r] }));
  if (herr.hacha) l.push({ r: "hacha", n: 1 });
  if (herr.pico) l.push({ r: "pico", n: 1 });
  if (herr.lanza > 0) l.push({ r: "lanza", n: herr.lanza });   // el número de la casilla = usos que le quedan
  return l.slice(0, 8);
}
function recetaLista() {
  for (const n in RECETAS) if (!herr[n] && Object.entries(RECETAS[n]).every(([r, c]) => enRej(r) >= c)) return n;
  return null;
}
function casilla(it, fn, sel) {
  const b = document.createElement("button"); b.className = "cas" + (sel ? " sel" : "");
  if (it) { b.title = NOM[it.r]; b.innerHTML = "<span>" + (ICO[it.r] || ICO_H[it.r]) + "</span>" + (it.n > 1 ? "<i>" + it.n + "</i>" : ""); }
  b.onclick = fn; return b;
}
function clicCelda(n) {
  const c = rej[n];
  if (selInv && inv[selInv] > 0 && (!c || c.r === selInv)) { inv[selInv]--; if (c) c.n++; else rej[n] = { r: selInv, n: 1 }; }
  else if (c) { inv[c.r]++; if (--c.n <= 0) rej[n] = null; }
  hud();
}
function sacarResultado() {
  const n = recetaLista(); if (!n) return;
  for (const [r, c] of Object.entries(RECETAS[n])) {
    let falta = c;
    for (let k = 0; k < 4 && falta > 0; k++) { const x = rej[k]; if (x && x.r === r) { const q = Math.min(falta, x.n); x.n -= q; falta -= q; if (x.n <= 0) rej[k] = null; } }
  }
  herr[n] = true; pend += 5; aviso(n === "hacha" ? "¡Hacha lista! Talas mucho más rápido" : "¡Pico listo! Minas mucho más rápido"); hud();
}
function pintarInv() {
  const p = $("invp"); if (p.hidden) return;
  if (selInv && inv[selInv] <= 0) selInv = null;
  p.innerHTML = "<h3>🎒 Inventario</h3>";
  const l = itemsInv(), g1 = document.createElement("div"); g1.className = "cuad c4";
  for (let n = 0; n < 8; n++) {
    const it = l[n], apilable = it && RECURSOS.includes(it.r);
    g1.appendChild(casilla(it, () => { if (apilable) { selInv = selInv === it.r ? null : it.r; pintarInv(); } }, apilable && it.r === selInv));
  }
  p.appendChild(g1);
  const h = document.createElement("h4"); h.textContent = "⚒️ Crafteo (toca un objeto y luego una casilla)"; p.appendChild(h);
  const fila = document.createElement("div"), g2 = document.createElement("div"); fila.className = "craft"; g2.className = "cuad c2";
  rej.forEach((c, n) => g2.appendChild(casilla(c, () => clicCelda(n), false)));
  const flecha = document.createElement("span"); flecha.textContent = "➜"; flecha.className = "flecha";
  const res = recetaLista();
  fila.append(g2, flecha, casilla(res ? { r: res, n: 1 } : null, sacarResultado, !!res));
  p.appendChild(fila);
  const nota = document.createElement("small"); nota.textContent = "Hacha: " + etq(RECETAS.hacha) + " · Pico: " + etq(RECETAS.pico); p.appendChild(nota);
}
{ const b = document.createElement("button"); b.className = "it"; b.innerHTML = "<span>🎒</span><small>Inventario</small>"; b.onclick = () => { const v = $("invp").hidden; $("invp").hidden = !v; $("fab").hidden = true; $("mesa").hidden = true; hud(); }; $("barra").appendChild(b); botones.inv = b; }

// ----- Mesa de creaciones (cuadrícula 3×3) -----
// Funciona como el crafteo 2×2, pero con 9 casillas: toca un material del inventario y luego una casilla para ponerlo (un toque = una unidad);
// toca una casilla con algo para devolverlo al inventario. La cuadrícula es «rej3» (9 casillas, de izquierda a derecha y de arriba abajo).
// RECETAS_MESA: lista de recetas. Cada una = { res: "id del resultado", forma: [9 casillas con "madera"/"piedra"/"cuerda" o null] }.
// Para agregar otra, ponla en la lista y define qué pasa en «sacarResultadoMesa».
// - Lanza (herramienta multiusos): 1 palo (madera), 2 piedras y 1 cuerda, con forma de lanza: punta de piedra arriba, cuerda en medio y palo abajo.
//   Solo se puede hacer otra cuando la anterior se acabó («ok»).
const RECETAS_MESA = [
  { res: "lanza", ok: () => herr.lanza <= 0, forma: [null, "piedra", "piedra", null, "cuerda", null, "madera", null, null] },
];
function recetaMesa() {
  for (const rc of RECETAS_MESA) if ((!rc.ok || rc.ok()) && rc.forma.every((r, n) => (r || null) === (rej3[n] ? rej3[n].r : null))) return rc.res;
  return null;
}
function clicCeldaMesa(n) {
  const c = rej3[n];
  if (selInv && inv[selInv] > 0 && (!c || c.r === selInv)) { inv[selInv]--; if (c) c.n++; else rej3[n] = { r: selInv, n: 1 }; }
  else if (c) { inv[c.r]++; if (--c.n <= 0) rej3[n] = null; }
  hud();
}
function sacarResultadoMesa() {
  const res = recetaMesa(); if (!res) return;
  for (let n = 0; n < 9; n++) { const c = rej3[n]; if (c && --c.n <= 0) rej3[n] = null; }   // gasta 1 de cada casilla usada
  if (res === "lanza") { herr.lanza = USOS_LANZA; aviso("¡Lanza lista! " + USOS_LANZA + " golpes para talar o minar"); }
  hud();
}
function pintarMesa() {
  const p = $("mesa"); if (p.hidden) return;
  if (selInv && inv[selInv] <= 0) selInv = null;
  p.innerHTML = "<h3>🛠️ Mesa de creaciones</h3>";
  const l = itemsInv(), g1 = document.createElement("div"); g1.className = "cuad c4";
  for (let n = 0; n < 8; n++) {
    const it = l[n], apilable = it && RECURSOS.includes(it.r);
    g1.appendChild(casilla(it, () => { if (apilable) { selInv = selInv === it.r ? null : it.r; pintarMesa(); } }, apilable && it.r === selInv));
  }
  p.appendChild(g1);
  const h = document.createElement("h4"); h.textContent = "Toca un material y luego una casilla"; p.appendChild(h);
  const fila = document.createElement("div"), g3 = document.createElement("div"); fila.className = "craft"; g3.className = "cuad c3";
  rej3.forEach((c, n) => g3.appendChild(casilla(c, () => clicCeldaMesa(n), false)));
  const flecha = document.createElement("span"); flecha.textContent = "➜"; flecha.className = "flecha";
  const res = recetaMesa();
  fila.append(g3, flecha, casilla(res ? { r: res, n: 1 } : null, sacarResultadoMesa, !!res));
  p.appendChild(fila);
  const nota = document.createElement("small"); nota.textContent = "Lanza: 🪨 🪨 arriba, 🪢 en medio y 🪵 abajo en diagonal (" + USOS_LANZA + " usos)"; p.appendChild(nota);
}
{ const b = document.createElement("button"); b.className = "it"; b.innerHTML = "<span>🛠️</span><small>Mesa</small>"; b.onclick = () => { const v = $("mesa").hidden; $("mesa").hidden = !v; $("invp").hidden = true; $("fab").hidden = true; hud(); }; $("barra").appendChild(b); botones.mesa = b; }

// ----- Puntos al perfil (1 por cada 5 recursos, por lotes) -----
async function enviar(min) {
  if (pend < min) return;
  const p = Math.floor(pend); if (p < 1) return; pend -= p;
  try { const { sumarPuntos } = await import("../compartido/jugador.js"); await sumarPuntos(ID, p); } catch (e) { pend += p; }
}

// ----- Guardado (en el navegador) -----
const aB = (a) => { let s = ""; for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); };
const deB = (t, a) => { const s = atob(t); for (let i = 0; i < a.length && i < s.length; i++) a[i] = s.charCodeAt(i); };
function guardar() { try { localStorage.setItem(GUARDA, JSON.stringify({ semilla, inv: invTotal(), herr, x: pj.x, y: pj.y, obj: aB(obj), piso: aB(piso), pared: aB(pared), suelto: aB(suelto) })); } catch (e) {} }
function iniciar(nueva) {
  let g = null; try { g = !nueva && JSON.parse(localStorage.getItem(GUARDA)); } catch (e) {}
  semilla = g ? g.semilla : 1 + Math.floor(Math.random() * 100000);
  inv = { madera: 0, piedra: 0, cuerda: 0 }; herr = { hacha: false, pico: false, lanza: 0 }; rej = [null, null, null, null]; rej3 = Array(9).fill(null); selInv = null; fx.length = 0; rebrote.clear(); pj.ruta = []; pj.obj = -1;
  generar(); crearTextura();
  if (g) {
    try {
      inv = Object.assign({ madera: 0, piedra: 0, cuerda: 0 }, g.inv); if (g.inv && g.inv.fibra) inv.cuerda += g.inv.fibra; delete inv.fibra; /* partidas viejas: fibra → cuerda */ herr = Object.assign({ hacha: false, pico: false, lanza: 0 }, g.herr); deB(g.obj, obj); deB(g.piso, piso); deB(g.pared, pared);
      if (g.suelto) { suelto.fill(0); deB(g.suelto, suelto); }
      for (let k = 0; k < N * N; k++) {
        hp[k] = obj[k] ? HP[obj[k]] : 0;
        if (piso[k] || pared[k] || obj[k]) suelto[k] = 0; else if (suelto[k] === 4) rebrote.set(k, 8 + Math.random() * REBROTE * 0.6);
      }
      if (ok(Math.floor(g.x), Math.floor(g.y)) && !bloq(Math.floor(g.x), Math.floor(g.y))) { pj.x = g.x; pj.y = g.y; }
    } catch (e) {}
  }
  camx = iso(pj.x, pj.y)[0]; camy = iso(pj.x, pj.y)[1];
  hud();
}
$("nueva").onclick = () => { if (confirm("¿Crear una isla nueva? Se perderá la actual.")) { try { localStorage.removeItem(GUARDA); } catch (e) {} iniciar(true); } };
setInterval(guardar, 10000);
addEventListener("pagehide", () => { guardar(); enviar(1); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { guardar(); enviar(1); } });

// ----- Bucle -----
let antes = 0, crece = 3;
function bucle(tm) {
  const dt = Math.min(0.05, (tm - antes) / 1000 || 0); antes = tm;
  let mov = false;
  const kx = (teclas.has("arrowright") || teclas.has("d") ? 1 : 0) - (teclas.has("arrowleft") || teclas.has("a") ? 1 : 0);
  const ky = (teclas.has("arrowdown") || teclas.has("s") ? 1 : 0) - (teclas.has("arrowup") || teclas.has("w") ? 1 : 0);
  if (kx || ky) {                                                                    // teclado: dirección relativa a la pantalla
    pj.ruta = []; pj.obj = -1;
    const di = (kx + ky), dj = (ky - kx), n = Math.hypot(di, dj) || 1, vx = di / n * VEL * dt, vy = dj / n * VEL * dt;
    if (!bloq(Math.floor(pj.x + vx + Math.sign(vx) * 0.2), Math.floor(pj.y))) pj.x += vx;
    if (!bloq(Math.floor(pj.x), Math.floor(pj.y + vy + Math.sign(vy) * 0.2))) pj.y += vy;
    pj.dir = kx < 0 || (!kx && ky < 0) ? -1 : 1; mov = true;
  } else if (pj.ruta.length) {
    const [tx, ty] = pj.ruta[0], dx = tx - pj.x, dy = ty - pj.y, d = Math.hypot(dx, dy), p = VEL * dt;
    if (d <= p) { pj.x = tx; pj.y = ty; pj.ruta.shift(); } else { pj.x += dx / d * p; pj.y += dy / d * p; }
    if (dx - dy !== 0) pj.dir = dx - dy > 0 ? 1 : -1;
    mov = true;
  } else if (pj.obj >= 0) {
    const k = pj.obj;
    if (!obj[k]) pj.obj = -1;
    else {
      const ti = (k / N) | 0, tj = k % N;
      if (Math.hypot(ti + 0.5 - pj.x, tj + 0.5 - pj.y) > 1.9) pj.obj = -1;
      else { pj.dir = (ti - tj) - (pj.x - pj.y) >= 0 ? 1 : -1; pj.t += dt; if (pj.t >= (herrPara(obj[k]) ? 0.4 : 0.55)) { pj.t = 0; golpe(); } }
    }
  }
  pj.mov = mov; if (mov) pj.anim += dt;
  { const k = Math.floor(pj.x) * N + Math.floor(pj.y); if (suelto[k] >= 1 && suelto[k] <= 3) recoger(k); }
  for (const [k, v] of rebrote) { if (v - dt <= 0) { rebrote.delete(k); if (suelto[k] === 4) suelto[k] = 1; } else rebrote.set(k, v - dt); }
  crece -= dt; if (crece <= 0) { crece = CRECE_CADA * (0.6 + Math.random() * 0.8); brotar(); }
  for (const [k, v] of sac) { if (v - dt <= 0) sac.delete(k); else sac.set(k, v - dt); }
  for (let n = fx.length - 1; n >= 0; n--) { const f = fx[n]; f.v -= dt * (f.txt ? 0.7 : 1.2); f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; if (f.g) f.vy += f.g * dt; if (f.v <= 0) fx.splice(n, 1); }
  dibujar(tm);
  requestAnimationFrame(bucle);
}
ajustar(); iniciar(false);
if (innerWidth < 600) zoom = 0.85;
requestAnimationFrame(bucle);
