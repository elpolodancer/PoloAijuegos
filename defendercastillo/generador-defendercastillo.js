// Ruta: defendercastillo/generador-defendercastillo.js
// Genera los niveles de Michoacán (por ahora solo 2; el generador sabe hacer 100, basta subir NIVELES_MICHOACAN y calibrar) (mapa de 12 × 18, obstáculos y oleadas) a partir de una semilla: el nivel N siempre sale igual,
// en el juego y en las herramientas de Node. No guarda los niveles: guarda solo la «vida calibrada» de cada uno (calibracion-defendercastillo.js),
// un número que ajusta la vida de los enemigos para que un bot que juega bien gane con ~45 % de vida del castillo.
// Qué cambia a lo largo de los niveles (todo sale de n):
//   · caminos: serpentinas de 4 a 8 carriles, a veces con dos entradas, y espejadas o volteadas (castillo arriba o abajo);
//   · oleadas: 10 por nivel (antes 12 y antes 30), cada una con más monstruos y con más vida;
//   · enemigos y torres: se desbloquean por nivel (ver DESBLOQUEO_*); jefe en el último nivel de cada decena y mini-jefes cada 10 oleadas;
//   · economía: bono por oleada y oro por enemigo crecen con la vida, y siempre hay árboles de 20 monedas junto a las curvas del camino.
import { ENEMIGOS, nuevaPartida } from "./logica-defendercastillo.js";
import { CALIB } from "./calibracion-defendercastillo.js";

export const OLEADAS = 10; // oleadas de cada mapa (Michoacán y Desbloqueados); antes eran 12 y antes 30. La dificultad se reparte en estas 10 (ver «k» en oleadasDe)
export const NIVELES_MICHOACAN = 2; // por ahora solo 2 (antes 10, y antes 100). Para ampliar: subir esta cifra y correr «node bot-defendercastillo.mjs calibrar» (el generador ya sabe hacer 100)
export const COLS_M = 12, FILAS_M = 18;
// Margen para jugadores humanos: el bot gana con la vida de enemigos más alta posible (la dificultad tiene un «precipicio»: con 8 % más de vida el bot ya pierde).
// Las calibraciones se multiplican por esto al guardarse, para que una persona (que juega peor que el bot y ya no tiene meteoro gratis) tenga holgura.
export const MARGEN_HUMANO = 0.9;

// Nivel a partir del cual aparece cada torre (la Defensa de Michoacán empieza solo con arqueros)
export const DESBLOQUEO_TORRES = { arquero: 1, canon: 2, mago: 6, mina: 9, hielo: 13, cuartel: 18, ballesta: 24, veneno: 30, rayos: 38, mortero: 46 };
// Nivel a partir del cual puede salir cada enemigo (los jefes salen según el nivel, ver oleadasDe)
export const DESBLOQUEO_ENEMIGOS = { goblin: 1, lobo: 2, murcielago: 5, orco: 8, esqueleto: 12, arana: 16, slime: 20, caballero: 26, brujo: 32, fantasma: 40, golem: 48, jinete: 56, ogro: 64, trollJefe: 20, dragon: 75 };
const JEFES = ["trollJefe", "dragon"];

const PUEBLOS = ["Morelia", "Pátzcuaro", "Uruapan", "Zamora", "Zitácuaro", "Lázaro Cárdenas", "Apatzingán", "Sahuayo", "Jiquilpan", "Tacámbaro", "Cuitzeo", "Santa Clara del Cobre",
  "Janitzio", "Angangueo", "Tzintzuntzan", "Paracho", "Tangancícuaro", "Los Reyes", "Hidalgo", "Maravatío", "La Piedad", "Zacapu", "Huetamo", "Ario de Rosales", "Tingüindín"];
const ROMANOS = ["", " II", " III", " IV"];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const redondea = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// ---------- Caminos ----------
// Serpentina horizontal: carriles de izquierda a derecha y de vuelta; el último llega a una columna «cx» y baja al castillo
function serpiente(rng) {
  const ent = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const y0 = rng() < 0.5 ? 0.5 : 1.5, ys = [y0];
  for (;;) { const s = rng() < 0.8 ? 2 : 3, y = ys[ys.length - 1] + s; if (y > 14.5) break; ys.push(y); }
  const xL = [0.5, 1.5, 1.5, 2.5][ent(0, 3)], xR = [9.5, 10.5, 10.5, 11.5][ent(0, 3)];
  const last = ys.length - 1, derUlt = last % 2 === 0;
  const cx = 0.5 + (derUlt ? ent(Math.ceil(xL + 3 - 0.5), Math.floor(xR - 1 - 0.5)) : ent(Math.ceil(xL + 1 - 0.5), Math.floor(xR - 3 - 0.5)));
  const pts = [[-0.5, ys[0]]];
  ys.forEach((y, i) => {
    const x = i === last ? cx : i % 2 === 0 ? xR : xL;
    pts.push([x, y]);
    if (i < last) pts.push([x, ys[i + 1]]);
  });
  pts.push([cx, 16.6]);
  return { caminos: [pts], castillo: { c: Math.min(8, Math.max(0, Math.floor(cx) - 1)), f: 16, w: 4, h: 2 } };
}
// Dos entradas: una serpentina a cada lado (columnas 0-4 y 7-11) que baja al castillo por el centro
function doble(rng) {
  const mk = () => {
    const corto = rng() < 0.3, paso = corto ? 3 : 2, n = corto ? 5 : 7, y0 = rng() < 0.5 ? 0.5 : 1.5, xL = rng() < 0.5 ? 0.5 : 1.5;
    const ys = Array.from({ length: n }, (_, i) => y0 + i * paso), pts = [[-0.5, ys[0]]];
    ys.forEach((y, i) => {
      const x = i === n - 1 ? 4.5 : i % 2 === 0 ? 4.5 : xL;
      pts.push([x, y]);
      if (i < n - 1) pts.push([x, ys[i + 1]]);
    });
    pts.push([4.5, 16.6]);
    return pts;
  };
  const izq = mk(), der = mk().map(([x, y]) => [12 - x, y]);
  return { caminos: [izq, der], castillo: { c: 4, f: 16, w: 4, h: 2 } };
}

// ---------- Oleadas ----------
// «opc» (opcional) es para los mapas fijos de «Desbloqueados» (constructor-mapas-defendercastillo.mjs); sin él todo sale igual que antes (Michoacán):
//   opc.nW = número de oleadas · opc.enemigos = tipos que pueden salir (sin jefes) · opc.miniJefe = trollJefe al final de cada 10 oleadas (desde la 20)
//   opc.jefe = [tipo, cantidad] que cierra la última oleada (o null) · aquí «n» es la dificultad equivalente (1 a 10 en los 10 primeros mapas)
export function oleadasDe(n, calib, rng, opc) {
  const nW = opc && opc.nW ? opc.nW : OLEADAS;
  // Cada oleada «vale» k oleadas del juego original de 30 (enemigos más fuertes, más oro, tipos pesados). Con nW = 30, k = 1 y todo sale como antes;
  // con 12 oleadas k = 1.2 (con más, el número de enemigos crece tan rápido que el mapa 8, de dos entradas, no se podía ganar ni con enemigos casi sin vida).
  const k = Math.min(1.2, 29 / Math.max(1, nW - 1)); // tope 1.2: con 12 oleadas la última equivale a la ~14 del original; la vida calibrada ajusta el final
  const cadaElite = Math.max(2, Math.round(nW / 3));           // oleada fuerte cada «cadaElite» oleadas (con 10: la 3, la 6, la 9 y la 10)
  const ablanda = Math.max(3, Math.round(nW / 3));             // las primeras oleadas son más suaves (con 12: las 4 primeras)
  const unl = opc && opc.enemigos ? opc.enemigos.slice() : Object.keys(DESBLOQUEO_ENEMIGOS).filter((t) => !JEFES.includes(t) && DESBLOQUEO_ENEMIGOS[t] <= n);
  const clase = (t) => (ENEMIGOS[t].vida >= 800 ? 2 : ENEMIGOS[t].vida >= 200 ? 1 : 0); // 0 ligero, 1 medio, 2 pesado
  const masFuerte = unl.slice().sort((a, b) => ENEMIGOS[b].vida - ENEMIGOS[a].vida)[0];
  // «costo» de un enemigo al repartir la vida de la oleada: los voladores y los muy rápidos pesan más que su vida (son más difíciles de parar)
  const costo = (t) => ENEMIGOS[t].vida * (ENEMIGOS[t].vuela ? 2.2 : 1) * (ENEMIGOS[t].vel >= 70 ? 1.4 : 1);
  const oleadas = [];
  for (let w = 0; w < nW; w++) {
    const elite = w === nW - 1 || (w + 1) % cadaElite === 0;
    const s = w * k; // «oleada equivalente» del juego original de 30 (0 a 29)
    // Cada nivel empieza de cero (mismo oro, sin torres): las primeras oleadas se parecen en todos los niveles y lo que crece con n
    // es la rapidez con la que suben los monstruos (g) y su vida (h) durante el nivel. «calib» solo ajusta el final: la oleada 1 va a ×1
    // y la última a ×calib (crece de forma geométrica entre las dos).
    const m = (1 + 0.075 * (1 + n * 0.03) * s) * Math.pow(calib, w / (nW - 1)); // vida de los enemigos
    const B = (480 + 2 * n) * (1 + 0.14 * (1 + n * 0.01) * s) * Math.min(1, 0.5 + (0.5 * w) / ablanda); // vida total de la oleada (a vida ×1); las 5 primeras son más suaves
    const pool = unl.filter((t) => clase(t) === 0 || (clase(t) === 1 && s >= 3) || (clase(t) === 2 && s >= 12));
    const peso = (t) => (opc ? 1 + ((opc.nuevos || []).includes(t) ? 3 : 0) : 1 + (n - DESBLOQUEO_ENEMIGOS[t] < 12 ? 3 : 0));
    const elegir = (excl) => {
      const l = (pool.length ? pool : unl).filter((t) => !excl.includes(t));
      const tot = l.reduce((s, t) => s + peso(t), 0);
      let r = rng() * tot;
      for (const t of l) { r -= peso(t); if (r <= 0) return t; }
      return l[l.length - 1] || "goblin";
    };
    const ng = Math.min(pool.length, 1 + (rng() < 0.55 ? 1 : 0) + (s >= 12 && rng() < 0.4 ? 1 : 0)); // sin repetir tipos en la misma oleada
    const grupos = [], usados = [];
    let ini = 0;
    for (let g = 0; g < ng; g++) {
      const t = elegir(usados); usados.push(t);
      const v = ENEMIGOS[t].vida, cant = Math.max(1, Math.min(70, Math.round((B * (elite ? 0.7 : 1)) / ng / costo(t))));
      const cada = redondea(Math.min(2.6, Math.max(0.35, 0.3 + v / 300)) * (ENEMIGOS[t].vel > 70 ? 0.8 : 1));
      grupos.push([t, cant, cada, redondea(ini)]);
      ini += cant * cada * 0.5;
    }
    let jefe = false;
    if (elite && clase(masFuerte) >= 1) { // oleada fuerte: se suma el enemigo más pesado que ya salió
      const v = ENEMIGOS[masFuerte].vida;
      grupos.push([masFuerte, Math.max(1, Math.round((B * 0.35) / v)), redondea(Math.min(2.6, 0.3 + v / 300)), redondea(ini * 0.5)]);
      jefe = true;
    } else if (elite) for (const g of grupos) g[1] = Math.round(g[1] * 1.3); // al inicio solo hay enemigos ligeros: la oleada trae un enjambre más grande
    if ((opc ? opc.miniJefe : n >= 20) && s >= 19 && (w + 1) % cadaElite === 0 && w !== nW - 1) { grupos.push(["trollJefe", 1, 1, redondea(ini + 2)]); jefe = true; }
    if (opc && opc.jefe && w === nW - 1) { // mapas fijos: jefe final elegido a mano
      grupos.push([opc.jefe[0], opc.jefe[1], 6, redondea(ini + 2)]);
      jefe = true;
    } else if (!opc && w === nW - 1 && n % 10 === 0) { // jefe final: cada 10 niveles
      const dragon = n >= 75 && (n / 10) % 2 === 1;
      grupos.push(dragon ? ["dragon", 1 + Math.floor((n - 70) / 20), 6, redondea(ini + 2)] : ["trollJefe", 1 + Math.floor(n / 40), 6, redondea(ini + 2)]);
      jefe = true;
    }
    oleadas.push({ vida: redondea(m * calib, 3), oro: redondea(1 + 0.06 * s), bono: Math.round(30 + 3 * s + 0.35 * n), jefe, grupos });
  }
  return oleadas;
}

// ---------- Nivel completo ----------
export function generarNivel(n, calib) {
  if (calib === undefined) calib = CALIB[n - 1] || 1;
  const rng = mulberry32(910000 + n * 7919);
  const ent = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const esDoble = n >= 25 && rng() < 0.35;
  const m = esDoble ? doble(rng) : serpiente(rng);
  let { caminos, castillo } = m;
  if (!esDoble && rng() < 0.5) { // espejo: la entrada viene por la derecha
    caminos = caminos.map((c) => c.map(([x, y]) => [12 - x, y]));
    castillo = { ...castillo, c: 12 - (castillo.c + castillo.w) };
  }
  if (rng() < 0.3) { // volteado: la entrada viene por abajo y el castillo queda arriba
    caminos = caminos.map((c) => c.map(([x, y]) => [x, 18 - y]));
    castillo = { ...castillo, f: 18 - (castillo.f + castillo.h) };
  }
  const nivel = { id: "M" + n, n, region: "Michoacán", nombre: PUEBLOS[(n - 1) % 25] + ROMANOS[Math.floor((n - 1) / 25)], semilla: 910000 + n,
    dificultad: n <= 25 ? "Fácil" : n <= 55 ? "Media" : n <= 85 ? "Difícil" : "Muy difícil",
    cols: COLS_M, filas: FILAS_M, oroInicial: 250 + (n - 1) * 25 /* nivel 1: 250 monedas; +25 por nivel (el 10 empieza con 475) */, vidaCastillo: 100, castillo, obstaculos: [] };
  if (caminos.length === 1) nivel.camino = caminos[0]; else nivel.caminos = caminos;

  // obstáculos: 3 a 5 árboles de 20 monedas junto a las curvas del camino (lugares estratégicos) y el resto repartido
  const bloq = nuevaPartida({ ...nivel, oleadas: [] }).mapa.bloq;
  const libre = (c, f) => c >= 0 && c < COLS_M && f >= 0 && f < FILAS_M && !bloq[f][c];
  const usado = new Set();
  const poner = (c, f, e) => { usado.add(c + "," + f); nivel.obstaculos.push([c, f, e]); };
  const esquinas = [];
  for (const cam of caminos) for (let i = 1; i < cam.length - 1; i++) esquinas.push([Math.floor(cam[i][0]), Math.floor(cam[i][1])]);
  const estrategicas = [];
  for (const [ec, ef] of esquinas) for (let dc = -1; dc <= 1; dc++) for (let df = -1; df <= 1; df++) {
    const c = ec + dc, f = ef + df;
    if (libre(c, f) && !estrategicas.some((q) => q[0] === c && q[1] === f)) estrategicas.push([c, f]);
  }
  const k = Math.min(estrategicas.length, 3 + ent(0, 2));
  for (let i = 0; i < k; i++) { const [c, f] = estrategicas.splice(Math.floor(rng() * estrategicas.length), 1)[0]; poner(c, f, rng() < 0.5 ? "🌲" : "🌳"); }
  const total = 12 + ent(0, 8) + Math.floor(n / 25);
  for (let tries = 0; nivel.obstaculos.length < total && tries < 400; tries++) {
    const c = ent(0, COLS_M - 1), f = ent(0, FILAS_M - 1);
    if (!libre(c, f) || usado.has(c + "," + f)) continue;
    poner(c, f, rng() < 0.28 ? "🪨" : rng() < 0.5 ? "🌲" : "🌳");
  }
  nivel.obstaculos.sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  nivel.torres = Object.keys(DESBLOQUEO_TORRES).filter((t) => DESBLOQUEO_TORRES[t] <= n);
  nivel.nuevas = {
    torres: Object.keys(DESBLOQUEO_TORRES).filter((t) => DESBLOQUEO_TORRES[t] === n),
    enemigos: Object.keys(DESBLOQUEO_ENEMIGOS).filter((t) => DESBLOQUEO_ENEMIGOS[t] === n && !JEFES.includes(t)),
  };
  nivel.oleadas = oleadasDe(n, calib, rng);
  return nivel;
}
