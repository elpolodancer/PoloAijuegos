// Ruta: restaurantes/juego.js
// «Restaurantes» (vista isométrica estilo Clash of Clans): tiras el dado y llegan 1, 2 o 4 clientes. La recepcionista les da una mesa, piden,
// la cocina prepara y TÚ llevas el platillo a mano (clic en la cocina para tomarlo, clic en la mesa para entregarlo).
// Si tardas, se enojan y se van. Algunos van al baño (cuesta $1), comen y pagan $5 cada uno en la recepción.
// Solo hay 3 tiradas por partida y 4 mesas con 4 sillas cada una.
const ID = "restaurantes";

// ----- Ajustes -----
const MAX_TIRADAS = 3;            // tiradas por partida
const OPCIONES = [1, 2, 4];       // clientes que pueden llegar en una tirada
const PAGO_POR_CLIENTE = 5;       // pesos que paga cada cliente
const COSTO_BANIO = 1;            // pesos que cuesta usar el baño
const ENOJO_MS = 8000;            // desde estos ms de espera (con el platillo ya listo) los clientes se ven enojados
const PACIENCIA_MS = 15000;       // a estos ms sin recibir el platillo, los clientes se van sin pagar
const PESOS_POR_PUNTO = 1;        // al perfil se envía 1 punto por cada peso ganado
const VEL = 150;                  // velocidad de la gente (px por segundo)
const T_COCINA_BASE = 3000;       // ms de cocina por pedido...
const T_COCINA_POR_CLIENTE = 500; // ...más estos ms por cada cliente de la mesa
const T_COMER = 5000;             // ms que tardan en comer
const PROB_BANIO = 0.5;           // probabilidad de que un cliente vaya al baño mientras come
const KEY_RECORD = "restaurantes_record";

// ----- Mapa plano de la lógica (560 × 680); la vista isométrica se proyecta al dibujar -----
const W = 560, H = 680;
const HALL_X = 280;                         // pasillo central
const ENTRADA = [HALL_X, 570];              // inicio del pasillo, junto a la recepción
const ESPERA_Y = 610;                       // donde esperan los clientes frente a la recepcionista
const RECEP = { x: 400, y: 566 };           // recepcionista
const PUERTA_COCINA = [225, 185];
const PUERTA_BANIO = [430, 185];
const MESAS_BASE = [
  { id: 1, cx: 150, cy: 290 }, { id: 2, cx: 410, cy: 290 },
  { id: 3, cx: 150, cy: 440 }, { id: 4, cx: 410, cy: 440 },
];
const ORDEN_SILLAS = ["cerca", "arriba", "abajo", "lejos"]; // 4 sillas por mesa; se ocupan en este orden
const CARAS = ["🧑", "👩", "👨", "🧓", "👧", "👦", "🧔", "👱"];

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");

// ----- Estado de la partida -----
let gen = 0; // sube al reiniciar: lo que quedó pendiente de la partida anterior se descarta
let ents, globos, monedas, mesas;
let tiradas, dinero, atendidos, perdidos, terminados, llegando, fin, cocinando;
let llevando = null;                    // mesa cuyo platillo traes en la mano
let puntero = { x: -99, y: -99 };       // último punto tocado/señalado en el lienzo (para dibujar el platillo)

const ahora = () => performance.now();
// Espera que no continúa si se reinició la partida mientras tanto
const esp = (ms) => { const g = gen; return new Promise((r) => setTimeout(() => { if (g === gen) r(); }, ms)); };

function nuevaPartida() {
  gen++;
  ents = []; globos = []; monedas = [];
  mesas = MESAS_BASE.map((m) => ({ ...m, ocupada: false, plato: false, barra: null, esperando: false, tomado: false, enojo: false, listoDesde: 0, res: null, clientes: [] }));
  tiradas = 0; dinero = 0; atendidos = 0; perdidos = 0; terminados = 0; cocinando = 0; llevando = null;
  llegando = false; fin = false;
  $("fin").hidden = true;
  info("Tira el dado: llegarán 1, 2 o 4 clientes.");
  actualizar();
}

function info(t) { $("estado").textContent = t; }
function leerRecord() { try { return Number(localStorage.getItem(KEY_RECORD)) || 0; } catch (e) { return 0; } }
function actualizar() {
  $("dinero").textContent = dinero;
  $("tiradas").textContent = tiradas;
  $("record").textContent = leerRecord();
  const b = $("dado");
  b.disabled = fin || llegando || tiradas >= MAX_TIRADAS;
  b.textContent = tiradas >= MAX_TIRADAS ? "Sin tiradas" : "🎲 Tirar el dado (" + (tiradas + 1) + " de " + MAX_TIRADAS + ")";
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
function rutaIda(m, i) {
  const tipo = ORDEN_SILLAS[i], s = silla(m, tipo);
  if (tipo === "cerca") return [ENTRADA, [HALL_X, m.cy], [s.x, s.y]];
  if (tipo === "lejos") return [ENTRADA, [HALL_X, m.cy - 70], [s.x, m.cy - 70], [s.x, s.y]];
  return [ENTRADA, [HALL_X, s.y], [s.x, s.y]];
}

// ----- Un grupo de clientes, de principio a fin -----
async function atender(n) {
  const clientes = Array.from({ length: n }, () => nuevaEnt(CARAS[Math.floor(Math.random() * CARAS.length)], HALL_X, H + 30));
  const espera = (i) => [HALL_X + (i - (n - 1) / 2) * 34, ESPERA_Y];

  // 1) Llegan a la recepción
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [espera(i)]); }));

  // 2) La recepcionista les da mesa
  const libres = mesas.filter((m) => !m.ocupada);
  const mesa = libres[Math.floor(Math.random() * libres.length)];
  mesa.ocupada = true;
  mesa.clientes = clientes;
  globo(RECEP.x, RECEP.y, "Mesa " + mesa.id + " para " + n + " 👍", 1800);
  info("La recepcionista les da la mesa " + mesa.id + ".");
  await esp(1800);
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 350); await ir(c, rutaIda(mesa, i)); }));
  llegando = false;
  actualizar();

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
      await ir(c, [...rutaIda(mesa, i).slice(0, -1).reverse(), [HALL_X, 640], [HALL_X, H + 40]]);
      quitar(c);
    }));
    cerrarGrupo(mesa);
    return;
  }
  mesa.plato = true;
  globo(mesa.cx, mesa.cy, "😋", 1200);
  mesa.barra = { t0: ahora(), dur: T_COMER, color: "#6fcf97" };
  await Promise.all([esp(T_COMER), ...clientes.map((c, i) => banio(c, mesa, i))]);
  mesa.barra = null;
  mesa.plato = false;
  globo(mesa.cx, mesa.cy, "🧾 La cuenta", 1200);
  await esp(900);

  // 5) Pagan en la recepción y se van
  await Promise.all(clientes.map(async (c, i) => {
    await esp(i * 300);
    const ida = rutaIda(mesa, i);
    await ir(c, [...ida.slice(0, -1).reverse(), espera(i)]);
    dinero += PAGO_POR_CLIENTE;
    atendidos++;
    monedas.push({ x: c.x, y: c.y, t0: ahora(), monto: PAGO_POR_CLIENTE });
    actualizar();
    await esp(500);
    await ir(c, [[HALL_X, 640], [HALL_X, H + 40]]);
    quitar(c);
  }));
  cerrarGrupo(mesa);
}

function cerrarGrupo(mesa) {
  mesa.ocupada = false;
  mesa.clientes = [];
  terminados++;
  if (tiradas >= MAX_TIRADAS && terminados >= MAX_TIRADAS) finalizar();
}

// ----- Entrega manual (todavía no hay mesero) -----
// Se resuelve con true si entregas el platillo a tiempo, o con false si se acaba la paciencia (se revisa en cuadro())
function esperarEntrega(m) {
  return new Promise((res) => { m.listoDesde = ahora(); m.esperando = true; m.tomado = false; m.res = res; });
}
function entregar(m) {
  m.esperando = false; m.tomado = false; m.enojo = false;
  m.clientes.forEach((c) => (c.enojado = false));
  llevando = null;
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
  if (fin) return;
  puntero = { x: sx, y: sy };
  const enCocina = dentro(aMundo(sx, sy, 0), 10, 10, 260, 160) || dentro(aMundo(sx, sy, 30), 10, 10, 260, 160);
  const mesaTocada = mesas.find((m) => dentro(aMundo(sx, sy, 22), m.cx - 58, m.cy - 58, m.cx + 58, m.cy + 58));
  if (llevando) {
    if (mesaTocada === llevando) entregar(llevando);
    else if (mesaTocada) info("Ese platillo es para la mesa " + llevando.id + ", no para la " + mesaTocada.id + ".");
    else if (enCocina) { llevando.tomado = false; info("Dejaste el platillo de la mesa " + llevando.id + " en la cocina."); llevando = null; }
    return;
  }
  const listos = mesas.filter((m) => m.esperando && !m.tomado);
  // Si tocas un platillo del mostrador, ese; si tocas otra parte de la cocina, el que lleva más tiempo esperando
  let elegido = listos.find((m) => { const [px, py] = iso(SLOT_X[m.id - 1], SLOT_Y, 40); return Math.hypot(sx - px, sy - py) < 28; });
  if (!elegido && enCocina) elegido = listos.sort((a, b) => a.listoDesde - b.listoDesde)[0];
  if (elegido) { elegido.tomado = true; llevando = elegido; info("Llevas el platillo de la mesa " + elegido.id + ": toca esa mesa para entregarlo."); }
  else if (enCocina) info("Todavía no hay platillos listos.");
}
function posEnLienzo(e) { const r = lienzo.getBoundingClientRect(); return [((e.clientX - r.left) * CW) / r.width, ((e.clientY - r.top) * CH) / r.height]; }

// Mientras comen, algunos clientes van al baño y regresan
async function banio(c, m, i) {
  if (Math.random() >= PROB_BANIO) return;
  await esp(400 + Math.random() * 1200);
  const ida = rutaIda(m, i);
  const dentro = [400 + i * 22, 120];
  await ir(c, [...ida.slice(1, -1).reverse(), [HALL_X, 185], PUERTA_BANIO, dentro]);
  dinero += COSTO_BANIO;
  monedas.push({ x: c.x, y: c.y, t0: ahora(), monto: COSTO_BANIO });
  actualizar();
  await esp(1000);
  await ir(c, [PUERTA_BANIO, [HALL_X, 185], ...ida.slice(1)]);
}

// ----- Dado -----
async function tirar() {
  if (fin || llegando || tiradas >= MAX_TIRADAS) return;
  tiradas++;
  llegando = true;
  actualizar();
  const n = OPCIONES[Math.floor(Math.random() * OPCIONES.length)];
  for (let k = 0; k < 8; k++) { info("🎲 Tirando… " + OPCIONES[k % OPCIONES.length]); await esp(80); }
  info("Tirada " + tiradas + " de " + MAX_TIRADAS + ": llegan " + n + (n === 1 ? " cliente." : " clientes."));
  atender(n);
}

// ----- Final -----
async function finalizar() {
  fin = true;
  const record = Math.max(leerRecord(), dinero);
  try { localStorage.setItem(KEY_RECORD, String(record)); } catch (e) {}
  const puntos = Math.floor(dinero / PESOS_POR_PUNTO);
  let extra = "";
  if (J && puntos > 0) {
    try { extra = (await J.sumarPuntos(ID, puntos)) ? " Se sumaron " + puntos + " puntos a tu perfil." : " Entra con Google para guardar tus puntos."; }
    catch (e) { extra = " No se pudieron guardar los puntos."; }
  }
  $("finTitulo").textContent = "Día terminado";
  $("finTexto").textContent = "Atendiste " + atendidos + " clientes y ganaste $" + dinero + " pesos." + (perdidos ? " Se fueron " + perdidos + " sin comida." : "") + extra;
  $("fin").hidden = false;
  info("Se acabaron las 3 tiradas.");
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
const fondo = document.createElement("canvas");
fondo.width = CW; fondo.height = CH;
function armarFondo() {
  const c = fondo.getContext("2d");
  c.fillStyle = "#8bbf6a"; c.fillRect(0, 0, CW, CH); // pasto
  // grosor del terreno
  poly(c, [iso(W, 0, 0), iso(W, H, 0), iso(W, H, -14), iso(W, 0, -14)], "#6b4f3a");
  poly(c, [iso(0, H, 0), iso(W, H, 0), iso(W, H, -14), iso(0, H, -14)], "#7d5c44");
  // piso del comedor
  for (let i = 0; i < W / 40; i++) for (let j = 0; j < H / 40; j++) suelo(c, i * 40, j * 40, i * 40 + 40, j * 40 + 40, (i + j) % 2 ? "#e4cfa9" : "#ecd9b8");
  cuarto(c, 10, 10, 260, 160, "#eceff1", "#cfd8dc", "#b0bec5", 200, 50);   // cocina
  cuarto(c, 330, 10, 550, 160, "#e1f5fa", "#b6e0ea", "#80c4d3", 400, 60);   // baño
  const [kx, ky] = iso(135, 10, 70); texto("Cocina", kx, ky, 14, "#37474f", "center", c);
  const [bx, by] = iso(440, 10, 70); texto("Baño", bx, by, 14, "#1f5d70", "center", c);
  const [cx, cy] = iso(40, 520, 0); texto("Comedor", cx, cy, 13, "rgba(91,70,54,.75)", "center", c);
  // puerta de entrada
  caja3d(c, 250, H - 4, 310, H, 5, MADERA_OSCURA);
  const [ex, ey] = iso(280, H, 0); texto("Entrada", ex + 4, ey + 30, 13, "#2f4f2f", "center", c);
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
function dibujarRecep() { persona("🧑‍💼", RECEP.x, RECEP.y, 20, 34); }
function dibujarEscritorio() {
  caja3d(ctx, 340, 585, 460, 619, 26, MADERA_OSCURA, "#3e2c23");
  const [sx, sy] = iso(400, 602, 26); texto("Recepción", sx, sy, 11, "#fff", "center");
}
function dibujarEnt(e) {
  persona(e.emoji, e.x, e.y, 20, 34);
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
  ctx.drawImage(fondo, 0, 0);
  // Todo se ordena por profundidad (x + y): lo más lejano primero, para que lo cercano tape a lo de atrás
  const cola = [];
  for (const m of mesas) {
    cola.push({ d: m.cx + m.cy, f: () => dibujarMesa(m) });
    for (const t of ORDEN_SILLAS) { const s = silla(m, t); cola.push({ d: s.x + s.y - 0.5, f: () => dibujarSilla(s) }); }
  }
  cola.push({ d: 190, f: dibujarMostrador });
  cola.push({ d: 222, f: dibujarChef });
  cola.push({ d: RECEP.x + RECEP.y, f: dibujarRecep });
  cola.push({ d: 1002, f: dibujarEscritorio });
  [[365, 85, "🚽"], [365, 125, "🚽"], [515, 85, "🚰"]].forEach(([x, y, em]) => cola.push({ d: x + y, f: () => persona(em, x, y, 16, 30) }));
  for (const e of ents) cola.push({ d: e.x + e.y + 0.1, f: () => dibujarEnt(e) });
  cola.sort((a, b) => a.d - b.d).forEach((o) => o.f());
  dibujarGlobos();
  dibujarMonedas();
  if (llevando) emoji("🍽️", puntero.x, puntero.y - 26, 34); // el platillo que traes en la mano
}

// ----- Bucle -----
let previo = ahora();
function cuadro() {
  const t = ahora();
  const dt = Math.min(0.05, (t - previo) / 1000);
  previo = t;
  for (const e of ents) {
    if (!e.ruta.length) continue;
    const [tx, ty] = e.ruta[0];
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), paso = VEL * dt;
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

$("dado").addEventListener("click", tirar);
lienzo.addEventListener("pointerdown", (e) => { const [x, y] = posEnLienzo(e); tocar(x, y); });
lienzo.addEventListener("pointermove", (e) => { const [x, y] = posEnLienzo(e); puntero = { x, y }; });
$("reiniciar").addEventListener("click", nuevaPartida);
$("otra").addEventListener("click", nuevaPartida);
armarFondo();
nuevaPartida();
requestAnimationFrame(cuadro);
