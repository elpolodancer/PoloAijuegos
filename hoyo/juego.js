// Ruta: hoyo/juego.js
// Estilo Hole.io en vista isométrica, con 2 mapas: «ciudad» y «playa» (islas).
// Ajustes rápidos aquí arriba:
const DURACION = 120;      // segundos por partida
let MUNDO = 3000;          // tamaño del mapa (px); cada mapa puede traer el suyo con «mundo»
const NUM_BOTS = 7;         // bots por defecto (cada mapa puede traer los suyos con «bots»)
const R_INICIAL = 22;
const CRECIMIENTO = 0.35;  // cuánto crece el hoyo al tragar (más = más rápido)
const OBJETOS = 620;       // objetos por defecto (cada mapa puede traer los suyos con «objetos»)
let totalObjetos = OBJETOS, duracionMapa = DURACION;
const R_PEQUENO = 15;      // los objetos con radio hasta este valor cuentan como «pequeños» (los que come el hoyo inicial)
const PEQUENOS = 0.4;      // cuántos objetos pequeños quedan respecto a antes (0.4 = 60 % menos; 1 = como antes)
const pesoTipo = (t) => t.w * (t.r <= R_PEQUENO ? PEQUENOS : 1);

// ----- Ajustes de los bots (más tontos) -----
const BOT_COMER = 0.2;            // cuánto crecen y puntúan los bots al comer (0.2 = 80 % menos)
const BOT_PROB_PERSEGUIR = 0.2;   // probabilidad de que decidan ir tras un hoyo más chico (tú incluido) cuando lo ven (0.2 = 80 % menos)
const BOT_PERSECUCION_MAX = 2;    // segundos máximos que persiguen a un hoyo (antes: sin límite)
const BOT_ENFRIAR = 6;            // segundos que descansan sin perseguir a nadie después de una persecución
const BOT_VISION_HOYOS = 250;     // a qué distancia notan a un hoyo más chico (antes: 450)
const BOT_VISION_OBJETOS = 400;   // a qué distancia ven objetos para comer (antes: todo el mapa)
const BOT_HUIR_DIST = 200;        // a qué distancia notan el peligro de un hoyo más grande (antes: 380)
const BOT_PROB_HUIR = 0.5;        // probabilidad de que huyan cuando notan el peligro
const BOT_PROB_VAGAR = 0.3;       // probabilidad de que deambulen sin rumbo en vez de buscar comida

// Velocidad de los hoyos: entre más grande, más rápido (hasta V_MAX)
const V_BASE = 190, V_EXP = 0.25, V_MAX = 340;

const $ = (id) => document.getElementById(id);
const cv = $("c"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1;
function ajustar() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
}
addEventListener("resize", ajustar);
ajustar();

const rnd = (a, b) => a + Math.random() * (b - a);

// ----- Vista isométrica -----
// Mundo (x, y) -> pantalla: gira 45° y aplasta a la mitad. Los objetos se dibujan «de pie» con recto().
const K = Math.SQRT1_2;
const proj = (x, y) => [(x - y) * K, (x + y) * K / 2];
function recto(x, y, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(K, -K, 2 * K, 2 * K, 0, 0); // inversa de la isométrica: vuelve a ejes de pantalla
  fn();
  ctx.restore();
}

// ----- Mapas -----
const CALLE = 500, ANCHO_CALLE = 120;
const enCalle = (x, y) => Math.abs(((x + CALLE / 2) % CALLE) - CALLE / 2) < ANCHO_CALLE / 2 || Math.abs(((y + CALLE / 2) % CALLE) - CALLE / 2) < ANCHO_CALLE / 2;
let islas = [];
const CAMPO_CALLE = 600, CAMPO_ANCHO = 90;
const CAMPOS = ["#6aa84f", "#8fbc5a", "#c9b458", "#7a9a3e", "#a67c52", "#9acd62"];
const enCalleCampo = (x, y) => Math.abs(((x + CAMPO_CALLE / 2) % CAMPO_CALLE) - CAMPO_CALLE / 2) < CAMPO_ANCHO / 2 || Math.abs(((y + CAMPO_CALLE / 2) % CAMPO_CALLE) - CAMPO_CALLE / 2) < CAMPO_ANCHO / 2;

const MAPAS = {
  ciudad: {
    bg: "#13182b",
    tipos: [
      { e: "🌷", r: 7, w: 30 }, { e: "🧍", r: 7, w: 14 }, { e: "🐈", r: 9, w: 8 },
      { e: "🚧", r: 10, w: 20, calle: true }, { e: "🪑", r: 12, w: 12 }, { e: "🛢️", r: 13, w: 14 },
      { e: "🚗", r: 22, w: 22, calle: true }, { e: "🌳", r: 28, w: 14 }, { e: "🚚", r: 34, w: 8, calle: true },
      { e: "🚌", r: 40, w: 5, calle: true }, { e: "🏠", r: 55, w: 9 }, { e: "🏢", r: 80, w: 4 },
    ],
    preparar() {},
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        let x, y;
        if (t.calle) {
          const v = Math.random() < 0.5, c = Math.floor(rnd(0, MUNDO / CALLE)) * CALLE;
          x = v ? c + rnd(-40, 40) : rnd(100, MUNDO - 100);
          y = v ? rnd(100, MUNDO - 100) : c + rnd(-40, 40);
        } else {
          x = rnd(60, MUNDO - 60); y = rnd(60, MUNDO - 60);
          if (enCalle(x, y) || enCalle(x + t.r, y + t.r) || enCalle(x - t.r, y - t.r)) continue;
        }
        return [x, y];
      }
      return null;
    },
    spawn: () => [rnd(200, MUNDO - 200), rnd(200, MUNDO - 200)],
    factor: () => 1,
    suelo() {
      ctx.fillStyle = "#5f9e4a"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      ctx.fillStyle = "#454b5c";
      for (let k = 0; k * CALLE <= MUNDO; k++) {
        ctx.fillRect(k * CALLE - ANCHO_CALLE / 2, 0, ANCHO_CALLE, MUNDO);
        ctx.fillRect(0, k * CALLE - ANCHO_CALLE / 2, MUNDO, ANCHO_CALLE);
      }
      ctx.strokeStyle = "rgba(255,224,102,.55)"; ctx.lineWidth = 3; ctx.setLineDash([24, 20]);
      ctx.beginPath();
      for (let k = 0; k * CALLE <= MUNDO; k++) { ctx.moveTo(k * CALLE, 0); ctx.lineTo(k * CALLE, MUNDO); ctx.moveTo(0, k * CALLE); ctx.lineTo(MUNDO, k * CALLE); }
      ctx.stroke(); ctx.setLineDash([]);
    },
  },
  playa: {
    bg: "#0c4a63",
    tipos: [
      { e: "🐚", r: 7, w: 30 }, { e: "🥥", r: 7, w: 20 }, { e: "🦀", r: 8, w: 14 }, { e: "🏐", r: 10, w: 14 },
      { e: "⛱️", r: 14, w: 16 }, { e: "🛶", r: 22, w: 12, agua: true }, { e: "🌴", r: 28, w: 22 },
      { e: "🚤", r: 34, w: 6, agua: true }, { e: "⛵", r: 40, w: 5, agua: true }, { e: "🛖", r: 55, w: 10 }, { e: "🏨", r: 80, w: 3 },
    ],
    preparar() {
      islas = [];
      for (let i = 0; i < 400 && islas.length < 9; i++) {
        const R = rnd(190, 360), x = rnd(R + 80, MUNDO - R - 80), y = rnd(R + 80, MUNDO - R - 80);
        if (islas.every((s) => Math.hypot(s.x - x, s.y - y) > s.R + R + 140)) islas.push({ x, y, R });
      }
    },
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        if (t.agua) {
          const x = rnd(100, MUNDO - 100), y = rnd(100, MUNDO - 100);
          if (islas.every((s) => Math.hypot(s.x - x, s.y - y) > s.R + 50 + t.r)) return [x, y];
        } else {
          const s = islas[Math.floor(Math.random() * islas.length)], m = s.R - t.r - 10;
          if (m < 10) continue;
          const a = rnd(0, 6.2832), d = Math.sqrt(Math.random()) * m;
          return [s.x + Math.cos(a) * d, s.y + Math.sin(a) * d];
        }
      }
      return null;
    },
    spawn() { const s = islas[Math.floor(Math.random() * islas.length)], a = rnd(0, 6.2832), d = rnd(0, s.R * 0.5); return [s.x + Math.cos(a) * d, s.y + Math.sin(a) * d]; },
    factor: () => 1, // misma velocidad en el agua que en la isla (antes: 0.45 en el agua)
    suelo() {
      ctx.fillStyle = "#1f9cc4"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      for (const [dr, col] of [[70, "#3fc0d8"], [38, "#7fe0e6"], [0, "#f0d78c"]]) {
        ctx.fillStyle = col;
        for (const s of islas) { ctx.beginPath(); ctx.arc(s.x, s.y, s.R + dr, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = "#e6c877";
      for (const s of islas) { ctx.beginPath(); ctx.arc(s.x, s.y, s.R * 0.82, 0, 7); ctx.fill(); }
    },
  },
  campo: {
    // Mapa gigante: el doble de largo y de ancho que los demás (4 veces más superficie)
    mundo: 6000, objetos: 2400, bots: 14, duracion: 180,
    bg: "#3f6b34",
    tipos: [
      { e: "🌾", r: 7, w: 30 }, { e: "🌻", r: 7, w: 18 }, { e: "🐔", r: 8, w: 14 }, { e: "🐑", r: 11, w: 14 },
      { e: "🪵", r: 12, w: 10 }, { e: "🐄", r: 15, w: 12 }, { e: "🐎", r: 18, w: 8 },
      { e: "🚜", r: 26, w: 12, calle: true }, { e: "🌳", r: 28, w: 16 }, { e: "🛖", r: 40, w: 8 },
      { e: "🏠", r: 55, w: 7 }, { e: "🏭", r: 80, w: 3 },
    ],
    preparar() {},
    colocar(t) {
      for (let i = 0; i < 30; i++) {
        let x, y;
        if (t.calle) {
          const v = Math.random() < 0.5, c = Math.floor(rnd(0, MUNDO / CAMPO_CALLE)) * CAMPO_CALLE;
          x = v ? c + rnd(-35, 35) : rnd(100, MUNDO - 100);
          y = v ? rnd(100, MUNDO - 100) : c + rnd(-35, 35);
        } else {
          x = rnd(60, MUNDO - 60); y = rnd(60, MUNDO - 60);
          if (enCalleCampo(x, y) || enCalleCampo(x + t.r, y + t.r) || enCalleCampo(x - t.r, y - t.r)) continue;
        }
        return [x, y];
      }
      return null;
    },
    spawn: () => [rnd(200, MUNDO - 200), rnd(200, MUNDO - 200)],
    factor: () => 1,
    suelo() {
      ctx.fillStyle = "#5f9e4a"; ctx.fillRect(0, 0, MUNDO, MUNDO);
      const n = Math.ceil(MUNDO / CAMPO_CALLE), m = CAMPO_ANCHO / 2 + 10;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { // parcelas de cultivo, cada una de un color fijo
        ctx.fillStyle = CAMPOS[(((i * 73856093) ^ (j * 19349663)) >>> 0) % CAMPOS.length];
        ctx.fillRect(i * CAMPO_CALLE + m, j * CAMPO_CALLE + m, CAMPO_CALLE - 2 * m, CAMPO_CALLE - 2 * m);
      }
      ctx.fillStyle = "#b08d57"; // caminos de tierra
      for (let k = 0; k * CAMPO_CALLE <= MUNDO; k++) {
        ctx.fillRect(k * CAMPO_CALLE - CAMPO_ANCHO / 2, 0, CAMPO_ANCHO, MUNDO);
        ctx.fillRect(0, k * CAMPO_CALLE - CAMPO_ANCHO / 2, MUNDO, CAMPO_ANCHO);
      }
    },
  },
};
const NOMBRES = ["Lalo", "Mimi", "Toño", "Kiki", "Chuy", "Nena", "Beto", "Pepa", "Rulo", "Cuca", "Tita", "Lupe", "Memo", "Chela", "Nacho", "Güera"];
const COLORES = ["#ff5c7a", "#ffb347", "#4ad6a7", "#5cb8ff", "#c77dff", "#ffe066", "#ff8fab", "#9be564", "#7de0e6", "#f2a65a"];

let mapaId = "ciudad", mapa = MAPAS.ciudad;

function nuevoObjeto() {
  const tipos = mapa.tipos, total = tipos.reduce((s, t) => s + pesoTipo(t), 0);
  let k = Math.random() * total, t = tipos[0];
  for (const x of tipos) { if ((k -= pesoTipo(x)) < 0) { t = x; break; } }
  const p = mapa.colocar(t);
  return p ? { e: t.e, r: t.r, x: p[0], y: p[1] } : null;
}

// ----- Estado -----
let objetos = [], caidas = [], hoyos = [], yo = null, tiempo = 0, jugando = false;
const cam = { x: MUNDO / 2, y: MUNDO / 2, z: 0.3 };

function cargarMapa(id) {
  mapaId = id; mapa = MAPAS[id];
  MUNDO = mapa.mundo || 3000; const base = mapa.objetos || OBJETOS, wTodos = mapa.tipos.reduce((a, t) => a + t.w, 0), wPeq = mapa.tipos.reduce((a, t) => a + (t.r <= R_PEQUENO ? t.w : 0), 0);
  totalObjetos = Math.round(base * (1 - (wPeq / wTodos) * (1 - PEQUENOS))); duracionMapa = mapa.duracion || DURACION;
  mapa.preparar();
  objetos = []; caidas = []; hoyos = []; yo = null;
  while (objetos.length < totalObjetos) { const o = nuevoObjeto(); if (o) objetos.push(o); }
  cam.x = cam.y = MUNDO / 2; cam.z = 0.3;
}
function crearHoyo(nombre, color, esBot) {
  const h = { nombre, color, esBot, x: 0, y: 0, r: R_INICIAL, puntos: 0, dx: 0, dy: 0, meta: null, t: 0, cazaT: 0, enfriar: rnd(0, BOT_ENFRIAR) };
  reaparecer(h);
  return h;
}
function reaparecer(h) {
  h.r = R_INICIAL; h.meta = null; h.cazaT = 0;
  for (let i = 0; i < 20; i++) {
    [h.x, h.y] = mapa.spawn();
    if (!hoyos.some((o) => o !== h && Math.hypot(o.x - h.x, o.y - h.y) < 400)) break;
  }
}
function empezar() {
  cargarMapa(mapaId);
  yo = crearHoyo("Tú", "#7c5cff", false);
  hoyos.push(yo);
  for (let i = 0, nb = mapa.bots || NUM_BOTS; i < nb; i++) hoyos.push(crearHoyo(NOMBRES[i % NOMBRES.length], COLORES[i % COLORES.length], true));
  tiempo = duracionMapa; jugando = true;
  $("fin").hidden = true;
  cam.x = yo.x; cam.y = yo.y; cam.z = Math.min(W, H) / (yo.r * 9);
}

// ----- Controles: arrastrar el dedo (joystick flotante) o teclado. Se leen en pantalla y se pasan al mundo isométrico -----
const joy = { activo: false, ox: 0, oy: 0, x: 0, y: 0 };
cv.addEventListener("pointerdown", (e) => { joy.activo = true; joy.ox = joy.x = e.clientX; joy.oy = joy.y = e.clientY; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => { if (joy.activo) { joy.x = e.clientX; joy.y = e.clientY; } });
const soltar = () => (joy.activo = false);
cv.addEventListener("pointerup", soltar);
cv.addEventListener("pointercancel", soltar);
const teclas = {};
addEventListener("keydown", (e) => (teclas[e.key.toLowerCase()] = true));
addEventListener("keyup", (e) => (teclas[e.key.toLowerCase()] = false));

function direccionJugador() {
  let sx = 0, sy = 0, f = 1;
  if (joy.activo) {
    sx = joy.x - joy.ox; sy = joy.y - joy.oy;
    const m = Math.hypot(sx, sy);
    if (m < 6) return [0, 0];
    f = Math.min(m, 60) / 60;
  } else {
    if (teclas.arrowleft || teclas.a) sx -= 1;
    if (teclas.arrowright || teclas.d) sx += 1;
    if (teclas.arrowup || teclas.w) sy -= 1;
    if (teclas.arrowdown || teclas.s) sy += 1;
    if (!sx && !sy) return [0, 0];
  }
  // pantalla -> mundo (inversa de la isométrica)
  const wx = K * sx + 2 * K * sy, wy = -K * sx + 2 * K * sy, m = Math.hypot(wx, wy) || 1;
  return [(wx / m) * f, (wy / m) * f];
}

// ----- IA de los bots -----
function pensar(b) {
  // Si va en plena persecución, sigue un ratito más (hasta que se acabe su tiempo)
  if (b.cazaT > 0 && b.meta && b.meta.nombre) {
    const p = b.meta;
    if (b.r > p.r * 1.3 && Math.hypot(p.x - b.x, p.y - b.y) < BOT_VISION_HOYOS * 1.5) return;
    b.cazaT = 0;
  }
  let peligro = null, presa = null;
  for (const h of hoyos) {
    if (h === b) continue;
    const d = Math.hypot(h.x - b.x, h.y - b.y);
    if (h.r > b.r * 1.25 && d < BOT_HUIR_DIST + h.r * 0.5) peligro = h;
    else if (b.r > h.r * 1.3 && d < BOT_VISION_HOYOS && (!presa || d < Math.hypot(presa.x - b.x, presa.y - b.y))) presa = h;
  }
  const vagar = () => ({ x: rnd(100, MUNDO - 100), y: rnd(100, MUNDO - 100) });
  if (peligro && Math.random() < BOT_PROB_HUIR) {
    b.meta = { x: b.x - (peligro.x - b.x), y: b.y - (peligro.y - b.y) };
  } else if (presa && b.enfriar <= 0 && Math.random() < BOT_PROB_PERSEGUIR) {
    b.meta = presa; b.cazaT = rnd(1, BOT_PERSECUCION_MAX); b.enfriar = BOT_ENFRIAR;
  } else if (Math.random() < BOT_PROB_VAGAR) {
    b.meta = vagar();
  } else {
    let mejor = null, d2 = BOT_VISION_OBJETOS * BOT_VISION_OBJETOS;
    for (const o of objetos) {
      if (o.r >= b.r * 0.8) continue;
      const d = (o.x - b.x) ** 2 + (o.y - b.y) ** 2;
      if (d < d2) { d2 = d; mejor = o; }
    }
    b.meta = mejor || vagar();
  }
}

// ----- Actualización -----
const velocidad = (h) => Math.min(V_MAX, V_BASE * Math.pow(h.r / R_INICIAL, V_EXP)); // más grande = más rápido

function actualizar(dt) {
  if (!jugando) return;
  tiempo -= dt;
  if (tiempo <= 0) return terminar();

  [yo.dx, yo.dy] = direccionJugador();
  for (const h of hoyos) {
    if (h.esBot) {
      h.t -= dt; h.cazaT -= dt; h.enfriar -= dt;
      if (h.t <= 0 || !h.meta) { pensar(h); h.t = rnd(0.3, 0.7); }
      const m = h.meta, a = Math.hypot(m.x - h.x, m.y - h.y) || 1;
      h.dx = (m.x - h.x) / a; h.dy = (m.y - h.y) / a;
      if (a < 10) h.t = 0;
    }
    const v = velocidad(h) * (h.esBot ? 0.9 : 1) * mapa.factor(h.x, h.y);
    h.x = Math.max(h.r * 0.3, Math.min(MUNDO - h.r * 0.3, h.x + h.dx * v * dt));
    h.y = Math.max(h.r * 0.3, Math.min(MUNDO - h.r * 0.3, h.y + h.dy * v * dt));

    for (let i = objetos.length - 1; i >= 0; i--) {
      const o = objetos[i];
      if (o.r < h.r * 0.8 && Math.hypot(o.x - h.x, o.y - h.y) < h.r - o.r * 0.3) {
        objetos[i] = objetos[objetos.length - 1]; objetos.pop();
        caidas.push({ e: o.e, r: o.r, x: o.x, y: o.y, t: 0, h });
        const k = h.esBot ? BOT_COMER : 1;
        h.r = Math.sqrt(h.r * h.r + o.r * o.r * CRECIMIENTO * k);
        h.puntos += Math.round(o.r * k);
      }
    }
  }
  for (const a of hoyos) for (const b of hoyos) {
    if (a === b || a.r < b.r * 1.25) continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < a.r * 0.7) {
      const k = a.esBot ? BOT_COMER : 1;
      a.r = Math.sqrt(a.r * a.r + b.r * b.r * 0.5 * k);
      a.puntos += Math.round(b.r * 3 * k);
      reaparecer(b);
    }
  }
  for (let i = caidas.length - 1; i >= 0; i--) { caidas[i].t += dt / 0.35; if (caidas[i].t >= 1) caidas.splice(i, 1); }
  if (objetos.length < totalObjetos && Math.random() < 0.3) {
    const o = nuevoObjeto();
    if (o && o.r < 30 && !hoyos.some((h) => Math.hypot(h.x - o.x, h.y - o.y) < h.r + 200)) objetos.push(o);
  }

  const zObj = Math.min(W, H) / (yo.r * 9);
  cam.z += (Math.max(0.12, Math.min(2.2, zObj)) - cam.z) * Math.min(1, dt * 2.5);
  cam.x += (yo.x - cam.x) * Math.min(1, dt * 8);
  cam.y += (yo.y - cam.y) * Math.min(1, dt * 8);
}

// ----- Dibujo -----
function emoji(e, r, alfa) {
  ctx.globalAlpha = alfa; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = Math.max(4, r * 2) + "px serif"; ctx.fillStyle = "#000";
  ctx.fillText(e, 0, 0); ctx.globalAlpha = 1;
}

function dibujar() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = mapa.bg; ctx.fillRect(0, 0, W, H);
  const [cx, cy] = proj(cam.x, cam.y);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cx, -cy);
  ctx.transform(K, K / 2, -K, K / 2, 0, 0); // a partir de aquí se dibuja en coordenadas del mundo, en isométrico

  mapa.suelo();

  const vw = W / 2 / cam.z + 200, vh = H / 2 / cam.z + 200;
  const visible = (o) => {
    const [px, py] = proj(o.x, o.y), m = (o.r || 0) * 2;
    return Math.abs(px - cx) < vw + m && Math.abs(py - cy) < vh + m;
  };

  // hoyos (debajo de los objetos): círculos del mundo que en isométrico se ven como elipses
  for (const h of hoyos) {
    if (!visible(h)) continue;
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 4, 0, 7); ctx.fillStyle = h.color; ctx.fill();
    const g = ctx.createRadialGradient(h.x, h.y, h.r * 0.2, h.x, h.y, h.r);
    g.addColorStop(0, "#000"); g.addColorStop(1, "#141420");
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.fillStyle = g; ctx.fill();
  }
  // objetos cayendo: se encogen hacia el centro y se recortan dentro del hoyo
  for (const c of caidas) {
    const h = c.h, k = c.t, x = c.x + (h.x - c.x) * k, y = c.y + (h.y - c.y) * k;
    ctx.save();
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 7); ctx.clip();
    recto(x, y, () => { ctx.translate(0, -c.r * 0.8 * (1 - k)); emoji(c.e, c.r * (1 - k * 0.9), 1 - k * 0.4); });
    ctx.restore();
  }
  // objetos en el suelo, de atrás hacia adelante (x + y = profundidad en isométrico)
  const vis = objetos.filter(visible).sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const o of vis) {
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.8, 0, 7); ctx.fill();
  }
  for (const o of vis) recto(o.x, o.y, () => { ctx.translate(0, -o.r * 0.8); emoji(o.e, o.r, 1); });
  // nombres
  for (const h of hoyos) {
    if (!visible(h)) continue;
    recto(h.x, h.y, () => {
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.font = "700 " + Math.max(12, h.r * 0.42) + "px system-ui, sans-serif";
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.fillStyle = "#fff";
      const y = -h.r * 0.5 - 12;
      ctx.strokeText(h.nombre, 0, y); ctx.fillText(h.nombre, 0, y);
    });
  }
  ctx.restore();

  // ----- interfaz (en pantalla) -----
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (joy.activo) {
    ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 60, 0, 7); ctx.stroke();
    const m = Math.min(60, Math.hypot(joy.x - joy.ox, joy.y - joy.oy)), a = Math.atan2(joy.y - joy.oy, joy.x - joy.ox);
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath(); ctx.arc(joy.ox + Math.cos(a) * m, joy.oy + Math.sin(a) * m, 24, 0, 7); ctx.fill();
  }
  if (!yo) return;
  ctx.fillStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.6)";
  ctx.font = "800 26px system-ui, sans-serif";
  const t = Math.max(0, Math.ceil(tiempo)), txt = Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  ctx.strokeText(txt, W / 2, 36); ctx.fillText(txt, W / 2, 36);
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.strokeText(yo.puntos + " pts", W / 2, 62); ctx.fillText(yo.puntos + " pts", W / 2, 62);
  const top = [...hoyos].sort((a, b) => b.puntos - a.puntos).slice(0, 5);
  ctx.textAlign = "right"; ctx.font = "600 14px system-ui, sans-serif";
  top.forEach((h, i) => {
    ctx.fillStyle = h === yo ? "#ffe066" : "#fff";
    const s = (i + 1) + ". " + h.nombre + "  " + h.puntos;
    ctx.strokeText(s, W - 12, 24 + i * 20); ctx.fillText(s, W - 12, 24 + i * 20);
  });
}

// ----- Fin de la partida -----
async function terminar() {
  jugando = false;
  const orden = [...hoyos].sort((a, b) => b.puntos - a.puntos);
  const lugar = orden.indexOf(yo) + 1;
  $("fin").querySelector("h2").textContent = lugar === 1 ? "🏆 ¡Ganaste!" : "Terminó el tiempo: lugar " + lugar;
  $("rank").innerHTML = "";
  orden.slice(0, 5).forEach((h, i) => {
    const li = document.createElement("li");
    const n = document.createElement(h === yo ? "b" : "span");
    n.textContent = (i + 1) + ". " + h.nombre + " — " + h.puntos + " pts";
    li.appendChild(n); $("rank").appendChild(li);
  });
  $("jugar").textContent = "Jugar otra vez";
  $("fin").hidden = false;
  $("msg").textContent = "";
  try {
    const { sumarPuntos } = await import("../compartido/jugador.js");
    const ok = await sumarPuntos("hoyo", Math.floor(yo.puntos / 3));
    $("msg").textContent = ok ? "Puntos guardados en tu perfil." : "Entra con Google en el portal para guardar tus puntos.";
  } catch (e) {
    $("msg").textContent = "No se pudieron guardar los puntos (sin conexión).";
  }
}

// ----- Menú: elegir mapa y jugar -----
document.querySelectorAll("#mapas .btn").forEach((b) =>
  b.addEventListener("click", () => {
    document.querySelectorAll("#mapas .btn").forEach((x) => x.classList.toggle("sel", x === b));
    cargarMapa(b.dataset.mapa); // el fondo del menú muestra el mapa elegido
  })
);
$("jugar").addEventListener("click", empezar);

// ----- Bucle -----
let ultimo = performance.now();
function bucle(ahora) {
  const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
  actualizar(dt); dibujar();
  requestAnimationFrame(bucle);
}
cargarMapa("ciudad");
requestAnimationFrame(bucle);
