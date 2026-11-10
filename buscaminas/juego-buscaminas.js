// Ruta: buscaminas/juego-buscaminas.js
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { configMapa, configLibre, TAMANOS, POR_ETAPA } from "./niveles-buscaminas.js";

// ===== AJUSTES =====
const ID = "buscaminas";
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA }); // 32 estados × 100 niveles = 3200 y, al terminarlos, el mundo (194 países × 100)
const TOTAL = ETAPAS.total;

// Dificultades del MODO INFINITO (la densidad de minas está en niveles-buscaminas.js)
const DIFS = {
  facil:   { nombre: "Fácil",   clase: "b-verde", icono: "🟢" },
  medio:   { nombre: "Medio",   clase: "b-oro",   icono: "🟡" },
  dificil: { nombre: "Difícil", clase: "b-rojo",  icono: "🔴" },
};
// Color del botón de cada tablero del modo infinito (de menor a mayor «poder»)
const COLOR_TAM = ["b-verde", "b-verde", "b-azul", "b-azul", "b-morado", "b-morado", "b-oro", "b-oro", "b-rojo", "b-rojo"];

const TAM_MAX = 56;        // tamaño máximo de casilla (px)
const TAM_MIN = 14;        // tamaño mínimo de casilla (px)
const PAUSA_LARGA = 400;   // ms para poner bandera con pulsación larga
// ===================

const $ = (id) => document.getElementById(id);
const tab = $("tablero"), msg = $("msg"), zona = $("juego"), cara = $("cara-ico");
const hud = $("hud"), controles = $("controles"), btnMenu = $("btn-menu"), btnMenuTxt = $("btn-menu-txt");
const btnSig = $("siguiente"), sigIco = $("sig-ico");
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));

// localStorage puede fallar (modo privado, cookies bloqueadas): nunca debe romper el juego
const leerLS = (k) => { try { return localStorage.getItem(ID + ":" + k); } catch (e) { return null; } };
const escribirLS = (k, v) => { try { localStorage.setItem(ID + ":" + k, v); } catch (e) {} };

// ----- Datos guardados (todo en UN objeto plano, así se sincroniza con la cuenta como un solo documento) -----
//   "n123"        mejor tiempo (s) del nivel 123 del mapa
//   "mapa-hecho"  nivel más alto TERMINADO del mapa        "mapa-max"  nivel más alto DESBLOQUEADO
//   "3-medio"     mejor tiempo del modo infinito (tablero 3, dificultad Medio)
let crudoCache = null, datosCache = {};
function datos() {
  const crudo = leerLS("mejores");
  if (crudo !== crudoCache) { crudoCache = crudo; try { datosCache = JSON.parse(crudo) || {}; } catch (e) { datosCache = {}; } }
  return datosCache;
}
function guardarDatos(d) {
  escribirLS("mejores", JSON.stringify(d));
  if (nube) nube.guardado();
}
const clave = (n, d) => n + "-" + d;
function progresoMapa() {
  const d = datos();
  const hecho = acotar(Math.floor(Number(d["mapa-hecho"])) || 0, 0, TOTAL);
  const max = acotar(Math.max(Math.floor(Number(d["mapa-max"])) || 1, hecho + 1), 1, TOTAL);
  return { max, hecho };
}

// Elección del modo infinito. Versiones anteriores guardaban en «nivel» la dificultad ("facil"…) o el tamaño.
const viejo = leerLS("nivel");
let dif = leerLS("dif");
if (!DIFS[dif]) dif = DIFS[viejo] ? viejo : "facil";
let tam = Math.floor(Number(leerLS("tam") ?? viejo));
if (!(tam >= 1 && tam <= TAMANOS.length)) tam = 1;
const guardarEleccion = () => { escribirLS("tam", tam); escribirLS("dif", dif); };

let pantalla = "menu";     // "menu" | "libre" | "mapa" | "juego"
let modo = "mapa";         // lo que se está jugando: "mapa" (niveles) o "libre" (modo infinito)
let nivelMapa = 1;         // nivel del mapa en juego
let N, celdas, botones, estado = "fuera", abiertas, banderas, t0, reloj, pausadoEn = 0, modoBandera = false, nube = null, mapa = null;

// ===== Pantallas =====
function irA(p, n, alcanzado) {
  pantalla = p;
  clearInterval(reloj); pausadoEn = 0;
  tab.style.visibility = "";
  $("p-menu").hidden = p !== "menu";
  $("p-libre").hidden = p !== "libre";
  zona.hidden = hud.hidden = controles.hidden = p !== "juego";
  if (p === "mapa") mapa.abrir(n, alcanzado);
  else if (mapa && mapa.abierto()) mapa.cerrar();
  btnMenu.hidden = p === "menu";                       // en el menú principal no se muestra el ☰
  btnMenuTxt.textContent = p === "juego" ? "Pausa" : "Menú principal";
  btnMenu.title = btnMenuTxt.textContent;
  if (p !== "juego") estado = "fuera";
  if (p === "menu") pintarMenu();
  if (p === "libre") { pintarDificultad(); pintarLibre(); }
}
function jugarMapa(n) {
  nivelMapa = acotar(Math.floor(Number(n)) || 1, 1, progresoMapa().max);
  modo = "mapa";
  irA("juego");
  nueva();
}
function jugarLibre(n) {
  tam = n; guardarEleccion();
  modo = "libre";
  irA("juego");
  nueva();
}

function pintarMenu() {
  const p = progresoMapa(), c = configMapa(p.max), e = ETAPAS.etapaDe(p.max);
  $("menu-sub").textContent = `${ETAPAS.nombreEtapa(p.max)} · nivel ${e.k} · ${c.cols}×${c.filas} · ${c.minas} minas`;
  $("jugar-txt").textContent = (p.hecho > 0 ? "Continuar" : "Jugar") + " · nivel " + p.max;
}

// ----- Modo infinito: selector de dificultad y de tamaño -----
function pintarDificultad() {
  const caja = $("dif-libre");
  caja.replaceChildren();
  for (const k in DIFS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt chico " + DIFS[k].clase + (k === dif ? " on" : "");
    b.setAttribute("aria-pressed", String(k === dif));
    const i = document.createElement("span"); i.className = "b-ico"; i.textContent = DIFS[k].icono;
    b.append(i, " " + DIFS[k].nombre);
    b.addEventListener("click", () => { dif = k; guardarEleccion(); pintarDificultad(); pintarLibre(); });
    caja.appendChild(b);
  }
}
function pintarLibre() {
  const rej = $("rej-niv"), d = datos();
  rej.replaceChildren();
  for (let n = 1; n <= TAMANOS.length; n++) {
    const t = TAMANOS[n - 1], r = d[clave(n, dif)], c = configLibre(n, dif);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt tile " + COLOR_TAM[n - 1] + (n === tam ? " on" : "");
    const num = document.createElement("span"); num.className = "num"; num.textContent = n;
    const sz = document.createElement("small"); sz.textContent = `${t.cols}×${t.filas}`;
    b.append(num, sz);
    if (r) { const info = document.createElement("span"); info.className = "b-info"; info.textContent = "⭐ " + r + " s"; b.appendChild(info); }
    b.setAttribute("aria-label", `Tablero ${n}, ${t.cols} por ${t.filas}, ${c.minas} minas` + (r ? `, mejor tiempo ${r} segundos` : ""));
    b.addEventListener("click", () => jugarLibre(n));
    rej.appendChild(b);
  }
}

// ----- Mapa de niveles estándar (compartido/mapa-niveles.js) -----
function infoNivel(n) {
  const c = configMapa(n), k = ETAPAS.etapaDe(n).k, t = datos()["n" + n];
  const clase = k <= 20 ? "b-verde" : k <= 45 ? "b-azul" : k <= 70 ? "b-morado" : k <= 95 ? "b-oro" : "b-rojo"; // más alto = más difícil
  return { sub: `${c.cols}×${c.filas}`, clase, aria: `${c.cols} por ${c.filas}, ${c.minas} minas` + (t ? `, mejor tiempo ${t} segundos` : "") };
}

// Ventana «Cómo se juega» (usa los estilos de la ventana de pausa)
function mostrarInfo() {
  const f = document.createElement("div");
  f.className = "pausa-fondo";
  f.setAttribute("role", "dialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-label", "Cómo se juega");
  const p = document.createElement("div");
  p.className = "pausa-panel";
  const t = document.createElement("h2"); t.textContent = "ℹ️ Cómo se juega";
  p.appendChild(t);
  for (const x of [
    "Toca una casilla para abrirla. Cada número dice cuántas minas hay en las 8 casillas de alrededor.",
    "Mantén pulsado (o clic derecho) para poner una bandera 🚩 donde creas que hay una mina. También sirve el botón 🚩.",
    "Si tocas un número que ya tiene todas sus banderas, se abren las casillas que le faltan.",
    "Ganas al abrir todas las casillas sin mina. Los niveles se abren en orden: cada estado tiene 100 y, al terminarlo, sube el agua del mapa.",
    "Los puntos se dan la primera vez que pasas cada nivel. El modo infinito no da puntos.",
  ]) {
    const q = document.createElement("p");
    q.textContent = x;
    q.style.cssText = "margin:8px 0;font-size:.9rem;line-height:1.35;text-align:left";
    p.appendChild(q);
  }
  const lista = document.createElement("div"); lista.className = "pausa-opciones"; lista.style.marginTop = "12px";
  const ok = document.createElement("button"); ok.type = "button"; ok.className = "b3d txt b-verde";
  const oi = document.createElement("span"); oi.className = "b-ico"; oi.textContent = "👍";
  const ot = document.createElement("span"); ot.textContent = "Entendido";
  ok.append(oi, ot);
  lista.appendChild(ok); p.appendChild(lista); f.appendChild(p);
  document.body.appendChild(f);
  const esc = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } };
  function cerrar() { removeEventListener("keydown", esc, true); f.remove(); }
  addEventListener("keydown", esc, true); // en captura: así Esc solo cierra la ventana y no también el mapa
  f.addEventListener("click", (e) => { if (e.target === f) cerrar(); });
  ok.addEventListener("click", cerrar);
  ok.focus();
}

// Esc: en el modo infinito y en la vista principal del mapa vuelve al menú (en las otras vistas del mapa lo maneja el propio mapa).
// Se registra ANTES de montar el mapa para correr primero y no repetirse con el del mapa.
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (pantalla === "libre" || (pantalla === "mapa" && mapa && mapa.esPrincipal())) { e.preventDefault(); irA("menu"); }
});

mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  progreso: progresoMapa,
  jugarNivel: jugarMapa,
  infoNivel,
  leyenda: "Cada nivel es un tablero nuevo. Los de más arriba son más grandes y tienen más minas.",
  botonesExtra: [{ icono: "♾️", texto: "Modo infinito", clase: "b-morado", fn: () => irA("libre") }],
  alInfo: mostrarInfo,
  avisoPrincipal: () => {
    const r = ETAPAS.resumen(progresoMapa());
    return `${r.estadosHechos} de ${ETAPAS.numEstados} estados completados`;
  },
});

// ===== Tablero =====
function vecinos(i) {
  const f = Math.floor(i / N.cols), c = i % N.cols, r = [];
  for (let df = -1; df <= 1; df++) for (let dc = -1; dc <= 1; dc++) {
    if (!df && !dc) continue;
    const ff = f + df, cc = c + dc;
    if (ff >= 0 && ff < N.filas && cc >= 0 && cc < N.cols) r.push(ff * N.cols + cc);
  }
  return r;
}

function mensajeInicial() {
  const m = datos()[N.clave];
  msg.innerHTML = m
    ? `${N.titulo} · mejor tiempo: <b>${m} s</b>`
    : `${N.titulo}: toca una casilla para empezar. Mantén pulsado para poner bandera.`;
}

function nueva() {
  if (modo === "mapa") {
    const c = configMapa(nivelMapa), e = ETAPAS.etapaDe(nivelMapa);
    N = { ...c, clave: "n" + nivelMapa, nivel: nivelMapa, titulo: `${ETAPAS.nombreEtapa(nivelMapa)} · nivel ${e.k}` };
  } else {
    N = { ...configLibre(tam, dif), puntos: 0, clave: clave(tam, dif), nivel: tam, titulo: `Infinito · tablero ${tam} · ${DIFS[dif].nombre}` };
  }
  clearInterval(reloj);
  pausadoEn = 0;
  tab.style.visibility = "";
  estado = "listo"; abiertas = 0; banderas = 0; t0 = 0;
  celdas = Array.from({ length: N.cols * N.filas }, () => ({ mina: false, abierta: false, bandera: false, n: 0 }));
  tab.innerHTML = "";
  botones = celdas.map((_, i) => {
    const b = document.createElement("button");
    b.className = "c"; b.dataset.i = i; b.setAttribute("role", "gridcell");
    b.setAttribute("aria-label", "Casilla cerrada");
    tab.appendChild(b);
    return b;
  });
  transpuesto = null; // fuerza a colocar las casillas de nuevo
  ajustarTam();
  cara.textContent = "🙂";
  btnSig.hidden = true;
  $("tiempo").textContent = "⏱ 0";
  actualizarMinas();
  mensajeInicial();
}

// En pantalla horizontal el tablero se dibuja GIRADO (columnas y filas intercambiadas) para que quepa mejor.
// La lógica no cambia: solo se reubican las casillas en la cuadrícula.
const horizontal = matchMedia("(min-aspect-ratio: 23/20)"); // mismo punto de corte que el CSS
let transpuesto = null;
function acomodar() {
  const tr = horizontal.matches;
  if (tr === transpuesto) return;
  transpuesto = tr;
  tab.style.gridTemplateColumns = `repeat(${tr ? N.filas : N.cols}, var(--t))`;
  botones.forEach((b, i) => {
    const f = Math.floor(i / N.cols), c = i % N.cols;
    b.style.gridColumn = (tr ? f : c) + 1;
    b.style.gridRow = (tr ? c : f) + 1;
  });
}

// El tamaño de casilla se calcula con el espacio REAL de la zona de juego (ya descontadas las esquinas reservadas del CSS)
function ajustarTam() {
  if (!N || zona.hidden) return;
  acomodar();
  const vc = transpuesto ? N.filas : N.cols, vf = transpuesto ? N.cols : N.filas;
  const cs = getComputedStyle(zona);
  let ancho = zona.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  let alto = zona.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  // En vertical el mensaje va debajo del tablero; en horizontal va fijo en el margen izquierdo y no resta alto
  if (getComputedStyle(msg).position !== "fixed") alto -= msg.offsetHeight + (parseFloat(cs.rowGap) || 8);
  ancho -= 12 + (vc - 1) * 2;
  alto -= 12 + (vf - 1) * 2;
  const t = Math.max(TAM_MIN, Math.floor(Math.min(ancho / vc, alto / vf, TAM_MAX)));
  tab.style.setProperty("--t", t + "px");
}
new ResizeObserver(ajustarTam).observe(zona); // cubre girar el celular, pantalla completa y cambios de ventana

function actualizarMinas() { $("minas").textContent = "💣 " + (N.minas - banderas); }

function arrancarReloj() {
  clearInterval(reloj);
  reloj = setInterval(() => ($("tiempo").textContent = "⏱ " + Math.floor((Date.now() - t0) / 1000)), 250);
}

function colocarMinas(seguro) {
  const prohibidas = new Set([seguro, ...vecinos(seguro)]);
  const libres = [];
  celdas.forEach((_, i) => { if (!prohibidas.has(i)) libres.push(i); });
  for (let k = libres.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [libres[k], libres[j]] = [libres[j], libres[k]]; }
  libres.slice(0, N.minas).forEach((i) => (celdas[i].mina = true));
  celdas.forEach((c, i) => { c.n = vecinos(i).filter((v) => celdas[v].mina).length; });
}

function pintar(i) {
  const c = celdas[i], b = botones[i];
  b.className = "c";
  b.textContent = "";
  b.removeAttribute("data-n");
  if (c.abierta) {
    b.classList.add("ab");
    b.dataset.n = c.n;
    b.textContent = c.mina ? "💣" : c.n || "";
    b.setAttribute("aria-label", c.n ? c.n + " minas cerca" : "Vacía");
  } else if (c.bandera) {
    b.textContent = "🚩";
    b.setAttribute("aria-label", "Bandera");
  } else b.setAttribute("aria-label", "Casilla cerrada");
}

function abrir(inicio) {
  const pila = [inicio];
  while (pila.length) {
    const i = pila.pop(), c = celdas[i];
    if (c.abierta || c.bandera) continue;
    c.abierta = true; abiertas++; pintar(i);
    if (c.n === 0 && !c.mina) vecinos(i).forEach((v) => { if (!celdas[v].abierta) pila.push(v); });
  }
}

function tocar(i) {
  if (estado === "perdio" || estado === "gano" || estado === "fuera") return;
  const c = celdas[i];
  if (modoBandera) return bandera(i);
  if (c.abierta) return acorde(i);
  if (c.bandera) return;
  if (estado === "listo") {
    colocarMinas(i);
    estado = "jugando"; t0 = Date.now();
    arrancarReloj();
    msg.textContent = `${N.titulo} · ${N.cols}×${N.filas} · ${N.minas} minas`;
  }
  if (c.mina) return perder(i);
  abrir(i);
  revisarVictoria();
}

// Tocar un número que ya tiene todas sus banderas abre las casillas que le faltan
function acorde(i) {
  const c = celdas[i];
  if (!c.n) return;
  const v = vecinos(i);
  if (v.filter((x) => celdas[x].bandera).length !== c.n) return;
  for (const x of v) {
    if (celdas[x].bandera || celdas[x].abierta) continue;
    if (celdas[x].mina) return perder(x);
    abrir(x);
  }
  revisarVictoria();
}

function bandera(i) {
  if (estado === "perdio" || estado === "gano" || estado === "fuera") return;
  const c = celdas[i];
  if (c.abierta) return;
  if (!c.bandera && banderas >= N.minas) return;
  c.bandera = !c.bandera;
  banderas += c.bandera ? 1 : -1;
  pintar(i); actualizarMinas();
  if (navigator.vibrate) navigator.vibrate(15);
}

function perder(causa) {
  estado = "perdio"; clearInterval(reloj);
  celdas.forEach((c, i) => {
    const b = botones[i];
    if (c.mina && !c.bandera) { b.className = "c mina"; b.textContent = "💣"; }
    else if (!c.mina && c.bandera) { b.className = "c mal"; b.textContent = "❌"; }
  });
  botones[causa].className = "c boom"; botones[causa].textContent = "💥";
  cara.textContent = "😵";
  msg.textContent = "¡Boom! Toca la carita para intentarlo de nuevo.";
}

function revisarVictoria() {
  if (abiertas !== celdas.length - N.minas) return;
  estado = "gano"; clearInterval(reloj);
  const seg = Math.max(1, Math.round((Date.now() - t0) / 1000));
  celdas.forEach((c, i) => { if (c.mina && !c.bandera) { c.bandera = true; pintar(i); } });
  banderas = N.minas; actualizarMinas();
  $("tiempo").textContent = "⏱ " + seg;
  cara.textContent = "😎";

  const d = datos();
  let rec = "", pts = 0, extra = "";
  if (!d[N.clave] || seg < d[N.clave]) { d[N.clave] = seg; rec = " ¡Nuevo récord!"; }
  // Mapa: la PRIMERA vez que se pasa un nivel se desbloquea el siguiente y se dan los puntos (repetirlo no da puntos)
  if (modo === "mapa" && N.nivel > (Number(d["mapa-hecho"]) || 0)) {
    d["mapa-hecho"] = N.nivel;
    d["mapa-max"] = Math.max(Number(d["mapa-max"]) || 1, Math.min(TOTAL, N.nivel + 1));
    pts = N.puntos;
    if (N.nivel % POR_ETAPA === 0) extra = " 🎉 ¡Etapa completada!";
  }
  guardarDatos(d);
  msg.innerHTML = `¡Ganaste en <b>${seg} s</b>!${pts ? ` +${pts} pts.` : ""}${rec}${extra}`;

  // ➡️ siguiente nivel; al terminar un estado (o país) el botón lleva al mapa para ver SUBIR el agua
  if (modo === "mapa") {
    const fin = N.nivel % POR_ETAPA === 0;
    sigIco.textContent = fin ? "🗺️" : "➡️";
    btnSig.title = fin ? "Ver el mapa" : "Siguiente nivel";
    btnSig.setAttribute("aria-label", btnSig.title);
    btnSig.hidden = N.nivel >= TOTAL;
  } else {
    sigIco.textContent = "➡️";
    btnSig.title = "Siguiente tablero";
    btnSig.setAttribute("aria-label", btnSig.title);
    btnSig.hidden = tam >= TAMANOS.length;
  }
  if (pts > 0) {
    encolarPuntos(ID, pts); // se anotan en el dispositivo y se envían al perfil cuando haya internet y sesión
    import("../compartido/progreso.js").then((p) => p.vaciarPuntos()).catch(() => {});
  }
}

// ===== Entrada: toque = abrir, pulsación larga o clic derecho = bandera =====
let pulso = null, fueLarga = false;
const cancelar = () => clearTimeout(pulso);
tab.addEventListener("pointerdown", (e) => {
  fueLarga = false; // se reinicia SIEMPRE (si no, un clic derecho podía quedar bloqueado tras una pulsación larga con el mouse)
  const b = e.target.closest(".c");
  if (!b || e.button === 2) return;
  clearTimeout(pulso);
  pulso = setTimeout(() => { fueLarga = true; bandera(+b.dataset.i); }, PAUSA_LARGA);
});
tab.addEventListener("pointerleave", cancelar);
tab.addEventListener("pointercancel", cancelar);
tab.addEventListener("pointerup", (e) => {
  cancelar();
  const b = e.target.closest(".c");
  if (!b || fueLarga || e.button === 2) return;
  tocar(+b.dataset.i);
});
tab.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // sin menú del navegador, ni con clic derecho ni con la pulsación larga del celular
  const b = e.target.closest(".c");
  // Clic derecho con mouse = bandera. La pulsación larga táctil ya la puso el temporizador (no se repite)
  if (b && !fueLarga && (e.pointerType === "mouse" || e.button === 2)) bandera(+b.dataset.i);
});
// Teclado: Enter/Espacio abre, "f" pone bandera
tab.addEventListener("keydown", (e) => {
  const b = e.target.closest(".c");
  if (!b) return;
  if (e.key === "f" || e.key === "F") { e.preventDefault(); bandera(+b.dataset.i); }
  else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocar(+b.dataset.i); }
});

$("cara").addEventListener("click", nueva);
$("modo").addEventListener("click", () => {
  modoBandera = !modoBandera;
  $("modo").setAttribute("aria-pressed", modoBandera);
  $("modo").classList.toggle("on", modoBandera);
});
btnSig.addEventListener("click", () => {
  if (modo === "mapa") {
    if (N.nivel % POR_ETAPA === 0) irA("mapa", N.nivel, true); // abre la vista principal de su zona: se ve subir el agua
    else jugarMapa(N.nivel + 1);
  } else if (tam < TAMANOS.length) { tam++; guardarEleccion(); nueva(); }
});

// ===== Menú principal =====
$("b-jugar").addEventListener("click", () => jugarMapa(progresoMapa().max)); // sigue en el nivel donde vas
$("b-niveles").addEventListener("click", () => irA("mapa"));
$("b-libre").addEventListener("click", () => irA("libre"));
// ☰ fuera de la partida (mapa, modo infinito) = volver al menú principal; en partida lo maneja el menú de pausa
btnMenu.addEventListener("click", () => { if (pantalla === "libre" || pantalla === "mapa") irA("menu"); });

// ===== Menú de pausa estándar (☰ en partida) =====
// Mientras está abierto, el reloj se congela y el tablero se oculta (para que no sirva de «descanso» para pensar).
function congelar() {
  if (estado !== "jugando") return;
  pausadoEn = Date.now();
  clearInterval(reloj);
  tab.style.visibility = "hidden";
}
function descongelar(reanudar) {
  tab.style.visibility = "";
  if (!pausadoEn) return;
  if (reanudar) { t0 += Date.now() - pausadoEn; arrancarReloj(); } // el tiempo en pausa no cuenta
  pausadoEn = 0;
}

crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => pantalla === "juego",
  alAbrir: () => { cancelar(); congelar(); },
  alContinuar: () => descongelar(true),
  extras: () => [
    { icono: "🔄", texto: "Nueva partida", clase: "b-oro", alElegir: () => { descongelar(false); nueva(); } },
    modo === "mapa"
      ? { icono: "🗺️", texto: "Mapa de niveles", clase: "b-azul", alElegir: () => { descongelar(false); irA("mapa", nivelMapa); } }
      : { icono: "♾️", texto: "Cambiar tablero o dificultad", clase: "b-morado", alElegir: () => { descongelar(false); irA("libre"); } },
  ],
  textoSalir: "Menú principal",
  ayudaSalir: () => (estado === "jugando" ? "Vuelves al menú principal y se pierde la partida en curso." : ""),
  alSalir: () => { descongelar(false); irA("menu"); },
});

irA("menu");

// Sincroniza récords y progreso del mapa con la cuenta de Google.
// Récords: se queda el MENOR tiempo. Progreso del mapa («mapa-hecho» y «mapa-max»): se queda el MAYOR.
import("../compartido/progreso.js").then((p) => {
  nube = p.conectar(ID, {
    clave: ID + ":mejores",
    fusionar: (a, b) => {
      if (!a && !b) return null;
      const r = { ...(b || {}) };
      for (const k in a || {}) {
        const x = Number(a[k]), y = Number(r[k]);
        if (k === "mapa-hecho" || k === "mapa-max") r[k] = Math.max(x || 0, y || 0);
        else r[k] = x > 0 && y > 0 ? Math.min(x, y) : x > 0 ? x : y;
      }
      return r;
    },
    alCambiar: () => { // repinta lo que se ve, sin tocar la partida en curso
      if (pantalla === "menu") pintarMenu();
      else if (pantalla === "libre") pintarLibre();
      else if (pantalla === "mapa") mapa.refrescar();
      else if (estado === "listo") mensajeInicial();
    },
  });
}).catch(() => {});
