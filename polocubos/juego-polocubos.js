// Ruta: polocubos/juego-polocubos.js
// Menú principal estándar (Modo libre · Niveles · Mapa · Salir), mapa de 22 600 niveles SIN niveles todavía, y el Modo libre
// (solo o contra el bot; hojas de 12×12 a 500×500; 100 a 1000 puntos que se sortean al empezar).
// Modo libre: no da puntos al perfil; guarda tu mejor marca en este dispositivo (en solitario). Las metas de tiempo dan monedas una sola vez cada una
// (METAS_EN_LIBRE). Deshacer: 10 gratis por partida; el boost cuesta 30 monedas.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { AJUSTES, BONOS_SORTEO, cuadrosDeSorteo, cubosParaCuadros, cubosASortear, vecinosDePared, DIFICULTADES, PUNTOS_INICIO, ponerPared, premiarCierre, paredesPropias, canjearCubos, puedeJugar, puedeSortear, hayPared, sortearModo, sortearParedes, paredSuelta, cercaDe, PAREDES_POR_CUADRO, crearTablero, completo, clonarTablero, metasDeTiempo, monedasDe, unirCartera } from "./logica-polocubos.js";
import { jugadaBot } from "./ia-polocubos.js";
import { generarInicio } from "./patrones-polocubos.js";

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("es-MX");
const CLAVE_MEJORES = "polocubos_mejores_v1"; // { "<hoja>_<puntos iniciales>": { p: máximo de puntos, c: máximo de cuadros } } (solo en solitario)
const CLAVE_OPC = "polocubos_opciones_v1";     // { pi: puntos iniciales, bot: true si juegas contra el bot }
const ZOOM_MIN_TOQUE = 8;                      // con menos zoom (px por cuadro) no se ponen paredes: no se distingue el lado

let pantalla = "menu", dif = null, t = null;
const J = [null, { p: 0, a: 0, c: 0, cu: 0 }, { p: 0, a: 0, c: 0, cu: 0 }]; // 1 = tú, 2 = bot: puntos (paredes), cubos aleatorios, cadena y cuadros cerrados a mano
const puede = (x) => puedeJugar(J[x]); // ¿tiene con qué jugar? (una línea, o 5 cubos para cambiar por una)
let turno = 1, maxPuntos = 0, cantidad = 20, terminado = false, pausado = false, tBot = 0, ultima = null;
let op = { pi: AJUSTES.puntosInicio, bot: false, sorteo: "bloques" }; // sorteo: "bloques" (cuadros completos al azar) o "paredes" (4 paredes sueltas por cuadro)
try { const g = JSON.parse(localStorage.getItem(CLAVE_OPC)); if (g && PUNTOS_INICIO.includes(g.pi)) op = { pi: g.pi, bot: !!g.bot, sorteo: g.sorteo === "paredes" ? "paredes" : "bloques" }; } catch (e) {}
const porParedes = () => op.sorteo === "paredes";
const cam = { x: 0, y: 0, z: 20 };

// ---------- Deshacer, monedas y tiempo ----------
// Deshacer: 10 gratis por partida (nivel). Cuando se acaban, el botón pasa a ser «Boost»: +10 deshacer por 30 monedas.
// Monedas: se ganan con las metas de tiempo (🥇🥈🥉, una sola vez cada una). No hay límite de tiempo: el reloj solo cuenta.
const CLAVE_CARTERA = "polocubos_cartera_v1"; // { g: monedas ganadas en total, s: gastadas en total, metas: { "<hoja>_<puntos>_<meta>": 1 } }
const METAS_EN_LIBRE = true;                   // false = el Modo libre no da monedas (como dice el estándar de los juegos)
let historial = [], gratis = 0, extra = 0;     // jugadas guardadas, deshacer gratis que quedan y deshacer comprados que quedan
let msJugado = 0, ultimoTick = performance.now(), metas = [], textoTiempo = "";
let listoAntes = false, nube = null;           // listoAntes: ¿ya tenía los cubos mínimos para sortear? (para avisar solo una vez)

function leerCartera() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CARTERA));
    if (c && typeof c === "object") return { g: Number(c.g) || 0, s: Number(c.s) || 0, metas: c.metas && typeof c.metas === "object" ? c.metas : {} };
  } catch (e) {}
  return { g: 0, s: 0, metas: {} };
}
let cartera = leerCartera();
const monedas = () => monedasDe(cartera);
function guardarCartera() {
  try { localStorage.setItem(CLAVE_CARTERA, JSON.stringify(cartera)); } catch (e) {}
  if (nube) nube.guardado();
}
// Sincroniza la cartera con la cuenta (si hay sesión e internet); sin eso el juego funciona igual
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar("polocubos", { clave: CLAVE_CARTERA, fusionar: unirCartera, alCambiar: () => { cartera = leerCartera(); if (t) pintarHud(); } });
}).catch(() => {});

const quedan = () => gratis + extra;
function guardarPaso() { // se llama justo ANTES de cada jugada tuya (pared o sorteo)
  historial.push({ t: clonarTablero(t), j1: { ...J[1] }, j2: { ...J[2] }, turno, maxPuntos, cantidad });
  if (historial.length > AJUSTES.maxHistorial) historial.shift();
}
function deshacer() {
  if (terminado || pausado || turno !== 1) return;
  if (quedan() < 1) { comprarBoost(); return; }   // sin deshacer: el botón es el boost
  if (!historial.length) { aviso("No hay jugadas por deshacer"); return; }
  const s = historial.pop();
  if (gratis > 0) gratis--; else extra--;
  t = s.t; J[1] = s.j1; J[2] = s.j2; turno = s.turno; maxPuntos = s.maxPuntos; cantidad = s.cantidad; ultima = null;
  limpiarCaida();
  clearTimeout(tBot);
  aviso("↩️ Jugada deshecha · te quedan " + quedan());
  pintarHud();
}
function comprarBoost() {
  if (monedas() < AJUSTES.costoBoost) { aviso("Te faltan monedas: tienes " + fmt(monedas()) + " y el boost cuesta " + AJUSTES.costoBoost); return false; }
  cartera.s += AJUSTES.costoBoost; extra += AJUSTES.boostDeshacer; guardarCartera();
  aviso("⚡ Boost: +" + AJUSTES.boostDeshacer + " deshacer (−" + AJUSTES.costoBoost + " monedas)");
  pintarHud();
  return true;
}
function reanudar() { pausado = false; if (turno === 2 && !terminado) programarBot(); }
$("b-deshacer").addEventListener("click", deshacer);

function parpadear(...ids) { // hace parpadear unos segundos (ver .parpadeo en el html)
  for (const id of ids) {
    const el = $(id);
    el.classList.remove("parpadeo"); void el.offsetWidth; el.classList.add("parpadeo");
    setTimeout(() => el.classList.remove("parpadeo"), 4500);
  }
}

function mmss(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}
// El reloj solo cuenta mientras juegas: se detiene en la pausa, al terminar y si la pestaña está oculta
setInterval(() => {
  const ahora = performance.now(), d = ahora - ultimoTick;
  ultimoTick = ahora;
  if (pantalla !== "partida" || !t || terminado || pausado || document.hidden || d > 2000) return;
  msJugado += d;
  pintarTiempo();
}, 250);
function pintarTiempo() {
  let txt = "";
  if (!op.bot && t) {
    const seg = Math.floor(msJugado / 1000), sig = metas.find((m) => seg <= m.seg); // sig = la meta más difícil que aún se puede lograr
    txt = `<small>⏱️ Tiempo</small>${mmss(seg)}` + (sig ? ` · ${sig.icono} ${mmss(sig.seg)}` : "");
  }
  if (txt !== textoTiempo) { textoTiempo = txt; $("c-tiempo").innerHTML = txt; }
}
// Al completar la hoja: cada meta alcanzada que aún no habías cobrado paga una vez. Devuelve las metas nuevas.
function pagarMetas() {
  const seg = Math.floor(msJugado / 1000), nuevas = [];
  for (const m of metas) {
    const k = dif.id + "_" + op.pi + (porParedes() ? "p" : "") + "_" + m.id; // el sorteo por paredes tiene sus propias metas
    if (seg <= m.seg && !cartera.metas[k]) { cartera.metas[k] = 1; cartera.g += m.monedas; nuevas.push(m); }
  }
  if (nuevas.length) guardarCartera();
  return nuevas;
}

// ---------- Mejores marcas ----------
const leerMejores = () => { try { return JSON.parse(localStorage.getItem(CLAVE_MEJORES)) || {}; } catch (e) { return {}; } };
const claveMejor = (d) => d.id + "_" + op.pi + (porParedes() ? "p" : ""); // el sorteo por paredes tiene sus propias marcas
function guardarMejor() {
  if (!t || !dif || op.bot) return;
  const m = leerMejores(), k = claveMejor(dif), a = m[k] || { p: 0, c: 0 };
  m[k] = { p: Math.max(a.p, maxPuntos), c: Math.max(a.c, t.cuadros) };
  try { localStorage.setItem(CLAVE_MEJORES, JSON.stringify(m)); } catch (e) {}
}
addEventListener("pagehide", guardarMejor);

// ---------- Aviso breve ----------
let temporizador = 0;
function aviso(texto) {
  const a = $("aviso");
  a.textContent = texto; a.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => (a.hidden = true), 1800);
}

// ---------- Mapa estándar (sin niveles todavía) ----------
const mapa = montarMapa({
  prefijo: "polocubos",
  etapas: crearEtapas({ porEtapa: 100 }), // 32 estados + 194 países, 100 niveles cada uno = 22 600
  progreso: () => ({ max: 1, hecho: 0 }),
  jugarNivel: () => aviso("🚧 Los niveles todavía no están creados"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-verde", fn: () => { ir("libre"); } }],
});

// ---------- Pantallas ----------
function ir(p) {
  if (pantalla === "partida" && p !== "partida") { guardarMejor(); clearTimeout(tBot); limpiarCaida(); }
  pantalla = p;
  $("menu").hidden = p !== "menu";
  $("libre").hidden = p !== "libre";
  $("partida").hidden = p !== "partida";
  $("fin").hidden = true;
  if (p !== "mapa" && mapa.abierto()) mapa.cerrar();
  const b = $("btn-menu");
  b.hidden = p === "menu"; // el ☰ no se ve en el menú principal
  b.querySelector(".t").textContent = p === "partida" ? "Pausa" : "Menú principal";
  if (p === "libre") pintarLibre();
  if (p === "partida") { ajustarLienzo(); ajustarVista(); }
}
function abrirMapa(n) { ir("mapa"); mapa.abrir(n); }

// ---------- Info ----------
// Desde ☰ Pausa la partida sigue en pausa mientras se lee; al cerrar se reanuda.
function abrirInfo() { $("info").hidden = false; try { $("info-cerrar").focus({ preventScroll: true }); } catch (e) {} }
function cerrarInfo() { if ($("info").hidden) return; $("info").hidden = true; if (pantalla === "partida") reanudar(); }
$("b-info-libre").addEventListener("click", abrirInfo);
$("info-cerrar").addEventListener("click", cerrarInfo);
$("info").addEventListener("click", (e) => { if (e.target === $("info")) cerrarInfo(); });
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("info").hidden) { e.preventDefault(); e.stopPropagation(); cerrarInfo(); } }, true);

$("btn-menu").addEventListener("click", () => (pantalla === "partida" ? pausa.abrir() : ir("menu")));
$("b-libre").addEventListener("click", () => ir("libre"));
$("b-niveles").addEventListener("click", () => abrirMapa(1));
$("b-mapa").addEventListener("click", () => abrirMapa());

// ---------- Modo libre: opciones y tamaños de hoja ----------
function guardarOpciones() { try { localStorage.setItem(CLAVE_OPC, JSON.stringify(op)); } catch (e) {} }
function fichas(contenedor, items, activo, alElegir) {
  contenedor.replaceChildren();
  for (const [valor, texto] of items) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d chico txt b-gris" + (valor === activo ? " on" : "");
    b.setAttribute("aria-pressed", String(valor === activo));
    b.textContent = texto;
    b.addEventListener("click", () => { alElegir(valor); guardarOpciones(); pintarLibre(); });
    contenedor.appendChild(b);
  }
}
function pintarLibre() {
  fichas($("o-puntos"), PUNTOS_INICIO.map((v) => [v, String(v)]), op.pi, (v) => (op.pi = v));
  fichas($("o-modo"), [[false, "👤 Solo"], [true, "🤖 Contra el bot"]], op.bot, (v) => (op.bot = v));
  fichas($("o-sorteo"), [["bloques", "🟦 Por bloques"], ["paredes", "🧱 Por paredes (×4)"]], op.sorteo, (v) => (op.sorteo = v));
  const m = leerMejores(), cont = $("dificultades");
  cont.replaceChildren();
  for (const d of DIFICULTADES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + d.clase;
    b.innerHTML = `<span class="b-ico">${d.icono}</span> ${d.nombre} · ${d.n}×${d.n}`;
    const rec = !op.bot && m[claveMejor(d)];
    if (rec) { const i = document.createElement("span"); i.className = "b-info"; i.textContent = "🏆 " + fmt(rec.p); i.title = "Tu máximo de puntos con " + op.pi + " iniciales"; b.appendChild(i); }
    b.addEventListener("click", () => empezar(d));
    cont.appendChild(b);
  }
}

// ---------- Menú de pausa estándar ----------
const pausa = crearMenuPausa({
  puedeAbrir: () => pantalla === "partida" && !terminado,
  alAbrir: () => { pausado = true; clearTimeout(tBot); },                                   // el bot espera
  alContinuar: reanudar,
  extras: () => [
    { icono: "ℹ️", texto: "Info", clase: "b-azul", alElegir: abrirInfo },
    { icono: "↩️", texto: "Comprar +" + AJUSTES.boostDeshacer + " deshacer", clase: "b-oro", ayuda: "Cuesta " + AJUSTES.costoBoost + " monedas · tienes " + fmt(monedas()), deshabilitado: monedas() < AJUSTES.costoBoost, alElegir: () => { reanudar(); comprarBoost(); } },
    { icono: "🔁", texto: "Reiniciar tablero", clase: "b-azul", ayuda: "Se sortean " + op.pi + " puntos (" + fmt(Math.floor(op.pi / AJUSTES.costoSorteo)) + (porParedes() ? " cuadros = " + fmt(Math.floor(op.pi / AJUSTES.costoSorteo) * PAREDES_POR_CUADRO) + " paredes" : " cuadros") + ") al azar y empiezas con " + AJUSTES.puntosJugar + " puntos", alElegir: () => empezar(dif) },
  ],
  ayudaSalir: "Se pierde esta partida" + (op.bot ? "" : " (tu mejor marca se conserva)"),
  alSalir: () => ir("menu"),
});

// ---------- Partida ----------
function empezar(d) {
  clearTimeout(tBot);
  limpiarCaida();
  dif = d;
  // Los puntos elegidos se colocan solos como cuadros cerrados (2 puntos por cuadro) y cada jugador se queda con puntosJugar.
  // En hojas chicas se limita para no llenarlas desde el principio. Van al azar (95 % o más); solo un 5 % o menos se arma en «peines» con pasillos de
  // cuadros a una pared de cerrarse (patrones-polocubos.js), y un bot de backtracking comprueba que se puedan juntar los cubos mínimos para poder sortear (AJUSTES.tanda).
  const inicial = Math.min(Math.floor(op.pi / AJUSTES.costoSorteo), Math.floor(d.n * d.n * AJUSTES.maxInicial));
  let g;
  if (porParedes()) {
    // Sorteo por paredes: cada cuadro del sorteo vale 4 paredes sueltas al azar (p. ej. 500 cuadros → 2000 paredes); como mucho maxInicial de todas las paredes de la hoja
    g = { t: crearTablero(d.n), cumple: true };
    sortearParedes(g.t, Math.min(inicial * PAREDES_POR_CUADRO, Math.floor(2 * d.n * (d.n + 1) * AJUSTES.maxInicial)));
  } else g = generarInicio(d.n, inicial, { lineas: AJUSTES.puntosJugar });
  t = g.t;
  if (!g.cumple) console.info("Polocubos: este tablero deja juntar " + g.cubos + " de los " + AJUSTES.tanda + " cubos para poder sortear (pocos cuadros cerrados para la hoja)");
  J[1] = { p: AJUSTES.puntosJugar, a: 0, c: 0, cu: 0, ult: -1, combo: 0 }; J[2] = { p: AJUSTES.puntosJugar, a: 0, c: 0, cu: 0, ult: -1, combo: 0 };
  maxPuntos = AJUSTES.puntosJugar; turno = 1; terminado = false; pausado = false; ultima = null;
  cantidad = AJUSTES.tanda;
  historial = []; gratis = AJUSTES.deshacerGratis; extra = 0; listoAntes = false; // deshacer: 10 gratis en cada partida
  msJugado = 0; ultimoTick = performance.now();
  metas = op.bot || !METAS_EN_LIBRE ? [] : metasDeTiempo(d, d.n * d.n - t.cuadros);
  ir("partida");
  pintarHud();
  aviso("🧩 " + (porParedes() ? fmt(t.LH.length + t.LV.length) + " paredes sueltas (" + fmt(t.cuadros) + " cuadros cerrados)" : fmt(t.cuadros) + " cuadros colocados") + " · busca cuadritos a los que solo les falta una pared · empiezas con " + AJUSTES.puntosJugar + " puntos");
}

// Cada vez que «a» junta AJUSTES.autoSorteo puntos, se gastan solos en sortear cuadros al azar (sin premio, como el sorteo normal).
// Devuelve cuántos cuadros sorteó.
function autoSortear(a) {
  const j = J[a], por = Math.floor(AJUSTES.autoSorteo / AJUSTES.costoSorteo);
  let total = 0;
  const antes = marcaCaida();
  while (j.p >= AJUSTES.autoSorteo && !completo(t)) {
    const hechos = sortearModo(t, por, op.sorteo);
    if (!hechos) break;
    j.p -= hechos * AJUSTES.costoSorteo; total += hechos;
  }
  if (total) animarCaida(antes);
  return total;
}

const maxSortear = () => Math.max(0, Math.min(J[1].a, t.n * t.n - t.cuadros)); // el sorteo manual se paga con cubos aleatorios

function pintarHud() {
  const listo = puedeSortear(J[1]); // ¿ya tienes 50 cubos o más? entonces el botón Sortear está abierto
  if (listo && !listoAntes && !terminado) {
    aviso("🎲 ¡Ya tienes " + AJUSTES.tanda + " cubos! Ya puedes sortear · " + BONOS_SORTEO.map((b) => b.cubos + " = " + b.cuadros).reverse().join(" · "));
    parpadear("b-sortear", "c-azar");
  }
  listoAntes = listo;
  cantidad = cubosASortear(J[1].a); // el sorteo gasta todos los cubos de 5 en 5
  const chip = (id, txt) => ($(id).innerHTML = txt); // chip vacío = oculto
  chip("c-pts", `<small>${op.bot ? "Tú · puntos" : "Puntos"}</small>${fmt(J[1].p)}`);
  chip("c-azar", `<small>🎲 Cubos</small>${fmt(J[1].a)}${listo ? " ✓" : "/" + AJUSTES.tanda}`); // «/5» = cubos que necesitas para poder sortear
  chip("c-monedas", '<span class="moneda"></span>' + fmt(monedas()));
  chip("c-bot", op.bot ? `<small>🤖 Bot</small>${fmt(J[2].p)} · 🎲${fmt(J[2].a)}` : "");
  chip("c-cuadros", `<small>Cuadros</small>${fmt(t.cuadros)}/${fmt(t.n * t.n)}`);
  $("c-cadena").textContent = terminado ? "" : op.bot && turno === 2 ? "🤖 Turno del bot"
    : J[1].c > 1 ? "🔗 Cadena ×" + J[1].c : op.bot ? "Tu turno" : "";
  $("c-cant").textContent = fmt(J[1].a); // cubos aleatorios que tiene el jugador
  $("t-sortear").textContent = "Sortear";
  $("b-sortear").disabled = terminado || turno !== 1 || !listo;
  const q = quedan(); // sin deshacer, el botón es el boost
  $("t-deshacer").textContent = q > 0 ? "Deshacer (" + q + ")" : "Boost +" + AJUSTES.boostDeshacer + " · " + AJUSTES.costoBoost + " monedas";
  $("b-deshacer").disabled = terminado || turno !== 1 || (q > 0 && !historial.length);
  pintarTiempo();
  pedirDibujo();
}

// Pared puesta por «a» (1 = tú, 2 = bot): cuesta 1 punto. Si cierra cuadros, el premio depende de cuántas paredes de ese cuadro puso él (premiarCierre):
//   1 pared → +1 cubo aleatorio y recupera su punto · 2 o más → +2 puntos. Las paredes de un cuadro cerrado ya no cuentan para los vecinos.
// Devuelve true si cerró algún cuadro (y entonces sigue jugando quien la puso).
function poner(a, tipo, r, c) {
  const j = J[a];
  j.p -= AJUSTES.costoPared;
  const cerrados = ponerPared(t, tipo, r, c, a);
  ultima = a === 2 ? { tipo, r, c } : null;
  if (!cerrados.length) { j.c = 0; return false; } // una pared que no cierra nada rompe la cadena
  // Combo: solo cuenta un cuadro cerrado con UNA sola pared tuya (se mide ANTES de premiarCierre, que gasta las paredes), seguido (sin romper la cadena)
  // y a radioCombo cuadros o menos del anterior. El 1.º no da nada; el 2.º es el combo 1 (1 línea al azar), el 3.º el combo 2 (2 líneas)...
  // hasta el combo 5 (5 líneas); del 6.º en adelante siguen siendo 5. Las líneas nunca cierran un cuadro; si ya no hay lugar seguro, la línea se guarda como moneda.
  const unaPared = cerrados.map((k) => paredesPropias(t, k, a) <= 1);
  const { puntos, cubos } = premiarCierre(t, cerrados, a);
  let paredes = 0, sinLugar = 0, nivel = 0;
  cerrados.forEach((k, i) => {
    j.combo = !unaPared[i] ? 0 : j.c > 0 && cercaDe(t, j.ult, k) ? j.combo + 1 : 1; // con 2 o más paredes propias el combo se rompe
    j.ult = k; j.c++; t.dueno[k] = a; j.cu++;
    if (j.combo >= 2) {
      nivel = j.combo - 1;
      for (let x = Math.min(nivel, AJUSTES.maxLineasCombo); x > 0; x--) { if (paredSuelta(t)) paredes++; else sinLugar++; }
    }
  });
  j.p += puntos; j.a += cubos;
  const monedasCombo = sinLugar && a === 1 && !op.bot ? sinLugar * AJUSTES.monedasPorLineaCombo : 0; // el bot no gana monedas; contra el bot tampoco (igual que las metas)
  if (monedasCombo) { cartera.g += monedasCombo; guardarCartera(); }
  const partes = [];
  if (puntos) partes.push("+" + puntos + (puntos === 1 ? " punto" : " puntos"));
  if (cubos) partes.push("+" + cubos + (cubos === 1 ? " cubo 🎲" : " cubos 🎲"));
  if (paredes) partes.push("🔥 combo ×" + nivel + ": +" + paredes + (paredes === 1 ? " pared al azar" : " paredes al azar"));
  if (monedasCombo) partes.push("🪙 hoja llena: combo guardado como +" + monedasCombo + (monedasCombo === 1 ? " moneda" : " monedas"));
  aviso((a === 2 ? "🤖 " : "") + partes.join(" · ") + (j.c > 1 ? " · cadena ×" + j.c : ""));
  return true;
}

function jugarPared(tipo, r, c) {
  if (terminado || turno !== 1 || hayPared(t, tipo, r, c)) return;
  if (J[1].p < AJUSTES.costoPared) { aviso("Te faltan puntos"); return; }
  guardarPaso();
  revisar(!poner(1, tipo, r, c), 1);
}

$("b-sortear").addEventListener("click", () => {
  if (terminado || turno !== 1) return;
  if (!puedeSortear(J[1])) { aviso("🎲 Necesitas " + AJUSTES.tanda + " cubos para sortear (tienes " + fmt(J[1].a) + ")"); return; }
  guardarPaso();
  const usar = cubosASortear(J[1].a), pedidos = cuadrosDeSorteo(usar); // todos los cubos de 5 en 5: 5 → 10 cuadros, 10 → 20, 20 → 40, 30 → 60, 40 → 90, 50 → 120
  const antes = marcaCaida();
  const hechos = sortearModo(t, pedidos, op.sorteo);
  const gasto = hechos < pedidos ? cubosParaCuadros(hechos, usar) : usar;      // si la hoja ya no tiene tantos cuadros libres, no se gastan cubos de más
  J[1].a -= gasto; J[1].c = 0; ultima = null;
  animarCaida(antes);
  aviso("🎲 " + fmt(hechos) + (hechos === 1 ? " cuadro sorteado" : " cuadros sorteados") + " (−" + gasto + (gasto === 1 ? " cubo)" : " cubos)"));
  revisar(true, 1);
});

// Después de cada jugada: ¿terminó la partida? ¿de quién es el turno? (sortear o una pared sin cerrar pasan el turno al rival)
function revisar(terminaTurno, a) {
  const auto = autoSortear(a); // al llegar a 100 puntos se colocan solos al azar
  if (auto) aviso((a === 2 ? "🤖 " : "") + "🎲 " + AJUSTES.autoSorteo + " puntos → " + auto + (auto === 1 ? " cuadro" : " cuadros") + " al azar");
  for (const x of op.bot ? [1, 2] : [1]) // sin puntos: 5 cubos aleatorios se cambian solos por 1 punto
    if (canjearCubos(J[x])) aviso((x === 2 ? "🤖 " : "") + "🎲 " + AJUSTES.cubosPorLinea + " cubos → 1 punto");
  if (J[1].p > maxPuntos) maxPuntos = J[1].p;
  if (completo(t) || (op.bot ? !puede(1) && !puede(2) : !puede(1))) return terminar();
  if (op.bot) {
    if (terminaTurno) { J[a].c = 0; turno = a === 1 ? 2 : 1; }
    if (!puede(turno)) turno = turno === 1 ? 2 : 1; // quien se quedó sin puntos ni cubos no puede jugar: sigue el otro
  }
  pintarHud();
  if (turno === 2) programarBot();
}

function programarBot() {
  clearTimeout(tBot);
  tBot = setTimeout(pasoBot, !puede(1) ? 200 : 650);
}
function pasoBot() {
  if (pausado || terminado || turno !== 2) return;
  const m = jugadaBot(t, J[2].p, J[2].a);
  if (!m) { revisar(true, 2); return; } // no puede jugar (sin puntos y sin 50 cubos)
  if (m.accion === "sortear") {
    const antes = marcaCaida();
    const usar = cubosASortear(Math.min(m.cantidad, J[2].a)), pedidos = cuadrosDeSorteo(usar);
    const hechos = sortearModo(t, pedidos, op.sorteo);
    J[2].a -= hechos < pedidos ? cubosParaCuadros(hechos, usar) : usar; ultima = null;
    animarCaida(antes);
    aviso("🤖 sorteó " + hechos + (hechos === 1 ? " cuadro" : " cuadros"));
    revisar(true, 2);
  } else revisar(!poner(2, m.tipo, m.r, m.c), 2);
}

function terminar() {
  terminado = true; clearTimeout(tBot); guardarMejor(); pintarHud();
  const total = fmt(t.n * t.n);
  if (op.bot) {
    const [a, b] = [J[1], J[2]];
    $("fin-titulo").textContent = a.p > b.p ? "¡Le ganaste al bot! 🏆" : a.p < b.p ? "Ganó el bot 🤖" : "¡Empate!";
    $("fin-texto").textContent = `Tú: ${fmt(a.p)} puntos (${fmt(a.cu)} cuadros). Bot: ${fmt(b.p)} puntos (${fmt(b.cu)} cuadros).`;
  } else if (completo(t)) {
    const seg = Math.floor(msJugado / 1000), nuevas = pagarMetas();
    let metasTxt = "";
    if (nuevas.length) metasTxt = ` Metas nuevas: ${nuevas.map((m) => m.icono + " +" + fmt(m.monedas)).join(" · ")} monedas.`;
    else if (metas.length && metas.some((m) => seg <= m.seg)) metasTxt = " Alcanzaste metas de tiempo, pero ya las habías cobrado.";
    else if (metas.length) { const f = metas[metas.length - 1]; metasTxt = ` Para la meta ${f.icono} necesitabas ${mmss(f.seg)}.`; }
    $("fin-titulo").textContent = "¡Hoja completa! 🎉";
    $("fin-texto").textContent = `Cerraste los ${total} cuadros en ${mmss(seg)} y terminaste con ${fmt(J[1].p)} puntos.` + metasTxt;
  } else {
    $("fin-titulo").textContent = "Sin puntos";
    $("fin-texto").textContent = `Te quedaste sin puntos y sin ${AJUSTES.cubosPorLinea} cubos para cambiar por 1 punto, así que ya no puedes hacer más cubos. Cerraste ${fmt(t.cuadros)} de ${total} cuadros.`;
  }
  $("fin").hidden = false;
}
$("fin-otra").addEventListener("click", () => empezar(dif));
$("fin-menu").addEventListener("click", () => ir("menu"));

// ---------- Dibujo (canvas transparente; la hoja es el propio tablero) ----------
// Se dibuja desde las listas de paredes y cuadros ya puestos (t.LH, t.LV, t.LC), así una hoja de 500×500 no recorre 250 000 cuadros por cuadro de animación.
const cv = $("tablero"), ctx = cv.getContext("2d");
const COLORES = ["rgba(63,160,255,.30)", "rgba(46,190,90,.40)", "rgba(240,120,40,.42)"]; // sorteo/rebote, tú, bot
let dpr = 1, pendiente = false;
function ajustarLienzo() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
  pedirDibujo();
}
const zFit = () => (Math.min(cv.clientWidth, cv.clientHeight) * 0.94) / t.n;
function ajustarVista() { // toda la hoja a la vista
  if (!t) return;
  cam.z = zFit();
  cam.x = (cv.clientWidth - t.n * cam.z) / 2; cam.y = (cv.clientHeight - t.n * cam.z) / 2;
  pedirDibujo();
}
function limitar() { // la hoja nunca se aleja más de la mitad de la pantalla
  const w = cv.clientWidth, h = cv.clientHeight;
  cam.x = Math.min(w / 2, Math.max(w / 2 - t.n * cam.z, cam.x));
  cam.y = Math.min(h / 2, Math.max(h / 2 - t.n * cam.z, cam.y));
}
function pedirDibujo() { if (!pendiente) { pendiente = true; requestAnimationFrame(dibujar); } }

function dibujar() {
  pendiente = false;
  if (!t || pantalla !== "partida") return;
  aterrizar();
  const w = cv.clientWidth, h = cv.clientHeight, n = t.n, m = n + 1, { x, y, z } = cam;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  ctx.fillStyle = "#fffdf6"; ctx.fillRect(x, y, n * z, n * z); ctx.restore();
  const c0 = Math.max(0, Math.floor(-x / z)), c1 = Math.min(n, Math.ceil((w - x) / z));
  const r0 = Math.max(0, Math.floor(-y / z)), r1 = Math.min(n, Math.ceil((h - y) / z));
  const tam = Math.max(z, 1);
  let ultimo = -1;
  for (const k of t.LC) { // cuadros cerrados
    const r = (k / n) | 0, c = k - r * n;
    if (r < r0 || r >= r1 || c < c0 || c >= c1) continue;
    if (cayendo.size && cayendo.has(k)) continue; // todavía va cayendo del cielo
    const d = t.dueno[k];
    if (d !== ultimo) { ctx.fillStyle = COLORES[d]; ultimo = d; }
    ctx.fillRect(x + c * z, y + r * z, tam, tam);
  }
  const paso = z >= 6 ? 1 : z >= 2 ? 10 : 50; // cuadrícula de libreta: con poco zoom solo cada 10 o 50 líneas
  ctx.strokeStyle = "#b9d6f2"; ctx.lineWidth = 1; ctx.beginPath();
  for (let c = Math.ceil(c0 / paso) * paso; c <= c1; c += paso) { ctx.moveTo(x + c * z, y + r0 * z); ctx.lineTo(x + c * z, y + r1 * z); }
  for (let r = Math.ceil(r0 / paso) * paso; r <= r1; r += paso) { ctx.moveTo(x + c0 * z, y + r * z); ctx.lineTo(x + c1 * z, y + r * z); }
  ctx.stroke();
  const grosor = Math.max(z >= 8 ? 2 : 1.5, z * 0.14);
  ctx.strokeStyle = "#16255e"; ctx.lineWidth = grosor; ctx.lineCap = "round"; ctx.beginPath(); // paredes (tinta)
  for (const i of t.LH) { const r = (i / n) | 0, c = i - r * n; if (r < r0 || r > r1 || c < c0 || c >= c1) continue; if (oculP.size && oculP.has(i)) continue; ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + (c + 1) * z, y + r * z); }
  for (const i of t.LV) { const r = (i / m) | 0, c = i - r * m; if (r < r0 || r >= r1 || c < c0 || c > c1) continue; if (oculP.size && oculP.has(-i - 1)) continue; ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + c * z, y + (r + 1) * z); }
  ctx.stroke();
  if (ultima) { // última pared del bot, para que se vea qué hizo
    const { tipo, r, c } = ultima;
    ctx.strokeStyle = "#e8590c"; ctx.lineWidth = grosor * 1.3; ctx.beginPath();
    ctx.moveTo(x + c * z, y + r * z); ctx.lineTo(x + (c + (tipo === "H" ? 1 : 0)) * z, y + (r + (tipo === "V" ? 1 : 0)) * z); ctx.stroke();
  }
  dibujarCaida(x, y, z, grosor);
}

// ---------- Cuadros que caen del cielo ----------
// Cuando se sortean cuadros (a mano, el bot o los 100 puntos automáticos) los datos del tablero ya están puestos, pero lo que se VE
// se retrasa: cada cuadro nuevo (y sus paredes nuevas) se oculta y se dibuja como un bloque que cae desde arriba de la pantalla, girando,
// con una sombra que crece en su lugar; al aterrizar aparece el cuadro y sale un pequeño destello. Para no gastar de más:
//   · solo caen los cuadros que se ven en pantalla (como máximo MAX_CAIDA), el resto aparece directo;
//   · con poco zoom (cuadros de menos de 4 px) o con «reducir movimiento» activado no hay animación.
const MAX_CAIDA = 120, ZOOM_MIN_CAIDA = 4, MS_IMPACTO = 280;
const SIN_MOVIMIENTO = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const cayendo = new Map();   // cuadro (r*n+c) → { t0, dur, giro, paredes: [llaves ocultas] }
const oculP = new Map();     // llave de pared nueva (H: i, V: −i−1) → cuántos cuadros que caen la necesitan todavía
let impactos = [];           // [{ k, t0 }] destellos de aterrizaje

const marcaCaida = () => ({ c: t.LC.length, h: t.LH.length, v: t.LV.length }); // se toma ANTES de sortear
function limpiarCaida() { cayendo.clear(); oculP.clear(); impactos = []; }

function animarCaida(antes) {
  if (SIN_MOVIMIENTO || !t || cam.z < ZOOM_MIN_CAIDA || pantalla !== "partida") return;
  const n = t.n, w = cv.clientWidth, h = cv.clientHeight;
  const nuevos = t.LC.slice(antes.c);          // cuadros que cerró este sorteo (en orden aleatorio)
  const anim = [];
  for (const k of nuevos) {
    const r = (k / n) | 0, c = k - r * n, px = cam.x + c * cam.z, py = cam.y + r * cam.z;
    if (px + cam.z < 0 || px > w || py + cam.z < 0 || py > h) continue; // fuera de pantalla: aparece directo
    anim.push(k);
    if (anim.length >= MAX_CAIDA) break;
  }
  if (!anim.length) return;
  const esN = new Set(nuevos), esA = new Set(anim), ahora = performance.now();
  const dispersion = Math.min(1000, 250 + anim.length * 12); // más cuadros → llueven durante más tiempo
  const paredes = new Map(anim.map((k) => [k, []]));
  // Paredes nuevas: solo se ocultan las que pertenecen únicamente a cuadros que caen (si las usa uno que aparece directo, se ven ya)
  const ocultar = (tipo, lista, desde, ancho) => {
    for (let q = desde; q < lista.length; q++) {
      const i = lista[q], r = (i / ancho) | 0, c = i - r * ancho;
      const vec = vecinosDePared(t, tipo, r, c).filter((k) => esN.has(k));
      if (!vec.length || vec.some((k) => !esA.has(k))) continue;
      const llave = tipo === "H" ? i : -i - 1;
      oculP.set(llave, vec.length);
      for (const k of vec) paredes.get(k).push(llave);
    }
  };
  ocultar("H", t.LH, antes.h, n);
  ocultar("V", t.LV, antes.v, n + 1);
  for (const k of anim) cayendo.set(k, { t0: ahora + Math.random() * dispersion, dur: 520 + Math.random() * 320, giro: (Math.random() - 0.5) * 1.4, paredes: paredes.get(k) });
  pedirDibujo();
}

// Los bloques que ya llegaron al suelo: sus cuadros y paredes dejan de estar ocultos y sueltan un destello
function aterrizar() {
  if (!cayendo.size && !impactos.length) return;
  const ahora = performance.now();
  for (const [k, o] of cayendo) {
    if (ahora < o.t0 + o.dur) continue;
    cayendo.delete(k);
    for (const llave of o.paredes) { const q = (oculP.get(llave) || 1) - 1; if (q > 0) oculP.set(llave, q); else oculP.delete(llave); }
    impactos.push({ k, t0: ahora });
  }
  impactos = impactos.filter((i) => ahora - i.t0 < MS_IMPACTO);
}

function dibujarCaida(x, y, z, grosor) {
  if (!cayendo.size && !impactos.length) return;
  const n = t.n, ahora = performance.now(), w = cv.clientWidth;
  ctx.save();
  for (const [k, o] of cayendo) {
    if (ahora < o.t0) continue;                               // todavía no le toca caer
    const r = (k / n) | 0, c = k - r * n, cx = x + c * z, cy = y + r * z;
    const p = Math.min(1, (ahora - o.t0) / o.dur), e = p * p;  // cae acelerando, como con gravedad
    const inicio = Math.min(-z * 2, cy - 140);                 // arranca arriba de la pantalla (y al menos 140 px más arriba que su lugar)
    const cyy = cy + (inicio - cy) * (1 - e);
    if (cx + z < 0 || cx > w) continue;
    ctx.fillStyle = "rgba(20,30,70," + (0.26 * e) + ")";      // sombra en el lugar donde va a caer: crece y se oscurece
    const sh = z * (0.5 + 0.5 * e), off = (z - sh) / 2;
    ctx.fillRect(cx + off, cy + off, sh, sh);
    const s = 1 + 0.7 * (1 - e);                               // más grande al principio (está más cerca de la cámara)
    ctx.save();
    ctx.translate(cx + z / 2, cyy + z / 2); ctx.rotate(o.giro * (1 - e)); ctx.scale(s, s);
    ctx.fillStyle = "#79bbff"; ctx.fillRect(-z / 2, -z / 2, z, z);
    ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(-z / 2, -z / 2, z, z * 0.3); // cara de arriba del cubo
    ctx.lineWidth = Math.max(1.5, grosor); ctx.strokeStyle = "#16255e"; ctx.strokeRect(-z / 2, -z / 2, z, z);
    ctx.restore();
  }
  for (const i of impactos) { // destello: un marco que se abre y se desvanece
    const p = (ahora - i.t0) / MS_IMPACTO, r = (i.k / n) | 0, c = i.k - r * n, g = z * 0.45 * p;
    ctx.strokeStyle = "rgba(22,37,94," + (0.55 * (1 - p)) + ")"; ctx.lineWidth = 2;
    ctx.strokeRect(x + c * z - g, y + r * z - g, z + 2 * g, z + 2 * g);
  }
  ctx.restore();
  pedirDibujo(); // sigue animando hasta que no quede nada cayendo
}

// ---------- Zoom, arrastre y toque ----------
function zoomEn(px, py, f) {
  const nz = Math.max(zFit() * 0.9, Math.min(90, cam.z * f)), k = nz / cam.z;
  cam.x = px - (px - cam.x) * k; cam.y = py - (py - cam.y) * k; cam.z = nz;
  limitar(); pedirDibujo();
}
const centro = () => [cv.clientWidth / 2, cv.clientHeight / 2];
cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomEn(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
addEventListener("resize", () => { if (pantalla === "partida") { ajustarLienzo(); ajustarVista(); } });

const punteros = new Map();
let movido = false, variosDedos = false, pinza = 0;
cv.addEventListener("pointerdown", (e) => {
  cv.setPointerCapture(e.pointerId);
  punteros.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  if (punteros.size === 1) { movido = false; variosDedos = false; }
  else { variosDedos = true; const [a, b] = [...punteros.values()]; pinza = Math.hypot(a.x - b.x, a.y - b.y); }
});
cv.addEventListener("pointermove", (e) => {
  const p = punteros.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (punteros.size === 1) {
    if (!movido && Math.hypot(p.x - p.x0, p.y - p.y0) > 8) movido = true;
    if (movido) { cam.x += dx; cam.y += dy; limitar(); pedirDibujo(); }
  } else if (punteros.size === 2) {
    movido = true;
    const [a, b] = [...punteros.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinza) zoomEn((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinza);
    pinza = d;
  }
});
function soltar(e) {
  const p = punteros.get(e.pointerId);
  punteros.delete(e.pointerId);
  if (punteros.size < 2) pinza = 0;
  if (p && e.type === "pointerup" && !movido && !variosDedos && punteros.size === 0) tocar(e.clientX, e.clientY);
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);

// Un toque pone la pared del lado del cuadro que quedó más cerca del dedo
function tocar(px, py) {
  if (!t || terminado || turno !== 1) return;
  if (cam.z < ZOOM_MIN_TOQUE) { aviso("🔍 Acércate para poner paredes"); return; }
  const wx = (px - cam.x) / cam.z, wy = (py - cam.y) / cam.z;
  if (wx < 0 || wy < 0 || wx >= t.n || wy >= t.n) return;
  const c = Math.floor(wx), r = Math.floor(wy), fx = wx - c, fy = wy - r;
  const m = Math.min(fx, 1 - fx, fy, 1 - fy);
  if (m === fy) jugarPared("H", r, c);
  else if (m === 1 - fy) jugarPared("H", r + 1, c);
  else if (m === fx) jugarPared("V", r, c);
  else jugarPared("V", r, c + 1);
}

ir("menu");
