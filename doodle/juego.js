// Ruta: doodle/juego.js (lógica del juego «doodle»: saltar de plataforma en plataforma, estilo Doodle Jump)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "doodle"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");

// ---- Ajustes (aquí se afina el juego) ----
const G = 1500, SALTO = -720, VX = 260, TAM = 34, PW = 64, PH = 12; // el salto normal alcanza ~173 px
const SALTO_DOBLE = SALTO * 1.45;        // trampolín: la altura crece con v², así que sube ≈ el doble
const METRO = 10;                        // 10 px = 1 metro
const GORRO_METROS = 100, GORRO_V = 650; // el gorro te impulsa exactamente 100 m
const EW = 38, EH = 30;                  // tamaño de los enemigos
const PUNTOS_MONEDA = 5, PUNTOS_ENEMIGO = 10;
const COLOR = { normal: "#3cb043", movil: "#2e86de", rompible: "#a8743f", unica: "#f4f6fa", trampolin: "#e67e22" };

let usuario = null, p, plats, enemigos, monedas, caidos, cam, y0, maxAlt, techo, proxGorro, gorro, t, nMonedas, nEnemigos;
let dir = 0, vivo = false, ultimo = 0;

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

const rand = (a, b) => a + Math.random() * (b - a);
const metros = () => Math.floor(maxAlt / METRO);
const puntos = () => metros() + nMonedas * PUNTOS_MONEDA + nEnemigos * PUNTOS_ENEMIGO;

// ---------- Generación del nivel ----------
function crearPlat(tipo, y, x = rand(0, W - PW)) {
  return { tipo, x, y, vx: tipo === "movil" ? (Math.random() < 0.5 ? -70 : 70) : 0, comp: 0 };
}
function elegirTipo(d, alt) {
  if (alt < 15) return "normal"; // el inicio es tranquilo
  const r = Math.random(), tramp = 0.07, movil = 0.10 + 0.15 * d, unica = 0.07 + 0.10 * d;
  if (r < tramp) return "trampolin";
  if (r < tramp + movil) return "movil";
  if (r < tramp + movil + unica) return "unica";
  return "normal";
}
// Cada fila tiene SIEMPRE una plataforma sólida alcanzable (normal, móvil, trampolín o de un solo salto).
// Las que se rompen son extras "trampa" entre filas, así que nunca bloquean el camino.
function generarFila() {
  const d = Math.min(1, (y0 - techo) / METRO / 1500); // dificultad: sube hasta los 1500 m
  const hueco = rand(55, 90 + 55 * d);                 // máx. 145 px < 173 px de alcance
  const yPrev = techo;
  techo -= hueco;
  const alt = (y0 - techo) / METRO;
  const conGorro = alt >= proxGorro;
  const q = crearPlat(conGorro ? "normal" : elegirTipo(d, alt), techo);
  if (conGorro) { q.gorro = true; proxGorro = alt + rand(350, 700); }
  plats.push(q);
  if (alt > 30 && Math.random() < 0.2 + 0.25 * d) { // plataforma trampa que se rompe
    let x = rand(0, W - PW);
    if (Math.abs(x - q.x) < PW + 10) x = (q.x + W / 2) % (W - PW);
    plats.push(crearPlat("rompible", yPrev - hueco * rand(0.3, 0.7), x));
  }
  if (!conGorro && Math.random() < 0.35) monedas.push({ x: q.x + PW / 2, y: techo - rand(30, 70), fase: rand(0, 6) });
  if (Math.random() < 0.06) { // hilera de 3 monedas
    const x = rand(30, W - 30);
    for (let i = 0; i < 3; i++) monedas.push({ x, y: techo + hueco * 0.5 - i * 26, fase: i });
  }
  if (alt > 50 && Math.random() < 0.10 + 0.15 * d) { // enemigo entre filas
    const vuela = Math.random() < 0.4;
    enemigos.push({ tipo: vuela ? "murcielago" : "monstruo", x: rand(0, W - EW), y: techo + hueco * 0.5 - EH / 2, vx: vuela ? (Math.random() < 0.5 ? -80 : 80) : 0 });
  }
}
function preparar() {
  y0 = H - 100;
  p = { x: W / 2 - TAM / 2, y: y0, vy: SALTO };
  plats = [{ tipo: "normal", x: W / 2 - PW / 2, y: H - 60, vx: 0, comp: 0 }];
  enemigos = []; monedas = []; caidos = [];
  cam = 0; maxAlt = 0; techo = H - 60; proxGorro = 60; gorro = null; t = 0; nMonedas = 0; nEnemigos = 0;
  while (techo > cam - 120) generarFila();
}
function empezar() {
  preparar();
  dir = 0; vivo = true; ultimo = performance.now();
  jugar.hidden = true;
  estado.textContent = "";
  requestAnimationFrame(ciclo);
}

// ---------- Lógica ----------
function aterrizar(q) {
  if (q.tipo === "rompible") { // se rompe y NO te deja saltar
    q.roto = true;
    for (let m = 0; m < 2; m++) caidos.push({ tipo: "plat", x: q.x + m * PW / 2 + PW / 4, y: q.y + PH / 2, vx: m ? 50 : -50, vy: 0, rot: 0, w: m ? 3 : -3 });
  } else if (q.tipo === "trampolin") { p.vy = SALTO_DOBLE; q.comp = 0.25; }
  else if (q.tipo === "unica") { p.vy = SALTO; q.fade = 0.2; } // solo sirve una vez
  else p.vy = SALTO;
}
function soltarGorro() {
  caidos.push({ tipo: "gorro", x: p.x + TAM / 2, y: p.y, vx: rand(-60, 60), vy: -250, rot: 0, w: 6 });
  gorro = null;
  p.vy = -120;
}
function volar(dt) {
  const total = GORRO_METROS * METRO, resta = total - (gorro.y0 - p.y);
  const v = resta < 120 ? GORRO_V * (0.35 + 0.65 * Math.max(0, resta) / 120) : GORRO_V; // frena suave al final
  p.vy = -v;
  p.y -= v * dt;
  if (gorro.y0 - p.y >= total) { p.y = gorro.y0 - total; soltarGorro(); }
}
function matar(e) {
  e.muerto = true;
  nEnemigos++;
  caidos.push({ tipo: "enemigo", sub: e.tipo, x: e.x + EW / 2, y: e.y + EH / 2, vx: rand(-40, 40), vy: -200, rot: 0, w: 5 });
}
function mover(dt) {
  t += dt;
  const previo = p.y + TAM;
  if (gorro) volar(dt); else { p.vy += G * dt; p.y += p.vy * dt; }
  p.x += dir * VX * dt;
  if (p.x < -TAM) p.x = W; else if (p.x > W) p.x = -TAM;

  for (const q of plats) {
    if (q.vx) {
      q.x += q.vx * dt;
      if (q.x < 0) { q.x = 0; q.vx = Math.abs(q.vx); } else if (q.x > W - PW) { q.x = W - PW; q.vx = -Math.abs(q.vx); }
    }
    if (q.comp > 0) q.comp -= dt;
    if (q.fade !== undefined) { q.fade -= dt; continue; }
    const tope = q.tipo === "trampolin" ? q.y - 12 : q.y; // el resorte queda por encima de la base
    // Solo rebota si va cayendo y cruzó la plataforma por arriba
    if (!gorro && p.vy > 0 && previo <= tope && p.y + TAM >= tope && p.x + TAM - 6 > q.x && p.x + 6 < q.x + PW) aterrizar(q);
    if (q.gorro && !gorro && Math.hypot(p.x + TAM / 2 - (q.x + PW / 2), p.y + TAM / 2 - (q.y - 18)) < 30) {
      q.gorro = false;
      gorro = { y0: p.y };
    }
  }
  plats = plats.filter((q) => !q.roto && !(q.fade !== undefined && q.fade <= 0) && q.y - cam < H + 40);

  for (const e of enemigos) {
    if (e.vx) {
      e.x += e.vx * dt;
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); } else if (e.x > W - EW) { e.x = W - EW; e.vx = -Math.abs(e.vx); }
    }
    if (p.x + 4 < e.x + EW && p.x + TAM - 4 > e.x && p.y + 4 < e.y + EH && p.y + TAM > e.y) {
      if (gorro) matar(e);                                         // con el gorro eres invencible
      else if (p.vy > 0 && previo <= e.y + EH * 0.5) { matar(e); p.vy = SALTO; } // pisotón
      else { fin(); return; }
    }
  }
  enemigos = enemigos.filter((e) => !e.muerto && e.y - cam < H + 60);

  for (const c of monedas) if (Math.hypot(p.x + TAM / 2 - c.x, p.y + TAM / 2 - c.y) < 24) { c.tomada = true; nMonedas++; }
  monedas = monedas.filter((c) => !c.tomada && c.y - cam < H + 40);

  for (const c of caidos) { c.vy += G * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.w * dt; }
  caidos = caidos.filter((c) => c.y - cam < H + 80);

  maxAlt = Math.max(maxAlt, y0 - p.y);
  cam = Math.min(cam, p.y - H * 0.4);
  while (techo > cam - 120) generarFila();
  if (p.y - cam > H) fin();
}

// ---------- Dibujo ----------
function circ(x, y, r, color) { cx.fillStyle = color; cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill(); }
function fondo() {
  const k = Math.min(1, metros() / 800); // el cielo se oscurece al subir
  const m = (a, b) => Math.round(a + (b - a) * k);
  cx.fillStyle = `rgb(${m(233, 10)},${m(246, 14)},${m(255, 40)})`;
  cx.fillRect(0, 0, W, H);
  if (k > 0.3) {
    cx.fillStyle = `rgba(255,255,255,${(k - 0.3) / 0.7})`;
    for (let i = 0; i < 40; i++) cx.fillRect((i * 67) % W, ((i * 131) % H + -cam * 0.15) % H, 2, 2);
  }
  if (k < 0.6) {
    cx.globalAlpha = 0.8 * (1 - k / 0.6);
    for (let i = 0; i < 4; i++) {
      const x = (i * 140 + 30) % W, y = ((i * 190 + -cam * 0.3) % (H + 80)) - 40;
      circ(x, y, 18, "#fff"); circ(x + 20, y + 4, 14, "#fff"); circ(x - 20, y + 5, 12, "#fff");
    }
    cx.globalAlpha = 1;
  }
}
// Gorro con hélice; el origen (0,0) es su centro
function dibGorro(giro = 1) {
  cx.fillStyle = "#e53935"; cx.beginPath(); cx.arc(0, 4, 15, Math.PI, 0); cx.closePath(); cx.fill();
  cx.fillStyle = "#fff"; cx.beginPath(); cx.roundRect(-15, 1, 30, 6, 3); cx.fill();
  cx.fillStyle = "#555"; cx.fillRect(-1, -17, 2, 7);
  cx.fillStyle = "#f2c200"; cx.beginPath(); cx.ellipse(0, -17, Math.max(2, 17 * Math.abs(Math.cos(t * 35 * giro))), 2.5, 0, 0, Math.PI * 2); cx.fill();
}
function dibEnemigo(tipo) { // el origen (0,0) es su centro
  if (tipo === "monstruo") {
    cx.fillStyle = "#6c3483"; cx.beginPath(); cx.moveTo(-14, -12); cx.lineTo(-10, -22); cx.lineTo(-4, -13); cx.moveTo(14, -12); cx.lineTo(10, -22); cx.lineTo(4, -13); cx.fill();
    cx.fillStyle = "#8e44ad"; cx.beginPath(); cx.roundRect(-19, -15, 38, 30, [14, 14, 6, 6]); cx.fill();
    circ(-8, -5, 6, "#fff"); circ(8, -5, 6, "#fff"); circ(-7, -4, 3, "#111"); circ(9, -4, 3, "#111");
    cx.fillStyle = "#111"; cx.fillRect(-10, 5, 20, 6);
    cx.fillStyle = "#fff"; cx.fillRect(-8, 5, 4, 3); cx.fillRect(-2, 5, 4, 3); cx.fillRect(4, 5, 4, 3);
  } else {
    const ala = Math.sin(t * 14) * 9;
    cx.fillStyle = "#34495e";
    cx.beginPath(); cx.moveTo(-6, -6); cx.lineTo(-26, -10 + ala); cx.lineTo(-8, 8); cx.fill();
    cx.beginPath(); cx.moveTo(6, -6); cx.lineTo(26, -10 + ala); cx.lineTo(8, 8); cx.fill();
    cx.beginPath(); cx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.moveTo(-9, -9); cx.lineTo(-7, -18); cx.lineTo(-2, -11); cx.moveTo(9, -9); cx.lineTo(7, -18); cx.lineTo(2, -11); cx.fill();
    circ(-4, -2, 3, "#ff4d4d"); circ(4, -2, 3, "#ff4d4d");
  }
}
function dibPlat(q) {
  const y = q.y - cam;
  cx.save();
  if (q.fade !== undefined) cx.globalAlpha = Math.max(0, q.fade / 0.2);
  cx.fillStyle = COLOR[q.tipo];
  cx.beginPath(); cx.roundRect(q.x, y, PW, PH, 6); cx.fill();
  if (q.tipo === "unica") { cx.strokeStyle = "#9aa6b8"; cx.lineWidth = 2; cx.stroke(); }
  if (q.tipo === "rompible") {
    cx.strokeStyle = "#5b3a1a"; cx.lineWidth = 2; cx.beginPath();
    cx.moveTo(q.x + 20, y); cx.lineTo(q.x + 26, y + 6); cx.lineTo(q.x + 22, y + PH);
    cx.moveTo(q.x + 42, y); cx.lineTo(q.x + 38, y + 5); cx.lineTo(q.x + 44, y + PH);
    cx.stroke();
  }
  if (q.tipo === "trampolin") {
    const h = q.comp > 0 ? 4 : 10, mx = q.x + PW / 2;
    cx.strokeStyle = "#555"; cx.lineWidth = 3; cx.beginPath();
    cx.moveTo(mx - 9, y); cx.lineTo(mx + 9, y - h * 0.33); cx.lineTo(mx - 9, y - h * 0.66); cx.lineTo(mx + 9, y - h);
    cx.stroke();
    cx.fillStyle = "#e74c3c"; cx.beginPath(); cx.roundRect(mx - 14, y - h - 4, 28, 5, 2); cx.fill();
  }
  cx.restore();
  if (q.gorro) { cx.save(); cx.translate(q.x + PW / 2, y - 18 + Math.sin(t * 4) * 3); dibGorro(0.15); cx.restore(); }
}
function texto(s, x, y, alinear, tam = 22) {
  cx.font = `bold ${tam}px system-ui`; cx.textAlign = alinear;
  cx.lineWidth = 4; cx.strokeStyle = "rgba(0,0,0,.45)"; cx.strokeText(s, x, y);
  cx.fillStyle = "#fff"; cx.fillText(s, x, y);
}
function dibujar() {
  fondo();
  plats.forEach(dibPlat);
  monedas.forEach((c) => {
    cx.save(); cx.translate(c.x, c.y - cam);
    const rx = Math.max(2.5, 9 * Math.abs(Math.cos(t * 5 + c.fase)));
    cx.fillStyle = "#f5b301"; cx.beginPath(); cx.ellipse(0, 0, rx, 9, 0, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = "#b07d00"; cx.lineWidth = 2; cx.stroke();
    cx.restore();
  });
  enemigos.forEach((e) => { cx.save(); cx.translate(e.x + EW / 2, e.y - cam + EH / 2); dibEnemigo(e.tipo); cx.restore(); });
  caidos.forEach((c) => {
    cx.save(); cx.translate(c.x, c.y - cam); cx.rotate(c.rot);
    if (c.tipo === "plat") { cx.fillStyle = COLOR.rompible; cx.fillRect(-PW / 4, -PH / 2, PW / 2, PH); }
    else if (c.tipo === "gorro") dibGorro(0.15);
    else dibEnemigo(c.sub);
    cx.restore();
  });
  const sy = p.y - cam, ox = dir * 2;
  cx.fillStyle = "#f2c200";
  cx.beginPath(); cx.roundRect(p.x, sy, TAM, TAM, 10); cx.fill();
  cx.fillStyle = "#222";
  cx.fillRect(p.x + 8 + ox, sy + 9, 5, 7); cx.fillRect(p.x + 21 + ox, sy + 9, 5, 7);
  if (gorro) { cx.save(); cx.translate(p.x + TAM / 2, sy - 2); dibGorro(); cx.restore(); }
  // Marcador: metros a la izquierda, monedas a la derecha
  texto(metros() + " m", 12, 30, "left");
  texto(String(nMonedas), W - 36, 30, "right");
  circ(W - 20, 22, 9, "#f5b301");
  if (gorro) { // avance del impulso del gorro (100 m)
    const avance = Math.min(1, (gorro.y0 - p.y) / (GORRO_METROS * METRO));
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(12, 42, 120, 8);
    cx.fillStyle = "#e53935"; cx.fillRect(12, 42, 120 * avance, 8);
    texto("Gorro " + Math.round(avance * GORRO_METROS) + "/" + GORRO_METROS + " m", 12, 68, "left", 13);
  }
}
function ciclo(ahora) {
  if (!vivo) return;
  mover(Math.min((ahora - ultimo) / 1000, 0.033));
  ultimo = ahora;
  if (vivo) { dibujar(); requestAnimationFrame(ciclo); }
}
async function fin() {
  vivo = false;
  dibujar();
  jugar.hidden = false;
  jugar.textContent = "Jugar otra vez";
  const n = puntos();
  estado.textContent = "¡Caíste! Subiste " + metros() + " m, juntaste " + nMonedas + " monedas y derrotaste " + nEnemigos + " enemigos: " + n + " puntos.";
  if (!usuario || !n) return;
  try { await sumarPuntos(ID, n); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
}

// Controles: teclado, o tocar la mitad izquierda / derecha del juego
const teclas = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
addEventListener("keydown", (e) => { if (e.key in teclas) dir = teclas[e.key]; });
addEventListener("keyup", (e) => { if (teclas[e.key] === dir) dir = 0; });
const lado = (e) => ((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width < 0.5 ? -1 : 1);
cv.addEventListener("pointerdown", (e) => { dir = lado(e); });
cv.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "touch") dir = lado(e); });
addEventListener("pointerup", () => { dir = 0; });
jugar.addEventListener("click", empezar);

// Pantalla inicial
preparar(); dibujar();
