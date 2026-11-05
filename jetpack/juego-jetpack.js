// Ruta: jetpack/juego-jetpack.js
// Estilo Jetpack Joyride: mantén pulsado (dedo, clic o espacio) para subir; suelta para caer.
import { alCambiarSesion, entrar, salir, sumarPuntos } from "../compartido/jugador.js";

const W = 800, H = 400, TECHO = 30, SUELO = 370, PX = 150, R = 15;
const cv = document.getElementById("lienzo"), c = cv.getContext("2d");
cv.width = W; cv.height = H;
const info = document.getElementById("info");
const rnd = (a, b) => a + Math.random() * (b - a);

let estado = "inicio", y, vy, obs, mon, dist, vel, sigObs, subir = false, nMon = 0, tFin = 0, msg = "", user = null;
let mejor = 0;
try { mejor = Number(localStorage.getItem("jetpack_mejor") || 0); } catch (e) {}

function empezar() {
  y = 200; vy = 0; obs = []; mon = []; dist = 0; vel = 300; sigObs = 500; nMon = 0; msg = ""; estado = "juego";
}

// ---- Generación ----
function crear() {
  const x = W + 80, r = Math.random();
  if (r < 0.55) { // zapper con ángulo
    const a = [0, 0, Math.PI / 2, Math.PI / 4, -Math.PI / 4][Math.floor(Math.random() * 5)];
    obs.push({ t: "z", x, y: rnd(110, 290), L: rnd(90, 170), a });
  } else if (r < 0.8) { // misil con aviso
    obs.push({ t: "m", x: W - 30, y: rnd(60, 340), aviso: 1.2, vivo: false });
  } else { // dos zappers verticales con hueco
    const h = rnd(150, 200), top = rnd(TECHO + 10, SUELO - h - 10);
    obs.push({ t: "z", x, y: top - 60 + 0, L: 120, a: Math.PI / 2 });
    obs.push({ t: "z", x, y: top + h + 60, L: 120, a: Math.PI / 2 });
  }
  if (Math.random() < 0.7) { // fila de monedas
    const n = Math.floor(rnd(5, 11)), y0 = rnd(90, 310), amp = rnd(0, 50), x0 = W + 250;
    for (let i = 0; i < n; i++) mon.push({ x: x0 + i * 34, y: y0 + Math.sin(i * 0.6) * amp });
  }
}
const extremos = (o) => {
  const dx = Math.cos(o.a) * o.L / 2, dy = Math.sin(o.a) * o.L / 2;
  return [o.x - dx, o.y - dy, o.x + dx, o.y + dy];
};
function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ---- Fin ----
async function morir() {
  estado = "fin"; tFin = performance.now();
  const m = Math.floor(dist / 50), puntos = Math.min(1000, m + nMon * 5);
  if (m > mejor) { mejor = m; try { localStorage.setItem("jetpack_mejor", m); } catch (e) {} }
  msg = "";
  if (user) {
    try { await sumarPuntos("jetpack", puntos); msg = "+" + puntos + " puntos guardados"; }
    catch (e) { msg = "No se pudieron guardar los puntos"; }
  } else msg = "Entra con Google para guardar tus puntos";
}

// ---- Actualización ----
function actualizar(dt) {
  vel = Math.min(300 + (dist / 50) * 1.2, 650);
  dist += vel * dt;
  vy += (subir ? -1900 : 1400) * dt;
  vy = Math.max(-430, Math.min(430, vy));
  y += vy * dt;
  if (y < TECHO + R) { y = TECHO + R; vy = 0; }
  if (y > SUELO - R) { y = SUELO - R; vy = 0; }
  if (dist >= sigObs) { crear(); sigObs = dist + rnd(450, 800) + vel * 0.3; }

  for (const o of obs) {
    if (o.t === "z") {
      o.x -= vel * dt;
      const [x1, y1, x2, y2] = extremos(o);
      if (distSeg(PX, y, x1, y1, x2, y2) < R - 3 + 6) morir();
    } else {
      if (!o.vivo) {
        o.aviso -= dt;
        if (o.aviso > 0.5) o.y += Math.sign(y - o.y) * Math.min(Math.abs(y - o.y), 120 * dt);
        if (o.aviso <= 0) { o.vivo = true; o.x = W + 20; }
      } else {
        o.x -= (vel + 380) * dt;
        if (Math.abs(o.x - PX) < 30 && Math.abs(o.y - y) < 20) morir();
      }
    }
  }
  obs = obs.filter((o) => o.x > -200);
  for (const m of mon) {
    m.x -= vel * dt;
    if (!m.c && Math.hypot(m.x - PX, m.y - y) < R + 9) { m.c = true; nMon++; }
  }
  mon = mon.filter((m) => m.x > -20 && !m.c);
}

// ---- Dibujo ----
function dibujar(t) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a2238"); g.addColorStop(1, "#2b3558");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(255,255,255,.06)"; c.lineWidth = 2;
  const off = (dist * 0.5) % 100;
  for (let x = -off; x < W; x += 100) { c.beginPath(); c.moveTo(x, TECHO); c.lineTo(x, SUELO); c.stroke(); }
  c.fillStyle = "#0e1424"; c.fillRect(0, 0, W, TECHO); c.fillRect(0, SUELO, W, H - SUELO);
  c.fillStyle = "#f2c230";
  for (let x = -((dist) % 60); x < W; x += 60) { c.fillRect(x, 0, 30, 6); c.fillRect(x + 30, H - 6, 30, 6); }

  for (const m of mon) { c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(m.x, m.y, 9, 0, 7); c.fill(); c.fillStyle = "#c79a00"; c.fillRect(m.x - 2, m.y - 5, 4, 10); }

  for (const o of obs) {
    if (o.t === "z") {
      const [x1, y1, x2, y2] = extremos(o), j = () => (Math.random() - 0.5) * 6;
      c.strokeStyle = "rgba(255,230,80,.35)"; c.lineWidth = 12; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = "#fff6a0"; c.lineWidth = 3; c.beginPath(); c.moveTo(x1, y1);
      for (let i = 1; i < 6; i++) c.lineTo(x1 + (x2 - x1) * i / 6 + j(), y1 + (y2 - y1) * i / 6 + j());
      c.lineTo(x2, y2); c.stroke();
      c.fillStyle = "#555"; for (const [px, py] of [[x1, y1], [x2, y2]]) { c.beginPath(); c.arc(px, py, 9, 0, 7); c.fill(); }
    } else if (!o.vivo) {
      if (Math.floor(t / 120) % 2) { c.fillStyle = "#ff3b3b"; c.font = "bold 34px system-ui"; c.textAlign = "center"; c.fillText("⚠", W - 30, o.y + 12); }
    } else {
      c.fillStyle = "#c0c4d0"; c.fillRect(o.x - 24, o.y - 7, 40, 14);
      c.fillStyle = "#e23b3b"; c.beginPath(); c.moveTo(o.x - 24, o.y - 7); c.lineTo(o.x - 36, o.y); c.lineTo(o.x - 24, o.y + 7); c.fill();
      c.fillStyle = "#ff9f1c"; c.beginPath(); c.moveTo(o.x + 16, o.y - 7); c.lineTo(o.x + 34 + Math.random() * 8, o.y); c.lineTo(o.x + 16, o.y + 7); c.fill();
    }
  }

  // jugador
  if (estado !== "fin") {
    if (subir && estado === "juego") {
      c.fillStyle = "#ff9f1c"; c.beginPath(); c.moveTo(PX - 14, y + 8); c.lineTo(PX - 22 - Math.random() * 10, y + 28 + Math.random() * 10); c.lineTo(PX - 6, y + 14); c.fill();
    }
    c.fillStyle = "#7a7f92"; c.fillRect(PX - 20, y - 12, 10, 26);
    c.fillStyle = "#3d7cff"; c.fillRect(PX - 11, y - 14, 22, 30);
    c.fillStyle = "#ffd9a8"; c.beginPath(); c.arc(PX + 2, y - 20, 9, 0, 7); c.fill();
    c.fillStyle = "#222"; c.fillRect(PX + 4, y - 23, 7, 5);
  }

  // HUD
  c.fillStyle = "#fff"; c.textAlign = "left"; c.font = "bold 22px system-ui";
  c.fillText(Math.floor(dist / 50) + " m", 14, 26);
  c.textAlign = "right"; c.fillText("🪙 " + nMon, W - 14, 26);
  c.textAlign = "center"; c.font = "14px system-ui"; c.fillStyle = "#aab2d8";
  c.fillText("Mejor: " + mejor + " m", W / 2, 22);

  if (estado !== "juego") {
    c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(0, 0, W, H);
    c.fillStyle = "#fff"; c.textAlign = "center";
    c.font = "bold 40px system-ui";
    c.fillText(estado === "inicio" ? "🚀 Jetpack" : "¡Te atraparon!", W / 2, 140);
    c.font = "20px system-ui";
    if (estado === "inicio") {
      c.fillText("Mantén pulsado para subir, suelta para bajar", W / 2, 190);
      c.fillText("Esquiva zappers y misiles, junta monedas", W / 2, 220);
    } else {
      c.fillText(Math.floor(dist / 50) + " m  ·  🪙 " + nMon, W / 2, 190);
      c.fillText(msg, W / 2, 222);
    }
    c.fillStyle = "#7c5cff"; c.fillText("Toca para " + (estado === "inicio" ? "empezar" : "reintentar"), W / 2, 290);
  }
}

// ---- Bucle ----
let ult = performance.now();
function bucle(t) {
  const dt = Math.min(0.033, (t - ult) / 1000); ult = t;
  if (estado === "juego") actualizar(dt);
  else if (estado === "inicio") { y = 200 + Math.sin(t / 300) * 10; dist += 150 * dt; }
  dibujar(t);
  requestAnimationFrame(bucle);
}
y = 200; vy = 0; obs = []; mon = []; dist = 0;
requestAnimationFrame(bucle);

// ---- Controles ----
function pulsar() {
  if (estado === "juego") subir = true;
  else if (estado === "inicio" || performance.now() - tFin > 600) { empezar(); subir = true; }
}
cv.addEventListener("pointerdown", (e) => { e.preventDefault(); pulsar(); });
addEventListener("pointerup", () => (subir = false));
addEventListener("pointercancel", () => (subir = false));
addEventListener("blur", () => (subir = false));
addEventListener("keydown", (e) => { if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); if (!e.repeat) pulsar(); } });
addEventListener("keyup", (e) => { if (e.code === "Space" || e.code === "ArrowUp") subir = false; });

// ---- Sesión ----
const zona = document.getElementById("sesion");
alCambiarSesion((u) => {
  user = u; zona.innerHTML = "";
  const b = document.createElement("button"); b.className = "btn";
  if (!u) { b.textContent = "Entrar con Google"; b.addEventListener("click", () => entrar().catch((e) => alert(e.message))); zona.appendChild(b); info.textContent = "Sin sesión: no se guardan puntos"; return; }
  b.textContent = "Salir"; b.addEventListener("click", salir);
  const s = document.createElement("span"); s.textContent = (u.displayName || "Jugador") + " · ";
  zona.append(s, b); info.textContent = "Puntos por partida = metros + 5 por moneda (máx. 1000)";
});
