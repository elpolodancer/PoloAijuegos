// Ruta: 5deslizante/generar-niveles-deslizante.mjs
// Herramienta de desarrollo (NO se carga en el juego ni va en sw.js). Ejecutar con:
//   node 5deslizante/generar-niveles-deslizante.mjs              → genera los primeros 1000 niveles y reescribe NIVELES en niveles-5deslizante.js (para los 3 900: --hasta 3900)
//   node 5deslizante/generar-niveles-deslizante.mjs --hasta 3900 → genera hasta el nivel 3900 (los que ya existen salen IGUAL que antes)
//   node 5deslizante/generar-niveles-deslizante.mjs --probar     → genera y muestra el resumen, sin escribir nada
//
// Lee el plan de plan-niveles-deslizante.json (sale de sortear-niveles-deslizante.mjs --guardar): tamaño y dificultad de cada nivel.
// Cada tablero se arma desde el tablero resuelto con jugadas legales al azar (sin deshacer la anterior), como el modo libre,
// así SIEMPRE tiene solución. Número de jugadas = PASOS[dificultad] × n² (fácil 1.5 · normal 4 · difícil 12).
// En los 3×3 la dificultad es la distancia exacta al tablero resuelto: fácil 10–16, normal 17–22, difícil 23–31 (jugadas de una ficha).
// Los primeros 20 niveles (3×3) suben poco a poco: de 2 a 12 movimientos de distancia (se comprueba con una búsqueda exacta).
// Cada nivel usa su propia semilla (SEMILLA + posición): al agregar niveles nuevos, los que ya existen NO cambian. No hay dos tableros iguales.
// NO cambiar SEMILLA ni PASOS después de publicar: cambiaría los niveles que ya se jugaron.
import { readFileSync, writeFileSync } from "node:fs";

const SEMILLA = 20261122;
const PASOS = { f: 1.5, n: 4, d: 12 };
// En el 3×3 la dificultad se mide con la distancia exacta (jugadas de una ficha; el máximo posible es 31): un tablero solo entra si cae en el rango de su dificultad.
// (Una revoltura larga al azar satura el 3×3: normal y difícil saldrían casi iguales.)
const BANDA3 = { f: [10, 16], n: [17, 22], d: [23, 31] };
const PASOS3 = { f: [10, 8], n: [36, 2], d: [108, 2] };   // [mínimo, cuántos valores]: el número de jugadas varía (si no, la distancia siempre tendría la misma paridad)
const RAMPA = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12];   // distancia exacta (en jugadas de una ficha) de los niveles 1 a 20

const arg = (nombre) => { const i = process.argv.indexOf(nombre); return i >= 0 ? process.argv[i + 1] : null; };
const HASTA = Number(arg("--hasta")) || 1000;
const PROBAR = process.argv.includes("--probar");

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const plan = JSON.parse(readFileSync(new URL("./plan-niveles-deslizante.json", import.meta.url), "utf8"));
if (HASTA > plan.total) throw new Error("el plan solo tiene " + plan.total + " niveles");

// ----- Distancia exacta en el 3×3 (búsqueda desde el tablero resuelto; 181 440 tableros) -----
const vecinos = (n, h) => { const r = [], f = Math.floor(h / n), c = h % n; if (f > 0) r.push(h - n); if (f < n - 1) r.push(h + n); if (c > 0) r.push(h - 1); if (c < n - 1) r.push(h + 1); return r; };
const distancia3 = new Map();
{
  const ini = "123456780";
  distancia3.set(ini, 0);
  let fila = [ini];
  for (let d = 1; fila.length; d++) {
    const sig = [];
    for (const s of fila) {
      const h = s.indexOf("0");
      for (const v of vecinos(3, h)) {
        const a = s.split(""); a[h] = a[v]; a[v] = "0";
        const t = a.join("");
        if (!distancia3.has(t)) { distancia3.set(t, d); sig.push(t); }
      }
    }
    fila = sig;
  }
}

function resoluble(m, a) {
  const f = a.filter(Boolean);
  let inv = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++;
  return m % 2 ? inv % 2 === 0 : (inv + (m - Math.floor(a.indexOf(0) / m))) % 2 === 1;
}
function revolver(n, pasos, rng) {
  const a = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));   // 1, 2 … n²-1, 0
  let h = n * n - 1, antes = -1;
  for (let k = 0; k < pasos; k++) {
    const op = vecinos(n, h).filter((v) => v !== antes);
    const v = op[Math.floor(rng() * op.length)];
    a[h] = a[v]; a[v] = 0; antes = h; h = v;
  }
  return a;
}
const resuelto = (a) => a.every((v, k) => v === (k === a.length - 1 ? 0 : k + 1));

// ----- Generar -----
const vistos = new Set(), niveles = [], dists = { f: [], n: [], d: [] };
for (let i = 0; i < HASTA; i++) {
  const n = parseInt(plan.tamanos[i], 36), d = plan.dificultades[i];
  const base = i < RAMPA.length ? RAMPA[i] : Math.round(PASOS[d] * n * n);
  let fichas = null;
  for (let intento = 0; intento < 5000 && !fichas; intento++) {
    const rng = mulberry32(SEMILLA + i * 1000 + intento);
    const pasos = n === 3 && i >= RAMPA.length ? PASOS3[d][0] + Math.floor(rng() * PASOS3[d][1]) : base;
    const a = revolver(n, pasos, rng);
    const clave = n + ":" + a.join(",");
    if (resuelto(a) || vistos.has(clave) || !resoluble(n, a)) continue;
    if (n === 3) {
      const dist = distancia3.get(a.join(""));
      if (i < RAMPA.length ? dist !== RAMPA[i] : dist < BANDA3[d][0] || dist > BANDA3[d][1]) continue;
    }
    vistos.add(clave); fichas = a;
  }
  if (!fichas) throw new Error("no se pudo generar el nivel " + (i + 1));
  niveles.push({ n, fichas });
  if (n === 3) dists[d].push(distancia3.get(fichas.join("")));
}

// ----- Resumen -----
const cuenta = {};
niveles.forEach((l, i) => { const k = l.n + "×" + l.n + " " + plan.dificultades[i]; cuenta[k] = (cuenta[k] || 0) + 1; });
console.log("Niveles generados: " + niveles.length + " · " + Object.entries(cuenta).map(([k, v]) => k + ": " + v).join(" · "));
for (const [d, nombre] of [["f", "fáciles"], ["n", "normales"], ["d", "difíciles"]]) {
  const v = dists[d].slice().sort((x, y) => x - y);
  if (v.length) console.log("  3×3 " + nombre + " (" + v.length + "): distancia mínima " + v[0] + " · mediana " + v[Math.floor(v.length / 2)] + " · máxima " + v[v.length - 1] + " (jugadas de una ficha)");
}
console.log("  Niveles 1 a 20, distancia: " + niveles.slice(0, 20).map((l) => distancia3.get(l.fichas.join(""))).join(" "));

// ----- Escribir en niveles-5deslizante.js -----
if (!PROBAR) {
  const ruta = new URL("./niveles-5deslizante.js", import.meta.url);
  const texto = readFileSync(ruta, "utf8");
  const lista = "export const NIVELES = [\n" + niveles.map((l, i) => "  { n: " + l.n + ", fichas: [" + l.fichas.join(",") + "] }," + ((i + 1) % 100 === 0 ? " // " + (i + 1) : "")).join("\n") + "\n];";
  const re = /export const NIVELES = \[[\s\S]*?\];/;
  if (!re.test(texto)) throw new Error("no encontré «export const NIVELES = [...]» en niveles-5deslizante.js");
  writeFileSync(ruta, texto.replace(re, () => lista));
  console.log("Escrito: 5deslizante/niveles-5deslizante.js (" + niveles.length + " niveles)");
}
