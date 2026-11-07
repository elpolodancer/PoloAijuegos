// Ruta: globos/juego-globos.js
// Juego «Lluvia de globos»: globos de agua (sin lazo) que caen como si vaciaran una cubeta y se amontonan.
// Para reventarlos, desliza el dedo por 3 o más globos del mismo color que se estén tocando. Los ajustes están aquí arriba.
// Trofeos: n globos reventados = n × (n + 30). Niveles por trofeos. Artefactos: 6 = bomba, 7+ = eliminador de color, 10+ = elimina todo.
// Globos con número: bajan 1 en cada jugada que no los revienta; si uno llega a 0, pierdes.

const ID = "globos";

// ---------- AJUSTES ----------
const ANCHO = 460, ALTO = 760;     // tamaño lógico del lienzo
const SUELO = ALTO - 36;           // y donde se apoyan los globos
const RX = 32, RY = 38;            // medio ancho y medio alto del globo: un óvalo más alto que ancho (caben ~6 por fila)
const R = RX;                      // para anillos y efectos
const TOTAL_GLOBOS = 45;           // globos que caben en la cubeta (siempre hay 45 entre los que están y los que van cayendo)
const REALCE = 0.10;               // cuánto crece un globo al tocarlo (10 %) y, con eso, cuánto empuja a la vista a sus vecinos (solo se dibuja: la física y el acomodo no cambian)
const LINEA = 120;                 // línea roja: si la pila se queda quieta por encima de ella, pierdes
const SEG_DESBORDE = 2;            // segundos que aguanta un globo quieto arriba de la línea antes de perder
const MIN_CADENA = 3;              // globos mínimos en la línea para reventarlos
const TOLERANCIA = 10;             // píxeles extra para considerar que dos globos «se tocan»
const GRAVEDAD = 0.35;             // píxeles por cuadro al cuadrado
const SUB = 2;                     // subpasos de física por cuadro (más = más estable)
const FRICCION_GLOBOS = 0.985;      // 1 = sin fricción: más cerca de 1, más resbalan entre sí
const FRICCION_SUELO = 0.8;        // fricción contra el suelo
const ITER = 5;                    // repeticiones de choques por subpaso
const INICIAL = TOTAL_GLOBOS;  // globos de la primera «cubetada»
// -- Trofeos y niveles (calculados con tus jugadas de prueba) --
const BASE_TROFEOS = 30;           // una jugada de n globos vale n × (n + BASE_TROFEOS)
const NIVEL1_TROFEOS = 1800;       // trofeos para terminar el nivel 1
const POTENCIA_NIVEL = 1.3;        // PROVISIONAL: nivel n termina en 1800 × n^1.3 (redondeado a centenas). Calibrar con la lista del nivel 2
// -- Artefactos (según los globos de la línea) --
const GLOBOS_BOMBA = 6;            // 6 = bomba (revienta los 6 globos más cercanos y da 1 moneda)
const GLOBOS_COLOR = 7;            // 7 o más = eliminador de color
const GLOBOS_TODO = 10;            // 10 o más = elimina todo
const MAX_GLOBOS_TODO = 30;        // PROVISIONAL: «elimina todo» cuenta como máximo estos globos para los trofeos
// -- Globos con número --
const PROB_NUMERO = 0.08;          // probabilidad de que un globo nuevo traiga número (nivel 1)
const PROB_NUMERO_NIVEL = 0.02;    // +esto por cada nivel...
const PROB_NUMERO_MAX = 0.2;       // ...hasta este tope
const NUMERO_MIN_N1 = 9, NUMERO_MAX_N1 = 14;   // rango de números en el nivel 1
const NUMERO_BAJA_NIVEL = 3;       // cada nivel baja el rango en esto (nivel 2: 6–11)
const NUMERO_PISO_MIN = 3, NUMERO_PISO_MAX = 4; // el rango nunca baja de aquí
const COLORES_NIVEL1 = 5;          // colores en el nivel 1 (rojo, amarillo, verde, azul, morado)
const NIVEL_TODOS_COLORES = 3;     // desde este nivel entra el sexto color (naranja)
const PUNTOS_POR_PERFIL = 25;      // 1 punto al perfil por cada 25 del juego

const COLORES = [                  // globos [luz, base, sombra]
  ["#ff9fb8", "#ff4f7b", "#b8184a"],
  ["#ffe98a", "#ffc20e", "#b88400"],
  ["#a5f0a0", "#3fcf5a", "#16883a"],
  ["#9fd8ff", "#2f9bff", "#1658b8"],
  ["#d9b0ff", "#a455ff", "#6420b8"],
  ["#ffc79a", "#ff8a2b", "#b8500a"],
];

// ---------- Perfil (puntos totales del portal) ----------
// Se carga aparte para que el juego funcione aunque falle Firebase.
// Si tu sumarPuntos recibe otros argumentos, ajústalo SOLO aquí (copia la llamada de gominolas/juego-gominolas.js).
let sumarPuntos = null;
import("../compartido/jugador.js").then((m) => { sumarPuntos = m.sumarPuntos; }).catch(() => {});
// Cada partida lleva su propia cuenta de lo ya enviado. «final» guarda los puntos de la partida cuando empieza otra,
// para que termine de enviar lo que le quedó pendiente.
let cuenta = { enviados: 0, enviando: false, final: null };
async function enviarPerfil() {
  const c = cuenta;
  if (!sumarPuntos || c.enviando) return;   // si ya hay un envío en marcha, él mismo revisa el total al terminar cada tanda
  c.enviando = true;
  try {
    for (;;) {
      const total = Math.floor((c === cuenta ? puntos : c.final) / PUNTOS_POR_PERFIL);
      const debe = total - c.enviados;
      if (debe <= 0) break;
      const n = Math.min(debe, 1000);       // jugador.js y las reglas de Firestore aceptan como máximo 1000 por envío
      if (!(await sumarPuntos(ID, n))) break;   // sin sesión: se intenta otra vez en el siguiente envío
      c.enviados += n;
    }
  } catch (e) { /* sin conexión: queda pendiente para el siguiente envío */ }
  c.enviando = false;
}

// ---------- Sonidos (WebAudio, sin archivos) ----------
let audio = null, silencio = false;
try { silencio = localStorage.getItem("globos_silencio") === "1"; } catch (e) {}
function ac() {
  if (silencio) return null;
  if (!audio) {
    try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (audio.state === "suspended") audio.resume();
  return audio;
}
function tono(f, dur, o = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + (o.retraso || 0);
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.tipo || "sine";
  osc.frequency.setValueAtTime(f, t);
  if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
  g.gain.setValueAtTime(o.vol || 0.15, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}
function ruido(dur, vol = 0.2, corte = 900, retraso = 0) {
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = corte;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(a.destination);
  s.start(a.currentTime + retraso);
}
const ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568];
function sonido(tipo, n = 0) {
  const nota = ESCALA[Math.min(n, ESCALA.length - 1)];
  switch (tipo) {
    case "seleccion": tono(nota, 0.08, { tipo: "sine", vol: 0.08 }); break;   // sube de tono con cada globo de la línea
    case "pop":       // chapoteo de agua: sube de tono según el globo de la línea
      ruido(0.12, 0.22, 3000);
      tono(nota, 0.12, { tipo: "triangle", hasta: nota * 1.5, vol: 0.12 }); break;
    case "fallo": tono(200, 0.1, { tipo: "sine", hasta: 150, vol: 0.06 }); break;
    case "lluvia": [392, 523, 659].forEach((f, i) => tono(f, 0.15, { tipo: "triangle", vol: 0.1, retraso: i * 0.07 })); break;
    case "fin": [440, 392, 349, 262].forEach((f, i) => tono(f, 0.35, { tipo: "triangle", vol: 0.15, retraso: i * 0.2 })); break;
    case "cambiar": tono(660, 0.06, { tipo: "square", vol: 0.06 }); break;
    case "nivel": [523, 659, 784, 1046].forEach((f, i) => tono(f, 0.18, { tipo: "triangle", vol: 0.12, retraso: i * 0.09 })); break;
    case "bomba": ruido(0.35, 0.35, 600); tono(120, 0.3, { tipo: "sawtooth", hasta: 50, vol: 0.14 }); break;
  }
}

// ---------- Elementos ----------
const lienzo = document.getElementById("lienzo");
const ctx = lienzo.getContext("2d");
lienzo.width = ANCHO * 2; lienzo.height = ALTO * 2;   // el doble para que se vea nítido
ctx.scale(2, 2);

const $ = (id) => document.getElementById(id);
const elVidas = $("vidas"), elPuntos = $("puntos"), elRecord = $("record"), elSonido = $("sonido");   // «vidas» ahora muestra qué tan llena está la cubeta
function pintarBotonSonido() { elSonido.textContent = silencio ? "🔇" : "🔊"; elSonido.setAttribute("aria-label", silencio ? "Activar sonido" : "Silenciar"); }
pintarBotonSonido();
elSonido.addEventListener("click", () => {
  silencio = !silencio;
  try { localStorage.setItem("globos_silencio", silencio ? "1" : "0"); } catch (e) {}
  pintarBotonSonido(); sonido("cambiar");
});

// ---------- Dibujo de los globos de agua (se pintan una vez por color y luego se reutilizan) ----------
const SPR = 2 * RY + 30;   // tamaño lógico de cada imagen (cuadrada, con margen para girar y para el nudo)
const CY = SPR / 2 + 3;    // y del centro del globo dentro de la imagen
function formaGlobo(x, cx, cy) {   // óvalo redondeado, un poco más angosto arriba que abajo (como un huevo)
  const k = 0.5523, m = cy + RY * 0.1, alto = m - (cy - RY), bajo = cy + RY - m;
  x.beginPath();
  x.moveTo(cx, cy - RY);
  x.bezierCurveTo(cx + RX * k * 0.85, cy - RY, cx + RX, m - alto * k, cx + RX, m);
  x.bezierCurveTo(cx + RX, m + bajo * k, cx + RX * k, cy + RY, cx, cy + RY);
  x.bezierCurveTo(cx - RX * k, cy + RY, cx - RX, m + bajo * k, cx - RX, m);
  x.bezierCurveTo(cx - RX, m - alto * k, cx - RX * k * 0.85, cy - RY, cx, cy - RY);
  x.closePath();
}
const sprites = COLORES.map(([luz, base, sombra]) => {
  const c = document.createElement("canvas");
  c.width = c.height = SPR * 2;
  const x = c.getContext("2d");
  x.scale(2, 2);
  const cx = SPR / 2, cy = CY;
  // nudo de arriba
  x.fillStyle = sombra;
  x.beginPath(); x.moveTo(cx - 6, cy - RY + 4); x.lineTo(cx + 6, cy - RY + 4); x.lineTo(cx + 3.5, cy - RY - 8); x.lineTo(cx - 3.5, cy - RY - 8); x.closePath(); x.fill();
  // cuerpo translúcido
  const gr = x.createRadialGradient(cx - RX * 0.35, cy - RY * 0.4, RX * 0.1, cx, cy, RY * 1.05);
  gr.addColorStop(0, luz); gr.addColorStop(0.55, base); gr.addColorStop(1, sombra);
  x.globalAlpha = 0.95; x.fillStyle = gr;
  formaGlobo(x, cx, cy); x.fill();
  x.globalAlpha = 1;
  // el agua de adentro: reflejo claro abajo
  x.fillStyle = "rgba(255,255,255,.16)";
  x.beginPath(); x.ellipse(cx + RX * 0.1, cy + RY * 0.5, RX * 0.6, RY * 0.3, 0, 0, Math.PI * 2); x.fill();
  // borde de hule
  x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 1.5;
  formaGlobo(x, cx, cy); x.stroke();
  // brillos en facetas (como en un globo de agua de verdad)
  x.fillStyle = "rgba(255,255,255,.62)";
  x.beginPath(); x.moveTo(cx - RX * 0.66, cy - RY * 0.52); x.lineTo(cx - RX * 0.32, cy - RY * 0.74); x.lineTo(cx - RX * 0.14, cy - RY * 0.46); x.lineTo(cx - RX * 0.5, cy - RY * 0.26); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,.38)";
  x.beginPath(); x.moveTo(cx + RX * 0.1, cy - RY * 0.62); x.lineTo(cx + RX * 0.34, cy - RY * 0.6); x.lineTo(cx + RX * 0.28, cy - RY * 0.38); x.lineTo(cx + RX * 0.04, cy - RY * 0.42); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,.28)";
  x.beginPath(); x.ellipse(cx + RX * 0.5, cy + RY * 0.52, RX * 0.12, RY * 0.07, -0.6, 0, Math.PI * 2); x.fill();
  return c;
});

// ---------- Estado ----------
let estado = "inicio";   // "inicio" | "jugando" | "fin"
let globos = [], chispas = [], anillos = [], textos = [], nubes = [];
let cadena = [], punteroId = null, ultimoP = null;
let puntos = 0, record = 0, reventados = 0, mejorCadena = 0;
let nivel = 1, monedas = 0, numerosActivos = false;   // numerosActivos: los globos con número empiezan a caer tras la primera jugada
let t = 0, tic = 0, pendientes = 0, destello = 0, aviso = 0, avisoTexto = "", llenado = 0, peligro = 0;
try { record = Number(localStorage.getItem("globos_record")) || 0; monedas = Number(localStorage.getItem("globos_monedas")) || 0; } catch (e) {}
elRecord.textContent = record;

const umbral = (n) => (n < 1 ? 0 : n === 1 ? NIVEL1_TROFEOS : Math.round(NIVEL1_TROFEOS * Math.pow(n, POTENCIA_NIVEL) / 100) * 100);   // trofeos acumulados para terminar el nivel n
const dificultad = () => Math.min(1, (nivel - 1) / 6);   // solo para el color del cielo
const trofeosPor = (n) => n * (n + BASE_TROFEOS);
const probNumero = () => Math.min(PROB_NUMERO_MAX, PROB_NUMERO + PROB_NUMERO_NIVEL * (nivel - 1));
function rangoNumero() {
  const baja = NUMERO_BAJA_NIVEL * (nivel - 1);
  return [Math.max(NUMERO_PISO_MIN, NUMERO_MIN_N1 - baja), Math.max(NUMERO_PISO_MAX, NUMERO_MAX_N1 - baja)];
}
const lerp = (a, b, k) => a + (b - a) * k;
const numColores = () => (nivel >= NIVEL_TODOS_COLORES ? COLORES.length : Math.min(COLORES.length, COLORES_NIVEL1));

function pintarCubeta() {
  elVidas.textContent = Math.round(llenado * 100) + "%";
}
function pintarNivel() {
  const base = umbral(nivel - 1), meta = umbral(nivel);
  const k = Math.max(0, Math.min(1, (puntos - base) / (meta - base)));
  $("nivelTxt").textContent = "Nivel " + nivel;
  $("nivelRelleno").style.width = Math.round(k * 100) + "%";
  $("monedas").textContent = "🪙 " + monedas;
}
function guardarMonedas() { try { localStorage.setItem("globos_monedas", String(monedas)); } catch (e) {} }
function subirNivel() {
  let subio = false;
  while (puntos >= umbral(nivel)) { nivel++; subio = true; }
  if (subio) { avisoTexto = "¡Nivel " + nivel + "!"; aviso = 90; sonido("nivel"); }
}

function iniciar() {
  ac();
  globos = []; chispas = []; anillos = []; textos = []; cadena = []; punteroId = null;
  cuenta.final = puntos; enviarPerfil();   // termina de enviar lo que quedó pendiente de la partida anterior
  cuenta = { enviados: 0, enviando: false, final: null };
  puntos = 0; reventados = 0; mejorCadena = 0;
  nivel = 1; numerosActivos = false;
  t = 0; pendientes = INICIAL; destello = 0; aviso = 0; llenado = 0; peligro = 0;
  elPuntos.textContent = 0; pintarCubeta(); pintarNivel();
  estado = "jugando";
  $("inicio").classList.remove("activo");
  $("fin").classList.remove("activo");
}

// ---------- Globos ----------
function nuevoGlobo() {
  let x = RX + Math.random() * (ANCHO - 2 * RX);
  let y = -RY - Math.random() * 30;
  for (let i = 0; i < 40; i++) {   // que no aparezca encima de otro globo: busca otro lugar y, si no hay, aparece más arriba
    if (!globos.some((o) => Math.abs(o.x - x) < 2 * RX && Math.hypot(o.x - x, (o.y - y) * K) < 2 * RX)) break;
    if (i % 3 === 2) y -= RY; else x = RX + Math.random() * (ANCHO - 2 * RX);
  }
  const vx = (Math.random() - 0.5) * 1.2 / SUB;       // velocidad inicial (Verlet: posición anterior = posición - velocidad)
  const vy = (1.5 + Math.random() * 2) / SUB;
  const a0 = (Math.random() - 0.5) * 0.6;   // inclinación inicial
  const g = { x, y, px: x - vx, py: y - vy, c: Math.floor(Math.random() * numColores()), reposo: 0, toca: false, ang: a0, angObj: a0, res: 0, sq: 0, sv: 0, vel0: 0, ox: 0, oy: 0 };
  if (numerosActivos && Math.random() < probNumero()) {
    const [lo, hi] = rangoNumero();
    g.num = lo + Math.floor(Math.random() * (hi - lo + 1));
  }
  globos.push(g);
}

// Física tipo Verlet. Los globos son óvalos: se «aplasta» el eje vertical (K) para que choquen como círculos.
const K = RX / RY;
const VMAX = 9 / SUB;   // velocidad máxima por subpaso
function fisica() {
  const g = GRAVEDAD / (SUB * SUB);
  const DMAX = 2 * RX;
  for (let s = 0; s < SUB; s++) {
    for (const b of globos) {
      let vx = (b.x - b.px) * 0.999, vy = (b.y - b.py) * 0.999;
      const sp = Math.hypot(vx, vy);
      if (sp > VMAX) { vx *= VMAX / sp; vy *= VMAX / sp; }   // tope de velocidad: evita disparos si algo se encima
      b.px = b.x; b.py = b.y;
      b.x += vx; b.y += vy + g;
      b.toca = false;
    }
    for (let k = 0; k < ITER; k++) {
      for (let i = 0; i < globos.length; i++) {
        const a = globos[i];
        for (let j = i + 1; j < globos.length; j++) {
          const b = globos[j];
          let dx = b.x - a.x + (Math.random() - 0.5) * 0.04;   // micro-ruido: evita torres perfectas en las paredes
          if (dx > DMAX || dx < -DMAX) continue;
          let dy = (b.y - a.y) * K;
          let d2 = dx * dx + dy * dy;
          const dmin = 2 * RX;
          if (d2 >= dmin * dmin) continue;
          if (d2 < 1e-6) { dx = Math.random() - 0.5; dy = (Math.random() - 0.5) * K; d2 = dx * dx + dy * dy; }
          const d = Math.sqrt(d2);
          const m = (dmin - d) / d;
          a.x -= dx * m * 0.5; a.y -= (dy * m * 0.5) / K;
          b.x += dx * m * 0.5; b.y += (dy * m * 0.5) / K;
          a.toca = b.toca = true;
        }
      }
      for (const b of globos) {
        if (b.x < RX) b.x = RX;
        else if (b.x > ANCHO - RX) b.x = ANCHO - RX;
        if (b.y > SUELO - RY) { b.y = SUELO - RY; b.toca = true; b.suelo = true; }
      }
    }
    for (const b of globos) {
      if (b.suelo) { b.px = b.x - (b.x - b.px) * FRICCION_SUELO; b.suelo = false; }                              // fricción con el suelo
      if (b.toca) {
        b.px = b.x - (b.x - b.px) * FRICCION_GLOBOS; b.py = b.y - (b.y - b.py) * FRICCION_GLOBOS;               // fricción entre globos (poca: resbalan)
      }
    }
  }
}

// Solo apariencia: realce al tocar, gelatina al golpear y giro según se mueve el globo
function animarGlobos() {
  const tocados = new Set(cadena);
  for (const b of globos) {
    b.res += ((tocados.has(b) ? 1 : 0) - b.res) * 0.3;
    const vx = (b.x - b.px) * SUB, vy = (b.y - b.py) * SUB, vel = Math.hypot(vx, vy);
    const frenazo = b.vel0 - vel;                                   // cuánto frenó en este cuadro (golpe o aterrizaje)
    b.vel0 = vel;
    if (frenazo > 1) b.sv += Math.min(0.06, frenazo * 0.012);
    if (frenazo > 2.5 && Math.random() < 0.6) b.angObj = Math.max(-0.45, Math.min(0.45, b.angObj + (Math.random() - 0.5) * 0.7));
    b.sv += -0.25 * b.sq - 0.14 * b.sv;                             // resorte: la gelatina vuelve a su forma
    b.sq = Math.max(-0.15, Math.min(0.15, b.sq + b.sv));
    const ladeo = Math.max(-0.3, Math.min(0.3, vx * 0.05));
    b.ang += (b.angObj + ladeo - b.ang) * 0.1;
  }
  // Los globos tocados crecen y desplazan un poco a los de alrededor. Es solo un corrimiento al DIBUJAR (ox, oy):
  // la posición real no cambia, así que el acomodo de los globos nunca se altera.
  const tope = RX * REALCE * 1.3;
  for (const b of globos) {
    let tx = 0, ty = 0;
    if (!b.art && !tocados.has(b)) {
      for (const o of globos) {
        if (o === b || o.res < 0.02) continue;
        const dx = b.x - o.x, dy = (b.y - o.y) * K, d = Math.hypot(dx, dy);
        const ov = RX * (2 + REALCE * o.res) - d;                   // cuánto se encima con el globo ya crecido
        if (ov <= 0 || d < 1e-6) continue;
        tx += (dx / d) * ov * 0.8; ty += (dy / d) * ov * 0.8 / K;
      }
      const m = Math.hypot(tx, ty);
      if (m > tope) { tx *= tope / m; ty *= tope / m; }
    }
    b.ox += (tx - b.ox) * 0.3; b.oy += (ty - b.oy) * 0.3;
  }
}

// ¿Qué globo está bajo el dedo? (el más cercano al punto, midiendo como óvalo)
function globoEn(p) {
  let mejor = null, md = 1;
  for (const g of globos) {
    if (g.y < 0) continue;
    const dx = (p.x - g.x) / (RX + 3), dy = (p.y - g.y) / (RY + 3), d = dx * dx + dy * dy;
    if (d <= md) { md = d; mejor = g; }
  }
  return mejor;
}

// Intenta añadir a la línea el globo que hay en el punto p (o quitar el último si regresas sobre el anterior)
function probar(p) {
  const ult = cadena[cadena.length - 1];
  const g = globoEn(p);
  if (!g || g === ult || g.art) return;
  if (cadena.length > 1 && g === cadena[cadena.length - 2]) {
    cadena.pop(); sonido("seleccion", cadena.length - 1); return;
  }
  if (g.c !== ult.c || cadena.includes(g)) return;
  if (Math.hypot(g.x - ult.x, (g.y - ult.y) * K) > 2 * RX + TOLERANCIA) return;   // tienen que estar pegados
  cadena.push(g); sonido("seleccion", cadena.length - 1);
}

function arrastrar(p) {
  const dx = p.x - ultimoP.x, dy = p.y - ultimoP.y;
  const pasos = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));   // se revisa el camino completo para no saltarse globos
  for (let i = 1; i <= pasos; i++) probar({ x: ultimoP.x + dx * i / pasos, y: ultimoP.y + dy * i / pasos });
  ultimoP = p;
}

// ---------- Jugadas y artefactos ----------
const ICONO_ARTE = { bomba: "💣", color: "🎨", todo: "💥" };
const NOMBRE_ARTE = { bomba: "¡Bomba!", color: "¡Elimina un color!", todo: "¡Elimina todo!" };
function paleta(g) {
  if (g.art === "bomba") return ["#aab2c8", "#3a4258", "#1b2030"];
  if (g.art === "todo") return ["#fff3b0", "#ffd54a", "#b88400"];
  return COLORES[g.c];
}
// Quita globos del juego con su salpicadura
function quitar(lista) {
  for (const g of lista) {
    const pal = paleta(g);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5;
      chispas.push({ x: g.x, y: g.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, vida: 1, col: Math.random() < 0.5 ? pal[1] : pal[0], r: 2.5 + Math.random() * 3.5 });
    }
    anillos.push({ x: g.x, y: g.y, r: R * 0.6, vida: 1, col: pal[0] });
  }
  const fuera = new Set(lista);
  globos = globos.filter((g) => !fuera.has(g));
}
// Cierra una jugada: n globos reventados (ya quitados). «contar» = cuántos cuentan para los trofeos.
function jugada(n, x, y, contar = n) {
  const ganado = trofeosPor(contar);
  puntos += ganado; reventados += n;
  if (ganado > 0) textos.push({ x, y, txt: "+" + ganado, vida: 1 });
  let cero = false;
  for (const g of globos) if (g.num != null && --g.num <= 0) cero = true;   // los globos con número que siguen en juego bajan 1
  numerosActivos = true;
  pendientes += n;                                                          // caen tantos globos nuevos como reventaste
  for (let i = 0; i < Math.min(n, 8); i++) setTimeout(() => sonido("pop", i), i * 45);
  try { navigator.vibrate && navigator.vibrate(15); } catch (e) {}
  subirNivel(); actualizarMarcador(); pintarNivel();
  if (cero) perder("numero");
}

function crearArtefacto(tipo, x, y) {
  let c = -1;
  if (tipo === "color") {   // el eliminador lleva el color de un globo que haya en el tablero
    const hay = [...new Set(globos.filter((g) => !g.art && g.y > 0).map((g) => g.c))];
    c = hay.length ? hay[Math.floor(Math.random() * hay.length)] : Math.floor(Math.random() * numColores());
  }
  globos.push({ x, y, px: x, py: y, c, art: tipo, reposo: 0, toca: false, ang: 0, angObj: 0, res: 0, sq: 0, sv: 0, vel0: 0, ox: 0, oy: 0 });
  textos.push({ x, y: y - 34, txt: NOMBRE_ARTE[tipo], vida: 1 });
}

function activarArtefacto(a) {
  const vivos = globos.filter((g) => !g.art && g.y > 0);
  let lista;
  if (a.art === "bomba") {
    lista = vivos.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y)).slice(0, GLOBOS_BOMBA);
    monedas++; guardarMonedas();
    textos.push({ x: a.x, y: a.y - 34, txt: "+1 🪙", vida: 1 });
  } else if (a.art === "color") {
    lista = vivos.filter((g) => g.c === a.c);
  } else {
    lista = vivos;
  }
  anillos.push({ x: a.x, y: a.y, r: R, vida: 1.4, col: "#ffd54a" });
  quitar([a, ...lista]);
  sonido(a.art === "color" ? "lluvia" : "bomba");
  jugada(lista.length, a.x, a.y, a.art === "todo" ? Math.min(lista.length, MAX_GLOBOS_TODO) : lista.length);
}

function reventarCadena() {
  const lista = cadena, n = lista.length, ultimo = lista[n - 1];
  cadena = [];
  quitar(lista);
  mejorCadena = Math.max(mejorCadena, n);
  if (n >= 6) { avisoTexto = "¡Línea de " + n + "!"; aviso = 60; }
  jugada(n, ultimo.x, ultimo.y);
  const tipo = n >= GLOBOS_TODO ? "todo" : n >= GLOBOS_COLOR ? "color" : n >= GLOBOS_BOMBA ? "bomba" : null;
  if (tipo && estado === "jugando") crearArtefacto(tipo, ultimo.x, ultimo.y);
}

function actualizarMarcador() {
  elPuntos.textContent = puntos;
  if (puntos > record) {
    record = puntos; elRecord.textContent = record;
    try { localStorage.setItem("globos_record", String(record)); } catch (e) {}
  }
}

function perder(motivo) {
  if (estado === "fin") return;
  estado = "fin"; cadena = []; punteroId = null;
  actualizarMarcador();
  sonido("fin");
  enviarPerfil();
  $("finTexto").textContent = (motivo === "numero" ? "Un globo con número llegó a 0." : "La cubeta se desbordó.") + " Llegaste al nivel " + nivel + " con " + puntos + " trofeos y reventaste " + reventados + " globos. Mejor línea: " + mejorCadena + (puntos >= record && puntos > 0 ? ". ¡Nuevo récord!" : ".");
  $("fin").classList.add("activo");
}

// ---------- Entrada ----------
function posicion(e) {
  const rect = lienzo.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (ANCHO / rect.width), y: (e.clientY - rect.top) * (ALTO / rect.height) };
}
lienzo.addEventListener("pointerdown", (e) => {
  ac();
  if (estado !== "jugando" || punteroId !== null) return;
  const p = posicion(e);
  const g = globoEn(p);
  if (!g) return;
  if (g.art) { activarArtefacto(g); return; }   // los artefactos se usan con un toque
  punteroId = e.pointerId;
  try { lienzo.setPointerCapture(e.pointerId); } catch (err) {}
  cadena = [g]; ultimoP = p; sonido("seleccion", 0);
});
lienzo.addEventListener("pointermove", (e) => {
  if (e.pointerId !== punteroId || estado !== "jugando" || !cadena.length) return;
  arrastrar(posicion(e));
});
function soltar(e) {
  if (e.pointerId !== punteroId) return;
  punteroId = null;
  if (estado !== "jugando") { cadena = []; return; }
  if (cadena.length >= MIN_CADENA) reventarCadena();
  else if (cadena.length > 0) {
    const u = cadena[cadena.length - 1];
    if (cadena.length > 1) textos.push({ x: u.x, y: u.y, txt: "Junta " + MIN_CADENA + " o más", vida: 1 });
    cadena = []; sonido("fallo");
  }
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", (e) => { if (e.pointerId === punteroId) { punteroId = null; cadena = []; } });
document.addEventListener("visibilitychange", () => { if (document.hidden && estado === "jugando") enviarPerfil(); });
$("jugar").addEventListener("click", iniciar);
$("otra").addEventListener("click", iniciar);

// ---------- Actualizar (un paso = 1/60 s) ----------
for (let i = 0; i < 5; i++) nubes.push({ x: Math.random() * ANCHO, y: 40 + Math.random() * 300, s: 0.6 + Math.random() * 0.9, v: 0.12 + Math.random() * 0.2 });

function paso() {
  for (const n of nubes) { n.x += n.v; if (n.x > ANCHO + 80) n.x = -80; }
  for (const s of chispas) { s.x += s.vx; s.y += s.vy; s.vy += 0.22; s.vida -= 0.035; }
  chispas = chispas.filter((s) => s.vida > 0);
  for (const a of anillos) { a.r += 3; a.vida -= 0.08; }
  anillos = anillos.filter((a) => a.vida > 0);
  for (const x of textos) { x.y -= 1.1; x.vida -= 0.022; }
  textos = textos.filter((x) => x.vida > 0);
  if (destello > 0) destello--;
  if (aviso > 0) aviso--;
  tic++;

  if (estado !== "jugando") return;
  t++;
  // los globos reventados se reponen en «jugada»; si quedan muy pocos, cae un puñado más
  const total = globos.reduce((n, g) => n + (g.art ? 0 : 1), 0) + pendientes;   // los artefactos no cuentan: siempre hay TOTAL_GLOBOS
  if (total < TOTAL_GLOBOS) pendientes += TOTAL_GLOBOS - total;
  if (pendientes > 0 && t % 2 === 0) {
    const cuantos = Math.min(pendientes, pendientes > 30 ? 2 : 1);
    for (let i = 0; i < cuantos; i++) nuevoGlobo();
    pendientes -= cuantos;
  }

  fisica();
  animarGlobos();

  // cubeta llena: se mide el globo más alto que ya está asentado
  let tope = SUELO, maxReposo = 0;
  for (const g of globos) {
    const quieto = Math.abs(g.x - g.px) + Math.abs(g.y - g.py) < 0.3;
    if (quieto && g.y > 0) tope = Math.min(tope, g.y - RY);
    if (g.y - RY < LINEA && quieto) g.reposo++; else g.reposo = 0;
    if (g.reposo > maxReposo) maxReposo = g.reposo;
  }
  llenado = Math.max(0, Math.min(1, (SUELO - tope) / (SUELO - LINEA)));
  peligro = maxReposo;
  if (t % 6 === 0) pintarCubeta();
  if (maxReposo > SEG_DESBORDE * 60) perder();
}

// ---------- Dibujo ----------
function dibujarGlobo(g, elegido) {
  const crece = 1 + REALCE * g.res;   // el globo tocado se ve un poco más grande
  if (g.art) {
    const lat = 1 + Math.sin(tic / 8) * 0.06;   // los artefactos laten para distinguirse
    const pal = paleta(g);
    ctx.fillStyle = pal[1];
    ctx.beginPath(); ctx.ellipse(g.x, g.y, RX * lat, RY * lat, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.font = "26px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff"; ctx.fillText(ICONO_ARTE[g.art], g.x, g.y + 1);
    return;
  }
  const estira = Math.min(0.12, Math.abs(g.y - g.py) * SUB * 0.015);   // al caer rápido se estira un poco (agua)
  ctx.save();
  ctx.translate(g.x + g.ox, g.y + g.oy); ctx.rotate(g.ang);
  if (elegido) { ctx.shadowColor = "rgba(255,255,255,.9)"; ctx.shadowBlur = 14; }
  ctx.save();
  ctx.scale((1 - estira + g.sq) * crece, (1 + estira - g.sq) * crece);
  ctx.drawImage(sprites[g.c], -SPR / 2, -CY, SPR, SPR);
  ctx.restore();
  ctx.shadowBlur = 0;
  if (g.num != null) {   // cuenta regresiva: gira con el globo y parpadea en rojo cuando quedan 3 o menos
    ctx.font = "800 28px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineJoin = "round"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(20,40,80,.9)";
    ctx.fillStyle = g.num <= 3 && Math.floor(tic / 6) % 2 === 0 ? "#ff6a6a" : "#fff";
    ctx.strokeText(g.num, 0, 3); ctx.fillText(g.num, 0, 3);
  }
  if (elegido) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.ellipse(0, 0, RX * crece, RY * crece, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function dibujar() {
  ctx.save();

  // cielo: de día a atardecer según la dificultad
  const d = dificultad();
  const cielo = ctx.createLinearGradient(0, 0, 0, ALTO);
  cielo.addColorStop(0, `hsl(${Math.round(210 - d * 50)},75%,${Math.round(58 - d * 22)}%)`);
  cielo.addColorStop(1, `hsl(${Math.round(195 - d * 160)},80%,${Math.round(82 - d * 12)}%)`);
  ctx.fillStyle = cielo; ctx.fillRect(-20, -20, ANCHO + 40, ALTO + 40);

  // nubes
  ctx.fillStyle = "rgba(255,255,255,.55)";
  for (const n of nubes) {
    ctx.beginPath();
    ctx.ellipse(n.x, n.y, 44 * n.s, 16 * n.s, 0, 0, Math.PI * 2);
    ctx.ellipse(n.x - 24 * n.s, n.y + 5 * n.s, 28 * n.s, 12 * n.s, 0, 0, Math.PI * 2);
    ctx.ellipse(n.x + 26 * n.s, n.y + 4 * n.s, 30 * n.s, 12 * n.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // suelo
  ctx.fillStyle = "#3f9a4a"; ctx.fillRect(-20, SUELO, ANCHO + 40, ALTO - SUELO + 20);
  ctx.fillStyle = "#2e7a39"; ctx.fillRect(-20, SUELO, ANCHO + 40, 6);

  // línea roja de desborde (parpadea si hay globos quietos arriba de ella)
  const alerta = peligro > 20 && Math.floor(tic / 6) % 2 === 0;
  ctx.setLineDash([10, 8]); ctx.lineWidth = 3;
  ctx.strokeStyle = alerta ? "#ffffff" : "rgba(255,70,70,.8)";
  ctx.beginPath(); ctx.moveTo(0, LINEA); ctx.lineTo(ANCHO, LINEA); ctx.stroke();
  ctx.setLineDash([]);

  const elegidos = new Set(cadena);
  for (const g of globos) dibujarGlobo(g, elegidos.has(g));

  // línea que va trazando el dedo por los globos
  if (cadena.length > 1) {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(20,40,80,.55)"; ctx.lineWidth = 11;
    ctx.beginPath(); cadena.forEach((g, i) => (i ? ctx.lineTo(g.x, g.y) : ctx.moveTo(g.x, g.y))); ctx.stroke();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 6;
    ctx.beginPath(); cadena.forEach((g, i) => (i ? ctx.lineTo(g.x, g.y) : ctx.moveTo(g.x, g.y))); ctx.stroke();
  }
  if (cadena.length > 0) {   // contador sobre el último globo de la línea
    const u = cadena[cadena.length - 1];
    ctx.font = "800 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(20,40,80,.75)";
    ctx.fillStyle = cadena.length >= MIN_CADENA ? "#ffe27a" : "#fff";
    ctx.strokeText(cadena.length, u.x, u.y - RY * (1 + REALCE) - 10); ctx.fillText(cadena.length, u.x, u.y - RY * (1 + REALCE) - 10);
  }

  for (const a of anillos) {
    ctx.globalAlpha = Math.max(0, a.vida); ctx.strokeStyle = a.col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
  }
  for (const s of chispas) {
    ctx.globalAlpha = Math.max(0, s.vida); ctx.fillStyle = s.col;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.font = "800 22px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(20,40,80,.75)"; ctx.fillStyle = "#fff";
  for (const x of textos) {
    ctx.globalAlpha = Math.max(0, x.vida);
    ctx.strokeText(x.txt, x.x, x.y); ctx.fillText(x.txt, x.x, x.y);
  }
  ctx.globalAlpha = 1;

  if (aviso > 0) {
    ctx.globalAlpha = Math.min(1, aviso / 25);
    ctx.font = "800 32px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 7;
    ctx.strokeText(avisoTexto, ANCHO / 2, ALTO / 2 - 80); ctx.fillText(avisoTexto, ANCHO / 2, ALTO / 2 - 80);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ---------- Ciclo (paso fijo de 1/60 s, igual en pantallas de 60, 90 o 120 Hz) ----------
let ultimo = 0, acum = 0;
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  if (!ultimo) ultimo = ahora;
  acum = Math.min(acum + (ahora - ultimo), 100);
  ultimo = ahora;
  while (acum >= 1000 / 60) { acum -= 1000 / 60; paso(); }
  dibujar();
}
requestAnimationFrame(cuadro);
