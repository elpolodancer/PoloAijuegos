// Ruta: zuma/juego-zuma.js
// Zuma: dispara bolas de colores desde la rana y junta 3 o más del mismo color antes de que la cadena llegue al hoyo.
import { crearPartida, avanzar, insertar, buscarImpacto, colorDisparo, coloresDisponibles, crearTrayecto, azarSemilla, R } from "./logica-zuma.js";
import { NIVELES, PALETA, ANCHO, ALTO, CENTRO } from "./niveles-zuma.js";

// ----- Ajustes -----
const ID = "zuma";
const PUNTOS_NIVEL = 10;          // puntos al perfil, solo la primera vez que se pasa un nivel
const CLAVE = "zuma_progreso_v1";
const VEL_DISPARO = 720;          // px/s de la bola disparada
const RECARGA = 0.28;             // segundos entre disparos

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), g = cv.getContext("2d");

// ----- Progreso -----
let progreso = {};
try { progreso = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) {}
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(progreso)); } catch (e) {} };

// ----- Sonido: todo sintetizado (sin archivos). Golpes secos y ruido filtrado = piedra contra piedra -----
let ac = null, mudo = false, rumor = null;
function audio() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === "suspended") ac.resume();
  return ac;
}
function bufferRuido(seg, marron) {
  const n = (ac.sampleRate * seg) | 0, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  let u = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    if (marron) { u = (u + 0.02 * w) / 1.02; d[i] = u * 3.5; } else d[i] = w;
  }
  return b;
}
function golpe({ f = 120, dur = 0.12, vol = 0.4, filtro = 1500, ruido = 0.3, retraso = 0 }) {
  if (mudo || !audio()) return;
  const t = ac.currentTime + retraso;
  const o = ac.createOscillator(), go = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.5, t + dur);
  go.gain.setValueAtTime(vol, t);
  go.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(go).connect(ac.destination);
  o.start(t); o.stop(t + dur);
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = bufferRuido(0.08, false);
  fl.type = "bandpass"; fl.frequency.value = filtro; fl.Q.value = 1.2;
  gn.gain.setValueAtTime(ruido, t);
  gn.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  s.connect(fl).connect(gn).connect(ac.destination);
  s.start(t);
}
const sonidoDisparo = () => golpe({ f: 150, dur: 0.14, vol: 0.35, filtro: 900, ruido: 0.25 });
const sonidoPone = () => golpe({ f: 230, dur: 0.08, vol: 0.3, filtro: 2300, ruido: 0.4 });
function sonidoQuita(n, combo) {
  const sube = 1 + Math.min(combo, 6) * 0.12;
  golpe({ f: 95 * sube, dur: 0.22, vol: 0.5, filtro: 650 * sube, ruido: 0.5 });
  golpe({ f: 200 * sube, dur: 0.1, vol: 0.3, filtro: 2600, ruido: 0.45, retraso: 0.045 });
  if (n > 3) golpe({ f: 140 * sube, dur: 0.12, vol: 0.3, filtro: 1800, ruido: 0.4, retraso: 0.1 });
}
function rumorOn() { // retumbo grave de la cadena rodando
  if (mudo || !audio() || rumor) return;
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = bufferRuido(2, true); s.loop = true;
  fl.type = "lowpass"; fl.frequency.value = 180;
  gn.gain.value = 0.05;
  s.connect(fl).connect(gn).connect(ac.destination);
  s.start();
  rumor = s;
}
function rumorOff() { if (rumor) { try { rumor.stop(); } catch (e) {} rumor = null; } }
$("sonido").addEventListener("click", () => {
  mudo = !mudo;
  $("sonido").textContent = mudo ? "🔇" : "🔊";
  if (mudo) rumorOff(); else if (p && p.estado === "jugando") rumorOn();
});

// ----- Dibujo -----
function dibujarBola(x, y, c, r = R) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  gr.addColorStop(0, "#fff");
  gr.addColorStop(0.25, PALETA[c]);
  gr.addColorStop(1, "#0006");
  g.fillStyle = PALETA[c];
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = gr; g.globalAlpha = 0.85;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = "#0008"; g.lineWidth = 1.5; g.stroke();
  // marca distinta por color (ayuda a distinguirlos sin depender del color)
  g.strokeStyle = "#0007"; g.fillStyle = "#0005"; g.lineWidth = 2;
  const m = r * 0.38;
  g.beginPath();
  if (c === 0) g.arc(x, y, m, 0, 7);
  else if (c === 1) { g.moveTo(x, y - m); g.lineTo(x + m, y); g.lineTo(x, y + m); g.lineTo(x - m, y); g.closePath(); }
  else if (c === 2) { g.moveTo(x, y - m); g.lineTo(x + m, y + m * 0.8); g.lineTo(x - m, y + m * 0.8); g.closePath(); }
  else if (c === 3) g.rect(x - m * 0.8, y - m * 0.8, m * 1.6, m * 1.6);
  else if (c === 4) { g.moveTo(x - m, y); g.lineTo(x + m, y); g.moveTo(x, y - m); g.lineTo(x, y + m); }
  else { g.arc(x, y, m, 0, 7); g.moveTo(x + m * 0.4, y); g.arc(x, y, m * 0.4, 0, 7); }
  g.stroke();
}

let fondo = null, trFondo = null;
function crearFondo(tr) {
  const c = document.createElement("canvas");
  c.width = ANCHO; c.height = ALTO;
  const f = c.getContext("2d");
  const gr = f.createRadialGradient(ANCHO / 2, ALTO / 2, 40, ANCHO / 2, ALTO / 2, 420);
  gr.addColorStop(0, "#7a828b"); gr.addColorStop(1, "#3a4047");
  f.fillStyle = gr; f.fillRect(0, 0, ANCHO, ALTO);
  const r = azarSemilla(7); // vetas y granos de la piedra
  for (let i = 0; i < 260; i++) {
    f.fillStyle = r() < 0.5 ? "rgba(0,0,0,.09)" : "rgba(255,255,255,.07)";
    f.fillRect(r() * ANCHO, r() * ALTO, 2 + r() * 8, 1 + r() * 3);
  }
  f.lineCap = "round"; f.lineJoin = "round";
  const trazo = () => { f.beginPath(); for (let s = 0; s <= tr.largo; s += 4) { const q = tr.pos(s); s ? f.lineTo(q.x, q.y) : f.moveTo(q.x, q.y); } f.stroke(); };
  f.strokeStyle = "#2a3036"; f.lineWidth = 56; trazo();   // borde del surco
  f.strokeStyle = "#13161a"; f.lineWidth = 46; trazo();   // fondo del surco
  f.fillStyle = "#555d66"; f.strokeStyle = "#2a3036"; f.lineWidth = 4; // plataforma de la rana
  f.beginPath(); f.arc(CENTRO.x, CENTRO.y, 58, 0, 7); f.fill(); f.stroke();
  const h = tr.pos(tr.largo); // hoyo
  f.fillStyle = "#050607"; f.strokeStyle = "#c9a227"; f.lineWidth = 5;
  f.beginPath(); f.arc(h.x, h.y, 27, 0, 7); f.fill(); f.stroke();
  return c;
}

function dibujarRana(ang) {
  g.save();
  g.translate(CENTRO.x, CENTRO.y);
  g.rotate(ang);
  g.fillStyle = "#4f6a59"; g.strokeStyle = "#1e2b23"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(0, 0, 38, 33, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#6f8f7a";
  g.beginPath(); g.ellipse(8, 0, 26, 22, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#0b0f0c";
  g.beginPath(); g.arc(30, 0, 13, 0, 7); g.fill();
  g.fillStyle = "#d33";
  for (const sy of [-1, 1]) { g.beginPath(); g.arc(12, sy * 20, 5, 0, 7); g.fill(); }
  g.restore();
}

// ----- Partida -----
let p = null, tiros = [], chispas = [], textos = [], ang = -Math.PI / 2, carga = 0, sig = 0, recarga = 0, ultimo = 0, enMarcha = false;
const nivelActual = () => NIVELES[0];

function empezar() {
  const n = nivelActual();
  p = crearPartida(n);
  if (trFondo !== n.id) { fondo = crearFondo(p.tr); trFondo = n.id; }
  tiros = []; chispas = []; textos = []; recarga = 0;
  carga = colorDisparo(p); sig = colorDisparo(p);
  $("velo").hidden = true;
  rumorOn();
  ultimo = performance.now();
  if (!enMarcha) { enMarcha = true; requestAnimationFrame(marco); }
}

function velo(titulo, texto, boton, accion) {
  $("veloTitulo").textContent = titulo;
  $("veloTexto").textContent = texto;
  $("veloBtn").textContent = boton;
  $("veloBtn").onclick = accion;
  $("velo").hidden = false;
}
function inicio() {
  const n = nivelActual(), pr = progreso[n.id];
  p = null;
  velo("🐸 Zuma", n.nombre + (pr ? " · mejor: " + pr.mejor + " pts" : ""), pr ? "Jugar otra vez" : "Jugar", () => { audio(); empezar(); });
}

async function gano() {
  rumorOff();
  const n = nivelActual(), primera = !progreso[n.id];
  progreso[n.id] = { mejor: Math.max(p.puntos, (progreso[n.id] || {}).mejor || 0) };
  guardar();
  velo("🎉 ¡Nivel superado!", p.puntos + " puntos", "Jugar otra vez", empezar);
  if (primera) {
    try {
      const { sumarPuntos } = await import("../compartido/jugador.js");
      await sumarPuntos(ID, PUNTOS_NIVEL); // solo guarda si hay sesión iniciada
    } catch (e) {}
  }
}
function perdio() {
  rumorOff();
  golpe({ f: 60, dur: 0.5, vol: 0.6, filtro: 300, ruido: 0.6 });
  velo("💀 La cadena llegó al hoyo", p.puntos + " puntos", "Reintentar", empezar);
}

function manejar(e) {
  if (e.t === "quita") {
    sonidoQuita(e.n, e.combo);
    for (const b of e.bolas) for (let k = 0; k < 5; k++) chispas.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240 - 40, v: 0.5 + Math.random() * 0.3, c: b.c });
    const m = e.bolas[(e.bolas.length / 2) | 0];
    textos.push({ x: m.x, y: m.y, txt: "+" + e.pts, v: 1 });
    if (e.combo > 0) textos.push({ x: m.x, y: m.y - 22, txt: "¡Combo ×" + (e.combo + 1) + "!", v: 1.2 });
  } else if (e.t === "pone") sonidoPone();
  else if (e.t === "gano") gano();
  else if (e.t === "perdio") perdio();
}

function disparar() {
  if (!p || p.estado !== "jugando" || recarga > 0) return;
  tiros.push({ x: CENTRO.x + Math.cos(ang) * 40, y: CENTRO.y + Math.sin(ang) * 40, vx: Math.cos(ang) * VEL_DISPARO, vy: Math.sin(ang) * VEL_DISPARO, c: carga });
  carga = sig; sig = colorDisparo(p);
  recarga = RECARGA;
  sonidoDisparo();
}
function cambiar() { if (p && p.estado === "jugando") [carga, sig] = [sig, carga]; }

function moverTiros(dt) {
  tiros = tiros.filter((t) => {
    const dist = VEL_DISPARO * dt, pasos = Math.max(1, Math.ceil(dist / 6));
    for (let k = 0; k < pasos; k++) {
      t.x += (t.vx * dt) / pasos; t.y += (t.vy * dt) / pasos;
      const imp = buscarImpacto(p, t.x, t.y);
      if (imp) { avanzarEv(insertar(p, imp.i, imp.delante, t.c, { x: t.x, y: t.y })); return false; }
    }
    return t.x > -40 && t.x < ANCHO + 40 && t.y > -40 && t.y < ALTO + 40;
  });
}
const avanzarEv = (ev) => ev.forEach(manejar);

function marco(ms) {
  const dt = Math.min(0.05, (ms - ultimo) / 1000);
  ultimo = ms;
  if (p && p.estado === "jugando") {
    avanzarEv(avanzar(p, dt));
    if (p.estado === "jugando") {
      moverTiros(dt);
      recarga -= dt;
      const hay = coloresDisponibles(p); // que la bola cargada siempre exista en la cadena
      if (!hay.has(carga)) carga = colorDisparo(p);
      if (!hay.has(sig)) sig = colorDisparo(p);
    }
  }
  for (const c of chispas) { c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 500 * dt; c.v -= dt; }
  chispas = chispas.filter((c) => c.v > 0);
  for (const t of textos) { t.y -= 24 * dt; t.v -= dt; }
  textos = textos.filter((t) => t.v > 0);
  dibujar();
  requestAnimationFrame(marco);
}

function dibujar() {
  g.clearRect(0, 0, ANCHO, ALTO);
  if (!fondo) { fondo = crearFondo(crearTrayecto(nivelActual().trayecto)); trFondo = nivelActual().id; }
  g.drawImage(fondo, 0, 0);
  if (!p) { dibujarRana(ang); return; }
  const cab = p.cad.length ? p.cad[p.cad.length - 1].s : 0;
  if (cab > p.tr.largo * 0.82) { // peligro: el hoyo brilla en rojo
    const h = p.tr.pos(p.tr.largo);
    g.strokeStyle = "rgba(255,60,60," + (0.5 + 0.5 * Math.sin(p.t * 8)) + ")"; g.lineWidth = 6;
    g.beginPath(); g.arc(h.x, h.y, 32, 0, 7); g.stroke();
  }
  for (const b of p.cad) { const q = p.tr.pos(b.s + b.d); dibujarBola(q.x + b.ox, q.y + b.oy, b.c); }
  for (const t of tiros) dibujarBola(t.x, t.y, t.c);
  dibujarRana(ang); // la bola cargada va en la boca y la siguiente atrás
  dibujarBola(CENTRO.x + Math.cos(ang) * 30, CENTRO.y + Math.sin(ang) * 30, carga, R * 0.95);
  dibujarBola(CENTRO.x - Math.cos(ang) * 22, CENTRO.y - Math.sin(ang) * 22, sig, R * 0.55);
  for (const c of chispas) { g.globalAlpha = Math.min(1, c.v * 2); g.fillStyle = PALETA[c.c]; g.fillRect(c.x - 2, c.y - 2, 4, 4); }
  g.globalAlpha = 1;
  g.font = "bold 16px system-ui, sans-serif"; g.textAlign = "center";
  for (const t of textos) { g.globalAlpha = Math.min(1, t.v * 2); g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3; g.strokeText(t.txt, t.x, t.y); g.fillText(t.txt, t.x, t.y); }
  g.globalAlpha = 1;
  // marcador
  g.textAlign = "left"; g.fillStyle = "#fff"; g.strokeStyle = "#000a"; g.lineWidth = 3;
  g.strokeText(p.puntos + " pts", 12, 24); g.fillText(p.puntos + " pts", 12, 24);
  const falta = p.cola.length + p.cad.length;
  g.fillStyle = "#0008"; g.fillRect(ANCHO - 152, 12, 140, 10);
  g.fillStyle = "#c9a227"; g.fillRect(ANCHO - 152, 12, 140 * (1 - falta / p.total), 10);
}

// ----- Controles (ratón y táctil) -----
function apuntar(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) * ANCHO) / r.width, y = ((e.clientY - r.top) * ALTO) / r.height;
  ang = Math.atan2(y - CENTRO.y, x - CENTRO.x);
  return { x, y };
}
cv.addEventListener("pointermove", apuntar);
cv.addEventListener("pointerdown", (e) => {
  audio();
  const q = apuntar(e);
  if (Math.hypot(q.x - CENTRO.x, q.y - CENTRO.y) < 30) cambiar(); else disparar();
});
cv.addEventListener("contextmenu", (e) => { e.preventDefault(); cambiar(); });
addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); cambiar(); } });
document.addEventListener("visibilitychange", () => { if (document.hidden) rumorOff(); else if (p && p.estado === "jugando") rumorOn(); });

inicio();
requestAnimationFrame(() => { enMarcha = true; ultimo = performance.now(); requestAnimationFrame(marco); });
