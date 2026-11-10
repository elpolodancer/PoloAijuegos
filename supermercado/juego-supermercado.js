// Ruta: supermercado/juego-supermercado.js
// VISTA ISOMÉTRICA: la lógica sigue en un mapa plano (x, y); el dibujo y los toques se proyectan (ver «Vista isométrica» más abajo).
// «Supermercado»: tienda pequeña y vacía. Compras una estantería y un jardín; en el jardín crecen verduras,
// las recoges y las colocas en las estanterías. Los clientes toman sus productos, van a la caja y pagan.
// Recoger, colocar y comprar lo básico es automático por cercanía. En la zona de mejoras 🛠️ compras
// un empleado de caja, más estanterías y ampliar el edificio a la izquierda o a la derecha (la cámara te sigue).

import { crearMenuPausa } from "../compartido/menu-pausa.js";   // menú ☰ Pausa estándar (no usa Firebase: funciona sin internet)

// ---------- Ajustes (cámbialos a gusto) ----------
const MUNDO = { w: 360, h: 630 };   // tamaño de la PANTALLA (siempre vertical, como un celular) y del edificio inicial. Arriba hay una franja de pasto fija para los jardines
const DINERO_INICIAL = 15;          // alcanza justo para comprar la primera estantería y el jardín
const VELOCIDAD = 150;              // px/s del personaje
const CARGA_INICIAL = 3;            // productos que puedes cargar a la vez al empezar (cada mejora 🧤 suma 1)
const COSTOS_CARGA = [20, 30, 50, 60, 80, 100]; // lo que cuesta cada mejora de carga, en orden
const ESTANTE_CAP = 5;              // productos que caben en cada estantería
const EXT_H = 26;                   // cuánto crece hacia abajo la estantería de jitomates para los espacios extra de zanahoria
const EXTRA_ZANAHORIA_CAP = 2;      // espacios extra para zanahorias en la estantería de jitomates, hasta que compres la de zanahorias
const CRECE_SEG = 4;                // cada cuántos segundos sale una verdura nueva en el jardín
const MADURA_SEG = 1.5;             // lo que tarda en madurar una verdura recién salida
const MAX_CLIENTES = 3;             // clientes a la vez con el primer jardín (cada jardín nuevo desbloqueado suma 1 más)
const ESPERA_MIN = 3;               // segundos que tarda en llegar el siguiente cliente (al azar entre MIN y MAX)
const ESPERA_MAX = 6;
const CANT_MIN = 1;                 // unidades de cada producto en la lista de un cliente
const CANT_MAX = 3;
const TOMAR_SEG = 0.7;              // lo que tarda un cliente en tomar un producto de la estantería
const COBRO_SEG = 0.5;              // lo que tarda el cobro de TODA la compra de un cliente (se cobra junta, de una vez)
const TRASPASO_SEG = 0.2;           // un producto cada tanto al recoger del jardín / colocar en la estantería
const ALCANCE_ESTANTE = 40;         // distancia (px) a la que colocas productos
const ALCANCE_JARDIN = 22;          // distancia (px) a la que recoges del jardín
const ALCANCE_CAJA = 40;            // distancia (px) a la que cobras tú en la caja
const RADIO = 12;                   // tamaño del personaje
const EXT_ANCHO = 300;              // ancho (px del mapa) que añade cada ampliación del edificio, a la izquierda o a la derecha
const CAMARA_SUAVE = 8;             // qué tan rápido te sigue la cámara (más alto = más pegada al personaje)
const EMP_CARGA = 3;                // productos que lleva de golpe un empleado de jardín
const EMP_VEL = 85 * 0.5;           // velocidad (px/s) de los empleados de jardín: 50% de la original (85). Pon 85 para la velocidad de antes
// Niveles de empleados: son mejoras GLOBALES (valen para todos los cajeros y para todos los empleados que llevan producto).
// Un empleado de caja sin mejoras cobra LENTO (tú, parado junto a la caja, cobras siempre en COBRO_SEG).
const NIVELES_EMP = 50;                 // cuántas mejoras tiene cada tipo
const COBRO_EMP_SEG = 4;                // segundos que tarda un empleado de caja en cobrar a un cliente al nivel 0
const COBRO_EMP_MIN = 0.4;              // ... y al nivel 50 (baja ×0.955 por nivel)
const COBRO_EMP_R = Math.pow(COBRO_EMP_MIN / COBRO_EMP_SEG, 1 / NIVELES_EMP);
const EMP_VEL_PASO = 2.1;               // px/s que suma cada nivel a la velocidad de los empleados que llevan producto (nivel 50 ≈ tu velocidad)
const EMP_CARGA_CADA = 10;              // +1 producto de carga cada tantos niveles (3 → 8)
const EMP_TRASPASO_MIN = 0.1;           // lo más rápido que coloca/recoge un producto (al nivel 0 tarda 0.4 s; baja ×0.972 por nivel)
const EMP_TRASPASO_R = 0.972;
// Precio de cada nivel: crece ~12 % por nivel y se redondea (más bonito de leer)
const redondeaPrecio = (v) => (v < 50 ? Math.round(v) : v < 500 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10);
const COSTOS_NIVEL_CAJERO = Array.from({ length: NIVELES_EMP }, (_, i) => redondeaPrecio(10 * Math.pow(1.12, i)));       // $10 … ≈$2600 (total ≈ $24 000)
const COSTOS_NIVEL_REPARTIDOR = Array.from({ length: NIVELES_EMP }, (_, i) => redondeaPrecio(15 * Math.pow(1.125, i)));  // $15 … ≈$4800 (total ≈ $43 000)
const JARDIN_SEP = 4;               // separación (px) entre los jardines y el muro de arriba del edificio

// Costos
const COSTO_PRIMER_ESTANTE = 10;
const COSTO_JARDIN = 5;                // jardín de jitomates
const COSTO_JARDIN_ZANAHORIA = 20;      // jardín de zanahorias (hay que comprarlo antes de la estantería de zanahorias)
const COSTO_JARDIN_MAIZ = 40;
const COSTO_JARDIN_BROCOLI = 60;
const COSTO_JARDIN_BERENJENA = 80;
// Lo que cuesta el jardín de cada producto (el orden de compra es el de PRODUCTOS)
const COSTO_JARDIN_DE = {
  tomate: COSTO_JARDIN,
  zanahoria: COSTO_JARDIN_ZANAHORIA,
  cilantro: 28,
  maiz: COSTO_JARDIN_MAIZ,
  manzana: 50,
  brocoli: COSTO_JARDIN_BROCOLI,
  platano: 65,
  calabacita: 70,
  berenjena: COSTO_JARDIN_BERENJENA,
  pepino: 100,
  naranja: 106,
  chayote: 112,
  chile: 125,
  papa: 150,
  cebolla: 180,
  uvas: 188,
  lechuga: 195,
  fresa: 210,
  ajo: 230,
  limon: 250,
  melocoton: 262,
  betabel: 275,
  sandia: 300,
  champinon: 312,
  nopal: 325,
  granada: 338,
  aguacate: 350,
  arroz: 380,
  cana: 400,
  mango: 420,
  pina: 500,
};
// empleado que lleva del jardín a la estantería (uno por jardín)
const COSTO_EMP_JARDIN = {
  tomate: 15,
  zanahoria: 25,
  cilantro: 30,
  maiz: 35,
  manzana: 40,
  brocoli: 45,
  platano: 48,
  calabacita: 52,
  berenjena: 60,
  pepino: 75,
  naranja: 78,
  chayote: 82,
  chile: 90,
  papa: 105,
  cebolla: 120,
  uvas: 125,
  lechuga: 130,
  fresa: 140,
  ajo: 155,
  limon: 160,
  melocoton: 165,
  betabel: 170,
  sandia: 180,
  champinon: 185,
  nopal: 190,
  granada: 195,
  aguacate: 200,
  arroz: 210,
  cana: 220,
  mango: 230,
  pina: 260,
};
const COSTO_EMPLEADO = 30;
const COSTO_CAJA_EXTRA = (n) => 40 + 30 * n;     // cajas registradoras adicionales (n = las que ya compraste)
const COSTO_PUERTA_EXTRA = (n) => 25 + 25 * n;   // entradas adicionales
const COSTO_EMP_CAJA_EXTRA = 40;                 // empleado para cada caja adicional
const MAX_CAJAS_EXTRA = 3;
const MAX_PUERTAS_EXTRA = 3;
const COSTO_ESTANTE_EXTRA = (n) => 15 + 10 * n;   // n = estanterías extra que ya compraste
// Edificio: arriba queda siempre el pasto con los jardines. Cada ampliación lo ensancha hacia el lado que elijas
// (izquierda o derecha) y deja 2 estanterías más. Como queda más ancho que la pantalla, la cámara sigue al personaje.
const TOP = 324;                    // dónde empieza el edificio por arriba (fijo)
const COSTOS_EDIFICIO = [40, 80, 150, 250, 400, 600, 900, 1300, 2000];   // lo que cuesta cada ampliación del EDIFICIO, en orden (cada una da 4 estanterías: 2 filas de 2)
const COSTOS_PATIO = [30, 60, 100, 160, 250];      // lo que cuesta cada ampliación del PATIO (zona de pasto con los jardines), en orden; es aparte del edificio
const JARDIN_FILAS = 3;             // filas de jardines en cada tramo del patio (2 columnas × 3 filas = 6 jardines)
const JARDINES_POR_TRAMO = 2 * JARDIN_FILAS;   // jardines que caben en el patio inicial y en cada ampliación del patio
const JARDIN_HUECO = 8;             // separación (px) entre filas de jardines
const ESTANTES_POR_AMP = 4;         // estanterías que da cada ampliación del edificio
const FILA_BAJA_Y = 470;            // y de la 2.ª fila de estanterías de las ampliaciones (entre las dos filas queda un pasillo)


// Productos que existen (precio en dólares)
// El orden importa: la estantería número 1 es del 1.er producto, la 2 del 2.º, etc. (y cada jardín pide haber comprado la estantería del anterior)
const PRODUCTOS = {
  tomate: { icono: "🍅", precio: 1, nombre: "jitomate" },
  zanahoria: { icono: "🥕", precio: 2, nombre: "zanahoria" },
  cilantro: { icono: "🌿", precio: 3, nombre: "cilantro" },
  maiz: { icono: "🌽", precio: 4, nombre: "maíz" },
  manzana: { icono: "🍎", precio: 5, nombre: "manzana" },
  brocoli: { icono: "🥦", precio: 6, nombre: "brócoli" },
  platano: { icono: "🍌", precio: 7, nombre: "plátano" },
  calabacita: { icono: "🍈", precio: 8, nombre: "calabacita" },
  berenjena: { icono: "🍆", precio: 9, nombre: "berenjena" },
  pepino: { icono: "🥒", precio: 10, nombre: "pepino" },
  naranja: { icono: "🍊", precio: 11, nombre: "naranja" },
  chayote: { icono: "🍐", precio: 12, nombre: "chayote" },
  chile: { icono: "🌶️", precio: 13, nombre: "chile" },
  papa: { icono: "🥔", precio: 14, nombre: "papa" },
  cebolla: { icono: "🧅", precio: 15, nombre: "cebolla" },
  uvas: { icono: "🍇", precio: 16, nombre: "uvas" },
  lechuga: { icono: "🥬", precio: 17, nombre: "lechuga" },
  fresa: { icono: "🍓", precio: 18, nombre: "fresa" },
  ajo: { icono: "🧄", precio: 19, nombre: "ajo" },
  limon: { icono: "🍋", precio: 20, nombre: "limón" },
  melocoton: { icono: "🍑", precio: 21, nombre: "melocotón" },
  betabel: { icono: "🍠", precio: 22, nombre: "betabel" },
  sandia: { icono: "🍉", precio: 23, nombre: "sandía" },
  champinon: { icono: "🍄", precio: 24, nombre: "champiñones" },
  nopal: { icono: "🌵", precio: 25, nombre: "nopal" },
  granada: { icono: "🍒", precio: 26, nombre: "granada" },
  aguacate: { icono: "🥑", precio: 27, nombre: "aguacate" },
  arroz: { icono: "🌾", precio: 28, nombre: "arroz" },
  cana: { icono: "🎋", precio: 29, nombre: "caña de azúcar" },
  mango: { icono: "🥭", precio: 30, nombre: "mango" },
  pina: { icono: "🍍", precio: 31, nombre: "piña" },
  // Granja (precios provisionales: ajústalos a tu gusto)
  huevo: { icono: "🥚", precio: 8, nombre: "huevo" },
  leche: { icono: "🥛", precio: 10, nombre: "leche" },
  pollo: { icono: "🍗", precio: 18, nombre: "pollo" },
  res: { icono: "🥩", precio: 24, nombre: "carne de res" },
  tocino: { icono: "🥓", precio: 20, nombre: "tocino" },
};
const GRANJA_IDS = ["huevo", "leche", "pollo", "res", "tocino"];
const IDS = Object.keys(PRODUCTOS).filter((id) => !GRANJA_IDS.includes(id));   // cultivos (jardines)
const TODOS = Object.keys(PRODUCTOS);                                            // cultivos + granja: el orden de las estanterías fijas

// ----- Granja (terreno nuevo al norte del patio) -----
const COSTO_GRANJA = 1000;          // comprar la granja (en 🛠️ Mejoras)
const GRANJA_ALTO = 268;            // cuánto terreno se abre hacia el norte
const GRANJA_SEP = 4;               // separación entre el patio y los corrales
// «continuo»: sueltan su producto solos, como un jardín (seg = cada cuántos segundos sale uno) · «carga»: una carga cada cierto tiempo
const GRANJA_DEF = {
  huevo: { tipo: "continuo", animal: "🐔", nombre: "gallinas", costo: 200, costoEmp: 300, seg: 8, animales: 4 },
  leche: { tipo: "continuo", animal: "🐄", nombre: "vacas", costo: 400, costoEmp: 400, seg: 12, animales: 4 },
  pollo: { tipo: "carga", animal: "🐔", nombre: "pollos", costo: 2000, costoEmp: 800, animales: 4 },
  res: { tipo: "carga", animal: "🐄", nombre: "reses", costo: 2000, costoEmp: 800, animales: 3 },
  tocino: { tipo: "carga", animal: "🐖", nombre: "cerdos", costo: 2000, costoEmp: 800, animales: 3 },
};
const CARGA_BASE = 30;              // unidades de cada carga al empezar
const CARGA_SEG = 600;              // segundos entre cargas (10 minutos)
const STOCK_MAX_CARGAS = 3;         // cargas que se pueden acumular sin recoger (luego se detiene el reloj)
const COSTOS_CANT = [800, 1500, 2500, 4000];    // mejora «más carga»: cada una suma CARGA_PASO
const CARGA_PASO = 10;
const COSTOS_TIEMPO = [800, 1500, 2500, 4000];  // mejora «menos espera»: cada una resta TIEMPO_PASO segundos
const TIEMPO_PASO = 90;
const TIEMPO_MIN = 120;
const COSTOS_VEL = [150, 300, 600, 1200];       // huevo y leche: mejora «más rápido»: cada una multiplica el tiempo por VEL_FACTOR
const VEL_FACTOR = 0.8;

// Lugares del mapa (x, y, w, h en unidades del mapa)
const ESTANTE_W = 120, ESTANTE_H = 44;
const MAX_ESTANTES = 2 + ESTANTES_POR_AMP * COSTOS_EDIFICIO.length;
// Cuántas ampliaciones del edificio hacen falta para tener la estantería número «i»
const ampDe = (i) => (i < 2 ? 0 : 1 + Math.floor((i - 2) / ESTANTES_POR_AMP));
// La estantería número «i»: 0 y 1 en el edificio inicial; después, cada ampliación trae 4 (2 arriba y 2 abajo, con un pasillo en medio)
function rectEstante(i) {
  if (i < 2) return { x: i ? 210 : 30, y: TOP + 18, w: ESTANTE_W, h: ESTANTE_H };
  const k = i - 2, dentro = k % ESTANTES_POR_AMP;
  const a = ampliaciones[Math.floor(k / ESTANTES_POR_AMP)];   // la ampliación que le toca (se compra antes que sus estanterías)
  return { x: (a ? a.x0 : 0) + (dentro % 2 ? 165 : 15), y: dentro < 2 ? TOP + 18 : FILA_BAJA_Y, w: ESTANTE_W, h: ESTANTE_H };
}
// Los jardines están en el pasto, pegados al muro de arriba del edificio (a donde se sale por la abertura del pasillo central)
const CAJA = { x: 10, y: 466, w: 72, h: 40 };     // el mostrador (con toldo, caja registradora y cajón)
const SLOT_COLS = 4, SLOT_FILAS = 2;               // la fila de cada caja: 4 lugares por renglón, 2 renglones (si hay más gente, se amontonan en el último)
const MEJORAS_ZONA = { x: 10, y: 556, w: 108, h: 62 };
const PUERTA = { x: 186, y: MUNDO.h + 14 };       // la entrada inicial (las que compres se agregan a «puertas»)
const PUERTA_Y = MUNDO.h + 14;
const PASILLO_X = 180;                            // pasillo central entre estanterías
const ABERTURA = { a: PASILLO_X - 30, b: PASILLO_X + 30 }; // hueco de la pared de arriba: por ahí se sale al pasto
// Franjas (en y) que ocupan las filas de estanterías: los clientes las cruzan por el pasillo
const BANDAS = [{ a: TOP + 16, b: TOP + 18 + ESTANTE_H + 2 }];
const CORREDOR_Y = TOP + 18 + ESTANTE_H + EXT_H + 20;   // pasillo libre debajo de las estanterías: por ahí se va de una ampliación al pasillo central

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const elDinero = document.getElementById("dinero");
const elCarga = document.getElementById("carga");
const elEstante = document.getElementById("estante");
const elClientes = document.getElementById("clientes");
const ovl = document.getElementById("ovl");
const ovlBtn = document.getElementById("ovlBtn");
const panel = document.getElementById("mejoras");
const btnCarga = document.getElementById("mejCarga");
const btnEmpleado = document.getElementById("mejEmpleado");
const btnEstante = document.getElementById("mejEstante");
const btnEdIzq = document.getElementById("mejEdIzq");
const btnEdDer = document.getElementById("mejEdDer");
const btnPatIzq = document.getElementById("mejPatIzq");
const btnPatDer = document.getElementById("mejPatDer");
const avisoPatio = document.getElementById("titPatio");
// Secciones de la computadora de mejoras, de arriba abajo: empleados, verduras, frutas, granja y lo demás
const rejEmp = document.getElementById("rejEmp"), rejVer = document.getElementById("rejVer"), rejFru = document.getElementById("rejFru");
const rejGranja = document.getElementById("rejGranja"), rejOtras = document.getElementById("rejOtras");
const secciones = ["secEmp", "secVer", "secFru", "secGranja", "secOtras"].map((id) => document.getElementById(id));
const FRUTAS = new Set(["manzana", "platano", "mango", "granada", "sandia", "melocoton", "uvas", "fresa", "cana", "arroz", "champinon", "naranja", "limon", "pina", "aguacate"]);
const info = document.getElementById("info"), infoVolver = document.getElementById("infoVolver");
const btnMenu = document.getElementById("btnMenu");
const velBtn = document.getElementById("velBtn"), velInfo = document.getElementById("velInfo"), velPanel = document.getElementById("velPanel");
const elConf = document.getElementById("confirmar"), elConfTxt = document.getElementById("confTxt");
const elColocar = document.getElementById("colocar"), elColTxt = document.getElementById("colTxt"), btnColSi = document.getElementById("colSi");

// ---------- Estado ----------
let estado = "inicio";   // inicio | jugando
let pausado = false;     // el menú ☰ Pausa está abierto: todo se detiene
let velocidad = 1;       // x1 … x8: cuántos pasos de juego se corren por cada cuadro (botón ⏩)
let dinero = DINERO_INICIAL;
const jugador = { x: 180, y: 440, cara: 1 };
let objetivo = null;     // {x, y}: hacia dónde camina (toque o arrastre)
let tocando = false;
let carga = [];          // ids de productos que llevas
let estantes = [];       // estanterías compradas: { slot, x, y, w, h, producto, items: [] }
let extra = [];          // zanahorias colocadas en los espacios extra de la estantería de jitomates
// Cajas registradoras: la primera es fija; las demás se compran y se colocan donde quieras. dir: hacia dónde se forma la fila (1 derecha, -1 izquierda)
const cajas = [{ x: CAJA.x, y: CAJA.y, w: CAJA.w, h: CAJA.h, dir: 1, emp: false, cola: [], orig: true }];
const puertas = [{ x: PUERTA.x }];   // entradas/salidas de la tienda (la 1.ª es fija)
let colocando = null;    // {tipo: "caja" | "puerta"} mientras eliges dónde poner lo que compraste
let pregunta = null;     // jardín por el que se pregunta «¿comprar?»
let rechazado = null;    // jardín al que dijiste «Ahora no»: no se vuelve a preguntar hasta que te alejes
let avisado = null;      // jardín del que ya se dijo por qué todavía no puedes comprarlo (una vez por visita)
let edificio = 0;        // cuántas ampliaciones tiene el edificio (0 a COSTOS_EDIFICIO.length)
let ampliaciones = [];   // cada una: { lado: -1 (izquierda) o 1 (derecha), x0: dónde empieza en el mapa }
let xMin = 0, xMax = MUNDO.w;   // límites del EDIFICIO en x: crecen al ampliar el edificio
let patios = [];         // ampliaciones del PATIO (zona de pasto con los jardines), aparte del edificio: { lado, x0 }
let nivelCajero = 0;     // nivel de los empleados de caja (0 a NIVELES_EMP)
let nivelRepartidor = 0; // nivel de los empleados que llevan producto del jardín/corral a la estantería (0 a NIVELES_EMP)
let nivelPatio = 0;      // cuántas ampliaciones tiene el patio (0 a COSTOS_PATIO.length)
let pMin = 0, pMax = MUNDO.w;   // límites del PATIO en x: crecen al ampliar el patio
let wMin = 0, wMax = MUNDO.w;   // el mundo entero: lo más ancho entre edificio y patio (hasta ahí llega la cámara)
let camX = 0, camY = 0;  // cámara (vista isométrica): punto de la pantalla proyectada que queda al centro
let atorado = 0;         // segundos empujando contra una pared sin avanzar
let granja = false;      // ¿ya compraste la granja?
let yMin = 0;            // borde de arriba del mundo: baja a -GRANJA_ALTO al comprar la granja
let ptr = null;          // último punto tocado (para seguir el dedo mientras la cámara se mueve)
let dpr = 1;
let nivelCarga = 0;      // mejoras de carga compradas (0 a COSTOS_CARGA.length)
const cargaMax = () => CARGA_INICIAL + nivelCarga;
// Admin (para probar): dinero infinito y producción instantánea
const admin = { dinero: false, rapido: false };
const alcanza = (c) => admin.dinero || dinero >= c;          // ¿alcanza el dinero? (con «dinero infinito» siempre)
const creceSeg = () => (admin.rapido ? 0 : CRECE_SEG);
const maduraSeg = () => (admin.rapido ? 0 : MADURA_SEG);
let clientes = [];
let espera = 2;          // segundos para que llegue el siguiente cliente
let traspasoT = 0;
let textos = [];
let escala = 1;
let enMejoras = false;
const teclas = {};

// Cada jardín produce solo su producto y tiene su propio reloj (t < 0: parcela vacía; si no, segundos creciendo)
function nuevoJardin(producto, rect, costo) {
  const g = { producto, ...rect, costo, costoEmp: COSTO_EMP_JARDIN[producto], emp: null, comprado: false, parcelas: [], reloj: CRECE_SEG };
  for (let i = 0; i < g.cols * g.filas; i++) g.parcelas.push({ t: -1, id: null });
  return g;
}
const jardines = IDS.map((id) => nuevoJardin(id, { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN_DE[id]));
// El patio es la franja de pasto de arriba. Cada tramo (el patio inicial y cada ampliación) tiene 6 sitios para jardines:
// 2 columnas × 3 filas, la primera fila pegada al muro. El jardín número «i» va en el tramo i/6: si ese tramo aún no existe, hay que ampliar el patio.
function colocarJardines() {
  jardines.forEach((g, i) => {
    const tramo = Math.floor(i / JARDINES_POR_TRAMO), pos = i % JARDINES_POR_TRAMO;
    const col = pos % 2, fila = Math.floor(pos / 2);   // fila 0, 1 o 2 (de abajo hacia arriba)
    const a = tramo > 0 ? patios[tramo - 1] : null;
    g.disponible = tramo === 0 || !!a;
    if (!g.disponible) return;
    g.x = tramo === 0 ? (col ? 204 : 16) : a.x0 + (col ? 156 : 4);
    g.y = TOP - g.h - JARDIN_SEP - fila * (g.h + JARDIN_HUECO);
  });
}
colocarJardines();
// Corrales de la granja: 2 columnas × 3 filas al norte del patio (el 1.º abajo a la izquierda)
function nuevoCorral(id, i) {
  const d = GRANJA_DEF[id], col = i % 2, fila = Math.floor(i / 2);
  const c = {
    producto: id, tipo: d.tipo, animal: d.animal, nombre: d.nombre, costo: d.costo, costoEmp: d.costoEmp, emp: null, comprado: false, disponible: true,
    x: col ? 204 : 16, y: -GRANJA_SEP - 80 - fila * (80 + JARDIN_HUECO), w: 140, h: 80, cols: 3, filas: 2,
    parcelas: [], reloj: 0, stock: 0, nivelVel: 0, nivelCant: 0, nivelTiempo: 0, animales: [],
  };
  if (d.tipo === "continuo") for (let k = 0; k < 6; k++) c.parcelas.push({ t: -1, id: null });
  return c;
}
const corrales = GRANJA_IDS.map(nuevoCorral);
// Solo se muestra (y se puede comprar) el siguiente jardín: el primero que aún no has comprado
const siguienteJardin = () => jardines.find((g) => !g.comprado) || null;
const jardinDe = (id) => jardines.find((g) => g.producto === id);
const jardinesComprados = () => jardines.filter((g) => g.comprado).length;
const maxClientes = () => MAX_CLIENTES + Math.max(0, jardinesComprados() - 1);   // 1 jardín: 3 · 2 jardines: 4 · 3 jardines: 5 …
// Un jardín (menos el 1.º) se compra cuando ya tienes la estantería del producto anterior
const puedeJardin = (g) => { const k = IDS.indexOf(g.producto) - 1; return k < 0 || estantes.some((e) => e.slot === k); };

// ---------- Sonido ----------
let ac = null;
function tono(f, d = 0.1) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

// ---------- Utilidades ----------
const azar = (a, b) => a + Math.random() * (b - a);

function distRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
const tiempoCobroEmp = (n = nivelCajero) => Math.max(COBRO_EMP_MIN, COBRO_EMP_SEG * Math.pow(COBRO_EMP_R, n));
const empVel = () => EMP_VEL + EMP_VEL_PASO * nivelRepartidor;
const empCarga = () => EMP_CARGA + Math.floor(nivelRepartidor / EMP_CARGA_CADA);
const empTraspaso = () => Math.max(EMP_TRASPASO_MIN, TRASPASO_SEG * 2 * Math.pow(EMP_TRASPASO_R, nivelRepartidor));
const cerca = (r, alcance) => distRect(jugador.x, jugador.y, r) <= alcance;
// La pared de arriba del edificio solo se cruza por la abertura del pasillo
function chocaPared(x, y) {
  if (distRect(x, y, { x: xMin, y: TOP, w: xMax - xMin, h: 14 }) >= RADIO) return false;
  return !(x - RADIO >= ABERTURA.a && x + RADIO <= ABERTURA.b);
}
// Bajo la línea del edificio, lo que queda fuera de sus muros (cuando el patio es más ancho) no se puede pisar
function fueraEdificio(x, y) {
  if (xMin > wMin && distRect(x, y, { x: wMin - 100, y: TOP, w: xMin - wMin + 100, h: MUNDO.h }) < RADIO - 0.01) return true;
  if (xMax < wMax && distRect(x, y, { x: xMax, y: TOP, w: wMax - xMax + 100, h: MUNDO.h }) < RADIO - 0.01) return true;
  return false;
}
const ESCRITORIO = { x: MEJORAS_ZONA.x + 6, y: MEJORAS_ZONA.y + 2, w: MEJORAS_ZONA.w - 12, h: 22 };   // el escritorio con la computadora de mejoras (no se atraviesa)
const choca = (x, y) => distRect(x, y, ESCRITORIO) < RADIO || estantes.some((e) => distRect(x, y, rectFull(e)) < RADIO) || chocaPared(x, y) || fueraEdificio(x, y); // estanterías, pared y muros no se atraviesan

function centroParcela(g, i) {
  const c = i % g.cols, f = Math.floor(i / g.cols);
  return { x: g.x + ((c + 0.5) * g.w) / g.cols, y: g.y + ((f + 0.5) * g.h) / g.filas };
}

const hayPrimerEstante = () => estantes.some((e) => e.slot === 0);
// Rectángulo completo de una estantería (la de jitomates crece hacia abajo cuando se habilitan los 2 espacios de zanahoria)
function rectFull(e) {
  const ext = e.slot === 0 && !e.extra && extrasActivas() ? EXT_H : 0;
  return { x: e.x, y: e.y, w: e.w, h: e.h + ext };
}
const centroSelector = (e) => ({ x: e.x + 12, y: e.y + e.h / 2 }); // botón ↻ de cada estantería

// Productos que existen en la tienda: los que llevan alguna estantería
function productosExistentes() {
  const p = new Set(estantes.map((e) => e.producto));
  if (extrasActivas()) p.add("zanahoria");
  return [...p];
}

// Mientras no compres la estantería de zanahorias (la 2.ª), la de jitomates tiene 2 espacios extra para zanahorias
const extrasActivas = () => hayPrimerEstante() && jardinDe("zanahoria").comprado && estantes.length <= 1;
function extraEstante() {
  if (!extrasActivas()) return null;
  const s = estantes.find((e) => e.slot === 0);
  const r = rectFull(s);   // es el mismo mueble: la parte de abajo de la estantería de jitomates
  return { x: r.x, y: r.y, w: r.w, h: r.h, producto: "zanahoria", items: extra, cap: EXTRA_ZANAHORIA_CAP, extra: true };
}
const capDe = (e) => e.cap || ESTANTE_CAP;
// Zanahorias que aún puedes tomar del jardín con los espacios extra (descuenta las que ya llevas)
const espaciosZanahoria = () => EXTRA_ZANAHORIA_CAP - extra.length - carga.filter((id) => id === "zanahoria").length;

function nuevoEstante(slot, producto) {
  // las estanterías de cada producto son fijas: su producto no se puede cambiar (así nunca falta alguno y los clientes no se van)
  estantes.push({ slot, ...rectEstante(slot), producto, items: [], fija: slot < TODOS.length });
}

function siguienteSlot() {
  for (let i = 1; i < MAX_ESTANTES; i++) if (!estantes.some((e) => e.slot === i)) return i;
  return -1;
}

// ---------- Lógica ----------
// Si tocas al otro lado de la pared, primero va a la abertura del pasillo y luego sigue hacia el toque
function metaEfectiva() {
  const pared = TOP + 7;
  if ((jugador.y > pared) === (objetivo.y > pared)) return objetivo;
  if (Math.abs(jugador.x - PASILLO_X) > 3) {
    // desde dentro, primero baja al pasillo libre (así no choca con las estanterías de las ampliaciones)
    if (jugador.y > pared && jugador.y < CORREDOR_Y - 3) return { x: jugador.x, y: CORREDOR_Y, paso: true };
    // debajo de la fila de abajo de las ampliaciones: primero sube por el hueco entre estanterías
    if (jugador.y > CORREDOR_Y + 26 && (jugador.x < 0 || jugador.x > MUNDO.w)) {
      const gx = hueco(jugador.x);
      return Math.abs(jugador.x - gx) > 3 ? { x: gx, y: jugador.y, paso: true } : { x: gx, y: CORREDOR_Y, paso: true };
    }
    return { x: PASILLO_X, y: jugador.y, paso: true };
  }
  return { x: PASILLO_X, y: objetivo.y, paso: true };
}

function mover(dt) {
  let dx = 0, dy = 0;
  // Las teclas se leen en la PANTALLA (isométrica): ↑ sube por la pantalla, → va a la derecha de la pantalla, etc.
  let ux = 0, uy = 0;
  if (teclas.arrowleft || teclas.a) ux -= 1;
  if (teclas.arrowright || teclas.d) ux += 1;
  if (teclas.arrowup || teclas.w) uy -= 1;
  if (teclas.arrowdown || teclas.s) uy += 1;
  if (ux || uy) { dx = ux + 2 * uy; dy = 2 * uy - ux; }   // pantalla → mapa (se normaliza más abajo)
  let paso = VELOCIDAD * dt;
  if (dx || dy) {
    objetivo = null;
    const l = Math.hypot(dx, dy);
    dx /= l; dy /= l;
  } else if (objetivo) {
    const m = metaEfectiva();
    const vx = m.x - jugador.x, vy = m.y - jugador.y;
    const d = Math.hypot(vx, vy);
    if (d < 2) { if (!m.paso) objetivo = null; }
    else { dx = vx / d; dy = vy / d; paso = Math.min(paso, d); }
  }
  if (!dx && !dy) return;
  if (dx) jugador.cara = dx > 0 ? 1 : -1;
  const nx = Math.max(wMin + RADIO, Math.min(wMax - RADIO, jugador.x + dx * paso));
  const ny = Math.max(yMin + RADIO, Math.min(MUNDO.h - RADIO, jugador.y + dy * paso));
  let movio = false;
  if (!choca(nx, jugador.y)) { if (nx !== jugador.x) movio = true; jugador.x = nx; }
  if (!choca(jugador.x, ny)) { if (ny !== jugador.y) movio = true; jugador.y = ny; }
  // si tocas un lugar al que no se puede llegar (calle, muro), deja de empujar contra la pared
  if (objetivo && !movio) { atorado += paso / VELOCIDAD; if (atorado > 0.4) { objetivo = null; atorado = 0; } } else atorado = 0;
}

function cobrarCompra(costo, x, y) {
  if (!admin.dinero) dinero -= costo;
  textos.push({ x, y, vida: 1.2, txt: "-$" + costo, col: "#ff8a8a" });
  tono(392, 0.1); setTimeout(() => tono(523, 0.15), 90);
}

// Primera estantería y jardín: se compran caminando hasta ellos
function comprarCosas() {
  const r0 = rectEstante(0);
  if (!hayPrimerEstante() && alcanza(COSTO_PRIMER_ESTANTE) && cerca(r0, ALCANCE_ESTANTE)) {
    cobrarCompra(COSTO_PRIMER_ESTANTE, r0.x + r0.w / 2, r0.y + r0.h + 10);
    nuevoEstante(0, "tomate");
  }
  // Jardín o corral: al pararte encima te pregunta si quieres comprarlo (no se compra solo)
  const g = candidatosCompra().find((c) => cerca(c, ALCANCE_JARDIN)) || null;   // el que tienes bajo los pies
  const puedes = g && puedeProductor(g) && alcanza(g.costo);
  if (rechazado && !cerca(rechazado, ALCANCE_JARDIN + 14)) rechazado = null;   // ya te alejaste: puede volver a preguntar
  // Si estás sobre él pero aún no se puede comprar, un texto flotante dice por qué (una vez por visita)
  if (avisado && !cerca(avisado, ALCANCE_JARDIN + 14)) avisado = null;
  if (g && !puedes && avisado !== g) {
    avisado = g;
    const txt = !puedeProductor(g) ? "Primero compra la estantería de " + PRODUCTOS[IDS[IDS.indexOf(g.producto) - 1]].icono : "Faltan $" + Math.max(1, Math.ceil(g.costo - dinero)) + " para " + nombreCompra(g, false);
    textos.push({ x: g.x + g.w / 2, y: g.y + g.h / 2, vida: 2.4, txt, col: "#ffd24d" });
  }
  if (puedes && !colocando) {
    if (!pregunta && rechazado !== g) {
      pregunta = g;
      objetivo = null; tocando = false;                 // te quedas quieto mientras decides
      elConfTxt.textContent = "¿Comprar " + nombreCompra(g, true) + " por $" + g.costo + "?";
      elConf.classList.remove("oculto");
    }
  } else if (pregunta) cerrarPregunta();
  if (pregunta && colocando) cerrarPregunta();
}
function cerrarPregunta() {
  pregunta = null;
  elConf.classList.add("oculto");
}
function comprarJardin(g) {
  if (g.comprado || g !== siguienteJardin() || !alcanza(g.costo)) return;
  cobrarCompra(g.costo, g.x + g.w / 2, g.y + g.h + 10);
  g.comprado = true;
  g.reloj = creceSeg();
}
document.getElementById("confSi").addEventListener("click", () => { if (pregunta) { if (pregunta.tipo) comprarCorral(pregunta); else comprarJardin(pregunta); } cerrarPregunta(); });
document.getElementById("confNo").addEventListener("click", () => { rechazado = pregunta; cerrarPregunta(); });

function crecerJardin(dt) {
  const ex = productosExistentes();
  for (const g of jardines) {
    if (!g.comprado) continue;
    g.parcelas.forEach((p) => {
      if (p.t >= 0 && !ex.includes(p.id)) { p.t = -1; p.id = null; } // ya no hay estantería de eso: se pierde
      else if (p.t >= 0 && p.t < maduraSeg()) p.t = Math.min(maduraSeg(), p.t + dt);
    });
    g.reloj -= dt;
    if (g.reloj <= 0) {
      g.reloj = creceSeg();
      const libres = g.parcelas.filter((p) => p.t < 0);
      if (libres.length && ex.includes(g.producto)) {
        // con producción instantánea se llenan todas las parcelas libres de golpe
        const sembrar = admin.rapido ? libres : [libres[Math.floor(Math.random() * libres.length)]];
        for (const p of sembrar) { p.t = 0; p.id = g.producto; }  // cada jardín produce solo lo suyo, a su propio ritmo
      }
    }
  }
}

// Recoger del jardín y colocar en las estanterías, solos y de uno en uno
function traspasos(dt) {
  traspasoT -= dt;
  if (traspasoT > 0) return;
  traspasoT = TRASPASO_SEG;
  const ex = productosExistentes();
  for (const g of jardines) {
    if (!g.comprado || carga.length >= cargaMax() || !cerca(g, ALCANCE_JARDIN)) continue;
    // sin estantería de zanahorias solo puedes tomar tantas como espacios extra libres haya
    if (g.producto === "zanahoria" && extrasActivas() && espaciosZanahoria() <= 0) continue;
    const p = g.parcelas.find((q) => q.t >= maduraSeg() && ex.includes(q.id));
    if (p) { carga.push(p.id); p.t = -1; p.id = null; tono(660, 0.07); break; }
  }
  for (const g of corrales) {   // granja: huevos, leche y las cargas de pollo, res y tocino
    if (!g.comprado || carga.length >= cargaMax() || !cerca(g, ALCANCE_JARDIN)) continue;
    const id = sacarDe(g, ex);
    if (id) { carga.push(id); tono(660, 0.07); break; }
  }
  const destinos = estantes.slice();
  const xe = extraEstante();
  if (xe) destinos.push(xe);
  for (const e of destinos) {
    if (e.items.length >= capDe(e) || !cerca(rectFull(e), ALCANCE_ESTANTE)) continue;
    const i = carga.indexOf(e.producto); // cada estantería solo recibe su producto
    if (i >= 0) { e.items.push(carga.splice(i, 1)[0]); tono(520, 0.07); break; }
  }
}

// Cambiar el producto de una estantería (solo si está vacía)
function cambiarProducto(e) {
  if (e.items.length) {
    textos.push({ x: e.x + e.w / 2, y: e.y + e.h + 12, vida: 1.2, txt: "Primero vacíala", col: "#ffd24d" });
    return;
  }
  e.producto = TODOS[(TODOS.indexOf(e.producto) + 1) % TODOS.length];
  tono(600, 0.08);
}

// ----- Cajas registradoras y entradas -----
const hayCajero = (k) => k.emp || cerca(k, ALCANCE_CAJA);
// Lugar número «i» de la fila de la caja «k»
function slotCaja(k, i) {
  i = Math.min(i, SLOT_COLS * SLOT_FILAS - 1);
  const col = i % SLOT_COLS, fila = Math.floor(i / SLOT_COLS);
  return { x: k.dir > 0 ? k.x + 90 + col * 28 : k.x - 18 - col * 28, y: k.y + 19 + fila * 26 };
}
// Dónde se para el empleado de una caja
const posEmpleadoCaja = (k) => ({ x: k.x + 36, y: k.y + 61 });
// Los clientes eligen la caja con menos fila (y que tenga quien cobre)
function cajaMasLibre() {
  const puntos = (k) => k.cola.length + (hayCajero(k) ? 0 : 2);
  return cajas.reduce((m, k) => (puntos(k) < puntos(m) ? k : m), cajas[0]);
}
const puertaMasCercana = (x) => puertas.reduce((m, p) => (Math.abs(p.x - x) < Math.abs(m.x - x) ? p : m), puertas[0]);

const solapa = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const infla = (r, m) => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });
// Lo que ocupa una caja: el mostrador con su toldo y el área donde se forma la fila
function huellaCaja(k) {
  const cuerpo = { x: k.x, y: k.y - 11, w: k.w, h: k.h + 11 };
  const fila = { x: k.dir > 0 ? k.x + k.w : k.x - 116, y: k.y + 4, w: 116, h: 55 };
  return [cuerpo, fila];
}
// Sitios donde hay (o habrá) estanterías: no se puede poner una caja encima
function sitiosEstantes() {
  const l = [rectEstante(0), rectEstante(1)];
  l[0] = { ...l[0], h: l[0].h + EXT_H };
  ampliaciones.forEach((a) => {
    for (let d = 0; d < ESTANTES_POR_AMP; d++) l.push({ x: a.x0 + (d % 2 ? 165 : 15), y: d < 2 ? TOP + 18 : FILA_BAJA_Y, w: ESTANTE_W, h: ESTANTE_H });
  });
  return l;
}
// La caja que se está colocando: centrada donde estás parado. Devuelve la caja y si el sitio sirve
function fantasmaCaja() {
  const k = { x: Math.round(jugador.x - CAJA.w / 2), y: Math.round(jugador.y - CAJA.h / 2), w: CAJA.w, h: CAJA.h, dir: 1, emp: false, cola: [] };
  if (k.x + 188 > xMax - 6) k.dir = -1;                                   // si a la derecha no cabe la fila, va a la izquierda
  const huella = huellaCaja(k);
  let ok = k.y - 11 >= CORREDOR_Y + 14 && k.y <= 548;                     // ni en el pasillo de arriba ni pegada a la pared de abajo
  if (huella.some((r) => r.x < xMin + 6 || r.x + r.w > xMax - 6)) ok = false;
  const ocupado = [...sitiosEstantes().map((r) => infla(r, 4)), infla(MEJORAS_ZONA, 6)];
  cajas.forEach((o) => huellaCaja(o).forEach((r) => ocupado.push(r)));
  if (huella.some((r) => ocupado.some((o) => solapa(r, o)))) ok = false;
  return { k, ok };
}
// La entrada que se está colocando: sobre la pared de abajo, a la altura de tu personaje.
// En las ampliaciones se ajusta al hueco entre estanterías para que nadie atraviese una estantería.
function snapPuerta(x) {
  if (x >= 30 && x <= MUNDO.w - 30) return x;
  const cand = [30, MUNDO.w - 30, ...ampliaciones.map((a) => a.x0 + 150)];
  return cand.reduce((m, c) => (Math.abs(c - x) < Math.abs(m - x) ? c : m), cand[0]);
}
function fantasmaPuerta() {
  const x = snapPuerta(jugador.x);
  const r = { x: x - 30, y: MUNDO.h - 14, w: 60, h: 14 };
  const ok = !puertas.some((p) => Math.abs(p.x - x) < 70) && !solapa(r, infla(MEJORAS_ZONA, 4));
  return { x, ok };
}
const costoCajaNueva = () => COSTO_CAJA_EXTRA(cajas.length - 1);
const costoPuertaNueva = () => COSTO_PUERTA_EXTRA(puertas.length - 1);
function terminarColocacion(ok) {
  if (!colocando) return;
  if (ok) {
    if (colocando.tipo === "caja") {
      const f = fantasmaCaja();
      if (!f.ok || !alcanza(costoCajaNueva())) return;
      cobrarCompra(costoCajaNueva(), f.k.x + f.k.w / 2, f.k.y - 20);
      cajas.push({ ...f.k, cola: [], emp: false, boton: crearBotonEmpCaja(f.k) });
    } else {
      const f = fantasmaPuerta();
      if (!f.ok || !alcanza(costoPuertaNueva())) return;
      cobrarCompra(costoPuertaNueva(), f.x, MUNDO.h - 30);
      puertas.push({ x: f.x });
    }
  }
  colocando = null;
}

function nuevoCliente() {
  const existentes = productosExistentes();
  if (!existentes.length) return;
  // lista de compra: solo productos que existen en la tienda
  const lista = {};
  const cuantos = 1 + Math.floor(Math.random() * Math.min(3, existentes.length));
  existentes.slice().sort(() => Math.random() - 0.5).slice(0, cuantos).forEach((id) => {
    lista[id] = CANT_MIN + Math.floor(Math.random() * (CANT_MAX - CANT_MIN + 1));
  });
  const camisas = ["#4aa8ff", "#ff7aa8", "#ffa534", "#c07cff", "#4fd16b", "#ffe14d"];
  const pieles = ["#f5cfa0", "#d9a066", "#a8714a", "#7a4a2e"];
  const p = puertas[Math.floor(Math.random() * puertas.length)];   // entra por una de las entradas, al azar
  clientes.push({
    x: p.x, y: PUERTA_Y, estado: "comprando", lista, carrito: [], t: TOMAR_SEG, vel: azar(65, 90), off: azar(-30, 30),
    camisa: camisas[Math.floor(Math.random() * camisas.length)],
    piel: pieles[Math.floor(Math.random() * pieles.length)],
  });
}

function ir(c, d, dt) {
  const vx = d.x - c.x, vy = d.y - c.y;
  const dist = Math.hypot(vx, vy);
  const paso = c.vel * dt;
  if (dist <= paso) { c.x = d.x; c.y = d.y; return true; }
  c.x += (vx / dist) * paso;
  c.y += (vy / dist) * paso;
  return false;
}

// Igual que ir, pero para pasar de una fila de estanterías a otra se cruza por el pasillo del centro
function irPorPasillo(c, d, dt) {
  const cruza = BANDAS.some((b) => (c.y > b.b && d.y < b.a) || (c.y < b.a && d.y > b.b));
  if (cruza) {
    if (Math.abs(c.x - PASILLO_X) > 3) { ir(c, { x: PASILLO_X, y: c.y }, dt); return false; }
    ir(c, { x: PASILLO_X, y: d.y }, dt);
    return false;
  }
  return ir(c, d, dt);
}

// ¿Es de la fila de abajo de una ampliación? Esas se atienden desde el pasillo de en medio (por arriba)
const esFilaBaja = (e) => e.y > TOP + 100;
// Dónde se para alguien (a «m» px) para atender una estantería
function standY(e, m) {
  const r = rectFull(e);
  return esFilaBaja(e) ? r.y - m : r.y + r.h + m;
}
// Centro del hueco entre estanterías más cercano (en las ampliaciones los huecos están cada 150 px)
const hueco = (x) => (x < 0 ? Math.round(x / 150) * 150 : MUNDO.w + Math.round((x - MUNDO.w) / 150) * 150);
// Camina por la tienda: en el edificio inicial va por el pasillo central; si el viaje toca una ampliación,
// sale al corredor horizontal (CORREDOR_Y), lo recorre y entra de frente a su destino
function irTienda(c, d, dt) {
  const fuera = (x) => x < 0 || x > MUNDO.w;
  if (!fuera(c.x) && !fuera(d.x)) return irPorPasillo(c, d, dt);
  if (Math.abs(c.x - d.x) <= 4) return ir(c, d, dt);
  if (Math.abs(c.y - CORREDOR_Y) > 3) { ir(c, { x: c.x, y: CORREDOR_Y }, dt); return false; }
  ir(c, { x: d.x, y: CORREDOR_Y }, dt);
  return false;
}

const faltante = (c) => Object.keys(c.lista).find((id) => c.lista[id] > 0) || null;

// Estantería de ese producto: la que tenga existencias; si no, la primera que lo lleve
function estanteDe(id) {
  const m = estantes.filter((e) => e.producto === id);
  const xe = extraEstante();
  if (xe && xe.producto === id) m.push(xe);
  return m.find((e) => e.items.includes(id)) || m[0] || null;
}

function actualizarClientes(dt) {
  // llega uno nuevo a los pocos segundos de haber espacio (nunca de inmediato)
  if (clientes.length < maxClientes() && estantes.length) {
    espera -= dt;
    if (espera <= 0) { nuevoCliente(); espera = azar(ESPERA_MIN, ESPERA_MAX); }
  }
  for (const c of clientes) {
    if (c.estado === "comprando") {
      const falta = faltante(c);
      if (!falta) {
        // ya tiene todo: va a la caja (o se va si no alcanzó a tomar nada)
        if (c.carrito.length) { c.estado = "cola"; c.t = COBRO_SEG; c.caja = cajaMasLibre(); c.caja.cola.push(c); }
        else c.estado = "saliendo";
        continue;
      }
      const e = estanteDe(falta);
      if (!e) { c.lista[falta] = 0; continue; } // ya no hay estantería de ese producto
      const x = Math.max(xMin + 14, Math.min(xMax - 14, e.x + e.w / 2 + c.off));
      if (irTienda(c, { x, y: standY(e, 26) }, dt)) {
        c.t -= dt;
        if (c.t <= 0) {
          const i = e.items.indexOf(falta);
          if (i >= 0) {
            e.items.splice(i, 1);
            c.lista[falta]--;
            c.carrito.push(falta);
            tono(700, 0.05);
            c.t = TOMAR_SEG;
          } else c.t = 0.2; // todavía no hay en la estantería: espera
        }
      } else c.t = TOMAR_SEG;
    } else if (c.estado === "saliendo") {
      c.sal = c.sal || puertaMasCercana(c.x);   // sale por la entrada más cercana
      if (irTienda(c, { x: c.sal.x, y: PUERTA_Y }, dt)) c.fuera = true;
    }
  }
  // la fila de cada caja: solo cobra el primero, y solo si hay quien cobre (tú junto a la caja o su empleado)
  for (const k of cajas) {
    k.cola = k.cola.filter((c) => c.estado === "cola");
    k.cola.forEach((c, i) => {
      const llego = irTienda(c, slotCaja(k, i), dt);
      if (i !== 0 || !llego || !hayCajero(k)) return;
      c.t -= dt * Math.max(k.emp ? COBRO_SEG / tiempoCobroEmp() : 0, cerca(k, ALCANCE_CAJA) ? 1 : 0);
      if (c.t > 0) return;
      // se cobra toda la compra junta, de una sola vez
      const total = c.carrito.reduce((suma, id) => suma + PRODUCTOS[id].precio, 0);
      if (total > 0) {
        dinero += total;
        textos.push({ x: c.x, y: c.y - 30, vida: 1.1, txt: "+$" + total, col: "#7dff9a" });
        tono(880, 0.06); setTimeout(() => tono(1175, 0.08), 60); setTimeout(() => tono(1568, 0.1), 130);
      }
      c.carrito = [];
      c.estado = "saliendo";
    });
    k.cola = k.cola.filter((c) => c.estado === "cola");
  }
  clientes = clientes.filter((c) => !c.fuera);
}

// ---------- Empleados de jardín ----------
// Cada jardín puede tener su empleado: recoge lo maduro, lo lleva a la estantería de ese producto y la repone.
function destinosDe(id) {
  const m = estantes.filter((e) => e.producto === id);
  const xe = extraEstante();
  if (xe && xe.producto === id) m.push(xe);
  return m;
}
const espacioLibre = (id) => destinosDe(id).reduce((t, e) => t + capDe(e) - e.items.length, 0);
function puntoJardin(g) {                         // lugar junto al jardín, en el pasillo de pasto
  const izq = g.x + g.w / 2 < PASILLO_X;
  return { x: izq ? g.x + g.w + 14 : g.x - 14, y: g.y + g.h / 2 };
}
function nuevoEmpleadoJardin(g) {
  const camisas = {
    tomate: "#e0463d", zanahoria: "#ff9a2e", maiz: "#e8c93a", brocoli: "#2e9d4a", berenjena: "#8f5bd0",
    cilantro: "#5cb85c", manzana: "#d9362f", platano: "#f5d93a", naranja: "#f28c1e", uvas: "#7d3fa8", melocoton: "#f7a98b", champinon: "#cdb79e", granada: "#a3173a", arroz: "#e6d9a8", cana: "#8cb84a", calabacita: "#7fc24a", chayote: "#a8d070", lechuga: "#8fd16a", ajo: "#efe6d2", betabel: "#9b2d5c", nopal: "#2f8f5b",
    pepino: "#3fae5a", chile: "#c9302c", papa: "#b08a5a", cebolla: "#c68ad6", fresa: "#ff5c7a",
    limon: "#f2dc3a", sandia: "#3e9a52", aguacate: "#6b8f2a", mango: "#ffb02e", pina: "#e6a817",
    huevo: "#f4efe0", leche: "#8ecbff", pollo: "#e8a23a", res: "#a0522d", tocino: "#e88aa0",
  };
  return { x: MEJORAS_ZONA.x + MEJORAS_ZONA.w / 2, y: MEJORAS_ZONA.y - 8, vel: EMP_VEL, carga: [], cd: 0, off: azar(-22, 22), camisa: camisas[g.producto] || "#888" };
}
// Camina hacia d: para salir al pasto o volver a entrar pasa por la abertura del pasillo
function irEmpleado(w, d, dt) {
  const pared = TOP + 7;
  const dentroW = w.y > pared, dentroD = d.y > pared;
  if (dentroW !== dentroD) {
    if (Math.abs(w.x - PASILLO_X) > 3) {
      // desde una ampliación va primero por el corredor; en el pasto y en el edificio inicial camina directo al pasillo
      if (dentroW) irTienda(w, { x: PASILLO_X, y: CORREDOR_Y }, dt);
      else ir(w, { x: PASILLO_X, y: w.y }, dt);
      return false;
    }
    ir(w, { x: PASILLO_X, y: d.y }, dt);
    return false;
  }
  if (!dentroW) return ir(w, d, dt);   // afuera, en el pasto: directo
  return irTienda(w, d, dt);
}
function actualizarEmpleados(dt) {
  const ex = productosExistentes();
  for (const g of productores()) {
    const em = g.emp;
    if (!em) continue;
    em.cd -= dt;
    em.vel = empVel();
    const nListos = listosDe(g, ex);
    const espacio = espacioLibre(g.producto);
    const puedeColocar = em.carga.length > 0 && espacio > 0;
    const puedeRecoger = nListos > 0 && em.carga.length < empCarga() && espacio - em.carga.length > 0;
    if (puedeColocar && (em.carga.length >= empCarga() || !puedeRecoger)) {
      const e = destinosDe(g.producto).find((q) => q.items.length < capDe(q));
      const r = rectFull(e);
      if (distRect(em.x, em.y, r) <= ALCANCE_ESTANTE - 24) {
        if (em.cd <= 0) { e.items.push(em.carga.shift()); em.cd = empTraspaso(); }
      } else irEmpleado(em, { x: Math.max(xMin + 14, Math.min(xMax - 14, e.x + e.w / 2 + em.off)), y: standY(e, 14) }, dt);
    } else if (puedeRecoger) {
      if (distRect(em.x, em.y, g) <= ALCANCE_JARDIN) {
        if (em.cd <= 0) { const id = sacarDe(g, ex); if (id) em.carga.push(id); em.cd = empTraspaso(); }
      } else irEmpleado(em, puntoJardin(g), dt);
    } else {
      irEmpleado(em, puntoJardin(g), dt);          // sin nada que hacer: espera junto a su jardín
    }
  }
}

// ---------- Granja ----------
// Terreno nuevo al norte del patio (se compra en 🛠️ Mejoras). Un corral por producto:
//  · huevo y leche: sueltan su producto solos, como los jardines (recoges lo que aparece);
//  · pollo, res y tocino: una CARGA cada cierto tiempo (30 de entrada) que se va transportando poco a poco; se mejoran en cantidad y en tiempo.
const corralDe = (id) => corrales.find((c) => c.producto === id);
const productorDe = (id) => jardinDe(id) || corralDe(id);
const productores = () => [...jardines, ...corrales.filter((c) => c.comprado)];
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const cantidadCarga = (c) => CARGA_BASE + CARGA_PASO * c.nivelCant;
const tiempoNivel = (n) => Math.max(TIEMPO_MIN, CARGA_SEG - TIEMPO_PASO * n);
const tiempoCarga = (c) => (admin.rapido ? 1 : tiempoNivel(c.nivelTiempo));
const periodoCont = (c) => GRANJA_DEF[c.producto].seg * Math.pow(VEL_FACTOR, c.nivelVel);

// Lo que se puede comprar caminando hasta ahí: el siguiente jardín y, con la granja abierta, todos los corrales
const candidatosCompra = () => [siguienteJardin(), ...(granja ? corrales : [])].filter((c) => c && !c.comprado && c.disponible);
const puedeProductor = (g) => (g.tipo ? true : puedeJardin(g));
function nombreCompra(g, larga) {
  const ic = PRODUCTOS[g.producto].icono;
  if (g.tipo) return larga ? "el corral de " + g.animal + " " + g.nombre + " (" + ic + ")" : "el corral de " + g.animal;
  return larga ? "el jardín de " + ic + " " + PRODUCTOS[g.producto].nombre : "el jardín " + ic;
}

function abrirGranja() { granja = true; yMin = -GRANJA_ALTO; }
function activarCorral(c) {
  c.comprado = true;
  c.animales = [];
  for (let i = 0; i < GRANJA_DEF[c.producto].animales; i++) c.animales.push({ x: azar(c.x + 14, c.x + c.w - 14), y: azar(c.y + 14, c.y + c.h - 14), tx: 0, ty: 0, t: 0 });
  if (c.tipo === "carga") { c.stock = cantidadCarga(c); c.reloj = tiempoCarga(c); }   // la primera carga ya viene lista
  else c.reloj = periodoCont(c);
}
function comprarCorral(c) {
  if (c.comprado || !granja || !alcanza(c.costo)) return;
  cobrarCompra(c.costo, c.x + c.w / 2, c.y + c.h + 10);
  activarCorral(c);
}

// ¿Cuántos productos de este productor (jardín o corral) se pueden recoger ya? Solo si hay estantería de ese producto.
function listosDe(g, ex) {
  if (g.tipo === "carga") return ex.includes(g.producto) ? g.stock : 0;
  if (g.tipo === "continuo") return g.parcelas.filter((q) => q.t >= 0 && ex.includes(q.id)).length;
  return g.parcelas.filter((q) => q.t >= maduraSeg() && ex.includes(q.id)).length;
}
function sacarDe(g, ex) {
  if (listosDe(g, ex) <= 0) return null;
  if (g.tipo === "carga") { g.stock--; return g.producto; }
  const p = g.parcelas.find((q) => (g.tipo === "continuo" ? q.t >= 0 : q.t >= maduraSeg()) && ex.includes(q.id));
  if (!p) return null;
  const id = p.id; p.t = -1; p.id = null;
  return id;
}

function actualizarCorrales(dt) {
  if (!granja) return;
  const ex = productosExistentes();
  for (const c of corrales) {
    if (!c.comprado) continue;
    for (const a of c.animales) {   // los animales caminan al azar dentro de su corral
      a.t -= dt;
      if (a.t <= 0) { a.tx = azar(c.x + 14, c.x + c.w - 14); a.ty = azar(c.y + 14, c.y + c.h - 14); a.t = azar(2, 5); }
      const vx = a.tx - a.x, vy = a.ty - a.y, d = Math.hypot(vx, vy);
      if (d > 1) { const p = Math.min(d, 14 * dt); a.x += (vx / d) * p; a.y += (vy / d) * p; }
    }
    if (c.tipo === "carga") {
      const tope = cantidadCarga(c) * STOCK_MAX_CARGAS;
      if (c.stock < tope) {
        c.reloj -= dt;
        if (c.reloj <= 0) { c.stock = Math.min(tope, c.stock + cantidadCarga(c)); c.reloj = tiempoCarga(c); }
      }
    } else {
      c.reloj -= dt;
      if (c.reloj <= 0) {
        c.reloj = admin.rapido ? 0 : periodoCont(c);
        const libres = c.parcelas.filter((p) => p.t < 0);
        if (libres.length && ex.includes(c.producto)) {
          const poner = admin.rapido ? libres : [libres[Math.floor(Math.random() * libres.length)]];
          for (const p of poner) { p.t = 0; p.id = c.producto; }
        }
      }
    }
  }
}

// ---------- Mejoras ----------
function costoEstanteExtra() {
  return COSTO_ESTANTE_EXTRA(Math.max(0, estantes.length - 1));
}

// Ensancha el edificio hacia un lado (-1 izquierda, 1 derecha): el mundo crece y la cámara lo recorre
function ampliar(lado) {
  const n = ampliaciones.filter((a) => a.lado === lado).length;   // cuántas hay ya de ese lado
  ampliaciones.push({ lado, x0: lado < 0 ? -(n + 1) * EXT_ANCHO : MUNDO.w + n * EXT_ANCHO });
  edificio = ampliaciones.length;
  xMin = 0 - EXT_ANCHO * ampliaciones.filter((a) => a.lado < 0).length;
  xMax = MUNDO.w + EXT_ANCHO * ampliaciones.filter((a) => a.lado > 0).length;
  recalcMundo();
}

// Ensancha el PATIO (la zona de los jardines) hacia un lado, sin tocar el edificio: da sitio para 6 jardines más
function ampliarPatio(lado) {
  const n = patios.filter((a) => a.lado === lado).length;
  patios.push({ lado, x0: lado < 0 ? -(n + 1) * EXT_ANCHO : MUNDO.w + n * EXT_ANCHO });
  nivelPatio = patios.length;
  pMin = 0 - EXT_ANCHO * patios.filter((a) => a.lado < 0).length;
  pMax = MUNDO.w + EXT_ANCHO * patios.filter((a) => a.lado > 0).length;
  recalcMundo();
  colocarJardines();
}

function recalcMundo() {
  wMin = Math.min(xMin, pMin);
  wMax = Math.max(xMax, pMax);
}

// Admin: deja todo comprado (edificio con una ampliación a cada lado, estanterías, jardines, empleados y carga)
function desbloquearTodo() {
  while (edificio < COSTOS_EDIFICIO.length) ampliar(edificio % 2 === 0 ? -1 : 1);   // edificio: una ampliación a cada lado
  while (nivelPatio < COSTOS_PATIO.length) ampliarPatio(nivelPatio % 2 === 0 ? 1 : -1);   // patio: igual, por separado
  for (let sl = 0; sl < MAX_ESTANTES; sl++) {
    if (!estantes.some((e) => e.slot === sl)) nuevoEstante(sl, sl < TODOS.length ? TODOS[sl] : IDS[0]);
  }
  const zan = estantes.find((e) => e.slot === 1);
  if (zan && extra.length) zan.items.push(...extra.splice(0));
  for (const g of jardines) {
    if (!g.comprado) { g.comprado = true; g.reloj = creceSeg(); }
    if (!g.emp) g.emp = nuevoEmpleadoJardin(g);
  }
  if (!granja) abrirGranja();
  for (const c of corrales) {
    if (!c.comprado) activarCorral(c);
    if (!c.emp) c.emp = nuevoEmpleadoJardin(c);
  }
  cajas[0].emp = true;
  nivelCarga = COSTOS_CARGA.length;
}

function comprarMejora(tipo) {
  if (estado !== "jugando" || !enMejoras) return;
  const x = MEJORAS_ZONA.x + MEJORAS_ZONA.w / 2, y = MEJORAS_ZONA.y - 8;
  if (tipo === "carga") {
    if (nivelCarga >= COSTOS_CARGA.length || !alcanza(COSTOS_CARGA[nivelCarga])) return;
    cobrarCompra(COSTOS_CARGA[nivelCarga], x, y);
    nivelCarga++;
  } else if (tipo === "empleado") {
    if (cajas[0].emp || !alcanza(COSTO_EMPLEADO)) return;
    cobrarCompra(COSTO_EMPLEADO, x, y);
    cajas[0].emp = true;
  } else if (tipo === "caja-nueva") {
    if (colocando || cajas.length - 1 >= MAX_CAJAS_EXTRA || !alcanza(costoCajaNueva())) return;
    colocando = { tipo: "caja" };      // el dinero se cobra al colocarla
  } else if (tipo === "puerta-nueva") {
    if (colocando || puertas.length - 1 >= MAX_PUERTAS_EXTRA || !alcanza(costoPuertaNueva())) return;
    colocando = { tipo: "puerta" };
  } else if (tipo.startsWith("emp-caja:")) {
    const k = cajas[Number(tipo.slice(9))];
    if (!k || k.emp || !alcanza(COSTO_EMP_CAJA_EXTRA)) return;
    cobrarCompra(COSTO_EMP_CAJA_EXTRA, x, y);
    k.emp = true;
  } else if (tipo.startsWith("emp:")) {
    const g = productorDe(tipo.slice(4));
    if (!g || !g.comprado || g.emp || !alcanza(g.costoEmp) || !destinosDe(g.producto).length) return;
    cobrarCompra(g.costoEmp, x, y);
    g.emp = nuevoEmpleadoJardin(g);
  } else if (tipo === "estante") {
    const slot = siguienteSlot();
    if (!hayPrimerEstante() || slot < 0 || ampDe(slot) > edificio) return;
    const delProducto = slot < TODOS.length;     // la estantería número «slot» es del producto TODOS[slot]
    if (delProducto && !productorDe(TODOS[slot]).comprado) return;
    const costo = costoEstanteExtra();
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    if (delProducto) {
      nuevoEstante(slot, TODOS[slot]);
      // las zanahorias de los espacios extra pasan a la estantería nueva de zanahorias
      if (TODOS[slot] === "zanahoria") estantes[estantes.length - 1].items.push(...extra.splice(0));
    } else {
      // estantería adicional: lleva el producto que quieras (se cambia con ↻)
      nuevoEstante(slot, IDS[0]);
    }
  } else if (tipo === "nivel-cajero") {
    if (nivelCajero >= NIVELES_EMP || !cajas.some((k) => k.emp)) return;
    const costo = COSTOS_NIVEL_CAJERO[nivelCajero];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    nivelCajero++;
  } else if (tipo === "nivel-repartidor") {
    if (nivelRepartidor >= NIVELES_EMP || !productores().some((g) => g.emp)) return;
    const costo = COSTOS_NIVEL_REPARTIDOR[nivelRepartidor];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    nivelRepartidor++;
  } else if (tipo === "granja") {
    if (granja || !alcanza(COSTO_GRANJA)) return;
    cobrarCompra(COSTO_GRANJA, x, y);
    abrirGranja();
    textos.push({ x: jugador.x, y: jugador.y, vida: 2.2, txt: "¡Granja comprada! Camina al norte ▲", col: "#ffd24d" });
  } else if (tipo.startsWith("corral:")) {
    const [, op, id] = tipo.split(":");
    const c = corralDe(id);
    if (!c || !c.comprado) return;
    if (op === "vel") {
      if (c.tipo !== "continuo" || c.nivelVel >= COSTOS_VEL.length || !alcanza(COSTOS_VEL[c.nivelVel])) return;
      cobrarCompra(COSTOS_VEL[c.nivelVel], x, y); c.nivelVel++;
    } else if (op === "cant") {
      if (c.tipo !== "carga" || c.nivelCant >= COSTOS_CANT.length || !alcanza(COSTOS_CANT[c.nivelCant])) return;
      cobrarCompra(COSTOS_CANT[c.nivelCant], x, y); c.nivelCant++;
    } else if (op === "tiempo") {
      if (c.tipo !== "carga" || c.nivelTiempo >= COSTOS_TIEMPO.length || !alcanza(COSTOS_TIEMPO[c.nivelTiempo])) return;
      cobrarCompra(COSTOS_TIEMPO[c.nivelTiempo], x, y); c.nivelTiempo++;
    }
  } else if (tipo === "edificio-izq" || tipo === "edificio-der") {
    if (edificio >= COSTOS_EDIFICIO.length) return;
    const costo = COSTOS_EDIFICIO[edificio];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    const lado = tipo === "edificio-izq" ? -1 : 1;
    ampliar(lado);
    textos.push({ x: jugador.x, y: jugador.y, vida: 1.6, txt: lado < 0 ? "◀ ¡Edificio ampliado!" : "¡Edificio ampliado! ▶", col: "#ffd24d" });
  } else if (tipo === "patio-izq" || tipo === "patio-der") {
    if (nivelPatio >= COSTOS_PATIO.length) return;
    const costo = COSTOS_PATIO[nivelPatio];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    const lado = tipo === "patio-izq" ? -1 : 1;
    ampliarPatio(lado);
    textos.push({ x: jugador.x, y: jugador.y, vida: 1.6, txt: lado < 0 ? "◀ ¡Patio ampliado!" : "¡Patio ampliado! ▶", col: "#9dffb0" });
  }
}
// botones de «empleado de jardín» (uno por jardín; solo se ven los de jardines ya comprados)
const btnsEmp = jardines.map((g) => {
  const b = document.createElement("button");
  b.className = "mej"; b.type = "button"; b.hidden = true;
  b.innerHTML = "<span></span><b></b>";
  (FRUTAS.has(g.producto) ? rejFru : rejVer).appendChild(b);
  b.addEventListener("click", () => comprarMejora("emp:" + g.producto));
  return b;
});
// botones de cajas y entradas nuevas (van justo antes del bloque «Edificio»)
function botonPanel(tipo, cont = rejOtras, antes = null) {
  const b = document.createElement("button");
  b.className = "mej"; b.type = "button";
  b.innerHTML = "<span></span><b></b>";
  cont.insertBefore(b, antes);
  b.addEventListener("click", () => comprarMejora(tipo));
  return b;
}
const btnCajaNueva = botonPanel("caja-nueva");
const btnPuertaNueva = botonPanel("puerta-nueva");
const btnNivCajero = botonPanel("nivel-cajero", rejEmp);
const btnNivRepartidor = botonPanel("nivel-repartidor", rejEmp);
// un botón de «empleado» por cada caja extra colocada
function crearBotonEmpCaja(k) {
  const i = cajas.length;   // índice que tendrá esa caja
  return botonPanel("emp-caja:" + i, rejEmp, btnNivCajero);
}
// 🐄 Granja: comprar el terreno y, por cada corral comprado, su empleado y sus mejoras
const titGranja = document.getElementById("titGranja");
function botonGranja(tipo) {
  const b = document.createElement("button");
  b.className = "mej"; b.type = "button"; b.hidden = true;
  b.innerHTML = "<span></span><b></b>";
  rejGranja.appendChild(b);
  b.addEventListener("click", () => comprarMejora(tipo));
  return b;
}
const btnGranja = botonGranja("granja");
const btnsCorral = corrales.map((c) => ({ emp: botonGranja("emp:" + c.producto), vel: botonGranja("corral:vel:" + c.producto), cant: botonGranja("corral:cant:" + c.producto), tiempo: botonGranja("corral:tiempo:" + c.producto) }));
btnCarga.addEventListener("click", () => comprarMejora("carga"));
btnEmpleado.addEventListener("click", () => comprarMejora("empleado"));
btnEstante.addEventListener("click", () => comprarMejora("estante"));
btnEdIzq.addEventListener("click", () => comprarMejora("edificio-izq"));
btnEdDer.addEventListener("click", () => comprarMejora("edificio-der"));
btnPatIzq.addEventListener("click", () => comprarMejora("patio-izq"));
btnPatDer.addEventListener("click", () => comprarMejora("patio-der"));

// Cada botón es un cuadrito: el primer «palabra» del texto es el icono grande, el resto el rótulo corto y abajo el precio (✓ = ya lo tienes)
function pintarBoton(b, texto, precio, activo) {
  let ic = b.querySelector("i");
  if (!ic) { ic = document.createElement("i"); ic.className = "ic"; b.prepend(ic); }
  const i = texto.indexOf(" ");
  ic.textContent = i > 0 ? texto.slice(0, i) : "";
  b.querySelector("span").textContent = i > 0 ? texto.slice(i + 1) : texto;
  b.querySelector("b").textContent = precio;
  b.classList.toggle("hecho", precio === "✓");
  b.title = texto;
  b.disabled = !activo;
}

function pintarGranja() {
  titGranja.textContent = granja ? "🐄 Granja (camina al norte, pasando el patio)" : "🐄 Granja: terreno al norte del patio";
  btnGranja.hidden = granja;
  if (!granja) pintarBoton(btnGranja, "🐄 Comprar granja", "$" + COSTO_GRANJA, alcanza(COSTO_GRANJA));
  corrales.forEach((c, i) => {
    const b = btnsCorral[i], ic = PRODUCTOS[c.producto].icono, a = c.animal;
    const ver = granja && c.comprado;
    b.emp.hidden = b.vel.hidden = b.cant.hidden = b.tiempo.hidden = !ver;
    if (!ver) return;
    const iem = "🧑‍🌾" + ic;
    if (c.emp) pintarBoton(b.emp, iem + " Empleado de " + c.nombre, "✓", false);
    else if (!destinosDe(c.producto).length) pintarBoton(b.emp, iem + " Falta su estantería", "", false);
    else pintarBoton(b.emp, iem + " Empleado de " + c.nombre, "$" + c.costoEmp, alcanza(c.costoEmp));
    if (c.tipo === "continuo") {
      b.cant.hidden = b.tiempo.hidden = true;
      const n = c.nivelVel, ahora = periodoCont(c);
      if (n >= COSTOS_VEL.length) pintarBoton(b.vel, "⚡" + ic + " Al máximo: cada " + ahora.toFixed(1) + " s", "", false);
      else pintarBoton(b.vel, "⚡" + ic + " Más rápido " + ahora.toFixed(1) + " → " + (ahora * VEL_FACTOR).toFixed(1) + " s", "$" + COSTOS_VEL[n], alcanza(COSTOS_VEL[n]));
    } else {
      b.vel.hidden = true;
      const nc = c.nivelCant, nt = c.nivelTiempo;
      if (nc >= COSTOS_CANT.length) pintarBoton(b.cant, "📦" + ic + " Carga al máximo: " + cantidadCarga(c), "", false);
      else pintarBoton(b.cant, "📦" + ic + " Más carga " + cantidadCarga(c) + " → " + (cantidadCarga(c) + CARGA_PASO), "$" + COSTOS_CANT[nc], alcanza(COSTOS_CANT[nc]));
      if (nt >= COSTOS_TIEMPO.length) pintarBoton(b.tiempo, "⏱" + ic + " Espera mínima " + mmss(tiempoNivel(nt)), "", false);
      else pintarBoton(b.tiempo, "⏱" + ic + " Menos espera " + mmss(tiempoNivel(nt)) + " → " + mmss(tiempoNivel(nt + 1)), "$" + COSTOS_TIEMPO[nt], alcanza(COSTOS_TIEMPO[nt]));
    }
  });
}

function actualizarPanel() {
  enMejoras = estado === "jugando" && distRect(jugador.x, jugador.y, MEJORAS_ZONA) <= 4;
  panel.classList.toggle("oculto", !enMejoras || !!colocando);
  if (!enMejoras) return;
  if (nivelCarga >= COSTOS_CARGA.length) pintarBoton(btnCarga, "🧤 Carga al máximo: " + cargaMax(), "", false);
  else pintarBoton(btnCarga, "🧤 Llevar más " + cargaMax() + " → " + (cargaMax() + 1), "$" + COSTOS_CARGA[nivelCarga], alcanza(COSTOS_CARGA[nivelCarga]));
  pintarBoton(btnEmpleado, "👷 Cajero 1", cajas[0].emp ? "✓" : "$" + COSTO_EMPLEADO, !cajas[0].emp && alcanza(COSTO_EMPLEADO));
  cajas.forEach((k, i) => {
    if (!k.boton) return;
    pintarBoton(k.boton, "👷 Cajero " + (i + 1), k.emp ? "✓" : "$" + COSTO_EMP_CAJA_EXTRA, !k.emp && alcanza(COSTO_EMP_CAJA_EXTRA));
  });
  const seg = (v) => (v >= 1 ? v.toFixed(1) : v.toFixed(2)) + " s";
  const hayCajeros = cajas.some((k) => k.emp), hayRepartidores = productores().some((g) => g.emp);
  btnNivCajero.hidden = !hayCajeros;
  btnNivRepartidor.hidden = !hayRepartidores;
  if (hayCajeros) {
    if (nivelCajero >= NIVELES_EMP) pintarBoton(btnNivCajero, "💵 Cajeros al máximo: " + seg(tiempoCobroEmp()) + " por cliente", "", false);
    else pintarBoton(btnNivCajero, "💵 Cajeros nivel " + nivelCajero + "/" + NIVELES_EMP + ": " + seg(tiempoCobroEmp()) + " → " + seg(tiempoCobroEmp(nivelCajero + 1)), "$" + COSTOS_NIVEL_CAJERO[nivelCajero], alcanza(COSTOS_NIVEL_CAJERO[nivelCajero]));
  }
  if (hayRepartidores) {
    if (nivelRepartidor >= NIVELES_EMP) pintarBoton(btnNivRepartidor, "🏃 Empleados al máximo: llevan " + empCarga(), "", false);
    else pintarBoton(btnNivRepartidor, "🏃 Empleados nivel " + nivelRepartidor + "/" + NIVELES_EMP + ": llevan " + empCarga(), "$" + COSTOS_NIVEL_REPARTIDOR[nivelRepartidor], alcanza(COSTOS_NIVEL_REPARTIDOR[nivelRepartidor]));
  }
  const extraCajas = cajas.length - 1, extraPuertas = puertas.length - 1;
  if (extraCajas >= MAX_CAJAS_EXTRA) pintarBoton(btnCajaNueva, "🧾 Cajas al máximo", "", false);
  else pintarBoton(btnCajaNueva, "🧾 Caja nueva", "$" + costoCajaNueva(), !colocando && alcanza(costoCajaNueva()));
  if (extraPuertas >= MAX_PUERTAS_EXTRA) pintarBoton(btnPuertaNueva, "🚪 Entradas al máximo", "", false);
  else pintarBoton(btnPuertaNueva, "🚪 Entrada nueva", "$" + costoPuertaNueva(), !colocando && alcanza(costoPuertaNueva()));
  const slot = siguienteSlot();
  if (!hayPrimerEstante()) pintarBoton(btnEstante, "🗄️ Falta la 1.ª estantería", "", false);
  else if (slot < 0) pintarBoton(btnEstante, "🗄️ Estanterías al máximo", "", false);
  else if (slot < TODOS.length && !productorDe(TODOS[slot]).comprado) pintarBoton(btnEstante, "🗄️ Antes compra " + (productorDe(TODOS[slot]).tipo ? "el corral" : "el jardín") + " de " + PRODUCTOS[TODOS[slot]].icono, "", false);
  else if (ampDe(slot) > edificio) pintarBoton(btnEstante, "🗄️ Agranda el edificio", "", false);
  else pintarBoton(btnEstante, slot < TODOS.length ? "🗄️ Estantería de " + PRODUCTOS[TODOS[slot]].icono : "🗄️ Estantería nueva", "$" + costoEstanteExtra(), alcanza(costoEstanteExtra()));
  // un empleado por jardín comprado
  jardines.forEach((g, i) => {
    const b = btnsEmp[i], ic = PRODUCTOS[g.producto].icono;
    b.hidden = !g.comprado;
    if (!g.comprado) return;
    const iem = "🧑‍🌾" + ic;
    if (g.emp) pintarBoton(b, iem + " Empleado", "✓", false);
    else if (!destinosDe(g.producto).length) pintarBoton(b, iem + " Falta su estantería", "", false);
    else pintarBoton(b, iem + " Empleado", "$" + g.costoEmp, alcanza(g.costoEmp));
  });
  pintarGranja();
  // edificio y patio se mejoran por separado: cada uno con su lado a elegir
  const maxEd = edificio >= COSTOS_EDIFICIO.length;
  btnEdIzq.hidden = btnEdDer.hidden = maxEd;
  if (!maxEd) {
    const c = COSTOS_EDIFICIO[edificio];
    pintarBoton(btnEdIzq, "🏗️ Edificio ◀ +4 estantes", "$" + c, alcanza(c));
    pintarBoton(btnEdDer, "🏗️ Edificio ▶ +4 estantes", "$" + c, alcanza(c));
  }
  const maxPat = nivelPatio >= COSTOS_PATIO.length;
  const sig = siguienteJardin();
  btnPatIzq.hidden = btnPatDer.hidden = maxPat;
  avisoPatio.hidden = !(sig && !sig.disponible);
  if (sig && !sig.disponible) avisoPatio.textContent = "🌱 Patio lleno: amplíalo para el jardín de " + PRODUCTOS[sig.producto].icono;
  if (!maxPat) {
    const c = COSTOS_PATIO[nivelPatio];
    pintarBoton(btnPatIzq, "🌱 Patio ◀ +6 jardines", "$" + c, alcanza(c));
    pintarBoton(btnPatDer, "🌱 Patio ▶ +6 jardines", "$" + c, alcanza(c));
  }
  // las secciones sin botones visibles (por ejemplo, frutas antes de comprar la primera) no se muestran
  for (const sec of secciones) sec.hidden = !sec.querySelector(".mej:not([hidden])");
}

function actualizar(dt) {
  if (tocando && ptr) objetivo = posicion(ptr);   // sigue al dedo aunque la cámara se mueva
  mover(dt);
  comprarCosas();
  crecerJardin(dt);
  actualizarCorrales(dt);
  traspasos(dt);
  actualizarEmpleados(dt);
  actualizarClientes(dt);
  textos.forEach((t) => { t.z = (t.z || 0) + 28 * dt; t.vida -= dt; });
  textos = textos.filter((t) => t.vida > 0);
}

function actualizarBarraColocar() {
  const activa = estado === "jugando" && !!colocando;
  elColocar.classList.toggle("oculto", !activa);
  if (!activa) return;
  const esCaja = colocando.tipo === "caja";
  const ok = esCaja ? fantasmaCaja().ok : fantasmaPuerta().ok;
  const costo = esCaja ? costoCajaNueva() : costoPuertaNueva();
  elColTxt.textContent = (esCaja ? "🧾 Camina hasta donde quieras la caja registradora" : "🚪 Camina hasta donde quieras la entrada (se pone en la pared de abajo)") +
    (ok ? " · $" + costo : " · aquí no se puede (rojo)");
  btnColSi.disabled = !ok || !alcanza(costo);
}
document.getElementById("colSi").addEventListener("click", () => terminarColocacion(true));
document.getElementById("colNo").addEventListener("click", () => terminarColocacion(false));

function actualizarHud() {
  elDinero.textContent = admin.dinero ? "∞" : dinero.toLocaleString("es-MX");
  elCarga.textContent = carga.length + "/" + cargaMax();
  const xe = extraEstante();
  elEstante.textContent = estantes.length
    ? estantes.reduce((s, e) => s + e.items.length, 0) + (xe ? extra.length : 0) + "/" + (estantes.length * ESTANTE_CAP + (xe ? EXTRA_ZANAHORIA_CAP : 0))
    : "—";
  elClientes.textContent = clientes.length + "/" + maxClientes();
  actualizarPanel();
  actualizarBarraColocar();
}

// ---------- Entrada ----------
function pantallaDe(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * MUNDO.w, y: ((ev.clientY - r.top) / r.height) * MUNDO.h };
}
// Un toque en la pantalla se convierte al punto del suelo que se ve ahí (y se deja dentro del terreno)
function posicion(ev) {
  const s = pantallaDe(ev), m = desdePantalla(s.x, s.y);
  return { x: Math.max(wMin + RADIO, Math.min(wMax - RADIO, m.x)), y: Math.max(yMin + RADIO, Math.min(MUNDO.h - RADIO, m.y)) };
}
lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando") return;
  const p = posicion(ev), s = pantallaDe(ev);
  // botón ↻ de una estantería: cambia su producto (no te mueve). Se busca donde se VE el botón, sobre el mueble
  const e = estantes.find((q) => { if (q.fija) return false; const c = P(q.x + 13, q.y + q.h / 2, ALTO_ESTANTE + 8); return Math.hypot(s.x - c.x, s.y - c.y) <= 20; });
  if (e) { cambiarProducto(e); return; }
  lienzo.setPointerCapture(ev.pointerId);
  tocando = true;
  ptr = { clientX: ev.clientX, clientY: ev.clientY };
  objetivo = p;
});
lienzo.addEventListener("pointermove", (ev) => { if (tocando) { ptr = { clientX: ev.clientX, clientY: ev.clientY }; objetivo = posicion(ev); } });
lienzo.addEventListener("pointerup", () => { tocando = false; });
lienzo.addEventListener("pointercancel", () => { tocando = false; });
window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  if (k.startsWith("arrow")) ev.preventDefault();
  teclas[k] = true;
});
window.addEventListener("keyup", (ev) => { teclas[ev.key.toLowerCase()] = false; });
window.addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; });

ovlBtn.addEventListener("click", () => {
  estado = "jugando";
  ovl.classList.add("oculto");
  btnMenu.hidden = false;       // ☰ Pausa solo se ve dentro de la partida (en la pantalla de inicio no se muestra)
  tono(440, 0.12);
});

// ----- ☰ Pausa (estándar: compartido/menu-pausa.js) -----
// «Salir» vuelve a la pantalla de inicio SIN borrar la partida: con «Jugar» sigues donde ibas (el juego aún no se guarda al cerrar la página).
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => estado === "jugando" && info.classList.contains("oculto"),
  alAbrir: () => { pausado = true; tocando = false; objetivo = null; velPanel.classList.add("oculto"); },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "ℹ️", texto: "Info", clase: "b-azul", alElegir: () => info.classList.remove("oculto") }],   // el juego sigue en pausa mientras lees
  ayudaSalir: "Vuelves al inicio; con «Jugar» sigues donde ibas.",
  alSalir: () => {
    pausado = false;
    if (colocando) terminarColocacion(false);
    if (pregunta) cerrarPregunta();
    estado = "inicio";
    ovl.classList.remove("oculto");
    btnMenu.hidden = true;
  },
});

// ℹ️ Info: vuelve al menú de pausa (Esc también)
function cerrarInfo() { info.classList.add("oculto"); pausa.abrir(); }
infoVolver.addEventListener("click", cerrarInfo);
window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !info.classList.contains("oculto")) { ev.preventDefault(); cerrarInfo(); } });

// ----- ⏩ Velocidad del tiempo: x1 … x8 -----
// Cada cuadro se corren «velocidad» pasos de juego de la misma duración (no un paso más largo), así a x8 el personaje y los clientes
// no atraviesan muebles ni paredes. Acelera TODO: cultivos, animales, clientes, empleados, relojes de la granja y tu propio personaje.
const VELOCIDADES = [1, 2, 3, 4, 5, 6, 7, 8];
const COLOR_VEL = { 1: "b-gris", 2: "b-verde", 3: "b-verde", 4: "b-azul", 5: "b-azul", 6: "b-morado", 7: "b-morado", 8: "b-rojo" };
const botonesVel = VELOCIDADES.map((v) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d chico txt " + COLOR_VEL[v]; b.textContent = "x" + v;
  b.addEventListener("click", () => { fijarVelocidad(v); abrirVel(false); });
  velPanel.appendChild(b);
  return b;
});
function fijarVelocidad(v) {
  velocidad = v;
  velInfo.textContent = "x" + v;
  velBtn.className = "b3d chico " + COLOR_VEL[v];
  botonesVel.forEach((b, i) => b.classList.toggle("on", VELOCIDADES[i] === v));
}
function abrirVel(abrir) {
  velPanel.classList.toggle("oculto", !abrir);
  velBtn.setAttribute("aria-expanded", String(abrir));
}
velBtn.addEventListener("click", (ev) => { ev.stopPropagation(); abrirVel(velPanel.classList.contains("oculto")); });
document.addEventListener("pointerdown", (ev) => { if (!velPanel.classList.contains("oculto") && !velPanel.contains(ev.target) && ev.target !== velBtn && !velBtn.contains(ev.target)) abrirVel(false); });
fijarVelocidad(1);

// ---------- Dibujo ----------
// La pantalla es siempre vertical (proporción de un celular): se ajusta al alto disponible y nunca crece.
// Si el edificio es más ancho, solo se ve un trozo y la cámara lo recorre.
const tablero = lienzo.parentElement;
function ajustar() {
  dpr = window.devicePixelRatio || 1;
  // El tamaño del marco lo calcula el CSS (inmersivo): aquí solo se lee el ancho real
  const wReal = lienzo.clientWidth;
  escala = wReal / MUNDO.w;
  lienzo.style.height = MUNDO.h * escala + "px";
  lienzo.width = Math.round(wReal * dpr);
  lienzo.height = Math.round(MUNDO.h * escala * dpr);
  panel.style.bottom = Math.round((MUNDO.h - MEJORAS_ZONA.y + 6) * escala) + "px";   // el panel de mejoras queda justo arriba de la zona 🛠️
}
window.addEventListener("resize", ajustar);

function caja(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function emoji(txt, x, y, tam) {
  ctx.font = tam + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(txt, x, y);
}

function etiqueta(txt, x, y, col, tam = 13) {
  ctx.font = "bold " + tam + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 4; ctx.strokeStyle = "#0008";
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = col || "#fff";
  ctx.fillText(txt, x, y);
}

function persona(x, y, camisa, piel, delantal) {
  ctx.fillStyle = "rgba(0,0,0,.2)";
  ctx.beginPath(); ctx.ellipse(x, y + 12, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = camisa;
  caja(x - 9, y - 4, 18, 18, 7); ctx.fill();
  if (delantal) { ctx.fillStyle = "#ffffffcc"; caja(x - 6, y + 1, 12, 12, 4); ctx.fill(); }
  ctx.fillStyle = piel;
  ctx.beginPath(); ctx.arc(x, y - 10, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#2b1a3a";
  ctx.beginPath(); ctx.arc(x - 3, y - 11, 1.4, 0, Math.PI * 2); ctx.arc(x + 3, y - 11, 1.4, 0, Math.PI * 2); ctx.fill();
}

// ---------- Vista isométrica ----------
// La lógica del juego sigue en un mapa plano (x, y). Aquí solo se PROYECTA a la pantalla en rombos 2:1:
//   x crece hacia abajo-derecha · y crece hacia abajo-izquierda · z es la altura.
// Lo plano (calle, banqueta, piso, camas de cultivo) se dibuja con UNA transformación (modoPlano).
// Lo que tiene altura (muebles, paredes, personas, cultivos, autos) se dibuja uno por uno, ordenado por profundidad.
const ISO = 0.85;            // escala horizontal de la proyección (el alto de pantalla es la mitad: rombos 2:1)
const CENTRO_Y = 340;        // en qué altura de la pantalla queda el personaje
const BANQUETA = 36;         // ancho de la banqueta alrededor del local (por ahí entran los clientes)
const CALLE = 90;            // ancho de la calle que rodea todo
const ALTO_ESTANTE = 24;     // altura de las estanterías
const ALTO_PARED = 16;       // altura de las paredes de atrás (las de adelante son bordillos bajos para ver adentro)

// Mundo (x, y, z) → pantalla (px lógicos de 360×630)
const P = (x, y, z = 0) => ({ x: (x - y) * ISO - camX + MUNDO.w / 2, y: ((x + y) * ISO) / 2 - camY + CENTRO_Y - z });
// Pantalla → punto del suelo (z = 0), lo contrario de P
function desdePantalla(sx, sy) {
  const u = sx - MUNDO.w / 2 + camX, v = sy - CENTRO_Y + camY;
  return { x: (u + 2 * v) / (2 * ISO), y: (2 * v - u) / (2 * ISO) };
}
const modoPantalla = () => ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
function modoPlano() {   // después de esto se dibuja en coordenadas del MAPA y sale en isométrico
  const k = dpr * escala, ox = MUNDO.w / 2 - camX, oy = CENTRO_Y - camY;
  ctx.setTransform(k * ISO, (k * ISO) / 2, -k * ISO, (k * ISO) / 2, k * ox, k * oy);
}
function centrarCamara() {
  camX = (jugador.x - jugador.y) * ISO;
  camY = ((jugador.x + jugador.y) * ISO) / 2;
}
function enPantalla(x, y, m = 90) {
  const s = P(x, y);
  return s.x > -m && s.x < MUNDO.w + m && s.y > -m && s.y < MUNDO.h + m + 60;
}

// ----- Piezas para dibujar cajas con altura -----
function sombra(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return "rgb(" + Math.round(((n >> 16) & 255) * f) + "," + Math.round(((n >> 8) & 255) * f) + "," + Math.round((n & 255) * f) + ")";
}
const paleta = (c) => ({ top: c, sur: sombra(c, 0.8), este: sombra(c, 0.62), borde: "rgba(0,0,0,.25)" });
const PAL = {
  madera: { top: "#c79055", sur: "#9a6b3c", este: "#7a5430", borde: "rgba(0,0,0,.25)" },
  pared: { top: "#e3c394", sur: "#b9885a", este: "#9a6f45", borde: "rgba(0,0,0,.25)" },
  bordillo: { top: "#d8d6cf", sur: "#aeaca4", este: "#908e86", borde: "rgba(0,0,0,.2)" },
  mostrador: { top: "#e8c48e", sur: "#8a5a2b", este: "#6e4520", borde: "rgba(0,0,0,.3)" },
  registro: { top: "#4a5568", sur: "#3b4658", este: "#2b3140", borde: "rgba(0,0,0,.3)" },
  poste: { top: "#a9753f", sur: "#8a5a2b", este: "#6e4520", borde: null },
  vidrio: { top: "#cfe8f5", sur: "#9ec4d8", este: "#7ba3b8", borde: "rgba(0,0,0,.2)" },
};

function poligono(pts, relleno, borde) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
}
// Caja con altura: ocupa x..x+w, y..y+h del mapa y sube «alto» px desde la altura z0. Se ven la cara sur, la este y la tapa.
function bloque(x, y, w, h, alto, col, z0 = 0) {
  const z1 = z0 + alto;
  poligono([P(x, y + h, z0), P(x + w, y + h, z0), P(x + w, y + h, z1), P(x, y + h, z1)], col.sur, col.borde);
  poligono([P(x + w, y, z0), P(x + w, y + h, z0), P(x + w, y + h, z1), P(x + w, y, z1)], col.este, col.borde);
  poligono([P(x, y, z1), P(x + w, y, z1), P(x + w, y + h, z1), P(x, y + h, z1)], col.top, col.borde);
}
const losa = (x0, y0, x1, y1, z, col) => poligono([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], col);

// ----- Orden de profundidad -----
// Cada objeto es una caja del mapa {x0,y0,x1,y1}. A está DETRÁS de B si queda entero al oeste o al norte de B.
function ordenar(l) {
  const n = l.length;
  l.forEach((o) => { o.k = (o.x0 + o.x1 + o.y0 + o.y1) / 2; });
  l.sort((a, b) => a.k - b.k);
  const atras = (a, b) => a.x1 <= b.x0 || a.y1 <= b.y0;
  const antes = l.map(() => []);                 // antes[j] = los que deben dibujarse antes que j
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ab = atras(l[i], l[j]), ba = atras(l[j], l[i]);
      if (ab && !ba) antes[j].push(i);
      else if (ba && !ab) antes[i].push(j);
    }
  }
  const visto = new Array(n).fill(false), res = [];
  const visitar = (i) => {
    if (visto[i]) return;
    visto[i] = true;
    for (const d of antes[i]) visitar(d);
    res.push(l[i]);
  };
  for (let i = 0; i < n; i++) visitar(i);
  return res;
}

// ----- Autos decorativos que dan vueltas por la calle -----
const autos = ["#e0463d", "#2f9bff", "#ffd24d", "#a14df0", "#3fcf4a"].map((color, i) => ({ lado: i % 4, t: 40 + i * 70, vel: 70 + (i % 3) * 18, color }));
function carrilAutos() {
  const m = BANQUETA + CALLE * 0.75;
  return { x0: wMin - m, x1: wMax + m, y0: yMin - m, y1: MUNDO.h + m };
}
function puntoAuto(a) {
  const q = carrilAutos();
  const esq = [{ x: q.x0, y: q.y1 }, { x: q.x1, y: q.y1 }, { x: q.x1, y: q.y0 }, { x: q.x0, y: q.y0 }];
  const p = esq[a.lado], s = esq[(a.lado + 1) % 4];
  const largo = Math.hypot(s.x - p.x, s.y - p.y), f = Math.min(1, a.t / largo);
  return { x: p.x + (s.x - p.x) * f, y: p.y + (s.y - p.y) * f, alongX: a.lado % 2 === 0, largo };
}
function actualizarAutos(dt) {
  for (const a of autos) {
    a.t += a.vel * dt;
    const p = puntoAuto(a);
    if (a.t >= p.largo) { a.t -= p.largo; a.lado = (a.lado + 1) % 4; }
  }
}
function dibujarAuto(a, p, w, h) {
  losa(p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2, 0, "rgba(0,0,0,.28)");
  bloque(p.x - w / 2, p.y - h / 2, w, h, 9, paleta(a.color), 2);
  bloque(p.x - w * 0.28, p.y - h * 0.28, w * 0.56, h * 0.56, 7, PAL.vidrio, 11);
}

// Árboles decorativos fuera de la calle
function arbolesFuera() {
  const m = BANQUETA + CALLE + 40, l = [];
  const X0 = wMin - m, X1 = wMax + m, Y0 = yMin - m, Y1 = MUNDO.h + m;
  let i = 0;
  for (let x = X0; x <= X1; x += 90, i++) { const d = i % 2 ? 26 : 0; l.push([x, Y0 - d], [x, Y1 + d]); }
  for (let y = Y0 + 90, j = 0; y < Y1 - 40; y += 90, j++) { const d = j % 2 ? 26 : 0; l.push([X0 - d, y], [X1 + d, y]); }
  return l;
}

// Postes de la valla que rodea cada jardín
function postesDe(g) {
  const { x, y, w, h } = g, p = [];
  const nx = Math.max(1, Math.round(w / 48)), ny = Math.max(1, Math.round(h / 48));
  for (let i = 0; i < nx; i++) p.push([x + (w * i) / nx, y]);
  for (let i = 0; i < ny; i++) p.push([x + w, y + (h * i) / ny]);
  for (let i = 0; i < nx; i++) p.push([x + w - (w * i) / nx, y + h]);
  for (let i = 0; i < ny; i++) p.push([x, y + h - (h * i) / ny]);
  return p;
}
function dibujarPoste(a, b) {
  const sa = P(a[0], a[1], 15), sb = P(b[0], b[1], 15), ba = P(a[0], a[1], 8), bb = P(b[0], b[1], 8);
  ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sa.x, sa.y); ctx.lineTo(sb.x, sb.y); ctx.moveTo(ba.x, ba.y); ctx.lineTo(bb.x, bb.y); ctx.stroke();
  bloque(a[0] - 1.5, a[1] - 1.5, 3, 3, 17, PAL.poste);
}

// ----- Suelo (plano) -----
function dibujarSuelo() {
  const S = BANQUETA, R = CALLE, X0 = wMin, X1 = wMax, Y0 = yMin, Y1 = MUNDO.h, A = X1 - X0, H = Y1 - Y0;
  // terreno de afuera
  ctx.fillStyle = "#86b86b"; ctx.fillRect(X0 - 1600, Y0 - 1600, A + 3200, H + 3200);
  // calle alrededor del local: bordillo, asfalto, rayas blancas, línea central amarilla y cebras
  ctx.fillStyle = "#d4d2cb"; ctx.fillRect(X0 - S - R - 8, Y0 - S - R - 8, A + 2 * (S + R + 8), H + 2 * (S + R + 8));
  ctx.fillStyle = "#4a4d55"; ctx.fillRect(X0 - S - R, Y0 - S - R, A + 2 * (S + R), H + 2 * (S + R));
  ctx.setLineDash([]); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.75)";
  ctx.strokeRect(X0 - S - 6, Y0 - S - 6, A + 2 * (S + 6), H + 2 * (S + 6));
  ctx.strokeRect(X0 - S - R + 6, Y0 - S - R + 6, A + 2 * (S + R - 6), H + 2 * (S + R - 6));
  ctx.strokeStyle = "#f2d04a"; ctx.lineWidth = 3; ctx.setLineDash([22, 16]);
  const c = S + R / 2;
  ctx.strokeRect(X0 - c, Y0 - c, A + 2 * c, H + 2 * c);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  for (const p of puertas) for (let yy = Y1 + S + 6; yy < Y1 + S + R - 8; yy += 14) ctx.fillRect(p.x - 26, yy, 52, 7);
  // banqueta
  ctx.fillStyle = "#c9c6bd"; ctx.fillRect(X0 - S, Y0 - S, A + 2 * S, H + 2 * S);
  ctx.strokeStyle = "rgba(0,0,0,.1)"; ctx.lineWidth = 1;
  for (let x = Math.ceil((X0 - S) / 36) * 36; x < X1 + S; x += 36) { ctx.beginPath(); ctx.moveTo(x, Y1); ctx.lineTo(x, Y1 + S); ctx.stroke(); }
  // terreno del local (pasto)
  ctx.fillStyle = "#9bd27f"; ctx.fillRect(X0, Y0, A, H);
  if (granja) {   // granja: paja clara y su cerca
    ctx.fillStyle = "rgba(214,170,80,.25)"; ctx.fillRect(0, yMin, MUNDO.w, -yMin);
    ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4; ctx.setLineDash([10, 5]);
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(2, yMin + 3); ctx.lineTo(MUNDO.w - 2, yMin + 3); ctx.lineTo(MUNDO.w - 2, 0); ctx.stroke();
    ctx.setLineDash([]);
  }
  // patio (zona de los jardines): un poco más claro y con su cerca; es una zona aparte del edificio
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(pMin, 0, pMax - pMin, TOP);
  ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4; ctx.setLineDash([10, 5]);
  ctx.beginPath(); ctx.moveTo(pMin + 2, TOP); ctx.lineTo(pMin + 2, 3);
  if (granja) { ctx.moveTo(pMax - 2, 3); } else ctx.lineTo(pMax - 2, 3);   // con la granja, el patio queda abierto por arriba
  ctx.lineTo(pMax - 2, TOP); ctx.stroke();
  ctx.setLineDash([]);
  // adentro: piso del edificio, con sus ampliaciones y cuadros
  ctx.fillStyle = "#efe3c8";
  ctx.fillRect(xMin, TOP, xMax - xMin, MUNDO.h - TOP);
  ctx.fillStyle = "rgba(150,105,40,.07)";
  for (const a of ampliaciones) ctx.fillRect(a.x0, TOP, EXT_ANCHO, MUNDO.h - TOP);
  ctx.fillStyle = "rgba(0,0,0,.04)";
  const t = 40;
  for (let f = Math.ceil((TOP - 1) / t); f * t < MUNDO.h; f++) {
    for (let k = Math.floor(xMin / t); k < Math.ceil(xMax / t); k++) {
      if (!((f + k) % 2)) continue;
      const x0 = Math.max(xMin, k * t), x1 = Math.min(xMax, (k + 1) * t);
      if (x1 > x0) ctx.fillRect(x0, f * t, x1 - x0, Math.min(t, MUNDO.h - f * t));
    }
  }
  // tapete de cada entrada
  for (const p of puertas) { ctx.fillStyle = "#8f6ad0"; caja(p.x - 30, MUNDO.h - 14, 60, 14, 4); ctx.fill(); }
}

// Lo plano del juego: camas de cultivo, lugares por comprar, zona de mejoras, sitio donde colocas algo y marca de destino
function dibujarPlanoJuego() {
  for (const g of jardines) {
    if (!g.disponible) continue;
    const { x, y, w, h } = g;
    if (!g.comprado) {
      if (g !== siguienteJardin()) continue;   // solo se muestra el siguiente jardín
      const puede = alcanza(g.costo) && puedeJardin(g);
      ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
      ctx.strokeStyle = puede ? "#2e9d4a" : "#999";
      caja(x, y, w, h, 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 10); ctx.fill();
      continue;
    }
    ctx.fillStyle = "#6fae52"; caja(x, y, w, h, 10); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "#8a5a2b"; caja(x, y, w, h, 10); ctx.stroke();
    g.parcelas.forEach((p, i) => {
      const c = centroParcela(g, i);
      ctx.fillStyle = "#6b4426";
      ctx.beginPath(); ctx.ellipse(c.x, c.y, 21, 18, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  if (!hayPrimerEstante()) {
    const { x, y, w, h } = rectEstante(0);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = alcanza(COSTO_PRIMER_ESTANTE) ? "#2e9d4a" : "#999";
    caja(x, y, w, h, 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 8); ctx.fill();
  }
  if (granja) {
    for (const c of corrales) {
      const { x, y, w, h } = c;
      if (!c.comprado) {
        ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = alcanza(c.costo) ? "#2e9d4a" : "#999";
        caja(x, y, w, h, 10); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 10); ctx.fill();
        continue;
      }
      ctx.fillStyle = c.tipo === "carga" ? "#c9a25a" : "#d8bf7a"; caja(x, y, w, h, 10); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#8a5a2b"; caja(x, y, w, h, 10); ctx.stroke();
      if (c.tipo === "continuo") c.parcelas.forEach((p, i) => { const pc = centroParcela(c, i); ctx.fillStyle = "#b8923e"; ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 20, 17, 0, 0, Math.PI * 2); ctx.fill(); });
    }
  }
  { // zona de mejoras
    const { x, y, w, h } = MEJORAS_ZONA;
    ctx.fillStyle = enMejoras ? "#7d93c9" : "#5f759f";   // alfombra frente al escritorio
    caja(x, y, w, h, 10); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#33415f"; caja(x, y, w, h, 10); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.35)"; caja(x + 5, y + 5, w - 10, h - 10, 7); ctx.stroke();
  }
  if (colocando && estado === "jugando") {
    if (colocando.tipo === "caja") {
      const { k, ok } = fantasmaCaja();
      ctx.fillStyle = ok ? "rgba(60,200,100,.28)" : "rgba(230,60,60,.3)";
      for (const r of huellaCaja(k)) ctx.fillRect(r.x, r.y, r.w, r.h);   // la fila de clientes también ocupa lugar
      ctx.lineWidth = 3; ctx.strokeStyle = ok ? "#2e9d4a" : "#e04646"; ctx.setLineDash([6, 4]);
      caja(k.x - 2, k.y - 13, k.w + 4, k.h + 13, 8); ctx.stroke(); ctx.setLineDash([]);
    } else {
      const { x, ok } = fantasmaPuerta();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = ok ? "#58d27a" : "#e04646"; caja(x - 30, MUNDO.h - 14, 60, 14, 4); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (objetivo && estado === "jugando") {   // marca del lugar al que caminas (en el suelo se ve como óvalo)
    ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(objetivo.x, objetivo.y, 8, 0, Math.PI * 2); ctx.stroke();
  }
}

// ----- Granja -----
function dibujarAnimal(c, a) {
  const s = P(a.x, a.y);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  emoji(c.animal, s.x, s.y - 9, 20);
}
function dibujarProvisiones(c, cx, cy) {   // cajón de la carga: se ve lleno cuando hay algo por recoger
  bloque(cx, cy, 28, 28, 14, PAL.madera);
  if (c.stock > 0) {
    bloque(cx + 4, cy + 4, 20, 20, 9, PAL.madera, 14);
    const s = P(cx + 14, cy + 14, 36);
    emoji(PRODUCTOS[c.producto].icono, s.x, s.y, 20);
  }
}

// ----- Objetos con altura -----
function dibujarEstanteIso(e) {
  const { x, y, w, h } = e, H = ALTO_ESTANTE;
  const conExtra = e.slot === 0 && extrasActivas();
  const ancho = (w - 28) / ESTANTE_CAP;
  const tw = 24 + EXTRA_ZANAHORIA_CAP * ancho + 4;
  bloque(x, y, w, h, H, PAL.madera);
  if (conExtra) bloque(x, y + h, tw, EXT_H, H, PAL.madera);   // un solo mueble que crece hacia el frente
  // tapa: panel del producto y un espacio por cada pieza que cabe
  losa(x + 3, y + 4, x + 23, y + h - 4, H, "#f3e0c2");
  losa(x + 24, y + 4, x + w - 4, y + h - 4, H, "#b57f46");
  for (let i = 0; i < ESTANTE_CAP; i++) losa(x + 24 + i * ancho + 1.5, y + 7, x + 24 + (i + 1) * ancho - 1.5, y + h - 7, H, "rgba(0,0,0,.16)");
  const ic = P(x + 13, y + h / 2, H + 8);
  if (e.fija) emoji(PRODUCTOS[e.producto].icono, ic.x, ic.y, 15);
  else {
    emoji(PRODUCTOS[e.producto].icono, ic.x, ic.y - 3, 14);
    etiqueta("↻", ic.x, ic.y + 10, "#6a4a1a", 11);
  }
  for (let i = 0; i < ESTANTE_CAP; i++) {
    const s = P(x + 24 + (i + 0.5) * ancho, y + h / 2, H + 8);
    if (e.items[i]) emoji(PRODUCTOS[e.items[i]].icono, s.x, s.y, 16);
    else { ctx.globalAlpha = 0.22; emoji(PRODUCTOS[e.producto].icono, s.x, s.y, 14); ctx.globalAlpha = 1; }
  }
  if (conExtra) {   // parte del frente: panel de 🥕 y 2 espacios para zanahorias
    const ty = y + h;
    losa(x + 3, ty + 2, x + 23, ty + EXT_H - 2, H, "#f3e0c2");
    losa(x + 24, ty + 2, x + tw - 4, ty + EXT_H - 2, H, "#b57f46");
    const sc = P(x + 13, ty + EXT_H / 2, H + 8);
    emoji(PRODUCTOS.zanahoria.icono, sc.x, sc.y, 14);
    for (let i = 0; i < EXTRA_ZANAHORIA_CAP; i++) {
      losa(x + 24 + i * ancho + 1.5, ty + 4, x + 24 + (i + 1) * ancho - 1.5, ty + EXT_H - 4, H, "rgba(0,0,0,.16)");
      const s = P(x + 24 + (i + 0.5) * ancho, ty + EXT_H / 2, H + 8);
      if (extra[i]) emoji(PRODUCTOS[extra[i]].icono, s.x, s.y, 16);
      else { ctx.globalAlpha = 0.25; emoji(PRODUCTOS.zanahoria.icono, s.x, s.y, 14); ctx.globalAlpha = 1; }
    }
  }
}

// La zona de mejoras: una computadora sobre un escritorio de madera (la pantalla se enciende cuando estás parado en la alfombra)
function dibujarEscritorioIso() {
  const { x, y, w } = MEJORAS_ZONA, on = enMejoras, cx = x + w / 2;
  const plastico = { top: "#cfd5df", sur: "#9aa3b2", este: "#7c8596", borde: "rgba(0,0,0,.3)" };
  const marco = { top: "#3a4152", sur: "#2b3140", este: "#1f2430", borde: "rgba(0,0,0,.45)" };
  for (const [px, py] of [[x + 8, y + 3], [x + w - 12, y + 3], [x + 8, y + 19], [x + w - 12, y + 19]]) bloque(px, py, 4, 3, 14, PAL.poste);   // patas
  bloque(x + 6, y + 2, w - 12, 22, 4, PAL.madera, 14);                                                                                   // tablero
  bloque(cx - 8, y + 6, 16, 5, 2, marco, 18);                                                                                            // base del monitor
  bloque(cx - 2, y + 7, 4, 2, 6, marco, 20);                                                                                             // cuello
  bloque(cx - 22, y + 6, 44, 4, 26, marco, 25);                                                                                          // marco del monitor
  bloque(cx - 19, y + 10, 38, 1, 20, { top: "#9ad8ff", sur: on ? "#7fd8ff" : "#2f4764", este: "#2f4764", borde: null }, 28);            // pantalla
  bloque(cx - 15, y + 15, 30, 7, 2, plastico, 18);                                                                                       // teclado
  bloque(cx + 20, y + 16, 5, 6, 2, plastico, 18);                                                                                        // ratón
  if (on) { const s = P(cx, y + 11, 40); emoji("🛠️", s.x, s.y, 14); }
}

function dibujarCajaIso(k) {
  const { x, y, w, h } = k;
  const c0 = k.cola[0], s0 = slotCaja(k, 0);
  const frente = c0 && Math.hypot(c0.x - s0.x, c0.y - s0.y) < 3;
  const abierto = frente && hayCajero(k);
  const yp = y + h * 0.55;   // hasta dónde llega el toldo
  bloque(x, y, w, h, 20, PAL.mostrador);
  for (const px of [x + 2, x + w - 4]) bloque(px, yp - 1, 2, 2, 22, PAL.poste, 20);   // postes del toldo
  bloque(x + 6, y + 10, 24, 16, 8, PAL.registro, 20);                                  // caja registradora
  if (abierto) bloque(x + 8, y + 26, 20, 8, 3, { top: "#6fcf7a", sur: "#e9eef6", este: "#cfd8e6", borde: "rgba(0,0,0,.2)" }, 17);   // cajón abierto con billetes
  bloque(x + 10, y + 8, 14, 3, 10, { top: abierto ? "#b6ffcf" : "#8ff0b4", sur: "#2f6f4a", este: "#1f4f34", borde: "rgba(0,0,0,.3)" }, 28);   // pantalla
  // toldo de rayas rojas y blancas, flotando sobre el mostrador
  const n = Math.round(w / 8);
  for (let i = 0; i < n; i++) losa(x + (i * w) / n, y - 8, x + ((i + 1) * w) / n, yp, 42, i % 2 ? "#ffffff" : "#e0463d");
  const sl = P(x + w / 2, y + h, 11);
  etiqueta("CAJA", sl.x, sl.y, "#ffe9c4", 9);
  // sobre el mostrador: la compra del cliente que está pagando, o un recibo si no hay nadie
  if (frente && c0.carrito.length) {
    c0.carrito.slice(0, 6).forEach((id, i) => { const s = P(x + 38 + (i % 3) * 10, y + 12 + Math.floor(i / 3) * 11, 26); emoji(PRODUCTOS[id].icono, s.x, s.y, 11); });
  } else {
    const s = P(x + 52, y + 24, 26);
    emoji("🧾", s.x, s.y, 12);
  }
}

function dibujarCultivo(p, c) {
  const m = maduraSeg(), k = m ? Math.min(1, p.t / m) : 1, s = P(c.x, c.y);
  if (k < 1) {   // brote: crece de a poco
    ctx.fillStyle = "#3f9a3a";
    ctx.beginPath(); ctx.arc(s.x, s.y - 5, 3 + 9 * k, 0, Math.PI * 2); ctx.fill();
  } else emoji(PRODUCTOS[p.id].icono, s.x, s.y - 12, 26);
}

function dibujarJugador() {
  const s = P(jugador.x, jugador.y);
  persona(s.x, s.y - 12, "#2e9d4a", "#f5cfa0", true);
  // lo que cargas, encima de la cabeza
  carga.forEach((id, i) => emoji(PRODUCTOS[id].icono, s.x + (i - (carga.length - 1) / 2) * 15, s.y - 42, 15));
}

function dibujarEmpleado(g) {
  const em = g.emp, s = P(em.x, em.y), bx = s.x, by = s.y - 12;
  persona(bx, by, em.camisa, "#d9a066", true);
  ctx.fillStyle = "#e8c26b";                      // sombrero de paja
  ctx.beginPath(); ctx.ellipse(bx, by - 17, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by - 18, 6.5, Math.PI, 0); ctx.fill();
  em.carga.forEach((id, i) => emoji(PRODUCTOS[id].icono, bx + (i - (em.carga.length - 1) / 2) * 14, by - 32, 14));
}

function dibujarCliente(c) {
  const s = P(c.x, c.y), bx = s.x, by = s.y - 12;
  persona(bx, by, c.camisa, c.piel, false);
  // burbuja: lo que le falta por tomar, lo que va a pagar o ✅ al salir
  let txt;
  if (c.estado === "comprando") {
    txt = Object.keys(c.lista).filter((id) => c.lista[id] > 0).map((id) => PRODUCTOS[id].icono + "×" + c.lista[id]).join(" ");
  } else if (c.estado === "cola") {
    txt = "💲" + c.carrito.reduce((suma, id) => suma + PRODUCTOS[id].precio, 0);
  } else txt = "✅";
  if (!txt) return;
  ctx.font = "13px system-ui, sans-serif";
  const w = ctx.measureText(txt).width + 14;
  ctx.fillStyle = "#fff"; caja(bx - w / 2, by - 44, w, 20, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(bx - 4, by - 24); ctx.lineTo(bx + 4, by - 24); ctx.lineTo(bx, by - 19); ctx.fill();
  ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, bx, by - 33);
}

// Reúne todo lo que tiene altura, cada cosa con su caja en el mapa para poder ordenarla
function armarObjetos() {
  const l = [];
  const add = (x0, y0, x1, y1, f) => l.push({ x0, y0, x1, y1, f });
  const gente = (x, y, f) => add(x - 6, y - 6, x + 6, y + 6, f);

  // paredes: arriba y a la izquierda altas; derecha y abajo, bordillos bajos para que se vea el interior
  add(xMin, TOP, ABERTURA.a, TOP + 14, () => bloque(xMin, TOP, ABERTURA.a - xMin, 14, ALTO_PARED, PAL.pared));
  add(ABERTURA.b, TOP, xMax, TOP + 14, () => bloque(ABERTURA.b, TOP, xMax - ABERTURA.b, 14, ALTO_PARED, PAL.pared));
  add(xMin, TOP + 14, xMin + 4, MUNDO.h, () => bloque(xMin, TOP + 14, 4, MUNDO.h - TOP - 14, ALTO_PARED, PAL.pared));
  add(xMax - 4, TOP + 14, xMax, MUNDO.h, () => bloque(xMax - 4, TOP + 14, 4, MUNDO.h - TOP - 14, 8, PAL.bordillo));
  // bordillo de abajo, con un hueco por cada entrada
  const xs = puertas.map((p) => p.x).sort((a, b) => a - b);
  let ini = xMin;
  const tramo = (a, b) => { if (b > a) add(a, MUNDO.h - 6, b, MUNDO.h, () => bloque(a, MUNDO.h - 6, b - a, 6, 8, PAL.bordillo)); };
  for (const px of xs) { tramo(ini, px - 34); ini = Math.max(ini, px + 34); }
  tramo(ini, xMax);
  for (const p of puertas) {
    for (const px of [p.x - 34, p.x + 30]) add(px, MUNDO.h - 14, px + 4, MUNDO.h, () => bloque(px, MUNDO.h - 14, 4, 14, 38, PAL.poste));
  }

  // muebles
  estantes.forEach((e) => { const r = rectFull(e); add(r.x, r.y, r.x + r.w, r.y + r.h, () => dibujarEstanteIso(e)); });
  cajas.forEach((k) => add(k.x, k.y, k.x + k.w, k.y + k.h, () => dibujarCajaIso(k)));
  add(ESCRITORIO.x, ESCRITORIO.y, ESCRITORIO.x + ESCRITORIO.w, ESCRITORIO.y + ESCRITORIO.h, dibujarEscritorioIso);

  // jardines: valla y cultivos
  for (const g of jardines) {
    if (!g.comprado || !enPantalla(g.x + g.w / 2, g.y + g.h / 2, 170)) continue;
    const ps = postesDe(g);
    ps.forEach((pt, i) => add(pt[0] - 2, pt[1] - 2, pt[0] + 2, pt[1] + 2, () => dibujarPoste(pt, ps[(i + 1) % ps.length])));
    g.parcelas.forEach((p, i) => {
      if (p.t < 0) return;
      const c = centroParcela(g, i);
      add(c.x - 8, c.y - 8, c.x + 8, c.y + 8, () => dibujarCultivo(p, c));
    });
  }

  // corrales: valla, animales, productos sueltos y cajón de carga
  if (granja) {
    for (const c of corrales) {
      if (!c.comprado || !enPantalla(c.x + c.w / 2, c.y + c.h / 2, 170)) continue;
      const ps = postesDe(c);
      ps.forEach((pt, i) => add(pt[0] - 2, pt[1] - 2, pt[0] + 2, pt[1] + 2, () => dibujarPoste(pt, ps[(i + 1) % ps.length])));
      c.animales.forEach((a) => add(a.x - 7, a.y - 7, a.x + 7, a.y + 7, () => dibujarAnimal(c, a)));
      if (c.tipo === "continuo") {
        c.parcelas.forEach((p, i) => {
          if (p.t < 0) return;
          const pc = centroParcela(c, i);
          add(pc.x - 8, pc.y - 8, pc.x + 8, pc.y + 8, () => { const s = P(pc.x, pc.y); emoji(PRODUCTOS[p.id].icono, s.x, s.y - 8, 20); });
        });
      } else {
        const cx = c.x + c.w - 38, cy = c.y + c.h - 38;
        add(cx, cy, cx + 28, cy + 28, () => dibujarProvisiones(c, cx, cy));
      }
    }
  }
  // personas
  gente(jugador.x, jugador.y, dibujarJugador);
  clientes.forEach((c) => gente(c.x, c.y, () => dibujarCliente(c)));
  productores().forEach((g) => { if (g.emp) gente(g.emp.x, g.emp.y, () => dibujarEmpleado(g)); });
  cajas.forEach((k) => {
    if (!k.emp) return;
    const pe = posEmpleadoCaja(k);
    gente(pe.x, pe.y, () => { const s = P(pe.x, pe.y); persona(s.x, s.y - 12, "#d9534f", "#d9a066", true); });
  });

  // la calle: autos y árboles
  autos.forEach((a) => {
    const p = puntoAuto(a);
    if (!enPantalla(p.x, p.y, 80)) return;
    const w = p.alongX ? 38 : 20, h = p.alongX ? 20 : 38;
    add(p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2, () => dibujarAuto(a, p, w, h));
  });
  arbolesFuera().forEach(([x, y]) => {
    if (!enPantalla(x, y, 70)) return;
    add(x - 10, y - 10, x + 10, y + 10, () => {
      const s = P(x, y);
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
      emoji("🌳", s.x, s.y - 22, 44);
    });
  });
  return l;
}

// Lo que se coloca (caja nueva) se dibuja encima y translúcido
function dibujarFantasmaIso() {
  if (!colocando || estado !== "jugando") return;
  if (colocando.tipo === "caja") {
    const { k } = fantasmaCaja();
    ctx.globalAlpha = 0.6;
    dibujarCajaIso(k);
    ctx.globalAlpha = 1;
  } else {
    const { x, ok } = fantasmaPuerta();
    const s = P(x, MUNDO.h - 6, 46);
    etiqueta("Entrada", s.x, s.y, ok ? "#bfffcf" : "#ffb0b0");
  }
}

// Letreros y textos: se dibujan al final, de frente a la pantalla
function dibujarEtiquetas() {
  for (const cx of [MUNDO.w / 2, ...patios.map((a) => a.x0 + EXT_ANCHO / 2)]) { const s = P(cx, 20); etiqueta("🌱 Patio", s.x, s.y, "#fff", 12); }
  const sig = siguienteJardin();
  if (granja) {
    const s = P(MUNDO.w / 2, yMin + 12); etiqueta("🐄 Granja", s.x, s.y, "#fff", 12);
    for (const c of corrales) {
      if (!c.comprado) {
        const s2 = P(c.x + c.w / 2, c.y + c.h / 2, 6);
        etiqueta(c.animal + " " + c.nombre + "  $" + c.costo, s2.x, s2.y, alcanza(c.costo) ? "#bfffcf" : "#fff");
      } else if (c.tipo === "carga") {
        const s3 = P(c.x + c.w - 24, c.y + c.h - 24, 46), tope = cantidadCarga(c) * STOCK_MAX_CARGAS;
        etiqueta("×" + c.stock + (c.stock >= tope ? " lleno" : "  ⏱ " + mmss(c.reloj)), s3.x, s3.y, "#fff", 11);
      }
    }
  }
  if (sig && !sig.disponible) { const s = P(MUNDO.w / 2, 60); etiqueta("🌱 Amplía el patio para el siguiente jardín", s.x, s.y, "#ffd24d"); }
  if (sig && sig.disponible) {
    const puede = alcanza(sig.costo) && puedeJardin(sig), s = P(sig.x + sig.w / 2, sig.y + sig.h / 2, 6);
    etiqueta(PRODUCTOS[sig.producto].icono + " Jardín  $" + sig.costo, s.x, s.y, puede ? "#bfffcf" : "#fff");
  }
  if (!hayPrimerEstante()) {
    const r = rectEstante(0), s = P(r.x + r.w / 2, r.y + r.h / 2, 6), col = alcanza(COSTO_PRIMER_ESTANTE) ? "#bfffcf" : "#fff";
    etiqueta("🥬 Estantería", s.x, s.y - 8, col);
    etiqueta("$" + COSTO_PRIMER_ESTANTE, s.x, s.y + 9, col);
  }
  const m = P(MEJORAS_ZONA.x + MEJORAS_ZONA.w / 2, MEJORAS_ZONA.y + MEJORAS_ZONA.h / 2, 4);
  etiqueta("💻 Mejoras", m.x, m.y, "#fff");
  for (const p of puertas) { const s = P(p.x, MUNDO.h - 6, 46); etiqueta("Entrada", s.x, s.y, "#fff"); }
  for (const k of cajas) {
    if (k.emp || !k.cola.length) continue;
    const s = P(k.x + k.w / 2, k.y, 52);
    etiqueta("¡Cobra aquí!", s.x, s.y, "#ffd24d");
  }
  for (const t of textos) {
    const s = P(t.x, t.y, 24 + (t.z || 0));
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "#0009"; ctx.strokeText(t.txt, s.x, s.y);
    ctx.fillStyle = t.col; ctx.fillText(t.txt, s.x, s.y);
  }
  ctx.globalAlpha = 1;
}

function dibujar() {
  modoPantalla();
  ctx.fillStyle = "#86b86b"; ctx.fillRect(0, 0, MUNDO.w, MUNDO.h);
  modoPlano();
  dibujarSuelo();
  dibujarPlanoJuego();
  modoPantalla();
  ordenar(armarObjetos()).forEach((o) => o.f());
  dibujarFantasmaIso();
  dibujarEtiquetas();
}

// ---------- Bucle ----------
// La cámara sigue al personaje en pantalla (isométrica), en las dos direcciones
function actualizarCamara(dt) {
  const mx = (jugador.x - jugador.y) * ISO, my = ((jugador.x + jugador.y) * ISO) / 2;
  const f = Math.min(1, dt * CAMARA_SUAVE);
  camX += (mx - camX) * f;
  camY += (my - camY) * f;
}

let ultimo = 0;
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;
  if (estado === "jugando" && !pausado) for (let i = 0; i < velocidad; i++) actualizar(dt);
  actualizarCamara(dt);
  if (!pausado) actualizarAutos(dt * velocidad);
  actualizarHud();
  dibujar();
  requestAnimationFrame(bucle);
}

// ---------- Admin (solo para probar) ----------
// El botón ⚙️ Admin aparece al abrir la página con «?admin» al final de la dirección y se queda guardado en ese aparato
// (con «?admin=0» se vuelve a esconder). Para que lo vea todo el mundo, pon MOSTRAR_ADMIN_SIEMPRE = true.
const MOSTRAR_ADMIN_SIEMPRE = true;      // true: el botón ⚙️ Admin y el de dinero se ven siempre (pon false para esconderlos al publicar)
const DINERO_RAPIDO = 1000;              // cuánto da el botón 💰 de la barra de arriba (cámbialo a la cantidad que quieras)
const lee = (k) => { try { return localStorage.getItem(k) === "1"; } catch (e) { return false; } };
const guarda = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) {} };
let verAdmin = MOSTRAR_ADMIN_SIEMPRE;
const pedidoAdmin = new URLSearchParams(location.search).get("admin");
if (pedidoAdmin !== null) guarda("super_admin", pedidoAdmin !== "0");
if (lee("super_admin")) verAdmin = true;
if (verAdmin) {
  const $ = (id) => document.getElementById(id);
  $("admBtn").hidden = false;
  // botón rápido de dinero, siempre a la vista en la barra de arriba
  const bd = $("dineroBtn");
  bd.textContent = "💰"; bd.title = "Sumar $" + DINERO_RAPIDO;
  bd.hidden = false;
  bd.addEventListener("click", () => {
    dinero += DINERO_RAPIDO;
    textos.push({ x: jugador.x, y: jugador.y, vida: 1.1, txt: "+$" + DINERO_RAPIDO, col: "#7dff9a" });
    tono(880, 0.06);
  });
  $("admBtn").addEventListener("click", () => $("adm").classList.toggle("oculto"));
  const ajustes = [["admDinero", "super_adm_dinero", "dinero"], ["admRapido", "super_adm_rapido", "rapido"]];
  for (const [id, clave, campo] of ajustes) {
    const caja = $(id);
    admin[campo] = caja.checked = lee(clave);
    caja.addEventListener("change", () => { admin[campo] = caja.checked; guarda(clave, caja.checked); });
  }
  const auto = $("admAuto");
  auto.checked = lee("super_adm_auto");
  auto.addEventListener("change", () => { guarda("super_adm_auto", auto.checked); if (auto.checked) desbloquearTodo(); });
  $("admMas").addEventListener("click", () => { dinero += DINERO_RAPIDO; });
  $("admTodo").addEventListener("click", desbloquearTodo);
  $("admReiniciar").addEventListener("click", () => location.reload());
  if (auto.checked) desbloquearTodo();
}

ajustar();
centrarCamara();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });
