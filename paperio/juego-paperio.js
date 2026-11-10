// Ruta: paperio/juego-paperio.js
// «Paperio» (estilo Paper.io 2): sales de tu territorio dejando una estela y, al volver, te quedas con todo lo que encerraste.
// - Si alguien toca tu estela (o tú la tuya), pierdes todo; si tú tocas la estela de otro, pierde él.
// - Si te quedas sin territorio, pierdes. Los bots reaparecen solos; tú no (se acaba la partida).
// - Cada nivel tiene un mapa con una forma distinta (ver niveles-paperio.js). Todos se mueven LIBRES (por ángulo), girando en curvas.
// - Para pasar de nivel hay que conquistar el % de mapa que pide el nivel («meta»).
// - El territorio vive en una rejilla fina (cada casilla es muy pequeña) que se dibuja estirada y suavizada,
//   así los bordes se ven redondeados y no «cuadrados».
import { NIVELES, crearForma } from "./niveles-paperio.js";
import { montarMapa } from "./paperio-mapa.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
const ID = "paperio";

// ----- Ajustes -----
const RADIO = 300;                    // «tamaño» de los mapas: el cuadrado de -1 a 1 de niveles-paperio.js mide 2·RADIO casillas finas
const FACTOR_VEL = 1.2;               // multiplicador de velocidad de TODOS (1 = original; 1.5 = 50 % más rápido). Escala también los giros para que las curvas midan lo mismo
const VEL = 38 * FACTOR_VEL;                       // velocidad (casillas por segundo)
const GIRO = 5.5 * FACTOR_VEL;                     // giro de los bots (radianes por segundo): más alto = giros más cerrados
const ANGULO_CHOQUE = 15;             // grados: si llegas al borde con menos de esto respecto a ir «de frente», mueres; si no, te deslizas
const COS_CHOQUE = Math.cos(ANGULO_CHOQUE * Math.PI / 180);
const GIRO_JUGADOR = 8 * FACTOR_VEL;               // giro del jugador (más alto = responde más rápido y preciso a las teclas/dedo)
const MARGEN_PARED = 2.5;             // distancia a la pared a la que ya cuenta como roce
const PUNTOS_POR_NIVEL = 50;          // puntos extra por pasar un nivel
const DESBLOQUEAR_TODOS = false;      // true = todos los niveles disponibles desde el inicio (útil para probar)
const R_CABEZA = 3;                   // tamaño de la cabeza (para choques)
const R_RASTRO = 2;                   // grosor de la estela
const R_MONEDA = 3.4;                 // radio (en casillas) con que se dibujan las monedas del bono
const R_RECOGER = 6.5;                // a esta distancia de la cabeza se recoge una moneda del bono
const R_INICIO = 9;                   // radio del territorio inicial
const GRACIA = 12;                    // pasos recientes de tu estela que no cuentan al girar (para no chocar contigo)
const NUM_BOTS = 7;                   // máximo 7 (hay 8 colores/nombres)
const ESCALA = 3;                     // nitidez: píxeles por casilla al dibujar el territorio (2 = ligero, 3 = recomendado, 4 = más nítido pero usa más memoria)
const CELDAS_VISTA = 110;             // casillas finas que caben en el lado corto de la pantalla (menos = más cerca)
const REAPARECE_BOT = [2, 4];         // segundos que tarda un bot en volver
const PUNTOS_POR_PCT = 10;            // puntos por cada 1 % de mapa (el máximo que lograste)
const PUNTOS_POR_BAJA = 25;           // puntos por cada bot eliminado
const MONEDAS_POR_BAJA = 2;           // monedas por cada enemigo eliminado
const PCT_POR_MONEDA = 5;             // cada tantos % de mapa cubierto (el máximo de la partida) das...
const MONEDAS_POR_TRAMO = 1;          // ...esta cantidad de monedas
const MONEDAS_POR_NIVEL = 20;         // monedas por terminar un nivel
const PRECIO_INICIO_GRANDE = 50;      // precio del boost «Inicio más grande» (se compra antes de la partida y se gasta en la siguiente)
const MULT_INICIO_GRANDE = 1.75;      // con el boost, el radio del círculo de inicio del jugador es 75 % más grande
const PRECIO_INVENCIBLE = 100;        // precio del boost «Invencible» (estrella arcoíris)
const SEG_INVENCIBLE = 8;             // segundos que dura: nadie te mata ni te corta la estela
const PRECIO_VELOZ = 80;              // precio del boost «Velocidad ×2»
const SEG_VELOZ = 10;                 // segundos que dura
const MULT_VELOZ = 2;                 // multiplicador de velocidad del jugador con el boost
const NOMBRES = ["Tú", "Lola", "Pepe", "Nico", "Rosa", "Toño", "Mara", "Beto"];
const TONOS = [255, 5, 38, 135, 178, 300, 340, 55]; // color de cada uno (el primero es el jugador)
// (ya no se muestra en pantalla)
const TEXTO_AYUDA = "Sal de tu territorio y regresa para quedarte con todo lo que encierres. Si alguien toca tu estela, pierdes; si tú tocas la suya, pierde él. Mantén el dedo pulsado y arrástralo hacia donde quieras ir, o usa las flechas / WASD. Durante la partida activa tus boosts con los botones ⭐ y ⚡ (o las teclas 1 y 2).";

// ----- Partida simple: un mundo grande y 4 dificultades a elegir (se muestran en el menú de inicio) -----
// El mundo es el círculo más grande que cabe en la rejilla (más grande que cualquier mapa de niveles-paperio.js). No tiene meta: se juega hasta que te eliminen.
// bots = rivales (1 a 7) · dificultad (0 a 1) = agresividad de los bots · rasgos = comportamientos extra (ver niveles-paperio.js)
const MUNDO_SIMPLE = { bolas: [[0, 0, 0.97]] };
const DIFICULTADES = [
  { nombre: "Fácil",   bots: 3, dificultad: 0.3,  rasgos: {} },
  { nombre: "Normal",  bots: 5, dificultad: 0.55, rasgos: { mordisco: 0.2 } },
  { nombre: "Difícil", bots: 7, dificultad: 0.8,  rasgos: { mordisco: 0.5, venganza: 0.5, acoso: 0.4 } },
  { nombre: "Experto", bots: 7, dificultad: 1,    rasgos: { mordisco: 0.9, venganza: 0.8, acoso: 0.85, veloz: 0.07, giro: 0.15 } },
];

// ----- Estado -----
const G = 2 * RADIO + 40, C = G / 2;  // lado de la rejilla y su centro (con un margen alrededor del mapa)
const N = G * G;
const SIM = 1 / 60;                   // paso fijo de simulación
const TAU = Math.PI * 2;
const dueno = new Uint8Array(N);      // id del dueño de cada casilla (0 = nadie)
const rastro = new Uint8Array(N);     // id de quien dejó estela en la casilla (0 = ninguna)
const rastroIdx = new Int32Array(N);  // número de paso en que se dejó esa estela
const dentro = new Uint8Array(N);     // 1 = casilla dentro del mapa del nivel
const distM = new Float32Array(N);    // distancia de cada casilla a la pared más cercana (0 fuera del mapa)
const etiqueta = new Int32Array(N), cola2 = new Int32Array(N); // memoria de trabajo para cerrar zonas
let AREA = 0;                         // casillas que tiene el mapa del nivel actual
const cuenta = new Int32Array(NUM_BOTS + 2);

function disco(r) {
  const l = [], q = Math.ceil(r);
  for (let dy = -q; dy <= q; dy++) for (let dx = -q; dx <= q; dx++) if (dx * dx + dy * dy <= r * r) l.push(dx, dy);
  return l;
}
const D_RASTRO = disco(R_RASTRO), D_INICIO = disco(R_INICIO), D_INICIO_GRANDE = disco(R_INICIO * MULT_INICIO_GRANDE);

let ents = [], yo = null;
let estado = "demo";                  // demo | jugando | fin
let sucio = true, bajas = 0, maxPct = 0, tiempo = 0, mejorPct = 0;
let fx = [];
let nivelActual = 0, nivelConstruido = -1, desbloqueado = 0, ganado = false;
let simple = null;                    // null = modo niveles; si no, el «nivel» de la partida simple en curso
let etapaNv = null;                   // nivel de un estado del mapa en curso (colima.js, campeche.js...): { ...nivel, etapa: id del estado }
let pausado = false;                  // true mientras el menú de pausa está abierto (la simulación se congela)
let bono = null, monBono = [], bonoMonedas = 0; // bono de Michoacán en curso (ver michoacan.js), sus monedas {x, y, hasta} y lo recogido
const nvActual = () => bono || simple || etapaNv || NIVELES[nivelActual];
let monedas = 0, monedasPartida = 0, tramosPagados = 0, boostInicio = false, usarBoost = false; // boostInicio = comprado y pendiente; usarBoost = activo en la partida en curso
let reloj = 0;                        // pasos de simulación transcurridos (60 por segundo)
let nInvenc = 0, nVeloz = 0;          // boosts comprados y guardados (se activan durante la partida)
let invHasta = 0, velHasta = 0;       // paso de «reloj» en que termina cada boost activo (0 = ninguno)
const invActiva = () => reloj < invHasta;
const velActiva = () => reloj < velHasta;
const cam = { x: C, y: C };

const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), ctx = cv.getContext("2d");
let vw = 300, vh = 300, cs = 4;

try { mejorPct = Number(localStorage.getItem("paperio_mejor")) || 0; } catch (e) {}
try { desbloqueado = Math.min(NIVELES.length - 1, Number(localStorage.getItem("paperio_nivel")) || 0); } catch (e) {}
const nivelMax = () => (DESBLOQUEAR_TODOS ? NIVELES.length - 1 : desbloqueado);
// Progreso de los estados del mapa: id del estado -> nivel más alto TERMINADO (los niveles de cada estado se abren en orden)
function limpiarEtapas(o) {
  const r = {};
  if (o && typeof o === "object") for (const k in o) { const n = Math.min(100, Math.floor(Number(o[k]))); if (n > 0) r[k] = n; }
  return r;
}
let etapasHechas = {};
try { etapasHechas = limpiarEtapas(JSON.parse(localStorage.getItem("paperio_etapas"))); } catch (e) {}
function guardarEtapas() {
  try { localStorage.setItem("paperio_etapas", JSON.stringify(etapasHechas)); } catch (e) {}
  guardarNube(false);
}
try {
  monedas = Math.max(0, Math.floor(Number(localStorage.getItem("paperio_monedas")) || 0));
  boostInicio = localStorage.getItem("paperio_boost_inicio") === "1";
  nInvenc = Math.max(0, Math.floor(Number(localStorage.getItem("paperio_boost_invenc")) || 0));
  nVeloz = Math.max(0, Math.floor(Number(localStorage.getItem("paperio_boost_veloz")) || 0));
} catch (e) {}

// ----- Monedas y tienda (las monedas y el boost comprado se guardan en este navegador y en la cuenta) -----
function escribirClaves() {
  try {
    localStorage.setItem("paperio_monedas", String(monedas));
    localStorage.setItem("paperio_boost_inicio", boostInicio ? "1" : "0");
    localStorage.setItem("paperio_boost_invenc", String(nInvenc));
    localStorage.setItem("paperio_boost_veloz", String(nVeloz));
  } catch (e) {}
}
function guardarMonedas() { escribirClaves(); guardarNube(true); }

// ----- Nube: copia única «paperio_nube» que sincroniza compartido/progreso.js -----
// Nivel desbloqueado y mejor % → el mayor de los dos sitios. Monedas y boosts (se gastan) → los de la copia que cambió más tarde (t).
const CLAVE_NUBE = "paperio_nube";
let nube = null, tNube = 0;
function guardarNube(cambioTienda) {
  // Un dispositivo sin nada guardado no crea copia: así no pisa la de la cuenta
  if (!(desbloqueado > 0 || mejorPct > 0 || monedas > 0 || boostInicio || nInvenc > 0 || nVeloz > 0 || Object.keys(etapasHechas).length)) return;
  if (cambioTienda || !tNube) tNube = Date.now();
  try { localStorage.setItem(CLAVE_NUBE, JSON.stringify({ nivel: desbloqueado, mejor: mejorPct, monedas, boostInicio: !!boostInicio, nInvenc, nVeloz, etapas: etapasHechas, t: tNube })); } catch (e) {}
  if (nube) nube.guardado();
}
function unirPaperio(a, b) {
  const ok = (x) => x && typeof x === "object";
  if (!ok(a) && !ok(b)) return null;
  if (!ok(a)) return b;
  if (!ok(b)) return a;
  const ta = Number(a.t) || 0, tb = Number(b.t) || 0, n = tb > ta ? b : a;
  return { nivel: Math.max(Number(a.nivel) || 0, Number(b.nivel) || 0), mejor: Math.max(Number(a.mejor) || 0, Number(b.mejor) || 0),
    monedas: n.monedas, boostInicio: !!n.boostInicio, nInvenc: n.nInvenc, nVeloz: n.nVeloz, etapas: unirEtapas(a.etapas, b.etapas), t: Math.max(ta, tb) };
}
// Niveles de los estados: de cada estado gana el nivel más alto terminado
function unirEtapas(a, b) {
  const r = limpiarEtapas(a), y = limpiarEtapas(b);
  for (const k in y) r[k] = Math.max(r[k] || 0, y[k]);
  return r;
}
function aplicarNube(v) {
  if (!v || typeof v !== "object") return;
  desbloqueado = Math.min(NIVELES.length - 1, Math.max(0, Math.floor(Number(v.nivel)) || 0));
  mejorPct = Math.max(0, Number(v.mejor) || 0);
  monedas = Math.max(0, Math.floor(Number(v.monedas)) || 0);
  boostInicio = !!v.boostInicio;
  nInvenc = Math.max(0, Math.floor(Number(v.nInvenc)) || 0);
  nVeloz = Math.max(0, Math.floor(Number(v.nVeloz)) || 0);
  tNube = Number(v.t) || 0;
  etapasHechas = unirEtapas(etapasHechas, v.etapas);
  try { localStorage.setItem("paperio_etapas", JSON.stringify(etapasHechas)); } catch (e) {}
  try { mapa.refrescar(); } catch (e) {}
  escribirClaves();
  try { localStorage.setItem("paperio_nivel", String(desbloqueado)); localStorage.setItem("paperio_mejor", String(mejorPct)); } catch (e) {}
  try { refrescarTienda(); refrescarBoosts(); } catch (e) {}
}
function ganarMonedas(n) {
  if (!(n > 0)) return;
  monedas += n; monedasPartida += n;
  guardarMonedas();
}
function refrescarTienda() {
  $("velMonedas").lastChild.textContent = monedas;
  const b = $("comprarInicio");
  b.textContent = boostInicio ? "✓ Inicio más grande listo" : "Inicio más grande · " + PRECIO_INICIO_GRANDE + " 💰";
  b.disabled = boostInicio || monedas < PRECIO_INICIO_GRANDE;
  $("txtInvenc").textContent = "Invencible · " + PRECIO_INVENCIBLE + " 💰" + (nInvenc ? " (tienes " + nInvenc + ")" : "");
  $("comprarInvenc").disabled = monedas < PRECIO_INVENCIBLE;
  $("txtVeloz").textContent = "Velocidad ×2 · " + PRECIO_VELOZ + " 💰" + (nVeloz ? " (tienes " + nVeloz + ")" : "");
  $("comprarVeloz").disabled = monedas < PRECIO_VELOZ;
}
$("comprarInicio").addEventListener("click", () => {
  if (boostInicio || monedas < PRECIO_INICIO_GRANDE) return;
  monedas -= PRECIO_INICIO_GRANDE; boostInicio = true;
  guardarMonedas(); refrescarTienda();
});

$("comprarInvenc").addEventListener("click", () => {
  if (monedas < PRECIO_INVENCIBLE) return;
  monedas -= PRECIO_INVENCIBLE; nInvenc++;
  guardarMonedas(); refrescarTienda();
});
$("comprarVeloz").addEventListener("click", () => {
  if (monedas < PRECIO_VELOZ) return;
  monedas -= PRECIO_VELOZ; nVeloz++;
  guardarMonedas(); refrescarTienda();
});

// Activa un boost comprado durante la partida (no se gasta si ya está activo)
function activarBoost(tipo) {
  if (estado !== "jugando" || !yo || !yo.vivo) return;
  if (tipo === "inv") {
    if (invActiva() || nInvenc < 1) return;
    nInvenc--; invHasta = reloj + SEG_INVENCIBLE * 60;
  } else {
    if (velActiva() || nVeloz < 1) return;
    nVeloz--; velHasta = reloj + SEG_VELOZ * 60;
  }
  guardarMonedas(); refrescarBoosts();
}
let boostsTxt = "";
function refrescarBoosts() {
  const jug = estado === "jugando" && !!yo && yo.vivo;
  $("boosts").hidden = !jug;
  if (!jug) { boostsTxt = ""; return; }
  const ti = invActiva() ? Math.ceil((invHasta - reloj) / 60) + " s" : "×" + nInvenc;
  const tv = velActiva() ? Math.ceil((velHasta - reloj) / 60) + " s" : "×" + nVeloz;
  const txt = ti + "|" + tv;
  if (txt === boostsTxt) return;
  boostsTxt = txt;
  $("nInvenc").textContent = ti; $("nVeloz").textContent = tv;
  $("usarInvenc").disabled = !invActiva() && nInvenc < 1;
  $("usarVeloz").disabled = !velActiva() && nVeloz < 1;
  $("usarInvenc").classList.toggle("activo", invActiva());
  $("usarVeloz").classList.toggle("activo", velActiva());
}
$("usarInvenc").addEventListener("click", () => activarBoost("inv"));
$("usarVeloz").addEventListener("click", () => activarBoost("vel"));
addEventListener("keydown", (ev) => {
  if (ev.repeat) return;
  if (ev.key === "1") activarBoost("inv");
  else if (ev.key === "2") activarBoost("vel");
});

// ----- Sesión y puntos (opcional: sin conexión el juego funciona igual) -----
let J = null, usuario = null;
import("../compartido/jugador.js")
  .then((m) => { J = m; m.alCambiarSesion((u) => { usuario = u; marcarEntrar(); }); })
  .catch(() => {});

// Nube: se crea la copia (la primera vez, con lo que ya había en este dispositivo) y se conecta con la cuenta
try { const c = JSON.parse(localStorage.getItem(CLAVE_NUBE)); tNube = (c && Number(c.t)) || 0; } catch (e) {}
guardarNube(false);
import("../compartido/progreso.js")
  .then((m) => { nube = m.conectar(ID, { clave: CLAVE_NUBE, fusionar: unirPaperio, alCambiar: aplicarNube }); })
  .catch(() => {});

// ----- Capas de territorio, estelas y suelo -----
// El juego calcula todo en una rejilla de casillas, pero se DIBUJA a más resolución (ESCALA píxeles por casilla)
// y con los bordes suavizados: así los colores quedan firmes y las curvas lisas en vez de escalonadas.
// A = colores claros (territorio y estela), B = colores oscuros (el «grosor» de abajo), M = suelo, S = sombra del suelo.
// Se redibujan solo las «baldosas» (de 16×16 casillas) que cambiaron.
const T_SH = 4, T = 1 << T_SH;               // lado de una baldosa, en casillas
const NT = Math.ceil(G / T), GT = NT * T;    // baldosas por lado y lado total (en casillas)
const TP = T * ESCALA;                       // lado de una baldosa, en píxeles
const SUAVIZADO = 1.1;                       // cuánto se redondean los bordes, en casillas (más alto = más lisos pero más «blandos» en las esquinas)
const RAD = Math.max(2, Math.round(SUAVIZADO * 2)), K = 2 * RAD + 1; // alcance del filtro y lado de su ventana
const GANA = ESCALA * SUAVIZADO * 1.25;      // qué tan «seco» es el borde entre dos colores (transición de ~1 píxel)
function crearCapa() { const c = document.createElement("canvas"); c.width = c.height = GT * ESCALA; return c; }
const cvA = crearCapa(), cvB = crearCapa(), cvM = crearCapa(), cvS = crearCapa();
const ctxA = cvA.getContext("2d"), ctxB = cvB.getContext("2d"), ctxM = cvM.getContext("2d"), ctxS = cvS.getContext("2d");
const tA = ctxA.createImageData(TP, TP), tB = ctxB.createImageData(TP, TP);   // una baldosa de trabajo
const u32TA = new Uint32Array(tA.data.buffer), u32TB = new Uint32Array(tB.data.buffer);
const clave = new Uint8Array(N);             // qué se ve en cada casilla: 0 nada, 1-8 territorio de ese id, 9-16 estela de ese id (+8)
const sucioT = new Uint8Array(NT * NT), listaT = [];

// Color de cada clave: claro (A) y oscuro (B)
const CR = new Float32Array(17), CG = new Float32Array(17), CB = new Float32Array(17);
const DR = new Float32Array(17), DG = new Float32Array(17), DB = new Float32Array(17);
const PA = new Uint32Array(17), PB = new Uint32Array(17); // los mismos colores ya empaquetados (opacos)
for (let id = 1; id <= 8; id++) {
  const tono = TONOS[id - 1];
  for (const [k, cl, os] of [[id, hslRgb(tono, 55, 66), hslRgb(tono, 48, 46)], [id + 8, hslRgb(tono, 62, 78), hslRgb(tono, 45, 60)]]) {
    CR[k] = cl[0]; CG[k] = cl[1]; CB[k] = cl[2]; DR[k] = os[0]; DG[k] = os[1]; DB[k] = os[2];
    PA[k] = ((255 << 24) | (cl[2] << 16) | (cl[1] << 8) | cl[0]) >>> 0;
    PB[k] = ((255 << 24) | (os[2] << 16) | (os[1] << 8) | os[0]) >>> 0;
  }
}
// Pesos de un filtro gaussiano para cada sub-píxel dentro de una casilla: PESOS[s][t] = peso de la casilla que está (t - RAD) casillas al lado
function erf(x) { // aproximación de Abramowitz-Stegun
  const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x < 0 ? -y : y;
}
const PESOS = [];
for (let s = 0; s < ESCALA; s++) {
  const p = (s + 0.5) / ESCALA - 0.5, w = [];
  let tot = 0;
  for (let t = 0; t < K; t++) {
    const c = (t - RAD) - p, v = 0.5 * (erf((c + 0.5) / (SUAVIZADO * Math.SQRT2)) - erf((c - 0.5) / (SUAVIZADO * Math.SQRT2)));
    w.push(v); tot += v;
  }
  PESOS.push(w.map((v) => v / tot));
}
const KS = new Uint8Array(K * K), UK = new Uint8Array(K * K), IX = new Uint8Array(K * K), AC = new Float32Array(K * K);

function pix(i) {
  const o = dueno[i], r = rastro[i];
  clave[i] = r ? 8 + r : o;
  const x = i % G, y = (i / G) | 0;
  const a = Math.max(0, (x - RAD) >> T_SH), b = Math.min(NT - 1, (x + RAD) >> T_SH);
  const c = Math.max(0, (y - RAD) >> T_SH), d = Math.min(NT - 1, (y + RAD) >> T_SH);
  for (let ty = c; ty <= d; ty++)
    for (let tx = a; tx <= b; tx++) { const k = ty * NT + tx; if (!sucioT[k]) { sucioT[k] = 1; listaT.push(k); } }
}
function limpiarCapas() {
  ctxA.clearRect(0, 0, cvA.width, cvA.height);
  ctxB.clearRect(0, 0, cvB.width, cvB.height);
  for (const k of listaT) sucioT[k] = 0;
  listaT.length = 0;
}

// Vuelve a dibujar una baldosa: en cada píxel mezcla las casillas de alrededor con el filtro suave y se queda con el color
// dominante; en el borde entre dos colores hace una transición de ~1 píxel (bordes lisos y sin dientes).
function pintarBaldosa(tx, ty) {
  const cx0 = tx * T, cy0 = ty * T;
  for (let cy = 0; cy < T; cy++)
    for (let cx = 0; cx < T; cx++) {
      const X = cx0 + cx, Y = cy0 + cy;
      let n = 0, igual = true;
      for (let j = -RAD; j <= RAD; j++)
        for (let i = -RAD; i <= RAD; i++) {
          const xx = X + i, yy = Y + j;
          const k = xx >= 0 && yy >= 0 && xx < G && yy < G ? clave[yy * G + xx] : 0;
          KS[n++] = k;
          if (k !== KS[0]) igual = false;
        }
      const px0 = cx * ESCALA, py0 = cy * ESCALA;
      if (igual) { // casilla rodeada de lo mismo: color liso
        const pa = PA[KS[0]], pb = PB[KS[0]];
        for (let sy = 0; sy < ESCALA; sy++) {
          let o = (py0 + sy) * TP + px0;
          for (let sx = 0; sx < ESCALA; sx++, o++) { u32TA[o] = pa; u32TB[o] = pb; }
        }
        continue;
      }
      let nu = 0;
      for (let q = 0; q < K * K; q++) {
        let f = -1;
        for (let u = 0; u < nu; u++) if (UK[u] === KS[q]) { f = u; break; }
        if (f < 0) { UK[nu] = KS[q]; f = nu++; }
        IX[q] = f;
      }
      for (let sy = 0; sy < ESCALA; sy++) {
        const wy = PESOS[sy];
        let o = (py0 + sy) * TP + px0;
        for (let sx = 0; sx < ESCALA; sx++, o++) {
          const wx = PESOS[sx];
          for (let u = 0; u < nu; u++) AC[u] = 0;
          for (let j = 0, q = 0; j < K; j++) { const w = wy[j]; for (let i = 0; i < K; i++, q++) AC[IX[q]] += w * wx[i]; }
          let i1 = 0;
          for (let u = 1; u < nu; u++) if (AC[u] > AC[i1]) i1 = u;
          let i2 = -1;
          for (let u = 0; u < nu; u++) if (u !== i1 && (i2 < 0 || AC[u] > AC[i2])) i2 = u;
          const k1 = UK[i1], k2 = UK[i2];
          const m = Math.min(1, 0.5 + (AC[i1] - AC[i2]) * GANA);
          const a1 = k1 ? m : 0, a2 = k2 ? 1 - m : 0, al = a1 + a2;
          if (al < 0.004) { u32TA[o] = 0; u32TB[o] = 0; continue; }
          const ab = (al * 255 + 0.5) | 0, inv = 1 / al;
          u32TA[o] = ((ab << 24) | (((CB[k1] * a1 + CB[k2] * a2) * inv + 0.5) << 16) | (((CG[k1] * a1 + CG[k2] * a2) * inv + 0.5) << 8) | ((CR[k1] * a1 + CR[k2] * a2) * inv + 0.5)) >>> 0;
          u32TB[o] = ((ab << 24) | (((DB[k1] * a1 + DB[k2] * a2) * inv + 0.5) << 16) | (((DG[k1] * a1 + DG[k2] * a2) * inv + 0.5) << 8) | ((DR[k1] * a1 + DR[k2] * a2) * inv + 0.5)) >>> 0;
        }
      }
    }
  ctxA.putImageData(tA, tx * TP, ty * TP);
  ctxB.putImageData(tB, tx * TP, ty * TP);
}
function subirCapas() {
  for (const k of listaT) { sucioT[k] = 0; pintarBaldosa(k % NT, (k / NT) | 0); }
  listaT.length = 0;
}

// ----- Colores -----
function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
const pack = (c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; // ABGR (little endian)

// ----- Mapa del nivel -----
// El suelo (M) y su sombra (S) también se dibujan a mayor resolución y con el borde suavizado (ver «pintarPiso»)
const tmpD = new Float32Array(N);
const PISO_M = (247 << 16) | (255 << 8) | 236, PISO_S = (195 << 16) | (214 << 8) | 169; // colores (ABGR sin el alfa)
const AA_PISO = ESCALA * SUAVIZADO * 2.5;    // ancho de la transición del borde del suelo

function pintarPiso() {
  for (let ty = 0; ty < NT; ty++)
    for (let tx = 0; tx < NT; tx++) {
      const cx0 = tx * T, cy0 = ty * T;
      for (let cy = 0; cy < T; cy++)
        for (let cx = 0; cx < T; cx++) {
          const X = cx0 + cx, Y = cy0 + cy;
          let n = 0, suma = 0;
          for (let j = -RAD; j <= RAD; j++)
            for (let i = -RAD; i <= RAD; i++) {
              const xx = X + i, yy = Y + j;
              const k = xx >= 0 && yy >= 0 && xx < G && yy < G ? dentro[yy * G + xx] : 0;
              KS[n++] = k; suma += k;
            }
          const px0 = cx * ESCALA, py0 = cy * ESCALA;
          const fijo = suma === K * K ? 255 : suma === 0 ? 0 : -1;
          for (let sy = 0; sy < ESCALA; sy++) {
            const wy = PESOS[sy];
            let o = (py0 + sy) * TP + px0;
            for (let sx = 0; sx < ESCALA; sx++, o++) {
              let a8 = fijo;
              if (a8 < 0) {
                const wx = PESOS[sx];
                let w = 0;
                for (let j = 0, q = 0; j < K; j++) for (let i = 0; i < K; i++, q++) if (KS[q]) w += wy[j] * wx[i];
                a8 = Math.round(Math.max(0, Math.min(1, 0.5 + (w - 0.5) * AA_PISO)) * 255);
              }
              u32TA[o] = a8 ? ((a8 << 24) | PISO_M) >>> 0 : 0;
              u32TB[o] = a8 ? ((a8 << 24) | PISO_S) >>> 0 : 0;
            }
          }
        }
      ctxM.putImageData(tA, tx * TP, ty * TP);
      ctxS.putImageData(tB, tx * TP, ty * TP);
    }
}

function chamfer(d) { // distancia (aprox.) al origen más cercano, en dos pasadas
  const D2 = 1.4142;
  for (let y = 1; y < G; y++)
    for (let x = 1; x < G - 1; x++) {
      const i = y * G + x;
      d[i] = Math.min(d[i], d[i - 1] + 1, d[i - G] + 1, d[i - G - 1] + D2, d[i - G + 1] + D2);
    }
  for (let y = G - 2; y >= 0; y--)
    for (let x = G - 2; x >= 1; x--) {
      const i = y * G + x;
      d[i] = Math.min(d[i], d[i + 1] + 1, d[i + G] + 1, d[i + G + 1] + D2, d[i + G - 1] + D2);
    }
}
function construirNivel(nv) {
  const f = crearForma(nv.forma);
  dentro.fill(0);
  for (let y = 0; y < G; y++)
    for (let x = 0; x < G; x++) {
      const u = (x + 0.5 - C) / RADIO, v = (y + 0.5 - C) / RADIO;
      if (u > -1 && u < 1 && v > -1 && v < 1 && f(u, v)) dentro[y * G + x] = 1;
    }
  // quedarse solo con la pieza más grande (por si la forma deja pedacitos sueltos)
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s0 = 0; s0 < N; s0++) {
    if (!dentro[s0] || etiqueta[s0]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s0; etiqueta[s0] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dentro[j] && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  AREA = 0;
  for (let i = 0; i < N; i++) {
    if (dentro[i] && etiqueta[i] !== mayor) dentro[i] = 0;
    if (dentro[i]) AREA++;
  }
  // distancia a la pared (dentro) y al mapa (fuera): sirve para los roces, los bots y para suavizar el borde al dibujar
  for (let i = 0; i < N; i++) { distM[i] = dentro[i] ? 1e4 : 0; tmpD[i] = dentro[i] ? 0 : 1e4; }
  chamfer(distM);
  pintarPiso();
}
function distEn(x, y) {
  const cx = x | 0, cy = y | 0;
  return cx >= 0 && cy >= 0 && cx < G && cy < G ? distM[cy * G + cx] : 0;
}

// ----- Entidades -----
// Qué tan agresivos son los bots en este nivel (0 a 1). Sube sola con el número de nivel;
// un nivel puede fijarla con «dificultad: 0.8» en niveles-paperio.js.
function dificultad() {
  const nv = nvActual();
  return typeof nv.dificultad === "number" ? Math.max(0, Math.min(1, nv.dificultad)) : Math.min(1, 0.4 + nivelActual * 0.07);
}
// Rasgos extra del nivel actual (mordisco, venganza, acoso, veloz), de 0 a 1; sin ellos valen 0
function rasgo(n) {
  const r = nvActual().rasgos;
  return r && typeof r[n] === "number" ? Math.max(0, Math.min(1, r[n])) : 0;
}
function crear(id) {
  const tono = TONOS[id - 1];
  return {
    id, jugador: id === 1, nombre: NOMBRES[id - 1], tono,
    cT: "hsl(" + tono + ",55%,66%)", cC: "hsl(" + tono + ",42%,56%)", cD: "hsl(" + tono + ",38%,34%)",
    pTl: pack(hslRgb(tono, 55, 66)), pTd: pack(hslRgb(tono, 48, 46)),   // territorio claro / oscuro
    pRl: pack(hslRgb(tono, 62, 78)), pRd: pack(hslRgb(tono, 45, 60)),   // estela clara / oscura
    x: 0, y: 0, px: 0, py: 0, ang: 0, meta: 0,
    cola: [], ruta: [], seq: 0, vivo: false, espera: 0,
    plan: null, wp: 0, vuelta: false, casa: null, casaT: 0, vagar: 0, desv: 0, ia: 0,
    caza: null, cazaT: 0, defiende: false, alarma: null, agr: 0.5 + Math.random() * 0.5, dif: dificultad(),
    // personalidad: solo algunos bots son «mordedores» (así no todos van por ti a la vez)
    mordedor: Math.random() < 0.3 + 0.6 * rasgo("mordisco"), vel: 1 + Math.min(0.1, rasgo("veloz")), gir: 1 + Math.min(0.4, rasgo("giro")),
  };
}

function discoLibre(cx, cy, r) {
  for (let dy = -r; dy <= r; dy += 2)
    for (let dx = -r; dx <= r; dx += 2) {
      const i = (cy + dy) * G + cx + dx;
      if (dueno[i] || rastro[i]) return false;
    }
  return true;
}
function lejos(cx, cy, r) {
  for (const o of ents) if (o.vivo && Math.hypot(o.x - cx, o.y - cy) < r) return false;
  return true;
}
function aparecer(e) {
  // con el boost «Inicio más grande» el jugador empieza con un círculo de radio MULT_INICIO_GRANDE veces mayor
  // (si en este mapa no cabe en ningún lado, usa el tamaño normal)
  let r0 = e.jugador && usarBoost ? R_INICIO * MULT_INICIO_GRANDE : R_INICIO, cx = C, cy = C, ok = false;
  for (let intento = 0; intento < 2 && !ok; intento++) {
    for (let k = 0; k < 2500 && !ok; k++) {
      cx = Math.round(C + (Math.random() * 2 - 1) * RADIO); cy = Math.round(C + (Math.random() * 2 - 1) * RADIO);
      ok = distM[cy * G + cx] > r0 + 8 && discoLibre(cx, cy, Math.ceil(r0) + 5) && lejos(cx, cy, k < 1200 ? 60 : 30);
    }
    for (let k = 0; k < 6000 && !ok; k++) { // plan B: cualquier lugar despejado
      cx = Math.round(C + (Math.random() * 2 - 1) * RADIO); cy = Math.round(C + (Math.random() * 2 - 1) * RADIO);
      // plan B: el jugador cae en cualquier lugar despejado; un bot nunca cae sobre territorio o estelas de otros
      ok = distM[cy * G + cx] > r0 + 3 && (e.jugador || discoLibre(cx, cy, Math.ceil(r0) + 2));
    }
    if (!ok && r0 > R_INICIO) r0 = R_INICIO; else break;
  }
  if (!ok && !e.jugador) { e.vivo = false; e.espera = 1; return; } // no hay lugar libre (el jugador tiene casi todo): lo intenta de nuevo en 1 s
  const discoIni = r0 > R_INICIO ? D_INICIO_GRANDE : D_INICIO;
  for (let k = 0; k < discoIni.length; k += 2) {
    const i = (cy + discoIni[k + 1]) * G + cx + discoIni[k];
    if (dentro[i] && (e.jugador || !dueno[i])) { dueno[i] = e.id; pix(i); } // un bot no pisa casillas que ya son de alguien
  }
  e.x = e.px = cx + 0.5; e.y = e.py = cy + 0.5;
  let mejorA = 0, mejorS = -1; // mira hacia donde hay más espacio libre
  for (let k = 0; k < 16; k++) {
    const a = k * TAU / 16 + Math.random() * 0.2;
    let sc = 1e9;
    for (const d of [30, 60, 90]) sc = Math.min(sc, distEn(cx + Math.cos(a) * d, cy + Math.sin(a) * d));
    if (sc > mejorS) { mejorS = sc; mejorA = a; }
  }
  e.ang = e.meta = mejorA;
  e.cola = []; e.ruta = []; e.seq = 0; e.plan = null; e.caza = null; e.casa = null; e.vuelta = false; e.alarma = null; e.defiende = false;
  e.vivo = true;
  sucio = true;
}

function recontar() {
  cuenta.fill(0);
  for (let i = 0; i < N; i++) { const o = dueno[i]; if (o) cuenta[o]++; }
  sucio = false;
  if (estado === "jugando" && yo.vivo) { const p = cuenta[1] * 100 / AREA; if (p > maxPct) maxPct = p; const tr = Math.floor(maxPct / PCT_POR_MONEDA); if (tr > tramosPagados) { ganarMonedas((tr - tramosPagados) * MONEDAS_POR_TRAMO); tramosPagados = tr; } }
}

function matar(v, por) {
  if (!v.vivo) return;
  if (v.jugador && estado === "jugando" && invActiva()) return; // con el boost «Invencible» nadie te mata ni te corta la estela
  v.vivo = false;
  for (const i of v.cola) if (rastro[i] === v.id) { rastro[i] = 0; pix(i); }
  v.cola = []; v.ruta = [];
  for (let i = 0; i < N; i++) if (dueno[i] === v.id) { dueno[i] = 0; pix(i); }
  fx.push({ x: v.x, y: v.y, t: 0, tono: v.tono });
  sucio = true;
  if (por && por.jugador && por !== v && estado === "jugando") {
    bajas++; ganarMonedas(MONEDAS_POR_BAJA);
    const ven = rasgo("venganza"); // los demás bots se enteran: unos cuantos van a por ti un rato
    if (ven > 0) for (const o of ents) if (o !== v && !o.jugador && o.vivo && Math.random() < ven * o.agr) o.alarma = { por, hasta: reloj + 60 * (4 + 6 * ven) };
  }
  if (v.jugador) { if (estado === "jugando") terminar(); }
  else v.espera = REAPARECE_BOT[0] + Math.random() * (REAPARECE_BOT[1] - REAPARECE_BOT[0]);
}

// Si el territorio de alguien quedó partido en pedazos sueltos, se queda solo con el más grande
// y los pedazos aislados se vuelven zona vacía.
function podar(id) {
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s = 0; s < N; s++) {
    if (dueno[s] !== id || etiqueta[s]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s; etiqueta[s] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dueno[j] === id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  if (nEt <= 1) return;
  for (let s = 0; s < N; s++) if (etiqueta[s] && etiqueta[s] !== mayor) { dueno[s] = 0; pix(s); }
}

// Cierra el bucle: la estela pasa a ser territorio y se queda con las zonas encerradas.
// Se separan las zonas «no mías» en grupos; el grupo más grande es el exterior y todos los demás quedan encerrados.
function cerrar(e) {
  const afectados = new Set(); // dueños a los que esta captura les quita casillas
  for (const i of e.cola) { const o = dueno[i]; if (o && o !== e.id) afectados.add(o); if (rastro[i] === e.id) rastro[i] = 0; dueno[i] = e.id; pix(i); }
  e.cola = []; e.ruta = [];
  etiqueta.fill(0);
  let nEt = 0, mayor = 0, tam = 0;
  for (let s = 0; s < N; s++) {
    if (!dentro[s] || dueno[s] === e.id || etiqueta[s]) continue;
    nEt++;
    let h = 0, t = 0;
    cola2[t++] = s; etiqueta[s] = nEt;
    while (h < t) {
      const i = cola2[h++], x = i % G;
      let j;
      if (x > 0) { j = i - 1; if (dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      if (x < G - 1) { j = i + 1; if (dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; } }
      j = i - G; if (j >= 0 && dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
      j = i + G; if (j < N && dentro[j] && dueno[j] !== e.id && !etiqueta[j]) { etiqueta[j] = nEt; cola2[t++] = j; }
    }
    if (t > tam) { tam = t; mayor = nEt; }
  }
  for (let s = 0; s < N; s++) {
    const l = etiqueta[s];
    if (l && l !== mayor) { const o = dueno[s]; if (o && o !== e.id) afectados.add(o); dueno[s] = e.id; pix(s); }
  }
  for (const id of afectados) { // a quien le quitan territorio se entera y irá a revisar
    const v = ents[id - 1];
    if (v && v.vivo && !v.jugador) v.alarma = { por: e, hasta: reloj + 60 * 8 };
  }
  for (const id of afectados) podar(id); // lo que les quedó suelto, desaparece
  recontar();
  for (const o of ents) if (o !== e && o.vivo && cuenta[o.id] === 0) matar(o, e); // sin territorio = fuera
}

// Deja la estela (un círculo pequeño) en la posición de la cabeza
function sellar(e) {
  e.seq++;
  const cx = e.x | 0, cy = e.y | 0;
  for (let k = 0; k < D_RASTRO.length; k += 2) {
    const i = (cy + D_RASTRO[k + 1]) * G + cx + D_RASTRO[k];
    if (!dentro[i] || dueno[i] === e.id || rastro[i]) continue;
    rastro[i] = e.id; rastroIdx[i] = e.seq; e.cola.push(i); pix(i);
  }
  e.ruta.push(e.x, e.y);
}

// ----- Bots -----
function lim(ox, oy, x, y) { // acerca un punto a (ox,oy) hasta que quede lejos de las paredes
  for (let t = 1; t > 0; t -= 0.1) {
    const px = ox + (x - ox) * t, py = oy + (y - oy) * t;
    if (px > 2 && py > 2 && px < G - 3 && py < G - 3 && distM[(py | 0) * G + (px | 0)] >= 14) return [px, py];
  }
  return [ox, oy];
}
function esMia(e, x, y) {
  const cx = x | 0, cy = y | 0;
  return cx >= 0 && cy >= 0 && cx < G && cy < G && dueno[cy * G + cx] === e.id;
}
function libre(e, a) { // ¿puedo seguir en esta dirección sin chocar con la pared o con mi propia estela?
  const c = Math.cos(a), s = Math.sin(a);
  for (const d of [6, 12, 18]) {
    const px = e.x + c * d, py = e.y + s * d;
    if (distEn(px, py) < 7) return false;
    const i = (py | 0) * G + (px | 0);
    if (rastro[i] === e.id && e.seq - rastroIdx[i] > GRACIA) return false;
  }
  return true;
}
function casaCercana(e) { // punto de mi territorio al que volver (un poco hacia adentro)
  let mejor = 1e12, mx = e.x, my = e.y, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < G; y += 2) {
    const f = y * G;
    for (let x = 0; x < G; x += 2)
      if (dueno[f + x] === e.id) {
        n++; sx += x; sy += y;
        const d = (x - e.x) * (x - e.x) + (y - e.y) * (y - e.y);
        if (d < mejor) { mejor = d; mx = x; my = y; }
      }
  }
  if (!n) return [e.x, e.y];
  const dx = sx / n - mx, dy = sy / n - my, l = Math.hypot(dx, dy) || 1, m = Math.min(7, l);
  return [mx + dx / l * m, my + dy / l * m];
}
// Mordisco: sale directo hacia tu territorio, se mete un poco, gira y vuelve a su casa para quedarse con lo que encierre
function empezarMordisco(e) {
  const j = estado === "jugando" && yo && yo.vivo && cuenta[1] > 0 ? yo : null;
  if (!j || j.cola.length > 400) return false;
  let mejor = 1e12, mx = 0, my = 0, sx = 0, sy = 0, n = 0;
  for (let y = 0; y < G; y += 3) {
    const f = y * G;
    for (let x = 0; x < G; x += 3)
      if (dueno[f + x] === 1) {
        n++; sx += x; sy += y;
        const d = (x - e.x) * (x - e.x) + (y - e.y) * (y - e.y);
        if (d < mejor) { mejor = d; mx = x; my = y; }
      }
  }
  if (!n || mejor > 160 * 160 || mejor < 12 * 12) return false;
  const dx = sx / n - mx, dy = sy / n - my, l = Math.hypot(dx, dy) || 1;
  const A = lim(e.x, e.y, mx + dx / l * 14, my + dy / l * 14);          // punto dentro de tu zona
  const a = Math.atan2(A[1] - e.y, A[0] - e.x), s = Math.random() < 0.5 ? 1 : -1;
  const W = 22 + Math.random() * 30;
  const B = lim(A[0], A[1], A[0] + Math.cos(a + s * Math.PI / 2) * W, A[1] + Math.sin(a + s * Math.PI / 2) * W);
  e.plan = [A, B]; e.wp = 0; e.vuelta = false; e.casa = null;
  return true;
}
function empezarPlan(e) { // excursión: salir recto, girar de lado y volver
  if (e.mordedor && Math.random() < 0.15 + 0.5 * rasgo("mordisco") * e.agr && empezarMordisco(e)) return;
  const s = Math.random() < 0.5 ? 1 : -1;
  let a = e.ang;
  const j = estado === "jugando" && yo && yo.vivo ? yo : null;
  if (j && Math.random() < 0.15 + 0.6 * e.dif * e.agr) { // a veces sale directo a rondar al jugador
    const dj = Math.hypot(j.x - e.x, j.y - e.y);
    if (dj > 20 && dj < 300) a = Math.atan2(j.y - e.y, j.x - e.x) + (Math.random() - 0.5) * 0.5;
  }
  const L = 22 + Math.random() * 60, W = 18 + Math.random() * 50;
  const A = lim(e.x, e.y, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L);
  const b = a + s * Math.PI / 2;
  const B = lim(A[0], A[1], A[0] + Math.cos(b) * W, A[1] + Math.sin(b) * W);
  e.plan = [A, B]; e.wp = 0; e.vuelta = false; e.casa = null;
}
function pensarBot(e) {
  if (!e.cola.length) { e.plan = null; e.vuelta = false; }
  let meta = e.ang;
  const larga = e.cola.length > 700;

  const dif = e.dif * (0.6 + 0.4 * e.agr); // agresividad de este bot

  // 1) DEFENSA: si alguien está dentro de su territorio o le quitó un pedazo, va a revisar y a cortarle la estela.
  //    Reacciona mucho más rápido contra el jugador que contra otros bots.
  let amenaza = null;
  for (const o of ents) if (o !== e && o.vivo && dueno[(o.y | 0) * G + (o.x | 0)] === e.id) { amenaza = o; break; }
  if (!amenaza && e.alarma && reloj < e.alarma.hasta && e.alarma.por.vivo) amenaza = e.alarma.por;
  if (amenaza && !larga && !(e.caza && e.defiende) && Math.random() < (amenaza.jugador ? 0.4 + 0.6 * dif : 0.25 * dif)) {
    e.caza = amenaza; e.cazaT = 70; e.defiende = true;
  }

  // 2) ATAQUE: sigue de cerca al jugador (bastante más que a otros bots) y le corta la estela
  if (e.caza && (!e.caza.vivo || e.cazaT-- <= 0 || larga || Math.hypot(e.caza.x - e.x, e.caza.y - e.y) > 220)) { e.caza = null; e.defiende = false; }
  if (!e.caza && !larga && e.cola.length < 350) {
    let presa = null, mejorP = 0;
    for (const o of ents) {
      if (o === e || !o.vivo || o.ruta.length < 30) continue;
      const rad = o.jugador ? 120 : 40, d = Math.hypot(o.x - e.x, o.y - e.y);
      if (d > rad) continue;
      const pt = (o.jugador ? 3 : 1) * (1 - d / rad);
      if (pt > mejorP) { mejorP = pt; presa = o; }
    }
    const largo = presa && presa.jugador ? 1 + rasgo("acoso") * 2 * Math.min(1, presa.ruta.length / 300) : 1; // estela larga = más tentador
    if (presa && Math.random() < 0.05 * dif * (presa.jugador ? 3 : 0.5) * largo) { e.caza = presa; e.cazaT = 45; e.defiende = false; }
  }
  let cazando = false;
  if (e.caza) {
    const o = e.caza, r = o.ruta;
    let mejor = 1e12, tx = o.x, ty = o.y;
    for (let k = 0; k < r.length - 24; k += 8) {
      const d = (r[k] - e.x) * (r[k] - e.x) + (r[k + 1] - e.y) * (r[k + 1] - e.y);
      if (d < mejor) { mejor = d; tx = r[k]; ty = r[k + 1]; }
    }
    if (mejor < 1e12 || e.defiende) { meta = Math.atan2(ty - e.y, tx - e.x); cazando = true; } // sin estela que cortar: va hacia el intruso
    else { e.caza = null; e.defiende = false; }
  }

  if (!cazando) {
    if (e.cola.length && !e.plan) { e.plan = []; e.wp = 0; e.vuelta = true; e.casa = null; } // salió cazando: ahora vuelve
    if (e.plan) {
      let obj = null;
      if (!e.vuelta) {
        const w = e.plan[e.wp];
        if (Math.hypot(w[0] - e.x, w[1] - e.y) < 13) { e.wp++; if (e.wp >= e.plan.length) e.vuelta = true; }
        if (!e.vuelta) obj = e.plan[e.wp];
      }
      if (e.vuelta || larga) {
        e.vuelta = true;
        e.casa = casaCercana(e); // se recalcula en cada decisión: así no persigue un punto viejo
        obj = e.casa;
      }
      meta = Math.atan2(obj[1] - e.y, obj[0] - e.x);
    } else { // en casa: pasea y sale cuando llega a la orilla
      if (--e.vagar <= 0) { e.vagar = 8 + Math.random() * 12; e.desv = (Math.random() - 0.5) * 1.6; }
      meta = e.ang + e.desv * 0.5;
      if (!esMia(e, e.x + Math.cos(e.ang) * 10, e.y + Math.sin(e.ang) * 10) || Math.random() < 0.02 + 0.03 * e.dif) empezarPlan(e);
    }
  }

  // elegir la dirección libre más parecida a la que quiere
  let a = null;
  for (const o of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.3, -2.3]) if (libre(e, meta + o)) { a = meta + o; break; }
  e.meta = a === null ? e.ang + 1 : a;
}

// ----- Un paso de juego -----
function paso() {
  reloj++;
  for (const e of ents) {
    if (!e.vivo) continue;
    if (e.jugador) e.meta = metaTeclas !== null ? metaTeclas : metaDedo !== null ? metaDedo : e.ang;
    else if (--e.ia <= 0) { e.ia = 5; pensarBot(e); }

    // giro suave hacia la dirección deseada
    let da = e.meta - e.ang;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    const multVel = e.jugador && velActiva() ? MULT_VELOZ : 1; // boost «Velocidad ×2» (también escala el giro para que las curvas midan lo mismo)
    const mx = (e.jugador ? GIRO_JUGADOR * multVel : GIRO * e.gir) * SIM;
    e.ang += Math.max(-mx, Math.min(mx, da));

    e.px = e.x; e.py = e.y;
    const v = VEL * SIM * (e.jugador ? multVel : e.vel);
    e.x += Math.cos(e.ang) * v;
    e.y += Math.sin(e.ang) * v;

    const xi = e.x | 0, yi = e.y | 0, d0 = distM[yi * G + xi];
    if (d0 < MARGEN_PARED) { // tocó una pared (el borde del mapa o un hueco)
      const gx = distM[yi * G + xi + 2] - distM[yi * G + xi - 2], gy = distM[(yi + 2) * G + xi] - distM[(yi - 2) * G + xi];
      const gl = Math.hypot(gx, gy);
      const inv = e.jugador && (invActiva() || !!bono); // en el bono no se muere contra las paredes
      if (gl < 1e-3) { if (inv) { e.x = e.px; e.y = e.py; } else matar(e, null); continue; }
      const nx = -gx / gl, ny = -gy / gl, hx = Math.cos(e.ang), hy = Math.sin(e.ang); // (nx,ny) apunta hacia la pared
      const dot = hx * nx + hy * ny;                       // 1 = de frente contra la pared, 0 = paralelo
      if (dot > COS_CHOQUE && !inv) { matar(e, null); continue; }  // muy de frente: muere (salvo con «Invencible»)
      const sale = MARGEN_PARED - d0;                      // si no, lo saca de la pared y se desliza
      e.x -= nx * sale; e.y -= ny * sale;
      if (dot > 0) {
        const tx = hx - dot * nx, ty = hy - dot * ny;
        e.ang = Math.hypot(tx, ty) < 0.05 ? Math.atan2(nx, -ny) : Math.atan2(ty, tx); // su rumbo se alinea con la pared (si iba de frente, gira de lado)
      }
    }
    const i = (e.y | 0) * G + (e.x | 0), r = rastro[i];
    if (r) {
      if (r !== e.id) matar(ents[r - 1], e);                       // cortaste la estela de otro
      else if (e.seq - rastroIdx[i] > GRACIA && !(e.jugador && invActiva())) { matar(e, null); continue; } // te pisaste tu propia estela
    }
    if (dueno[i] === e.id) { if (e.cola.length) cerrar(e); }
    else if (!bono) sellar(e); // en el bono no se deja estela
  }
  // choque de frente: mueren los dos si ambos van fuera de casa
  const R2 = (R_CABEZA * 2) * (R_CABEZA * 2);
  for (let a = 0; a < ents.length; a++) {
    const A = ents[a];
    if (!A.vivo || !A.cola.length) continue;
    for (let b = a + 1; b < ents.length; b++) {
      const B = ents[b];
      if (!B.vivo || !B.cola.length) continue;
      if ((A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y) < R2) { matar(A, null); matar(B, null); break; }
    }
  }
  recogerMonedas();
  if (sucio) recontar();
}

// ----- Bono: monedas que se recogen y reaparecen -----
function colocarMonedas() {
  monBono = []; bonoMonedas = 0;
  if (!bono) return;
  for (let t = 0; t < 20000 && monBono.length < bono.cantidad; t++) {
    const x = C + (Math.random() * 2 - 1) * RADIO, y = C + (Math.random() * 2 - 1) * RADIO;
    if (distEn(x, y) < 8) continue;                                        // lejos de las paredes
    if (monBono.some((m) => Math.hypot(m.x - x, m.y - y) < 14)) continue;  // sin encimarse
    monBono.push({ x, y, hasta: 0 });                                      // hasta = paso del «reloj» en que vuelve (0 = está en el mapa)
  }
}
function recogerMonedas() {
  if (!bono || estado !== "jugando" || !yo || !yo.vivo) return;
  for (const m of monBono) {
    if (m.hasta) { if (reloj >= m.hasta) m.hasta = 0; continue; }
    if ((m.x - yo.x) * (m.x - yo.x) + (m.y - yo.y) * (m.y - yo.y) < R_RECOGER * R_RECOGER) {
      m.hasta = reloj + Math.round(bono.reaparece * 60);
      bonoMonedas += bono.valor;
      ganarMonedas(bono.valor);
    }
  }
}
function terminarBono() {
  estado = "fin"; ganado = false;
  yo.vivo = false;
  setTimeout(() => {
    if (estado !== "fin" || !bono) return;
    mostrarVelo("¡Se acabó el tiempo!", "", [
      ["Monedas recogidas", String(bonoMonedas)],
      ["Monedas totales", String(monedas)],
    ]);
  }, 500);
}

// ----- Partida -----
function iniciar(demo) {
  dueno.fill(0); rastro.fill(0); rastroIdx.fill(0); clave.fill(0); limpiarCapas();
  fx = []; metaDedo = null;
  const llave = bono ? "bono" + bono.n : simple ? "simple" : etapaNv ? "e" + etapaNv.etapa + "-" + etapaNv.n : nivelActual; // qué mapa hace falta
  if (nivelConstruido !== llave) { construirNivel(nvActual()); nivelConstruido = llave; }
  const nb = nvActual().bots;
  const nBots = nb === 0 ? 0 : Math.max(1, Math.min(NUM_BOTS, nb || 4)); // bots: 0 = sin rivales (el bono)
  ents = [];
  for (let id = 1; id <= nBots + 1; id++) ents.push(crear(id));
  yo = ents[0];
  bajas = 0; maxPct = 0; tiempo = 0; monedasPartida = 0; tramosPagados = 0; invHasta = 0; velHasta = 0;
  estado = demo ? "demo" : "jugando";
  usarBoost = !demo && !bono && boostInicio; // el boost comprado se gasta al empezar la partida
  if (usarBoost) { boostInicio = false; guardarMonedas(); }
  for (const e of ents) if (!(demo && e.jugador)) aparecer(e);
  colocarMonedas();
  recontar();
  if (!demo) { cam.x = yo.x; cam.y = yo.y; }
}

// (Se eliminó el menú viejo de 10 niveles: ahora los niveles se eligen en el mapa.)
const etiquetaNivel = () => { $("stNivel").textContent = "Nv " + (nivelActual + 1); };

function fmtTiempo(s) { s = Math.floor(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

async function terminar(gano) {
  let primera = true; // false = nivel de un estado que ya habías pasado
  estado = "fin";
  ganado = !!gano;
  if (gano) { // se detiene al jugador (conserva su territorio) y se desbloquea el siguiente nivel
    yo.vivo = false;
    for (const i of yo.cola) if (rastro[i] === 1) { rastro[i] = 0; pix(i); }
    yo.cola = []; yo.ruta = [];
    if (etapaNv) { // nivel de un estado del mapa: se anota como terminado (solo la primera vez da puntos y monedas del nivel)
      if (etapaNv.n > (etapasHechas[etapaNv.etapa] || 0)) { etapasHechas[etapaNv.etapa] = etapaNv.n; guardarEtapas(); } else primera = false;
    } else if (nivelActual + 1 < NIVELES.length && nivelActual + 1 > desbloqueado) {
      desbloqueado = nivelActual + 1;
      try { localStorage.setItem("paperio_nivel", String(desbloqueado)); } catch (e) {}
      guardarNube(false);
    }
  }
  if (gano && primera) ganarMonedas(MONEDAS_POR_NIVEL);
  const pct = Math.max(maxPct, 0);
  const puntos = Math.round(pct * PUNTOS_POR_PCT) + bajas * PUNTOS_POR_BAJA + (gano && primera ? PUNTOS_POR_NIVEL : 0);
  if (pct > mejorPct) {
    mejorPct = pct;
    try { localStorage.setItem("paperio_mejor", String(pct)); } catch (e) {}
    guardarNube(false);
  }
  let guardado = "";
  if (puntos > 0) {
    // Los puntos se anotan SIEMPRE en el dispositivo y se envían al perfil cuando haya internet y sesión
    encolarPuntos(ID, puntos);
    guardado = "se enviarán a tu perfil cuando haya internet y sesión";
    try { if ((await (await import("../compartido/progreso.js")).vaciarPuntos()) === 0) guardado = "guardados en tu perfil"; } catch (e) {}
  }
  setTimeout(() => {
    if (estado !== "fin") return;
    mostrarVelo(gano ? "¡Nivel superado!" : "Te eliminaron", "", [
      ["Territorio máximo", pct.toFixed(1) + " %"],
      ["Bajas", String(bajas)],
      ["Tiempo", fmtTiempo(tiempo)],
      ["Puntos", "+" + puntos + (guardado ? " (" + guardado + ")" : "")],
      ["Monedas", "+" + monedasPartida + " (tienes " + monedas + ")"],
    ]);
    cargarRanking();
  }, 700);
}

function mostrarVelo(titulo, texto, datos) {
  $("velTitulo").textContent = titulo;
  const ul = $("velDatos");
  ul.innerHTML = "";
  for (const [k, v] of datos) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = v;
    li.append(k + ": ", b);
    ul.appendChild(li);
  }
  const haySig = etapaNv ? !!mapa.siguiente(etapaNv.etapa, etapaNv.n) : nivelActual + 1 < NIVELES.length;
  $("jugar").textContent = estado === "fin" ? (ganado && haySig ? "Siguiente nivel" : "Jugar otra vez") : "Jugar";
  $("volverEtapa").hidden = !(etapaNv || bono); // volver a la lista de niveles del estado
  etiquetaNivel();
  if (simple) $("stNivel").textContent = "Simple";
  else if (bono) $("stNivel").textContent = bono.nombre;
  else if (etapaNv) $("stNivel").textContent = "Nv " + etapaNv.n;
  refrescarTienda();
  marcarEntrar();
  $("velo").hidden = false;
}

function marcarEntrar() { $("entrar").hidden = !J || !!usuario; }
// Aviso dentro de la página: alert() sacaría al navegador de la pantalla completa
let tAviso = 0;
function aviso(txt) { const a = $("aviso"); a.textContent = txt; a.classList.add("ver"); clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("ver"), 4000); }
$("entrar").addEventListener("click", () => { if (J) J.entrar().catch((e) => aviso(e.message)); });
$("jugar").addEventListener("click", () => {
  if (etapaNv) { // nivel de un estado: «Siguiente nivel» si lo pasaste; si no, repite el mismo
    const sig = ganado ? mapa.siguiente(etapaNv.etapa, etapaNv.n) : null;
    empezarNivelEtapa(sig || etapaNv, etapaNv.etapa);
    return;
  }
  if (ganado && nivelActual + 1 < NIVELES.length) nivelActual++;
  ganado = false;
  $("velo").hidden = true; iniciar(false);
});

async function cargarRanking() {
  const caja = $("ranking");
  if (!J) return;
  try {
    const lista = await J.mejores(ID, 5);
    if (!lista.length) return;
    caja.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = "Mejores jugadores";
    const ol = document.createElement("ol");
    for (const j of lista) {
      const li = document.createElement("li");
      li.textContent = (j.nombre || "Jugador") + " · " + (j.mejor || 0) + " pts";
      ol.appendChild(li);
    }
    caja.append(h, ol);
    caja.hidden = false;
  } catch (e) {}
}

// ----- Menú de inicio: Partida simple · Niveles · Mapa -----
let difSimple = 1; // dificultad elegida (índice de DIFICULTADES; por defecto «Normal»)
try {
  const g = localStorage.getItem("paperio_dif_simple");
  if (g !== null && Number.isInteger(Number(g))) difSimple = Math.max(0, Math.min(DIFICULTADES.length - 1, Number(g)));
} catch (e) {}

const mapa = montarMapa({
  raiz: $("mapa"), titulo: $("mapaTitulo"), info: $("mapaInfo"), lienzo: $("mapaLienzo"),
  atras: $("mapaAtras"), ir: $("mapaIr"),
  alSalir: () => { mapa.cerrar(); mostrarInicio(); },
  jugarBono: empezarBono, jugarNivel: empezarNivelEtapa, progreso: () => etapasHechas,
});

function mostrarInicio() {
  const eraSimple = !!(simple || bono || etapaNv);
  simple = null; bono = null; etapaNv = null; ganado = false;
  if (estado !== "demo" || eraSimple) iniciar(true); // de fondo se ve una demostración
  $("velo").hidden = true; mapa.cerrar();
  $("inicioSimple").hidden = true; $("inicioBotones").hidden = false;
  $("inicio").hidden = false;
}
function pintarDificultad() {
  const d = DIFICULTADES[difSimple];
  $("difNombre").textContent = d.nombre;
  $("difInfo").textContent = d.bots + (d.bots === 1 ? " rival" : " rivales");
  $("difAnt").disabled = difSimple <= 0;
  $("difSig").disabled = difSimple >= DIFICULTADES.length - 1;
}
function cambiarDificultad(d) {
  difSimple = Math.max(0, Math.min(DIFICULTADES.length - 1, difSimple + d));
  try { localStorage.setItem("paperio_dif_simple", String(difSimple)); } catch (e) {}
  pintarDificultad();
}
function empezarSimple() {
  const d = DIFICULTADES[difSimple];
  bono = null; etapaNv = null;
  simple = { nombre: "Simple · " + d.nombre, bots: d.bots, meta: Infinity, dificultad: d.dificultad, rasgos: d.rasgos, forma: MUNDO_SIMPLE };
  ganado = false;
  $("inicio").hidden = true; $("velo").hidden = true;
  iniciar(false);
  $("stNivel").textContent = "Simple";
}
$("btnSimple").addEventListener("click", () => { $("inicioBotones").hidden = true; $("inicioSimple").hidden = false; pintarDificultad(); });
$("difAnt").addEventListener("click", () => cambiarDificultad(-1));
$("difSig").addEventListener("click", () => cambiarDificultad(1));
$("simpleJugar").addEventListener("click", empezarSimple);
$("simpleAtras").addEventListener("click", () => { $("inicioSimple").hidden = true; $("inicioBotones").hidden = false; });
$("btnNiveles").addEventListener("click", () => { $("inicio").hidden = true; mapa.abrir(true); });
// Un nivel de un estado del mapa (id = «col», «camp», «bcs»...)
function empezarNivelEtapa(nv, id) {
  etapaNv = { ...nv, etapa: id }; simple = null; bono = null; ganado = false;
  mapa.cerrar();
  $("inicio").hidden = true; $("velo").hidden = true;
  iniciar(false);
  $("stNivel").textContent = "Nv " + nv.n;
}
function empezarBono(b) {
  bono = b; simple = null; etapaNv = null; ganado = false;
  mapa.cerrar();
  $("inicio").hidden = true; $("velo").hidden = true;
  iniciar(false);
  $("stNivel").textContent = b.nombre;
}
$("btnMapa").addEventListener("click", () => { $("inicio").hidden = true; mapa.abrir(); });
$("irInicio").addEventListener("click", mostrarInicio);
$("volverEtapa").addEventListener("click", () => { $("velo").hidden = true; etapaNv = null; bono = null; mapa.abrir(true); });

// ----- Navegación estándar: «🎮 Juegos» y «☰» (Pausa en la partida, Menú principal fuera de ella) -----
const enPartida = () => estado === "jugando" && !!yo && yo.vivo;
const pausa = crearMenuPausa({
  puedeAbrir: enPartida,
  alAbrir: () => { pausado = true; metaDedo = null; puls.clear(); metaTeclas = null; },
  alContinuar: () => { pausado = false; },
  ayudaSalir: "Pierdes esta partida.",
  alSalir: () => { pausado = false; mostrarInicio(); },
});
const btnMenu = $("btn-menu");
let navTxt = "";
function actualizarNav() {
  $("hudDatos").hidden = estado !== "jugando"; // los marcadores solo se ven jugando (no sobre los menús)
  const enInicio = !$("inicio").hidden, p = enPartida();
  const k = enInicio ? "x" : p ? "p" : "m";
  if (k === navTxt) return;
  navTxt = k;
  btnMenu.hidden = enInicio; // en el menú principal del juego no se muestra
  btnMenu.innerHTML = '<span class="b-ico">☰</span> ' + (p ? "Pausa" : "Menú principal");
  btnMenu.title = p ? "Pausa" : "Volver al menú principal de Paperio";
}
btnMenu.addEventListener("click", () => { if (enPartida()) pausa.abrir(); else mostrarInicio(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) pausa.abrir(); }); // al cambiar de pestaña se pausa sola

// ----- Controles -----
// Dedo / ratón: mantén pulsado y arrastra: la cabeza gira hacia donde apuntes (como una palanca flotante).
// Teclado: flechas / WASD (se pueden combinar dos para ir en diagonal).
let metaDedo = null, metaTeclas = null;
const TECLAS = { arrowup: "u", w: "u", arrowdown: "d", s: "d", arrowleft: "l", a: "l", arrowright: "r", d: "r" };
const puls = new Set();
function recalcularTeclas() {
  const vx = (puls.has("r") ? 1 : 0) - (puls.has("l") ? 1 : 0), vy = (puls.has("d") ? 1 : 0) - (puls.has("u") ? 1 : 0);
  metaTeclas = vx || vy ? Math.atan2(vy, vx) : null;
}
addEventListener("keydown", (ev) => {
  const t = TECLAS[ev.key.toLowerCase()];
  if (t) { ev.preventDefault(); puls.add(t); recalcularTeclas(); }
});
addEventListener("keyup", (ev) => {
  const t = TECLAS[ev.key.toLowerCase()];
  if (t) { puls.delete(t); recalcularTeclas(); }
});
addEventListener("blur", () => { puls.clear(); metaTeclas = null; });

const RADIO_PALANCA = 60; // px: si arrastras más lejos, el punto de origen te sigue (así puedes cambiar de rumbo rápido)
let arrastra = false, ox = 0, oy = 0;
cv.addEventListener("pointerdown", (ev) => {
  arrastra = true; ox = ev.clientX; oy = ev.clientY;
  try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
});
cv.addEventListener("pointermove", (ev) => {
  if (!arrastra) return;
  const dx = ev.clientX - ox, dy = ev.clientY - oy, d = Math.hypot(dx, dy);
  if (d < 10) return;
  metaDedo = Math.atan2(dy, dx);
  if (d > RADIO_PALANCA) { ox = ev.clientX - dx / d * RADIO_PALANCA; oy = ev.clientY - dy / d * RADIO_PALANCA; }
});
const soltar = () => { arrastra = false; metaDedo = null; };
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);

// ----- Dibujo -----
function ajustar() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = Math.max(1, r.width); vh = Math.max(1, r.height);
  cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cs = Math.max(2, Math.min(vw, vh) / CELDAS_VISTA);
}
addEventListener("resize", ajustar);
if (typeof ResizeObserver !== "undefined") new ResizeObserver(ajustar).observe($("escena"));

const SX = (x) => (x - cam.x) * cs + vw / 2;
const SY = (y) => (y - cam.y) * cs + vh / 2;

function cuadro(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Dibuja solo la parte de una capa que se ve en pantalla (dy = desplazamiento hacia abajo, para las sombras)
function capa(c, dy) {
  const x0 = Math.max(0, Math.floor(cam.x - vw / 2 / cs) - 2), x1 = Math.min(G, Math.ceil(cam.x + vw / 2 / cs) + 2);
  const y0 = Math.max(0, Math.floor(cam.y - vh / 2 / cs) - 2), y1 = Math.min(G, Math.ceil(cam.y + vh / 2 / cs) + 2);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(c, x0 * ESCALA, y0 * ESCALA, (x1 - x0) * ESCALA, (y1 - y0) * ESCALA, SX(x0), SY(y0) + dy, (x1 - x0) * cs, (y1 - y0) * cs);
}

function dibujar(k) {
  subirCapas();

  // fuera del mapa: transparente, para que se vea la madera (estándar de los juegos).
  // Para volver al azul: ctx.fillStyle = "#2c6e9e"; ctx.fillRect(0, 0, vw, vh);
  ctx.clearRect(0, 0, vw, vh);

  // el suelo del mapa (con su sombra abajo) y, encima, territorio y estelas.
  // Son capas de alta resolución con los bordes ya suavizados (ver «Capas de territorio»).
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  capa(cvS, Math.max(3, cs * 1.6));
  capa(cvM, 0);
  capa(cvB, Math.max(2, cs * 1.1));
  capa(cvA, 0);

  // monedas del bono (las recogidas desaparecen y vuelven a los segundos)
  if (bono) {
    const rm = cs * R_MONEDA;
    for (const m of monBono) {
      if (m.hasta) continue;
      const X = SX(m.x), Y = SY(m.y) + Math.sin((reloj + m.x * 7) / 12) * cs * 0.6;
      if (X < -rm || Y < -rm || X > vw + rm || Y > vh + rm) continue;
      ctx.fillStyle = "#b8860b"; ctx.beginPath(); ctx.arc(X, Y + cs * 0.6, rm, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(X, Y, rm, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffeb99"; ctx.beginPath(); ctx.arc(X, Y, rm * 0.58, 0, TAU); ctx.fill();
    }
  }

  // cabezas: cubito redondeado con ojos que miran hacia donde van
  const lado = cs * 6.2, grosor = cs * 1.4;
  ctx.textAlign = "center";
  const fuenteNombre = "700 " + Math.max(11, Math.round(cs * 4)) + "px system-ui, sans-serif";
  ctx.font = fuenteNombre;
  for (const e of ents) {
    if (!e.vivo) continue;
    const hx = e.px + (e.x - e.px) * k, hy = e.py + (e.y - e.py) * k;
    const X = SX(hx), Y = SY(hy);
    if (X < -lado * 3 || Y < -lado * 3 || X > vw + lado * 3 || Y > vh + lado * 3) continue;
    const esInv = e.jugador && invActiva(), esVel = e.jugador && velActiva();
    const parpadea = esInv && invHasta - reloj < 120 && ((reloj / 6) | 0) % 2 === 0; // en los últimos 2 s parpadea para avisar
    let cC = e.cC, cD = e.cD;
    if (esInv && !parpadea) { const h = (reloj * 6) % 360; cC = "hsl(" + h + ",90%,60%)"; cD = "hsl(" + h + ",80%,38%)"; }
    ctx.fillStyle = cD;
    cuadro(X - lado / 2, Y - lado / 2 + grosor, lado, lado, lado * 0.22); ctx.fill();
    ctx.fillStyle = cC;
    cuadro(X - lado / 2, Y - lado / 2, lado, lado, lado * 0.22); ctx.fill();
    const fxx = Math.cos(e.ang), fyy = Math.sin(e.ang), sxx = -fyy, syy = fxx;
    const ex0 = X + fxx * lado * 0.1, ey0 = Y + fyy * lado * 0.1;
    for (const s of [-1, 1]) {
      const ex = ex0 + sxx * s * lado * 0.2, ey = ey0 + syy * s * lado * 0.2;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ex, ey, lado * 0.14, 0, TAU); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(ex + fxx * lado * 0.06, ey + fyy * lado * 0.06, lado * 0.07, 0, TAU); ctx.fill();
    }
    if (esInv && !parpadea) { // aro arcoíris brillante
      ctx.save();
      const col = "hsl(" + ((reloj * 6 + 180) % 360) + ",100%,65%)";
      ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(X, Y + grosor / 2, lado * 0.95, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (esVel) { // rayas de velocidad detrás de la cabeza
      ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (const s of [-1, 0, 1]) {
        const bx = X - fxx * lado * 0.75 + sxx * s * lado * 0.32, by = Y - fyy * lado * 0.75 + syy * s * lado * 0.32;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - fxx * lado * 0.9, by - fyy * lado * 0.9); ctx.stroke();
      }
    }
    ctx.fillStyle = "rgba(20,26,46,.85)";
    ctx.fillText(e.nombre, X, Y - lado * 0.8);
    if (esInv || esVel) {
      ctx.font = Math.round(lado * 0.8) + "px system-ui, sans-serif";
      ctx.fillText((esInv ? "⭐" : "") + (esVel ? "⚡" : ""), X, Y - lado * 1.5);
      ctx.font = fuenteNombre;
    }
  }

  // aros al morir
  for (const f of fx) {
    ctx.strokeStyle = "hsla(" + f.tono + ",80%,50%," + Math.max(0, 1 - f.t / 0.6) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(SX(f.x), SY(f.y), cs * (3 + f.t * 40), 0, TAU);
    ctx.stroke();
  }

  // marcador de los primeros lugares
  const top = ents.filter((e) => e.vivo && cuenta[e.id] > 0).sort((a, b) => cuenta[b.id] - cuenta[a.id]).slice(0, 5);
  if (top.length && !bono) {
    const ancho = 128, alto = 10 + top.length * 17, bx = vw - ancho - 8, by = 8;
    ctx.fillStyle = "rgba(16,17,20,.65)";
    ctx.fillRect(bx, by, ancho, alto);
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    top.forEach((e, n) => {
      const yy = by + 8 + n * 17;
      ctx.fillStyle = e.cT; ctx.fillRect(bx + 6, yy, 10, 10);
      ctx.fillStyle = e.jugador ? "#fff" : "#cfd2d8";
      ctx.fillText(e.nombre, bx + 22, yy + 9);
      ctx.textAlign = "right";
      ctx.fillText((cuenta[e.id] * 100 / AREA).toFixed(1) + "%", bx + ancho - 6, yy + 9);
      ctx.textAlign = "left";
    });
  }
}

// ----- Ciclo principal -----
let ultimo = 0, acum = 0, hud = "";
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.1, Math.max(0, (ts - ultimo) / 1000));
  ultimo = ts;
  actualizarNav();
  if (pausado) return; // menú de pausa abierto: todo queda congelado
  acum += dt;
  while (acum >= SIM) { paso(); acum -= SIM; }
  if (estado === "jugando" && yo.vivo) tiempo += dt;
  for (const e of ents) if (!e.vivo && !e.jugador) { e.espera -= dt; if (e.espera <= 0) aparecer(e); }
  if (sucio) recontar();
  if (estado === "jugando" && yo.vivo && invHasta > 0 && !invActiva() && cuenta[1] === 0) matar(yo, null); // se quedó sin territorio mientras era invencible
  if (estado === "jugando" && yo.vivo && cuenta[1] * 100 / AREA >= nvActual().meta) terminar(true);
  if (bono && estado === "jugando" && tiempo >= bono.duracion) terminarBono();
  for (const f of fx) f.t += dt;
  fx = fx.filter((f) => f.t < 0.6);

  // la cámara sigue al jugador (o, mientras no juegas, al bot más grande)
  const k = acum / SIM;
  let seg = yo && yo.vivo ? yo : null;
  if (!seg) for (const e of ents) if (e.vivo && (!seg || cuenta[e.id] > cuenta[seg.id])) seg = e;
  if (seg) {
    const tx = seg.px + (seg.x - seg.px) * k, ty = seg.py + (seg.y - seg.py) * k;
    const a = seg === yo ? 1 : Math.min(1, dt * 8); // al jugador la cámara lo sigue pegada (sin retraso)
    cam.x += (tx - cam.x) * a; cam.y += (ty - cam.y) * a;
  }
  dibujar(k);
  refrescarBoosts();

  const pct = (yo ? cuenta[1] * 100 / AREA : 0);
  const txt = [pct.toFixed(1), bajas, Math.max(mejorPct, maxPct).toFixed(1), monedas, bono ? Math.ceil(bono.duracion - tiempo) + "/" + bonoMonedas : ""].join("|");
  if (txt !== hud) {
    hud = txt;
    if (bono) { // en el bono: tiempo que queda y monedas recogidas
      $("stTerr").textContent = "⏱ " + Math.max(0, Math.ceil(bono.duracion - tiempo)) + " s";
      $("stBajas").textContent = "💰 +" + bonoMonedas;
    } else {
      $("stTerr").textContent = "▦ " + pct.toFixed(1) + " %";
      $("stBajas").textContent = "☠ " + bajas;
    }
    $("stMejor").textContent = "🏆 " + Math.max(mejorPct, maxPct).toFixed(1) + " %";
    $("stMonedas").lastChild.textContent = monedas;
  }
}

ajustar();
iniciar(true);
mostrarInicio(); // al abrir el juego se muestra el menú de inicio
cargarRanking();
requestAnimationFrame((ts) => { ultimo = ts; bucle(ts); });
