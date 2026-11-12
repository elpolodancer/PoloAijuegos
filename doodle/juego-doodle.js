// Ruta: doodle/juego-doodle.js (lógica del juego «doodle»: saltar de plataforma en plataforma, estilo Doodle Jump)
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas, nombrePais, banderaPais } from "../compartido/etapas-mapa.js";

const ID = "doodle"; // el mismo id de juegos.js (colección de puntos en Firestore)
const CLAVE = "doodle_progreso_v1";
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), btnEntrar = $("entrar");

// ---- Ajustes (aquí se afina el juego) ----
const G = 1500, SALTO = -720, VX = 260, TAM = 34, PW = 64, PH = 12; // el salto normal alcanza ~173 px
const SALTO_DOBLE = SALTO * 1.45;
const METRO = 10;                        // 10 px = 1 metro
const GORRO_V = 650;
const EW = 38, EH = 30;
const PUNTOS_MONEDA = 5, PUNTOS_ENEMIGO = 10;
const V_BALA = 650, ESPERA_DISPARO = 0.22;
const COLOR = { normal: "#3cb043", movil: "#2e86de", rompible: "#a8743f", unica: "#f4f6fa", trampolin: "#e67e22" };

// Mejoras del gorro
const NIVEL_MAX_GORRO = 10, PRECIO_GORRO = 50;
const metrosGorro = (n) => 100 + 50 * (n - 1);   // nivel 1 = 100 m … nivel 10 = 550 m
const costeMejora = (n) => 40 * n;               // de nivel n a n+1

// Dificultades del modo libre: off/esc = cuánto sube la dificultad, en = cantidad de enemigos
const DIFS = {
  facil:   { off: 0,   esc: 0.5, en: 0.5 },
  normal:  { off: 0.2, esc: 1,   en: 1 },
  dificil: { off: 0.5, esc: 1,   en: 1.4 },
};

// 32 estados + 194 países, 100 niveles cada uno = 22 600 niveles
const E = crearEtapas({ porEtapa: 100 });

// ---------- Progreso guardado (local primero, la nube lo sincroniza) ----------
function norm(o) {
  o = o || {};
  const n = (v, a, b, d) => Math.min(b, Math.max(a, Math.floor(Number(v)) || d));
  return { monedas: n(o.monedas, 0, 1e9, 0), gorros: n(o.gorros, 0, 999, 0), nivelGorro: n(o.nivelGorro, 1, NIVEL_MAX_GORRO, 1),
    max: n(o.max, 1, E.total, 1), hecho: n(o.hecho, 0, E.total, 0), t: Number(o.t) || 0 };
}
let S = (() => { try { return norm(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return norm(null); } })();
let nube = null;
function guardar() {
  S.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {}
  if (nube) nube.guardado();
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: m.unirRecientes, alCambiar: (u) => { S = norm(u); ui(); if (actual === "mejoras") pintarMejoras(); } });
}).catch(() => {});

let usuario = null;
import("../compartido/jugador.js").then((m) => {
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
  btnEntrar.addEventListener("click", () => m.entrar().catch((e) => aviso(e.message)));
}).catch(() => {});

// ---------- Estado de la partida ----------
let p, plats, enemigos, monedas, caidos, balas, cam, y0, maxAlt, techo, proxGorro, gorro, t, nMonedas, nEnemigos, cd, cfg = DIFS.normal, dif = "normal";
let dir = 0, vivo = false, pausado = false, ultimo = 0, actual = "menu";

const rand = (a, b) => a + Math.random() * (b - a);
const metros = () => Math.floor(maxAlt / METRO);
const puntos = () => metros() + nMonedas * PUNTOS_MONEDA + nEnemigos * PUNTOS_ENEMIGO;

// ---------- Generación del nivel ----------
function crearPlat(tipo, y, x = rand(0, W - PW)) {
  return { tipo, x, y, w: PW, vx: tipo === "movil" ? (Math.random() < 0.5 ? -70 : 70) : 0, comp: 0 };
}
function elegirTipo(d, alt) {
  if (alt < 15) return "normal";
  const r = Math.random(), tramp = 0.07, movil = 0.10 + 0.15 * d, unica = 0.07 + 0.10 * d;
  if (r < tramp) return "trampolin";
  if (r < tramp + movil) return "movil";
  if (r < tramp + movil + unica) return "unica";
  return "normal";
}
// Cada fila tiene SIEMPRE una plataforma sólida alcanzable; las que se rompen son extras «trampa» entre filas.
function generarFila() {
  const d = Math.min(1, cfg.off + cfg.esc * (y0 - techo) / METRO / 1500);
  const hueco = rand(55, 90 + 55 * d);                 // máx. 145 px < 173 px de alcance
  const yPrev = techo;
  techo -= hueco;
  const alt = (y0 - techo) / METRO;
  const conGorro = alt >= proxGorro;
  const q = crearPlat(conGorro ? "normal" : elegirTipo(d, alt), techo);
  if (conGorro) { q.gorro = true; proxGorro = alt + rand(350, 700); }
  plats.push(q);
  if (alt > 30 && Math.random() < 0.2 + 0.25 * d) {
    let x = rand(0, W - PW);
    if (Math.abs(x - q.x) < PW + 10) x = (q.x + W / 2) % (W - PW);
    plats.push(crearPlat("rompible", yPrev - hueco * rand(0.3, 0.7), x));
  }
  if (!conGorro && Math.random() < 0.35) monedas.push({ x: q.x + PW / 2, y: techo - rand(30, 70), fase: rand(0, 6) });
  if (Math.random() < 0.06) {
    const x = rand(30, W - 30);
    for (let i = 0; i < 3; i++) monedas.push({ x, y: techo + hueco * 0.5 - i * 26, fase: i });
  }
  if (alt > 50 && Math.random() < (0.10 + 0.15 * d) * cfg.en) {
    const vuela = Math.random() < 0.4;
    enemigos.push({ tipo: vuela ? "murcielago" : "monstruo", x: rand(0, W - EW), y: techo + hueco * 0.5 - EH / 2, vx: vuela ? (Math.random() < 0.5 ? -80 : 80) : 0 });
  }
}
function preparar() {
  y0 = H - 100;
  p = { x: W / 2 - TAM / 2, y: y0, vy: SALTO };
  // Zona inicial: un suelo de lado a lado (no se puede caer ahí) que sale de pantalla al subir
  plats = [{ tipo: "suelo", x: 0, y: H - 60, w: W, vx: 0, comp: 0 }];
  enemigos = []; monedas = []; caidos = []; balas = [];
  cam = 0; maxAlt = 0; techo = H - 60; proxGorro = 60; gorro = null; t = 0; nMonedas = 0; nEnemigos = 0; cd = 0;
  while (techo > cam - 120) generarFila();
}
function empezar(d) {
  dif = d || dif; cfg = DIFS[dif];
  preparar();
  dir = 0; vivo = true; pausado = false; ultimo = performance.now();
  $("velo").hidden = true;
  mostrar("juego");
  requestAnimationFrame(ciclo);
}

// ---------- Lógica ----------
function aterrizar(q) {
  if (q.tipo === "rompible") {
    q.roto = true;
    for (let m = 0; m < 2; m++) caidos.push({ tipo: "plat", x: q.x + m * PW / 2 + PW / 4, y: q.y + PH / 2, vx: m ? 50 : -50, vy: 0, rot: 0, w: m ? 3 : -3 });
  } else if (q.tipo === "trampolin") { p.vy = SALTO_DOBLE; q.comp = 0.25; }
  else if (q.tipo === "unica") { p.vy = SALTO; q.fade = 0.2; }
  else p.vy = SALTO;
}
function activarGorro(m) { gorro = { y0: p.y, m }; }
function soltarGorro() {
  caidos.push({ tipo: "gorro", x: p.x + TAM / 2, y: p.y, vx: rand(-60, 60), vy: -250, rot: 0, w: 6 });
  gorro = null;
  p.vy = -120;
}
function volar(dt) {
  const total = gorro.m * METRO, resta = total - (gorro.y0 - p.y);
  const v = resta < 120 ? GORRO_V * (0.35 + 0.65 * Math.max(0, resta) / 120) : GORRO_V;
  p.vy = -v;
  p.y -= v * dt;
  if (gorro.y0 - p.y >= total) { p.y = gorro.y0 - total; soltarGorro(); }
}
function matar(e) {
  e.muerto = true;
  nEnemigos++;
  caidos.push({ tipo: "enemigo", sub: e.tipo, x: e.x + EW / 2, y: e.y + EH / 2, vx: rand(-40, 40), vy: -200, rot: 0, w: 5 });
}
// Acciones del jugador
function disparar() {
  if (!vivo || pausado || cd > 0) return;
  balas.push({ x: p.x + TAM / 2, y: p.y });
  cd = ESPERA_DISPARO;
}
function usarGorro() {
  if (!vivo || pausado || gorro || S.gorros < 1) return;
  S.gorros--; guardar();
  activarGorro(metrosGorro(S.nivelGorro));
  ui();
}
function mover(dt) {
  t += dt;
  if (cd > 0) cd -= dt;
  const previo = p.y + TAM;
  if (gorro) volar(dt); else { p.vy += G * dt; p.y += p.vy * dt; }
  p.x += dir * VX * dt;
  if (p.x < -TAM) p.x = W; else if (p.x > W) p.x = -TAM;

  for (const q of plats) {
    if (q.vx) {
      q.x += q.vx * dt;
      if (q.x < 0) { q.x = 0; q.vx = Math.abs(q.vx); } else if (q.x > W - q.w) { q.x = W - q.w; q.vx = -Math.abs(q.vx); }
    }
    if (q.comp > 0) q.comp -= dt;
    if (q.fade !== undefined) { q.fade -= dt; continue; }
    const tope = q.tipo === "trampolin" ? q.y - 12 : q.y;
    if (!gorro && p.vy > 0 && previo <= tope && p.y + TAM >= tope && p.x + TAM - 6 > q.x && p.x + 6 < q.x + q.w) aterrizar(q);
    if (q.gorro && !gorro && Math.hypot(p.x + TAM / 2 - (q.x + PW / 2), p.y + TAM / 2 - (q.y - 18)) < 30) {
      q.gorro = false;
      activarGorro(metrosGorro(S.nivelGorro));
    }
  }
  plats = plats.filter((q) => !q.roto && !(q.fade !== undefined && q.fade <= 0) && q.y - cam < H + 40);

  // Disparos hacia arriba
  for (const b of balas) {
    b.y -= V_BALA * dt;
    for (const e of enemigos) {
      if (!e.muerto && Math.abs(b.x - (e.x + EW / 2)) < EW / 2 + 3 && Math.abs(b.y - (e.y + EH / 2)) < EH / 2 + 4) { matar(e); b.usada = true; break; }
    }
  }
  balas = balas.filter((b) => !b.usada && b.y - cam > -30);

  for (const e of enemigos) {
    if (e.muerto) continue;
    if (e.vx) {
      e.x += e.vx * dt;
      if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); } else if (e.x > W - EW) { e.x = W - EW; e.vx = -Math.abs(e.vx); }
    }
    if (p.x + 4 < e.x + EW && p.x + TAM - 4 > e.x && p.y + 4 < e.y + EH && p.y + TAM > e.y) {
      if (gorro) matar(e);
      else if (p.vy > 0 && previo <= e.y + EH * 0.5) { matar(e); p.vy = SALTO; }
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
  const k = Math.min(1, metros() / 800);
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
function dibGorro(giro = 1) {
  cx.fillStyle = "#e53935"; cx.beginPath(); cx.arc(0, 4, 15, Math.PI, 0); cx.closePath(); cx.fill();
  cx.fillStyle = "#fff"; cx.beginPath(); cx.roundRect(-15, 1, 30, 6, 3); cx.fill();
  cx.fillStyle = "#555"; cx.fillRect(-1, -17, 2, 7);
  cx.fillStyle = "#f2c200"; cx.beginPath(); cx.ellipse(0, -17, Math.max(2, 17 * Math.abs(Math.cos(t * 35 * giro))), 2.5, 0, 0, Math.PI * 2); cx.fill();
}
function dibEnemigo(tipo) {
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
  if (q.tipo === "suelo") { // suelo de la zona inicial
    cx.fillStyle = "#7a5230"; cx.fillRect(0, y, W, H);
    cx.fillStyle = "#3cb043"; cx.fillRect(0, y, W, 10);
    return;
  }
  cx.save();
  if (q.fade !== undefined) cx.globalAlpha = Math.max(0, q.fade / 0.2);
  cx.fillStyle = COLOR[q.tipo];
  cx.beginPath(); cx.roundRect(q.x, y, q.w, PH, 6); cx.fill();
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
  balas.forEach((b) => { circ(b.x, b.y - cam, 4, "#ff5252"); circ(b.x, b.y - cam, 2, "#fff"); });
  const sy = p.y - cam, ox = dir * 2;
  cx.fillStyle = "#f2c200";
  cx.beginPath(); cx.roundRect(p.x, sy, TAM, TAM, 10); cx.fill();
  cx.fillStyle = "#222";
  cx.fillRect(p.x + 8 + ox, sy + 9, 5, 7); cx.fillRect(p.x + 21 + ox, sy + 9, 5, 7);
  if (gorro) { cx.save(); cx.translate(p.x + TAM / 2, sy - 2); dibGorro(); cx.restore(); }
  texto(metros() + " m", 12, 30, "left");
  texto(String(nMonedas), W - 36, 30, "right");
  circ(W - 20, 22, 9, "#f5b301");
  if (gorro) {
    const avance = Math.min(1, (gorro.y0 - p.y) / (gorro.m * METRO));
    cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(12, 42, 120, 8);
    cx.fillStyle = "#e53935"; cx.fillRect(12, 42, 120 * avance, 8);
    texto("Gorro " + Math.round(avance * gorro.m) + "/" + gorro.m + " m", 12, 68, "left", 13);
  }
}
function ciclo(ahora) {
  if (!vivo || pausado) return;
  mover(Math.min((ahora - ultimo) / 1000, 0.033));
  ultimo = ahora;
  if (vivo) { dibujar(); requestAnimationFrame(ciclo); }
}
async function fin() {
  vivo = false;
  dibujar();
  S.monedas += nMonedas; guardar();
  ui();
  $("velo").hidden = false;
  const n = puntos();
  estado.textContent = "¡Caíste! Subiste " + metros() + " m, juntaste " + nMonedas + " monedas y derrotaste " + nEnemigos + " enemigos: " + n + " puntos.";
  if (!n) return;
  encolarPuntos(ID, n);
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  estado.textContent += pendientes === 0 ? " Guardados ✓" : " Puntos anotados: se enviarán a tu perfil cuando tengas internet y hayas entrado con Google.";
}

// ---------- Pantallas ----------
const PANTALLAS = ["menu", "libre", "niveles", "mapa", "mejoras"];
function mostrar(n) {
  actual = n;
  for (const x of PANTALLAS) $("p-" + x).hidden = x !== n;
  $("escena").hidden = n !== "juego";
  if (n === "niveles") { vista = idxEtapa(S.max); pintarNiveles(); }
  if (n === "mejoras") pintarMejoras();
  if (n === "mapa") abrirMapa();
  ui();
}
function ui() { // rotulado de ☰ y botones de acción
  $("btn-menu").hidden = actual === "menu";
  $("menu-txt").textContent = actual === "juego" && vivo ? "Pausa" : "Menú principal";
  $("acciones").hidden = !(actual === "juego" && vivo);
  const g = $("btn-gorro"); g.textContent = "🧢 ×" + S.gorros; g.disabled = S.gorros < 1;
}
let tAviso = 0;
function aviso(s) {
  const a = $("aviso"); a.textContent = s; a.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 2600);
}
const jugarNivel = (n) => aviso("Nivel " + n + ": los niveles todavía no están creados.");

// Niveles: lista de los 100 niveles de la etapa (estado o país)
let vista = 0;
const idxEtapa = (n) => { const x = E.etapaDe(n); return x.zona === "mexico" ? x.indice : E.numEstados + x.indice; };
function pintarNiveles() {
  const esM = vista < E.numEstados;
  const base = esM ? E.baseEstado(vista) : E.basePais(vista - E.numEstados);
  const cod = esM ? null : E.paises[vista - E.numEstados];
  $("niv-titulo").textContent = esM ? E.estados[vista].nombre : banderaPais(cod) + " " + nombrePais(cod);
  $("niv-sub").textContent = "Niveles " + (base + 1) + " a " + (base + E.porEtapa) + " · etapa " + (vista + 1) + " de " + (E.numEstados + E.numPaises);
  const rej = $("niv-rejilla"); rej.replaceChildren();
  for (let k = 1; k <= E.porEtapa; k++) {
    const n = base + k, b = document.createElement("button");
    b.type = "button"; b.title = "Nivel " + n; b.textContent = k;
    b.className = "b3d chico " + (n <= S.hecho ? "b-verde" : n <= S.max ? "b-azul" : "b-gris");
    b.addEventListener("click", () => jugarNivel(n));
    rej.appendChild(b);
  }
  const tope = E.resumen(S).mexicoCompleto ? E.numEstados + E.numPaises - 1 : E.numEstados - 1;
  $("niv-ant").disabled = vista <= 0;
  $("niv-sig").disabled = vista >= tope;
}
$("niv-ant").addEventListener("click", () => { vista--; pintarNiveles(); });
$("niv-sig").addEventListener("click", () => { vista++; pintarNiveles(); });

// Mapa estándar (compartido/mapa-niveles.js). Se carga solo al abrirlo; si algo falla, el resto del juego sigue igual.
let mapaListo = false;
async function abrirMapa() {
  if (mapaListo) return;
  const cont = $("p-mapa");
  try {
    const m = await import("../compartido/mapa-niveles.js");
    m.montarMapa({
      prefijo: "doodle", contenedor: cont, etapas: E,
      progreso: { get max() { return S.max; }, get hecho() { return S.hecho; } },
      jugarNivel, alCambiarVista: () => {},
    });
    mapaListo = true;
  } catch (e) { cont.textContent = "No se pudo abrir el mapa: " + e.message; }
}

// Mejoras: subir el gorro (hasta nivel 10) y comprar gorritos para usarlos cuando quieras
function pintarMejoras() {
  const n = S.nivelGorro, max = n >= NIVEL_MAX_GORRO, c = costeMejora(n);
  $("m-monedas").textContent = S.monedas;
  $("m-nivel").textContent = n + "/" + NIVEL_MAX_GORRO;
  $("m-vuelo").textContent = metrosGorro(n) + " m";
  $("m-gorros").textContent = S.gorros;
  $("t-mejorar").textContent = max ? "Gorro al nivel máximo" : "Mejorar a nivel " + (n + 1) + " (" + metrosGorro(n + 1) + " m) · " + c + " monedas";
  $("b-mejorar").disabled = max || S.monedas < c;
  $("t-comprar").textContent = "Comprar gorrito · " + PRECIO_GORRO + " monedas";
  $("b-comprar").disabled = S.monedas < PRECIO_GORRO;
}
$("b-mejorar").addEventListener("click", () => {
  const c = costeMejora(S.nivelGorro);
  if (S.nivelGorro >= NIVEL_MAX_GORRO || S.monedas < c) return;
  S.monedas -= c; S.nivelGorro++; guardar(); pintarMejoras();
});
$("b-comprar").addEventListener("click", () => {
  if (S.monedas < PRECIO_GORRO) return;
  S.monedas -= PRECIO_GORRO; S.gorros++; guardar(); pintarMejoras();
});

// ---------- Menú de pausa estándar ----------
const pausa = crearMenuPausa({
  puedeAbrir: () => vivo && actual === "juego",
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; ultimo = performance.now(); requestAnimationFrame(ciclo); },
  ayudaSalir: "Pierdes los puntos y las monedas de esta partida.",
  alSalir: () => { vivo = false; pausado = false; mostrar("menu"); },
});

// ---------- Botones y controles ----------
$("b-libre").addEventListener("click", () => mostrar("libre"));
$("b-niveles").addEventListener("click", () => mostrar("niveles"));
$("b-mapa").addEventListener("click", () => mostrar("mapa"));
$("b-mejoras").addEventListener("click", () => mostrar("mejoras"));
document.querySelectorAll("[data-dif]").forEach((b) => b.addEventListener("click", () => empezar(b.dataset.dif)));
$("jugar").addEventListener("click", () => empezar());
$("volver").addEventListener("click", () => mostrar("menu"));
$("btn-menu").addEventListener("click", () => { if (vivo) pausa.abrir(); else mostrar("menu"); });
$("btn-disparo").addEventListener("click", disparar);
$("btn-gorro").addEventListener("click", usarGorro);

// Teclado: flechas/A-D mueven, espacio dispara, G usa un gorrito
const teclas = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
addEventListener("keydown", (e) => {
  if (e.key in teclas) dir = teclas[e.key];
  else if (e.key === " " && vivo && actual === "juego") { e.preventDefault(); disparar(); }
  else if ((e.key === "g" || e.key === "G") && !e.repeat) usarGorro();
});
addEventListener("keyup", (e) => { if (teclas[e.key] === dir) dir = 0; });
// Ratón: clic = disparar. Pantalla táctil: tocar la mitad izquierda/derecha = moverse (el disparo va en su botón)
const lado = (e) => ((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width < 0.5 ? -1 : 1);
cv.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") disparar(); else dir = lado(e); });
cv.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") dir = lado(e); });
addEventListener("pointerup", () => { dir = 0; });

mostrar("menu");
