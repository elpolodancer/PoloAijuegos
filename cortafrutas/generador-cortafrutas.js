// Ruta: cortafrutas/generador-cortafrutas.js
// Fábrica de niveles (sin pantalla). Arma 12 oleadas al azar con semilla (determinista) y se las pasa al solucionador por backtracking
// (logica-cortafrutas.js → resolver): un nivel se acepta solo si se puede sobrevivir y las vidas que cuesta su máximo (PÉRDIDAS) son
// justo las de la clase pedida (0 fácil, 1 medio, 2 difícil) y no está repetido.
import { resolver, aTexto, grupos, validar, OLEADAS, OLEADAS_NORMALES } from "./logica-cortafrutas.js";

export const crearContexto = () => ({ vistos: new Set() });

const fruta = (rng) => { const u = rng(); return u < 0.5 ? "1" : u < 0.8 ? "2" : "3"; };
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

// Una oleada de n carriles. jl = carril del jefe (-1 si no hay). forzar = oleada con 3 tramos (no se puede cortar toda con 2 cortes sin cruzar una bomba).
function oleada(n, rng, jl, forzar) {
  const pF = acotar(3.4 / n, 0.25, 0.5), pB = forzar ? 0.3 : acotar(1.4 / n, 0.1, 0.25);
  for (let intento = 0; intento < 400; intento++) {
    const a = new Array(n).fill(".");
    if (jl >= 0) a[jl] = "J";
    for (let i = 0; i < n; i++) if (a[i] === ".") { const u = rng(); if (u < pB) a[i] = "b"; else if (u < pB + pF) a[i] = fruta(rng); }
    const s = a.join(""), g = grupos(s);
    if ((forzar ? g === 3 : g >= 1 && g <= 2) && (jl >= 0 || /[123]/.test(s))) return s;
  }
  return null;
}

// Un nivel de n carriles y la clase pedida (0 fácil, 1 medio, 2 difícil). Devuelve { texto, perdidas, maximo, cortes }.
export function fabricar(n, clase, rng, ctx) {
  for (let intento = 0; intento < 600; intento++) {
    const jl = rng.entero(n), forzadas = new Set();
    while (forzadas.size < clase) forzadas.add(rng.entero(OLEADAS)); // «clase» oleadas difíciles, repartidas al azar (también entre las del jefe)
    const ondas = [];
    for (let w = 0; w < OLEADAS; w++) ondas.push(oleada(n, rng, w >= OLEADAS_NORMALES ? jl : -1, forzadas.has(w)));
    if (ondas.includes(null)) continue;
    const nivel = { n, ondas };
    if (validar(nivel)) continue;
    const texto = aTexto(nivel);
    if (ctx.vistos.has(texto)) continue;
    const r = resolver(nivel);
    if (!r || r.perdidas !== clase) continue;
    ctx.vistos.add(texto);
    return { texto, perdidas: r.perdidas, maximo: r.maximo, cortes: r.cortes };
  }
  throw new Error("fabricar: no se pudo hacer un nivel de " + n + " carriles y clase " + clase);
}
