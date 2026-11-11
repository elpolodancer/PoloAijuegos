// Ruta: flechas/generador-flechas.js
// Generador de niveles (el «bot»). Mismo nivel = mismo resultado (usa semilla). Siempre devuelve niveles con solución.
// Método:
//   1) TROCEAR: reparte TODAS las casillas del tablero en caminos (flechas) pegados a casillas vecinas, como en el juego de referencia
//      donde el tablero queda lleno. Empieza siempre por la casilla con menos vecinas libres para no dejar casillas sueltas.
//   2) ORIENTAR: a cada camino se le elige una punta (cabeza) al azar.
//   3) REPARAR: si hay flechas que se estorban en círculo (nadie puede salir), se voltea la punta de algunas y se prueba otra vez.
//      Si no se logra, se quitan flechas atascadas (deja casillas vacías, que se dibujan como puntitos).
//   4) Se hacen varios intentos y se queda con el de mayor «profundidad» (más rondas para sacar todo = más difícil).
import { azarSemilla, crearEstado, analizar, golpeaPropio } from "./logica-flechas.js";

// ====== DIFICULTADES (medidas tomadas de las capturas del nivel 1; ver README-flechas.md) ======
//   cols, filas   casillas del tablero
//   lmin, lmax    largo de cada flecha (en casillas)
//   sesgo         >1 = más flechas cortas y pocas largas (1 = parejo)
//   recto         probabilidad de seguir derecho en cada paso (más alto = flechas más rectas)
//   intentos      cuántos tableros prueba para quedarse con el más profundo
//   estimado      true = no hay captura de esa dificultad todavía, son números inventados
export const DIFICULTADES = {
  facil:   { nombre: "Fácil",         cols: 8,  filas: 4,  lmin: 5, lmax: 8,  sesgo: 1,   recto: 0.25, intentos: 8 },
  medio:   { nombre: "Medio",         cols: 20, filas: 21, lmin: 2, lmax: 16, sesgo: 1.6, recto: 0.5,  intentos: 4 },
  dificil: { nombre: "Difícil",       cols: 27, filas: 27, lmin: 2, lmax: 20, sesgo: 1.6, recto: 0.55, intentos: 3 },
  extra:   { nombre: "Extra difícil", cols: 34, filas: 48, lmin: 2, lmax: 24, sesgo: 1.6, recto: 0.6,  intentos: 1 },
  ultra:   { nombre: "Ultra difícil", cols: 44, filas: 60, lmin: 2, lmax: 30, sesgo: 1.5, recto: 0.65, intentos: 1, estimado: true },
};
export const ORDEN = ["facil", "medio", "dificil", "extra", "ultra"];

// PROVISIONAL: por ahora todos los niveles de una dificultad tienen el mismo tamaño y solo cambia la semilla.
// Cuando lleguen las capturas de los niveles 2 y 3, aquí se calibra cómo crece el tablero y el largo de las flechas con «nivel».
export function parametros(dif, nivel) {
  const d = DIFICULTADES[dif];
  if (!d) throw new RangeError("Dificultad desconocida: " + dif);
  return { ...d };
}

export function semillaDe(dif, nivel) { // FNV-1a
  let h = 2166136261;
  for (const c of dif + ":" + nivel) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- 1) TROCEAR ----------
function trocear(cols, filas, p, r) {
  const n = cols * filas;
  const libre = new Uint8Array(n).fill(1);
  const dueno = new Int32Array(n).fill(-1);
  const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vecinas = Array.from({ length: n }, (_, i) => {
    const x = i % cols, y = (i / cols) | 0, o = [];
    for (const [dx, dy] of vec) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < cols && b < filas) o.push(b * cols + a); }
    return o;
  });
  const grado = (i) => { let g = 0; for (const j of vecinas[i]) g += libre[j]; return g; };
  const caminos = [];
  let quedan = n;

  while (quedan > 0) {
    let ini = -1, gm = 9, emp = 0;
    for (let i = 0; i < n; i++) {
      if (!libre[i]) continue;
      const g = grado(i);
      if (g < gm) { gm = g; ini = i; emp = 1; } else if (g === gm && r() * ++emp < 1) ini = i;
    }
    const largo = p.lmin + Math.floor(Math.pow(r(), p.sesgo) * (p.lmax - p.lmin + 1));
    const cam = [ini];
    const k = caminos.length;
    libre[ini] = 0; dueno[ini] = k; quedan--;
    let prev = -1, cur = ini;
    while (cam.length < largo) {
      const cand = vecinas[cur].filter((j) => libre[j]);
      if (!cand.length) break;
      let sig = -1;
      if (prev >= 0 && r() < p.recto) { // seguir derecho si se puede
        const x = cur % cols, y = (cur / cols) | 0, dx = x - (prev % cols), dy = y - ((prev / cols) | 0);
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < filas && libre[ny * cols + nx]) sig = ny * cols + nx;
      }
      if (sig < 0) {
        if (r() < 0.6) { // la que deja menos vecinas libres (evita casillas sueltas)
          let gmin = 9, e = 0;
          for (const j of cand) { const g = grado(j); if (g < gmin) { gmin = g; sig = j; e = 1; } else if (g === gmin && r() * ++e < 1) sig = j; }
        } else sig = cand[(r() * cand.length) | 0];
      }
      cam.push(sig); libre[sig] = 0; dueno[sig] = k; quedan--;
      prev = cur; cur = sig;
    }
    caminos.push(cam);
  }

  // Casillas sueltas (caminos de 1): se pegan a la punta de una flecha vecina
  for (let k = 0; k < caminos.length; k++) {
    if (!caminos[k] || caminos[k].length !== 1) continue;
    const c = caminos[k][0];
    for (const j of vecinas[c]) {
      const m = dueno[j];
      if (m < 0 || m === k || !caminos[m]) continue;
      const cm = caminos[m];
      if (cm[cm.length - 1] === j) cm.push(c); else if (cm[0] === j) cm.unshift(c); else continue;
      dueno[c] = m; caminos[k] = null;
      break;
    }
  }
  return caminos.filter((c) => c && c.length >= 2).map((c) => c.map((i) => [i % cols, (i / cols) | 0]));
}

// ---------- 2) ORIENTAR ----------
// Elige la punta de un camino (al azar entre las que no chocan con su propio cuerpo). null = las dos chocan.
function puntas(celdas, cols, filas, r) {
  const rev = celdas.slice().reverse();
  const okA = !golpeaPropio(cols, filas, celdas), okB = !golpeaPropio(cols, filas, rev);
  if (okA && okB) return r() < 0.5 ? celdas : rev;
  return okA ? celdas : okB ? rev : null;
}
// Parte un camino en dos trozos de 2 casillas o más (hasta que cada trozo tenga una punta válida)
function ponerPartiendo(celdas, cols, filas, r, out) {
  const o = puntas(celdas, cols, filas, r);
  if (o || celdas.length < 4) { out.push({ celdas: o || celdas }); return; }
  const m = 2 + ((r() * (celdas.length - 3)) | 0);
  ponerPartiendo(celdas.slice(0, m), cols, filas, r, out);
  ponerPartiendo(celdas.slice(m), cols, filas, r, out);
}
function aFlechas(caminos, cols, filas, r) {
  const out = [];
  for (const c of caminos) ponerPartiendo(c, cols, filas, r, out);
  return out;
}

// ---------- 3) REPARAR ----------
// Búsqueda local: voltea la punta de una flecha atascada y se queda con el cambio si no empeora el número de flechas atascadas.
// Si lleva mucho sin mejorar, parte una flecha atascada en dos (el tablero sigue lleno, solo hay más flechas y más libertad).
function reparar(cols, filas, flechas, r, pasos) {
  let est = crearEstado(cols, filas, flechas);
  let a = analizar(est), sinMejora = 0;
  for (let it = 0; it < pasos && !a.resuelto; it++) {
    const at = a.atascadas;
    if (sinMejora > 12) { // partir una flecha atascada larga
      const largas = at.filter((i) => flechas[i].celdas.length >= 4);
      if (largas.length) {
        const i = largas[(r() * largas.length) | 0];
        const c = flechas[i].celdas, m = 2 + ((r() * (c.length - 3)) | 0), partes = [];
        ponerPartiendo(c.slice(0, m), cols, filas, r, partes);
        ponerPartiendo(c.slice(m), cols, filas, r, partes);
        flechas = flechas.filter((_, k) => k !== i).concat(partes);
        est = crearEstado(cols, filas, flechas);
        a = analizar(est);
        sinMejora = 0;
        continue;
      }
    }
    const f = flechas[at[(r() * at.length) | 0]];
    const rev = f.celdas.slice().reverse();
    if (golpeaPropio(cols, filas, rev)) { sinMejora++; continue; }
    const antes = f.celdas;
    f.celdas = rev; // la casilla ocupada no cambia, solo hacia dónde apunta
    const b = analizar(est);
    if (b.atascadas.length <= a.atascadas.length) { if (b.atascadas.length < a.atascadas.length) sinMejora = 0; else sinMejora++; a = b; }
    else { f.celdas = antes; sinMejora++; }
  }
  // Último recurso: quitar flechas atascadas (quedan casillas vacías) hasta que todo tenga solución
  while (!a.resuelto) {
    const quitar = new Set(a.atascadas.filter(() => r() < 0.3));
    if (!quitar.size) quitar.add(a.atascadas[0]);
    flechas = flechas.filter((_, i) => !quitar.has(i));
    est = crearEstado(cols, filas, flechas);
    a = analizar(est);
  }
  return { flechas, est, analisis: a };
}

function intentar(p, r) {
  const caminos = trocear(p.cols, p.filas, p, r);
  const base = aFlechas(caminos, p.cols, p.filas, r);
  const { flechas, est, analisis } = reparar(p.cols, p.filas, base, r, p.cols * p.filas * 4);
  const ocupadas = flechas.reduce((s, f) => s + f.celdas.length, 0);
  return {
    cols: p.cols, filas: p.filas, flechas,
    profundidad: analisis.profundidad,
    libresAlInicio: analisis.capas[0] ? analisis.capas[0].length : 0,
    relleno: ocupadas / (p.cols * p.filas),
  };
}

// Devuelve { cols, filas, flechas: [{ celdas }], profundidad, libresAlInicio, relleno }
export function generar(dif, nivel = 1) {
  const p = parametros(dif, nivel);
  const base = semillaDe(dif, nivel);
  let mejor = null;
  for (let k = 0; k < p.intentos; k++) {
    const g = intentar(p, azarSemilla((base + k * 7919) >>> 0));
    if (!mejor || g.profundidad > mejor.profundidad) mejor = g;
  }
  return mejor;
}
