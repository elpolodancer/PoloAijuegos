// Ruta: ejemplo/juego.js (lógica del juego «ejemplo»)
// Juego de ejemplo: la plantilla para los demás. Solo carga lo suyo + la carpeta «compartido».
import { alCambiarSesion, entrar, sumarPuntos } from "../compartido/jugador.js";

const ID = "ejemplo"; // el mismo id de juegos.js: es el nombre de su colección de puntos en Firestore
const SEGUNDOS = 15;
const $ = (id) => document.getElementById(id);
const area = $("area"), blanco = $("blanco"), inicio = $("inicio"), estado = $("estado"), btnEntrar = $("entrar");
let puntos = 0, restante = 0, reloj = null, usuario = null;

alCambiarSesion((u) => {
  usuario = u;
  btnEntrar.hidden = !!u;
  estado.textContent = u ? "Sesión: " + (u.displayName || "Jugador") : "Sin sesión: tus puntos no se guardan.";
});
btnEntrar.addEventListener("click", () => entrar().catch((e) => { estado.textContent = e.message; }));

function mover() {
  blanco.style.left = Math.random() * (area.clientWidth - 48) + "px";
  blanco.style.top = Math.random() * (area.clientHeight - 48) + "px";
}
function empezar() {
  puntos = 0;
  restante = SEGUNDOS;
  $("marcador").textContent = "0";
  $("tiempo").textContent = String(restante);
  inicio.hidden = true;
  blanco.hidden = false;
  mover();
  reloj = setInterval(() => {
    restante--;
    $("tiempo").textContent = String(restante);
    if (restante <= 0) terminar();
  }, 1000);
}
async function terminar() {
  clearInterval(reloj);
  blanco.hidden = true;
  inicio.hidden = false;
  inicio.textContent = "Jugar otra vez";
  estado.textContent = "¡Terminó! Hiciste " + puntos + " puntos.";
  if (!usuario || !puntos) return;
  try {
    await sumarPuntos(ID, puntos);
    estado.textContent += " Guardados ✓";
  } catch (e) {
    estado.textContent += " No se pudieron guardar (" + e.message + ")";
  }
}
blanco.addEventListener("pointerdown", () => {
  puntos++;
  $("marcador").textContent = String(puntos);
  mover();
});
inicio.addEventListener("click", empezar);
