// Ruta: gominolas/bot-gominolas.mjs
// BOT DE PRUEBAS de «Conecta gominolas». Se corre en una terminal con Node (no en el navegador):
//   node gominolas/bot-gominolas.mjs                  (todo: modo libre + campaña, 30 partidas por celda)
//   node gominolas/bot-gominolas.mjs libre --n 50     (solo modo libre, 50 partidas por tablero y dificultad)
//   node gominolas/bot-gominolas.mjs campana --n 60   (solo los niveles de campaña antiguos, 6×8)
//   node gominolas/bot-gominolas.mjs poderes --n 100  (cuántos poderes salen: horizontal/vertical por partida, en cuántas partidas sale alguno y en qué % de jugadas había una región tan grande como para hacerlo)
//   node gominolas/bot-gominolas.mjs estrellas --n 200 --umbrales 0.25,0.5  (de las partidas ganadas, qué % saca 1, 2 o 3 estrellas según los movimientos que sobran)
//   (catalogo, poderes y estrellas aceptan --patron filas y --tipo capas para probar esos niveles)
//   node gominolas/bot-gominolas.mjs catalogo --n 40  (campaña con catálogo: % de victorias por tablero y dificultad, y el factor de movimientos que daría cada meta)
//   opciones: --n N  --rondas R (tope de rondas del modo libre, 30)  --semilla S  --tablero 8x10  --dif medio
//             --estilos experto,casual,novato,azar   (cuáles jugadores probar; por omisión experto,novato,azar)
// Usa compartido de reglas: gominolas/logica-gominolas.js (los mismos números de balance que usa el juego).
//
// Tres estilos de jugador:
//   experto  mira todas las cadenas que puede y elige la que elimina más negras (con poderes incluidos)
//   casual   apunta a las negras, pero 1 de cada 3 jugadas toca una cadena cualquiera (como una persona distraída)
//   novato   de las cadenas que ve elige la mejor de solo 4 al azar (mira poco el tablero; se parece a una persona que está aprendiendo)
//   azar     siempre una cadena cualquiera (el peor caso: alguien que no entiende dónde están las negras)
import {
  NEGRA, TABLEROS, DIFICULTADES, crearRng, crearPartida, vecinos, lineasDePoderes, conjuntoRoto,
  jugarCadena, cadenaValida, parametrosLibre, parametrosCampana, parametrosNivel, CAMPANA_NIVEL, contarNegras, CADENA_HORIZONTAL, CADENA_VERTICAL, SORPRESA,
} from "./logica-gominolas.js";

// ---------- Búsqueda de jugadas ----------
function evaluar(p, cad) {
  const ult = cad[cad.length - 1];
  const lista = cad.map(({ f, c }) => [f, c]).concat(lineasDePoderes(p, cad, ult));
  const roto = conjuntoRoto(p, lista);
  let negras = 0, valor = 0; // valor: una negra que se quita vale 100; un golpe a una negra con capas vale 60
  roto.forEach((key) => { const g = p.grid[Math.floor(key / 100)][key % 100]; if (g.k === NEGRA) { negras++; valor += g.c > 1 ? 60 : 100; } });
  const n = cad.length;
  const bonoPoder = n >= CADENA_VERTICAL ? 3 : n >= CADENA_HORIZONTAL ? 1.5 : 0; // crear un poder vale como 1–3 negras
  return { cad: cad.slice(), negras, score: valor + bonoPoder * 100 + roto.size };
}

// Reúne jugadas con búsqueda en profundidad con presupuesto de nodos
function candidatas(p, rng, presupuesto = 1500, maxLen = 10) {
  const lista = [];
  // cadenas de ositos del mismo color (los que tienen poder son ositos de su color y lo activan al entrar en la cadena)
  const inicios = [];
  // Nivel sorpresa con una sola negra: una persona apunta directo hacia ella, así que solo se prueban cadenas que empiezan cerca de la negra (y con más presupuesto)
  let cerca = null;
  if (p.fase === "senuelo") {
    for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) if (p.grid[f][c].k === NEGRA) cerca = { f, c };
    presupuesto = 6000;
  }
  for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) if (p.grid[f][c].k >= 0 && (!cerca || Math.max(Math.abs(f - cerca.f), Math.abs(c - cerca.c)) <= 2)) inicios.push({ f, c });
  for (let i = inicios.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [inicios[i], inicios[j]] = [inicios[j], inicios[i]]; }
  let nodos = 0;
  const cad = [], usados = new Set();
  function dfs(kc) {
    if (nodos++ > presupuesto) return;
    if (cad.length >= 3) lista.push(evaluar(p, cad));
    if (cad.length >= maxLen) return;
    const u = cad[cad.length - 1];
    const vs = vecinos(p, u.f, u.c);
    for (let i = vs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [vs[i], vs[j]] = [vs[j], vs[i]]; }
    for (const [nf, nc] of vs) {
      if (usados.has(nf * 100 + nc)) continue;
      const k = p.grid[nf][nc].k;
      if (k === NEGRA) continue;
      if (k >= 0 && kc !== null && k !== kc) continue;
      cad.push({ f: nf, c: nc }); usados.add(nf * 100 + nc);
      dfs(kc === null && k >= 0 ? k : kc);
      cad.pop(); usados.delete(nf * 100 + nc);
      if (nodos > presupuesto) return;
    }
  }
  for (const s of inicios) {
    if (nodos > presupuesto) break;
    cad.push(s); usados.add(s.f * 100 + s.c);
    dfs(p.grid[s.f][s.c].k);
    cad.pop(); usados.delete(s.f * 100 + s.c);
  }
  return lista;
}

function elegir(p, estilo, rng) {
  const lista = candidatas(p, rng, estilo === "azar" || estilo === "novato" ? 400 : 1000);
  if (!lista.length) return null;
  const cualquiera = () => lista[Math.floor(rng() * lista.length)];
  if (estilo === "azar") return cualquiera();
  if (estilo === "casual" && rng() < 1 / 3) return cualquiera();
  if (estilo === "novato") {
    let m = cualquiera();
    for (let i = 0; i < 3; i++) { const x = cualquiera(); if (x.score > m.score) m = x; }
    return m;
  }
  let mejor = lista[0];
  for (const x of lista) if (x.score > mejor.score) mejor = x;
  return mejor;
}

// Juega una partida completa. Devuelve { gano, movs, fallos, atascos }
// Tamaño de la región más grande de ositos del mismo color (con diagonales, como las cadenas): ¿había lugar para una cadena de ese largo?
function mayorRegion(p) {
  const visto = new Set(); let mayor = 0;
  for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) {
    const k0 = p.grid[f][c].k;
    if (k0 < 0 || visto.has(f * 100 + c)) continue;
    let n = 0; const pila = [[f, c]]; visto.add(f * 100 + c);
    while (pila.length) { const [a, d] = pila.pop(); n++; for (const [na, nb] of vecinos(p, a, d)) if (!visto.has(na * 100 + nb) && p.grid[na][nb].k === k0) { visto.add(na * 100 + nb); pila.push([na, nb]); } }
    if (n > mayor) mayor = n;
  }
  return mayor;
}
function jugarPartida(params, estilo, rng) {
  const p = crearPartida(params, rng);
  let atascos = 0, jugadas = 0, hor = 0, ver = 0, hay7 = 0, hay9 = 0, senuelo = 0; // senuelo: jugadas que costó romper la primera negra de un nivel sorpresa
  while (p.estado === "jugando") {
    const m = elegir(p, estilo, rng);
    if (!m) { atascos++; if (atascos > 5) break; continue; }
    if (!cadenaValida(p, m.cad)) throw new Error("el bot armó una cadena inválida");
    const reg = mayorRegion(p); // antes de jugar
    if (reg >= CADENA_HORIZONTAL) hay7++;
    if (reg >= CADENA_VERTICAL) hay9++;
    jugadas++;
    if (p.fase === "senuelo") senuelo++;
    if (m.cad.length >= CADENA_VERTICAL) ver++; else if (m.cad.length >= CADENA_HORIZONTAL) hor++;
    jugarCadena(p, m.cad);
  }
  return { gano: p.estado === "gano", movsUsados: params.movs - p.movs, fallos: p.fallos, negrasFin: contarNegras(p), atascos, jugadas, hor, ver, hay7, hay9, senuelo };
}

// ---------- Reportes ----------
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "—").padStart(5);
const args = process.argv.slice(2);
const val = (nombre, def) => { const i = args.indexOf("--" + nombre); return i >= 0 ? args[i + 1] : def; };
const modo = args.find((a) => !a.startsWith("--") && ["libre", "campana", "catalogo", "poderes", "estrellas", "todo"].includes(a)) || "todo";
const N = Number(val("n", 30));
const MAXR = Number(val("rondas", 30));
const SEMILLA = Number(val("semilla", 1));
const soloTablero = val("tablero", null);
const soloDif = val("dif", null);
const TIPO = val("tipo", "clasico"); // --tipo capas: prueba los niveles con negras con capas
const PATRON = val("patron", "azar"); // --patron filas: los niveles de catalogo/poderes empiezan con filas completas de negras
const ESTILOS = val("estilos", "experto,novato,azar").split(",");
const FIJAS = val("fijas", null); // --fijas 1,10,20,30: juega rondas sueltas (no carreras); sirve para calibrar rápido
const RONDAS_MUESTRA = [1, 3, 5, 10, 15, 20, 30].filter((r) => r <= MAXR);

function libreFijas() {
  const rondas = FIJAS.split(",").map(Number);
  console.log("\n=== MODO LIBRE, rondas sueltas: % ganado (" + N + " partidas por celda) ===");
  for (const t of TABLEROS) {
    if (soloTablero && t.id !== soloTablero) continue;
    for (const d of Object.values(DIFICULTADES)) {
      if (soloDif && d.id !== soloDif) continue;
      for (const estilo of ESTILOS) {
        const rng = crearRng(SEMILLA * 999 + t.cols * 13 + d.penaliza * 5 + estilo.length);
        const celdas = rondas.map((r) => {
          let g = 0, mov = 0, ej;
          for (let i = 0; i < N; i++) {
            const par = parametrosLibre(t, d, r, rng); ej = par;
            const res = jugarPartida(par, estilo, rng);
            if (res.gano) g++; mov += res.movsUsados;
          }
          return "r" + r + " " + pct(g, N) + " (" + ej.negras + "n/" + ej.movs + "m, usa " + Math.round(mov / N) + ")";
        });
        console.log((t.id.padEnd(6) + d.id.padEnd(8) + estilo.padEnd(8)) + celdas.join(" | "));
      }
    }
  }
}

function libre() {
  if (FIJAS) return libreFijas();
  console.log("\n=== MODO LIBRE: % de rondas ganadas en cada ronda (carreras de hasta " + MAXR + " rondas, se corta al primer fallo) ===");
  console.log("Cada celda: ronda alcanzada en promedio · % de carreras que llegan a la ronda " + MAXR);
  for (const t of TABLEROS) {
    if (soloTablero && t.id !== soloTablero) continue;
    for (const d of Object.values(DIFICULTADES)) {
      if (soloDif && d.id !== soloDif) continue;
      for (const estilo of ESTILOS) {
        const rng = crearRng(SEMILLA * 1000 + t.cols * 31 + d.penaliza * 7 + estilo.length);
        const nCarreras = estilo === "azar" ? Math.max(6, Math.round(N / 2)) : N;
        const jug = {}, gan = {}; let sumaRondas = 0, completas = 0;
        for (let i = 0; i < nCarreras; i++) {
          let r = 1;
          for (; r <= MAXR; r++) {
            const res = jugarPartida(parametrosLibre(t, d, r, rng), estilo, rng);
            jug[r] = (jug[r] || 0) + 1;
            if (res.gano) gan[r] = (gan[r] || 0) + 1; else break;
          }
          sumaRondas += Math.min(r, MAXR + 1) - 1; // rondas superadas
          if (r > MAXR) completas++;
        }
        const cols = RONDAS_MUESTRA.map((r) => "r" + r + ":" + pct(gan[r] || 0, jug[r] || 0)).join(" ");
        console.log(
          (t.id.padEnd(6) + d.id.padEnd(8) + estilo.padEnd(8)) +
          "superadas≈" + (sumaRondas / nCarreras).toFixed(1).padStart(5) + " · llegan a " + MAXR + ":" + pct(completas, nCarreras) + " | " + cols
        );
      }
    }
  }
}

function campana() {
  console.log("\n=== CAMPAÑA (6×8, una negra por jugada fallida): % de victorias por nivel ===");
  const niveles = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 100];
  console.log("nivel".padEnd(8) + ESTILOS.map((e) => e.padEnd(9)).join("") + "(negras/movs de ejemplo)");
  for (const n of niveles) {
    const fila = [];
    const ej = parametrosCampana(n, crearRng(n));
    for (const estilo of ESTILOS) {
      const rng = crearRng(SEMILLA * 777 + n);
      const nn = estilo === "azar" ? Math.max(15, Math.round(N / 2)) : N;
      let g = 0;
      for (let i = 0; i < nn; i++) if (jugarPartida(parametrosCampana(n, rng), estilo, rng).gano) g++;
      fila.push(pct(g, nn).padEnd(9));
    }
    console.log(String(n).padEnd(8) + fila.join("") + ej.negras + " negras / " + ej.movs + " movs");
  }
}


// Campaña con catálogo. Truco: el resultado de una partida NO depende del tope de movimientos hasta que se acaba, así que se juega
// una vez con un tope enorme, se anota cuántas jugadas hizo falta (T) y se calcula con cualquier factor si habría ganado (T ≤ movs).
function catalogo() {
  const dificultades = soloDif ? [soloDif] : ["facil", "medio", "dificil"];
  const tableros = TABLEROS.filter((t) => ["6x8", "8x10", "10x12", "12x14"].includes(t.id) && (!soloTablero || t.id === soloTablero));
  const QS = val("qs", "0.5,0.8,0.95").split(",").map(Number); // porcentajes de victoria para los que se calcula el factor
  console.log("\n=== CAMPAÑA CON CATÁLOGO · patrón «" + PATRON + "» · tipo «" + TIPO + "»: % de victorias con los números actuales (CAMPANA_NIVEL) (" + N + " partidas por celda) ===");
  console.log("densidad " + CAMPANA_NIVEL.dens + " · extra " + CAMPANA_NIVEL.extra);
  console.log("«f» (en el orden de --qs " + QS.join("/") + ") = factor de movimientos con el que ese estilo ganaría el 50/80/95 % de las partidas (movs = negras × factor + " + CAMPANA_NIVEL.extra + ")");
  for (const dId of dificultades) {
    for (const t of tableros) {
      for (const estilo of ESTILOS) {
        const rng = crearRng(SEMILLA * 4242 + t.cols * 17 + DIFICULTADES[dId].penaliza * 3 + estilo.length);
        const nn = estilo === "azar" ? Math.max(10, Math.round(N / 2)) : N;
        let gan = 0, usados = 0, sen = 0, ej; const factores = [];
        const fijos = CAMPANA_NIVEL.extra + (TIPO === "sorpresa" ? SORPRESA.movsSenuelo : 0); // movimientos que no dependen de las negras
        for (let i = 0; i < nn; i++) {
          const par = parametrosNivel({ tablero: t, dificultad: dId, patron: PATRON, tipo: TIPO }, rng); ej = par;
          const r = jugarPartida({ ...par, movs: 400 }, estilo, rng);
          const T = r.gano ? r.movsUsados : Infinity;
          if (T <= par.movs) gan++;
          if (r.gano) usados += T;
          sen += r.senuelo;
          factores.push(T === Infinity ? Infinity : (T - fijos) / par.negras);
        }
        factores.sort((a, b) => a - b);
        const f = QS.map((q) => { const v = factores[Math.min(factores.length - 1, Math.ceil(q * factores.length) - 1)]; return v === Infinity ? "  ∞ " : Math.max(0, v).toFixed(2); });
        console.log(dId.padEnd(8) + t.id.padEnd(6) + estilo.padEnd(8) + "gana " + pct(gan, nn) + "  (" + ej.negras + "n/" + ej.movs + "m, castigo " + ej.penaliza + ")  factor para " + QS.join("/") + ": " + f.join(" / ") + (TIPO === "sorpresa" ? "  · rompe la 1ª negra en ≈" + (sen / nn).toFixed(1) + " jugadas" : ""));
      }
    }
  }
}

// ¿Salen muy pocos poderes? Juega partidas del catálogo y cuenta los que crean las cadenas largas (umbrales: CADENA_HORIZONTAL y CADENA_VERTICAL de logica-gominolas.js).
function poderes() {
  const tableros = TABLEROS.filter((t) => ["6x8", "8x10", "10x12", "12x14"].includes(t.id) && (!soloTablero || t.id === soloTablero));
  const dificultades = soloDif ? [soloDif] : ["facil", "medio", "dificil"];
  console.log("\n=== PODERES (umbral ↔ " + CADENA_HORIZONTAL + ", ↕ " + CADENA_VERTICAL + ") · " + N + " partidas por celda ===");
  console.log("↔/part y ↕/part = poderes creados por partida · con alguno = % de partidas que crean al menos uno · jug.= jugadas por partida · había 7/9 = % de jugadas en las que existía una región de ese tamaño");
  for (const t of tableros) for (const dId of dificultades) for (const estilo of ESTILOS) {
    const rng = crearRng(SEMILLA * 9091 + t.cols * 19 + DIFICULTADES[dId].penaliza * 5 + estilo.length);
    let h = 0, v = 0, con = 0, jug = 0, h7 = 0, h9 = 0;
    for (let i = 0; i < N; i++) {
      const par = parametrosNivel({ tablero: t, dificultad: dId, patron: PATRON, tipo: TIPO }, rng);
      const x = jugarPartida({ ...par, movs: 400 }, estilo, rng);
      h += x.hor; v += x.ver; jug += x.jugadas; h7 += x.hay7; h9 += x.hay9; if (x.hor + x.ver > 0) con++;
    }
    console.log(t.id.padEnd(6) + dId.padEnd(8) + estilo.padEnd(8) + "↔/part " + (h / N).toFixed(2) + " · ↕/part " + (v / N).toFixed(2) + " · con alguno " + pct(con, N) + " · jug. " + (jug / N).toFixed(1) + " · había " + CADENA_HORIZONTAL + ": " + pct(h7, jug) + " · había " + CADENA_VERTICAL + ": " + pct(h9, jug));
  }
}

// Estrellas: 1 = ganar · 2 = ganar con al menos U2 de los movimientos sin usar · 3 = con al menos U3 sin usar (--umbrales U2,U3)
function estrellas() {
  const [U2, U3] = val("umbrales", "0.25,0.5").split(",").map(Number);
  const tableros = TABLEROS.filter((t) => ["6x8", "8x10", "10x12", "12x14"].includes(t.id) && (!soloTablero || t.id === soloTablero));
  const dificultades = soloDif ? [soloDif] : ["facil", "medio", "dificil"];
  console.log("\n=== ESTRELLAS (2★ ≥ " + Math.round(U2 * 100) + "% de movimientos sobrantes, 3★ ≥ " + Math.round(U3 * 100) + "%) · " + N + " partidas por celda ===");
  console.log("Cada celda: de las partidas GANADAS, % con 1★ / 2★ / 3★ (entre paréntesis, % de partidas ganadas)");
  for (const t of tableros) for (const dId of dificultades) for (const estilo of ESTILOS) {
    const rng = crearRng(SEMILLA * 5557 + t.cols * 23 + DIFICULTADES[dId].penaliza * 11 + estilo.length);
    let gan = 0, e1 = 0, e2 = 0, e3 = 0;
    for (let i = 0; i < N; i++) {
      const par = parametrosNivel({ tablero: t, dificultad: dId, patron: PATRON, tipo: TIPO }, rng);
      const r = jugarPartida({ ...par, movs: 400 }, estilo, rng);
      if (!r.gano || r.movsUsados > par.movs) continue;
      gan++;
      const sobra = (par.movs - r.movsUsados) / par.movs;
      if (sobra >= U3) e3++; else if (sobra >= U2) e2++; else e1++;
    }
    console.log(t.id.padEnd(6) + dId.padEnd(8) + estilo.padEnd(8) + "1★ " + pct(e1, gan) + " · 2★ " + pct(e2, gan) + " · 3★ " + pct(e3, gan) + "   (gana " + pct(gan, N) + ")");
  }
}

const t0 = Date.now();
if (modo === "libre" || modo === "todo") libre();
if (modo === "campana" || modo === "todo") campana();
if (modo === "catalogo") catalogo();
if (modo === "poderes") poderes();
if (modo === "estrellas") estrellas();
console.log("\n(" + Math.round((Date.now() - t0) / 1000) + " s, semilla " + SEMILLA + ")");
