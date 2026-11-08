// Ruta: defendercastillo/constructor-mapas-defendercastillo.mjs
// Herramienta de Node (no la carga el juego). Aquí se DISEÑAN los mapas fijos de la pestaña «🔓 Desbloqueados» y se escribe el archivo
// mapas-desbloqueados-defendercastillo.js (GENERADO: no se edita a mano; si quieres cambiar un mapa, cambia su diseño aquí y vuelve a generar).
//   node constructor-mapas-defendercastillo.mjs ver [N]            dibuja el mapa N (o todos) en texto y revisa el diseño (caminos, castillo, obstáculos)
//   node constructor-mapas-defendercastillo.mjs validar [N]        además juega con el bot bueno y el de solo arqueros
//   node constructor-mapas-defendercastillo.mjs calibrar [N]       busca la vida de los enemigos de cada mapa (bot bueno gana con ~95 % → ~72 % de vida) y la guarda
//   node constructor-mapas-defendercastillo.mjs generar            reescribe el archivo de mapas con la calibración ya guardada (sin volver a calibrar)
// Tamaño de cada mapa: de 12 columnas × 18 filas como mínimo a 30 × 30 como máximo (se revisa en «ver»).
// Cada mapa lleva el campo «req»: número de nivel de Michoacán que hay que pasar para abrirlo (por ahora 1 a 10, uno por mapa).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { TORRES, ENEMIGOS, nuevaPartida } from "./logica-defendercastillo.js";
import { oleadasDe } from "./generador-defendercastillo.js";
import { jugarBot } from "./bot-defendercastillo.mjs";

const ARCHIVO = new URL("./mapas-desbloqueados-defendercastillo.js", import.meta.url);
const MIN = { cols: 12, filas: 18 }, MAX = { cols: 30, filas: 30 };

// ---------- Utilidades ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const redondea = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;

// ---------- Trazados (coordenadas en celdas; x.5 = centro de la celda) ----------
// Serpentina horizontal: carriles de izquierda a derecha y de vuelta; el último llega a la columna del castillo (abajo) y baja
function serpH(cols, filas, { paso = 2, y0 = 0.5 } = {}) {
  const ys = [y0];
  while (ys[ys.length - 1] + paso <= filas - 3.5) ys.push(ys[ys.length - 1] + paso);
  const cc = Math.floor((cols - 4) / 2), cx = cc + 1.5, xL = 1.5, xR = cols - 1.5, last = ys.length - 1;
  const pts = [[-0.5, ys[0]]];
  ys.forEach((y, i) => {
    const x = i === last ? cx : i % 2 === 0 ? xR : xL;
    pts.push([x, y]);
    if (i < last) pts.push([x, ys[i + 1]]);
  });
  pts.push([cx, filas - 1.4]);
  return { cols, filas, caminos: [pts], castillo: { c: cc, f: filas - 2, w: 4, h: 2 } };
}
// Dos entradas (izquierda y derecha): una serpentina a cada lado que baja al castillo del centro-abajo
function doble(cols, filas) {
  const cc = Math.floor((cols - 4) / 2), xd = cc + 0.5, xL = 1.5;
  const ys = [0.5];
  while (ys[ys.length - 1] + 2 <= filas - 3.5) ys.push(ys[ys.length - 1] + 2);
  if (ys.length % 2 === 0) ys.pop(); // número impar de carriles: el último termina en la columna del castillo
  const lado = () => {
    const pts = [[-0.5, ys[0]]];
    ys.forEach((y, i) => {
      const x = i % 2 === 0 ? xd : xL;
      pts.push([x, y]);
      if (i < ys.length - 1) pts.push([x, ys[i + 1]]);
    });
    pts.push([xd, filas - 1.4]);
    return pts;
  };
  return { cols, filas, caminos: [lado(), lado().map(([x, y]) => [cols - x, y])], castillo: { c: cc, f: filas - 2, w: 4, h: 2 } };
}
// Tres entradas: una serpentina a la izquierda, otra a la derecha y una al centro (entra por arriba); las tres miden parecido.
// Las de los lados bajan por su borde interior, siguen por la fila de abajo y entran al castillo por los costados; la del centro baja al castillo por arriba.
// «zl» = ancho de la zona de cada lado (en celdas); entre zonas quedan 2 columnas libres.
function tres(cols, filas, zl) {
  const cc = Math.floor((cols - 5) / 2), xa = 1.5, xb = xa + zl, xm0 = xb + 3, xm1 = cols - xm0;
  const ys = [0.5];
  while (ys[ys.length - 1] + 2 <= filas - 3.5) ys.push(ys[ys.length - 1] + 2);
  const impares = ys.length % 2 === 0 ? ys.slice(0, -1) : ys; // los lados terminan a la derecha de su zona: número impar de carriles
  const lado = () => {
    const pts = [[-0.5, impares[0]]];
    impares.forEach((y, i) => {
      const x = i % 2 === 0 ? xb : xa;
      pts.push([x, y]);
      if (i < impares.length - 1) pts.push([x, impares[i + 1]]);
    });
    pts.push([xb, filas - 0.5], [cc + 0.5, filas - 0.5]);
    return pts;
  };
  const medio = [[xm0, -0.5]];
  ys.forEach((y, i) => {
    const x = i === ys.length - 1 ? cols / 2 : i % 2 === 0 ? xm1 : xm0;
    medio.push([i === 0 ? xm0 : medio[medio.length - 1][0], y]);
    medio.push([x, y]);
  });
  medio.push([cols / 2, filas - 1.4]);
  return { cols, filas, caminos: [lado(), lado().map(([x, y]) => [cols - x, y]), dedup(medio)], castillo: { c: cc, f: filas - 2, w: 5, h: 2 } };
}
const dedup = (cam) => cam.filter((p, i) => !i || p[0] !== cam[i - 1][0] || p[1] !== cam[i - 1][1]);
// Espiral hacia adentro: anillos separados por un carril libre (cabe una torre entre dos tramos); el castillo queda en el centro
function espiral(cols, filas) {
  let x0 = 0.5, x1 = cols - 0.5, y0 = 0.5, y1 = filas - 0.5;
  const pts = [[-0.5, y0]];
  for (;;) {
    pts.push([x1, y0], [x1, y1], [x0, y1], [x0, y0 + 2]);
    if (x1 - x0 <= 5) break;
    x0 += 2; x1 -= 2; y0 += 2; y1 -= 2;
  }
  const c = Math.floor(x0) + 1, w = Math.floor(x1) - Math.floor(x0) - 1, f = Math.floor(y0 + 2);
  pts.push([c + 0.5, y0 + 2]);
  return { cols, filas, caminos: [pts], castillo: { c, f, w, h: 2 } };
}
// Transformaciones: cambian por dónde entran los enemigos y dónde queda el castillo
const transponer = (m) => ({ cols: m.filas, filas: m.cols,
  caminos: m.caminos.map((cam) => cam.map(([x, y]) => [y, x])), castillo: { c: m.castillo.f, f: m.castillo.c, w: m.castillo.h, h: m.castillo.w } });
const espejo = (m) => ({ ...m, caminos: m.caminos.map((cam) => cam.map(([x, y]) => [m.cols - x, y])), castillo: { ...m.castillo, c: m.cols - (m.castillo.c + m.castillo.w) } });
const volteo = (m) => ({ ...m, caminos: m.caminos.map((cam) => cam.map(([x, y]) => [x, m.filas - y])), castillo: { ...m.castillo, f: m.filas - (m.castillo.f + m.castillo.h) } });

// ---------- Los mapas ----------
// torres: las que se ofrecen · enemigos: los que pueden salir (los nuevos pesan más al repartir) · nW: oleadas · jefe: cierra la última oleada
const TODAS = ["arquero", "canon", "mago", "ballesta", "hielo", "mina", "cuartel", "rayos", "veneno", "mortero"];
const E = [
  ["goblin", "lobo"],                                                          // 1
  ["goblin", "lobo", "orco"],                                                  // 2
  ["goblin", "lobo", "orco", "murcielago"],                                    // 3
  ["goblin", "lobo", "orco", "murcielago", "esqueleto"],                       // 4
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana"],              // 5
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana", "slime", "caballero"], // 6
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana", "slime", "caballero", "brujo"], // 7
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana", "slime", "caballero", "brujo", "fantasma", "jinete"], // 8
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana", "slime", "caballero", "brujo", "fantasma", "jinete", "golem", "ogro"], // 9
  ["goblin", "lobo", "orco", "murcielago", "esqueleto", "arana", "slime", "caballero", "brujo", "fantasma", "jinete", "golem", "ogro"], // 10
];
export const DISENOS = [
  { nombre: "Valle tranquilo", trazado: () => serpH(12, 18), nW: 12 },
  { nombre: "Camino del río", trazado: () => transponer(serpH(20, 14)), nW: 12 },
  { nombre: "Espiral del dragón", trazado: () => espiral(16, 22), nW: 12 },
  { nombre: "Dos puertas", trazado: () => doble(18, 24), nW: 12 },
  { nombre: "Laberinto del bosque", trazado: () => volteo(espejo(serpH(20, 20, { paso: 3 }))), nW: 12, jefe: ["trollJefe", 1] },
  { nombre: "Tres entradas", trazado: () => tres(23, 26, 4), nW: 12, miniJefe: true },
  { nombre: "Gran espiral", trazado: () => espejo(espiral(24, 28)), nW: 12, miniJefe: true },
  { nombre: "Cruce de caminos", trazado: () => transponer(doble(28, 26)), nW: 12, miniJefe: true, jefe: ["trollJefe", 2] },
  { nombre: "Fortaleza de tres puertas", trazado: () => tres(29, 28, 6), nW: 12, miniJefe: true },
  { nombre: "El gran castillo", trazado: () => espiral(30, 30), nW: 12, miniJefe: true, jefe: ["dragon", 2] },
].map((d, i) => ({
  ...d, n: i + 1, id: "D" + (i + 1), req: i + 1,
  torres: TODAS.slice(0, Math.min(10, 2 + i)),   // 2 torres en el primero y una nueva por mapa hasta tener las 10
  enemigos: E[i],
  dificultad: i < 2 ? "Fácil" : i < 5 ? "Media" : i < 8 ? "Difícil" : "Muy difícil",
}));

// ---------- Armar un mapa (sin oleadas) ----------
function armar(d) {
  const m = d.trazado();
  const nivel = {
    id: d.id, n: d.n, region: "Desbloqueados", nombre: d.nombre, dificultad: d.dificultad, req: d.req, semilla: 520000 + d.n,
    cols: m.cols, filas: m.filas, oroInicial: 250 + (d.n - 1) * 25, vidaCastillo: 100, castillo: m.castillo, obstaculos: [],
  };
  if (m.caminos.length === 1) nivel.camino = m.caminos[0]; else nivel.caminos = m.caminos;
  // obstáculos: árboles de 20 monedas junto a las curvas del camino (lugares estratégicos) y el resto repartido
  const rng = mulberry32(nivel.semilla);
  const ent = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const bloq = nuevaPartida({ ...nivel, oleadas: [] }).mapa.bloq;
  const libre = (c, f) => c >= 0 && c < nivel.cols && f >= 0 && f < nivel.filas && !bloq[f][c];
  const usado = new Set();
  const poner = (c, f, e) => { usado.add(c + "," + f); nivel.obstaculos.push([c, f, e]); };
  const esquinas = [];
  for (const cam of m.caminos) for (let i = 1; i < cam.length - 1; i++) esquinas.push([Math.floor(cam[i][0]), Math.floor(cam[i][1])]);
  const estrategicas = [];
  for (const [ec, ef] of esquinas) for (let dc = -1; dc <= 1; dc++) for (let df = -1; df <= 1; df++) {
    const c = ec + dc, f = ef + df;
    if (libre(c, f) && !estrategicas.some((q) => q[0] === c && q[1] === f)) estrategicas.push([c, f]);
  }
  const area = nivel.cols * nivel.filas;
  const k = Math.min(estrategicas.length, 3 + Math.floor(area / 200) + ent(0, 2));
  for (let i = 0; i < k; i++) { const [c, f] = estrategicas.splice(Math.floor(rng() * estrategicas.length), 1)[0]; poner(c, f, rng() < 0.5 ? "🌲" : "🌳"); }
  const total = Math.round(area * 0.06) + ent(0, 6);
  for (let tries = 0; nivel.obstaculos.length < total && tries < 4000; tries++) {
    const c = ent(0, nivel.cols - 1), f = ent(0, nivel.filas - 1);
    if (!libre(c, f) || usado.has(c + "," + f)) continue;
    poner(c, f, rng() < 0.28 ? "🪨" : rng() < 0.5 ? "🌲" : "🌳");
  }
  nivel.obstaculos.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  nivel.torres = d.torres;
  const antes = d.n > 1 ? DISENOS[d.n - 2] : { torres: [], enemigos: [] };
  nivel.nuevas = { torres: d.torres.filter((t) => !antes.torres.includes(t)), enemigos: d.enemigos.filter((t) => !antes.enemigos.includes(t)) };
  nivel.vuelan = d.enemigos.includes("murcielago"); // dibuja la línea punteada por donde vuelan
  return nivel;
}
// Las oleadas dependen de la vida calibrada: con la misma semilla y la misma calibración siempre salen iguales
function conOleadas(d, calib) {
  const nivel = armar(d);
  const nuevos = nivel.nuevas.enemigos;
  nivel.oleadas = oleadasDe(d.n, calib, mulberry32(nivel.semilla + 1), { nW: d.nW, enemigos: d.enemigos, nuevos, miniJefe: !!d.miniJefe, jefe: d.jefe || null });
  nivel.calib = calib;
  return nivel;
}

// ---------- Revisión del diseño ----------
function celdasDe(cam, cols, filas) { // celdas de cada tramo (recortadas al mapa)
  return cam.slice(0, -1).map(([c1, f1], i) => {
    const [c2, f2] = cam[i + 1], r = [];
    for (let f = Math.max(0, Math.floor(Math.min(f1, f2))); f <= Math.min(filas - 1, Math.floor(Math.max(f1, f2))); f++)
      for (let c = Math.max(0, Math.floor(Math.min(c1, c2))); c <= Math.min(cols - 1, Math.floor(Math.max(c1, c2))); c++) r.push([c, f]);
    return r;
  });
}
function revisar(v) {
  const err = [], caminos = v.caminos || [v.camino], k = v.castillo;
  if (v.cols < MIN.cols || v.filas < MIN.filas || v.cols > MAX.cols || v.filas > MAX.filas) err.push("tamaño " + v.cols + "×" + v.filas + " fuera de " + MIN.cols + "×" + MIN.filas + " a " + MAX.cols + "×" + MAX.filas);
  if (k.c < 0 || k.f < 0 || k.c + k.w > v.cols || k.f + k.h > v.filas) err.push("castillo fuera del mapa");
  const enCastillo = (c, f) => c >= k.c && c < k.c + k.w && f >= k.f && f < k.f + k.h;
  const duenos = new Map(); // celda → [ruta, tramo]
  caminos.forEach((cam, r) => {
    const [fx, fy] = cam[0], [lx, ly] = cam[cam.length - 1];
    if (!(fx < 0 || fx > v.cols || fy < 0 || fy > v.filas)) err.push("ruta " + r + ": la entrada no está fuera del mapa");
    if (lx < k.c || lx >= k.c + k.w || ly < k.f || ly >= k.f + k.h) err.push("ruta " + r + ": no termina dentro del castillo");
    for (let i = 0; i < cam.length - 1; i++) if (cam[i][0] !== cam[i + 1][0] && cam[i][1] !== cam[i + 1][1]) err.push("ruta " + r + ": tramo en diagonal");
    celdasDe(cam, v.cols, v.filas).forEach((cs, t) => cs.forEach(([c, f]) => {
      if (enCastillo(c, f)) return;
      const key = c + "," + f, o = duenos.get(key);
      if (o && (o[0] !== r || Math.abs(o[1] - t) > 1)) err.push("caminos que se cruzan en " + key);
      if (!o) duenos.set(key, [r, t]);
    }));
  });
  // caminos pegados: dos tramos distintos que se tocan por un lado no dejan lugar para una torre en medio
  for (const [key, [r, t]] of duenos) {
    const [c, f] = key.split(",").map(Number);
    for (const [dc, df] of [[1, 0], [0, 1]]) {
      const o = duenos.get(c + dc + "," + (f + df));
      if (o && (o[0] !== r || Math.abs(o[1] - t) > 1)) err.push("caminos pegados en " + key);
    }
  }
  const bloqCamino = nuevaPartida({ ...v, obstaculos: [] }).mapa.bloq;
  for (const [c, f] of v.obstaculos) {
    if (c < 0 || c >= v.cols || f < 0 || f >= v.filas) err.push("obstáculo fuera del mapa");
    else if (bloqCamino[f][c]) err.push("obstáculo sobre camino/castillo " + c + "," + f);
  }
  const cerca = v.obstaculos.filter((o) => o[2] !== "🪨" && [-1, 0, 1].some((dc) => [-1, 0, 1].some((df) => bloqCamino[o[1] + df] && bloqCamino[o[1] + df][o[0] + dc]))).length;
  if (cerca < 3) err.push("faltan árboles de 20 monedas junto al camino (" + cerca + ")");
  const libres = nuevaPartida({ ...v }).mapa.bloq.flat().filter((x) => !x).length;
  if (libres < 40) err.push("pocos lugares para construir: " + libres);
  return { err: [...new Set(err)], libres, cerca };
}
function dibujar(v) {
  const g = Array.from({ length: v.filas }, () => Array(v.cols).fill("·"));
  const caminos = v.caminos || [v.camino];
  caminos.forEach((cam, r) => celdasDe(cam, v.cols, v.filas).forEach((cs) => cs.forEach(([c, f]) => (g[f][c] = String(r + 1)))));
  const k = v.castillo;
  for (let f = k.f; f < k.f + k.h; f++) for (let c = k.c; c < k.c + k.w; c++) g[f][c] = "C";
  for (const [c, f, e] of v.obstaculos) g[f][c] = e === "🪨" ? "R" : "T";
  return g.map((fila) => fila.join(" ")).join("\n");
}
function largoRuta(v) { return (v.caminos || [v.camino]).map((cam) => cam.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - cam[i][0]) + Math.abs(p[1] - cam[i][1]), 0)); }

// ---------- Calibración (misma idea que bot-defendercastillo.mjs: el bot bueno gana terminando cerca del objetivo) ----------
// 95 % de vida en el primer mapa y ~72 % en el 10.º; el último (jefe) un poco más duro
const objetivo = (n) => 0.95 - (0.23 * (n - 1)) / 9 - (n === 10 ? 0.05 : 0);
function calibrarMapa(d) {
  const T = objetivo(d.n), juego = (c) => jugarBot(conOleadas(d, c));
  let lo = Math.log(0.05), hi = Math.log(12);
  for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2, r = juego(Math.exp(mid)); if (r.score >= T) lo = mid; else hi = mid; }
  let c = Math.exp(lo), mejor = c, md = 9;
  for (let i = 0; i < 24; i++) {
    const r = juego(c), dd = Math.abs(r.score - T);
    if (dd < md) { md = dd; mejor = c; }
    if (r.ganado && r.vidaFrac >= T - 0.1 && r.vidaFrac <= T + 0.12) { mejor = c; break; }
    c *= r.score > T ? 1.05 : 0.93;
  }
  return redondea(mejor);
}

// ---------- Archivo de mapas ----------
async function calibGuardada() {
  if (!existsSync(ARCHIVO)) return {};
  try { const m = await import(pathToFileURL(ARCHIVO.pathname).href + "?v=" + Date.now()); return Object.fromEntries(m.MAPAS_DESBLOQUEADOS.map((x) => [x.id, x.calib])); } catch (e) { return {}; }
}
function escribir(mapas) {
  const linea = (o) => JSON.stringify(o);
  const cuerpo = mapas.map((v) => {
    const { oleadas, obstaculos, ...resto } = v;
    const cab = JSON.stringify(resto).slice(0, -1);
    return "  " + cab + ",\n    \"obstaculos\": [" + obstaculos.map(linea).join(",") + "],\n    \"oleadas\": [\n" + oleadas.map((o) => "      " + linea(o)).join(",\n") + "\n    ]\n  }";
  });
  const txt = "// Ruta: defendercastillo/mapas-desbloqueados-defendercastillo.js\n" +
    "// ARCHIVO GENERADO por constructor-mapas-defendercastillo.mjs (node constructor-mapas-defendercastillo.mjs calibrar / generar): no se edita a mano.\n" +
    "// Mapas fijos de la pestaña «🔓 Desbloqueados» (por dentro la pestaña sigue llamándose «clasico»). Tamaño de 12×18 a 30×30 celdas.\n" +
    "// «req» = nivel de Michoacán que hay que pasar para abrir el mapa; «calib» = multiplicador de vida de los enemigos (ya incluido en las oleadas).\n" +
    "export const MAPAS_DESBLOQUEADOS = [\n" + cuerpo.join(",\n") + "\n];\n";
  writeFileSync(ARCHIVO, txt);
}

// ---------- Línea de comandos ----------
const esPrincipal = process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href;
if (esPrincipal) {
  const [, , cmd, a1] = process.argv, sel = a1 ? DISENOS.filter((d) => d.n === +a1) : DISENOS;
  const guardada = await calibGuardada();
  const calibDe = (d) => guardada[d.id] || 1.5;
  if (cmd === "ver") {
    for (const d of sel) {
      const v = conOleadas(d, calibDe(d)), r = revisar(v);
      console.log("\n=== " + v.id + " · " + v.nombre + " · " + v.cols + "×" + v.filas + " · " + v.dificultad + " · rutas: " + largoRuta(v).join(" + ") + " celdas · " + v.oleadas.length + " oleadas · lugares libres " + r.libres);
      if (a1) console.log(dibujar(v));
      console.log(r.err.length ? "❌ " + r.err.join("; ") : "✅ diseño correcto");
    }
  } else if (cmd === "validar") {
    const mal = [];
    for (const d of sel) {
      const v = conOleadas(d, calibDe(d)), r = revisar(v), b = jugarBot(v), q = jugarBot(conOleadas(d, calibDe(d)), "arqueros");
      const prob = [...r.err];
      if (!b.ganado) prob.push("el bot bueno pierde (oleada " + b.oleada + "/" + b.nW + ")");
      else if (b.vidaFrac < 0.2) prob.push("vida final por debajo de 20 %: " + b.vida);
      console.log(v.id, "calib", v.calib, "→ bueno:", b.ganado ? "gana con " + b.vida : "pierde", "· arqueros:", q.ganado ? "gana con " + q.vida : "pierde", prob.length ? "❌ " + prob.join("; ") : "✅");
      if (prob.length) mal.push(d.n);
    }
    console.log("\nMapas con problemas:", mal.length ? mal.join(", ") : "ninguno ✅");
  } else if (cmd === "calibrar") {
    for (const d of sel) {
      const t0 = Date.now(), c = calibrarMapa(d), r = jugarBot(conOleadas(d, c));
      guardada[d.id] = c;
      console.log(d.id, "calib", c, "→ gana:", r.ganado, "vida", r.vida, "torres", r.torres, "(" + Math.round((Date.now() - t0) / 1000) + " s)");
      escribir(DISENOS.map((x) => conOleadas(x, calibDe(x)))); // guarda después de cada mapa
    }
  } else if (cmd === "generar") {
    escribir(DISENOS.map((x) => conOleadas(x, calibDe(x))));
    console.log("Escrito", ARCHIVO.pathname);
  } else console.log("Uso: node constructor-mapas-defendercastillo.mjs ver [N] | validar [N] | calibrar [N] | generar");
}
