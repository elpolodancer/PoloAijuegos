// Ruta: paperio/niveles-paperio.js
// Niveles de «Paperio». Cada nivel es solo un objeto con datos; para agregar uno nuevo, añade otro al final de NIVELES.
//
//   { nombre: "Trébol", bots: 3, meta: 20, forma: { ... } }
//     nombre → se muestra en el selector de niveles
//     bots   → cuántos rivales (1 a 7)
//     meta   → % del mapa que hay que conquistar para pasar de nivel
//     dificultad (opcional, 0 a 1) → qué tan agresivos son los bots: atacan tu estela, rondan tu zona y defienden la suya.
//                                     Si no la pones, sube sola con el número de nivel (0.4 en el primero, 1 desde el nivel 9).
//     rasgos (opcional, cada valor de 0 a 1) → comportamientos extra de los bots (niveles 11 en adelante; los 21 a 100 los calcula dura()):
//        mordisco → algunos bots salen directo a meterse en TU territorio y dar la vuelta para quitarte un pedazo
//        venganza → cuando eliminas a un bot, los demás se enteran y van a por ti un rato
//        acoso    → los bots te persiguen más cuanto más larga es tu estela (más riesgo si te alejas de casa)
//        veloz    → los bots corren un poco más rápido (0.05 = 5 % más; no pases de 0.1)
//        giro     → los bots giran más cerrado, así te cortan y esquivan mejor (0.3 = 30 % más; no pases de 0.4)
//     forma  → la silueta del mapa (dos maneras, que se pueden combinar con «huecos»):
//
//   1) Gotas que se funden entre sí (formas orgánicas, curvas suaves):
//        forma: { bolas: [[x, y, r], [x, y, r], ...] }
//   2) Radio según el ángulo (flores, trébol, estrellas redondeadas):
//        forma: { polar: [r0, [pétalos, altura, giro], [pétalos, altura, giro], ...] }
//        el radio es  r0 + Σ altura · cos(pétalos · ángulo + giro)
//   Opcional en ambas: huecos: [[x, y, r], ...]  → zonas del mapa donde no se puede entrar (islas, agujeros).
//
// Coordenadas: el mapa cabe en el círculo de radio 1 con centro en (0, 0); x crece a la derecha, y hacia abajo.
// Consejos: deja la forma dentro de ~0.95 del centro, con pasillos de al menos 0.3 de ancho, y en una sola pieza.
// Atajos para construir formas largas: cadena(), espiral().

const PI = Math.PI;

// Gotas a lo largo de una línea recta de (x1,y1) a (x2,y2)
export function cadena(x1, y1, x2, y2, r, paso = 0.1) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / paso)), l = [];
  for (let i = 0; i <= n; i++) l.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, r]);
  return l;
}
// Gotas a lo largo de una espiral: de radio r0 a r1 dando «vueltas» vueltas
export function espiral(r0, r1, vueltas, r, giro = 0) {
  const l = [], pasos = Math.round(vueltas * 36);
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos, a = giro + t * vueltas * 2 * PI, d = r0 + (r1 - r0) * t;
    l.push([Math.cos(a) * d, Math.sin(a) * d, r]);
  }
  return l;
}

// ----- Piezas para algunos niveles -----
const serpiente = [];
for (let i = 0; i <= 24; i++) { const x = -0.74 + i * (1.48 / 24); serpiente.push([x, 0.4 * Math.sin(x * 3.6), 0.2]); }

const estrella = [[0, 0, 0.3]];
for (let k = 0; k < 5; k++) {
  const a = -PI / 2 + k * 2 * PI / 5;
  for (let i = 0; i <= 8; i++) { const t = i / 8, d = 0.15 + 0.65 * t, r = 0.24 - 0.14 * t; estrella.push([Math.cos(a) * d, Math.sin(a) * d, r]); }
}

const islas = [
  [-0.5, -0.35, 0.38], [0.5, -0.2, 0.36], [0, 0.55, 0.38],
  ...cadena(-0.5, -0.35, 0.5, -0.2, 0.13), ...cadena(0.5, -0.2, 0, 0.55, 0.13), ...cadena(0, 0.55, -0.5, -0.35, 0.13),
];


// ----- Piezas para los niveles 11 a 20 -----
const hueso = [
  ...cadena(-0.55, 0, 0.55, 0, 0.17),
  [-0.64, -0.22, 0.2], [-0.64, 0.22, 0.2], [0.64, -0.22, 0.2], [0.64, 0.22, 0.2],
];
const zigzag = [
  ...cadena(-0.6, -0.6, 0.6, -0.6, 0.14), ...cadena(0.6, -0.6, 0.6, 0, 0.14),
  ...cadena(0.6, 0, -0.6, 0, 0.14), ...cadena(-0.6, 0, -0.6, 0.6, 0.14),
  ...cadena(-0.6, 0.6, 0.6, 0.6, 0.14),
];
const cruz = [...cadena(-0.8, 0, 0.8, 0, 0.16), ...cadena(0, -0.8, 0, 0.8, 0.16), [0, 0, 0.28]];
const puente = [
  [-0.5, -0.5, 0.3], [0.5, -0.5, 0.3], [0.5, 0.5, 0.3], [-0.5, 0.5, 0.3],
  ...cadena(-0.5, -0.5, 0.5, -0.5, 0.1), ...cadena(0.5, -0.5, 0.5, 0.5, 0.1),
  ...cadena(0.5, 0.5, -0.5, 0.5, 0.1), ...cadena(-0.5, 0.5, -0.5, -0.5, 0.1),
];
const pulpo = [[0, 0, 0.3]];
for (let k = 0; k < 8; k++) { const a = k * PI / 4; pulpo.push(...cadena(Math.cos(a) * 0.2, Math.sin(a) * 0.2, Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0.12)); }
const caracol = espiral(0.1, 0.8, 2.3, 0.11);

// ----- Piezas para los niveles 21 a 100 -----
// Generador de números «al azar» con semilla: el mismo número siempre da el mismo mapa
export function azar(sem) { let s = sem >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Gotas a lo largo de un arco de círculo (centro cx,cy; radio R; de a0 a a1 radianes)
export function arco(cx, cy, R, a0, a1, r, paso = 0.09) {
  const n = Math.max(1, Math.round(Math.abs(a1 - a0) * R / paso)), l = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; l.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, r]); }
  return l;
}
export const anillo = (R, r, cx = 0, cy = 0) => arco(cx, cy, R, 0, 2 * PI, r);
// «k» líneas que salen del centro (de la distancia d0 a d1)
export function rayos(k, d0, d1, r, giro = 0) {
  const l = [];
  for (let i = 0; i < k; i++) { const a = giro + i * 2 * PI / k; l.push(...cadena(Math.cos(a) * d0, Math.sin(a) * d0, Math.cos(a) * d1, Math.sin(a) * d1, r)); }
  return l;
}
// Línea quebrada que pasa por los puntos [[x,y], ...]
export function poli(pts, r) {
  const l = [];
  for (let i = 0; i + 1 < pts.length; i++) l.push(...cadena(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r));
  return l;
}
// «k» puntos repartidos en un círculo de radio d (sirven para islas o para huecos)
export function circulos(k, d, r, giro = 0) {
  const l = [];
  for (let i = 0; i < k; i++) { const a = giro + i * 2 * PI / k; l.push([Math.cos(a) * d, Math.sin(a) * d, r]); }
  return l;
}
// Rejilla de puntos (n×n) con separación «sep», recortada a un radio «max»
export function rejilla(n, sep, r, max = 0.8) {
  const l = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * sep, y = (j - (n - 1) / 2) * sep;
    if (Math.hypot(x, y) + r <= max) l.push([x, y, r]);
  }
  return l;
}
// Panal: puntos en filas desplazadas
export function panal(sep, r, max = 0.82) {
  const l = [], h = sep * 0.866;
  for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
    const x = i * sep + (j % 2 ? sep / 2 : 0), y = j * h;
    if (Math.hypot(x, y) + r <= max) l.push([x, y, r]);
  }
  return l;
}
// Lunares al azar: «n» puntos con radio entre rmin y rmax, separados al menos «sep» entre sí, a distancia dmin..dmax del centro
export function lunares(sem, n, rmin, rmax, sep, dmin = 0.15, dmax = 0.78) {
  const az = azar(sem), l = [];
  for (let t = 0; t < 4000 && l.length < n; t++) {
    const a = az() * 2 * PI, d = dmin + az() * (dmax - dmin), r = rmin + az() * (rmax - rmin);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (l.every((p) => Math.hypot(p[0] - x, p[1] - y) >= sep + p[2] + r)) l.push([x, y, r]);
  }
  return l;
}
// Nube: gotas grandes al azar, siempre pegadas a las anteriores para que quede de una sola pieza
export function nube(sem, n, rmin, rmax) {
  const az = azar(sem), l = [[0, 0, rmax]];
  for (let t = 0; t < 4000 && l.length < n; t++) {
    const p = l[(az() * l.length) | 0], a = az() * 2 * PI, r = rmin + az() * (rmax - rmin), d = p[2] + r * 0.6;
    const x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d;
    if (Math.hypot(x, y) + r < 0.9) l.push([x, y, r]);
  }
  return l;
}
// Constelación: islitas al azar unidas por caminos delgados (el árbol que une todas con el menor camino)
export function constelacion(sem, n, rIsla, rCamino) {
  const az = azar(sem), p = [];
  for (let t = 0; t < 4000 && p.length < n; t++) {
    const a = az() * 2 * PI, d = Math.sqrt(az()) * (0.88 - rIsla), x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (p.every((q) => Math.hypot(q[0] - x, q[1] - y) > 0.42)) p.push([x, y]);
  }
  const l = p.map(([x, y]) => [x, y, rIsla]), dentro = [0], fuera = p.map((_, i) => i).slice(1);
  while (fuera.length) {
    let mejor = 1e9, bi = 0, bj = 0;
    for (const i of dentro) for (const j of fuera) { const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); if (d < mejor) { mejor = d; bi = i; bj = j; } }
    l.push(...cadena(p[bi][0], p[bi][1], p[bj][0], p[bj][1], rCamino));
    dentro.push(bj); fuera.splice(fuera.indexOf(bj), 1);
  }
  return l;
}
// Árbol: un tronco que se divide en dos ramas, «prof» veces
export function rama(x, y, a, L, r, prof, l = []) {
  const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
  l.push(...cadena(x, y, x2, y2, r));
  if (prof > 0) { rama(x2, y2, a - 0.55, L * 0.72, r, prof - 1, l); rama(x2, y2, a + 0.55, L * 0.72, r, prof - 1, l); }
  return l;
}
// Estrella de «k» puntas
export function estrellaN(k, largo, r0, r1) {
  const l = [[0, 0, r0 + 0.06]];
  for (let i = 0; i < k; i++) {
    const a = -PI / 2 + i * 2 * PI / k;
    for (let j = 0; j <= 8; j++) { const t = j / 8, d = 0.12 + (largo - 0.12) * t, r = r0 - (r0 - r1) * t; l.push([Math.cos(a) * d, Math.sin(a) * d, r]); }
  }
  return l;
}
// Copo de nieve: «k» brazos con dos ramitas cada uno
export function copo(k, r) {
  const l = [[0, 0, r * 1.6]];
  for (let i = 0; i < k; i++) {
    const a = i * 2 * PI / k, c = Math.cos(a), s = Math.sin(a);
    l.push(...cadena(0, 0, c * 0.85, s * 0.85, r));
    for (const d of [0.38, 0.62]) for (const q of [-0.9, 0.9]) {
      const bx = c * d, by = s * d, L = 0.28 - d * 0.18;
      l.push(...cadena(bx, by, bx + Math.cos(a + q) * L, by + Math.sin(a + q) * L, r));
    }
  }
  return l;
}
// Serpentina: «n» barras horizontales unidas por los extremos, alternando derecha e izquierda
export function serpentina(n, ancho, r, alto = 0.66) {
  const l = [];
  for (let i = 0; i < n; i++) {
    const y = -alto + i * (2 * alto / (n - 1));
    l.push(...cadena(-ancho, y, ancho, y, r));
    if (i < n - 1) { const x = i % 2 ? -ancho : ancho; l.push(...cadena(x, y, x, y + 2 * alto / (n - 1), r)); }
  }
  return l;
}
// Huecos en forma de pasillos: «n» barras que dejan un paso de ancho «gap» alternando derecha e izquierda (hace un laberinto)
export function pasillos(n, r, gap, alto = 0.6) {
  const h = [];
  for (let i = 0; i < n; i++) {
    const y = -alto + i * (2 * alto / (n - 1)), x = Math.sqrt(Math.max(0.01, 0.81 - y * y));
    if (i % 2) h.push(...cadena(-x - 0.1, y, x - gap, y, r)); else h.push(...cadena(-x + gap, y, x + 0.1, y, r));
  }
  return h;
}
// Calles: «n» líneas horizontales y «n» verticales
export function ciudad(n, r, a = 0.62) {
  const l = [];
  for (let i = 0; i < n; i++) {
    const t = -a + i * (2 * a / (n - 1)), e = Math.sqrt(0.9 * 0.9 - t * t);
    l.push(...cadena(-e, t, e, t, r), ...cadena(t, -e, t, e, r));
  }
  return l;
}
// Rombo macizo
export function rombo(R, r) {
  const l = [];
  for (let y = -R; y <= R + 1e-6; y += r) { const h = R - Math.abs(y); l.push(...cadena(-h, y, h, y, r)); }
  return l;
}
// Islas unidas con puentes: lista de centros [x,y], radio de isla, radio de puente y qué pares unir [[i,j], ...]
export function islas2(centros, rIsla, rPuente, pares) {
  const l = centros.map(([x, y]) => [x, y, rIsla]);
  for (const [i, j] of pares) l.push(...cadena(centros[i][0], centros[i][1], centros[j][0], centros[j][1], rPuente));
  return l;
}

// Dificultad de los niveles 21 a 100: los rasgos de los bots suben poco a poco con el número de nivel
// (llegan al tope hacia el nivel 40; velocidad y giro siguen subiendo hasta el 100) y la meta sube de 30 % a 40 %.
function dura(n) {
  const t = (n - 20) / 80, u = Math.min(1, (n - 20) / 20);
  return {
    bots: 7, meta: Math.round(30 + 10 * t),
    rasgos: { mordisco: 0.9 + 0.1 * u, venganza: 0.8 + 0.2 * u, acoso: 0.85 + 0.15 * u, veloz: 0.07 + 0.03 * Math.min(1, (n - 20) / 40), giro: 0.3 * t },
  };
}

export const NIVELES = [
  { nombre: "Colina",       bots: 3, meta: 20, forma: { polar: [0.84, [3, 0.07, 0]] } },
  { nombre: "Trébol",       bots: 3, meta: 20, forma: { bolas: [[0.5, 0, 0.36], [-0.5, 0, 0.36], [0, 0.5, 0.36], [0, -0.5, 0.36], [0, 0, 0.2]] } },
  { nombre: "Flor",         bots: 4, meta: 20, forma: { polar: [0.68, [5, 0.25, 0]] } },
  { nombre: "Cacahuate",    bots: 4, meta: 22, forma: { bolas: [[-0.5, 0, 0.42], [0.5, 0, 0.42], [0, 0, 0.26]] } },
  { nombre: "Luna",         bots: 4, meta: 22, forma: { bolas: [[0, 0, 0.92]], huecos: [[0.42, 0, 0.7]] } },
  { nombre: "Anillo",       bots: 5, meta: 22, forma: { bolas: [[0, 0, 0.95]], huecos: [[0, 0, 0.4]] } },
  { nombre: "Serpiente",    bots: 5, meta: 25, forma: { bolas: serpiente } },
  { nombre: "Estrella",     bots: 6, meta: 25, forma: { bolas: estrella } },
  { nombre: "Archipiélago", bots: 6, meta: 25, forma: { bolas: islas } },
  { nombre: "Remolino",     bots: 7, meta: 25, forma: { bolas: espiral(0.22, 0.76, 1.25, 0.13) } },
  { nombre: "Mariposa",     bots: 5, meta: 25, rasgos: { mordisco: 0.2, acoso: 0.1 },
    forma: { bolas: [[-0.45, -0.4, 0.34], [0.45, -0.4, 0.34], [-0.4, 0.4, 0.28], [0.4, 0.4, 0.28], [0, 0, 0.22]] } },
  { nombre: "Hueso",        bots: 5, meta: 25, rasgos: { mordisco: 0.25, venganza: 0.15, acoso: 0.15 }, forma: { bolas: hueso } },
  { nombre: "Zigzag",       bots: 6, meta: 25, rasgos: { mordisco: 0.3, venganza: 0.2, acoso: 0.2 }, forma: { bolas: zigzag } },
  { nombre: "Cruz",         bots: 6, meta: 28, rasgos: { mordisco: 0.35, venganza: 0.25, acoso: 0.3 }, forma: { bolas: cruz } },
  { nombre: "Ocho",         bots: 6, meta: 28, rasgos: { mordisco: 0.4, venganza: 0.3, acoso: 0.35 },
    forma: { bolas: [[-0.45, 0, 0.5], [0.45, 0, 0.5]], huecos: [[-0.45, 0, 0.22], [0.45, 0, 0.22]] } },
  { nombre: "Sol",          bots: 7, meta: 28, rasgos: { mordisco: 0.5, venganza: 0.4, acoso: 0.4 }, forma: { polar: [0.68, [14, 0.14, 0]] } },
  { nombre: "Puentes",      bots: 7, meta: 28, rasgos: { mordisco: 0.55, venganza: 0.5, acoso: 0.5 }, forma: { bolas: puente } },
  { nombre: "Pulpo",        bots: 7, meta: 30, rasgos: { mordisco: 0.65, venganza: 0.55, acoso: 0.6, veloz: 0.03 }, forma: { bolas: pulpo } },
  { nombre: "Caracol",      bots: 7, meta: 30, rasgos: { mordisco: 0.75, venganza: 0.7, acoso: 0.7, veloz: 0.05 }, forma: { bolas: caracol } },
  { nombre: "Fortaleza",    bots: 7, meta: 30, rasgos: { mordisco: 0.9, venganza: 0.8, acoso: 0.85, veloz: 0.07 },
    forma: { bolas: [[0, 0, 0.95]], huecos: [[0.5, 0, 0.2], [-0.5, 0, 0.2], [0, 0.5, 0.2], [0, -0.5, 0.2], [0, 0, 0.25]] } },
  // ----- Niveles 21 a 100 (más difíciles; ver dura() arriba) -----
  { nombre: "Pétalos", ...dura(21), forma: { polar: [0.68, [6, 0.22, 0]] } },
  { nombre: "Margarita", ...dura(22), forma: { polar: [0.66, [8, 0.2, 0]] } },
  { nombre: "Rueda", ...dura(23), forma: { bolas: [...anillo(0.72, 0.1), ...rayos(6, 0, 0.72, 0.1), [0, 0, 0.2]] } },
  { nombre: "Diana", ...dura(24), forma: { bolas: [...anillo(0.3, 0.09), ...anillo(0.62, 0.09), ...rayos(4, 0, 0.9, 0.09, PI / 4)] } },
  { nombre: "Queso", ...dura(25), forma: { bolas: [[0, 0, 0.95]], huecos: lunares(25, 9, 0.08, 0.14, 0.14) } },
  { nombre: "Rombo", ...dura(26), forma: { bolas: rombo(0.8, 0.1) } },
  { nombre: "Corazón", ...dura(27), forma: { bolas: [[-0.32, -0.22, 0.42], [0.32, -0.22, 0.42], [0, 0.1, 0.4], [0, 0.35, 0.28], [0, 0.55, 0.16]] } },
  { nombre: "Lágrima", ...dura(28), forma: { bolas: [[0, 0.3, 0.5], [0, 0, 0.4], [0, -0.3, 0.28], [0, -0.55, 0.15]] } },
  { nombre: "Árbol", ...dura(29), forma: { bolas: [...rama(0, 0.85, -PI / 2, 0.42, 0.1, 3), [0, 0.85, 0.16]] } },
  { nombre: "Hélice", ...dura(30), forma: { polar: [0.42, [3, 0.4, 0]] } },
  { nombre: "Serpentina", ...dura(31), forma: { bolas: serpentina(4, 0.55, 0.12) } },
  { nombre: "Culebra", ...dura(32), forma: { bolas: serpentina(6, 0.55, 0.09, 0.7) } },
  { nombre: "Peine", ...dura(33), forma: { bolas: [...cadena(-0.7, -0.7, -0.7, 0.7, 0.12), ...[-0.6, -0.3, 0, 0.3, 0.6].flatMap((y) => cadena(-0.7, y, 0.7, y, 0.09))] } },
  { nombre: "Escalera", ...dura(34), forma: { bolas: poli([[-0.7, 0.7], [-0.7, 0.35], [-0.35, 0.35], [-0.35, 0], [0, 0], [0, -0.35], [0.35, -0.35], [0.35, -0.7], [0.7, -0.7]], 0.14) } },
  { nombre: "Letra H", ...dura(35), forma: { bolas: [...cadena(-0.45, -0.8, -0.45, 0.8, 0.17), ...cadena(0.45, -0.8, 0.45, 0.8, 0.17), ...cadena(-0.45, 0, 0.45, 0, 0.17)] } },
  { nombre: "Letra E", ...dura(36), forma: { bolas: [...cadena(-0.5, -0.75, -0.5, 0.75, 0.15), ...cadena(-0.5, -0.7, 0.5, -0.7, 0.15), ...cadena(-0.5, 0, 0.4, 0, 0.15), ...cadena(-0.5, 0.7, 0.5, 0.7, 0.15)] } },
  { nombre: "Equis", ...dura(37), forma: { bolas: [...cadena(-0.7, -0.7, 0.7, 0.7, 0.16), ...cadena(0.7, -0.7, -0.7, 0.7, 0.16), [0, 0, 0.26]] } },
  { nombre: "Ye", ...dura(38), forma: { bolas: [...cadena(-0.6, -0.7, 0, 0, 0.16), ...cadena(0.6, -0.7, 0, 0, 0.16), ...cadena(0, 0, 0, 0.85, 0.16)] } },
  { nombre: "Asterisco", ...dura(39), forma: { bolas: [...rayos(6, 0, 0.85, 0.15), [0, 0, 0.24]] } },
  { nombre: "Escalera de mano", ...dura(40), forma: { bolas: [...cadena(-0.35, -0.85, -0.35, 0.85, 0.13), ...cadena(0.35, -0.85, 0.35, 0.85, 0.13), ...[-0.55, 0, 0.55].flatMap((y) => cadena(-0.35, y, 0.35, y, 0.12))] } },
  { nombre: "Doble anillo", ...dura(41), forma: { bolas: [...anillo(0.35, 0.1), ...anillo(0.72, 0.1), ...cadena(0.35, 0, 0.72, 0, 0.1), ...cadena(-0.35, 0, -0.72, 0, 0.1)] } },
  { nombre: "Cuatro pilares", ...dura(42), forma: { bolas: [[0, 0, 0.95]], huecos: circulos(4, 0.55, 0.17, PI / 4) } },
  { nombre: "Ocho pilares", ...dura(43), forma: { bolas: [[0, 0, 0.95]], huecos: [...circulos(8, 0.62, 0.12), [0, 0, 0.2]] } },
  { nombre: "Corona de islas", ...dura(44), forma: { bolas: [...circulos(6, 0.65, 0.2), ...anillo(0.65, 0.07)] } },
  { nombre: "Letra C", ...dura(45), forma: { bolas: [[0, 0, 0.95]], huecos: [[0, 0, 0.4], ...cadena(0, -0.4, 0, -0.97, 0.06)] } },
  { nombre: "Trébol de anillos", ...dura(46), forma: { bolas: [...anillo(0.34, 0.09, 0, -0.4), ...anillo(0.34, 0.09, -0.35, 0.2), ...anillo(0.34, 0.09, 0.35, 0.2)] } },
  { nombre: "Pétalos huecos", ...dura(47), forma: { polar: [0.8, [6, 0.12, 0]], huecos: [[0, 0, 0.35]] } },
  { nombre: "Galaxia", ...dura(48), forma: { bolas: [...espiral(0.08, 0.8, 1.6, 0.1, 0), ...espiral(0.08, 0.8, 1.6, 0.1, PI)] } },
  { nombre: "Remolino triple", ...dura(49), forma: { bolas: [0, 1, 2].flatMap((k) => espiral(0.08, 0.82, 1, 0.09, k * 2 * PI / 3)) } },
  { nombre: "Caracol apretado", ...dura(50), forma: { bolas: espiral(0.08, 0.85, 3, 0.085) } },
  { nombre: "Tres islas", ...dura(51), forma: { bolas: islas2([[-0.6, 0], [0, 0], [0.6, 0]], 0.27, 0.09, [[0, 1], [1, 2]]) } },
  { nombre: "Cinco en dado", ...dura(52), forma: { bolas: islas2([[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0, 0]], 0.22, 0.09, [[0, 4], [1, 4], [2, 4], [3, 4]]) } },
  { nombre: "Archipiélago 3×3", ...dura(53), forma: { bolas: islas2([[-0.5, -0.5], [0, -0.5], [0.5, -0.5], [-0.5, 0], [0, 0], [0.5, 0], [-0.5, 0.5], [0, 0.5], [0.5, 0.5]], 0.17, 0.07, [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [7, 8], [0, 3], [3, 6], [1, 4], [4, 7], [2, 5], [5, 8]]) } },
  { nombre: "Isla y satélites", ...dura(54), forma: { bolas: islas2([[0, 0], [0, -0.65], [0.65, 0], [0, 0.65], [-0.65, 0]], 0.2, 0.08, [[0, 1], [0, 2], [0, 3], [0, 4]]) } },
  { nombre: "Diagonal", ...dura(55), forma: { bolas: islas2([[-0.6, -0.6], [-0.3, -0.3], [0, 0], [0.3, 0.3], [0.6, 0.6]], 0.2, 0.09, [[0, 1], [1, 2], [2, 3], [3, 4]]) } },
  { nombre: "Hexágono", ...dura(56), forma: { bolas: [...islas2([[0, 0], ...circulos(6, 0.62, 0).map(([x, y]) => [x, y])], 0.2, 0.08, [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]])] } },
  { nombre: "Puentes en cruz", ...dura(57), forma: { bolas: islas2([[0, 0], [-0.62, 0], [0.62, 0], [0, -0.62], [0, 0.62]], 0.22, 0.09, [[0, 1], [0, 2], [0, 3], [0, 4], [1, 3], [3, 2], [2, 4], [4, 1]]) } },
  { nombre: "Lagos", ...dura(58), forma: { bolas: [[0, 0, 0.95]], huecos: circulos(3, 0.45, 0.22, -PI / 2) } },
  { nombre: "Pasillos", ...dura(59), forma: { bolas: [[0, 0, 0.95]], huecos: pasillos(3, 0.07, 0.45, 0.4) } },
  { nombre: "Laberinto", ...dura(60), forma: { bolas: [[0, 0, 0.95]], huecos: pasillos(4, 0.06, 0.45, 0.5) } },
  { nombre: "Nube", ...dura(61), forma: { bolas: nube(61, 10, 0.2, 0.3) } },
  { nombre: "Nube gris", ...dura(62), forma: { bolas: nube(62, 12, 0.16, 0.28) } },
  { nombre: "Tormenta", ...dura(63), forma: { bolas: nube(63, 14, 0.14, 0.26) } },
  { nombre: "Bahías", ...dura(64), forma: { bolas: [[0, 0, 0.95]], huecos: circulos(10, 0.98, 0.2) } },
  { nombre: "Engranaje", ...dura(65), forma: { polar: [0.76, [14, 0.08, 0]], huecos: [[0, 0, 0.25]] } },
  { nombre: "Estrella de 7", ...dura(66), forma: { bolas: estrellaN(7, 0.85, 0.2, 0.09) } },
  { nombre: "Estrella de 9", ...dura(67), forma: { bolas: estrellaN(9, 0.86, 0.17, 0.08) } },
  { nombre: "Copo de nieve", ...dura(68), forma: { bolas: copo(6, 0.08) } },
  { nombre: "Sierra", ...dura(69), forma: { polar: [0.7, [24, 0.07, 0]] } },
  { nombre: "Flor doble", ...dura(70), forma: { polar: [0.6, [5, 0.15, 0], [10, 0.08, 0]] } },
  { nombre: "Bosque", ...dura(71), forma: { bolas: [[0, 0, 0.95]], huecos: lunares(71, 18, 0.06, 0.1, 0.16, 0.1, 0.82) } },
  { nombre: "Tablero", ...dura(72), forma: { bolas: [[0, 0, 0.95]], huecos: rejilla(4, 0.4, 0.11, 0.85) } },
  { nombre: "Panal", ...dura(73), forma: { bolas: [[0, 0, 0.95]], huecos: panal(0.36, 0.12) } },
  { nombre: "Telaraña", ...dura(74), forma: { bolas: [...anillo(0.3, 0.08), ...anillo(0.62, 0.08), ...rayos(8, 0, 0.9, 0.08), [0, 0, 0.2]] } },
  { nombre: "Reloj de arena", ...dura(75), forma: { bolas: [[0, -0.55, 0.4], [0, 0.55, 0.4], ...cadena(0, -0.3, 0, 0.3, 0.12)] } },
  { nombre: "Mancuerna", ...dura(76), forma: { bolas: [[-0.55, 0, 0.38], [0.55, 0, 0.38], ...cadena(-0.4, 0, 0.4, 0, 0.1)] } },
  { nombre: "Espiral hueca", ...dura(77), forma: { bolas: [[0, 0, 0.95]], huecos: espiral(0.1, 0.78, 1.6, 0.1) } },
  { nombre: "Ciudad", ...dura(78), forma: { bolas: ciudad(3, 0.09) } },
  { nombre: "Árbol grande", ...dura(79), forma: { bolas: [...rama(0, 0.88, -PI / 2, 0.38, 0.08, 4), [0, 0.88, 0.14]] } },
  { nombre: "Rayos", ...dura(80), forma: { polar: [0.55, [8, 0.3, 0]] } },
  { nombre: "Telaraña fina", ...dura(81), forma: { bolas: [...anillo(0.22, 0.075), ...anillo(0.44, 0.075), ...anillo(0.66, 0.075), ...anillo(0.88, 0.075), ...rayos(8, 0, 0.9, 0.075)] } },
  { nombre: "Caracol fino", ...dura(82), forma: { bolas: espiral(0.1, 0.88, 3.6, 0.085) } },
  { nombre: "Laberinto largo", ...dura(83), forma: { bolas: serpentina(7, 0.58, 0.085, 0.74) } },
  { nombre: "Ciudad grande", ...dura(84), forma: { bolas: ciudad(4, 0.08) } },
  { nombre: "Panal pequeño", ...dura(85), forma: { bolas: [[0, 0, 0.95]], huecos: panal(0.3, 0.1) } },
  { nombre: "Bosque denso", ...dura(86), forma: { bolas: [[0, 0, 0.95]], huecos: lunares(86, 30, 0.05, 0.09, 0.14, 0.1, 0.85) } },
  { nombre: "Cuatro islas", ...dura(87), forma: { bolas: islas2([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]], 0.21, 0.085, [[0, 1], [1, 2], [2, 3], [3, 0]]) } },
  { nombre: "Galaxia fina", ...dura(88), forma: { bolas: [...espiral(0.08, 0.85, 2.2, 0.08, 0), ...espiral(0.08, 0.85, 2.2, 0.08, PI)] } },
  { nombre: "Copo grande", ...dura(89), forma: { bolas: copo(8, 0.07) } },
  { nombre: "Árbol frondoso", ...dura(90), forma: { bolas: [...rama(0, 0.88, -PI / 2, 0.34, 0.07, 5), [0, 0.88, 0.14]] } },
  { nombre: "Pulpo gigante", ...dura(91), forma: { bolas: [[0, 0, 0.3], ...rayos(12, 0.2, 0.86, 0.08)] } },
  { nombre: "Estrella de 11", ...dura(92), forma: { bolas: estrellaN(11, 0.88, 0.15, 0.07) } },
  { nombre: "Castillo", ...dura(93), forma: { bolas: [...arco(0, 0, 0.3, 0.6, 2 * PI - 0.6, 0.08), ...arco(0, 0, 0.58, 0.9, 2 * PI + 0.3, 0.08), ...arco(0, 0, 0.85, 0.2, 2 * PI - 0.2, 0.08), ...cadena(0.3, -0.15, 0.58, -0.4, 0.08)] } },
  { nombre: "Pilares apretados", ...dura(94), forma: { bolas: [[0, 0, 0.95]], huecos: rejilla(5, 0.32, 0.1, 0.88) } },
  { nombre: "Camino espiral", ...dura(95), forma: { bolas: [[0, 0, 0.95]], huecos: espiral(0.12, 0.85, 2, 0.1) } },
  { nombre: "Ruleta", ...dura(96), forma: { bolas: [...anillo(0.75, 0.07), ...anillo(0.38, 0.07), ...rayos(10, 0, 0.75, 0.07)] } },
  { nombre: "Constelación", ...dura(97), forma: { bolas: constelacion(97, 8, 0.15, 0.07) } },
  { nombre: "Constelación fina", ...dura(98), forma: { bolas: constelacion(5, 10, 0.13, 0.07) } },
  { nombre: "Gran fortaleza", ...dura(99), forma: { bolas: [[0, 0, 0.95]], huecos: [...circulos(8, 0.7, 0.1), ...circulos(4, 0.35, 0.1, PI / 4), [0, 0, 0.12]] } },
  { nombre: "El gran final", ...dura(100), forma: { bolas: [[0, 0, 0.95]], huecos: lunares(100, 22, 0.06, 0.12, 0.17, 0.1, 0.84) } },
];

// ===== ESCALA DE 10 DIFICULTADES (niveles 200 en adelante; pensada para llegar a ~1000 niveles) =====
// Cada nivel de la escala recibe una dificultad («tier») del 1 (la más suave) al 10 (la más dura), repartidas AL AZAR
// pero de forma pareja: en cada bloque de 10 niveles aparecen las 10 dificultades, una vez cada una y en orden mezclado
// (siempre igual, porque el mezclado usa una semilla fija). Así el juego nunca se vuelve «cada vez más difícil sin parar»:
// un nivel 700 puede ser tier 2 y el 701 tier 9.
// Todos los tiers son superables: veloz ≤ 0.1, giro ≤ 0.4, meta ≤ 42 % y como máximo 7 bots (los topes que pide la guía de arriba).
//
// Cómo agregar niveles a la escala: añade una línea  escala(k, "Nombre", { forma })  y el «tier» se calcula solo.
//   k = posición dentro de la escala (0 = primer nivel de la escala, 1 = segundo, ...). Para ajustar un tier, edita TIERS.
// El nivel 200 es el primero de la escala (k = 0). Los niveles 101 a 199 se agregan ANTES de este bloque (aún no existen,
// así que por ahora las pruebas quedan a continuación del 100 y pasarán a ser el 200+ cuando los agregues).
const NIVEL_INICIO_ESCALA = 200;
const TIERS = [ // índice 0 = tier 1 ... índice 9 = tier 10
  { bots: 4, meta: 28, dificultad: 0.45, rasgos: { mordisco: 0.3, venganza: 0.2, acoso: 0.2, veloz: 0,    giro: 0 } },
  { bots: 5, meta: 30, dificultad: 0.55, rasgos: { mordisco: 0.4, venganza: 0.3, acoso: 0.3, veloz: 0,    giro: 0.05 } },
  { bots: 5, meta: 31, dificultad: 0.62, rasgos: { mordisco: 0.5, venganza: 0.4, acoso: 0.4, veloz: 0.02, giro: 0.1 } },
  { bots: 6, meta: 33, dificultad: 0.7,  rasgos: { mordisco: 0.6, venganza: 0.5, acoso: 0.5, veloz: 0.03, giro: 0.15 } },
  { bots: 6, meta: 34, dificultad: 0.78, rasgos: { mordisco: 0.7, venganza: 0.6, acoso: 0.6, veloz: 0.05, giro: 0.2 } },
  { bots: 7, meta: 36, dificultad: 0.85, rasgos: { mordisco: 0.8, venganza: 0.7, acoso: 0.7, veloz: 0.06, giro: 0.25 } },
  { bots: 7, meta: 37, dificultad: 0.9,  rasgos: { mordisco: 0.9, venganza: 0.8, acoso: 0.8, veloz: 0.07, giro: 0.3 } },
  { bots: 7, meta: 39, dificultad: 0.95, rasgos: { mordisco: 1,   venganza: 0.9, acoso: 0.9, veloz: 0.08, giro: 0.33 } },
  { bots: 7, meta: 40, dificultad: 1,    rasgos: { mordisco: 1,   venganza: 1,   acoso: 1,   veloz: 0.09, giro: 0.37 } },
  { bots: 7, meta: 42, dificultad: 1,    rasgos: { mordisco: 1,   venganza: 1,   acoso: 1,   veloz: 0.1,  giro: 0.4 } },
];
// Orden mezclado de las 10 dificultades dentro del bloque «b» (semilla fija por bloque)
const bloquesTier = [];
function barajaBloque(b) {
  if (bloquesTier[b]) return bloquesTier[b];
  const az = azar(7919 + b * 104729), p = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = p.length - 1; i > 0; i--) { const j = (az() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  if (b > 0 && p[0] === barajaBloque(b - 1)[9]) [p[0], p[1]] = [p[1], p[0]]; // no repetir la misma dificultad al cambiar de bloque
  return (bloquesTier[b] = p);
}
// Dificultad (1 a 10) del nivel k de la escala
export function tierDe(k) { return barajaBloque((k / 10) | 0)[k % 10]; }
function escala(k, nombre, forma) {
  const tier = tierDe(k), t = TIERS[tier - 1];
  return { nombre, tier, bots: t.bots, meta: t.meta, dificultad: t.dificultad, rasgos: { ...t.rasgos }, forma };
}

// ----- 10 niveles de prueba de la escala (k = 0 a 9; el tier de cada uno sale de tierDe) -----
NIVELES.push(
  escala(0, "Cuatro pétalos",   { polar: [0.62, [4, 0.25, 0]] }),
  escala(1, "Anillo de islas",  { bolas: [...circulos(5, 0.6, 0.2), ...anillo(0.6, 0.07)] }),
  escala(2, "Lunares",          { bolas: [[0, 0, 0.95]], huecos: lunares(201, 12, 0.07, 0.12, 0.15) }),
  escala(3, "Zigzag doble",     { bolas: serpentina(5, 0.6, 0.1, 0.7) }),
  escala(4, "Cruz gruesa",      { bolas: [...cadena(-0.8, 0, 0.8, 0, 0.2), ...cadena(0, -0.8, 0, 0.8, 0.2), [0, 0, 0.32]] }),
  escala(5, "Diamante hueco",   { bolas: rombo(0.85, 0.1), huecos: [[0, 0, 0.25]] }),
  escala(6, "Triple galaxia",   { bolas: [0, 1, 2].flatMap((q) => espiral(0.08, 0.82, 1.4, 0.09, q * 2 * PI / 3)) }),
  escala(7, "Calles estrechas", { bolas: [[0, 0, 0.95]], huecos: pasillos(3, 0.07, 0.45, 0.4) }),
  escala(8, "Constelación 7",   { bolas: constelacion(210, 7, 0.15, 0.07) }),
  escala(9, "Corona de espinas",{ polar: [0.78, [12, 0.1, 0]], huecos: [[0, 0, 0.3]] }),
);

// ----- 100 niveles más de la escala (k = 10 a 109) -----
// Diez «familias» de mapas (flores, estrellas, ruedas, islas, pilares, nubes, espirales, árboles, serpientes, copos/engranajes)
// con variaciones; se intercalan una de cada familia para que no salgan seguidas formas parecidas.
// La dificultad de cada uno la reparte tierDe() al azar, igual que en las pruebas.
function mapasExtra() {
  const A = [], B = [], C = [], D = [], E = [], F = [], G = [], H = [], I = [], J = [];
  for (const n of [3, 7, 9, 10, 11, 13, 14, 15, 16, 18]) A.push([`Flor de ${n} pétalos`, { polar: [0.7, [n, n <= 10 ? 0.2 : 0.12, 0]] }]);
  for (const k of [6, 8, 10, 13, 14]) B.push([`Estrella de ${k} puntas`, { bolas: estrellaN(k, 0.86, 0.2, 0.08) }]);
  for (const k of [5, 6, 7, 8, 9]) B.push([`Estrella gorda de ${k} puntas`, { bolas: estrellaN(k, 0.84, 0.27, 0.13) }]);
  for (const k of [3, 4, 5, 7, 8, 9, 10, 12]) C.push([`Rueda de ${k} rayos`, { bolas: [...anillo(0.72, 0.1), ...rayos(k, 0, 0.72, 0.1), [0, 0, 0.2]] }]);
  for (const k of [6, 8]) C.push([`Rueda doble de ${k} rayos`, { bolas: [...anillo(0.42, 0.09), ...anillo(0.8, 0.09), ...rayos(k, 0, 0.8, 0.09), [0, 0, 0.2]] }]);
  for (const n of [3, 4, 5, 7, 8]) {
    const r = n <= 5 ? 0.22 : n === 7 ? 0.17 : 0.15, d = n <= 5 ? 0.6 : 0.65;
    D.push([`Corona de ${n} islas`, { bolas: [...circulos(n, d, r), ...anillo(d, 0.07)] }]);
  }
  for (const n of [3, 5, 6, 7, 8]) {
    const pts = [[0, 0], ...circulos(n, 0.65, 0).map(([x, y]) => [x, y])];
    D.push([`Isla con ${n} satélites`, { bolas: islas2(pts, 0.2, 0.08, pts.slice(1).map((_, i) => [0, i + 1])) }]);
  }
  for (const [n, r] of [[3, 0.2], [5, 0.15], [6, 0.14], [7, 0.13], [9, 0.11], [10, 0.1]]) E.push([`${n} pilares`, { bolas: [[0, 0, 0.95]], huecos: circulos(n, 0.6, r) }]);
  for (const [s, c] of [[111, 8], [112, 10], [113, 12], [114, 14]]) E.push([`Queso de ${c} huecos`, { bolas: [[0, 0, 0.95]], huecos: lunares(s, c, 0.07, 0.13, 0.15) }]);
  for (const [s, n] of [[120, 9], [121, 10], [122, 11], [123, 12], [124, 13]]) F.push([`Nube de ${n} bolas`, { bolas: nube(s, n, 0.18, 0.28) }]);
  for (const [s, n] of [[130, 6], [131, 7], [132, 8], [133, 9], [134, 10]]) F.push([`Constelación de ${n} islas`, { bolas: constelacion(s, n, 0.15, 0.07) }]);
  for (const n of [2, 4, 5, 6]) G.push([`Galaxia de ${n} brazos`, { bolas: [...Array(n).keys()].flatMap((q) => espiral(0.08, 0.82, n <= 2 ? 1.6 : 1.1, 0.09, q * 2 * PI / n)) }]);
  for (const v of [1.5, 2, 2.7]) G.push([`Caracol de ${v} vueltas`, { bolas: espiral(0.1, 0.86, v, 0.09) }]);
  for (const v of [1.2, 1.5, 1.8]) G.push([`Espiral hueca de ${v} vueltas`, { bolas: [[0, 0, 0.95]], huecos: espiral(0.12, 0.85, v, 0.1) }]);
  for (const [prof, L, r, nom] of [[2, 0.5, 0.1, "Arbusto"], [3, 0.4, 0.09, "Árbol joven"], [4, 0.36, 0.08, "Árbol alto"], [5, 0.32, 0.07, "Roble"]])
    H.push([nom, { bolas: [...rama(0, 0.88, -PI / 2, L, r, prof), [0, 0.88, 0.15]] }]);
  for (const [prof, nom] of [[3, "Helecho"], [4, "Helecho grande"]]) H.push([nom, { bolas: [...rama(-0.88, 0, 0, 0.4, 0.08, prof), [-0.88, 0, 0.15]] }]);
  for (const [prof, nom] of [[3, "Raíces"], [4, "Raíces largas"], [5, "Raíces de roble"]]) H.push([nom, { bolas: [...rama(0, -0.88, PI / 2, 0.36, 0.08, prof), [0, -0.88, 0.15]] }]);
  H.push(["Rama diagonal", { bolas: rama(-0.7, 0.7, -PI / 4, 0.4, 0.09, 4) }]);
  for (const n of [3, 4, 5, 6, 7, 8]) I.push([`Serpiente de ${n} tramos`, { bolas: serpentina(n, 0.58, n <= 5 ? 0.11 : n < 8 ? 0.09 : 0.08, 0.7) }]);
  for (const [n, r, nom] of [[2, 0.14, "Cruz de calles"], [3, 0.11, "Barrio"], [5, 0.065, "Metrópolis"]]) I.push([nom, { bolas: ciudad(n, r) }]);
  I.push(["Peine fino", { bolas: [...cadena(-0.7, -0.7, -0.7, 0.7, 0.12), ...[-0.5, -0.17, 0.17, 0.5].flatMap((y) => cadena(-0.7, y, 0.7, y, 0.1))] }]);
  for (const k of [4, 5, 7, 9, 10]) J.push([`Copo de ${k} brazos`, { bolas: copo(k, 0.08) }]);
  for (const n of [8, 10, 12, 16, 18]) J.push([`Engranaje de ${n} dientes`, { polar: [0.76, [n, 0.08, 0]], huecos: [[0, 0, 0.25]] }]);
  const fam = [A, B, C, D, E, F, G, H, I, J], salida = [];
  for (let i = 0; i < 10; i++) for (const f of fam) salida.push(f[i]);
  return salida;
}
mapasExtra().forEach(([nombre, forma], i) => NIVELES.push(escala(10 + i, nombre, forma)));

// ===== AJUSTE FINAL: niveles activos y meta =====
// Mientras se afina el juego solo están activos los primeros NIVELES_ACTIVOS niveles (los demás siguen definidos arriba, no se borraron).
// Para volver a activarlos todos, sube este número (por ejemplo a NIVELES.length o 1000).
const NIVELES_ACTIVOS = 10;
// Meta común de todos los niveles activos: % del mapa que hay que conquistar para pasar.
const META_GLOBAL = 90;
NIVELES.length = Math.min(NIVELES.length, NIVELES_ACTIVOS);
for (const nv of NIVELES) nv.meta = META_GLOBAL;

// ----- Convierte una «forma» en una función (u, v) → ¿está dentro del mapa? -----
const K = 1.6;                         // alcance de cada gota respecto a su radio
const UMBRAL = Math.pow(1 - 1 / (K * K), 2);
function campo(lista) {
  const bs = lista.map(([x, y, r]) => ({ x, y, R2: r * K * (r * K) }));
  return (u, v) => {
    let s = 0;
    for (const b of bs) {
      const dx = u - b.x, dy = v - b.y, d2 = dx * dx + dy * dy;
      if (d2 < b.R2) { const q = 1 - d2 / b.R2; s += q * q; }
    }
    return s >= UMBRAL;
  };
}
export function crearForma(forma) {
  let base;
  if (forma.polar) {
    const [r0, ...ondas] = forma.polar;
    base = (u, v) => {
      const a = Math.atan2(v, u);
      let r = r0;
      for (const [k, h, g] of ondas) r += h * Math.cos(k * a + g);
      return Math.hypot(u, v) < r;
    };
  } else base = campo(forma.bolas || [[0, 0, 0.95]]);
  const huecos = forma.huecos && forma.huecos.length ? campo(forma.huecos) : null;
  return (u, v) => u * u + v * v < 1 && base(u, v) && !(huecos && huecos(u, v));
}
