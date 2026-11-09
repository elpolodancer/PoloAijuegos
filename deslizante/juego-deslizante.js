// Ruta: deslizante/juego-deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Menú de inicio (Jugar / Niveles) y niveles fijos que se desbloquean en orden (ver niveles-deslizante.js).
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { NIVELES, POR_TAMANO, TAMANO_MAX, puntosDe } from "./niveles-deslizante.js";

const ID = "deslizante";
const $ = (id) => document.getElementById(id);

// ----- Progreso (local primero; se sincroniza con la cuenta de Google si hay internet y sesión) -----
// { hechos: [true|null por nivel], mejores: { "<número de nivel>": { mov, ms } },
//   libre: { "<tamaño>": { mov, ms, ganados } } }
//   mov = menos movimientos y ms = menor tiempo en milisegundos: son dos récords independientes (pueden venir de partidas distintas).
//   libre = modo libre: mejores marcas y tableros resueltos por tamaño.
const CLAVE = ID + "_progreso";
const obj = (x) => (x && typeof x === "object" ? x : {});
// Una marca válida { mov, ms }. Las de antes traían «seg» (segundos enteros): se pasan a milisegundos.
function marca(x) {
  if (!x || typeof x !== "object") return null;
  const mov = Number(x.mov) || 0;
  const ms = Number(x.ms) > 0 ? Number(x.ms) : Math.max(1, (Number(x.seg) || 0) * 1000);
  return mov > 0 ? { mov, ms } : null;
}
function marcas(o, conGanados) {
  const r = {};
  for (const k in obj(o)) {
    const m = marca(o[k]);
    if (m) r[k] = conGanados ? { ...m, ganados: Math.max(0, Number(o[k].ganados) || 0) } : m;
  }
  return r;
}
const limpiar = (p) => (p && typeof p === "object" && (Array.isArray(p.hechos) || p.mejores || p.libre))
  ? { hechos: Array.isArray(p.hechos) ? p.hechos : [], mejores: marcas(p.mejores), libre: marcas(p.libre, true) }
  : null; // formato viejo (récords sueltos por tamaño): se ignora

// Tiempo como m:ss.d (con horas si hace falta); ms = milisegundos
function fmtMs(ms) {
  const dec = Math.floor(ms / 100) % 10, s = Math.floor(ms / 1000);
  const sec = String(s % 60).padStart(2, "0"), min = Math.floor(s / 60) % 60, h = Math.floor(s / 3600);
  return (h ? h + ":" + String(min).padStart(2, "0") : min) + ":" + sec + "." + dec;
}
let prog = { hechos: [], mejores: {}, libre: {} }, nube = null;
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

// Modo libre: un tamaño está abierto cuando su etapa está desbloqueada (su primer nivel se puede jugar). El 3×3 siempre.
function tamanoAbierto(m) {
  const i = NIVELES.findIndex((l) => l.n === m);
  return i >= 0 && desbloqueado(i);
}

// ----- Pantallas -----
function mostrar(nombre) {
  for (const p of ["inicio", "pantalla-niveles", "pantalla-libre", "juego"]) $(p).hidden = p !== nombre;
  $("btn-menu").hidden = nombre === "inicio"; // «Menú principal» solo fuera del menú principal
  if (nombre !== "juego") clearInterval(reloj);
  if (nombre === "inicio") pintarInicio();
  if (nombre === "pantalla-niveles") pintarNiveles();
  if (nombre === "pantalla-libre") pintarLibre();
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
      const mk = prog.mejores[i + 1];
      if (libre) {
        const a = document.createElement("span"), c = document.createElement("span");
        a.className = "nivel-num"; a.textContent = String(k + 1);
        c.className = "nivel-t"; c.textContent = mk ? fmtMs(mk.ms) : "–";
        b.append(a, c);
      } else b.textContent = "🔒";
      b.disabled = !libre;
      b.setAttribute("aria-label", "Nivel " + (k + 1) + " de " + n + "×" + n + (libre ? (mk ? ", mejor tiempo " + fmtMs(mk.ms) : "") : " (bloqueado)"));
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

function pintarLibre() {
  const cont = $("rejilla-libre");
  cont.innerHTML = "";
  for (let m = 3; m <= TAMANO_MAX; m++) {
    const abierto = tamanoAbierto(m), r = prog.libre[m];
    const b = document.createElement("button");
    b.className = "b3d txt " + (abierto ? "b-morado" : "b-gris");
    b.textContent = abierto ? m + "×" + m : "🔒 " + m;
    b.disabled = !abierto;
    b.title = abierto ? (r ? "Mejor tiempo: " + fmtMs(r.ms) + " · mejor: " + r.mov + " mov. · " + r.ganados + " resueltos" : "Aún sin resolver") : "Se abre al desbloquear la etapa " + m + "×" + m + " en Niveles";
    b.setAttribute("aria-label", abierto ? "Modo libre " + m + "×" + m : m + "×" + m + " bloqueado");
    if (abierto && r && r.ganados) { const i = document.createElement("span"); i.className = "b-info"; i.textContent = "×" + r.ganados; b.appendChild(i); }
    b.addEventListener("click", () => jugarLibre(m));
    cont.appendChild(b);
  }
}

// ----- Juego -----
let modo = "nivel";                                // "nivel" (niveles fijos) o "libre" (tableros al azar sin fin)
let libreN = 3, libreNum = 0, inicial = [];        // modo libre: tamaño, número de tablero de esta sesión y tablero de partida
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
  if (!jugando) { jugando = true; inicio = Date.now(); reloj = setInterval(mostrarTiempo, 100); }
  pintar();
  if (resuelto()) ganar();
}
function mover(dx, dy) {                            // flechas: mueve la ficha que está al lado del hueco
  const h = t.indexOf(0), fh = Math.floor(h / n), ch = h % n;
  const f = fh + dy, c = ch + dx;
  if (f < 0 || f >= n || c < 0 || c >= n) return;
  tocar(f * n + c);
}

const transcurrido = () => Date.now() - inicio;     // milisegundos desde el primer movimiento
function mostrarTiempo() { $("tiempo").textContent = fmtMs(transcurrido()); }
const mejorActual = () => (modo === "libre" ? prog.libre[libreN] : prog.mejores[idx + 1]);
function pintarMejor() { const m = mejorActual(); $("mejor").textContent = m ? fmtMs(m.ms) : "–"; }

// Tablero al azar con solución garantizada (hueco al final y número par de inversiones)
function mezclarAzar(m) {
  let a;
  do {
    a = Array.from({ length: m * m - 1 }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
    let inv = 0;
    for (let i = 0; i < a.length; i++) for (let k = i + 1; k < a.length; k++) if (a[i] > a[k]) inv++;
    if (inv % 2) [a[0], a[1]] = [a[1], a[0]];
  } while (a.every((v, i) => v === i + 1));        // que no salga ya resuelto
  a.push(0);
  return a;
}

async function ganar() {
  clearInterval(reloj);
  const ms = transcurrido();
  jugando = "fin";
  $("tiempo").textContent = fmtMs(ms);
  const libre = modo === "libre";
  const m = mejorActual();
  const recordMs = !m || ms < m.ms, recordMov = !m || movs < m.mov;
  const nueva = { mov: m ? Math.min(m.mov, movs) : movs, ms: m ? Math.min(m.ms, ms) : ms };
  const primera = !libre && !hecho(idx);
  if (libre) prog.libre[libreN] = { ...nueva, ganados: ((prog.libre[libreN] && prog.libre[libreN].ganados) || 0) + 1 };
  else { prog.mejores[idx + 1] = nueva; prog.hechos[idx] = true; }
  guardarProg();
  pintarMejor();

  const l = libre ? {} : NIVELES[idx], hay = !libre && idx + 1 < NIVELES.length;
  const v = document.createElement("div");
  v.id = "victoria";
  v.innerHTML = "<h2>🎉 ¡Resuelto!</h2><div>⏱️ " + fmtMs(ms) + (recordMs ? " 🏆 ¡mejor tiempo!" : "") +
    "<br>" + movs + " movimientos" + (recordMov ? " 🏆 ¡récord!" : "") + (l.optimo ? "<br>Mínimo posible: " + l.optimo : "") + (!libre && !hay ? "<br>🏁 ¡Pasaste todos los niveles!" : "") + "</div>";
  const caja = document.createElement("div");
  caja.className = "botones";
  const boton = (texto, clase, fn) => { const b = document.createElement("button"); b.className = "b3d txt " + clase; b.textContent = texto; b.addEventListener("click", fn); caja.appendChild(b); };
  if (libre) {
    boton("Otro tablero", "b-verde", () => jugarLibre(libreN));
    boton("Tamaños", "b-morado", () => mostrar("pantalla-libre"));
  } else {
    if (hay) boton("Siguiente nivel", "b-verde", () => jugarNivel(idx + 1));
    boton("Repetir", "b-oro", empezar);
    boton("Niveles", "b-azul", () => mostrar("pantalla-niveles"));
  }
  v.appendChild(caja);
  $("tablero").appendChild(v);

  if (!primera) { if (libre) $("msg").textContent = "Modo libre: no da puntos al perfil, pero guarda tu mejor marca."; return; } // los puntos se dan solo la primera vez que se pasa un nivel
  const pts = puntosDe(NIVELES[idx].n);
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
  if (modo === "libre") {
    n = libreN; t = inicial.slice();
    $("titulo").innerHTML = "♾️ Modo libre · " + n + "×" + n + "<small>Tablero " + libreNum + " de esta sesión</small>";
  } else {
    const l = NIVELES[idx], d = info(idx);
    n = l.n; t = l.fichas.slice();
    $("titulo").innerHTML = "Nivel " + d.num + " · " + n + "×" + n + (() => { const mk = prog.mejores[idx + 1], p = []; if (l.optimo) p.push("Mínimo posible: " + l.optimo); if (mk) p.push("Tu mejor: " + mk.mov + " mov."); return p.length ? "<small>" + p.join(" · ") + "</small>" : ""; })();
  }
  movs = 0; jugando = false;
  if (!esResoluble(n, t)) console.warn("deslizante: este tablero no tiene solución");
  $("tiempo").textContent = fmtMs(0);
  $("msg").textContent = "Toca una ficha en la fila o columna del hueco para deslizarla.";
  construir(); pintar(); pintarMejor();
}
function jugarNivel(i) {
  if (!NIVELES[i] || !desbloqueado(i)) return;
  modo = "nivel"; idx = i;
  mostrar("juego");
  empezar();
}
function jugarLibre(m) {
  if (!tamanoAbierto(m)) return;
  modo = "libre"; libreN = m; libreNum++; inicial = mezclarAzar(m);
  mostrar("juego");
  empezar();
}

// ----- Botones y teclado -----
$("btn-jugar").addEventListener("click", () => jugarNivel(siguientePendiente()));
$("btn-niveles").addEventListener("click", () => mostrar("pantalla-niveles"));
$("btn-libre").addEventListener("click", () => mostrar("pantalla-libre"));
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

// Niveles pasados: se unen (pasado en cualquier sitio = pasado). Récords: por nivel (o por tamaño en el modo libre),
// el menor número de movimientos y el menor tiempo (cada uno por separado); de los tableros resueltos en modo libre gana el mayor.
const mejorMarca = (x, y) => (!x ? y : !y ? x : { mov: Math.min(x.mov, y.mov), ms: Math.min(x.ms, y.ms) });
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => {
      a = limpiar(a); b = limpiar(b);
      if (!a && !b) return null;
      const mej = { ...(b ? b.mejores : {}) };
      for (const k in (a ? a.mejores : {})) mej[k] = mejorMarca(a.mejores[k], mej[k]);
      const lib = {};
      for (const k of new Set([...Object.keys(a ? a.libre : {}), ...Object.keys(b ? b.libre : {})])) {
        const x = a && a.libre[k], y = b && b.libre[k];
        const gana = mejorMarca(x, y);
        lib[k] = { mov: gana.mov, ms: gana.ms, ganados: Math.max((x && Number(x.ganados)) || 0, (y && Number(y.ganados)) || 0) };
      }
      return { hechos: m.unirHechos(a && a.hechos, b && b.hechos) || [], mejores: mej, libre: lib };
    },
    alCambiar: (v) => {
      prog = limpiar(v) || prog;
      if (!$("inicio").hidden) pintarInicio();
      if (!$("pantalla-niveles").hidden) pintarNiveles();
      if (!$("pantalla-libre").hidden) pintarLibre();
      if (!$("juego").hidden) pintarMejor();
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});
