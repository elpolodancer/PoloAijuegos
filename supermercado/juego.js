// Ruta: supermercado/juego.js
// «Supermercado»: tienda pequeña y vacía. Compras una estantería y un jardín; en el jardín crecen verduras,
// las recoges y las colocas en las estanterías. Los clientes toman sus productos, van a la caja y pagan.
// Recoger, colocar y comprar lo básico es automático por cercanía. En la zona de mejoras 🛠️ compras
// un empleado de caja, más estanterías y ampliar el edificio a la izquierda o a la derecha (la cámara te sigue).

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
const MAX_CLIENTES = 3;             // clientes a la vez en la tienda
const MAX_CLIENTES_ZANAHORIA = 4;   // clientes a la vez una vez que compras el jardín de zanahorias
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
const EMP_VEL = 85;                 // velocidad (px/s) de los empleados de jardín
const JARDIN_SEP = 4;               // separación (px) entre los jardines y el muro de arriba del edificio

// Costos
const COSTO_PRIMER_ESTANTE = 10;
const COSTO_JARDIN = 5;                // jardín de jitomates
const COSTO_JARDIN_ZANAHORIA = 20;      // jardín de zanahorias (hay que comprarlo antes de la estantería de zanahorias)
const COSTO_JARDIN_MAIZ = 40;
const COSTO_JARDIN_BROCOLI = 60;
const COSTO_JARDIN_BERENJENA = 80;
const COSTO_EMP_JARDIN = { tomate: 15, zanahoria: 25, maiz: 35, brocoli: 45, berenjena: 60 };   // empleado que lleva del jardín a la estantería (uno por jardín)
const COSTO_EMPLEADO = 30;
const COSTO_ESTANTE_EXTRA = (n) => 15 + 10 * n;   // n = estanterías extra que ya compraste
// Edificio: arriba queda siempre el pasto con los jardines. Cada ampliación lo ensancha hacia el lado que elijas
// (izquierda o derecha) y deja 2 estanterías más. Como queda más ancho que la pantalla, la cámara sigue al personaje.
const TOP = 324;                    // dónde empieza el edificio por arriba (fijo)
const COSTOS_EDIFICIO = [40, 80];   // lo que cuesta cada ampliación del EDIFICIO, en orden
const COSTOS_PATIO = [30, 60];      // lo que cuesta cada ampliación del PATIO (zona de pasto con los jardines), en orden; es aparte del edificio


// Productos que existen (precio en dólares)
// El orden importa: la estantería número 1 es del 1.er producto, la 2 del 2.º, etc. (y cada jardín pide haber comprado la estantería del anterior)
const PRODUCTOS = {
  tomate: { icono: "🍅", precio: 1, nombre: "jitomate" },
  zanahoria: { icono: "🥕", precio: 2, nombre: "zanahoria" },
  maiz: { icono: "🌽", precio: 3, nombre: "maíz" },
  brocoli: { icono: "🥦", precio: 4, nombre: "brócoli" },
  berenjena: { icono: "🍆", precio: 5, nombre: "berenjena" },
};
const IDS = Object.keys(PRODUCTOS);

// Lugares del mapa (x, y, w, h en unidades del mapa)
const ESTANTE_W = 120, ESTANTE_H = 44;
const MAX_ESTANTES = (COSTOS_EDIFICIO.length + 1) * 2;
// La estantería número «i»: 0 y 1 en el edificio inicial; 2 y 3 en la 1.ª ampliación; 4 y 5 en la 2.ª
function rectEstante(i) {
  if (i < 2) return { x: i ? 210 : 30, y: TOP + 18, w: ESTANTE_W, h: ESTANTE_H };
  const a = ampliaciones[Math.floor(i / 2) - 1];   // la ampliación que le toca (se compra antes que sus estanterías)
  return { x: (a ? a.x0 : 0) + (i % 2 ? 160 : 20), y: TOP + 18, w: ESTANTE_W, h: ESTANTE_H };
}
// Los jardines están en el pasto, pegados al muro de arriba del edificio (a donde se sale por la abertura del pasillo central)
const CAJA = { x: 10, y: 466, w: 72, h: 40 };     // el mostrador (con toldo, caja registradora y cajón)
const SLOTS_CAJA = [{ x: 100, y: 485 }, { x: 128, y: 485 }, { x: 156, y: 485 }, { x: 184, y: 485 }]; // la fila de la caja (4 lugares)
const POS_EMPLEADO = { x: 46, y: 527 };
const MEJORAS_ZONA = { x: 10, y: 556, w: 108, h: 62 };
const PUERTA = { x: 186, y: MUNDO.h + 14 };       // por donde entran y salen los clientes
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
const titEd = document.getElementById("titEdificio"), botsEd = document.getElementById("botsEdificio");
const titPat = document.getElementById("titPatio"), botsPat = document.getElementById("botsPatio");

// ---------- Estado ----------
let estado = "inicio";   // inicio | jugando
let dinero = DINERO_INICIAL;
const jugador = { x: 180, y: 440, cara: 1 };
let objetivo = null;     // {x, y}: hacia dónde camina (toque o arrastre)
let tocando = false;
let carga = [];          // ids de productos que llevas
let estantes = [];       // estanterías compradas: { slot, x, y, w, h, producto, items: [] }
let extra = [];          // zanahorias colocadas en los espacios extra de la estantería de jitomates
let empleado = false;    // ¿ya contrataste al de la caja?
let edificio = 0;        // cuántas ampliaciones tiene el edificio (0 a COSTOS_EDIFICIO.length)
let ampliaciones = [];   // cada una: { lado: -1 (izquierda) o 1 (derecha), x0: dónde empieza en el mapa }
let xMin = 0, xMax = MUNDO.w;   // límites del EDIFICIO en x: crecen al ampliar el edificio
let patios = [];         // ampliaciones del PATIO (zona de pasto con los jardines), aparte del edificio: { lado, x0 }
let nivelPatio = 0;      // cuántas ampliaciones tiene el patio (0 a COSTOS_PATIO.length)
let pMin = 0, pMax = MUNDO.w;   // límites del PATIO en x: crecen al ampliar el patio
let wMin = 0, wMax = MUNDO.w;   // el mundo entero: lo más ancho entre edificio y patio (hasta ahí llega la cámara)
let camX = 0;            // cámara: x del mapa que se ve en el borde izquierdo de la pantalla
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
let cola = [];           // clientes esperando en la caja, en orden
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
const jardines = [
  nuevoJardin("tomate", { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN),
  nuevoJardin("zanahoria", { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN_ZANAHORIA),
  nuevoJardin("maiz", { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN_MAIZ),
  nuevoJardin("brocoli", { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN_BROCOLI),
  nuevoJardin("berenjena", { w: 140, h: 80, cols: 3, filas: 2 }, COSTO_JARDIN_BERENJENA),
];
// El patio es la franja de pasto de arriba. Cada tramo (el patio inicial y cada ampliación) tiene 2 sitios para jardines,
// pegados al muro. El jardín número «i» va en el tramo i/2: si ese tramo aún no existe, hay que ampliar el patio.
function colocarJardines() {
  jardines.forEach((g, i) => {
    const tramo = Math.floor(i / 2), col = i % 2;
    const a = tramo > 0 ? patios[tramo - 1] : null;
    g.disponible = tramo === 0 || !!a;
    if (!g.disponible) return;
    g.x = tramo === 0 ? (col ? 204 : 16) : a.x0 + (col ? 156 : 4);
    g.y = TOP - g.h - JARDIN_SEP;
  });
}
colocarJardines();
// Solo se muestra (y se puede comprar) el siguiente jardín: el primero que aún no has comprado
const siguienteJardin = () => jardines.find((g) => !g.comprado) || null;
const jardinDe = (id) => jardines.find((g) => g.producto === id);
const maxClientes = () => (jardinDe("zanahoria").comprado ? MAX_CLIENTES_ZANAHORIA : MAX_CLIENTES);
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
const choca = (x, y) => estantes.some((e) => distRect(x, y, rectFull(e)) < RADIO) || chocaPared(x, y) || fueraEdificio(x, y); // estanterías, pared y muros no se atraviesan

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
  estantes.push({ slot, ...rectEstante(slot), producto, items: [], fija: slot < IDS.length });
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
    return { x: PASILLO_X, y: jugador.y, paso: true };
  }
  return { x: PASILLO_X, y: objetivo.y, paso: true };
}

function mover(dt) {
  let dx = 0, dy = 0;
  if (teclas.arrowleft || teclas.a) dx -= 1;
  if (teclas.arrowright || teclas.d) dx += 1;
  if (teclas.arrowup || teclas.w) dy -= 1;
  if (teclas.arrowdown || teclas.s) dy += 1;
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
  const ny = Math.max(RADIO, Math.min(MUNDO.h - RADIO, jugador.y + dy * paso));
  if (!choca(nx, jugador.y)) jugador.x = nx;
  if (!choca(jugador.x, ny)) jugador.y = ny;
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
  for (const g of jardines) {
    if (g.comprado || g !== siguienteJardin() || !g.disponible || !alcanza(g.costo) || !cerca(g, ALCANCE_JARDIN)) continue;
    if (!puedeJardin(g)) continue;                 // necesita la estantería del producto anterior
    cobrarCompra(g.costo, g.x + g.w / 2, g.y + g.h + 10);
    g.comprado = true;
    g.reloj = creceSeg();
  }
}

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
  e.producto = IDS[(IDS.indexOf(e.producto) + 1) % IDS.length];
  tono(600, 0.08);
}

const hayCajero = () => empleado || cerca(CAJA, ALCANCE_CAJA);

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
  clientes.push({
    x: PUERTA.x, y: PUERTA.y, estado: "comprando", lista, carrito: [], t: TOMAR_SEG, vel: azar(65, 90), off: azar(-30, 30),
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
        if (c.carrito.length) { c.estado = "cola"; c.t = COBRO_SEG; cola.push(c); }
        else c.estado = "saliendo";
        continue;
      }
      const e = estanteDe(falta);
      if (!e) { c.lista[falta] = 0; continue; } // ya no hay estantería de ese producto
      const x = Math.max(xMin + 14, Math.min(xMax - 14, e.x + e.w / 2 + c.off));
      const re = rectFull(e);
      if (irPorPasillo(c, { x, y: re.y + re.h + 26 }, dt)) {
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
      if (irPorPasillo(c, PUERTA, dt)) c.fuera = true;
    }
  }
  // la fila de la caja: solo cobra el primero, y solo si hay quien cobre (tú junto a la caja o el empleado)
  cola = cola.filter((c) => c.estado === "cola");
  cola.forEach((c, i) => {
    const llego = irPorPasillo(c, SLOTS_CAJA[i], dt);
    if (i !== 0 || !llego || !hayCajero()) return;
    c.t -= dt;
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
  cola = cola.filter((c) => c.estado === "cola");
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
  const camisas = { tomate: "#e0463d", zanahoria: "#ff9a2e", maiz: "#e8c93a", brocoli: "#2e9d4a", berenjena: "#8f5bd0" };
  return { x: MEJORAS_ZONA.x + MEJORAS_ZONA.w / 2, y: MEJORAS_ZONA.y - 8, vel: EMP_VEL, carga: [], cd: 0, off: azar(-22, 22), camisa: camisas[g.producto] || "#888" };
}
// Camina hacia d: para salir al pasto o volver a entrar pasa por la abertura del pasillo
function irEmpleado(w, d, dt) {
  const pared = TOP + 7;
  if ((w.y > pared) !== (d.y > pared)) {
    if (Math.abs(w.x - PASILLO_X) > 3) { ir(w, { x: PASILLO_X, y: w.y }, dt); return false; }
    ir(w, { x: PASILLO_X, y: d.y }, dt);
    return false;
  }
  return irPorPasillo(w, d, dt);
}
function actualizarEmpleados(dt) {
  const ex = productosExistentes();
  for (const g of jardines) {
    const em = g.emp;
    if (!em) continue;
    em.cd -= dt;
    const maduros = g.parcelas.filter((p) => p.t >= maduraSeg() && ex.includes(p.id));
    const espacio = espacioLibre(g.producto);
    const puedeColocar = em.carga.length > 0 && espacio > 0;
    const puedeRecoger = maduros.length > 0 && em.carga.length < EMP_CARGA && espacio - em.carga.length > 0;
    if (puedeColocar && (em.carga.length >= EMP_CARGA || !puedeRecoger)) {
      const e = destinosDe(g.producto).find((q) => q.items.length < capDe(q));
      const r = rectFull(e);
      if (distRect(em.x, em.y, r) <= ALCANCE_ESTANTE - 24) {
        if (em.cd <= 0) { e.items.push(em.carga.shift()); em.cd = TRASPASO_SEG * 2; }
      } else irEmpleado(em, { x: Math.max(xMin + 14, Math.min(xMax - 14, e.x + e.w / 2 + em.off)), y: r.y + r.h + 14 }, dt);
    } else if (puedeRecoger) {
      if (distRect(em.x, em.y, g) <= ALCANCE_JARDIN) {
        if (em.cd <= 0) { const p = maduros[0]; em.carga.push(p.id); p.t = -1; p.id = null; em.cd = TRASPASO_SEG * 2; }
      } else irEmpleado(em, puntoJardin(g), dt);
    } else {
      irEmpleado(em, puntoJardin(g), dt);          // sin nada que hacer: espera junto a su jardín
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

// Ensancha el PATIO (la zona de los jardines) hacia un lado, sin tocar el edificio: da sitio para 2 jardines más
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
    if (!estantes.some((e) => e.slot === sl)) nuevoEstante(sl, sl < IDS.length ? IDS[sl] : IDS[0]);
  }
  const zan = estantes.find((e) => e.slot === 1);
  if (zan && extra.length) zan.items.push(...extra.splice(0));
  for (const g of jardines) {
    if (!g.comprado) { g.comprado = true; g.reloj = creceSeg(); }
    if (!g.emp) g.emp = nuevoEmpleadoJardin(g);
  }
  empleado = true;
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
    if (empleado || !alcanza(COSTO_EMPLEADO)) return;
    cobrarCompra(COSTO_EMPLEADO, x, y);
    empleado = true;
  } else if (tipo.startsWith("emp:")) {
    const g = jardinDe(tipo.slice(4));
    if (!g || !g.comprado || g.emp || !alcanza(g.costoEmp) || !destinosDe(g.producto).length) return;
    cobrarCompra(g.costoEmp, x, y);
    g.emp = nuevoEmpleadoJardin(g);
  } else if (tipo === "estante") {
    const slot = siguienteSlot();
    if (!hayPrimerEstante() || slot < 0 || Math.floor(slot / 2) > edificio) return;
    const delProducto = slot < IDS.length;       // la estantería número «slot» es del producto IDS[slot]
    if (delProducto && !jardinDe(IDS[slot]).comprado) return;
    const costo = costoEstanteExtra();
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    if (delProducto) {
      nuevoEstante(slot, IDS[slot]);
      // las zanahorias de los espacios extra pasan a la estantería nueva de zanahorias
      if (IDS[slot] === "zanahoria") estantes[estantes.length - 1].items.push(...extra.splice(0));
    } else {
      // estantería adicional: lleva el producto que quieras (se cambia con ↻)
      nuevoEstante(slot, IDS[0]);
    }
  } else if (tipo === "edificio-izq" || tipo === "edificio-der") {
    if (edificio >= COSTOS_EDIFICIO.length) return;
    const costo = COSTOS_EDIFICIO[edificio];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    const lado = tipo === "edificio-izq" ? -1 : 1;
    ampliar(lado);
    textos.push({ x: jugador.x, y: jugador.y - 34, vida: 1.6, txt: lado < 0 ? "◀ ¡Edificio ampliado!" : "¡Edificio ampliado! ▶", col: "#ffd24d" });
  } else if (tipo === "patio-izq" || tipo === "patio-der") {
    if (nivelPatio >= COSTOS_PATIO.length) return;
    const costo = COSTOS_PATIO[nivelPatio];
    if (!alcanza(costo)) return;
    cobrarCompra(costo, x, y);
    const lado = tipo === "patio-izq" ? -1 : 1;
    ampliarPatio(lado);
    textos.push({ x: jugador.x, y: jugador.y - 34, vida: 1.6, txt: lado < 0 ? "◀ ¡Patio ampliado!" : "¡Patio ampliado! ▶", col: "#9dffb0" });
  }
}
// botones de «empleado de jardín» (uno por jardín; solo se ven los de jardines ya comprados)
const btnsEmp = jardines.map((g) => {
  const b = document.createElement("button");
  b.className = "mej"; b.type = "button"; b.hidden = true;
  b.innerHTML = "<span></span><b></b>";
  panel.appendChild(b);
  b.addEventListener("click", () => comprarMejora("emp:" + g.producto));
  return b;
});
btnCarga.addEventListener("click", () => comprarMejora("carga"));
btnEmpleado.addEventListener("click", () => comprarMejora("empleado"));
btnEstante.addEventListener("click", () => comprarMejora("estante"));
btnEdIzq.addEventListener("click", () => comprarMejora("edificio-izq"));
btnEdDer.addEventListener("click", () => comprarMejora("edificio-der"));
btnPatIzq.addEventListener("click", () => comprarMejora("patio-izq"));
btnPatDer.addEventListener("click", () => comprarMejora("patio-der"));

function pintarBoton(b, texto, precio, activo) {
  b.querySelector("span").textContent = texto;
  b.querySelector("b").textContent = precio;
  b.disabled = !activo;
}

function actualizarPanel() {
  enMejoras = estado === "jugando" && distRect(jugador.x, jugador.y, MEJORAS_ZONA) <= 4;
  panel.classList.toggle("oculto", !enMejoras);
  if (!enMejoras) return;
  if (nivelCarga >= COSTOS_CARGA.length) pintarBoton(btnCarga, "🧤 Carga al máximo (" + cargaMax() + ")", "", false);
  else pintarBoton(btnCarga, "🧤 Llevar más: " + cargaMax() + " → " + (cargaMax() + 1), "$" + COSTOS_CARGA[nivelCarga], alcanza(COSTOS_CARGA[nivelCarga]));
  pintarBoton(btnEmpleado, empleado ? "👷 Empleado de caja" : "👷 Contratar empleado de caja", empleado ? "✓" : "$" + COSTO_EMPLEADO, !empleado && alcanza(COSTO_EMPLEADO));
  const slot = siguienteSlot();
  if (!hayPrimerEstante()) pintarBoton(btnEstante, "🗄️ Primero compra la estantería", "", false);
  else if (slot < 0) pintarBoton(btnEstante, "🗄️ Estanterías al máximo", "", false);
  else if (slot < IDS.length && !jardinDe(IDS[slot]).comprado) pintarBoton(btnEstante, "🗄️ Primero compra el jardín de " + PRODUCTOS[IDS[slot]].icono, "", false);
  else if (Math.floor(slot / 2) > edificio) pintarBoton(btnEstante, "🗄️ Agranda el edificio para más", "", false);
  else pintarBoton(btnEstante, slot < IDS.length ? "🗄️ Estantería de " + PRODUCTOS[IDS[slot]].icono : "🗄️ Estantería nueva", "$" + costoEstanteExtra(), alcanza(costoEstanteExtra()));
  // un empleado por jardín comprado
  jardines.forEach((g, i) => {
    const b = btnsEmp[i], ic = PRODUCTOS[g.producto].icono;
    b.hidden = !g.comprado;
    if (!g.comprado) return;
    if (g.emp) pintarBoton(b, "🧑‍🌾 Empleado del jardín " + ic, "✓", false);
    else if (!destinosDe(g.producto).length) pintarBoton(b, "🧑‍🌾 Primero la estantería de " + ic, "", false);
    else pintarBoton(b, "🧑‍🌾 Empleado del jardín " + ic, "$" + g.costoEmp, alcanza(g.costoEmp));
  });
  // edificio y patio se mejoran por separado: cada uno con su lado a elegir
  const maxEd = edificio >= COSTOS_EDIFICIO.length;
  titEd.textContent = maxEd ? "🏗️ Edificio al máximo" : "🏗️ Ampliar edificio (+2 estanterías)";
  botsEd.hidden = maxEd;
  if (!maxEd) {
    const c = COSTOS_EDIFICIO[edificio];
    pintarBoton(btnEdIzq, "◀ Izquierda", "$" + c, alcanza(c));
    pintarBoton(btnEdDer, "Derecha ▶", "$" + c, alcanza(c));
  }
  const maxPat = nivelPatio >= COSTOS_PATIO.length;
  const sig = siguienteJardin();
  titPat.textContent = maxPat ? "🌱 Patio al máximo"
    : sig && !sig.disponible ? "🌱 Patio lleno: amplíalo para el jardín de " + PRODUCTOS[sig.producto].icono
    : "🌱 Ampliar patio (+2 jardines)";
  botsPat.hidden = maxPat;
  if (!maxPat) {
    const c = COSTOS_PATIO[nivelPatio];
    pintarBoton(btnPatIzq, "◀ Izquierda", "$" + c, alcanza(c));
    pintarBoton(btnPatDer, "Derecha ▶", "$" + c, alcanza(c));
  }
}

function actualizar(dt) {
  if (tocando && ptr) objetivo = posicion(ptr);   // sigue al dedo aunque la cámara se mueva
  mover(dt);
  comprarCosas();
  crecerJardin(dt);
  traspasos(dt);
  actualizarEmpleados(dt);
  actualizarClientes(dt);
  textos.forEach((t) => { t.y -= 28 * dt; t.vida -= dt; });
  textos = textos.filter((t) => t.vida > 0);
}

function actualizarHud() {
  elDinero.textContent = admin.dinero ? "∞" : "$" + dinero;
  elCarga.textContent = carga.length + "/" + cargaMax();
  const xe = extraEstante();
  elEstante.textContent = estantes.length
    ? estantes.reduce((s, e) => s + e.items.length, 0) + (xe ? extra.length : 0) + "/" + (estantes.length * ESTANTE_CAP + (xe ? EXTRA_ZANAHORIA_CAP : 0))
    : "—";
  elClientes.textContent = clientes.length + "/" + maxClientes();
  actualizarPanel();
}

// ---------- Entrada ----------
function posicion(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: camX + ((ev.clientX - r.left) / r.width) * MUNDO.w, y: ((ev.clientY - r.top) / r.height) * MUNDO.h };
}
lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando") return;
  const p = posicion(ev);
  // botón ↻ de una estantería: cambia su producto (no te mueve)
  const e = estantes.find((q) => !q.fija && Math.hypot(p.x - centroSelector(q).x, p.y - centroSelector(q).y) <= 18);
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
  tono(440, 0.12);
});

// ---------- Dibujo ----------
// La pantalla es siempre vertical (proporción de un celular): se ajusta al alto disponible y nunca crece.
// Si el edificio es más ancho, solo se ve un trozo y la cámara lo recorre.
const tablero = lienzo.parentElement;
function ajustar() {
  dpr = window.devicePixelRatio || 1;
  const contenedor = tablero.parentElement;
  contenedor.style.maxWidth = "";                         // vuelve al máximo del CSS para medir
  const maxW = tablero.clientWidth;
  const libre = window.innerHeight - (tablero.getBoundingClientRect().top + window.scrollY) - 12;
  const w = Math.max(240, Math.min(maxW, (libre * MUNDO.w) / MUNDO.h));
  contenedor.style.maxWidth = Math.round(w) + 20 + "px";  // 20 = relleno del contenedor
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

function dibujarSuelo() {
  // afuera: pasto (por todo el ancho del mundo)
  ctx.fillStyle = "#9bd27f";
  ctx.fillRect(wMin - 2, 0, wMax - wMin + 4, MUNDO.h);
  // patio (zona de los jardines): un poco más claro y con su cerca; es una zona aparte del edificio
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(pMin, 0, pMax - pMin, TOP);
  ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4; ctx.setLineDash([10, 5]);
  ctx.beginPath(); ctx.moveTo(pMin + 2, TOP); ctx.lineTo(pMin + 2, 3); ctx.lineTo(pMax - 2, 3); ctx.lineTo(pMax - 2, TOP); ctx.stroke();
  ctx.setLineDash([]);
  for (const cx of [MUNDO.w / 2, ...patios.map((a) => a.x0 + EXT_ANCHO / 2)]) etiqueta("🌱 Patio", cx, 20, "#fff", 12);
  const sig = siguienteJardin();
  if (sig && !sig.disponible) etiqueta("🌱 Amplía el patio para el siguiente jardín", MUNDO.w / 2, TOP - 100, "#ffd24d");
  // adentro: piso del edificio, con sus ampliaciones
  ctx.fillStyle = "#efe3c8";
  ctx.fillRect(xMin, TOP, xMax - xMin, MUNDO.h - TOP);
  ctx.fillStyle = "rgba(150,105,40,.07)";
  for (const a of ampliaciones) ctx.fillRect(a.x0, TOP, EXT_ANCHO, MUNDO.h - TOP);
  ctx.fillStyle = "rgba(0,0,0,.04)";
  const t = 40;
  const c0 = Math.max(Math.floor(xMin / t), Math.floor(camX / t));
  const c1 = Math.min(Math.ceil(xMax / t), Math.ceil((camX + MUNDO.w) / t));
  for (let f = 0; f < MUNDO.h / t; f++)
    for (let c = c0; c < c1; c++) if ((f + c) % 2 && f * t >= TOP - 1) ctx.fillRect(c * t, f * t, t, t);
  // paredes y puerta
  ctx.fillStyle = "#b9885a";
  ctx.fillRect(xMin, TOP, ABERTURA.a - xMin, 14);              // pared de arriba, con hueco al centro
  ctx.fillRect(ABERTURA.b, TOP, xMax - ABERTURA.b, 14);
  ctx.fillRect(xMin, TOP, 4, MUNDO.h - TOP);
  ctx.fillRect(xMax - 4, TOP, 4, MUNDO.h - TOP);
  ctx.fillStyle = "#8f6ad0"; caja(PUERTA.x - 30, MUNDO.h - 14, 60, 14, 4); ctx.fill();
  etiqueta("Entrada", PUERTA.x, MUNDO.h - 26, "#6a4a1a");
}

function dibujarMejoras() {
  const { x, y, w, h } = MEJORAS_ZONA;
  ctx.fillStyle = enMejoras ? "#8fb8ff" : "#b9cdf0";
  caja(x, y, w, h, 10); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = "#4a6fb5"; caja(x, y, w, h, 10); ctx.stroke();
  etiqueta("🛠️ Mejoras", x + w / 2, y + h / 2, "#fff");
}

function dibujarCaja() {
  const { x, y, w, h } = CAJA;
  // ¿hay un cliente ya parado frente al mostrador y alguien que cobre? (el cajón se abre)
  const c0 = cola[0];
  const frente = c0 && Math.hypot(c0.x - SLOTS_CAJA[0].x, c0.y - SLOTS_CAJA[0].y) < 3;
  const abierto = frente && hayCajero();
  // sombra
  ctx.fillStyle = "rgba(0,0,0,.18)"; caja(x + 2, y + 4, w, h, 8); ctx.fill();
  // mueble de madera (frente con tablones)
  ctx.fillStyle = "#8a5a2b"; caja(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + (i * w) / 5, y + h - 10); ctx.lineTo(x + (i * w) / 5, y + h - 1); ctx.stroke(); }
  // cubierta clara del mostrador, con un brillo arriba
  ctx.fillStyle = "#e8c48e"; caja(x + 2, y + 2, w - 4, h - 12, 6); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; caja(x + 5, y + 4, w - 10, 3, 2); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = "#6e4520"; caja(x, y, w, h, 8); ctx.stroke();
  // caja registradora: pantalla verde con $, cuerpo oscuro y teclas
  ctx.fillStyle = "#3b4658"; caja(x + 6, y + 11, 27, 15, 3); ctx.fill();
  ctx.fillStyle = "#2b3140"; caja(x + 9, y + 4, 18, 10, 2); ctx.fill();
  ctx.fillStyle = abierto ? "#b6ffcf" : "#8ff0b4"; caja(x + 10.5, y + 5.5, 15, 7, 1.5); ctx.fill();
  ctx.font = "bold 7px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#1d6a3a"; ctx.fillText("$", x + 18, y + 9.3);
  ctx.fillStyle = "#cfd8e6";
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) ctx.fillRect(x + 9 + i * 5.5, y + 16 + j * 4.5, 3.5, 3);
  // cajón de la registradora (se abre al cobrar, con billetes)
  ctx.fillStyle = "#2b3140"; caja(x + 7, y + h - 9, 24, 6, 2); ctx.fill();
  if (abierto) {
    ctx.fillStyle = "#e9eef6"; caja(x + 7, y + h - 8, 24, 9, 2); ctx.fill();
    ctx.fillStyle = "#6fcf7a"; caja(x + 10, y + h - 6, 18, 3, 1); ctx.fill();
    ctx.fillStyle = "#4fae5a"; caja(x + 12, y + h - 3, 14, 2, 1); ctx.fill();
  }
  // letrero en el frente
  ctx.font = "bold 8px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffe9c4"; ctx.fillText("CAJA", x + 53, y + h - 5);
  // sobre el mostrador: la compra del cliente que está pagando, o un recibo si no hay nadie
  if (frente && c0.carrito.length) {
    c0.carrito.slice(0, 6).forEach((id, i) => emoji(PRODUCTOS[id].icono, x + 41 + (i % 3) * 11, y + 10 + Math.floor(i / 3) * 12, 11));
  } else {
    emoji("🧾", x + 53, y + 14, 14);
  }
  // toldo de rayas rojas y blancas con festón
  const n = Math.round(w / 8);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#e0463d";
    ctx.fillRect(x + (i * w) / n, y - 11, w / n + 0.5, 8);
    ctx.beginPath(); ctx.arc(x + ((i + 0.5) * w) / n, y - 3.5, w / n / 2, 0, Math.PI); ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(x, y - 11, w, 2);
  if (empleado) {
    persona(POS_EMPLEADO.x, POS_EMPLEADO.y, "#d9534f", "#d9a066", true);
  } else if (cola.length) {
    etiqueta("¡Cobra aquí!", x + w / 2, y - 24, "#ffd24d");
  }
}

function dibujarEstantes() {
  // lugar de la primera estantería, mientras no se compra
  if (!hayPrimerEstante()) {
    const { x, y, w, h } = rectEstante(0);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = alcanza(COSTO_PRIMER_ESTANTE) ? "#2e9d4a" : "#999";
    caja(x, y, w, h, 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 8); ctx.fill();
    const col = alcanza(COSTO_PRIMER_ESTANTE) ? "#bfffcf" : "#fff";
    etiqueta("🥬 Estantería", x + w / 2, y + 14, col);
    etiqueta("$" + COSTO_PRIMER_ESTANTE, x + w / 2, y + 31, col);
  }
  for (const e of estantes) {
    const { x, y, w, h } = e;
    const ancho = (w - 28) / ESTANTE_CAP;
    const conExtra = e.slot === 0 && extrasActivas();
    // la estantería de jitomates, con los 2 espacios de zanahoria, se ensancha hacia abajo como un solo mueble
    const tw = 24 + EXTRA_ZANAHORIA_CAP * ancho + 4;
    if (conExtra) { ctx.fillStyle = "#9a6b3c"; caja(x, y + h - 10, tw, EXT_H + 10, 8); ctx.fill(); }
    ctx.fillStyle = "#9a6b3c"; caja(x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = "#c79055"; caja(x + 24, y + 4, w - 28, h - 8, 6); ctx.fill();
    // panel con el producto que lleva; solo las estanterías extra tienen el botón ↻ para cambiarlo
    ctx.fillStyle = "#f3e0c2"; caja(x + 3, y + 4, 20, h - 8, 6); ctx.fill();
    if (e.fija) {
      emoji(PRODUCTOS[e.producto].icono, x + 13, y + h / 2, 15);
    } else {
      emoji(PRODUCTOS[e.producto].icono, x + 13, y + h / 2 - 5, 14);
      etiqueta("↻", x + 13, y + h / 2 + 11, "#6a4a1a", 11);
    }
    for (let i = 0; i < ESTANTE_CAP; i++) {
      const cx = x + 24 + (i + 0.5) * ancho, cy = y + h / 2;
      ctx.fillStyle = "rgba(0,0,0,.12)"; caja(cx - ancho / 2 + 1.5, cy - 14, ancho - 3, 28, 5); ctx.fill();
      if (e.items[i]) emoji(PRODUCTOS[e.items[i]].icono, cx, cy + 1, 16);
      else { ctx.globalAlpha = 0.22; emoji(PRODUCTOS[e.producto].icono, cx, cy + 1, 14); ctx.globalAlpha = 1; }
    }
    if (conExtra) {
      // parte de abajo del mismo mueble: panel de 🥕 y 2 espacios para zanahorias
      const ty = y + h;
      ctx.fillStyle = "#f3e0c2"; caja(x + 3, ty + 1, 20, EXT_H - 4, 6); ctx.fill();
      emoji(PRODUCTOS.zanahoria.icono, x + 13, ty + EXT_H / 2 - 1, 14);
      ctx.fillStyle = "#c79055"; caja(x + 24, ty + 1, tw - 28, EXT_H - 4, 6); ctx.fill();
      for (let i = 0; i < EXTRA_ZANAHORIA_CAP; i++) {
        const cx = x + 24 + (i + 0.5) * ancho, cy = ty + EXT_H / 2 - 1;
        ctx.fillStyle = "rgba(0,0,0,.12)"; caja(cx - ancho / 2 + 1.5, cy - 10, ancho - 3, 20, 5); ctx.fill();
        if (extra[i]) emoji(PRODUCTOS[extra[i]].icono, cx, cy + 1, 16);
        else { ctx.globalAlpha = 0.25; emoji(PRODUCTOS.zanahoria.icono, cx, cy + 1, 14); ctx.globalAlpha = 1; }
      }
    }
  }
}

function dibujarJardines() {
  jardines.forEach(dibujarJardin);
}

function dibujarJardin(g) {
  const { x, y, w, h } = g;
  if (!g.comprado) {
    if (!g.disponible || g !== siguienteJardin()) return;   // solo se muestra el siguiente jardín
    const puede = alcanza(g.costo) && puedeJardin(g);
    ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
    ctx.strokeStyle = puede ? "#2e9d4a" : "#999";
    caja(x, y, w, h, 10); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#ffffff99"; caja(x, y, w, h, 10); ctx.fill();
    etiqueta(PRODUCTOS[g.producto].icono + " Jardín  $" + g.costo, x + w / 2, y + h / 2, puede ? "#bfffcf" : "#fff");
    return;
  }
  ctx.fillStyle = "#6fae52"; caja(x, y, w, h, 10); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#8a5a2b"; caja(x, y, w, h, 10); ctx.stroke();
  g.parcelas.forEach((p, i) => {
    const c = centroParcela(g, i);
    ctx.fillStyle = "#6b4426";
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 21, 18, 0, 0, Math.PI * 2); ctx.fill();
    if (p.t < 0) return;
    const m = maduraSeg();
    const k = m ? Math.min(1, p.t / m) : 1;
    if (k < 1) {
      // brote: crece de a poco
      ctx.fillStyle = "#3f9a3a";
      ctx.beginPath(); ctx.arc(c.x, c.y, 3 + 9 * k, 0, Math.PI * 2); ctx.fill();
    } else {
      emoji(PRODUCTOS[p.id].icono, c.x, c.y + 1, 26);
    }
  });
}

function dibujarPersonajes() {
  const todos = [{ y: jugador.y, f: () => dibujarJugador() }];
  clientes.forEach((c) => todos.push({ y: c.y, f: () => dibujarCliente(c) }));
  jardines.forEach((g) => { if (g.emp) todos.push({ y: g.emp.y, f: () => dibujarEmpleado(g) }); });
  todos.sort((a, b) => a.y - b.y).forEach((o) => o.f());
}

function dibujarJugador() {
  persona(jugador.x, jugador.y, "#2e9d4a", "#f5cfa0", true);
  // lo que cargas, encima de la cabeza
  carga.forEach((id, i) => emoji(PRODUCTOS[id].icono, jugador.x + (i - (carga.length - 1) / 2) * 15, jugador.y - 30, 15));
}

function dibujarEmpleado(g) {
  const em = g.emp;
  persona(em.x, em.y, em.camisa, "#d9a066", true);
  ctx.fillStyle = "#e8c26b";                      // sombrero de paja
  ctx.beginPath(); ctx.ellipse(em.x, em.y - 17, 12, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(em.x, em.y - 18, 6.5, Math.PI, 0); ctx.fill();
  em.carga.forEach((id, i) => emoji(PRODUCTOS[id].icono, em.x + (i - (em.carga.length - 1) / 2) * 14, em.y - 32, 14));
}

function dibujarCliente(c) {
  persona(c.x, c.y, c.camisa, c.piel, false);
  // burbuja: lo que le falta por tomar, lo que va a pagar o ✅ al salir
  let txt;
  if (c.estado === "comprando") {
    txt = Object.keys(c.lista).filter((id) => c.lista[id] > 0).map((id) => PRODUCTOS[id].icono + "×" + c.lista[id]).join(" ");
  } else if (c.estado === "cola") {
    txt = "💲" + c.carrito.reduce((s, id) => s + PRODUCTOS[id].precio, 0);
  } else txt = "✅";
  if (!txt) return;
  ctx.font = "13px system-ui, sans-serif";
  const w = ctx.measureText(txt).width + 14;
  ctx.fillStyle = "#fff"; caja(c.x - w / 2, c.y - 44, w, 20, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(c.x - 4, c.y - 24); ctx.lineTo(c.x + 4, c.y - 24); ctx.lineTo(c.x, c.y - 19); ctx.fill();
  ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(txt, c.x, c.y - 33);
}

function dibujar() {
  // cámara: el mundo se desplaza al lado contrario de donde mira (la pantalla siempre mide lo mismo)
  ctx.setTransform(dpr * escala, 0, 0, dpr * escala, -Math.round(camX * escala * dpr), 0);
  dibujarSuelo();
  dibujarMejoras();
  dibujarJardines();
  dibujarCaja();
  dibujarEstantes();
  dibujarPersonajes();
  // marca del lugar al que caminas
  if (objetivo && estado === "jugando") {
    ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(objetivo.x, objetivo.y, 8, 0, Math.PI * 2); ctx.stroke();
  }
  for (const t of textos) {
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 4; ctx.strokeStyle = "#0009"; ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.col; ctx.fillText(t.txt, t.x, t.y);
  }
  // flechas en los bordes: hay más edificio fuera de la pantalla
  ctx.globalAlpha = 0.55;
  if (camX > wMin + 1) etiqueta("◀", camX + 12, MUNDO.h / 2, "#fff", 18);
  if (camX < wMax - MUNDO.w - 1) etiqueta("▶", camX + MUNDO.w - 12, MUNDO.h / 2, "#fff", 18);
  ctx.globalAlpha = 1;
}

// ---------- Bucle ----------
// La cámara sigue al personaje en horizontal, sin salirse del edificio
function actualizarCamara(dt) {
  const meta = Math.max(wMin, Math.min(wMax - MUNDO.w, jugador.x - MUNDO.w / 2));
  camX += (meta - camX) * Math.min(1, dt * CAMARA_SUAVE);
  if (Math.abs(meta - camX) < 0.05) camX = meta;
}

let ultimo = 0;
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;
  if (estado === "jugando") actualizar(dt);
  actualizarCamara(dt);
  actualizarHud();
  dibujar();
  requestAnimationFrame(bucle);
}

// ---------- Admin (solo para probar) ----------
// El botón ⚙️ Admin aparece al abrir la página con «?admin» al final de la dirección y se queda guardado en ese aparato
// (con «?admin=0» se vuelve a esconder). Para que lo vea todo el mundo, pon MOSTRAR_ADMIN_SIEMPRE = true.
const MOSTRAR_ADMIN_SIEMPRE = false;
const lee = (k) => { try { return localStorage.getItem(k) === "1"; } catch (e) { return false; } };
const guarda = (k, v) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch (e) {} };
let verAdmin = MOSTRAR_ADMIN_SIEMPRE;
const pedidoAdmin = new URLSearchParams(location.search).get("admin");
if (pedidoAdmin !== null) guarda("super_admin", pedidoAdmin !== "0");
if (lee("super_admin")) verAdmin = true;
if (verAdmin) {
  const $ = (id) => document.getElementById(id);
  $("admBtn").hidden = false;
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
  $("admMas").addEventListener("click", () => { dinero += 1000; });
  $("admTodo").addEventListener("click", desbloquearTodo);
  $("admReiniciar").addEventListener("click", () => location.reload());
  if (auto.checked) desbloquearTodo();
}

ajustar();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });
