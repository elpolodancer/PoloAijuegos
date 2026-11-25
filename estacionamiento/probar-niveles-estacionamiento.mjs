// Pruebas del generador. Uso: node probar-niveles-estacionamiento.mjs   (Node 22+, junto a niveles-estacionamiento.js)
import { configNivel, configLibre, TAMS_LIBRE, generarNivel, esResoluble, analizar, premioMonedas, DIFICULTADES, TOTAL_NIVELES, NIVELES_POR_ETAPA, PAISES, TAM_ESTANDAR } from "./niveles-estacionamiento.js";
import { dificultadSorteada } from "./dificultades-estacionamiento.js";
let fallos = 0;
const mal = (m) => { fallos++; console.log("✗", m); };

// 0) Numeración: 195 países × 20 niveles = 3 900 (México = país 1 = niveles 1–20) y coincide con el mapa compartido
if (TOTAL_NIVELES !== 3900 || PAISES !== 195 || NIVELES_POR_ETAPA !== 20) mal("la numeración debe ser 195 países × 20 = 3 900");
{
  const a = configNivel(1), b = configNivel(20), c = configNivel(21), z = configNivel(3900);
  if (a.etapa !== 0 || a.k !== 1 || b.etapa !== 0 || b.k !== 20 || c.etapa !== 1 || c.k !== 1 || z.etapa !== 194 || z.k !== 20) mal("etapa/k mal calculados");
  for (const x of [0, 3901, -1, NaN]) { let lanzo = false; try { configNivel(x); } catch (e) { lanzo = e instanceof RangeError; } if (!lanzo) mal("configNivel(" + x + ") debería lanzar RangeError"); }
  try {
    const { crearEtapas } = await import("../compartido/etapas-mapa.js");
    const E = crearEtapas({ porEtapa: NIVELES_POR_ETAPA, soloPaises: true });
    if (E.total !== TOTAL_NIVELES || E.numPaises !== PAISES || E.nivelesMexico !== 0) mal("crearEtapas({ porEtapa: 20, soloPaises: true }) no coincide con el generador");
    else console.log("Numeración: 195 países × 20 = 3 900 (igual que compartido/etapas-mapa.js)");
  } catch (e) { console.log("Numeración: 195 países × 20 = 3 900 (no se comparó con ../compartido/etapas-mapa.js: no se encontró)"); }
}
// El sorteo trae exactamente 3 900 dígitos (39 tramos de 100): 15 difíciles en el primer tramo y 50 en el último; los niveles 1–10 siempre medios; nunca más de 3 difíciles seguidos
{
  const cuentaTramo = (t) => { let d = 0; for (let n = t * 100 + 1; n <= t * 100 + 100; n++) if (dificultadSorteada(n) === 2) d++; return d; };
  if (cuentaTramo(0) !== 15 || cuentaTramo(38) !== 50) mal("el primer tramo debe tener 15 difíciles y el último 50 (tiene " + cuentaTramo(0) + " y " + cuentaTramo(38) + ")");
  let seg = 0, maxSeg = 0;
  for (let n = 1; n <= TOTAL_NIVELES; n++) { seg = dificultadSorteada(n) === 2 ? seg + 1 : 0; maxSeg = Math.max(maxSeg, seg); }
  if (maxSeg > 3) mal("hay " + maxSeg + " difíciles seguidos (máximo 3)");
  console.log(`Sorteo: tramo 1 = ${cuentaTramo(0)} difíciles · tramo 39 = ${cuentaTramo(38)} · máximo seguidos ${maxSeg}`);
}

// Modo libre: tableros al azar de 5×5 a 10×10, dificultad 1 o 2 (100 semillas por combinación): llenos, con solución y dentro de su meta; configLibre rechaza lo que no existe
{
  let malos = 0;
  for (const dif of [1, 2]) for (const tam of TAMS_LIBRE) for (let i = 0; i < 100; i++) {
    const c = configLibre(tam, dif, (i * 2654435761 + 12345) >>> 0), a = generarNivel(c), meta = DIFICULTADES[dif];
    if (!a || !esResoluble(tam, a) || a.reduce((t, x) => t + x.len, 0) !== tam * tam) { malos++; continue; }
    const an = analizar(tam, a);
    if (!(an.pctLibres >= meta.minLibres && an.minOla >= meta.minOla && an.profundidad <= meta.maxProf)) malos++;
  }
  for (const [t, d] of [[4, 1], [11, 1], [10, 3], [10, 0]]) { let lanzo = false; try { configLibre(t, d, 1); } catch (e) { lanzo = e instanceof RangeError; } if (!lanzo) mal("configLibre(" + t + ", " + d + ") debería lanzar RangeError"); }
  if (malos) mal("Modo libre: " + malos + " tableros de 1 200 no cumplen"); else console.log("Modo libre: 1 200 tableros (5×5 a 10×10, 2 dificultades) llenos, con solución y dentro de meta");
}

// 1) Tamaños: los 10 primeros suben de 6×6 a 10×10; todos los demás son 10×10
const esperados = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10];
esperados.forEach((t, i) => { if (configNivel(i + 1).tam !== t) mal(`nivel ${i + 1} debería ser ${t}×${t}`); });
for (let n = 11; n <= TOTAL_NIVELES; n++) if (configNivel(n).tam !== TAM_ESTANDAR) { mal(`nivel ${n} no es 10×10`); break; }
console.log(`Tamaños: niveles 1–10 = 6,6,7,7,8,8,9,9,10,10 · del 11 al ${TOTAL_NIVELES} = 10×10`);

// 2) Dificultad: solo 1 y 2; los 10 primeros siempre medios
const cuenta = { 1: 0, 2: 0 }, cuentaMex = { 1: 0, 2: 0 };
for (let n = 1; n <= TOTAL_NIVELES; n++) {
  const d = configNivel(n).dificultad;
  if (d !== 1 && d !== 2) { mal(`nivel ${n}: dificultad ${d}`); break; }
  cuenta[d]++; if (n <= 20) cuentaMex[d]++;   // México = país 1 = niveles 1–20
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
