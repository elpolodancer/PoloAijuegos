// Ruta: slither/juego-slither.js
// «Slither»: tú y bots en una arena redonda. Come bolitas para crecer; si tu cabeza toca el cuerpo de otra serpiente o la orilla, mueres
// y te conviertes en comida. Los ajustes están aquí arriba.
const ID = "slither";

// ---------- AJUSTES ----------
const R = 2600;               // radio de la arena
const NUM_BOTS = 24;
const NUM_COMIDA = 1500;      // bolitas fijas repartidas por la arena
const M0 = 10;                // masa inicial (define el largo)
const M_MIN = 12;             // al acelerar no se baja de esta masa
const VEL = 190, VEL_TURBO = 330;   // px por segundo
const GIRO = 4.2;             // rad/s de giro (las grandes giran menos)
const DRENA = 1.4;            // masa que gasta el turbo por segundo
const V_COMIDA = 0.35;        // masa por bolita normal
const V_CADAVER = 0.7;        // fracción de la masa que suelta una serpiente al morir
const DURA_SUELTA = 70;       // segundos que duran en el suelo las bolitas sueltas
const CAS = 200;              // tamaño de casilla de búsqueda de comida
const PUNTOS_POR_MASA = 10;   // 1 punto de perfil por cada 10 de masa máxima (menos el primero)
const NUM_ESPECIALES = 30;    // bolitas doradas repartidas por la arena (poco frecuentes)
const V_ESPECIAL = V_COMIDA * 10;   // una dorada vale 10 bolitas normales
const ESPERA_ESPECIAL = [8, 22];    // segundos que tarda en reaparecer (en otro sitio) una dorada que se comieron
const POR_ETAPA = 100;        // niveles por estado/país: 32 × 100 + 194 × 100 = 22 600 niveles (aún sin crear)

const NOMBRES = ["Pepe","Lupita","Chuy","Nacho","Tona","Memo","Paco","Rosa","Beto","Güero","Mapache","Tlacuache","Colibrí","Ajolote","Nopal","Jaguar","Coyote","Quetzal","Churro","Taco","Elote","Mole","Pozole","Tamal","Piñata","Mariachi","Chile","Frijol","Mango","Tejón"];

import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

// ---------- Elementos y récord ----------
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
let W = 0, H = 0, dpr = 1;
function ajustar() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr); }
addEventListener("resize", ajustar); ajustar();

const puntaje = (m) => Math.round(m * 10);
let record = 0;
try { record = Number(localStorage.getItem("slither_record")) || 0; } catch (e) {}
const pintarRecord = () => { $("record").textContent = "Récord: " + Math.round(record); };
pintarRecord();
let nube = null;
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: "slither_record",
    fusionar: (a, b) => (a == null && b == null ? null : Math.max(Number(a) || 0, Number(b) || 0)),
    alCambiar: (v) => { record = Number(v) || 0; pintarRecord(); },
  });
}).catch(() => {});
try { $("nombre").value = localStorage.getItem("slither_nombre") || ""; } catch (e) {}

// ---------- Utilidades ----------
const azar = (a, b) => a + Math.random() * (b - a);
const rad = (m) => Math.min(26, 8 + Math.sqrt(m) * 1.1);
const nseg = (m) => Math.min(220, 12 + Math.floor(m * 1.2));
const angDif = (a, b) => { const d = b - a; return Math.atan2(Math.sin(d), Math.cos(d)); };
function puntoArena(margen) { const a = Math.random() * 6.2832, d = Math.sqrt(Math.random()) * (R - margen); return { x: Math.cos(a) * d, y: Math.sin(a) * d }; }

// ---------- Estado ----------
let serps = [], jug = null, estado = "mapa", pausado = false;   // estado: mapa (menú principal) | inicio (juego libre) | jugando | fin
let pendEsp = [];   // momentos en que reaparecen las doradas comidas
let t = 0, t0 = 0, maxM = 0, matados = 0, enviados = 0;
let cam = { x: 0, y: 0, z: 0.8 };
let tabla = [], tTabla = 0, rango = 0, tSuelta = 0;

// ---------- Comida (casillas) ----------
const GW = Math.ceil(2 * R / CAS);
let casillas = [], sueltas = [];
const idx = (x, y) => Math.max(0, Math.min(GW - 1, Math.floor((y + R) / CAS))) * GW + Math.max(0, Math.min(GW - 1, Math.floor((x + R) / CAS)));
function meter(p) { p.k = idx(p.x, p.y); casillas[p.k].push(p); }
function quitar(p) { const a = casillas[p.k], i = a.indexOf(p); if (i >= 0) { a[i] = a[a.length - 1]; a.pop(); } p.comido = true; }
function ponerEspecial() { const q = puntoArena(60); meter({ x: q.x, y: q.y, v: V_ESPECIAL, h: 48, k: 0, esp: true }); }
function crearComida() {
  casillas = Array.from({ length: GW * GW }, () => []); sueltas = []; pendEsp = [];
  for (let i = 0; i < NUM_ESPECIALES; i++) ponerEspecial();
  for (let i = 0; i < NUM_COMIDA; i++) { const q = puntoArena(30); meter({ x: q.x, y: q.y, v: V_COMIDA, h: Math.floor(Math.random() * 360), k: 0 }); }
}
function soltar(x, y, v, h, vence) { const p = { x, y, v, h, k: 0, comido: false, vence }; meter(p); sueltas.push(p); }
function comerComida(s) {
  const hd = s.pts[0], er = rad(s.m) * 1.5 + 10;
  const x0 = Math.max(0, Math.floor((hd.x - er + R) / CAS)), x1 = Math.min(GW - 1, Math.floor((hd.x + er + R) / CAS));
  const y0 = Math.max(0, Math.floor((hd.y - er + R) / CAS)), y1 = Math.min(GW - 1, Math.floor((hd.y + er + R) / CAS));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const a = casillas[cy * GW + cx];
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      if ((p.x - hd.x) ** 2 + (p.y - hd.y) ** 2 < er * er) {
        s.m += p.v;
        if (p.esp) { quitar(p); pendEsp.push(t + azar(ESPERA_ESPECIAL[0], ESPERA_ESPECIAL[1])); } else if (p.vence) quitar(p); else { a[i] = a[a.length - 1]; a.pop(); const q = puntoArena(30); p.x = q.x; p.y = q.y; meter(p); }
      }
    }
  }
}
function comidaCerca(hd, rd) {
  const x0 = Math.max(0, Math.floor((hd.x - rd + R) / CAS)), x1 = Math.min(GW - 1, Math.floor((hd.x + rd + R) / CAS));
  const y0 = Math.max(0, Math.floor((hd.y - rd + R) / CAS)), y1 = Math.min(GW - 1, Math.floor((hd.y + rd + R) / CAS));
  let mejor = null, md = rd * rd;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) for (const p of casillas[cy * GW + cx]) {
    const d = (p.x - hd.x) ** 2 + (p.y - hd.y) ** 2 + (1 - Math.min(3, p.v) / 4) * 4000;
    if (d < md) { md = d; mejor = p; }
  }
  return mejor;
}

// ---------- Serpientes ----------
function crearSerp(x, y, ang, m, bot, nombre) {
  const s = { bot, nombre, h: Math.floor(Math.random() * 360), m, ang, tgt: ang, turbo: false, pts: [], muerta: false, tc: 0, prox: 0, rea: 0 };
  const sp = rad(m) * 0.6;
  for (let i = 0; i < nseg(m); i++) s.pts.push({ x: x - Math.cos(ang) * i * sp, y: y - Math.sin(ang) * i * sp });
  serps.push(s);
  return s;
}
function aparecerBot(b) {
  const q = puntoArena(300), nueva = crearSerp(q.x, q.y, Math.random() * 6.2832, M0 + Math.pow(Math.random(), 3) * 80, true, b.nombre);
  Object.assign(b, nueva); serps.pop(); if (!serps.includes(b)) serps.push(b); b.rea = 0;
}
function mover(s, dt) {
  const r = rad(s.m), sp = r * 0.6, n = nseg(s.m);
  const giro = GIRO * Math.max(0.45, 1 - r / 60) * dt, d = angDif(s.ang, s.tgt);
  s.ang += Math.max(-giro, Math.min(giro, d));
  if (s.m <= M_MIN) s.turbo = false;
  const v = s.turbo ? VEL_TURBO : VEL, hd = s.pts[0];
  hd.x += Math.cos(s.ang) * v * dt; hd.y += Math.sin(s.ang) * v * dt;
  while (s.pts.length < n) s.pts.push({ x: s.pts[s.pts.length - 1].x, y: s.pts[s.pts.length - 1].y });
  s.pts.length = n;
  for (let i = 1; i < n; i++) {
    const p = s.pts[i], q = s.pts[i - 1], dx = p.x - q.x, dy = p.y - q.y, l = Math.hypot(dx, dy);
    if (l > sp) { p.x = q.x + dx / l * sp; p.y = q.y + dy / l * sp; }
  }
  if (s.turbo) {
    s.m -= DRENA * dt; s.tc -= dt;
    if (s.tc <= 0) { s.tc = 0.25; const c = s.pts[n - 1]; soltar(c.x, c.y, DRENA * 0.25 * 0.6, s.h, t + DURA_SUELTA); }
  }
}
function chocó(s) {
  const hd = s.pts[0], r = rad(s.m);
  if (Math.hypot(hd.x, hd.y) > R - r * 0.3) return true;
  for (const o of serps) {
    if (o === s || o.muerta) continue;
    const ro = rad(o.m), lim = o.pts.length * ro * 0.6 + ro + r, oh = o.pts[0];
    if (Math.abs(oh.x - hd.x) > lim || Math.abs(oh.y - hd.y) > lim) continue;
    const um = (ro + r) * 0.8, um2 = um * um;
    for (let i = 1; i < o.pts.length; i += 2) { const p = o.pts[i]; if ((p.x - hd.x) ** 2 + (p.y - hd.y) ** 2 < um2) return true; }
  }
  return false;
}
function morirSerp(s, culpable) {
  s.muerta = true;
  const n = s.pts.length, v = Math.max(0.5, s.m * V_CADAVER / (n / 2));
  for (let i = 0; i < n; i += 2) { const p = s.pts[i]; soltar(p.x + azar(-8, 8), p.y + azar(-8, 8), v, s.h, t + DURA_SUELTA); }
  if (s === jug) finalizar();
  else s.rea = 2 + Math.random() * 3;
}

// ---------- Cerebro de los bots ----------
function pensar(s) {
  const hd = s.pts[0], r = rad(s.m), look = 90 + r * 4, c = Math.cos(s.ang), sn = Math.sin(s.ang);
  s.turbo = false;
  if (Math.hypot(hd.x, hd.y) > R - 320) { s.tgt = Math.atan2(-hd.y, -hd.x); return; }
  let peligro = 0, cruz = 0, presa = null, dp = 520;
  for (const o of serps) {
    if (o === s || o.muerta) continue;
    const ro = rad(o.m), oh = o.pts[0], dh = Math.hypot(oh.x - hd.x, oh.y - hd.y);
    if (dh > look + o.pts.length * ro * 0.6 + ro) continue;
    for (let i = 0; i < o.pts.length; i += 2) {
      const p = o.pts[i], dx = p.x - hd.x, dy = p.y - hd.y, d = Math.hypot(dx, dy) || 1;
      if (d < look + ro && (dx * c + dy * sn) / d > 0.25) { const w = 1 - d / (look + ro); if (w > peligro) { peligro = w; cruz = c * dy - sn * dx; } }
    }
    if (o.m < s.m * 0.8 && dh < dp) { presa = o; dp = dh; }
  }
  if (peligro > 0) { s.tgt = s.ang + (cruz > 0 ? -1.5 : 1.5); return; }
  if (presa && s.m > 20 && Math.random() < 0.7) {       // intenta cerrarle el paso
    s.tgt = Math.atan2(presa.pts[0].y + Math.sin(presa.ang) * 180 - hd.y, presa.pts[0].x + Math.cos(presa.ang) * 180 - hd.x);
    s.turbo = dp < 330 && s.m > 30; return;
  }
  const f = comidaCerca(hd, 450 + r * 4);
  if (f) s.tgt = Math.atan2(f.y - hd.y, f.x - hd.x);
  else s.tgt = s.ang + azar(-0.6, 0.6);
}

// ---------- Entrada ----------
const teclas = {};
let raton = { x: 0, y: 0, activo: false }, joy = null, turboRaton = false, turboBtn = false, turboTecla = false;
function anguloEntrada() {
  const x = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0), y = (teclas.abajo ? 1 : 0) - (teclas.arriba ? 1 : 0);
  if (x || y) return Math.atan2(y, x);
  if (joy) { const dx = joy.x - joy.ox, dy = joy.y - joy.oy; return Math.hypot(dx, dy) > 8 ? Math.atan2(dy, dx) : null; }
  if (raton.activo) { const dx = raton.x - W / 2, dy = raton.y - H / 2; return Math.hypot(dx, dy) > 10 ? Math.atan2(dy, dx) : null; }
  return null;
}
const pos = (e) => { const b = lienzo.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
lienzo.addEventListener("pointerdown", (e) => {
  const p = pos(e);
  if (e.pointerType === "mouse") { raton = { ...p, activo: true }; turboRaton = true; return; }
  lienzo.setPointerCapture(e.pointerId); joy = { ox: p.x, oy: p.y, x: p.x, y: p.y };
});
lienzo.addEventListener("pointermove", (e) => {
  const p = pos(e);
  if (e.pointerType === "mouse") raton = { ...p, activo: true }; else if (joy) { joy.x = p.x; joy.y = p.y; }
});
const soltarPuntero = (e) => { if (e.pointerType === "mouse") turboRaton = false; else joy = null; };
lienzo.addEventListener("pointerup", soltarPuntero); lienzo.addEventListener("pointercancel", soltarPuntero);
const mapa = { ArrowLeft: "izq", a: "izq", A: "izq", ArrowRight: "der", d: "der", D: "der", ArrowUp: "arriba", w: "arriba", W: "arriba", ArrowDown: "abajo", s: "abajo", S: "abajo" };
addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (mapa[e.key]) { teclas[mapa[e.key]] = true; e.preventDefault(); }
  if (e.key === " ") { turboTecla = true; e.preventDefault(); }
});
addEventListener("keyup", (e) => { if (mapa[e.key]) teclas[mapa[e.key]] = false; if (e.key === " ") turboTecla = false; });
addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; joy = null; turboRaton = turboTecla = turboBtn = false; });
const bt = $("turbo");
bt.addEventListener("pointerdown", (e) => { e.preventDefault(); turboBtn = true; });
for (const ev of ["pointerup", "pointerleave", "pointercancel"]) bt.addEventListener(ev, () => { turboBtn = false; });

// ---------- Partida y menús ----------
function crearMundo() {
  serps = []; crearComida();
  for (let i = 0; i < NUM_BOTS; i++) { const b = { nombre: NOMBRES[i % NOMBRES.length] }; aparecerBot(b); }
}
function menuBoton() {
  const b = $("btn-menu");
  document.body.dataset.estado = estado;
  b.hidden = estado === "mapa" && mapaNiveles.esPrincipal();   // en el menú principal no se muestra
  $("txt-menu").textContent = estado === "jugando" ? "Pausa" : "Menú principal";
  b.title = estado === "jugando" ? "Pausa" : "Volver al menú principal";
}
function iniciar() {
  const nombre = ($("nombre").value || "").trim().slice(0, 14) || "Jugador";
  try { localStorage.setItem("slither_nombre", nombre); } catch (e) {}
  if (jug) { jug.muerta = true; serps = serps.filter((s) => s !== jug); }
  const q = puntoArena(600);
  jug = crearSerp(q.x, q.y, Math.random() * 6.2832, M0, false, nombre);
  cam.x = q.x; cam.y = q.y;
  estado = "jugando"; pausado = false; t0 = t; maxM = M0; matados = 0; enviados = 0;
  $("inicio").classList.remove("activo"); $("fin").classList.remove("activo"); bt.classList.add("activo"); menuBoton();
}
function enviarPerfil() {
  const debe = Math.max(0, Math.floor(maxM / PUNTOS_POR_MASA) - 1) - enviados;
  if (debe <= 0) return 0;
  enviados += debe; encolarPuntos(ID, debe);
  import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
  return debe;
}
function finalizar() {
  estado = "fin"; bt.classList.remove("activo");
  const pts = Math.max(0, Math.floor(maxM / PUNTOS_POR_MASA) - 1), seg = Math.round(t - t0);
  enviarPerfil();
  $("finTexto").textContent = "Largo máximo: " + puntaje(maxM) + " · Tiempo: " + Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0") +
    " · Serpientes derrotadas: " + matados + (pts ? " · +" + pts + " puntos para tu perfil (se envían cuando haya internet y hayas entrado con Google)" : "") +
    (puntaje(maxM) >= record && maxM > M0 ? ". ¡Nuevo récord!" : ".");
  $("fin").classList.add("activo"); menuBoton();
}
function irAlInicio() {   // vuelve al MENÚ PRINCIPAL (el mapa de niveles)
  enviarPerfil();
  if (jug) { jug.muerta = true; serps = serps.filter((s) => s !== jug); jug = null; }
  estado = "mapa"; pausado = false; bt.classList.remove("activo");
  $("fin").classList.remove("activo"); $("inicio").classList.remove("activo"); velo(null);
  mapaNiveles.abrir(); menuBoton();
}
const pausa = crearMenuPausa({
  boton: $("btn-menu"), puedeAbrir: () => estado === "jugando",
  alAbrir: () => { pausado = true; }, alContinuar: () => { pausado = false; }, alSalir: irAlInicio,
  ayudaSalir: "Tu largo actual se pierde; los puntos ganados se guardan.",
});
$("btn-menu").addEventListener("click", () => {
  if (estado === "fin" || estado === "inicio") irAlInicio();
  else if (estado === "mapa" && !mapaNiveles.esPrincipal()) mapaNiveles.principal();
});
$("jugar").addEventListener("click", iniciar); $("otra").addEventListener("click", iniciar);
$("nombre").addEventListener("keydown", (e) => { if (e.key === "Enter") iniciar(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfil(); });
addEventListener("pagehide", () => { if (estado === "jugando") enviarPerfil(); });

// ---------- Actualización ----------
function actualizar(dt) {
  t += dt;
  if (jug && !jug.muerta && estado === "jugando") {
    const a = anguloEntrada(); if (a !== null) jug.tgt = a;
    jug.turbo = (turboRaton || turboBtn || turboTecla) && jug.m > M_MIN;
  }
  for (const s of serps) {
    if (s.muerta) { if (s.bot && (s.rea -= dt) <= 0) aparecerBot(s); continue; }
    if (s.bot && t >= s.prox) { pensar(s); s.prox = t + 0.1 + Math.random() * 0.08; }
    mover(s, dt); comerComida(s);
  }
  // choques (el primero que choca cae; se revisa con las posiciones ya movidas)
  const caen = serps.filter((s) => !s.muerta && chocó(s));
  for (const s of caen) {
    morirSerp(s);
    if (s !== jug && jug && !jug.muerta) { const c = jug.pts[0], h = s.pts[0]; if (Math.hypot(c.x - h.x, c.y - h.y) < 700) matados++; }
  }
  serps = serps.filter((s) => !s.muerta || s.bot);
  if (pendEsp.length) { const k = pendEsp.findIndex((x) => t >= x); if (k >= 0) { pendEsp.splice(k, 1); ponerEspecial(); } }
  if (t >= tSuelta) { tSuelta = t + 3; sueltas = sueltas.filter((p) => { if (p.comido) return false; if (t > p.vence) { quitar(p); return false; } return true; }); }

  if (estado === "jugando" && jug && !jug.muerta) {
    if (jug.m > maxM) maxM = jug.m;
    if (puntaje(maxM) > record) { record = puntaje(maxM); try { localStorage.setItem("slither_record", String(record)); } catch (e) {} pintarRecord(); if (nube) nube.guardado(); }
    $("largo").textContent = "Largo: " + puntaje(jug.m) + (rango ? " · Puesto " + rango : "");
  }
  if (t >= tTabla) {
    tTabla = t + 0.4;
    const l = serps.filter((s) => !s.muerta).map((s) => ({ nombre: s.nombre, m: s.m, yo: s === jug })).sort((a, b) => b.m - a.m);
    tabla = l.slice(0, 8);
    const i = l.findIndex((x) => x.yo); rango = i >= 0 ? i + 1 : 0;
    if (i >= 8) tabla.push(l[i]);
  }
  // cámara: sigue tu cabeza (o a la más larga en los menús)
  let f = jug && !jug.muerta ? jug : null;
  if (!f) for (const s of serps) if (!s.muerta && (!f || s.m > f.m)) f = s;
  if (f) {
    const hd = f.pts[0], zo = (Math.min(W, H) / 620) * Math.max(0.42, 1.05 - (rad(f.m) - 11) * 0.03);
    cam.x += (hd.x - cam.x) * Math.min(1, dt * 8); cam.y += (hd.y - cam.y) * Math.min(1, dt * 8); cam.z += (zo - cam.z) * Math.min(1, dt * 2);
  }
}

// ---------- Dibujo ----------
function dibujarSerp(s, vx0, vx1, vy0, vy1) {
  const r = rad(s.m), n = s.pts.length;
  for (let i = n - 1; i >= 0; i--) {
    const p = s.pts[i];
    if (p.x < vx0 - r || p.x > vx1 + r || p.y < vy0 - r || p.y > vy1 + r) continue;
    if (s.turbo && i % 2 === 0) { ctx.fillStyle = "hsla(" + s.h + ",90%,70%,.22)"; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.5, 0, 6.2832); ctx.fill(); }
    ctx.fillStyle = "hsl(" + s.h + ",78%," + ((i % 6 < 3 ? 52 : 44) + (s.turbo ? 10 : 0)) + "%)";
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
  }
  const hd = s.pts[0], c = Math.cos(s.ang), sn = Math.sin(s.ang), e = r * 0.5;
  for (const lado of [-1, 1]) {
    const ex = hd.x + c * r * 0.45 - sn * lado * e, ey = hd.y + sn * r * 0.45 + c * lado * e;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex, ey, r * 0.33, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex + c * r * 0.12, ey + sn * r * 0.12, r * 0.17, 0, 6.2832); ctx.fill();
  }
  if (r * cam.z > 7) {
    const tam = 13 / cam.z; ctx.font = "700 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineWidth = tam * 0.16; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineJoin = "round";
    ctx.strokeText(s.nombre, hd.x, hd.y - r - 8 / cam.z); ctx.fillStyle = "#fff"; ctx.fillText(s.nombre, hd.x, hd.y - r - 8 / cam.z);
  }
}
function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);   // transparente: se ve la madera
  const z = cam.z;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (H / 2 - cam.y * z));
  const vx0 = cam.x - W / 2 / z, vx1 = cam.x + W / 2 / z, vy0 = cam.y - H / 2 / z, vy1 = cam.y + H / 2 / z;
  // arena redonda con cuadrícula
  ctx.fillStyle = "#10151f"; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.2832); ctx.clip();
  ctx.strokeStyle = "#192233"; ctx.lineWidth = 2; ctx.beginPath();
  const G = 110;
  for (let x = Math.floor(vx0 / G) * G; x <= vx1; x += G) { ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); }
  for (let y = Math.floor(vy0 / G) * G; y <= vy1; y += G) { ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); }
  ctx.stroke(); ctx.restore();
  ctx.strokeStyle = "#ff5c7a"; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, R + 7, 0, 6.2832); ctx.stroke();
  // comida
  const cx0 = Math.max(0, Math.floor((vx0 + R) / CAS)), cx1 = Math.min(GW - 1, Math.floor((vx1 + R) / CAS));
  const cy0 = Math.max(0, Math.floor((vy0 + R) / CAS)), cy1 = Math.min(GW - 1, Math.floor((vy1 + R) / CAS));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) for (const p of casillas[cy * GW + cx]) {
    if (p.vence && t > p.vence - 5 && Math.floor(t * 8) % 2) continue;
    if (p.esp) { // bolita dorada: grande, con brillo que late
      const l = 1 + 0.18 * Math.sin(t * 5 + p.x);
      ctx.fillStyle = "rgba(255,214,64,.28)"; ctx.beginPath(); ctx.arc(p.x, p.y, 24 * l, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, 6.2832); ctx.fill();
      ctx.fillStyle = "#fff6bf"; ctx.beginPath(); ctx.arc(p.x - 3.5, p.y - 3.5, 4, 0, 6.2832); ctx.fill();
      continue;
    }
    ctx.fillStyle = "hsl(" + p.h + ",90%,62%)"; ctx.beginPath(); ctx.arc(p.x, p.y, 4 + Math.min(8, p.v * 4), 0, 6.2832); ctx.fill();
  }
  // serpientes (las más cortas primero)
  for (const s of serps.filter((q) => !q.muerta).sort((a, b) => a.m - b.m)) dibujarSerp(s, vx0, vx1, vy0, vy1);
  // capa de pantalla
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bx = W - 160, by = 62;
  ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.roundRect(bx - 6, by, 156, 24 + tabla.length * 18, 10); ctx.fill();
  ctx.font = "700 13px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.fillText("Mejores", bx + 72, by + 13);
  tabla.forEach((f, i) => {
    const y = by + 33 + i * 18;
    ctx.fillStyle = f.yo ? "#ffe066" : "#e6ebff"; ctx.font = (f.yo ? "800 " : "600 ") + "12px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.fillText((i < 8 ? i + 1 : rango) + ". " + f.nombre.slice(0, 11), bx, y);
    ctx.textAlign = "right"; ctx.fillText(String(puntaje(f.m)), bx + 144, y);
  });
  if (estado === "jugando" && jug && !jug.muerta) {       // minimapa redondo (arriba del botón ⛶)
    const S = 46, mx = W - S - 14, my = H - S - 78, k = S / R;
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.arc(mx, my, S, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#ffe066"; ctx.beginPath(); ctx.arc(mx + jug.pts[0].x * k, my + jug.pts[0].y * k, 3, 0, 6.2832); ctx.fill();
  }
  if (joy) {
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 60, 0, 6.2832); ctx.stroke();
    const l = Math.min(60, Math.hypot(joy.x - joy.ox, joy.y - joy.oy)), a = Math.atan2(joy.y - joy.oy, joy.x - joy.ox);
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * l, joy.oy + Math.sin(a) * l, 20, 0, 6.2832); ctx.fill();
  }
}

// ---------- Ciclo ----------
let ultimo = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
  if (estado === "mapa") return;   // el mapa de niveles cubre la pantalla: no se simula ni se dibuja
  if (!pausado) actualizar(dt);
  dibujar();
}
// ---------- Menú principal: mapa de México y mundo (estándar, compartido/mapa-niveles.js) ----------
// Todavía NO hay niveles: el mapa y su progreso ya existen (22 600 niveles), pero al elegir uno avisa «Próximamente».
// «Juego libre» abre el modo de siempre (nombre + Jugar).
const velo = (id) => { for (const v of ["pronto", "info"]) $(v).classList.toggle("activo", v === id); };
$("prontoVolver").addEventListener("click", () => velo(null));
$("infoVolver").addEventListener("click", () => velo(null));
function progMapa() {
  try { const p = JSON.parse(localStorage.getItem("slither_niveles_v1")) || {}; return { max: Math.max(1, Math.floor(p.max) || 1), hecho: Math.max(0, Math.floor(p.hecho) || 0) }; }
  catch (e) { return { max: 1, hecho: 0 }; }
}
function juegoLibre() { mapaNiveles.cerrar(); estado = "inicio"; pausado = false; $("inicio").classList.add("activo"); menuBoton(); }
const mapaNiveles = montarMapa({
  prefijo: ID,
  etapas: crearEtapas({ porEtapa: POR_ETAPA }),
  progreso: progMapa,
  jugarNivel: () => velo("pronto"),
  botonesExtra: [{ icono: "♾️", texto: "Juego libre", clase: "b-oro", fn: juegoLibre }],
  alInfo: () => velo("info"),
  avisoPrincipal: () => "Los niveles se están preparando · mientras tanto, ♾️ Juego libre",
  alCambiarVista: () => menuBoton(),
});
crearMundo(); mapaNiveles.abrir(); menuBoton();
requestAnimationFrame(cuadro);
