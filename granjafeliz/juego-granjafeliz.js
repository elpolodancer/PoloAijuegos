// Ruta: granjafeliz/juego-granjafeliz.js
// Granja feliz (estilo Farm Frenzy), horizontal. Menú estándar + mapa de 22 600 niveles (por ahora existe el nivel 1: gallinas y huevos).
// Id de puntos: "granjafeliz". Datos en datos-granjafeliz.js; estrellas y monedas en economia-granjafeliz.js.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import * as eco from "./economia-granjafeliz.js";
import * as D from "./datos-granjafeliz.js";

const ETAPAS = crearEtapas({ porEtapa: 100 });
const DIFICULTADES = [["Muy fácil", "b-verde"], ["Fácil", "b-azul"], ["Normal", "b-morado"], ["Difícil", "b-oro"], ["Experto", "b-rojo"]];
const $ = (id) => document.getElementById(id);
const pantallas = { menu: $("pantalla-menu"), libre: $("pantalla-libre") };
const btnMenu = $("btn-menu"), cv = $("c"), ctx = cv.getContext("2d"), cajaFin = $("fin");
cv.width = D.ANCHO * 2; cv.height = D.ALTO * 2;

let donde = "menu", J = null, nube = null, tAviso = 0;
const pintarMonedas = () => { $("n-monedas").textContent = eco.saldo().toLocaleString("es-MX"); };
function avisar(t) { const a = $("aviso-granja"); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 2600); }

// ---------- Navegación ----------
function ir(nombre) {
  mapa.cerrar(); donde = nombre; cajaFin.hidden = true;
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  cv.hidden = nombre !== "juego";
  document.body.classList.toggle("en-juego", nombre === "juego");
  btnMenu.hidden = nombre === "menu";
  $("txt-menu").textContent = nombre === "juego" ? "Pausa" : "Menú principal"; // dentro de la partida: Pausa (estándar)
  if (nombre === "juego") ajustar();
}
function abrirMapa(n) { ir("menu"); for (const k in pantallas) pantallas[k].hidden = true; btnMenu.hidden = false; $("txt-menu").textContent = "Menú principal"; donde = "mapa"; mapa.abrir(n); }

const mapa = montarMapa({
  prefijo: "granjafeliz", etapas: ETAPAS, progreso: () => eco.avanceMapa(),
  jugarNivel: (n) => (D.NIVELES[n] ? empezar(n) : avisar("El nivel " + n + " todavía no está creado")),
  infoNivel: (n) => { const s = eco.estrellasDeNivel(n); return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: s + " de 3 estrellas" }; },
  leyenda: "Ganas 15, 30 o 45 monedas según tus estrellas la primera vez que las consigues",
});

const pausa = crearMenuPausa({
  puedeAbrir: () => donde === "juego" && J && !J.fin,
  alAbrir: () => { J.pausa = true; }, alContinuar: () => { J.pausa = false; },
  extras: () => [{ icono: "🔄", texto: "Repetir nivel", clase: "b-azul", alElegir: () => empezar(J.n) }],
  alSalir: () => abrirMapa(J.n),
});
btnMenu.addEventListener("click", () => (donde === "juego" ? pausa.abrir() : ir("menu")));

for (const [t, c] of DIFICULTADES) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt grande " + c; b.innerHTML = '<span class="b-ico">🐔</span> <span></span>'; b.lastElementChild.textContent = t;
  b.addEventListener("click", () => avisar("El modo libre todavía está en construcción (" + t + ")"));
  $("lista-dificultad").appendChild(b);
}
$("btn-libre").onclick = () => ir("libre");
$("btn-niveles").onclick = () => abrirMapa(eco.avanceMapa().max);
$("btn-mapa").onclick = () => abrirMapa();

// ---------- Escenario ----------
const CAMPO = { x: 20, y: 60, w: 600, h: 370 };
const CAJAS = { pozo: { x: 640, y: 60, w: 150, h: 75 }, almacen: { x: 640, y: 145, w: 150, h: 75 }, camion: { x: 640, y: 230, w: 150, h: 75 }, comprar: { x: 640, y: 315, w: 150, h: 75 } };
const dentro = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const azar = (a, b) => a + Math.random() * (b - a);

function ajustar() { // el escenario 16:9 ocupa el espacio libre (deja libres las esquinas de los botones fijos)
  const aw = innerWidth - 150, ah = innerHeight - 12, s = Math.min(aw / D.ANCHO, ah / D.ALTO);
  cv.style.width = D.ANCHO * s + "px"; cv.style.height = D.ALTO * s + "px";
  cv.style.left = 140 + (aw - D.ANCHO * s) / 2 + "px"; cv.style.top = (innerHeight - D.ALTO * s) / 2 + "px";
  if (J && J.fin) colocarFin();
}
addEventListener("resize", ajustar);

function nuevoAnimal(tipo) { return { tipo, x: azar(CAMPO.x + 30, CAMPO.x + CAMPO.w - 30), y: azar(CAMPO.y + 40, CAMPO.y + CAMPO.h - 20), hambre: azar(0, 0.4), est: "vaga", t: 0, dest: null, objetivo: null, mord: 0 }; }
function empezar(n) {
  const N = D.NIVELES[n];
  J = { n, N, t: 0, dinero: N.dineroInicial, ventas: 0, agua: N.aguaInicial, pozo: 0, pasto: [], animales: [], huevos: [], almacen: 0, camion: 0, pago: 0, flot: [], fin: false, pausa: false };
  for (const tipo in N.animales) for (let i = 0; i < N.animales[tipo]; i++) J.animales.push(nuevoAnimal(tipo));
  ir("juego");
}

function flotar(x, y, txt) { J.flot.push({ x, y, txt, t: 1.2 }); }
function tocar(x, y) {
  if (!J || J.fin || J.pausa) return;
  for (const h of J.huevos) if (Math.hypot(h.x - x, h.y - y) < 24) { // recoger huevo
    if (J.almacen >= D.CAPACIDAD_ALMACEN) { flotar(h.x, h.y, "Almacén lleno"); return; }
    J.almacen++; J.huevos.splice(J.huevos.indexOf(h), 1); return;
  }
  if (dentro(CAJAS.pozo, x, y)) { if (!J.pozo && J.agua < D.MAX_AGUA) J.pozo = D.SEG_POZO; return; }
  if (dentro(CAJAS.camion, x, y)) { if (!J.camion && J.almacen > 0) { J.pago = J.almacen * D.PRODUCTOS.huevo.valor; J.almacen = 0; J.camion = D.SEG_CAMION; } return; }
  if (dentro(CAJAS.comprar, x, y)) {
    const A = D.ANIMALES.gallina, n = J.animales.filter((a) => a.tipo === "gallina").length;
    if (n >= A.max) flotar(715, 300, "Máximo"); else if (J.dinero < A.precio) flotar(715, 300, "Falta dinero"); else { J.dinero -= A.precio; J.animales.push(nuevoAnimal("gallina")); }
    return;
  }
  if (dentro(CAMPO, x, y)) { // plantar pasto con 1 de agua
    if (J.agua < 1) flotar(x, y, "Sin agua 💧"); else if (J.pasto.length >= D.MAX_PASTO) flotar(x, y, "Mucho pasto"); else { J.agua--; J.pasto.push({ x, y, v: 4 }); }
  }
}
cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); tocar((e.clientX - r.left) / r.width * D.ANCHO, (e.clientY - r.top) / r.height * D.ALTO); });

function actualizar(dt) {
  J.t += dt;
  if (J.pozo > 0) { J.pozo -= dt; if (J.pozo <= 0) { J.pozo = 0; J.agua = D.MAX_AGUA; } }
  if (J.camion > 0) { J.camion -= dt; if (J.camion <= 0) { J.camion = 0; J.dinero += J.pago; J.ventas += J.pago; flotar(715, 250, "+$" + J.pago); J.pago = 0; } }
  for (const a of [...J.animales]) {
    const A = D.ANIMALES[a.tipo];
    a.hambre += dt / A.segHambre; a.t += dt;
    if (a.hambre > 1 + A.muereHambre) { J.animales.splice(J.animales.indexOf(a), 1); flotar(a.x, a.y, "💀"); continue; }
    if (a.est === "vaga") {
      if (a.hambre > 0.5 && J.pasto.length) { // va al pasto más cercano
        a.objetivo = J.pasto.reduce((m, p) => (Math.hypot(p.x - a.x, p.y - a.y) < Math.hypot(m.x - a.x, m.y - a.y) ? p : m));
        a.dest = a.objetivo;
      } else if (!a.dest || Math.hypot(a.dest.x - a.x, a.dest.y - a.y) < 6) a.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, CAMPO.y + CAMPO.h - 10) };
      const d = Math.hypot(a.dest.x - a.x, a.dest.y - a.y);
      if (d > 4) { a.x += (a.dest.x - a.x) / d * A.vel * dt; a.y += (a.dest.y - a.y) / d * A.vel * dt; }
      if (a.objetivo && d < 12) { a.est = "come"; a.t = 0; a.mord = 0; }
    } else if (a.est === "come") {
      if (!J.pasto.includes(a.objetivo)) { a.est = "vaga"; a.objetivo = a.dest = null; continue; }
      if (a.t > 0.8) { a.t = 0; a.mord++; if (--a.objetivo.v <= 0) J.pasto.splice(J.pasto.indexOf(a.objetivo), 1);
        if (a.mord >= A.mordidas) { a.hambre = 0; a.est = "pone"; a.objetivo = a.dest = null; } }
    } else if (a.t > A.segPone) { J.huevos.push({ x: a.x + azar(-10, 10), y: a.y + 12, t: 12 }); a.est = "vaga"; a.t = 0; }
  }
  for (const h of J.huevos) h.t -= dt;
  J.huevos = J.huevos.filter((h) => h.t > 0);
  for (const f of J.flot) f.t -= dt;
  J.flot = J.flot.filter((f) => f.t > 0);
  if (J.ventas >= J.N.meta) terminar(true); else if (J.t >= J.N.tiempo) terminar(false);
}

// ---------- Dibujo ----------
function caja(r, ctxFill) { ctx.fillStyle = ctxFill; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); }
function txt(t, x, y, tam = 16, color = "#fff", al = "left") { ctx.font = "700 " + tam + "px system-ui,sans-serif"; ctx.fillStyle = color; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
function emo(e, x, y, tam) { ctx.font = tam + "px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

function dibujar() {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, D.ANCHO, D.ALTO); // transparente: se ve la madera
  if (!J) return;
  caja({ x: 20, y: 8, w: 770, h: 40 }, "rgba(20,20,24,.78)");
  txt("💵 $" + J.dinero, 36, 28, 18, "#fff4c2");
  txt("Ventas " + J.ventas + " / " + J.N.meta, 400, 28, 18, "#fff", "center");
  txt("⏱ " + mmss(Math.max(0, J.N.tiempo - J.t)), 772, 28, 18, J.N.tiempo - J.t < 30 ? "#ff9a8c" : "#fff", "right");
  caja(CAMPO, "rgba(88,160,60,.88)");
  for (const p of J.pasto) emo(p.v >= 3 ? "🌿" : "🌱", p.x, p.y, 22);
  for (const h of J.huevos) { if (h.t > 3 || Math.floor(h.t * 6) % 2) emo("🥚", h.x, h.y, 20); }
  for (const a of J.animales.slice().sort((p, q) => p.y - q.y)) {
    emo(D.ANIMALES[a.tipo].emoji, a.x, a.y + Math.sin(J.t * 8 + a.x) * (a.est === "vaga" ? 1.5 : 0), 30);
    if (a.hambre > 1.2) emo("❗", a.x + 14, a.y - 16, 14);
  }
  caja(CAJAS.pozo, "rgba(20,20,24,.78)"); emo("⛲", 672, 98, 34);
  txt("Pozo", 700, 82, 15); txt(J.pozo > 0 ? "Llenando… " + Math.ceil(J.pozo) : "💧 " + J.agua + " / " + D.MAX_AGUA, 700, 108, 14, "#bfe4fb");
  caja(CAJAS.almacen, "rgba(20,20,24,.78)"); emo("📦", 672, 183, 34);
  txt("Almacén", 700, 167, 15); txt("🥚 " + J.almacen + " / " + D.CAPACIDAD_ALMACEN, 700, 193, 14, "#fff4c2");
  caja(CAJAS.camion, J.almacen > 0 && !J.camion ? "rgba(40,120,50,.9)" : "rgba(20,20,24,.78)"); emo("🚚", 672, 268, 34);
  txt("Vender", 700, 252, 15); txt(J.camion > 0 ? "En camino… " + Math.ceil(J.camion) : "$" + J.almacen * D.PRODUCTOS.huevo.valor, 700, 278, 14, "#fff4c2");
  const A = D.ANIMALES.gallina;
  caja(CAJAS.comprar, J.dinero >= A.precio ? "rgba(160,100,10,.92)" : "rgba(20,20,24,.78)"); emo(A.emoji, 672, 353, 34);
  txt("Comprar", 700, 337, 15); txt("$" + A.precio, 700, 363, 14, "#fff4c2");
  for (const f of J.flot) { ctx.globalAlpha = Math.min(1, f.t); txt(f.txt, f.x, f.y - (1.2 - f.t) * 30, 16, "#fff", "center"); ctx.globalAlpha = 1; }
}

// ---------- Fin del nivel ----------
function colocarFin() {
  const r = cv.getBoundingClientRect();
  Object.assign(cajaFin.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
}
function terminar(gano) {
  J.fin = true;
  const seg = Math.ceil(J.t);
  let res = { estrellas: 0, monedas: 0 };
  if (gano) { res = eco.registrarNivel(J.n, eco.estrellasDe({ gano, segundos: seg, estrellasSeg: J.N.estrellasSeg })); pintarMonedas(); if (nube) nube.guardado(); }
  const caja_ = (c, t, f) => { const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + c; b.textContent = t; b.onclick = f; return b; };
  const sig = D.NIVELES[J.n + 1] ? J.n + 1 : 0;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = gano ? "¡Nivel " + J.n + " completado!" : "Se acabó el tiempo";
  texto.lastChild.textContent = gano ? eco.estrellasTexto(res.estrellas) + " en " + mmss(seg) + (res.monedas ? " · +" + res.monedas + " monedas" : "") : "Vendiste $" + J.ventas + " de $" + J.N.meta;
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  fila.append(caja_("b-azul", "Repetir nivel", () => empezar(J.n)), caja_("b-gris", "Mapa", () => abrirMapa(J.n)));
  cajaFin.replaceChildren(texto);
  if (gano && sig) cajaFin.appendChild(caja_("grande b-verde", "Siguiente nivel ▶", () => empezar(sig))); // primero y más grande; en el último nivel se oculta
  cajaFin.appendChild(fila);
  if (gano && sig) cajaFin.children[1].className = "b3d txt grande b-verde";
  cajaFin.hidden = false; colocarFin();
}

// ---------- Bucle ----------
let previo = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dt = Math.min(0.05, (ahora - previo) / 1000 || 0); previo = ahora;
  if (donde === "juego" && J && !J.pausa && !J.fin) actualizar(dt);
  if (donde === "juego") dibujar();
}
requestAnimationFrame(bucle);

// Sincronización con la cuenta (opcional: funciona igual sin internet)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar("granjafeliz", { clave: eco.CLAVE_PROGRESO, fusionar: eco.fusionar, alCambiar: () => { pintarMonedas(); mapa.refrescar(); } });
}).catch(() => {});

pintarMonedas();
ir("menu");
