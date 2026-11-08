// Ruta: fichas/juego-fichas.js
// «Fichas de frutas» (estilo Tile Match / Triple Tile): toca fichas libres, van a la bandeja y 3 iguales desaparecen.
// Los ajustes están justo debajo. Reglas y niveles: logica-fichas.js. Dibujos y fondos: piezas-fichas.js.
import { COLS, FILAS, RANURAS, NIVELES, generarNivel, libre, repartirTipos, mezclar } from "./logica-fichas.js";
import { ICONOS, crearSprites, cargarImagenesPropias, dibujarFondo, cargarFondosPropios } from "./piezas-fichas.js";
import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet

const ID = "fichas";

// ----- Ajustes -----
const W = 400, H = 720;                       // tamaño lógico del lienzo
const FW = 58, FH = 60, PROF = 6;             // ficha: ancho, alto de la cara y grosor
const BX = (W - COLS * FW) / 2, BY = 118;     // esquina del tablero
const TRAY = { x: 16, y: 14, w: W - 32, h: 70 };
const USOS = { deshacer: 2, varita: 2, mezclar: 2 }; // poderes por nivel
const MS_TRIO = 260;                          // ms que tarda en desaparecer un trío
const MS_PERDER = 500;                        // ms con la bandeja llena antes de perder
const PUNTOS_BASE = 50, PUNTOS_POR_NIVEL = 10; // puntos al perfil la primera vez que pasas un nivel

const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2);
lienzo.width = W * dpr;
lienzo.height = H * dpr;

// ----- Progreso: se guarda SIEMPRE en el dispositivo y se sincroniza con la cuenta cuando hay internet y sesión -----
const CLAVE = "fichas_progreso";
let nube = null; // se llena al cargar compartido/progreso.js (si no carga, el juego sigue igual)
let progreso = 1; // nivel más alto desbloqueado (NIVELES + 1 = todos pasados)
try { progreso = Math.max(1, Math.min(NIVELES + 1, parseInt(localStorage.getItem(CLAVE), 10) || 1)); } catch (e) {}
const guardarProgreso = () => { try { localStorage.setItem(CLAVE, String(progreso)); } catch (e) {} if (nube) nube.guardado(); };

// ----- Dibujos -----
const sprites = crearSprites(128);
cargarImagenesPropias(sprites);
const fondosPropios = [];
let fondoCv = null, fondoIdx = 0;
cargarFondosPropios((i, im) => { fondosPropios[i] = im; if (i === fondoIdx) armarFondo(); });

function armarFondo() {
  if (!fondoCv) { fondoCv = document.createElement("canvas"); fondoCv.width = W * dpr; fondoCv.height = H * dpr; }
  const c = fondoCv.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const im = fondosPropios[fondoIdx];
  if (im) {
    const k = Math.max(W / im.width, H / im.height);
    c.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
  } else dibujarFondo(c, W, H, fondoIdx);
}

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ----- Sonido (WebAudio, sin archivos) -----
let audio = null;
let sonidoOn = true;
try { sonidoOn = localStorage.getItem("fichas_sonido") !== "0"; } catch (e) {}
function ac() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (audio && audio.state === "suspended") audio.resume();
  return audio;
}
function tono(f, d = 0.12, tipo = "sine", vol = 0.12, t0 = 0, f2 = 0) {
  if (!sonidoOn) return;
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  const t = a.currentTime + t0;
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}
const SONIDOS = {
  pick: () => tono(520, 0.08, "triangle", 0.14, 0, 780),
  no: () => tono(160, 0.12, "square", 0.06),
  trio: () => [660, 830, 990, 1320].forEach((f, i) => tono(f, 0.16, "triangle", 0.13, i * 0.06)),
  magia: () => [880, 1170, 1480, 1760].forEach((f, i) => tono(f, 0.2, "sine", 0.1, i * 0.05)),
  mezcla: () => tono(300, 0.3, "sawtooth", 0.05, 0, 900),
  gana: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tono(f, 0.25, "triangle", 0.14, i * 0.1)),
  pierde: () => [392, 330, 262, 196].forEach((f, i) => tono(f, 0.28, "sawtooth", 0.08, i * 0.14)),
};
function pintarBotonSonido() { $("btnSon").textContent = sonidoOn ? "🔊" : "🔇"; }
$("btnSon").addEventListener("click", () => {
  sonidoOn = !sonidoOn;
  try { localStorage.setItem("fichas_sonido", sonidoOn ? "1" : "0"); } catch (e) {}
  pintarBotonSonido();
  if (sonidoOn) SONIDOS.pick();
});
pintarBotonSonido();

// ----- Estado -----
let nivel = 1, fichas = [], orden = [], iconos = [];
let bandeja = [], pila = [], parts = [];
let estado = "menu"; // menu | jugando | fin
let usos = { ...USOS };
let ahora = performance.now();
let finT = 0;

const SLOT_W = (TRAY.w - 16) / RANURAS;
const centroRanura = (i) => [TRAY.x + 8 + SLOT_W * (i + 0.5), TRAY.y + TRAY.h / 2 - 2];

function recalcular() {
  fichas.forEach((f) => { if (!f.quitada) f.libre = libre(fichas, f); });
}

function empezar(n) {
  nivel = n;
  const N = generarNivel(n);
  fichas = N.fichas;
  iconos = N.iconos;
  orden = [...fichas].sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  bandeja = [];
  pila = [];
  parts = [];
  usos = { ...USOS };
  finT = 0;
  fondoIdx = N.fondo;
  armarFondo();
  ahora = performance.now();
  fichas.forEach((f) => { f.quitada = false; f.ap = ahora + 80 + f.z * 140 + Math.random() * 120; });
  recalcular();
  estado = "jugando";
  $("nivelTxt").textContent = "Nivel " + n;
  $("menu").hidden = true;
  cerrarModal();
  actualizarBotones();
}

// ----- Dibujo de una ficha -----
function dibujarFicha(c, x, y, tipo, esLibre, s = 1, alfa = 1) {
  const w = FW * s, h = FH * s, p = PROF * s, r = 12 * s;
  c.save();
  c.globalAlpha = alfa;
  c.fillStyle = "rgba(0,0,0,.22)";
  rr(c, x + 1, y + p + 3, w, h, r); c.fill();
  c.fillStyle = esLibre ? "#a9b4c6" : "#667082";
  rr(c, x, y + p, w, h, r); c.fill();
  const g = c.createLinearGradient(x, y, x, y + h);
  if (esLibre) { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e1e8f2"); }
  else { g.addColorStop(0, "#9aa2b0"); g.addColorStop(1, "#858d9b"); }
  c.fillStyle = g;
  rr(c, x, y, w, h, r); c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = esLibre ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.22)";
  c.stroke();
  const im = sprites[iconos[tipo]];
  if (im) {
    const t = Math.min(w, h) * 0.78;
    const k = Math.min(t / im.width, t / im.height);
    const dw = im.width * k, dh = im.height * k;
    c.globalAlpha = alfa * (esLibre ? 1 : 0.5);
    c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  c.restore();
}

// ----- Partículas -----
function chispas(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, vida: 0.5 + Math.random() * 0.3, max: 0.8, col: color, r: 2 + Math.random() * 3 });
  }
}
const colorDe = (tipo) => ICONOS[iconos[tipo]].color;

// ----- Jugar -----
function elegir(f) {
  if (bandeja.length >= RANURAS) return;
  f.quitada = true;
  recalcular();
  const e = { f, tipo: f.tipo, x: BX + f.x * FW + FW / 2, y: BY + f.y * FH + FH / 2, s: 1, mu: 0 };
  let idx = -1;
  bandeja.forEach((b, i) => { if (b.tipo === f.tipo && !b.mu) idx = i; });
  if (idx >= 0) bandeja.splice(idx + 1, 0, e); else bandeja.push(e);
  pila.push(e);
  SONIDOS.pick();
  revisar();
}

function revisar() {
  const cuenta = {};
  bandeja.forEach((e) => { if (!e.mu) (cuenta[e.tipo] = cuenta[e.tipo] || []).push(e); });
  for (const t in cuenta) if (cuenta[t].length >= 3) cuenta[t].slice(0, 3).forEach((e) => { e.mu = performance.now(); });
}

function tocar(px, py) {
  if (estado !== "jugando") return;
  for (let i = orden.length - 1; i >= 0; i--) {
    const f = orden[i];
    if (f.quitada || ahora < f.ap) continue;
    const x = BX + f.x * FW, y = BY + f.y * FH;
    if (px >= x && px <= x + FW && py >= y && py <= y + FH + PROF) {
      if (f.libre) elegir(f); else SONIDOS.no();
      return;
    }
  }
}

function varita() {
  if (estado !== "jugando" || usos.varita <= 0) return;
  const enBand = {};
  bandeja.forEach((e) => { if (!e.mu) enBand[e.tipo] = (enBand[e.tipo] || 0) + 1; });
  let tipo = -1, mejor = 0;
  for (const t in enBand) if (enBand[t] > mejor) { mejor = enBand[t]; tipo = +t; }
  if (tipo < 0) {
    const lib = fichas.filter((f) => !f.quitada && f.libre);
    if (!lib.length) return;
    tipo = lib[Math.floor(Math.random() * lib.length)].tipo;
  }
  const faltan = 3 - (enBand[tipo] || 0);
  const cand = fichas.filter((f) => !f.quitada && f.tipo === tipo).sort((a, b) => (b.libre - a.libre) || (b.z - a.z));
  if (cand.length < faltan) return;
  cand.slice(0, faltan).forEach((f) => {
    f.quitada = true;
    chispas(BX + f.x * FW + FW / 2, BY + f.y * FH + FH / 2, colorDe(tipo), 10);
  });
  bandeja.forEach((e) => { if (e.tipo === tipo && !e.mu) e.mu = performance.now(); });
  usos.varita--;
  recalcular();
  SONIDOS.magia();
  actualizarBotones();
}

function mezclarTablero() {
  if (estado !== "jugando" || usos.mezclar <= 0) return;
  const vivas = fichas.filter((f) => !f.quitada);
  if (vivas.length < 2) return;
  const cuenta = {};
  vivas.forEach((f) => { cuenta[f.tipo] = (cuenta[f.tipo] || 0) + 1; });
  const enBand = {};
  bandeja.forEach((e) => { if (!e.mu) enBand[e.tipo] = (enBand[e.tipo] || 0) + 1; });
  // grupos de 3 que se retirarán en orden; primero los que completan lo que ya hay en la bandeja
  const previos = [], resto = [];
  let total = 0, ok = true;
  for (const t in cuenta) {
    let n = cuenta[t];
    const c = enBand[t] || 0;
    if (c > 0) {
      const falta = 3 - c;
      previos.push({ tipo: +t, n: falta });
      n -= falta; total += falta;
    }
    if (n < 0 || n % 3) { ok = false; break; }
    for (let k = 0; k < n / 3; k++) resto.push({ tipo: +t, n: 3 });
    total += n;
  }
  if (ok && total === vivas.length) {
    previos.sort((a, b) => a.n - b.n);
    repartirTipos(fichas, [...previos, ...mezclar(resto)]);
  } else {
    const tipos = vivas.map((f) => f.tipo);
    mezclar(tipos);
    vivas.forEach((f, i) => { f.tipo = tipos[i]; });
  }
  const t0 = performance.now();
  vivas.forEach((f) => { f.ap = t0 + Math.random() * 180; });
  usos.mezclar--;
  SONIDOS.mezcla();
  actualizarBotones();
}

function deshacer() {
  if (estado !== "jugando" || usos.deshacer <= 0) return;
  while (pila.length) {
    const e = pila.pop();
    const i = bandeja.indexOf(e);
    if (i >= 0 && !e.mu) {
      bandeja.splice(i, 1);
      e.f.quitada = false;
      e.f.ap = performance.now();
      recalcular();
      usos.deshacer--;
      SONIDOS.no();
      actualizarBotones();
      return;
    }
  }
}

// ----- Fin de nivel -----
function comprobarFin() {
  if (estado !== "jugando") return;
  const hayFichas = fichas.some((f) => !f.quitada);
  if (!hayFichas && bandeja.length === 0) { ganar(); return; }
  if (bandeja.length >= RANURAS && !bandeja.some((e) => e.mu)) {
    if (!finT) finT = ahora;
    else if (ahora - finT > MS_PERDER) perder();
  } else finT = 0;
}

function ganar() {
  estado = "fin";
  actualizarBotones();
  SONIDOS.gana();
  if (nivel === progreso) {
    const mio = nivel, pts = Math.min(1000, PUNTOS_BASE + PUNTOS_POR_NIVEL * mio);
    progreso = Math.min(progreso + 1, NIVELES + 1);
    guardarProgreso();
    // Los puntos se anotan en la cola local (nunca se pierden) y se envían al haber sesión y conexión.
    // El aviso solo sale cuando de verdad ya se enviaron.
    encolarPuntos(ID, pts);
    import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).then((faltan) => {
      if (faltan === 0 && estado === "fin" && nivel === mio && !$("modal").hidden) $("mTxt").textContent = "+" + pts + " puntos ✓";
    }).catch(() => {});
  }
  const botones = [];
  if (nivel < NIVELES) botones.push(["Siguiente nivel", () => empezar(nivel + 1)]);
  botones.push(["Repetir", () => empezar(nivel)], ["Niveles", abrirMenu]);
  modal("🎉 ¡Nivel completado!", "", botones);
}

function perder() {
  estado = "fin";
  actualizarBotones();
  SONIDOS.pierde();
  modal("😵 ¡Bandeja llena!", "Prueba de nuevo: usa los poderes para salir de apuros.", [["Reintentar", () => empezar(nivel)], ["Niveles", abrirMenu]]);
}

// ----- Ventanas -----
function modal(titulo, texto, botones) {
  $("mTit").textContent = titulo;
  $("mTxt").textContent = texto;
  const zona = $("mBot");
  zona.innerHTML = "";
  botones.forEach(([t, fn]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (zona.children.length === 0 ? "b-verde" : "b-azul");
    b.textContent = t;
    b.addEventListener("click", fn);
    zona.appendChild(b);
  });
  $("modal").hidden = false;
}
function cerrarModal() { $("modal").hidden = true; }

function abrirMenu() {
  cerrarModal();
  if (estado === "jugando") estado = "pausa";
  $("seguir").hidden = estado !== "pausa";
  $("continuar").textContent = "▶ Jugar nivel " + Math.min(progreso, NIVELES);
  const cont = $("niveles");
  cont.innerHTML = "";
  for (let n = 1; n <= NIVELES; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d chico " + (n < progreso ? "b-verde" : n === progreso ? "b-oro" : "b-gris");
    b.textContent = n;
    b.setAttribute("aria-label", "Nivel " + n + (n < progreso ? " (pasado)" : n > progreso ? " (bloqueado)" : ""));
    b.disabled = n > progreso;
    b.addEventListener("click", () => empezar(n));
    cont.appendChild(b);
  }
  $("menu").hidden = false;
  actualizarBotones();
}
$("btnMenu").addEventListener("click", abrirMenu);
$("continuar").addEventListener("click", () => empezar(Math.min(progreso, NIVELES)));
$("seguir").addEventListener("click", () => { $("menu").hidden = true; estado = "jugando"; actualizarBotones(); });

// ----- Botones de poderes -----
const BOTONES = [["pwDeshacer", "deshacer", deshacer], ["pwVarita", "varita", varita], ["pwMezclar", "mezclar", mezclarTablero]];
BOTONES.forEach(([id, , fn]) => $(id).addEventListener("click", () => { ac(); fn(); }));
function actualizarBotones() {
  BOTONES.forEach(([id, k]) => {
    const b = $(id);
    b.querySelector(".b-info").textContent = usos[k];
    b.disabled = usos[k] <= 0 || estado !== "jugando";
  });
}

// ----- Entrada -----
lienzo.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  ac();
  const r = lienzo.getBoundingClientRect();
  tocar(((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height);
});

// ----- Tamaño en pantalla -----
const marco = $("marco");
function ajustar() {
  marco.style.setProperty("--u", marco.clientWidth / W + "px");
}
window.addEventListener("resize", ajustar);
ajustar();

// ----- Bucle -----
function actualizar(dt) {
  const k = 1 - Math.exp(-dt * 16);
  bandeja.forEach((e, i) => {
    const [tx, ty] = centroRanura(i);
    e.x += (tx - e.x) * k;
    e.y += (ty - e.y) * k;
    e.s += (0.8 - e.s) * k;
  });
  let quitado = false;
  for (let i = bandeja.length - 1; i >= 0; i--) {
    const e = bandeja[i];
    if (e.mu && ahora - e.mu > MS_TRIO) {
      chispas(e.x, e.y, colorDe(e.tipo), 9);
      bandeja.splice(i, 1);
      quitado = true;
    }
  }
  if (quitado) SONIDOS.trio();
  parts = parts.filter((p) => {
    p.vida -= dt;
    if (p.vida <= 0) return false;
    p.vy += 700 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    return true;
  });
  comprobarFin();
}

const salida = (p) => 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2);

function pintar() {
  const c = ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (fondoCv) c.drawImage(fondoCv, 0, 0, W, H);
  // bandeja
  c.save();
  c.shadowColor = "rgba(0,0,0,.35)"; c.shadowBlur = 10; c.shadowOffsetY = 4;
  rr(c, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 18);
  c.fillStyle = "#3a3d45"; c.fill();
  c.restore();
  rr(c, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 18);
  c.lineWidth = 4; c.strokeStyle = "#c9ccd3"; c.stroke();
  for (let i = 0; i < RANURAS; i++) {
    const [cx, cy] = centroRanura(i);
    rr(c, cx - SLOT_W / 2 + 3, cy - 27, SLOT_W - 6, 54, 10);
    c.fillStyle = "rgba(10,10,12,.55)"; c.fill();
  }
  // tablero
  for (const f of orden) {
    if (f.quitada) continue;
    const p = Math.min(1, (ahora - f.ap) / 280);
    if (p <= 0) continue;
    const s = salida(p);
    dibujarFicha(c, BX + f.x * FW + (FW * (1 - s)) / 2, BY + f.y * FH + (FH * (1 - s)) / 2, f.tipo, f.libre, s);
  }
  // fichas en la bandeja
  for (const e of bandeja) {
    let s = e.s, alfa = 1;
    if (e.mu) {
      const p = Math.min(1, (ahora - e.mu) / MS_TRIO);
      c.fillStyle = "rgba(255,230,80," + (0.5 * Math.sin(p * Math.PI)).toFixed(2) + ")";
      rr(c, e.x - SLOT_W / 2 + 1, e.y - 29, SLOT_W - 2, 58, 12); c.fill();
      s = e.s * (1 + 0.3 * Math.sin(p * Math.PI));
      alfa = 1 - Math.max(0, (p - 0.6) / 0.4);
    }
    dibujarFicha(c, e.x - (FW * s) / 2, e.y - (FH * s) / 2 - (PROF * s) / 2, e.tipo, true, s, alfa);
  }
  // chispas
  for (const p of parts) {
    c.globalAlpha = Math.max(0, p.vida / p.max);
    c.fillStyle = p.col;
    c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
  }
  c.globalAlpha = 1;
}

let ultimo = 0;
function bucle(t) {
  requestAnimationFrame(bucle);
  ahora = performance.now();
  const dt = Math.min(0.05, (t - (ultimo || t)) / 1000);
  ultimo = t;
  actualizar(dt);
  pintar();
}

// ----- Inicio -----
fondoIdx = 0;
armarFondo();
requestAnimationFrame(bucle);
abrirMenu();

// ----- Sincronizar con la cuenta (al final, tras cargar el progreso local) -----
// El progreso es un solo número (nivel más alto desbloqueado): se queda con el mayor.
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => (a == null && b == null ? null : Math.max(1, Math.min(NIVELES + 1, Math.max(Number(a) || 1, Number(b) || 1)))),
    alCambiar: (v) => {
      progreso = Math.max(1, Math.min(NIVELES + 1, Number(v) || 1));
      if (!$("menu").hidden) abrirMenu(); // si el menú está abierto, repinta los niveles pasados
    },
  });
}).catch(() => {});
