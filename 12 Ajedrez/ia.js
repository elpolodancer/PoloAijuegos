// Ruta: ajedrez/ia.js
// Motor de la computadora: búsqueda alfa-beta con profundización iterativa y límite de tiempo.
// Cada nivel (en juego.js) da: prof (profundidad máxima), tiempo (ms), azar (probabilidad de jugar
// una jugada al azar) y ruido (variación aleatoria de la evaluación, para que no juegue siempre igual).
import { PEON, REY, generar, hacer, deshacer, enJaque, legales } from "./logica.js";

const VAL = [0, 100, 320, 330, 500, 900, 0];
const MATE = 100000, INF = 1000000;

// Tablas de posición desde el punto de vista de las blancas (fila 0 = octava fila)
const PST = [null,
  [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
   0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
   -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10,
   -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5,
   -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5,
   0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
];
const REY_MEDIO = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10,
  20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
const REY_FINAL = [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30,
  -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30,
  -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];

// Evaluación desde el punto de vista de quien mueve
function evaluar(e) {
  const b = e.b;
  let mat = 0, s = 0;
  for (let i = 0; i < 64; i++) {
    const t = Math.abs(b[i]);
    if (t > PEON && t < REY) mat += VAL[t];
  }
  const tabRey = mat <= 2600 ? REY_FINAL : REY_MEDIO;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const t = Math.abs(p), c = p > 0 ? 1 : -1, idx = c === 1 ? i : i ^ 56;
    s += c * (VAL[t] + (t === REY ? tabRey[idx] : PST[t][idx]));
  }
  return e.turno * s;
}

let nodos, limite, abortado;

function ordenar(ms, b, primera) {
  for (const m of ms) {
    const v = b[m.a];
    let o = v ? 10 * VAL[Math.abs(v)] - Math.abs(b[m.de]) : 0;
    if (m.ep) o = 999;
    if (m.prom) o += VAL[m.prom];
    if (primera && m.de === primera.de && m.a === primera.a && m.prom === primera.prom) o += 1e6;
    m.o = o;
  }
  ms.sort((x, y) => y.o - x.o);
}

function tiempoAgotado() {
  if ((++nodos & 2047) === 0 && Date.now() > limite) abortado = true;
  return abortado;
}

function quies(e, alfa, beta) {
  if (tiempoAgotado()) return 0;
  const est = evaluar(e);
  if (est >= beta) return est;
  if (est > alfa) alfa = est;
  const ms = generar(e, true), c = e.turno;
  ordenar(ms, e.b, null);
  for (const m of ms) {
    const u = hacer(e, m);
    if (enJaque(e, c)) { deshacer(e, u); continue; }
    const v = -quies(e, -beta, -alfa);
    deshacer(e, u);
    if (abortado) return 0;
    if (v >= beta) return v;
    if (v > alfa) alfa = v;
  }
  return alfa;
}

function nega(e, prof, alfa, beta, ply) {
  if (tiempoAgotado()) return 0;
  const c = e.turno, jaque = enJaque(e, c);
  if (jaque && ply < 14) prof++;
  if (prof <= 0) return quies(e, alfa, beta);
  if (e.rel >= 100) return 0;
  const ms = generar(e);
  ordenar(ms, e.b, null);
  let n = 0;
  for (const m of ms) {
    const u = hacer(e, m);
    if (enJaque(e, c)) { deshacer(e, u); continue; }
    n++;
    const v = -nega(e, prof - 1, -beta, -alfa, ply + 1);
    deshacer(e, u);
    if (abortado) return 0;
    if (v >= beta) return v;
    if (v > alfa) alfa = v;
  }
  if (!n) return jaque ? -MATE + ply : 0;
  return alfa;
}

// Devuelve la jugada elegida (o null si no hay jugadas). No deja cambios en el estado «e».
export function mejorJugada(e, { prof, tiempo, azar = 0, ruido = 0 }) {
  const raiz = legales(e);
  if (!raiz.length) return null;
  if (raiz.length === 1) return raiz[0];
  if (Math.random() < azar) return raiz[Math.floor(Math.random() * raiz.length)];
  nodos = 0; abortado = false; limite = Date.now() + tiempo;
  let mejor = raiz[0];
  for (let d = 1; d <= prof; d++) {
    ordenar(raiz, e.b, mejor);
    let alfa = -INF, mejorD = null, mejorV = -INF;
    for (const m of raiz) {
      const u = hacer(e, m);
      let v = -nega(e, d - 1, -INF, -alfa, 1);
      deshacer(e, u);
      if (abortado) break;
      v += (Math.random() - 0.5) * ruido;
      if (v > mejorV) { mejorV = v; mejorD = m; }
      if (v > alfa) alfa = v;
    }
    if (abortado) break;
    mejor = mejorD;
    if (mejorV > MATE - 100) break; // mate encontrado
  }
  return mejor;
}
