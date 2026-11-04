// Ruta: agario/juego.js
// «Agario»: tú y 45 bots en un mapa enorme. Come puntitos y células más pequeñas para crecer; si te toca una mucho más grande, te come.
// Los ajustes están aquí arriba.

const ID = "agario";

// ---------- AJUSTES ----------
const MUNDO = 6000;              // el mapa mide MUNDO x MUNDO (en píxeles del juego)
const NUM_BOTS = 45;             // bots que juegan solos
const NUM_COMIDA = 2600;         // puntitos de comida repartidos por el mapa
const MASA_INICIAL = 10;         // masa con la que empiezas
const MASA_COMIDA = 1;           // masa que da cada puntito
const MASA_MIN_DIVIDIR = 36;     // una célula necesita al menos esto para poder dividirse
const MAX_CELDAS = 16;           // máximo de pedazos tuyos al mismo tiempo
const TIEMPO_FUSION = 12;        // segundos para que tus pedazos se puedan volver a juntar
const VEL_BASE = 280;            // velocidad = VEL_BASE * masa^-0.25 (px por segundo): más grande = más lento
const VEL_BOTS = 0.96;           // los bots van un poco más lentos que tú (1 = igual)
const IMPULSO_DIVISION = 520;    // «empujón» al dividirte
const FACTOR_COMER = 1.25;       // para comerte a otra célula debes tener 25 % más de masa
const PERDIDA_MASA = 0.002;      // las células grandes pierden este porcentaje de masa por segundo
const CASILLA = 300;             // tamaño de las casillas para buscar comida rápido (no hace falta tocarlo)
const PUNTOS_POR_MASA = 10;      // 1 punto del portal por cada 10 de masa máxima (menos el primero)

const NOMBRES = [
  "Pepe", "Lupita", "Chuy", "Nacho", "Tona", "Memo", "Paco", "Rosa", "Beto", "Güero",
  "Mapache", "Tlacuache", "Colibrí", "Ajolote", "Nopal", "Jaguar", "Coyote", "Quetzal", "Monarca", "Churro",
  "Taco", "Elote", "Mole", "Pozole", "Tamal", "Piñata", "Lucha", "Don Polo", "Mariachi", "Chile",
  "Frijol", "Tuna", "Mango", "Sandía", "Guayaba", "Pitaya", "Tejón", "Zorro", "Halcón", "Venado",
  "Cenzontle", "Armadillo", "Cacomixtle", "Tepezcuintle", "Gallito",
];

// ---------- Perfil (puntos totales del portal) ----------
// Se carga aparte para que el juego funcione aunque falle Firebase.
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => { sumarPuntos = m.sumarPuntos; }).catch(() => {});
let enviadosPerfil = 0;

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const $ = (id) => document.getElementById(id);
let W = 0, H = 0, dpr = 1;
function ajustar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
}
window.addEventListener("resize", ajustar);
ajustar();

let record = 0;
try { record = Number(localStorage.getItem("agario_record")) || 0; } catch (e) {}
const pintarRecord = () => { $("record").textContent = "Récord: " + Math.round(record); };
pintarRecord();
try { $("nombre").value = localStorage.getItem("agario_nombre") || ""; } catch (e) {}

// ---------- Estado ----------
const radio = (m) => 4 * Math.sqrt(m);
const azar = (a, b) => a + Math.random() * (b - a);
let cuerpos = [];                // todas las células (tuyas y de los bots)
let bots = [];
let jug = { tipo: "jugador", nombre: "Jugador", h: 200 };
let jugCeldas = [];
let estado = "inicio";           // "inicio" | "jugando" | "fin"
let t = 0, t0 = 0, maxMasa = 0, comidos = 0;
let cam = { x: MUNDO / 2, y: MUNDO / 2, z: 0.6 };
let tabla = [], tTabla = 0, rango = 0;

// ---------- Comida (repartida en casillas para buscarla rápido) ----------
const GW = Math.ceil(MUNDO / CASILLA);
let casillas = [];
const idxCas = (x, y) => Math.min(GW - 1, Math.floor(y / CASILLA)) * GW + Math.min(GW - 1, Math.floor(x / CASILLA));
function meter(p) { p.k = idxCas(p.x, p.y); casillas[p.k].push(p); }
function crearComida() {
  casillas = Array.from({ length: GW * GW }, () => []);
  for (let i = 0; i < NUM_COMIDA; i++) {
    const h = Math.floor(Math.random() * 360);
    meter({ x: azar(20, MUNDO - 20), y: azar(20, MUNDO - 20), col: "hsl(" + h + ",85%,62%)", k: 0 });
  }
}
function moverComida(p) {
  const a = casillas[p.k];
  a.splice(a.indexOf(p), 1);
  p.x = azar(20, MUNDO - 20); p.y = azar(20, MUNDO - 20);
  meter(p);
}
function comerComida(c) {
  const r = c.r;
  const x0 = Math.max(0, Math.floor((c.x - r) / CASILLA)), x1 = Math.min(GW - 1, Math.floor((c.x + r) / CASILLA));
  const y0 = Math.max(0, Math.floor((c.y - r) / CASILLA)), y1 = Math.min(GW - 1, Math.floor((c.y + r) / CASILLA));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const a = casillas[cy * GW + cx];
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < r * r) { c.m += MASA_COMIDA; moverComida(p); }
    }
  }
}
function comidaCerca(c, rad) {
  const x0 = Math.max(0, Math.floor((c.x - rad) / CASILLA)), x1 = Math.min(GW - 1, Math.floor((c.x + rad) / CASILLA));
  const y0 = Math.max(0, Math.floor((c.y - rad) / CASILLA)), y1 = Math.min(GW - 1, Math.floor((c.y + rad) / CASILLA));
  let mejor = null, md = rad * rad;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    for (const p of casillas[cy * GW + cx]) {
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d < md) { md = d; mejor = p; }
    }
  }
  return mejor;
}

// ---------- Células ----------
function celda(dueno, x, y, m) {
  const c = { dueno, x, y, m, r: radio(m), vx: 0, vy: 0, fusion: 0, muerto: false };
  cuerpos.push(c);
  return c;
}

// Punto del mapa lo más lejos posible de las demás células
function puntoLibre() {
  let mejor = { x: MUNDO / 2, y: MUNDO / 2 }, md = -1;
  for (let i = 0; i < 12; i++) {
    const p = { x: azar(150, MUNDO - 150), y: azar(150, MUNDO - 150) };
    let d = Infinity;
    for (const c of cuerpos) d = Math.min(d, Math.hypot(c.x - p.x, c.y - p.y) - c.r);
    if (d > md) { md = d; mejor = p; }
  }
  return mejor;
}

// ---------- Bots ----------
function nuevoBot(i) {
  return {
    tipo: "bot", nombre: NOMBRES[i % NOMBRES.length], h: Math.floor(Math.random() * 360),
    celda: null, reaparece: Math.random() * 2, prox: 0, dx: 0, dy: 0,
    agresivo: 0.4 + Math.random() * 0.6, vaga: { x: MUNDO / 2, y: MUNDO / 2, hasta: 0 },
  };
}
function aparecerBot(b) {
  const p = puntoLibre();
  const m = MASA_INICIAL + Math.pow(Math.random(), 3) * 300;   // la mayoría empieza chica; algunos ya vienen grandes
  b.celda = celda(b, p.x, p.y, m);
  const a = Math.random() * Math.PI * 2;
  b.dx = Math.cos(a); b.dy = Math.sin(a);
}

// «Cerebro» del bot: huye de las más grandes, persigue a las más chicas y si no, busca comida
function pensar(b) {
  const c = b.celda;
  const alcance = 300 + c.r * 7;
  let fx = 0, fy = 0, amenaza = 0, presa = null, dp = Infinity;
  for (const o of cuerpos) {
    if (o === c || o.muerto || o.dueno === b) continue;
    const dx = o.x - c.x, dy = o.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > alcance + o.r) continue;
    if (o.m > c.m * FACTOR_COMER * 0.95) {          // peligro
      const hueco = d - o.r - c.r;
      const w = Math.max(0, 1 - hueco / (alcance * 0.8));
      if (w > 0) { fx -= (dx / d) * w; fy -= (dy / d) * w; amenaza += w; }
    } else if (c.m > o.m * FACTOR_COMER * 1.08 && d < dp) { presa = o; dp = d; }
  }
  let vx = 0, vy = 0;
  if (amenaza > 0.15) { vx = fx; vy = fy; }
  else if (presa && b.agresivo > 0.35) { vx = presa.x - c.x; vy = presa.y - c.y; }
  else {
    const p = comidaCerca(c, 500 + c.r * 2);
    if (p) { vx = p.x - c.x; vy = p.y - c.y; }
    else {
      if (t > b.vaga.hasta || Math.hypot(b.vaga.x - c.x, b.vaga.y - c.y) < 80) {
        b.vaga = { x: azar(200, MUNDO - 200), y: azar(200, MUNDO - 200), hasta: t + 4 + Math.random() * 5 };
      }
      vx = b.vaga.x - c.x; vy = b.vaga.y - c.y;
    }
  }
  // alejarse de las paredes
  const M = 250;
  const norm = Math.hypot(vx, vy) || 1;
  vx /= norm; vy /= norm;
  if (c.x < M) vx += ((M - c.x) / M) * 2;
  if (c.x > MUNDO - M) vx -= ((c.x - (MUNDO - M)) / M) * 2;
  if (c.y < M) vy += ((M - c.y) / M) * 2;
  if (c.y > MUNDO - M) vy -= ((c.y - (MUNDO - M)) / M) * 2;
  const n2 = Math.hypot(vx, vy) || 1;
  b.dx = vx / n2; b.dy = vy / n2;
}

// ---------- Entrada ----------
const teclas = {};
let raton = { x: 0, y: 0, activo: false };
let joy = null;                  // dedo en pantalla táctil: { ox, oy, x, y }
let ultimaDir = { x: 1, y: 0 };
function leerEntrada() {
  let x = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0), y = (teclas.abajo ? 1 : 0) - (teclas.arriba ? 1 : 0);
  if (!x && !y) {
    if (joy) { x = (joy.x - joy.ox) / 70; y = (joy.y - joy.oy) / 70; }
    else if (raton.activo) { const k = 0.2 * Math.min(W, H); x = (raton.x - W / 2) / k; y = (raton.y - H / 2) / k; }
  }
  const l = Math.hypot(x, y);
  if (l < 0.12) return { x: 0, y: 0 };
  if (l > 1) { x /= l; y /= l; }
  return { x, y };
}
function posPuntero(e) { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
lienzo.addEventListener("pointerdown", (e) => {
  const p = posPuntero(e);
  if (e.pointerType === "mouse") { raton = { ...p, activo: true }; return; }
  lienzo.setPointerCapture(e.pointerId);
  joy = { ox: p.x, oy: p.y, x: p.x, y: p.y };
});
lienzo.addEventListener("pointermove", (e) => {
  const p = posPuntero(e);
  if (e.pointerType === "mouse") { raton = { ...p, activo: true }; return; }
  if (joy) { joy.x = p.x; joy.y = p.y; }
});
const soltar = (e) => { if (e.pointerType !== "mouse") joy = null; };
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);
const mapaTeclas = { ArrowLeft: "izq", a: "izq", A: "izq", ArrowRight: "der", d: "der", D: "der", ArrowUp: "arriba", w: "arriba", W: "arriba", ArrowDown: "abajo", s: "abajo", S: "abajo" };
window.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (mapaTeclas[e.key]) { teclas[mapaTeclas[e.key]] = true; e.preventDefault(); }
  if (e.key === " ") { e.preventDefault(); dividir(); }
});
window.addEventListener("keyup", (e) => { if (mapaTeclas[e.key]) teclas[mapaTeclas[e.key]] = false; });
window.addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; joy = null; });
$("dividir").addEventListener("pointerdown", (e) => { e.preventDefault(); dividir(); });

function dividir() {
  if (estado !== "jugando") return;
  const mias = cuerpos.filter((c) => c.dueno === jug && !c.muerto);
  let total = mias.length;
  for (const c of mias) {
    if (total >= MAX_CELDAS) break;
    if (c.m < MASA_MIN_DIVIDIR) continue;
    c.m /= 2; c.r = radio(c.m);
    const n = celda(jug, c.x, c.y, c.m);
    n.vx = ultimaDir.x * IMPULSO_DIVISION; n.vy = ultimaDir.y * IMPULSO_DIVISION;
    c.fusion = n.fusion = TIEMPO_FUSION;
    total++;
  }
}

// ---------- Partida ----------
function crearMundo() {
  cuerpos = [];
  crearComida();
  bots = Array.from({ length: NUM_BOTS }, (_, i) => nuevoBot(i));
  bots.forEach(aparecerBot);
}

function iniciar() {
  let nombre = ($("nombre").value || "").trim().slice(0, 14) || "Jugador";
  try { localStorage.setItem("agario_nombre", nombre); } catch (e) {}
  for (const c of cuerpos) if (c.dueno === jug) c.muerto = true;
  cuerpos = cuerpos.filter((c) => !c.muerto);
  jug = { tipo: "jugador", nombre, h: Math.floor(Math.random() * 360) };
  const p = puntoLibre();
  celda(jug, p.x, p.y, MASA_INICIAL);
  cam.x = p.x; cam.y = p.y;
  estado = "jugando"; t0 = t; maxMasa = MASA_INICIAL; comidos = 0; enviadosPerfil = 0;
  $("inicio").classList.remove("activo"); $("fin").classList.remove("activo");
  $("dividir").classList.add("activo");
}

function enviarPerfil() {
  const debe = Math.max(0, Math.floor(maxMasa / PUNTOS_POR_MASA) - 1) - enviadosPerfil;
  if (!sumarPuntos || debe <= 0) return 0;
  enviadosPerfil += debe;
  try { Promise.resolve(sumarPuntos(ID, debe)).catch(() => {}); } catch (e) {}
  return debe;
}

function morir() {
  estado = "fin";
  $("dividir").classList.remove("activo");
  const pts = Math.max(0, Math.floor(maxMasa / PUNTOS_POR_MASA) - 1);
  enviarPerfil();
  const seg = Math.round(t - t0);
  $("finTexto").textContent = "Masa máxima: " + Math.round(maxMasa) + " · Tiempo: " + Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0") +
    " · Bots comidos: " + comidos + (pts ? " · +" + pts + " puntos para tu perfil (si entraste con Google en el portal)" : "") +
    (maxMasa >= record && maxMasa > MASA_INICIAL ? ". ¡Nuevo récord!" : ".");
  $("fin").classList.add("activo");
}
$("jugar").addEventListener("click", iniciar);
$("otra").addEventListener("click", iniciar);
$("nombre").addEventListener("keydown", (e) => { if (e.key === "Enter") iniciar(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfil(); });
window.addEventListener("pagehide", () => { if (estado === "jugando") enviarPerfil(); });

// ---------- Actualización ----------
function actualizar(dt) {
  t += dt;
  const ent = estado === "jugando" ? leerEntrada() : { x: 0, y: 0 };
  const el = Math.hypot(ent.x, ent.y);
  if (el > 0) { ultimaDir = { x: ent.x / el, y: ent.y / el }; }

  // Bots: pensar, reaparecer
  for (const b of bots) {
    if (!b.celda) {
      b.reaparece -= dt;
      if (b.reaparece <= 0) aparecerBot(b);
    } else if (t >= b.prox) { pensar(b); b.prox = t + 0.15 + Math.random() * 0.15; }
  }

  // Mover
  const amort = Math.exp(-4 * dt);
  for (const c of cuerpos) {
    c.r = radio(c.m);
    let dx, dy, esc;
    if (c.dueno === jug) { dx = el ? ent.x / el : 0; dy = el ? ent.y / el : 0; esc = Math.min(1, el); }
    else { dx = c.dueno.dx; dy = c.dueno.dy; esc = VEL_BOTS; }
    const v = VEL_BASE * Math.pow(c.m, -0.25);
    c.x += (dx * v * esc + c.vx) * dt;
    c.y += (dy * v * esc + c.vy) * dt;
    c.vx *= amort; c.vy *= amort;
    c.x = Math.max(0, Math.min(MUNDO, c.x));
    c.y = Math.max(0, Math.min(MUNDO, c.y));
    if (c.fusion > 0) c.fusion -= dt;
    if (c.m > 40) c.m -= c.m * PERDIDA_MASA * dt;
  }

  // Tus pedazos: se empujan entre sí y, pasado el tiempo, se juntan
  const mias = cuerpos.filter((c) => c.dueno === jug && !c.muerto);
  for (let i = 0; i < mias.length; i++) for (let j = i + 1; j < mias.length; j++) {
    const a = mias[i], b = mias[j];
    if (a.muerto || b.muerto) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { const ang = Math.random() * Math.PI * 2; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
    const nx = dx / d, ny = dy / d, tot = a.m + b.m;
    if (a.fusion > 0 || b.fusion > 0) {
      if (d < a.r + b.r) {
        const k = (a.r + b.r - d) * Math.min(1, dt * 8);
        a.x -= nx * k * (b.m / tot); a.y -= ny * k * (b.m / tot);
        b.x += nx * k * (a.m / tot); b.y += ny * k * (a.m / tot);
      }
    } else if (d < Math.max(a.r, b.r) * 0.5) {          // se juntan
      a.x = (a.x * a.m + b.x * b.m) / tot; a.y = (a.y * a.m + b.y * b.m) / tot;
      a.m = tot; b.muerto = true;
    } else {                                              // se atraen despacio
      const k = Math.min(d, 90 * dt);
      a.x += nx * k * (b.m / tot); a.y += ny * k * (b.m / tot);
      b.x -= nx * k * (a.m / tot); b.y -= ny * k * (a.m / tot);
    }
  }

  // Comer puntitos
  for (const c of cuerpos) if (!c.muerto) comerComida(c);

  // Comer células
  for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
    const a = cuerpos[i], b = cuerpos[j];
    if (a.muerto || b.muerto || a.dueno === b.dueno) continue;
    const g = a.m >= b.m ? a : b, p = g === a ? b : a;
    if (g.m <= p.m * FACTOR_COMER) continue;
    if (Math.hypot(g.x - p.x, g.y - p.y) < g.r - p.r * 0.4) {
      g.m += p.m; g.r = radio(g.m); p.muerto = true;
      if (p.dueno.tipo === "bot") { p.dueno.celda = null; p.dueno.reaparece = 3 + Math.random() * 4; }
      if (g.dueno === jug && p.dueno.tipo === "bot") comidos++;
    }
  }
  cuerpos = cuerpos.filter((c) => !c.muerto);
  jugCeldas = cuerpos.filter((c) => c.dueno === jug);

  // Estado del jugador
  if (estado === "jugando") {
    const total = jugCeldas.reduce((s, c) => s + c.m, 0);
    if (total > maxMasa) maxMasa = total;
    if (maxMasa > record) { record = maxMasa; try { localStorage.setItem("agario_record", String(Math.round(record))); } catch (e) {} pintarRecord(); }
    if (!jugCeldas.length) morir();
    else $("masa").textContent = "Masa: " + Math.round(total) + (rango ? " · Puesto " + rango : "");
  }

  // Tabla de posiciones
  if (t >= tTabla) {
    tTabla = t + 0.4;
    const lista = bots.filter((b) => b.celda).map((b) => ({ nombre: b.nombre, m: b.celda.m, yo: false }));
    if (jugCeldas.length) lista.push({ nombre: jug.nombre, m: jugCeldas.reduce((s, c) => s + c.m, 0), yo: true });
    lista.sort((a, b) => b.m - a.m);
    tabla = lista.slice(0, 8);
    const i = lista.findIndex((x) => x.yo);
    rango = i >= 0 ? i + 1 : 0;
    if (i >= 8) tabla.push(lista[i]);
  }

  moverCamara(dt);
}

function moverCamara(dt) {
  let cx, cy, tot;
  if (jugCeldas.length) {
    tot = jugCeldas.reduce((s, c) => s + c.m, 0);
    cx = jugCeldas.reduce((s, c) => s + c.x * c.m, 0) / tot;
    cy = jugCeldas.reduce((s, c) => s + c.y * c.m, 0) / tot;
  } else {                                                // en los menús, la cámara sigue a la célula más grande
    let g = null;
    for (const c of cuerpos) if (!g || c.m > g.m) g = c;
    if (!g) return;
    cx = g.x; cy = g.y; tot = g.m;
  }
  const zObj = Math.min(1.2, Math.min(W, H) / (2 * Math.max(320, radio(tot) * 5.2)));
  cam.x += (cx - cam.x) * Math.min(1, dt * 6);
  cam.y += (cy - cam.y) * Math.min(1, dt * 6);
  cam.z += (zObj - cam.z) * Math.min(1, dt * 3);
}

// ---------- Dibujo ----------
function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#070b18"; ctx.fillRect(0, 0, W, H);

  const z = cam.z;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (H / 2 - cam.y * z));
  const vx0 = cam.x - W / 2 / z, vx1 = cam.x + W / 2 / z, vy0 = cam.y - H / 2 / z, vy1 = cam.y + H / 2 / z;

  // Suelo y cuadrícula
  ctx.fillStyle = "#121a33"; ctx.fillRect(0, 0, MUNDO, MUNDO);
  ctx.strokeStyle = "#1c2748"; ctx.lineWidth = 2 / z > 3 ? 3 : 2 / z;
  ctx.beginPath();
  const G = 120;
  for (let x = Math.max(0, Math.floor(vx0 / G) * G); x <= Math.min(MUNDO, vx1); x += G) { ctx.moveTo(x, Math.max(0, vy0)); ctx.lineTo(x, Math.min(MUNDO, vy1)); }
  for (let y = Math.max(0, Math.floor(vy0 / G) * G); y <= Math.min(MUNDO, vy1); y += G) { ctx.moveTo(Math.max(0, vx0), y); ctx.lineTo(Math.min(MUNDO, vx1), y); }
  ctx.stroke();
  ctx.strokeStyle = "#ff5c7a"; ctx.lineWidth = 8; ctx.strokeRect(0, 0, MUNDO, MUNDO);

  // Comida (solo las casillas que se ven)
  const cx0 = Math.max(0, Math.floor(vx0 / CASILLA)), cx1 = Math.min(GW - 1, Math.floor(vx1 / CASILLA));
  const cy0 = Math.max(0, Math.floor(vy0 / CASILLA)), cy1 = Math.min(GW - 1, Math.floor(vy1 / CASILLA));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    for (const p of casillas[cy * GW + cx]) {
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Células: las chicas primero para que las grandes queden encima
  const orden = cuerpos.filter((c) => c.x + c.r > vx0 && c.x - c.r < vx1 && c.y + c.r > vy0 && c.y - c.r < vy1).sort((a, b) => a.m - b.m);
  for (const c of orden) {
    const d = c.dueno, mia = d === jug;
    ctx.fillStyle = "hsl(" + d.h + ",70%,52%)";
    ctx.strokeStyle = mia ? "rgba(255,255,255,.9)" : "hsl(" + d.h + ",70%,34%)";
    ctx.lineWidth = Math.max(3, c.r * 0.07);
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (c.r * z > 13) {
      const tam = Math.max(12, Math.min(c.r * 0.55, 60));
      ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = tam * 0.14; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineJoin = "round";
      ctx.strokeText(d.nombre, c.x, c.y); ctx.fillStyle = "#fff"; ctx.fillText(d.nombre, c.x, c.y);
    }
  }

  // Capa de pantalla
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Tabla de posiciones
  const bx = W - 160, by = 10 + 0;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.roundRect(bx - 6, by, 156, 22 + tabla.length * 18, 10); ctx.fill();
  ctx.font = "700 13px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.fillText("Mejores", bx + 72, by + 12);
  tabla.forEach((f, i) => {
    const y = by + 31 + i * 18;
    ctx.fillStyle = f.yo ? "#ffe066" : "#e6ebff"; ctx.font = (f.yo ? "800 " : "600 ") + "12px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.fillText((i < 8 ? i + 1 : rango) + ". " + f.nombre.slice(0, 11), bx, y);
    ctx.textAlign = "right"; ctx.fillText(String(Math.round(f.m)), bx + 144, y);
  });

  // Minimapa
  if (estado === "jugando") {
    const S = 96, mx = W - S - 12, my = H - S - 64, k = S / MUNDO;
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(mx, my, S, S);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, S, S);
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.strokeRect(mx + Math.max(0, vx0) * k, my + Math.max(0, vy0) * k, Math.min(MUNDO, vx1 - Math.max(0, vx0)) * k, Math.min(MUNDO, vy1 - Math.max(0, vy0)) * k);
    ctx.fillStyle = "#ffe066";
    for (const c of jugCeldas) { ctx.beginPath(); ctx.arc(mx + c.x * k, my + c.y * k, 2.5, 0, Math.PI * 2); ctx.fill(); }
  }

  // Joystick táctil
  if (joy) {
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 70, 0, Math.PI * 2); ctx.stroke();
    const l = Math.min(70, Math.hypot(joy.x - joy.ox, joy.y - joy.oy)), a = Math.atan2(joy.y - joy.oy, joy.x - joy.ox);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * l, joy.oy + Math.sin(a) * l, 22, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- Ciclo ----------
let ultimo = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  dibujar();
}

crearMundo();
requestAnimationFrame(cuadro);
