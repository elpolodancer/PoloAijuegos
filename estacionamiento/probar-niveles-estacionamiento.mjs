import { configNivel, generarNivel, esResoluble, TOTAL_NIVELES, NIVELES_MEXICO, PAISES } from "./niveles-estacionamiento.js";
let fallos = 0;
const mal = (m) => { fallos++; console.log("✗", m); };

// 1) Tamaños de México por tramo
const tramos = [[1,100,10,15],[101,300,12,20],[301,600,15,22],[601,1000,17,25],[1001,2000,25,35],[2001,3000,27,40],[3001,3200,50,50]];
for (const [a,b,mi,ma] of tramos) {
  let lo = 999, hi = 0;
  for (let n = a; n <= b; n++) { const t = configNivel(n).tam; lo = Math.min(lo,t); hi = Math.max(hi,t); if (t<mi||t>ma) mal(`nivel ${n} tam ${t} fuera de ${mi}-${ma}`); }
  console.log(`México ${a}-${b}: tamaños ${lo}..${hi} (rango pedido ${mi}-${ma})`);
}
// 2) Países: 40/30/20/10 exactos
for (let p = 0; p < PAISES; p++) {
  const c = {a:0,b:0,c:0,d:0};
  for (let k = 0; k < 100; k++) { const t = configNivel(NIVELES_MEXICO + p*100 + k + 1).tam; if (t>=40) c.a++; else if (t>=30) c.b++; else if (t>=20) c.c++; else c.d++; }
  if (c.a!==40||c.b!==30||c.c!==20||c.d!==10) mal(`país ${p}: ${JSON.stringify(c)}`);
}
console.log("Países: 194 revisados (40/30/20/10 exactos en cada uno)");
// 3) Monedas
const m = {}; for (const [t,e] of [[10,15],[19,15],[20,25],[29,25],[30,35],[39,35],[40,45],[45,45],[46,60],[50,60]]) { if (configNivel(1).premio===undefined) mal("premio"); }
import { premioMonedas } from "./niveles-estacionamiento.js";
for (const [t,e] of [[10,15],[19,15],[20,25],[29,25],[30,35],[39,35],[40,45],[45,45],[46,60],[50,60]]) if (premioMonedas(t)!==e) mal(`premio ${t}`);
console.log("Monedas: límites de cada rango correctos");
// 4) Determinismo
const a = JSON.stringify(generarNivel(configNivel(1234))), b = JSON.stringify(generarNivel(configNivel(1234)));
if (a!==b) mal("no determinista"); else console.log("Determinista: mismo nivel = mismo tablero");

// 5) Generación: todos los de México + muestra de países. Tiempo, resolubilidad, autos logrados vs objetivo
function probar(lista, nombre) {
  let max = 0, suma = 0, peor = null, noRes = 0, corto = 0, minRatio = 1;
  const porTam = {};
  for (const n of lista) {
    const cfg = configNivel(n);
    const t0 = performance.now();
    const autos = generarNivel(cfg);
    const ms = performance.now() - t0;
    suma += ms; if (ms > max) { max = ms; peor = cfg; }
    if (!esResoluble(cfg.tam, autos)) noRes++;
    const r = autos.length / cfg.obj; if (r < 0.98) corto++; minRatio = Math.min(minRatio, r);
    const o = porTam[cfg.tam] ||= { n:0, ms:0, ratio:1 }; o.n++; o.ms = Math.max(o.ms, ms); o.ratio = Math.min(o.ratio, r);
  }
  console.log(`${nombre}: ${lista.length} niveles · media ${(suma/lista.length).toFixed(1)} ms · máx ${max.toFixed(0)} ms (nivel ${peor.n}, ${peor.tam}×${peor.tam}) · no resolubles: ${noRes} · por debajo del 98% del objetivo: ${corto} (mínimo ${(minRatio*100).toFixed(0)}%)`);
  return porTam;
}
const mex = []; for (let n = 1; n <= 3200; n++) mex.push(n);
probar(mex, "México");
const mundo = []; for (let n = 3201; n <= TOTAL_NIVELES; n += 1) mundo.push(n);
const pt = probar(mundo, "Mundo (todos)");
console.log("Peor caso por tamaño (ms / % de autos logrados):", Object.keys(pt).sort((x,y)=>x-y).filter((_,i)=>i%5===0).map(t=>`${t}×${t}: ${pt[t].ms.toFixed(0)}ms/${(pt[t].ratio*100).toFixed(0)}%`).join(" · "));
console.log(fallos ? `\n${fallos} FALLOS` : "\nTodo correcto");
