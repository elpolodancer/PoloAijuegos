// Ruta: spider/prueba-plan-spider.mjs  (solo consola: node spider/prueba-plan-spider.mjs)
import assert from "node:assert/strict";
import { crearPlan, resumen, TOTAL } from "./plan-niveles-spider.js";
const p = crearPlan(), q = crearPlan();
assert.equal(p.total, TOTAL); assert.equal(Buffer.compare(Buffer.from(p.dif), Buffer.from(q.dif)), 0); assert.equal(Buffer.compare(Buffer.from(p.palos), Buffer.from(q.palos)), 0); // siempre igual
for (let n = 1; n <= 5; n++) { assert.equal(p.dif[n], 1); assert.equal(p.palos[n], 1); }                      // los 5 niveles que ya existían
const porDif = [0, 0, 0, 0, 0, 0], porPalos = [0, 0, 0, 0, 0];
for (let n = 1; n <= TOTAL; n++) { assert.ok(p.dif[n] >= 1 && p.dif[n] <= 5 && p.palos[n] >= 1 && p.palos[n] <= 4, "nivel " + n); porDif[p.dif[n]]++; porPalos[p.palos[n]]++; }
// Combinaciones permitidas
const ok = new Set(["1-1", "1-2", "2-2", "2-3", "2-4", "3-4", "3-5", "4-5"]);
for (const k of Object.keys(resumen(p))) assert.ok(ok.has(k), "combinación no prevista: " + k);
// Totales cercanos a los del README (con 3 900 niveles: 1 463 / 1 560 / 509 / 271 / 97)
const cerca = (x, y, tol) => Math.abs(x - y) <= tol;
assert.ok(cerca(porDif[1], 1463, 12), "fáciles " + porDif[1]); assert.ok(cerca(porDif[2], 1560, 6), "normales " + porDif[2]);
assert.ok(cerca(porDif[3], 509, 25) && cerca(porDif[4], 271, 25) && cerca(porDif[5], 97, 25));
// Primer y último tramo (100 niveles)
const tramo = (k) => { const c = [0, 0, 0, 0, 0, 0]; for (let n = k * 100 + 1; n <= k * 100 + 100; n++) c[p.dif[n]]++; return c.slice(1); };
assert.deepEqual(tramo(0), [50, 40, 6, 3, 1]);
const ult = tramo(TOTAL / 100 - 1); assert.equal(ult[0], 25); assert.equal(ult[1], 40); assert.equal(ult[2] + ult[3] + ult[4], 35);
console.log("plan de 3 900 niveles: todo bien");
console.log("por dificultad (Fácil…Maestro):", porDif.slice(1).join(" / "), "· por palos (1…4):", porPalos.slice(1).join(" / "));
console.log("por combinación:", JSON.stringify(resumen(p)));
