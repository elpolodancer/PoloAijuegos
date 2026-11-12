// Ruta: polocubos/logica-polocubos.js
// Reglas de Polocubos, sin pantalla ni document (se puede probar en Node).
// Tablero n×n. Las paredes viven en dos listas:
//   H[r*n + c]       pared horizontal ARRIBA de la fila r (r = 0..n)   → borde superior del cuadro (r,c) y borde inferior del (r-1,c)
//   V[r*(n+1) + c]   pared vertical a la IZQUIERDA de la columna c (c = 0..n) → borde izquierdo del cuadro (r,c) y derecho del (r,c-1)
// Un cuadro está «cerrado» cuando tiene sus 4 paredes. Para tableros enormes (hasta 500×500) se lleva la cuenta de paredes por cuadro (cnt)
// y listas de lo que ya está puesto (LH, LV, LC): así dibujar y buscar jugadas del bot no recorre los 250 000 cuadros cada vez.

export const AJUSTES = {
  puntosInicio: 100, // puntos por defecto al empezar (el jugador puede elegir entre PUNTOS_INICIO). Al empezar se colocan solos
                     // en cuadros al azar (sorteo) y el jugador se queda con puntosJugar
  puntosJugar: 2,    // puntos con los que se juega al empezar (el resto de puntosInicio se sortea automáticamente)
  autoSorteo: 100,   // cada vez que alguien junta esta cantidad, se gasta sola en sortear cuadros al azar
  maxInicial: 0.6,   // al empezar, como máximo esta fracción de la hoja se llena con el sorteo automático (hojas chicas)
  costoPared: 1,     // poner una pared a mano
  costoSorteo: 2,    // puntos que vale un cuadro sorteado AUTOMÁTICAMENTE (los puntos se convierten solos en cuadros al azar)
  premioCuadro: 2,   // puntos que da cerrar un cuadro poniendo 2 o más paredes tuyas (con 3 o 4 paredes tuyas también son 2: te cuesta más de lo que paga)
  cubosPorUnaPared: 1, // cerrar un cuadro poniendo UNA sola pared: ganas 1 «cubo aleatorio» (se coloca con el botón Sortear) y recuperas esa pared
};
export const PUNTOS_INICIO = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

// Tamaños de hoja del Modo libre. Los 5 primeros son las dificultades estándar; los 3 últimos son hojas gigantes.
export const DIFICULTADES = [
  { id: "muyfacil", nombre: "Muy fácil", icono: "🌱", clase: "b-verde", n: 12 },
  { id: "facil", nombre: "Fácil", icono: "✏️", clase: "b-azul", n: 20 },
  { id: "normal", nombre: "Normal", icono: "📐", clase: "b-morado", n: 30 },
  { id: "dificil", nombre: "Difícil", icono: "🔥", clase: "b-oro", n: 40 },
  { id: "experto", nombre: "Experto", icono: "🏆", clase: "b-rojo", n: 50 },
  { id: "gigante", nombre: "Gigante", icono: "🌋", clase: "b-rojo", n: 100 },
  { id: "enorme", nombre: "Enorme", icono: "🌌", clase: "b-rojo", n: 200 },
  { id: "colosal", nombre: "Colosal", icono: "🪐", clase: "b-rojo", n: 500 },
];

export function crearTablero(n) {
  return {
    n, H: new Uint8Array((n + 1) * n), V: new Uint8Array(n * (n + 1)),
    HD: new Uint8Array((n + 1) * n), VD: new Uint8Array(n * (n + 1)), // quién puso cada pared y sigue «vigente»: 0 = nadie/sorteo/ya usada, 1 = tú, 2 = bot
    cnt: new Uint8Array(n * n),        // paredes que tiene cada cuadro (0..4)
    cerradas: new Uint8Array(n * n), cuadros: 0,
    dueno: new Uint8Array(n * n),      // quién cerró cada cuadro: 0 = sorteo/rebote, 1 = tú, 2 = bot
    tres: new Set(),                   // cuadros con 3 paredes (a uno de cerrarse)
    LH: [], LV: [], LC: [],            // índices de paredes H, paredes V y cuadros cerrados (para dibujar)
  };
}

const iH = (t, r, c) => r * t.n + c;
const iV = (t, r, c) => r * (t.n + 1) + c;
export const hayPared = (t, tipo, r, c) => !!(tipo === "H" ? t.H[iH(t, r, c)] : t.V[iV(t, r, c)]);
export const cuadroCompleto = (t, r, c) => !!(t.H[iH(t, r, c)] && t.H[iH(t, r + 1, c)] && t.V[iV(t, r, c)] && t.V[iV(t, r, c + 1)]);

// Cuadros a los lados de una pared (solo los que existen en el tablero)
export function vecinosDePared(t, tipo, r, c) {
  const v = tipo === "H" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
  return v.filter(([a, b]) => a >= 0 && b >= 0 && a < t.n && b < t.n).map(([a, b]) => a * t.n + b);
}

// Pone una pared. Devuelve null si ya existía, o la lista de cuadros (índice r*n+c) que esta pared acaba de cerrar (puede ser []).
// «quien» (1 = tú, 2 = bot, 0 = sorteo) queda anotado en la pared para calcular el premio de los cuadros que cierre.
export function ponerPared(t, tipo, r, c, quien = 0) {
  const i = tipo === "H" ? iH(t, r, c) : iV(t, r, c);
  const lista = tipo === "H" ? t.H : t.V;
  if (lista[i]) return null;
  lista[i] = 1;
  (tipo === "H" ? t.HD : t.VD)[i] = quien;
  (tipo === "H" ? t.LH : t.LV).push(i);
  const nuevos = [];
  for (const k of vecinosDePared(t, tipo, r, c)) {
    const n = ++t.cnt[k];
    if (n === 3) t.tres.add(k);
    else if (n === 4) { t.tres.delete(k); t.cerradas[k] = 1; t.cuadros++; t.LC.push(k); nuevos.push(k); }
  }
  return nuevos;
}

// La pared que le falta a un cuadro de 3 paredes: { tipo, r, c }
export function paredFaltante(t, k) {
  const r = Math.floor(k / t.n), c = k % t.n;
  if (!t.H[iH(t, r, c)]) return { tipo: "H", r, c };
  if (!t.H[iH(t, r + 1, c)]) return { tipo: "H", r: r + 1, c };
  if (!t.V[iV(t, r, c)]) return { tipo: "V", r, c };
  return { tipo: "V", r, c: c + 1 };
}

// Sortea «cantidad» cuadros que aún no estén cerrados y les dibuja sus 4 paredes. Devuelve cuántos sorteó de verdad.
// (Si una pared ya estaba, no pasa nada: el precio es el mismo. Los cuadros que se cierren «de rebote» no dan premio.)
export function sortear(t, cantidad, rng = Math.random) {
  const libres = [];
  for (let k = 0; k < t.n * t.n; k++) if (!t.cerradas[k]) libres.push(k);
  let hechos = 0;
  for (let i = 0; i < libres.length && hechos < cantidad; i++) {
    const j = i + Math.floor(rng() * (libres.length - i)); // mezcla solo lo que se necesita (rápido en hojas de 250 000 cuadros)
    [libres[i], libres[j]] = [libres[j], libres[i]];
    const k = libres[i];
    if (t.cerradas[k]) continue; // se cerró de rebote al sortear otro
    const r = Math.floor(k / t.n), c = k % t.n;
    const cerrados = [ponerPared(t, "H", r, c), ponerPared(t, "H", r + 1, c), ponerPared(t, "V", r, c), ponerPared(t, "V", r, c + 1)].flatMap((x) => x || []);
    for (const q of cerrados) gastarParedes(t, q); // los cuadros cerrados por el sorteo también dejan de contar sus paredes
    hechos++;
  }
  return hechos;
}

export const completo = (t) => t.cuadros === t.n * t.n;

// ----- Premios por cerrar cuadros a mano -----
// Se cuenta cuántas de las 4 paredes del cuadro puso quien lo cierra (y siguen «vigentes»):
//   1 pared  → +1 cubo aleatorio y recupera esa pared (+costoPared punto)
//   2 o más  → +premioCuadro puntos (2)   (con 3 paredes propias gastó 3 y cobra 2: pierde 1)
// En cuanto un cuadro se cierra, sus 4 paredes se «gastan»: dejan de contar (sean de quien sean) para los cuadros vecinos.
function paredesDe(t, k) {
  const r = Math.floor(k / t.n), c = k % t.n;
  return [[t.HD, iH(t, r, c)], [t.HD, iH(t, r + 1, c)], [t.VD, iV(t, r, c)], [t.VD, iV(t, r, c + 1)]];
}
export function paredesPropias(t, k, quien) {
  let m = 0;
  for (const [lista, i] of paredesDe(t, k)) if (lista[i] === quien) m++;
  return m;
}
export function gastarParedes(t, k) {
  for (const [lista, i] of paredesDe(t, k)) lista[i] = 0;
}
// «cerrados» = lo que devolvió ponerPared. Devuelve { puntos, cubos } a sumar. Si una misma pared cierra dos cuadros,
// cada uno paga por su cuenta, pero el reembolso de la pared se da una sola vez.
export function premiarCierre(t, cerrados, quien) {
  const propias = cerrados.map((k) => paredesPropias(t, k, quien)); // se cuentan TODAS antes de gastar, por si dos cuadros comparten pared
  let puntos = 0, cubos = 0, reembolso = false;
  for (const m of propias) {
    if (m <= 1) { cubos += AJUSTES.cubosPorUnaPared; reembolso = true; }
    else puntos += AJUSTES.premioCuadro;
  }
  if (reembolso) puntos += AJUSTES.costoPared;
  for (const k of cerrados) gastarParedes(t, k);
  return { puntos, cubos };
}
