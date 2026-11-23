// Ruta: deslizante/verificar-niveles-deslizante.mjs
// Herramienta de desarrollo (NO se carga en el juego ni va en sw.js). Ejecutar con:  node deslizante/verificar-niveles-deslizante.mjs
// Comprueba niveles-deslizante.js: la lista de niveles (hoy vacía) y las recompensas.
//   · Cada nivel: tamaño de 3 a 30, fichas completas y sin repetir, no resuelto de entrada y con solución posible (paridad).
//   · La lista no puede tener huecos ni pasar de 3 900 niveles (20 por país × 195 países, México primero: mapa solo de países).
//   · Recompensas: monedas de 15 (3×3) a 80 (30×30) y puntos del juego de 80 a 250, sin bajar al crecer el tablero.
import { NIVELES, POR_ETAPA, TAMANO_MIN, TAMANO_MAX, monedasDe, puntosJuegoDe } from "./niveles-deslizante.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";

function resoluble(m, a) {
  const f = a.filter(Boolean);
  let inv = 0;
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++;
  return m % 2 ? inv % 2 === 0 : (inv + (m - Math.floor(a.indexOf(0) / m))) % 2 === 1;
}
let fallos = 0;
const mal = (msg) => { fallos++; console.log("✗ " + msg); };

const etapas = crearEtapas({ porEtapa: POR_ETAPA, soloPaises: true });
const total = etapas.total;
if (total !== 3900) mal("el mapa debe tener 3 900 niveles (195 países × 20) y tiene " + total);
if (etapas.paises[0] !== "MX" || etapas.paises[24] !== "US" || etapas.paises[etapas.numPaises - 1] !== "CN") mal("el orden de países debe empezar con México, tener a Estados Unidos en el 25 y terminar con China");
if (NIVELES.length > total) mal("hay " + NIVELES.length + " niveles y el mapa solo tiene " + total);

for (let i = 0; i < NIVELES.length; i++) {
  const l = NIVELES[i];
  const e = (msg) => mal("nivel " + (i + 1) + (l ? " (" + l.n + "×" + l.n + ")" : "") + ": " + msg);
  if (!l) { e("hueco en la lista (los niveles se abren en orden)"); continue; }
  if (!Number.isInteger(l.n) || l.n < TAMANO_MIN || l.n > TAMANO_MAX) { e("el tamaño debe ser de " + TAMANO_MIN + " a " + TAMANO_MAX); continue; }
  if (!Array.isArray(l.fichas) || l.fichas.length !== l.n * l.n) { e("debe tener " + l.n * l.n + " fichas"); continue; }
  if ([...l.fichas].sort((a, b) => a - b).some((v, k) => v !== k)) { e("debe usar cada número de 0 a " + (l.n * l.n - 1) + " una sola vez"); continue; }
  if (l.fichas.every((v, k) => v === (k === l.fichas.length - 1 ? 0 : k + 1))) e("ya está resuelto");
  if (!resoluble(l.n, l.fichas)) e("NO tiene solución");
}

// Recompensas
if (monedasDe(TAMANO_MIN) !== 15 || monedasDe(TAMANO_MAX) !== 80) mal("las monedas deben ir de 15 (3×3) a 80 (30×30)");
if (puntosJuegoDe(TAMANO_MIN) !== 80 || puntosJuegoDe(TAMANO_MAX) !== 250) mal("los puntos del juego deben ir de 80 (3×3) a 250 (30×30)");
for (let n = TAMANO_MIN + 1; n <= TAMANO_MAX; n++) {
  if (monedasDe(n) < monedasDe(n - 1)) mal("las monedas bajan de " + (n - 1) + "×" + (n - 1) + " a " + n + "×" + n);
  if (puntosJuegoDe(n) < puntosJuegoDe(n - 1)) mal("los puntos bajan de " + (n - 1) + "×" + (n - 1) + " a " + n + "×" + n);
}
console.log(fallos ? fallos + " problema(s)" : "✓ " + NIVELES.length + " de " + total + " niveles creados, todos correctos y con solución · recompensas en orden (💰 15–80, 🏅 80–250)");
process.exit(fallos ? 1 : 0);
