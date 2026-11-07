// Ruta: zuma/niveles-zuma.js
// Niveles del Zuma. Cada nivel es solo datos: el generador futuro producirá objetos con esta misma forma
// (100 por estado de México y 100 por país). Por ahora hay un único nivel de prueba.
//
//   nombre     texto que se ve en pantalla
//   colores    cuántos colores distintos hay (máx. = PALETA.length)
//   bolas      cuántas bolas trae la cadena en total
//   velocidad  px/s de la cabeza de la cadena (el Zuma original anda entre 25 y 45 en los primeros niveles)
//   rush       px/s de la entrada rápida de los primeros 2.2 s
//   semilla    mismo número = misma cadena siempre
//   trayecto   forma del camino (ver crearTrayecto en logica-zuma.js)

export const ANCHO = 640;
export const ALTO = 480;
export const CENTRO = { x: 320, y: 240 }; // donde está la rana

// Colores de piedras preciosas; cada uno lleva además una marca distinta (ver dibujarBola) para distinguirlos sin color
export const PALETA = ["#2fbf5b", "#3b82f6", "#e5484d", "#f5c518", "#a855f7", "#e8e4d8"];

export const NIVELES = [
  {
    id: "mx-aguascalientes-001",
    nombre: "Aguascalientes · Nivel 1",
    colores: 4,
    bolas: 45,
    velocidad: 26,
    rush: 200,
    semilla: 1,
    trayecto: { cx: 320, cy: 240, rx: [285, 110], ry: [205, 85], vueltas: 2 },
  },
];
