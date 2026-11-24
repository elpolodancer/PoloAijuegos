// Ruta: agua/dificultad-agua.js
// Qué dificultad (fácil, medio o difícil) tiene cada uno de los 3 900 niveles. Solo datos: no usa document ni Firebase.
//
// Reparto estándar (ESTANDARES-juegos.md, sección 8): la dificultad cambia por TRAMOS de 100 niveles (con 20 niveles por país, un tramo = 5 países;
// 3 900 niveles = 39 tramos). Cada tramo tiene un reparto EXACTO que cambia poco a poco del primero al último:
//     primeros 100 niveles:  50 fáciles · 40 medios · 10 difíciles
//     últimos 100 niveles:   25 fáciles · 40 medios · 35 difíciles
// Los medios se quedan en 40; los fáciles bajan y los difíciles suben en línea recta a lo largo de los 39 tramos.
// Dentro del tramo los niveles van revueltos pero de forma pareja (cada grupo de 10 trae su parte de cada tipo, sin rachas largas) y SIEMPRE igual
// para todos los jugadores (no usa Math.random). El primer nivel de cada país (cada 20) es siempre fácil (entrada suave a cada país): para lograrlo
// se intercambia con otro fácil del MISMO grupo de 10, así el reparto exacto de cada grupo no cambia.
// Si ya hay jugadores con progreso, NO cambies estas cifras ni la semilla después de publicar: cambiarían los niveles ya jugados.
//
// Uso:  import { dificultadNivel } from "./dificultad-agua.js";   dificultadNivel(150)  →  "facil" | "medio" | "dificil"
import { POR_ETAPA, TOTAL } from "./economia-agua.js";

export const NUM_ETAPAS = TOTAL / POR_ETAPA;   // 195 países
export const POR_TRAMO = 100;                  // niveles de un tramo de dificultad (no depende de POR_ETAPA)
export const NUM_TRAMOS = TOTAL / POR_TRAMO;   // 39
export const DIF = {
  facil: { nombre: "Fácil", icono: "🟢", clase: "b-verde" },
  medio: { nombre: "Medio", icono: "🔵", clase: "b-azul" },
  dificil: { nombre: "Difícil", icono: "🔴", clase: "b-rojo" },
};

// Porcentajes del primer y del último tramo (el medio es lo que sobra: 40 %)
const INICIO = { facil: 50, medio: 40 };
const FINAL = { facil: 25, medio: 40 };
const GRUPOS = 10;                 // el tramo se reparte en grupos de 10 niveles
const TAM = POR_TRAMO / GRUPOS;

// Cuántos niveles fáciles, medios y difíciles tiene el tramo k (0 = primero, 38 = último)
export function distribucionTramo(k) {
  k = Math.min(NUM_TRAMOS - 1, Math.max(0, Math.floor(Number(k)) || 0));
  const t = NUM_TRAMOS > 1 ? k / (NUM_TRAMOS - 1) : 0;
  const facil = Math.round((INICIO.facil + (FINAL.facil - INICIO.facil) * t) * POR_TRAMO / 100);
  const medio = Math.round((INICIO.medio + (FINAL.medio - INICIO.medio) * t) * POR_TRAMO / 100);
  return { facil, medio, dificil: POR_TRAMO - facil - medio };
}

// Generador de números al azar con semilla (mulberry32): mismo resultado siempre
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();
// Lista de los 100 tipos de un tramo, en orden de nivel
function tiposTramo(k) {
  if (cache.has(k)) return cache.get(k);
  const { facil, dificil } = distribucionTramo(k);
  const rnd = azar(0x9e3779b1 ^ (k * 7919 + 1));
  const r = [];
  let af = 0, ad = 0;
  for (let g = 1; g <= GRUPOS; g++) {
    const cf = Math.round((facil * g) / GRUPOS), cd = Math.round((dificil * g) / GRUPOS); // reparto acumulado: reparte bien los redondeos
    const nf = cf - af, nd = cd - ad, nm = TAM - nf - nd;
    af = cf; ad = cd;
    const grupo = [...Array(nf).fill("facil"), ...Array(nd).fill("dificil"), ...Array(nm).fill("medio")];
    for (let i = grupo.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [grupo[i], grupo[j]] = [grupo[j], grupo[i]]; }
    r.push(...grupo);
  }
  // El primer nivel de cada país (posiciones 0, 20, 40, 60 y 80 del tramo) es fácil: se cambia por un fácil del mismo grupo de 10
  for (let p = 0; p < POR_TRAMO; p += POR_ETAPA) {
    if (r[p] === "facil") continue;
    const g0 = p - (p % TAM);
    for (let j = g0; j < g0 + TAM; j++) if (j !== p && r[j] === "facil") { [r[p], r[j]] = [r[j], r[p]]; break; }
  }
  cache.set(k, r);
  return r;
}

// Dificultad del nivel n (1 a 3 900): "facil" | "medio" | "dificil"
export function dificultadNivel(n) {
  n = Math.min(TOTAL, Math.max(1, Math.floor(Number(n)) || 1));
  return tiposTramo(Math.floor((n - 1) / POR_TRAMO))[(n - 1) % POR_TRAMO];
}
// Cuántos hay de cada tipo en todo el juego
export function resumenTotal() {
  const r = { facil: 0, medio: 0, dificil: 0 };
  for (let k = 0; k < NUM_TRAMOS; k++) { const d = distribucionTramo(k); r.facil += d.facil; r.medio += d.medio; r.dificil += d.dificil; }
  return r;
}
