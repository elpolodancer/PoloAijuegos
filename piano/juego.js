// Ruta: piano/juego.js (lógica del juego «piano»: tocar las teclas negras que bajan, estilo Piano Tiles)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "piano"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");
const COLS = 4, CW = W / COLS, RH = H / 4; // 4 columnas y 4 filas visibles
const NOTAS = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25]; // escala pentatónica: suena bonito al tocar
let usuario = null, filas = [], puntos = 0, vivo = false, ultimo = 0, error = null, audio = null;

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

function nota() {
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = "triangle";
    o.frequency.value = NOTAS[puntos % NOTAS.length] * (puntos % 16 < 8 ? 1 : 2);
    g.gain.setValueAtTime(0.3, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.35);
  } catch (e) {}
}
const columna = () => Math.floor(Math.random() * COLS);
function empezar() {
  filas = [];
  for (let i = 0; i < 6; i++) filas.push({ c: columna(), y: H - RH * (i + 2), hit: false });
  puntos = 0; error = null; vivo = true; ultimo = performance.now();
  jugar.hidden = true;
  estado.textContent = "";
  requestAnimationFrame(ciclo);
}
function dibujar() {
  cx.fillStyle = "#fff";
  cx.fillRect(0, 0, W, H);
  cx.strokeStyle = "#ccc";
  for (let i = 1; i < COLS; i++) { cx.beginPath(); cx.moveTo(i * CW, 0); cx.lineTo(i * CW, H); cx.stroke(); }
  filas.forEach((f) => {
    cx.fillStyle = f.hit ? "#b9b3ff" : "#111";
    cx.fillRect(f.c * CW + 2, f.y + 2, CW - 4, RH - 4);
  });
  if (error) { cx.fillStyle = "#e53935"; cx.fillRect(error.c * CW + 2, error.y + 2, CW - 4, RH - 4); }
  cx.fillStyle = "#7c5cff"; cx.font = "bold 36px system-ui"; cx.textAlign = "center";
  cx.fillText(String(puntos), W / 2, 50);
  cx.textAlign = "start";
}
function ciclo(t) {
  if (!vivo) return;
  const dt = Math.min((t - ultimo) / 1000, 0.05);
  ultimo = t;
  const vel = Math.min(150 + puntos * 6, 520); // cada acierto acelera un poco
  filas.forEach((f) => { f.y += vel * dt; });
  while (filas[filas.length - 1].y > -RH) filas.push({ c: columna(), y: filas[filas.length - 1].y - RH, hit: false });
  const perdida = filas.find((f) => !f.hit && f.y >= H);
  filas = filas.filter((f) => f.y < H + RH);
  if (perdida) { error = { c: perdida.c, y: H - RH }; fin("Se te pasó una tecla."); }
  dibujar();
  if (vivo) requestAnimationFrame(ciclo);
}
function tocar(e) {
  if (!vivo) return;
  const col = Math.min(COLS - 1, Math.floor(((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width) * COLS));
  // Siempre se toca la tecla negra más baja que aún no se ha tocado
  const objetivo = filas.filter((f) => !f.hit).sort((a, b) => b.y - a.y)[0];
  if (!objetivo) return;
  if (objetivo.c === col) { objetivo.hit = true; nota(); puntos++; }
  else { error = { c: col, y: objetivo.y }; fin("Tocaste la tecla equivocada."); dibujar(); }
}
async function fin(motivo) {
  vivo = false;
  jugar.hidden = false;
  jugar.textContent = "Jugar otra vez";
  estado.textContent = motivo + " Hiciste " + puntos + " puntos.";
  if (!usuario || !puntos) return;
  try { await sumarPuntos(ID, puntos); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
}
cv.addEventListener("pointerdown", tocar);
jugar.addEventListener("click", empezar);
dibujar(); // pantalla inicial
