// Ruta: 2048/juego.js
// El clásico 2048: desliza para juntar números iguales. Tablero de 4×4 (también 5×5 y 6×6), deshacer,
// mejor puntaje por tamaño y la partida se guarda sola en el navegador.
// Ajustes rápidos aquí arriba:
const TAMANOS = [4, 5, 6];
const META = 2048;            // al crear este número aparece el aviso de victoria (puedes seguir jugando)
const PROB_4 = 0.1;           // probabilidad de que salga un 4 en vez de un 2
const MAX_DESHACER = 30;
const PUNTOS_POR_PERFIL = 25; // al perfil se envía 1 punto por cada 25 del juego (jugador.js limita a 1000 por envío)
const ID_JUEGO = "2048";

const $ = (id) => document.getElementById(id);
const tablero = $("tablero");

let N = 4, celda = 80, hueco = 10;
let fichas = [], puntos = 0, mejor = 0, historial = [];
let ganoMostrado = false, terminado = false, enviados = 0, idFicha = 0, partidaId = 0, enviando = false;

try { const t = parseInt(localStorage.getItem("2048-tam")); if (TAMANOS.includes(t)) N = t; } catch (e) {}

// ----- Colores: de cian a rosa según el número; el 2048 es dorado -----
function colorDe(v) {
  const k = Math.log2(v);
  if (v === META) return ["#ffcc33", "#3a2a00"];
  if (v > META) return ["hsl(" + Math.max(20, 48 - (k - 11) * 6) + ",95%," + Math.min(80, 60 + (k - 11) * 3) + "%)", "#2a1d00"];
  return ["hsl(" + (196 + (k - 1) * 12) + ",68%," + (k < 3 ? 46 : 44) + "%)", "#fff"];
}

// ----- Tamaño del tablero (se ajusta a la pantalla) -----
function ajustar() {
  const lado = Math.max(220, Math.min(innerWidth - 24, innerHeight - 250, 520));
  document.documentElement.style.setProperty("--ancho", lado + "px");
  hueco = Math.max(6, Math.round(lado * (N > 4 ? 0.02 : 0.03)));
  celda = (lado - hueco * (N + 1)) / N;
  tablero.style.width = tablero.style.height = lado + "px";
  tablero.querySelectorAll(".celda").forEach((c) => {
    const i = +c.dataset.i, r = Math.floor(i / N), k = i % N;
    c.style.width = c.style.height = celda + "px";
    c.style.transform = "translate(" + x(k) + "px," + x(r) + "px)";
  });
  for (const t of fichas) { dimensionar(t); pintar(t); }
}
const x = (n) => hueco + n * (celda + hueco);
function dimensionar(t) {
  t.el.style.width = t.el.style.height = celda + "px";
  t.el.style.transform = "translate(" + x(t.c) + "px," + x(t.r) + "px)";
}

// ----- Fichas -----
function pintar(t) {
  const [fondo, texto] = colorDe(t.v);
  t.el.style.background = fondo; t.el.style.color = texto;
  const d = String(t.v).length;
  t.el.style.fontSize = Math.round(celda * (d <= 2 ? 0.46 : d === 3 ? 0.38 : d === 4 ? 0.3 : 0.24)) + "px";
  t.el.firstChild.textContent = t.v;
}
function crearFicha(r, c, v, animar) {
  const el = document.createElement("div");
  el.className = "ficha" + (animar ? " nueva" : "");
  el.appendChild(document.createElement("span"));
  tablero.appendChild(el);
  const t = { id: ++idFicha, v, r, c, el };
  fichas.push(t); dimensionar(t); pintar(t);
  return t;
}
function limpiar() { for (const t of fichas) t.el.remove(); fichas = []; }

function construirTablero() {
  tablero.innerHTML = "";
  for (let i = 0; i < N * N; i++) { const c = document.createElement("div"); c.className = "celda"; c.dataset.i = i; tablero.appendChild(c); }
  fichas = [];
  ajustar();
}

function nuevaFicha() {
  const libres = [];
  const ocupado = new Set(fichas.map((t) => t.r * N + t.c));
  for (let i = 0; i < N * N; i++) if (!ocupado.has(i)) libres.push(i);
  if (!libres.length) return;
  const i = libres[Math.floor(Math.random() * libres.length)];
  crearFicha(Math.floor(i / N), i % N, Math.random() < PROB_4 ? 4 : 2, true);
}

// ----- Movimiento: 0 arriba, 1 derecha, 2 abajo, 3 izquierda -----
function mover(dir) {
  if (terminado || !$("velo").hidden) return false;
  const rejilla = Array.from({ length: N }, () => Array(N).fill(null));
  for (const t of fichas) rejilla[t.r][t.c] = t;
  const antes = instantanea();
  let cambio = false, ganado = 0;
  const absorbidas = [], sumadas = [];
  for (let i = 0; i < N; i++) {
    // posiciones de la línea, empezando por el borde hacia el que se mueven
    const linea = [];
    for (let k = 0; k < N; k++) linea.push(dir === 3 ? [i, k] : dir === 1 ? [i, N - 1 - k] : dir === 0 ? [k, i] : [N - 1 - k, i]);
    const colocadas = [];
    for (const [r, c] of linea) {
      const t = rejilla[r][c];
      if (!t) continue;
      const ult = colocadas[colocadas.length - 1];
      let dest;
      if (ult && ult.v === t.v && !ult.fusion) {
        ult.v *= 2; ult.fusion = true; ganado += ult.v;
        dest = linea[colocadas.length - 1];
        absorbidas.push(t); sumadas.push(ult);
        cambio = true;
      } else {
        colocadas.push(t);
        dest = linea[colocadas.length - 1];
      }
      if (dest[0] !== t.r || dest[1] !== t.c) cambio = true;
      t.r = dest[0]; t.c = dest[1];
    }
  }
  if (!cambio) { for (const t of fichas) delete t.fusion; return false; }

  historial.push(antes);
  if (historial.length > MAX_DESHACER) historial.shift();
  puntos += ganado;
  fichas = fichas.filter((t) => !absorbidas.includes(t));
  for (const t of absorbidas) { t.el.style.transform = "translate(" + x(t.c) + "px," + x(t.r) + "px)"; t.el.style.zIndex = 0; }
  for (const t of fichas) { dimensionar(t); t.el.style.zIndex = 1; }
  setTimeout(() => {
    for (const t of absorbidas) t.el.remove();
    for (const t of sumadas) { pintar(t); t.el.classList.remove("suma"); void t.el.offsetWidth; t.el.classList.add("suma"); }
  }, 120);
  for (const t of fichas) delete t.fusion;
  nuevaFicha();
  marcador(); guardar();
  revisar();
  return true;
}

function sinMovimientos() {
  if (fichas.length < N * N) return false;
  const g = Array.from({ length: N }, () => Array(N).fill(0));
  for (const t of fichas) g[t.r][t.c] = t.v;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (c + 1 < N && g[r][c] === g[r][c + 1]) return false;
    if (r + 1 < N && g[r][c] === g[r + 1][c]) return false;
  }
  return true;
}

function revisar() {
  if (!ganoMostrado && fichas.some((t) => t.v >= META)) {
    ganoMostrado = true; guardar();
    velo("🏆 ¡Llegaste a " + META + "!", "Puedes seguir jugando para conseguir un número aún mayor.", [["Seguir jugando", cerrarVelo, true], ["Nueva partida", nueva]]);
    enviar();
  } else if (sinMovimientos()) {
    terminado = true; guardar();
    velo("Sin movimientos", "Puntos: " + puntos + " · Número más alto: " + Math.max(...fichas.map((t) => t.v)), [["Nueva partida", nueva, true], ["Deshacer", deshacer]]);
    enviar();
  }
}

// ----- Marcador, guardado y deshacer -----
function marcador() {
  if (puntos > mejor) { mejor = puntos; try { localStorage.setItem("2048-mejor-" + N, String(mejor)); } catch (e) {} }
  $("pts").textContent = puntos; $("mejor").textContent = mejor;
  $("deshacer").disabled = historial.length === 0;
}
const instantanea = () => ({ f: fichas.map((t) => ({ v: t.v, r: t.r, c: t.c })), p: puntos });
function guardar() {
  try { localStorage.setItem("2048-partida-" + N, JSON.stringify({ ...instantanea(), g: ganoMostrado, e: enviados, h: historial.slice(-10) })); } catch (e) {}
}
function restaurar(s) {
  limpiar();
  for (const o of s.f) crearFicha(o.r, o.c, o.v, false);
  puntos = s.p;
}
function deshacer() {
  if (!historial.length) return;
  restaurar(historial.pop());
  terminado = false; cerrarVelo(); marcador(); guardar();
}

// ----- Puntos al perfil (solo suben, nunca se repiten al deshacer) -----
async function enviar() {
  const falta = Math.floor(puntos / PUNTOS_POR_PERFIL) - enviados;
  if (falta <= 0 || enviando) return;
  enviando = true;
  const id = partidaId; // si mientras tanto empiezas otra partida, no se mezcla el conteo
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    if (await sumarPuntos(ID_JUEGO, falta)) { if (id === partidaId) { enviados += falta; guardar(); $("msg").textContent = "Puntos guardados en tu perfil."; } }
    else $("msg").textContent = "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) { $("msg").textContent = "No se pudieron guardar los puntos (sin conexión)."; }
  enviando = false;
}

// ----- Ventana de avisos -----
function velo(titulo, texto, botones) {
  $("veloTitulo").textContent = titulo; $("veloTexto").textContent = texto; $("msg").textContent = "";
  const cont = $("veloBotones"); cont.innerHTML = "";
  for (const [t, fn, principal] of botones) {
    const b = document.createElement("button");
    b.className = principal ? "btn" : "btn2"; b.textContent = t; b.addEventListener("click", fn);
    cont.appendChild(b);
  }
  $("velo").hidden = false;
}
function cerrarVelo() { $("velo").hidden = true; }

// ----- Partidas -----
function nueva() {
  enviar();
  partidaId++;
  cerrarVelo(); limpiar();
  puntos = 0; historial = []; ganoMostrado = false; terminado = false; enviados = 0;
  nuevaFicha(); nuevaFicha();
  marcador(); guardar();
}
function cambiarTamano(n) {
  enviar();
  N = n;
  try { localStorage.setItem("2048-tam", String(n)); } catch (e) {}
  marcarTamanos(); cargarTamano();
}
function cargarTamano() {
  partidaId++;
  cerrarVelo(); construirTablero();
  try { mejor = parseInt(localStorage.getItem("2048-mejor-" + N)) || 0; } catch (e) { mejor = 0; }
  let s = null;
  try { s = JSON.parse(localStorage.getItem("2048-partida-" + N)); } catch (e) {}
  if (s && Array.isArray(s.f) && s.f.length && s.f.every((o) => o.r < N && o.c < N)) {
    restaurar(s); historial = Array.isArray(s.h) ? s.h : []; ganoMostrado = !!s.g; enviados = s.e || 0;
    terminado = sinMovimientos();
    marcador();
    if (terminado) revisar();
  } else nueva();
}
function marcarTamanos() { document.querySelectorAll("#tamanos .btn2").forEach((b) => b.classList.toggle("sel", +b.dataset.n === N)); }

for (const n of TAMANOS) {
  const b = document.createElement("button");
  b.className = "btn2"; b.dataset.n = n; b.textContent = n + "×" + n;
  b.addEventListener("click", () => n !== N && cambiarTamano(n));
  $("tamanos").appendChild(b);
}
$("nueva").addEventListener("click", () => (puntos > 0 && !terminado ? velo("¿Nueva partida?", "Se pierde la partida actual.", [["Sí, empezar", nueva, true], ["Seguir", cerrarVelo]]) : nueva()));
$("deshacer").addEventListener("click", deshacer);

// ----- Controles: flechas/WASD y deslizar -----
const TECLAS = { arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3 };
addEventListener("keydown", (e) => {
  const d = TECLAS[e.key.toLowerCase()];
  if (d === undefined) return;
  e.preventDefault(); mover(d);
});
let p0 = null;
addEventListener("pointerdown", (e) => { p0 = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", (e) => {
  if (!p0) return;
  const dx = e.clientX - p0.x, dy = e.clientY - p0.y; p0 = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  mover(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
});
addEventListener("pointercancel", () => (p0 = null));
addEventListener("resize", ajustar);
document.addEventListener("visibilitychange", () => { if (document.hidden) enviar(); });

marcarTamanos();
cargarTamano();
