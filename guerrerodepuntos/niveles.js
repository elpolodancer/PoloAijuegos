// Ruta: guerrerodepuntos/niveles.js
// Niveles del juego. El lienzo mide 360 x 600.
// Para agregar un nivel: copia uno de la lista, cambia posiciones, enemigos y enlaces.
//  - zonas:   { x, y, enemigo }  → «enemigo» es el nivel del monstruo (sin esa propiedad, la zona está libre).
//             La zona 0 SIEMPRE es donde empiezas.
//  - enlaces: [a, b]             → puentes entre zonas (por índice). Solo puedes saltar entre zonas unidas.
//  - salida:  índice de la zona que termina el nivel.
// Regla: vences a un enemigo solo si tu nivel es MAYOR que el suyo (empatar no basta) y su nivel se suma al tuyo.

export const NIVEL_INICIAL = 5;

export const NIVELES = [
  {
    nombre: "Isla inicial",
    pista: "Piensa el orden: el guardián de la cima necesita que te comas a todos.",
    zonas: [
      { x: 180, y: 520 },               // 0 inicio
      { x: 80, y: 410, enemigo: 3 },    // 1
      { x: 280, y: 410, enemigo: 4 },   // 2
      { x: 80, y: 290, enemigo: 8 },    // 3
      { x: 280, y: 290, enemigo: 10 },  // 4
      { x: 180, y: 170, enemigo: 31 },  // 5 guardián
      { x: 180, y: 60 },                // 6 salida
      { x: 60, y: 540, enemigo: 2 },    // 7 bonus pequeño
    ],
    enlaces: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 5], [4, 5], [5, 6], [0, 7]],
    salida: 6,
  },
];
