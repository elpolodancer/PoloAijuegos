// Ruta: rana/juego-rana.js
// La rana cruza carreteras y ríos. 50 niveles que se generan solos y suben de dificultad:
//   niveles 1-10: solo carretera (más carriles y más rápidos cada vez; camiones desde el 5, motos desde el 15)
//   niveles 11-50: aparece el río con troncos; desde el 21 hay tortugas que se hunden; el río crece a 2, 3 y 4 carriles
// Ajustes rápidos aquí arriba:
const NIVELES = 50;
const VIDAS = 3;            // vidas por nivel
const T = 40;               // tamaño de cada cuadro
const COLS = 11;            // ancho del mapa en cuadros
const SALTO_T = 0.1;        // segundos que dura un salto
const LW = COLS * T + 6 * T; // largo del carril antes de que los vehículos den la vuelta

const $ = (id) => document.getElementById(id);
const cv = $("c"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1, esc = 1;
function ajustar() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
addEventListener("resize", ajustar);
ajustar();

// ----- Generador de niveles (mismo nivel = mismo mapa siempre) -----
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const COLORES_AUTO = ["#e74c3c", "#f1c40f", "#3498db", "#9b59b6", "#e67e22", "#ecf0f1", "#1abc9c"];

function generar(n) {
  const r = rng(n * 7919 + 13);
  const nCalles = Math.min(6, 2 + Math.floor((n - 1) / 7));
  const nAgua = n < 11 ? 0 : Math.min(4, 1 + Math.floor((n - 11) / 10));
  const base = 42 + n * 1.8;
  const lanes = [{ tipo: "meta", v: 0, items: [] }];
  const signo = r() < 0.5 ? 1 : -1;
  const dirDe = (i) => (i % 2 ? 1 : -1) * signo * (n >= 15 && r() < 0.25 ? -1 : 1);
  const posiciones = (k, off) => Array.from({ length: k }, (_, j) => -3 * T + ((off + (j * LW) / k) % LW));

  for (let i = 0; i < nAgua; i++) {
    const tortuga = n >= 21 && r() < 0.5;
    const largo = tortuga ? 2 + Math.floor(r() * 2) : Math.max(2, 4 - Math.floor(n / 15)) + (r() < 0.5 ? 1 : 0);
    const hueco = 1.4 + r() + n * 0.02;
    const k = Math.max(2, Math.floor(LW / ((largo + hueco) * T)));
    const v = dirDe(i) * (30 + n * 0.9) * (0.75 + r() * 0.5);
    lanes.push({ tipo: "agua", sub: tortuga ? "tortuga" : "tronco", v, items: posiciones(k, r() * LW).map((x) => ({ x, w: largo * T, fase: r() * 6, hundido: false, aviso: false })) });
  }
  if (nAgua) lanes.push({ tipo: "mediana", v: 0, items: [] });
  for (let i = 0; i < nCalles; i++) {
    const pool = ["coche"]; if (n >= 5) pool.push("camion"); if (n >= 15) pool.push("moto");
    const sub = pool[Math.floor(r() * pool.length)];
    const def = { coche: { w: 52, f: 1, extra: 0 }, camion: { w: 92, f: 0.85, extra: 1 }, moto: { w: 30, f: 1.4, extra: 0.6 } }[sub];
    const v = dirDe(i + nAgua) * base * (0.75 + r() * 0.5) * def.f;
    const g = Math.max(3.2, 6.5 - n * 0.06 + (r() - 0.5)) + def.extra; // separación entre vehículos, en cuadros
    const k = Math.max(1, Math.floor(LW / (g * T)));
    lanes.push({ tipo: "calle", sub, v, items: posiciones(k, r() * LW).map((x) => ({ x, w: def.w, color: COLORES_AUTO[Math.floor(r() * COLORES_AUTO.length)] })) });
  }
  lanes.push({ tipo: "inicio", v: 0, items: [] });
  return { n, lanes, filas: lanes.length, tiempo: 25 + lanes.length * 3 };
}

function tema(n) {
  if (n <= 16) return { fuera: "#2d3b2d", pasto: "#5cbf5c", pasto2: "#4daa4d", calle: "#3b3f4a", agua: "#2a9fd6", noche: 0 };
  if (n <= 33) return { fuera: "#3a2c4f", pasto: "#4fa66a", pasto2: "#43925a", calle: "#322e42", agua: "#2a7fb8", noche: 0.18 };
  return { fuera: "#10142a", pasto: "#3d8a5c", pasto2: "#337850", calle: "#262633", agua: "#1f6fa0", noche: 0.35 };
}

// ----- Estado -----
let niv = null, nivelActual = 1, progreso = 1, inicio = 1;
let estado = "menu", vidas = VIDAS, tiempo = 0, tiempoMax = 1, tMuerte = 0, causa = "", reloj = 0;
const rana = { x: 0, fila: 0, cara: 0, salto: null };
let cola = null, th = tema(1);
const cam = { y: 0 };

try { progreso = Math.max(1, Math.min(NIVELES, parseInt(localStorage.getItem("rana-nivel")) || 1)); } catch (e) {}
inicio = progreso;

function cargar(n) {
  nivelActual = n; niv = generar(n); th = tema(n);
  vidas = VIDAS; reiniciarRana(); tiempoMax = tiempo = niv.tiempo;
}
function reiniciarRana() { rana.x = (COLS * T) / 2; rana.fila = niv.filas - 1; rana.cara = 0; rana.salto = null; cola = null; tiempo = tiempoMax || niv.tiempo; }
const cy = (fila) => fila * T + T / 2;

// ----- Controles: teclas, toque (salta adelante) y deslizar -----
const DIRS = { arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3 };
addEventListener("keydown", (e) => {
  const d = DIRS[e.key.toLowerCase()];
  if (d === undefined) return;
  e.preventDefault(); cola = d;
});
let p0 = null;
cv.addEventListener("pointerdown", (e) => { p0 = { x: e.clientX, y: e.clientY, usado: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => {
  if (!p0 || p0.usado) return;
  const dx = e.clientX - p0.x, dy = e.clientY - p0.y;
  if (Math.hypot(dx, dy) > 26) { p0.usado = true; cola = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0; }
});
cv.addEventListener("pointerup", () => { if (p0 && !p0.usado) cola = 0; p0 = null; }); // un toque = salto adelante
cv.addEventListener("pointercancel", () => (p0 = null));

// ----- Reglas -----
function morir(c) {
  if (estado !== "jugando") return;
  vidas--; causa = c; estado = "muerto"; tMuerte = 0;
}
const caja = () => ({ x: rana.x - 12, y: (rana.salto ? rana.salto.yAct : cy(rana.fila)) - 12, w: 24, h: 24 });
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function saltar(d) {
  const nf = rana.fila + (d === 0 ? -1 : d === 2 ? 1 : 0), nx = rana.x + (d === 1 ? T : d === 3 ? -T : 0);
  rana.cara = d;
  if (nf < 0 || nf >= niv.filas || nx < T * 0.3 || nx > COLS * T - T * 0.3) return;
  rana.salto = { x0: rana.x, y0: cy(rana.fila), x1: nx, f1: nf, t: 0, yAct: cy(rana.fila) };
}

function sobrePlataforma(L) { return L.items.find((p) => !p.hundido && rana.x > p.x + 6 && rana.x < p.x + p.w - 6); }

function aterrizar() {
  if (rana.fila === 0) return completar();
  const L = niv.lanes[rana.fila];
  if (L.tipo === "agua" && !sobrePlataforma(L)) morir("agua");
}

function paso(dt) {
  if (estado !== "jugando") return;
  tiempo -= dt;
  if (tiempo <= 0) return morir("tiempo");
  // carriles en movimiento
  for (const L of niv.lanes) for (const it of L.items) {
    it.x += L.v * dt;
    if (L.v > 0 && it.x > COLS * T + 3 * T) it.x -= LW;
    else if (L.v < 0 && it.x + it.w < -3 * T) it.x += LW;
    if (L.sub === "tortuga") { const t = (reloj + it.fase) % 6; it.hundido = t > 4.3 && t < 5.8; it.aviso = t > 3.6 && !it.hundido; }
  }
  // rana
  if (rana.salto) {
    const s = rana.salto; s.t += dt / SALTO_T;
    if (s.t >= 1) { rana.x = s.x1; rana.fila = s.f1; rana.salto = null; aterrizar(); if (estado !== "jugando") return; }
    else { rana.x = s.x0 + (s.x1 - s.x0) * s.t; s.yAct = s.y0 + (cy(s.f1) - s.y0) * s.t; }
  } else {
    if (cola !== null) { saltar(cola); cola = null; }
    const L = niv.lanes[rana.fila];
    if (!rana.salto && L.tipo === "agua") {
      const p = sobrePlataforma(L);
      if (!p) return morir("agua");
      rana.x += L.v * dt;
      if (rana.x < 0 || rana.x > COLS * T) return morir("agua");
    }
  }
  // atropellos: carril actual y el de destino mientras salta
  const filas = rana.salto ? [rana.fila, rana.salto.f1] : [rana.fila];
  const c = caja();
  for (const f of filas) {
    const L = niv.lanes[f];
    if (L.tipo !== "calle") continue;
    for (const it of L.items) if (ov(c, { x: it.x + 2, y: f * T + 7, w: it.w - 4, h: T - 14 })) return morir("auto");
  }
}

async function completar() {
  estado = "ganado";
  const puntos = 100 + vidas * 50 + Math.floor(tiempo) * 3;
  const ultimo = nivelActual >= NIVELES;
  if (!ultimo && nivelActual + 1 > progreso) { progreso = nivelActual + 1; try { localStorage.setItem("rana-nivel", String(progreso)); } catch (e) {} }
  inicio = ultimo ? 1 : nivelActual + 1;
  $("fin").querySelector("h2").textContent = ultimo ? "🏆 ¡Completaste los 50 niveles!" : "¡Nivel " + nivelActual + " completo!";
  $("texto").textContent = "Vidas que te sobraron: " + vidas + " · Tiempo: " + Math.floor(tiempo) + " s · Puntos: " + puntos;
  $("jugar").textContent = ultimo ? "Jugar otra vez" : "Siguiente nivel";
  armarNiveles(); $("msg").textContent = "";
  $("fin").hidden = false; $("hud").hidden = true;
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    const ok = await sumarPuntos("rana", puntos);
    $("msg").textContent = ok ? "Puntos guardados en tu perfil." : "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) { $("msg").textContent = "No se pudieron guardar los puntos (sin conexión)."; }
}

function sinVidas() {
  estado = "perdido";
  $("fin").querySelector("h2").textContent = "Sin vidas en el nivel " + nivelActual;
  $("texto").textContent = "¡Inténtalo otra vez! Fíjate en el ritmo de los vehículos antes de saltar.";
  inicio = nivelActual; $("jugar").textContent = "Reintentar"; armarNiveles(); $("msg").textContent = "";
  $("fin").hidden = false; $("hud").hidden = true;
}

function empezar() { cargar(inicio); estado = "jugando"; $("fin").hidden = true; $("hud").hidden = false; }

// ----- Menú: elegir nivel (solo los ya desbloqueados) -----
function armarNiveles() {
  const cont = $("niveles"); cont.innerHTML = "";
  for (let i = 1; i <= NIVELES; i++) {
    const b = document.createElement("button");
    b.className = "btn" + (i === inicio ? " sel" : ""); b.textContent = i; b.disabled = i > progreso;
    b.addEventListener("click", () => { inicio = i; armarNiveles(); });
    cont.appendChild(b);
  }
}
armarNiveles();
$("jugar").addEventListener("click", empezar);
cargar(inicio);

// ----- Dibujo -----
function elipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }

function dibujarVehiculo(L, it, y) {
  ctx.save();
  ctx.translate(it.x + it.w / 2, y + T / 2);
  if (L.v < 0) ctx.scale(-1, 1); // el frente siempre mira hacia donde avanza
  if (L.sub === "coche") {
    ctx.fillStyle = it.color; ctx.fillRect(-26, -11, 52, 22);
    ctx.fillStyle = "#bfe9ff"; ctx.fillRect(2, -8, 13, 16); ctx.fillRect(-14, -8, 10, 16);
    ctx.fillStyle = "#ffe97a"; ctx.fillRect(23, -9, 3, 5); ctx.fillRect(23, 4, 3, 5);
    ctx.fillStyle = "#111"; elipse(-14, 11, 5, 3); elipse(14, 11, 5, 3);
  } else if (L.sub === "camion") {
    ctx.fillStyle = "#dfe4ea"; ctx.fillRect(-46, -13, 62, 26);
    ctx.fillStyle = it.color; ctx.fillRect(18, -11, 28, 22);
    ctx.fillStyle = "#bfe9ff"; ctx.fillRect(34, -8, 9, 14);
    ctx.fillStyle = "#ffe97a"; ctx.fillRect(44, -9, 2, 5);
    ctx.fillStyle = "#111"; elipse(-32, 13, 5, 3); elipse(-12, 13, 5, 3); elipse(32, 13, 5, 3);
  } else {
    ctx.fillStyle = "#111"; elipse(-10, 7, 6, 6); elipse(10, 7, 6, 6);
    ctx.fillStyle = it.color; ctx.fillRect(-9, -2, 20, 7);
    ctx.fillStyle = "#f5cba7"; elipse(-1, -8, 4, 4);
    ctx.fillStyle = it.color; ctx.fillRect(-4, -5, 7, 8);
  }
  ctx.restore();
}

function dibujarPlataforma(L, it, y) {
  if (L.sub === "tronco") {
    ctx.fillStyle = "#8b5a2b"; ctx.fillRect(it.x, y + 6, it.w, T - 12);
    ctx.fillStyle = "#a9733c"; ctx.fillRect(it.x, y + 6, it.w, 6);
    ctx.fillStyle = "#6e4420";
    for (let x = it.x + 10; x < it.x + it.w - 6; x += 22) ctx.fillRect(x, y + 17, 10, 3);
    ctx.fillStyle = "#c58d52"; elipse(it.x + 3, y + T / 2, 5, (T - 12) / 2); elipse(it.x + it.w - 3, y + T / 2, 5, (T - 12) / 2);
  } else {
    const n = Math.round(it.w / T);
    ctx.globalAlpha = it.hundido ? 0.25 : 1;
    for (let k = 0; k < n; k++) {
      const x = it.x + k * T + T / 2, tem = it.aviso ? Math.sin(reloj * 40) * 1.5 : 0;
      ctx.fillStyle = it.aviso ? "#7aa84a" : "#2e8b57"; elipse(x + tem, y + T / 2, 16, 14);
      ctx.fillStyle = "#1f6b42"; elipse(x + tem, y + T / 2, 9, 8);
      ctx.fillStyle = "#3aa86b"; elipse(x + tem + (L.v > 0 ? 15 : -15), y + T / 2, 5, 5);
    }
    ctx.globalAlpha = 1;
  }
}

function dibujarRana(x, y, cara, k) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate((cara * Math.PI) / 2);
  const s = 1 + 0.3 * k; ctx.scale(s, s);
  ctx.fillStyle = "#2e9a3a"; elipse(-11, 8, 6, 4); elipse(11, 8, 6, 4); elipse(-10, -6, 4, 3); elipse(10, -6, 4, 3);
  ctx.fillStyle = "#58d268"; elipse(0, 0, 10, 12);
  ctx.fillStyle = "#b9f5c2"; elipse(0, 3, 5, 6);
  ctx.fillStyle = "#fff"; elipse(-5, -9, 4, 4); elipse(5, -9, 4, 4);
  ctx.fillStyle = "#111"; elipse(-5, -10, 2, 2); elipse(5, -10, 2, 2);
  ctx.restore();
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = th.fuera; ctx.fillRect(0, 0, W, H);
  const filas = niv.filas, mundoH = filas * T;
  esc = Math.min(W / (COLS * T), H / (Math.min(filas, 9) * T));
  const viewH = H / esc, ox = (W - COLS * T * esc) / 2;
  const yRana = rana.salto ? rana.salto.yAct : cy(rana.fila);
  const objetivo = mundoH <= viewH ? (mundoH - viewH) / 2 : Math.max(0, Math.min(mundoH - viewH, yRana - viewH * 0.62));
  cam.y += (objetivo - cam.y) * 0.2;
  ctx.setTransform(dpr * esc, 0, 0, dpr * esc, ox * dpr, -cam.y * esc * dpr);
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, COLS * T, mundoH); ctx.clip();

  niv.lanes.forEach((L, i) => {
    const y = i * T;
    if (L.tipo === "meta" || L.tipo === "inicio" || L.tipo === "mediana") {
      ctx.fillStyle = th.pasto; ctx.fillRect(0, y, COLS * T, T);
      ctx.fillStyle = th.pasto2;
      for (let x = 0; x < COLS * T; x += 20) if (((x / 20 + i) | 0) % 3 === 0) ctx.fillRect(x + 4, y + 9 + ((x * 7) % 18), 4, 4);
      if (L.tipo === "meta") { for (let x = 0; x < COLS * 2; x++) { ctx.fillStyle = x % 2 ? "#fff" : "#222"; ctx.fillRect(x * 20, y, 20, 8); } }
    } else if (L.tipo === "calle") {
      ctx.fillStyle = th.calle; ctx.fillRect(0, y, COLS * T, T);
      if (niv.lanes[i - 1] && niv.lanes[i - 1].tipo === "calle") { ctx.fillStyle = "rgba(255,255,255,.45)"; for (let x = 0; x < COLS * T; x += 30) ctx.fillRect(x, y - 1, 16, 2); }
    } else {
      ctx.fillStyle = th.agua; ctx.fillRect(0, y, COLS * T, T);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x < COLS * T; x += 44) { const xx = x + ((reloj * 12 * (i % 2 ? 1 : -1)) % 44); ctx.moveTo(xx, y + 12); ctx.quadraticCurveTo(xx + 6, y + 7, xx + 12, y + 12); ctx.moveTo(xx + 20, y + 30); ctx.quadraticCurveTo(xx + 26, y + 25, xx + 32, y + 30); }
      ctx.stroke();
    }
  });
  niv.lanes.forEach((L, i) => {
    for (const it of L.items) (L.tipo === "calle" ? dibujarVehiculo : dibujarPlataforma)(L, it, i * T);
  });

  const k = rana.salto ? Math.sin(Math.PI * Math.min(1, rana.salto.t)) : 0;
  if (estado === "muerto") {
    ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#000";
    ctx.fillText(causa === "agua" ? "💦" : causa === "tiempo" ? "⏰" : "💥", rana.x, yRana);
  } else dibujarRana(rana.x, yRana, rana.cara, k);
  ctx.restore();

  // noche
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (th.noche) { ctx.fillStyle = "rgba(5,10,40," + th.noche + ")"; ctx.fillRect(ox, 0, COLS * T * esc, H); }
  // barra de tiempo
  const f = Math.max(0, tiempo / tiempoMax);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(0, 0, W, 5);
  ctx.fillStyle = f > 0.3 ? "#6be36b" : "#ff6a4d"; ctx.fillRect(0, 0, W * f, 5);
  const txt = "Nivel " + nivelActual + "  ·  " + "❤️".repeat(Math.max(0, vidas)) + "  ·  " + Math.ceil(Math.max(0, tiempo)) + " s";
  const h = $("hud"); if (h.textContent !== txt) h.textContent = txt;
}

// ----- Bucle -----
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora; reloj += dt;
  if (estado === "jugando") { const n = Math.ceil(dt / (1 / 120)); for (let i = 0; i < n; i++) paso(dt / n); }
  else if (estado === "muerto") {
    tMuerte += dt;
    if (tMuerte > 0.8) { if (vidas <= 0) sinVidas(); else { reiniciarRana(); estado = "jugando"; } }
  } else for (const L of niv.lanes) for (const it of L.items) { // el fondo sigue moviéndose en los menús
    it.x += L.v * dt;
    if (L.v > 0 && it.x > COLS * T + 3 * T) it.x -= LW; else if (L.v < 0 && it.x + it.w < -3 * T) it.x += LW;
  }
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
