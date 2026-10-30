// Ruta: rompeladrillos/juego.js (lógica del juego «rompeladrillos»: mover la paleta, rebotar la pelota y romper ladrillos)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "rompeladrillos"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
const VIDAS = 3;
const VEL_INICIAL = 260;     // velocidad de la pelota (px/s)
const VEL_MAX = 430;         // la pelota se acelera un poco con cada ladrillo, hasta este tope
const SUBE_VEL = 3;          // cuánto acelera por ladrillo roto
const PALETA_ANCHO = 64;
const VEL_PALETA = 420;      // velocidad de la paleta con el teclado (px/s)
const COLS = 7;
const FILAS = 5;             // nivel de prueba: 5 filas × 7 columnas, todos se rompen de un golpe
const PUNTOS_FILA = [50, 40, 30, 20, 10]; // puntos por ladrillo, de la fila de arriba a la de abajo
const BONO_VICTORIA = 100;   // al limpiar el nivel
const BONO_VIDA = 50;        // por cada vida que te sobre al ganar
const PUNTOS_POR_PERFIL = 25; // al perfil se envía 1 punto por cada 25 del juego
const CLAVE_MEJOR = "rompeladrillos_mejor";
const COLORES = ["#ff5d73", "#ffa534", "#ffe14d", "#4fd16b", "#4aa8ff"]; // un color por fila

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estadoTxt = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");
cv.style.touchAction = "none";

// ---------- Estado ----------
const R = 6;                                   // radio de la pelota
const PY = H - 36, PH = 10;                    // posición y alto de la paleta
const BM = 10, BG = 4, BW = (W - 2 * BM - (COLS - 1) * BG) / COLS, BH = 16, BTOP = 70; // medidas de los ladrillos
let usuario = null, estado = "inicio"; // inicio | servir | jugando | fin
let ladrillos = [], px = W / 2, bola = { x: 0, y: 0, vx: 0, vy: 0 }, vel = VEL_INICIAL;
let puntos = 0, vidas = VIDAS, mejor = 0, ultimo = 0, audio = null;
const teclas = { izq: false, der: false };

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estadoTxt.textContent = e.message; }));

// ---------- Sonido ----------
function tono(f, d = 0.08) {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "square";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.08, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + d);
  } catch (e) {}
}

// ---------- Partida ----------
function crearLadrillos() {
  ladrillos = [];
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLS; c++)
      ladrillos.push({ x: BM + c * (BW + BG), y: BTOP + f * (BH + BG), f, vivo: true });
}
function servir() {
  estado = "servir";
  vel = Math.max(vel, VEL_INICIAL);
  bola.x = px; bola.y = PY - R - 1; bola.vx = 0; bola.vy = 0;
  estadoTxt.textContent = "Toca la pantalla (o pulsa espacio) para lanzar la pelota.";
}
function empezar() {
  puntos = 0; vidas = VIDAS; vel = VEL_INICIAL; px = W / 2;
  crearLadrillos();
  jugar.hidden = true;
  servir();
}
function lanzar() {
  if (estado !== "servir") return;
  const a = (Math.random() * 40 - 20) * Math.PI / 180; // un poco inclinada para que no sea siempre igual
  bola.vx = Math.sin(a) * vel; bola.vy = -Math.cos(a) * vel;
  estado = "jugando";
  estadoTxt.textContent = "";
}
function perderVida() {
  vidas--;
  tono(130, 0.25);
  if (vidas > 0) servir();
  else terminar(false);
}
async function terminar(gano) {
  estado = "fin";
  if (gano) puntos += BONO_VICTORIA + vidas * BONO_VIDA;
  let txt = gano ? "¡Nivel completado! " : "Te quedaste sin vidas. ";
  txt += "Hiciste " + puntos + " puntos.";
  if (puntos > mejor) {
    mejor = puntos; txt += " ¡Nuevo récord!";
    try { localStorage.setItem(CLAVE_MEJOR, String(mejor)); } catch (e) {}
  }
  jugar.hidden = false;
  jugar.textContent = "Jugar otra vez";
  estadoTxt.textContent = txt;
  if (gano) { tono(523, 0.12); setTimeout(() => tono(659, 0.12), 120); setTimeout(() => tono(784, 0.2), 240); }
  // Al perfil va 1 punto por cada PUNTOS_POR_PERFIL; solo si hay sesión
  const sumar = Math.floor(puntos / PUNTOS_POR_PERFIL);
  if (!usuario || !sumar) return;
  try { await sumarPuntos(ID, sumar); estadoTxt.textContent += " +" + sumar + " al perfil ✓"; }
  catch (e) { estadoTxt.textContent += " No se pudieron guardar (" + e.message + ")"; }
}

// ---------- Movimiento y choques ----------
function mover(dt) {
  if (teclas.izq) px -= VEL_PALETA * dt;
  if (teclas.der) px += VEL_PALETA * dt;
  px = Math.max(PALETA_ANCHO / 2, Math.min(W - PALETA_ANCHO / 2, px));
  if (estado === "servir") { bola.x = px; bola.y = PY - R - 1; return; }
  if (estado !== "jugando") return;

  const pasos = 2; // dos pasos por cuadro para que la pelota no atraviese ladrillos
  for (let i = 0; i < pasos && estado === "jugando"; i++) {
    const ax = bola.x, ay = bola.y;
    bola.x += (bola.vx * dt) / pasos;
    bola.y += (bola.vy * dt) / pasos;

    // paredes
    if (bola.x < R) { bola.x = R; bola.vx = Math.abs(bola.vx); tono(330, 0.04); }
    if (bola.x > W - R) { bola.x = W - R; bola.vx = -Math.abs(bola.vx); tono(330, 0.04); }
    if (bola.y < R) { bola.y = R; bola.vy = Math.abs(bola.vy); tono(330, 0.04); }

    // paleta: el ángulo depende de dónde la toque (centro = recto, orilla = muy inclinado)
    if (bola.vy > 0 && bola.y + R >= PY && ay + R <= PY + PH && bola.x >= px - PALETA_ANCHO / 2 - R && bola.x <= px + PALETA_ANCHO / 2 + R) {
      const t = Math.max(-1, Math.min(1, (bola.x - px) / (PALETA_ANCHO / 2)));
      const a = t * 62 * Math.PI / 180;
      bola.vx = Math.sin(a) * vel; bola.vy = -Math.cos(a) * vel;
      bola.y = PY - R;
      tono(440, 0.05);
    }

    // ladrillos (se rompe uno por paso)
    for (const b of ladrillos) {
      if (!b.vivo) continue;
      const cxp = Math.max(b.x, Math.min(bola.x, b.x + BW)), cyp = Math.max(b.y, Math.min(bola.y, b.y + BH));
      if ((bola.x - cxp) ** 2 + (bola.y - cyp) ** 2 > R * R) continue;
      b.vivo = false;
      puntos += PUNTOS_FILA[b.f % PUNTOS_FILA.length];
      vel = Math.min(VEL_MAX, vel + SUBE_VEL);
      // si venía de arriba/abajo del ladrillo rebota en vertical; si venía de un lado, en horizontal
      if (ay + R <= b.y || ay - R >= b.y + BH) bola.vy = -bola.vy; else bola.vx = -bola.vx;
      const m = Math.hypot(bola.vx, bola.vy) || 1;
      bola.vx = (bola.vx / m) * vel; bola.vy = (bola.vy / m) * vel;
      tono(500 + (FILAS - b.f) * 90, 0.06);
      break;
    }

    if (!ladrillos.some((b) => b.vivo)) { terminar(true); return; }
    if (bola.y > H + R) { perderVida(); return; }
  }
}

// ---------- Dibujo ----------
function dibujar() {
  cx.fillStyle = "#14102b";
  cx.fillRect(0, 0, W, H);
  ladrillos.forEach((b) => {
    if (!b.vivo) return;
    cx.fillStyle = COLORES[b.f % COLORES.length];
    cx.fillRect(b.x, b.y, BW, BH);
    cx.fillStyle = "rgba(255,255,255,.28)";
    cx.fillRect(b.x, b.y, BW, 4);
  });
  // paleta
  cx.fillStyle = "#7c5cff";
  cx.fillRect(px - PALETA_ANCHO / 2, PY, PALETA_ANCHO, PH);
  // pelota
  if (estado !== "inicio") {
    cx.fillStyle = "#fff";
    cx.beginPath(); cx.arc(bola.x, bola.y, R, 0, Math.PI * 2); cx.fill();
  }
  // marcador
  cx.fillStyle = "#fff"; cx.font = "bold 18px system-ui";
  cx.textAlign = "left"; cx.fillText(String(puntos), 12, 28);
  cx.textAlign = "right"; cx.fillText("♥".repeat(Math.max(vidas, 0)), W - 12, 28);
  cx.textAlign = "center"; cx.font = "12px system-ui"; cx.fillStyle = "rgba(255,255,255,.6)";
  cx.fillText("Mejor " + mejor, W / 2, 28);
  cx.textAlign = "start";
}

// ---------- Entrada ----------
function moverA(ev) {
  const r = cv.getBoundingClientRect();
  px = ((ev.clientX - r.left) / r.width) * W;
}
cv.addEventListener("pointerdown", (ev) => {
  moverA(ev);
  if (estado === "servir") lanzar();
});
cv.addEventListener("pointermove", (ev) => { if (estado === "servir" || estado === "jugando") moverA(ev); });
window.addEventListener("keydown", (ev) => {
  if (ev.key === "ArrowLeft") teclas.izq = true;
  if (ev.key === "ArrowRight") teclas.der = true;
  if (ev.key === " ") { ev.preventDefault(); lanzar(); }
});
window.addEventListener("keyup", (ev) => {
  if (ev.key === "ArrowLeft") teclas.izq = false;
  if (ev.key === "ArrowRight") teclas.der = false;
});
jugar.addEventListener("click", empezar);

// ---------- Bucle ----------
function ciclo(t) {
  const dt = Math.min((t - ultimo) / 1000, 0.033) || 0;
  ultimo = t;
  mover(dt);
  dibujar();
  requestAnimationFrame(ciclo);
}
crearLadrillos(); // pantalla inicial con los ladrillos a la vista
requestAnimationFrame((t) => { ultimo = t; ciclo(t); });
