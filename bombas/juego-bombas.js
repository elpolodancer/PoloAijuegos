// Ruta: bombas/juego-bombas.js
// Juego «Bombas» (estilo Bomberman). Las REGLAS viven en logica-bombas.js; aquí están la pantalla, el sonido, los controles, el menú y el progreso.
// Menú principal estándar (ESTANDARES-juegos.md, secciones 7 y 9): ♾️ Modo libre (despliega las 5 dificultades) · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir.
// Niveles: el mapa estándar (32 estados + 194 países, 100 niveles cada uno) ya está armado, pero los niveles NO se generan todavía (sección 10):
// al tocar uno se avisa «Los niveles todavía no están creados».

import { DURACION_FUEGO, DIFICULTADES_LIBRE, BOTS, MAX_BOMBAS, MAX_ALCANCE, PASO_JUGADOR, nuevaRonda, paso, puertaAbierta } from "./logica-bombas.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const ID = "bombas";

// ---------- AJUSTES ----------
const PUNTOS_POR_PERFIL = 25;    // 1 punto al perfil por cada 25 del juego
const LIBRE_DA_PUNTOS = false;   // estándar: el Modo libre no da puntos al perfil
const POR_ETAPA = 100;           // niveles por estado y por país (22 600 en total)
const NIVELES_CREADOS = 0;       // cuántos niveles existen ya (0 = ninguno, ver sección 10 de los estándares)
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA });
const TOTAL = ETAPAS.total;
const TAM = 40;                  // píxeles lógicos por casilla
const VIS_C = 13, VIS_F = 11;    // casillas que se ven a la vez: los mapas más grandes (hasta 40×40) se siguen con una cámara
const ANCHO = VIS_C * TAM, ALTO = VIS_F * TAM;

// ---------- Sonidos (WebAudio, sin archivos) ----------
let audio = null, silencio = false;
try { silencio = localStorage.getItem("bombas_silencio") === "1"; } catch (e) {}
function ac() {
  if (silencio) return null;
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (audio.state === "suspended") audio.resume();
  return audio;
}
function tono(f, dur, o = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (o.retraso || 0), osc = a.createOscillator(), g = a.createGain();
  osc.type = o.tipo || "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
  g.gain.setValueAtTime(o.vol || 0.12, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function sonido(tipo) {
  switch (tipo) {
    case "poner": tono(220, 0.08, { tipo: "triangle", hasta: 160 }); break;
    case "explota": tono(120, 0.35, { tipo: "sawtooth", hasta: 40, vol: 0.18 }); break;
    case "bloque": tono(300, 0.06, { tipo: "square", hasta: 150, vol: 0.05 }); break;
    case "enemigo": tono(500, 0.2, { tipo: "triangle", hasta: 200 }); break;
    case "puerta": [392, 523, 659].forEach((f, i) => tono(f, 0.12, { tipo: "triangle", vol: 0.08, retraso: i * 0.07 })); break;
    case "item": [660, 880, 1100].forEach((f, i) => tono(f, 0.1, { tipo: "square", vol: 0.06, retraso: i * 0.06 })); break;
    case "muerte": tono(400, 0.5, { tipo: "sawtooth", hasta: 70, vol: 0.14 }); break;
    case "gano": [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.2, { tipo: "triangle", retraso: i * 0.1 })); break;
    case "perdio": [440, 392, 349, 262].forEach((f, i) => tono(f, 0.35, { tipo: "triangle", vol: 0.15, retraso: i * 0.2 })); break;
    case "cambiar": tono(660, 0.06, { tipo: "square", vol: 0.06 }); break;
  }
}

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
lienzo.width = ANCHO * 2; lienzo.height = ALTO * 2;
ctx.scale(2, 2);
const elNivel = $("nivel"), elEtNivel = $("etNivel"), elVidas = $("vidas"), elPuntos = $("puntos"), elRecord = $("record"), elSonido = $("sonido"), btnMenu = $("btn-menu"), btnSesion = $("btn-sesion");
function pintarBotonSonido() { elSonido.textContent = silencio ? "🔇" : "🔊"; elSonido.setAttribute("aria-label", silencio ? "Activar sonido" : "Silenciar"); }
pintarBotonSonido();
elSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("bombas_silencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido(); sonido("cambiar");
});

// ---------- Estado ----------
// estado: "inicio" (menú principal) | "mapa" (niveles / mapa) | "jugando" | "fin" (perdiste)
let E = null, estado = "inicio", modo = "libre", dif = "normal", ronda = 1, nivel = 1;
let pausado = false, enviadosPerfil = 0, destello = 0;

// ---------- Progreso: { record, max, hecho, t } ----------
const CLAVE = "bombas_progreso_v1";
function normalizar(x) {
  if (!x || typeof x !== "object") return null;
  const hecho = Math.min(TOTAL, Math.max(0, Math.floor(Number(x.hecho)) || 0));
  return { record: Math.max(0, Number(x.record) || 0), max: Math.min(TOTAL, Math.max(hecho + 1, Math.floor(Number(x.max)) || 1)), hecho, t: Number(x.t) || 0 };
}
function unir(a, b) {
  a = normalizar(a); b = normalizar(b);
  if (!a || !b) return a || b || null;
  return { record: Math.max(a.record, b.record), max: Math.max(a.max, b.max), hecho: Math.max(a.hecho, b.hecho), t: Math.max(a.t, b.t) };
}
function leerProgreso() { try { return normalizar(JSON.parse(localStorage.getItem(CLAVE))) || normalizar({}); } catch (e) { return normalizar({}); } }
let prog = leerProgreso();
elRecord.textContent = prog.record;
let nube = null;
function guardarProgreso() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE, fusionar: unir, alCambiar: (v) => { prog = normalizar(v) || prog; elRecord.textContent = prog.record; mapa.refrescar(); } });
}).catch(() => {});

// ---------- Perfil (puntos totales del portal) ----------
function darPuntosPerfil(n) {
  if (!(n > 0)) return;
  encolarPuntos(ID, n);
  import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
}
function enviarPerfilLibre() {
  if (!LIBRE_DA_PUNTOS || modo !== "libre" || !E) return;
  const debe = Math.floor(E.puntos / PUNTOS_POR_PERFIL) - enviadosPerfil;
  if (debe <= 0) return;
  enviadosPerfil += debe;
  darPuntosPerfil(debe);
}

// ---------- Sesión (👤 Iniciar sesión, arriba a la derecha del menú principal) ----------
let jug = null, usuario = null;
function pintarSesion() {
  const nombre = usuario ? String(usuario.displayName || "Mi cuenta").split(" ")[0].slice(0, 12) : "";
  btnSesion.replaceChildren();
  const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = "👤";
  btnSesion.append(ico, document.createTextNode(" " + (usuario ? nombre + " · Salir" : "Iniciar sesión")));
  btnSesion.title = usuario ? "Cerrar la sesión de " + (usuario.displayName || "tu cuenta") : "Iniciar sesión con Google";
}
import("../compartido/jugador.js").then((m) => { jug = m; m.alCambiarSesion((u) => { usuario = u; pintarSesion(); }); }).catch(() => {});
pintarSesion();
btnSesion.addEventListener("click", async () => {
  if (!jug) { mensajeMenu("Para iniciar sesión necesitas internet."); return; }
  try { if (usuario) await jug.salir(); else await jug.entrar(); mensajeMenu(""); }
  catch (e) { mensajeMenu("No se pudo iniciar sesión. Intenta de nuevo."); }
});
function mensajeMenu(t) { $("menu-msg").textContent = t || ""; }

// ---------- Pantallas ----------
function pintarUI() {
  const menu = estado === "inicio", mapaAbierto = estado === "mapa";
  document.body.classList.toggle("en-menu", menu || mapaAbierto);
  document.body.classList.toggle("jugando", estado === "jugando");
  $("inicio").classList.toggle("activo", menu);
  btnMenu.hidden = !(estado === "jugando" || mapaAbierto);   // ☰ Pausa: no se ve en el menú principal
  btnSesion.hidden = !menu;                                  // 👤 solo en el menú principal
  $("fin").classList.toggle("activo", estado === "fin");
  if (!menu) { $("lista-dif").hidden = true; $("m-libre").setAttribute("aria-expanded", "false"); }
}
function marcadores() {
  elEtNivel.textContent = modo === "niveles" ? "Nivel" : "Ronda";
  elNivel.textContent = modo === "niveles" ? nivel : ronda;
  elVidas.textContent = E ? E.vidas : 0;
  elPuntos.textContent = E ? E.puntos : 0;
  if (E && E.puntos > prog.record) { prog.record = E.puntos; elRecord.textContent = prog.record; guardarProgreso(); }
}
function empezar() {
  ac();
  estado = "jugando"; pausado = false; dirs.length = 0; quiereBomba = false;
  marcadores(); pintarUI(); centrarCamara(true);
}
function iniciarLibre(id) {
  mapa.cerrar();
  modo = "libre"; dif = id; ronda = 1; enviadosPerfil = 0;
  E = nuevaRonda(id, 1);
  empezar();
}
// Los niveles del mapa todavía no existen (sección 10 de los estándares): se avisa y no se abre nada.
let temporizadorAviso = 0;
function avisarSinNiveles() {
  const a = $("aviso-niveles"); a.hidden = false;
  clearTimeout(temporizadorAviso); temporizadorAviso = setTimeout(() => { a.hidden = true; }, 2600);
}
function iniciarNivel(n) {
  if (!(n >= 1 && n <= TOTAL) || n > prog.max) return;
  if (n > NIVELES_CREADOS) { avisarSinNiveles(); return; }
}
function abrirMapa(n, alcanzado) {
  estado = "mapa"; pausado = false;
  pintarUI();
  mapa.abrir(n, alcanzado);
}
// «Salir» del menú de pausa: vuelve al menú principal. Se conservan el progreso y el récord.
function volverAlMenu() {
  pausado = false;
  enviarPerfilLibre();
  mapa.cerrar();
  estado = "inicio"; E = null; dirs.length = 0;
  mensajeMenu("");
  pintarUI();
}

// ---------- Mapa de niveles estándar (compartido/mapa-niveles.js): México y mundo armados; el mundo se revela al terminar los 32 estados ----------
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: () => ({ max: prog.max, hecho: prog.hecho }),
  jugarNivel: iniciarNivel,
  leyenda: "Encuentra la puerta 🚪 escondida bajo un bloque y entra cuando no quede ningún monstruo.",
  avisoPrincipal: () => (NIVELES_CREADOS ? "" : "🚧 Los niveles todavía no están creados"),
});

// ---------- Pausa (menú estándar: compartido/menu-pausa.js) ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => estado === "jugando" || estado === "mapa",
  alAbrir: () => { if (estado === "jugando") { pausado = true; dirs.length = 0; } },
  alContinuar: () => { pausado = false; btnMenu.blur(); },
  extras: () => [{ icono: "ℹ️", texto: "Cómo se juega", clase: "b-azul", alElegir: () => $("info").classList.add("activo") }],
  alSalir: volverAlMenu,
  ayudaSalir: "Vuelves al menú principal. La partida en curso se pierde; tu progreso y tu récord se conservan.",
});
$("info-cerrar").addEventListener("click", () => { $("info").classList.remove("activo"); if (estado === "jugando") pausado = false; btnMenu.blur(); });

// ---------- Menú principal ----------
const listaDif = $("lista-dif");
for (const d of DIFICULTADES_LIBRE) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt chico " + d.clase; b.textContent = d.nombre;
  b.addEventListener("click", () => iniciarLibre(d.id));
  listaDif.appendChild(b);
}
$("m-libre").addEventListener("click", () => {   // despliega o pliega las dificultades (no abre otra pantalla)
  const abrir = listaDif.hidden;
  listaDif.hidden = !abrir;
  $("m-libre").setAttribute("aria-expanded", String(abrir));
});
$("m-niveles").addEventListener("click", () => abrirMapa(Math.min(prog.max, TOTAL)));
$("m-mapa").addEventListener("click", () => abrirMapa());

// ---------- Fin de partida ----------
function perder() {
  estado = "fin";
  enviarPerfilLibre();
  $("finTitulo").textContent = "Se acabó";
  $("finTexto").textContent = "Llegaste a la ronda " + ronda + " con " + E.puntos + " puntos" + (E.puntos >= prog.record && E.puntos > 0 ? ". ¡Nuevo récord!" : ".");
  pintarUI();
}
$("otra").addEventListener("click", () => iniciarLibre(dif));
$("fin-menu").addEventListener("click", volverAlMenu);

// ---------- Entrada: teclado y cruz táctil ----------
const dirs = [];             // direcciones pulsadas; manda la última
let quiereBomba = false;
const TECLAS = { ArrowRight: "1,0", d: "1,0", D: "1,0", ArrowLeft: "-1,0", a: "-1,0", A: "-1,0", ArrowDown: "0,1", s: "0,1", S: "0,1", ArrowUp: "0,-1", w: "0,-1", W: "0,-1" };
const soltar = (k) => { const i = dirs.indexOf(k); if (i >= 0) dirs.splice(i, 1); };
addEventListener("keydown", (e) => {
  if (estado !== "jugando" || pausado) return;
  if (TECLAS[e.key]) { e.preventDefault(); soltar(TECLAS[e.key]); dirs.push(TECLAS[e.key]); }
  else if (e.key === " " || e.key === "b" || e.key === "B") { e.preventDefault(); if (!e.repeat) quiereBomba = true; }
});
addEventListener("keyup", (e) => { if (TECLAS[e.key]) soltar(TECLAS[e.key]); });
addEventListener("blur", () => { dirs.length = 0; });
for (const b of document.querySelectorAll("#cruz button")) {
  const k = b.dataset.d;
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); ac(); b.setPointerCapture(e.pointerId); soltar(k); dirs.push(k); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => soltar(k));
}
$("bomba").addEventListener("pointerdown", (e) => { e.preventDefault(); ac(); quiereBomba = true; });

// ---------- Dibujo ----------
const MEJORAS = { bomba: "💣", fuego: "🔥", vel: "⚡" };
const cam = { x: 0, y: 0 };   // esquina superior izquierda de lo que se ve, en casillas
function rect(c, f, color, m = 0) { ctx.fillStyle = color; ctx.fillRect(c * TAM + m, f * TAM + m, TAM - 2 * m, TAM - 2 * m); }
function emoji(txt, x, y, tam) { ctx.font = tam + "px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, x, y + 1); }
const centro = (ente) => { const k = ente.paso ? ente.t / ente.paso : 0; return { x: (ente.x + (ente.ox - ente.x) * k + 0.5) * TAM, y: (ente.y + (ente.oy - ente.y) * k + 0.5) * TAM }; };
// Hacia dónde mira la cámara: sigue al jugador y no se sale del mapa (si el mapa es más chico que la vista, queda centrado)
function metaCamara() {
  const p = centro(E.jugador);
  const eje = (pos, vis, total) => (total <= vis ? (total - vis) / 2 : Math.max(0, Math.min(total - vis, pos / TAM - vis / 2)));
  return { x: eje(p.x, VIS_C, E.cols), y: eje(p.y, VIS_F, E.filas) };
}
function centrarCamara(brusco) {
  if (!E) return;
  const m = metaCamara();
  if (brusco) { cam.x = m.x; cam.y = m.y; } else { cam.x += (m.x - cam.x) * 0.18; cam.y += (m.y - cam.y) * 0.18; }
}

function dibujar() {
  ctx.clearRect(0, 0, ANCHO, ALTO);
  if (!E) return;
  centrarCamara(false);
  ctx.save();
  ctx.translate(-cam.x * TAM, -cam.y * TAM);
  const c0 = Math.max(0, Math.floor(cam.x) - 1), c1 = Math.min(E.cols - 1, Math.ceil(cam.x + VIS_C) + 1);
  const f0 = Math.max(0, Math.floor(cam.y) - 1), f1 = Math.min(E.filas - 1, Math.ceil(cam.y + VIS_F) + 1);
  for (let f = f0; f <= f1; f++) for (let c = c0; c <= c1; c++) {
    const v = E.grid[f][c];
    if (v === 1) { rect(c, f, "#4b3f66"); rect(c, f, "#6f6190", 3); rect(c, f, "#5a4d7a", 7); }
    else {
      rect(c, f, (c + f) % 2 ? "#7bc96f" : "#6fbf64");
      if (v === 2) { rect(c, f, "#8a5a2b", 2); rect(c, f, "#b67b3e", 5); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(c * TAM + 5, f * TAM + TAM / 2 - 1, TAM - 10, 2); ctx.fillRect(c * TAM + TAM / 2 - 1, f * TAM + 5, 2, TAM - 10); }
    }
  }
  // puerta: aparece al romper el bloque que la tapa; brilla cuando ya se puede entrar (sin monstruos vivos)
  const P = E.puerta;
  if (P.visible) {
    const abierta = puertaAbierta(E);
    ctx.globalAlpha = abierta ? 1 : 0.55;
    if (abierta) { ctx.fillStyle = "rgba(255,230,120," + (0.35 + 0.2 * Math.sin(E.tic / 8)) + ")"; ctx.fillRect(P.x * TAM, P.y * TAM, TAM, TAM); }
    emoji("🚪", (P.x + 0.5) * TAM, (P.y + 0.5) * TAM, 28);
    ctx.globalAlpha = 1;
  }
  for (const i of E.items) emoji(MEJORAS[i.tipo], (i.x + 0.5) * TAM, (i.y + 0.5) * TAM, 24);
  for (const b of E.bombas) {
    const late = 1 + 0.08 * Math.sin(b.t / 5) + (b.t < 40 ? 0.08 : 0);
    ctx.fillStyle = b.dueno ? "#5a1230" : "#1c1c22"; ctx.beginPath(); ctx.arc((b.x + 0.5) * TAM, (b.y + 0.55) * TAM, TAM * 0.36 * late, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc((b.x + 0.4) * TAM, (b.y + 0.42) * TAM, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.t % 10 < 5 ? "#ffd23f" : "#ff6b3d"; ctx.beginPath(); ctx.arc((b.x + 0.62) * TAM, (b.y + 0.18) * TAM, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const q of E.fuegos) {
    const a = Math.min(1, q.t / (DURACION_FUEGO * 0.6));
    ctx.globalAlpha = a; rect(q.x, q.y, "#ff7a1a", 2); rect(q.x, q.y, "#ffd23f", 9); ctx.globalAlpha = 1;
  }
  for (const e of E.enemigos) { const p = centro(e); emoji(BOTS[e.nivel].emoji, p.x, p.y, 28); }
  const p = centro(E.jugador);
  if (E.inv % 12 < 8) emoji("🧑‍🚀", p.x, p.y, 28);   // parpadea mientras es invulnerable
  ctx.restore();
  // mejoras y monstruos que quedan (esquina de arriba a la izquierda del tablero)
  ctx.fillStyle = "rgba(30,10,60,.75)"; ctx.fillRect(0, 0, 238, 26);
  ctx.fillStyle = "#fff"; ctx.font = "700 14px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const vel = Math.round(((PASO_JUGADOR - E.jugador.paso) / (PASO_JUGADOR - 7)) * 100);
  ctx.fillText("💣 " + E.maxBombas + "/" + MAX_BOMBAS + "  🔥 " + E.alcance + "/" + MAX_ALCANCE + "  ⚡ " + vel + "%  👾 " + E.enemigos.length, 8, 14);
  if (destello > 0) { ctx.fillStyle = "rgba(255,255,255," + destello / 40 + ")"; ctx.fillRect(0, 0, ANCHO, ALTO); }
}

// ---------- Ciclo (paso fijo de 1/60 s, igual en pantallas de 60, 90 o 120 Hz) ----------
function cuadro1() {
  if (estado !== "jugando" || !E) return;
  const d = dirs.length ? dirs[dirs.length - 1].split(",").map(Number) : [0, 0];
  const eventos = paso(E, { dx: d[0], dy: d[1], bomba: quiereBomba });
  quiereBomba = false;
  let cambio = false;
  for (const ev of eventos) {
    cambio = true;
    if (ev.tipo === "explota") destello = Math.max(destello, 6);
    if (["poner", "explota", "bloque", "enemigo", "item", "muerte", "puerta"].includes(ev.tipo)) sonido(ev.tipo);
    if (ev.tipo === "gano") { sonido("gano"); rondaLimpia(); }
    if (ev.tipo === "perdio") { sonido("perdio"); marcadores(); perder(); return; }
  }
  if (cambio) marcadores();
}
// Modo libre: tras limpiar la ronda empieza otra más difícil, conservando vidas, puntos y mejoras
function rondaLimpia() {
  ronda++;
  E = nuevaRonda(dif, ronda, Math.random, E);
  dirs.length = 0;
  marcadores(); centrarCamara(true);
}

let ultimo = 0, acum = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  acum = Math.min(acum + (ahora - ultimo), 100);
  ultimo = ahora;
  if (pausado) acum = 0;
  else while (acum >= 1000 / 60) { acum -= 1000 / 60; if (destello > 0) destello--; cuadro1(); }
  dibujar();
}

pintarUI();
requestAnimationFrame(cuadro);
