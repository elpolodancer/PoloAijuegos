// Ruta: agario/juego-agario.js
// «Agario»: tú y un montón de bots en un mapa enorme. Come puntitos y células más pequeñas para crecer; si te toca una mucho más grande, te come.
// Se puede instalar SOLO este juego (sw-agario.js + manifest-agario.webmanifest, ⚙️ Ajustes). Inicio con mapa (ESTANDARES-juegos.md, sección 13): pantalla de inicio (una vez) → mapa de 195 países × 20 niveles (los niveles todavía no están creados: 🚧) · ♾️ Modo libre (la partida de siempre, con 5 dificultades).
// Los ajustes del juego están aquí arriba; el código del inicio, el mapa, la pausa y Ajustes está al final del archivo.

const ID = "agario";

// ---------- AJUSTES ----------
const MUNDO = 6000;              // el mapa mide MUNDO x MUNDO (en píxeles del juego)
const NUM_BOTS = 45;             // bots que juegan solos en dificultad «Normal» (las otras dificultades: ver DIFICULTADES más abajo)
const NUM_COMIDA = 2600;         // puntitos de comida repartidos por el mapa
const MASA_INICIAL = 10;         // masa con la que empiezas
const MASA_COMIDA = 1;           // masa que da cada puntito
const MASA_MIN_DIVIDIR = 36;     // una célula necesita al menos esto para poder dividirse
const MAX_CELDAS = 16;           // máximo de pedazos tuyos al mismo tiempo
const TIEMPO_FUSION = 12;        // segundos para que tus pedazos se puedan volver a juntar
const VEL_BASE = 280;            // velocidad = VEL_BASE * masa^-0.25 (px por segundo): más grande = más lento
const VEL_BOTS = 0.96;           // los bots van un poco más lentos que tú (1 = igual)
const IMPULSO_DIVISION = 520;    // «empujón» al dividirte
const FACTOR_COMER = 1.25;       // para comerte a otra célula debes tener 25 % más de masa
const PERDIDA_MASA = 0.002;      // las células grandes pierden este porcentaje de masa por segundo
const CASILLA = 300;             // tamaño de las casillas para buscar comida rápido (no hace falta tocarlo)
const PUNTOS_POR_MASA = 10;      // 1 punto del portal por cada 10 de masa máxima (menos el primero)

// --- Bots: cuánto persiguen y cuándo se dividen ---
const ALCANCE_CAZA = 0.55;       // un bot solo empieza a perseguir lo que está a menos de esta fracción de su alcance de visión
const TIEMPO_CAZA_MAX = 5;       // segundos máximos que persigue a la misma presa (luego se rinde)
const REPOSO_CAZA = [5, 11];     // tras rendirse, segundos que ignora a las presas y se dedica a comer
const GANAS_JUGADOR = 0.5;       // ganas de perseguirte a TI (1 = igual que a cualquier otro; menos = te persiguen menos)
const MASA_MIN_DIVIDIR_BOT = 50; // masa mínima de un bot para dividirse
const TIEMPO_FUSION_BOT = 9;     // segundos para que un bot vuelva a juntar sus pedazos

// --- Bolas azules brillantes (sueltan puntitos al tocarlas) ---
const NUM_ORBES = 14;            // cuántas hay en el mapa a la vez
const PUNTOS_ORBE = 200;         // puntitos que sueltan (cada uno da MASA_COMIDA de masa)
const RADIO_ORBE = 24;
const VEL_ORBE = 55;             // flotan despacio por el mapa (px por segundo)
const REAPARECE_ORBE = [8, 16];  // segundos que tarda en aparecer otra después de tocarla
const DURA_COMIDA_EXTRA = 45;    // segundos que duran en el suelo los puntitos que soltó una bola

// --- Portales (te llevan a otra parte del mapa, de un solo uso) ---
const MAX_PORTALES = 3;          // máximo al mismo tiempo
const CADA_PORTAL = [18, 35];    // cada cuántos segundos aparece uno nuevo
const DURA_PORTAL = [35, 55];    // cuánto dura abierto
const RADIO_PORTAL = 70;
const DIST_SEGURA_PORTAL = 900;  // distancia ideal a las células que pueden comerte al llegar (px, de orilla a orilla)
const DIST_MIN_PORTAL = 300;     // si el mapa está muy lleno, se relaja hasta esto (nunca menos); nunca cae dentro de una célula

const NOMBRES = [
  "Pepe", "Lupita", "Chuy", "Nacho", "Tona", "Memo", "Paco", "Rosa", "Beto", "Güero",
  "Mapache", "Tlacuache", "Colibrí", "Ajolote", "Nopal", "Jaguar", "Coyote", "Quetzal", "Monarca", "Churro",
  "Taco", "Elote", "Mole", "Pozole", "Tamal", "Piñata", "Lucha", "Don Polo", "Mariachi", "Chile",
  "Frijol", "Tuna", "Mango", "Sandía", "Guayaba", "Pitaya", "Tejón", "Zorro", "Halcón", "Venado",
  "Cenzontle", "Armadillo", "Cacomixtle", "Tepezcuintle", "Gallito",
];

// ---------- Módulos del portal ----------
// Inicio con mapa (ESTANDARES-juegos.md, sección 13). jugador.js y progreso.js se cargan aparte con import() y try/catch: el juego abre aunque falle Firebase.
import { encolarPuntos, leerCola, guardarCola } from "../compartido/cola-puntos.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { NIVELES, POR_ETAPA, monedasDe } from "./niveles-agario.js";

const MOSTRAR_BORRAR_HISTORIAL = false;   // BOTÓN DE PRUEBAS en ⚙️ Ajustes («Borrar todo el historial y reiniciar»). Ponlo en true solo mientras pruebas; debe quedar en false al publicar (13.8)
const PUNTOS_LIBRE = true;                // true = el Modo libre sigue dando puntos de perfil por masa máxima (Agario premia por partida: sección 12). false = sin puntos (estándar 7.2)
let reiniciando = false;                  // true mientras se borra el historial: la sincronización con la nube no vuelve a traer lo borrado
let enviadosPerfil = 0;
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900 (estándar A-bis)
const TOTAL = ETAPAS.total;

// ---------- Dificultades del Modo libre (las 5 estándar, 7.2) ----------
// Cambian cuántos bots hay, cuánto te persiguen a TI y qué tan rápidos son (1 = igual que tú). «Normal» es el juego de siempre.
const DIFICULTADES = [
  { emoji: "😁", nombre: "Muy fácil", bots: 25, ganas: 0.15, vel: 0.86, nota: "Pocos bots, lentos y casi no te persiguen." },
  { emoji: "😬", nombre: "Fácil", bots: 35, ganas: 0.3, vel: 0.91, nota: "Menos bots y te persiguen poco." },
  { emoji: "😐", nombre: "Normal", bots: NUM_BOTS, ganas: GANAS_JUGADOR, vel: VEL_BOTS, nota: "Como siempre: " + NUM_BOTS + " bots." },
  { emoji: "😡", nombre: "Difícil", bots: 55, ganas: 0.8, vel: 1, nota: "Más bots, te persiguen más y corren igual que tú." },
  { emoji: "😈", nombre: "Demoníaco", bots: 70, ganas: 1, vel: 1.05, nota: "70 bots que te cazan y son más rápidos que tú." },
];
let cfg = DIFICULTADES[2];               // la dificultad de la partida en curso
let libreDif = 2;                        // la elegida en la pantalla del Modo libre
let difJugada = 2, recordIni = 0;        // dificultad de la partida en curso y récord que tenía al empezar

// ---------- Estado de pantallas ----------
let modo = "libre";                      // "libre" (partida sin fin) | "nivel" (niveles del mapa; todavía no hay)
let pantalla = "pantalla-inicio";        // "pantalla-inicio" | "pantalla-libre" | "pantalla-niveles" (el mapa) | "juego"
let pausado = false;

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
const $ = (id) => document.getElementById(id);
let W = 0, H = 0, dpr = 1;
function ajustar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
}
window.addEventListener("resize", ajustar);
ajustar();

// ---------- Progreso (local primero; se sincroniza con la cuenta de Google si hay internet y sesión) ----------
// { v: 1, hechos: NÚMERO = nivel más alto pasado (0 = ninguno; los niveles se abren en orden), libre: { "<dificultad 0-4>": masa máxima } }
// El récord de antes (clave «agario_record», un solo número) pasa a «Normal» (2), que era la dificultad que ya jugaban; también se lee así de la nube.
const VERSION_PROG = 1;
const CLAVE = ID + "_progreso";
function limpiar(p) {
  if (typeof p === "number") p = { libre: { 2: p } };          // formato viejo: solo el récord
  if (!p || typeof p !== "object") return null;
  const libre = {};
  for (let d = 0; d < DIFICULTADES.length; d++) { const m = Math.round(Number(p.libre && p.libre[d])); if (m > 0) libre[d] = m; }
  return { v: VERSION_PROG, hechos: Math.max(0, Math.min(TOTAL, Math.floor(Number(p.hechos)) || 0)), libre };
}
let prog = { v: VERSION_PROG, hechos: 0, libre: {} }, nube = null;
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
try {
  const viejo = Math.round(Number(localStorage.getItem("agario_record")) || 0);
  if (viejo > 0) { if (viejo > (prog.libre[2] || 0)) prog.libre[2] = viejo; localStorage.setItem(CLAVE, JSON.stringify(prog)); localStorage.removeItem("agario_record"); }
} catch (e) {}
let sucio = false, tGuardar = 0;          // el récord se anota en memoria al instante y se guarda cada 2 s (y al morir o salir)
function guardarProg() {
  sucio = false;
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
const hechoMax = () => prog.hechos;       // nivel más alto terminado (0 = ninguno)

// Modo libre: última dificultad elegida (clave terminada en _v1 para que entre en la copia de seguridad de compartido/almacen.js)
const CLAVE_LIBRE = "agario_libre_v1";
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g && DIFICULTADES[g.d]) libreDif = g.d; } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif })); } catch (e) {} };

// Récord de la dificultad de la partida (cuadro «Récord» de arriba)
const pintarRecord = () => { const r = prog.libre[difJugada] || 0; $("record").textContent = r > 0 ? String(r) : "–"; };

// ---------- Estado ----------
const radio = (m) => 4 * Math.sqrt(m);
const azar = (a, b) => a + Math.random() * (b - a);
let cuerpos = [];                // todas las células (tuyas y de los bots)
let bots = [];
let jug = { tipo: "jugador", nombre: "Jugador", h: 200, tpListo: 0 };
let jugCeldas = [];
let estado = "inicio";           // "inicio" | "jugando" | "fin"
let t = 0, t0 = 0, maxMasa = 0, comidos = 0;
let cam = { x: MUNDO / 2, y: MUNDO / 2, z: 0.6 };
let tabla = [], tTabla = 0, rango = 0;

// ---------- Comida (repartida en casillas para buscarla rápido) ----------
const GW = Math.ceil(MUNDO / CASILLA);
let casillas = [];
let extras = [];                 // puntitos soltados por las bolas azules (desaparecen solos)
const idxCas = (x, y) => Math.min(GW - 1, Math.floor(y / CASILLA)) * GW + Math.min(GW - 1, Math.floor(x / CASILLA));
function meter(p) { p.k = idxCas(p.x, p.y); casillas[p.k].push(p); }
function crearComida() {
  casillas = Array.from({ length: GW * GW }, () => []);
  extras = [];
  for (let i = 0; i < NUM_COMIDA; i++) {
    const h = Math.floor(Math.random() * 360);
    meter({ x: azar(20, MUNDO - 20), y: azar(20, MUNDO - 20), col: "hsl(" + h + ",85%,62%)", k: 0 });
  }
}
function moverComida(p) {
  const a = casillas[p.k];
  a.splice(a.indexOf(p), 1);
  p.x = azar(20, MUNDO - 20); p.y = azar(20, MUNDO - 20);
  meter(p);
}
function quitarComida(p) {
  const a = casillas[p.k], i = a.indexOf(p);
  if (i >= 0) a.splice(i, 1);
  p.comido = true;
}
function soltarPuntos(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 50 + Math.sqrt(Math.random()) * 210;
    const p = {
      x: Math.max(20, Math.min(MUNDO - 20, x + Math.cos(a) * d)), y: Math.max(20, Math.min(MUNDO - 20, y + Math.sin(a) * d)),
      x0: x, y0: y, nace: t, vence: t + DURA_COMIDA_EXTRA, extra: true, comido: false,
      col: "hsl(" + Math.floor(azar(190, 225)) + ",95%,66%)", k: 0,
    };
    meter(p); extras.push(p);
  }
}
function comerComida(c) {
  const r = c.r;
  const x0 = Math.max(0, Math.floor((c.x - r) / CASILLA)), x1 = Math.min(GW - 1, Math.floor((c.x + r) / CASILLA));
  const y0 = Math.max(0, Math.floor((c.y - r) / CASILLA)), y1 = Math.min(GW - 1, Math.floor((c.y + r) / CASILLA));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    const a = casillas[cy * GW + cx];
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < r * r) { c.m += MASA_COMIDA; if (p.extra) quitarComida(p); else moverComida(p); }
    }
  }
}
function comidaCerca(c, rad) {
  const x0 = Math.max(0, Math.floor((c.x - rad) / CASILLA)), x1 = Math.min(GW - 1, Math.floor((c.x + rad) / CASILLA));
  const y0 = Math.max(0, Math.floor((c.y - rad) / CASILLA)), y1 = Math.min(GW - 1, Math.floor((c.y + rad) / CASILLA));
  let mejor = null, md = rad * rad;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    for (const p of casillas[cy * GW + cx]) {
      const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
      if (d < md) { md = d; mejor = p; }
    }
  }
  return mejor;
}

// ---------- Células ----------
function celda(dueno, x, y, m) {
  const c = { dueno, x, y, m, r: radio(m), vx: 0, vy: 0, fusion: 0, muerto: false };
  cuerpos.push(c);
  return c;
}

// Punto del mapa lo más lejos posible de las demás células
function puntoLibre() {
  let mejor = { x: MUNDO / 2, y: MUNDO / 2 }, md = -1;
  for (let i = 0; i < 12; i++) {
    const p = { x: azar(150, MUNDO - 150), y: azar(150, MUNDO - 150) };
    let d = Infinity;
    for (const c of cuerpos) d = Math.min(d, Math.hypot(c.x - p.x, c.y - p.y) - c.r);
    if (d > md) { md = d; mejor = p; }
  }
  return mejor;
}

// ---------- Bots ----------
function nuevoBot(i) {
  return {
    tipo: "bot", nombre: NOMBRES[i % NOMBRES.length] + (i >= NOMBRES.length ? " " + (Math.floor(i / NOMBRES.length) + 1) : ""), h: Math.floor(Math.random() * 360),
    celda: null, reaparece: Math.random() * 2, prox: 0, dx: 0, dy: 0,
    agresivo: 0.4 + Math.random() * 0.6, vaga: { x: MUNDO / 2, y: MUNDO / 2, hasta: 0 },
    caza: null, noCaza: Math.random() * 3, divListo: 0, dividido: false,
  };
}
function aparecerBot(b) {
  const p = puntoLibre();
  const m = MASA_INICIAL + Math.pow(Math.random(), 3) * 300;   // la mayoría empieza chica; algunos ya vienen grandes
  b.celda = celda(b, p.x, p.y, m);
  b.caza = null; b.dividido = false; b.noCaza = t + 1 + Math.random() * 3; b.divListo = t + 2;
  const a = Math.random() * Math.PI * 2;
  b.dx = Math.cos(a); b.dy = Math.sin(a);
}

// «Cerebro» del bot: huye de las más grandes, persigue a las más chicas y si no, busca comida
function pensar(b) {
  const c = b.celda;
  const alcance = 300 + c.r * 7;
  const radioCaza = alcance * ALCANCE_CAZA;         // solo empieza a perseguir lo que está cerca
  const puedeDividir = !b.dividido && t >= b.divListo && c.m >= MASA_MIN_DIVIDIR_BOT;
  let fx = 0, fy = 0, amenaza = 0, presa = null, dp = Infinity, golpe = null, dg = Infinity;
  for (const o of cuerpos) {
    if (o === c || o.muerto || o.dueno === b) continue;
    const dx = o.x - c.x, dy = o.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > alcance + o.r) continue;
    if (o.m > c.m * FACTOR_COMER * 0.95) {          // peligro
      const hueco = d - o.r - c.r;
      const w = Math.max(0, 1 - hueco / (alcance * 0.8));
      if (w > 0) { fx -= (dx / d) * w; fy -= (dy / d) * w; amenaza += w; }
    } else if (c.m > o.m * FACTOR_COMER * 1.08 && d < dp && (d < radioCaza + o.r || (puedeDividir && o.m < c.m * 0.35 && d < alcanceGolpe(c) + 250))) { presa = o; dp = d; }   // las chicas que se pueden «lanzar» se vigilan desde un poco más lejos
    if (puedeDividir && d < dg && o.m < c.m * 0.35 && puedeGolpear(c, o, d)) { golpe = o; dg = d; }
  }
  // Ataque oportunista: pasa una célula chica a tiro de «mitad lanzada» → se divide aunque no la estuviera persiguiendo
  if (golpe && amenaza <= 0.15) {
    if (Math.random() < 0.5 + 0.5 * b.agresivo) dividirBot(b, golpe);
    else b.divListo = t + 1.2;
  }
  // Persecución con memoria corta: persigue una presa unos segundos y luego se rinde y descansa (así no se aferra)
  let objetivo = null;
  const z = b.caza;
  if (z) {
    const dz = z.o.muerto ? Infinity : Math.hypot(z.o.x - c.x, z.o.y - c.y);
    if (z.o.muerto) { b.caza = null; b.noCaza = t + azar(1, 2.5); }
    else if (t > z.fin || dz > alcance * 0.85 + z.o.r || c.m <= z.o.m * FACTOR_COMER * 1.04) { b.caza = null; b.noCaza = t + azar(REPOSO_CAZA[0], REPOSO_CAZA[1]); }
    else objetivo = z.o;
  } else if (presa && t >= b.noCaza) {
    const ganas = b.agresivo * (presa.dueno === jug ? cfg.ganas : 1);
    if (Math.random() < ganas) { b.caza = { o: presa, fin: t + azar(2.5, TIEMPO_CAZA_MAX) }; objetivo = presa; }
    else b.noCaza = t + azar(2, 4);
  }
  let vx = 0, vy = 0;
  if (amenaza > 0.15) { vx = fx; vy = fy; }
  else if (objetivo) { vx = objetivo.x - c.x; vy = objetivo.y - c.y; }
  else {
    const p = comidaCerca(c, 500 + c.r * 2);
    if (p) { vx = p.x - c.x; vy = p.y - c.y; }
    else {
      if (t > b.vaga.hasta || Math.hypot(b.vaga.x - c.x, b.vaga.y - c.y) < 80) {
        b.vaga = { x: azar(200, MUNDO - 200), y: azar(200, MUNDO - 200), hasta: t + 4 + Math.random() * 5 };
      }
      vx = b.vaga.x - c.x; vy = b.vaga.y - c.y;
    }
  }
  // alejarse de las paredes
  const M = 250;
  const norm = Math.hypot(vx, vy) || 1;
  vx /= norm; vy /= norm;
  if (c.x < M) vx += ((M - c.x) / M) * 2;
  if (c.x > MUNDO - M) vx -= ((c.x - (MUNDO - M)) / M) * 2;
  if (c.y < M) vy += ((M - c.y) / M) * 2;
  if (c.y > MUNDO - M) vy -= ((c.y - (MUNDO - M)) / M) * 2;
  const n2 = Math.hypot(vx, vy) || 1;
  b.dx = vx / n2; b.dy = vy / n2;
}


// ¿Le conviene al bot dividirse para «lanzar» la mitad contra esta célula? Sí si la mitad puede comérsela y está justo fuera
// de su alcance caminando (ni tan cerca que baste con avanzar, ni tan lejos que el pedazo lanzado no llegue)
function puedeGolpear(c, o, d) {
  const mitad = c.m / 2;
  if (mitad <= o.m * FACTOR_COMER * 1.12) return false;
  if (d < c.r - o.r * 0.4 + 15) return false;
  return d <= alcanceGolpe(c) - o.r * 0.4;
}
// Hasta dónde llega (desde su centro) la mitad que lanza un bot al dividirse
const alcanceGolpe = (c) => radio(c.m / 2) + IMPULSO_DIVISION / 4 + 60;
function dividirBot(b, o) {
  const c = b.celda;
  const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy) || 1;
  c.m /= 2; c.r = radio(c.m);
  const n = celda(b, c.x, c.y, c.m);
  n.vx = (dx / d) * IMPULSO_DIVISION; n.vy = (dy / d) * IMPULSO_DIVISION;
  c.fusion = n.fusion = TIEMPO_FUSION_BOT;
  b.dividido = true; b.divListo = t + azar(5, 9);
}
// Un pedazo de un bot murió: el bot sigue con el pedazo más grande que le quede, o reaparece si no le queda ninguno
function perdioCelda(p) {
  const d = p.dueno;
  if (d.tipo !== "bot") return;
  if (d.celda === p) {
    let g = null;
    for (const c of cuerpos) if (c.dueno === d && c !== p && !c.muerto && (!g || c.m > g.m)) g = c;
    d.celda = g;
  }
  if (!d.celda) { d.reaparece = 3 + Math.random() * 4; d.caza = null; d.dividido = false; }
}
const masaBot = (b) => (b.dividido ? cuerpos.reduce((s, c) => (c.dueno === b && !c.muerto ? s + c.m : s), 0) : b.celda.m);

// ---------- Bolas azules, portales y destellos ----------
let orbes = [], portales = [], chispas = [];
let tExtras = 0, tPortal = 0;
const enVista = (x, y, m) => Math.abs(x - cam.x) < W / 2 / cam.z + m && Math.abs(y - cam.y) < H / 2 / cam.z + m;

function nuevoOrbe(o) {
  o = o || {};
  o.x = azar(200, MUNDO - 200); o.y = azar(200, MUNDO - 200);
  o.r = RADIO_ORBE; o.a = Math.random() * Math.PI * 2; o.fase = Math.random() * 6.28; o.acum = 0;
  o.activo = true; o.nace = t; o.rea = 0;
  return o;
}
function chispear(x, y, n, col, vel, vida, r) {
  for (let i = 0; i < n && chispas.length < 600; i++) {
    const a = Math.random() * Math.PI * 2, v = Math.random() * vel, vd = vida * (0.6 + Math.random() * 0.4);
    chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: vd, max: vd, r: r * (0.6 + Math.random() * 0.8), col });
  }
}
function crearPortal() {
  let x = azar(250, MUNDO - 250), y = azar(250, MUNDO - 250);
  if (jugCeldas.length && Math.random() < 0.7) {            // casi siempre cerca de ti, para que lo veas
    const g = jugCeldas[0], a = Math.random() * Math.PI * 2, d = azar(600, 1500);
    x = Math.max(250, Math.min(MUNDO - 250, g.x + Math.cos(a) * d));
    y = Math.max(250, Math.min(MUNDO - 250, g.y + Math.sin(a) * d));
  }
  portales.push({ x, y, r: RADIO_PORTAL, nace: t, vence: t + azar(DURA_PORTAL[0], DURA_PORTAL[1]) });
}
// Lleva a todos tus pedazos a un punto al azar que NO esté dentro de una célula ni cerca de una que pueda comerte
function teletransportar() {
  const mias = jugCeldas;
  let gx = 0, gy = 0, tot = 0, menor = Infinity;
  for (const c of mias) { gx += c.x * c.m; gy += c.y * c.m; tot += c.m; menor = Math.min(menor, c.m); }
  gx /= tot; gy /= tot;
  let R = 0;
  for (const c of mias) R = Math.max(R, Math.hypot(c.x - gx, c.y - gy) + c.r);
  const m = R + 120;
  if (MUNDO - 2 * m <= 0) return false;
  // Candidatos al azar: de cada uno se mide el hueco a las células peligrosas y a las demás
  const cands = [];
  for (let i = 0; i < 150; i++) {
    const x = azar(m, MUNDO - m), y = azar(m, MUNDO - m);
    if (Math.hypot(x - gx, y - gy) < 800) continue;          // que sea de verdad otra parte del mapa
    let hp = Infinity, hn = Infinity;
    for (const o of cuerpos) {
      if (o.dueno === jug || o.muerto) continue;
      const hueco = Math.hypot(o.x - x, o.y - y) - o.r - R;
      if (o.m > menor * FACTOR_COMER * 0.85) hp = Math.min(hp, hueco);   // puede comerse alguno de tus pedazos (o casi)
      else hn = Math.min(hn, hueco);
    }
    for (const q of portales) if (Math.hypot(q.x - x, q.y - y) < 300) hn = -1;
    if (hn >= 60) cands.push({ x, y, hp });                  // nunca dentro ni pegado a una célula
  }
  // Primero se busca lo más seguro (DIST_SEGURA_PORTAL) y, si no hay, se relaja poco a poco hasta DIST_MIN_PORTAL
  let buenos = [];
  for (const k of [1, 0.65, 0.4, DIST_MIN_PORTAL / DIST_SEGURA_PORTAL]) {
    buenos = cands.filter((c) => c.hp >= DIST_SEGURA_PORTAL * k);
    if (buenos.length) break;
  }
  if (!buenos.length) return false;
  const d = buenos[Math.floor(Math.random() * buenos.length)];
  chispear(gx, gy, 40, "rgb(190,130,255)", 380, 0.8, 9);
  for (const c of mias) {
    c.x = Math.max(0, Math.min(MUNDO, d.x + c.x - gx)); c.y = Math.max(0, Math.min(MUNDO, d.y + c.y - gy));
    c.vx = c.vy = 0;
  }
  cam.x = d.x; cam.y = d.y;
  chispear(d.x, d.y, 40, "rgb(120,230,255)", 380, 0.8, 9);
  return true;
}
function usarPortales() {
  if (estado !== "jugando" || !jugCeldas.length || t < (jug.tpListo || 0)) return;
  for (const p of portales) {
    if (t - p.nace < 0.6 || p.vence - t < 0.4) continue;
    if (!jugCeldas.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < c.r * 0.5 + p.r * 0.8)) continue;
    if (teletransportar()) p.vence = t;                      // de un solo uso
    else jug.tpListo = t + 1;                                // no hay un lugar seguro ahora: reintenta en un segundo
    return;
  }
}
function actualizarExtras(dt) {
  // Bolas azules: flotan, dejan estela y al tocarlas (tú o un bot) sueltan puntitos a su alrededor
  for (const o of orbes) {
    if (!o.activo) { if (t >= o.rea) nuevoOrbe(o); continue; }
    o.a += azar(-1, 1) * dt * 2;
    if (o.x < 120 || o.x > MUNDO - 120 || o.y < 120 || o.y > MUNDO - 120) o.a = Math.atan2(MUNDO / 2 - o.y, MUNDO / 2 - o.x) + azar(-0.5, 0.5);
    o.x += Math.cos(o.a) * VEL_ORBE * dt; o.y += Math.sin(o.a) * VEL_ORBE * dt;
    if (enVista(o.x, o.y, 200)) {                            // la estela solo se genera donde se ve
      o.acum += dt;
      while (o.acum > 0.05) { o.acum -= 0.05; chispear(o.x - Math.cos(o.a) * o.r * 0.6, o.y - Math.sin(o.a) * o.r * 0.6, 1, "rgb(90,190,255)", 25, 1.1, 7); }
    } else o.acum = 0;
    for (const c of cuerpos) {
      if (c.muerto || Math.hypot(c.x - o.x, c.y - o.y) >= c.r + o.r * 0.7) continue;
      soltarPuntos(o.x, o.y, PUNTOS_ORBE);
      chispear(o.x, o.y, 28, "rgb(120,210,255)", 320, 0.7, 8);
      o.activo = false; o.rea = t + azar(REAPARECE_ORBE[0], REAPARECE_ORBE[1]);
      break;
    }
  }
  // Destellos
  for (let i = chispas.length - 1; i >= 0; i--) {
    const s = chispas[i];
    s.vida -= dt;
    if (s.vida <= 0) { chispas.splice(i, 1); continue; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    const f = Math.exp(-3 * dt); s.vx *= f; s.vy *= f;
  }
  // Puntitos soltados que ya se vencieron
  if (t >= tExtras) {
    tExtras = t + 2;
    extras = extras.filter((p) => { if (p.comido) return false; if (t > p.vence) { quitarComida(p); return false; } return true; });
  }
  // Portales
  if (estado === "jugando" && t >= tPortal) {
    tPortal = t + azar(CADA_PORTAL[0], CADA_PORTAL[1]);
    if (portales.length < MAX_PORTALES) crearPortal();
  }
  portales = portales.filter((p) => t < p.vence);
  usarPortales();
}

// ---------- Entrada ----------
const teclas = {};
let raton = { x: 0, y: 0, activo: false };
let joy = null;                  // dedo en pantalla táctil: { ox, oy, x, y }
let ultimaDir = { x: 1, y: 0 };
function leerEntrada() {
  let x = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0), y = (teclas.abajo ? 1 : 0) - (teclas.arriba ? 1 : 0);
  if (!x && !y) {
    if (joy) { x = (joy.x - joy.ox) / 70; y = (joy.y - joy.oy) / 70; }
    else if (raton.activo) { const k = 0.2 * Math.min(W, H); x = (raton.x - W / 2) / k; y = (raton.y - H / 2) / k; }
  }
  const l = Math.hypot(x, y);
  if (l < 0.12) return { x: 0, y: 0 };
  if (l > 1) { x /= l; y /= l; }
  return { x, y };
}
function posPuntero(e) { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
lienzo.addEventListener("pointerdown", (e) => {
  const p = posPuntero(e);
  if (e.pointerType === "mouse") { raton = { ...p, activo: true }; return; }
  lienzo.setPointerCapture(e.pointerId);
  joy = { ox: p.x, oy: p.y, x: p.x, y: p.y };
});
lienzo.addEventListener("pointermove", (e) => {
  const p = posPuntero(e);
  if (e.pointerType === "mouse") { raton = { ...p, activo: true }; return; }
  if (joy) { joy.x = p.x; joy.y = p.y; }
});
const soltar = (e) => { if (e.pointerType !== "mouse") joy = null; };
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);
const mapaTeclas = { ArrowLeft: "izq", a: "izq", A: "izq", ArrowRight: "der", d: "der", D: "der", ArrowUp: "arriba", w: "arriba", W: "arriba", ArrowDown: "abajo", s: "abajo", S: "abajo" };
window.addEventListener("keydown", (e) => {
  if (e.target && e.target.tagName === "INPUT") return;
  if (mapaTeclas[e.key]) { teclas[mapaTeclas[e.key]] = true; e.preventDefault(); }
  if (e.key === " ") { e.preventDefault(); dividir(); }
});
window.addEventListener("keyup", (e) => { if (mapaTeclas[e.key]) teclas[mapaTeclas[e.key]] = false; });
window.addEventListener("blur", () => { for (const k in teclas) teclas[k] = false; joy = null; });
$("dividir").addEventListener("pointerdown", (e) => { e.preventDefault(); dividir(); });

function dividir() {
  if (estado !== "jugando" || pausado) return;
  const mias = cuerpos.filter((c) => c.dueno === jug && !c.muerto);
  let total = mias.length;
  for (const c of mias) {
    if (total >= MAX_CELDAS) break;
    if (c.m < MASA_MIN_DIVIDIR) continue;
    c.m /= 2; c.r = radio(c.m);
    const n = celda(jug, c.x, c.y, c.m);
    n.vx = ultimaDir.x * IMPULSO_DIVISION; n.vy = ultimaDir.y * IMPULSO_DIVISION;
    c.fusion = n.fusion = TIEMPO_FUSION;
    total++;
  }
}

// ---------- Partida ----------
function crearMundo() {
  cuerpos = [];
  crearComida();
  bots = Array.from({ length: cfg.bots }, (_, i) => nuevoBot(i));
  bots.forEach(aparecerBot);
  orbes = Array.from({ length: NUM_ORBES }, () => nuevoOrbe());
  portales = []; chispas = [];
}

let txMasa = "", txTiempo = "";
function pintarDatos(total) {              // cuadros Masa y Tiempo: solo se escribe en el DOM cuando cambian
  const a = String(Math.round(total)), s = Math.round(t - t0), b = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  if (a !== txMasa) { txMasa = a; $("masa").textContent = a; }
  if (b !== txTiempo) { txTiempo = b; $("tiempo").textContent = b; }
}

function iniciar() {
  const nombre = ($("nombre").value || "").trim().slice(0, 14) || "Jugador";
  try { localStorage.setItem("agario_nombre", nombre); } catch (e) {}
  crearMundo();                            // mundo nuevo en cada partida (el de antes quedaba corriendo detrás del menú)
  jug = { tipo: "jugador", nombre, h: Math.floor(Math.random() * 360), tpListo: 0 };
  jugCeldas = []; tabla = []; rango = 0; tTabla = 0;
  const p = puntoLibre();
  celda(jug, p.x, p.y, MASA_INICIAL);
  cam.x = p.x; cam.y = p.y; cam.z = 0.6;
  estado = "jugando"; pausado = false; t0 = t; maxMasa = MASA_INICIAL; comidos = 0; enviadosPerfil = 0;
  difJugada = libreDif; recordIni = prog.libre[difJugada] || 0;
  tPortal = t + azar(6, 12); tExtras = 0;
  txMasa = txTiempo = "";
  $("fin").hidden = true;
  $("dividir").classList.add("activo");
  pintarRecord(); pintarBotonMenu();
}

function enviarPerfil() {
  if (modo !== "libre" || !PUNTOS_LIBRE) return 0;
  const debe = Math.max(0, Math.floor(maxMasa / PUNTOS_POR_MASA) - 1) - enviadosPerfil;
  if (debe <= 0) return 0;
  enviadosPerfil += debe;
  encolarPuntos(ID, debe); // se guarda al instante en el dispositivo (también al cerrar la página)
  import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {});
  return debe;
}

function morir() {
  estado = "fin"; pausado = false;
  $("dividir").classList.remove("activo");
  const pts = modo === "libre" && PUNTOS_LIBRE ? Math.max(0, Math.floor(maxMasa / PUNTOS_POR_MASA) - 1) : 0;
  enviarPerfil();
  guardarProg();
  const seg = Math.round(t - t0);
  $("finTexto").textContent = "Masa máxima: " + Math.round(maxMasa) + " · Tiempo: " + Math.floor(seg / 60) + ":" + String(seg % 60).padStart(2, "0") +
    " · Bots comidos: " + comidos + (pts ? " · +" + pts + " puntos para tu perfil (se envían cuando haya internet y hayas entrado con Google)" : "") +
    (maxMasa > recordIni && maxMasa > MASA_INICIAL ? ". ¡Nuevo récord!" : ".");
  $("fin").hidden = false;
  pintarBotonMenu();
}
// Dejar la partida (por ☰, «Salir…» o cualquier cambio de pantalla): se anotan los puntos y el récord y se quita el mundo
function abandonar() {
  enviarPerfil(); guardarProg();
  estado = "inicio"; pausado = false; cuerpos = []; jugCeldas = [];
}

// Pedazos de un mismo dueño: se empujan mientras corre el tiempo de fusión y después se atraen y se juntan
function juntarPiezas(piezas, dt) {
  for (let i = 0; i < piezas.length; i++) for (let j = i + 1; j < piezas.length; j++) {
    const a = piezas[i], b = piezas[j];
    if (a.muerto || b.muerto) continue;
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { const ang = Math.random() * Math.PI * 2; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
    const nx = dx / d, ny = dy / d, tot = a.m + b.m;
    if (a.fusion > 0 || b.fusion > 0) {
      if (d < a.r + b.r) {
        const k = (a.r + b.r - d) * Math.min(1, dt * 8);
        a.x -= nx * k * (b.m / tot); a.y -= ny * k * (b.m / tot);
        b.x += nx * k * (a.m / tot); b.y += ny * k * (a.m / tot);
      }
    } else if (d < Math.max(a.r, b.r) * 0.5) {          // se juntan
      a.x = (a.x * a.m + b.x * b.m) / tot; a.y = (a.y * a.m + b.y * b.m) / tot;
      a.m = tot; b.muerto = true;
    } else {                                              // se atraen despacio
      const k = Math.min(d, 90 * dt);
      a.x += nx * k * (b.m / tot); a.y += ny * k * (b.m / tot);
      b.x -= nx * k * (a.m / tot); b.y -= ny * k * (a.m / tot);
    }
  }
}

// ---------- Actualización ----------
function actualizar(dt) {
  t += dt;
  const ent = estado === "jugando" ? leerEntrada() : { x: 0, y: 0 };
  const el = Math.hypot(ent.x, ent.y);
  if (el > 0) { ultimaDir = { x: ent.x / el, y: ent.y / el }; }

  // Bots: pensar, reaparecer
  for (const b of bots) {
    if (!b.celda) {
      b.reaparece -= dt;
      if (b.reaparece <= 0) aparecerBot(b);
    } else if (t >= b.prox) { pensar(b); b.prox = t + 0.15 + Math.random() * 0.15; }
  }

  // Mover
  const amort = Math.exp(-4 * dt);
  for (const c of cuerpos) {
    c.r = radio(c.m);
    let dx, dy, esc;
    if (c.dueno === jug) { dx = el ? ent.x / el : 0; dy = el ? ent.y / el : 0; esc = Math.min(1, el); }
    else {
      dx = c.dueno.dx; dy = c.dueno.dy; esc = cfg.vel;
      const mp = c.dueno.celda;
      if (mp && c !== mp && c.fusion <= 0) {                // pedazo suelto de un bot: vuelve con el principal
        const ex = mp.x - c.x, ey = mp.y - c.y, l = Math.hypot(ex, ey) || 1;
        dx = ex / l; dy = ey / l;
      }
    }
    const v = VEL_BASE * Math.pow(c.m, -0.25);
    c.x += (dx * v * esc + c.vx) * dt;
    c.y += (dy * v * esc + c.vy) * dt;
    c.vx *= amort; c.vy *= amort;
    c.x = Math.max(0, Math.min(MUNDO, c.x));
    c.y = Math.max(0, Math.min(MUNDO, c.y));
    if (c.fusion > 0) c.fusion -= dt;
    if (c.m > 40) c.m -= c.m * PERDIDA_MASA * dt;
  }

  // Tus pedazos (y los de los bots que se dividieron): se empujan entre sí y, pasado el tiempo, se juntan
  juntarPiezas(cuerpos.filter((c) => c.dueno === jug && !c.muerto), dt);
  for (const b of bots) {
    if (!b.dividido) continue;
    const grupo = cuerpos.filter((c) => c.dueno === b && !c.muerto);
    if (grupo.length < 2) { b.dividido = false; continue; }
    juntarPiezas(grupo, dt);
    if (!b.celda || b.celda.muerto) b.celda = grupo.find((c) => !c.muerto) || null;
  }

  // Comer puntitos
  for (const c of cuerpos) if (!c.muerto) comerComida(c);

  // Comer células
  for (let i = 0; i < cuerpos.length; i++) for (let j = i + 1; j < cuerpos.length; j++) {
    const a = cuerpos[i], b = cuerpos[j];
    if (a.muerto || b.muerto || a.dueno === b.dueno) continue;
    const g = a.m >= b.m ? a : b, p = g === a ? b : a;
    if (g.m <= p.m * FACTOR_COMER) continue;
    if (Math.hypot(g.x - p.x, g.y - p.y) < g.r - p.r * 0.4) {
      g.m += p.m; g.r = radio(g.m); p.muerto = true;
      perdioCelda(p);
      if (g.dueno === jug && p.dueno.tipo === "bot") comidos++;
    }
  }
  cuerpos = cuerpos.filter((c) => !c.muerto);
  jugCeldas = cuerpos.filter((c) => c.dueno === jug);

  // Estado del jugador
  if (estado === "jugando") {
    const total = jugCeldas.reduce((s, c) => s + c.m, 0);
    if (total > maxMasa) maxMasa = total;
    const rec = Math.round(maxMasa);
    if (rec > (prog.libre[difJugada] || 0)) { prog.libre[difJugada] = rec; sucio = true; pintarRecord(); }   // récord de esta dificultad
    if (sucio && t >= tGuardar) { tGuardar = t + 2; guardarProg(); }
    if (!jugCeldas.length) morir();
    else pintarDatos(total);
  }

  actualizarExtras(dt);

  // Tabla de posiciones
  if (t >= tTabla) {
    tTabla = t + 0.4;
    const lista = bots.filter((b) => b.celda).map((b) => ({ nombre: b.nombre, m: masaBot(b), yo: false }));
    if (jugCeldas.length) lista.push({ nombre: jug.nombre, m: jugCeldas.reduce((s, c) => s + c.m, 0), yo: true });
    lista.sort((a, b) => b.m - a.m);
    tabla = lista.slice(0, 8);
    const i = lista.findIndex((x) => x.yo);
    rango = i >= 0 ? i + 1 : 0;
    if (i >= 8) tabla.push(lista[i]);
  }

  moverCamara(dt);
}

function moverCamara(dt) {
  let cx, cy, tot;
  if (jugCeldas.length) {
    tot = jugCeldas.reduce((s, c) => s + c.m, 0);
    cx = jugCeldas.reduce((s, c) => s + c.x * c.m, 0) / tot;
    cy = jugCeldas.reduce((s, c) => s + c.y * c.m, 0) / tot;
  } else {                                                // en los menús, la cámara sigue a la célula más grande
    let g = null;
    for (const c of cuerpos) if (!g || c.m > g.m) g = c;
    if (!g) return;
    cx = g.x; cy = g.y; tot = g.m;
  }
  const zObj = Math.min(1.2, Math.min(W, H) / (2 * Math.max(320, radio(tot) * 5.2)));
  cam.x += (cx - cam.x) * Math.min(1, dt * 6);
  cam.y += (cy - cam.y) * Math.min(1, dt * 6);
  cam.z += (zObj - cam.z) * Math.min(1, dt * 3);
}

// ---------- Dibujo de bolas azules, portales y destellos ----------
function dibujarOrbe(o) {
  if (!o.activo || !enVista(o.x, o.y, 120)) return;
  const R = o.r * (1 + 0.12 * Math.sin(t * 5 + o.fase)) * Math.min(1, (t - o.nace) / 0.5 + 0.2);
  const halo = ctx.createRadialGradient(o.x, o.y, R * 0.3, o.x, o.y, R * 3.2);
  halo.addColorStop(0, "rgba(100,200,255,.6)"); halo.addColorStop(1, "rgba(40,120,255,0)");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(o.x, o.y, R * 3.2, 0, Math.PI * 2); ctx.fill();
  const nuc = ctx.createRadialGradient(o.x - R * 0.3, o.y - R * 0.3, R * 0.1, o.x, o.y, R);
  nuc.addColorStop(0, "#ffffff"); nuc.addColorStop(0.45, "#7fd4ff"); nuc.addColorStop(1, "#1f7bff");
  ctx.fillStyle = nuc; ctx.strokeStyle = "rgba(210,240,255,.9)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(o.x, o.y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}
function dibujarPortal(p) {
  if (!enVista(p.x, p.y, p.r * 3)) return;
  const resta = p.vence - t;
  const esc = Math.min(1, (t - p.nace) / 0.6) * Math.min(1, Math.max(0, resta) / 0.5);
  if (esc <= 0) return;
  const R = p.r * esc;
  ctx.save();
  if (resta < 5) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 12);       // parpadea antes de cerrarse
  const halo = ctx.createRadialGradient(p.x, p.y, R * 0.1, p.x, p.y, R * 2.4);
  halo.addColorStop(0, "rgba(150,90,255,.55)"); halo.addColorStop(1, "rgba(80,40,200,0)");
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(p.x, p.y, R * 2.4, 0, Math.PI * 2); ctx.fill();
  const hueco = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
  hueco.addColorStop(0, "#05010f"); hueco.addColorStop(0.7, "#1b0a45"); hueco.addColorStop(1, "#5a2fd0");
  ctx.fillStyle = hueco; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
  ctx.translate(p.x, p.y); ctx.lineCap = "round";
  ctx.rotate(t * 1.8); ctx.strokeStyle = "#c58bff"; ctx.lineWidth = 7; ctx.setLineDash([R * 0.6, R * 0.35]);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.rotate(-t * 3.6); ctx.strokeStyle = "#5ae6ff"; ctx.lineWidth = 5; ctx.setLineDash([R * 0.35, R * 0.3]);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}
function dibujarChispas() {
  if (!chispas.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const s of chispas) {
    const k = s.vida / s.max;
    ctx.globalAlpha = k * 0.85; ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ---------- Dibujo ----------
function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);                                // el canvas es transparente: fuera de la arena se ve la madera (sección 2)

  const z = cam.z;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - cam.x * z), dpr * (H / 2 - cam.y * z));
  const vx0 = cam.x - W / 2 / z, vx1 = cam.x + W / 2 / z, vy0 = cam.y - H / 2 / z, vy1 = cam.y + H / 2 / z;

  // Suelo y cuadrícula
  ctx.fillStyle = "#121a33"; ctx.fillRect(0, 0, MUNDO, MUNDO);
  ctx.strokeStyle = "#1c2748"; ctx.lineWidth = 2 / z > 3 ? 3 : 2 / z;
  ctx.beginPath();
  const G = 120;
  for (let x = Math.max(0, Math.floor(vx0 / G) * G); x <= Math.min(MUNDO, vx1); x += G) { ctx.moveTo(x, Math.max(0, vy0)); ctx.lineTo(x, Math.min(MUNDO, vy1)); }
  for (let y = Math.max(0, Math.floor(vy0 / G) * G); y <= Math.min(MUNDO, vy1); y += G) { ctx.moveTo(Math.max(0, vx0), y); ctx.lineTo(Math.min(MUNDO, vx1), y); }
  ctx.stroke();
  ctx.strokeStyle = "#ff5c7a"; ctx.lineWidth = 8; ctx.strokeRect(0, 0, MUNDO, MUNDO);

  // Comida (solo las casillas que se ven)
  const cx0 = Math.max(0, Math.floor(vx0 / CASILLA)), cx1 = Math.min(GW - 1, Math.floor(vx1 / CASILLA));
  const cy0 = Math.max(0, Math.floor(vy0 / CASILLA)), cy1 = Math.min(GW - 1, Math.floor(vy1 / CASILLA));
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
    for (const p of casillas[cy * GW + cx]) {
      ctx.fillStyle = p.col;
      let px = p.x, py = p.y, rr = 6;
      if (p.extra) {                                          // puntitos de las bolas azules: salen disparados y parpadean al vencer
        rr = 7.5;
        const k = Math.min(1, (t - p.nace) / 0.45);
        if (k < 1) { const e = 1 - (1 - k) * (1 - k); px = p.x0 + (p.x - p.x0) * e; py = p.y0 + (p.y - p.y0) * e; }
        if (t > p.vence - 5 && (Math.floor(t * 8) % 2)) continue;
      }
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Portales, bolas azules y destellos (debajo de las células)
  for (const p of portales) dibujarPortal(p);
  for (const o of orbes) dibujarOrbe(o);
  dibujarChispas();

  // Células: las chicas primero para que las grandes queden encima
  const orden = cuerpos.filter((c) => c.x + c.r > vx0 && c.x - c.r < vx1 && c.y + c.r > vy0 && c.y - c.r < vy1).sort((a, b) => a.m - b.m);
  for (const c of orden) {
    const d = c.dueno, mia = d === jug;
    ctx.fillStyle = "hsl(" + d.h + ",70%,52%)";
    ctx.strokeStyle = mia ? "rgba(255,255,255,.9)" : "hsl(" + d.h + ",70%,34%)";
    ctx.lineWidth = Math.max(3, c.r * 0.07);
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (c.r * z > 13) {
      const tam = Math.max(12, Math.min(c.r * 0.55, 60));
      ctx.font = "800 " + tam + "px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.lineWidth = tam * 0.14; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.lineJoin = "round";
      ctx.strokeText(d.nombre, c.x, c.y); ctx.fillStyle = "#fff"; ctx.fillText(d.nombre, c.x, c.y);
    }
  }

  // Capa de pantalla
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Tabla de posiciones
  const alto = 22 + tabla.length * 18, aLaDerecha = W >= 640 || W > H;   // en celular vertical la tabla va abajo a la izquierda (arriba no cabe junto a la barra y los cuadros)
  const bx = aLaDerecha ? W - 160 : 16, by = aLaDerecha ? 48 : H - 100 - alto;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.roundRect(bx - 6, by, 156, alto, 10); ctx.fill();
  ctx.font = "700 13px system-ui, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillStyle = "#fff"; ctx.fillText("Mejores", bx + 72, by + 12);
  tabla.forEach((f, i) => {
    const y = by + 31 + i * 18;
    ctx.fillStyle = f.yo ? "#ffe066" : "#e6ebff"; ctx.font = (f.yo ? "800 " : "600 ") + "12px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.fillText((i < 8 ? i + 1 : rango) + ". " + f.nombre.slice(0, 11), bx, y);
    ctx.textAlign = "right"; ctx.fillText(String(Math.round(f.m)), bx + 144, y);
  });

  // Minimapa
  if (estado === "jugando") {
    const S = 96, mx = W - S - 12, my = H - S - 64, k = S / MUNDO;
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(mx, my, S, S);
    ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, S, S);
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.strokeRect(mx + Math.max(0, vx0) * k, my + Math.max(0, vy0) * k, Math.min(MUNDO, vx1 - Math.max(0, vx0)) * k, Math.min(MUNDO, vy1 - Math.max(0, vy0)) * k);
    ctx.fillStyle = "#ffe066";
    for (const c of jugCeldas) { ctx.beginPath(); ctx.arc(mx + c.x * k, my + c.y * k, 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#4db8ff";
    for (const o of orbes) if (o.activo) { ctx.beginPath(); ctx.arc(mx + o.x * k, my + o.y * k, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#c58bff";
    for (const p of portales) { ctx.beginPath(); ctx.arc(mx + p.x * k, my + p.y * k, 3.5, 0, Math.PI * 2); ctx.fill(); }
  }

  // Joystick táctil
  if (joy) {
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 70, 0, Math.PI * 2); ctx.stroke();
    const l = Math.min(70, Math.hypot(joy.x - joy.ox, joy.y - joy.oy)), a = Math.atan2(joy.y - joy.oy, joy.x - joy.ox);
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * l, joy.oy + Math.sin(a) * l, 22, 0, Math.PI * 2); ctx.fill();
  }
}


// ============================================================================================================================================
// INICIO CON MAPA (ESTANDARES-juegos.md, sección 13): pantalla de inicio · mapa de países · Modo libre · pausa · Ajustes · sesión y nube
// ============================================================================================================================================

// Aviso corto flotante (el juego no usa alert ni confirm)
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

// ----- Monedas (chip dorado, sección 3): las dan los niveles, solo la primera vez. Aún no hay niveles, así que valen 0 -----
const fmtNum = (x) => Number(x).toLocaleString("es-MX");
function totalMonedas() { let s = 0; for (let i = 0; i < prog.hechos; i++) s += monedasDe(i); return s; }
function pintarMonedas() {
  const ico = document.createElement("span");
  ico.className = "moneda";                                  // moneda dibujada con CSS (compartido/inmersivo.css)
  $("monedas").replaceChildren(ico, document.createTextNode(fmtNum(totalMonedas())));
}
// El chip vive arriba a la derecha (bajo la sesión) y, dentro de una partida, pasa a la izquierda de la barra de arriba al centro
function ubicarMonedas() {
  const chip = $("monedas"), enBarra = !$("barra-fila").hidden;
  const destino = enBarra ? $("barra-fila") : document.querySelector(".hud-der");
  if (chip.parentNode === destino) return;
  if (enBarra) destino.prepend(chip); else destino.appendChild(chip);
}

// ----- Mapa de niveles (13.4): 195 países × 20 niveles. Se ve el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos -----
let mapaEnPrincipal = true;                                   // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  etiquetaContinuar: () => (hechoMax() === 0 ? "▶ Jugar" : "▶ Continuar"),
  unPais: true,
  columnas: 4,                                                // los 20 niveles de un país: 4 columnas × 5 filas
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],
  alInfo: () => abrirInfo(),                                  // ℹ️ Info: cómo se juega
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },
  progreso: () => { const h = hechoMax(); return { hecho: h, max: Math.min(TOTAL, h + 1) }; },
  jugarNivel: (n) => jugarNivel(n - 1),
  infoNivel: (n) => (NIVELES[n - 1] ? { sub: "", aria: "" } : { sub: "🚧", aria: "todavía no está creado" }),   // 🚧 mientras el nivel no exista
});
// n = nivel cuya etapa se abre (por defecto, el que toca); alcanzado = true abre la vista principal de su zona (se ve subir el agua)
function abrirMapa(n, alcanzado) { mostrar("pantalla-niveles"); mapa.abrir(n || Math.min(TOTAL, hechoMax() + 1), alcanzado); }

// ----- Pantallas -----
// «pantalla-inicio» se ve UNA sola vez, al abrir. Después el menú principal es el MAPA: «inicio» siempre significa abrir el mapa (13.1).
function pintarBotonMenu() {
  const enMapa = mapa.abierto(), enJuego = pantalla === "juego";
  $("btn-menu").hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);   // oculto en el inicio y en la vista principal del mapa; en sus vistas internas vuelve «Atrás»
  const texto = enMapa ? "Atrás" : enJuego && modo === "libre" && estado === "jugando" ? "Pausa" : "Volver al menú principal";
  $("btn-menu").innerHTML = '<span class="b-ico">☰</span>';   // cuadrado, solo icono: el texto va en title y aria-label
  $("btn-menu").title = texto; $("btn-menu").setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  if (nombre === "inicio") { abrirMapa(); return; }
  const enJuego = nombre === "juego";
  if (!enJuego && estado !== "inicio") abandonar();
  pantalla = nombre;
  for (const p of ["pantalla-inicio", "pantalla-libre"]) $(p).hidden = p !== nombre;
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  lienzo.hidden = !enJuego;
  $("barra-fila").hidden = $("barra-juego").hidden = $("cuadros").hidden = !enJuego;
  $("btn-mapa-juego").hidden = modo === "libre";              // el 🗺️ solo en los niveles
  if (!enJuego) { $("fin").hidden = true; $("dividir").classList.remove("activo"); }
  ubicarMonedas(); pintarMonedas(); pintarBotonMenu();
  if (nombre === "pantalla-libre") pintarLibre();
}

// ----- Modo libre (13.7): Dificultad (5 emojis), nombre y ▶ Jugar -----
function pintarLibre() {
  const df = $("dif-fila");
  df.replaceChildren();
  DIFICULTADES.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (i === libreDif ? "b-oro on" : "b-cielo");
    b.innerHTML = '<span class="b-ico">' + d.emoji + "</span>";
    b.title = d.nombre; b.setAttribute("aria-label", d.nombre); b.setAttribute("aria-pressed", String(i === libreDif));
    b.addEventListener("click", () => { libreDif = i; guardarLibre(); pintarLibre(); });
    df.appendChild(b);
  });
  const d = DIFICULTADES[libreDif];
  $("dif-nombre").textContent = d.emoji + " " + d.nombre + " · " + d.nota;
  $("nota-libre").textContent = PUNTOS_LIBRE
    ? "Sumas puntos para tu perfil según tu masa máxima (1 por cada " + PUNTOS_POR_MASA + " de masa, menos el primero). No da monedas."
    : "Aquí no hay monedas ni puntos de perfil: solo se guarda tu masa máxima.";
  const r = prog.libre[libreDif];
  $("libre-record").textContent = r ? "🏆 Récord " + d.emoji + ": " + fmtNum(r) + " de masa" : "🏆 Aún sin récord en esta dificultad";
}

// ----- Empezar una partida -----
function jugarNivel(i) {
  if (!(i >= 0 && i < TOTAL) || i > hechoMax()) return;
  if (!NIVELES[i]) { aviso("🚧 Los niveles todavía no están creados"); return; }
  aviso("🚧 Este nivel todavía no se puede jugar");           // las mecánicas de los niveles se definen después (sección 10); aquí se armará la partida con modo = "nivel"
}
function jugarLibre() {
  modo = "libre"; cfg = DIFICULTADES[libreDif]; guardarLibre();
  mostrar("juego");
  $("nombre-nivel").textContent = "♾️ Modo libre " + cfg.emoji;
  $("barra-juego").setAttribute("aria-label", "Modo libre " + cfg.nombre);
  iniciar();
}

// ----- Ventanas con el estilo de la pausa (.pausa-fondo + .pausa-panel): Ajustes e Info. No usan confirm() -----
function ventana(titulo, alCerrar) {
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const foco = document.activeElement;
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", titulo);
  const panel = el("div", "pausa-panel aj-panel");
  const nota = el("p", "aj-nota"); nota.setAttribute("role", "status"); nota.hidden = true;
  const lista = el("div", "pausa-opciones");
  panel.append(el("h2", "", titulo), nota, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  let ocupado = false;
  const tecla = (e) => { if (e.key === "Escape" && !ocupado) { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true);
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
    if (alCerrar) alCerrar();
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
  const texto = (t) => { const p = el("p", "aj-nota", t); panel.insertBefore(p, lista); };
  const decir = (t) => { nota.textContent = t; nota.hidden = !t; };
  const cerrarB = () => { const c = boton("", "Cerrar", "b-cielo", () => cerrar()); c.firstChild.remove(); return c; };
  try { setTimeout(() => { const b = lista.querySelector("button"); if (b) b.focus({ preventScroll: true }); }, 0); } catch (e) {}
  return { boton, texto, decir, cerrar, cerrarB, lista, ocupado: (v) => { ocupado = v; } };
}

// ℹ️ Cómo se juega (desde el mapa y desde la pausa)
function abrirInfo(alCerrar) {
  const v = ventana("ℹ️ Cómo se juega", alCerrar);
  v.texto("Come puntitos y células más pequeñas para crecer. Si una más grande que tú te toca, te come. Hay bots jugando en un mapa enorme.");
  v.texto("Las bolas azules brillantes sueltan un montón de puntitos al tocarlas, y los portales morados te llevan a otra parte del mapa (se ven en el minimapa).");
  v.texto("Celular: arrastra el dedo para moverte y toca ✂️ para dividirte. Computadora: mueve el mouse o usa las flechas/WASD; barra espaciadora para dividirte.");
  v.boton("", "Entendido", "b-verde", () => v.cerrar()).firstChild.remove();
}

// ----- Instalar SOLO este juego (manifest-agario.webmanifest + sw-agario.js; no baja ningún otro juego del portal) -----
// ES_APP_SOLA = abierto desde SU PROPIO ícono instalado (start_url trae «?app=1»; se recuerda en sessionStorage por si se recarga). Ahí el portal no existe:
// se oculta 🎮 (llevaría fuera del alcance de la app) y «Sin sesión» pasa a ser un botón para iniciar sesión (sin portal no habría dónde hacerlo).
// Abierto dentro de la app del portal o en el navegador, todo sigue como siempre.
const ES_APP_SOLA = (() => {
  try { if (new URLSearchParams(location.search).has("app")) sessionStorage.setItem("agario_app", "1"); } catch (e) {}
  let marca = false; try { marca = sessionStorage.getItem("agario_app") === "1"; } catch (e) {}
  return marca && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true);
})();
if (ES_APP_SOLA) $("btn-portal").hidden = true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-agario.js", { scope: "./" }).catch(() => {});

const yaEnApp = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
let eventoInstalar = (window.__pwa && window.__pwa.evento) || null;
let notaInstalar = () => {};                      // la fija la ventana de Ajustes mientras está abierta (muestra el mensaje ahí dentro)
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; });
addEventListener("appinstalled", () => { eventoInstalar = null; notaInstalar("✅ Listo: busca «Agario» en tu pantalla de inicio."); });
async function instalarJuego() {
  if (eventoInstalar) { const e = eventoInstalar; eventoInstalar = null; e.prompt(); await e.userChoice.catch(() => {}); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
  notaInstalar(ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
    : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
    : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.");
}

// ----- BORRAR TODO EL HISTORIAL (solo pruebas: ver MOSTRAR_BORRAR_HISTORIAL) -----
// Borra en este dispositivo el progreso (niveles, monedas, récords), la dificultad elegida y los puntos pendientes de este juego y, con sesión, deja vacío el progreso de la cuenta
// (si no, la sincronización lo volvería a traer). NO toca los puntos que el perfil del portal ya recibió. Devuelve true (también en la cuenta), false (no se pudo en la cuenta) o null (sin sesión).
async function borrarHistorial() {
  reiniciando = true;
  const vacio = { v: VERSION_PROG, hechos: 0, libre: {} };
  prog = vacio;
  try { for (const k of [CLAVE, CLAVE_LIBRE, "agario_record"]) localStorage.removeItem(k); } catch (e) {}
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

// ----- ⚙️ Ajustes (13.8), solo desde la pantalla de inicio: instalar solo este juego, copia de seguridad y, mientras duren las pruebas, borrar el historial -----
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const v = ventana("⚙️ Ajustes", () => { ajustesAbierto = false; notaInstalar = () => {}; });
  notaInstalar = v.decir;
  if (!yaEnApp) v.boton("📲", "Instalar solo este juego", "b-azulmarino", instalarJuego);   // ya dentro de una app instalada no tiene sentido ofrecerlo
  v.boton("💾", "Copia de seguridad", "b-azul", async () => {
    v.cerrar();
    try { (await import("../compartido/almacen.js")).abrirPanelCopias(); } catch (e) { aviso("No se pudo abrir la copia de seguridad."); }
  });
  if (MOSTRAR_BORRAR_HISTORIAL) {
    const TXT = "Borrar todo el historial y reiniciar";
    let ocupado = false;
    const borrar = v.boton("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) {                          // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        v.decir("Se borran niveles, monedas y récords (en este dispositivo y en tu cuenta). Es solo para pruebas.");
        setTimeout(() => { if (!ocupado) { delete borrar.dataset.seguro; borrar.lastChild.textContent = TXT; } }, 5000);
        return;
      }
      ocupado = true; v.ocupado(true);
      for (const b of v.lista.querySelectorAll("button")) b.disabled = true;
      v.decir("Borrando…");
      const enNube = await borrarHistorial();
      v.decir(enNube === false ? "Se borró en este dispositivo, pero no se pudo borrar en tu cuenta: al iniciar sesión se volverá a bajar. Reinténtalo con internet." : "✅ Listo. Reiniciando el juego…");
      setTimeout(() => location.reload(), enNube === false ? 3500 : 900);
    });
  }
  v.cerrarB();
}

// ----- Pausa (13.6 y 13.7) -----
// Mientras la ventana está abierta el mundo se congela (pausado) y sigue donde iba al reanudar.
const alAbrirPausa = () => { pausado = true; joy = null; };
const alContinuarPausa = () => { pausado = false; };
const pausaLibre = crearMenuPausa({                          // Modo libre: botón verde con el nombre o ☰
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir dificultad",
  ayudaSalir: "La partida termina; se guarda tu masa máxima.",
  puedeAbrir: () => pantalla === "juego" && modo === "libre" && estado === "jugando",
  alAbrir: alAbrirPausa,
  alContinuar: alContinuarPausa,
  extras: () => [{ icono: "ℹ️", texto: "Cómo se juega", clase: "b-cielo", alElegir: () => abrirInfo(() => pausaLibre.abrir()) }],   // al cerrar Info vuelve la pausa (el mundo sigue congelado)
  alSalir: () => { pausado = false; mostrar("pantalla-libre"); },
});
const pausaSalir = crearMenuPausa({                          // niveles (cuando existan): «¿Salir?»
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este nivel.",
  puedeAbrir: () => pantalla === "juego" && modo === "nivel" && estado === "jugando",
  alAbrir: alAbrirPausa,
  alContinuar: alContinuarPausa,
  alSalir: () => { pausado = false; mostrar("inicio"); },
});
$("barra-juego").addEventListener("click", () => (modo === "libre" ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir());

// ----- Botones -----
// Jugar = el nivel que toca; mientras no se haya pasado ninguno abre el mapa en el nivel 1 (con ▶ Jugar en su centro).
$("btn-inicio-jugar").addEventListener("click", () => { if (hechoMax() === 0) abrirMapa(1); else jugarNivel(Math.min(TOTAL, hechoMax() + 1) - 1); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", abrirAjustes);
$("btn-libre-jugar").addEventListener("click", jugarLibre);
$("otra").addEventListener("click", jugarLibre);                                  // misma dificultad y nombre
$("fin-cambiar").addEventListener("click", () => mostrar("pantalla-libre"));
$("nombre").addEventListener("keydown", (e) => { if (e.key === "Enter") jugarLibre(); });
// ☰ (13.3): vista interna del mapa → «Atrás»; partida libre → Pausa; nivel → «¿Salir?»; el resto → menú principal (el mapa)
$("btn-menu").addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else if (pantalla === "juego" && modo === "libre" && estado === "jugando") pausaLibre.abrir();
  else if (pantalla === "juego" && modo === "nivel") pausaSalir.abrir();
  else mostrar("inicio");
});
function volcar() { if (estado === "jugando") enviarPerfil(); if (sucio) guardarProg(); }
document.addEventListener("visibilitychange", () => { if (document.hidden) volcar(); });
window.addEventListener("pagehide", volcar);

// ----- Sesión y nube (opcionales: si Firebase no carga, el juego igual funciona) -----
let haySesion = false;
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => {
    haySesion = !!u;
    $("sesion").textContent = u ? (u.displayName || "Jugador") : ES_APP_SOLA ? "👤 Iniciar sesión" : "Sin sesión";
    $("sesion").classList.toggle("tocable", ES_APP_SOLA && !u);
  })
).catch(() => {});
$("sesion").addEventListener("click", async () => {   // solo en la app instalada sola: abre el acceso con Google
  if (!ES_APP_SOLA || haySesion) return;
  try { await (await import("../compartido/jugador.js")).entrar(); }
  catch (e) { aviso("No se pudo iniciar sesión. Revisa tu conexión."); }
});
// Niveles pasados: gana el más alto. Récords del Modo libre: gana el mayor de cada dificultad.
const mayor = (x, y) => Math.max(Number(x) || 0, Number(y) || 0);
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => {
      if (reiniciando) return null;                           // se está borrando todo: no se une nada
      a = limpiar(a); b = limpiar(b);                         // también entiende el formato viejo (solo un número)
      if (!a && !b) return null;
      const libre = {};
      for (let d = 0; d < DIFICULTADES.length; d++) { const r = mayor(a && a.libre[d], b && b.libre[d]); if (r > 0) libre[d] = r; }
      return { v: VERSION_PROG, hechos: mayor(a && a.hechos, b && b.hechos), libre };
    },
    alCambiar: (v) => {
      prog = limpiar(v) || prog;
      mapa.refrescar();                                       // si el mapa está abierto, se redibuja con el progreso de la cuenta
      if (pantalla === "pantalla-libre") pintarLibre();
      pintarMonedas(); pintarRecord();
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});

// ---------- Ciclo ----------
let ultimo = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  if (pantalla !== "juego") return;                           // en el inicio, el Modo libre y el mapa no se calcula ni se dibuja nada
  if (!pausado) actualizar(dt);
  dibujar();
}

try { $("nombre").value = localStorage.getItem("agario_nombre") || ""; } catch (e) {}
mostrar("pantalla-inicio");                                   // única vez que se ve: al abrir el juego
requestAnimationFrame(cuadro);
