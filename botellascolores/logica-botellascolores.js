// Ruta: botellascolores/logica-botellascolores.js
// Reglas del juego (sin pantalla). Una botella es una lista de colores de abajo hacia arriba: [0, 2, 2].
// Un estado es la lista de botellas. Los colores son números 0, 1, 2...

// ===== MECÁNICAS COMO CONSTANTES (ESTANDARES-juegos.md, sección 10: se definen ANTES de generar los niveles) =====
// 1) Las 5 dificultades ESTÁNDAR del ♾️ Modo libre (😁 😬 😐 😡 😈, ESTANDARES-juegos.md 7.2). Qué cambia: cuántas botellas vacías hay y si hay niebla (solo se ve el color de arriba).
//    El jugador elige aparte los colores (3 a 10) y la capacidad (3 a 8).
export const DIFICULTADES_LIBRE = [
  { id: "mf", texto: "😁 Muy fácil", vacias: 3, oculto: false, nota: "Muy fácil: 3 botellas vacías, mucho espacio para maniobrar." },
  { id: "f", texto: "😬 Fácil", vacias: 2, oculto: false, nota: "Fácil: 2 botellas vacías." },
  { id: "m", texto: "😐 Normal", vacias: 1, oculto: false, nota: "Normal: 1 botella vacía (en tableros grandes puede haber 2 si con 1 no se puede resolver)." },
  { id: "d", texto: "😡 Difícil", vacias: 2, oculto: true, nota: "Difícil: 2 botellas vacías y niebla: solo ves el color de arriba de cada botella." },
  { id: "e", texto: "😈 Demoníaco", vacias: 1, oculto: true, nota: "Demoníaco: 1 botella vacía y niebla. Cuidado con cada vertido." },
];
// 2) Los 3 tipos de nivel del MAPA (sección 8; el reparto 50/40/10 → 25/40/35 % lo da compartido/dificultad-niveles.js).
//    dif = dificultad del Modo libre a la que se parece; capas = rango de capas totales (colores × capacidad);
//    probNiebla = probabilidad de que el nivel lleve niebla. PROVISIONAL: se afina al generar y NO se cambia después de publicar.
export const TIPOS_NIVEL = {
  facil: { dif: "f", capas: [9, 30], probNiebla: 0 },
  normal: { dif: "m", capas: [20, 44], probNiebla: 0.15 },
  dificil: { dif: "d", capas: [36, 64], probNiebla: 0.4 },
};

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

// ----- Modo libre -----
// Ronda al azar con solución comprobada. «vacias» = botellas vacías (1, 2 o 3); «oculto» = modo niebla.
// Si con 1 botella vacía no sale una ronda resoluble tras varios intentos, se usa 2 (siempre cabe una solución holgada).
export function nivelLibre({ colores, capacidad, vacias = 2, oculto = false }, semilla = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  let ultimo = null;
  for (const v of vacias === 1 ? [1, 2] : [vacias]) {
    for (let a = 0; a < 12; a++) {
      const n = { botellas: colores + v, colores, capacidad, semilla: (semilla + a * 7919) >>> 0 };
      if (oculto) n.oculto = true;
      ultimo = n;
      if (resolver(crear(n), capacidad, 30000)) return n;
    }
  }
  return ultimo;
}

// ----- Boost «Pista» -----
// Busca una solución CORTA con A* ponderado (el solucionador de arriba da soluciones válidas pero largas: seguirlas paso a paso
// podía llevar de vuelta a estados ya vistos). Devuelve la lista de movimientos [origen, destino] o null si no la encuentra
// (el estado ya no tiene solución, o se pasó del límite de nodos).
const claveEstado = (e) => e.map((b) => b.map((v) => String.fromCharCode(65 + v)).join("")).sort().join("|");
// Heurística: tramos de color de más que hay que juntar (cada vertido junta, como mucho, un tramo)
const faltan = (e) => { let h = 0; for (const b of e) { for (let i = 1; i < b.length; i++) if (b[i] !== b[i - 1]) h++; } return h; };

export function caminoCorto(est0, cap, limite = 60000, peso = 3) {
  const e0 = est0.map((b) => b.slice());
  if (resuelto(e0, cap)) return [];
  const heap = []; // montículo mínimo de [f, g, id]
  const push = (x) => { heap.push(x); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const t = heap[0], u = heap.pop(); if (heap.length) { heap[0] = u; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
  const nodos = [{ e: e0, padre: -1, mov: null }];
  const mejorG = new Map([[claveEstado(e0), 0]]);
  push([peso * faltan(e0), 0, 0]);
  while (heap.length && nodos.length < limite) {
    const [, g, id] = pop();
    const { e } = nodos[id];
    if (g > (mejorG.get(claveEstado(e)) ?? Infinity)) continue; // entrada vieja
    for (let i = 0; i < e.length; i++) for (let j = 0; j < e.length; j++) {
      if (i === j || !puedeVerter(e[i], e[j], cap)) continue;
      if (e[j].length === 0 && mono(e[i])) continue; // mover una botella de un solo color a una vacía no sirve
      const h = e.map((b) => b.slice());
      verter(h, i, j, cap);
      const k = claveEstado(h), g2 = g + 1;
      if (g2 >= (mejorG.get(k) ?? Infinity)) continue;
      mejorG.set(k, g2);
      nodos.push({ e: h, padre: id, mov: [i, j] });
      if (resuelto(h, cap)) {
        const camino = [];
        for (let n = nodos.length - 1; n > 0; n = nodos[n].padre) camino.push(nodos[n].mov);
        return camino.reverse();
      }
      push([g2 + peso * faltan(h), g2, nodos.length - 1]);
    }
  }
  return null;
}
// Primer movimiento de la pista, o null
export function pista(est, cap, limite = 60000) {
  const c = caminoCorto(est, cap, limite);
  return c && c.length ? c[0] : null;
}
