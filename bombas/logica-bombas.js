// Ruta: bombas/logica-bombas.js
// Reglas de «Bombas» (estilo Bomberman) SIN pantalla: no usa document, audio ni Firebase. Así el juego (juego-bombas.js) y un bot futuro
// de comprobación de niveles usan exactamente las mismas reglas.
//
// Estado E: { grid, jugador, enemigos[], bombas[], fuegos[], items[], ocultos{}, vidas, puntos, tic, estado, p }
//   grid[f][c]  0 = piso · 1 = muro fijo · 2 = bloque que se rompe
//   Cada ente (jugador/enemigo) = { x, y, ox, oy, t, paso, dx, dy }: x,y = casilla donde ESTÁ (ya decidida); ox,oy = casilla de la que viene;
//   t = cuadros que le faltan para terminar el paso (la pantalla interpola entre ox,oy y x,y).
// Un cuadro: paso(E, entrada) con entrada = { dx, dy, bomba } → devuelve la lista de eventos [{ tipo, ... }] para sonido y puntos.
//   tipos: "poner", "explota", "bloque", "enemigo", "item", "muerte", "gano", "perdio"

export const COLS = 13;
export const FILAS = 11;
export const MECHA = 150;          // cuadros (a 60 por segundo) que tarda una bomba en explotar
export const DURACION_FUEGO = 30;  // cuadros que dura la llama
export const PASO_JUGADOR = 12;    // cuadros por casilla (menos = más rápido)
export const PASO_MIN = 7;
export const INVULNERABLE = 120;   // cuadros sin poder morir al reaparecer
export const PUNTOS = { bloque: 10, enemigo: 100, item: 50, ronda: 300 };
export const TIPOS_ITEM = ["bomba", "fuego", "vel"];   // +1 bomba · +1 alcance · más velocidad

// ncol «enemigos» = cuántos · bloques = probabilidad de bloque en casillas libres · paso = cuadros por casilla del enemigo · persigue = prob. de ir hacia ti
export const DIFICULTADES_LIBRE = [
  { id: "muyfacil", nombre: "Muy fácil", clase: "b-verde", enemigos: 2, bloques: 0.5, paso: 30, persigue: 0, vidas: 5 },
  { id: "facil", nombre: "Fácil", clase: "b-azul", enemigos: 3, bloques: 0.55, paso: 26, persigue: 0.1, vidas: 4 },
  { id: "normal", nombre: "Normal", clase: "b-morado", enemigos: 4, bloques: 0.6, paso: 22, persigue: 0.25, vidas: 3 },
  { id: "dificil", nombre: "Difícil", clase: "b-oro", enemigos: 6, bloques: 0.65, paso: 18, persigue: 0.4, vidas: 3 },
  { id: "experto", nombre: "Experto", clase: "b-rojo", enemigos: 8, bloques: 0.7, paso: 15, persigue: 0.6, vidas: 2 },
];

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const nuevoEnte = (x, y, paso) => ({ x, y, ox: x, oy: y, t: 0, paso, dx: 0, dy: 0 });
const enZonaSegura = (c, f) => c <= 3 && f <= 3;   // esquina de salida del jugador: sin bloques ni enemigos

// ---------- Construcción ----------
// ronda = 1, 2, 3… (cada ronda agrega un enemigo, hasta +4). azar = Math.random o un generador con semilla.
export function nuevaRonda(idDificultad, ronda = 1, azar = Math.random, previo = null) {
  const d = DIFICULTADES_LIBRE.find((x) => x.id === idDificultad) || DIFICULTADES_LIBRE[2];
  return construir({ enemigos: d.enemigos + Math.min(4, ronda - 1), bloques: d.bloques, paso: d.paso, persigue: d.persigue, vidas: d.vidas }, azar, previo);
}

// params: { enemigos, bloques, paso, persigue, vidas }. previo = estado anterior (conserva vidas, puntos y mejoras entre rondas).
export function construir(params, azar = Math.random, previo = null) {
  const grid = [];
  for (let f = 0; f < FILAS; f++) {
    grid.push([]);
    for (let c = 0; c < COLS; c++) {
      if (f === 0 || c === 0 || f === FILAS - 1 || c === COLS - 1 || (f % 2 === 0 && c % 2 === 0)) grid[f].push(1);
      else grid[f].push(!enZonaSegura(c, f) && azar() < params.bloques ? 2 : 0);
    }
  }
  const libres = [], bloques = [];
  for (let f = 1; f < FILAS - 1; f++) for (let c = 1; c < COLS - 1; c++) {
    if (grid[f][c] === 2) bloques.push([c, f]);
    else if (grid[f][c] === 0 && c + f > 8) libres.push([c, f]);   // lejos de la salida
  }
  for (let i = libres.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [libres[i], libres[j]] = [libres[j], libres[i]]; }
  const enemigos = libres.slice(0, params.enemigos).map(([c, f]) => ({ ...nuevoEnte(c, f, params.paso), persigue: params.persigue }));
  // objetos escondidos dentro de bloques (≈ 1 de cada 4)
  const ocultos = {};
  for (const [c, f] of bloques) if (azar() < 0.25) ocultos[c + "," + f] = TIPOS_ITEM[Math.floor(azar() * TIPOS_ITEM.length)];
  const j = nuevoEnte(1, 1, previo ? previo.jugador.paso : PASO_JUGADOR);
  return {
    grid, jugador: j, enemigos, bombas: [], fuegos: [], items: [], ocultos, azar, params,
    maxBombas: previo ? previo.maxBombas : 1, alcance: previo ? previo.alcance : 1,
    vidas: previo ? previo.vidas : params.vidas, puntos: previo ? previo.puntos : 0,
    inv: INVULNERABLE, tic: 0, estado: "jugando",
  };
}

// ---------- Consultas ----------
const bombaEn = (E, c, f) => E.bombas.find((b) => b.x === c && b.y === f);
const libreParaAndar = (E, c, f) => c >= 0 && f >= 0 && c < COLS && f < FILAS && E.grid[f][c] === 0 && !bombaEn(E, c, f);
const hayFuego = (E, c, f) => E.fuegos.some((q) => q.x === c && q.y === f);

// ---------- Explosiones ----------
function explotar(E, bomba, ev) {
  const cola = [bomba];
  while (cola.length) {
    const b = cola.pop();
    if (!E.bombas.includes(b)) continue;
    E.bombas.splice(E.bombas.indexOf(b), 1);
    ev.push({ tipo: "explota", x: b.x, y: b.y });
    const llama = (c, f) => E.fuegos.push({ x: c, y: f, t: DURACION_FUEGO });
    llama(b.x, b.y);
    for (const [dx, dy] of DIRS) {
      for (let k = 1; k <= b.r; k++) {
        const c = b.x + dx * k, f = b.y + dy * k;
        if (E.grid[f][c] === 1) break;
        llama(c, f);
        const otra = bombaEn(E, c, f);
        if (otra) cola.push(otra);                                     // reacción en cadena
        E.items = E.items.filter((i) => !(i.x === c && i.y === f));    // la llama destruye objetos sueltos
        if (E.grid[f][c] === 2) {
          E.grid[f][c] = 0;
          E.puntos += PUNTOS.bloque;
          ev.push({ tipo: "bloque", x: c, y: f });
          const oculto = E.ocultos[c + "," + f];
          if (oculto) { delete E.ocultos[c + "," + f]; E.items.push({ x: c, y: f, tipo: oculto, nuevo: DURACION_FUEGO }); }
          break;                                                       // el bloque frena la llama
        }
      }
    }
  }
}

// ---------- Movimiento ----------
function avanzar(E, ente, dx, dy, puedeIr) {
  if (ente.t > 0) { ente.t--; return false; }
  if (!dx && !dy) return false;
  if (!puedeIr(ente.x + dx, ente.y + dy)) return false;
  ente.ox = ente.x; ente.oy = ente.y; ente.x += dx; ente.y += dy; ente.dx = dx; ente.dy = dy; ente.t = ente.paso;
  return true;
}

function dirEnemigo(E, e) {
  const ok = (c, f) => libreParaAndar(E, c, f) && !hayFuego(E, c, f);
  const opciones = DIRS.filter(([dx, dy]) => ok(e.x + dx, e.y + dy));
  if (!opciones.length) return [0, 0];
  const j = E.jugador;
  if (E.azar() < e.persigue) {   // un paso que lo acerque a ti
    const mejor = [...opciones].sort((a, b) => Math.abs(e.x + a[0] - j.x) + Math.abs(e.y + a[1] - j.y) - (Math.abs(e.x + b[0] - j.x) + Math.abs(e.y + b[1] - j.y)))[0];
    return mejor;
  }
  const sinVuelta = opciones.filter(([dx, dy]) => !(dx === -e.dx && dy === -e.dy));
  const seguir = sinVuelta.find(([dx, dy]) => dx === e.dx && dy === e.dy);
  if (seguir && E.azar() < 0.7) return seguir;
  const lista = sinVuelta.length ? sinVuelta : opciones;
  return lista[Math.floor(E.azar() * lista.length)];
}

// ---------- Un cuadro ----------
export function paso(E, entrada = {}) {
  const ev = [];
  if (E.estado !== "jugando") return ev;
  E.tic++;
  if (E.inv > 0) E.inv--;
  const j = E.jugador;

  // el jugador anda (no puede entrar a bombas ni bloques; sí puede salir de una bomba recién puesta)
  if (avanzar(E, j, entrada.dx || 0, entrada.dy || 0, (c, f) => libreParaAndar(E, c, f))) {
    const i = E.items.findIndex((q) => q.x === j.x && q.y === j.y);
    if (i >= 0) {
      const q = E.items.splice(i, 1)[0];
      if (q.tipo === "bomba") E.maxBombas = Math.min(6, E.maxBombas + 1);
      else if (q.tipo === "fuego") E.alcance = Math.min(8, E.alcance + 1);
      else j.paso = Math.max(PASO_MIN, j.paso - 1);
      E.puntos += PUNTOS.item;
      ev.push({ tipo: "item", item: q.tipo });
    }
  }
  if (entrada.bomba && E.bombas.length < E.maxBombas && !bombaEn(E, j.x, j.y) && E.grid[j.y][j.x] === 0) {
    E.bombas.push({ x: j.x, y: j.y, t: MECHA, r: E.alcance });
    ev.push({ tipo: "poner" });
  }

  // enemigos
  for (const e of E.enemigos) {
    if (e.t === 0) { const [dx, dy] = dirEnemigo(E, e); avanzar(E, e, dx, dy, (c, f) => libreParaAndar(E, c, f)); } else e.t--;
  }

  // bombas y llamas
  for (const b of [...E.bombas]) { b.t--; if (b.t <= 0) explotar(E, b, ev); }
  for (const q of E.fuegos) q.t--;
  E.fuegos = E.fuegos.filter((q) => q.t > 0);
  for (const i of E.items) if (i.nuevo > 0) i.nuevo--;

  // daños: enemigos en llamas
  const vivos = [];
  for (const e of E.enemigos) {
    if (hayFuego(E, e.x, e.y)) { E.puntos += PUNTOS.enemigo; ev.push({ tipo: "enemigo", x: e.x, y: e.y }); } else vivos.push(e);
  }
  E.enemigos = vivos;
  if (!E.enemigos.length) { E.puntos += PUNTOS.ronda; E.estado = "gano"; ev.push({ tipo: "gano" }); return ev; }

  // daños: jugador
  if (E.inv === 0 && (hayFuego(E, j.x, j.y) || E.enemigos.some((e) => e.x === j.x && e.y === j.y))) {
    E.vidas--;
    ev.push({ tipo: "muerte" });
    if (E.vidas <= 0) { E.estado = "perdio"; ev.push({ tipo: "perdio" }); }
    else { Object.assign(j, nuevoEnte(1, 1, j.paso)); E.inv = INVULNERABLE; }
  }
  return ev;
}
