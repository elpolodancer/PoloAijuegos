// Ruta: pantano/juego-pantano.js (lógica del juego «pantano»: defiende la cabaña disparando a los bichos del pantano)
// Proyecto: Juegos (portal). PAQUETES 1 a 5: disparo, enemigos (de tierra y voladores), jefes cada 5 oleadas, monedas, tienda, 4 armas, gráficos/animaciones y campaña de 5 niveles con fondos y misiones.
// La sesión y los puntos se cargan aparte (más abajo): si Firebase no está disponible (sin conexión la primera vez) el juego igual funciona.
// Local primero, nube después: los puntos van a la cola local (encolarPuntos) y se envían cuando hay sesión e internet; monedas, mejoras, armas, niveles y récord
// se guardan en el dispositivo (claves de siempre) y se copian en «pantano_nube» para sincronizarlos con la cuenta (compartido/progreso.js).
import { encolarPuntos } from "../compartido/cola-puntos.js";

const ID = "pantano"; // el mismo id de juegos.js (colección de puntos en Firestore)

// ---------- Ajustes (cámbialos a gusto) ----------
const CABANA_VIDA = 100;
const CARGADOR = 15;          // balas por cargador
const RECARGA = 1.4;          // segundos para recargar (automática al vaciarse)
const CADENCIA = 0.18;        // segundos entre disparos
const VEL_BALA = 800;         // px/s
const DANO_BALA = 1;
const PUNTOS_POR_PERFIL = 20; // al perfil se envía 1 punto por cada 20 del juego
const CLAVE_MEJOR = "pantano_mejor";
const CLAVE_MONEDAS = "pantano_monedas"; // monedas guardadas (las usará la tienda del paquete 2)
const SUELO_MIN = 270, SUELO_MAX = 335;  // franja por donde caminan los enemigos
const CABANA_X = 100;                    // los enemigos se detienen aquí a morder la cabaña
// Tipos de enemigo: vida, velocidad (px/s), daño por mordida, monedas, puntos, tamaño, color, desde qué oleada salen
const TIPOS = {
  rana:      { hp: 3, vel: 42, dano: 4,  monedas: 1, puntos: 10, w: 30, h: 24, color: "#5fbf4a", desde: 1 },
  serpiente: { hp: 2, vel: 85, dano: 3,  monedas: 2, puntos: 20, w: 38, h: 14, color: "#c9a227", desde: 2 },
  cocodrilo: { hp: 9, vel: 28, dano: 10, monedas: 4, puntos: 40, w: 62, h: 28, color: "#3f7d3a", desde: 3 },
  // Voladores (vuela: true): se quedan en el aire junto a la cabaña y la atacan desde ahí
  murcielago: { hp: 2, vel: 70, dano: 3, monedas: 2, puntos: 20, w: 30, h: 16, color: "#6a4c93", desde: 2, vuela: true },
  buitre:     { hp: 6, vel: 48, dano: 6, monedas: 4, puntos: 40, w: 44, h: 22, color: "#8a6d5a", desde: 4, vuela: true },
  // Jefes (jefe: true): salen solos cada 5 oleadas (oleada 5, 15… el Rey Cocodrilo; oleada 10, 20… el Rey Buitre)
  reyCocodrilo: { nombre: "Rey Cocodrilo", hp: 40, vel: 18, dano: 15, monedas: 40, puntos: 400, w: 120, h: 56, color: "#2c5f2e", desde: 5, jefe: true },
  reyBuitre:    { nombre: "Rey Buitre", hp: 36, vel: 22, dano: 12, monedas: 40, puntos: 400, w: 110, h: 44, color: "#6e4b3a", desde: 10, jefe: true, vuela: true },
};

// Tienda: las mejoras y las monedas se guardan en el dispositivo. Precio = base × 1,7 por cada nivel ya comprado.
const MAXNIV = 5;
const COSTO_REPARAR = 15;     // reparar 30 de vida de la cabaña (solo entre oleadas)
const CLAVE_MEJORAS = "pantano_mejoras";
const MEJORAS = {
  dano:     { nombre: "🔫 Daño", desc: "+50 % de daño por bala", base: 20 },
  cadencia: { nombre: "⚡ Cadencia", desc: "Disparas más rápido", base: 25 },
  cargador: { nombre: "🎒 Cargador", desc: "+30 % de balas por cargador", base: 20 },
  recarga:  { nombre: "🔄 Recarga", desc: "Recarga 10 % más rápida", base: 20 },
  cabana:   { nombre: "🏠 Cabaña", desc: "+25 de vida máxima", base: 25 },
};

// Armas (se compran y se equipan en la tienda; las mejoras de arriba se aplican a la que lleves puesta).
// balas = proyectiles por disparo, disp = dispersión en radianes, alcance = px máximos (0 = sin límite), perfora = enemigos que atraviesa
const ARMAS = {
  pistola:    { nombre: "Pistola", icono: "🔫", desc: "Equilibrada: 15 balas y dispara rápido.", precio: 0, dano: DANO_BALA, cargador: CARGADOR, recarga: RECARGA, cadencia: CADENCIA, balas: 1, disp: 0, vel: VEL_BALA, alcance: 0, perfora: 1, r: 3, largo: 30, grosor: 6, color: "#222" },
  escopeta:   { nombre: "Escopeta", icono: "💥", desc: "6 perdigones en abanico, alcance corto: ideal contra grupos cerca.", precio: 120, dano: 1, cargador: 6, recarga: 2, cadencia: 0.75, balas: 6, disp: 0.32, vel: 750, alcance: 300, perfora: 1, r: 2.5, largo: 38, grosor: 8, color: "#6b4a2b" },
  rifle:      { nombre: "Rifle", icono: "🎯", desc: "Potente y lento: cada bala atraviesa hasta 3 enemigos.", precio: 220, dano: 4, cargador: 5, recarga: 1.8, cadencia: 0.6, balas: 1, disp: 0, vel: 1100, alcance: 0, perfora: 3, r: 3.5, largo: 42, grosor: 5, color: "#3a3a4a" },
  ametralladora: { nombre: "Ametralladora", icono: "🔥", desc: "Ráfagas rapidísimas con 40 balas, algo imprecisa.", precio: 350, dano: 0.6, cargador: 40, recarga: 2.2, cadencia: 0.07, balas: 1, disp: 0.1, vel: 900, alcance: 0, perfora: 1, r: 2.5, largo: 36, grosor: 7, color: "#444" },
};
const CLAVE_ARMAS = "pantano_armas";

// Campaña: cada nivel = OLAS_NIVEL oleadas (la última trae al jefe) con su propio fondo, enemigos, dificultad y misión extra.
// tipos = enemigos que salen en ese nivel; mult = multiplica la vida de los enemigos; jefe = clave de TIPOS.
// mision: tipo "vida" (la cabaña nunca baja de esa fracción), "mata" (cuenta(e) decide qué cuenta) o "puntos".
// tema: colores del fondo (cielo [arriba, medio, horizonte], astro, árboles, agua, barro...) y fx (efecto animado).
const OLAS_NIVEL = 5;
const CLAVE_PROGRESO = "pantano_progreso";
const NIVELES = [
  { nombre: "Pantano", tipos: ["rana", "serpiente"], mult: 1, jefe: "reyCocodrilo",
    mision: { texto: "Que la cabaña nunca baje del 50 % de vida", tipo: "vida", meta: 0.5 },
    tema: { cielo: ["#14213d", "#2f5d62", "#a3b87a"], estrellas: true, astro: { x: 540, y: 62, r: 16, color: "#fff7d6", brillo: "255,250,220" }, arboles: ["#1d3b3a", "#16302a"], copas: true, musgo: "rgba(120,150,110,.5)", agua: ["#2f6f6a", "#1d4a47"], barro: ["#7b5a33", "#4b3520"], pasto: "#4f7a3a", fx: "luciernagas", fxColor: "220,255,120", niebla: 0.07 } },
  { nombre: "Atardecer", tipos: ["rana", "serpiente", "murcielago"], mult: 1.3, jefe: "reyBuitre",
    mision: { texto: "Derrota 8 voladores", tipo: "mata", meta: 8, nombre: "Voladores", cuenta: (e) => e.t.vuela && !e.t.jefe },
    tema: { cielo: ["#3b2a5c", "#c4576a", "#f4a259"], estrellas: false, astro: { x: 470, y: 150, r: 24, color: "#ffd9a0", brillo: "255,190,120" }, arboles: ["#3a2a3d", "#2a1f2e"], copas: true, musgo: "rgba(190,120,130,.5)", agua: ["#9c5a6a", "#5a3550"], barro: ["#6e4a2e", "#3f2a1a"], pasto: "#6a7a3a", fx: "luciernagas", fxColor: "255,210,120", niebla: 0.05 } },
  { nombre: "Niebla", tipos: ["rana", "serpiente", "cocodrilo", "murcielago"], mult: 1.6, jefe: "reyCocodrilo",
    mision: { texto: "Derrota 6 cocodrilos", tipo: "mata", meta: 6, nombre: "Cocodrilos", cuenta: (e) => e.tipo === "cocodrilo" },
    tema: { cielo: ["#2b3a3a", "#506560", "#8fa398"], estrellas: false, astro: { x: 520, y: 70, r: 14, color: "#dfe6df", brillo: "220,230,220" }, arboles: ["#242d2b", "#1a211f"], copas: false, musgo: "rgba(150,160,150,.45)", agua: ["#4a6a66", "#2f4745"], barro: ["#5c4a33", "#352a1c"], pasto: "#5b6b45", fx: "niebla", fxColor: "220,230,220", niebla: 0.16 } },
  { nombre: "Ciénaga", tipos: ["rana", "serpiente", "murcielago", "buitre", "cocodrilo"], mult: 1.9, jefe: "reyBuitre",
    mision: { texto: "Derrota 10 voladores", tipo: "mata", meta: 10, nombre: "Voladores", cuenta: (e) => e.t.vuela && !e.t.jefe },
    tema: { cielo: ["#0b1f1a", "#14463a", "#3f8f5a"], estrellas: true, astro: { x: 540, y: 62, r: 15, color: "#d8ffd8", brillo: "170,255,170" }, arboles: ["#0f2a24", "#0a1d19"], copas: true, musgo: "rgba(120,255,150,.35)", agua: ["#37c26b", "#146b3b"], barro: ["#3c4a2e", "#1f2a1b"], pasto: "#59a04a", fx: "burbujas", fxColor: "150,255,170", niebla: 0.06 } },
  { nombre: "Cenizas", tipos: ["rana", "serpiente", "murcielago", "buitre", "cocodrilo"], mult: 2.3, jefe: "reyCocodrilo",
    mision: { texto: "Consigue 2500 puntos", tipo: "puntos", meta: 2500 },
    tema: { cielo: ["#1a0b0b", "#6e1f14", "#e8742a"], estrellas: false, astro: { x: 540, y: 100, r: 24, color: "#ffb27a", brillo: "255,120,60" }, arboles: ["#1e1210", "#140b0a"], copas: false, musgo: "rgba(255,120,60,.25)", agua: ["#d4491b", "#7a1e0c"], barro: ["#3a2a26", "#1c1311"], pasto: "#7a4a2a", fx: "brasas", fxColor: "255,170,70", niebla: 0.05 } },
];

// ---------- Elementos ----------
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const panelMenu = $("panel"), estadoTxt = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar"), zonaTienda = $("tienda"), zonaNiveles = $("niveles");
cv.style.touchAction = "none";

// ---------- Estado ----------
const GX = 84, GY = 232; // punta del arma
let usuario = null, estado = "inicio"; // inicio | jugando | fin
let enemigos = [], balas = [], textos = [];
let objetivo = { x: 400, y: 250 }, apuntando = false, enfriar = 0;
let balasCargador = CARGADOR, recargando = 0;
let vida = CABANA_VIDA, puntos = 0, monedas = 0, ganadas = 0, mejor = 0; // monedas = tu billetera guardada; ganadas = las de esta partida
let mej = { dano: 0, cargador: 0, recarga: 0, cadencia: 0, cabana: 0 };
let armasMias = ["pistola"], armaId = "pistola"; // armas compradas y la que llevas puesta
let nivelSel = 1, nivel = 1, minVida = 1, misionProg = 0, progreso = { desbloqueado: 1, estrellas: {} }; // nivelSel = el elegido; nivel = el que se juega
let oleada = 1, porSalir = 0, salidos = 0, temporizador = 0, jefeEnCamino = false, ultimo = 0, audio = null, sacudida = 0;

try { mejor = parseInt(localStorage.getItem(CLAVE_MEJOR), 10) || 0; } catch (e) {}
try { monedas = parseInt(localStorage.getItem(CLAVE_MONEDAS), 10) || 0; } catch (e) {}
try { Object.assign(mej, JSON.parse(localStorage.getItem(CLAVE_MEJORAS)) || {}); } catch (e) {}
for (const k in mej) mej[k] = Math.max(0, Math.min(MAXNIV, Math.floor(Number(mej[k])) || 0));
// Copia para la nube: «t» solo sube cuando cambia algo de verdad (así un dispositivo viejo, abierto sin jugar, no pisa lo de la cuenta)
const CLAVE_NUBE = "pantano_nube";
let nube = null, tNube = 0, firmaNube = "";
const firmaDatos = () => JSON.stringify([monedas, mej, armasMias, armaId, progreso.desbloqueado, progreso.estrellas, mejor]);
const guardar = () => {
  try { localStorage.setItem(CLAVE_MONEDAS, String(monedas)); localStorage.setItem(CLAVE_MEJORAS, JSON.stringify(mej)); localStorage.setItem(CLAVE_ARMAS, JSON.stringify({ mias: armasMias, puesta: armaId }));
    localStorage.setItem(CLAVE_PROGRESO, JSON.stringify({ desbloqueado: progreso.desbloqueado, estrellas: progreso.estrellas, sel: nivelSel }));
    const f = firmaDatos(), cambio = f !== firmaNube;
    if (cambio) { tNube = Date.now(); firmaNube = f; }
    localStorage.setItem(CLAVE_NUBE, JSON.stringify({ t: tNube, monedas, mej, armas: { mias: armasMias, puesta: armaId }, prog: { desbloqueado: progreso.desbloqueado, estrellas: progreso.estrellas }, mejor }));
    if (cambio && nube) nube.guardado();
  } catch (e) {}
};
try {
  const g = JSON.parse(localStorage.getItem(CLAVE_ARMAS)) || {};
  const ok = (g.mias || []).filter((id) => ARMAS[id]);
  armasMias = [...new Set(["pistola", ...ok])];
  if (ARMAS[g.puesta] && armasMias.includes(g.puesta)) armaId = g.puesta;
} catch (e) {}
try {
  const g = JSON.parse(localStorage.getItem(CLAVE_PROGRESO)) || {};
  progreso.desbloqueado = Math.max(1, Math.min(NIVELES.length, Math.floor(Number(g.desbloqueado)) || 1));
  progreso.estrellas = g.estrellas && typeof g.estrellas === "object" ? g.estrellas : {};
  nivelSel = Math.max(1, Math.min(progreso.desbloqueado, Math.floor(Number(g.sel)) || 1));
} catch (e) {}
// Primera vez con la copia para la nube: quien ya traía avance gana sobre una cuenta vacía; quien llega sin nada deja que mande la cuenta (t = 0)
try {
  const n = JSON.parse(localStorage.getItem(CLAVE_NUBE));
  const hay = monedas > 0 || mejor > 0 || armasMias.length > 1 || progreso.desbloqueado > 1 || Object.values(mej).some(Boolean);
  tNube = n ? Number(n.t) || 0 : hay ? Date.now() : 0;
} catch (e) {}
firmaNube = firmaDatos(); guardar();
// Valores finales según el arma puesta y las mejoras compradas
const arma = () => ARMAS[armaId];
const danoBala = () => arma().dano * (1 + 0.5 * mej.dano);
const cargadorMax = () => Math.round(arma().cargador * (1 + 0.3 * mej.cargador));
const tRecarga = () => arma().recarga * (1 - 0.1 * mej.recarga);
const cadencia = () => arma().cadencia * (1 - 0.08 * mej.cadencia);
const vidaMax = () => CABANA_VIDA + 25 * mej.cabana;
const mision = (n = nivel) => NIVELES[n - 1].mision;
const misionCumplida = () => {
  const M = mision();
  return M.tipo === "vida" ? minVida >= M.meta : M.tipo === "puntos" ? puntos >= M.meta : misionProg >= M.meta;
};

let entrarGoogle = null;
import("../compartido/jugador.js").then((m) => {
  entrarGoogle = m.entrar;
  m.alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
}).catch(() => {});
// Une dos copias: la más reciente manda en monedas y selección; lo que no se pierde nunca (niveles, estrellas, récord, mejoras y armas compradas) se junta de las dos
function unirPantano(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const nuevoB = (Number(b.t) || 0) > (Number(a.t) || 0), r = nuevoB ? b : a, o = nuevoB ? a : b;
  const u = { ...r };
  u.mej = { ...(r.mej || {}) };
  for (const k in o.mej || {}) u.mej[k] = Math.max(Number(u.mej[k]) || 0, Number(o.mej[k]) || 0);
  const mias = [...((r.armas && r.armas.mias) || [])];
  for (const id of (o.armas && o.armas.mias) || []) if (!mias.includes(id)) mias.push(id);
  u.armas = { mias, puesta: (r.armas && r.armas.puesta) || "pistola" };
  u.prog = { desbloqueado: Math.max(Number(r.prog && r.prog.desbloqueado) || 1, Number(o.prog && o.prog.desbloqueado) || 1), estrellas: { ...((o.prog && o.prog.estrellas) || {}), ...((r.prog && r.prog.estrellas) || {}) } };
  u.mejor = Math.max(Number(r.mejor) || 0, Number(o.mejor) || 0);
  return u;
}
// La nube trajo algo más nuevo: se pone en la partida (aunque sea en plena oleada, solo cambia la billetera y la tienda)
function aplicarNube(v) {
  try {
    monedas = Math.max(0, Math.floor(Number(v.monedas)) || 0);
    for (const k in mej) mej[k] = Math.max(0, Math.min(MAXNIV, Math.floor(Number(v.mej && v.mej[k])) || 0));
    armasMias = [...new Set(["pistola", ...((v.armas && v.armas.mias) || []).filter((id) => ARMAS[id])])];
    const p = v.armas && v.armas.puesta;
    if (ARMAS[p] && armasMias.includes(p) && p !== armaId) { armaId = p; recargando = 0; balasCargador = cargadorMax(); }
    progreso.desbloqueado = Math.max(1, Math.min(NIVELES.length, Math.floor(Number(v.prog && v.prog.desbloqueado)) || 1));
    const est = v.prog && v.prog.estrellas;
    progreso.estrellas = est && typeof est === "object" ? est : {};
    mejor = Math.max(0, Math.floor(Number(v.mejor)) || 0);
    nivelSel = Math.min(nivelSel, progreso.desbloqueado);
    vida = Math.min(vida, vidaMax()); balasCargador = Math.min(balasCargador, cargadorMax());
    tNube = Number(v.t) || tNube; firmaNube = firmaDatos();
    try { localStorage.setItem(CLAVE_MEJOR, String(mejor)); } catch (e) {}
    guardar(); ui();
  } catch (e) {}
}
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, { clave: CLAVE_NUBE, fusionar: unirPantano, alCambiar: aplicarNube });
}).catch(() => {});
btnEntrar.addEventListener("click", () => { if (entrarGoogle) entrarGoogle().catch((e) => { estadoTxt.textContent = e.message; }); });

// ---------- Sonido ----------
// En iPhone el audio solo se activa dentro de un toque: se prepara en el primer toque y se reanuda si quedó dormido
function activarAudio() { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch (e) {} }
function tono(f, d = 0.06, tipo = "square") {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = tipo; o.frequency.value = f;
    g.gain.setValueAtTime(0.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + d);
  } catch (e) {}
}

// ---------- Partida ----------
function empezarOleada() {
  jefeEnCamino = oleada === OLAS_NIVEL; // la última oleada del nivel trae al jefe (con menos enemigos normales)
  porSalir = (jefeEnCamino ? 4 + oleada : 5 + oleada * 3) + 2 * (nivel - 1); salidos = 0; temporizador = 1;
  estadoTxt.textContent = jefeEnCamino ? "⚠️ ¡Oleada de jefe!" : "";
}
function empezar() {
  enemigos = []; balas = []; textos = [];
  nivel = nivelSel; pintarFondo(nivel);
  vida = vidaMax(); puntos = 0; ganadas = 0; oleada = 1; misionProg = 0; minVida = 1; particulas = []; monedasVuelan = [];
  balasCargador = cargadorMax(); recargando = 0;
  estado = "jugando";
  jugar.hidden = true;
  empezarOleada();
  ui();
}
function nuevoEnemigo(clave) {
  const disp = NIVELES[nivel - 1].tipos;
  // los tipos más nuevos salen menos que la rana
  const k = clave || (Math.random() < 0.4 ? "rana" : disp[Math.floor(Math.random() * disp.length)]);
  const t = TIPOS[k];
  const y = t.vuela ? (t.jefe ? 160 + Math.random() * 30 : 80 + Math.random() * 120)
    : t.jefe ? 305 : SUELO_MIN + Math.random() * (SUELO_MAX - SUELO_MIN);
  const hp = Math.ceil(t.hp * (1 + 0.08 * (oleada - 1)) * NIVELES[nivel - 1].mult);
  enemigos.push({ tipo: k, t, x: W + (t.jefe ? 70 : 30), y, y0: y, hp, hpMax: hp, mordida: 0, golpe: 0, fase: Math.random() * 6 });
}
function texto(x, y, s, c) { textos.push({ x, y, s, c, v: 0.9 }); }
function matar(e) {
  puntos += e.t.puntos; monedas += e.t.monedas; ganadas += e.t.monedas; guardar();
  const M = mision(); if (M.cuenta && M.cuenta(e)) misionProg++;
  texto(e.x, e.y - e.t.h - 6, "+" + e.t.monedas + " 🪙", "#ffe14d");
  chispa(e.x, e.y - e.t.h / 2, e.t.jefe ? 45 : 14, e.t.color, e.t.jefe ? 220 : 150, 320);
  for (let i = 0; i < Math.min(e.t.monedas, 6); i++) monedasVuelan.push({ x0: e.x, y0: e.y - e.t.h, t: -i * 0.07 }); // monedas que vuelan al marcador
  if (e.t.jefe) { texto(W / 2, 130, "¡Jefe derrotado! 🏆", "#fff"); tono(392, 0.15); setTimeout(() => tono(523, 0.2), 150); }
  tono(260, 0.08, "sawtooth");
}
async function terminar(gano) {
  estado = "fin";
  let txt = "";
  if (gano) { // nivel superado: premio, siguiente nivel y misión extra
    const n = nivel, M = mision(), prem = 30 * n;
    puntos += 100 * n; monedas += prem; ganadas += prem;
    txt = "¡Nivel " + n + " superado! +" + prem + " 🪙. ";
    if (n === progreso.desbloqueado && n < NIVELES.length) { progreso.desbloqueado = n + 1; txt += "Desbloqueaste el nivel " + (n + 1) + ". "; }
    nivelSel = Math.min(progreso.desbloqueado, n + 1);
    if (misionCumplida()) {
      if (!progreso.estrellas[n]) { progreso.estrellas[n] = true; const b = 40 * n; monedas += b; ganadas += b; txt += "⭐ ¡Misión cumplida! +" + b + " 🪙. "; }
      else txt += "⭐ Misión cumplida. ";
    } else txt += "Misión no cumplida (" + M.texto + "). ";
    if (n === NIVELES.length) txt += "¡Terminaste la campaña! ";
    tono(523, 0.12); setTimeout(() => tono(659, 0.12), 130); setTimeout(() => tono(784, 0.25), 260);
  } else txt = "La cabaña cayó en el nivel " + nivel + ", oleada " + oleada + ". ";
  guardar();
  txt += "Hiciste " + puntos + " puntos y juntaste " + ganadas + " monedas.";
  if (puntos > mejor) {
    mejor = puntos; txt += " ¡Nuevo récord!";
    try { localStorage.setItem(CLAVE_MEJOR, String(mejor)); } catch (e) {}
    guardar(); // sube el récord a la cuenta
  }
  jugar.hidden = false; jugar.textContent = "Jugar otra vez";
  estadoTxt.textContent = txt;
  ui();
  const sumar = Math.floor(puntos / PUNTOS_POR_PERFIL);
  if (!sumar) return;
  encolarPuntos(ID, sumar); // primero a la cola del dispositivo: no se pierden aunque no haya sesión ni internet
  if (!usuario) { estadoTxt.textContent += " +" + sumar + " pendientes: se enviarán al entrar con Google."; return; }
  try {
    const pend = await (await import("../compartido/progreso.js")).vaciarPuntos();
    estadoTxt.textContent += pend ? " +" + sumar + " anotados: se enviarán al perfil en cuanto haya conexión." : " +" + sumar + " al perfil ✓";
  } catch (e) { estadoTxt.textContent += " +" + sumar + " anotados: se enviarán al perfil en cuanto haya conexión."; }
}

// ---------- Actualizar ----------
function disparar() {
  const A = arma(), base = Math.atan2(objetivo.y - GY, objetivo.x - GX);
  for (let i = 0; i < A.balas; i++) {
    // varios proyectiles: abanico parejo; uno solo: pequeña desviación al azar según la dispersión del arma
    const a = base + (A.balas > 1 ? (i / (A.balas - 1) - 0.5) * A.disp : (Math.random() - 0.5) * A.disp);
    balas.push({ x: GX + Math.cos(a) * A.largo, y: GY + Math.sin(a) * A.largo, vx: Math.cos(a) * A.vel, vy: Math.sin(a) * A.vel, dano: danoBala(), per: A.perfora, tocados: [], r: A.r, vida: A.alcance ? A.alcance / A.vel : 5 });
  }
  balasCargador--; enfriar = cadencia(); tono(A.balas > 1 ? 150 : 700, 0.05);
  fogonazo = 0.07; retroceso = 1; // fogonazo y retroceso del arma
  if (A.balas === 1) particulas.push({ x: GX, y: GY, vx: -30 - Math.random() * 40, vy: -90 - Math.random() * 40, g: 500, vida: 0.6, max: 0.6, r: 1.6, color: "#d9a441" }); // casquillo
  if (balasCargador <= 0) recargando = tRecarga();
}
function mover(dt) {
  if (estado !== "jugando") return;
  sacudida = Math.max(0, sacudida - dt * 4);
  minVida = Math.min(minVida, vida / vidaMax());

  // arma
  enfriar -= dt;
  if (recargando > 0) {
    recargando -= dt;
    if (recargando <= 0) { recargando = 0; balasCargador = cargadorMax(); tono(400, 0.06); }
  } else if (apuntando && enfriar <= 0) disparar();

  // balas
  for (const b of balas) { b.x += b.vx * dt; b.y += b.vy * dt; b.vida -= dt; }
  balas = balas.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10 && !b.fin && b.vida > 0);

  // oleada: salen enemigos de a poco; al limpiarla hay una pausa y sube la siguiente
  if (salidos < porSalir || jefeEnCamino) {
    temporizador -= dt;
    if (temporizador <= 0) {
      if (jefeEnCamino && salidos >= porSalir / 2) { // el jefe sale a mitad de la oleada
        nuevoEnemigo(NIVELES[nivel - 1].jefe); jefeEnCamino = false; temporizador = 1.5; tono(90, 0.4, "sawtooth");
      } else { nuevoEnemigo(); salidos++; temporizador = Math.max(0.5, 1.7 - oleada * 0.1) * (0.6 + Math.random() * 0.8); }
    }
  } else if (!enemigos.length) {
    if (oleada >= OLAS_NIVEL) { terminar(true); return; } // nivel superado
    const bono = 5 * oleada; monedas += bono; ganadas += bono; puntos += 50 * oleada; guardar();
    balas = []; apuntando = false; estado = "tienda";
    estadoTxt.textContent = "¡Oleada " + oleada + " superada! +" + bono + " 🪙 Mejora tu equipo y sigue cuando estés listo.";
    tono(523, 0.12); setTimeout(() => tono(784, 0.18), 130);
    ui();
  }

  // enemigos
  for (const e of enemigos) {
    e.fase += dt * 6; e.golpe = Math.max(0, e.golpe - dt * 6);
    if (e.t.vuela) e.y = e.y0 + Math.sin(e.fase * 0.5) * 14; // los voladores ondulan
    if (e.x > CABANA_X + e.t.w / 2 + (e.t.vuela ? 25 : 0)) e.x -= e.t.vel * dt;
    else {
      e.mordida -= dt;
      if (e.mordida <= 0) { e.mordida = 1; vida -= e.t.dano; sacudida = 1; chispa(CABANA_X, e.y, 7, "#8a6238", 110, 420); tono(110, 0.15, "sawtooth"); }
    }
    // se revisa la posición de la bala y el punto medio de su recorrido, para que las rápidas no atraviesen al enemigo
    const toca = (x, y) => Math.abs(x - e.x) < e.t.w / 2 + 2 && y > e.y - e.t.h - 4 && y < e.y + 2;
    for (const b of balas) {
      if (b.fin || b.tocados.includes(e)) continue;
      if (toca(b.x, b.y) || toca(b.x - (b.vx * dt) / 2, b.y - (b.vy * dt) / 2)) {
        b.tocados.push(e); if (--b.per <= 0) b.fin = true;
        e.hp -= b.dano; e.golpe = 1; tono(180, 0.04);
        chispa(b.x, b.y, 3, "#ffe14d", 90, 200); chispa(b.x, b.y, 4, e.t.color, 80, 350);
        if (e.hp <= 0) { e.muerto = true; matar(e); break; }
      }
    }
  }
  enemigos = enemigos.filter((e) => !e.muerto);
  textos.forEach((t) => { t.y -= 30 * dt; t.v -= dt; });
  textos = textos.filter((t) => t.v > 0);
  if (vida <= 0) { vida = 0; terminar(); }
}

// ---------- Dibujo ----------
// Animaciones y efectos (no afectan al juego, solo a cómo se ve)
let reloj = 0, particulas = [], monedasVuelan = [], fogonazo = 0, retroceso = 0;
function azar(sem) { let x = sem; return () => (x = (x * 16807) % 2147483647) / 2147483647; } // números «al azar» repetibles
const motas = (() => { const az = azar(3); return Array.from({ length: 24 }, (_, i) => ({ i, x: az() * W, y: 60 + az() * 190, f: az() * 6 })); })(); // luciérnagas, brasas o burbujas según el nivel
let tema = null; // colores del nivel actual
function chispa(x, y, n, color, vel = 120, g = 300) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = vel * (0.3 + Math.random() * 0.7);
    particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - vel * 0.3, g, vida: 0.5 + Math.random() * 0.4, max: 0.9, r: 1.5 + Math.random() * 2.5, color });
  }
}
function animar(dt) {
  reloj += dt; fogonazo -= dt; retroceso = Math.max(0, retroceso - dt * 9);
  for (const p of particulas) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt; }
  particulas = particulas.filter((p) => p.vida > 0);
  for (const m of monedasVuelan) m.t += dt;
  monedasVuelan = monedasVuelan.filter((m) => m.t < 0.7);
}

// Fondo fijo del nivel: se pinta una sola vez en un lienzo aparte (cielo, astro, árboles, agua y barro) con los colores de NIVELES[n-1].tema
const fondo = document.createElement("canvas");
fondo.width = W; fondo.height = H;
function pintarFondo(nv) {
  tema = NIVELES[nv - 1].tema;
  const T = tema, c = fondo.getContext("2d"), az = azar(7 + nv);
  let g = c.createLinearGradient(0, 0, 0, SUELO_MIN);
  g.addColorStop(0, T.cielo[0]); g.addColorStop(0.55, T.cielo[1]); g.addColorStop(1, T.cielo[2]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (T.estrellas) { c.fillStyle = "rgba(255,255,255,.7)"; for (let i = 0; i < 40; i++) c.fillRect(az() * W, az() * 120, 1.5, 1.5); }
  const A = T.astro;
  g = c.createRadialGradient(A.x, A.y, 4, A.x, A.y, 60);
  g.addColorStop(0, "rgba(" + A.brillo + ",.9)"); g.addColorStop(0.25, "rgba(" + A.brillo + ",.35)"); g.addColorStop(1, "rgba(" + A.brillo + ",0)");
  c.fillStyle = g; c.fillRect(A.x - 60, A.y - 60, 120, 120);
  c.fillStyle = A.color; c.beginPath(); c.arc(A.x, A.y, A.r, 0, 6.3); c.fill();
  // dos filas de árboles (lejanos y cercanos); con copa o secos, y musgo colgante
  for (const [cant, col, esc, base] of [[11, T.arboles[0], 0.7, SUELO_MIN - 28], [8, T.arboles[1], 1, SUELO_MIN - 22]]) {
    for (let k = 0; k < cant; k++) {
      const x = 100 + (k + az() * 0.6) * (W - 100) / cant, alto = (90 + az() * 60) * esc;
      c.fillStyle = col; c.fillRect(x - 4 * esc, base - alto, 8 * esc, alto);
      if (T.copas) { for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(x + (az() - 0.5) * 50 * esc, base - alto + (az() - 0.3) * 20, (18 + az() * 14) * esc, 0, 6.3); c.fill(); } }
      else { c.strokeStyle = col; c.lineWidth = 3 * esc; for (let q = 0; q < 4; q++) { c.beginPath(); c.moveTo(x, base - alto * (0.5 + az() * 0.4)); c.lineTo(x + (az() - 0.5) * 60 * esc, base - alto - az() * 20 * esc); c.stroke(); } }
      c.strokeStyle = T.musgo; c.lineWidth = 2;
      for (let q = 0; q < 5; q++) { const mx = x + (az() - 0.5) * 60 * esc, my = base - alto + 10; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + (az() - 0.5) * 4, my + 14 + az() * 24); c.stroke(); }
    }
  }
  g = c.createLinearGradient(0, SUELO_MIN - 24, 0, SUELO_MIN - 4);
  g.addColorStop(0, T.agua[0]); g.addColorStop(1, T.agua[1]); c.fillStyle = g; c.fillRect(0, SUELO_MIN - 24, W, 20);
  g = c.createLinearGradient(0, SUELO_MIN - 4, 0, H);
  g.addColorStop(0, T.barro[0]); g.addColorStop(1, T.barro[1]); c.fillStyle = g; c.fillRect(0, SUELO_MIN - 4, W, H);
  for (let k = 0; k < 160; k++) {
    c.fillStyle = az() < 0.5 ? "rgba(0,0,0,.12)" : "rgba(255,220,160,.07)";
    c.beginPath(); c.ellipse(az() * W, SUELO_MIN + az() * (H - SUELO_MIN), 2 + az() * 6, 1 + az() * 2.5, 0, 0, 6.3); c.fill();
  }
  c.strokeStyle = T.pasto; c.lineWidth = 1.5;
  for (let k = 0; k < 70; k++) { const x = az() * W, y = SUELO_MIN - 2 + az() * (H - SUELO_MIN); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2, y - 6); c.moveTo(x, y); c.lineTo(x + 2, y - 5); c.stroke(); }
}
function fondoAnimado() {
  const T = tema, nieb = T.fx === "niebla";
  cx.strokeStyle = "rgba(200,240,230,.25)"; cx.lineWidth = 1; // ondas en el agua
  for (let k = 0; k < 7; k++) {
    const x = ((k * 97 + reloj * 14) % (W + 40)) - 20, y = SUELO_MIN - 16 + (k % 3) * 4;
    cx.beginPath(); cx.ellipse(x, y, 12 + 4 * Math.sin(reloj * 2 + k), 2, 0, 0, 6.3); cx.stroke();
  }
  const nb = nieb ? 7 : 4; // neblina que se mueve (más espesa en el nivel de niebla)
  for (let k = 0; k < nb; k++) elipse(((reloj * 6 + k * (W + 300) / nb) % (W + 300)) - 150, SUELO_MIN - 34 + k * (nieb ? 7 : 8), 160, nieb ? 22 : 14, "rgba(200,225,215," + T.niebla + ")");
  for (const f of motas) {
    if (T.fx === "luciernagas") {
      if (f.i >= 14) continue;
      const x = f.x + Math.sin(reloj * 0.6 + f.f) * 20, y = f.y + Math.cos(reloj * 0.8 + f.f) * 12, a = 0.35 + 0.65 * Math.sin(reloj * 2 + f.f) ** 2;
      elipse(x, y, 8, 8, "rgba(" + T.fxColor + "," + a * 0.2 + ")"); elipse(x, y, 2.2, 2.2, "rgba(" + T.fxColor + "," + a + ")");
    } else if (T.fx === "brasas") { // brasas que suben
      const y = 300 - ((reloj * (25 + f.f * 6) + f.y) % 260), x = f.x + Math.sin(reloj + f.f) * 15;
      elipse(x, y, 1.8, 1.8, "rgba(" + T.fxColor + "," + (0.5 + 0.5 * Math.sin(reloj * 6 + f.f)) + ")");
    } else if (T.fx === "burbujas") { // burbujas que suben del agua
      const k = (reloj * 0.35 + f.f / 6) % 1;
      cx.strokeStyle = "rgba(" + T.fxColor + "," + 0.6 * (1 - k) + ")"; cx.lineWidth = 1.2;
      cx.beginPath(); cx.arc(f.x, SUELO_MIN - 10 - k * 36, 2 + (f.i % 3), 0, 6.3); cx.stroke();
    }
  }
}

// Ayudas de dibujo
const elipse = (x, y, rx, ry, color, rot = 0) => { cx.fillStyle = color; cx.beginPath(); cx.ellipse(x, y, Math.max(rx, 0.1), Math.max(ry, 0.1), rot, 0, Math.PI * 2); cx.fill(); };
function rr(x, y, w, h, r) { cx.beginPath(); if (cx.roundRect) cx.roundRect(x, y, w, h, r); else cx.rect(x, y, w, h); }
function panel(x, y, w, h) { rr(x, y, w, h, 8); cx.fillStyle = "rgba(10,10,12,.55)"; cx.fill(); cx.strokeStyle = "rgba(255,255,255,.12)"; cx.lineWidth = 1; cx.stroke(); }
function barra(x, y, w, h, f, color) {
  f = Math.max(0, Math.min(1, f));
  rr(x, y, w, h, h / 2); cx.fillStyle = "#1c0f12"; cx.fill();
  if (f > 0) { rr(x, y, Math.max(h, w * f), h, h / 2); cx.fillStyle = color; cx.fill(); }
}

function dibujarCabana() {
  cx.fillStyle = "#3b2711"; for (const x of [4, 50, 92]) cx.fillRect(x, 246, 6, 70); // pilotes
  cx.fillStyle = "rgba(0,0,0,.35)"; cx.fillRect(0, 246, 104, 20);
  let g = cx.createLinearGradient(0, 150, 96, 150); g.addColorStop(0, "#6b4a26"); g.addColorStop(1, "#4a3118");
  cx.fillStyle = g; cx.fillRect(0, 150, 96, 88);
  cx.fillStyle = "rgba(0,0,0,.25)"; for (let x = 12; x < 96; x += 12) cx.fillRect(x, 150, 1.5, 88);
  const luz = 0.75 + 0.25 * Math.sin(reloj * 9) * Math.sin(reloj * 3.7); // lámpara que parpadea
  cx.fillStyle = "rgba(255,200,90," + luz + ")"; cx.fillRect(8, 172, 22, 22);
  cx.strokeStyle = "#2b1b0b"; cx.lineWidth = 3; cx.strokeRect(8, 172, 22, 22);
  cx.beginPath(); cx.moveTo(19, 172); cx.lineTo(19, 194); cx.moveTo(8, 183); cx.lineTo(30, 183); cx.stroke();
  cx.fillStyle = "#1a1008"; cx.fillRect(38, 192, 20, 46);
  cx.fillStyle = "#3b2711"; cx.beginPath(); cx.moveTo(-8, 152); cx.lineTo(48, 104); cx.lineTo(104, 152); cx.fill();
  cx.strokeStyle = "rgba(0,0,0,.3)"; cx.lineWidth = 1.5;
  for (let k = 1; k < 4; k++) { cx.beginPath(); cx.moveTo(-8 + k * 9, 152 - k * 12); cx.lineTo(104 - k * 9, 152 - k * 12); cx.stroke(); }
  cx.fillStyle = "#7a5530"; cx.fillRect(0, 238, 104, 8); cx.fillStyle = "rgba(255,255,255,.15)"; cx.fillRect(0, 238, 104, 1.5);
  for (const [x, y] of [[100, 232], [108, 232], [104, 226]]) elipse(x, y, 9, 5, "#b9a06a"); // sacos de arena
  // tirador
  cx.fillStyle = "#2b4c7e"; cx.fillRect(62, 220, 14, 18);
  elipse(69, 213, 7, 7, "#e0b48a");
  cx.fillStyle = "#c33"; cx.fillRect(61, 207, 16, 4); cx.beginPath(); cx.arc(69, 208, 7, Math.PI, 0); cx.fill();
  // brazo y arma (apuntan al objetivo, con retroceso)
  const A = ARMAS[armaId], a = Math.atan2(objetivo.y - GY, objetivo.x - GX), rt = retroceso * 4;
  const ox = GX - Math.cos(a) * rt, oy = GY - Math.sin(a) * rt;
  cx.strokeStyle = "#e0b48a"; cx.lineWidth = 5; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(72, 226); cx.lineTo(ox, oy); cx.stroke(); cx.lineCap = "butt";
  cx.save(); cx.translate(ox, oy); cx.rotate(a);
  cx.fillStyle = A.color; cx.fillRect(-8, -A.grosor / 2, A.largo + 8, A.grosor);
  cx.fillStyle = "rgba(255,255,255,.25)"; cx.fillRect(-8, -A.grosor / 2, A.largo + 8, 1.5);
  cx.fillStyle = "#111"; cx.fillRect(2, A.grosor / 2, 5, 6);
  if (fogonazo > 0) { elipse(A.largo + 4, 0, 6 + Math.random() * 4, 6 + Math.random() * 4, "rgba(255,230,120,.95)"); elipse(A.largo + 2, 0, 3, 3, "#fff"); }
  cx.restore();
}

function dibujarEnemigo(e) {
  const { w, h } = e.t, vuela = e.t.vuela, blanco = e.golpe > 0;
  const col = blanco ? "#fff" : e.t.color;
  const hop = e.tipo === "rana" ? Math.abs(Math.sin(e.fase * 0.8)) * 8 : 0; // la rana salta
  const y = e.y - hop, cy = y - h / 2;
  if (!vuela) elipse(e.x, e.y + 2, (w / 2) * (1 - hop / 30), 4, "rgba(0,0,0,.3)");
  if (e.t.jefe) elipse(e.x, cy, w * 0.7, h * 0.8, "rgba(255,60,60," + (0.1 + 0.06 * Math.sin(reloj * 5)) + ")"); // aura roja
  if (e.tipo === "rana") {
    const k = w / 30;
    elipse(e.x + w * 0.28, y - 4 * k, 9 * k, 5 * k, col, -0.5 + Math.sin(e.fase * 0.8) * 0.3);
    elipse(e.x, cy, w / 2, h / 2, col);
    elipse(e.x - 3 * k, y - h * 0.3, w * 0.32, h * 0.2, blanco ? "#fff" : "rgba(255,255,200,.4)");
    elipse(e.x - w * 0.3, y - 3 * k, 5 * k, 3 * k, col);
    for (const dx of [-0.2, 0.05]) { elipse(e.x + dx * w, y - h * 0.95, 4.5 * k, 4.5 * k, "#fff"); elipse(e.x + dx * w - 1, y - h * 0.95, 2 * k, 2 * k, "#111"); }
    cx.strokeStyle = "rgba(0,0,0,.35)"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(e.x - w * 0.5, y - h * 0.4); cx.lineTo(e.x - w * 0.15, y - h * 0.35); cx.stroke();
  } else if (e.tipo === "serpiente") {
    const n = 7; // cuerpo en segmentos que serpentean
    for (let i = n - 1; i >= 0; i--) {
      const t = i / (n - 1), sx = e.x + (t - 0.5) * w, sy = cy + Math.sin(e.fase * 1.5 - i * 0.9) * 3, rad = (h / 2) * (i === 0 ? 1.25 : 1 - 0.45 * t);
      elipse(sx, sy, rad, rad, blanco ? "#fff" : i % 2 ? "#8c7418" : col);
    }
    const hx = e.x - w / 2, hy = cy + Math.sin(e.fase * 1.5) * 3;
    elipse(hx - 1, hy - 3, 2.2, 2.2, "#fff"); elipse(hx - 2, hy - 3, 1, 1, "#111");
    if (Math.sin(e.fase * 3) > 0) { cx.strokeStyle = "#d33"; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(hx - 5, hy + 1); cx.lineTo(hx - 11, hy + 1); cx.stroke(); }
  } else if (e.tipo === "cocodrilo" || e.tipo === "reyCocodrilo") {
    const k = w / 62, paso = Math.sin(e.fase * 1.2) * 4 * k;
    elipse(e.x - w * 0.25 + paso, y - 3 * k, 6 * k, 4 * k, blanco ? "#fff" : "#25502a");
    elipse(e.x + w * 0.2 - paso, y - 3 * k, 6 * k, 4 * k, blanco ? "#fff" : "#25502a");
    const col2 = Math.sin(e.fase) * 5 * k;
    cx.fillStyle = col; cx.beginPath(); cx.moveTo(e.x + w * 0.3, y - h * 0.75);
    cx.quadraticCurveTo(e.x + w * 0.7, y - h * 0.5 + col2, e.x + w * 0.62 + 8 * k, y - h * 0.1 + col2); cx.lineTo(e.x + w * 0.3, y - h * 0.15); cx.fill();
    elipse(e.x, cy, w * 0.425, h / 2, col);
    elipse(e.x, y - h * 0.25, w * 0.34, h * 0.18, blanco ? "#fff" : "rgba(220,220,150,.35)");
    cx.fillStyle = blanco ? "#fff" : "#1f4a22";
    for (let i = -3; i <= 3; i++) { const sx = e.x + i * w * 0.1; cx.beginPath(); cx.moveTo(sx - 3 * k, y - h * 0.95); cx.lineTo(sx, y - h * 0.95 - 5 * k); cx.lineTo(sx + 3 * k, y - h * 0.95); cx.fill(); }
    cx.fillStyle = col; cx.fillRect(e.x - w * 0.42 - 18 * k, y - h * 0.7, 22 * k, h * 0.38);
    cx.fillStyle = "#fff";
    for (let i = 0; i < 4; i++) { const tx = e.x - w * 0.42 - 16 * k + i * 5 * k; cx.beginPath(); cx.moveTo(tx, y - h * 0.32); cx.lineTo(tx + 2 * k, y - h * 0.32 + 4 * k); cx.lineTo(tx + 4 * k, y - h * 0.32); cx.fill(); }
    elipse(e.x - w * 0.3, y - h * 0.8, 3.5 * k, 3.5 * k, "#fff"); elipse(e.x - w * 0.31, y - h * 0.8, 1.6 * k, 1.6 * k, "#111");
  } else { // murciélago, buitre y Rey Buitre: alas que aletean
    const bat = e.tipo === "murcielago", f = Math.sin(e.fase * (bat ? 2.4 : 1.5));
    for (const lado of [-1, 1]) {
      cx.fillStyle = blanco ? "#fff" : bat ? "#4b3470" : "#5b4636";
      cx.beginPath(); cx.moveTo(e.x + lado * w * 0.1, cy);
      cx.lineTo(e.x + lado * w * 0.95, cy - f * h * 1.2 - h * 0.3); cx.lineTo(e.x + lado * w * 0.7, cy + h * 0.25 - f * h * 0.4);
      cx.lineTo(e.x + lado * w * 0.4, cy + h * 0.35); cx.lineTo(e.x + lado * w * 0.15, cy + h * 0.3); cx.fill();
    }
    elipse(e.x, cy, w * 0.28, h * 0.45, col);
    const hx = e.x - w * 0.28;
    elipse(hx, cy - h * 0.1, h * 0.32, h * 0.3, col);
    if (bat) {
      cx.fillStyle = col; cx.beginPath(); cx.moveTo(hx - 3, cy - h * 0.35); cx.lineTo(hx - 1, cy - h * 0.75); cx.lineTo(hx + 3, cy - h * 0.35); cx.moveTo(hx + 2, cy - h * 0.35); cx.lineTo(hx + 5, cy - h * 0.7); cx.lineTo(hx + 7, cy - h * 0.3); cx.fill();
      elipse(hx - 2, cy - h * 0.15, 1.8, 1.8, "#ff4d4d");
    } else {
      cx.fillStyle = "#e8a33d"; cx.beginPath(); cx.moveTo(hx - h * 0.3, cy - h * 0.12); cx.lineTo(hx - h * 0.65, cy); cx.lineTo(hx - h * 0.25, cy + h * 0.1); cx.fill();
      elipse(hx - 2, cy - h * 0.2, 2, 2, "#fff"); elipse(hx - 3, cy - h * 0.2, 1, 1, "#111");
    }
  }
  if (e.t.jefe) { // corona
    cx.fillStyle = "#ffd23f"; cx.beginPath();
    cx.moveTo(e.x - 12, y - h - 2); cx.lineTo(e.x - 12, y - h - 14); cx.lineTo(e.x - 6, y - h - 8); cx.lineTo(e.x, y - h - 16);
    cx.lineTo(e.x + 6, y - h - 8); cx.lineTo(e.x + 12, y - h - 14); cx.lineTo(e.x + 12, y - h - 2); cx.fill();
  }
  if (e.hp < e.hpMax && !e.t.jefe) barra(e.x - 14, y - h - 9 - (vuela ? h : 0), 28, 4, e.hp / e.hpMax, "#4fd16b");
}

function dibujar() {
  cx.drawImage(fondo, 0, 0);
  fondoAnimado();
  cx.save();
  if (sacudida > 0) cx.translate((Math.random() - 0.5) * 6 * sacudida, (Math.random() - 0.5) * 6 * sacudida);
  dibujarCabana();
  cx.restore();

  enemigos.slice().sort((p, q) => p.y - q.y).forEach(dibujarEnemigo); // los de abajo tapan a los de atrás
  cx.lineCap = "round";
  for (const b of balas) { // balas con estela
    cx.strokeStyle = "rgba(255,225,80,.5)"; cx.lineWidth = b.r * 1.4;
    cx.beginPath(); cx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025); cx.lineTo(b.x, b.y); cx.stroke();
    elipse(b.x, b.y, b.r, b.r, "#fff6c0");
  }
  cx.lineCap = "butt";
  for (const p of particulas) { cx.globalAlpha = Math.max(0, p.vida / p.max); elipse(p.x, p.y, p.r, p.r, p.color); }
  cx.globalAlpha = 1;
  for (const m of monedasVuelan) { // monedas que viajan al marcador
    if (m.t < 0) continue;
    const k = m.t / 0.7, ez = k * k * (3 - 2 * k);
    const x = m.x0 + (24 - m.x0) * ez, y = m.y0 + (44 - m.y0) * ez - Math.sin(k * Math.PI) * 30;
    elipse(x, y, 5, 5, "#b8860b"); elipse(x, y, 3.8, 3.8, "#ffd23f");
  }
  // cañas del primer plano que se mecen
  for (let i = 0; i < 18; i++) {
    const x = i * 38 + ((i * 17) % 13), alto = 18 + ((i * 29) % 14), sw = Math.sin(reloj * 1.4 + i) * 3;
    cx.strokeStyle = "#1f3d22"; cx.lineWidth = 2.2; cx.beginPath(); cx.moveTo(x, H); cx.quadraticCurveTo(x + sw * 0.5, H - alto * 0.6, x + sw, H - alto); cx.stroke();
    if (i % 3 === 0) { cx.fillStyle = "#5a3a1a"; rr(x + sw - 2, H - alto - 9, 4, 9, 2); cx.fill(); }
  }
  if (estado === "jugando") { // mira: se pone roja sobre un enemigo y muestra la recarga
    const sobre = enemigos.some((e) => Math.abs(objetivo.x - e.x) < e.t.w / 2 + 4 && objetivo.y > e.y - e.t.h - 6 && objetivo.y < e.y + 4);
    cx.strokeStyle = sobre ? "#ff5d73" : "rgba(255,255,255,.8)"; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(objetivo.x, objetivo.y, 9, 0, Math.PI * 2);
    cx.moveTo(objetivo.x - 14, objetivo.y); cx.lineTo(objetivo.x - 5, objetivo.y); cx.moveTo(objetivo.x + 5, objetivo.y); cx.lineTo(objetivo.x + 14, objetivo.y);
    cx.moveTo(objetivo.x, objetivo.y - 14); cx.lineTo(objetivo.x, objetivo.y - 5); cx.moveTo(objetivo.x, objetivo.y + 5); cx.lineTo(objetivo.x, objetivo.y + 14); cx.stroke();
    if (recargando > 0) { cx.strokeStyle = "#4aa8ff"; cx.lineWidth = 3; cx.beginPath(); cx.arc(objetivo.x, objetivo.y, 15, -Math.PI / 2, -Math.PI / 2 + (1 - recargando / tRecarga()) * Math.PI * 2); cx.stroke(); }
  }
  if (sacudida > 0) { cx.fillStyle = "rgba(255,40,40," + sacudida * 0.22 + ")"; cx.fillRect(0, 0, W, H); } // destello rojo al recibir daño

  // barra grande de vida del jefe
  const jf = enemigos.find((e) => e.t.jefe);
  if (jf) {
    cx.textAlign = "center"; cx.font = "bold 12px system-ui"; cx.fillStyle = "#ffd23f"; cx.fillText("👑 " + jf.t.nombre, W / 2, 50);
    barra(W / 2 - 110, 56, 220, 9, Math.max(0, jf.hp) / jf.hpMax, "#ff5d73");
  }
  // textos flotantes con borde
  cx.font = "bold 14px system-ui"; cx.textAlign = "center"; cx.lineWidth = 3; cx.strokeStyle = "rgba(0,0,0,.6)";
  textos.forEach((t) => { cx.globalAlpha = Math.min(1, t.v * 2); cx.strokeText(t.s, t.x, t.y); cx.fillStyle = t.c; cx.fillText(t.s, t.x, t.y); });
  cx.globalAlpha = 1;

  // marcador
  const A = ARMAS[armaId], px = W - 156;
  const enMarcha = estado === "jugando" || estado === "tienda", nv = enMarcha ? nivel : nivelSel, M = mision(nv);
  panel(8, 8, 172, 66);
  cx.textAlign = "left"; cx.font = "bold 14px system-ui"; cx.fillStyle = "#fff";
  cx.fillText("Nivel " + nv + " · " + (enMarcha ? "Oleada " + oleada + "/" + OLAS_NIVEL : NIVELES[nv - 1].nombre), 18, 27);
  cx.font = "bold 13px system-ui"; cx.fillStyle = "#ffe14d"; cx.fillText("🪙 " + monedas + (ganadas ? " (+" + ganadas + ")" : ""), 18, 45);
  cx.font = "11px system-ui"; cx.fillStyle = "#cfe8ff";
  cx.fillText(!enMarcha ? "🎯 " + M.texto.slice(0, 26) : M.tipo === "vida" ? "🎯 Cabaña ≥ " + M.meta * 100 + " %: " + (minVida >= M.meta ? "✔" : "✖") : M.tipo === "puntos" ? "🎯 " + Math.min(puntos, M.meta) + "/" + M.meta + " pts" : "🎯 " + M.nombre + " " + Math.min(misionProg, M.meta) + "/" + M.meta, 18, 64);
  panel(W / 2 - 100, 8, 200, 24);
  cx.textAlign = "center"; cx.font = "12px system-ui"; cx.fillStyle = "#fff"; cx.fillText(puntos + " pts · Mejor " + mejor, W / 2, 24);
  panel(px, 8, 148, 80);
  cx.textAlign = "left"; cx.font = "bold 11px system-ui"; cx.fillStyle = "#fff"; cx.fillText("🏠 Cabaña", px + 10, 24);
  barra(px + 10, 29, 128, 10, vida / vidaMax(), vida > vidaMax() * 0.3 ? "#4fd16b" : "#ff5d73");
  cx.fillText(A.icono + " " + A.nombre, px + 10, 56);
  cx.textAlign = "right"; cx.fillText(recargando > 0 ? "Recargando…" : balasCargador + " / " + cargadorMax(), px + 138, 56);
  if (recargando > 0) barra(px + 10, 64, 128, 6, 1 - recargando / tRecarga(), "#4aa8ff");
  else barra(px + 10, 64, 128, 6, balasCargador / cargadorMax(), "#ffe14d");
  cx.textAlign = "start";
}

// ---------- Tienda (se ve antes de jugar, entre oleadas y al terminar) ----------
function ui() {
  panelMenu.classList.toggle("en-juego", estado === "jugando"); // jugando: el panel solo deja ver los avisos
  zonaTienda.hidden = estado === "jugando";
  zonaNiveles.hidden = estado === "jugando" || estado === "tienda";
  if (!zonaTienda.hidden) pintarTienda();
  if (!zonaNiveles.hidden) { pintarNiveles(); jugar.textContent = "Jugar nivel " + nivelSel; }
}
function pintarNiveles() {
  zonaNiveles.textContent = "";
  const h = document.createElement("h2"); h.style.fontSize = "1.05rem"; h.textContent = "🗺️ Niveles";
  const rej = document.createElement("div"); rej.className = "rejilla";
  NIVELES.forEach((N, i) => {
    const n = i + 1, bloq = n > progreso.desbloqueado, elegido = n === nivelSel;
    tarjeta(rej, (progreso.estrellas[n] ? "⭐ " : "") + "Nivel " + n + " · " + N.nombre, OLAS_NIVEL + " oleadas y jefe. Misión: " + N.mision.texto,
      bloq ? "🔒 Bloqueado" : elegido ? "Elegido" : "Elegir", !bloq && !elegido, () => { nivelSel = n; pintarFondo(n); guardar(); ui(); }, ["b-verde", "b-azul", "b-morado", "b-oro", "b-rojo"][i % 5]);
  });
  zonaNiveles.append(h, rej);
}
const precio = (k) => Math.round(MEJORAS[k].base * 1.7 ** mej[k]);
function comprar(k) {
  if (mej[k] >= MAXNIV || monedas < precio(k)) return;
  monedas -= precio(k); mej[k]++; guardar(); tono(660, 0.08);
  if (estado === "tienda") { // en plena partida la mejora se nota ya
    if (k === "cabana") vida += 25;
    if (k === "cargador") balasCargador = cargadorMax();
  }
  pintarTienda();
}
function reparar() {
  if (estado !== "tienda" || vida >= vidaMax() || monedas < COSTO_REPARAR) return;
  monedas -= COSTO_REPARAR; vida = Math.min(vidaMax(), vida + 30); guardar(); tono(500, 0.08);
  pintarTienda();
}
function equipar(id) {
  if (!armasMias.includes(id)) return;
  armaId = id; recargando = 0; balasCargador = cargadorMax(); guardar(); tono(500, 0.06);
  pintarTienda();
}
function comprarArma(id) {
  const A = ARMAS[id];
  if (armasMias.includes(id) || monedas < A.precio) return;
  monedas -= A.precio; armasMias.push(id); tono(660, 0.08);
  equipar(id); // la deja puesta y guarda
}
function siguiente() { oleada++; estado = "jugando"; empezarOleada(); ui(); }
function tarjeta(padre, titulo, desc, boton, activo, fn, color = "b-verde") {
  const t = document.createElement("div"); t.className = "tarjeta";
  const n = document.createElement("b"); n.textContent = titulo;
  const d = document.createElement("small"); d.textContent = desc;
  const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + color + (boton === "Elegido" || boton === "Equipada" ? " on" : ""); b.textContent = boton; b.disabled = !activo;
  b.addEventListener("click", fn);
  t.append(n, d, b); padre.appendChild(t);
}
function pintarTienda() {
  zonaTienda.textContent = "";
  const h = document.createElement("h2"); h.style.fontSize = "1.05rem";
  h.textContent = "🛒 Tienda · tienes 🪙 " + monedas;
  const rej = document.createElement("div"); rej.className = "rejilla";
  const sub = (t) => { const e = document.createElement("h3"); e.style.cssText = "font-size:.95rem;margin:14px 0 8px"; e.textContent = t; return e; };
  const rejA = document.createElement("div"); rejA.className = "rejilla";
  for (const id in ARMAS) {
    const A = ARMAS[id], mia = armasMias.includes(id), puesta = armaId === id;
    tarjeta(rejA, A.icono + " " + A.nombre, A.desc, puesta ? "Equipada" : mia ? "Equipar" : "🪙 " + A.precio, !puesta && (mia || monedas >= A.precio), () => (mia ? equipar(id) : comprarArma(id)), "b-oro");
  }
  for (const k in MEJORAS) {
    const m = MEJORAS[k], tope = mej[k] >= MAXNIV;
    tarjeta(rej, m.nombre + " · nivel " + mej[k] + "/" + MAXNIV, m.desc, tope ? "Máximo" : "🪙 " + precio(k), !tope && monedas >= precio(k), () => comprar(k), "b-azul");
  }
  if (estado === "tienda") {
    tarjeta(rej, "🔧 Reparar cabaña", "+30 de vida (ahora " + Math.ceil(vida) + "/" + vidaMax() + ")", "🪙 " + COSTO_REPARAR, vida < vidaMax() && monedas >= COSTO_REPARAR, reparar, "b-rojo");
  }
  zonaTienda.append(h, sub("🔫 Armas"), rejA, sub("⬆️ Mejoras"), rej);
  if (estado === "tienda") {
    const s = document.createElement("button"); s.type = "button"; s.className = "b3d txt grande b-verde siguiente";
    s.textContent = "Siguiente oleada ▶"; s.addEventListener("click", siguiente);
    zonaTienda.appendChild(s);
  }
}

// ---------- Entrada ----------
function apuntar(ev) {
  const r = cv.getBoundingClientRect();
  objetivo.x = Math.max(GX + 20, ((ev.clientX - r.left) / r.width) * W);
  objetivo.y = ((ev.clientY - r.top) / r.height) * H;
}
cv.addEventListener("pointerdown", (ev) => { activarAudio(); apuntar(ev); apuntando = true; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} });
cv.addEventListener("pointermove", apuntar);
["pointerup", "pointercancel"].forEach((n) => cv.addEventListener(n, () => { apuntando = false; }));
jugar.addEventListener("click", () => { activarAudio(); empezar(); });

// ---------- Bucle ----------
function ciclo(t) {
  const dt = Math.min((t - ultimo) / 1000, 0.033) || 0;
  ultimo = t;
  mover(dt);
  animar(dt);
  dibujar();
  requestAnimationFrame(ciclo);
}
pintarFondo(nivelSel);
ui();
requestAnimationFrame((t) => { ultimo = t; ciclo(t); });
