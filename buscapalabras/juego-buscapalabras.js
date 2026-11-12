// Ruta: buscapalabras/juego-buscapalabras.js
// Buscapalabras — PASO 1: menú principal estándar (mapa de México con agua + mundo, 226 etapas × 100 niveles = 22 600) y «Partida libre».
// PASO 2: estrellas (★ 20 · ★★ 30 · ★★★ 40 monedas), monedas y tienda de boosts (reglas en economia-buscapalabras.js).
// Todavía NO hay tablero ni niveles: «Jugar» y los niveles del mapa solo muestran un aviso (ver empezarLibre y jugarNivel).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { TAMANOS, DIFICULTADES, LIBRE_POR_DEFECTO, CLAVE_LIBRE } from "./config-buscapalabras.js";
import * as eco from "./economia-buscapalabras.js";

const $ = (id) => document.getElementById(id);
const btnMenu = $("btn-menu"), libre = $("libre"), info = $("info"), tienda = $("tienda"), aviso = $("aviso");

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
for (const v of [libre, info, tienda]) v.addEventListener("click", (e) => { if (e.target === v) cerrarVentana(v); }); // tocar fuera cierra
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!libre.hidden) { e.preventDefault(); cerrarVentana(libre); } else if (!tienda.hidden) { e.preventDefault(); cerrarVentana(tienda); } else if (!info.hidden) { e.preventDefault(); cerrarVentana(info); }
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

// ----- Progreso: estrellas, monedas y boosts (local primero; se sincroniza con la cuenta si hay sesión e internet) -----
let prog = leerProgreso(), nube = null, mapa = null;
function leerProgreso() { try { return eco.normalizar(JSON.parse(localStorage.getItem(eco.CLAVE_PROGRESO))); } catch (e) { return eco.vacio(); } }
function guardarProgreso() {
  try { localStorage.setItem(eco.CLAVE_PROGRESO, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
  refrescarTodo();
}
function refrescarTodo() {
  $("monedas").textContent = eco.saldo(prog).toLocaleString("es-MX");
  if (!tienda.hidden) pintarTienda();
  if (mapa) mapa.refrescar();
}
// Se importa aparte y con try/catch: el juego funciona aunque Firebase no cargue (primera vez sin internet)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar("buscapalabras", {
    clave: eco.CLAVE_PROGRESO,
    fusionar: eco.fusionar,
    alCambiar: (unido) => { prog = eco.normalizar(unido); refrescarTodo(); }, // la nube trajo algo nuevo
  });
}).catch(() => {});

// El tablero (siguiente paso) llamará a esto al terminar un NIVEL del mapa. Devuelve { estrellas, monedas } para mostrarlos en la pantalla de fin de nivel.
// ayudas = cuántos boosts de ayuda (💡 🔀 🔍) se usaron; parSeg = eco.parSegundos({ palabras, dif, tam })
function terminarNivel(nivel, { segundos, parSeg, ayudas = 0 }) {
  const estrellas = eco.estrellasDe({ segundos, parSeg, ayudas });
  const r = eco.registrarNivel(prog, nivel, estrellas);
  prog = r.estado; guardarProgreso();
  return { estrellas, monedas: r.monedas };
}
// Un boost de la mochila se gasta con esto (devuelve false si no queda ninguno)
function usarBoost(id) { const r = eco.usar(prog, id); if (!r.ok) return false; prog = r.estado; guardarProgreso(); return true; }

// ----- Tienda -----
const monedaHtml = '<span class="moneda"></span>';
function pintarTienda() {
  $("tienda-saldo").innerHTML = monedaHtml + eco.saldo(prog).toLocaleString("es-MX");
  const lista = $("tienda-lista"); lista.replaceChildren();
  for (const b of eco.BOOSTS) {
    const fila = document.createElement("div"); fila.className = "t-fila";
    const ico = document.createElement("span"); ico.className = "t-ico"; ico.textContent = b.icono;
    const txt = document.createElement("span"); txt.className = "t-txt";
    txt.innerHTML = "<b></b><small></small><em></em>";
    txt.children[0].textContent = b.nombre; txt.children[1].textContent = b.texto; txt.children[2].textContent = "Tienes: " + eco.stock(prog, b.id);
    const comprar = document.createElement("button"); comprar.type = "button"; comprar.className = "b3d txt b-oro";
    comprar.innerHTML = monedaHtml + b.precio; comprar.disabled = eco.saldo(prog) < b.precio;
    comprar.setAttribute("aria-label", "Comprar " + b.nombre + " por " + b.precio + " monedas");
    comprar.addEventListener("click", () => { const r = eco.comprar(prog, b.id); if (r.ok) { prog = r.estado; guardarProgreso(); } });
    fila.append(ico, txt, comprar); lista.appendChild(fila);
  }
}
function abrirTienda() { pintarTienda(); abrirVentana(tienda, $("tienda-cerrar")); }
$("tienda-cerrar").addEventListener("click", () => cerrarVentana(tienda));

// ----- Mapa de niveles (menú principal) -----
const etapas = crearEtapas({ porEtapa: 100 }); // 32 estados × 100 + 194 países × 100 = 22 600 niveles
mapa = montarMapa({
  prefijo: "buscapalabras",
  etapas,
  progreso: () => eco.progresoDe(prog, etapas.total), // los niveles se abren en orden: hecho = el más alto con alguna estrella
  infoNivel: (n) => { const e = eco.estrellasNivel(prog, n); return { sub: e ? "★".repeat(e) + "☆".repeat(3 - e) : "", aria: e ? e + " de 3 estrellas" : "", sinMarca: true }; },
  jugarNivel: () => avisar("Los niveles llegan pronto. Por ahora prueba la Partida libre."),
  botonesAntes: [{ icono: "🔤", texto: "Partida libre", clase: "b-oro", fn: abrirLibre }], // primer botón, antes de «Continuar»
  botonesExtra: [{ icono: "🛒", texto: "Tienda", clase: "b-azul", fn: abrirTienda }], // a la derecha de «Continuar»
  alInfo: () => abrirVentana(info, $("info-cerrar")),
  leyenda: "Los niveles llegan pronto",
  avisoPrincipal: () => etapas.total.toLocaleString("es-MX") + " niveles · " + (etapas.numEstados + etapas.numPaises) + " etapas de " + etapas.porEtapa,
  alCambiarVista: (esPrincipal) => { btnMenu.hidden = esPrincipal; }, // «Menú principal» no se muestra en la vista principal
});
btnMenu.addEventListener("click", () => mapa.principal()); // fuera de la vista principal, ☰ vuelve a ella
mapa.abrir();
refrescarTodo();

// SOLO PARA PROBAR sin tablero (borrar cuando exista el juego): en la consola del navegador
//   BP_DEV.terminarNivel(1, 50, 60)      → nivel 1 terminado en 50 s con tiempo de par 60 s (3 estrellas)
//   BP_DEV.terminarNivel(2, 50, 60, 1)   → igual pero con 1 ayuda (máximo 2 estrellas)
//   BP_DEV.darMonedas(500)               → suma monedas para probar la tienda
window.BP_DEV = {
  terminarNivel(n, segundos, parSeg, ayudas = 0) { const r = terminarNivel(n, { segundos, parSeg, ayudas }); avisar("Nivel " + n + ": " + "★".repeat(r.estrellas) + " · +" + r.monedas + " monedas"); return r; },
  darMonedas(c) { prog = eco.darMonedas(prog, c); guardarProgreso(); },
  usarBoost,
};
