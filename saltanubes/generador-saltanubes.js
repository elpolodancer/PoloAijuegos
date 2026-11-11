// Ruta: saltanubes/generador-saltanubes.js
// Genera las filas del mapa de Saltanubes. No usa document: se puede probar en Node.
// Filas desde abajo: fila 0 = 4 plataformas, fila 1 = 5, fila 2 = 4, fila 3 = 5… sin fin (las pares tienen 4, las impares 5).
// Las de 4 quedan «entre» las de 5, así cada plataforma tiene hasta 2 saltos hacia arriba (izquierda y derecha).
// Siempre hay un CAMINO de tierra firme: cada fila marca una plataforma alcanzable desde la del camino de la fila anterior.
// Fila → { r, t: [1 tierra | 0 nube], c: [valor de moneda: 0, 1 o 10], obj: {i,tipo:"cohete"}|null, mon: monstruo|null }

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const numPlat = (r) => (r % 2 === 0 ? 4 : 5);
export const posX = (r, i) => (r % 2 === 0 ? i + 1 : i + 0.5); // centro de la plataforma, en «anchos de plataforma» (0 a 5)
// Plataforma de la fila r+1 a la que se llega saltando desde (r, i) hacia la izquierda (d = -1) o la derecha (d = 1); -1 si no hay
export function vecino(r, i, d) {
  const j = r % 2 === 0 ? i + (d > 0 ? 1 : 0) : i + (d > 0 ? 0 : -1);
  return j >= 0 && j < numPlat(r + 1) ? j : -1;
}
// Posición del monstruo en el instante t: va y viene por su tramo de la fila (rápido en el centro, casi parado en las puntas)
export const monX = (m, t) => m.xa + (m.xb - m.xa) * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / m.per + m.fase));

export function crearMundo(semilla, { cohete = false } = {}) {
  const rnd = mulberry32(semilla), filas = [], camino = [];
  let proxCohete = 14 + ((rnd() * 10) | 0);
  function generar(r) {
    const n = numPlat(r);
    let p;
    if (r === 0) p = 1 + ((rnd() * 2) | 0);
    else { const d = rnd() < 0.5 ? -1 : 1; p = vecino(r - 1, camino[r - 1], d); if (p < 0) p = vecino(r - 1, camino[r - 1], -d); }
    camino[r] = p;
    const pNube = Math.min(0.7, 0.3 + r * 0.002); // cada vez más nubes
    const t = [], c = [];
    for (let i = 0; i < n; i++) { t[i] = r === 0 || i === p || rnd() >= pNube ? 1 : 0; c[i] = r > 0 && rnd() < 0.14 ? 1 : 0; }
    if (r > 0 && r % 100 === 0) c[p] = 10; // cada 100 saltos, una moneda de 10 sobre el camino
    let obj = null;
    if (cohete && r >= proxCohete) { obj = { i: p, tipo: "cohete" }; proxCohete = r + 35 + ((rnd() * 15) | 0); }
    let mon = null;
    const prev = filas[r - 1];
    if (r >= 8 && !(prev && prev.mon) && !obj && r % 100 !== 0 && rnd() < Math.min(0.35, 0.16 + r / 1500)) {
      const largo = 2.2, xa = 0.5 + rnd() * (4 - largo);
      mon = { xa, xb: xa + largo, per: Math.max(2.2, 3.4 - r / 700), fase: rnd() * 6.283 };
    }
    return { r, t, c, obj, mon };
  }
  return {
    fila(r) { while (filas.length <= r) filas.push(generar(filas.length)); return filas[r]; },
    camino(r) { this.fila(r); return camino[r]; },
  };
}
