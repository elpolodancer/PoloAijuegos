// Ruta: cortafrutas/juego-cortafrutas.js
// Corta Frutas (id de puntos: «cortafrutas»; el nombre es provisional). Por ahora solo el MENÚ:
//   principal → Partida libre / Sin tiempo límite (eligen dificultad) · Niveles · Mapa (226 etapas × 100 = 22 600 niveles, sin niveles jugables aún)
// La partida (frutas, corte, bombas) todavía no existe: iniciarPartida() y jugarNivel() son los puntos donde se conectará.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const DIFICULTADES = [ // el color indica el nivel (verde → rojo), como en los boosts del estándar
  { nombre: "Muy fácil", clase: "b-verde",  ayuda: "Frutas lentas y casi sin bombas: ideal para calentar." },
  { nombre: "Fácil",     clase: "b-azul",   ayuda: "Salen más frutas poco a poco; las bombas son raras." },
  { nombre: "Normal",    clase: "b-morado", ayuda: "Ráfagas de frutas y alguna bomba de vez en cuando." },
  { nombre: "Difícil",   clase: "b-oro",    ayuda: "Muchas frutas a la vez, más rápidas y con más bombas." },
  { nombre: "Experto",   clase: "b-rojo",   ayuda: "Lluvia de frutas veloces y bombas por todos lados." },
];
const MODOS = {
  libre: { icono: "🍉", nombre: "Partida libre",     sub: "Corta todas las frutas que puedas antes de que se acabe el tiempo. Elige la dificultad." },
  sin:   { icono: "♾️", nombre: "Sin tiempo límite", sub: "Sin reloj: juega a tu ritmo y a la dificultad que quieras." },
};
const CLAVE_MENU = "cortafrutas_menu_v1";      // última dificultad de cada modo { libre, sin }
const CLAVE_PROG = "cortafrutas_progreso_v1";  // { max: nivel más alto desbloqueado, hecho: nivel más alto terminado }

// 226 etapas (32 estados + 194 países) de 100 niveles = 22 600. No cambies porEtapa ni el orden después de publicar.
const ETAPAS = crearEtapas({ porEtapa: 100 });

const $ = (id) => document.getElementById(id);
const menu = $("menu");
const pantallas = { principal: $("pant-principal"), modo: $("pant-modo") };
const btnMenu = $("btn-menu");
let actual = "principal";
let modo = "libre";
let mapa = null;

// ----- Aviso flotante -----
let temporizador = 0;
function aviso(texto) {
  const a = $("aviso");
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { a.hidden = true; }, 3500);
}

// ----- Elección guardada -----
function cargar() {
  const por = { libre: 1, sin: 1 };
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_MENU)) || {};
    for (const k in por) { const d = Math.floor(Number(g[k])); if (d >= 0 && d < DIFICULTADES.length) por[k] = d; }
  } catch (e) {}
  return por;
}
const sel = cargar();
const guardar = () => { try { localStorage.setItem(CLAVE_MENU, JSON.stringify(sel)); } catch (e) {} };

// ----- Progreso de los niveles (local; luego se conectará con conectar() de compartido/progreso.js) -----
function progreso() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PROG)) || {};
    const hecho = Math.max(0, Math.floor(Number(g.hecho)) || 0);
    return { hecho, max: Math.max(1, Math.floor(Number(g.max)) || 1, hecho + 1) };
  } catch (e) { return { hecho: 0, max: 1 }; }
}

// ----- Pantallas -----
function mostrar(nombre) {
  actual = nombre;
  menu.hidden = false;
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  btnMenu.hidden = nombre === "principal"; // en el menú principal el ☰ no se muestra (estándar)
  const el = pantallas[nombre].querySelector("button:not(:disabled)");
  try { el && el.focus({ preventScroll: true }); } catch (e) {}
}
function abrirModo(m) {
  modo = m;
  $("titulo-modo").textContent = MODOS[m].icono + " " + MODOS[m].nombre;
  $("sub-modo").textContent = MODOS[m].sub;
  pintar();
  mostrar("modo");
}

// ----- Botones de dificultad -----
const botonesDif = DIFICULTADES.map((d, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt chico " + d.clase;
  b.textContent = d.nombre;
  b.addEventListener("click", () => { sel[modo] = i; guardar(); pintar(); });
  $("fila-dif").appendChild(b);
  return b;
});
function pintar() {
  const dif = sel[modo];
  botonesDif.forEach((b, i) => { b.classList.toggle("on", i === dif); b.setAttribute("aria-pressed", String(i === dif)); });
  $("ayuda-dif").textContent = DIFICULTADES[dif].ayuda;
  $("btn-jugar").innerHTML = '<span class="b-ico">▶</span> Jugar · ' + DIFICULTADES[dif].nombre;
}

// ----- Puntos de enlace con la partida (por hacer) -----
function iniciarPartida(m, dif) {
  aviso("Aquí empezará «" + MODOS[m].nombre + "» en " + DIFICULTADES[dif].nombre + ". La partida aún no está hecha.");
}
function jugarNivel(n) {
  aviso("El nivel " + n + " aún no está hecho. Los 22 600 niveles llegarán más adelante.");
}

// ----- Mapa de niveles (estándar: compartido/mapa-niveles.js) -----
// Se registra ANTES de montarMapa para que Esc en la vista principal del mapa lo cierre y vuelva al menú (en las otras vistas lo maneja el mapa).
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mapa && mapa.abierto() && mapa.esPrincipal()) { e.preventDefault(); cerrarMapa(); }
});
mapa = montarMapa({
  prefijo: "cortafrutas",
  etapas: ETAPAS,
  progreso,
  jugarNivel,
  avisoPrincipal: () => "Aún no hay niveles jugables · " + ETAPAS.total.toLocaleString("es-MX") + " niveles en camino",
});
function abrirMapa(nivel) {
  menu.hidden = true;
  btnMenu.hidden = false;
  actual = "mapa";
  nivel ? mapa.abrir(nivel) : mapa.abrir();
}
function cerrarMapa() {
  mapa.cerrar();
  mostrar("principal");
}

// ----- Eventos -----
$("btn-libre").addEventListener("click", () => abrirModo("libre"));
$("btn-sin").addEventListener("click", () => abrirModo("sin"));
$("btn-niveles").addEventListener("click", () => abrirMapa(progreso().max)); // lista de niveles de la etapa donde vas
$("btn-mapa").addEventListener("click", () => abrirMapa());                  // vista principal del mapa
$("btn-jugar").addEventListener("click", () => iniciarPartida(modo, sel[modo]));
btnMenu.addEventListener("click", () => { if (mapa.abierto()) cerrarMapa(); else mostrar("principal"); }); // fuera de partida el ☰ vuelve al menú principal
addEventListener("keydown", (e) => { if (e.key === "Escape" && actual === "modo") mostrar("principal"); });

pintar();
mostrar("principal");
