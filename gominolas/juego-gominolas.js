// Ruta: gominolas/juego-gominolas.js
// «Conecta gominolas»: arrastra por gominolas iguales y juntas (3 o más) para juntarlas.
// Niveles con límite de movimientos: hay que eliminar todas las gominolas negras de la parte baja.
// Una negra se elimina cuando se rompe una gominola pegada a ella (también en diagonal).
// Si un movimiento no elimina ninguna negra, aparece una nueva abajo.
// Perfil y sesión: se cargan aparte para que el juego funcione aunque Firebase no esté disponible
import { encolarPuntos } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
import { crearMenuPausa } from "../compartido/menu-pausa.js"; // menú de pausa estándar (☰)
import { montarMapa } from "../compartido/mapa-niveles.js";   // menú principal ESTÁNDAR: México con agua, mundo y listas de niveles
import { crearEtapas } from "../compartido/etapas-mapa.js";   // 32 estados + 194 países
let nube = null; // se llena al cargar compartido/progreso.js (abajo del todo)
let entrar = async () => { throw new Error("Sesión no disponible sin conexión"); };

const ID = "gominolas"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
const COLUMNAS = 6;
const FILAS = 8;
const COLORES = 5;          // de 3 a 6
const MIN_CADENA = 3;       // mínimo de gominolas para juntar
const PUNTOS_BASE = 10;     // por gominola; las cadenas largas dan bono
const GRAVEDAD = 70;        // filas/s² con que caen
const PUNTOS_POR_PERFIL = 25; // al perfil se envía 1 punto por cada 25 del juego (así pesa parecido a los demás juegos)
const CLAVE_MEJOR = "gominolas_mejor";
const CLAVE_NIVEL = "gominolas_nivel";
const CLAVE_PROG = "gominolas_progreso"; // { mejor, nivel } juntos, para sincronizarlos con la cuenta (antes: las dos claves de arriba)

// Gominolas negras
const NEGRAS_MIN = 10;      // negras por nivel: entre NEGRAS_MIN y NEGRAS_MAX
const NEGRAS_MAX = 18;
const NEGRAS_CADA = 2;      // cada cuántos niveles sube en 1 la cantidad base de negras (luego se le suma -1, 0 o +1 al azar)
const ZONA_INICIAL = 5;     // filas de abajo donde nacen las negras al empezar el nivel
const ZONA_NUEVA = 3;       // filas de abajo donde aparece la negra extra cuando no eliminas ninguna
const PUNTOS_NEGRA = 30;    // puntos por cada negra eliminada

// Niveles con valores fijos (las negras siempre nacen repartidas al azar en la zona baja).
// Del nivel siguiente al último de esta lista en adelante se generan con la fórmula de abajo.
const NIVELES = [
  { negras: 12, movs: 25 }, // nivel 1
  { negras: 14, movs: 22 }, // nivel 2
  { negras: 16, movs: 20 }, // nivel 3
  { negras: 19, movs: 19 }, // nivel 4
];

// Movimientos por nivel: negras × factor + extra (el factor baja con cada nivel, así se va poniendo más difícil)
const MOVS_FACTOR = 1.2;
const MOVS_BAJA = 0.03;
const MOVS_FACTOR_MIN = 0.7;
const MOVS_EXTRA = 3;
const BONO_MOVIMIENTO = 20; // puntos por cada movimiento que te sobre al ganar

// Poderes: cadenas largas dejan un bloque especial en la última gominola.
// Se usan tocándolos solos, o metiéndolos en una cadena (se activan en la última casilla seleccionada).
// Si la cadena lleva los dos poderes (o dos poderes se juntan solos), se aplican ambos: fila + columna.
const CADENA_HORIZONTAL = 5; // 5 o 6 gominolas → poder horizontal (rompe toda la fila)
const CADENA_VERTICAL = 7;   // 7 o más → poder vertical (rompe toda la columna)
const PODERES = {
  horizontal: { icono: "↔️", c1: "#ffe14d", c2: "#ff9d00" },
  vertical: { icono: "↕️", c1: "#c9f2ff", c2: "#2aa8ff" },
};

const NEGRA = -1;           // valor de «k» de una gominola negra
const ESPECIAL = -2;        // valor de «k» de un bloque con poder (horizontal o vertical)
const NEGRA_COL = { c: "#3a3a4a", o: "#0e0e16" };
const ESPECIAL_COL = { c: "#ffe14d", o: "#b79a00" };

const PALETA = [
  { c: "#ff5d73", o: "#b8213d" }, // fresa
  { c: "#ffa534", o: "#c26a00" }, // naranja
  { c: "#ffe14d", o: "#b79a00" }, // limón
  { c: "#4fd16b", o: "#1f8a39" }, // manzana
  { c: "#4aa8ff", o: "#1b62b8" }, // arándano
  { c: "#c07cff", o: "#7a32c4" }, // uva
];
const NOTAS = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880];

const colorK = (k) => (k >= 0 ? PALETA[k] : k === NEGRA ? NEGRA_COL : ESPECIAL_COL);

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

// ---------- Estado ----------
let grid = [];          // grid[fila][col] = { k: color (o NEGRA / ESPECIAL), y: fila visual, v: velocidad, p: poder }
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

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}
try { nivel = parseInt(localStorage.getItem(CLAVE_NIVEL), 10) || 1; } catch (e) {}
try { const p = JSON.parse(localStorage.getItem(CLAVE_PROG)); if (p) { mejor = Math.max(mejor, Number(p.mejor) || 0); nivel = Math.max(nivel, Number(p.nivel) || 1); } } catch (e) {}
function guardarProg() {
  try { localStorage.setItem(CLAVE_PROG, JSON.stringify({ mejor, nivel })); } catch (e) {}
  if (nube) nube.guardado();
}
if (mejor || nivel > 1) guardarProg(); // pasa lo de las claves de antes a la nueva

// ---------- Mapa de niveles (menú principal), botón «☰» y menú de pausa ----------
// 100 niveles por estado de México (32) y por país (194): 22 600 en total. Los niveles se abren en orden.
// El mapa lo dibuja compartido/mapa-niveles.js; aquí solo se le dice el progreso y qué pasa al elegir un nivel.
const NIVELES_POR_ETAPA = 100;
const ETAPAS = crearEtapas({ porEtapa: NIVELES_POR_ETAPA });
const TOTAL_NIVELES = ETAPAS.total;
const btnMenu = document.getElementById("btn-menu");

// «☰» (estándar): en el mapa principal NO se muestra; en el resto del mapa y en las pantallas de resultado dice «Menú principal»;
// dentro de una partida dice «Pausa» y abre el menú de pausa.
function menuBoton() {
  const enMapa = mapa.abierto();
  btnMenu.hidden = enMapa && mapa.esPrincipal();
  const enPartida = !enMapa && estado === "jugando";
  document.getElementById("txt-menu").textContent = enPartida ? "Pausa" : "Menú principal";
  btnMenu.title = enPartida ? "Pausa" : "Volver al mapa principal";
}
// Ventana «Info» del mapa (usa los estilos .pausa-* de compartido/inmersivo.css)
function abrirInfo() {
  const fondo = document.createElement("div");
  fondo.className = "pausa-fondo"; fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true");
  const panel = document.createElement("div"); panel.className = "pausa-panel";
  const t = document.createElement("h2"); t.textContent = "ℹ️ Cómo se juega";
  const txt = document.createElement("p"); txt.style.cssText = "margin:0 0 12px;line-height:1.45;font-size:.92rem";
  txt.textContent = "Arrastra por 3 o más gominolas iguales y juntas. Rompe las que rodean a las negras para eliminarlas: si en una jugada no eliminas ninguna, aparece otra. Cadenas de 5 crean un poder ↔️ (rompe una fila) y de 7 un poder ↕️ (rompe una columna): tócalos o inclúyelos en una cadena y se activan en la última casilla. Dos poderes juntos se aplican a la vez." + " Los niveles se desbloquean en orden: cada estado y cada país tiene 100. Al terminar un estado se desbloquea el siguiente y el agua del mapa sube.";
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
  alInfo: abrirInfo,
  alCambiarVista: () => menuBoton(),
});
function abrirMapa(aguaSube) {
  estado = "inicio"; cadena = null;
  ovl.classList.add("oculto");
  mapa.abrir(Math.min(nivel, TOTAL_NIVELES), !!aguaSube);
  menuBoton();
}
crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => estado === "jugando" && !mapa.abierto(),
  alAbrir: () => { cadena = null; },
  extras: () => [{ icono: "🔄", texto: "Reiniciar nivel", clase: "b-azul", ayuda: "Vuelves a empezar este nivel con tus puntos de antes.", alElegir: () => empezar() }],
  textoSalir: "Salir al mapa",
  alSalir: () => abrirMapa(false),
  ayudaSalir: "Se pierde lo avanzado en este nivel.",
});
btnMenu.addEventListener("click", () => { if (mapa.abierto()) mapa.principal(); else if (estado === "fin") { ovl.classList.add("oculto"); mapa.abrir(); menuBoton(); } });

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

// ¿Existe algún grupo de MIN_CADENA o más gominolas iguales y juntas? (las negras y los poderes no cuentan)
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

// Revuelve los colores que ya hay hasta que haya jugada (las negras y los poderes se quedan donde están)
function barajar() {
  const ks = [];
  grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0) ks.push(g.k); }));
  let intentos = 0;
  do {
    for (let i = ks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ks[i], ks[j]] = [ks[j], ks[i]];
    }
    let i = 0;
    grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0) g.k = ks[i++]; }));
    intentos++;
  } while (!hayJugada() && intentos < 40);
  if (!hayJugada()) grid.forEach((fila) => fila.forEach((g) => { if (g.k >= 0) g.k = azar(); }));
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

// ---------- Niveles (se generan al azar) ----------
function negrasDelNivel(n) {
  const base = NEGRAS_MIN + Math.floor((n - 1) / NEGRAS_CADA);
  const variacion = Math.floor(Math.random() * 3) - 1; // -1, 0 o +1
  return Math.max(NEGRAS_MIN, Math.min(NEGRAS_MAX, base + variacion));
}

function movimientosDelNivel(negras, n) {
  const factor = Math.max(MOVS_FACTOR_MIN, MOVS_FACTOR - (n - 1) * MOVS_BAJA);
  return Math.round(negras * factor) + MOVS_EXTRA;
}

// Convierte en negras «cant» gominolas al azar de las filas de abajo
function colocarNegras(cant) {
  const celdas = [];
  for (let f = FILAS - 1; f >= Math.max(0, FILAS - ZONA_INICIAL); f--)
    for (let c = 0; c < COLUMNAS; c++) celdas.push([f, c]);
  for (let i = celdas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [celdas[i], celdas[j]] = [celdas[j], celdas[i]];
  }
  celdas.slice(0, cant).forEach(([f, c]) => { grid[f][c].k = NEGRA; });
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
      for (let c = 0; c < COLUMNAS; c++) if (grid[f][c].k >= 0) candidatas.push([f, c]);
  };
  juntar(FILAS - 1, Math.max(0, FILAS - ZONA_NUEVA));
  if (!candidatas.length) juntar(FILAS - ZONA_NUEVA - 1, 0); // zona llena de negras: sube más
  if (!candidatas.length) return;
  const [f, c] = candidatas[Math.floor(Math.random() * candidatas.length)];
  const g = grid[f][c];
  g.k = NEGRA;
  textos.push({ x: (c + 0.5) * tam, y: (g.y + 0.5) * tam, vida: 0.9, txt: "+⚫" });
  tono(110, 0.25);
}

// ---------- Jugada ----------
// Rompe las celdas de la lista y también las negras que quedan pegadas a alguna gominola rota.
// Devuelve cuántas normales y cuántas negras se quitaron.
function romper(lista) {
  const quitar = new Set();
  lista.forEach(([f, c]) => { if (grid[f][c]) quitar.add(f * 100 + c); });
  const negrasPegadas = new Set();
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    if (grid[f][c].k === NEGRA) return;
    for (const [nf, nc] of vecinos(f, c)) {
      const q = grid[nf][nc];
      if (q && q.k === NEGRA) negrasPegadas.add(nf * 100 + nc);
    }
  });
  negrasPegadas.forEach((key) => quitar.add(key));

  let normales = 0, negras = 0;
  quitar.forEach((key) => {
    const f = Math.floor(key / 100), c = key % 100;
    const g = grid[f][c];
    const x = (c + 0.5) * tam, y = (g.y + 0.5) * tam;
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
  return { normales, negras };
}

// Cierra la jugada: gasta un movimiento, hace caer, revisa si ganaste/perdiste y pone la negra extra si hace falta
function cerrarJugada(negrasQuitadas) {
  movs--;
  caer();
  if (contarNegras() === 0) { actualizarHud(); ganar(); return; }
  if (!negrasQuitadas) nuevaNegra();
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
  return lista;
}

function juntar(cad) {
  const n = cad.length;
  const ganancia = Math.round(n * PUNTOS_BASE + (n - MIN_CADENA) * (n - MIN_CADENA) * (PUNTOS_BASE / 2));
  puntos += ganancia;
  const ult = cad[cad.length - 1];
  const lineas = lineasDePoderes(cad, ult);
  const r = romper(cad.map(({ f, c }) => [f, c]).concat(lineas));
  const extra = Math.max(0, r.normales - n) * PUNTOS_BASE; // gominolas que rompieron las líneas de los poderes
  puntos += extra;
  textos.push({ x: (ult.c + 0.5) * tam, y: (ult.f + 0.5) * tam, vida: 0.9, txt: "+" + (ganancia + extra) });
  // cadena larga: deja un poder en la última gominola
  const poder = n >= CADENA_VERTICAL ? "vertical" : n >= CADENA_HORIZONTAL ? "horizontal" : null;
  if (poder) {
    grid[ult.f][ult.c] = { k: ESPECIAL, p: poder, y: ult.f, v: 0 };
    textos.push({ x: tam * COLUMNAS / 2, y: tam * 0.8, vida: 1.1, txt: PODERES[poder].icono + " " + poder });
  }
  for (let i = 0; i < Math.min(n, 6); i++) setTimeout(() => tono(NOTAS[Math.min(i + 3, NOTAS.length - 1)], 0.15), i * 55);
  cerrarJugada(r.negras);
}

// Tocar un bloque con poder solo: horizontal = toda su fila, vertical = toda su columna
function usarPoder({ f, c }) {
  const g = grid[f][c];
  const lista = lineasDePoderes([{ f, c }], { f, c });
  const x = (c + 0.5) * tam, y = (g.y + 0.5) * tam;
  const r = romper(lista);
  const ganancia = r.normales * PUNTOS_BASE;
  puntos += ganancia;
  textos.push({ x, y, vida: 0.9, txt: "+" + ganancia });
  for (let i = 0; i < 6; i++) setTimeout(() => tono(NOTAS[Math.min(i + 3, NOTAS.length - 1)] * (g.p === "vertical" ? 1.5 : 0.5), 0.15), i * 45);
  cerrarJugada(r.negras);
}

// ---------- Entrada ----------
function celdaEn(ev) {
  const r = lienzo.getBoundingClientRect();
  const x = ev.clientX - r.left, y = ev.clientY - r.top;
  const t = r.width / COLUMNAS;
  const c = Math.floor(x / t), f = Math.floor(y / t);
  if (c < 0 || f < 0 || c >= COLUMNAS || f >= FILAS) return null;
  const cerca = Math.hypot(x - (c + 0.5) * t, y - (f + 0.5) * t) < t * 0.42;
  return { f, c, cerca };
}

lienzo.addEventListener("pointerdown", (ev) => {
  if (estado !== "jugando" || cayendo()) return;
  const p = celdaEn(ev);
  if (!p) return;
  if (grid[p.f][p.c].k === NEGRA) return; // las negras no se pueden arrastrar
  try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {}
  cadena = [{ f: p.f, c: p.c }];
  tono(NOTAS[0], 0.08);
});

// Color de la primera gominola normal de la cadena (null si todavía solo lleva poderes)
function colorDeCadena() {
  for (const q of cadena) {
    const k = grid[q.f][q.c].k;
    if (k >= 0) return k;
  }
  return null;
}

lienzo.addEventListener("pointermove", (ev) => {
  if (!cadena) return;
  const p = celdaEn(ev);
  if (!p || !p.cerca) return;
  const ult = cadena[cadena.length - 1];
  if (p.f === ult.f && p.c === ult.c) return;
  // volver atrás quita la última
  if (cadena.length > 1) {
    const ant = cadena[cadena.length - 2];
    if (ant.f === p.f && ant.c === p.c) { cadena.pop(); return; }
  }
  if (Math.max(Math.abs(p.f - ult.f), Math.abs(p.c - ult.c)) !== 1) return;
  if (cadena.some((q) => q.f === p.f && q.c === p.c)) return;
  const kp = grid[p.f][p.c].k;
  if (kp === NEGRA) return;
  const kc = colorDeCadena();
  if (kp >= 0 && kc !== null && kp !== kc) return; // los poderes se pueden unir a cualquier cadena
  cadena.push({ f: p.f, c: p.c });
  tono(NOTAS[Math.min(cadena.length - 1, NOTAS.length - 1)], 0.08);
});

function soltar() {
  if (cadena && estado === "jugando") {
    const soloPoderes = cadena.every((q) => grid[q.f][q.c].k === ESPECIAL);
    if (cadena.length >= MIN_CADENA || (soloPoderes && cadena.length >= 2)) juntar(cadena);
    else if (cadena.length === 1 && soloPoderes) usarPoder(cadena[0]);
  }
  cadena = null;
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", () => (cadena = null));

// ---------- Partida ----------
function actualizarHud() {
  elPts.textContent = puntos;
  elMovs.textContent = Math.max(0, movs);
  elNegras.textContent = contarNegras();
  elNivel.textContent = actual;
  elBarra.style.width = Math.max(0, (movs / movsIni) * 100) + "%";
  elBarra.classList.toggle("poco", movs <= 3);
}

// Empieza el nivel n (el que se elige en el mapa o el siguiente tras ganar)
function jugar(n) {
  actual = Math.max(1, Math.min(TOTAL_NIVELES, Math.floor(Number(n)) || 1));
  empezar();
}

function empezar() {
  partida++;
  puntos = puntosInicioNivel;
  const fijo = NIVELES[actual - 1];
  const n = fijo ? fijo.negras : negrasDelNivel(actual);
  movsIni = fijo ? fijo.movs : movimientosDelNivel(n, actual);
  movs = movsIni;
  cadena = null;
  particulas = [];
  textos = [];
  revisar = false;
  llenar();
  colocarNegras(n);
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
  const ganados = puntos - puntosInicioNivel;
  let nuevoRecord = false;
  if (puntos > mejor) {
    mejor = puntos;
    nuevoRecord = true;
  }
  actualizarHud();
  const primera = actual >= nivel; // primera vez que se pasa: solo entonces suma puntos al perfil y desbloquea el siguiente
  ovlTitulo.textContent = "¡Nivel " + actual + " superado!";
  ovlTexto.textContent = ganados + " puntos" + (bono ? " (bono +" + bono + ")" : "") + (nuevoRecord ? " · ¡nuevo récord!" : "") + (primera ? "" : " · nivel repetido: no suma al perfil");
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

function perder() {
  estado = "fin";
  cadena = null;
  menuBoton();
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

ovlBtn.addEventListener("click", () => jugar(pendiente));
// «🗺️ Mapa»: vuelve al mapa; si se terminó un estado o país, el agua sube al llegar
document.getElementById("ovlMapa").addEventListener("click", () => abrirMapa(ganoUltimo && actual % NIVELES_POR_ETAPA === 0 && actual >= nivel - 1));

// ---------- Dibujo ----------
function ajustar() {
  const dpr = window.devicePixelRatio || 1;
  const w = lienzo.clientWidth;
  tam = w / COLUMNAS;
  lienzo.style.height = tam * FILAS + "px";
  lienzo.width = Math.round(w * dpr);
  lienzo.height = Math.round(tam * FILAS * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", ajustar);

function oso(x, y, r, col, esc, ojo = "#2b1a3a") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(esc, esc);
  // sombra
  ctx.fillStyle = "rgba(0,0,0,.22)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 0.8, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  // orejas
  for (const s of [-1, 1]) {
    ctx.fillStyle = col.c; ctx.strokeStyle = col.o; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.arc(s * r * 0.62, -r * 0.7, r * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // cabeza
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, "rgba(255,255,255,.75)");
  gr.addColorStop(0.35, col.c);
  gr.addColorStop(1, col.o);
  ctx.fillStyle = gr; ctx.strokeStyle = col.o; ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hocico
  ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.4, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  // ojos y nariz
  ctx.fillStyle = ojo;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.08, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, r * 0.22, r * 0.09, r * 0.065, 0, 0, Math.PI * 2); ctx.fill();
  // brillo
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.5, r * 0.22, r * 0.12, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Bloque con poder (horizontal o vertical): disco brillante con su icono
function bloquePoder(x, y, r, tipo, esc) {
  const P = PODERES[tipo] || PODERES.horizontal;
  const pulso = esc * (1 + Math.sin(performance.now() / 180) * 0.05);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulso, pulso);
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  gr.addColorStop(0, "#ffffff");
  gr.addColorStop(0.4, P.c1);
  gr.addColorStop(1, P.c2);
  ctx.fillStyle = gr; ctx.strokeStyle = "#fff"; ctx.lineWidth = r * 0.1;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.font = r * 1.1 + "px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#000";
  ctx.fillText(P.icono, 0, r * 0.05);
  ctx.restore();
}

function dibujar() {
  ctx.clearRect(0, 0, tam * COLUMNAS, tam * FILAS);
  // cuadrícula suave
  ctx.fillStyle = "rgba(255,255,255,.05)";
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLUMNAS; c++)
      if ((f + c) % 2) ctx.fillRect(c * tam, f * tam, tam, tam);

  const enCadena = new Set((cadena || []).map((q) => q.f * 100 + q.c));
  // línea que une la cadena
  if (cadena && cadena.length > 1) {
    const kc = colorDeCadena();
    const col = kc === null ? ESPECIAL_COL : PALETA[kc];
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
      if (g.k === NEGRA) oso(x, y, tam * 0.38, NEGRA_COL, 1, "#ffffff");
      else if (g.k === ESPECIAL) bloquePoder(x, y, tam * 0.38, g.p, sel ? 1.14 : 1);
      else oso(x, y, tam * 0.38, PALETA[g.k], sel ? 1.14 : 1);
      if (sel) {
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc((c + 0.5) * tam, (g.y + 0.5) * tam, tam * 0.45, 0, Math.PI * 2); ctx.stroke();
      }
    }
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
ajustar();
llenar();
colocarNegras(NEGRAS_MIN);
mapa.abrir();   // el juego empieza en el mapa (México de cerca)
menuBoton();
actualizarHud();
requestAnimationFrame((t) => { ultimo = t; bucle(t); });

// Sincronizar con la cuenta: del récord y del nivel se queda el mayor
import("../compartido/progreso.js").then((p) => {
  nube = p.conectar(ID, {
    clave: CLAVE_PROG,
    fusionar: p.unirMaximos,
    alCambiar: (v) => {
      mejor = Math.max(mejor, Number(v.mejor) || 0);
      // «nivel» es solo el progreso (el nivel en juego es «actual»), así que se puede actualizar en cualquier momento
      nivel = Math.max(nivel, Number(v.nivel) || 1);
      if (mapa.abierto()) mapa.refrescar();
      actualizarHud();
    },
  });
}).catch(() => {});
