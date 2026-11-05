// Ruta: fichas/piezas-fichas.js
// Dibujos de las fichas y fondos del juego «Fichas de frutas». Todo se dibuja en canvas (sin archivos).
//
// TUS PROPIAS IMÁGENES (opcional):
//  - Piezas: pon un archivo por pieza en la carpeta  fichas/piezas/  con el id de la lista ICONOS
//    (por ejemplo  fresa.png  o  fresa.webp). Mejor cuadradas, con fondo transparente (unos 256×256 px).
//    Si existe el archivo, se usa en lugar del dibujo; si no, se usa el dibujo de aquí.
//  - Fondos: pon  fondo1.webp (o .jpg/.png) … fondo4  en  fichas/fondos/  (1 playa, 2 atardecer, 3 pradera, 4 noche).
//    Mejor verticales (por ejemplo 800×1440 px).
export const USAR_IMAGENES_PROPIAS = true;
const CARPETA_PIEZAS = "piezas/";
const CARPETA_FONDOS = "fondos/";

const TAU = Math.PI * 2;
const CONTORNO = "rgba(70,20,20,.38)";

// ---------- ayudas de dibujo (todo en una cuadrícula de 100×100) ----------
function degradado(c, x0, y0, x1, y1, paradas) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  paradas.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}
function radial(c, x, y, r, paradas, fx = x, fy = y) {
  const g = c.createRadialGradient(fx, fy, 0, x, y, r);
  paradas.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}
function trazo(c, col = CONTORNO, ancho = 2.5) {
  c.strokeStyle = col;
  c.lineWidth = ancho;
  c.lineJoin = "round";
  c.stroke();
}
function elipse(c, x, y, rx, ry, relleno, rot = 0, borde = null) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, TAU);
  c.fillStyle = relleno;
  c.fill();
  if (borde) trazo(c, borde);
}
function brillo(c, x, y, rx, ry, rot = 0) {
  elipse(c, x, y, rx, ry, "rgba(255,255,255,.6)", rot);
}
function hoja(c, x, y, largo, ang, col1 = "#7bd94a", col2 = "#2f9a2a") {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(largo * 0.5, -largo * 0.42, largo, 0);
  c.quadraticCurveTo(largo * 0.5, largo * 0.42, 0, 0);
  c.fillStyle = degradado(c, 0, 0, largo, 0, [[0, col1], [1, col2]]);
  c.fill();
  trazo(c, "rgba(0,60,0,.35)", 1.5);
  c.restore();
}

// ---------- las piezas ----------
function fresa(c) {
  c.beginPath();
  c.moveTo(50, 93);
  c.bezierCurveTo(16, 72, 12, 40, 29, 31);
  c.bezierCurveTo(39, 26, 46, 29, 50, 34);
  c.bezierCurveTo(54, 29, 61, 26, 71, 31);
  c.bezierCurveTo(88, 40, 84, 72, 50, 93);
  c.closePath();
  c.fillStyle = radial(c, 50, 60, 48, [[0, "#ff7a7a"], [0.6, "#e4242c"], [1, "#b3121f"]], 40, 45);
  c.fill();
  trazo(c);
  [[34, 44], [50, 48], [66, 44], [28, 58], [42, 62], [58, 62], [72, 58], [38, 76], [50, 78], [62, 76]]
    .forEach(([x, y]) => elipse(c, x, y, 2.6, 3.8, "#ffe38a"));
  [[-2.8, 20], [-2.2, 22], [-1.57, 24], [-0.95, 22], [-0.35, 20]].forEach(([a, l]) => hoja(c, 50, 32, l, a));
  brillo(c, 33, 48, 5, 10, 0.5);
}

function cereza(c) {
  c.strokeStyle = "#5e8a2b";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(30, 66); c.quadraticCurveTo(34, 30, 56, 12); c.stroke();
  c.beginPath(); c.moveTo(70, 62); c.quadraticCurveTo(62, 28, 56, 12); c.stroke();
  hoja(c, 56, 12, 26, 0.3);
  [[30, 70], [70, 66]].forEach(([x, y]) => {
    elipse(c, x, y, 21, 21, radial(c, x, y, 26, [[0, "#ff6a6a"], [0.65, "#d3141f"], [1, "#8f0b17"]], x - 6, y - 7), 0, CONTORNO);
    brillo(c, x - 8, y - 8, 5, 8, 0.6);
  });
}

function sandia(c) {
  const cx = 50, cy = 27;
  const semi = (r, relleno) => {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI); c.closePath(); c.fillStyle = relleno; c.fill();
  };
  semi(46, "#2f9a3a");
  semi(41, "#dff5b0");
  semi(37, radial(c, 50, 40, 46, [[0, "#ff7a86"], [1, "#e0243a"]]));
  c.beginPath(); c.arc(cx, cy, 46, 0, Math.PI); c.closePath(); trazo(c);
  [[34, 40], [50, 48], [66, 40], [42, 58], [58, 58]].forEach(([x, y]) => elipse(c, x, y, 3, 5, "#2b1b1b", 0.3));
  brillo(c, 28, 36, 6, 2.5, 0.5);
}

function zanahoria(c) {
  c.save();
  c.translate(52, 54);
  c.rotate(0.65);
  [[-1.57, 26], [-2.2, 22], [-0.95, 22]].forEach(([a, l]) => hoja(c, 0, -30, l, a));
  c.beginPath();
  c.moveTo(-16, -32); c.lineTo(16, -32);
  c.quadraticCurveTo(18, -30, 15, -8);
  c.quadraticCurveTo(8, 24, 0, 44);
  c.quadraticCurveTo(-8, 24, -15, -8);
  c.quadraticCurveTo(-18, -30, -16, -32);
  c.closePath();
  c.fillStyle = degradado(c, -16, 0, 16, 0, [[0, "#ffb04a"], [0.5, "#ff8a1f"], [1, "#e8650c"]]);
  c.fill();
  trazo(c);
  c.strokeStyle = "rgba(150,60,0,.45)";
  c.lineWidth = 2;
  [[-14, 9], [0, 9], [14, 6]].forEach(([y, l]) => { c.beginPath(); c.moveTo(-l, y); c.lineTo(-l + 8, y + 1); c.stroke(); });
  brillo(c, -8, -14, 2.5, 9, 0);
  c.restore();
}

function uvas(c) {
  c.strokeStyle = "#6b4a2b";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(50, 26); c.lineTo(52, 12); c.stroke();
  [[50, 74], [39, 57], [61, 57], [28, 40], [50, 40], [72, 40]].forEach(([x, y]) => {
    elipse(c, x, y, 13, 13, radial(c, x, y, 15, [[0, "#c892ff"], [0.6, "#7b3fe4"], [1, "#4a1fa8"]], x - 4, y - 5), 0, "rgba(40,10,90,.4)");
    brillo(c, x - 5, y - 5, 3, 4.5, 0.6);
  });
  hoja(c, 52, 16, 30, -0.25);
}

function limon(c) {
  c.save();
  c.translate(50, 54);
  c.rotate(-0.5);
  c.beginPath();
  c.moveTo(-44, 0);
  c.quadraticCurveTo(-30, -32, 0, -32);
  c.quadraticCurveTo(30, -32, 44, 0);
  c.quadraticCurveTo(30, 32, 0, 32);
  c.quadraticCurveTo(-30, 32, -44, 0);
  c.closePath();
  c.fillStyle = degradado(c, 0, -32, 0, 32, [[0, "#fff58a"], [0.6, "#ffd92e"], [1, "#e8b400"]]);
  c.fill();
  trazo(c, "rgba(120,80,0,.4)");
  brillo(c, -14, -14, 13, 4, 0);
  hoja(c, 6, -30, 24, -0.6);
  c.restore();
}

function manzana(c) {
  c.beginPath();
  c.moveTo(50, 32);
  c.bezierCurveTo(40, 22, 12, 26, 12, 56);
  c.bezierCurveTo(12, 80, 32, 94, 44, 90);
  c.quadraticCurveTo(50, 88, 56, 90);
  c.bezierCurveTo(68, 94, 88, 80, 88, 56);
  c.bezierCurveTo(88, 26, 60, 22, 50, 32);
  c.closePath();
  c.fillStyle = radial(c, 50, 58, 50, [[0, "#ff7a6a"], [0.6, "#e22a2a"], [1, "#a50f1d"]], 38, 48);
  c.fill();
  trazo(c);
  c.strokeStyle = "#6b3f1d";
  c.lineWidth = 5;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(50, 32); c.quadraticCurveTo(50, 20, 56, 12); c.stroke();
  hoja(c, 53, 22, 26, -0.5);
  brillo(c, 29, 50, 5, 12, 0.3);
}

function platano(c) {
  c.beginPath();
  c.moveTo(24, 22);
  c.bezierCurveTo(26, 82, 72, 98, 90, 50);
  c.bezierCurveTo(70, 72, 44, 68, 38, 20);
  c.closePath();
  c.fillStyle = degradado(c, 20, 20, 90, 90, [[0, "#fff07a"], [0.55, "#ffd430"], [1, "#e0a000"]]);
  c.fill();
  trazo(c, "rgba(110,70,0,.45)");
  c.strokeStyle = "rgba(190,130,0,.45)";
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(34, 30); c.bezierCurveTo(40, 66, 66, 80, 82, 58); c.stroke();
  c.fillStyle = "#7a4a1d";
  c.beginPath(); c.moveTo(23, 22); c.lineTo(39, 20); c.lineTo(38, 11); c.lineTo(25, 12); c.closePath(); c.fill();
  elipse(c, 89, 50, 3.5, 3.5, "#5a3414");
  brillo(c, 36, 58, 3, 14, -0.6);
}

function naranja(c) {
  elipse(c, 50, 56, 36, 34, radial(c, 50, 56, 42, [[0, "#ffc860"], [0.6, "#ff8f1a"], [1, "#d9640a"]], 40, 46), 0, CONTORNO);
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4, r = 8 + (i % 5) * 6;
    elipse(c, 50 + Math.cos(a) * r, 58 + Math.sin(a) * r * 0.9, 1.2, 1.2, "rgba(190,80,0,.35)");
  }
  brillo(c, 33, 42, 6, 11, 0.7);
  hoja(c, 52, 24, 26, -0.25);
  elipse(c, 50, 23, 4, 3, "#5a8a2a");
}

function rayo(c) {
  c.beginPath();
  c.moveTo(60, 6); c.lineTo(20, 54); c.lineTo(44, 54); c.lineTo(34, 94); c.lineTo(82, 36); c.lineTo(56, 36); c.lineTo(74, 6);
  c.closePath();
  c.fillStyle = degradado(c, 20, 6, 80, 94, [[0, "#fff27a"], [0.5, "#ffc400"], [1, "#ff8a00"]]);
  c.fill();
  trazo(c, "#b8620a", 4);
  c.strokeStyle = "rgba(255,255,255,.75)";
  c.lineWidth = 3;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(60, 14); c.lineTo(32, 50); c.stroke();
}

function llama(c) {
  c.beginPath();
  c.moveTo(50, 6);
  c.bezierCurveTo(58, 26, 84, 38, 82, 64);
  c.bezierCurveTo(80, 86, 64, 94, 50, 94);
  c.bezierCurveTo(34, 94, 18, 86, 18, 64);
  c.bezierCurveTo(18, 48, 32, 42, 38, 26);
  c.bezierCurveTo(42, 36, 46, 24, 50, 6);
  c.closePath();
}
function fuego(c) {
  llama(c);
  c.fillStyle = degradado(c, 0, 6, 0, 94, [[0, "#ffb02e"], [0.5, "#ff6a1a"], [1, "#e02a12"]]);
  c.fill();
  trazo(c, "rgba(120,20,0,.4)");
  c.save();
  c.translate(50, 92);
  c.scale(0.55, 0.55);
  c.translate(-50, -92);
  llama(c);
  c.fillStyle = degradado(c, 0, 20, 0, 94, [[0, "#fff6a0"], [1, "#ffc21a"]]);
  c.fill();
  c.restore();
}

function copo(c) {
  c.save();
  c.translate(50, 50);
  const brazos = (col, ancho) => {
    c.strokeStyle = col;
    c.lineWidth = ancho;
    c.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(0, -40);
      c.moveTo(0, -26); c.lineTo(-11, -37);
      c.moveTo(0, -26); c.lineTo(11, -37);
      c.moveTo(0, -14); c.lineTo(-7, -21);
      c.moveTo(0, -14); c.lineTo(7, -21);
      c.stroke();
      c.restore();
    }
  };
  brazos("#2f8fd8", 11);
  brazos("#c4ecff", 6);
  elipse(c, 0, 0, 7, 7, "#e8f8ff", 0, "#2f8fd8");
  c.restore();
}

function pera(c) {
  c.beginPath();
  c.moveTo(50, 14);
  c.bezierCurveTo(66, 14, 64, 38, 72, 52);
  c.bezierCurveTo(90, 74, 78, 94, 50, 94);
  c.bezierCurveTo(22, 94, 10, 74, 28, 52);
  c.bezierCurveTo(36, 38, 34, 14, 50, 14);
  c.closePath();
  c.fillStyle = radial(c, 50, 62, 44, [[0, "#eef77a"], [0.6, "#b4d338"], [1, "#7fa51f"]], 42, 56);
  c.fill();
  trazo(c, "rgba(40,80,0,.4)");
  c.strokeStyle = "#6b4a2b";
  c.lineWidth = 4;
  c.lineCap = "round";
  c.beginPath(); c.moveTo(50, 16); c.quadraticCurveTo(52, 10, 56, 5); c.stroke();
  hoja(c, 53, 12, 24, -0.2);
  brillo(c, 36, 66, 5, 12, 0.3);
}

function arandanos(c) {
  [[34, 62, 22], [68, 60, 21], [51, 36, 20]].forEach(([x, y, r]) => {
    elipse(c, x, y, r, r, radial(c, x, y, r + 4, [[0, "#8aa6ff"], [0.6, "#3a54d6"], [1, "#1f2c8f"]], x - 6, y - 8), 0, "rgba(10,20,80,.45)");
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 ? 3 : 7, a = (k * Math.PI) / 5 - Math.PI / 2;
      c.lineTo(x + Math.cos(a) * rr, y - 3 + Math.sin(a) * rr);
    }
    c.closePath();
    c.fillStyle = "#1b2468";
    c.fill();
    brillo(c, x - 9, y - 10, 3.5, 5.5, 0.6);
  });
}

// id = nombre del archivo de imagen propia (piezas/<id>.png o .webp); color = color de las chispas
export const ICONOS = [
  { id: "fresa", color: "#ff3b4a", dibujar: fresa },
  { id: "cereza", color: "#e0243a", dibujar: cereza },
  { id: "sandia", color: "#ff4d6a", dibujar: sandia },
  { id: "zanahoria", color: "#ff8a1f", dibujar: zanahoria },
  { id: "uvas", color: "#8a4be0", dibujar: uvas },
  { id: "limon", color: "#ffd92e", dibujar: limon },
  { id: "manzana", color: "#e22a2a", dibujar: manzana },
  { id: "platano", color: "#ffd84a", dibujar: platano },
  { id: "naranja", color: "#ff9a1a", dibujar: naranja },
  { id: "rayo", color: "#ffc400", dibujar: rayo },
  { id: "fuego", color: "#ff6a1a", dibujar: fuego },
  { id: "copo", color: "#6fd0ff", dibujar: copo },
  { id: "pera", color: "#b4d338", dibujar: pera },
  { id: "arandanos", color: "#4a64e6", dibujar: arandanos },
];

// Pinta cada dibujo una sola vez en su propio canvas (después solo se copian)
export function crearSprites(px = 128) {
  return ICONOS.map((ic) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = px;
    const c = cv.getContext("2d");
    c.scale(px / 100, px / 100);
    c.lineJoin = "round";
    c.lineCap = "round";
    ic.dibujar(c);
    return cv;
  });
}

// Si existe piezas/<id>.png|webp, reemplaza el dibujo (sprites[i]) por esa imagen
export function cargarImagenesPropias(sprites, alCargar) {
  if (!USAR_IMAGENES_PROPIAS) return;
  const EXT = ["png", "webp"];
  const probar = (i, k) => {
    if (k >= EXT.length) return;
    const im = new Image();
    im.onload = () => { sprites[i] = im; if (alCargar) alCargar(i); };
    im.onerror = () => probar(i, k + 1);
    im.src = CARPETA_PIEZAS + ICONOS[i].id + "." + EXT[k];
  };
  ICONOS.forEach((_, i) => probar(i, 0));
}

// Si existe fondos/fondo1..4 (.webp/.jpg/.png), reemplaza el fondo dibujado
export function cargarFondosPropios(alCargar) {
  if (!USAR_IMAGENES_PROPIAS) return;
  const EXT = ["webp", "jpg", "png"];
  const probar = (i, k) => {
    if (k >= EXT.length) return;
    const im = new Image();
    im.onload = () => alCargar(i, im);
    im.onerror = () => probar(i, k + 1);
    im.src = CARPETA_FONDOS + "fondo" + (i + 1) + "." + EXT[k];
  };
  for (let i = 0; i < 4; i++) probar(i, 0);
}

// ---------- fondos ----------
function azarFijo(semilla) {
  let s = semilla >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function nube(c, x, y, e, col) {
  c.fillStyle = col;
  [[0, 0, 22], [24, -10, 28], [54, -2, 22], [28, 8, 24], [-10, 8, 16], [64, 8, 14]].forEach(([dx, dy, r]) => {
    c.beginPath(); c.arc(x + dx * e, y + dy * e, r * e, 0, TAU); c.fill();
  });
}

const PALETAS = [
  { cielo: ["#4aa0ee", "#9fd4ff", "#d6efff"], sol: { x: 0.82, y: 0.14, r: 46, col: "rgba(255,246,196,.95)" }, mar: ["#37c3dd", "#1b87bd"], arena: ["#f1d49a", "#d3a566"], pasto: ["#8cc152", "#5f9a36"], espuma: "255,255,255", nubes: "rgba(255,255,255,.93)", estrellas: false, hz: 0.43 },
  { cielo: ["#ff8a5c", "#ffc07a", "#ffe7b8"], sol: { x: 0.68, y: 0.35, r: 72, col: "rgba(255,226,140,.95)" }, mar: ["#d86fa6", "#7a4a9e"], arena: ["#e9b87e", "#b9824f"], pasto: ["#8aa845", "#5f7d34"], espuma: "255,240,225", nubes: "rgba(255,214,190,.9)", estrellas: false, hz: 0.46 },
  { pradera: true },
  { cielo: ["#0b1a3a", "#1b3a6d", "#2e5a94"], sol: { x: 0.8, y: 0.13, r: 34, col: "rgba(240,244,255,.95)" }, mar: ["#1c5a8a", "#0e2f5a"], arena: ["#a9946a", "#7d6a47"], pasto: ["#3d6b3a", "#254a2b"], espuma: "200,225,255", nubes: "rgba(120,150,200,.5)", estrellas: true, hz: 0.43 },
];

function terreno(c, W, H) {
  c.moveTo(W, H * 0.5);
  c.bezierCurveTo(W * 0.82, H * 0.55, W * 0.66, H * 0.66, W * 0.6, H * 0.78);
  c.bezierCurveTo(W * 0.55, H * 0.88, W * 0.42, H * 0.94, W * 0.34, H);
}

function escenaPlaya(c, W, H, P) {
  const hz = H * P.hz;
  c.fillStyle = degradado(c, 0, 0, 0, hz + 10, [[0, P.cielo[0]], [0.6, P.cielo[1]], [1, P.cielo[2]]]);
  c.fillRect(0, 0, W, hz + 10);
  if (P.estrellas) {
    const a = azarFijo(5);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = "rgba(255,255,255," + (0.4 + a() * 0.6).toFixed(2) + ")";
      c.beginPath(); c.arc(a() * W, a() * hz * 0.9, 0.6 + a() * 1.3, 0, TAU); c.fill();
    }
  }
  const s = P.sol;
  c.fillStyle = radial(c, s.x * W, s.y * H, s.r * 2.4, [[0, "rgba(255,255,230,.7)"], [1, "rgba(255,255,230,0)"]]);
  c.fillRect(0, 0, W, hz);
  c.beginPath(); c.arc(s.x * W, s.y * H, s.r, 0, TAU); c.fillStyle = s.col; c.fill();
  [[0.1, 0.09, 1], [0.52, 0.17, 0.8], [0.88, 0.06, 0.7], [0.28, 0.3, 0.55]].forEach(([x, y, e]) => nube(c, x * W, y * H, e, P.nubes));
  // colinas lejanas
  c.fillStyle = P.pasto[1];
  c.globalAlpha = 0.5;
  c.beginPath();
  c.moveTo(0, hz + 4);
  c.bezierCurveTo(W * 0.2, hz - 22, W * 0.4, hz - 6, W * 0.6, hz - 18);
  c.bezierCurveTo(W * 0.8, hz - 28, W * 0.9, hz - 6, W, hz - 12);
  c.lineTo(W, hz + 4);
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
  // mar
  c.fillStyle = degradado(c, 0, hz, 0, H, [[0, P.mar[0]], [1, P.mar[1]]]);
  c.fillRect(0, hz, W, H - hz);
  const a = azarFijo(11);
  c.lineCap = "round";
  for (let i = 0; i < 46; i++) {
    const y = hz + 12 + a() * (H - hz - 12), x = a() * W, w = 10 + a() * 28;
    c.strokeStyle = "rgba(255,255,255," + (0.12 + a() * 0.18).toFixed(2) + ")";
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke();
  }
  // tierra: arena y pasto
  c.save();
  c.beginPath(); terreno(c, W, H); c.lineTo(W, H); c.closePath(); c.clip();
  c.fillStyle = degradado(c, W, H * 0.5, W * 0.4, H, [[0, P.arena[0]], [1, P.arena[1]]]);
  c.fillRect(0, 0, W, H);
  elipse(c, W * 0.92, H * 0.58, W * 0.34, H * 0.09, degradado(c, 0, H * 0.5, 0, H * 0.68, [[0, P.pasto[0]], [1, P.pasto[1]]]));
  elipse(c, W * 0.78, H * 0.66, W * 0.18, H * 0.04, P.pasto[1]);
  elipse(c, W * 0.8, H * 0.86, W * 0.2, H * 0.05, "rgba(255,255,255,.12)");
  c.restore();
  // espuma en la orilla
  c.beginPath(); terreno(c, W, H);
  c.strokeStyle = "rgba(" + P.espuma + ",.35)"; c.lineWidth = 14; c.stroke();
  c.strokeStyle = "rgba(" + P.espuma + ",.9)"; c.lineWidth = 5; c.stroke();
}

function escenaPradera(c, W, H) {
  c.fillStyle = degradado(c, 0, 0, 0, H * 0.6, [[0, "#5fb0f2"], [1, "#d8f0ff"]]);
  c.fillRect(0, 0, W, H);
  c.beginPath(); c.arc(W * 0.8, H * 0.12, 42, 0, TAU); c.fillStyle = "rgba(255,246,196,.95)"; c.fill();
  [[0.12, 0.1, 1], [0.55, 0.18, 0.8], [0.85, 0.3, 0.6]].forEach(([x, y, e]) => nube(c, x * W, y * H, e, "rgba(255,255,255,.93)"));
  [[0.46, 14, 0.012, 0, ["#9fd16a", "#6fae45"]], [0.56, 18, 0.018, 2, ["#86c553", "#5b9a37"]], [0.68, 22, 0.014, 4, ["#6fb440", "#478a2b"]], [0.82, 16, 0.02, 1, ["#5aa233", "#357a22"]]]
    .forEach(([base, amp, frec, fase, cols]) => {
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) c.lineTo(x, H * base + Math.sin(x * frec * 3 + fase) * amp);
      c.lineTo(W, H);
      c.closePath();
      c.fillStyle = degradado(c, 0, H * base - amp, 0, H, [[0, cols[0]], [1, cols[1]]]);
      c.fill();
    });
  const a = azarFijo(21);
  const cols = ["#fff", "#ffd84a", "#ff7a9a", "#c28bff"];
  for (let i = 0; i < 60; i++) {
    const x = a() * W, y = H * 0.6 + a() * H * 0.4;
    elipse(c, x, y, 2.2, 2.2, cols[i % 4]);
  }
}

export function dibujarFondo(c, W, H, idx) {
  const P = PALETAS[idx] || PALETAS[0];
  if (P.pradera) escenaPradera(c, W, H);
  else escenaPlaya(c, W, H, P);
}
