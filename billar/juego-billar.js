// Ruta: billar/juego-billar.js
// Billar con el INICIO CON MAPA (ESTANDARES-juegos.md, sección 13; referencia: 5deslizante/juego-5deslizante.js).
//   · Pantalla de inicio (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes): se ve UNA sola vez, al abrir el juego. Después el menú principal ES el mapa.
//   · Mapa solo de países (ESTANDARES A-bis): 195 países × 20 niveles = 3 900, con la silueta del país que se llena de agua (opción unPais de compartido/mapa-niveles.js).
//     Todavía NO hay niveles creados (todos salen con 🚧) ni partida: lo que falta está marcado con «TODO».
//   · Estrellas (1 a 3) y monedas (15 a 45) en economia-billar.js. Id de puntos del juego: "billar".
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { leerCola, guardarCola } from "../compartido/cola-puntos.js";
import * as eco from "./economia-billar.js";

const ID = eco.ID_JUEGO;
const MOSTRAR_BORRAR_HISTORIAL = true;            // BOTÓN TEMPORAL DE PRUEBAS en ⚙️ Ajustes («Borrar todo el historial y reiniciar»). Debe quedar en false antes de publicar el juego (ESTANDARES 13.8)
let reiniciando = false;                          // true mientras se borra el historial: la sincronización con la nube no vuelve a traer lo borrado
const ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900
const TOTAL = ETAPAS.total;
if (TOTAL !== eco.TOTAL_NIVELES) console.warn("billar: TOTAL_NIVELES de economia-billar.js (" + eco.TOTAL_NIVELES + ") no coincide con el mapa (" + TOTAL + ")");

// Las 5 dificultades estándar del Modo libre (😁 😬 😐 😡 😈). «ayuda» es provisional: ajústala cuando exista la partida.
const DIFICULTADES = [
  { id: "muy-facil", emoji: "😁", texto: "Muy fácil", ayuda: "Guía larga y bolas grandes" },
  { id: "facil",     emoji: "😬", texto: "Fácil",     ayuda: "Guía de trayectoria" },
  { id: "normal",    emoji: "😐", texto: "Normal",    ayuda: "Guía corta" },
  { id: "dificil",   emoji: "😡", texto: "Difícil",   ayuda: "Sin guía" },
  { id: "experto",   emoji: "😈", texto: "Experto",   ayuda: "Sin guía y con tiempo" },
];

const $ = (id) => document.getElementById(id);
const hechoMax = () => eco.avanceMapa().hecho;     // nivel más alto terminado (0 = ninguno)
const nivelCreado = (n) => false;                  // TODO: cuando existan los niveles → n <= NIVELES.length (de niveles-billar.js). Mientras tanto todos salen con 🚧

// ----- Monedas -----
function pintarMonedas() { $("n-monedas").textContent = eco.saldo().toLocaleString("es-MX"); }

// ----- Avisos (el juego no usa alert ni confirm) -----
let tAviso = 0;
function avisar(texto) {
  const a = $("aviso-billar");
  a.textContent = texto; a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { a.hidden = true; }, 2600);
}

// ----- Mapa estándar de países (13.4): se ve solo el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos -----
let mapaEnPrincipal = true;                        // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,                                    // abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,                                     // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),   // el botón del centro del país dice «Jugar» mientras no se haya pasado ningún nivel
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],   // el Modo libre se abre desde el mapa
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },   // el ☰ se rotula según la vista
  progreso: () => eco.avanceMapa(),                // { hecho, max = hecho + 1 }: los niveles se abren en orden
  jugarNivel: (n) => jugarNivel(n),
  infoNivel: (n) => {                              // bajo el número de cada nivel: 🚧 si no existe todavía y, si no, sus estrellas
    if (!nivelCreado(n)) return { sub: "🚧", aria: "todavía no está creado" };
    const s = eco.estrellasDeNivel(n);
    return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: s ? s + " de 3 estrellas" : "sin estrellas" };
  },
});
// n = nivel cuyo país se abre (por defecto, el que toca)
function abrirMapa(n) { mostrar("pantalla-niveles"); mapa.abrir(n || Math.min(TOTAL, eco.avanceMapa().max)); pintarBotonMenu(); }

// ----- Pantallas (13.1): «inicio» siempre significa «abrir el mapa»; la pantalla de inicio se ve solo al abrir el juego -----
// «pantalla-niveles» = el mapa, que se dibuja encima de todo y no es una sección.
function pintarBotonMenu() {
  const enMapa = mapa.abierto();
  $("btn-menu").hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);   // oculto en el inicio y en la vista principal del mapa
  const texto = enMapa ? "Atrás" : "Volver al menú principal";                          // «Atrás» en las vistas internas del mapa; en el Modo libre vuelve al mapa
  $("btn-menu").title = texto; $("btn-menu").setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  if (nombre === "inicio") { abrirMapa(); return; }
  for (const p of ["pantalla-inicio", "pantalla-libre"]) $(p).hidden = p !== nombre;
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  pintarBotonMenu();
  if (nombre === "pantalla-libre") pintarLibre();
}
// ☰: dentro de una vista del mapa (Mapa, Niveles) vuelve «Atrás» a la vista del país; en la pantalla del Modo libre abre el mapa
$("btn-menu").addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else mostrar("inicio");
});

// ----- Niveles -----
function jugarNivel(n) {
  if (!(n >= 1 && n <= TOTAL) || n > eco.avanceMapa().max) return;   // solo el siguiente al último terminado (y los anteriores)
  if (!nivelCreado(n)) { avisar("🚧 Los niveles todavía no están creados"); return; }
  // TODO: aquí arrancará la partida del nivel n (mesa, bolas, taco). Al terminar, llamar a terminarNivel(n, { gano, tiros, par, faltas }).
}

// ----- Modo libre (13.7): 5 dificultades (sin monedas ni estrellas, por estándar). Clave «_v1» para que entre en la copia de seguridad de almacen.js -----
const CLAVE_LIBRE = "billar_libre_v1";
let libreDif = 2;                                  // dificultad elegida (índice de DIFICULTADES)
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g && DIFICULTADES[g.d]) libreDif = g.d; } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif })); } catch (e) {} };
function pintarLibre() {
  const df = $("dif-fila");
  df.replaceChildren();
  DIFICULTADES.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (i === libreDif ? "b-oro on" : "b-cielo");   // el elegido b-oro, el resto b-cielo
    const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = d.emoji;
    b.appendChild(ico);
    b.title = d.texto; b.setAttribute("aria-label", d.texto); b.setAttribute("aria-pressed", String(i === libreDif));
    b.addEventListener("click", () => { libreDif = i; guardarLibre(); pintarLibre(); });
    df.appendChild(b);
  });
  const d = DIFICULTADES[libreDif];
  $("dif-nombre").textContent = d.emoji + " " + d.texto + " · " + d.ayuda;
  $("libre-nota").textContent = "Ganar aquí no da monedas ni estrellas: solo guarda tu mejor marca.";
  $("libre-record").textContent = "🏆 Aún sin partidas en esta dificultad";   // TODO: récord por dificultad cuando exista la partida
}
function empezarLibre() {
  // TODO: aquí arrancará la partida libre (mesa, bolas, taco) con la dificultad DIFICULTADES[libreDif]. Por ahora solo avisa.
  avisar("La mesa de billar todavía está en construcción (dificultad: " + DIFICULTADES[libreDif].texto + ")");
}

// ----- Botones de la pantalla de inicio (13.2) -----
// ▶ Jugar: el nivel que toca; mientras no se haya pasado ninguno abre el mapa en el nivel 1 (con ▶ Jugar en el centro del país)
$("btn-inicio-jugar").addEventListener("click", () => { if (hechoMax() === 0) abrirMapa(1); else jugarNivel(Math.min(TOTAL, hechoMax() + 1)); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-libre-jugar").addEventListener("click", empezarLibre);

// ----- Fin de nivel (se llamará desde la partida cuando exista) -----
// resultado: { gano, tiros, par, faltas }. Devuelve { estrellas, monedas, mejoro, primeraVez } para mostrarlo (ventana de fin de nivel, sección 6 de ESTANDARES).
// TODO: la primera vez que se pasa un nivel (primeraVez), 1 punto del portal con encolarNivel(ID) de compartido/cola-puntos.js (sección 12).
export function terminarNivel(n, resultado) {
  const r = eco.registrarNivel(n, eco.estrellasDe(resultado));
  pintarMonedas();
  if (nube) nube.guardado();
  return r;
}

// ----- BORRAR TODO EL HISTORIAL (temporal, para pruebas: ver MOSTRAR_BORRAR_HISTORIAL) -----
// Borra en este dispositivo el progreso (estrellas, monedas gastadas) y la dificultad elegida del Modo libre, quita de la cola los puntos pendientes de este juego y,
// con sesión, deja vacío el progreso de la cuenta (si no, la sincronización lo volvería a traer). NO toca los puntos que el perfil del portal ya recibió.
// Devuelve true (también se borró en la cuenta), false (no se pudo borrar en la cuenta) o null (no había sesión).
async function borrarHistorial() {
  reiniciando = true;
  try { for (const k of [eco.CLAVE_PROGRESO, CLAVE_LIBRE]) localStorage.removeItem(k); } catch (e) {}
  try { guardarCola(leerCola().filter((e) => e.j !== ID)); } catch (e) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const ref = doc(db, "progreso", auth.currentUser.uid, "juegos", ID);
    await Promise.race([setDoc(ref, { datos: JSON.stringify({ e: {}, gastado: 0, t: Date.now() }), actualizado: serverTimestamp() }), new Promise((_, no) => setTimeout(() => no(new Error("lento")), 8000))]);
    return true;
  } catch (e) { console.warn("borrar historial (nube):", e.code || e.message); return false; }
}

// ----- ⚙️ Ajustes (13.8): solo desde la pantalla de inicio. Orden: 🗑️ Borrar historial (solo pruebas) · 🌙/☀️ Madera · 💾 Copia de seguridad · Cerrar -----
// (Todavía sin «📲 Instalar solo este juego»: es opcional por juego, 13.9, y Billar aún no tiene su manifest ni su sw propio.)
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
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
  addEventListener("keydown", tecla, true);
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
        decir("Se borran las estrellas, las monedas y la dificultad elegida (en este dispositivo y en tu cuenta). Es solo para pruebas.");
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

  // 🌙/☀️ Madera clara u oscura (compartido/fondo-madera.js; el botón flotante está oculto con data-madera-boton="oculto")
  const oscura = () => document.documentElement.classList.contains("oscura");
  const madera = boton(oscura() ? "☀️" : "🌙", oscura() ? "Madera clara" : "Madera oscura", "b-oro", async () => {
    try { (await import("../compartido/fondo-madera.js")).alternarMadera(); } catch (e) { decir("No se pudo cambiar la madera."); return; }
    madera.firstChild.textContent = oscura() ? "☀️" : "🌙";
    madera.lastChild.textContent = oscura() ? "Madera clara" : "Madera oscura";
  });

  // 💾 Copia de seguridad (compartido/almacen.js): entran solas las claves que terminan en _v1 (billar_progreso_v1 y billar_libre_v1)
  boton("💾", "Copia de seguridad", "b-azul", () => {
    cerrar();
    import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => avisar("No se pudo abrir la copia de seguridad."));
  });

  const cerrarB = boton("", "Cerrar", "b-cielo", () => cerrar());
  cerrarB.firstChild.remove();
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}
$("btn-inicio-ajustes").addEventListener("click", abrirAjustes);

// ----- Sesión (chip de arriba a la derecha) y nube: opcionales, el juego funciona igual sin Firebase ni internet -----
import("../compartido/jugador.js")
  .then(({ alCambiarSesion }) => alCambiarSesion((u) => { $("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"; }))
  .catch(() => {});

// Sincronización con la cuenta: gana la mejor marca de estrellas por nivel y el mayor «gastado» (economia-billar.js → fusionar)
let nube = null;
import("../compartido/progreso.js")
  .then((m) => {
    nube = m.conectar(ID, {
      clave: eco.CLAVE_PROGRESO,
      fusionar: (a, b) => (reiniciando ? null : eco.fusionar(a, b)),   // se está borrando todo: no se une nada
      alCambiar: () => { pintarMonedas(); mapa.refrescar(); },
    });
  })
  .catch(() => {});

pintarMonedas();
mostrar("pantalla-inicio");   // única vez que se ve: al abrir el juego
