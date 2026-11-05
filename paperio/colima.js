// Ruta: paperio/colima.js
// ETAPA 1 de 32 del país (México): COLIMA. 100 niveles COMPLETOS y sus 10 BONOS (uno después de cada 10 niveles).
//
// CATEGORÍA (1 a 5) de cada nivel: FIJA para siempre, escrita a mano en CATEGORIAS (una por nivel).
//   1 = muy fácil · 2 = fácil · 3 = media · 4 = difícil · 5 = muy difícil
// Reparto: 30 de categoría 1 · 25 de 2 · 20 de 3 · 13 de 4 · 12 de 5 (igual que michoacan.js).
// Como es la PRIMERA etapa, arranca suave: niveles 1-10 con ocho de categoría 1, el primer 4 es el nivel 37,
// el primer 5 el nivel 50 y el último nivel (100) es de categoría 5.
//
// Cada nivel lleva su nombre (lugares, playas, municipios y cosas típicas de Colima), su silueta («forma»)
// y sus bots / meta / dificultad / rasgos, que salen de la categoría (ver PERFIL): dentro de una misma categoría
// los niveles más avanzados son un poquito más duros que los primeros.
// Formato de cada nivel: el mismo de niveles.js → { nombre, bots, meta, dificultad, rasgos, forma }.

import { cadena, espiral, rayos, poli, circulos, rejilla, panal, lunares, nube, constelacion, rama, estrellaN, copo,
  serpentina, pasillos, ciudad, rombo, islas2, anillo } from "./niveles.js";

const PI = Math.PI;

// Datos de la etapa (para el mapa de México)
export const ETAPA = { numero: 1, total: 32, id: "col", nombre: "Colima" };

export const NOMBRES_CATEGORIA = { 1: "Muy fácil", 2: "Fácil", 3: "Media", 4: "Difícil", 5: "Muy difícil" };

// Una categoría por nivel, de 10 en 10 (el primer renglón son los niveles 1 a 10, el segundo del 11 al 20, etc.)
export const CATEGORIAS = Object.freeze([
  1, 1, 1, 1, 1, 1, 2, 1, 1, 2, //   1 - 10
  1, 1, 2, 1, 1, 2, 1, 2, 3, 1, //  11 - 20
  2, 1, 2, 1, 3, 1, 2, 1, 3, 2, //  21 - 30
  1, 2, 3, 1, 2, 1, 4, 2, 1, 3, //  31 - 40
  2, 1, 3, 2, 1, 3, 4, 1, 2, 5, //  41 - 50
  4, 3, 2, 4, 1, 2, 3, 5, 4, 2, //  51 - 60
  3, 1, 2, 5, 1, 3, 2, 4, 3, 5, //  61 - 70
  2, 3, 3, 4, 2, 5, 3, 5, 4, 5, //  71 - 80
  3, 4, 2, 1, 5, 3, 4, 2, 5, 4, //  81 - 90
  3, 2, 4, 5, 3, 1, 5, 4, 3, 5, //  91 - 100
]);

// ----- Qué tan duros son los bots según la categoría: [valor al inicio de la categoría, valor al final] -----
// (dentro de la categoría se interpola según el lugar del nivel). Topes de la guía de niveles.js: veloz ≤ 0.1, giro ≤ 0.4, bots ≤ 7.
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

// ----- Piezas propias de Colima -----
// Cono (el volcán): filas de gotas que se ensanchan hacia la base
function triangulo(alto, base, r) {
  const l = [];
  for (let y = -alto; y <= alto + 1e-6; y += r) { const h = ((y + alto) / (2 * alto)) * base; l.push(...cadena(-h, y, h, y, r)); }
  return l;
}
const onda = (amp, r, largo = 0.8, k = 3.6) => { const l = []; for (let i = 0; i <= 24; i++) { const x = -largo + i * (2 * largo / 24); l.push([x, amp * Math.sin(x * k), r]); } return l; };
const hueso = [...cadena(-0.55, 0, 0.55, 0, 0.2), [-0.64, -0.24, 0.22], [-0.64, 0.24, 0.22], [0.64, -0.24, 0.22], [0.64, 0.24, 0.22]];
const zigzag = [...poli([[-0.6, -0.6], [0.6, -0.6], [0.6, 0], [-0.6, 0], [-0.6, 0.6], [0.6, 0.6]], 0.15)];
const cruz = (largo, r) => [...cadena(-largo, 0, largo, 0, r), ...cadena(0, -largo, 0, largo, r), [0, 0, r * 1.7]];
const ocho = { bolas: [[-0.45, 0, 0.5], [0.45, 0, 0.5]], huecos: [[-0.45, 0, 0.2], [0.45, 0, 0.2]] };
const peine = [...cadena(-0.7, -0.7, -0.7, 0.7, 0.13), ...[-0.5, -0.17, 0.17, 0.5].flatMap((y) => cadena(-0.7, y, 0.7, y, 0.1))];
const corazon = [[-0.32, -0.22, 0.44], [0.32, -0.22, 0.44], [0, 0.1, 0.42], [0, 0.35, 0.3], [0, 0.55, 0.18]];
const relojArena = [[0, -0.55, 0.42], [0, 0.55, 0.42], ...cadena(0, -0.3, 0, 0.3, 0.14)];
const mancuerna = [[-0.55, 0, 0.4], [0.55, 0, 0.4], ...cadena(-0.4, 0, 0.4, 0, 0.12)];
const ye = [...cadena(-0.6, -0.7, 0, 0, 0.17), ...cadena(0.6, -0.7, 0, 0, 0.17), ...cadena(0, 0, 0, 0.85, 0.17)];
const gordo = (...b) => ({ bolas: b });
const enRueda = (k, rayosN, r = 0.1) => [...anillo(0.72, r), ...rayos(rayosN, 0, 0.72, r), [0, 0, 0.2]];
const telarana = (anillos, rayosN, r) => [...anillos.flatMap((R) => anillo(R, r)), ...rayos(rayosN, 0, Math.max(...anillos) + 0.02, r)];
const satelites = (n, r = 0.2) => { const p = [[0, 0], ...circulos(n, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, r, 0.08, p.slice(1).map((_, i) => [0, i + 1])) }; };

// ----- Los 100 niveles -----
const LISTA = [
  /*   1 */ ["Colima",                       { polar: [0.84, [4, 0.06, 0]] }],
  /*   2 */ ["Villa de Álvarez",             gordo([-0.5, 0, 0.42], [0.5, 0, 0.42], [0, 0, 0.28])],
  /*   3 */ ["Comala",                       { polar: [0.68, [5, 0.22, 0]] }],
  /*   4 */ ["Cuauhtémoc",                   gordo([-0.4, 0.25, 0.42], [0.4, 0.25, 0.42], [0, -0.35, 0.42])],
  /*   5 */ ["Coquimatlán",                  { bolas: [[0, 0, 0.92]], huecos: [[0.6, 0, 0.55]] }],
  /*   6 */ ["Laguna de La María",           { bolas: [[0, 0, 0.94]], huecos: [[0, 0, 0.3]] }],
  /*   7 */ ["Volcán de Fuego",              { bolas: triangulo(0.8, 0.75, 0.13) }],
  /*   8 */ ["Playa Miramar",                { polar: [0.8, [2, 0.12, 0]] }],
  /*   9 */ ["Cerro Grande",                 { polar: [0.78, [3, 0.1, PI / 2]] }],
  /*  10 */ ["Nevado de Colima",             gordo([-0.42, 0.3, 0.4], [0.42, 0.3, 0.4], [0, 0.35, 0.4], [-0.22, -0.1, 0.32], [0.25, -0.2, 0.32], [0.05, -0.5, 0.22])],
  /*  11 */ ["Ixtlahuacán",                  { polar: [0.7, [6, 0.12, 0]] }],
  /*  12 */ ["Minatitlán",                   { polar: [0.74, [3, 0.14, 0]] }],
  /*  13 */ ["Río Armería",                  gordo([0, -0.5, 0.4], [0, 0.5, 0.4], [0, 0, 0.27])],
  /*  14 */ ["Playa Las Hadas",              { bolas: [[0, 0, 0.9]], huecos: [[0.5, 0.1, 0.62]] }],
  /*  15 */ ["Cuyutlán",                     gordo([-0.5, 0, 0.38], [0, 0, 0.42], [0.5, 0, 0.38])],
  /*  16 */ ["Río Coahuayana",               { bolas: onda(0.4, 0.22) }],
  /*  17 */ ["Boca de Pascuales",            { polar: [0.72, [7, 0.08, 0]] }],
  /*  18 */ ["Tecomán",                      { polar: [0.66, [4, 0.2, 0]] }],
  /*  19 */ ["Laguna de Cuyutlán",           { bolas: anillo(0.66, 0.15) }],
  /*  20 */ ["El Chanal",                    { polar: [0.76, [2, 0.1, PI / 2], [4, 0.05, 0]] }],
  /*  21 */ ["Hacienda de Nogueras",         { bolas: cruz(0.8, 0.22) }],
  /*  22 */ ["Piedra Lisa",                  { polar: [0.8, [5, 0.05, 0]] }],
  /*  23 */ ["Las Salinas",                  { bolas: [[0, 0, 0.95]], huecos: rejilla(2, 0.5, 0.15) }],
  /*  24 */ ["Peñitas",                      { bolas: [[0, 0, 0.9]], huecos: [[0, 0, 0.18]] }],
  /*  25 */ ["Suchitlán",                    { polar: [0.66, [8, 0.2, 0]] }],
  /*  26 */ ["Zacualpan",                    { bolas: nube(260, 6, 0.3, 0.4) }],
  /*  27 */ ["Alcuzahue",                    { bolas: poli([[-0.7, 0.7], [-0.7, 0.35], [-0.35, 0.35], [-0.35, 0], [0, 0], [0, -0.35], [0.35, -0.35], [0.35, -0.7], [0.7, -0.7]], 0.18) }],
  /*  28 */ ["La Campana",                   gordo([0, 0.3, 0.5], [0, -0.05, 0.4], [0, -0.35, 0.26])],
  /*  29 */ ["Cerro de Ortega",              { bolas: estrellaN(5, 0.85, 0.22, 0.1) }],
  /*  30 */ ["Hacienda de San Antonio",      { bolas: islas2([[-0.6, 0], [0, 0], [0.6, 0]], 0.27, 0.1, [[0, 1], [1, 2]]) }],
  /*  31 */ ["Playa Cuyutlán",               { polar: [0.72, [2, 0.18, PI / 2]] }],
  /*  32 */ ["Caleras",                      { bolas: [[0, 0, 0.95]], huecos: circulos(3, 0.5, 0.17, PI / 2) }],
  /*  33 */ ["Paticajo",                     { bolas: enRueda(0, 6) }],
  /*  34 */ ["Tepames",                      { polar: [0.8, [6, 0.07, 0]] }],
  /*  35 */ ["Piscila",                      gordo([-0.4, -0.4, 0.4], [0.4, 0.4, 0.4], [0, 0, 0.28])],
  /*  36 */ ["Estapilla",                    gordo([0.5, 0, 0.36], [-0.5, 0, 0.36], [0, 0.5, 0.36], [0, -0.5, 0.36], [0, 0, 0.2])],
  /*  37 */ ["Campos",                       { bolas: serpentina(6, 0.55, 0.09, 0.7) }],
  /*  38 */ ["Chiapa",                       { bolas: hueso }],
  /*  39 */ ["Cerro del Huilote",            { polar: [0.82, [3, 0.08, PI]] }],
  /*  40 */ ["Callejones",                   { bolas: peine }],
  /*  41 */ ["Palo Alto",                    { bolas: rombo(0.8, 0.13) }],
  /*  42 */ ["Jalipa",                       gordo([-0.3, 0, 0.55], [0.35, 0, 0.5], [0.1, -0.35, 0.35])],
  /*  43 */ ["Tecolapa",                     { bolas: espiral(0.1, 0.8, 2.3, 0.12) }],
  /*  44 */ ["Madrid",                       ocho],
  /*  45 */ ["Los Ortices",                  { polar: [0.78, [4, 0.1, PI / 4]] }],
  /*  46 */ ["El Real",                      { bolas: estrellaN(7, 0.85, 0.2, 0.09) }],
  /*  47 */ ["Laguna de Alcuzahue",          { bolas: [...circulos(5, 0.6, 0.2), ...anillo(0.6, 0.07)] }],
  /*  48 */ ["Tamala",                       { bolas: corazon }],
  /*  49 */ ["Quesería",                     { bolas: [[0, 0, 0.95]], huecos: lunares(49, 6, 0.08, 0.12, 0.2) }],
  /*  50 */ ["Isla Socorro",                 { bolas: constelacion(50, 9, 0.14, 0.065) }],
  /*  51 */ ["Volcancito",                   { bolas: [0, 1, 2].flatMap((q) => espiral(0.08, 0.82, 1.4, 0.09, q * 2 * PI / 3)) }],
  /*  52 */ ["Pez vela",                     { bolas: islas2([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]], 0.22, 0.09, [[0, 4], [1, 4], [2, 4], [3, 4]]) }],
  /*  53 */ ["Playa La Boquita",             { bolas: [[0, 0, 0.9]], huecos: [[-0.5, 0.1, 0.55]] }],
  /*  54 */ ["Palmera",                      { bolas: [...rama(0, 0.88, -PI / 2, 0.34, 0.07, 4), [0, 0.88, 0.14]] }],
  /*  55 */ ["Limón",                        gordo([-0.35, 0, 0.45], [0.35, 0, 0.45], [0, 0, 0.42], [-0.75, 0, 0.16], [0.75, 0, 0.16])],
  /*  56 */ ["Cocotero",                     { polar: [0.6, [6, 0.22, 0]] }],
  /*  57 */ ["Tamarindo",                    { bolas: [[0, 0, 0.95]], huecos: panal(0.42, 0.1) }],
  /*  58 */ ["Cenizas del Volcán",           { bolas: telarana([0.22, 0.44, 0.66, 0.88], 8, 0.075) }],
  /*  59 */ ["Playa San Pedrito",            { bolas: [...circulos(6, 0.65, 0.2), ...anillo(0.65, 0.07)] }],
  /*  60 */ ["Laguna de las Garzas",         { bolas: [[0, 0, 0.95]], huecos: [[0, 0, 0.42]] }],
  /*  61 */ ["Playa Salagua",                satelites(3)],
  /*  62 */ ["Playa Santiago",               { polar: [0.74, [2, 0.16, PI / 3]] }],
  /*  63 */ ["Playa Olas Altas",             { polar: [0.7, [9, 0.1, 0]] }],
  /*  64 */ ["Playa La Audiencia",           { bolas: [[0, 0, 0.95]], huecos: lunares(64, 20, 0.05, 0.1, 0.16, 0.1, 0.84) }],
  /*  65 */ ["Perro itzcuintle",             gordo([-0.35, 0.1, 0.4], [0.2, 0.15, 0.4], [0.5, -0.3, 0.26], [-0.1, -0.35, 0.22])],
  /*  66 */ ["Garza",                        { bolas: ye }],
  /*  67 */ ["Mango",                        gordo([0, 0.1, 0.55], [0.1, -0.25, 0.4], [0.25, -0.5, 0.2])],
  /*  68 */ ["Pitaya",                       { bolas: estrellaN(9, 0.86, 0.17, 0.08) }],
  /*  69 */ ["Iguana",                       { bolas: serpentina(4, 0.55, 0.12) }],
  /*  70 */ ["Manta raya",                   { bolas: copo(8, 0.07) }],
  /*  71 */ ["Café de Comala",               { polar: [0.6, [5, 0.15, 0], [10, 0.08, 0]] }],
  /*  72 */ ["Sopitos",                      { bolas: mancuerna }],
  /*  73 */ ["Tuba de coco",                 { bolas: relojArena }],
  /*  74 */ ["Salinera",                     { bolas: ciudad(3, 0.09) }],
  /*  75 */ ["Ponche",                       { bolas: rombo(0.8, 0.1), huecos: [[0, 0, 0.2]] }],
  /*  76 */ ["Laberinto de Caleras",         { bolas: [[0, 0, 0.95]], huecos: pasillos(4, 0.06, 0.45, 0.5) }],
  /*  77 */ ["Hélice del viento",            { polar: [0.42, [3, 0.4, 0]] }],
  /*  78 */ ["Bahía de Manzanillo",          { bolas: [[0, 0, 0.95]], huecos: circulos(10, 0.98, 0.2) }],
  /*  79 */ ["Cangrejo",                     { bolas: [[0, 0, 0.3], ...rayos(8, 0.2, 0.82, 0.12)] }],
  /*  80 */ ["Sierra de Manantlán",          { polar: [0.7, [24, 0.07, 0]] }],
  /*  81 */ ["Limonar",                      { bolas: [[0, 0, 0.95]], huecos: lunares(81, 18, 0.06, 0.1, 0.16, 0.1, 0.82) }],
  /*  82 */ ["Archipiélago de Revillagigedo", { bolas: islas2([[-0.5, -0.5], [0, -0.5], [0.5, -0.5], [-0.5, 0], [0, 0], [0.5, 0], [-0.5, 0.5], [0, 0.5], [0.5, 0.5]], 0.17, 0.07, [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]]) }],
  /*  83 */ ["Boca de Apiza",                { polar: [0.64, [7, 0.16, 0]] }],
  /*  84 */ ["Playa Las Brisas",             { bolas: [[0, 0, 0.9]], huecos: [[0, 0.6, 0.28]] }],
  /*  85 */ ["Erupción de 1913",             { bolas: estrellaN(11, 0.88, 0.15, 0.07) }],
  /*  86 */ ["Río Salado",                   { bolas: zigzag }],
  /*  87 */ ["Camino a Zacualpan",           { bolas: [[0, 0, 0.95]], huecos: espiral(0.12, 0.85, 1.2, 0.1) }],
  /*  88 */ ["Tinajas",                      { bolas: [[0, 0, 0.95]], huecos: circulos(4, 0.55, 0.17, PI / 4) }],
  /*  89 */ ["Cráter del Volcán",            { bolas: [[0, 0, 0.95]], huecos: [...circulos(8, 0.7, 0.1), ...circulos(4, 0.35, 0.1, PI / 4), [0, 0, 0.12]] }],
  /*  90 */ ["Tabachín",                     { bolas: [...rama(0, 0.88, -PI / 2, 0.38, 0.08, 4), [0, 0.88, 0.14]] }],
  /*  91 */ ["La Capacha",                   { bolas: telarana([0.3, 0.62], 8, 0.08) }],
  /*  92 */ ["Alcaraces",                    { bolas: estrellaN(5, 0.84, 0.27, 0.13) }],
  /*  93 */ ["Río Colima",                   { bolas: serpentina(7, 0.58, 0.09, 0.7) }],
  /*  94 */ ["Cielo de Colima",              { bolas: constelacion(5, 10, 0.13, 0.07) }],
  /*  95 */ ["Palapa",                       satelites(6, 0.2)],
  /*  96 */ ["Jardín Libertad",              { polar: [0.8, [6, 0.06, 0]] }],
  /*  97 */ ["Campo de lava",                { bolas: [[0, 0, 0.95]], huecos: rejilla(5, 0.32, 0.1, 0.88) }],
  /*  98 */ ["Rayos del Volcán",             { polar: [0.55, [8, 0.3, 0]] }],
  /*  99 */ ["Catedral de Colima",           { bolas: [[0, -0.5, 0.4], [0, 0.5, 0.4], ...cadena(0, -0.3, 0, 0.3, 0.12), ...cadena(-0.5, 0, 0.5, 0, 0.12)] }],
  /* 100 */ ["Cumbre del Volcán",            { bolas: [[0, 0, 0.95]], huecos: lunares(100, 22, 0.06, 0.12, 0.17, 0.1, 0.84) }],
];

export const NIVELES_COLIMA = LISTA.map(([nombre, forma], i) => ({ ...nivel(i + 1, nombre, forma), n: i + 1, categoria: CATEGORIAS[i], listo: true }));

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
const NOMBRES_BONO = ["Limones", "Cocos", "Mangos", "Sal de Cuyutlán", "Café de Comala", "Perlas de Manzanillo", "Pitayas", "Tamarindos", "Ceniza dorada", "Tesoro del Volcán"];

export const BONOS = Array.from({ length: 10 }, (_, i) => ({
  ...BASE_BONO, ...(DATOS_BONO[i + 1] || {}),
  n: i + 1, despuesDe: (i + 1) * 10, nombre: "Bono " + (i + 1) + " · " + NOMBRES_BONO[i],
}));
