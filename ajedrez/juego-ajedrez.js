// Ruta: ajedrez/juego-ajedrez.js
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
  { nombre: "Jugador de club", icono: "🎯", desc: "Casi no regala piezas.",                       prof: 2, tiempo: 800,  azar: 0.04, ruido: 20,  puntos: 30 },
  { nombre: "Intermedio",   icono: "🎓", desc: "Piensa unas jugadas adelante: cuida tus piezas.", prof: 3, tiempo: 1000, azar: 0.03, ruido: 15,  puntos: 40 },
  { nombre: "Avanzado",     icono: "🦉", desc: "Juega con táctica y casi no regala nada.",        prof: 4, tiempo: 1800, azar: 0,    ruido: 5,   puntos: 60 },
  { nombre: "Experto",      icono: "🦅", desc: "Calcula profundo y castiga cualquier error.",     prof: 6, tiempo: 2500, azar: 0,    ruido: 2,   puntos: 80 },
  { nombre: "Maestro",      icono: "👑", desc: "El más fuerte: puede tardar unos segundos.",      prof: 8, tiempo: 3000, azar: 0,    ruido: 0,   puntos: 100 },
];
const TAM_MAX = 84;     // tamaño máximo de casilla (px)
const COLOR_NIVEL = ["b-verde", "b-azul", "b-morado", "b-oro", "b-rojo", "b-gris", "b-azuloscuro", "b-rojo"]; // color del botón de cada nivel (de fácil a difícil)
// ===================

const GLIFO = { 1: "♟", 2: "♞", 3: "♝", 4: "♜", 5: "♛", 6: "♚" };
const NOMBRE = { 1: "peón", 2: "caballo", 3: "alfil", 4: "torre", 5: "dama", 6: "rey" };
const FIN = {
  ahogado: "Tablas: rey ahogado.", 50: "Tablas por la regla de las 50 jugadas.",
  material: "Tablas: no hay material para dar mate.", repeticion: "Tablas por repetición de posición.",
};

const $ = (id) => document.getElementById(id);
const tab = $("tablero");
let nivel = Math.min(NIVELES.length, Math.max(1, +localStorage.getItem(ID + ":nivel") || 1));
let jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
let est, pila, claves, legs, sel, ult, fin, msgFin, pensando, partida = 0, nube = null, nubeMapa = null, nivelN = 0, nivelD = null, fotos = [];

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
  const alto = h ? innerHeight - 24 : innerHeight - 370;
  const t = Math.max(30, Math.floor(Math.min(ancho, alto, TAM_MAX * 8) / 8));
  tab.style.setProperty("--t", t + "px");
}
window.addEventListener("resize", ajustarTam);

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
  $("bBlancas").classList.toggle("on", jugador === 1);
  $("bNegras").classList.toggle("on", jugador === -1);
  $("desc").textContent = nivelD ? nivelD.titulo + ": " + nivelD.txt : NIVELES[nivel - 1].nombre + ": " + NIVELES[nivel - 1].desc + " (+" + NIVELES[nivel - 1].puntos + " pts la primera vez que lo vences)";
}

function botonesNivel() {
  const g = ganados(), z = $("niveles");
  z.innerHTML = "";
  NIVELES.forEach((n, i) => {
    const b = document.createElement("button");
    b.className = "b3d chico " + COLOR_NIVEL[i] + (i + 1 === nivel ? " on" : "");
    b.innerHTML = '<span class="b-ico">' + n.icono + '</span><span class="b-info">' + (i + 1) + (g[i + 1] ? "⭐" : "") + "</span>";
    b.title = n.nombre;
    b.setAttribute("aria-label", "Nivel " + (i + 1) + ", " + n.nombre + (g[i + 1] ? ", ya vencido" : ""));
    b.addEventListener("click", () => cambiar(() => { nivel = i + 1; localStorage.setItem(ID + ":nivel", nivel); }));
    z.appendChild(b);
  });
}

// Cambiar nivel o color empieza otra partida (pide confirmar si hay una en curso)
function cambiar(fn) {
  if (pila.length && !fin) return preguntar("Esto empieza una partida nueva. ¿Seguro?", () => { fn(); nueva(); });
  fn();
  nueva();
}

// Pregunta dentro de la página (confirm() del navegador saca de la pantalla completa)
// textos: { si, no }; con no = null solo queda un botón (aviso)
function preguntar(texto, siFn, { si = "Sí", no = "No" } = {}) {
  $("avisoTxt").textContent = texto;
  $("avisoSi").textContent = si;
  $("avisoNo").textContent = no || "";
  $("avisoNo").hidden = !no;
  $("aviso").hidden = false;
  $("avisoSi").onclick = () => { $("aviso").hidden = true; if (siFn) siFn(); };
  $("avisoNo").onclick = () => { $("aviso").hidden = true; };
}

// ----- Partida -----
function nueva() {
  partida++;
  est = desdeFEN(nivelD && nivelD.tuto ? nivelD.fen : INICIO);
  fotos = []; pila = []; claves = [clave(est)]; sel = null; ult = null; fin = false; msgFin = ""; pensando = false;
  $("promo").hidden = true;
  legs = nivelD && nivelD.tuto ? tutoLegales() : legales(est);
  botonesNivel();
  ajustarTam();
  render();
  if (est.turno !== jugador) pensar();
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
  if (!fin && est.turno !== jugador) pensar();
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
    if (r.ganador === jugador) { msgFin = "¡Jaque mate! Ganaste."; if (nivelD) superado(); else premio(); }
    else msgFin = "Jaque mate. Gana la computadora.";
  } else msgFin = FIN[r.fin];
}

async function premio() {
  const g = ganados(), n = NIVELES[nivel - 1], id = partida;
  if (g[nivel]) { msgFin += " (ya habías vencido este nivel)"; return; }
  g[nivel] = true;
  localStorage.setItem(ID + ":ganados", JSON.stringify(g));
  if (nube) nube.guardado();
  msgFin += " +" + n.puntos + " pts";
  botonesNivel();
  encolarPuntos(ID, n.puntos); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
}

function tocarCasilla(sq) {
  if (fin || pensando || est.turno !== jugador) return;
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
    b.className = "b3d b-gris " + (jugador === 1 ? "bl" : "ng");
    b.textContent = GLIFO[m.prom] + "\uFE0E";
    b.setAttribute("aria-label", "Coronar a " + NOMBRE[m.prom]);
    b.addEventListener("click", () => jugar(m));
    z.appendChild(b);
  });
  z.hidden = false;
}

function deshacerJugada() {
  if (pensando) return;
  if (nivelD && nivelD.tuto) { // ejercicio: se vuelve a la foto anterior
    const f = fotos.pop();
    if (!f) return;
    Object.assign(est, { b: f.b, enr: f.enr, ap: f.ap, rel: f.rel, rey: f.rey, turno: jugador });
    ult = f.ult; fin = false; msgFin = ""; sel = null; $("promo").hidden = true;
    legs = tutoLegales();
    return render();
  }
  const n = est.turno === jugador ? 2 : 1;
  if (pila.length < n) return;
  for (let i = 0; i < n; i++) { deshacer(est, pila.pop()); claves.pop(); }
  fin = false; msgFin = ""; sel = null;
  ult = pila.length ? pila[pila.length - 1].m : null;
  $("promo").hidden = true;
  legs = legales(est);
  render();
}

$("bNueva").addEventListener("click", () => cambiar(() => {}));
$("bDeshacer").addEventListener("click", deshacerJugada);
$("bBlancas").addEventListener("click", () => { if (jugador !== 1) cambiar(() => { jugador = 1; localStorage.setItem(ID + ":color", "1"); }); });
$("bNegras").addEventListener("click", () => { if (jugador !== -1) cambiar(() => { jugador = -1; localStorage.setItem(ID + ":color", "-1"); }); });

// ===== Pantalla principal = mapa de niveles (3 200 en México + 19 400 en el mundo); «Juego libre» = el ajedrez de siempre =====
const DEV = new URLSearchParams(location.search).has("dev"); // ?dev=1 → botón para superar niveles y ver subir el agua
const fmt = (n) => n.toLocaleString("es-MX");
const zonaJuego = document.querySelector(".aj"), btnMenu = $("btn-menu");
let pantalla = "mapa", pausada = false, retraso = false; // pantalla: "mapa" | "juego"
const rotular = (t) => { btnMenu.innerHTML = '<span class="b-ico">☰</span> ' + t; };

const pausa = crearMenuPausa({
  puedeAbrir: () => pantalla === "juego",
  alAbrir: () => { pausada = true; },
  alContinuar: () => { pausada = false; if (retraso) { retraso = false; pensar(); } },
  extras: () => [{ icono: "🔄", texto: nivelD && nivelD.tuto ? "Reiniciar nivel" : "Nueva partida", clase: "b-azul", alElegir: () => { pausada = false; retraso = false; nueva(); } }],
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde la partida en curso.",
  alSalir: () => { pausada = false; retraso = false; volverAlMapa(nivelN || undefined); },
});

const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: leerMapa,
  jugarNivel,
  leyenda: "Los niveles se abren en orden.",
  infoNivel: (n) => { const d = datosNivel(n); return d ? { sub: d.icono, clase: d.tuto ? "b-verde" : "b-oro" } : {}; },
  botonesExtra: [{ icono: "♾️", texto: "Juego libre", clase: "b-morado", fn: juegoLibre }],
  alInfo: () => preguntar("100 niveles por estado y por país: 3 200 en México y 19 400 en el mundo. ♾️ Juego libre: partidas contra la computadora en 5 niveles.", null, { si: "Entendido", no: null }),
  avisoPrincipal: () => "Nivel " + fmt(leerMapa().max) + " de " + fmt(ETAPAS.total),
  alCambiarVista: (principal) => { btnMenu.hidden = principal; if (!principal) rotular("Menú principal"); }, // en el menú principal no se muestra ☰
});

btnMenu.addEventListener("click", () => { if (pantalla === "mapa") mapa.principal(); else pausa.abrir(); });

function volverAlMapa(n, alcanzado) {
  pantalla = "mapa"; partida++; pensando = false;
  nivelD = null; nivelN = 0; zonaJuego.classList.remove("en-nivel");
  zonaJuego.hidden = true;
  $("aviso").hidden = true;
  mapa.abrir(n, alcanzado);
}
function juegoLibre() {
  pantalla = "juego"; nivelD = null; nivelN = 0; zonaJuego.classList.remove("en-nivel");
  jugador = localStorage.getItem(ID + ":color") === "-1" ? -1 : 1;
  mapa.cerrar();
  zonaJuego.hidden = false;
  btnMenu.hidden = false; rotular("Pausa");
  nueva();
}
function jugarNivel(n) {
  const d = datosNivel(n);
  if (d) return empezarNivel(n, d);
  const txt = "Nivel " + fmt(n) + " (" + ETAPAS.nombreEtapa(n) + ", nivel " + ETAPAS.etapaDe(n).k + "): todavía no tiene contenido.";
  if (DEV) preguntar(txt + " ¿Marcarlo como superado (prueba)?", () => { superarNivel(n); if (nubeMapa) nubeMapa.guardado(); volverAlMapa(n, true); }, { si: "✅ Superar", no: "Cerrar" });
  else preguntar(txt, null, { si: "Entendido", no: null });
}

// ----- Niveles del mapa: ejercicios de enseñanza (solo mueven las blancas) y partidas -----
const sqDe = (s) => "abcdefgh".indexOf(s[0]) + (8 - +s[1]) * 8;
const tutoLegales = () => legales(est).filter((m) => est.b[m.a] !== -6); // en los ejercicios no se captura el rey negro
function empezarNivel(n, d) {
  nivelN = n; nivelD = d; jugador = d.color === -1 ? -1 : 1;
  pantalla = "juego";
  mapa.cerrar();
  zonaJuego.hidden = false; zonaJuego.classList.add("en-nivel");
  btnMenu.hidden = false; rotular("Pausa");
  nueva();
}
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
  fin = ok; msgFin = ok ? "¡Muy bien! Nivel superado." : "";
  if (ok) superado();
  render();
}
function superado() {
  superarNivel(nivelN);
  if (nubeMapa) nubeMapa.guardado();
  setTimeout(() => { if (nivelD) preguntar("¡Nivel " + fmt(nivelN) + " superado!", () => volverAlMapa(nivelN), { si: "Continuar", no: "Seguir viendo" }); }, 700);
}

zonaJuego.hidden = true;
mapa.abrir();

// Sincroniza los niveles vencidos (⭐) con la cuenta de Google: un nivel vencido en cualquier lado cuenta.
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: ID + ":ganados",
    fusionar: (a, b) => (!a && !b ? null : { ...(b || {}), ...(a || {}) }),
    alCambiar: () => botonesNivel(),
  });
  nubeMapa = m.conectar(ID + "-mapa", { clave: CLAVE_MAPA, fusionar: fusionarMapa, alCambiar: () => mapa.refrescar() }); // progreso del mapa (revisar que las reglas de Firestore acepten este id)
}).catch(() => {});
