// Ruta: minas/logica-minas.js
// Reglas de «Minero Tycoon» (sin pantalla): niveles, costos, ciclos de trabajo, gerentes, prestigio, varias minas y ganancias sin conexión.
// Todas las cantidades grandes (dinero, producción, costos, cargas) son números enormes de grande.js: {m, e} = m × 10^e.
// Una unidad extraída vale 1 dólar, así que unidades y dólares son lo mismo.
//
// MODELO (para que 1000 pozos × varias minas aguanten en un celular):
//  - Un trabajador CON gerente (ger > 0) trabaja «en flujo»: produce / transporta / vende una tasa por segundo (sin simular cada viaje).
//    La pantalla solo anima los renglones que se ven.
//  - Un trabajador SIN gerente (ger = 0) sigue con viajes de verdad (fases f y t) y hay que tocarlo.
//  - Dinero compartido: E.din es uno solo para todas las minas. Cada mina tiene sus pozos, ascensor, almacén y estrellas.
import * as B from "./grande.js";
const { num, pot, suma, resta, mul, mulN, div, cmp, min, CERO } = B;

export const AJ = {
  WALK: 1.04, VEL_CAM: 2, DIST_A: 2, WH_CAM: 7,                        // segundos base de cada fase (cada tramo de caminata del minero dura WALK; cada tramo del ascensor dura DIST_A × pozos ÷ su velocidad de movimiento; la cava dura capacidad ÷ velocidad de extracción)
  CAP_M: 20, EXT_M: 5, CREC_M: 1.1, CREC_M2: 1.1075, NIV_CREC2: 100, CAP_A: 600, VEL_CARGA_A: 150, CREC_A: 1.33, MOV_A: 0.5, CREC_MOV_A: 1.03, CAP_W: 1000, VEL_CARGA_W: 250, CREC_W: 1.3, // minero nivel 1: carga 20 y extrae 5/s; ambos crecen ×1.1 por nivel (×1.1075 desde el nivel NIV_CREC2). ascensor nivel 1: carga 600, velocidad de carga 150/s (×1.33 por nivel) y velocidad de movimiento 0.5 (×1.03 por nivel). almacén nivel 1: carga 1000 y velocidad de carga 250/s (×1.3 por nivel)
  POZO1: 10, POZO0: 2600, MAX_POZOS: 1000,                // precio del pozo 1 y del pozo 2 (los siguientes salen de la tabla de abajo)
  // ----- Escala por pozo (calibrada con las capturas del juego original: pozos 1, 5, 10 y 20) -----
  // Cada pozo nuevo multiplica por 10^paso su producción, su costo de niveles y su precio. Los pasos crecen con el número
  // de pozo (como en el original) y se frenan en PASO_MAX (≈ ×12.6 por pozo). Con números enormes ya no hay tope de 1e308.
  PASO_P2: 1.699,                  // pozo 2: ×50 (medido: capacidad 1000 y 250/s)
  PASO_K: 0.13, PASO_MAX: 1.1,     // producción: paso(i) = mín(PASO_MAX, PASO_K × i) para i ≥ 2 (i = número de pozo menos 1)
  COSTO_NIV_K: 1.0,                // costo de niveles: su paso es COSTO_NIV_K × el paso de producción (1 = cada pozo cuesta lo mismo por unidad producida)
  COSTO_K2: 0.98, COSTO_I1: 110, COSTO_I2: 260, // en los pozos COSTO_I1 a COSTO_I2 (0 = primero) se usa COSTO_K2 en vez de COSTO_NIV_K: con < 1 los pozos de ese tramo salen más baratos por unidad producida y se aplana el tiempo entre pozos
  // Precio del pozo i (desde el 3.º): PRECIO_T segundos de lo que produce el pozo anterior en un nivel de referencia que sube con el número de pozo
  PRECIO_T: 600, REF0: 12, REF_K: 0.2, REF_MAX: 400,
  COSTO_GF: 1.1203, COSTO_TAU: 100, // costo de niveles del pozo 1: ×1.28 tras el nivel 10, baja hacia ×COSTO_GF (constante de tiempo TAU niveles)
  PREST_SUAVE: 100, PREST_LOG: 20, // estrellas: raíz hasta PREST_SUAVE y después solo +PREST_LOG por cada ×10 de la raíz
  NIV_M: 10.23, NIV_A: 1041.67, NIV_W: 1041.67, G_M: 1.28, G_A: 1.2, G_W: 1.2, NIV_MAX_M: 800, NIV_MAX_AW: 20000, // ascensor y almacén necesitan muchos niveles para cargar la producción de 1000 pozos
  ASESOR: 100, NIV_ASESOR: 5, GER_M1: 150, GER: [2, 60, 2500], GER_A: 400, GER_W: 400, VEL_GER: [1, 1.5, 2.5, 4], // rangos: 1.º Asesor (automatiza; cuesta ASESOR (en los pozos ×2 por cada pozo: 100, 200, 400…) y se desbloquea cuando el pozo 1 llega al nivel NIV_ASESOR), 2.º Sénior, 3.º Ejecutivo
  DIN0: 10, BONO_ESTRELLA: 0.15, PRESTIGIO: 1e8, OFFLINE_MAX: 6 * 3600,
  // ----- Varias minas (dinero compartido) -----
  MAX_MINAS: 10,
  MINA_PRECIO_LOG: 1100, MINA_PRECIO_PASO: 100, // la mina 2 cuesta 10^MINA_PRECIO_LOG; cada mina siguiente ×10^MINA_PRECIO_PASO
  DIF_MINA: 0,                     // dificultad: cada mina siguiente multiplica por 10^DIF_MINA todos los costos (niveles, pozos, gerentes). 0 = igual de fácil que la mina 1; súbelo cuando quieras minas más difíciles
  REINICIA_DIN: 1,                 // 1 = al hacer prestigio en una mina el dinero compartido vuelve a DIN0 (como el original); 0 = se conserva
};

const nuevoTrab = (extra) => ({ n: 1, ger: 0, f: 0, t: 0, ...extra });
const nuevoPozo = () => nuevoTrab({ dep: CERO });
// Una mina: pozos, ascensor, almacén y estrellas propias. pool = depósito conjunto de los pozos con gerente; U = su producción por segundo (se recalcula cuando sucio)
export function nuevaMina(j, estrellas = 0) {
  return { j, estrellas, run: CERO, pozos: [], pool: CERO, U: CERO, sucio: true, asc: nuevoTrab({ c: CERO }), alm: nuevoTrab({ dep: CERO, c: CERO }) };
}
export const nuevoEstado = () => ({ din: num(AJ.DIN0), minas: [nuevaMina(0)] });
export const mejoraGlobal = (M) => 1 + AJ.BONO_ESTRELLA * M.estrellas;
export const difMina = (M) => (AJ.DIF_MINA && M.j ? pot(AJ.DIF_MINA * M.j) : B.UNO);

// ----- Tablas por pozo (se calculan una vez) -----
// LOG_P[i], LOG_Z[i]: logaritmo en base 10 del factor de producción y de costo de niveles del pozo i (0 = el primero)
const LOG_P = [0], LOG_Z = [0];
for (let i = 1; i < AJ.MAX_POZOS; i++) {
  const paso = i === 1 ? AJ.PASO_P2 : Math.min(AJ.PASO_MAX, AJ.PASO_K * i);
  LOG_P[i] = LOG_P[i - 1] + paso;
  LOG_Z[i] = LOG_Z[i - 1] + (i === 1 ? 0.663 : (i >= AJ.COSTO_I1 && i < AJ.COSTO_I2 ? AJ.COSTO_K2 : AJ.COSTO_NIV_K) * paso);   // pozo 2: ×4.6
}
const L10 = { crec: Math.log10(AJ.CREC_M), crec2: Math.log10(AJ.CREC_M2), ca: Math.log10(AJ.CREC_A), cw: Math.log10(AJ.CREC_W) };
// log10 del crecimiento por nivel de producción: ×CREC_M hasta el nivel NIV_CREC2 y ×CREC_M2 después
const logCrec = (n) => (Math.min(n, AJ.NIV_CREC2) - 1) * L10.crec + Math.max(0, n - AJ.NIV_CREC2) * L10.crec2;

// ----- Niveles -----
// Mineros por pozo (como en el juego original): uno más en los niveles 10, 50, 100, 200 y 400 (máximo 6).
export const trabajadores = (n) => 1 + (n >= 10) + (n >= 50) + (n >= 100) + (n >= 200) + (n >= 400);
export const proxTrab = (n) => [10, 50, 100, 200, 400].find((x) => x > n) || 0;
export const nivMax = (tipo) => (tipo === "m" ? AJ.NIV_MAX_M : AJ.NIV_MAX_AW);
export const RANGOS = ["", "Asesor", "Sénior", "Ejecutivo"];
export const hitos = (n) => (n >= 10) + (n >= 25) + (n >= 50) + (n >= 100 ? 1 + Math.floor((n - 100) / 100) : 0);
export const mult = (n) => Math.pow(2, hitos(n));
export const proxHito = (n) => (n < 10 ? 10 : n < 25 ? 25 : n < 50 ? 50 : n < 100 ? 100 : (Math.floor(n / 100) + 1) * 100);
// Pozos: capacidad y velocidad de extracción del nivel n (20 y 5/s en el nivel 1, redondeo hacia abajo mientras el número cabe en un double)
const cuenta = (base, n, i) => { const l = Math.log10(base) + LOG_P[i] + logCrec(n); return l < 15 ? num(Math.floor(Math.pow(10, l) + 1e-9)) : pot(l); };
export const capBase = (n, i = 0) => cuenta(AJ.CAP_M, n, i);
export const velExt = (n, i = 0) => cuenta(AJ.EXT_M, n, i);
export const tiempoCava = (w, i = 0) => B.aNum(div(capBase(w.n, i), velExt(w.n, i)));   // ≈ 4 s
export const capM = (w, i = 0) => mulN(capBase(w.n, i), mult(w.n));
export const cargaPozo = (w, i = 0) => mulN(capBase(w.n, i), mult(w.n) * trabajadores(w.n));
// Ascensor: carga, velocidad de carga y de movimiento del nivel n
export const capAbase = (n) => pot(Math.log10(AJ.CAP_A) + (n - 1) * L10.ca);
export const velCarga = (n) => pot(Math.log10(AJ.VEL_CARGA_A) + (n - 1) * L10.ca);
export const velMov = (n) => Math.floor(AJ.MOV_A * Math.pow(AJ.CREC_MOV_A, n - 1) * 100 + 1e-9) / 100;
export const tCargaAsc = () => AJ.CAP_A / AJ.VEL_CARGA_A;                       // lo que tarda en cargar o descargar (la carga y la velocidad crecen igual: 4 s)
export const tTramoAsc = (M, w) => AJ.DIST_A * M.pozos.length / velMov(w.n);    // lo que tarda en bajar o subir
export const capA = (w) => mulN(capAbase(w.n), mult(w.n));
// Almacén (el que mueve y vende)
export const capWbase = (n) => pot(Math.log10(AJ.CAP_W) + (n - 1) * L10.cw);
export const velCargaW = (n) => pot(Math.log10(AJ.VEL_CARGA_W) + (n - 1) * L10.cw);
export const tCargaAlm = () => AJ.CAP_W / AJ.VEL_CARGA_W;                       // 4 s
export const capW = (w) => mulN(capWbase(w.n), mult(w.n));

// ----- Precios -----
// Precio del pozo i (0 = el primero). Desde el tercero: PRECIO_T segundos de la producción del pozo anterior en el nivel de referencia nivRef(i)
export const nivRef = (i) => Math.min(AJ.REF_MAX, Math.round(AJ.REF0 + AJ.REF_K * i));
const tasaRef = (j, n) => { const w = { n }; return mulN(cargaPozo(w, j), 1 / (tiempoCava(w, j) + 2 * AJ.WALK)); };
export const costoPozo = (i, M) => mul(i === 0 ? num(AJ.POZO1) : i === 1 ? num(AJ.POZO0) : mulN(tasaRef(i - 1, nivRef(i)), AJ.PRECIO_T), M ? difMina(M) : B.UNO);
export const precioMina = (j) => pot(AJ.MINA_PRECIO_LOG + AJ.MINA_PRECIO_PASO * (j - 1));   // precio de desbloquear la mina j (j ≥ 1; la 0 es gratis)

const BASE = { a: AJ.NIV_A, w: AJ.NIV_W };
const G = { a: AJ.G_A, w: AJ.G_W };
export const trab = (M, tipo, i) => (tipo === "m" ? M.pozos[i] : tipo === "a" ? M.asc : M.alm);
// Pozos: costo de subir del nivel n al n+1 en el pozo 1 (tabla medida de los niveles 1 a 10; después baja de ×G_M a ×COSTO_GF). Cada pozo siguiente multiplica por 10^LOG_Z[i].
const COSTO_M = [13, 17.6, 23, 30.2, 39.7, 49.6, 62.8, 77.5, 98.8, 113];
const COSTO_M1 = [0, ...COSTO_M];   // (el pozo 1 llega a ~1e47 en el nivel 800: cabe en un double)
for (let n = COSTO_M.length + 1; n <= AJ.NIV_MAX_M; n++) {
  const k = n - 1 - COSTO_M.length;
  COSTO_M1[n] = COSTO_M1[n - 1] * (AJ.COSTO_GF + (AJ.G_M - AJ.COSTO_GF) * Math.exp(-k / AJ.COSTO_TAU));
}
// Costo de subir k niveles desde el nivel n (ascensor y almacén: BASE × g^n × (g^k − 1) / (g − 1), calculado con logaritmos)
export function costoNiv(M, tipo, i, n, k) {
  const dif = difMina(M);
  if (tipo === "m") { let s = 0; for (let j = 0; j < k; j++) s += COSTO_M1[n + j]; return mul(pot(LOG_Z[i] + Math.log10(s)), dif); }
  const g = G[tipo], lg = Math.log10(g);
  return mul(pot(Math.log10(BASE[tipo]) + (n + k) * lg + Math.log10(-Math.expm1(-k * Math.log(g))) - Math.log10(g - 1)), dif);
}
export function maxNiv(M, tipo, i, n, din) {
  let k = 0;
  if (tipo === "m") {
    const din1 = B.aNum(div(din, mul(pot(LOG_Z[i]), difMina(M))));
    for (let s = 0; n + k < nivMax(tipo); k++) { s += COSTO_M1[n + k]; if (s > din1) break; }
  } else {
    const g = G[tipo], b = mul(pot(Math.log10(BASE[tipo]) + n * Math.log10(g)), difMina(M));
    const lr = B.log(div(mulN(din, g - 1), b));                         // log10 de din × (g−1) / b
    const ln = lr > 15 ? lr * Math.LN10 : Math.log(1 + Math.pow(10, lr));
    k = Math.max(0, Math.min(nivMax(tipo) - n, Math.floor(ln / Math.log(g))));
  }
  while (k > 0 && cmp(costoNiv(M, tipo, i, n, k), din) > 0) k--;
  return k;
}
export function subir(E, M, tipo, i, k) {
  const w = trab(M, tipo, i);
  if (k < 1 || w.n + k > nivMax(tipo)) return false;
  const c = costoNiv(M, tipo, i, w.n, k);
  if (cmp(c, E.din) > 0) return false;
  E.din = resta(E.din, c); w.n += k; M.sucio = true; return true;
}
export function comprarPozo(E, M) {
  const i = M.pozos.length;
  if (i >= AJ.MAX_POZOS) return false;
  const c = costoPozo(i, M);
  if (cmp(c, E.din) > 0) return false;
  E.din = resta(E.din, c); M.pozos.push(nuevoPozo()); M.sucio = true; return true;
}
export function comprarMina(E) {
  const j = E.minas.length;
  if (j >= AJ.MAX_MINAS) return false;
  const c = precioMina(j);
  if (cmp(c, E.din) > 0) return false;
  E.din = resta(E.din, c); E.minas.push(nuevaMina(j)); return true;
}
// Asesores (1.er rango): se pueden contratar cuando el pozo 1 llega al nivel NIV_ASESOR
export const asesoresActivos = (M) => M.pozos.length > 0 && M.pozos[0].n >= AJ.NIV_ASESOR;
export function costoGer(M, tipo, i, w) {
  if (w.ger >= 3) return B.INF;
  const dif = difMina(M);
  if (w.ger === 0) return mul(tipo === "m" ? pot(Math.log10(AJ.ASESOR) + i * Math.LOG10E * Math.LN2) : num(AJ.ASESOR), dif);   // asesor: ascensor y almacén 100; en los pozos se duplica por pozo (100, 200, 400…)
  if (tipo === "m" && i > 0) return mulN(costoPozo(i, M), AJ.GER[w.ger]);                                                  // (el precio del pozo ya incluye la dificultad)
  return mul(mulN(num(tipo === "m" ? AJ.GER_M1 : tipo === "a" ? AJ.GER_A : AJ.GER_W), AJ.GER[w.ger]), dif);
}
export function comprarGer(E, M, tipo, i) {
  const w = trab(M, tipo, i), c = costoGer(M, tipo, i, w);
  if (w.ger === 0 && !asesoresActivos(M)) return false;
  if (cmp(c, E.din) > 0) return false;
  E.din = resta(E.din, c); w.ger++; M.sucio = true;
  if (w.ger === 1) {                          // pasa de viajes manuales a flujo: lo que llevaba o tenía guardado no se pierde
    w.f = 0; w.t = 0;
    if (tipo === "m") { M.pool = suma(M.pool, w.dep); w.dep = CERO; }
    else if (tipo === "a") { M.alm.dep = suma(M.alm.dep, w.c); w.c = CERO; }
    else { vender(E, M, w.c); w.c = CERO; }
  }
  return true;
}

// ----- Producción por segundo (trabajadores con gerente) -----
export const vel = (w) => AJ.VEL_GER[w.ger];
export const auto = (w) => w.ger > 0;
export const tasaPozo = (w, i) => mulN(cargaPozo(w, i), vel(w) / (tiempoCava(w, i) + 2 * AJ.WALK));
export const tasaAsc = (M) => mulN(capA(M.asc), vel(M.asc) / (2 * tTramoAsc(M, M.asc) + 2 * tCargaAsc()));
export const tasaAlm = (M) => mulN(capW(M.alm), vel(M.alm) / (tCargaAlm() + 2 * AJ.WH_CAM));
export function recalcular(M) {
  let U = CERO;
  M.pozos.forEach((p, i) => { if (auto(p)) U = suma(U, tasaPozo(p, i)); });
  M.U = U; M.sucio = false; return U;
}
export const prod = (M) => (M.sucio ? recalcular(M) : M.U);

// ----- Ciclos de trabajo (viajes manuales y animación) -----
// f = fase (0 = quieto). Mineros: 1 cava, 2 camina con la carga, 3 regresa. Ascensor: 1 baja, 2 carga, 3 sube, 4 descarga. Almacén: 1 carga, 2 camina a vender, 3 regresa.
const DURS = {
  m: (M, w, i) => [0, tiempoCava(w, i), AJ.WALK, AJ.WALK],
  a: (M, w) => { const d = tTramoAsc(M, w), c = tCargaAsc(); return [0, d, c, d, c]; },
  w: () => [0, tCargaAlm(), AJ.WH_CAM, AJ.WH_CAM],
};
export const dur = (M, tipo, i) => { const w = trab(M, tipo, i); return DURS[tipo](M, w, i)[w.f] / vel(w); };
export const ciclo = (M, tipo, i) => { const w = trab(M, tipo, i), v = vel(w); return DURS[tipo](M, w, i).slice(1).map((x) => x / v); };   // duración de cada fase (para animar)
export const stock = (M) => { let s = M.pool; for (const p of M.pozos) if (p.ger === 0 && p.dep.m > 0) s = suma(s, p.dep); return s; };   // lo que hay en los depósitos de los pozos
export const hayTrabajo = (M, tipo) => tipo === "m" || (tipo === "a" ? stock(M).m > 0 : M.alm.dep.m > 0);

function tomarDeps(M, cap) {                  // saca hasta cap unidades de los depósitos de los pozos
  let falta = cap, tot = CERO;
  const t0 = min(M.pool, falta);
  if (t0.m > 0) { M.pool = resta(M.pool, t0); tot = suma(tot, t0); falta = resta(falta, t0); }
  for (const p of M.pozos) {
    if (falta.m === 0) break;
    if (p.ger === 0 && p.dep.m > 0) { const t = min(p.dep, falta); p.dep = resta(p.dep, t); tot = suma(tot, t); falta = resta(falta, t); }
  }
  return tot;
}
function vender(E, M, unidades) {
  if (unidades.m === 0) return;
  const g = mulN(unidades, mejoraGlobal(M));
  E.din = suma(E.din, g); M.run = suma(M.run, g);
}
function fin(E, M, tipo, i) {
  const w = trab(M, tipo, i);
  if (tipo === "m") {
    if (w.f === 2) w.dep = suma(w.dep, cargaPozo(w, i));
    w.f = w.f === 3 ? 0 : w.f + 1;
  } else if (tipo === "a") {
    if (w.f === 2) w.c = tomarDeps(M, capA(w));
    if (w.f === 4) { w.f = 0; M.alm.dep = suma(M.alm.dep, w.c); w.c = CERO; } else w.f++;
  } else {
    if (w.f === 1) { const t = min(w.dep, capW(w)); w.dep = resta(w.dep, t); w.c = t; }
    if (w.f === 2) { vender(E, M, w.c); w.c = CERO; }
    w.f = w.f === 3 ? 0 : w.f + 1;
  }
}
export function tocar(M, tipo, i) {
  const w = trab(M, tipo, i);
  if (w.f !== 0 || auto(w) || !hayTrabajo(M, tipo)) return false;
  w.f = 1; w.t = 0; return true;
}
function avanzar(E, M, tipo, i, dt) {         // viaje manual en curso
  const w = trab(M, tipo, i);
  w.t += dt;
  for (let d = dur(M, tipo, i); w.f && w.t >= d; d = w.f ? dur(M, tipo, i) : 1) { w.t -= d; fin(E, M, tipo, i); }
  if (!w.f) w.t = 0;
}
// Un paso de dt segundos en una mina
export function paso(E, M, dt) {
  const U = prod(M);
  if (U.m > 0) M.pool = suma(M.pool, mulN(U, dt));                                          // pozos con gerente: llenan su depósito
  for (let i = 0; i < M.pozos.length; i++) { const w = M.pozos[i]; if (w.ger === 0 && w.f) avanzar(E, M, "m", i, dt); }
  const a = M.asc, al = M.alm;
  if (auto(a)) { if (U.m > 0 || M.pool.m > 0) { const mov = tomarDeps(M, mulN(tasaAsc(M), dt)); if (mov.m > 0) al.dep = suma(al.dep, mov); } }
  else if (a.f) avanzar(E, M, "a", 0, dt);
  if (auto(al)) { if (al.dep.m > 0) { const v = min(al.dep, mulN(tasaAlm(M), dt)); al.dep = resta(al.dep, v); vender(E, M, v); } }
  else if (al.f) avanzar(E, M, "w", 0, dt);
}

// ----- Ingresos, prestigio y tiempo sin conexión -----
// Ingreso por segundo cuando todo ya es automático (si el ascensor o el almacén no tienen gerente, sin conexión no produce).
export function ingreso(M) {
  if (!auto(M.asc) || !auto(M.alm)) return CERO;
  const U = prod(M);
  if (U.m === 0) return CERO;
  return mulN(min(U, min(tasaAsc(M), tasaAlm(M))), mejoraGlobal(M));
}
export const ingresoTotal = (E) => E.minas.reduce((s, M) => suma(s, ingreso(M)), CERO);
// Estadísticas (como el panel del juego original)
export function estadisticas(M, i) {
  const p = M.pozos[i];
  return { total: mulN(capBase(p.n, i), trabajadores(p.n) / (tiempoCava(p, i) + 2 * AJ.WALK)), mineros: trabajadores(p.n), caminata: AJ.VEL_CAM, extraccion: velExt(p.n, i), capacidad: capBase(p.n, i) };
}
export function estadisticasAsc(M) {
  const n = M.asc.n, carga = capAbase(n), ciclo = 2 * tCargaAsc() + 2 * AJ.DIST_A * Math.max(1, M.pozos.length) / velMov(n);
  return { total: mulN(carga, 1 / ciclo), carga, movimiento: velMov(n), velCarga: velCarga(n) };
}
export function estadisticasAlm(M) {
  const n = M.alm.n, carga = capWbase(n);
  return { total: mulN(carga, 1 / (tCargaAlm() + 2 * AJ.WH_CAM)), transportadores: 1, carga, velCarga: velCargaW(n), caminata: AJ.VEL_CAM };
}
export function fuera(E, seg) {
  let tot = CERO;
  for (const M of E.minas) {
    const g = mulN(ingreso(M), Math.min(seg, AJ.OFFLINE_MAX));
    E.din = suma(E.din, g); M.run = suma(M.run, g); tot = suma(tot, g);
  }
  return tot;
}
// Estrellas: raíz de (ganado / PRESTIGIO) hasta PREST_SUAVE y después solo +PREST_LOG por cada ×10 de la raíz
export function estrellasGanables(M) {
  if (M.run.m === 0) return 0;
  const sl = (B.log(M.run) - Math.log10(AJ.PRESTIGIO)) / 2, ls = Math.log10(AJ.PREST_SUAVE);   // log10 de la raíz
  if (sl < 0) return 0;
  return Math.floor(sl <= ls ? Math.pow(10, sl) : AJ.PREST_SUAVE + AJ.PREST_LOG * (sl - ls));
}
export function prestigio(E, M) {
  const g = estrellasGanables(M);
  if (g < 1) return false;
  E.minas[M.j] = nuevaMina(M.j, M.estrellas + g);
  if (AJ.REINICIA_DIN) E.din = num(AJ.DIN0);
  return true;
}

// Ejecutivo (3.er rango): sube solo el nivel de su trabajador cuando una subida cuesta menos del 10 % de tu dinero. Devuelve cuántas subidas hizo.
export function ejecutivos(E) {
  let n = 0;
  const intenta = (M, tipo, i) => {
    const w = trab(M, tipo, i);
    for (let r = 0; r < 25 && w.n < nivMax(tipo) && cmp(costoNiv(M, tipo, i, w.n, 1), mulN(E.din, 0.1)) <= 0; r++) { subir(E, M, tipo, i, 1); n++; }
  };
  for (const M of E.minas) {
    if (M.asc.ger >= 3) intenta(M, "a", 0);
    if (M.alm.ger >= 3) intenta(M, "w", 0);
    for (let i = 0; i < M.pozos.length; i++) if (M.pozos[i].ger >= 3) intenta(M, "m", i);
  }
  return n;
}
