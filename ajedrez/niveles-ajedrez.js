// Ruta: ajedrez/niveles-ajedrez.js
// Mapa de niveles del ajedrez: 100 niveles por estado y por país = 32×100 (México, 3 200) + 194×100 (mundo, 19 400) = 22 600.
// Progreso { max, hecho } en localStorage; juego-ajedrez.js lo sincroniza con la cuenta (conectar, id «ajedrez-mapa»).
// NO cambiar el orden de estados/países ni porEtapa después de publicar (cambia qué nivel es cuál y rompe el progreso).
import { crearEtapas } from "../compartido/etapas-mapa.js";

export const ETAPAS = crearEtapas({ porEtapa: 100 });
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
// ===== Contenido de los niveles (etapa 1 = Quintana Roo, niveles 1-100; por ahora hay 21) =====
// Ejercicio de enseñanza: solo mueven las blancas (las negras no responden). Meta: llegar:"e4" | limpiar:true (capturar todo lo negro salvo el rey)
// | coronar:true | enroque:true | mate:true. Partida: contra la computadora con el nivel de dificultad «ia» (1-8) y el color del jugador.
const T = (icono, titulo, txt, obj, fen, meta) => ({ tuto: true, icono, titulo, txt, obj, fen: fen.includes(" ") ? fen : fen + " w - - 0 1", meta });
const G = (ia, color, txt) => ({ tuto: false, icono: "⚔️", titulo: "Partida fácil", txt, ia, color });
export const LISTA = [
  // Peón (1-3)
  T("♟", "Peón: avanzar", "El peón avanza una casilla hacia adelante; desde su fila inicial puede avanzar dos. Nunca retrocede.", "Lleva el peón a e4.", "k7/8/8/8/8/8/4P3/4K3", { llegar: "e4" }),
  T("♟", "Peón: capturar", "Avanza recto, pero captura en diagonal, una casilla hacia adelante.", "Captura los dos peones negros.", "k7/8/2p5/3p4/4P3/8/8/4K3", { limpiar: true }),
  T("♟", "Peón: coronar", "Al llegar a la última fila, el peón se convierte en dama, torre, alfil o caballo.", "Lleva el peón a la octava fila y corónalo.", "k7/4P3/8/8/8/8/8/4K3", { coronar: true }),
  // Torre (4-6)
  T("♜", "Torre: líneas rectas", "La torre se mueve en línea recta, las casillas que quieras, en horizontal o en vertical.", "Lleva la torre a h4.", "7k/8/8/8/8/8/8/R3K3", { llegar: "h4" }),
  T("♜", "Torre: no salta", "La torre no puede saltar sobre otras piezas, ni propias ni enemigas.", "Lleva la torre a d4.", "7k/8/8/8/8/P7/P7/R3K3", { llegar: "d4" }),
  T("♜", "Torre: capturar", "La torre captura la primera pieza enemiga que encuentra en su camino.", "Captura los dos peones.", "7k/8/8/3p2p1/8/8/8/3R3K", { limpiar: true }),
  // Caballo (7-9)
  T("♞", "Caballo: la L", "El caballo se mueve en L: dos casillas en una dirección y una hacia un lado.", "Lleva el caballo a e4.", "7k/8/8/8/8/8/8/1N2K3", { llegar: "e4" }),
  T("♞", "Caballo: salta", "Es la única pieza que salta sobre las demás: las piezas que lo rodean no le estorban.", "Lleva el caballo a e5.", "7k/8/8/8/8/8/5PPP/4K1N1", { llegar: "e5" }),
  T("♞", "Caballo: capturar", "Captura en la casilla donde termina su salto.", "Captura los tres peones.", "7k/8/3p4/8/4p3/2p5/8/1N2K3", { limpiar: true }),
  // Alfil (10-12)
  T("♝", "Alfil: diagonales", "El alfil se mueve en diagonal, las casillas que quieras, y siempre se queda en casillas del mismo color.", "Lleva el alfil a e5.", "7k/8/8/8/8/8/8/2B1K3", { llegar: "e5" }),
  T("♝", "Alfil: no salta", "Tampoco salta piezas: si una propia le estorba, hay que apartarla primero.", "Lleva el alfil a b5.", "7k/8/8/8/8/8/4PPPP/4KB2", { llegar: "b5" }),
  T("♝", "Alfil: capturar", "Captura en diagonal la primera pieza enemiga de su camino.", "Captura los tres peones.", "7k/2p5/8/p7/5p2/8/8/2B1K3", { limpiar: true }),
  // Dama (13-15)
  T("♛", "Dama: la más poderosa", "La dama se mueve como torre y alfil a la vez: recto y en diagonal, las casillas que quieras.", "Lleva la dama a a6.", "7k/8/8/8/8/8/8/3QK3", { llegar: "a6" }),
  T("♛", "Dama: capturar", "Captura igual que se mueve: en línea recta o en diagonal.", "Captura los tres peones.", "7k/2p5/8/p2p4/8/8/8/3QK3", { limpiar: true }),
  T("♛", "Dama: jaque mate", "Si el rey enemigo está atacado y no puede escapar, es jaque mate y se acaba la partida.", "Da jaque mate en una jugada.", "7k/Q7/6K1/8/8/8/8/8", { mate: true }),
  // Rey (16-18)
  T("♚", "Rey: un paso", "El rey se mueve una sola casilla en cualquier dirección. Si lo capturan pierdes: ¡cuídalo!", "Lleva el rey a e4.", "7k/8/8/8/8/8/8/4K3", { llegar: "e4" }),
  T("♚", "Rey: capturar", "También captura, pero nunca puede ir a una casilla que el rival ataque.", "Captura los dos peones.", "7k/8/8/8/4p3/4p3/8/4K3", { limpiar: true }),
  T("♚", "Rey: enroque", "Una vez por partida, rey y torre se mueven a la vez: el rey salta dos casillas hacia la torre y esta pasa al otro lado. Solo si no se han movido y no hay piezas ni ataques en medio.", "Haz un enroque (rey a g1 o a c1).", "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1", { enroque: true }),
  // Primeras partidas (19-21)
  G(1, 1, "Da jaque mate a la computadora. Tú juegas con blancas."),
  G(1, -1, "Ahora juegas con negras: la computadora mueve primero."),
  G(2, 1, "Un rival un poco más atento. Cuida tus piezas."),
];
export const datosNivel = (n) => LISTA[n - 1] || null;
