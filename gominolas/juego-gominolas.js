// Ruta: gominolas/juego-gominolas.js
// «Conecta gominolas»: arrastra por gominolas iguales y juntas (3 o más) para juntarlas.
// Niveles con límite de movimientos: hay que eliminar todas las gominolas negras de la parte baja.
// Una negra se elimina cuando se rompe una gominola pegada a ella por arriba, abajo, izquierda o derecha (NO en diagonal).
// Si un movimiento no elimina ninguna negra, aparece una nueva abajo.
// Perfil y sesión: se cargan aparte para que el juego funcione aunque Firebase no esté disponible
import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
import { crearMenuPausa } from "../compartido/menu-pausa.js"; // menú de pausa estándar (☰)
import { montarMapa } from "../compartido/mapa-niveles.js";   // menú principal ESTÁNDAR: México con agua, mundo y listas de niveles
import { crearEtapas } from "../compartido/etapas-mapa.js";   // 32 estados + 194 países
import { TABLEROS, DIFICULTADES, parametrosLibre, parametrosNivel } from "./logica-gominolas.js"; // balance: tableros, dificultades, negras y movimientos (el bot de pruebas usa los mismos números)
import { nivelDe } from "./catalogo-gominolas.js"; // qué tablero, dificultad, tipo y patrón tiene cada uno de los 22 600 niveles
import { estrellasDe, estrellasDeNivel, ponerEstrellas, unirEstrellas, recompensa, carteraVacia, saldo, ganarMonedas, gastarMonedas, unirCarteras, unirProgresoGominolas } from "./cartera-gominolas.js"; // monedas, cartera y estrellas
let nube = null; // se llena al cargar compartido/progreso.js (abajo del todo)
let entrar = async () => { throw new Error("Sesión no disponible sin conexión"); };

const ID = "gominolas"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
let COLUMNAS = 6;           // cambian con el tablero: campaña 6×8; modo libre 6×8, 8×10, 10×12, 12×14 o 14×16 (ver TABLEROS en logica-gominolas.js)
let FILAS = 8;
const COLORES = 5;          // de 3 a 6
const MIN_CADENA = 3;       // mínimo de gominolas para juntar
const PUNTOS_BASE = 10;     // por gominola; las cadenas largas dan bono
const GRAVEDAD = 70;        // filas/s² con que caen
const PUNTOS_POR_PERFIL = 25; // al perfil se envía 1 punto por cada 25 del juego (así pesa parecido a los demás juegos)
const CLAVE_MEJOR = "gominolas_mejor";
const CLAVE_NIVEL = "gominolas_nivel";
const CLAVE_PROG = "gominolas_progreso"; // { mejor, nivel } juntos, para sincronizarlos con la cuenta (antes: las dos claves de arriba)

// Gominolas negras. Cuántas hay, cuántos movimientos se dan y cuántas negras nuevas salen por jugada fallida se calculan en
// logica-gominolas.js (campaña: parametrosNivel(nivelDe(n)); modo libre: parametrosLibre según tablero y dificultad).
let zonaIni = 5;            // filas de abajo donde nacen las negras al empezar (depende de la altura del tablero)
let zonaNva = 3;            // filas de abajo donde aparece la negra extra cuando no eliminas ninguna
let penaliza = 1;           // negras nuevas por jugada que no elimina ninguna: campaña 1; libre fácil 1, medio 2, difícil 3
const PUNTOS_CAPA = 10;     // puntos por cada capa (candado) que se rompe en una negra con capas
const PUNTOS_NEGRA = 30;    // puntos por cada negra eliminada
const BONO_MOVIMIENTO = 20; // puntos por cada movimiento que te sobre al ganar

// Poderes: una cadena larga deja un osito con poder en la última casilla. Ese osito CONSERVA EL COLOR de la cadena que lo creó
// y solo se activa cuando lo incluyes en una cadena de ositos de ese mismo color (tocarlo solo no hace nada).
// El poder se activa en la última casilla seleccionada. Si la cadena lleva varios poderes, se aplican todos: fila + columna (+ color).
// Mismos números que logica-gominolas.js (ahí se miden con el bot).
const CADENA_HORIZONTAL = 7; // 7 o 8 gominolas → poder horizontal (rompe toda la fila)
const CADENA_VERTICAL = 9;   // 9 o más → poder vertical (rompe toda la columna)
// «color» no lo deja ninguna cadena: se coloca desde la tienda (50 monedas) y, al entrar en una cadena, rompe todas las gominolas de ese color
const PODERES = {
  horizontal: { icono: "↔️" },
  vertical: { icono: "↕️" },
  color: { icono: "🎨" },
};

const NEGRA = -1;           // valor de «k» de una gominola negra
const NEGRA_COL = { c: "#3d3a5e", l: "#6a6791", d: "#242240", o: "#16142b" };

// Colores de gelatina como la imagen de referencia: c = color, l = claro (brillos), d = oscuro (abajo), o = borde.
// Cada color es un animalito distinto (ver trazoForma): 0 perrito rojo · 1 gatito rosa · 2 gatito amarillo · 3 perrito verde · 4 gatito azul · 5 osito morado.
const PALETA = [
  { c: "#f2381f", l: "#ff7a55", d: "#c01a10", o: "#9e1209" }, // rojo
  { c: "#ff5fd2", l: "#ffa6ec", d: "#d93bb0", o: "#b02490" }, // rosa
  { c: "#ffd21f", l: "#fff07a", d: "#f0a400", o: "#c98200" }, // amarillo
  { c: "#5ed22b", l: "#a6f26a", d: "#2fa31a", o: "#1f7d10" }, // verde
  { c: "#27c3ff", l: "#8fe6ff", d: "#0a90e0", o: "#0a6fb5" }, // azul
  { c: "#a86bff", l: "#d1abff", d: "#7a3fe0", o: "#5b27b0" }, // morado (solo si COLORES = 6)
];
const NOTAS = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];

const colorK = (k) => (k >= 0 ? PALETA[k] : NEGRA_COL);
const cuerpos = new Map(); // cuerpos de gelatina ya dibujados (se vacía al cambiar el tamaño)

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const elPts = document.getElementById("pts");
const elMovs = document.getElementById("movs");
const elNegras = document.getElementById("negras");
const elNivel = document.getElementById("nivel");
const elBarra = document.getElementById("barra");
const ovl = document.getElementById("ovl");
const ovlTitulo = document.getElementById("ovlTitulo");
const ovlTexto = document.getElementById("ovlTexto");
const ovlBtn = document.getElementById("ovlBtn");
const btnEntrar = document.getElementById("entrar");
const escena = document.querySelector(".escena");
const tableroEl = document.querySelector(".tablero");
const pantMenu = document.getElementById("pantMenu");     // menú principal: Continuar · Modo libre · Niveles
const pantLibre = document.getElementById("pantLibre");   // modo libre: elegir tablero y dificultad
const ovlMapa = document.getElementById("ovlMapa");
const rotNivel = document.getElementById("rotNivel");

// ---------- Estado ----------
let grid = [];          // grid[fila][col] = { k: color (o NEGRA), y: fila visual, v: velocidad, p: poder ("horizontal" | "vertical" | "color", solo en ositos con poder) }
let estado = "inicio";  // inicio | jugando | fin
let puntos = 0;
let puntosInicioNivel = 0; // puntos con los que empezó el nivel actual (al reintentar se vuelve a ellos)
let nivel = 1;          // nivel MÁS ALTO desbloqueado (el progreso; el nivel «hecho» más alto es nivel − 1)
let actual = 1;         // nivel que se está jugando (puede ser uno anterior si se repite desde el mapa)
let pendiente = 1;      // nivel que empieza el botón de la pantalla de resultado (siguiente, o el mismo si se perdió)
let ganoUltimo = false; // el último nivel terminado se ganó (para que el agua del mapa suba al volver)
let movs = 0;           // movimientos que quedan
let movsIni = 1;        // movimientos con que empezó el nivel
let mejor = 0;
let cadena = null;      // [{f,c}, ...] mientras el dedo está abajo
let revisar = false;
let particulas = [];
let textos = [];
let tam = 50;           // tamaño de celda en px CSS
let ultimo = 0;
let partida = 0;        // número de intento: evita que un aviso tardío del perfil se pegue al texto de otra pantalla
let usuario = null;     // sesión de Google (null si no ha entrado)
let modo = "campana";   // "campana" (mapa de niveles) | "libre" (rondas sin fin)
let libre = { t: TABLEROS[0], d: DIFICULTADES.facil, ronda: 1 }; // lo elegido en el modo libre y la ronda en juego
let recordsLibre = {};  // { "l_6x8_facil": rondas superadas (récord) }; viaja con el progreso a la cuenta (se une con el máximo)
const CLAVE_SEL = "gominolas_libre_sel";

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}
try { nivel = parseInt(localStorage.getItem(CLAVE_NIVEL), 10) || 1; } catch (e) {}
// Estrellas por nivel (texto con un dígito 0-3 por nivel) y cartera de monedas (contadores por dispositivo): ver cartera-gominolas.js
let estrellas = "";
let cartera = carteraVacia();
const CLAVE_DISP = "gominolas_dispositivo"; // id de ESTE dispositivo: la cartera lleva un contador de monedas por dispositivo
let idDisp = "";
try { idDisp = localStorage.getItem(CLAVE_DISP) || ""; if (!idDisp) { idDisp = Math.random().toString(36).slice(2, 10); localStorage.setItem(CLAVE_DISP, idDisp); } } catch (e) {}
if (!idDisp) idDisp = "t" + Math.random().toString(36).slice(2, 8); // sin localStorage: vale solo en esta sesión
const tomarRecords = (p) => { for (const k in p || {}) if (k.startsWith("l_")) recordsLibre[k] = Math.max(Number(p[k]) || 0, recordsLibre[k] || 0); };
try { const p = JSON.parse(localStorage.getItem(CLAVE_PROG)); if (p) { mejor = Math.max(mejor, Number(p.mejor) || 0); nivel = Math.max(nivel, Number(p.nivel) || 1); tomarRecords(p); estrellas = unirEstrellas(estrellas, p.est); cartera = unirCarteras(cartera, p.cartera); } } catch (e) {}
try { const [t, d] = (localStorage.getItem(CLAVE_SEL) || "").split("|"); libre.t = TABLEROS.find((x) => x.id === t) || libre.t; libre.d = DIFICULTADES[d] || libre.d; } catch (e) {}
function guardarProg() {
  // unirProgresoGominolas(x, null) deja las claves en el mismo orden que usa la sincronización (así no se ve «cambio» donde no lo hay)
  try { localStorage.setItem(CLAVE_PROG, JSON.stringify(unirProgresoGominolas({ mejor, nivel, ...recordsLibre, est: estrellas, cartera }, null))); } catch (e) {}
  if (nube) nube.guardado();
}
// Chip dorado de monedas (arriba a la derecha). gastar(n) cobra si alcanza (los boosts de la tienda cuestan PRECIOS.* de cartera-gominolas.js)
const elMonedas = document.getElementById("monedas");
function pintarMonedas() { if (elMonedas) elMonedas.textContent = saldo(cartera).toLocaleString("es-MX"); }
function gastar(n) {
  if (!gastarMonedas(cartera, idDisp, n)) return false;
  pintarMonedas(); guardarProg();
  return true;
}
pintarMonedas();
if (mejor || nivel > 1 || Object.keys(recordsLibre).length) guardarProg(); // pasa lo de las claves de antes a la nueva

// ---------- Mapa de niveles (menú principal), botón «☰» y menú de pausa ----------
// 100 niveles por estado de México (32) y por país (194): 22 600 en total. Los niveles se abren en orden.
// El mapa lo dibuja compartido/mapa-niveles.js; aquí solo se le dice el progreso y qué pasa al elegir un nivel.
const NIVELES_POR_ETAPA = 100;
const ETAPAS = crearEtapas({ porEtapa: NIVELES_POR_ETAPA });
const TOTAL_NIVELES = ETAPAS.total;
const btnMenu = document.getElementById("btn-menu");

// «☰» (estándar): en el menú principal del juego NO se muestra; en el resto de pantallas (niveles, modo libre, resultados) dice
// «Menú principal» y vuelve a él; dentro de una partida dice «Pausa» y abre el menú de pausa.
function menuBoton() {
  const enMenu = !pantMenu.hidden;
  const enPartida = !enMenu && pantLibre.hidden && !mapa.abierto() && estado === "jugando";
  btnMenu.hidden = enMenu;
  document.getElementById("txt-menu").textContent = enPartida ? "Pausa" : "Menú principal";
  btnMenu.title = enPartida ? "Pausa" : "Volver al menú principal";
}
// Ventana «Info» del mapa (usa los estilos .pausa-* de compartido/inmersivo.css)
function abrirInfo() {
  const fondo = document.createElement("div");
  fondo.className = "pausa-fondo"; fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true");
  const panel = document.createElement("div"); panel.className = "pausa-panel";
  const t = document.createElement("h2"); t.textContent = "ℹ️ Cómo se juega";
  const txt = document.createElement("p"); txt.style.cssText = "margin:0 0 12px;line-height:1.45;font-size:.92rem";
  txt.textContent = "Arrastra por 3 o más gominolas iguales y juntas. Rompe las gominolas que están pegadas a una negra (arriba, abajo, izquierda o derecha; en diagonal no cuenta) para eliminarla: si en una jugada no eliminas ninguna, aparece otra. Cadenas de 5 crean un osito con poder ↔️ (rompe una fila) y de 7 uno con poder ↕️ (rompe una columna). El osito con poder conserva su color y solo se activa cuando lo incluyes en una cadena de ositos de ese mismo color: se activa en la última casilla de la cadena. Si metes dos poderes en la misma cadena se aplican a la vez." + " Los niveles se desbloquean en orden: cada estado y cada país tiene 100. Al terminar un estado se desbloquea el siguiente y el agua del mapa sube." + " Modo libre: elige tablero y dificultad y juega rondas sin fin hasta quedarte sin movimientos. Si una jugada no elimina ninguna negra, aparece 1 nueva en Fácil, 2 en Medio y 3 en Difícil. No suma al perfil; solo guarda tu récord de rondas.";
  txt.textContent += " Si una negra tiene cadenas y candados, necesita una jugada por cada candado: cada vez que la toques con una gominola rota pierde uno.";
  const ok = document.createElement("button"); ok.type = "button"; ok.className = "b3d txt b-verde"; ok.textContent = "Entendido";
  const cerrar = () => { fondo.remove(); };
  ok.addEventListener("click", cerrar); fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  panel.append(t, txt, ok); fondo.appendChild(panel); document.body.appendChild(fondo);
  try { ok.focus({ preventScroll: true }); } catch (e) {}
}
const mapa = montarMapa({
  prefijo: "gominolas",                 // claves de localStorage del mapa: «gominolas-agua» y «gominolas-mundo-visto»
  etapas: ETAPAS,
  progreso: () => ({ max: Math.min(nivel, TOTAL_NIVELES), hecho: Math.min(nivel - 1, TOTAL_NIVELES) }),
  jugarNivel: (n) => { mapa.cerrar(); puntosInicioNivel = 0; jugar(n); },
  infoNivel: (n) => { const e = estrellasDeNivel(estrellas, n); return e ? { sub: "★".repeat(e) + "☆".repeat(3 - e), sinMarca: true, aria: e + (e === 1 ? " estrella" : " estrellas") } : {}; },
  alInfo: abrirInfo,
  alCambiarVista: () => menuBoton(),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => { mapa.cerrar(); mostrarLibre(); } }], // estándar: junto a «Continuar»
});
function abrirMapa(aguaSube) {
  estado = "inicio"; cadena = null;
  ovl.classList.add("oculto");
  pantMenu.hidden = true; pantLibre.hidden = true; escena.hidden = true;
  mapa.abrir(Math.min(nivel, TOTAL_NIVELES), !!aguaSube);
  menuBoton();
}
// Menú de pausa. En el modo libre no hay «Reiniciar» (sería repetir la ronda sin costo): solo Continuar o Salir
const opcionesPausa = {
  boton: btnMenu,
  puedeAbrir: () => estado === "jugando" && !mapa.abierto() && pantMenu.hidden && pantLibre.hidden,
  alAbrir: () => { cadena = null; },
  extras: () => (modo === "libre" ? [] : [{ icono: "🔄", texto: "Reiniciar nivel", clase: "b-azul", ayuda: "Vuelves a empezar este nivel con tus puntos de antes.", alElegir: () => empezar() }]),
  textoSalir: "Salir al mapa",
  alSalir: () => (modo === "libre" ? mostrarLibre() : abrirMapa(false)),
  ayudaSalir: () => (modo === "libre" ? "La partida termina; se guarda cuántas rondas superaste." : "Se pierde lo avanzado en este nivel."),
};
crearMenuPausa(opcionesPausa);
// Fuera de una partida (mapa, modo libre, resultados) el ☰ dice «Menú principal» y vuelve al menú del juego
btnMenu.addEventListener("click", () => { if (mapa.abierto() || !pantLibre.hidden || estado !== "jugando") mostrarMenu(); });

// ---------- Menú principal y modo libre ----------
const claveLibre = () => "l_" + libre.t.id + "_" + libre.d.id;
function mostrarMenu() {
  estado = "inicio"; cadena = null;
  ovl.classList.add("oculto");
  if (mapa.abierto()) mapa.cerrar();
  pantLibre.hidden = true; escena.hidden = true; pantMenu.hidden = false;
  document.getElementById("menuNivel").textContent = Math.min(nivel, TOTAL_NIVELES);
  menuBoton();
}
function botonOpcion(texto, on, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "b3d txt " + (on ? "b-oro on" : "b-gris");
  b.textContent = texto;
  b.setAttribute("aria-pressed", String(on));
  b.addEventListener("click", fn);
  return b;
}
function pintarLibre() {
  const bt = document.getElementById("libreTableros"), bd = document.getElementById("libreDifs");
  bt.replaceChildren(); bd.replaceChildren();
  for (const t of TABLEROS) bt.appendChild(botonOpcion(t.id.replace("x", "×"), t === libre.t, () => { libre.t = t; pintarLibre(); }));
  for (const d of Object.values(DIFICULTADES)) bd.appendChild(botonOpcion(d.icono + " " + d.nombre, d === libre.d, () => { libre.d = d; pintarLibre(); }));
  const n = libre.d.penaliza;
  document.getElementById("libreAyuda").textContent = "Si una jugada no elimina ninguna negra, aparece" + (n === 1 ? " 1 negra nueva." : "n " + n + " negras nuevas.");
  const rec = recordsLibre[claveLibre()] || 0;
  document.getElementById("libreRecord").textContent = rec ? "🏆 Récord: " + rec + (rec === 1 ? " ronda" : " rondas") : "Aún sin récord en esta combinación";
  try { localStorage.setItem(CLAVE_SEL, libre.t.id + "|" + libre.d.id); } catch (e) {}
}
function mostrarLibre() {
  estado = "inicio"; cadena = null;
  ovl.classList.add("oculto");
  if (mapa.abierto()) mapa.cerrar();
  pantMenu.hidden = true; escena.hidden = true; pantLibre.hidden = false;
  pintarLibre();
  menuBoton();
}
function jugarLibre(ronda) {
  modo = "libre";
  libre.ronda = ronda;
  if (ronda === 1) puntosInicioNivel = 0;
  opcionesPausa.textoSalir = "Salir a elegir tablero";
  pantMenu.hidden = true; pantLibre.hidden = true; escena.hidden = false;
  empezar();
}
document.getElementById("menuContinuar").addEventListener("click", () => { puntosInicioNivel = 0; jugar(Math.min(nivel, TOTAL_NIVELES)); });
document.getElementById("menuLibre").addEventListener("click", mostrarLibre);
document.getElementById("menuNiveles").addEventListener("click", () => abrirMapa(false));
document.getElementById("menuInfo").addEventListener("click", abrirInfo);
document.getElementById("libreJugar").addEventListener("click", () => jugarLibre(1));

// ---------- Sonido ----------
let ac = null;
function tono(f, d = 0.12) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume(); // en iPhone/iPad el audio nace «suspendido» hasta un toque
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.14, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + d);
  } catch (e) {}
}

// ---------- Tablero ----------
const azar = () => Math.floor(Math.random() * COLORES);
const nueva = (y) => ({ k: azar(), y, v: 0 });

function llenar() {
  grid = [];
  for (let f = 0; f < FILAS; f++) {
    grid.push([]);
    for (let c = 0; c < COLUMNAS; c++) grid[f].push(nueva(f - FILAS - 1 - Math.random() * 2));
  }
  let intentos = 0;
  while (!hayJugada() && intentos++ < 50) barajar();
}

function vecinos(f, c) {
  const r = [];
  for (let df = -1; df <= 1; df++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!df && !dc) continue;
      const nf = f + df, nc = c + dc;
      if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) r.push([nf, nc]);
    }
  return r;
}

// Vecinos en cruz (arriba, abajo, izquierda, derecha): son los únicos que cuentan para eliminar negras.
// Las cadenas de gominolas, en cambio, sí pueden ir en diagonal (usan «vecinos»).
function vecinosCruz(f, c) {
  const r = [];
  if (f > 0) r.push([f - 1, c]);
  if (f < FILAS - 1) r.push([f + 1, c]);
  if (c > 0) r.push([f, c - 1]);
  if (c < COLUMNAS - 1) r.push([f, c + 1]);
  return r;
}

// ¿Existe algún grupo de MIN_CADENA o más gominolas iguales y juntas? (las negras no cuentan; los ositos con poder sí, como cualquier osito de su color)
function hayJugada() {
  const visto = new Set();
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      if (visto.has(f * 100 + c)) continue;
      const k = grid[f][c].k;
      if (k < 0) continue;
      let n = 0;
      const pila = [[f, c]];
      visto.add(f * 100 + c);
      while (pila.length) {
        const [a, b] = pila.pop();
        n++;
        for (const [na, nb] of vecinos(a, b)) {
          if (!visto.has(na * 100 + nb) && grid[na][nb].k === k) {
            visto.add(na * 100 + nb);
            pila.push([na, nb]);
          }
        }
      }
      if (n >= MIN_CADENA) return true;
    }
  return false;
}

// Revuelve los colores que ya hay hasta que haya jugada (las negras y los ositos con poder se quedan donde están, con su color)
function barajar() {
  const ks = [];
  grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) ks.push(g.k); }));
  let intentos = 0;
  do {
    for (let i = ks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ks[i], ks[j]] = [ks[j], ks[i]];
    }
    let i = 0;
    grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) g.k = ks[i++]; }));
    intentos++;
  } while (!hayJugada() && intentos < 40);
  if (!hayJugada()) grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0 && !g.p) g.k = azar(); }));
}

function caer() {
  for (let c = 0; c < COLUMNAS; c++) {
    let w = FILAS - 1;
    for (let f = FILAS - 1; f >= 0; f--) {
      if (grid[f][c]) {
        if (f !== w) { grid[w][c] = grid[f][c]; grid[f][c] = null; }
        w--;
      }
    }
    for (let f = w; f >= 0; f--) grid[f][c] = nueva(-(w - f + 1));
  }
  revisar = true;
}

function cayendo() {
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) if (grid[f][c].y < f - 0.001) return true;
  return false;
}

// ---------- Niveles: cuántas negras y movimientos se calculan en logica-gominolas.js ----------

// Convierte en negras «cant» gominolas de las filas de abajo. Con filasCompletas > 0, esa cantidad de filas de la zona quedan TODAS negras
// (nunca dos pegadas) y las que sobran van al azar en el resto de la zona. El total siempre es «cant». (Misma regla que logica-gominolas.js)
function colocarNegras(cant, filasCompletas = 0, capas = null) {
  const desde = Math.max(0, FILAS - zonaIni);
  const mezclar = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const filasNegras = [];
  const k = Math.min(filasCompletas, Math.floor(cant / COLUMNAS));
  if (k > 0) {
    const cand = [];
    for (let f = FILAS - 1; f >= desde; f--) cand.push(f);
    for (const f of mezclar(cand)) {
      if (filasNegras.length >= k) break;
      if (filasNegras.every((x) => Math.abs(x - f) > 1)) filasNegras.push(f);
    }
    for (const f of filasNegras) for (let c = 0; c < COLUMNAS; c++) grid[f][c].k = NEGRA;
  }
  const celdas = [];
  for (let f = FILAS - 1; f >= desde; f--) if (!filasNegras.includes(f)) for (let c = 0; c < COLUMNAS; c++) celdas.push([f, c]);
  mezclar(celdas).slice(0, cant - filasNegras.length * COLUMNAS).forEach(([f, c]) => { grid[f][c].k = NEGRA; });
  // Capas (niveles de tipo «capas»): una parte de las negras lleva 2 capas (1 candado) y otra 3 capas (2 candados). Misma regla que logica-gominolas.js
  if (capas) {
    const negras = [];
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLUMNAS; c++) if (grid[f][c].k === NEGRA) negras.push(grid[f][c]);
    mezclar(negras);
    const n3 = Math.round(negras.length * capas.tres), n2 = Math.round(negras.length * capas.dos);
    negras.slice(0, n3).forEach((g) => { g.c = 3; });
    negras.slice(n3, n3 + n2).forEach((g) => { g.c = 2; });
  }
  let intentos = 0;
  while (!hayJugada() && intentos++ < 50) barajar();
}

function contarNegras() {
  let n = 0;
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) if (grid[f][c] && grid[f][c].k === NEGRA) n++;
  return n;
}

// Aparece una negra nueva en la zona de abajo (cuando el movimiento no eliminó ninguna)
function nuevaNegra() {
  const candidatas = [];
  const juntar = (desde, hasta) => {
    for (let f = desde; f >= hasta; f--)
      for (let c = 0; c < COLUMNAS; c++) if (grid[f][c].k >= 0 && !grid[f][c].p) candidatas.push([f, c]);
  };
  juntar(FILAS - 1, Math.max(0, FILAS - zonaNva));
  if (!candidatas.length) juntar(FILAS - zonaNva - 1, 0); // zona llena de negras: sube más
  if (!candidatas.length) return;
  const [f, c] = candidatas[Math.floor(Math.random() * candidatas.length)];
  const g = grid[f][c];
  g.k = NEGRA;
  delete g.c; // las negras nuevas no llevan capas
  textos.push({ x: (c + 0.5) * tam, y: (g.y + 0.5) * tam, vida: 0.9, txt: "+⚫" });
  tono(110, 0.25);
}

// ---------- Jugada ----------
// Rompe las celdas de la lista y también las negras que quedan pegadas (arriba, abajo, izquierda o derecha) a alguna gominola rota.
// Devuelve cuántas normales y cuántas negras se quitaron, y cuántas capas (candados) se rompieron.
function romper(lista) {
  const quitar = new Set();
  lista.forEach(([f, c]) => { if (grid[f][c]) quitar.add(f * 100 + c); });
  const negrasPegadas = new Set();
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    if (grid[f][c].k === NEGRA) return;
    for (const [nf, nc] of vecinosCruz(f, c)) {
      const q = grid[nf][nc];
      if (q && q.k === NEGRA) negrasPegadas.add(nf * 100 + nc);
    }
  });
  negrasPegadas.forEach((key) => quitar.add(key));

  let normales = 0, negras = 0, golpes = 0;
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    const g = grid[f][c];
    const x = (c + 0.5) * tam, y = (g.y + 0.5) * tam;
    // Negra con capas: pierde UNA capa (un candado) por jugada y se queda en su lugar (aunque la toquen varias gominolas rotas)
    if (g.k === NEGRA && g.c > 1) {
      g.c--; golpes++;
      puntos += PUNTOS_CAPA;
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 80;
        particulas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, vida: 0.4 + Math.random() * 0.2, k: NEGRA });
      }
      textos.push({ x, y, vida: 0.9, txt: g.c > 1 ? "🔓" : "⛓️💥" });
      return;
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      particulas.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, vida: 0.5 + Math.random() * 0.3, k: g.k });
    }
    if (g.k === NEGRA) {
      negras++;
      puntos += PUNTOS_NEGRA;
      textos.push({ x, y, vida: 0.9, txt: "+" + PUNTOS_NEGRA });
    } else normales++;
    grid[f][c] = null;
  });
  return { normales, negras, golpes };
}

// Cierra la jugada: gasta un movimiento, hace caer, revisa si ganaste/perdiste y pone la negra extra si hace falta
function cerrarJugada(negrasQuitadas) {
  movs--;
  caer();
  if (contarNegras() === 0) { actualizarHud(); ganar(); return; }
  if (!negrasQuitadas) for (let i = 0; i < penaliza; i++) nuevaNegra(); // jugada sin negras: salen 1, 2 o 3 nuevas según la dificultad
  actualizarHud();
  if (movs <= 0) perder();
}

// Celdas que rompen los poderes de la cadena: la fila y/o la columna de la última casilla seleccionada.
// Hay que llamarla antes de romper (lee los poderes que todavía están en el tablero).
function lineasDePoderes(cad, ult) {
  const lista = [];
  const tipos = new Set(cad.map(({ f, c }) => grid[f][c].p).filter(Boolean));
  if (tipos.has("horizontal")) for (let c = 0; c < COLUMNAS; c++) lista.push([ult.f, c]);
  if (tipos.has("vertical")) for (let f = 0; f < FILAS; f++) lista.push([f, ult.c]);
  if (tipos.has("color")) { // todas las gominolas del color de la cadena
    const kc = grid[ult.f][ult.c].k;
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLUMNAS; c++) if (grid[f][c] && grid[f][c].k === kc) lista.push([f, c]);
  }
  return lista;
}

// Boost de la tienda: pone un poder en una gominola de color sin poder. Devuelve true si lo puso (si no, no se cobra)
function colocarPoder(f, c, poder = "color") {
  const g = grid[f] && grid[f][c];
  if (!g || g.k < 0 || g.p || !PODERES[poder]) return false;
  g.p = poder;
  return true;
}

function juntar(cad) {
  const n = cad.length;
  const ganancia = Math.round(n * PUNTOS_BASE + (n - MIN_CADENA) * (n - MIN_CADENA) * (PUNTOS_BASE / 2));
  puntos += ganancia;
  const ult = cad[cad.length - 1];
  const colorCadena = grid[ult.f][ult.c].k; // antes de romper: el poder nuevo conserva este color
  const lineas = lineasDePoderes(cad, ult);
  const r = romper(cad.map(({ f, c }) => [f, c]).concat(lineas));
  const extra = Math.max(0, r.normales - n) * PUNTOS_BASE; // gominolas que rompieron las líneas de los poderes
  puntos += extra;
  textos.push({ x: (ult.c + 0.5) * tam, y: (ult.f + 0.5) * tam, vida: 0.9, txt: "+" + (ganancia + extra) });
  // cadena larga: deja un osito con poder (del mismo color) en la última casilla
  const poder = n >= CADENA_VERTICAL ? "vertical" : n >= CADENA_HORIZONTAL ? "horizontal" : null;
  if (poder) {
    grid[ult.f][ult.c] = { k: colorCadena, p: poder, y: ult.f, v: 0 };
    textos.push({ x: tam * COLUMNAS / 2, y: tam * 0.8, vida: 1.1, txt: PODERES[poder].icono + " " + poder });
  }
  for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => tono(NOTAS[Math.min(i + 3, NOTAS.length - 1)], 0.15), i * 55);
  cerrarJugada(r.negras + r.golpes); // una capa rota también cuenta como avance: no sale negra nueva
}

// ---------- Entrada ----------
function celdaEn(ev) {
  const r = lienzo.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const t = r.width / COLUMNAS;
  const c = Math.floor(x / t), f = Math.floor(y / t);
  if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) return null;
  // d = distancia al centro de la casilla, en casillas (0 = centro, 0.5 = borde, 0.7 = esquina)
  const d = Math.hypot(x - (c + 0.5) * t, y - (f + 0.5) * t) / t;
  return { f, c, d };
}

// Tolerancia del arrastre, en casillas medidas desde el centro de la gominola
const RADIO_AGREGAR = 0.64;    // seleccionar: generosa (antes 0.42). En casillas chicas (12×14 en celular) cubre casi toda la casilla
const RADIO_RETROCEDER = 0.3;  // des-seleccionar: más precisa. Es el MÍNIMO en casillas; en tableros grandes sube (ver radioRetroceder)
const PX_RETROCEDER = 11;      // pero nunca menos de ~11 px de radio: un dedo tiembla unos 8-10 px y con casillas de 25-30 px, 0.3 casillas (≈8 px) casi no se logra
const TOPE_RETROCEDER = 0.4;   // y sin pasar de 0.4, para que quede margen entre «agregar» y «retroceder» y no parpadee en el borde
const radioRetroceder = () => Math.min(TOPE_RETROCEDER, Math.max(RADIO_RETROCEDER, PX_RETROCEDER / tam)); // tam = px por casilla

lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando" || cayendo()) return;
  const p = celdaEn(ev);
  if (!p) return;
  if (grid[p.f][p.c].k === NEGRA) return; // las negras no se pueden arrastrar
  try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
  cadena = [{ f: p.f, c: p.c }];
  puntoPrevio = { clientX: ev.clientX, clientY: ev.clientY };
  tono(NOTAS[0], 0.08);
});

// Color de la cadena (el de su primera gominola)
function colorDeCadena() {
  for (const q of cadena) {
    const k = grid[q.f][q.c].k;
    if (k >= 0) return k;
  }
  return null;
}

// Procesa UN punto del arrastre (casilla + distancia al centro): agrega, retrocede o ignora
function procesarPunto(p) {
  if (!cadena || !p) return;
  const ult = cadena[cadena.length - 1];
  if (p.f === ult.f && p.c === ult.c) return;
  // volver atrás quita la última: aquí SÍ hay que acercarse al centro de la casilla anterior (precisión alta)
  if (cadena.length > 1) {
    const ant = cadena[cadena.length - 2];
    if (ant.f === p.f && ant.c === p.c) { if (p.d < radioRetroceder()) cadena.pop(); return; }
  }
  // agregar una gominola: basta con pasar cerca (casi toda la casilla cuenta; solo se excluyen las esquinas,
  // para no pillar por accidente una casilla en diagonal al cruzar por el borde)
  if (p.d >= RADIO_AGREGAR) return;
  if (Math.max(Math.abs(p.f - ult.f), Math.abs(p.c - ult.c)) !== 1) return;
  if (cadena.some((q) => q.f === p.f && q.c === p.c)) return;
  const kp = grid[p.f][p.c].k;
  if (kp === NEGRA) return;
  const kc = colorDeCadena();
  if (kp !== kc) return; // solo se unen ositos del mismo color (los que tienen poder también)
  cadena.push({ f: p.f, c: p.c });
  tono(NOTAS[Math.min(cadena.length - 1, NOTAS.length - 1)], 0.08);
}

// El navegador entrega pocos «pointermove» si el dedo va rápido: con casillas de 25-30 px el dedo se salta casillas.
// Por eso se revisa el camino recto entre el punto anterior y el nuevo, cada ~1/3 de casilla, en orden.
let puntoPrevio = null;
lienzo.addEventListener("pointermove", (ev) => {
  if (!cadena) return;
  const a = puntoPrevio || ev;
  const dx = ev.clientX - a.clientX, dy = ev.clientY - a.clientY;
  const pasos = Math.min(40, Math.max(1, Math.ceil(Math.hypot(dx, dy) / (tam / 3))));
  for (let i = 1; i <= pasos && cadena; i++) {
    procesarPunto(celdaEn({ clientX: a.clientX + (dx * i) / pasos, clientY: a.clientY + (dy * i) / pasos }));
  }
  puntoPrevio = { clientX: ev.clientX, clientY: ev.clientY };
});

function soltar() {
  if (cadena && estado === "jugando") {
    if (cadena.length >= MIN_CADENA) juntar(cadena); // tocar un osito con poder solo no hace nada
  }
  cadena = null; puntoPrevio = null;
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", () => { cadena = null; puntoPrevio = null; });

// ---------- Partida ----------
function actualizarHud() {
  elPts.textContent = puntos;
  elMovs.textContent = Math.max(0, movs);
  elNegras.textContent = contarNegras();
  elNivel.textContent = modo === "libre" ? libre.ronda : actual;
  rotNivel.textContent = modo === "libre" ? "Ronda" : "Nivel";
  elBarra.style.width = Math.max(0, (movs / movsIni) * 100) + "%";
  elBarra.classList.toggle("poco", movs <= 3);
}

// Empieza el nivel n (el que se elige en el mapa o el siguiente tras ganar)
function jugar(n) {
  actual = Math.max(1, Math.min(TOTAL_NIVELES, Math.floor(Number(n)) || 1));
  modo = "campana";
  opcionesPausa.textoSalir = "Salir al mapa";
  pantMenu.hidden = true; pantLibre.hidden = true; escena.hidden = false;
  empezar();
}

function empezar() {
  partida++;
  puntos = puntosInicioNivel;
  const par = modo === "libre" ? parametrosLibre(libre.t, libre.d, libre.ronda) : parametrosNivel(nivelDe(actual)); // la campaña usa el catálogo: tablero, dificultad y patrón de cada nivel
  configurarTablero(par.cols, par.filas); // el tablero puede cambiar de tamaño entre campaña y modo libre
  zonaIni = par.zona; zonaNva = par.zonaNueva; penaliza = par.penaliza;
  movsIni = par.movs;
  movs = movsIni;
  cadena = null;
  particulas = [];
  textos = [];
  revisar = false;
  llenar();
  colocarNegras(par.negras, par.filasCompletas || 0, par.capas || null); // filasCompletas y capas las da parametrosNivel (patrón y tipo del catálogo)
  if (par.capas) textos.push({ x: tam * COLUMNAS / 2, y: tam * 1.2, vida: 2.2, txt: "⛓️ Negras con candados" });
  estado = "jugando";
  menuBoton();
  ovl.classList.add("oculto");
  actualizarHud();
  tono(NOTAS[4], 0.15);
}

function ganar() {
  estado = "fin";
  cadena = null;
  menuBoton();
  const bono = movs * BONO_MOVIMIENTO;
  puntos += bono;
  rotularOvl();
  if (modo === "libre") { ganarLibre(bono); return; }
  const ganados = puntos - puntosInicioNivel;
  let nuevoRecord = false;
  if (puntos > mejor) {
    mejor = puntos;
    nuevoRecord = true;
  }
  actualizarHud();
  const primera = actual >= nivel; // primera vez que se pasa: solo entonces suma puntos al perfil y desbloquea el siguiente
  // Estrellas y monedas: las monedas se pagan por la PRIMERA vez y por estrellas nuevas (repetir sin mejorar no da nada)
  const est = estrellasDe(movs, movsIni), previas = estrellasDeNivel(estrellas, actual);
  const monedas = recompensa(nivelDe(actual), est, previas);
  if (est > previas) estrellas = ponerEstrellas(estrellas, actual, est);
  if (monedas) { ganarMonedas(cartera, idDisp, monedas); pintarMonedas(); }
  ovlTitulo.textContent = "¡Nivel " + actual + " superado!";
  ovlTexto.textContent = ganados + " puntos" + (bono ? " (bono +" + bono + ")" : "") + (nuevoRecord ? " · ¡nuevo récord!" : "") + " · " + "★".repeat(est) + "☆".repeat(3 - est) + (monedas ? " · +" + monedas + " monedas" : "") + (primera ? "" : " · nivel repetido: no suma al perfil");
  ganoUltimo = true;
  pendiente = Math.min(actual + 1, TOTAL_NIVELES);
  ovlBtn.textContent = actual >= TOTAL_NIVELES ? "Repetir nivel " + actual : "Siguiente nivel";
  if (actual >= TOTAL_NIVELES) pendiente = actual;
  puntosInicioNivel = puntos;
  if (primera) nivel = Math.min(TOTAL_NIVELES + 1, actual + 1);
  guardarProg(); // récord y nivel, en el dispositivo y (con internet y sesión) en la cuenta
  setTimeout(() => ovl.classList.remove("oculto"), 700);
  if (primera) enviarPuntos(ganados);
}

// Rotula «🗺️ Mapa» (campaña) o «⚙️ Cambiar tablero» (modo libre) en la pantalla de resultado
function rotularOvl() {
  ovlMapa.innerHTML = modo === "libre" ? '<span class="b-ico">⚙️</span> Cambiar tablero' : '<span class="b-ico">🗺️</span> Mapa';
}
// Modo libre: sin puntos al perfil; solo el récord de rondas superadas de esta combinación de tablero y dificultad
function ganarLibre(bono) {
  const ganados = puntos - puntosInicioNivel;
  const hechas = libre.ronda, k = claveLibre();
  let nuevoRecord = false;
  if (hechas > (recordsLibre[k] || 0)) { recordsLibre[k] = hechas; nuevoRecord = true; guardarProg(); }
  actualizarHud();
  ovlTitulo.textContent = "¡Ronda " + hechas + " superada!";
  ovlTexto.textContent = ganados + " puntos" + (bono ? " (bono +" + bono + ")" : "") + (nuevoRecord ? " · ¡nuevo récord!" : "") + " · el modo libre no suma al perfil";
  ganoUltimo = false;
  pendiente = hechas + 1;
  ovlBtn.textContent = "Siguiente ronda";
  puntosInicioNivel = puntos;
  setTimeout(() => ovl.classList.remove("oculto"), 700);
}

function perder() {
  estado = "fin";
  cadena = null;
  menuBoton();
  rotularOvl();
  if (modo === "libre") {
    const sup = libre.ronda - 1;
    ovlTitulo.textContent = "¡Sin movimientos!";
    ovlTexto.textContent = "Superaste " + sup + (sup === 1 ? " ronda" : " rondas") + " · quedaron " + contarNegras() + " negras · récord: " + (recordsLibre[claveLibre()] || 0);
    ganoUltimo = false;
    pendiente = 1;
    ovlBtn.textContent = "Jugar otra vez";
    setTimeout(() => ovl.classList.remove("oculto"), 700);
    return;
  }
  ovlTitulo.textContent = "¡Sin movimientos!";
  ovlTexto.textContent = "Quedaron " + contarNegras() + " gominolas negras.";
  ganoUltimo = false;
  pendiente = actual;
  ovlBtn.textContent = "Reintentar nivel " + actual;
  setTimeout(() => ovl.classList.remove("oculto"), 700);
}

// ---------- Sesión y perfil ----------
import("../compartido/jugador.js").then((m) => {
  entrar = m.entrar;
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
}).catch(() => {});
btnEntrar.addEventListener("click", () => entrar().catch((e) => { ovlTexto.textContent = e.message; }));

// Anota los puntos del nivel ganado (convertidos con PUNTOS_POR_PERFIL) en la cola local y los envía si hay sesión e internet
async function enviarPuntos(pts) {
  const sumar = Math.floor(pts / PUNTOS_POR_PERFIL), mia = partida;
  if (!sumar) return;
  encolarPuntos(ID, sumar);
  let faltan = 1;
  try { faltan = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  if (mia === partida) ovlTexto.textContent += faltan === 0 ? " · +" + sumar + " al perfil ✓" : " · +" + sumar + " anotados: se enviarán a tu perfil cuando tengas internet y hayas entrado con Google";
}

ovlBtn.addEventListener("click", () => { if (modo === "libre") jugarLibre(pendiente); else jugar(pendiente); });
// «🗺️ Mapa»: vuelve al mapa; si se terminó un estado o país, el agua sube al llegar
ovlMapa.addEventListener("click", () => { if (modo === "libre") mostrarLibre(); else abrirMapa(ganoUltimo && actual % NIVELES_POR_ETAPA === 0 && actual >= nivel - 1); });

// ---------- Dibujo ----------
function ajustar() {
  const dpr = window.devicePixelRatio || 1;
  const w = lienzo.clientWidth;
  tam = w / COLUMNAS;
  lienzo.style.height = tam * FILAS + "px";
  lienzo.width = Math.round(w * dpr);
  lienzo.height = Math.round(tam * FILAS * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cuerpos.clear();
}
window.addEventListener("resize", ajustar);
// Cambia el tamaño del tablero (columnas × filas): el CSS usa --asp (proporción) y --maxw (ancho máximo) para dimensionarlo
function configurarTablero(c, f) {
  COLUMNAS = c; FILAS = f;
  tableroEl.style.setProperty("--asp", c / f);
  tableroEl.style.setProperty("--maxw", Math.max(480, c * 46) + "px");
  ajustar();
}

// Personaje de gominola, estilo caricatura infantil: cuerpo blandito de color plano, ojos grandes y blancos con pupila,
// mejillas rosadas y sonrisa. Parpadea de vez en cuando; al seleccionarla (opc.sel) se pone feliz con la boca abierta;
// las negras (opc.negra) tienen cara de enojadas. opc.fase desfasa el parpadeo para que no parpadeen todas a la vez.
// Cadenas con candado sobre una negra. n = 1: una cadena en diagonal con su candado; n = 2: dos cadenas cruzadas, cada una con su candado.
function dibujarCadenas(r, n) {
  const cadena = (x1, y1, x2, y2) => {
    const eslabones = 6;
    for (let i = 0; i <= eslabones; i++) {
      const t = i / eslabones, cx = x1 + (x2 - x1) * t, cy = y1 + (y2 - y1) * t;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.atan2(y2 - y1, x2 - x1) + (i % 2 ? Math.PI / 2 : 0));
      ctx.strokeStyle = "#1c1830"; ctx.lineWidth = r * 0.2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#cfd3dc"; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  };
  const candado = (x, y) => {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = "#8b93a0"; ctx.lineWidth = r * 0.11; // arco
    ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.17, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#ffc928"; ctx.strokeStyle = "#a86a00"; ctx.lineWidth = r * 0.06; // cuerpo dorado
    ctx.beginPath(); ctx.rect(-r * 0.24, -r * 0.1, r * 0.48, r * 0.38); ctx.fill(); ctx.stroke(); // rect (roundRect no existe en navegadores viejos)
    ctx.fillStyle = "#6b4400"; // ojo de la cerradura
    ctx.beginPath(); ctx.arc(0, r * 0.07, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  if (n === 1) { cadena(-r * 0.85, r * 0.55, r * 0.85, -r * 0.55); candado(0, r * 0.12); }
  else { cadena(-r * 0.85, r * 0.55, r * 0.85, -r * 0.55); cadena(-r * 0.85, -r * 0.55, r * 0.85, r * 0.55); candado(-r * 0.46, r * 0.3); candado(r * 0.46, r * 0.3); }
}
// ---------- Gominolas de gelatina (como la imagen de referencia) ----------
// Cada color es un animalito distinto: rojo = perrito de orejas caídas · rosa = gatito de orejas puntiagudas · amarillo = gatito redondo ·
// verde = perrito con copete · azul = gatito cuadrado · morado = osito. Las negras son un cubo oscuro con UN ojo grande y el ceño fruncido.
// El CUERPO (color, borde y brillo de gelatina) se dibuja una sola vez en un lienzo aparte y se reutiliza (cuerpos, se vacía en ajustar());
// la CARA se dibuja en vivo porque parpadea y cambia al seleccionar la gominola.
const elipse = (g, x, y, rx, ry, rot = 0) => { g.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const caja = (g, x0, y0, x1, y1, q) => { // rectángulo de esquinas redondas (roundRect no existe en navegadores viejos)
  g.moveTo(x0 + q, y0); g.lineTo(x1 - q, y0); g.quadraticCurveTo(x1, y0, x1, y0 + q); g.lineTo(x1, y1 - q); g.quadraticCurveTo(x1, y1, x1 - q, y1);
  g.lineTo(x0 + q, y1); g.quadraticCurveTo(x0, y1, x0, y1 - q); g.lineTo(x0, y0 + q); g.quadraticCurveTo(x0, y0, x0 + q, y0); g.closePath();
};

// Silueta de cada animalito (unidades de r). Varias formas en un solo trazo: se rellenan como una sola pieza.
function trazoForma(g, k, r) {
  g.beginPath();
  const E = (x, y, rx, ry, rot) => elipse(g, x * r, y * r, rx * r, ry * r, rot || 0);
  const T = (ax, ay, bx, by, cx, cy) => { // triángulo (oreja) siempre en el mismo sentido que las elipses, para que al rellenar no queden huecos en el solape
    if ((bx - ax) * (cy - by) - (by - ay) * (cx - bx) < 0) { [bx, cx] = [cx, bx]; [by, cy] = [cy, by]; }
    g.moveTo(ax * r, ay * r); g.lineTo(bx * r, by * r); g.lineTo(cx * r, cy * r); g.closePath();
  };
  if (k === NEGRA) caja(g, -0.84 * r, -0.78 * r, 0.84 * r, 0.82 * r, 0.4 * r);
  else if (k === 0) { E(0, 0.02, 0.7, 0.74); E(-0.8, 0.12, 0.25, 0.5, 0.2); E(0.8, 0.12, 0.25, 0.5, -0.2); }                       // perrito rojo
  else if (k === 1) { E(0, 0.14, 0.86, 0.68); T(-0.9, 0.0, -0.74, -0.86, -0.12, -0.5); T(0.9, 0.0, 0.74, -0.86, 0.12, -0.5); }   // gatito rosa
  else if (k === 2) { E(0, 0.1, 0.9, 0.72); E(-0.62, -0.58, 0.24, 0.24); E(0.62, -0.58, 0.24, 0.24); }                          // gatito amarillo
  else if (k === 3) { E(0, 0.06, 0.68, 0.7); E(-0.78, 0.16, 0.2, 0.36, 0.15); E(0.78, 0.16, 0.2, 0.36, -0.15); T(-0.14, -0.6, 0.06, -0.96, 0.26, -0.6); } // perrito verde
  else if (k === 4) { caja(g, -0.84 * r, -0.6 * r, 0.84 * r, 0.86 * r, 0.3 * r); T(-0.86, -0.4, -0.74, -0.94, -0.26, -0.62); T(0.86, -0.4, 0.74, -0.94, 0.26, -0.62); } // gatito azul
  else { E(0, 0.08, 0.82, 0.76); E(-0.58, -0.62, 0.26, 0.26); E(0.58, -0.62, 0.26, 0.26); }                                       // osito morado
}

// Cuerpo de gelatina ya pintado (borde oscuro + degradado + borde interior claro + brillos). Se guarda por color y tamaño.
function cuerpoSprite(k, r, col) {
  const dpr = window.devicePixelRatio || 1;
  const clave = k + "|" + Math.round(r * dpr);
  let s = cuerpos.get(clave);
  if (s) return s;
  const lado = Math.ceil(r * 2.6 * dpr);
  const cv = document.createElement("canvas");
  cv.width = cv.height = lado;
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, lado / 2, lado / 2);
  g.lineJoin = "round"; g.lineCap = "round";
  trazoForma(g, k, r);
  g.lineWidth = r * 0.1; g.strokeStyle = col.o; g.stroke();         // el borde se ve solo por fuera (el relleno tapa su mitad interior)
  const gr = g.createLinearGradient(0, -r, 0, r);
  gr.addColorStop(0, col.l); gr.addColorStop(0.5, col.c); gr.addColorStop(1, col.d);
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  const rim = g.createRadialGradient(0, 0, r * 0.45, 0, 0, r * 1.05); // borde interior claro = gelatina translúcida (con degradado, así no marca las uniones de orejas y cabeza)
  rim.addColorStop(0, col.l + "00"); rim.addColorStop(1, col.l + "88");
  g.fillStyle = rim; g.fill();
  g.fillStyle = col.l; g.globalAlpha = 0.35;
  g.beginPath(); g.ellipse(0, r * 0.64, r * 0.5, r * 0.13, 0, 0, Math.PI * 2); g.fill();            // luz que rebota abajo
  g.fillStyle = "#fff"; g.globalAlpha = 0.55;
  g.beginPath(); g.ellipse(-r * 0.34, -r * 0.33, r * 0.27, r * 0.11, -0.5, 0, Math.PI * 2); g.fill(); // brillo grande arriba a la izquierda
  g.globalAlpha = 0.9;
  g.beginPath(); g.ellipse(-r * 0.62, -r * 0.14, r * 0.06, r * 0.045, -0.9, 0, Math.PI * 2); g.fill(); // puntito de brillo
  g.restore();
  s = { cv, lado: lado / dpr };
  cuerpos.set(clave, s);
  return s;
}

// Cara en vivo. feliz = seleccionada (ojos en ^ y boca abierta); parpadea = ojos de puntito cerrados un instante
function cara(k, r, col, feliz, parpadea) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const tinta = col.o;
  ctx.strokeStyle = tinta; ctx.fillStyle = tinta;
  // ojo cerrado (‿ normal, ⌒ feliz)
  const cerrado = (x, y, w) => { ctx.lineWidth = r * 0.075; ctx.beginPath(); if (feliz) ctx.arc(x, y + w * 0.5, w, Math.PI * 1.12, Math.PI * 1.88); else ctx.arc(x, y - w * 0.4, w, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke(); };
  const punto = (x, y) => {
    if (feliz || parpadea) { cerrado(x, y, r * 0.1); return; }
    ctx.fillStyle = tinta; ctx.beginPath(); ctx.arc(x, y, r * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x - r * 0.025, y - r * 0.03, r * 0.03, 0, Math.PI * 2); ctx.fill();
  };
  const hocico = (x, y, rx, ry) => { // óvalo claro con nariz, como el de los perritos de la imagen
    ctx.globalAlpha = 0.6; ctx.fillStyle = col.l; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = tinta; ctx.beginPath(); ctx.ellipse(x, y - ry * 0.35, rx * 0.42, ry * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.ellipse(x - rx * 0.12, y - ry * 0.5, rx * 0.14, ry * 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
  };
  const gatuno = (y) => { // nariz, boca en «w» y bigotes
    ctx.fillStyle = tinta; ctx.beginPath(); ctx.ellipse(0, y, r * 0.065, r * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    if (!feliz) { ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(-r * 0.07, y + r * 0.04, r * 0.07, Math.PI * 0.1, Math.PI * 0.9); ctx.arc(r * 0.07, y + r * 0.04, r * 0.07, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
    ctx.globalAlpha = 0.55; ctx.lineWidth = r * 0.035; ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(s * r * 0.52, y - r * 0.02); ctx.lineTo(s * r * 0.82, y - r * 0.08); ctx.moveTo(s * r * 0.52, y + r * 0.08); ctx.lineTo(s * r * 0.8, y + r * 0.13); }
    ctx.stroke(); ctx.globalAlpha = 1;
  };
  let boca = 0.4;
  if (k === 0) { punto(-r * 0.34, -r * 0.3); punto(r * 0.34, -r * 0.3); hocico(0, r * 0.14, r * 0.3, r * 0.22); boca = 0.5; }
  else if (k === 1) { cerrado(-r * 0.36, r * 0.02, r * 0.13); cerrado(r * 0.36, r * 0.02, r * 0.13); gatuno(r * 0.16); boca = 0.38; }
  else if (k === 2) { cerrado(-r * 0.36, r * 0.04, r * 0.14); cerrado(r * 0.36, r * 0.04, r * 0.14); gatuno(r * 0.18); boca = 0.4; }
  else if (k === 3) { punto(-r * 0.3, -r * 0.22); punto(r * 0.3, -r * 0.22); hocico(0, r * 0.22, r * 0.32, r * 0.22); boca = 0.52; }
  else if (k === 4) { cerrado(-r * 0.4, -r * 0.02, r * 0.14); cerrado(r * 0.4, -r * 0.02, r * 0.14); gatuno(r * 0.16); boca = 0.4; }
  else { punto(-r * 0.32, -r * 0.12); punto(r * 0.32, -r * 0.12); hocico(0, r * 0.3, r * 0.26, r * 0.18); boca = 0.56; }
  if (feliz) { // boca abierta
    ctx.fillStyle = "#7a2748"; ctx.beginPath(); ctx.ellipse(0, r * boca, r * 0.14, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ff8fa8"; ctx.beginPath(); ctx.ellipse(0, r * (boca + 0.05), r * 0.08, r * 0.05, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// Gominola negra: un solo ojo grande y blanco que se mueve un poco, y el ceño fruncido
function caraNegra(r, t, parpadea) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const ey = -r * 0.14;
  if (parpadea) {
    ctx.strokeStyle = "#e9e6f7"; ctx.lineWidth = r * 0.08; ctx.beginPath(); ctx.moveTo(-r * 0.24, ey); ctx.lineTo(r * 0.24, ey); ctx.stroke();
  } else {
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#14122a"; ctx.lineWidth = r * 0.05;
    ctx.beginPath(); ctx.ellipse(0, ey, r * 0.27, r * 0.31, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const mx = Math.sin(t * 0.8) * r * 0.05;
    ctx.fillStyle = "#1b1830"; ctx.beginPath(); ctx.arc(mx, ey + r * 0.03, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(mx - r * 0.05, ey - r * 0.03, r * 0.05, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "#14122a"; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(0, r * 0.7, r * 0.2, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
}

// ----- Efectos de los boosts (detrás de la gominola) -----
const RAYOS_FINOS = 16;     // rayitos delgados que giran como las manecillas del reloj
const RAYOS_GRUESOS = 16;   // «rectangulitos» (4 veces más anchos) que giran al revés y sobresalen un poco de la gominola
function efectosPoder(r, t) {
  const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.18);
  halo.addColorStop(0, "rgba(255,255,255,.9)"); halo.addColorStop(0.7, "rgba(255,255,255,.35)"); halo.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.fill();
  // delgados: sentido de las manecillas (en el canvas, girar con ángulo positivo es hacia la derecha)
  ctx.save(); ctx.rotate(t * 0.7);
  ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = r * 0.035; ctx.beginPath();
  for (let i = 0; i < RAYOS_FINOS; i++) {
    const a = (i * Math.PI * 2) / RAYOS_FINOS, largo = i % 2 ? 1.08 : 1.17;
    ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); ctx.lineTo(Math.cos(a) * r * largo, Math.sin(a) * r * largo);
  }
  ctx.stroke(); ctx.restore();
  // gruesos: contra las manecillas, entre los delgados; nunca pasan de la casilla (el borde está a ≈1.19 r)
  ctx.save(); ctx.rotate(-t * 0.9);
  ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = r * 0.14; ctx.lineCap = "butt"; ctx.beginPath();
  for (let i = 0; i < RAYOS_GRUESOS; i++) {
    const a = ((i + 0.5) * Math.PI * 2) / RAYOS_GRUESOS;
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.lineTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
  }
  ctx.stroke(); ctx.restore();
}
// Picos de línea: el boost vertical los lleva arriba y abajo, el horizontal a los lados. Salen y vuelven al centro (brillo que sube y baja).
// Se dibujan en una segunda pasada, ENCIMA de las gominolas vecinas, como en la imagen de referencia.
function puntasPoder(x, y, r, poder, t) {
  const ciclo = 0.5 + 0.5 * Math.sin(t * 3.4 - Math.PI / 2); // 0 → 1 → 0
  const base = r * 0.7, L = r * (0.25 + 0.9 * ciclo), w = r * (0.14 + 0.16 * ciclo);
  const punta = (largo, ancho, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(base, 0); ctx.lineTo(base + largo * 0.5, -ancho); ctx.lineTo(base + largo, 0); ctx.lineTo(base + largo * 0.5, ancho); ctx.closePath(); ctx.fill(); };
  ctx.save(); ctx.translate(x, y); ctx.lineJoin = "round";
  for (const a of poder === "vertical" ? [-Math.PI / 2, Math.PI / 2] : [0, Math.PI]) {
    ctx.save(); ctx.rotate(a);
    punta(L * 1.08, w * 1.9, "rgba(60,225,110," + (0.3 + 0.3 * ciclo).toFixed(2) + ")"); // estela verde exterior
    punta(L, w * 1.15, "rgba(80,235,120,.92)");                                              // verde
    punta(L * 0.92, w * 0.5, "#fff");                                                        // centro blanco
    ctx.restore();
  }
  ctx.restore();
}
// Boost de color: estrellita en una medallita (los de línea ya se reconocen por sus picos)
function medallaEstrella(r, col) {
  const bx = r * 0.64, by = r * 0.64, br = r * 0.3;
  ctx.fillStyle = "#fff"; ctx.strokeStyle = col.o; ctx.lineWidth = r * 0.07;
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(bx, by);
  ctx.fillStyle = col.o; ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? br * 0.42 : br * 0.82, an = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// opc: { negra, sel, fase, capas, poder, k } · fase desfasa parpadeo y giros para que no vayan todas iguales
function oso(x, y, r, col, esc, opc = {}) {
  const negra = !!opc.negra, feliz = !!opc.sel, fase = opc.fase || 0;
  const k = negra ? NEGRA : (opc.k ?? PALETA.indexOf(col));
  const t = performance.now() / 1000 + fase;
  const parpadea = !feliz && t % 3.6 < 0.14;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(esc, esc);
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  if (opc.poder) efectosPoder(r, t);
  const s = cuerpoSprite(k, r, col);
  ctx.drawImage(s.cv, -s.lado / 2, -s.lado / 2, s.lado, s.lado);
  if (negra) caraNegra(r, t, parpadea); else cara(k, r, col, feliz, parpadea);
  if (negra && opc.capas > 1) dibujarCadenas(r, opc.capas - 1); // una cadena con candado por cada capa que falta romper
  if (opc.poder === "color") medallaEstrella(r, col);
  ctx.restore();
}

function dibujar() {
  ctx.clearRect(0, 0, tam * COLUMNAS, tam * FILAS);
  // cuadrícula suave
  ctx.fillStyle = "rgba(255,255,255,.25)";
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++)
      if ((f + c) % 2) ctx.fillRect(c * tam, f * tam, tam, tam);

  const enCadena = new Set((cadena || []).map((q) => q.f * 100 + q.c));
  const lineales = []; // boosts de línea: sus picos se dibujan al final, encima de las vecinas
  // línea que une la cadena
  if (cadena && cadena.length > 1) {
    const kc = colorDeCadena();
    const col = kc === null ? NEGRA_COL : PALETA[kc];
    ctx.strokeStyle = col.c; ctx.globalAlpha = 0.75;
    ctx.lineWidth = tam * 0.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    cadena.forEach((q, i) => {
      const x = (q.c + 0.5) * tam, y = (q.f + 0.5) * tam;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      const g = grid[f] && grid[f][c];
      if (!g) continue;
      const sel = enCadena.has(f * 100 + c);
      const x = (c + 0.5) * tam, y = (g.y + 0.5) * tam;
      const fase = f * 1.7 + c * 2.9; // desfasa el parpadeo de cada casilla
      if (sel) { // halo blanco detrás de la gominola elegida (se ve bien sobre el morado claro)
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.strokeStyle = "#7a4fd0"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, tam * 0.46, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (g.k === NEGRA) oso(x, y, tam * 0.42, NEGRA_COL, 1, { negra: true, fase, capas: g.c });
      else {
        oso(x, y, tam * 0.42, PALETA[g.k], sel ? 1.14 : 1, { sel, fase, poder: g.p, k: g.k });
        if (g.p === "vertical" || g.p === "horizontal") lineales.push({ x, y, p: g.p, fase });
      }
    }
  for (const q of lineales) puntasPoder(q.x, q.y, tam * 0.42, q.p, performance.now() / 1000 + q.fase);
  // contador de la cadena sobre la última gominola
  if (cadena && cadena.length > 0 && (cadena.length > 1 || grid[cadena[0].f][cadena[0].c].k >= 0)) {
    const u = cadena[cadena.length - 1];
    const x = (u.c + 0.5) * tam, y = (u.f + 0.5) * tam - tam * 0.5;
    const ok = cadena.length >= MIN_CADENA;
    ctx.fillStyle = ok ? "#fff" : "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(x, y, tam * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#3b2a73"; ctx.font = "bold " + tam * 0.26 + "px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(cadena.length, x, y + 1);
  }
  // partículas
  for (const p of particulas) {
    ctx.globalAlpha = Math.max(0, p.vida * 1.8);
    ctx.fillStyle = colorK(p.k).c;
    ctx.beginPath(); ctx.arc(p.x, p.y, tam * 0.07, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // textos flotantes
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold " + tam * 0.36 + "px system-ui, sans-serif";
  for (const t of textos) {
    ctx.globalAlpha = Math.min(1, t.vida * 2);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#3b2a73"; ctx.lineWidth = 4;
    ctx.strokeText(t.txt, t.x, t.y); ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// ---------- Bucle ----------
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0);
  ultimo = ahora;

  // caída
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++) {
      const g = grid[f] && grid[f][c];
      if (g && g.y < f) {
        g.v += GRAVEDAD * dt;
        g.y += g.v * dt;
        if (g.y >= f) { g.y = f; g.v = 0; }
      }
    }
  if (revisar && !cayendo()) {
    revisar = false;
    if (!hayJugada()) {
      barajar();
      textos.push({ x: tam * COLUMNAS / 2, y: tam * FILAS / 2, vida: 1.2, txt: "¡Revuelto!" });
    }
  }
  // partículas y textos
  particulas.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.vida -= dt; });
  particulas = particulas.filter((p) => p.vida > 0);
  textos.forEach((t) => { t.y -= 30 * dt; t.vida -= dt; });
  textos = textos.filter((t) => t.vida > 0);

  dibujar();
}

// Arranque: tablero de fondo y pantalla de inicio
configurarTablero(6, 8);
llenar();
colocarNegras(10);
mostrarMenu();  // el juego empieza en el menú principal: Continuar · Modo libre · Niveles
actualizarHud();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });

// Sincronizar con la cuenta: del récord y del nivel se queda el mayor; las estrellas y la cartera tienen su propia regla
import("../compartido/progreso.js").then((p) => {
  nube = p.conectar(ID, {
    clave: CLAVE_PROG,
    fusionar: unirProgresoGominolas, // números: el mayor · estrellas: la mayor de cada nivel · cartera: contadores por dispositivo
    alCambiar: (v) => {
      mejor = Math.max(mejor, Number(v.mejor) || 0);
      // «nivel» es solo el progreso (el nivel en juego es «actual»), así que se puede actualizar en cualquier momento
      nivel = Math.max(nivel, Number(v.nivel) || 1);
      tomarRecords(v);
      estrellas = unirEstrellas(estrellas, v.est);
      cartera = unirCarteras(cartera, v.cartera);
      pintarMonedas();
      if (mapa.abierto()) mapa.refrescar();
      if (!pantMenu.hidden) document.getElementById("menuNivel").textContent = Math.min(nivel, TOTAL_NIVELES);
      if (!pantLibre.hidden) pintarLibre();
      actualizarHud();
    },
  });
}).catch(() => {});
