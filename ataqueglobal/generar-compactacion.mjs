// Ruta: ataqueglobal/herramientas/generar-compactacion.mjs
// Genera ataqueglobal/compactacion-ataqueglobal.js: la tabla que «compacta» el mundo (quita agua sin encoger los países).
// Es un CARTOGRAMA POR DIFUSIÓN (Gastner–Newman): la tierra pesa 1 y el mar pesa EPS (< 1); el mapa se deforma hasta que la superficie de cada zona es
// proporcional a su peso → el mar se encoge, la tierra crece y las fronteras siguen pegadas (la deformación es continua).
// Uso (desde la carpeta ataqueglobal/):   node herramientas/generar-compactacion.mjs            (tarda unos segundos)
// Hay que volver a generarlo SOLO si cambia paises-ataqueglobal.js o quieres otra fuerza (EPS). Cambiarlo mueve los países: no lo hagas con partidas ya guardadas.
import { PAISES } from "../paises-ataqueglobal.js";
import fs from "node:fs";

const EPS = 0.45;      // peso del mar frente a la tierra (1 = mapa real; 0.4 = muy compacto, deforma más)
const PASOS = 2500;    // pasos de difusión (más = más cerca del equilibrio)
const DT = 0.2;
const NX = 180, NY = 90;          // celdas de 2° para calcular
const SALTO = 2;                  // la tabla que se guarda es de 4° (cada 2 puntos de la retícula)
const U = 0.05;                   // unidad de la tabla: 0.05°

// --- máscara de tierra (par-impar, igual que el dibujo) ---
const M = new Float64Array(NX * NY);
for (const iso in PAISES) {
  const d = PAISES[iso]; if (d.m) continue;
  for (const a of d.r) {
    const n = a.length / 2;
    for (let j = 0; j < NY; j++) {
      const y = -90 + (j + 0.5) * 2, xs = [];
      for (let i = 0, k = n - 1; i < n; k = i++) { const yi = a[i * 2 + 1], yk = a[k * 2 + 1]; if ((yi > y) !== (yk > y)) xs.push(a[i * 2] + ((y - yi) / (yk - yi)) * (a[k * 2] - a[i * 2])); }
      xs.sort((p, q) => p - q);
      for (let s = 0; s + 1 < xs.length; s += 2) for (let i = Math.max(0, Math.floor((xs[s] + 180) / 2)); i <= Math.min(NX - 1, Math.floor((xs[s + 1] + 180) / 2)); i++) { const cx = -180 + (i + 0.5) * 2; if (cx >= xs[s] && cx <= xs[s + 1]) M[j * NX + i] = M[j * NX + i] ? 0 : 1; }
    }
  }
}

// --- difusión + movimiento de la retícula ---
let rho = new Float64Array(NX * NY); for (let k = 0; k < rho.length; k++) rho[k] = EPS + (1 - EPS) * M[k];
const PX = new Float64Array((NX + 1) * (NY + 1)), PY = new Float64Array((NX + 1) * (NY + 1));
for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { PX[j * (NX + 1) + i] = i; PY[j * (NX + 1) + i] = j; }
const vx = new Float64Array(NX * NY), vy = new Float64Array(NX * NY);
const R = (j, i) => rho[Math.max(0, Math.min(NY - 1, j)) * NX + (((i % NX) + NX) % NX)];
const G = (a, j, i) => a[Math.max(0, Math.min(NY - 1, j)) * NX + (((i % NX) + NX) % NX)];
for (let s = 0; s < PASOS; s++) {
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const r = rho[j * NX + i]; vx[j * NX + i] = -(R(j, i + 1) - R(j, i - 1)) / 2 / r; vy[j * NX + i] = -(R(j + 1, i) - R(j - 1, i)) / 2 / r; }
  for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) { // la columna NX es copia de la 0 (más abajo)
    const k = j * (NX + 1) + i, fx = PX[k] - 0.5, fy = PY[k] - 0.5, i0 = Math.floor(fx), j0 = Math.floor(fy), tx = fx - i0, ty = fy - j0;
    const ux = (1 - ty) * ((1 - tx) * G(vx, j0, i0) + tx * G(vx, j0, i0 + 1)) + ty * ((1 - tx) * G(vx, j0 + 1, i0) + tx * G(vx, j0 + 1, i0 + 1));
    const uy = (1 - ty) * ((1 - tx) * G(vy, j0, i0) + tx * G(vy, j0, i0 + 1)) + ty * ((1 - tx) * G(vy, j0 + 1, i0) + tx * G(vy, j0 + 1, i0 + 1));
    PX[k] += ux * DT; PY[k] = Math.max(0, Math.min(NY, PY[k] + uy * DT));
  }
  const nr = new Float64Array(rho.length);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) nr[j * NX + i] = rho[j * NX + i] + DT * (R(j, i + 1) + R(j, i - 1) + R(j + 1, i) + R(j - 1, i) - 4 * rho[j * NX + i]);
  rho = nr;
}
for (let j = 0; j <= NY; j++) PX[j * (NX + 1) + NX] = PX[j * (NX + 1)] + NX; // el antimeridiano coincide

// --- tabla de desplazamientos (en unidades de U grados) cada 4° ---
const nx = NX / SALTO, ny = NY / SALTO, dx = [], dy = [];
const lon = (j, i) => -180 + 2 * PX[j * (NX + 1) + i], lat = (j, i) => -90 + 2 * PY[j * (NX + 1) + i];
for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
  const a = lon(j * SALTO, i * SALTO) - (-180 + 4 * i), b = lat(j * SALTO, i * SALTO) - (-90 + 4 * j);
  dx.push(Math.round(a / U)); dy.push(j === 0 || j === ny ? 0 : Math.round(b / U)); // los polos no se mueven
}
// escala media de un país (raíz del cociente de superficies sobre tierra)
let ss = 0, nn = 0;
for (let j = 2; j < NY - 2; j++) for (let i = 0; i < NX; i++) {
  if (!M[j * NX + i]) continue;
  const dX = (lon(j, i + 1) - lon(j, i - 1 < 0 ? i - 1 + NX : i - 1)) / 2, dY = (lat(j + 1, i) - lat(j - 1, i)) / 2;
  const kx = Math.abs(i === 0 || i === NX - 1 ? 1 : dX) / 2, ky = dY / 2;
  ss += Math.sqrt(Math.max(1e-6, kx * ky)); nn++;
}
const escala = Math.round((ss / nn) * 100) / 100;
console.log("equilibrio: densidad final", Math.min(...rho).toFixed(3), "…", Math.max(...rho).toFixed(3), "| escala media de un país ≈", escala);

const lineas = (v) => { const o = []; for (let i = 0; i < v.length; i += 30) o.push("  " + v.slice(i, i + 30).join(",")); return o.join(",\n"); };
const js = "// Ruta: ataqueglobal/compactacion-ataqueglobal.js\n// GENERADO por ataqueglobal/herramientas/generar-compactacion.mjs — no se edita a mano (se vuelve a generar).\n" +
  "// Tabla cada " + 4 + "° (de −180 a 180 y de −90 a 90): cuánto se mueve cada punto del mapa al «compactar» el mundo, en unidades de " + U + "°. EPS = " + EPS + ".\n" +
  "export const COMPACTACION = { paso: 4, nx: " + nx + ", ny: " + ny + ", unidad: " + U + ", escala: " + escala + ",\n dx: [\n" + lineas(dx) + "\n ],\n dy: [\n" + lineas(dy) + "\n ] };\n";
fs.writeFileSync(new URL("../compactacion-ataqueglobal.js", import.meta.url), js);
console.log("escrito compactacion-ataqueglobal.js (" + js.length + " bytes)");
