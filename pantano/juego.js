// Ruta: pantano/juego.js (lógica del juego «pantano»: defiende la cabaña disparando a los bichos del pantano)
// Proyecto: Juegos (portal). PAQUETE 1: disparo, 3 enemigos, oleadas, monedas y vida de la cabaña.
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "pantano"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
const CABANA_VIDA = 100;
const CARGADOR = 15;          // balas por cargador
const RECARGA = 1.4;          // segundos para recargar (automática al vaciarse)
const CADENCIA = 0.18;        // segundos entre disparos
const VEL_BALA = 800;         // px/s
const DANO_BALA = 1;
const PUNTOS_POR_PERFIL = 20; // al perfil se envía 1 punto por cada 20 del juego
const CLAVE_MEJOR = "pantano_mejor";
const CLAVE_MONEDAS = "pantano_monedas"; // monedas guardadas (las usará la tienda del paquete 2)
const SUELO_MIN = 270, SUELO_MAX = 335;  // franja por donde caminan los enemigos
const CABANA_X = 100;                    // los enemigos se detienen aquí a morder la cabaña
// Tipos de enemigo: vida, velocidad (px/s), daño por mordida, monedas, puntos, tamaño, color, desde qué oleada salen
const TIPOS = {
  rana:      { hp: 3, vel: 42, dano: 4,  monedas: 1, puntos: 10, w: 30, h: 24, color: "#5fbf4a", desde: 1 },
  serpiente: { hp: 2, vel: 85, dano: 3,  monedas: 2, puntos: 20, w: 38, h: 14, color: "#c9a227", desde: 2 },
  cocodrilo: { hp: 9, vel: 28, dano: 10, monedas: 4, puntos: 40, w: 62, h: 28, color: "#3f7d3a", desde: 3 },
};

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estadoTxt = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");
cv.style.maxWidth = "760px"; // este juego es horizontal: más ancho que los demás
cv.style.touchAction = "none";

// ---------- Estado ----------
const GX = 84, GY = 232; // punta del arma
let usuario = null, estado = "inicio"; // inicio | jugando | fin
let enemigos = [], balas = [], textos = [];
let objetivo = { x: 400, y: 250 }, apuntando = false, enfriar = 0;
let balasCargador = CARGADOR, recargando = 0;
let vida = CABANA_VIDA, puntos = 0, monedas = 0, monedasGuardadas = 0, mejor = 0;
let oleada = 1, porSalir = 0, salidos = 0, temporizador = 0, pausa = 0, ultimo = 0, audio = null, sacudida = 0;

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}
try { monedasGuardadas = parseInt(localStorage.getItem(CLAVE_MONEDAS), 10) || 0; } catch (e) {}

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estadoTxt.textContent = e.message; }));

// ---------- Sonido ----------
function tono(f, d = 0.06, tipo = "square") {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + d);
  } catch (e) {}
}

// ---------- Partida ----------
function empezarOleada() {
  porSalir = 5 + oleada * 3; salidos = 0; temporizador = 1;
  estadoTxt.textContent = "";
}
function empezar() {
  enemigos = []; balas = []; textos = [];
  vida = CABANA_VIDA; puntos = 0; monedas = 0; oleada = 1;
  balasCargador = CARGADOR; recargando = 0; pausa = 0;
  estado = "jugando";
  jugar.hidden = true;
  empezarOleada();
}
function nuevoEnemigo() {
  const disp = Object.keys(TIPOS).filter((k) => TIPOS[k].desde <= oleada);
  // los tipos más nuevos salen menos que la rana
  const k = Math.random() < 0.45 ? "rana" : disp[Math.floor(Math.random() * disp.length)];
  const t = TIPOS[k];
  enemigos.push({
    tipo: k, t, x: W + 30, y: SUELO_MIN + Math.random() * (SUELO_MAX - SUELO_MIN),
    hp: Math.ceil(t.hp * (1 + 0.08 * (oleada - 1))), hpMax: 0, mordida: 0, golpe: 0, fase: Math.random() * 6,
  });
  const e = enemigos[enemigos.length - 1]; e.hpMax = e.hp;
}
function texto(x, y, s, c) { textos.push({ x, y, s, c, v: 0.9 }); }
function matar(e) {
  puntos += e.t.puntos; monedas += e.t.monedas;
  texto(e.x, e.y - e.t.h - 6, "+" + e.t.monedas + " 🪙", "#ffe14d");
  tono(260, 0.08, "sawtooth");
}
async function terminar() {
  estado = "fin";
  monedasGuardadas += monedas;
  try { localStorage.setItem(CLAVE_MONEDAS, String(monedasGuardadas)); } catch (e) {}
  let txt = "La cabaña cayó en la oleada " + oleada + ". Hiciste " + puntos + " puntos y juntaste " + monedas + " monedas.";
  if (puntos > mejor) {
    mejor = puntos; txt += " ¡Nuevo récord!";
    try { localStorage.setItem(CLAVE_MEJOR, String(mejor)); } catch (e) {}
  }
  jugar.hidden = false; jugar.textContent = "Jugar otra vez";
  estadoTxt.textContent = txt;
  const sumar = Math.floor(puntos / PUNTOS_POR_PERFIL);
  if (!usuario || !sumar) return;
  try { await sumarPuntos(ID, sumar); estadoTxt.textContent += " +" + sumar + " al perfil ✓"; }
  catch (e) { estadoTxt.textContent += " No se pudieron guardar (" + e.message + ")"; }
}

// ---------- Actualizar ----------
function disparar() {
  const a = Math.atan2(objetivo.y - GY, objetivo.x - GX);
  balas.push({ x: GX, y: GY, vx: Math.cos(a) * VEL_BALA, vy: Math.sin(a) * VEL_BALA });
  balasCargador--; enfriar = CADENCIA; tono(700, 0.04);
  if (balasCargador <= 0) recargando = RECARGA;
}
function mover(dt) {
  if (estado !== "jugando") return;
  sacudida = Math.max(0, sacudida - dt * 4);

  // arma
  enfriar -= dt;
  if (recargando > 0) {
    recargando -= dt;
    if (recargando <= 0) { recargando = 0; balasCargador = CARGADOR; tono(400, 0.06); }
  } else if (apuntando && enfriar <= 0) disparar();

  // balas
  for (const b of balas) { b.x += b.vx * dt; b.y += b.vy * dt; }
  balas = balas.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10 && !b.fin);

  // oleada: salen enemigos de a poco; al limpiarla hay una pausa y sube la siguiente
  if (pausa > 0) {
    pausa -= dt;
    if (pausa <= 0) { oleada++; empezarOleada(); }
  } else if (salidos < porSalir) {
    temporizador -= dt;
    if (temporizador <= 0) { nuevoEnemigo(); salidos++; temporizador = Math.max(0.5, 1.7 - oleada * 0.1) * (0.6 + Math.random() * 0.8); }
  } else if (!enemigos.length) {
    const bono = 5 * oleada; monedas += bono; puntos += 50 * oleada;
    estadoTxt.textContent = "¡Oleada " + oleada + " superada! +" + bono + " 🪙";
    pausa = 2.5; tono(523, 0.12); setTimeout(() => tono(784, 0.18), 130);
  }

  // enemigos
  for (const e of enemigos) {
    e.fase += dt * 6; e.golpe = Math.max(0, e.golpe - dt * 6);
    if (e.x > CABANA_X + e.t.w / 2) e.x -= e.t.vel * dt;
    else {
      e.mordida -= dt;
      if (e.mordida <= 0) { e.mordida = 1; vida -= e.t.dano; sacudida = 1; tono(110, 0.15, "sawtooth"); }
    }
    for (const b of balas) {
      if (b.fin) continue;
      if (Math.abs(b.x - e.x) < e.t.w / 2 && b.y > e.y - e.t.h - 4 && b.y < e.y + 2) {
        b.fin = true; e.hp -= DANO_BALA; e.golpe = 1; tono(180, 0.04);
        if (e.hp <= 0) { e.muerto = true; matar(e); break; }
      }
    }
  }
  enemigos = enemigos.filter((e) => !e.muerto);
  textos.forEach((t) => { t.y -= 30 * dt; t.v -= dt; });
  textos = textos.filter((t) => t.v > 0);
  if (vida <= 0) { vida = 0; terminar(); }
}

// ---------- Dibujo ----------
function dibujarEnemigo(e) {
  const { w, h, color } = e.t, y = e.y + Math.sin(e.fase) * 1.5;
  cx.fillStyle = "rgba(0,0,0,.25)";
  cx.beginPath(); cx.ellipse(e.x, e.y + 2, w / 2, 4, 0, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = e.golpe > 0 ? "#fff" : color;
  if (e.tipo === "serpiente") {
    cx.beginPath(); cx.ellipse(e.x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); cx.fill();
  } else {
    cx.beginPath(); cx.ellipse(e.x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); cx.fill();
    if (e.tipo === "cocodrilo") { cx.fillRect(e.x - w / 2 - 14, y - h / 2 - 5, 18, 10); } // hocico
  }
  // ojos
  cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(e.x - w / 4, y - h * 0.75, 3.5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "#111"; cx.beginPath(); cx.arc(e.x - w / 4 - 1, y - h * 0.75, 1.6, 0, Math.PI * 2); cx.fill();
  // barra de vida (solo si está herido)
  if (e.hp < e.hpMax) {
    cx.fillStyle = "#400"; cx.fillRect(e.x - 14, y - h - 9, 28, 4);
    cx.fillStyle = "#4fd16b"; cx.fillRect(e.x - 14, y - h - 9, 28 * (e.hp / e.hpMax), 4);
  }
}
function dibujar() {
  // cielo, agua, suelo
  const g = cx.createLinearGradient(0, 0, 0, SUELO_MIN - 20);
  g.addColorStop(0, "#254b3a"); g.addColorStop(1, "#8fb36a");
  cx.fillStyle = g; cx.fillRect(0, 0, W, SUELO_MIN - 20);
  cx.fillStyle = "#1c3b2c"; // árboles de fondo
  for (let i = 0; i < 9; i++) { const x = 130 + i * 72; cx.fillRect(x, 70, 10, SUELO_MIN - 90); cx.beginPath(); cx.arc(x + 5, 70, 34, 0, Math.PI * 2); cx.fill(); }
  cx.fillStyle = "#2f5d4a"; cx.fillRect(0, SUELO_MIN - 22, W, 18); // agua
  cx.fillStyle = "#6b4f2a"; cx.fillRect(0, SUELO_MIN - 4, W, H - SUELO_MIN + 4); // barro

  cx.save();
  if (sacudida > 0) cx.translate((Math.random() - 0.5) * 6 * sacudida, (Math.random() - 0.5) * 6 * sacudida);
  // cabaña
  cx.fillStyle = "#5a3d1e"; cx.fillRect(0, 150, 96, 150);
  cx.fillStyle = "#3b2711"; cx.beginPath(); cx.moveTo(-6, 150); cx.lineTo(48, 108); cx.lineTo(102, 150); cx.fill();
  cx.fillStyle = "#7a5530"; for (let i = 0; i < 5; i++) cx.fillRect(0, 160 + i * 28, 96, 3);
  cx.fillStyle = "#111"; cx.fillRect(40, 205, 28, 95);
  // tirador y arma (apunta hacia el objetivo)
  cx.fillStyle = "#e0b48a"; cx.beginPath(); cx.arc(70, 222, 8, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "#c33"; cx.fillRect(62, 212, 16, 5);
  const a = Math.atan2(objetivo.y - GY, objetivo.x - GX);
  cx.save(); cx.translate(70, 232); cx.rotate(a);
  cx.fillStyle = "#222"; cx.fillRect(0, -3, 30, 6); cx.restore();
  cx.restore();

  // enemigos ordenados por y (los de abajo tapan a los de atrás)
  enemigos.slice().sort((p, q) => p.y - q.y).forEach(dibujarEnemigo);
  // balas
  cx.fillStyle = "#ffe14d";
  balas.forEach((b) => { cx.beginPath(); cx.arc(b.x, b.y, 3, 0, Math.PI * 2); cx.fill(); });
  // mira
  if (estado === "jugando") {
    cx.strokeStyle = "rgba(255,255,255,.7)"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(objetivo.x, objetivo.y, 9, 0, Math.PI * 2);
    cx.moveTo(objetivo.x - 14, objetivo.y); cx.lineTo(objetivo.x + 14, objetivo.y);
    cx.moveTo(objetivo.x, objetivo.y - 14); cx.lineTo(objetivo.x, objetivo.y + 14); cx.stroke();
  }
  // textos flotantes
  cx.font = "bold 14px system-ui"; cx.textAlign = "center";
  textos.forEach((t) => { cx.globalAlpha = Math.min(1, t.v * 2); cx.fillStyle = t.c; cx.fillText(t.s, t.x, t.y); });
  cx.globalAlpha = 1;

  // marcador
  cx.textAlign = "left"; cx.font = "bold 16px system-ui"; cx.fillStyle = "#fff";
  cx.fillText("Oleada " + oleada, 12, 24);
  cx.fillText("🪙 " + monedas, 12, 46);
  cx.textAlign = "center"; cx.font = "12px system-ui"; cx.fillStyle = "rgba(255,255,255,.75)";
  cx.fillText(puntos + " pts · Mejor " + mejor, W / 2, 22);
  // vida de la cabaña
  cx.textAlign = "right"; cx.font = "bold 12px system-ui"; cx.fillStyle = "#fff"; cx.fillText("Cabaña", W - 12, 18);
  cx.fillStyle = "#400"; cx.fillRect(W - 142, 24, 130, 10);
  cx.fillStyle = vida > 30 ? "#4fd16b" : "#ff5d73"; cx.fillRect(W - 142, 24, 130 * (vida / CABANA_VIDA), 10);
  // munición
  cx.fillStyle = "#fff"; cx.fillText(recargando > 0 ? "Recargando…" : balasCargador + " / " + CARGADOR, W - 12, 52);
  if (recargando > 0) { cx.fillStyle = "#333"; cx.fillRect(W - 142, 58, 130, 5); cx.fillStyle = "#4aa8ff"; cx.fillRect(W - 142, 58, 130 * (1 - recargando / RECARGA), 5); }
  cx.textAlign = "start";
}

// ---------- Entrada ----------
function apuntar(ev) {
  const r = cv.getBoundingClientRect();
  objetivo.x = Math.max(GX + 20, ((ev.clientX - r.left) / r.width) * W);
  objetivo.y = ((ev.clientY - r.top) / r.height) * H;
}
cv.addEventListener("pointerdown", (ev) => { apuntar(ev); apuntando = true; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} });
cv.addEventListener("pointermove", apuntar);
["pointerup", "pointercancel"].forEach((n) => cv.addEventListener(n, () => { apuntando = false; }));
jugar.addEventListener("click", empezar);

// ---------- Bucle ----------
function ciclo(t) {
  const dt = Math.min((t - ultimo) / 1000, 0.033) || 0;
  ultimo = t;
  mover(dt);
  dibujar();
  requestAnimationFrame(ciclo);
}
requestAnimationFrame((t) => { ultimo = t; ciclo(t); });
