// Ruta: burbujas/bot-burbujas.mjs      (SOLO para la consola: no se carga en el navegador ni va en el service worker)
// Bot de backtracking: juega los niveles de Burbujas con las MISMAS reglas del juego (logica-burbujas.js) y comprueba que se pueden pasar.
//
// Uso (desde la carpeta del proyecto, con Node 18 o más nuevo):
//   node burbujas/bot-burbujas.mjs                       los primeros 50 niveles del mapa
//   node burbujas/bot-burbujas.mjs --desde 1 --hasta 300
//   node burbujas/bot-burbujas.mjs --desde 1 --hasta 22600 --cada 50      una muestra: 1 de cada 50 niveles de todo el mapa
//   node burbujas/bot-burbujas.mjs --lista 1,7,250        solo esos niveles
//   node burbujas/bot-burbujas.mjs --libre 5              5 tableros al azar de cada una de las 5 dificultades del Modo libre
//   Opciones: --semillas 3 (colas de burbujas distintas por nivel) · --nodos 4000 (presupuesto de búsqueda) · --ancho 4,10 (cuántas
//             jugadas prueba en cada paso; si falla con la primera cifra repite con la siguiente) · --grados 1 (paso al barrer ángulos)
//             --haz 150 (anchos de la búsqueda en haz que se prueba si el backtracking no basta; --haz 0 la apaga) ·
//             --detalle (imprime los tiros de cada solución) · --total 22600 (niveles del mapa)
//   Si «logica-burbujas.js» no carga como módulo, pon un package.json con { "type": "module" } en la raíz (como el de verificar-slither).
//
// Cómo funciona:
//  1. En cada posición barre los ángulos posibles (de 12° a 168°, con rebotes en las paredes) y agrupa los que caen en la misma celda:
//     esas son las jugadas REALMENTE alcanzables. Prueba cada una con la burbuja actual y con la de «siguiente» (cambio).
//  2. Búsqueda con retroceso (backtracking) en profundidad: ordena las jugadas (menos burbujas de color que quedan, más lejos de la
//     línea de peligro) y recorre las mejores; si una rama pierde, vuelve atrás y prueba otra. Recuerda las posiciones ya vistas.
//  3. Una solución solo cuenta si se REPRODUCE desde cero con tirar() y llega a limpiar el tablero sin perder (así se descubre
//     cualquier error al copiar tableros).
//  4. Cada nivel se prueba con varias «suertes» de cola de burbujas (--semillas). La semilla 0 es la cola real del juego.
// «FALLA» significa «el bot no encontró solución con ese presupuesto»: no es una prueba de imposibilidad (la búsqueda poda jugadas).
// Un nivel «FALLA» se revisa a mano o se le sube el presupuesto (--nodos 40000 --ancho 12).
// Lo que no modela: la animación de 13 cuadros al bajar el techo (un tiro disparado en ese instante rebota con 38 px de diferencia).

import * as L from "./logica-burbujas.js";

// ---------- Argumentos ----------
const args = process.argv.slice(2);
const tiene = (k) => args.includes("--" + k);
const valor = (k, def) => { const i = args.indexOf("--" + k); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def; };
const TOTAL = Number(valor("total", 22600));
const SEMILLAS = Math.max(1, Number(valor("semillas", 3)));
const NODOS = Number(valor("nodos", 4000));
const ANCHOS = String(valor("ancho", "4,10")).split(",").map(Number).filter((x) => x > 0);
const HACES = String(valor("haz", "150")).split(",").map(Number).filter((x) => x > 0);   // anchos de la búsqueda en haz (0 = no usarla)
const GRADOS = Number(valor("grados", 1));
const DETALLE = tiene("detalle");

// ---------- Dificultad de cada nivel del mapa ----------
let dificultadDeNivel;
try {
  ({ dificultadDeNivel } = await import("../compartido/dificultad-niveles.js"));
} catch (e) {
  console.warn("⚠️  No pude cargar ../compartido/dificultad-niveles.js: uso un reparto aproximado 50/40/10 → 25/40/35 %.");
  dificultadDeNivel = (n, total) => {
    const p = total > 1 ? (n - 1) / (total - 1) : 0;
    const u = (n * 0.6180339887) % 1;
    const facil = 0.5 - 0.25 * p;
    return u < facil ? "facil" : u < facil + 0.4 ? "normal" : "dificil";
  };
}

// ---------- Búsqueda ----------
function filaMasBaja(T) {
  for (let r = T.grid.length - 1; r >= 0; r--) if (T.grid[r].some((v) => v !== null)) return r;
  return 0;
}

// Jugadas alcanzables: una por celda de destino, con el ángulo del centro del abanico que cae ahí
function destinos(T) {
  const porCelda = new Map();
  for (let g = L.MIN_GRADOS; g <= 180 - L.MIN_GRADOS + 1e-9; g += GRADOS) {
    const ang = (g * Math.PI) / 180;
    const p = L.simular(T, ang);
    const [r, c] = L.celdaLibre(T, p.x, p.y);
    const k = r + "," + c;
    if (!porCelda.has(k)) porCelda.set(k, []);
    porCelda.get(k).push(ang);
  }
  return [...porCelda.values()].map((lista) => lista[Math.floor(lista.length / 2)]);
}

// Todas las jugadas posibles desde T (cada celda alcanzable × burbuja actual o de cambio), sin las que pierden
function expandir(T) {
  const hijos = [];
  for (const ang of destinos(T)) {
    for (const cambiar of T.actual !== T.siguiente ? [false, true] : [false]) {
      const U = L.copiarTablero(T);
      if (cambiar) L.cambiarCola(U);
      const color = L.sacarDeCola(U);
      const p = L.simular(U, ang);
      const ev = L.resolverTiro(U, color, p.x, p.y);
      if (ev.perdio) continue;
      const puntaje = ev.gano ? -1e9 : L.contarColores(U) * 10 + filaMasBaja(U) * 6 + U.tiros * 2;
      hijos.push({ ang, cambiar, U, ev, puntaje });
    }
  }
  return hijos.sort((a, b) => a.puntaje - b.puntaje);
}

// Backtracking en profundidad: recorre las mejores «ancho» jugadas de cada posición y vuelve atrás si la rama pierde
function buscar(T0, ancho, presupuesto) {
  const vistos = new Set();
  const camino = [];
  let nodos = 0, agotado = false;

  function dfs(T, prof) {
    if (prof > 160) return false;
    if (nodos++ >= presupuesto) { agotado = true; return false; }
    for (const h of expandir(T).slice(0, ancho)) {
      camino.push({ ang: h.ang, cambiar: h.cambiar });
      if (h.ev.gano) return true;
      const k = L.claveTablero(h.U);
      if (!vistos.has(k)) {
        vistos.add(k);
        if (dfs(h.U, prof + 1)) return true;
        if (agotado) return false;
      }
      camino.pop();
    }
    return false;
  }

  const ok = dfs(T0, 0);
  return { ok, camino: ok ? camino.slice() : [], nodos, agotado };
}

// Búsqueda en haz: en cada tiro conserva solo las «B» mejores posiciones (de todas las ramas). Complementa al backtracking cuando el error
// está al principio de la partida (el retroceso cronológico tarda mucho en deshacerlo).
function haz(T0, B, presupuesto) {
  let capa = [{ T: T0, padre: null, mov: null }];
  const vistos = new Set();
  let nodos = 0;
  for (let prof = 0; prof < 160 && capa.length; prof++) {
    const siguientes = [];
    for (const e of capa) {
      if (nodos++ >= presupuesto) return { ok: false, camino: [], nodos, agotado: true };
      for (const h of expandir(e.T)) {
        const nodo = { T: h.U, padre: e, mov: { ang: h.ang, cambiar: h.cambiar }, puntaje: h.puntaje };
        if (h.ev.gano) { const c = []; for (let x = nodo; x.padre; x = x.padre) c.unshift(x.mov); return { ok: true, camino: c, nodos }; }
        const k = L.claveTablero(h.U);
        if (!vistos.has(k)) { vistos.add(k); siguientes.push(nodo); }
      }
    }
    siguientes.sort((a, b) => a.puntaje - b.puntaje);
    capa = siguientes.slice(0, B);
  }
  return { ok: false, camino: [], nodos, agotado: false };
}

// Reproduce una solución desde cero con tirar(): true si limpia el tablero sin perder
function reproducir(fabrica, camino) {
  const T = fabrica();
  for (const m of camino) {
    if (m.cambiar) L.cambiarCola(T);
    const ev = L.tirar(T, m.ang);
    if (ev.perdio) return false;
    if (ev.gano) return true;
  }
  return false;
}

// Prueba un tablero (fabrica() lo crea de nuevo cada vez): primero backtracking con cada «ancho» y, si no basta, búsqueda en haz
function resolver(fabrica) {
  let nodos = 0, motivo = "sin salida entre las jugadas probadas";
  const intentos = [...ANCHOS.map((a) => () => buscar(fabrica(), a, NODOS)), ...HACES.map((b) => () => haz(fabrica(), b, NODOS * 2))];
  for (const intento of intentos) {
    const r = intento();
    nodos += r.nodos;
    if (r.ok) {
      if (!reproducir(fabrica, r.camino)) return { ok: false, motivo: "la solución no se pudo reproducir (error de copia del tablero)", nodos };
      return { ok: true, tiros: r.camino.length, camino: r.camino, nodos };
    }
    if (r.agotado) motivo = "presupuesto agotado";
  }
  return { ok: false, motivo, nodos };
}

// ---------- Ejecución ----------
const T0 = Date.now();
let fallas = 0, total = 0;

function probar(etiqueta, fabricaConSemilla) {
  total++;
  let nodos = 0, tiros = [], mal = null;
  let T1 = null;
  for (let s = 0; s < SEMILLAS; s++) {
    const r = resolver(() => fabricaConSemilla(s));
    nodos += r.nodos;
    if (!r.ok) { mal = "semilla " + s + ": " + r.motivo; break; }
    tiros.push(r.tiros);
    if (s === 0) T1 = r.camino;
  }
  const info = fabricaConSemilla(0);
  const cab = etiqueta + " (" + info.nombre + ", " + info.ncol + " colores, techo cada " + info.tirosPorFila + ")";
  if (mal) { fallas++; console.log("❌ " + cab + ": FALLA, " + mal + " [" + nodos + " nodos]"); }
  else {
    console.log("✅ " + cab + ": OK en " + tiros.join("/") + " tiros [" + nodos + " nodos]");
    if (DETALLE && T1) console.log("     " + T1.map((m) => (m.cambiar ? "↔" : "") + ((m.ang * 180) / Math.PI).toFixed(1) + "°").join(" "));
  }
}

if (tiene("libre")) {
  const cuantas = Math.max(1, Number(valor("libre", 3)));
  for (const d of L.DIFICULTADES_LIBRE) for (let i = 1; i <= cuantas; i++) {
    probar("Libre " + d.nombre + " #" + i, (s) => L.nivelLibre(d.id, 1, L.crearRng(i * 7919 + s * 104729 + d.ncol)));
  }
} else {
  let niveles;
  if (tiene("lista")) niveles = String(valor("lista", "")).split(",").map(Number).filter((n) => n >= 1 && n <= TOTAL);
  else {
    const desde = Math.max(1, Number(valor("desde", 1))), hasta = Math.min(TOTAL, Number(valor("hasta", 50))), cada = Math.max(1, Number(valor("cada", 1)));
    niveles = [];
    for (let n = desde; n <= hasta; n += cada) niveles.push(n);
  }
  for (const n of niveles) {
    const dif = dificultadDeNivel(n, TOTAL);
    probar("Nivel " + n + " [" + dif + "]", (s) => L.nivelFijo(n, TOTAL, dif, { semillaCola: s }));
  }
}

console.log("\n" + (total - fallas) + " de " + total + " se pasan · " + fallas + " fallan · " + ((Date.now() - T0) / 1000).toFixed(1) + " s");
process.exit(fallas ? 1 : 0);
