// Ruta: polocubos/patrones-polocubos.js
// Tablero inicial de Polocubos: los cuadros cerrados se sortean AL AZAR (95 % o más) y solo una parte pequeña (AJUSTES.maxPatron = 5 % o menos)
// va en PEINES que ayudan a encontrar cuadros casi terminados. Sin pantalla ni document (se prueba en Node).
//
// Un peine es un bloque de cuadros cerrados que deja «pasillos» libres de 1 cuadro de ancho:
//
//     ■ ■ ■ ■ ■ ■ ■      ■ = cuadro cerrado (sorteado)    □ = pasillo libre
//     ■ □ □ □ □ □ □      El primer □ de cada pasillo ya tiene 3 paredes (arriba, abajo y el fondo): solo le falta UNA.
//     ■ ■ ■ ■ ■ ■ ■      Al cerrarlo con una pared ganas 1 cubo aleatorio y recuperas tu línea; esa pared pasa a ser «gastada»,
//     ■ □ □ □ □ □ □      así que el siguiente □ también queda a una pared de cerrarse... y así todo el pasillo: un cubo por cuadro.
//     ■ ■ ■ ■ ■ ■ ■
//
// Los pasillos se apilan (varios por peine, compartiendo las filas cerradas) y se acuestan o se paran al azar. Todo lo demás hasta llegar a
// la cantidad pedida son cuadros sueltos en lugares totalmente al azar, igual que un sorteo normal (no forman racimos).
// Después un bot de backtracking (solver-polocubos.js) juega el tablero: si no deja juntar AJUSTES.tanda cubos, se arma otro.
import { AJUSTES, crearTablero, cerrarCuadros } from "./logica-polocubos.js";
import { botCubos } from "./solver-polocubos.js";

const entre = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));

// «maxPatron» = fracción máxima de «objetivo» que puede ir en peines (por defecto 5 %; con menos de 9 cuadros de presupuesto no cabe ni el peine
// más chico, así que el tablero queda 100 % al azar).
// Devuelve { cerr: Uint8Array n*n (1 = cuadro que se cierra), pasillos, cubosPasillo: cubos que dan los pasillos si se recorren enteros,
//            enPatron: cuántos cuadros cerrados son de peines }
export function crearPatron(n, objetivo, rng = Math.random, maxPatron = AJUSTES.maxPatron) {
  const cerr = new Uint8Array(n * n), pasillo = new Uint8Array(n * n);
  const presupuesto = Math.floor(objetivo * maxPatron); // cuadros que, como máximo, van en peines
  let cerrados = 0, pasillos = 0, cubosPasillo = 0, enPatron = 0;
  const maxL = Math.max(3, Math.min(20, n >> 1)); // largo máximo de un pasillo
  const cerrar = (i) => { if (!cerr[i]) { cerr[i] = 1; cerrados++; } };

  // Intenta poner un peine de k pasillos de largo L en un lugar al azar. Devuelve false si no cupo o se pasa del presupuesto.
  function peine(restante) {
    const k = entre(rng, 1, Math.max(1, Math.min(4, (n - 1) >> 1)));
    const L = entre(rng, 3, maxL);
    const vertical = rng() < 0.5, espinaIzq = rng() < 0.5;
    const alto = 2 * k + 1, ancho = L + 1;
    if (alto > n || ancho > n) return false;
    const a0 = entre(rng, 0, n - alto), b1 = entre(rng, 0, n - ancho);
    const bs = espinaIzq ? b1 : b1 + L;      // columna del fondo («espina») que cierra un extremo de los pasillos
    const b0 = espinaIzq ? b1 + 1 : b1;      // primera columna de los pasillos
    const idx = (a, b) => (vertical ? b * n + a : a * n + b); // en vertical se intercambian filas y columnas
    const cierra = [], pasos = [];
    for (let da = 0; da < alto; da++) {
      cierra.push(idx(a0 + da, bs));
      for (let b = b0; b < b0 + L; b++) (da % 2 === 0 ? cierra : pasos).push(idx(a0 + da, b)); // filas pares: cerradas; impares: pasillo
    }
    if (pasos.some((i) => cerr[i])) return false;      // un pasillo no puede pisar cuadros ya cerrados
    if (cierra.some((i) => pasillo[i])) return false;  // ni un cuadro cerrado pisar un pasillo de otro peine
    const nuevos = cierra.filter((i) => !cerr[i]).length;
    if (nuevos > restante) return false;
    enPatron += nuevos;
    for (const i of cierra) cerrar(i);
    for (const i of pasos) pasillo[i] = 1;
    pasillos += k; cubosPasillo += k * L;
    return true;
  }

  // 1) Una parte pequeña (máx. maxPatron) en peines
  let fallos = 0;
  while (presupuesto - enPatron >= 9 && fallos < 400) fallos = peine(presupuesto - enPatron) ? 0 : fallos + 1;

  // 2) Todo lo demás hasta el objetivo: cuadros sueltos en lugares totalmente al azar (sin tocar los pasillos)
  let falta = objetivo - cerrados, intentos = 0;
  while (falta > 0 && intentos++ < objetivo * 20 + 200) {
    const i = Math.floor(rng() * n * n);
    if (cerr[i] || pasillo[i]) continue;
    cerrar(i); falta--;
  }
  return { cerr, pasillos, cubosPasillo, enPatron };
}

// Arma el tablero inicial con «cantidad» cuadros cerrados en patrones y lo prueba con el bot de backtracking.
// Si no deja juntar «meta» cubos, lo intenta de nuevo (hasta «intentos» veces) y se queda con el mejor.
// Devuelve { t, cubos: cubos que el bot logró juntar, cumple: llegó a la meta, pasillos, enPatron: cuadros que quedaron en peines (5 % o menos) }.
// En hojas de más de 100×100 no se prueba con el bot (tardaría) y se confía en los pasillos del patrón.
export function generarInicio(n, cantidad, { lineas = AJUSTES.puntosJugar, meta = AJUSTES.tanda, rng = Math.random, intentos = 5 } = {}) {
  let mejor = null;
  // Un pasillo da como mucho ~1 cubo por cuadro cerrado: con menos de ~1.6 × meta cuadros cerrados es imposible llegar, no se insiste
  const hayCuadros = cantidad >= Math.ceil(meta * 1.6);
  for (let i = 0; i < (hayCuadros ? intentos : 2); i++) {
    const p = crearPatron(n, cantidad, rng);
    const t = crearTablero(n);
    cerrarCuadros(t, p.cerr);
    const cubos = n <= 100 ? botCubos(t, lineas, meta).cubos : Math.min(meta, p.cubosPasillo);
    if (!mejor || cubos > mejor.cubos) mejor = { t, cubos, pasillos: p.pasillos, enPatron: p.enPatron };
    if (cubos >= meta) break;
  }
  mejor.cumple = mejor.cubos >= meta;
  return mejor;
}
