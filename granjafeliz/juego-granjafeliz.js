// Ruta: granjafeliz/juego-granjafeliz.js
// Granja feliz (estilo Farm Frenzy), horizontal. Menú estándar + mapa de 22 600 niveles (por ahora existen los niveles 1 a 10 de Farm Frenzy 1) + ♾️ Modo libre: dos modos (Juego original / Mod de Polo) y una pantalla de ajustes
// con barra de dificultad (5 pasos), barra de tamaño de la granja (4, 6 o 10 espacios de edificio) y dinero inicial de pruebas; sin metas ni tiempo, sin monedas; solo guarda una marca.
// Modelo del original: cada nivel tiene una lista de METAS (dinero, producto, animal, edificio; ver datos-granjafeliz.js); el tiempo no limita, solo da medalla (oro/plata/completado).
// Id de puntos: "granjafeliz". Datos en datos-granjafeliz.js; estrellas y monedas en economia-granjafeliz.js.
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import * as eco from "./economia-granjafeliz.js";
import * as D from "./datos-granjafeliz.js";
import * as ES from "./escena-granjafeliz.js";   // aspecto del escenario (terreno, edificios, posiciones)
import { crearPanelAlmacen } from "./panel-almacen-granjafeliz.js";   // ventana «Enviar productos» (se abre al tocar el almacén)
import { sinSalida, SEG_REVISAR, SEG_CONFIRMAR } from "./salida-granjafeliz.js";   // condición de derrota (función pura)
import { crearTutorial, tutorialPendiente, tieneTutorial } from "./tutorial-granjafeliz.js";   // tutorial guiado de los niveles 1 a 3 (flechas y pasos)

const ETAPAS = crearEtapas({ porEtapa: 100 });
const $ = (id) => document.getElementById(id);
const pantallas = { menu: $("pantalla-menu"), libre: $("pantalla-libre"), config: $("pantalla-config") };
const btnMenu = $("btn-menu"), cv = $("c"), ctx = cv.getContext("2d"), cajaFin = $("fin");
const L = ES.LAYOUT;   // tamaño actual de la granja (800×450 el original; ver TAMANOS en escena-granjafeliz.js): se actualiza con aplicarTamano()

let donde = "menu", J = null, nube = null, tAviso = 0;
const pintarMonedas = () => { $("n-monedas").textContent = eco.saldo().toLocaleString("es-MX"); if (donde === "juego") medirReserva(); };
function avisar(t, ms = 2600) { const a = $("aviso-granja"); a.textContent = t; a.hidden = false; clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, ms); }

// ---------- Navegación ----------
function ir(nombre) {
  mapa.cerrar(); donde = nombre; cajaFin.hidden = true;
  for (const k in pantallas) pantallas[k].hidden = k !== nombre;
  cv.hidden = nombre !== "juego";
  document.body.classList.toggle("en-juego", nombre === "juego");
  btnMenu.hidden = nombre === "menu";
  $("txt-menu").textContent = nombre === "juego" ? "Pausa" : "Menú principal"; // dentro de la partida: Pausa (estándar)
  if (nombre === "config") pintarConfig();
  if (nombre === "juego") ajustar();
}
function abrirMapa(n) { ir("menu"); for (const k in pantallas) pantallas[k].hidden = true; btnMenu.hidden = false; $("txt-menu").textContent = "Menú principal"; donde = "mapa"; mapa.abrir(n); }

const mapa = montarMapa({
  prefijo: "granjafeliz", etapas: ETAPAS, progreso: () => eco.avanceMapa(),
  jugarNivel: (n) => (D.NIVELES[n] ? empezar(n) : avisar("El nivel " + n + " todavía no está creado")),
  infoNivel: (n) => { const s = eco.estrellasDeNivel(n); return { sub: s ? eco.estrellasTexto(s) : "", clase: s === 3 ? "b-oro" : s ? "b-verde" : "b-azul", aria: eco.MEDALLAS[s] || "sin medalla" }; },
  leyenda: "Ganas 15, 30 o 45 monedas según tu medalla (completado, plata u oro) la primera vez que la consigues",
});

const pausa = crearMenuPausa({
  puedeAbrir: () => donde === "juego" && J && !J.fin && !panelAlm.abierto(),
  alAbrir: () => { J.pausa = true; }, alContinuar: () => { J.pausa = false; },
  extras: () => (J.libre
    ? [{ icono: "🏁", texto: "Terminar partida", clase: "b-oro", ayuda: J.sinRecord ? "Partida de prueba: no cuenta para el récord" : "Tu récord ya está guardado", alElegir: terminarLibre }, { icono: "🔄", texto: "Empezar de nuevo", clase: "b-azul", alElegir: () => empezarLibre() }]
    : [...(tieneTutorial(J.n) ? [{ icono: "❓", texto: "Ver el tutorial", clase: "b-oro", alElegir: () => { J.pausa = false; J.tut = crearTutorial(J.n); } }] : []),
       { icono: "🔄", texto: "Repetir nivel", clase: "b-azul", alElegir: () => empezar(J.n) }]),
  alSalir: () => (J.libre ? ir("config") : abrirMapa(J.n)),
});
btnMenu.addEventListener("click", () => (donde === "juego" ? pausa.abrir() : ir("menu")));

// ♾️ Modo libre. Paso 1: elegir el modo (D.MODOS: Juego original / Mod de Polo). Paso 2 (pantalla «config»): barra de DIFICULTAD (los 5 pasos de D.LIBRE), barra de TAMAÑO de la granja
// (ES.TAMANOS: 4, 6 o 10 espacios de edificio) y DINERO inicial (solo pruebas: si no es el de la dificultad, la partida NO guarda récord). Las elecciones se recuerdan mientras la página esté abierta.
const DIF_IDS = Object.keys(D.LIBRE), TAM_IDS = ES.ORDEN_TAMANOS;
const AJ = { modo: "original", dif: 2, tam: 0, dinero: null };   // dinero: null = el de la dificultad
const fmt = (n) => Number(n).toLocaleString("es-MX");
const dineroBase = () => D.LIBRE[DIF_IDS[AJ.dif]].dineroInicial;
const dineroInicial = () => (AJ.dinero == null ? dineroBase() : AJ.dinero);
// Clave de la marca (eco.registrarLibre): Juego original + tamaño Original = solo la dificultad (las marcas de antes); las demás combinaciones llevan modo_tamaño_dificultad
const claveLibre = () => (AJ.modo === "original" && AJ.tam === 0 ? DIF_IDS[AJ.dif] : [AJ.modo, TAM_IDS[AJ.tam], DIF_IDS[AJ.dif]].join("_"));
function elegirModo(modo) { AJ.modo = modo; AJ.tam = TAM_IDS.indexOf(D.MODOS[modo].tam); ir("config"); }
function pintarConfig() {
  const M = D.MODOS[AJ.modo], base = D.LIBRE[DIF_IDS[AJ.dif]], T = ES.TAMANOS[TAM_IDS[AJ.tam]], prueba = dineroInicial() !== dineroBase(), inD = $("cfg-dinero");
  $("cfg-titulo").textContent = M.icono + " " + M.nombre;
  $("cfg-dif").value = AJ.dif; $("cfg-dif-txt").textContent = base.nombre; $("cfg-dif-ayuda").textContent = base.pista || "";
  $("cfg-tam").value = AJ.tam; $("cfg-tam-txt").textContent = T.nombre;
  $("cfg-tam-ayuda").textContent = T.edificios + " espacios para edificios" + (AJ.tam === 0 ? " · el tamaño de los niveles" : "");
  if (document.activeElement !== inD) inD.value = dineroInicial();   // sin pisar lo que se está escribiendo
  $("cfg-dinero-ayuda").textContent = prueba ? "Partida de prueba: no guarda récord" : "El de esta dificultad";
  const m = eco.mejorLibre(claveLibre());
  $("cfg-record").textContent = prueba ? "🧪 Prueba · sin récord" : "🏆 Récord con estos ajustes: " + (m ? "$" + fmt(m) : "sin récord");
  $("cfg-aviso").hidden = AJ.modo !== "polo"; $("cfg-aviso").textContent = M.nota;
}
$("cfg-dif").oninput = (e) => { AJ.dif = Number(e.target.value); pintarConfig(); };
$("cfg-tam").oninput = (e) => { AJ.tam = Number(e.target.value); pintarConfig(); };
$("cfg-dinero").oninput = (e) => {
  const v = e.target.value.trim(), n = Math.min(D.DINERO_MAX, Math.max(0, Math.floor(Number(v))));
  AJ.dinero = v === "" || !isFinite(n) || n === dineroBase() ? null : n;
  pintarConfig();
};
$("cfg-dinero").onblur = () => { $("cfg-dinero").value = dineroInicial(); };
$("cfg-reset").onclick = () => { AJ.dinero = null; $("cfg-dinero").value = dineroBase(); pintarConfig(); };
$("cfg-jugar").onclick = () => empezarLibre();
$("btn-original").onclick = () => elegirModo("original");
$("btn-polo").onclick = () => elegirModo("polo");
$("btn-libre").onclick = () => ir("libre");
$("btn-niveles").onclick = () => abrirMapa(eco.avanceMapa().max);
$("btn-mapa").onclick = () => abrirMapa();

// ---------- Escenario ----------
// Posiciones y dibujo del escenario (cámara 3/4 como Farm Frenzy): ver escena-granjafeliz.js. CAMPO = por dónde caminan animales y osos y dónde se planta.
const { CAMPO, CAJAS } = ES;
// Franja «⬆ mejorar» al pie de las cajas de Pozo, Almacén y Camión (28 de alto para que se pueda tocar bien en el celular)
const franja = (c) => ({ x: c.x, y: c.y + c.h - 28, w: c.w, h: 28 });
const FRANJAS = {};
const recalcularFranjas = () => { for (const q in CAJAS) FRANJAS[q] = franja(CAJAS[q]); };
// Cambia el tamaño de la granja (ES.usarTamano reacomoda escena, cajas, espacios y botones) y el del lienzo. Los niveles usan siempre «pequeno» (el original).
function aplicarTamano(id) { ES.usarTamano(id); cv.width = L.ANCHO * 2; cv.height = L.ALTO * 2; recalcularFranjas(); }
aplicarTamano("pequeno");
// Edificios (nivel con NIVELES[n].edificios; hasta 4 en el tamaño original, 6 en el mediano y 10 en el grande, ver ES.ranuraEdificio): 0 izquierda-arriba, 1 derecha-arriba, 2 izquierda-segunda fila, 3 derecha-segunda fila… Arriba la casa (se toca para procesar), abajo la franja «⬆ mejorar» (26).
const espacio = (i) => ES.ranuraEdificio(i);
const espacioMejora = (r) => ({ x: r.x, y: r.y + r.h - 26, w: r.w, h: 26 });
const limiteY = () => CAMPO.y + CAMPO.h - 6; // hasta dónde caminan los animales
const dentro = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const azar = (a, b) => a + Math.random() * (b - a);

let limiteDer = 0;   // x (en unidades del escenario) hasta donde puede llegar el reloj de la barra sin quedar tapado por el chip de monedas del portal
function medirReserva() {
  const h = document.querySelector(".hud-der"), r = cv.getBoundingClientRect();
  limiteDer = L.ANCHO - 28;
  if (!h || !r.width) return;
  const c = h.getBoundingClientRect();
  if (c.bottom > r.top && c.top < r.top + 48 * (r.height / L.ALTO) && c.left < r.right) limiteDer = Math.min(limiteDer, (c.left - r.left) / (r.width / L.ANCHO) - 10);
}
function ajustar() { // el escenario 16:9 ocupa el espacio libre (deja libres las esquinas de los botones fijos)
  const aw = innerWidth - 150, ah = innerHeight - 12, s = Math.min(aw / L.ANCHO, ah / L.ALTO);
  cv.style.width = L.ANCHO * s + "px"; cv.style.height = L.ALTO * s + "px";
  cv.style.left = 140 + (aw - L.ANCHO * s) / 2 + "px"; cv.style.top = (innerHeight - L.ALTO * s) / 2 + "px";
  medirReserva();
  if (J && J.fin) colocarFin();
}
addEventListener("resize", ajustar);

function nuevoAnimal(tipo) { return { tipo, x: azar(CAMPO.x + 30, CAMPO.x + CAMPO.w - 30), y: azar(CAMPO.y + 40, limiteY() - 10), vida: D.SEG_VIDA, prod: azar(0, 0.5), est: "vaga", t: 0, dest: null, objetivo: null }; }
const empezar = (n) => arrancar(n, D.NIVELES[n], null);
// Modo libre: la dificultad es un «nivel» a medida (D.LIBRE[id]) sin metas ni tiempo. J.libre guarda la clave de la marca (claveLibre; null en los niveles); J.sinRecord = el dinero inicial se cambió (prueba).
// Tamaño original: los edificios son los de la dificultad. Mediano y grande: se llenan todos los espacios repitiendo los edificios de la dificultad en orden (por ahora solo hay 4 tipos; los nuevos llegan con el Mod de Polo).
function edificiosLibre(base, tam) {
  const propios = base.edificios || [], n = ES.TAMANOS[tam].edificios;
  if (tam === "pequeno") return propios.slice(0, n);   // el Original solo tiene 4 espacios: si la dificultad lista más (batidora y quesería van al final), esos no se ponen
  const tipos = propios.length ? propios : Object.keys(D.EDIFICIOS);
  return Array.from({ length: n }, (_, i) => tipos[i % tipos.length]);
}
function empezarLibre() {
  const base = D.LIBRE[DIF_IDS[AJ.dif]], tam = TAM_IDS[AJ.tam], T = ES.TAMANOS[tam], M = D.MODOS[AJ.modo], dinero = dineroInicial();
  const N = { ...base, metas: [], dineroInicial: dinero, edificios: edificiosLibre(base, tam), nombre: base.nombre + " · " + M.nombre + (tam === "pequeno" ? "" : " · " + T.nombre) };
  arrancar(0, N, claveLibre(), { tam, modo: AJ.modo, prueba: dinero !== base.dineroInicial });
}
function arrancar(n, N, libre, opc = {}) {
  aplicarTamano(libre ? opc.tam : "pequeno");
  J = { n, N, libre, modo: opc.modo || null, sinRecord: !!opc.prueba, mejorInicial: libre && !opc.prueba ? eco.mejorLibre(libre) : 0, avisoRecord: false, t: 0, dinero: N.dineroInicial, ventas: 0, rec: {}, agua: D.MEJORAS.pozo.capacidad[(N.mejoras && N.mejoras.pozo) || 0], pozo: 0, pasto: [], animales: [], suelo: [], almacen: {}, camion: 0, pago: 0, mejoras: { almacen: (N.mejoras && N.mejoras.almacen) || 0, camion: (N.mejoras && N.mejoras.camion) || 0, pozo: (N.mejoras && N.mejoras.pozo) || 0 }, osos: [], proxOso: N.osos ? (N.osos.horario ? Infinity : (N.osos.primero ?? D.PRIMER_OSO)) : Infinity, horario: N.osos && N.osos.horario ? [...N.osos.horario] : null, perro: null, gato: (N.regalo || []).includes("gato") ? { x: CAMPO.x + 20, y: CAMPO.y + 60, dest: null } : null, edif: (N.edificios || []).map((id) => ({ id, nivel: (N.construidos || []).includes(id) ? 0 : -1, trab: 0, dur: 0, lote: 0 })), flot: [], revisa: 0, sinSalidaSeg: 0, fin: false, pausa: false };
  J.tut = !libre && tutorialPendiente(n, eco.estrellasDeNivel(n)) ? crearTutorial(n) : null;   // tutorial guiado: solo la primera vez y mientras no se pase el nivel
  for (const tipo in N.animales) for (let i = 0; i < N.animales[tipo]; i++) J.animales.push(nuevoAnimal(tipo));
  ir("juego");
  if (libre) avisar("♾️ Modo libre · " + N.nombre + ": sin metas ni tiempo; " + (opc.prueba ? "partida de prueba: no guarda récord." : "tu récord es lo que vendes en una partida.") + "\n" + (N.pista || ""), 7000);
  else avisar("Metas: " + N.metas.map(textoMeta).join(" · ") + (N.pista && !J.tut ? "\n" + N.pista : ""), N.pista && !J.tut ? 7000 : 3500);   // con tutorial guiado no se repite la pista de texto
}

function flotar(x, y, txt) { J.flot.push({ x, y, txt, t: 1.2 }); }
// Regalos de inicio (NIVELES[n].regalo): el gato ya viene contigo; las llamadas al perro son gratis
const regalo = (x) => !!(J && J.N.regalo && J.N.regalo.includes(x));
const costoPerro = () => (regalo("perro") ? 0 : D.PERRO.costo);
// ---------- Metas del nivel ----------
// avanceMeta(m) → { actual, objetivo, icono }. El nivel termina cuando TODAS están cumplidas (el tiempo solo da medalla).
function avanceMeta(m) {
  if (m.tipo === "dinero") return { actual: J.ventas, objetivo: m.n, icono: "💰" };
  if (m.tipo === "producto") return { actual: J.rec[m.id] || 0, objetivo: m.n, icono: D.PRODUCTOS[m.id].emoji };
  if (m.tipo === "animal") return { actual: J.animales.filter((a) => a.tipo === m.id).length, objetivo: m.n, icono: D.ANIMALES[m.id].emoji };
  if (m.tipo === "edificio") return { actual: J.edif.some((e) => e.id === m.id && e.nivel >= 0) ? 1 : 0, objetivo: 1, icono: D.EDIFICIOS[m.id].emoji };
  return { actual: 0, objetivo: 1, icono: "❔" };
}
const metasCumplidas = () => J.N.metas.every((m) => { const a = avanceMeta(m); return a.actual >= a.objetivo; });
function textoMeta(m) {
  if (m.tipo === "dinero") return "vender $" + m.n.toLocaleString("es-MX");
  if (m.tipo === "producto") return "recoger " + m.n + " " + D.PRODUCTOS[m.id].nombre.toLowerCase();
  if (m.tipo === "animal") return "tener " + m.n + " " + D.ANIMALES[m.id].nombre.toLowerCase();
  if (m.tipo === "edificio") return "construir " + D.EDIFICIOS[m.id].nombre.toLowerCase();
  return "?";
}
// Medalla que llevas AHORA según el tiempo (0 a 3 → ver eco.MEDALLAS)
const medallaAhora = () => eco.estrellasDe({ gano: true, segundos: J.t, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] });
// Todo producto que entra al almacén pasa por aquí (así cuenta para las metas de «producto»)
function aAlmacen(tipo) { J.almacen[tipo] = (J.almacen[tipo] || 0) + 1; J.rec[tipo] = (J.rec[tipo] || 0) + 1; }
// Dos números por producto (datos-granjafeliz.js → PRODUCTOS): «espacio» = lo que ocupa en el ALMACÉN y «peso» = lo que pesa en el CAMIÓN (sale de las cajas de Farm Frenzy 1: caja = 30 puntos).
const pesoAlm = (k) => D.PRODUCTOS[k].espacio;
const pesoCam = (k) => D.PRODUCTOS[k].peso;
const pesoAlmacen = () => Object.keys(J.almacen).reduce((t, k) => t + J.almacen[k] * pesoAlm(k), 0);
// Mejoras de almacén, camión y pozo (datos en D.MEJORAS). J.mejoras guarda el nivel de cada una (0 = base); se reinician en cada nivel, igual que el dinero.
const capAlmacen = () => D.MEJORAS.almacen.capacidad[J.mejoras.almacen];
const capCamion = () => D.MEJORAS.camion.capacidad[J.mejoras.camion];
const segCamion = () => D.MEJORAS.camion.seg[J.mejoras.camion];
const capPozo = () => D.MEJORAS.pozo.capacidad[J.mejoras.pozo];   // cargas de agua que guarda el pozo
const pozoAuto = () => J.mejoras.pozo >= D.MEJORAS.pozo.capacidad.length - 1;   // mejora 4: rociador automático (ya no se usa el agua: cada parche cuesta recarga[4])
const costoRecarga = () => D.MEJORAS.pozo.recarga[J.mejoras.pozo];   // $ por rellenar el pozo (o por parche con el rociador), según su nivel
const costoMejora = (que) => { const n = J.mejoras[que]; return n < D.MEJORAS[que].capacidad.length - 1 ? D.MEJORAS[que].costo[n + 1] : null; }; // null = ya está al máximo
// Compra la siguiente mejora de «almacen» o «camion». Devuelve true si se compró.
function mejorar(que) {
  if (!J || J.fin || J.pausa) return false;
  const c = CAJAS[que], costo = costoMejora(que);
  if (costo == null) { flotar(c.x + c.w / 2, c.y + 20, "Nivel máximo"); return false; }
  if (J.dinero < costo) { flotar(c.x + c.w / 2, c.y + 20, "Falta dinero"); return false; }
  J.dinero -= costo; J.mejoras[que]++; flotar(c.x + c.w / 2, c.y + 20, "¡Mejorado!");
  return true;
}
// Qué se llevaría el camión ahora: primero lo que más vale por peso, mientras quepa (capCamion). Se pueden mezclar productos: el peso es de todo el camión (por ejemplo 1 oso + 5 huevos). Devuelve { lleva: {producto: cantidad}, pago }
function cargaCamion() {
  let libre = capCamion(), pago = 0; const lleva = {};
  const tipos = Object.keys(J.almacen).filter((k) => J.almacen[k] > 0)
    .sort((a, b) => D.PRODUCTOS[b].valor / pesoCam(b) - D.PRODUCTOS[a].valor / pesoCam(a));
  for (const k of tipos) {
    const P = D.PRODUCTOS[k], n = Math.min(J.almacen[k], Math.floor(libre / pesoCam(k)));
    if (n > 0) { lleva[k] = n; libre -= n * pesoCam(k); pago += n * P.valor; }
  }
  return { lleva, pago };
}
// Ventana «Enviar productos» (panel-almacen-granjafeliz.js): se abre al tocar el almacén y pausa el juego mientras está abierta. A la izquierda va el almacén y a la derecha lo que cargas en el camión;
// «Enviar» manda el camión con ESA carga (tocar el camión del escenario sigue mandando la mejor carga automática). Si el camión está de viaje se puede ver el almacén pero no cargar.
const panelAlm = crearPanelAlmacen({
  productos: D.PRODUCTOS, pesoDe: pesoCam, dibujarCamion: ES.dibujarCamion,
  alAbrir: () => { J.pausa = true; }, alCerrar: () => { if (J) J.pausa = false; },
  alEnviar: (carga) => enviarCarga(carga),
  alVender: (sel) => venderSeleccion(sel),
});
// Pestaña «Animales» de la ventana: los animales vivos de la granja con lo que pagan al venderlos (VENTA_ANIMAL × precio)
const animalesDelPanel = () => {
  const r = {};
  for (const tipo of Object.keys(D.ANIMALES)) { const n = cuantos(tipo); if (n > 0) r[tipo] = { n, venta: precioVenta(tipo), nombre: D.ANIMALES[tipo].nombre, emoji: D.ANIMALES[tipo].emoji }; }
  return r;
};
const abrirAlmacen = () => panelAlm.abrir({ almacen: J.almacen, capCamion: capCamion(), camionLejos: J.camion > 0, animales: animalesDelPanel() });
// Vende varios animales a la vez (los que llevan menos producción a medias, como venderAnimal). El panel manda { tipo: cantidad }; aquí se vuelve a validar. true si se vendió.
function venderSeleccion(sel) {
  if (!J || J.fin) return false;
  let total = 0; const quitar = [];
  for (const tipo in sel) {
    const n = Math.floor(Number(sel[tipo])) || 0;
    if (!D.ANIMALES[tipo] || n < 0 || n > cuantos(tipo)) return false;
    const lista = J.animales.filter((a) => a.tipo === tipo).sort((a, b) => a.prod - b.prod).slice(0, n);
    quitar.push(...lista); total += n * precioVenta(tipo);
  }
  if (!quitar.length) return false;
  J.animales = J.animales.filter((a) => !quitar.includes(a));
  J.dinero += total; flotar(CAJAS.almacen.x + CAJAS.almacen.w / 2, CAJAS.almacen.y + 20, "+$" + total.toLocaleString("es-MX"));
  return true;
}
function enviarCarga(carga) { // vuelve a validar lo que manda el panel; true si el camión salió
  if (!J || J.fin || J.camion > 0) return false;
  let peso = 0, pago = 0;
  for (const k in carga) {
    const n = Math.floor(Number(carga[k])) || 0, P = D.PRODUCTOS[k];
    if (!P || n < 0 || n > (J.almacen[k] || 0)) return false;
    peso += n * pesoCam(k); pago += n * P.valor;
  }
  if (!(pago > 0) || peso > capCamion()) return false;
  for (const k in carga) J.almacen[k] -= Math.floor(Number(carga[k])) || 0;
  J.pago = pago; J.camion = segCamion();
  return true;
}
// Brota una ZONA de pasto (un área de matas) con D.USOS_PASTO usos; se queda dentro del campo. La usan el toque manual y el riego automático.
function plantarPasto(x, y) { J.pasto.push({ x: Math.max(CAMPO.x + 36, Math.min(CAMPO.x + CAMPO.w - 36, x)), y: Math.max(CAMPO.y + 24, Math.min(limiteY() - 14, y)), v: D.USOS_PASTO, crece: 0 }); }
// Riego automático (pozo al máximo, mejora 4): sin tocar nada, cuando hay más animales con hambre y sin pasto reservado que usos de pasto libres (contando el que ya brota),
// riega solo un parche cerca de uno de ellos y cobra costoRecarga() ($7) por parche. Sin dinero se detiene hasta que lo haya.
function riegoAutomatico(dt) {
  if (!pozoAuto()) return;
  if (J.riego > 0) { J.riego -= dt; return; }
  const necesitan = J.animales.filter((a) => a.est === "vaga" && !a.objetivo && a.vida <= D.SEG_VIDA - D.SEG_HAMBRE);
  if (!necesitan.length) return;
  let libres = 0;
  for (const p of J.pasto) { let r = 0; for (const o of J.animales) if (o.objetivo === p) r++; libres += Math.max(0, p.v - r); }
  if (necesitan.length <= libres || J.pasto.length >= D.MAX_PASTO) return;
  if (J.dinero < costoRecarga()) { if (!(J.avisoRiego > J.t)) { J.avisoRiego = J.t + 5; flotar(CAJAS.pozo.x + CAJAS.pozo.w / 2, CAJAS.pozo.y + 20, "Riego: falta dinero"); } return; }
  const a = necesitan[0];
  J.dinero -= costoRecarga(); plantarPasto(a.x + azar(-30, 30), a.y + azar(-20, 20)); J.riego = 0.5;
}
// Zona de pasto libre más cercana para este animal. Cada zona tiene v usos (D.USOS_PASTO) y cada animal que va hacia ella (o come de ella) tiene reservado uno,
// así dos animales no se pelean por el último uso. Solo cuentan las zonas ya crecidas (crece = 1). null = todo el pasto está reservado o aún brota.
function pastoLibre(a) {
  let mejor = null, md = Infinity;
  for (const p of J.pasto) {
    if (p.crece < 1) continue;
    let usado = 0;
    for (const o of J.animales) if (o !== a && o.objetivo === p) usado++;
    if (p.v - usado < 1) continue;
    const d = Math.hypot(p.x - a.x, p.y - a.y);
    if (d < md) { md = d; mejor = p; }
  }
  return mejor;
}
// ----- Osos, perro y gato (datos en D.OSOS, D.PERRO, D.GATO) -----
// Osos J.osos: { tipo, x, y, golpes, bloqueo (segundos que el perro lo tiene quieto), dest }. Se capturan tocándolos (D.OSOS[tipo].golpes clics) y dejan en el suelo su jaula.
// Perro J.perro: { fase: "viene" | "bloquea", t, ob (el oso), x, y }. Gato J.gato: { x, y, dest }.
const xAyuda = () => Math.min(L.ANCHO - 290, (limiteDer || L.ANCHO - 28) - 250);   // 🐕 y 🐈 van entre las metas y el reloj de la barra de arriba (se corren si el chip de monedas del portal empuja el reloj)
const botonesAyuda = () => {
  const b = []; let x = xAyuda();
  if (J.N.osos && J.N.perro !== false) { b.push({ id: "perro", x, y: 12, w: 70, h: 32 }); x += 76; }
  if (J.N.gato || regalo("gato")) b.push({ id: "gato", x, y: 12, w: 70, h: 32 });
  return b;
};
function nuevoOso() {
  const tipos = J.N.osos.tipos || ["oso"], tipo = tipos[Math.floor(Math.random() * tipos.length)];
  J.osos.push({ tipo, x: Math.random() < 0.5 ? CAMPO.x + 4 : CAMPO.x + CAMPO.w - 4, y: azar(CAMPO.y + 40, limiteY()), golpes: 0, bloqueo: 0, dest: null });
  flotar(CAMPO.x + CAMPO.w / 2, CAMPO.y + 20, "¡Un " + D.OSOS[tipo].nombre.toLowerCase() + "!");
}
function golpear(o) {
  const O = D.OSOS[o.tipo];
  if (++o.golpes < O.golpes) return;
  J.osos.splice(J.osos.indexOf(o), 1);
  J.suelo.push({ tipo: O.producto, x: o.x, y: o.y, t: D.SEG_JAULA });   // la jaula espera D.SEG_JAULA s: si no la guardas en el almacén, el oso se escapa
  flotar(o.x, o.y - 20, "¡Atrapado!");
}
// Vender un animal: se va el que lleva menos producción a medias (pierdes lo menos posible) y te pagan VENTA_ANIMAL × precio. No cuenta para la meta de «dinero» (solo vale lo que vende el camión).
const precioVenta = (tipo) => Math.floor(D.ANIMALES[tipo].precio * D.VENTA_ANIMAL);
function venderAnimal(b) {
  const lista = J.animales.filter((a) => a.tipo === b.tipo), cx = b.x + b.w / 2, cy = b.y + b.h + 30;
  if (!lista.length) { flotar(cx, cy, "No tienes"); return; }
  const a = lista.reduce((m, x) => (x.prod < m.prod ? x : m)), p = precioVenta(b.tipo);
  J.animales.splice(J.animales.indexOf(a), 1);
  J.dinero += p; flotar(a.x, a.y - 14, "+$" + p.toLocaleString("es-MX"));
}
function usarAyuda(id) {
  if (id === "gato") {
    if (J.gato) { flotar(580, 60, "Ya tienes gato"); return; }
    if (J.dinero < D.GATO.costo) { flotar(580, 60, "Falta dinero"); return; }
    J.dinero -= D.GATO.costo; J.gato = { x: CAMPO.x + 20, y: CAMPO.y + 60, dest: null }; return;
  }
  if (J.perro) return;
  const libres = J.osos.filter((o) => o.bloqueo <= 0);
  if (!libres.length) { flotar(530, 60, "No hay osos"); return; }
  if (J.dinero < costoPerro()) { flotar(530, 60, "Falta dinero"); return; }
  J.dinero -= costoPerro();
  const ob = libres[0], T = azar(...D.PERRO.llega);
  J.perro = { fase: "viene", t: T, T, ob, x0: CAMPO.x, y0: ob.y, x: CAMPO.x, y: ob.y };
}
const masCercano = (lista, x, y) => { let m = null, md = Infinity; for (const o of lista) { const d = Math.hypot(o.x - x, o.y - y); if (d < md) { md = d; m = o; } } return m; };
function actualizarOsos(dt) {
  if (!J.N.osos) return;
  const cada = J.N.osos.cada || D.OSOS_CADA;
  J.proxOso -= dt;
  if (J.horario) { // calendario del nivel (NIVELES[n].osos.horario): un oso por cada segundo de la lista; al acabarse siguen cayendo cada «cada» s
    while (J.horario.length && J.t >= J.horario[0]) { J.horario.shift(); nuevoOso(); }
    if (!J.horario.length) { J.horario = null; J.proxOso = azar(...cada); }
  }
  if (J.proxOso <= 0) { nuevoOso(); J.proxOso = azar(...cada); }
  for (const o of J.osos) {
    if (o.bloqueo > 0) { o.bloqueo -= dt; continue; } // el perro lo tiene quieto: no se mueve ni destruye nada
    const v = D.OSOS[o.tipo].vel, objetivo = masCercano(J.animales, o.x, o.y) || masCercano(J.pasto, o.x, o.y);
    if (!objetivo && (!o.dest || Math.hypot(o.dest.x - o.x, o.dest.y - o.y) < 6)) o.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) };
    const d_ = objetivo || o.dest, d = Math.hypot(d_.x - o.x, d_.y - o.y);
    if (d > 4) { o.x += (d_.x - o.x) / d * v * dt; o.y += (d_.y - o.y) / d * v * dt; }
    o.y = Math.min(o.y, limiteY());
    J.pasto = J.pasto.filter((p) => Math.hypot(p.x - o.x, p.y - o.y) > D.RADIO_OSO);                         // pasto en radio de 2 casillas
    J.suelo = J.suelo.filter((h) => D.PRODUCTOS[h.tipo].jaula || Math.hypot(h.x - o.x, h.y - o.y) > 24);     // productos que pisa (las jaulas no)
    const antes = J.animales.length;
    J.animales = J.animales.filter((a) => Math.hypot(a.x - o.x, a.y - o.y) > 22);                            // animales que toca
    if (J.animales.length < antes) flotar(o.x, o.y - 24, "¡Se comió un animal!");
  }
}
function actualizarPerro(dt) {
  const P = J.perro; if (!P) return;
  if (!J.osos.includes(P.ob)) { J.perro = null; return; } // el oso ya fue capturado
  if (P.fase === "viene") {
    P.t -= dt; const k = Math.max(0, P.t / P.T);
    P.x = P.ob.x + (P.x0 - P.ob.x) * k; P.y = P.ob.y + (P.y0 - P.ob.y) * k;
    if (P.t <= 0) { P.fase = "bloquea"; P.ob.bloqueo = azar(...D.PERRO.bloquea); }
  } else { P.x = P.ob.x + 24; P.y = P.ob.y + 6; if (P.ob.bloqueo <= 0) J.perro = null; }
}
function actualizarGato(dt) {
  const G = J.gato; if (!G) return;
  const peso = pesoAlmacen(), cap = capAlmacen();
  const pos = J.suelo.filter((h) => !D.PRODUCTOS[h.tipo].jaula && peso + pesoAlm(h.tipo) <= cap); // solo productos (no jaulas) que quepan en el almacén
  const h = masCercano(pos, G.x, G.y);
  let dest = h;
  if (!dest) { if (!G.dest || Math.hypot(G.dest.x - G.x, G.dest.y - G.y) < 6) G.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) }; dest = G.dest; }
  const d = Math.hypot(dest.x - G.x, dest.y - G.y);
  if (d > 3) { G.x += (dest.x - G.x) / d * D.GATO.vel * dt; G.y += (dest.y - G.y) / d * D.GATO.vel * dt; }
  if (h && d < 12) { aAlmacen(h.tipo); J.suelo.splice(J.suelo.indexOf(h), 1); }
}
// ----- Edificios de procesamiento (datos en D.EDIFICIOS y D.MEJORAS.fabricaN) -----
// e.nivel: -1 = todavía sin construir; 0 a 4 = nivel de mejora. e.trab = segundos que faltan del lote en marcha; e.lote = cuántas unidades lleva;
// e.dur = segundos que dura el ciclo en marcha (para la barra). Un solo ciclo a la vez, sin cola (modelo de Farm Frenzy 1). Todo se reinicia en cada nivel, igual que el dinero.
const filaEdif = (e) => D.MEJORAS[D.EDIFICIOS[e.id].fabrica];
const loteEdif = (e) => filaEdif(e).lote[e.nivel];
const segEdif = (e) => filaEdif(e).seg[e.nivel];   // segundos del ciclo según el nivel de mejora (igual para todos los edificios)
const costoEdif = (e) => { const C = D.EDIFICIOS[e.id].costos; return e.nivel < C.length - 1 ? C[e.nivel + 1] : null; }; // null = nivel máximo
function tocarEdificio(i) {
  const e = J.edif[i], E = D.EDIFICIOS[e.id], r = espacio(i), cx = r.x + r.w / 2;
  if (e.nivel < 0) { // construir
    if (J.dinero < E.costo) { flotar(cx, r.y - 6, "Falta dinero"); return; }
    J.dinero -= E.costo; e.nivel = 0; flotar(cx, r.y - 6, "¡Construido!"); return;
  }
  if (e.trab > 0) { flotar(cx, r.y - 6, "Trabajando…"); return; }   // un solo ciclo a la vez, sin cola
  const hay = J.almacen[E.entra] || 0;
  if (!hay) { flotar(cx, r.y - 6, "Falta " + D.PRODUCTOS[E.entra].nombre.toLowerCase()); return; }
  const n = Math.min(loteEdif(e), hay);   // procesa menos si hay menos que el lote (si el lote es 5 y hay 3, procesa 3)
  J.almacen[E.entra] -= n;
  e.lote = n; e.dur = e.trab = segEdif(e);
}
function mejorarEdificio(i) {
  const e = J.edif[i], r = espacio(i), cx = r.x + r.w / 2, costo = costoEdif(e);
  if (costo == null) { flotar(cx, r.y - 6, "Nivel máximo"); return; }
  if (J.dinero < costo) { flotar(cx, r.y - 6, "Falta dinero"); return; }
  J.dinero -= costo; e.nivel++; flotar(cx, r.y - 6, "¡Mejorado!");
}
function actualizarEdificios(dt) {
  J.edif.forEach((e, i) => {
    if (e.trab <= 0) return;
    e.trab -= dt;
    if (e.trab > 0) return;
    const E = D.EDIFICIOS[e.id], r = espacio(i);
    for (let k = 0; k < e.lote; k++) J.suelo.push({ tipo: E.sale, x: r.x + 16 + Math.random() * (r.w - 32), y: r.y - 14 + azar(-4, 2), t: D.SEG_SUELO });
    e.lote = 0; e.trab = 0; e.dur = 0;
  });
}
// Cuadros de animales (dentro del escenario, arriba a la izquierda, ver ES.botonComprar): SIEMPRE uno por cada animal de D.ANIMALES. Los que NIVELES[n].comprables no incluye (por defecto solo la gallina, como en el nivel 1) salen bloqueados.
const animalAbierto = (tipo) => !!J && ((J.N.comprables && J.N.comprables.length ? J.N.comprables : ["gallina"]).includes(tipo));
function botonesCompra() { // el cuadrado compra; la tira de abajo («venta») vende
  return Object.keys(D.ANIMALES).map((tipo, i) => { const b = { tipo, ...ES.botonComprar(i) }; return { ...b, venta: { x: b.x, y: b.y + b.h, w: b.w, h: ES.BOTON_COMPRAR.alto_venta } }; });
}
const cuantos = (tipo) => J.animales.filter((a) => a.tipo === tipo).length;
function comprar(b) {
  const A = D.ANIMALES[b.tipo], cx = b.x + b.w / 2, cy = b.y + b.h + 30;
  if (!animalAbierto(b.tipo)) flotar(cx, cy, "Bloqueado en este nivel"); else if (cuantos(b.tipo) >= A.max) flotar(cx, cy, "Máximo"); else if (J.dinero < A.precio) flotar(cx, cy, "Falta dinero"); else { J.dinero -= A.precio; J.animales.push(nuevoAnimal(b.tipo)); }
}
function tocar(x, y) {
  if (!J || J.fin || J.pausa) return;
  if (J.tut && J.tut.tocar(x, y)) return;   // «Saltar ✕» del tutorial
  for (const b of botonesAyuda()) if (dentro(b, x, y)) { usarAyuda(b.id); return; } // 🐕 perro / 🐈 gato (en la barra de arriba)
  for (const b of botonesCompra()) { if (dentro(b.venta, x, y)) { venderAnimal(b); return; } if (dentro(b, x, y)) { comprar(b); return; } } // cuadros de animales: cuadrado = comprar, tira de abajo = vender
  for (const o of J.osos) if (Math.hypot(o.x - x, o.y - y) < 34) { golpear(o); return; } // capturar oso
  for (const h of J.suelo) if (Math.hypot(h.x - x, h.y - y) < 24) { // recoger producto
    if (pesoAlmacen() + pesoAlm(h.tipo) > capAlmacen()) { flotar(h.x, h.y, "Almacén lleno"); return; }
    aAlmacen(h.tipo); J.suelo.splice(J.suelo.indexOf(h), 1); return;
  }
  for (const q in FRANJAS) if (dentro(FRANJAS[q], x, y)) { mejorar(q); return; } // ⬆ mejorar almacén / camión
  if (dentro(CAJAS.almacen, x, y)) { abrirAlmacen(); return; } // tocar el almacén: ventana «Enviar productos»
  if (dentro(CAJAS.pozo, x, y)) { // rellenar el pozo cuesta costoRecarga() ($19 en el nivel base; baja con las mejoras) y se llena hasta su capacidad en D.SEG_POZO s. Con el rociador (mejora 4) ya no hay que rellenarlo
    const cx = CAJAS.pozo.x + CAJAS.pozo.w / 2, cy = CAJAS.pozo.y + 20;
    if (pozoAuto()) { flotar(cx, cy, "Riego automático"); return; }
    if (J.pozo || J.agua >= capPozo()) return;
    if (J.dinero < costoRecarga()) { flotar(cx, cy, "Falta dinero"); return; }
    J.dinero -= costoRecarga(); J.pozo = D.SEG_POZO; flotar(cx, cy, "-$" + costoRecarga()); return;
  }
  if (dentro(CAJAS.camion, x, y)) {
    if (J.camion) return;
    const c = cargaCamion();
    if (!c.pago) { if (pesoAlmacen() > 0) flotar(CAJAS.camion.x + 58, CAJAS.camion.y + 20, "No cabe en el camión"); return; }
    for (const k in c.lleva) J.almacen[k] -= c.lleva[k];
    J.pago = c.pago; J.camion = segCamion(); return;
  }
  for (let i = 0; i < J.edif.length; i++) { // edificios: arriba procesar / construir, abajo mejorar
    const r = espacio(i);
    if (!dentro(r, x, y)) continue;
    if (J.edif[i].nivel >= 0 && dentro(espacioMejora(r), x, y)) mejorarEdificio(i); else tocarEdificio(i);
    return;
  }
  if (dentro(CAMPO, x, y)) { // echar 1 de agua: brota una ZONA de pasto. Con el rociador (mejora 4) no se usa agua: cada parche cuesta costoRecarga() ($7)
    if (pozoAuto()) {
      if (J.pasto.length >= D.MAX_PASTO) flotar(x, y, "Mucho pasto");
      else if (J.dinero < costoRecarga()) flotar(x, y, "Falta dinero");
      else { J.dinero -= costoRecarga(); plantarPasto(x, y); flotar(x, y, "-$" + costoRecarga()); }
    } else if (J.agua < 1) flotar(x, y, "Sin agua 💧");
    else if (J.pasto.length >= D.MAX_PASTO) flotar(x, y, "Mucho pasto");
    else { J.agua--; plantarPasto(x, y); }
  }
}
cv.addEventListener("pointerdown", (e) => { const r = cv.getBoundingClientRect(); tocar((e.clientX - r.left) / r.width * L.ANCHO, (e.clientY - r.top) / r.height * L.ALTO); });

function actualizar(dt) {
  J.t += dt;
  if (J.pozo > 0) { J.pozo -= dt; if (J.pozo <= 0) { J.pozo = 0; J.agua = capPozo(); } }
  actualizarEdificios(dt);
  actualizarOsos(dt); actualizarPerro(dt); actualizarGato(dt);
  if (J.camion > 0) { J.camion -= dt; if (J.camion <= 0) { J.camion = 0; J.dinero += J.pago; J.ventas += J.pago; flotar(CAJAS.camion.x + CAJAS.camion.w / 2, CAJAS.camion.y + 6, "+$" + J.pago); J.pago = 0; marcaLibre(); } }
  for (const p of J.pasto) if (p.crece < 1) p.crece = Math.min(1, p.crece + dt / D.SEG_CRECE_PASTO);
  riegoAutomatico(dt);
  for (const a of J.animales) {
    const A = D.ANIMALES[a.tipo];
    a.t += dt;
    // Barra de vida de D.SEG_VIDA s (a.vida = segundos que le quedan): normal D.SEG_HAMBRE s; luego tiene hambre y CORRE al pasto; si llega a 0 sin haber empezado a comer MUERE.
    // Al llegar al pasto come D.SEG_COMER s (el reloj de hambre se detiene) y la barra vuelve a llenarse. Produce cada A.segCiclo s mientras viva.
    a.prod += dt / A.segCiclo;
    if (a.prod >= 1) { a.prod = 0; J.suelo.push({ tipo: A.producto, x: a.x + azar(-10, 10), y: a.y + 12, t: D.SEG_SUELO }); }
    if (a.est === "vaga") {
      a.vida -= dt;
      if (a.vida <= 0) { a.muerto = true; flotar(a.x, a.y - 14, "Murió de hambre"); continue; }
      if (a.objetivo && !J.pasto.includes(a.objetivo)) a.objetivo = a.dest = null; // otro animal gastó el último uso o un oso lo pisó
      if (a.vida <= D.SEG_VIDA - D.SEG_HAMBRE && J.pasto.length && (a.objetivo || (a.objetivo = pastoLibre(a)))) a.dest = a.objetivo; // con hambre: a la zona libre más cercana (reserva un uso)
      else if (!a.dest || a.dest === a.objetivo || Math.hypot(a.dest.x - a.x, a.dest.y - a.y) < 6) a.dest = { x: azar(CAMPO.x + 20, CAMPO.x + CAMPO.w - 20), y: azar(CAMPO.y + 40, limiteY()) }; // si no, pasea al azar
      if (a.dest) {
        const d = Math.hypot(a.dest.x - a.x, a.dest.y - a.y), vel = A.vel * (a.objetivo ? D.CORRE : 1); // corre cuando va a comer
        if (d > 4) { a.x += (a.dest.x - a.x) / d * vel * dt; a.y += (a.dest.y - a.y) / d * vel * dt; }
        if (a.objetivo && d < 12) { a.est = "come"; a.t = 0; }
      }
    } else { // come: tras D.SEG_COMER s gasta UN uso de la zona y queda lleno (barra completa)
      if (!J.pasto.includes(a.objetivo)) { a.est = "vaga"; a.objetivo = a.dest = null; continue; }
      if (a.t > D.SEG_COMER) {
        const z = a.objetivo;
        if (--z.v <= 0) J.pasto.splice(J.pasto.indexOf(z), 1);
        a.vida = D.SEG_VIDA; a.est = "vaga"; a.objetivo = a.dest = null; a.t = 0;
      }
    }
  }
  J.animales = J.animales.filter((a) => !a.muerto);
  for (const h of J.suelo) { h.t -= dt; if (h.t <= 0 && D.PRODUCTOS[h.tipo].jaula) flotar(h.x, h.y - 14, "¡Se escapó!"); } // una jaula que nadie guardó: el oso se escapa
  J.suelo = J.suelo.filter((h) => h.t > 0);
  for (const f of J.flot) f.t -= dt;
  J.flot = J.flot.filter((f) => f.t > 0);
  if (J.tut) J.tut.actualizar(estadoTutorial(), dt);   // los pasos avanzan según lo que hace el jugador
  if (!J.libre && metasCumplidas()) terminar(true); // el tiempo ya no hace perder: solo cambia la medalla (el modo libre no tiene metas: no termina solo)
  else revisarSalida(dt);                            // la derrota solo llega si ya no hay forma de avanzar (salida-granjafeliz.js)
}

// ----- Tutorial guiado (tutorial-granjafeliz.js): foto del juego que usa para saber qué ya hizo el jugador -----
let metasRect = null;   // lo llena dibujar(): rectángulo del marcador de metas de la barra de arriba
function estadoTutorial() {
  return {
    t: J.t, dinero: J.dinero, agua: J.agua, pozoLlenando: J.pozo > 0, pasto: J.pasto.length, animales: J.animales.length,
    rec: { ...J.rec }, almacen: { ...J.almacen }, almacenTotal: Object.values(J.almacen).reduce((t, c) => t + c, 0),
    suelo: J.suelo.map((h) => ({ tipo: h.tipo, x: h.x, y: h.y, jaula: !!D.PRODUCTOS[h.tipo].jaula })),
    osos: J.osos.map((o) => ({ x: o.x, y: o.y })),
    camionViaje: J.camion > 0 || J.pago > 0, ventas: J.ventas, pagoListo: cargaCamion().pago,
    edif: J.edif.map((x) => ({ id: x.id, nivel: x.nivel, trab: x.trab })),
    metasRect,
  };
}

// ----- Condición de derrota (regla en salida-granjafeliz.js; aquí solo se arma el estado y se pide la revisión cada SEG_REVISAR s) -----
// Metas que todavía faltan: { tipo, id, faltan }
const metasPendientes = () => J.N.metas.map((m) => { const a = avanceMeta(m); return { tipo: m.tipo, id: m.id, faltan: Math.max(0, a.objetivo - a.actual) }; }).filter((m) => m.faltan > 0);
// $ que costaría dar de comer a un animal nuevo: 0 si ya hay pasto con usos, o agua en el pozo (o llenándose); si no, lo que cueste rellenar el pozo (o el parche con el rociador)
function extraPasto() {
  if (J.pasto.some((p) => p.v > 0)) return 0;
  if (!pozoAuto() && (J.agua >= 1 || J.pozo > 0)) return 0;
  return costoRecarga();
}
function estadoSalida() {
  return {
    dinero: J.dinero, animales: J.animales.length, comprables: J.N.comprables || ["gallina"],
    almacen: J.almacen, pesoCam, capCamion: capCamion(), costoMejoraCamion: costoMejora("camion"),
    suelo: J.suelo.length, edificiosActivos: J.edif.some((e) => e.trab > 0), camionViaje: J.camion > 0 || J.pago > 0,
    ososSueltos: J.osos.length, ososFuturos: !!J.N.osos, extraPasto: extraPasto(),
    pendientes: J.libre ? [] : metasPendientes(), libre: !!J.libre,
  };
}
function revisarSalida(dt) {
  J.revisa += dt;
  if (J.revisa < SEG_REVISAR) return;
  J.revisa = 0;
  const r = sinSalida(estadoSalida());
  if (!r.perdido) { J.sinSalidaSeg = 0; return; }
  J.sinSalidaSeg += SEG_REVISAR;                       // hay que verlo SEG_CONFIRMAR s seguidos para no perder por un instante
  if (J.sinSalidaSeg >= SEG_CONFIRMAR) perder(r.razon);
}

// ---------- Dibujo ----------
function caja(r, ctxFill) { ctx.fillStyle = ctxFill; ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill(); }
function txt(t, x, y, tam = 16, color = "#fff", al = "left") { ctx.font = "700 " + tam + "px system-ui,sans-serif"; ctx.fillStyle = color; ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
// Igual que txt() pero achica la letra (hasta 9) si el texto no cabe en maxW: los costos de la batidora y la quesería llegan a $120,000
function txtFit(t, x, y, tam, color, al, maxW) { ctx.font = "700 " + tam + "px system-ui,sans-serif"; while (tam > 9 && ctx.measureText(t).width > maxW) { tam--; ctx.font = "700 " + tam + "px system-ui,sans-serif"; } txt(t, x, y, tam, color, al); }
// Texto con contorno oscuro (sin recuadro de fondo): se lee sobre cielo, colinas o pasto. Achica la letra (hasta 8) si no cabe en maxW.
function txtBorde(t, x, y, tam, color, al = "center", maxW = 1e9) {
  ctx.font = "700 " + tam + "px system-ui,sans-serif";
  while (tam > 8 && ctx.measureText(t).width > maxW) { tam--; ctx.font = "700 " + tam + "px system-ui,sans-serif"; }
  ctx.textAlign = al; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(20,20,24,.85)"; ctx.strokeText(t, x, y);
  ctx.fillStyle = color; ctx.fillText(t, x, y);
}
function emo(e, x, y, tam) { ctx.fillStyle = "#000"; /* los emojis a color toman la transparencia de fillStyle: sin esto salían casi transparentes tras dibujar una sombra */ ctx.font = tam + "px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(e, x, y); }
const mmss = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

// Edificios: casa dibujada en su espacio (sin construir: casa transparente y precio), rótulo de estado sobre el frente y franja ⬆ mejorar
function dibujarEdificios() {
  J.edif.forEach((e, i) => {
    const E = D.EDIFICIOS[e.id], r = espacio(i), cx = r.x + 58, cy = r.y + 60, f = espacioMejora(r);
    if (e.nivel < 0) { // sin construir
      const puede = J.dinero >= E.costo;
      ES.dibujarCasa(ctx, r, e.id, E.emoji, 0.4);
      ES.rotulo(ctx, E.nombre, cx, cy, "#fff");
      ctx.fillStyle = puede ? "rgba(214,150,20,.96)" : "rgba(52,52,58,.95)"; ctx.beginPath(); ctx.roundRect(f.x, f.y, f.w, f.h, 10); ctx.fill();
      txtFit("🏗️ Construir $" + E.costo.toLocaleString("es-MX"), f.x + f.w / 2, f.y + f.h / 2, 12, puede ? "#fff" : "#c9c9d0", "center", f.w - 8);
      return;
    }
    const hay = J.almacen[E.entra] || 0, ocupado = e.trab > 0;
    ES.dibujarCasa(ctx, r, e.id, E.emoji);
    const t = ocupado ? "⏳ " + Math.ceil(e.trab) + " s · ×" + e.lote : hay ? D.PRODUCTOS[E.entra].emoji + "×" + Math.min(hay, loteEdif(e)) + " → " + D.PRODUCTOS[E.sale].emoji : "Falta " + D.PRODUCTOS[E.entra].emoji;
    ES.rotulo(ctx, t, cx, cy, ocupado ? "#bfe4fb" : hay ? "#9dffb0" : "#c9c9d0");
    if (ocupado) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(r.x + 22, r.y + 70, 72, 5); ctx.fillStyle = "#ffe27a"; ctx.fillRect(r.x + 22, r.y + 70, 72 * (1 - e.trab / (e.dur || 1)), 5); }
    pintarFranja(f, costoEdif(e), e.nivel + 1, D.EDIFICIOS[e.id].costos.length);
  });
}

// Pozo (arriba), almacén (bodega, abajo) y camión dibujados en el escenario, cada uno con su rótulo y su franja ⬆ mejorar
function dibujarObjetos() {
  const a = CAJAS.almacen, p = CAJAS.pozo, c = CAJAS.camion, carga = cargaCamion(), listo = carga.pago > 0 && !J.camion;
  ES.dibujarAlmacen(ctx, a, pesoAlmacen() / capAlmacen());
  ES.rotulo(ctx, "⚖️ " + pesoAlmacen() + " / " + capAlmacen(), a.x + a.w / 2, a.y + 52); franjaMejora("almacen");
  ES.dibujarPozo(ctx, p, J.agua, capPozo(), J.pozo > 0);
  ES.rotulo(ctx, J.pozo > 0 ? "Llenando… " + Math.ceil(J.pozo) : pozoAuto() ? "💧 Automático · $" + costoRecarga() : "💧 " + J.agua + " / " + capPozo(), p.x + p.w / 2, p.y + 52, "#bfe4fb"); franjaMejora("pozo");
  ES.dibujarCamion(ctx, c, listo, J.camion > 0);
  ES.rotulo(ctx, J.camion > 0 ? "En camino… " + Math.ceil(J.camion) : "🚚 $" + carga.pago + " · ⚖️ " + Object.keys(carga.lleva).reduce((t, k) => t + carga.lleva[k] * pesoCam(k), 0) + "/" + capCamion(), c.x + c.w / 2, c.y + 52, listo ? "#9dffb0" : "#fff4c2"); franjaMejora("camion");
}

// Franja inferior de Almacén / Camión: costo de la siguiente mejora y nivel (dorada si alcanza el dinero)
function franjaMejora(que) { pintarFranja(FRANJAS[que], costoMejora(que), J.mejoras[que] + 1, D.MEJORAS[que].capacidad.length); }
function pintarFranja(f, costo, nv, niveles) {
  const puede = costo != null && J.dinero >= costo;
  ctx.fillStyle = costo == null ? "rgba(70,70,76,.95)" : puede ? "rgba(214,150,20,.96)" : "rgba(52,52,58,.95)";
  ctx.beginPath(); ctx.roundRect(f.x, f.y, f.w, f.h, 10); ctx.fill();
  txtFit(costo == null ? "Nivel máx. " + nv + "/" + niveles : "⬆ $" + costo.toLocaleString("es-MX") + " · Nv " + nv + "/" + niveles, f.x + f.w / 2, f.y + f.h / 2, 12, puede ? "#fff" : "#c9c9d0", "center", f.w - 8);
}

function dibujar() {
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, L.ANCHO, L.ALTO); // transparente: se ve la madera
  if (!J) return;
  caja({ x: 20, y: 8, w: L.ANCHO - 30, h: 40 }, "rgba(20,20,24,.78)");
  const textoDinero = "💵 $" + fmt(J.dinero), xDin = 30;   // los animales ya no ocupan la barra (van dentro del escenario): el dinero empieza al borde izquierdo
  txt(textoDinero, xDin, 28, 18, "#fff4c2");
  const x0 = xDin + ctx.measureText(textoDinero).width + 18;   // los chips de metas empiezan después del dinero (que puede ser enorme en las pruebas)
  { // panel de metas: un chip por meta, de izquierda a derecha entre 💵 y los botones 🐕 🐈 (hasta xAyuda); la letra se achica si no caben
    const items = J.libre
      ? [{ t: "💰 Vendido $" + J.ventas.toLocaleString("es-MX"), ok: false }, J.sinRecord ? { t: "🧪 Prueba (sin récord)", ok: false } : { t: "🏆 Récord $" + Math.max(J.ventas, J.mejorInicial).toLocaleString("es-MX"), ok: J.ventas > 0 && J.ventas >= J.mejorInicial }]
      : J.N.metas.map((m) => { const a = avanceMeta(m), ok = a.actual >= a.objetivo; return { t: a.icono + " " + Math.min(a.actual, a.objetivo).toLocaleString("es-MX") + "/" + a.objetivo.toLocaleString("es-MX"), ok }; });
    let tam = 15; const medir = () => { ctx.font = "700 " + tam + "px system-ui,sans-serif"; return items.reduce((s, i) => s + ctx.measureText(i.t).width + 16, 0); };
    while (tam > 10 && medir() > xAyuda() - 8 - x0) tam--;
    let x = x0;
    for (const i of items) { txt(i.t, x, 28, tam, i.ok ? "#9dffb0" : "#fff"); x += ctx.measureText(i.t).width + 16; }
    metasRect = { x: x0 - 8, y: 11, w: Math.max(40, x - x0 + 2), h: 34 };   // dónde quedó el marcador de metas (el tutorial lo señala)
  }
  for (const b of botonesAyuda()) {
    const hecho = b.id === "gato" && J.gato, costo = b.id === "gato" ? D.GATO.costo : costoPerro(), ocupado = b.id === "perro" && J.perro;
    const puede = !hecho && !ocupado && J.dinero >= costo && (b.id === "gato" || J.osos.some((o) => o.bloqueo <= 0));
    caja(b, hecho ? "rgba(60,110,60,.9)" : puede ? "rgba(160,100,10,.92)" : "rgba(60,60,66,.9)");
    emo(b.id === "gato" ? "🐈" : "🐕", b.x + 14, b.y + b.h / 2, 18);
    txt(hecho ? "✔ ya" : ocupado ? "viene" : costo ? "$" + costo.toLocaleString("es-MX") : "gratis", b.x + 27, b.y + b.h / 2, 12, "#fff4c2");
  }
  { const med = J.libre ? 0 : medallaAhora(); txt("⏱ " + mmss(J.t) + " " + (["", "🥉", "🥈", "🥇"][med]), limiteDer, 28, 17, med === 3 ? "#ffe27a" : med === 2 ? "#e4e8ee" : "#f0c9a0", "right"); } // sube; el emoji es la medalla que llevas
  ES.dibujarFondo(ctx, J.edif.length); // cielo, valla, pasto y tierra (se pinta una vez y se copia)
  dibujarObjetos();
  if (J.edif.length) dibujarEdificios();
  for (const p of J.pasto) ES.dibujarPasto(ctx, p, D.USOS_PASTO);   // zonas de pasto: un área de matas que crece y se va gastando
  for (const h of J.suelo) {
    if (!(h.t > 3 || Math.floor(h.t * 6) % 2)) continue;
    ES.sombra(ctx, h.x, h.y + 12, 10);
    if (D.PRODUCTOS[h.tipo].jaula) { // jaula: barrotes sobre el oso
      ctx.save(); ctx.strokeStyle = "#3a3a40"; ctx.lineWidth = 2; ctx.strokeRect(h.x - 18, h.y - 18, 36, 36);
      for (let k = -9; k <= 9; k += 9) { ctx.beginPath(); ctx.moveTo(h.x + k, h.y - 18); ctx.lineTo(h.x + k, h.y + 18); ctx.stroke(); } ctx.restore();
      emo(D.PRODUCTOS[h.tipo].emoji, h.x, h.y, 26);
    } else emo(D.PRODUCTOS[h.tipo].emoji, h.x, h.y, 20);
  }
  for (const a of J.animales.slice().sort((p, q) => p.y - q.y)) {
    const tam = D.ANIMALES[a.tipo].tam * ES.escalaProf(a.y); // más abajo = un poco más grande (perspectiva)
    ES.sombra(ctx, a.x, a.y + tam * 0.4, tam * 0.45);
    emo(D.ANIMALES[a.tipo].emoji, a.x, a.y + Math.sin(J.t * 8 + a.x) * (a.est === "vaga" ? 1.5 : 0), tam);
    const hambre = a.est === "vaga" && a.vida <= D.SEG_VIDA - D.SEG_HAMBRE;
    if (hambre && !a.objetivo) emo("😢", a.x + tam / 2, a.y - tam / 2, 14); // con hambre y sin pasto al que ir
    const vida = a.est === "come" ? (a.vida + (D.SEG_VIDA - a.vida) * Math.min(1, a.t / D.SEG_COMER)) / D.SEG_VIDA : a.vida / D.SEG_VIDA; // mientras come, la barra se va llenando
    ES.dibujarBarraVida(ctx, a.x, a.y + tam * 0.5 + 6, vida, hambre, a.est === "come"); // barra de 20 s bajo el animal: verde, roja con hambre, azul al comer
  }
  if (J.gato) { const k = ES.escalaProf(J.gato.y); ES.sombra(ctx, J.gato.x, J.gato.y + 11 * k, 12 * k); emo("🐈", J.gato.x, J.gato.y, 26 * k); }
  for (const o of J.osos) {
    const O = D.OSOS[o.tipo];
    const k = ES.escalaProf(o.y); ES.sombra(ctx, o.x, o.y + 17 * k, 19 * k);
    emo(O.emoji, o.x, o.y + Math.sin(J.t * 6 + o.x) * (o.bloqueo > 0 ? 0 : 1.5), 42 * k);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(o.x - 18, o.y - 30, 36, 5); ctx.fillStyle = "#ffe27a"; ctx.fillRect(o.x - 18, o.y - 30, 36 * o.golpes / O.golpes, 5); // avance de captura
  }
  if (J.perro) { const k = ES.escalaProf(J.perro.y); ES.sombra(ctx, J.perro.x, J.perro.y + 12 * k, 14 * k); emo("🐕", J.perro.x, J.perro.y, 30 * k); }
  for (const b of botonesCompra()) { // cuadros de animales dentro del escenario, SIN fondo: marco tenue, la cara del animal, cuántos hay, el precio y (debajo) lo que pagan al venderlo
    const A = D.ANIMALES[b.tipo], n = cuantos(b.tipo), abierto = animalAbierto(b.tipo), lleno = n >= A.max, puede = abierto && !lleno && J.dinero >= A.precio, v = b.venta, cx = b.x + b.w / 2;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.lineWidth = 2; ctx.setLineDash(abierto ? [] : [4, 3]); ctx.strokeStyle = puede ? "#ffe27a" : "rgba(255,255,255,.65)"; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = !abierto ? 0.4 : puede ? 1 : 0.6;   // bloqueado o sin dinero: la cara se ve apagada (se sigue viendo el animal)
    emo(A.emoji, cx, b.y + 20, 28);
    ctx.globalAlpha = 1;
    if (!abierto) emo("🔒", b.x + b.w - 11, b.y + 12, 15);
    else txtBorde(n + "/" + A.max, b.x + b.w - 4, b.y + 9, 10, lleno ? "#ff9a8c" : "#fff", "right");
    txtBorde("$" + A.precio.toLocaleString("es-MX"), cx, b.y + b.h - 8, 11, !abierto ? "#cfcfd6" : puede ? "#ffe27a" : "#fff", "center", b.w - 4);
    txtBorde("💲$" + precioVenta(b.tipo).toLocaleString("es-MX"), cx, v.y + v.h / 2, 10, n > 0 ? "#fff" : "#c3c3ca", "center", b.w);
    ctx.restore();
  }
  for (const f of J.flot) { ctx.globalAlpha = Math.min(1, f.t); txt(f.txt, f.x, f.y - (1.2 - f.t) * 30, 16, "#fff", "center"); ctx.globalAlpha = 1; }
  if (J.tut && !J.fin) J.tut.dibujar(ctx);   // flecha y cuadro del tutorial, encima de todo
}

// ---------- Fin del nivel ----------
function colocarFin() {
  const r = cv.getBoundingClientRect();
  Object.assign(cajaFin.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
}
// Modo libre: cada venta del camión puede superar tu marca (se guarda sola; no hace falta terminar la partida)
function marcaLibre() {
  if (!J.libre || J.sinRecord) return;   // en una partida de prueba (dinero inicial cambiado) no se guarda récord
  const r = eco.registrarLibre(J.libre, J.ventas);
  if (r.record) {
    if (nube) nube.guardado();
    if (J.mejorInicial > 0 && !J.avisoRecord) { J.avisoRecord = true; flotar(CAMPO.x + CAMPO.w / 2, CAMPO.y + 40, "🏆 ¡Nuevo récord!"); }
  }
}
function terminarLibre(razon) {   // razon (texto) solo llega cuando la partida se acabó porque ya no hay forma de avanzar; desde el menú de pausa se llama sin ella
  const sinForma = typeof razon === "string";
  J.fin = true;
  const nuevo = !J.sinRecord && J.ventas > 0 && J.ventas >= eco.mejorLibre(J.libre) && J.ventas > J.mejorInicial;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = sinForma ? "Ya no hay forma de avanzar · " + J.N.nombre : "♾️ Partida terminada · " + J.N.nombre;
  texto.lastChild.textContent = (sinForma ? razon + " " : "") + "Vendiste $" + J.ventas.toLocaleString("es-MX") + " en " + mmss(Math.ceil(J.t)) + " · " + (J.sinRecord ? "🧪 partida de prueba (sin récord)" : nuevo ? "🏆 ¡nuevo récord!" : "récord $" + eco.mejorLibre(J.libre).toLocaleString("es-MX"));
  const b = (c, t, f) => { const x = document.createElement("button"); x.type = "button"; x.className = "b3d txt " + c; x.textContent = t; x.onclick = f; return x; };
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  fila.append(b("b-gris", "Ajustes", () => ir("config")));
  cajaFin.replaceChildren(texto, b("grande b-verde", "Jugar otra vez ▶", () => empezarLibre()), fila);
  cajaFin.hidden = false; colocarFin();
}
// Derrota: ya no hay forma de avanzar (salida-granjafeliz.js). No da estrellas ni monedas y no toca el progreso. En el Modo libre es el fin de la partida (la marca ya se guardó con cada venta).
function perder(razon) {
  if (J.libre) { terminarLibre(razon); return; }
  J.fin = true;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = "Ya no hay forma de avanzar";
  texto.lastChild.textContent = razon + " · " + mmss(Math.ceil(J.t));
  const b = (c, t, f) => { const x = document.createElement("button"); x.type = "button"; x.className = "b3d txt " + c; x.textContent = t; x.onclick = f; return x; };
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  fila.append(b("b-gris", "Mapa", () => abrirMapa(J.n)));
  cajaFin.replaceChildren(texto, b("grande b-azul", "Reintentar ▶", () => empezar(J.n)), fila);
  cajaFin.hidden = false; colocarFin();
}
function terminar(gano) {
  J.fin = true;
  if (gano && J.tut) J.tut.terminar();   // pasar el nivel cuenta como tutorial visto
  const seg = Math.ceil(J.t);
  const est = eco.estrellasDe({ gano, segundos: seg, estrellasSeg: [J.N.oroSeg, J.N.plataSeg] }); // medalla de ESTA partida
  let res = { estrellas: 0, monedas: 0 };
  if (gano) { res = eco.registrarNivel(J.n, est); pintarMonedas(); if (nube) nube.guardado(); }
  const caja_ = (c, t, f) => { const b = document.createElement("button"); b.type = "button"; b.className = "b3d txt " + c; b.textContent = t; b.onclick = f; return b; };
  const sig = D.NIVELES[J.n + 1] ? J.n + 1 : 0;
  const texto = document.createElement("div"); texto.className = "sobre-texto";
  texto.innerHTML = "<h2></h2><div></div>";
  texto.firstChild.textContent = gano ? "¡Nivel " + J.n + " completado!" : "Nivel no terminado";
  // Si ya tenías una medalla mejor que la de esta partida, se avisa (la marca guardada nunca baja y no se paga de nuevo)
  texto.lastChild.textContent = eco.estrellasTexto(est) + " " + eco.MEDALLAS[est] + " · " + mmss(seg) + (res.monedas ? " · +" + res.monedas + " monedas" : "") + (res.estrellas > est ? " · tu mejor: " + eco.estrellasTexto(res.estrellas) : "");
  const fila = document.createElement("div"); fila.className = "sobre-fila";
  fila.append(caja_("b-azul", "Repetir nivel", () => empezar(J.n)), caja_("b-gris", "Mapa", () => abrirMapa(J.n)));
  cajaFin.replaceChildren(texto);
  if (gano && sig) cajaFin.appendChild(caja_("grande b-verde", "Siguiente nivel ▶", () => empezar(sig))); // primero y más grande; en el último nivel se oculta
  cajaFin.appendChild(fila);
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
