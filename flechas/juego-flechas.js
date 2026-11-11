// Ruta: flechas/juego-flechas.js
// Flechas: toca una flecha para sacarla del tablero. Sale en línea recta por donde apunta; si otra flecha le estorba, pierdes un corazón.
// Cinco dificultades (Fácil, Medio, Difícil, Extra difícil, Ultra difícil) con niveles generados por semilla (generador-flechas.js).
import { generar, DIFICULTADES, ORDEN } from "./generador-flechas.js";
import { crearEstado, bloqueo, quitar, libres, direccion } from "./logica-flechas.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

// ----- Ajustes -----
const ID = "flechas";
const CLAVE = "flechas_progreso_v1";   // { facil: nivel más alto pasado, medio: ..., ... }
const CLAVE_ULTIMA = "flechas_ultima"; // solo local: última dificultad jugada (para «Continuar»)
const NIVELES = 100;                   // niveles por dificultad
const VIDAS = 3;
const PUNTOS = { facil: 5, medio: 10, dificil: 20, extra: 30, ultra: 50 }; // puntos al perfil, solo la primera vez que se pasa el nivel
const COLOR_BOTON = { facil: "b-verde", medio: "b-azul", dificil: "b-morado", extra: "b-oro", ultra: "b-rojo" };
const TINTA = "#2f3e4a", ROJO = "#d2431e", VERDE = "#14a36e";

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), cx = lienzo.getContext("2d");

// ----- Progreso (local primero; se sincroniza con la cuenta si hay sesión) -----
let prog = {};
const leer = () => { try { prog = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { prog = {}; } };
let nube = null;
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };
const hechos = (d) => Math.min(NIVELES, Math.max(0, Math.floor(Number(prog[d])) || 0));
const siguiente = (d) => Math.min(NIVELES, hechos(d) + 1);
const leerUltima = () => { try { const d = localStorage.getItem(CLAVE_ULTIMA); return DIFICULTADES[d] ? d : "facil"; } catch (e) { return "facil"; } };
const guardarUltima = (d) => { try { localStorage.setItem(CLAVE_ULTIMA, d); } catch (e) {} };

// ----- Estado de la partida -----
let dif = "facil", nivel = 1, est = null;
let vidas = VIDAS, quitadas = 0, total = 0;
let jugando = false, pausado = false, terminado = false, ticket = 0;
let volando = [];   // flechas saliendo del tablero
let rebotes = [];   // flechas bloqueadas (rojas, con un empujoncito)
let pista = -1;     // flecha señalada por la bombilla
let cache = null;   // último nivel generado (para reiniciar sin volver a generarlo)
let ocup0 = null;   // casillas que al empezar tenían flecha (los huecos del tablero no llevan puntitos)
let anchoCss = 0, altoCss = 0, cell = 10, raf = 0;

// ----- Pantallas -----
function rotularMenu(texto) { $("btn-menu").innerHTML = '<span class="b-ico">☰</span> ' + texto; }
function mostrar(cual) { // "menu" | "lista" | "partida"
  $("menu").hidden = cual !== "menu";
  $("lista").hidden = cual !== "lista";
  $("zona").hidden = cual === "partida";
  $("partida").hidden = cual !== "partida";
  $("fin").hidden = true;
  $("hudJuego").hidden = cual !== "partida";
  $("btn-menu").hidden = cual === "menu"; // en el menú principal no se muestra el ☰
  if (cual === "lista") rotularMenu("Menú principal");
  if (cual === "partida") rotularMenu("Pausa");
  pausado = false;
  if (cual !== "partida") { jugando = false; ticket++; }
}

function menu() {
  mostrar("menu");
  const d = leerUltima();
  const hay = ORDEN.some((x) => hechos(x) > 0);
  $("menuInfo").textContent = "Saca todas las flechas sin que se estorben";
  $("continuar").textContent = "▶ " + (hay ? "Continuar" : "Empezar") + " · " + DIFICULTADES[d].nombre + " · Nivel " + siguiente(d);
  const cont = $("dificultades");
  cont.replaceChildren();
  for (const x of ORDEN) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + COLOR_BOTON[x];
    b.textContent = DIFICULTADES[x].nombre + " · " + hechos(x) + "/" + NIVELES;
    b.addEventListener("click", () => lista(x));
    cont.appendChild(b);
  }
}

function lista(d) {
  mostrar("lista");
  $("listaTitulo").textContent = DIFICULTADES[d].nombre + " · " + hechos(d) + " de " + NIVELES;
  const sig = siguiente(d), ok = hechos(d);
  const g = $("rejilla");
  g.replaceChildren();
  for (let n = 1; n <= NIVELES; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(n);
    b.className = "nv" + (n <= ok ? " hecho" : n === sig ? " actual" : " bloq");
    if (n <= sig) b.addEventListener("click", () => jugar(d, n));
    else b.disabled = true;
    g.appendChild(b);
  }
}

// ----- Partida -----
function jugar(d, n) {
  dif = d; nivel = n;
  guardarUltima(d);
  mostrar("partida");
  $("tag").textContent = DIFICULTADES[d].nombre.toUpperCase();
  $("titulo").textContent = "Nivel " + n;
  est = null; volando = []; rebotes = []; pista = -1; jugando = false;
  vidas = VIDAS; quitadas = 0; total = 0; terminado = false;
  cx.clearRect(0, 0, anchoCss, altoCss);
  pintarHud();
  $("cargando").hidden = false;
  const mio = ++ticket;
  // pequeña espera para que se alcance a mostrar «Generando nivel…» (en tableros grandes generar tarda un momento)
  setTimeout(() => {
    if (mio !== ticket) return;
    const clave = d + ":" + n;
    const g = cache && cache.clave === clave ? cache.g : generar(d, n);
    cache = { clave, g };
    est = crearEstado(g.cols, g.filas, g.flechas);
    ocup0 = est.celda.slice();
    total = g.flechas.length;
    $("cargando").hidden = true;
    jugando = true;
    pintarHud();
    ajustar();
  }, 40);
}

function pintarHud() {
  let h = "";
  for (let i = 0; i < VIDAS; i++) h += '<span class="' + (i < vidas ? "" : "perdida") + '">♥</span>';
  $("vidas").innerHTML = h;
  $("barraI").style.width = (total ? (quitadas / total) * 100 : 0) + "%";
}

// ----- Dibujo -----
function ajustar() {
  if (!est || $("partida").hidden) return;
  const area = $("area");
  const W = area.clientWidth - 20 - 16, H = area.clientHeight - 8 - 16; // márgenes del área y del panel del tablero
  if (W <= 0 || H <= 0) return;
  cell = Math.max(3, Math.min(W / est.cols, H / est.filas));
  anchoCss = Math.round(est.cols * cell);
  altoCss = Math.round(est.filas * cell);
  cell = anchoCss / est.cols;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  lienzo.style.width = anchoCss + "px";
  lienzo.style.height = altoCss + "px";
  lienzo.width = Math.round(anchoCss * dpr);
  lienzo.height = Math.round(altoCss * dpr);
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pedir();
}
addEventListener("resize", ajustar);
if (window.ResizeObserver) new ResizeObserver(ajustar).observe($("area"));

const pedir = () => { if (!raf) raf = requestAnimationFrame(dibujar); };

// Camino de una flecha prolongado en línea recta hasta salir del tablero (para animar la salida)
function extendida(f) {
  if (f._ext) return f._ext;
  const c = f.celdas, n = c.length, [dx, dy] = direccion(c);
  let [x, y] = c[n - 1];
  let rl = 0; // pasos que le faltan a la cabeza para llegar al borde
  while (x + dx * (rl + 1) >= 0 && y + dy * (rl + 1) >= 0 && x + dx * (rl + 1) < est.cols && y + dy * (rl + 1) < est.filas) rl++;
  const pts = c.map(([a, b]) => [a, b]);
  for (let i = 1; i <= n + rl + 2; i++) pts.push([x + dx * i, y + dy * i]);
  return (f._ext = { pts, largo: n - 1, dir: [dx, dy], dmax: n + rl + 1 });
}
function en(pts, s) {
  const i = Math.max(0, Math.min(Math.floor(s), pts.length - 2)), t = s - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
}
const PX = (p) => [(p[0] + 0.5) * cell, (p[1] + 0.5) * cell];

// Dibuja la flecha «f» desplazada «d» casillas a lo largo de su camino (0 = en su sitio)
function flecha(f, d, color, grosor = 1) {
  const e = extendida(f), s1 = d + e.largo;
  cx.strokeStyle = color; cx.fillStyle = color;
  cx.lineWidth = Math.max(1.3, cell * 0.14) * grosor;
  cx.lineCap = "round"; cx.lineJoin = "round";
  cx.beginPath();
  const a = PX(en(e.pts, d));
  cx.moveTo(a[0], a[1]);
  for (let i = Math.floor(d) + 1; i < s1; i++) { const q = PX(e.pts[i]); cx.lineTo(q[0], q[1]); }
  const b = PX(en(e.pts, s1));
  cx.lineTo(b[0], b[1]);
  cx.stroke();
  // punta
  const [dx, dy] = e.dir, k = cell;
  const tx = b[0] + dx * 0.32 * k, ty = b[1] + dy * 0.32 * k;       // vértice
  const bx = tx - dx * 0.58 * k, by = ty - dy * 0.58 * k;           // centro de la base
  const h = 0.3 * k * grosor;
  cx.beginPath();
  cx.moveTo(tx, ty);
  cx.lineTo(bx - dy * h, by + dx * h);
  cx.lineTo(bx + dy * h, by - dx * h);
  cx.closePath();
  cx.fill();
}

function dibujar() {
  raf = 0;
  if (!est) return;
  const ahora = performance.now();
  cx.clearRect(0, 0, anchoCss, altoCss); // transparente: el panel del tablero pone el fondo
  // puntitos en las casillas vacías (ya se sacaron las flechas de ahí)
  if (cell >= 7) {
    cx.fillStyle = "rgba(47,62,74,.28)";
    const r = Math.max(0.8, cell * 0.05);
    for (let y = 0; y < est.filas; y++) for (let x = 0; x < est.cols; x++) {
      if (est.celda[y * est.cols + x] !== -1 || ocup0[y * est.cols + x] === -1) continue; // solo donde había flecha y ya salió
      cx.beginPath(); cx.arc((x + 0.5) * cell, (y + 0.5) * cell, r, 0, 6.2832); cx.fill();
    }
  }
  rebotes = rebotes.filter((r) => ahora - r.t0 < r.dur);
  const rojas = new Map(rebotes.map((r) => [r.id, (ahora - r.t0) / r.dur]));
  for (const id of est.vivas) {
    const f = est.flechas[id];
    if (rojas.has(id)) flecha(f, 0.45 * Math.sin(Math.PI * rojas.get(id)), ROJO);
    else if (id === pista) flecha(f, 0, VERDE, 1.5);
    else flecha(f, 0, TINTA);
  }
  volando = volando.filter((v) => ahora - v.t0 < v.dur);
  for (const v of volando) {
    const u = (ahora - v.t0) / v.dur;
    flecha(v.f, v.dmax * (0.3 * u + 0.7 * u * u), TINTA);
  }
  if (volando.length || rebotes.length) pedir();
}

// ----- Toques -----
function distancia(celdas, px, py) { // distancia de un punto al camino de una flecha (en casillas)
  let m = 1e9;
  for (let i = 0; i + 1 < celdas.length; i++) {
    const [ax, ay] = celdas[i], [bx, by] = celdas[i + 1];
    const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    m = Math.min(m, Math.hypot(px - (ax + vx * t), py - (ay + vy * t)));
  }
  return m;
}
function buscar(lx, ly) { // lx, ly en casillas (el centro de la casilla x,y es x,y)
  const x0 = Math.round(lx), y0 = Math.round(ly);
  const vistos = new Set();
  let mejor = -1, md = 1e9;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= est.cols || y >= est.filas) continue;
    const id = est.celda[y * est.cols + x];
    if (id < 0 || vistos.has(id)) continue;
    vistos.add(id);
    const d = distancia(est.flechas[id].celdas, lx, ly);
    if (d < md) { md = d; mejor = id; }
  }
  const umbral = Math.min(1.1, Math.max(0.55, 14 / cell)); // en tableros muy chicos el dedo es más grande que la casilla
  return md <= umbral ? mejor : -1;
}

lienzo.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (!jugando || pausado || terminado || !est) return;
  const r = lienzo.getBoundingClientRect();
  const id = buscar(((e.clientX - r.left) / r.width) * est.cols - 0.5, ((e.clientY - r.top) / r.height) * est.filas - 0.5);
  if (id < 0) return;
  if (bloqueo(est, id) === -1) salir(id); else fallar(id);
});

function salir(id) {
  const f = est.flechas[id], e = extendida(f);
  quitar(est, id);
  quitadas++;
  if (pista === id) pista = -1;
  volando.push({ f, t0: performance.now(), dur: 140 + e.dmax * 12, dmax: e.dmax });
  pintarHud();
  pedir();
  if (!est.vivas.size) { terminado = true; setTimeout(ganar, Math.max(400, 240 + e.dmax * 12)); } // espera a que termine de salir la última
}

function fallar(id) {
  if (rebotes.some((r) => r.id === id)) return; // un doble toque no cuesta dos corazones
  vidas--;
  rebotes.push({ id, t0: performance.now(), dur: 520 });
  try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) {}
  pintarHud();
  pedir();
  if (vidas <= 0) { terminado = true; setTimeout(derrota, 650); }
}

// ----- Final de la partida -----
function mostrarFin(titulo, botones) {
  $("finTitulo").textContent = titulo;
  const c = $("finBotones");
  c.replaceChildren();
  for (const [texto, clase, fn] of botones) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + clase;
    b.textContent = texto;
    b.addEventListener("click", fn);
    c.appendChild(b);
  }
  $("fin").hidden = false;
  try { c.firstChild.focus({ preventScroll: true }); } catch (e) {}
}

async function ganar() {
  if ($("partida").hidden) return;
  jugando = false;
  const primera = nivel > hechos(dif);
  if (primera) { prog[dif] = nivel; guardar(); }
  const ultimo = nivel >= NIVELES;
  mostrarFin(ultimo ? "🎉 ¡Completaste " + DIFICULTADES[dif].nombre + "!" : "🎉 ¡Nivel " + nivel + " resuelto!", [
    [ultimo ? "Ver niveles" : "Siguiente nivel ▶", "b-verde", () => (ultimo ? lista(dif) : jugar(dif, nivel + 1))],
    ["Niveles", "b-azul", () => lista(dif)],
  ]);
  if (primera) {
    encolarPuntos(ID, PUNTOS[dif]); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
    try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  }
}
function derrota() {
  if ($("partida").hidden) return;
  jugando = false;
  mostrarFin("💔 Te quedaste sin corazones", [
    ["Reintentar", "b-verde", () => jugar(dif, nivel)],
    ["Niveles", "b-azul", () => lista(dif)],
  ]);
}

// ----- Botones -----
$("pista").addEventListener("click", () => { // marca una flecha que sí puede salir ahora
  if (!jugando || pausado || terminado || !est) return;
  const l = libres(est);
  if (!l.length) return;
  pista = l[(Math.random() * l.length) | 0];
  pedir();
});
$("reiniciar").addEventListener("click", () => { if (!$("partida").hidden) jugar(dif, nivel); });
$("continuar").addEventListener("click", () => { const d = leerUltima(); jugar(d, siguiente(d)); });
$("btn-menu").addEventListener("click", () => { if (!$("lista").hidden) menu(); }); // en la lista el ☰ dice «Menú principal»

// Menú de pausa estándar (☰ en partida): Continuar / Niveles / Salir. No hay reloj que congelar, solo se ignoran los toques.
crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => jugando && !terminado && !$("partida").hidden && $("fin").hidden,
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; pedir(); },
  extras: () => [{ icono: "📋", texto: "Niveles", clase: "b-azul", alElegir: () => lista(dif) }],
  ayudaSalir: () => (quitadas && jugando ? "Se pierde lo que llevas de este nivel" : ""),
  alSalir: () => menu(),
});

leer();
menu();

// Sincroniza los niveles pasados con la cuenta de Google (por dificultad gana el nivel más alto)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: m.unirMaximos,
    alCambiar: (v) => { prog = v || {}; if (!$("menu").hidden) menu(); },
  });
}).catch(() => {});
