// Ruta: conectar/juego-conectar.js
// Menú principal de «Conecta los puntos» (id de puntos: conectar). Por ahora NO hay tablero ni niveles: solo el menú,
// la elección de partida libre (5 dificultades × tableros de 5×5 a 10×10) y el mapa estándar con sus 22 600 niveles.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const CLAVE_LIBRE = "conectar_libre_v1";      // { dif: 0..4, tam: 5..10 }
const CLAVE_PROG = "conectar_progreso_v1";     // { max, hecho } (lo escribirá el juego cuando haya niveles)
const DIFICULTADES = [
  { nombre: "Muy fácil", clase: "b-verde" }, { nombre: "Fácil", clase: "b-azul" }, { nombre: "Media", clase: "b-morado" },
  { nombre: "Difícil", clase: "b-oro" }, { nombre: "Experta", clase: "b-rojo" },
];
const TAMANOS = [5, 6, 7, 8, 9, 10];
const ETAPAS = crearEtapas({ porEtapa: 100 });  // 226 etapas (32 estados + 194 países) × 100 = 22 600 niveles

const $ = (id) => document.getElementById(id);
const leer = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// ----- Aviso corto -----
let tAviso = 0;
function aviso(texto) {
  const a = $("aviso");
  a.textContent = texto; a.hidden = false;
  clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 3200);
}

// ----- Pantallas -----
const PANTALLAS = ["menu", "libre", "niveles"];
function mostrar(nombre) { // nombre: menu | libre | niveles | mapa
  for (const p of PANTALLAS) $("p-" + p).hidden = p !== nombre;
  $("btn-menu").hidden = nombre === "menu"; // el ☰ no se muestra en el menú principal
  if (nombre === "mapa") mapa.abrir(); else mapa.cerrar();
}
$("btn-menu").addEventListener("click", () => mostrar("menu"));
$("b-libre").addEventListener("click", () => mostrar("libre"));
$("b-niveles").addEventListener("click", () => mostrar("niveles"));
$("b-mapa").addEventListener("click", () => mostrar("mapa"));
$("b-ver-mapa").addEventListener("click", () => mostrar("mapa"));

// ----- Partida libre -----
const g = leer(CLAVE_LIBRE);
let dif = DIFICULTADES[g.dif] ? g.dif : 0;
let tam = TAMANOS.includes(g.tam) ? g.tam : 5;

function elegir(contenedor, items, activo, alElegir) {
  contenedor.replaceChildren();
  items.forEach((it, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + it.clase + (i === activo ? " on" : "");
    b.textContent = it.texto;
    b.setAttribute("aria-pressed", String(i === activo));
    b.addEventListener("click", () => alElegir(i));
    contenedor.appendChild(b);
  });
}
function pintarLibre() {
  elegir($("dif"), DIFICULTADES.map((d) => ({ texto: d.nombre, clase: d.clase })), dif, (i) => { dif = i; pintarLibre(); });
  elegir($("tam"), TAMANOS.map((n) => ({ texto: n + "×" + n, clase: "b-azul" })), TAMANOS.indexOf(tam), (i) => { tam = TAMANOS[i]; pintarLibre(); });
  $("resumen").textContent = "Tablero de " + tam + "×" + tam + " · dificultad " + DIFICULTADES[dif].nombre.toLowerCase();
  guardar(CLAVE_LIBRE, { dif, tam });
}
$("b-jugar").addEventListener("click", () => aviso("El tablero de " + tam + "×" + tam + " todavía no está hecho"));
pintarLibre();

// ----- Mapa estándar (compartido/mapa-niveles.js) -----
const progreso = () => {
  const p = leer(CLAVE_PROG);
  return { max: Math.max(1, Math.floor(Number(p.max)) || 1), hecho: Math.max(0, Math.floor(Number(p.hecho)) || 0) };
};
const mapa = montarMapa({
  prefijo: "conectar",
  etapas: ETAPAS,
  progreso,
  jugarNivel: (n) => aviso("El nivel " + n + " todavía no está hecho"),
  leyenda: "Los niveles llegarán pronto",
  avisoPrincipal: () => ETAPAS.total.toLocaleString("es-MX") + " niveles por crear · 100 por estado y por país",
  botonesExtra: [{ icono: "♾️", texto: "Partida libre", clase: "b-verde", fn: () => mostrar("libre") }],
  alInfo: () => aviso("Une cada pareja de puntos del mismo color con una línea, sin que las líneas se crucen"),
});
