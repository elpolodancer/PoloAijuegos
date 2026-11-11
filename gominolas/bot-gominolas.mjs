// Ruta: gominolas/bot-gominolas.mjs
// BOT DE PRUEBAS de «Conecta gominolas». Se corre en una terminal con Node (no en el navegador):
//   node gominolas/bot-gominolas.mjs                  (todo: modo libre + campaña, 30 partidas por celda)
//   node gominolas/bot-gominolas.mjs libre --n 50     (solo modo libre, 50 partidas por tablero y dificultad)
//   node gominolas/bot-gominolas.mjs campana --n 60   (solo los niveles de campaña)
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
  NEGRA, ESPECIAL, TABLEROS, DIFICULTADES, crearRng, crearPartida, vecinos, lineasDePoderes, conjuntoRoto,
  jugarCadena, usarPoder, cadenaValida, parametrosLibre, parametrosCampana, contarNegras, CADENA_HORIZONTAL, CADENA_VERTICAL,
} from "./logica-gominolas.js";

// ---------- Búsqueda de jugadas ----------
function evaluar(p, cad) {
  const ult = cad[cad.length - 1];
  const lista = cad.map(({ f, c }) => [f, c]).concat(lineasDePoderes(p, cad, ult));
  const roto = conjuntoRoto(p, lista);
  let negras = 0;
  roto.forEach((key) => { if (p.grid[Math.floor(key / 100)][key % 100].k === NEGRA) negras++; });
  const n = cad.length;
  const bonoPoder = n >= CADENA_VERTICAL ? 3 : n >= CADENA_HORIZONTAL ? 1.5 : 0; // crear un poder vale como 1–3 negras
  return { cad: cad.slice(), negras, score: negras * 100 + bonoPoder * 100 + roto.size };
}

// Reúne jugadas con búsqueda en profundidad con presupuesto de nodos
function candidatas(p, rng, presupuesto = 1500, maxLen = 10) {
  const lista = [];
  // 1) tocar un poder solo
  for (let f = 0; f < p.filas; f++)
    for (let c = 0; c < p.cols; c++)
      if (p.grid[f][c].k === ESPECIAL) lista.push({ ...evaluar(p, [{ f, c }]), poder: true });
  // 2) cadenas
  const inicios = [];
  for (let f = 0; f < p.filas; f++) for (let c = 0; c < p.cols; c++) if (p.grid[f][c].k >= 0) inicios.push({ f, c });
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
function jugarPartida(params, estilo, rng) {
  const p = crearPartida(params, rng);
  let atascos = 0;
  while (p.estado === "jugando") {
    const m = elegir(p, estilo, rng);
    if (!m) { atascos++; if (atascos > 5) break; continue; }
    if (m.poder) usarPoder(p, m.cad[0]);
    else {
      if (!cadenaValida(p, m.cad)) throw new Error("el bot armó una cadena inválida");
      jugarCadena(p, m.cad);
    }
  }
  return { gano: p.estado === "gano", movsUsados: params.movs - p.movs, fallos: p.fallos, negrasFin: contarNegras(p), atascos };
}

// ---------- Reportes ----------
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "—").padStart(5);
const args = process.argv.slice(2);
const val = (nombre, def) => { const i = args.indexOf("--" + nombre); return i >= 0 ? args[i + 1] : def; };
const modo = args.find((a) => !a.startsWith("--") && ["libre", "campana", "todo"].includes(a)) || "todo";
const N = Number(val("n", 30));
const MAXR = Number(val("rondas", 30));
const SEMILLA = Number(val("semilla", 1));
const soloTablero = val("tablero", null);
const soloDif = val("dif", null);
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

const t0 = Date.now();
if (modo === "libre" || modo === "todo") libre();
if (modo === "campana" || modo === "todo") campana();
console.log("\n(" + Math.round((Date.now() - t0) / 1000) + " s, semilla " + SEMILLA + ")");
