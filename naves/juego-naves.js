// Ruta: naves/juego-naves.js
// «Naves» (id de puntos: naves). Dibuja la simulación de logica-naves.js, maneja el arrastre/teclado, el Taller (50 armas),
// el mapa de niveles estándar (México) y el progreso. Los niveles están en niveles-naves.js y los bots que los comprueban en ia-naves.js.
// Progreso local primero: localStorage «naves_progreso_v1», sincronizado con la cuenta mediante compartido/progreso.js.
// Pantallas: «menu» (menú principal estándar) · «mapa» (niveles / mapa de México) · «juego» (partida).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { encolarPuntos } from "../compartido/cola-puntos.js";
import { W, H, Y_NAVE, Y_BASE, R_NAVE, TPS, NUM_TIERS, TIPOS, ARMAS, armaDe, enemigoDe, crearEstado, paso, acotar } from "./logica-naves.js";
import { nivelDe, NIVELES, POR_ETAPA, tierDe, monedasNivel, puntosNivel } from "./niveles-naves.js";

const ID_JUEGO = "naves";
const CLAVE = "naves_progreso_v1";
const $ = (id) => document.getElementById(id);
const num = (v) => v.toLocaleString("es-MX");

// ---------- Progreso ----------
// max = nivel más alto abierto, hecho = más alto terminado, arma = tier de tu mejor arma,
// ganadas / gastadas = monedas que has ganado y gastado EN TOTAL (las monedas que tienes = ganadas − gastadas).
// Al unir con la nube gana el mayor de cada dato (ninguno de los cuatro puede bajar, así que no se pierde nada al comprar en otro aparato).
function normalizar(p) {
  p = p || {};
  const n = (v, a, b, d) => acotar(Math.floor(Number(v)) || d, a, b);
  return { max: n(p.max, 1, NIVELES, 1), hecho: n(p.hecho, 0, NIVELES, 0), arma: n(p.arma, 1, NUM_TIERS, 1), ganadas: n(p.ganadas, 0, 1e15, 0), gastadas: n(p.gastadas, 0, 1e15, 0), t: Number(p.t) || 0 };
}
function unir(a, b) {
  if (!a && !b) return null;
  a = normalizar(a); b = normalizar(b);
  return { max: Math.max(a.max, b.max), hecho: Math.max(a.hecho, b.hecho), arma: Math.max(a.arma, b.arma), ganadas: Math.max(a.ganadas, b.ganadas), gastadas: Math.max(a.gastadas, b.gastadas), t: Math.max(a.t, b.t) };
}
function leer() { try { return normalizar(JSON.parse(localStorage.getItem(CLAVE))); } catch (e) { return normalizar(null); } }
let prog = leer();
let nube = null;
const monedas = () => Math.max(0, prog.ganadas - prog.gastadas);
function guardar() {
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
  hudMonedas();
}
import("../compartido/progreso.js")
  .then((m) => { nube = m.conectar(ID_JUEGO, { clave: CLAVE, fusionar: unir, alCambiar: (u) => { prog = normalizar(u); hudMonedas(); mapa.refrescar(); } }); })
  .catch(() => {});

// ---------- Pantallas ----------
let modo = "menu";           // menu | mapa | juego
const btnMenu = $("btn-menu"), lienzo = $("lienzo"), ctx = lienzo.getContext("2d");
const cVidas = $("c-vidas"), cBase = $("c-base"), cMonedas = $("c-monedas");
const menuEl = $("menu");
const hudMonedas = () => { cMonedas.textContent = num(monedas()); };
hudMonedas();

// El ☰ dice SIEMPRE «Pausa» y abre el menú de pausa; no se muestra en el menú principal
function rotular() { btnMenu.hidden = modo === "menu"; }

const claseDeTier = (t) => (t <= 10 ? "b-verde" : t <= 20 ? "b-azul" : t <= 30 ? "b-morado" : t <= 40 ? "b-oro" : "b-rojo");
const mapa = montarMapa({
  prefijo: ID_JUEGO,
  etapas: crearEtapas({ porEtapa: POR_ETAPA }),
  progreso: () => ({ max: prog.max, hecho: prog.hecho }),
  jugarNivel: (n) => empezar(n),
  infoNivel: (n) => ({ sub: "T" + tierDe(n), clase: claseDeTier(tierDe(n)), aria: "enemigos de tier " + tierDe(n) }),
  leyenda: "T = tier de los enemigos: tu arma debería ser de ese tier o más",
  avisoPrincipal: () => "🔧 Tu arma: " + armaDe(prog.arma).nombre + " (tier " + prog.arma + " de " + NUM_TIERS + ")",
  alCambiarVista: () => rotular(),
});

// ---------- Menú principal estándar ----------
// Modo libre: sin monedas ni puntos. Cada dificultad usa un nivel ya comprobado por los bots (1, 80, 160, 240 y 320).
const DIFICULTADES = [
  { nom: "Muy fácil", clase: "b-verde", n: 1 },
  { nom: "Fácil", clase: "b-azul", n: 80 },
  { nom: "Normal", clase: "b-morado", n: 160 },
  { nom: "Difícil", clase: "b-oro", n: 240 },
  { nom: "Experto", clase: "b-rojo", n: 320 },
];
const mDif = $("m-dif");
for (const d of DIFICULTADES) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "b3d txt " + d.clase; b.textContent = d.nom;
  b.addEventListener("click", () => empezar(d.n, d.nom));
  mDif.appendChild(b);
}
const aviso0 = document.createElement("small");
aviso0.textContent = "Sin monedas ni puntos";
mDif.appendChild(aviso0);
$("m-libre").addEventListener("click", () => {
  mDif.hidden = !mDif.hidden;
  $("m-libre").setAttribute("aria-expanded", String(!mDif.hidden));
});
$("m-niveles").addEventListener("click", () => abrirMapa(prog.max));  // lista de niveles de la etapa donde vas
$("m-mapa").addEventListener("click", () => abrirMapa());             // vista principal del mapa

function mostrarMenu() {
  modo = "menu"; S = null; cancelAnimationFrame(raf); raf = 0; pausado = false;
  cVidas.hidden = true; cBase.hidden = true;
  cerrarVentana();
  mapa.cerrar();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  mDif.hidden = true; $("m-libre").setAttribute("aria-expanded", "false");
  menuEl.hidden = false;
  rotular();
}
function abrirMapa(n, alcanzado) {
  modo = "mapa"; menuEl.hidden = true;
  mapa.abrir(n, alcanzado);
  rotular();
}

// ---------- Sesión («👤 Iniciar sesión», siempre el último de la fila de arriba a la derecha) ----------
const btnSesion = $("btn-sesion"), txtSesion = $("txt-sesion");
import("../compartido/jugador.js")
  .then(({ alCambiarSesion, entrar, salir }) => {
    let usuario = null;
    btnSesion.disabled = false;
    btnSesion.addEventListener("click", () => { if (usuario) salir(); else entrar().catch((e) => alert(e.message)); });
    alCambiarSesion((u) => {
      usuario = u;
      txtSesion.textContent = u ? (u.displayName || "Jugador").split(" ")[0] : "Iniciar sesión";
      btnSesion.title = u ? "Cerrar sesión" : "Iniciar sesión con Google";
    });
  })
  .catch(() => { btnSesion.title = "Sesión no disponible sin conexión"; });

// ---------- Ventanas (Taller, Info, resultado) ----------
let ventana = null;
function cerrarVentana() { if (ventana) { ventana.remove(); ventana = null; } }
function abrirVentana() {
  cerrarVentana();
  const f = document.createElement("div"); f.className = "nv-fondo";
  const p = document.createElement("div"); p.className = "pausa-panel nv-panel";
  f.appendChild(p); document.body.appendChild(f); ventana = f;
  return p;
}
const h = (tag, clase, texto) => { const n = document.createElement(tag); if (clase) n.className = clase; if (texto != null) n.textContent = texto; return n; };
function boton(texto, icono, clase, fn, deshabilitado) {
  const b = h("button", "b3d txt " + clase); b.type = "button"; b.disabled = !!deshabilitado;
  b.append(h("span", "b-ico", icono), document.createTextNode(" " + texto));
  b.addEventListener("click", fn);
  return b;
}
function datos(A, B) { // lista de estadísticas de un arma (B = arma con la que comparar, opcional)
  const fila = (nom, v, w) => { const d = h("div"); d.append(document.createTextNode(nom + ": "), h("b", "", v)); if (w) d.append(h("span", "nv-mas", " " + w)); return d; };
  const dif = (x, y) => (B ? (y > x ? "▲ +" + num(+(y - x).toFixed(2)) : "") : "");
  const g = h("div", "nv-datos");
  const C = B || A;
  g.append(
    fila("Daño por bala", num(A.dano), dif(A.dano, C.dano)),
    fila("Disparos por s", String(+A.tiros.toFixed(1)), dif(A.tiros, C.tiros)),
    fila("Balas por disparo", String(A.balas), dif(A.balas, C.balas)),
    fila("Perforación", String(A.pierce), dif(A.pierce, C.pierce)),
    fila("Daño por segundo", num(Math.round(A.dps)), dif(A.dps, C.dps)),
  );
  return g;
}

function abrirTaller() {
  const p = abrirVentana();
  const k = prog.arma, A = armaDe(k), B = k < NUM_TIERS ? armaDe(k + 1) : null;
  p.appendChild(h("h2", "", "🔧 Taller"));

  const t1 = h("div", "nv-tarjeta");
  const h1 = h("h3", "", "Tu arma: " + A.nombre); h1.appendChild(h("small", "", "tier " + k + " de " + NUM_TIERS));
  h1.style.color = A.color;
  t1.append(h1, datos(A));
  p.appendChild(t1);

  if (B) {
    const t2 = h("div", "nv-tarjeta");
    const h2 = h("h3", "", "Siguiente: " + B.nombre); h2.appendChild(h("small", "", "tier " + B.k)); h2.style.color = B.color;
    t2.append(h2, datos(A, B)); // comparar contra la actual: muestra ▲ solo donde mejora
    const precio = h("span", "nv-precio"); precio.append(h("span", "moneda"), document.createTextNode(num(B.costo)));
    const comprar = h("button", "b3d txt b-verde"); comprar.type = "button"; comprar.disabled = monedas() < B.costo;
    comprar.append(h("span", "b-ico", "🛒"), document.createTextNode(" Comprar  "), precio);
    comprar.addEventListener("click", () => {
      if (prog.arma !== k || monedas() < B.costo) return;
      prog.gastadas += B.costo; prog.arma = k + 1; guardar(); abrirTaller(); mapa.refrescar();
    });
    const fila = h("div", "nv-fila"); fila.appendChild(comprar);
    t2.appendChild(fila);
    if (monedas() < B.costo) t2.appendChild(h("p", "", "Te faltan " + num(B.costo - monedas()) + " monedas: las ganas pasando niveles."));
    p.appendChild(t2);
  } else p.appendChild(h("p", "", "¡Tienes la mejor arma del juego!"));

  const E = enemigoDe(tierDe(prog.max)), tier = tierDe(prog.max);
  const t3 = h("div", "nv-tarjeta");
  const h3 = h("h3", "", "Enemigos de tu nivel " + prog.max); h3.appendChild(h("small", "", "tier " + tier)); h3.style.color = E.color;
  t3.appendChild(h3);
  t3.appendChild(h("p", "", E.nombre + ": " + num(E.hp) + " de vida base, velocidad " + Math.round(E.vel) + " px/s. " + (prog.arma >= tier ? "Tu arma está a su altura. ✔" : "⚠ Tu arma es de un tier menor: mejórala.")));
  p.appendChild(t3);

  p.appendChild(h("p", "", "Todas las armas"));
  const rej = h("div", "nv-armas");
  for (const a of ARMAS) {
    const d = h("div", "nv-arma" + (a.k > k ? " no" : "") + (a.k === k ? " act" : ""), String(a.k));
    d.style.background = "linear-gradient(180deg," + a.color + "55," + a.color + "22)";
    d.title = a.nombre + (a.k > k ? " · " + num(a.costo) + " monedas" : "");
    rej.appendChild(d);
  }
  p.appendChild(rej);
  const fila = h("div", "nv-fila"); fila.appendChild(boton("Volver", "◀", "b-gris", cerrarVentana));
  p.appendChild(fila);
}

function abrirInfo() {
  const p = abrirVentana();
  p.appendChild(h("h2", "", "ℹ️ Cómo se juega"));
  for (const t of [
    "Arrastra el dedo (o usa ← → / A D) para mover la nave de lado a lado. Dispara sola.",
    "Los enemigos bajan en manada. Si uno toca tu nave pierdes 1 de tus 5 vidas ❤️; si cruza la línea de abajo cuenta como fuga 🛡 (con 10 fugas pierdes).",
    "Cinco tipos: Zángano (recto), Zigzag, Rápido, Blindado (aguanta mucho) y Tirador (te dispara: esquiva).",
    "Al pasar un nivel ganas monedas. Con ellas compras mejores armas en el Taller 🔧: son 50 y cada una dispara más rápido, con más balas en abanico, más daño y perforación.",
    "Los enemigos también suben de tier (50 en total): cada nivel dice su tier (T1…T50). Tu arma debe ser de ese tier o más.",
    "El ♾️ Modo libre te deja jugar sin monedas ni puntos, en 5 dificultades.",
    "Cada nivel se comprobó con un bot que busca, con retroceso, un camino para pasarlo: siempre se puede.",
  ]) p.appendChild(h("p", "", "• " + t));
  const fila = h("div", "nv-fila"); fila.appendChild(boton("Entendido", "👍", "b-verde", cerrarVentana));
  p.appendChild(fila);
}

// ---------- Partida ----------
let S = null, niv = null, nn = 1, libreNombre = "";
let espera = 0, acc = 0, ultimo = 0, raf = 0, pausado = false, terminado = false, aviso = "";
let objetivo = W / 2, teclas = 0;
let part = [], agite = 0, rojoBase = 0, tiempo = 0;
let titulo = "";

// Menú de pausa estándar: dentro de una partida congela el juego; en el mapa y la lista de niveles abre el mismo menú
// (con el Taller y la Info) y su «Salir» vuelve al menú principal.
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => (modo === "juego" ? !!S && !S.fin && !terminado : modo === "mapa"),
  alAbrir: () => { if (modo === "juego") pausado = true; },
  alContinuar: () => { pausado = false; },
  extras: () => (modo === "juego"
    ? [{ icono: "🔁", texto: "Reintentar el nivel", clase: "b-azul", alElegir: () => { pausado = false; empezar(nn, libreNombre); } }]
    : [
        { icono: "🔧", texto: "Taller", clase: "b-oro", alElegir: abrirTaller },
        { icono: "ℹ️", texto: "Info", clase: "b-azul", alElegir: abrirInfo },
      ]),
  alSalir: () => mostrarMenu(),
  ayudaSalir: () => (modo === "juego" ? "Pierdes lo que llevas de este nivel" : ""),
});

// libre = nombre de la dificultad del Modo libre (sin monedas ni puntos); vacío = nivel normal del mapa
function empezar(n, libre) {
  cerrarVentana();
  libreNombre = libre || "";
  nn = acotar(n, 1, NIVELES);
  niv = nivelDe(nn);
  S = crearEstado(niv); S.ev = [];
  espera = 110; acc = 0; pausado = false; terminado = false; part = []; agite = 0; rojoBase = 0; tiempo = 0;
  objetivo = S.x; teclas = 0;
  const E = enemigoDe(niv.tier);
  aviso = !libreNombre && prog.arma < niv.tier ? "⚠ Tu arma (tier " + prog.arma + ") es más débil que estos enemigos (tier " + niv.tier + ")" : "";
  titulo = (libreNombre ? "Libre · " + libreNombre : "Nivel " + nn) + " · " + E.nombre;
  modo = "juego";
  menuEl.hidden = true;
  mapa.cerrar();
  cVidas.hidden = false; cBase.hidden = false;
  rotular();
  ajustar();
  ultimo = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

function salirAlMapa(alcanzado) {
  S = null; cancelAnimationFrame(raf); raf = 0;
  cVidas.hidden = true; cBase.hidden = true;
  cerrarVentana();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  abrirMapa(nn, alcanzado);
}

function motivoDerrota() {
  return S.vidas <= 0 ? "Te quedaste sin vidas." : S.fugas > niv.maxFugas ? "Pasaron demasiados enemigos (más de " + niv.maxFugas + ")." : "Se acabó el tiempo.";
}

function terminar() {
  terminado = true;
  const gano = S.fin === 1;
  const p = abrirVentana();

  // Modo libre: sin monedas, sin puntos y sin tocar el progreso
  if (libreNombre) {
    p.appendChild(h("h2", "", gano ? "🎉 ¡Lo lograste!" : "💥 Derrota"));
    p.appendChild(h("p", "", (gano ? "Vidas que te quedaron: " + "❤️".repeat(Math.max(0, S.vidas)) + " · Fugas: " + S.fugas : motivoDerrota()) + " (" + libreNombre + ")"));
    p.appendChild(h("p", "", "Modo libre: no da monedas ni puntos."));
    const fila = h("div", "nv-fila");
    fila.appendChild(boton(gano ? "Otra vez" : "Reintentar", "🔁", "b-verde", () => empezar(nn, libreNombre)));
    fila.appendChild(boton("Menú principal", "🏠", "b-azul", mostrarMenu));
    p.appendChild(fila);
    return;
  }

  if (gano) {
    const primera = nn > prog.hecho;
    const monedasGanadas = primera ? monedasNivel(nn) : Math.floor(monedasNivel(nn) / 4);
    prog.ganadas += monedasGanadas;
    if (primera) { prog.hecho = nn; encolarPuntos(ID_JUEGO, puntosNivel(nn)); }
    prog.max = Math.max(prog.max, Math.min(NIVELES, nn + 1));
    guardar();
    p.appendChild(h("h2", "", nn >= NIVELES ? "🏆 ¡México completado!" : "🎉 ¡Nivel " + nn + " superado!"));
    p.appendChild(h("p", "", "Vidas que te quedaron: " + "❤️".repeat(Math.max(0, S.vidas)) + " · Fugas: " + S.fugas));
    const m = h("p"); const ch = h("span", "chip chip-monedas"); ch.append(h("span", "moneda"), document.createTextNode("+" + num(monedasGanadas)));
    m.append(ch, document.createTextNode(primera ? "  ¡Primera vez!" : "  (repetido: cuarta parte)"));
    p.appendChild(m);
    const prox = prog.arma < tierDe(Math.min(NIVELES, nn + 1)) && prog.arma < NUM_TIERS ? armaDe(prog.arma + 1) : null;
    if (prox) p.appendChild(h("div", "nv-aviso", "El siguiente nivel trae enemigos de un tier mayor que tu arma. Siguiente mejora: " + prox.nombre + " (" + num(prox.costo) + " monedas)" + (monedas() >= prox.costo ? " — ¡ya te alcanza!" : ".")));
    const fila = h("div", "nv-fila");
    if (nn < NIVELES) fila.appendChild(boton("Siguiente", "▶", "b-verde", () => empezar(nn + 1)));
    fila.appendChild(boton("Taller", "🔧", "b-oro", () => { salirAlMapa(); abrirTaller(); }));
    fila.appendChild(boton("Mapa", "🗺️", "b-azul", () => salirAlMapa(nn % POR_ETAPA === 0)));
    p.appendChild(fila);
  } else {
    p.appendChild(h("h2", "", "💥 Derrota"));
    p.appendChild(h("p", "", motivoDerrota()));
    if (prog.arma < niv.tier) p.appendChild(h("div", "nv-aviso", "Tu arma es de tier " + prog.arma + " y estos enemigos de tier " + niv.tier + ". Mira si ya te alcanza una mejor en el Taller."));
    const fila = h("div", "nv-fila");
    fila.appendChild(boton("Reintentar", "🔁", "b-verde", () => empezar(nn)));
    fila.appendChild(boton("Taller", "🔧", "b-oro", () => { salirAlMapa(); abrirTaller(); }));
    fila.appendChild(boton("Mapa", "🗺️", "b-azul", () => salirAlMapa()));
    p.appendChild(fila);
  }
}

// ---------- Entrada ----------
let escala = 1, ox = 0, oy = 0, dpr = 1;
function ajustar() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = window.innerWidth, ch = window.innerHeight;
  lienzo.width = Math.round(cw * dpr); lienzo.height = Math.round(ch * dpr);
  escala = Math.min(cw / W, ch / H); ox = (cw - W * escala) / 2; oy = (ch - H * escala) / 2;
}
addEventListener("resize", ajustar);
const aCampo = (ev) => ((ev.clientX - ox) / escala);
lienzo.addEventListener("pointerdown", (ev) => { if (modo !== "juego") return; try { lienzo.setPointerCapture(ev.pointerId); } catch (e) {} objetivo = aCampo(ev); });
lienzo.addEventListener("pointermove", (ev) => { if (modo === "juego" && (ev.buttons || ev.pointerType === "touch" || ev.pointerType === "pen")) objetivo = aCampo(ev); });
addEventListener("keydown", (ev) => {
  if (modo !== "juego") return;
  if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") { teclas = -1; ev.preventDefault(); }
  else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") { teclas = 1; ev.preventDefault(); }
});
addEventListener("keyup", (ev) => {
  if ((teclas < 0 && (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A")) || (teclas > 0 && (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D"))) teclas = 0;
});
document.addEventListener("visibilitychange", () => { if (document.hidden && modo === "juego" && !pausa.abierto() && !terminado) pausa.abrir(); });

// ---------- Bucle ----------
function frame(t) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - ultimo) / 1000 || 0); ultimo = t;
  if (!pausado) acc += dt;
  let pasos = 0;
  while (acc >= 1 / TPS && pasos++ < 6) {
    acc -= 1 / TPS;
    if (terminado) continue;
    const tx = teclas ? S.x + teclas * 400 : objetivo;
    if (espera > 0) { espera--; const d = tx - S.x, m = 360 / TPS; S.x = acotar(S.x + (d > m ? m : d < -m ? -m : d), 18, W - 18); }
    else { paso(S, niv, tx); tiempo++; }
    if (S.fin && !terminado) { terminado = true; setTimeout(() => { if (modo === "juego" && S) { terminado = false; terminar(); } }, 700); }
  }
  procesarEventos();
  actualizarParticulas(dt * 60);
  dibujar();
  actualizarHud();
}
// (terminar() vuelve a poner «terminado» en true al abrir la ventana; mientras tanto el campo sigue animándose)

function procesarEventos() {
  if (!S || !S.ev.length) return;
  const E = enemigoDe(niv.tier);
  for (const e of S.ev) {
    if (e.t === "muere") chispas(e.x, e.y, E.color, 10, 3);
    else if (e.t === "golpe") chispas(e.x, e.y, "#fff", 2, 1.5);
    else if (e.t === "choque") { chispas(e.x, e.y, "#ff5a4a", 16, 4); agite = 10; }
    else if (e.t === "fuga") rojoBase = 1;
  }
  S.ev.length = 0;
}
function chispas(x, y, col, n, v) {
  for (let i = 0; i < n && part.length < 220; i++) {
    const a = (i / n) * 6.283 + (x + y + i) % 1, s = v * (0.4 + ((i * 37) % 10) / 10);
    part.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, v: 1, col });
  }
}
function actualizarParticulas(k) {
  for (let i = part.length - 1; i >= 0; i--) {
    const q = part[i];
    q.x += q.vx * k; q.y += q.vy * k; q.v -= 0.04 * k;
    if (q.v <= 0) { part[i] = part[part.length - 1]; part.pop(); }
  }
  if (agite > 0) agite = Math.max(0, agite - k * 0.6);
  if (rojoBase > 0) rojoBase = Math.max(0, rojoBase - 0.03 * k);
}
let hv = "", hb = "";
function actualizarHud() {
  if (!S) return;
  const v = "❤️ " + Math.max(0, S.vidas), b = "🛡 " + Math.max(0, niv.maxFugas - S.fugas);
  if (v !== hv) { cVidas.textContent = v; hv = v; }
  if (b !== hb) { cBase.textContent = b; hb = b; }
}

// ---------- Dibujo ----------
const ESTRELLAS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 97.3) % W, y: (i * 211.7) % H, r: 0.6 + ((i * 13) % 10) / 10, v: 0.15 + ((i * 7) % 10) / 25 }));
function dibujar() {
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, lienzo.width, lienzo.height); // transparente: se ve la madera
  if (!S) return;
  const sh = agite ? (Math.random() - 0.5) * agite * 0.6 : 0;
  c.setTransform(dpr * escala, 0, 0, dpr * escala, dpr * (ox + sh), dpr * (oy + sh));
  c.save();
  marco(c); c.clip();

  // fondo del campo + estrellas
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#070b24"); g.addColorStop(1, "#1a2656");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "#fff";
  for (const e of ESTRELLAS) { c.globalAlpha = 0.35 + e.r * 0.3; c.fillRect(e.x, (e.y + tiempo * e.v) % H, e.r, e.r); }
  c.globalAlpha = 1;

  // franja de la base
  c.fillStyle = "#222a45"; c.fillRect(0, Y_BASE, W, H - Y_BASE);
  c.fillStyle = rojoBase > 0 ? "rgba(255,70,60," + (0.35 + rojoBase * 0.5) + ")" : "rgba(255,110,90,.5)"; c.fillRect(0, Y_BASE, W, 3);
  // progreso del nivel (centrado: las esquinas de abajo son de los botones 🌙 y ⛶)
  const prg = acotar(S.sp / Math.max(1, niv.spawns.length), 0, 1);
  c.fillStyle = "rgba(255,255,255,.15)"; c.fillRect(70, 622, 220, 8);
  c.fillStyle = "#7dffb0"; c.fillRect(70, 622, 220 * prg, 8);

  const E = enemigoDe(niv.tier);
  for (const e of S.enem) dibujarEnemigo(c, e, E.color);

  // balas
  c.fillStyle = niv.arma.color; c.strokeStyle = niv.arma.color; c.lineWidth = 3; c.lineCap = "round";
  c.beginPath();
  for (const b of S.balas) { c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * 1.6, b.y - b.vy * 1.6); }
  c.stroke();
  c.fillStyle = "#ff5a4a";
  for (const b of S.malas) { c.beginPath(); c.arc(b.x, b.y, 4.5, 0, 6.283); c.fill(); c.fillStyle = "#ffd0c8"; c.beginPath(); c.arc(b.x, b.y, 1.8, 0, 6.283); c.fill(); c.fillStyle = "#ff5a4a"; }

  dibujarNave(c);

  for (const q of part) { c.globalAlpha = Math.max(0, q.v); c.fillStyle = q.col; c.fillRect(q.x - 1.5, q.y - 1.5, 3, 3); }
  c.globalAlpha = 1;

  // rótulos
  c.fillStyle = "rgba(255,255,255,.85)"; c.font = "700 13px system-ui, sans-serif"; c.textAlign = "center";
  c.fillText(titulo, W / 2, Y_BASE + 18);
  if (espera > 0) {
    c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 230, W, aviso ? 120 : 90);
    c.fillStyle = "#fff"; c.font = "800 26px system-ui, sans-serif"; c.fillText(libreNombre ? "Modo libre · " + libreNombre : "Nivel " + nn, W / 2, 270);
    c.font = "600 14px system-ui, sans-serif"; c.fillText(E.nombre + " · tier " + niv.tier, W / 2, 296);
    c.fillStyle = "#7dffb0"; c.fillText("Arma: " + armaDe(prog.arma).nombre, W / 2, 318);
    if (aviso) { c.fillStyle = "#ffd36b"; c.font = "700 12px system-ui, sans-serif"; c.fillText(aviso, W / 2, 342); }
  }
  c.restore();
  c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 2; marco(c); c.stroke();
}
// Rectángulo redondeado del campo (sin roundRect, que no existe en celulares viejos)
function marco(c) {
  const r = 14;
  c.beginPath(); c.moveTo(r, 0); c.arcTo(W, 0, W, H, r); c.arcTo(W, H, 0, H, r); c.arcTo(0, H, 0, 0, r); c.arcTo(0, 0, W, 0, r); c.closePath();
}

function dibujarNave(c) {
  if (S.inv > 0 && ((S.inv / 6) | 0) % 2) return; // parpadea al ser golpeada
  const x = S.x, y = Y_NAVE, col = armaDe(prog.arma).color;
  c.save(); c.translate(x, y);
  const llama = 6 + ((tiempo >> 1) % 3) * 2;
  c.fillStyle = "#ffb020"; c.beginPath(); c.moveTo(-5, 10); c.lineTo(0, 12 + llama); c.lineTo(5, 10); c.closePath(); c.fill();
  c.fillStyle = "#dfe6f5"; c.strokeStyle = "#0b1030"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -18); c.lineTo(14, 12); c.lineTo(6, 8); c.lineTo(0, 13); c.lineTo(-6, 8); c.lineTo(-14, 12); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = col; c.beginPath(); c.ellipse(0, -2, 4, 7, 0, 0, 6.283); c.fill();
  c.restore();
}

function dibujarEnemigo(c, e, col) {
  const r = e.r;
  c.save(); c.translate(e.x, e.y);
  c.fillStyle = e.fl > 0 ? "#fff" : col; c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 2;
  if (e.tp === 0) { // zángano: cuerpo redondo con alitas
    c.beginPath(); c.ellipse(-r * 0.9, -r * 0.3, r * 0.6, r * 0.35, -0.5, 0, 6.283); c.ellipse(r * 0.9, -r * 0.3, r * 0.6, r * 0.35, 0.5, 0, 6.283); c.fill();
    c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill(); c.stroke();
  } else if (e.tp === 1) { // zigzag: rombo
    c.beginPath(); c.moveTo(0, r * 1.15); c.lineTo(r, 0); c.lineTo(0, -r * 1.15); c.lineTo(-r, 0); c.closePath(); c.fill(); c.stroke();
  } else if (e.tp === 2) { // rápido: flecha hacia abajo
    c.beginPath(); c.moveTo(0, r * 1.4); c.lineTo(r, -r); c.lineTo(0, -r * 0.4); c.lineTo(-r, -r); c.closePath(); c.fill(); c.stroke();
  } else if (e.tp === 3) { // blindado: hexágono con placa
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
    c.fillStyle = "rgba(0,0,0,.28)"; c.beginPath(); c.arc(0, 0, r * 0.55, 0, 6.283); c.fill();
  } else { // tirador: cuerpo con cañón
    c.fillRect(-3, 0, 6, r + 6); c.strokeRect(-3, 0, 6, r + 6);
    c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill(); c.stroke();
  }
  if (e.tp !== 2) { // ojos
    c.fillStyle = "#fff"; c.beginPath(); c.arc(-r * 0.35, r * 0.1, r * 0.22, 0, 6.283); c.arc(r * 0.35, r * 0.1, r * 0.22, 0, 6.283); c.fill();
    c.fillStyle = e.tp === 4 ? "#d00" : "#111"; c.beginPath(); c.arc(-r * 0.35, r * 0.18, r * 0.1, 0, 6.283); c.arc(r * 0.35, r * 0.18, r * 0.1, 0, 6.283); c.fill();
  }
  if (e.hp < e.hpm) { // barra de vida
    c.fillStyle = "rgba(0,0,0,.6)"; c.fillRect(-r, -r - 7, 2 * r, 4);
    c.fillStyle = "#7dffb0"; c.fillRect(-r, -r - 7, 2 * r * (e.hp / e.hpm), 4);
  }
  c.restore();
}

// ---------- Arranque ----------
ajustar();
mostrarMenu();
