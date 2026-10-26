// Ruta: dulces/logica.js (reglas del juego «dulces»: tablero, parejas, dulces especiales y cascadas; no toca la pantalla)
//
// Dulce:  { id, t, e }   t = color (0..5, -1 en la bomba), e = especial:
//   ""  normal      "h" rayas horizontales (limpia su fila)     "v" rayas verticales (limpia su columna)
//   "w" envuelto (explota 3x3 dos veces)                        "b" bomba de color (limpia un color)
// Todas las funciones de jugada devuelven «pasos» que la pantalla reproduce en orden; la pantalla nunca lee el tablero mientras anima.

export const PUNTOS = { dulce: 20, especial: 60, gelatina: 40, bono: 200, cascada: 0.5, cascadaMax: 4 }; // cascada: +50 % por cada reacción en cadena (hasta 4 reacciones)

const clave = (E, r, c) => r * E.c + c;
const dentro = (E, p) => p.r >= 0 && p.c >= 0 && p.r < E.f && p.c < E.c;

// ---- Estado ----
// def = { mascara:[".####.", ...], gel:[[0,1,..]], tipos, movs, objetivo:{tipo:"puntos"|"gelatina"|"recoger", ...}, estrellas:[a,b,c] }
export function crearEstado(def, rng = Math.random) {
  const f = def.mascara.length, c = def.mascara[0].length;
  const E = {
    f, c, def, rng,
    act: def.mascara.map((fila) => [...fila].map((ch) => ch !== ".")),
    tab: Array.from({ length: f }, () => Array(c).fill(null)),
    gel: def.gel.map((fila) => [...fila]),
    tipos: def.tipos, movs: def.movs, puntos: 0, sigId: 1, pend: [], fin: null,
    recogido: {},
  };
  if (def.objetivo.tipo === "recoger") def.objetivo.items.forEach((it) => { E.recogido[it.t] = 0; });
  do llenarSinParejas(E); while (!todasJugadas(E).length);
  return E;
}
function llenarSinParejas(E) {
  for (let r = 0; r < E.f; r++) {
    for (let c = 0; c < E.c; c++) {
      E.tab[r][c] = null;
      if (!E.act[r][c]) continue;
      let t;
      do {
        t = Math.floor(E.rng() * E.tipos);
      } while (
        (c >= 2 && E.tab[r][c - 1] && E.tab[r][c - 2] && E.tab[r][c - 1].t === t && E.tab[r][c - 2].t === t) ||
        (r >= 2 && E.tab[r - 1][c] && E.tab[r - 2][c] && E.tab[r - 1][c].t === t && E.tab[r - 2][c].t === t)
      );
      E.tab[r][c] = { id: E.sigId++, t, e: "" };
    }
  }
}
export function gelRestante(E) {
  let n = 0;
  E.gel.forEach((fila) => fila.forEach((v) => { n += v; }));
  return n;
}
export function instantanea(E) {
  return { puntos: E.puntos, movs: E.movs, recogido: { ...E.recogido }, gel: gelRestante(E) };
}
export function objetivoCumplido(E) {
  const o = E.def.objetivo;
  if (o.tipo === "puntos") return E.puntos >= o.meta;
  if (o.tipo === "gelatina") return gelRestante(E) === 0;
  return o.items.every((it) => E.recogido[it.t] >= it.cant);
}
export function estrellas(E) {
  const [, b, c] = E.def.estrellas;
  return 1 + (E.puntos >= b ? 1 : 0) + (E.puntos >= c ? 1 : 0);
}

// ---- Detectar parejas ----
// Devuelve grupos { t, runs:[{dir,t,cells}], cells:[{r,c}] }; las filas/columnas de 3+ del mismo color que se tocan forman un grupo (L, T, +)
export function detectar(E) {
  const col = (r, c) => { const x = E.tab[r][c]; return x && x.e !== "b" ? x.t : -1; };
  const corridas = [];
  for (let r = 0; r < E.f; r++) {
    let c = 0;
    while (c < E.c) {
      const t = col(r, c);
      if (t < 0) { c++; continue; }
      let k = c + 1;
      while (k < E.c && col(r, k) === t) k++;
      if (k - c >= 3) { const cells = []; for (let i = c; i < k; i++) cells.push({ r, c: i }); corridas.push({ dir: "h", t, cells }); }
      c = k;
    }
  }
  for (let c = 0; c < E.c; c++) {
    let r = 0;
    while (r < E.f) {
      const t = col(r, c);
      if (t < 0) { r++; continue; }
      let k = r + 1;
      while (k < E.f && col(k, c) === t) k++;
      if (k - r >= 3) { const cells = []; for (let i = r; i < k; i++) cells.push({ r: i, c }); corridas.push({ dir: "v", t, cells }); }
      r = k;
    }
  }
  const padre = corridas.map((_, i) => i);
  const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const dueno = new Map();
  corridas.forEach((cr, i) => cr.cells.forEach((p) => {
    const k = clave(E, p.r, p.c);
    if (dueno.has(k)) padre[raiz(i)] = raiz(dueno.get(k)); else dueno.set(k, i);
  }));
  const grupos = new Map();
  corridas.forEach((cr, i) => { const g = raiz(i); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push(cr); });
  return [...grupos.values()].map((runs) => {
    const cells = new Map();
    runs.forEach((cr) => cr.cells.forEach((p) => cells.set(clave(E, p.r, p.c), p)));
    return { t: runs[0].t, runs, cells: [...cells.values()] };
  });
}
// ¿El dulce de (r,c) forma una pareja de 3+? (rápido, para buscar jugadas)
function hayJunto(E, r, c) {
  const x = E.tab[r][c];
  if (!x || x.e === "b") return false;
  const cuenta = (dr, dc) => {
    let n = 0, rr = r + dr, cc = c + dc;
    while (E.tab[rr] && E.tab[rr][cc] && E.tab[rr][cc].e !== "b" && E.tab[rr][cc].t === x.t) { n++; rr += dr; cc += dc; }
    return n;
  };
  return cuenta(0, 1) + cuenta(0, -1) >= 2 || cuenta(1, 0) + cuenta(-1, 0) >= 2;
}
// Todas las jugadas válidas: [[{r,c},{r,c}], ...]
export function todasJugadas(E) {
  const res = [];
  for (let r = 0; r < E.f; r++) {
    for (let c = 0; c < E.c; c++) {
      const A = E.tab[r][c];
      if (!A) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const r2 = r + dr, c2 = c + dc;
        const B = E.tab[r2] && E.tab[r2][c2];
        if (!B) continue;
        if (A.e === "b" || B.e === "b" || (A.e && B.e)) { res.push([{ r, c }, { r: r2, c: c2 }]); continue; }
        E.tab[r][c] = B; E.tab[r2][c2] = A;
        const ok = hayJunto(E, r, c) || hayJunto(E, r2, c2);
        E.tab[r][c] = A; E.tab[r2][c2] = B;
        if (ok) res.push([{ r, c }, { r: r2, c: c2 }]);
      }
    }
  }
  return res;
}

// ---- Especiales que nacen de una pareja ----
function planEspecial(g, swap) {
  const pref = (cells) => (swap && cells.find((p) => swap.some((s) => s.r === p.r && s.c === p.c))) || cells[Math.floor((cells.length - 1) / 2)];
  const larga = g.runs.find((x) => x.cells.length >= 5);
  if (larga) { const p = pref(larga.cells); return { r: p.r, c: p.c, e: "b", t: -1 }; } // 5 en línea: bomba de color
  const h = g.runs.filter((x) => x.dir === "h"), v = g.runs.filter((x) => x.dir === "v");
  if (h.length && v.length) { // L, T o +: envuelto
    const esta = (lista, p) => lista.some((x) => x.cells.some((q) => q.r === p.r && q.c === p.c));
    const p = pref(g.cells.filter((q) => esta(h, q) && esta(v, q)));
    return { r: p.r, c: p.c, e: "w", t: g.t };
  }
  const cuatro = g.runs.find((x) => x.cells.length === 4);
  if (cuatro) { const p = pref(cuatro.cells); return { r: p.r, c: p.c, e: cuatro.dir === "h" ? "v" : "h", t: g.t }; } // 4 en línea: rayas
  return null;
}

// ---- Una ronda: borra parejas y efectos, calcula puntos, hace caer y rellena ----
// o = { swap, forzar:[{r,c}], efectos:[], cascada, bono }
function procesar(E, o) {
  const grupos = detectar(E);
  const forzar = o.forzar || [];
  if (!grupos.length && !forzar.length && !E.pend.length) return null;
  const borrar = new Map(), cola = [], efectos = (o.efectos || []).slice(), crear = [];
  let nEsp = 0;
  const marcar = (r, c) => {
    if (r < 0 || c < 0 || r >= E.f || c >= E.c) return;
    const k = clave(E, r, c);
    const x = E.tab[r][c];
    if (!x || borrar.has(k)) return;
    borrar.set(k, { r, c });
    if (x.e && !x.neutro) cola.push({ r, c, x });
  };
  const area = (r, c, rad) => { for (let i = -rad; i <= rad; i++) for (let j = -rad; j <= rad; j++) marcar(r + i, c + j); };

  grupos.forEach((g) => {
    const pl = planEspecial(g, o.swap);
    if (pl) crear.push(pl);
    g.cells.forEach((p) => marcar(p.r, p.c));
  });
  forzar.forEach((p) => marcar(p.r, p.c));
  const pend = E.pend; E.pend = [];
  pend.forEach((p) => { efectos.push({ tipo: "explosion", r: p.r, c: p.c, radio: 1 }); area(p.r, p.c, 1); }); // segunda explosión de un envuelto

  while (cola.length) { // reacción en cadena de especiales
    const { r, c, x } = cola.shift();
    nEsp++;
    if (x.e === "h") { efectos.push({ tipo: "fila", r }); for (let k = 0; k < E.c; k++) marcar(r, k); }
    else if (x.e === "v") { efectos.push({ tipo: "columna", c }); for (let k = 0; k < E.f; k++) marcar(k, c); }
    else if (x.e === "w") { efectos.push({ tipo: "explosion", r, c, radio: 1 }); area(r, c, 1); E.pend.push({ r, c }); }
    else if (x.e === "b") {
      const presentes = [];
      E.tab.forEach((fila) => fila.forEach((d) => { if (d && d.t >= 0) presentes.push(d.t); }));
      const color = presentes.length ? presentes[Math.floor(E.rng() * presentes.length)] : 0;
      const destinos = celdasDeColor(E, color);
      efectos.push({ tipo: "color", r, c, destinos });
      destinos.forEach((p) => marcar(p.r, p.c));
    }
  }

  const borrados = [], gelCambios = [];
  let capas = 0;
  borrar.forEach(({ r, c }) => {
    const x = E.tab[r][c];
    borrados.push({ id: x.id, r, c, t: x.t, e: x.e });
    if (x.t >= 0 && x.t in E.recogido) E.recogido[x.t]++;
    if (E.gel[r][c] > 0) { E.gel[r][c]--; capas++; gelCambios.push({ r, c, n: E.gel[r][c] }); }
    E.tab[r][c] = null;
  });
  const creados = crear.map((pl) => {
    const x = { id: E.sigId++, t: pl.t, e: pl.e };
    E.tab[pl.r][pl.c] = x;
    return { id: x.id, r: pl.r, c: pl.c, t: x.t, e: x.e };
  });

  const mult = 1 + PUNTOS.cascada * Math.min(o.cascada || 0, PUNTOS.cascadaMax);
  const ganado = Math.round(((borrar.size * PUNTOS.dulce + nEsp * PUNTOS.especial + capas * PUNTOS.gelatina) * mult + (o.bono || 0)) / 10) * 10;
  E.puntos += ganado;
  const etiqueta = borrados.length
    ? { r: borrados.reduce((s, b) => s + b.r, 0) / borrados.length, c: borrados.reduce((s, b) => s + b.c, 0) / borrados.length }
    : { r: 0, c: 0 };
  const { caidas, nuevos } = caer(E);
  return { tipo: "ronda", efectos, borrados, creados, gelCambios, ganado, etiqueta, caidas, nuevos, cascada: o.cascada || 0, ...instantanea(E) };
}
function celdasDeColor(E, color) {
  const l = [];
  for (let r = 0; r < E.f; r++) for (let c = 0; c < E.c; c++) { const x = E.tab[r][c]; if (x && x.t === color) l.push({ r, c }); }
  return l;
}

// ---- Gravedad y relleno (los dulces saltan los huecos del molde) ----
function caer(E) {
  const caidas = [], nuevos = [];
  for (let c = 0; c < E.c; c++) {
    const filas = [];
    for (let r = 0; r < E.f; r++) if (E.act[r][c]) filas.push(r);
    const existentes = filas.filter((r) => E.tab[r][c]).map((r) => ({ x: E.tab[r][c], r }));
    const vacios = filas.length - existentes.length;
    if (!vacios) continue;
    filas.forEach((r) => { E.tab[r][c] = null; });
    for (let k = 0; k < vacios; k++) {
      const x = { id: E.sigId++, t: Math.floor(E.rng() * E.tipos), e: "" };
      E.tab[filas[k]][c] = x;
      nuevos.push({ id: x.id, t: x.t, e: "", c, a: filas[k], de: filas[0] - (vacios - k) });
    }
    existentes.forEach(({ x, r }, j) => {
      const nr = filas[vacios + j];
      E.tab[nr][c] = x;
      if (nr !== r) caidas.push({ id: x.id, c, de: r, a: nr });
    });
  }
  return { caidas, nuevos };
}

// ---- Combinaciones de dos especiales ----
function comboEspecial(E, a, b, A, B) {
  const ea = A.e, eb = B.e;
  if (ea !== "b" && eb !== "b" && !(ea && eb)) return null;
  const todos = () => { const l = []; for (let r = 0; r < E.f; r++) for (let c = 0; c < E.c; c++) if (E.tab[r][c]) l.push({ r, c }); return l; };
  if (ea === "b" && eb === "b") { // dos bombas: todo el tablero
    A.neutro = B.neutro = true;
    return { forzar: todos(), efectos: [{ tipo: "explosion", r: b.r, c: b.c, radio: Math.max(E.f, E.c) }] };
  }
  if (ea === "b" || eb === "b") { // bomba + algo: todo un color
    const bomba = ea === "b" ? A : B, otro = ea === "b" ? B : A;
    const pb = ea === "b" ? b : a; // tras el intercambio A quedó en b y B en a
    bomba.neutro = true;
    if (!otro.e) otro.neutro = true;
    const color = otro.t;
    const destinos = celdasDeColor(E, color).filter((p) => E.tab[p.r][p.c] !== bomba);
    if (otro.e) { // bomba + rayas/envuelto: todos los de ese color se vuelven rayas/envueltos y explotan
      destinos.forEach((p) => { const x = E.tab[p.r][p.c]; if (x !== otro) x.e = otro.e === "w" ? "w" : (E.rng() < 0.5 ? "h" : "v"); });
    }
    return { forzar: [pb, ...destinos], efectos: [{ tipo: "color", r: pb.r, c: pb.c, destinos }] };
  }
  A.neutro = B.neutro = true; // dos especiales (rayas/envuelto): se mezclan en un efecto grande centrado en b
  const forzar = [], efectos = [];
  const fila = (r) => { efectos.push({ tipo: "fila", r }); for (let k = 0; k < E.c; k++) forzar.push({ r, c: k }); };
  const columna = (c) => { efectos.push({ tipo: "columna", c }); for (let k = 0; k < E.f; k++) forzar.push({ r: k, c }); };
  if (ea === "w" && eb === "w") {
    efectos.push({ tipo: "explosion", r: b.r, c: b.c, radio: 2 });
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) forzar.push({ r: b.r + i, c: b.c + j });
  } else if (ea === "w" || eb === "w") { // rayas + envuelto: 3 filas y 3 columnas
    for (let d = -1; d <= 1; d++) { fila(b.r + d); columna(b.c + d); }
  } else { // rayas + rayas: cruz
    fila(b.r); columna(b.c);
  }
  return { forzar: forzar.filter((p) => dentro(E, p)), efectos: efectos.filter((e) => (e.r === undefined || (e.r >= 0 && e.r < E.f)) && (e.c === undefined || (e.c >= 0 && e.c < E.c))) };
}

// ---- Jugada del jugador ----
// Devuelve { valida:false } si no se puede (el tablero queda como estaba) o { valida:true, pasos, fin }.
// pasos: {tipo:"swap"} {tipo:"ronda"} {tipo:"conversion"} {tipo:"barajar"}   fin: null | "gano" | "perdio"
export function jugada(E, a, b) {
  if (E.fin || !dentro(E, a) || !dentro(E, b) || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return { valida: false };
  const A = E.tab[a.r][a.c], B = E.tab[b.r][b.c];
  if (!A || !B) return { valida: false };
  E.tab[a.r][a.c] = B; E.tab[b.r][b.c] = A;
  const combo = comboEspecial(E, a, b, A, B);
  if (!combo && !detectar(E).length) { E.tab[a.r][a.c] = A; E.tab[b.r][b.c] = B; return { valida: false }; }
  E.movs--;
  const pasos = [{ tipo: "swap", a, b, idA: A.id, idB: B.id, movs: E.movs }];
  let cascada = 0;
  let r = procesar(E, { swap: [a, b], forzar: combo ? combo.forzar : [], efectos: combo ? combo.efectos : [], cascada });
  while (r) { pasos.push(r); cascada++; r = procesar(E, { cascada }); }

  const meta = objetivoCumplido(E);
  const esPuntos = E.def.objetivo.tipo === "puntos";
  let fin = null;
  if (!esPuntos && meta) fin = "gano"; // gelatina y recoger terminan en cuanto se cumplen
  else if (E.movs <= 0) fin = meta ? "gano" : "perdio"; // puntos: se juega hasta gastar los movimientos
  if (fin === "gano" && E.movs > 0) pasos.push(...bonoFinal(E)); // movimientos sobrantes → rayas que explotan
  if (!fin && !todasJugadas(E).length) pasos.push(barajar(E)); // sin jugadas: se mezcla solo
  E.fin = fin;
  return { valida: true, pasos, fin };
}

// ---- Bono final: cada movimiento que sobra se convierte en un dulce de rayas que explota ----
function bonoFinal(E) {
  const pasos = [];
  const normales = [];
  E.tab.forEach((fila) => fila.forEach((x) => { if (x && !x.e) normales.push(x); }));
  const n = Math.min(E.movs, 10, normales.length);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = normales.splice(Math.floor(E.rng() * normales.length), 1)[0];
    x.e = E.rng() < 0.5 ? "h" : "v";
    items.push({ id: x.id, e: x.e });
  }
  E.movs = 0;
  pasos.push({ tipo: "conversion", items, movs: 0 });
  for (const it of items) {
    let pos = null;
    E.tab.forEach((fila, r) => fila.forEach((x, c) => { if (x && x.id === it.id) pos = { r, c }; }));
    if (!pos) continue; // ya lo borró una explosión anterior
    let cascada = 0;
    let r = procesar(E, { forzar: [pos], bono: PUNTOS.bono, cascada });
    while (r) { pasos.push(r); cascada++; r = procesar(E, { cascada }); }
  }
  return pasos;
}

// ---- Mezclar cuando no quedan jugadas ----
export function barajar(E) {
  const dulces = [], celdas = [];
  E.tab.forEach((fila, r) => fila.forEach((x, c) => { if (E.act[r][c]) celdas.push({ r, c }); if (x) dulces.push(x); }));
  let listo = false;
  for (let intento = 0; intento < 200 && !listo; intento++) {
    for (let i = dulces.length - 1; i > 0; i--) { const j = Math.floor(E.rng() * (i + 1)); [dulces[i], dulces[j]] = [dulces[j], dulces[i]]; }
    celdas.forEach((p, i) => { E.tab[p.r][p.c] = dulces[i]; });
    listo = !detectar(E).length && todasJugadas(E).length > 0;
  }
  if (!listo) { // muy raro: se reparten dulces nuevos
    do llenarSinParejas(E); while (!todasJugadas(E).length);
  }
  const pos = [];
  E.tab.forEach((fila, r) => fila.forEach((x, c) => { if (x) pos.push({ id: x.id, t: x.t, e: x.e, r, c }); }));
  return { tipo: "barajar", pos };
}
