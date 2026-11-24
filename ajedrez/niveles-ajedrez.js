// Ruta: ajedrez/niveles-ajedrez.js
// Mapa de niveles del ajedrez (estándar «mapa solo de países», ESTANDARES-juegos.md sección 4A-bis): 195 países × 20 niveles = 3 900 niveles.
// México es el país 1 (niveles 1-20) y el orden de los países es el fijo de PAISES_MUNDO (compartido/etapas-mapa.js).
// Progreso { max, hecho } en localStorage; juego-ajedrez.js lo sincroniza con la cuenta (conectar, id «ajedrez-mapa»).
// NO cambiar el orden de los países ni porEtapa después de publicar (cambia qué nivel es cuál y rompe el progreso).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { PEON, ALFIL, TORRE } from "./logica-ajedrez.js";

export const ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900
export const CLAVE_MAPA = "ajedrez:mapa";

export function leerMapa() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(CLAVE_MAPA)); } catch (e) {}
  const t = ETAPAS.total;
  const hecho = Math.min(t, Math.max(0, Math.floor(Number(p && p.hecho)) || 0));
  const max = Math.min(t, Math.max(hecho + 1, Math.floor(Number(p && p.max)) || 1));
  return { max, hecho };
}
// Marca el nivel n como superado y abre el siguiente
export function superarNivel(n) {
  const a = leerMapa();
  if (!(n >= 1) || n > a.max) return;
  const p = { hecho: Math.max(a.hecho, n), max: Math.min(ETAPAS.total, Math.max(a.max, n + 1)) };
  try { localStorage.setItem(CLAVE_MAPA, JSON.stringify(p)); } catch (e) {}
}
// Une el progreso local con el de la nube: gana el más alto de cada marca
export const fusionarMapa = (a, b) => (!a && !b ? null : {
  max: Math.max(Number(a && a.max) || 1, Number(b && b.max) || 1),
  hecho: Math.max(Number(a && a.hecho) || 0, Number(b && b.hecho) || 0),
});
// ===== Contenido de los niveles (país 1 = México, niveles 1-20). 24 nov 2026: se borraron los 21 niveles anteriores; estos son los nuevos, de uno en uno =====
// Dos tipos de ejercicio, y en los dos el rival NO mueve nunca:
//  · Práctica (P): tablero completo, el jugador es blancas. Solo se mueven las piezas de «mueven» (los números de pieza de logica-ajedrez.js); no hay coronación, enroque ni «al paso».
//    El nivel se supera la primera vez que el jugador captura una pieza rival con la pieza de «capturaCon»; después puede seguir practicando y el botón «Siguiente nivel» queda a la vista.
//  · Colocar (C): un solo caballo en el centro («centro») y sus casillas posibles en sombra. Al poner el caballo en una sombra queda fijo y sale otro caballo en el centro; se supera al llenar todas.
// Meta (campo «meta»): capturaCon:<pieza> | centro:"e4" | (para ejercicios sueltos que se agreguen) llegar:"e4" | limpiar:true | coronar:true | enroque:true | mate:true.
// Partida: contra la computadora con el nivel de dificultad «ia» (1-5) y el color del jugador (constructor G, todavía sin usar).
const INICIO_PRACTICA = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1";
const P = (icono, titulo, txt, obj, mueven, capturaCon) => ({ tuto: true, icono, titulo, txt, obj, fen: INICIO_PRACTICA, mueven, meta: { capturaCon } });
const C = (icono, titulo, txt, obj, fen, centro) => ({ tuto: true, icono, titulo, txt, obj, fen, meta: { centro } });
const G = (ia, color, txt) => ({ tuto: false, icono: "⚔️", titulo: "Partida fácil", txt, ia, color });
export const LISTA = [
  P("♟", "Peones", "El peón avanza una casilla (dos desde su fila inicial) y captura en diagonal. Las demás piezas no se mueven y el rival tampoco: experimenta. Come una pieza para pasar de nivel.", "Mueve los peones", [PEON], PEON),
  P("♜", "Torres", "Abre camino con los peones y saca las torres. La torre se mueve en línea recta y no salta piezas. Come una pieza con la torre para pasar de nivel.", "Mueve las torres", [PEON, TORRE], TORRE),
  P("♝", "Alfiles", "Abre camino con los peones y saca los alfiles. El alfil se mueve en diagonal y no salta piezas. Come una pieza con el alfil para pasar de nivel.", "Mueve los alfiles", [PEON, ALFIL], ALFIL),
  C("♞", "Caballo", "El caballo salta en L. Las sombras marcan a dónde puede ir: ponlo en cada una. Las piezas colocadas ya no se mueven y aparece otro caballo en el centro.", "Coloca el caballo en cada casilla marcada", "8/8/8/8/4N3/8/8/8 w - - 0 1", "e4"),
];
export const datosNivel = (n) => LISTA[n - 1] || null;
