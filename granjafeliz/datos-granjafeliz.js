// Ruta: granjafeliz/datos-granjafeliz.js
// Datos del juego (sin document): productos, animales, edificios, mejoras y niveles. Para agregar algo nuevo se agrega aquí; ver README-granjafeliz.md.
export const ANCHO = 800, ALTO = 450;   // tamaño lógico del escenario (horizontal, 16:9)
export const MAX_AGUA = 3;              // cargas de agua que da el pozo
export const SEG_POZO = 4;              // segundos que tarda el pozo en llenarse
export const SEG_SUELO = 12;            // segundos que dura un producto en el suelo antes de desaparecer (decidido: más ágil que el original)
export const MAX_PASTO = 16;            // matas de pasto a la vez
export const CAPACIDAD_ALMACEN = 30;    // PESO que cabe en el almacén (nivel base)
export const CAPACIDAD_CAMION = 10;     // PESO que lleva el camión por viaje (nivel base)
export const MAX_COLA_EDIF = 2;         // lotes que pueden esperar en un edificio mientras trabaja (además del que está en marcha)

// Productos: valor = $ al venderlo, peso = lo que ocupa en el almacén y en el camión.
export const PRODUCTOS = {
  huevo:     { nombre: "Huevo",          emoji: "🥚", valor: 10,    peso: 1 },
  polvo:     { nombre: "Polvo de huevo", emoji: "🧂", valor: 20,    peso: 2 },
  pan:       { nombre: "Pan",            emoji: "🍞", valor: 100,   peso: 10 },
  huevoPavo: { nombre: "Huevo de pavo",  emoji: "🥚", valor: 50,    peso: 5 },
  lana:      { nombre: "Lana",           emoji: "🧶", valor: 1000,  peso: 10 },
  hilo:      { nombre: "Hilo",           emoji: "🧵", valor: 2000,  peso: 20 },
  tela:      { nombre: "Tela",           emoji: "🧣", valor: 10000, peso: 50 },
  leche:     { nombre: "Leche",          emoji: "🥛", valor: 10000, peso: 50 },
  // Faltan receta y peso confirmado: queso / mantequilla (vaca, ~$100,000, peso 80), pastel de pavo (~$500), pastel de pan ($300), ropa.
};

// Animales. Nunca mueren de hambre. segHambre = segundos produciendo hasta tener hambre; con hambre y SIN pasto se quedan quietos y su ciclo se PAUSA.
// segCiclo = segundos de producción (solo corren mientras no tienen hambre); mordidas = mordidas de pasto para quedar llenos (cada pasto da 4; si un
// pasto se acaba a mitad de comida, el animal sigue en otro sin perder lo comido); precio y max = comprar dentro del nivel; tam = tamaño del emoji.
// Precio, ciclo y producto vienen de la conversación con Gemini (sin confirmar contra el original). Mordidas, velocidad, max, tam y el emoji son MÍOS:
// cada animal come 2 veces por hambre (segHambre = 2 × segCiclo) y los grandes comen más y caminan más lento. Se ajustan aquí.
export const ANIMALES = {
  gallina: { nombre: "Gallina", emoji: "🐔", precio: 100,    max: 12, producto: "huevo",     mordidas: 2, segHambre: 10, segCiclo: 5,  vel: 34, tam: 30 },
  pavo:    { nombre: "Pavo",    emoji: "🦃", precio: 1000,   max: 8,  producto: "huevoPavo", mordidas: 3, segHambre: 14, segCiclo: 7,  vel: 30, tam: 32 },
  oveja:   { nombre: "Oveja",   emoji: "🐑", precio: 10000,  max: 6,  producto: "lana",      mordidas: 4, segHambre: 24, segCiclo: 12, vel: 26, tam: 34 },
  vaca:    { nombre: "Vaca",    emoji: "🐄", precio: 100000, max: 4,  producto: "leche",     mordidas: 5, segHambre: 40, segCiclo: 20, vel: 22, tam: 38 },
};

// Edificios de procesamiento. entra → sale, seg = tiempo base de cada lote, costo = construcción (nivel base),
// fabrica = qué fila de MEJORAS usa para subir de nivel (fabrica1 = panadería / hilandería, fabrica2 = horno / tejeduría).
// Cada nivel que lo usa lista sus edificios en NIVELES[n].edificios (máx. 4, en ese orden, de izquierda a derecha).
// Se construyen tocando su espacio vacío (se paga con el dinero del nivel). Al tocar el edificio se descuenta del ALMACÉN hasta «lote» unidades
// de «entra» (lote depende de su nivel, ver MEJORAS.fabricaN.lote) y empieza el temporizador; al terminar, el producto sale al suelo junto al edificio.
// Si ya está trabajando, el siguiente toque forma una cola de hasta MAX_COLA_EDIF lotes (los insumos se descuentan al tocar).
export const EDIFICIOS = {
  panaderia:  { nombre: "Panadería",  emoji: "🍞", entra: "huevo", sale: "polvo", seg: 3, costo: 200,  fabrica: "fabrica1" },
  horno:      { nombre: "Horno",      emoji: "🔥", entra: "polvo", sale: "pan",   seg: 6, costo: 1000, fabrica: "fabrica2" },
  hilanderia: { nombre: "Hilandería", emoji: "🧵", entra: "lana",  sale: "hilo",  seg: 4, costo: 200,  fabrica: "fabrica1" },
  tejeduria:  { nombre: "Tejeduría",  emoji: "🧣", entra: "hilo",  sale: "tela",  seg: 8, costo: 1000, fabrica: "fabrica2" },
};

// Mejoras por nivel (índice 0 = base). costo[i] = lo que se paga por SUBIR al nivel i. Almacén, camión y fábricas (edificios) ya se aplican en el juego
// (franja «⬆» de cada caja o edificio); el pozo todavía no. El tiempo de viaje del camión (6 s en el nivel base, más ágil que el original) es camion.seg; ya no hay SEG_CAMION.
export const MEJORAS = {
  almacen: { capacidad: [30, 100, 300, 1000, 3000], costo: [0, 500, 2000, 8000, 25000] },
  camion:  { capacidad: [10, 30, 100, 500, 2000], seg: [6, 5, 4, 3, 2], costo: [0, 300, 1500, 6000, 20000] },   // seg = viaje de ida y vuelta
  pozo:    { usos: [5, 9, 15, 25, 50],               costo: [0, 50, 150, 500, 2000] },   // el original cobra $1 por rellenar; aquí el pozo es gratis y de 4 s
  // costo[0] = construirlo (igual que EDIFICIOS.costo); costo[i] = subir al nivel i. lote[i] = unidades que procesa cada toque en ese nivel (mismo tiempo por lote).
  // Los lotes (1, 2, 3, 4, 5) son una propuesta mía: el README no los fijaba. Se cambian aquí sin tocar el juego.
  fabrica1: { lote: [1, 2, 3, 4, 5], costo: [200, 500, 1500, 5000, 15000] },     // panadería / hilandería
  fabrica2: { lote: [1, 2, 3, 4, 5], costo: [1000, 3000, 10000, 30000, 100000] }, // horno / tejeduría
};

// Niveles (el del mapa estándar es el número). Meta = ventas totales. Estrellas por tiempo: 3★ si ganas antes de estrellasSeg[0], 2★ antes de [1], 1★ si no.
export const NIVELES = {
  // Calibrado con jugador automático (nov 2026): quien juega rápido tarda ~1:45-2:15, un ritmo normal ~2:15-3:00. Falta probarlo con personas.
  1: { meta: 1000, tiempo: 300, dineroInicial: 150, aguaInicial: 3, animales: { gallina: 2 }, estrellasSeg: [150, 220] },
  // PROVISIONAL (sin calibrar): primer nivel con edificios. Huevo → polvo (panadería) → pan (horno). Ver README, «Nivel 2».
  2: { meta: 3000, tiempo: 420, dineroInicial: 400, aguaInicial: 3, animales: { gallina: 3 }, edificios: ["panaderia", "horno"], estrellasSeg: [300, 380] },
  // PROVISIONAL (banco de pruebas, sin calibrar): todos los animales y los 4 edificios. comprables = qué animales se pueden comprar en el nivel (por defecto solo la gallina).
  // mejoras = niveles de almacén y camión con los que EMPIEZA el nivel (por defecto 0): la leche y la tela pesan 50, no caben en el almacén base (30).
  3: { meta: 150000, tiempo: 600, dineroInicial: 120000, aguaInicial: 3, animales: { gallina: 3, pavo: 1, oveja: 1, vaca: 1 }, comprables: ["gallina", "pavo", "oveja", "vaca"],
       edificios: ["panaderia", "horno", "hilanderia", "tejeduria"], mejoras: { almacen: 2, camion: 2 }, estrellasSeg: [420, 540] },
};
