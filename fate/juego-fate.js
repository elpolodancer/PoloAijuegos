// Ruta: fate/juego-fate.js
// Aldea y Mazmorra: RPG de acción con un pueblo, una mazmorra por niveles, misiones, magia y pociones.
// Controles: toca/clic para caminar, atacar (toca un monstruo) o hablar/abrir (toca a alguien o un objeto). Mantén pulsado para seguir al dedo.
// Botones: 🧪 poción de vida (tecla 1) · 💧 poción de maná (2) · 🔥 bola de fuego (Q o espacio) · 📜 diario de misiones (L).
// Los datos (misiones, aldeanos, monstruos) están en datos-fate.js y los niveles en mazmorra-fate.js. Plan y notas: README-fate.md.
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { MAX_VISIBLES, MISIONES_POR_ALDEANO, PRECIOS, POCION, ETIQUETA_TIPO, MONSTRUOS, ALDEANOS, TOMAS, MISIONES, PUEBLO, construirPueblo } from "./datos-fate.js";
import { T, COLS, FILAS, NIVELES_HECHOS, generarMazmorra, escala } from "./mazmorra-fate.js";

const ID = "fate", CLAVE = "fate_partida_v1", W = 640, H = 480;
const cv = document.getElementById("lienzo"), ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);
const px = (c) => (c + 0.5) * T;

// ----- Partida guardada (local primero; gana la copia más reciente al sincronizar con la cuenta) -----
const BASE = () => ({ t: 0, nivel: 1, xp: 0, oro: 30, pociones: { vida: 2, mana: 1 }, flags: {}, misiones: {} });
function normalizar(o) {
  const b = BASE();
  if (!o || typeof o !== "object") return b;
  return { ...b, ...o, pociones: { ...b.pociones, ...(o.pociones || {}) }, flags: o.flags || {}, misiones: o.misiones || {} };
}
function cargar() { try { return normalizar(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return BASE(); } }
let S = cargar(), nube = null, vaciar = null;
// «t» (cuándo cambió la partida) solo sube si cambia el contenido: abrir y cerrar el juego en un dispositivo
// con una copia vieja no debe pisar el avance más nuevo de la nube.
const firmaDe = () => JSON.stringify({ ...S, t: 0 });
let firma = firmaDe();
function guardar() {
  const f = firmaDe();
  if (f !== firma) { firma = f; S.t = Date.now(); }
  try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) {}
  if (nube) nube.guardado();
}
// Anota puntos (siempre, aunque no haya sesión) y, si ya cargó el módulo de progreso, intenta enviarlos
function darPuntos(n) { encolarPuntos(ID, n); try { if (vaciar) vaciar(); } catch (e) {} }
import("../compartido/progreso.js").then((m) => {
  vaciar = m.vaciarPuntos;
  nube = m.conectar(ID, {
    clave: CLAVE, fusionar: m.unirRecientes,
    alCambiar: (u) => { S = normalizar(u); firma = firmaDe(); armarNpcs(); hud(true); },
  });
}).catch(() => {});

// ----- Números del personaje -----
const hpMax = () => 60 + 15 * (S.nivel - 1);
const mpMax = () => 30 + 8 * (S.nivel - 1);
const xpSig = () => 40 + 35 * S.nivel;
const danoMelee = () => 6 + 2 * S.nivel + Math.floor(Math.random() * 5);
const danoMagia = () => 18 + 6 * S.nivel;
const armadura = () => Math.floor(S.nivel / 2);
const COSTE_MAGIA = 12;

// ----- Sonido sencillo -----
let ac = null;
function sonido(f, d = 0.08, tipo = "square", v = 0.04) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = tipo; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
// En iPhone el audio solo se activa dentro de un toque o tecla: se despierta en el primero que haya
const despertarAudio = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); } catch (e) {} };
for (const ev of ["pointerup", "click", "keydown"]) addEventListener(ev, despertarAudio, true);

// ----- Estado del mundo -----
const p = { x: 0, y: 0, hp: hpMax(), mp: mpMax(), dir: 0, cdAt: 0, cdMag: 0, flash: 0, path: [], obj: null, rep: 0 };
let zona = "pueblo", nivelMaz = 1, mapa = null, monstruos = [], objs = [], npcs = [], proyectiles = [], textos = [], parts = [], avisos = [];
let fase = "juego", dlg = false, reloj = 0, apuntando = false, ptr = { sx: W / 2, sy: H / 2 }, tHold = 0, hudClave = "";
const cam = { x: 0, y: 0 }, avisadas = new Set();

const libre = (tx, ty) => tx >= 0 && ty >= 0 && tx < mapa.cols && ty < mapa.filas && mapa.g[ty][tx] === 0;
const libreR = (x, y, r) => libre(Math.floor((x - r) / T), Math.floor((y - r) / T)) && libre(Math.floor((x + r) / T), Math.floor((y - r) / T)) &&
  libre(Math.floor((x - r) / T), Math.floor((y + r) / T)) && libre(Math.floor((x + r) / T), Math.floor((y + r) / T));

// Camino por casillas (búsqueda en anchura, sin diagonales). Devuelve los centros de casilla a recorrer, o [] si no hay.
function ruta(sx, sy, tx, ty) {
  if (!libre(tx, ty)) { // si tocaste una pared, va a la casilla libre más cercana
    let mejor = null, md = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (libre(tx + dx, ty + dy) && dx * dx + dy * dy < md) { md = dx * dx + dy * dy; mejor = [tx + dx, ty + dy]; }
    if (!mejor) return [];
    [tx, ty] = mejor;
  }
  const { cols, filas } = mapa, prev = new Int32Array(cols * filas).fill(-1), ini = sy * cols + sx, fin = ty * cols + tx;
  prev[ini] = ini;
  const q = [ini];
  for (let i = 0; i < q.length && prev[fin] < 0; i++) {
    const c = q[i], x = c % cols, y = (c - x) / cols;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (libre(nx, ny) && prev[ny * cols + nx] < 0) { prev[ny * cols + nx] = c; q.push(ny * cols + nx); }
    }
  }
  if (prev[fin] < 0) return [];
  const r = [];
  for (let c = fin; c !== ini; c = prev[c]) r.push({ x: px(c % cols), y: px(Math.floor(c / cols)) });
  return r.reverse();
}
const irA = (x, y) => { p.path = ruta(Math.floor(p.x / T), Math.floor(p.y / T), Math.floor(x / T), Math.floor(y / T)); };

// ----- Zonas -----
function armarNpcs() {
  if (zona !== "pueblo") return;
  npcs = Object.entries(ALDEANOS).map(([id, a]) => ({ id, ...a, x: px(a.c), y: px(a.f) }));
  if (S.flags.tomasRescatado) npcs.push({ ...TOMAS, x: px(TOMAS.c), y: px(TOMAS.f) });
}
function irPueblo(desdeMazmorra) {
  zona = "pueblo"; mapa = { g: construirPueblo(), cols: PUEBLO.cols, filas: PUEBLO.filas };
  monstruos = []; proyectiles = []; objs = [{ k: "cueva", x: 15 * T, y: 1.2 * T }];
  armarNpcs();
  p.x = px(PUEBLO.spawn.c); p.y = desdeMazmorra ? px(3) : px(PUEBLO.spawn.f); if (desdeMazmorra) p.x = 15 * T;
  p.path = []; p.obj = null;
}
function nuevoMonstruo(tipo, x, y, n) {
  const d = MONSTRUOS[tipo], e = escala(n), vida = Math.round(d.vida * e.vida);
  return { tipo, x, y, r: d.r, vida, max: vida, dano: Math.round(d.dano * e.dano), vel: d.vel, xp: Math.round(d.xp * e.xp), oro: d.oro, aggro: d.aggro,
    jefe: !!d.jefe, vuela: !!d.vuela, cd: 0, on: false, flash: 0, fase: Math.random() * 6, fx: 1 };
}
function irMazmorra(n) {
  zona = "mazmorra"; nivelMaz = n;
  const m = generarMazmorra(n);
  mapa = { g: m.g, cols: m.cols, filas: m.filas };
  monstruos = m.monstruos.map((o) => nuevoMonstruo(o.tipo, o.x, o.y, n));
  objs = [{ k: "subir", x: m.entrada.x, y: m.entrada.y }, { k: "bajar", x: m.salida.x, y: m.salida.y }];
  if (n === 1) { // los objetivos de las misiones del nivel 1 (no vuelven a salir una vez cumplidos)
    if (!S.flags.reyRataMuerto) monstruos.push(nuevoMonstruo("reyRata", m.jefe.x, m.jefe.y, n));
    if (!S.flags.tomasRescatado) objs.push({ k: "cautivo", x: m.cautivo.x, y: m.cautivo.y });
    if (!S.flags.relicarioHallado) objs.push({ k: "cofre", x: m.cofre.x, y: m.cofre.y });
  }
  npcs = []; proyectiles = [];
  p.x = m.inicio.x; p.y = m.inicio.y; p.path = []; p.obj = null;
  aviso("Mazmorra · nivel " + n);
}

// ----- Avisos y textos -----
const aviso = (t) => avisos.push({ t, vida: 3.2 });
const textoFlot = (x, y, t, c = "#fff") => textos.push({ x, y, t, c, vida: 0.9 });
function chispas(x, y, c, n = 8) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 110; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.5, c }); } }

// ----- Misiones -----
const todasMisiones = () => Object.values(MISIONES).flat();
const buscarMision = (id) => todasMisiones().find((m) => m.id === id);
const visibles = (aldeano) => (MISIONES[aldeano] || []).filter((m) => S.misiones[m.id] !== "hecha").slice(0, MAX_VISIBLES); // solo 3 a la vez
const lista = (m) => S.misiones[m.id] === "activa" && !!S.flags[m.flag];
function revisarMisiones() {
  for (const m of todasMisiones()) if (lista(m) && !avisadas.has(m.id)) { avisadas.add(m.id); aviso("¡Encargo cumplido: " + m.titulo + "! Vuelve con Marta."); sonido(700, 0.2, "triangle", 0.06); }
}
function marca(n) { // «!» = hay misión nueva, «?» = hay una lista para entregar
  if (n.id !== "marta") return "";
  const v = visibles("marta");
  if (v.some(lista)) return "?";
  return v.some((m) => !S.misiones[m.id]) ? "!" : "";
}
function ganarXP(n) {
  S.xp += n;
  while (S.xp >= xpSig()) {
    S.xp -= xpSig(); S.nivel++; p.hp = hpMax(); p.mp = mpMax();
    aviso("¡Subiste al nivel " + S.nivel + "!"); sonido(660, 0.3, "triangle", 0.07); darPuntos(20);
  }
}

// ----- Diálogos (paneles HTML dentro del marco) -----
const dlgEl = $("dialogo");
function abrir(html) { dlgEl.innerHTML = '<div class="caja">' + html + "</div>"; dlgEl.hidden = false; dlg = true; apuntando = false; }
function cerrar() { dlgEl.hidden = true; dlg = false; }
const boton = (color, attr, txt) => '<button class="b3d txt chico ' + color + '" ' + attr + ">" + txt + "</button>";
const cerrarBtn = boton("b-gris", "data-cerrar", "Cerrar");

function hablar(n) {
  if (n.id === "marta") return panelMarta();
  if (n.tienda) return panelTienda();
  abrir("<h3>" + n.nombre + " <small>" + n.rol + "</small></h3><p>" + n.frases[Math.floor(Math.random() * n.frases.length)] + "</p>" + cerrarBtn);
}
function filaMision(m) {
  const e = S.misiones[m.id];
  let h = '<div class="mis"><b>' + m.titulo + "</b> <small>" + ETIQUETA_TIPO[m.tipo] + "</small><p>" + m.texto + "</p>";
  if (lista(m)) h += boton("b-verde", 'data-ent="' + m.id + '"', "¡Entregar! +" + m.oro + " monedas · +" + m.xp + " XP");
  else if (e === "activa") h += '<p class="pista">En curso: ' + m.pista + "</p>";
  else h += boton("b-azul", 'data-acep="' + m.id + '"', "Aceptar");
  return h + "</div>";
}
function panelMarta() {
  const v = visibles("marta"), hechas = (MISIONES.marta || []).filter((m) => S.misiones[m.id] === "hecha").length;
  abrir("<h3>Marta <small>Alcaldesa</small></h3><p>" + (v.length ? "Tengo trabajo para ti:" : "Por ahora no tengo más encargos. ¡Gracias por todo! Pronto habrá más.") + "</p>" +
    v.map(filaMision).join("") + '<p class="cuenta">Misiones de Marta: ' + hechas + "/" + MISIONES_POR_ALDEANO + "</p>" + cerrarBtn);
}
function panelTienda() {
  abrir("<h3>Hugo <small>Boticario</small></h3><p>Tienes 💰 " + S.oro + " monedas.</p>" +
    '<div class="fila">' + boton("b-rojo", 'data-comprar="vida"', "🧪 Vida · " + PRECIOS.vida + " 💰") + boton("b-azul", 'data-comprar="mana"', "💧 Maná · " + PRECIOS.mana + " 💰") + "</div>" +
    "<p><small>Vida +" + POCION.vida + " · Maná +" + POCION.mana + ". Tienes ×" + S.pociones.vida + " de vida y ×" + S.pociones.mana + " de maná.</small></p>" + cerrarBtn);
}
function panelDiario() {
  const act = todasMisiones().filter((m) => S.misiones[m.id] === "activa");
  abrir("<h3>📜 Diario</h3>" + (act.length ? act.map((m) => '<div class="mis"><b>' + m.titulo + "</b> <small>" + ETIQUETA_TIPO[m.tipo] + "</small><p class=\"pista\">" +
    (lista(m) ? "¡Cumplida! Entrégala a Marta." : m.pista) + "</p></div>").join("") : "<p>No tienes misiones en curso. Habla con Marta en el pueblo.</p>") +
    "<p><small>Nivel " + S.nivel + " · XP " + S.xp + "/" + xpSig() + " · Daño cuerpo a cuerpo " + (6 + 2 * S.nivel) + "+ · Bola de fuego " + danoMagia() + " · Armadura " + armadura() + "</small></p>" + cerrarBtn);
}
dlgEl.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const d = b.dataset;
  if (d.cerrar !== undefined) cerrar();
  else if (d.acep) {
    const m = buscarMision(d.acep); if (!m) return;
    S.misiones[m.id] = "activa"; guardar(); sonido(520, 0.1, "triangle");
    if (S.flags[m.flag]) aviso("Ya lo habías cumplido: ¡entrégalo!");
    panelMarta();
  } else if (d.ent) {
    const m = buscarMision(d.ent); if (!m || !lista(m)) return;
    S.misiones[m.id] = "hecha"; S.oro += m.oro; ganarXP(m.xp); darPuntos(50); guardar(); sonido(880, 0.25, "triangle", 0.07);
    aviso("Misión completada: " + m.titulo); hud(true); panelMarta();
  } else if (d.comprar) {
    if (S.oro < PRECIOS[d.comprar]) { aviso("No te alcanzan las monedas"); return; }
    S.oro -= PRECIOS[d.comprar]; S.pociones[d.comprar]++; guardar(); sonido(600, 0.08, "triangle"); hud(true); panelTienda();
  } else if (d.revivir !== undefined) {
    S.oro = Math.floor(S.oro * 0.9); p.hp = hpMax(); p.mp = mpMax(); fase = "juego"; cerrar(); irPueblo(false); guardar(); hud(true);
  }
});

// ----- Objetos del mapa -----
function interactuar(o) {
  if (o.k === "cueva") irMazmorra(1);
  else if (o.k === "subir") irPueblo(true);
  else if (o.k === "bajar") { if (nivelMaz < NIVELES_HECHOS) irMazmorra(nivelMaz + 1); else aviso("La escalera baja, pero el nivel " + (nivelMaz + 1) + " aún no está listo."); }
  else if (o.k === "cautivo") {
    S.flags.tomasRescatado = true; objs.splice(objs.indexOf(o), 1); guardar();
    aviso("¡Rescataste a Tomás! Corre hacia el pueblo."); sonido(760, 0.25, "triangle", 0.06); chispas(o.x, o.y, "#ffe27a", 14); revisarMisiones();
  } else if (o.k === "cofre") {
    S.flags.relicarioHallado = true; objs.splice(objs.indexOf(o), 1); S.oro += 20; guardar(); hud(true);
    aviso("Abriste el cofre: el relicario y 20 monedas."); sonido(900, 0.2, "triangle", 0.06); chispas(o.x, o.y, "#ffd34d", 14); revisarMisiones();
  }
}

// ----- Combate -----
function golpe(m) { // cuerpo a cuerpo
  p.cdAt = 0.55; p.dir = Math.atan2(m.y - p.y, m.x - p.x); sonido(220, 0.07);
  const a = p.dir; chispas(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22, "#fff", 4);
  dañar(m, danoMelee());
}
function dañar(m, d, color = "#fff") {
  m.vida -= d; m.flash = 0.12; m.on = true; textoFlot(m.x, m.y - m.r - 8, String(d), color); chispas(m.x, m.y, "#ff6b6b", 5);
  if (m.vida <= 0) matar(m);
}
function matar(m) {
  monstruos.splice(monstruos.indexOf(m), 1);
  const oro = m.oro[0] + Math.floor(Math.random() * (m.oro[1] - m.oro[0] + 1));
  S.oro += oro; textoFlot(m.x, m.y - 20, "+" + oro + " 💰", "#ffd34d"); chispas(m.x, m.y, "#ffd34d", 10); sonido(300, 0.15, "sawtooth");
  if (Math.random() < 0.14) { const t = Math.random() < 0.5 ? "vida" : "mana"; S.pociones[t]++; aviso("Encontraste una poción de " + (t === "vida" ? "vida" : "maná")); }
  if (m.tipo === "reyRata") { S.flags.reyRataMuerto = true; aviso("¡Derrotaste al Rey Rata!"); }
  ganarXP(m.xp); guardar(); revisarMisiones(); hud(true);
}
function dañoAlJugador(d) {
  d = Math.max(1, d - armadura()); p.hp -= d; p.flash = 0.15; textoFlot(p.x, p.y - 24, "-" + d, "#ff6b6b"); sonido(150, 0.12, "sawtooth", 0.05);
  if (p.hp <= 0) { p.hp = 0; hud(true); fase = "muerte"; p.path = []; p.obj = null; abrir("<h3>Has caído 💀</h3><p>Te llevan de vuelta al pueblo. Pierdes el 10 % de tus monedas.</p>" + boton("b-verde", "data-revivir", "Volver al pueblo")); }
}
function magia() {
  if (dlg || fase !== "juego") return;
  if (p.mp < COSTE_MAGIA) { aviso("Sin maná"); return; }
  if (p.cdMag > 0) return;
  let blanco = null, md = 320;
  for (const m of monstruos) { const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < md) { md = d; blanco = m; } }
  const a = blanco ? Math.atan2(blanco.y - p.y, blanco.x - p.x) : p.dir;
  p.mp -= COSTE_MAGIA; p.cdMag = 0.45; p.dir = a; sonido(480, 0.2, "sawtooth", 0.05);
  proyectiles.push({ x: p.x, y: p.y - 6, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dano: danoMagia(), vida: 1.1 });
}
function usarPocion(t) {
  if (dlg || fase !== "juego") return;
  if (S.pociones[t] <= 0) { aviso("No te quedan pociones de " + (t === "vida" ? "vida" : "maná")); return; }
  if (t === "vida" ? p.hp >= hpMax() : p.mp >= mpMax()) { aviso(t === "vida" ? "Tu vida está completa" : "Tu maná está completo"); return; }
  S.pociones[t]--;
  if (t === "vida") { p.hp = Math.min(hpMax(), p.hp + POCION.vida); textoFlot(p.x, p.y - 24, "+" + POCION.vida, "#7dff9a"); }
  else { p.mp = Math.min(mpMax(), p.mp + POCION.mana); textoFlot(p.x, p.y - 24, "+" + POCION.mana, "#7ad0ff"); }
  sonido(700, 0.15, "triangle", 0.05); guardar(); hud(true);
}

// ----- Entrada -----
function tocar(x, y) {
  let mejor = null, md = 1e9;
  for (const m of monstruos) { const d = Math.hypot(m.x - x, m.y - y); if (d < m.r + 14 && d < md) { md = d; mejor = { k: "mon", ref: m }; } }
  if (!mejor) for (const n of npcs) if (Math.hypot(n.x - x, n.y - y - 6) < 24) mejor = { k: "npc", ref: n };
  if (!mejor) for (const o of objs) if (Math.hypot(o.x - x, o.y - y) < 30) mejor = { k: "obj", ref: o };
  p.obj = mejor; p.rep = 0;
  if (!mejor) irA(x, y);
}
cv.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (dlg || fase !== "juego") return;
  const r = cv.getBoundingClientRect();
  ptr = { sx: ((e.clientX - r.left) * W) / r.width, sy: ((e.clientY - r.top) * H) / r.height };
  apuntando = true; tocar(ptr.sx + cam.x, ptr.sy + cam.y);
});
addEventListener("pointermove", (e) => {
  if (!apuntando) return;
  const r = cv.getBoundingClientRect();
  ptr = { sx: ((e.clientX - r.left) * W) / r.width, sy: ((e.clientY - r.top) * H) / r.height };
});
for (const ev of ["pointerup", "pointercancel"]) addEventListener(ev, () => { apuntando = false; });
addEventListener("keydown", (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "1") usarPocion("vida"); else if (k === "2") usarPocion("mana");
  else if (k === "q" || k === " ") { e.preventDefault(); magia(); }
  else if (k === "l" && fase === "juego") { if (dlg) cerrar(); else panelDiario(); }
  else if (k === "escape" && dlg && fase === "juego") cerrar();
});
$("bVida").addEventListener("click", () => usarPocion("vida"));
$("bMana").addEventListener("click", () => usarPocion("mana"));
$("bMagia").addEventListener("click", magia);
$("bDiario").addEventListener("click", () => { if (fase !== "juego") return; if (dlg) cerrar(); else panelDiario(); });
addEventListener("pagehide", guardar);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") guardar(); });

// ----- HUD (DOM) -----
function hud(forzar) {
  const k = [Math.ceil(p.hp), hpMax(), Math.floor(p.mp), mpMax(), S.xp, S.nivel, S.oro, S.pociones.vida, S.pociones.mana].join();
  if (!forzar && k === hudClave) return;
  hudClave = k;
  $("fHp").style.width = (100 * p.hp) / hpMax() + "%"; $("tHp").textContent = "❤ " + Math.ceil(p.hp) + "/" + hpMax();
  $("fMp").style.width = (100 * p.mp) / mpMax() + "%"; $("tMp").textContent = "✦ " + Math.floor(p.mp) + "/" + mpMax();
  $("fXp").style.width = (100 * S.xp) / xpSig() + "%"; $("tXp").textContent = "XP " + S.xp + "/" + xpSig();
  $("chNivel").textContent = "Nv " + S.nivel; $("chOro").textContent = "💰 " + S.oro;
  $("nVida").textContent = "×" + S.pociones.vida; $("nMana").textContent = "×" + S.pociones.mana;
}

// ----- Actualización -----
function mover(e, dx, dy) { const rad = e.r * 0.6; if (libreR(e.x + dx, e.y, rad)) e.x += dx; if (libreR(e.x, e.y + dy, rad)) e.y += dy; }
function actualizar(dt) {
  reloj += dt;
  textos.forEach((t) => { t.y -= 26 * dt; t.vida -= dt; }); textos = textos.filter((t) => t.vida > 0);
  parts.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vida -= dt; }); parts = parts.filter((q) => q.vida > 0);
  avisos.forEach((a) => (a.vida -= dt)); avisos = avisos.filter((a) => a.vida > 0);
  if (dlg || fase !== "juego") return;
  p.mp = Math.min(mpMax(), p.mp + 1.4 * dt); p.hp = Math.min(hpMax(), p.hp + 0.25 * dt);
  p.cdAt = Math.max(0, p.cdAt - dt); p.cdMag = Math.max(0, p.cdMag - dt); p.flash = Math.max(0, p.flash - dt);

  if (apuntando && !p.obj) { tHold -= dt; if (tHold <= 0) { tHold = 0.15; irA(ptr.sx + cam.x, ptr.sy + cam.y); } }
  if (p.obj) { // yendo hacia un monstruo, una persona o un objeto
    const o = p.obj, r = o.ref;
    if ((o.k === "mon" && !monstruos.includes(r)) || (o.k === "obj" && !objs.includes(r))) p.obj = null;
    else {
      const d = Math.hypot(r.x - p.x, r.y - p.y), alcance = o.k === "mon" ? r.r + 30 : 46;
      p.dir = Math.atan2(r.y - p.y, r.x - p.x);
      if (d <= alcance) {
        p.path = [];
        if (o.k === "mon") { if (p.cdAt <= 0) golpe(r); }
        else { p.obj = null; if (o.k === "npc") hablar(r); else interactuar(r); }
      } else { p.rep -= dt; if (p.rep <= 0 || !p.path.length) { p.rep = 0.25; irA(r.x, r.y); } }
    }
  }
  if (p.path.length) {
    const n = p.path[0], dx = n.x - p.x, dy = n.y - p.y, d = Math.hypot(dx, dy), s = 150 * dt;
    if (!p.obj) p.dir = Math.atan2(dy, dx);
    if (d <= s) { p.x = n.x; p.y = n.y; p.path.shift(); } else { p.x += (dx / d) * s; p.y += (dy / d) * s; }
  }
  if (fase !== "juego") return; // (por si el cambio de zona o la muerte ocurrieron arriba)

  for (const m of monstruos) {
    m.cd = Math.max(0, m.cd - dt); m.flash = Math.max(0, m.flash - dt);
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy);
    if (!m.on && d < m.aggro) m.on = true;
    if (m.on && d > m.aggro * 1.9) m.on = false;
    if (!m.on) continue;
    if (Math.abs(dx) > 2) m.fx = dx > 0 ? 1 : -1;
    if (d > m.r + 15) mover(m, (dx / d) * m.vel * dt, (dy / d) * m.vel * dt);
    else if (m.cd <= 0) { m.cd = m.jefe ? 1.1 : 0.9; dañoAlJugador(m.dano); if (fase !== "juego") return; }
  }
  for (const b of proyectiles) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt;
    if (!libre(Math.floor(b.x / T), Math.floor(b.y / T))) { b.vida = 0; chispas(b.x, b.y, "#ff9a3c", 6); continue; }
    parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, vida: 0.25, c: "#ff9a3c" });
    for (const m of monstruos) if (Math.hypot(m.x - b.x, m.y - b.y) < m.r + 7) { b.vida = 0; chispas(b.x, b.y, "#ff9a3c", 10); dañar(m, b.dano, "#ffb86b"); break; }
  }
  proyectiles = proyectiles.filter((b) => b.vida > 0);
  hud();
}

// ----- Dibujo -----
const TAU = 6.2832;
const sombra = (x, y, r) => { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(x, y + r * 0.7, r, r * 0.45, 0, 0, TAU); ctx.fill(); };
function persona(x, y, cuerpo, flash, bastón) {
  sombra(x, y + 8, 11);
  if (bastón) { ctx.strokeStyle = "#6a4422"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 13, y + 12); ctx.lineTo(x + 13, y - 14); ctx.stroke(); ctx.fillStyle = "#ff9a3c"; ctx.beginPath(); ctx.arc(x + 13, y - 16, 4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = flash ? "#fff" : cuerpo; ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? "#fff" : "#f2c9a0"; ctx.beginPath(); ctx.arc(x, y - 11, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = "#4a3020"; ctx.beginPath(); ctx.arc(x, y - 13, 7, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#222"; ctx.fillRect(x - 3, y - 11, 2, 2); ctx.fillRect(x + 1, y - 11, 2, 2);
}
function rata(m, s, color, corona) {
  const x = m.x, y = m.y, f = m.fx, c = m.flash > 0 ? "#fff" : color;
  sombra(x, y + 2, 11 * s);
  ctx.strokeStyle = "#c98a8a"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x - f * 9 * s, y + 2 * s); ctx.quadraticCurveTo(x - f * 18 * s, y - 6 * s + Math.sin(reloj * 8 + m.fase) * 3, x - f * 20 * s, y + 4 * s); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, 11 * s, 8 * s, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + f * 9 * s, y - 1 * s, 6 * s, 5 * s, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#e8a8a8"; ctx.beginPath(); ctx.arc(x + f * 8 * s, y - 6 * s, 3 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff3b3b"; ctx.beginPath(); ctx.arc(x + f * 11 * s, y - 2 * s, 1.5 * s, 0, TAU); ctx.fill();
  if (corona) { ctx.fillStyle = "#ffd34d"; ctx.beginPath(); ctx.moveTo(x + f * 3 * s, y - 8 * s); ctx.lineTo(x + f * 4 * s, y - 16 * s); ctx.lineTo(x + f * 8 * s, y - 11 * s); ctx.lineTo(x + f * 12 * s, y - 16 * s); ctx.lineTo(x + f * 13 * s, y - 8 * s); ctx.closePath(); ctx.fill(); }
}
function dibujarMonstruo(m) {
  if (m.tipo === "rata") rata(m, 1, "#8a8f98", false);
  else if (m.tipo === "reyRata") rata(m, 2, "#6b6f78", true);
  else if (m.tipo === "slime") {
    const q = 1 + Math.sin(reloj * 5 + m.fase) * 0.08; sombra(m.x, m.y + 2, 13);
    ctx.fillStyle = m.flash > 0 ? "#fff" : "#5fd35f"; ctx.beginPath(); ctx.ellipse(m.x, m.y, 13 * q, 11 / q, 0, Math.PI, TAU); ctx.lineTo(m.x + 13 * q, m.y + 5); ctx.quadraticCurveTo(m.x, m.y + 11, m.x - 13 * q, m.y + 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.arc(m.x - 5, m.y - 4, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1a3a1a"; ctx.fillRect(m.x - 5, m.y - 1, 3, 3); ctx.fillRect(m.x + 3, m.y - 1, 3, 3);
  } else { // murciélago
    const y = m.y - 8 + Math.sin(reloj * 6 + m.fase) * 3, a = Math.sin(reloj * 22 + m.fase) * 6; sombra(m.x, m.y + 6, 8);
    ctx.fillStyle = m.flash > 0 ? "#fff" : "#7a5a9a";
    ctx.beginPath(); ctx.moveTo(m.x, y); ctx.lineTo(m.x - 18, y - 6 + a); ctx.lineTo(m.x - 9, y + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(m.x, y); ctx.lineTo(m.x + 18, y - 6 + a); ctx.lineTo(m.x + 9, y + 5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(m.x, y + 1, 5, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff5252"; ctx.fillRect(m.x - 3, y - 2, 2, 2); ctx.fillRect(m.x + 1, y - 2, 2, 2);
  }
  if (m.vida < m.max) { const w = Math.max(22, m.r * 2), yy = m.y - m.r - (m.vuela ? 22 : 12); ctx.fillStyle = "#15171a"; ctx.fillRect(m.x - w / 2 - 1, yy - 1, w + 2, 6); ctx.fillStyle = m.jefe ? "#ff9a3c" : "#e03a3a"; ctx.fillRect(m.x - w / 2, yy, (w * m.vida) / m.max, 4); }
}
function texto(t, x, y, tam, color) {
  ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "#111"; ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
}
function dibujarObjeto(o) {
  const { x, y } = o;
  if (o.k === "cueva") return;
  if (o.k === "subir" || o.k === "bajar") {
    ctx.fillStyle = "#0a0a0f"; ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = o.k === "subir" ? "#8a8a9a" : "#4a4a5a"; for (let i = 0; i < 4; i++) ctx.fillRect(x - 12 + i * 2, y - 12 + i * 6, 24 - i * 4, 4);
    texto(o.k === "subir" ? "▲ Pueblo" : "▼ Nivel " + (nivelMaz + 1), x, y - 20, 10, "#d8dbe2");
  } else if (o.k === "cofre") {
    sombra(x, y + 4, 14); ctx.fillStyle = "#8a5a2a"; ctx.fillRect(x - 13, y - 8, 26, 18); ctx.fillStyle = "#a8742f"; ctx.fillRect(x - 13, y - 8, 26, 7);
    ctx.fillStyle = "#ffd34d"; ctx.fillRect(x - 3, y - 4, 6, 7); ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 2; ctx.strokeRect(x - 13, y - 8, 26, 18);
    texto("Cofre", x, y - 14, 10, "#ffe9a8");
  } else if (o.k === "cautivo") {
    persona(x, y + 2, "#e0b040", false, false);
    ctx.strokeStyle = "#9aa0aa"; ctx.lineWidth = 3; for (let i = -14; i <= 14; i += 7) { ctx.beginPath(); ctx.moveTo(x + i, y - 26); ctx.lineTo(x + i, y + 16); ctx.stroke(); }
    ctx.strokeRect(x - 16, y - 26, 32, 42); texto("Tomás", x, y - 32, 10, "#ffe9a8");
  }
}
function dibujar() {
  ctx.clearRect(0, 0, W, H);
  const { g, cols, filas } = mapa;
  cam.x = Math.max(0, Math.min(cols * T - W, p.x - W / 2)); cam.y = Math.max(0, Math.min(filas * T - H, p.y - H / 2));
  ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(cols - 1, Math.floor((cam.x + W) / T)), y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(filas - 1, Math.floor((cam.y + H) / T));
  const pueblo = zona === "pueblo";
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const v = (x * 7 + y * 13) % 5;
    if (pueblo) {
      ctx.fillStyle = ["#4f8f4a", "#4a8a46", "#538f4e", "#4c8c48", "#508d4b"][v]; ctx.fillRect(x * T, y * T, T, T);
      if (y >= 7 && y <= 13 && x >= 12 && x <= 17) { ctx.fillStyle = "#b89a6a"; ctx.fillRect(x * T, y * T, T, T); }
    } else if (g[y][x] === 0) { ctx.fillStyle = (x + y) % 2 ? "#34343f" : "#30303b"; ctx.fillRect(x * T, y * T, T, T); }
    else { ctx.fillStyle = "#14141b"; ctx.fillRect(x * T, y * T, T, T); if (y + 1 < filas && g[y + 1][x] === 0) { ctx.fillStyle = "#3a3a4d"; ctx.fillRect(x * T, y * T + T - 10, T, 10); } }
  }
  if (pueblo) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y][x] === 1 && !PUEBLO.casas.some((h) => x >= h.c && x < h.c + h.w && y >= h.f && y < h.f + h.h)) {
      ctx.fillStyle = "#2c5a2c"; ctx.beginPath(); ctx.arc(x * T + 16, y * T + 14, 15, 0, TAU); ctx.fill(); ctx.fillStyle = "#3a7a3a"; ctx.beginPath(); ctx.arc(x * T + 13, y * T + 11, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x * T + 14, y * T + 24, 5, 7);
    }
    for (const h of PUEBLO.casas) {
      const hx = h.c * T, hy = h.f * T, w = h.w * T, hh = h.h * T;
      ctx.fillStyle = h.pared; ctx.fillRect(hx, hy + 14, w, hh - 14); ctx.fillStyle = h.techo; ctx.beginPath(); ctx.moveTo(hx - 8, hy + 30); ctx.lineTo(hx + w / 2, hy - 8); ctx.lineTo(hx + w + 8, hy + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4a2e18"; ctx.fillRect(hx + w / 2 - 10, h.puerta === "abajo" ? hy + hh - 26 : hy + 16, 20, 26);
      ctx.fillStyle = "#e8f0ff"; ctx.fillRect(hx + 12, hy + 52, 16, 14); ctx.fillRect(hx + w - 28, hy + 52, 16, 14);
      if (h.nombre) texto(h.nombre, hx + w / 2, hy + hh + 14, 11, "#fff");
    }
    ctx.fillStyle = "#07070a"; ctx.beginPath(); ctx.ellipse(15 * T, 1.1 * T, 56, 38, 0, Math.PI, TAU); ctx.lineTo(15 * T + 56, 1.1 * T + 26); ctx.lineTo(15 * T - 56, 1.1 * T + 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5a5a66"; ctx.lineWidth = 4; ctx.stroke(); texto("Mazmorra", 15 * T, 2.5 * T, 11, "#d8dbe2");
  }
  const dibujables = [];
  for (const o of objs) dibujables.push({ y: o.y, f: () => dibujarObjeto(o) });
  for (const n of npcs) dibujables.push({ y: n.y, f: () => {
    persona(n.x, n.y, n.color, false, false); texto(n.nombre, n.x, n.y - 28, 10, "#fff");
    const m = marca(n); if (m) texto(m, n.x, n.y - 40 + Math.sin(reloj * 6) * 2, 18, "#ffe27a");
  } });
  for (const m of monstruos) dibujables.push({ y: m.y, f: () => dibujarMonstruo(m) });
  dibujables.push({ y: p.y, f: () => persona(p.x, p.y, "#3b6fd6", p.flash > 0, true) });
  dibujables.sort((a, b) => a.y - b.y).forEach((d) => d.f());
  for (const b of proyectiles) { ctx.fillStyle = "rgba(255,154,60,.35)"; ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffcf6b"; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, TAU); ctx.fill(); }
  for (const q of parts) { ctx.globalAlpha = Math.max(0, q.vida * 2); ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  textos.forEach((t) => { ctx.globalAlpha = Math.min(1, t.vida * 2); texto(t.t, t.x, t.y, 13, t.c); }); ctx.globalAlpha = 1;
  ctx.restore();
  if (!pueblo) { // oscuridad de la mazmorra: solo se ve alrededor del personaje
    const sx = p.x - cam.x, sy = p.y - cam.y, g2 = ctx.createRadialGradient(sx, sy, 90, sx, sy, 330);
    g2.addColorStop(0, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,.9)"); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  }
  avisos.forEach((a, i) => { ctx.globalAlpha = Math.min(1, a.vida); texto(a.t, W / 2, 96 + i * 20, 15, "#ffe27a"); }); ctx.globalAlpha = 1;
}

let ultimo = performance.now();
function bucle(t) {
  const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
  actualizar(dt); dibujar();
  requestAnimationFrame(bucle);
}
irPueblo(false); hud(true); revisarMisiones();
aviso("Habla con Marta (la «!»). Toca para caminar, tocar monstruos para atacar.");
requestAnimationFrame(bucle);
