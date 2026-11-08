// Ruta: botellascolores/juego-botellascolores.js
// Botellas de colores: vierte los colores de una botella a otra hasta que cada botella tenga un solo color.
import { crear, verter, puedeVerter, resuelto, racha } from "./logica-botellascolores.js";
import { NIVELES, PALETA, MUNDOS, NIVELES_POR_MUNDO } from "./niveles-botellascolores.js";
import { montarMapa, ETAPAS } from "./mapa.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";

// ----- Ajustes -----
const ID = "botellas-colores";
const PUNTOS_NIVEL = 10;       // puntos al perfil por nivel, solo la primera vez que se pasa
const CLAVE = "botellas_progreso_v2"; // v2: mundos de 100 niveles; el progreso anterior (botellas_progreso) ya no se usa
const ALTO_CAPA = { 3: 34, 4: 32, 5: 30, 6: 27, 7: 24, 8: 22 }; // alto en px de cada capa según la capacidad

const $ = (id) => document.getElementById(id);
let hechos = [];
let nivel = 0, cap = 3, est = [], hist = [], sel = -1, acabo = false;

try { localStorage.removeItem("botellas_progreso"); } catch (e) {} // borra el progreso de la versión anterior
const leer = () => { try { hechos = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { hechos = []; } };
let nube = null; // sincronización con la cuenta (se conecta al final; sin internet simplemente no se conecta)
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(hechos)); } catch (e) {} if (nube) nube.guardado(); };

// ----- Etapas (cada 100 niveles = un estado de México, ver ETAPAS en mapa.js; también cambia el fondo) -----
const mundoDe = (i) => Math.min(Math.floor(i / NIVELES_POR_MUNDO), MUNDOS.length - 1);
const etapaDe = (i) => ETAPAS[Math.min(Math.floor(i / NIVELES_POR_MUNDO), ETAPAS.length - 1)];
const numEnEtapa = (i) => (i % NIVELES_POR_MUNDO) + 1;
function aplicarMundo(i) {
  const m = MUNDOS[mundoDe(i)];
  const s = document.documentElement.style;
  s.setProperty("--f1", m.fondo[0]);
  s.setProperty("--f2", m.fondo[1]);
  s.setProperty("--f3", m.fondo[2]);
  s.setProperty("--vidrio", m.vidrio);
  s.setProperty("--luna", m.luna);
}

// ----- Inicio y mapa -----
const primeroSinPasar = () => { let s = 0; while (s < NIVELES.length && hechos[s]) s++; return Math.min(s, NIVELES.length - 1); };

function menu() {
  $("juego").hidden = true;
  $("menu").hidden = false;
  mapa.cerrar();
  const s = primeroSinPasar();
  aplicarMundo(s);
  const pasados = hechos.filter(Boolean).length;
  $("menuInfo").textContent = "Niveles pasados: " + pasados + " de " + NIVELES.length;
  $("continuar").textContent = "▶ " + (pasados ? "Continuar" : "Empezar") + " · " + etapaDe(s).nombre + " · Nivel " + numEnEtapa(s);
}

const mapa = montarMapa({
  raiz: $("mapa"), titulo: $("mapaTitulo"), info: $("mapaInfo"), lienzo: $("mapaLienzo"),
  atras: $("mapaAtras"), ir: $("mapaIr"),
  hechos: () => hechos, total: () => NIVELES.length,
  alSalir: () => menu(),
  jugarNivel: (i) => { mapa.cerrar(); jugar(i); },
});

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
  pintar();
  encajar();
}

// Achica las botellas lo necesario para que quepan en la pantalla sin hacer scroll
function encajar() {
  const z = document.querySelector(".zona"), m = $("mesa");
  let a = ALTO_CAPA[cap] || 24;
  m.style.setProperty("--alto", a + "px");
  while (z.scrollHeight > z.clientHeight + 1 && a > 14) { a -= 2; m.style.setProperty("--alto", a + "px"); }
}
addEventListener("resize", () => { if (!$("juego").hidden) encajar(); });

function pintar() {
  $("info").textContent = "Nivel " + numEnEtapa(nivel);
  const oculto = !!NIVELES[nivel].oculto; // modo niebla: solo se ve el color de arriba
  $("pista").textContent = etapaDe(nivel).nombre + (oculto ? " · 🌫️ solo ves el color de arriba" : "");
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
  const cierraEtapa = (nivel + 1) % NIVELES_POR_MUNDO === 0;
  $("textoFinal").textContent = ultimo ? "🎉 ¡Completaste todos los niveles!" : cierraEtapa ? "🎉 ¡Terminaste " + etapaDe(nivel).nombre + "!" : "🎉 ¡Nivel " + numEnEtapa(nivel) + " resuelto!";
  $("siguiente").textContent = ultimo ? "Ver niveles" : cierraEtapa ? "Siguiente estado ▶" : "Siguiente nivel ▶";
  $("final").hidden = false;
  if (primera) {
    encolarPuntos(ID, PUNTOS_NIVEL); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
    try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  }
}

$("volver").addEventListener("click", () => mapa.abrir());
$("verMapa").addEventListener("click", () => mapa.abrir());
$("continuar").addEventListener("click", () => jugar(primeroSinPasar()));
$("deshacer").addEventListener("click", deshacer);
$("reiniciar").addEventListener("click", () => jugar(nivel));
$("siguiente").addEventListener("click", () => (nivel < NIVELES.length - 1 ? jugar(nivel + 1) : menu()));

leer();
menu();

// Sincroniza los niveles pasados con la cuenta de Google (une lo local con lo de la nube: un nivel pasado en cualquier lado cuenta)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: m.unirHechos,
    alCambiar: (v) => { hechos = v || []; if (!$("menu").hidden) menu(); },
  });
}).catch(() => {});
