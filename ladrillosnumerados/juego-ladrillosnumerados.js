// Ruta: ladrillosnumerados/juego-ladrillosnumerados.js
// Pelotas infinitas contra ladrillos numerados. Cada golpe resta 1 al número; al llegar a 0 el ladrillo desaparece.
// Nunca se pierde: toda pelota que cae reaparece sobre la plataforma.

const W = 360, H = 640;
const COLS = 8, ROWS = 12, BW = W / COLS, BH = 24, TOP = 56;
const R = 5;                       // radio de la pelota
const PY = H - 40, PH = 10, PW = 88; // plataforma
const VEL_BASE = 340;              // px/s a velocidad ×1
const MAX_PELOTAS = 400;           // tope para que el juego no se trabe
const ID_JUEGO = "ladrillos";      // id para puntos/ranking (jugador.js)

const $ = (id) => document.getElementById(id);
const cv = $("lienzo");
const ctx = cv.getContext("2d");
const dpr = Math.min(2, window.devicePixelRatio || 1);
cv.width = W * dpr;
cv.height = H * dpr;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

// Puntos con sesión de Google (si no hay conexión o sesión, el juego funciona igual)
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => (sumarPuntos = m.sumarPuntos)).catch(() => {});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ----- Tipos de boost -----
const TIPOS = [
  { t: "x2", txt: "×2", col: "#2ecc71", peso: 25 },
  { t: "x3", txt: "×3", col: "#3498db", peso: 16 },
  { t: "x10", txt: "×10", col: "#e67e22", peso: 7 },
  { t: "rapido", txt: "⚡", col: "#f1c40f", peso: 15 },
  { t: "lento", txt: "🐢", col: "#9b59b6", peso: 15 },
  { t: "menos", txt: "−1", col: "#e74c3c", peso: 12 },
];
const PESO_TOTAL = TIPOS.reduce((s, t) => s + t.peso, 0);
function tipoAzar() {
  let r = Math.random() * PESO_TOTAL;
  for (const t of TIPOS) { if ((r -= t.peso) < 0) return t; }
  return TIPOS[0];
}

// ----- Estado -----
let bricks = [], restantes = 0;
let balls = [], items = [];
let nivel = 1, puntos = 0, pendientes = 0;
let mult = 1;                      // multiplicador de velocidad global
let px = W / 2;                    // centro de la plataforma
let aviso = null;                  // { txt, t }
let tItem = 2;                     // temporizador para generar boosts
const teclas = {};

function nuevoNivel() {
  const f = 1 + (nivel - 1) * 0.9;
  bricks = new Array(COLS * ROWS).fill(null);
  restantes = 0;
  for (let r = 0; r < ROWS; r++) {
    const desdeAbajo = ROWS - r; // 1 (fila de abajo) … 12 (fila de arriba)
    for (let c = 0; c < COLS; c++) {
      if (Math.random() < 0.1) continue; // algunos huecos
      const base = 3.5 * Math.pow(desdeAbajo, 2.2) * f;
      const n = Math.max(1, Math.round(base * (0.75 + Math.random() * 0.5)));
      bricks[r * COLS + c] = { n, f: 0 };
      restantes++;
    }
  }
}

function pelotaEnPlataforma(espera) {
  return { x: px, y: PY - R, vx: 0, vy: 0, espera };
}
function reponer(b) {
  b.x = px; b.y = PY - R; b.vx = 0; b.vy = 0; b.espera = 0.5;
}

function lanzar() {
  for (const b of balls) if (b.espera > 0) b.espera = 0;
}

function crearItem(x, y) {
  if (items.length >= 8) return;
  items.push({ x, y, tipo: tipoAzar() });
}
function itemAlAzar() {
  const y0 = TOP + ROWS * BH + 14, y1 = PY - 50;
  crearItem(24 + Math.random() * (W - 48), y0 + Math.random() * (y1 - y0));
}

function mostrar(txt) { aviso = { txt, t: 1.3 }; }

function multiplicar(k) {
  const actuales = balls.slice();
  for (const b of actuales) {
    for (let j = 1; j < k && balls.length < MAX_PELOTAS; j++) {
      const a = (Math.random() - 0.5) * 1.0;
      const c = Math.cos(a), s = Math.sin(a);
      balls.push({ x: b.x, y: b.y, vx: b.vx * c - b.vy * s, vy: b.vx * s + b.vy * c, espera: b.espera });
    }
  }
}

function quitarUna() {
  if (balls.length > 1) balls.splice((Math.random() * balls.length) | 0, 1);
  else reponer(balls[0]);
}

function aplicar(tipo) {
  switch (tipo.t) {
    case "x2": multiplicar(2); mostrar("¡Pelotas ×2!"); break;
    case "x3": multiplicar(3); mostrar("¡Pelotas ×3!"); break;
    case "x10": multiplicar(10); mostrar("¡Pelotas ×10!"); break;
    case "rapido": mult = Math.min(2.2, mult * 1.3); mostrar("¡Más rápido!"); break;
    case "lento": mult = Math.max(0.5, mult / 1.3); mostrar("Más lento"); break;
    case "menos": quitarUna(); mostrar("−1 pelota"); break;
  }
}

// ----- Puntos -----
function enviarPuntos() {
  if (!sumarPuntos || pendientes <= 0) return;
  const n = Math.min(pendientes, 1000);
  pendientes -= n;
  sumarPuntos(ID_JUEGO, n).catch(() => {});
}
function sumar(p) {
  puntos += p;
  pendientes += p;
  if (pendientes >= 30) enviarPuntos();
}
document.addEventListener("visibilitychange", () => { if (document.hidden) enviarPuntos(); });
addEventListener("pagehide", enviarPuntos);

// ----- Golpe a un ladrillo -----
function golpe(i) {
  const b = bricks[i];
  b.n--;
  b.f = 0.12;
  if (b.n <= 0) {
    const c = i % COLS, r = (i / COLS) | 0;
    bricks[i] = null;
    restantes--;
    sumar(1);
    if (Math.random() < 0.22) crearItem(c * BW + BW / 2, TOP + r * BH + BH / 2);
    if (restantes <= 0) {
      sumar(10 * nivel);
      enviarPuntos();
      nivel++;
      mostrar("¡Nivel " + nivel + "!");
      nuevoNivel();
    }
  }
}

// ----- Física de una pelota (un subpaso) -----
function paso(b, h) {
  b.x += b.vx * h;
  b.y += b.vy * h;

  // paredes y techo
  if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
  else if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); }
  if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy); }

  // plataforma
  if (b.vy > 0 && b.y + R >= PY && b.y - R <= PY + PH && b.y < PY + PH &&
      b.x >= px - PW / 2 - R && b.x <= px + PW / 2 + R) {
    b.y = PY - R;
    const t = clamp((b.x - px) / (PW / 2), -1, 1);
    const ang = t * 1.05; // hasta ~60° desde la vertical
    const v = Math.hypot(b.vx, b.vy) || VEL_BASE * mult;
    b.vx = Math.sin(ang) * v;
    b.vy = -Math.cos(ang) * v;
  }

  // ladrillos (solo se revisan las celdas cercanas)
  if (b.y - R < TOP + ROWS * BH) {
    const c0 = clamp(Math.floor((b.x - R) / BW), 0, COLS - 1);
    const c1 = clamp(Math.floor((b.x + R) / BW), 0, COLS - 1);
    const r0 = clamp(Math.floor((b.y - R - TOP) / BH), 0, ROWS - 1);
    const r1 = clamp(Math.floor((b.y + R - TOP) / BH), 0, ROWS - 1);
    outer:
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * COLS + c;
        if (!bricks[i]) continue;
        const x0 = c * BW + 1, y0 = TOP + r * BH + 1, x1 = x0 + BW - 2, y1 = y0 + BH - 2;
        const cx = clamp(b.x, x0, x1), cy = clamp(b.y, y0, y1);
        const dx = b.x - cx, dy = b.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= R * R) continue;
        let nx, ny;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          nx = dx / d; ny = dy / d;
          b.x += nx * (R - d);
          b.y += ny * (R - d);
        } else {
          // el centro quedó dentro del ladrillo: sale por el lado más cercano
          const l = b.x - x0, rr = x1 - b.x, t = b.y - y0, bb = y1 - b.y;
          const m = Math.min(l, rr, t, bb);
          if (m === l) { nx = -1; ny = 0; b.x = x0 - R; }
          else if (m === rr) { nx = 1; ny = 0; b.x = x1 + R; }
          else if (m === t) { nx = 0; ny = -1; b.y = y0 - R; }
          else { nx = 0; ny = 1; b.y = y1 + R; }
        }
        const dot = b.vx * nx + b.vy * ny;
        if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
        golpe(i);
        break outer; // un ladrillo por subpaso
      }
    }
  }

  // boosts
  for (let k = items.length - 1; k >= 0; k--) {
    const it = items[k];
    const dx = b.x - it.x, dy = b.y - it.y;
    if (dx * dx + dy * dy < (13 + R) * (13 + R)) {
      items.splice(k, 1);
      aplicar(it.tipo);
    }
  }
}

function actualizar(dt) {
  // plataforma con teclado
  if (teclas.ArrowLeft || teclas.a) px -= 420 * dt;
  if (teclas.ArrowRight || teclas.d) px += 420 * dt;
  px = clamp(px, PW / 2, W - PW / 2);

  const v = VEL_BASE * mult;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    if (b.espera > 0) {
      b.x = px; b.y = PY - R;
      b.espera -= dt;
      if (b.espera > 0) continue;
      // lanzamiento hacia arriba con un poco de ángulo al azar
      const a = (Math.random() - 0.5) * 0.7;
      b.vx = Math.sin(a) * v;
      b.vy = -Math.cos(a) * v;
    }
    // mantiene la rapidez al valor global y evita trayectorias casi horizontales
    let s = Math.hypot(b.vx, b.vy) || 1;
    b.vx *= v / s; b.vy *= v / s;
    if (Math.abs(b.vy) < v * 0.2) {
      b.vy = (b.vy < 0 ? -1 : 1) * v * 0.2;
      s = Math.hypot(b.vx, b.vy);
      b.vx *= v / s; b.vy *= v / s;
    }
    const n = Math.max(1, Math.ceil((v * dt) / 3));
    const h = dt / n;
    for (let k = 0; k < n; k++) {
      paso(b, h);
      if (b.y > H + R) { reponer(b); break; } // se cayó: vuelve a la plataforma
    }
  }

  // boosts nuevos cada cierto tiempo
  tItem -= dt;
  if (tItem <= 0) {
    tItem = 3;
    if (items.length < 5) itemAlAzar();
  }
  for (const b of bricks) if (b && b.f > 0) b.f -= dt;
  if (aviso) { aviso.t -= dt; if (aviso.t <= 0) aviso = null; }
}

// ----- Dibujo -----
function colorLadrillo(n) {
  const h = (220 - Math.log10(n) * 65 + 360) % 360;
  return "hsl(" + h.toFixed(0) + ",70%,42%)";
}

function dibujar() {
  ctx.fillStyle = "#0b0e1a";
  ctx.fillRect(0, 0, W, H);

  // ladrillos
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const b = bricks[r * COLS + c];
      if (!b) continue;
      const x = c * BW + 1, y = TOP + r * BH + 1, w = BW - 2, h = BH - 2;
      ctx.fillStyle = colorLadrillo(b.n);
      ctx.fillRect(x, y, w, h);
      if (b.f > 0) { ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.fillRect(x, y, w, h); }
      ctx.fillStyle = "#fff";
      const d = String(b.n).length;
      ctx.font = "bold " + (d <= 3 ? 13 : d === 4 ? 11 : 9) + "px system-ui,sans-serif";
      ctx.fillText(b.n, x + w / 2, y + h / 2 + 1);
    }
  }

  // boosts
  ctx.font = "bold 12px system-ui,sans-serif";
  for (const it of items) {
    ctx.beginPath();
    ctx.arc(it.x, it.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = it.tipo.col;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillText(it.tipo.txt, it.x, it.y + 1);
  }

  // plataforma
  ctx.fillStyle = "#7c5cff";
  ctx.beginPath();
  ctx.roundRect(px - PW / 2, PY, PW, PH, 5);
  ctx.fill();

  // pelotas
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  for (const b of balls) {
    ctx.moveTo(b.x + R, b.y);
    ctx.arc(b.x, b.y, R, 0, Math.PI * 2);
  }
  ctx.fill();

  // mensajes
  if (balls.length && balls[0].espera === Infinity) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px system-ui,sans-serif";
    ctx.fillText("Toca para lanzar", W / 2, PY - 70);
  }
  if (aviso) {
    ctx.globalAlpha = Math.min(1, aviso.t * 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px system-ui,sans-serif";
    ctx.fillText(aviso.txt, W / 2, H / 2 + 60);
    ctx.globalAlpha = 1;
  }
}

function hud() {
  $("puntos").textContent = puntos;
  $("pelotas").textContent = balls.length;
  $("vel").textContent = "×" + mult.toFixed(1);
  $("nivel").textContent = nivel;
}

// ----- Controles -----
function mover(e) {
  const r = cv.getBoundingClientRect();
  px = clamp(((e.clientX - r.left) / r.width) * W, PW / 2, W - PW / 2);
}
cv.addEventListener("pointermove", mover);
cv.addEventListener("pointerdown", (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  mover(e);
  lanzar();
});
addEventListener("keydown", (e) => {
  teclas[e.key] = true;
  if (e.key === " " || e.key === "Enter") lanzar();
});
addEventListener("keyup", (e) => { teclas[e.key] = false; });

// ----- Bucle -----
nuevoNivel();
balls.push(pelotaEnPlataforma(Infinity)); // espera el primer toque
for (let i = 0; i < 3; i++) itemAlAzar();

let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.033, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  dibujar();
  hud();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
