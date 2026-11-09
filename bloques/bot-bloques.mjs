// Ruta: bloques/bot-bloques.mjs
// Herramienta de Node (no la carga el juego). Un bot juega «Bloques de madera» con las reglas reales de logica-bloques.js y niveles-bloques.js:
//   node bot-bloques.mjs dificultades [partidas] [rondas]   cuántas rondas aguanta el bot en Fácil, Normal y Difícil (por defecto 20 partidas, se detiene en 120 rondas)
//   node bot-bloques.mjs niveles [desde] [hasta]            juega los niveles fijos (de puntos y de candados): ¿los gana el bot bueno?, ¿qué porcentaje de jugadores aficionados y novatos (simulados) los pasa?, ¿en cuántas rondas? (de ahí sale el «par» de las estrellas)
//   node bot-bloques.mjs validar                            revisa los niveles fijos: los 10 primeros solo de puntos y sin candados, el bot bueno gana todos y el par nunca es menor que lo que tarda el bot
//   (en `dificultades` también juega un «bot medio» que no mira adelante y un «bot al azar»)
//   node bot-bloques.mjs buscar <nivel> [variantes] [min] [max] prueba la variante «sem» 0, 1, 2… de un nivel y recomienda la más pasable (bueno entre min y max rondas, y la que más ganan los aficionados)
//   node bot-bloques.mjs calibrar [desde] [hasta] [%]       meta de puntos que pasaría ese % de jugadores aficionados (por defecto 60) en cada nivel de puntos: de ahí salen las metas
//   node bot-bloques.mjs curva [desde] [hasta]              puntos acumulados al final de cada ronda (bot bueno y medio) en los niveles de puntos: de ahí se elige la meta
// «Bot bueno»: prueba las 3 piezas en todos los órdenes y los mejores sitios de cada una (búsqueda con poda) y se queda con el primer movimiento
// del mejor plan: premia las líneas, castiga los cubos que quedan y los huecos cerrados. «Bot al azar»: pone piezas donde caben, sin pensar.
import { N, FORMAS, cabe, colocar, hayLugar, llenas, totalCapas, puntosJugada } from "./logica-bloques.js";
import { DIFICULTADES, ORDEN_DIF, NIVELES_FIJOS, RETOS, nivelFijo, partidaInfinita, partidaNivel, avanzarRonda, actualizarObj, cumplido } from "./niveles-bloques.js";

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
const bitsDe = (v) => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
// En los niveles de «candados» (OBJ = casillas por eliminar) el bot también premia romper capas y eliminar esos bloques
let OBJ = null;
const valor = (t) => {
  let v = -1.2 * llenas(t) - 6 * huecos(t);
  if (OBJ) { v -= 14 * totalCapas(t); for (let r = 0; r < N; r++) v -= 10 * bitsDe(OBJ[r] & t[r]); }
  return v;
};
const extra = (res) => (OBJ ? 25 * res.rotos.length : 0);

function movimientosDe(t, f) {
  const m = [];
  for (let r = 0; r <= N - f.h; r++) for (let c = 0; c <= N - f.w; c++) if (cabe(t, f, r, c)) { const res = colocar(t, f, r, c); m.push({ r, c, res, v: res.lineas * 40 + extra(res) + valor(res.t) }); }
  return m;
}
function elegirBueno(S) {
  const piezas = S.pz.map((id, i) => (id === null ? null : { i, f: FORMAS[id] })).filter(Boolean);
  let mejor = null;
  const rec = (tab, resto, acum, primero) => {
    if (!resto.length) { const v = acum + valor(tab); if (!mejor || v > mejor.v) mejor = { v, ...primero }; return; }
    for (const p of resto) {
      const ops = movimientosDe(tab, p.f).sort((a, b) => b.v - a.v).slice(0, ANCHO);
      for (const o of ops) rec(o.res.t, resto.filter((x) => x !== p), acum + o.res.lineas * 40 + extra(o.res), primero || { i: p.i, r: o.r, c: o.c });
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
// «Bot novato»: como el medio pero sin acertar siempre: elige al azar entre sus 4 mejores jugadas (se parece a un jugador que apenas está aprendiendo)
function elegirNovato(S, k = 4) {
  const todos = [];
  S.pz.forEach((id, i) => { if (id !== null) for (const m of movimientosDe(S.tab, FORMAS[id])) todos.push({ i, r: m.r, c: m.c, v: m.v }); });
  todos.sort((a, b) => b.v - a.v);
  return todos.length ? todos[Math.floor(Math.random() * Math.min(k, todos.length))] : null;
}
// «Bot aficionado»: igual, pero elige entre sus 2 mejores jugadas (alguien que ya entendió el juego pero no calcula las trampas). Si un nivel lo gana a menudo, no depende de una solución muy específica
const elegirAficionado = (S) => elegirNovato(S, 2);
function elegirAzar(S) {
  const todos = [];
  S.pz.forEach((id, i) => { if (id !== null) for (const m of movimientosDe(S.tab, FORMAS[id])) todos.push({ i, r: m.r, c: m.c }); });
  return todos.length ? todos[Math.floor(Math.random() * todos.length)] : null;
}

// Juega hasta perder, ganar (niveles) o llegar al tope de rondas. Devuelve { gana, ro, pt, lin, candados }
function jugar(S, elegir, tope = 120) {
  let candados = 0;
  OBJ = S.obj || null;
  for (;;) {
    const mov = elegir(S);
    if (!mov) return { gana: false, ro: S.ro, pt: S.pt, lin: S.lin | 0, candados };
    const f = FORMAS[S.pz[mov.i]], res = colocar(S.tab, f, mov.r, mov.c);
    S.tab = res.t; S.pz[mov.i] = null; S.pt += puntosJugada(f, res);
    if (S.m === "n") { S.lin += res.lineas; actualizarObj(S); if (cumplido(S)) return { gana: true, ro: S.ro, pt: S.pt, lin: S.lin, candados }; }
    if (S.pz.every((x) => x === null)) {
      candados += avanzarRonda(S).length;
      if (S.ro > tope) return { gana: S.m === "i", ro: S.ro, pt: S.pt, lin: S.lin | 0, candados }; // en la infinita, llegar al tope cuenta como «aguantó»
    } else if (!S.pz.some((id) => id !== null && hayLugar(S.tab, FORMAS[id]))) return { gana: false, ro: S.ro, pt: S.pt, lin: S.lin | 0, candados };
  }
}
// Juega un nivel IGNORANDO su meta y devuelve los puntos acumulados al terminar cada ronda (y si murió, en qué ronda): sirve para elegir la meta de puntos
function trayectoria(S, elegir, rondas = 25) {
  const pts = []; OBJ = S.obj || null;
  for (;;) {
    const mov = elegir(S);
    if (!mov) return { pts, murio: S.ro };
    const f = FORMAS[S.pz[mov.i]], res = colocar(S.tab, f, mov.r, mov.c);
    S.tab = res.t; S.pz[mov.i] = null; S.pt += puntosJugada(f, res); actualizarObj(S);
    if (S.pz.every((x) => x === null)) { pts.push(S.pt); avanzarRonda(S); if (pts.length >= rondas) return { pts, murio: 0 }; }
    else if (!S.pz.some((id) => id !== null && hayLugar(S.tab, FORMAS[id]))) return { pts, murio: S.ro };
  }
}
// Puntos con los que termina una partida del nivel (ignorando su meta): si el jugador llegó a X puntos antes de perder, habría pasado un nivel de X puntos
function puntosFinales(S, elegir, tope = 60) {
  OBJ = S.obj || null;
  for (;;) {
    const mov = elegir(S);
    if (!mov) return S.pt;
    const f = FORMAS[S.pz[mov.i]], res = colocar(S.tab, f, mov.r, mov.c);
    S.tab = res.t; S.pz[mov.i] = null; S.pt += puntosJugada(f, res);
    if (S.pz.every((x) => x === null)) { avanzarRonda(S); if (S.ro > tope) return S.pt; }
    else if (!S.pz.some((id) => id !== null && hayLugar(S.tab, FORMAS[id]))) return S.pt;
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
} else if (cmd === "buscar") { // node bot-bloques.mjs buscar <nivel> [variantes=30] [minRondas] [maxRondas]: prueba la «sem» 0, 1, 2… del nivel y recomienda la más pasable
  const n = Number(a1), K = Number(a2) || 30, L0 = nivelFijo(n);
  const lo = Number(process.argv[5]) || (L0.reto === "puntos" ? Math.max(3, Math.round(L0.meta / 35)) : 4), hi = Number(process.argv[6]) || (L0.reto === "puntos" ? Math.round(L0.meta / 16) + 1 : 12);
  const filas = [];
  for (let sem = 0; sem < K; sem++) {
    const bu = jugar(partidaNivel(n, sem), elegirBueno);
    let afi = 0; for (let k = 0; k < 100; k++) if (jugar(partidaNivel(n, sem), elegirAficionado).gana) afi++;
    const ok = bu.gana && bu.ro >= lo && bu.ro <= hi;
    filas.push({ sem, ok, ro: bu.ro, gana: bu.gana, afi });
    console.log("  sem " + String(sem).padStart(2) + ": bueno " + (bu.gana ? String(bu.ro).padStart(2) + " rondas" : "pierde    ") + " · aficionado " + String(afi).padStart(3) + " %" + (ok ? "" : "  (fuera de " + lo + "–" + hi + " rondas)"));
  }
  const mejor = filas.filter((f) => f.ok).sort((x, y) => y.afi - x.afi || x.sem - y.sem)[0];
  console.log("Nivel " + n + " → " + (mejor ? "RECOMENDADA sem " + mejor.sem + " (bueno " + mejor.ro + " rondas, aficionado " + mejor.afi + " %)" : "ninguna variante cumple: cambia cubos, dif o la meta"));
} else if (cmd === "calibrar") { // meta de puntos que pasaría el X % de los jugadores aficionados (por defecto 60): node bot-bloques.mjs calibrar [desde] [hasta] [porcentaje]
  const desde = Number(a1) || 1, hasta = Number(a2) || NIVELES_FIJOS, pct = Number(process.argv[5]) || 60;
  for (let n = desde; n <= hasta; n++) {
    if (nivelFijo(n).reto !== "puntos") continue;
    const ps = []; for (let k = 0; k < 300; k++) ps.push(puntosFinales(partidaNivel(n), elegirAficionado));
    ps.sort((x, y) => x - y);
    console.log("Nivel " + n + ": meta actual " + nivelFijo(n).meta + " · meta que pasa el " + pct + " % de los aficionados: " + ps[Math.floor((ps.length * (100 - pct)) / 100)]);
  }
} else if (cmd === "curva") { // puntos al final de cada ronda (bot bueno / bot medio) para elegir las metas de los niveles de puntos
  const desde = Number(a1) || 1, hasta = Number(a2) || NIVELES_FIJOS;
  for (let n = desde; n <= hasta; n++) {
    if (nivelFijo(n).reto !== "puntos") continue;
    const b = trayectoria(partidaNivel(n), elegirBueno), m = trayectoria(partidaNivel(n), elegirMedio);
    console.log("Nivel " + n + " (meta " + nivelFijo(n).meta + ")\n  bueno: " + b.pts.join(" ") + (b.murio ? "  ✝ ronda " + b.murio : "") + "\n  medio: " + m.pts.join(" ") + (m.murio ? "  ✝ ronda " + m.murio : ""));
  }
} else if (cmd === "niveles" || cmd === "validar") {
  const desde = cmd === "niveles" ? Number(a1) || 1 : 1, hasta = cmd === "niveles" ? Number(a2) || NIVELES_FIJOS : NIVELES_FIJOS;
  let mal = 0;
  for (let n = desde; n <= hasta; n++) {
    const L = nivelFijo(n), bu = jugar(partidaNivel(n), elegirBueno);
    let nov = 0, afi = 0;
    for (let k = 0; k < 100; k++) { if (jugar(partidaNivel(n), elegirNovato).gana) nov++; if (jugar(partidaNivel(n), elegirAficionado).gana) afi++; }
    const conCandado = L.reto !== "candados" && (L.tab.slice(N).some((v) => v !== 0) || bu.candados > 0);
    const meta = L.reto === "candados" ? "candados " + L.cand.join("+") : L.meta + " pts";
    const sug = Math.ceil(bu.ro * 1.5 + 1);
    console.log("Nivel " + String(n).padStart(2) + " [" + L.reto + "] " + meta.padEnd(16) + "· " + String(llenas(L.tab)).padStart(2) + " cubos · bueno " + (bu.gana ? "GANA en " + String(bu.ro).padStart(2) + " rondas (" + String(bu.pt).padStart(3) + " pts)" : "PIERDE") +
      " · aficionado " + String(afi).padStart(3) + " % · novato " + String(nov).padStart(3) + " % · par " + L.par + (L.par !== sug ? " (sugerido " + sug + ")" : "") + (conCandado ? " · ¡TIENE CANDADOS!" : ""));
    if (cmd === "validar" && (!bu.gana || (n <= 10 && (conCandado || L.reto !== "puntos")) || L.par < bu.ro)) { mal++; console.log("   ↳ REVISAR este nivel"); }
  }
  if (cmd === "validar") console.log(mal ? "REVISAR: " + mal + " nivel(es) con problema" : "Todo bien: el bot bueno gana todos, los 10 primeros son solo de puntos y ningún par queda por debajo de lo que tarda el bot");
} else console.log("Uso: node bot-bloques.mjs dificultades [partidas] [rondas] | niveles [desde] [hasta] | buscar <nivel> [variantes] [minRondas] [maxRondas] | calibrar [desde] [hasta] [%] | curva [desde] [hasta] | validar");
