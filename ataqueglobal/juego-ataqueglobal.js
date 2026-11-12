// Ruta: ataqueglobal/juego-ataqueglobal.js
// Ataque Global (id de puntos «ataqueglobal»): guerra de misiles sobre el mapa del mundo. Plan completo en README-ataqueglobal.md.
// ESTADO ACTUAL (fase 1): menú principal, el mundo como GLOBO 3D con giro, zoom y países seleccionables, y el mapa de niveles estándar.
// Todavía NO hay partida: Fácil/Normal/Difícil solo abren el mundo (la dificultad queda guardada en «dificultad»), y los niveles muestran un aviso.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearMundo, nombreTerritorio, banderaTerritorio } from "./mapa-ataqueglobal.js";

const ID = "ataqueglobal";
const CLAVE_PROGRESO = "ataqueglobal_progreso_v1"; // { max: nivel más alto abierto, hecho: nivel más alto terminado }
const POR_ETAPA = 100;                             // niveles por estado de México y por país
const DIFICULTADES = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

const $ = (id) => document.getElementById(id);
const menu = $("menu"), lienzo = $("mundo"), btnMenu = $("btn-menu"), txtMenu = $("txt-menu");
const hud = $("hud"), chipModo = $("chip-modo"), zoom = $("zoom"), ficha = $("ficha"), velo = $("velo");

let pantalla = "menu";      // menu | mundo | niveles
let dificultad = "normal";  // se usará cuando existan los bots (ver README, sección de dificultades)

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
function abrirPartidaLibre(d) {
  pedirHorizontal();
  dificultad = d;
  chipModo.textContent = "Partida libre · " + DIFICULTADES[d];
  ver("mundo");
  mundo.iniciar();
  mundo.vistaInicial();
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
