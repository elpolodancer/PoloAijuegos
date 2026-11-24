// Ruta: agua/generador-agua.js
// Generador de los 22 600 niveles de «Agua»: generarNivel(n) crea el nivel n al instante, SIEMPRE igual (semilla fija; sin guardar nada).
// Cada nivel se COMPRUEBA con la simulación (logica-agua.js): si cavando la solución llegan ≥ 90 % de las gotas, es pasable con 3 estrellas;
// y sin cavar no llega casi nada. Si un intento falla, se prueba con otra variante (intento 1, 2…).
//
// CÓMO ES UN NIVEL: un laberinto de CÁMARAS (cuartos de 2×2 casillas) separadas por muros de ROCA. Entre cámaras vecinas que se conectan hay
// un TAPÓN de tierra (se cava con el dedo). El agua sale del grifo (arriba) y debe llegar a la meta (abajo), pero solo baja o se desliza de lado:
// nunca sube. Hay UN camino bueno (la «solución»); el resto son ramas sin salida que se ven igual: algunas guardan ácido que se come el agua.
//   estilo (forma del camino bueno):
//     cascada   baja casi recto, con uno que otro desvío
//     escalera  baja en diagonal, un paso de lado y uno hacia abajo
//     serpiente recorre cada fila de lado a lado, cada vez en sentido contrario
//     laberinto camino irregular con muchas ramas falsas
//   dificultad (dificultad-agua.js): más grande, más ramas falsas, más ácido y menos tapones ya abiertos cuanto más difícil.
// Si ya hay jugadores con progreso, NO cambies las cifras ni la semilla después de publicar: cambiarían los niveles ya jugados.
import { TOTAL } from "./economia-agua.js";
import { azar, dificultadNivel } from "./dificultad-agua.js";
import { simular } from "./logica-agua.js";

const PARAMS = {
  //          cámaras de ancho · de alto | tapones laterales abiertos | ramas falsas | ramas con ácido | estilos (peso)
  facil:   { cw: [3, 4], ch: [4, 5], lateral: 1,   densidad: 0.25, acido: 0,    estilos: { cascada: 5, escalera: 5 } },
  medio:   { cw: [4, 5], ch: [5, 7], lateral: 0.6, densidad: 0.6,  acido: 0.25, estilos: { cascada: 2, escalera: 3, serpiente: 3, laberinto: 2 } },
  dificil: { cw: [5, 6], ch: [7, 9], lateral: 0.2, densidad: 1,    acido: 0.5,  estilos: { escalera: 2, serpiente: 4, laberinto: 4 } },
};
const EMITIR = 40, NECESITAS = 12; // gotas que salen del grifo y las que hacen falta para pasar (30 %)
const MIN_FRACCION = 0.9;          // lo que debe llegar con la solución para que el nivel valga (es el umbral de ★3)

function elegir(rnd, pesos) {
  const t = Object.values(pesos).reduce((a, b) => a + b, 0);
  let r = rnd() * t;
  for (const k in pesos) { r -= pesos[k]; if (r < 0) return k; }
}

// Camino bueno sobre la cuadrícula de cámaras: nunca sube (solo baja «V» o va de lado «H»)
function caminar(cw, ch, estilo, rnd) {
  let dir = rnd() < 0.5 ? 1 : -1;
  let i = estilo === "serpiente" ? (dir === 1 ? 0 : cw - 1) : Math.floor(rnd() * cw);
  const ruta = [[i, 0]], pasos = [];
  for (let j = 0; j < ch; j++) {
    let lat;
    if (estilo === "cascada") lat = rnd() < 0.3 ? 1 : 0;
    else if (estilo === "escalera") lat = 1;
    else if (estilo === "serpiente") lat = cw - 1 - (rnd() < 0.4 ? 1 : 0);
    else lat = Math.floor(rnd() * cw);
    if ((estilo === "laberinto" || estilo === "cascada") && rnd() < 0.5) dir = -dir;
    if (i + dir < 0 || i + dir >= cw) dir = -dir;
    for (let s = 0; s < lat && i + dir >= 0 && i + dir < cw; s++) { i += dir; ruta.push([i, j]); pasos.push("H"); }
    if (j < ch - 1) { ruta.push([i, j + 1]); pasos.push("V"); }
    if (estilo === "serpiente") dir = -dir;
  }
  return { ruta, pasos };
}

function construir(n, dif, intento) {
  const P = PARAMS[dif], p = (n - 1) / (TOTAL - 1);
  const rnd = azar((Math.imul(n, 2654435761) + intento * 40503 + 12345) >>> 0);
  const rango = ([a, b]) => a + Math.floor(Math.min(0.999, 0.5 * p + 0.5 * rnd()) * (b - a + 1)); // más grande hacia el final del juego
  const cw = rango(P.cw), ch = rango(P.ch), estilo = elegir(rnd, P.estilos);
  const { ruta, pasos } = caminar(cw, ch, estilo, rnd);
  const idx = ([i, j]) => j * cw + i;
  const enRuta = new Set(ruta.map(idx)), incluido = new Array(cw * ch).fill(false);
  for (const k of enRuta) incluido[k] = true;
  for (let k = 0; k < cw * ch; k++) if (!incluido[k] && rnd() < P.densidad) incluido[k] = true; // cámaras de ramas falsas (las que no se alcancen quedan de roca)

  // Árbol de conexiones: el camino bueno + ramas falsas que salen de él (algoritmo de Prim). Sin ciclos: no hay atajos.
  const aristas = [], vistos = new Set(enRuta), frontera = [];
  for (let k = 0; k < ruta.length - 1; k++) aristas.push({ a: idx(ruta[k]), b: idx(ruta[k + 1]), ruta: true, paso: pasos[k] });
  const vecinos = (k) => { const i = k % cw, j = (k / cw) | 0, r = []; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a >= 0 && a < cw && b >= 0 && b < ch && incluido[b * cw + a]) r.push(b * cw + a); } return r; };
  const agregar = (k) => { for (const v of vecinos(k)) if (!vistos.has(v)) frontera.push([k, v]); };
  for (const k of enRuta) agregar(k);
  while (frontera.length) {
    const q = Math.floor(rnd() * frontera.length), [a, b] = frontera[q];
    frontera[q] = frontera[frontera.length - 1]; frontera.pop();
    if (vistos.has(b)) continue;
    vistos.add(b); aristas.push({ a, b, ruta: false }); agregar(b);
  }

  // Dibujo: muros de roca y cámaras de 2×2 (cada cámara en la casilla 3i+1 .. 3i+2)
  const W = 3 * cw + 1, H = 3 * ch + 1;
  const m = Array.from({ length: H }, () => new Array(W).fill("#"));
  for (const k of vistos) { const i = k % cw, j = (k / cw) | 0; for (let dy = 1; dy <= 2; dy++) for (let dx = 1; dx <= 2; dx++) m[3 * j + dy][3 * i + dx] = "."; }
  const solucion = [], grado = new Map();
  for (const e of aristas) {
    grado.set(e.a, (grado.get(e.a) || 0) + 1); grado.set(e.b, (grado.get(e.b) || 0) + 1);
    const ai = e.a % cw, aj = (e.a / cw) | 0, bi = e.b % cw, bj = (e.b / cw) | 0;
    const celdas = aj === bj ? [[3 * Math.max(ai, bi), 3 * aj + 1], [3 * Math.max(ai, bi), 3 * aj + 2]] : [[3 * ai + 1, 3 * Math.max(aj, bj)], [3 * ai + 2, 3 * Math.max(aj, bj)]];
    let cerrado = true;
    if (e.ruta) { if (e.paso === "H" && rnd() < P.lateral) cerrado = false; }   // el tramo bueno de lado a veces ya viene abierto
    else if (!enRuta.has(e.a) && !enRuta.has(e.b)) cerrado = rnd() < 0.5;       // entre ramas falsas, da igual
    for (const [x, y] of celdas) { m[y][x] = cerrado ? "t" : "."; if (cerrado && e.ruta) solucion.push([x, y]); }
  }
  // Ácido en el piso de algunas ramas sin salida
  for (const k of vistos) {
    if (enRuta.has(k) || grado.get(k) !== 1 || rnd() >= P.acido) continue;
    const i = k % cw, j = (k / cw) | 0;
    m[3 * j + 2][3 * i + 1] = "A"; m[3 * j + 2][3 * i + 2] = "A";
  }
  const [gi, gj] = ruta[0], [mi, mj] = ruta[ruta.length - 1];
  m[3 * gj + 1][3 * gi + 1] = "G";
  m[3 * mj + 2][3 * mi + 1] = "M"; m[3 * mj + 2][3 * mi + 2] = "M";
  return { n, dificultad: dif, estilo, ancho: W, alto: H, celdas: m.map((f) => f.join("")), grifo: { x: 3 * gi + 1, y: 3 * gj + 1 }, emitir: EMITIR, necesitas: NECESITAS, margen: 300 + ruta.length * 60, solucion };
}

let ultimo = null;
// Nivel n (1 a 22 600). Devuelve { n, dificultad, estilo, ancho, alto, celdas, grifo, emitir, necesitas, solucion, verificado }
//   «solucion» = las casillas de tierra que hay que cavar (sirve para la pista 💡 y para comprobar el nivel)
export function generarNivel(n) {
  n = Math.min(TOTAL, Math.max(1, Math.floor(Number(n)) || 1));
  if (ultimo && ultimo.n === n) return ultimo;
  const dif = dificultadNivel(n);
  for (let intento = 0; intento < 40; intento++) {
    const nivel = construir(n, dif, intento);
    const con = simular(nivel, nivel.solucion);
    if (con.fraccion >= MIN_FRACCION && simular(nivel, []).llegadas < NECESITAS) {
      nivel.verificado = { fraccion: con.fraccion, intento };
      return (ultimo = nivel);
    }
  }
  throw new Error("generador-agua: no se pudo crear el nivel " + n);
}

// Dibujo en texto (para revisar niveles en consola): '*' marca lo que hay que cavar
export function aTexto(nivel, conSolucion = false) {
  const f = nivel.celdas.map((r) => r.split(""));
  if (conSolucion) for (const [x, y] of nivel.solucion) f[y][x] = "*";
  return f.map((r) => r.join("")).join("\n");
}
