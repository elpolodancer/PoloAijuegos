// Ruta: billar/juego-billar.js
// Billar: MENÚ PRINCIPAL estándar (Modo libre · Niveles · Mapa · Salir), mapa de 22 600 niveles (226 etapas × 100) SIN niveles creados aún,
// y sistema de estrellas y monedas (economia-billar.js). Id de puntos del juego: "billar".
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import * as eco from "./economia-billar.js";

const ETAPAS = crearEtapas({ porEtapa: 100 }); // 32 estados × 100 + 194 países × 100 = 22 600

// Las 5 dificultades estándar del Modo libre (sección 7). «ayuda» es provisional: ajústala cuando exista la partida.
const DIFICULTADES = [
  { id: "muy-facil", texto: "Muy fácil", clase: "b-verde",  ayuda: "Guía larga y bolas grandes" },
  { id: "facil",     texto: "Fácil",     clase: "b-azul",   ayuda: "Guía de trayectoria" },
  { id: "normal",    texto: "Normal",    clase: "b-morado", ayuda: "Guía corta" },
  { id: "dificil",   texto: "Difícil",   clase: "b-oro",    ayuda: "Sin guía" },
  { id: "experto",   texto: "Experto",   clase: "b-rojo",   ayuda: "Sin guía y con tiempo" },
];

const $ = (id) => document.getElementById(id);
const pantallas = { menu: $("pantalla-menu"), libre: $("pantalla-libre") };
const btnMenu = $("btn-menu");

// ----- Monedas -----
function pintarMonedas() { $("n-monedas").textContent = eco.saldo().toLocaleString("es-MX"); }

// ----- Avisos -----
let tAviso = 0;
function avisar(texto) {
  const a = $("aviso-billar");
  a.textContent = texto; a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { a.hidden = true; }, 2600);
}

// ----- Mapa estándar (Niveles y Mapa) -----
const mapa = montarMapa({
  prefijo: eco.ID_JUEGO,
  etapas: ETAPAS,
  progreso: () => eco.avanceMapa(),
  jugarNivel: (n) => avisar("El nivel " + n + " de Billar todavía no está creado"),
  infoNivel: (n) => {                      // bajo el número de cada nivel: sus estrellas
    const s = eco.estrellasDeNivel(n);
    return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: s ? s + " de 3 estrellas" : "sin estrellas" };
  },
  leyenda: "Ganas 15, 30 o 45 monedas según tus estrellas (★ ★★ ★★★) la primera vez que las consigues",
});

// ----- Navegación entre pantallas -----
function ir(nombre) {
  mapa.cerrar();
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  btnMenu.hidden = nombre === "menu";   // el ☰ no se ve en el menú principal; en Modo libre, Niveles y Mapa dice «Menú principal»
}
function abrirMapa(n) {
  for (const k in pantallas) pantallas[k].hidden = true;
  btnMenu.hidden = false;
  mapa.abrir(n);
}
btnMenu.addEventListener("click", () => ir("menu"));

// ----- Modo libre: 5 dificultades (sin monedas ni estrellas, por estándar) -----
const lista = $("lista-dificultad");
for (const d of DIFICULTADES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt grande " + d.clase;
  b.innerHTML = '<span class="b-ico">🎱</span> <span></span>';
  b.lastElementChild.textContent = d.texto;
  b.title = d.ayuda;
  b.addEventListener("click", () => empezarLibre(d.id));
  lista.appendChild(b);
}
function empezarLibre(dificultad) {
  // TODO: aquí arrancará la partida (mesa, bolas, taco). Por ahora solo avisa.
  avisar("La mesa de billar todavía está en construcción (dificultad: " + dificultad + ")");
}

$("btn-libre").addEventListener("click", () => ir("libre"));
$("btn-niveles").addEventListener("click", () => abrirMapa(eco.avanceMapa().max)); // el mapa abierto en el nivel actual
$("btn-mapa").addEventListener("click", () => abrirMapa());                        // vista principal del mapa

// ----- Fin de nivel (se llamará desde la partida cuando exista) -----
// resultado: { gano, tiros, par, faltas }. Devuelve { estrellas, monedas, mejoro, primeraVez } para mostrarlo en «.sobre-tablero».
export function terminarNivel(n, resultado) {
  const r = eco.registrarNivel(n, eco.estrellasDe(resultado));
  pintarMonedas();
  if (nube) nube.guardado();
  return r;
}

// ----- Sincronización con la cuenta (opcional: el juego funciona igual sin Firebase ni internet) -----
let nube = null;
import("../compartido/progreso.js")
  .then((m) => {
    nube = m.conectar(eco.ID_JUEGO, {
      clave: eco.CLAVE_PROGRESO,
      fusionar: eco.fusionar,
      alCambiar: () => { pintarMonedas(); mapa.refrescar(); },
    });
  })
  .catch(() => {});

pintarMonedas();
ir("menu");
