// Ruta: buscapalabras/bot-buscapalabras.mjs
// BOT DE COMPROBACIÓN de los niveles de Buscapalabras. Se corre en la computadora (Node), NO en el navegador.
//   node bot-buscapalabras.mjs                 → comprueba los niveles 1 a 3200 (NIVELES_HECHOS)
//   node bot-buscapalabras.mjs 1 100           → solo del 1 al 100
//   node bot-buscapalabras.mjs 1 3200 --guardar → además guarda la «huella» (huella-niveles.json) para detectar si algún nivel cambia después
// (La carpeta buscapalabras/ lleva un package.json con { "type": "module" } para que Node entienda los import.)
//
// El bot NO confía en el generador: lee cada nivel terminado (tablero + lista de palabras) y lo JUEGA por su cuenta.
// Su búsqueda es un BACKTRACKING propio: para cada palabra recorre todas las casillas de inicio y las 8 direcciones, avanzando letra por letra
// y volviendo atrás en cuanto una letra no coincide. Qué comprueba de cada nivel:
//   1. Forma: tablero cuadrado de tam×tam, solo letras A-Z; palabras sin repetir, de 4 a 12 letras, que caben; ninguna dentro de otra (ni al revés).
//   2. Se puede pasar: cada palabra se encuentra en el tablero usando SOLO las direcciones de su dificultad.
//   3. Sin ambigüedad: cada palabra está exactamente UNA vez en las 8 direcciones (así la selección del jugador es única).
//   4. Juego simulado: arrastrando del primer al último cuadro de cada hallazgo se lee justo la palabra (como hará el jugador con el dedo).
//   5. La posición que guardó el generador coincide con lo que encontró el bot.
//   6. Coherencia: tipo ↔ dificultad (fácil 1-2, medio 3, difícil 4-5), tiempo de par razonable, y el mismo nivel sale igual al generarlo dos veces.
//   7. Por etapa: cuántos niveles fáciles/medios/difíciles hay = el plan de config (nivelesPorTipo); el nivel 1 es fácil y el 100 difícil.
// Termina con código 1 si algo falla (para poder usarlo antes de publicar).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { nivel, NIVELES_HECHOS } from "./generador-buscapalabras.js";
import { NIVELES_POR_ETAPA, TOTAL_ETAPAS, nivelesPorTipo, DIFICULTADES } from "./config-buscapalabras.js";
import { parSegundos } from "./economia-buscapalabras.js";
import { descartadas } from "./palabras-buscapalabras.js";

const args = process.argv.slice(2), nums = args.filter((a) => /^\d+$/.test(a)).map(Number), guardar = args.includes("--guardar");
const desde = nums[0] || 1, hasta = nums[1] || (nums[0] ? nums[0] : NIVELES_HECHOS);
const V = { E: [0, 1], S: [1, 0], W: [0, -1], N: [-1, 0], SE: [1, 1], NE: [-1, 1], SW: [1, -1], NW: [-1, -1] };
const TODAS = Object.keys(V);

// Backtracking: ¿se puede seguir escribiendo la palabra desde (f, c) en la dirección d, a partir de la letra j?
function seguir(g, tam, w, f, c, d, j) {
  if (j === w.length) return true;
  if (f < 0 || c < 0 || f >= tam || c >= tam || g[f][c] !== w[j]) return false; // letra distinta o fuera del tablero: vuelve atrás
  return seguir(g, tam, w, f + V[d][0], c + V[d][1], d, j + 1);
}
// Todas las apariciones de la palabra, sin contar dos veces el mismo segmento (leído al derecho y al revés)
function buscar(g, tam, w, dirs) {
  const r = new Map();
  for (let f = 0; f < tam; f++) for (let c = 0; c < tam; c++) for (const d of dirs) {
    if (!seguir(g, tam, w, f, c, d, 0)) continue;
    const f2 = f + V[d][0] * (w.length - 1), c2 = c + V[d][1] * (w.length - 1);
    const a = f * tam + c, b = f2 * tam + c2, clave = Math.min(a, b) + "-" + Math.max(a, b);
    if (!r.has(clave)) r.set(clave, { f, c, d, f2, c2 });
  }
  return [...r.values()];
}
// El jugador arrastra de (f, c) a (f2, c2): se lee la línea recta que hay entre los dos cuadros
function arrastrar(g, f, c, f2, c2) {
  const df = Math.sign(f2 - f), dc = Math.sign(c2 - c), largo = Math.max(Math.abs(f2 - f), Math.abs(c2 - c));
  if (Math.abs(f2 - f) !== 0 && Math.abs(c2 - c) !== 0 && Math.abs(f2 - f) !== Math.abs(c2 - c)) return null; // no es línea recta
  let s = ""; for (let j = 0; j <= largo; j++) s += g[f + df * j][c + dc * j];
  return s;
}
const alReves = (s) => [...s].reverse().join("");

function revisar(v) {
  const e = [], { grid: g, tam, palabras, dif, tipo } = v;
  const cfg = DIFICULTADES.find((d) => d.id === dif);
  if (!cfg) return ["dificultad desconocida " + dif];
  // 1. Forma
  if (!Array.isArray(g) || g.length !== tam || g.some((fila) => typeof fila !== "string" || fila.length !== tam || !/^[A-Z]+$/.test(fila))) return ["tablero mal formado"];
  if (new Set(palabras).size !== palabras.length) e.push("palabras repetidas");
  for (const w of palabras) {
    if (!/^[A-Z]{4,12}$/.test(w)) e.push("palabra inválida " + w);
    if (w.length > tam) e.push(w + " no cabe en el tablero");
  }
  for (let a = 0; a < palabras.length; a++) for (let b = a + 1; b < palabras.length; b++) {
    const x = palabras[a], y = palabras[b];
    if (x.includes(y) || y.includes(x) || x.includes(alReves(y)) || alReves(x).includes(y)) e.push(x + " y " + y + " se contienen");
  }
  if (palabras.length < 4) e.push("muy pocas palabras");
  // 6. Coherencia (tipo, tiempo de par)
  const okTipo = tipo === "facil" ? dif <= 2 : tipo === "medio" ? dif === 3 : tipo === "dificil" ? dif >= 4 : false;
  if (!okTipo) e.push("el tipo " + tipo + " no va con dificultad " + dif);
  if (v.parSeg !== parSegundos({ palabras: palabras.length, dif, tam })) e.push("tiempo de par distinto al de economia");
  if (!(v.parSeg >= 10 && v.parSeg <= 1200)) e.push("tiempo de par raro: " + v.parSeg);
  // 2, 3, 4, 5. Jugar el nivel palabra por palabra
  for (const w of palabras) {
    const permitidas = buscar(g, tam, w, cfg.dirs), todas = buscar(g, tam, w, TODAS);
    if (permitidas.length === 0) { e.push(w + ": NO se puede encontrar con las direcciones de la dificultad " + dif); continue; }
    if (todas.length !== 1) e.push(w + ": aparece " + todas.length + " veces en el tablero");
    const h = permitidas[0];
    const leido = arrastrar(g, h.f, h.c, h.f2, h.c2);
    if (leido !== w) e.push(w + ": al arrastrar se lee «" + leido + "»");
    const guardada = (v.pos || []).find((p) => p.p === w);
    if (!guardada) e.push(w + ": falta su posición guardada");
    else {
      const ok = permitidas.some((x) => x.f === guardada.f && x.c === guardada.c && x.d === guardada.d);
      if (!ok) e.push(w + ": la posición guardada no coincide con el tablero");
      if (!cfg.dirs.includes(guardada.d)) e.push(w + ": dirección " + guardada.d + " no permitida en dificultad " + dif);
    }
  }
  if ((v.pos || []).length !== palabras.length) e.push("hay " + (v.pos || []).length + " posiciones y " + palabras.length + " palabras");
  return e;
}

// ----- Corrida -----
const fallos = [], porTipo = { facil: 0, medio: 0, dificil: 0 }, porTam = {}, porDif = {}, tiposEtapa = new Map();
let huella = 2166136261, maxMs = 0, t0 = Date.now(), jugados = 0;
for (let n = desde; n <= hasta; n++) {
  let v, v2;
  const t1 = Date.now();
  try { v = nivel(n); v2 = nivel(n); } catch (err) { fallos.push([n, [String(err.message)]]); continue; }
  maxMs = Math.max(maxMs, Date.now() - t1);
  const e = revisar(v);
  if (JSON.stringify(v) !== JSON.stringify(v2)) e.push("el nivel NO sale igual al generarlo dos veces");
  if (e.length) fallos.push([n, e]);
  jugados++;
  porTipo[v.tipo]++; porTam[v.tam] = (porTam[v.tam] || 0) + 1; porDif[v.dif] = (porDif[v.dif] || 0) + 1;
  if (!tiposEtapa.has(v.etapa)) tiposEtapa.set(v.etapa, []);
  tiposEtapa.get(v.etapa)[v.k - 1] = v.tipo;
  for (const ch of JSON.stringify([v.grid, v.palabras, v.pos])) { huella ^= ch.charCodeAt(0); huella = Math.imul(huella, 16777619) >>> 0; }
}
// 7. Por etapa (solo las etapas completas dentro del rango)
for (const [i, lista] of tiposEtapa) {
  if (lista.length !== NIVELES_POR_ETAPA || lista.some((x) => !x)) continue;
  const esperado = nivelesPorTipo(i), real = { facil: 0, medio: 0, dificil: 0 };
  for (const t of lista) real[t]++;
  for (const t of Object.keys(real)) if (real[t] !== esperado[t]) fallos.push(["etapa " + (i + 1), ["tipo " + t + ": hay " + real[t] + " y el plan pide " + esperado[t]]]);
  if (lista[0] !== "facil") fallos.push(["etapa " + (i + 1), ["el nivel 1 no es fácil"]]);
  if (lista[NIVELES_POR_ETAPA - 1] !== "dificil") fallos.push(["etapa " + (i + 1), ["el nivel 100 no es difícil"]]);
}

const huellaTxt = huella.toString(16).padStart(8, "0");
console.log("Niveles revisados: " + jugados + " (del " + desde + " al " + hasta + ") en " + ((Date.now() - t0) / 1000).toFixed(1) + " s · el más lento: " + maxMs + " ms");
console.log("Fáciles " + porTipo.facil + " · medios " + porTipo.medio + " · difíciles " + porTipo.dificil + " (" + Object.values(porTipo).map((x) => (100 * x / (jugados || 1)).toFixed(1) + "%").join(" / ") + ")");
console.log("Por dificultad: " + Object.entries(porDif).map(([k, x]) => k + "→" + x).join(" · "));
console.log("Por tablero: " + Object.entries(porTam).map(([k, x]) => k + "×" + k + "→" + x).join(" · "));
if (descartadas.length) console.log("Palabras del banco descartadas (formato): " + descartadas.join(", "));
console.log("Huella: " + huellaTxt);
const RUTA = new URL("./huella-niveles.json", import.meta.url);
if (guardar) { writeFileSync(RUTA, JSON.stringify({ desde, hasta, huella: huellaTxt }, null, 1) + "\n"); console.log("Huella guardada en huella-niveles.json"); }
else if (existsSync(RUTA)) {
  try {
    const h = JSON.parse(readFileSync(RUTA, "utf8"));
    if (h.desde === desde && h.hasta === hasta) { console.log(h.huella === huellaTxt ? "✅ La huella coincide con la guardada: los niveles no han cambiado." : "⚠️ La huella es DISTINTA a la guardada (" + h.huella + "): algún nivel cambió."); if (h.huella !== huellaTxt) fallos.push(["huella", ["los niveles ya no son los mismos que cuando se guardó la huella"]]); }
  } catch (err) {}
}
if (fallos.length) {
  console.log("\n❌ " + fallos.length + " problema(s):");
  for (const [n, e] of fallos.slice(0, 30)) console.log("  nivel " + n + ": " + e.join("; "));
  if (fallos.length > 30) console.log("  … y " + (fallos.length - 30) + " más");
  process.exit(1);
}
console.log("✅ Todos los niveles son jugables, tienen solución y cada palabra aparece una sola vez.");
