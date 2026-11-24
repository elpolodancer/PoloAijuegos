// Ruta: 5deslizante/juego-5deslizante.js
// Puzle deslizante (estilo «15 puzzle»): ordena las fichas numeradas de 1 en adelante, con el hueco al final.
// Al abrir se ve UNA SOLA VEZ la pantalla de inicio (♾️ Modo libre · ▶ Jugar · 🗺️ Mapa); de ahí en adelante el «menú principal» es el mapa del país donde va el jugador (Mapa · Niveles · Modo libre arriba y «Continuar · Nivel N» en el centro). El mapa estándar de países
// (compartido/mapa-niveles.js, modo soloPaises): 3 900 niveles, 20 por país, con México primero y China al final (orden en compartido/etapas-mapa.js).
// Los 3 900 niveles están en niveles-5deslizante.js (si algún día falta alguno, el mapa muestra 🚧).
import { encolarNivel, leerCola, guardarCola } from "../compartido/cola-puntos.js";
import { crearEtapas } from "../compartido/etapas-mapa.js";
import { montarMapa } from "../compartido/mapa-niveles.js";
import { crearMenuPausa } from "../compartido/menu-pausa.js";
import { NIVELES, POR_ETAPA, TAMANO_MIN, TAMANO_MAX, monedasDe, puntosJuegoDe } from "./niveles-5deslizante.js";

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

// Modo libre: los 28 tamaños (3×3 a 30×30) están abiertos.
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
let mapaEnPrincipal = true;                        // ¿el mapa está en su vista principal (la del país)? Ahí el ☰ no se ve: el mapa ES el menú principal
const mapa = montarMapa({
  prefijo: ID,
  etapas: ETAPAS,
  unPais: true,                                    // se abre el país donde va el jugador; 🗺️ Mapa = el mundo con los países abiertos y, al tocar uno, sus 20 niveles
  columnas: 4,                                     // los 20 niveles de un país: 4 columnas × 5 filas
  botonesExtra: [{ icono: "♾️", texto: "Modo libre", clase: "b-morado", fn: () => mostrar("pantalla-libre") }],   // el Modo libre se abre desde el mapa
  alCambiarVista: (esPrincipal) => { mapaEnPrincipal = esPrincipal; pintarBotonMenu(); },   // el ☰ se rotula según la vista
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
// Las estrellas YA NO dan monedas. Las monedas son fijas por tamaño (niveles-5deslizante.js, monedasDe): de 15 a 80 por nivel, una sola vez.
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
// 1) Las estrellas ganadas (hasta 3: doradas, moradas o mezcladas; las moradas van primero) salen UNA TRAS OTRA del centro de la pantalla y, sin detenerse,
//    vuelan dejando brillos hasta su lugar: arriba a la derecha (sin pegarse a los bordes).
// 2) Ya ahí se quedan quietas un momento (TIEMPOS.quieta) y sale de ellas el texto «N estrellas» (sube un poco creciendo y se desvanece) mientras un velo oscuro tapa el juego y debajo se abre el mapa:
//    el contorno del país donde juega (mapa.abrir); el velo se aparta y las estrellas siguen arriba a la derecha.
// 3) Desde ahí las estrellas caen UNA POR UNA hacia el centro del país, se hacen pequeñas hasta desaparecer y, cuando cada una entra, el país hace «pop»
//    (se hincha, destella y rebota). Al final aparece el botón «Continuar» del centro con un rebote.
// Tocar la pantalla (con un toque NUEVO, no el que terminó el nivel) salta la animación. Los tiempos están juntos en TIEMPOS para ajustarlos fácil.
const RESPETAR_MOVIMIENTO_REDUCIDO = false;   // false = la celebración se ve siempre (en muchos PC y celulares «reducir movimiento» viene activado sin que la persona lo sepa y la animación nunca salía; igual que en el Solitario). true = con «reducir movimiento» solo se abre el mapa
const TIEMPOS = {
  entraSep: 90,       // ms entre una estrella y la siguiente al salir del centro
  entraDur: 280,      // lo que tarda cada una en volar del centro a su lugar (arriba a la derecha); empieza a moverse en cuanto aparece
  quieta: 370,        // ya todas arriba a la derecha: se quedan ESTÁTICAS este rato para que se vean bien (aquí sale el texto «N estrellas»)
  arriba: 100,        // y un instante más antes de que el velo cambie la escena
  texto: 4500,        // lo que dura el texto «N estrellas» (sale de las estrellas, se pone encima y se queda: ~2,7 s completo y ~1,8 s desvaneciéndose poco a poco); NO depende de lo que dura el resto de la celebración. Se quita al instante al empezar otro nivel (Continuar)
  velo: 100,          // lo que tarda el velo en tapar (y en apartarse)
  espera: 120,        // país ya visible, antes de que empiece a caer la primera estrella
  caeSep: 150,        // ms entre una estrella y la siguiente al caer al país
  caeDur: 200,        // lo que dura la caída (y el encogerse hasta desaparecer) de cada estrella
  final: 100,         // tras el pop de la última, antes de quitar todo
  continuar: 90,      // tras entrar la última estrella, cuando aparece «Continuar» con su rebote
};
const RITMO = 1;      // 1 = los tiempos de arriba tal cual (~1,85 s con 3 estrellas); 2 = el doble de lento; 0.5 = el doble de rápido. Multiplica todos los tiempos de arriba
for (const k in TIEMPOS) TIEMPOS[k] = Math.round(TIEMPOS[k] * RITMO);
let celId = 0, celTimers = [], celEl = null, textoCel = null;
// El texto «N estrellas» vive aparte de la celebración (en <body>) para seguir ahí cuando las estrellas ya cayeron; se quita al empezar cualquier nivel o con otra celebración
function quitarTextoCel() { if (textoCel) { textoCel.remove(); textoCel = null; } }
function quitarCelebracion() {
  celId++;
  celTimers.forEach(clearTimeout); celTimers = [];
  if (celEl) { celEl.remove(); celEl = null; }
  mapa.retenerContinuar(false);   // el botón «Continuar» del centro del país vuelve a verse
}
function celebrar(tier, i, monedas = 0) {
  quitarCelebracion();
  quitarTextoCel();
  const id = celId;
  const tras = (ms, fn) => celTimers.push(setTimeout(() => { if (id === celId) fn(); }, ms));
  let abierto = false;
  const abrir = () => { if (!abierto) { abierto = true; abrirMapa(i + 1, true); } };   // abrirMapa → mostrar("pantalla-niveles") no cancela la celebración
  if (RESPETAR_MOVIMIENTO_REDUCIDO && matchMedia("(prefers-reduced-motion: reduce)").matches) { abrir(); return; }

  const T = TIEMPOS;
  const mor = Math.max(0, tier - 3), cuantas = Math.min(tier, 3);
  // Solo doradas → «N estrellas doradas»; las 3 moradas → «3 estrellas moradas»; mezcladas (doradas y moradas) → solo la cantidad, sin color
  const una = cuantas === 1, color = mor === 0 ? (una ? " dorada" : " doradas") : mor === 3 ? " moradas" : "";
  const textoEst = cuantas + (una ? " estrella" : " estrellas") + color;
  const ov = document.createElement("div");
  ov.className = "cel-fondo";
  const velo = document.createElement("div");
  velo.className = "cel-velo";
  velo.style.transition = "opacity " + T.velo + "ms ease";
  const fila = document.createElement("div");
  fila.className = "cel-fila";
  const ests = [];
  for (let k = 0; k < cuantas; k++) {
    const w = document.createElement("div"), e = document.createElement("span");
    w.className = "cel-e";
    e.className = "est " + (k < mor ? "mor" : "oro");   // sin vaivén: al llegar arriba se quedan quietas
    w.appendChild(e); fila.appendChild(w); ests.push(w);
  }
  ov.append(velo, fila);
  document.body.appendChild(ov);
  celEl = ov;
  // Tocar = saltar la animación, pero solo con un toque NUEVO sobre la celebración: en celulares el «clic» del mismo dedo que terminó el nivel
  // caía sobre la celebración (las fichas se mueven al tocar, con pointerdown) y la cerraba al instante, por eso en celular parecía no existir.
  let tocado = false;
  ov.addEventListener("pointerdown", () => { tocado = true; });
  ov.addEventListener("click", () => { if (!tocado) return; abrir(); quitarCelebracion(); });
  const colores = (w) => w.firstChild.classList.contains("mor") ? ["#ffffff", "#ffd1f5", "#d9c2ff", "#c9f3ff"] : ["#fff6b0", "#ffc61f", "#ffffff"];
  const centro = (w) => { const r = w.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  // 1) la fila ya se coloca en su lugar final (arriba a la derecha) y cada estrella sale del centro de la pantalla y vuela hasta su lugar soltando brillos
  const rf = fila.getBoundingClientRect(), cxFila = rf.left + rf.width / 2, cyFila = rf.top + rf.height / 2;
  const tx = Math.min(innerWidth * 0.78, innerWidth - rf.width / 2 - 28), ty = Math.max(innerHeight * (innerWidth < 640 ? 0.3 : 0.2), rf.height / 2 + 80);   // sin llegar a los bordes ni a los botones de arriba
  fila.style.transform = "translate(" + (tx - cxFila) + "px," + (ty - cyFila) + "px)";
  const cxPantalla = innerWidth / 2, cyPantalla = innerHeight / 2;
  ests.forEach((w, k) => {
    const r = w.getBoundingClientRect(), dx = cxPantalla - (r.left + r.width / 2), dy = cyPantalla - (r.top + r.height / 2);   // de su lugar al centro de la pantalla
    w.animate([
      { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(-200deg)", opacity: 0, offset: 0 },
      { transform: "translate(" + dx * 0.8 + "px," + dy * 0.8 + "px) scale(1.3) rotate(-120deg)", opacity: 1, offset: 0.18 },   // aparece en el centro y ya va en camino
      { transform: "none", opacity: 1, offset: 1 },
    ], { duration: T.entraDur, delay: k * T.entraSep, easing: "cubic-bezier(.25,.9,.35,1.15)", fill: "backwards" });
    for (const f of [0.3, 0.6]) tras(k * T.entraSep + T.entraDur * f, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 4, colores(w)); });   // brillos en el camino
    tras(k * T.entraSep + T.entraDur, () => { const c = centro(w); chisporroteo(ov, c.x, c.y, 8, colores(w)); });                                      // y un destello al llegar
  });

  // 2) cambio de escena: con todas ya arriba, el velo cubre el juego, se abre el mapa debajo y el velo se aparta
  const tLlega = (cuantas - 1) * T.entraSep + T.entraDur;
  const tVelo = tLlega + T.quieta + T.arriba, tMapa = tVelo + T.velo;
  tras(tVelo, () => velo.classList.add("on"));
  tras(tMapa, () => { mapa.retenerContinuar(true); abrir(); velo.classList.remove("on"); });

  // 2b) texto «N estrellas» (y, si las hay, las monedas ganadas): sale de la posición de las estrellas cuando llegan arriba, se coloca un poco encima y se queda
  //     unos 4,5 s subiendo despacio y desvaneciéndose poco a poco, aunque la celebración ya haya terminado. Al empezar otro nivel desaparece al instante (quitarTextoCel).
  tras(tLlega, () => {
    const r = fila.getBoundingClientRect();
    const txt = document.createElement("div");
    txt.className = "cel-txt";
    const l1 = document.createElement("div");
    l1.textContent = textoEst;
    txt.appendChild(l1);
    if (monedas > 0) { const l2 = document.createElement("div"); l2.className = "cel-txt2"; l2.textContent = "💰 +" + fmtNum(monedas) + " monedas"; txt.appendChild(l2); }
    txt.style.left = r.left + r.width / 2 + "px"; txt.style.top = r.top + r.height / 2 + "px";   // centro de las estrellas
    document.body.appendChild(txt);
    textoCel = txt;
    const base = r.height / 2 + txt.offsetHeight / 2 + 12;                                       // «ligeramente arriba» de las estrellas
    const pos = (dy, s) => "translate(-50%,-50%) translateY(" + dy + "px) scale(" + s + ")";
    const colocado = Math.min(0.2, 180 / T.texto);                                               // lo que tarda en salir de las estrellas y colocarse (~0,18 s)
    txt.animate([
      { transform: pos(0, 0.3), opacity: 0, offset: 0, easing: "cubic-bezier(.2,.9,.3,1.2)" },
      { transform: pos(-base, 1), opacity: 1, offset: colocado, easing: "linear" },
      { transform: pos(-base - 8, 1.08), opacity: 1, offset: 0.6, easing: "linear" },           // se queda completo ~2,7 s subiendo apenas
      { transform: pos(-base - 16, 1.15), opacity: 0, offset: 1 },                               // y se desvanece poco a poco
    ], { duration: T.texto, fill: "forwards" }).onfinish = () => { txt.remove(); if (textoCel === txt) textoCel = null; };
  });

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
      if (ultima) tras(T.continuar, () => mapa.retenerContinuar(false));                        // aparece «Continuar» con un rebote
    };
  }));
  tras(T0 + (cuantas - 1) * T.caeSep + T.caeDur + T.final, quitarCelebracion);
}

// ----- Pantallas -----
// PANTALLA DE INICIO («pantalla-inicio»): se muestra solo al abrir el juego (o recargar con F5), una vez. Nada vuelve a ella: «inicio» y el ☰ siempre llevan al mapa.
// Su ☰ no se muestra. Jugar = el nivel que toca; Modo libre = pantalla del Modo libre; Mapa = el mapa del país donde va el jugador.
// Después, el MENÚ PRINCIPAL es el MAPA (compartido/mapa-niveles.js, vista del país donde va el jugador),
// con Mapa · Niveles · Modo libre · Info y «Continuar» en el centro del país.
// «pantalla-niveles» = el mapa, que se dibuja encima de todo y no es una sección; «inicio» = abrir el mapa.
function pintarBotonMenu() {
  const enMapa = mapa.abierto();
  $("btn-menu").hidden = !$("pantalla-inicio").hidden || (enMapa && mapaEnPrincipal);   // tampoco se ve en la pantalla de inicio   // en el mapa principal no se muestra; en sus vistas internas (Mapa, Niveles) vuelve «Atrás»
  const texto = enMapa ? "Atrás" : !$("juego").hidden && modo === "libre" ? "Pausa" : "Volver al menú principal";
  $("btn-menu").innerHTML = '<span class="b-ico">☰</span>'; // cuadrado, solo icono: el texto va en title y aria-label
  $("btn-menu").title = texto; $("btn-menu").setAttribute("aria-label", texto);
}
function mostrar(nombre) {
  if (nombre === "inicio") { abrirMapa(); return; }
  if (nombre !== "pantalla-niveles") quitarCelebracion();
  for (const p of ["pantalla-inicio", "pantalla-libre", "juego"]) $(p).hidden = p !== nombre;
  if (nombre !== "pantalla-niveles") mapa.cerrar();
  $("barra-juego").hidden = nombre !== "juego";
  $("barra-fila").hidden = nombre !== "juego";
  $("btn-mapa-juego").hidden = modo === "libre";   // el 🗺️ solo en los niveles (el Modo libre no tiene mapa)
  pintarBotonMenu();
  if (nombre !== "juego") { clearInterval(reloj); clearInterval(chispas); }
  pintarMonedas();
  if (nombre === "pantalla-libre") pintarLibre();
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
const LIBRE_VISIBLES = 10;                         // tableros que se ven al abrir el Modo libre (3×3 a 10×10); el resto sale con «Mostrar más tableros»
let libreMas = false;                              // true = ya se pulsó «Mostrar más tableros» (se recuerda mientras la página siga abierta)
let libreDif = 2;                                  // dificultad elegida (índice de DIFICULTADES)
try { const g = JSON.parse(localStorage.getItem(CLAVE_LIBRE)); if (g) { if (DIFICULTADES[g.d]) libreDif = g.d; if (g.n >= TAMANO_MIN && g.n <= TAMANO_MAX) libreN = g.n; } } catch (e) {}
const guardarLibre = () => { try { localStorage.setItem(CLAVE_LIBRE, JSON.stringify({ d: libreDif, n: libreN })); } catch (e) {} };
// Clave del récord: «Demoníaco» conserva las claves viejas (solo el tamaño) porque antes todo era totalmente al azar
const claveLibre = (m, d = libreDif) => (DIFICULTADES[d].pasos === null ? String(m) : m + "-" + d);

function pintarLibre() {
  pintarCuentaGuardadas();
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
  if (libreN > LIBRE_VISIBLES) libreMas = true;       // el tablero elegido (o el de una partida guardada) tiene que verse
  const ultimo = libreMas ? TAMANO_MAX : Math.min(TAMANO_MAX, LIBRE_VISIBLES);
  $("btn-mas-tableros").hidden = ultimo >= TAMANO_MAX;
  for (let m = TAMANO_MIN; m <= ultimo; m++) {
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
let modo = "nivel";                                // "nivel" (niveles fijos) o "libre" (tableros al azar sin fin)
let libreNum = 0, inicial = [];                    // modo libre: número de tablero de esta sesión y tablero de partida (libreN y libreDif están arriba)
let idx = 0, n = 3, t = [];                        // t[pos] = número de la ficha (0 = hueco)
let movs = 0, inicio = 0, reloj = null, jugando = false;
let previo = 0;                                    // ms ya jugados (0 en un tablero nuevo; en una partida guardada, lo que llevaba)
let partidaId = null, guardadaMovs = -1;           // Modo libre: la partida de «Partidas guardadas» que se está jugando y los movimientos que llevaba al guardarla
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
  zoomReiniciar();
  for (let k = 1; k < n * n; k++) {
    const f = document.createElement("div");
    f.className = "ficha";
    const s = document.createElement("span");
    s.textContent = k;
    s.style.background = color(k);
    f.appendChild(s);
    f.dataset.k = k;
    f.addEventListener("pointerdown", (e) => { if (n >= ZOOM_DESDE) return; e.preventDefault(); tocar(t.indexOf(k)); });   // con zoom (n ≥ 10) la jugada se hace al soltar, ver «Zoom»
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
  if (pos < 0 || jugando === "fin" || pausado) return;
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

// ----- Zoom (tableros de ZOOM_DESDE × ZOOM_DESDE en adelante, en niveles y en Modo libre) -----
// Se escala #fichas con transform (origen arriba a la izquierda) dentro de #ventana-fichas, que recorta lo que se sale. zx y zy son el desplazamiento en «lados del tablero»
// (así no cambian si la ventana cambia de tamaño). Acercar: pellizco con dos dedos, rueda del ratón (o Ctrl + rueda), botones ＋ −, o las teclas + y −. Mover: arrastrar.
// En estos tableros la ficha se mueve al SOLTAR si fue un toque (sin arrastrar ni pellizcar); en los tableros chicos sigue moviéndose al tocar.
const ZOOM_DESDE = 10;
let zoom = 1, zx = 0, zy = 0;
const zoomMax = () => Math.min(8, Math.max(3, n * 0.4));          // 10×10 → ×4 · 20×20 y más → ×8
const acotarZoom = (v) => Math.max(1, Math.min(zoomMax(), v));
function zoomAplicar() {
  zoom = acotarZoom(zoom);
  zx = Math.max(1 - zoom, Math.min(0, zx));
  zy = Math.max(1 - zoom, Math.min(0, zy));
  $("fichas").style.transform = zoom === 1 ? "" : "translate(" + zx * 100 + "%," + zy * 100 + "%) scale(" + zoom + ")";
  $("zoom-nivel").textContent = Math.round(zoom * 100) + " %";
  $("zoom-ayuda").hidden = zoom > 1;
}
function zoomReiniciar() {                                         // tablero nuevo (o «Ver todo»): sin zoom; la barra solo sale en tableros grandes
  zoom = 1; zx = 0; zy = 0;
  $("zoom-barra").hidden = n < ZOOM_DESDE;
  zoomAplicar();
}
function zoomEn(factor, cx, cy) {                                  // multiplica el zoom dejando quieto el punto (cx, cy) de la pantalla (por defecto, el centro)
  const r = $("ventana-fichas").getBoundingClientRect();
  if (!r.width || !r.height) return;
  const mx = cx == null ? 0.5 : (cx - r.left) / r.width, my = cy == null ? 0.5 : (cy - r.top) / r.height;
  const z2 = acotarZoom(zoom * factor);
  const px = (mx - zx) / zoom, py = (my - zy) / zoom;              // punto del tablero que está bajo el dedo
  zx = mx - px * z2; zy = my - py * z2; zoom = z2;
  zoomAplicar();
}
{
  const vent = $("ventana-fichas"), punteros = new Map();
  let gesto = null;                                                // { k: ficha tocada, x0, y0, movido, multi }
  vent.addEventListener("pointerdown", (e) => {
    if (n < ZOOM_DESDE || jugando === "fin" || pausado) return;
    e.preventDefault();
    try { vent.setPointerCapture(e.pointerId); } catch (err) {}
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 1) {
      const f = e.target.closest && e.target.closest(".ficha");
      gesto = { k: f ? Number(f.dataset.k) : 0, x0: e.clientX, y0: e.clientY, movido: false, multi: false };
    } else if (gesto) gesto.multi = gesto.movido = true;           // segundo dedo: es un pellizco, no un toque
  });
  vent.addEventListener("pointermove", (e) => {
    const p = punteros.get(e.pointerId);
    if (!p || !gesto) return;
    const r = vent.getBoundingClientRect();
    if (punteros.size >= 2) {
      const otro = [...punteros.entries()].find(([id]) => id !== e.pointerId)[1];
      const dAntes = Math.hypot(p.x - otro.x, p.y - otro.y), dAhora = Math.hypot(e.clientX - otro.x, e.clientY - otro.y);
      const mAntesX = (p.x + otro.x) / 2, mAntesY = (p.y + otro.y) / 2, mAhoraX = (e.clientX + otro.x) / 2, mAhoraY = (e.clientY + otro.y) / 2;
      zx += (mAhoraX - mAntesX) / r.width; zy += (mAhoraY - mAntesY) / r.height;   // primero se mueve con los dos dedos…
      if (dAntes > 0) zoomEn(dAhora / dAntes, mAhoraX, mAhoraY); else zoomAplicar(); // …y luego se acerca alrededor de ellos
    } else {
      if (!gesto.movido && Math.hypot(e.clientX - gesto.x0, e.clientY - gesto.y0) < 8) return;   // todavía puede ser un toque
      gesto.movido = true;
      if (zoom > 1) { zx += (e.clientX - p.x) / r.width; zy += (e.clientY - p.y) / r.height; zoomAplicar(); }
    }
    p.x = e.clientX; p.y = e.clientY;
  });
  const soltar = (e) => {
    if (!punteros.delete(e.pointerId) || punteros.size || !gesto) return;
    const g = gesto; gesto = null;
    if (e.type === "pointerup" && !g.movido && !g.multi && g.k) tocar(t.indexOf(g.k));        // fue un toque: se mueve la ficha
  };
  vent.addEventListener("pointerup", soltar);
  vent.addEventListener("pointercancel", soltar);
  vent.addEventListener("wheel", (e) => {
    if (n < ZOOM_DESDE) return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomEn(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
  }, { passive: false });
  $("zoom-mas").addEventListener("click", () => zoomEn(1.5));
  $("zoom-menos").addEventListener("click", () => zoomEn(1 / 1.5));
  $("zoom-ajustar").addEventListener("click", zoomReiniciar);
  addEventListener("keydown", (e) => {
    if ($("juego").hidden || n < ZOOM_DESDE || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "+" || e.key === "=") zoomEn(1.25);
    else if (e.key === "-" || e.key === "_") zoomEn(0.8);
    else if (e.key === "0") zoomReiniciar();
  });
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
  let partidaQuitada = false;
  if (libre) {
    const k = claveLibre(libreN); prog.libre[k] = { ...nueva, ganados: ((prog.libre[k] && prog.libre[k].ganados) || 0) + 1 };
    partidaQuitada = !!partidaId && quitarPartida(partidaId);   // una partida guardada ya resuelta sale de la lista
    if (partidaQuitada) partidaId = null;
  } else { prog.mejores[idx + 1] = nueva; prog.hechos = Math.max(prog.hechos, idx + 1); if (cE) prog.estrellas[idx + 1] = nuevoTier; }
  guardarProg();
  pintarMejor();
  pintarMonedas();
  pintarMetaJuego();

  if (!libre) {
    // Al pasar un nivel ya no hay panel: las estrellas ganadas aparecen en el centro, la escena cambia al país actual y las estrellas caen en él (ver celebrar)
    celebrar(cE ? Math.max(1, nuevoTier) : 1, idx, monedas);
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
    $("msg").textContent = libre ? "Modo libre: no da monedas ni puntos al perfil, pero guarda tu mejor marca." + (partidaQuitada ? " Tu partida guardada ya resuelta se quitó de la lista." : "") : "";
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
function empezar(reanudar) {                          // reanudar = { id, mov, ms } al continuar una partida guardada del Modo libre
  clearInterval(reloj); clearInterval(chispas); quitarCelebracion(); quitarTextoCel();   // al empezar un nivel (p. ej. con «Continuar») el texto de estrellas desaparece al instante
  const v = $("victoria"); if (v) v.remove();
  if (modo === "libre") {
    n = libreN; t = inicial.slice();
    pintarNombre("♾️ Modo libre " + DIFICULTADES[libreDif].emoji);
    $("titulo").innerHTML = n + "×" + n + "<small>" + DIFICULTADES[libreDif].emoji + " " + DIFICULTADES[libreDif].nombre + " · " + (reanudar ? "partida guardada" : "tablero " + libreNum + " de esta sesión") + "</small>";
  } else {
    const l = NIVELES[idx];
    n = l.n; t = l.fichas.slice();
    pintarNombre(nombreNivel(idx));
    $("titulo").innerHTML = n + "×" + n + (() => { const mk = prog.mejores[idx + 1], p = []; if (l.optimo) p.push("Mínimo posible: " + l.optimo); if (mk) p.push("Tu mejor: " + mk.mov + " mov."); return p.length ? "<small>" + p.join(" · ") + "</small>" : ""; })();
  }
  movs = reanudar ? reanudar.mov : 0; previo = reanudar ? reanudar.ms : 0; jugando = false;   // el cronómetro arranca con el primer movimiento y suma «previo»
  partidaId = reanudar ? reanudar.id : null; guardadaMovs = reanudar ? reanudar.mov : -1;
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

// ----- Ventana de pausa: botón verde del nombre del nivel y ☰ (en una partida del Modo libre) -----
// Mientras la ventana está abierta el cronómetro se detiene (y sigue donde iba si eliges «Seguir jugando»).
// Niveles: «Seguir jugando» · «Salir al mapa».   Modo libre: «Seguir jugando» · «💾 Guardar partida» · «Salir a elegir tablero».
let pausado = false, erajugando = false;
function reanudarJuego() {
  pausado = false;
  if (erajugando && jugando === true) { inicio = Date.now() - previo; reloj = setInterval(mostrarTiempo, 100); }
}
function alAbrirPausa() {
  pausado = true; erajugando = jugando === true;
  if (erajugando) { previo = Date.now() - inicio; clearInterval(reloj); }   // «previo» queda al día: es lo que se guarda en una partida guardada
}
const pausaSalir = crearMenuPausa({                // niveles
  titulo: "¿Salir?",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir al mapa",
  ayudaSalir: "Se pierde lo avanzado en este tablero.",
  puedeAbrir: () => !$("juego").hidden && modo !== "libre",
  alAbrir: alAbrirPausa,
  alContinuar: reanudarJuego,
  alSalir: () => { pausado = false; mostrar("inicio"); },
});
const pausaLibre = crearMenuPausa({                // Modo libre (con «Guardar partida»)
  titulo: "Pausa",
  textoContinuar: "Seguir jugando",
  textoSalir: "Salir a elegir tablero",
  ayudaSalir: () => (jugando === "fin" || movs === 0 ? "" : movs !== guardadaMovs ? "Se pierde lo avanzado en este tablero. Si quieres conservarlo, usa «Guardar partida»." : "Tu partida está guardada."),
  puedeAbrir: () => !$("juego").hidden && modo === "libre",
  alAbrir: alAbrirPausa,
  alContinuar: reanudarJuego,
  extras: () => (jugando === "fin" ? [] : [{
    icono: "💾", texto: "Guardar partida", clase: "b-oro",
    ayuda: partidaId ? "Actualiza la partida que ya habías guardado." : leerPartidas().length + " de " + MAX_PARTIDAS + " partidas guardadas.",
    alElegir: accionGuardar,
  }]),
  alSalir: () => { pausado = false; mostrar("pantalla-libre"); },
});
$("barra-juego").addEventListener("click", () => (modo === "libre" ? pausaLibre : pausaSalir).abrir());
$("btn-mapa-juego").addEventListener("click", () => pausaSalir.abrir());   // 🗺️: pregunta «¿Salir?» y, si se confirma, abre el mapa

// ----- Partidas guardadas del Modo libre (hasta 20, en este dispositivo) -----
// Clave «_v1»: entra sola en la copia de seguridad de compartido/almacen.js. Se guarda { v: 1, t: última modificación, partidas: [...] }.
// Cada partida: { id, g (fecha), n (tamaño), d (dificultad), mov, ms (tiempo jugado), f (fichas: 0 = hueco) }. No se sube a la cuenta.
// Lo que se lee se valida (una copia de seguridad es un archivo de la persona): tamaño, dificultad, fichas sin repetir, con solución y sin resolver.
const CLAVE_PARTIDAS = "deslizante_partidas_v1";
const MAX_PARTIDAS = 20;
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function partidaValida(p) {
  if (!p || typeof p !== "object") return null;
  const m = Math.floor(Number(p.n)), d = Math.floor(Number(p.d));
  if (!(m >= TAMANO_MIN && m <= TAMANO_MAX) || !DIFICULTADES[d] || !Array.isArray(p.f) || p.f.length !== m * m) return null;
  if (new Set(p.f).size !== m * m || !p.f.every((v) => Number.isInteger(v) && v >= 0 && v < m * m)) return null;
  if (!esResoluble(m, p.f) || p.f.every((v, i) => (i === p.f.length - 1 ? v === 0 : v === i + 1))) return null;   // sin solución o ya resuelta: no sirve
  return {
    id: String(p.id || "").slice(0, 40) || nuevoId(), g: Number(p.g) || 0, n: m, d,
    mov: Math.max(0, Math.floor(Number(p.mov)) || 0), ms: Math.max(0, Math.floor(Number(p.ms)) || 0), f: p.f.slice(),
  };
}
function leerPartidas() {
  const r = [], ids = new Set();
  try {
    const o = JSON.parse(localStorage.getItem(CLAVE_PARTIDAS));
    for (const x of o && Array.isArray(o.partidas) ? o.partidas : []) {
      const p = partidaValida(x);
      if (p && !ids.has(p.id) && r.length < MAX_PARTIDAS) { ids.add(p.id); r.push(p); }
    }
  } catch (e) {}
  return r;
}
function escribirPartidas(l) {
  try { localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify({ v: 1, t: Date.now(), partidas: l })); return true; } catch (e) { return false; }
}
function pintarCuentaGuardadas() { $("cuenta-guardadas").textContent = "(" + leerPartidas().length + "/" + MAX_PARTIDAS + ")"; }
function quitarPartida(id) {
  const l = leerPartidas(), r = l.filter((x) => x.id !== id);
  if (r.length === l.length) return false;
  escribirPartidas(r); pintarCuentaGuardadas();
  return true;
}
// Guarda la partida en curso (se llama con la pausa puesta: «previo» ya trae el tiempo jugado). Si ya venía de la lista (o ya se guardó antes), la actualiza;
// con «reemplazarId» pisa esa otra. Devuelve «ok», «llena» (ya hay 20 y esta es nueva) o «error» (el dispositivo no deja escribir).
function guardarPartida(reemplazarId) {
  const l = leerPartidas();
  const p = { id: partidaId || nuevoId(), g: Date.now(), n, d: libreDif, mov: movs, ms: previo, f: t.slice() };
  const i = l.findIndex((x) => x.id === (reemplazarId || partidaId));
  if (i >= 0) { p.id = l[i].id; l[i] = p; }
  else if (l.length >= MAX_PARTIDAS) return "llena";
  else l.push(p);
  if (!escribirPartidas(l)) return "error";
  partidaId = p.id; guardadaMovs = p.mov;
  pintarCuentaGuardadas();
  return "ok";
}
function avisoGuardado(r) {
  aviso(r === "ok" ? "💾 Partida guardada (" + leerPartidas().length + " de " + MAX_PARTIDAS + ")" : "No se pudo guardar: el almacenamiento del dispositivo está lleno o bloqueado.");
}
function accionGuardar() {                          // «💾 Guardar partida» de la pausa (la pausa sigue puesta hasta que se reanuda)
  const r = guardarPartida();
  if (r === "llena") { abrirPartidas("guardar"); return; }
  reanudarJuego();
  avisoGuardado(r);
}
function jugarGuardada(p) {
  modo = "libre"; libreN = p.n; libreDif = p.d; guardarLibre();
  inicial = p.f.slice();
  mostrar("juego");
  empezar({ id: p.id, mov: p.mov, ms: p.ms });
}
// Ventana de la lista. para = «cargar» (desde el Modo libre: tocar una la continúa) o «guardar» (ya hay 20: tocar una la reemplaza con la partida en curso;
// al borrar una se guarda ahí mismo). Se cierra con Cerrar, tocando fuera o con Esc; si venía de la pausa, el juego se reanuda.
let listaAbierta = false;
function abrirPartidas(para) {
  if (listaAbierta) return;
  listaAbierta = true;
  const foco = document.activeElement;
  const el = (tag, clase, texto) => { const x = document.createElement(tag); if (clase) x.className = clase; if (texto != null) x.textContent = texto; return x; };
  const fondo = el("div", "pausa-fondo");
  fondo.setAttribute("role", "dialog"); fondo.setAttribute("aria-modal", "true"); fondo.setAttribute("aria-label", "Partidas guardadas");
  const panel = el("div", "pausa-panel pg-panel");
  const nota = el("p", "pg-nota"), lista = el("div", "pg-lista"), pie = el("div", "pausa-opciones");
  const cerrarB = el("button", "b3d txt b-cielo"); cerrarB.type = "button"; cerrarB.appendChild(el("span", "", para === "guardar" ? "Cancelar" : "Cerrar"));
  pie.appendChild(cerrarB);
  const tecla = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(true); } };   // en captura: la pausa no debe abrirse encima
  function cerrar(reanudar) {
    fondo.remove(); removeEventListener("keydown", tecla, true); listaAbierta = false;
    try { if (foco && foco.focus) foco.focus({ preventScroll: true }); } catch (e) {}
    if (para === "guardar" && reanudar) reanudarJuego();
  }
  addEventListener("keydown", tecla, true);
  fondo.addEventListener("click", (e) => { if (e.target === fondo) cerrar(true); });
  cerrarB.addEventListener("click", () => cerrar(true));

  function fila(p) {
    const f = el("div", "pg-fila");
    const b = el("button", "b3d txt pg-main " + (para === "guardar" ? "b-oro" : "b-cielo")); b.type = "button";
    const l1 = p.n + "×" + p.n + " " + DIFICULTADES[p.d].emoji + " · " + p.mov + " mov. · " + fmtMs(p.ms);
    const l2 = new Date(p.g).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const tx = el("span", "pg-texto"); tx.append(el("b", "", l1), el("small", "", l2));
    b.append(el("span", "b-ico", para === "guardar" ? "♻️" : "▶"), tx);
    b.setAttribute("aria-label", (para === "guardar" ? "Reemplazar con la partida actual: " : "Continuar: ") + l1 + ", " + l2);
    b.addEventListener("click", () => {
      if (para === "guardar") { const r = guardarPartida(p.id); cerrar(true); avisoGuardado(r); }
      else { cerrar(false); jugarGuardada(p); }
    });
    const x = el("button", "b3d txt b-rojo pg-borrar"); x.type = "button";
    const xt = el("span", "", "🗑️"); x.appendChild(xt);
    x.title = "Borrar esta partida"; x.setAttribute("aria-label", "Borrar esta partida");
    x.addEventListener("click", () => {
      if (!x.dataset.seguro) {                       // primer toque: pide confirmar (sin confirm())
        x.dataset.seguro = "1"; xt.textContent = "¿Borrar?";
        setTimeout(() => { delete x.dataset.seguro; xt.textContent = "🗑️"; }, 3000);
        return;
      }
      quitarPartida(p.id);
      if (p.id === partidaId) guardadaMovs = -1;     // la que se está jugando ya no está en la lista
      if (para === "guardar") { const r = guardarPartida(); cerrar(true); avisoGuardado(r); return; }   // ya hay lugar: se guarda ahí mismo
      pintar();
    });
    f.append(b, x);
    return f;
  }
  function pintar() {
    const l = leerPartidas().sort((a, b) => b.g - a.g);
    nota.textContent = para === "guardar"
      ? "Ya tienes " + MAX_PARTIDAS + " partidas guardadas. Toca una para reemplazarla con la partida actual, o bórrala y la actual se guarda en su lugar."
      : l.length ? l.length + " de " + MAX_PARTIDAS + " partidas. Toca una para seguir jugándola."
      : "Todavía no hay partidas guardadas. Mientras juegas en Modo libre toca ☰ y «Guardar partida» (hasta " + MAX_PARTIDAS + ").";
    lista.replaceChildren(...l.map(fila));
    pintarCuentaGuardadas();
  }
  panel.append(el("h2", "", "💾 Partidas guardadas"), nota, lista, pie);
  fondo.appendChild(panel);
  document.body.appendChild(fondo);
  pintar();
  try { (lista.querySelector("button") || cerrarB).focus({ preventScroll: true }); } catch (e) {}
}

// ----- Botones y teclado -----
// Pantalla de inicio (solo al abrir): Jugar = el nivel que toca · Modo libre · Mapa
$("btn-inicio-jugar").addEventListener("click", () => jugarNivel(Math.min(TOTAL, hechoMax() + 1) - 1));
$("btn-inicio-libre").addEventListener("click", () => mostrar("pantalla-libre"));
$("btn-inicio-mapa").addEventListener("click", () => abrirMapa());
$("btn-libre-jugar").addEventListener("click", () => jugarLibre(libreN));
$("btn-mas-tableros").addEventListener("click", () => { libreMas = true; pintarLibre(); });
$("btn-libre-guardadas").addEventListener("click", () => abrirPartidas("cargar"));
// ☰: en una partida del Modo libre abre la ventana de pausa (Seguir jugando · Guardar partida · Salir a elegir tablero); en la pantalla de opciones del Modo libre
// o en un nivel vuelve al menú principal (el mapa); dentro de una vista del mapa (Mapa, Niveles) vuelve «Atrás» a su vista principal.
$("btn-menu").addEventListener("click", () => {
  if (mapa.abierto() && !mapa.esPrincipal()) mapa.principal();
  else if (!$("juego").hidden && modo === "libre") pausaLibre.abrir();
  else mostrar("inicio");
});
addEventListener("keydown", (e) => {
  if ($("juego").hidden) return;
  const d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] }[e.key];
  if (d) { e.preventDefault(); mover(d[0], d[1]); }
});

mostrar("pantalla-inicio");   // única vez que se ve: al abrir el juego

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
      mapa.refrescar();                 // si el mapa está abierto, se redibuja con el progreso de la cuenta
      if (!$("pantalla-libre").hidden) pintarLibre();
      pintarMonedas();
      if (!$("juego").hidden) { pintarMejor(); pintarMetaJuego(); }
    },
  });
  nube.guardado(); // sube lo que ya hubiera en el dispositivo
}).catch(() => {});
