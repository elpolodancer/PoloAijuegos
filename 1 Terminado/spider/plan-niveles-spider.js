// Ruta: spider/plan-niveles-spider.js
// PLAN de los 22 600 niveles de la campaña: qué DIFICULTAD y cuántos PALOS lleva cada nivel (todavía sin repartos). Módulo puro, se prueba en Node.
// Lo usan generar-niveles-spider.mjs (para saber cuántos repartos de cada tipo hay que conseguir) y la prueba. El plan sale de una fórmula con
// semillas fijas: es SIEMPRE el mismo. No lo cambies después de publicar (cambiaría la dificultad de niveles que ya se jugaron).
//
// Dificultad (README-spider.md, sección 2 y ESTANDARES-juegos.md, sección 8): por tramos de 100 niveles, lineal de principio a fin:
//   Fáciles 50 % → 25 % · Normales 40 % · «difíciles» 10 % → 35 %, y la banda difícil se parte Maestro 5 % → 15 %, Experto 25 % → 35 %, Difícil el resto
//   (promedio 60 / 30 / 10). Dentro de cada tramo van revueltos. Los niveles 1 a 5 son los 5 que ya existían (1 palo, Fácil).
// Palos por dificultad (⚠️ por confirmar; cada cantidad también sube poco a poco): Fácil 1 · Normal 1 y 2 (2 palos: 25 % → 55 %) · Difícil 2 ·
//   Experto 2 y 3 (3 palos: 20 % → 60 %) · Maestro 3 y 4 (4 palos: 25 % → 75 %).
import { aleatorio } from "./logica-spider.js";

export const TOTAL = 22600, POR_TRAMO = 100, LEGADO = 5;
const lineal = (a, b, t) => a + (b - a) * t;

function barajar(lista, rnd) { for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; } return lista; }

// Devuelve { dif, palos }: dos arreglos donde la posición n (1…total) es la dificultad (1-5) y los palos (1-4) del nivel n
export function crearPlan(total = TOTAL) {
  const tramos = Math.ceil(total / POR_TRAMO);
  const dif = new Uint8Array(total + 1), palos = new Uint8Array(total + 1);
  for (let k = 0; k < tramos; k++) {
    const t = tramos > 1 ? k / (tramos - 1) : 0, ini = k * POR_TRAMO + 1, n = Math.min(POR_TRAMO, total - k * POR_TRAMO);
    const facil = Math.round(n * lineal(0.5, 0.25, t)), normal = Math.round(n * 0.4), dificil = n - facil - normal;
    const mae = Math.round(dificil * lineal(0.05, 0.15, t)), exp = Math.round(dificil * lineal(0.25, 0.35, t)), dif3 = dificil - mae - exp;
    const tipos = [];
    for (const [d, c] of [[1, facil], [2, normal], [3, dif3], [4, exp], [5, mae]]) for (let i = 0; i < c; i++) tipos.push(d);
    barajar(tipos, aleatorio(7919 * (k + 1) + 13));
    if (k === 0) for (let i = 0; i < LEGADO; i++) if (tipos[i] !== 1) { const j = tipos.findIndex((d, x) => x >= LEGADO && d === 1); [tipos[i], tipos[j]] = [tipos[j], tipos[i]]; } // los 5 niveles que ya existían son Fáciles
    const rnd = aleatorio(104729 * (k + 1) + 7);
    // palos: en cada dificultad, una parte (que crece con el avance) lleva más palos
    const mas = { 2: [0.25, 0.55, 2, 1], 4: [0.20, 0.60, 3, 2], 5: [0.25, 0.75, 4, 3] }; // dif: [parte al inicio, parte al final, palos «altos», palos «bajos»]
    const posDe = (d) => tipos.map((x, i) => (x === d ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < n; i++) { dif[ini + i] = tipos[i]; palos[ini + i] = tipos[i] === 1 ? 1 : tipos[i] === 3 ? 2 : 0; }
    for (const d of [2, 4, 5]) {
      const pos = barajar(posDe(d), rnd), [a, b, alto, bajo] = mas[d], cuantos = Math.round(pos.length * lineal(a, b, t));
      pos.forEach((i, x) => { palos[ini + i] = x < cuantos ? alto : bajo; });
    }
  }
  return { dif, palos, total };
}
// Cuántos niveles hay de cada (palos, dificultad): { "1-1": n, … }
export function resumen(plan) {
  const r = {};
  for (let n = 1; n <= plan.total; n++) { const k = plan.palos[n] + "-" + plan.dif[n]; r[k] = (r[k] || 0) + 1; }
  return r;
}
