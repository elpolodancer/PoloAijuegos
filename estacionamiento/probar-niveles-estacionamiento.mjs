// Pruebas del generador. Uso: node probar-niveles-estacionamiento.mjs   (Node 22+, junto a niveles-estacionamiento.js)
import { configNivel, generarNivel, esResoluble, analizar, premioMonedas, DIFICULTADES, TOTAL_NIVELES, TAM_ESTANDAR } from "./niveles-estacionamiento.js";
let fallos = 0;
const mal = (m) => { fallos++; console.log("✗", m); };

// 1) Tamaños: los 10 primeros suben de 6×6 a 10×10; todos los demás son 10×10
const esperados = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
esperados.forEach((t, i) => { if (configNivel(i + 1).tam !== t) mal(`nivel ${i + 1} debería ser ${t}×${t}`); });
for (let n = 11; n <= TOTAL_NIVELES; n++) if (configNivel(n).tam !== TAM_ESTANDAR) { mal(`nivel ${n} no es 10×10`); break; }
console.log("Tamaños: niveles 1–10 = 6,6,7,7,8,8,9,9,10,10 · del 11 al 22 600 = 10×10");

// 2) Dificultad: solo 1 y 2; los 10 primeros siempre medios
const cuenta = { 1: 0, 2: 0 }, cuentaMex = { 1: 0, 2: 0 };
for (let n = 1; n <= TOTAL_NIVELES; n++) {
  const d = configNivel(n).dificultad;
  if (d !== 1 && d !== 2) { mal(`nivel ${n}: dificultad ${d}`); break; }
  cuenta[d]++; if (n <= 3200) cuentaMex[d]++;
  if (n <= 10 && d !== 1) mal(`nivel ${n} debería ser medio`);
}
console.log(`Dificultad: México ${cuentaMex[1]} medios / ${cuentaMex[2]} difíciles · Total ${cuenta[1]} medios / ${cuenta[2]} difíciles (${(cuenta[2] / TOTAL_NIVELES * 100).toFixed(0)} % difíciles)`);

// 3) Monedas
if (premioMonedas(1) !== 20 || premioMonedas(2) !== 35) mal("premios 20 / 35");
for (let n = 1; n <= TOTAL_NIVELES; n++) { const c = configNivel(n); if (c.premio !== (c.dificultad === 1 ? 20 : 35) || c.corazones !== (c.dificultad === 1 ? 15 : 8)) { mal(`nivel ${n}: premio/corazones mal`); break; } }
console.log("Monedas: medio 20 · difícil 35 · Corazones: medio 15 · difícil 8");

// 4) Determinismo
if (JSON.stringify(generarNivel(configNivel(1234))) !== JSON.stringify(generarNivel(configNivel(1234)))) mal("no determinista"); else console.log("Determinista: mismo nivel = mismo tablero");

// 5) Los 10 primeros niveles: todos distintos
const firmas = new Set();
for (let n = 1; n <= 10; n++) { const c = configNivel(n), a = generarNivel(c), an = analizar(c.tam, a); firmas.add(JSON.stringify(a));
  console.log(`  nivel ${n}: ${c.tam}×${c.tam} · ${an.autos} autos · libres ${(an.pctLibres * 100).toFixed(0)} % · cadena más larga ${an.profundidad}`); }
if (firmas.size !== 10) mal("hay niveles iniciales repetidos");

// 6) Todos los niveles: lleno al 100 %, resoluble y que cumpla lo que pide su dificultad
let noRes = 0, noLleno = 0, fuera = 0, max = 0, suma = 0;
const resumen = { 1: { libres: 0, prof: 0, n: 0 }, 2: { libres: 0, prof: 0, n: 0 } };
for (let n = 1; n <= TOTAL_NIVELES; n++) {
  const cfg = configNivel(n), t0 = performance.now(), autos = generarNivel(cfg), ms = performance.now() - t0;
  suma += ms; max = Math.max(max, ms);
  if (!esResoluble(cfg.tam, autos)) noRes++;
  if (autos.reduce((t, c) => t + c.len, 0) !== cfg.tam * cfg.tam) noLleno++;
  const a = analizar(cfg.tam, autos), m = DIFICULTADES[cfg.dificultad];
  if (!(a.pctLibres >= m.minLibres && a.minOla >= m.minOla && a.profundidad <= m.maxProf)) fuera++;
  const r = resumen[cfg.dificultad]; r.libres += a.pctLibres; r.prof += a.profundidad; r.n++;
}
console.log(`Los ${TOTAL_NIVELES} niveles: no resolubles ${noRes} · no 100 % llenos ${noLleno} · fuera de lo que pide su dificultad ${fuera} · media ${(suma / TOTAL_NIVELES).toFixed(2)} ms · máx ${max.toFixed(0)} ms`);
for (const d of [1, 2]) console.log(`  dificultad ${d}: libres al inicio ${(resumen[d].libres / resumen[d].n * 100).toFixed(0)} % · cadena más larga media ${(resumen[d].prof / resumen[d].n).toFixed(1)}`);
if (noRes || noLleno || fuera) fallos++;
console.log(fallos ? `\n${fallos} FALLOS` : "\nTodo correcto");
