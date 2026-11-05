// Ruta: paperio/niveles.js
// Niveles de «Paperio». Cada nivel es solo un objeto con datos; para agregar uno nuevo, añade otro al final de NIVELES.
//
//   { nombre: "Trébol", bots: 3, meta: 20, forma: { ... } }
//     nombre → se muestra en el selector de niveles
//     bots   → cuántos rivales (1 a 7)
//     meta   → % del mapa que hay que conquistar para pasar de nivel
//     dificultad (opcional, 0 a 1) → qué tan agresivos son los bots: atacan tu estela, rondan tu zona y defienden la suya.
//                                     Si no la pones, sube sola con el número de nivel (0.4 en el primero, 1 desde el nivel 9).
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
function cadena(x1, y1, x2, y2, r, paso = 0.1) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / paso)), l = [];
  for (let i = 0; i <= n; i++) l.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n, r]);
  return l;
}
// Gotas a lo largo de una espiral: de radio r0 a r1 dando «vueltas» vueltas
function espiral(r0, r1, vueltas, r, giro = 0) {
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
];

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
