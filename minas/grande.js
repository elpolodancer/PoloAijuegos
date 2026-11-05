// Ruta: minas/grande.js
// Números enormes: {m, e} = m × 10^e con 1 ≤ m < 10 (el cero es {m:0, e:0}).
// El exponente e es un número normal, así que el tope pasa de 1e308 a 1e(10^308): en la práctica no se alcanza.
// Todas las funciones devuelven objetos nuevos (no modifican los que reciben) y se pueden guardar tal cual con JSON.
export const CERO = { m: 0, e: 0 };
export const INF = { m: 1, e: 1e300 };

function norm(m, e) {
  if (!(m > 0)) return CERO;                    // 0, negativos y NaN cuentan como 0
  if (m >= 10 || m < 1) {
    const k = Math.floor(Math.log10(m));
    m /= Math.pow(10, k); e += k;
    if (m >= 10) { m /= 10; e++; } else if (m < 1) { m *= 10; e--; }
  }
  return { m, e };
}
export const num = (x) => (x === Infinity ? INF : norm(x, 0));
export const UNO = num(1);
export const pot = (l) => { if (!(l > -Infinity)) return CERO; if (l === Infinity) return INF; const e = Math.floor(l); return norm(Math.pow(10, l - e), e); };   // 10^l
export const log = (a) => (a.m > 0 ? Math.log10(a.m) + a.e : -Infinity);                                                         // log10
export const aNum = (a) => (a.m === 0 ? 0 : a.e > 308 ? Infinity : a.e < -323 ? 0 : a.m * Math.pow(10, a.e));
export const esCero = (a) => a.m === 0;

export function cmp(a, b) {
  if (a.m === 0 || b.m === 0) return a.m === b.m ? 0 : a.m === 0 ? -1 : 1;
  if (a.e !== b.e) return a.e < b.e ? -1 : 1;
  return a.m < b.m ? -1 : a.m > b.m ? 1 : 0;
}
export const menor = (a, b) => cmp(a, b) < 0;
export const mayor = (a, b) => cmp(a, b) > 0;
export const min = (a, b) => (cmp(a, b) <= 0 ? a : b);
export const max = (a, b) => (cmp(a, b) >= 0 ? a : b);

export function suma(a, b) {
  if (a.m === 0) return b;
  if (b.m === 0) return a;
  if (a.e < b.e) { const t = a; a = b; b = t; }
  const d = a.e - b.e;
  if (d > 17) return a;                          // el menor ya no cabe en la precisión
  return norm(a.m + b.m * Math.pow(10, -d), a.e);
}
export function resta(a, b) {                    // a − b, y 0 si b ≥ a (nunca hay negativos)
  if (b.m === 0) return a;
  if (cmp(a, b) <= 0) return CERO;
  const d = a.e - b.e;
  if (d > 17) return a;
  return norm(a.m - b.m * Math.pow(10, -d), a.e);
}
export const mul = (a, b) => (a.m === 0 || b.m === 0 ? CERO : norm(a.m * b.m, a.e + b.e));
export const mulN = (a, x) => (a.m === 0 || !(x > 0) ? CERO : x === Infinity ? INF : norm(a.m * x, a.e));
export const div = (a, b) => (b.m === 0 ? INF : a.m === 0 ? CERO : norm(a.m / b.m, a.e - b.e));

// ----- Formato: 1.5K, 2.3M, … T, luego aa, ab, … zz y después notación científica (1.2e2100) -----
const SUF = ["", "K", "M", "B", "T"];
export function fmt(a) {
  if (typeof a === "number") a = num(a);
  if (a.m === 0) return "0";
  if (a.e >= 1e300) return "∞";
  if (a.e < 3) { const x = aNum(a); return x < 10 ? x.toFixed(1).replace(/\.0$/, "") : String(Math.floor(x)); }
  const i = Math.floor(a.e / 3), r = a.m * Math.pow(10, a.e - 3 * i), quita = (s) => s.replace(/\.?0+$/, "");
  if (i < 5) return quita(r.toFixed(2)) + SUF[i];
  const j = i - 5;
  if (j >= 676) return quita(a.m.toFixed(2)) + "e" + a.e;
  return quita(r.toFixed(2)) + String.fromCharCode(97 + Math.floor(j / 26)) + String.fromCharCode(97 + (j % 26));
}
