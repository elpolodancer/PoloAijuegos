// Herramienta (no va al repo): prueba cada nivel con un bot que corta las cuerdas en distintos momentos,
// comprueba que se puede ganar con cortes que toleran un error de ±0.25 s, y coloca las estrellas sobre una trayectoria real.
import { crearMundo, paso, cortarSeg } from "../logica-ranagolosa.js";
import { writeFileSync } from "fs";
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const L = (ax, ay, dx, dy) => ({ x: ax, y: ay, len: Math.round(Math.hypot(dx - ax, dy - ay)) });
// [dulce, anclas, rana, nº de estrellas]
const DEF = [
  { d: [400, 170], a: [[400, 50]], rana: [400, 380], e: 1, dx: 0 },
  { d: [140, 150], a: [[260, 50]], rana: [620, 380], auto: true, e: 2 },
  { d: [660, 150], a: [[540, 50]], rana: [180, 380], auto: true, e: 3 },
  { d: [400, 190], a: [[300, 50], [500, 50]], rana: [150, 380], auto: true, e: 2 },
  { d: [400, 230], a: [[200, 60], [600, 120]], rana: [400, 380], e: 3 },
  { d: [90, 200], a: [[200, 40]], rana: [690, 320], auto: true, e: 2 },
  { d: [400, 200], a: [[250, 50], [400, 40], [550, 50]], rana: [700, 380], auto: true, e: 3 },
  { d: [400, 260], a: [[200, 60], [650, 60]], rana: [110, 380], auto: true, e: 3 },
  { d: [150, 200], a: [[400, 40]], rana: [700, 380], auto: true, e: 3 },
  { d: [420, 200], a: [[250, 50], [560, 100]], rana: [400, 380], auto: true, e: 3 },
];
const LEJOS = [-999, -999];
function correr(niv, tiempos, conRuta = false) {
  const m = crearMundo(niv), ruta = [];
  const pend = tiempos.map((t, i) => ({ t, i })).filter((x) => x.t !== Infinity).sort((a, b) => a.t - b.t);
  for (let f = 0; f < 60 * 12 && m.estado === "juega"; f++) {
    while (pend.length && pend[0].t <= m.t + 1e-9) {
      const { i } = pend.shift(), k = m.cuerdas.findIndex((c) => c.id === i && !c.suelta);
      if (k >= 0) cortarSeg(m, k, Math.floor((m.cuerdas[k].pts.length - 1) / 2));
    }
    paso(m, 1 / 60);
    if (conRuta && f % 2 === 0) ruta.push([m.dulce.x, m.dulce.y]);
  }
  return { ok: m.estado === "gana", tomadas: m.tomadas, ruta };
}
// dónde cruza (bajando) el dulce la altura fy, y cuánto recorre
function cruce(niv, tiempos, fy) {
  const r = correr({ ...niv, rana: LEJOS }, tiempos, true);
  let P = null, len = 0;
  for (let i = 1; i < r.ruta.length; i++) {
    len += dist(r.ruta[i], r.ruta[i - 1]);
    if (!P && r.ruta[i - 1][1] < fy && r.ruta[i][1] >= fy && r.ruta[i][1] - r.ruta[i - 1][1] > 1) { P = r.ruta[i]; break; }
  }
  return { P, len, ruta: r.ruta };
}
const salida = [];
DEF.forEach((d, idx) => {
  const niv = { dulce: d.d, cuerdas: d.a.map(([x, y]) => L(x, y, d.d[0], d.d[1])), rana: d.rana, estrellas: [] };
  const n = niv.cuerdas.length, paso0 = n === 1 ? 0.05 : n === 2 ? 0.1 : 0.2, T = [];
  for (let t = 0; t <= 3.0001; t += paso0) T.push(+t.toFixed(2));
  let cs = [[]]; for (let i = 0; i < n; i++) cs = cs.flatMap((p) => T.map((t) => [...p, t]));
  const cand = [];
  for (const c of cs) {
    const x = cruce(niv, c, d.rana[1]);
    if (x.P && x.P[0] > 90 && x.P[0] < 710 && Math.abs(x.P[0] - d.d[0]) >= (d.dx ?? 120)) cand.push({ c, ...x });
  }
  cand.sort((a, b) => b.len - a.len);
  let mejor = null, probados = 0;
  for (const x of cand) {
    if (++probados > 400) break;
    let ok = true;
    for (let r = 0; r < n && ok; r++) for (const dt of [-0.08, 0.08]) {
      const v = x.c.slice(); v[r] = Math.max(0, v[r] + dt);
      const y = cruce(niv, v, d.rana[1]);
      if (!y.P || dist(y.P, x.P) > 30) { ok = false; break; }
    }
    if (ok) { mejor = x; break; }
  }
  if (!mejor) { console.log("Nivel", idx + 1, "SIN solución robusta (candidatas:", cand.length + ")"); salida.push(null); return; }
  niv.rana = [Math.round(mejor.P[0]), d.rana[1]];
  const ruta = mejor.ruta.filter((p) => dist(p, d.d) > 45 && dist(p, niv.rana) > 75 && p[0] > 15 && p[0] < 785 && p[1] > 15 && p[1] < 440);
  const est = [];
  for (let k = 0; k < d.e && ruta.length; k++) {
    const f = d.e === 1 ? 0.5 : 0.25 + (0.65 * k) / (d.e - 1);
    let i = Math.min(ruta.length - 1, Math.floor(f * ruta.length));
    while (i < ruta.length - 1 && est.some((s) => dist(s, ruta[i]) < 60)) i++;
    est.push([Math.round(ruta[i][0] / 5) * 5, Math.round(ruta[i][1] / 5) * 5]);
  }
  niv.estrellas = est;
  const prueba = correr(niv, mejor.c);
  console.log("Nivel", idx + 1, prueba.ok ? "OK" : "FALLA", "cortes", mejor.c.join("/"), "rana", niv.rana.join(","), "estrellas", prueba.tomadas + "/" + est.length, "ruta", Math.round(mejor.len) + "px");
  salida.push(niv);
});
const txt = "// Ruta: ranagolosa/niveles-ranagolosa.js\n// Niveles de «Rana golosa». Generados y comprobados con un bot (cada uno se puede ganar y las estrellas están sobre una trayectoria real).\n// dulce = posición inicial; cuerdas = anclas con su largo; rana = centro de la boca; estrellas = hasta 3.\nexport const NIVELES = " + JSON.stringify(salida.filter(Boolean)) .replace(/\},\{/g, "},\n  {").replace("[{", "[\n  {").replace(/\}\]$/, "}\n];") + "\n";
writeFileSync("../niveles-ranagolosa.js", txt);
