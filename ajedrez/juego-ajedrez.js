// PROYECTO: Portal Juegos · Ruta: ajedrez/juego-ajedrez.js
// Inicio estándar (ESTANDARES-juegos.md, secciones 6, 7 y 9): el juego abre ya cargado en el nivel donde va el jugador, tapado por la capa «Comenzar».
// ♾️ Modo libre y 📋 Niveles se abren desde ☰ Pausa. No hay pantalla de menú principal.
import { INICIO, desdeFEN, legales, hacer, deshacer, enJaque, estadoPartida, clave } from "./logica-ajedrez.js";
import { mejorJugada } from "./ia-ajedrez.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { ETAPAS, CLAVE_MAPA, leerMapa, superarNivel, fusionarMapa, datosNivel } from "./niveles-ajedrez.js";

// ===== AJUSTES =====
const ID = "ajedrez";
// prof = profundidad máxima, tiempo = ms máximos por jugada (se juega con lo que alcance a calcular),
// azar = probabilidad de jugar al azar, ruido = variación de la evaluación, puntos = premio al ganar por primera vez
const NIVELES = [
  { nombre: "Principiante", icono: "🐣", desc: "Se despista mucho: ideal para aprender.",        prof: 1, tiempo: 300,  azar: 0.45, ruido: 100, puntos: 10 },
  { nombre: "Novato",       icono: "🐥", desc: "Ya ve algunas capturas, pero falla bastante.",    prof: 1, tiempo: 300,  azar: 0.25, ruido: 60,  puntos: 15 },
  { nombre: "Aficionado",   icono: "🙂", desc: "Ve capturas simples, pero comete errores.",       prof: 2, tiempo: 600,  azar: 0.12, ruido: 40,  puntos: 20 },
  { nombre: "Avanzado",     icono: "🦉", desc: "Juega con táctica y casi no regala nada.",        prof: 4, tiempo: 1800, azar: 0,    ruido: 5,   puntos: 60 },
  { nombre: "Maestro",      icono: "👑", desc: "El más fuerte: puede tardar unos segundos.",      prof: 8, tiempo: 3000, azar: 0,    ruido: 0,   puntos: 100 },
];
// Al abrir el juego (solo en el Ajedrez, por decisión de Polo) se ve una partida de Modo libre contra este nivel, no el nivel del mapa
const NIVEL_INICIO = 2;
const TAM_MAX = 84;        // tamaño máximo de casilla (px)
// El estándar (7.2) dice que el Modo libre NO da puntos de perfil. El Ajedrez siempre los dio (⭐ y puntos la primera vez que se vence
// cada dificultad) y la gente ya tiene ese progreso, así que se conserva. Poner false para cumplir el estándar al pie de la letra.
const PUNTOS_LIBRE = true;
// ===================

const GLIFO = { 1: "♟", 2: "♞", 3: "♝", 4: "♜", 5: "♛", 6: "♚" };
const NOMBRE = { 1: "peón", 2: "caballo", 3: "alfil", 4: "torre", 5: "dama", 6: "rey" };
const FIN = {
  ahogado: "Tablas: rey ahogado.", 50: "Tablas por la regla de las 50 jugadas.",
  material: "Tablas: no hay material para dar mate.", repeticion: "Tablas por repetición de posición.",
};
const AYUDA = "Toca una pieza tuya y luego la casilla a donde quieres moverla (los puntos marcan las jugadas posibles). ↩ deshace tu última jugada y 🔄 empieza otra. " +
  "Los niveles del mapa son ejercicios y partidas; ♾️ Modo libre es ajedrez completo contra la computadora en 5 dificultades.";

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("es-MX");
const DEV = new URLSearchParams(location.search).has("dev"); // ?dev=1 → botón para superar niveles sin contenido y ver subir el agua
const tab = $("tablero"), zonaJuego = document.querySelector(".aj"), btnMenu = $("btn-menu");

const nivelGuardado = () => Math.min(NIVELES.length, Math.max(1, +localStorage.getItem(ID + ":nivel") || 1));
let nivel = nivelGuardado(); // dificultad con la que se juega ahora (la del Modo libre; el inicio usa NIVEL_INICIO sin guardarla)
let jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
let est, pila, claves, legs, sel, ult, fin, msgFin, resultado, pensando, partida = 0, nube = null, nubeMapa = null, nivelN = 0, nivelD = null, fotos = [];
let pantalla = "juego";   // "juego" | "libre" (Modo libre) | "niveles" (mapa)
let esperando = true;     // true = capa «Comenzar» puesta: el juego no responde ni corre
let enLibre = false;      // true = se está jugando una partida que se empezó desde la pantalla de Modo libre
let pausada = false, retraso = false;

const ganados = () => { try { return JSON.parse(localStorage.getItem(ID + ":ganados")) || {}; } catch (e) { return {}; } };

// ----- Tablero (64 botones, se crean una vez) -----
const celdas = [];
for (let d = 0; d < 64; d++) {
  const b = document.createElement("button");
  b.type = "button";
  b.setAttribute("role", "gridcell");
  tab.appendChild(b);
  celdas.push(b);
}
tab.addEventListener("click", (e) => {
  const b = e.target.closest(".cas");
  if (b) tocarCasilla(+b.dataset.sq);
});

const horizontal = matchMedia("(min-aspect-ratio: 23/20)"); // mismo punto de corte que el CSS
function ajustarTam() {
  const h = horizontal.matches;
  const ancho = h ? innerWidth - 520 : innerWidth - 20;
  const alto = h ? innerHeight - 72 : innerHeight - 340;
  const t = Math.max(30, Math.floor(Math.min(ancho, alto, TAM_MAX * 8) / 8));
  tab.style.setProperty("--t", t + "px");
}
addEventListener("resize", () => { ajustarTam(); colocarFin(); });

// ----- Dibujo -----
function render() {
  const flip = jugador === -1;
  const reyJaque = enJaque(est, est.turno) ? est.rey[est.turno === 1 ? 0 : 1] : -1;
  const dest = new Set(), caps = new Set();
  if (sel !== null) legs.filter((m) => m.de === sel).forEach((m) => { dest.add(m.a); if (est.b[m.a] || m.ep) caps.add(m.a); });
  for (let d = 0; d < 64; d++) {
    const sq = flip ? 63 - d : d, p = est.b[sq], f = sq >> 3, c = sq & 7, b = celdas[d];
    let cls = "cas " + ((f + c) % 2 ? "osc" : "cla");
    if (ult && (sq === ult.de || sq === ult.a)) cls += " ult";
    if (sq === sel) cls += " sel";
    if (sq === reyJaque) cls += " jaque";
    if (dest.has(sq)) cls += caps.has(sq) ? " dest cap" : " dest";
    b.className = cls;
    b.dataset.sq = sq;
    const nom = "abcdefgh"[c] + (8 - f);
    b.setAttribute("aria-label", nom + (p ? ", " + NOMBRE[Math.abs(p)] + (p > 0 ? " blanco" : " negro") : ""));
    b.innerHTML =
      (d % 8 === 0 ? `<span class="co r">${8 - f}</span>` : "") +
      (d >= 56 ? `<span class="co f">${"abcdefgh"[c]}</span>` : "") +
      (p ? `<span class="p ${p > 0 ? "bl" : "ng"}">${GLIFO[Math.abs(p)]}\uFE0E</span>` : "");
  }
  let txt;
  if (fin) txt = msgFin;
  else if (nivelD && nivelD.tuto) txt = "🎯 " + nivelD.obj;
  else if (pensando) txt = "Pensando…";
  else txt = "Tu turno" + (enJaque(est, est.turno) ? ": ¡jaque!" : "");
  $("estado").textContent = txt;
  $("desc").textContent = nivelD ? nivelD.titulo + ": " + nivelD.txt : NIVELES[nivel - 1].nombre + ": " + NIVELES[nivel - 1].desc;
  const rot = nivelD ? "Reiniciar nivel" : "Nueva partida";
  $("bNueva").title = rot; $("bNueva").setAttribute("aria-label", rot);
}

// ----- Ventanas de aviso / Info / confirmar (estilo .pausa-*; confirm() del navegador saca de la pantalla completa) -----
// textos: { si, no, titulo }; con no = null solo queda un botón (aviso)
function preguntar(texto, siFn, { si = "Sí", no = "No", titulo = "" } = {}) {
  $("dialogo-tit").textContent = titulo; $("dialogo-tit").hidden = !titulo;
  $("dialogo-txt").textContent = texto;
  $("dialogo-si").textContent = si;
  $("dialogo-no").textContent = no || ""; $("dialogo-no").hidden = !no;
  $("dialogo").hidden = false;
  $("dialogo-si").onclick = () => { $("dialogo").hidden = true; if (siFn) siFn(); };
  $("dialogo-no").onclick = () => { $("dialogo").hidden = true; };
  try { $("dialogo-si").focus({ preventScroll: true }); } catch (e) {}
}
const infoJuego = () => preguntar(nivelD && nivelD.tuto ? nivelD.titulo + ": " + nivelD.txt + " " + AYUDA : AYUDA, null, { si: "Entendido", no: null, titulo: "ℹ️ Cómo se juega" });

// Cambiar de partida pide confirmar si hay una en curso
function cambiar(fn) {
  if ((pila.length || fotos.length) && !fin) return preguntar("Esto empieza otra vez. ¿Seguro?", () => { fn(); nueva(); });
  fn();
  nueva();
}

// ----- Partida -----
function nueva() {
  partida++;
  est = desdeFEN(nivelD && nivelD.tuto ? nivelD.fen : INICIO);
  fotos = []; pila = []; claves = [clave(est)]; sel = null; ult = null; fin = false; msgFin = ""; resultado = ""; pensando = false; retraso = false;
  $("promo").hidden = true;
  $("fin").hidden = true;
  legs = nivelD && nivelD.tuto ? tutoLegales() : legales(est);
  ajustarTam();
  render();
  if (!esperando && est.turno !== jugador) pensar(); // con la capa puesta la computadora no mueve: arranca al tocar «Comenzar»
}

// Reanuda lo que quedó esperando (la jugada de la computadora) cuando el juego vuelve a correr
function arrancar() {
  if (retraso) { retraso = false; pensar(); }
  else if (!fin && !pensando && est.turno !== jugador) pensar();
}

function jugar(m) {
  if (nivelD && nivelD.tuto) return jugarTuto(m);
  pila.push(hacer(est, m));
  claves.push(clave(est));
  ult = m; sel = null;
  $("promo").hidden = true;
  legs = legales(est);
  const r = estadoPartida(est, legs, claves);
  if (r) terminar(r);
  render();
  if (fin) mostrarFin();
  else if (est.turno !== jugador) pensar();
}

function pensar() {
  pensando = true;
  render();
  const id = partida;
  setTimeout(() => {
    if (id !== partida) return;
    if (pausada || esperando) { retraso = true; return; } // se pausó mientras «pensaba»: sigue al continuar
    const m = mejorJugada(est, NIVELES[(nivelD ? nivelD.ia : nivel) - 1]);
    pensando = false;
    if (m) jugar(m);
  }, 80);
}

function terminar(r) {
  fin = true;
  if (r.fin === "mate") {
    if (r.ganador === jugador) { resultado = "gana"; msgFin = "¡Jaque mate! Ganaste."; if (nivelD) superado(); else premio(); }
    else { resultado = "pierde"; msgFin = "Jaque mate. Gana la computadora."; }
  } else { resultado = "tablas"; msgFin = FIN[r.fin]; }
}

async function premio() {
  if (!PUNTOS_LIBRE) return;
  const g = ganados(), n = NIVELES[nivel - 1];
  if (g[nivel]) { msgFin += " (ya habías vencido esta dificultad)"; return; }
  g[nivel] = true;
  localStorage.setItem(ID + ":ganados", JSON.stringify(g));
  if (nube) nube.guardado();
  msgFin += " +" + n.puntos + " pts";
  encolarPuntos(ID, n.puntos); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
}

function tocarCasilla(sq) {
  if (esperando || pausada || fin || pensando || est.turno !== jugador) return;
  if (sel !== null) {
    const ms = legs.filter((m) => m.de === sel && m.a === sq);
    if (ms.length === 1) return jugar(ms[0]);
    if (ms.length > 1) return pedirCoronacion(ms);
  }
  $("promo").hidden = true;
  sel = est.b[sq] * jugador > 0 && sq !== sel ? sq : null;
  render();
}

function pedirCoronacion(ms) {
  const z = $("promo");
  z.innerHTML = "";
  ms.forEach((m) => {
    const b = document.createElement("button");
    b.className = "b3d b-cielo " + (jugador === 1 ? "bl" : "ng");
    b.textContent = GLIFO[m.prom] + "\uFE0E";
    b.setAttribute("aria-label", "Coronar a " + NOMBRE[m.prom]);
    b.addEventListener("click", () => jugar(m));
    z.appendChild(b);
  });
  z.hidden = false;
}

function deshacerJugada() {
  if (esperando || pausada || pensando) return;
  if (nivelD && nivelD.tuto) { // ejercicio: se vuelve a la foto anterior
    const f = fotos.pop();
    if (!f) return;
    Object.assign(est, { b: f.b, enr: f.enr, ap: f.ap, rel: f.rel, rey: f.rey, turno: jugador });
    ult = f.ult; fin = false; msgFin = ""; resultado = ""; sel = null; $("promo").hidden = true; $("fin").hidden = true;
    legs = tutoLegales();
    return render();
  }
  const n = est.turno === jugador ? 2 : 1;
  if (pila.length < n) return;
  for (let i = 0; i < n; i++) { deshacer(est, pila.pop()); claves.pop(); }
  fin = false; msgFin = ""; resultado = ""; sel = null; $("fin").hidden = true;
  ult = pila.length ? pila[pila.length - 1].m : null;
  $("promo").hidden = true;
  legs = legales(est);
  render();
}

$("bNueva").addEventListener("click", () => { if (!esperando) cambiar(() => {}); });
$("bDeshacer").addEventListener("click", deshacerJugada);

// ===== Fin de nivel / de partida: ventana SOBRE el tablero (estándar, sección 6) =====
function colocarFin() {
  const f = $("fin");
  if (f.hidden) return;
  const r = tab.getBoundingClientRect();
  const x = Math.max(0, r.left), y = Math.max(0, r.top), x2 = Math.min(innerWidth, r.right), y2 = Math.min(innerHeight, r.bottom);
  Object.assign(f.style, { left: x + "px", top: y + "px", width: Math.max(0, x2 - x) + "px", height: Math.max(0, y2 - y) + "px" });
}
const boton = (texto, icono, clase, fn) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt " + clase;
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = icono;
  b.append(i, document.createTextNode(" " + texto));
  b.addEventListener("click", fn);
  return b;
};
function mostrarFin() {
  const id = partida;
  setTimeout(() => { // un instante para ver la última jugada
    if (id !== partida || !fin || pantalla !== "juego") return;
    const gana = resultado === "gana", f = $("fin");
    $("fin-tit").textContent = nivelD && gana ? "¡Nivel " + fmt(nivelN) + " completado!" : gana ? "¡Ganaste!" : resultado === "tablas" ? "Tablas" : resultado === "pierde" ? "Perdiste" : "¡Listo!";
    $("fin-txt").textContent = msgFin;
    const fila = [], ver = boton("Ver tablero", "👁️", "b-cielo", () => { $("fin").hidden = true; });
    let primario;
    if (nivelD && gana) {
      const sig = nivelN + 1, repetir = boton("Repetir nivel", "🔄", "b-cielo", () => nueva());
      if (nivelN % ETAPAS.porEtapa === 0) primario = boton("Ver el mapa", "🗺️", "grande b-verde", () => irANiveles(nivelN, true)); // terminó la etapa: el agua sube
      else if (datosNivel(sig)) { primario = boton("Siguiente nivel", "▶", "grande b-verde", () => empezarNivel(sig, datosNivel(sig))); fila.push(repetir); }
      else primario = boton("Repetir nivel", "🔄", "grande b-verde", () => nueva());   // último nivel con contenido: no hay «Siguiente»
      fila.push(boton("Niveles", "📋", "b-cielo", () => irANiveles()));
    } else if (nivelD) {
      primario = boton("Reintentar", "🔄", "grande b-verde", () => nueva());
      fila.push(boton("Niveles", "📋", "b-cielo", () => irANiveles()));
    } else {
      primario = boton("Jugar otra vez", "🔄", "grande b-verde", () => nueva());
      if (enLibre) fila.push(boton("Cambiar dificultad", "⚙️", "b-cielo", () => irALibre()));
    }
    fila.push(ver);
    $("fin-prim").replaceChildren(primario);
    $("fin-fila").replaceChildren(...fila);
    f.hidden = false;
    colocarFin();
  }, 650);
}

// ===== Pantallas =====
function rotular(t) { $("txt-menu").textContent = btnMenu.title = t; }
function mostrar(p, n, alcanzado) {
  pantalla = p;
  if (p !== "juego") esperando = false;
  $("comenzar").hidden = !(p === "juego" && esperando);
  zonaJuego.hidden = p !== "juego";
  zonaJuego.toggleAttribute("inert", p === "juego" && esperando);
  $("libre").hidden = p !== "libre";
  if (p === "niveles") mapa.abrir(n || leerMapa().max, alcanzado); else mapa.cerrar();
  if (p !== "juego") $("fin").hidden = true;
  rotular(p === "juego" ? "Pausa" : "Atrás");
  if (p === "juego") {
    ajustarTam(); render();
    if (esperando) { try { $("btn-comenzar").focus({ preventScroll: true }); } catch (e) {} }
  }
}
// Suelta lo que la partida en curso tenía pendiente (la jugada de la computadora, la pausa)
function abandonar() { partida++; pensando = false; retraso = false; pausada = false; $("promo").hidden = true; }

// Deja el juego cargado y pone la capa «Comenzar». En el Ajedrez (excepción al estándar 7.0, pedida por Polo) NO es el nivel del mapa:
// es una partida de Modo libre contra el bot NIVEL_INICIO. No se guarda esa dificultad: el Modo libre recuerda la que el jugador eligió.
function cargarInicio() {
  abandonar();
  esperando = true; enLibre = false; // enLibre = false: la pausa trae el menú completo (Modo libre, Niveles…)
  nivel = NIVEL_INICIO;
  prepararLibre();
  mostrar("juego");
}
const volverAlInicio = () => cargarInicio();

function prepararNivel(n, d) {
  nivelN = n; nivelD = d; jugador = d.color === -1 ? -1 : 1;
  zonaJuego.classList.add("en-nivel");
  nueva();
}
function prepararLibre() {
  nivelN = 0; nivelD = null;
  jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
  zonaJuego.classList.remove("en-nivel");
  nueva();
}
function empezarNivel(n, d) { // desde Niveles, «Siguiente nivel» o Reintentar: directo, sin capa
  abandonar();
  esperando = false; enLibre = false;
  prepararNivel(n, d);
  mostrar("juego");
}
function irANiveles(n, alcanzado) { abandonar(); mostrar("niveles", n, alcanzado); }
function irALibre() { abandonar(); nivel = nivelGuardado(); mostrar("libre"); pintarLibre(); }
function empezarLibre() {
  abandonar();
  esperando = false; enLibre = true;
  prepararLibre();
  mostrar("juego");
}

// ----- ♾️ Modo libre: dificultad y color; se recuerda la última selección -----
function opcionLibre(texto, icono, elegido, fn, etiqueta) {
  const b = boton(texto, icono, elegido ? "b-oro on" : "b-cielo", fn);
  if (etiqueta) { b.title = etiqueta; b.setAttribute("aria-label", etiqueta); }
  b.setAttribute("aria-pressed", String(!!elegido));
  return b;
}
function pintarLibre() {
  const g = ganados();
  $("libre-niveles").replaceChildren(...NIVELES.map((n, i) => opcionLibre((i + 1) + (g[i + 1] ? "⭐" : ""), n.icono, i + 1 === nivel,
    () => { nivel = i + 1; localStorage.setItem(ID + ":nivel", nivel); pintarLibre(); },
    "Dificultad " + (i + 1) + ", " + n.nombre + (g[i + 1] ? ", ya vencida" : ""))));
  $("libre-color").replaceChildren(
    opcionLibre("Blancas", "♔", jugador === 1, () => { jugador = 1; localStorage.setItem(ID + ":color", "1"); pintarLibre(); }),
    opcionLibre("Negras", "♚", jugador === -1, () => { jugador = -1; localStorage.setItem(ID + ":color", "-1"); pintarLibre(); }));
  const n = NIVELES[nivel - 1];
  $("libre-nota").textContent = n.nombre + ": " + n.desc + (PUNTOS_LIBRE ? (g[nivel] ? " ⭐ Ya la venciste." : " +" + n.puntos + " pts la primera vez que la venzas.") : "");
}
$("libre-jugar").addEventListener("click", empezarLibre);

// ----- ☰ Pausa: Continuar · 🔄 Reiniciar nivel (debajo de Continuar, por decisión de Polo) · ♾️ Modo libre · 📋 Niveles · ℹ️ Info · 🚪 Menú principal -----
const reanudar = () => { pausada = false; if (!esperando) arrancar(); };
const hayAvance = () => !fin && (pila.length > 0 || fotos.length > 0);
const pausa = crearMenuPausa({
  puedeAbrir: () => pantalla === "juego" && $("dialogo").hidden,
  alAbrir: () => { pausada = true; },
  alContinuar: reanudar,
  extras: () => enLibre ? [] : [ // en una partida de Modo libre solo hay Continuar y «Salir a elegir tablero»
    { icono: "🔄", texto: nivelD ? "Reiniciar nivel" : "Nueva partida", clase: "b-azul", ayuda: nivelD ? "Vuelves a empezar este nivel." : "Empiezas otra partida contra el mismo bot.", alElegir: () => { reanudar(); nueva(); } },
    { icono: "♾️", texto: "Modo libre", clase: "b-morado", ayuda: "Eliges la dificultad y tu color. " + (hayAvance() ? "Se pierde la partida en curso." : "Tu progreso queda guardado."), alElegir: irALibre },
    { icono: "📋", texto: "Niveles", clase: "b-azul", ayuda: hayAvance() ? "Se pierde lo avanzado en este nivel." : "Lista de niveles. Tu progreso queda guardado.", alElegir: () => irANiveles() },
    { icono: "ℹ️", texto: "Info", clase: "b-cielo", alElegir: () => { reanudar(); infoJuego(); } },
  ],
  get textoSalir() { return enLibre ? "Salir a elegir tablero" : "Menú principal"; },
  ayudaSalir: () => enLibre ? "La partida termina. Las dificultades que ya venciste quedan guardadas." : hayAvance() ? "Se pierde lo avanzado en este nivel." : "Tu progreso queda guardado en este dispositivo.",
  alSalir: () => { if (enLibre) irALibre(); else volverAlInicio(); },
});
btnMenu.addEventListener("click", () => { if (pantalla === "juego") pausa.abrir(); else volverAlInicio(); }); // «Pausa» en el juego, «Atrás» en el resto

// ----- Capa «Comenzar» (7.0) -----
$("btn-comenzar").addEventListener("click", () => {
  esperando = false;
  $("comenzar").hidden = true;
  zonaJuego.removeAttribute("inert");
  arrancar(); // si la computadora mueve primero (nivel con negras), arranca ahora
});

// ----- Mapa de niveles (7.3): México y mundo; listas de 5 columnas; «Modo libre» NO va aquí, está en ☰ Pausa -----
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: leerMapa,
  jugarNivel,
  columnas: 5,
  leyenda: "Los niveles se abren en orden.",
  infoNivel: (n) => { const d = datosNivel(n); return d ? { sub: d.icono, clase: d.tuto ? "b-verde" : "b-oro" } : { sub: "🚧" }; },
  alInfo: () => preguntar("100 niveles por estado y por país: 3 200 en México y 19 400 en el mundo. Los primeros enseñan cada pieza; luego vienen partidas.", null, { si: "Entendido", no: null, titulo: "ℹ️ Niveles" }),
  avisoPrincipal: () => "Nivel " + fmt(leerMapa().max) + " de " + fmt(ETAPAS.total),
});

function jugarNivel(n) {
  const d = datosNivel(n);
  if (d) return empezarNivel(n, d);
  const txt = "Nivel " + fmt(n) + " (" + ETAPAS.nombreEtapa(n) + ", nivel " + ETAPAS.etapaDe(n).k + "): todavía no tiene contenido.";
  if (DEV) preguntar(txt + " ¿Marcarlo como superado (prueba)?", () => { superarNivel(n); if (nubeMapa) nubeMapa.guardado(); irANiveles(n, true); }, { si: "✅ Superar", no: "Cerrar" });
  else preguntar("🚧 Los niveles todavía no están creados. " + txt, null, { si: "Entendido", no: null });
}

// ----- Niveles del mapa: ejercicios de enseñanza (solo mueven las blancas) y partidas -----
const sqDe = (s) => "abcdefgh".indexOf(s[0]) + (8 - +s[1]) * 8;
const tutoLegales = () => legales(est).filter((m) => est.b[m.a] !== -6); // en los ejercicios no se captura el rey negro
function jugarTuto(m) {
  fotos.push({ b: est.b.slice(), enr: est.enr, ap: est.ap, rel: est.rel, rey: est.rey.slice(), ult });
  const meta = nivelD.meta;
  hacer(est, m);
  ult = m; sel = null; $("promo").hidden = true;
  let ok = false;
  if (meta.llegar) ok = m.a === sqDe(meta.llegar);
  else if (meta.coronar) ok = !!m.prom;
  else if (meta.enroque) ok = !!m.enr;
  else if (meta.limpiar) ok = !est.b.some((p) => p < 0 && p !== -6);
  else if (meta.mate) ok = (estadoPartida(est, legales(est), [clave(est)]) || {}).fin === "mate";
  est.turno = jugador; // las negras no responden
  legs = tutoLegales();
  fin = ok; msgFin = ok ? "¡Muy bien! Nivel superado." : ""; resultado = ok ? "gana" : "";
  if (ok) superado();
  render();
  if (ok) mostrarFin();
}
function superado() {
  superarNivel(nivelN);
  if (nubeMapa) nubeMapa.guardado();
}

// ----- 👤 Iniciar sesión (arriba a la derecha). jugador.js se carga aparte para que el juego funcione sin internet -----
let sesion = null, usuario = null;
const btnSesion = $("btn-sesion");
function pintarSesion() {
  $("txt-sesion").textContent = usuario ? (usuario.displayName || "Jugador").split(" ")[0] : "Iniciar sesión";
  btnSesion.title = usuario ? "Cerrar sesión" : "Iniciar sesión con Google";
}
btnSesion.addEventListener("click", async () => {
  if (!sesion) return preguntar("Necesitas internet para iniciar sesión.", null, { si: "Entendido", no: null });
  if (usuario) return preguntar("¿Cerrar la sesión de " + (usuario.displayName || "esta cuenta") + "?", () => sesion.salir(), { si: "Cerrar sesión", no: "Cancelar" });
  try { await sesion.entrar(); } catch (e) { preguntar("No se pudo iniciar sesión. Intenta de nuevo.", null, { si: "Entendido", no: null }); }
});
import("../compartido/jugador.js").then((m) => { sesion = m; m.alCambiarSesion((u) => { usuario = u; pintarSesion(); }); }).catch(() => {});

// ----- Arranque: el juego ya cargado, con la capa «Comenzar» -----
cargarInicio();

// Sincroniza los niveles vencidos (⭐) y el progreso del mapa con la cuenta de Google: lo más alto de cada lado cuenta.
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: ID + ":ganados",
    fusionar: (a, b) => (!a && !b ? null : { ...(b || {}), ...(a || {}) }),
    alCambiar: () => { if (pantalla === "libre") pintarLibre(); },
  });
  nubeMapa = m.conectar(ID + "-mapa", { clave: CLAVE_MAPA, fusionar: fusionarMapa, alCambiar: () => {
    mapa.refrescar(); // el inicio ya no depende del nivel del mapa, solo se repinta la lista
  } });
}).catch(() => {});
