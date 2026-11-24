// Ruta: atasco/juego-atasco.js
// Atasco (id de puntos: «atasco»). INICIO CON MAPA (ESTANDARES-juegos.md, sección 13; referencia: 5deslizante/juego-5deslizante.js):
// pantalla de inicio (una sola vez) → el MAPA de países es el menú principal (195 países × 20 niveles = 3 900) · Modo libre (solo opciones) · ⚙️ Ajustes.
// La partida (tablero, carros, movimiento) todavía no existe: jugarNivel() e iniciarPartida() son los dos puntos donde se conectará.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { alternarMadera, maderaOscura } from "../compartido/fondo-madera.js";
import { ETAPAS_TOTAL, NIVELES_ETAPA } from "./logica-atasco.js";

const ID = "atasco";
const ETAPAS = crearEtapas({ porEtapa: NIVELES_ETAPA, soloPaises: true });   // 195 países (México primero) × 20 niveles
const TOTAL = ETAPAS.total;
if (TOTAL !== ETAPAS_TOTAL * NIVELES_ETAPA) console.warn("atasco: el mapa tiene " + TOTAL + " niveles y el plan de logica-atasco.js " + ETAPAS_TOTAL * NIVELES_ETAPA);
const $ = (id) => document.getElementById(id);

// ----- Progreso (local primero; se sincroniza con la cuenta si hay internet y sesión) -----
// { v: 1, hechos: NÚMERO = nivel más alto pasado (0 = ninguno) }. Los récords (mejores, libre) se agregan junto con la partida.
// La clave termina en _v1 para que entre en la copia de seguridad de compartido/almacen.js.
const CLAVE = ID + "_progreso_v1";
const limpiar = (p) => (p && typeof p === "object" ? { v: 1, hechos: Math.max(0, Math.min(TOTAL, Math.floor(Number(p.hechos)) || 0)) } : null);
let prog = { v: 1, hechos: 0 };
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
const hechoMax = () => prog.hechos;               // nivel más alto terminado (0 = ninguno)
const desbloqueado = (i) => i <= hechoMax();      // i = posición (0 = nivel 1): se abre el siguiente al último terminado

// ----- Aviso corto flotante (sin alert ni confirm) -----
let avisoT = 0;
function aviso(texto) {
  let a = $("aviso-flotante");
  if (!a) {
    a = document.createElement("div");
    a.id = "aviso-flotante";
    a.setAttribute("role", "status");
    a.style.cssText = "position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147481000;max-width:calc(100% - 32px);padding:10px 16px;border-radius:14px;background:#1e2025;color:#f1f2f4;border:1px solid #7c5cff;font:700 .9rem system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45)";
    document.body.appendChild(a);
  }
  a.textContent = texto; a.hidden = false;
  clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 2600);
}

// ----- Mapa (13.4): se ve el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles -----
let niveles = null;                               // niveles-atasco.js; no existe hasta que se genere datos-niveles-atasco.js (mientras tanto, el mapa muestra 🚧)
let mapa = null, mapaEnPrincipal = true;
mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,
  columnas: 4,                                    // 20 niveles por país: 4 columnas × 5 filas
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },
  progreso: () => { const h = hechoMax(); return { hecho: h, max: Math.min(TOTAL, h + 1) }; },
  jugarNivel: (n) => jugarNivel(n - 1),
  infoNivel: () => (niveles ? { sub: "", aria: "" } : { sub: "🚧", aria: "todavía no está creado" }),
});
import("./niveles-atasco.js").then((m) => { niveles = m; mapa.refrescar(); }).catch(() => {});
function abrirMapa(n) {
  $("pantalla-inicio").hidden = true; $("pantalla-libre").hidden = true;
  mapa.abrir(n || Math.min(TOTAL, hechoMax() + 1));
  pintarBotonMenu();
}

// ----- Pantallas y ☰ (13.1 y 13.3): «inicio» siempre significa «abrir el mapa» -----
function pintarBotonMenu() {
  const enMapa = mapa.abierto();
  const texto = enMapa ? "Atrás" : "Volver al menú principal";
  $("btn-menu").hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);   // oculto en el inicio y en la vista principal del mapa
  $("btn-menu").title = texto; $("btn-menu").setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  if (nombre === "inicio") { abrirMapa(); return; }
  for (const p of ["pantalla-inicio", "pantalla-libre"]) $(p).hidden = p !== nombre;
  mapa.cerrar();
  pintarBotonMenu();
  if (nombre === "pantalla-libre") pintarLibre();
}

// ----- Modo libre (7.2 y 13.7): Dificultad (5 emojis) y Tablero. La última elección se recuerda (clave _v1) -----
const DIFICULTADES = [
  { emoji: "😁", nombre: "Muy fácil",  nota: "Pocos carros y mucho espacio: la salida se ve casi libre." },
  { emoji: "😬", nombre: "Fácil",      nota: "Algunos carros estorban, pero se resuelve en pocos movimientos." },
  { emoji: "😐", nombre: "Normal",     nota: "Tablero más lleno: hay que planear el orden de los movimientos." },
  { emoji: "😡", nombre: "Difícil",    nota: "Muchos carros y cadenas de bloqueos: necesitas varios movimientos de preparación." },
  { emoji: "😈", nombre: "Demoníaco",  nota: "Tablero casi atascado: la solución más corta es larga y poco evidente." },
];
const TAMANOS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];   // tablero N×N (los niveles del mapa llegan a 10×10)
const CLAVE_LIBRE = "atasco_menu_v1";
function cargarLibre() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)) || {}, dif = Math.floor(Number(g.dif)), tam = Number(g.tam);
    return { dif: dif >= 0 && dif < DIFICULTADES.length ? dif : 1, tam: TAMANOS.includes(tam) ? tam : 6 };
  } catch (e) { return { dif: 1, tam: 6 }; }
}
let sel = cargarLibre();
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify(sel)); } catch (e) {} };
function pintarLibre() {
  const boton = (clase, html, titulo, activo, fn) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "b3d txt " + (activo ? "b-oro on" : "b-cielo"); b.innerHTML = html;
    b.title = titulo; b.setAttribute("aria-label", titulo); b.setAttribute("aria-pressed", String(activo));
    b.addEventListener("click", fn);
    return b;
  };
  $("dif-fila").replaceChildren(...DIFICULTADES.map((d, i) => boton("", '<span class="b-ico">' + d.emoji + "</span>", d.nombre, i === sel.dif, () => { sel.dif = i; guardarLibre(); pintarLibre(); })));
  $("tam-fila").replaceChildren(...TAMANOS.map((n) => boton("", n + "×" + n, "Tablero de " + n + " por " + n, n === sel.tam, () => { sel.tam = n; guardarLibre(); pintarLibre(); })));
  const d = DIFICULTADES[sel.dif];
  $("dif-nombre").textContent = d.emoji + " " + d.nombre;
  $("nota-libre").textContent = d.nota + " Ganar aquí no da monedas ni puntos al perfil: solo guarda tu mejor marca.";
  $("libre-record").textContent = "🏆 Aún sin resolver en esta combinación";   // los récords llegan con la partida
}

// ----- Puntos de enlace con la partida (por hacer) -----
function iniciarPartida({ dif, tam }) { aviso("🚧 Aquí empezará la partida " + tam + "×" + tam + " (" + DIFICULTADES[dif].nombre + "): el tablero aún no está hecho."); }
function jugarNivel(i) {
  if (!(i >= 0 && i < TOTAL) || !desbloqueado(i)) return;
  aviso(niveles ? "🚧 La partida todavía no está hecha." : "🚧 Los niveles todavía no están creados.");
}

// ----- Instalar SOLO este juego (manifest-atasco.webmanifest + sw-atasco.js; no baja ningún otro juego del portal) -----
// ES_APP_SOLA = abierto desde SU PROPIO ícono instalado (start_url trae «?app=1»; se recuerda en sessionStorage por si se recarga). Ahí el portal no existe:
// se oculta 🎮 (llevaría fuera del alcance de la app) y el chip de sesión pasa a ser «👤 Iniciar sesión» (sin portal no habría dónde entrar con Google).
const enModoApp = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
const ES_APP_SOLA = (() => {
  try { if (new URLSearchParams(location.search).has("app")) sessionStorage.setItem("atasco_app", "1"); } catch (e) {}
  let marca = false; try { marca = sessionStorage.getItem("atasco_app") === "1"; } catch (e) {}
  return marca && enModoApp();
})();
if (ES_APP_SOLA) $("btn-portal").hidden = true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-atasco.js", { scope: "./" }).catch(() => {});
let eventoInstalar = (window.__pwa && window.__pwa.evento) || null;
let notaInstalar = () => {};                      // la fija la ventana de Ajustes mientras está abierta
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; });
addEventListener("appinstalled", () => { eventoInstalar = null; notaInstalar("✅ Listo: busca «Atasco» en tu pantalla de inicio."); });
async function instalarJuego() {
  if (eventoInstalar) { const e = eventoInstalar; eventoInstalar = null; e.prompt(); await e.userChoice.catch(() => {}); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
  notaInstalar(ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
    : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
    : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.");
}

// ----- ⚙️ Ajustes (13.8): instalar solo este juego, madera clara/oscura y copia de seguridad. «Borrar historial» se agrega cuando exista la partida -----
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Ajustes");
  const panel = el("div", "pausa-panel aj-panel"), lista = el("div", "pausa-opciones");
  const nota = el("p", "aj-nota"); nota.setAttribute("role", "status"); nota.hidden = true;
  notaInstalar = (t) => { nota.textContent = t; nota.hidden = !t; };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true); notaInstalar = () => {}; ajustesAbierto = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  const boton = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    b.append(el("span", "b-ico", icono), el("span", "", texto));
    b.addEventListener("click", fn); lista.appendChild(b);
    return b;
  };
  if (!enModoApp()) boton("📲", "Instalar solo este juego", "b-azulmarino", instalarJuego);   // ya dentro de una app instalada no tiene sentido ofrecerlo
  const rotular = (b) => { b.firstChild.textContent = maderaOscura() ? "☀️" : "🌙"; b.lastChild.textContent = maderaOscura() ? "Madera clara" : "Madera oscura"; };
  const madera = boton("", "", "b-oro", () => { alternarMadera(); rotular(madera); });
  rotular(madera);
  boton("💾", "Copia de seguridad", "b-azul", () => { cerrar(); import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => aviso("No se pudo abrir la copia de seguridad.")); });
  const cerrarB = boton("", "Cerrar", "b-cielo", cerrar);
  cerrarB.firstChild.remove();
  panel.append(el("h2", "", "⚙️ Ajustes"), nota, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

// ----- Botones y teclado -----
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-jugar").addEventListener("click", () => { if (hechoMax() === 0) abrirMapa(1); else jugarNivel(Math.min(TOTAL, hechoMax() + 1) - 1); });   // sin niveles pasados: abre el mapa en el nivel 1
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", abrirAjustes);
$("btn-libre-jugar").addEventListener("click", () => iniciarPartida(sel));
$("btn-menu").addEventListener("click", () => { if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal(); else mostrar("inicio"); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("pantalla-libre").hidden && !ajustesAbierto) mostrar("inicio"); });   // dentro del mapa, Esc lo maneja el propio mapa

mostrar("pantalla-inicio");   // única vez que se ve: al abrir el juego

// ----- Sesión y nube (opcionales: si Firebase no carga, el juego igual funciona) -----
let haySesion = false;
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => {
    haySesion = !!u;
    $("sesion").textContent = u ? (u.displayName || "Jugador") : ES_APP_SOLA ? "👤 Iniciar sesión" : "Sin sesión";
    $("sesion").classList.toggle("tocable", ES_APP_SOLA && !u);
  })
).catch(() => {});
$("sesion").addEventListener("click", async () => {   // solo en la app instalada sola: sin portal no habría dónde iniciar sesión
  if (!ES_APP_SOLA || haySesion) return;
  try { await (await import("../compartido/jugador.js")).entrar(); } catch (e) { aviso("No se pudo iniciar sesión. Revisa tu conexión."); }
});
import("../compartido/progreso.js").then((m) => {
  const nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => { a = limpiar(a); b = limpiar(b); return !a && !b ? null : { v: 1, hechos: Math.max(a ? a.hechos : 0, b ? b.hechos : 0) }; },   // un nivel pasado en cualquier sitio cuenta como pasado
    alCambiar: (v) => { prog = limpiar(v) || prog; mapa.refrescar(); },                                    // llegó progreso de la cuenta: el mapa se redibuja
  });
  nube.guardado();
}).catch(() => {});
