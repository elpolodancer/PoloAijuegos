// Ruta: minas/logica.js
// Reglas de «Minero Tycoon» (sin pantalla): niveles, costos, ciclos de trabajo, gerentes, prestigio y ganancias sin conexión.
// Todo el dinero y la carga se guardan como {u: unidades, w: valor en dólares de esas unidades}.
export const AJ = {
  DIG: 6, WALK: 1.5, ASC: 1.6, WH_CAM: 2.5,              // segundos base de cada fase (el ascensor tarda ASC por cada pozo)
  CAP_M: 6, CAP_A: 15, CAP_W: 15,                        // unidades que carga cada trabajador por nivel
  VALOR: 4, VALOR_X: 3.8,                                // valor de una unidad en el pozo 1 y cuánto sube por pozo
  POZO0: 300, POZO_X: 4.6, MAX_POZOS: 40,                // precio del pozo 2 y su crecimiento
  NIV_M: 120, NIV_A: 150, NIV_W: 150, G_M: 1.1, G_A: 1.1, G_W: 1.1, NIV_MAX: 2000,
  GER: [2, 60, 2500], GER_A: 400, GER_W: 400, VEL_GER: [1, 1.5, 2.5, 4], // gerentes: 3 rangos (el 1.º automatiza)
  DIN0: 30, BONO_ESTRELLA: 0.15, PRESTIGIO: 1e8, OFFLINE_MAX: 6 * 3600,
};

const nuevoTrab = (extra) => ({ n: 1, ger: 0, f: 0, t: 0, ...extra });
const nuevoPozo = () => nuevoTrab({ dep: { u: 0, w: 0 } });
export function nuevoEstado(estrellas = 0) {
  return {
    din: AJ.DIN0, run: 0, estrellas, pozos: [nuevoPozo()],
    asc: nuevoTrab({ c: { u: 0, w: 0 } }), alm: nuevoTrab({ dep: { u: 0, w: 0 }, c: { u: 0, w: 0 } }),
  };
}

// ----- Niveles -----
export const hitos = (n) => (n >= 10) + (n >= 25) + (n >= 50) + (n >= 100 ? 1 + Math.floor((n - 100) / 100) : 0);
export const mult = (n) => Math.pow(2, hitos(n));
export const proxHito = (n) => (n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : n < 100 ? 100 : (Math.floor(n / 100) + 1) * 100);
export const capM = (w) => AJ.CAP_M * w.n * mult(w.n);
export const capA = (w) => AJ.CAP_A * w.n * mult(w.n);
export const capW = (w) => AJ.CAP_W * w.n * mult(w.n);
export const valorPozo = (i) => AJ.VALOR * Math.pow(AJ.VALOR_X, i);
export const costoPozo = (i) => (i === 0 ? 0 : AJ.POZO0 * Math.pow(AJ.POZO_X, i - 1));
export const mejoraGlobal = (E) => 1 + AJ.BONO_ESTRELLA * E.estrellas;

const BASE = { m: (i) => AJ.NIV_M * Math.pow(AJ.POZO_X, i), a: () => AJ.NIV_A, w: () => AJ.NIV_W };
const G = { m: AJ.G_M, a: AJ.G_A, w: AJ.G_W };
export const trab = (E, tipo, i) => (tipo === "m" ? E.pozos[i] : tipo === "a" ? E.asc : E.alm);
export const costoNiv = (tipo, i, n, k) => { const g = G[tipo]; return BASE[tipo](i) * Math.pow(g, n) * (Math.pow(g, k) - 1) / (g - 1); };
export function maxNiv(tipo, i, n, din) {
  const g = G[tipo], b = BASE[tipo](i) * Math.pow(g, n);
  let k = Math.max(0, Math.min(AJ.NIV_MAX - n, Math.floor(Math.log(1 + din * (g - 1) / b) / Math.log(g))));
  while (k > 0 && costoNiv(tipo, i, n, k) > din) k--;
  return k;
}
export function subir(E, tipo, i, k) {
  const w = trab(E, tipo, i);
  if (k < 1 || w.n + k > AJ.NIV_MAX) return false;
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
  m: () => [0, AJ.DIG, AJ.WALK, AJ.WALK],
  a: (E) => { const d = AJ.ASC * E.pozos.length; return [0, d, 1, d, 1]; },
  w: () => [0, 1, AJ.WH_CAM, AJ.WH_CAM],
};
export const dur = (E, tipo, i) => { const w = trab(E, tipo, i); return DURS[tipo](E)[w.f] / vel(w); };
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
    if (w.f === 2) { const c = capM(w); w.dep.u += c; w.dep.w += c * valorPozo(i); }
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
  E.pozos.forEach((p, i) => { if (!auto(p)) return; const r = capM(p) / ((AJ.DIG + 2 * AJ.WALK) / vel(p)); U += r; V += r * valorPozo(i); });
  if (U <= 0) return 0;
  const Ra = capA(E.asc) / ((2 * AJ.ASC * E.pozos.length + 2) / vel(E.asc)), Rw = capW(E.alm) / ((1 + 2 * AJ.WH_CAM) / vel(E.alm));
  return V * Math.min(1, Ra / U, Rw / U) * mejoraGlobal(E);
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
