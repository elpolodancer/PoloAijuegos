// Ruta: paperio/campeche.js
// ETAPA 3 de 32 del país (México): CAMPECHE. 100 niveles COMPLETOS y sus 10 BONOS (uno después de cada 10 niveles).
// Funciona igual que colima.js y bajacaliforniasur.js (mismo formato de niveles, mismos valores por categoría); cambian los mapas y el orden de dificultad.
//
// CATEGORÍA (1 a 5) de cada nivel: FIJA para siempre, escrita a mano en CATEGORIAS (una por nivel).
//   1 = muy fácil · 2 = fácil · 3 = media · 4 = difícil · 5 = muy difícil
// Reparto: 31 de categoría 1 · 26 de 2 · 19 de 3 · 12 de 4 · 12 de 5 (solo 12 niveles «muy difíciles»).
// El orden salió AL AZAR (semilla 3323) y se dejó fijo: lo fácil domina el inicio (los 8 primeros son muy fáciles),
// el primer 4 es el nivel 36, el primer 5 el 56 y el último nivel (100) es de categoría 5.
// Cada silueta se eligió para que su dificultad real (grosor de los caminos, huecos, bordes) vaya con su categoría.

import { cadena, espiral, rayos, poli, circulos, rejilla, panal, lunares, nube, constelacion, rama, estrellaN, copo,
  serpentina, pasillos, ciudad, rombo, islas2, anillo } from "./niveles-paperio.js";

const PI = Math.PI;

// Datos de la etapa (para el mapa de México)
export const ETAPA = { numero: 3, total: 32, id: "camp", nombre: "Campeche" };

export const NOMBRES_CATEGORIA = { 1: "Muy fácil", 2: "Fácil", 3: "Media", 4: "Difícil", 5: "Muy difícil" };

// Una categoría por nivel, de 10 en 10 (el primer renglón son los niveles 1 a 10, el segundo del 11 al 20, etc.)
export const CATEGORIAS = Object.freeze([
  1, 1, 1, 1, 1, 1, 1, 1, 2, 1, //   1 - 10
  1, 1, 2, 2, 2, 1, 1, 2, 1, 1, //  11 - 20
  1, 3, 2, 1, 1, 1, 2, 2, 2, 1, //  21 - 30
  3, 2, 2, 1, 2, 4, 1, 3, 2, 2, //  31 - 40
  1, 1, 1, 1, 4, 1, 1, 4, 1, 1, //  41 - 50
  1, 2, 3, 4, 2, 5, 4, 3, 2, 2, //  51 - 60
  2, 3, 4, 4, 2, 4, 2, 5, 3, 2, //  61 - 70
  5, 3, 2, 2, 4, 2, 5, 2, 3, 3, //  71 - 80
  3, 5, 4, 4, 3, 3, 3, 5, 3, 5, //  81 - 90
  3, 3, 4, 5, 5, 3, 5, 5, 3, 5, //  91 - 100
]);

// ----- Qué tan duros son los bots según la categoría: [valor al inicio de la categoría, valor al final] -----
// (los mismos valores que colima.js y bajacaliforniasur.js; dentro de la categoría se interpola según el lugar del nivel).
// Topes de la guía de niveles-paperio.js: veloz ≤ 0.1, giro ≤ 0.4, bots ≤ 7.
const PERFIL = {
  1: { bots: [3, 4], meta: [20, 24], dificultad: [0.35, 0.5], rasgos: {} },
  2: { bots: [4, 5], meta: [25, 28], dificultad: [0.5, 0.62], rasgos: { mordisco: [0.15, 0.3], venganza: [0.1, 0.2], acoso: [0.1, 0.2] } },
  3: { bots: [5, 6], meta: [28, 32], dificultad: [0.65, 0.78], rasgos: { mordisco: [0.4, 0.6], venganza: [0.3, 0.5], acoso: [0.3, 0.5], veloz: [0.02, 0.04], giro: [0.1, 0.15] } },
  4: { bots: [6, 7], meta: [33, 37], dificultad: [0.8, 0.9], rasgos: { mordisco: [0.7, 0.85], venganza: [0.6, 0.75], acoso: [0.6, 0.75], veloz: [0.05, 0.07], giro: [0.2, 0.28] } },
  5: { bots: [7, 7], meta: [38, 42], dificultad: [0.95, 1], rasgos: { mordisco: [0.95, 1], venganza: [0.9, 1], acoso: [0.9, 1], veloz: [0.08, 0.1], giro: [0.3, 0.4] } },
};
const mezcla = ([a, b], t) => a + (b - a) * t;
const r2 = (x) => Math.round(x * 100) / 100;

// Lugar de cada nivel dentro de su categoría (0 = el primero de esa categoría, 1 = el último)
const lugar = CATEGORIAS.map((c, i) => {
  const mismos = CATEGORIAS.map((x, j) => (x === c ? j : -1)).filter((j) => j >= 0);
  return mismos.length > 1 ? mismos.indexOf(i) / (mismos.length - 1) : 0;
});

function nivel(n, nombre, forma) {
  const c = CATEGORIAS[n - 1], p = PERFIL[c], t = lugar[n - 1], rasgos = {};
  for (const k in p.rasgos) rasgos[k] = r2(mezcla(p.rasgos[k], t));
  return { nombre, bots: Math.round(mezcla(p.bots, t)), meta: Math.round(mezcla(p.meta, t)), dificultad: r2(mezcla(p.dificultad, t)), rasgos, forma };
}

// ----- Los 100 niveles (municipios, zonas arqueológicas, murallas y fauna de Campeche) -----
const LISTA = [
  /*   1 */ ["Campeche", { bolas: [...Array(5).keys()].flatMap((q) => espiral(0.08, 0.82, 1.3, 0.1, q * 2 * PI / 5)) }],
  /*   2 */ ["Ciudad del Carmen", { bolas: [...Array(3).keys()].flatMap((q) => espiral(0.08, 0.82, 1.46, 0.09, q * 2 * PI / 3)) }],
  /*   3 */ ["Champotón", { bolas: nube(902, 14, 0.26, 0.37) }],
  /*   4 */ ["Escárcega", { bolas: espiral(0.1, 0.87, 2.79, 0.12) }],
  /*   5 */ ["Calkiní", { bolas: rombo(0.76, 0.12) }],
  /*   6 */ ["Hopelchén", { bolas: serpentina(8, 0.59, 0.09, 0.7) }],
  /*   7 */ ["Hecelchakán", { bolas: nube(641, 14, 0.21, 0.39) }],
  /*   8 */ ["Tenabo", { bolas: nube(816, 8, 0.29, 0.4) }],
  /*   9 */ ["Palizada", { bolas: [[0, 0, 0.95]], huecos: lunares(626, 6, 0.09, 0.13, 0.19) }],
  /*  10 */ ["Candelaria", { bolas: nube(493, 6, 0.27, 0.37) }],
  /*  11 */ ["Calakmul", { bolas: nube(461, 9, 0.23, 0.42) }],
  /*  12 */ ["Seybaplaya", { bolas: estrellaN(13, 0.89, 0.26, 0.12) }],
  /*  13 */ ["Dzitbalché", { polar: [0.65, [6, 0.14, 0], [12, 0.04, 0]] }],
  /*  14 */ ["Sabancuy", { polar: [0.65, [8, 0.11, 1.05]] }],
  /*  15 */ ["Isla Aguada", { bolas: [[0, 0, 0.92]], huecos: [[0.54, -0.12, 0.68]] }],
  /*  16 */ ["Isla del Carmen", { polar: [0.69, [3, 0.11, 0], [6, 0.05, 0]] }],
  /*  17 */ ["Isla Arena", { bolas: estrellaN(12, 0.85, 0.26, 0.12) }],
  /*  18 */ ["Punta Xen", { polar: [0.56, [10, 0.05, 1.05]] }],
  /*  19 */ ["Playa Bonfil", { bolas: nube(615, 5, 0.27, 0.36) }],
  /*  20 */ ["Playa Siho", { bolas: nube(629, 6, 0.29, 0.41) }],
  /*  21 */ ["Laguna de Términos", { polar: [0.76, [12, 0.08, 0]] }],
  /*  22 */ ["Bahía de Campeche", { polar: [0.66, [7, 0.27, 1.05]] }],
  /*  23 */ ["Los Petenes", { bolas: ciudad(4, 0.13) }],
  /*  24 */ ["Reserva Balam-Kú", { bolas: nube(963, 7, 0.26, 0.35) }],
  /*  25 */ ["Reserva Balam-Kin", { bolas: nube(487, 8, 0.25, 0.32) }],
  /*  26 */ ["Laguna de Atasta", { bolas: nube(556, 6, 0.19, 0.38) }],
  /*  27 */ ["Laguna Silvituc", { polar: [0.56, [3, 0.16, 0], [6, 0.07, 0]] }],
  /*  28 */ ["Río Candelaria", { bolas: poli([[-0.7, 0.7], [-0.7, 0.3], [-0.28, 0.3], [-0.27, -0.15], [0.26, -0.07], [0.26, -0.4], [0.7, -0.4], [0.7, -0.7]], 0.19) }],
  /*  29 */ ["Río Palizada", { bolas: [[0, 0, 0.95]], huecos: circulos(6, 0.61, 0.14, 0.15) }],
  /*  30 */ ["Río Champotón", { polar: [0.68, [11, 0.06, 1.57]] }],
  /*  31 */ ["Edzná", { bolas: ciudad(5, 0.1) }],
  /*  32 */ ["Becán", { bolas: [[0, 0, 0.89]], huecos: [[0.4, -0.12, 0.6]] }],
  /*  33 */ ["Xpujil", { polar: [0.58, [5, 0.08, 0], [10, 0.08, 0]] }],
  /*  34 */ ["Chicanná", { polar: [0.65, [4, 0.11, 0], [8, 0.06, 0]] }],
  /*  35 */ ["Hormiguero", { polar: [0.62, [4, 0.27, 0]] }],
  /*  36 */ ["Balamkú", { bolas: copo(4, 0.09) }],
  /*  37 */ ["Río Bec", { polar: [0.8, [12, 0.1, 1.05]] }],
  /*  38 */ ["Jaina", { polar: [0.55, [8, 0.09, 0], [16, 0.07, 0]] }],
  /*  39 */ ["Xtampak", { bolas: [[0, 0, 0.95]], huecos: rejilla(3, 0.37, 0.1, 0.88) }],
  /*  40 */ ["Pomuch", { bolas: [[0, 0, 0.95]], huecos: lunares(992, 10, 0.07, 0.12, 0.2) }],
  /*  41 */ ["Becal", { bolas: nube(656, 5, 0.24, 0.31) }],
  /*  42 */ ["Bolonchén", { bolas: estrellaN(7, 0.85, 0.26, 0.13) }],
  /*  43 */ ["Grutas de Xtacumbilxunaan", { polar: [0.54, [2, 0.23, 1.57]] }],
  /*  44 */ ["Baluarte de la Soledad", { bolas: nube(559, 10, 0.17, 0.28) }],
  /*  45 */ ["Baluarte de San Carlos", { bolas: [[0, 0, 0.95]], huecos: circulos(7, 0.63, 0.19, 0.18) }],
  /*  46 */ ["Baluarte de Santiago", { bolas: nube(593, 7, 0.23, 0.31) }],
  /*  47 */ ["Baluarte de San Francisco", { polar: [0.61, [3, 0.15, 0], [6, 0.08, 0]] }],
  /*  48 */ ["Baluarte de San Pedro", { bolas: [...circulos(8, 0.61, 0.18), ...anillo(0.62, 0.09)] }],
  /*  49 */ ["Baluarte de Santa Rosa", { bolas: rombo(0.71, 0.12), huecos: [[0, 0, 0.17]] }],
  /*  50 */ ["Baluarte de San Juan", { bolas: [[0, 0, 0.95]], huecos: lunares(778, 6, 0.1, 0.13, 0.16) }],
  /*  51 */ ["Fuerte de San Miguel", { polar: [0.65, [13, 0.06, 1.05]] }],
  /*  52 */ ["Fuerte de San José el Alto", { bolas: [[0, 0, 0.95]], huecos: circulos(7, 0.63, 0.13, 0.66) }],
  /*  53 */ ["Puerta de Mar", { bolas: [...rama(0, -0.88, 1.57, 0.3, 0.08, 5), [0, -0.88, 0.15]] }],
  /*  54 */ ["Puerta de Tierra", { bolas: [...rama(0, -0.88, 1.57, 0.38, 0.09, 3), [0, -0.88, 0.15]] }],
  /*  55 */ ["Malecón de Campeche", { bolas: [[0, 0, 0.24], ...rayos(16, 0.2, 0.79, 0.1)] }],
  /*  56 */ ["Catedral de Campeche", { bolas: espiral(0.1, 0.86, 1.71, 0.11) }],
  /*  57 */ ["Parque Principal", { bolas: constelacion(438, 8, 0.13, 0.11) }],
  /*  58 */ ["Casa Seis", { bolas: [[0, 0, 0.95]], huecos: lunares(693, 22, 0.09, 0.13, 0.18, 0.1, 0.84) }],
  /*  59 */ ["Mercado Pedro Sainz de Baranda", { bolas: [[0, 0, 0.25], ...rayos(12, 0.2, 0.82, 0.12)] }],
  /*  60 */ ["Barrio de San Román", { bolas: [...anillo(0.72, 0.11), ...rayos(9, 0, 0.72, 0.11), [0, 0, 0.2]] }],
  /*  61 */ ["Barrio de Guadalupe", { bolas: poli([[-0.7, 0.7], [-0.7, 0.39], [-0.25, 0.33], [-0.33, 0.02], [0.23, -0.08], [0.23, -0.4], [0.7, -0.4], [0.7, -0.7]], 0.17) }],
  /*  62 */ ["Barrio de San Francisco", { bolas: [[0, 0, 0.95]], huecos: lunares(892, 23, 0.1, 0.13, 0.17, 0.1, 0.84) }],
  /*  63 */ ["Barrio de Santa Ana", { bolas: [...circulos(8, 0.68, 0.18), ...anillo(0.62, 0.09)] }],
  /*  64 */ ["Barrio de Santa Lucía", { bolas: copo(7, 0.08) }],
  /*  65 */ ["Jaguar", { polar: [0.59, [11, 0.1, 1.05]] }],
  /*  66 */ ["Tucán", { bolas: constelacion(906, 4, 0.13, 0.1) }],
  /*  67 */ ["Pavo ocelado", { bolas: [...anillo(0.72, 0.1), ...rayos(11, 0, 0.72, 0.1), [0, 0, 0.2]] }],
  /*  68 */ ["Manatí", { bolas: serpentina(4, 0.58, 0.11, 0.71) }],
  /*  69 */ ["Flamenco", { bolas: [...cadena(-0.44, -0.8, -0.44, 0.8, 0.13), ...cadena(0.44, -0.8, 0.44, 0.8, 0.13), ...[-0.5, 0, 0.5].flatMap((y) => cadena(-0.44, y, 0.44, y, 0.13))] }],
  /*  70 */ ["Cocodrilo de pantano", { bolas: estrellaN(6, 0.83, 0.2, 0.08) }],
  /*  71 */ ["Tortuga carey", { bolas: [[0, 0, 0.95]], huecos: espiral(0.12, 0.85, 1.62, 0.1) }],
  /*  72 */ ["Mono aullador", { bolas: copo(9, 0.08) }],
  /*  73 */ ["Tapir", { bolas: [...cadena(-0.37, -0.8, -0.37, 0.8, 0.16), ...cadena(0.37, -0.8, 0.37, 0.8, 0.15), ...[-0.5, 0, 0.5].flatMap((y) => cadena(-0.37, y, 0.37, y, 0.12))] }],
  /*  74 */ ["Venado cola blanca", { bolas: estrellaN(13, 0.82, 0.17, 0.07) }],
  /*  75 */ ["Camarón", { bolas: [[0, 0, 0.95]], huecos: espiral(0.12, 0.85, 1.48, 0.1) }],
  /*  76 */ ["Pulpo", { polar: [0.57, [12, 0.1, 1.57]] }],
  /*  77 */ ["Mangle", { bolas: [...anillo(0.72, 0.08), ...rayos(10, 0, 0.72, 0.08), [0, 0, 0.2]] }],
  /*  78 */ ["Ceiba", { bolas: estrellaN(7, 0.83, 0.18, 0.08) }],
  /*  79 */ ["Chicozapote", { bolas: [...cadena(-0.52, -0.8, -0.52, 0.8, 0.14), ...cadena(0.52, -0.8, 0.52, 0.8, 0.16), ...[-0.5].flatMap((y) => cadena(-0.52, y, 0.52, y, 0.12))] }],
  /*  80 */ ["Palo de tinte", { polar: [0.71, [20, 0.07, 0]], huecos: [[0, 0, 0.27]] }],
  /*  81 */ ["Henequén", { bolas: [...circulos(7, 0.58, 0.21), ...anillo(0.62, 0.08)] }],
  /*  82 */ ["Jipijapa", { bolas: constelacion(792, 8, 0.13, 0.09) }],
  /*  83 */ ["Pan de cazón", { bolas: constelacion(554, 8, 0.17, 0.09) }],
  /*  84 */ ["Camarones al coco", (() => { const p = [[0, 0], ...circulos(5, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.2, 0.08, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  85 */ ["Pirata", { polar: [0.74, [24, 0.07, 0]], huecos: [[0, 0, 0.28]] }],
  /*  86 */ ["Galeón", { bolas: [...cadena(-0.52, -0.8, -0.52, 0.8, 0.12), ...cadena(0.52, -0.8, 0.52, 0.8, 0.12), ...[-0.5, 0, 0.5].flatMap((y) => cadena(-0.52, y, 0.52, y, 0.13))] }],
  /*  87 */ ["Muralla", { bolas: constelacion(872, 5, 0.12, 0.13) }],
  /*  88 */ ["Selva Maya", { bolas: espiral(0.1, 0.79, 2.86, 0.09) }],
  /*  89 */ ["Región Chenes", { bolas: [[0, 0, 0.95]], huecos: panal(0.39, 0.11) }],
  /*  90 */ ["Camino Real", { bolas: [...anillo(0.66, 0.07), ...anillo(0.88, 0.07), ...rayos(7, 0, 0.9, 0.07)] }],
  /*  91 */ ["Zoh Laguna", { bolas: [[0, 0, 0.95]], huecos: lunares(618, 17, 0.08, 0.12, 0.16, 0.1, 0.84) }],
  /*  92 */ ["Lerma", { bolas: [[0, 0, 0.95]], huecos: lunares(939, 20, 0.09, 0.12, 0.16, 0.1, 0.84) }],
  /*  93 */ ["Chiná", { bolas: constelacion(368, 7, 0.18, 0.08) }],
  /*  94 */ ["Hampolol", { bolas: [...Array(2).keys()].flatMap((q) => espiral(0.08, 0.82, 1.28, 0.09, q * 2 * PI / 2)) }],
  /*  95 */ ["Uayamón", { bolas: serpentina(5, 0.6, 0.09, 0.67) }],
  /*  96 */ ["Reserva de Calakmul", (() => { const p = [[0, 0], ...circulos(7, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.19, 0.1, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  97 */ ["Mar de Campeche", { bolas: constelacion(564, 11, 0.13, 0.07) }],
  /*  98 */ ["Golfo de México", { bolas: [...circulos(3, 0.58, 0.2), ...anillo(0.62, 0.06)] }],
  /*  99 */ ["Península de Yucatán", { bolas: [[0, 0, 0.95]], huecos: lunares(998, 25, 0.07, 0.09, 0.14, 0.1, 0.84) }],
  /* 100 */ ["Gran Pirámide de Calakmul", { bolas: [...circulos(3, 0.64, 0.18), ...anillo(0.62, 0.06)] }],
];

export const NIVELES_CAMPECHE = LISTA.map(([nombre, forma], i) => ({ ...nivel(i + 1, nombre, forma), n: i + 1, categoria: CATEGORIAS[i], listo: true }));

// ----- Bonos -----
// Después de cada 10 niveles hay un nivel aparte (no cuenta dentro de los 100): un bono de monedas.
// No hay bots ni estela: solo monedas para recoger durante «duracion» segundos. Cada moneda recogida desaparece y vuelve a
// aparecer en el mismo lugar «reaparece» segundos después. Cada moneda vale «valor» 🪙 (las de la tienda).
// Los 10 bonos usan los mismos valores (BASE_BONO). Para cambiar uno solo, ponlo en DATOS_BONO por su número (1 a 10), por ejemplo:
//   3: { cantidad: 90, valor: 2 },
const BASE_BONO = {
  duracion: 60,     // segundos que dura el bono
  reaparece: 10,    // segundos que tarda una moneda en volver a aparecer
  cantidad: 60,     // monedas que hay a la vez en el mapa
  valor: 1,         // 🪙 que da cada moneda
  bots: 0,          // sin bots
  meta: Infinity,   // no se gana por territorio: termina cuando se acaba el tiempo
  forma: { bolas: [[0, 0, 0.9]] },
};
const DATOS_BONO = {};
const NOMBRES_BONO = ["Chicle", "Camarones", "Palo de tinte", "Jipijapa", "Pan de cazón", "Tortugas carey", "Ceiba dorada", "Tesoro pirata", "Jade maya", "Oro de Calakmul"];

export const BONOS = Array.from({ length: 10 }, (_, i) => ({
  ...BASE_BONO, ...(DATOS_BONO[i + 1] || {}),
  n: i + 1, despuesDe: (i + 1) * 10, nombre: "Bono " + (i + 1) + " · " + NOMBRES_BONO[i],
}));
