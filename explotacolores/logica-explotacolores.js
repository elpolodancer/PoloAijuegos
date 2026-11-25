// Ruta: explotacolores/logica-explotacolores.js
// Lógica pura (sin document ni Firebase) de «Explota colores»: tablero de 10 columnas × 15 filas.
// Cada celda es { c: color (0..n-1), y: fila visual (decimal), v: velocidad de caída }. La lógica decide DÓNDE queda cada bloque (su fila en el
// arreglo); «y» solo la usa el dibujo para animar la caída (los bloques nuevos nacen con y negativa, arriba del tablero).

export const COLUMNAS = 10;
export const FILAS = 15;
export const MIN_GRUPO = 3;                 // desde 3 bloques del mismo color juntos (arriba/abajo/izquierda/derecha) se pueden quitar
export const DIFICULTADES = [               // en Modo libre: más colores = grupos más difíciles de encontrar. Las 5 estándar (ESTANDARES-juegos.md, 7.2)
  { id: "muyfacil", emoji: "😁", nombre: "Muy fácil", colores: 3, nota: "3 colores: casi todo se puede quitar." },
  { id: "facil", emoji: "😬", nombre: "Fácil", colores: 4, nota: "4 colores: grupos grandes con facilidad." },
  { id: "normal", emoji: "😐", nombre: "Normal", colores: 5, nota: "5 colores: hay que buscar los grupos." },
  { id: "dificil", emoji: "😡", nombre: "Difícil", colores: 6, nota: "6 colores: los grupos escasean." },
  { id: "demoniaco", emoji: "😈", nombre: "Demoníaco", colores: 7, nota: "7 colores: el más difícil." },   // antes «Experto»; el récord se guarda por número de colores, así que no cambia
];

const nueva = (colores, azar, y) => ({ c: Math.floor(azar() * colores), y, v: 0 });

// Tablero lleno; todos los bloques nacen arriba y caen
export function crearTablero(colores, azar = Math.random) {
  const t = [];
  for (let r = 0; r < FILAS; r++) {
    t.push([]);
    for (let c = 0; c < COLUMNAS; c++) t[r].push(nueva(colores, azar, r - FILAS - 2 - Math.floor(azar() * 4)));
  }
  asegurarJugada(t, azar);
  return t;
}

// Grupo de bloques del mismo color que tocan a (r, c): [[r, c], …] (vacío si no hay celda)
export function grupoEn(t, r, c) {
  const a = t[r] && t[r][c];
  if (!a) return [];
  const visto = new Set([r * COLUMNAS + c]), pila = [[r, c]], g = [];
  while (pila.length) {
    const [i, j] = pila.pop();
    g.push([i, j]);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = i + di, y = j + dj, k = x * COLUMNAS + y;
      if (x < 0 || y < 0 || x >= FILAS || y >= COLUMNAS || visto.has(k) || t[x][y].c !== a.c) continue;
      visto.add(k); pila.push([x, y]);
    }
  }
  return g;
}

// Todos los grupos jugables: Uint8Array con el tamaño del grupo de cada celda si es ≥ MIN_GRUPO (0 si no). Sirve para resaltarlos.
export function tamanosJugables(t) {
  const m = new Uint8Array(FILAS * COLUMNAS);
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) {
    if (m[r * COLUMNAS + c]) continue;
    const g = grupoEn(t, r, c);
    if (g.length >= MIN_GRUPO) for (const [i, j] of g) m[i * COLUMNAS + j] = Math.min(255, g.length);
  }
  return m;
}

// Puntos de un grupo: crecen mucho con el tamaño (3 → 90, 6 → 360, 9 → 810, 20 → 4 000)
export const puntosGrupo = (n) => (n >= MIN_GRUPO ? n * n * 10 : 0);

// Quita el grupo, baja los de arriba y rellena con bloques nuevos que caen desde arriba. Todo es instantáneo en la lógica: se puede
// volver a tocar al momento, aunque los bloques todavía se vean cayendo.
export function quitarGrupo(t, grupo, colores, azar = Math.random) {
  for (const [r, c] of grupo) t[r][c] = null;
  for (let c = 0; c < COLUMNAS; c++) {
    const quedan = [];
    for (let r = FILAS - 1; r >= 0; r--) if (t[r][c]) quedan.push(t[r][c]);
    for (let r = FILAS - 1, k = 0; r >= 0; r--, k++) {
      if (k < quedan.length) t[r][c] = quedan[k];
      else t[r][c] = nueva(colores, azar, -(k - quedan.length) - 1); // el más bajo de los nuevos nace justo sobre el tablero
    }
  }
  asegurarJugada(t, azar);
}

export function hayJugada(t) {
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) if (grupoEn(t, r, c).length >= MIN_GRUPO) return true;
  return false;
}

// Si por mala suerte no queda ningún grupo, se pinta uno (3 bloques en fila) en un lugar al azar: nunca te quedas sin jugadas
export function asegurarJugada(t, azar = Math.random) {
  if (hayJugada(t)) return;
  const r = Math.floor(azar() * FILAS), c = Math.floor(azar() * (COLUMNAS - 2));
  const color = t[r][c].c;
  t[r][c + 1].c = color; t[r][c + 2].c = color;
}
