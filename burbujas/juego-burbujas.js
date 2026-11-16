// Ruta: burbujas/juego-burbujas.js
// Juego «Burbujas» (estilo Bubble Shooter). Las REGLAS (rejilla, tiros, especiales, niveles del mapa y dificultades del Modo libre) viven en
// logica-burbujas.js, que también usa el bot de backtracking (bot-burbujas.mjs). Aquí están la pantalla, el sonido, el menú y el progreso.
//
// Menú principal estándar (ESTANDARES-juegos.md, secciones 7 y 9): ♾️ Modo libre (despliega las 5 dificultades) · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir.
// Niveles: mapa estándar de México y del mundo, 22 600 niveles (100 por estado y por país) con el reparto de dificultad estándar.

import {
  R, COLS, ALTO, ANCHO, RH, LIMITE_FILA, TIRADOR, MIN_GRADOS, PIEDRA, DIFICULTADES_LIBRE,
  posX, posY, nivelFijo, nivelLibre, sacarDeCola, cambiarCola, nuevoDisparo, pasoDisparo, chocaConTablero, resolverTiro, puntosDeTiro,
} from "./logica-burbujas.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { dificultadDeNivel } from "../compartido/dificultad-niveles.js";

const ID = "burbujas";

// ---------- AJUSTES ----------
const PUNTOS_POR_PERFIL = 25;    // 1 punto al perfil por cada 25 del juego
const LIBRE_DA_PUNTOS = false;   // estándar: el Modo libre no da puntos al perfil (true = los da, como antes de tener niveles)
const POR_ETAPA = 100;           // niveles por estado de México y por país (22 600 en total)
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA });
const TOTAL = ETAPAS.total;
const NOMBRE_DIF = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

const COLORES = [                // [luz, base, sombra]
  ["#ff9fb8", "#ff4f7b", "#b8184a"],
  ["#ffe98a", "#ffc20e", "#b88400"],
  ["#a5f0a0", "#3fcf5a", "#16883a"],
  ["#9fd8ff", "#2f9bff", "#1658b8"],
  ["#d9b0ff", "#a455ff", "#6420b8"],
  ["#ffc79a", "#ff8a2b", "#b8500a"],
];
// El fondo es la madera estándar del portal (compartido/fondo-madera.js): el lienzo se deja transparente.
const GRIS_PIEDRA = ["#d6d9df", "#8a8f99", "#454953"];
const ESPECIALES = {
  bomba: { emoji: "💣", c: ["#8a8a8a", "#2d2d2d", "#050505"], texto: "¡Bomba!" },
  arcoiris: { emoji: "🌈", c: null, texto: "¡Arcoíris!" },
  rayo: { emoji: "⚡", c: ["#fff6a0", "#ffd400", "#b88a00"], texto: "¡Rayo!" },
};

// ---------- Sonidos (se generan con WebAudio, no hay archivos) ----------
let audio = null, silencio = false;
try { silencio = localStorage.getItem("burbujas_silencio") === "1"; } catch (e) {}
function ac() {
  if (silencio) return null;
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}
function tono(f, dur, o = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (o.retraso || 0);
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.tipo || "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
  g.gain.setValueAtTime(o.vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function ruido(dur, vol = 0.2, corte = 900, retraso = 0) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = corte;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + retraso);
}
const ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
function sonido(tipo, n = 1) {
  switch (tipo) {
    case "disparo": tono(380, 0.09, { tipo: "triangle", hasta: 760, vol: 0.12 }); break;
    case "posar": tono(180, 0.08, { tipo: "sine", hasta: 120, vol: 0.14 }); break;
    case "reventar":
      for (let i = 0; i < Math.min(n, 7); i++) tono(ESCALA[i], 0.16, { tipo: "triangle", hasta: ESCALA[i] * 1.4, vol: 0.13, retraso: i * 0.05 });
      ruido(0.08, 0.08, 3000); break;
    case "caer":
      for (let i = 0; i < Math.min(n, 5); i++) tono(900 - i * 80, 0.28, { tipo: "sine", hasta: 200, vol: 0.09, retraso: 0.1 + i * 0.06 });
      break;
    case "premio":
      [784, 988, 1175, 1568].forEach((f, i) => tono(f, 0.18, { tipo: "square", vol: 0.07, retraso: i * 0.07 })); break;
    case "bomba": ruido(0.5, 0.45, 700); tono(110, 0.4, { tipo: "sawtooth", hasta: 40, vol: 0.18 }); break;
    case "arcoiris":
      ESCALA.forEach((f, i) => tono(f, 0.2, { tipo: "sine", vol: 0.1, retraso: i * 0.045 })); break;
    case "rayo": tono(1800, 0.25, { tipo: "sawtooth", hasta: 90, vol: 0.14 }); ruido(0.18, 0.2, 5000); break;
    case "nivel":
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tono(f, 0.2, { tipo: "triangle", vol: 0.14, retraso: i * 0.1 })); break;
    case "perder":
      [440, 392, 349, 262].forEach((f, i) => tono(f, 0.35, { tipo: "triangle", vol: 0.15, retraso: i * 0.2 })); break;
    case "cambiar": tono(660, 0.06, { tipo: "square", vol: 0.06 }); break;
  }
}

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const POS_SIGUIENTE = { x: 52, y: ALTO - 48 };
lienzo.width = ANCHO * 2; lienzo.height = ALTO * 2;   // el doble para que se vea nítido
ctx.scale(2, 2);

const $ = (id) => document.getElementById(id);
const elNivel = $("nivel"), elEtNivel = $("etNivel"), elPuntos = $("puntos"), elRecord = $("record"), elSonido = $("sonido"), btnMenu = $("btn-menu"), btnSesion = $("btn-sesion");
function pintarBotonSonido() { elSonido.textContent = silencio ? "🔇" : "🔊"; elSonido.setAttribute("aria-label", silencio ? "Activar sonido" : "Silenciar"); }
pintarBotonSonido();
elSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("burbujas_silencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido(); sonido("cambiar");
});

// ---------- Estado ----------
// estado: "inicio" (menú principal) | "mapa" (niveles / mapa) | "jugando" | "gano" (nivel terminado) | "fin" (perdiste)
// T = el tablero (ver logica-burbujas.js). Los colores son números (0..5); los especiales son texto: "bomba", "arcoiris", "rayo".
let T = null, estado = "inicio", modo = "libre", dif = "normal", ronda = 1, nivel = 1, puntos = 0;
let disparo = null, apuntando = false, angulo = Math.PI / 2;
let pausado = false;
let caen = [], chispas = [], deslizar = 0, aviso = 0, avisoTexto = "", tic = 0;

// ---------- Progreso: { record, max, hecho, t } ----------
// record = mejor puntaje · max = nivel más alto abierto · hecho = nivel más alto terminado · t = cuándo se guardó.
// Se guarda en el dispositivo y se sincroniza con la cuenta (gana el mayor de cada dato). Antes solo se guardaba el récord (clave «burbujas_record»).
const CLAVE = "burbujas_progreso_v1";
function normalizar(x) {
  if (typeof x === "number") return { record: x, max: 1, hecho: 0, t: 0 };       // formato viejo: solo el récord
  if (!x || typeof x !== "object") return null;
  const hecho = Math.min(TOTAL, Math.max(0, Math.floor(Number(x.hecho)) || 0));
  return { record: Math.max(0, Number(x.record) || 0), max: Math.min(TOTAL, Math.max(hecho + 1, Math.floor(Number(x.max)) || 1)), hecho, t: Number(x.t) || 0 };
}
function unir(a, b) {
  a = normalizar(a); b = normalizar(b);
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return { record: Math.max(a.record, b.record), max: Math.max(a.max, b.max), hecho: Math.max(a.hecho, b.hecho), t: Math.max(a.t, b.t) };
}
function leerProgreso() {
  let nuevo = null, viejo = null;
  try { nuevo = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) {}
  try { viejo = Number(localStorage.getItem("burbujas_record")) || 0; } catch (e) {}
  return unir(nuevo, viejo ? { record: viejo } : null) || normalizar({});
}
let prog = leerProgreso();
elRecord.textContent = prog.record;
let nube = null;
function guardarProgreso() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
// Se sincroniza con la cuenta de Google cuando hay sesión e internet; sin internet el juego funciona igual
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: unir,
    alCambiar: (v) => { prog = normalizar(v) || prog; elRecord.textContent = prog.record; mapa.refrescar(); },
  });
}).catch(() => {});

// ---------- Perfil (puntos totales del portal) ----------
// Los puntos se anotan al instante en el dispositivo (cola) y se envían cuando haya internet y sesión.
let enviadosPerfil = 0;
function darPuntosPerfil(n) {
  if (!(n > 0)) return;
  encolarPuntos(ID, n);
  import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
}
function enviarPerfilLibre() {   // solo si LIBRE_DA_PUNTOS
  if (!LIBRE_DA_PUNTOS || modo !== "libre") return;
  const debe = Math.floor(puntos / PUNTOS_POR_PERFIL) - enviadosPerfil;
  if (debe <= 0) return;
  enviadosPerfil += debe;
  darPuntosPerfil(debe);
}

// ---------- Sesión (👤 Iniciar sesión, arriba a la derecha del menú principal) ----------
// compartido/jugador.js se carga con import() dinámico: sin internet el menú funciona igual (el botón avisa que no hay sesión disponible).
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
  document.body.classList.toggle("en-menu", menu || mapaAbierto);   // el lienzo se oculta en el menú y en el mapa
  $("inicio").classList.toggle("activo", menu);
  btnMenu.hidden = !(estado === "jugando" || mapaAbierto);          // ☰ Pausa: no se ve en el menú principal
  btnSesion.hidden = !menu;                                          // 👤 solo en el menú principal
  $("fin").classList.toggle("activo", estado === "fin");
  $("victoria").hidden = estado !== "gano";
  if (estado === "gano") colocarVictoria();
  if (!menu) $("lista-dif").hidden = true, $("m-libre").setAttribute("aria-expanded", "false");
}
function etiquetaNivel() {
  elEtNivel.textContent = modo === "niveles" ? "Nivel" : "Ronda";
  elNivel.textContent = modo === "niveles" ? nivel : ronda;
}
function empezar() {
  ac();
  estado = "jugando"; pausado = false; disparo = null; apuntando = false; caen = []; chispas = []; deslizar = 0;
  elPuntos.textContent = puntos; etiquetaNivel();
  avisoTexto = (modo === "niveles" ? "Nivel " + nivel + " · " + NOMBRE_DIF[T.dificultad] : "Ronda " + ronda) + " · " + T.nombre; aviso = 110;
  pintarUI();
}
function iniciarLibre(id) {
  mapa.cerrar();
  modo = "libre"; dif = id; ronda = 1; puntos = 0; enviadosPerfil = 0;
  T = nivelLibre(id, 1);
  empezar();
}
function iniciarNivel(n) {
  if (!(n >= 1 && n <= TOTAL) || n > prog.max) return;
  mapa.cerrar();
  modo = "niveles"; nivel = n; puntos = 0;
  T = nivelFijo(n, TOTAL, dificultadDeNivel(n, TOTAL));
  empezar();
}
function abrirMapa(n, alcanzado) {
  estado = "mapa"; pausado = false; apuntando = false;
  pintarUI();
  mapa.abrir(n, alcanzado);
}
// «Salir» del menú de pausa: vuelve al menú principal. Se conservan el progreso y el récord.
function volverAlMenu() {
  pausado = false;
  enviarPerfilLibre();
  mapa.cerrar();
  estado = "inicio"; apuntando = false; disparo = null; T = null; caen = []; chispas = [];
  mensajeMenu("");
  pintarUI();
}

// ---------- Mapa de niveles estándar (compartido/mapa-niveles.js) ----------
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: () => ({ max: prog.max, hecho: prog.hecho }),
  jugarNivel: iniciarNivel,
  infoNivel: (n) => ({ sub: NOMBRE_DIF[dificultadDeNivel(n, TOTAL)] }),
  leyenda: "Limpia todas las burbujas de color. Las piedras no cuentan.",
});

// ---------- Pausa (menú estándar: compartido/menu-pausa.js; el botón ☰ Pausa está en .nav-juego) ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => estado === "jugando" || estado === "mapa",
  alAbrir: () => { if (estado === "jugando") { pausado = true; apuntando = false; } },
  alContinuar: () => { pausado = false; btnMenu.blur(); },   // sin foco en ☰, la barra espaciadora no lo vuelve a abrir
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

// ---------- Fin de nivel: «Siguiente nivel ▶» encima del tablero (estándar, sección 6) ----------
function colocarVictoria() {
  const v = $("victoria"), r = lienzo.getBoundingClientRect();
  const x0 = Math.max(0, r.left), y0 = Math.max(0, r.top), x1 = Math.min(innerWidth, r.right), y1 = Math.min(innerHeight, r.bottom);
  const poco = x1 - x0 < 120 || y1 - y0 < 120;   // el tablero casi no se ve: toda la ventana
  v.style.left = poco ? "0" : x0 + "px"; v.style.top = poco ? "0" : y0 + "px";
  v.style.width = poco ? "100%" : x1 - x0 + "px"; v.style.height = poco ? "100%" : y1 - y0 + "px";
}
addEventListener("resize", () => { if (estado === "gano") colocarVictoria(); });
function mostrarVictoria() {
  $("vicTitulo").textContent = "¡Nivel " + nivel + " completado!";
  $("vicTexto").textContent = puntos + " puntos" + (puntos >= prog.record && puntos > 0 ? " · ¡Nuevo récord!" : "");
  $("vic-sig").hidden = nivel >= TOTAL;   // en el último nivel no hay «Siguiente»
  pintarUI();
}
$("vic-sig").addEventListener("click", () => { puntos = 0; iniciarNivelSiguiente(); });
function iniciarNivelSiguiente() { iniciarNivel(Math.min(TOTAL, nivel + 1)); }
$("vic-rep").addEventListener("click", () => { puntos = 0; iniciarNivel(nivel); });
$("vic-mapa").addEventListener("click", () => { $("victoria").hidden = true; abrirMapa(nivel, true); });

// ---------- Disparo ----------
function disparar() {
  if (disparo || pausado || estado !== "jugando") return;
  disparo = nuevoDisparo(angulo, sacarDeCola(T));
  sonido("disparo");
}

function soltarChispas(x, y, color) {
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.5;
    chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, color });
  }
}

function terminarTiro(b) {
  disparo = null;
  const ev = resolverTiro(T, b.color, b.x, b.y);   // todas las reglas del tiro están en logica-burbujas.js
  if (ev.esEspecial) sonido(b.color); else sonido("posar");
  for (const q of ev.quitadas) soltarChispas(q.x, q.y - deslizar, q.v);
  for (const q of ev.caidas) caen.push({ x: q.x, y: q.y - deslizar, vy: -2 - Math.random() * 3, vx: (Math.random() - 0.5) * 3, color: q.v });
  puntos += puntosDeTiro(ev);
  if (ev.n) {
    if (!ev.esEspecial) sonido("reventar", ev.n);
    if (ev.cayeron) sonido("caer", ev.cayeron);
  }
  if (ev.premio) { avisoTexto = ESPECIALES[ev.premio].texto; aviso = 60; sonido("premio"); }
  if (ev.bajo) deslizar = RH;
  if (ev.gano) { nivelLimpio(); return; }
  actualizarMarcador();
  if (ev.perdio) perder();
}

function nivelLimpio() {
  puntos += 200 + Math.min(modo === "niveles" ? nivel : ronda, 40) * 50;
  actualizarMarcador();
  sonido("nivel");
  if (modo === "libre") {   // el Modo libre sigue con otra ronda del mismo tipo
    ronda++;
    T = nivelLibre(dif, ronda);
    disparo = null; caen = []; chispas = []; deslizar = 0;
    etiquetaNivel();
    avisoTexto = "Ronda " + ronda + " · " + T.nombre; aviso = 110;
    return;
  }
  const primera = nivel > prog.hecho;   // los puntos del perfil solo se dan la primera vez que se pasa un nivel
  prog.hecho = Math.max(prog.hecho, nivel);
  prog.max = Math.min(TOTAL, Math.max(prog.max, nivel + 1));
  guardarProgreso();
  if (primera) darPuntosPerfil(Math.max(1, Math.floor(puntos / PUNTOS_POR_PERFIL)));
  estado = "gano"; apuntando = false;
  mostrarVictoria();
}

function actualizarMarcador() {
  elPuntos.textContent = puntos;
  if (puntos > prog.record) { prog.record = puntos; elRecord.textContent = prog.record; guardarProgreso(); }
}

function perder() {
  estado = "fin";
  sonido("perder");
  enviarPerfilLibre();
  $("finTitulo").textContent = "Se acabó";
  $("finTexto").textContent = "Llegaste " + (modo === "niveles" ? "al nivel " + nivel : "a la ronda " + ronda) + " con " + puntos + " puntos" + (puntos >= prog.record && puntos > 0 ? ". ¡Nuevo récord!" : ".");
  pintarUI();
}
$("otra").addEventListener("click", () => { if (modo === "niveles") { puntos = 0; iniciarNivel(nivel); } else iniciarLibre(dif); });
$("fin-menu").addEventListener("click", volverAlMenu);

// ---------- Entrada ----------
function posicion(e) {
  const rect = lienzo.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (ANCHO / rect.width), y: (e.clientY - rect.top) * (ALTO / rect.height) };
}
function apuntarA(p) {
  let a = Math.atan2(TIRADOR.y - p.y, p.x - TIRADOR.x);
  const m = (MIN_GRADOS * Math.PI) / 180;
  a = Math.max(m, Math.min(Math.PI - m, a));
  angulo = a;
}
function cambiar() {
  if (disparo) return;
  cambiarCola(T);
  sonido("cambiar");
}
lienzo.addEventListener("pointerdown", (e) => {
  ac();
  if (estado !== "jugando" || pausado) return;
  const p = posicion(e);
  if (Math.hypot(p.x - POS_SIGUIENTE.x, p.y - POS_SIGUIENTE.y) < 34) { cambiar(); return; }
  lienzo.setPointerCapture(e.pointerId);
  apuntando = true; apuntarA(p);
});
lienzo.addEventListener("pointermove", (e) => { if (apuntando) apuntarA(posicion(e)); });
lienzo.addEventListener("pointerup", () => { if (apuntando) { apuntando = false; disparar(); } });
lienzo.addEventListener("pointercancel", () => { apuntando = false; });
window.addEventListener("keydown", (e) => {
  if (estado !== "jugando" || pausado) return;
  if (e.key === "ArrowLeft") angulo = Math.min(Math.PI - (MIN_GRADOS * Math.PI) / 180, angulo + 0.05);
  if (e.key === "ArrowRight") angulo = Math.max((MIN_GRADOS * Math.PI) / 180, angulo - 0.05);
  if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); disparar(); }
  if (e.key === "x") cambiar();
});
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfilLibre(); });

// ---------- Dibujo ----------
function burbuja(x, y, color, escala = 1) {
  const esp = typeof color === "string";
  let r = R * 0.96 * escala;
  if (esp) r *= 1 + 0.05 * Math.sin(tic / 8);   // los especiales «laten»
  let g;
  if (esp && !ESPECIALES[color].c) {                // arcoíris
    g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    ["#ff4f7b", "#ffc20e", "#3fcf5a", "#2f9bff", "#a455ff"].forEach((col, i) => g.addColorStop(i / 4, col));
  } else {
    const [luz, base, sombra] = esp ? ESPECIALES[color].c : color === PIEDRA ? GRIS_PIEDRA : COLORES[color];
    g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, luz); g.addColorStop(0.55, base); g.addColorStop(1, sombra);
  }
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  if (esp) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = Math.round(r * 1.15) + "px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ESPECIALES[color].emoji, x, y + 1);
    return;
  }
  if (color === PIEDRA) {   // grietas
    ctx.strokeStyle = "rgba(20,20,30,.55)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.3); ctx.lineTo(x - r * 0.1, y); ctx.lineTo(x - r * 0.25, y + r * 0.45);
    ctx.moveTo(x - r * 0.1, y); ctx.lineTo(x + r * 0.5, y + r * 0.15);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2); ctx.fill();
}

function guia() {
  // trayectoria punteada con un rebote en pared
  const b = { x: TIRADOR.x, y: TIRADOR.y, vx: Math.cos(angulo) * 8, vy: -Math.sin(angulo) * 8 };
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.strokeStyle = "rgba(40,10,80,.6)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 160; i++) {
    b.x += b.vx; b.y += b.vy;
    if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); }
    if (b.x > ANCHO - R) { b.x = ANCHO - R; b.vx = -Math.abs(b.vx); }
    if (chocaConTablero(T, b.x, b.y, deslizar)) break;
    if (i % 3 === 0 && i > 3) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
}

function dibujar() {
  ctx.clearRect(0, 0, ANCHO, ALTO);   // transparente: se ve la madera del portal

  ctx.fillStyle = "rgba(20,5,50,.7)"; ctx.fillRect(0, 0, ANCHO, 4);   // techo

  // línea de peligro
  const yl = posY(LIMITE_FILA) - R;
  ctx.setLineDash([8, 8]);   // doble trazo (oscuro y claro) para que se vea sobre madera clara y oscura
  ctx.strokeStyle = "rgba(40,10,80,.45)"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(ANCHO, yl); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, yl); ctx.lineTo(ANCHO, yl); ctx.stroke();
  ctx.setLineDash([]);

  if (!T) return;
  for (let r = 0; r < T.grid.length; r++) for (let c = 0; c < COLS; c++) {
    if (T.grid[r][c] !== null) burbuja(posX(T, r, c), posY(r) - deslizar, T.grid[r][c]);
  }
  for (const b of caen) burbuja(b.x, b.y, b.color);
  for (const s of chispas) {
    ctx.globalAlpha = Math.max(0, s.vida);
    ctx.fillStyle = (s.color === PIEDRA ? GRIS_PIEDRA : COLORES[s.color])[0];
    ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (estado === "jugando") {
    if (!disparo) guia();
    // cuántos tiros faltan para que baje el techo
    for (let i = 0; i < T.tirosPorFila; i++) {
      const dx = ANCHO - 20 - i * 14;
      ctx.fillStyle = "rgba(30,10,60,.7)";
      ctx.beginPath(); ctx.arc(dx, ALTO - 20, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = i < T.tiros ? "#ffe27a" : "rgba(255,255,255,.3)";
      ctx.beginPath(); ctx.arc(dx, ALTO - 20, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // tirador
    ctx.save(); ctx.translate(TIRADOR.x, TIRADOR.y); ctx.rotate(Math.PI / 2 - angulo);
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.strokeStyle = "rgba(40,10,80,.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-9, -R - 22, 18, 40, 8); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#2a0d55"; ctx.beginPath(); ctx.arc(TIRADOR.x, TIRADOR.y, R + 8, 0, Math.PI * 2); ctx.fill();
    if (!disparo) burbuja(TIRADOR.x, TIRADOR.y, T.actual);
    if (disparo) burbuja(disparo.x, disparo.y, disparo.color);
    // siguiente (se puede tocar para cambiar)
    ctx.fillStyle = "#2a0d55"; ctx.beginPath(); ctx.arc(POS_SIGUIENTE.x, POS_SIGUIENTE.y, R + 6, 0, Math.PI * 2); ctx.fill();
    burbuja(POS_SIGUIENTE.x, POS_SIGUIENTE.y, T.siguiente, 0.85);
  }

  if (aviso > 0) {
    ctx.globalAlpha = Math.min(1, aviso / 30);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(40,10,80,.8)"; ctx.lineWidth = 6; ctx.lineJoin = "round";
    ctx.font = "800 30px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.strokeText(avisoTexto, ANCHO / 2, ALTO / 2 - 40);
    ctx.fillText(avisoTexto, ANCHO / 2, ALTO / 2 - 40);
    ctx.globalAlpha = 1;
  }
}

// ---------- Ciclo (paso fijo de 1/60 s, igual en pantallas de 60, 90 o 120 Hz) ----------
function paso() {
  tic++;
  if (estado === "jugando" && disparo && pasoDisparo(T, disparo, deslizar)) terminarTiro(disparo);
  if (deslizar > 0) deslizar = Math.max(0, deslizar - 3);
  if (aviso > 0) aviso--;
  for (const b of caen) { b.vy += 0.6; b.y += b.vy; b.x += b.vx; }
  caen = caen.filter((b) => b.y < ALTO + 40);
  for (const s of chispas) { s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.vida -= 0.035; }
  chispas = chispas.filter((s) => s.vida > 0);
}

let ultimo = 0, acum = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  acum = Math.min(acum + (ahora - ultimo), 100);
  ultimo = ahora;
  if (pausado) acum = 0;   // en pausa el reloj del juego no avanza
  else while (acum >= 1000 / 60) { acum -= 1000 / 60; paso(); }
  dibujar();
}

pintarUI();
requestAnimationFrame(cuadro);
