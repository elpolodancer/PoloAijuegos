// Ruta: naves/ia-naves.js
// BOTS de «Naves»: comprueban que un nivel SE PUEDE PASAR buscando una secuencia de movimientos con BACKTRACKING.
//
// Cómo funciona (búsqueda en profundidad con retroceso):
//   • Cada 12 pasos (0.2 s) el bot elige hacia dónde mover la nave: 5 opciones (quieta, medio paso o paso completo a cada lado;
//     el paso completo es lo máximo que la nave puede moverse en ese tiempo, así que el bot no hace nada que una persona no pueda).
//   • En cada nodo simula las 5 opciones sobre copias del estado (clonar + paso), descarta las que ya perdieron
//     (se quedó sin vidas, dejó pasar demasiados enemigos…) y ordena el resto de mejor a peor con valor().
//   • Prueba primero la mejor. Si más adelante todo termina mal, RETROCEDE al nodo anterior y prueba la siguiente opción.
//   • Estados repetidos (misma posición, mismos enemigos…) no se vuelven a explorar. Hay un tope de nodos para no colgarse.
//   • Éxito = llegó al final del nivel con al menos «vidasMin» vidas y como mucho «fugasMax» fugas. Pedir más que «sobrevivir»
//     deja margen para que una persona (que no es perfecta) también pueda.
// No usa document: corre igual en el navegador y en Node (verificar-naves.mjs).
import { crearEstado, clonar, paso, VEL_NAVE, TPS, Y_NAVE, Y_BASE, W, acotar } from "./logica-naves.js";

export const K = 12;                          // pasos por decisión
const MOV = (VEL_NAVE * K) / TPS;             // lo máximo que se mueve la nave en una decisión (72 px)
const OPC = [0, -MOV, MOV, -MOV / 2, MOV / 2];

function hijo(S, niv, tx) {
  const C = clonar(S);
  for (let i = 0; i < K && !C.fin; i++) paso(C, niv, tx);
  return C;
}

// Qué tan buena es la jugada que llevó del estado P al estado C (más es mejor). Solo sirve para ORDENAR; la decisión final la da la búsqueda.
function valor(P, C, niv) {
  let v = (C.muertos - P.muertos) * 10 - (P.vidas - C.vidas) * 500 - (C.fugas - P.fugas) * 150;
  const sigma = 14 + niv.arma.balas * 10;
  for (const e of C.enem) {
    if (e.y < 0) continue;
    const f = e.y / Y_BASE, dx = e.x - C.x;
    v -= f * f * f * 6 * (e.hp / e.hpm);                                   // enemigos cerca de la base molestan
    v += 0.8 * (1 + f * 2) * Math.exp(-(dx * dx) / (2 * sigma * sigma));   // enemigos delante de mis balas ayudan
    if (Math.abs(e.y - Y_NAVE) < 90 && Math.abs(dx) < e.r + 30) v -= 25;  // enemigo a punto de chocar
  }
  for (const b of C.malas) if (b.y > Y_NAVE - 110 && Math.abs(b.x - C.x) < 22) v -= 20;
  return v;
}

const clave = (C) => C.tk + "|" + Math.round(C.x / (MOV / 2)) + "|" + C.vidas + "|" + C.fugas + "|" + C.muertos + "|" + C.enem.length + "|" + C.balas.length + "|" + C.malas.length;

// Devuelve { ok, nodos, retrocesos, vidas, fugas, tk, camino } (camino = x objetivo de cada decisión, por si quieres repetirla)
export function verificar(niv, o = {}) {
  const vidasMin = o.vidasMin ?? 3, fugasMax = o.fugasMax ?? 5, limite = o.limite ?? 150000;
  const visto = new Set();
  let nodos = 0, retro = 0;

  function nodo(S) {
    const hijos = [], usados = new Set();
    for (const d of OPC) {
      const tx = acotar(S.x + d, 18, W - 18);
      if (usados.has(tx)) continue;
      usados.add(tx);
      const C = hijo(S, niv, tx);
      if (C.fin === -1 || C.vidas < vidasMin || C.fugas > fugasMax) continue; // jugada perdedora: no se explora
      hijos.push({ C, tx, v: valor(S, C, niv) });
    }
    hijos.sort((a, b) => b.v - a.v);
    return { S, hijos, i: 0, tx: 0 };
  }

  const raiz = nodo(crearEstado(niv));
  const pila = [raiz];
  while (pila.length) {
    const top = pila[pila.length - 1];
    if (top.i >= top.hijos.length) { pila.pop(); retro++; continue; } // callejón sin salida: retrocede
    const h = top.hijos[top.i++];
    top.tx = h.tx;
    if (h.C.fin === 1) {
      return { ok: true, nodos, retrocesos: retro, vidas: h.C.vidas, fugas: h.C.fugas, tk: h.C.tk, camino: pila.map((x) => x.tx) };
    }
    const k = clave(h.C);
    if (visto.has(k)) continue;
    visto.add(k);
    if (++nodos > limite) return { ok: false, nodos, retrocesos: retro, tope: true };
    pila.push(nodo(h.C));
  }
  return { ok: false, nodos, retrocesos: retro, tope: false };
}
