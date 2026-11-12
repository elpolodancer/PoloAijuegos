// Ruta: ataqueglobal/juego-ataqueglobal.js
// Ataque Global (id de puntos «ataqueglobal»): guerra de misiles sobre el mapa del mundo. Plan completo en README-ataqueglobal.md.
// ESTADO ACTUAL (fase 1): menú principal, el mundo como GLOBO 3D con giro, zoom y países seleccionables, y el mapa de niveles estándar.
// Todavía NO hay partida: Fácil/Normal/Difícil solo abren el mundo (la dificultad queda guardada en «dificultad»), y los niveles muestran un aviso.
// NIEBLA DE GUERRA: TODA partida empieza con el planeta tapado por una niebla negra y solo se ve el 10 % alrededor del país propio (ver VISION).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearMundo, nombreTerritorio, banderaTerritorio } from "./mapa-ataqueglobal.js";

const ID = "ataqueglobal";
const CLAVE_PROGRESO = "ataqueglobal_progreso_v1"; // { max: nivel más alto abierto, hecho: nivel más alto terminado }
const POR_ETAPA = 100;                             // niveles por estado de México y por país
const DIFICULTADES = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

// Niebla de guerra: fracción de la superficie del planeta que se ve alrededor de cada país propio.
// Posición 0 = inicio de TODA partida (10 %); 1 = «Inteligencia mejorada» (50 %); 2 = «Inteligencia superior» (100 %, sin niebla).
const VISION = [0.10, 0.50, 1];

// Colores. TU país: amarillo brillante (con resplandor y filo blanco en el mapa): ningún bot lo usa.
const COLOR_JUGADOR = "#fff23a";
// Hasta 15 bots, cada uno con su color propio (revisados para que se distingan entre sí, de tu amarillo y del verde de la tierra).
const BOTS_MIN = 1, BOTS_MAX = 15, BOTS_INICIAL = 3, CLAVE_BOTS = "ataqueglobal_bots";
const COLORES_BOTS = ["#ff3b30", "#ff8a1f", "#a24dff", "#ff5fb0", "#2f7bff", "#f4f4f4", "#19e0c0", "#b3173f", "#8fd8ff", "#e11bd6", "#b5702f", "#9aa7b4", "#1d84c9", "#ff9a9a", "#d9a0ff"];
// PROVISIONAL: país inicial de cada bot (de los más cercanos a México a los más lejanos) mientras no existan los niveles y el grafo de vecindad.
// Sobran 3 por si el jugador empieza en uno de ellos.
const PAISES_BOTS = ["US", "CU", "CO", "CA", "BR", "AR", "ES", "EG", "NG", "ZA", "RU", "IN", "CN", "JP", "AU", "FR", "DE", "PE"];
// PROVISIONAL: país con el que se empieza mientras no existan los niveles ni el grafo de vecindad (fácil = 3 países propios, difícil = 1; ver README).
const PAISES_INICIALES = { facil: ["MX"], normal: ["MX"], dificil: ["MX"] };

const $ = (id) => document.getElementById(id);
const menu = $("menu"), lienzo = $("mundo"), btnMenu = $("btn-menu"), txtMenu = $("txt-menu");
const hud = $("hud"), chipModo = $("chip-modo"), zoom = $("zoom"), ficha = $("ficha"), velo = $("velo");

let pantalla = "menu";      // menu | mundo | niveles
let dificultad = "normal";  // se usará cuando existan los bots (ver README, sección de dificultades)
let nivelVision = 0;        // índice en VISION: sube con las mejoras de Inteligencia
let propios = [];           // países del jugador (de aquí sale lo que se ve bajo la niebla)
const duenos = new Map();   // iso → { tipo: "jugador" | "bot", n, color }: de quién es cada país (para la ficha)
function leerBots() { try { const n = Math.floor(Number(localStorage.getItem(CLAVE_BOTS))); return n >= BOTS_MIN && n <= BOTS_MAX ? n : BOTS_INICIAL; } catch (e) { return BOTS_INICIAL; } }
let nBots = leerBots();     // enemigos de la partida (1 a 15), se recuerda en el aparato

// ---------- Progreso de niveles (local; todavía sin sincronizar con la cuenta) ----------
function leerProgreso() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PROGRESO));
    const hecho = Math.max(0, Math.floor(Number(p && p.hecho)) || 0);
    return { hecho, max: Math.max(hecho + 1, Math.floor(Number(p && p.max)) || 1) };
  } catch (e) { return { hecho: 0, max: 1 }; }
}

// ---------- El mundo ----------
const mundo = crearMundo({
  lienzo,
  alSeleccionar(iso) {
    ficha.hidden = !iso;
    if (!iso) return;
    $("ficha-bandera").textContent = banderaTerritorio(iso);
    $("ficha-nombre").textContent = nombreTerritorio(iso);
    const d = duenos.get(iso);
    $("ficha-sub").textContent = d ? (d.tipo === "jugador" ? "Tu país" : "Enemigo " + d.n) : "Toca otra vez para soltarlo";
    ficha.style.borderColor = d ? d.color : ""; // el borde de la ficha lleva el color del dueño
  },
});
$("z-mas").addEventListener("click", () => mundo.zoom(1.6));
$("z-menos").addEventListener("click", () => mundo.zoom(1 / 1.6));
$("z-todo").addEventListener("click", () => mundo.reiniciarVista());

// ---------- Pausa (dentro del mundo) ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => pantalla === "mundo",
  extras: () => [{ icono: "🌍", texto: "Ver todo el mundo", clase: "b-azul", alElegir: () => mundo.reiniciarVista() }],
  alSalir: () => mostrarMenu(),
});

// ---------- Mapa de niveles estándar (compartido/mapa-niveles.js) ----------
const etapas = crearEtapas({ porEtapa: POR_ETAPA });
const mapa = montarMapa({
  prefijo: ID,
  etapas,
  progreso: leerProgreso,
  jugarNivel(n) {
    const e = etapas.etapaDe(n);
    avisar("Nivel " + n, etapas.nombreEtapa(n) + " · nivel " + e.k + " de " + POR_ETAPA + ". Los niveles se están preparando: pronto podrás jugarlos.");
  },
  leyenda: "Cada nivel es fijo: siempre empiezas con el mismo país y te enfrentas a los mismos rivales.",
  avisoPrincipal: () => "Nivel " + leerProgreso().max + " · los niveles aún no están disponibles",
});

function avisar(titulo, texto) {
  $("velo-titulo").textContent = titulo;
  $("velo-texto").textContent = texto;
  velo.classList.add("activo");
  $("velo-cerrar").focus();
}
$("velo-cerrar").addEventListener("click", () => velo.classList.remove("activo"));

// ---------- Cambio de pantallas ----------
function ver(p) {
  pantalla = p;
  document.body.dataset.pantalla = p; // el CSS usa esto para pedir el celular en horizontal
  menu.hidden = p !== "menu";
  lienzo.hidden = p !== "mundo";
  hud.hidden = p !== "mundo";
  zoom.hidden = p !== "mundo";
  if (p !== "mundo") { ficha.hidden = true; mundo.detener(); }
  btnMenu.hidden = p === "menu";
  txtMenu.textContent = p === "mundo" ? "Pausa" : "Menú principal";
  btnMenu.title = p === "mundo" ? "Pausa" : "Volver al menú principal";
}
function mostrarMenu() {
  soltarHorizontal();
  mapa.cerrar();
  velo.classList.remove("activo");
  mundo.seleccionar(null);
  propios = []; nivelVision = 0; mundo.limpiarEstados(); duenos.clear(); aplicarVision(); // fuera de una partida el mundo vuelve a quedar tapado y limpio
  ver("menu");
}
// El mundo se juega con el celular en horizontal: se intenta pantalla completa + bloqueo (Android lo permite; iPhone no, ahí solo sale el aviso «gira tu celular»)
async function pedirHorizontal() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
  } catch (e) {}
}
function soltarHorizontal() { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
// ---------- Selector de enemigos (menú) ----------
function pintarBots() {
  $("bots-num").textContent = nBots;
  $("bots-menos").disabled = nBots <= BOTS_MIN;
  $("bots-mas").disabled = nBots >= BOTS_MAX;
  const puntos = $("bots-puntos");
  if (!puntos.children.length) {
    const yo = document.createElement("i"); yo.className = "yo"; yo.style.setProperty("--c", COLOR_JUGADOR); puntos.appendChild(yo);
    COLORES_BOTS.forEach((c) => { const i = document.createElement("i"); i.style.setProperty("--c", c); puntos.appendChild(i); });
  }
  [...puntos.children].slice(1).forEach((el, i) => el.classList.toggle("off", i >= nBots));
}
function cambiarBots(d) {
  nBots = Math.max(BOTS_MIN, Math.min(BOTS_MAX, nBots + d));
  try { localStorage.setItem(CLAVE_BOTS, String(nBots)); } catch (e) {}
  pintarBots();
}
$("bots-menos").addEventListener("click", () => cambiarBots(-1));
$("bots-mas").addEventListener("click", () => cambiarBots(1));
pintarBots();

// Dueños del mapa: tu país (trazo brillante) y el de cada bot (su color).
function repartirPaises(n) {
  mundo.limpiarEstados(); duenos.clear();
  propios.forEach((iso) => { mundo.setDueno(iso, COLOR_JUGADOR, true); duenos.set(iso, { tipo: "jugador", color: COLOR_JUGADOR }); });
  const libres = PAISES_BOTS.filter((iso) => !propios.includes(iso));
  for (let i = 0; i < n && i < libres.length; i++) { mundo.setDueno(libres[i], COLORES_BOTS[i]); duenos.set(libres[i], { tipo: "bot", n: i + 1, color: COLORES_BOTS[i] }); }
}
// Botón «Centrar»: lleva la cámara exactamente a tu país
function centrar() { if (propios[0]) mundo.centrarEn(propios[0]); }
$("z-centrar").addEventListener("click", centrar);
addEventListener("keydown", (ev) => { if ((ev.key === "c" || ev.key === "C") && pantalla === "mundo" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !velo.classList.contains("activo")) { ev.preventDefault(); centrar(); } });

// Niebla de guerra: se reaplica cada vez que cambian los países propios o la visión.
function aplicarVision() { mundo.setVision(propios, VISION[nivelVision]); }
// Mejoras de Inteligencia (README, sección 5.3): la 1.ª deja ver el 50 % del planeta y la 2.ª el 100 %. Llamar desde el sistema de investigación.
function mejorarVision() { if (nivelVision < VISION.length - 1) { nivelVision++; aplicarVision(); } }
// TODA partida (libre o de nivel) debe empezar por aquí (paisesPropios = tus países; bots = cuántos enemigos, 1 a 15): así siempre arranca con la niebla y la visión inicial del 10 %.
function empezarPartida(paisesPropios, bots) {
  propios = paisesPropios.slice();
  nivelVision = 0;
  repartirPaises(bots);
  aplicarVision();
  ver("mundo");
  mundo.iniciar();
  mundo.vistaInicial(propios[0]); // bajo la niebla solo se ve lo cercano al país propio: se empieza mirándolo
}
function abrirPartidaLibre(d) {
  pedirHorizontal();
  dificultad = d;
  chipModo.textContent = "Partida libre · " + DIFICULTADES[d] + " · " + nBots + (nBots === 1 ? " enemigo" : " enemigos");
  empezarPartida(PAISES_INICIALES[d], nBots);
}
function abrirNiveles() {
  ver("niveles");
  mapa.abrir();
}

$("btn-facil").addEventListener("click", () => abrirPartidaLibre("facil"));
$("btn-normal").addEventListener("click", () => abrirPartidaLibre("normal"));
$("btn-dificil").addEventListener("click", () => abrirPartidaLibre("dificil"));
$("btn-niveles").addEventListener("click", abrirNiveles);
btnMenu.addEventListener("click", () => { if (pantalla === "niveles") mostrarMenu(); }); // en el mundo, menu-pausa.js abre la pausa
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && velo.classList.contains("activo")) { ev.preventDefault(); velo.classList.remove("activo"); } });
document.addEventListener("visibilitychange", () => { if (pantalla === "mundo") { if (document.hidden) mundo.detener(); else mundo.iniciar(); } });

ver("menu");
