// Ruta: spider/banco-spider.js
// Elige un reparto VERIFICADO (con solución comprobada por el bot) del banco repartos-spider.js para una cantidad de palos y una dificultad.
// Lógica pura (sin DOM): se puede probar en Node.
import { BANCO } from "./repartos-spider.js";

// Cuántos repartos verificados hay en esa casilla (palos 1-4, dificultad 1-5)
export const cuantos = (palos, dif) => ((BANCO[palos] || {})[dif] || []).length;

// Devuelve { semilla, nodos, dif } o null si no hay ninguno de esos palos.
// - Si la casilla (palos, dif) está vacía usa la dificultad más cercana con repartos y lo dice en «dif» (distinta de la pedida).
// - «evitar» = semillas jugadas hace poco: se saltan mientras queden otras.
export function elegirDelBanco(palos, dif, azar = Math.random, evitar = []) {
  const por = BANCO[palos];
  if (!por) return null;
  for (let d = 0; d < 5; d++) {
    for (const x of d ? [dif - d, dif + d] : [dif]) {
      const l = por[x];
      if (!l || !l.length) continue;
      const libres = l.filter((r) => !evitar.includes(r[0]));
      const lista = libres.length ? libres : l;
      const r = lista[Math.floor(azar() * lista.length)];
      return { semilla: r[0], nodos: r[1], dif: x };
    }
  }
  return null;
}
