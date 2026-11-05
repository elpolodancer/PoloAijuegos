// Ruta: minas/logica.js
// Reglas de «Minero Tycoon» (sin pantalla): niveles, costos, ciclos de trabajo, gerentes, prestigio y ganancias sin conexión.
// Todo el dinero y la carga se guardan como {u: unidades, w: valor en dólares de esas unidades}.
export const AJ = {
  WALK: 1.04, VEL_CAM: 2, DIST_A: 2, WH_CAM: 7,                        // segundos base de cada fase (cada tramo de caminata del minero dura WALK (velocidad de caminata VEL_CAM = 2); cada tramo del ascensor dura DIST_A × pozos ÷ su velocidad de movimiento; la cava dura capacidad ÷ velocidad de extracción)
  CAP_M: 20, EXT_M: 5, CREC_M: 1.1, CREC_M2: 1.1075, NIV_CREC2: 100, CAP_A: 600, VEL_CARGA_A: 150, CREC_A: 1.33, MOV_A: 0.5, CREC_MOV_A: 1.03, CAP_W: 1000, VEL_CARGA_W: 250, CREC_W: 1.3, // minero nivel 1: carga 20 y extrae 5/s; ambos crecen ×1.1 por nivel (redondeo hacia abajo). ascensor nivel 1: carga 600, velocidad de carga 150/s (ambas ×1.33 por nivel) y velocidad de movimiento 0.5 (×1.03 por nivel, redondeo hacia abajo a 2 decimales); CAP_W, VEL_CARGA_W, CREC_W: almacén nivel 1 (carga 1000 y velocidad de carga 250/s, ×1.3 por nivel; cada tramo de caminata dura WH_CAM)
  VALOR: 1, VALOR_X: 1,                             // valor de una unidad (1 en todos los pozos: el dinero por viaje ya va en la capacidad)
  POZO1: 10, POZO0: 2600, MAX_POZOS: 200,                 // precio del pozo 1 y del pozo 2 (los siguientes salen de la tabla de abajo)
  // ----- Escala por pozo (calibrada con las capturas del juego original: pozos 1, 5, 10 y 20) -----
  // Cada pozo nuevo multiplica por 10^paso su producción, su costo de niveles y su precio. Los pasos crecen con el número
  // de pozo (como en el original) y se frenan en PASO_MAX para que 200 pozos quepan en los números del navegador (< 1e308).
  PASO_P2: 1.699,                  // pozo 2: ×50 (medido: capacidad 1000 y 250/s)
  PASO_K: 0.13, PASO_MAX: 1.1,     // producción: paso(i) = mín(PASO_MAX, PASO_K × i) para i ≥ 2 (i = número de pozo menos 1)
  COSTO_NIV_K: 1.0,                // costo de niveles: su paso es COSTO_NIV_K × el paso de producción (1 = cada pozo cuesta lo mismo por unidad producida)
  // Precio del pozo i (desde el 3.º): PRECIO_T segundos de lo que produce el pozo anterior en un nivel de referencia que sube con el número de pozo
  PRECIO_T: 600, REF0: 12, REF_K: 0.2, REF_MAX: 400,
  COSTO_GF: 1.1203, COSTO_TAU: 100, // costo de niveles del pozo 1: ×1.28 tras el nivel 10, baja hacia ×COSTO_GF (constante de tiempo TAU niveles)
  PREST_SUAVE: 100, PREST_LOG: 20, // estrellas: raíz hasta PREST_SUAVE y después solo +PREST_LOG por cada ×10 (si no, con 200 pozos salen 1e90 estrellas)
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

// ----- Tablas por pozo (se calculan una vez) -----
// LOG_P[i], LOG_Z[i]: logaritmo en base 10 del factor de producción y de costo de niveles del pozo i (0 = el primero)
const LOG_P = [0], LOG_Z = [0];
for (let i = 1; i < AJ.MAX_POZOS; i++) {
  const paso = i === 1 ? AJ.PASO_P2 : Math.min(AJ.PASO_MAX, AJ.PASO_K * i);
  LOG_P[i] = LOG_P[i - 1] + paso;
  LOG_Z[i] = LOG_Z[i - 1] + (i === 1 ? 0.663 : AJ.COSTO_NIV_K * paso);   // pozo 2: ×4.6 como antes
}
export const factorProd = (i) => Math.pow(10, LOG_P[i]);
const factorCosto = (i) => Math.pow(10, LOG_Z[i]);
// Crecimiento por nivel de producción (carga y extracción): ×CREC_M hasta el nivel NIV_CREC2 y ×CREC_M2 después
const crecNiv = (n) => Math.pow(AJ.CREC_M, Math.min(n, AJ.NIV_CREC2) - 1) * Math.pow(AJ.CREC_M2, Math.max(0, n - AJ.NIV_CREC2));

// ----- Niveles -----
// Mineros por pozo (como en el juego original): uno más en los niveles 10, 50, 100, 200 y 400 (máximo 6).
export const trabajadores = (n) => 1 + (n >= 10) + (n >= 50) + (n >= 100) + (n >= 200) + (n >= 400);
export const proxTrab = (n) => [10, 50, 100, 200, 400].find((x) => x > n) || 0;
export const cargaPozo = (w, i = 0) => capM(w, i) * trabajadores(w.n);
export const nivMax = (tipo) => (tipo === "m" ? AJ.NIV_MAX_M : AJ.NIV_MAX_AW);
export const RANGOS = ["", "Asesor", "Sénior", "Ejecutivo"];
export const hitos = (n) => (n >= 10) + (n >= 25) + (n >= 50) + (n >= 100 ? 1 + Math.floor((n - 100) / 100) : 0);
export const mult = (n) => Math.pow(2, hitos(n));
export const proxHito = (n) => (n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : n < 100 ? 100 : (Math.floor(n / 100) + 1) * 100);
// Pozos: capacidad y velocidad de extracción del nivel n (medidas del juego original: 20 y 5/s en el nivel 1, ×1.1 por nivel, redondeo hacia abajo)
export const capBase = (n, i = 0) => Math.floor(AJ.CAP_M * factorProd(i) * crecNiv(n) + 1e-9);
export const velExt = (n, i = 0) => Math.floor(AJ.EXT_M * factorProd(i) * crecNiv(n) + 1e-9);
export const tiempoCava = (w, i = 0) => capBase(w.n, i) / velExt(w.n, i);
export const capM = (w, i = 0) => capBase(w.n, i) * mult(w.n);
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
// Precio del pozo i (0 = el primero). Desde el tercero: PRECIO_T segundos de la producción del pozo anterior en el nivel de referencia nivRef(i)
export const nivRef = (i) => Math.min(AJ.REF_MAX, Math.round(AJ.REF0 + AJ.REF_K * i));
const tasaRef = (j, n) => { const w = { n }; return cargaPozo(w, j) / (tiempoCava(w, j) + 2 * AJ.WALK); };
export const costoPozo = (i) => (i === 0 ? AJ.POZO1 : i === 1 ? AJ.POZO0 : AJ.PRECIO_T * tasaRef(i - 1, nivRef(i)));
export const mejoraGlobal = (E) => 1 + AJ.BONO_ESTRELLA * E.estrellas;

const BASE = { m: () => AJ.NIV_M, a: () => AJ.NIV_A, w: () => AJ.NIV_W };
const G = { m: AJ.G_M, a: AJ.G_A, w: AJ.G_W };
export const trab = (E, tipo, i) => (tipo === "m" ? E.pozos[i] : tipo === "a" ? E.asc : E.alm);
// Pozos: costo de subir del nivel n al n+1 en el pozo 1 (tabla medida de los niveles 1 a 10; después baja de ×G_M a ×COSTO_GF). Cada pozo siguiente multiplica por factorCosto(i).
const COSTO_M = [13, 17.6, 23, 30.2, 39.7, 49.6, 62.8, 77.5, 98.8, 113];
// Desde el nivel 10 el crecimiento por nivel baja de ×1.28 a ×COSTO_GF (en el original el pozo 1 cuesta 4.33e39 en el nivel 650)
const COSTO_M1 = [0, ...COSTO_M];
for (let n = COSTO_M.length + 1; n <= AJ.NIV_MAX_M; n++) {
  const k = n - 1 - COSTO_M.length;
  COSTO_M1[n] = COSTO_M1[n - 1] * (AJ.COSTO_GF + (AJ.G_M - AJ.COSTO_GF) * Math.exp(-k / AJ.COSTO_TAU));
}
const costoM1 = (n) => COSTO_M1[n];
export const costoNiv = (tipo, i, n, k) => {
  if (tipo === "m") { let s = 0; for (let j = 0; j < k; j++) s += costoM1(n + j); return s * factorCosto(i); }
  const g = G[tipo]; return BASE[tipo](i) * Math.pow(g, n) * (Math.pow(g, k) - 1) / (g - 1); };
export function maxNiv(tipo, i, n, din) {
  if (tipo === "m") { const f = factorCosto(i); let k = 0, s = 0; while (n + k < nivMax(tipo)) { s += costoM1(n + k) * f; if (s > din) break; k++; } return k; }
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
  m: (E, w, i) => [0, tiempoCava(w, i), AJ.WALK, AJ.WALK],
  a: (E, w) => { const d = tTramoAsc(E, w), c = tCargaAsc(w); return [0, d, c, d, c]; },
  w: (E, w) => [0, tCargaAlm(w), AJ.WH_CAM, AJ.WH_CAM],
};
export const dur = (E, tipo, i) => { const w = trab(E, tipo, i); return DURS[tipo](E, w, i)[w.f] / vel(w); };
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
    if (w.f === 2) { const c = cargaPozo(w, i); w.dep.u += c; w.dep.w += c * valorPozo(i); }
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
  E.pozos.forEach((p, i) => { if (!auto(p)) return; const r = cargaPozo(p, i) / ((tiempoCava(p, i) + 2 * AJ.WALK) / vel(p)); U += r; V += r * valorPozo(i); });
  if (U <= 0) return 0;
  const Ra = capA(E.asc) / ((2 * tTramoAsc(E, E.asc) + 2 * tCargaAsc(E.asc)) / vel(E.asc)), Rw = capW(E.alm) / ((tCargaAlm(E.alm) + 2 * AJ.WH_CAM) / vel(E.alm));
  return V * Math.min(1, Ra / U, Rw / U) * mejoraGlobal(E);
}
// Estadísticas de un pozo en su nivel actual (como el panel del juego original): extracción total en $/s, mineros, caminata, velocidad de extracción y capacidad
export function estadisticas(E, i) {
  const p = E.pozos[i];
  return { total: trabajadores(p.n) * capBase(p.n, i) * valorPozo(i) / (tiempoCava(p, i) + 2 * AJ.WALK), mineros: trabajadores(p.n), caminata: AJ.VEL_CAM, extraccion: velExt(p.n, i), capacidad: capBase(p.n, i) };
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
export function estrellasGanables(E) {
  const s = Math.sqrt(E.run / AJ.PRESTIGIO);
  return Math.floor(s <= AJ.PREST_SUAVE ? s : AJ.PREST_SUAVE + AJ.PREST_LOG * Math.log10(s / AJ.PREST_SUAVE));
}
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
