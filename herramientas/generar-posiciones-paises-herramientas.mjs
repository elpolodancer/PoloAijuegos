// Herramienta de CONSOLA (no va al sw.js). Va en herramientas/ y se corre desde la RAÍZ del repositorio: node herramientas/generar-posiciones-paises-herramientas.mjs
// Calcula DÓNDE va la silueta de cada país (compartido/contornos-paises.js) sobre el mapa del mundo y escribe compartido/posiciones-paises.js:
//   POSICIONES.MX = [lon0, latArriba, gradosLonPorUnidad, gradosLatPorUnidad]   la silueta (en su caja de 300) se coloca así: lon = lon0 + x * gLon · lat = latArriba - y * gLat
//   POSICIONES.XX = [lon, lat]                                                  país diminuto (gota o Vaticano): no lleva silueta en el mundo, solo un punto
// Usa los MISMOS datos y la MISMA simplificación que generar-contornos-paises-herramientas.mjs (hay que correr los dos con las mismas versiones de world-atlas).
// Requisitos:  npm i world-atlas topojson-client i18n-iso-countries
import fs from "fs";
import * as topo from "topojson-client";
import iso from "i18n-iso-countries";

const LADO = 300;
const SOLO_PRINCIPAL = new Set(["US","FR","ES","PT","NL","DK","CL","EC","NO","GB","CV","KI","MU","SC"]);
const src = fs.readFileSync("compartido/etapas-mapa.js", "utf8");
const codigos = [...src.match(/PAISES_MUNDO = \(([\s\S]*?)\)\.split/)[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).join(" ").split(/\s+/).filter(Boolean);
const CONT = JSON.parse(fs.readFileSync("compartido/contornos-paises.js", "utf8").match(/export const CONTORNOS = (\{[\s\S]*\});/)[1]);

const t = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-10m.json", "utf8"));
const geos = new Map(t.objects.countries.geometries.map((g) => [String(g.id), g]));
const area = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); };
const caja = (r) => r.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
const r2 = (v) => Math.round(v * 1e4) / 1e4;

const salida = {}, avisos = [];
for (const c of codigos) {
  const cont = CONT[c];
  const g = geos.get(String(iso.alpha2ToNumeric(c)));
  if (!g || !cont) { avisos.push("sin datos: " + c); continue; }
  const f = topo.feature(t, g);
  const polis = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  let anillos = polis.map((p) => p[0]);
  const cruza = anillos.some((r) => r.some(([x]) => x > 170)) && anillos.some((r) => r.some(([x]) => x < -170));
  if (cruza) anillos = anillos.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));
  const lonLat = anillos;                                           // antes de acortar la longitud
  const lat = anillos.flatMap((r) => r.map((p) => p[1])), k = Math.cos(((Math.min(...lat) + Math.max(...lat)) / 2) * Math.PI / 180);
  anillos = anillos.map((r) => r.map(([x, y]) => [x * k, -y]));
  anillos.sort((a, b) => area(b) - area(a));
  const total = anillos.reduce((s, r) => s + area(r), 0);
  let uni = caja(anillos[0]); const quedan = [anillos[0]];
  for (const r of anillos.slice(1)) {
    if (SOLO_PRINCIPAL.has(c)) { const b = caja(r), a0 = caja(anillos[0]); if (b[0] < a0[0] - 1 || b[2] > a0[2] + 1 || b[1] < a0[1] - 1 || b[3] > a0[3] + 1) continue; }
    if (quedan.length >= 14 || area(r) < total * 0.004) continue;
    const b = caja(r), gx = Math.max(uni[0] - b[2], b[0] - uni[2], 0), gy = Math.max(uni[1] - b[3], b[1] - uni[3], 0);
    if (Math.hypot(gx, gy) > 0.6 * Math.max(uni[2] - uni[0], uni[3] - uni[1])) continue;
    quedan.push(r); uni = [Math.min(uni[0], b[0]), Math.min(uni[1], b[1]), Math.max(uni[2], b[2]), Math.max(uni[3], b[3])];
  }
  const esc = LADO / Math.max(uni[2] - uni[0], uni[3] - uni[1]);
  if (cont.gota || c === "VA") {                                    // sin silueta útil: un punto en el centro de la caja
    salida[c] = [r2((uni[0] + uni[2]) / 2 / k), r2(-(uni[1] + uni[3]) / 2)];
    continue;
  }
  let lon0 = uni[0] / k;
  if (lon0 > 180) lon0 -= 360;                                      // EE. UU. cruza el meridiano 180 (islas Aleutianas): su silueta quedó desplazada 360°, se devuelve a su sitio
  salida[c] = [r2(lon0), r2(-uni[1]), r2(1 / (esc * k)), r2(1 / esc)];
  // comprobación: el ancho/alto de la caja que sale debe coincidir con el de contornos-paises.js
  const w = Math.max(1, Math.round((uni[2] - uni[0]) * esc)), h = Math.max(1, Math.round((uni[3] - uni[1]) * esc));
  if (Math.abs(w - cont.w) > 1 || Math.abs(h - cont.h) > 1) avisos.push(c + ": la caja no coincide (" + w + "×" + h + " vs " + cont.w + "×" + cont.h + ")");
}
// «AU» (Australia): su contorno se corrigió A MANO (continente + Tasmania, de geografia-mapa.js, 113,5…153,5 E · 10,7…43,6 S), así que se coloca a mano
salida.AU = [113.5, -10.7, r2(40 / LADO), r2((43.6 - 10.7) / CONT.AU.h)];

fs.mkdirSync("compartido", { recursive: true });
fs.writeFileSync("compartido/posiciones-paises.js",
`// Ruta: compartido/posiciones-paises.js   (GENERADO por generar-posiciones-paises-herramientas.mjs: no se edita a mano)
// DÓNDE va la silueta de cada país de compartido/contornos-paises.js sobre el mapa del mundo (lo usa compartido/mapa-niveles.js, vista «Mapa» con unPais).
//   POSICIONES.MX = [lon0, latArriba, gLon, gLat]   el punto (x, y) de la silueta (caja de 300) cae en  lon = lon0 + x·gLon  ·  lat = latArriba − y·gLat
//   POSICIONES.XX = [lon, lat]                      país diminuto (gota o Vaticano): en el mundo solo es un punto
// «AU» (Australia) se colocó A MANO (su contorno también es manual): si vuelves a correr el generador, ya lo repite.
export const POSICIONES = ${JSON.stringify(salida)};
`);
console.log("posiciones:", Object.keys(salida).length, "· puntos:", Object.values(salida).filter((v) => v.length === 2).length);
avisos.forEach((a) => console.warn(a));
