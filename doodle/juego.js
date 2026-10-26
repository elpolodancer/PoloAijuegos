// Ruta: doodle/juego.js (lógica del juego «doodle»: saltar de plataforma en plataforma, estilo Doodle Jump)
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "doodle"; // el mismo id de juegos.js (colección de puntos en Firestore)
const $ = (id) => document.getElementById(id);
const cv = $("lienzo"), cx = cv.getContext("2d"), W = cv.width, H = cv.height;
const estado = $("estado"), jugar = $("jugar"), btnEntrar = $("entrar");
const G = 1500, SALTO = -720, VX = 260, TAM = 34, PW = 64, PH = 12; // el salto alcanza ~173 px: los huecos no pasan de 150
let usuario = null, p, plats, cam, y0, maxAlt, dir = 0, vivo = false, ultimo = 0;

alCambiarSesion((u) => { usuario = u; btnEntrar.hidden = !!u; });
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

function nuevaPlataforma(y) {
  plats.push({ x: Math.random() * (W - PW), y, vx: Math.random() < 0.2 ? (Math.random() < 0.5 ? -60 : 60) : 0 });
}
function empezar() {
  y0 = H - 100;
  p = { x: W / 2 - TAM / 2, y: y0, vy: SALTO };
  plats = [{ x: W / 2 - PW / 2, y: H - 60, vx: 0 }];
  cam = 0; maxAlt = 0; dir = 0; vivo = true; ultimo = performance.now();
  let y = H - 60;
  while (y > -60) { y -= 60 + Math.random() * 90; nuevaPlataforma(y); }
  jugar.hidden = true;
  estado.textContent = "";
  requestAnimationFrame(ciclo);
}
function puntos() { return Math.floor(maxAlt / 10); }

function mover(dt) {
  p.vy += G * dt;
  const previo = p.y + TAM;
  p.y += p.vy * dt;
  p.x += dir * VX * dt;
  if (p.x < -TAM) p.x = W; else if (p.x > W) p.x = -TAM;
  plats.forEach((q) => {
    q.x += q.vx * dt;
    if (q.x < 0 || q.x > W - PW) q.vx = -q.vx;
    // Solo rebota si va cayendo y cruzó la plataforma por arriba
    if (p.vy > 0 && previo <= q.y && p.y + TAM >= q.y && p.x + TAM > q.x && p.x < q.x + PW) p.vy = SALTO;
  });
  maxAlt = Math.max(maxAlt, y0 - p.y);
  cam = Math.min(cam, p.y - H * 0.4);
  const arriba = Math.min(...plats.map((q) => q.y));
  if (arriba > cam - 60) nuevaPlataforma(arriba - (60 + Math.random() * 90));
  plats = plats.filter((q) => q.y - cam < H + 40);
  if (p.y - cam > H) fin();
}
function dibujar() {
  cx.fillStyle = "#e9f6ff";
  cx.fillRect(0, 0, W, H);
  cx.fillStyle = "#3cb043";
  plats.forEach((q) => { cx.beginPath(); cx.roundRect(q.x, q.y - cam, PW, PH, 6); cx.fill(); });
  const sy = p.y - cam;
  cx.fillStyle = "#f2c200";
  cx.beginPath(); cx.roundRect(p.x, sy, TAM, TAM, 10); cx.fill();
  cx.fillStyle = "#222";
  cx.fillRect(p.x + 8, sy + 9, 5, 7); cx.fillRect(p.x + 21, sy + 9, 5, 7);
  cx.font = "bold 22px system-ui"; cx.fillText(String(puntos()), 12, 30);
}
function ciclo(t) {
  if (!vivo) return;
  mover(Math.min((t - ultimo) / 1000, 0.033));
  ultimo = t;
  if (vivo) { dibujar(); requestAnimationFrame(ciclo); }
}
async function fin() {
  vivo = false;
  jugar.hidden = false;
  jugar.textContent = "Jugar otra vez";
  const n = puntos();
  estado.textContent = "¡Caíste! Llegaste a " + n + " puntos.";
  if (!usuario || !n) return;
  try { await sumarPuntos(ID, n); estado.textContent += " Guardados ✓"; }
  catch (e) { estado.textContent += " No se pudieron guardar (" + e.message + ")"; }
}

// Controles: teclado, o tocar la mitad izquierda / derecha del juego
const teclas = { ArrowLeft: -1, a: -1, A: -1, ArrowRight: 1, d: 1, D: 1 };
addEventListener("keydown", (e) => { if (e.key in teclas) dir = teclas[e.key]; });
addEventListener("keyup", (e) => { if (teclas[e.key] === dir) dir = 0; });
const lado = (e) => ((e.clientX - cv.getBoundingClientRect().left) / cv.getBoundingClientRect().width < 0.5 ? -1 : 1);
cv.addEventListener("pointerdown", (e) => { dir = lado(e); });
cv.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "touch") dir = lado(e); });
addEventListener("pointerup", () => { dir = 0; });
jugar.addEventListener("click", empezar);

// Pantalla inicial
p = { x: W / 2 - TAM / 2, y: H - 100 }; plats = [{ x: W / 2 - PW / 2, y: H - 60 }]; cam = 0; maxAlt = 0; dibujar();
