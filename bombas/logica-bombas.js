// Ruta: bombas/logica-bombas.js
// Reglas de «Bombas» (estilo Bomberman) SIN pantalla: no usa document, audio ni Firebase. Así el juego (juego-bombas.js) y un bot futuro
// de comprobación de niveles usan exactamente las mismas reglas.
//
// Estado E: { cols, filas, grid, jugador, enemigos[], bombas[], fuegos[], items[], puerta, ocultos{}, vidas, puntos, tic, estado }
//   grid[f][c]  0 = piso · 1 = muro fijo · 2 = bloque que se rompe.  Tamaño de 10×10 a 40×40 (MIN_LADO … MAX_LADO).
//   Cada ente (jugador/enemigo) = { x, y, ox, oy, t, paso, dx, dy }: x,y = casilla donde ESTÁ (ya decidida); ox,oy = casilla de la que viene;
//   t = cuadros que le faltan para terminar el paso (la pantalla interpola entre ox,oy y x,y).
//   Enemigo = ente + { nivel (1..5), persigue }.  Bomba = { x, y, t, r, dueno } (dueno = el enemigo que la puso; sin dueno = del jugador).
//   puerta = { x, y, visible }: escondida bajo un bloque; para ganar hay que entrar en ella (y, si requiere, sin enemigos vivos).
// Un cuadro: paso(E, entrada) con entrada = { dx, dy, bomba } → devuelve la lista de eventos [{ tipo, ... }] para sonido y puntos.
//   tipos: "poner", "explota", "bloque", "enemigo", "item", "puerta", "muerte", "gano", "perdio"

export const MIN_LADO = 10;
export const MAX_LADO = 40;
export const MECHA = 150;          // cuadros (a 60 por segundo) que tarda una bomba en explotar
export const DURACION_FUEGO = 30;  // cuadros que dura la llama
export const PASO_JUGADOR = 12;    // cuadros por casilla (menos = más rápido)
export const PASO_MIN = 7;
export const INVULNERABLE = 120;   // cuadros sin poder morir al reaparecer
export const MAX_BOMBAS = 5;       // 💣 mejoras: de 1 a 5 bombas a la vez
export const MAX_ALCANCE = 5;      // 🔥 mejoras: la llama llega de 1 a 5 casillas
export const PUNTOS = { bloque: 10, item: 50, ronda: 300 };   // cada enemigo da 100 × su nivel
export const TIPOS_ITEM = ["bomba", "fuego", "vel"];          // +1 bomba · +1 alcance · más velocidad

// Bots (enemigos) con 5 niveles de dificultad. paso = cuadros por casilla; persigue = probabilidad de ir hacia ti.
//  1 Globo: camina al azar · 2 Gusano: al azar, a veces te sigue · 3 Fantasma: te sigue seguido
//  4 Robot: te sigue y NUNCA pisa casillas en peligro (huye de las bombas) · 5 Demonio: te busca por el camino más corto, huye y pone sus propias bombas
export const BOTS = [
  null,
  { nivel: 1, nombre: "Globo", emoji: "🎈", paso: 32, persigue: 0 },
  { nivel: 2, nombre: "Gusano", emoji: "🐛", paso: 26, persigue: 0.15 },
  { nivel: 3, nombre: "Fantasma", emoji: "👻", paso: 22, persigue: 0.4 },
  { nivel: 4, nombre: "Robot", emoji: "🤖", paso: 17, persigue: 0.65 },
  { nivel: 5, nombre: "Demonio", emoji: "😈", paso: 14, persigue: 1 },
];
const ALCANCE_BOT = 2;

// Modo libre: 5 dificultades. bots = cuántos hay de cada nivel [1,2,3,4,5] · cols×filas = tamaño al empezar (crece 2 por ronda, hasta 40)
export const DIFICULTADES_LIBRE = [
  { id: "muyfacil", nombre: "Muy fácil", clase: "b-verde", cols: 11, filas: 11, bots: [2, 0, 0, 0, 0], tope: 1, bloques: 0.5, items: 0.3, vidas: 5 },
  { id: "facil", nombre: "Fácil", clase: "b-azul", cols: 15, filas: 13, bots: [2, 2, 0, 0, 0], tope: 2, bloques: 0.55, items: 0.28, vidas: 4 },
  { id: "normal", nombre: "Normal", clase: "b-morado", cols: 19, filas: 15, bots: [1, 2, 2, 1, 0], tope: 3, bloques: 0.6, items: 0.26, vidas: 3 },
  { id: "dificil", nombre: "Difícil", clase: "b-oro", cols: 25, filas: 19, bots: [0, 1, 2, 3, 2], tope: 4, bloques: 0.65, items: 0.24, vidas: 3 },
  { id: "experto", nombre: "Experto", clase: "b-rojo", cols: 31, filas: 23, bots: [0, 0, 1, 3, 5], tope: 5, bloques: 0.7, items: 0.22, vidas: 2 },
];

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clave = (c, f) => c + "," + f;
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
const nuevoEnte = (x, y, paso) => ({ x, y, ox: x, oy: y, t: 0, paso, dx: 0, dy: 0 });
const enZonaSegura = (c, f) => c <= 3 && f <= 3;   // esquina de salida del jugador: sin bloques ni enemigos

// ---------- Construcción ----------
// ronda = 1, 2, 3… (cada ronda: +2 de ancho y de alto hasta 40, y un bot más del nivel más alto de la dificultad, hasta +6)
export function nuevaRonda(idDificultad, ronda = 1, azar = Math.random, previo = null) {
  const d = DIFICULTADES_LIBRE.find((x) => x.id === idDificultad) || DIFICULTADES_LIBRE[2];
  const bots = d.bots.slice();
  bots[d.tope - 1] += Math.min(6, ronda - 1);
  return construir({ cols: d.cols + 2 * (ronda - 1), filas: d.filas + 2 * (ronda - 1), bots, bloques: d.bloques, items: d.items, vidas: d.vidas }, azar, previo);
}

// params: { cols, filas (10..40), bots: [n1..n5], bloques (prob.), items (prob. de mejora por bloque), vidas, puertaRequiereEnemigos (por defecto true) }.
// previo = estado anterior (conserva vidas, puntos y mejoras entre rondas).
export function construir(params, azar = Math.random, previo = null) {
  const cols = acotar(Math.floor(params.cols) || MIN_LADO, MIN_LADO, MAX_LADO), filas = acotar(Math.floor(params.filas) || MIN_LADO, MIN_LADO, MAX_LADO);
  const grid = [];
  for (let f = 0; f < filas; f++) {
    grid.push([]);
    for (let c = 0; c < cols; c++) {
      if (f === 0 || c === 0 || f === filas - 1 || c === cols - 1 || (f % 2 === 0 && c % 2 === 0)) grid[f].push(1);
      else grid[f].push(!enZonaSegura(c, f) && azar() < params.bloques ? 2 : 0);
    }
  }
  const libres = [], bloques = [];
  for (let f = 1; f < filas - 1; f++) for (let c = 1; c < cols - 1; c++) {
    if (grid[f][c] === 2) bloques.push([c, f]);
    else if (grid[f][c] === 0 && c + f > 8) libres.push([c, f]);   // lejos de la salida
  }
  const mezclar = (l) => { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
  mezclar(libres);

  // bots: se reparten por el mapa según cuántos hay de cada nivel
  const enemigos = [];
  let k = 0;
  for (let nivel = 1; nivel <= 5; nivel++) for (let i = 0; i < (params.bots[nivel - 1] || 0) && k < libres.length; i++, k++) {
    const b = BOTS[nivel];
    enemigos.push({ ...nuevoEnte(libres[k][0], libres[k][1], b.paso), nivel, persigue: b.persigue });
  }

  // puerta: escondida bajo uno de los bloques más lejanos a la salida (si no hay bloques, en un piso lejano)
  let pc, pf;
  if (bloques.length) {
    const lejos = bloques.slice().sort((a, b) => b[0] + b[1] - (a[0] + a[1])).slice(0, Math.max(1, Math.ceil(bloques.length * 0.3)));
    [pc, pf] = lejos[Math.floor(azar() * lejos.length)];
  } else { [pc, pf] = libres[libres.length - 1] || [cols - 2, filas - 2]; }
  const puerta = { x: pc, y: pf, visible: grid[pf][pc] === 0 };

  // mejoras escondidas dentro de bloques
  const ocultos = {};
  for (const [c, f] of bloques) if (!(c === pc && f === pf) && azar() < params.items) ocultos[clave(c, f)] = TIPOS_ITEM[Math.floor(azar() * TIPOS_ITEM.length)];

  const j = nuevoEnte(1, 1, previo ? previo.jugador.paso : PASO_JUGADOR);
  return {
    cols, filas, grid, jugador: j, enemigos, bombas: [], fuegos: [], items: [], puerta, ocultos, azar, params,
    maxBombas: previo ? previo.maxBombas : 1, alcance: previo ? previo.alcance : 1,
    vidas: previo ? previo.vidas : params.vidas, puntos: previo ? previo.puntos : 0,
    inv: INVULNERABLE, tic: 0, estado: "jugando", peligro: null,
  };
}

// ---------- Consultas ----------
const bombaEn = (E, c, f) => E.bombas.find((b) => b.x === c && b.y === f);
const libreParaAndar = (E, c, f) => c >= 0 && f >= 0 && c < E.cols && f < E.filas && E.grid[f][c] === 0 && !bombaEn(E, c, f);
const hayFuego = (E, c, f) => E.fuegos.some((q) => q.x === c && q.y === f);
export const puertaAbierta = (E) => E.puerta.visible && (E.params.puertaRequiereEnemigos === false || E.enemigos.length === 0);

// Casillas donde una bomba (o llama) haría daño ahora. Los bots de nivel 4 y 5 no las pisan.
function peligro(E) {
  if (E.peligro) return E.peligro;
  const s = new Set();
  for (const q of E.fuegos) s.add(clave(q.x, q.y));
  for (const b of E.bombas) {
    s.add(clave(b.x, b.y));
    for (const [dx, dy] of DIRS) for (let k = 1; k <= b.r; k++) {
      const c = b.x + dx * k, f = b.y + dy * k;
      if (E.grid[f][c] !== 0) break;
      s.add(clave(c, f));
    }
  }
  return (E.peligro = s);
}

// Búsqueda en anchura: primer paso [dx,dy] hacia la casilla más cercana que cumple «meta» (máx. «max» pasos), o null
function primerPaso(E, sx, sy, meta, ok, max) {
  const vistos = new Set([clave(sx, sy)]);
  let frente = [[sx, sy, null]];
  for (let d = 0; d < max && frente.length; d++) {
    const sig = [];
    for (const [c, f, p] of frente) for (const dir of DIRS) {
      const nc = c + dir[0], nf = f + dir[1], k = clave(nc, nf);
      if (vistos.has(k) || !ok(nc, nf)) continue;
      vistos.add(k);
      const primero = p || dir;
      if (meta(nc, nf)) return primero;
      sig.push([nc, nf, primero]);
    }
    frente = sig;
  }
  return null;
}

// ---------- Explosiones ----------
function explotar(E, bomba, ev) {
  const cola = [bomba];
  E.peligro = null;
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
        E.items = E.items.filter((i) => !(i.x === c && i.y === f));    // la llama destruye mejoras sueltas
        if (E.grid[f][c] === 2) {
          E.grid[f][c] = 0;
          E.puntos += PUNTOS.bloque;
          ev.push({ tipo: "bloque", x: c, y: f });
          if (c === E.puerta.x && f === E.puerta.y) { E.puerta.visible = true; ev.push({ tipo: "puerta" }); }
          const oculto = E.ocultos[clave(c, f)];
          if (oculto) { delete E.ocultos[clave(c, f)]; E.items.push({ x: c, y: f, tipo: oculto, nuevo: DURACION_FUEGO }); }
          break;                                                       // el bloque frena la llama
        }
      }
    }
  }
}

// ---------- Movimiento ----------
function avanzar(ente, dx, dy, puedeIr) {
  if (ente.t > 0) { ente.t--; return false; }
  if (!dx && !dy) return false;
  if (!puedeIr(ente.x + dx, ente.y + dy)) return false;
  ente.ox = ente.x; ente.oy = ente.y; ente.x += dx; ente.y += dy; ente.dx = dx; ente.dy = dy; ente.t = ente.paso;
  return true;
}

function dirBot(E, e) {
  const sinFuego = (c, f) => libreParaAndar(E, c, f) && !hayFuego(E, c, f);
  let opciones = DIRS.filter(([dx, dy]) => sinFuego(e.x + dx, e.y + dy));
  const j = E.jugador;
  if (e.nivel >= 4) {   // huye de las bombas y no pisa casillas en peligro
    const pel = peligro(E);
    if (pel.has(clave(e.x, e.y))) {
      const huida = primerPaso(E, e.x, e.y, (c, f) => !pel.has(clave(c, f)), sinFuego, 14);
      if (huida) return huida;
    }
    opciones = opciones.filter(([dx, dy]) => !pel.has(clave(e.x + dx, e.y + dy)));
  }
  if (!opciones.length) return [0, 0];
  if (e.nivel === 5 && E.azar() < e.persigue) {   // camino más corto hacia el jugador
    const pel = peligro(E);
    const paso = primerPaso(E, e.x, e.y, (c, f) => c === j.x && f === j.y, (c, f) => (c === j.x && f === j.y) || (sinFuego(c, f) && !pel.has(clave(c, f))), 40);
    if (paso && opciones.some(([dx, dy]) => dx === paso[0] && dy === paso[1])) return paso;
  } else if (e.nivel >= 2 && E.azar() < e.persigue) {   // un paso que lo acerque a ti
    const dist = ([dx, dy]) => Math.abs(e.x + dx - j.x) + Math.abs(e.y + dy - j.y);
    return [...opciones].sort((a, b) => dist(a) - dist(b))[0];
  }
  const sinVuelta = opciones.filter(([dx, dy]) => !(dx === -e.dx && dy === -e.dy));
  const seguir = sinVuelta.find(([dx, dy]) => dx === e.dx && dy === e.dy);
  if (seguir && E.azar() < 0.7) return seguir;
  const lista = sinVuelta.length ? sinVuelta : opciones;
  return lista[Math.floor(E.azar() * lista.length)];
}

// El demonio (nivel 5) pone una bomba si estás cerca (o tiene un bloque pegado) y tiene por dónde escapar
function intentarBombaBot(E, e) {
  if (e.nivel !== 5 || E.bombas.some((b) => b.dueno === e) || bombaEn(E, e.x, e.y)) return;
  const j = E.jugador, cerca = Math.abs(j.x - e.x) + Math.abs(j.y - e.y) <= 3;
  const bloque = DIRS.some(([dx, dy]) => E.grid[e.y + dy][e.x + dx] === 2);
  if (!((cerca && E.azar() < 0.5) || (bloque && E.azar() < 0.04))) return;
  E.bombas.push({ x: e.x, y: e.y, t: MECHA, r: ALCANCE_BOT, dueno: e });
  E.peligro = null;
  const pel = peligro(E);
  const salida = primerPaso(E, e.x, e.y, (c, f) => !pel.has(clave(c, f)), (c, f) => libreParaAndar(E, c, f) && !hayFuego(E, c, f), 8);
  if (!salida) { E.bombas.pop(); E.peligro = null; }
}

// ---------- Un cuadro ----------
export function paso(E, entrada = {}) {
  const ev = [];
  if (E.estado !== "jugando") return ev;
  E.tic++;
  if (E.inv > 0) E.inv--;
  E.peligro = null;
  const j = E.jugador;

  // el jugador anda (no puede entrar a bombas ni bloques; sí puede salir de una bomba recién puesta)
  if (avanzar(j, entrada.dx || 0, entrada.dy || 0, (c, f) => libreParaAndar(E, c, f))) {
    const i = E.items.findIndex((q) => q.x === j.x && q.y === j.y);
    if (i >= 0) {
      const q = E.items.splice(i, 1)[0];
      if (q.tipo === "bomba") E.maxBombas = Math.min(MAX_BOMBAS, E.maxBombas + 1);
      else if (q.tipo === "fuego") E.alcance = Math.min(MAX_ALCANCE, E.alcance + 1);
      else j.paso = Math.max(PASO_MIN, j.paso - 1);
      E.puntos += PUNTOS.item;
      ev.push({ tipo: "item", item: q.tipo });
    }
  }
  if (entrada.bomba && E.bombas.filter((b) => !b.dueno).length < E.maxBombas && !bombaEn(E, j.x, j.y) && E.grid[j.y][j.x] === 0) {
    E.bombas.push({ x: j.x, y: j.y, t: MECHA, r: E.alcance });
    E.peligro = null;
    ev.push({ tipo: "poner" });
  }

  // bots
  for (const e of E.enemigos) {
    if (e.t > 0) { e.t--; continue; }
    intentarBombaBot(E, e);
    const [dx, dy] = dirBot(E, e);
    avanzar(e, dx, dy, (c, f) => libreParaAndar(E, c, f));
  }

  // bombas y llamas
  for (const b of [...E.bombas]) { b.t--; if (b.t <= 0) explotar(E, b, ev); }
  for (const q of E.fuegos) q.t--;
  E.fuegos = E.fuegos.filter((q) => q.t > 0);
  for (const i of E.items) if (i.nuevo > 0) i.nuevo--;

  // daños: bots en llamas (cada uno da 100 × su nivel)
  const vivos = [];
  for (const e of E.enemigos) {
    if (hayFuego(E, e.x, e.y)) { E.puntos += 100 * e.nivel; ev.push({ tipo: "enemigo", x: e.x, y: e.y, nivel: e.nivel }); } else vivos.push(e);
  }
  E.enemigos = vivos;

  // daños: jugador
  if (E.inv === 0 && (hayFuego(E, j.x, j.y) || E.enemigos.some((e) => e.x === j.x && e.y === j.y))) {
    E.vidas--;
    ev.push({ tipo: "muerte" });
    if (E.vidas <= 0) { E.estado = "perdio"; ev.push({ tipo: "perdio" }); return ev; }
    Object.assign(j, nuevoEnte(1, 1, j.paso)); E.inv = INVULNERABLE;
  }

  // la puerta: ganas al entrar en ella con la puerta abierta
  if (j.x === E.puerta.x && j.y === E.puerta.y && puertaAbierta(E)) { E.puntos += PUNTOS.ronda; E.estado = "gano"; ev.push({ tipo: "gano" }); }
  return ev;
}
