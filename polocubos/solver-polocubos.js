// Ruta: polocubos/solver-polocubos.js
// Bot de BACKTRACKING de Polocubos. Sin pantalla ni document (se puede probar en Node).
// Juega como jugador (dueño 1) sobre COPIAS del tablero y comprueba cuántos cubos aleatorios se pueden conseguir con las reglas reales
// (ponerPared + premiarCierre): en cada paso prueba las paredes que cierran un cuadro de 3 paredes, de la más prometedora a la menos;
// si un camino se queda sin salida, vuelve atrás y prueba otra. Se detiene en cuanto junta «meta» cubos o se acaba el presupuesto de nodos.
// Lo usa patrones-polocubos.js para asegurar que el tablero inicial deja juntar AJUSTES.tanda cubos (los que hacen falta para poder sortear).
import { clonarTablero, ponerPared, premiarCierre, paredFaltante, vecinosDePared } from "./logica-polocubos.js";

const ANCHO = 3; // cuántas jugadas distintas prueba en cada paso (las mejores)

// Devuelve { cubos: máximo de cubos que logró juntar, cumple: llegó a la meta, nodos: jugadas probadas }
export function botCubos(t0, lineas, meta, { maxNodos = 250 } = {}) {
  let nodos = 0, mejor = 0;

  // Paredes que cierran un cuadro de 3 paredes, ordenadas: primero las que cierran dos cuadros a la vez, luego las que dejan
  // otro cuadro a una pared de cerrarse (así sigue un pasillo de cuadros: cada cierre prepara el siguiente)
  function candidatas(t) {
    const vistas = new Map();
    for (const k of t.tres) {
      const w = paredFaltante(t, k), clave = w.tipo + w.r + "," + w.c;
      if (vistas.has(clave)) continue;
      const vec = vecinosDePared(t, w.tipo, w.r, w.c);
      const cierra = vec.filter((q) => t.cnt[q] === 3).length;
      const sigue = vec.filter((q) => t.cnt[q] === 2).length;
      vistas.set(clave, { ...w, valor: cierra * 10 + sigue });
    }
    return [...vistas.values()].sort((a, b) => b.valor - a.valor).slice(0, ANCHO);
  }

  function dfs(t, lin, cubos) {
    if (cubos > mejor) mejor = cubos;
    if (cubos >= meta) return true;
    if (lin < 1 || nodos >= maxNodos) return false;
    for (const w of candidatas(t)) {
      nodos++;
      const tc = clonarTablero(t);
      const cerrados = ponerPared(tc, w.tipo, w.r, w.c, 1);
      const p = premiarCierre(tc, cerrados, 1);
      if (dfs(tc, lin - 1 + p.puntos, cubos + p.cubos)) return true; // lo normal: el primer camino ya llega
      if (nodos >= maxNodos) return false;
    }
    return false; // sin salida: vuelve atrás
  }

  const cumple = dfs(t0, lineas, 0);
  return { cubos: mejor, cumple, nodos };
}
