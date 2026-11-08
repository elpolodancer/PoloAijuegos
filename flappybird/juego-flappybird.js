// Ruta: flappybird/juego-flappybird.js
// Aleteo: toca (o pulsa espacio) para aletear y pasa entre las columnas sin chocar. Cada par que pasas suma 1 punto.
// Personaje original: un colibrí. Los puntos van a la cola del perfil y el récord se sincroniza con la cuenta.
import { encolarPuntos } from "../compartido/cola-puntos.js";

const CLAVE = "flappybird_progreso_v1", JUEGO = "flappybird";
const W = 640, H = 480, SUELO = 410, BX = 170, BR = 13, ANCHO = 66, SEP = 230;
const cv = document.getElementById("lienzo"), ctx = cv.getContext("2d");

// ----- Progreso: solo el récord (gana el mayor) -----
let prog = cargar(), nube = null;
function cargar() {
  try { const o = JSON.parse(localStorage.getItem(CLAVE)); return o && typeof o === "object" ? { record: Number(o.record) || 0 } : { record: 0 }; }
  catch (e) { return { record: 0 }; }
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(JUEGO, {
    clave: CLAVE, fusionar: m.unirMaximos,
    alCambiar: (u) => { prog = { record: Number(u.record) || 0 }; marcador(); },
  });
}).catch(() => {});
const marcador = () => { document.getElementById("chRecord").textContent = "Récord " + prog.record; };
marcador();

// ----- Sonido sencillo -----
let ac = null;
function sonido(f, d = 0.1, tipo = "sine", v = 0.07) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.4, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}

// ----- Estado -----
let fase = "espera"; // espera → jugando → fin
let y = 220, vy = 0, giro = 0, puntos = 0, volcados = 0, tuberias = [], desp = 0, reloj = 0, finT = 0, nuevoRecord = false, plumas = [];

const dificultad = () => ({ vel: 150 + Math.min(puntos * 2, 60), hueco: Math.max(120, 168 - puntos * 1.5) });

function reiniciar() {
  y = 220; vy = 0; puntos = 0; volcados = 0; tuberias = []; plumas = []; fase = "espera"; nuevoRecord = false;
}
function volcar() { // puntos nuevos → cola (se envían al perfil con sesión e internet)
  const n = puntos - volcados;
  if (n > 0) { encolarPuntos(JUEGO, n); volcados = puntos; }
}
function morir() {
  if (fase !== "jugando") return;
  fase = "fin"; finT = 0; sonido(160, 0.3, "sawtooth", 0.09);
  volcar();
  if (puntos > prog.record) { prog.record = puntos; nuevoRecord = true; guardar(); marcador(); }
  for (let i = 0; i < 12; i++) plumas.push({ x: BX, y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 200, vida: 1 });
}
function aletear() {
  if (fase === "espera") { fase = "jugando"; tuberias.push(nueva(W + 80)); }
  if (fase === "jugando") { vy = -430; sonido(520, 0.09); }
  else if (fase === "fin" && finT > 0.7) reiniciar();
}
function nueva(x) { const d = dificultad(); return { x, h: 110 + d.hueco / 2 + Math.random() * (SUELO - 220 - d.hueco), hueco: d.hueco, pasado: false }; }

// ----- Entrada -----
addEventListener("pointerdown", (e) => {
  if (e.target.closest && e.target.closest(".hud, button, a")) return;
  e.preventDefault(); aletear();
});
addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); if (!e.repeat) aletear(); }
});
addEventListener("pagehide", () => { if (fase === "jugando") volcar(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && fase === "jugando") volcar(); });

// ----- Actualización -----
function actualizar(dt) {
  reloj += dt; desp += (fase === "fin" ? 0 : dificultad().vel) * dt;
  plumas.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.vida -= dt; });
  plumas = plumas.filter((p) => p.vida > 0);
  if (fase === "espera") { y = 220 + Math.sin(reloj * 4) * 8; giro = 0; return; }
  if (fase === "fin") finT += dt;
  // el pájaro cae siempre (también después de chocar)
  vy += 1500 * dt; y += vy * dt;
  giro = Math.max(-0.5, Math.min(1.2, vy / 600));
  if (y < BR) { y = BR; if (vy < 0) vy = 0; }
  if (y + BR >= SUELO) { y = SUELO - BR; vy = 0; morir(); }
  if (fase !== "jugando") return;
  const d = dificultad();
  tuberias.forEach((t) => (t.x -= d.vel * dt));
  tuberias = tuberias.filter((t) => t.x + ANCHO > -10);
  const u = tuberias[tuberias.length - 1];
  if (!u || u.x < W - SEP) tuberias.push(nueva(W + 20));
  for (const t of tuberias) {
    if (!t.pasado && t.x + ANCHO < BX - BR) { t.pasado = true; puntos++; sonido(880, 0.1, "triangle"); }
    const r = BR - 2;
    if (BX + r > t.x && BX - r < t.x + ANCHO && (y - r < t.h - t.hueco / 2 || y + r > t.h + t.hueco / 2)) { morir(); break; }
  }
}

// ----- Dibujo -----
function rr(x, yy, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, yy, w, h, r) : ctx.rect(x, yy, w, h); }
function dibujarNube(x, yy, s) { ctx.beginPath(); ctx.arc(x, yy, 18 * s, 0, 6.2832); ctx.arc(x + 20 * s, yy - 8 * s, 22 * s, 0, 6.2832); ctx.arc(x + 44 * s, yy, 18 * s, 0, 6.2832); ctx.fill(); }

function columna(t) {
  const arriba = t.h - t.hueco / 2, abajo = t.h + t.hueco / 2;
  const g = ctx.createLinearGradient(t.x, 0, t.x + ANCHO, 0);
  g.addColorStop(0, "#7a4bd1"); g.addColorStop(0.45, "#a874ff"); g.addColorStop(1, "#5e35a8");
  ctx.fillStyle = g; ctx.strokeStyle = "#3d2272"; ctx.lineWidth = 3;
  rr(t.x + 5, -10, ANCHO - 10, arriba + 10, 0); ctx.fill(); ctx.stroke();
  rr(t.x, arriba - 26, ANCHO, 26, 8); ctx.fill(); ctx.stroke();
  rr(t.x + 5, abajo, ANCHO - 10, SUELO - abajo, 0); ctx.fill(); ctx.stroke();
  rr(t.x, abajo, ANCHO, 26, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(t.x + 12, 0, 6, arriba - 26); ctx.fillRect(t.x + 12, abajo + 26, 6, SUELO - abajo - 26);
}

function colibri() {
  ctx.save(); ctx.translate(BX, y); ctx.rotate(giro);
  ctx.lineWidth = 2; ctx.strokeStyle = "#0e5c52";
  ctx.fillStyle = "#1f9c8c"; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-30, -6); ctx.lineTo(-28, 8); ctx.closePath(); ctx.fill(); ctx.stroke(); // cola
  ctx.fillStyle = "#33cdb9"; ctx.beginPath(); ctx.ellipse(0, 0, 17, 13, 0, 0, 6.2832); ctx.fill(); ctx.stroke(); // cuerpo
  ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.ellipse(3, 6, 11, 6, 0, 0, 6.2832); ctx.fill(); // pecho
  ctx.fillStyle = "#ff5b8a"; ctx.beginPath(); ctx.arc(9, -6, 5, 0, 6.2832); ctx.fill(); // mancha del cuello
  ctx.fillStyle = "#ffb020"; ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(36, 0); ctx.lineTo(15, 3); ctx.closePath(); ctx.fill(); ctx.stroke(); // pico largo
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(8, -4, 4.5, 0, 6.2832); ctx.fill(); ctx.stroke(); // ojo
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(9.5, -4, 2, 0, 6.2832); ctx.fill();
  const a = fase === "fin" ? 0.6 : Math.sin(reloj * (fase === "espera" ? 14 : 30)) * 0.7; // ala
  ctx.save(); ctx.translate(-4, -2); ctx.rotate(-0.5 + a);
  ctx.fillStyle = "#a6f0e5"; ctx.beginPath(); ctx.ellipse(-4, -9, 7, 15, -0.3, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function texto(t, x, yy, tam, color) {
  ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.lineWidth = Math.max(4, tam / 6); ctx.strokeStyle = "#2a1550"; ctx.strokeText(t, x, yy);
  ctx.fillStyle = color || "#fff"; ctx.fillText(t, x, yy);
}

function dibujar() {
  const g = ctx.createLinearGradient(0, 0, 0, SUELO); g.addColorStop(0, "#5bbcf0"); g.addColorStop(1, "#c9f0ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,.8)";
  for (let i = 0; i < 4; i++) dibujarNube(((i * 230 - desp * 0.15) % (W + 260) + W + 260) % (W + 260) - 130, 70 + (i % 2) * 50, 1 + (i % 3) * 0.2);
  ctx.fillStyle = "#8fd89a"; // colinas
  for (let i = -1; i < 5; i++) { ctx.beginPath(); ctx.arc(((i * 190 - desp * 0.4) % 760 + 760) % 760 - 60, SUELO + 40, 110, Math.PI, 0); ctx.fill(); }
  tuberias.forEach(columna);
  // suelo
  ctx.fillStyle = "#e9d7a4"; ctx.fillRect(0, SUELO, W, H - SUELO);
  ctx.fillStyle = "#5fc15f"; ctx.fillRect(0, SUELO, W, 14);
  ctx.fillStyle = "#47a047"; for (let x = -(desp % 40); x < W; x += 40) ctx.fillRect(x, SUELO + 4, 20, 6);
  ctx.fillStyle = "#c9b27a"; ctx.fillRect(0, SUELO + 14, W, 3);
  plumas.forEach((p) => { ctx.globalAlpha = Math.max(0, p.vida); ctx.fillStyle = "#33cdb9"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 5, 2.5, p.vida * 6, 0, 6.2832); ctx.fill(); });
  ctx.globalAlpha = 1;
  colibri();

  if (fase !== "espera") texto(String(puntos), W / 2, 80, 56);
  if (fase === "espera") {
    texto("Aleteo", W / 2, 150, 54, "#ffe27a");
    texto("Toca para aletear", W / 2, 330, 24);
    texto("Pasa entre las columnas", W / 2, 362, 18);
  }
  if (fase === "fin") {
    ctx.fillStyle = "rgba(255,255,255,.95)"; rr(W / 2 - 150, 120, 300, 210, 20); ctx.fill();
    ctx.strokeStyle = "#7a4bd1"; ctx.lineWidth = 4; ctx.stroke();
    texto("Fin del juego", W / 2, 165, 30, "#ff7a7a");
    ctx.fillStyle = "#4a3070"; ctx.textAlign = "center"; ctx.font = "700 20px system-ui, sans-serif";
    ctx.fillText("Puntos: " + puntos, W / 2, 205);
    ctx.fillText("Récord: " + prog.record + (nuevoRecord ? "  ¡nuevo!" : ""), W / 2, 235);
    const med = puntos >= 30 ? ["#ffc21a", "Oro"] : puntos >= 20 ? ["#c4cbd6", "Plata"] : puntos >= 10 ? ["#d98a4a", "Bronce"] : null;
    if (med) { ctx.fillStyle = med[0]; ctx.beginPath(); ctx.arc(W / 2 - 100, 220, 22, 0, 6.2832); ctx.fill(); ctx.strokeStyle = "#4a3070"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#4a3070"; ctx.font = "700 11px system-ui"; ctx.fillText(med[1], W / 2 - 100, 224); }
    if (finT > 0.7) { ctx.fillStyle = "#7a4bd1"; ctx.font = "800 18px system-ui"; ctx.fillText("Toca para reintentar", W / 2, 292 + Math.sin(reloj * 6) * 2); }
  }
}

let ultimo = performance.now();
function bucle(t) {
  const dt = Math.min(0.04, (t - ultimo) / 1000); ultimo = t;
  actualizar(dt); dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
