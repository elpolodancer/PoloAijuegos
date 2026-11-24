// Ruta: botellascolores/juego-botellascolores.js
// Botellas de colores: vierte los colores de una botella a otra hasta que cada botella tenga un solo color.
// INICIO CON MAPA (ESTANDARES-juegos.md, sección 13; referencia: 5deslizante): pantalla de inicio (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa · ⚙️ Ajustes) que se ve una sola vez;
// después el MENÚ PRINCIPAL es el mapa solo de países (195 × 20 = 3 900 niveles, sección A-bis). Modo libre (7.2/13.7) y fin de nivel sobre el tablero (6).
import { crear, verter, puedeVerter, resuelto, racha, nivelLibre, caminoCorto, DIFICULTADES_LIBRE } from "./logica-botellascolores.js";
import { BOOSTS, saldo as calcularSaldo, recompensaNivel, unirProgreso, normalizar } from "./economia-botellascolores.js";
import { NIVELES, PALETA, NIVELES_POR_MUNDO } from "./niveles-botellascolores.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { encolarNivel, PUNTOS_PORTAL_POR_NIVEL } from "../compartido/cola-puntos.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";

// ----- Ajustes -----
const ID = "botellas-colores";
const CLAVE = "botellas_progreso_v4"; // { n: nivel más alto pasado (un solo número), s: monedas gastadas, t: fecha }
const CLAVE_V3 = "botellas_progreso_v3"; // versión anterior ({ h: lista de niveles pasados, s, t }): se migra sola al abrir
const CLAVE_V2 = "botellas_progreso_v2"; // versión más anterior (solo la lista de niveles pasados): también se migra
const CLAVE_LIBRE = "botellas_libre_v1"; // Modo libre: última selección y récord por combinación
const ALTO_CAPA = { 3: 34, 4: 32, 5: 30, 6: 27, 7: 24, 8: 22 }; // alto en px de cada capa según la capacidad

// Modo libre: qué se puede elegir (cada fila de botones de la pantalla «♾️ Modo libre»)
const OPC_COLORES = [3, 4, 5, 6, 8, 10];
const OPC_CAPACIDAD = [3, 4, 5, 6, 8];
const dificultadLibre = () => DIFICULTADES_LIBRE.find((d) => d.id === libre.sel.d) || DIFICULTADES_LIBRE[1];

// Mapa solo de países (estándar A-bis): 195 países (México primero) × 20 niveles = 3 900. Viene armado desde el principio, aunque todavía no existan todos los niveles
const ETAPAS = crearEtapas({ porEtapa: NIVELES_POR_MUNDO, soloPaises: true });
const TOTAL = ETAPAS.total;

const $ = (id) => document.getElementById(id);
let hechos = 0;                   // nivel más alto pasado (0 = ninguno); los niveles se abren en orden
let gastado = 0;                  // monedas gastadas en boosts (solo sube)
let nivel = 0;                    // índice del nivel en juego (0 = nivel 1)
let modo = "nivel";               // "nivel" | "libre"
let estado = "inicio";            // "inicio" | "mapa" | "libre-menu" | "jugando" | "fin"
let cap = 3, est = [], hist = [], sel = -1, acabo = false, ocultoAct = false, coloresAct = 0;
let extraUsada = false, revelado = false, pistaAct = null, caminoPista = null; // boosts de este nivel (se reinician al empezar)
let rondas = 0;                   // Modo libre: rondas superadas seguidas en esta sesión
let libre = { sel: { c: 6, cap: 4, d: "f" }, rec: {} };

try { localStorage.removeItem("botellas_progreso"); } catch (e) {} // borra el progreso de la versión anterior
const leerJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
function leer() {
  const v4 = leerJSON(CLAVE);
  const p = normalizar(v4 || leerJSON(CLAVE_V3) || leerJSON(CLAVE_V2)); // acepta las tres versiones guardadas
  hechos = p.n; gastado = p.s;
  if (!v4 && (p.n || p.s)) { guardarLocal(); try { localStorage.removeItem(CLAVE_V3); localStorage.removeItem(CLAVE_V2); } catch (e) {} }
}
let nube = null; // sincronización con la cuenta (se conecta al final; sin internet simplemente no se conecta)
function guardarLocal() { try { localStorage.setItem(CLAVE, JSON.stringify({ n: hechos, s: gastado, t: Date.now() })); } catch (e) {} }
const guardar = () => { guardarLocal(); if (nube) nube.guardado(); };

function leerLibre() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_LIBRE));
    if (v && v.sel) {
      if (OPC_COLORES.includes(v.sel.c)) libre.sel.c = v.sel.c;
      if (OPC_CAPACIDAD.includes(v.sel.cap)) libre.sel.cap = v.sel.cap;
      if (DIFICULTADES_LIBRE.some((x) => x.id === v.sel.d)) libre.sel.d = v.sel.d;
    }
    if (v && v.rec && typeof v.rec === "object") libre.rec = v.rec;
  } catch (e) {}
}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify(libre)); } catch (e) {} };
const comboLibre = () => libre.sel.c + "-" + libre.sel.cap + "-" + libre.sel.d;

// ----- Progreso del mapa: los niveles se abren en orden -----
// hecho = niveles pasados seguidos desde el 1; max = el nivel que sigue (el más alto abierto). Se cuentan sobre ETAPAS.total (22 600), existan o no los niveles.
const nivelActual = () => Math.min(hechos + 1, TOTAL); // número (1, 2, 3…) del nivel donde va el jugador
const progresoMapa = () => ({ max: nivelActual(), hecho: hechos });
const numEnEtapa = (i) => ETAPAS.etapaDe(i + 1).k;

// ----- Monedas: saldo = inicial + lo que dieron los niveles pasados − lo gastado (ver economia-botellascolores.js) -----
const saldo = () => calcularSaldo(hechos, NIVELES, gastado);
function pintarSaldo() {
  const t = String(saldo());
  for (const e of document.querySelectorAll(".num-saldo")) e.textContent = t;
  pintarBoosts();
}

// ----- Aviso breve -----
let tAviso = 0;
function avisar(texto) {
  const a = $("aviso");
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { a.hidden = true; }, 2600);
}

// ----- Navegación y pantallas (sección 13.1 y 13.3) -----
// «pantalla-inicio» (UNA sola vez, al abrir), «pantalla-libre» (opciones del Modo libre), «juego» (una partida) y el MAPA, que se dibuja encima
// de todo y es el MENÚ PRINCIPAL (vista del país donde va el jugador). «Inicio» siempre significa «abrir el mapa».
const btnMenu = $("btn-menu");
let mapaEnPrincipal = true;   // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
function pintarBotonMenu() {
  const enMapa = mapa.abierto(), enPartida = !$("zona").hidden;
  btnMenu.hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);   // ni en el inicio ni en la vista principal del mapa
  const texto = enMapa ? "Atrás" : enPartida && modo === "libre" && estado === "jugando" ? "Pausa" : "Volver al menú principal";
  btnMenu.title = texto; btnMenu.setAttribute("aria-label", texto);
}
// El chip de monedas vive arriba a la derecha (bajo la sesión) y, dentro de una partida, pasa a la izquierda del botón 🗺️ (barra de arriba al centro)
function ubicarMonedas() {
  const chip = $("monedas"), enBarra = !$("barra-nivel").hidden;
  const destino = enBarra ? $("barra-nivel") : document.querySelector(".hud-der");
  chip.hidden = enBarra && modo === "libre";   // el Modo libre no da monedas
  if (chip.parentNode === destino) return;
  if (enBarra) destino.prepend(chip); else destino.insertBefore(chip, $("deshacer"));
}
function mostrar(cual) {   // cual = «pantalla-inicio» | «pantalla-libre» | «juego» | «mapa»
  $("pantalla-inicio").hidden = cual !== "pantalla-inicio";
  $("pantalla-libre").hidden = cual !== "pantalla-libre";
  $("zona").hidden = cual !== "juego";
  if (cual !== "mapa") mapa.cerrar();
  const jugando = cual === "juego";
  $("barra-nivel").hidden = !jugando;
  $("btn-mapa-juego").hidden = modo === "libre";   // el 🗺️ solo en los niveles (el Modo libre no tiene mapa)
  $("cuadros").hidden = !jugando;
  $("deshacer").hidden = !jugando;
  $("boosts").hidden = !(jugando && modo === "nivel");
  $("final").hidden = true;
  $("aviso").hidden = true;
  ubicarMonedas();
  pintarBotonMenu();
}
// n = nivel cuyo país se abre (por defecto, el que toca); alcanzado = true abre la vista del país y se ve subir el agua
function abrirMapa(n, alcanzado) {
  modo = "nivel";
  estado = "mapa";
  mostrar("mapa");
  mapa.abrir(n || nivelActual(), alcanzado);
  pintarBotonMenu();
}

// ----- Mapa de niveles estándar de un solo país (compartido/mapa-niveles.js, modo soloPaises + unPais) -----
function jugarNivel(n) { // n = número del nivel (1, 2, 3…)
  if (!(n >= 1 && n <= TOTAL) || n > hechos + 1) return;   // los niveles se abren en orden
  if (!NIVELES[n - 1]) { avisar("🚧 Los niveles todavía no están creados"); return; }
  jugar(n - 1);
}
const mapa = montarMapa({
  prefijo: "botellas",
  etapas: ETAPAS,
  unPais: true,        // se abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,         // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (hechos === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => irLibre() }],   // el Modo libre también se abre desde el mapa
  alInfo: () => abrirInfo(),
  avisoPrincipal: () => (NIVELES.length ? "" : "🚧 Los niveles todavía no están creados"),
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },   // el ☰ se rotula según la vista
  progreso: progresoMapa,
  jugarNivel,
  infoNivel: (n) => (NIVELES[n - 1] ? { sub: n <= hechos ? "✓" : "", aria: n <= hechos ? "pasado" : "" } : { sub: "🚧", aria: "todavía no está creado" }),
});

// ----- Info («Cómo se juega») -----
let infoFondo = null;
function abrirInfo() {
  if (!infoFondo) {
    infoFondo = document.createElement("div");
    infoFondo.className = "pausa-fondo";
    infoFondo.hidden = true;
    infoFondo.setAttribute("role", "dialog");
    infoFondo.setAttribute("aria-modal", "true");
    infoFondo.setAttribute("aria-label", "Cómo se juega");
    const panel = document.createElement("div");
    panel.className = "pausa-panel";
    const h = document.createElement("h2");
    h.textContent = "ℹ️ Cómo se juega";
    panel.appendChild(h);
    for (const t of [
      "Toca una botella para elegirla y luego otra para verter en ella el color de arriba (con todas las capas seguidas del mismo color).",
      "Solo puedes verter sobre una botella vacía o sobre una cuyo color de arriba sea el mismo, y si tiene lugar.",
      "Ganas cuando cada botella tiene un solo color (llena) o está vacía. ↩ deshace tu último movimiento.",
      "En los niveles de niebla (🌫️) solo se ve el color de arriba de cada botella; las demás capas aparecen como «?».",
      "Los niveles se abren en orden y, la primera vez que los pasas, dan 1 punto y monedas (más en los difíciles). Con las monedas compras boosts: 💡 Pista (te muestra un vertido que sí sirve), 👁️ Ver niebla y 🍾 Botella extra (una por nivel).",
      "El ♾️ Modo libre no da puntos ni monedas y no tiene boosts: solo guarda tu récord. Tiene 5 dificultades: cambian las botellas vacías y si hay niebla.",
    ]) {
      const p = document.createElement("p");
      p.style.cssText = "margin:0 0 10px;font-size:.9rem;line-height:1.35;text-align:left;color:#d6d9e0";
      p.textContent = t;
      panel.appendChild(p);
    }
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "b3d txt b-verde";
    ok.style.cssText = "width:100%;margin-top:6px";
    ok.textContent = "Entendido";
    ok.addEventListener("click", cerrarInfo);
    panel.appendChild(ok);
    infoFondo.appendChild(panel);
    infoFondo.addEventListener("click", (e) => { if (e.target === infoFondo) cerrarInfo(); });
    document.body.appendChild(infoFondo);
    infoFondo.okBtn = ok;
  }
  infoFondo.hidden = false;
  try { infoFondo.okBtn.focus({ preventScroll: true }); } catch (e) {}
}
function cerrarInfo() { if (infoFondo) infoFondo.hidden = true; }
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && infoFondo && !infoFondo.hidden) { e.preventDefault(); e.stopPropagation(); cerrarInfo(); }
}, true);

// ----- Modo libre (13.7): pantalla de opciones, sin niveles. Dificultad (5 emojis) primero; debajo, colores y capacidad -----
function irLibre() {
  estado = "libre-menu";
  modo = "libre";
  mostrar("pantalla-libre");
  pintarLibre();
}
function filaOpciones(id, opciones, actual, alElegir) {   // opciones = [valor, texto, nombre opcional (title y aria-label)]
  const cont = $(id);
  cont.replaceChildren();
  for (const [valor, texto, nombre] of opciones) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (valor === actual ? "b-oro on" : "b-cielo");
    b.setAttribute("aria-pressed", String(valor === actual));
    if (nombre) {
      const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = texto;
      b.appendChild(ico);
      b.title = nombre; b.setAttribute("aria-label", nombre);
    } else b.textContent = texto;
    b.addEventListener("click", () => { alElegir(valor); guardarLibre(); pintarLibre(); });
    cont.appendChild(b);
  }
}
function pintarLibre() {
  const dif = (d) => { const i = d.texto.indexOf(" "); return [d.id, d.texto.slice(0, i), d.texto.slice(i + 1)]; };   // «😁 Muy fácil» → emoji y nombre
  filaOpciones("g-dificultad", DIFICULTADES_LIBRE.map(dif), libre.sel.d, (v) => { libre.sel.d = v; });
  filaOpciones("g-colores", OPC_COLORES.map((v) => [v, String(v)]), libre.sel.c, (v) => { libre.sel.c = v; });
  filaOpciones("g-capacidad", OPC_CAPACIDAD.map((v) => [v, String(v)]), libre.sel.cap, (v) => { libre.sel.cap = v; });
  $("dif-nombre").textContent = dificultadLibre().texto;
  $("notaLibre").textContent = dificultadLibre().nota;
  const r = libre.rec[comboLibre()] || 0;
  $("recordLibre").textContent = "🏆 Récord: " + r + (r === 1 ? " ronda seguida" : " rondas seguidas");
}
function jugarLibre() {
  modo = "libre";
  rondas = 0;
  nuevaRonda();
}
function nuevaRonda() {
  const s = libre.sel, d = dificultadLibre();
  empezar(nivelLibre({ colores: s.c, capacidad: s.cap, vacias: d.vacias, oculto: d.oculto }));
}

// ----- Partida -----
function jugar(i) { // un nivel del mapa (i = índice, 0 = nivel 1)
  modo = "nivel";
  nivel = i;
  empezar(NIVELES[i]);
}
function empezar(n) {
  cap = n.capacidad;
  ocultoAct = !!n.oculto; // modo niebla: solo se ve el color de arriba
  est = crear(n);
  hist = [];
  sel = -1;
  acabo = false;
  extraUsada = false; revelado = false; pistaAct = null; caminoPista = null;
  coloresAct = n.colores;
  estado = "jugando";
  mostrar("juego");
  pintarNombre();
  pintar();
  pintarBoosts();
  encajar();
}

// Achica las botellas lo necesario para que quepan en la pantalla sin hacer scroll
function encajar() {
  const z = document.querySelector(".zona"), m = $("mesa");
  let a = ALTO_CAPA[cap] || 24;
  m.style.setProperty("--alto", a + "px");
  while (z.scrollHeight > z.clientHeight + 1 && a > 14) { a -= 2; m.style.setProperty("--alto", a + "px"); }
}
addEventListener("resize", () => { if (!$("juego").hidden) { encajar(); colocarFinal(); } });
document.querySelector(".zona").addEventListener("scroll", () => colocarFinal(), { passive: true });

// Nombre del botón verde de arriba («Nivel 3 · México»; en Modo libre «♾️ Modo libre 😐»; sin el tamaño)
function pintarNombre() {
  const t = modo === "libre" ? "♾️ Modo libre " + dificultadLibre().texto.split(" ")[0] : "Nivel " + numEnEtapa(nivel) + " · " + ETAPAS.nombreEtapa(nivel + 1);
  $("nombre-nivel").textContent = t;
  $("barra-juego").setAttribute("aria-label", t);
}
// Los tres cuadros azules: Movimientos (los que valen ahora: ↩ resta uno) · Botellas listas · Tipo de nivel (en Modo libre, la ronda)
const NOMBRE_TIPO = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };
const estaLista = (b) => b.length === cap && b.every((v) => v === b[0]);
function pintarDatos() {
  $("movs").textContent = hist.length;
  $("listas").textContent = est.filter(estaLista).length + "/" + coloresAct;
  $("rot-tercero").textContent = modo === "libre" ? "Ronda" : "Tipo";
  $("val-tercero").textContent = modo === "libre" ? rondas + 1 : NOMBRE_TIPO[(NIVELES[nivel] || {}).tipo] || "Normal";
}

function pintar() {
  const niebla = ocultoAct && !revelado ? "🌫️ Niebla: solo ves el color de arriba" : "";
  $("pista").textContent = modo === "libre" ? "🏆 Récord: " + (libre.rec[comboLibre()] || 0) + (niebla ? " · " + niebla : "") : niebla;
  pintarDatos();
  const m = $("mesa");
  m.innerHTML = "";
  m.style.setProperty("--cap", cap);
  est.forEach((b, i) => {
    const d = document.createElement("div");
    d.className = "bot" + (i === sel ? " sel" : "") + (b.length === cap && b.every((v) => v === b[0]) ? " lista" : "") +
      (pistaAct && i === pistaAct.o ? " pista-o" : "") + (pistaAct && i === pistaAct.d ? " pista-d" : "");
    const cuello = document.createElement("div");
    cuello.className = "cuello";
    const cuerpo = document.createElement("div");
    cuerpo.className = "cuerpo";
    const visibles = racha(b); // las capas del mismo color que la de arriba se ven juntas
    b.forEach((v, k) => {
      const s = document.createElement("div");
      s.className = "seg";
      if (ocultoAct && !revelado && k < b.length - visibles) {
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
  if (acabo || estado !== "jugando") return;
  if (sel < 0) {
    if (est[i].length) sel = i;
  } else if (sel === i) {
    sel = -1;
  } else if (puedeVerter(est[sel], est[i], cap)) {
    hist.push(est.map((b) => b.slice()));
    // si hizo justo el vertido de la pista, la pista siguiente sigue el mismo camino; si no, se vuelve a calcular
    caminoPista = caminoPista && caminoPista.length && caminoPista[0][0] === sel && caminoPista[0][1] === i ? caminoPista.slice(1) : null;
    pistaAct = null;
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
  if (acabo || estado !== "jugando" || !hist.length) return;
  est = hist.pop();
  sel = -1;
  pistaAct = null; caminoPista = null;
  pintar();
}

// ----- Boosts (solo en los niveles del mapa; se pagan al usarlos) -----
function pintarBoosts() {
  const cont = $("boosts");
  if (!cont.children.length) { // se crean una sola vez
    for (const [id, def] of Object.entries(BOOSTS)) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.boost = id;
      const ico = document.createElement("span"); ico.className = "b-ico"; ico.textContent = def.icono;
      const info = document.createElement("span"); info.className = "b-info";
      const m = document.createElement("span"); m.className = "moneda"; m.style.cssText = "font-size:11px;margin-right:4px;vertical-align:-1px";
      info.append(m, document.createTextNode(String(def.precio)));
      b.append(ico, info);
      b.addEventListener("click", () => usarBoost(id));
      cont.appendChild(b);
    }
  }
  const s = saldo();
  for (const b of cont.children) {
    const id = b.dataset.boost, def = BOOSTS[id];
    const no = s < def.precio || (id === "botella" && extraUsada) || (id === "niebla" && (!ocultoAct || revelado));
    b.className = "b3d " + (no ? "b-gris" : def.clase);
    const t = def.nombre + " (" + def.precio + " monedas): " + def.ayuda;
    b.title = t; b.setAttribute("aria-label", t);
  }
}
function cobrar(precio) {
  gastado += precio;
  guardar();
  pintarSaldo();
}
function usarBoost(id) {
  if (modo !== "nivel" || estado !== "jugando" || acabo) return;
  const def = BOOSTS[id];
  if (id === "botella" && extraUsada) return avisar("Ya usaste la botella extra en este nivel");
  if (id === "niebla" && !ocultoAct) return avisar("Este nivel no tiene niebla");
  if (id === "niebla" && revelado) return avisar("Ya estás viendo todas las capas");
  if (saldo() < def.precio) return avisar("Te faltan " + (def.precio - saldo()) + " monedas para " + def.nombre.toLowerCase());
  sel = -1;
  if (id === "pista") {
    if (!pistaAct) { // si ya se está viendo una pista, no se cobra otra vez
      let m = caminoPista && caminoPista.length ? caminoPista[0] : null;
      if (!m) { const c = caminoCorto(est, cap); if (c && c.length) { caminoPista = c; m = c[0]; } }
      if (!m) return avisar("Con lo que llevas ya no hay solución: deshaz movimientos o sal del nivel y vuelve a entrar");
      pistaAct = { o: m[0], d: m[1] };
      cobrar(def.precio);
    }
  } else if (id === "niebla") {
    revelado = true;
    cobrar(def.precio);
  } else if (id === "botella") {
    extraUsada = true;
    est.push([]);
    hist = hist.map((h) => [...h, []]); // deshacer no quita la botella extra
    caminoPista = null; pistaAct = null;
    cobrar(def.precio);
  }
  pintar();
}

// ----- Fin de nivel o de ronda: ventana «sobre el tablero» (sección 6) -----
// Se coloca sobre el rectángulo de la mesa, recortado a la ventana (si casi no se ve, ocupa toda la ventana)
function colocarFinal() {
  const f = $("final");
  if (f.hidden) return;
  const r = $("mesa").getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const ancho = Math.max(r.width, 280), alto = Math.max(r.height, 250); // un mínimo para que quepan texto y botones
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let l = Math.max(0, cx - ancho / 2), t = Math.max(0, cy - alto / 2);
  let w = Math.min(ancho, W - l), h = Math.min(alto, H - t);
  if (w < 160 || h < 160 || r.bottom < 0 || r.top > H) { l = 0; t = 0; w = W; h = H; }
  Object.assign(f.style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
}
function mostrarFinal(titulo, detalle, textoSiguiente, { sinSiguiente = false, libreFin = false } = {}) {
  $("textoFinal").textContent = titulo;
  $("detalleFinal").textContent = detalle;
  $("siguiente").textContent = textoSiguiente;
  $("siguiente").hidden = sinSiguiente;
  $("repetir").hidden = libreFin;                                      // en Modo libre repetir sería la misma ronda sin costo
  $("finNiveles").textContent = libreFin ? "⚙️ Cambiar tablero" : "🗺️ Mapa";
  $("final").hidden = false;
  colocarFinal();
  requestAnimationFrame(colocarFinal);
}

async function ganar() {
  acabo = true;
  estado = "fin";
  pintarBotonMenu();
  if (modo === "libre") {
    rondas++;
    pintarDatos();
    const c = comboLibre();
    if (rondas > (libre.rec[c] || 0)) { libre.rec[c] = rondas; guardarLibre(); }
    mostrarFinal("🎉 ¡Ronda " + rondas + " superada!", "🏆 Récord: " + libre.rec[c], "Siguiente ronda ▶", { libreFin: true });
    return;
  }
  const n = nivel + 1;                       // número del nivel (1, 2, 3…)
  const primera = n > hechos;                // los niveles se abren en orden: pasar el siguiente sube «hechos» a n
  if (primera) { hechos = n; guardar(); pintarSaldo(); }
  const ultimo = n === TOTAL;
  const cierraEtapa = n % NIVELES_POR_MUNDO === 0;
  mostrarFinal(
    ultimo ? "🎉 ¡Completaste todos los niveles!" : cierraEtapa ? "🎉 ¡Terminaste " + ETAPAS.nombreEtapa(n) + "!" : "🎉 ¡Nivel " + numEnEtapa(nivel) + " resuelto!",
    primera ? "+" + PUNTOS_PORTAL_POR_NIVEL + " punto · +" + recompensaNivel(NIVELES[nivel]) + " monedas" : "Ya lo habías pasado: no da monedas ni puntos",
    cierraEtapa ? "Ver el mapa ▶" : "Siguiente nivel ▶",
    { sinSiguiente: ultimo }
  );
  if (primera) {
    encolarNivel(ID); // 1 punto de portal por nivel, solo la primera vez (sección 12); se envía al perfil cuando haya internet y sesión
    try { (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  }
}

// ----- Ventanas de pausa (compartido/menu-pausa.js). No hay reloj que congelar -----
// Niveles (botón verde del nombre, 🗺️ o ☰): «¿Salir?» · Seguir jugando / Salir al mapa.   Modo libre (☰ o el botón verde): Pausa · Seguir jugando / Salir a elegir tablero.
const pausaSalir = crearMenuPausa({
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este nivel.",
  puedeAbrir: () => estado === "jugando" && modo === "nivel" && !$("zona").hidden,
  alSalir: () => abrirMapa(nivel + 1),
});
const pausaLibre = crearMenuPausa({
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: "La partida termina; se guarda cuántas rondas superaste.",
  puedeAbrir: () => estado === "jugando" && modo === "libre" && !$("zona").hidden,
  alSalir: () => irLibre(),
});
$("barra-juego").addEventListener("click", () => (modo === "libre" ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir());   // 🗺️: pregunta «¿Salir?» y, si se confirma, abre el mapa

// ☰: vista interna del mapa → «Atrás» (a la vista del país) · partida de Modo libre → Pausa · nivel → «¿Salir?» · opciones del Modo libre o fin de nivel → el mapa
btnMenu.addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else if (!$("zona").hidden && estado === "jugando") (modo === "libre" ? pausaLibre : pausaSalir).abrir();
  else if (!$("zona").hidden && modo === "libre") irLibre();   // acabó una ronda del Modo libre
  else abrirMapa(modo === "nivel" && !$("zona").hidden ? nivel + 1 : undefined);
});

// ----- Botones de la pantalla de inicio y de las demás pantallas -----
// Jugar = el nivel que toca; mientras no se haya pasado ninguno abre el mapa en el nivel 1 (con «▶ Jugar» en el centro del país)
$("btn-inicio-jugar").addEventListener("click", () => { if (hechos === 0) abrirMapa(1); else jugarNivel(nivelActual()); });
$("btn-inicio-libre").addEventListener("click", irLibre);
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-inicio-ajustes").addEventListener("click", () => abrirAjustes());
$("jugarLibre").addEventListener("click", jugarLibre);
$("deshacer").addEventListener("click", deshacer);
$("repetir").addEventListener("click", () => jugar(nivel));
$("finNiveles").addEventListener("click", () => (modo === "libre" ? irLibre() : abrirMapa(nivel + 1)));
$("siguiente").addEventListener("click", () => {
  if (modo === "libre") return nuevaRonda();
  const n = nivel + 1;
  if (n % NIVELES_POR_MUNDO === 0) return abrirMapa(n, true);        // terminó el país: vuelve al mapa y se ve subir el agua
  if (n + 1 > NIVELES.length) return avisar("🚧 Los niveles todavía no están creados");
  jugarNivel(n + 1);
});

// ----- Instalar SOLO este juego (manifest-botellascolores.webmanifest + sw-botellascolores.js; no baja ningún otro juego del portal) -----
// ES_APP_SOLA = abierto desde SU PROPIO ícono instalado (start_url trae «?app=1»; se recuerda en sessionStorage por si se recarga). Ahí el portal no existe:
// se oculta 🎮 (llevaría fuera del alcance de la app). Abierto dentro de la app del portal o en el navegador, todo sigue como siempre.
const enAppInstalada = () => matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
const ES_APP_SOLA = (() => {
  try { if (new URLSearchParams(location.search).has("app")) sessionStorage.setItem("botellas_app", "1"); } catch (e) {}
  let marca = false; try { marca = sessionStorage.getItem("botellas_app") === "1"; } catch (e) {}
  return marca && enAppInstalada();
})();
if (ES_APP_SOLA) $("btn-portal").hidden = true;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw-botellascolores.js", { scope: "./" }).catch(() => {});

const yaEnApp = enAppInstalada();
let eventoInstalar = (window.__pwa && window.__pwa.evento) || null;
let notaInstalar = () => {};                      // la fija la ventana de Ajustes mientras está abierta (muestra el mensaje ahí dentro)
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); eventoInstalar = e; });
addEventListener("appinstalled", () => { eventoInstalar = null; notaInstalar("✅ Listo: busca «Botellas» en tu pantalla de inicio."); });
async function instalarJuego() {
  if (eventoInstalar) { const e = eventoInstalar; eventoInstalar = null; e.prompt(); await e.userChoice.catch(() => {}); return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const otraApp = /FBAN|FBAV|Instagram|WhatsApp|MicroMessenger|TikTok|Snapchat|Line\/|; wv\)/i.test(navigator.userAgent);
  notaInstalar(ios ? "En iPhone/iPad: toca Compartir (el cuadro con la flecha) y luego «Agregar a pantalla de inicio»."
    : otraApp ? "Estás en el navegador interno de otra app (WhatsApp, Facebook, Instagram…) y ahí no se puede instalar. Toca ⋮ y elige «Abrir en Chrome»."
    : "Abre el menú de Chrome (⋮) y elige «Instalar aplicación» o «Agregar a la pantalla de inicio». Si no aparece, comprueba que no estés en modo incógnito y que Chrome esté actualizado.");
}

// ----- ⚙️ Ajustes (13.8): ventana con el estilo de la pausa. 🌙/☀️ y ⛶ siguen en sus esquinas de siempre -----
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Ajustes");
  const panel = el("div", "pausa-panel aj-panel");
  const msg = el("p", "aj-nota"); msg.setAttribute("role", "status"); msg.hidden = true;   // mensajes de «Instalar» (iPhone, otra app, sin permiso…)
  const lista = el("div", "pausa-opciones");
  notaInstalar = (t) => { msg.textContent = t; msg.hidden = !t; };
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true); notaInstalar = () => {}; ajustesAbierto = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(); });
  const boton = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    if (icono) b.append(el("span", "b-ico", icono));
    b.append(el("span", "", texto));
    b.addEventListener("click", fn);
    lista.appendChild(b);
    return b;
  };
  if (!yaEnApp) boton("📲", "Instalar solo este juego", "b-azulmarino", instalarJuego);   // ya dentro de una app instalada no tiene sentido ofrecerlo
  boton("💾", "Copia de seguridad", "b-oro", async () => {
    cerrar();
    try { (await import("../compartido/almacen.js")).abrirPanelCopias(); } catch (e) { avisar("No se pudo abrir la copia de seguridad"); }
  });
  boton("", "Cerrar", "b-cielo", () => cerrar());
  panel.append(el("h2", "", "⚙️ Ajustes"), msg, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (e) {}
}

// ----- 👤 Sesión (arriba a la derecha). Carga compartido/jugador.js con import() dinámico: el juego funciona sin internet -----
// Sin sesión: tocar el chip abre el acceso con Google. Con sesión: dos toques seguidos la cierran (sin confirm(), todo dentro de la página).
let jug = null, usuario = null, tSalir = 0;
function pintarSesion() {
  const nombre = usuario ? (usuario.displayName || "Jugador").split(" ")[0] : "";
  $("sesion").textContent = usuario ? "👤 " + nombre : "👤 Iniciar sesión";
  $("sesion").title = usuario ? "Sesión iniciada como " + nombre + ". Toca dos veces para cerrarla" : "Iniciar sesión con Google";
}
async function tocarSesion() {
  if (!jug) return avisar("No se pudo cargar el inicio de sesión. Revisa tu conexión");
  if (!usuario) {
    try { await jug.entrar(); } catch (e) { avisar("No se pudo iniciar sesión"); }
    return;
  }
  if (tSalir) {
    clearTimeout(tSalir); tSalir = 0;
    try { await jug.salir(); } catch (e) {}
    return;
  }
  $("sesion").textContent = "¿Cerrar sesión?";
  tSalir = setTimeout(() => { tSalir = 0; pintarSesion(); }, 3000);
}
$("sesion").addEventListener("click", tocarSesion);
$("sesion").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocarSesion(); } });
import("../compartido/jugador.js").then((m) => {
  jug = m;
  m.alCambiarSesion((u) => { usuario = u; pintarSesion(); });
}).catch(() => {});

// ----- Arranque: la pantalla de inicio se ve una sola vez (al abrir el juego o recargar) -----
leer();
leerLibre();
pintarSaldo();
mostrar("pantalla-inicio");

// Sincroniza el progreso con la cuenta de Google (une lo local con lo de la nube: gana el nivel más alto pasado y lo gastado más alto)
import("../compartido/progreso.js").then((m) => {
  nube = m.conectar(ID, {
    clave: CLAVE,
    fusionar: (a, b) => unirProgreso(a, b),
    alCambiar: (v) => { const p = normalizar(v); hechos = p.n; gastado = p.s; pintarSaldo(); mapa.refrescar(); },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo (también deja la copia en el formato nuevo)
}).catch(() => {});
