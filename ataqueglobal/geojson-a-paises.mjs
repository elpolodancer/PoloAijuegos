// Ruta: ataqueglobal/herramientas/geojson-a-paises.mjs
// Convierte un GeoJSON de países (Natural Earth «admin 0 – countries», 110m o 50m; también sirve cualquiera con ISO_A2) al formato de
// ataqueglobal/paises-ataqueglobal.js, para tener FRONTERAS REALES en lugar del dibujo aproximado.
//   1) Descarga ne_110m_admin_0_countries.geojson (naturalearthdata.com, dominio público) y déjalo, por ejemplo, en ataqueglobal/herramientas/.
//   2) node ataqueglobal/herramientas/geojson-a-paises.mjs ruta/al/archivo.geojson
// Los países que el GeoJSON no traiga (Mónaco, Malta, islas del Pacífico…) se conservan del archivo actual como marcadores.
// ⚠️ Estados Unidos, Canadá y Rusia están partidos en divisiones (US1…, CA1…, RU1…): el GeoJSON NO las reemplaza (siguen con su dibujo aproximado)
//    hasta que se recorten las fronteras reales con las divisiones. Las demás sí quedan con frontera real.
import { readFileSync, writeFileSync } from "node:fs";
import { PAISES as ACTUAL, NOMBRES_ESPECIALES, LIMITES, DIVISIONES } from "../paises-ataqueglobal.js";

const entrada = process.argv[2];
if (!entrada) { console.error("Uso: node geojson-a-paises.mjs archivo.geojson"); process.exit(1); }
const gj = JSON.parse(readFileSync(entrada, "utf8"));
const TOL = 0.04;                                    // simplificación en grados (0 = sin simplificar)
const UNIR = { GL: "DK", PR: "US", TW: "CN", PS: "IL", XK: "RS", EH: "MA", GF: "FR" }; // territorios que se pintan como parte de otro país
const POR_A3 = { FRA: "FR", NOR: "NO", CYN: "CY", SOL: "SO", KOS: "RS" };               // Natural Earth trae «-99» en el ISO_A2 de algunos

const iso2 = (p) => {
  let c = p.ISO_A2_EH || p.ISO_A2 || p.iso_a2 || p.ISO2;
  if (!c || c === "-99") c = POR_A3[p.ADM0_A3 || p.ISO_A3 || p.iso_a3] || null;
  return c && UNIR[c] ? UNIR[c] : c;
};
function dp(a, tol) { // Douglas-Peucker sobre un anillo cerrado [[x,y],…]
  if (!tol || a.length < 8) return a;
  const rec = (s, e, out) => {
    const [x1, y1] = a[s], [x2, y2] = a[e], L = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
    let dm = 0, im = -1;
    for (let i = s + 1; i < e; i++) { const d = Math.abs((x2 - x1) * (y1 - a[i][1]) - (x1 - a[i][0]) * (y2 - y1)) / L; if (d > dm) { dm = d; im = i; } }
    if (dm > tol) { rec(s, im, out); rec(im, e, out); } else out.push(a[e]);
  };
  const out = [a[0]]; rec(0, a.length - 1, out);
  return out.length >= 4 ? out : a;
}
const nuevo = {};
for (const f of gj.features || []) {
  const iso = iso2(f.properties || {});
  if (!iso || !f.geometry) continue;
  const polis = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
  for (const poli of polis) for (const anillo of poli) {
    const s = dp(anillo, TOL).slice(0, -1); // GeoJSON repite el primer punto al final
    if (s.length < 3) continue;
    (nuevo[iso] ||= { r: [] }).r.push(s.flatMap(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]));
  }
}
const salida = { ...ACTUAL };
let reales = 0;
for (const iso of Object.keys(nuevo)) if (ACTUAL[iso] && !ACTUAL[iso].m) { salida[iso] = nuevo[iso]; reales++; }
// «PS» no existe en el juego: ya se unió a IL arriba
let js = "// Ruta: ataqueglobal/paises-ataqueglobal.js\n// GENERADO por ataqueglobal/herramientas/geojson-a-paises.mjs a partir de un GeoJSON real — no se edita a mano.\n";
js += "// Cada país: { r: [anillo, …], m: 1 si es marcador }. Cada anillo es una lista plana [lon, lat, lon, lat, …] (relleno par-impar).\n";
js += "// «IL» es el territorio «Palestina/Israel».\n";
js += "export const NOMBRES_ESPECIALES = " + JSON.stringify(NOMBRES_ESPECIALES) + ";\n";
js += "export const DIVISIONES = " + JSON.stringify(DIVISIONES) + ";\n";
js += "export const LIMITES = " + JSON.stringify(LIMITES) + ";\nexport const PAISES = {\n";
for (const iso of Object.keys(salida).sort()) js += "  " + iso + ": " + JSON.stringify(salida[iso]) + ",\n";
js += "};\n";
writeFileSync(new URL("../paises-ataqueglobal.js", import.meta.url), js);
console.log("países con frontera real:", reales, "| conservados del archivo anterior:", Object.keys(salida).length - reales, "| KB:", (js.length / 1024).toFixed(0));
