// Ruta: jardin/juego.js
// «Jardín contra zombis» (estilo Plants vs. Zombies) con emojis y canvas. Por ahora: nivel 1.
// - Toca una carta (🌻 / 🌱) y luego una casilla del pasto para plantar. Toca los soles ☀️ para juntarlos.
// - Todo lo que se ajusta está en los bloques «Ajustes», «PLANTAS», «ZOMBIS» y «NIVEL» (aquí abajo).
// - Los niveles están en niveles.js (lista NIVELES): para crear otro, copia un bloque y cambia filas, plantas y oleadas.
// - La sesión de Google se carga aparte: si no hay internet, el juego funciona igual (solo no suma puntos al perfil).

// ----- Ajustes generales -----
import { NIVELES } from "./niveles.js";

const ID = "jardin";
const PUNTOS_POR_PERFIL = 25;   // 1 punto al perfil por cada 25 del juego
const PUNTOS_ZOMBI = 10;        // por zombi derrotado
const PUNTOS_VICTORIA = 100;    // por ganar el nivel
const PUNTOS_CORTADORA = 25;    // por cada cortadora sin usar al ganar
const PASO = 1 / 60;            // paso fijo de la simulación (se ve igual en pantallas de 60/90/120 Hz)

// ----- Tablero (en píxeles lógicos del canvas) -----
const ANCHO = 450, ALTO = 470;
const X0 = 36, Y0 = 96;         // esquina superior izquierda del pasto
const COLUMNAS = 9, FILAS = 5, CELDA_W = 46, CELDA_H = 56;

// ----- Soles -----
const SOL_VALOR = 25;           // lo que vale cada sol
const SOL_CIELO_PRIMERO = 6;    // segundos hasta el primer sol del cielo
const SOL_CIELO_CADA = 9.5;     // cada cuántos segundos cae otro sol del cielo
const SOL_CAE = 32;             // velocidad de caída (px/s)
const SOL_VIDA = 8;             // segundos que dura un sol en el suelo antes de desaparecer
const SOL_RADIO = 26;           // qué tan cerca hay que tocar para juntarlo

// ----- Plantas (tiempos en segundos, velocidades en px/s) -----
const PLANTAS = {
  girasol:        { nombre: "Girasol",        emoji: "🌻", costo: 50,  recarga: 7.5, vida: 300, primerSol: 7, solCada: 24 },
  lanzaguisantes: { nombre: "Lanzaguisantes", emoji: "🌱", costo: 100, recarga: 7.5, vida: 300, primerDisparo: 0.6, disparoCada: 1.5, dano: 20, velocidadTiro: 220 },
  nuez:           { nombre: "Nuez",           emoji: "🌰", costo: 50,  recarga: 30,  vida: 4000 },
  petardo:        { nombre: "Petardo",        emoji: "🍒", costo: 150, recarga: 50,  vida: 300, mecha: 1, dano: 1800, radio: 1.5 }, // explota a los «mecha» s; radio en casillas
};

// ----- Zombis (dano = daño por segundo a la planta que muerden; velocidad en px/s) -----
// Para agregar otro tipo (cono, cubeta...) se copia una línea y se usa su nombre en las oleadas del NIVEL.
const ZOMBIS = {
  normal: { emoji: "🧟", vida: 200, velocidad: 8, dano: 100, tam: 40 },
  cono:   { emoji: "🧟", vida: 560, velocidad: 8, dano: 100, tam: 40, cono: true }, // cono naranja dibujado sobre la cabeza
};

const CORTADORA_VELOCIDAD = 300;
const AVISO_BANDERA = 5;        // segundos de aviso antes de una oleada con bandera

// ----- Niveles (ver niveles.js) -----
let idx = 0;                 // nivel que se está jugando
let NIVEL = NIVELES[0];
let RESUMEN;

// ----- Sesión (opcional) y récord -----
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => (sumarPuntos = m.sumarPuntos)).catch(() => {});
const CLAVE_PROGRESO = ID + "_progreso"; // cuántos niveles están desbloqueados
let progreso = 1;
try { progreso = Math.max(1, Number(localStorage.getItem(CLAVE_PROGRESO)) || 1); } catch (err) {}
let record = 0;                          // récord del nivel actual
const claveRecord = () => ID + "_record_" + idx;

// ----- Canvas -----
const canvas = document.getElementById("lienzo");
const ctx = canvas.getContext("2d");
const ESC = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = ANCHO * ESC;
canvas.height = ALTO * ESC;
ctx.setTransform(ESC, 0, 0, ESC, 0, 0);
const FUENTE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const colX = (c) => X0 + c * CELDA_W + CELDA_W / 2;
const filaY = (f) => Y0 + f * CELDA_H + CELDA_H / 2;
const azar = (a, b) => a + Math.random() * (b - a);

function resumenNivel() {
  let total = 0, banderas = 0;
  for (const o of NIVEL.oleadas) {
    for (const par of o.zombis) total += par[1];
    if (o.bandera) banderas++;
  }
  return { total, banderas, ultima: NIVEL.oleadas[NIVEL.oleadas.length - 1].en };
}
const estadoEl = document.getElementById("estado");
function textoEstado() {
  if (estadoEl) estadoEl.textContent = NIVEL.nombre + ": " + RESUMEN.total + " zombis · " + RESUMEN.banderas + " bandera" + (RESUMEN.banderas === 1 ? "" : "s") + " · última oleada a los " + RESUMEN.ultima + " s · récord " + record;
}

// ----- Estado de la partida -----
let e;
function cargarNivel(i) {
  idx = i;
  NIVEL = NIVELES[i];
  RESUMEN = resumenNivel();
  try { record = Number(localStorage.getItem(claveRecord())) || (i === 0 ? Number(localStorage.getItem(ID + "_record")) || 0 : 0); } catch (err) { record = 0; }
  nuevoJuego();
}

function nuevoJuego() {
  e = {
    fase: "listo",              // listo | jugando | pausa | ganado | perdido
    t: 0, sol: NIVEL.solInicial,
    plantas: [], zombis: [], tiros: [], soles: [], efectos: [],
    cortadoras: [], recarga: {}, seleccion: null,
    siguiente: 0, avisoOleada: -1, aviso: 0, textoAviso: "",
    solCielo: SOL_CIELO_PRIMERO, puntos: 0, matados: 0, finEn: 0,
  };
  for (let f = 0; f < FILAS; f++) e.cortadoras[f] = NIVEL.filas.includes(f) ? { x: X0 - 18, rodando: false, usada: false } : null;
  for (const id of NIVEL.plantas) e.recarga[id] = 0;
  textoEstado();
}

function nuevoSol(x, y, destY) {
  e.soles.push({ x, y, destY, vida: SOL_VIDA });
}

function lanzarOleada(o) {
  let k = 0;
  for (const par of o.zombis) {
    for (let i = 0; i < par[1]; i++) {
      const fila = NIVEL.filas[Math.floor(Math.random() * NIVEL.filas.length)];
      e.zombis.push({ tipo: par[0], fila, x: ANCHO + 20 + k * 18 + Math.random() * 10, vida: ZOMBIS[par[0]].vida, golpe: 0, fase: Math.random() * 6, comiendo: false });
      k++;
    }
  }
}

function terminar(resultado) {
  e.fase = resultado;
  e.finEn = performance.now();
  if (resultado === "ganado") {
    e.puntos += PUNTOS_VICTORIA;
    e.puntos += PUNTOS_CORTADORA * e.cortadoras.filter((m) => m && !m.usada).length;
    const nuevo = Math.min(NIVELES.length, idx + 2); // desbloquea el siguiente nivel
    if (nuevo > progreso) { progreso = nuevo; try { localStorage.setItem(CLAVE_PROGRESO, String(progreso)); } catch (err) {} }
  }
  if (e.puntos > record) {
    record = e.puntos;
    try { localStorage.setItem(claveRecord(), String(record)); } catch (err) {}
  }
  const pp = Math.floor(e.puntos / PUNTOS_POR_PERFIL);
  if (pp > 0 && sumarPuntos) sumarPuntos(ID, pp).catch(() => {});
  textoEstado();
}

// Petardo: daña a los zombis de su fila y de las filas vecinas dentro del radio, y desaparece
function explotar(p, P) {
  const cx = colX(p.col), cy = filaY(p.fila);
  for (const z of e.zombis) {
    if (Math.abs(z.fila - p.fila) <= 1 && Math.abs(z.x - cx) <= P.radio * CELDA_W + 10) { z.vida -= P.dano; z.golpe = 0.1; }
  }
  e.efectos.push({ x: cx, y: cy, t: 0.45 });
  p.vida = 0;
}

// ----- Reglas (un paso de 1/60 s) -----
function actualizar(dt) {
  e.t += dt;
  if (e.aviso > 0) e.aviso -= dt;
  for (const id of NIVEL.plantas) e.recarga[id] = Math.max(0, e.recarga[id] - dt);

  // Oleadas
  const sig = NIVEL.oleadas[e.siguiente];
  if (sig) {
    if (sig.bandera && e.avisoOleada !== e.siguiente && e.t >= sig.en - AVISO_BANDERA) {
      e.avisoOleada = e.siguiente;
      e.aviso = 4;
      e.textoAviso = "¡Una gran oleada de zombis se acerca!";
    }
    if (e.t >= sig.en) { lanzarOleada(sig); e.siguiente++; }
  }

  // Soles del cielo
  e.solCielo -= dt;
  if (e.solCielo <= 0) {
    e.solCielo = SOL_CIELO_CADA;
    const fila = NIVEL.filas[Math.floor(Math.random() * NIVEL.filas.length)];
    nuevoSol(azar(X0 + 20, ANCHO - 24), Y0 - 6, filaY(fila) + azar(-10, 10));
  }
  for (const s of e.soles) {
    if (s.y < s.destY) s.y = Math.min(s.destY, s.y + SOL_CAE * dt);
    else s.vida -= dt;
  }
  e.soles = e.soles.filter((s) => s.vida > 0);
  for (const f of e.efectos) f.t -= dt;
  e.efectos = e.efectos.filter((f) => f.t > 0);

  // Plantas
  for (const p of e.plantas) {
    const P = PLANTAS[p.tipo];
    p.t -= dt;
    const cx = colX(p.col), cy = filaY(p.fila);
    if (p.tipo === "girasol") {
      if (p.t <= 0) { p.t = P.solCada; nuevoSol(cx + azar(-12, 12), cy - 16, cy + 8); }
    } else if (p.tipo === "petardo") {
      if (p.t <= 0) explotar(p, P);
    } else if (p.tipo === "lanzaguisantes") {
      const hay = e.zombis.some((z) => z.fila === p.fila && z.x > cx && z.x < ANCHO);
      if (hay && p.t <= 0) { p.t = P.disparoCada; e.tiros.push({ fila: p.fila, x: cx + 16, dano: P.dano, vel: P.velocidadTiro }); }
      else if (!hay && p.t < 0) p.t = 0;
    }
  }

  // Guisantes
  for (const g of e.tiros) {
    g.x += g.vel * dt;
    for (const z of e.zombis) {
      if (z.fila === g.fila && z.x < ANCHO && Math.abs(g.x - z.x) <= 14 && z.vida > 0) {
        z.vida -= g.dano; z.golpe = 0.1; g.x = ANCHO + 100; break;
      }
    }
  }
  e.tiros = e.tiros.filter((g) => g.x < ANCHO + 10);

  // Zombis
  for (const z of e.zombis) {
    const Z = ZOMBIS[z.tipo];
    z.golpe = Math.max(0, z.golpe - dt);
    const frente = z.x - 12;
    let objetivo = null;
    for (const p of e.plantas) if (p.fila === z.fila && Math.abs(colX(p.col) - frente) <= 16) objetivo = p;
    if (objetivo) { z.comiendo = true; objetivo.vida -= Z.dano * dt; }
    else { z.comiendo = false; z.x -= Z.velocidad * dt; }
    if (frente <= X0 - 2) {
      const m = e.cortadoras[z.fila];
      if (m && !m.usada) { m.usada = true; m.rodando = true; }
      else if (frente <= X0 - 30) { terminar("perdido"); return; }
    }
  }
  e.plantas = e.plantas.filter((p) => p.vida > 0);

  // Cortadoras
  for (const m of e.cortadoras) {
    if (!m || !m.rodando) continue;
    m.x += CORTADORA_VELOCIDAD * dt;
    const f = e.cortadoras.indexOf(m);
    for (const z of e.zombis) if (z.fila === f && Math.abs(z.x - m.x) < 26) z.vida = 0;
    if (m.x > ANCHO + 40) m.rodando = false;
  }

  // Zombis derrotados
  const vivos = [];
  for (const z of e.zombis) {
    if (z.vida > 0) vivos.push(z);
    else { e.matados++; e.puntos += PUNTOS_ZOMBI; }
  }
  e.zombis = vivos;

  if (e.siguiente >= NIVEL.oleadas.length && e.zombis.length === 0) terminar("ganado");
}

// ----- Entrada -----
const TARJETA = { x: 74, y: 8, w: 58, h: 76, sep: 64 };
const PAUSA = { x: 396, y: 8, w: 48, h: 40 };
const FLECHA_IZQ = { x: 80, y: Y0 + 176, w: 60, h: 40 };
const FLECHA_DER = { x: 310, y: Y0 + 176, w: 60, h: 40 };
const haySiguiente = () => idx + 1 < progreso && idx + 1 < NIVELES.length;
const dentro = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

function tocar(x, y) {
  if (e.fase === "listo") {
    if (dentro(x, y, FLECHA_IZQ)) { if (idx > 0) cargarNivel(idx - 1); return; }
    if (dentro(x, y, FLECHA_DER)) { if (haySiguiente()) cargarNivel(idx + 1); return; }
    e.fase = "jugando";
    return;
  }
  if (e.fase === "pausa") { e.fase = "jugando"; return; }
  if (e.fase === "ganado" || e.fase === "perdido") {
    // ganar lleva al siguiente nivel (o al primero si era el último); perder repite el mismo
    if (performance.now() - e.finEn > 700) cargarNivel(e.fase === "ganado" ? (idx + 1 < NIVELES.length ? idx + 1 : 0) : idx);
    return;
  }
  if (dentro(x, y, PAUSA)) { e.fase = "pausa"; return; }

  // Soles (se revisan de arriba hacia abajo en la pila)
  for (let i = e.soles.length - 1; i >= 0; i--) {
    const s = e.soles[i];
    if (Math.hypot(x - s.x, y - s.y) <= SOL_RADIO) { e.sol += SOL_VALOR; e.soles.splice(i, 1); return; }
  }
  // Cartas
  for (let i = 0; i < NIVEL.plantas.length; i++) {
    const r = { x: TARJETA.x + i * TARJETA.sep, y: TARJETA.y, w: TARJETA.w, h: TARJETA.h };
    if (dentro(x, y, r)) {
      const id = NIVEL.plantas[i];
      if (e.seleccion === id) e.seleccion = null;
      else if (e.recarga[id] <= 0 && e.sol >= PLANTAS[id].costo) e.seleccion = id;
      return;
    }
  }
  // Pasto
  const c = Math.floor((x - X0) / CELDA_W), f = Math.floor((y - Y0) / CELDA_H);
  if (e.seleccion && c >= 0 && c < COLUMNAS && f >= 0 && f < FILAS && NIVEL.filas.includes(f)
      && !e.plantas.some((p) => p.fila === f && p.col === c)) {
    const P = PLANTAS[e.seleccion];
    if (e.sol >= P.costo && e.recarga[e.seleccion] <= 0) {
      e.sol -= P.costo;
      e.recarga[e.seleccion] = P.recarga;
      e.plantas.push({ tipo: e.seleccion, fila: f, col: c, vida: P.vida, t: P.primerSol || P.primerDisparo || P.mecha || 0 });
    }
  }
  e.seleccion = null;
}

canvas.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  tocar((ev.clientX - r.left) * ANCHO / r.width, (ev.clientY - r.top) * ALTO / r.height);
});
document.addEventListener("visibilitychange", () => { if (document.hidden && e.fase === "jugando") e.fase = "pausa"; });

// ----- Dibujo -----
function emoji(t, x, y, tam) {
  ctx.font = tam + "px " + FUENTE_EMOJI;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t, x, y);
}
function texto(t, x, y, tam, color, alin) {
  ctx.font = "bold " + tam + "px system-ui, sans-serif";
  ctx.textAlign = alin || "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color || "#fff";
  ctx.fillText(t, x, y);
}

function dibujarFondo() {
  ctx.fillStyle = "#3b2a1a"; ctx.fillRect(0, 0, ANCHO, Y0);
  for (let f = 0; f < FILAS; f++) {
    const activa = NIVEL.filas.includes(f);
    for (let c = 0; c < COLUMNAS; c++) {
      ctx.fillStyle = activa ? ((f + c) % 2 ? "#5fae3d" : "#6fbf4a") : ((f + c) % 2 ? "#7b4e24" : "#8a5a2b");
      ctx.fillRect(X0 + c * CELDA_W, Y0 + f * CELDA_H, CELDA_W, CELDA_H);
    }
    ctx.fillStyle = "#c9b48a"; ctx.fillRect(0, Y0 + f * CELDA_H, X0, CELDA_H); // zona de cortadoras
  }
  ctx.fillStyle = "#2f5d27"; ctx.fillRect(0, Y0 + FILAS * CELDA_H, ANCHO, ALTO - (Y0 + FILAS * CELDA_H));
}

function dibujarHud() {
  ctx.fillStyle = "#2a1c10"; ctx.fillRect(6, 8, 62, 76);
  emoji("☀️", 37, 34, 28);
  texto(String(e.sol), 37, 69, 18, "#ffe66b");

  NIVEL.plantas.forEach((id, i) => {
    const P = PLANTAS[id], x = TARJETA.x + i * TARJETA.sep, y = TARJETA.y;
    const lista = e.recarga[id] <= 0 && e.sol >= P.costo;
    ctx.fillStyle = "#e9dfc2"; ctx.fillRect(x, y, TARJETA.w, TARJETA.h);
    ctx.globalAlpha = lista ? 1 : 0.5;
    emoji(P.emoji, x + TARJETA.w / 2, y + 34, 32);
    ctx.globalAlpha = 1;
    texto(String(P.costo), x + TARJETA.w / 2, y + 66, 14, "#3b2a1a");
    if (e.recarga[id] > 0) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(x, y, TARJETA.w, TARJETA.h * e.recarga[id] / P.recarga); }
    if (e.seleccion === id) { ctx.strokeStyle = "#ffe66b"; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, TARJETA.w - 3, TARJETA.h - 3); }
  });

  ctx.fillStyle = "#2a1c10"; ctx.fillRect(PAUSA.x, PAUSA.y, PAUSA.w, PAUSA.h);
  emoji("⏸️", PAUSA.x + PAUSA.w / 2, PAUSA.y + PAUSA.h / 2, 20);
  texto("Puntos " + e.puntos, ANCHO - 8, 66, 13, "#fff", "right");
  texto("Récord " + record, ANCHO - 8, 82, 11, "#c9b48a", "right");
}

function dibujarProgreso() {
  const bx = 70, bw = 320, by = Y0 + FILAS * CELDA_H + 24, bh = 12;
  texto(NIVEL.nombre, 8, by + bh / 2, 12, "#fff", "left");
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(bx, by, bw, bh);
  const prog = Math.min(1, e.t / RESUMEN.ultima);
  ctx.fillStyle = "#d8573b"; ctx.fillRect(bx, by, bw * prog, bh);
  for (const o of NIVEL.oleadas) if (o.bandera) emoji("🚩", bx + bw * (o.en / RESUMEN.ultima), by - 6, 16);
  emoji("🧟", bx + bw * prog, by + bh / 2, 16);
  texto("Zombis derrotados: " + e.matados + " / " + RESUMEN.total, ANCHO / 2, by + 36, 13);
}

function dibujarEscena() {
  const reloj = e.t;
  for (let f = 0; f < FILAS; f++) {
    const cy = filaY(f);
    const m = e.cortadoras[f];
    if (m && (m.rodando || !m.usada)) emoji("🚜", m.x, cy + 6, 26);
    for (const p of e.plantas) if (p.fila === f) {
      ctx.globalAlpha = p.vida < PLANTAS[p.tipo].vida / 3 ? 0.6 : 1;
      emoji(PLANTAS[p.tipo].emoji, colX(p.col), cy + Math.sin(reloj * 3 + p.col) * 1.5, 36);
      ctx.globalAlpha = 1;
    }
    for (const z of e.zombis) if (z.fila === f) {
      const Z = ZOMBIS[z.tipo];
      ctx.globalAlpha = z.golpe > 0 ? 0.55 : 1;
      const zx = z.x + (z.comiendo ? Math.sin(reloj * 20) * 1.5 : 0), zy = cy + Math.sin(reloj * 4 + z.fase) * 2;
      emoji(Z.emoji, zx, zy, Z.tam);
      if (Z.cono) { // cono naranja sobre la cabeza (ajusta las coordenadas si no queda justo en tu celular)
        ctx.fillStyle = "#ff8c1a"; ctx.beginPath(); ctx.moveTo(zx - 8, zy - 12); ctx.lineTo(zx + 8, zy - 12); ctx.lineTo(zx, zy - 30); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  for (const g of e.tiros) {
    const y = filaY(g.fila) - 6;
    ctx.fillStyle = "#3f9e2e"; ctx.beginPath(); ctx.arc(g.x, y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#8fe06f"; ctx.beginPath(); ctx.arc(g.x - 1.5, y - 1.5, 1.8, 0, 7); ctx.fill();
  }
  for (const f of e.efectos) { ctx.globalAlpha = Math.min(1, f.t / 0.3); emoji("💥", f.x, f.y, 90); ctx.globalAlpha = 1; }
  for (const s of e.soles) {
    ctx.globalAlpha = s.y >= s.destY && s.vida < 2 && Math.floor(s.vida * 6) % 2 ? 0.4 : 1;
    emoji("☀️", s.x, s.y, 30);
    ctx.globalAlpha = 1;
  }
}

function velo(l1, l2, l3) {
  ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(0, Y0, ANCHO, FILAS * CELDA_H);
  texto(l1, ANCHO / 2, Y0 + 80, 24);
  if (l2) texto(l2, ANCHO / 2, Y0 + 125, 15);
  if (l3) texto(l3, ANCHO / 2, Y0 + 160, 15, "#ffe66b");
  texto("Toca para continuar", ANCHO / 2, Y0 + 230, 14, "#c9b48a");
}

function dibujar() {
  dibujarFondo();
  dibujarEscena();
  dibujarHud();
  dibujarProgreso();
  if (e.aviso > 0 && e.fase === "jugando") {
    ctx.fillStyle = "rgba(150,0,0,.75)"; ctx.fillRect(0, Y0 + 100, ANCHO, 40);
    texto(e.textoAviso, ANCHO / 2, Y0 + 120, 17);
  }
  if (e.fase === "listo") {
    velo("🌻 Jardín contra zombis", NIVEL.nombre + ": " + RESUMEN.total + " zombis · " + RESUMEN.banderas + (RESUMEN.banderas === 1 ? " bandera" : " banderas"), "Plantas: " + NIVEL.plantas.map((id) => PLANTAS[id].emoji).join(" "));
    ctx.fillStyle = idx > 0 ? "#7c5cff" : "#555"; ctx.fillRect(FLECHA_IZQ.x, FLECHA_IZQ.y, FLECHA_IZQ.w, FLECHA_IZQ.h);
    ctx.fillStyle = haySiguiente() ? "#7c5cff" : "#555"; ctx.fillRect(FLECHA_DER.x, FLECHA_DER.y, FLECHA_DER.w, FLECHA_DER.h);
    texto("◀", FLECHA_IZQ.x + 30, FLECHA_IZQ.y + 20, 20); texto("▶", FLECHA_DER.x + 30, FLECHA_DER.y + 20, 20);
    texto("Nivel " + (idx + 1) + " de " + NIVELES.length, ANCHO / 2, FLECHA_IZQ.y + 20, 14);
  }
  else if (e.fase === "pausa") velo("Pausa");
  else if (e.fase === "ganado") velo("¡Ganaste! 🎉", e.puntos + " puntos", "Récord: " + record);
  else if (e.fase === "perdido") velo("Los zombis llegaron 🧟", e.puntos + " puntos", "Récord: " + record);
}

// ----- Bucle (paso fijo) -----
cargarNivel(0);
let ultimo = performance.now(), acum = 0;
function bucle(ahora) {
  acum += Math.min(0.25, (ahora - ultimo) / 1000);
  ultimo = ahora;
  if (e.fase === "jugando") {
    while (acum >= PASO) { actualizar(PASO); acum -= PASO; if (e.fase !== "jugando") break; }
  } else acum = 0;
  dibujar();
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);
