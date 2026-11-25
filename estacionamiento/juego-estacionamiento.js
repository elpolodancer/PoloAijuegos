// Ruta: estacionamiento/juego-estacionamiento.js
// Saca todos los autos de un estacionamiento cuadrado (vista 2.5D: cuadrícula recta con cámara elevada e inclinada). Los 10 primeros niveles suben de 6×6 a 10×10 y el resto son 10×10.
// - Cada auto avanza solo hacia donde apunta su flecha; si algo le estorba, no se mueve.
// - Los autos salen del tablero EN LÍNEA RECTA por su propia fila o columna (sin vía, sin salidas en las esquinas y sin giros) y se desvanecen al alejarse.
// - INICIO CON MAPA (ESTANDARES-juegos.md, sección 13): pantalla de inicio → mapa de un país (menú principal) → nivel; ♾️ Modo libre con partidas guardadas y ⚙️ Ajustes.
// - Hay 3 900 niveles: 195 países × 20 (México es el país 1; mapa solo de países, ESTANDARES-juegos.md A-bis). Todos salen de niveles-estacionamiento.js: tamaño, autos y premio dependen solo del número
//   de nivel, y siempre tienen solución (cada auto se coloca con su camino libre respecto a los ya colocados).

import { encolarNivel, leerCola, guardarCola } from "../compartido/cola-puntos.js"; // cola local de puntos: no usa Firebase, funciona sin internet
import { TOTAL_NIVELES, NIVELES_POR_ETAPA, TAMS_LIBRE, DIFICULTADES, configNivel, configLibre, generarNivel } from "./niveles-estacionamiento.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";   // mapa estándar de un solo país (la silueta del país se llena de agua con cada nivel)
import { crearMenuPausa } from "../compartido/menu-pausa.js";

let N = 25;                         // casillas por lado (cambia con cada nivel)
const CELL = 32;                    // lado de una casilla en píxeles con zoom 1 (vista 2D desde arriba)
// Nivel de detalle según el tamaño de la casilla en pantalla (CELL × zoom): ≥14 px = auto completo (parabrisas, luces, flecha);
// ≥6 px = cuerpo, techo y flecha; menos (tableros enormes de lejos) = solo un rectángulo de color, que no se nota y cuesta mucho menos.
const PX_DETALLE = 14, PX_MEDIO = 6;
const VEL = 16;                     // casillas por segundo al salir
const OSCURECER = 0.9;              // tonos de los autos: los mismos colores pero más oscuros (1 = como antes; menos = más oscuro)
// Aspecto visual (NO cambia la lógica ni la hitbox: cada auto sigue ocupando sus casillas completas)
const DPR_MAX = 1.5;                // resolución máxima del lienzo (2 se ve un poco más nítido pero pinta 78 % más píxeles)
const TILT = 0.7;                   // inclinación de la cámara (vista 2.5D): 1 = vista cenital; menos = más inclinada (0.7 ≈ 46° sobre la vertical, como «Parking Jam»)
const ANCHO_AUTO = 0.72;            // ancho del auto dentro de su casilla: queda un poco de aire alrededor
const MARGEN_LARGO = 0.22;          // al largo del auto se le resta esto (en casillas): queda separación entre autos en fila
const ALTO_CARROCERIA = 0.22, ALTO_CABINA = 0.17, ALTO_CAJA = 0.36; // alturas (en casillas): carrocería, cabina de cristal con techo y caja del camión (volumen de la vista 2.5D)
const ALTO_TOQUE = 0.22;            // al tocar la pantalla se busca el auto a esta altura (a media carrocería), no en el suelo
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // 0 arriba, 1 derecha, 2 abajo, 3 izquierda
const ID_JUEGO = "estacionamiento";
const CLAVE = "estacionamiento-progreso";
const CLAVE_LIBRE = "estacionamiento_libre_v1";         // Modo libre: última dificultad y tablero elegidos + tableros resueltos (clave «_v1»: entra en la copia de seguridad de almacen.js)
const CLAVE_PARTIDAS = "estacionamiento_partidas_v1";   // Modo libre: partidas guardadas (hasta 20, solo en este dispositivo; también entra en la copia de seguridad)
const ID_LIBRE = "estacionamiento-libre";               // documento en la nube del Modo libre (progreso/{uid}/juegos/estacionamiento-libre)
// ⚠️ Botón «Borrar todo el historial y reiniciar» de ⚙️ Ajustes: SOLO para pruebas. Debe quedar en false: el juego ya está publicado (ESTANDARES-juegos.md, 13.8 y 13.11).
const MOSTRAR_BORRAR_HISTORIAL = false;
let reiniciando = false; // true mientras se borra todo: la sincronización no une nada
// Dificultades del Modo libre (el juego solo usa la 1 y la 2; ver README, sección 3)
const DIFS = {
  1: { emoji: "😐", nombre: "Medio", nota: "Casi todos los autos salen de una. " + DIFICULTADES[1].corazones + " corazones." },
  2: { emoji: "😡", nombre: "Difícil", nota: "Hay cadenas de autos que se estorban. " + DIFICULTADES[2].corazones + " corazones." },
};

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ----- Progreso: se guarda SIEMPRE en el dispositivo y se sincroniza con la cuenta cuando hay internet y sesión -----
let nube = null; // se llena al cargar compartido/progreso.js (si no carga, el juego sigue igual)
let prog = { max: 1, hecho: 0 };
try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(CLAVE) || "{}")); } catch (e) {}
// Hubo una versión con 22 600 niveles: si el progreso guardado pasa de TOTAL_NIVELES (3 900), se recorta (no se pierde nada que exista en esta versión)
function normalizarProg() { prog.max = clamp(Math.floor(Number(prog.max)) || 1, 1, TOTAL_NIVELES); prog.hecho = clamp(Math.floor(Number(prog.hecho)) || 0, 0, TOTAL_NIVELES); }
normalizarProg();
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {} if (nube) nube.guardado(); };

// ----- Monedas y usos de «quitar un auto»: guardado local + sincronización con la cuenta -----
// Se gastan, así que NO se guardan como un número (al unir dos dispositivos habría que adivinar cuál es el «verdadero»). En su lugar:
//   · Monedas GANADAS: no se guardan; salen de los niveles terminados (prog.hecho, que ya se une con el mayor). Un nivel solo paga una vez
//     aunque se termine en dos dispositivos antes de sincronizar.
//   · Lo GASTADO / COMPRADO / USADO: cada dispositivo anota solo lo suyo (contadores que solo suben) y al unir se queda con el mayor de CADA
//     dispositivo. Los gastos hechos sin internet en dos dispositivos se SUMAN al sincronizar, no se pisan.
//   monedas = ganadas − Σ gastado      usos de quitar = Σ compradas − Σ usadas      (nunca menos de 0)
// Si dos dispositivos gastan sin conexión más de lo que tenían, al unirse el saldo queda en 0 (no hay deudas).
const CLAVE_CARTERA = "estacionamiento-cartera";      // localStorage (y, tal cual, lo que se sube a la nube)
const ID_CARTERA = "estacionamiento-cartera";         // documento en la nube (progreso/{uid}/juegos/estacionamiento-cartera)
const CLAVE_DISPOSITIVO = "estacionamiento-dispositivo";
const CLAVE_MONEDAS_VIEJA = "estacionamiento-monedas"; // versión anterior (un solo número): se migra una vez

let miId = "";
try {
  miId = localStorage.getItem(CLAVE_DISPOSITIVO) || "";
  if (!miId) { miId = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); localStorage.setItem(CLAVE_DISPOSITIVO, miId); }
} catch (e) { miId = miId || Math.random().toString(36).slice(2, 10); }

let nubeCartera = null; // se llena al cargar compartido/progreso.js
let nubeLibre = null;   // ídem, para el Modo libre
const numeros = (o) => { const r = {}; for (const k in o || {}) { const v = Math.floor(Number(o[k])); if (v > 0) r[k] = v; } return r; };
const normalizar = (c) => ({ gastado: numeros(c && c.gastado), compradas: numeros(c && c.compradas), usadas: numeros(c && c.usadas) });
let cartera = normalizar(null);
let existiaCartera = false;
try { const c = JSON.parse(localStorage.getItem(CLAVE_CARTERA) || "null"); if (c) { cartera = normalizar(c); existiaCartera = true; } } catch (e) {}

// monedas que dan los niveles 1..h (acumulado, se calcula una sola vez y crece solo si hace falta)
const acumPremios = [0];
function premiosHasta(h) {
  h = clamp(Math.floor(Number(h)) || 0, 0, TOTAL_NIVELES);
  for (let n = acumPremios.length; n <= h; n++) acumPremios[n] = acumPremios[n - 1] + configNivel(n).premio;
  return acumPremios[h];
}
const suma = (o) => Object.values(o).reduce((t, v) => t + v, 0);
const monedas = () => Math.max(0, premiosHasta(prog.hecho) - suma(cartera.gastado));
const usosQuitar = () => Math.max(0, suma(cartera.compradas) - suma(cartera.usadas));
const anotar = (campo, n) => { cartera[campo][miId] = (cartera[campo][miId] || 0) + n; guardarCartera(); };
const guardarCartera = () => { try { localStorage.setItem(CLAVE_CARTERA, JSON.stringify(cartera)); } catch (e) {} if (nubeCartera) nubeCartera.guardado(); };

// Migración única: si había monedas guardadas como número, se anota como «ya gastado» lo que falta para que el saldo quede igual
if (!existiaCartera) {
  try {
    const vieja = JSON.parse(localStorage.getItem(CLAVE_MONEDAS_VIEJA) || "null");
    if (vieja) {
      const ganadas = premiosHasta(prog.hecho), tengo = Math.max(0, Math.floor(Number(vieja.monedas)) || 0);
      if (ganadas > tengo) cartera.gastado[miId] = ganadas - tengo;
      const q = Math.max(0, Math.floor(Number(vieja.quitar)) || 0);
      if (q) cartera.compradas[miId] = q;
      guardarCartera();
      localStorage.removeItem(CLAVE_MONEDAS_VIEJA);
    }
  } catch (e) {}
}

// Unir dos carteras (para progreso.js → «fusionar»): por dispositivo, el contador mayor
function unirMapas(a, b) { const r = { ...(b || {}) }; for (const k in a || {}) r[k] = Math.max(Number(a[k]) || 0, Number(r[k]) || 0); return r; }
function unirCartera(a, b) {
  if (!a && !b) return null;
  a = a || {}; b = b || {};
  return { gastado: unirMapas(a.gastado, b.gastado), compradas: unirMapas(a.compradas, b.compradas), usadas: unirMapas(a.usadas, b.usadas) };
}
// El emoji 🪙 (Unicode 13) no se ve en Windows/Android viejos: la moneda es un dibujo CSS (.moneda en index-estacionamiento.html), igual en todos.
const MONEDA = '<span class="moneda" aria-hidden="true"></span>';
const chipMonedas = $("monedas"); // chip dorado: arriba a la derecha (bajo la sesión) y, dentro de una partida, a la izquierda del 🗺️ (ubicarMonedas)
const pintarMonedas = () => { chipMonedas.innerHTML = MONEDA + monedas().toLocaleString("es-MX"); chipMonedas.setAttribute("aria-label", monedas() + " monedas"); };
pintarMonedas();
function ubicarMonedas() {
  const enBarra = !$("barra-nivel").hidden;
  const destino = enBarra ? $("barra-nivel") : document.querySelector(".hud-der");
  if (chipMonedas.parentNode === destino) return;
  if (enBarra) destino.prepend(chipMonedas); else destino.appendChild(chipMonedas);
}

// ----- Boosts: «Quitar un auto» (30 🪙, o gratis si ya tienes usos), «Paquete ×3» (50 🪙 = 3 usos), «Bomba» (100 🪙) y «Vida extra» (30 🪙) -----
// Economía: un nivel medio da 20 monedas y uno difícil 35 (solo la primera vez), así que la bomba sale en ~4 niveles y una vida extra en ~1.
// «Quitar un auto» se paga AL USARLO: tocas el botón, tocas el auto y entonces se gasta un uso (o 30 monedas). Si te arrepientes, tocas el botón otra vez.
const PRECIO_QUITAR = 30, PRECIO_PAQUETE = 50, USOS_PAQUETE = 3;
const PRECIO_BOMBA = 100, AUTOS_BOMBA = 8; // la bomba se paga al soltarla (no se guarda en inventario) y elimina los 8 autos más cercanos al punto elegido
const PRECIO_VIDA = 30, VIDAS_EXTRA = 3, VIDAS_TOPE = 30; // vida extra: +3 corazones por 30 monedas (también sirve para seguir jugando al quedarte sin corazones)
let modoQuitar = false;
let modoBomba = false, puntoBomba = null, efectoBomba = null; // puntoBomba = { x, y } casilla elegida; efectoBomba = explosión { x, y, t, autos: [{ cx, cy }] }

function botonBoost(clase, icono, titulo) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d " + clase; b.title = titulo; b.setAttribute("aria-label", titulo);
  const i = document.createElement("span"); i.className = "b-ico"; i.textContent = icono;
  const info = document.createElement("span"); info.className = "b-info";
  b.append(i, info);
  return { b, info };
}
const bQuitar = botonBoost("b-azul", "🚗", "Quitar un auto");
const bPaquete = botonBoost("b-oro sin", "📦", "Paquete ×3: tres usos de «Quitar un auto»");
bPaquete.info.innerHTML = PRECIO_PAQUETE + MONEDA;
const bBomba = botonBoost("b-rojo sin", "💣", "Bomba: elimina los " + AUTOS_BOMBA + " autos más cercanos al punto que elijas");
bBomba.info.innerHTML = PRECIO_BOMBA + MONEDA;
const bVida = botonBoost("b-morado sin", "❤️", "Vida extra: +" + VIDAS_EXTRA + " corazones");
bVida.info.innerHTML = PRECIO_VIDA + MONEDA;
const zBoosts = document.createElement("div");
zBoosts.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;gap:10px";
zBoosts.setAttribute("role", "group"); zBoosts.setAttribute("aria-label", "Boosts");
zBoosts.append(bQuitar.b, bPaquete.b, bBomba.b, bVida.b);
($("boosts") || document.querySelector(".hud-abajo") || document.body).appendChild(zBoosts); // los boosts van abajo al centro (el rótulo del nivel ahora va arriba)

function pintarBoosts() {
  const tiene = usosQuitar() > 0;
  bQuitar.info.innerHTML = tiene ? "×" + usosQuitar() : PRECIO_QUITAR + MONEDA;
  bQuitar.b.classList.toggle("sin", !tiene);
  bQuitar.b.classList.toggle("on", modoQuitar);
  bQuitar.b.setAttribute("aria-pressed", String(modoQuitar));
  bBomba.b.classList.toggle("on", modoBomba);
  bBomba.b.setAttribute("aria-pressed", String(modoBomba));
}
function salirModoQuitar() {
  modoQuitar = false;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
function salirModoBomba() {
  modoBomba = false; puntoBomba = null; escenaVer++;
  $("lienzo").style.cursor = "";
  pintarBoosts();
}
bQuitar.b.addEventListener("click", () => {
  if (modoQuitar) { salirModoQuitar(); return; }
  if (ganado || perdido) return;
  if (usosQuitar() <= 0 && monedas() < PRECIO_QUITAR) { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); return; }
  salirModoBomba();
  modoQuitar = true;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca el auto que quieres quitar");
});
bBomba.b.addEventListener("click", () => {
  if (modoBomba) { salirModoBomba(); return; }
  if (ganado || perdido) return;
  if (monedas() < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); return; }
  salirModoQuitar();
  modoBomba = true; puntoBomba = null;
  $("lienzo").style.cursor = "crosshair";
  pintarBoosts();
  aviso("Toca el centro de la bomba; toca otra vez el mismo lugar para soltarla");
});
bPaquete.b.addEventListener("click", () => {
  if (monedas() < PRECIO_PAQUETE) { aviso("Necesitas " + PRECIO_PAQUETE + " monedas"); return; }
  anotar("gastado", PRECIO_PAQUETE); anotar("compradas", USOS_PAQUETE);
  pintarMonedas(); pintarBoosts();
  aviso("Paquete comprado: +" + USOS_PAQUETE + " usos de quitar un auto");
});
bVida.b.addEventListener("click", () => comprarVida());
pintarBoosts();

// ----- Niveles: el generador vive en niveles-estacionamiento.js -----
const cabeza = (c) => [c.dir === 1 ? c.x + c.len - 1 : c.x, c.dir === 2 ? c.y + c.len - 1 : c.y];

// ----- Estado -----
let nivel = 1, cfg = null, autos = [], occ = [], restantes = 0, movs = 0, T = 0, ganado = false;
let vidas = 0, vidasMax = 0, perdido = false; // corazones: cada nivel trae los de su dificultad; al tocar un auto con otro enfrente se pierde uno
let modo = "nivel", partidaId = null, guardadaMovs = -1, pausado = false; // modo: "nivel" (niveles del mapa) o "libre"; partidaId/guardadaMovs: la partida guardada que se está jugando; pausado: ventana de pausa abierta (todo se congela)
let escenaVer = 0, firmaPrev = "", animPrev = false; // para dibujar solo cuando algo cambió (ver bucle)
let cam = { s: 1, ox: 0, oy: 0 }, camMin = 0.3, camMax = 6;
let camTocada = false; // true cuando el jugador movió o acercó la vista (así un cambio de tamaño de ventana no se la deshace)
let ultAutos = "", ultMovs = -1; // últimos textos puestos en pantalla (para no reescribirlos 60 veces por segundo)

// Prepara un tablero: de un nivel del mapa (cargarNivel, número fijo) o del Modo libre (cargarLibre, semilla al azar).
// «guardada» = partida guardada del Modo libre: los autos que ya habían salido no vuelven y se siguen los movimientos y corazones.
function iniciarTablero(c0, guardada) {
  cfg = c0;
  N = cfg.tam;
  autos = generarNivel(cfg);
  occ = new Array(N * N).fill(-1);
  for (const c of autos) {
    c.estado = 0; c.bump = 0; c.flash = 0;
    celdasDe(c).forEach(([x, y]) => (occ[y * N + x] = c.id));
  }
  restantes = autos.length;
  movs = 0; ganado = false;
  vidas = vidasMax = cfg.corazones; perdido = false;
  if (guardada) {
    for (const id of guardada.q) {
      const a = autos[id];
      if (!a || a.estado !== 0) continue;
      celdasDe(a).forEach(([x, y]) => { if (occ[y * N + x] === a.id) occ[y * N + x] = -1; });
      a.estado = 2; restantes--;
    }
    movs = guardada.mov; vidas = clamp(guardada.v, 1, VIDAS_TOPE);
  }
  pausado = false;
  const dr = $("derrota"); if (dr) dr.hidden = true;
  pintarVidas();
  escenaVer++;
  salirModoQuitar();
  salirModoBomba();
  efectoBomba = null;
  $("victoria").hidden = true;
  ultAutos = -1; ultMovs = -1; // fuerzan repintar los cuadros de datos
  etiquetasFin();
  pintarNombre();
  ajustarCamara();
}
function cargarNivel(n) {
  n = clamp(Math.floor(Number(n)) || 1, 1, TOTAL_NIVELES);
  modo = "nivel"; nivel = n; partidaId = null; guardadaMovs = -1;
  iniciarTablero(configNivel(n));
}
function cargarLibre(tam, dif, seed, guardada) {
  modo = "libre"; nivel = 0;
  partidaId = guardada ? guardada.id : null; guardadaMovs = guardada ? guardada.mov : -1;
  iniciarTablero(configLibre(tam, dif, seed), guardada);
}
function celdasDe(c) {
  const r = [];
  for (let i = 0; i < c.len; i++) r.push(c.h ? [c.x + i, c.y] : [c.x, c.y + i]);
  return r;
}

// ----- Salida: camino libre y animación en línea recta -----
function caminoLibre(c) {
  const [hx, hy] = cabeza(c);
  let x = hx + DX[c.dir], y = hy + DY[c.dir];
  while (x >= 0 && y >= 0 && x < N && y < N) {
    if (occ[y * N + x] !== -1) return false;
    x += DX[c.dir]; y += DY[c.dir];
  }
  return true;
}

// Ruta de un auto al salir: EN LÍNEA RECTA desde su casilla, siguiendo su flecha, hasta fuera del tablero (sin giros).
// Como cada auto sale por su propia fila o columna, dos autos nunca se estorban al salir: no hay que esperar a nadie.
//   n        casillas desde su cabeza hasta la primera casilla fuera del tablero
//   enBorde  distancia recorrida (en casillas) cuando su cabeza llega a esa casilla fuera del tablero: desde ahí empieza a desvanecerse
//   tFin     distancia a la que termina la animación (el auto ya desapareció)
function planear(c) {
  const [hx, hy] = cabeza(c);
  const d = c.dir;
  const n = d === 0 ? hy + 1 : d === 1 ? N - hx : d === 2 ? N - hy : hx + 1;
  const tFin = n + c.len + 4;
  const P0 = [hx + 0.5, hy + 0.5];
  const P1 = [P0[0] + DX[d] * (tFin + c.len + 2), P0[1] + DY[d] * (tFin + c.len + 2)];
  return { n, pts: [P0, P1], acum: [0, tFin + c.len + 2], enBorde: n, tFin };
}

// Boost «Quitar un auto»: gasta un uso (o 30 monedas) y el auto desaparece; sus casillas quedan libres
function quitarAuto(c) {
  if (usosQuitar() > 0) anotar("usadas", 1);
  else if (monedas() >= PRECIO_QUITAR) anotar("gastado", PRECIO_QUITAR);
  else { aviso("Necesitas " + PRECIO_QUITAR + " monedas"); salirModoQuitar(); return; }
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
  pintarMonedas();
  salirModoQuitar();
}

// Saca un auto del tablero sin animación (lo usa la bomba)
function retirarAuto(c) {
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  c.estado = 2;
  restantes--;
}
// Bomba: el primer toque coloca la bomba en una casilla (se ven marcados los 8 autos que se llevaría); tocar otra vez la misma casilla la suelta.
// Elimina los AUTOS_BOMBA autos más cercanos a ese punto (el que esté debajo y los de alrededor); desaparecen al instante y sus casillas quedan libres.
function autosDeBomba(x, y) {
  const lista = [];
  for (const c of autos) {
    if (c.estado !== 0) continue; // los que ya van saliendo no cuentan
    let d = 1e9;
    for (const [cx, cy] of celdasDe(c)) d = Math.min(d, Math.hypot(cx - x, cy - y));
    const [hx, hy] = cabeza(c);
    lista.push({ c, d, e: Math.hypot(hx - x, hy - y) }); // e = desempate
  }
  lista.sort((p, q) => p.d - q.d || p.e - q.e || p.c.id - q.c.id);
  return lista.slice(0, AUTOS_BOMBA).map((o) => o.c);
}
function tocarBomba(p) {
  if (ganado || perdido) return;
  const [gx, gy] = suelo(p.x, p.y);
  const x = Math.floor(gx), y = Math.floor(gy);
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  if (puntoBomba && puntoBomba.x === x && puntoBomba.y === y) { soltarBomba(); return; }
  puntoBomba = { x, y };
  escenaVer++;
  aviso("Toca otra vez el 💣 para soltarla (o toca otro lugar para moverla)");
}
function soltarBomba() {
  const pt = puntoBomba;
  const blancos = autosDeBomba(pt.x, pt.y);
  if (!blancos.length) { aviso("No quedan autos"); salirModoBomba(); return; } // no se cobra
  if (monedas() < PRECIO_BOMBA) { aviso("Necesitas " + PRECIO_BOMBA + " monedas"); salirModoBomba(); return; }
  anotar("gastado", PRECIO_BOMBA);
  const puntos = blancos.map((c) => { const q = poseDe(c); return { cx: q.cx, cy: q.cy }; });
  for (const c of blancos) retirarAuto(c);
  efectoBomba = { x: pt.x + 0.5, y: pt.y + 0.5, t: 0.5, autos: puntos };
  pintarMonedas();
  aviso("💥 " + blancos.length + (blancos.length === 1 ? " auto eliminado" : " autos eliminados"));
  salirModoBomba();
}

// ----- Corazones -----
function pintarVidas() {
  const t = $("vidas-txt"), chip = $("vidas");
  if (t) t.textContent = vidas;
  if (chip) { chip.classList.toggle("poco", vidas > 0 && vidas <= 3); chip.setAttribute("aria-label", vidas + " corazones"); }
}
function perderVida() {
  vidas = Math.max(0, vidas - 1);
  pintarVidas();
  if (vidas <= 0) derrota();
  else aviso("Algo le estorba · te " + (vidas === 1 ? "queda 1 corazón" : "quedan " + vidas + " corazones"));
}
function pintarBotonDerrota() {
  const b = $("d-vida"); if (!b) return;
  b.innerHTML = '<span class="b-ico">❤️</span> Seguir con +' + VIDAS_EXTRA + ' · ' + PRECIO_VIDA + MONEDA;
  b.disabled = monedas() < PRECIO_VIDA;
  b.title = b.disabled ? "Necesitas " + PRECIO_VIDA + " monedas" : "Vida extra: +" + VIDAS_EXTRA + " corazones";
}
function derrota() {
  perdido = true;
  salirModoQuitar(); salirModoBomba();
  pintarBotonDerrota();
  const d = $("derrota"); if (d) d.hidden = false;
  colocarVictoria();
}
// Vida extra: +3 corazones por 30 monedas (se paga al usarla). Si ya te quedaste sin corazones, sigues jugando el mismo tablero.
function comprarVida() {
  if (ganado) return;
  if (monedas() < PRECIO_VIDA) { aviso("Necesitas " + PRECIO_VIDA + " monedas"); return; }
  if (!perdido && vidas >= VIDAS_TOPE) { aviso("Ya tienes muchos corazones"); return; }
  anotar("gastado", PRECIO_VIDA);
  vidas = Math.min(VIDAS_TOPE, vidas + VIDAS_EXTRA);
  if (perdido) { perdido = false; const d = $("derrota"); if (d) d.hidden = true; }
  pintarMonedas(); pintarVidas();
  aviso("❤️ +" + VIDAS_EXTRA + " corazones");
}

function tocarAuto(c) {
  if (c.estado !== 0 || ganado || perdido) return;
  if (modoQuitar) { quitarAuto(c); return; }
  if (!caminoLibre(c)) {
    if (c.bump > 0) return; // ya está rebotando: un doble toque no cuesta otro corazón
    c.bump = 0.35; c.flash = 0.4;
    perderVida(); // tocar un auto que tiene otro enfrente cuesta un corazón
    return;
  }
  // Su hitbox desaparece AL INSTANTE: las casillas quedan libres en cuanto se toca, aunque el auto siga animándose hacia fuera.
  // Así se puede tocar de inmediato a los autos que estorbaba. Cada uno sale por su propia fila o columna, así que no hay nada que esperar.
  Object.assign(c, planear(c), { estado: 1, t0: T });
  celdasDe(c).forEach(([x, y]) => { if (occ[y * N + x] === c.id) occ[y * N + x] = -1; });
  movs++;
}

// ----- Posición de un auto: la cabeza y la cola siguen la ruta (hoy una recta) -----
function puntoEn(c, d) {
  const pts = c.pts, ac = c.acum;
  if (d <= 0) {
    const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], L = Math.hypot(dx, dy) || 1;
    return [pts[0][0] + (dx / L) * d, pts[0][1] + (dy / L) * d];
  }
  for (let i = 1; i < pts.length; i++) {
    if (d <= ac[i] || i === pts.length - 1) {
      const L = ac[i] - ac[i - 1] || 1, f = (d - ac[i - 1]) / L;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
  }
  return pts[pts.length - 1];
}
function poseDe(c) {
  let cab, col, alfa = 1, z = 0; // z = salto del auto en casillas (solo visual)
  if (c.estado === 1) {
    const t = (T - c.t0) * VEL;
    z = 0.035 * Math.abs(Math.sin(t * 2.6)); // rebote suave de la suspensión al avanzar
    cab = puntoEn(c, t);
    col = puntoEn(c, t - (c.len - 1));
    alfa = 1 - clamp((t - c.enBorde - 1) / (c.len + 2), 0, 1);   // se desvanece al salir del tablero
  } else {
    const [hx, hy] = cabeza(c);
    cab = [hx + 0.5, hy + 0.5];
    col = [cab[0] - DX[c.dir] * (c.len - 1), cab[1] - DY[c.dir] * (c.len - 1)];
    if (c.bump > 0) {
      const off = Math.sin((1 - c.bump / 0.35) * Math.PI) * 0.22;
      z = 0.1 * Math.sin((1 - c.bump / 0.35) * Math.PI); // brinquito al chocar
      cab = [cab[0] + DX[c.dir] * off, cab[1] + DY[c.dir] * off];
      col = [col[0] + DX[c.dir] * off, col[1] + DY[c.dir] * off];
    }
  }
  let dx = cab[0] - col[0], dy = cab[1] - col[1];
  const L = Math.hypot(dx, dy);
  if (L < 1e-3) { dx = DX[c.dir]; dy = DY[c.dir]; } else { dx /= L; dy /= L; }
  return { cx: (cab[0] + col[0]) / 2, cy: (cab[1] + col[1]) / 2, dx, dy, alfa, z };
}

// ----- Cámara -----
const cv = $("lienzo"), ctx = cv.getContext("2d");
let cw = 300, ch = 300, dpr = 1;
function redim() {
  const r = cv.getBoundingClientRect();
  dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
  cacheAutos.clear(); pixCache = 0; // los dibujos guardados dependen de dpr
  cw = r.width; ch = r.height;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
}
// Vista FIJA: sin zoom ni arrastre. El tablero (con media casilla de margen a cada lado) ocupa TODO el ancho de la zona libre y queda centrado.
// Zona de la pantalla donde cabe el tablero (px CSS): debajo de la barra de nivel y los cuadros de datos, encima de los boosts.
// Celular horizontal bajo: la barra y los cuadros pasan a una columna a la izquierda (ver compartido/inmersivo.css).
function zonaTablero() {
  if (matchMedia("(orientation: landscape) and (max-height: 560px)").matches) return { x: 250, y: 8, w: Math.max(100, cw - 250 - 110), h: Math.max(100, ch - 8 - 84) };
  const arriba = cw >= 640 ? 140 : 190, abajo = 84;
  return { x: 0, y: arriba, w: cw, h: Math.max(100, ch - arriba - abajo) };
}
const escalaAjustada = () => { const z = zonaTablero(); return Math.max(0.05, Math.min(z.w / ((N + 1) * CELL), z.h / ((N + 1) * CELL * TILT))); };
function ajustarCamara() {
  const s = escalaAjustada(), z = zonaTablero();
  camMin = camMax = s;
  cam.s = s;
  cam.ox = z.x + z.w / 2 - (N * CELL * s) / 2;
  cam.oy = z.y + z.h / 2 - (N * CELL * s * TILT) / 2; // centrado en la zona libre
  camTocada = false;
}
// Casilla (gx, gy) → píxeles de pantalla, y al revés (vista inclinada: el eje vertical se aplasta por TILT)
const P = (gx, gy) => [cam.ox + gx * CELL * cam.s, cam.oy + gy * CELL * cam.s * TILT];
function suelo(sx, sy, alto = 0) { // alto = altura (en casillas) del punto tocado: 0 = el suelo
  const u = CELL * cam.s;
  return [(sx - cam.ox) / u, (sy + alto * u - cam.oy) / (u * TILT)];
}

// ----- Dibujo (vista 2D desde arriba) -----
// Rectángulo redondeado (arcTo funciona en todos los navegadores; ctx.roundRect no)
function rr(x, y, w, h, r, g = ctx) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function dibujarSuelo() {
  const u = CELL * cam.s;
  // Sombra suave del tablero sobre la madera (sin blur: el blur es lentísimo)
  if (u >= PX_MEDIO) {
    const [sx0, sy0] = P(0, 0), [sx1, sy1] = P(N, N);
    rr(sx0 + 0.12 * u, sy0 + 0.4 * u, sx1 - sx0, sy1 - sy0, 0.4 * u);
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fill();
  }

  // Tablero: panel lavanda claro (como el piso de la referencia)
  const [tx0, ty0] = P(0, 0), [tx1, ty1] = P(N, N);
  rr(tx0, ty0, tx1 - tx0, ty1 - ty0, 0.2 * u);
  const gr = ctx.createLinearGradient(0, ty0, 0, ty1);
  gr.addColorStop(0, "#d6daec"); gr.addColorStop(1, "#bcc1da");
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.lineWidth = Math.max(1, 0.07 * u);
  ctx.strokeStyle = "#eef0fa";
  ctx.stroke();

  // Cuadrícula muy tenue (solo las líneas que se ven en pantalla, y solo si las casillas son grandes)
  if (u >= 9) {
    const g0 = clamp(Math.floor(-cam.ox / u), 1, N - 1), g1 = clamp(Math.ceil((cw - cam.ox) / u), 1, N - 1);
    const h0 = clamp(Math.floor(-cam.oy / (u * TILT)), 1, N - 1), h1 = clamp(Math.ceil((ch - cam.oy) / (u * TILT)), 1, N - 1);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100,108,160,.16)";
    ctx.beginPath();
    for (let i = g0; i <= g1; i++) { const a = P(i, 0), b = P(i, N); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    for (let i = h0; i <= h1; i++) { const a = P(0, i), b = P(N, i); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
    ctx.stroke();
  }

}

// Auto 2.5D (vista elevada e inclinada, como «Parking Jam»): la cuadrícula sigue siendo recta, pero cada auto es un volumen con altura:
// carrocería (con su pared visible hacia la cámara: costado con llantas y faros, frente con faros y parrilla, o parte de atrás con luces y placa),
// cabina de cristal con techo, y una flecha blanca sobre el techo. Todo se dibuja apilando rectángulos redondeados en el plano del suelo (base),
// así funciona con cualquier ángulo (los autos pueden estar en cualquier ángulo) y con la inclinación TILT; los detalles de las paredes
// (llantas, faros, parrilla) se dibujan en pantalla y solo cuando el auto está recto (se ve la pared de frente).
// c = el auto (largo 2 = coche, 3 = camión); pose = { cx, cy, dx, dy, alfa, z } (z = salto en casillas, para el rebote).
function pintarAuto(g, ds, c, ang, u, sx, sy, hz, alfa, det) {
  // g = contexto donde se pinta; ds = escala del contexto (dpr, o 1 si es un dibujo guardado); u = píxeles por casilla EN ESE contexto
  const K = TILT, bus = c.len >= 3;
  const L = (c.len - MARGEN_LARGO) * u, W = ANCHO_AUTO * u;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const col = (f, sat) => "hsl(" + c.tono + "," + (sat || 82) + "%," + Math.min(90, c.luz * f * OSCURECER).toFixed(1) + "%)";
  const CONTORNO = "#262033";
  const hb = ALTO_CARROCERIA * u, hc = ALTO_CABINA * u, hcaja = ALTO_CAJA * u;
  const base = (h, salta = true) => g.setTransform(ds * ca, ds * K * sa, -ds * sa, ds * K * ca, ds * sx, ds * (sy - h - (salta ? hz : 0)));
  const plano = (h = 0) => g.setTransform(ds, 0, 0, ds, ds * sx, ds * (sy - h - hz)); // sin giro: para dibujar paredes de frente (y = 0 es el centro del auto en el suelo)
  const pieza = (ox, oy, l, w, r, color) => { rr(ox - l / 2, oy - w / 2, l, w, r, g); g.fillStyle = color; g.fill(); };
  // Bloque: capas desde h0 hasta h1 (las paredes) y la tapa arriba
  const bloque = (h0, h1, ox, oy, l, w, r, lado, tapa, maxN = 40) => {
    const n = Math.max(1, Math.min(det === 2 ? maxN : 2, Math.ceil((h1 - h0) / 1.5)));
    for (let i = 0; i < n; i++) { base(h0 + ((h1 - h0) * i) / n); pieza(ox, oy, l, w, r, lado(n > 1 ? i / (n - 1) : 1)); }
    base(h1); pieza(ox, oy, l, w, r, tapa);
  };
  // Luz desde arriba a la izquierda de la PANTALLA: todos los autos se iluminan igual al girar
  const hx = (Math.abs(ca) * L + Math.abs(sa) * W) / 2, hy = (K * (Math.abs(sa) * L + Math.abs(ca) * W)) / 2;
  const aLocal = (vx, vy) => [ca * vx + sa * (vy / K), -sa * vx + ca * (vy / K)];
  const grad = (kx, ky, paradas) => {
    const p = aLocal(-hx * kx, -hy * ky), q = aLocal(hx * kx, hy * ky), gr = g.createLinearGradient(p[0], p[1], q[0], q[1]);
    paradas.forEach((s, i) => gr.addColorStop(i / (paradas.length - 1), s));
    return gr;
  };
  const degrade = (f0, f1, f2, sat) => grad(1, 1, [col(f0, sat), col(f1, sat), col(f2, sat)]);
  const cristal = (t) => "hsl(204," + (52 + 10 * t).toFixed(0) + "%," + (30 + 34 * t).toFixed(0) + "%)"; // pared de cristal: más oscura abajo, clara arriba
  const lado = (t) => col(0.5 + 0.25 * t, 78);
  g.globalAlpha = alfa;
  g.lineJoin = "round";

  // Altura del techo (donde va la flecha) y bloque de la cabina
  const techo = bus ? hb + hcaja : hb + hc;

  if (det === 0) { // de lejos: un bloque de color con contorno
    bloque(0, hb + (bus ? hcaja : hc) * 0.7, 0, 0, L, W, 0.2 * u, () => CONTORNO, bus ? "#eef0f6" : col(1.05));
    g.setTransform(ds, 0, 0, ds, 0, 0);
    g.globalAlpha = 1;
    return;
  }

  // Sombra en el suelo (no salta con el auto): un poco corrida hacia abajo-derecha, como si la luz viniera de arriba a la izquierda
  base(0, false); pieza(0.06 * u, 0.1 * u, L + 0.1 * u, W + 0.08 * u, 0.26 * u, "rgba(20,15,30,.28)");

  const o = 0.07 * u;       // grosor del contorno
  const hor = Math.abs(ca) > 0.98, ver = Math.abs(sa) > 0.98; // recto: se ve de frente una pared (el costado, o el frente/atrás)
  if (det === 2) {
    // Llantas que asoman a los lados de la carrocería (las de la pared que da a la cámara se dibujan después, encima)
    const xs = bus ? [-0.34 * L, 0.3 * L] : [-0.28 * L, 0.28 * L];
    for (const a of xs) for (const sg of [-1, 1]) bloque(0, 0.12 * u, a, sg * (W / 2 - 0.005 * u), 0.27 * u, 0.13 * u, 0.05 * u, () => "#15131c", "#2c2a36", 3);
    // Contorno oscuro grueso
    bloque(0.02 * u, hb, 0, 0, L + o, W + o, 0.26 * u, () => CONTORNO, CONTORNO);
  }

  // Carrocería (con su pared visible)
  bloque(0.02 * u, hb, 0, 0, L, W, 0.22 * u, lado, degrade(1.28, 1.05, 0.78));

  let ac, A, hw;   // centro, largo y semiancho de la flecha
  if (!bus) {
    if (det === 2) {
      base(hb);
      pieza(L * 0.31, 0, L * 0.27, W * 0.8, 0.12 * u, "rgba(255,255,255,.14)");   // cofre
      pieza(-L * 0.36, 0, L * 0.2, W * 0.76, 0.1 * u, "rgba(255,255,255,.08)");  // cajuela
    }
    // Cabina: paredes de cristal (parabrisas, luneta y ventanas) y techo con borde de color
    const cox = -0.05 * L, cl = 0.4 * L, cw = 0.8 * W, hv = hc * 0.82;
    bloque(hb, hb + hv, cox, 0, cl, cw, 0.1 * u, cristal, cristal(1), 12);
    bloque(hb + hv, techo, cox, 0, cl + 0.05 * u, cw + 0.05 * u, 0.12 * u, lado, degrade(1.42, 1.16, 0.94, 80), 6);
    ac = cox; A = 0.5 * L; hw = W * 0.31;
  } else {
    // Camión: cabina (color del auto, con cristal) al frente y caja blanca más alta atrás
    const bl = 0.68 * L, bc = -L / 2 + bl / 2 + 0.005 * u, cab = L - bl;
    const cox = L / 2 - cab * 0.55, cl = cab * 0.7, hv = hc * 1.1;
    bloque(hb, hb + hv * 0.8, cox, 0, cl, W * 0.82, 0.1 * u, cristal, cristal(1), 12);
    bloque(hb + hv * 0.8, hb + hv, cox, 0, cl + 0.05 * u, W * 0.82 + 0.05 * u, 0.1 * u, lado, degrade(1.42, 1.16, 0.94, 80), 4);
    const blanco = (f) => "hsl(" + c.tono + ",10%," + Math.min(94, 84 * f).toFixed(1) + "%)";
    if (det === 2) bloque(hb, techo, bc, 0, bl + o, W * 0.96 + o, 0.14 * u, () => CONTORNO, CONTORNO, 16);
    bloque(hb, techo, bc, 0, bl, W * 0.96, 0.12 * u, (t) => blanco(0.68 + 0.22 * t), grad(1, 1, [blanco(1.12), blanco(0.98), blanco(0.8)]), 16);
    if (det === 2) for (const f of [-0.17, 0.17]) { base(techo); pieza(bc + bl * f, 0, 0.02 * u, W * 0.88, 0.01 * u, "rgba(60,60,90,.18)"); } // juntas de la caja
    ac = bc; A = 0.62 * bl; hw = W * 0.31;
  }

  // Detalles de la pared que se ve de frente (solo con el auto recto y de cerca)
  if (det === 2 && (hor || ver)) {
    plano(0);
    if (hor) { // costado: llantas, puerta, faro delantero y luz trasera
      const yb = (K * W) / 2, fx = ca > 0 ? 1 : -1;      // yb = borde de abajo del auto en el suelo
      for (const a of bus ? [-0.34 * L, 0.3 * L] : [-0.28 * L, 0.28 * L]) {
        const x = a * fx;
        rr(x - 0.16 * u, yb - 0.17 * u, 0.32 * u, 0.22 * u, 0.09 * u, g); g.fillStyle = "#15131c"; g.fill();
        rr(x - 0.08 * u, yb - 0.1 * u, 0.16 * u, 0.12 * u, 0.05 * u, g); g.fillStyle = "#8d8a99"; g.fill();
      }
      const yl = yb - hb * 0.62;
      rr(fx * (L / 2 - 0.1 * u) - 0.06 * u, yl - 0.05 * u, 0.12 * u, 0.1 * u, 0.04 * u, g); g.fillStyle = CONTORNO; g.fill();
      rr(fx * (L / 2 - 0.1 * u) - 0.04 * u, yl - 0.035 * u, 0.08 * u, 0.07 * u, 0.03 * u, g); g.fillStyle = "#fff6b0"; g.fill();
      rr(-fx * (L / 2 - 0.08 * u) - 0.05 * u, yl - 0.05 * u, 0.1 * u, 0.1 * u, 0.03 * u, g); g.fillStyle = CONTORNO; g.fill();
      rr(-fx * (L / 2 - 0.08 * u) - 0.03 * u, yl - 0.03 * u, 0.06 * u, 0.06 * u, 0.02 * u, g); g.fillStyle = "#ff4d4d"; g.fill();
      if (!bus) { // línea de la puerta
        g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = Math.max(0.8, 0.02 * u);
        g.beginPath(); g.moveTo(-0.05 * L * fx, yb - hb * 0.92); g.lineTo(-0.05 * L * fx, yb - 0.04 * u); g.stroke();
      }
    } else if (sa > 0) { // frente: faros y parrilla
      const yb = (K * L) / 2, yl = yb - hb * 0.6;
      for (const sg of [-1, 1]) {
        rr(sg * W * 0.3 - 0.085 * u, yl - 0.065 * u, 0.17 * u, 0.13 * u, 0.05 * u, g); g.fillStyle = CONTORNO; g.fill();
        rr(sg * W * 0.3 - 0.06 * u, yl - 0.045 * u, 0.12 * u, 0.09 * u, 0.04 * u, g); g.fillStyle = "#fff6b0"; g.fill();
      }
      rr(-W * 0.17, yl - 0.045 * u, W * 0.34, 0.09 * u, 0.03 * u, g); g.fillStyle = "#2b2733"; g.fill();
    } else {             // parte de atrás: luces rojas y placa
      const yb = (K * L) / 2, yl = yb - hb * 0.6;
      for (const sg of [-1, 1]) {
        rr(sg * W * 0.33 - 0.08 * u, yl - 0.06 * u, 0.16 * u, 0.12 * u, 0.04 * u, g); g.fillStyle = CONTORNO; g.fill();
        rr(sg * W * 0.33 - 0.055 * u, yl - 0.04 * u, 0.11 * u, 0.08 * u, 0.03 * u, g); g.fillStyle = "#ff4d4d"; g.fill();
      }
      rr(-0.1 * u, yl - 0.04 * u, 0.2 * u, 0.08 * u, 0.02 * u, g); g.fillStyle = "#f4f1e6"; g.fill();
    }
    if (hor && !bus) { // montante central entre las ventanas (pared de cristal de la cabina)
      const fx = ca > 0 ? 1 : -1, yc = (K * 0.8 * W) / 2;
      g.strokeStyle = "rgba(30,25,45,.55)"; g.lineWidth = Math.max(1, 0.04 * u);
      g.beginPath(); g.moveTo(-0.05 * L * fx, yc - hb - hc * 0.82); g.lineTo(-0.05 * L * fx, yc - hb); g.stroke();
    }
  }

  // Flecha blanca con contorno oscuro grueso, apoyada en el techo (con sombrita)
  const sw = hw * 0.42, x0 = ac - A / 2, x1 = ac + A / 2, hbx = x1 - Math.min(A * 0.48, hw * 1.5);
  const flecha = (dy) => { g.beginPath();
    g.moveTo(x0, -sw + dy); g.lineTo(hbx, -sw + dy); g.lineTo(hbx, -hw + dy); g.lineTo(x1, dy);
    g.lineTo(hbx, hw + dy); g.lineTo(hbx, sw + dy); g.lineTo(x0, sw + dy); g.closePath(); };
  base(techo + 0.015 * u);
  flecha(0.04 * u); g.fillStyle = "rgba(0,0,0,.28)"; g.fill();
  flecha(0);
  g.fillStyle = "#fffdf6"; g.fill();
  g.lineWidth = Math.max(0.05 * u, 0.9); g.strokeStyle = CONTORNO; g.stroke();

  // Destello rojo cuando algo le estorba
  if (c.flash > 0) {
    const a = (0.6 * c.flash / 0.4).toFixed(2);
    bloque(0.02 * u, techo, 0, 0, L, W, 0.22 * u, () => "rgba(255,50,50," + (a * 0.6).toFixed(2) + ")", "rgba(255,50,50," + a + ")", 8);
  }
  g.setTransform(ds, 0, 0, ds, 0, 0);
  g.globalAlpha = 1;
}

// ----- Dibujos guardados de los autos (caché) -----
// Armar un auto pieza por pieza cuesta ~15 dibujos; con cientos de autos en pantalla eso era lo que hacía lento el juego.
// Ahora cada combinación (color, largo, dirección, nivel de zoom) se dibuja UNA vez en un lienzo pequeño y después se pega con drawImage.
// Los que están en destello rojo y los muy lejanos (det 0) se dibujan directo, como antes.
const PASO_ZOOM = 1.15;               // el zoom se redondea a potencias de esto (el dibujo guardado se estira como máximo ±7 %)
const MAX_PIXELES_CACHE = 14e6;       // tope de memoria de los dibujos guardados (~56 MB); si se pasa, se vacía y se vuelven a crear los que se usen
const cacheAutos = new Map();
let pixCache = 0;
function dibujoGuardado(c, dir, k) {
  const llave = c.tono + "|" + (46 + (((c.luz - 46) / 4) | 0) * 4) + "|" + c.len + "|" + dir + "|" + k;
  let sp = cacheAutos.get(llave);
  if (sp) return sp;
  const ds = dpr, U = Math.pow(PASO_ZOOM, k) * ds, ang = dir * Math.PI / 2;
  const ca = Math.abs(Math.cos(ang)), sa = Math.abs(Math.sin(ang));
  const L = (c.len - MARGEN_LARGO) * U, W = ANCHO_AUTO * U;
  const hx = (ca * L + sa * W) / 2 + 0.3 * U, gy = (TILT * (sa * L + ca * W)) / 2;
  const arriba = gy + (ALTO_CARROCERIA + (c.len >= 3 ? ALTO_CAJA : ALTO_CABINA)) * U + 0.3 * U, abajo = gy + 0.35 * U;
  const w = Math.ceil(2 * hx), h = Math.ceil(arriba + abajo);
  if (pixCache + w * h > MAX_PIXELES_CACHE) { cacheAutos.clear(); pixCache = 0; }
  const lienzo = document.createElement("canvas");
  lienzo.width = w; lienzo.height = h;
  const g = lienzo.getContext("2d");
  g.lineJoin = "round";
  const luzq = 46 + (((c.luz - 46) / 4) | 0) * 4;
  pintarAuto(g, 1, { tono: c.tono, luz: luzq, len: c.len, flash: 0 }, ang, U, w / 2, arriba, 0, 1, U >= PX_DETALLE * ds ? 2 : 1);
  sp = { cv: lienzo, w, h, ay: arriba, ds };
  cacheAutos.set(llave, sp);
  pixCache += w * h;
  return sp;
}

function dibujarAuto(c, pose) {
  const { cx, cy, dx, dy, alfa, z } = pose || poseDe(c);
  const u = CELL * cam.s;
  const sx = cam.ox + cx * u, sy = cam.oy + cy * u * TILT, hz = (z || 0) * u;
  const det = u >= PX_DETALLE ? 2 : u >= PX_MEDIO ? 1 : 0;
  const dir = dx > 0.9995 ? 0 : dy > 0.9995 ? 1 : dx < -0.9995 ? 2 : dy < -0.9995 ? 3 : -1; // -1 = en diagonal (ya no ocurre: los autos salen en línea recta)
  if (det === 0 || dir < 0 || c.flash > 0) { pintarAuto(ctx, dpr, c, Math.atan2(dy, dx), u, sx, sy, hz, alfa, det); return; }
  const k = Math.round(Math.log(u) / Math.log(PASO_ZOOM)), f = u / Math.pow(PASO_ZOOM, k);
  const sp = dibujoGuardado(c, dir, k);
  ctx.globalAlpha = alfa;
  ctx.drawImage(sp.cv, sx - (sp.w / 2 / sp.ds) * f, sy - hz - (sp.ay / sp.ds) * f, (sp.w / sp.ds) * f, (sp.h / sp.ds) * f);
  ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch); // transparente: detrás se ve el fondo de madera (compartido/fondo-madera.js)
  ctx.lineJoin = "round";
  dibujarSuelo();
  const u = CELL * cam.s;
  // Solo se dibujan los autos que caen dentro de la pantalla (con margen por su largo): al acercar un tablero de 50×50 son pocos
  const vis = [];
  for (const c of autos) {
    if (c.estado === 2) continue;
    const p = poseDe(c);
    const sx = cam.ox + p.cx * u, sy = cam.oy + p.cy * u * TILT, mg = (c.len + 1.5) * u;
    if (sx < -mg || sx > cw + mg || sy < -mg || sy > ch + mg) continue;
    vis.push({ c, p, k: p.cy + (Math.abs(p.dy) * (c.len - 0.14) + Math.abs(p.dx) * 0.8) / 2 }); // k = borde de abajo del auto
  }
  vis.sort((a, b) => a.k - b.k); // los de más arriba primero: el de abajo tapa la pared del de arriba
  for (const v of vis) dibujarAuto(v.c, v.p);
  if (modoBomba && puntoBomba) { // vista previa: los autos que se llevaría la bomba (en rojo) y la bomba en la casilla elegida
    ctx.fillStyle = "rgba(255,70,50,.38)"; ctx.strokeStyle = "rgba(255,110,70,.95)"; ctx.lineWidth = Math.max(1.5, 0.06 * u);
    for (const c of autosDeBomba(puntoBomba.x, puntoBomba.y)) for (const [cx, cy] of celdasDe(c)) {
      const [a, b] = P(cx, cy);
      rr(a + 0.04 * u, b + 0.04 * u * TILT, 0.92 * u, 0.92 * u * TILT, 0.14 * u);
      ctx.fill(); ctx.stroke();
    }
    const [bx, by] = P(puntoBomba.x + 0.5, puntoBomba.y + 0.5);
    ctx.beginPath(); ctx.ellipse(bx, by, 0.55 * u, 0.55 * u * TILT, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(20,20,24,.82)"; ctx.fill();
    ctx.lineWidth = Math.max(2, 0.08 * u); ctx.strokeStyle = "#ffd23a"; ctx.stroke();
    ctx.font = Math.round(0.8 * u) + "px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff"; ctx.fillText("💣", bx, by);
  }
  if (efectoBomba) { // explosión: una bola de fuego en cada auto eliminado y un anillo en el punto de la bomba; crecen y se desvanecen
    const f = efectoBomba.t / 0.5, g2 = 0.5 + (1 - f) * 0.9, e = efectoBomba;
    ctx.globalAlpha = f;
    ctx.fillStyle = "rgba(255,170,40,.85)";
    for (const q of e.autos) {
      const [ex, ey] = P(q.cx, q.cy);
      ctx.beginPath(); ctx.ellipse(ex, ey, g2 * u, g2 * u * TILT, 0, 0, Math.PI * 2); ctx.fill();
    }
    const [rx, ry] = P(e.x, e.y);
    ctx.beginPath(); ctx.ellipse(rx, ry, (1 + (1 - f) * 3) * u, (1 + (1 - f) * 3) * u * TILT, 0, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(2, 0.12 * u); ctx.strokeStyle = "rgba(255,230,120,.95)"; ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ----- Bucle -----
const firmaVista = () => [cam.s, cam.ox, cam.oy, cw, ch, dpr, escenaVer, restantes, modoBomba && puntoBomba ? puntoBomba.x + "," + puntoBomba.y : "-"].join("|");
function hayAnimacion() {
  if (efectoBomba) return true;
  for (const c of autos) if (c.estado === 1 || c.bump > 0 || c.flash > 0) return true;
  return false;
}
function actualizar(dt) {
  if (pausado) return; // ventana de pausa abierta: el reloj, los autos y las animaciones se congelan
  T += dt;
  if (efectoBomba) { efectoBomba.t -= dt; if (efectoBomba.t <= 0) efectoBomba = null; }
  for (const c of autos) {
    if (c.bump > 0) c.bump = Math.max(0, c.bump - dt);
    if (c.flash > 0) c.flash = Math.max(0, c.flash - dt);
    if (c.estado !== 1) continue;
    const t = (T - c.t0) * VEL;
    if (t >= c.tFin) {
      c.estado = 2;
      restantes--;
    }
  }
  if (!ganado && !perdido && restantes <= 0) victoria();
  if (movs !== ultMovs) { ultMovs = movs; const em = $("movs"); if (em) em.textContent = movs; }
  if (restantes !== ultAutos) { ultAutos = restantes; const ea = $("autos-txt"); if (ea) ea.textContent = Math.max(0, restantes); }
}

// Fin de nivel «sobre el tablero» (estándar en compartido/inmersivo.css, clase .sobre-tablero): la ventana con «Siguiente nivel ▶» se coloca
// encima del cuadro del tablero, recortado a la ventana; si casi no se ve (muy acercado o movido), ocupa toda la ventana. Sigue al tablero si se mueve la vista.
const ultColoc = {};
function colocarSobre(id) {
  const v = $(id);
  if (!v) return;
  if (v.hidden) { ultColoc[id] = ""; return; }
  const r = cv.getBoundingClientRect(), [x0, y0] = P(0, 0), [x1, y1] = P(N, N);
  let a = Math.max(0, x0), b = Math.max(0, y0), c = Math.min(cw, x1), d = Math.min(ch, y1);
  if (c - a < 200 || d - b < 200) { a = 0; b = 0; c = cw; d = ch; }
  const css = [r.left + a, r.top + b, c - a, d - b].map((n) => Math.round(n) + "px").join(" ");
  if (css === ultColoc[id]) return;
  ultColoc[id] = css;
  const m = css.split(" ");
  v.style.left = m[0]; v.style.top = m[1]; v.style.width = m[2]; v.style.height = m[3];
}
function colocarVictoria() { colocarSobre("victoria"); colocarSobre("derrota"); } // las dos ventanas «sobre el tablero»

// Modo libre: no da monedas ni puntos; solo cuenta el tablero resuelto de esta combinación (y quita de «Partidas guardadas» la que venías jugando)
function victoriaLibre() {
  const k = claveLibre(cfg.tam, cfg.dificultad);
  libre.ganados[k] = (libre.ganados[k] || 0) + 1;
  guardarLibre();
  if (partidaId) { quitarPartida(partidaId); partidaId = null; guardadaMovs = -1; }
  $("vtitulo").textContent = "¡Tablero resuelto!";
  $("vtexto").textContent = "Lo lograste en " + movs + " movimientos · " + libre.ganados[k] + " resueltos en " + cfg.tam + "×" + cfg.tam + " " + DIFS[cfg.dificultad].emoji + ". El Modo libre no da monedas ni puntos.";
  $("siguiente").hidden = false;
  $("victoria").hidden = false;
  colocarVictoria();
}
// Los botones de fin de nivel y de «sin corazones» cambian de texto en el Modo libre
function etiquetasFin() {
  const l = modo === "libre";
  $("siguiente").textContent = l ? "Otro tablero ▶" : "Siguiente nivel ▶";
  $("repetir").textContent = l ? "Repetir tablero" : "Repetir nivel";
  $("d-repetir").textContent = l ? "Reintentar tablero" : "Reintentar nivel";
  $("al-mapa-txt").textContent = l ? "Cambiar tablero" : "Mapa";
  $("d-mapa-txt").textContent = l ? "Cambiar tablero" : "Mapa";
  for (const id of ["al-mapa", "d-mapa"]) { const ic = $(id).querySelector(".b-ico"); if (ic) ic.textContent = l ? "⚙️" : "🗺️"; }
}

function victoria() {
  ganado = true;
  if (modo === "libre") { victoriaLibre(); return; }
  let txt = "Lo lograste en " + movs + " movimientos.";
  const mio = nivel;
  let pts = 0;
  if (nivel > prog.hecho) {
    // Monedas: igual que los puntos, solo la primera vez que se pasa el nivel (repetirlo no da monedas).
    // No se anotan aparte: salen de prog.hecho (ver monedas()), así que no se pueden duplicar al sincronizar.
    txt += " +" + cfg.premio + " monedas";
    // Los puntos del nivel se dan una sola vez: se anotan en la cola local (nunca se pierden) y se envían al haber sesión y conexión
    pts = 1; // 1 punto del portal por nivel pasado por primera vez (ESTANDARES-juegos.md, sección 12). Antes: 200 o 350 según la dificultad
    prog.hecho = mio;
    encolarNivel(ID_JUEGO);
    import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).then((faltan) => {
      // el ✓ solo sale si de verdad ya se enviaron
      if (faltan === 0 && ganado && nivel === mio && !$("victoria").hidden) $("vtexto").textContent = txt + " +1 punto ✓";
    }).catch(() => {});
  }
  prog.max = Math.max(prog.max, Math.min(TOTAL_NIVELES, nivel + 1));
  guardar();
  hudNiveles();
  pintarMonedas(); // ya con prog.hecho al día
  const ultimo = nivel >= TOTAL_NIVELES;
  $("vtitulo").textContent = ultimo ? "¡Terminaste los " + TOTAL_NIVELES.toLocaleString("es-MX") + " niveles! 🎉" : "¡Nivel " + nivel + " completado!";
  $("vtexto").textContent = txt + (pts ? " +1 punto" : "");
  $("siguiente").hidden = ultimo;
  $("victoria").hidden = false;
  colocarVictoria();
}

let tMsg = 0;
function aviso(t) {
  const m = $("msg");
  m.textContent = t;
  m.classList.add("ver");
  clearTimeout(tMsg);
  tMsg = setTimeout(() => m.classList.remove("ver"), 1600);
}

// Nombre del nivel en el botón verde de arriba (sin el tamaño del tablero; ESTANDARES-juegos.md, 13.6). El cambio de nivel se hace desde el mapa.
function pintarNombre() {
  const e = $("nombre-nivel");
  if (e) e.textContent = modo === "libre" ? "♾️ Modo libre " + DIFS[cfg.dificultad].emoji : "Nivel " + nivel;
}
const hudNiveles = pintarNombre;

// ----- Controles: tocar, arrastrar, pellizcar, rueda -----
const dedos = new Map();
let g = null;
const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

cv.addEventListener("pointerdown", (e) => {
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  dedos.set(e.pointerId, pos(e));
  g = { moved: dedos.size > 1, x0: pos(e).x, y0: pos(e).y };
});
cv.addEventListener("pointermove", (e) => {
  if (!dedos.has(e.pointerId)) return;
  const nuevo = pos(e), viejo = dedos.get(e.pointerId);
  if (dedos.size === 1) {
    if (!g.moved && Math.hypot(nuevo.x - g.x0, nuevo.y - g.y0) > 8) g.moved = true;
    dedos.set(e.pointerId, nuevo); // la vista es fija: arrastrar ya no mueve el tablero (solo cancela el toque)
  } else if (dedos.size === 2) {
    g.moved = true; // pellizcar ya no hace zoom
    dedos.set(e.pointerId, nuevo);
  }
});
function soltar(e) {
  if (!dedos.has(e.pointerId)) return;
  const eraUno = dedos.size === 1;
  dedos.delete(e.pointerId);
  if (eraUno && g && !g.moved && e.type === "pointerup" && !pausado) {
    const p = pos(e);
    if (modoBomba) { tocarBomba(p); return; }
    const [gx, gy] = suelo(p.x, p.y, ALTO_TOQUE); // se toca el auto, que se ve levantado del suelo
    const x = Math.floor(gx), y = Math.floor(gy);
    if (x >= 0 && y >= 0 && x < N && y < N) {
      const id = occ[y * N + x];
      if (id !== -1) tocarAuto(autos[id]);
    }
  }
}
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
cv.addEventListener("wheel", (e) => e.preventDefault(), { passive: false }); // sin zoom con la rueda

$("repetir").addEventListener("click", repetirTablero);
$("d-repetir").addEventListener("click", repetirTablero);
$("d-vida").addEventListener("click", () => comprarVida());
$("d-mapa").addEventListener("click", () => { if (modo === "libre") mostrar("pantalla-libre"); else abrirMapa(nivel, false); });
// «Mapa» al ganar: abre la botella del país del nivel para VER SUBIR el agua (un poco con cada nivel; llena al pasar los 20)
$("al-mapa").addEventListener("click", () => { $("victoria").hidden = true; if (modo === "libre") mostrar("pantalla-libre"); else abrirMapa(nivel, true); });
$("siguiente").addEventListener("click", () => { if (modo === "libre") jugarLibre(); else cargarNivel(Math.min(TOTAL_NIVELES, nivel + 1)); });
function repetirTablero() { if (modo === "libre") cargarLibre(cfg.tam, cfg.dificultad, cfg.seed); else cargarNivel(nivel); } // el mismo tablero otra vez
addEventListener("resize", () => {
  redim();
  ajustarCamara(); // la vista es fija: siempre se vuelve a encuadrar al cambiar el tamaño o girar el celular
});

// ----- Pantallas, botón ☰ y menú de pausa (ESTANDARES-juegos.md, 13.1 y 13.3) -----
// Pantallas: «pantalla-inicio» (una sola vez, al abrir), «pantalla-libre» (opciones del Modo libre), «juego» (el tablero) y el mapa (encima de todo: es el menú principal).
// ☰: oculto en la pantalla de inicio y en la vista principal del mapa; «Atrás» en las vistas internas del mapa; «Volver al menú principal» en un nivel y en las opciones del
// Modo libre; «Pausa» en una partida del Modo libre.
const btnMenu = $("btn-menu");
let mapaEnPrincipal = true; // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve
function pintarBotonMenu() {
  const enMapa = mapa.abierto();
  btnMenu.hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);
  const texto = enMapa ? "Atrás" : !$("escena").hidden && modo === "libre" ? "Pausa" : "Volver al menú principal";
  btnMenu.innerHTML = '<span class="b-ico">☰</span>'; // cuadrado, solo icono: el texto va en title y aria-label
  btnMenu.title = texto; btnMenu.setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  const enJuego = nombre === "juego";
  for (const p of ["pantalla-inicio", "pantalla-libre"]) $(p).hidden = p !== nombre;
  for (const id of ["escena", "cuadros", "boosts", "barra-nivel"]) $(id).hidden = !enJuego;
  if (!enJuego) { $("victoria").hidden = true; $("derrota").hidden = true; pausado = false; salirModoQuitar(); salirModoBomba(); }
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  $("btn-mapa-juego").hidden = modo === "libre"; // el 🗺️ solo en los niveles (el Modo libre no tiene mapa)
  ubicarMonedas();
  pintarBotonMenu();
  pintarMonedas();
  if (enJuego) { redim(); ajustarCamara(); escenaVer++; } // el lienzo pasó de oculto a visible: su tamaño cambió
  if (nombre === "pantalla-libre") pintarLibre();
}
// ----- Ventana «Info»: cómo se juega (usa los estilos .pausa-* de compartido/inmersivo.css) -----
const TEXTO_INFO = [
  ["🚗 Objetivo", "Saca todos los autos del estacionamiento. Ganas cuando no queda ninguno."],
  ["👆 Cómo sacar un auto", "Toca un auto y avanzará hacia donde apunta su flecha en línea recta hasta salir del tablero."],
  ["🚧 Si algo le estorba", "Un auto no puede salir si otro está en su camino: saca primero al que estorba. Si lo tocas con algo enfrente, pierdes un corazón. En cuanto tocas un auto, ya no estorba: puedes tocar los demás de inmediato."],
  ["❤️ Corazones", "Cada nivel trae corazones: " + DIFICULTADES[1].corazones + " en los medios y " + DIFICULTADES[2].corazones + " en los difíciles. Si tocas un auto que tiene otro enfrente, pierdes uno. Si se acaban, pierdes el nivel (puedes seguir con una vida extra o reintentar)."],
  ["💰 Monedas", "Ganas monedas la primera vez que terminas un nivel: " + DIFICULTADES[1].premio + " en los medios y " + DIFICULTADES[2].premio + " en los difíciles."],
  ["💥 Boosts", "Quitar un auto (30 monedas): toca el botón y luego el auto que quieres quitar. Paquete ×3 (50 monedas): te da 3 usos de quitar un auto. Bomba (100 monedas): toca un lugar, mira los 8 autos marcados en rojo y toca otra vez para soltarla: desaparecen. Vida extra (30 monedas): +3 corazones."],
  ["♾️ Modo libre", "Tableros al azar sin fin, de 5×5 a 10×10, medios o difíciles. No da monedas ni puntos, pero puedes guardar la partida y usar tus boosts."],
  ["🗺️ Mapa", "Los niveles se desbloquean en orden. Cada país tiene 20 niveles; al terminarlo se desbloquea el siguiente y el agua de su silueta sube con cada nivel que pasas. Con 🔄 reinicias el nivel y con ☰ Pausa puedes salir al mapa."],
];
let infoAbierta = null;
function abrirInfo() {
  if (infoAbierta) return;
  const fondo = document.createElement("div");
  fondo.className = "pausa-fondo";
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Cómo jugar");
  const panel = document.createElement("div");
  panel.className = "pausa-panel";
  panel.style.cssText = "width:min(100%,440px);text-align:left";
  const h2 = document.createElement("h2");
  h2.textContent = "ℹ️ Cómo jugar";
  h2.style.textAlign = "center";
  panel.appendChild(h2);
  for (const [titulo, texto] of TEXTO_INFO) {
    const b = document.createElement("b"); b.textContent = titulo; b.style.cssText = "display:block;margin:10px 0 2px";
    const p = document.createElement("p"); p.textContent = texto; p.style.cssText = "margin:0;font-size:.9rem;line-height:1.35;color:#d8dbe2";
    panel.append(b, p);
  }
  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "b3d txt b-verde"; ok.style.cssText = "display:flex;width:100%;margin:16px 0 4px";
  ok.innerHTML = '<span class="b-ico">👍</span> Entendido';
  panel.appendChild(ok);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  const cerrar = () => { removeEventListener("keydown", tecla, true); fondo.remove(); infoAbierta = null; };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  addEventListener("keydown", tecla, true);
  ok.addEventListener("click", cerrar);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  infoAbierta = fondo;
  try { ok.focus({ preventScroll: true }); } catch (e) {}
}

const ETAPAS = crearEtapas({ porEtapa: NIVELES_POR_ETAPA, soloPaises: true }); // 195 países × 20 niveles (México primero)
const mapa = montarMapa({
  prefijo: "estacionamiento-paises",   // claves propias del mapa: no se mezclan con el agua guardada por el mapa de estados anterior
  etapas: ETAPAS,
  unPais: true,                        // la vista principal es la botella del país donde va el jugador; 🗂️ Niveles = sus 20 niveles; 🗺️ Mapa = el mundo
  columnas: 4,
  progreso: () => prog,
  // Cada botón de nivel: color por dificultad (verde = medio, azul = difícil) y debajo el tamaño del tablero
  infoNivel: (n) => {
    const c = configNivel(n);
    return { sub: c.tam + "×" + c.tam, clase: c.dificultad === 1 ? "b-verde" : "b-azul", aria: "Nivel " + c.k + ": tablero " + c.tam + " por " + c.tam + ", " + c.premio + " monedas" };
  },
  leyenda: "El color indica la dificultad: 🟩 medio (" + DIFICULTADES[1].premio + " monedas, " + DIFICULTADES[1].corazones + " ❤️) · 🟦 difícil (" + DIFICULTADES[2].premio + " monedas, " + DIFICULTADES[2].corazones + " ❤️). El número chico es el tamaño del tablero.",
  alInfo: abrirInfo,
  etiquetaContinuar: () => (prog.hecho === 0 ? "▶ Jugar" : "▶ Continuar"), // el botón del centro del país dice «Jugar» mientras no se haya pasado ningún nivel
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],
  jugarNivel: (n) => jugarNivel(n),
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); }, // el ☰ se rotula según la vista
});
// n = nivel cuya etapa (país) se abre (por defecto, el que toca); alcanzado = true: se ve SUBIR el agua
function abrirMapa(n, alcanzado) { mostrar("pantalla-niveles"); mapa.abrir(n || Math.min(TOTAL_NIVELES, prog.hecho + 1), !!alcanzado); }
function jugarNivel(n) {
  if (!(n >= 1 && n <= TOTAL_NIVELES) || n > prog.hecho + 1) return; // los niveles se abren en orden
  modo = "nivel"; mostrar("juego"); cargarNivel(n);
}
function jugarLibre() {
  modo = "libre"; mostrar("juego");
  cargarLibre(libre.tam, libre.dif, (Math.random() * 4294967296) >>> 0); // semilla al azar: un tablero nuevo cada vez
}
// ----- Ventana de pausa: botón verde del nombre del nivel, 🗺️ y ☰ (en una partida del Modo libre) -----
// Mientras está abierta todo se congela (pausado: los autos, las animaciones y los toques). Niveles: «Seguir jugando» · «Salir al mapa» (se pierde lo avanzado).
// Modo libre: «Seguir jugando» · «💾 Guardar partida» · «Salir a elegir tablero».
function reanudarJuego() { pausado = false; }
function alAbrirPausa() { pausado = true; }
const pausaSalir = crearMenuPausa({ // niveles
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este tablero.",
  puedeAbrir: () => !$("escena").hidden && modo !== "libre",
  alAbrir: alAbrirPausa,
  alContinuar: reanudarJuego,
  alSalir: () => { pausado = false; abrirMapa(nivel, false); },
});
const pausaLibre = crearMenuPausa({ // Modo libre (con «Guardar partida»)
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: () => (ganado || movs === 0 ? "" : movs !== guardadaMovs ? "Se pierde lo avanzado en este tablero. Si quieres conservarlo, usa «Guardar partida»." : "Tu partida está guardada."),
  puedeAbrir: () => !$("escena").hidden && modo === "libre",
  alAbrir: alAbrirPausa,
  alContinuar: reanudarJuego,
  extras: () => (ganado || perdido ? [] : [{
    icono: "💾", texto: "Guardar partida", clase: "b-oro",
    ayuda: partidaId ? "Actualiza la partida que ya habías guardado." : leerPartidas().length + " de " + MAX_PARTIDAS + " partidas guardadas.",
    alElegir: accionGuardar,
  }]),
  alSalir: () => { pausado = false; mostrar("pantalla-libre"); },
});
$("barra-juego").addEventListener("click", () => (modo === "libre" ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir()); // 🗺️: pregunta «¿Salir?» y, si se confirma, abre el mapa

// ----- Modo libre (ESTANDARES-juegos.md, 7.2 y 13.7): tableros al azar sin fin. NO da monedas ni puntos: solo cuenta los tableros resueltos de cada combinación -----
// Se recuerda la última dificultad y tablero elegidos en el dispositivo (y en la cuenta, con la regla «el mayor de cada marca»).
let libre = { dif: 1, tam: 10, ganados: {} };
function limpiarLibre(o) {
  if (!o || typeof o !== "object") return null;
  const g = {};
  for (const k in o.ganados || {}) { const v = Math.floor(Number(o.ganados[k])); if (/^\d+-[12]$/.test(k) && v > 0) g[k] = v; }
  return { dif: DIFS[o.dif] ? o.dif : 1, tam: TAMS_LIBRE.includes(o.tam) ? o.tam : 10, ganados: g };
}
try { libre = limpiarLibre(JSON.parse(localStorage.getItem(CLAVE_LIBRE))) || libre; } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ v: 1, dif: libre.dif, tam: libre.tam, ganados: libre.ganados })); } catch (e) {} if (nubeLibre) nubeLibre.guardado(); };
const claveLibre = (tam, dif) => tam + "-" + dif;
// Unir dos Modos libres (para progreso.js → «fusionar»): de cada combinación gana el mayor número de tableros resueltos; la dificultad y el tablero elegidos son los de este dispositivo
function unirLibre(a, b) {
  const x = limpiarLibre(a), y = limpiarLibre(b);
  if (!x && !y) return null;
  const g = { ...(y ? y.ganados : {}) };
  for (const k in x ? x.ganados : {}) g[k] = Math.max(x.ganados[k], g[k] || 0);
  const base = x || y;
  return { v: 1, dif: base.dif, tam: base.tam, ganados: g };
}
function pintarLibre() {
  pintarCuentaGuardadas();
  const df = $("dif-fila"), tf = $("tam-fila");
  df.replaceChildren(); tf.replaceChildren();
  for (const d of [1, 2]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (d === libre.dif ? "b-oro on" : "b-cielo");
    b.innerHTML = '<span class="b-ico">' + DIFS[d].emoji + "</span>";
    b.title = DIFS[d].nombre; b.setAttribute("aria-label", DIFS[d].nombre); b.setAttribute("aria-pressed", String(d === libre.dif));
    b.addEventListener("click", () => { libre.dif = d; guardarLibre(); pintarLibre(); });
    df.appendChild(b);
  }
  $("dif-nombre").textContent = DIFS[libre.dif].emoji + " " + DIFS[libre.dif].nombre + " · " + DIFS[libre.dif].nota;
  for (const m of TAMS_LIBRE) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (m === libre.tam ? "b-oro on" : "b-cielo");
    b.textContent = m + "×" + m;
    b.setAttribute("aria-label", "Tablero " + m + " por " + m); b.setAttribute("aria-pressed", String(m === libre.tam));
    b.addEventListener("click", () => { libre.tam = m; guardarLibre(); pintarLibre(); });
    tf.appendChild(b);
  }
  $("nota-libre").textContent = "Ganar aquí no da monedas ni puntos al perfil: solo cuenta tus tableros resueltos. Los boosts sí gastan tus monedas.";
  const r = libre.ganados[claveLibre(libre.tam, libre.dif)];
  $("libre-record").textContent = r ? "🏆 " + r + (r === 1 ? " resuelto" : " resueltos") + " en " + libre.tam + "×" + libre.tam + " " + DIFS[libre.dif].emoji : "🏆 Aún sin resolver en esta combinación";
}

// ----- Partidas guardadas del Modo libre (hasta 20, en este dispositivo) -----
// Clave «_v1»: entra sola en la copia de seguridad de compartido/almacen.js. Se guarda { v: 1, t: última modificación, partidas: [...] }; no se sube a la cuenta.
// Cada partida: { id, g (fecha), tam, dif, seed, q (números de los autos que ya salieron o se quitaron), v (corazones), mov }. El tablero se vuelve a generar con la misma
// semilla, así que basta anotar qué autos ya no están. Lo que se lee se valida (una copia de seguridad es un archivo de la persona).
const MAX_PARTIDAS = 20;
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function partidaValida(p) {
  if (!p || typeof p !== "object") return null;
  const tam = Math.floor(Number(p.tam)), dif = Math.floor(Number(p.dif)), seed = Math.floor(Number(p.seed)), v = Math.floor(Number(p.v)), mov = Math.floor(Number(p.mov));
  if (!TAMS_LIBRE.includes(tam) || !DIFS[dif] || !(seed >= 0 && seed < 4294967296) || !(v >= 1 && v <= VIDAS_TOPE) || !(mov >= 0)) return null;
  if (!Array.isArray(p.q) || p.q.length >= tam * tam) return null;
  const q = [...new Set(p.q.map(Number))];
  if (!q.every((x) => Number.isInteger(x) && x >= 0 && x < tam * tam)) return null;
  return { id: String(p.id || "").slice(0, 40) || nuevoId(), g: Number(p.g) || 0, tam, dif, seed, q, v, mov };
}
function leerPartidas() {
  const r = [], ids = new Set();
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_PARTIDAS));
    for (const x of o && Array.isArray(o.partidas) ? o.partidas : []) {
      const p = partidaValida(x);
      if (p && !ids.has(p.id) && r.length < MAX_PARTIDAS) { ids.add(p.id); r.push(p); }
    }
  } catch (e) {}
  return r;
}
function escribirPartidas(l) {
  try { localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify({ v: 1, t: Date.now(), partidas: l })); return true; } catch (e) { return false; }
}
function pintarCuentaGuardadas() { $("cuenta-guardadas").textContent = "(" + leerPartidas().length + "/" + MAX_PARTIDAS + ")"; }
function quitarPartida(id) {
  const l = leerPartidas(), r = l.filter((x) => x.id !== id);
  if (r.length === l.length) return false;
  escribirPartidas(r); pintarCuentaGuardadas();
  return true;
}
// Guarda la partida en curso (se llama con la pausa puesta: nada se mueve). Si ya venía de la lista (o ya se guardó antes), la actualiza; con «reemplazarId» pisa esa otra.
// Devuelve «ok», «llena» (ya hay 20 y esta es nueva) o «error» (el dispositivo no deja escribir).
function guardarPartida(reemplazarId) {
  const l = leerPartidas();
  const p = { id: partidaId || nuevoId(), g: Date.now(), tam: cfg.tam, dif: cfg.dificultad, seed: cfg.seed, q: autos.filter((a) => a.estado !== 0).map((a) => a.id), v: vidas, mov: movs };
  const i = l.findIndex((x) => x.id === (reemplazarId || partidaId));
  if (i >= 0) { p.id = l[i].id; l[i] = p; }
  else if (l.length >= MAX_PARTIDAS) return "llena";
  else l.push(p);
  if (!escribirPartidas(l)) return "error";
  partidaId = p.id; guardadaMovs = p.mov;
  pintarCuentaGuardadas();
  return "ok";
}
function avisoGuardado(r) {
  aviso(r === "ok" ? "💾 Partida guardada (" + leerPartidas().length + " de " + MAX_PARTIDAS + ")" : "No se pudo guardar: el almacenamiento del dispositivo está lleno o bloqueado.");
}
function accionGuardar() { // «💾 Guardar partida» de la pausa (la pausa sigue puesta hasta que se reanuda)
  const r = guardarPartida();
  if (r === "llena") { abrirPartidas("guardar"); return; }
  reanudarJuego();
  avisoGuardado(r);
}
function jugarGuardada(p) {
  libre.tam = p.tam; libre.dif = p.dif; guardarLibre();
  modo = "libre"; mostrar("juego");
  cargarLibre(p.tam, p.dif, p.seed, p);
}
// Ventana de la lista. para = «cargar» (desde el Modo libre: tocar una la continúa) o «guardar» (ya hay 20: tocar una la reemplaza con la partida en curso;
// al borrar una se guarda ahí mismo). Se cierra con Cerrar, tocando fuera o con Esc; si venía de la pausa, el juego se reanuda.
let listaAbierta = false;
function abrirPartidas(para) {
  if (listaAbierta) return;
  listaAbierta = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Partidas guardadas");
  const panel = el("div", "pausa-panel pg-panel");
  const nota = el("p", "pg-nota"), lista = el("div", "pg-lista"), pie = el("div", "pausa-opciones");
  const cerrarB = el("button", "b3d txt b-cielo"); cerrarB.type = "button"; cerrarB.appendChild(el("span", "", para === "guardar" ? "Cancelar" : "Cerrar"));
  pie.appendChild(cerrarB);
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(true); } }; // en captura: la pausa no debe abrirse encima
  function cerrar(reanudar) {
    fondo.remove(); removeEventListener("keydown", tecla, true); listaAbierta = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
    if (para === "guardar" && reanudar) reanudarJuego();
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(true); });
  cerrarB.addEventListener("click", () => cerrar(true));

  function fila(p) {
    const f = el("div", "pg-fila");
    const b = el("button", "b3d txt pg-main " + (para === "guardar" ? "b-oro" : "b-cielo")); b.type = "button";
    const l1 = p.tam + "×" + p.tam + " " + DIFS[p.dif].emoji + " · " + p.mov + " mov. · " + p.v + " ❤️";
    const l2 = new Date(p.g).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const tx = el("span", "pg-texto"); tx.append(el("b", "", l1), el("small", "", l2));
    b.append(el("span", "b-ico", para === "guardar" ? "♻️" : "▶"), tx);
    b.setAttribute("aria-label", (para === "guardar" ? "Reemplazar con la partida actual: " : "Continuar: ") + l1 + ", " + l2);
    b.addEventListener("click", () => {
      if (para === "guardar") { const r = guardarPartida(p.id); cerrar(true); avisoGuardado(r); }
      else { cerrar(false); jugarGuardada(p); }
    });
    const x = el("button", "b3d txt b-rojo pg-borrar"); x.type = "button";
    const xt = el("span", "", "🗑️"); x.appendChild(xt);
    x.title = "Borrar esta partida"; x.setAttribute("aria-label", "Borrar esta partida");
    x.addEventListener("click", () => {
      if (!x.dataset.seguro) { // primer toque: pide confirmar (sin confirm())
        x.dataset.seguro = "1"; xt.textContent = "¿Borrar?";
        setTimeout(() => { delete x.dataset.seguro; xt.textContent = "🗑️"; }, 3000);
        return;
      }
      quitarPartida(p.id);
      if (p.id === partidaId) guardadaMovs = -1; // la que se está jugando ya no está en la lista
      if (para === "guardar") { const r = guardarPartida(); cerrar(true); avisoGuardado(r); return; } // ya hay lugar: se guarda ahí mismo
      pintar();
    });
    f.append(b, x);
    return f;
  }
  function pintar() {
    const l = leerPartidas().sort((a, b) => b.g - a.g);
    nota.textContent = para === "guardar"
      ? "Ya tienes " + MAX_PARTIDAS + " partidas guardadas. Toca una para reemplazarla con la partida actual, o bórrala y la actual se guarda en su lugar."
      : l.length ? l.length + " de " + MAX_PARTIDAS + " partidas. Toca una para seguir jugándola."
      : "Todavía no hay partidas guardadas. Mientras juegas en Modo libre toca ☰ y «Guardar partida» (hasta " + MAX_PARTIDAS + ").";
    lista.replaceChildren(...l.map(fila));
    pintarCuentaGuardadas();
  }
  panel.append(el("h2", "", "💾 Partidas guardadas"), nota, lista, pie);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  pintar();
  try { (lista.querySelector("button") || cerrarB).focus({ preventScroll: true }); } catch (e) {}
}

// ----- BORRAR TODO EL HISTORIAL (solo para pruebas: ver MOSTRAR_BORRAR_HISTORIAL, que debe quedar en false) -----
// Borra en este dispositivo el progreso, la cartera de monedas, el Modo libre y las partidas guardadas, quita de la cola los puntos pendientes de este juego y, con sesión,
// deja vacíos los tres documentos de la cuenta (si no, la sincronización los volvería a traer). NO toca los puntos que el perfil del portal ya recibió.
// Devuelve true (también se borró en la cuenta), false (no se pudo borrar en la cuenta) o null (no había sesión).
async function borrarHistorial() {
  reiniciando = true;
  prog = { max: 1, hecho: 0 }; cartera = normalizar(null); libre = { dif: 1, tam: 10, ganados: {} };
  try { for (const k of [CLAVE, CLAVE_CARTERA, CLAVE_LIBRE, CLAVE_PARTIDAS, CLAVE_MONEDAS_VIEJA]) localStorage.removeItem(k); } catch (e) {}
  try { guardarCola(leerCola().filter((e) => e.j !== ID_JUEGO)); } catch (e) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const vacios = [[ID_JUEGO, { max: 1, hecho: 0 }], [ID_CARTERA, normalizar(null)], [ID_LIBRE, { v: 1, dif: 1, tam: 10, ganados: {} }]];
    const subir = Promise.all(vacios.map(([id, v]) => setDoc(doc(db, "progreso", auth.currentUser.uid, "juegos", id), { datos: JSON.stringify(v), actualizado: serverTimestamp() })));
    await Promise.race([subir, new Promise((_, no) => setTimeout(() => no(new Error("lento")), 8000))]);
    return true;
  } catch (e) { console.warn("borrar historial (nube):", e.code || e.message); return false; }
}

// ----- ⚙️ Ajustes (desde la pantalla de inicio; ESTANDARES-juegos.md, 13.8): madera clara/oscura, copia de seguridad y, mientras duren las pruebas, borrar el historial -----
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
  // 🌙/☀️ Madera clara u oscura (el botón flotante está oculto con data-madera-boton="oculto")
  const bMadera = boton("🌙", "Madera oscura", "b-azul", async () => {
    try { const m = await import("../compartido/fondo-madera.js"); m.alternarMadera(); etiquetaMadera(m.maderaOscura()); } catch (e) { decir("No se pudo cambiar la madera."); }
  });
  const etiquetaMadera = (oscura) => { bMadera.firstChild.textContent = oscura ? "☀️" : "🌙"; bMadera.lastChild.textContent = oscura ? "Madera clara" : "Madera oscura"; };
  import("../compartido/fondo-madera.js").then((m) => etiquetaMadera(m.maderaOscura())).catch(() => {});
  // 💾 Copia de seguridad (compartido/almacen.js): descarga o restaura el progreso de los juegos de este dispositivo
  boton("💾", "Copia de seguridad", "b-oro", () => {
    cerrar();
    import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => aviso("No se pudo abrir la copia de seguridad."));
  });
  if (MOSTRAR_BORRAR_HISTORIAL) {
    const TXT = "Borrar todo el historial y reiniciar";
    const borrar = boton("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) { // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        decir("Se borran los niveles, monedas, Modo libre y partidas guardadas (en este dispositivo y en tu cuenta). Es solo para pruebas.");
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
  const cerrarB = boton("", "Cerrar", "b-cielo", () => cerrar());
  cerrarB.firstChild.remove();
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

// ----- Botones de las pantallas -----
// Pantalla de inicio (solo al abrir): Jugar = el nivel que toca · Modo libre · Mapa · Ajustes.
// Primera vez (ningún nivel pasado): «Jugar» no abre el nivel 1 directo, abre el mapa de México (con ▶ Jugar en su centro). Después, sigue en el nivel que toca.
$("btn-inicio-jugar").addEventListener("click", () => { if (prog.hecho === 0) abrirMapa(1); else jugarNivel(Math.min(TOTAL_NIVELES, prog.hecho + 1)); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", abrirAjustes);
$("btn-libre-jugar").addEventListener("click", jugarLibre);
$("btn-libre-guardadas").addEventListener("click", () => abrirPartidas("cargar"));
// ☰: dentro de una vista del mapa (Mapa, Niveles) vuelve «Atrás» a su vista principal; en una partida del Modo libre abre la pausa; en un nivel pregunta «¿Salir?»;
// en las opciones del Modo libre vuelve al menú principal (el mapa).
btnMenu.addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else if (!$("escena").hidden && modo === "libre") pausaLibre.abrir();
  else if (!$("escena").hidden) pausaSalir.abrir();
  else abrirMapa();
});

// ----- Inicio -----
redim();
cargarNivel(clamp(prog.max, 1, TOTAL_NIVELES)); // deja un tablero listo detrás (no se ve hasta que se juega)
mostrar("pantalla-inicio"); // única vez que se ve: al abrir el juego
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  actualizar(dt);
  colocarVictoria(); // si la ventana de fin de nivel está abierta, sigue al tablero
  if (mapa.abierto() || $("escena").hidden) firmaPrev = ""; // con el mapa o las pantallas de menú encima no se dibuja; al volver se redibuja
  else {
    // El tablero solo se redibuja si cambió la vista (cámara, tamaño, bomba, autos que quedan, nivel nuevo) o si algo se está moviendo.
    // Con el tablero quieto no se gasta CPU ni batería. Un cuadro extra al terminar cada animación deja la imagen final.
    const f = firmaVista(), anima = hayAnimacion();
    if (anima || animPrev || f !== firmaPrev) dibujar();
    firmaPrev = f; animPrev = anima;
  }
  requestAnimationFrame(bucle);
}
requestAnimationFrame(bucle);

// ----- Sincronizar con la cuenta (al final, tras cargar el progreso local) -----
// prog = { max, hecho }: se queda con el mayor de cada uno (unirMaximos)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID_JUEGO, {
    clave: CLAVE,
    fusionar: (a, b) => (reiniciando ? null : m.unirMaximos(a, b)),
    alCambiar: (v) => {
      prog.max = Number(v.max) || 1; prog.hecho = Number(v.hecho) || 0;
      normalizarProg();
      hudNiveles(); // repinta el rótulo con lo que trajo la nube
      pintarMonedas(); pintarBoosts(); // las monedas ganadas dependen de prog.hecho
      mapa.refrescar(); // y el mapa, por si está abierto
    },
  });
  // Monedas y usos de «quitar un auto»: documento aparte con su propia regla de fusión (unirCartera)
  nubeCartera = m.conectar(ID_CARTERA, {
    clave: CLAVE_CARTERA,
    fusionar: (a, b) => (reiniciando ? null : unirCartera(a, b)),
    alCambiar: (v) => { cartera = normalizar(v); pintarMonedas(); pintarBoosts(); },
  });
  // Modo libre (dificultad y tablero elegidos + tableros resueltos): documento aparte
  nubeLibre = m.conectar(ID_LIBRE, {
    clave: CLAVE_LIBRE,
    fusionar: (a, b) => (reiniciando ? null : unirLibre(a, b)),
    alCambiar: (v) => { const l = limpiarLibre(v); if (l) { libre = l; if (!$("pantalla-libre").hidden) pintarLibre(); } },
  });
}).catch(() => {});

// ----- Sesión (opcional: si Firebase no carga, el juego igual funciona) -----
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => { $("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"; })
).catch(() => {});
