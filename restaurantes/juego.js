// Ruta: restaurantes/juego.js
// «Restaurantes»: tiras el dado y llegan 1, 2 o 4 clientes. La recepcionista les da una mesa, piden,
// la cocina prepara, el mesero sirve, algunos van al baño, comen y pagan 25 pesos cada uno en la recepción.
// Solo hay 3 tiradas por partida y 4 mesas con 4 sillas cada una.
const ID = "restaurantes";

// ----- Ajustes -----
const MAX_TIRADAS = 3;            // tiradas por partida
const OPCIONES = [1, 2, 4];       // clientes que pueden llegar en una tirada
const PAGO_POR_CLIENTE = 25;      // pesos que paga cada cliente
const PESOS_POR_PUNTO = 5;        // al perfil se envía 1 punto por cada 5 pesos ganados
const VEL = 150;                  // velocidad de la gente (px por segundo)
const T_COCINA_BASE = 3000;       // ms de cocina por pedido...
const T_COCINA_POR_CLIENTE = 500; // ...más estos ms por cada cliente de la mesa
const T_COMER = 5000;             // ms que tardan en comer
const PROB_BANIO = 0.5;           // probabilidad de que un cliente vaya al baño mientras come
const KEY_RECORD = "restaurantes_record";

// ----- Mapa (el lienzo mide 560 × 680) -----
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
let tiradas, dinero, atendidos, terminados, llegando, fin, cocinando;

const ahora = () => performance.now();
// Espera que no continúa si se reinició la partida mientras tanto
const esp = (ms) => { const g = gen; return new Promise((r) => setTimeout(() => { if (g === gen) r(); }, ms)); };

function nuevaPartida() {
  gen++;
  ents = []; globos = []; monedas = [];
  mesas = MESAS_BASE.map((m) => ({ ...m, ocupada: false, plato: false, barra: null }));
  tiradas = 0; dinero = 0; atendidos = 0; terminados = 0; cocinando = 0;
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
  globo(RECEP.x, RECEP.y - 30, "Mesa " + mesa.id + " para " + n + " 👍", 1800);
  info("La recepcionista les da la mesa " + mesa.id + ".");
  await esp(1800);
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 350); await ir(c, rutaIda(mesa, i)); }));
  llegando = false;
  actualizar();

  // 3) Piden y la cocina prepara
  await esp(700);
  globo(mesa.cx, mesa.cy - 78, "📝 Pidiendo…", 1100);
  await esp(1100);
  const tCocina = T_COCINA_BASE + T_COCINA_POR_CLIENTE * n;
  mesa.barra = { t0: ahora(), dur: tCocina, color: "#f2994a" };
  cocinando++;
  await esp(tCocina);
  cocinando--;
  mesa.barra = null;

  // 4) El mesero sirve; comen (y algunos van al baño)
  await servir(mesa);
  mesa.barra = { t0: ahora(), dur: T_COMER, color: "#6fcf97" };
  await Promise.all([esp(T_COMER), ...clientes.map((c, i) => banio(c, mesa, i))]);
  mesa.barra = null;
  mesa.plato = false;
  globo(mesa.cx, mesa.cy - 78, "🧾 La cuenta", 1200);
  await esp(900);

  // 5) Pagan en la recepción y se van
  await Promise.all(clientes.map(async (c, i) => {
    await esp(i * 300);
    const ida = rutaIda(mesa, i);
    await ir(c, [...ida.slice(0, -1).reverse(), espera(i)]);
    dinero += PAGO_POR_CLIENTE;
    atendidos++;
    monedas.push({ x: c.x, y: c.y - 24, t0: ahora() });
    actualizar();
    await esp(500);
    await ir(c, [[HALL_X, 640], [HALL_X, H + 40]]);
    quitar(c);
  }));
  mesa.ocupada = false;
  terminados++;
  if (tiradas >= MAX_TIRADAS && terminados >= MAX_TIRADAS) finalizar();
}

// El mesero lleva el plato de la cocina a la mesa y vuelve
async function servir(m) {
  const w = nuevaEnt("🤵", 225, 120);
  w.lleva = true;
  const lado = m.cx < HALL_X ? 1 : -1;
  const ida = [PUERTA_COCINA, [HALL_X, 185], [HALL_X, m.cy], [m.cx + 80 * lado, m.cy]];
  await ir(w, ida);
  w.lleva = false;
  m.plato = true;
  await esp(300);
  await ir(w, [[HALL_X, m.cy], [HALL_X, 185], PUERTA_COCINA, [225, 120]]);
  quitar(w);
}

// Mientras comen, algunos clientes van al baño y regresan
async function banio(c, m, i) {
  if (Math.random() >= PROB_BANIO) return;
  await esp(400 + Math.random() * 1200);
  const ida = rutaIda(m, i);
  const dentro = [400 + i * 22, 120];
  await ir(c, [...ida.slice(1, -1).reverse(), [HALL_X, 185], PUERTA_BANIO, dentro]);
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
  $("finTexto").textContent = "Atendiste " + atendidos + " clientes y ganaste $" + dinero + " pesos." + extra;
  $("fin").hidden = false;
  info("Se acabaron las 3 tiradas.");
  actualizar();
}

// ----- Dibujo -----
function emoji(t, x, y, tam) { ctx.font = tam + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
function caja(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function texto(t, x, y, tam, color, alinear) { ctx.font = "700 " + tam + "px system-ui, sans-serif"; ctx.fillStyle = color; ctx.textAlign = alinear || "left"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }

function habitacion(x, y, w, h, relleno, puertaX, puertaW) {
  ctx.fillStyle = relleno; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#5b4636"; ctx.lineWidth = 6; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#ecd9b8"; ctx.fillRect(puertaX, y + h - 5, puertaW, 10); // hueco de la puerta
}

function dibujarFondo() {
  ctx.fillStyle = "#ecd9b8"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(120,80,40,.12)"; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Cocina
  habitacion(10, 10, 250, 150, "#dfe6e9", 200, 50);
  texto("Cocina", 22, 26, 13, "#455a64");
  ctx.fillStyle = "#90a4ae"; ctx.fillRect(20, 40, 230, 30);
  emoji("🍳", 50, 56, 24); emoji("🥘", 120, 56, 24); emoji("🥗", 190, 56, 24);

  // Baño
  habitacion(330, 10, 220, 150, "#d6eef5", 400, 60);
  texto("Baño", 342, 26, 13, "#2f6f84");
  emoji("🚻", 520, 30, 22);
  emoji("🚽", 365, 85, 26); emoji("🚽", 365, 125, 26); emoji("🚰", 515, 85, 26);

  texto("Comedor", 22, 190, 12, "rgba(91,70,54,.7)");

  // Recepción
  ctx.fillStyle = "#8d6e63"; caja(340, 585, 120, 34, 6); ctx.fill();
  texto("Recepción", 400, 602, 12, "#fff", "center");
  // Entrada
  ctx.fillStyle = "#5b4636"; ctx.fillRect(250, H - 8, 60, 8);
  texto("Entrada", 330, H - 14, 11, "rgba(91,70,54,.8)");
}

function dibujarMesa(m) {
  for (const t of ORDEN_SILLAS) {
    const s = silla(m, t);
    ctx.fillStyle = "#a1887f"; ctx.beginPath(); ctx.arc(s.x, s.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#6d4c41"; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.fillStyle = m.ocupada ? "#c58b4e" : "#b57a3c";
  caja(m.cx - 32, m.cy - 32, 64, 64, 10); ctx.fill();
  ctx.strokeStyle = m.ocupada ? "#7c5cff" : "#6d4c41"; ctx.lineWidth = m.ocupada ? 4 : 3; ctx.stroke();
  texto("Mesa " + m.id, m.cx, m.cy - 18, 11, "#fff", "center");
  if (m.plato) emoji("🍽️", m.cx, m.cy + 2, 22);
  if (m.barra) {
    const f = Math.min(1, (ahora() - m.barra.t0) / m.barra.dur);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(m.cx - 24, m.cy + 18, 48, 7);
    ctx.fillStyle = m.barra.color; ctx.fillRect(m.cx - 24, m.cy + 18, 48 * f, 7);
  }
}

function dibujarGlobos() {
  const t = ahora();
  globos = globos.filter((g) => t < g.hasta);
  for (const g of globos) {
    ctx.font = "700 13px system-ui, sans-serif";
    const w = ctx.measureText(g.texto).width + 16;
    ctx.fillStyle = "#fff"; caja(g.x - w / 2, g.y - 12, w, 24, 8); ctx.fill();
    ctx.strokeStyle = "#5b4636"; ctx.lineWidth = 1.5; ctx.stroke();
    texto(g.texto, g.x, g.y, 13, "#3b2a1a", "center");
  }
}

function dibujarMonedas() {
  const t = ahora();
  monedas = monedas.filter((c) => t - c.t0 < 1000);
  for (const c of monedas) {
    const a = (t - c.t0) / 1000;
    ctx.globalAlpha = 1 - a;
    texto("+$" + PAGO_POR_CLIENTE, c.x, c.y - a * 40, 16, "#b8860b", "center");
    ctx.globalAlpha = 1;
  }
}

function dibujar() {
  dibujarFondo();
  mesas.forEach(dibujarMesa);
  // Personal fijo
  emoji("🧑‍🍳", 110, 112 + (cocinando > 0 ? Math.sin(ahora() / 120) * 3 : 0), 30);
  if (cocinando > 0) emoji("♨️", 150, 100, 18);
  emoji("🧑‍💼", RECEP.x, RECEP.y, 30);
  // Gente, de arriba hacia abajo para que se tapen bien
  for (const e of [...ents].sort((a, b) => a.y - b.y)) {
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(e.x, e.y + 13, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
    emoji(e.emoji, e.x, e.y, 26);
    if (e.lleva) emoji("🍽️", e.x, e.y - 22, 18);
  }
  dibujarGlobos();
  dibujarMonedas();
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
$("reiniciar").addEventListener("click", nuevaPartida);
$("otra").addEventListener("click", nuevaPartida);
nuevaPartida();
requestAnimationFrame(cuadro);
