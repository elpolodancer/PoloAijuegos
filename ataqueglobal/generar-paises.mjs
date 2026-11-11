// Ruta: ataqueglobal/herramientas/generar-paises.mjs
// Genera ataqueglobal/paises-ataqueglobal.js (contornos de los países del mundo) SIN internet ni datos externos.
//   node ataqueglobal/herramientas/generar-paises.mjs
// Cómo funciona (es una aproximación DECORATIVA, no un mapa exacto):
//   1. Rasteriza la tierra de compartido/geografia-mapa.js (continentes + México − mares interiores) en una rejilla de PASO grados.
//   2. Cada celda de tierra se la queda la semilla (punto dentro de un país) más cercana. Un país grande tiene varias semillas.
//   3. Se trazan los contornos de cada país sobre la rejilla y se simplifican (Douglas-Peucker).
//   4. Los países diminutos o isleños (sin tierra en geografia-mapa.js) salen como «marcadores»: un círculo pequeño.
// Para tener fronteras REALES más adelante: herramientas/geojson-a-paises.mjs convierte un GeoJSON de Natural Earth al mismo formato.
import { MEXICO, CONTINENTES, LAGOS } from "../../compartido/geografia-mapa.js";
import { writeFileSync } from "node:fs";

const PASO = 0.2, LON0 = -180, LAT0 = 84, LAT1 = -58;
const W = Math.round(360 / PASO), H = Math.round((LAT0 - LAT1) / PASO);
const TOL = 0.2; // tolerancia de simplificación (grados)

// ---------- Tierra extra que no está en geografia-mapa.js ----------
const EXTRA = [
  [[12.4, 38.3], [15.6, 38.3], [15.1, 36.7], [12.5, 37.6]],                 // Sicilia
  [[8.2, 41.2], [9.7, 41.1], [9.6, 39.2], [8.5, 38.9], [8.4, 40.3]],        // Cerdeña
  [[8.6, 42.8], [9.5, 43.0], [9.5, 41.4], [8.8, 41.4]],                     // Córcega
  [[23.6, 35.5], [26.3, 35.3], [26.1, 35.0], [23.6, 35.2]],                 // Creta
  [[-66.0, 18.5], [-65.3, 18.4], [-65.5, 18.0], [-67.2, 18.1], [-67.1, 18.5]], // Puerto Rico (EE. UU.)
  [[119.3, 22.1], [122.0, 25.2], [121.5, 22.0]],                            // Taiwán (se pinta como parte de China)
  [[108.7, 19.1], [111.0, 20.1], [110.5, 18.2]],                            // Hainán
  [[-18, 28.1], [-13.4, 29.2], [-14.3, 28.0]],                              // Canarias (España)
];

// ---------- Semillas: país → lista de «lon,lat» o «lon,lat,sello» (el sello fuerza las celdas en ese radio, para enclaves) ----------
const SEMILLAS = `
CA -128,56.5 -118,54 -108,54.5 -97,54 -86,51.5 -77,50.5 -68,50 -102,64 -120,66 -136,64 -70,62 -76,68 -110,71 -56,48.5 -58,54
US -121,44.4 -111,44.4 -101,44.4 -91,44.4 -82,42 -73.5,44.2 -69,45.4 -119,36 -109,36 -99,33.5 -90,33.5 -83,33 -80,36.5 -76,39 -81,28 -149,64.5 -156,67.5 -135,58.5 -158,59
GT -90.5,15.3 BZ -88.6,17.3,0.6 SV -88.9,13.7,0.7 HN -86.6,14.9 NI -85.2,12.9 CR -84.2,10.0 PA -80.0,8.6
CU -78,21.9 -82.3,22.5 -75.5,20.4 HT -73.0,19.0 DO -70.4,18.9
CO -74.5,5.5 -72.5,2.5 -75.5,2.8 VE -66,8.4 -62.5,6.0 GY -58.8,5.0 SR -55.8,4.0
BR -60,-3 -52,-5 -47,-12 -42,-6 -39,-12 -52,-18 -50,-24 -53,-29 -62.5,-9.5 -68,-8.5 -45,-19 -56,-12 -63,-5.5
EC -78.3,-1.4 PE -76,-6 -72,-12 -75,-9.5 BO -64.5,-16.5 -66,-19.5 PY -58.2,-23.4
CL -69.8,-21 -70.0,-27 -70.9,-33 -71.9,-39 -72.8,-45 -72.8,-50.5 -69.5,-54
AR -67.2,-24 -66,-29 -68.2,-33.5 -65,-38 -69,-39 -68.5,-45 -69.5,-50.5 -59,-27 -61,-33 -60.5,-37.5 -66.5,-52
UY -55.8,-32.8
PT -8.0,40.2 -8.0,38.0
ES -7.9,43.0 -3.7,40.5 -5.4,37.6 -1.2,38.5 -1.5,42.0 1.5,41.8 -4,43 -15.5,28.2
FR 2.3,48.0 4.8,45.3 1.5,44.0 -1.5,47.0 2.5,50.0 6,48.3 9.1,42.2
IT 12.5,42.5 10.0,45.3 16.5,40.0 14.3,41.2 14.0,37.5 9.0,40.0
CH 8.2,46.7 AT 14.0,47.5 DE 8.7,50.2 11.3,48.8 12.8,52.3 9.5,53.5
BE 4.6,50.7 NL 5.5,52.3 GB -2,53.5 -4.2,57.2 IE -8,53.2 IS -19,64.9
NO 8.8,61.5 14.2,66.8 23,69.8 7.0,59.5 SE 15.5,62.5 19.5,67.5 14,57.5 FI 26,63.5 26.5,67.8 25.5,61
DK 9.3,56.0 -42,72 -47,66 -35,76 -52,70 -46,62.5 -54,67 -60,76
EE 25.5,58.7 LV 25,56.9 LT 23.9,55.3 PL 19.5,52.0 21,50.3 CZ 15.5,49.8 SK 19.5,48.7 HU 19.3,47.1 SI 14.8,46.1
HR 16,45.4 15.6,44.3 BA 17.9,44.2 RS 20.8,44.0 ME 19.3,42.7 MK 21.7,41.6 AL 20.0,41.1 GR 22.0,39.5 22.8,38.0 25,35.2
BG 25.3,42.8 RO 25,45.8 27,45 MD 28.6,47.2 UA 31,49.2 35,48 24.5,49.0 33,46 BY 28,53.5
TR 30,39.0 36,39.0 41.5,39.0 27.5,41.0 GE 43.5,42.2 AM 44.8,40.2 AZ 47.8,40.4
RU 36,56 41,60.5 33,64 46,67 46,52 40,46.5 55,56 60,62 65,66 60,52.5 75,60 80,66 85,56 90,70 100,58 105,53 110,66 120,60 130,50 130,64 140,60 150,64 160,60 170,66 135,72 105,72 80,72 125,70 150,69 143,50.5 56,73 90,53 70,71 95,75
KZ 52,49 63,50 75,48.5 55,45 67,45 82,48 UZ 62,41.5 67.5,40.2 TM 59,39.5 55,38.5 TJ 71,38.5 KG 75,41.5
AF 65.5,33.5 68.5,35.5 PK 68,28 72,31 IN 77,27 80,22 75,19 78,13 85,21 73.5,24 94,26.5 77,32.5
NP 84,28.2 BT 90.4,27.4,0.5 BD 90,24 LK 80.7,7.7
MN 100,47 112,47.5 CN 86,42 82,36 90,33 100,35 105,30 103,24 113,27 115,35 110,40 120,46 125,43 117,30 100,41 122,32 121,24 109.5,19.2 128,47
KP 126.9,39.8 KR 127.6,36.6 JP 135,34.8 139,36.5 141,40 142.8,43.3 131,33.2
VN 106,21.3 108,15.5 106.5,11 LA 103,19.5 106,16 KH 105,12.5 TH 101,15.5 99,18.5 99.5,8.5 MM 96,22.5 97.2,16.5 98.7,12.5
MY 102,4.5 113,2.8 116.5,5.6 BN 114.6,4.6,0.5
ID 96.5,4 100,0 104,-3 106,-6.5 110,-7.2 113,-8 114,-1.5 111.5,-0.5 120,-1 122,-4 137,-4.2 138.5,-2.5 132,-1.5
PG 145,-6 143,-6.5 148,-8 150.5,-10.5 PH 121,16.2 125.2,7.3 122,13
SA 38,27 45,24.5 46,19.5 42,18 YE 47,15.8 OM 56,20.5 58.8,23.5 AE 54.4,24.2,1.0 KW 47.6,29.3,0.7
IQ 43.5,33.0 45.5,31.5 43,36 IR 52,33 58.5,30 47.5,33.5 57.5,36 SY 38.3,35.0 JO 36.8,31.0 IL 34.9,31.5,0.8 LB 35.9,33.9,0.35
EG 30,26.5 31,30.2 LY 13,29 21,28.5 TN 9.5,34 DZ 2.5,28 6,33 -1,31 8,24 MA -6.5,33 -10.5,29
SD 30,15.5 28,19 34,13.5 SS 30.5,7.5 ER 38.5,15.5 DJ 42.7,11.8,0.4 ET 39.5,8.5 37,11 SO 46.5,4.5 48.5,8.5 KE 37.5,0.8 UG 32.4,1.5 TZ 34.8,-6.2 36.5,-4
RW 29.9,-2.0,0.8 BI 29.9,-3.35,0.55 CD 23.5,-2 25,3 24,-9 28,-6 21,-6 CG 15.5,-1 GA 11.8,-0.5 GQ 10.4,1.6,0.5 CM 12.5,5.5 13.8,8.5 14.3,10.8 CF 20.5,6.5
TD 18.5,15 17,10 NE 9.5,17 8.5,13.5 13,16 NG 8,9.5 5,8 11,11 BJ 2.3,9.3 TG 1.0,8.0 GH -1.2,7.8 CI -5.6,7.5 BF -1.7,12.2
ML -3,17 -6.5,13 MR -10.5,20.5 -8,17 SN -14.8,14.5 GW -15,12.0,0.5 GN -11.2,10.5 SL -11.8,8.5 LR -9.5,6.5
AO 17.5,-12 ZM 27.5,-14 MW 34.2,-13 MZ 35.5,-16 34,-22 ZW 30,-19.5 BW 23.5,-22 NA 17.5,-20.5 17.5,-26 ZA 24,-29 28.5,-26 22,-32.5 LS 28.2,-29.6,1.3 SZ 31.4,-26.5,0.8 MG 46.8,-19
AU 122,-25 134,-24 142,-22 148,-26 135,-32 146,-37 115,-30 146.8,-42 NZ 175.5,-38.5 170.5,-44
MX -102,23
US -66.3,18.2
`;

// Países-marcador: [iso, lon, lat, radio en grados] (diminutos o isleños; se pintan como un círculo encima)
const MARCADORES = [
  ["AD", 1.55, 42.55, 0.25], ["MC", 7.42, 43.74, 0.15], ["SM", 12.46, 43.94, 0.15], ["VA", 12.45, 41.9, 0.12], ["LI", 9.55, 47.15, 0.15], ["LU", 6.1, 49.8, 0.3], ["MT", 14.4, 35.9, 0.3], ["CY", 33.0, 35.0, 0.6],
  ["SG", 103.82, 1.35, 0.3], ["MV", 73.5, 3.2, 0.6], ["BH", 50.55, 26.05, 0.25], ["QA", 51.2, 25.3, 0.4], ["GM", -15.4, 13.45, 0.4], ["CV", -23.7, 15.1, 0.6], ["ST", 6.6, 0.3, 0.3],
  ["MU", 57.55, -20.25, 0.4], ["SC", 55.5, -4.6, 0.4], ["KM", 43.3, -11.7, 0.4], ["TL", 125.9, -8.8, 0.7],
  ["JM", -77.3, 18.15, 0.7], ["BS", -77.5, 24.5, 1.3], ["BB", -59.55, 13.15, 0.35], ["AG", -61.8, 17.1, 0.3], ["DM", -61.35, 15.4, 0.3], ["GD", -61.7, 12.1, 0.3],
  ["KN", -62.7, 17.3, 0.3], ["LC", -61.0, 13.9, 0.3], ["VC", -61.2, 13.2, 0.3], ["TT", -61.3, 10.5, 0.6],
  ["FJ", 178.0, -17.8, 0.8], ["SB", 160.0, -9.0, 1.0], ["VU", 167.0, -16.0, 0.7], ["WS", -172.4, -13.7, 0.5], ["TO", -175.2, -21.2, 0.5], ["TV", 179.2, -8.5, 0.4],
  ["KI", 173.0, 1.4, 0.6], ["NR", 166.9, -0.5, 0.3], ["MH", 171.0, 7.1, 0.6], ["FM", 158.0, 6.9, 0.6], ["PW", 134.5, 7.5, 0.4],
];

// «PS» no se dibuja: en este juego Israel y Palestina forman un solo territorio llamado «Palestina/Israel» (id IL)
const ALIAS = { TW: "CN" }; // trozos de tierra extra que se pintan como parte de otro país

// ---------- Rasterizar la tierra ----------
const tierra = new Uint8Array(W * H);
function rellenar(poli, valor, buf) {
  for (let r = 0; r < H; r++) {
    const lat = LAT0 - (r + 0.5) * PASO, xs = [];
    for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      const [x1, y1] = poli[j], [x2, y2] = poli[i];
      if ((y1 > lat) !== (y2 > lat)) xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const c0 = Math.max(0, Math.ceil((xs[k] - LON0) / PASO - 0.5)), c1 = Math.min(W - 1, Math.floor((xs[k + 1] - LON0) / PASO - 0.5));
      for (let c = c0; c <= c1; c++) buf[r * W + c] = valor;
    }
  }
}
for (const p of CONTINENTES) rellenar(p, 1, tierra);
rellenar(MEXICO, 1, tierra);
for (const p of EXTRA) rellenar(p, 1, tierra);
for (const p of LAGOS) rellenar(p, 0, tierra);
const mex = new Uint8Array(W * H); rellenar(MEXICO, 1, mex);

// ---------- Semillas ----------
const semillas = [], codigos = [];
const idDe = (iso) => { let i = codigos.indexOf(iso); if (i < 0) { codigos.push(iso); i = codigos.length - 1; } return i; };
// Cada línea mezcla códigos de país y puntos separados por espacios
{
  let iso = null;
  for (const t of SEMILLAS.trim().split(/\s+/)) {
    if (/^[A-Z]{2}$/.test(t)) { iso = t; continue; }
    const [lon, lat, sello] = t.split(",").map(Number);
    semillas.push({ id: idDe(iso), lon, lat, sello: sello || 0, k: Math.cos((lat * Math.PI) / 180) });
  }
}

// ---------- Asignar cada celda de tierra a la semilla más cercana ----------
const dueno = new Int16Array(W * H).fill(-1);
const idMX = idDe("MX");
for (let r = 0; r < H; r++) {
  const lat = LAT0 - (r + 0.5) * PASO;
  const kk = Math.cos((lat * Math.PI) / 180);
  for (let c = 0; c < W; c++) {
    const i = r * W + c;
    if (!tierra[i]) continue;
    if (mex[i]) { dueno[i] = idMX; continue; }
    const lon = LON0 + (c + 0.5) * PASO;
    let mejor = 1e9, id = -1;
    for (const s of semillas) {
      let dx = Math.abs(lon - s.lon); if (dx > 180) dx = 360 - dx;
      dx *= kk; // la longitud se acorta hacia los polos
      const dy = lat - s.lat, d = dx * dx + dy * dy;
      if (d < mejor) { mejor = d; id = s.id; }
    }
    dueno[i] = id;
  }
}
// sellos (enclaves): fuerzan las celdas de tierra dentro de su radio
for (const s of semillas) {
  if (!s.sello) continue;
  for (let r = 0; r < H; r++) {
    const lat = LAT0 - (r + 0.5) * PASO;
    if (Math.abs(lat - s.lat) > s.sello) continue;
    for (let c = 0; c < W; c++) {
      const i = r * W + c;
      if (!tierra[i] || mex[i]) continue;
      const lon = LON0 + (c + 0.5) * PASO;
      if (Math.hypot((lon - s.lon) * s.k, lat - s.lat) <= s.sello) dueno[i] = s.id;
    }
  }
}
// Taiwán y compañía se pintan como parte de China; PS no existe
const id = (iso) => codigos.indexOf(iso);

// ---------- Trazar contornos de cada país ----------
// Aristas dirigidas con el interior a la izquierda; se unen en anillos.
function contornos(paisId) {
  const sig = new Map(); // "x,y" → lista de [x2,y2]
  const add = (x1, y1, x2, y2) => { const k = x1 + "," + y1; (sig.get(k) || sig.set(k, []).get(k)).push([x2, y2]); };
  const es = (r, c) => r >= 0 && r < H && c >= 0 && c < W && dueno[r * W + c] === paisId;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (!es(r, c)) continue;
    // vértices en esquinas de celda: (c, r) = esquina superior izquierda
    if (!es(r - 1, c)) add(c, r, c + 1, r);           // arriba (de izquierda a derecha)
    if (!es(r, c + 1)) add(c + 1, r, c + 1, r + 1);   // derecha (hacia abajo)
    if (!es(r + 1, c)) add(c + 1, r + 1, c, r + 1);   // abajo (de derecha a izquierda)
    if (!es(r, c - 1)) add(c, r + 1, c, r);           // izquierda (hacia arriba)
  }
  const anillos = [];
  while (sig.size) {
    const [k0] = sig.keys();
    const [x0, y0] = k0.split(",").map(Number);
    const pts = [[x0, y0]];
    let x = x0, y = y0, dirPrev = null;
    for (;;) {
      const k = x + "," + y, lista = sig.get(k);
      if (!lista) break;
      // en vértices con 2 salidas se gira a la derecha primero para no cruzar el anillo
      let idx = 0;
      if (lista.length > 1 && dirPrev) {
        const giro = (n) => { const dx = n[0] - x, dy = n[1] - y; return dirPrev[0] * dy - dirPrev[1] * dx; };
        let mejorG = -1e9;
        lista.forEach((n, i) => { const g = giro(n); if (g > mejorG) { mejorG = g; idx = i; } });
      }
      const [nx, ny] = lista.splice(idx, 1)[0];
      if (!lista.length) sig.delete(k);
      dirPrev = [nx - x, ny - y];
      x = nx; y = ny;
      if (x === x0 && y === y0) break;
      pts.push([x, y]);
    }
    if (pts.length >= 4) anillos.push(pts);
  }
  return anillos;
}

function dp(pts, tol) { // Douglas-Peucker para anillo cerrado: se parte por los dos puntos más separados
  if (pts.length < 8) return pts;
  let a = 0, b = 0, dm = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > dm) { dm = d; b = i; } }
  const parte = (p, i0, i1) => {
    const out = [];
    const rec = (s, e) => {
      const [x1, y1] = p[s], [x2, y2] = p[e], L = Math.hypot(x2 - x1, y2 - y1) || 1e-9;
      let dmax = 0, im = -1;
      for (let i = s + 1; i < e; i++) { const d = Math.abs((x2 - x1) * (y1 - p[i][1]) - (x1 - p[i][0]) * (y2 - y1)) / L; if (d > dmax) { dmax = d; im = i; } }
      if (dmax > tol) { rec(s, im); rec(im, e); } else out.push(p[e]);
    };
    out.push(p[i0]); rec(i0, i1); return out;
  };
  const m1 = parte(pts, a, b), m2 = parte([...pts, pts[0]], b, pts.length);
  return [...m1, ...m2.slice(1, -1)];
}
const area = (p) => { let s = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][0] * p[i][1] - p[i][0] * p[j][1]); return s / 2; };

const salida = {};
const quitar = new Set(["PS"]);
for (let pid = 0; pid < codigos.length; pid++) {
  const iso = codigos[pid];
  const anillos = contornos(pid);
  const rs = [];
  for (const a of anillos) {
    const g = a.map(([x, y]) => [LON0 + x * PASO, LAT0 - y * PASO]);
    const s = dp(g, TOL);
    if (s.length >= 3 && Math.abs(area(s)) > 0.004) rs.push(s);
  }
  if (rs.length) salida[iso] = { r: rs.map((p) => p.flatMap(([x, y]) => [+x.toFixed(1), +y.toFixed(1)])) };
}
// Marcadores: círculos de 16 lados
for (const [iso, lon, lat, rad] of MARCADORES) {
  const p = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; p.push(+(lon + Math.cos(a) * rad).toFixed(2), +(lat + Math.sin(a) * rad).toFixed(2)); }
  salida[iso] = { r: [p], m: 1 };
}

// Fuera de la lista: territorios sin dueño no deben aparecer
const faltan = [];
const PAISES_BASE = ("US CA GT BZ SV HN NI CR PA CU JM HT DO BS BB AG DM GD KN LC VC TT CO VE GY SR EC PE BR BO PY CL AR UY ES PT FR AD MC IT SM VA MT DE AT CH LI BE NL LU GB IE IS NO SE FI DK EE LV LT PL CZ SK HU SI HR BA RS ME MK AL GR CY BG RO MD UA BY RU MA DZ TN LY EG SD SS ER DJ ET SO KE UG TZ RW BI CD CG GA GQ CM CF TD NE NG BJ TG GH CI BF ML MR SN GM GW GN SL LR CV ST AO ZM MW MZ ZW BW NA ZA LS SZ MG MU SC KM TR GE AM AZ KZ UZ TM KG TJ AF PK IN NP BT BD LK MV CN MN KP KR JP VN LA KH TH MM MY SG BN ID TL PH IR IQ SY LB IL PS JO SA YE OM AE QA BH KW AU NZ PG FJ SB VU WS TO TV KI NR MH FM PW").split(" ");
for (const iso of [...PAISES_BASE, "MX"]) if (!quitar.has(iso) && !salida[iso]) faltan.push(iso);
for (const iso of quitar) delete salida[iso];

const nombres = { IL: "Palestina/Israel", MX: "México" };
let js = "// Ruta: ataqueglobal/paises-ataqueglobal.js\n// GENERADO por ataqueglobal/herramientas/generar-paises.mjs — no se edita a mano (se vuelve a generar).\n";
js += "// Contornos APROXIMADOS (decorativos) de los países del mundo. Cada país: { r: [anillo, …], m: 1 si es marcador }.\n";
js += "// Cada anillo es una lista plana [lon, lat, lon, lat, …]. Los anillos de un país se rellenan con la regla par-impar (así los huecos, como Lesoto dentro de Sudáfrica, quedan vacíos).\n";
js += "// «IL» es el territorio «Palestina/Israel» (el id «PS» no existe aquí). Para mapas con fronteras reales: herramientas/geojson-a-paises.mjs.\n";
js += "export const NOMBRES_ESPECIALES = " + JSON.stringify(nombres) + ";\n";
js += "export const LIMITES = { lon0: -180, lon1: 180, lat0: " + LAT0 + ", lat1: " + LAT1 + " };\n";
js += "export const PAISES = {\n";
for (const iso of Object.keys(salida).sort()) js += "  " + iso + ": " + JSON.stringify(salida[iso]) + ",\n";
js += "};\n";
writeFileSync(new URL("../paises-ataqueglobal.js", import.meta.url), js);
console.log("países:", Object.keys(salida).length, "| KB:", (js.length / 1024).toFixed(0), "| sin forma:", faltan.join(" ") || "ninguno");
const puntos = Object.values(salida).reduce((n, p) => n + p.r.reduce((m, a) => m + a.length / 2, 0), 0);
console.log("vértices:", puntos);
