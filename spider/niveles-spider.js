// Ruta: spider/niveles-spider.js
// Niveles FIJOS del Spider (iguales para todos los jugadores). Cada uno es { dif, semilla }: nuevaPartida(dif, semilla) siempre da el mismo reparto.
// Todos se comprobaron con el bot (ia-spider.js, información perfecta; «nodos» = lo que le costó). NO cambies una semilla ya publicada:
// cambiaría el reparto de quien ya la jugó. Para agregar niveles: node spider/verificar-spider.mjs, y anota aquí las semillas que resuelva.
// Orden = nivel 1, 2, 3… (de lo más fácil a lo más difícil según los nodos del bot). Los niveles 1 a 5 son de dificultad Fácil (1 palo).
export const NIVELES = [
  { dif: 1, semilla: 6, nodos: 276 },
  { dif: 1, semilla: 4, nodos: 379 },
  { dif: 1, semilla: 1, nodos: 468 },
  { dif: 1, semilla: 5, nodos: 1266 },
  { dif: 1, semilla: 3, nodos: 2187 },
];
