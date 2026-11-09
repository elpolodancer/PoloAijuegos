// Ruta: deslizante/juego-deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Menú de inicio (Jugar / Niveles) y niveles fijos que se desbloquean en orden (ver niveles-deslizante.js).
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { NIVELES, POR_TAMANO, TAMANO_MAX, puntosDe } from "./niveles-deslizante.js";

const ID = "deslizante";
const $ = (id) => document.getElementById(id);

// ----- Progreso (local primero; se sincroniza con la cuenta de Google si hay internet y sesión) -----
// { hechos: [true|null por nivel], mejores: { "<número de nivel>": { mov, seg } } }
const CLAVE = ID + "_progreso";
const limpiar = (p) => (p && typeof p === "object" && (Array.isArray(p.hechos) || p.mejores))
  ? { hechos: Array.isArray(p.hechos) ? p.hechos : [], mejores: p.mejores && typeof p.mejores === "object" ? p.mejores : {} }
  : null; // formato viejo (récords sueltos por tamaño): se ignora
let prog = { hechos: [], mejores: {} }, nube = null;
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
function guardarProg() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
const hecho = (i) => !!prog.hechos[i];
const desbloqueado = (i) => i === 0 || hecho(i - 1);

// Datos de un nivel: tamaño y número dentro de su tamaño (1 a 10)
function info(i) {
  const n = NIVELES[i].n;
  return { n, num: NIVELES.slice(0, i).filter((x) => x.n === n).length + 1 };
}
// Primer nivel sin pasar (el que toca jugar); si ya pasó todos los que hay, el último
function siguientePendiente() {
  const i = NIVELES.findIndex((_, k) => !hecho(k));
  return i < 0 ? NIVELES.length - 1 : i;
}

// ----- Pantallas -----
function mostrar(nombre) {
  for (const p of ["inicio", "pantalla-niveles", "juego"]) $(p).hidden = p !== nombre;
  $("btn-menu").hidden = nombre === "inicio"; // «Menú principal» solo fuera del menú principal
  if (nombre !== "juego") clearInterval(reloj);
  if (nombre === "inicio") pintarInicio();
  if (nombre === "pantalla-niveles") pintarNiveles();
}
function pintarInicio() {
  const pasados = prog.hechos.filter(Boolean).length;
  $("resumen").textContent = pasados + " de " + NIVELES.length + " niveles pasados";
  const i = siguientePendiente(), d = info(i);
  $("btn-jugar").innerHTML = '<span class="b-ico">▶</span> ' + (pasados ? "Continuar" : "Jugar");
  $("btn-jugar").title = "Nivel " + d.num + " de " + d.n + "×" + d.n;
}
function pintarNiveles() {
  const cont = $("lista-niveles");
  cont.innerHTML = "";
  const tamanos = [...new Set(NIVELES.map((l) => l.n))];
  for (const n of tamanos) {
    const g = document.createElement("div");
    g.className = "grupo";
    const idx = NIVELES.map((l, i) => (l.n === n ? i : -1)).filter((i) => i >= 0);
    const h = document.createElement("h3");
    h.textContent = n + "×" + n + " · " + idx.filter(hecho).length + "/" + POR_TAMANO;
    const r = document.createElement("div");
    r.className = "rejilla-niveles";
    idx.forEach((i, k) => {
      const b = document.createElement("button");
      const libre = desbloqueado(i);
      b.className = "b3d txt " + (hecho(i) ? "b-verde" : libre ? "b-azul" : "b-gris");
      b.textContent = libre ? String(k + 1) : "🔒";
      b.disabled = !libre;
      b.setAttribute("aria-label", "Nivel " + (k + 1) + " de " + n + "×" + n + (libre ? "" : " (bloqueado)"));
      b.addEventListener("click", () => jugarNivel(i));
      r.appendChild(b);
    });
    g.append(h, r);
    cont.appendChild(g);
  }
  if (Math.max(...tamanos) < TAMANO_MAX) {
    const p = document.createElement("p");
    p.className = "proximamente";
    p.textContent = "🚧 Más niveles pronto: " + (Math.max(...tamanos) + 1) + "×" + (Math.max(...tamanos) + 1) + " hasta " + TAMANO_MAX + "×" + TAMANO_MAX + ".";
    cont.appendChild(p);
  }
}

// ----- Juego -----
let idx = 0, n = 3, t = [];                        // t[pos] = número de la ficha (0 = hueco)
let movs = 0, inicio = 0, reloj = null, jugando = false;
const fichas = new Map();                          // número → elemento

const resuelto = () => t.every((v, i) => (i === t.length - 1 ? v === 0 : v === i + 1));
// ¿Tiene solución? (avisa en consola si algún nivel nuevo está mal armado)
function esResoluble(m, a) {
  let inv = 0;
  const f = a.filter(Boolean);
  for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) if (f[i] > f[j]) inv++;
  if (m % 2) return inv % 2 === 0;
  return (inv + (m - Math.floor(a.indexOf(0) / m))) % 2 === 1;
}

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

function tocar(pos) {
  if (pos < 0 || jugando === "fin") return;
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
  const f = fh + dy, c = ch + dx;
  if (f < 0 || f >= n || c < 0 || c >= n) return;
  tocar(f * n + c);
}

const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
const seg = () => Math.floor((Date.now() - inicio) / 1000);
function mostrarTiempo() { $("tiempo").textContent = fmt(seg()); }
function pintarMejor() { const m = prog.mejores[idx + 1]; $("mejor").textContent = m ? m.mov + " mov." : "–"; }

async function ganar() {
  clearInterval(reloj);
  const s = seg();
  jugando = "fin";
  mostrarTiempo();
  const m = prog.mejores[idx + 1];
  const record = !m || movs < m.mov;
  const primera = !hecho(idx);
  if (record) prog.mejores[idx + 1] = { mov: movs, seg: s };
  prog.hechos[idx] = true;
  guardarProg();
  pintarMejor();

  const d = info(idx), l = NIVELES[idx], hay = idx + 1 < NIVELES.length;
  const v = document.createElement("div");
  v.id = "victoria";
  v.innerHTML = "<h2>🎉 ¡Resuelto!</h2><div>" + movs + " movimientos · " + fmt(s) + (l.optimo ? "<br>Mínimo posible: " + l.optimo : "") +
    (record ? "<br>⭐ ¡Nuevo récord!" : "") + (hay ? "" : "<br>🚧 Más niveles pronto") + "</div>";
  const caja = document.createElement("div");
  caja.className = "botones";
  const boton = (texto, clase, fn) => { const b = document.createElement("button"); b.className = "b3d txt " + clase; b.textContent = texto; b.addEventListener("click", fn); caja.appendChild(b); };
  if (hay) boton("Siguiente nivel", "b-verde", () => jugarNivel(idx + 1));
  boton("Repetir", "b-oro", empezar);
  boton("Niveles", "b-azul", () => mostrar("pantalla-niveles"));
  v.appendChild(caja);
  $("tablero").appendChild(v);

  if (!primera) return;                             // los puntos se dan solo la primera vez que se pasa el nivel
  const pts = puntosDe(d.n);
  encolarPuntos(ID, pts);                           // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  $("msg").textContent = pendientes === 0
    ? "+" + pts + " puntos a tu perfil"
    : "+" + pts + " puntos anotados: se enviarán a tu perfil cuando tengas internet y hayas entrado con Google.";
}

function empezar() {
  clearInterval(reloj);
  const v = $("victoria"); if (v) v.remove();
  const l = NIVELES[idx], d = info(idx);
  n = l.n; t = l.fichas.slice(); movs = 0; jugando = false;
  if (!esResoluble(n, t)) console.warn("deslizante: el nivel " + (idx + 1) + " no tiene solución");
  $("titulo").innerHTML = "Nivel " + d.num + " · " + n + "×" + n + (l.optimo ? "<small>Mínimo posible: " + l.optimo + " movimientos</small>" : "");
  $("tiempo").textContent = "0:00";
  $("msg").textContent = "Toca una ficha en la fila o columna del hueco para deslizarla.";
  construir(); pintar(); pintarMejor();
}
function jugarNivel(i) {
  if (!NIVELES[i] || !desbloqueado(i)) return;
  idx = i;
  mostrar("juego");
  empezar();
}

// ----- Botones y teclado -----
$("btn-jugar").addEventListener("click", () => jugarNivel(siguientePendiente()));
$("btn-niveles").addEventListener("click", () => mostrar("pantalla-niveles"));
$("btn-menu").addEventListener("click", () => mostrar("inicio"));
$("reiniciar").addEventListener("click", empezar);
addEventListener("keydown", (e) => {
  if ($("juego").hidden) return;
  const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] }[e.key];
  if (d) { e.preventDefault(); mover(d[0], d[1]); }
});

mostrar("inicio");

// ----- Sesión y nube (opcionales: si Firebase no carga, el juego igual funciona) -----
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => ($("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"))
).catch(() => {});

// Niveles pasados: se unen (pasado en cualquier sitio = pasado). Récords: por nivel, menos movimientos (y si empatan, menos tiempo).
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => {
      a = limpiar(a); b = limpiar(b);
      if (!a && !b) return null;
      const mej = { ...((b && b.mejores) || {}) };
      for (const k in (a && a.mejores) || {}) {
        const x = a.mejores[k], y = mej[k];
        mej[k] = !y || (x && (x.mov < y.mov || (x.mov === y.mov && x.seg < y.seg))) ? x : y;
      }
      return { hechos: m.unirHechos(a && a.hechos, b && b.hechos) || [], mejores: mej };
    },
    alCambiar: (v) => {
      prog = limpiar(v) || prog;
      if (!$("inicio").hidden) pintarInicio();
      if (!$("pantalla-niveles").hidden) pintarNiveles();
      if (!$("juego").hidden) pintarMejor();
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});
