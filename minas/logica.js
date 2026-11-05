// Ruta: minas/logica.js
// Reglas de «Minero Tycoon» (sin pantalla): niveles, costos, ciclos de trabajo, gerentes, prestigio y ganancias sin conexión.
// Todo el dinero y la carga se guardan como {u: unidades, w: valor en dólares de esas unidades}.
export const AJ = {
  WALK: 1, ASC: 1.6, WH_CAM: 2.5,                        // segundos base de cada fase (cada tramo de caminata del minero dura WALK = velocidad de caminata 2; el ascensor tarda ASC por cada pozo; la cava dura capacidad ÷ velocidad de extracción)
  CAP_M: 20, EXT_M: 5, CREC_M: 1.1, CAP_A: 15, CAP_W: 15, // minero nivel 1: carga 20 y extrae 5/s; ambos crecen ×1.1 por nivel (redondeo hacia abajo). CAP_A/CAP_W: ascensor y almacén
  VALOR: 1, VALOR_X: 3.8,                                // valor de una unidad en el pozo 1 y cuánto sube por pozo
  POZO1: 10, POZO0: 300, POZO_X: 4.6, MAX_POZOS: 30,     // precio del pozo 1, del pozo 2 y su crecimiento
  NIV_M: 10.23, NIV_A: 150, NIV_W: 150, G_M: 1.3117, G_A: 1.1, G_W: 1.1, NIV_MAX_M: 800, NIV_MAX_AW: 2400,
  GER: [2, 60, 2500], GER_A: 400, GER_W: 400, VEL_GER: [1, 1.5, 2.5, 4], // gerentes: 3 rangos (el 1.º automatiza)
  DIN0: 10, BONO_ESTRELLA: 0.15, PRESTIGIO: 1e8, OFFLINE_MAX: 6 * 3600,
};

const nuevoTrab = (extra) => ({ n: 1, ger: 0, f: 0, t: 0, ...extra });
const nuevoPozo = () => nuevoTrab({ dep: { u: 0, w: 0 } });
export function nuevoEstado(estrellas = 0) {
  return {
    din: AJ.DIN0, run: 0, estrellas, pozos: [], // todos los pozos empiezan bloqueados (se compran)
    asc: nuevoTrab({ c: { u: 0, w: 0 } }), alm: nuevoTrab({ dep: { u: 0, w: 0 }, c: { u: 0, w: 0 } }),
  };
}

// ----- Niveles -----
// Mineros por pozo (como en el juego original): uno más en los niveles 10, 50, 100, 200 y 400 (máximo 6).
export const trabajadores = (n) => 1 + (n >= 10) + (n >= 50) + (n >= 100) + (n >= 200) + (n >= 400);
export const proxTrab = (n) => [10, 50, 100, 200, 400].find((x) => x > n) || 0;
export const cargaPozo = (w) => capM(w) * trabajadores(w.n);
export const nivMax = (tipo) => (tipo === "m" ? AJ.NIV_MAX_M : AJ.NIV_MAX_AW);
export const RANGOS = ["", "Junior", "Sénior", "Ejecutivo"];
export const hitos = (n) => (n >= 10) + (n >= 25) + (n >= 50) + (n >= 100 ? 1 + Math.floor((n - 100) / 100) : 0);
export const mult = (n) => Math.pow(2, hitos(n));
export const proxHito = (n) => (n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : n < 100 ? 100 : (Math.floor(n / 100) + 1) * 100);
// Pozos: capacidad y velocidad de extracción del nivel n (medidas del juego original: 20 y 5/s en el nivel 1, ×1.1 por nivel, redondeo hacia abajo)
export const capBase = (n) => Math.floor(AJ.CAP_M * Math.pow(AJ.CREC_M, n - 1) + 1e-9);
export const velExt = (n) => Math.floor(AJ.EXT_M * Math.pow(AJ.CREC_M, n - 1) + 1e-9);
export const tiempoCava = (w) => capBase(w.n) / velExt(w.n);
export const capM = (w) => capBase(w.n) * mult(w.n);
export const capA = (w) => AJ.CAP_A * w.n * mult(w.n);
export const capW = (w) => AJ.CAP_W * w.n * mult(w.n);
export const valorPozo = (i) => AJ.VALOR * Math.pow(AJ.VALOR_X, i);
export const costoPozo = (i) => (i === 0 ? AJ.POZO1 : AJ.POZO0 * Math.pow(AJ.POZO_X, i - 1));
export const mejoraGlobal = (E) => 1 + AJ.BONO_ESTRELLA * E.estrellas;

const BASE = { m: (i) => AJ.NIV_M * Math.pow(AJ.POZO_X, i), a: () => AJ.NIV_A, w: () => AJ.NIV_W };
const G = { m: AJ.G_M, a: AJ.G_A, w: AJ.G_W };
export const trab = (E, tipo, i) => (tipo === "m" ? E.pozos[i] : tipo === "a" ? E.asc : E.alm);
export const costoNiv = (tipo, i, n, k) => { const g = G[tipo]; return BASE[tipo](i) * Math.pow(g, n) * (Math.pow(g, k) - 1) / (g - 1); };
export function maxNiv(tipo, i, n, din) {
  const g = G[tipo], b = BASE[tipo](i) * Math.pow(g, n);
  let k = Math.max(0, Math.min(nivMax(tipo) - n, Math.floor(Math.log(1 + din * (g - 1) / b) / Math.log(g))));
  while (k > 0 && costoNiv(tipo, i, n, k) > din) k--;
  return k;
}
export function subir(E, tipo, i, k) {
  const w = trab(E, tipo, i);
  if (k < 1 || w.n + k > nivMax(tipo)) return false;
  const c = costoNiv(tipo, i, w.n, k);
  if (c > E.din) return false;
  E.din -= c; w.n += k; return true;
}
export function comprarPozo(E) {
  const i = E.pozos.length;
  if (i >= AJ.MAX_POZOS || costoPozo(i) > E.din) return false;
  E.din -= costoPozo(i); E.pozos.push(nuevoPozo()); return true;
}
export function costoGer(tipo, i, w) {
  if (w.ger >= 3) return Infinity;
  const base = tipo === "m" ? (i === 0 ? AJ.POZO0 / 2 : costoPozo(i)) : tipo === "a" ? AJ.GER_A : AJ.GER_W;
  return base * AJ.GER[w.ger];
}
export function comprarGer(E, tipo, i) {
  const w = trab(E, tipo, i), c = costoGer(tipo, i, w);
  if (c > E.din) return false;
  E.din -= c; w.ger++; return true;
}

// ----- Ciclos de trabajo -----
// f = fase (0 = quieto). Mineros: 1 cava, 2 camina con la carga, 3 regresa. Ascensor: 1 baja, 2 carga, 3 sube, 4 descarga. Almacén: 1 carga, 2 camina a vender, 3 regresa.
export const vel = (w) => AJ.VEL_GER[w.ger];
export const auto = (w) => w.ger > 0;
const DURS = {
  m: (E, w) => [0, tiempoCava(w), AJ.WALK, AJ.WALK],
  a: (E) => { const d = AJ.ASC * E.pozos.length; return [0, d, 1, d, 1]; },
  w: () => [0, 1, AJ.WH_CAM, AJ.WH_CAM],
};
export const dur = (E, tipo, i) => { const w = trab(E, tipo, i); return DURS[tipo](E, w)[w.f] / vel(w); };
export const hayTrabajo = (E, tipo) => tipo === "m" || (tipo === "a" ? E.pozos.some((p) => p.dep.u > 1e-9) : E.alm.dep.u > 1e-9);

function tomar(dep, cap, dest) {
  const t = Math.min(cap, dep.u);
  if (t <= 1e-9) return 0;
  const w = dep.w * t / dep.u;
  dep.u -= t; dep.w -= w; dest.u += t; dest.w += w;
  if (dep.u < 1e-9) dep.u = dep.w = 0;
  return t;
}
function fin(E, tipo, i, ev) {
  const w = trab(E, tipo, i);
  if (tipo === "m") {
    if (w.f === 2) { const c = cargaPozo(w); w.dep.u += c; w.dep.w += c * valorPozo(i); }
    w.f = w.f === 3 ? (auto(w) ? 1 : 0) : w.f + 1;
  } else if (tipo === "a") {
    if (w.f === 2) { let cap = capA(w); for (const p of E.pozos) cap -= tomar(p.dep, cap, w.c); }
    if (w.f === 4) { w.f = 0; const c = w.c; E.alm.dep.u += c.u; E.alm.dep.w += c.w; c.u = c.w = 0; }
    else w.f++;
  } else {
    if (w.f === 1) tomar(w.dep, capW(w), w.c);
    if (w.f === 2) { const g = w.c.w * mejoraGlobal(E); E.din += g; E.run += g; w.c.u = w.c.w = 0; if (ev) ev.vendido = (ev.vendido || 0) + g; }
    w.f = w.f === 3 ? 0 : w.f + 1;
  }
}
export function tocar(E, tipo, i) {
  const w = trab(E, tipo, i);
  if (w.f !== 0 || auto(w) || !hayTrabajo(E, tipo)) return false;
  w.f = 1; w.t = 0; return true;
}
export function paso(E, dt, ev) {
  for (const [tipo, i] of [["a", 0], ["w", 0], ...E.pozos.map((_, k) => ["m", k])]) {
    const w = trab(E, tipo, i);
    if (w.f === 0) { if (auto(w) && hayTrabajo(E, tipo)) { w.f = 1; w.t = 0; } else continue; }
    w.t += dt;
    for (let d = dur(E, tipo, i); w.f && w.t >= d; d = w.f ? dur(E, tipo, i) : 1) {
      w.t -= d; fin(E, tipo, i, ev);
      if (!w.f && auto(w) && hayTrabajo(E, tipo)) w.f = 1;
    }
    if (!w.f) w.t = 0;
  }
}

// ----- Ingresos, prestigio y tiempo sin conexión -----
// Ingreso por segundo cuando todo ya es automático (si algo no tiene gerente, sin conexión no produce).
export function ingreso(E) {
  if (!auto(E.asc) || !auto(E.alm)) return 0;
  let U = 0, V = 0;
  E.pozos.forEach((p, i) => { if (!auto(p)) return; const r = cargaPozo(p) / ((tiempoCava(p) + 2 * AJ.WALK) / vel(p)); U += r; V += r * valorPozo(i); });
  if (U <= 0) return 0;
  const Ra = capA(E.asc) / ((2 * AJ.ASC * E.pozos.length + 2) / vel(E.asc)), Rw = capW(E.alm) / ((1 + 2 * AJ.WH_CAM) / vel(E.alm));
  return V * Math.min(1, Ra / U, Rw / U) * mejoraGlobal(E);
}
// Estadísticas de un pozo en su nivel actual (como el panel del juego original): extracción total en $/s, mineros, caminata, velocidad de extracción y capacidad
export function estadisticas(E, i) {
  const p = E.pozos[i];
  return { total: cargaPozo(p) * valorPozo(i) / (tiempoCava(p) + 2 * AJ.WALK), mineros: trabajadores(p.n), caminata: 2 / AJ.WALK, extraccion: velExt(p.n), capacidad: capM(p) };
}
export function fuera(E, seg) {
  const g = ingreso(E) * Math.min(seg, AJ.OFFLINE_MAX);
  E.din += g; E.run += g; return g;
}
export const estrellasGanables = (E) => Math.floor(Math.sqrt(E.run / AJ.PRESTIGIO));
export function prestigio(E) {
  const g = estrellasGanables(E);
  return g < 1 ? null : nuevoEstado(E.estrellas + g);
}

// Ejecutivo (3.er rango): sube solo el nivel de su trabajador cuando una subida cuesta menos del 10 % de tu dinero. Devuelve cuántas subidas hizo.
export function ejecutivos(E) {
  let n = 0;
  for (const [tipo, i] of [["a", 0], ["w", 0], ...E.pozos.map((_, k) => ["m", k])]) {
    const w = trab(E, tipo, i);
    for (let r = 0; w.ger >= 3 && w.n < nivMax(tipo) && costoNiv(tipo, i, w.n, 1) <= E.din * 0.1 && r < 25; r++) { subir(E, tipo, i, 1); n++; }
  }
  return n;
}
