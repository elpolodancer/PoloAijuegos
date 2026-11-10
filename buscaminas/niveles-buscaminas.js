// Ruta: buscaminas/niveles-buscaminas.js
// Tamaño y minas de cada nivel. No usa document ni Firebase: son solo cuentas.
//
//  • NIVELES DEL MAPA (compartido/mapa-niveles.js): 32 estados × 100 niveles = 3200 y, al terminarlos, el mundo: 194 países × 100 = 19 400.
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
const MINAS_MIN = 5;

const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

// ===== Niveles del mapa =====
// Cada etapa (estado o país) tiene 100 niveles y TODOS son distintos entre sí (tamaño y/o minas), de más fácil a más difícil.
//   • Estados (32 × 100 = 3200): cada estado empieza y termina más grande y con más minas que el anterior (diente de sierra:
//     al cambiar de estado vuelve a «respirar» un poco).
//        estado 1 (Quintana Roo):     de 6×8 con 5 minas (nivel 1) a ~10×14 con ~21 minas (nivel 100)
//        estado 32 (Baja California): de ~12×17 con ~39 minas a 16×22 con 84 minas (nivel 3200)
//   • Países (194 × 100 = 19 400, del nivel 3201 en adelante): empiezan donde terminó México y cada país arranca un poco más
//     alto que el anterior; los últimos llegan a 16×22 con ~27 % de minas.
// Cómo se reparte: de cada etapa se calcula una «ruta» (área y densidad de minas que van subiendo del nivel 1 al 100). Para cada
// nivel se elige, entre los tableros posibles (6–16 columnas × 8–22 filas) que están cerca de esa ruta, uno por escalón de
// dificultad, de fácil a difícil, sin repetir. Es una cuenta fija: el nivel n siempre da lo mismo.
const TOTAL_ESTADOS = ESTADOS * POR_ETAPA;     // 3200
const PAISES = 194;
const ETAPAS_TOTAL = ESTADOS + PAISES;         // 226
const cacheEtapas = new Map();

function parametros(etapa) {
  if (etapa < ESTADOS) {
    const fe = etapa / (ESTADOS - 1);
    return { a0: 48 + (200 - 48) * fe, a1: 140 + (352 - 140) * fe, d0: 0.10 + 0.09 * fe, d1: 0.15 + 0.09 * fe };
  }
  const fp = (etapa - ESTADOS) / (PAISES - 1);   // 0..1 a lo largo de los países
  return { a0: 200 + 100 * fp, a1: 352, d0: 0.19 + 0.04 * fp, d1: 0.24 + 0.03 * fp };
}

function construirEtapa(etapa) {
  const { a0, a1, d0, d1 } = parametros(etapa);
  const ra = Math.max(a1 - a0, 20), rd = Math.max(d1 - d0, 0.02);
  // Todos los tableros posibles (forma alta, como en vertical) con un poco de margen alrededor de la ruta
  const cand = [];
  for (let cols = 6; cols <= COLS_MAX; cols++) for (let filas = 8; filas <= FILAS_MAX; filas++) {
    const area = cols * filas, forma = cols / filas;
    if (forma < 0.6 || forma > 0.85 || area < a0 - 12 || area > a1 + 12) continue;
    const mMin = Math.max(MINAS_MIN, Math.floor(area * (d0 - 0.02))), mMax = Math.min(area - 9, Math.ceil(area * (d1 + 0.02)));
    for (let minas = mMin; minas <= mMax; minas++) cand.push({ cols, filas, minas, area, dens: minas / area });
  }
  // Nivel por nivel (de 1 a 100) se toma el tablero que aún no se usó y más cerca del punto de la ruta; así cada nivel es distinto
  const usado = new Uint8Array(cand.length), res = [];
  for (let k = 0; k < POR_ETAPA; k++) {
    const f = k / (POR_ETAPA - 1), A = a0 + (a1 - a0) * f, D = d0 + (d1 - d0) * f;
    let mejor = -1, mejorD = Infinity;
    for (let i = 0; i < cand.length; i++) {
      if (usado[i]) continue;
      const c = cand[i], dist = ((c.area - A) / ra) ** 2 + ((c.dens - D) / rd) ** 2;
      if (dist < mejorD) { mejorD = dist; mejor = i; }
    }
    usado[mejor] = 1;
    res.push({ cols: cand[mejor].cols, filas: cand[mejor].filas, minas: cand[mejor].minas });
  }
  // Se ordenan por minas (y, a igual de minas, por tamaño): así nunca baja la cantidad de minas de un nivel al siguiente
  res.sort((x, y) => x.minas - y.minas || x.cols * x.filas - y.cols * y.filas);
  return res;
}

export function configMapa(n) {
  n = acotar(Math.floor(Number(n)) || 1, 1, ETAPAS_TOTAL * POR_ETAPA);
  const etapa = Math.floor((n - 1) / POR_ETAPA), k = (n - 1) % POR_ETAPA;
  let lista = cacheEtapas.get(etapa);
  if (!lista) { lista = construirEtapa(etapa); cacheEtapas.set(etapa, lista); }
  const t = lista[k];
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
