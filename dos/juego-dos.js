// Ruta: dos/juego-dos.js
// «Dos» (id de puntos: "dos"). Fase 1: 2 minutos para recoger objetos en una casa de 2 pisos (inventario de 15 espacios).
// Recoger: tecla E/espacio, botón «Recoger», o clic/toque sobre un objeto muy cercano.
// Al llegar a cero solo sobrevives si estás dentro del búnker: entonces bajas al REFUGIO (escena nueva con estantes y una mesa, ver «Fin»).
// La casa, el refugio y el reparto están en logica-dos.js.
// Vista: desde arriba y al centro de la casa, inclinada (proyección en la sección «Dibujo»; la lógica sigue siendo plana).
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { W, H, TIEMPO, ESPACIOS, RADIO, VEL, ESCALERA, LLEGADA, BUNKER, PUERTA_BUNKER, INICIO, ESCENAS, TIPOS,
  PISO_REFUGIO, ESCALERA_REFUGIO, LLEGADA_REFUGIO, ESTANTES, MESA, RANURAS, rectEstante, ALTO_ESTANTE, acomodarEnRefugio, ranuraLibre,
  generarItems, mover, dentroDe, dentroBunker, nombreItem, valorItem } from "./logica-dos.js";

const ID = "dos", CLAVE = "dos_progreso_v1", BONO_VIVO = 50, ALCANCE = 30;
const RADIO_TOQUE = 18; // qué tan cerca del dibujo del objeto debe caer el clic o el toque (unidades del lienzo 800×450)
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
lienzo.width = 1280; lienzo.height = 720;

// ---------- Progreso: { mejor, partidas } ----------
let prog = leer(), nube = null;
function leer() {
  try { const p = JSON.parse(localStorage.getItem(CLAVE)); if (p) return { mejor: Math.max(0, p.mejor | 0), partidas: Math.max(0, p.partidas | 0) }; } catch (e) {}
  return { mejor: 0, partidas: 0 };
}
function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); }
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => (!a && !b ? null : { mejor: Math.max(a?.mejor | 0, b?.mejor | 0), partidas: Math.max(a?.partidas | 0, b?.partidas | 0) }),
    alCambiar: () => { prog = leer(); if (modo === "menu") armarMenu(); },
  });
}).catch(() => {});

// ---------- Iconos de los objetos (dibujados, sin emojis) ----------
function icono(c, tipo, cx, cy, s, carga) {
  c.save(); c.translate(cx, cy); c.scale(s / 10, s / 10); c.lineJoin = "round";
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const O = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const P = (col, ...pts) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
  const lata = (col, letra) => { R(-6, -7, 12, 14, "#cfd3d9"); R(-6, -4, 12, 8, col); R(-6, -7, 12, 2, "#9aa0a8"); R(-6, 5, 12, 2, "#9aa0a8"); c.fillStyle = "#fff"; c.font = "bold 7px sans-serif"; c.textAlign = "center"; c.fillText(letra, 0, 2.3); };
  switch (tipo) {
    case "agua": R(-3, -4, 6, 12, "#59b7ff"); R(-3, 0, 6, 3, "#fff"); R(-2, -8, 4, 4, "#cfeaff"); R(-2, -9, 4, 2, "#2c6fb3"); break;
    case "atun": lata("#2f6fd1", "A"); break;
    case "frijoles": lata("#8b4a1f", "F"); break;
    case "tomates": lata("#d93a2b", "T"); break;
    case "hacha": c.strokeStyle = "#8b5a2b"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-6, 8); c.lineTo(4, -6); c.stroke(); P("#9aa3ad", [1, -9], [9, -4], [6, 0], [1, -3]); break;
    case "escopeta": R(-9, -3, 15, 2.2, "#555"); R(-9, -0.6, 11, 1.8, "#777"); P("#8b5a2b", [5, -3], [10, 0], [10, 4], [4, 0]); break;
    case "pistola": R(-6, -4, 12, 4, "#444"); R(0, 0, 4, 7, "#2b2b2b"); R(-6, -4, 3, 2, "#666"); break;
    case "cobija": R(-8, -6, 16, 12, "#3fa35a"); R(-8, -2, 16, 2, "#2e7d44"); R(-8, 2, 16, 2, "#2e7d44"); break;
    case "toallitas": R(-6, -7, 12, 14, "#7fd1ff"); R(-6, -7, 12, 3, "#2c8fc9"); O(0, 2, 3, "#fff"); break;
    case "dulces": P("#ff9ec4", [-4, 0], [-9, -3.5], [-9, 3.5]); P("#ff9ec4", [4, 0], [9, -3.5], [9, 3.5]); O(0, 0, 4.5, "#ff4d8d"); break;
    case "celular": R(-4, -8, 8, 16, "#222"); R(-3, -6.5, 6, 11, "#6fc3ff"); O(0, 6.5, 1, "#888"); break;
    case "cartas": R(-7, -6, 10, 13, "#cfd3d9"); R(-3, -7, 10, 13, "#fffbe8"); O(2, -1, 2.6, "#d32f2f"); break;
    case "juego": R(-8, -6, 16, 12, "#e34b3c"); R(-8, -6, 16, 3, "#a82a1e"); R(-3, -1, 6, 6, "#fff"); O(-1, 1, .8, "#000"); O(1, 3, .8, "#000"); break;
    case "papel": O(0, 0, 7, "#fff"); O(0, 0, 2.6, "#caa27a"); break;
    case "pasta": R(-4, -8, 8, 14, "#4fa8ff"); R(-4, -8, 8, 3, "#fff"); R(-2.5, 6, 5, 3, "#fff"); break;
    case "botiquin": R(-8, -6, 16, 12, "#fff"); R(-1.5, -4.5, 3, 9, "#e53935"); R(-4.5, -1.5, 9, 3, "#e53935"); break;
    case "extintor": R(-4, -5, 8, 13, "#e53935"); R(-2, -8, 4, 3, "#222"); R(2, -8, 5, 1.5, "#222"); O(0, 2, 2, "#fff"); break;
    case "mascara": O(0, 0, 7, "#aeb6bf"); O(-3, 2, 2.4, "#6b7480"); O(3, 2, 2.4, "#6b7480"); R(-3, -3, 6, 1.4, "#7b8591"); break;
    case "cigarros": R(-3.2, -9, 2.2, 6, "#f6e7c8"); R(0.4, -8, 2.2, 5, "#f6e7c8"); R(-3.2, -5.2, 2.2, 2.2, "#e08a3c"); R(0.4, -4.2, 2.2, 1.2, "#e08a3c"); R(-6, -3, 12, 11, "#c62828"); R(-6, -3, 12, 3, "#fff"); R(-6, 4, 12, 1.6, "#8e1b1b"); break;
    case "encendedor": R(-3.5, -1, 7, 10, "#2b8fd6"); R(-3.5, -4, 7, 3, "#b0b6bd"); P("#ff9f1c", [0, -10], [3, -6], [0, -4.4], [-3, -6]); P("#ffe27a", [0, -8], [1.4, -5.8], [0, -5], [-1.4, -5.8]); break;
  }
  if (carga) O(7, -7, 2.2, "#ffd23c");   // punto amarillo = arma con balas
  c.restore();
}

// ---------- Estado ----------
let modo = "menu", pausado = false;
let items, mochila, jx, jy, piso, tiempo, aviso, avisoT, bloqueoEscalera, ojo, hacia;
const teclas = new Set();
let tran = 0, salvo = [], puntosBajada = 0; // transición al refugio: segundos que lleva, objetos que se salvan y puntos que dio
const activo = () => (modo === "juego" || modo === "refugio") && !pausado;   // se puede caminar, recoger y soltar
let joy = null;  // { ox, oy, x, y } mientras arrastras
const ocultar = (e) => { e.hidden = true; }, mostrar = (e) => { e.hidden = false; };
const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// Inventario (HTML): 15 ranuras; tocar una suelta el objeto
const inv = $("inv"), ranuras = [];
for (let i = 0; i < ESPACIOS; i++) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "ranura"; b.setAttribute("aria-label", "Espacio " + (i + 1) + ": vacío");
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64; b.appendChild(cv);
  b.addEventListener("click", () => soltar(i));
  inv.appendChild(b); ranuras.push(b);
}
function pintarInventario() {
  ranuras.forEach((b, i) => {
    const it = mochila[i], c = b.firstChild.getContext("2d");
    c.clearRect(0, 0, 64, 64);
    if (it) { icono(c, it.tipo, 32, 32, 26, it.carga); b.title = nombreItem(it) + " (toca para soltar)"; b.setAttribute("aria-label", nombreItem(it) + ", toca para soltar"); }
    else { b.title = "Vacío"; b.setAttribute("aria-label", "Espacio " + (i + 1) + ": vacío"); }
  });
}
function decir(t) { aviso = t; avisoT = 1.8; }

function iniciar() {
  items = generarItems(); mochila = new Array(ESPACIOS).fill(null);
  jx = INICIO.x; jy = INICIO.y; piso = INICIO.piso; tiempo = TIEMPO; aviso = ""; avisoT = 0; bloqueoEscalera = 0; ojo = 0; hacia = 1;
  joy = null; teclas.clear(); pausado = false; modo = "juego";
  ocultar($("menu")); ocultar($("fin")); mostrar(inv); mostrar($("btn-recoger")); $("btn-menu").hidden = false;
  pintarInventario(); decir("¡Rápido! Tienes 2 minutos");
}
function armarMenu() {
  modo = "menu"; $("btn-menu").hidden = true; ocultar(inv); ocultar($("btn-recoger")); ocultar($("btn-cerrar")); ocultar($("fin")); mostrar($("menu"));
  for (const c of ["chip-piso", "chip-mochila", "chip-tiempo"]) $(c).textContent = "";
  $("record").textContent = prog.partidas ? "Mejor puntaje: " + prog.mejor + " · Partidas: " + prog.partidas : "";
}
$("btn-jugar").onclick = iniciar;
$("fin-otra").onclick = iniciar;
$("fin-menu").onclick = armarMenu;
$("btn-cerrar").onclick = () => { if (modo === "juego" && !pausado && dentroBunker(jx, jy, piso)) terminar(); };

const pausa = crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: activo,
  alAbrir: () => { pausado = true; joy = null; teclas.clear(); },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "🔁", texto: "Reiniciar partida", clase: "b-oro", alElegir: iniciar }],
  alSalir: () => { pausado = false; armarMenu(); },
  ayudaSalir: () => (modo === "refugio" ? "Vuelves al menú principal." : "Pierdes esta partida."),
});

// ---------- Recoger / soltar ----------
function cercano() {
  let mejor = null, d = ALCANCE;
  for (const it of items) { if (it.piso !== piso) continue; const k = Math.hypot(it.x - jx, it.y - jy) + (it.z || 0) * 0.001; if (k < d) { d = k; mejor = it; } }   // a igual distancia (estantes), la tabla más baja
  return mejor;
}
// Sin argumento recoge el objeto más cercano (tecla E/espacio y botón «Recoger»); con argumento, ese objeto (clic o toque sobre él)
function recoger(it = cercano()) {
  if (!activo() || !it) return;
  const i = mochila.indexOf(null);
  if (i < 0) { decir("Inventario lleno: toca un objeto para soltarlo"); return; }
  mochila[i] = it; items.splice(items.indexOf(it), 1); it.ranura = null;
  pintarInventario(); decir("Recogiste: " + nombreItem(it));
}
const ranurasOcupadas = () => new Set(items.filter((o) => o.piso === PISO_REFUGIO && o.ranura != null).map((o) => o.ranura));
function soltar(i) {
  if (!activo() || !mochila[i]) return;
  const it = mochila[i];
  if (piso === PISO_REFUGIO) { // en el refugio el objeto va a la ranura libre más cercana de su zona (estante o mesa)
    const r = ranuraLibre(it.tipo, jx, jy, ranurasOcupadas());
    if (!r) { decir("No hay lugar libre para eso"); return; }
    Object.assign(it, { piso, ranura: r.i, x: r.x, y: r.y, z: r.z });
    mochila[i] = null; items.push(it); pintarInventario();
    decir("Dejaste: " + nombreItem(it) + (r.zona === "mesa" ? " en la mesa" : " en el estante " + (r.e + 1) + ", tabla " + (r.t + 1)));
    return;
  }
  mochila[i] = null;
  it.piso = piso; it.x = jx + 14 * hacia; it.y = jy + 6; it.z = 0; it.ranura = null;
  items.push(it); pintarInventario(); decir("Soltaste: " + nombreItem(it));
}
$("btn-recoger").addEventListener("click", () => recoger());

// ---------- Fin ----------
// Al llegar a cero (o al cerrar la puerta): fuera del búnker pierdes; dentro, bajas al refugio (escena nueva, ver más abajo).
function terminar() {
  if (dentroBunker(jx, jy, piso)) { bajarAlRefugio(); return; }
  const llevados = mochila.filter(Boolean);
  const cuenta = {}; for (const it of llevados) { const n = nombreItem(it); cuenta[n] = (cuenta[n] || 0) + 1; }
  const lista = Object.entries(cuenta).map(([n, k]) => n + (k > 1 ? " ×" + k : "")).join(", ") || "nada";
  prog.partidas++; guardar();
  modo = "fin"; $("btn-menu").hidden = true; ocultar(inv); ocultar($("btn-recoger")); ocultar($("btn-cerrar"));
  $("fin-titulo").className = "firma";
  $("fin-titulo").textContent = "Se acabó el tiempo…";
  $("fin-texto").textContent = "No llegaste al búnker. Llevabas " + llevados.length + " objeto(s): " + lista + ". Esta vez no sobreviviste.";
  mostrar($("fin"));
}

// ---------- Bajar al refugio ----------
// Se salva lo que llevas en la mochila y lo que soltaste en el piso del búnker. Los puntos se dan aquí. Luego: fundido a negro («bajando»),
// cambio de escena a la mitad (armarRefugio) y fundido de vuelta; después modo = "refugio" (sin tiempo: se camina, se recoge y se deja).
const T_CORTE = 1.3, T_BAJADA = 3.0;   // segundos: a los 1.3 s la pantalla está negra y se cambia de escena; a los 3.0 s termina el fundido
function bajarAlRefugio() {
  const sueltos = items.filter((it) => it.piso === 0 && dentroBunker(it.x, it.y, 0));
  salvo = [...mochila.filter(Boolean), ...sueltos];
  puntosBajada = salvo.reduce((s, it) => s + valorItem(it), 0) + BONO_VIVO;
  prog.partidas++; encolarPuntos(ID, puntosBajada); if (puntosBajada > prog.mejor) prog.mejor = puntosBajada; guardar();
  modo = "bajando"; tran = 0; joy = null; teclas.clear();
  ocultar($("btn-cerrar")); ocultar($("btn-recoger")); ocultar(inv);
}
function bajando(dt) {
  const antes = tran; tran += dt;
  if (antes < T_CORTE && tran >= T_CORTE) armarRefugio();
  if (tran >= T_BAJADA) { modo = "refugio"; mostrar(inv); mostrar($("btn-recoger")); decir("A salvo en el refugio · +" + puntosBajada + " puntos"); }
}
function armarRefugio() {
  mochila = new Array(ESPACIOS).fill(null);
  const sobran = acomodarEnRefugio(salvo);          // pone cada objeto en su estante o en la mesa
  items = salvo.filter((it) => !sobran.includes(it)); salvo = [];
  jx = LLEGADA_REFUGIO.x; jy = LLEGADA_REFUGIO.y; piso = PISO_REFUGIO; hacia = -1;
  pintarInventario();
}

// ---------- Entrada ----------
addEventListener("keydown", (e) => {
  if (!activo()) return;
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) { teclas.add(k); e.preventDefault(); }
  else if ((k === "e" || k === " ") && !e.repeat) { e.preventDefault(); recoger(); }
});
addEventListener("keyup", (e) => teclas.delete(e.key.toLowerCase()));
addEventListener("blur", () => { teclas.clear(); joy = null; });
const punto = (e) => { const r = lienzo.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
// Objeto del piso actual cuyo dibujo está bajo el puntero (el más cercano al punto tocado), o null
function itemEnPunto(p) {
  let mejor = null, d = RADIO_TOQUE;
  for (const it of items) {
    if (it.piso !== piso) continue;
    const [x, y] = centroItem(it);
    const k = Math.hypot(p.x - x, p.y - y); // centroItem ya incluye lo que sube el icono sobre su posición
    if (k < d) { d = k; mejor = it; }
  }
  return mejor;
}
const estaAlAlcance = (it) => Math.hypot(it.x - jx, it.y - jy) < ALCANCE;
lienzo.addEventListener("pointerdown", (e) => {
  if (!activo()) return;
  const p = punto(e), it = itemEnPunto(p);
  e.preventDefault();
  if (it && estaAlAlcance(it)) { recoger(it); return; }   // toque sobre un objeto muy cercano: se recoge, sin joystick
  joy = { ox: p.x, oy: p.y, x: p.x, y: p.y, lejos: !!it };  // si tocó un objeto lejano, se avisa al soltar (si no arrastró)
  lienzo.setPointerCapture(e.pointerId);
});
lienzo.addEventListener("pointermove", (e) => {
  const p = punto(e);
  if (joy) { joy.x = p.x; joy.y = p.y; return; }
  if (e.pointerType === "mouse") { // la manita aparece solo sobre un objeto que sí se puede recoger
    const it = activo() ? itemEnPunto(p) : null;
    lienzo.style.cursor = it && estaAlAlcance(it) ? "pointer" : "";
  }
});
lienzo.addEventListener("pointerup", () => {
  if (joy && joy.lejos && Math.hypot(joy.x - joy.ox, joy.y - joy.oy) < 8) decir("Acércate más para recogerlo");
  joy = null;
});
lienzo.addEventListener("pointercancel", () => { joy = null; });

// ---------- Actualizar ----------
function moverJugador(dt) {
  let vx = 0, vy = 0;
  if (teclas.has("arrowleft") || teclas.has("a")) vx -= 1;
  if (teclas.has("arrowright") || teclas.has("d")) vx += 1;
  if (teclas.has("arrowup") || teclas.has("w")) vy -= 1;
  if (teclas.has("arrowdown") || teclas.has("s")) vy += 1;
  if (joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.hypot(dx, dy); if (d > 8) { const m = Math.min(1, (d - 8) / 40); vx = (dx / d) * m; vy = (dy / d) * m; } }
  const n = Math.hypot(vx, vy);
  if (n > 1) { vx /= n; vy /= n; }
  if (vx || vy) {
    if (Math.abs(vx) > 0.2) hacia = vx > 0 ? 1 : -1;
    const p = mover(jx, jy, vx * VEL * dt, vy * VEL * dt, piso); jx = p.x; jy = p.y;
  }
}
function actualizar(dt) {
  const enJuego = modo === "juego";   // en el refugio no hay cuenta regresiva, escaleras ni puerta
  avisoT -= dt; ojo += dt;
  if (enJuego) { tiempo -= dt; bloqueoEscalera -= dt; }
  moverJugador(dt);
  if (enJuego && bloqueoEscalera <= 0 && dentroDe(jx, jy, ESCALERA)) {
    piso = 1 - piso; jx = LLEGADA.x; jy = LLEGADA.y; bloqueoEscalera = 0.5; decir(ESCENAS[piso].nombre);
  }
  if (enJuego) $("btn-cerrar").hidden = !dentroBunker(jx, jy, piso);
  $("chip-piso").textContent = ESCENAS[piso].nombre;
  $("chip-mochila").textContent = "🎒 " + mochila.filter(Boolean).length + "/" + ESPACIOS;
  $("chip-tiempo").textContent = enJuego ? "⏱ " + fmt(Math.max(0, tiempo)) : "";
  $("chip-tiempo").classList.toggle("alerta", enJuego && tiempo <= 15);
  if (enJuego && tiempo <= 0) terminar();
}

// ---------- Dibujo ----------
// VISTA: cámara arriba y al CENTRO de la casa, inclinada hacia el frente (no desde una esquina). El plano (x, y) de logica-dos.js NO cambia:
// solo se proyecta al dibujar, con proy(x, y, z). K aplasta la profundidad (inclinación); Q hace que lo alto se abra desde el centro
// (perspectiva suave: Q = 0 da una vista de frente sin perspectiva); z es la altura. Las paredes son BAJAS a propósito para no tapar objetos,
// y lo que aun así quede tapado se ve «fantasma» encima (ver dibujarEscena).
const K = 0.8, ESC = 1.08, Q = 0.0012, ALTO_PARED = 14, CX = W / 2, CY = H / 2, OY = 232;
const ALTO_MUEBLE = { estante: 22, cajas: 12, literas: 20, mesa: 10, barra: 12, refri: 26, trinchador: 12, "bañera": 8, inodoro: 8, lavabo: 10, tele: 14, "sofá": 10, mesita: 8, cama: 8, closet: 24, "buró": 8, repisa: 12, escritorio: 11, librero: 22 };
function proy(x, y, z = 0) { const f = 1 + z * Q; return [CX + (x - CX) * ESC * f, OY + (y - CY) * ESC * K * f - z * ESC]; }
function poli(pts, relleno, borde) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.fillStyle = relleno; ctx.fill();
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
}
const rectProy = (x, y, w, h, z = 0) => [proy(x, y, z), proy(x + w, y, z), proy(x + w, y + h, z), proy(x, y + h, z)];
// Caja con alto: cara de enfrente (sur), la lateral que mira al centro y la tapa
function caja3d(b, alto, top, frente, lado) {
  const B = rectProy(b.x, b.y, b.w, b.h), T = rectProy(b.x, b.y, b.w, b.h, alto), borde = "rgba(0,0,0,.35)";
  poli([B[3], B[2], T[2], T[3]], frente, borde);
  if (b.x > CX) poli([B[0], B[3], T[3], T[0]], lado, borde);
  else if (b.x + b.w < CX) poli([B[1], B[2], T[2], T[1]], lado, borde);
  poli(T, top, borde);
}
function mueble3d(b, alto) {
  caja3d(b, alto, "#a06a3a", "#6e4522", "#5a3718");
  ctx.font = "8px system-ui, sans-serif";
  if (b.w >= 24 && b.h >= 12 && ctx.measureText(b.t).width <= b.w * ESC - 4) { const [x, y] = proy(b.x + b.w / 2, b.y + b.h / 2, alto); ctx.fillStyle = "rgba(255,240,210,.8)"; ctx.textAlign = "center"; ctx.fillText(b.t, x, y + 3); }
}
function dibujarSuelo() {
  const P = ESCENAS[piso];
  for (const c of P.cuartos) {
    poli(rectProy(c.x, c.y, c.w, c.h), c.color);
    ctx.strokeStyle = "rgba(0,0,0,.07)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = c.x; x < c.x + c.w; x += 20) { const [x1, y1] = proy(x, c.y), [x2, y2] = proy(x, c.y + c.h); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
    ctx.stroke();
  }
  if (piso === 0) { // umbral de acero del búnker (franjas amarillas y negras)
    const P = PUERTA_BUNKER;
    poli(rectProy(P.x - 3, P.y, P.w + 6, P.h), "#2b2d33");
    for (let y = P.y + 2; y < P.y + P.h - 4; y += 10) poli(rectProy(P.x - 2, y, P.w + 4, 5), "#ffd23c");
  }
  if (piso === 1) escaleraHueco(); // arriba la escalera es un hueco por donde se baja; abajo se dibuja en dibujarEscena
}
// ----- Escalera -----
// Abajo (piso 0): peldaños que suben hacia el norte (cada uno más alto que el anterior), con zancas y pasamanos a los lados.
// Arriba (piso 1): un hueco oscuro con peldaños que bajan y barandales a los lados. Ocupa el rectángulo ESCALERA de logica-dos.js (la lógica no cambia).
const N_PELDANOS = 7, SUBE = 3.4, ALTURA_ESCALERA = N_PELDANOS * SUBE;
function linea(p, q, col, ancho) { ctx.strokeStyle = col; ctx.lineWidth = ancho; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
function escaleraHueco() {
  const E = ESCALERA, d = E.h / N_PELDANOS, yF = E.y + E.h;
  poli(rectProy(E.x, E.y, E.w, E.h), "#1b1009", "#3a2210");
  for (let i = 0; i < N_PELDANOS; i++) { // cada peldaño queda más abajo y más oscuro que el anterior
    const z = -(i + 1) * 0.9, yb = yF - (i + 1) * d;
    poli(rectProy(E.x + 3, yb, E.w - 6, d - 0.6, z), "hsl(30,38%," + (50 - i * 5.5) + "%)", "rgba(0,0,0,.45)");
    linea(proy(E.x + 3, yb + d - 0.6, z), proy(E.x + E.w - 3, yb + d - 0.6, z), "rgba(255,235,190," + (0.5 - i * 0.06) + ")", 1.5); // filo de cada peldaño
  }
}
function escaleraEscena() {
  const E = piso === PISO_REFUGIO ? ESCALERA_REFUGIO : ESCALERA, d = E.h / N_PELDANOS, yF = E.y + E.h, xi = E.x, xd = E.x + E.w;
  if (piso === 1) { // barandales a los lados del hueco
    caja3d({ x: xi - 4, y: E.y, w: 4, h: E.h }, 12, "#8a5a2c", "#5a3718", "#3e2410");
    caja3d({ x: xd, y: E.y, w: 4, h: E.h }, 12, "#8a5a2c", "#5a3718", "#3e2410");
    return;
  }
  // peldaños: del más alto (al fondo) al más bajo (al frente), para que cada uno tape lo que va detrás
  for (let i = N_PELDANOS - 1; i >= 0; i--) {
    const yf = yF - i * d, yb = yf - d, z0 = i * SUBE, z1 = (i + 1) * SUBE;
    poli([proy(xi, yf, z0), proy(xd, yf, z0), proy(xd, yf, z1), proy(xi, yf, z1)], "#6b4423", "rgba(0,0,0,.5)");   // contrahuella (frente)
    poli(rectProy(xi, yb, E.w, d, z1), "hsl(32,46%," + (50 + i * 2.2) + "%)", "#5c3512");                          // huella (donde se pisa)
    linea(proy(xi, yf, z1), proy(xd, yf, z1), "rgba(255,240,205,.65)", 1.5);                                       // filo
  }
  // zanca izquierda (la que mira al centro) y cara superior de la derecha
  poli([proy(xi, yF, 0), proy(xi, E.y, 0), proy(xi, E.y, ALTURA_ESCALERA), proy(xi, yF, SUBE)], "#5a3718", "#2e1b0a");
  poli([proy(xd, yF, SUBE), proy(xd + 4, yF, SUBE), proy(xd + 4, E.y, ALTURA_ESCALERA), proy(xd, E.y, ALTURA_ESCALERA)], "#7a4e26", "#2e1b0a");
  // pasamanos con postes (siguen la pendiente)
  for (const x of [xi + 2, xd - 2]) {
    const alto = 7;
    linea(proy(x, yF - 1, SUBE + alto), proy(x, E.y + 1, ALTURA_ESCALERA + alto), "#3b2210", 3);
    for (const t of [0, 0.5, 1]) {
      const y = yF - 1 + (E.y + 1 - (yF - 1)) * t, z = SUBE + (ALTURA_ESCALERA - SUBE) * t;
      linea(proy(x, y, z), proy(x, y, z + alto), "#3b2210", 2);
    }
  }
}
function rotuloEscalera() { // letrero pequeño frente a la escalera
  const E = ESCALERA, [x, y] = proy(E.x + E.w / 2, E.y + E.h + 9), t = piso === 0 ? "▲ Subir" : "▼ Bajar";
  ctx.font = "bold 10px system-ui, sans-serif"; ctx.textAlign = "center";
  const w = ctx.measureText(t).width + 12;
  ctx.fillStyle = "rgba(30,20,10,.75)"; ctx.fillRect(x - w / 2, y - 9, w, 15);
  ctx.fillStyle = "#fff"; ctx.fillText(t, x, y + 2);
}
function dibujarRotulos() {
  if (piso !== PISO_REFUGIO) rotuloEscalera();
  ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "left";
  for (const c of ESCENAS[piso].cuartos) {
    const esEsc = c.id === "rec1";                       // su rótulo va abajo para no quedar bajo la escalera
    const [dx, dy] = c.rot || (esEsc ? [8, c.h - 12] : [8, 17]), [lx, ly] = proy(c.x + dx, c.y + dy);
    ctx.font = c.id === "bunker" ? "bold 16px system-ui, sans-serif" : "bold 11px system-ui, sans-serif";
    ctx.fillStyle = c.id === "bunker" ? "rgba(20,20,20,.75)" : "rgba(60,35,15,.55)";
    ctx.fillText(c.nombre, lx, ly);
  }
}
function dibujarItem(it, resaltado, conBase) {
  const [x, y] = proy(it.x, it.y);
  if (conBase) {
    const r = (13 + (resaltado ? Math.sin(ojo * 8) * 1.5 : 0)) * ESC;
    ctx.fillStyle = resaltado ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(x, y, r, r * K, 0, 0, 7); ctx.fill();
  }
  icono(ctx, it.tipo, x, y - 5, 10 * ESC);
}
function dibujarJugador(sombra = true) {
  const [px, py] = proy(jx, jy);
  ctx.save(); ctx.translate(px, py); ctx.scale(ESC, ESC);
  if (sombra) { ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 3, 9, 4, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#3d6fd6"; ctx.beginPath(); ctx.arc(0, -2, RADIO - 1, 0, 7); ctx.fill(); ctx.strokeStyle = "#1c3a82"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#f2c9a0"; ctx.beginPath(); ctx.arc(0, -10, 6.5, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#111"; ctx.fillRect(hacia * 2.5 - 1, -11, 2, 2); ctx.fillRect(hacia * 2.5 - 5 * hacia - 1, -11, 2, 2);
  ctx.restore();
}
// ----- Refugio: estantes, mesa y objetos sobre ellos -----
const S_SOBRE = 8.6;   // tamaño del icono sobre las tablas y la mesa
function centroItem(it) { // dónde se ve el centro del icono de un objeto (para tocarlo y resaltarlo)
  const [x, y] = proy(it.x, it.y, it.z || 0);
  return it.ranura != null ? [x, y - 7] : [x, y - 5];
}
function dibujarItemSobre(it, resaltado) {
  const [x, y] = centroItem(it);
  if (resaltado) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(x, y, 10.5 + Math.sin(ojo * 8), 0, 7); ctx.fill(); }
  icono(ctx, it.tipo, x, y, S_SOBRE, it.carga);
}
const enZona = (it, zona, e) => { const s = it.piso === PISO_REFUGIO ? RANURAS[it.ranura] : null; return !!s && s.zona === zona && (e === undefined || s.e === e); };
function dibujarEstante(e, cerca) {
  const r = rectEstante(e), A = ESTANTES, borde = "rgba(0,0,0,.4)", f = r.y + r.h;
  poli([proy(r.x, r.y, 0), proy(r.x + r.w, r.y, 0), proy(r.x + r.w, r.y, ALTO_ESTANTE), proy(r.x, r.y, ALTO_ESTANTE)], "#4a2d14", borde);   // fondo
  caja3d({ x: r.x - 3, y: r.y, w: 5, h: r.h }, ALTO_ESTANTE, "#8a5a2c", "#6e4522", "#5a3718");                                          // postes
  caja3d({ x: r.x + r.w - 2, y: r.y, w: 5, h: r.h }, ALTO_ESTANTE, "#8a5a2c", "#6e4522", "#5a3718");
  for (let t = 0; t < A.tablas; t++) {                                                                                                  // tablas
    const z = A.z0 + t * A.dz;
    poli(rectProy(r.x, r.y, r.w, r.h, z), "#b98550", borde);
    poli([proy(r.x, f, z), proy(r.x + r.w, f, z), proy(r.x + r.w, f, z - 3), proy(r.x, f, z - 3)], "#7a4e26", borde);                   // canto
  }
  for (const it of items) if (enZona(it, "estante", e)) dibujarItemSobre(it, it === cerca);                                              // objetos (encima de todo)
}
function dibujarMesa(cerca) {
  const M = MESA;
  caja3d(M, M.z, "#b07b44", "#7a4e26", "#5a3718");
  const [lx, ly] = proy(M.x + M.w / 2, M.y + M.h, M.z / 2);
  ctx.font = "7px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,240,210,.85)"; ctx.fillText("Mesa de ocio", lx, ly + 2.5);
  for (const it of items.filter((o) => enZona(o, "mesa")).sort((p, q) => p.y - q.y)) dibujarItemSobre(it, it === cerca);
}
// Fundido a negro mientras se baja: oscurece, a mitad se cambia de escena (armarRefugio) y aclara
function dibujarBajada() {
  const a = tran < T_CORTE ? tran / T_CORTE : tran < T_CORTE + 0.5 ? 1 : Math.max(0, 1 - (tran - T_CORTE - 0.5) / (T_BAJADA - T_CORTE - 0.5));
  ctx.fillStyle = "rgba(10,8,6," + a + ")"; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = Math.min(1, a * 1.4); ctx.fillStyle = "#fff"; ctx.textAlign = "center";
  ctx.font = "700 34px 'Segoe Script','Bradley Hand','Lucida Handwriting','Brush Script MT','Comic Sans MS',cursive";
  ctx.fillText("Bajas al refugio…", W / 2, H / 2);
  ctx.globalAlpha = 1;
}
// ----- Contorno rojo parpadeante del búnker -----
// Un trazo rojo sobre el borde de sus paredes, para que se vea de lejos cuál es. Parpadea (prende y apaga); con «reducir movimiento» queda fijo.
const SIN_MOVIMIENTO = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function brilloBunker() { return SIN_MOVIMIENTO || modo !== "juego" || pausado ? 1 : (ojo % 0.9) < 0.55 ? 1 : 0.1; }
function ladoBunker(x1, y1, x2, y2) {
  const [ax, ay] = proy(x1, y1, ALTO_PARED), [bx, by] = proy(x2, y2, ALTO_PARED);
  ctx.save();
  ctx.globalAlpha = brilloBunker(); ctx.lineCap = "round";
  ctx.shadowColor = "#ff2a1a"; ctx.shadowBlur = 14;
  ctx.strokeStyle = "#ff2a1a"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.restore();
}
// Paredes, muebles, objetos y jugador van ordenados de atrás hacia delante (por su borde sur).
function dibujarEscena(cerca) {
  const P = ESCENAS[piso], lista = [];
  for (const b of P.paredes) lista.push({ y: b.y + b.h, f: () => caja3d(b, ALTO_PARED, "#8a6a4c", "#4b3626", "#3b2a1c") });
  for (const b of P.muebles) lista.push({ y: b.y + b.h, f: () => mueble3d(b, ALTO_MUEBLE[b.t] || 12) });
  const enRefugio = piso === PISO_REFUGIO;   // allí los objetos los dibujan los estantes y la mesa
  if (!enRefugio) for (const it of items) if (it.piso === piso) lista.push({ y: it.y, f: () => dibujarItem(it, it === cerca, true) });
  const EE = enRefugio ? ESCALERA_REFUGIO : ESCALERA;
  lista.push({ y: EE.y + EE.h, f: escaleraEscena });
  if (enRefugio) {
    for (let e = 0; e < ESTANTES.n; e++) { const r = rectEstante(e); lista.push({ y: r.y + r.h, f: () => dibujarEstante(e, cerca) }); }
    lista.push({ y: MESA.y + MESA.h, f: () => dibujarMesa(cerca) });
  }
  if (piso === 0) { // los 4 lados del contorno van ordenados como las paredes sobre las que están
    const B = BUNKER, x2 = B.x + B.w, y2 = B.y + B.h;
    lista.push({ y: B.y + 4.5, f: () => ladoBunker(B.x, B.y, x2, B.y) });
    lista.push({ y: y2 - 3.5, f: () => { ladoBunker(x2, B.y, x2, y2); ladoBunker(B.x, B.y, B.x, y2); } });
    lista.push({ y: y2 + 4.5, f: () => ladoBunker(B.x, y2, x2, y2) });
  }
  lista.push({ y: jy, f: () => dibujarJugador() });
  lista.sort((p, q) => p.y - q.y);
  for (const o of lista) o.f();
  dibujarRotulos();
  // «Rayos X»: si una pared o un mueble tapó un objeto o al jugador, se ve su silueta fantasma encima
  ctx.globalAlpha = 0.4;
  if (!enRefugio) for (const it of items) if (it.piso === piso) dibujarItem(it, false, false);
  dibujarJugador(false);
  ctx.globalAlpha = 1;
}
function dibujar() {
  ctx.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H); // transparente: se ve la madera
  if (modo === "menu") return;
  dibujarSuelo();
  const cerca = modo === "juego" || modo === "refugio" ? cercano() : null;
  dibujarEscena(cerca);
  if (cerca) { const [lx, ly] = proy(cerca.x, cerca.y, cerca.z || 0); ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center"; const t = TIPOS[cerca.tipo].nombre; const w = ctx.measureText(t).width + 12; ctx.fillStyle = "rgba(20,20,24,.85)"; ctx.fillRect(lx - w / 2, ly - 36, w, 18); ctx.fillStyle = "#fff"; ctx.fillText(t, lx, ly - 23); }
  if (joy) {
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 30, 0, 7); ctx.stroke();
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy, d = Math.min(30, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * d, joy.oy + Math.sin(a) * d, 14, 0, 7); ctx.fill();
  }
  if ((modo === "juego" || modo === "refugio") && avisoT > 0) {
    ctx.globalAlpha = Math.min(1, avisoT); ctx.font = "bold 15px system-ui, sans-serif"; ctx.textAlign = "center";
    const w = ctx.measureText(aviso).width + 20; ctx.fillStyle = "rgba(20,20,24,.85)"; ctx.fillRect(W / 2 - w / 2, 14, w, 26); ctx.fillStyle = "#fff"; ctx.fillText(aviso, W / 2, 32); ctx.globalAlpha = 1;
  }
  if (modo === "juego" && tiempo > 0 && tiempo <= 10) { // cuenta regresiva grande
    ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(ojo * 6)); ctx.fillStyle = "#d6291a"; ctx.font = "bold 120px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText(Math.ceil(tiempo), W / 2, H / 2 + 40); ctx.globalAlpha = 1;
  }
  if (modo === "bajando") dibujarBajada();
}

let previo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
  if (activo()) actualizar(dt); else if (modo === "bajando") bajando(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
armarMenu();
requestAnimationFrame(bucle);
