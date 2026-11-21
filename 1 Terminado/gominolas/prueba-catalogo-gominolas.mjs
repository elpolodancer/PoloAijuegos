// Ruta: gominolas/prueba-catalogo-gominolas.mjs
// Comprueba el catálogo de niveles (catalogo-gominolas.js). Se corre en una terminal con Node, no en el navegador:
//   node gominolas/prueba-catalogo-gominolas.mjs            (revisa los 226 bloques y imprime el reparto)
//   node gominolas/prueba-catalogo-gominolas.mjs --ver 1-40  (además lista esos niveles)
// Sale con error (código 1) si algo no cumple las reglas del README.
import { nivelDe, TOTAL_NIVELES, NUM_BLOQUES, NIVELES_POR_ETAPA, BLOQUES_ESTADOS, ESPECIALES, TUTORIAL, TIPOS, NIVELES_CON_FILAS, SORPRESAS, SORPRESAS_PRIMER_BLOQUE } from "./catalogo-gominolas.js";

const fallos = [];
const exige = (ok, texto) => { if (!ok) fallos.push(texto); };
const cuenta = (lista, f) => lista.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const pct = (n, t) => (100 * n / t).toFixed(1).padStart(5) + "%";

exige(TOTAL_NIVELES === 22600, "el total de niveles no es 22 600");
exige(NUM_BLOQUES === 226, "no hay 226 bloques");

// ---- Todos los niveles, bloque por bloque ----
const todos = [];
for (let b = 0; b < NUM_BLOQUES; b++) {
  const niv = Array.from({ length: NIVELES_POR_ETAPA }, (_, i) => nivelDe(b * NIVELES_POR_ETAPA + i + 1));
  todos.push(niv);
  const t = cuenta(niv, (x) => x.tablero.id), d = cuenta(niv, (x) => x.dificultad), ti = cuenta(niv, (x) => x.tipo);
  const eTab = b === 0 ? { "6x8": 50, "8x10": 30, "10x12": 20 } : { "6x8": 25, "8x10": 25, "10x12": 25, "12x14": 25 };
  const eDif = b === 0 ? { facil: 50, medio: 40, dificil: 10 } : b < BLOQUES_ESTADOS ? null : { facil: 10, medio: 30, dificil: 60 };
  for (const id in eTab) exige(t[id] === eTab[id], `bloque ${b}: tablero ${id} = ${t[id]} (debía ser ${eTab[id]})`);
  exige(Object.keys(t).length === Object.keys(eTab).length, `bloque ${b}: hay tableros que no deberían estar`);
  if (eDif) for (const id in eDif) exige(d[id] === eDif[id], `bloque ${b}: dificultad ${id} = ${d[id]} (debía ser ${eDif[id]})`);
  else {
    const v = Object.values(d).sort();
    exige(v.join() === "33,33,34" && Object.keys(d).length === 3, `bloque ${b}: dificultad no es 34/33/33 (${JSON.stringify(d)})`);
  }
  for (const tipo in ESPECIALES) exige(ti[tipo] === ESPECIALES[tipo], `bloque ${b}: tipo ${tipo} = ${ti[tipo]}`);
  exige(ti.jefe === 1 && niv[99].tipo === "jefe", `bloque ${b}: el nivel 100 no es el único jefe`);
  exige(niv[99].dificultad === "dificil", `bloque ${b}: el jefe no es difícil`);
  exige(niv[99].tablero.id === (b === 0 ? "10x12" : "12x14"), `bloque ${b}: el jefe no tiene el tablero más grande`);
  const eSorp = b === 0 ? SORPRESAS_PRIMER_BLOQUE : SORPRESAS;
  exige(ti.clasico === 100 - Object.values(ESPECIALES).reduce((a, x) => a + x, 0) - 1 - eSorp, `bloque ${b}: clásicos = ${ti.clasico}`);
  // sorpresas (🎁): cantidad exacta, todas difíciles, con patrón al azar, fuera del tutorial, sin vecinos especiales y separadas
  const sorp = niv.filter((x) => x.tipo === "sorpresa");
  exige(sorp.length === eSorp, `bloque ${b}: sorpresas = ${sorp.length} (debían ser ${eSorp})`);
  exige(sorp.every((x) => x.dificultad === "dificil" && x.patron === "azar"), `bloque ${b}: hay una sorpresa que no es difícil o no tiene patrón al azar`);
  exige(sorp.every((x) => x.k >= 2 && x.k <= 98 && (b > 0 || x.k >= 21)), `bloque ${b}: una sorpresa cae fuera del rango permitido (en el primer estado desde el 21)`);
  exige(sorp.every((x) => niv[x.k - 2].tipo === "clasico" && niv[x.k].tipo === "clasico"), `bloque ${b}: una sorpresa quedó pegada a otro nivel especial`);
  sorp.forEach((x, i) => { if (i) exige(x.k - sorp[i - 1].k >= 2, `bloque ${b}: sorpresas seguidas (${sorp[i - 1].n} y ${x.n})`); });
  // patrón inicial: exactamente NIVELES_CON_FILAS niveles con filas completas, todos clásicos y fuera del tutorial
  const conFilas = niv.filter((x) => x.patron === "filas");
  exige(conFilas.length === NIVELES_CON_FILAS, `bloque ${b}: niveles con filas = ${conFilas.length}`);
  exige(conFilas.every((x) => x.tipo === "clasico" && !(b === 0 && x.k <= TUTORIAL)), `bloque ${b}: hay filas en un nivel que no es clásico o es del tutorial`);
  exige(niv.every((x) => x.patron === "filas" || x.patron === "azar"), `bloque ${b}: patrón desconocido`);
  // especiales: nunca seguidos ni pegados al jefe, y el mismo tipo nunca dos veces seguidas
  const esp = niv.filter((x) => x.tipo !== "clasico" && x.tipo !== "jefe" && x.tipo !== "sorpresa"); // las sorpresas se revisan aparte
  esp.forEach((x, i) => {
    if (i) {
      exige(x.k - esp[i - 1].k >= 2, `bloque ${b}: especiales seguidos en los niveles ${esp[i - 1].n} y ${x.n}`);
      exige(x.tipo !== esp[i - 1].tipo, `bloque ${b}: el tipo ${x.tipo} se repite seguido (${esp[i - 1].n}, ${x.n})`);
    }
  });
  exige(!niv[98].tipo.match(/capas|contrarreloj|puntos|monedas|lluvia|sorpresa/), `bloque ${b}: hay un especial justo antes del jefe`);
  if (b > 0) exige(niv[0].tipo === "clasico", `bloque ${b}: el primer nivel no es clásico (quedaría pegado al jefe del bloque anterior)`);
  if (b === 0) for (let i = 0; i < TUTORIAL; i++) {
    const x = niv[i];
    exige(x.tablero.id === "6x8" && x.dificultad === "facil" && x.tipo === "clasico", `nivel ${x.n}: el tutorial no es 6×8, fácil y clásico`);
  }
}

// ---- Es fijo: otra copia del módulo (sin memoria) da exactamente lo mismo ----
const otra = await import("./catalogo-gominolas.js?otra-copia");
let distintos = 0;
for (let n = 1; n <= TOTAL_NIVELES; n++) {
  const a = nivelDe(n), c = otra.nivelDe(n);
  if (a.tablero.id !== c.tablero.id || a.dificultad !== c.dificultad || a.tipo !== c.tipo || a.semilla !== c.semilla || a.patron !== c.patron) distintos++;
}
exige(distintos === 0, `${distintos} niveles cambian de una copia a otra (no es determinista)`);
const semillas = new Set(todos.flat().map((x) => x.semilla));
exige(semillas.size > TOTAL_NIVELES * 0.999, `hay muchas semillas repetidas (${TOTAL_NIVELES - semillas.size})`);
exige(nivelDe(0).n === 1 && nivelDe(999999).n === TOTAL_NIVELES && nivelDe("x").n === 1, "los valores raros no se acotan");

// ---- Reporte ----
function zona(nombre, ini, fin) {
  const lista = todos.slice(ini, fin).flat(), t = lista.length;
  const tab = cuenta(lista, (x) => x.tablero.id), dif = cuenta(lista, (x) => x.dificultad), tip = cuenta(lista, (x) => x.tipo);
  console.log(`\n${nombre}  (${t} niveles)`);
  console.log("  tableros:   " + Object.keys(tab).sort((a, b) => parseInt(a) - parseInt(b)).map((k) => k + " " + pct(tab[k], t)).join("  ·  "));
  console.log("  dificultad: " + ["facil", "medio", "dificil"].map((k) => k + " " + pct(dif[k] || 0, t)).join("  ·  "));
  console.log("  tipos:      " + TIPOS.map((k) => k + " " + pct(tip[k] || 0, t)).join("  ·  "));
  console.log("  patrón:     filas completas " + pct(lista.filter((x) => x.patron === "filas").length, t) + "  ·  azar " + pct(lista.filter((x) => x.patron === "azar").length, t));
  // tablero × dificultad (deben ser independientes: cada tamaño debería tener más o menos la misma mezcla de dificultades)
  const cruz = cuenta(lista, (x) => x.tablero.id + "/" + x.dificultad);
  console.log("  dificil dentro de cada tablero: " + Object.keys(tab).sort((a, b) => parseInt(a) - parseInt(b)).map((k) => k + " " + pct(cruz[k + "/dificil"] || 0, tab[k])).join("  ·  "));
}
console.log("=== Catálogo de niveles de Conecta gominolas ===");
zona("Niveles 1-100 (primer estado)", 0, 1);
zona("Niveles 101-3 200 (estados 2 al 32)", 1, BLOQUES_ESTADOS);
zona("Niveles 3 201-22 600 (194 países)", BLOQUES_ESTADOS, NUM_BLOQUES);
zona("TODA la campaña", 0, NUM_BLOQUES);

const i = process.argv.indexOf("--ver");
if (i >= 0) {
  const [a, z] = (process.argv[i + 1] || "1-30").split("-").map(Number);
  console.log(`\nNiveles ${a} a ${z}:`);
  for (let n = a; n <= z; n++) { const x = nivelDe(n); console.log(String(n).padStart(6) + "  " + x.tablero.id.padEnd(6) + x.dificultad.padEnd(8) + x.tipo); }
}

if (fallos.length) {
  console.log("\n❌ " + fallos.length + " problema(s):");
  fallos.slice(0, 30).forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("\n✅ Todo en orden: cuentas exactas en los 226 bloques, tutorial, jefes, especiales y sorpresas separados y niveles fijos (determinista).");
