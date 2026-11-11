// Ruta: saltanubes/juego-saltanubes.js
// Sube saltando de plataforma en plataforma (arriba a la izquierda o a la derecha). Hay TIERRA (te sostiene) y NUBES (las atraviesas y te caes).
// Siempre existe un camino de tierra hacia arriba (generador-saltanubes.js). Monedas de 1 (y de 10 cada 100 saltos), cohete de la tienda
// (+20 filas sin esfuerzo) y monstruos que van y vienen por su fila: pasa cuando se alejan.
// Controles: toca la mitad izquierda / derecha de la pantalla, o ← → (A / D).

import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMundo, vecino, posX, monX } from "./generador-saltanubes.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID_JUEGO = "saltanubes", CLAVE = "saltanubes-progreso", CLAVE_AJ = "saltanubes-ajustes";
const PRECIO_COHETE = 60;   // monedas que cuesta el cohete en la tienda
const SUBE_COHETE = 20;     // filas que sube al tomarlo
const T_SALTO = 0.17;       // segundos que dura un salto
const RADIO_MON = 0.45;     // distancia (en anchos de plataforma) a la que un monstruo te toca
const PUNTOS_POR_MONEDA = 5; // puntos al perfil = altura + monedas de la partida × esto
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, f) => a + (b - a) * f;
const MONEDA = '<span class="moneda" aria-hidden="true"></span>';

// ----- Progreso (local primero; se sincroniza con la cuenta al haber sesión) -----
// Las monedas se gastan, así que gana la copia más reciente (t), con unirRecientes. Limitación: dos aparatos sin conexión a la vez no se suman.
let prog = { t: 0, monedas: 0, mejor: 0, cohete: false };
try { Object.assign(prog, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
const limpiar = () => { prog.monedas = Math.max(0, Math.floor(Number(prog.monedas)) || 0); prog.mejor = Math.max(0, Math.floor(Number(prog.mejor)) || 0); prog.cohete = !!prog.cohete; prog.t = Number(prog.t) || 0; };
limpiar();
let nube = null;
const guardar = () => { prog.t = Date.now(); try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };
let aj = { sonido: true, vibrar: true }; // ajustes: solo en este aparato
try { Object.assign(aj, JSON.parse(localStorage.getItem(CLAVE_AJ) || "{}")); } catch (e) {}
const guardarAj = () => { try { localStorage.setItem(CLAVE_AJ, JSON.stringify(aj)); } catch (e) {} };

// ----- Sonido y vibración -----
let ac = null;
function bip(f, d = 0.1, tipo = "square", v = 0.05, f2) {
  if (!aj.sonido) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(t + d);
  } catch (e) {}
}
const vibra = (p) => { if (aj.vibrar && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

let tMsg = 0;
function aviso(t) { const m = $("msg"); m.textContent = t; m.classList.add("ver"); clearTimeout(tMsg); tMsg = setTimeout(() => m.classList.remove("ver"), 1800); }

// ----- Partida -----
let mundo = null, J = null, run = null, camR = 0, T = 0, pausado = false, nuevoRecord = false;

function jugar() {
  mundo = crearMundo((Math.random() * 2147483647) | 0, { cohete: prog.cohete });
  const i = mundo.camino(0);
  J = { r: 0, i, wx: posX(0, i), wr: 0, est: "quieto", t: 0, d: 0, buf: 0, inv: 0, vy: 0, dir: 1, x0: 0, r0: 0, r1: 0, i1: 0, x1: 0 };
  run = { alt: 0, mon: 0, cerrada: false };
  camR = 0; T = 0; pausado = false;
  mostrar("juego");
  pintarHud();
}

function saltar(d) {
  if (!J) return;
  if (J.est === "salto" || J.est === "cohete") { J.buf = d; return; } // se recuerda el toque para al aterrizar
  if (J.est !== "quieto") return;
  const j = vecino(J.r, J.i, d);
  if (j < 0) { bip(160, 0.06); return; } // no hay plataforma en esa dirección (orilla)
  J.dir = d;
  Object.assign(J, { est: "salto", t: 0, d: T_SALTO, x0: posX(J.r, J.i), r0: J.r, r1: J.r + 1, i1: j, x1: posX(J.r + 1, j), buf: 0 });
  bip(520, 0.08, "square", 0.04, 780);
}

function iniciarCohete() {
  const rr = J.r + SUBE_COHETE, j = mundo.camino(rr); // aterriza en el camino de tierra
  Object.assign(J, { est: "cohete", t: 0, d: 1.7, x0: J.wx, r0: J.r, r1: rr, i1: j, x1: posX(rr, j), buf: 0 });
  bip(180, 1.5, "sawtooth", 0.05, 900);
  vibra(150);
}

function monstruoToca() {
  if (T < J.inv) return false;
  const f = mundo.fila(J.r);
  return !!f.mon && Math.abs(monX(f.mon, T) - posX(J.r, J.i)) < RADIO_MON;
}
function morir() {
  J.est = "muerto"; J.t = 0;
  bip(130, 0.5, "sawtooth", 0.07, 45); vibra([80, 40, 80]);
}

function recoger(f) {
  const v = f.c[J.i];
  if (v) {
    f.c[J.i] = 0; prog.monedas += v; run.mon += v; guardar(); pintarHud();
    bip(v === 10 ? 1046 : 880, 0.12, "triangle", 0.06, v === 10 ? 1568 : 1320);
  }
  if (f.obj && f.obj.i === J.i && prog.cohete) { f.obj = null; iniciarCohete(); }
}

function aterrizar() {
  const vieneDeCohete = J.est === "cohete";
  J.r = J.r1; J.i = J.i1; J.wx = posX(J.r, J.i); J.wr = J.r; J.est = "quieto";
  const f = mundo.fila(J.r);
  if (!f.t[J.i]) { J.est = "cayendo"; J.t = 0; J.vy = 0; bip(320, 0.6, "sine", 0.07, 70); vibra(60); return; } // ¡era una nube!
  if (vieneDeCohete) J.inv = T + 1;
  if (J.r > run.alt) { run.alt = J.r; pintarHud(); }
  if (!vieneDeCohete) bip(420 + (J.r % 5) * 25, 0.06, "triangle", 0.05);
  recoger(f);
  if (J.est === "quieto" && monstruoToca()) morir();
}

function actualizar(dt) {
  T += dt;
  if (J.est === "salto" || J.est === "cohete") {
    J.t += dt;
    const f = Math.min(1, J.t / J.d);
    if (J.est === "salto") { J.wx = lerp(J.x0, J.x1, f); J.wr = lerp(J.r0, J.r1, f) + Math.sin(f * Math.PI) * 0.35; }
    else { const e = f * f * (3 - 2 * f); J.wx = lerp(J.x0, J.x1, e) + Math.sin(f * Math.PI * 3) * 0.25 * (1 - f); J.wr = lerp(J.r0, J.r1, e); }
    if (f >= 1) aterrizar();
  } else if (J.est === "cayendo") {
    J.t += dt; J.vy += dt * 26; J.wr -= J.vy * dt;
    if (J.t > 0.9) terminar("¡Te caíste por la nube!");
  } else if (J.est === "muerto") {
    J.t += dt;
    if (J.t > 0.7) terminar("¡Te atrapó un monstruo!");
  } else if (J.est === "quieto") {
    if (monstruoToca()) morir();
    else if (J.buf) saltar(J.buf);
  }
  if (J.est !== "cayendo" && J.est !== "muerto") camR += (J.wr - camR) * Math.min(1, dt * 7);
}

// Cierra la partida: guarda el récord y anota los puntos del perfil (una sola vez)
function cerrarRun() {
  if (!run || run.cerrada) return;
  run.cerrada = true;
  nuevoRecord = run.alt > prog.mejor;
  if (nuevoRecord) prog.mejor = run.alt;
  guardar();
  const pts = run.alt + run.mon * PUNTOS_POR_MONEDA;
  if (pts > 0) {
    encolarPuntos(ID_JUEGO, pts);
    import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
  }
}
function terminar(titulo) {
  if (pantalla !== "juego") return;
  cerrarRun();
  $("f-titulo").textContent = titulo;
  $("f-texto").innerHTML = "Altura: <b>" + run.alt + "</b> · Monedas: <b>" + run.mon + "</b><br>" +
    (nuevoRecord ? "🏆 ¡Nuevo récord!" : "Mejor altura: <b>" + prog.mejor + "</b>");
  mostrar("fin");
}

// ----- Dibujo -----
const cv = $("lienzo"), ctx = cv.getContext("2d");
let cw = 300, ch = 300, dpr = 1;
function redim() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cw = r.width; ch = r.height;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
function rr(x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };

function plataforma(x, y, pw, tierra) {
  const w = pw * 0.84, h = pw * 0.3, top = y - pw * 0.1;
  if (tierra) {
    rr(x - w / 2, top, w, h, h * 0.35); ctx.fillStyle = "#8b5a2b"; ctx.fill();
    rr(x - w / 2, top, w, h * 0.42, h * 0.25); ctx.fillStyle = "#5fc34a"; ctx.fill();
  } else { // nube: se ve esponjosa porque no te sostiene
    ctx.save();
    ctx.shadowColor = "rgba(60,120,180,.45)"; ctx.shadowBlur = 6; ctx.fillStyle = "rgba(255,255,255,.96)";
    circ(x - w * 0.25, top + h * 0.45, h * 0.55); ctx.fill();
    circ(x, top + h * 0.25, h * 0.7); ctx.fill();
    circ(x + w * 0.25, top + h * 0.45, h * 0.55); ctx.fill();
    rr(x - w / 2, top + h * 0.35, w, h * 0.6, h * 0.3); ctx.fill();
    ctx.restore();
  }
}
function monedaDib(x, y, pw, v) {
  const r = pw * (v === 10 ? 0.2 : 0.14);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, "#fff7b8"); g.addColorStop(0.6, "#ffc928"); g.addColorStop(1, "#d59100");
  circ(x, y, r); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.18); ctx.strokeStyle = "#a86a00"; ctx.stroke();
  ctx.fillStyle = "#a86a00"; ctx.font = "bold " + Math.round(r * (v === 10 ? 1 : 1.15)) + "px system-ui,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(v === 10 ? "10" : "$", x, y + r * 0.05);
}
function monstruoDib(x, y, pw) {
  const R = pw * 0.26, b = Math.sin(T * 8) * pw * 0.02;
  ctx.fillStyle = "#6c3483";
  for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(x + k * R * 0.55 - R * 0.22, y - R * 0.75 + b); ctx.lineTo(x + k * R * 0.55, y - R * 1.3 + b); ctx.lineTo(x + k * R * 0.55 + R * 0.22, y - R * 0.75 + b); ctx.fill(); }
  circ(x, y + b, R); ctx.fillStyle = "#9b59b6"; ctx.fill();
  ctx.lineWidth = Math.max(1, R * 0.12); ctx.strokeStyle = "#5b2c6f"; ctx.stroke();
  for (const k of [-1, 1]) { circ(x + k * R * 0.38, y - R * 0.12 + b, R * 0.26); ctx.fillStyle = "#fff"; ctx.fill(); circ(x + k * R * 0.38, y - R * 0.08 + b, R * 0.12); ctx.fillStyle = "#c0392b"; ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(x - R * 0.45, y + R * 0.38 + b); ctx.lineTo(x + R * 0.45, y + R * 0.38 + b);
  ctx.lineWidth = Math.max(1, R * 0.14); ctx.strokeStyle = "#3b1747"; ctx.stroke();
}
function jugadorDib(x, y, pw) {
  const R = pw * 0.22;
  ctx.save();
  ctx.translate(x, y);
  if (J.est === "muerto") { ctx.globalAlpha = Math.max(0, 1 - J.t / 0.7); ctx.scale(1 + J.t, Math.max(0.1, 1 - J.t * 1.2)); }
  else if (J.est === "salto") ctx.scale(0.9, 1.15);
  if (J.est === "cohete") { // cohete bajo el personaje, con llama
    const fl = 0.8 + Math.sin(T * 40) * 0.2;
    ctx.fillStyle = "#ffb020"; ctx.beginPath(); ctx.moveTo(-R * 0.5, R * 0.9); ctx.lineTo(0, R * (1.6 + fl)); ctx.lineTo(R * 0.5, R * 0.9); ctx.fill();
    rr(-R * 0.65, -R * 0.2, R * 1.3, R * 1.2, R * 0.4); ctx.fillStyle = "#eceff4"; ctx.fill();
    ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.moveTo(-R * 0.65, R * 0.9); ctx.lineTo(-R * 1.05, R * 1.25); ctx.lineTo(-R * 0.4, R * 1.0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * 0.65, R * 0.9); ctx.lineTo(R * 1.05, R * 1.25); ctx.lineTo(R * 0.4, R * 1.0); ctx.fill();
  }
  circ(0, 0, R); ctx.fillStyle = "#ff7a59"; ctx.fill();
  ctx.lineWidth = Math.max(1, R * 0.14); ctx.strokeStyle = "#b8452a"; ctx.stroke();
  for (const k of [-1, 1]) { circ(k * R * 0.38, -R * 0.15, R * 0.27); ctx.fillStyle = "#fff"; ctx.fill(); circ(k * R * 0.38 + J.dir * R * 0.08, -R * 0.12, R * 0.12); ctx.fillStyle = "#222"; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, R * 0.2, R * 0.3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.lineWidth = Math.max(1, R * 0.12); ctx.strokeStyle = "#7a2410"; ctx.stroke();
  ctx.restore();
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch); // transparente: detrás se ve la madera
  if (!run || (pantalla !== "juego" && pantalla !== "fin")) return;
  const gw = Math.min(cw - 16, 520, ch * 0.8), x0 = (cw - gw) / 2, pw = gw / 5, rh = pw * 0.95, baseY = ch * 0.68;
  const xS = (x) => x0 + x * pw, yS = (r) => baseY - (r - camR) * rh;
  ctx.save();
  rr(x0, 6, gw, ch - 12, 18); ctx.clip();
  // cielo: de azul claro a noche conforme subes
  const h = 205 + clamp(camR * 0.05, 0, 70), l = clamp(78 - camR * 0.05, 14, 78);
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, "hsl(" + h + ",65%," + l + "%)"); g.addColorStop(1, "hsl(" + h + ",65%," + Math.min(92, l + 14) + "%)");
  ctx.fillStyle = g; ctx.fillRect(x0, 0, gw, ch);
  const r0 = Math.max(0, Math.floor(camR - (ch - baseY) / rh) - 1), r1 = Math.ceil(camR + baseY / rh) + 1;
  for (let r = r0; r <= r1; r++) {
    const f = mundo.fila(r), y = yS(r);
    for (let i = 0; i < f.t.length; i++) {
      const x = xS(posX(r, i));
      plataforma(x, y, pw, f.t[i]);
      if (f.c[i]) monedaDib(x, y - pw * 0.5 + Math.sin(T * 4 + i) * pw * 0.03, pw, f.c[i]);
      if (f.obj && f.obj.i === i) { ctx.font = Math.round(pw * 0.4) + "px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🚀", x, y - pw * 0.42); }
    }
    if (f.mon) monstruoDib(xS(monX(f.mon, T)), y - pw * 0.3, pw);
  }
  jugadorDib(xS(J.wx), yS(J.wr) - pw * 0.3, pw);
  ctx.restore();
  rr(x0, 6, gw, ch - 12, 18); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke();
}

// ----- Pantallas, menú, tienda y ajustes -----
let pantalla = "menu";
const PANTALLAS = ["menu", "tienda", "ajustes", "fin"];
const btnMenu = $("btn-menu");
function mostrar(p) {
  pantalla = p;
  for (const id of PANTALLAS) $("p-" + id).hidden = id !== p;
  $("hud").hidden = !(p === "juego" || p === "fin");
  botonMenu();
  if (p === "menu") pintarMenu();
  if (p === "tienda") pintarTienda();
  if (p === "ajustes") pintarAjustes();
}
// ☰ estándar: oculto en el menú principal; en partida dice «Pausa»; en tienda y ajustes vuelve al menú
function botonMenu() {
  btnMenu.hidden = pantalla === "menu" || pantalla === "fin";
  btnMenu.innerHTML = '<span class="b-ico">☰</span> ' + (pantalla === "juego" ? "Pausa" : "Menú principal");
  btnMenu.title = pantalla === "juego" ? "Pausa" : "Volver al menú principal";
}
const pintarHud = () => { $("alt").textContent = run ? run.alt : 0; $("mon").textContent = prog.monedas.toLocaleString("es-MX"); };
function pintarMenu() { $("m-mejor").textContent = prog.mejor; $("m-mon").textContent = prog.monedas.toLocaleString("es-MX"); }
function pintarTienda() {
  $("t-saldo").textContent = prog.monedas.toLocaleString("es-MX");
  const b = $("comprar-cohete");
  b.disabled = prog.cohete;
  b.innerHTML = prog.cohete ? '<span class="b-ico">✅</span><span>Comprado</span>' : "<span>Comprar · " + PRECIO_COHETE + "</span>" + MONEDA;
}
let borrando = 0;
function pintarAjustes() {
  $("a-sonido").innerHTML = '<span class="b-ico">' + (aj.sonido ? "🔊" : "🔇") + "</span><span>Sonido: " + (aj.sonido ? "sí" : "no") + "</span>";
  $("a-vibrar").innerHTML = '<span class="b-ico">📳</span><span>Vibración: ' + (aj.vibrar ? "sí" : "no") + "</span>";
  $("a-borrar").innerHTML = '<span class="b-ico">🗑️</span><span>' + (borrando ? "¿Seguro? Toca otra vez" : "Borrar mi progreso") + "</span>";
}

$("b-jugar").addEventListener("click", jugar);
$("b-tienda").addEventListener("click", () => mostrar("tienda"));
$("b-ajustes").addEventListener("click", () => mostrar("ajustes"));
$("t-volver").addEventListener("click", () => mostrar("menu"));
$("a-volver").addEventListener("click", () => mostrar("menu"));
$("f-otra").addEventListener("click", jugar);
$("f-menu").addEventListener("click", () => mostrar("menu"));
$("comprar-cohete").addEventListener("click", () => {
  if (prog.cohete) return;
  if (prog.monedas < PRECIO_COHETE) { aviso("Te faltan " + (PRECIO_COHETE - prog.monedas) + " monedas"); return; }
  prog.monedas -= PRECIO_COHETE; prog.cohete = true; guardar();
  bip(660, 0.25, "triangle", 0.06, 1320);
  pintarTienda();
  aviso("¡Cohete comprado! Aparecerá en el mapa");
});
$("a-sonido").addEventListener("click", () => { aj.sonido = !aj.sonido; guardarAj(); pintarAjustes(); bip(660, 0.1); });
$("a-vibrar").addEventListener("click", () => { aj.vibrar = !aj.vibrar; guardarAj(); pintarAjustes(); vibra(40); });
$("a-borrar").addEventListener("click", () => { // sin confirm(): se toca dos veces
  if (!borrando) { borrando = setTimeout(() => { borrando = 0; pintarAjustes(); }, 3000); pintarAjustes(); return; }
  clearTimeout(borrando); borrando = 0;
  prog = { t: 0, monedas: 0, mejor: 0, cohete: false }; guardar();
  pintarAjustes(); aviso("Progreso borrado");
});

// ----- Pausa estándar -----
const pausa = crearMenuPausa({
  puedeAbrir: () => pantalla === "juego" && !!J && J.est !== "cayendo" && J.est !== "muerto",
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; },
  textoSalir: "Salir al menú",
  ayudaSalir: "Se guardan tus monedas y tus puntos",
  alSalir: () => { pausado = false; cerrarRun(); mostrar("menu"); },
});
btnMenu.addEventListener("click", () => { if (pantalla === "juego") pausa.abrir(); else mostrar("menu"); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && pantalla === "juego") pausa.abrir(); });

// ----- Controles: mitad izquierda / derecha de la pantalla, o flechas -----
cv.addEventListener("pointerdown", (e) => {
  if (pantalla !== "juego" || pausado) return;
  const r = cv.getBoundingClientRect();
  saltar(e.clientX - r.left < r.width / 2 ? -1 : 1);
});
addEventListener("keydown", (e) => {
  if (e.repeat || pantalla !== "juego" || pausado) return;
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") saltar(-1);
  else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") saltar(1);
});
addEventListener("resize", redim);

// ----- Inicio y bucle -----
redim();
mostrar("menu");
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  if (pantalla === "juego" && !pausado && J) actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// ----- Sincronizar con la cuenta (al final, con try/catch: el juego funciona aunque Firebase no cargue) -----
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID_JUEGO, {
    clave: CLAVE,
    fusionar: m.unirRecientes,
    alCambiar: (v) => { Object.assign(prog, v); limpiar(); pintarMenu(); pintarHud(); if (pantalla === "tienda") pintarTienda(); },
  });
}).catch(() => {});
