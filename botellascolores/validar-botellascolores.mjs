// Ruta: botellascolores/validar-botellascolores.mjs
// Uso (en la carpeta botellascolores/, con Node 18+):  node validar-botellascolores.mjs [nivel]
// Para cada nivel: 1) lo resuelve con backtracking, 2) REPRODUCE la solución con las reglas reales del juego,
// 3) cuenta cuántos primeros movimientos no lo arruinan (si son >= 2, hay al menos 2 formas distintas de resolverlo).
import { crear, resolver, puedeVerter, verter, resuelto } from "./logica-botellascolores.js";
import { NIVELES, NIVELES_POR_MUNDO } from "./niveles-botellascolores.js";

const LIMITE = 300000;
const solo = process.argv[2] ? Number(process.argv[2]) : 0;
let sinSolucion = [], pocasFormas = [];
NIVELES.forEach((n, i) => {
  if (solo && solo !== i + 1) return;
  const est = crear(n), cap = n.capacidad;
  const sol = resolver(est, cap, LIMITE);
  let valida = false;
  if (sol) { // reproducir la solución
    const h = est.map((b) => b.slice());
    for (const [a, b] of sol) verter(h, a, b, cap);
    valida = resuelto(h, cap);
  }
  if (!valida) { sinSolucion.push(i + 1); console.log("❌ nivel", i + 1, "sin solución comprobada"); return; }
  let buenos = 0;
  for (let a = 0; a < est.length; a++) for (let b = 0; b < est.length; b++) {
    if (a === b || !puedeVerter(est[a], est[b], cap)) continue;
    const h = est.map((x) => x.slice());
    verter(h, a, b, cap);
    if (resolver(h, cap, LIMITE)) buenos++;
  }
  if (buenos < 2) pocasFormas.push(i + 1);
  if (solo) console.log("nivel", i + 1, "pasos:", sol.length, "primeros movimientos que no pierden:", buenos, "\nsolución (origen→destino, botellas 1-based):", sol.map(([a, b]) => (a + 1) + "→" + (b + 1)).join(" "));
});
const cuenta = (f) => { const m = {}; NIVELES.forEach((n) => { const k = f(n); m[k] = (m[k] || 0) + 1; }); return JSON.stringify(m); };
console.log("\nBotellas (total):", cuenta((n) => n.botellas));
console.log("Capacidad:", cuenta((n) => n.capacidad));
console.log("Botellas vacías:", cuenta((n) => n.botellas - n.colores));
console.log("Mundos:", Math.ceil(NIVELES.length / NIVELES_POR_MUNDO), "de", NIVELES_POR_MUNDO, "niveles");
console.log("\nNiveles revisados:", solo ? 1 : NIVELES.length);
console.log("Sin solución:", sinSolucion.length ? sinSolucion.join(", ") : "ninguno ✅");
console.log("Con menos de 2 formas de empezar:", pocasFormas.length ? pocasFormas.join(", ") : "ninguno ✅");
