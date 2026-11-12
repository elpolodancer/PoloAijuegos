// Ruta: polocubos/juego-polocubos.js
// Menú principal estándar (Modo libre · Niveles · Mapa · Salir), mapa de 22 600 niveles SIN niveles todavía, y el Modo libre
// (solo o contra el bot; hojas de 12×12 a 500×500; 100 a 500 puntos iniciales).
// Modo libre: no da monedas ni puntos al perfil (estándar), solo guarda tu mejor marca en este dispositivo (en solitario).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { AJUSTES, DIFICULTADES, PUNTOS_INICIO, crearTablero, ponerPared, premiarCierre, hayPared, sortear, completo } from "./logica-polocubos.js";
import { jugadaBot } from "./ia-polocubos.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("es-MX");
const CLAVE_MEJORES = "polocubos_mejores_v1"; // { "<hoja>_<puntos iniciales>": { p: máximo de puntos, c: máximo de cuadros } } (solo en solitario)
const CLAVE_OPC = "polocubos_opciones_v1";     // { pi: puntos iniciales, bot: true si juegas contra el bot }
const ZOOM_MIN_TOQUE = 8;                      // con menos zoom (px por cuadro) no se ponen paredes: no se distingue el lado

let pantalla = "menu", dif = null, t = null;
const J = [null, { p: 0, a: 0, c: 0, cu: 0 }, { p: 0, a: 0, c: 0, cu: 0 }]; // 1 = tú, 2 = bot: puntos (paredes), cubos aleatorios, cadena y cuadros cerrados a mano
const puede = (x) => J[x].p >= AJUSTES.costoPared || J[x].a >= 1; // ¿tiene con qué jugar? (una pared o un sorteo)
let turno = 1, maxPuntos = 0, cantidad = 20, terminado = false, pausado = false, tBot = 0, ultima = null;
let op = { pi: AJUSTES.puntosInicio, bot: false };
try { const g = JSON.parse(localStorage.getItem(CLAVE_OPC)); if (g && PUNTOS_INICIO.includes(g.pi)) op = { pi: g.pi, bot: !!g.bot }; } catch (e) {}
const cam = { x: 0, y: 0, z: 20 };

// ---------- Mejores marcas ----------
const leerMejores = () => { try { return JSON.parse(localStorage.getItem(CLAVE_MEJORES)) || {}; } catch (e) { return {}; } };
const claveMejor = (d) => d.id + "_" + op.pi;
function guardarMejor() {
  if (!t || !dif || op.bot) return;
  const m = leerMejores(), k = claveMejor(dif), a = m[k] || { p: 0, c: 0 };
  m[k] = { p: Math.max(a.p, maxPuntos), c: Math.max(a.c, t.cuadros) };
  try { localStorage.setItem(CLAVE_MEJORES, JSON.stringify(m)); } catch (e) {}
}
addEventListener("pagehide", guardarMejor);

// ---------- Aviso breve ----------
let temporizador = 0;
function aviso(texto) {
  const a = $("aviso");
  a.textContent = texto; a.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => (a.hidden = true), 1800);
}

// ---------- Mapa estándar (sin niveles todavía) ----------
const mapa = montarMapa({
  prefijo: "polocubos",
  etapas: crearEtapas({ porEtapa: 100 }), // 32 estados + 194 países, 100 niveles cada uno = 22 600
  progreso: () => ({ max: 1, hecho: 0 }),
  jugarNivel: () => aviso("🚧 Los niveles todavía no están creados"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-verde", fn: () => { ir("libre"); } }],
});

// ---------- Pantallas ----------
function ir(p) {
  if (pantalla === "partida" && p !== "partida") { guardarMejor(); clearTimeout(tBot); }
  pantalla = p;
  $("menu").hidden = p !== "menu";
  $("libre").hidden = p !== "libre";
  $("partida").hidden = p !== "partida";
  $("fin").hidden = true;
  if (p !== "mapa" && mapa.abierto()) mapa.cerrar();
  const b = $("btn-menu");
  b.hidden = p === "menu"; // el ☰ no se ve en el menú principal
  b.querySelector(".t").textContent = p === "partida" ? "Pausa" : "Menú principal";
  if (p === "libre") pintarLibre();
  if (p === "partida") { ajustarLienzo(); ajustarVista(); }
}
function abrirMapa(n) { ir("mapa"); mapa.abrir(n); }

$("btn-menu").addEventListener("click", () => (pantalla === "partida" ? pausa.abrir() : ir("menu")));
$("b-libre").addEventListener("click", () => ir("libre"));
$("b-niveles").addEventListener("click", () => abrirMapa(1));
$("b-mapa").addEventListener("click", () => abrirMapa());

// ---------- Modo libre: opciones y tamaños de hoja ----------
function guardarOpciones() { try { localStorage.setItem(CLAVE_OPC, JSON.stringify(op)); } catch (e) {} }
function fichas(contenedor, items, activo, alElegir) {
  contenedor.replaceChildren();
  for (const [valor, texto] of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d chico txt b-gris" + (valor === activo ? " on" : "");
    b.setAttribute("aria-pressed", String(valor === activo));
    b.textContent = texto;
    b.addEventListener("click", () => { alElegir(valor); guardarOpciones(); pintarLibre(); });
    contenedor.appendChild(b);
  }
}
function pintarLibre() {
  fichas($("o-puntos"), PUNTOS_INICIO.map((v) => [v, String(v)]), op.pi, (v) => (op.pi = v));
  fichas($("o-modo"), [[false, "👤 Solo"], [true, "🤖 Contra el bot"]], op.bot, (v) => (op.bot = v));
  const m = leerMejores(), cont = $("dificultades");
  cont.replaceChildren();
  for (const d of DIFICULTADES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + d.clase;
    b.innerHTML = `<span class="b-ico">${d.icono}</span> ${d.nombre} · ${d.n}×${d.n}`;
    const rec = !op.bot && m[claveMejor(d)];
    if (rec) { const i = document.createElement("span"); i.className = "b-info"; i.textContent = "🏆 " + fmt(rec.p); i.title = "Tu máximo de puntos con " + op.pi + " iniciales"; b.appendChild(i); }
    b.addEventListener("click", () => empezar(d));
    cont.appendChild(b);
  }
}

// ---------- Menú de pausa estándar ----------
const pausa = crearMenuPausa({
  puedeAbrir: () => pantalla === "partida" && !terminado,
  alAbrir: () => { pausado = true; clearTimeout(tBot); },                                   // el bot espera
  alContinuar: () => { pausado = false; if (turno === 2 && !terminado) programarBot(); },
  extras: () => [{ icono: "🔁", texto: "Reiniciar tablero", clase: "b-azul", ayuda: "Se sortean " + op.pi + " puntos al azar y empiezas con " + AJUSTES.puntosJugar, alElegir: () => empezar(dif) }],
  ayudaSalir: "Se pierde esta partida" + (op.bot ? "" : " (tu mejor marca se conserva)"),
  alSalir: () => ir("menu"),
});

// ---------- Partida ----------
function empezar(d) {
  clearTimeout(tBot);
  dif = d; t = crearTablero(d.n);
  // Los puntos elegidos se colocan solos: se sortean cuadros al azar (a costo de sorteo) y cada jugador se queda con puntosJugar.
  // En hojas chicas se limita para no llenarlas desde el principio.
  const inicial = Math.min(Math.floor(op.pi / AJUSTES.costoSorteo), Math.floor(d.n * d.n * AJUSTES.maxInicial));
  sortear(t, inicial);
  J[1] = { p: AJUSTES.puntosJugar, a: 0, c: 0, cu: 0 }; J[2] = { p: AJUSTES.puntosJugar, a: 0, c: 0, cu: 0 };
  maxPuntos = AJUSTES.puntosJugar; turno = 1; terminado = false; pausado = false; ultima = null;
  cantidad = 20;
  ir("partida");
  pintarHud();
  aviso("🎲 " + fmt(t.cuadros) + " cuadros colocados al azar · empiezas con " + AJUSTES.puntosJugar + " puntos");
}

// Cada vez que «a» junta AJUSTES.autoSorteo puntos, se gastan solos en sortear cuadros al azar (sin premio, como el sorteo normal).
// Devuelve cuántos cuadros sorteó.
function autoSortear(a) {
  const j = J[a], por = Math.floor(AJUSTES.autoSorteo / AJUSTES.costoSorteo);
  let total = 0;
  while (j.p >= AJUSTES.autoSorteo && !completo(t)) {
    const hechos = sortear(t, por);
    if (!hechos) break;
    j.p -= hechos * AJUSTES.costoSorteo; total += hechos;
  }
  return total;
}

const maxSortear = () => Math.max(0, Math.min(J[1].a, t.n * t.n - t.cuadros)); // el sorteo manual se paga con cubos aleatorios

function pintarHud() {
  cantidad = Math.max(0, Math.min(cantidad, maxSortear()));
  if (cantidad === 0 && maxSortear() > 0) cantidad = 1;
  const chip = (id, txt) => ($(id).innerHTML = txt); // chip vacío = oculto
  chip("c-pts", `<small>${op.bot ? "Tú · puntos" : "Puntos"}</small>${fmt(J[1].p)}`);
  chip("c-azar", `<small>🎲 Cubos</small>${fmt(J[1].a)}`);
  chip("c-bot", op.bot ? `<small>🤖 Bot</small>${fmt(J[2].p)} · 🎲${fmt(J[2].a)}` : "");
  chip("c-cuadros", `<small>Cuadros</small>${fmt(t.cuadros)}/${fmt(t.n * t.n)}`);
  $("c-cadena").textContent = terminado ? "" : op.bot && turno === 2 ? "🤖 Turno del bot"
    : J[1].c > 1 ? "🔗 Cadena ×" + J[1].c : op.bot ? "Tu turno" : "";
  $("c-cant").textContent = cantidad;
  $("t-sortear").textContent = "Sortear (−" + cantidad + (cantidad === 1 ? " cubo)" : " cubos)");
  $("b-sortear").disabled = terminado || turno !== 1 || cantidad < 1;
  pedirDibujo();
}
for (const b of document.querySelectorAll("[data-paso]")) b.addEventListener("click", () => { cantidad += Number(b.dataset.paso); if (cantidad < 1) cantidad = 1; pintarHud(); });

// Pared puesta por «a» (1 = tú, 2 = bot): cuesta 1 punto. Si cierra cuadros, el premio depende de cuántas paredes de ese cuadro puso él (premiarCierre):
//   1 pared → +1 cubo aleatorio y recupera su punto · 2 o más → +2 puntos. Las paredes de un cuadro cerrado ya no cuentan para los vecinos.
// Devuelve true si cerró algún cuadro (y entonces sigue jugando quien la puso).
function poner(a, tipo, r, c) {
  const j = J[a];
  j.p -= AJUSTES.costoPared;
  const cerrados = ponerPared(t, tipo, r, c, a);
  ultima = a === 2 ? { tipo, r, c } : null;
  if (!cerrados.length) { j.c = 0; return false; } // una pared que no cierra nada rompe la cadena
  const { puntos, cubos } = premiarCierre(t, cerrados, a);
  for (const k of cerrados) { j.c++; t.dueno[k] = a; j.cu++; }
  j.p += puntos; j.a += cubos;
  const partes = [];
  if (puntos) partes.push("+" + puntos + (puntos === 1 ? " punto" : " puntos"));
  if (cubos) partes.push("+" + cubos + (cubos === 1 ? " cubo 🎲" : " cubos 🎲"));
  aviso((a === 2 ? "🤖 " : "") + partes.join(" · ") + (j.c > 1 ? " · cadena ×" + j.c : ""));
  return true;
}

function jugarPared(tipo, r, c) {
  if (terminado || turno !== 1 || hayPared(t, tipo, r, c)) return;
  if (J[1].p < AJUSTES.costoPared) { aviso("Te faltan puntos"); return; }
  revisar(!poner(1, tipo, r, c), 1);
}

$("b-sortear").addEventListener("click", () => {
  if (terminado || turno !== 1 || cantidad < 1) return;
  const hechos = sortear(t, Math.min(cantidad, J[1].a));
  J[1].a -= hechos; J[1].c = 0; ultima = null;
  aviso("🎲 " + hechos + (hechos === 1 ? " cuadro sorteado" : " cuadros sorteados") + " (−" + hechos + (hechos === 1 ? " cubo)" : " cubos)"));
  revisar(true, 1);
});

// Después de cada jugada: ¿terminó la partida? ¿de quién es el turno? (sortear o una pared sin cerrar pasan el turno al rival)
function revisar(terminaTurno, a) {
  const auto = autoSortear(a); // al llegar a 100 puntos se colocan solos al azar
  if (auto) aviso((a === 2 ? "🤖 " : "") + "🎲 " + AJUSTES.autoSorteo + " puntos → " + auto + (auto === 1 ? " cuadro" : " cuadros") + " al azar");
  if (J[1].p > maxPuntos) maxPuntos = J[1].p;
  if (completo(t) || (op.bot ? !puede(1) && !puede(2) : !puede(1))) return terminar();
  if (op.bot) {
    if (terminaTurno) { J[a].c = 0; turno = a === 1 ? 2 : 1; }
    if (!puede(turno)) turno = turno === 1 ? 2 : 1; // quien se quedó sin puntos ni cubos no puede jugar: sigue el otro
  }
  pintarHud();
  if (turno === 2) programarBot();
}

function programarBot() {
  clearTimeout(tBot);
  tBot = setTimeout(pasoBot, !puede(1) ? 200 : 650);
}
function pasoBot() {
  if (pausado || terminado || turno !== 2) return;
  const m = jugadaBot(t, J[2].p, J[2].a);
  if (m.accion === "sortear") {
    const hechos = sortear(t, m.cantidad);
    J[2].a -= hechos; ultima = null;
    aviso("🤖 sorteó " + hechos + (hechos === 1 ? " cuadro" : " cuadros"));
    revisar(true, 2);
  } else revisar(!poner(2, m.tipo, m.r, m.c), 2);
}

function terminar() {
  terminado = true; clearTimeout(tBot); guardarMejor(); pintarHud();
  const total = fmt(t.n * t.n);
  if (op.bot) {
    const [a, b] = [J[1], J[2]];
    $("fin-titulo").textContent = a.p > b.p ? "¡Le ganaste al bot! 🏆" : a.p < b.p ? "Ganó el bot 🤖" : "¡Empate!";
    $("fin-texto").textContent = `Tú: ${fmt(a.p)} puntos (${fmt(a.cu)} cuadros). Bot: ${fmt(b.p)} puntos (${fmt(b.cu)} cuadros).`;
  } else if (completo(t)) {
    $("fin-titulo").textContent = "¡Hoja completa! 🎉";
    $("fin-texto").textContent = `Cerraste los ${total} cuadros y terminaste con ${fmt(J[1].p)} puntos.`;
  } else {
    $("fin-titulo").textContent = "Sin puntos";
    $("fin-texto").textContent = `Cerraste ${fmt(t.cuadros)} de ${total} cuadros. Tu máximo fue de ${fmt(maxPuntos)} puntos.`;
  }
  $("fin").hidden = false;
}
$("fin-otra").addEventListener("click", () => empezar(dif));
$("fin-menu").addEventListener("click", () => ir("menu"));

// ---------- Dibujo (canvas transparente; la hoja es el propio tablero) ----------
// Se dibuja desde las listas de paredes y cuadros ya puestos (t.LH, t.LV, t.LC), así una hoja de 500×500 no recorre 250 000 cuadros por cuadro de animación.
const cv = $("tablero"), ctx = cv.getContext("2d");
const COLORES = ["rgba(63,160,255,.30)", "rgba(46,190,90,.40)", "rgba(240,120,40,.42)"]; // sorteo/rebote, tú, bot
let dpr = 1, pendiente = false;
function ajustarLienzo() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
  pedirDibujo();
}
const zFit = () => (Math.min(cv.clientWidth, cv.clientHeight) * 0.94) / t.n;
function ajustarVista() { // toda la hoja a la vista
  if (!t) return;
  cam.z = zFit();
  cam.x = (cv.clientWidth - t.n * cam.z) / 2; cam.y = (cv.clientHeight - t.n * cam.z) / 2;
  pedirDibujo();
}
function limitar() { // la hoja nunca se aleja más de la mitad de la pantalla
  const w = cv.clientWidth, h = cv.clientHeight;
  cam.x = Math.min(w / 2, Math.max(w / 2 - t.n * cam.z, cam.x));
  cam.y = Math.min(h / 2, Math.max(h / 2 - t.n * cam.z, cam.y));
}
function pedirDibujo() { if (!pendiente) { pendiente = true; requestAnimationFrame(dibujar); } }

function dibujar() {
  pendiente = false;
  if (!t || pantalla !== "partida") return;
  const w = cv.clientWidth, h = cv.clientHeight, n = t.n, m = n + 1, { x, y, z } = cam;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = "#fffdf6"; ctx.fillRect(x, y, n * z, n * z); ctx.restore();
  const c0 = Math.max(0, Math.floor(-x / z)), c1 = Math.min(n, Math.ceil((w - x) / z));
  const r0 = Math.max(0, Math.floor(-y / z)), r1 = Math.min(n, Math.ceil((h - y) / z));
  const tam = Math.max(z, 1);
  let ultimo = -1;
  for (const k of t.LC) { // cuadros cerrados
    const r = (k / n) | 0, c = k - r * n;
    if (r < r0 || r >= r1 || c < c0 || c >= c1) continue;
    const d = t.dueno[k];
    if (d !== ultimo) { ctx.fillStyle = COLORES[d]; ultimo = d; }
    ctx.fillRect(x + c * z, y + r * z, tam, tam);
  }
  const paso = z >= 6 ? 1 : z >= 2 ? 10 : 50; // cuadrícula de libreta: con poco zoom solo cada 10 o 50 líneas
  ctx.strokeStyle = "#b9d6f2"; ctx.lineWidth = 1; ctx.beginPath();
  for (let c = Math.ceil(c0 / paso) * paso; c <= c1; c += paso) { ctx.moveTo(x + c * z, y + r0 * z); ctx.lineTo(x + c * z, y + r1 * z); }
  for (let r = Math.ceil(r0 / paso) * paso; r <= r1; r += paso) { ctx.moveTo(x + c0 * z, y + r * z); ctx.lineTo(x + c1 * z, y + r * z); }
  ctx.stroke();
  const grosor = Math.max(z >= 8 ? 2 : 1.5, z * 0.14);
  ctx.strokeStyle = "#16255e"; ctx.lineWidth = grosor; ctx.lineCap = "round"; ctx.beginPath(); // paredes (tinta)
  for (const i of t.LH) { const r = (i / n) | 0, c = i - r * n; if (r < r0 || r > r1 || c < c0 || c >= c1) continue; ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + (c + 1) * z, y + r * z); }
  for (const i of t.LV) { const r = (i / m) | 0, c = i - r * m; if (r < r0 || r >= r1 || c < c0 || c > c1) continue; ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + c * z, y + (r + 1) * z); }
  ctx.stroke();
  if (ultima) { // última pared del bot, para que se vea qué hizo
    const { tipo, r, c } = ultima;
    ctx.strokeStyle = "#e8590c"; ctx.lineWidth = grosor * 1.3; ctx.beginPath();
    ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + (c + (tipo === "H" ? 1 : 0)) * z, y + (r + (tipo === "V" ? 1 : 0)) * z); ctx.stroke();
  }
}

// ---------- Zoom, arrastre y toque ----------
function zoomEn(px, py, f) {
  const nz = Math.max(zFit() * 0.9, Math.min(90, cam.z * f)), k = nz / cam.z;
  cam.x = px - (px - cam.x) * k; cam.y = py - (py - cam.y) * k; cam.z = nz;
  limitar(); pedirDibujo();
}
const centro = () => [cv.clientWidth / 2, cv.clientHeight / 2];
$("z-mas").addEventListener("click", () => zoomEn(...centro(), 1.5));
$("z-menos").addEventListener("click", () => zoomEn(...centro(), 1 / 1.5));
$("z-ajustar").addEventListener("click", ajustarVista);
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomEn(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
addEventListener("resize", () => { if (pantalla === "partida") { ajustarLienzo(); ajustarVista(); } });

const punteros = new Map();
let movido = false, variosDedos = false, pinza = 0;
cv.addEventListener("pointerdown", (e) => {
  cv.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (punteros.size === 1) { movido = false; variosDedos = false; }
  else { variosDedos = true; const [a, b] = [...punteros.values()]; pinza = Math.hypot(a.x - b.x, a.y - b.y); }
});
cv.addEventListener("pointermove", (e) => {
  const p = punteros.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (punteros.size === 1) {
    if (!movido && Math.hypot(p.x - p.x0, p.y - p.y0) > 8) movido = true;
    if (movido) { cam.x += dx; cam.y += dy; limitar(); pedirDibujo(); }
  } else if (punteros.size === 2) {
    movido = true;
    const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinza) zoomEn((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinza);
    pinza = d;
  }
});
function soltar(e) {
  const p = punteros.get(e.pointerId);
  punteros.delete(e.pointerId);
  if (punteros.size < 2) pinza = 0;
  if (p && e.type === "pointerup" && !movido && !variosDedos && punteros.size === 0) tocar(e.clientX, e.clientY);
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);

// Un toque pone la pared del lado del cuadro que quedó más cerca del dedo
function tocar(px, py) {
  if (!t || terminado || turno !== 1) return;
  if (cam.z < ZOOM_MIN_TOQUE) { aviso("🔍 Acércate para poner paredes"); return; }
  const wx = (px - cam.x) / cam.z, wy = (py - cam.y) / cam.z;
  if (wx < 0 || wy < 0 || wx >= t.n || wy >= t.n) return;
  const c = Math.floor(wx), r = Math.floor(wy), fx = wx - c, fy = wy - r;
  const m = Math.min(fx, 1 - fx, fy, 1 - fy);
  if (m === fy) jugarPared("H", r, c);
  else if (m === 1 - fy) jugarPared("H", r + 1, c);
  else if (m === fx) jugarPared("V", r, c);
  else jugarPared("V", r, c + 1);
}

ir("menu");
