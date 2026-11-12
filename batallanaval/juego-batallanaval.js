// Ruta: batallanaval/juego-batallanaval.js
// Batalla naval: por ahora SOLO el menú principal (todavía no hay tablero ni batalla).
//   · Mapa estándar de México y del mundo: 226 etapas × 100 niveles = 22 600 niveles por crear.
//   · ♾️ Partida libre (primer botón): 5 dificultades del rival y tableros de 15×15, 20×20, 30×30 y 50×50.
//     Sin límite de tiradas ni de tiempo. Entre más grande el tablero, más barcos hay que colocar.
// No usa Firebase: funciona sin internet. Cuando haya partidas con puntos se agrega cola-puntos.js / progreso.js.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { leerProgreso, monedas, fusionar, CLAVE_PROGRESO, TOTAL_NIVELES } from "./logica-batallanaval.js";

const ID = "batallanaval";
const CLAVE_LIBRE = "batallanaval_libre_v1";      // { dif, tam }: última elección de la partida libre

// ----- Datos de la partida libre -----
export const DIFICULTADES = [
  { id: 1, nombre: "Muy fácil", clase: "b-verde",  rival: "El rival dispara al azar." },
  { id: 2, nombre: "Fácil",     clase: "b-azul",   rival: "Dispara al azar, pero al acertar busca alrededor hasta hundir el barco." },
  { id: 3, nombre: "Normal",    clase: "b-morado", rival: "Dispara en patrón de tablero de ajedrez y remata los barcos que toca." },
  { id: 4, nombre: "Difícil",   clase: "b-oro",    rival: "Calcula dónde caben más barcos y dispara a las casillas más probables." },
  { id: 5, nombre: "Experto",   clase: "b-rojo",   rival: "Como Difícil, pero descarta casillas imposibles según los barcos que aún flotan." },
];
// Flota por tamaño: { largo del barco: cuántos }. Más tablero = más barcos (≈ 12 % de las casillas en 15 y 20, ≈ 10 % en 30 y 50).
export const TAMANOS = [
  { n: 15, flota: { 5: 1, 4: 2, 3: 3, 2: 3 } },
  { n: 20, flota: { 6: 1, 5: 2, 4: 3, 3: 4, 2: 4 } },
  { n: 30, flota: { 7: 1, 6: 2, 5: 3, 4: 5, 3: 6, 2: 7 } },
  { n: 50, flota: { 10: 2, 9: 2, 8: 3, 7: 4, 6: 5, 5: 6, 4: 8, 3: 9, 2: 10 } },
];
const resumenFlota = (flota) => {
  let barcos = 0, casillas = 0;
  for (const l in flota) { barcos += flota[l]; casillas += l * flota[l]; }
  return { barcos, casillas };
};

// ----- Utilidades -----
const $ = (id) => document.getElementById(id);
const h = (tag, clase, texto) => { const n = document.createElement(tag); if (clase) n.className = clase; if (texto != null) n.textContent = texto; return n; };
const leerJSON = (clave, defecto) => { try { return JSON.parse(localStorage.getItem(clave)) || defecto; } catch (e) { return defecto; } };
const guardarJSON = (clave, v) => { try { localStorage.setItem(clave, JSON.stringify(v)); } catch (e) {} };

let toastT = 0;
function aviso(texto) {
  let t = $("bn-toast");
  if (!t) { t = h("div", "bn-toast"); t.id = "bn-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = texto; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

// ----- Estado -----
const ETAPAS = crearEtapas({ porEtapa: 100 }); // 32 estados + 194 países = 226 etapas × 100 = 22 600 niveles
// Progreso (estrellas, boosts comprados y usados) en logica-batallanaval.js; las monedas se calculan, no se guardan
const progreso = () => { const p = leerProgreso(); return { max: p.max, hecho: p.hecho }; };
const chipMonedas = $("monedas-n");
const pintarMonedas = () => { if (chipMonedas) chipMonedas.textContent = monedas(leerProgreso()).toLocaleString("es-MX"); };
pintarMonedas();
addEventListener("storage", (e) => { if (e.key === CLAVE_PROGRESO) { pintarMonedas(); mapa.refrescar(); } }); // otra pestaña o la nube lo cambió
// Sincroniza con la cuenta cuando hay internet y sesión (si Firebase no carga, el juego sigue igual)
export let nube = null;
import("../compartido/progreso.js")
  .then((m) => { nube = m.conectar(ID, { clave: CLAVE_PROGRESO, fusionar, alCambiar: () => { pintarMonedas(); mapa.refrescar(); } }); })
  .catch(() => {});
let libre = (() => { const g = leerJSON(CLAVE_LIBRE, {}); return { dif: DIFICULTADES.some((d) => d.id === g.dif) ? g.dif : 1, tam: TAMANOS.some((t) => t.n === g.tam) ? g.tam : 15 }; })();

const btnMenu = $("btn-menu");
let libreAbierta = false;

// ----- Pantalla «Partida libre» -----
const raiz = h("div", "bn-raiz");
raiz.hidden = true;
const col = h("div", "bn-col");
raiz.appendChild(col);
document.body.appendChild(raiz);

function boton(icono, texto, clase, fn) {
  const b = h("button", "b3d txt " + clase);
  b.type = "button";
  b.append(h("span", "b-ico", icono), document.createTextNode(" " + texto));
  b.addEventListener("click", fn);
  return b;
}

function dibujarLibre() {
  col.replaceChildren();
  col.appendChild(h("h2", null, "♾️ Partida libre"));
  col.appendChild(h("p", "bn-nota", "Sin límite de tiradas ni de tiempo: la batalla termina cuando hundes toda la flota rival… o ella la tuya."));

  col.appendChild(h("h3", null, "Dificultad del rival"));
  const fd = h("div", "bn-fila");
  for (const d of DIFICULTADES) {
    const b = h("button", "b3d txt " + d.clase, d.nombre);
    b.type = "button";
    b.addEventListener("click", () => { libre.dif = d.id; guardarJSON(CLAVE_LIBRE, libre); dibujarLibre(); });
    b.setAttribute("aria-pressed", String(libre.dif === d.id));
    if (libre.dif === d.id) b.classList.add("on");
    fd.appendChild(b);
  }
  col.appendChild(fd);
  col.appendChild(h("p", "bn-nota", DIFICULTADES.find((d) => d.id === libre.dif).rival));

  col.appendChild(h("h3", null, "Tamaño del tablero"));
  const ft = h("div", "bn-fila");
  for (const t of TAMANOS) {
    const b = h("button", "b3d txt b-gris", t.n + "×" + t.n);
    b.type = "button";
    b.setAttribute("aria-pressed", String(libre.tam === t.n));
    if (libre.tam === t.n) b.classList.add("on");
    b.addEventListener("click", () => { libre.tam = t.n; guardarJSON(CLAVE_LIBRE, libre); dibujarLibre(); });
    ft.appendChild(b);
  }
  col.appendChild(ft);

  const t = TAMANOS.find((x) => x.n === libre.tam);
  const r = resumenFlota(t.flota);
  const caja = h("div", "bn-flota");
  caja.appendChild(h("p", null, "Tu flota: " + r.barcos + " barcos (" + r.casillas + " casillas de " + t.n * t.n + "). El rival tiene la misma."));
  for (const largo of Object.keys(t.flota).map(Number).sort((a, b) => b - a)) {
    const f = h("div", "bn-barco");
    const c = h("span", "bn-casillas");
    c.setAttribute("aria-hidden", "true");
    for (let i = 0; i < largo; i++) c.appendChild(document.createElement("i"));
    f.append(c, h("span", null, "Barco de " + largo), h("b", null, "×" + t.flota[largo]));
    caja.appendChild(f);
  }
  col.appendChild(caja);

  const av = h("div"); av.id = "bn-aviso"; av.setAttribute("role", "status");
  col.appendChild(av);
  const c = h("div", "bn-comenzar");
  const go = boton("▶", "Comenzar", "grande b-verde", () => {
    av.textContent = "⚓ Falta programar la colocación de barcos y la batalla. Tu elección (" + DIFICULTADES.find((d) => d.id === libre.dif).nombre + ", " + libre.tam + "×" + libre.tam + ") ya quedó guardada.";
  });
  c.appendChild(go);
  col.appendChild(c);
}

function abrirLibre() {
  libreAbierta = true;
  mapa.cerrar();
  dibujarLibre();
  raiz.hidden = false;
  raiz.scrollTop = 0;
  btnMenu.hidden = false;
}
function cerrarLibre() {
  if (!libreAbierta) return;
  libreAbierta = false;
  raiz.hidden = true;
  mapa.abrir(); // vuelve a la vista principal del mapa (ahí alCambiarVista oculta el ☰)
}

// ----- Info -----
let infoAbierta = false;
function abrirInfo() {
  if (infoAbierta) return;
  infoAbierta = true;
  const fondo = h("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Cómo se juega");
  const panel = h("div", "pausa-panel");
  panel.appendChild(h("h2", null, "ℹ️ Batalla naval"));
  for (const t of [
    "Coloca tu flota en el tablero y dispara a las casillas del rival para encontrar y hundir sus barcos. Gana quien hunda primero toda la flota contraria.",
    "No hay límite de tiradas ni de tiempo.",
    "♾️ Partida libre: elige la dificultad del rival (5) y el tamaño del tablero (15×15, 20×20, 30×30 o 50×50). Entre más grande, más barcos.",
    "🗺️ El mapa de México y del mundo tendrá 22 600 niveles (100 por estado y por país). Todavía no están creados.",
  ]) panel.appendChild(h("p", "bn-info-texto", t));
  const cerrar = () => { fondo.remove(); infoAbierta = false; removeEventListener("keydown", tecla); };
  const tecla = (e) => { if (e.key === "Escape") cerrar(); };
  const ok = boton("✔", "Entendido", "b-verde", cerrar);
  const l = h("div", "pausa-opciones"); l.appendChild(ok); panel.appendChild(l);
  fondo.appendChild(panel);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  addEventListener("keydown", tecla);
  document.body.appendChild(fondo);
  ok.focus();
}

// ----- Mapa estándar -----
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso,
  infoNivel: (n) => { // estrellas de cada nivel: ★★☆
    const e = leerProgreso().e[n] || 0;
    return { sub: e ? "★".repeat(e) + "☆".repeat(3 - e) : "", clase: e === 3 ? "b-oro" : "b-azul", aria: e ? e + " de 3 estrellas" : "sin estrellas", sinMarca: true };
  },
  jugarNivel: () => aviso("🚧 Los niveles de Batalla naval todavía no están creados."),
  botonesAntes: [{ icono: "♾️", texto: "Partida libre", clase: "b-verde", fn: abrirLibre }], // PRIMER botón
  alInfo: abrirInfo,
  avisoPrincipal: () => TOTAL_NIVELES.toLocaleString("es-MX") + " niveles por crear · ♾️ Partida libre ya disponible",
  alCambiarVista: (esPrincipal) => { btnMenu.hidden = esPrincipal && !libreAbierta; },
});

// ☰ «Menú principal»: desde Partida libre vuelve al mapa; desde otras vistas del mapa, a su vista principal
btnMenu.addEventListener("click", () => { if (libreAbierta) cerrarLibre(); else mapa.principal(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && libreAbierta && !infoAbierta) cerrarLibre(); });

mapa.abrir();
