// Ruta: lanzapajaros/juego-lanzapajaros.js
// Lanzapájaros (id de puntos: "lanzapajaros"). Estilo Angry Birds, versión básica:
// arrastra el pájaro hacia atrás y suéltalo. 30 niveles generados con una semilla (iguales para todos).
// Física propia y simple: pájaro y cerdos son círculos; los bloques de madera son cajas que se rompen con los golpes
// y caen si pierden su apoyo.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID = "lanzapajaros", CLAVE = "lanzapajaros_progreso_v1", TOTAL = 30;
const W = 800, H = 450, G = 700, SUELO = 400, AX = 130, AY = 330, MAXP = 70, K = 9, DT = 1 / 120;
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
lienzo.width = 1280; lienzo.height = 720;

// ---------- Progreso (local primero; se sincroniza con la cuenta si se puede) ----------
let prog = leer(), nube = null;
function leer() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE));
    if (p) return { max: Math.min(TOTAL, Math.max(1, p.max | 0)), hecho: Math.min(TOTAL, Math.max(0, p.hecho | 0)), t: p.t || 0 };
  } catch (e) {}
  return { max: 1, hecho: 0, t: 0 };
}
function guardar() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => (!a && !b ? null : { max: Math.max(a?.max || 1, b?.max || 1), hecho: Math.max(a?.hecho || 0, b?.hecho || 0), t: Math.max(a?.t || 0, b?.t || 0) }),
    alCambiar: () => { prog = leer(); if (modo === "menu") armarMenu(); },
  });
}).catch(() => {});

// ---------- Niveles ----------
function rng(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function generar(n) {
  const r = rng(n * 7919 + 13), bloques = [], cerdos = [];
  const torres = Math.min(4, 1 + Math.floor((n + 1) / 5) + (n > 2 ? 1 : 0));
  const ini = torres === 1 ? 560 : torres === 2 ? 500 : 440;
  const maxPisos = Math.min(3, 1 + Math.floor(n / 8));
  for (let i = 0; i < torres; i++) {
    const cx = ini + i * 95, pisos = n < 4 ? 1 : 1 + Math.floor(r() * maxPisos);
    let y = SUELO;
    for (let p = 0; p < pisos; p++) {
      bloques.push({ x: cx - 36, y: y - 48, w: 16, h: 48 }, { x: cx + 20, y: y - 48, w: 16, h: 48 }, { x: cx - 42, y: y - 62, w: 84, h: 14 });
      y -= 62;
    }
    cerdos.push({ x: cx, y: y - 16 });
    if (n >= 3 && r() < 0.6) cerdos.push({ x: cx, y: SUELO - 16 });
  }
  return { bloques, cerdos, pajaros: Math.min(7, cerdos.length + 2) };
}

// ---------- Estado de la partida ----------
let modo = "menu", pausado = false, nivel = 1;
let bloques, cerdos, pajaro, cola, fase, tFase, tGana, puf, arrastrando, puntosNivel;
function iniciarNivel(n) {
  nivel = n;
  const d = generar(n);
  bloques = d.bloques.map((b) => ({ ...b, hp: 520, vy: 0, max: 520 }));
  cerdos = d.cerdos.map((c) => ({ ...c, vx: 0, vy: 0, r: 16, vivo: true }));
  cola = d.pajaros; pajaro = null; puf = []; tGana = 0; arrastrando = false; pausado = false;
  modo = "juego"; ocultar($("menu")); ocultar($("fin")); $("btn-menu").hidden = false;
  siguientePajaro(); hud();
}
function siguientePajaro() {
  if (cola > 0) { cola--; pajaro = { x: AX, y: AY, vx: 0, vy: 0, r: 12, q: 0, t: 0 }; fase = "listo"; }
  else { pajaro = null; fase = "asentar"; tFase = 0; }
  hud();
}
const vivos = () => cerdos.filter((c) => c.vivo).length;
function hud() {
  $("chip-nivel").textContent = "Nivel " + nivel;
  $("chip-pajaros").textContent = "🐦 ×" + (cola + (pajaro ? 1 : 0));
  $("chip-cerdos").textContent = "🐷 ×" + vivos();
}
const ocultar = (e) => { e.hidden = true; }, mostrar = (e) => { e.hidden = false; };

// ---------- Menús ----------
function armarMenu() {
  modo = "menu"; $("btn-menu").hidden = true; ocultar($("fin")); mostrar($("menu"));
  $("btn-continuar").innerHTML = '<span class="b-ico">▶</span> Continuar · nivel ' + prog.max;
  $("btn-continuar").onclick = () => iniciarNivel(prog.max);
  const c = $("niveles"); c.replaceChildren();
  for (let i = 1; i <= TOTAL; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = i;
    b.className = "b3d chico " + (i <= prog.hecho ? "b-verde" : i === prog.max ? "b-oro" : "b-gris");
    b.disabled = i > prog.max;
    b.onclick = () => iniciarNivel(i);
    c.appendChild(b);
  }
  hudVacio();
}
function hudVacio() { $("chip-nivel").textContent = ""; $("chip-pajaros").textContent = ""; $("chip-cerdos").textContent = ""; }

const pausa = crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => modo === "juego",
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "🔁", texto: "Reiniciar nivel", clase: "b-oro", alElegir: () => iniciarNivel(nivel) }],
  alSalir: () => { pausado = false; armarMenu(); },
  ayudaSalir: "Vuelves al menú principal; el progreso de niveles ya está guardado.",
});

function terminar(gano) {
  modo = "fin"; $("btn-menu").hidden = true;
  if (gano) {
    let txt = "";
    if (nivel > prog.hecho) {
      const pts = 100 + 50 * (cola + (pajaro ? 1 : 0));
      encolarPuntos(ID, pts); txt = "+" + pts + " puntos";
      prog.hecho = nivel; prog.max = Math.min(TOTAL, Math.max(prog.max, nivel + 1)); guardar();
    } else txt = "Ya lo habías pasado: no suma puntos.";
    $("fin-titulo").textContent = nivel >= TOTAL ? "🏆 ¡Terminaste todos los niveles!" : "🎉 ¡Nivel superado!";
    $("fin-texto").textContent = txt;
    $("fin-sig").hidden = nivel >= TOTAL;
  } else {
    $("fin-titulo").textContent = "😵 Se acabaron los pájaros";
    $("fin-texto").textContent = "Todavía quedan " + vivos() + " cerdo(s). ¡Inténtalo otra vez!";
    $("fin-sig").hidden = true;
  }
  mostrar($("fin"));
}
$("fin-sig").onclick = () => iniciarNivel(nivel + 1);
$("fin-rep").onclick = () => iniciarNivel(nivel);
$("fin-menu").onclick = () => armarMenu();

// ---------- Física ----------
function matar(c) { if (!c.vivo) return; c.vivo = false; puf.push({ x: c.x, y: c.y, t: 0 }); hud(); }

function choqueCajas(cu, esPajaro) {
  for (const b of bloques) {
    const px = Math.max(b.x, Math.min(cu.x, b.x + b.w)), py = Math.max(b.y, Math.min(cu.y, b.y + b.h));
    let dx = cu.x - px, dy = cu.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 >= cu.r * cu.r) continue;
    let nx, ny;
    if (d2 < 1e-6) { nx = 0; ny = -1; cu.y = b.y - cu.r; }
    else { const d = Math.sqrt(d2); nx = dx / d; ny = dy / d; const pen = cu.r - d; cu.x += nx * pen; cu.y += ny * pen; }
    const rvx = cu.vx, rvy = cu.vy - b.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) continue;
    const imp = -vn;
    if (esPajaro) {
      if (imp > 120) b.hp -= imp;
      if (b.hp <= 0) { bloques.splice(bloques.indexOf(b), 1); cu.vx *= 0.75; cu.vy *= 0.75; puf.push({ x: px, y: py, t: 0, chico: true }); return; }
    } else if (imp > 260) { matar(cu); return; }
    const e = esPajaro ? 0.2 : 0.1;
    cu.vx -= (1 + e) * vn * nx; cu.vy -= (1 + e) * vn * ny;
    const tx = -ny, ty = nx, vt = cu.vx * tx + cu.vy * ty;
    cu.vx -= tx * vt * 0.08; cu.vy -= ty * vt * 0.08;
  }
}

function paso(dt) {
  // bloques: caen si no tienen apoyo
  bloques.sort((a, b) => b.y + b.h - (a.y + a.h));
  for (const b of bloques) {
    let piso = SUELO;
    for (const s of bloques) if (s !== b && s.y >= b.y + b.h - 2 && s.x < b.x + b.w - 1 && s.x + s.w > b.x + 1 && s.y < piso) piso = s.y;
    if (b.y + b.h >= piso - 0.01 && b.vy >= 0) { b.y = piso - b.h; b.vy = 0; }
    else { b.vy += G * dt; b.y += b.vy * dt; if (b.y + b.h > piso) { b.y = piso - b.h; b.vy = 0; } }
  }
  const cuerpos = [];
  if (pajaro && fase !== "listo") cuerpos.push(pajaro);
  for (const c of cerdos) if (c.vivo) cuerpos.push(c);
  for (const cu of cuerpos) {
    const esP = cu === pajaro;
    cu.vy += G * dt; cu.x += cu.vx * dt; cu.y += cu.vy * dt;
    if (cu.y + cu.r > SUELO) {
      const imp = cu.vy; cu.y = SUELO - cu.r;
      if (imp > 0) { if (!esP && imp > 300) { matar(cu); continue; } cu.vy = -imp * 0.25; if (Math.abs(cu.vy) < 30) cu.vy = 0; }
      cu.vx *= 1 - 3 * dt;
    }
    choqueCajas(cu, esP);
    if (!esP && cu.vivo && (cu.x > W + 40 || cu.x < -40)) matar(cu);
  }
  // círculo contra círculo
  for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
    const a = cuerpos[i], b = cuerpos[j];
    if ((a.vivo === false) || (b.vivo === false)) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), s = a.r + b.r;
    if (d >= s || d === 0) continue;
    const nx = dx / d, ny = dy / d, ma = a === pajaro ? 260 : 256, mb = b === pajaro ? 260 : 256, pen = s - d;
    a.x -= nx * pen * mb / (ma + mb); a.y -= ny * pen * mb / (ma + mb);
    b.x += nx * pen * ma / (ma + mb); b.y += ny * pen * ma / (ma + mb);
    const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (vn <= 0) continue;
    const imp = vn, j2 = (1.3 * vn) / (1 / ma + 1 / mb);
    a.vx -= j2 * nx / ma; a.vy -= j2 * ny / ma; b.vx += j2 * nx / mb; b.vy += j2 * ny / mb;
    if (a === pajaro && imp > 90) matar(b);
    else if (b === pajaro && imp > 90) matar(a);
    else if (imp > 300) { matar(a); matar(b); }
  }
}

let acum = 0;
function actualizar(dt) {
  acum += Math.min(dt, 0.05);
  while (acum >= DT) { acum -= DT; if (fase !== "listo" || cerdos.some((c) => c.vivo) || bloques.length) paso(DT); }
  for (const p of puf) p.t += dt;
  puf = puf.filter((p) => p.t < 0.5);

  if (fase === "vuelo") {
    pajaro.t += dt;
    const v = Math.hypot(pajaro.vx, pajaro.vy);
    pajaro.q = v < 25 ? pajaro.q + dt : 0;
    if (pajaro.q > 0.6 || pajaro.t > 8 || pajaro.x > W + 80 || pajaro.x < -80) {
      puf.push({ x: pajaro.x, y: pajaro.y, t: 0, chico: true }); pajaro = null; fase = "asentar"; tFase = 0; hud();
    }
  } else if (fase === "asentar") {
    tFase += dt;
    if (tFase > 1.2) { if (vivos() === 0) return; if (cola > 0) siguientePajaro(); else if (tFase > 2.2) terminar(false); }
  }
  if (fase !== "listo" && vivos() === 0) { tGana += dt; if (tGana > 1) terminar(true); }
}

// ---------- Entrada ----------
const punto = (e) => { const r = lienzo.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
lienzo.addEventListener("pointerdown", (e) => {
  if (modo !== "juego" || pausado || fase !== "listo") return;
  const p = punto(e);
  if (Math.hypot(p.x - pajaro.x, p.y - pajaro.y) < 50) { arrastrando = true; lienzo.setPointerCapture(e.pointerId); e.preventDefault(); }
});
lienzo.addEventListener("pointermove", (e) => {
  if (!arrastrando) return;
  const p = punto(e); let dx = p.x - AX, dy = p.y - AY; const d = Math.hypot(dx, dy);
  if (d > MAXP) { dx = dx / d * MAXP; dy = dy / d * MAXP; }
  pajaro.x = AX + dx; pajaro.y = Math.min(AY + dy, SUELO - pajaro.r);
});
function soltar() {
  if (!arrastrando) return;
  arrastrando = false;
  const dx = AX - pajaro.x, dy = AY - pajaro.y;
  if (Math.hypot(dx, dy) < 14) { pajaro.x = AX; pajaro.y = AY; return; }
  pajaro.vx = dx * K; pajaro.vy = dy * K; pajaro.t = 0; pajaro.q = 0; fase = "vuelo";
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);

// ---------- Dibujo ----------
function circulo(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function dibujarPajaro(x, y, r) {
  circulo(x, y, r, "#e53935"); ctx.strokeStyle = "#8f1c12"; ctx.lineWidth = 2; ctx.stroke();
  circulo(x + 3, y + 2, r * 0.55, "#ffd9c0");
  circulo(x + 2, y - 3, 3.6, "#fff"); circulo(x + 8, y - 3, 3.6, "#fff"); circulo(x + 3, y - 3, 1.6, "#111"); circulo(x + 9, y - 3, 1.6, "#111");
  ctx.fillStyle = "#ffb300"; ctx.beginPath(); ctx.moveTo(x + r - 2, y); ctx.lineTo(x + r + 7, y + 3); ctx.lineTo(x + r - 2, y + 6); ctx.fill();
  ctx.strokeStyle = "#5a1010"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - 1, y - 8); ctx.lineTo(x + 6, y - 6); ctx.moveTo(x + 8, y - 6); ctx.lineTo(x + 12, y - 8); ctx.stroke();
}
function dibujarCerdo(c) {
  circulo(c.x, c.y, c.r, "#6fcf4a"); ctx.strokeStyle = "#2e7d1e"; ctx.lineWidth = 2; ctx.stroke();
  circulo(c.x - 9, c.y - 13, 5, "#6fcf4a"); circulo(c.x + 9, c.y - 13, 5, "#6fcf4a");
  circulo(c.x - 6, c.y - 4, 4.5, "#fff"); circulo(c.x + 6, c.y - 4, 4.5, "#fff"); circulo(c.x - 6, c.y - 4, 2, "#111"); circulo(c.x + 6, c.y - 4, 2, "#111");
  ctx.fillStyle = "#9be07a"; ctx.beginPath(); ctx.ellipse(c.x, c.y + 6, 8, 6, 0, 0, 7); ctx.fill(); ctx.stroke();
  circulo(c.x - 3, c.y + 6, 1.6, "#2e7d1e"); circulo(c.x + 3, c.y + 6, 1.6, "#2e7d1e");
}
function dibujarBloque(b) {
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  g.addColorStop(0, "#d9a15a"); g.addColorStop(1, "#a86a2c");
  ctx.fillStyle = g; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "#5c3512"; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
  ctx.strokeStyle = "rgba(92,53,18,.35)"; ctx.lineWidth = 1; ctx.beginPath();
  if (b.w > b.h) for (let y = b.y + 5; y < b.y + b.h - 2; y += 5) { ctx.moveTo(b.x + 3, y); ctx.lineTo(b.x + b.w - 3, y); }
  else for (let x = b.x + 5; x < b.x + b.w - 2; x += 5) { ctx.moveTo(x, b.y + 3); ctx.lineTo(x, b.y + b.h - 3); }
  ctx.stroke();
  const daño = 1 - b.hp / b.max;
  if (daño > 0.15) { ctx.strokeStyle = "rgba(40,20,5," + Math.min(0.8, daño + 0.2) + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.3, b.y + 2); ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.5); ctx.lineTo(b.x + b.w * 0.4, b.y + b.h - 2); ctx.stroke(); }
}
function dibujar() {
  ctx.setTransform(lienzo.width / W, 0, 0, lienzo.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H); // transparente: se ve la madera
  // suelo
  ctx.fillStyle = "#7a4a22"; ctx.fillRect(0, SUELO, W, H - SUELO);
  ctx.fillStyle = "#4caf3a"; ctx.fillRect(0, SUELO, W, 9);
  ctx.fillStyle = "#2e7d1e"; ctx.fillRect(0, SUELO + 9, W, 3);
  if (modo === "menu" || !bloques) return;
  // tirachinas (parte de atrás)
  ctx.strokeStyle = "#5c3512"; ctx.lineCap = "round"; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(AX, SUELO); ctx.lineTo(AX, AY + 22); ctx.stroke();
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(AX, AY + 24); ctx.lineTo(AX - 12, AY - 4); ctx.moveTo(AX, AY + 24); ctx.lineTo(AX + 12, AY - 4); ctx.stroke();
  // pájaros en espera
  for (let i = 0; i < cola; i++) dibujarPajaro(62 + i * 28, SUELO - 12, 12);
  for (const b of bloques) dibujarBloque(b);
  for (const c of cerdos) if (c.vivo) dibujarCerdo(c);
  if (pajaro) {
    const lig = fase === "listo" || arrastrando;
    if (lig) { ctx.strokeStyle = "#3b1f0a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(AX - 12, AY - 4); ctx.lineTo(pajaro.x - 6, pajaro.y); ctx.moveTo(AX + 12, AY - 4); ctx.lineTo(pajaro.x + 6, pajaro.y); ctx.stroke(); }
    if (arrastrando) {
      const vx = (AX - pajaro.x) * K, vy = (AY - pajaro.y) * K;
      for (let i = 1; i <= 12; i++) { const t = i * 0.07; const x = pajaro.x + vx * t, y = pajaro.y + vy * t + 0.5 * G * t * t; if (y > SUELO) break; circulo(x, y, 2.6, "rgba(255,255,255,.85)"); }
    }
    dibujarPajaro(pajaro.x, pajaro.y, pajaro.r);
  }
  // punta delantera de la tirachinas
  ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(AX + 12, AY - 4); ctx.lineTo(AX + 1, AY + 24); ctx.stroke();
  // humo
  for (const p of puf) {
    const k = p.t / 0.5, r = (p.chico ? 10 : 22) * (0.4 + k);
    ctx.globalAlpha = 1 - k; circulo(p.x, p.y, r, "#f5f5f5"); ctx.globalAlpha = 1;
  }
  ctx.lineCap = "butt";
}

let previo = performance.now();
function bucle(ahora) {
  const dt = (ahora - previo) / 1000; previo = ahora;
  if (modo === "juego" && !pausado) actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}
armarMenu();
requestAnimationFrame(bucle);
