// Ruta: bloques/niveles-bloques.js
// Las dos zonas de «Bloques de madera» (no toca el DOM: lo cargan el juego y las herramientas de Node):
//   · ♾️ Infinito: 3 dificultades (DIFICULTADES). Cambian con qué tablero empiezas, qué tan rápido se vuelven trampa las piezas y cuántos candados salen.
//   · 🗺️ Niveles fijos: un tablero inicial y una meta (limpiar N líneas) que salen siempre igual para todos (semilla por nivel).
// Una «partida» (S) es un objeto: { m: "i" | "n", d (dificultad) | n (nivel), tab, pz, pt (puntos), ro (ronda), env (puntos ya enviados al perfil), lin (líneas del nivel) }.
import { N, tableroInicial, tableroCon, rellenar, agregarBloqueo, generarRonda } from "./logica-bloques.js";

export const NIVELES_FIJOS = 3; // niveles publicados por ahora (meta: unos 2000). Para ampliar: añade filas a SENCILLOS (hasta el 10) o una curva nueva en nivelFijo(), y sube esta cifra

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Azar de la ronda «ro» del nivel «n»: así, con el mismo tablero, todos reciben las mismas piezas
export const rngRonda = (n, ro) => mulberry32(730000 + n * 7919 + ro * 104729);

// ----- Dificultades de la zona infinita («normal» es el juego de siempre, sin cambios) -----
//   cubos     [mínimo, extra]: cubos con los que empieza el tablero (null = el de siempre, 22 a 27)
//   base      dificultad de las rondas al empezar (0 a 1) · rondas = cuántas rondas tarda en subir 1 punto · tope = hasta dónde llega (ver generarRonda)
//   candDesde ronda desde la que salen candados · candK = qué tan seguido (1 = como siempre) · seg/segP = desde qué ronda puede salir un segundo candado y con qué probabilidad
//   limpia    cuánto prefieren las piezas los sitios que completan líneas (6 = como siempre; más = tablero más despejado)
//   puntosPor puntos del juego por cada punto de perfil · clave = dónde se guarda el récord (bloques_record_v1)
export const DIFICULTADES = {
  facil:   { id: "facil",   nombre: "Fácil",   icono: "🌱", color: "b-verde", cubos: [14, 4], base: 0,    rondas: 80, tope: 0.5, limpia: 12, candDesde: 12, candK: 0.5, seg: 9999, segP: 0,    puntosPor: 60, clave: "facil" },
  normal:  { id: "normal",  nombre: "Normal",  icono: "🪵", color: "b-oro",   cubos: null,    base: 0,    rondas: 35, tope: 1,   limpia: 6,  candDesde: 3,  candK: 1,   seg: 15,   segP: 0.25, puntosPor: 40, clave: "mejor" },
  dificil: { id: "dificil", nombre: "Difícil", icono: "🔥", color: "b-rojo",  cubos: [27, 5], base: 0.35, rondas: 20, tope: 1,   limpia: 3,  candDesde: 2,  candK: 1.5, seg: 8,    segP: 0.4,  puntosPor: 30, clave: "dificil" },
};
export const ORDEN_DIF = ["facil", "normal", "dificil"];

// ----- Niveles fijos -----
// Niveles sencillos (los primeros 10 serán así: sin candados y con rondas casi siempre fáciles). Por ahora solo hay 3.
// Cada fila: [líneas a limpiar, cubos con los que empieza, rondas «par» para 3 estrellas].
// El «par» sale de `node bot-bloques.mjs niveles`: lo que tarda el bot bueno ×1.5 + 1 rondas, para que una persona pueda alcanzarlo.
const SENCILLOS = [
  [3, 12, 6], [4, 12, 7], [4, 13, 4],
];
const memo = {};
export function nivelFijo(n) {
  if (!(n >= 1 && n <= NIVELES_FIJOS)) return null;
  if (memo[n]) return memo[n];
  const rng = mulberry32(720000 + n * 7919);
  const [meta, cubos, par] = SENCILLOS[n - 1];
  return (memo[n] = { n, nombre: "Nivel " + n, meta, par, dif: Math.min(0.3, 0.03 * (n - 1)), candados: false, tab: tableroCon(cubos, rng) });
}
// 3 estrellas: rondas ≤ par · 2: hasta un 50 % más · 1: terminarlo
export function estrellasDe(n, rondas) {
  const par = nivelFijo(n).par;
  return rondas <= par ? 3 : rondas <= Math.ceil(par * 1.5) ? 2 : 1;
}

// ----- Partidas nuevas -----
export function partidaInfinita(d = "normal") {
  const D = DIFICULTADES[d] || DIFICULTADES.normal;
  const tab = D.cubos ? tableroCon(D.cubos[0] + Math.floor(Math.random() * (D.cubos[1] + 1))) : tableroInicial();
  return { m: "i", d: D.id, tab, pz: generarRonda(tab, D.base, Math.random, D.limpia), pt: 0, ro: 1, env: 0 };
}
export function partidaNivel(n) {
  const L = nivelFijo(n), tab = L.tab.slice();
  return { m: "n", n, tab, pz: generarRonda(tab, L.dif, rngRonda(n, 1)), pt: 0, ro: 1, env: 0, lin: 0 };
}

// Pasa a la ronda siguiente (cuando las 3 piezas ya se pusieron). Devuelve los candados nuevos [[fila, col]…] para avisarlos en pantalla.
export function avanzarRonda(S) {
  const nuevos = [];
  S.ro++;
  if (S.m === "n") { // niveles fijos: mismo azar para todos y sin candados
    const rnd = rngRonda(S.n, S.ro);
    S.tab = rellenar(S.tab, rnd, 0);
    S.pz = generarRonda(S.tab, nivelFijo(S.n).dif, rnd);
    return nuevos;
  }
  const D = DIFICULTADES[S.d] || DIFICULTADES.normal;
  S.tab = rellenar(S.tab);
  if (S.ro >= D.candDesde) { // de vez en cuando aparece un cubo con candado (más seguido conforme avanzas)
    const veces = (Math.random() < Math.min(0.55, 0.2 + 0.01 * S.ro) * D.candK ? 1 : 0) + (S.ro >= D.seg && Math.random() < D.segP ? 1 : 0);
    for (let k = 0; k < veces; k++) {
      const antes = S.tab, nuevo = agregarBloqueo(antes);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (((nuevo[N + r] >> c) & 1) && !((antes[N + r] >> c) & 1)) nuevos.push([r, c]);
      S.tab = nuevo;
    }
  }
  S.pz = generarRonda(S.tab, Math.min(D.tope, D.base + (S.ro - 1) / D.rondas), Math.random, D.limpia); // la dificultad sube poco a poco
  return nuevos;
}
