// Ruta: spider/verificar-campana-spider.mjs   (solo consola)
//   node spider/verificar-campana-spider.mjs [muestra=200]     «todos» como muestra = revisa los 3 900 (lento: ≈ 0.1 s por nivel de 1 palo)
// Revisa niveles-spider.js: (1) que cada nivel creado coincida con el plan (palos y dificultad), (2) que no haya dos niveles con el mismo reparto
// (palos + semilla) y (3) que el bot vuelva a resolver los repartos (con la solución repetida jugada por jugada con las reglas del juego).
import { nivelDe, creados, TOTAL } from "./niveles-spider.js";
import { crearPlan } from "./plan-niveles-spider.js";
import { verificar } from "./ia-spider.js";
const arg = process.argv[2] || "200", plan = crearPlan();
const lista = []; for (let n = 1; n <= TOTAL; n++) { const N = nivelDe(n); if (N) lista.push([n, N]); }
const vistos = new Set(); let mal = 0;
for (const [n, N] of lista) {
  if (N.palos !== plan.palos[n] || N.dif !== plan.dif[n]) { console.log("nivel " + n + ": no coincide con el plan"); mal++; }
  const k = N.palos + ":" + N.semilla; if (vistos.has(k)) { console.log("nivel " + n + ": reparto repetido " + k); mal++; } vistos.add(k);
}
console.log(creados() + " niveles creados de " + TOTAL + " · plan y repartos únicos: " + (mal ? mal + " problemas" : "todo bien"));
const muestra = arg === "todos" ? lista : lista.filter((_, i) => i % Math.max(1, Math.floor(lista.length / Number(arg))) === 0).slice(0, Number(arg));
let ok = 0; const fallos = [];
for (const [n, N] of muestra) { const r = verificar(N.palos, N.semilla, { maxMs: 4000 }); if (r.resuelto) ok++; else fallos.push(n); }
console.log("el bot resolvió " + ok + " de " + muestra.length + " niveles revisados" + (fallos.length ? " · sin resolver: " + fallos.slice(0, 20).join(",") : ""));
process.exit(mal || fallos.length ? 1 : 0);
