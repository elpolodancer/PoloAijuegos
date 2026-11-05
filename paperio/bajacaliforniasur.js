// Ruta: paperio/bajacaliforniasur.js
// ETAPA 2 de 32 del país (México): BAJA CALIFORNIA SUR. 100 niveles COMPLETOS y sus 10 BONOS (uno después de cada 10 niveles).
// Funciona igual que colima.js (mismo formato de niveles, mismos valores por categoría); cambian los mapas y el orden de dificultad.
//
// CATEGORÍA (1 a 5) de cada nivel: FIJA para siempre, escrita a mano en CATEGORIAS (una por nivel).
//   1 = muy fácil · 2 = fácil · 3 = media · 4 = difícil · 5 = muy difícil
// Reparto: 32 de categoría 1 · 26 de 2 · 18 de 3 · 12 de 4 · 12 de 5 (solo 12 niveles «muy difíciles»).
// El orden salió AL AZAR (semilla 798) y se dejó fijo: lo fácil domina el inicio (los 10 primeros son todos muy fáciles),
// el primer 4 es el nivel 36, el primer 5 el 49 y el último nivel (100) es de categoría 5.
// Cada silueta se eligió para que su dificultad real (grosor de los caminos, huecos, bordes) vaya con su categoría.

import { cadena, espiral, rayos, poli, circulos, rejilla, panal, lunares, nube, constelacion, rama, estrellaN, copo,
  serpentina, pasillos, ciudad, rombo, islas2, anillo } from "./niveles-paperio.js";

const PI = Math.PI;

// Datos de la etapa (para el mapa de México)
export const ETAPA = { numero: 2, total: 32, id: "bcs", nombre: "Baja California Sur" };

export const NOMBRES_CATEGORIA = { 1: "Muy fácil", 2: "Fácil", 3: "Media", 4: "Difícil", 5: "Muy difícil" };

// Una categoría por nivel, de 10 en 10 (el primer renglón son los niveles 1 a 10, el segundo del 11 al 20, etc.)
export const CATEGORIAS = Object.freeze([
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, //   1 - 10
  2, 1, 1, 1, 1, 1, 2, 1, 2, 1, //  11 - 20
  1, 2, 1, 1, 2, 2, 1, 2, 2, 2, //  21 - 30
  1, 3, 1, 1, 1, 4, 1, 1, 3, 2, //  31 - 40
  3, 1, 1, 4, 1, 2, 4, 2, 5, 1, //  41 - 50
  3, 2, 1, 2, 3, 3, 3, 5, 4, 2, //  51 - 60
  3, 4, 4, 3, 3, 3, 2, 5, 3, 3, //  61 - 70
  2, 5, 3, 2, 2, 4, 2, 5, 3, 5, //  71 - 80
  2, 4, 5, 3, 2, 5, 2, 4, 3, 5, //  81 - 90
  2, 2, 5, 4, 3, 4, 2, 4, 5, 5, //  91 - 100
]);

// ----- Qué tan duros son los bots según la categoría: [valor al inicio de la categoría, valor al final] -----
// (los mismos valores que colima.js; dentro de la categoría se interpola según el lugar del nivel).
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

// ----- Los 100 niveles (lugares, islas, playas, fauna y plantas de Baja California Sur) -----
const LISTA = [
  /*   1 */ ["La Paz", { bolas: [...Array(5).keys()].flatMap((q) => espiral(0.08, 0.82, 1.41, 0.1, q * 2 * PI / 5)) }],
  /*   2 */ ["Los Cabos", { bolas: [...Array(3).keys()].flatMap((q) => espiral(0.08, 0.82, 1.4, 0.09, q * 2 * PI / 3)) }],
  /*   3 */ ["Comondú", { bolas: espiral(0.1, 0.86, 3.21, 0.11) }],
  /*   4 */ ["Loreto", { bolas: espiral(0.1, 0.8, 3.26, 0.1) }],
  /*   5 */ ["Mulegé", { bolas: serpentina(8, 0.59, 0.1, 0.62) }],
  /*   6 */ ["Cabo San Lucas", { polar: [0.73, [5, 0.09, 1.57]] }],
  /*   7 */ ["San José del Cabo", { bolas: [[0, 0, 0.95]], huecos: lunares(672, 5, 0.05, 0.07, 0.2) }],
  /*   8 */ ["Todos Santos", { bolas: nube(675, 9, 0.25, 0.35) }],
  /*   9 */ ["El Arco", { bolas: [[0, 0, 0.95]], huecos: [[0, 0, 0.34]] }],
  /*  10 */ ["Playa del Amor", { bolas: nube(480, 8, 0.26, 0.35) }],
  /*  11 */ ["Playa Balandra", { bolas: [[0, 0, 0.95]], huecos: [[0.37, -0.12, 0.54]] }],
  /*  12 */ ["Isla Espíritu Santo", { bolas: rombo(0.81, 0.12), huecos: [[0, 0, 0.16]] }],
  /*  13 */ ["Cabo Pulmo", { bolas: nube(510, 9, 0.18, 0.26) }],
  /*  14 */ ["Bahía Magdalena", { bolas: nube(869, 14, 0.19, 0.37) }],
  /*  15 */ ["Bahía Concepción", { bolas: nube(442, 12, 0.17, 0.3) }],
  /*  16 */ ["Santa Rosalía", { bolas: estrellaN(6, 0.88, 0.29, 0.13) }],
  /*  17 */ ["Guerrero Negro", { polar: [0.58, [4, 0.22, 1.57]] }],
  /*  18 */ ["Laguna Ojo de Liebre", { bolas: nube(518, 13, 0.17, 0.25) }],
  /*  19 */ ["Laguna San Ignacio", { polar: [0.66, [8, 0.1, 0], [16, 0.06, 0]] }],
  /*  20 */ ["Sierra de la Laguna", { bolas: nube(696, 7, 0.25, 0.33) }],
  /*  21 */ ["Sierra de San Francisco", { polar: [0.6, [3, 0.09, 0], [6, 0.06, 0]] }],
  /*  22 */ ["San Ignacio", { bolas: estrellaN(11, 0.85, 0.21, 0.08) }],
  /*  23 */ ["Ciudad Constitución", { polar: [0.69, [6, 0.12, 0], [12, 0.05, 0]] }],
  /*  24 */ ["Ciudad Insurgentes", { polar: [0.69, [9, 0.1, 1.57]] }],
  /*  25 */ ["Santiago", { polar: [0.56, [4, 0.21, 1.05]] }],
  /*  26 */ ["Miraflores", { polar: [0.6, [6, 0.13, 0], [12, 0.07, 0]] }],
  /*  27 */ ["El Triunfo", { bolas: estrellaN(5, 0.83, 0.28, 0.12) }],
  /*  28 */ ["San Antonio", { bolas: poli([[-0.7, 0.7], [-0.7, 0.38], [-0.25, 0.37], [-0.33, -0.09], [0.29, 0.02], [0.26, -0.4], [0.7, -0.4], [0.7, -0.7]], 0.17) }],
  /*  29 */ ["Los Barriles", { polar: [0.74, [10, 0.08, 0]], huecos: [[0, 0, 0.29]] }],
  /*  30 */ ["Buenavista", { bolas: poli([[-0.7, 0.7], [-0.7, 0.36], [-0.25, 0.33], [-0.33, -0.18], [0.12, -0.02], [0.13, -0.4], [0.7, -0.4], [0.7, -0.7]], 0.16) }],
  /*  31 */ ["Cerritos", { bolas: [[0, 0, 0.95]], huecos: circulos(3, 0.54, 0.2, 0.02) }],
  /*  32 */ ["Pescadero", { bolas: [[0, 0, 0.95]], huecos: rejilla(4, 0.48, 0.11, 0.88) }],
  /*  33 */ ["La Ventana", { bolas: [[0, 0, 0.9]], huecos: [[0.51, 0.12, 0.6]] }],
  /*  34 */ ["El Sargento", { bolas: rombo(0.82, 0.13), huecos: [[0, 0, 0.28]] }],
  /*  35 */ ["El Tecolote", { polar: [0.57, [3, 0.17, 1.05]] }],
  /*  36 */ ["Pichilingue", (() => { const p = [[0, 0], ...circulos(3, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.2, 0.09, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  37 */ ["Isla Cerralvo", { polar: [0.58, [4, 0.14, 1.57]] }],
  /*  38 */ ["Isla San José", { bolas: [[0, 0, 0.95]], huecos: [[0, 0, 0.48]] }],
  /*  39 */ ["Isla Partida", { bolas: constelacion(585, 9, 0.2, 0.09) }],
  /*  40 */ ["Isla Carmen", { polar: [0.74, [22, 0.05, 0]], huecos: [[0, 0, 0.28]] }],
  /*  41 */ ["Isla Coronado", { bolas: [[0, 0, 0.95]], huecos: circulos(10, 0.56, 0.13, 0.49) }],
  /*  42 */ ["Cabo Falso", { polar: [0.73, [7, 0.19, 1.05]] }],
  /*  43 */ ["Playa Santa María", { polar: [0.66, [10, 0.1, 1.05]] }],
  /*  44 */ ["Playa Chileno", { bolas: constelacion(373, 10, 0.12, 0.11) }],
  /*  45 */ ["Palmilla", { bolas: [...Array(3).keys()].flatMap((q) => espiral(0.08, 0.82, 1, 0.1, q * 2 * PI / 3)) }],
  /*  46 */ ["Punta Colorada", { bolas: [[0, 0, 0.95]], huecos: lunares(867, 9, 0.1, 0.13, 0.19) }],
  /*  47 */ ["Puerto Escondido", { bolas: ciudad(2, 0.12) }],
  /*  48 */ ["Nopoló", { bolas: [[0, 0, 0.95]], huecos: circulos(9, 0.56, 0.12, 0.46) }],
  /*  49 */ ["Playa Requesón", { bolas: copo(5, 0.08) }],
  /*  50 */ ["Playa Santispac", { bolas: nube(962, 7, 0.17, 0.28) }],
  /*  51 */ ["Misión San Javier", { bolas: [...cadena(-0.39, -0.8, -0.39, 0.8, 0.14), ...cadena(0.39, -0.8, 0.39, 0.8, 0.13), ...[-0.5, 0, 0.5].flatMap((y) => cadena(-0.39, y, 0.39, y, 0.11))] }],
  /*  52 */ ["Misión Dolores", { bolas: [[0, 0, 0.95]], huecos: lunares(702, 13, 0.08, 0.13, 0.19) }],
  /*  53 */ ["Reserva El Vizcaíno", { polar: [0.77, [12, 0.07, 0]], huecos: [[0, 0, 0.24]] }],
  /*  54 */ ["San Juanico", { bolas: [[0, 0, 0.95]], huecos: circulos(6, 0.56, 0.17, 0.56) }],
  /*  55 */ ["Puerto San Carlos", { bolas: [[0, 0, 0.95]], huecos: lunares(865, 28, 0.1, 0.13, 0.16, 0.1, 0.84) }],
  /*  56 */ ["Puerto Adolfo López Mateos", { bolas: constelacion(365, 11, 0.16, 0.12) }],
  /*  57 */ ["Isla Magdalena", { bolas: constelacion(940, 9, 0.2, 0.07) }],
  /*  58 */ ["Isla Margarita", { bolas: [[0, 0, 0.95]], huecos: panal(0.31, 0.11) }],
  /*  59 */ ["Punta Eugenia", { bolas: [...anillo(0.72, 0.09), ...rayos(9, 0, 0.72, 0.09), [0, 0, 0.2]] }],
  /*  60 */ ["Isla Natividad", { bolas: estrellaN(12, 0.84, 0.17, 0.07) }],
  /*  61 */ ["Isla San Roque", { bolas: constelacion(552, 10, 0.19, 0.1) }],
  /*  62 */ ["Bahía Tortugas", { bolas: [...circulos(3, 0.6, 0.2), ...anillo(0.62, 0.1)] }],
  /*  63 */ ["Volcán Las Tres Vírgenes", { bolas: constelacion(301, 4, 0.19, 0.09) }],
  /*  64 */ ["Punta Chivato", { bolas: constelacion(542, 4, 0.15, 0.12) }],
  /*  65 */ ["Bahía Santa Inés", { bolas: [...rama(0, -0.88, 1.57, 0.34, 0.08, 4), [0, -0.88, 0.15]] }],
  /*  66 */ ["Agua Verde", { bolas: copo(8, 0.08) }],
  /*  67 */ ["San Evaristo", { bolas: [[0, 0, 0.29], ...rayos(10, 0.2, 0.85, 0.12)] }],
  /*  68 */ ["La Purísima", (() => { const p = [[0, 0], ...circulos(5, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.17, 0.08, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  69 */ ["San Isidro", { bolas: [[0, 0, 0.95]], huecos: lunares(658, 18, 0.1, 0.12, 0.15, 0.1, 0.84) }],
  /*  70 */ ["San José de Comondú", { bolas: constelacion(798, 4, 0.21, 0.08) }],
  /*  71 */ ["Cañón de la Zorra", { bolas: [...anillo(0.72, 0.12), ...rayos(5, 0, 0.72, 0.12), [0, 0, 0.2]] }],
  /*  72 */ ["Cueva Pintada", { bolas: espiral(0.1, 0.8, 1.3, 0.1) }],
  /*  73 */ ["Cabo del Este", { bolas: [...circulos(5, 0.68, 0.2), ...anillo(0.62, 0.1)] }],
  /*  74 */ ["Ensenada de los Muertos", { bolas: [...anillo(0.66, 0.09), ...anillo(0.88, 0.09), ...rayos(8, 0, 0.9, 0.09)] }],
  /*  75 */ ["Bahía de La Paz", { bolas: estrellaN(5, 0.84, 0.19, 0.07) }],
  /*  76 */ ["Cardón", { bolas: [...anillo(0.66, 0.08), ...anillo(0.88, 0.08), ...rayos(10, 0, 0.9, 0.08)] }],
  /*  77 */ ["Pitahaya", { bolas: [[0, 0, 0.95]], huecos: pasillos(3, 0.07, 0.47, 0.46) }],
  /*  78 */ ["Ballena gris", (() => { const p = [[0, 0], ...circulos(4, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.16, 0.08, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  79 */ ["Tiburón ballena", { bolas: constelacion(430, 11, 0.16, 0.11) }],
  /*  80 */ ["Mantarraya", { bolas: copo(8, 0.07) }],
  /*  81 */ ["Lobo marino", { bolas: estrellaN(4, 0.89, 0.2, 0.07) }],
  /*  82 */ ["Marlín", { bolas: [...anillo(0.72, 0.09), ...rayos(8, 0, 0.72, 0.09), [0, 0, 0.2]] }],
  /*  83 */ ["Dorado", { bolas: [...anillo(0.72, 0.08), ...rayos(6, 0, 0.72, 0.08), [0, 0, 0.2]] }],
  /*  84 */ ["Tortuga caguama", { bolas: [[0, 0, 0.95]], huecos: pasillos(4, 0.06, 0.49, 0.43) }],
  /*  85 */ ["Pelícano", { bolas: [[0, 0, 0.95]], huecos: lunares(978, 16, 0.08, 0.11, 0.17, 0.1, 0.84) }],
  /*  86 */ ["Fragata", { bolas: espiral(0.1, 0.83, 2.44, 0.09) }],
  /*  87 */ ["Delfín", { bolas: estrellaN(10, 0.85, 0.15, 0.08) }],
  /*  88 */ ["Palma datilera", { bolas: constelacion(769, 6, 0.16, 0.09) }],
  /*  89 */ ["Mezquite", { bolas: [...cadena(-0.45, -0.8, -0.45, 0.8, 0.12), ...cadena(0.45, -0.8, 0.45, 0.8, 0.14), ...[-0.5, 0].flatMap((y) => cadena(-0.45, y, 0.45, y, 0.1))] }],
  /*  90 */ ["Agave", { bolas: espiral(0.1, 0.79, 1.38, 0.09) }],
  /*  91 */ ["Oasis de San Ignacio", { bolas: [[0, 0, 0.26], ...rayos(8, 0.2, 0.82, 0.12)] }],
  /*  92 */ ["Salinas de Guerrero Negro", { bolas: [[0, 0, 0.95]], huecos: lunares(943, 27, 0.08, 0.11, 0.17, 0.1, 0.84) }],
  /*  93 */ ["Perlas de La Paz", (() => { const p = [[0, 0], ...circulos(7, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.16, 0.07, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  94 */ ["Malecón de La Paz", { bolas: espiral(0.1, 0.84, 1.93, 0.11) }],
  /*  95 */ ["Mar de Cortés", (() => { const p = [[0, 0], ...circulos(8, 0.65, 0).map(([x, y]) => [x, y])]; return { bolas: islas2(p, 0.19, 0.09, p.slice(1).map((_, i) => [0, i + 1])) }; })()],
  /*  96 */ ["Océano Pacífico", { bolas: copo(10, 0.07) }],
  /*  97 */ ["Cabo San Lázaro", { bolas: [[0, 0, 0.95]], huecos: lunares(895, 24, 0.08, 0.1, 0.18, 0.1, 0.84) }],
  /*  98 */ ["Punta Abreojos", { bolas: ciudad(5, 0.08) }],
  /*  99 */ ["Isla San Marcos", { bolas: [...Array(2).keys()].flatMap((q) => espiral(0.08, 0.82, 1.49, 0.08, q * 2 * PI / 2)) }],
  /* 100 */ ["Picacho de la Laguna", { bolas: ciudad(3, 0.08) }],
];

export const NIVELES_BCS = LISTA.map(([nombre, forma], i) => ({ ...nivel(i + 1, nombre, forma), n: i + 1, categoria: CATEGORIAS[i], listo: true }));

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
const NOMBRES_BONO = ["Perlas", "Dátiles", "Mantarrayas", "Sal de Guerrero Negro", "Pitahayas", "Conchas de nácar", "Ballenas", "Cardones", "Dorados", "Tesoro de Cabo"];

export const BONOS = Array.from({ length: 10 }, (_, i) => ({
  ...BASE_BONO, ...(DATOS_BONO[i + 1] || {}),
  n: i + 1, despuesDe: (i + 1) * 10, nombre: "Bono " + (i + 1) + " · " + NOMBRES_BONO[i],
}));
