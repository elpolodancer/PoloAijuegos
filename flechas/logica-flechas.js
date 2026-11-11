// Ruta: flechas/logica-flechas.js
// Reglas del juego (sin pantalla). Una flecha es una lista de celdas [x, y] de la COLA a la CABEZA, cada una pegada a la anterior
// (arriba, abajo, izquierda o derecha). La punta apunta en la dirección del último tramo.
// Tocar una flecha la hace salir en línea recta por donde apunta: si en ese camino hay alguna celda de otra flecha, está bloqueada
// (el jugador pierde un corazón). Se gana al sacar todas las flechas.

export function azarSemilla(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hacia dónde apunta una flecha: [dx, dy]
export function direccion(celdas) {
  const n = celdas.length;
  return [celdas[n - 1][0] - celdas[n - 2][0], celdas[n - 1][1] - celdas[n - 2][1]];
}

// Estado de un tablero: «celda» guarda en cada casilla el número de la flecha que la ocupa (o -1); «vivas» = flechas que siguen puestas
export function crearEstado(cols, filas, flechas) {
  const celda = new Int32Array(cols * filas).fill(-1);
  flechas.forEach((f, i) => { for (const [x, y] of f.celdas) celda[y * cols + x] = i; });
  return { cols, filas, flechas, celda, vivas: new Set(flechas.keys()) };
}
export function copiar(est) {
  return { cols: est.cols, filas: est.filas, flechas: est.flechas, celda: est.celda.slice(), vivas: new Set(est.vivas) };
}

// Primera flecha que estorba en el camino de la flecha «id» (-1 = camino libre hasta el borde)
export function bloqueo(est, id) {
  const c = est.flechas[id].celdas;
  const [dx, dy] = direccion(c);
  let [x, y] = c[c.length - 1];
  for (;;) {
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= est.cols || y >= est.filas) return -1;
    const o = est.celda[y * est.cols + x];
    if (o !== -1) return o;
  }
}
export const puedeSalir = (est, id) => est.vivas.has(id) && bloqueo(est, id) === -1;
export function quitar(est, id) {
  for (const [x, y] of est.flechas[id].celdas) est.celda[y * est.cols + x] = -1;
  est.vivas.delete(id);
}
export const libres = (est) => [...est.vivas].filter((id) => bloqueo(est, id) === -1);

// ¿El camino de salida de esta forma de flecha choca con su propio cuerpo? (entonces nunca podría salir)
export function golpeaPropio(cols, filas, celdas) {
  const [dx, dy] = direccion(celdas);
  let [x, y] = celdas[celdas.length - 1];
  for (;;) {
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= cols || y >= filas) return false;
    for (const c of celdas) if (c[0] === x && c[1] === y) return true;
  }
}

// Saca flechas por «rondas» (todas las que están libres a la vez). Sirve para saber si el nivel se puede resolver y qué tan hondo es:
//   capas        lista de rondas (cada una es una lista de flechas)
//   profundidad  número de rondas (más rondas = más flechas esperando a otras = más difícil)
//   atascadas    flechas que no pudieron salir nunca (si hay alguna, el nivel NO tiene solución)
export function analizar(est0) {
  const est = copiar(est0);
  const esperan = new Map(); // flecha que estorba -> flechas que esperan por ella
  let actual = [];
  const colocar = (id, destino) => {
    const b = bloqueo(est, id);
    if (b === -1) destino.push(id);
    else { let l = esperan.get(b); if (!l) esperan.set(b, (l = [])); l.push(id); }
  };
  for (const id of est.vivas) colocar(id, actual);
  const capas = [];
  while (actual.length) {
    capas.push(actual);
    for (const id of actual) quitar(est, id);
    const sig = [];
    for (const id of actual) { const l = esperan.get(id); if (l) for (const w of l) colocar(w, sig); }
    actual = sig;
  }
  const atascadas = [...est.vivas];
  return { capas, profundidad: capas.length, atascadas, resuelto: atascadas.length === 0 };
}
