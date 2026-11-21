// Ruta: gominolas/prueba-sorpresa-gominolas.mjs
// Comprueba las reglas de los niveles «sorpresa» 🎁 del motor (logica-gominolas.js). Se corre con Node:
//   node gominolas/prueba-sorpresa-gominolas.mjs
// Sale con error (código 1) si algo no cumple.
import { crearPartida, jugarCadena, cadenaValida, contarNegras, parametrosNivel, vecinos, vecinosCruz, revelar, NEGRA, SORPRESA, CAMPANA_NIVEL, TABLEROS, crearRng } from "./logica-gominolas.js";
import { nivelDe, TOTAL_NIVELES } from "./catalogo-gominolas.js";

const fallos = [];
const exige = (ok, texto) => { if (!ok) fallos.push(texto); };

// Busca una cadena de 3 (en cualquier dirección, con diagonales) que cumpla «cond(cadena)»
function buscar(p, cond) {
  const k = (f, c) => p.grid[f][c].k;
  for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) {
    if (k(f, c) < 0) continue;
    for (const [f2, c2] of vecinos(p, f, c)) {
      if (k(f2, c2) !== k(f, c)) continue;
      for (const [f3, c3] of vecinos(p, f2, c2)) {
        if ((f3 === f && c3 === c) || k(f3, c3) !== k(f, c)) continue;
        const cad = [{ f, c }, { f: f2, c: c2 }, { f: f3, c: c3 }];
        if (cadenaValida(p, cad) && cond(cad)) return cad;
      }
    }
  }
  return null;
}
// ¿La cadena rompe (al menos) una casilla pegada en cruz a la negra de abajo?
const tocaNegra = (p, cad) => cad.some(({ f, c }) => vecinosCruz(p, f, c).some(([a, b]) => p.grid[a][b].k === NEGRA));

// ---- 1) El catálogo y los parámetros ----
const sorpresas = [];
for (let n = 1; n <= TOTAL_NIVELES && sorpresas.length < 400; n++) if (nivelDe(n).tipo === "sorpresa") sorpresas.push(n);
exige(sorpresas.length > 0, "no hay niveles sorpresa en el catálogo");
for (const n of sorpresas) {
  const nv = nivelDe(n), par = parametrosNivel(nv, crearRng(n));
  exige(par.sorpresa === true && nv.dificultad === "dificil", `nivel ${n}: parámetros de sorpresa mal`);
  exige(par.negras >= 5 && par.movs > par.negras, `nivel ${n}: negras ${par.negras} / movs ${par.movs} no tienen sentido`);
  const base = parametrosNivel({ ...nv, tipo: "clasico" }, crearRng(n));
  exige(par.negras >= base.negras, `nivel ${n}: la sorpresa debería tener más negras que un clásico del mismo tablero`);
  exige(par.movs <= Math.round(par.negras * CAMPANA_NIVEL.factor.dificil[nv.tablero.id]) + CAMPANA_NIVEL.extra + SORPRESA.movsSenuelo, `nivel ${n}: la sorpresa no tiene un tope más estricto que un difícil normal`);
}
const nClasico = parametrosNivel({ tablero: TABLEROS[0], dificultad: "dificil", tipo: "clasico", patron: "azar" }, crearRng(1));
exige(nClasico.sorpresa === false, "un nivel clásico no debe ser sorpresa");

// ---- 2) Una partida sorpresa, paso a paso ----
let revelados = 0, partidas = 0;
for (const n of sorpresas.slice(0, 60)) {
  const nv = nivelDe(n), par = parametrosNivel(nv, crearRng(n * 7));
  const p = crearPartida(par, crearRng(n * 13));
  partidas++;
  const negras = [];
  p.grid.forEach((fila, f) => fila.forEach((g, c) => { if (g.k === NEGRA) negras.push([f, c]); }));
  exige(negras.length === 1 && negras[0][0] === p.filas - 1, `nivel ${n}: debe empezar con UNA negra en la fila de abajo (hay ${negras.length})`);
  exige(p.fase === "senuelo" && p.estado === "jugando", `nivel ${n}: debe empezar en fase señuelo y jugando`);

  // a) una jugada que NO toca la negra: no castiga, sigue habiendo una sola negra
  const lejos = buscar(p, (cad) => !tocaNegra(p, cad));
  if (lejos) {
    const m0 = p.movs;
    jugarCadena(p, lejos);
    exige(contarNegras(p) === 1 && p.fase === "senuelo", `nivel ${n}: una jugada fallida en el señuelo no debe castigar ni revelar (negras ${contarNegras(p)})`);
    exige(p.fallos === 0 && p.movs === m0 - 1, `nivel ${n}: el señuelo no debe contar fallos y sí gastar un movimiento`);
  }
  // b) una jugada que SÍ toca la negra: salen todas, y el nivel NO se gana todavía
  let toca = buscar(p, (cad) => tocaNegra(p, cad));
  for (let i = 0; i < 40 && !toca && p.estado === "jugando"; i++) { // si no hay, se juega otra jugada cualquiera y se vuelve a buscar
    const cualquiera = buscar(p, () => true);
    if (!cualquiera) break;
    jugarCadena(p, cualquiera); toca = buscar(p, (cad) => tocaNegra(p, cad));
  }
  if (!toca || p.estado !== "jugando") continue;
  jugarCadena(p, toca);
  exige(p.fase === "real", `nivel ${n}: al romper la negra debe pasar a fase real`);
  exige(p.estado !== "gano", `nivel ${n}: romper la única negra NO debe ganar el nivel`);
  exige(contarNegras(p) >= par.negras - 1 && contarNegras(p) <= par.negras, `nivel ${n}: debían salir ${par.negras} negras y salieron ${contarNegras(p)}`);
  revelados++;
  // c) ya en fase real: una jugada fallida SÍ castiga
  if (p.estado === "jugando") {
    const lejos2 = buscar(p, (cad) => { const ant = cad; return !tocaNegra(p, ant); });
    if (lejos2) {
      const antes = contarNegras(p), f0 = p.fallos;
      jugarCadena(p, lejos2);
      if (p.estado === "jugando") exige(p.fallos === f0 + 1 && contarNegras(p) >= antes, `nivel ${n}: en fase real una jugada fallida debe castigar`);
    }
  }
}
exige(revelados > 40, `solo se pudo revelar en ${revelados} de ${partidas} partidas de prueba`);

// ---- 3) El límite de movimientos corta también el señuelo ----
{
  const n = sorpresas[0], par = parametrosNivel(nivelDe(n), crearRng(5));
  const p = crearPartida({ ...par, movs: 1 }, crearRng(99));
  const lejos = buscar(p, (cad) => !tocaNegra(p, cad));
  if (lejos) { jugarCadena(p, lejos); exige(p.estado === "perdio", "sin movimientos en el señuelo debe perder"); }
}

// ---- 4) Los ositos con poder no se convierten en negras al salir todas ----
{
  const n = sorpresas[1], par = parametrosNivel(nivelDe(n), crearRng(8));
  const p = crearPartida(par, crearRng(11));
  let puestos = 0;
  for (let f = p.filas - 1; f >= p.filas - par.zona && puestos < 6; f--) for (let c = 0; c < p.cols && puestos < 6; c++) {
    if (p.grid[f][c].k >= 0) { p.grid[f][c].p = "horizontal"; puestos++; }
  }
  p.grid[p.filas - 1].forEach((g) => { if (g.k === NEGRA) g.k = 0; }); // quita la negra del señuelo (como si ya se hubiera roto)
  revelar(p);
  let conPoder = 0, poderNegro = 0;
  p.grid.forEach((fila) => fila.forEach((g) => { if (g.p) { conPoder++; if (g.k === NEGRA) poderNegro++; } }));
  exige(poderNegro === 0, "un osito con poder se convirtió en negra");
  exige(conPoder === puestos, `se perdieron ositos con poder (${conPoder} de ${puestos})`);
  exige(contarNegras(p) === par.negras, `con poderes en la zona debían salir ${par.negras} negras y salieron ${contarNegras(p)}`);
}

if (fallos.length) {
  console.log("❌ " + fallos.length + " problema(s):");
  fallos.slice(0, 25).forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("✅ Niveles sorpresa en orden: una negra abajo, sin castigo en el señuelo, salen todas al romperla, el nivel no se gana ahí, el límite de movimientos corta, y los poderes se respetan.");
console.log("   (" + sorpresas.length + " niveles sorpresa revisados, " + revelados + " partidas llegaron a la revelación)");
