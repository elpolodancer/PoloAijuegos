// Ruta: spider/niveles-spider.js
// Niveles FIJOS del Spider (iguales para todos los jugadores). Cada uno es { palos, dif, semilla }: nuevaPartida(palos, semilla, dif) siempre da el mismo reparto.
// Todos se comprobaron con el bot (ia-spider.js, información perfecta; «nodos» = lo que le costó). NO cambies una semilla ya publicada:
// cambiaría el reparto de quien ya la jugó. Para agregar niveles: node spider/verificar-spider.mjs, y anota aquí las semillas que resuelva.
// Orden = nivel 1, 2, 3… (de lo más fácil a lo más difícil según los nodos del bot). Los niveles 1 a 5 son de 1 palo y dificultad Fácil.
export const NIVELES = [
  { palos: 1, dif: 1, semilla: 6, nodos: 276 },
  { palos: 1, dif: 1, semilla: 4, nodos: 379 },
  { palos: 1, dif: 1, semilla: 1, nodos: 468 },
  { palos: 1, dif: 1, semilla: 5, nodos: 1266 },
  { palos: 1, dif: 1, semilla: 3, nodos: 2187 },
];
