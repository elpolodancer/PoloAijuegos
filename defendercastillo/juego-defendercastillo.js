// Ruta: defendercastillo/juego-defendercastillo.js
// «Defensa del castillo»: pantalla, controles y sonido. Las reglas viven en logica-defendercastillo.js y los mapas en niveles-defendercastillo.js.
// Cómo se juega: elige un mapa; elige una torre abajo y toca un lugar libre del pasto para construirla; toca una torre para
// mejorarla o venderla; 🪓 Quitar sirve para talar árboles/rocas (cuesta monedas) o vender torres con un toque; ☄️ lanza un
// meteoro (se recarga solo). Los enemigos caminan por el camino café; si llegan al castillo le quitan vida.
import { NIVELES } from "./niveles-defendercastillo.js";
import {
  CELDA, COLS, FILAS, ANCHO, ALTO, TORRES, ENEMIGOS, METEORO, REEMBOLSO,
  nuevaPartida, celdaLibre, torreEn, obstaculoEn, costeTalar, datosTorre, colocar, mejorar, vender, talar, iniciarOleada, meteoro, paso, estrellas,
} from "./logica-defendercastillo.js";

// ----- Ajustes -----
const ID = "defensa";            // nombre del juego en el ranking
const PUNTOS_POR_PERFIL = 25;    // 1 punto al perfil por cada 25 del juego
const PASO = 1 / 60;             // paso fijo de la simulación (se ve igual en pantallas de 90/120 Hz)
const CLAVE_PROGRESO = "defensa_progreso";
const CLAVE_SONIDO = "defensa_sonido";
const CLAVE_ULTIMO = "defensa_ultimo";   // último mapa jugado
const FUENTE = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
const COLOR_BOTON = { arquero: "b-verde", mago: "b-azul", canon: "b-morado", ballesta: "b-oro", rayos: "b-rojo" }; // color del botón = lo cara y poderosa que es la torre
const COLOR_DIF = { "Fácil": "b-verde", "Media": "b-azul", "Difícil": "b-morado", "Muy difícil": "b-rojo" };
const COLOR_TORRE = { arquero: "#8b5a2b", canon: "#555b6b", mago: "#5b3f9e", ballesta: "#2f6f6a", rayos: "#2d4a8a" };

const $ = (id) => document.getElementById(id);
const leer = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// ----- Sesión y puntos (si Firebase no carga, el juego sigue sin puntos) -----
let jugador = null, usuario = null;
import("../compartido/jugador.js")
  .then((m) => { jugador = m; m.alCambiarSesion((u) => (usuario = u)); })
  .catch(() => {});

// ----- Pantalla -----
const cv = $("lienzo"), ctx = cv.getContext("2d");
const DPR = Math.min(2, window.devicePixelRatio || 1);
cv.width = ANCHO * DPR;
cv.height = ALTO * DPR;
const fondo = document.createElement("canvas");
fondo.width = ANCHO * DPR;
fondo.height = ALTO * DPR;

// ----- Estado -----
let nivelIdx = 0, p = null;
let tipoSel = null, torreSel = null, modoMeteoro = false, modoQuitar = false;
let pausa = false, vel = 1, acum = 0, ultimo = 0, anim = 0;
let finalizado = false, fantasma = null, flash = 0, menuAbierto = true;
let efectos = [];
let msgTexto = "", msgHasta = 0;
let progreso = leer(CLAVE_PROGRESO, {});

// ----- Sonido (WebAudio, sin archivos) -----
let audio = null, sonido = leer(CLAVE_SONIDO, true);
const ultimoSonido = {};
function tono(clave, f1, f2, dur, tipo, vol, espera = 0) {
  if (!sonido) return;
  const ahora = performance.now();
  if (espera && ahora - (ultimoSonido[clave] || 0) < espera) return;
  ultimoSonido[clave] = ahora;
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) {}
}
const melodia = (notas, tipo = "triangle") => notas.forEach((f, i) => setTimeout(() => tono("m" + i, f, f * 0.98, 0.18, tipo, 0.06), i * 140));

// ----- Mensajes -----
function mensaje(t, ms = 2500) { msgTexto = t; msgHasta = performance.now() + ms; }
function resumenOleada() {
  const o = p.nivel.oleadas[p.oleada];
  if (!o) return "";
  const n = {};
  for (const [tipo, cant] of o.grupos) n[tipo] = (n[tipo] || 0) + cant;
  return Object.entries(n).map(([t, c]) => ENEMIGOS[t].icono + "×" + c).join("  ");
}

// ----- Niveles -----
function empezarNivel(i) {
  nivelIdx = i;
  p = nuevaPartida(NIVELES[i]);
  tipoSel = null; torreSel = null; modoMeteoro = false; modoQuitar = false;
  finalizado = false; efectos = []; flash = 0; acum = 0; pausa = false; vel = 1;
  $("btnPausa").firstElementChild.textContent = "⏸"; $("velNum").textContent = "x1";
  $("fin").hidden = true;
  cerrarMenu();
  guardar(CLAVE_ULTIMO, i);
  armarFondo();
  const r = progreso[p.nivel.id];
  $("record").textContent = r ? "Récord: " + r.record + " " + "⭐".repeat(r.estrellas) : "";
  poner("mapaNombre", "Mapa " + p.nivel.id + ": " + p.nivel.nombre + " · " + (p.nivel.dificultad || ""));
  mensaje("Mapa " + p.nivel.id + ": " + p.nivel.nombre, 3000);
}

// ----- Menú de mapas -----
function abrirMenu() {
  const m = $("menu"), lista = $("menuLista");
  lista.textContent = "";
  NIVELES.forEach((n, i) => {
    const r = progreso[n.id];
    const b = document.createElement("button");
    b.className = "b3d txt mapa " + (COLOR_DIF[n.dificultad] || "b-gris");
    const t = document.createElement("b"); t.textContent = n.id + " · " + n.nombre;
    const d = document.createElement("small"); d.textContent = (n.dificultad || "") + (r ? " · " + "⭐".repeat(r.estrellas) + " " + r.record : " · sin jugar");
    b.append(t, d);
    b.addEventListener("click", () => empezarNivel(i));
    lista.appendChild(b);
  });
  m.hidden = false;
  menuAbierto = true;
}
function cerrarMenu() { $("menu").hidden = true; menuAbierto = false; }

function armarFondo() {
  const g = fondo.getContext("2d"), n = p.nivel;
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
    g.fillStyle = (c + f) % 2 ? "#3b7536" : "#3f7d3a";
    g.fillRect(c * CELDA, f * CELDA, CELDA, CELDA);
  }
  g.lineCap = "round"; g.lineJoin = "round";
  const caminos = n.caminos || [n.camino];
  const trazar = () => { g.beginPath(); for (const cam of caminos) cam.forEach(([c, f], i) => (i ? g.lineTo(c * CELDA, f * CELDA) : g.moveTo(c * CELDA, f * CELDA))); };
  trazar(); g.strokeStyle = "#7d5f33"; g.lineWidth = CELDA * 0.98; g.stroke();
  trazar(); g.strokeStyle = "#c9a66b"; g.lineWidth = CELDA * 0.86; g.stroke();
  trazar(); g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 3; g.setLineDash([8, 12]); g.stroke(); g.setLineDash([]);
  // castillo
  const k = n.castillo;
  g.fillStyle = "#59606e";
  g.beginPath();
  g.roundRect ? g.roundRect(k.c * CELDA + 2, k.f * CELDA + 2, k.w * CELDA - 4, k.h * CELDA - 4, 10) : g.rect(k.c * CELDA + 2, k.f * CELDA + 2, k.w * CELDA - 4, k.h * CELDA - 4);
  g.fill();
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = Math.round(Math.min(k.w, k.h) * CELDA * 0.85) + "px " + FUENTE;
  g.fillText("🏰", (k.c + k.w / 2) * CELDA, (k.f + k.h / 2) * CELDA + 4);
  // flechas de entrada de los enemigos
  g.font = "18px " + FUENTE;
  for (const cam of caminos) {
    const [c, f] = cam[0];
    if (c < 0) g.fillText("➡️", 14, f * CELDA);
    else if (c > COLS) g.fillText("⬅️", ANCHO - 14, f * CELDA);
    else if (f < 0) g.fillText("⬇️", c * CELDA, 14);
  }
}

// ----- Entrada -----
function celdaDe(ev) {
  const r = cv.getBoundingClientRect();
  const x = ((ev.clientX - r.left) * ANCHO) / r.width, y = ((ev.clientY - r.top) * ALTO) / r.height;
  return { x, y, c: Math.floor(x / CELDA), f: Math.floor(y / CELDA) };
}
cv.addEventListener("pointermove", (ev) => { const q = celdaDe(ev); fantasma = { c: q.c, f: q.f }; });
cv.addEventListener("pointerleave", () => (fantasma = null));
cv.addEventListener("pointerdown", (ev) => {
  if (menuAbierto || pausa || p.estado === "ganado" || p.estado === "perdido") return;
  const q = celdaDe(ev);
  fantasma = { c: q.c, f: q.f };
  if (modoQuitar) {
    const t = torreEn(p, q.c, q.f), o = obstaculoEn(p, q.c, q.f);
    if (t) { const gana = vender(p, t); torreSel = null; efectos.push({ k: "texto", x: t.x, y: t.y, t: 0, dur: 0.8, txt: "+" + gana + " 🪙" }); tono("v", 400, 700, 0.12, "triangle", 0.05); }
    else if (o) { if (!talar(p, q.c, q.f)) mensaje("Te faltan monedas: talar cuesta " + costeTalar(o) + " 🪙", 1800); }
    return;
  }
  if (modoMeteoro) {
    if (meteoro(p, q.x, q.y)) modoMeteoro = false;
    return;
  }
  const t = torreEn(p, q.c, q.f);
  if (t) { torreSel = t; tipoSel = null; return; }
  if (tipoSel) {
    if (!celdaLibre(p, q.c, q.f)) { mensaje("Ahí no se puede construir", 1500); return; }
    if (!colocar(p, tipoSel, q.c, q.f)) mensaje("Te faltan monedas 🪙", 1500);
    return;
  }
  torreSel = null;
});

// ----- Botones -----
const tienda = $("tienda");
for (const [tipo, d] of Object.entries(TORRES)) {
  const b = document.createElement("button");
  b.className = "b3d " + COLOR_BOTON[tipo];
  b.type = "button";
  b.dataset.tipo = tipo;
  b.setAttribute("aria-label", d.nombre + ", " + d.precio + " monedas");
  const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = d.icono;
  const pr = document.createElement("span"); pr.className = "b-info"; pr.textContent = d.precio + "🪙";
  b.title = d.nombre + ": " + d.desc;
  b.append(ico, pr);
  b.addEventListener("click", () => { tipoSel = tipoSel === tipo ? null : tipo; torreSel = null; modoMeteoro = false; modoQuitar = false; });
  tienda.appendChild(b);
}
$("btnOleada").addEventListener("click", () => { if (iniciarOleada(p)) { tipoSel = null; modoMeteoro = false; modoQuitar = false; } });
$("btnQuitar").addEventListener("click", () => {
  modoQuitar = !modoQuitar; tipoSel = null; torreSel = null; modoMeteoro = false;
  if (modoQuitar) mensaje("🪓 Toca un árbol o roca para talarlo (cuesta monedas) o una torre para venderla", 4000);
});
$("btnMapas").addEventListener("click", () => {
  if ((p.estado === "oleada" || p.torres.length) && p.estado !== "ganado" && p.estado !== "perdido" && !confirm("¿Salir de este mapa? Se pierde la partida en curso.")) return;
  $("fin").hidden = true;
  abrirMenu();
});
$("finMapas").addEventListener("click", abrirMenu);
$("btnMeteoro").addEventListener("click", () => {
  if (p.meteoroEspera > 0 || p.estado === "ganado" || p.estado === "perdido") return;
  modoMeteoro = !modoMeteoro; tipoSel = null; torreSel = null; modoQuitar = false;
  if (modoMeteoro) mensaje("☄️ Toca el mapa donde quieres que caiga", 3000);
});
$("btnVel").addEventListener("click", () => { vel = vel === 1 ? 2 : 1; $("velNum").textContent = "x" + vel; });
$("btnPausa").addEventListener("click", () => pausar(!pausa));
$("btnSonido").addEventListener("click", () => { sonido = !sonido; guardar(CLAVE_SONIDO, sonido); $("btnSonido").firstElementChild.textContent = sonido ? "🔊" : "🔇"; });
$("btnSonido").firstElementChild.textContent = sonido ? "🔊" : "🔇";
$("finReintentar").addEventListener("click", () => empezarNivel(nivelIdx));
$("finSiguiente").addEventListener("click", () => empezarNivel(nivelIdx + 1));
function pausar(v) { pausa = v; $("btnPausa").firstElementChild.textContent = pausa ? "▶" : "⏸"; }
document.addEventListener("visibilitychange", () => { if (document.hidden && p.estado === "oleada") pausar(true); });

// ----- Eventos del juego → sonido y efectos -----
function eventos() {
  for (const e of p.ev) {
    if (e.t === "disparo") {
      if (e.tipo === "arquero") tono("a", 900, 500, 0.07, "square", 0.02, 70);
      else if (e.tipo === "canon") tono("c", 170, 60, 0.2, "sawtooth", 0.05, 80);
      else if (e.tipo === "ballesta") tono("bb", 260, 90, 0.16, "square", 0.04, 80);
      else tono("m", 600, 1200, 0.12, "sine", 0.04, 80);
    } else if (e.t === "muerte") {
      efectos.push({ k: "texto", x: e.x, y: e.y, t: 0, dur: 0.8, txt: "+" + e.oro + " 🪙" });
      tono("x", 520, 220, 0.1, "triangle", 0.035, 50);
    } else if (e.t === "explosion") {
      efectos.push({ k: "explosion", x: e.x, y: e.y, t: 0, dur: 0.3, r: e.r });
      tono("e", 130, 40, 0.25, "sawtooth", 0.05, 60);
    } else if (e.t === "flecha") {
      efectos.push({ k: "chispa", x: e.x, y: e.y, t: 0, dur: 0.15 });
    } else if (e.t === "rayo") {
      const linea = [];
      for (let i = 0; i < e.pts.length - 1; i++) {
        const a = e.pts[i], b = e.pts[i + 1];
        linea.push(a);
        for (let j = 1; j < 4; j++) linea.push({ x: a.x + ((b.x - a.x) * j) / 4 + (Math.random() - 0.5) * 10, y: a.y + ((b.y - a.y) * j) / 4 + (Math.random() - 0.5) * 10 });
      }
      linea.push(e.pts[e.pts.length - 1]);
      efectos.push({ k: "rayo", linea, t: 0, dur: 0.2 });
      tono("r", 1400, 250, 0.14, "sawtooth", 0.035, 90);
    } else if (e.t === "talar") {
      efectos.push({ k: "texto", x: e.x, y: e.y, t: 0, dur: 0.8, txt: "-" + e.coste + " 🪙", rojo: true });
      efectos.push({ k: "chispa", x: e.x, y: e.y, t: 0, dur: 0.25 });
      tono("t", 220, 90, 0.15, "sawtooth", 0.05);
    } else if (e.t === "meteoro") {
      efectos.push({ k: "explosion", x: e.x, y: e.y, t: 0, dur: 0.5, r: METEORO.radio * CELDA, fuego: true });
      tono("mt", 90, 30, 0.5, "sawtooth", 0.09);
    } else if (e.t === "castillo") {
      flash = 1;
      efectos.push({ k: "texto", x: (p.nivel.castillo.c + p.nivel.castillo.w / 2) * CELDA, y: p.nivel.castillo.f * CELDA, t: 0, dur: 1, txt: "-" + e.dano + " ❤️", rojo: true });
      tono("h", 120, 50, 0.35, "square", 0.08);
    } else if (e.t === "construir") {
      efectos.push({ k: "chispa", x: e.x, y: e.y, t: 0, dur: 0.25 });
      tono("b", 300, 600, 0.12, "triangle", 0.06);
    } else if (e.t === "mejora") {
      efectos.push({ k: "texto", x: e.x, y: e.y - 14, t: 0, dur: 0.8, txt: "⬆️" });
      melodia([500, 750]);
    } else if (e.t === "oleada") {
      mensaje("🌊 Oleada " + e.n + " de " + p.nivel.oleadas.length + (e.n === p.nivel.oleadas.length ? " — ¡el jefe! 🧌" : ""), 3000);
      tono("o", 220, 440, 0.4, "sawtooth", 0.05);
    } else if (e.t === "oleadaLista") {
      mensaje("✅ Oleada superada: +" + e.bono + " 🪙", 3000);
      melodia([440, 550]);
    } else if (e.t === "fin") {
      terminar(e.ganado);
    }
  }
  p.ev.length = 0;
}

async function terminar(ganado) {
  if (finalizado) return;
  finalizado = true;
  tipoSel = null; torreSel = null; modoMeteoro = false; modoQuitar = false;
  const est = estrellas(p), pts = p.puntos;
  melodia(ganado ? [523, 659, 784, 1047] : [330, 262, 196, 130], ganado ? "triangle" : "sawtooth");
  const r = progreso[p.nivel.id] || { estrellas: 0, record: 0 };
  progreso[p.nivel.id] = { estrellas: Math.max(r.estrellas, est), record: Math.max(r.record, pts) };
  guardar(CLAVE_PROGRESO, progreso);
  $("record").textContent = "Récord: " + progreso[p.nivel.id].record + " " + "⭐".repeat(progreso[p.nivel.id].estrellas);
  $("finTitulo").textContent = ganado ? "¡Castillo defendido! 🏰" : "El castillo cayó 💥";
  $("estrellas").textContent = ganado ? "⭐".repeat(est) + "☆".repeat(3 - est) : "";
  const ganados = Math.floor(pts / PUNTOS_POR_PERFIL);
  let txt = (ganado ? "Oleadas superadas: " + p.oleada + "/" + p.nivel.oleadas.length : "Llegaste a la oleada " + (p.oleada + 1) + " de " + p.nivel.oleadas.length) +
    " · Monstruos derrotados: " + p.matados + " · Puntos: " + pts;
  $("finTexto").textContent = txt;
  $("finSiguiente").hidden = !(ganado && nivelIdx + 1 < NIVELES.length);
  $("finSiguiente").textContent = "Siguiente mapa ▶";
  $("fin").hidden = false;
  if (jugador && usuario && ganados > 0) {
    try {
      if (await jugador.sumarPuntos(ID, ganados)) $("finTexto").textContent = txt + " · +" + ganados + " al perfil";
    } catch (e) {}
  } else if (jugador && !usuario && ganados > 0) {
    $("finTexto").textContent = txt + " · Entra con Google en el portal para guardar tus puntos";
  }
}

// ----- Dibujo -----
function emoji(txt, x, y, tam) { ctx.font = tam + "px " + FUENTE; ctx.fillText(txt, x, y); }
function circulo(x, y, r, relleno, borde) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
  if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1.5; ctx.stroke(); }
}
function etiqueta(txt, x, y, color) {
  ctx.font = "bold 11px " + FUENTE;
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.75)";
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
}
function dibujar() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.drawImage(fondo, 0, 0, ANCHO, ALTO);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // alcance de la torre elegida y vista previa al construir
  if (torreSel && p.torres.includes(torreSel)) {
    const d = datosTorre(torreSel);
    circulo(torreSel.x, torreSel.y, d.alcance * CELDA, "rgba(255,255,255,.12)", "rgba(255,255,255,.5)");
  }
  if (tipoSel && fantasma) {
    const { c, f } = fantasma, ok = celdaLibre(p, c, f);
    if (c >= 0 && c < COLS && f >= 0 && f < FILAS) {
      ctx.fillStyle = ok ? "rgba(120,255,120,.35)" : "rgba(255,80,80,.35)";
      ctx.fillRect(c * CELDA, f * CELDA, CELDA, CELDA);
      if (ok) circulo((c + 0.5) * CELDA, (f + 0.5) * CELDA, TORRES[tipoSel].niveles[0].alcance * CELDA, "rgba(255,255,255,.1)", "rgba(255,255,255,.4)");
    }
  }

  // árboles y rocas (se pueden talar)
  ctx.font = "26px " + FUENTE;
  for (const o of p.obstaculos) {
    if (modoQuitar) circulo((o.c + 0.5) * CELDA, (o.f + 0.5) * CELDA, 19, "rgba(255,210,80,.18)", "rgba(255,210,80,.7)");
    ctx.font = "26px " + FUENTE;
    ctx.fillText(o.e, (o.c + 0.5) * CELDA, (o.f + 0.5) * CELDA + 2);
    if (modoQuitar) etiqueta(costeTalar(o) + "🪙", (o.c + 0.5) * CELDA, (o.f + 1) * CELDA - 5, p.oro >= costeTalar(o) ? "#ffe27a" : "#ff8a8a");
  }

  // torres
  for (const t of p.torres) {
    circulo(t.x, t.y, 18, COLOR_TORRE[t.tipo], torreSel === t ? "#ffd34d" : "rgba(0,0,0,.45)");
    emoji(TORRES[t.tipo].icono, t.x, t.y + 1, 24);
    ctx.fillStyle = "#ffd34d";
    for (let i = 0; i <= t.nivel; i++) { ctx.beginPath(); ctx.arc(t.x - t.nivel * 4 + i * 8, t.y + 20, 2.5, 0, Math.PI * 2); ctx.fill(); }
    if (modoQuitar) etiqueta("+" + Math.floor(t.invertido * REEMBOLSO), t.x, t.y - 22, "#9dff9d");
    // flecha direccional: rodea la torre y apunta al enemigo que tiene fijado (lo sigue mientras se mueve)
    if (t.obj && t.obj.vivo && t.ang !== undefined) {
      const ux = Math.cos(t.ang), uy = Math.sin(t.ang), rx = t.x + ux * 25, ry = t.y + uy * 25;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,.75)"; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(rx + ux * 7, ry + uy * 7);
      ctx.lineTo(rx - ux * 4 - uy * 5, ry - uy * 4 + ux * 5);
      ctx.lineTo(rx - ux * 4 + uy * 5, ry - uy * 4 - ux * 5);
      ctx.closePath(); ctx.stroke(); ctx.fill();
    }
  }

  // enemigos (los de más abajo se dibujan encima)
  const orden = p.enemigos.slice().sort((a, b) => a.y - b.y);
  for (const e of orden) {
    const def = ENEMIGOS[e.tipo], y = e.y + Math.sin(anim * 10 + e.id) * 1.5;
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(e.x, y + def.tam * 0.45, def.tam * 0.45, def.tam * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    if (e.lentoT > 0) circulo(e.x, y, def.tam * 0.62, "rgba(110,170,255,.35)", "rgba(150,200,255,.8)");
    emoji(def.icono, e.x, y, def.tam);
    if (e.hp < e.hpMax) {
      const w = Math.max(18, def.tam * 0.9), x0 = e.x - w / 2, y0 = y - def.tam * 0.7;
      ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 5);
      ctx.fillStyle = e.hp / e.hpMax > 0.5 ? "#4cd964" : e.hp / e.hpMax > 0.25 ? "#ffcc00" : "#ff4d4d";
      ctx.fillRect(x0, y0, w * (e.hp / e.hpMax), 3);
    }
  }

  // proyectiles
  for (const py of p.proyectiles) {
    if (py.tipo === "arquero") {
      const a = py.ang || 0;
      ctx.strokeStyle = "#f3e2b3"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(py.x - Math.cos(a) * 7, py.y - Math.sin(a) * 7); ctx.lineTo(py.x + Math.cos(a) * 4, py.y + Math.sin(a) * 4); ctx.stroke();
    } else if (py.tipo === "ballesta") {
      const a = py.ang || 0;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1c2430"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(py.x - Math.cos(a) * 9, py.y - Math.sin(a) * 9); ctx.lineTo(py.x + Math.cos(a) * 6, py.y + Math.sin(a) * 6); ctx.stroke();
      ctx.strokeStyle = "#dfe8f5"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(py.x - Math.cos(a) * 9, py.y - Math.sin(a) * 9); ctx.lineTo(py.x + Math.cos(a) * 6, py.y + Math.sin(a) * 6); ctx.stroke();
      ctx.lineCap = "butt";
    } else if (py.tipo === "canon") circulo(py.x, py.y, 5, "#222", "#888");
    else { circulo(py.x, py.y, 7, "rgba(190,140,255,.35)"); circulo(py.x, py.y, 4, "#d9b8ff"); }
  }

  // efectos
  for (const e of efectos) {
    const k = e.t / e.dur;
    if (e.k === "explosion") {
      circulo(e.x, e.y, e.r * (0.4 + 0.6 * k), (e.fuego ? "rgba(255,120,30," : "rgba(255,190,60,") + (0.55 * (1 - k)).toFixed(2) + ")", "rgba(255,255,255," + (0.6 * (1 - k)).toFixed(2) + ")");
    } else if (e.k === "rayo") {
      ctx.globalAlpha = 1 - k;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(120,170,255,.8)"; ctx.lineWidth = 6;
      ctx.beginPath(); e.linea.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); e.linea.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.k === "chispa") {
      circulo(e.x, e.y, 4 + 8 * k, "rgba(255,255,255," + (0.7 * (1 - k)).toFixed(2) + ")");
    } else if (e.k === "texto") {
      ctx.globalAlpha = 1 - k * k;
      ctx.font = "bold 13px " + FUENTE;
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)";
      ctx.strokeText(e.txt, e.x, e.y - 16 - 22 * k);
      ctx.fillStyle = e.rojo ? "#ff7a7a" : "#ffe27a";
      ctx.fillText(e.txt, e.x, e.y - 16 - 22 * k);
      ctx.globalAlpha = 1;
    }
  }

  // vida del castillo
  const k = p.nivel.castillo, w = k.w * CELDA - 8, x0 = k.c * CELDA + 4, y0 = k.f * CELDA - 9, fr = p.vida / p.nivel.vidaCastillo;
  ctx.fillStyle = "rgba(0,0,0,.65)"; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 9);
  ctx.fillStyle = fr > 0.5 ? "#4cd964" : fr > 0.25 ? "#ffcc00" : "#ff4d4d";
  ctx.fillRect(x0, y0, w * fr, 7);
  if (flash > 0) { ctx.fillStyle = "rgba(255,0,0," + (0.3 * flash).toFixed(2) + ")"; ctx.fillRect(0, 0, ANCHO, ALTO); }
  if (modoMeteoro && fantasma) circulo((fantasma.c + 0.5) * CELDA, (fantasma.f + 0.5) * CELDA, METEORO.radio * CELDA, "rgba(255,120,30,.2)", "rgba(255,160,60,.8)");
  if (pausa) {
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = "#fff"; ctx.font = "bold 30px " + FUENTE; ctx.fillText("⏸ Pausa", ANCHO / 2, ALTO / 2);
  }
}

// ----- Marcadores y botones (solo se tocan si cambian) -----
const memo = {};
function poner(id, valor, prop = "textContent") { if (memo[id + prop] !== valor) { memo[id + prop] = valor; $(id)[prop] = valor; } }
function ui() {
  const total = p.nivel.oleadas.length;
  poner("oro", String(Math.floor(p.oro)));
  $("btnQuitar").classList.toggle("on", modoQuitar);
  poner("vida", String(Math.ceil(p.vida)));
  poner("oleada", Math.min(total, p.oleada + 1) + "/" + total);
  for (const b of tienda.children) {
    const t = b.dataset.tipo;
    b.classList.toggle("on", tipoSel === t);
    b.classList.toggle("sin", p.oro < TORRES[t].precio); // sin monedas suficientes
  }
  const bo = $("btnOleada");
  bo.disabled = p.estado !== "preparando";
  poner("btnOleadaIco", p.estado === "oleada" ? "🌊" : p.estado === "preparando" ? "▶" : "🏁");
  poner("btnOleadaNum", p.estado === "preparando" ? String(p.oleada + 1) : "");   // número de la próxima oleada
  bo.classList.toggle("activo", !bo.disabled);                                  // late cuando ya puedes empezarla
  const bm = $("btnMeteoro");
  bm.disabled = p.meteoroEspera > 0;
  bm.classList.toggle("on", modoMeteoro);
  const carga = Math.round((1 - p.meteoroEspera / METEORO.espera) * 100);
  if (memo.carga !== carga) { memo.carga = carga; bm.style.setProperty("--carga", carga + "%"); }
  poner("btnMeteoroNum", p.meteoroEspera > 0 ? Math.ceil(p.meteoroEspera) + "s" : "");

  // panel de la torre elegida
  const panel = $("panel");
  if (torreSel && !p.torres.includes(torreSel)) torreSel = null;
  if (!torreSel) { panel.hidden = true; memo.panel = ""; }
  else {
    const d = datosTorre(torreSel), def = TORRES[torreSel.tipo], sube = d.sube;
    const clave = torreSel.id + "|" + torreSel.nivel + "|" + (sube && p.oro >= sube ? 1 : 0);
    if (memo.panel !== clave) {
      memo.panel = clave;
      panel.hidden = false;
      panel.classList.toggle("abajo", torreSel.f < FILAS / 2); // si la torre está arriba, el panel va abajo y viceversa
      panel.textContent = "";
      const el = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt !== undefined) x.textContent = txt; return x; };
      const sig = def.niveles[torreSel.nivel + 1];           // datos del siguiente nivel (si lo hay) para mostrar la mejora
      const info = el("div");
      const cab = el("div", "cab");
      const ic = el("span", "ico", def.icono); ic.style.setProperty("--c", COLOR_TORRE[torreSel.tipo]);
      cab.append(ic, el("span", "nom", def.nombre), el("span", "pips", "●".repeat(torreSel.nivel + 1) + "○".repeat(2 - torreSel.nivel)));
      const chips = el("div", "chips");
      const chip = (ico, v, s, suf = "") => {
        const c = el("span", "dato", ico + " " + v + suf);
        if (s !== undefined && s !== v) c.append(" → ", el("em", "", s + suf));
        chips.appendChild(c);
      };
      chip("💥 daño", d.dano, sig && sig.dano);
      if (d.radio) chips.appendChild(el("span", "dato", "💣 área"));
      chip("🎯 alcance", d.alcance, sig && sig.alcance);
      chip("⏱️ cada", d.cadencia, sig && sig.cadencia, " s");
      if (d.lento) chips.appendChild(el("span", "dato", "🐌 frena"));
      if (d.cadena) chip("⚡ saltos", d.cadena, sig && sig.cadena);
      info.append(cab, chips);
      const fila = document.createElement("div"); fila.className = "fila";
      const bu = document.createElement("button"); bu.className = "b3d txt chico " + (torreSel.nivel ? "b-oro" : "b-azul");
      bu.textContent = sube ? "⬆️ Mejorar · " + sube + " 🪙" : "Nivel máximo";
      bu.disabled = !sube || p.oro < sube;
      const t = torreSel;
      bu.addEventListener("click", () => { mejorar(p, t); });
      const bv = document.createElement("button"); bv.className = "b3d txt chico b-gris";
      bv.textContent = "💰 Vender · +" + Math.floor(t.invertido * REEMBOLSO) + " 🪙";
      bv.addEventListener("click", () => { vender(p, t); torreSel = null; });
      fila.append(bu, bv);
      panel.append(info, fila);
    }
  }

  // texto de ayuda
  let texto = msgTexto;
  if (performance.now() > msgHasta) {
    texto = p.estado === "preparando" ? "Prepara tu defensa. Viene: " + resumenOleada()
      : p.estado === "oleada" ? "🌊 Oleada en curso…" : "";
    if (modoQuitar) texto = "🪓 Toca un árbol o roca para talarlo (cuesta monedas) o una torre para venderla";
    else if (tipoSel) texto = TORRES[tipoSel].icono + " " + TORRES[tipoSel].nombre + ": " + TORRES[tipoSel].desc + ". Toca un lugar libre del pasto para ponerla";
    else if (p.estado === "preparando" && p.oleada === 0 && !p.torres.length) texto = "Elige una torre abajo y colócala junto al camino café. Viene: " + resumenOleada();
  }
  poner("estado", texto);
}

// ----- Bucle -----
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, (ts - ultimo) / 1000 || 0);
  ultimo = ts;
  anim += dt;
  if (!pausa && !menuAbierto) {
    acum += dt * vel;
    let n = 0;
    while (acum >= PASO && n < 12) { paso(p, PASO); acum -= PASO; n++; }
    if (n >= 12) acum = 0;
    for (const e of efectos) e.t += dt;
    efectos = efectos.filter((e) => e.t < e.dur);
    if (flash > 0) flash = Math.max(0, flash - dt * 3);
  }
  eventos();
  dibujar();
  ui();
}

// Arranca con el último mapa jugado y muestra el menú de mapas
empezarNivel(Math.min(NIVELES.length - 1, Math.max(0, +leer(CLAVE_ULTIMO, 0) || 0)));
abrirMenu();
requestAnimationFrame(bucle);
