// Simulador: jugador "óptimo" que siempre compra lo que recupera antes su inversión (tiempo de espera + costo/ganancia).
import fs from 'fs';
const over = JSON.parse(process.env.P || '{}');
let src = fs.readFileSync('./logica.js','utf8');
for (const [k,v] of Object.entries(over)) src = src.replace(new RegExp('\\b'+k+': [0-9.eE+-]+'), k+': '+v);
const tmp = './_l'+Math.random().toString(36).slice(2)+'.mjs'; fs.writeFileSync(tmp, src);
const L = await import(tmp); fs.unlinkSync(tmp);
const AJ = L.AJ, E = L.nuevoEstado(), N_OBJ = +(process.env.N||200);
E.din = 10; L.comprarPozo(E); E.din = 0;
E.pozos[0].n = 5; E.pozos[0].ger = 1; E.asc.ger = 1; E.alm.ger = 1;
const rate = (i) => { const w = E.pozos[i]; return L.cargaPozo(w,i) / ((L.tiempoCava(w,i)+2*AJ.WALK)/L.vel(w)); };
const Ra = () => L.capA(E.asc)/((2*L.tTramoAsc(E,E.asc)+2*L.tCargaAsc(E.asc))/L.vel(E.asc));
const Rw = () => L.capW(E.alm)/((L.tCargaAlm(E.alm)+2*AJ.WH_CAM)/L.vel(E.alm));
const R = []; E.pozos.forEach((_,i)=>R[i]=rate(i));
let U = R.reduce((a,b)=>a+b,0);
const inc = (u,ra,rw) => Math.min(u,ra,rw)*L.mejoraGlobal(E);
// ganancia de ingreso cuando la producción total cambia en dU (sin restar números casi iguales)
const dInc = (dU,ra,rw) => { const cap=Math.min(ra,rw); if (U>=cap) return dU<0 ? dU : 0; return dU>=0 ? Math.min(dU,cap-U)*L.mejoraGlobal(E) : dU*L.mejoraGlobal(E); };
let t = 0, it = 0; const marks = {}; const unl = [];
const log = (msg) => console.log(msg);
const fmtT = (s)=> s<3600? (s/60).toFixed(0)+'min' : s<86400*2? (s/3600).toFixed(1)+'h' : (s/86400).toFixed(1)+'d';
function best() {
  const I = inc(U,Ra(),Rw()); let b = null;
  const consider = (C, dI, fn, nombre) => {
    if (!(dI > 0) || !isFinite(C)) return;
    const wait = Math.max(0, (C - E.din)/I), m = wait + C/dI;
    if (!b || m < b.m) b = { m, C, fn, nombre, wait };
  };
  const ra = Ra(), rw = Rw();
  E.pozos.forEach((w,i)=>{
    if (w.n < AJ.NIV_MAX_M) { const k = Math.max(1, Math.min(AJ.NIV_MAX_M-w.n, Math.round(w.n*0.03))); const n0=w.n; w.n+=k; const r=rate(i); w.n=n0;
      consider(L.costoNiv('m',i,w.n,k), dInc(r-R[i],ra,rw), ()=>{L.subir(E,'m',i,k); U+=r-R[i]; R[i]=r;}, 'niv'); }
    if (w.ger>=1 && w.ger<3) { const g0=w.ger; w.ger++; const r=rate(i); w.ger=g0;
      consider(L.costoGer('m',i,w), dInc(r-R[i],ra,rw), ()=>{E.din-=L.costoGer('m',i,w); w.ger++; U+=r-R[i]; R[i]=r;}, 'ger'); }
  });
  for (const [tipo,w] of [['a',E.asc],['w',E.alm]]) {
    if (w.n < AJ.NIV_MAX_AW) { const k=Math.max(1,Math.min(AJ.NIV_MAX_AW-w.n,Math.round(w.n*0.03))); const n0=w.n; w.n+=k; const a=Ra(), b2=Rw(); w.n=n0;
      consider(L.costoNiv(tipo,0,w.n,k), inc(U,a,b2)-I, ()=>L.subir(E,tipo,0,k), tipo+'niv'); }
    if (w.ger<3) { const g0=w.ger; w.ger++; const a=Ra(), b2=Rw(); w.ger=g0;
      consider(L.costoGer(tipo,0,w), inc(U,a,b2)-I, ()=>{E.din-=L.costoGer(tipo,0,w); w.ger++;}, tipo+'ger'); }
  }
  const N = E.pozos.length;
  if (N < N_OBJ) {
    const C = L.costoPozo(N) + AJ.ASESOR*Math.pow(2,N);
    // rendimiento del pozo nuevo en nivel 1 con asesor
    E.pozos.push({n:1,ger:1,f:0,t:0,dep:{u:0,w:0}}); const r = rate(N); const a=Ra(), b2=Rw(); E.pozos.pop();
    consider(C, dInc(r,a,b2), ()=>{E.din-=L.costoPozo(N)+AJ.ASESOR*Math.pow(2,N); E.pozos.push({n:1,ger:1,f:0,t:0,dep:{u:0,w:0}}); R[N]=rate(N); U+=R[N]; unl.push([N+1,t]);}, 'pozo');
  }
  return b;
}
const hit = new Set([5,10,20,30,50,75,100,150,200]);
while (E.pozos.length < N_OBJ && it < 3e6) {
  it++; const b = best(); if (!b) { log('sin acciones: N='+E.pozos.length+' U='+U+' Ra='+Ra()+' Rw='+Rw()+' din='+E.din+' asc='+E.asc.n+' alm='+E.alm.n+' ger='+E.asc.ger+','+E.alm.ger+' pozo costo='+L.costoPozo(E.pozos.length)); break; }
  const I = inc(U,Ra(),Rw());
  const dt = Math.max(0,(b.C - E.din)/I); E.din += I*dt; t += dt; E.din -= b.nombre==='ger'||b.nombre.endsWith('ger')?0:0;
  if (b.nombre==='niv'||b.nombre.endsWith('niv')) { b.fn(); } else { // ger/pozo restan dentro de fn
    if (b.nombre==='pozo'||b.nombre.endsWith('ger')||b.nombre==='ger') b.fn(); }
  if (b.nombre==='niv'||b.nombre.endsWith('niv')) {} 
  if (b.nombre==='pozo' && hit.has(E.pozos.length)) {
    const I2 = inc(U,Ra(),Rw()), lv = E.pozos.map(w=>w.n), mx=Math.max(...lv);
    const cuello = U<=Math.min(Ra(),Rw())?'pozos':(Ra()<Rw()?'ascensor':'almacén');
    log(`pozo ${String(E.pozos.length).padStart(3)} | t=${fmtT(t).padStart(7)} | ingreso $${I2.toExponential(2)}/s | nivel pozo1 ${E.pozos[0].n} últ ${E.pozos.at(-2).n} | asc ${E.asc.n} alm ${E.alm.n} | cuello: ${cuello} | dinero ${E.din.toExponential(1)}`);
  }
}
// tiempo entre pozos
const gaps = unl.map((u,k)=> k? u[1]-unl[k-1][1] : u[1]);
const rows = [2,3,5,8,10,15,20,25,30,40,50,60,70,80,90,100,125,150,175,200];
log('--- tiempo para pasar de pozo (k-1) a pozo k ---');
log(rows.filter(k=>k-1<unl.length+1 && unl[k-2]).map(k=>`#${k}: ${fmtT(gaps[k-2])}`).join('  '));
log('niveles de pozos al final: '+[0,1,4,9,19,49,99,149,E.pozos.length-1].filter(i=>E.pozos[i]).map(i=>`p${i+1}=${E.pozos[i].n}`).join(' '));
log('total t='+fmtT(t)+' iteraciones='+it+' dinero final '+E.din.toExponential(2)+' ingreso '+inc(U,Ra(),Rw()).toExponential(2));
{ const b=[]; for(let s=0;s<unl.length;s+=20){ const e=Math.min(unl.length,s+20); const a=s? unl[s-1][1]:0; b.push(`${s+2}-${e+1}:${fmtT((unl[e-1][1]-a)/(e-s))}`);} log('gap medio por bloque de 20 pozos → '+b.join('  ')); }
