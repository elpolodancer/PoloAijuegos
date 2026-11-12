// Ruta: granjafeliz/datos-granjafeliz.js
// Datos del juego (sin document): animales, productos y niveles. Para agregar algo nuevo se agrega aquí; ver README-granjafeliz.md.
export const ANCHO = 800, ALTO = 450;   // tamaño lógico del escenario (horizontal, 16:9)
export const MAX_AGUA = 3;              // cargas de agua que da el pozo
export const SEG_POZO = 4;              // segundos que tarda el pozo en llenarse
export const SEG_CAMION = 6;            // viaje de ida y vuelta del camión
export const MAX_PASTO = 16;            // matas de pasto a la vez
export const CAPACIDAD_ALMACEN = 20;    // productos que caben en el almacén

export const PRODUCTOS = {
  huevo: { nombre: "Huevo", emoji: "🥚", valor: 10 },
};

// Animales EXISTENTES: por ahora solo la gallina. segHambre = segundos para tener hambre; muereSeg = hambre extra antes de morir
export const ANIMALES = {
  gallina: { nombre: "Gallina", emoji: "🐔", precio: 100, max: 12, producto: "huevo", mordidas: 2, segHambre: 14, segPone: 3, vel: 34, muereHambre: 2.2 },
};

// Niveles (el del mapa estándar es el número). Meta = ventas totales. Estrellas por tiempo: 3★ si ganas antes de estrellasSeg[0], 2★ antes de [1], 1★ si no.
export const NIVELES = {
  1: { meta: 500, tiempo: 300, dineroInicial: 150, aguaInicial: 3, animales: { gallina: 2 }, estrellasSeg: [180, 240] },
};
