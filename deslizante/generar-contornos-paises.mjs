// Ruta: herramientas/generar-contornos-paises.mjs
// Herramienta de DESARROLLO (solo consola; NO va en sw.js). Convierte un GeoJSON de países en compartido/contornos-paises.js,
// el archivo con la silueta de cada país que usa la «botella» de compartido/mapa-niveles.js.
//
//   1) Descarga UNA vez un GeoJSON de países (dominio público, Natural Earth). Recomendado el de 50 m (≈ 1.5 MB; el script lo simplifica):
//        https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
//      (el de 110 m también sirve, pero le faltan más países chicos). Cualquier GeoJSON con el código ISO de 2 letras en
//      ISO_A2_EH, ISO_A2, iso_a2, ISO3166-1-Alpha-2 o cca2 funciona.
//   2) node herramientas/generar-contornos-paises.mjs ruta/ne_50m_admin_0_countries.geojson
//      (opcional, 2.º argumento: archivo de salida; por defecto compartido/contornos-paises.js)
//   3) Sube el archivo generado. Los países que el GeoJSON no traiga (Mónaco, Vaticano, Singapur…) usan la botella genérica.
//
// Qué hace por país: toma el contorno de la tierra principal y las islas grandes cercanas (descarta territorios de ultramar lejanos,
// como la Guayana Francesa en Francia, y islitas), corrige el cruce de la línea de fecha (Rusia, Fiji, EE. UU.), proyecta en plano con la
// longitud encogida por el coseno de la latitud, escala a 400 unidades en su lado mayor y simplifica con Douglas-Peucker.
import fs from "node:fs";

const MAX = 400;          // lado mayor de cada silueta, en unidades
const TOLERANCIA = 1.1;   // simplificación (unidades): más alto = menos puntos y más «cuadrado»
const AREA_MIN = 0.01;    // una isla/parte debe medir al menos el 1 % de la parte mayor
const CERCA = 14;         // grados: una parte debe estar a menos de esto de otra ya aceptada

const codigoDe = (p) => {
  for (const k of ["ISO_A2_EH", "ISO_A2", "iso_a2", "ISO3166-1-Alpha-2", "cca2"]) {
    const v = p && p[k];
    if (typeof v === "string" && /^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  }
  return null;
};
const anillosDe = (g) => {            // solo el contorno exterior de cada polígono (los huecos se ignoran)
  if (!g) return [];
  if (g.type === "Polygon") return [g.coordinates[0]];
  if (g.type === "MultiPolygon") return g.coordinates.map((p) => p[0]);
  return [];
};
const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
const caja = (r) => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (const [x, y] of r) { if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; } return { x0: a, x1: b, y0: c, y1: d }; };
const distCajas = (p, q) => Math.hypot(Math.max(0, p.x0 - q.x1, q.x0 - p.x1), Math.max(0, p.y0 - q.y1, q.y0 - p.y1));

function simplificar(pts, tol) {      // Douglas-Peucker (anillo cerrado: se parte en dos mitades)
  const dp = (a) => {
    if (a.length < 3) return a;
    const [x1, y1] = a[0], [x2, y2] = a[a.length - 1], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9;
    let mx = 0, mi = -1;
    for (let i = 1; i < a.length - 1; i++) { const dd = Math.abs(dy * (a[i][0] - x1) - dx * (a[i][1] - y1)) / L; if (dd > mx) { mx = dd; mi = i; } }
    if (mx <= tol) return [a[0], a[a.length - 1]];
    return [...dp(a.slice(0, mi + 1)).slice(0, -1), ...dp(a.slice(mi))];
  };
  const m = Math.floor(pts.length / 2);
  const r = [...dp(pts.slice(0, m + 1)).slice(0, -1), ...dp(pts.slice(m).concat([pts[0]])).slice(0, -1)];
  return r;
}

function contorno(features) {
  let anillos = features.flatMap((f) => anillosDe(f.geometry)).filter((r) => r && r.length > 2);
  if (!anillos.length) return null;
  const todo = caja(anillos.flat());
  if (todo.x1 - todo.x0 > 180) anillos = anillos.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));   // cruza la línea de fecha
  const lista = anillos.map((r) => ({ r, a: area(r), c: caja(r) })).sort((p, q) => q.a - p.a);
  const aceptados = [lista[0]];
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const x of lista) {
      if (aceptados.includes(x) || x.a < lista[0].a * AREA_MIN) continue;
      if (aceptados.some((y) => distCajas(x.c, y.c) <= CERCA)) { aceptados.push(x); cambio = true; }
    }
  }
  const caj = caja(aceptados.flatMap((x) => x.r));
  const kx = Math.max(0.35, Math.cos(((caj.y0 + caj.y1) / 2) * Math.PI / 180));
  const ancho = (caj.x1 - caj.x0) * kx, alto = caj.y1 - caj.y0, s = MAX / Math.max(ancho, alto, 1e-6);
  const proy = ([x, y]) => [(x - caj.x0) * kx * s, (caj.y1 - y) * s];
  const partes = [];
  for (const x of aceptados) {
    const q = simplificar(x.r.map(proy), TOLERANCIA).map(([a, b]) => [Math.round(a), Math.round(b)]);
    const limpio = q.filter((p, i) => i === 0 || p[0] !== q[i - 1][0] || p[1] !== q[i - 1][1]);
    if (limpio.length >= 3 && area(limpio) >= 6) partes.push(limpio);
  }
  if (!partes.length) return null;
  return { w: Math.round(ancho * s), h: Math.round(alto * s), d: partes.map((r) => "M" + r.map((p) => p[0] + " " + p[1]).join("L") + "Z").join("") };
}

const [, , entrada, salida = "compartido/contornos-paises.js"] = process.argv;
if (!entrada) { console.error("Uso: node herramientas/generar-contornos-paises.mjs ruta/paises.geojson [salida.js]"); process.exit(1); }
const gj = JSON.parse(fs.readFileSync(entrada, "utf8"));
const porPais = {};
for (const f of gj.features || []) { const c = codigoDe(f.properties); if (c) (porPais[c] ||= []).push(f); }
const res = {};
for (const c of Object.keys(porPais).sort()) { const x = contorno(porPais[c]); if (x) res[c] = x; }
const filas = Object.entries(res).map(([c, x]) => "  " + c + ": { w: " + x.w + ", h: " + x.h + ', d: "' + x.d + '" },');
const texto =
  "// Ruta: compartido/contornos-paises.js\n" +
  "// GENERADO con herramientas/generar-contornos-paises.mjs a partir de un GeoJSON de países (Natural Earth, dominio público). No se edita a mano.\n" +
  "// Silueta muy simplificada de cada país para la «botella» de compartido/mapa-niveles.js: { w, h, d } con el lado mayor en 400 unidades;\n" +
  "// «d» es un trazo SVG (solo M, L y Z). Los países que no estén aquí usan la botella genérica.\n" +
  "export const CONTORNOS = {\n" + filas.join("\n") + "\n};\n";
fs.writeFileSync(salida, texto);
console.log(Object.keys(res).length + " países escritos en " + salida + " (" + Math.round(texto.length / 1024) + " KB)");
