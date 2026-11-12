// Ruta: ataqueglobal/investigacion-ataqueglobal.js
// Las mejoras de investigación de Ataque Global (README-ataqueglobal.md, sección 5.3). Solo datos y reglas: no usa document ni nada de la pantalla.
// 8 mejoras: las 4 primeras están disponibles desde el inicio y cada una desbloquea una de las 4 siguientes (1→5, 2→6, 3→7, 4→8).
// Con las 8 completas se desbloquean las superarmas (3 minutos cada una).

export const MS_MEJORA = 60000;      // 1 minuto
export const MS_SUPERARMA = 180000;  // 3 minutos

// n = número de la mejora (el mismo del README); req = mejoras que hay que tener antes
export const MEJORAS = [
  { n: 1, nombre: "Eficiencia defensiva mejorada", req: [], ms: MS_MEJORA, texto: "−20 % en tiempos de construcción y espera; construyes 2 misiles de crucero a la vez." },
  { n: 2, nombre: "Tecnología de misiles mejorada", req: [], ms: MS_MEJORA, texto: "Desbloquea el misil de nivel 2." },
  { n: 3, nombre: "Inteligencia mejorada", req: [], ms: MS_MEJORA, texto: "La niebla de guerra retrocede: ves el 50 % del planeta. Aviso justo antes de una detonación en tus países." },
  { n: 4, nombre: "Infraestructura mejorada", req: [], ms: MS_MEJORA, texto: "−50 % en el tiempo de conquista y +50 % de puntos de impacto por país." },
  { n: 5, nombre: "Eficiencia defensiva superior", req: [1], ms: MS_MEJORA, texto: "−20 % más en tiempos; el SDA se activa solo cuando un misil sobrevuela un país aliado." },
  { n: 6, nombre: "Tecnología de misiles superior", req: [2], ms: MS_MEJORA, texto: "Desbloquea el misil de nivel 3 (intercontinental)." },
  { n: 7, nombre: "Inteligencia superior", req: [3], ms: MS_MEJORA, texto: "Visión del 100 % (sin niebla), espionaje y cálculo avanzado del punto de impacto." },
  { n: 8, nombre: "Resiliencia suprema", req: [4], ms: MS_MEJORA, texto: "Nueva base de misiles: más capacidad de almacenaje por país." },
];
// Superarmas: se desbloquean cuando las 8 mejoras están completas (la lista de las 18 superarmas está pendiente en el README)
const TODAS_LAS_MEJORAS = MEJORAS.map((m) => m.n);
export const SUPERARMAS = [
  { n: 9, nombre: "Primera superarma", req: TODAS_LAS_MEJORAS, ms: MS_SUPERARMA, texto: "La primera de las 2 superarmas de la partida. Tarda 3 minutos." },
  { n: 10, nombre: "Segunda superarma", req: TODAS_LAS_MEJORAS, ms: MS_SUPERARMA, texto: "La segunda de las 2 superarmas de la partida. Tarda 3 minutos." },
];
export const TODAS = [...MEJORAS, ...SUPERARMAS];
export const porNumero = (n) => TODAS.find((m) => m.n === n) || null;

// hechas: Set de números ya investigados; enCurso: Set (o Map) de números que se están investigando ahora.
// Devuelve "lista" | "curso" | "disponible" | "bloqueada"
export function estadoMejora(m, hechas, enCurso) {
  if (hechas.has(m.n)) return "lista";
  if (enCurso && enCurso.has(m.n)) return "curso";
  return m.req.every((r) => hechas.has(r)) ? "disponible" : "bloqueada";
}
// Nombres de lo que todavía falta para poder investigarla
export function faltan(m, hechas) {
  return m.req.filter((r) => !hechas.has(r)).map((r) => porNumero(r).nombre);
}
export const basicasCompletas = (hechas) => MEJORAS.every((m) => hechas.has(m.n));
