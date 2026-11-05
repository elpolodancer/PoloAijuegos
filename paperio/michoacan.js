// Ruta: paperio/michoacan.js
// Estructura de los 100 niveles de Michoacán (mapa → México → Michoacán) y de sus 10 BONOS (uno después de cada 10 niveles).
//
// CATEGORÍA (1 a 5) de cada nivel: FIJA para siempre, no se calcula; está escrita a mano en CATEGORIAS, una por nivel.
//   1 = muy fácil · 2 = fácil · 3 = media · 4 = difícil · 5 = muy difícil
// Reparto: 30 de categoría 1 · 25 de 2 · 20 de 3 · 13 de 4 · 12 de 5 (más fáciles que difíciles).
// Los fáciles se concentran al principio (niveles 1-10: ocho de categoría 1) y los difíciles aparecen poco a poco:
// el primer 4 es el nivel 27, el primer 5 el 40 y el último nivel (100) es de categoría 5.
//
// PARA LLENAR UN NIVEL: quita el «//» de su línea en DATOS (o copia el ejemplo) y rellénalo con el mismo formato de niveles.js:
//   n: { nombre, bots, meta, forma, dificultad (opcional, 0 a 1), rasgos (opcional) }
// Un nivel con «forma» queda «listo»; los demás se muestran bloqueados («próximamente») en el mapa.
// NO cambies la categoría al llenar el nivel: es la dificultad fija de ese número de nivel. Lo que pongas en bots, meta,
// dificultad y rasgos debería sentirse acorde con su categoría.

export const NOMBRES_CATEGORIA = { 1: "Muy fácil", 2: "Fácil", 3: "Media", 4: "Difícil", 5: "Muy difícil" };

// Una categoría por nivel, de 10 en 10 (el primer renglón son los niveles 1 a 10, el segundo del 11 al 20, etc.)
export const CATEGORIAS = Object.freeze([
  1, 1, 1, 1, 2, 1, 1, 1, 2, 1, //   1 - 10
  1, 1, 2, 1, 1, 2, 1, 3, 1, 2, //  11 - 20
  2, 1, 3, 1, 2, 1, 4, 2, 3, 1, //  21 - 30
  1, 2, 3, 1, 2, 4, 1, 2, 3, 5, //  31 - 40
  1, 3, 2, 1, 3, 5, 2, 1, 3, 4, //  41 - 50
  2, 1, 3, 2, 4, 2, 1, 3, 5, 4, //  51 - 60
  3, 1, 2, 5, 3, 1, 4, 2, 3, 5, //  61 - 70
  2, 3, 1, 4, 2, 5, 3, 2, 4, 5, //  71 - 80
  3, 4, 2, 1, 5, 3, 4, 2, 5, 4, //  81 - 90
  3, 2, 4, 5, 3, 2, 5, 4, 3, 5, //  91 - 100
]);

// Datos de cada nivel, por número (1 a 100). Ejemplo (formato de niveles.js):
//   1: { nombre: "Morelia", bots: 3, meta: 20, forma: { polar: [0.84, [3, 0.07, 0]] } },
const DATOS = {
};

export const NIVELES_MICHOACAN = CATEGORIAS.map((categoria, i) => {
  const d = DATOS[i + 1] || {};
  return { ...d, n: i + 1, categoria, listo: !!d.forma };
});

// ----- Bonos -----
// Después de cada 10 niveles hay un nivel aparte (no cuenta dentro de los 100): un bono de monedas.
// No hay bots ni estela: solo monedas para recoger a lo loco durante «duracion» segundos. Cada moneda recogida
// desaparece y vuelve a aparecer en el mismo lugar «reaparece» segundos después. Cada moneda vale «valor» 🪙 (las de la tienda).
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
const DATOS_BONO = {
};

export const BONOS = Array.from({ length: 10 }, (_, i) => ({
  ...BASE_BONO, ...(DATOS_BONO[i + 1] || {}),
  n: i + 1, despuesDe: (i + 1) * 10, nombre: "Bono " + (i + 1),
}));
