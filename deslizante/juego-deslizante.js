// Ruta: deslizante/juego-deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Cada tamaño es una dificultad. La mezcla siempre tiene solución.
const ID = "deslizante";

// ----- Ajustes -----
const NIVELES = [
  { n: 3, nombre: "Fácil 3×3",   puntos: 2 },   // «puntos» = lo que se envía al perfil al resolverlo
  { n: 4, nombre: "Normal 4×4",  puntos: 5 },
  { n: 5, nombre: "Difícil 5×5", puntos: 10 },
  { n: 6, nombre: "Experto 6×6", puntos: 20 },
  { n: 7, nombre: "Maestro 7×7", puntos: 35 },
  { n: 8, nombre: "Genio 8×8",   puntos: 50 },
];
const GUARDA = ID + "_nivel";

const $ = (id) => document.getElementById(id);
let nivel = NIVELES[0], n = 3, t = [];            // t[pos] = número de la ficha (0 = hueco)
let movs = 0, inicio = 0, reloj = null, jugando = false;
const fichas = new Map();                          // número → elemento

// ----- Mezcla con solución garantizada (hueco al final, inversiones pares) -----
function mezclar() {
  const total = n * n;
  let a;
  do {
    a = Array.from({ length: total - 1 }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    let inv = 0;
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) inv++;
    if (inv % 2) [a[0], a[1]] = [a[1], a[0]];
  } while (a.every((v, i) => v === i + 1));        // que no salga ya resuelto
  a.push(0);
  return a;
}
const resuelto = () => t.every((v, i) => (i === t.length - 1 ? v === 0 : v === i + 1));

// ----- Dibujo -----
function color(num) {
  const r = Math.floor((num - 1) / n), c = (num - 1) % n;
  const h = 210 + ((r + c) / (2 * n - 2)) * 150;
  return "hsl(" + h + " 65% 48%)";
}
function construir() {
  $("fichas").innerHTML = "";
  fichas.clear();
  $("tablero").style.setProperty("--n", n);
  for (let k = 1; k < n * n; k++) {
    const f = document.createElement("div");
    f.className = "ficha";
    const s = document.createElement("span");
    s.textContent = k;
    s.style.background = color(k);
    f.appendChild(s);
    f.addEventListener("pointerdown", (e) => { e.preventDefault(); tocar(t.indexOf(k)); });
    $("fichas").appendChild(f);
    fichas.set(k, f);
  }
}
function pintar() {
  t.forEach((v, i) => {
    if (!v) return;
    const f = fichas.get(v);
    f.style.transform = "translate(" + (i % n) * 100 + "%," + Math.floor(i / n) * 100 + "%)";
    f.classList.toggle("bien", v === i + 1);
  });
  $("movs").textContent = movs;
}

// ----- Movimiento -----
function tocar(pos) {
  if (pos < 0 || (jugando === "fin")) return;
  const h = t.indexOf(0);
  const fp = Math.floor(pos / n), cp = pos % n, fh = Math.floor(h / n), ch = h % n;
  if (fp !== fh && cp !== ch) return;               // solo misma fila o columna que el hueco
  if (pos === h) return;
  const paso = fp === fh ? (cp < ch ? 1 : -1) : (fp < fh ? n : -n);
  for (let i = h; i !== pos; i -= paso) t[i] = t[i - paso]; // desliza toda la fila/columna
  t[pos] = 0;
  movs++;
  if (!jugando) { jugando = true; inicio = Date.now(); reloj = setInterval(mostrarTiempo, 250); }
  pintar();
  if (resuelto()) ganar();
}
function mover(dx, dy) {                            // flechas: mueve la ficha que está al lado del hueco
  const h = t.indexOf(0), fh = Math.floor(h / n), ch = h % n;
  const f = fh + dy, c = ch + dx;                   // casilla de la ficha que se desliza hacia el hueco
  if (f < 0 || f >= n || c < 0 || c >= n) return;
  tocar(f * n + c);
}

// ----- Tiempo y récords -----
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const seg = () => Math.floor((Date.now() - inicio) / 1000);
function mostrarTiempo() { $("tiempo").textContent = fmt(seg()); }
const claveMejor = () => ID + "_mejor_" + n;
function leerMejor() { try { return JSON.parse(localStorage.getItem(claveMejor())); } catch (e) { return null; } }
function pintarMejor() { const m = leerMejor(); $("mejor").textContent = m ? m.mov + " mov." : "–"; }

// ----- Victoria -----
async function ganar() {
  clearInterval(reloj);
  const s = seg();
  jugando = "fin";
  mostrarTiempo();
  const m = leerMejor();
  const record = !m || movs < m.mov;
  if (record) { try { localStorage.setItem(claveMejor(), JSON.stringify({ mov: movs, seg: s })); } catch (e) {} pintarMejor(); }
  const v = document.createElement("div");
  v.id = "victoria";
  v.innerHTML = "<h2>🎉 ¡Resuelto!</h2><div>" + movs + " movimientos · " + fmt(s) + (record ? "<br>⭐ ¡Nuevo récord!" : "") + "</div>";
  const b = document.createElement("button");
  b.className = "btn"; b.textContent = "Jugar otra vez";
  b.addEventListener("click", empezar);
  v.appendChild(b);
  $("tablero").appendChild(v);
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    if (await sumarPuntos(ID, nivel.puntos)) $("msg").textContent = "+" + nivel.puntos + " puntos a tu perfil";
    else $("msg").textContent = "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) { $("msg").textContent = "No se pudieron guardar los puntos (sin conexión)."; }
}

// ----- Partida -----
function empezar() {
  clearInterval(reloj);
  const v = $("victoria"); if (v) v.remove();
  n = nivel.n; t = mezclar(); movs = 0; jugando = false;
  $("tiempo").textContent = "0:00";
  $("msg").textContent = "Toca una ficha en la fila o columna del hueco para deslizarla.";
  construir(); pintar(); pintarMejor();
}
function elegir(i) {
  nivel = NIVELES[i];
  try { localStorage.setItem(GUARDA, String(i)); } catch (e) {}
  document.querySelectorAll("#niveles .btn").forEach((b, j) => b.classList.toggle("activo", j === i));
  empezar();
}

NIVELES.forEach((l, i) => {
  const b = document.createElement("button");
  b.className = "btn"; b.textContent = l.nombre;
  b.addEventListener("click", () => elegir(i));
  $("niveles").appendChild(b);
});
$("nuevo").addEventListener("click", empezar);
addEventListener("keydown", (e) => {
  const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] }[e.key];
  if (d) { e.preventDefault(); mover(d[0], d[1]); }
});

let guardado = 0;
try { guardado = Number(localStorage.getItem(GUARDA)) || 0; } catch (e) {}
elegir(NIVELES[guardado] ? guardado : 0);

// Sesión (opcional: si Firebase no carga, el juego igual funciona)
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => ($("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"))
).catch(() => {});
