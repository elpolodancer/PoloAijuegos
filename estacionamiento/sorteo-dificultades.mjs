// Sortea la dificultad de los 3 900 niveles y escribe dificultades-estacionamiento.js. NO genera tableros.
// Uso: node sorteo-dificultades.mjs      (siempre da el mismo resultado: el azar tiene semilla fija)
//   1 = medio · 2 = difícil
// Reglas del sorteo:
//   - Los niveles 1–10 son siempre medios (aprender jugando).
//   - El sorteo va por TRAMOS de 100 niveles seguidos (39 tramos = 3 900 niveles; el tramo NO coincide con un país, que tiene 20: ESTANDARES-juegos.md, sección 8).
//     Cada tramo tiene un número EXACTO de niveles difíciles: 15 en el primero, subiendo parejo hasta 50 en el último (el 39). Total ≈ 1 270 difíciles (32.5 %).
//     (Con 22 600 niveles eran 226 tramos con la misma curva 15 → 50; al reducir a 3 900 la curva se estira para llegar a 50 en el último tramo.)
//   - Nunca hay más de 3 niveles difíciles seguidos (tampoco entre una etapa y la siguiente).
import { writeFileSync } from "node:fs";
const ETAPAS = 39, POR_ETAPA = 100, DIF_PRIMERA = 15, DIF_ULTIMA = 50, MAX_SEGUIDOS = 3, PROTEGIDOS = 10;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(2026_11_21);
let seguidos = 0; // difíciles seguidos al final de la etapa anterior
const lineas = [];
for (let e = 0; e < ETAPAS; e++) {
  const dificiles = Math.round(DIF_PRIMERA + (DIF_ULTIMA - DIF_PRIMERA) * (e / (ETAPAS - 1)));
  const libres = e === 0 ? POR_ETAPA - PROTEGIDOS : POR_ETAPA; // posiciones sorteables de la etapa
  const ini = POR_ETAPA - libres;
  for (let intento = 0; ; intento++) {
    const v = new Array(POR_ETAPA).fill(1);
    const cubos = Array.from({ length: libres }, (_, i) => ini + i);
    for (let i = cubos.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [cubos[i], cubos[j]] = [cubos[j], cubos[i]]; }
    for (let i = 0; i < dificiles; i++) v[cubos[i]] = 2;
    let r = seguidos, mx = 0;
    for (const d of v) { r = d === 2 ? r + 1 : 0; mx = Math.max(mx, r); }
    if (mx <= MAX_SEGUIDOS) { seguidos = r; lineas.push(v.join("")); break; }
    if (intento > 100000) throw new Error("no se pudo sortear la etapa " + e);
  }
}
const salida = `// Ruta: estacionamiento/dificultades-estacionamiento.js
// SORTEO de la dificultad de los 3 900 niveles (1 = medio, 2 = difícil). Lo escribe sorteo-dificultades.mjs; no lo edites a mano
// (si quieres cambiar un nivel, cambia su dígito en su línea). No toca la página (no usa document).
// Cada línea = un TRAMO de 100 niveles seguidos (39 líneas); no coincide con un país (20 niveles cada uno: el país 1 = niveles 1–20, el 2 = 21–40…).
// Línea 1 = niveles 1–100, línea 2 = 101–200, ... Los niveles 1–10 son siempre medios.
const ETAPAS = [
${lineas.map((l) => '  "' + l + '",').join("\n")}
];
export const SORTEO = ETAPAS.join("");
// Dificultad (1 o 2) del nivel n
export const dificultadSorteada = (n) => (SORTEO.charCodeAt(n - 1) === 50 ? 2 : 1);
`;
writeFileSync(new URL("./dificultades-estacionamiento.js", import.meta.url), salida);
console.log("Escrito dificultades-estacionamiento.js:", lineas.length, "etapas");
