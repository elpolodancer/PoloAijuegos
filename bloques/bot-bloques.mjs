// Ruta: bloques/bot-bloques.mjs
// Herramienta de Node (no la carga el juego). Un bot juega «Bloques de madera» con las reglas reales de logica-bloques.js y niveles-bloques.js:
//   node bot-bloques.mjs dificultades [partidas] [rondas]   cuántas rondas aguanta el bot en Fácil, Normal y Difícil (por defecto 20 partidas, se detiene en 120 rondas)
//   node bot-bloques.mjs niveles [desde] [hasta]            juega los niveles fijos: ¿los gana?, ¿en cuántas rondas? (de ahí sale el «par» de las estrellas)
//   node bot-bloques.mjs validar                            revisa los niveles fijos: sin candados en los sencillos y el bot bueno gana todos (el bot al azar no)
//   (en `dificultades` también juega un «bot medio» que no mira adelante y un «bot al azar»)
// «Bot bueno»: prueba las 3 piezas en todos los órdenes y los mejores sitios de cada una (búsqueda con poda) y se queda con el primer movimiento
// del mejor plan: premia las líneas, castiga los cubos que quedan y los huecos cerrados. «Bot al azar»: pone piezas donde caben, sin pensar.
import { N, FORMAS, cabe, colocar, hayLugar, llenas } from "./logica-bloques.js";
import { DIFICULTADES, ORDEN_DIF, NIVELES_FIJOS, nivelFijo, partidaInfinita, partidaNivel, avanzarRonda } from "./niveles-bloques.js";

const ANCHO = 6; // sitios que prueba el bot bueno por pieza y por paso

// Huecos cerrados: casillas libres rodeadas por todos lados (muro o cubo)
function huecos(t) {
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((t[r] >> c) & 1) continue;
    const lleno = (rr, cc) => rr < 0 || cc < 0 || rr >= N || cc >= N || ((t[rr] >> cc) & 1);
    if (lleno(r - 1, c) && lleno(r + 1, c) && lleno(r, c - 1) && lleno(r, c + 1)) n++;
  }
  return n;
}
const valor = (t) => -1.2 * llenas(t) - 6 * huecos(t);

function movimientosDe(t, f) {
  const m = [];
  for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) if (cabe(t, f, r, c)) { const res = colocar(t, f, r, c); m.push({ r, c, res, v: res.lineas * 40 + valor(res.t) }); }
  return m;
}
function elegirBueno(S) {
  const piezas = S.pz.map((id, i) => (id === null ? null : { i, f: FORMAS[id] })).filter(Boolean);
  let mejor = null;
  const rec = (tab, resto, acum, primero) => {
    if (!resto.length) { const v = acum + valor(tab); if (!mejor || v > mejor.v) mejor = { v, ...primero }; return; }
    for (const p of resto) {
      const ops = movimientosDe(tab, p.f).sort((a, b) => b.v - a.v).slice(0, ANCHO);
      for (const o of ops) rec(o.res.t, resto.filter((x) => x !== p), acum + o.res.lineas * 40, primero || { i: p.i, r: o.r, c: o.c });
    }
  };
  rec(S.tab, piezas, 0, null);
  if (mejor) return mejor;
  for (const p of piezas) { const m = movimientosDe(S.tab, p.f)[0]; if (m) return { i: p.i, r: m.r, c: m.c }; } // sin plan completo: cualquier movimiento
  return null;
}
// «Bot medio»: no mira adelante, solo elige el movimiento que más le conviene en ese momento (se parece a una persona que juega sin pensar en las trampas)
function elegirMedio(S) {
  let mejor = null;
  S.pz.forEach((id, i) => { if (id !== null) for (const m of movimientosDe(S.tab, FORMAS[id])) if (!mejor || m.v > mejor.v) mejor = { i, r: m.r, c: m.c, v: m.v }; });
  return mejor;
}
function elegirAzar(S) {
  const todos = [];
  S.pz.forEach((id, i) => { if (id !== null) for (const m of movimientosDe(S.tab, FORMAS[id])) todos.push({ i, r: m.r, c: m.c }); });
  return todos.length ? todos[Math.floor(Math.random() * todos.length)] : null;
}

// Juega hasta perder, ganar (niveles) o llegar al tope de rondas. Devuelve { gana, ro, pt, lin, candados }
function jugar(S, elegir, tope = 120) {
  let candados = 0;
  for (;;) {
    const mov = elegir(S);
    if (!mov) return { gana: false, ro: S.ro, pt: S.pt, lin: S.lin | 0, candados };
    const f = FORMAS[S.pz[mov.i]], res = colocar(S.tab, f, mov.r, mov.c);
    S.tab = res.t; S.pz[mov.i] = null; S.pt += f.n + (res.lineas ? 10 * res.lineas * res.lineas : 0) + 5 * res.rotos.length;
    if (S.m === "n") { S.lin += res.lineas; if (S.lin >= nivelFijo(S.n).meta) return { gana: true, ro: S.ro, pt: S.pt, lin: S.lin, candados }; }
    if (S.pz.every((x) => x === null)) {
      candados += avanzarRonda(S).length;
      if (S.ro > tope) return { gana: S.m === "i", ro: S.ro, pt: S.pt, lin: S.lin | 0, candados }; // en la infinita, llegar al tope cuenta como «aguantó»
    } else if (!S.pz.some((id) => id !== null && hayLugar(S.tab, FORMAS[id]))) return { gana: false, ro: S.ro, pt: S.pt, lin: S.lin | 0, candados };
  }
}
const mediana = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const [, , cmd = "", a1, a2] = process.argv;

if (cmd === "dificultades") {
  const partidas = Number(a1) || 20, tope = Number(a2) || 120;
  console.log("Bot bueno (" + partidas + " partidas por dificultad, tope " + tope + " rondas):");
  for (const d of ORDEN_DIF) {
    const rs = [], ps = [], cs = [];
    for (let k = 0; k < partidas; k++) { const r = jugar(partidaInfinita(d), elegirBueno, tope); rs.push(r.ro); ps.push(r.pt); cs.push(r.candados); }
    console.log("  " + DIFICULTADES[d].nombre.padEnd(8) + " rondas: mediana " + mediana(rs) + " (mín " + Math.min(...rs) + ", máx " + Math.max(...rs) + ") · puntos: mediana " + mediana(ps) + " · candados por partida: " + mediana(cs));
  }
  console.log("Bot medio, sin mirar adelante (" + partidas + " partidas por dificultad):");
  for (const d of ORDEN_DIF) {
    const rs = []; for (let k = 0; k < partidas; k++) rs.push(jugar(partidaInfinita(d), elegirMedio, tope).ro);
    console.log("  " + DIFICULTADES[d].nombre.padEnd(8) + " rondas: mediana " + mediana(rs) + " (mín " + Math.min(...rs) + ", máx " + Math.max(...rs) + ")");
  }
  console.log("Bot al azar (200 partidas):");
  for (const d of ORDEN_DIF) {
    const rs = []; for (let k = 0; k < 200; k++) rs.push(jugar(partidaInfinita(d), elegirAzar, 60).ro);
    console.log("  " + DIFICULTADES[d].nombre.padEnd(8) + " rondas: mediana " + mediana(rs) + " (máx " + Math.max(...rs) + ")");
  }
} else if (cmd === "niveles" || cmd === "validar") {
  const desde = cmd === "niveles" ? Number(a1) || 1 : 1, hasta = cmd === "niveles" ? Number(a2) || NIVELES_FIJOS : NIVELES_FIJOS;
  let mal = 0;
  for (let n = desde; n <= hasta; n++) {
    const L = nivelFijo(n), b = jugar(partidaNivel(n), elegirBueno);
    let azar = 0; for (let k = 0; k < 100; k++) if (jugar(partidaNivel(n), elegirAzar).gana) azar++;
    const conCandado = L.tab.slice(N).some((v) => v !== 0) || b.candados > 0;
    console.log("Nivel " + n + ": meta " + L.meta + " líneas · empieza con " + llenas(L.tab) + " cubos · bot bueno " + (b.gana ? "GANA en " + b.ro + " rondas" : "PIERDE (" + b.lin + " líneas)") + " · par " + L.par + " · bot al azar gana " + azar + " %" + (conCandado ? " · ¡TIENE CANDADOS!" : ""));
    if (cmd === "validar" && (!b.gana || (n <= 10 && conCandado))) mal++;
  }
  if (cmd === "validar") console.log(mal ? "REVISAR: " + mal + " nivel(es) con problema" : "Todo bien: el bot bueno gana todos y los sencillos no tienen candados");
} else console.log("Uso: node bot-bloques.mjs dificultades [partidas] [rondas] | niveles [desde] [hasta] | validar");
