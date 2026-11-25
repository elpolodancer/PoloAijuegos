// Ruta: explotacolores/juego-explotacolores.js
// «Explota colores» (id de puntos: explotacolores). Toca un grupo de 3 o más bloques del mismo color y se quita al instante;
// los de arriba caen y llegan bloques nuevos, también muy rápido. Ronda de 60 s (empieza con tu primer toque).
//
// INICIO CON MAPA (estándar «estilo Deslizante», ESTANDARES-juegos.md, sección 13): al abrir se ve UNA vez la pantalla de inicio
// (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes); de ahí en adelante el menú principal es el MAPA de países (195 × 20 = 3 900 niveles).
// Los niveles TODAVÍA NO EXISTEN: el mapa funciona completo y cada nivel muestra 🚧 (ver NIVELES_CREADOS y jugarNivel).
import { COLUMNAS, FILAS, MIN_GRUPO, DIFICULTADES, crearTablero, grupoEn, tamanosJugables, puntosGrupo, quitarGrupo } from "./logica-explotacolores.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { leerCola, guardarCola } from "../compartido/cola-puntos.js";

const ID = "explotacolores", CLAVE = "explotacolores_progreso_v1", CLAVE_LIBRE = "explotacolores_libre_v1", SEGUNDOS = 60;
const MOSTRAR_BORRAR_HISTORIAL = true;          // BOTÓN TEMPORAL DE PRUEBAS en ⚙️ Ajustes. Debe quedar en false antes de pasar el juego a la zona «Juegos»
const NIVELES_CREADOS = 0;                       // cuántos niveles existen (el nivel N existe si N <= NIVELES_CREADOS). Súbelo cuando se generen los niveles
const GRAVEDAD = 170, V_MAX = 45;               // filas/s² y filas/s: una columna entera cae en ~0,4 s
const COLORES = ["#ef4b4b", "#3b82f6", "#3fcf4a", "#ffd23f", "#a855f7", "#ff8a2a", "#22d3ee"];
const FORMAS = ["●", "▲", "■", "◆", "★", "♥", "✚"]; // además del color, cada color tiene su figura (ayuda si no distingues colores)

const ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900 (estándar A-bis)
const TOTAL = ETAPAS.total;
const $ = (id) => document.getElementById(id);
const lienzo = $("tablero"), ctx = lienzo.getContext("2d");

// Estado. pantalla: "pantalla-inicio" | "pantalla-libre" | "juego" | "mapa".  fase (solo en «juego»): "juego" | "fin".  modo: "libre" | "nivel".
let pantalla = "pantalla-inicio", fase = "juego", modo = "libre";
let dif = DIFICULTADES[2], t = null, jug = null, puntos = 0, restante = SEGUNDOS, empezo = false, pausado = false;
let pops = [], geo = { cel: 20, w: 0, h: 0 };
let reiniciando = false;                          // true mientras se borra el historial: la sincronización no vuelve a traer lo borrado

// ----- Progreso local primero: { m: { "<colores>": mejor puntaje }, hechos: nivel más alto pasado (0 = ninguno), t } -----
// «hechos» es UN solo número (los niveles se abren en orden). Lo guardado antes de agregar el mapa no lo traía: se lee como 0.
const obj = (x) => (x && typeof x === "object" ? x : {});
function limpiar(p) {
  if (!p || typeof p !== "object") return null;
  const m = {};
  for (const k in obj(p.m)) { const v = Math.floor(Number(p.m[k])); if (v > 0) m[k] = v; }
  return { m, hechos: Math.max(0, Math.min(TOTAL, Math.floor(Number(p.hechos)) || 0)), t: Number(p.t) || 0 };
}
let prog = { m: {}, hechos: 0, t: 0 }, nube = null;
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
function guardarProg() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
const hechoMax = () => prog.hechos;               // nivel más alto pasado (0 = ninguno)
const mejorDe = (colores) => Number(prog.m[colores]) || 0;
function guardarRecord(colores, p) {
  if (p <= mejorDe(colores)) return false;
  prog.m[colores] = p;
  guardarProg();
  return true;
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => {
      if (reiniciando) return null;               // se está borrando todo: no se une nada
      a = limpiar(a); b = limpiar(b);
      if (!a && !b) return null;
      return { m: m.unirMaximos(a && a.m, b && b.m) || {}, hechos: Math.max(a ? a.hechos : 0, b ? b.hechos : 0), t: Math.max(a ? a.t : 0, b ? b.t : 0) };
    },
    alCambiar: (v) => {                           // la nube trajo algo nuevo: se redibuja lo que esté a la vista
      prog = limpiar(v) || prog;
      mapa.refrescar();
      if (pantalla === "pantalla-libre") pintarLibre();
      if (pantalla === "juego") chips();
    },
  });
  nube.guardado();                                // sube lo que ya hubiera en el dispositivo
}).catch(() => {});

// ----- Sesión (13.3: chip arriba a la derecha; sin Firebase no pasa nada) -----
let haySesion = false, jugadorMod = null;
import("../compartido/jugador.js").then((j) => {
  jugadorMod = j;
  j.alCambiarSesion((u) => {
    haySesion = !!u;
    $("sesion").textContent = u ? (u.displayName || "Jugador") : "👤 Iniciar sesión";
    $("sesion").classList.toggle("tocable", !u);
  });
}).catch(() => { $("sesion").textContent = "Sin sesión"; });
$("sesion").addEventListener("click", async () => {
  if (haySesion) return;
  if (!jugadorMod) { aviso("Sin conexión: no se puede iniciar sesión ahora"); return; }
  try { await jugadorMod.entrar(); } catch (e) { aviso("No se pudo iniciar sesión. Revisa tu conexión."); }
});

function aviso(texto) {
  const a = $("aviso"); a.textContent = texto; a.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => (a.hidden = true), 2400);
}

// ----- Instalar SOLO este juego (manifest-explotacolores.webmanifest + sw-explotacolores.js; no baja ningún otro juego del portal) -----
// ES_APP_SOLA = abierto desde SU PROPIO ícono instalado (start_url trae «?app=1»; se recuerda en sessionStorage por si se recarga). Ahí el portal no existe:
// se oculta 🎮 (llevaría fuera del alcance de la app). Abierto dentro de la app del portal o en el navegador, todo sigue como siempre.
const ES_APP_SOLA = (() => {
  try { if (new URLSearchParams(location.search).has("app")) sessionStorage.setItem("explotacolores_app", "1"); } catch (e) {}
  let marca = false; try { marca = sessionStorage.getItem("explotacolores_app") === "1"; } catch (e) {}
  return marca && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true);
})();
if (ES_APP_SOLA) $("btn-portal").hidden = true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-explotacolores.js", { scope: "./" }).catch(() => {});

const yaEnApp = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
let eventoInstalar = (window.__pwa && window.__pwa.evento) || null;
let notaInstalar = () => {};                      // la fija la ventana de Ajustes mientras está abierta (muestra el mensaje ahí dentro)
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; });
addEventListener("appinstalled", () => { eventoInstalar = null; notaInstalar("✅ Listo: busca «Explota colores» en tu pantalla de inicio."); });
async function instalarJuego() {
  if (eventoInstalar) { const e = eventoInstalar; eventoInstalar = null; e.prompt(); await e.userChoice.catch(() => {}); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
  notaInstalar(ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
    : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
    : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.");
}

// ----- Mapa de niveles (13.4): se ve solo el país donde vas; 🗺️ Mapa = el mundo con los países abiertos -----
let mapaEnPrincipal = true;
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,
  columnas: 4,                                    // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },
  progreso: () => { const h = hechoMax(); return { hecho: h, max: Math.min(TOTAL, h + 1) }; },
  jugarNivel: (n) => jugarNivel(n - 1),
  infoNivel: (n) => (n > NIVELES_CREADOS ? { sub: "🚧", aria: "todavía no está creado" } : { sub: "", aria: "" }),   // cuando haya niveles: mejor puntaje, estrellas…
});
// n = nivel cuya etapa se abre (por defecto, el que toca); alcanzado = true abre la vista principal de su país (se ve subir el agua)
function abrirMapa(n, alcanzado) { mostrar("mapa"); mapa.abrir(n || Math.min(TOTAL, hechoMax() + 1), alcanzado); pintarBotonMenu(); }

// ----- Pantallas y botón ☰ (13.3) -----
function pintarBotonMenu() {
  const b = $("btn-menu");
  const enMapa = pantalla === "mapa";
  b.hidden = pantalla === "pantalla-inicio" || (enMapa && mapa.esPrincipal());   // ni en el inicio ni en la vista principal del mapa
  const texto = enMapa ? "Atrás" : pantalla === "juego" && modo === "libre" && fase === "juego" ? "Pausa" : "Volver al menú principal";
  b.title = texto; b.setAttribute("aria-label", texto);
}
function mostrar(nombre) {                        // nombre: "pantalla-inicio" | "pantalla-libre" | "juego" | "mapa" | "inicio" (= abrir el mapa)
  if (nombre === "inicio") { abrirMapa(); return; }
  pantalla = nombre;
  for (const p of ["pantalla-inicio", "pantalla-libre"]) $(p).hidden = p !== nombre;
  const juego = nombre === "juego";
  lienzo.hidden = !juego; $("barra-nivel").hidden = !juego; $("cuadros").hidden = !juego; $("fin").hidden = true;
  if (nombre !== "mapa") mapa.cerrar();
  pintarBotonMenu();
  if (nombre === "pantalla-libre") pintarLibre();
  if (juego) acomodar();
}

$("btn-menu").addEventListener("click", () => {
  if (pantalla === "mapa") { if (!mapa.esPrincipal()) mapa.principal(); }                       // «Atrás» dentro del mapa
  else if (pantalla === "juego" && fase === "juego") (modo === "libre" ? pausaLibre : pausaSalir).abrir();
  else mostrar("inicio");                                                                        // Modo libre, resultado: al mapa
});
$("btn-inicio-jugar").addEventListener("click", () => { if (hechoMax() === 0) abrirMapa(1); else jugarNivel(Math.min(TOTAL, hechoMax() + 1) - 1); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", () => abrirAjustes());

// ----- Modo libre (13.7): 5 dificultades estándar (= número de colores) -----
let libreDif = 2;                                  // índice de DIFICULTADES (Normal)
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g && DIFICULTADES[g.d]) libreDif = g.d; } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif })); } catch (e) {} };

function pintarLibre() {
  const fila = $("dif-fila");
  fila.replaceChildren();
  DIFICULTADES.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (i === libreDif ? "b-oro on" : "b-cielo");
    b.innerHTML = '<span class="b-ico">' + d.emoji + "</span>";
    b.title = d.nombre; b.setAttribute("aria-label", d.nombre); b.setAttribute("aria-pressed", String(i === libreDif));
    b.addEventListener("click", () => { libreDif = i; guardarLibre(); pintarLibre(); });
    fila.appendChild(b);
  });
  const d = DIFICULTADES[libreDif];
  $("dif-nombre").textContent = d.emoji + " " + d.nombre + " · " + d.nota;
  $("libre-nota").textContent = "Rondas de " + SEGUNDOS + " s que empiezan con tu primer toque. Aquí no hay monedas ni puntos al perfil: solo se guarda tu récord.";
  const r = mejorDe(d.colores);
  $("libre-record").textContent = r ? "🏆 Récord " + d.emoji + ": " + r.toLocaleString("es") : "🏆 Aún sin récord en esta dificultad";
}
$("btn-libre-jugar").addEventListener("click", () => iniciar(DIFICULTADES[libreDif]));
$("b-otra").addEventListener("click", () => iniciar(dif));
$("b-cambiar").addEventListener("click", () => mostrar("pantalla-libre"));

function iniciar(d) {                              // arranca una ronda de Modo libre
  dif = d; libreDif = DIFICULTADES.indexOf(d); guardarLibre();
  modo = "libre"; fase = "juego";
  t = crearTablero(d.colores); jug = tamanosJugables(t);
  puntos = 0; restante = SEGUNDOS; empezo = false; pausado = false; pops = [];
  $("nombre-nivel").textContent = "♾️ Modo libre " + d.emoji;
  $("barra-juego").title = "Pausa";
  $("btn-mapa-juego").hidden = true;               // el 🗺️ solo en los niveles
  mostrar("juego"); chips();
}

// Los niveles todavía no existen. Cuando existan: modo = "nivel"; fase = "juego"; armar el tablero del nivel; poner su nombre en #nombre-nivel y mostrar el 🗺️ (13.6).
function jugarNivel(i) {
  if (!(i >= 0 && i < TOTAL) || i > hechoMax()) return;
  if (i + 1 > NIVELES_CREADOS) { aviso("🚧 Los niveles todavía no están creados"); return; }
}

// ----- Pausas (13.6 y 13.7): el cronómetro y los toques se detienen mientras la ventana está abierta -----
const alAbrir = () => { pausado = true; }, alContinuar = () => { pausado = false; };
const pausaLibre = crearMenuPausa({
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: "Se pierde el puntaje de esta ronda.",
  puedeAbrir: () => pantalla === "juego" && modo === "libre" && fase === "juego",
  alAbrir, alContinuar,
  alSalir: () => { pausado = false; mostrar("pantalla-libre"); },
});
const pausaSalir = crearMenuPausa({                // «¿Salir?» de un nivel (se usará cuando existan los niveles)
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este nivel.",
  puedeAbrir: () => pantalla === "juego" && modo === "nivel" && fase === "juego",
  alAbrir, alContinuar,
  alSalir: () => { pausado = false; mostrar("inicio"); },
});
$("barra-juego").addEventListener("click", () => (modo === "libre" ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir());

// ----- Tamaño y posición: el tablero es 10×15, va centrado y no pisa la barra, los cuadros ni los botones fijos -----
function acomodar() {
  const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
  const bajo = matchMedia("(orientation: landscape) and (max-height: 560px)").matches;   // celular horizontal: barra y cuadros pasan a una columna a la izquierda (inmersivo.css)
  const izq = bajo ? 250 : 8;                       // espacio que se reserva a cada lado para que el tablero siga centrado
  const arriba = bajo ? 8 : Math.ceil($("cuadros").getBoundingClientRect().bottom) + 8;
  const abajo = bajo ? 8 : 64;                      // 🌙 y ⛶ de abajo
  const cel = Math.max(14, Math.floor(Math.min((W - 2 * izq) / COLUMNAS, (H - arriba - abajo) / FILAS)));
  const w = cel * COLUMNAS, h = cel * FILAS;
  const x = Math.round((W - w) / 2), y = Math.round(arriba + Math.max(0, (H - arriba - abajo - h) / 2));
  Object.assign(lienzo.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  geo = { cel, w, h };
  Object.assign($("fin").style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
}
addEventListener("resize", () => { if (pantalla === "juego") acomodar(); });

function chips() {
  $("c-puntos").textContent = puntos.toLocaleString("es");
  $("c-tiempo").textContent = Math.max(0, Math.ceil(restante)) + " s";
  const r = mejorDe(dif.colores);
  $("c-record").textContent = r ? r.toLocaleString("es") : "–";
}

// ----- Toque: responde al instante, sin esperar a que termine ninguna caída -----
lienzo.addEventListener("pointerdown", (e) => {
  if (pantalla !== "juego" || fase !== "juego" || pausado || restante <= 0) return;
  e.preventDefault();
  const b = lienzo.getBoundingClientRect(), cel = geo.cel;
  const c = Math.floor((e.clientX - b.left) / cel), py = (e.clientY - b.top) / cel;
  if (c < 0 || c >= COLUMNAS) return;
  let r = -1; // el bloque que SE VE bajo el dedo (aunque todavía esté cayendo)
  for (let i = 0; i < FILAS; i++) { const y = t[i][c].y; if (py >= y && py < y + 1) { r = i; break; } }
  if (r < 0) return;
  const g = grupoEn(t, r, c);
  if (g.length < MIN_GRUPO) { pops.push({ x: (c + .5) * cel, y: py * cel, t: 0, txt: "✖", mal: true }); return; }
  empezo = true;
  const p = puntosGrupo(g.length);
  puntos += p;
  pops.push({ x: (c + .5) * cel, y: py * cel, t: 0, txt: "+" + p });
  quitarGrupo(t, g, dif.colores);
  jug = tamanosJugables(t);
  chips();
});

function terminar() {
  fase = "fin";
  const nuevo = guardarRecord(dif.colores, puntos);
  $("fin-puntos").textContent = "⭐ " + puntos.toLocaleString("es");
  $("fin-record").textContent = nuevo ? "🏆 ¡Nuevo récord!" : "🏆 Tu récord: " + mejorDe(dif.colores).toLocaleString("es");
  $("fin").hidden = false;
  chips(); pintarBotonMenu();
}

// ----- Bucle: física de caída y dibujo -----
let previo = performance.now();
function cuadro(ahora) {
  const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
  if (pantalla === "juego" && t) {
    if (!pausado) {
      for (let r = FILAS - 1; r >= 0; r--) for (let c = 0; c < COLUMNAS; c++) {
        const k = t[r][c];
        if (k.y < r) { k.v = Math.min(V_MAX, k.v + GRAVEDAD * dt); k.y = Math.min(r, k.y + k.v * dt); if (k.y >= r) k.v = 0; }
      }
      for (const p of pops) p.t += dt;
      pops = pops.filter((p) => p.t < 0.7);
      if (fase === "juego" && empezo) { restante -= dt; chips(); if (restante <= 0) { restante = 0; terminar(); } }
    }
    dibujar();
  }
  requestAnimationFrame(cuadro);
}

function dibujar() {
  const { cel, w, h } = geo;
  ctx.clearRect(0, 0, w, h); // transparente: se ve la madera
  ctx.fillStyle = "rgba(25,14,6,.42)";
  ctx.beginPath(); ctx.roundRect(0, 0, w, h, 10); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold " + Math.floor(cel * 0.46) + "px system-ui, sans-serif";
  for (let r = 0; r < FILAS; r++) for (let c = 0; c < COLUMNAS; c++) {
    const k = t[r][c], x = c * cel, y = k.y * cel;
    if (y + cel < 0) continue;
    const ok = jug[r * COLUMNAS + c] > 0, m = cel * (ok ? 0.04 : 0.09);
    ctx.globalAlpha = ok ? 1 : 0.68;
    ctx.fillStyle = COLORES[k.c];
    ctx.beginPath(); ctx.roundRect(x + m, y + m, cel - 2 * m, cel - 2 * m, cel * 0.22); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.beginPath(); ctx.roundRect(x + m + 2, y + m + 2, cel - 2 * m - 4, (cel - 2 * m) * 0.38, cel * 0.16); ctx.fill();
    if (ok) { ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText(FORMAS[k.c], x + cel / 2, y + cel / 2 + 1);
  }
  ctx.globalAlpha = 1;
  for (const p of pops) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 0.7);
    ctx.font = "800 " + Math.floor(cel * 0.8) + "px system-ui, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.fillStyle = p.mal ? "#ff9a9a" : "#fff4c2";
    const y = p.y - p.t * cel * 3;
    ctx.strokeText(p.txt, p.x, y); ctx.fillText(p.txt, p.x, y);
  }
  ctx.restore();
}

// ----- BORRAR TODO EL HISTORIAL (temporal, para pruebas: ver MOSTRAR_BORRAR_HISTORIAL) -----
// Borra en este dispositivo el progreso, el Modo libre elegido y los puntos pendientes de este juego y, con sesión, deja vacío el progreso de la cuenta
// (si no, la sincronización lo volvería a traer). Devuelve true (también en la cuenta), false (no se pudo en la cuenta) o null (sin sesión).
async function borrarHistorial() {
  reiniciando = true;
  const vacio = { m: {}, hechos: 0, t: Date.now() };
  prog = { m: {}, hechos: 0, t: 0 };
  try { for (const k of [CLAVE, CLAVE_LIBRE]) localStorage.removeItem(k); } catch (e) {}
  try { guardarCola(leerCola().filter((e) => e.j !== ID)); } catch (e) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const ref = doc(db, "progreso", auth.currentUser.uid, "juegos", ID);
    await Promise.race([setDoc(ref, { datos: JSON.stringify(vacio), actualizado: serverTimestamp() }), new Promise((_, no) => setTimeout(() => no(new Error("lento")), 8000))]);
    return true;
  } catch (e) { console.warn("borrar historial (nube):", e.code || e.message); return false; }
}

// ----- ⚙️ Ajustes (13.8): borrar historial (solo pruebas), copia de seguridad y Cerrar -----
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
  const decir = (x) => { msg.textContent = x; msg.hidden = !x; };
  notaInstalar = decir;
  let ocupado = false;
  const tecla = (e) => { if (e.key === "Escape" && !ocupado) { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true); notaInstalar = () => {}; ajustesAbierto = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo && !ocupado) cerrar(); });
  const boton = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    if (icono) b.append(el("span", "b-ico", icono));
    b.append(el("span", "", texto));
    b.addEventListener("click", fn);
    lista.appendChild(b);
    return b;
  };
  if (!yaEnApp) boton("📲", "Instalar solo este juego", "b-azulmarino", instalarJuego);   // ya dentro de una app instalada no tiene sentido ofrecerlo
  if (MOSTRAR_BORRAR_HISTORIAL) {
    const TXT = "Borrar todo el historial y reiniciar";
    const borrar = boton("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) {                // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        decir("Se borran los récords y el avance del mapa (en este dispositivo y en tu cuenta). Es solo para pruebas.");
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
  boton("💾", "Copia de seguridad", "b-oro", () => { cerrar(); import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => aviso("No se pudo abrir la copia de seguridad.")); });
  boton("", "Cerrar", "b-cielo", () => cerrar());
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

mostrar("pantalla-inicio");   // única vez que se ve: al abrir el juego
requestAnimationFrame(cuadro);
