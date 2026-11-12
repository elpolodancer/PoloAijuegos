// Ruta: polocubos/ia-polocubos.js
// El bot de Polocubos. Sin pantalla: recibe el tablero y sus puntos y devuelve la jugada.
//   { accion: "pared", tipo, r, c }   o   { accion: "sortear", cantidad }
// Las paredes cuestan puntos; sortear cuesta «cubos aleatorios» (se ganan cerrando un cuadro con una sola pared) y, igual que al jugador,
// solo puede sortear cuando tiene AJUSTES.tanda (20) cubos o más.
// Reglas del bot (a propósito sencillas):
//   0. Si no le quedan puntos para una pared, solo puede sortear con sus cubos.
//   1. Si hay un cuadro con 3 paredes, pone la que falta y lo cierra (así encadena y gana un cubo).
//   2. Si casi no hay cuadros sorteados, sortea unos cuantos.
//   3. Si no, busca una pared «segura» (que no deje un cuadro a una pared de cerrarse, porque se lo regalaría al rival).
//      Si solo hay paredes peligrosas, a veces prefiere sortear un cuadro y si no, pone la menos peligrosa.
import { AJUSTES, hayPared, paredFaltante, vecinosDePared } from "./logica-polocubos.js";

export function jugadaBot(t, puntos, cubos = 0, rng = Math.random) {
  const n = t.n, libres = n * n - t.cuadros;
  const puedeSortear = cubos >= AJUSTES.tanda && libres > 0;
  const cuantos = Math.max(1, Math.min(5, cubos, libres));
  if (puntos < AJUSTES.costoPared) return puedeSortear ? { accion: "sortear", cantidad: cuantos } : null; // solo le quedan cubos (null = no puede jugar)
  if (t.tres.size) return { accion: "pared", ...paredFaltante(t, t.tres.values().next().value) };
  if (puedeSortear && t.cuadros < 5) return { accion: "sortear", cantidad: cuantos };

  let mejor = null, peligroMejor = 9;
  for (let i = 0; i < 300 && peligroMejor > 0; i++) { // prueba 300 paredes al azar
    const tipo = rng() < 0.5 ? "H" : "V";
    const r = Math.floor(rng() * (tipo === "H" ? n + 1 : n)), c = Math.floor(rng() * (tipo === "H" ? n : n + 1));
    if (hayPared(t, tipo, r, c)) continue;
    const peligro = vecinosDePared(t, tipo, r, c).filter((k) => t.cnt[k] === 2).length; // cuadros que quedarían a una pared de cerrarse
    if (peligro < peligroMejor) { peligroMejor = peligro; mejor = { tipo, r, c }; }
  }
  if (!mejor) { // hoja casi llena: busca la primera pared que falte
    for (let r = 0; r <= n && !mejor; r++) for (let c = 0; c < n; c++) if (!hayPared(t, "H", r, c)) { mejor = { tipo: "H", r, c }; break; }
    for (let r = 0; r < n && !mejor; r++) for (let c = 0; c <= n; c++) if (!hayPared(t, "V", r, c)) { mejor = { tipo: "V", r, c }; break; }
  }
  if (peligroMejor > 0 && puedeSortear && rng() < 0.5) return { accion: "sortear", cantidad: 1 };
  return { accion: "pared", ...mejor };
}
