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
// Totales cercanos a los del README (8 475 / 9 040 / 3 051 / 1 526 / 508)
assert.ok(Math.abs(porDif[1] - 8475) < 60, "fáciles " + porDif[1]); assert.ok(Math.abs(porDif[2] - 9040) < 30);
assert.ok(Math.abs(porDif[3] - 3051) < 120 && Math.abs(porDif[4] - 1526) < 120 && Math.abs(porDif[5] - 508) < 120);
// Primer y último tramo (100 niveles)
const tramo = (k) => { const c = [0, 0, 0, 0, 0, 0]; for (let n = k * 100 + 1; n <= k * 100 + 100; n++) c[p.dif[n]]++; return c.slice(1); };
assert.deepEqual(tramo(0), [50, 40, 6, 3, 1]);
const ult = tramo(225); assert.equal(ult[0], 25); assert.equal(ult[1], 40); assert.equal(ult[2] + ult[3] + ult[4], 35);
console.log("plan de 22 600 niveles: todo bien");
console.log("por dificultad (Fácil…Maestro):", porDif.slice(1).join(" / "), "· por palos (1…4):", porPalos.slice(1).join(" / "));
console.log("por combinación:", JSON.stringify(resumen(p)));
