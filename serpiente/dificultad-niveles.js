// Ruta: compartido/dificultad-niveles.js
// REPARTO ESTÁNDAR DE DIFICULTAD de los niveles del mapa (ver sección 8 de ESTANDARES-juegos.md). No usa document ni red.
//
//   Primeros 100 niveles:  50 % fáciles · 40 % normales · 10 % difíciles
//   Últimos 100 niveles:   25 % fáciles · 40 % normales · 35 % difíciles
//   En medio el reparto cambia POCO A POCO (de forma lineal, tramo por tramo de 100 niveles).
//
// Uso en un juego:
//   import { dificultadDeNivel, repartoDeTramo } from "../compartido/dificultad-niveles.js";
//   dificultadDeNivel(n, ETAPAS.total)   // "facil" | "normal" | "dificil"   (n = 1..total)
//   repartoDeTramo(k, ETAPAS.total)      // { facil, normal, dificil } en cantidad de niveles de ese tramo de 100 (suman 100)
//
// - Un «tramo» son 100 niveles seguidos (niveles 1-100, 101-200…), da igual cuántos niveles tenga cada etapa del mapa.
// - Dentro de cada tramo los fáciles, normales y difíciles van REVUELTOS, pero siempre igual para todos los jugadores
//   (el orden sale de una semilla fija). Si ya hay jugadores con progreso, no cambies estas cifras ni la semilla después de publicar.
// - Qué significa «fácil», «normal» y «difícil» lo decide cada juego (tamaño del tablero, tiempo, enemigos…).
//   Esto es independiente de las 5 dificultades del Modo libre (Muy fácil … Experto).
// - Si el juego tiene muy pocos niveles (menos de 200) el reparto es el del principio.

export const INICIO = { facil: 0.5, normal: 0.4, dificil: 0.1 };  // primer tramo de 100 niveles
export const FINAL = { facil: 0.25, normal: 0.4, dificil: 0.35 }; // último tramo de 100 niveles
export const TRAMO = 100;

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

function mulberry32(a) { // generador con semilla: mismos números para todos
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const cantidadTramos = (total) => Math.max(1, Math.ceil(total / TRAMO));

// Cuántos niveles fáciles, normales y difíciles hay en el tramo k (0 = primero). Siempre suman TRAMO.
export function repartoDeTramo(k, total) {
  const n = cantidadTramos(total);
  const t = n > 1 ? acotar(k, 0, n - 1) / (n - 1) : 0; // 0 = principio, 1 = final
  const facil = Math.round(TRAMO * (INICIO.facil + (FINAL.facil - INICIO.facil) * t));
  const dificil = Math.round(TRAMO * (INICIO.dificil + (FINAL.dificil - INICIO.dificil) * t));
  return { facil, normal: TRAMO - facil - dificil, dificil };
}

const memoria = new Map(); // tramo → lista de 100 dificultades ya revueltas
function listaDeTramo(k, total) {
  const clave = k + ":" + cantidadTramos(total);
  let lista = memoria.get(clave);
  if (!lista) {
    const r = repartoDeTramo(k, total);
    lista = [...Array(r.facil).fill("facil"), ...Array(r.normal).fill("normal"), ...Array(r.dificil).fill("dificil")];
    const azar = mulberry32(k * 7919 + 12345);
    for (let i = lista.length - 1; i > 0; i--) { // Fisher-Yates con la semilla del tramo
      const j = Math.floor(azar() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    memoria.set(clave, lista);
  }
  return lista;
}

// Dificultad del nivel n (1..total): "facil" | "normal" | "dificil"
export function dificultadDeNivel(n, total) {
  n = acotar(Math.floor(Number(n)) || 1, 1, Math.max(1, total));
  return listaDeTramo(Math.floor((n - 1) / TRAMO), total)[(n - 1) % TRAMO];
}
