// PROYECTO: Portal Juegos · Ruta: ajedrez/juego-ajedrez.js
// Inicio con mapa (ESTANDARES-juegos.md, sección 13, como Puzle deslizante): al abrir se ve UNA SOLA VEZ la pantalla de inicio
// (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes); de ahí en adelante el «menú principal» es el mapa del país donde va el jugador
// (compartido/mapa-niveles.js, solo países: 195 × 20 = 3 900 niveles). No hay capa «Comenzar» ni menú de ☰ Pausa.
import { INICIO, CABALLO, desdeFEN, legales, hacer, deshacer, enJaque, estadoPartida, clave } from "./logica-ajedrez.js";
import { mejorJugada } from "./ia-ajedrez.js";
import { encolarPuntos, encolarNivel, leerCola, guardarCola } from "../compartido/cola-puntos.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { ETAPAS, CLAVE_MAPA, leerMapa, superarNivel, fusionarMapa, datosNivel } from "./niveles-ajedrez.js";

// ===== AJUSTES =====
const ID = "ajedrez";
// Las 5 dificultades estándar del Modo libre (7.2): 😁 😬 😐 😡 😈.
// prof = profundidad máxima, tiempo = ms máximos por jugada (se juega con lo que alcance a calcular),
// azar = probabilidad de jugar al azar, ruido = variación de la evaluación, puntos = premio al ganar por primera vez
// (el orden NO cambia: «ajedrez:ganados» guarda por número 1 a 5 y los niveles 19-21 del mapa usan ia 1, 1 y 2)
const NIVELES = [
  { nombre: "Muy fácil", icono: "😁", desc: "Se despista mucho: ideal para aprender.",        prof: 1, tiempo: 300,  azar: 0.45, ruido: 100, puntos: 10 },
  { nombre: "Fácil",     icono: "😬", desc: "Ya ve algunas capturas, pero falla bastante.",    prof: 1, tiempo: 300,  azar: 0.25, ruido: 60,  puntos: 15 },
  { nombre: "Normal",    icono: "😐", desc: "Ve capturas simples, pero comete errores.",       prof: 2, tiempo: 600,  azar: 0.12, ruido: 40,  puntos: 20 },
  { nombre: "Difícil",   icono: "😡", desc: "Juega con táctica y casi no regala nada.",        prof: 4, tiempo: 1800, azar: 0,    ruido: 5,   puntos: 60 },
  { nombre: "Demoníaco", icono: "😈", desc: "El más fuerte: puede tardar unos segundos.",      prof: 8, tiempo: 3000, azar: 0,    ruido: 0,   puntos: 100 },
];
const TAM_MAX = 84;        // tamaño máximo de casilla (px)
// El estándar (7.2) dice que el Modo libre NO da puntos de perfil. El Ajedrez siempre los dio (⭐ y puntos la primera vez que se vence
// cada dificultad) y la gente ya tiene ese progreso, así que se conserva. Poner false para cumplir el estándar al pie de la letra
// (hay que decidirlo ANTES de pasar el juego a la zona «Juegos»: ver README-ajedrez.md).
const PUNTOS_LIBRE = true;
// ===================

const GLIFO = { 1: "♟", 2: "♞", 3: "♝", 4: "♜", 5: "♛", 6: "♚" };
const NOMBRE = { 1: "peón", 2: "caballo", 3: "alfil", 4: "torre", 5: "dama", 6: "rey" };
const FIN = {
  ahogado: "Tablas: rey ahogado.", 50: "Tablas por la regla de las 50 jugadas.",
  material: "Tablas: no hay material para dar mate.", repeticion: "Tablas por repetición de posición.",
};
const AYUDA = "Toca una pieza tuya y luego la casilla a donde quieres moverla (los puntos marcan las jugadas posibles). ↩ deshace tu última jugada y 🔄 empieza otra. " +
  "Los primeros niveles del mapa enseñan una pieza (el rival no mueve); ♾️ Modo libre es ajedrez completo contra la computadora en 5 dificultades.";

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("es-MX");
const DEV = new URLSearchParams(location.search).has("dev"); // ?dev=1 → botón para superar niveles sin contenido y ver subir el agua
const tab = $("tablero"), zonaJuego = document.querySelector(".aj"), btnMenu = $("btn-menu");

const nivelGuardado = () => Math.min(NIVELES.length, Math.max(1, +localStorage.getItem(ID + ":nivel") || 1));
let nivel = nivelGuardado(); // dificultad con la que se juega en el Modo libre
let jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
let est, pila = [], claves, legs, sel, ult, fin = false, msgFin, resultado, pensando, partida = 0, nube = null, nubeMapa = null, nivelN = 0, nivelD = null, fotos = [];
let logrado = false;      // ejercicio superado (en los de práctica el jugador puede seguir moviendo después)
let objetivos = [];       // nivel del caballo: casillas marcadas (sombras) donde hay que ponerlo
let pantalla = "inicio";  // "inicio" | "juego" | "libre" (opciones del Modo libre) | "niveles" (mapa)
let enLibre = false;      // true = se está jugando una partida que se empezó desde la pantalla de Modo libre
let pausada = false, retraso = false;
let mapaEnPrincipal = true; // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
let reiniciando = false;    // true mientras se borra el historial: la sincronización con la nube no vuelve a traer lo borrado

const sqDe = (s) => "abcdefgh".indexOf(s[0]) + (8 - +s[1]) * 8;   // «e4» → número de casilla (0 = a8, 63 = h1)
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

// El tablero ocupa lo que dejan libre los márgenes de .aj (que ya reservan la barra del nivel, 🎮 / ☰, 🌙 y ⛶); así el CSS manda y este cálculo lo sigue
const horizontal = matchMedia("(min-aspect-ratio: 23/20)"); // mismo punto de corte que el CSS
function ajustarTam() {
  const s = getComputedStyle(zonaJuego), px = (v) => parseFloat(v) || 0;
  const mh = px(s.paddingLeft) + px(s.paddingRight), mv = px(s.paddingTop) + px(s.paddingBottom);
  const h = horizontal.matches;
  const ancho = h ? innerWidth - mh - 328 : innerWidth - mh;        // 328 = columna de controles (280) + separación (22) + holgura (26)
  const alto = h ? innerHeight - mv - 8 : innerHeight - mv - 170;   // 170 = descripción, estado y botones bajo/sobre el tablero
  const t = Math.max(30, Math.floor(Math.min(ancho, alto, TAM_MAX * 8) / 8));
  tab.style.setProperty("--t", t + "px");
}
addEventListener("resize", () => { ajustarTam(); colocarFin(); });

// ----- Dibujo -----
function render() {
  const flip = jugador === -1;
  const reyJaque = enJaque(est, est.turno) ? est.rey[est.turno === 1 ? 0 : 1] : -1;
  const colocar = modoColocar();
  const dest = new Set(), caps = new Set();
  if (sel !== null && !colocar) legs.filter((m) => m.de === sel).forEach((m) => { dest.add(m.a); if (est.b[m.a] || m.ep) caps.add(m.a); });
  for (let d = 0; d < 64; d++) {
    const sq = flip ? 63 - d : d, p = est.b[sq], f = sq >> 3, c = sq & 7, b = celdas[d];
    let cls = "cas " + ((f + c) % 2 ? "osc" : "cla");
    if (ult && (sq === ult.de || sq === ult.a)) cls += " ult";
    if (sq === sel) cls += " sel";
    if (sq === reyJaque) cls += " jaque";
    if (dest.has(sq)) cls += caps.has(sq) ? " dest cap" : " dest";
    const sombra = colocar && !p && objetivos.includes(sq);   // sombra del caballo: a dónde puede ir
    if (sombra) cls += " sombra";
    b.className = cls;
    b.dataset.sq = sq;
    const nom = "abcdefgh"[c] + (8 - f);
    b.setAttribute("aria-label", nom + (p ? ", " + NOMBRE[Math.abs(p)] + (p > 0 ? " blanco" : " negro") : ""));
    b.innerHTML =
      (d % 8 === 0 ? `<span class="co r">${8 - f}</span>` : "") +
      (d >= 56 ? `<span class="co f">${"abcdefgh"[c]}</span>` : "") +
      (p ? `<span class="p ${p > 0 ? "bl" : "ng"}">${GLIFO[Math.abs(p)]}\uFE0E</span>` : sombra ? `<span class="p bl som">${GLIFO[CABALLO]}\uFE0E</span>` : "");
  }
  let txt;
  if (fin) txt = msgFin;
  else if (logrado) txt = "✅ ¡Nivel superado! Pasa al siguiente o sigue practicando.";
  else if (nivelD && nivelD.tuto) txt = "🎯 " + nivelD.obj + (colocar ? " (" + objetivos.filter((s) => est.b[s] === CABALLO).length + " de " + objetivos.length + ")" : "");
  else if (pensando) txt = "Pensando…";
  else txt = "Tu turno" + (enJaque(est, est.turno) ? ": ¡jaque!" : "");
  $("estado").textContent = txt;
  $("desc").textContent = nivelD ? nivelD.titulo + ": " + nivelD.txt : NIVELES[nivel - 1].nombre + ": " + NIVELES[nivel - 1].desc;
  const rot = nivelD ? "Reiniciar nivel" : "Nueva partida";
  $("bNueva").title = rot; $("bNueva").setAttribute("aria-label", rot);
  $("bSiguiente").hidden = !(logrado && nivelD && datosNivel(nivelN + 1));   // el botón queda a la vista mientras se sigue practicando
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
  fotos = []; pila = []; claves = [clave(est)]; sel = null; ult = null; fin = false; msgFin = ""; resultado = ""; pensando = false; retraso = false; logrado = false;
  $("promo").hidden = true;
  $("fin").hidden = true;
  objetivos = modoColocar() ? legales(est).filter((m) => m.de === sqDe(nivelD.meta.centro)).map((m) => m.a) : [];   // las casillas a las que puede ir el caballo del centro
  legs = nivelD && nivelD.tuto ? tutoLegales() : legales(est);
  ajustarTam();
  render();
  if (est.turno !== jugador) pensar(); // con negras (nivel o Modo libre) la computadora mueve primero
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
    if (pausada) { retraso = true; return; } // se pausó mientras «pensaba»: sigue al continuar
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

// Envía los puntos pendientes al perfil si hay internet y sesión (progreso.js se carga aparte para que el juego abra sin internet)
async function enviarPuntos() { try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {} }

async function premio() {
  if (!PUNTOS_LIBRE) return;
  const g = ganados(), n = NIVELES[nivel - 1];
  if (g[nivel]) { msgFin += " (ya habías vencido esta dificultad)"; return; }
  g[nivel] = true;
  localStorage.setItem(ID + ":ganados", JSON.stringify(g));
  if (nube) nube.guardado();
  msgFin += " +" + n.puntos + " pts";
  encolarPuntos(ID, n.puntos); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  enviarPuntos();
}

function tocarCasilla(sq) {
  if (pausada || fin || pensando || est.turno !== jugador) return;
  if (sel !== null) {
    const ms = legs.filter((m) => m.de === sel && m.a === sq);
    if (ms.length === 1) return jugar(ms[0]);
    if (ms.length > 1) return pedirCoronacion(ms);
  }
  $("promo").hidden = true;
  sel = est.b[sq] * jugador > 0 && sq !== sel && (!modoColocar() || sq === sqDe(nivelD.meta.centro)) ? sq : null;   // las piezas ya colocadas no se mueven
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
  if (pausada || pensando) return;
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

$("bNueva").addEventListener("click", () => cambiar(() => {}));
$("bDeshacer").addEventListener("click", deshacerJugada);
$("bSiguiente").addEventListener("click", () => { const d = datosNivel(nivelN + 1); if (d) empezarNivel(nivelN + 1, d); });
// Nivel del caballo: ¿este nivel es el de colocar el caballo en las sombras?
function modoColocar() { return !!(nivelD && nivelD.meta && nivelD.meta.centro); }

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
  if (texto) b.append(i, document.createTextNode(" " + texto)); else b.append(i);   // sin texto: botón solo con emoji (dificultad del Modo libre)
  b.addEventListener("click", fn);
  return b;
};
function mostrarFin() {
  const id = partida;
  setTimeout(() => { // un instante para ver la última jugada
    if (id !== partida || (!fin && !logrado) || pantalla !== "juego") return;
    const gana = resultado === "gana", f = $("fin");
    $("fin-tit").textContent = nivelD && gana ? "¡Nivel " + fmt(nivelN) + " completado!" : gana ? "¡Ganaste!" : resultado === "tablas" ? "Tablas" : resultado === "pierde" ? "Perdiste" : "¡Listo!";
    $("fin-txt").textContent = msgFin;
    const practica = !!(nivelD && nivelD.meta && nivelD.meta.capturaCon);
    const fila = [], ver = boton(practica ? "Seguir practicando" : "Ver tablero", practica ? "♟" : "👁️", "b-cielo", () => { $("fin").hidden = true; });
    let primario;
    if (nivelD && gana) {
      const sig = nivelN + 1, repetir = boton("Repetir nivel", "🔄", "b-cielo", () => nueva());
      if (nivelN % ETAPAS.porEtapa === 0) primario = boton("Ver el mapa", "🗺️", "grande b-verde", () => irANiveles(nivelN, true)); // terminó el país: el agua sube
      else if (datosNivel(sig)) { primario = boton("Siguiente nivel", "▶", "grande b-verde", () => empezarNivel(sig, datosNivel(sig))); fila.push(repetir); }
      else primario = boton("Repetir nivel", "🔄", "grande b-verde", () => nueva());   // último nivel con contenido: no hay «Siguiente»
      fila.push(boton("Mapa", "🗺️", "b-cielo", () => irANiveles()));
    } else if (nivelD) {
      primario = boton("Reintentar", "🔄", "grande b-verde", () => nueva());
      fila.push(boton("Mapa", "🗺️", "b-cielo", () => irANiveles()));
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
// «inicio» (se ve una sola vez) · «niveles» = el mapa (menú principal) · «libre» = opciones del Modo libre · «juego» = una partida (nivel o Modo libre).
// El ☰ (13.3): oculto en el inicio y en la vista principal del mapa; «Atrás» en las vistas internas del mapa; «Volver al menú principal» en las opciones
// del Modo libre y en un nivel; «Pausa» en una partida de Modo libre.
function pintarBotonMenu() {
  const enMapa = pantalla === "niveles";
  btnMenu.hidden = pantalla === "inicio" || (enMapa && mapaEnPrincipal);
  const texto = enMapa ? "Atrás" : pantalla === "juego" && enLibre ? "Pausa" : "Volver al menú principal";
  btnMenu.title = texto; btnMenu.setAttribute("aria-label", texto);
}
// Botón verde de arriba: el nombre del nivel (sin más datos) o «♾️ Modo libre 😐»
function pintarNombre() {
  const t = nivelD ? "Nivel " + ETAPAS.etapaDe(nivelN).k + " · " + ETAPAS.nombreEtapa(nivelN) : "♾️ Modo libre " + NIVELES[nivel - 1].icono;
  $("nombre-nivel").textContent = t;
  $("barra-juego").setAttribute("aria-label", t);
  $("barra-juego").title = nivelD ? "Salir al mapa" : "Pausa";
}
function mostrar(p, n, alcanzado) {
  pantalla = p;
  $("inicio").hidden = p !== "inicio";
  zonaJuego.hidden = p !== "juego";
  $("libre").hidden = p !== "libre";
  $("barra-nivel").hidden = p !== "juego";
  $("btn-mapa-juego").hidden = enLibre;      // el 🗺️ solo en los niveles (el Modo libre no tiene mapa)
  if (p === "niveles") mapa.abrir(n || leerMapa().max, alcanzado); else mapa.cerrar();
  if (p !== "juego") $("fin").hidden = true;
  if (p === "juego") { pintarNombre(); ajustarTam(); render(); }
  pintarBotonMenu();
}
// Suelta lo que la partida en curso tenía pendiente (la jugada de la computadora, la pausa)
function abandonar() { partida++; pensando = false; retraso = false; pausada = false; $("promo").hidden = true; }

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
function empezarNivel(n, d) { // desde el mapa, «Siguiente nivel» o Reintentar: directo
  abandonar();
  enLibre = false;
  prepararNivel(n, d);
  mostrar("juego");
}
function irANiveles(n, alcanzado) { abandonar(); mostrar("niveles", n, alcanzado); }
function irALibre() { abandonar(); nivel = nivelGuardado(); mostrar("libre"); pintarLibre(); }
function empezarLibre() {
  abandonar();
  enLibre = true;
  prepararLibre();
  mostrar("juego");
}

// ----- ♾️ Modo libre (13.7): dificultad (5 emojis) y color; se recuerda la última selección -----
function opcionLibre(texto, icono, elegido, fn, etiqueta) {
  const b = boton(texto, icono, elegido ? "b-oro on" : "b-cielo", fn);
  if (etiqueta) { b.title = etiqueta; b.setAttribute("aria-label", etiqueta); }
  b.setAttribute("aria-pressed", String(!!elegido));
  return b;
}
function pintarLibre() {
  const g = ganados();
  $("libre-niveles").replaceChildren(...NIVELES.map((n, i) => opcionLibre("", n.icono, i + 1 === nivel,
    () => { nivel = i + 1; localStorage.setItem(ID + ":nivel", nivel); pintarLibre(); },
    n.nombre + (g[i + 1] ? ", ya vencida" : ""))));
  $("libre-color").replaceChildren(
    opcionLibre("Blancas", "♔", jugador === 1, () => { jugador = 1; localStorage.setItem(ID + ":color", "1"); pintarLibre(); }),
    opcionLibre("Negras", "♚", jugador === -1, () => { jugador = -1; localStorage.setItem(ID + ":color", "-1"); pintarLibre(); }));
  const n = NIVELES[nivel - 1];
  $("dif-nombre").textContent = n.icono + " " + n.nombre + " · " + n.desc;
  $("libre-nota").textContent = "Ajedrez completo contra la computadora." + (PUNTOS_LIBRE && !g[nivel] ? " +" + n.puntos + " pts la primera vez que la venzas." : "");
  $("libre-record").textContent = g[nivel] ? "🏆 ⭐ Ya venciste esta dificultad" : "🏆 Aún sin vencer en esta dificultad";
}
$("btn-libre-jugar").addEventListener("click", empezarLibre);

// ----- Ventanas de pausa (menu-pausa.js) -----
// Nivel: «¿Salir?» (Seguir jugando · Salir al mapa), con el botón verde del nombre, el 🗺️ y el ☰. Modo libre: «Pausa» (Seguir jugando · Salir a elegir tablero).
// Mientras están abiertas la computadora no mueve ni se tocan casillas; «Seguir jugando» (o Esc, o tocar fuera) continúa donde iba.
const reanudar = () => { pausada = false; arrancar(); };
const alAbrirPausa = () => { pausada = true; };
const hayAvance = () => !fin && (pila.length > 0 || fotos.length > 0);
const pausaSalir = crearMenuPausa({                // niveles
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: () => (hayAvance() ? "Se pierde lo avanzado en este tablero." : ""),
  puedeAbrir: () => pantalla === "juego" && !enLibre && $("dialogo").hidden,
  alAbrir: alAbrirPausa,
  alContinuar: reanudar,
  alSalir: () => irANiveles(),
});
const pausaLibre = crearMenuPausa({                // Modo libre
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: () => (hayAvance() ? "La partida termina. Las dificultades que ya venciste quedan guardadas." : ""),
  puedeAbrir: () => pantalla === "juego" && enLibre && $("dialogo").hidden,
  alAbrir: alAbrirPausa,
  alContinuar: reanudar,
  alSalir: () => irALibre(),
});
$("barra-juego").addEventListener("click", () => (enLibre ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir());   // 🗺️: pregunta «¿Salir?» y, si se confirma, abre el mapa
btnMenu.addEventListener("click", () => {
  if (pantalla === "niveles") { if (!mapa.esPrincipal()) mapa.principal(); }   // «Atrás» dentro del mapa: sube un paso (en la vista principal el ☰ no se ve)
  else if (pantalla === "juego") (enLibre ? pausaLibre : pausaSalir).abrir();
  else irANiveles();                                                            // opciones del Modo libre → menú principal (el mapa)
});

// ----- Mapa de niveles (13.4): solo países (195 × 20), se ve el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos -----
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: leerMapa,
  jugarNivel,
  unPais: true,                                    // se abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,                                     // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (leerMapa().hecho === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => irALibre() }],   // el Modo libre se abre desde el mapa
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },         // el ☰ se rotula según la vista
  infoNivel: (n) => { const d = datosNivel(n); return d ? { sub: d.icono, clase: d.tuto ? "b-verde" : "b-oro" } : { sub: "🚧" }; },
  alInfo: () => preguntar("195 países con 20 niveles cada uno: 3 900 niveles que se abren en orden, de uno en uno. Los primeros enseñan cada pieza; luego vienen partidas.", null, { si: "Entendido", no: null, titulo: "ℹ️ Niveles" }),
});

function jugarNivel(n) {
  const d = datosNivel(n);
  if (d) return empezarNivel(n, d);
  const txt = "Nivel " + fmt(n) + " (" + ETAPAS.nombreEtapa(n) + ", nivel " + ETAPAS.etapaDe(n).k + "): todavía no tiene contenido.";
  if (DEV) preguntar(txt + " ¿Marcarlo como superado (prueba)?", () => { superarNivel(n); if (nubeMapa) nubeMapa.guardado(); irANiveles(n, true); }, { si: "✅ Superar", no: "Cerrar" });
  else preguntar("🚧 Los niveles todavía no están creados. " + txt, null, { si: "Entendido", no: null });
}

// ----- Niveles del mapa: ejercicios de enseñanza (solo mueven las blancas) y partidas -----
// Jugadas del jugador en un ejercicio: el rival no mueve nunca. «mueven» = las únicas piezas que se pueden mover (sin coronar ni enrocar); «centro» = solo el caballo del centro
const tutoLegales = () => {
  const meta = nivelD.meta || {};
  let l = legales(est).filter((m) => est.b[m.a] !== -6);   // en los ejercicios no se captura el rey negro
  if (nivelD.mueven) l = l.filter((m) => nivelD.mueven.includes(Math.abs(est.b[m.de])) && !m.prom && !m.enr);
  if (meta.centro) l = l.filter((m) => m.de === sqDe(meta.centro));
  return l;
};
function jugarTuto(m) {
  fotos.push({ b: est.b.slice(), enr: est.enr, ap: est.ap, rel: est.rel, rey: est.rey.slice(), ult });
  const meta = nivelD.meta;
  const pieza = Math.abs(est.b[m.de]), captura = est.b[m.a] !== 0 || !!m.ep;
  hacer(est, m);
  est.ap = -1;   // solo mueve el jugador: nunca hay «al paso» contra sus propias piezas
  ult = m; sel = null; $("promo").hidden = true;
  let ok = false;
  if (meta.capturaCon) ok = captura && pieza === meta.capturaCon;
  else if (meta.centro) {
    ok = objetivos.every((s) => est.b[s] === CABALLO);
    if (!ok) est.b[sqDe(meta.centro)] = CABALLO * jugador;   // aparece otro caballo en el centro para colocarlo en otra sombra
  }
  else if (meta.llegar) ok = m.a === sqDe(meta.llegar);
  else if (meta.coronar) ok = !!m.prom;
  else if (meta.enroque) ok = !!m.enr;
  else if (meta.limpiar) ok = !est.b.some((p) => p < 0 && p !== -6);
  else if (meta.mate) ok = (estadoPartida(est, legales(est), [clave(est)]) || {}).fin === "mate";
  est.turno = jugador; // el rival no responde
  legs = tutoLegales();
  const primera = ok && !logrado;
  if (ok) {
    logrado = true; resultado = "gana";
    msgFin = meta.capturaCon ? "¡Muy bien! Capturaste una pieza." : meta.centro ? "¡Muy bien! Llenaste todas las casillas del caballo." : "¡Muy bien! Nivel superado.";
    if (!meta.capturaCon) fin = true;   // en los ejercicios de práctica el juego sigue abierto para experimentar
    if (primera) superado();
  }
  render();
  if (ok && (primera || fin)) mostrarFin();
}
// Nivel pasado: se guarda en el mapa y, SOLO la primera vez, se anota el punto estándar del portal (sección 12: 1 por nivel, encolarNivel)
function superado() {
  const nuevo = nivelN > leerMapa().hecho;
  superarNivel(nivelN);
  if (nubeMapa) nubeMapa.guardado();
  if (nuevo) { encolarNivel(ID); enviarPuntos(); }
}

// ----- Pantalla de inicio (13.2): Jugar = el nivel que toca; si no hay ninguno pasado, abre el mapa en el nivel 1 -----
$("btn-inicio-libre").addEventListener("click", () => irALibre());
$("btn-inicio-jugar").addEventListener("click", () => {
  const h = leerMapa().hecho;
  if (h === 0) return irANiveles(1);
  const n = Math.min(ETAPAS.total, h + 1), d = datosNivel(n);
  if (d) empezarNivel(n, d); else irANiveles(n);   // el siguiente nivel todavía no existe: se abre el mapa en él (muestra 🚧)
});
$("btn-inicio-mapa").addEventListener("click", () => irANiveles());
$("btn-inicio-ajustes").addEventListener("click", () => abrirAjustes());

// ----- ⚙️ Ajustes (13.8): copia de seguridad y, solo mientras el juego esté en EN_DESARROLLO, «Borrar todo el historial» -----
// El botón de borrar aparece solo si el id está en EN_DESARROLLO (juegos.js): al pasar el juego a la zona «Juegos» desaparece solo.
// (🌙/☀️ madera clara/oscura sigue siendo el botón flotante de abajo a la izquierda.)
let borrarVisible = false;
import("../juegos.js").then((m) => { borrarVisible = Array.isArray(m.EN_DESARROLLO) && m.EN_DESARROLLO.includes(ID); }).catch(() => {});
const tope = (p, ms = 8000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error("lento")), ms))]);
// Borra en este dispositivo el progreso (mapa, dificultades vencidas, selección del Modo libre), el agua del mapa y los puntos pendientes de este juego y, con sesión,
// deja vacío el progreso de la cuenta (si no, la sincronización lo volvería a traer). NO toca los puntos que el perfil del portal ya recibió.
// Devuelve true (también se borró en la cuenta), false (no se pudo borrar en la cuenta) o null (no había sesión).
async function borrarHistorial() {
  reiniciando = true;
  try { for (const k of [ID + ":ganados", CLAVE_MAPA, ID + ":nivel", ID + ":color", ID + "-agua", ID + "-mundo-visto"]) localStorage.removeItem(k); } catch (e) {}
  try { guardarCola(leerCola().filter((e) => e.j !== ID)); } catch (e) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const uid = auth.currentUser.uid;
    await tope(setDoc(doc(db, "progreso", uid, "juegos", ID), { datos: "{}", actualizado: serverTimestamp() }));
    await tope(setDoc(doc(db, "progreso", uid, "juegos", ID + "-mapa"), { datos: JSON.stringify({ max: 1, hecho: 0 }), actualizado: serverTimestamp() }));
    return true;
  } catch (e) { console.warn("borrar historial (nube):", e.code || e.message); return false; }
}
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
  const opcion = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    if (icono) b.append(el("span", "b-ico", icono));
    b.append(el("span", "", texto));
    b.addEventListener("click", fn);
    lista.appendChild(b);
    return b;
  };
  opcion("💾", "Copia de seguridad", "b-azul", () => {
    cerrar();
    import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => preguntar("No se pudo abrir la copia de seguridad.", null, { si: "Entendido", no: null }));
  });
  if (borrarVisible) {   // SOLO durante las pruebas (mientras «ajedrez» esté en EN_DESARROLLO)
    const TXT = "Borrar todo el historial y reiniciar";
    const borrar = opcion("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) {                // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        decir("Se borran los niveles pasados, las dificultades vencidas y los puntos pendientes (en este dispositivo y en tu cuenta). Es solo para pruebas.");
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
  opcion("", "Cerrar", "b-cielo", () => cerrar());
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

// ----- Sesión (arriba a la derecha, chip tocable). jugador.js se carga aparte para que el juego funcione sin internet -----
let sesion = null, usuario = null;
const chipSesion = $("sesion");
function pintarSesion() {
  chipSesion.textContent = usuario ? (usuario.displayName || "Jugador") : "👤 Iniciar sesión";
  chipSesion.title = usuario ? "Cerrar sesión" : "Iniciar sesión con Google";
}
async function tocarSesion() {
  if (!sesion) return preguntar("Necesitas internet para iniciar sesión.", null, { si: "Entendido", no: null });
  if (usuario) return preguntar("¿Cerrar la sesión de " + (usuario.displayName || "esta cuenta") + "?", () => sesion.salir(), { si: "Cerrar sesión", no: "Cancelar" });
  try { await sesion.entrar(); } catch (e) { preguntar("No se pudo iniciar sesión. Intenta de nuevo.", null, { si: "Entendido", no: null }); }
}
chipSesion.addEventListener("click", tocarSesion);
chipSesion.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocarSesion(); } });
pintarSesion();
import("../compartido/jugador.js").then((m) => { sesion = m; m.alCambiarSesion((u) => { usuario = u; pintarSesion(); }); }).catch(() => {});

// ----- Arranque: pantalla de inicio (una sola vez) -----
mostrar("inicio");

// Sincroniza los niveles vencidos (⭐) y el progreso del mapa con la cuenta de Google: lo más alto de cada lado cuenta.
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: ID + ":ganados",
    fusionar: (a, b) => (reiniciando || (!a && !b) ? null : { ...(b || {}), ...(a || {}) }),
    alCambiar: () => { if (pantalla === "libre") pintarLibre(); },
  });
  nubeMapa = m.conectar(ID + "-mapa", { clave: CLAVE_MAPA, fusionar: (a, b) => (reiniciando ? null : fusionarMapa(a, b)), alCambiar: () => {
    mapa.refrescar(); // si el mapa está abierto, se redibuja con el progreso de la cuenta
  } });
}).catch(() => {});
