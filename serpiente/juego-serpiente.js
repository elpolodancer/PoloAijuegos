// Ruta: serpiente/juego-serpiente.js
// Juego «Serpiente» (id de puntos: serpiente). POR AHORA solo el menú principal estándar del inmersivo:
//   ♾️ Partida libre (dificultad + tablero) · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir
// La jugabilidad de la serpiente y los niveles todavía no existen: «Jugar» y los niveles avisan que están por crear.
// Sin Firebase ni red: funciona sin internet (los puntos pendientes se envían con progreso.js, que se carga aparte).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

export const ID_JUEGO = "serpiente";

// 5 dificultades estándar (nombre, color del botón)
export const DIFICULTADES = [
  { id: "muyfacil", nombre: "Muy fácil", clase: "b-verde" },
  { id: "facil", nombre: "Fácil", clase: "b-azul" },
  { id: "normal", nombre: "Normal", clase: "b-morado" },
  { id: "dificil", nombre: "Difícil", clase: "b-oro" },
  { id: "experto", nombre: "Experto", clase: "b-rojo" },
];
// Tableros de la partida libre: columnas × filas (verticales, como un celular en vertical)
export const TABLEROS = [
  { cols: 6, filas: 10 },
  { cols: 8, filas: 12 },
  { cols: 10, filas: 14 },
  { cols: 12, filas: 16 },
  { cols: 14, filas: 18 },
  { cols: 16, filas: 20 },
];

const CLAVE_AJUSTES = "serpiente_ajustes_v1"; // { dif: id, tam: "6x10" }
const CLAVE_PROGRESO = "serpiente_progreso_v1"; // { max, hecho } (para cuando existan los niveles)

const $ = (id) => document.getElementById(id);
const clave = (t) => t.cols + "x" + t.filas;

// ----- Ajustes guardados en el dispositivo -----
function leerAjustes() {
  let a = {};
  try { a = JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) || {}; } catch (e) {}
  const dif = DIFICULTADES.some((d) => d.id === a.dif) ? a.dif : "normal";
  const tam = TABLEROS.some((t) => clave(t) === a.tam) ? a.tam : clave(TABLEROS[0]);
  return { dif, tam };
}
let ajustes = leerAjustes();
function guardarAjustes() { try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes)); } catch (e) {} }

function leerProgreso() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {};
    return { max: Math.max(1, Math.floor(Number(p.max)) || 1), hecho: Math.max(0, Math.floor(Number(p.hecho)) || 0) };
  } catch (e) { return { max: 1, hecho: 0 }; }
}

// ----- Aviso corto -----
let tAviso = 0;
function avisar(texto) {
  const a = $("aviso");
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { a.hidden = true; }, 2600);
}
const AVISO_NIVELES = "🚧 Los niveles todavía no están creados";

// ----- Pantallas -----
const pantallas = { menu: $("pantalla-menu"), libre: $("pantalla-libre") };
let actual = "menu"; // menu | libre | mapa

function mostrar(nombre) {
  actual = nombre;
  if (nombre !== "mapa" && mapa.abierto()) mapa.cerrar();
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  // El ☰ no se ve en el menú principal; en Partida libre, Niveles y Mapa dice «Menú principal» y vuelve aquí
  $("btn-menu").hidden = nombre === "menu";
  if (nombre === "menu") $("btn-libre").focus({ preventScroll: true });
}

// ----- Mapa estándar (22 600 niveles = 226 etapas × 100; todavía sin niveles) -----
const etapas = crearEtapas({ porEtapa: 100 });
const mapa = montarMapa({
  prefijo: "serpiente",
  etapas,
  progreso: leerProgreso,
  jugarNivel: () => avisar(AVISO_NIVELES),
  leyenda: "Los niveles de la serpiente llegarán pronto",
  avisoPrincipal: () => "🚧 Los niveles todavía no están creados",
});

function abrirMapa(nivel) {
  actual = "mapa";
  for (const k in pantallas) pantallas[k].hidden = true;
  $("btn-menu").hidden = false;
  mapa.abrir(nivel);
}

// ----- Partida libre: dificultad y tablero -----
function botonDificultad(d) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt " + d.clase;
  b.dataset.id = d.id;
  b.textContent = d.nombre;
  b.addEventListener("click", () => { ajustes.dif = d.id; guardarAjustes(); marcar(); });
  return b;
}
function botonTablero(t) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt dos b-gris";
  b.dataset.id = clave(t);
  b.setAttribute("aria-label", "Tablero de " + t.cols + " columnas por " + t.filas + " filas");
  const g = document.createElement("span");
  g.textContent = t.cols + "×" + t.filas;
  b.append(g);
  b.addEventListener("click", () => { ajustes.tam = clave(t); guardarAjustes(); marcar(); });
  return b;
}
function marcar() {
  for (const b of $("lista-dif").children) {
    const on = b.dataset.id === ajustes.dif;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  }
  for (const b of $("lista-tam").children) {
    const on = b.dataset.id === ajustes.tam;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  }
}
$("lista-dif").append(...DIFICULTADES.map(botonDificultad));
$("lista-tam").append(...TABLEROS.map(botonTablero));
marcar();

// Aquí se arrancará la partida cuando exista la jugabilidad
function iniciarPartidaLibre(dificultad, tablero) {
  void dificultad; void tablero;
  avisar("🚧 La partida todavía no está lista");
}

// ----- Botones -----
$("btn-libre").addEventListener("click", () => mostrar("libre"));
$("btn-niveles").addEventListener("click", () => abrirMapa(leerProgreso().max));
$("btn-mapa").addEventListener("click", () => abrirMapa());
$("btn-menu").addEventListener("click", () => mostrar("menu"));
$("btn-jugar").addEventListener("click", () => {
  const t = TABLEROS.find((x) => clave(x) === ajustes.tam) || TABLEROS[0];
  iniciarPartidaLibre(ajustes.dif, t);
});

// Esc en Partida libre vuelve al menú (en el mapa lo maneja el propio mapa: vuelve a su vista principal)
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && actual === "libre") { e.preventDefault(); mostrar("menu"); }
});

// Puntos pendientes: se envían al entrar o al volver la conexión. Si Firebase no está disponible, no pasa nada.
import("../compartido/progreso.js").catch(() => {});

mostrar("menu");
