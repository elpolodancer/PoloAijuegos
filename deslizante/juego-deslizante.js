// Ruta: deslizante/juego-deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Al abrir se ve el juego cargado detrás de un velo (Modo libre · Niveles · Continuar). «Niveles» abre el mapa estándar de países
// (compartido/mapa-niveles.js, modo soloPaises): 3 900 niveles, 20 por país, con México primero y China al final (orden en compartido/etapas-mapa.js).
// Los niveles se van creando por tandas en niveles-deslizante.js: el que todavía no existe muestra 🚧 en el mapa, y si no hay ninguno «Continuar» juega el modo libre.
import { encolarNivel, leerCola, guardarCola } from "../compartido/cola-puntos.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { NIVELES, POR_ETAPA, TAMANO_MIN, TAMANO_MAX, monedasDe, puntosJuegoDe } from "./niveles-deslizante.js";

const ID = "deslizante";
const ETAPAS = crearEtapas({ porEtapa: POR_ETAPA, soloPaises: true });   // 195 países (México primero) × 20 niveles = 3 900
const TOTAL = ETAPAS.total;
let libreN = 3;                                    // modo libre: tamaño elegido
const $ = (id) => document.getElementById(id);

// ----- Reinicio (21 nov 2026): se borraron los 280 niveles viejos y los puntos -----
// Una sola vez por dispositivo se quitan de la cola los puntos que el juego tenía pendientes de enviar al perfil.
try {
  if (!localStorage.getItem("deslizante_reinicio_v1")) {
    guardarCola(leerCola().filter((e) => e.j !== ID));
    localStorage.setItem("deslizante_reinicio_v1", "1");
  }
} catch (e) {}

// ----- Progreso (local primero; se sincroniza con la cuenta de Google si hay internet y sesión) -----
// { v: 2, hechos: NÚMERO = nivel más alto pasado (0 = ninguno; los niveles se abren en orden, así que todos los de antes están pasados), mejores: { "<número de nivel>": { mov, ms } },
//   libre: { "<tamaño>" o "<tamaño>-<0 a 3>": { mov, ms, ganados } },
//   estrellas: { "<número de nivel>": mejor escalón 1 a 6 (solo adorno: ver «Estrellas») },
//   puntos: puntos del JUEGO acumulados (80 a 250 por partida ganada, según el tablero) }
//   mov = menos movimientos y ms = menor tiempo en milisegundos: son dos récords independientes (pueden venir de partidas distintas).
// (Antes «hechos» era una lista con un true por nivel; ahora es un solo número para que el progreso siga cabiendo en la nube con miles de niveles. La lista vieja se convierte sola.)
// Lo guardado ANTES del reinicio no trae «v: 2»: de eso solo se conservan los récords del modo libre; niveles, estrellas y partidas se descartan.
const VERSION_PROG = 2;
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
// «hechos» válido: el número nuevo, o la lista vieja de trues (el nivel más alto con true)
function nivelesHechos(x) {
  const n = Array.isArray(x) ? x.lastIndexOf(true) + 1 : Math.floor(Number(x)) || 0;
  return Math.max(0, Math.min(TOTAL, n));
}
function limpiar(p) {
  if (!p || typeof p !== "object") return null;
  const nuevo = p.v === VERSION_PROG;
  if (!nuevo && !p.libre) return null;             // formato viejo sin récords del modo libre: no hay nada que conservar
  return {
    v: VERSION_PROG,
    hechos: nuevo ? nivelesHechos(p.hechos) : 0,
    mejores: nuevo ? marcas(p.mejores) : {},
    libre: marcas(p.libre, true),
    estrellas: nuevo ? escalones(p.estrellas) : {},
    puntos: nuevo ? Math.max(0, Math.floor(Number(p.puntos)) || 0) : 0,
  };
}

// Tiempo como m:ss.d (con horas si hace falta); ms = milisegundos
function fmtMs(ms) {
  const dec = Math.floor(ms / 100) % 10, s = Math.floor(ms / 1000);
  const sec = String(s % 60).padStart(2, "0"), min = Math.floor(s / 60) % 60, h = Math.floor(s / 3600);
  return (h ? h + ":" + String(min).padStart(2, "0") : min) + ":" + sec + "." + dec;
}
let prog = { v: VERSION_PROG, hechos: 0, mejores: {}, libre: {}, estrellas: {}, puntos: 0 }, nube = null;
try { prog = limpiar(JSON.parse(localStorage.getItem(CLAVE))) || prog; } catch (e) {}
function guardarProg() {
  try { localStorage.setItem(CLAVE, JSON.stringify(prog)); } catch (e) {}
  if (nube) nube.guardado();
}
const hecho = (i) => i < prog.hechos;              // i = posición (0 = nivel 1): pasado si está dentro de los niveles ya pasados
const hechoMax = () => prog.hechos;                // nivel más alto terminado (0 = ninguno)
const desbloqueado = (i) => i <= hechoMax();       // se abre en orden: el siguiente al último terminado
// Primer nivel sin pasar (el que toca jugar); si ya pasó todos, el último
const siguientePendiente = () => Math.min(TOTAL - 1, hechoMax());
// Texto «Nivel 3 · Quintana Roo» de la posición i
function nombreNivel(i) { const e = ETAPAS.etapaDe(i + 1); return "Nivel " + e.k + " · " + ETAPAS.nombreEtapa(i + 1); }

// Modo libre: todos los tamaños están abiertos mientras no existan los niveles (antes se abrían al pasar cada etapa por tamaño).
const tamanoAbierto = (m) => m >= TAMANO_MIN && m <= TAMANO_MAX;

// Aviso corto flotante (el juego no usa alert ni confirm)
let avisoT = 0;
function aviso(texto) {
  let a = $("aviso-flotante");
  if (!a) {
    a = document.createElement("div");
    a.id = "aviso-flotante";
    a.setAttribute("role", "status");
    a.style.cssText = "position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147481000;max-width:calc(100% - 32px);padding:10px 16px;border-radius:14px;background:#1e2025;color:#f1f2f4;border:1px solid #7c5cff;font:700 .9rem system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.45)";
    document.body.appendChild(a);
  }
  a.textContent = texto; a.hidden = false;
  clearTimeout(avisoT); avisoT = setTimeout(() => { a.hidden = true; }, 2600);
}

// ----- Mapa de niveles (estándar 7.3 + mapa solo de países): se ve solo el país donde vas, con su contorno que se llena de agua; México es el primer país y se van abriendo de uno en uno -----
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,                                    // sin lista ni mundo: solo el país donde va el jugador
  columnas: 5,
  progreso: () => { const h = hechoMax(); return { hecho: h, max: Math.min(TOTAL, h + 1) }; },
  jugarNivel: (n) => jugarNivel(n - 1),
  infoNivel: (n) => {
    if (!NIVELES[n - 1]) return { sub: "🚧", aria: "todavía no está creado" };
    const mk = prog.mejores[n];
    return { sub: mk ? fmtMs(mk.ms) : "", aria: mk ? "mejor tiempo " + fmtMs(mk.ms) : "" };
  },
});
// n = nivel cuya etapa se abre (por defecto, el que toca); alcanzado = true abre la vista principal de su zona (se ve subir el agua)
function abrirMapa(n, alcanzado) { mostrar("pantalla-niveles"); mapa.abrir(n || Math.min(TOTAL, hechoMax() + 1), alcanzado); }

// ----- Estrellas (solo adorno) y monedas -----
// 6 escalones por nivel según el tiempo (el cronómetro cuenta desde el primer movimiento; se pide «menos de»):
//   1 a 3 = estrellas doradas   (1: pasarlo · 2: menos de 2 min · 3: menos de 1 min)
//   4 a 6 = estrellas moradas, que reemplazan a las doradas una por una (4: menos de 40 s · 5: menos de 30 s · 6: menos de 20 s)
// Las estrellas YA NO dan monedas. Las monedas son fijas por tamaño (niveles-deslizante.js, monedasDe): de 15 a 80 por nivel, una sola vez.
// Tiempos límite en milisegundos por tamaño: LIMITES[tamaño][escalón - 1]. Un tamaño que no esté aquí no da estrellas.
const LIMITES = { 3: [Infinity, 120000, 60000, 40000, 30000, 20000] };
const conEstrellas = (m) => !!LIMITES[m];
// Escalón (0 a 6) que corresponde a un tiempo en ese tamaño
function tierPorTiempo(m, ms) {
  const L = LIMITES[m];
  if (!L) return 0;
  for (let k = 6; k >= 1; k--) if (ms < L[k - 1]) return k;
  return 1;
}
// Mejor escalón del nivel i (posición)
function tierNivel(i) {
  const lv = NIVELES[i];
  if (!lv || !conEstrellas(lv.n) || !hecho(i)) return 0;
  const mk = prog.mejores[i + 1];
  return Math.max(1, Number(prog.estrellas[i + 1]) || 0, mk ? tierPorTiempo(lv.n, mk.ms) : 0);
}
// Monedas = lo que pagó cada nivel pasado (se calcula con los niveles pasados, así se sincroniza solo). Todavía no se gastan en nada.
function totalMonedas() {
  let s = 0;
  for (let i = 0; i < NIVELES.length; i++) if (hecho(i)) s += monedasDe(NIVELES[i].n);
  return s;
}
const fmtNum = (x) => Number(x).toLocaleString("es-MX");
const pintarMonedas = () => {
  $("monedas").textContent = "💰 " + fmtNum(totalMonedas());
  $("puntos").textContent = "🏅 " + fmtNum(prog.puntos);
};
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

// Animación de la victoria: estrellas que estallan en chispas al caer, confeti, y puntos/monedas que suben contando desde 0.
// Todo se detiene solo si la ventana se quita (v.isConnected) y no se hace nada con «reducir movimiento» activado.
function chisporroteo(v, x, y, cuantas, colores) {
  for (let k = 0; k < cuantas; k++) {
    const ang = (k / cuantas) * Math.PI * 2 + Math.random() * 0.5, dist = 26 + Math.random() * 34;
    const p = document.createElement("i");
    p.className = "chispa";
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist + "px");
    p.style.setProperty("--tam", 3 + Math.random() * 4 + "px");
    p.style.background = colores[Math.floor(Math.random() * colores.length)];
    p.addEventListener("animationend", () => p.remove());
    v.appendChild(p);
  }
}
function animarVictoria(v, tier) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const t0 = performance.now();
  // 1) cada estrella ganada estalla en chispas cuando termina de caer (doradas: amarillas; moradas: de colores)
  v.querySelectorAll(".est:not(.vacia)").forEach((s, k) => setTimeout(() => {
    if (!v.isConnected) return;
    const c = v.getBoundingClientRect(), r = s.getBoundingClientRect();
    chisporroteo(v, r.left - c.left + r.width / 2, r.top - c.top + r.height / 2, 12,
      s.classList.contains("mor") ? ["#ffffff", "#ffd1f5", "#d9c2ff", "#c9f3ff"] : ["#fff6b0", "#ffc61f", "#ffffff"]);
  }, 420 + k * 220));
  // 2) confeti: más cuantas más estrellas
  const cf = document.createElement("div");
  cf.className = "vic-confeti";
  const cols = ["#ffc61f", "#ff6b6b", "#4db8f0", "#3fcf4a", "#a14df0", "#ffffff"];
  for (let k = 0; k < 14 + tier * 6; k++) {
    const i = document.createElement("i");
    i.style.setProperty("--x", Math.random() * 100 + "%");
    i.style.setProperty("--c", cols[k % cols.length]);
    i.style.setProperty("--dur", 1.6 + Math.random() * 1.4 + "s");
    i.style.setProperty("--del", Math.random() * 1.2 + "s");
    i.style.setProperty("--giro", (360 + Math.random() * 360) * (Math.random() < 0.5 ? -1 : 1) + "deg");
    cf.appendChild(i);
  }
  v.appendChild(cf);
  setTimeout(() => cf.remove(), 4500);
  // 3) puntos y monedas suben contando desde 0 y al terminar el cuadro «rebota» con un estallido de chispas
  v.querySelectorAll(".cuenta").forEach((s, k) => {
    const hasta = Number(s.dataset.hasta) || 0, inicio = 1100 + k * 150, dur = 900, cuadroPremio = s.parentElement;
    s.textContent = "0";
    const paso = (ahora) => {
      if (!v.isConnected) return;
      const p = Math.min(1, Math.max(0, (ahora - t0 - inicio) / dur));
      s.textContent = fmtNum(Math.round(hasta * (1 - Math.pow(1 - p, 3))));
      if (p < 1) { requestAnimationFrame(paso); return; }
      cuadroPremio.classList.add("rebote");
      const c = v.getBoundingClientRect(), r = cuadroPremio.getBoundingClientRect();
      chisporroteo(v, r.left - c.left + r.width / 2, r.top - c.top + r.height / 2, 10, ["#fff6b0", "#ffc61f", "#ffffff", "#ffe08a"]);
    };
    requestAnimationFrame(paso);
  });
}

// ----- Celebración al pasar un nivel (sustituye al panel de victoria) -----
// 1) Las estrellas ganadas (doradas o moradas) salen del centro de la pantalla UNA TRAS OTRA: cada una se desliza hacia su lugar dejando brillos,
//    separadas entre sí, y se queda moviéndose un poco.
// 2) Cuando ya llevan un rato, un velo oscuro tapa el juego y debajo se abre el mapa: el contorno del país donde juega (mapa.abrir); el velo se aparta.
// 3) Las estrellas caen UNA POR UNA hacia el centro del país, se hacen pequeñas hasta desaparecer y, cuando cada una entra, el país hace «pop»
//    (se hincha, destella y rebota). Al final aparece el botón «Continuar» del centro con un rebote.
// Tocar la pantalla salta la animación. Con «reducir movimiento» solo abre el mapa. Los tiempos están juntos en TIEMPOS para ajustarlos fácil.
const TIEMPOS = {
  entraSep: 420,      // ms entre una estrella y la siguiente al aparecer
  entraDur: 750,      // lo que tarda cada una en deslizarse a su lugar
  quieta: 1300,       // cuánto se mueven las estrellas después de llegar la última, antes del cambio de escena
  velo: 450,          // lo que tarda el velo en tapar (y en apartarse)
  espera: 700,        // país ya visible, antes de que empiece a caer la primera estrella
  caeSep: 800,        // ms entre una estrella y la siguiente al caer al país
  caeDur: 850,        // lo que dura la caída (y el encogerse hasta desaparecer) de cada estrella
  final: 700,         // tras el pop de la última, antes de quitar todo
};
let celId = 0, celTimers = [], celEl = null;
function quitarCelebracion() {
  celId++;
  celTimers.forEach(clearTimeout); celTimers = [];
  if (celEl) { celEl.remove(); celEl = null; }
  mapa.retenerContinuar(false);   // el botón «Continuar» del centro del país vuelve a verse
}
function celebrar(tier, i) {
  quitarCelebracion();
  const id = celId;
  const tras = (ms, fn) => celTimers.push(setTimeout(() => { if (id === celId) fn(); }, ms));
  let abierto = false;
  const abrir = () => { if (!abierto) { abierto = true; abrirMapa(i + 1, true); } };   // abrirMapa → mostrar("pantalla-niveles") no cancela la celebración
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { abrir(); return; }

  const T = TIEMPOS;
  const mor = Math.max(0, tier - 3), cuantas = Math.min(tier, 3);
  const ov = document.createElement("div");
  ov.className = "cel-fondo";
  const velo = document.createElement("div");
  velo.className = "cel-velo";
  const fila = document.createElement("div");
  fila.className = "cel-fila";
  const ests = [];
  for (let k = 0; k < cuantas; k++) {
    const w = document.createElement("div"), e = document.createElement("span");
    w.className = "cel-e";
    e.className = "est cel-mueve " + (k < mor ? "mor" : "oro");
    e.style.animationDelay = (k * T.entraSep + T.entraDur) + "ms";   // empieza a moverse cuando ella llega a su lugar
    w.appendChild(e); fila.appendChild(w); ests.push(w);
  }
  ov.append(velo, fila);
  document.body.appendChild(ov);
  celEl = ov;
  ov.addEventListener("click", () => { abrir(); quitarCelebracion(); });   // tocar = saltar la animación
  const colores = (w) => w.firstChild.classList.contains("mor") ? ["#ffffff", "#ffd1f5", "#d9c2ff", "#c9f3ff"] : ["#fff6b0", "#ffc61f", "#ffffff"];
  const centro = (w) => { const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // 1) una tras otra: salen del centro de la pantalla, giran y se deslizan a su lugar soltando brillos por el camino
  const rf = fila.getBoundingClientRect(), cxFila = rf.left + rf.width / 2, cyFila = rf.top + rf.height / 2;
  ests.forEach((w, k) => {
    const r = w.getBoundingClientRect(), dx = cxFila - (r.left + r.width / 2), dy = cyFila - (r.top + r.height / 2);
    w.animate([
      { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(-200deg)", opacity: 0, offset: 0 },
      { transform: "translate(" + dx * 0.4 + "px," + dy * 0.4 + "px) scale(1.25) rotate(-60deg)", opacity: 1, offset: 0.35 },
      { transform: "none", opacity: 1, offset: 1 },
    ], { duration: T.entraDur, delay: k * T.entraSep, easing: "cubic-bezier(.25,.9,.35,1.15)", fill: "backwards" });
    for (const f of [0.25, 0.5, 0.75]) tras(k * T.entraSep + T.entraDur * f, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 4, colores(w)); });   // brillos en el camino
    tras(k * T.entraSep + T.entraDur, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 8, colores(w)); });                                         // y un destello al llegar
  });

  // 2) cambio de escena: el velo cubre el juego, se abre el mapa debajo y el velo se aparta
  const tLlega = (cuantas - 1) * T.entraSep + T.entraDur;
  const tVelo = tLlega + T.quieta, tMapa = tVelo + T.velo;
  tras(tVelo, () => velo.classList.add("on"));
  tras(tMapa, () => { mapa.retenerContinuar(true); abrir(); velo.classList.remove("on"); });

  // 3) una por una: cada estrella cae al centro del país, se encoge hasta desaparecer y el país hace «pop»
  const T0 = tMapa + T.velo + T.espera;
  ests.forEach((w, k) => tras(T0 + k * T.caeSep, () => {
    const c = mapa.centroPais(), r = w.getBoundingClientRect(), sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    if (!c) { w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }); return; }
    const dx = c.x - sx, dy = c.y - sy, ultima = k === cuantas - 1;
    w.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1, offset: 0 },
      { transform: "translate(" + dx * 0.3 + "px," + (dy * 0.3 - 60) + "px) scale(1.2) rotate(120deg)", opacity: 1, offset: 0.3 },
      { transform: "translate(" + dx * 0.85 + "px," + dy * 0.85 + "px) scale(.55) rotate(300deg)", opacity: 1, offset: 0.75 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(420deg)", opacity: 0.8, offset: 1 },   // entra en el país y desaparece de tan pequeña
    ], { duration: T.caeDur, easing: "ease-in", fill: "forwards" }).onfinish = () => {
      if (id !== celId) return;
      w.style.visibility = "hidden";
      mapa.parpadear(k);                                                                  // el país hace «pop» (cada vez un poco más fuerte)
      chisporroteo(ov, c.x, c.y, ultima ? 16 : 10, ["#fff6b0", "#ffc61f", "#ffffff"]);
      if (ultima) tras(250, () => mapa.retenerContinuar(false));                        // aparece «Continuar» con un rebote
    };
  }));
  tras(T0 + (cuantas - 1) * T.caeSep + T.caeDur + T.final, quitarCelebracion);
}

// ----- Pantallas -----
// «inicio» = el JUEGO cargado en el nivel que toca (el de la cuenta o el primero) visto detrás de un velo difuminado y oscuro (#velo-inicio).
// No se puede jugar hasta tocar «Continuar» (jugarNivel → mostrar("juego")). Ya en el juego solo queda la barra con Modo libre y Niveles.
function textoMenuPausa() { return enInicio ? "" : "Volver al menú principal"; }   // ☰: siempre vuelve al menú principal (el juego cargado con el velo)
function pintarBotonMenu() {
  $("btn-menu").hidden = enInicio;                  // el ☰ no se ve mientras está el velo de inicio
  $("btn-menu").innerHTML = '<span class="b-ico">☰</span>'; // cuadrado, solo icono: el texto va en title y aria-label
  $("btn-menu").title = textoMenuPausa(); $("btn-menu").setAttribute("aria-label", textoMenuPausa());
}
function mostrar(nombre) {
  if (nombre !== "pantalla-niveles") quitarCelebracion();
  enInicio = nombre === "inicio";
  const pant = enInicio ? "juego" : nombre;           // «pantalla-niveles» = el mapa, que se dibuja encima de todo y no es una sección
  for (const p of ["pantalla-libre", "juego"]) $(p).hidden = p !== pant;
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  $("velo-inicio").hidden = !enInicio;
  $("barra-juego").hidden = !(pant === "juego" && !enInicio);
  pintarBotonMenu();
  if (pant !== "juego") { clearInterval(reloj); clearInterval(chispas); }
  if (enInicio) {
    modo = "nivel"; idx = siguientePendiente();
    if (NIVELES[idx]) empezar();                      // carga el nivel que toca
    else { modo = "libre"; libreNum++; inicial = mezclarAzar(libreN, libreDif); empezar(); }   // aún no hay niveles: se ve el modo libre
    pintarInicio();
  }
  pintarMonedas();
  if (nombre === "pantalla-libre") pintarLibre();
}
function pintarInicio() {
  const i = siguientePendiente(), existe = !!NIVELES[i];
  $("btn-jugar").innerHTML = '<span class="b-ico">▶</span><span class="b-rot">' + (hechoMax() ? "Continuar" : "Jugar") + "</span>";
  $("btn-jugar").title = existe ? nombreNivel(i) : "Todavía no hay niveles: se juega el modo libre";
}

// Modo libre (estándar 7.2): grupo «Dificultad» (5 emojis) y grupo «Tablero» (tamaños). Aquí NO se muestra ningún nivel.
// Se recuerda la última selección en el dispositivo (clave terminada en _v1 para que entre en la copia de seguridad de almacen.js).
const CLAVE_LIBRE = "deslizante_libre_v1";
// Las 5 dificultades estándar. «pasos» = jugadas al azar desde el tablero resuelto, por casilla (n·n); null = totalmente revuelto.
const DIFICULTADES = [
  { emoji: "😁", nombre: "Muy fácil",  pasos: 0.5, nota: "Casi armado: pocas fichas fuera de lugar." },
  { emoji: "😬", nombre: "Fácil",      pasos: 1.5, nota: "Algo revuelto, se arregla rápido." },
  { emoji: "😐", nombre: "Normal",     pasos: 4,   nota: "Bien revuelto." },
  { emoji: "😡", nombre: "Difícil",    pasos: 12,  nota: "Muy revuelto." },
  { emoji: "😈", nombre: "Demoníaco",  pasos: null, nota: "Totalmente al azar (el más difícil)." },
];
let libreDif = 2;                                  // dificultad elegida (índice de DIFICULTADES)
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g) { if (DIFICULTADES[g.d]) libreDif = g.d; if (g.n >= TAMANO_MIN && g.n <= TAMANO_MAX) libreN = g.n; } } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif, n: libreN })); } catch (e) {} };
// Clave del récord: «Demoníaco» conserva las claves viejas (solo el tamaño) porque antes todo era totalmente al azar
const claveLibre = (m, d = libreDif) => (DIFICULTADES[d].pasos === null ? String(m) : m + "-" + d);

function pintarLibre() {
  if (!tamanoAbierto(libreN)) libreN = TAMANO_MIN;  // el tamaño recordado ya no está abierto
  const df = $("dif-fila"), tf = $("tam-fila");
  df.replaceChildren(); tf.replaceChildren();
  DIFICULTADES.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (i === libreDif ? "b-oro on" : "b-cielo");
    b.innerHTML = '<span class="b-ico">' + d.emoji + "</span>";
    b.title = d.nombre; b.setAttribute("aria-label", d.nombre); b.setAttribute("aria-pressed", String(i === libreDif));
    b.addEventListener("click", () => { libreDif = i; guardarLibre(); pintarLibre(); });
    df.appendChild(b);
  });
  $("dif-nombre").textContent = DIFICULTADES[libreDif].emoji + " " + DIFICULTADES[libreDif].nombre + " · " + DIFICULTADES[libreDif].nota;
  for (let m = TAMANO_MIN; m <= TAMANO_MAX; m++) {
    const abierto = tamanoAbierto(m);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "b3d txt " + (m === libreN ? "b-oro on" : "b-cielo");
    b.textContent = abierto ? m + "×" + m : "🔒 " + m;
    b.disabled = !abierto;
    b.title = abierto ? m + "×" + m : "Bloqueado";
    b.setAttribute("aria-label", abierto ? "Tablero " + m + "×" + m : m + "×" + m + " bloqueado");
    b.setAttribute("aria-pressed", String(m === libreN));
    b.addEventListener("click", () => { libreN = m; guardarLibre(); pintarLibre(); });
    tf.appendChild(b);
  }
  $("nota-libre").textContent = "Ganar aquí da " + puntosJuegoDe(libreN) + " puntos del juego. No da monedas ni puntos al perfil.";
  const r = prog.libre[claveLibre(libreN)];
  $("libre-record").textContent = r ? "🏆 Récord " + libreN + "×" + libreN + " " + DIFICULTADES[libreDif].emoji + ": " + fmtMs(r.ms) + " · " + r.mov + " mov. · " + r.ganados + " resueltos" : "🏆 Aún sin resolver en esta combinación";
}

// ----- Juego -----
let enInicio = false;                              // ¿se ve la barra de inicio sobre el juego cargado?
let modo = "nivel";                                // "nivel" (niveles fijos) o "libre" (tableros al azar sin fin)
let libreNum = 0, inicial = [];                    // modo libre: número de tablero de esta sesión y tablero de partida (libreN y libreDif están arriba)
let idx = 0, n = 3, t = [];                        // t[pos] = número de la ficha (0 = hueco)
let movs = 0, inicio = 0, reloj = null, jugando = false;
let previo = 0;                                    // ms ya jugados (siempre 0: ya no hay partidas guardadas)
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
  if (pos < 0 || jugando === "fin" || enInicio) return;
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
const mejorActual = () => (modo === "libre" ? prog.libre[claveLibre(libreN)] : prog.mejores[idx + 1]);
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

// Tablero al azar con solución garantizada. d = índice de DIFICULTADES:
//  · «Demoníaco» (pasos null): totalmente revuelto (hueco al final y número par de inversiones).
//  · Las demás: se parte del tablero resuelto y se hacen jugadas legales al azar (sin deshacer la anterior), así siempre tiene solución.
function mezclarAzar(m, d = DIFICULTADES.length - 1) {
  const pasos = DIFICULTADES[d].pasos;
  let a;
  if (pasos !== null) {
    const total = Math.max(3, Math.round(pasos * m * m));
    do {
      a = Array.from({ length: m * m }, (_, i) => (i + 1) % (m * m));   // resuelto: 1…, hueco (0) al final
      let h = m * m - 1, ant = -1;
      for (let s = 0; s < total; s++) {
        const f = Math.floor(h / m), c = h % m, vec = [];
        if (f > 0) vec.push(h - m);
        if (f < m - 1) vec.push(h + m);
        if (c > 0) vec.push(h - 1);
        if (c < m - 1) vec.push(h + 1);
        const op = vec.filter((x) => x !== ant), x = op[Math.floor(Math.random() * op.length)];
        a[h] = a[x]; a[x] = 0; ant = h; h = x;
      }
    } while (a.every((v, i) => (i === a.length - 1 ? v === 0 : v === i + 1)));   // que no salga ya resuelto
    return a;
  }
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
  // Recompensas: puntos del JUEGO en toda partida ganada; monedas y punto del portal solo la primera vez que se pasa un nivel
  const ptsJuego = puntosJuegoDe(n);
  const monedas = primera ? monedasDe(n) : 0;
  // Estrellas (adorno, antes de actualizar los récords)
  const cE = !libre && conEstrellas(n);
  const antes = cE ? tierNivel(idx) : 0;
  const nuevoTier = Math.max(antes, cE ? tierPorTiempo(n, ms) : 0);
  prog.puntos += ptsJuego;
  if (libre) { const k = claveLibre(libreN); prog.libre[k] = { ...nueva, ganados: ((prog.libre[k] && prog.libre[k].ganados) || 0) + 1 }; }
  else { prog.mejores[idx + 1] = nueva; prog.hechos = Math.max(prog.hechos, idx + 1); if (cE) prog.estrellas[idx + 1] = nuevoTier; }
  guardarProg();
  pintarMejor();
  pintarMonedas();
  pintarMetaJuego();

  if (!libre) {
    // Al pasar un nivel ya no hay panel: las estrellas ganadas aparecen en el centro, la escena cambia al país actual y las estrellas caen en él (ver celebrar)
    celebrar(cE ? Math.max(1, nuevoTier) : 1, idx);
  } else {                                           // modo libre: no hay estrellas ni mapa, así que conserva su ventanita con los botones
    const v = document.createElement("div");
    v.id = "victoria";
    const cuadro = (d, titulo, valor, extra) => '<div class="vic-caja" style="--d:' + d + 's"><span>' + titulo + "</span><b>" + valor + "</b>" + (extra ? '<span class="rec">' + extra + "</span>" : "") + "</div>";
    v.innerHTML =
      '<div class="vic-arriba"><h2>🎉 ¡Resuelto!</h2></div>' +
      '<div class="vic-centro"><div class="vic-grid">' +
        cuadro(0.5, "⏱️ Tiempo", fmtMs(ms), "") +
        cuadro(0.6, "🥇 Mejor tiempo", fmtMs(nueva.ms), recordMs ? "🏆 ¡Nuevo récord!" : "") +
        cuadro(0.7, "👣 Movimientos", movs, "") +
        cuadro(0.8, "🏆 Récord mov.", nueva.mov, recordMov ? "🏆 ¡Nuevo récord!" : "") +
      '</div><div class="vic-premios"><div class="vic-premio" style="--d:1s">🏅 +<span class="cuenta" data-hasta="' + ptsJuego + '">' + fmtNum(ptsJuego) + "</span> puntos</div></div></div>";
    const caja = document.createElement("div");
    caja.className = "botones";
    const boton = (texto, clase, fn) => { const b = document.createElement("button"); b.className = "b3d txt " + clase; b.textContent = texto; b.addEventListener("click", fn); caja.appendChild(b); };
    boton("Otro tablero", "b-verde", () => jugarLibre(libreN));
    boton("⚙️ Cambiar tablero", "b-cielo", () => mostrar("pantalla-libre"));
    v.appendChild(caja);
    $("tablero").appendChild(v);
    animarVictoria(v, 0);
  }

  if (!primera) {                                   // el punto del portal se da solo la primera vez que se pasa un nivel
    $("msg").textContent = libre ? "Modo libre: no da monedas ni puntos al perfil, pero guarda tu mejor marca." : "";
    return;
  }
  encolarNivel(ID);                                 // 1 punto estándar del portal: se anota en el dispositivo y se envía al perfil cuando haya internet y sesión
  let pendientes = 1;
  try { pendientes = await (await import("../compartido/progreso.js")).vaciarPuntos(); } catch (e) {}
  $("msg").textContent = pendientes === 0
    ? "+1 punto a tu perfil"
    : "+1 punto anotado: se enviará a tu perfil cuando tengas internet y hayas entrado con Google.";
}

// Botón verde de arriba (donde estaban Modo libre y Niveles): el nombre del nivel que se está jugando (sin el tamaño: ese va bajo el tablero)
function pintarNombre(texto) { $("nombre-nivel").textContent = texto; $("barra-juego").setAttribute("aria-label", texto); }
function empezar() {
  clearInterval(reloj); clearInterval(chispas); quitarCelebracion();
  const v = $("victoria"); if (v) v.remove();
  if (modo === "libre") {
    n = libreN; t = inicial.slice();
    pintarNombre("♾️ Modo libre " + DIFICULTADES[libreDif].emoji);
    $("titulo").innerHTML = n + "×" + n + "<small>" + DIFICULTADES[libreDif].emoji + " " + DIFICULTADES[libreDif].nombre + " · tablero " + libreNum + " de esta sesión</small>";
  } else {
    const l = NIVELES[idx];
    n = l.n; t = l.fichas.slice();
    pintarNombre(nombreNivel(idx));
    $("titulo").innerHTML = n + "×" + n + (() => { const mk = prog.mejores[idx + 1], p = []; if (l.optimo) p.push("Mínimo posible: " + l.optimo); if (mk) p.push("Tu mejor: " + mk.mov + " mov."); return p.length ? "<small>" + p.join(" · ") + "</small>" : ""; })();
  }
  movs = 0; previo = 0; jugando = false;
  if (!esResoluble(n, t)) console.warn("deslizante: este tablero no tiene solución");
  $("tiempo").textContent = fmtMs(previo);
  $("msg").textContent = "";
  construir(); pintar(); pintarMejor();
  pintarMetaJuego();
}
function jugarNivel(i) {
  if (!(i >= 0 && i < TOTAL) || !desbloqueado(i)) return;
  if (!NIVELES[i]) { aviso("🚧 Los niveles todavía no están creados"); return; }
  modo = "nivel"; idx = i;
  mostrar("juego");
  empezar();
}
function jugarLibre(m) {
  if (!tamanoAbierto(m)) return;
  modo = "libre"; libreN = m; libreNum++; inicial = mezclarAzar(m, libreDif); guardarLibre();
  mostrar("juego");
  empezar();
}

// ----- Botones y teclado -----
$("btn-jugar").addEventListener("click", () => { const i = siguientePendiente(); if (NIVELES[i]) jugarNivel(i); else jugarLibre(libreN); });   // sin niveles: modo libre
$("btn-niveles").addEventListener("click", () => abrirMapa());
$("btn-libre-jugar").addEventListener("click", () => jugarLibre(libreN));
$("btn-libre").addEventListener("click", () => mostrar("pantalla-libre"));
// ☰: en cualquier pantalla (también dentro de una partida) vuelve al menú principal: el juego cargado con el velo. No hay menú de pausa;
// lo que se avanzó en la partida en curso no se guarda (una partida guardada antes no se toca).
$("btn-menu").addEventListener("click", () => mostrar("inicio"));
addEventListener("keydown", (e) => {
  if ($("juego").hidden || enInicio) return;
  const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] }[e.key];
  if (d) { e.preventDefault(); mover(d[0], d[1]); }
});

mostrar("inicio");

// ----- Sesión y nube (opcionales: si Firebase no carga, el juego igual funciona) -----
import("../compartido/jugador.js").then(({ alCambiarSesion }) =>
  alCambiarSesion((u) => ($("sesion").textContent = u ? (u.displayName || "Jugador") : "Sin sesión"))
).catch(() => {});

// Niveles pasados: gana el nivel más alto (pasado en cualquier sitio = pasado). Récords: por nivel (o por tamaño en el modo libre),
// el menor número de movimientos y el menor tiempo (cada uno por separado); de los tableros resueltos en modo libre gana el mayor.
// Los puntos del juego se unen con el mayor de los dos (un marcador acumulado no se puede sumar entre dispositivos sin duplicar).
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
      return { v: VERSION_PROG, hechos: Math.max(a ? a.hechos : 0, b ? b.hechos : 0), mejores: mej, libre: lib, estrellas: est, puntos: Math.max(a ? a.puntos : 0, b ? b.puntos : 0) };
    },
    alCambiar: (v) => {
      prog = limpiar(v) || prog;
      if (enInicio) mostrar("inicio");   // aún no ha tocado Continuar: se carga el nivel que lleva su cuenta
      mapa.refrescar();                 // si el mapa está abierto, se redibuja con el progreso de la cuenta
      if (!$("pantalla-libre").hidden) pintarLibre();
      pintarMonedas();
      if (!$("juego").hidden && !enInicio) { pintarMejor(); pintarMetaJuego(); }
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});
