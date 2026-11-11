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
import { nivelFijo } from "./niveles-fijos-flechas.js";

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

// ----- FÁCIL: calibrado con los 15 niveles de las capturas (ver README-flechas.md, sección 3) -----
// Los niveles 1 a 15 son FIJOS (niveles-fijos-flechas.js). Del 16 en adelante el bot elige, por semilla, una forma de tablero y un estilo
// con las mismas proporciones que se vieron: casi todos rectángulos de 8 a 20 casillas por lado, y de vez en cuando un tablero ancho,
// en cruz o en cuatro islas. Las flechas son pocas (unas 5 a 32) y largas (promedio 6 a 15).
const FORMAS_FACIL = [
  { peso: 40, forma: "rect",  min: 10, max: 19, cuadrado: true },   // niveles 5, 7, 8, 10, 13, 14, 15
  { peso: 20, forma: "rect",  min: 15, max: 20 },                    // nivel 9 y 11 (15x16, 15x20)
  { peso: 14, forma: "ruido", min: 15, max: 19, cuadrado: true },   // casi llenos con huecos sueltos (niveles 3, 9, 12)
  { peso: 10, forma: "ancho", cols: [28, 33], filas: [12, 14] },     // nivel 12 (33x14)
  { peso: 8,  forma: "cruz",  cols: [26, 30], filas: [26, 30] },     // nivel 4 (30x30)
  { peso: 8,  forma: "islas", min: 13, max: 16, cuadrado: true },   // nivel 6 (15x15)
];
// «largas»: pocas vueltas (niveles 1, 2, 5, 13: 2 giros por flecha). «serpientes»: muchas vueltas (niveles 9, 11, 14: 5 a 6 giros).
const ESTILOS_FACIL = { largas: { recto: 0.8, sesgo: 0.7 }, serpientes: { recto: 0.35, sesgo: 0.9 } };

function perfilFacil(nivel, base) {
  const r = azarSemilla(semillaDe("facil-forma", nivel));
  let t = FORMAS_FACIL.reduce((s, f) => s + f.peso, 0) * r();
  const f = FORMAS_FACIL.find((x) => (t -= x.peso) < 0) || FORMAS_FACIL[0];
  const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
  let cols, filas;
  if (f.cols) { cols = entre(f.cols[0], f.cols[1]); filas = entre(f.filas[0], f.filas[1]); }
  else { cols = entre(f.min, f.max); filas = f.cuadrado ? cols : entre(f.min, f.max); }
  const estilo = r() < 0.55 ? "largas" : "serpientes";
  return { ...base, cols, filas, forma: f.forma, estilo, lmin: 2, lmax: Math.max(12, Math.round((cols + filas) * 0.6)), ...ESTILOS_FACIL[estilo], rondasMax: 9, largoEstilo: estilo === "largas" ? 1 : 0.85, intentos: 4 };
}

export function parametros(dif, nivel) {
  const d = DIFICULTADES[dif];
  if (!d) throw new RangeError("Dificultad desconocida: " + dif);
  if (dif === "facil") return perfilFacil(nivel, { ...d, forma: "rect" });
  return { ...d, forma: "rect" }; // PROVISIONAL (Medio a Ultra): todos los niveles del mismo tamaño; se calibra con sus capturas
}

// Casillas que usa el tablero (1 = hay flechas, 0 = hueco). Los tableros no siempre son rectángulos.
function mascara(forma, cols, filas, r) {
  const m = new Uint8Array(cols * filas).fill(1);
  const quitar = (x, y) => { if (x >= 0 && y >= 0 && x < cols && y < filas) m[y * cols + x] = 0; };
  if (forma === "ruido") { // huecos sueltos (~3 %)
    for (let i = 0; i < m.length; i++) if (r() < 0.03) m[i] = 0;
  } else if (forma === "ancho") { // algunos huecos más grandes en la parte de abajo
    for (let k = 0; k < 4; k++) { const w = 2 + ((r() * 4) | 0), x0 = (r() * (cols - w)) | 0, y0 = filas - 1 - ((r() * 2) | 0); for (let x = x0; x < x0 + w; x++) quitar(x, y0); }
  } else if (forma === "cruz") { // cruz gorda: se quitan las cuatro esquinas
    const bx = Math.round(cols * 0.36), by = Math.round(filas * 0.36);
    for (let y = 0; y < filas; y++) for (let x = 0; x < cols; x++) if ((x < bx || x >= cols - bx) && (y < by || y >= filas - by)) quitar(x, y);
  } else if (forma === "islas") { // cuatro islas en las esquinas, separadas por un hueco en cruz
    const gx = Math.max(2, Math.round(cols * 0.28)), gy = Math.max(2, Math.round(filas * 0.28));
    const x0 = Math.floor((cols - gx) / 2), y0 = Math.floor((filas - gy) / 2);
    for (let y = 0; y < filas; y++) for (let x = 0; x < cols; x++) if ((x >= x0 && x < x0 + gx) || (y >= y0 && y < y0 + gy)) quitar(x, y);
  }
  return m;
}

export function semillaDe(dif, nivel) { // FNV-1a
  let h = 2166136261;
  for (const c of dif + ":" + nivel) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- 1) TROCEAR ----------
function trocear(cols, filas, p, r, mask) {
  const n = cols * filas;
  const libre = Uint8Array.from(mask);
  const dueno = new Int32Array(n).fill(-1);
  const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vecinas = Array.from({ length: n }, (_, i) => {
    const x = i % cols, y = (i / cols) | 0, o = [];
    for (const [dx, dy] of vec) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < cols && b < filas) o.push(b * cols + a); }
    return o;
  });
  const grado = (i) => { let g = 0; for (const j of vecinas[i]) g += libre[j]; return g; };
  const caminos = [];
  let quedan = libre.reduce((t, x) => t + x, 0);

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

// ---------- 3b) PULIR (solo cuando la dificultad trae meta de largo y rondas, hoy Fácil) ----------
// La reparación deja muchas flechas cortas y cadenas muy hondas. Aquí se (1) FUSIONAN flechas cuyos extremos se tocan hasta llegar al largo
// promedio de las capturas y (2) se voltean puntas para bajar las rondas, siempre sin perder la solución.
function pulir(cols, filas, flechas, p, r, meta) {
  const ocupadas = flechas.reduce((t, f) => t + f.celdas.length, 0);
  let est = crearEstado(cols, filas, flechas), a = analizar(est);
  const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let gasto = flechas.length * 14;
  while (gasto-- > 0 && flechas.length * meta > ocupadas) {
    const i = (r() * flechas.length) | 0, fi = flechas[i];
    const porCola = r() < 0.5;
    const e = porCola ? fi.celdas[0] : fi.celdas[fi.celdas.length - 1];
    const [dx, dy] = vec[(r() * 4) | 0];
    const vx = e[0] + dx, vy = e[1] + dy;
    if (vx < 0 || vy < 0 || vx >= cols || vy >= filas) continue;
    const j = est.celda[vy * cols + vx];
    if (j < 0 || j === i) continue;
    const fj = flechas[j], cj = fj.celdas;
    let B;
    if (cj[0][0] === vx && cj[0][1] === vy) B = cj.slice();
    else if (cj[cj.length - 1][0] === vx && cj[cj.length - 1][1] === vy) B = cj.slice().reverse();
    else continue; // la casilla vecina está a medio camino de la otra flecha: no se puede unir
    const A = porCola ? fi.celdas.slice().reverse() : fi.celdas.slice();
    if (A.length + B.length > 36) continue; // en las capturas la flecha más larga mide 35 casillas
    const union = puntas(A.concat(B), cols, filas, r);
    if (!union) continue;
    const nuevas = flechas.filter((_, k) => k !== i && k !== j).concat([{ celdas: union }]);
    const e2 = crearEstado(cols, filas, nuevas), a2 = analizar(e2);
    if (a2.resuelto && a2.profundidad <= p.rondasMax + 3) { flechas = nuevas; est = e2; a = a2; }
  }
  gasto = flechas.length * 40;
  while (gasto-- > 0 && a.profundidad > p.rondasMax) {
    const f = flechas[(r() * flechas.length) | 0], rev = f.celdas.slice().reverse();
    if (golpeaPropio(cols, filas, rev)) continue;
    const antes = f.celdas;
    f.celdas = rev;
    const b = analizar(est);
    if (b.resuelto && (b.profundidad < a.profundidad || (b.profundidad === a.profundidad && b.capas[0].length >= a.capas[0].length))) a = b;
    else f.celdas = antes;
  }
  return { flechas, est, analisis: a };
}

function intentar(p, r) {
  const mask = mascara(p.forma || "rect", p.cols, p.filas, r);
  const hay = mask.reduce((t, x) => t + x, 0);
  const caminos = trocear(p.cols, p.filas, p, r, mask);
  const base = aFlechas(caminos, p.cols, p.filas, r);
  let res = reparar(p.cols, p.filas, base, r, p.cols * p.filas * 4);
  if (p.rondasMax) res = pulir(p.cols, p.filas, res.flechas, p, r, (6 + Math.sqrt(hay) / 3) * p.largoEstilo);
  const { flechas, est, analisis } = res;
  const ocupadas = flechas.reduce((s, f) => s + f.celdas.length, 0);
  return {
    cols: p.cols, filas: p.filas, flechas,
    profundidad: analisis.profundidad,
    libresAlInicio: analisis.capas[0] ? analisis.capas[0].length : 0,
    relleno: ocupadas / hay, ocupadas,
  };
}

// Devuelve { cols, filas, flechas: [{ celdas }], profundidad, libresAlInicio, relleno }
export function generar(dif, nivel = 1) {
  const fijo = nivelFijo(dif, nivel); // niveles copiados de las capturas: se usan tal cual
  if (fijo) {
    const a = analizar(crearEstado(fijo.cols, fijo.filas, fijo.flechas));
    const ocupadas = fijo.flechas.reduce((t, f) => t + f.celdas.length, 0);
    return { ...fijo, fijo: true, profundidad: a.profundidad, libresAlInicio: a.capas[0] ? a.capas[0].length : 0, relleno: 1, ocupadas };
  }
  const p = parametros(dif, nivel);
  const base = semillaDe(dif, nivel);
  let mejor = null;
  for (let k = 0; k < p.intentos; k++) {
    const g = intentar(p, azarSemilla((base + k * 7919) >>> 0));
    // con meta (Fácil): se queda con el más cercano a las capturas (pocas rondas y largo promedio parecido); sin meta: el más profundo
    const pun = (x) => p.rondasMax
      ? Math.max(0, x.profundidad - p.rondasMax) * 3 + Math.abs((x.flechas.length * (6 + Math.sqrt(x.ocupadas) / 3) * p.largoEstilo) / x.ocupadas - 1) * 5
      : -x.profundidad;
    if (!mejor || pun(g) < pun(mejor)) mejor = g;
  }
  return mejor;
}
