// Ruta: minas/logica.js
// Reglas de «Minero Tycoon» (sin pantalla): niveles, costos, ciclos de trabajo, gerentes, prestigio y ganancias sin conexión.
// Todo el dinero y la carga se guardan como {u: unidades, w: valor en dólares de esas unidades}.
export const AJ = {
  WALK: 1.04, VEL_CAM: 2, DIST_A: 2, WH_CAM: 7,                        // segundos base de cada fase (cada tramo de caminata del minero dura WALK (velocidad de caminata VEL_CAM = 2); cada tramo del ascensor dura DIST_A × pozos ÷ su velocidad de movimiento; la cava dura capacidad ÷ velocidad de extracción)
  CAP_M: 20, EXT_M: 5, CREC_M: 1.1, CAP_A: 600, VEL_CARGA_A: 150, CREC_A: 1.33, MOV_A: 0.5, CREC_MOV_A: 1.03, CAP_W: 1000, VEL_CARGA_W: 250, CREC_W: 1.3, // minero nivel 1: carga 20 y extrae 5/s; ambos crecen ×1.1 por nivel (redondeo hacia abajo). ascensor nivel 1: carga 600, velocidad de carga 150/s (ambas ×1.33 por nivel) y velocidad de movimiento 0.5 (×1.03 por nivel, redondeo hacia abajo a 2 decimales); CAP_W, VEL_CARGA_W, CREC_W: almacén nivel 1 (carga 1000 y velocidad de carga 250/s, ×1.3 por nivel; cada tramo de caminata dura WH_CAM)
  VALOR: 1, VALOR_X: 3.8,                                // valor de una unidad en el pozo 1 y cuánto sube por pozo
  POZO1: 10, POZO0: 2600, POZO_X: 4.6, MAX_POZOS: 30,     // precio del pozo 1, del pozo 2 y su crecimiento
  NIV_M: 10.23, NIV_A: 1041.67, NIV_W: 1041.67, G_M: 1.28, G_A: 1.2, G_W: 1.2, NIV_MAX_M: 800, NIV_MAX_AW: 2400,
  ASESOR: 100, NIV_ASESOR: 5, GER_M1: 150, GER: [2, 60, 2500], GER_A: 400, GER_W: 400, VEL_GER: [1, 1.5, 2.5, 4], // rangos: 1.º Asesor (automatiza; cuesta ASESOR (en los pozos ×2 por cada pozo: 100, 200, 400…) y se desbloquea cuando el pozo 1 llega al nivel NIV_ASESOR), 2.º Sénior, 3.º Ejecutivo
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
export const RANGOS = ["", "Asesor", "Sénior", "Ejecutivo"];
export const hitos = (n) => (n >= 10) + (n >= 25) + (n >= 50) + (n >= 100 ? 1 + Math.floor((n - 100) / 100) : 0);
export const mult = (n) => Math.pow(2, hitos(n));
export const proxHito = (n) => (n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : n < 100 ? 100 : (Math.floor(n / 100) + 1) * 100);
// Pozos: capacidad y velocidad de extracción del nivel n (medidas del juego original: 20 y 5/s en el nivel 1, ×1.1 por nivel, redondeo hacia abajo)
export const capBase = (n) => Math.floor(AJ.CAP_M * Math.pow(AJ.CREC_M, n - 1) + 1e-9);
export const velExt = (n) => Math.floor(AJ.EXT_M * Math.pow(AJ.CREC_M, n - 1) + 1e-9);
export const tiempoCava = (w) => capBase(w.n) / velExt(w.n);
export const capM = (w) => capBase(w.n) * mult(w.n);
// Ascensor: carga, velocidad de carga y de movimiento del nivel n (medidas del juego original)
export const capAbase = (n) => AJ.CAP_A * Math.pow(AJ.CREC_A, n - 1);
export const velCarga = (n) => AJ.VEL_CARGA_A * Math.pow(AJ.CREC_A, n - 1);
export const velMov = (n) => Math.floor(AJ.MOV_A * Math.pow(AJ.CREC_MOV_A, n - 1) * 100 + 1e-9) / 100;
export const tCargaAsc = (w) => capAbase(w.n) / velCarga(w.n);              // lo que tarda en cargar o descargar
export const tTramoAsc = (E, w) => AJ.DIST_A * E.pozos.length / velMov(w.n);   // lo que tarda en bajar o subir
export const capA = (w) => capAbase(w.n) * mult(w.n);
// Almacén (el que mueve y vende): carga y velocidad de carga del nivel n (medidas del juego original)
export const capWbase = (n) => AJ.CAP_W * Math.pow(AJ.CREC_W, n - 1);
export const velCargaW = (n) => AJ.VEL_CARGA_W * Math.pow(AJ.CREC_W, n - 1);
export const tCargaAlm = (w) => capWbase(w.n) / velCargaW(w.n);
export const capW = (w) => capWbase(w.n) * mult(w.n);
export const valorPozo = (i) => AJ.VALOR * Math.pow(AJ.VALOR_X, i);
export const costoPozo = (i) => (i === 0 ? AJ.POZO1 : AJ.POZO0 * Math.pow(AJ.POZO_X, i - 1));
export const mejoraGlobal = (E) => 1 + AJ.BONO_ESTRELLA * E.estrellas;

const BASE = { m: (i) => AJ.NIV_M * Math.pow(AJ.POZO_X, i), a: () => AJ.NIV_A, w: () => AJ.NIV_W };
const G = { m: AJ.G_M, a: AJ.G_A, w: AJ.G_W };
export const trab = (E, tipo, i) => (tipo === "m" ? E.pozos[i] : tipo === "a" ? E.asc : E.alm);
// Pozos: costo de subir del nivel n al n+1 en el pozo 1 (tabla medida de los niveles 1 a 10; después crece ×G_M por nivel). Cada pozo siguiente multiplica por POZO_X.
const COSTO_M = [13, 17.6, 23, 30.2, 39.7, 49.6, 62.8, 77.5, 98.8, 113];
const costoM1 = (n) => (n <= COSTO_M.length ? COSTO_M[n - 1] : COSTO_M[COSTO_M.length - 1] * Math.pow(AJ.G_M, n - COSTO_M.length));
export const costoNiv = (tipo, i, n, k) => {
  if (tipo === "m") { let s = 0; for (let j = 0; j < k; j++) s += costoM1(n + j); return s * Math.pow(AJ.POZO_X, i); }
  const g = G[tipo]; return BASE[tipo](i) * Math.pow(g, n) * (Math.pow(g, k) - 1) / (g - 1); };
export function maxNiv(tipo, i, n, din) {
  if (tipo === "m") { const f = Math.pow(AJ.POZO_X, i); let k = 0, s = 0; while (n + k < nivMax(tipo)) { s += costoM1(n + k) * f; if (s > din) break; k++; } return k; }
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
// Asesores (1.er rango): se pueden contratar cuando el pozo 1 llega al nivel NIV_ASESOR
export const asesoresActivos = (E) => E.pozos.length > 0 && E.pozos[0].n >= AJ.NIV_ASESOR;
export function costoGer(tipo, i, w) {
  if (w.ger >= 3) return Infinity;
  if (w.ger === 0) return tipo === "m" ? AJ.ASESOR * Math.pow(2, i) : AJ.ASESOR;   // asesor: ascensor y almacén 100; en los pozos se duplica por pozo (100, 200, 400…)
  const base = tipo === "m" ? (i === 0 ? AJ.GER_M1 : costoPozo(i)) : tipo === "a" ? AJ.GER_A : AJ.GER_W;
  return base * AJ.GER[w.ger];
}
export function comprarGer(E, tipo, i) {
  const w = trab(E, tipo, i), c = costoGer(tipo, i, w);
  if (w.ger === 0 && !asesoresActivos(E)) return false;
  if (c > E.din) return false;
  E.din -= c; w.ger++; return true;
}

// ----- Ciclos de trabajo -----
// f = fase (0 = quieto). Mineros: 1 cava, 2 camina con la carga, 3 regresa. Ascensor: 1 baja, 2 carga, 3 sube, 4 descarga. Almacén: 1 carga, 2 camina a vender, 3 regresa.
export const vel = (w) => AJ.VEL_GER[w.ger];
export const auto = (w) => w.ger > 0;
const DURS = {
  m: (E, w) => [0, tiempoCava(w), AJ.WALK, AJ.WALK],
  a: (E, w) => { const d = tTramoAsc(E, w), c = tCargaAsc(w); return [0, d, c, d, c]; },
  w: (E, w) => [0, tCargaAlm(w), AJ.WH_CAM, AJ.WH_CAM],
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
  const Ra = capA(E.asc) / ((2 * tTramoAsc(E, E.asc) + 2 * tCargaAsc(E.asc)) / vel(E.asc)), Rw = capW(E.alm) / ((tCargaAlm(E.alm) + 2 * AJ.WH_CAM) / vel(E.alm));
  return V * Math.min(1, Ra / U, Rw / U) * mejoraGlobal(E);
}
// Estadísticas de un pozo en su nivel actual (como el panel del juego original): extracción total en $/s, mineros, caminata, velocidad de extracción y capacidad
export function estadisticas(E, i) {
  const p = E.pozos[i];
  return { total: trabajadores(p.n) * capBase(p.n) * valorPozo(i) / (tiempoCava(p) + 2 * AJ.WALK), mineros: trabajadores(p.n), caminata: AJ.VEL_CAM, extraccion: velExt(p.n), capacidad: capBase(p.n) };
}
// Estadísticas del ascensor en su nivel actual (como el panel del juego original; el transporte total se calcula con los pozos que tengas, mínimo 1)
export function estadisticasAsc(E) {
  const w = E.asc, n = w.n, carga = capAbase(n);
  const ciclo = 2 * tCargaAsc(w) + 2 * AJ.DIST_A * Math.max(1, E.pozos.length) / velMov(n);
  return { total: carga / ciclo, carga, movimiento: velMov(n), velCarga: velCarga(n) };
}
// Estadísticas del almacén en su nivel actual (como el panel del juego original)
export function estadisticasAlm(E) {
  const w = E.alm, carga = capWbase(w.n);
  return { total: carga / (tCargaAlm(w) + 2 * AJ.WH_CAM), transportadores: 1, carga, velCarga: velCargaW(w.n), caminata: AJ.VEL_CAM };
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
