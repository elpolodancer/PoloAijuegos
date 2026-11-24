// Ruta: spider/generar-niveles-spider.mjs   (solo consola; guarda su avance, se puede parar con Ctrl+C y seguir después)
// Genera los 3 900 niveles de la campaña en dos pasos:
//   1) «generar»: busca repartos con solución COMPROBADA (ia-spider.js) para una cantidad de palos y los guarda en reserva-spider-<palos>.json.
//   2) «ensamblar»: ordena cada reserva por dificultad (nodos del bot: más nodos = más difícil), los reparte por el plan (plan-niveles-spider.js)
//      y escribe niveles-spider.js. Los niveles que todavía no tienen reparto quedan en 0 («🚧 todavía no creado»).
//
//   node spider/generar-niveles-spider.mjs plan                       cuántos repartos de cada tipo hacen falta y cuántos llevas
//   node spider/generar-niveles-spider.mjs generar 1 [maxMs] [tope]   busca repartos de 1 palo (maxMs por reparto, 700 si no pones; tope = parar tras N nuevos)
//   node spider/generar-niveles-spider.mjs ensamblar                  escribe niveles-spider.js con lo que haya
//   Orden recomendado: 1 palo (rápido), 2, 3 y al final 4 (el bot casi no los resuelve: usa maxMs grande, p. ej. 20000 y déjalo corriendo).
//   Puedes correr varios «generar» a la vez con palos distintos (un núcleo cada uno).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { verificar } from "./ia-spider.js";
import { crearPlan, resumen, TOTAL, LEGADO } from "./plan-niveles-spider.js";

const aqui = (f) => fileURLToPath(new URL(f, import.meta.url));
const SEMILLA_INICIAL = { 1: 1000, 2: 1000, 3: 1000, 4: 2000 }; // lejos de las semillas del banco del Modo libre (repartos-spider.js)
const LEGADO_NIVELES = [[1, 1, 6], [1, 1, 4], [1, 1, 1], [1, 1, 5], [1, 1, 3]]; // [palos, dif, semilla] de los niveles 1 a 5 (ya existían: no cambiar)
const archivo = (p) => aqui("reserva-spider-" + p + ".json");
const leer = (p) => { try { return JSON.parse(fs.readFileSync(archivo(p), "utf8")); } catch (e) { return { proxima: SEMILLA_INICIAL[p], repartos: [] }; } };
const guardar = (p, r) => { fs.writeFileSync(archivo(p) + ".tmp", JSON.stringify(r)); fs.renameSync(archivo(p) + ".tmp", archivo(p)); };

const plan = crearPlan();
const res = resumen(plan);
// Niveles que necesitan reparto, por cantidad de palos (sin los 5 que ya existían)
const necesarios = (p) => Object.keys(res).filter((k) => k.startsWith(p + "-")).reduce((s, k) => s + res[k], 0) - (p === 1 ? LEGADO : 0);

const [orden, a1, a2, a3] = process.argv.slice(2);
if (orden === "plan" || orden === "estado") {
  for (const p of [1, 2, 3, 4]) { const r = leer(p); console.log(`${p} palo${p > 1 ? "s" : " "}: ${r.repartos.length} / ${necesarios(p)} repartos  (${Math.round((100 * r.repartos.length) / necesarios(p))} %)  · próxima semilla ${r.proxima}`); }
  console.log("Plan por combinación palos-dificultad:", JSON.stringify(res));
} else if (orden === "generar") {
  const p = Number(a1), maxMs = Number(a2) || 700, tope = Number(a3) || Infinity;
  if (![1, 2, 3, 4].includes(p)) { console.log("Uso: generar <palos 1-4> [maxMs] [tope]"); process.exit(1); }
  const r = leer(p), falta = necesarios(p), t0 = Date.now();
  let nuevos = 0, intentos = 0;
  const parar = () => { guardar(p, r); console.log(`\nGuardado: ${r.repartos.length} / ${falta} repartos de ${p} palo${p > 1 ? "s" : ""}.`); process.exit(0); };
  process.on("SIGINT", parar);
  while (r.repartos.length < falta && nuevos < tope) {
    const s = r.proxima++; intentos++;
    const v = verificar(p, s, { maxMs });
    if (v.resuelto) { r.repartos.push([s, v.nodos]); nuevos++; }
    if (intentos % 25 === 0) { guardar(p, r); const seg = (Date.now() - t0) / 1000; process.stdout.write(`\r${r.repartos.length} / ${falta}  ·  ${nuevos} nuevos en ${Math.round(seg)} s (${(seg / Math.max(1, nuevos)).toFixed(2)} s c/u)  ·  resueltos ${Math.round((100 * nuevos) / intentos)} %   `); }
  }
  parar();
} else if (orden === "ensamblar") {
  const datos = new Array(TOTAL).fill(0), usados = { 1: 0, 2: 0, 3: 0, 4: 0 };
  LEGADO_NIVELES.forEach(([p, d, s], i) => { datos[i] = s * 20 + (p - 1) * 5 + (d - 1); });
  for (const p of [1, 2, 3, 4]) {
    const reserva = leer(p).repartos.slice().sort((x, y) => x[1] - y[1] || x[0] - y[0]); // de menos a más nodos
    let i = 0;
    for (const d of [1, 2, 3, 4, 5]) { // las dificultades más bajas se quedan con los repartos que menos costaron; dentro de cada una, de principio a fin del mapa, cada vez más difíciles
      for (let n = 1; n <= TOTAL; n++) {
        if (plan.palos[n] !== p || plan.dif[n] !== d || n <= LEGADO) continue;
        if (i >= reserva.length) break;
        datos[n - 1] = reserva[i][0] * 20 + (p - 1) * 5 + (d - 1); i++;
      }
    }
    usados[p] = i;
  }
  const filas = []; for (let i = 0; i < TOTAL; i += 25) filas.push("  " + datos.slice(i, i + 25).join(",") + ",");
  const creados = datos.filter((x) => x).length;
  const texto = `// Ruta: spider/niveles-spider.js   (GENERADO por generar-niveles-spider.mjs: no editar a mano)
// Niveles FIJOS del Spider (iguales para todos los jugadores): ${creados} de ${TOTAL} creados (repartos usados por cantidad de palos: 1 → ${usados[1]}, 2 → ${usados[2]}, 3 → ${usados[3]}, 4 → ${usados[4]}).
// Cada nivel es un número: semilla × 20 + (palos − 1) × 5 + (dificultad − 1); 0 = todavía no creado. Todos los repartos tienen solución comprobada por el bot
// (ia-spider.js, información perfecta) y la dificultad sale del plan (plan-niveles-spider.js). Los niveles 1 a 5 son los de siempre.
// NO cambies una semilla ya publicada: cambiaría el reparto de quien ya la jugó. Para agregar niveles: node spider/generar-niveles-spider.mjs
export const TOTAL = ${TOTAL};
const DATOS = [
${filas.join("\n")}
];
// { palos, dif, semilla } del nivel n, o null si no existe o todavía no está creado. nuevaPartida(palos, semilla, dif) da su reparto.
export function nivelDe(n) {
  const v = DATOS[Math.floor(Number(n)) - 1];
  if (!v) return null;
  const r = v % 20;
  return { palos: Math.floor(r / 5) + 1, dif: (r % 5) + 1, semilla: Math.floor(v / 20) };
}
export const creados = () => DATOS.reduce((s, v) => s + (v ? 1 : 0), 0);
`;
  fs.writeFileSync(aqui("niveles-spider.js"), texto);
  console.log(`niveles-spider.js escrito: ${creados} de ${TOTAL} niveles creados (1 palo: ${usados[1]}, 2: ${usados[2]}, 3: ${usados[3]}, 4: ${usados[4]}).`);
} else {
  console.log("Uso: plan | estado | generar <palos> [maxMs] [tope] | ensamblar");
}
