// Ruta: buscaminas/niveles-buscaminas.js
// Tamaño y minas de cada nivel. No usa document ni Firebase: son solo cuentas.
//
//  • NIVELES DEL MAPA (compartido/mapa-niveles.js): 32 estados × 100 niveles = 3200 (y, al terminarlos, el mundo: 194 países × 100).
//      configMapa(n) → { cols, filas, minas, puntos }
//  • MODO INFINITO: 10 tamaños × 3 dificultades, a elegir libremente.
//      configLibre(n, dificultad) → { cols, filas, minas }
//
// Un nivel del mapa no es un tablero fijo (las minas se colocan al primer toque, para que la primera casilla siempre sea segura):
// el nivel solo decide el TAMAÑO y CUÁNTAS minas hay. Si cambias estas fórmulas, los récords guardados siguen valiendo,
// pero los tableros de cada nivel cambian de tamaño.

export const POR_ETAPA = 100;       // niveles por estado (y por país)
export const ESTADOS = 32;
export const NIVELES_MEXICO = ESTADOS * POR_ETAPA; // 3200

// ----- Límites que caben en una pantalla de celular (casilla mínima de 14 px) -----
const COLS_MAX = 16, FILAS_MAX = 22;
const FORMA = 0.72;                 // columnas / filas (tableros más altos que anchos, como en vertical)
const MINAS_MIN = 5;

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

function armar(areaDeseada, densidad) {
  const filas = acotar(Math.round(Math.sqrt(areaDeseada / FORMA)), 8, FILAS_MAX);
  const cols = acotar(Math.round(areaDeseada / filas), 6, COLS_MAX);
  const total = cols * filas;
  const minas = acotar(Math.round(total * densidad), MINAS_MIN, total - 9); // siempre cabe el primer toque (casilla + 8 vecinas)
  return { cols, filas, minas };
}

// ===== Niveles del mapa =====
// Dentro de cada estado el tablero va creciendo del nivel 1 al 100 y, además, cada estado empieza y termina más grande y con
// más minas que el anterior (diente de sierra: al cambiar de estado vuelve a «respirar» un poco).
//   estado 1 (Quintana Roo):   de 6×8 con 5 minas (nivel 1) a ~10×14 con ~21 minas (nivel 100)
//   estado 32 (Baja California): de ~12×17 con ~39 minas a 16×22 con 84 minas (nivel 3200: 24 % de minas)
// Del nivel 3201 en adelante (el mundo) se repite el ritmo del último estado y la densidad sube un poco por país (hasta 27 %).
export function configMapa(n) {
  n = Math.max(1, Math.floor(Number(n)) || 1);
  const i = n - 1;
  const etapa = Math.floor(i / POR_ETAPA);
  const e = Math.min(ESTADOS - 1, etapa);
  const k = i % POR_ETAPA;                      // 0..99
  const fe = e / (ESTADOS - 1), fk = k / (POR_ETAPA - 1);

  const base = 48 + (200 - 48) * fe;            // área (casillas) con la que EMPIEZA el estado
  const tope = 140 + (352 - 140) * fe;          // área con la que TERMINA
  const area = base + (tope - base) * fk;

  let densidad = 0.10 + 0.09 * fe + 0.05 * fk;  // 10 %..15 % en el primer estado, 19 %..24 % en el último
  if (etapa >= ESTADOS) densidad += Math.min(0.03, (etapa - ESTADOS) * 0.00016);

  const t = armar(area, densidad);
  return { ...t, puntos: t.minas };             // puntos = minas (solo la primera vez que se pasa el nivel)
}

// ===== Modo infinito: 10 tamaños × 3 dificultades =====
export const TAMANOS = [
  { cols: 8,  filas: 10 },
  { cols: 9,  filas: 12 },
  { cols: 10, filas: 13 },
  { cols: 10, filas: 15 },
  { cols: 11, filas: 16 },
  { cols: 12, filas: 17 },
  { cols: 13, filas: 18 },
  { cols: 14, filas: 19 },
  { cols: 15, filas: 20 },
  { cols: 16, filas: 22 },
];
export const DENSIDADES = { facil: 0.12, medio: 0.18, dificil: 0.24 };

export function configLibre(n, dificultad) {
  const t = TAMANOS[acotar(Math.floor(Number(n)) || 1, 1, TAMANOS.length) - 1], total = t.cols * t.filas;
  const minas = acotar(Math.round(total * (DENSIDADES[dificultad] || DENSIDADES.facil)), MINAS_MIN, total - 9);
  return { cols: t.cols, filas: t.filas, minas };
}
