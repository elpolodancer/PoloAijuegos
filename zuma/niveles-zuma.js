// Ruta: zuma/niveles-zuma.js
// ARCHIVO GENERADO por generar-zuma.mjs: no se edita a mano (si lo cambias, vuelve a correr node validar-zuma.mjs).
// Los niveles son datos fijos: salieron del generador con semillas y se comprobaron con los bots, así que son
// idénticos para todos los jugadores y en todos los dispositivos. Cada nivel tiene 3 rondas, cada una más difícil.
// Pasar la ronda 1 = 1 estrella (y se desbloquea el nivel siguiente), la ronda 2 = 2 estrellas y la ronda 3 = 3 estrellas.
// Las monedas dependen SOLO de las estrellas y son iguales en todos los niveles (MONEDAS_POR_ESTRELLAS, abajo).
// Es el total que se lleva el jugador por ese nivel: si ya cobró la 1.ª estrella y luego gana la 2.ª, solo se le paga la diferencia.
//
// Cada ronda:
//   colores    cuántos colores distintos hay (máx. = PALETA.length)
//   bolas      cuántas bolas trae la cadena en total
//   velocidad  px/s de la cabeza de la cadena
//   rush       px/s de la entrada rápida de los primeros 2.5 s (y cuando limpias casi toda la pantalla)
//   semilla    mismo número = misma cadena siempre
//   trayecto   forma del camino (ver crearTrayecto en logica-zuma.js)
// validar-zuma.mjs comprueba que cada ronda cumple las metas de metas-zuma.mjs y que MONEDAS_POR_ESTRELLAS es válido.

export const ANCHO = 640;
export const ALTO = 480;
export const CENTRO = { x: 320, y: 240 }; // donde está la rana
export const COSTE_BOOST = 30;            // monedas que cuesta cada boost
export const MONEDAS_POR_ESTRELLAS = [8, 15, 25]; // monedas totales por nivel con 1, 2 y 3 estrellas (iguales en todos los niveles)

// Colores de piedras preciosas; cada uno lleva además una marca distinta (ver dibujarBola) para distinguirlos sin color
export const PALETA = ["#2fbf5b", "#3b82f6", "#e5484d", "#f5c518", "#a855f7", "#e8e4d8"];

export const NIVELES = [
  {
    id: "mx-aguascalientes-001",
    nombre: "Aguascalientes · Nivel 1",
    rondas: [
      { colores: 3, bolas: 100, velocidad: 9, rush: 140, semilla: 101, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 4, bolas: 55, velocidad: 9, rush: 150, semilla: 102, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 5, bolas: 100, velocidad: 6, rush: 160, semilla: 103, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-002",
    nombre: "Aguascalientes · Nivel 2",
    rondas: [
      { colores: 3, bolas: 100, velocidad: 6, rush: 140, semilla: 201, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 4, bolas: 55, velocidad: 6, rush: 150, semilla: 202, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 5, bolas: 100, velocidad: 6, rush: 160, semilla: 203, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-003",
    nombre: "Aguascalientes · Nivel 3",
    rondas: [
      { colores: 3, bolas: 100, velocidad: 6, rush: 140, semilla: 301, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 4, bolas: 70, velocidad: 6, rush: 150, semilla: 302, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 5, bolas: 100, velocidad: 4, rush: 160, semilla: 303, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-004",
    nombre: "Aguascalientes · Nivel 4",
    rondas: [
      { colores: 3, bolas: 85, velocidad: 4, rush: 140, semilla: 401, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 5, bolas: 40, velocidad: 9, rush: 150, semilla: 402, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 85, velocidad: 4, rush: 160, semilla: 403, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-005",
    nombre: "Aguascalientes · Nivel 5",
    rondas: [
      { colores: 4, bolas: 40, velocidad: 4, rush: 140, semilla: 501, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 5, bolas: 55, velocidad: 4, rush: 150, semilla: 502, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 70, velocidad: 9, rush: 160, semilla: 503, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-006",
    nombre: "Aguascalientes · Nivel 6",
    rondas: [
      { colores: 4, bolas: 55, velocidad: 4, rush: 140, semilla: 601, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 4, bolas: 55, velocidad: 4, rush: 150, semilla: 602, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 70, velocidad: 9, rush: 160, semilla: 603, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-007",
    nombre: "Aguascalientes · Nivel 7",
    rondas: [
      { colores: 3, bolas: 100, velocidad: 4, rush: 140, semilla: 701, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 5, bolas: 40, velocidad: 9, rush: 150, semilla: 702, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 85, velocidad: 9, rush: 160, semilla: 703, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-008",
    nombre: "Aguascalientes · Nivel 8",
    rondas: [
      { colores: 3, bolas: 70, velocidad: 6, rush: 140, semilla: 801, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 5, bolas: 40, velocidad: 6, rush: 150, semilla: 802, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 70, velocidad: 4, rush: 160, semilla: 803, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-009",
    nombre: "Aguascalientes · Nivel 9",
    rondas: [
      { colores: 3, bolas: 100, velocidad: 4, rush: 140, semilla: 901, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 4, bolas: 55, velocidad: 9, rush: 150, semilla: 902, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 85, velocidad: 4, rush: 160, semilla: 903, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
  {
    id: "mx-aguascalientes-010",
    nombre: "Aguascalientes · Nivel 10",
    rondas: [
      { colores: 4, bolas: 40, velocidad: 6, rush: 140, semilla: 1001, trayecto: { cx: 320, cy: 240, rx: [285,110], ry: [205,85], vueltas: 2.5 } },
      { colores: 6, bolas: 40, velocidad: 9, rush: 150, semilla: 1002, trayecto: { cx: 320, cy: 240, rx: [290,105], ry: [208,82], vueltas: 2.75 } },
      { colores: 6, bolas: 85, velocidad: 9, rush: 160, semilla: 1003, trayecto: { cx: 320, cy: 240, rx: [292,100], ry: [210,80], vueltas: 3 } },
    ],
  },
];
