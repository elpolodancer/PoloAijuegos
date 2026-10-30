// Ruta: botellas-colores/logica.js
// Reglas del juego (sin pantalla). Una botella es una lista de colores de abajo hacia arriba: [0, 2, 2].
// Un estado es la lista de botellas. Los colores son números 0, 1, 2...

export function azarSemilla(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mono = (b) => b.length > 0 && b.every((v) => v === b[0]);

// Cuántos colores iguales hay seguidos en la parte de arriba
export function racha(b) {
  let n = 0;
  for (let i = b.length - 1; i >= 0 && b[i] === b[b.length - 1]; i--) n++;
  return n;
}

// Mezcla determinista: la misma «semilla» da siempre el mismo nivel
export function crear({ botellas, colores, capacidad, semilla }) {
  const r = azarSemilla(semilla);
  let est = null;
  for (let intento = 0; intento < 200; intento++) {
    const todos = [];
    for (let c = 0; c < colores; c++) for (let k = 0; k < capacidad; k++) todos.push(c);
    for (let i = todos.length - 1; i > 0; i--) {
      const j = (r() * (i + 1)) | 0;
      [todos[i], todos[j]] = [todos[j], todos[i]];
    }
    est = [];
    for (let i = 0; i < botellas; i++) est.push(i < colores ? todos.slice(i * capacidad, (i + 1) * capacidad) : []);
    if (!est.some((b) => mono(b))) break; // que no empiece ninguna botella ya resuelta
  }
  return est;
}

export function puedeVerter(a, b, cap) {
  if (!a.length || b.length >= cap) return false;
  return b.length === 0 || b[b.length - 1] === a[a.length - 1];
}

// Vierte lo que se pueda de est[i] a est[j]; devuelve cuántas capas pasaron
export function verter(est, i, j, cap) {
  if (i === j || !puedeVerter(est[i], est[j], cap)) return 0;
  const n = Math.min(racha(est[i]), cap - est[j].length);
  for (let k = 0; k < n; k++) est[j].push(est[i].pop());
  return n;
}

export function resuelto(est, cap) {
  return est.every((b) => b.length === 0 || (b.length === cap && mono(b)));
}

// Busca una solución (lista de [origen, destino]) o devuelve null si no la encuentra
export function resolver(est0, cap, limite = 200000) {
  const vistos = new Set();
  const camino = [];
  let nodos = 0;
  const clave = (e) => e.map((b) => b.map((v) => String.fromCharCode(65 + v)).join("")).sort().join("|");
  const rec = (e) => {
    if (resuelto(e, cap)) return true;
    if (++nodos > limite) return false;
    const k = clave(e);
    if (vistos.has(k)) return false;
    vistos.add(k);
    const movs = [];
    for (let i = 0; i < e.length; i++) {
      for (let j = 0; j < e.length; j++) {
        if (i === j || !puedeVerter(e[i], e[j], cap)) continue;
        if (e[j].length === 0 && mono(e[i])) continue; // mover una botella de un solo color a una vacía no sirve
        const n = Math.min(racha(e[i]), cap - e[j].length);
        const completa = e[j].length > 0 && mono(e[j]) && e[j].length + n === cap;
        movs.push([i, j, completa ? -1 : e[j].length ? 0 : 1]);
      }
    }
    movs.sort((a, b) => a[2] - b[2]);
    for (const [i, j] of movs) {
      const h = e.map((b) => b.slice());
      verter(h, i, j, cap);
      camino.push([i, j]);
      if (rec(h)) return true;
      camino.pop();
      if (nodos > limite) return false;
    }
    return false;
  };
  return rec(est0.map((b) => b.slice())) ? camino : null;
}
