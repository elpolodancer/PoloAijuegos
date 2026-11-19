// Ruta: defendercastillo/infinito-defendercastillo.js
// «Nivel infinito»: un mapa enorme con oleadas que nunca se acaban. Lo cargan el juego y las herramientas de Node.
// Idea (como Idle Miner Tycoon): TODO crece con la misma fórmula exponencial, así el equilibrio se mantiene en cualquier oleada sin calibrar etapa por etapa:
//   · desde la oleada INF.ola0 los enemigos suben un «nivel» por oleada: su vida se multiplica por INF.gVida por nivel;
//   · el oro que dan (y el bono por oleada) se multiplica por INF.gOro por nivel;
//   · las torres no tienen tope: cada nivel extra multiplica su daño por ESCALA_TORRE.g y el precio de su mejora también (ver logica-defendercastillo.js).
// Si gOro = gVida el juego nunca se complica «solo»; con gOro un poco menor (la «presión») el oro rinde cada vez menos y en algún momento
// ya no alcanza: ahí termina la partida. Para que termine antes o después basta mover INF.gOro (más bajo = termina antes).
import { ENEMIGOS, nuevaPartida } from "./logica-defendercastillo.js";

export const INF = {
  ola0: 10,          // desde esta oleada los enemigos suben de nivel
  gVida: 1.11,       // vida de los enemigos × por nivel de enemigo
  gOro: 1.105,       // monedas por enemigo y bono por oleada × por nivel de enemigo (menor que gVida = presión)
  calib10: 1.5,      // multiplicador de vida que alcanzan las primeras 10 oleadas (parecido a los niveles de Michoacán)
  oroBase: 3,        // multiplicador del oro por enemigo (todas las oleadas)
  bonoBase: 90,      // bono base por oleada terminada
  armaNivel: 0.005,  // armadura extra por nivel de enemigo (reduce el daño físico y a la mitad el explosivo; el mago, la ballesta, el veneno y los rayos la ignoran): obliga a variar de torres
  jefeVida: 0.25,    // la vida del jefe se multiplica por esto (menor = jefes más fáciles)
  oroInicial: 600,
  vidaCastillo: 100,
  cols: 30, filas: 30,
};
export const REQ_INFINITO = 2; // nivel de Michoacán que hay que pasar para abrirlo
export const TOPE_CONTEO = 70; // máximo de enemigos por grupo

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const redondea = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

// Oleada a partir de la cual puede salir cada enemigo (los jefes salen cada 10 oleadas)
const DESBLOQUEO = { goblin: 1, lobo: 2, murcielago: 4, orco: 6, esqueleto: 8, arana: 10, slime: 12, caballero: 14, brujo: 16, fantasma: 18, golem: 22, jinete: 26, ogro: 30 };

// Nivel de los enemigos de la oleada w (1 = primera): 0 hasta la oleada ola0 y luego sube de uno en uno
export const nivelEnemigo = (w) => Math.max(0, w - INF.ola0);

// Oleada w (empezando en 1). Siempre sale igual (semilla por oleada).
export function oleadaInfinita(w) {
  const rng = mulberry32(880000 + w * 7919);
  const s = Math.min(w - 1, 40);                 // «oleada equivalente»: la cantidad de enemigos deja de crecer pasada la 41 (después solo suben de nivel)
  const nv = nivelEnemigo(w);
  const elite = w % 5 === 0, jefeW = w % 10 === 0;
  const unl = Object.keys(DESBLOQUEO).filter((t) => DESBLOQUEO[t] <= w);
  const clase = (t) => (ENEMIGOS[t].vida >= 800 ? 2 : ENEMIGOS[t].vida >= 200 ? 1 : 0);
  const masFuerte = unl.slice().sort((a, b) => ENEMIGOS[b].vida - ENEMIGOS[a].vida)[0];
  const costo = (t) => ENEMIGOS[t].vida * (ENEMIGOS[t].vuela ? 2.2 : 1) * (ENEMIGOS[t].vel >= 70 ? 1.4 : 1);
  // Vida de cada enemigo: las primeras 10 oleadas suben suave hasta calib10; después se multiplica por gVida en cada nivel
  const base = (1 + 0.075 * 1.12 * Math.min(s, 9)) * Math.pow(INF.calib10, Math.min(w, INF.ola0) / INF.ola0);
  const vida = base * Math.pow(INF.gVida, nv);
  const oro = INF.oroBase * (1 + 0.06 * Math.min(s, 30)) * Math.pow(INF.gOro, nv);
  const B = 490 * (1 + 0.14 * 1.01 * s) * Math.min(1, 0.5 + (0.5 * w) / 3); // vida total de la oleada a vida ×1 (más suave las 2 primeras)
  const pool = unl.filter((t) => clase(t) === 0 || (clase(t) === 1 && s >= 3) || (clase(t) === 2 && s >= 12));
  const peso = (t) => 1 + (w - DESBLOQUEO[t] < 10 ? 3 : 0); // los recién llegados salen más
  const elegir = (excl) => {
    const l = (pool.length ? pool : unl).filter((t) => !excl.includes(t));
    const tot = l.reduce((a, t) => a + peso(t), 0);
    let r = rng() * tot;
    for (const t of l) { r -= peso(t); if (r <= 0) return t; }
    return l[l.length - 1] || "goblin";
  };
  const ng = Math.min(pool.length, 1 + (rng() < 0.55 ? 1 : 0) + (s >= 12 && rng() < 0.4 ? 1 : 0));
  const grupos = [], usados = [];
  let ini = 0;
  for (let g = 0; g < ng; g++) {
    const t = elegir(usados); usados.push(t);
    const v = ENEMIGOS[t].vida, cant = Math.max(1, Math.min(TOPE_CONTEO, Math.round((B * (elite ? 0.7 : 1)) / ng / costo(t))));
    const cada = redondea(Math.min(2.6, Math.max(0.35, 0.3 + v / 300)) * (ENEMIGOS[t].vel > 70 ? 0.8 : 1));
    grupos.push([t, cant, cada, redondea(ini)]);
    ini += cant * cada * 0.5;
  }
  let jefe = false;
  if (elite && clase(masFuerte) >= 1) {
    const v = ENEMIGOS[masFuerte].vida;
    grupos.push([masFuerte, Math.max(1, Math.round((B * 0.35) / v)), redondea(Math.min(2.6, 0.3 + v / 300)), redondea(ini * 0.5)]);
    jefe = true;
  } else if (elite) for (const g of grupos) g[1] = Math.min(TOPE_CONTEO, Math.round(g[1] * 1.3));
  const o = { vida: redondea(vida, 3), oro: redondea(oro, 3), bono: Math.round((INF.bonoBase + 3 * Math.min(s, 30)) * Math.pow(INF.gOro, nv)), jefe, grupos };
  if (nv > 0) o.pm = redondea(Math.pow(INF.gOro, nv), 3);
  if (nv > 0) o.armX = redondea(INF.armaNivel * nv, 3);
  if (nv > 0) o.ds = redondea(Math.pow(INF.gVida, nv), 3); // los soldados de los cuarteles también reciben más daño de enemigos de más nivel
  if (jefeW) { // jefe cada 10 oleadas: un troll jefe (dragón cada 20 desde la 30), con la vida a la mitad como en los demás niveles
    o.grupos.push([w >= 30 && w % 20 === 0 ? "dragon" : "trollJefe", 1, 6, redondea(ini + 2)]);
    o.jefe = true; o.jefeVida = INF.jefeVida;
  }
  return o;
}

// ---------- Mapa: espiral enorme hacia el castillo del centro ----------
function espiral(cols, filas) {
  let x0 = 0.5, x1 = cols - 0.5, y0 = 0.5, y1 = filas - 0.5;
  const pts = [[-0.5, y0]];
  for (;;) {
    pts.push([x1, y0], [x1, y1], [x0, y1], [x0, y0 + 2]);
    if (x1 - x0 <= 5) break;
    x0 += 2; x1 -= 2; y0 += 2; y1 -= 2;
  }
  const c = Math.floor(x0) + 1, w = Math.floor(x1) - Math.floor(x0) - 1, f = Math.floor(y0 + 2);
  pts.push([c + 0.5, y0 + 2]);
  return { camino: pts, castillo: { c, f, w, h: 2 } };
}

// Nivel completo (mismo formato que generarNivel): «oleadas» queda vacío y «oleadaDe(i)» da la oleada i (0 = la primera) y la recuerda
export function crearNivelInfinito() {
  const { camino, castillo } = espiral(INF.cols, INF.filas);
  const nivel = { id: "INF", n: 30, region: "Infinito", nombre: "Nivel infinito", dificultad: "∞", semilla: 990001, req: REQ_INFINITO, infinito: true,
    cols: INF.cols, filas: INF.filas, oroInicial: INF.oroInicial, vidaCastillo: INF.vidaCastillo, castillo, camino, obstaculos: [],
    torres: ["arquero", "canon", "mago", "mina", "hielo", "cuartel", "ballesta", "veneno", "rayos", "mortero"], nuevas: { torres: [], enemigos: [] }, oleadas: [] };
  const cache = [];
  nivel.oleadaDe = (i) => cache[i] || (cache[i] = oleadaInfinita(i + 1));
  // árboles y rocas repartidos (los que quedan junto al camino sirven de lugar «caro» que se puede talar)
  const rng = mulberry32(990001), bloq = nuevaPartida({ ...nivel, obstaculos: [] }).mapa.bloq;
  const usados = new Set();
  for (let tries = 0; nivel.obstaculos.length < 60 && tries < 2000; tries++) {
    const c = Math.floor(rng() * INF.cols), f = Math.floor(rng() * INF.filas);
    if (bloq[f][c] || usados.has(c + "," + f)) continue;
    usados.add(c + "," + f);
    nivel.obstaculos.push([c, f, rng() < 0.28 ? "🪨" : rng() < 0.5 ? "🌲" : "🌳"]);
  }
  nivel.obstaculos.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return nivel;
}
