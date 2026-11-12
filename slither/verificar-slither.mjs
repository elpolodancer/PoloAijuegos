// Ruta: slither/verificar-slither.mjs  (herramienta de desarrollo: NO se sube al service worker)
// Comprueba que el reparto de los 22 600 niveles cumple lo pedido. Uso:   node slither/verificar-slither.mjs
// (necesita el package.json {"type":"module"} de esta carpeta). Sale con error si algo no cumple.
import { nivelDe, TOTAL, POR_ETAPA, NUM_ETAPAS, mezclaEtapa, META_INI, META_FIN, TECHO, P_TECHO, probExito } from "./niveles-slither.js";

let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? "  ✔ " : "  ✘ ") + msg); if (!cond) fallos++; };
const pct = (a) => { const s = a.reduce((x, y) => x + y, 0); return a.map((v) => (100 * v / s).toFixed(1).padStart(5) + " %").join("  "); };
const niv = Array.from({ length: TOTAL }, (_, i) => nivelDe(i + 1));

console.log("Total y determinismo");
ok(niv.length === 22600, "22 600 niveles (" + NUM_ETAPAS + " etapas de " + POR_ETAPA + ")");
ok(niv.every((l, i) => JSON.stringify(l) === JSON.stringify(nivelDe(i + 1))), "el nivel n sale igual cada vez");
ok(niv[0].dif === 0 && niv[0].mapa === 0 && niv[0].meta === META_INI, "el nivel 1 es Fácil, Pequeño y de " + META_INI + " puntos");

console.log("\nMezcla de dificultad (Fácil / Normal / Difícil) por etapa");
const mix = (desde, hasta) => { const c = [0, 0, 0]; for (let n = desde; n <= hasta; n++) c[niv[n - 1].dif]++; return c; };
const primera = mix(1, POR_ETAPA), ultima = mix(TOTAL - POR_ETAPA + 1, TOTAL);
console.log("  primera etapa (Quintana Roo…):", primera.join(" / "), " última (el último país):", ultima.join(" / "));
ok(primera.join() === "50,40,10", "primera etapa = 50 / 40 / 10");
ok(ultima.join() === "25,35,40", "última etapa = 25 / 35 / 40");
let sube = true;
for (let e = 1; e < NUM_ETAPAS; e++) { const a = mezclaEtapa(e - 1), b = mezclaEtapa(e); if (b[0] > a[0] || b[2] < a[2]) sube = false; }
ok(sube, "de etapa a etapa los Fáciles nunca suben y los Difíciles nunca bajan");
ok(niv.every((l, i) => i % POR_ETAPA !== 0 || mix(i + 1, i + POR_ETAPA).reduce((a, b) => a + b) === 100), "cada etapa suma 100");
console.log("  por décimas del juego:");
for (let d = 0; d < 10; d++) console.log("   ", String(d * 10).padStart(2) + "–" + String(d * 10 + 10).padEnd(3) + "%  ", pct(mix(Math.floor(d * TOTAL / 10) + 1, Math.floor((d + 1) * TOTAL / 10))));

console.log("\nMapas (Pequeño / Mediano / Grande)");
const mp = [0, 0, 0]; for (const l of niv) mp[l.mapa]++;
console.log("  total:", mp.join(" / "), " ", pct(mp));
ok(mp.every((v) => Math.abs(v / TOTAL - 1 / 3) < 0.001), "cada mapa tiene 33.3 % de los niveles");
let maxRacha = 0, racha = 0; for (let i = 1; i < TOTAL; i++) { racha = niv[i].mapa === niv[i - 1].mapa ? racha + 1 : 0; maxRacha = Math.max(maxRacha, racha + 1); }
console.log("  racha más larga de niveles seguidos con el mismo mapa:", maxRacha);

console.log("\nMetas (puntos)");
const metas = niv.map((l) => l.meta), ord = [...metas].sort((a, b) => a - b);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log("  mínima", ord[0], "· máxima", ord[ord.length - 1], "· mediana", med(metas));
const dec = []; for (let d = 0; d < 10; d++) dec.push(med(metas.slice(Math.floor(d * TOTAL / 10), Math.floor((d + 1) * TOTAL / 10))));
console.log("  mediana por décima del juego:", dec.join(" → "));
ok(dec.every((v, i) => i === 0 || v >= dec[i - 1] * 0.97), "la meta mediana no baja de una décima a la siguiente (al final puede estancarse en el techo)");
ok(ord[0] >= 200 && ord[ord.length - 1] <= META_FIN * 1.45, "metas entre 200 y " + Math.round(META_FIN * 1.45));
ok(niv.slice(0, 5).every((l, i) => i === 0 || l.meta >= niv[i - 1].meta), "los primeros 5 niveles no bajan");
console.log("  retos:", (100 * niv.filter((l) => l.reto).length / TOTAL).toFixed(1) + " %", "· respiros:", (100 * niv.filter((l) => l.respiro).length / TOTAL).toFixed(1) + " %");
console.log("  ejemplo, etapa 1 → niveles 1-12:", niv.slice(0, 12).map((l) => l.meta + "·" + "FND"[l.dif] + "PMG"[l.mapa]).join("  "));

console.log("\nAlcanzabilidad (probabilidad de que UNA vida de un jugador automático llegue a la meta; datos de CALIBRACION)");
const P = niv.map((l) => probExito(l.mapa, l.dif, l.meta));
const prom = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const porDec = []; for (let d = 0; d < 10; d++) porDec.push((100 * prom(P.slice(Math.floor(d * TOTAL / 10), Math.floor((d + 1) * TOTAL / 10)))).toFixed(0) + " %");
console.log("  media por décima del juego:", porDec.join(" → "));
const pMin = Math.min(...P);
console.log("  la meta más difícil de todas: probabilidad", (100 * pMin).toFixed(1) + " % por vida · niveles pegados al techo:", (100 * niv.filter((l) => l.techo).length / TOTAL).toFixed(1) + " %");
ok(pMin >= P_TECHO - 0.02, "ningún nivel baja de ~" + Math.round(100 * P_TECHO) + " % de éxito por vida (todos se pueden pasar)");
ok(P.slice(0, Math.floor(TOTAL * 0.2)).every((p) => p >= 0.25), "el primer 20 % del juego se pasa con al menos 25 % de éxito por vida");
ok(niv.every((l) => l.meta <= TECHO[l.mapa][l.dif] || l.meta <= 250), "ninguna meta pasa del techo de su mapa y sus bots");
console.log("  techos de meta [mapa Pequeño/Mediano/Grande][bots Fácil/Normal/Difícil]:", JSON.stringify(TECHO));
console.log(fallos ? "\n" + fallos + " comprobación(es) fallaron" : "\nTodo cumple");
process.exit(fallos ? 1 : 0);
