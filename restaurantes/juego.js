// Ruta: restaurantes/juego.js
// «Restaurantes» (vista isométrica estilo Clash of Clans): los grupos de clientes (1, 2 o 4) llegan SOLOS y al azar durante la jornada.
// Esperan frente a la recepción: TÚ tocas a la familia para darles una mesa. Si no hay mesa libre esperan 8 s (a los 5 s se enojan 😡) y luego se van; si tardas mucho en atenderlos, también se van enojados.
// Ya sentados piden, la cocina prepara y TÚ llevas el platillo a mano (clic en la cocina para tomarlo, clic en la mesa para entregarlo).
// Si tardas, se enojan y se van. Al terminar de comer se levantan TODOS y la mesa queda libre; algunos van al baño (cuesta $1) y
// los demás van directo a la recepción. Cada uno paga $5 al salir (quien usó el baño paga además el $1).
// TIENDA: tocando el mostrador de la recepción (🛒) se abre la zona de compras. Ahí se contrata (y se mejora) a la recepcionista y al mesero.
// AMPLIACIÓN: en la tienda se compra «Ampliar terreno» (una plaza detrás del restaurante, sobre el pasto). Solo entonces se desbloquean el SEGUNDO MESERO y la SEGUNDA PUERTA
// (entrada por atrás, con su propia fila de espera y su mostrador). La SEGUNDA RECEPCIONISTA solo se puede contratar cuando ya existe la segunda puerta.
// Empiezan lentos: cada mejora los hace más rápidos. Lo gastado sale de «dinero»; los puntos y el récord cuentan lo «ganado».
// CIUDAD Y VISTA: el restaurante está en una calle, rodeado de manzanas con edificios, parques y carreteras. La vista se acerca/aleja (➕ ➖, rueda o pellizco) con límites cortos y se mueve arrastrando.
// ESTACIONAMIENTO: alrededor de toda la cuadra hay 24 lugares posibles (adelante, a los lados y atrás), pero al empezar solo se ven y se usan 2.
// Los demás se compran en la tienda (precio creciente: ver ESTAC_PRECIOS). Los autos llegan por la calle de enfrente; cada auto trae SIEMPRE 4 personas.
// Si hay lugar, estaciona y las 4 personas van a la recepción como un grupo más; al terminar regresan al auto y se van. Si no hay lugar, el auto pasa de largo y no vuelve.
// TERRENOS: el restaurante ocupa la esquina inferior derecha de una cuadrícula de 3 × 3 manzanas; las otras 8 son pasto (sin carreteras entre ellas), a la izquierda y detrás.
// Los terrenos se compran en la tienda («Ampliar terreno», $1000). Solo se puede comprar UNO de los dos que tocan el edificio (izquierda o atrás); los demás no quedan pegados
// al restaurante y no se pueden comprar. Los datos de los lotes comprables están en LOTES; las manzanas de pasto, en PASTO.
const ID = "restaurantes";

// ----- Ajustes -----
const DURACION_DIA_MS = 480000;   // duración de la jornada (8 min; antes 120000): pasado este tiempo ya no llegan más clientes
const PRIMERA_LLEGADA_MS = 1500;  // cuándo llega el primer grupo
const LLEGADA_MIN_MS = 4000;      // los grupos llegan al azar: entre un grupo y el siguiente pasan entre estos dos tiempos
const LLEGADA_MAX_MS = 9000;
const OPCIONES = [1, 2, 4];       // clientes que pueden llegar en cada grupo
const ENOJO_RECEP_MS = 7000;      // un grupo esperando en la recepción sin que lo atiendas se ve enojado desde aquí...
const PACIENCIA_RECEP_MS = 12000; // ...y a estos ms se va sin entrar
const ENOJO_SIN_MESA_MS = 5000;      // si llegan y todas las mesas están ocupadas: a estos ms de espera aparece el 😡 sobre sus cabezas...
const PACIENCIA_SIN_MESA_MS = 8000;  // ...y a estos ms (8 s en total) se van sin entrar
const PAGO_POR_CLIENTE = 5;       // pesos que paga cada cliente
const COSTO_BANIO = 1;            // pesos que cuesta usar el baño
const ENOJO_MS = 8000;            // desde estos ms de espera (con el platillo ya listo) los clientes se ven enojados
const PACIENCIA_MS = 15000;       // a estos ms sin recibir el platillo, los clientes se van sin pagar
const PESOS_POR_PUNTO = 1;        // al perfil se envía 1 punto por cada peso ganado
const VEL = 150;                  // velocidad de la gente (px por segundo)
const T_COCINA_BASE = 3000;       // ms de cocina por pedido...
const T_COCINA_POR_CLIENTE = 500; // ...más estos ms por cada cliente de la mesa
const T_COMER = 5000;             // ms que tardan en comer
const PROB_BANIO = 0.5;           // probabilidad de que un cliente vaya al baño al levantarse de la mesa
const KEY_RECORD = "restaurantes_record";

// ----- Personal (se compra en la tienda de la recepción) -----
const PRECIO_RECEP = 20;                                 // contratar a la recepcionista (da mesa sola)
const PRECIO_MESERO = 20;                                // contratar al mesero (lleva solo los platillos)
const RECEP_TIEMPOS_MS = [6500, 5000, 3800, 2800, 2000]; // por nivel: lo que tarda en dar mesa a un grupo (el nivel 1 es lento a propósito)
const MESERO_VEL = [70, 95, 125, 160, 200];              // por nivel: velocidad al caminar (px/s; la gente normal va a VEL = 150)
const RECEP_PRECIOS_MEJORA = [10, 20, 30, 45];           // costo de subir al nivel 2, 3, 4 y 5 de la recepcionista
const MESERO_PRECIOS_MEJORA = [10, 20, 30, 45];          // ídem para el mesero
const PAUSA_MESERO_MS = 400;                             // ms que se detiene a tomar el platillo
// Ampliación (segundo terreno): cada cosa se desbloquea con la anterior
const PRECIO_TERRENO = 1000; // «Ampliar terreno» (a elegir: izquierda, atrás o derecha): desbloquea el segundo mesero y la segunda puerta
const PRECIO_PUERTA2 = 40;   // segunda puerta de entrada (necesita el terreno ampliado)
const PRECIO_MESERO2 = 40;   // segundo mesero (necesita el terreno ampliado)
const PRECIO_RECEP2 = 40;    // segunda recepcionista (necesita la segunda puerta)

// ----- Estacionamiento -----
const ESTAC_INICIALES = 2;       // lugares visibles y disponibles al empezar
// Precio de cada lugar nuevo, en orden (el 1.º cuesta 20, el 2.º 50, ...). Después del último se sigue con ESTAC_FACTOR (ver precioEstac)
const ESTAC_PRECIOS = [20, 50, 80, 100, 130, 180, 250, 320, 400, 500, 620, 750, 900, 1500];
const ESTAC_FACTOR = 1.25;       // pasado el último precio de la lista, cada lugar cuesta 25 % más que el anterior
const PERSONAS_AUTO = 4;         // cada auto trae siempre 4 personas
const AUTO_MIN_MS = 9000;        // los autos llegan al azar: entre uno y el siguiente pasan entre estos dos tiempos
const AUTO_MAX_MS = 16000;
const PRIMER_AUTO_MS = 6000;     // cuándo pasa el primer auto
const AUTO_VEL = 230;            // velocidad de los autos (px por segundo)
const COCHES = [ // colores de carrocería (tapa, cara izquierda, cara derecha)
  { tapa: "#ef9a9a", izq: "#e53935", der: "#b71c1c" },
  { tapa: "#90caf9", izq: "#1e88e5", der: "#0d47a1" },
  { tapa: "#fff59d", izq: "#fdd835", der: "#f9a825" },
  { tapa: "#eceff1", izq: "#b0bec5", der: "#78909c" },
  { tapa: "#a5d6a7", izq: "#43a047", der: "#1b5e20" },
];
const VIDRIO = { tapa: "#cfe8f7", izq: "#90b4cc", der: "#7aa0b8" };

// ----- Vista (zoom y desplazamiento) -----
const ZOOM_INICIAL = 0.85;      // zoom al abrir el juego (1 = como antes de la ciudad)
const ZOOM_MIN = 0.7;           // lo más que se puede alejar (poco, para que la gente se siga viendo)
const ZOOM_MAX = 1.3;           // lo más que se puede acercar (poco, para no tocar cosas sin querer)
const PASO_ZOOM = 0.15;         // lo que cambia cada vez que tocas ➕ o ➖
const UMBRAL_ARRASTRE_PX = 10;  // si el dedo se mueve más que esto (px de pantalla) es arrastre para mover la vista, no un toque

// ----- Mapa plano de la lógica (560 × 680); la vista isométrica se proyecta al dibujar -----
const W = 560, H = 680;
const HALL_X = 280;                         // pasillo central
const ENTRADA = [HALL_X, 570];              // inicio del pasillo, junto a la recepción
// Lugares de espera: 2 por puerta (máximo 2 grupos esperando a la vez en cada una). «p» es la puerta (0 = la de siempre, 1 = la de atrás)
const SLOTS = [{ p: 0, y: 606 }, { p: 0, y: 640 }, { p: 1, y: -84 }, { p: 1, y: -44 }];
const PUERTAS = [
  { entrada: ENTRADA, spawn: [HALL_X, H + 30], pagoY: 585, llenoY: 664, salida: [[HALL_X, 640], [HALL_X, H + 40]], irse: (c) => [[HALL_X, Math.max(c.y, 640)], [HALL_X, H + 40]] },
  { entrada: [HALL_X, 14], spawn: [HALL_X, -190], pagoY: -24, llenoY: -130, salida: [[HALL_X, -90], [HALL_X, -200]], irse: (c) => [[HALL_X, Math.min(c.y, -90)], [HALL_X, -200]] },
];
const PUERTA_COCINA = [225, 185];
const PUERTA_BANIO = [430, 185];
const MESERO_POST = [HALL_X + 45, 210];     // dónde espera el mesero cuando no hay platillos listos
const MESERO_POST2 = [HALL_X - 45, 232];    // ídem para el segundo mesero
const MESAS_BASE = [
  { id: 1, cx: 150, cy: 290 }, { id: 2, cx: 410, cy: 290 },
  { id: 3, cx: 150, cy: 440 }, { id: 4, cx: 410, cy: 440 },
];
const ORDEN_SILLAS = ["cerca", "arriba", "abajo", "lejos"]; // 4 sillas por mesa; se ocupan en este orden
const CARAS = ["🧑", "👩", "👨", "🧓", "👧", "👦", "🧔", "👱"];

// ----- Terrenos que se pueden comprar (en el mapa plano) -----
// rect: zona que se pavimenta como plaza al comprarlo [x0, y0, x1, y1]; centro: donde se pone el cartel «En venta». Flechas = hacia dónde queda en pantalla.
const LOTES = {
  izq:   { etiqueta: "Izquierda", de: "de la izquierda", flecha: "⬉", rect: [-200, 0, 0, H],   centro: [-480, 340] },
  atras: { etiqueta: "Atrás",     de: "de atrás",        flecha: "⬈", rect: [0, -200, W, 0],   centro: [280, -540] },
};

// ----- Lugares de estacionamiento (en el mapa plano; se alinean con la acera que rodea la cuadra) -----
// lado: f = enfrente, d = derecha, i = izquierda, a = atrás. Los autos entran de frente al lugar (eje = hacia dónde apunta el auto).
// «acera» es donde bajan/suben las personas; «carril» es el punto de la calle desde donde el auto entra o sale.
// Orden de compra: primero los 4 de enfrente (los 2 primeros flanquean la puerta), luego la derecha, la izquierda y al final atrás.
const CAJON_ANCHO = 46, CAJON_FONDO = 60;
const ENT_AUTO = [-330, 804], SAL_AUTO = [900, 804];                                         // por dónde entran y salen los autos (calle de enfrente)
const ESQ_AUTO = { C0: [-124, 804], C1: [684, 804], C2: [684, -124], C3: [-124, -124] };     // esquinas del carril que rodea la cuadra
const ACERA_Y = 702;                                                                         // acera de enfrente (donde caminan hacia la puerta)
function crearCajones() {
  const out = [], ys = [640, 568, 496, 424, 352, 280, 208, 136];
  [208, 352, 424, 496].forEach((x) => out.push({ lado: "f", x, y: 750, eje: "y", acera: [x, ACERA_Y], carril: [x, 804] }));
  ys.forEach((y) => out.push({ lado: "d", x: 630, y, eje: "x", acera: [582, y], carril: [684, y] }));
  ys.forEach((y) => out.push({ lado: "i", x: -70, y, eje: "x", acera: [-22, y], carril: [-124, y] }));
  [192, 120, 48, 520].forEach((x) => out.push({ lado: "a", x, y: -70, eje: "y", acera: [x, -22], carril: [x, -124] }));
  return out.map((c) => ({ ...c, usado: false, coche: null, pendientes: 0 }));
}
const CAJONES = crearCajones();
// Precio del siguiente lugar. k = cuántos lugares has comprado ya (0 = el primero). Pasada la lista: el último precio × ESTAC_FACTOR por cada lugar más
function precioEstac(k) {
  if (k < ESTAC_PRECIOS.length) return ESTAC_PRECIOS[k];
  return Math.round((ESTAC_PRECIOS[ESTAC_PRECIOS.length - 1] * Math.pow(ESTAC_FACTOR, k - ESTAC_PRECIOS.length + 1)) / 10) * 10;
}
// Camino del auto desde la entrada de la calle hasta el lugar (o, con saliendo = true, desde el lugar hasta la salida), por el lado más corto
function rutaCoche(k, saliendo) {
  const via = k.lado === "f" ? [] : k.lado === "d" ? [ESQ_AUTO.C1] : k.lado === "i" ? [ESQ_AUTO.C0]
    : k.x < HALL_X ? [ESQ_AUTO.C0, ESQ_AUTO.C3] : [ESQ_AUTO.C1, ESQ_AUTO.C2];
  if (!saliendo) return [ENT_AUTO, ...via, k.carril, [k.x, k.y]];
  return [k.carril, ...via.slice().reverse(), SAL_AUTO];
}
// Camino a pie desde la acera del lugar hasta la puerta (pu = 0: la de enfrente; pu = 1: la de atrás, solo desde los lugares de atrás)
function caminoAcera(k, pu) {
  if (pu === 1) return [k.acera];
  const r = [k.acera];
  if (k.lado === "d") r.push([582, ACERA_Y]);
  if (k.lado === "i") r.push([-22, ACERA_Y]);
  if (k.lado === "a") r.push(k.x < HALL_X ? [-22, -22] : [582, -22], k.x < HALL_X ? [-22, ACERA_Y] : [582, ACERA_Y]);
  r.push([HALL_X, ACERA_Y]);
  return r;
}

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");

// ----- Estado de la partida -----
let gen = 0; // sube al reiniciar: lo que quedó pendiente de la partida anterior se descarta
let ents, globos, monedas, mesas, recepcion;
let dinero, ganado, atendidos, perdidos, fin, cocinando; // «dinero» es lo que tienes para gastar; «ganado» es todo lo cobrado (puntos y récord)
let reloj, proxLlegada, activos, ultimoSeg; // reloj de la jornada (ms), cuándo llega el próximo grupo, grupos en el local
let llevando = null;                    // mesa cuyo platillo traes en la mano
let receps = [null, null], meseros = [null, null]; // personal contratado (null = todavía no): { nivel, ... }; [0] el de siempre, [1] el de la ampliación
let terreno2 = false, puerta2 = false;             // ampliación comprada / segunda puerta comprada
let lote = null; // terreno comprado: null (ninguno), "izq" o "atras"
let nEstac = ESTAC_INICIALES, proxAuto = 0, autosPerdidos = 0; // lugares de estacionamiento disponibles, cuándo pasa el próximo auto, autos que no hallaron lugar
let puntero = { x: -99, y: -99 };       // último punto tocado/señalado en el lienzo (para dibujar el platillo)

// Reloj del juego: se detiene mientras la tienda está abierta (pausa). Todo lo que depende de «ahora()» y de «esp()» se congela con él.
let pausado = false, inicioPausa = 0, tiempoPausado = 0;
const ahora = () => (pausado ? inicioPausa : performance.now()) - tiempoPausado;
function ponerPausa(v) {
  if (v === pausado) return;
  if (v) inicioPausa = performance.now(); else tiempoPausado += performance.now() - inicioPausa;
  pausado = v;
}
let esperas = []; // esperas pendientes: { fin, g, r }
// Espera que no continúa si se reinició la partida mientras tanto
const esp = (ms) => { const g = gen; return new Promise((r) => esperas.push({ fin: ahora() + ms, g, r })); };

function nuevaPartida() {
  gen++; esperas = [];
  ents = []; globos = []; monedas = [];
  mesas = MESAS_BASE.map((m) => ({ ...m, ocupada: false, plato: false, barra: null, esperando: false, tomado: false, enojo: false, listoDesde: 0, res: null, clientes: [] }));
  recepcion = Array(SLOTS.length).fill(null);
  dinero = 0; ganado = 0; atendidos = 0; perdidos = 0; cocinando = 0; llevando = null; activos = 0; receps = [null, null]; meseros = [null, null];
  const habiaCambios = terreno2 || nEstac > ESTAC_INICIALES; terreno2 = false; lote = null; puerta2 = false;
  nEstac = ESTAC_INICIALES; autosPerdidos = 0; proxAuto = PRIMER_AUTO_MS;
  CAJONES.forEach((k) => { k.usado = false; k.coche = null; k.pendientes = 0; });
  if (habiaCambios) armarFondo(); // quita la plaza y los lugares de estacionamiento de la partida anterior
  reloj = 0; proxLlegada = PRIMERA_LLEGADA_MS; ultimoSeg = -1; fin = false;
  $("fin").hidden = true;
  cerrarTienda();
  $("tiempo").textContent = Math.ceil(DURACION_DIA_MS / 1000);
  info("Los clientes llegan solos: toca a la familia en la recepción para darles mesa. Toca el mostrador 🛒 para contratar personal.");
  actualizar();
}

function info(t) { $("estado").textContent = t; }
function leerRecord() { try { return Number(localStorage.getItem(KEY_RECORD)) || 0; } catch (e) { return 0; } }
function actualizar() {
  $("dinero").textContent = dinero;
  $("record").textContent = leerRecord();
  if (!$("tienda").hidden) pintarTienda();
}

// ----- Personas que caminan -----
function nuevaEnt(emoji, x, y) {
  const e = { emoji, x, y, ruta: [], fin: null, lleva: false };
  ents.push(e);
  return e;
}
function quitar(e) { const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }
// Camina por los puntos de «ruta» y se resuelve al llegar al último
function ir(e, ruta) {
  return new Promise((res) => {
    e.ruta = ruta.map((p) => [p[0], p[1]]);
    e.fin = res;
    if (!e.ruta.length) { e.fin = null; res(); }
  });
}
function globo(x, y, texto, ms) { globos.push({ x, y, texto, hasta: ahora() + ms }); }

// ----- Sillas y rutas -----
function silla(m, tipo) {
  const lado = m.cx < HALL_X ? 1 : -1; // 1: la mesa está a la izquierda del pasillo
  if (tipo === "cerca") return { x: m.cx + 48 * lado, y: m.cy };
  if (tipo === "lejos") return { x: m.cx - 48 * lado, y: m.cy };
  if (tipo === "arriba") return { x: m.cx, y: m.cy - 48 };
  return { x: m.cx, y: m.cy + 48 };
}
// Camino desde la recepción hasta la silla i de la mesa m (siempre sale del pasillo, sin cruzar mesas)
function rutaIda(m, i, P = PUERTAS[0]) {
  const tipo = ORDEN_SILLAS[i], s = silla(m, tipo), E = P.entrada;
  if (tipo === "cerca") return [E, [HALL_X, m.cy], [s.x, s.y]];
  if (tipo === "lejos") return [E, [HALL_X, m.cy - 70], [s.x, m.cy - 70], [s.x, s.y]];
  return [E, [HALL_X, s.y], [s.x, s.y]];
}

// ----- Llegada de clientes (al azar) y atención en la recepción -----
const azar = (a, b) => a + Math.random() * (b - a);
const posEspera = (n, i, y) => [HALL_X + (i - (n - 1) / 2) * 34, y];

// Un grupo llega a la recepción. Hay que tocarlo para darle mesa; si no hay mesa o tardas, se va enojado
async function llegar(n, cajon = null) { // cajon: lugar de estacionamiento si vienen en auto (esos ya se contaron en activos al reservar el lugar)
  if (!cajon) activos++;
  // Puerta por la que llegan: al azar entre las abiertas que tengan lugar de espera (la de atrás solo existe si la compraste)
  const abiertas = puerta2 ? [0, 1] : [0];
  const conLugar = abiertas.filter((p) => SLOTS.some((s, k) => s.p === p && !recepcion[k]));
  const opciones = conLugar.length ? conLugar : abiertas;
  const pu = cajon ? (cajon.lado === "a" && puerta2 ? 1 : 0) : opciones[Math.floor(Math.random() * opciones.length)], P = PUERTAS[pu];
  const camino = cajon ? caminoAcera(cajon, pu) : [];      // a pie desde el auto hasta la puerta
  const origen = cajon ? cajon.acera : P.spawn;
  const clientes = Array.from({ length: n }, () => {
    const c = nuevaEnt(CARAS[Math.floor(Math.random() * CARAS.length)], origen[0], origen[1]);
    if (cajon) c.cajon = cajon;
    return c;
  });
  const slot = SLOTS.findIndex((s, k) => s.p === pu && !recepcion[k]);

  if (slot < 0) { // los dos lugares de espera de esa puerta están ocupados: ni siquiera pasan de la puerta
    const g = { clientes, n, y: P.llenoY, pu };
    await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...camino, posEspera(n, i, g.y)]); }));
    await irseEnojados(g, "¡Todo está lleno!");
    return;
  }

  const g = { clientes, n, slot, pu, y: SLOTS[slot].y, esperando: false, enojo: false, desde: 0, res: null, razon: "", sinMesa: false, enojoMs: ENOJO_RECEP_MS, pacienciaMs: PACIENCIA_RECEP_MS };
  recepcion[slot] = g;
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...camino, posEspera(n, i, g.y)]); }));

  // Si todas las mesas están ocupadas NO se van de inmediato: esperan 8 s (a los 5 s se enojan) por si se libera una
  if (!mesas.some((m) => !m.ocupada)) { g.sinMesa = true; g.enojoMs = ENOJO_SIN_MESA_MS; g.pacienciaMs = PACIENCIA_SIN_MESA_MS; }
  const mesa = await esperarAtencion(g);                                                 // espera a que el jugador los toque
  if (!mesa) { await irseEnojados(g, g.sinMesa ? "¡No hay mesa!" : "¡Mucha espera!"); return; }

  recepcion[slot] = null;
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 350); await ir(c, rutaIda(mesa, i, P)); }));
  await atender(n, clientes, mesa, pu);
}

// Se resuelve con la mesa asignada cuando tocas al grupo, o con null si no hay mesa o se acaba su paciencia (se revisa en cuadro())
function esperarAtencion(g) {
  return new Promise((res) => { g.desde = reloj; g.esperando = true; g.res = res; });
}
// El jugador tocó al grupo: se le asigna una mesa libre al azar (si no hay ninguna, el grupo sigue esperando hasta que se acabe su paciencia)
function darMesa(g, empleado) {
  const libres = mesas.filter((m) => !m.ocupada);
  if (!libres.length) { if (!empleado) info("No hay mesa libre todavía: están esperando."); return; }
  g.esperando = false; g.enojo = false;
  g.clientes.forEach((c) => (c.enojado = false));
  const r = g.res; g.res = null;
  const mesa = libres[Math.floor(Math.random() * libres.length)];
  mesa.ocupada = true;
  mesa.clientes = g.clientes;
  globo(HALL_X, g.y, "Mesa " + mesa.id + " 👍", 1500);
  info((empleado ? "La recepcionista les dio la mesa " : "Les diste la mesa ") + mesa.id + ".");
  if (r) r(mesa);
}
// El grupo se va de la recepción sin entrar, enojado, y no paga
async function irseEnojados(g, motivo) {
  perdidos += g.n;
  g.esperando = false;
  g.clientes.forEach((c) => (c.enojado = true));
  globo(HALL_X, g.y, "😡 " + motivo, 1800);
  info("Un grupo de " + g.n + (g.n === 1 ? " cliente" : " clientes") + " se fue enojado.");
  await esp(1200);
  if (g.slot !== undefined) recepcion[g.slot] = null;
  await Promise.all(g.clientes.map(async (c, i) => {
    await esp(i * 200);
    await ir(c, PUERTAS[g.pu].irse(c));
    await despedir(c, g.pu);
  }));
  activos--;
  comprobarFin();
}

// ----- Un grupo ya sentado, de principio a fin -----
async function atender(n, clientes, mesa, pu = 0) {
  const P = PUERTAS[pu];
  const espera = (i) => [HALL_X + (i - (n - 1) / 2) * 34, P.pagoY]; // donde pagan, junto al escritorio de la recepción de su puerta

  // 3) Piden y la cocina prepara
  await esp(700);
  globo(mesa.cx, mesa.cy, "📝 Pidiendo…", 1100);
  await esp(1100);
  const tCocina = T_COCINA_BASE + T_COCINA_POR_CLIENTE * n;
  mesa.barra = { t0: ahora(), dur: tCocina, color: "#f2994a" };
  cocinando++;
  await esp(tCocina);
  cocinando--;
  mesa.barra = null;

  // 4) Platillo listo: hay que llevarlo a mano. Si tardas demasiado, se van
  info("¡Platillo listo para la mesa " + mesa.id + "! Tómalo en la cocina y llévalo.");
  const entregado = await esperarEntrega(mesa);
  if (!entregado) {
    perdidos += n;
    globo(mesa.cx, mesa.cy, "😡 ¡Nos vamos!", 1800);
    info("Los clientes de la mesa " + mesa.id + " se fueron sin su comida.");
    await Promise.all(clientes.map(async (c, i) => {
      await esp(i * 250);
      await ir(c, [...rutaIda(mesa, i, P).slice(0, -1).reverse(), ...P.salida]);
      await despedir(c, pu);
    }));
    cerrarGrupo(mesa);
    return;
  }
  mesa.plato = true;
  globo(mesa.cx, mesa.cy, "😋", 1200);
  mesa.barra = { t0: ahora(), dur: T_COMER, color: "#6fcf97" };
  await esp(T_COMER);
  mesa.barra = null;
  mesa.plato = false;
  globo(mesa.cx, mesa.cy, "🧾 La cuenta", 1200);
  // Terminaron de comer: se levantan todos y la mesa queda libre desde este momento (ya no se toca «mesa» para este grupo)
  mesa.ocupada = false;
  mesa.clientes = [];

  // 5) Cada quien decide si va al baño; luego todos pagan en la recepción (quien usó el baño paga además el baño) y se van
  await Promise.all(clientes.map(async (c, i) => {
    await esp(i * 300);
    const ida = rutaIda(mesa, i, P);
    let monto = PAGO_POR_CLIENTE;
    if (Math.random() < PROB_BANIO) {
      await banio(c, ida, i, P);
      monto += COSTO_BANIO;
      await ir(c, [espera(i)]);
    } else await ir(c, [...ida.slice(0, -1).reverse(), espera(i)]);
    dinero += monto; ganado += monto;
    atendidos++;
    monedas.push({ x: c.x, y: c.y, t0: ahora(), monto });
    actualizar();
    await esp(500);
    await ir(c, P.salida);
    await despedir(c, pu);
  }));
  activos--; // la mesa ya estaba libre: solo se descuenta el grupo cuando el último sale del restaurante
  comprobarFin();
}

function cerrarGrupo(mesa) {
  mesa.ocupada = false;
  mesa.clientes = [];
  activos--;
  comprobarFin();
}
// La jornada termina cuando se acabó el tiempo y ya no queda nadie en el restaurante
function comprobarFin() { if (!fin && reloj >= DURACION_DIA_MS && activos <= 0) finalizar(); }

// ----- Entrega manual (todavía no hay mesero) -----
// Se resuelve con true si entregas el platillo a tiempo, o con false si se acaba la paciencia (se revisa en cuadro())
function esperarEntrega(m) {
  return new Promise((res) => { m.listoDesde = ahora(); m.esperando = true; m.tomado = false; m.res = res; });
}
function entregar(m) {
  m.esperando = false; m.tomado = false; m.enojo = false;
  m.clientes.forEach((c) => (c.enojado = false));
  if (llevando === m) llevando = null;
  info("¡Entregado! La mesa " + m.id + " ya está comiendo.");
  const r = m.res; m.res = null;
  if (r) r(true);
}
// Posición del platillo de cada mesa sobre el mostrador de la cocina
const SLOT_X = [60, 110, 160, 210];
const SLOT_Y = 55;
const dentro = (p, x0, y0, x1, y1) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
// Del punto de pantalla al mapa plano, suponiendo que está a la altura z
function aMundo(sx, sy, z) { const u = (sx - OX) / ISO, v = ((sy + z - OY) * 2) / ISO; return [(u + v) / 2, (v - u) / 2]; }

function tocar(sx, sy) {
  if (fin || pausado) return; // con la tienda abierta el juego está en pausa
  puntero = { x: sx, y: sy };
  const [wx, wy] = aMundo(sx, sy, 20);
  const grupo = recepcion.find((g) => {
    if (!g || !g.esperando) return false;
    const xs = g.clientes.map((c) => c.x);
    return dentro([wx, wy], Math.min(...xs) - 28, g.y - 30, Math.max(...xs) + 28, g.y + 30);
  });
  if (grupo) { darMesa(grupo); return; }
  if (dentro(aMundo(sx, sy, 26), 335, 560, 465, 625) || dentro(aMundo(sx, sy, 0), 335, 560, 465, 650)) { abrirTienda(); return; } // mostrador de la recepción
  if (puerta2 && (dentro(aMundo(sx, sy, 26), 335, -75, 465, -30) || dentro(aMundo(sx, sy, 0), 335, -75, 465, -30))) { abrirTienda(); return; } // mostrador de la recepción 2
  const enCocina = dentro(aMundo(sx, sy, 0), 10, 10, 260, 160) || dentro(aMundo(sx, sy, 30), 10, 10, 260, 160);
  const mesaTocada = mesas.find((m) => dentro(aMundo(sx, sy, 22), m.cx - 58, m.cy - 58, m.cx + 58, m.cy + 58));
  if (llevando) {
    if (mesaTocada === llevando) entregar(llevando);
    else if (mesaTocada) info("Ese platillo es para la mesa " + llevando.id + ", no para la " + mesaTocada.id + ".");
    else if (enCocina) { llevando.tomado = false; info("Dejaste el platillo de la mesa " + llevando.id + " en la cocina."); llevando = null; }
    return;
  }
  const listos = mesas.filter((m) => m.esperando && !m.tomado && m.reservadoPor !== m.listoDesde); // sin los que el mesero ya va a buscar
  // Si tocas un platillo del mostrador, ese; si tocas otra parte de la cocina, el que lleva más tiempo esperando
  let elegido = listos.find((m) => { const [px, py] = iso(SLOT_X[m.id - 1], SLOT_Y, 40); return Math.hypot(sx - px, sy - py) < 28; });
  if (!elegido && enCocina) elegido = listos.sort((a, b) => a.listoDesde - b.listoDesde)[0];
  if (elegido) { elegido.tomado = true; llevando = elegido; info("Llevas el platillo de la mesa " + elegido.id + ": toca esa mesa para entregarlo."); }
  else if (enCocina) info("Todavía no hay platillos listos.");
}
function posEnLienzo(e) { const r = lienzo.getBoundingClientRect(); return [((e.clientX - r.left) * CW) / r.width, ((e.clientY - r.top) * CH) / r.height]; }

// Al levantarse de la mesa, el cliente va al baño y sale hacia la recepción (ahí paga todo, baño incluido). «ida» es el camino de la entrada a su silla
async function banio(c, ida, i, P = PUERTAS[0]) {
  const dentro = [400 + i * 22, 120];
  await ir(c, [...ida.slice(1, -1).reverse(), [HALL_X, 185], PUERTA_BANIO, dentro]);
  await esp(1000);
  await ir(c, [PUERTA_BANIO, [HALL_X, 185], P.entrada]);
}

// ----- Tienda y personal -----
function abrirTienda() {
  pintarTienda();
  $("tienda").hidden = false;
  ponerPausa(true);
  info("⏸️ Juego en pausa mientras estás en la tienda.");
}
function cerrarTienda() {
  const estabaEnPausa = pausado;
  $("tienda").hidden = true;
  ponerPausa(false);
  if (estabaEnPausa && !fin) info("▶️ Juego reanudado.");
}
function filaTienda(ico, nombre, p, precio, mejoras, texto, comprar, mejorar, bloqueo) {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = ico;
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = nombre;
  const d = document.createElement("small");
  const b = document.createElement("button");
  b.className = "btn";
  if (bloqueo) { // todavía no se puede comprar: se explica qué falta
    d.textContent = bloqueo;
    b.textContent = "🔒 Bloqueado";
    b.disabled = true;
  } else if (!p) {
    d.textContent = "Todavía no está contratado.";
    b.textContent = "Contratar $" + precio;
    b.disabled = dinero < precio;
    b.addEventListener("click", comprar);
  } else if (p.nivel > mejoras.length) {
    d.textContent = texto(p.nivel);
    b.textContent = "Máximo";
    b.disabled = true;
  } else {
    const c = mejoras[p.nivel - 1];
    d.textContent = texto(p.nivel);
    b.textContent = "Mejorar $" + c;
    b.disabled = dinero < c;
    b.addEventListener("click", mejorar);
  }
  t.append(n, d);
  fila.append(i, t, b);
  return fila;
}
// Fila de compra única (ampliar terreno, segunda puerta)
function filaSimple(ico, nombre, texto, boton, deshabilitado, accion) {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = ico;
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = nombre;
  const d = document.createElement("small");
  d.textContent = texto;
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = boton;
  b.disabled = deshabilitado;
  b.addEventListener("click", accion);
  t.append(n, d);
  fila.append(i, t, b);
  return fila;
}
function pintarTienda() {
  $("tiendaDinero").textContent = dinero;
  const lista = $("tiendaLista");
  lista.style.cssText = "max-height:52vh;overflow-y:auto"; // con tantas filas, la lista se desplaza
  lista.innerHTML = "";
  const txtRecep = (n) => "Nivel " + n + " de " + (RECEP_PRECIOS_MEJORA.length + 1) + " · da mesa en " + (RECEP_TIEMPOS_MS[n - 1] / 1000).toFixed(1) + " s";
  const txtMesero = (n) => "Nivel " + n + " de " + (MESERO_PRECIOS_MEJORA.length + 1) + " · lleva los platillos a su paso";
  lista.append(
    filaTienda("🧑‍💼", "Recepcionista", receps[0], PRECIO_RECEP, RECEP_PRECIOS_MEJORA, txtRecep, () => contratarRecep(0), () => mejorarRecep(0)),
    filaTienda("🤵", "Mesero", meseros[0], PRECIO_MESERO, MESERO_PRECIOS_MEJORA, txtMesero, () => contratarMesero(0), () => mejorarMesero(0)),
    filaTerreno(),
    filaTienda("🤵‍♀️", "Segundo mesero", meseros[1], PRECIO_MESERO2, MESERO_PRECIOS_MEJORA, txtMesero, () => contratarMesero(1), () => mejorarMesero(1),
      !meseros[0] ? "Primero contrata al mesero." : terreno2 ? "" : "Se desbloquea al ampliar el terreno."),
    filaSimple("🚪", "Segunda puerta",
      puerta2 ? "Los clientes también llegan por la puerta de atrás, con su propia fila y mostrador." : terreno2 ? "Una entrada nueva en el terreno de atrás: doble de lugares de espera." : "Se desbloquea al ampliar el terreno.",
      puerta2 ? "Comprada" : terreno2 ? "Comprar $" + PRECIO_PUERTA2 : "🔒 Bloqueado", puerta2 || !terreno2 || dinero < PRECIO_PUERTA2, comprarPuerta2),
    filaTienda("👩‍💼", "Segunda recepcionista", receps[1], PRECIO_RECEP2, RECEP_PRECIOS_MEJORA, txtRecep, () => contratarRecep(1), () => mejorarRecep(1),
      !receps[0] ? "Primero contrata a la recepcionista." : puerta2 ? "" : "Se desbloquea con la segunda puerta en el nuevo terreno."),
    filaEstac()
  );
}
// Fila de la tienda con tres botones: hay que elegir cuál terreno comprar (solo uno)
function filaTerreno() {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = "🌱";
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = "Ampliar terreno";
  const d = document.createElement("small");
  const col = document.createElement("div");
  col.style.cssText = "display:flex;flex-direction:column;gap:4px";
  if (lote) {
    d.textContent = "Compraste el terreno " + LOTES[lote].de + ". Ya puedes comprar el segundo mesero y la segunda puerta.";
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = "Comprado";
    b.disabled = true;
    col.appendChild(b);
  } else {
    d.textContent = "Elige UNO de los dos terrenos de pasto que tocan el restaurante (izquierda o atrás); los demás no quedan pegados al edificio y no se pueden comprar. Desbloquea el segundo mesero y la segunda puerta.";
    for (const k of Object.keys(LOTES)) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = LOTES[k].flecha + " " + LOTES[k].etiqueta + " $" + PRECIO_TERRENO;
      b.disabled = dinero < PRECIO_TERRENO;
      b.addEventListener("click", () => comprarTerreno(k));
      col.appendChild(b);
    }
  }
  t.append(n, d);
  fila.append(i, t, col);
  return fila;
}
function comprarTerreno(k) {
  if (lote || !LOTES[k] || dinero < PRECIO_TERRENO) return;
  dinero -= PRECIO_TERRENO;
  terreno2 = true;
  lote = k;
  armarFondo(); // dibuja la plaza en el terreno elegido y quita los carteles
  info("¡Compraste el terreno " + LOTES[k].de + "! Ya puedes comprar la segunda puerta y un segundo mesero.");
  actualizar();
}
function comprarPuerta2() {
  if (!terreno2 || puerta2 || dinero < PRECIO_PUERTA2) return;
  dinero -= PRECIO_PUERTA2;
  puerta2 = true;
  armarFondo(); // dibuja la puerta de atrás
  info("¡Segunda puerta! Ahora también llegan clientes por atrás (arriba a la derecha). Ya puedes contratar a la segunda recepcionista.");
  actualizar();
}
function contratarRecep(k) {
  const precio = k ? PRECIO_RECEP2 : PRECIO_RECEP;
  if (receps[k] || dinero < precio || (k && (!puerta2 || !receps[0]))) return;
  dinero -= precio;
  receps[k] = { nivel: 1, g: null, t0: 0, emoji: k ? "👩‍💼" : "🧑‍💼" };
  info(k ? "Contrataste a la segunda recepcionista: atiende la puerta de atrás, pero todavía es lenta. Mejórala en la tienda."
         : "Contrataste a la recepcionista: da mesa sola, pero todavía es lenta. Mejórala en la tienda.");
  actualizar();
}
function mejorarRecep(k) {
  const r = receps[k], c = r && RECEP_PRECIOS_MEJORA[r.nivel - 1];
  if (!r || c === undefined || dinero < c) return;
  dinero -= c;
  r.nivel++;
  info((k ? "La segunda recepcionista" : "La recepcionista") + " subió al nivel " + r.nivel + ".");
  actualizar();
}
function contratarMesero(k) {
  const precio = k ? PRECIO_MESERO2 : PRECIO_MESERO;
  if (meseros[k] || dinero < precio || (k && (!terreno2 || !meseros[0]))) return;
  dinero -= precio;
  const post = k ? MESERO_POST2 : MESERO_POST;
  const ent = nuevaEnt(k ? "🤵‍♀️" : "🤵", post[0], post[1]);
  ent.vel = MESERO_VEL[0];
  meseros[k] = { nivel: 1, ocupado: false, ent, post };
  info((k ? "Contrataste al segundo mesero" : "Contrataste al mesero") + ": lleva solo los platillos, pero camina despacio. Mejóralo en la tienda.");
  actualizar();
}
function mejorarMesero(k) {
  const w = meseros[k], c = w && MESERO_PRECIOS_MEJORA[w.nivel - 1];
  if (!w || c === undefined || dinero < c) return;
  dinero -= c;
  w.nivel++;
  w.ent.vel = MESERO_VEL[w.nivel - 1];
  info((k ? "El segundo mesero" : "El mesero") + " subió al nivel " + w.nivel + ".");
  actualizar();
}
// El mesero w va a la cocina por el platillo de la mesa m, lo lleva y vuelve a su lugar. Si la paciencia de la mesa se acaba en el camino, no entrega.
async function servir(m, w) {
  const t0 = m.listoDesde;
  const vigente = () => m.esperando && m.listoDesde === t0;
  const lado = m.cx < HALL_X ? 1 : -1;
  w.ocupado = true;
  m.reservadoPor = t0;
  await ir(w.ent, [[HALL_X, 185], PUERTA_COCINA, [225, 140], [SLOT_X[m.id - 1], 90]]);
  await esp(PAUSA_MESERO_MS);
  if (vigente() && !m.tomado) {
    m.tomado = true;
    w.ent.lleva = true;
    await ir(w.ent, [[225, 140], PUERTA_COCINA, [HALL_X, 185], [HALL_X, m.cy], [m.cx + 82 * lado, m.cy]]);
    w.ent.lleva = false;
    if (vigente()) entregar(m);
  }
  await ir(w.ent, w.ent.y < 160 ? [[225, 140], PUERTA_COCINA, w.post] : [[HALL_X, w.ent.y], w.post]);
  w.ocupado = false;
}

// ----- Estacionamiento: tienda, llegada y salida de autos -----
function filaEstac() {
  const total = CAJONES.length;
  if (nEstac >= total) return filaSimple("🅿️", "Estacionamiento", "Ya tienes los " + total + " lugares alrededor de la cuadra.", "Completo", true, () => {});
  const precio = precioEstac(nEstac - ESTAC_INICIALES);
  return filaSimple("🅿️", "Lugar de estacionamiento",
    "Tienes " + nEstac + " de " + total + ". Cada auto trae " + PERSONAS_AUTO + " personas; si no hay lugar, pasa de largo y no vuelve.",
    "Comprar $" + precio, dinero < precio, comprarEstac);
}
function comprarEstac() {
  if (nEstac >= CAJONES.length) return;
  const precio = precioEstac(nEstac - ESTAC_INICIALES);
  if (dinero < precio) return;
  dinero -= precio;
  nEstac++;
  armarFondo(); // dibuja el lugar nuevo
  info("¡Nuevo lugar de estacionamiento! Ahora tienes " + nEstac + ".");
  actualizar();
}
// Pasa un auto por la calle de enfrente: si hay lugar libre estaciona (y sus 4 personas van a la recepción); si no, pasa de largo y se va para siempre
async function llegarAuto() {
  const k = CAJONES.slice(0, nEstac).find((x) => !x.usado);
  const a = nuevaEnt("", ENT_AUTO[0], ENT_AUTO[1]);
  a.coche = true; a.vel = AUTO_VEL; a.eje = "x";
  a.col = COCHES[Math.floor(Math.random() * COCHES.length)];
  if (!k) {
    autosPerdidos++;
    info("🚗 Un auto con " + PERSONAS_AUTO + " personas no encontró lugar y se fue para siempre.");
    await ir(a, [SAL_AUTO]);
    quitar(a);
    return;
  }
  k.usado = true; k.coche = a; k.pendientes = PERSONAS_AUTO;
  activos++; // el grupo cuenta como «en el local» desde que se reserva el lugar
  await ir(a, rutaCoche(k, false));
  await esp(500);
  llegar(PERSONAS_AUTO, k);
}
// El auto se va cuando suben sus 4 personas; el lugar queda libre en cuanto sale a la calle
async function irseAuto(k) {
  const a = k.coche;
  if (!a) return;
  const ruta = rutaCoche(k, true);
  await ir(a, [ruta[0]]);
  k.usado = false; k.coche = null;
  await ir(a, ruta.slice(1));
  quitar(a);
}
// Al terminar su camino de salida: quien vino a pie desaparece; quien vino en auto regresa a él y, cuando suben todos, el auto se va
async function despedir(c, pu = 0) {
  const k = c.cajon;
  if (!k || !k.coche) { quitar(c); return; }
  await ir(c, [...caminoAcera(k, pu)].reverse());
  quitar(c);
  k.pendientes--;
  if (k.pendientes <= 0) irseAuto(k);
}

// ----- Final -----
async function finalizar() {
  fin = true;
  cerrarTienda();
  const record = Math.max(leerRecord(), ganado);
  try { localStorage.setItem(KEY_RECORD, String(record)); } catch (e) {}
  const puntos = Math.floor(ganado / PESOS_POR_PUNTO);
  let extra = "";
  if (J && puntos > 0) {
    try { extra = (await J.sumarPuntos(ID, puntos)) ? " Se sumaron " + puntos + " puntos a tu perfil." : " Entra con Google para guardar tus puntos."; }
    catch (e) { extra = " No se pudieron guardar los puntos."; }
  }
  $("finTitulo").textContent = "Día terminado";
  $("finTexto").textContent = "Atendiste " + atendidos + " clientes y ganaste $" + ganado + " pesos." + (perdidos ? " Se fueron " + perdidos + " enojados sin pagar." : "") + (autosPerdidos ? " Pasaron " + autosPerdidos + " autos sin encontrar lugar." : "") + extra;
  $("fin").hidden = false;
  info("Terminó la jornada.");
  actualizar();
}

// ----- Dibujo (vista isométrica 2:1, estilo Clash of Clans) -----
// La lógica sigue usando el mapa plano (W × H) de arriba; aquí solo se proyecta cada punto a la pantalla.
const CW = 720, CH = 480;               // tamaño del lienzo (debe coincidir con el <canvas> de index.html)
const ISO = 0.55, OX = 400, OY = 100;   // escala y origen de la proyección (súbele ISO para acercar la vista)
const iso = (x, y, z = 0) => [OX + (x - y) * ISO, OY + ((x + y) * ISO) / 2 - z];

function emoji(t, x, y, tam) { ctx.fillStyle = "#000"; ctx.font = tam + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); } // fillStyle opaco: si no, el emoji hereda la transparencia de la sombra
function caja(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function texto(t, x, y, tam, color, alinear, c = ctx) { c.font = "700 " + tam + "px system-ui, sans-serif"; c.fillStyle = color; c.textAlign = alinear || "left"; c.textBaseline = "middle"; c.fillText(t, x, y); }

function poly(c, pts, relleno, borde) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  if (relleno) { c.fillStyle = relleno; c.fill(); }
  if (borde) { c.strokeStyle = borde; c.lineWidth = 1.5; c.stroke(); }
}
function suelo(c, x0, y0, x1, y1, relleno, z = 0, borde) { poly(c, [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)], relleno, borde); }
// Caja con tapa y las dos caras que se ven desde la cámara (la de x1 y la de y1)
function caja3d(c, x0, y0, x1, y1, h, col, borde) {
  poly(c, [iso(x1, y0, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x1, y0, h)], col.der, borde);
  poly(c, [iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x0, y1, h)], col.izq, borde);
  poly(c, [iso(x0, y0, h), iso(x1, y0, h), iso(x1, y1, h), iso(x0, y1, h)], col.tapa, borde);
}
const MADERA = { tapa: "#c58b4e", izq: "#a06a35", der: "#85542a" };
const MADERA_OSCURA = { tapa: "#8d6e63", izq: "#6d4c41", der: "#5a3d33" };
const ACERO = { tapa: "#cfd8dc", izq: "#90a4ae", der: "#78909c" };
const SILLA = { tapa: "#bc9a8c", izq: "#8d6e63", der: "#6d4c41" };

// Cuarto con piso de azulejos, paredes altas al fondo y paredes bajas al frente (con hueco para la puerta)
function cuarto(c, x0, y0, x1, y1, claro, oscuro, pared, puertaX, puertaW) {
  const nx = 10, ny = 6, dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) suelo(c, x0 + i * dx, y0 + j * dy, x0 + (i + 1) * dx, y0 + (j + 1) * dy, (i + j) % 2 ? oscuro : claro);
  const h = 56;
  poly(c, [iso(x0, y0, 0), iso(x1, y0, 0), iso(x1, y0, h), iso(x0, y0, h)], pared, "#5b4636");   // pared del fondo
  poly(c, [iso(x0, y0, 0), iso(x0, y1, 0), iso(x0, y1, h), iso(x0, y0, h)], pared, "#5b4636");   // pared izquierda
  poly(c, [iso(x0, y0, 0), iso(x0, y1, 0), iso(x0, y1, h), iso(x0, y0, h)], "rgba(0,0,0,.14)");  // sombra para dar volumen
  const baja = { tapa: "#a1887f", izq: "#8d6e63", der: "#6d4c41" };
  caja3d(c, x0, y1 - 5, puertaX, y1, 14, baja);
  caja3d(c, puertaX + puertaW, y1 - 5, x1, y1, 14, baja);
  caja3d(c, x1 - 5, y0, x1, y1 - 5, 14, baja);
}

// Todo lo que no se mueve se dibuja una sola vez en este lienzo oculto
const FOX = 900, FOY = 850, FW = 2650, FH = 1550; // el fondo es más grande que el lienzo: cubre x de -900 a 1750 y y de -850 a 700 (coordenadas base; ampliado para la zona de pasto)
const VISTA = { x0: -860, y0: -830, x1: 1700, y1: 650 }; // hasta dónde se puede mover la vista (coordenadas base)
const CENTRO_VISTA = [367, 290];                  // centro del restaurante en coordenadas base
const fondo = document.createElement("canvas");
fondo.width = FW; fondo.height = FH;

// ----- Ciudad alrededor del restaurante -----
// El restaurante es la manzana (0, 0): su acera mide ACERA y las calles CALLE. Las demás manzanas se llenan de edificios y parques.
// Los edificios de las manzanas de enfrente tienen tope de altura según su distancia, para que nunca tapen el restaurante.
const ACERA = 40, CALLE = 120;
const PX = W + 2 * ACERA + CALLE, PY = H + 2 * ACERA + CALLE; // separación entre manzanas
const COL_ASFALTO = "#555b64", COL_ACERA = "#d0d3d6", COL_PASTO = "#9ccc65";
// ZONA DE PASTO (terreno para ampliar el restaurante): manzanas que se ven como un solo pasto junto con la del restaurante, sin calles entre ellas.
// Cada una es [i, j] respecto a la del restaurante [0, 0]. En pantalla: [-1,-1] = arriba, [0,-1] = arriba a la derecha, [1,-1] = a la derecha.
// (más: [-1,0] = arriba a la izquierda, [1,0] = abajo a la derecha, [0,1] = abajo a la izquierda, [1,1] = abajo, [-1,1] = a la izquierda)
const PASTO = [[-2, -2], [-1, -2], [0, -2], [-2, -1], [-1, -1], [0, -1], [-2, 0], [-1, 0]]; // cuadrícula 3 × 3 con el restaurante [0,0] en la esquina inferior derecha: las otras 8 manzanas son pasto, sin carreteras entre ellas
const EDIFICIOS = [
  { tapa: "#d7ccc8", izq: "#bcaaa4", der: "#a1887f" },
  { tapa: "#ffe0b2", izq: "#ffcc80", der: "#ffb74d" },
  { tapa: "#bbdefb", izq: "#90caf9", der: "#64b5f6" },
  { tapa: "#c8e6c9", izq: "#a5d6a7", der: "#81c784" },
  { tapa: "#f8bbd0", izq: "#f48fb1", der: "#f06292" },
  { tapa: "#cfd8dc", izq: "#b0bec5", der: "#90a4ae" },
];
const CENTROS_X = [-3, -2, -1, 0, 1, 2, 3].map((i) => i * PX + W + ACERA + CALLE / 2); // calles de x constante
const CENTROS_Y = [-3, -2, -1, 0, 1, 2, 3].map((j) => j * PY + H + ACERA + CALLE / 2); // calles de y constante
const ruido = (a, b, k) => { const s = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }; // «azar» fijo: la ciudad sale igual siempre
// ¿Se vería algo de este rectángulo (con altura h) dentro del fondo?
function visible(x0, y0, x1, y1, h) {
  const p = [iso(x0, y0), iso(x1, y0), iso(x0, y1), iso(x1, y1)];
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return Math.max(...xs) > -FOX && Math.min(...xs) < FW - FOX && Math.max(...ys) > -FOY && Math.min(...ys) - h < FH - FOY;
}
function arbol(c, x, y, tam) {
  const [px, py] = iso(x, y);
  c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(px, py, tam * 0.45, tam * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.font = tam + "px serif"; c.fillStyle = "#000"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("🌳", px, py - tam * 0.4);
}
function ventanas(c, x0, y0, x1, y1, h) {
  const col = "rgba(227,242,253,.75)";
  for (let z = 16; z + 14 <= h - 6; z += 26) {
    for (let x = x0 + 14; x + 12 <= x1 - 10; x += 26) poly(c, [iso(x, y1, z), iso(x + 12, y1, z), iso(x + 12, y1, z + 14), iso(x, y1, z + 14)], col);
    for (let y = y0 + 14; y + 12 <= y1 - 10; y += 26) poly(c, [iso(x1, y, z), iso(x1, y + 12, z), iso(x1, y + 12, z + 14), iso(x1, y, z + 14)], col);
  }
}
function edificio(c, x0, y0, x1, y1, h, col) {
  caja3d(c, x0, y0, x1, y1, h, col, "rgba(0,0,0,.25)");
  ventanas(c, x0, y0, x1, y1, h);
}
function armarCiudad(c) {
  c.fillStyle = COL_ASFALTO; c.fillRect(-FOX, -FOY, FW, FH); // todo es calle; encima van las aceras
  // línea central amarilla de cada calle (se interrumpe en los cruces)
  const enCruce = (v, centros) => centros.some((m) => Math.abs(v - m) < CALLE / 2 + 6);
  for (let p = -2400; p < 2600; p += 60) for (const xc of CENTROS_X) if (!enCruce(p + 15, CENTROS_Y)) suelo(c, xc - 2, p, xc + 2, p + 30, "#e8c547");
  for (let p = -2400; p < 2600; p += 60) for (const yc of CENTROS_Y) if (!enCruce(p + 15, CENTROS_X)) suelo(c, p, yc - 2, p + 30, yc + 2, "#e8c547");
  for (let k = 0; k < 6; k++) suelo(c, 70 + k * 20, CENTROS_Y[3] - 52, 80 + k * 20, CENTROS_Y[3] + 52, "#f5f5f5"); // paso de cebra frente al restaurante
  const cola = [];
  const hayPasto = (i, j) => PASTO.some((q) => q[0] === i && q[1] === j);
  const esZona = (i, j) => (i === 0 && j === 0) || hayPasto(i, j);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x0 = i * PX, y0 = j * PY, x1 = x0 + W, y1 = y0 + H;
    if (!visible(x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, 240)) continue;
    suelo(c, x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, COL_ACERA); // acera de la manzana
    if (i === 0 && j === 0) continue;                                      // el restaurante se dibuja aparte
    if (hayPasto(i, j)) { suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, COL_PASTO); continue; } // zona de pasto: sin edificios
    if (ruido(i, j, 99) < 0.15) {                                          // parque
      suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, "#9ccc65");
      for (let k = 0; k < 6; k++) {
        const ax = x0 + 80 + ruido(i, j, k) * (W - 160), ay = y0 + 80 + ruido(j, i, k + 9) * (H - 160);
        cola.push({ d: ax + ay, f: () => arbol(c, ax, ay, 34) });
      }
      continue;
    }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const ex0 = x0 + a * (W / 2) + 14, ex1 = x0 + (a + 1) * (W / 2) - 14;
      const ey0 = y0 + b * (H / 2) + 14, ey1 = y0 + (b + 1) * (H / 2) - 14;
      const tope = ex1 > 0 && ey1 > 0 ? 0.5 * Math.max(ex0 - W, ey0 - H) : 220; // los de enfrente: más bajos cuanto más cerca del restaurante
      const h = Math.max(24, Math.min(40 + ruido(i * 3 + a, j * 5 + b, 1) * 160, tope, 220));
      const col = EDIFICIOS[Math.floor(ruido(i * 3 + a, j * 5 + b, 2) * EDIFICIOS.length)];
      cola.push({ d: (ex0 + ex1 + ey0 + ey1) / 2, f: () => edificio(c, ex0, ey0, ex1, ey1, h, col) });
    }
  }
  // Une cada manzana de pasto con sus vecinas de la zona (y con el restaurante): quita la calle de en medio y deja el pasto continuo
  const unir = (i, j, ejeX) => {
    const ni = ejeX ? i + 1 : i, nj = ejeX ? j : j + 1;
    if (!esZona(ni, nj) || !(hayPasto(i, j) || hayPasto(ni, nj))) return;
    const x0 = i * PX, y0 = j * PY, x1 = x0 + W, y1 = y0 + H, nx0 = ni * PX, ny0 = nj * PY;
    if (ejeX) {
      suelo(c, x1 + ACERA, y0 - ACERA, nx0 - ACERA, y1 + ACERA, COL_ACERA);
      suelo(c, hayPasto(i, j) ? x1 - 10 : x1 + ACERA, y0 + 10, hayPasto(ni, nj) ? nx0 + 10 : nx0 - ACERA, y1 - 10, COL_PASTO);
    } else {
      suelo(c, x0 - ACERA, y1 + ACERA, x1 + ACERA, ny0 - ACERA, COL_ACERA);
      suelo(c, x0 + 10, hayPasto(i, j) ? y1 - 10 : y1 + ACERA, x1 - 10, hayPasto(ni, nj) ? ny0 + 10 : ny0 - ACERA, COL_PASTO);
    }
  };
  for (const [i, j] of [[0, 0], ...PASTO]) { unir(i, j, true); unir(i, j, false); }
  // Donde se juntan 4 manzanas de la zona queda un cuadro de calle: se rellena de pasto (sin pisar la acera del restaurante)
  const cruce = (i, j) => {
    const cuatro = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
    if (!cuatro.every(([a, b]) => esZona(a, b))) return;
    const gx0 = i * PX + W - 10, gy0 = j * PY + H - 10, gx1 = (i + 1) * PX + 10, gy1 = (j + 1) * PY + 10;
    suelo(c, gx0, gy0, gx1, gy1, COL_PASTO);
    for (const [a, b] of cuatro) {
      if (hayPasto(a, b)) continue;
      const rx0 = Math.max(gx0, a * PX - ACERA), ry0 = Math.max(gy0, b * PY - ACERA), rx1 = Math.min(gx1, a * PX + W + ACERA), ry1 = Math.min(gy1, b * PY + H + ACERA);
      if (rx1 > rx0 && ry1 > ry0) suelo(c, rx0, ry0, rx1, ry1, COL_ACERA);
    }
  };
  for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) cruce(i, j);
  cola.sort((p, q) => p.d - q.d).forEach((o) => o.f()); // de lo más lejano a lo más cercano
}
// Árboles en la acera del restaurante: los de atrás se dibujan antes del piso y los de enfrente después (así tapan lo correcto)
function arbolesAcera(c, lado) {
  const pts = lado === "atras"
    ? [[-20, 90], [-20, 230], [-20, 370], [-20, 510], [-20, 640], [90, -20], [230, -20], [370, -20], [510, -20]]
    : [[W + 20, 230], [W + 20, 370], [W + 20, 510], [W + 20, 640], [40, H + 20], [120, H + 20], [520, H + 20]];
  pts.filter(([x, y]) => !enPlaza(x, y)).sort((p, q) => p[0] + p[1] - (q[0] + q[1])).forEach(([x, y]) => arbol(c, x, y, 32)); // donde se pavimentó la plaza no hay árboles
}
// Plaza del terreno ampliado (detrás del restaurante: x de 0 a W, y de -200 a 0) y puerta de atrás
// ¿Cae este punto dentro de la plaza del terreno comprado?
function enPlaza(x, y) {
  if (!lote) return false;
  const r = LOTES[lote].rect;
  return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
}
// Plaza del terreno comprado (izquierda o atrás del restaurante)
function plazaLote(c) {
  const [x0, y0, x1, y1] = LOTES[lote].rect;
  for (let x = x0; x < x1; x += 40) for (let y = y0; y < y1; y += 40) suelo(c, x, y, x + 40, y + 40, ((x - x0) / 40 + (y - y0) / 40) % 2 ? "#d8cfbd" : "#e4dccb");
  suelo(c, x0, y0, x1, y1, null, 0, "#a1887f");
}
// Carteles «En venta» sobre los tres terrenos que se pueden comprar (desaparecen al comprar uno)
function carteles(c) {
  for (const k of Object.keys(LOTES)) {
    const [sx, sy] = iso(LOTES[k].centro[0], LOTES[k].centro[1]);
    const t = "🏷️ Terreno " + LOTES[k].etiqueta.toLowerCase() + " · $" + PRECIO_TERRENO;
    c.font = "700 15px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.55)"; c.strokeText(t, sx, sy);
    texto(t, sx, sy, 15, "#fff", "center", c);
  }
}
function puertaAtras(c) {
  caja3d(c, 250, -4, 310, 0, 5, MADERA_OSCURA);
  const [ex, ey] = iso(HALL_X, -130, 0);
  c.font = "700 13px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText("Entrada 2", ex, ey);
  texto("Entrada 2", ex, ey, 13, "#fff", "center", c);
}
// Lugares de estacionamiento comprados: casilla oscura con borde blanco y una «P». Si hay alguno atrás, se pinta también la calle de atrás
function estacionamiento(c) {
  const visibles = CAJONES.slice(0, nEstac);
  if (visibles.some((k) => k.lado === "a")) suelo(c, -150, -148, 700, -100, COL_ASFALTO);
  if (visibles.some((k) => k.lado === "i")) suelo(c, -148, -148, -100, 830, COL_ASFALTO); // a los lados ya no hay carretera: el carril se pinta al comprar lugares
  if (visibles.some((k) => k.lado === "d")) suelo(c, 660, -148, 708, 830, COL_ASFALTO);
  for (const k of visibles) {
    const ax = k.eje === "x" ? CAJON_FONDO : CAJON_ANCHO, ay = k.eje === "x" ? CAJON_ANCHO : CAJON_FONDO;
    suelo(c, k.x - ax / 2, k.y - ay / 2, k.x + ax / 2, k.y + ay / 2, "#454b53", 0, "#f5f5f5");
    const [px, py] = iso(k.x, k.y);
    texto("P", px, py, 13, "rgba(255,255,255,.55)", "center", c);
  }
}
function armarFondo() {
  fondo.width = FW; fondo.height = FH; // limpia el fondo (se vuelve a armar al ampliar el terreno)
  const c = fondo.getContext("2d");
  c.translate(FOX, FOY); // el fondo es más grande que el lienzo: caben la ciudad y las calles alrededor
  armarCiudad(c);        // calles, aceras, edificios y parques
  arbolesAcera(c, "atras");
  if (lote) plazaLote(c); else carteles(c);
  estacionamiento(c);
  // piso del comedor
  for (let i = 0; i < W / 40; i++) for (let j = 0; j < H / 40; j++) suelo(c, i * 40, j * 40, i * 40 + 40, j * 40 + 40, (i + j) % 2 ? "#e4cfa9" : "#ecd9b8");
  cuarto(c, 10, 10, 260, 160, "#eceff1", "#cfd8dc", "#b0bec5", 200, 50);   // cocina
  cuarto(c, 330, 10, 550, 160, "#e1f5fa", "#b6e0ea", "#80c4d3", 400, 60);   // baño
  const [kx, ky] = iso(135, 10, 70); texto("Cocina", kx, ky, 14, "#37474f", "center", c);
  const [bx, by] = iso(440, 10, 70); texto("Baño", bx, by, 14, "#1f5d70", "center", c);
  const [cx, cy] = iso(40, 520, 0); texto("Comedor", cx, cy, 13, "rgba(91,70,54,.75)", "center", c);
  // puerta de entrada
  caja3d(c, 250, H - 4, 310, H, 5, MADERA_OSCURA);
  if (puerta2) puertaAtras(c);
  arbolesAcera(c, "enfrente");
  const [ex, ey] = iso(280, H, 0); // el letrero queda sobre la calle: letras blancas con contorno oscuro
  c.font = "700 13px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText("Entrada", ex + 4, ey + 30);
  texto("Entrada", ex + 4, ey + 30, 13, "#fff", "center", c);
}

function sombra(x, y, r) {
  const [sx, sy] = iso(x, y);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}
function persona(e, x, y, z, tam) { sombra(x, y, 13); const [sx, sy] = iso(x, y, z); emoji(e, sx, sy, tam); }

function dibujarMesa(m) {
  caja3d(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, 22, MADERA, "#5b4636");
  if (m.ocupada) suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#7c5cff");
  if (llevando === m) { suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#ffd54a"); suelo(ctx, m.cx - 34, m.cy - 34, m.cx + 34, m.cy + 34, null, 22, "#ffd54a"); }
  const [sx, sy] = iso(m.cx, m.cy, 22);
  texto("Mesa " + m.id, sx, sy + 9, 10, "#fff", "center");
  if (m.plato) emoji("🍽️", sx, sy - 4, 22);
  if (m.esperando) { // paciencia: verde, y roja desde que se enojan
    const resta = Math.max(0, 1 - (ahora() - m.listoDesde) / PACIENCIA_MS);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 24, sy - 38, 48, 7);
    ctx.fillStyle = m.enojo ? "#e74c3c" : "#6fcf97"; ctx.fillRect(sx - 24, sy - 38, 48 * resta, 7);
    emoji(m.enojo ? "😡" : "⏳", sx, sy - 52, 20);
  }
  if (m.barra) {
    const f = Math.min(1, (ahora() - m.barra.t0) / m.barra.dur);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 24, sy - 38, 48, 7);
    ctx.fillStyle = m.barra.color; ctx.fillRect(sx - 24, sy - 38, 48 * f, 7);
  }
}
function dibujarSilla(s) { caja3d(ctx, s.x - 10, s.y - 10, s.x + 10, s.y + 10, 10, SILLA, "#5b4636"); }
function dibujarMostrador() {
  caja3d(ctx, 20, 40, 250, 70, 26, ACERO, "#546e7a");
  const [dx, dy] = iso(32, 55, 40); emoji("🍳", dx, dy, 26);
  for (const m of mesas) { // platillos listos esperando que los tomes
    if (!m.esperando || m.tomado) continue;
    const [sx, sy] = iso(SLOT_X[m.id - 1], SLOT_Y, 26);
    const resta = Math.max(0, 1 - (ahora() - m.listoDesde) / PACIENCIA_MS);
    emoji("🍽️", sx, sy - 14, 30 * (1 + Math.sin(ahora() / 180) * 0.08));
    texto("Mesa " + m.id, sx, sy + 4, 10, "#263238", "center");
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx - 16, sy + 11, 32, 5);
    ctx.fillStyle = m.enojo ? "#e74c3c" : "#2e9e5b"; ctx.fillRect(sx - 16, sy + 11, 32 * resta, 5);
  }
}
function dibujarChef() {
  persona("🧑‍🍳", 110, 112, 20 + (cocinando > 0 ? Math.abs(Math.sin(ahora() / 120)) * 5 : 0), 34);
  if (cocinando > 0) { const [sx, sy] = iso(150, 100, 44); emoji("♨️", sx, sy, 20); }
}
// Aviso sobre el grupo que espera en la recepción: «toca para dar mesa» y su barra de paciencia (roja cuando ya están enojados)
function dibujarEspera(g) {
  const [sx, sy0] = iso(HALL_X, g.y, g.slot % 2 === 0 ? 112 : 78);
  const sy = sy0 + Math.sin(ahora() / 200) * 3;
  const t = mesas.some((m) => !m.ocupada) ? "👆 Toca para dar mesa" : "⏳ Esperando mesa";
  ctx.font = "700 13px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 16;
  ctx.fillStyle = "#fff"; caja(sx - w / 2, sy - 12, w, 24, 8); ctx.fill();
  ctx.strokeStyle = g.enojo ? "#e74c3c" : "#7c5cff"; ctx.lineWidth = 2; ctx.stroke();
  texto(t, sx, sy, 13, "#3b2a1a", "center");
  const resta = Math.max(0, 1 - (reloj - g.desde) / g.pacienciaMs);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 30, sy + 16, 60, 6);
  ctx.fillStyle = g.enojo ? "#e74c3c" : "#6fcf97"; ctx.fillRect(sx - 30, sy + 16, 60 * resta, 6);
}
function dibujarEscritorio() {
  caja3d(ctx, 340, 585, 460, 619, 26, MADERA_OSCURA, "#3e2c23");
  const [sx, sy] = iso(400, 602, 26); texto("Recepción", sx, sy, 11, "#fff", "center");
  const [bx, by] = iso(400, 636, 0); // etiqueta que invita a abrir la tienda
  const t = "🛒 Tienda";
  ctx.font = "700 13px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 16;
  ctx.fillStyle = "#fff"; caja(bx - w / 2, by - 12, w, 24, 8); ctx.fill();
  ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 2; ctx.stroke();
  texto(t, bx, by, 13, "#3b2a1a", "center");
}
// Recepcionista contratada: de pie detrás del mostrador; mientras atiende se ve su barra de avance
function dibujarRecepcionista(r, x, y) {
  persona(r.emoji, x, y, 38, 34);
  if (!r.g) return;
  const f = Math.min(1, (reloj - r.t0) / RECEP_TIEMPOS_MS[r.nivel - 1]);
  const [sx, sy] = iso(x, y, 78);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 24, sy, 48, 7);
  ctx.fillStyle = "#7c5cff"; ctx.fillRect(sx - 24, sy, 48 * f, 7);
}
// Mostrador de la segunda puerta (en el terreno de atrás)
function dibujarEscritorio2() {
  caja3d(ctx, 340, -70, 460, -36, 26, MADERA_OSCURA, "#3e2c23");
  const [sx, sy] = iso(400, -53, 26); texto("Recepción 2", sx, sy, 11, "#fff", "center");
}
// Caja que va de la altura z0 a z1 (para apilar la cabina sobre la carrocería)
function cajaAlta(c, x0, y0, x1, y1, z0, z1, col, borde) {
  poly(c, [iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], col.der, borde);
  poly(c, [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], col.izq, borde);
  poly(c, [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], col.tapa, borde);
}
function dibujarCoche(e) {
  const horiz = e.eje === "x", a = horiz ? 26 : 12, b = horiz ? 12 : 26, ca = horiz ? 12 : 10, cb = horiz ? 10 : 12;
  sombra(e.x, e.y, 26);
  cajaAlta(ctx, e.x - a, e.y - b, e.x + a, e.y + b, 2, 12, e.col, "rgba(0,0,0,.35)");      // carrocería
  cajaAlta(ctx, e.x - ca, e.y - cb, e.x + ca, e.y + cb, 12, 21, VIDRIO, "rgba(0,0,0,.3)");  // cabina
}
function dibujarEnt(e) {
  if (e.coche) { dibujarCoche(e); return; }
  persona(e.emoji, e.x, e.y, 20, 34);
  if (e.lleva) { const [px, py] = iso(e.x, e.y, 56); emoji("🍽️", px, py, 20); } // el mesero con un platillo en la mano
  if (e.enojado) { const [sx, sy] = iso(e.x, e.y, 52); emoji("😡", sx + Math.sin(ahora() / 60) * 2, sy, 20); }
}

function dibujarGlobos() {
  const t = ahora();
  globos = globos.filter((g) => t < g.hasta);
  for (const g of globos) {
    const [sx, sy] = iso(g.x, g.y, 72);
    ctx.font = "700 13px system-ui, sans-serif";
    const w = ctx.measureText(g.texto).width + 16;
    ctx.fillStyle = "#fff"; caja(sx - w / 2, sy - 12, w, 24, 8); ctx.fill();
    ctx.strokeStyle = "#5b4636"; ctx.lineWidth = 1.5; ctx.stroke();
    texto(g.texto, sx, sy, 13, "#3b2a1a", "center");
  }
}
function dibujarMonedas() {
  const t = ahora();
  monedas = monedas.filter((c) => t - c.t0 < 1000);
  for (const c of monedas) {
    const a = (t - c.t0) / 1000, [sx, sy] = iso(c.x, c.y, 50);
    ctx.globalAlpha = 1 - a;
    texto("+$" + c.monto, sx, sy - a * 40, 17, "#b8860b", "center");
    ctx.globalAlpha = 1;
  }
}

function dibujar() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(camara.z, 0, 0, camara.z, -camara.vx * camara.z, -camara.vy * camara.z); // zoom y desplazamiento
  ctx.drawImage(fondo, -FOX, -FOY);
  // Todo se ordena por profundidad (x + y): lo más lejano primero, para que lo cercano tape a lo de atrás
  const cola = [];
  for (const m of mesas) {
    cola.push({ d: m.cx + m.cy, f: () => dibujarMesa(m) });
    for (const t of ORDEN_SILLAS) { const s = silla(m, t); cola.push({ d: s.x + s.y - 0.5, f: () => dibujarSilla(s) }); }
  }
  cola.push({ d: 190, f: dibujarMostrador });
  cola.push({ d: 222, f: dibujarChef });
  cola.push({ d: 1002, f: dibujarEscritorio });
  if (puerta2) cola.push({ d: 347, f: dibujarEscritorio2 });
  receps.forEach((r, k) => { if (r) cola.push({ d: k ? 318 : 975, f: () => dibujarRecepcionista(r, 400, k ? -84 : 572) }); });
  [[365, 85, "🚽"], [365, 125, "🚽"], [515, 85, "🚰"]].forEach(([x, y, em]) => cola.push({ d: x + y, f: () => persona(em, x, y, 16, 30) }));
  for (const e of ents) cola.push({ d: e.x + e.y + 0.1, f: () => dibujarEnt(e) });
  cola.sort((a, b) => a.d - b.d).forEach((o) => o.f());
  dibujarGlobos();
  dibujarMonedas();
  recepcion.forEach((g) => { if (g && g.esperando) dibujarEspera(g); });
  if (llevando) emoji("🍽️", puntero.x, puntero.y - 26, 34); // el platillo que traes en la mano
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (pausado) { ctx.fillStyle = "rgba(0,0,0,.55)"; caja(CW / 2 - 70, 8, 140, 30, 10); ctx.fill(); texto("⏸️ En pausa", CW / 2, 23, 16, "#fff", "center"); }
}

// ----- Bucle -----
let previo = ahora();
function cuadro() {
  const t = ahora();
  const dt = Math.min(0.05, (t - previo) / 1000);
  previo = t;
  if (esperas.length) { // las esperas vencidas se resuelven en orden (con el juego en pausa «ahora()» no avanza, así que no vence ninguna)
    const hoy = ahora(), vencidas = esperas.filter((w) => hoy >= w.fin).sort((a, b) => a.fin - b.fin);
    if (vencidas.length) { esperas = esperas.filter((w) => hoy < w.fin); vencidas.forEach((w) => { if (w.g === gen) w.r(); }); }
  }
  if (!fin) {
    reloj += dt * 1000;
    if (reloj < DURACION_DIA_MS) {
      if (reloj >= proxLlegada) { llegar(OPCIONES[Math.floor(Math.random() * OPCIONES.length)]); proxLlegada = reloj + azar(LLEGADA_MIN_MS, LLEGADA_MAX_MS); }
      if (reloj >= proxAuto) { llegarAuto(); proxAuto = reloj + azar(AUTO_MIN_MS, AUTO_MAX_MS); }
    } else comprobarFin();
    const seg = Math.max(0, Math.ceil((DURACION_DIA_MS - reloj) / 1000));
    if (seg !== ultimoSeg) {
      ultimoSeg = seg;
      $("tiempo").textContent = seg;
      if (seg === 0) info("Se acabó la jornada: termina de atender a quienes quedan.");
    }
  }
  for (const e of ents) {
    if (!e.ruta.length) continue;
    const [tx, ty] = e.ruta[0];
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), paso = (e.vel || VEL) * dt;
    if (e.coche && d > 0) e.eje = Math.abs(dx) >= Math.abs(dy) ? "x" : "y"; // el auto apunta hacia donde avanza
    if (d <= paso) {
      e.x = tx; e.y = ty; e.ruta.shift();
      if (!e.ruta.length && e.fin) { const f = e.fin; e.fin = null; f(); }
    } else { e.x += (dx / d) * paso; e.y += (dy / d) * paso; }
  }
  for (const m of mesas) {
    if (!m.esperando) continue;
    const espera = t - m.listoDesde;
    if (espera >= ENOJO_MS && !m.enojo) {
      m.enojo = true;
      m.clientes.forEach((c) => (c.enojado = true));
      globo(m.cx, m.cy, "😡 ¡Y mi comida!", 2000);
    }
    if (espera >= PACIENCIA_MS) { // se acabó la paciencia: se van
      m.esperando = false; m.enojo = false; m.tomado = false;
      if (llevando === m) llevando = null;
      const r = m.res; m.res = null;
      if (r) r(false);
    }
  }
  for (const g of recepcion) { // paciencia de quienes esperan que los atiendas en la recepción
    if (!g || !g.esperando) continue;
    const espera = reloj - g.desde;
    if (espera >= g.enojoMs && !g.enojo) {
      g.enojo = true;
      g.clientes.forEach((c) => (c.enojado = true));
      globo(HALL_X, g.y, g.sinMesa ? "😡 ¡Una mesa!" : "😡 ¡Atiéndannos!", 1800);
    }
    if (espera >= g.pacienciaMs) { g.razon = g.sinMesa ? "sinMesa" : "paciencia"; g.esperando = false; const r = g.res; g.res = null; if (r) r(null); }
  }
  receps.forEach((r, k) => { // cada recepcionista da mesa sola al grupo de SU puerta que más lleva esperando, pero tarda
    if (!r) return;
    if (r.g && !r.g.esperando) r.g = null; // lo atendiste tú o se fue
    if (!r.g) {
      const g = recepcion.filter((x) => x && x.esperando && x.pu === k).sort((a, b) => a.desde - b.desde)[0];
      if (g && mesas.some((m) => !m.ocupada)) { r.g = g; r.t0 = reloj; }
    } else if (reloj - r.t0 >= RECEP_TIEMPOS_MS[r.nivel - 1]) { const g = r.g; r.g = null; darMesa(g, true); }
  });
  for (const w of meseros) { // cada mesero libre va por el platillo que más lleva esperando (sin repetir el que otro ya va a buscar)
    if (!w || w.ocupado) continue;
    const m = mesas.filter((x) => x.esperando && !x.tomado && x.reservadoPor !== x.listoDesde).sort((a, b) => a.listoDesde - b.listoDesde)[0];
    if (m) servir(m, w);
  }
  dibujar();
  requestAnimationFrame(cuadro);
}

// ----- Sesión con Google (opcional: sin ella el juego funciona, pero no guarda puntos) -----
let J = null;
try { J = await import("../compartido/jugador.js"); } catch (e) {}
const zona = $("sesion");
if (!J) zona.textContent = "Sin sesión";
else {
  J.alCambiarSesion((u) => {
    zona.innerHTML = "";
    const b = document.createElement("button");
    b.className = "btn";
    if (!u) {
      b.textContent = "Entrar con Google";
      b.addEventListener("click", () => J.entrar().catch((e) => alert(e.message)));
      zona.appendChild(b);
      return;
    }
    const t = document.createElement("span");
    t.textContent = (u.displayName || "Jugador") + " · ";
    b.textContent = "Salir";
    b.addEventListener("click", J.salir);
    zona.append(t, b);
  });
}

// ----- Vista: zoom (➕ ➖, rueda, pellizco) y desplazamiento (arrastrar) -----
// La lógica y el dibujo trabajan en «coordenadas base» (las de iso()); la cámara solo cambia cómo se ven en el lienzo.
const camara = { z: ZOOM_INICIAL, vx: 0, vy: 0 }; // vx, vy: esquina superior izquierda de lo que se ve, en coordenadas base
ctx.imageSmoothingQuality = "high";
const aBase = (p) => [camara.vx + p[0] / camara.z, camara.vy + p[1] / camara.z];
function limitarCamara() {
  const vw = CW / camara.z, vh = CH / camara.z;
  camara.vx = Math.max(VISTA.x0, Math.min(camara.vx, VISTA.x1 - vw));
  camara.vy = Math.max(VISTA.y0, Math.min(camara.vy, VISTA.y1 - vh));
}
function centrarCamara() {
  camara.vx = CENTRO_VISTA[0] - CW / camara.z / 2;
  camara.vy = CENTRO_VISTA[1] - CH / camara.z / 2;
  limitarCamara();
}
// Cambia el zoom dejando quieto el punto (fx, fy) del lienzo
function zoomEn(z, fx, fy) {
  z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  const [bx, by] = aBase([fx, fy]);
  camara.z = z;
  camara.vx = bx - fx / z;
  camara.vy = by - fy / z;
  limitarCamara();
}
// Un toque (sin arrastrar) ejecuta la acción al soltar; arrastrar mueve la vista y dos dedos hacen zoom
const dedos = new Map(); // id del puntero → posición en el lienzo
let gesto = null;        // { inicio, movido, d0, z0 }
const dosDedos = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
lienzo.addEventListener("pointerdown", (e) => {
  try { lienzo.setPointerCapture(e.pointerId); } catch (err) {}
  dedos.set(e.pointerId, posEnLienzo(e));
  if (dedos.size === 1) gesto = { inicio: posEnLienzo(e), movido: false };
  else if (gesto && dedos.size === 2) { gesto.movido = true; gesto.d0 = dosDedos(); gesto.z0 = camara.z; }
});
lienzo.addEventListener("pointermove", (e) => {
  const p = posEnLienzo(e), b = aBase(p);
  puntero = { x: b[0], y: b[1] };
  const previo = dedos.get(e.pointerId);
  if (!previo || !gesto) return;
  dedos.set(e.pointerId, p);
  if (dedos.size === 2) {
    const [a, c] = [...dedos.values()];
    if (gesto.d0 > 0) zoomEn(gesto.z0 * dosDedos() / gesto.d0, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
  } else if (dedos.size === 1) {
    const umbral = (UMBRAL_ARRASTRE_PX * CW) / lienzo.getBoundingClientRect().width;
    if (!gesto.movido && Math.hypot(p[0] - gesto.inicio[0], p[1] - gesto.inicio[1]) > umbral) gesto.movido = true;
    if (gesto.movido) { camara.vx -= (p[0] - previo[0]) / camara.z; camara.vy -= (p[1] - previo[1]) / camara.z; limitarCamara(); }
  }
});
function soltar(e) {
  if (!dedos.delete(e.pointerId) || dedos.size) return;
  const g = gesto;
  gesto = null;
  if (g && !g.movido && e.type === "pointerup") { const [x, y] = aBase(posEnLienzo(e)); tocar(x, y); }
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);
lienzo.addEventListener("wheel", (e) => { e.preventDefault(); const [x, y] = posEnLienzo(e); zoomEn(camara.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), x, y); }, { passive: false });
$("acercar").addEventListener("click", () => zoomEn(camara.z + PASO_ZOOM, CW / 2, CH / 2));
$("alejar").addEventListener("click", () => zoomEn(camara.z - PASO_ZOOM, CW / 2, CH / 2));
$("centrar").addEventListener("click", centrarCamara);
$("cerrarTienda").addEventListener("click", cerrarTienda);
$("reiniciar").addEventListener("click", nuevaPartida);
$("otra").addEventListener("click", nuevaPartida);
centrarCamara();
armarFondo();
nuevaPartida();
requestAnimationFrame(cuadro);
