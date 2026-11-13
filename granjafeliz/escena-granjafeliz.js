// Ruta: granjafeliz/escena-granjafeliz.js
// Aspecto de Granja feliz (cámara de 3/4 como Farm Frenzy): terreno de tierra rodeado de pasto, edificios en las orillas, almacén arriba al centro, pozo
// y camión abajo. SOLO dibuja y define posiciones: no usa document, Firebase ni la lógica del juego (se puede probar en Node con node-canvas).
// TAMAÑOS: la granja puede ser de 3 tamaños (TAMANOS): «pequeno» = el escenario ORIGINAL de 800×450 con 4 espacios de edificio (el de los niveles 1-10 de México),
// «mediano» 960×540 con 6 y «grande» 1120×630 con 10. Todos 16:9. usarTamano(id) reacomoda TODO (ESCENA, CAMPO, CAJAS, LAYOUT, espacios y botones) cambiando los
// objetos en el sitio, así que quien los importó los sigue viendo al día. Hay que llamarlo antes de empezar una partida (juego-granjafeliz.js → aplicarTamano).
//   ESCENA   el cuadro de pasto con esquinas redondas (el resto del canvas queda transparente: se ve la madera del portal)
//   CAMPO    por dónde caminan animales y osos y dónde se planta pasto (la parte central; los edificios quedan fuera)
//   CAJAS    almacén (arriba al centro), pozo (abajo al centro), camión (abajo a la izquierda): arte arriba + franja ⬆ de 28 al pie
//   ranuraEdificio(i)   espacios: i par = columna izquierda, i impar = columna derecha, de arriba hacia abajo (0-1 primera fila, 2-3 segunda, 4-5 tercera, 6-7 cuarta);
//                       8 y 9 (solo en «grande») = arriba, a los lados del almacén (arte arriba + franja ⬆ de 26 al pie)
export const TAMANOS = {
  pequeno: { nombre: "Original", ANCHO: 800,  ALTO: 450, edificios: 4 },
  mediano: { nombre: "Mediano",  ANCHO: 960,  ALTO: 540, edificios: 6 },
  grande:  { nombre: "Grande",   ANCHO: 1120, ALTO: 630, edificios: 10 },
};
export const ORDEN_TAMANOS = ["pequeno", "mediano", "grande"];
export const LAYOUT = { id: "pequeno", ANCHO: 800, ALTO: 450, edificios: 4 };   // tamaño actual (se actualiza en el sitio)
export const ESCENA = { x: 20, y: 56, w: 770, h: 384 };
export const CAMPO = { x: 172, y: 100, w: 456, h: 300 };
export const CAJAS = {
  almacen: { x: 342, y: 60, w: 116, h: 96 },    // en Farm Frenzy el almacén es la jaula alta de arriba
  pozo:    { x: 342, y: 350, w: 116, h: 90 },   // la plataforma con techo de paja de abajo
  camion:  { x: 176, y: 350, w: 116, h: 90 },
};
export function usarTamano(id) {
  const clave = TAMANOS[id] ? id : "pequeno", T = TAMANOS[clave], W = T.ANCHO, H = T.ALTO;
  Object.assign(LAYOUT, { id: clave, ANCHO: W, ALTO: H, edificios: T.edificios });
  Object.assign(ESCENA, { x: 20, y: 56, w: W - 30, h: H - 66 });
  const campoY = T.edificios > 8 ? 176 : 100;   // con espacios arriba a los lados del almacén, el campo empieza más abajo
  Object.assign(CAMPO, { x: 172, y: campoY, w: W - 344, h: H - 50 - campoY });
  Object.assign(CAJAS.almacen, { x: W / 2 - 58, y: 60 });
  Object.assign(CAJAS.pozo, { x: W / 2 - 58, y: H - 100 });
  Object.assign(CAJAS.camion, { x: 176, y: H - 100 });
  return LAYOUT;
}
export const ranuraEdificio = (i) => {
  const W = LAYOUT.ANCHO, paso = LAYOUT.id === "pequeno" ? 126 : 120;   // separación entre filas (el original: 126)
  if (i >= 8) return { x: i === 8 ? W / 2 - 58 - 16 - 128 : W / 2 + 58 + 16, y: 64, w: 128, h: 104 };
  return { x: i % 2 ? W - 146 : 28, y: 64 + paso * Math.floor(i / 2), w: 128, h: 104 };
};
// Botones de comprar animales: fila en la esquina de abajo a la derecha (como el panel de la esquina del original)
export const botonComprar = (i, k) => { const w = k === 1 ? 96 : 70; return { x: LAYOUT.ANCHO - 18 - (k - i) * (w + 6) + 6, y: LAYOUT.ALTO - 100, w, h: 84 }; };

const PI2 = Math.PI * 2;
const acotar = (v, a, b) => Math.max(a, Math.min(b, v));
function semilla(n) { let s = n >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// Perspectiva: lo que está más abajo en pantalla se ve un poco más grande (la cámara mira el campo desde arriba y de frente)
export const escalaProf = (y) => 0.86 + 0.28 * acotar((y - CAMPO.y) / CAMPO.h, 0, 1);
// Sombra aplastada bajo animales, productos y osos (da la sensación de suelo inclinado)
export function sombra(ctx, x, y, rx, alfa = 0.22) { ctx.fillStyle = "rgba(25,45,10," + alfa + ")"; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.36, 0, 0, PI2); ctx.fill(); }

// ----- Terreno -----
// Manchas de tierra (elipses) que se juntan en una sola: la central y una por cada edificio, el almacén, el pozo y el camión.
function manchas(nEdif) {
  const W = LAYOUT.ANCHO, H = LAYOUT.ALTO;
  const m = [
    { cx: W / 2, cy: CAMPO.y + CAMPO.h / 2 + 6, rx: CAMPO.w / 2 + 34, ry: CAMPO.h / 2 },
    { cx: W / 2, cy: 118, rx: 74, ry: 26 },                     // bajo el almacén
    { cx: W / 2, cy: H - 54, rx: 74, ry: 24 },                  // bajo el pozo
    { cx: CAJAS.camion.x + 58, cy: H - 54, rx: 74, ry: 24 },    // bajo el camión
  ];
  for (let i = 0; i < nEdif; i++) { const r = ranuraEdificio(i); m.push({ cx: r.x + 64, cy: r.y + 66, rx: 86, ry: 50 }); }
  return m;
}
const enMancha = (m, x, y) => m.some((e) => ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 < 1);
function trazarManchas(ctx, m, dy = 0) { ctx.beginPath(); for (const e of m) { ctx.moveTo(e.cx + e.rx, e.cy + dy); ctx.ellipse(e.cx, e.cy + dy, e.rx, e.ry, 0, 0, PI2); } }

let cache = null, cacheClave = "";
// Dibuja el fondo completo (cielo, colinas, valla, pasto, tierra, orilla con matas, sombreado de bordes). nEdif = cuántos espacios de edificio usa el nivel.
export function dibujarFondo(ctx, nEdif = 0) {
  const W = LAYOUT.ANCHO, H = LAYOUT.ALTO, clave = LAYOUT.id + ":" + nEdif;
  try { // el fondo no cambia: se pinta una vez en un lienzo aparte (a doble resolución) y luego solo se copia
    if (!cache || cacheClave !== clave) {
      cache = document.createElement("canvas"); cache.width = W * 2; cache.height = H * 2; cacheClave = clave;
      const c = cache.getContext("2d"); c.scale(2, 2); pintarFondo(c, nEdif);
    }
    ctx.drawImage(cache, 0, 0, W, H);
  } catch (e) { pintarFondo(ctx, nEdif); }
}
function pintarFondo(ctx, nEdif) {
  const S = ESCENA, R = semilla(7), m = manchas(nEdif), W = LAYOUT.ANCHO, H = LAYOUT.ALTO, kx = S.w / 770, area = (W * H) / (800 * 450);
  ctx.save();
  rr(ctx, S.x, S.y, S.w, S.h, 18); ctx.clip();
  // cielo y nubes
  let g = ctx.createLinearGradient(0, S.y, 0, S.y + 50); g.addColorStop(0, "#86ccfb"); g.addColorStop(1, "#d9f2ff");
  ctx.fillStyle = g; ctx.fillRect(S.x, S.y, S.w, 52);
  ctx.fillStyle = "rgba(255,255,255,.9)";
  for (const [cx, cy, r] of [[110, 70, 15], [300, 66, 11], [585, 72, 17], [735, 68, 12]]) for (const [dx, k] of [[-0.9, 0.7], [0, 1], [0.9, 0.75]]) { ctx.beginPath(); ctx.ellipse(cx * (W / 800) + dx * r, cy, r * k * 1.4, r * k * 0.7, 0, 0, PI2); ctx.fill(); }
  // colinas lejanas
  ctx.fillStyle = "#79b650"; ctx.beginPath(); ctx.moveTo(S.x, S.y + 56); ctx.quadraticCurveTo(S.x + 120 * kx, S.y + 30, S.x + 250 * kx, S.y + 50); ctx.quadraticCurveTo(S.x + 400 * kx, S.y + 66, S.x + 540 * kx, S.y + 40); ctx.quadraticCurveTo(S.x + 680 * kx, S.y + 22, S.x + S.w, S.y + 48); ctx.lineTo(S.x + S.w, S.y + 70); ctx.lineTo(S.x, S.y + 70); ctx.fill();
  // pasto
  g = ctx.createLinearGradient(0, S.y + 50, 0, S.y + S.h); g.addColorStop(0, "#82c752"); g.addColorStop(1, "#5aa63a");
  ctx.fillStyle = g; ctx.fillRect(S.x, S.y + 56, S.w, S.h - 56);
  for (let i = 0, n = Math.round(26 * area); i < n; i++) { // manchas más claras y más oscuras
    const x = S.x + R() * S.w, y = S.y + 60 + R() * (S.h - 60), r = 30 + R() * 50, c = R() < 0.5 ? "rgba(150,215,90,.30)" : "rgba(40,120,40,.20)";
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, c); rg.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // valla de madera al fondo
  ctx.fillStyle = "#b07a45"; ctx.fillRect(S.x, S.y + 66, S.w, 3); ctx.fillRect(S.x, S.y + 76, S.w, 3);
  for (let x = S.x + 6; x < S.x + S.w; x += 24) { ctx.fillStyle = "#9a6735"; ctx.fillRect(x, S.y + 60, 5, 24); ctx.fillStyle = "#c68e55"; ctx.fillRect(x, S.y + 60, 2, 24); }
  // tierra: grosor oscuro abajo, borde, relleno con degradado
  ctx.fillStyle = "#7a5a34"; trazarManchas(ctx, m, 6); ctx.fill();
  ctx.lineJoin = "round"; ctx.strokeStyle = "#a9773f"; ctx.lineWidth = 8; trazarManchas(ctx, m); ctx.stroke();
  g = ctx.createRadialGradient(400, 250, 20, 400, 250, 290); g.addColorStop(0, "#e2bd88"); g.addColorStop(1, "#c99a63");
  ctx.fillStyle = g; trazarManchas(ctx, m); ctx.fill();
  ctx.save(); trazarManchas(ctx, m); ctx.clip(); // textura de la tierra
  for (let i = 0, n = Math.round(260 * area); i < n; i++) { const x = S.x + R() * S.w, y = S.y + 60 + R() * (S.h - 60); ctx.fillStyle = R() < 0.5 ? "rgba(120,80,40,.20)" : "rgba(255,235,190,.22)"; ctx.beginPath(); ctx.ellipse(x, y, 1.5 + R() * 3, 0.8 + R() * 1.4, 0, 0, PI2); ctx.fill(); }
  ctx.restore();
  // matas de pasto en la orilla de la tierra
  ctx.strokeStyle = "#3f8a2e"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (const e of m) for (let a = 0; a < PI2; a += 0.09) {
    const x = e.cx + Math.cos(a) * (e.rx + 4), y = e.cy + Math.sin(a) * (e.ry + 3);
    if (enMancha(m, x, y) || R() < 0.35) continue;
    ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x - 4, y - 5); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 7); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + 4, y - 5); ctx.stroke();
  }
  // lecho de pasto detrás de cada edificio
  for (let i = 0; i < nEdif; i++) { const r = ranuraEdificio(i); ctx.fillStyle = "rgba(105,180,60,.95)"; ctx.beginPath(); ctx.ellipse(r.x + 64, r.y + 34, 70, 20, 0, 0, PI2); ctx.fill(); }
  // flores y arbustos en el pasto
  for (let i = 0, n = Math.round(70 * area); i < n; i++) {
    const x = S.x + 8 + R() * (S.w - 16), y = S.y + 90 + R() * (S.h - 96);
    if (enMancha(m, x, y) || (x > W - 200 && y > H - 110)) continue;
    ctx.fillStyle = ["#fff", "#ffe05a", "#ff8fb1", "#c9a5ff"][Math.floor(R() * 4)]; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, PI2); ctx.fill();
  }
  for (const [bx, by] of [[62, 372], [112, 392], [742, 322], [700, 306], [44, 316]]) { const x = bx * (W / 800), y = by * (H / 450); if (enMancha(m, x, y)) continue; sombra(ctx, x, y + 8, 22); for (const [dx, dy, r, c] of [[-9, 0, 11, "#3f8f3a"], [8, -2, 12, "#4aa043"], [0, -8, 11, "#58b24c"]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, PI2); ctx.fill(); } }
  // sombreado de los bordes
  g = ctx.createRadialGradient(S.x + S.w / 2, S.y + S.h / 2 + 20, S.h * 0.38, S.x + S.w / 2, S.y + S.h / 2 + 20, S.w * 0.62); g.addColorStop(0, "rgba(0,30,0,0)"); g.addColorStop(1, "rgba(0,30,0,.34)");
  ctx.fillStyle = g; ctx.fillRect(S.x, S.y, S.w, S.h);
  ctx.restore();
  rr(ctx, S.x, S.y, S.w, S.h, 18); ctx.strokeStyle = "rgba(60,35,10,.75)"; ctx.lineWidth = 3; ctx.stroke();
}

// ----- Edificios (casas en 3/4: frente, costado oscuro a la derecha y techo con alero) -----
export const ESTILOS = {
  panaderia:  { pared: "#ead9ae", lado: "#c9b283", techo: "#cf5a3d", techoOsc: "#9d3f2a" },   // planta de polvo
  horno:      { pared: "#f6e6cb", lado: "#d8bf98", techo: "#3f9a5f", techoOsc: "#2c7044" },   // panadería
  hilanderia: { pared: "#d9e8f6", lado: "#aebfd6", techo: "#3f68c9", techoOsc: "#2c4a96" },
  tejeduria:  { pared: "#f1d6ea", lado: "#cfaac4", techo: "#8e4fbd", techoOsc: "#693a8c" },
};
// r = espacio del edificio; el arte ocupa los 78 de arriba (los 26 de abajo son la franja ⬆). Deja libre el frente (y+38 a y+76) para el rótulo de estado.
export function dibujarCasa(ctx, r, id, emoji, alfa = 1) {
  const s = ESTILOS[id] || ESTILOS.panaderia, bx = r.x + 10, bw = 92, sw = 16, by = r.y + 38, bh = 38;
  ctx.save(); ctx.globalAlpha = alfa;
  sombra(ctx, r.x + 64, by + bh + 3, 62, 0.25);
  ctx.fillStyle = s.pared; ctx.fillRect(bx, by, bw, bh);                                  // frente
  ctx.fillStyle = s.lado; ctx.beginPath(); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw + sw, by - 8); ctx.lineTo(bx + bw + sw, by + bh - 8); ctx.lineTo(bx + bw, by + bh); ctx.fill(); // costado
  ctx.fillStyle = "rgba(0,0,0,.14)"; ctx.fillRect(bx, by + bh - 5, bw, 5);               // zócalo
  ctx.fillStyle = "#7fb7e0"; ctx.fillRect(bx + bw + 4, by + 8, 8, 12); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(bx + bw + 4, by + 8, 8, 12); // ventana del costado
  ctx.fillStyle = s.techoOsc; ctx.beginPath(); ctx.moveTo(bx + bw + 8, by + 4); ctx.lineTo(bx + bw + sw + 8, by - 6); ctx.lineTo(bx + bw + sw - 8, by - 34); ctx.lineTo(bx + bw - 6, by - 26); ctx.fill(); // faldón del costado
  ctx.fillStyle = s.techo; ctx.beginPath(); ctx.moveTo(bx - 8, by + 4); ctx.lineTo(bx + bw + 8, by + 4); ctx.lineTo(bx + bw - 6, by - 26); ctx.lineTo(bx + 12, by - 26); ctx.fill(); // faldón del frente
  ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1; for (let k = 1; k < 4; k++) { const t = k / 4, yy = by + 4 - 30 * t; ctx.beginPath(); ctx.moveTo(bx - 8 + 20 * t, yy); ctx.lineTo(bx + bw + 8 - 14 * t, yy); ctx.stroke(); } // tejas
  ctx.fillStyle = "#fff8e0"; ctx.beginPath(); ctx.arc(bx + bw / 2 + 2, by - 11, 11, 0, PI2); ctx.fill(); ctx.strokeStyle = s.techoOsc; ctx.lineWidth = 2; ctx.stroke(); // letrero redondo con el emoji
  ctx.font = "14px system-ui,'Apple Color Emoji','Segoe UI Emoji',sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#000"; ctx.fillText(emoji, bx + bw / 2 + 2, by - 10);
  ctx.restore();
}

// ----- Almacén (jaula alta con cajas), pozo (plataforma con techo de paja) y camión -----
// c = CAJAS.x. llenado 0..1. El arte ocupa los ~56 de arriba; debajo va el rótulo y al pie la franja ⬆.
export function dibujarAlmacen(ctx, c, llenado) {
  const cx = c.x + c.w / 2, y0 = c.y + 4, w = 48, h = 46, x0 = cx - w / 2;
  sombra(ctx, cx, y0 + h + 2, 40, 0.25);
  ctx.fillStyle = "rgba(60,40,20,.35)"; ctx.fillRect(x0 + 3, y0 + 3, w, h);
  const filas = Math.round(acotar(llenado, 0, 1) * 3);
  for (let k = 0; k < filas; k++) { ctx.fillStyle = k % 2 ? "#b9803f" : "#c98f4c"; ctx.fillRect(x0 + 4, y0 + h - 14 * (k + 1) - 1, w - 8, 13); ctx.strokeStyle = "#6e4720"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 4, y0 + h - 14 * (k + 1) - 1, w - 8, 13); }
  ctx.strokeStyle = "#3b3b42"; ctx.lineWidth = 3; ctx.strokeRect(x0, y0, w, h);
  ctx.lineWidth = 2; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x0 + (w / 5) * k, y0); ctx.lineTo(x0 + (w / 5) * k, y0 + h); ctx.stroke(); }
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0, y0 + (h / 4) * k); ctx.lineTo(x0 + w, y0 + (h / 4) * k); ctx.stroke(); }
  ctx.fillStyle = "#55555e"; ctx.fillRect(x0 - 3, y0 - 5, w + 6, 6);                        // tapa
}
export function dibujarPozo(ctx, c, agua, cap, llenando) {
  const cx = c.x + c.w / 2, by = c.y + 42;
  sombra(ctx, cx, by + 2, 54, 0.25);
  ctx.fillStyle = "#a56f3a"; ctx.beginPath(); ctx.moveTo(cx - 52, by); ctx.lineTo(cx + 52, by); ctx.lineTo(cx + 44, by - 14); ctx.lineTo(cx - 44, by - 14); ctx.fill();   // plataforma
  ctx.strokeStyle = "rgba(60,30,10,.5)"; ctx.lineWidth = 1; for (let k = -36; k <= 36; k += 12) { ctx.beginPath(); ctx.moveTo(cx + k * 1.15, by); ctx.lineTo(cx + k, by - 14); ctx.stroke(); }
  ctx.fillStyle = "#8a5a2c"; ctx.fillRect(cx - 40, by - 38, 5, 26); ctx.fillRect(cx + 35, by - 38, 5, 26);                          // postes
  ctx.fillStyle = "#e0bf55"; ctx.beginPath(); ctx.moveTo(cx - 56, by - 34); ctx.lineTo(cx + 56, by - 34); ctx.lineTo(cx + 38, by - 54); ctx.lineTo(cx - 38, by - 54); ctx.fill(); // techo de paja
  ctx.strokeStyle = "#a98a2a"; ctx.lineWidth = 1.5; for (let k = -44; k <= 44; k += 11) { ctx.beginPath(); ctx.moveTo(cx + k, by - 34); ctx.lineTo(cx + k * 0.7, by - 54); ctx.stroke(); }
  ctx.fillStyle = "#6fb6e8"; ctx.beginPath(); ctx.ellipse(cx, by - 18, 22, 7, 0, 0, PI2); ctx.fill();                                // agua
  ctx.strokeStyle = "#7a4d22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, by - 18, 22, 7, 0, 0, PI2); ctx.stroke();
  if (llenando) { ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(cx - 6, by - 19, 5, 1.6, 0, 0, PI2); ctx.fill(); }
}
export function dibujarCamion(ctx, c, listo, enCamino) {
  const cx = c.x + c.w / 2, by = c.y + 40;
  ctx.save(); ctx.globalAlpha = enCamino ? 0.3 : 1;
  sombra(ctx, cx, by + 4, 50, 0.25);
  if (listo) { ctx.fillStyle = "rgba(120,255,140,.35)"; ctx.beginPath(); ctx.ellipse(cx, by + 2, 56, 18, 0, 0, PI2); ctx.fill(); }
  ctx.fillStyle = "#9a6a38"; ctx.fillRect(cx - 40, by - 30, 50, 26);                       // caja de madera
  ctx.strokeStyle = "#5e3c18"; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 40, by - 30, 50, 26); for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(cx - 40 + k * 12.5, by - 30); ctx.lineTo(cx - 40 + k * 12.5, by - 4); ctx.stroke(); }
  ctx.fillStyle = "#4f9d5a"; ctx.fillRect(cx + 10, by - 24, 26, 20); ctx.fillStyle = "#3b7a45"; ctx.fillRect(cx + 10, by - 24, 26, 4); // cabina
  ctx.fillStyle = "#bfe3f7"; ctx.fillRect(cx + 24, by - 20, 10, 9);
  for (const x of [cx - 26, cx + 22]) { ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(x, by - 2, 8, 0, PI2); ctx.fill(); ctx.fillStyle = "#bbb"; ctx.beginPath(); ctx.arc(x, by - 2, 3, 0, PI2); ctx.fill(); }
  ctx.restore();
}
// Rótulo oscuro con texto (estado de un edificio, carga, agua…)
export function rotulo(ctx, texto, cx, cy, color = "#fff4c2", tam = 12) {
  ctx.font = "700 " + tam + "px system-ui,sans-serif";
  const w = Math.min(ctx.measureText(texto).width + 14, 116);
  rr(ctx, cx - w / 2, cy - tam / 2 - 3, w, tam + 6, 8); ctx.fillStyle = "rgba(20,20,24,.82)"; ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(texto, cx, cy + 0.5, 112);
}
