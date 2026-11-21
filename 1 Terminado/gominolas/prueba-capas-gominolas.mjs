// Ruta: gominolas/prueba-capas-gominolas.mjs
// Comprueba las negras con capas del motor: el reparto de capas (30 % con 2, 10 % con 3) y que una jugada quite UNA sola capa aunque la toquen varias gominolas.
// Se corre con Node:  node gominolas/prueba-capas-gominolas.mjs
import { crearPartida, crearRng, jugarCadena, NEGRA, contarNegras, parametrosNivel } from "./logica-gominolas.js";
import { TABLEROS } from "./logica-gominolas.js";
const t = TABLEROS[0];
// 1) reparto de capas
let ok = 0;
for (let i = 0; i < 200; i++) {
  const par = parametrosNivel({ tablero: t, dificultad: "medio", tipo: "capas" }, crearRng(i + 1));
  const p = crearPartida(par, crearRng(i + 1));
  const ng = p.grid.flat().filter((g) => g.k === NEGRA);
  const c3 = ng.filter((g) => g.c === 3).length, c2 = ng.filter((g) => g.c === 2).length;
  if (ng.length === par.negras && c3 === Math.round(ng.length * 0.1) && c2 === Math.round(ng.length * 0.3) && ng.every((g) => !g.c || g.c >= 2)) ok++;
}
console.log("reparto de capas correcto:", ok + "/200");
// 2) una capa por jugada, aunque la toquen varias gominolas rotas
const par = { cols: 6, filas: 8, negras: 1, movs: 30, zona: 5, zonaNueva: 3, penaliza: 2, capas: null };
const p = crearPartida(par, crearRng(3));
for (const fila of p.grid) for (const g of fila) { g.k = 1; delete g.c; }
p.grid[7][2] = { k: NEGRA, c: 3 };
// cadena de 3 del color 0 pegada a la negra por arriba y por los lados: (6,1),(6,2),(6,3) + (7,1) y (7,3) son vecinos laterales
for (const [f, c] of [[6, 1], [6, 2], [6, 3], [7, 1], [7, 3]]) p.grid[f][c].k = 0;
const cad = [{ f: 7, c: 1 }, { f: 6, c: 2 }, { f: 7, c: 3 }];  // toca la negra por izquierda, arriba y derecha a la vez
const fallosAntes = p.fallos;
jugarCadena(p, cad);
const queda = p.grid.flat().filter((g) => g.k === NEGRA);
console.log("tras 1 jugada con 3 gominolas pegadas: negras", queda.length, "capas de la que tenía 3 →", queda.map((g) => g.c).join(","), "· fallos (castigo):", p.fallos - fallosAntes, "· estado", p.estado);
