// Ruta: granjafeliz/datos-granjafeliz.js
// Datos del juego (sin document): productos, animales, edificios, mejoras y niveles. Para agregar algo nuevo se agrega aquí; ver README-granjafeliz.md.
export const ANCHO = 800, ALTO = 450;   // tamaño lógico del escenario (horizontal, 16:9)
export const MAX_AGUA = 3;              // cargas de agua del pozo en su nivel base (= MEJORAS.pozo.capacidad[0]); con las mejoras la capacidad sale de MEJORAS.pozo
export const SEG_POZO = 4;              // segundos que tarda el pozo en llenarse (siempre hasta su capacidad; no cambia con las mejoras)
export const SEG_SUELO = 12;            // segundos que dura un producto en el suelo antes de desaparecer (decidido: más ágil que el original)
export const MAX_PASTO = 16;            // matas de pasto a la vez
export const CAPACIDAD_ALMACEN = 30;    // PESO que cabe en el almacén (nivel base)
export const CAPACIDAD_CAMION = 10;     // PESO que lleva el camión por viaje (nivel base)
export const VENTA_ANIMAL = 0.5;        // al vender un animal te pagan esta fracción de su precio (propuesta mía; ajustar aquí)
export const MAX_COLA_EDIF = 2;         // lotes que pueden esperar en un edificio mientras trabaja (además del que está en marcha)

// Productos: valor = $ al venderlo, peso = lo que ocupa en el almacén y en el camión.
// VALORES de Farm Frenzy 1 (guía de Cyberly): huevo 10, polvo 20, pastelito 80, lana 100, hilo 200, tela 800, leche 1,000, oso enjaulado 100. Los PESOS siguen siendo los del README (no existen en el original). Faltan mantequilla ($2,000) y queso ($8,000).
export const PRODUCTOS = {
  huevo:     { nombre: "Huevo",          emoji: "🥚", valor: 10,    peso: 1 },
  polvo:     { nombre: "Polvo de huevo", emoji: "🧂", valor: 20,    peso: 2 },
  pan:       { nombre: "Pastelito",      emoji: "🧁", valor: 80,    peso: 10 },
  lana:      { nombre: "Lana",           emoji: "🧶", valor: 100,   peso: 10 },
  hilo:      { nombre: "Hilo",           emoji: "🧵", valor: 200,   peso: 20 },
  tela:      { nombre: "Tela",           emoji: "🧣", valor: 800,   peso: 50 },
  leche:     { nombre: "Leche",          emoji: "🥛", valor: 1000,  peso: 50 },
  // Osos enjaulados (se recogen y se venden como un producto; «jaula» = se dibuja con barrotes). El oso (el único de la versión 1) vale $100 y pesa 10 para que quepa en el camión base (antes 15: no cabía y no se podía vender en los primeros niveles). Polar y panda NO existen en la versión 1: sus valores ($200 / $300) y pesos (25 / 30) son míos.
  osoEnjaulado:   { nombre: "Oso enjaulado",       emoji: "🐻",   valor: 100, peso: 10, jaula: true },
  polarEnjaulado: { nombre: "Oso polar enjaulado", emoji: "🐻‍❄️", valor: 200, peso: 25, jaula: true },
  pandaEnjaulado: { nombre: "Panda enjaulado",     emoji: "🐼",   valor: 300, peso: 30, jaula: true },
  // Faltan receta y peso confirmado: queso / mantequilla (vaca, ~$100,000, peso 80), pastel de pan ($300), ropa.
};

// Animales. Nunca mueren de hambre. segHambre = segundos produciendo hasta tener hambre; con hambre y SIN pasto se quedan quietos y su ciclo se PAUSA.
// segCiclo = segundos de producción (solo corren mientras no tienen hambre); mordidas = mordidas de pasto para quedar llenos (cada pasto da 4; si un
// pasto se acaba a mitad de comida, el animal sigue en otro sin perder lo comido); precio y max = comprar dentro del nivel; tam = tamaño del emoji.
// PRECIOS de Farm Frenzy 1: pato/gallina $100, oveja $1,000, vaca $10,000 (se venden a la mitad). El pavo se QUITÓ porque no existe en la versión 1 (animales de la versión 1: gallina, oveja y vaca). Ciclo y producto de oveja y vaca vienen de la conversación con Gemini (sin confirmar contra el original). Mordidas, velocidad, max, tam y el emoji son MÍOS:
// cada animal come 2 veces por hambre (segHambre = 2 × segCiclo) y los grandes comen más y caminan más lento. Se ajustan aquí.
export const ANIMALES = {
  gallina: { nombre: "Gallina", emoji: "🐔", precio: 100,    max: 12, producto: "huevo",     mordidas: 2, segHambre: 10, segCiclo: 5,  vel: 34, tam: 30 },
  oveja:   { nombre: "Oveja",   emoji: "🐑", precio: 1000,   max: 6,  producto: "lana",      mordidas: 4, segHambre: 24, segCiclo: 12, vel: 26, tam: 34 },
  vaca:    { nombre: "Vaca",    emoji: "🐄", precio: 10000,  max: 4,  producto: "leche",     mordidas: 5, segHambre: 40, segCiclo: 20, vel: 22, tam: 38 },
};

// Osos, perro y gato. Un nivel activa los osos con NIVELES[n].osos = { tipos: ["oso", ...] } (opcional: primero = segundos hasta el primero) y el gato con gato: true;
// el perro está disponible en todo nivel con osos. Del README: primer oso a los ~25 s y luego cada 35-50 s; destruye el pasto en un radio de 2 casillas,
// elimina animales y borra los productos que pisa; se captura a clics (queda enjaulado y se vende, pesos 15 / 25-30); el perro llega en 2-3 s y lo
// bloquea 5-8 s; el gato recoge solo los productos del suelo. MÍO (ajustar aquí): CASILLA (el escenario no tiene casillas: 1 casilla = 32 px), los clics
// para capturar, la velocidad de cada oso, el costo del perro (por uso) y del gato (una vez por nivel), y que el gato no recoge las jaulas.
export const CASILLA = 32;
export const RADIO_OSO = 2 * CASILLA;      // destruye pasto dentro de este radio (px)
export const PRIMER_OSO = 25;              // segundos hasta el primer oso
export const OSOS_CADA = [35, 50];         // segundos entre un oso y el siguiente (al azar en este rango)
export const OSOS = {
  oso:   { nombre: "Oso",       emoji: "🐻",   golpes: 3,  vel: 38, producto: "osoEnjaulado" },
  polar: { nombre: "Oso polar", emoji: "🐻‍❄️", golpes: 9,  vel: 34, producto: "polarEnjaulado" },
  panda: { nombre: "Panda",     emoji: "🐼",   golpes: 12, vel: 30, producto: "pandaEnjaulado" },
};
export const PERRO = { costo: 100, llega: [2, 3], bloquea: [5, 8] };   // costo = cada vez que se llama; llega y bloquea en segundos
export const GATO = { costo: 2500, vel: 85 };                          // costo = una vez por nivel (precio del gato en la versión 1: $2,500); vel en px/s. El perro de la versión 1 cuesta $2,600 y se compra una vez; aquí sigue siendo $100 por llamada (por decidir)

// Edificios de procesamiento. entra → sale, seg = tiempo base de cada lote, costos = lo que cuesta construirlo (costos[0]) y subir a cada nivel (costos[1..4]); costo = costos[0]. COSTOS de Farm Frenzy 1.
// Nombres como en el original: «panaderia» (id) es la PLANTA DE POLVO DE HUEVO y «horno» (id) es la PANADERÍA (los ids no cambian para no romper nada).
// fabrica = qué fila de MEJORAS usa para subir de nivel (fabrica1 = panadería / hilandería, fabrica2 = horno / tejeduría).
// Cada nivel que lo usa lista sus edificios en NIVELES[n].edificios (máx. 4, en ese orden, de izquierda a derecha).
// Se construyen tocando su espacio vacío (se paga con el dinero del nivel). Al tocar el edificio se descuenta del ALMACÉN hasta «lote» unidades
// de «entra» (lote depende de su nivel, ver MEJORAS.fabricaN.lote) y empieza el temporizador; al terminar, el producto sale al suelo junto al edificio.
// Si ya está trabajando, el siguiente toque forma una cola de hasta MAX_COLA_EDIF lotes (los insumos se descuentan al tocar).
export const EDIFICIOS = {
  panaderia:  { nombre: "Planta de polvo", emoji: "🏭", entra: "huevo", sale: "polvo", seg: 3, costo: 200,  costos: [200, 300, 400, 500, 600],           fabrica: "fabrica1" },
  horno:      { nombre: "Panadería",  emoji: "🧁", entra: "polvo", sale: "pan",   seg: 6, costo: 400,  costos: [400, 600, 800, 1000, 1200],         fabrica: "fabrica2" },
  hilanderia: { nombre: "Hilandería", emoji: "🧵", entra: "lana",  sale: "hilo",  seg: 4, costo: 2000, costos: [2000, 3000, 4000, 5000, 6000],      fabrica: "fabrica1" },
  tejeduria:  { nombre: "Tejeduría",  emoji: "🧣", entra: "hilo",  sale: "tela",  seg: 8, costo: 4000, costos: [4000, 6000, 8000, 10000, 12000],    fabrica: "fabrica2" },
};

// Mejoras por nivel (índice 0 = base). costo[i] = lo que se paga por SUBIR al nivel i. Almacén, camión, pozo y fábricas (edificios) ya se aplican en el juego
// (franja «⬆» de cada caja o edificio). El tiempo de viaje del camión (6 s en el nivel base, más ágil que el original) es camion.seg; ya no hay SEG_CAMION.
export const MEJORAS = {
  // COSTOS de Farm Frenzy 1 (almacén $150 / $500 / $1,000 / $2,000; camión $300 / $800 / $1,500 / $5,000; pozo $300 / $600 / $1,200 / $5,000). Las capacidades y tiempos son propios.
  almacen: { capacidad: [30, 100, 300, 1000, 3000], costo: [0, 150, 500, 1000, 2000] },
  camion:  { capacidad: [10, 30, 100, 500, 2000], seg: [6, 5, 4, 3, 2], costo: [0, 300, 800, 1500, 5000] },   // seg = viaje de ida y vuelta
  pozo:    { capacidad: [3, 9, 15, 25, 50],          costo: [0, 300, 600, 1200, 5000] },   // capacidad = cargas de agua que guarda el pozo (cada pasto gasta 1). El nivel base es 3 (no 5) para no cambiar los niveles 1-10 ya calibrados. El original cobra $1 por rellenar; aquí el pozo es gratis y de 4 s
  // lote[i] = unidades que procesa cada toque en el nivel i (mismo tiempo por lote): 1 a 5, igual que el original («usa 1, 2, 3, 4, 5 a la vez»). Los COSTOS de cada edificio están en EDIFICIOS.costos.
  fabrica1: { lote: [1, 2, 3, 4, 5] },   // planta de polvo / hilandería
  fabrica2: { lote: [1, 2, 3, 4, 5] },   // panadería / tejeduría
};

// Niveles (el del mapa estándar es el número). MODELO DEL ORIGINAL (Farm Frenzy 1): el tiempo NO es un límite, solo da medalla.
//   metas = lista; el nivel termina cuando se cumplen TODAS. Tipos:
//     { tipo: "dinero",   n: 1000 }                 vender en total $n (lo que paga el camión)
//     { tipo: "producto", id: "huevo", n: 4 }       recoger n unidades de ese producto al almacén (cuenta lo recogido, aunque luego se venda; también lo que recoge el gato)
//     { tipo: "animal",   id: "gallina", n: 5 }     tener n animales de ese tipo vivos a la vez
//     { tipo: "edificio", id: "panaderia" }          construir ese edificio
//   CONDICIONES DE INICIO (opcionales): dineroInicial, aguaInicial, animales ({ tipo: cantidad }), edificios (los que hay en el nivel),
//     construidos: [ids]   edificios que YA están construidos al empezar (deben estar también en «edificios»; nivel de mejora 0)
//     regalo: ["gato", "perro"]   gato: empieza ya contigo; perro: sus llamadas son gratis (hace falta que el nivel tenga osos)
//     mejoras: { almacen, camion, pozo }   niveles de mejora con los que empieza (0 = base)
//   Vender animales: cada botón de compra trae una zona 💲 que vende un animal de ese tipo (VENTA_ANIMAL del precio).
//   perro: false  oculta el botón 🐕 aunque haya osos (en los niveles 1-10 de la versión 1 no hay perro).
//   osos: { tipos: ["oso"], primero: 25 }  primer oso a los 25 s (luego cada 35-50 s).
//   osos: { tipos: ["oso"], horario: [8, 23, 23, 53], cada: [18, 30] }  CALENDARIO: cae un oso en cada segundo de la lista (repetir un número = dos a la vez, como en el original); al acabarse la lista siguen cayendo cada «cada» segundos (por defecto OSOS_CADA). Los horarios de los niveles 2-10 son los de la guía de la versión 1.
//   pista: "texto"  consejo de tutorial que sale al empezar el nivel, debajo de las metas.
//   Medalla por tiempo: oro (3★) si terminas en oroSeg segundos o menos, plata (2★) en plataSeg o menos, «completado» (1★) si tardas más.
//   Monedas del portal: 45 / 30 / 15 según la medalla (economia-granjafeliz.js).
export const NIVELES = {
  // ===== Niveles 1-10 = niveles 1-10 de Farm Frenzy 1 (guía de Cyberly): mismas metas, mismo dinero y animales de inicio, mismos tiempos de oro / plata. =====
  // «Pato» = gallina, «cupcake» = pastelito (pan), «egg solids» = polvo de huevo. Los osos del original caen en momentos fijos; aquí el primero cae en «primero» y luego cada 35-50 s.
  // El original compra las plantas en una tienda con estrellas; aquí se construyen dentro del nivel (planta $200, panadería $400). CALIBRACIÓN APROXIMADA: el original da oro/plata muy holgados para este juego (más ágil: camión 6 s, producto 12 s en el suelo). Niveles 5-8: tiempos del original; 1-4, 9 y 10: apretados según un jugador automático (ver README). Falta probarlos con personas.
  1: { metas: [{ tipo: "producto", id: "huevo", n: 4 }], dineroInicial: 170, aguaInicial: 3, animales: { gallina: 2 }, perro: false, oroSeg: 40, plataSeg: 90,
       pista: "Toca el pozo y luego el campo para plantar pasto. Toca los huevos para recogerlos. Compra otra gallina." },
  2: { metas: [{ tipo: "producto", id: "huevo", n: 10 }, { tipo: "animal", id: "gallina", n: 5 }], dineroInicial: 190, aguaInicial: 3, animales: { gallina: 2 }, osos: { tipos: ["oso"], horario: [31], cada: [30, 45] }, perro: false, oroSeg: 70, plataSeg: 130,
       pista: "Toca el camión para vender. Si cae un oso, tócalo varias veces para enjaularlo; la jaula también se vende." },
  3: { metas: [{ tipo: "producto", id: "polvo", n: 4 }, { tipo: "dinero", n: 300 }], dineroInicial: 190, aguaInicial: 3, animales: { gallina: 3 }, edificios: ["panaderia"], osos: { tipos: ["oso"], horario: [50, 100], cada: [40, 55] }, perro: false, oroSeg: 100, plataSeg: 160,
       pista: "Construye la planta de polvo ($200) tocando su espacio vacío. Luego tócala para convertir huevos en polvo." },
  4: { metas: [{ tipo: "animal", id: "gallina", n: 2 }, { tipo: "producto", id: "polvo", n: 10 }, { tipo: "dinero", n: 500 }], dineroInicial: 290, aguaInicial: 3, animales: { gallina: 1 }, edificios: ["panaderia"], osos: { tipos: ["oso"], horario: [21, 105, 126, 153], cada: [30, 45] }, perro: false, oroSeg: 150, plataSeg: 220,
       pista: "La franja ⬆ de la planta la mejora: procesa 2 huevos de un toque." },
  5: { metas: [{ tipo: "producto", id: "pan", n: 3 }, { tipo: "animal", id: "gallina", n: 6 }], dineroInicial: 190, aguaInicial: 3, animales: { gallina: 2 }, edificios: ["panaderia", "horno"], osos: { tipos: ["oso"], horario: [8, 23, 23, 53, 96, 96, 126], cada: [20, 30] }, perro: false, oroSeg: 150, plataSeg: 240,
       pista: "Construye también la panadería ($400): convierte el polvo en pastelitos." },
  6: { metas: [{ tipo: "animal", id: "gallina", n: 5 }, { tipo: "producto", id: "polvo", n: 15 }, { tipo: "producto", id: "pan", n: 12 }], dineroInicial: 240, aguaInicial: 3, animales: { gallina: 1 }, edificios: ["panaderia", "horno"], osos: { tipos: ["oso"], horario: [17, 47, 47, 75, 75], cada: [20, 30] }, perro: false, oroSeg: 270, plataSeg: 330 },
  7: { metas: [{ tipo: "producto", id: "polvo", n: 10 }, { tipo: "producto", id: "huevo", n: 30 }, { tipo: "animal", id: "oveja", n: 1 }], dineroInicial: 290, aguaInicial: 3, animales: { gallina: 3 }, comprables: ["gallina", "oveja"], edificios: ["panaderia", "horno"], osos: { tipos: ["oso"], horario: [12, 75, 75, 145], cada: [25, 40] }, perro: false, oroSeg: 240, plataSeg: 340,
       pista: "Ahora puedes comprar una oveja ($1,000): su lana vale más que los huevos." },
  8: { metas: [{ tipo: "producto", id: "pan", n: 2 }, { tipo: "animal", id: "gallina", n: 7 }], dineroInicial: 20, aguaInicial: 3, animales: { oveja: 1 }, comprables: ["gallina", "oveja"], edificios: ["panaderia", "horno"], osos: { tipos: ["oso"], horario: [12, 12], cada: [18, 30] }, perro: false, oroSeg: 170, plataSeg: 240,
       pista: "Empiezas casi sin dinero. Con el botón 💲 puedes vender la oveja para juntar dinero." },
  9: { metas: [{ tipo: "animal", id: "oveja", n: 1 }], dineroInicial: 220, aguaInicial: 3, animales: {}, comprables: ["gallina", "oveja"], edificios: ["panaderia", "horno"], regalo: ["gato"], osos: { tipos: ["oso"], horario: [5, 15, 31, 31], cada: [20, 30] }, perro: false, oroSeg: 200, plataSeg: 280,
       pista: "El gato recoge los productos del suelo por ti. Junta $1,000 para comprar la oveja." },
  10: { metas: [{ tipo: "producto", id: "huevo", n: 20 }, { tipo: "producto", id: "polvo", n: 5 }, { tipo: "animal", id: "gallina", n: 8 }], dineroInicial: 40, aguaInicial: 3, animales: { gallina: 6 }, edificios: ["panaderia"], osos: { tipos: ["oso"], horario: [17, 17], cada: [25, 40] }, perro: false, oroSeg: 120, plataSeg: 200,
       pista: "Empiezas con 6 gallinas y casi sin dinero: vende jaulas de oso y gallinas (💲) para construir la planta." },
};

// ===== MODO LIBRE (♾️ del menú principal) =====
// Partida SIN metas y SIN límite de tiempo, sobre el mismo escenario que los niveles. NO da monedas ni estrellas (estándar del portal, ESTANDARES-juegos.md).
// Lo que se guarda es una MARCA por dificultad: lo máximo que has VENDIDO con el camión en una sola partida (se anota sola con cada venta; va en el
// progreso con la clave «libre» y se sincroniza con la cuenta). Cada dificultad es un «nivel» a medida con los mismos campos que NIVELES (dineroInicial,
// aguaInicial, animales, comprables, edificios, mejoras, regalo, gato, osos…; ver el comentario de NIVELES). «gato: true» = el gato se puede comprar.
// La dificultad cambia: dinero y animales de inicio, qué animales y edificios hay, mejoras ya compradas y los osos (cuáles, cuándo y cada cuánto).
// El orden de esta lista es el orden de los botones. Las cifras son MÍAS (propuesta): ajustarlas jugando.
export const LIBRE = {
  muyfacil: { nombre: "Muy fácil", dineroInicial: 1000, aguaInicial: 3, animales: { gallina: 4 }, comprables: ["gallina", "oveja"], edificios: ["panaderia", "horno"], regalo: ["gato"], mejoras: { almacen: 1, camion: 1, pozo: 1 },
              pista: "Sin osos y con gato de regalo. Vende lo más que puedas." },
  facil:    { nombre: "Fácil", dineroInicial: 500, aguaInicial: 3, animales: { gallina: 3 }, comprables: ["gallina", "oveja"], edificios: ["panaderia", "horno", "hilanderia"], gato: true, mejoras: { almacen: 1, camion: 1 },
              osos: { tipos: ["oso"], primero: 90, cada: [60, 90] },
              pista: "Un oso cada 1 o 1.5 minutos: tócalo varias veces para enjaularlo." },
  normal:   { nombre: "Normal", dineroInicial: 250, aguaInicial: 3, animales: { gallina: 2 }, comprables: ["gallina", "oveja", "vaca"], edificios: ["panaderia", "horno", "hilanderia", "tejeduria"], gato: true,
              osos: { tipos: ["oso"], primero: 60, cada: [45, 60] },
              pista: "Ya hay vacas y los cuatro edificios. La leche y la tela pesan 50: mejora el almacén y el camión." },
  dificil:  { nombre: "Difícil", dineroInicial: 150, aguaInicial: 3, animales: { gallina: 1 }, comprables: ["gallina", "oveja", "vaca"], edificios: ["panaderia", "horno", "hilanderia", "tejeduria"], gato: true,
              osos: { tipos: ["oso", "polar"], primero: 40, cada: [35, 50] },
              pista: "Aparecen osos polares (9 toques) y empiezas con una sola gallina." },
  experto:  { nombre: "Experto", dineroInicial: 100, aguaInicial: 3, animales: { gallina: 1 }, comprables: ["gallina", "oveja", "vaca"], edificios: ["panaderia", "horno", "hilanderia", "tejeduria"], gato: true,
              osos: { tipos: ["oso", "polar", "panda"], primero: 30, cada: [25, 40] },
              pista: "Osos, polares y pandas (12 toques) cada 25 a 40 segundos." },
};
