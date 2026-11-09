// Ruta: deslizante/juego-deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Menú de inicio (Jugar / Niveles) y niveles fijos que se desbloquean en orden (ver niveles-deslizante.js).
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { NIVELES, POR_TAMANO, TAMANO_MAX, puntosDe } from "./niveles-deslizante.js";

const ID = "deslizante";
const $ = (id) => document.getElementById(id);

// ----- Progreso (local primero; se sincroniza con la cuenta de Google si hay internet y sesión) -----
// { hechos: [true|null por nivel], mejores: { "<número de nivel>": { mov, ms } },
//   libre: { "<tamaño>": { mov, ms, ganados } },
//   estrellas: { "<número de nivel>": mejor escalón 1 a 6 (ver «Estrellas y monedas» más abajo) },
//   parciales: { "<número de nivel>": { t: [tablero], movs, ms, ts } }  partida a medias guardada desde «☰ Pausa → Guardar progreso de
//     este nivel y salir». Al terminar o reiniciar el nivel queda solo { ts } (marca de borrado, para que la nube no la devuelva) }
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
// Escalones de estrellas guardados: { "<nivel>": 1 a 6 }
function escalones(o) {
  const r = {};
  for (const k in obj(o)) { const v = Math.floor(Number(o[k])); if (v >= 1) r[k] = Math.min(6, v); }
  return r;
}
// Partidas a medias: se revisa que el tablero sea válido y tenga solución. Un registro solo con { ts } es una marca de borrado.
function parcialesLimpios(o) {
  const r = {};
  for (const k in obj(o)) {
    const x = obj(o[k]), ts = Number(x.ts) || 0, lv = NIVELES[Number(k) - 1];
    if (!lv || ts <= 0) continue;
    const m2 = lv.n * lv.n, t = x.t;
    const ok = Array.isArray(t) && t.length === m2 && new Set(t).size === m2 && t.every((v) => Number.isInteger(v) && v >= 0 && v < m2)
      && esResoluble(lv.n, t) && !t.every((v, i) => (i === m2 - 1 ? v === 0 : v === i + 1));
    r[k] = ok ? { t: t.slice(), movs: Math.max(1, Math.floor(Number(x.movs) || 0)), ms: Math.max(0, Math.floor(Number(x.ms) || 0)), ts } : { ts };
  }
  return r;
}
const limpiar = (p) => (p && typeof p === "object" && (Array.isArray(p.hechos) || p.mejores || p.libre || p.estrellas || p.parciales))
  ? { hechos: Array.isArray(p.hechos) ? p.hechos : [], mejores: marcas(p.mejores), libre: marcas(p.libre, true), estrellas: escalones(p.estrellas), parciales: parcialesLimpios(p.parciales) }
  : null; // formato viejo (récords sueltos por tamaño): se ignora

// Tiempo como m:ss.d (con horas si hace falta); ms = milisegundos
function fmtMs(ms) {
  const dec = Math.floor(ms / 100) % 10, s = Math.floor(ms / 1000);
  const sec = String(s % 60).padStart(2, "0"), min = Math.floor(s / 60) % 60, h = Math.floor(s / 3600);
  return (h ? h + ":" + String(min).padStart(2, "0") : min) + ":" + sec + "." + dec;
}
let prog = { hechos: [], mejores: {}, libre: {}, estrellas: {}, parciales: {} }, nube = null;
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
function guardarProg() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
const hecho = (i) => !!prog.hechos[i];
const desbloqueado = (i) => i === 0 || hecho(i - 1);
// Partida a medias guardada del nivel i (o null)
const parcialDe = (i) => { const x = prog.parciales[i + 1]; return x && x.t ? x : null; };
// Borra la partida guardada de un nivel (deja una marca con la hora para que al sincronizar no vuelva de la nube)
function descartarParcial(k) {
  if (!prog.parciales[k]) return;
  prog.parciales[k] = { ts: Date.now() };
  guardarProg();
}

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

// ----- Estrellas y monedas -----
// 6 escalones por nivel según el tiempo (el cronómetro cuenta desde el primer movimiento; se pide «menos de»):
//   1 a 3 = estrellas doradas   (1: pasarlo · 2: menos de 2 min · 3: menos de 1 min)
//   4 a 6 = estrellas moradas, que reemplazan a las doradas una por una (4: menos de 40 s · 5: menos de 30 s · 6: menos de 20 s)
// MONEDAS[escalón] = total de monedas que el nivel ya pagó al llegar a ese escalón. Cada nivel paga una sola vez por escalón:
// al mejorar solo se cobra la diferencia (de 15 a 25 = +10; de 25 a 40 = +15).
const MONEDAS = [0, 8, 15, 25, 40, 50, 80];
// Tiempos límite en milisegundos por tamaño: LIMITES[tamaño][escalón - 1]. Un tamaño que no esté aquí todavía no da estrellas ni monedas.
const LIMITES = { 3: [Infinity, 120000, 60000, 40000, 30000, 20000] };
const conEstrellas = (m) => !!LIMITES[m];
// Escalón (0 a 6) que corresponde a un tiempo en ese tamaño
function tierPorTiempo(m, ms) {
  const L = LIMITES[m];
  if (!L) return 0;
  for (let k = 6; k >= 1; k--) if (ms < L[k - 1]) return k;
  return 1;
}
// Mejor escalón del nivel i. Los niveles pasados antes de que existieran las estrellas lo reciben según su mejor tiempo.
function tierNivel(i) {
  const m = NIVELES[i].n;
  if (!conEstrellas(m) || !hecho(i)) return 0;
  const mk = prog.mejores[i + 1];
  return Math.max(1, Number(prog.estrellas[i + 1]) || 0, mk ? tierPorTiempo(m, mk.ms) : 0);
}
// Monedas = lo que ya pagó cada nivel (todavía no se gastan en nada)
function totalMonedas() {
  let s = 0;
  for (let i = 0; i < NIVELES.length; i++) s += MONEDAS[tierNivel(i)];
  return s;
}
const pintarMonedas = () => { $("monedas").textContent = "💰 " + totalMonedas(); };
const fmtLimite = (ms) => (ms >= 60000 ? ms / 60000 + " min" : ms / 1000 + " s");
function metaTexto(m, tier) {
  if (tier >= 6) return "¡Tienes todas las estrellas!";
  const sig = tier + 1;
  if (sig === 1) return "Pasa el nivel para ganar la primera estrella";
  return "Próxima estrella" + (sig >= 4 ? " morada" : "") + ": menos de " + fmtLimite(LIMITES[m][sig - 1]);
}
const textoEstrellas = (t) => (t <= 3 ? t + " de 3 estrellas" : (t - 3) + " de 3 estrellas moradas");
// 3 estrellas según el escalón: las moradas van reemplazando a las doradas de izquierda a derecha
function htmlEstrellas(tier, pop) {
  const mor = Math.max(0, tier - 3), oro = Math.min(tier, 3);
  let h = "";
  for (let k = 0; k < 3; k++) {
    const c = k < mor ? "mor" : k < oro ? "oro" : "vacia";
    h += '<span class="est ' + c + (pop && c !== "vacia" ? " pop" : "") + '" style="--i:' + k + '"></span>';
  }
  return '<span class="fila-est" aria-hidden="true">' + h + "</span>";
}
// Estela de brillantina: cada estrella morada de la pantalla de victoria suelta chispas que se van apagando
function brillantina(caja) {
  clearInterval(chispas);
  const moradas = caja.querySelectorAll(".est.mor");
  if (!moradas.length || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colores = ["#ffffff", "#ffd1f5", "#c9f3ff", "#fff2a8", "#d9c2ff", "#b8ffd9"];
  const soltar = () => {
    if (!caja.isConnected || caja.offsetParent === null) { clearInterval(chispas); return; }
    const c = caja.getBoundingClientRect();
    moradas.forEach((s) => {
      const r = s.getBoundingClientRect();
      for (let k = 0; k < 2; k++) {
        const p = document.createElement("i");
        p.className = "chispa";
        p.style.left = (r.left - c.left + Math.random() * r.width) + "px";
        p.style.top = (r.top - c.top + Math.random() * r.height) + "px";
        p.style.setProperty("--dx", (-18 - Math.random() * 32) + "px");
        p.style.setProperty("--dy", (8 + Math.random() * 30) + "px");
        p.style.setProperty("--tam", (2 + Math.random() * 3) + "px");
        p.style.background = colores[Math.floor(Math.random() * colores.length)];
        p.addEventListener("animationend", () => p.remove());
        caja.appendChild(p);
      }
    });
  };
  soltar();
  chispas = setInterval(soltar, 220);
}

// ----- Pantallas -----
function mostrar(nombre) {
  for (const p of ["inicio", "pantalla-niveles", "pantalla-libre", "juego"]) $(p).hidden = p !== nombre;
  $("btn-menu").hidden = nombre === "inicio"; // el ☰ solo fuera del menú principal
  // Dentro de una partida abre el menú de pausa; en las demás pantallas vuelve directo al menú principal
  $("btn-menu").innerHTML = '<span class="b-ico">☰</span>'; // cuadrado, solo icono: el texto va en title y aria-label
  const textoMenu = nombre === "juego" ? "Pausa: continuar, guardar progreso y salir, o salir" : "Volver al menú principal";
  $("btn-menu").title = textoMenu; $("btn-menu").setAttribute("aria-label", textoMenu);
  if (nombre !== "juego") { clearInterval(reloj); clearInterval(chispas); }
  pintarNavNivel();
  pintarMonedas();
  if (nombre === "inicio") pintarInicio();
  if (nombre === "pantalla-niveles") pintarNiveles();
  if (nombre === "pantalla-libre") pintarLibre();
}
// Botones «◀ anterior» y «▶ siguiente» (arriba a la derecha): solo en un nivel fijo, y cada uno solo si ese nivel existe y está abierto
function pintarNavNivel() {
  const enNivel = !$("juego").hidden && modo === "nivel";
  const hayAnt = enNivel && idx > 0 && desbloqueado(idx - 1);
  const haySig = enNivel && idx + 1 < NIVELES.length && desbloqueado(idx + 1);
  $("btn-anterior").hidden = !hayAnt;
  $("btn-siguiente").hidden = !haySig;
  $("nav-nivel").hidden = !(hayAnt || haySig);
}
function pintarInicio() {
  const pasados = prog.hechos.filter(Boolean).length;
  $("resumen").textContent = pasados + " de " + NIVELES.length + " niveles pasados";
  const i = siguientePendiente(), d = info(i);
  $("btn-jugar").innerHTML = '<span class="b-ico">▶</span><span class="b-rot">' + (pasados ? "Continuar" : "Jugar") + "</span>";
  $("btn-jugar").title = "Nivel " + d.num + " de " + d.n + "×" + d.n + (parcialDe(i) ? " · partida guardada" : "");
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
        b.append(a);
        if (conEstrellas(n)) { const t = document.createElement("span"); t.innerHTML = htmlEstrellas(tierNivel(i)); b.append(t.firstElementChild); }
        b.append(c);
        if (parcialDe(i)) { const g = document.createElement("span"); g.className = "b-info"; g.textContent = "💾"; b.append(g); }
      } else b.textContent = "🔒";
      b.disabled = !libre;
      b.setAttribute("aria-label", "Nivel " + (k + 1) + " de " + n + "×" + n + (libre ? (mk ? ", mejor tiempo " + fmtMs(mk.ms) : "") + (conEstrellas(n) ? ", " + textoEstrellas(tierNivel(i)) : "") + (parcialDe(i) ? ", partida guardada" : "") : " (bloqueado)"));
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
let previo = 0, pausadoMs = 0, enPausa = false;     // ms ya jugados antes de empezar/retomar · ms al abrir la pausa · ¿pausa abierta?
let chispas = null;                                // intervalo de la brillantina de la victoria
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
  if (pos < 0 || jugando === "fin" || enPausa) return;
  const h = t.indexOf(0);
  const fp = Math.floor(pos / n), cp = pos % n, fh = Math.floor(h / n), ch = h % n;
  if (fp !== fh && cp !== ch) return;               // solo misma fila o columna que el hueco
  if (pos === h) return;
  const paso = fp === fh ? (cp < ch ? 1 : -1) : (fp < fh ? n : -n);
  for (let i = h; i !== pos; i -= paso) t[i] = t[i - paso]; // desliza toda la fila/columna
  t[pos] = 0;
  movs++;
  if (!jugando) { jugando = true; inicio = Date.now() - previo; reloj = setInterval(mostrarTiempo, 100); }
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
// Fila de estrellas bajo el título del nivel: las que llevas y qué falta para la siguiente (solo en niveles con estrellas)
function pintarMetaJuego() {
  const caja = $("meta-estrellas");
  const ver = modo === "nivel" && conEstrellas(n);
  caja.hidden = !ver;
  if (!ver) return;
  const t = tierNivel(idx);
  caja.innerHTML = htmlEstrellas(t) + "<span>" + metaTexto(n, t) + "</span>";
}
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
  // Estrellas y monedas (antes de actualizar los récords): el nivel solo cobra la diferencia entre su mejor escalón anterior y el nuevo
  const cE = !libre && conEstrellas(n);
  const antes = cE ? tierNivel(idx) : 0;
  const nuevoTier = Math.max(antes, cE ? tierPorTiempo(n, ms) : 0);
  const ganadas = MONEDAS[nuevoTier] - MONEDAS[antes];
  if (libre) prog.libre[libreN] = { ...nueva, ganados: ((prog.libre[libreN] && prog.libre[libreN].ganados) || 0) + 1 };
  else {
    prog.mejores[idx + 1] = nueva; prog.hechos[idx] = true; if (cE) prog.estrellas[idx + 1] = nuevoTier;
    if (prog.parciales[idx + 1]) prog.parciales[idx + 1] = { ts: Date.now() };   // el nivel ya se resolvió: su partida guardada deja de existir
  }
  guardarProg();
  pintarMejor();
  pintarMonedas();
  pintarMetaJuego();
  pintarNavNivel();                                 // si este nivel abrió el siguiente, aparece ▶

  const l = libre ? {} : NIVELES[idx], hay = !libre && idx + 1 < NIVELES.length;
  const v = document.createElement("div");
  v.id = "victoria";
  v.innerHTML = "<h2>🎉 ¡Resuelto!</h2>" + (cE ? '<div class="estrellas-vic">' + htmlEstrellas(nuevoTier, true) + "</div>" : "") +
    "<div>⏱️ " + fmtMs(ms) + (recordMs ? " 🏆 ¡mejor tiempo!" : "") +
    "<br>" + movs + " movimientos" + (recordMov ? " 🏆 ¡récord!" : "") + (l.optimo ? "<br>Mínimo posible: " + l.optimo : "") + (!libre && !hay ? "<br>🏁 ¡Pasaste todos los niveles!" : "") + "</div>" +
    (cE ? '<div class="monedas-vic">' + (ganadas > 0 ? "💰 +" + ganadas + " monedas" : "💰 Sin monedas nuevas en este intento") + "</div>" +
      (nuevoTier < 6 ? '<div class="meta-vic">' + metaTexto(n, nuevoTier) + "</div>" : "") : "");
  const caja = document.createElement("div");
  caja.className = "botones";
  const boton = (texto, clase, fn) => { const b = document.createElement("button"); b.className = "b3d txt " + clase; b.textContent = texto; b.addEventListener("click", fn); caja.appendChild(b); };
  if (libre) {
    boton("Otro tablero", "b-verde", () => jugarLibre(libreN));
    boton("Tamaños", "b-morado", () => mostrar("pantalla-libre"));
  } else {
    if (hay) boton("Siguiente nivel", "b-verde", () => jugarNivel(idx + 1));
    boton("Repetir", "b-oro", () => empezar());
    boton("Niveles", "b-azul", () => mostrar("pantalla-niveles"));
  }
  v.appendChild(caja);
  $("tablero").appendChild(v);
  if (cE) brillantina(v);

  if (!primera) { if (libre) $("msg").textContent = "Modo libre: no da puntos al perfil, pero guarda tu mejor marca."; return; } // los puntos se dan solo la primera vez que se pasa un nivel
  const pts = puntosDe(NIVELES[idx].n);
  encolarPuntos(ID, pts);                           // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  $("msg").textContent = pendientes === 0
    ? "+" + pts + " puntos a tu perfil"
    : "+" + pts + " puntos anotados: se enviarán a tu perfil cuando tengas internet y hayas entrado con Google.";
}

function empezar(retomar) {
  clearInterval(reloj); clearInterval(chispas);
  const v = $("victoria"); if (v) v.remove();
  let pp = null;                                    // partida guardada que se retoma (solo en niveles)
  if (modo === "libre") {
    n = libreN; t = inicial.slice();
    $("titulo").innerHTML = "♾️ Modo libre · " + n + "×" + n + "<small>Tablero " + libreNum + " de esta sesión</small>";
  } else {
    const l = NIVELES[idx], d = info(idx);
    n = l.n; t = l.fichas.slice();
    pp = retomar === true ? parcialDe(idx) : null;
    if (pp) t = pp.t.slice();
    $("titulo").innerHTML = "Nivel " + d.num + " · " + n + "×" + n + (() => { const mk = prog.mejores[idx + 1], p = []; if (l.optimo) p.push("Mínimo posible: " + l.optimo); if (mk) p.push("Tu mejor: " + mk.mov + " mov."); return p.length ? "<small>" + p.join(" · ") + "</small>" : ""; })();
  }
  movs = pp ? pp.movs : 0; previo = pp ? pp.ms : 0; jugando = false;
  if (!esResoluble(n, t)) console.warn("deslizante: este tablero no tiene solución");
  $("tiempo").textContent = fmtMs(previo);
  $("msg").textContent = pp ? "💾 Retomaste tu partida guardada. El tiempo sigue desde donde lo dejaste; usa 🔄 para empezar de cero." : "Toca una ficha en la fila o columna del hueco para deslizarla.";
  construir(); pintar(); pintarMejor();
  pintarNavNivel();
  pintarMetaJuego();
}
function jugarNivel(i) {
  if (!NIVELES[i] || !desbloqueado(i)) return;
  modo = "nivel"; idx = i;
  mostrar("juego");
  empezar(true);                                    // si el nivel tiene partida guardada, la retoma
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
// ☰: dentro de una partida abre la pausa (compartido/menu-pausa.js); en las demás pantallas vuelve al menú principal
const hayAvance = () => jugando !== "fin" && movs > 0;   // ya hay algo que guardar (o que perder)
function guardarYSalir() {
  enPausa = false;
  if (modo === "nivel" && hayAvance()) {
    prog.parciales[idx + 1] = { t: t.slice(), movs, ms: Math.round(pausadoMs), ts: Date.now() };
    guardarProg();
    mostrar("inicio");
    $("resumen").textContent = "💾 Progreso del nivel guardado. " + $("resumen").textContent;
  } else mostrar("inicio");
}
const pausa = crearMenuPausa({
  titulo: "Pausa",
  puedeAbrir: () => !$("juego").hidden,
  alAbrir() {                                       // congela el cronómetro
    pausadoMs = jugando === true ? transcurrido() : previo;
    if (jugando === true) clearInterval(reloj);
    enPausa = true;
  },
  alContinuar() {                                   // lo reanuda justo donde iba
    enPausa = false;
    if (jugando === true) { inicio = Date.now() - pausadoMs; reloj = setInterval(mostrarTiempo, 100); }
  },
  extras: () => modo !== "nivel" ? [] : [{
    icono: "💾", texto: "Guardar progreso de este nivel y salir", clase: "b-oro",
    deshabilitado: !hayAvance(),
    ayuda: hayAvance() ? "Podrás retomar este tablero con «Continuar» o desde «Niveles»." : "Haz al menos un movimiento para poder guardar.",
    alElegir: guardarYSalir,
  }],
  ayudaSalir: () => (hayAvance() ? "No se guarda lo que avanzaste en esta partida." : ""),
  alSalir() { enPausa = false; mostrar("inicio"); },
});
$("btn-menu").addEventListener("click", () => ($("juego").hidden ? mostrar("inicio") : pausa.abrir()));
$("btn-anterior").addEventListener("click", () => jugarNivel(idx - 1));
$("btn-siguiente").addEventListener("click", () => jugarNivel(idx + 1));
$("reiniciar").addEventListener("click", () => { if (modo === "nivel") descartarParcial(idx + 1); empezar(); });   // reiniciar también borra la partida guardada de ese nivel
addEventListener("keydown", (e) => {
  if ($("juego").hidden || enPausa) return;
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
      const est = { ...(b ? b.estrellas : {}) };                       // estrellas: gana el mayor escalón de cada nivel
      for (const k in (a ? a.estrellas : {})) est[k] = Math.max(a.estrellas[k], est[k] || 0);
      const par = { ...(b ? b.parciales : {}) };                       // partidas guardadas: gana la más reciente (la marca de borrado también cuenta)
      for (const k in (a ? a.parciales : {})) if (!par[k] || (Number(a.parciales[k].ts) || 0) > (Number(par[k].ts) || 0)) par[k] = a.parciales[k];
      return { hechos: m.unirHechos(a && a.hechos, b && b.hechos) || [], mejores: mej, libre: lib, estrellas: est, parciales: par };
    },
    alCambiar: (v) => {
      prog = limpiar(v) || prog;
      if (!$("inicio").hidden) pintarInicio();
      if (!$("pantalla-niveles").hidden) pintarNiveles();
      if (!$("pantalla-libre").hidden) pintarLibre();
      pintarMonedas();
      if (!$("juego").hidden) { pintarMejor(); pintarNavNivel(); pintarMetaJuego(); }
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});
