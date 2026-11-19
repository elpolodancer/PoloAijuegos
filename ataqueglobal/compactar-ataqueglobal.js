// Ruta: ataqueglobal/compactar-ataqueglobal.js
// COMPACTAR EL MUNDO: quita gran parte del agua del globo SIN encoger los países (a propósito deja de ser realista).
// La deformación viene de una tabla ya calculada (compactacion-ataqueglobal.js, generada por herramientas/generar-compactacion.mjs): cada punto del mapa se
// desplaza un poco para que los continentes se acerquen y crezcan y el océano se encoja. Es continua: las fronteras siguen pegadas y los países conservan su forma.
// mapa-ataqueglobal.js la aplica UNA vez, al cargar, a todos los contornos; paises-ataqueglobal.js no se toca (sigue siendo el mapa real). No usa document.
//
//   const c = crearCompactador({ fuerza: 1 });   // 0 = mapa real sin cambios; 1 = lo calculado (≈ −45 % de agua); entre 0 y 1 = a medias
//   c.punto(lon, lat) → [lon, lat] deformado      c.anillo([lon, lat, …]) → anillo deformado (con lados de ≤ 2°)
//   c.escala → cuántas veces más grande (en grados) queda un país (≈ 1.2): sirve para ajustar el tamaño del planeta en pantalla, alcances, etc.
// Las longitudes que salen no se envuelven a (−180, 180]: cada anillo se mueve entero (±360) para que su centro quede dentro, así no se parte en el antimeridiano.
import { COMPACTACION } from "./compactacion-ataqueglobal.js";

const PASO = 2;   // lado máximo de un contorno después de densificar (grados)

export function crearCompactador({ fuerza = 1 } = {}) {
  const f = Math.max(0, Math.min(1, Number(fuerza) || 0));
  if (f === 0) return { punto: (x, y) => [x, y], anillo: (a) => Array.from(a), escala: 1 };
  const { paso, nx, ny, unidad, dx, dy } = COMPACTACION, W = nx + 1;
  const kf = unidad * f;

  const punto = (lon, lat) => {
    const fx = (lon + 180) / paso, fy = (lat + 90) / paso;
    const i = Math.max(0, Math.min(nx - 1, Math.floor(fx))), j = Math.max(0, Math.min(ny - 1, Math.floor(fy))), tx = fx - i, ty = Math.max(0, Math.min(1, fy - j));
    const k = j * W + i, a = (1 - tx) * (1 - ty), b = tx * (1 - ty), c = (1 - tx) * ty, d = tx * ty;
    return [lon + kf * (a * dx[k] + b * dx[k + 1] + c * dx[k + W] + d * dx[k + W + 1]), lat + kf * (a * dy[k] + b * dy[k + 1] + c * dy[k + W] + d * dy[k + W + 1])];
  };

  function anillo(a) { // densifica (lados de ≤ 2°, sin cruzar el antimeridiano) y deforma
    const n = a.length / 2, out = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, x0 = a[i * 2], y0 = a[i * 2 + 1], x1 = a[j * 2], y1 = a[j * 2 + 1];
      const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), m = d > PASO && d < 180 ? Math.ceil(d / PASO) : 1;
      for (let k = 0; k < m; k++) { const q = punto(x0 + ((x1 - x0) * k) / m, y0 + ((y1 - y0) * k) / m); out.push(q[0], q[1]); }
    }
    let media = 0; for (let i = 0; i < out.length; i += 2) media += out[i]; media /= out.length / 2;
    const corr = -360 * Math.round(media / 360);
    if (corr) for (let i = 0; i < out.length; i += 2) out[i] += corr;
    return out;
  }
  return { punto, anillo, escala: 1 + (COMPACTACION.escala - 1) * f };
}
