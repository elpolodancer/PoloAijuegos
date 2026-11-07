// Ruta: zuma/niveles-zuma.js
// Niveles del Zuma. Cada nivel es solo datos: el generador futuro producirá objetos con esta misma forma
// (100 por estado de México y 100 por país). Por ahora hay un único nivel de prueba.
//
// Cada nivel tiene 3 rondas, cada una más difícil. Pasar la ronda 1 = 1 estrella (y se desbloquea el nivel siguiente),
// la ronda 2 = 2 estrellas y la ronda 3 = 3 estrellas. Las monedas dependen de las estrellas:
//   monedas: [con 1 estrella (15–20), con 2 (25–30), con 3 (35–40)]   (total que se lleva el jugador por ese nivel)
//
// Cada ronda:
//   colores    cuántos colores distintos hay (máx. = PALETA.length)
//   bolas      cuántas bolas trae la cadena en total
//   velocidad  px/s de la cabeza de la cadena (el Zuma original anda entre 25 y 45)
//   rush       px/s de la entrada rápida de los primeros 2.2 s
//   semilla    mismo número = misma cadena siempre
//   trayecto   forma del camino (ver crearTrayecto en logica-zuma.js)
// validar-zuma.mjs comprueba que cada ronda se puede pasar y que las monedas están en su rango.

export const ANCHO = 640;
export const ALTO = 480;
export const CENTRO = { x: 320, y: 240 }; // donde está la rana
export const COSTE_BOOST = 30;            // monedas que cuesta cada boost

// Colores de piedras preciosas; cada uno lleva además una marca distinta (ver dibujarBola) para distinguirlos sin color
export const PALETA = ["#2fbf5b", "#3b82f6", "#e5484d", "#f5c518", "#a855f7", "#e8e4d8"];

export const NIVELES = [
  {
    id: "mx-aguascalientes-001",
    nombre: "Aguascalientes · Nivel 1",
    monedas: [18, 27, 38],
    rondas: [
      { colores: 4, bolas: 45, velocidad: 26, rush: 200, semilla: 1, trayecto: { cx: 320, cy: 240, rx: [285, 110], ry: [205, 85], vueltas: 2 } },
      { colores: 5, bolas: 60, velocidad: 30, rush: 220, semilla: 2, trayecto: { cx: 320, cy: 240, rx: [290, 105], ry: [208, 82], vueltas: 2.25 } },
      { colores: 6, bolas: 70, velocidad: 32, rush: 240, semilla: 3, trayecto: { cx: 320, cy: 240, rx: [292, 100], ry: [210, 80], vueltas: 2.5 } },
    ],
  },
];
