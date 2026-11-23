// Herramienta de CONSOLA (no va al sw.js). Va en herramientas/ y se corre desde la RAÍZ del repositorio: node herramientas/generar-contornos-paises-herramientas.mjs
// Lee contornos (world-atlas 10m, dominio público Natural Earth) y banderas (flag-icons, MIT) de node_modules y escribe:
//   compartido/contornos-paises.js   { MX: { w, h, d }, ... }  silueta de cada país en una caja de 300 unidades (path SVG)
//   imagenes-banderas/xx.svg         la bandera de cada país (4x3)
// Requisitos:  npm i world-atlas topojson-client flag-icons i18n-iso-countries
import fs from "fs";
import * as topo from "topojson-client";
import iso from "i18n-iso-countries";

const LADO = 300, TOL = 1.1;                 // caja de la silueta y tolerancia de simplificación (en unidades de la caja)
const SOLO_PRINCIPAL = new Set(["US","FR","ES","PT","NL","DK","CL","EC","NO","GB","CV","KI","MU","SC"]); // sin territorios lejanos
const src = fs.readFileSync("compartido/etapas-mapa.js", "utf8");
const codigos = [...src.match(/PAISES_MUNDO = \(([\s\S]*?)\)\.split/)[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).join(" ").split(/\s+/).filter(Boolean);

const t = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-10m.json", "utf8"));
const geos = new Map(t.objects.countries.geometries.map((g) => [String(g.id), g]));

const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
const caja = (r) => r.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
function dp(p, e) { // Douglas-Peucker (anillo abierto)
  if (p.length < 3) return p;
  const [ax, ay] = p[0], [bx, by] = p[p.length - 1], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  let mx = 0, mi = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = Math.abs(dy * p[i][0] - dx * p[i][1] + bx * ay - by * ax) / L; if (d > mx) { mx = d; mi = i; } }
  if (mx <= e) return [p[0], p[p.length - 1]];
  return [...dp(p.slice(0, mi + 1), e).slice(0, -1), ...dp(p.slice(mi), e)];
}

const salida = {};
for (const c of codigos) {
  const g = geos.get(String(iso.alpha2ToNumeric(c)));
  if (!g) { console.warn("sin contorno:", c); continue; }
  const f = topo.feature(t, g);
  const polis = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let anillos = polis.map((p) => p[0]);                         // solo el borde exterior (los lagos se ignoran)
  const cruza = anillos.some((r) => r.some(([x]) => x > 170)) && anillos.some((r) => r.some(([x]) => x < -170));
  if (cruza) anillos = anillos.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));   // Rusia, Fiyi…: que no se parta en dos
  const lat = anillos.flatMap((r) => r.map((p) => p[1])), k = Math.cos(((Math.min(...lat) + Math.max(...lat)) / 2) * Math.PI / 180);
  anillos = anillos.map((r) => r.map(([x, y]) => [x * k, -y]));  // plano con la longitud acortada según la latitud; y hacia abajo
  anillos.sort((a, b) => area(b) - area(a));
  const total = anillos.reduce((s, r) => s + area(r), 0);
  let uni = caja(anillos[0]); const quedan = [anillos[0]];
  for (const r of anillos.slice(1)) {                            // islas: solo las que pesan algo y quedan cerca del conjunto
    if (SOLO_PRINCIPAL.has(c)) { const b = caja(r), a0 = caja(anillos[0]); if (b[0] < a0[0] - 1 || b[2] > a0[2] + 1 || b[1] < a0[1] - 1 || b[3] > a0[3] + 1) continue; }
    if (quedan.length >= 14 || area(r) < total * 0.004) continue;
    const b = caja(r), gx = Math.max(uni[0] - b[2], b[0] - uni[2], 0), gy = Math.max(uni[1] - b[3], b[1] - uni[3], 0);
    if (Math.hypot(gx, gy) > 0.6 * Math.max(uni[2] - uni[0], uni[3] - uni[1])) continue;
    quedan.push(r); uni = [Math.min(uni[0], b[0]), Math.min(uni[1], b[1]), Math.max(uni[2], b[2]), Math.max(uni[3], b[3])];
  }
  const ancho = uni[2] - uni[0], alto = uni[3] - uni[1], esc = LADO / Math.max(ancho, alto);
  const w = Math.max(1, Math.round(ancho * esc)), h = Math.max(1, Math.round(alto * esc));
  let d = "";
  for (const r of quedan) {
    let p = r.map(([x, y]) => [(x - uni[0]) * esc, (y - uni[1]) * esc]);
    const m = p.length >> 1; p = [...dp(p.slice(0, m + 1), TOL).slice(0, -1), ...dp([...p.slice(m), p[0]], TOL).slice(0, -1)].map(([x, y]) => [Math.round(x), Math.round(y)]).filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]);
    if (p.length >= 3) d += "M" + p.map((q) => q.join(" ")).join(" ") + "Z";
  }
  if (!d) { // país diminuto sin silueta útil: una gota
    d = "M150 20C215 20 255 75 255 130C255 195 200 280 150 280C100 280 45 195 45 130C45 75 85 20 150 20Z"; salida[c] = { w: 300, h: 300, d, gota: 1 }; continue;
  }
  salida[c] = { w, h, d };
}

// «VA» (Vaticano): Natural Earth 10m no lo trae. Contorno aproximado dibujado a mano [longitud, latitud] (la plaza de San Pedro es el saliente del este).
const VATICANO = [[12.4586,41.9022],[12.4583,41.9028],[12.4576,41.9032],[12.4566,41.9033],[12.4556,41.9031],[12.4551,41.9040],[12.4549,41.9053],[12.4542,41.9062],[12.4527,41.9069],[12.4508,41.9074],[12.4488,41.9072],[12.4470,41.9063],[12.4461,41.9051],[12.4458,41.9040],[12.4464,41.9030],[12.4478,41.9025],[12.4492,41.9019],[12.4503,41.9011],[12.4517,41.9005],[12.4534,41.9004],[12.4548,41.9009],[12.4558,41.9012],[12.4568,41.9011],[12.4577,41.9014],[12.4584,41.9018]];
{
  const k = Math.cos(((Math.min(...VATICANO.map((p) => p[1])) + Math.max(...VATICANO.map((p) => p[1]))) / 2) * Math.PI / 180);
  const P = VATICANO.map(([x, y]) => [x * k, -y]), x0 = Math.min(...P.map((p) => p[0])), y0 = Math.min(...P.map((p) => p[1]));
  const W = Math.max(...P.map((p) => p[0])) - x0, H = Math.max(...P.map((p) => p[1])) - y0, esc = LADO / Math.max(W, H);
  salida.VA = { w: Math.max(1, Math.round(W * esc)), h: Math.max(1, Math.round(H * esc)), d: "M" + P.map(([x, y]) => Math.round((x - x0) * esc) + " " + Math.round((y - y0) * esc)).join(" ") + "Z" };
}

fs.mkdirSync("compartido", { recursive: true });
fs.writeFileSync("compartido/contornos-paises.js",
`// Ruta: compartido/contornos-paises.js   (GENERADO por generar-contornos-paises-herramientas.mjs: no se edita a mano)
// Silueta MUY simplificada de cada uno de los 195 países (datos de Natural Earth, dominio público), para el mapa de niveles
// (compartido/mapa-niveles.js): el país es la «botella» que se llena de agua. Cada una cabe en una caja de ${LADO} unidades:
//   CONTORNOS.MX = { w, h, d }   w, h = ancho y alto de la silueta · d = trazo SVG (viewBox "0 0 w h")
// En los países que tienen territorios lejanos (EE. UU., Francia, España…) solo se dibuja la parte principal.
// Los países diminutos que no tienen silueta útil traen una gota (gota: 1), salvo el Vaticano (dibujado a mano).
export const CONTORNOS = ${JSON.stringify(salida)};
`);
fs.mkdirSync("imagenes-banderas", { recursive: true });
let n = 0;
for (const c of codigos) { const o = `node_modules/flag-icons/flags/4x3/${c.toLowerCase()}.svg`; if (fs.existsSync(o)) { fs.copyFileSync(o, `imagenes-banderas/${c.toLowerCase()}.svg`); n++; } else console.warn("sin bandera:", c); }
console.log("siluetas:", Object.keys(salida).length, "· banderas:", n);
