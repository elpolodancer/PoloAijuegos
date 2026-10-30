// Ruta: pequenos-puzles/niveles.js
// Niveles de «Pequeños puzles». Cada pieza es un dibujo de texto: X = celda llena, . = vacía.
// Las piezas NO se rotan. Para agregar un nivel, copia un bloque al final de la lista NIVELES.
// - limite: segundos (opcional; el tiempo corre desde el primer toque a una pieza)
// Colores disponibles: cian, cielo, azul, morado, magenta, naranja, amarillo, verde, gris
export const TOTAL_NIVELES = 70;

export const NIVELES = [
  // 1 · 4x4
  { filas: 4, columnas: 4, piezas: [
    { color: "morado", forma: ["XXX", "XXX", "XXX"] },
    { color: "verde", forma: ["X", "X", "X"] },
    { color: "gris", forma: ["XXXX"] },
  ] },
  // 2 · 6x4 (6 columnas, 4 filas)
  { filas: 4, columnas: 6, piezas: [
    { color: "cian", forma: ["X..", "XX.", "XXX"] },
    { color: "magenta", forma: ["XX", "XX", ".X"] },
    { color: "naranja", forma: [".XX", "XX.", "XX.", "XX."] },
    { color: "amarillo", forma: ["XX", "X.", "X.", "X."] },
  ] },
  // 3 · 5x5
  { filas: 5, columnas: 5, piezas: [
    { color: "cian", forma: ["XX.", "XXX", "X.."] },
    { color: "magenta", forma: ["XXX", "X..", "X..", "X.."] },
    { color: "azul", forma: ["..X", "..X", "..X", "..X", "XXX"] },
    { color: "morado", forma: ["XXXX", "...X", "...X"] },
  ] },
  // 4 · 4 columnas x 6 filas
  { filas: 6, columnas: 4, piezas: [
    { color: "cielo", forma: ["..X", "XXX", "..X"] },
    { color: "cian", forma: ["XXXX", "XXX."] },
    { color: "verde", forma: ["XX.", ".XX", ".XX"] },
    { color: "azul", forma: ["X.", "X.", "XX", "XX"] },
  ] },
  // 5 · 5x5
  { filas: 5, columnas: 5, piezas: [
    { color: "verde", forma: ["XXX.", "X.X.", "..XX"] },
    { color: "cian", forma: ["XX", "XX", ".X", ".X"] },
    { color: "azul", forma: ["XX.", "XXX"] },
    { color: "magenta", forma: [".X", "XX", "XX", "XX"] },
  ] },
  // 6 · 4x4
  { filas: 4, columnas: 4, piezas: [
    { color: "cian", forma: [".X", "XX", "X."] },
    { color: "azul", forma: [".X", "XX", "X."] },
    { color: "verde", forma: ["..X", "XXX"] },
    { color: "magenta", forma: ["XXX", "X.."] },
  ] },
  // 7 · 5x5 con límite de 10 s (la magenta son 4 esquinas que se mueven juntas)
  { filas: 5, columnas: 5, limite: 10, piezas: [
    { color: "magenta", forma: ["XX.XX", "X...X", ".....", "X...X", "XX.XX"] },
    { color: "azul", forma: ["..X..", ".XXX.", "XXXXX", ".XXX.", "..X.."] },
  ] },
  // 8 · 6 columnas x 5 filas
  { filas: 5, columnas: 6, piezas: [
    { color: "gris", forma: [".XXX", "XX.X"] },
    { color: "naranja", forma: ["XXX", ".X.", ".XX"] },
    { color: "cian", forma: ["..XX", "XXX."] },
    { color: "amarillo", forma: ["X..", "X..", "XXX", "X.."] },
    { color: "morado", forma: [".X.", "XXX", "..X", ".XX"] },
  ] },
  // 9 · 7 columnas x 4 filas
  { filas: 4, columnas: 7, piezas: [
    { color: "cielo", forma: ["X...", "XX..", ".XXX"] },
    { color: "magenta", forma: [".XXXX", "XX..."] },
    { color: "verde", forma: ["..X.", "XXXX"] },
    { color: "naranja", forma: ["XX", "X.", "XX"] },
    { color: "cian", forma: ["..X", "XXX", ".XX"] },
  ] },
  // 10 · 5 columnas x 4 filas
  { filas: 4, columnas: 5, piezas: [
    { color: "cian", forma: ["XX.", ".X.", ".XX"] },
    { color: "morado", forma: ["XXXX"] },
    { color: "azul", forma: ["X", "X", "X"] },
    { color: "verde", forma: ["X..", "XXX"] },
    { color: "magenta", forma: ["XX.", ".XX"] },
  ] },
];
