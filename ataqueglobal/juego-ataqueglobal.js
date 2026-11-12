// Ruta: ataqueglobal/juego-ataqueglobal.js
// Ataque Global (id de puntos «ataqueglobal»): guerra de misiles sobre el mapa del mundo. Plan completo en README-ataqueglobal.md.
// ESTADO ACTUAL (fase 1): menú principal, el mundo como GLOBO 3D con giro, zoom y países seleccionables, y el mapa de niveles estándar.
// Todavía NO hay bots que jueguen: Fácil/Normal/Difícil abren el mundo (la dificultad queda guardada en «dificultad»), y los niveles muestran un aviso.
// BOTONES DE ATAQUE (armas-ataqueglobal.js): 💀 apunta todos los misiles (niveles 1, 2 y 3) y ✈ solo los de nivel 1; se elige el objetivo, se confirma y salen únicamente los que alcanzan.
// MENÚ CIRCULAR: al tocar un país TUYO salen Expandir (si hay vecinos libres), Misil nivel 1 e Investigar (menu-pais-ataqueglobal.js); las 8 mejoras están en investigacion-ataqueglobal.js.
// NIEBLA DE GUERRA: TODA partida empieza con el planeta tapado por una niebla negra y solo se ve el 10 % alrededor del país propio (ver VISION).
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearMundo, nombreTerritorio, banderaTerritorio, vecinosDe, centroTerritorio, radioTerritorio, distanciaAngular } from "./mapa-ataqueglobal.js";
import { crearArmas } from "./armas-ataqueglobal.js";
import { crearMenuPais, mmss } from "./menu-pais-ataqueglobal.js";
import { MEJORAS, SUPERARMAS, estadoMejora, faltan, basicasCompletas, porNumero } from "./investigacion-ataqueglobal.js";
// EE. UU. (US1–US5), Canadá (CA1–CA9) y Rusia (RU1–RU7) son varios territorios cada uno: ver DIVISIONES en paises-ataqueglobal.js.

const ID = "ataqueglobal";
const CLAVE_PROGRESO = "ataqueglobal_progreso_v1"; // { max: nivel más alto abierto, hecho: nivel más alto terminado }
const POR_ETAPA = 100;                             // niveles por estado de México y por país
const DIFICULTADES = { facil: "Fácil", normal: "Normal", dificil: "Difícil" };

// Niebla de guerra: fracción de la superficie del planeta que se ve alrededor de cada país propio.
// Posición 0 = inicio de TODA partida (10 %); 1 = «Inteligencia mejorada» (50 %); 2 = «Inteligencia superior» (100 %, sin niebla).
const VISION = [0.10, 0.50, 1];

// Colores. TU país: amarillo brillante (con resplandor y filo blanco en el mapa): ningún bot lo usa.
const COLOR_JUGADOR = "#fff23a";
// Hasta 15 bots, cada uno con su color propio (revisados para que se distingan entre sí, de tu amarillo y del verde de la tierra).
const BOTS_MIN = 1, BOTS_MAX = 15, BOTS_INICIAL = 3, CLAVE_BOTS = "ataqueglobal_bots";
const COLORES_BOTS = ["#ff3b30", "#ff8a1f", "#a24dff", "#ff5fb0", "#2f7bff", "#f4f4f4", "#19e0c0", "#b3173f", "#8fd8ff", "#e11bd6", "#b5702f", "#9aa7b4", "#1d84c9", "#ff9a9a", "#d9a0ff"];
// PROVISIONAL: país inicial de cada bot (de los más cercanos a México a los más lejanos) mientras no existan los niveles y el grafo de vecindad.
// Sobran 3 por si el jugador empieza en uno de ellos. EE. UU., Canadá y Rusia entran con UNA de sus divisiones (un bot nace en una sola parte del país).
const PAISES_BOTS = ["US2", "CU", "CO", "CA5", "BR", "AR", "ES", "EG", "NG", "ZA", "RU1", "IN", "CN", "JP", "AU", "FR", "DE", "PE"];
// PROVISIONAL: país con el que se empieza mientras no existan los niveles ni el grafo de vecindad (fácil = 3 países propios, difícil = 1; ver README).
const PAISES_INICIALES = { facil: ["MX"], normal: ["MX"], dificil: ["MX"] };

// Tiempos (README 5.1 y 5.2). Con «?rapido» en la dirección duran la décima parte, para probar sin esperar un minuto por mejora.
const TIEMPO = new URLSearchParams(location.search).has("rapido") ? 0.1 : 1;
const MS_EXPANDIR = 25000, MS_MISIL1 = 5000, MISILES_INICIALES = 2; // capacidad máxima por país: pendiente (README 9.2), por ahora sin tope
// Alcance de cada nivel de misil, como fracción de la superficie del planeta (igual que la niebla: 50 % = un hemisferio, 90° desde el país que lo lanza).
// ❓ Nivel 1 «corto» no tiene número en el README: se usa el 10 % provisional. Nivel 3: README dice 66 % y también «todo el mundo» (duda 1).
const ALCANCE = { 1: 0.10, 2: 0.50, 3: 0.66 };
const gradosDeAlcance = (f) => (Math.acos(1 - 2 * f) * 180) / Math.PI;
const MS_VUELO = 5000, ESCALONADO_MS = 160;  // un misil tarda 5 s en caer (README 5.3, «cálculo avanzado»); varios salen con un pequeño desfase
const PV_PAIS = 2, DANO_CENTRO = 1, DANO_BORDE = 2 / 3, BORDE = 0.6; // un país cae con 2 misiles en el centro o 3 en el borde (README 5.2); «borde» = más allá del 60 % de su radio (provisional)

const $ = (id) => document.getElementById(id);
const menu = $("menu"), lienzo = $("mundo"), btnMenu = $("btn-menu"), txtMenu = $("txt-menu");
const hud = $("hud"), chipModo = $("chip-modo"), zoom = $("zoom"), ficha = $("ficha"), velo = $("velo");

let pantalla = "menu";      // menu | mundo | niveles
let dificultad = "normal";  // se usará cuando existan los bots (ver README, sección de dificultades)
let nivelVision = 0;        // índice en VISION: sube con las mejoras de Inteligencia
let propios = [];           // países del jugador (de aquí sale lo que se ve bajo la niebla)
let pausado = false;        // el reloj de las acciones se detiene mientras está abierto el menú de pausa
let menuPais = null;        // menú circular (se crea más abajo, después del mundo)
const ocupado = new Map();  // iso → { texto, total, resta, alTerminar }: un país hace UNA cosa a la vez (expandir, fabricar o investigar)
const misiles = new Map();  // iso → [misiles nivel 1, nivel 2, nivel 3] guardados (si no está, tiene MISILES_INICIALES de nivel 1)
const golpes = new Map();   // iso → puntos de impacto recibidos
const destruidos = new Set();
let apuntando = null;       // { tipo: "todos" | "n1", objetivo: { iso, lon, lat } | null } mientras se elige a dónde disparar
let armas = null;           // botones de ataque (se crean más abajo)
const reservados = new Set(); // países hacia los que ya se está expandiendo
const hechas = new Set();   // números de las mejoras ya investigadas
const enCurso = new Map();  // número de la mejora → país que la está investigando
const duenos = new Map();   // iso → { tipo: "jugador" | "bot", n, color }: de quién es cada país (para la ficha)
function leerBots() { try { const n = Math.floor(Number(localStorage.getItem(CLAVE_BOTS))); return n >= BOTS_MIN && n <= BOTS_MAX ? n : BOTS_INICIAL; } catch (e) { return BOTS_INICIAL; } }
let nBots = leerBots();     // enemigos de la partida (1 a 15), se recuerda en el aparato

// ---------- Progreso de niveles (local; todavía sin sincronizar con la cuenta) ----------
function leerProgreso() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_PROGRESO));
    const hecho = Math.max(0, Math.floor(Number(p && p.hecho)) || 0);
    return { hecho, max: Math.max(hecho + 1, Math.floor(Number(p && p.max)) || 1) };
  } catch (e) { return { hecho: 0, max: 1 }; }
}

// ---------- El mundo ----------
const mundo = crearMundo({
  lienzo,
  congelado: () => pausado, // los misiles en vuelo se detienen con la pausa
  alCuadro: () => { if (menuPais) menuPais.seguir(); if (armas) armas.seguir(); }, // el menú circular y la confirmación siguen al país mientras se gira el planeta
  alSeleccionar(iso) {
    pintarFicha(iso);
    if (!menuPais) return;
    menuPais.cerrarPanel();
    const d = iso && duenos.get(iso);
    if (d && d.tipo === "jugador") menuPais.abrir(iso); else menuPais.cerrar(); // otro país tuyo: se pliega el menú abierto y se abre el de este
  },
});
function pintarFicha(iso) {
  ficha.hidden = !iso;
  if (!iso) return;
  $("ficha-bandera").textContent = banderaTerritorio(iso);
  $("ficha-nombre").textContent = nombreTerritorio(iso);
  const d = duenos.get(iso);
  $("ficha-sub").textContent = d ? (d.tipo === "jugador" ? "Tu país" : "Enemigo " + d.n) : "Toca otra vez para soltarlo";
  ficha.style.borderColor = d ? d.color : ""; // el borde de la ficha lleva el color del dueño
}
$("z-mas").addEventListener("click", () => mundo.zoom(1.6));
$("z-menos").addEventListener("click", () => mundo.zoom(1 / 1.6));
$("z-todo").addEventListener("click", () => mundo.reiniciarVista());

// ---------- Pausa (dentro del mundo) ----------
const pausa = crearMenuPausa({
  boton: btnMenu,
  puedeAbrir: () => { if (pantalla !== "mundo") return false; if (menuPais) menuPais.cerrarPanel(); return true; },
  alAbrir: () => { pausado = true; },
  alContinuar: () => { pausado = false; },
  extras: () => [{ icono: "🌍", texto: "Ver todo el mundo", clase: "b-azul", alElegir: () => { pausado = false; mundo.reiniciarVista(); } }],
  alSalir: () => mostrarMenu(),
});

// ---------- Mapa de niveles estándar (compartido/mapa-niveles.js) ----------
const etapas = crearEtapas({ porEtapa: POR_ETAPA });
const mapa = montarMapa({
  prefijo: ID,
  etapas,
  progreso: leerProgreso,
  jugarNivel(n) {
    const e = etapas.etapaDe(n);
    avisar("Nivel " + n, etapas.nombreEtapa(n) + " · nivel " + e.k + " de " + POR_ETAPA + ". Los niveles se están preparando: pronto podrás jugarlos.");
  },
  leyenda: "Cada nivel es fijo: siempre empiezas con el mismo país y te enfrentas a los mismos rivales.",
  avisoPrincipal: () => "Nivel " + leerProgreso().max + " · los niveles aún no están disponibles",
});

function avisar(titulo, texto) {
  $("velo-titulo").textContent = titulo;
  $("velo-texto").textContent = texto;
  velo.classList.add("activo");
  $("velo-cerrar").focus();
}
$("velo-cerrar").addEventListener("click", () => velo.classList.remove("activo"));

// ---------- Cambio de pantallas ----------
function ver(p) {
  pantalla = p;
  document.body.dataset.pantalla = p; // el CSS usa esto para pedir el celular en horizontal
  menu.hidden = p !== "menu";
  lienzo.hidden = p !== "mundo";
  hud.hidden = p !== "mundo";
  zoom.hidden = p !== "mundo";
  if (p !== "mundo") { ficha.hidden = true; mundo.detener(); }
  if (armas) armas.mostrar(p === "mundo");
  btnMenu.hidden = p === "menu";
  txtMenu.textContent = p === "mundo" ? "Pausa" : "Menú principal";
  btnMenu.title = p === "mundo" ? "Pausa" : "Volver al menú principal";
}
function mostrarMenu() {
  soltarHorizontal();
  mapa.cerrar();
  velo.classList.remove("activo");
  mundo.seleccionar(null);
  limpiarPartida();
  propios = []; nivelVision = 0; mundo.limpiarEstados(); duenos.clear(); aplicarVision(); // fuera de una partida el mundo vuelve a quedar tapado y limpio
  ver("menu");
}
// El mundo se juega con el celular en horizontal: se intenta pantalla completa + bloqueo (Android lo permite; iPhone no, ahí solo sale el aviso «gira tu celular»)
async function pedirHorizontal() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
  } catch (e) {}
}
function soltarHorizontal() { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
// ---------- Selector de enemigos (menú) ----------
function pintarBots() {
  $("bots-num").textContent = nBots;
  $("bots-menos").disabled = nBots <= BOTS_MIN;
  $("bots-mas").disabled = nBots >= BOTS_MAX;
  const puntos = $("bots-puntos");
  if (!puntos.children.length) {
    const yo = document.createElement("i"); yo.className = "yo"; yo.style.setProperty("--c", COLOR_JUGADOR); puntos.appendChild(yo);
    COLORES_BOTS.forEach((c) => { const i = document.createElement("i"); i.style.setProperty("--c", c); puntos.appendChild(i); });
  }
  [...puntos.children].slice(1).forEach((el, i) => el.classList.toggle("off", i >= nBots));
}
function cambiarBots(d) {
  nBots = Math.max(BOTS_MIN, Math.min(BOTS_MAX, nBots + d));
  try { localStorage.setItem(CLAVE_BOTS, String(nBots)); } catch (e) {}
  pintarBots();
}
$("bots-menos").addEventListener("click", () => cambiarBots(-1));
$("bots-mas").addEventListener("click", () => cambiarBots(1));
pintarBots();

// Dueños del mapa: tu país (trazo brillante) y el de cada bot (su color).
function repartirPaises(n) {
  mundo.limpiarEstados(); duenos.clear();
  propios.forEach((iso) => { mundo.setDueno(iso, COLOR_JUGADOR, true); duenos.set(iso, { tipo: "jugador", color: COLOR_JUGADOR }); });
  const libres = PAISES_BOTS.filter((iso) => !propios.includes(iso));
  for (let i = 0; i < n && i < libres.length; i++) { mundo.setDueno(libres[i], COLORES_BOTS[i]); duenos.set(libres[i], { tipo: "bot", n: i + 1, color: COLORES_BOTS[i] }); }
}
// Botón «Centrar»: lleva la cámara exactamente a tu país
function centrar() { if (propios[0]) mundo.centrarEn(propios[0]); }
$("z-centrar").addEventListener("click", centrar);
addEventListener("keydown", (ev) => { if ((ev.key === "c" || ev.key === "C") && pantalla === "mundo" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !velo.classList.contains("activo")) { ev.preventDefault(); centrar(); } });

// Niebla de guerra: se reaplica cada vez que cambian los países propios o la visión.
function aplicarVision() { mundo.setVision(propios, VISION[nivelVision]); }
// Mejoras de Inteligencia (README, sección 5.3): la 1.ª deja ver el 50 % del planeta y la 2.ª el 100 %. Llamar desde el sistema de investigación.
function mejorarVision() { if (nivelVision < VISION.length - 1) { nivelVision++; aplicarVision(); } }
// TODA partida (libre o de nivel) debe empezar por aquí (paisesPropios = tus países; bots = cuántos enemigos, 1 a 15): así siempre arranca con la niebla y la visión inicial del 10 %.
function empezarPartida(paisesPropios, bots) {
  limpiarPartida();
  propios = paisesPropios.slice();
  nivelVision = 0;
  repartirPaises(bots);
  aplicarVision();
  ver("mundo");
  mundo.iniciar();
  mundo.vistaInicial(propios[0]); // bajo la niebla solo se ve lo cercano al país propio: se empieza mirándolo
}
// ---------- Acciones de un país propio (menú circular) ----------
function limpiarPartida() {
  ocupado.clear(); misiles.clear(); reservados.clear(); hechas.clear(); enCurso.clear(); golpes.clear(); destruidos.clear(); pausado = false;
  terminarApuntado(); mundo.cancelarVuelos();
  if (menuPais) { menuPais.cerrarPanel(); menuPais.cerrar(); }
}
const arsenal = (iso) => { if (!misiles.has(iso)) misiles.set(iso, [MISILES_INICIALES, 0, 0]); return misiles.get(iso); };
const stock = (iso, nivel = 1) => arsenal(iso)[nivel - 1];
// Vecinos a los que se podría expandir: sin dueño (los tuyos y los de los bots no) y sin que ya vayas hacia ellos
const vecinosLibres = (iso) => vecinosDe(iso).filter((v) => !duenos.has(v));
const destinosDe = (iso) => vecinosLibres(iso).filter((v) => !reservados.has(v));

function ocupar(iso, o) {
  const total = o.total * TIEMPO;
  ocupado.set(iso, { texto: o.texto, total, resta: total, alTerminar: o.alTerminar, alCancelar: o.alCancelar });
  menuPais.refrescar();
}
function ganarPais(iso) {
  if (destruidos.delete(iso)) { golpes.delete(iso); mundo.setDestruido(iso, false); } // un país destruido se recupera expandiéndote hacia él
  propios.push(iso);
  duenos.set(iso, { tipo: "jugador", color: COLOR_JUGADOR });
  mundo.setDueno(iso, COLOR_JUGADOR, true);
  aplicarVision();
  if (mundo.seleccionado() === iso) { pintarFicha(iso); menuPais.abrir(iso); } // lo tenías tocado: ahora es tuyo y ya tiene su menú
}

// Expandir (25 s): el país de origen queda ocupado y, al terminar, el destino pasa a ser tuyo
function expandir(origen, destino) {
  if (ocupado.has(origen) || duenos.has(destino) || reservados.has(destino)) return;
  reservados.add(destino);
  ocupar(origen, {
    texto: "Expandiendo a " + nombreTerritorio(destino), total: MS_EXPANDIR,
    alCancelar: () => reservados.delete(destino),
    alTerminar: () => { reservados.delete(destino); if (!duenos.has(destino)) { ganarPais(destino); menuPais.aviso(banderaTerritorio(destino) + " " + nombreTerritorio(destino) + " ahora es tuyo"); } },
  });
}
function elegirDestino(origen) {
  const d = destinosDe(origen);
  if (!d.length) return;
  if (d.length === 1) { expandir(origen, d[0]); return; }
  menuPais.abrirPanel({
    titulo: "Expandir", sub: "¿Hacia dónde? Tarda 25 s y mientras tanto este país no puede fabricar ni investigar.",
    filas: () => destinosDe(origen).map((v) => ({ texto: banderaTerritorio(v) + " " + nombreTerritorio(v), alElegir: () => { menuPais.cerrarPanel(); expandir(origen, v); } })),
  });
}

// Misil de nivel 1 (5 s)
function fabricarMisil(iso) {
  if (ocupado.has(iso)) return;
  ocupar(iso, {
    texto: "Fabricando misil nivel 1", total: MS_MISIL1,
    alTerminar: () => { arsenal(iso)[0]++; menuPais.aviso("Misil nivel 1 listo en " + nombreTerritorio(iso)); menuPais.refrescar(); },
  });
}

// Investigación (1 min por mejora, 3 min por superarma): el país queda ocupado mientras investiga
function filaMejora(m, iso) {
  const est = estadoMejora(m, hechas, enCurso);
  const base = { texto: m.nombre, ayuda: m.texto };
  if (est === "lista") return { ...base, hecha: true, deshabilitado: true, estado: () => "✔ Lista" };
  if (est === "curso") return { ...base, deshabilitado: true, estado: () => { const o = ocupado.get(enCurso.get(m.n)); return "Investigando · " + (o ? mmss(o.resta) : "…"); } };
  if (est === "bloqueada") return { ...base, deshabilitado: true, estado: () => "🔒 " + (m.req.length > 1 ? "Completa las 8 mejoras" : "Requiere: " + faltan(m, hechas).join(", ")) };
  return { ...base, deshabilitado: ocupado.has(iso), estado: () => "Disponible · " + mmss(m.ms * TIEMPO), alElegir: () => investigar(m, iso) };
}
function abrirInvestigacion(iso) {
  menuPais.abrirPanel({
    titulo: "Investigar", sub: "4 mejoras disponibles; cada una desbloquea otra. Con las 8, se desbloquean las superarmas.",
    filas: () => [{ encabezado: "Mejoras" }, ...MEJORAS.map((m) => filaMejora(m, iso)), { encabezado: basicasCompletas(hechas) ? "Superarmas" : "Superarmas · se desbloquean con las 8 mejoras" }, ...SUPERARMAS.map((m) => filaMejora(m, iso))],
  });
}
function investigar(m, iso) {
  if (ocupado.has(iso) || estadoMejora(m, hechas, enCurso) !== "disponible") return;
  enCurso.set(m.n, iso);
  menuPais.cerrarPanel();
  ocupar(iso, {
    texto: "Investigando: " + m.nombre, total: m.ms,
    alCancelar: () => enCurso.delete(m.n),
    alTerminar: () => {
      enCurso.delete(m.n); hechas.add(m.n);
      if (m.n === 3 || m.n === 7) mejorarVision(); // Inteligencia mejorada → 50 %; Inteligencia superior → 100 % (sin niebla)
      menuPais.aviso(m.n <= 8 && basicasCompletas(hechas) ? "¡Las 8 mejoras están listas! Superarmas desbloqueadas" : "Investigación lista: " + m.nombre);
      menuPais.refrescar();
    },
  });
}

// Botones del menú circular de un país tuyo (en el orden en que se reparten desde arriba, en el sentido del reloj)
function accionesDe(iso) {
  const libre = !ocupado.has(iso), lista = [];
  if (vecinosLibres(iso).length) lista.push({ texto: "EXPANDIR", nombre: "Expandir", icono: "expandir", deshabilitado: !libre || !destinosDe(iso).length, alElegir: () => elegirDestino(iso) });
  lista.push({ texto: "MISIL NIVEL 1", nombre: "Crear misil nivel 1", icono: "misil", deshabilitado: !libre, info: stock(iso), alElegir: () => fabricarMisil(iso) });
  lista.push({ texto: "INVESTIGAR", nombre: "Investigar", icono: "investigar", deshabilitado: !libre, alElegir: () => abrirInvestigacion(iso) });
  return lista;
}
const centroDe = (iso) => { const o = ocupado.get(iso); return o ? { texto: o.texto + " · " + mmss(o.resta), fraccion: 1 - o.resta / o.total } : null; };
menuPais = crearMenuPais({ mundo, acciones: accionesDe, centro: centroDe });

// ---------- Ataque: apuntar, confirmar, disparar, impactar ----------
const NIVELES_DE = { todos: [1, 2, 3], n1: [1] };
const totalMisiles = (tipo) => propios.reduce((t, iso) => t + NIVELES_DE[tipo].reduce((a, n) => a + stock(iso, n), 0), 0);

// Qué misiles salen hacia un punto: solo los que tienen alcance desde el país que los guarda
function planDeTiro(tipo, lon, lat) {
  const grupos = []; let total = 0, llegan = 0;
  for (const iso of propios) {
    const c = centroTerritorio(iso); if (!c) continue;
    const d = distanciaAngular(c, [lon, lat]);
    for (const nivel of NIVELES_DE[tipo]) {
      const n = stock(iso, nivel); if (!n) continue;
      total += n;
      if (d <= gradosDeAlcance(ALCANCE[nivel])) { grupos.push({ iso, nivel, n }); llegan += n; }
    }
  }
  return { grupos, total, llegan };
}
function empezarApuntado(tipo) {
  if (apuntando) { cancelarApuntado(); return; } // pulsar otra vez el mismo botón cancela
  if (!totalMisiles(tipo)) return;
  menuPais.cerrarPanel(); mundo.seleccionar(null);
  apuntando = { tipo, objetivo: null };
  mundo.modoApuntar(alTocarApuntando);
  armas.banner("Elige el objetivo: toca un país del mapa");
  refrescarArmas();
}
function alTocarApuntando(t) {
  if (!apuntando) return;
  if (apuntando.objetivo) { // ya hay objetivo: tocar lejos de la confirmación cancela, tocar cerca no hace nada
    const p = mundo.aPantalla(apuntando.objetivo.lon, apuntando.objetivo.lat);
    if (!p || Math.hypot(t.x - p[0], t.y - p[1]) > 110) cancelarApuntado();
    return;
  }
  if (!t.iso) { menuPais.aviso(t.lon == null ? "Toca sobre el planeta" : t.visible ? "Toca un país" : "Esa zona está bajo la niebla"); return; }
  apuntando.objetivo = { iso: t.iso, lon: t.lon, lat: t.lat };
  mundo.setMira(t.lon, t.lat);
  armas.banner(null);
  const plan = planDeTiro(apuntando.tipo, t.lon, t.lat);
  armas.confirmar({
    lon: t.lon, lat: t.lat, puedeDisparar: plan.llegan > 0,
    texto: nombreTerritorio(t.iso) + ": " + (plan.llegan ? plan.llegan + " de " + plan.total + " misiles llegan" : "ningún misil llega"),
  });
}
function terminarApuntado() {
  apuntando = null;
  if (mundo) { mundo.modoApuntar(null); mundo.setMira(null); }
  if (armas) { armas.banner(null); armas.confirmar(null); refrescarArmas(); }
}
function cancelarApuntado() { if (apuntando) terminarApuntado(); }
function confirmarDisparo() {
  if (!apuntando || !apuntando.objetivo) return;
  const { tipo, objetivo } = apuntando, plan = planDeTiro(tipo, objetivo.lon, objetivo.lat); // se recalcula: el arsenal pudo cambiar mientras se apuntaba
  terminarApuntado();
  if (!plan.llegan) { menuPais.aviso("Ningún misil llega hasta allá"); return; }
  let k = 0;
  for (const g of plan.grupos) {
    arsenal(g.iso)[g.nivel - 1] -= g.n;
    for (let i = 0; i < g.n; i++) {
      mundo.lanzar({ de: centroTerritorio(g.iso), a: [objetivo.lon, objetivo.lat], ms: MS_VUELO * TIEMPO, espera: k++ * ESCALONADO_MS * TIEMPO, color: COLOR_JUGADOR,
        alImpactar: () => impactar(objetivo.iso, objetivo.lon, objetivo.lat) });
    }
  }
  menuPais.aviso("Lanzaste " + plan.llegan + (plan.llegan === 1 ? " misil" : " misiles") + " hacia " + nombreTerritorio(objetivo.iso) + (plan.llegan < plan.total ? " (" + (plan.total - plan.llegan) + " sin alcance se quedaron)" : ""));
  menuPais.refrescar(); refrescarArmas();
}
// Un misil cae: en el centro del país hace más daño que en el borde (README 5.2)
function impactar(iso, lon, lat) {
  if (destruidos.has(iso)) return;
  const c = centroTerritorio(iso), radio = radioTerritorio(iso);
  const borde = c && radio > 0 && distanciaAngular(c, [lon, lat]) / radio > BORDE;
  const total = (golpes.get(iso) || 0) + (borde ? DANO_BORDE : DANO_CENTRO);
  golpes.set(iso, total);
  if (total >= PV_PAIS - 1e-6) destruirPais(iso);
}
function destruirPais(iso) {
  destruidos.add(iso); mundo.setDestruido(iso, true);
  const d = duenos.get(iso);
  duenos.delete(iso); mundo.setDueno(iso, null);
  if (d && d.tipo === "jugador") { // deja de ser tuyo: lo que hacía se pierde y hay que volver a expandirse hacia él
    propios = propios.filter((x) => x !== iso);
    const o = ocupado.get(iso); if (o) { ocupado.delete(iso); if (o.alCancelar) o.alCancelar(); }
    misiles.delete(iso); aplicarVision();
    menuPais.aviso(nombreTerritorio(iso) + " fue destruido");
  } else menuPais.aviso(nombreTerritorio(iso) + " fue destruido");
  if (mundo.seleccionado() === iso) { pintarFicha(iso); menuPais.cerrar(); }
  menuPais.refrescar(); refrescarArmas();
}

// Estado de los botones de ataque
function estadoArmas() {
  const sup = (n) => {
    const m = porNumero(n), es = estadoMejora(m, hechas, enCurso), o = es === "curso" ? ocupado.get(enCurso.get(n)) : null;
    return { estado: es, fraccion: o ? 1 - o.resta / o.total : 0 };
  };
  return { todos: { n: totalMisiles("todos"), activo: !!apuntando && apuntando.tipo === "todos" }, n1: { n: totalMisiles("n1"), activo: !!apuntando && apuntando.tipo === "n1" }, supers: [sup(9), sup(10)] };
}
function refrescarArmas() { if (armas) armas.pintar(estadoArmas()); }
armas = crearArmas({
  mundo,
  alPulsar(id) {
    if (id === "todos" || id === "n1") empezarApuntado(id);
    else menuPais.aviso(estadoMejora(porNumero(id === "super1" ? 9 : 10), hechas, enCurso) === "lista" ? "Las superarmas todavía no tienen efecto" : "Desbloquea las superarmas investigando las 8 mejoras");
  },
  alConfirmar: confirmarDisparo,
  alCancelar: cancelarApuntado,
});
refrescarArmas();

// Reloj de las acciones: avanza solo con la partida en marcha (no en pausa ni con la pestaña oculta)
let ultimoTic = 0;
setInterval(() => {
  const ahora = performance.now(), dt = Math.min(500, ahora - (ultimoTic || ahora));
  ultimoTic = ahora;
  if (pantalla !== "mundo" || pausado || document.hidden || !ocupado.size) { menuPais.tic(); refrescarArmas(); return; }
  let termino = false;
  for (const [iso, o] of [...ocupado]) { o.resta -= dt; if (o.resta <= 0) { ocupado.delete(iso); o.alTerminar(); termino = true; } }
  if (termino) menuPais.refrescar(); else menuPais.tic();
  refrescarArmas();
}, 250);

function abrirPartidaLibre(d) {
  pedirHorizontal();
  dificultad = d;
  chipModo.textContent = "Partida libre · " + DIFICULTADES[d] + " · " + nBots + (nBots === 1 ? " enemigo" : " enemigos");
  empezarPartida(PAISES_INICIALES[d], nBots);
}
function abrirNiveles() {
  ver("niveles");
  mapa.abrir();
}

$("btn-facil").addEventListener("click", () => abrirPartidaLibre("facil"));
$("btn-normal").addEventListener("click", () => abrirPartidaLibre("normal"));
$("btn-dificil").addEventListener("click", () => abrirPartidaLibre("dificil"));
$("btn-niveles").addEventListener("click", abrirNiveles);
btnMenu.addEventListener("click", () => { if (pantalla === "niveles") mostrarMenu(); }); // en el mundo, menu-pausa.js abre la pausa
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && velo.classList.contains("activo")) { ev.preventDefault(); velo.classList.remove("activo"); } });
document.addEventListener("visibilitychange", () => { if (pantalla === "mundo") { if (document.hidden) mundo.detener(); else mundo.iniciar(); } });

ver("menu");
