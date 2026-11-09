// Ruta: zuma/validar-zuma.mjs
// Comprueba que los niveles cumplen las metas de metas-zuma.mjs: los bots de bot-zuma.mjs juegan cada ronda con la física
// real del juego (logica-zuma.js) y se revisan el porcentaje de partidas ganadas y la duración. También revisa que las monedas por estrellas sean válidas.
// Es determinista: da siempre el mismo resultado para el mismo archivo de niveles.
// Uso: node zuma/validar-zuma.mjs [partidas=20] [archivo-de-niveles=./niveles-zuma.js]
import { evaluar } from "./bot-zuma.mjs";
import { META } from "./metas-zuma.mjs";

const PARTIDAS = Number(process.argv[2]) || 20;
const { NIVELES, PALETA, MONEDAS_POR_ESTRELLAS } = await import(process.argv[3] || "./niveles-zuma.js");

let fallos = 0;
// Las monedas son iguales en todos los niveles: 3 números enteros positivos que van subiendo (1, 2 y 3 estrellas)
const M = MONEDAS_POR_ESTRELLAS;
if (!(Array.isArray(M) && M.length === 3 && M.every((m, i) => Number.isInteger(m) && m > 0 && (i === 0 || m > M[i - 1])))) {
  fallos++; console.log("FALLA", "MONEDAS_POR_ESTRELLAS debe ser [1 estrella, 2, 3] con enteros positivos que suben:", M);
}
const ids = new Set();
for (const n of NIVELES) {
  if (ids.has(n.id)) { fallos++; console.log("FALLA", n.id, "id repetido"); }
  ids.add(n.id);
  if (n.monedas !== undefined) { fallos++; console.log("FALLA", n.id, "ya no lleva «monedas» (se usa MONEDAS_POR_ESTRELLAS)"); }
  if (n.rondas?.length !== 3) { fallos++; console.log("FALLA", n.id, "debe tener 3 rondas"); continue; }
  n.rondas.forEach((ronda, ri) => {
    const m = META[ri], partes = [];
    let ok = ronda.colores <= PALETA.length;
    if (!ok) partes.push("más colores que la paleta");
    let med = 0;
    for (const perfil of ["novato", "humano", "perfecto"]) {
      const min = m.minimos[perfil];
      if (min === undefined && perfil !== m.referencia) continue;
      const e = evaluar(ronda, perfil, PARTIDAS);
      const bien = min === undefined || e.ganadas / PARTIDAS >= min;
      if (!bien) ok = false;
      if (perfil === m.referencia) med = e.mediana;
      partes.push(perfil + " " + e.ganadas + "/" + PARTIDAS + " (mediana " + e.mediana.toFixed(0) + " s)" + (bien ? "" : " ✗"));
    }
    if (med < m.duracion[0] || med > m.duracion[1]) { ok = false; partes.push("duración " + med.toFixed(0) + " s fuera de " + m.duracion.join("–") + " ✗"); }
    if (!ok) fallos++;
    console.log(ok ? "OK   " : "FALLA", n.id, "ronda " + (ri + 1), "·", partes.join(" · "));
  });
}
console.log(fallos ? "\n" + fallos + " problema(s)" : "\nTodo en orden: " + NIVELES.length + " niveles");
process.exit(fallos ? 1 : 0);
