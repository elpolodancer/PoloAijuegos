// Ruta: agua/juego-agua.js
// Juego «Agua» (id de puntos «agua»): hay que hacer pasar un flujo de agua por una zona tapada hasta que llegue a su objetivo.
// INICIO CON MAPA (ESTANDARES-juegos.md, sección 13; referencia: Puzle deslizante): al abrir se ve UNA SOLA VEZ la pantalla de inicio (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes);
// de ahí en adelante el «menú principal» es el mapa del país donde va el jugador (compartido/mapa-niveles.js con unPais). Mapa solo de países: 195 países × 20 niveles = 3 900.
// POR AHORA: estrellas, monedas, tienda, mapa, Modo libre (solo la pantalla de dificultades) y Ajustes. Todavía NO existe la pantalla de nivel ni la partida del Modo libre: al tocarlos se avisa.
// Los niveles ya los crea generador-agua.js. Las reglas de estrellas y monedas están en economia-agua.js y el reparto de niveles fáciles/medios/difíciles en dificultad-agua.js.
// Al terminar un nivel, el juego llamará a terminarNivel(n, resultado).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { encolarPuntos, leerCola, guardarCola } from "../compartido/cola-puntos.js";
import * as E from "./economia-agua.js";
import { DIF, dificultadNivel } from "./dificultad-agua.js";

const ID = "agua";
const MOSTRAR_BORRAR_HISTORIAL = true;            // BOTÓN TEMPORAL DE PRUEBAS en ⚙️ Ajustes: «Borrar todo el historial y reiniciar». Debe quedar en false antes de publicar el juego (ESTANDARES 13.8)
let reiniciando = false;                          // true mientras se borra el historial: la sincronización con la nube no vuelve a traer lo borrado
const ETAPAS = crearEtapas({ porEtapa: E.POR_ETAPA, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900
if (ETAPAS.total !== E.TOTAL) console.warn("agua: el mapa (" + ETAPAS.total + " niveles) no coincide con economia-agua.js (" + E.TOTAL + ")");

const $ = (id) => document.getElementById(id);
const el = (tag, clase, texto) => { const n = document.createElement(tag); if (clase) n.className = clase; if (texto != null) n.textContent = texto; return n; };
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const inicio = $("pantalla-inicio"), libre = $("pantalla-libre"), btnMenu = $("btn-menu"), aviso = $("aviso");

// ----- Nube (opcional) -----
let nube = null, progresoMod = null;

// ----- Guardar y refrescar el chip de monedas -----
function pintarChips() {
  const d = E.leer();
  $("n-monedas").textContent = miles(E.saldo(d));
  $("chip-monedas").setAttribute("aria-label", "Tienda: " + E.saldo(d) + " monedas");
}
function guardarDatos(d) {
  const g = E.guardar(d);
  if (nube) nube.guardado();
  pintarChips();
  return g;
}
const hechoMax = () => E.leer().hecho;            // nivel más alto pasado (0 = ninguno); los niveles se abren en orden

// ----- Aviso breve (el juego no usa alert ni confirm) -----
let tAviso = 0;
function avisar(texto) {
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { aviso.hidden = true; }, 2600);
}
const SIN_NIVELES = "🚧 Los niveles todavía no están creados";

// ----- Fin de nivel: el juego llama a esto cuando el jugador termina el nivel n -----
//   resultado = { llego: true/false, fraccion: 0..1 (agua que llegó ÷ agua que salió) }, metas = { p2, p3 } opcional del nivel
//   Devuelve { estrellas, nuevas, monedas, bonos } para mostrar al terminar el nivel (ver ESTANDARES, secciones 6 y 13.5).
// Las monedas (y los puntos del perfil) solo se pagan por estrellas nuevas: repetir un nivel no da nada.
export function terminarNivel(n, resultado, metas) {
  const estrellas = E.calcularEstrellas(resultado, metas);
  if (estrellas < 1) return { estrellas: 0, nuevas: 0, monedas: 0, bonos: [] };
  const r = E.registrarNivel(E.leer(), n, estrellas);
  guardarDatos(r.datos);
  if (r.monedas > 0) { encolarPuntos(ID, r.monedas); if (progresoMod && progresoMod.vaciarPuntos) progresoMod.vaciarPuntos(); }
  mapa.refrescar();
  return { estrellas, nuevas: r.nuevas, monedas: r.monedas, bonos: r.bonos };
}

// ----- Mapa de niveles (13.4): se ve solo el país donde vas, con su silueta que se llena de agua; México es el primer país y se van abriendo de uno en uno -----
let mapaEnPrincipal = true;                        // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,                                    // se abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,                                     // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),   // el botón del centro del país dice «Jugar» mientras no se haya pasado ningún nivel
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],   // el Modo libre se abre desde el mapa
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },   // el ☰ se rotula según la vista
  progreso: () => { const d = E.leer(); return { max: d.max, hecho: d.hecho }; },
  jugarNivel: (n) => jugarNivel(n),
  infoNivel: (n) => {   // el color del botón es la dificultad del nivel; bajo el número, sus estrellas si ya lo pasaste
    const d = E.leer(), e = E.estrellasDe(d, n), t = DIF[dificultadNivel(n)], hecho = n <= d.hecho;
    return { clase: t.clase, sub: hecho ? "★".repeat(e) + "☆".repeat(3 - e) : "", aria: t.nombre.toLowerCase() + (hecho ? ", " + e + " de 3 estrellas" : "") };
  },
  resumenEstrellas: (desde, hasta) => {            // estrellas del país: ganadas / posibles (el total del juego ya no tiene chip arriba: vive aquí)
    const d = E.leer();
    let ganadas = 0;
    for (let n = desde; n <= hasta; n++) ganadas += E.estrellasDe(d, n);
    return '<span>⭐ ' + ganadas + ' / ' + (hasta - desde + 1) * 3 + ' <small>estrellas</small></span>';
  },
  leyenda: "🟢 Fácil · 🔵 Medio · 🔴 Difícil",
});
// n = nivel cuya etapa se abre (por defecto, el que toca); alcanzado = true abre la vista principal de su zona (se ve subir el agua)
function abrirMapa(n, alcanzado) { mostrar("pantalla-niveles"); mapa.abrir(n || Math.min(E.TOTAL, hechoMax() + 1), alcanzado); }
// Aquí se abrirá la pantalla del nivel n (todavía no existe): solo los niveles ya abiertos, en orden
function jugarNivel(n) {
  if (!(n >= 1 && n <= E.TOTAL) || n > E.leer().max) return;
  avisar(SIN_NIVELES);
}

// ----- Pantallas y ☰ (13.1 y 13.3) -----
// pantalla-inicio (una sola vez) · pantalla-libre (Modo libre) · pantalla-niveles (el mapa, que se dibuja encima de todo). «inicio» siempre significa «abrir el mapa».
//   ☰: oculto en el inicio y en la vista principal del mapa · «Atrás» en las vistas internas del mapa (vuelve a la vista del país) · «Volver al menú principal» en el Modo libre (abre el mapa).
function pintarBotonMenu() {
  const enMapa = mapa.abierto();
  btnMenu.hidden = !inicio.hidden || (enMapa && mapaEnPrincipal);
  const texto = enMapa ? "Atrás" : "Volver al menú principal";
  btnMenu.title = texto; btnMenu.setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  if (nombre === "inicio") { abrirMapa(); return; }
  inicio.hidden = nombre !== "pantalla-inicio";
  libre.hidden = nombre !== "pantalla-libre";
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  pintarBotonMenu();
}

// ----- Modo libre (7.2 y 13.7): grupo «Dificultad» con 5 botones solo con emoji. Todavía no existe la partida: Jugar avisa. No da monedas ni puntos. -----
// Se recuerda la última selección en el dispositivo (clave terminada en _v1 para que entre en la copia de seguridad de almacen.js).
const CLAVE_LIBRE = "agua_libre_v1";
const DIFICULTADES = [
  { emoji: "😁", nombre: "Muy fácil" },
  { emoji: "😬", nombre: "Fácil" },
  { emoji: "😐", nombre: "Normal" },
  { emoji: "😡", nombre: "Difícil" },
  { emoji: "😈", nombre: "Demoníaco" },
];
let libreDif = 2;                                  // dificultad elegida (índice de DIFICULTADES)
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g && DIFICULTADES[g.d]) libreDif = g.d; } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif })); } catch (e) {} };
function pintarLibre() {
  const fila = $("dif-fila");
  fila.replaceChildren();
  DIFICULTADES.forEach((d, i) => {
    const b = el("button", "b3d txt " + (i === libreDif ? "b-oro on" : "b-cielo"));
    b.type = "button";
    b.append(el("span", "b-ico", d.emoji));
    b.title = d.nombre; b.setAttribute("aria-label", d.nombre); b.setAttribute("aria-pressed", String(i === libreDif));
    b.addEventListener("click", () => { libreDif = i; guardarLibre(); pintarLibre(); });
    fila.appendChild(b);
  });
  $("dif-nombre").textContent = DIFICULTADES[libreDif].emoji + " " + DIFICULTADES[libreDif].nombre;
  $("libre-nota").textContent = "🚧 Todavía no está creado. Ganar aquí no dará monedas ni puntos al perfil: solo guardará tu mejor marca.";
  $("libre-record").textContent = "🏆 Aún sin resolver en esta dificultad";
}

// ----- Botones y teclado -----
// Primera vez (ningún nivel pasado): «Jugar» no abre el nivel 1 directo, abre el mapa del primer país (con ▶ Jugar en su centro). Después, sigue en el nivel que toca.
$("btn-inicio-jugar").addEventListener("click", () => { if (hechoMax() === 0) abrirMapa(1); else jugarNivel(Math.min(E.TOTAL, hechoMax() + 1)); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", () => abrirAjustes());
$("btn-libre-jugar").addEventListener("click", () => avisar("🚧 El modo libre (" + DIFICULTADES[libreDif].emoji + " " + DIFICULTADES[libreDif].nombre + ") todavía no está creado"));
// ☰: dentro de una vista del mapa (🗺️ Mapa, 🗂️ Niveles) vuelve «Atrás» a la vista del país; en el Modo libre vuelve al menú principal (el mapa)
btnMenu.addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else mostrar("inicio");
});
addEventListener("keydown", (e) => { if (e.key === "Escape" && !libre.hidden) { e.preventDefault(); mostrar("inicio"); } });   // Esc en el Modo libre = ☰; en el mapa lo maneja mapa-niveles.js

// ----- 👤 Sesión (chip de arriba a la derecha, 13.3): muestra «Sin sesión» o el nombre. jugador.js se carga aparte: sin internet el juego abre igual -----
import("../compartido/jugador.js").then((J) => J.alCambiarSesion((u) => { $("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"; })).catch(() => {});

// ----- Tienda: se abre tocando el chip de monedas -----
const tf = el("div", "pausa-fondo"); tf.hidden = true;
tf.setAttribute("role", "dialog"); tf.setAttribute("aria-modal", "true"); tf.setAttribute("aria-label", "Tienda");
const tp = el("div", "pausa-panel"), tSaldo = el("div", "t-saldo"), tl = el("div", "pausa-opciones tienda");
tp.append(el("h2", "", "🛒 Tienda"), tSaldo, tl);
tf.appendChild(tp);
document.body.appendChild(tf);
let previo = null;

function pintarTienda() {
  const d = E.leer();
  tSaldo.replaceChildren();
  const chip = el("span", "chip chip-monedas"); chip.append(el("span", "moneda"), document.createTextNode(miles(E.saldo(d))));
  tSaldo.appendChild(chip);
  tl.replaceChildren();
  for (const o of E.TIENDA) {
    const skin = o.tipo === "skin", mia = skin && E.tiene(d, o.id), enUso = skin && d.skin === o.id;
    const b = el("button", "b3d txt " + (skin ? "b-morado" : "b-oro") + (enUso ? " on" : ""));
    b.type = "button";
    b.append(el("span", "b-ico", o.icono), el("span", "t-nom", o.nombre));
    let nota = o.ayuda;
    if (!skin) nota = "Tienes " + E.stock(d, o.id) + " · " + o.ayuda;
    if (mia) { b.append(el("span", "t-precio", enUso ? "En uso" : "Usar")); b.setAttribute("aria-pressed", String(enUso)); }
    else {
      const p = el("span", "t-precio"); p.append(el("span", "moneda"), document.createTextNode(String(o.precio)));
      b.appendChild(p);
      b.disabled = E.saldo(d) < o.precio;
    }
    b.addEventListener("click", () => {
      if (mia) { if (!enUso) { guardarDatos(E.elegirSkin(E.leer(), o.id).datos); } }
      else {
        const r = E.comprar(E.leer(), o.id);
        if (!r.ok) { avisar(r.motivo); return; }
        guardarDatos(r.datos);
        avisar("✅ " + o.nombre + (skin ? " lista para usar" : " comprada"));
      }
      pintarTienda();
    });
    tl.append(b, el("small", "pausa-ayuda", nota));
  }
  const cerrarB = el("button", "b3d txt b-cielo"); cerrarB.type = "button";
  cerrarB.append(el("span", "b-ico", "✕"), el("span", "", "Cerrar"));
  cerrarB.addEventListener("click", cerrarTienda);
  tl.appendChild(cerrarB);
}
function abrirTienda() {
  if (!tf.hidden) return;
  previo = document.activeElement;
  pintarTienda();
  tf.hidden = false;
  const b = tl.querySelector("button:not(:disabled)"); if (b) b.focus({ preventScroll: true });
}
function cerrarTienda() {
  if (tf.hidden) return;
  tf.hidden = true;
  try { if (previo && previo.focus) previo.focus({ preventScroll: true }); } catch (e) {}
}
$("chip-monedas").addEventListener("click", abrirTienda);
tf.addEventListener("click", (e) => { if (e.target === tf) cerrarTienda(); });
tf.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrarTienda(); return; }
  if (e.key !== "Tab") return; // Tab no se sale de la ventana
  const bs = [...tf.querySelectorAll("button:not(:disabled)")];
  if (!bs.length) return;
  const i = bs.indexOf(document.activeElement);
  e.preventDefault();
  bs[e.shiftKey ? (i <= 0 ? bs.length - 1 : i - 1) : (i < 0 || i === bs.length - 1 ? 0 : i + 1)].focus();
});

// ----- BORRAR TODO EL HISTORIAL (temporal, para pruebas: ver MOSTRAR_BORRAR_HISTORIAL) -----
// Borra en este dispositivo el progreso (niveles, estrellas, monedas, tienda), el Modo libre elegido, quita de la cola los puntos pendientes de este juego y, con sesión,
// deja vacío el progreso de la cuenta (si no, la sincronización lo volvería a traer). NO toca los puntos que el perfil del portal ya recibió.
// Devuelve true (también se borró en la cuenta), false (no se pudo borrar en la cuenta) o null (no había sesión).
async function borrarHistorial() {
  reiniciando = true;
  const vacio = E.normalizar(null);
  try { for (const k of [E.CLAVE, CLAVE_LIBRE]) localStorage.removeItem(k); } catch (e) {}
  try { guardarCola(leerCola().filter((x) => x.j !== ID)); } catch (e) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const ref = doc(db, "progreso", auth.currentUser.uid, "juegos", ID);
    await Promise.race([setDoc(ref, { datos: JSON.stringify(vacio), actualizado: serverTimestamp() }), new Promise((_, no) => setTimeout(() => no(new Error("lento")), 8000))]);
    return true;
  } catch (e) { console.warn("borrar historial (nube):", e.code || e.message); return false; }
}

// ----- ⚙️ Ajustes (13.8; desde la pantalla de inicio): por ahora solo el borrado de pruebas. Agua no tiene app instalable propia (13.9), así que no hay «Instalar solo este juego» -----
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const foco = document.activeElement;
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Ajustes");
  const panel = el("div", "pausa-panel aj-panel");
  const msg = el("p", "aj-nota"); msg.setAttribute("role", "status"); msg.hidden = true;
  const lista = el("div", "pausa-opciones");
  const decir = (t) => { msg.textContent = t; msg.hidden = !t; };
  let ocupado = false;
  const tecla = (e) => { if (e.key === "Escape" && !ocupado) { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true); ajustesAbierto = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
  }
  addEventListener("keydown", tecla, true);   // en captura: Esc cierra esta ventana y no llega a nadie más
  fondo.addEventListener("click", (e) => { if (e.target === fondo && !ocupado) cerrar(); });
  const boton = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    b.append(el("span", "b-ico", icono), el("span", "", texto));
    b.addEventListener("click", fn);
    lista.appendChild(b);
    return b;
  };
  if (MOSTRAR_BORRAR_HISTORIAL) {
    const TXT = "Borrar todo el historial y reiniciar";
    const borrar = boton("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) {                // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        decir("Se borran los niveles, estrellas, monedas, compras y el Modo libre elegido (en este dispositivo y en tu cuenta). Es solo para pruebas.");
        setTimeout(() => { if (!ocupado) { delete borrar.dataset.seguro; borrar.lastChild.textContent = TXT; } }, 5000);
        return;
      }
      ocupado = true;
      for (const b of lista.querySelectorAll("button")) b.disabled = true;
      decir("Borrando…");
      const enNube = await borrarHistorial();
      decir(enNube === false ? "Se borró en este dispositivo, pero no se pudo borrar en tu cuenta: al iniciar sesión se volverá a bajar. Reinténtalo con internet." : "✅ Listo. Reiniciando el juego…");
      setTimeout(() => location.reload(), enNube === false ? 3500 : 900);
    });
  }
  const cerrarB = boton("", "Cerrar", "b-cielo", () => cerrar());
  cerrarB.firstChild.remove();                     // «Cerrar» va sin icono
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

pintarChips();
pintarLibre();
mostrar("pantalla-inicio");   // única vez que se ve: al abrir el juego

// ----- Nube (opcional): trae el progreso de la cuenta y envía los puntos pendientes. Sin internet no pasa nada. -----
import("../compartido/progreso.js")
  .then((m) => {
    progresoMod = m;
    nube = m.conectar(ID, {
      clave: E.CLAVE,
      fusionar: (a, b) => (reiniciando ? null : E.fusionar(a, b)),   // se está borrando todo: no se une nada
      alCambiar: () => { pintarChips(); mapa.refrescar(); if (!tf.hidden) pintarTienda(); },   // la nube trajo algo nuevo
    });
  })
  .catch(() => {});
