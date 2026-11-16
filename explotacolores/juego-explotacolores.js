// Ruta: explotacolores/juego-explotacolores.js
// «Explota colores» (id de puntos: explotacolores). Toca un grupo de 3 o más bloques del mismo color y se quita al instante;
// los de arriba caen y llegan bloques nuevos, también muy rápido. Ronda de 60 s (empieza con tu primer toque).
import { COLUMNAS, FILAS, MIN_GRUPO, DIFICULTADES, crearTablero, grupoEn, tamanosJugables, puntosGrupo, quitarGrupo } from "./logica-explotacolores.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

const ID = "explotacolores", CLAVE = "explotacolores_progreso_v1", SEGUNDOS = 60;
const GRAVEDAD = 170, V_MAX = 45;               // filas/s² y filas/s: una columna entera cae en ~0,4 s
const COLORES = ["#ef4b4b", "#3b82f6", "#3fcf4a", "#ffd23f", "#a855f7", "#ff8a2a", "#22d3ee"];
const FORMAS = ["●", "▲", "■", "◆", "★", "♥", "✚"]; // además del color, cada color tiene su figura (ayuda si no distingues colores)

const $ = (id) => document.getElementById(id);
const lienzo = $("tablero"), ctx = lienzo.getContext("2d");
let modo = "menu", dif = DIFICULTADES[2], t = null, jug = null, puntos = 0, restante = SEGUNDOS, empezo = false, pausado = false;
let pops = [], geo = { cel: 20, ox: 0, oy: 0 };

// ----- Progreso local primero: { m: { "<colores>": mejor puntaje }, t } -----
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) || { m: {} }; } catch (e) { return { m: {} }; } };
let nube = null;
function guardarRecord(colores, p) {
  const d = leer(); d.m = d.m || {};
  if (p <= (Number(d.m[colores]) || 0)) return false;
  d.m[colores] = p; d.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) {}
  if (nube) nube.guardado();
  return true;
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => (a || b) ? { m: m.unirMaximos(a && a.m, b && b.m) || {}, t: Math.max((a && a.t) || 0, (b && b.t) || 0) } : null,
    alCambiar: pintarDificultades,
  });
}).catch(() => {});

// ----- Sesión (sin Firebase no pasa nada) -----
import("../compartido/jugador.js").then((j) => {
  let u = null;
  j.alCambiarSesion((x) => { u = x; $("btn-sesion").lastChild.textContent = x ? " " + (x.displayName || "Jugador").split(" ")[0] : " Iniciar sesión"; });
  $("btn-sesion").addEventListener("click", () => { (u ? j.salir() : j.entrar()).catch(() => {}); });
}).catch(() => { $("btn-sesion").addEventListener("click", () => aviso("Sin conexión: no se puede iniciar sesión ahora")); });

function aviso(texto) {
  const a = $("aviso"); a.textContent = texto; a.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.hidden = true), 2200);
}

// ----- Menú principal estándar -----
function pintarDificultades() {
  const rec = leer().m || {};
  $("lista-dif").replaceChildren(...DIFICULTADES.map((d) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "b3d txt " + d.clase;
    b.textContent = d.nombre + " · " + d.colores + " colores" + (rec[d.colores] ? " · 🏆 " + rec[d.colores] : "");
    b.addEventListener("click", () => iniciar(d));
    return b;
  }));
}
$("b-libre").addEventListener("click", () => {
  const l = $("lista-dif"); l.hidden = !l.hidden;
  $("b-libre").setAttribute("aria-expanded", String(!l.hidden));
});
$("b-niveles").addEventListener("click", () => aviso("🚧 Los niveles todavía no están creados"));
$("b-mapa").addEventListener("click", () => aviso("🚧 Los niveles todavía no están creados"));
$("b-otra").addEventListener("click", () => iniciar(dif));
$("b-menu").addEventListener("click", irMenu);

function mostrar(juego) {
  modo = juego ? "juego" : "menu";
  $("menu").hidden = juego; $("hud-sesion").hidden = juego;
  lienzo.hidden = !juego; $("info").hidden = !juego; $("btn-menu").hidden = !juego;
  $("fin").hidden = true;
  if (juego) acomodar();
}
function irMenu() { pausado = false; mostrar(false); pintarDificultades(); }

function iniciar(d) {
  dif = d; t = crearTablero(d.colores); jug = tamanosJugables(t);
  puntos = 0; restante = SEGUNDOS; empezo = false; pausado = false; pops = [];
  mostrar(true); chips();
}

// ----- Menú de pausa estándar -----
crearMenuPausa({
  boton: $("btn-menu"),
  puedeAbrir: () => modo === "juego",
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "🔄", texto: "Reiniciar partida", clase: "b-azul", alElegir: () => iniciar(dif) }],
  alSalir: irMenu,
  ayudaSalir: "Se pierde el puntaje de esta ronda",
});

// ----- Tamaño y posición: el tablero es 10×15 y no pisa los botones fijos de las esquinas -----
function acomodar() {
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
  const horizontal = W > H * 1.15;
  const arriba = horizontal ? 8 : 150, abajo = horizontal ? 8 : 64;
  const cel = Math.max(14, Math.floor(Math.min((W - 16) / COLUMNAS, (H - arriba - abajo) / FILAS)));
  const w = cel * COLUMNAS, h = cel * FILAS;
  const x = Math.round((W - w) / 2), y = horizontal ? Math.round((H - h) / 2) : arriba;
  Object.assign(lienzo.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  geo = { cel, w, h };
  const info = $("info");
  if (horizontal) { Object.assign(info.style, { left: x + w + 14 + "px", top: y + "px", right: "auto", transform: "none", flexDirection: "column" }); }
  else { Object.assign(info.style, { left: "50%", top: "max(104px, calc(env(safe-area-inset-top) + 96px))", right: "auto", transform: "translateX(-50%)", flexDirection: "row" }); }
  const f = $("fin"); Object.assign(f.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
}
addEventListener("resize", () => { if (modo === "juego") acomodar(); });

function chips() {
  $("chip-puntos").textContent = "⭐ " + puntos.toLocaleString("es");
  $("chip-tiempo").textContent = "⏱️ " + Math.max(0, Math.ceil(restante)) + " s";
}

// ----- Toque: responde al instante, sin esperar a que termine ninguna caída -----
lienzo.addEventListener("pointerdown", (e) => {
  if (modo !== "juego" || pausado || restante <= 0) return;
  e.preventDefault();
  const b = lienzo.getBoundingClientRect(), cel = geo.cel;
  const c = Math.floor((e.clientX - b.left) / cel), py = (e.clientY - b.top) / cel;
  if (c < 0 || c >= COLUMNAS) return;
  let r = -1; // el bloque que SE VE bajo el dedo (aunque todavía esté cayendo)
  for (let i = 0; i < FILAS; i++) { const y = t[i][c].y; if (py >= y && py < y + 1) { r = i; break; } }
  if (r < 0) return;
  const g = grupoEn(t, r, c);
  if (g.length < MIN_GRUPO) { pops.push({ x: (c + .5) * cel, y: (py) * cel, t: 0, txt: "✖", mal: true }); return; }
  empezo = true;
  const p = puntosGrupo(g.length);
  puntos += p;
  pops.push({ x: (c + .5) * cel, y: py * cel, t: 0, txt: "+" + p });
  quitarGrupo(t, g, dif.colores);
  jug = tamanosJugables(t);
  chips();
});

function terminar() {
  modo = "fin";
  const nuevo = guardarRecord(dif.colores, puntos);
  $("fin-puntos").textContent = "⭐ " + puntos.toLocaleString("es");
  $("fin-record").textContent = nuevo ? "🏆 ¡Nuevo récord!" : "🏆 Tu récord: " + ((leer().m || {})[dif.colores] || 0).toLocaleString("es");
  $("fin").hidden = false; $("btn-menu").hidden = true;
}

// ----- Bucle: física de caída y dibujo -----
let previo = performance.now();
function cuadro(ahora) {
  const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
  if (modo === "juego" || modo === "fin") {
    if (!pausado) {
      for (let r = FILAS - 1; r >= 0; r--) for (let c = 0; c < COLUMNAS; c++) {
        const k = t[r][c];
        if (k.y < r) { k.v = Math.min(V_MAX, k.v + GRAVEDAD * dt); k.y = Math.min(r, k.y + k.v * dt); if (k.y >= r) k.v = 0; }
      }
      for (const p of pops) p.t += dt;
      pops = pops.filter((p) => p.t < 0.7);
      if (modo === "juego" && empezo) { restante -= dt; chips(); if (restante <= 0) { restante = 0; chips(); terminar(); } }
    }
    dibujar();
  }
  requestAnimationFrame(cuadro);
}

function dibujar() {
  const { cel, w, h } = geo;
  ctx.clearRect(0, 0, w, h); // transparente: se ve la madera
  ctx.fillStyle = "rgba(25,14,6,.42)";
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 10); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold " + Math.floor(cel * 0.46) + "px system-ui, sans-serif";
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) {
    const k = t[r][c], x = c * cel, y = k.y * cel;
    if (y + cel < 0) continue;
    const ok = jug[r * COLUMNAS + c] > 0, m = cel * (ok ? 0.04 : 0.09);
    ctx.globalAlpha = ok ? 1 : 0.68;
    ctx.fillStyle = COLORES[k.c];
    ctx.beginPath(); ctx.roundRect(x + m, y + m, cel - 2 * m, cel - 2 * m, cel * 0.22); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.roundRect(x + m + 2, y + m + 2, cel - 2 * m - 4, (cel - 2 * m) * 0.38, cel * 0.16); ctx.fill();
    if (ok) { ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText(FORMAS[k.c], x + cel / 2, y + cel / 2 + 1);
  }
  ctx.globalAlpha = 1;
  for (const p of pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 0.7);
    ctx.font = "800 " + Math.floor(cel * 0.8) + "px system-ui, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.fillStyle = p.mal ? "#ff9a9a" : "#fff4c2";
    const y = p.y - p.t * cel * 3;
    ctx.strokeText(p.txt, p.x, y); ctx.fillText(p.txt, p.x, y);
  }
  ctx.restore();
}

pintarDificultades();
requestAnimationFrame(cuadro);
