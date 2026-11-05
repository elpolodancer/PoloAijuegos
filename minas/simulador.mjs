// Simulador: jugador "óptimo" que siempre compra lo que recupera antes su inversión (tiempo de espera + costo/ganancia).
// Usa los números enormes de grande.js y simula una sola mina (la mina 1) hasta N pozos.
//   node simulador.mjs                    → 1000 pozos
//   N=300 node simulador.mjs              → hasta el pozo 300
//   P='{"PASO_MAX":1.0}' node simulador.mjs → cambia valores de AJ sin tocar logica.js
//   VENTANA=20 (pozos recientes que considera comprar mejoras)
import fs from 'fs';
const over = JSON.parse(process.env.P || '{}');
let src = fs.readFileSync('./logica.js', 'utf8');
for (const [k, v] of Object.entries(over)) src = src.replace(new RegExp('\\b' + k + ': [0-9.eE+-]+'), k + ': ' + v);
const tmp = './_l' + Math.random().toString(36).slice(2) + '.mjs'; fs.writeFileSync(tmp, src);
const L = await import(tmp); fs.unlinkSync(tmp);
const B = await import('./grande.js');
const { num, suma, resta, mulN, cmp, min, menor, aNum, fmt } = B;
const AJ = L.AJ, E = L.nuevoEstado(), M = E.minas[0], N_OBJ = +(process.env.N || 1000), WIN = +(process.env.VENTANA || 20);
E.din = num(10); L.comprarPozo(E, M); E.din = B.CERO;
M.pozos[0].n = 5; M.pozos[0].ger = 1; M.asc.ger = 1; M.alm.ger = 1; M.sucio = true;
const R = []; M.pozos.forEach((w, i) => R[i] = L.tasaPozo(w, i));
let U = R.reduce((a, b) => suma(a, b), B.CERO);
const Ra = () => L.tasaAsc(M), Rw = () => L.tasaAlm(M);
const mej = () => L.mejoraGlobal(M);
const inc = (u, ra, rw) => mulN(min(u, min(ra, rw)), mej());
// ganancia de ingreso si la producción total sube en dU (sin restar números casi iguales)
const dInc = (dU, ra, rw) => { const cap = min(ra, rw); return cmp(U, cap) >= 0 ? B.CERO : mulN(min(dU, resta(cap, U)), mej()); };
let t = 0, it = 0; const unl = [];
const log = (m) => console.log(m);
const fmtT = (s) => s < 3600 ? (s / 60).toFixed(0) + 'min' : s < 86400 * 2 ? (s / 3600).toFixed(1) + 'h' : s < 86400 * 400 ? (s / 86400).toFixed(1) + 'd' : (s / 86400 / 365).toExponential(1) + 'años';
const expo = (a) => B.log(a).toFixed(1);   // log10 (para mostrar órdenes de magnitud)
function best() {
  const ra = Ra(), rw = Rw(), I = inc(U, ra, rw); let b = null;
  const consider = (C, dI, fn, nombre) => {
    if (!(dI.m > 0) || C.e >= 1e300) return;
    const wait = Math.max(0, aNum(B.div(resta(C, E.din), I))), m = wait + aNum(B.div(C, dI));
    if (!b || m < b.m) b = { m, C, fn, nombre, wait };
  };
  const N = M.pozos.length;
  for (let i = Math.max(0, N - WIN); i < N; i++) {
    const w = M.pozos[i];
    if (w.n < AJ.NIV_MAX_M) {
      const k = Math.max(1, Math.min(AJ.NIV_MAX_M - w.n, Math.round(w.n * 0.03))), n0 = w.n; w.n += k; const r = L.tasaPozo(w, i); w.n = n0;
      consider(L.costoNiv(M, 'm', i, w.n, k), dInc(resta(r, R[i]), ra, rw), () => { L.subir(E, M, 'm', i, k); U = suma(U, resta(r, R[i])); R[i] = r; }, 'niv');
    }
    if (w.ger >= 1 && w.ger < 3) {
      const g0 = w.ger; w.ger++; const r = L.tasaPozo(w, i); w.ger = g0;
      consider(L.costoGer(M, 'm', i, w), dInc(resta(r, R[i]), ra, rw), () => { L.comprarGer(E, M, 'm', i); U = suma(U, resta(r, R[i])); R[i] = r; }, 'ger');
    }
  }
  for (const [tipo, w] of [['a', M.asc], ['w', M.alm]]) {
    if (w.n < AJ.NIV_MAX_AW) {
      const k = Math.max(1, Math.min(AJ.NIV_MAX_AW - w.n, Math.round(w.n * 0.03))), n0 = w.n; w.n += k; const a = Ra(), b2 = Rw(); w.n = n0;
      consider(L.costoNiv(M, tipo, 0, w.n, k), resta(inc(U, a, b2), I), () => L.subir(E, M, tipo, 0, k), tipo + 'niv');
    }
    if (w.ger < 3) {
      const g0 = w.ger; w.ger++; const a = Ra(), b2 = Rw(); w.ger = g0;
      consider(L.costoGer(M, tipo, 0, w), resta(inc(U, a, b2), I), () => L.comprarGer(E, M, tipo, 0), tipo + 'ger');
    }
  }
  if (N < N_OBJ) {
    const C = suma(L.costoPozo(N, M), L.costoGer(M, 'm', N, { ger: 0 }));
    M.pozos.push({ n: 1, ger: 1, f: 0, t: 0, dep: B.CERO }); const r = L.tasaPozo(M.pozos[N], N); M.pozos.pop();
    consider(C, dInc(r, ra, rw), () => { L.comprarPozo(E, M); L.comprarGer(E, M, 'm', N); R[N] = L.tasaPozo(M.pozos[N], N); U = suma(U, R[N]); unl.push([N + 1, t]); }, 'pozo');
  }
  return b;
}
const hit = new Set([5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
const t0 = Date.now();
while (M.pozos.length < N_OBJ && it < 6e6) {
  it++; const b = best();
  if (!b) { log('sin acciones: N=' + M.pozos.length + ' U=' + fmt(U) + ' Ra=' + fmt(Ra()) + ' Rw=' + fmt(Rw()) + ' asc=' + M.asc.n + ' alm=' + M.alm.n); break; }
  const I = inc(U, Ra(), Rw()), dt = Math.max(0, aNum(B.div(resta(b.C, E.din), I)));
  if (dt > 0) E.din = suma(E.din, mulN(I, dt));
  t += dt;
  if (menor(E.din, b.C)) E.din = mulN(b.C, 1.000001);
  b.fn(); M.sucio = false;
  if (b.nombre === 'pozo' && hit.has(M.pozos.length)) {
    const I2 = inc(U, Ra(), Rw());
    const cuello = cmp(U, min(Ra(), Rw())) <= 0 ? 'pozos' : (cmp(Ra(), Rw()) < 0 ? 'ascensor' : 'almacén');
    log(`pozo ${String(M.pozos.length).padStart(4)} | t=${fmtT(t).padStart(8)} | ingreso 1e${expo(I2).padStart(7)}/s | nivel últ ${M.pozos.at(-2)?.n} | asc ${M.asc.n} alm ${M.alm.n} | cuello: ${cuello} | ${((Date.now() - t0) / 1000).toFixed(0)}s reales`);
  }
}
const gaps = unl.map((u, k) => k ? u[1] - unl[k - 1][1] : u[1]);
log('--- tiempo para pasar de pozo (k-1) a pozo k ---');
log([2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000].filter((k) => gaps[k - 2] !== undefined).map((k) => `#${k}: ${fmtT(gaps[k - 2])}`).join('  '));
log('niveles de pozos al final: ' + [0, 1, 4, 9, 19, 49, 99, 199, 499, M.pozos.length - 1].filter((i) => M.pozos[i]).map((i) => `p${i + 1}=${M.pozos[i].n}`).join(' '));
log('total t=' + fmtT(t) + ' iteraciones=' + it + ' ingreso final 1e' + expo(inc(U, Ra(), Rw())) + '/s dinero final 1e' + expo(E.din) + ' | ascensor ' + M.asc.n + ' (ger ' + M.asc.ger + ') almacén ' + M.alm.n + ' (ger ' + M.alm.ger + ')');
{ const bl = []; for (let s = 0; s < unl.length; s += 100) { const e = Math.min(unl.length, s + 100), a = s ? unl[s - 1][1] : 0; bl.push(`${s + 2}-${e + 1}:${fmtT((unl[e - 1][1] - a) / (e - s))}`); } log('gap medio por bloque de 100 pozos → ' + bl.join('  ')); }
