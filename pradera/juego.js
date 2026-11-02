// Ruta: pradera/juego.js
import { NIVEL_1 } from "./niveles.js";
import { T, ALTO, nuevoJuego, paso } from "./logica.js";

// Los puntos del perfil se cargan aparte: si no hay conexión o falla Firebase, el juego igual funciona
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => { sumarPuntos = m.sumarPuntos; }).catch(() => {});

// ===== AJUSTES =====
const ID = "pradera";
const PUNTOS_POR_PERFIL = 25;   // al perfil se envía 1 punto por cada 25 del juego
const VISTA_MAX = 560;          // ancho máximo visible (unidades)
// ===================

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), x = cv.getContext("2d"), caja = $("caja");
let e, estado = "listo", esperar = 0, acum = 0, ult = 0;
let K = 2, VISTA = 320, cielo = null;
const ent = { izq: false, der: false, salto: false, correr: false, nuevo: false };
let record = +localStorage.getItem(ID + ":record") || 0;
let sonido = localStorage.getItem(ID + ":sonido") !== "0";

// ---------- Tamaño del lienzo (casillas siempre en píxeles enteros para que no se vean costuras) ----------
function ajustar() {
  const dpr = window.devicePixelRatio || 1;
  const horiz = innerWidth > innerHeight * 1.2;
  caja.classList.toggle("sobre", horiz);
  const aw = Math.min(document.documentElement.clientWidth - 8, 900);
  const ah = horiz ? innerHeight - 64 : Math.max(200, innerHeight - 64 - 150);
  K = Math.max(1, Math.floor(Math.min(ah / (ALTO * T), aw / 320) * dpr));
  const cs = K / dpr;
  VISTA = Math.min(VISTA_MAX, Math.floor(aw / cs));
  cv.width = VISTA * K; cv.height = ALTO * T * K;
  cv.style.width = VISTA * cs + "px"; cv.style.height = ALTO * T * cs + "px";
  x.imageSmoothingEnabled = false;
  cielo = null;
}
addEventListener("resize", ajustar);

// ---------- Sonido (generado, sin archivos) ----------
let ac = null;
function tono(f0, f1, dur, tipo = "square", vol = 0.05, retraso = 0) {
  if (!sonido) return;
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (er) { return; } }
  if (ac.state === "suspended") ac.resume();
  const t = ac.currentTime + retraso, o = ac.createOscillator(), g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const arpegio = (fs, dur, tipo, vol, sep) => fs.forEach((f, i) => tono(f, f, dur, tipo, vol, i * sep));
const SONIDOS = {
  salto: () => tono(330, 700, 0.16),
  moneda: () => { tono(988, 988, 0.07); tono(1319, 1319, 0.22, "square", 0.05, 0.07); },
  golpe: () => tono(130, 70, 0.1, "triangle", 0.09),
  romper: () => tono(260, 40, 0.22, "sawtooth", 0.05),
  aparece: () => tono(300, 900, 0.3, "triangle", 0.07),
  poder: () => arpegio([523, 659, 784, 1047], 0.1, "square", 0.05, 0.08),
  aplasta: () => tono(240, 100, 0.13),
  patada: () => tono(420, 180, 0.13, "sawtooth", 0.04),
  muerte: () => arpegio([392, 330, 262, 196], 0.2, "triangle", 0.08, 0.16),
  encoge: () => tono(650, 140, 0.3, "triangle", 0.07),
  mastil: () => tono(950, 180, 0.9, "triangle", 0.05),
  vida: () => arpegio([659, 784, 1319, 1047, 1319, 1568], 0.09, "square", 0.05, 0.07),
  gano: () => arpegio([523, 523, 523, 784, 659, 784, 1047], 0.16, "square", 0.05, 0.14),
};
$("bSonido").textContent = sonido ? "🔊" : "🔇";
$("bSonido").addEventListener("click", () => {
  sonido = !sonido;
  localStorage.setItem(ID + ":sonido", sonido ? "1" : "0");
  $("bSonido").textContent = sonido ? "🔊" : "🔇";
});

// ---------- Controles ----------
function pulsar(k, v) {
  if (k === "salto" && v && !ent.salto) ent.nuevo = true;
  ent[k] = v;
  const b = document.querySelector(`.mando[data-k="${k}"]`);
  if (b) b.classList.toggle("on", v);
}
const TECLAS = {
  ArrowLeft: "izq", KeyA: "izq", ArrowRight: "der", KeyD: "der",
  ArrowUp: "salto", KeyW: "salto", Space: "salto", KeyZ: "salto",
  ShiftLeft: "correr", ShiftRight: "correr", KeyX: "correr",
};
addEventListener("keydown", (ev) => {
  const k = TECLAS[ev.code];
  if (!k) return;
  if (ev.code === "Space" || ev.code.startsWith("Arrow")) ev.preventDefault();
  if (!ev.repeat) pulsar(k, true);
});
addEventListener("keyup", (ev) => { const k = TECLAS[ev.code]; if (k) pulsar(k, false); });
const soltarTodo = () => ["izq", "der", "salto", "correr"].forEach((k) => pulsar(k, false));
addEventListener("blur", soltarTodo);
document.addEventListener("visibilitychange", soltarTodo);
document.querySelectorAll(".mando").forEach((b) => {
  const k = b.dataset.k;
  b.addEventListener("pointerdown", (ev) => { ev.preventDefault(); pulsar(k, true); });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((n) => b.addEventListener(n, () => pulsar(k, false)));
});

// ---------- Partida ----------
function panel(titulo, texto, boton) {
  $("pTitulo").textContent = titulo;
  $("pTexto").textContent = texto;
  $("pBoton").textContent = boton;
  $("panel").hidden = false;
  $("pBoton").focus({ preventScroll: true });
}
function empezar() {
  e = nuevoJuego(NIVEL_1);
  estado = "jugando"; esperar = 70; acum = 0;
  $("panel").hidden = true;
  soltarTodo();
}
$("pBoton").addEventListener("click", empezar);

function enviarPuntos() {
  if (e.puntos > record) { record = e.puntos; localStorage.setItem(ID + ":record", record); }
  const pts = Math.floor(e.puntos / PUNTOS_POR_PERFIL);
  if (pts > 0 && sumarPuntos) { try { Promise.resolve(sumarPuntos(ID, pts)).catch(() => {}); } catch (er) {} }
}

function terminarIntento() {
  if (e.resultado === "gano") {
    estado = "fin"; enviarPuntos();
    panel("¡Nivel completado!",
      `Puntos: ${e.puntos}\nMonedas: ${e.monedas}\nBono por tiempo: ${e.bonus}\nRécord: ${record}`, "Jugar de nuevo");
  } else {
    const vidas = e.vidas - 1;
    if (vidas > 0) { e = nuevoJuego(NIVEL_1, { puntos: e.puntos, monedas: e.monedas, vidas }); esperar = 70; acum = 0; }
    else {
      e.vidas = 0; estado = "fin"; enviarPuntos();
      panel("Fin del juego", `Puntos: ${e.puntos}\nRécord: ${record}`, "Intentar de nuevo");
    }
  }
}

// ---------- Dibujo ----------
function dibujarFondo(cam) {
  if (!cielo) { cielo = x.createLinearGradient(0, 0, 0, ALTO * T); cielo.addColorStop(0, "#4aa8f0"); cielo.addColorStop(1, "#c4ecff"); }
  x.fillStyle = cielo; x.fillRect(0, 0, VISTA, ALTO * T);
  // Colinas lejanas y cercanas con desplazamiento más lento que el juego
  for (const [par, col, alto, per] of [[0.25, "#8fd9a8", 55, 130], [0.5, "#5fc27a", 34, 80]]) {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, 13 * T);
    for (let px = 0; px <= VISTA + 8; px += 8) x.lineTo(px, 13 * T - 8 - alto * Math.abs(Math.sin((px + cam * par) / per)));
    x.lineTo(VISTA + 8, 13 * T); x.fill();
  }
  // Nubes
  x.fillStyle = "rgba(255,255,255,.92)";
  const ancho = VISTA + 240;
  for (let i = 0; i < 10; i++) {
    const cx = ((((i * 210 + 50 - cam * 0.3) % ancho) + ancho) % ancho) - 120, cy = 24 + (i % 3) * 26;
    for (const [dx, dy, r] of [[0, 0, 10], [12, -4, 13], [26, 0, 10], [13, 4, 9]]) { x.beginPath(); x.arc(cx + dx, cy + dy, r, 0, 6.3); x.fill(); }
  }
}

function dibujarCasilla(c, px, py, tx, ty) {
  const g = e.g;
  if (c === "#") {
    const arriba = ty > 0 ? g[ty - 1][tx] : ".";
    x.fillStyle = "#9a6535"; x.fillRect(px, py, T, T);
    x.fillStyle = "#7d4f27"; x.fillRect(px + 3, py + 8, 3, 3); x.fillRect(px + 10, py + 3, 3, 3);
    if (arriba !== "#") { x.fillStyle = "#4fb04a"; x.fillRect(px, py, T, 5); x.fillStyle = "#2f8a3a"; x.fillRect(px, py + 5, T, 1); x.fillStyle = "#6bd066"; x.fillRect(px, py, T, 1); }
  } else if (c === "B") {
    x.fillStyle = "#c4602a"; x.fillRect(px, py, T, T);
    x.fillStyle = "#7a3516";
    x.fillRect(px, py + 5, T, 1); x.fillRect(px, py + 10, T, 1); x.fillRect(px, py + 15, T, 1);
    x.fillRect(px + 7, py, 1, 5); x.fillRect(px + 3, py + 5, 1, 5); x.fillRect(px + 11, py + 5, 1, 5); x.fillRect(px + 7, py + 10, 1, 5);
  } else if (c === "?" || c === "P") {
    const brillo = Math.floor(e.tick / 20) % 4 === 3;
    x.fillStyle = "#b8741a"; x.fillRect(px, py, T, T);
    x.fillStyle = brillo ? "#ffd86a" : "#f6c244"; x.fillRect(px + 1, py + 1, T - 2, T - 2);
    x.fillStyle = "#b8741a"; x.fillRect(px + 2, py + 2, 2, 2); x.fillRect(px + 12, py + 2, 2, 2); x.fillRect(px + 2, py + 12, 2, 2); x.fillRect(px + 12, py + 12, 2, 2);
    x.fillStyle = "#fff7d6"; x.font = "bold 11px sans-serif"; x.textAlign = "center"; x.fillText("?", px + 8, py + 12);
  } else if (c === "U") {
    x.fillStyle = "#6e523a"; x.fillRect(px, py, T, T);
    x.fillStyle = "#9c7b58"; x.fillRect(px + 1, py + 1, T - 2, T - 2);
    x.fillStyle = "#6e523a"; x.fillRect(px + 2, py + 2, 2, 2); x.fillRect(px + 12, py + 2, 2, 2); x.fillRect(px + 2, py + 12, 2, 2); x.fillRect(px + 12, py + 12, 2, 2);
  } else if (c === "S") {
    x.fillStyle = "#7c8a99"; x.fillRect(px, py, T, T);
    x.fillStyle = "#b9c4cf"; x.fillRect(px + 1, py + 1, T - 3, T - 3);
    x.fillStyle = "#a1aebb"; x.fillRect(px + 4, py + 4, T - 9, T - 9);
  } else if (c === "T") {
    const izq = tx === 0 || g[ty][tx - 1] !== "T", tapa = ty === 0 || g[ty - 1][tx] !== "T";
    x.fillStyle = "#1f7a37"; x.fillRect(px, py, T, T);
    x.fillStyle = "#35b457"; x.fillRect(px + 1, py, T - 2, T);
    x.fillStyle = izq ? "#7fe08f" : "#2a9a47"; if (izq) x.fillRect(px + 3, py, 3, T);
    if (tapa) { x.fillStyle = "#1f7a37"; x.fillRect(px, py, T, 6); x.fillStyle = "#3fc462"; x.fillRect(px + 1, py + 1, T - 2, 4); if (izq) { x.fillStyle = "#7fe08f"; x.fillRect(px + 3, py + 1, 3, 4); } }
  } else if (c === "c") {
    const a = Math.abs(Math.cos(e.tick / 14 + tx)) * 4 + 1.5;
    x.fillStyle = "#ffd23f"; x.beginPath(); x.ellipse(px + 8, py + 8, a, 6.5, 0, 0, 6.3); x.fill();
    x.strokeStyle = "#b8860b"; x.lineWidth = 1; x.stroke();
  } else if (c === "G") {
    const arriba = ty > 0 && g[ty - 1][tx] === "G";
    x.fillStyle = "#e8edf2"; x.fillRect(px + 7, py, 2, T);
    if (!arriba) {
      x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(px + 8, py, 3.5, 0, 6.3); x.fill();
      x.fillStyle = "#ff4d6d"; x.beginPath(); x.moveTo(px + 7, py + 3); x.lineTo(px - 8, py + 8); x.lineTo(px + 7, py + 13); x.fill();
    }
  }
}

function dibujarCastillo(cam) {
  const px = 146 * T - cam, py = 9 * T;
  if (px > VISTA || px < -80) return;
  x.fillStyle = "#b9aea3"; x.fillRect(px, py, 4 * T, 4 * T);
  x.fillStyle = "#9d9187"; for (let i = 0; i < 4; i++) x.fillRect(px + i * T + 3, py + 18, 10, 2);
  x.fillStyle = "#b9aea3"; for (let i = 0; i < 4; i++) x.fillRect(px + i * T + (i % 2 ? 0 : 2), py - 7, 10, 8);
  x.fillStyle = "#3a2c3f"; x.fillRect(px + 24, py + 32, 16, 32); x.beginPath(); x.arc(px + 32, py + 32, 8, Math.PI, 0); x.fill();
}

function dibujarEnemigo(en, cam) {
  const px = en.x - cam, py = en.y;
  if (px > VISTA + 20 || px < -30) return;
  x.save();
  if (en.estado === "cayendo") { x.translate(px + en.w / 2, py + en.h / 2); x.scale(1, -1); x.translate(-en.w / 2, -en.h / 2); }
  else x.translate(px, py);
  if (en.tipo === "e") {
    if (en.estado === "aplastado") { x.fillStyle = "#7b4a22"; x.fillRect(0, 0, 14, 5); }
    else {
      const m = Math.floor(e.tick / 10) % 2;
      x.fillStyle = "#8d5a2b"; x.beginPath(); x.arc(7, 8, 7, Math.PI, 0); x.fillRect(0, 8, 14, 3); x.fill();
      x.fillStyle = "#4a2c10"; x.fillRect(m ? 0 : 1, 11, 5, 3); x.fillRect(m ? 9 : 8, 11, 5, 3);
      x.fillStyle = "#fff"; x.fillRect(3, 5, 3, 3); x.fillRect(8, 5, 3, 3);
      x.fillStyle = "#000"; x.fillRect(5, 6, 1, 2); x.fillRect(8, 6, 1, 2);
      x.fillRect(2, 3, 4, 1); x.fillRect(8, 3, 4, 1);
    }
  } else {
    const sh = en.estado !== "vivo";
    if (!sh) {
      const m = Math.floor(e.tick / 12) % 2;
      x.save(); if (en.dir > 0) { x.translate(14, 0); x.scale(-1, 1); }
      x.fillStyle = "#e8c07a"; x.fillRect(0, 2, 6, 8); x.fillStyle = "#000"; x.fillRect(1, 4, 2, 2);
      x.fillStyle = "#e8c07a"; x.fillRect(m ? 2 : 4, 16, 4, 4); x.fillRect(m ? 9 : 7, 16, 4, 4);
      x.fillStyle = "#2e9e48"; x.beginPath(); x.arc(9, 12, 6.5, Math.PI, 0); x.fillRect(2.5, 12, 13, 4); x.fill();
      x.fillStyle = "#6fd58a"; x.fillRect(7, 8, 3, 3);
      x.restore();
    } else {
      x.fillStyle = "#2e9e48"; x.beginPath(); x.arc(7, 8, 7, Math.PI, 0); x.fillRect(0, 8, 14, 4); x.fill();
      x.fillStyle = "#e8e2c8"; x.fillRect(1, 11, 12, 3);
      x.fillStyle = "#6fd58a"; const g = en.estado === "disparado" ? Math.floor(e.tick / 3) % 3 * 3 : 3; x.fillRect(2 + g, 3, 3, 4);
    }
  }
  x.restore();
}

function dibujarJugador(cam) {
  const j = e.j;
  if (j.inv > 0 && Math.floor(j.inv / 4) % 2 === 0) return;
  const sc = j.grande ? 1.6 : 1;
  x.save();
  x.translate(Math.round(j.x + j.w / 2 - cam), Math.round(j.y + j.h - 16 * sc));
  if (j.estado === "mastil") x.translate(-3, 0);
  if (j.dir < 0) x.scale(-1, 1);
  x.scale(sc, sc); x.translate(-6, 0);
  const aire = !j.gr && j.estado !== "mastil", p = j.gr ? Math.floor(j.anim / 6) % 2 : 0;
  x.fillStyle = "#f08a24"; x.fillRect(-3, 8, 4, 4);                       // cola
  x.fillStyle = "#fff3df"; x.fillRect(-4, 7, 2, 3);
  x.fillStyle = "#5a3418";                                                // patas
  if (aire) { x.fillRect(2, 13, 3, 3); x.fillRect(8, 12, 3, 3); }
  else if (p) { x.fillRect(1, 13, 3, 3); x.fillRect(8, 13, 3, 3); }
  else { x.fillRect(3, 13, 3, 3); x.fillRect(6, 13, 3, 3); }
  x.fillStyle = "#f08a24"; x.fillRect(2, 7, 8, 7);                        // cuerpo
  x.fillStyle = "#fff3df"; x.fillRect(7, 9, 3, 4);
  x.fillStyle = "#e53935"; x.fillRect(2, 7, 9, 2);                        // bufanda
  x.fillStyle = "#f08a24"; x.fillRect(2, 1, 9, 7);                        // cabeza
  x.beginPath(); x.moveTo(2, 2); x.lineTo(3, -2); x.lineTo(6, 2); x.fill();
  x.beginPath(); x.moveTo(6, 2); x.lineTo(9, -2); x.lineTo(10, 2); x.fill();
  x.fillStyle = "#fff3df"; x.fillRect(8, 4, 4, 4);                        // hocico
  x.fillStyle = "#222"; x.fillRect(11, 4, 1, 1);
  x.fillStyle = "#fff"; x.fillRect(6, 3, 2, 2); x.fillStyle = "#222"; x.fillRect(7, 3, 1, 2);
  x.restore();
}

function texto(t, px, py, alin = "left", tam = 10) {
  x.font = `bold ${tam}px system-ui, sans-serif`; x.textAlign = alin;
  x.lineWidth = 3; x.strokeStyle = "rgba(0,0,0,.55)"; x.strokeText(t, px, py);
  x.fillStyle = "#fff"; x.fillText(t, px, py);
}

function dibujar() {
  x.setTransform(K, 0, 0, K, 0, 0);
  if (!e) { dibujarFondo(0); return; }
  const cam = Math.round(e.camX);
  dibujarFondo(cam);
  for (const it of e.items) {                       // frutas (detrás de los bloques mientras salen)
    const px = it.x - cam;
    x.fillStyle = "#ff5252"; x.beginPath(); x.arc(px + 7, it.y + 8, 6.5, 0, 6.3); x.fill();
    x.fillStyle = "#ff9a9a"; x.fillRect(px + 4, it.y + 5, 2, 2);
    x.fillStyle = "#3aa655"; x.fillRect(px + 6, it.y, 4, 3);
  }
  dibujarCastillo(cam);
  const tx0 = Math.max(0, Math.floor(cam / T)), tx1 = Math.min(e.W - 1, Math.floor((cam + VISTA) / T) + 1);
  for (let ty = 0; ty < ALTO; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = e.g[ty][tx];
    if (c === ".") continue;
    const r = e.reb[ty * e.W + tx];
    dibujarCasilla(c, tx * T - cam, ty * T - (r ? Math.sin((r / 10) * Math.PI) * 5 : 0), tx, ty);
  }
  for (const en of e.enemigos) if (en.activo) dibujarEnemigo(en, cam);
  dibujarJugador(cam);
  for (const f of e.efectos) {                      // moneda que sale del bloque
    const a = Math.abs(Math.cos(f.t / 2)) * 4 + 1.5;
    x.fillStyle = "#ffd23f"; x.beginPath(); x.ellipse(f.x - cam + 4, f.y + 8, a, 6.5, 0, 0, 6.3); x.fill();
  }
  x.fillStyle = "#c4602a";
  for (const d of e.escombros) x.fillRect(d.x - cam, d.y, 6, 6);

  // Marcadores
  texto("PUNTOS " + String(e.puntos).padStart(6, "0"), 6, 13);
  x.fillStyle = "#ffd23f"; x.beginPath(); x.ellipse(VISTA * 0.42, 9, 3.5, 5, 0, 0, 6.3); x.fill();
  texto("× " + String(e.monedas).padStart(2, "0"), VISTA * 0.42 + 8, 13);
  texto("♥ × " + e.vidas, VISTA * 0.62, 13);
  texto("TIEMPO " + e.segs, VISTA - 6, 13, "right");
  if (estado === "jugando" && esperar > 0) {
    x.fillStyle = "rgba(15,22,33,.55)"; x.fillRect(0, 0, VISTA, ALTO * T);
    texto("Nivel 1 · Pradera", VISTA / 2, ALTO * T / 2 - 6, "center", 18);
    texto("♥ × " + e.vidas, VISTA / 2, ALTO * T / 2 + 16, "center", 14);
  }
}

// ---------- Bucle ----------
function procesarEventos() { for (const ev of e.ev) if (SONIDOS[ev]) SONIDOS[ev](); }
const DT = 1000 / 60;
function bucle(t) {
  requestAnimationFrame(bucle);
  const dt = Math.min(100, t - ult); ult = t;
  if (e && estado === "jugando") {
    if (esperar > 0) esperar -= dt / DT;
    else {
      acum += dt;
      while (acum >= DT && e && estado === "jugando") {
        acum -= DT;
        paso(e, { izq: ent.izq, der: ent.der, salto: ent.salto, correr: ent.correr, saltoNuevo: ent.nuevo }, VISTA);
        ent.nuevo = false;
        procesarEventos();
        if (e.resultado) { terminarIntento(); break; }
      }
    }
  }
  dibujar();
}

ajustar();
panel("🦊 Pradera", "Llega al mástil del final del nivel.\nAplasta bichos saltando sobre ellos, junta monedas y busca la fruta roja para crecer.\n\nTeclado: flechas o A/D para moverte, Espacio o ↑ para saltar, Shift para correr.", "Jugar");
requestAnimationFrame(bucle);
