// Ruta: buscapalabras/juego-buscapalabras.js
// Buscapalabras — PASO 1: menú principal estándar (mapa de México con agua + mundo, 226 etapas × 100 niveles = 22 600) y «Partida libre».
// Todavía NO hay tablero ni niveles: «Jugar» y los niveles del mapa solo muestran un aviso (ver empezarLibre y jugarNivel).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { TAMANOS, DIFICULTADES, LIBRE_POR_DEFECTO, CLAVE_LIBRE } from "./config-buscapalabras.js";

const $ = (id) => document.getElementById(id);
const btnMenu = $("btn-menu"), libre = $("libre"), info = $("info"), aviso = $("aviso");

// ----- Aviso corto -----
let tAviso = 0;
function avisar(texto) {
  aviso.textContent = texto; aviso.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => { aviso.hidden = true; }, 3200);
}

// ----- Ventanas (Partida libre e Info) -----
let previo = null;
function abrirVentana(v, enfocar) {
  previo = document.activeElement; v.hidden = false;
  try { enfocar.focus({ preventScroll: true }); } catch (e) {}
}
function cerrarVentana(v) {
  if (v.hidden) return;
  v.hidden = true;
  try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
}
for (const v of [libre, info]) v.addEventListener("click", (e) => { if (e.target === v) cerrarVentana(v); }); // tocar fuera cierra
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!libre.hidden) { e.preventDefault(); cerrarVentana(libre); } else if (!info.hidden) { e.preventDefault(); cerrarVentana(info); }
});

// ----- Partida libre: elección guardada en el dispositivo -----
function leerEleccion() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE));
    const dif = DIFICULTADES.some((d) => d.id === g.dif) ? g.dif : LIBRE_POR_DEFECTO.dif;
    const tam = TAMANOS.includes(g.tam) ? g.tam : LIBRE_POR_DEFECTO.tam;
    return { dif, tam };
  } catch (e) { return { ...LIBRE_POR_DEFECTO }; }
}
function guardarEleccion(x) { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify(x)); } catch (e) {} }
let eleccion = leerEleccion();

const contDif = $("libre-dif"), contTam = $("libre-tam");
const botonesDif = DIFICULTADES.map((d) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt " + d.clase;
  b.innerHTML = '<span class="b-ico">' + d.icono + "</span>&nbsp;" + d.nombre;
  b.addEventListener("click", () => { eleccion.dif = d.id; pintarEleccion(); });
  contDif.appendChild(b);
  return b;
});
const botonesTam = TAMANOS.map((n) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt b-gris"; b.textContent = n + "×" + n;
  b.addEventListener("click", () => { eleccion.tam = n; pintarEleccion(); });
  contTam.appendChild(b);
  return b;
});
function pintarEleccion() {
  DIFICULTADES.forEach((d, i) => { const on = d.id === eleccion.dif; botonesDif[i].classList.toggle("on", on); botonesDif[i].setAttribute("aria-pressed", String(on)); });
  TAMANOS.forEach((n, i) => { const on = n === eleccion.tam; botonesTam[i].classList.toggle("on", on); botonesTam[i].setAttribute("aria-pressed", String(on)); });
  const d = DIFICULTADES.find((x) => x.id === eleccion.dif);
  $("libre-ayuda").textContent = d.ayuda;
  $("libre-resumen").textContent = d.nombre + " · tablero de " + eleccion.tam + "×" + eleccion.tam;
}
function abrirLibre() { eleccion = leerEleccion(); pintarEleccion(); abrirVentana(libre, $("libre-jugar")); }
$("libre-cerrar").addEventListener("click", () => cerrarVentana(libre));
$("info-cerrar").addEventListener("click", () => cerrarVentana(info));
$("libre-jugar").addEventListener("click", () => {
  guardarEleccion(eleccion);
  cerrarVentana(libre);
  empezarLibre({ ...eleccion });
});

// PENDIENTE (siguiente paso): aquí se arma y se muestra el tablero de cfg.tam × cfg.tam con la dificultad cfg.dif (DIFICULTADES[...].dirs).
function empezarLibre(cfg) {
  const d = DIFICULTADES.find((x) => x.id === cfg.dif);
  avisar("Partida libre: " + d.nombre + ", " + cfg.tam + "×" + cfg.tam + ". El tablero llega en el siguiente paso.");
}

// ----- Mapa de niveles (menú principal) -----
const etapas = crearEtapas({ porEtapa: 100 }); // 32 estados × 100 + 194 países × 100 = 22 600 niveles
const mapa = montarMapa({
  prefijo: "buscapalabras",
  etapas,
  progreso: () => ({ max: 1, hecho: 0 }), // todavía no se guarda progreso: no hay niveles jugables
  jugarNivel: () => avisar("Los niveles llegan pronto. Por ahora prueba la Partida libre."),
  botonesAntes: [{ icono: "🔤", texto: "Partida libre", clase: "b-oro", fn: abrirLibre }], // primer botón, antes de «Continuar»
  alInfo: () => abrirVentana(info, $("info-cerrar")),
  leyenda: "Los niveles llegan pronto",
  avisoPrincipal: () => etapas.total.toLocaleString("es-MX") + " niveles · " + (etapas.numEstados + etapas.numPaises) + " etapas de " + etapas.porEtapa,
  alCambiarVista: (esPrincipal) => { btnMenu.hidden = esPrincipal; }, // «Menú principal» no se muestra en la vista principal
});
btnMenu.addEventListener("click", () => mapa.principal()); // fuera de la vista principal, ☰ vuelve a ella
mapa.abrir();
