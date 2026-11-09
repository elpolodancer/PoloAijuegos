// Ruta: zuma/generar-formas-zuma.mjs
// Generador de las 100 bandas (formas del camino). Uso: node zuma/generar-formas-zuma.mjs
// REESCRIBE formas-zuma.js y deja una hoja de miniaturas (vista-formas-zuma.svg y .png) para revisarlas a ojo.
// Es determinista: correrlo dos veces da el mismo archivo. Cada candidata se comprueba con crearTrayecto() real (logica-zuma.js):
//   - largo del camino razonable, entra desde fuera del tablero y nunca vuelve a salirse (margen de 28 px)
//   - deja libre el hueco de la rana (el camino no se acerca a menos de 76 px del centro)
//   - dos tramos lejanos del camino nunca quedan a menos de 44 px (si no, los surcos se encimarían)
//   - las curvas son suaves (radio mínimo ~20 px) para que las bolas no se amontonen
// Las que no pasan se descartan; de las que pasan se toman 100 repartidas entre las familias (una de cada familia, por turnos).
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { crearTrayecto } from "./logica-zuma.js";

const W = 640, H = 480, CX = 320, CY = 240;
const MARGEN = 28, HUB = 76, SEP_MIN = 44, LARGO = [2000, 3900], GIRO_MAX = 0.2;
const TOTAL = 100;
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- Validación ----------
function revisar(cfg) {
  let tr;
  try { tr = crearTrayecto(cfg); } catch (e) { return { ok: false, motivo: "error: " + e.message }; }
  const { largo, pos } = tr;
  if (!(largo >= LARGO[0] && largo <= LARGO[1])) return { ok: false, motivo: "largo " + Math.round(largo) };
  const P = [];
  for (let s = 0; s <= largo; s += 4) { const q = pos(s); P.push({ s, x: q.x, y: q.y }); }
  const f = pos(largo); P.push({ s: largo, x: f.x, y: f.y });
  const p0 = P[0];
  if (!(p0.x < -20 || p0.x > W + 20 || p0.y < -20 || p0.y > H + 20)) return { ok: false, motivo: "la entrada se ve" };
  const dentro = (q) => q.x >= MARGEN - 0.5 && q.x <= W - MARGEN + 0.5 && q.y >= MARGEN - 0.5 && q.y <= H - MARGEN + 0.5;
  let i0 = P.findIndex(dentro);
  if (i0 < 0) return { ok: false, motivo: "nunca entra" };
  for (let i = i0; i < P.length; i++) if (!dentro(P[i])) return { ok: false, motivo: "se sale del tablero en s=" + Math.round(P[i].s) };
  const vis = (q) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;
  for (const q of P) if (vis(q) && Math.hypot(q.x - CX, q.y - CY) < HUB) return { ok: false, motivo: "invade el hueco de la rana" };
  for (let i = 1; i < P.length - 1; i++) {
    const a = Math.atan2(P[i].y - P[i - 1].y, P[i].x - P[i - 1].x), b = Math.atan2(P[i + 1].y - P[i].y, P[i + 1].x - P[i].x);
    let d = Math.abs(b - a); if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > GIRO_MAX && P[i + 1].s - P[i].s > 3) return { ok: false, motivo: "curva muy cerrada" };
  }
  let min = 1e9;
  for (let i = 0; i < P.length; i++) {
    if (!vis(P[i])) continue;
    for (let j = i + 1; j < P.length; j++) {
      if (P[j].s - P[i].s < 120 || !vis(P[j])) continue;
      const d = Math.hypot(P[i].x - P[j].x, P[i].y - P[j].y);
      if (d < min) min = d;
    }
  }
  if (min < SEP_MIN) return { ok: false, motivo: "surcos muy juntos (" + min.toFixed(1) + ")" };
  return { ok: true, largo, sep: min };
}

// ---------- Familias ----------
const fam = { espiral: [], poligono: [], estrella: [], flor: [], serpH: [], serpV: [], onda: [] };
const cand = (f, nombre, icono, trayecto) => fam[f].push({ nombre, icono, trayecto });
const VUELTAS = [3.25, 3, 2.75, 2.5, 2.25, 2, 1.75];

// 1) Espirales (superelipse). Probamos de más a menos vueltas y nos quedamos con la primera que cumple
const INI = [[Math.PI, 1, "arranca por la izquierda"], [0, -1, "arranca por la derecha, al revés"], [Math.PI / 2, 1, "arranca por abajo"], [-Math.PI / 2, -1, "arranca por arriba, al revés"],
  [0, 1, "arranca por la derecha"], [Math.PI, -1, "arranca por la izquierda, al revés"], [-Math.PI / 2, 1, "arranca por arriba"], [Math.PI / 2, -1, "arranca por abajo, al revés"]];
const BASES = [
  ["Espiral elíptica", 2, 290, 208, 105, 84], ["Espiral circular", 2, 208, 208, 84, 84], ["Espiral ovalada", 2, 250, 208, 95, 84],
  ["Espiral redondeada", 3, 290, 208, 105, 84], ["Caracol redondo", 3, 208, 208, 84, 84], ["Espiral cuadrada suave", 4.5, 280, 205, 100, 84],
  ["Caracol cuadrado", 4.5, 208, 208, 84, 84], ["Espiral cuadrada", 7, 280, 205, 100, 84],
];
let k = 0;
for (let pasada = 0; pasada < 3; pasada++) for (const [nombre, n, rx0, ry0, rx1, ry1] of BASES) {
  const [ini, giro, txt] = INI[(k++ * 3 + pasada) % INI.length];
  for (const v of VUELTAS) {
    const t = { cx: CX, cy: CY, rx: [rx0, rx1], ry: [ry0, ry1], vueltas: v, ini: r1(ini * 1000) / 1000, giro };
    if (n !== 2) t.n = n;
    if (revisar(t).ok) { cand("espiral", nombre + " (" + txt + ")", "🌀", t); break; }
  }
}

// 2) Flores y engranajes: espiral con el radio modulado
k = 0;
const FLORES = [[3, .12, "Trébol"], [4, .12, "Flor de 4 pétalos"], [5, .12, "Flor de 5 pétalos"], [6, .1, "Flor de 6 pétalos"], [7, .1, "Flor de 7 pétalos"], [8, .09, "Flor de 8 pétalos"], [9, .08, "Flor de 9 pétalos"],
  [10, .06, "Margarita"], [12, .045, "Engranaje de 12 dientes"], [14, .04, "Engranaje de 14 dientes"], [16, .035, "Engranaje de 16 dientes"], [18, .03, "Engranaje de 18 dientes"], [20, .03, "Engranaje de 20 dientes"],
  [2, .1, "Almendra"], [3, .08, "Triángulo redondeado"], [4, .08, "Cuadro redondeado"]];
for (let pasada = 0; pasada < 2; pasada++) for (const [kk, amp, nombre] of FLORES) {
  const [ini, giro, txt] = INI[(k++ * 5 + pasada * 3) % INI.length];
  for (const v of VUELTAS) {
    const t = { cx: CX, cy: CY, rx: [r1(290 / (1 + amp)), r1(105 / (1 - amp))], ry: [r1(208 / (1 + amp)), r1(84 / (1 - amp))], vueltas: v, ini: r1(ini * 1000) / 1000, giro, mod: [kk, amp] };
    if (revisar(t).ok) { cand("flor", nombre + (pasada ? " (" + txt + ")" : ""), kk >= 12 ? "⚙️" : "🌸", t); break; }
  }
}

// 3) Polígonos en espiral (con las esquinas redondeadas) y estrellas
function poligono({ lados, rot, giro, vueltas, f1, alterna, rho, llenado, rad }) {
  const nV = Math.round(vueltas * lados * (alterna ? 2 : 1)), paso = (2 * Math.PI) / (lados * (alterna ? 2 : 1));
  const crudo = (s) => { const v = []; for (let j = 0; j <= nV; j++) { const e = 1 - (1 - f1) * (j / nV), a = rot + giro * j * paso, r = alterna && j % 2 ? rho : 1; v.push([Math.cos(a) * e * r * s[0], Math.sin(a) * e * r * s[1]]); } return v; };
  const e0 = crudo([1, 1]);
  let mx = 0, my = 0;
  for (const [x, y] of e0.slice(0, lados * (alterna ? 2 : 1) + 1)) { mx = Math.max(mx, Math.abs(x)); my = Math.max(my, Math.abs(y)); }
  const v = crudo([(llenado * 292) / mx, (llenado * 212) / my]).map(([x, y]) => [CX + x, CY + y]);
  const [a, b] = v, l = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (a[0] - b[0]) / l, dy = (a[1] - b[1]) / l;
  let L = 40; while (a[0] + dx * L > -40 && a[0] + dx * L < W + 40 && a[1] + dy * L > -40 && a[1] + dy * L < H + 40 && L < 1500) L += 20;
  return { puntos: [[Math.round(a[0] + dx * L), Math.round(a[1] + dy * L)], ...v.map(([x, y]) => [Math.round(x), Math.round(y)])], radio: rad };
}
const NOMBRE_LADOS = { 4: "Rombo", 5: "Pentágono", 6: "Hexágono", 7: "Heptágono", 8: "Octágono" };
for (const lados of [4, 5, 6, 7, 8]) for (const [rot0, tipo] of [[-Math.PI / 2, "punta arriba"], [-Math.PI / 2 + Math.PI / lados, "base plana"]]) for (const giro of [1, -1]) {
  const nombre = (lados === 4 && tipo === "base plana" ? "Marco" : NOMBRE_LADOS[lados]) + " en espiral (" + tipo + (giro > 0 ? "" : ", al revés") + ")";
  let hecho = false;
  for (const v of [3.5, 3, 2.5, 2, 1.75, 1.5]) { for (const f1 of [0.3, 0.36, 0.42, 0.5, 0.58]) for (const rad of [40, 30]) {
    const t = poligono({ lados, rot: rot0, giro, vueltas: v, f1, alterna: false, llenado: 0.97, rad });
    if (revisar(t).ok) { cand("poligono", nombre, lados >= 8 ? "🛑" : lados === 6 ? "⬢" : lados === 5 ? "⬟" : "🔷", t); hecho = true; break; }
  } if (hecho) break; }
}
for (const puntas of [5, 6, 7, 8, 9, 10]) for (const rho of [0.8, 0.7, 0.62]) for (const giro of [1, -1]) {
  const nombre = "Estrella de " + puntas + " puntas" + (rho > 0.75 ? " suave" : rho < 0.65 ? " afilada" : "") + (giro > 0 ? "" : " (al revés)");
  let hecho = false;
  for (const v of [3, 2.5, 2, 1.75, 1.5]) { for (const f1 of [0.4, 0.46, 0.52, 0.6]) for (const rad of [34, 26]) {
    const t = poligono({ lados: puntas, rot: -Math.PI / 2, giro, vueltas: v, f1, alterna: true, rho, llenado: 0.97, rad });
    if (revisar(t).ok) { cand("estrella", nombre, "⭐", t); hecho = true; break; }
  } if (hecho) break; }
}

// 4) Serpientes alrededor del hueco de la rana (filas arriba y abajo, o columnas a izquierda y derecha) y ondas
function meandro({ eje, a, b, sep, largo, flipL, flipS, onda }) {
  const c = eje === "H" ? CY : CX, Lc = eje === "H" ? CX : CY, hol = HUB + 4 + (onda ? onda.amp : 0);
  const SA = [...Array(a)].map((_, j) => c - hol - (a - 1 - j) * sep), SB = [...Array(b)].map((_, j) => c + hol + j * sep);
  const filas = [...SA, ...SB], l0 = Lc - largo / 2, l1 = Lc + largo / 2, pts = [[l0 - 50, SA[0], 0]];
  let dir = 1;
  filas.forEach((S, r) => {
    const ini = dir > 0 ? l0 : l1, fin = dir > 0 ? l1 : l0;
    if (onda) { // zigzag con curvas amplias: parece una ola
      const m = Math.floor(largo / onda.lambda) * 2 - 1, paso = largo / (m + 1);
      for (let i = 0; i < m; i++) { const L = dir > 0 ? ini + (i + 1) * paso : ini - (i + 1) * paso; pts.push([L, S + (i % 2 ? onda.amp : -onda.amp), 90]); }
    }
    pts.push([fin, S, 25]);
    if (r < filas.length - 1) { pts.push([fin, filas[r + 1], 25]); dir = -dir; }
  });
  pts.shift(); pts.unshift([-50, SA[0]]);
  return { puntos: pts.map(([L, S, rad]) => { const LL = flipL ? 2 * Lc - L : L, SS = flipS ? 2 * c - S : S, x = eje === "H" ? LL : SS, y = eje === "H" ? SS : LL; return rad === undefined ? [Math.round(x), Math.round(y)] : [Math.round(x), Math.round(y), rad]; }), radio: 25 };
}
const FLIPS = [[0, 0, ""], [1, 0, " (espejo)"], [0, 1, " (invertida)"], [1, 1, " (giro 180°)"]];
for (const [fl, fs, txt] of FLIPS) {
  for (const largo of [440, 500, 540]) for (const [a, b] of [[2, 2], [2, 3], [3, 2], [3, 3]]) for (const sep of [50, 54]) {
    const t = meandro({ eje: "H", a, b, sep, largo, flipL: fl, flipS: fs });
    if (revisar(t).ok) cand("serpH", "Serpiente " + a + "+" + b + " filas, " + largo + " px, sep. " + sep + txt, "🐍", t);
  }
  for (const largo of [340, 360, 372]) for (const [a, b] of [[3, 3], [3, 4], [4, 3], [4, 4], [4, 5], [5, 4], [5, 5]]) for (const sep of [48, 50]) {
    const t = meandro({ eje: "V", a, b, sep, largo, flipL: fl, flipS: fs });
    if (revisar(t).ok) cand("serpV", "Serpiente vertical " + a + "+" + b + " columnas, " + largo + " px, sep. " + sep + txt, "🐍", t);
  }
  for (const largo of [440, 500]) for (const [a, b] of [[2, 2], [2, 1], [1, 2]]) for (const [amp, lambda, sep] of [[12, 110, 56], [14, 90, 58], [10, 130, 54]]) {
    const t = meandro({ eje: "H", a, b, sep, largo, flipL: fl, flipS: fs, onda: { amp, lambda } });
    if (revisar(t).ok) cand("onda", "Ola " + a + "+" + b + " filas (amplitud " + amp + ", longitud " + lambda + ")" + txt, "🌊", t);
  }
  for (const largo of [330, 360]) for (const [a, b] of [[3, 3], [3, 4], [4, 3], [4, 4]]) for (const [amp, lambda, sep] of [[12, 110, 56], [14, 90, 58]]) {
    const t = meandro({ eje: "V", a, b, sep, largo, flipL: fl, flipS: fs, onda: { amp, lambda } });
    if (revisar(t).ok) cand("onda", "Ola vertical " + a + "+" + b + " columnas (amplitud " + amp + ", longitud " + lambda + ")" + txt, "🌊", t);
  }
}

// ---------- Selección: una de cada familia por turnos, sin repetir exactamente el mismo camino ----------
const orden = ["espiral", "poligono", "flor", "serpH", "serpV", "onda", "estrella"];
const elegidas = [{ id: "espiral", nombre: "Espiral", icono: "🌀", inicial: true, trayecto: { cx: 320, cy: 240, rx: [290, 105], ry: [208, 82], vueltas: 2.75 } }];
const usados = new Set(["Espiral"]);
const huella = (t) => { const tr = crearTrayecto(t); let s = ""; for (let q = 0; q < tr.largo; q += 90) { const p = tr.pos(q); s += Math.round(p.x / 25) + "," + Math.round(p.y / 25) + ";"; } return s; };
const huellas = new Set([huella(elegidas[0].trayecto)]);
const idx = Object.fromEntries(orden.map((f) => [f, 0]));
// Para que haya variedad dentro de cada familia, se intercalan: primero las candidatas «lejanas» entre sí
const barajar = (arr) => { const o = []; const n = arr.length; for (let i = 0; i < n; i++) o.push(arr[(i * 7) % n === i && n > 1 ? i : (i * 7) % n]); return [...new Set(o)].length === n ? o : arr; };
for (const f of orden) fam[f] = barajar(fam[f]);
let vueltaVacia = 0;
while (elegidas.length < TOTAL && vueltaVacia < orden.length) {
  vueltaVacia = 0;
  for (const f of orden) {
    if (elegidas.length >= TOTAL) break;
    let c;
    while (idx[f] < fam[f].length) { const x = fam[f][idx[f]++]; const h = huella(x.trayecto); if (!huellas.has(h) && !usados.has(x.nombre)) { huellas.add(h); c = x; break; } }
    if (!c) { vueltaVacia++; continue; }
    usados.add(c.nombre);
    elegidas.push({ ...c, inicial: false });
  }
}
console.log("Candidatas válidas por familia:", Object.fromEntries(orden.map((f) => [f, fam[f].length])));
console.log("Elegidas:", elegidas.length);
if (elegidas.length < TOTAL) { console.error("Faltan bandas: solo hay " + elegidas.length); process.exit(1); }

// ids estables a partir del nombre
const quitaAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const ids = new Set();
elegidas.forEach((f, i) => {
  if (i === 0) { ids.add("espiral"); return; }
  let id = quitaAcentos(f.nombre).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  id = String(i + 1).padStart(3, "0") + "-" + id;
  f.id = id; ids.add(id);
});

// ---------- Escribir formas-zuma.js ----------
const js = (o) => JSON.stringify(o).replace(/"(\w+)":/g, "$1: ").replace(/,(?=\S)/g, ", ");
const lineas = elegidas.map((f) => "  { id: " + JSON.stringify(f.id) + ", nombre: " + JSON.stringify(f.nombre) + ", icono: " + JSON.stringify(f.icono) + ", inicial: " + f.inicial + ", trayecto: " + js(f.trayecto) + " },");
const cabecera = `// Ruta: zuma/formas-zuma.js
// ARCHIVO GENERADO por generar-formas-zuma.mjs (node zuma/generar-formas-zuma.mjs): no se edita a mano.
// Formas de la banda (el camino por el que avanzan las esferas): TOTAL_FORMAS = 100. Cada una se comprobó con crearTrayecto() real
// (entra desde fuera, no se sale del tablero, deja libre el hueco de la rana, los surcos no se encimarían y las curvas son suaves).
// Cada forma es: { id, nombre, icono, inicial, trayecto }
//   id        identificador corto y único (se guarda en el progreso del jugador: NO lo cambies después de publicarlo)
//   nombre    nombre que se ve en el modo Infinito
//   icono     emoji del botón en el selector de formas
//   inicial   true = abierta desde el principio (las demás se abren al pasar la ronda 1 de un nivel: el juego las reparte en partes iguales entre los niveles, en el orden de esta lista)
//   trayecto  la forma del camino, tal como la entiende crearTrayecto() de logica-zuma.js:
//               espiral  { cx, cy, rx:[ini,fin], ry:[ini,fin], vueltas, n?, giro?, ini?, mod? }
//               puntos   { puntos:[[x,y,radio?], ...], radio }   (rectas con esquinas redondeadas; el 1.º punto queda fuera del tablero y el último es el hoyo)
// La posición en la lista FORMAS es el número del botón en el selector (la 1.ª es el botón 1, etc.).
// Cómo se reparten entre los niveles lo decide formasDelNivel() de juego-zuma.js (no hace falta tocar nada aquí al añadir niveles).

export const TOTAL_FORMAS = 100;

export const FORMAS = [
`;
const pie = `];

`;
writeFileSync(new URL("./formas-zuma.js", import.meta.url), cabecera + lineas.join("\n") + "\n" + pie);
console.log("Escrito formas-zuma.js");

// ---------- Hoja de miniaturas (SVG y PNG) ----------
const muestras = elegidas.map((f) => { const tr = crearTrayecto(f.trayecto), p = []; for (let s = 0; s <= tr.largo; s += 3) { const q = tr.pos(s); p.push([q.x, q.y]); } const h = tr.pos(tr.largo); return { p, h, largo: tr.largo }; });
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const TW = 200, TH = 150, K = TW / W;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW * 10}" height="${TH * 10}" font-family="system-ui,sans-serif">\n<rect width="100%" height="100%" fill="#e9e4d8"/>\n`;
elegidas.forEach((f, i) => {
  const ox = (i % 10) * TW, oy = Math.floor(i / 10) * TH, m = muestras[i];
  const d = m.p.filter((_, j) => j % 3 === 0).map(([x, y], j) => (j ? "L" : "M") + (ox + x * K).toFixed(1) + " " + (oy + y * K).toFixed(1)).join("");
  svg += `<g><clipPath id="c${i}"><rect x="${ox}" y="${oy}" width="${TW}" height="${TH}"/></clipPath><g clip-path="url(#c${i})"><rect x="${ox + 1}" y="${oy + 1}" width="${TW - 2}" height="${TH - 2}" fill="#6b727b"/>` +
    `<path d="${d}" fill="none" stroke="#13161a" stroke-width="${46 * K}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${ox + CX * K}" cy="${oy + CY * K}" r="${22 * K * 1.3}" fill="#6fae7a"/><circle cx="${ox + m.h[0] * K}" cy="${oy + m.h[1] * K}" r="${27 * K}" fill="#050607" stroke="#c9a227" stroke-width="2"/></g>` +
    `<text x="${ox + 5}" y="${oy + 14}" font-size="13" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${i + 1}</text></g>\n`;
});
svg += "</svg>\n";
writeFileSync(new URL("./vista-formas-zuma.svg", import.meta.url), svg);

// PNG sin dependencias: cada banda se dibuja con discos
const AW = TW * 10, AH = TH * 10, img = Buffer.alloc(AW * AH * 3);
const px = (x, y, c) => { if (x < 0 || y < 0 || x >= AW || y >= AH) return; const o = (y * AW + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
const disco = (cx, cy, r, c, x0, y0, x1, y1) => { for (let y = Math.max(y0, Math.floor(cy - r)); y <= Math.min(y1 - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(x0, Math.floor(cx - r)); x <= Math.min(x1 - 1, Math.ceil(cx + r)); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(x, y, c); };
for (let i = 0; i < AW * AH; i++) { img[i * 3] = 233; img[i * 3 + 1] = 228; img[i * 3 + 2] = 216; }
const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
elegidas.forEach((f, i) => {
  const ox = (i % 10) * TW, oy = Math.floor(i / 10) * TH, m = muestras[i], x0 = ox + 1, y0 = oy + 1, x1 = ox + TW - 1, y1 = oy + TH - 1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px(x, y, [107, 114, 123]);
  for (const [x, y] of m.p) disco(ox + x * K, oy + y * K, 23 * K, [19, 22, 26], x0, y0, x1, y1);
  disco(ox + CX * K, oy + CY * K, 29 * K, [111, 174, 122], x0, y0, x1, y1);
  disco(ox + m.h[0] * K, oy + m.h[1] * K, 27 * K, [201, 162, 39], x0, y0, x1, y1);
  disco(ox + m.h[0] * K, oy + m.h[1] * K, 22 * K, [5, 6, 7], x0, y0, x1, y1);
  String(i + 1).split("").forEach((ch, j) => { const g = DIG[+ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === "1") for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) px(ox + 6 + j * 12 + c * 3 + a, oy + 6 + r * 3 + b, [255, 255, 255]); });
});
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((AW * 3 + 1) * AH);
for (let y = 0; y < AH; y++) img.copy(raw, y * (AW * 3 + 1) + 1, y * AW * 3, (y + 1) * AW * 3);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(AW, 0); ihdr.writeUInt32BE(AH, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(new URL("./vista-formas-zuma.png", import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
console.log("Escritas las vistas previas");
