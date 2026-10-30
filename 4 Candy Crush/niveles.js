// Ruta: dulces/niveles.js (niveles del juego «dulces»; para cambiar la dificultad toca los números de abajo)
//
// Moldes del tablero: «#» casilla, «.» hueco. Cada nivel usa un molde y un tipo de objetivo que se van rotando:
//   puntos   → llega a la meta de puntos gastando todos los movimientos
//   gelatina → quita toda la gelatina de debajo de los dulces (se limpia haciendo parejas encima)
//   recoger  → junta cierta cantidad de dulces de uno o dos colores
export const TOTAL = 40;

const MOLDES = [
  ["#########", "#########", "#########", "#########", "#########", "#########", "#########", "#########", "#########"],
  ["..#####..", ".#######.", "#########", "#########", "#########", "#########", "#########", ".#######.", "..#####.."],
  ["....#....", "...###...", "..#####..", ".#######.", "#########", ".#######.", "..#####..", "...###...", "....#...."],
  ["...###...", "...###...", "...###...", "#########", "#########", "#########", "...###...", "...###...", "...###..."],
  ["#########", "#########", "###...###", "###...###", "###...###", "#########", "#########"],
  ["#########", ".#######.", "..#####..", "...###...", "....#....", "...###...", "..#####..", ".#######.", "#########"],
  ["#######", "#######", "#######", "#######", "#######", "#######", "#######"], // pequeño: para los primeros niveles
];
const ORDEN = [0, 1, 2, 3, 4, 5];
const TIPOS_OBJETIVO = ["puntos", "gelatina", "recoger"];

// Dónde va la gelatina (1 = una capa, 2 = dos capas). Cubre una zona, no todo el tablero: «baja» (filas de abajo, la más fácil),
// «centro» (alrededor del centro) o «doble» (centro con dos capas). Cuantas más capas, más movimientos hacen falta.
function gelatina(mascara, n) {
  const f = mascara.length, c = mascara[0].length;
  const anchoAbajo = [...mascara[f - 1]].filter((ch) => ch !== ".").length;
  const estilo = n <= 8 && anchoAbajo === c ? "baja" : ["centro", "doble"][Math.floor(n / 3) % 2]; // «baja» solo si la fila de abajo es completa
  const capasTotales = n < 25 ? 22 + Math.floor(n * 0.6) : 22 + Math.floor((n - 25) * 0.3); // con 6 colores cuesta más: menos capas
  const cy = (f - 1) / 2, cx = (c - 1) / 2;
  const celdas = [];
  mascara.forEach((fila, r) => [...fila].forEach((ch, k) => { if (ch !== ".") celdas.push({ r, k }); }));
  if (estilo === "baja") celdas.sort((x, y) => y.r - x.r || Math.abs(x.k - cx) - Math.abs(y.k - cx));
  else celdas.sort((x, y) => Math.hypot(x.r - cy, x.k - cx) - Math.hypot(y.r - cy, y.k - cx));
  const gel = mascara.map((fila) => [...fila].map(() => 0));
  let capas = 0;
  for (let i = 0; i < celdas.length && capas < capasTotales; i++) {
    const v = estilo === "doble" && i < 9 ? 2 : 1;
    gel[celdas[i].r][celdas[i].k] = v;
    capas += v;
  }
  return gel;
}

// Puntos para 1, 2 y 3 estrellas. En «puntos» la 1.ª es la meta; en los otros tipos la 1.ª estrella es ganar el nivel.
function estrellasDe(meta, n, tipo) {
  const e1 = tipo === "puntos" ? meta : 2500 + n * 250;
  return [e1, Math.round((e1 * 1.5) / 100) * 100, Math.round((e1 * 2.2) / 100) * 100];
}

// Estructura de un nivel sin ajustar (molde, colores, gelatina, objetivo). «movs», «meta» y «cant» de aquí son un punto de partida.
export function nivelBase(n) {
  n = Math.max(1, Math.floor(n));
  const tipo = TIPOS_OBJETIVO[(n - 1) % 3];
  let molde = n <= 3 ? 6 : ORDEN[(n * 5 + Math.floor(n / 6)) % ORDEN.length];
  if (tipo === "gelatina" && n > 3) molde = [0, 1, 2][n % 3]; // para gelatina solo tableros abiertos: la cruz, la ventana y el reloj son muy duros
  const mascara = MOLDES[molde];
  const tipos = n <= 24 ? 5 : 6; // colores distintos (con 4 las reacciones en cadena se disparan)
  const celdas = mascara.join("").replace(/\./g, "").length;
  const def = { n, mascara, tipos, gel: mascara.map((f) => [...f].map(() => 0)) };
  const base = Math.max(14, 26 - Math.floor(n / 4)); // movimientos base: bajan poco a poco
  if (tipo === "puntos") {
    def.movs = base - 2;
    def.objetivo = { tipo, meta: 3000 + n * 350 };
  } else if (tipo === "gelatina") {
    def.gel = gelatina(mascara, n);
    const capas = def.gel.flat().reduce((s, v) => s + v, 0);
    def.movs = Math.max(base, Math.round(10 + capas * 0.55 - Math.floor(n / 6)));
    def.objetivo = { tipo };
  } else {
    const a = (n * 2) % tipos, b = (a + 1 + Math.floor(n / 3)) % tipos;
    const cant = Math.min(40, 14 + Math.floor(n / 2) + Math.floor(celdas / 12));
    def.movs = base;
    def.objetivo = { tipo, items: n < 12 ? [{ t: a, cant }] : [{ t: a, cant: Math.round(cant * 0.7) }, { t: b === a ? (a + 1) % tipos : b, cant: Math.round(cant * 0.7) }] };
  }
  def.estrellas = estrellasDe(tipo === "puntos" ? def.objetivo.meta : 0, n, tipo);
  return def;
}

// Números de cada nivel, calibrados con partidas simuladas (un bot que juega como una persona normal): el porcentaje de victorias baja
// poco a poco del ~98 % al ~60 %. movs = movimientos, meta = puntos (nivel de puntos), cant = dulces a recoger (por color),
// e2/e3 = puntos para 2 y 3 estrellas. Para hacer un nivel más fácil, sube «movs» o baja «meta»/«cant».
export const AJUSTES = {
  1: { movs: 24, meta: 3750, e2: 9000, e3: 11400 },
  2: { movs: 36, e2: 10700, e3: 13500 },
  3: { movs: 26, cant: 29, e2: 8200, e3: 9800 },
  4: { movs: 23, meta: 3500, e2: 6200, e3: 8400 },
  5: { movs: 16, e2: 6200, e3: 7900 },
  6: { movs: 25, cant: 50, e2: 12500, e3: 15800 },
  7: { movs: 23, meta: 8600, e2: 16400, e3: 24800 },
  8: { movs: 23, e2: 7800, e3: 9900 },
  9: { movs: 24, cant: 21, e2: 5500, e3: 6500 },
  10: { movs: 22, meta: 3700, e2: 5800, e3: 7900 },
  11: { movs: 17, e2: 6600, e3: 7800 },
  12: { movs: 23, cant: 28, e2: 7100, e3: 9100 },
  13: { movs: 21, meta: 7950, e2: 13400, e3: 17400 },
  14: { movs: 31, e2: 8900, e3: 11800 },
  15: { movs: 23, cant: 23, e2: 6200, e3: 7200 },
  16: { movs: 20, meta: 2200, e2: 3700, e3: 4800 },
  17: { movs: 20, e2: 6800, e3: 8100 },
  18: { movs: 22, cant: 21, e2: 6300, e3: 7200 },
  19: { movs: 20, meta: 3600, e2: 5300, e3: 7500 },
  20: { movs: 33, e2: 10200, e3: 11800 },
  21: { movs: 21, cant: 55, e2: 15500, e3: 18400 },
  22: { movs: 19, meta: 2650, e2: 4100, e3: 5800 },
  23: { movs: 21, e2: 8000, e3: 9600 },
  24: { movs: 20, cant: 17, e2: 4300, e3: 5400 },
  25: { movs: 18, meta: 1650, e2: 2600, e3: 3400 },
  26: { movs: 22, e2: 5600, e3: 6300 },
  27: { movs: 20, cant: 17, e2: 6400, e3: 7800 },
  28: { movs: 17, meta: 3450, e2: 5800, e3: 7800 },
  29: { movs: 18, e2: 4800, e3: 6300 },
  30: { movs: 19, cant: 12, e2: 3700, e3: 4400 },
  31: { movs: 17, meta: 1700, e2: 2200, e3: 2500 },
  32: { movs: 27, e2: 6000, e3: 7000 },
  33: { movs: 18, cant: 12, e2: 3800, e3: 4600 },
  34: { movs: 16, meta: 3150, e2: 4100, e3: 6300 },
  35: { movs: 18, e2: 4700, e3: 6000 },
  36: { movs: 17, cant: 20, e2: 5500, e3: 7800 },
  37: { movs: 15, meta: 1500, e2: 2000, e3: 2900 },
  38: { movs: 27, e2: 6400, e3: 7000 },
  39: { movs: 17, cant: 11, e2: 3300, e3: 4800 },
  40: { movs: 14, meta: 1750, e2: 2100, e3: 3000 },
};

export function nivel(n) {
  const def = nivelBase(n);
  const a = AJUSTES[def.n];
  if (a) {
    if (a.movs) def.movs = a.movs;
    if (a.meta) def.objetivo.meta = a.meta;
    if (a.cant) def.objetivo.items.forEach((it) => { it.cant = a.cant; });
    if (a.e2) def.estrellas = [def.objetivo.meta || Math.round(a.e2 * 0.6 / 100) * 100, a.e2, a.e3];
  }
  return def;
}
