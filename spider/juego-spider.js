// Ruta: spider/juego-spider.js
// Solitario Spider con el inicio con mapa (ESTANDARES-juegos.md, sección 13, estilo Deslizante): pantalla de inicio (una sola vez) → mapa de países (menú principal), Modo libre y partida.
// Niveles: campaña de 3 900 = 195 países × 20 (niveles-spider.js, generado por generar-niveles-spider.mjs; los que todavía no tienen reparto salen «🚧 todavía no creado»).
// Cada nivel guarda su mejor tiempo y hasta 3 estrellas (estrellas-spider.js); las monedas siguen saliendo solo la primera vez (economia-spider.js).
import { DIFICULTADES, PALOS, nuevaPartida, clonar, largoTramo, puedeMover, mover, puedeRepartir, repartir, ganada, jugadas, palo, rango, SERIES } from "./logica-spider.js";
import { generarVerificada } from "./ia-spider.js";
import { TOTAL, nivelDe, creados } from "./niveles-spider.js";
import { metasDe, evaluar, registrar, desempaquetar, textoEstrellas, contar } from "./estrellas-spider.js"; // récord de tiempo y estrellas por nivel
import { elegirDelBanco, cuantos } from "./banco-spider.js";
import { ayudasDe, recompensa, carteraVacia, saldo, ganarMonedas, gastarMonedas, unirCarteras, unirProgresoSpider } from "./economia-spider.js"; // monedas, ayudas por dificultad y cartera
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { crearCelebracion } from "../compartido/celebracion-estrellas.js"; // estrellas que vuelan, caen en el país y monedas que viajan al chip (13.5)
import { encolarNivel, leerCola, guardarCola } from "../compartido/cola-puntos.js"; // 1 punto del portal por nivel pasado la primera vez (estándar, sección 12)
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "spider_progreso_v1"; // { cartera:{d:{…}}, ganadas, mejor:{"palos-dif":segundos…}, niv:{max,hecho}, opc:{palos,dif}, t }  (ver unirProgresoSpider en economia-spider.js)
const llave = (p, d) => p + "-" + d; // clave del mejor tiempo: un récord por cada combinación de palos y dificultad
const SIMB = ["♠", "♥", "♣", "♦"], ROJO = [false, true, false, true];
const NOMBRE_RANGO = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// ---------- Progreso (local primero; se sincroniza con la cuenta si hay internet) ----------
let prog = { niv: { max: 1, hecho: 0 }, mejor: {}, rec: {}, ganadas: 0, cartera: carteraVacia(), t: 0 }; // cartera = contadores de monedas POR DISPOSITIVO (saldo = ganadas − gastadas de todos)
try { const g = JSON.parse(localStorage.getItem(CLAVE)); if (g) prog = { ...prog, ...g }; } catch (e) {}
if (!prog.rec || typeof prog.rec !== "object") prog.rec = {};
const recDe = (n) => desempaquetar(prog.rec && prog.rec[n]); // { t: mejor tiempo (0 = ninguno), mask: estrellas ganadas (bits 1, 2, 4) }
prog.cartera = unirCarteras(prog.cartera, null); delete prog.g; delete prog.s; // (antes las monedas eran dos contadores globales g/s; nunca se ganó ninguna)
const CLAVE_DISP = "spider_dispositivo"; // id de ESTE dispositivo (no se sincroniza): la cartera lleva un contador de monedas por dispositivo
let idDisp = "";
try { idDisp = localStorage.getItem(CLAVE_DISP) || ""; if (!idDisp) { idDisp = Math.random().toString(36).slice(2, 10); localStorage.setItem(CLAVE_DISP, idDisp); } } catch (e) {}
if (!idDisp) idDisp = "t" + Math.random().toString(36).slice(2, 8); // sin localStorage: vale solo en esta sesión
let nube = null;
function guardar() { // pasa por unirProgresoSpider para dejar las claves en el orden de la sincronización
  prog.t = Date.now();
  try { localStorage.setItem(CLAVE, JSON.stringify(unirProgresoSpider(prog, null))); } catch (e) {}
  if (nube) nube.guardado();
}
let reiniciando = false; // true mientras se borra el historial (Ajustes): la sincronización con la nube no vuelve a traer lo borrado
import("../compartido/progreso.js").then((m) => { nube = m.conectar("spider", { clave: CLAVE, fusionar: (x, y) => (reiniciando ? null : unirProgresoSpider(x, y)), alCambiar: (u) => { prog = { ...prog, ...u }; mapa.refrescar(); pintarMonedas(); pintarInicio(); if (pantalla === "libre") pintarLibre(); } }); }).catch(() => {}); // con el progreso de la cuenta el mapa se redibuja solo

// ---------- Pantallas ----------
let pantalla = "inicio", mapaEnPrincipal = true, pal = 1, dif = 1, recientes = [], e = null, historial = [], sel = null, fin = false, pausado = false;
let t0 = 0, acum = 0, verificada = false, nivel = 0; // nivel 0 = modo libre
let usos = { pista: 0, retro: 0, r: 0, p: 0 }; // pista / retro = ayudas de PAGO usadas en este intento (los topes se reinician al reiniciar) · r / p = veces que el jugador pidió ↶ / 💡 (para el reto de la 3.ª estrella)
let resultado = null; // ventana «¡Ganaste!» (sobre el tablero)
// Ayudas (README-spider.md, sección 3). Modo libre: sin monedas, ↶ gratis salvo en Maestro y 💡 gratis. Niveles: según la dificultad del nivel.
const retroLibre = () => (nivel ? !!ayudasDe(e.dif).libre : DIFICULTADES[e.dif - 1].deshacer);
const retroPaga = () => (nivel && !ayudasDe(e.dif).libre ? ayudasDe(e.dif).retro : null); // { precio, tope } o null
const pistaPaga = () => (nivel && !ayudasDe(e.dif).libre ? ayudasDe(e.dif).pista : null);
const hayRetro = () => retroLibre() || !!retroPaga();
const pistaAuto = () => !nivel || !!ayudasDe(e.dif).libre; // la pista sola a los 15 s: solo donde las ayudas son gratis
// Avisos visuales: alertaMal = recuadro rojo (tramo bloqueado); pista = movimiento sugerido {tipo:"mover",de,desde,a} o {tipo:"repartir"}
const PISTA_MS = 15000; // segundos sin tocar nada antes de dar una pista
let ultimaAccion = Date.now(), alertaMal = null, pista = null;
// Barra superior: colecc = palo de cada serie terminada (en orden); mostradas = cuántas ya llegaron a la barra (las demás van volando)
let vistos = new Set(); // posiciones por las que ya pasó la partida (para no sugerir volver a ellas)
let colecc = [], mostradas = 0, fantasmas = [], animTimers = [], finAnim = 0, tb = tamBarra(34, 48, 0);
const btnMenu = $("btn-menu");
if (prog.opc) { pal = PALOS.includes(prog.opc.palos) ? prog.opc.palos : 1; dif = DIFICULTADES[prog.opc.dif - 1] ? prog.opc.dif : 1; }

// Pantallas (13.1): «inicio» (solo al abrir el juego) · «libre» (opciones del Modo libre) · «juego» (una partida) · «mapa» (el menú principal: lo dibuja compartido/mapa-niveles.js).
// «inicio» como destino NO existe después de abrir: el ☰, «Salir al mapa» y los botones de fin de nivel llevan al mapa (irMenu).
function mostrar(p) {
  pantalla = p;
  quitarResultado();
  if (p !== "juego") { $("toast").hidden = true; clearTimeout(aviso.id); } // un aviso del nivel (metas de las estrellas) no se queda tapando el mapa o la celebración
  $("pantalla-inicio").hidden = p !== "inicio";
  $("libre").hidden = p !== "libre";
  $("juego").hidden = p !== "juego";
  $("barra-nivel").hidden = p !== "juego";
  $("cuadros-datos").hidden = p !== "juego";
  $("btn-mapa-juego").hidden = !nivel; // el 🗺️ solo en los niveles (el Modo libre no tiene mapa)
  ubicarMonedas();
  rotularMenu();
  if (p !== "mapa") { mapa.cerrar(); cel.quitar(); cel.quitarTexto(); } // la celebración sí sigue cuando se abre el mapa (lo hace ella misma)
  if (p === "juego") pintar();
  if (p === "libre") pintarLibre();
  if (p === "inicio") pintarInicio();
  pintarMonedas();
}
// ☰ (13.3): oculto en el inicio y en la vista principal del mapa; «Atrás» en las vistas internas del mapa; «Pausa» en una partida del Modo libre; «Volver al menú principal» en lo demás
function rotularMenu() {
  let texto = "Volver al menú principal", oculto = false;
  if (pantalla === "inicio") oculto = true;
  else if (pantalla === "mapa") { oculto = mapaEnPrincipal; texto = "Atrás"; }
  else if (pantalla === "juego" && !nivel && !fin) texto = "Pausa";
  btnMenu.hidden = oculto; btnMenu.title = texto; btnMenu.setAttribute("aria-label", texto);
}
// El chip de monedas vive arriba a la derecha (bajo la sesión) y, dentro de una partida, pasa a la izquierda del botón 🗺️ en la barra del nivel
function ubicarMonedas() {
  const chip = $("monedas-barra"), enBarra = pantalla === "juego", destino = enBarra ? $("barra-nivel") : $("hud-sesion");
  if (chip.parentNode === destino) return;
  if (enBarra) destino.prepend(chip); else destino.appendChild(chip);
}
function aviso(txt, ms = 2200) {
  const t = $("toast"); t.textContent = txt; t.hidden = false;
  clearTimeout(aviso.id); aviso.id = setTimeout(() => { t.hidden = true; }, ms);
}

// ---------- Mapa de países = menú principal (13.4) ----------
const ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true }); // 195 países × 20 niveles = 3 900 (los creados salen de niveles-spider.js)
if (ETAPAS.total !== TOTAL) console.warn("spider: el mapa tiene " + ETAPAS.total + " niveles y niveles-spider.js declara " + TOTAL);
const monedas = () => saldo(prog.cartera);
function pintarMonedas(v) { $("monedas-n").textContent = (v ?? monedas()).toLocaleString("es-MX"); } // v = número mientras viajan las monedas de la celebración; sin él, el saldo real
function gastar(n) { if (!gastarMonedas(prog.cartera, idDisp, n)) return false; guardar(); pintarMonedas(); return true; }
const proximoNivel = () => Math.min(Math.max(1, prog.niv.max), ETAPAS.total);
// Texto «Nivel 3 · México» del nivel n (el número es el del país: 1 a 20)
function nombreNivel(n) { const x = ETAPAS.etapaDe(n); return "Nivel " + x.k + " · " + ETAPAS.nombreEtapa(n); }
function pintarInicio() { const b = $("btn-inicio-jugar"); b.title = "Jugar · " + nombreNivel(proximoNivel()); b.setAttribute("aria-label", b.title); } // en el centro del país el botón dice «Jugar» hasta pasar el primer nivel y «Continuar» después (etiquetaContinuar)
// «inicio» siempre significa «abrir el mapa» en el país donde va el jugador
function abrirMapa(n, alcanzado) { mostrar("mapa"); mapa.abrir(n || proximoNivel(), alcanzado); }
const irMenu = () => abrirMapa(proximoNivel());
function jugarNivel(n) { if (nivelDe(n)) empezar(n); else aviso("🚧 Los niveles todavía no están creados"); }
// Pantalla de inicio: Jugar = el nivel que toca (si no hay ninguno pasado, abre el mapa en el nivel 1) · Modo libre · Mapa · Ajustes
$("btn-inicio-jugar").addEventListener("click", () => { if (prog.niv.hecho === 0) abrirMapa(1); else jugarNivel(proximoNivel()); });
$("btn-inicio-libre").addEventListener("click", () => mostrar("libre"));
$("btn-inicio-mapa").addEventListener("click", () => irMenu());
$("btn-inicio-ajustes").addEventListener("click", () => abrirAjustes());

// ---------- Info: «Cómo se juega» ----------
const infoFondo = $("info-fondo");
function abrirInfo() { infoFondo.hidden = false; try { $("info-ok").focus({ preventScroll: true }); } catch (err) {} }
function cerrarInfo() { infoFondo.hidden = true; }
$("info-ok").addEventListener("click", cerrarInfo);
infoFondo.addEventListener("click", (ev) => { if (ev.target === infoFondo) cerrarInfo(); });
addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !infoFondo.hidden) { ev.preventDefault(); ev.stopPropagation(); cerrarInfo(); } }, true);

// ---------- 👤 Sesión (arriba a la derecha; se carga aparte: sin internet el juego funciona igual). Sin sesión, tocar el chip abre el acceso con Google ----------
let entrarFn = null, haySesion = false;
import("../compartido/jugador.js").then((m) => { entrarFn = m.entrar; m.alCambiarSesion((u) => { haySesion = !!u; $("sesion").textContent = u ? (u.displayName || "Jugador") : "👤 Iniciar sesión"; $("sesion").classList.toggle("tocable", !u); }); }).catch(() => {});
$("sesion").addEventListener("click", () => { if (!haySesion && entrarFn) entrarFn().catch((err) => aviso(err.message)); });

// ---------- Modo libre (pantalla propia: palos, dificultad, nota, récord y «Jugar») ----------
const SIMBOLOS_PALOS = ["♠", "♠♥", "♠♥♣", "♠♥♣♦"];
function elegir(que, v) { if (que === "pal") pal = v; else dif = v; prog.opc = { palos: pal, dif }; guardar(); pintarLibre(); }
function pintarLibre() {
  const cp = $("palos"); cp.replaceChildren();
  for (const p of PALOS) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "b3d txt " + (p === pal ? "b-oro on" : "b-cielo");
    b.setAttribute("aria-pressed", String(p === pal));
    b.innerHTML = "<span>" + p + (p === 1 ? " palo " : " palos ") + SIMBOLOS_PALOS[p - 1] + "</span>";
    b.addEventListener("click", () => elegir("pal", p));
    cp.appendChild(b);
  }
  const caja = $("dificultades"); caja.replaceChildren();
  for (const d of DIFICULTADES) { // 5 botones solo con emoji (13.7); el nombre de la elegida va debajo
    const b = document.createElement("button");
    b.type = "button"; b.className = "b3d txt " + (d.id === dif ? "b-oro on" : "b-cielo");
    b.setAttribute("aria-pressed", String(d.id === dif)); b.title = d.nombre; b.setAttribute("aria-label", d.nombre);
    b.innerHTML = '<span class="b-ico">' + d.ico + "</span>";
    b.addEventListener("click", () => elegir("dif", d.id));
    caja.appendChild(b);
  }
  $("dif-nombre").textContent = DIFICULTADES[dif - 1].ico + " " + DIFICULTADES[dif - 1].nombre;
  const d = DIFICULTADES[dif - 1], n = cuantos(pal, dif);
  $("desc-dif").textContent = pal + (pal === 1 ? " palo" : " palos") + " · reparto " + d.nombre + (d.deshacer ? " · con deshacer" : " · SIN deshacer") +
    (n ? " · " + n + " repartos con solución comprobada" : " · todavía sin repartos comprobados: se buscará uno al momento");
  const m = prog.mejor[llave(pal, dif)];
  $("mejores").textContent = m ? formato(m) : "–";
}
$("b-jugar").addEventListener("click", () => empezar());

// ---------- Niveles: el mapa de un solo país (compartido/mapa-niveles.js con unPais) ----------
const CLASE_DIF = ["b-verde", "b-azul", "b-morado", "b-oro", "b-rojo"]; // = color de cada dificultad (🟢 🔵 🟣 🟠 🔴)
const mapa = montarMapa({
  prefijo: "spider",
  etapas: ETAPAS,
  unPais: true,                                    // se abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,                                     // los 20 niveles de un país: 4 columnas × 5 filas
  etiquetaContinuar: () => (prog.niv.hecho === 0 ? "▶ Jugar" : "▶ Continuar"),
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("libre") }],
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; rotularMenu(); },
  progreso: () => ({ hecho: prog.niv.hecho, max: Math.min(TOTAL, prog.niv.hecho + 1) }),
  jugarNivel,
  infoNivel: (n) => {
    const N = nivelDe(n);
    if (!N) return { sub: "🚧", clase: "b-cielo", aria: "todavía no está creado" };
    const d = DIFICULTADES[N.dif - 1], r = recDe(n); // nivel pasado: sus estrellas en lugar de la dificultad (el color ya la dice)
    const base = d.nombre + ", " + N.palos + (N.palos === 1 ? " palo" : " palos");
    if (r.t) return { sub: textoEstrellas(r.mask), clase: CLASE_DIF[N.dif - 1], sinMarca: true, aria: base + ", " + contar(r.mask) + " de 3 estrellas, récord " + formato(r.t) };
    return { sub: d.ico + " " + N.palos + "♠", clase: CLASE_DIF[N.dif - 1], aria: base };
  },
  resumenEstrellas: (desde, hasta) => { // estrellas ganadas del país (3 por nivel)
    let ganadas = 0, posibles = 0;
    for (let n = desde; n <= hasta; n++) { if (!nivelDe(n)) continue; posibles += 3; ganadas += contar(recDe(n).mask); }
    return posibles ? "<span>★ " + ganadas + " / " + posibles + " <small>estrellas</small></span>" : "";
  },
  leyenda: "🟢 Fácil · 🔵 Normal · 🟣 Difícil · 🟠 Experto · 🔴 Maestro · ♠ = cantidad de palos · 🚧 todavía no creado",
  avisoPrincipal: () => creados().toLocaleString("es-MX") + " de " + TOTAL.toLocaleString("es-MX") + " niveles listos 🕷️",
  alInfo: abrirInfo,
});
// Celebración al pasar un nivel (compartido/celebracion-estrellas.js): usa el mapa, el chip de monedas y el saldo de arriba
const cel = crearCelebracion({ mapa, chipMonedas: () => $("monedas-barra"), totalMonedas: monedas, pintarMonedas });

// ---------- Partida ----------
const formato = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const segundos = () => acum + (t0 && !pausado && !fin ? (Date.now() - t0) / 1000 : 0);

function empezar(n = 0) {
  nivel = n;
  if (n) { // nivel fijo: mismo reparto para todos, ya comprobado con el bot
    const N = nivelDe(n);
    verificada = true; e = nuevaPartida(N.palos, N.semilla, N.dif);
  } else {
    // 1) Del banco: repartos que el bot YA resolvió, de la dificultad elegida (más nodos del bot = más difícil)
    const r = elegirDelBanco(pal, dif, Math.random, recientes);
    if (r) {
      verificada = true; e = nuevaPartida(pal, r.semilla, dif);
      recientes.push(r.semilla); if (recientes.length > 12) recientes.shift();
      if (r.dif !== dif) setTimeout(() => aviso("Pocos repartos de esa dificultad con " + pal + (pal === 1 ? " palo" : " palos") + ": toca uno " + DIFICULTADES[r.dif - 1].nombre), 300);
    } else {
      // 2) Sin banco para esa combinación: el bot busca uno al momento (poco tiempo; si no halla, queda «al azar»)
      const base = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      const v = generarVerificada(pal, base, { intentos: pal <= 2 ? 4 : 3, maxMs: pal <= 2 ? 350 : 250, maxNodos: 60000 });
      verificada = !!v;
      e = nuevaPartida(pal, v ? v.semilla : base, dif);
    }
  }
  historial = []; usos = { pista: 0, retro: 0, r: 0, p: 0 }; sel = null; fin = false; pausado = false; t0 = 0; acum = 0;
  alertaMal = null; pista = null; ultimaAccion = Date.now();
  colecc = []; cancelarAnim(); vistos = new Set([clave(e)]);
  cel.quitar(); cel.quitarTexto(); // al empezar un nivel el texto «N estrellas» desaparece al instante
  $("nombre-nivel").textContent = n ? nombreNivel(n) : "♾️ Modo libre " + DIFICULTADES[dif - 1].ico; // botón verde de arriba (13.6): sin tamaño ni palos
  mostrar("juego");
  if (n) { const m = metasDe(n, e.palos, e.dif); aviso("★★ " + m.textos[1] + "   ·   ★★★ " + m.textos[2], 4500); } // las metas de estrellas de este nivel
}
function jugar(fn, op) { // op = qué jugada es ({de,k,a} o {rep:true}); sirve para animar las series que se completen
  if (hayRetro()) { historial.push(clonar(e)); if (historial.length > 300) historial.shift(); }
  if (!t0) t0 = Date.now();
  const antes = clonar(e);
  fn(); sel = null; vistos.add(clave(e)); pintar();
  if (e.hechos > antes.hechos && op) animarSeries(antes, op); // serie terminada: sus 13 cartas viajan a la barra
  if (ganada(e)) terminar();
}
function terminar() {
  fin = true; acum = segundos(); t0 = 0; rotularMenu(); // el ☰ vuelve a decir «Atrás»
  const s = Math.round(acum);
  let premio = 0, est = null, reg = null, premioPrimera = false;
  if (nivel) { // monedas (solo la primera vez que se pasa el nivel) y desbloquea el siguiente (hasta donde haya niveles)
    premioPrimera = nivel > prog.niv.hecho;
    premio = recompensa(e.dif, premioPrimera);
    if (premio) ganarMonedas(prog.cartera, idDisp, premio);
    est = evaluar({ nivel, palos: e.palos, dif: e.dif, segundos: acum, retros: usos.r, pistas: usos.p }); // estrellas y récord de tiempo del nivel
    reg = registrar(prog.rec, nivel, acum, est.mask);
    prog.niv.hecho = Math.max(prog.niv.hecho, nivel);
    prog.niv.max = Math.min(ETAPAS.total, Math.max(prog.niv.max, nivel + 1));
  } else {
    prog.ganadas++;
    const k = llave(e.palos, e.dif);
    if (!prog.mejor[k] || s < prog.mejor[k]) prog.mejor[k] = s;
  }
  guardar(); pintarMonedas();
  if (nivel && premioPrimera) { encolarNivel("spider"); import("../compartido/progreso.js").then((m) => m.vaciarPuntos()).catch(() => {}); } // 1 punto del portal por nivel, solo la primera vez (se envía cuando hay internet y sesión)
  quitarResultado();
  if (nivel) { // niveles: celebración de estrellas (13.5) en lugar de la ventana; deja terminar el viaje de la última serie y abre el mapa del país con el agua subiendo
    const aqui = e, demora = finAnim > Date.now() ? finAnim - Date.now() + 250 : 0;
    const lineas = reg.previo ? (reg.nuevoRecord ? ["🏆 ¡Nuevo récord! " + formato(s)] : ["⏱️ " + formato(s) + " · tu récord " + formato(reg.previo)]) : ["⏱️ Primer tiempo " + formato(s)];
    const hechas = reg.mask, metas = metasDe(nivel, e.palos, e.dif).textos;
    if (!(hechas & 2)) lineas.push("★★ " + metas[1]); if (!(hechas & 4)) lineas.push("★★★ " + metas[2]); // lo que falta para las demás estrellas
    setTimeout(() => { if (e !== aqui || !fin || pantalla !== "juego") return; cel.celebrar({ estrellas: Math.max(1, contar(reg.mask)), monedas: premio, lineas, abrirMapa: () => abrirMapa(nivel, true) }); }, demora);
    return;
  }
  const f = document.createElement("div");
  f.className = "sobre-tablero"; // fin de nivel SOBRE el tablero (ESTANDARES-juegos.md, sección 6)
  const tx = document.createElement("div"); tx.className = "sobre-texto";
  tx.innerHTML = "<h2>🎉 ¡Ganaste!</h2>" + (nivel ? "<div>" + nombreNivel(nivel) + "</div>" : "") + "<div><div>" + formato(s) + " · " + e.movs + " movimientos" + (premio ? " · +" + premio + " monedas" : "") + "</div>" + (reg ? bloqueEstrellas(est, reg) : "");
  f.appendChild(tx);
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  const sig = nivel && nivel < TOTAL && nivelDe(nivel + 1) ? [["▶", "Siguiente nivel", "b-verde", () => empezar(nivel + 1)]] : nivel ? [] : [["▶", "Otra partida", "b-verde", () => empezar()]];
  const otras = nivel ? [["🔄", "Repetir nivel", "b-azul", () => empezar(nivel)], ["🗺️", "Mapa", "b-cielo", () => abrirMapa(nivel, true)]] : [["⚙️", "Cambiar tablero", "b-cielo", () => mostrar("libre")], ["🗺️", "Mapa", "b-cielo", () => irMenu()]]; // «Mapa» abre el país del nivel para ver subir el agua
  const boton = (ico, txt, cl, fn, grande) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + (grande ? "grande " : "") + cl;
    b.innerHTML = '<span class="b-ico">' + ico + "</span><span>" + txt + "</span>";
    b.addEventListener("click", () => { quitarResultado(); fn(); });
    return b;
  };
  for (const [ico, txt, cl, fn] of sig) f.appendChild(boton(ico, txt, cl, fn, true)); // «Siguiente nivel» siempre primero y el más grande
  for (const [ico, txt, cl, fn] of otras) fila.appendChild(boton(ico, txt, cl, fn));
  f.appendChild(fila);
  const esta = e, espera = finAnim > Date.now() ? finAnim - Date.now() + 250 : 0; // deja terminar el viaje de la última serie
  setTimeout(() => { if (e !== esta || !fin || pantalla !== "juego") return; quitarResultado(); document.body.appendChild(f); resultado = f; colocarResultado(); }, espera);
}
// Estrellas y récord que se muestran al ganar un nivel: las 3 metas (✔ ganada, ✖ no) y el tiempo
function bloqueEstrellas(est, reg) {
  const m = metasDe(nivel, e.palos, e.dif), bits = [1, 2, 4];
  const fila = bits.map((b) => '<span class="' + (reg.mask & b ? "" : "no") + '">' + (reg.mask & b ? "★" : "☆") + "</span>").join("");
  const metas = bits.map((b, i) => '<div class="meta' + (reg.mask & b ? " ok" : "") + '">' + (reg.mask & b ? "✔ " : "✖ ") + m.textos[i] + (reg.nuevas & b && b !== 1 ? " · ¡nueva!" : "") + "</div>").join("");
  const t = recDe(nivel).t;
  const tiempo = !reg.previo ? "⏱️ Primer tiempo: " + formato(t) : reg.nuevoRecord ? "🏆 ¡Nuevo récord! " + formato(t) + " (antes " + formato(reg.previo) + ")" : "🏆 Tu récord: " + formato(t);
  return '<div class="estrellas" aria-label="' + contar(reg.mask) + ' de 3 estrellas">' + fila + "</div>" + metas + "<div>" + tiempo + "</div>";
}
function quitarResultado() { if (resultado) { resultado.remove(); resultado = null; } }
// La ventana ocupa el rectángulo del tablero en pantalla (recortado a la ventana); si casi no se ve, toda la pantalla
function colocarResultado() {
  if (!resultado) return;
  const r = $("tablero").getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const l = Math.max(0, r.left), t = Math.max(0, r.top), w = Math.min(W, r.right) - l, h = Math.min(H, r.bottom) - t;
  Object.assign(resultado.style, w > 120 && h > 120 ? { left: l + "px", top: t + "px", width: w + "px", height: h + "px" } : { left: "0px", top: "0px", width: W + "px", height: H + "px" });
}

// ---------- Dibujo ----------
function tramoValido(c, i) { return i >= e.ocultas[c] && e.cols[c].length - i <= largoTramo(e, c); }
// ---------- Barra superior del tablero: series terminadas (izquierda) y mazo de repartos (derecha) ----------
// Línea de tiempo de una serie terminada (ms). El brillo dura TODO el tiempo:
//  1) SALTO de todas las cartas a la vez · 2) OLA «de piano»: salta una por una de la A (la última) al K (la primera)
//  3) TRASLADO: flotan una por una hasta su lugar de la fila de arriba · 4) SALTO al llegar. Luego se apaga el brillo.
const T_SALTO = 500, T_PASO = 25, T_HOP = 200, T_TRASLADO = 900, T_SALIDA = 70, T_LLEGADA = 500;
const T_OLA = 12 * T_PASO + T_HOP; // 500: lo que tarda la ola de la A al K
const T_TOTAL = T_SALTO + T_OLA + 12 * T_SALIDA + T_TRASLADO + T_LLEGADA; // 3240
const contenido = (carta, w) => NOMBRE_RANGO[rango(carta)] + SIMB[palo(carta)] + '<span class="pl" style="font-size:' + w * 0.5 + 'px">' + SIMB[palo(carta)] + "</span>";
// Cartas de la fila superior: MISMO tamaño que las de la partida y mismos límites que las columnas (izq = borde izquierdo de la 1.ª columna).
// Las series terminadas se encimen un poco (paso < ancho), de izquierda a derecha.
function tamBarra(w, h, x0) {
  return { cw: w, ch: h, paso: Math.round(w * 0.62), izq: x0, top: 0 };
}
// Medidas de la mesa. También ajusta el alto de la barra (según el tamaño de las cartas); la mesa se queda con el alto que sobra
function medidas() {
  const m = $("mesa"), W = m.clientWidth, gap = Math.max(2, W * 0.008), borde = 3; // borde: lo justo para que el recuadro rojo/verde de las columnas de los extremos no se corte
  const w = Math.max(24, Math.min(84, (W - borde * 2 - gap * 9) / 10)), h = w * 1.4, x0 = Math.max(borde, (W - (w * 10 + gap * 9)) / 2);
  const barra = $("barra");
  barra.style.height = Math.round(h) + "px"; // la fila superior mide lo que una carta
  tb = tamBarra(w, h, x0);
  barra.style.setProperty("--cw", w + "px"); barra.style.setProperty("--ch", h + "px");
  barra.style.setProperty("--x9", x0 + 9 * (w + gap) + "px"); // el mazo queda justo sobre la última columna
  return { W, H: m.clientHeight, gap, w, h, x0 };
}
// y de cada carta de una columna (misma cuenta que usa pintar)
function posiciones(cartas, o, h, H) {
  const total = h + o * 0.13 * h + Math.max(0, cartas.length - o - 1) * 0.3 * h;
  const f = total > H ? Math.max(0.35, (H - h) / (total - h)) : 1;
  const ys = []; let y = 0;
  cartas.forEach((_, i) => { ys.push(y); y += (i < o ? 0.13 : 0.3) * h * f; });
  return ys;
}
// Series ya terminadas: un montoncito por serie (muestra el K), de izquierda a derecha, cada uno encimado en el anterior
function pintarBarra() {
  const caja = $("series"); caja.replaceChildren();
  for (let i = 0; i < mostradas; i++) {
    const p = colecc[i], d = document.createElement("div");
    d.className = "carta pila" + (ROJO[p] ? " roja" : "");
    d.style.cssText = "left:" + (tb.izq + i * tb.paso) + "px;top:" + tb.top + "px;width:" + tb.cw + "px;height:" + tb.ch + "px;font-size:" + Math.max(10, tb.cw * 0.3) + "px";
    d.innerHTML = contenido(p * 13 + 12, tb.cw);
    caja.appendChild(d);
  }
}
// Reconstruye lo que pasó en la jugada ANTES de que se quitara la serie (la lógica la quita al instante): devuelve, por cada serie
// terminada, { c: columna, cartas: las 13 (K…A), todas: la columna completa, o: cuántas boca abajo }
function seriesQuitadas(antes, op) {
  const cols = antes.cols.map((c) => c.slice()), oc = antes.ocultas, r = [];
  let revisar;
  if (op.rep) { for (let c = 0; c < cols.length; c++) cols[c].push(antes.reparto[antes.rep * cols.length + c]); revisar = cols.map((_, c) => c); }
  else { const t = cols[op.de].splice(cols[op.de].length - op.k, op.k); cols[op.a].push(...t); revisar = [op.a]; }
  for (const c of revisar) {
    const col = cols[c], n = col.length;
    if (n < 13 || n - 13 < oc[c] || rango(col[n - 1]) !== 0) continue;
    let ok = true;
    for (let i = 1; i < 13 && ok; i++) ok = palo(col[n - 1 - i]) === palo(col[n - 1]) && rango(col[n - 1 - i]) === i;
    if (ok) r.push({ c, cartas: col.slice(n - 13), todas: col, o: oc[c] });
  }
  return r;
}
// Detiene y limpia las animaciones en curso (al deshacer o empezar otra partida): las series ya cuentan como llegadas
function cancelarAnim() {
  animTimers.forEach((t) => { clearTimeout(t); clearInterval(t); }); animTimers = [];
  fantasmas.forEach((g) => g.remove()); fantasmas = [];
  $("tablero").querySelectorAll(".chispa").forEach((c) => c.remove());
  finAnim = 0; mostradas = colecc.length; pintarBarra();
}
// Todos los movimientos de UNA carta de la serie en una sola animación (i = 0 es el K … 12 es la A). dx, dy = hasta dónde viaja.
function fotogramas(i, dx, dy, h) {
  const jh = h * 0.35, wh = h * 0.18, arco = h * 0.5, z0 = 20 + i, z1 = 100 - i; // z1: al despegar pasa por encima; el K (último) queda arriba
  const tf = (x, y, r, s) => "translate(" + x + "px," + y + "px) rotate(" + r + "deg) scale(" + s + ")";
  const sube = "cubic-bezier(.2,.7,.4,1)", baja = "cubic-bezier(.6,0,.9,.5)";
  const f = [];
  const k = (t, transform, zIndex, easing = "linear") => f.push({ offset: Math.min(1, t / T_TOTAL), transform, zIndex, easing });
  k(0, tf(0, 0, 0, 1), z0, sube);                                  // 1) salto de todas
  k(T_SALTO * 0.4, tf(0, -jh, 0, 1.06), z0, baja);
  k(T_SALTO, tf(0, 0, 0, 1), z0);
  const w0 = T_SALTO + (12 - i) * T_PASO;                          // 2) ola de piano: la A primero, el K al final
  k(w0, tf(0, 0, 0, 1), z0, sube);
  k(w0 + T_HOP * 0.45, tf(0, -wh, i % 2 ? 4 : -4, 1.08), z0, baja);
  k(w0 + T_HOP, tf(0, 0, 0, 1), z0);
  const td = T_SALTO + T_OLA + (12 - i) * T_SALIDA;                // 3) traslado una por una (la A sale primero)
  const tl = T_SALTO + T_OLA + 12 * T_SALIDA + T_TRASLADO;         //    todas han llegado cuando llega el K
  k(td, tf(0, 0, 0, 1), z0);
  k(td + 1, tf(0, 0, 0, 1), z1);
  for (let q = 1; q <= 8; q++) {                                   // arranca y frena despacio, con un arco hacia arriba a media vuelta
    const u = q / 8, s = u * u * (3 - 2 * u), b = 4 * s * (1 - s);
    k(td + u * T_TRASLADO, tf(dx * s, dy * s - arco * b, 0, 1 + 0.05 * b), z1);
  }
  k(tl, tf(dx, dy, 0, 1), z1, sube);                               // 4) salto al llegar (la fila entera)
  k(tl + T_LLEGADA * 0.4, tf(dx, dy - jh, 0, 1.06), z1, baja);
  k(T_TOTAL, tf(dx, dy, 0, 1), z1);
  return f;
}
// Una chispa de brillo en (x, y) del tablero: sube, gira, se encoge y se desvanece
function chispa(tablero, x, y) {
  const p = document.createElement("div"), t = 5 + Math.random() * 8;
  p.className = "chispa" + (Math.random() < 0.5 ? " estrella" : "");
  p.style.cssText = "left:" + (x - t / 2) + "px;top:" + (y - t / 2) + "px;width:" + t + "px;height:" + t + "px";
  tablero.appendChild(p);
  const dx = (Math.random() - 0.5) * 36, dy = -(8 + Math.random() * 30), giro = (Math.random() - 0.5) * 240;
  const a = p.animate([
    { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
    { transform: "translate(" + dx + "px," + dy + "px) rotate(" + giro + "deg) scale(.2)", opacity: 0 },
  ], { duration: 500 + Math.random() * 450, easing: "ease-out", fill: "forwards" });
  a.onfinish = () => p.remove();
}
// Suelta chispas desde donde están ahora las cartas (quietas o en pleno vuelo): así dejan estela al viajar
function chispear(gs) {
  const tablero = $("tablero"), tr = tablero.getBoundingClientRect();
  for (let q = 0; q < 3; q++) {
    const r = gs[(Math.random() * gs.length) | 0].getBoundingClientRect();
    chispa(tablero, r.left - tr.left + Math.random() * r.width, r.top - tr.top + Math.random() * r.height);
  }
}
// Al terminar una serie sus 13 cartas se iluminan (trazo + chispas durante todo el efecto), saltan, hacen la ola de piano y viajan
// flotando, una por una, a su lugar de la fila de arriba (de izquierda a derecha), donde vuelven a saltar. Con «reducir movimiento»
// (o sin animaciones del navegador) la serie aparece directo.
function animarSeries(antes, op) {
  const lista = seriesQuitadas(antes, op);
  const quieto = !Element.prototype.animate || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { H, gap, w, h, x0 } = medidas(), letra = Math.max(10, w * 0.3);
  const tablero = $("tablero"), m = $("mesa"), bo = $("barra");
  let dur = 0;
  lista.forEach((s, k) => {
    const idx = colecc.length;
    colecc.push(palo(s.cartas[0]));
    if (quieto) return;
    const n = s.todas.length, ys = posiciones(s.todas, s.o, h, H), x = m.offsetLeft + x0 + s.c * (w + gap);
    const gs = s.cartas.map((carta, i) => { // i = 0 es el K
      const g = document.createElement("div"), y = m.offsetTop + ys[n - 13 + i];
      g.className = "carta fantasma brillo" + (ROJO[palo(carta)] ? " roja" : "");
      g.style.cssText = "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px;font-size:" + letra + "px;z-index:" + (20 + i);
      g.innerHTML = contenido(carta, w);
      tablero.appendChild(g);
      const dx = bo.offsetLeft + tb.izq + idx * tb.paso - x, dy = bo.offsetTop + tb.top - y;
      g.animate(fotogramas(i, dx, dy, h), { duration: T_TOTAL, delay: k * 450, fill: "both" });
      return g;
    });
    fantasmas.push(...gs);
    const total = k * 450 + T_TOTAL;
    dur = Math.max(dur, total);
    animTimers.push(setTimeout(() => { // chispas durante todo el efecto
      const t = setInterval(() => chispear(gs), 55);
      animTimers.push(t, setTimeout(() => clearInterval(t), T_TOTAL));
    }, k * 450));
    animTimers.push(setTimeout(() => gs.forEach((g) => g.classList.add("apagando")), total - 300)); // el brillo se apaga al final
    animTimers.push(setTimeout(() => { // llegó: se quitan las cartas voladoras y el montoncito queda en la fila
      gs.forEach((g) => g.remove()); fantasmas = fantasmas.filter((g) => !gs.includes(g));
      mostradas = Math.min(colecc.length, mostradas + 1); pintarBarra();
    }, total));
  });
  while (colecc.length < e.hechos) colecc.push(0); // por si la reconstrucción no halló alguna: que la cuenta siempre cuadre
  if (quieto) mostradas = colecc.length;
  else { finAnim = Math.max(finAnim, Date.now() + dur); animTimers.push(setTimeout(() => { mostradas = colecc.length; pintarBarra(); }, dur + 20)); }
  pintarBarra();
}

function pintar() {
  if (!e) return;
  const m = $("mesa"); m.replaceChildren();
  const { H, gap, w, h, x0 } = medidas(); // también deja listo el alto de la barra
  pintarBarra();
  const letra = Math.max(10, w * 0.3);
  // Zonas con recuadro: el tramo bloqueado (rojo) o la pista (origen verde + destino verde punteado)
  const zonas = [];
  if (alertaMal) zonas.push(alertaMal);
  if (pista && pista.tipo === "mover") {
    const nd = e.cols[pista.a].length;
    zonas.push({ c: pista.de, desde: pista.desde, hasta: e.cols[pista.de].length - 1, clase: "zona-pista" },
               { c: pista.a, desde: nd - 1, hasta: nd - 1, clase: "zona-pista zona-dest" }); // nd = 0 → columna vacía (-1)
  }
  for (let c = 0; c < 10; c++) {
    const col = document.createElement("div");
    col.className = "col"; col.style.left = x0 + c * (w + gap) + "px"; col.style.width = w + "px";
    col.addEventListener("click", (ev) => { const k = ev.target.closest(".carta"); tocar(c, k ? +k.dataset.i : -1); });
    const hueco = document.createElement("div"); hueco.className = "hueco"; hueco.style.width = w + "px"; hueco.style.height = h + "px";
    col.appendChild(hueco);
    const cartas = e.cols[c], o = e.ocultas[c];
    const total = h + o * 0.13 * h + Math.max(0, cartas.length - o - 1) * 0.3 * h;
    const f = total > H ? Math.max(0.35, (H - h) / (total - h)) : 1;
    let y = 0;
    const ys = []; // y de cada carta (para colocar los recuadros)
    for (const z of zonas) if (z.c === c && z.hasta < 0) col.appendChild(marco(z, ys, h, w, true)); // columna vacía
    cartas.forEach((carta, i) => {
      ys.push(y);
      const d = document.createElement("div"), oculta = i < o;
      d.className = "carta" + (oculta ? " dorso" : ROJO[palo(carta)] ? " roja" : "") + (sel && sel.c === c && i >= sel.i ? " sel" : "");
      d.dataset.i = i; d.style.top = y + "px"; d.style.width = w + "px"; d.style.height = h + "px"; d.style.fontSize = letra + "px";
      if (!oculta) d.innerHTML = contenido(carta, w);
      col.appendChild(d);
      y += (oculta ? 0.13 : 0.3) * h * f;
      // El recuadro llega hasta donde empieza la carta siguiente: lo que estorba (las cartas de abajo) queda SIN recuadro
      const alFinal = i === cartas.length - 1;
      for (const z of zonas) if (z.c === c && z.hasta === i) col.appendChild(marco(z, ys, alFinal ? ys[i] + h : y, w, alFinal));
    });
    m.appendChild(col);
  }
  $("c-movs").textContent = e.movs;
  $("n-rep").textContent = 5 - e.rep; $("b-repartir").disabled = e.rep >= 5;
  $("b-repartir").classList.toggle("alerta-rep", !!(pista && pista.tipo === "repartir")); // sin movimientos: parpadea el reparto
  pintarAyudas();
  const rt = nivel ? recDe(nivel).t : prog.mejor[llave(e.palos, e.dif)]; // mejor tiempo del nivel (o de esta combinación de palos y dificultad en el Modo libre)
  $("c-mejor").textContent = rt ? formato(rt) : "–";
  $("c-estado").textContent = "Series " + e.hechos + "/" + SERIES;
  $("c-estado").title = nivel ? "Series terminadas" : verificada ? "Series terminadas · ✔ este reparto tiene solución comprobada" : "Series terminadas · 🎲 reparto al azar (sin comprobar)";
  $("c-tiempo").textContent = formato(segundos());
}
// Botones ↶ y 💡: gratis (sin precio) o de pago (precio en la esquina, cuántos quedan junto al nombre; se apagan al llegar al tope o si no alcanzan las monedas)
function pintarAyudas() {
  const rp = retroPaga(), pp = pistaPaga(), bd = $("b-deshacer"), bp = $("b-pista");
  bd.hidden = !hayRetro();
  bd.disabled = !historial.length || (!!rp && (usos.retro >= rp.tope || monedas() < rp.precio));
  $("t-deshacer").textContent = rp ? "Retroceder " + (rp.tope - usos.retro) : "Deshacer";
  $("p-deshacer").hidden = !rp; if (rp) $("p-deshacer").textContent = rp.precio;
  bd.title = rp ? "Deshace tu última jugada: " + rp.precio + " monedas. Quedan " + (rp.tope - usos.retro) + " en este nivel" : "Deshacer la última jugada";
  bp.disabled = !!pp && (usos.pista >= pp.tope || monedas() < pp.precio);
  $("t-pista").textContent = pp ? "Pista " + (pp.tope - usos.pista) : "Pista";
  $("p-pista").hidden = !pp; if (pp) $("p-pista").textContent = pp.precio;
  bp.title = pp ? "Muestra un movimiento: " + pp.precio + " monedas. Quedan " + (pp.tope - usos.pista) + " en este nivel" : "Muestra un movimiento";
}
// Recuadro (div .zona) que rodea las cartas desde la posición «desde» hasta «hasta» de una columna. y2 = donde termina; alFinal = incluye la última carta
function marco(z, ys, y2, w, alFinal) {
  const d = document.createElement("div");
  d.className = "zona " + z.clase;
  const y1 = z.desde < 0 ? 0 : ys[z.desde];
  d.style.left = "-2px"; d.style.width = w + 4 + "px";
  d.style.top = y1 - 2 + "px"; d.style.height = y2 - y1 + 2 + (alFinal ? 2 : 0) + "px";
  if (z.t) d.style.animationDelay = "-" + (Date.now() - z.t) / 1000 + "s"; // si se vuelve a pintar, el parpadeo sigue donde iba
  return d;
}
// Cualquier toque del jugador: reinicia la cuenta de inactividad y quita la pista que estuviera puesta
function actividad() { ultimaAccion = Date.now(); pista = null; }

// Quiso tomar la carta «i» de la columna «c», pero hay cartas debajo que no encajan en la escalera: se rodea de rojo (triple parpadeo)
// SOLO el tramo que quiso mover, hasta la carta donde se rompe la escalera. Las cartas que estorban no se resaltan.
function marcarBloqueo(c, i) {
  const col = e.cols[c];
  let j = i + 1;
  while (j < col.length && palo(col[j - 1]) === palo(col[j]) && rango(col[j - 1]) === rango(col[j]) + 1) j++;
  alertaMal = { c, desde: i, hasta: j - 1, clase: "zona-mal", t: Date.now() };
  clearTimeout(marcarBloqueo.id);
  marcarBloqueo.id = setTimeout(() => { alertaMal = null; if (pantalla === "juego") pintar(); }, 1300);
}

// Huella de una posición (no depende del orden de las columnas): sirve para saber si una jugada nos regresa a algo que ya pasó
function clave(x) {
  return x.cols.map((c, i) => x.ocultas[i] + ":" + c.join(",")).sort().join("|") + "#" + x.rep + "," + x.hechos;
}
// ¿Mover el tramo de la columna j.de a la j.a es un BUCLE (no avanza nada)? Pasa cuando el tramo ya está sobre una carta que le sirve
// (p. ej. 10-9-8-7-6 ya sobre una J) y se pasa a otra J igual: solo vale la pena si junta el palo o arma una escalera más larga.
// n = estado después de la jugada. (Las que quitan serie, destapan una carta o vacían la columna siempre avanzan.)
function esBucle(e, j, n) {
  if (n.hechos > e.hechos || j.rev || j.vacia) return false;
  const col = e.cols[j.de], base = col[col.length - j.k], x = col[col.length - j.k - 1];
  if (x === undefined || rango(x) !== rango(base) + 1) return false; // estaba sobre una carta que NO le correspondía: acomodarla sí mejora
  return !(largoTramo(n, j.a) > Math.max(largoTramo(e, j.de), largoTramo(e, j.a)));
}

// Pista tras 15 s sin tocar nada. Se ignoran los bucles (esBucle) y las jugadas que regresan a una posición ya vista. Orden: 1) un movimiento que sirve (quita serie, destapa, junta mismo palo),
// 2) si no hay, parpadea «Repartir» en amarillo oscuro, 3) si tampoco se puede repartir, un movimiento menor (p. ej. a columna vacía).
function calcularPista() {
  ultimaAccion = Date.now(); // si no hay nada que sugerir, vuelve a intentarlo en 15 s
  let mejor = null, pm = 0, otra = null, po = 0;
  for (const j of jugadas(e)) {
    const n = clonar(e); mover(n, j.de, j.k, j.a);
    if (vistos.has(clave(n)) || esBucle(e, j, n)) continue; // bucle: no se sugiere
    const util = n.hechos > e.hechos || j.rev || j.mismo;
    const p = (n.hechos > e.hechos ? 1000 : 0) + (j.rev ? 200 : 0) + (j.mismo ? 40 + j.k : 0) + (j.vacia ? 5 : 1);
    if (util) { if (p > pm) { pm = p; mejor = j; } }
    else if (p > po) { po = p; otra = j; }
  }
  const j = mejor || (puedeRepartir(e) ? null : otra);
  if (j) { pista = { tipo: "mover", de: j.de, desde: e.cols[j.de].length - j.k, a: j.a }; aviso("💡 Pista: mira el recuadro verde"); }
  else if (puedeRepartir(e)) { pista = { tipo: "repartir" }; aviso("🃏 Solo quedan movimientos que dan vueltas: toca Repartir"); }
  else { aviso(e.rep < 5 ? "Llena las columnas vacías para poder repartir" : "Ya no hay movimientos posibles"); return false; }
  pintar();
  return true; // dio una pista (el botón 💡 de pago solo cobra si fue así)
}

function tocar(c, i) {
  if (pantalla !== "juego" || fin || pausado) return;
  actividad();
  if (sel) {
    if (sel.c !== c) {
      const k = e.cols[sel.c].length - sel.i;
      if (puedeMover(e, sel.c, k, c)) { const de = sel.c; jugar(() => mover(e, de, k, c), { de, k, a: c }); return; }
    } else if (i < 0 || i === sel.i) { sel = null; pintar(); return; }
    sel = null;
  }
  if (i >= 0 && tramoValido(c, i)) sel = { c, i };
  else if (i >= 0 && i >= e.ocultas[c]) marcarBloqueo(c, i); // carta visible pero bloqueada por las de abajo
  pintar();
}
$("b-repartir").addEventListener("click", () => {
  if (pantalla !== "juego" || fin || pausado) return;
  actividad();
  if (e.rep >= 5) return;
  if (!puedeRepartir(e)) { aviso("Llena las columnas vacías antes de repartir"); pintar(); return; }
  jugar(() => repartir(e), { rep: true });
});
$("b-pista").addEventListener("click", () => {
  if (pantalla !== "juego" || fin || pausado) return;
  const pp = pistaPaga();
  if (pp && (usos.pista >= pp.tope || monedas() < pp.precio)) return;
  if (calcularPista()) { usos.p++; if (pp) { gastar(pp.precio); usos.pista++; pintar(); } } // solo cobra (y cuenta) si de verdad hubo una pista
});
$("b-deshacer").addEventListener("click", () => {
  if (pantalla !== "juego" || fin || pausado || !historial.length) return;
  const rp = retroPaga();
  if (rp) { if (usos.retro >= rp.tope || !gastar(rp.precio)) return; usos.retro++; }
  usos.r++;
  actividad(); cancelarAnim(); e = historial.pop(); colecc.length = Math.min(colecc.length, e.hechos); mostradas = colecc.length; sel = null; pintar(); });
addEventListener("resize", () => { if (pantalla === "juego") { pintar(); colocarResultado(); } });
setInterval(() => {
  if (pantalla !== "juego" || !e || fin || pausado) return;
  $("c-tiempo").textContent = formato(segundos());
  if (!pista && pistaAuto() && Date.now() - ultimaAccion >= PISTA_MS) calcularPista(); // 15 s sin tocar nada
}, 500);

// ---------- Ventanas de pausa (13.6 y 13.7). Mientras están abiertas el reloj se detiene y los toques no mueven cartas ----------
// Niveles: «¿Salir?» → Seguir jugando · Salir al mapa (se pierde lo avanzado; se reinicia saliendo y entrando o con «Repetir nivel» al ganar).
// Modo libre: «Pausa» → Seguir jugando · Salir a elegir tablero (no se pierde ningún récord).
const alAbrirPausa = () => { acum = segundos(); t0 = 0; pausado = true; };
const alContinuarPausa = () => { pausado = false; ultimaAccion = Date.now(); if (acum > 0 || e.movs) t0 = Date.now(); };
const pausaNivel = crearMenuPausa({
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este nivel. Las monedas que gastaste no vuelven.",
  puedeAbrir: () => pantalla === "juego" && !fin && !!nivel,
  alAbrir: alAbrirPausa,
  alContinuar: alContinuarPausa,
  alSalir: () => { pausado = false; irMenu(); },
});
const pausaLibre = crearMenuPausa({
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: "La partida termina; no se pierde ningún récord.",
  puedeAbrir: () => pantalla === "juego" && !fin && !nivel,
  alAbrir: alAbrirPausa,
  alContinuar: alContinuarPausa,
  alSalir: () => { pausado = false; mostrar("libre"); },
});
$("barra-juego").addEventListener("click", () => { if (pantalla === "juego" && !fin) (nivel ? pausaNivel : pausaLibre).abrir(); }); // el botón verde del nombre
$("btn-mapa-juego").addEventListener("click", () => { if (pantalla === "juego" && !fin) pausaNivel.abrir(); else if (pantalla === "juego") irMenu(); }); // 🗺️: pregunta «¿Salir?» y, si se confirma, abre el mapa
// ☰ (13.3): vista interna del mapa → «Atrás» a la vista del país · partida en curso → su ventana de pausa · lo demás (opciones del Modo libre, fin de nivel) → el mapa
btnMenu.addEventListener("click", () => {
  if (pantalla === "mapa" && !mapa.esPrincipal()) mapa.principal();
  else if (pantalla === "juego" && !fin) (nivel ? pausaNivel : pausaLibre).abrir();
  else irMenu();
});
// Esc dentro del mapa sube un paso (como el ☰ «Atrás»)
addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape" || ev.repeat || pantalla !== "mapa" || !infoFondo.hidden || mapa.esPrincipal()) return;
  ev.preventDefault(); mapa.principal();
});

// ---------- ⚙️ Ajustes (13.8): se abre desde la pantalla de inicio ----------
const MOSTRAR_BORRAR_HISTORIAL = true; // BOTÓN TEMPORAL DE PRUEBAS: «Borrar todo el historial y reiniciar». DEBE quedar en false antes de pasar Spider a la zona «Juegos»
// Borra en este dispositivo el progreso (niveles, estrellas, monedas, récords) y los puntos pendientes de Spider y, con sesión, deja vacío el de la cuenta
// (si no, la sincronización lo volvería a traer). NO toca los puntos que el perfil del portal ya recibió. Devuelve true / false (no se pudo en la cuenta) / null (sin sesión).
async function borrarHistorial() {
  reiniciando = true;
  prog = { niv: { max: 1, hecho: 0 }, mejor: {}, rec: {}, ganadas: 0, cartera: carteraVacia(), t: 0 };
  try { localStorage.removeItem(CLAVE); } catch (err) {}
  try { guardarCola(leerCola().filter((x) => x.j !== "spider")); } catch (err) {}
  try {
    const { auth, db } = await import("../compartido/firebase.js");
    if (!auth || !auth.currentUser || !db) return null;
    const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js");
    const ref = doc(db, "progreso", auth.currentUser.uid, "juegos", "spider");
    await Promise.race([setDoc(ref, { datos: JSON.stringify(unirProgresoSpider(prog, null)), actualizado: serverTimestamp() }), new Promise((_, no) => setTimeout(() => no(new Error("lento")), 8000))]);
    return true;
  } catch (err) { console.warn("borrar historial (nube):", err.code || err.message); return false; }
}
let ajustesAbierto = false;
function abrirAjustes() {
  if (ajustesAbierto) return;
  ajustesAbierto = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Ajustes");
  const panel = el("div", "pausa-panel aj-panel");
  const nota = el("p", "aj-nota"); nota.setAttribute("role", "status"); nota.hidden = true;
  const lista = el("div", "pausa-opciones");
  const decir = (t) => { nota.textContent = t; nota.hidden = !t; };
  let ocupado = false;
  const tecla = (ev) => { if (ev.key === "Escape" && !ocupado) { ev.preventDefault(); ev.stopPropagation(); cerrar(); } };
  function cerrar() {
    fondo.remove(); removeEventListener("keydown", tecla, true); ajustesAbierto = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (err) {}
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (ev) => { if (ev.target === fondo && !ocupado) cerrar(); });
  const boton = (icono, texto, clase, fn) => {
    const b = el("button", "b3d txt " + clase); b.type = "button";
    if (icono) b.append(el("span", "b-ico", icono));
    b.append(el("span", "", texto));
    b.addEventListener("click", fn);
    lista.appendChild(b);
    return b;
  };
  boton("ℹ️", "Cómo se juega", "b-azul", () => { cerrar(); abrirInfo(); });
  boton("💾", "Copia de seguridad", "b-oro", () => { cerrar(); import("../compartido/almacen.js").then((m) => m.abrirPanelCopias()).catch(() => aviso("No se pudo abrir la copia de seguridad.")); });
  if (MOSTRAR_BORRAR_HISTORIAL) {
    const TXT = "Borrar todo el historial y reiniciar";
    const borrar = boton("🗑️", TXT, "b-rojo", async () => {
      if (ocupado) return;
      if (!borrar.dataset.seguro) { // primer toque: pide confirmar (sin confirm())
        borrar.dataset.seguro = "1"; borrar.lastChild.textContent = "¿Seguro? Toca otra vez para borrar TODO";
        decir("Se borran los niveles, estrellas, monedas y récords (en este dispositivo y en tu cuenta). Es solo para pruebas.");
        setTimeout(() => { if (!ocupado) { delete borrar.dataset.seguro; borrar.lastChild.textContent = TXT; } }, 5000);
        return;
      }
      ocupado = true;
      for (const b of lista.querySelectorAll("button")) b.disabled = true;
      decir("Borrando…");
      const enNube = await borrarHistorial();
      decir(enNube === false ? "Se borró en este dispositivo, pero no se pudo borrar en tu cuenta: al iniciar sesión se volverá a bajar. Reinténtalo con internet." : "✅ Listo. Reiniciando el juego…");
      setTimeout(() => location.reload(), enNube === false ? 3500 : 900);
    });
  }
  const cerrarB = boton("", "Cerrar", "b-cielo", () => cerrar());
  panel.append(el("h2", "", "⚙️ Ajustes"), nota, lista);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  try { lista.querySelector("button").focus({ preventScroll: true }); } catch (err) {}
}

mostrar("inicio"); // única vez que se ve la pantalla de inicio: al abrir el juego
