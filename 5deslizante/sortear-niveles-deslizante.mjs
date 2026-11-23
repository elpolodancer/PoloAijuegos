// Ruta: 5deslizante/sortear-niveles-deslizante.mjs
// Herramienta de desarrollo (NO se carga en el juego ni va en sw.js). Ejecutar con:
//   node 5deslizante/sortear-niveles-deslizante.mjs              → muestra las tablas y comprueba las reglas (no escribe nada)
//   node 5deslizante/sortear-niveles-deslizante.mjs --guardar    → además escribe 5deslizante/plan-niveles-deslizante.json
//
// Sortea DE ANTEMANO qué tablero (3×3 a 30×30) y qué dificultad (fácil / normal / difícil) le toca a cada uno de los 3 900 niveles
// (mapa solo de países: 195 países × 20 niveles, 21 nov 2026; antes eran 22 600 con los estados de México).
// No genera tableros: eso lo hace generar-niveles-deslizante.mjs con este plan. Con la misma SEMILLA sale siempre el mismo plan (igual para todos).
//
// REGLAS (acordadas el 21 nov 2026; los números marcados «propuesta» se pueden ajustar aquí abajo):
//   · Dificultad: POR PAÍS (20 niveles cada uno; cambio del 21 nov 2026, antes era por tramos de 100). México (país 1): 20 fáciles. Países 2 a 195: siempre 8 normales;
//     los fáciles bajan de 10 a 5 y los difíciles suben de 2 a 7 (≈ 50/40/10 % → 25/40/35 %). Revueltos dentro del país con semilla fija.
//   · Orden dentro de cada país: de menor a mayor tamaño (a igual tamaño: fácil, normal, difícil). El último nivel de cada país es el más grande de ese país.
//   · México (niveles 1–20): todos 3×3 fáciles (para empezar suave).
//   · Niveles 1–1 700:      tableros de 3×3 a 10×10 como máximo.
//   · Niveles 1 701–3 400:  hasta 15×15 como máximo.
//   · Niveles 3 401–3 900:  además hay una probabilidad creciente (≈ 1 % → ≈ 75 %, curva p^2.5) de tableros de 16×16 a 25×25: casi no se notan en los primeros 5 países de ese tramo y son la mitad del país en los últimos.
//   · 26×26, 27×27, 28×28, 29×29 y 30×30 salen UNA sola vez cada uno, en nivel difícil, dentro de ese último tramo (el 30×30, al final).
//   (Las zonas son las mismas proporciones de antes —44 % · 44 % · 12 %— aplicadas a 3 900 niveles.)
//   · El tamaño crece poco a poco; la dificultad inclina el tamaño (los fáciles salen más chicos y los difíciles más grandes dentro del rango).
import { writeFileSync } from "node:fs";

// ----- Ajustes (todo lo «propuesta» vive aquí) -----
const SEMILLA = 20261121;          // NO cambiar después de publicar: cambiaría los niveles que ya se jugaron
const TOTAL = 3900, POR_TRAMO = 20;   // un tramo = un país (20 niveles)
const PRIMEROS_FACILES = 20;      // México (país 1): sus 20 niveles son todos fáciles y de 3×3 (acordado el 21 nov 2026)
const NORMALES_POR_PAIS = 8;      // normales por país (40 % de 20); los fáciles bajan de 10 a 5 y los difíciles suben de 2 a 7 (50/40/10 → 25/40/35 %)
const FIN_A = 1700, FIN_B = 3400;                       // límites de las tres zonas
const MAX_A = 10, MAX_B = 15;                             // tamaño máximo de las zonas A y B
const CAP_INICIO = 3.4, CAP_FIN_A = 10.5, CAP_FIN_B = 15.5; // «techo» continuo del tamaño (se redondea y se recorta al máximo de la zona)
const PROB_GRANDE_INI = 0.01, PROB_GRANDE_FIN = 0.75, CURVA_GRANDE = 2.5;   // probabilidad de tablero 16–25 en los últimos 25 países: casi nula en los primeros 5 y creciente (curva p^2.5) hasta ~75 % al final
const GRANDE_MIN = 16, GRANDE_MAX = 25;
// 26 a 30: una vez cada uno, en un nivel difícil dentro de su ventana [desde, hasta] (nivel absoluto). El 30×30 es el último difícil del juego.
const ESPECIALES = [
  { n: 26, desde: 3560, hasta: 3640 }, { n: 27, desde: 3641, hasta: 3720 }, { n: 28, desde: 3721, hasta: 3790 },
  { n: 29, desde: 3791, hasta: 3850 }, { n: 30, desde: 3851, hasta: 3900, ultimo: true },
];

// ----- Números al azar con semilla fija -----
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(SEMILLA);
const lerp = (a, b, t) => a + (b - a) * t;

// ----- 1) Dificultad de cada nivel (POR PAÍS: cada país trae su propio reparto, sin picos entre países vecinos) -----
const TRAMOS = TOTAL / POR_TRAMO;                          // 195 países
const dif = new Array(TOTAL);                              // "f" fácil, "n" normal, "d" difícil
const repartoPais = (k) => {                               // [fáciles, normales, difíciles] del país k (0 = México)
  if (k === 0) return [POR_TRAMO, 0, 0];                   // México: todo fácil
  const t = (k - 1) / (TRAMOS - 2);                        // los países 2 a 195 suben parejo de 50/40/10 a 25/40/35
  const f = Math.round(lerp(10, 5, t));
  return [f, NORMALES_POR_PAIS, POR_TRAMO - NORMALES_POR_PAIS - f];
};
for (let k = 0; k < TRAMOS; k++) {
  const [f, n, d] = repartoPais(k);
  const bolsa = [...Array(f).fill("f"), ...Array(n).fill("n"), ...Array(d).fill("d")];
  for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; }
  bolsa.forEach((x, i) => { dif[k * POR_TRAMO + i] = x; });
}

// ----- 2) Los cinco tableros únicos (26 a 30) -----
const especial = new Map();                                // índice → tamaño
for (const e of ESPECIALES) {
  const cand = [];
  for (let n = e.desde; n <= e.hasta; n++) if (dif[n - 1] === "d") cand.push(n);
  if (!cand.length) throw new Error("no hay nivel difícil en la ventana del " + e.n + "×" + e.n);
  const n = e.ultimo ? cand[cand.length - 1] : cand[Math.floor(rng() * cand.length)];
  especial.set(n - 1, e.n);
}

// ----- 3) Tamaño de cada nivel -----
const sesgo = { f: (r) => r * r, n: (r) => r, d: (r) => 1 - (1 - r) * (1 - r) };   // fácil → abajo del rango, difícil → arriba
const tam = new Array(TOTAL);
for (let i = 0; i < TOTAL; i++) {
  const n = i + 1, d = dif[i];
  if (especial.has(i)) { tam[i] = especial.get(i); continue; }
  let t, max, cap;
  if (n <= FIN_A) { t = (n - 1) / (FIN_A - 1); cap = lerp(CAP_INICIO, CAP_FIN_A, t); max = MAX_A; }
  else if (n <= FIN_B) { t = (n - FIN_A - 1) / (FIN_B - FIN_A - 1); cap = lerp(CAP_FIN_A, CAP_FIN_B, t); max = MAX_B; }
  else {
    const p = (n - FIN_B - 1) / (TOTAL - FIN_B - 1);
    if (rng() < lerp(PROB_GRANDE_INI, PROB_GRANDE_FIN, Math.pow(p, CURVA_GRANDE))) {            // tablero grande: 16 a 25, el techo sube con el avance
      const techo = GRANDE_MIN + Math.min(GRANDE_MAX - GRANDE_MIN, Math.floor((GRANDE_MAX - GRANDE_MIN + 1) * p));   // llega al 25 en el último 10 % del tramo
      tam[i] = Math.min(GRANDE_MAX, Math.round(GRANDE_MIN + sesgo[d](rng()) * (techo - GRANDE_MIN)));
      continue;
    }
    cap = CAP_FIN_B; max = MAX_B;
  }
  const lo = Math.max(3, Math.floor(cap / 2));
  tam[i] = Math.max(3, Math.min(max, Math.round(lo + sesgo[d](rng()) * (cap - lo))));
}

// ----- 3b) Orden dentro de cada país: de menor a mayor tamaño (a igual tamaño: fácil, normal, difícil). El último nivel de cada país es su «jefe». -----
const rango = { f: 0, n: 1, d: 2 };
for (let k = 0; k < TRAMOS; k++) {
  const par = [];
  for (let i = k * POR_TRAMO; i < (k + 1) * POR_TRAMO; i++) par.push({ s: tam[i], d: dif[i], e: especial.has(i) });
  par.sort((a, b) => a.s - b.s || rango[a.d] - rango[b.d]);
  par.forEach((p, j) => { tam[k * POR_TRAMO + j] = p.s; dif[k * POR_TRAMO + j] = p.d; });
}
// Los tableros únicos (26 a 30) se vuelven a ubicar por su tamaño (ya quedaron ordenados dentro de su país).
especial.clear();
tam.forEach((s, i) => { if (s >= 26) especial.set(i, s); });

// ----- 4) Comprobación de las reglas -----
let fallos = 0;
const mal = (m) => { fallos++; console.log("✗ " + m); };
for (let i = 0; i < TOTAL; i++) {
  const n = i + 1, s = tam[i];
  if (!Number.isInteger(s) || s < 3 || s > 30) mal("nivel " + n + ": tamaño inválido " + s);
  if (n <= FIN_A && s > MAX_A) mal("nivel " + n + ": " + s + "×" + s + " pasa del 10×10 en los primeros 1 700");
  if (n > FIN_A && n <= FIN_B && s > MAX_B) mal("nivel " + n + ": " + s + "×" + s + " pasa del 15×15 hasta el 3 400");
  if (s >= GRANDE_MIN && n <= FIN_B) mal("nivel " + n + ": tablero de 16 o más antes del nivel 3 401");
}
for (let i = 0; i < PRIMEROS_FACILES; i++) if (dif[i] !== "f" || tam[i] !== 3) mal("el nivel " + (i + 1) + " debe ser un 3×3 fácil");
for (let s = 26; s <= 30; s++) { const c = tam.filter((x) => x === s).length; if (c !== 1) mal("el " + s + "×" + s + " sale " + c + " veces (debe ser 1)"); }
for (const [i] of especial) if (dif[i] !== "d") mal("el nivel " + (i + 1) + " (tablero único) no es difícil");
for (let k = 0; k < TRAMOS; k++) {
  const cuenta = { f: 0, n: 0, d: 0 };
  for (let i = k * POR_TRAMO; i < (k + 1) * POR_TRAMO; i++) cuenta[dif[i]]++;
  const [f, n, d] = repartoPais(k);
  if (cuenta.f !== f || cuenta.n !== n || cuenta.d !== d) mal("el país " + (k + 1) + " no respeta su reparto de dificultad");
  for (let i = k * POR_TRAMO + 1; i < (k + 1) * POR_TRAMO; i++) if (tam[i] < tam[i - 1]) mal("el nivel " + (i + 1) + " es más chico que el anterior dentro de su país");
}
if (tam[TOTAL - 1] !== 30) mal("el último nivel debe ser el 30×30");
for (let s = 3; s <= 30; s++) if (!tam.includes(s)) mal("el tamaño " + s + "×" + s + " no sale nunca");

// ----- 5) Tablas para revisar -----
const pct = (x, t) => (100 * x / t).toFixed(1).padStart(5) + "%";
console.log("PLAN DE " + TOTAL + " NIVELES · semilla " + SEMILLA + "\n");

console.log("Dificultad (fácil / normal / difícil) por país (20 niveles):");
for (const k of [0, 1, 2, 10, 24, 50, 100, 150, 194]) {
  const c = { f: 0, n: 0, d: 0 };
  for (let i = k * POR_TRAMO; i < (k + 1) * POR_TRAMO; i++) c[dif[i]]++;
  console.log("  país " + String(k + 1).padStart(3) + " (niveles " + (k * POR_TRAMO + 1) + "–" + (k + 1) * POR_TRAMO + "): " + c.f + " / " + c.n + " / " + c.d);
}
const tf = dif.filter((x) => x === "f").length, tn = dif.filter((x) => x === "n").length, td = dif.filter((x) => x === "d").length;
console.log("  total: " + tf + " fáciles (" + pct(tf, TOTAL) + "), " + tn + " normales (" + pct(tn, TOTAL) + "), " + td + " difíciles (" + pct(td, TOTAL) + ")\n");

console.log("Cuántos niveles de cada tamaño hay en cada tramo del mapa:");
const bloques = [[1, 500], [501, 1000], [1001, 1500], [1501, 2000], [2001, 2500], [2501, 3000], [3001, 3400], [3401, 3900]];
const tamaños = [...new Set(tam)].sort((a, b) => a - b);
console.log("  " + "niveles".padEnd(14) + tamaños.map((s) => String(s).padStart(5)).join(""));
for (const [a, b] of bloques) {
  const c = {};
  for (let i = a - 1; i < b; i++) c[tam[i]] = (c[tam[i]] || 0) + 1;
  console.log("  " + (a + "–" + b).padEnd(14) + tamaños.map((s) => String(c[s] || "·").padStart(5)).join(""));
}
const totales = {};
tam.forEach((s) => { totales[s] = (totales[s] || 0) + 1; });
console.log("  " + "TOTAL".padEnd(14) + tamaños.map((s) => String(totales[s]).padStart(5)).join("") + "\n");

console.log("Primeros niveles de cada tramo grande (tamaño de los niveles 1, 20, 100, 500, 1000, 1700, 2500, 3400, 3800, 3900):");
console.log("  " + [1, 20, 100, 500, 1000, 1700, 2500, 3400, 3800, 3900].map((n) => n + ": " + tam[n - 1] + "×" + tam[n - 1] + " " + { f: "fácil", n: "normal", d: "difícil" }[dif[n - 1]]).join(" · ") + "\n");

console.log("Los cinco tableros únicos:");
for (const [i, s] of [...especial].sort((a, b) => a[1] - b[1])) console.log("  " + s + "×" + s + " → nivel " + (i + 1) + " (país " + (Math.floor(i / POR_TRAMO) + 1) + ", difícil)");
console.log("\nTamaño medio por dificultad (en cada zona):");
for (const [nombre, a, b] of [["1–1 700", 1, 1700], ["1 701–3 400", 1701, 3400], ["3 401–3 900", 3401, 3900]]) {
  const m = {};
  for (const d of ["f", "n", "d"]) { let s = 0, c = 0; for (let i = a - 1; i < b; i++) if (dif[i] === d) { s += tam[i]; c++; } m[d] = (s / c).toFixed(1); }
  console.log("  " + nombre.padEnd(14) + "fácil " + m.f + " · normal " + m.n + " · difícil " + m.d);
}
console.log("\n" + (fallos ? fallos + " problema(s)" : "✓ Todas las reglas se cumplen"));

// ----- 6) Guardar el plan (solo con --guardar) -----
if (process.argv.includes("--guardar") && !fallos) {
  const plan = { semilla: SEMILLA, total: TOTAL, nota: "tamanos: un carácter por nivel (tamaño en base 36: 3…9, a=10 … u=30). dificultades: f fácil, n normal, d difícil.", tamanos: tam.map((s) => s.toString(36)).join(""), dificultades: dif.join("") };
  writeFileSync(new URL("./plan-niveles-deslizante.json", import.meta.url), JSON.stringify(plan));
  console.log("Guardado: 5deslizante/plan-niveles-deslizante.json");
}
process.exit(fallos ? 1 : 0);
