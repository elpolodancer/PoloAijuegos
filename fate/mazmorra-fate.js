// Ruta: fate/mazmorra-fate.js
// Genera los niveles de la mazmorra a partir de una semilla: el nivel N siempre sale igual.
// La meta es una mazmorra de 20 niveles cada vez más difíciles (NIVELES_TOTALES); hoy solo está listo el 1 (NIVELES_HECHOS).
// La dificultad sube con escala(n): más vida, más daño, más XP y más monstruos por sala. Los tipos de monstruo de cada
// nivel salen de tiposDe(n): al hacer más niveles se agregan monstruos nuevos en datos-fate.js y se listan aquí.
export const T = 32, COLS = 48, FILAS = 36;
export const NIVELES_TOTALES = 20, NIVELES_HECHOS = 1;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Multiplicadores de dificultad del nivel n (1 = base)
export const escala = (n) => ({ vida: 1 + 0.28 * (n - 1), dano: 1 + 0.2 * (n - 1), xp: 1 + 0.25 * (n - 1), extra: Math.floor((n - 1) / 4) });
// Monstruos que pueden salir en el nivel n (se repite un tipo para que salga más seguido)
const tiposDe = (n) => (n <= 1 ? ["rata", "rata", "slime", "murcielago"] : ["rata", "slime", "murcielago"]);

const px = (c) => (c + 0.5) * T;

export function generarMazmorra(nivel) {
  for (let intento = 0; intento < 30; intento++) {
    const m = intentar(nivel, intento);
    if (m) return m;
  }
  throw new Error("No se pudo generar la mazmorra " + nivel);
}

function intentar(nivel, intento) {
  const rng = mulberry32(5000 + nivel * 977 + intento * 131);
  const g = Array.from({ length: FILAS }, () => Array(COLS).fill(1)); // 1 = pared, 0 = piso
  const salas = [];
  for (let i = 0; i < 400 && salas.length < 9; i++) {
    const w = 5 + Math.floor(rng() * 6), h = 5 + Math.floor(rng() * 5);
    const x = 1 + Math.floor(rng() * (COLS - w - 3)), y = 1 + Math.floor(rng() * (FILAS - h - 3));
    if (salas.some((s) => x < s.x + s.w + 2 && x + w + 2 > s.x && y < s.y + s.h + 2 && y + h + 2 > s.y)) continue;
    salas.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 0;
  }
  if (salas.length < 6) return null;
  const abre = (x, y) => { if (x > 0 && y > 0 && x < COLS - 1 && y < FILAS - 1) g[y][x] = 0; };
  for (let i = 1; i < salas.length; i++) { // pasillos de 2 casillas de ancho: sala anterior → sala siguiente
    const a = salas[i - 1], b = salas[i];
    for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx) + 1; x++) { abre(x, a.cy); abre(x, a.cy + 1); }
    for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy) + 1; y++) { abre(b.cx, y); abre(b.cx + 1, y); }
  }
  const n = salas.length, S0 = salas[0], Sf = salas[n - 1], Sc = salas[2], Sk = salas[n - 2];
  const inicio = { x: px(S0.cx), y: px(S0.cy) };
  const entrada = { x: px(S0.x + 1), y: px(S0.y + 1) };                       // escalera que sube al pueblo
  const salida = { x: px(Sf.x + Sf.w - 2), y: px(Sf.y + 1) };                 // escalera que baja al siguiente nivel
  const cautivo = { x: px(Sc.cx), y: px(Sc.cy) };                             // jaula (misión de rescate)
  const cofre = { x: px(Sk.x + Sk.w - 2), y: px(Sk.y + Sk.h - 2) };           // cofre (misión de objeto)
  const jefe = { x: px(Sf.cx), y: px(Sf.cy) };                                // jefe del nivel (misión de cacería)
  const fijos = [entrada, salida, cautivo, cofre, jefe, inicio];
  const e = escala(nivel), tipos = tiposDe(nivel), monstruos = [];
  for (let i = 1; i < n; i++) {
    const s = salas[i], cant = (i === n - 1 ? 2 : 2 + Math.floor(rng() * 3)) + e.extra;
    for (let k = 0; k < cant; k++) {
      const x = px(s.x + 1 + Math.floor(rng() * (s.w - 2))), y = px(s.y + 1 + Math.floor(rng() * (s.h - 2)));
      if (fijos.some((f) => Math.hypot(f.x - x, f.y - y) < T * 2)) continue;
      monstruos.push({ tipo: tipos[Math.floor(rng() * tipos.length)], x, y });
    }
  }
  return { nivel, g, cols: COLS, filas: FILAS, salas, inicio, entrada, salida, cautivo, cofre, jefe, monstruos };
}
