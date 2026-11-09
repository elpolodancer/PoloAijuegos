// Ruta: deslizante/verificar-niveles-deslizante.mjs
// Herramienta de desarrollo (NO se carga en el juego ni va en sw.js). Ejecutar con:  node deslizante/verificar-niveles-deslizante.mjs
// Comprueba cada nivel de niveles-deslizante.js: tamaño, fichas completas y sin repetir, solución posible (paridad), orden por tamaño y 10 por tamaño.
import { NIVELES, POR_TAMANO } from "./niveles-deslizante.js";

function resoluble(m, a) {
  const f = a.filter(Boolean);
  let inv = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++;
  return m % 2 ? inv % 2 === 0 : (inv + (m - Math.floor(a.indexOf(0) / m))) % 2 === 1;
}
let fallos = 0, previo = 0;
const cuenta = {};
NIVELES.forEach((l, i) => {
  const e = (msg) => { fallos++; console.log("✗ nivel " + (i + 1) + " (" + l.n + "×" + l.n + "): " + msg); };
  cuenta[l.n] = (cuenta[l.n] || 0) + 1;
  if (l.n < previo) e("los tamaños deben ir de menor a mayor");
  previo = l.n;
  if (l.fichas.length !== l.n * l.n) return e("debe tener " + l.n * l.n + " fichas");
  if ([...l.fichas].sort((a, b) => a - b).some((v, k) => v !== k)) return e("debe usar cada número de 0 a " + (l.n * l.n - 1) + " una sola vez");
  if (l.fichas.every((v, k) => v === (k === l.fichas.length - 1 ? 0 : k + 1))) e("ya está resuelto");
  if (!resoluble(l.n, l.fichas)) e("NO tiene solución");
});
for (const [n, c] of Object.entries(cuenta)) if (c !== POR_TAMANO) { fallos++; console.log("✗ el tamaño " + n + "×" + n + " tiene " + c + " niveles (deben ser " + POR_TAMANO + ")"); }
console.log(fallos ? fallos + " problema(s)" : "✓ " + NIVELES.length + " niveles correctos y con solución");
process.exit(fallos ? 1 : 0);
