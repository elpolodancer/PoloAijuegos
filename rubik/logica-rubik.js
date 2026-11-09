// Ruta: rubik/logica-rubik.js
// Lógica pura del cubo n×n×n: 2×2 hasta 10×10 (y más) (sin DOM). Ejes como en CSS: x derecha, y ABAJO, z hacia ti.
// Cada pieza tiene posición p (-1..1) y orientación M (matriz 3×3 por filas); girar una capa = multiplicar por una matriz.
export const COLORES = { U: "#f4f4f4", D: "#ffd500", F: "#00a651", B: "#0b5ed7", R: "#d8232a", L: "#ff7a00" };
const H = " translateZ(calc(var(--S) / 2))";
// n = normal hacia afuera; css = cómo se coloca esa cara en la pieza
export const CARAS = [
  { id: "F", n: [0, 0, 1],  css: "" + H.trim() },
  { id: "B", n: [0, 0, -1], css: "rotateY(180deg)" + H },
  { id: "R", n: [1, 0, 0],  css: "rotateY(90deg)" + H },
  { id: "L", n: [-1, 0, 0], css: "rotateY(-90deg)" + H },
  { id: "U", n: [0, -1, 0], css: "rotateX(90deg)" + H },
  { id: "D", n: [0, 1, 0],  css: "rotateX(-90deg)" + H },
];
// Notación oficial: [eje, signo de la cara]. Girar «a favor del reloj» mirando la cara = +90° sobre su normal
export const GIROS = { U: [1, -1], D: [1, 1], R: [0, 1], L: [0, -1], F: [2, 1], B: [2, -1] };

export const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const BASE = [[1, 0, 0, 0, 0, -1, 0, 1, 0], [0, 0, 1, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 0, 0, 1]]; // +90° en x, y, z
export const aplicar = (M, v) => [0, 1, 2].map((i) => M[i * 3] * v[0] + M[i * 3 + 1] * v[1] + M[i * 3 + 2] * v[2]);
export const mul = (A, B) => {
  const C = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
};
export const rot = (ax, k) => { const b = BASE[ax]; return k > 0 ? b : [b[0], b[3], b[6], b[1], b[4], b[7], b[2], b[5], b[8]]; };
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Piezas de un cubo n×n×n. Posiciones en unidades de media pieza: p = 2·i − (n−1) (n=3: −2, 0, 2; n=4: −3, −1, 1, 3).
// d = pegatinas de la pieza: { i: índice en CARAS, n: normal original, c: color }. Las piezas interiores no tienen pegatinas (d vacío).
export function crearCubo(n = 3) {
  const r = [], v = Array.from({ length: n }, (_, i) => 2 * i - (n - 1));
  for (const x of v) for (const y of v) for (const z of v) {
    const p = [x, y, z], d = [];
    CARAS.forEach((f, i) => { if (f.n.some((w, k) => w !== 0 && p[k] === w * (n - 1))) d.push({ i, n: f.n, c: COLORES[f.id] }); });
    r.push({ id: r.length, p, M: ID, d });
  }
  return r;
}
// Gira un cuarto de vuelta (k = 1 o -1) la capa «layer» del eje «ax»: su valor en ese eje, o una lista de valores (giro ancho)
export function girar(cubies, ax, layer, k) {
  const R = rot(ax, k), L = [].concat(layer);
  for (const c of cubies) if (L.includes(c.p[ax])) { c.p = aplicar(R, c.p); c.M = mul(R, c.M); }
}
// Resuelto = en cada lado del cubo todas las pegatinas visibles son del mismo color
export function resuelto(cubies) {
  const v = {};
  for (const c of cubies) for (const d of c.d) {
    const k = aplicar(c.M, d.n).join();
    if (v[k] && v[k] !== d.c) return false;
    v[k] = d.c;
  }
  return true;
}
// Capa exterior de una cara = s·(n−1). «ancho» = cuántas capas exteriores giran juntas (1 = solo la exterior; true = 2;
// Uw, Rw, 3Rw…). Tope: la mitad del cubo (en 2×2 y 3×3 siempre es 1).
export function mover(letra, prima, n = 3, ancho = 1) {
  const [ax, s] = GIROS[letra], e = s * (n - 1);
  const w = Math.max(1, Math.min(ancho === true ? 2 : Number(ancho) || 1, n >> 1));
  const layer = w > 1 ? Array.from({ length: w }, (_, i) => e - 2 * s * i) : e;
  return { ax, layer, k: prima ? -s : s };
}
// Mezcla: en 2×2 y 3×3 solo giros de caras; desde 4×4 también capas internas
export function mezcla(n = 3, cant = 20) {
  const capas = Array.from({ length: n }, (_, i) => 2 * i - (n - 1)).filter((c) => n >= 4 || Math.abs(c) === n - 1);
  const r = []; let ult = "";
  while (r.length < cant) {
    const ax = Math.floor(Math.random() * 3), layer = capas[Math.floor(Math.random() * capas.length)], clave = ax + ":" + layer;
    if (clave === ult) continue;
    ult = clave; r.push({ ax, layer, k: Math.random() < 0.5 ? 1 : -1 });
  }
  return r;
}
