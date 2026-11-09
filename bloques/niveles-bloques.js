// Ruta: bloques/niveles-bloques.js
// Las dos zonas de «Bloques de madera» (no toca el DOM: lo cargan el juego y las herramientas de Node):
//   · ♾️ Infinito: 3 dificultades (DIFICULTADES). Cambian con qué tablero empiezas, qué tan rápido se vuelven trampa las piezas y cuántos candados salen.
//   · 🗺️ Niveles fijos: un tablero inicial y una meta (limpiar N líneas) que salen siempre igual para todos (semilla por nivel).
// Una «partida» (S) es un objeto: { m: "i" | "n", d (dificultad) | n (nivel), tab, pz, pt (puntos), ro (ronda), env (puntos ya enviados al perfil), lin (líneas del nivel),
//   obj (solo niveles de «candados»: las casillas que hay que eliminar, un número por fila), v (versión de los niveles fijos) }.
import { N, tableroInicial, tableroCon, rellenar, agregarBloqueo, generarRonda, capas, fijarCapas } from "./logica-bloques.js";

export const NIVELES_FIJOS = 20; // niveles publicados por ahora (meta: 2000). Para ampliar: añade filas a NIVELES (ver «Cómo agregar niveles fijos» en el README) y sube esta cifra

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Azar de la ronda «ro» del nivel «n»: así, con el mismo tablero, todos reciben las mismas piezas
export const rngRonda = (n, ro, sem = 0) => mulberry32(730000 + n * 7919 + ro * 104729 + sem * 15485863); // sem: variante del nivel (ver «sem» en NIVELES)

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

// ----- Retos de los niveles fijos -----
// Cada nivel fijo tiene un «reto» (qué hay que lograr para pasarlo). Para inventar un reto nuevo basta con añadir una entrada aquí
// y usar su nombre en la fila del nivel; el juego y el bot solo hablan con estas funciones:
//   icono / titulo   cómo se llama (cartel de inicio)
//   texto(L)         instrucciones del cartel de inicio (L = el nivel)
//   hud(S, L)        { icono, txt } lo que se ve arriba a la izquierda mientras juegas
//   cumplido(S, L)   ¿ya se pasó el nivel?
//   falta(S, L)      frase del cartel de derrota («Te faltaron…»)
const pl = (n, uno, varios) => n + " " + (n === 1 ? uno : varios);
export const RETOS = {
  // ⭐ Reto general: llegar a cierta cantidad de puntos.
  puntos: {
    icono: "🎯", titulo: "Consigue puntos",
    texto: (L) => "<p>Llega a <b>" + L.meta + " puntos</b>.</p><p>Cada cubo que pones vale 1, y las filas y columnas completas dan mucho más: ¡mientras más líneas juntas, mejor!</p>",
    hud: (S, L) => ({ icono: "🎯", txt: String(L.meta) }),
    cumplido: (S, L) => S.pt >= L.meta,
    falta: (S, L) => "Te faltaron " + Math.max(0, L.meta - S.pt) + " punto(s) para pasar el nivel.",
  },
  // 🔒 Elimina todos los bloques con candado (simple = 1 capa, doble = 2, triple = 3).
  // Cada línea completa que pasa por un bloque le quita UNA capa; cuando ya no tiene capas, otra línea lo elimina.
  candados: {
    icono: "🔒", titulo: "Rompe los candados",
    texto: (L) => {
      const s = L.cand.filter((k) => k === 1).length, d = L.cand.filter((k) => k === 2).length, t = L.cand.filter((k) => k === 3).length;
      const que = [s && pl(s, "bloque con candado", "bloques con candado"), d && pl(d, "bloque con doble candado", "bloques con doble candado"), t && pl(t, "bloque con triple candado", "bloques con triple candado")].filter(Boolean);
      const lista = que.length > 1 ? que.slice(0, -1).join(", ") + " y " + que[que.length - 1] : que[0];
      return "<p>Elimina <b>" + (L.cand.length === 1 ? "el " : "los ") + lista + "</b>.</p><p>Cada vez que completas una fila o columna que lo toca, pierde un candado; sin candados, otra línea lo elimina" +
        (d || t ? " (doble: 3 líneas, triple: 4)" : " (en total, 2 líneas)") + ".</p>";
    },
    hud: (S, L) => ({ icono: "🔒", txt: (L.cand.length - restantes(S)) + "/" + L.cand.length }),
    cumplido: (S, L) => restantes(S) === 0,
    falta: (S, L) => "Te faltaron " + pl(restantes(S), "bloque", "bloques") + " con candado por eliminar.",
  },
};
// Cuántas casillas marcadas como objetivo siguen en el tablero (los candados que faltan por eliminar del todo)
export function restantes(S) {
  let n = 0;
  if (S.obj) for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((S.obj[r] >> c) & 1) n++;
  return n;
}
// Después de cada jugada: una casilla objetivo que ya no está ocupada fue eliminada (y deja de contar aunque luego se ocupe otra vez)
export function actualizarObj(S) { if (S.obj) for (let r = 0; r < N; r++) S.obj[r] &= S.tab[r]; }
export const cumplido = (S) => RETOS[nivelFijo(S.n, S.sem).reto].cumplido(S, nivelFijo(S.n, S.sem));

// ----- Niveles fijos -----
// Cada fila de NIVELES es un nivel. Campos:
//   reto    "puntos" (meta = puntos que hay que llegar) | "candados" (cand = capas de cada bloque a eliminar: 1 simple, 2 doble, 3 triple)
//   cubos   cubos con los que empieza el tablero (los bloques con candado cuentan dentro de esta cifra)
//   dif     dificultad de las rondas (0 a 1; ver generarRonda). Sube poco a poco con el número del nivel
//   sem     (opcional, 0 por defecto) variante del nivel: cambia el tablero y las piezas. Se elige con `node bot-bloques.mjs buscar` para que el nivel salga pasable
//   sesgo   (solo «candados») dónde caen los bloques con candado: 1 en filas y columnas vacías (más difícil, por defecto), 0 al azar, −1 en las más llenas (más fácil)
//   limpia  (opcional, 6 por defecto) cuánto prefieren las piezas los sitios que completan líneas: más = tablero más despejado y nivel más fácil (ver generarRonda)
//   piso / extra  (opcional) si quedan menos cubos que «piso», aparecen más (hasta piso + extra más o menos). Por defecto: cubos − 3 y cubos ÷ 3
//   par     rondas para 3 estrellas. Sale de `node bot-bloques.mjs niveles`: lo que tarda el bot bueno ×1.5 + 1, para que una persona pueda alcanzarlo
// Los primeros 10 niveles son el tutorial: solo «puntos», sin candados. Los candados empiezan en el 11.
const NIVELES = [
  // —— Tutorial (1 a 10): solo puntos ——
  { reto: "puntos", meta: 50,  cubos: 7,  dif: 0, par: 6, sem: 4 },
  { reto: "puntos", meta: 60,  cubos: 8,  dif: 0, par: 6, sem: 23 },
  { reto: "puntos", meta: 75,  cubos: 8,  dif: 0, par: 7, sem: 2 },
  { reto: "puntos", meta: 90,  cubos: 9, dif: 0, par: 7, sem: 14 },
  { reto: "puntos", meta: 105,  cubos: 9, dif: 0.01, par: 7, sem: 3 },
  { reto: "puntos", meta: 120,  cubos: 10, dif: 0.02, par: 9, sem: 11 },
  { reto: "puntos", meta: 135,  cubos: 10, dif: 0.03, par: 10, sem: 6 },
  { reto: "puntos", meta: 150,  cubos: 11, dif: 0.04, par: 9, sem: 8 },
  { reto: "puntos", meta: 165,  cubos: 11, dif: 0.05, par: 13, sem: 8 },
  { reto: "puntos", meta: 180,  cubos: 12, dif: 0.06, par: 13, sem: 1 },
  // —— Candados (11 a 20) ——
  { reto: "candados", cand: [1],       cubos: 9, dif: 0, par: 7, sesgo: -1, limpia: 40, sem: 7 },
  { reto: "puntos",   meta: 200,        cubos: 12, dif: 0.06, par: 13, sem: 10 },
  { reto: "candados", cand: [1, 1],    cubos: 9, dif: 0, par: 9, sesgo: -1, limpia: 40, sem: 10 },
  { reto: "puntos",   meta: 215,        cubos: 13, dif: 0.07, par: 15, sem: 5 },
  { reto: "candados", cand: [1, 1, 1], cubos: 10, dif: 0.02, par: 12, sesgo: -1, limpia: 40, sem: 11 },
  { reto: "candados", cand: [1, 1],       cubos: 11, dif: 0.04, par: 15, sesgo: 0, limpia: 30, sem: 3 },
  { reto: "puntos",   meta: 225,        cubos: 13, dif: 0.08, par: 15, sem: 3 },
  { reto: "candados", cand: [1, 1, 1],    cubos: 9, dif: 0.02, par: 13, sesgo: -1, limpia: 30, sem: 21 },
  { reto: "candados", cand: [1, 1, 1],       cubos: 9, dif: 0.03, par: 12, sesgo: -1, limpia: 30, sem: 9 },
  { reto: "candados", cand: [1, 1, 1, 1], cubos: 12, dif: 0.06, par: 15, sesgo: -1, limpia: 30, sem: 20 },
];
const memo = {};
// sem: variante del nivel (cambia el tablero inicial y las piezas de todas las rondas). Lo normal es no pasarla (se usa la del nivel);
// bot-bloques.mjs `buscar` prueba varias para encontrar la que sale de verdad pasable.
export function nivelFijo(n, sem) {
  if (!(n >= 1 && n <= NIVELES_FIJOS)) return null;
  const E = NIVELES[n - 1];
  if (sem === undefined) sem = E.sem || 0;
  const clave = n + ":" + sem;
  if (memo[clave]) return memo[clave];
  const rng = mulberry32(720000 + n * 7919 + sem * 15485863);
  const tab = tableroCon(E.cubos, rng);
  const L = { n, sem, nombre: "Nivel " + n, reto: E.reto, meta: E.meta || 0, cand: E.cand || [], par: E.par, dif: E.dif, candados: E.reto === "candados", tab, obj: null,
    limpia: E.limpia || 6, piso: E.piso || Math.max(5, E.cubos - 3), extra: E.extra || Math.max(2, Math.round(E.cubos / 3)) }; // si quedan menos cubos que «piso», aparecen más (ver rellenar)
  if (E.reto === "candados") { // los bloques con candado se eligen entre los cubos del tablero (siempre los mismos para todos)
    // Se prefieren cubos cuya fila y columna están poco llenas (así no se rompen «de casualidad» en la primera ronda) y en filas y columnas distintas.
    // «sesgo» del nivel: 1 = como se acaba de decir (por defecto), 0 = al azar, −1 = al revés (filas llenas: se rompen más fácil)
    const libres = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((tab[r] >> c) & 1) {
      let fr = 0, fc = 0;
      for (let i = 0; i < N; i++) { fr += (tab[r] >> i) & 1; fc += (tab[i] >> c) & 1; }
      libres.push({ r, c, p: (E.sesgo === undefined ? 1 : E.sesgo) * (fr + fc) + rng() * 3 });
    }
    libres.sort((a, b) => a.p - b.p);
    L.obj = Array(N).fill(0);
    const usadas = [];
    E.cand.forEach((k) => {
      let i = libres.findIndex((x) => !usadas.some((u) => u.r === x.r || u.c === x.c));
      if (i < 0) i = 0;
      const [x] = libres.splice(i, 1);
      usadas.push(x);
      fijarCapas(tab, x.r, x.c, k); L.obj[x.r] |= 1 << x.c;
    });
  }
  return (memo[clave] = L);
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
export function partidaNivel(n, sem) {
  const L = nivelFijo(n, sem), tab = L.tab.slice();
  return { m: "n", n, sem: L.sem, v: 2, tab, obj: L.obj ? L.obj.slice() : null, pz: generarRonda(tab, L.dif, rngRonda(n, 1, L.sem), L.limpia), pt: 0, ro: 1, env: 0, lin: 0 };
}

// Pasa a la ronda siguiente (cuando las 3 piezas ya se pusieron). Devuelve los candados nuevos [[fila, col]…] para avisarlos en pantalla.
export function avanzarRonda(S) {
  const nuevos = [];
  S.ro++;
  if (S.m === "n") { // niveles fijos: mismo azar para todos y sin candados
    const L = nivelFijo(S.n, S.sem), rnd = rngRonda(S.n, S.ro, L.sem);
    S.tab = rellenar(S.tab, rnd, 0, L.piso, L.extra);
    S.pz = generarRonda(S.tab, L.dif, rnd, L.limpia);
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
