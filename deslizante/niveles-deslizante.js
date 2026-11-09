// Ruta: deslizante/niveles-deslizante.js
// Niveles fijos (iguales para todos los jugadores). Cada tamaño tiene 10 niveles, de 3×3 hasta 30×30 (280 en total).
// El ORDEN de esta lista es el orden de desbloqueo: para jugar un nivel hay que haber pasado el anterior,
// así que el primero del 4×4 se abre al pasar el décimo del 3×3, y así hasta el 30×30.
//
// Cada nivel:  { n: tamaño, optimo: mínimo de movimientos (opcional), fichas: [ n*n números, el 0 es el hueco ] }
//   - «fichas» se lee de izquierda a derecha y de arriba abajo; resuelto = 1, 2, 3 … n*n-1, 0 (hueco al final).
//   - «optimo» es el mínimo posible contando que deslizar varias fichas de una fila o columna cuenta como 1 movimiento.
// Por ahora están el 3×3 y el 4×4 (20 niveles). Para agregar más, añade los del siguiente tamaño al final de la lista.

export const POR_TAMANO = 10;
export const TAMANO_MAX = 30;

// Puntos que se envían al perfil la PRIMERA vez que se pasa un nivel (crece con el tamaño)
export const puntosDe = (n) => Math.max(2, Math.round((n * n) / 4));

export const NIVELES = [
  { n: 3, optimo: 4, fichas: [1,2,3,4,8,5,7,6,0] },   // 1
  { n: 3, optimo: 6, fichas: [1,2,3,7,4,0,5,8,6] },   // 2
  { n: 3, optimo: 8, fichas: [2,7,3,1,4,6,5,0,8] },   // 3
  { n: 3, optimo: 10, fichas: [4,1,3,5,7,0,8,6,2] },   // 4
  { n: 3, optimo: 12, fichas: [1,2,6,0,8,7,3,4,5] },   // 5
  { n: 3, optimo: 14, fichas: [1,8,2,0,7,6,5,4,3] },   // 6
  { n: 3, optimo: 16, fichas: [6,3,8,2,1,4,0,7,5] },   // 7
  { n: 3, optimo: 18, fichas: [6,2,0,1,5,8,7,4,3] },   // 8
  { n: 3, optimo: 20, fichas: [7,5,8,6,0,3,1,4,2] },   // 9
  { n: 3, optimo: 22, fichas: [7,8,6,0,5,2,3,4,1] },   // 10
  // ----- 4×4 (los niveles 8, 9 y 10 no llevan «optimo»: su mínimo exacto es demasiado costoso de calcular) -----
  { n: 4, optimo: 4, fichas: [1,2,0,4,5,7,3,8,9,6,11,12,13,10,14,15] },   // 1
  { n: 4, optimo: 5, fichas: [1,2,3,4,5,7,8,12,9,6,11,15,13,10,0,14] },   // 2
  { n: 4, optimo: 6, fichas: [5,1,2,3,6,10,7,4,9,14,11,8,13,15,0,12] },   // 3
  { n: 4, optimo: 7, fichas: [1,10,2,4,5,0,3,7,9,11,6,8,13,14,15,12] },   // 4
  { n: 4, optimo: 8, fichas: [1,6,2,4,5,10,3,7,9,14,8,0,13,15,11,12] },   // 5
  { n: 4, optimo: 12, fichas: [0,2,8,3,1,6,11,4,5,10,15,12,9,13,14,7] },   // 6
  { n: 4, optimo: 16, fichas: [1,2,3,0,9,6,13,7,10,5,8,4,14,15,11,12] },   // 7
  { n: 4, fichas: [1,6,12,15,11,2,4,3,5,10,13,0,9,7,8,14] },   // 8
  { n: 4, fichas: [10,5,4,8,2,1,12,13,7,3,9,6,0,14,11,15] },   // 9
  { n: 4, fichas: [1,11,3,9,10,13,8,2,0,5,12,4,14,6,15,7] },   // 10
];
