// Ruta: botellascolores/juego.js
// Botellas de colores: vierte los colores de una botella a otra hasta que cada botella tenga un solo color.
import { crear, verter, puedeVerter, resuelto, racha } from "./logica.js";
import { NIVELES, PALETA, MUNDOS, NIVELES_POR_MUNDO } from "./niveles.js";

// ----- Ajustes -----
const ID = "botellas-colores";
const PUNTOS_NIVEL = 10;       // puntos al perfil por nivel, solo la primera vez que se pasa
const CLAVE = "botellas_progreso";
const ALTO_CAPA = { 3: 34, 4: 32, 5: 30, 6: 27, 7: 24, 8: 22 }; // alto en px de cada capa según la capacidad

const $ = (id) => document.getElementById(id);
let hechos = [];
let nivel = 0, cap = 3, est = [], hist = [], sel = -1, acabo = false;

const leer = () => { try { hechos = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { hechos = []; } };
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(hechos)); } catch (e) {} };

// ----- Mundos (cada 25 niveles cambia el fondo) -----
const mundoDe = (i) => Math.min(Math.floor(i / NIVELES_POR_MUNDO), MUNDOS.length - 1);
function aplicarMundo(i) {
  const m = MUNDOS[mundoDe(i)];
  const s = document.documentElement.style;
  s.setProperty("--f1", m.fondo[0]);
  s.setProperty("--f2", m.fondo[1]);
  s.setProperty("--f3", m.fondo[2]);
  s.setProperty("--vidrio", m.vidrio);
  s.setProperty("--luna", m.luna);
}

// ----- Menú -----
function menu() {
  $("juego").hidden = true;
  $("menu").hidden = false;
  let siguiente = 0; // primer nivel sin pasar
  while (siguiente < NIVELES.length && hechos[siguiente]) siguiente++;
  if (siguiente >= NIVELES.length) siguiente = NIVELES.length - 1;
  aplicarMundo(siguiente);
  const c = $("niveles");
  c.innerHTML = "";
  MUNDOS.forEach((m, w) => {
    const ini = w * NIVELES_POR_MUNDO;
    const fin = Math.min(ini + NIVELES_POR_MUNDO, NIVELES.length);
    if (ini >= NIVELES.length) return;
    let pasados = 0;
    for (let i = ini; i < fin; i++) if (hechos[i]) pasados++;
    const det = document.createElement("details");
    det.className = "mundo";
    det.open = w === mundoDe(siguiente);
    const sum = document.createElement("summary");
    sum.textContent = m.nombre + " · " + pasados + "/" + (fin - ini) + (ini > 0 && !hechos[ini - 1] ? " 🔒" : "");
    const rej = document.createElement("div");
    rej.className = "rejilla-niv";
    for (let i = ini; i < fin; i++) {
      const b = document.createElement("button");
      b.textContent = hechos[i] ? "✓ " + (i + 1) : i + 1;
      b.disabled = i > 0 && !hechos[i - 1];
      if (hechos[i]) b.className = "hecho";
      b.addEventListener("click", () => jugar(i));
      rej.appendChild(b);
    }
    det.append(sum, rej);
    c.appendChild(det);
  });
}

// ----- Partida -----
function jugar(i) {
  nivel = i;
  const n = NIVELES[i];
  cap = n.capacidad;
  est = crear(n);
  hist = [];
  sel = -1;
  acabo = false;
  aplicarMundo(i);
  $("menu").hidden = true;
  $("juego").hidden = false;
  $("final").hidden = true;
  $("mesa").style.setProperty("--alto", (ALTO_CAPA[cap] || 24) + "px");
  pintar();
}

function pintar() {
  $("info").textContent = "Nivel " + (nivel + 1);
  const oculto = !!NIVELES[nivel].oculto; // modo niebla: solo se ve el color de arriba
  $("pista").textContent = MUNDOS[mundoDe(nivel)].nombre + (oculto ? " · 🌫️ solo ves el color de arriba" : "");
  const m = $("mesa");
  m.innerHTML = "";
  m.style.setProperty("--cap", cap);
  est.forEach((b, i) => {
    const d = document.createElement("div");
    d.className = "bot" + (i === sel ? " sel" : "") + (b.length === cap && b.every((v) => v === b[0]) ? " lista" : "");
    const cuello = document.createElement("div");
    cuello.className = "cuello";
    const cuerpo = document.createElement("div");
    cuerpo.className = "cuerpo";
    const visibles = racha(b); // las capas del mismo color que la de arriba se ven juntas
    b.forEach((v, k) => {
      const s = document.createElement("div");
      s.className = "seg";
      if (oculto && k < b.length - visibles) {
        s.classList.add("oculto");
        s.textContent = "?";
      } else {
        s.style.background = PALETA[v];
      }
      cuerpo.appendChild(s);
    });
    d.append(cuello, cuerpo);
    d.addEventListener("click", () => tocar(i));
    m.appendChild(d);
  });
}

function tocar(i) {
  if (acabo) return;
  if (sel < 0) {
    if (est[i].length) sel = i;
  } else if (sel === i) {
    sel = -1;
  } else if (puedeVerter(est[sel], est[i], cap)) {
    hist.push(est.map((b) => b.slice()));
    verter(est, sel, i, cap);
    sel = -1;
    pintar();
    if (resuelto(est, cap)) return ganar();
    return;
  } else {
    sel = est[i].length ? i : -1; // cambia de botella elegida
  }
  pintar();
}

function deshacer() {
  if (acabo || !hist.length) return;
  est = hist.pop();
  sel = -1;
  pintar();
}

async function ganar() {
  acabo = true;
  const primera = !hechos[nivel];
  hechos[nivel] = true;
  guardar();
  const ultimo = nivel === NIVELES.length - 1;
  $("textoFinal").textContent = ultimo ? "🎉 ¡Completaste todos los niveles!" : "🎉 ¡Nivel " + (nivel + 1) + " resuelto!";
  $("siguiente").textContent = ultimo ? "Ver niveles" : "Siguiente nivel ▶";
  $("final").hidden = false;
  if (primera) {
    try {
      const { sumarPuntos } = await import("../compartido/jugador.js");
      await sumarPuntos(ID, PUNTOS_NIVEL); // solo guarda si hay sesión iniciada
    } catch (e) {}
  }
}

$("volver").addEventListener("click", () => { menu(); });
$("deshacer").addEventListener("click", deshacer);
$("reiniciar").addEventListener("click", () => jugar(nivel));
$("siguiente").addEventListener("click", () => (nivel < NIVELES.length - 1 ? jugar(nivel + 1) : menu()));

leer();
menu();
