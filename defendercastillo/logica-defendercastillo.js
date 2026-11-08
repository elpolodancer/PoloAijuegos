// Ruta: defendercastillo/logica-defendercastillo.js
// Reglas de «Defensa del castillo» (sin pantalla): torres, enemigos, oro, oleadas y daño al castillo.
// juego-defendercastillo.js solo dibuja y manda órdenes (colocar, mejorar, vender, iniciarOleada, paso).
// Los números de equilibrio (daño, precios, vida, velocidad) están aquí arriba; las oleadas, en niveles-defendercastillo.js
// (mapas clásicos) y en generador-defendercastillo.js (los 100 niveles de Michoacán).
// Habilidades: enemigos que vuelan (vuela), blindados (arm), que reviven (revive), se parten (parte), curan (cura), esquivan (esq),
// se regeneran (regen), resisten veneno (resVen) o no se congelan (inmCong). Torres: tipo de daño (td: fisico, explosivo, magico, perfora).
export const CELDA = 45;
// Tamaño por defecto de la cuadrícula (8 × 12). Un mapa puede traer «cols» y «filas» propios (misma proporción 2:3, p. ej. 12 × 18);
// la partida los guarda en p.cols, p.filas, p.ancho y p.alto, y el resto del código usa esos.
export const COLS = 8;
export const FILAS = 12;
export const ANCHO = COLS * CELDA;
export const ALTO = FILAS * CELDA;

export const REEMBOLSO = 0.7;          // al vender una torre se devuelve este % de lo invertido
export const METEORO = { espera: 40, radio: 1.7, dano: 90 }; // habilidad especial: radio en celdas, espera en segundos
export const VEL_PROYECTIL = 340;      // px por segundo

// Cada torre tiene 3 niveles. dano, alcance (celdas), cadencia (segundos entre disparos),
// radio (celdas, solo si el daño es en área), lento (multiplicador de velocidad) y tlento (segundos),
// sube = precio para pasar al nivel siguiente.
export const TORRES = {
  arquero: {
    nombre: "Arquero", icono: "🏹", precio: 50, desc: "Barato y rápido", td: "fisico",
    niveles: [
      { dano: 9, alcance: 2.4, cadencia: 0.65, sube: 60 },
      { dano: 16, alcance: 2.6, cadencia: 0.55, sube: 110 },
      { dano: 28, alcance: 2.9, cadencia: 0.45, sube: 0 },
    ],
  },
  canon: {
    nombre: "Cañón", icono: "💣", precio: 110, desc: "Daño en área", td: "explosivo",
    niveles: [
      { dano: 30, alcance: 2.6, cadencia: 2.0, radio: 0.95, sube: 100 },
      { dano: 52, alcance: 2.8, cadencia: 1.8, radio: 1.1, sube: 170 },
      { dano: 85, alcance: 3.0, cadencia: 1.6, radio: 1.25, sube: 0 },
    ],
  },
  mago: {
    nombre: "Mago", icono: "🔮", precio: 100, desc: "Frena a los enemigos", td: "magico",
    niveles: [
      { dano: 12, alcance: 2.3, cadencia: 1.0, lento: 0.55, tlento: 1.6, sube: 90 },
      { dano: 20, alcance: 2.5, cadencia: 0.9, lento: 0.45, tlento: 1.9, sube: 150 },
      { dano: 34, alcance: 2.8, cadencia: 0.8, lento: 0.35, tlento: 2.2, sube: 0 },
    ],
  },
  // Dispara lejos y fuerte pero lento: ideal contra orcos y trolls (poco útil contra montones de goblins)
  ballesta: {
    nombre: "Ballesta", icono: "🎯", precio: 230, desc: "Gran daño y alcance", td: "perfora",
    niveles: [
      { dano: 95, alcance: 3.5, cadencia: 2.2, sube: 170 },
      { dano: 160, alcance: 3.8, cadencia: 2.0, sube: 260 },
      { dano: 260, alcance: 4.1, cadencia: 1.8, sube: 0 },
    ],
  },
  // Rayo instantáneo que salta a enemigos cercanos (cada salto pega 20 % menos): ideal contra montones.
  // cadena = cuántos saltos da; salto = distancia máxima de cada salto (celdas)
  rayos: {
    nombre: "Rayos", icono: "⚡", precio: 300, desc: "Salta entre enemigos", td: "magico",
    niveles: [
      { dano: 24, alcance: 2.5, cadencia: 1.15, cadena: 2, salto: 1.3, sube: 230 },
      { dano: 38, alcance: 2.7, cadencia: 1.05, cadena: 3, salto: 1.4, sube: 330 },
      { dano: 58, alcance: 2.9, cadencia: 0.95, cadena: 4, salto: 1.5, sube: 0 },
    ],
  },
  // ----- Torres nuevas (solo se ofrecen en los niveles que las desbloquean; ver «torres» en cada nivel) -----
  // Mortero: área grande y largo alcance, pero no dispara cerca (minimo, en celdas) ni a los voladores.
  mortero: {
    nombre: "Mortero", icono: "🧨", precio: 260, desc: "Área enorme y largo alcance; no pega cerca ni a voladores", td: "explosivo", noAire: true,
    niveles: [
      { dano: 70, alcance: 4.6, minimo: 1.6, cadencia: 3.4, radio: 1.5, sube: 200 },
      { dano: 120, alcance: 4.9, minimo: 1.6, cadencia: 3.1, radio: 1.7, sube: 300 },
      { dano: 190, alcance: 5.2, minimo: 1.6, cadencia: 2.8, radio: 1.9, sube: 0 },
    ],
  },
  // Hielo: congela en área unos instantes (congela = segundos). Los golems no se congelan.
  hielo: {
    nombre: "Hielo", icono: "❄️", precio: 140, desc: "Congela en área; no sirve contra el golem", td: "magico",
    niveles: [
      { dano: 5, alcance: 2.4, cadencia: 2.4, radio: 1.1, congela: 0.8, sube: 110 },
      { dano: 9, alcance: 2.6, cadencia: 2.2, radio: 1.2, congela: 1.0, sube: 170 },
      { dano: 14, alcance: 2.8, cadencia: 2.0, radio: 1.35, congela: 1.3, sube: 0 },
    ],
  },
  // Veneno: daño con el tiempo que atraviesa la armadura (dps por segundo durante t segundos). Las arañas lo resisten.
  veneno: {
    nombre: "Veneno", icono: "☠️", precio: 190, desc: "Daño con el tiempo que atraviesa armadura", td: "perfora", prioridad: "fuerte",
    niveles: [
      { dano: 4, alcance: 2.5, cadencia: 1.1, veneno: { dps: 9, t: 4 }, sube: 140 },
      { dano: 7, alcance: 2.7, cadencia: 1.0, veneno: { dps: 16, t: 4.5 }, sube: 220 },
      { dano: 11, alcance: 2.9, cadencia: 0.9, veneno: { dps: 26, t: 5 }, sube: 0 },
    ],
  },
  // Mina de oro: no ataca; da monedas (oroOla) al terminar cada oleada.
  mina: {
    nombre: "Mina de oro", icono: "💰", precio: 150, desc: "No ataca: da monedas cada oleada", td: "fisico",
    niveles: [
      { oroOla: 20, sube: 120 },
      { oroOla: 34, sube: 200 },
      { oroOla: 55, sube: 0 },
    ],
  },
  // Cuartel: soldados (bloqueo = cuántos enemigos frenan a la vez) que detienen a los del suelo y los golpean (dano por segundo).
  // Si los enemigos los vencen (hpSol), el cuartel queda caído 8 s. No frena a jefes ni a voladores.
  cuartel: {
    nombre: "Cuartel", icono: "🏕️", precio: 170, desc: "Soldados que frenan y golpean a los del suelo", td: "fisico",
    niveles: [
      { dano: 14, alcance: 1.5, bloqueo: 2, hpSol: 260, sube: 130 },
      { dano: 24, alcance: 1.6, bloqueo: 3, hpSol: 420, sube: 210 },
      { dano: 38, alcance: 1.7, bloqueo: 4, hpSol: 650, sube: 0 },
    ],
  },
};
export const TORRES_CLASICAS = ["arquero", "canon", "mago", "ballesta", "rayos"]; // las que ofrecen los mapas que no traen «torres»

// Talar: quitar un árbol o roca cuesta monedas y deja el lugar libre para construir
export const COSTE_TALAR = { arbol: 20, roca: 40 };
export const costeTalar = (o) => (o.e === "🪨" ? COSTE_TALAR.roca : COSTE_TALAR.arbol);

// vel en px/s; dano = golpe al castillo si llega; oro = monedas al matarlo
// Extras: vuela (va directo al castillo; el cañón y el mortero no le pegan), arm (0 a 1: reduce el daño físico; la mitad en explosivo;
// el mago, los rayos, la ballesta y el veneno la ignoran), revive (vuelve una vez con 50 % de vida), parte (al morir salen 2 de ese tipo),
// cura {radio, pct, cada} (cura a los de alrededor), esq (probabilidad de esquivar un disparo directo), regen (% de vida por segundo),
// resVen (resistencia al veneno), inmCong (no se congela), jefe (los soldados del cuartel no lo frenan).
export const ENEMIGOS = {
  goblin: { nombre: "Goblin", icono: "👺", vida: 40, vel: 46, dano: 4, oro: 3, tam: 22 },
  lobo: { nombre: "Lobo", icono: "🐺", vida: 34, vel: 85, dano: 4, oro: 4, tam: 22 },
  orco: { nombre: "Orco", icono: "👹", vida: 220, vel: 32, dano: 10, oro: 11, tam: 28 },
  troll: { nombre: "Troll", icono: "🧌", vida: 2200, vel: 24, dano: 30, oro: 100, tam: 40 },
  // ----- Los nuevos (los usan los niveles de Michoacán) -----
  murcielago: { nombre: "Murciélago", icono: "🦇", vida: 26, vel: 78, dano: 3, oro: 4, tam: 20, vuela: true },
  esqueleto: { nombre: "Esqueleto", icono: "💀", vida: 70, vel: 42, dano: 5, oro: 5, tam: 24, revive: true },
  arana: { nombre: "Araña", icono: "🕷️", vida: 45, vel: 76, dano: 4, oro: 5, tam: 22, resVen: 0.7 },
  slime: { nombre: "Slime", icono: "🟢", vida: 90, vel: 36, dano: 5, oro: 6, tam: 26, parte: "slimito" },
  slimito: { nombre: "Slime chico", icono: "🟢", vida: 30, vel: 40, dano: 2, oro: 1, tam: 16, oculto: true },
  caballero: { nombre: "Caballero", icono: "🛡️", vida: 340, vel: 34, dano: 12, oro: 14, tam: 28, arm: 0.6 },
  brujo: { nombre: "Brujo", icono: "🧙", vida: 130, vel: 38, dano: 6, oro: 9, tam: 24, cura: { radio: 1.6, pct: 0.05, cada: 1.2 } },
  fantasma: { nombre: "Fantasma", icono: "👻", vida: 120, vel: 55, dano: 7, oro: 9, tam: 24, esq: 0.3 },
  golem: { nombre: "Golem", icono: "🗿", vida: 900, vel: 20, dano: 18, oro: 28, tam: 34, arm: 0.5, inmCong: true },
  jinete: { nombre: "Jinete", icono: "🐎", vida: 260, vel: 70, dano: 9, oro: 14, tam: 28, arm: 0.35 },
  ogro: { nombre: "Ogro", icono: "🧟", vida: 1100, vel: 22, dano: 22, oro: 35, tam: 36 },
  trollJefe: { nombre: "Troll jefe", icono: "🧌", vida: 2600, vel: 24, dano: 30, oro: 100, tam: 40, regen: 0.006, jefe: true },
  dragon: { nombre: "Dragón", icono: "🐉", vida: 4200, vel: 30, dano: 50, oro: 160, tam: 44, vuela: true, jefe: true },
};

// Un nivel tiene «camino» (una ruta) o «caminos» (varias entradas; los enemigos se reparten entre ellas)
function prepararMapa(nivel) {
  const COLS_ = nivel.cols || COLS, FILAS_ = nivel.filas || FILAS;
  const lista = nivel.caminos || [nivel.camino];
  const hacerRuta = (cam) => {
    const pts = cam.map(([c, f]) => ({ x: c * CELDA, y: f * CELDA }));
    const segs = [];
    let largo = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, l, ini: largo });
      largo += l;
    }
    return { segs, largo };
  };
  const rutas = lista.map(hacerRuta);
  const aire = lista.map((cam) => hacerRuta([cam[0], cam[cam.length - 1]])); // los voladores van en línea recta de la entrada al castillo
  const bloq = Array.from({ length: FILAS_ }, () => Array(COLS_).fill(false));
  for (const cam of lista) {
    for (let i = 0; i < cam.length - 1; i++) {
      const [c1, f1] = cam[i], [c2, f2] = cam[i + 1];
      for (let f = Math.max(0, Math.floor(Math.min(f1, f2))); f <= Math.min(FILAS_ - 1, Math.floor(Math.max(f1, f2))); f++)
        for (let c = Math.max(0, Math.floor(Math.min(c1, c2))); c <= Math.min(COLS_ - 1, Math.floor(Math.max(c1, c2))); c++) bloq[f][c] = true;
    }
  }
  const k = nivel.castillo;
  for (let f = k.f; f < k.f + k.h; f++) for (let c = k.c; c < k.c + k.w; c++) bloq[f][c] = true;
  (nivel.obstaculos || []).forEach(([c, f]) => (bloq[f][c] = true));
  return { rutas, aire, bloq };
}

// ruta = una de mapa.rutas; d = distancia recorrida en px
export function posicionEnCamino(ruta, d) {
  const s = ruta.segs;
  for (let i = 0; i < s.length; i++) {
    if (d <= s[i].ini + s[i].l || i === s.length - 1) {
      const t = Math.min(1, Math.max(0, (d - s[i].ini) / s[i].l));
      return { x: s[i].a.x + (s[i].b.x - s[i].a.x) * t, y: s[i].a.y + (s[i].b.y - s[i].a.y) * t };
    }
  }
  return { x: 0, y: 0 };
}

// Azar con semilla (así una partida simulada por el bot siempre sale igual)
export function azarSemilla(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nuevaPartida(nivel) {
  const cols = nivel.cols || COLS, filas = nivel.filas || FILAS;
  return {
    nivel,
    cols, filas, ancho: cols * CELDA, alto: filas * CELDA,
    mapa: prepararMapa(nivel),
    oro: nivel.oroInicial,
    vida: nivel.vidaCastillo,
    oleada: 0,            // oleadas ya terminadas
    activa: false,        // hay una oleada en curso
    t: 0,                 // segundos de la oleada en curso
    cola: [],             // enemigos por salir: { t, tipo }
    obstaculos: (nivel.obstaculos || []).map(([c, f, e]) => ({ c, f, e })), // se pueden talar
    torres: [],
    enemigos: [],
    proyectiles: [],
    meteoroEspera: 0,
    puntos: 0,
    matados: 0,
    talados: 0,
    estado: "preparando", // preparando | oleada | ganado | perdido
    ev: [],               // eventos para sonido/efectos; juego-defendercastillo.js los vacía
    id: 1,
    azar: azarSemilla((nivel.semilla || 1) + 7),
  };
}

export const celdaLibre = (p, c, f) =>
  c >= 0 && c < p.cols && f >= 0 && f < p.filas && !p.mapa.bloq[f][c] && !p.torres.some((t) => t.c === c && t.f === f);
export const torreEn = (p, c, f) => p.torres.find((t) => t.c === c && t.f === f) || null;
export const datosTorre = (t) => TORRES[t.tipo].niveles[t.nivel];
export const valorTorre = (t) => t.invertido;

export function colocar(p, tipo, c, f) {
  const def = TORRES[tipo];
  if (!def || p.estado === "ganado" || p.estado === "perdido" || !celdaLibre(p, c, f) || p.oro < def.precio) return null;
  p.oro -= def.precio;
  const t = { id: p.id++, tipo, c, f, x: (c + 0.5) * CELDA, y: (f + 0.5) * CELDA, nivel: 0, cd: 0.3, invertido: def.precio };
  const d0 = def.niveles[0];
  if (d0.hpSol) { t.hpSol = d0.hpSol; t.caidoT = 0; t.enganchados = []; }
  p.torres.push(t);
  p.ev.push({ t: "construir", x: t.x, y: t.y });
  return t;
}
export function mejorar(p, t) {
  const sube = datosTorre(t).sube;
  if (!sube || p.oro < sube || p.estado === "ganado" || p.estado === "perdido") return false;
  p.oro -= sube;
  t.invertido += sube;
  t.nivel++;
  if (datosTorre(t).hpSol) t.hpSol = datosTorre(t).hpSol;
  p.ev.push({ t: "mejora", x: t.x, y: t.y });
  return true;
}
export function vender(p, t) {
  const i = p.torres.indexOf(t);
  if (i < 0) return 0;
  const gana = Math.floor(t.invertido * REEMBOLSO);
  p.torres.splice(i, 1);
  p.oro += gana;
  return gana;
}

export const obstaculoEn = (p, c, f) => p.obstaculos.find((o) => o.c === c && o.f === f) || null;
export function talar(p, c, f) {
  const o = obstaculoEn(p, c, f);
  if (!o || p.estado === "ganado" || p.estado === "perdido") return false;
  const coste = costeTalar(o);
  if (p.oro < coste) return false;
  p.oro -= coste;
  p.obstaculos.splice(p.obstaculos.indexOf(o), 1);
  p.mapa.bloq[f][c] = false;
  p.talados++;
  p.ev.push({ t: "talar", x: (c + 0.5) * CELDA, y: (f + 0.5) * CELDA, coste });
  return true;
}

function nuevoEnemigo(p, tipo, r, hp, mult, oroM, d) {
  return { id: p.id++, tipo, r, hp, hpMax: hp, d, x: 0, y: 0, vivo: true, lentoT: 0, lentoF: 1, vuela: !!ENEMIGOS[tipo].vuela,
    mult, oroM, venT: 0, venDps: 0, congT: 0, inmT: 0, revivio: false, curaT: 0, bloq: false };
}

export function iniciarOleada(p) {
  if (p.activa || p.estado !== "preparando") return false;
  const o = p.nivel.oleadas[p.oleada];
  p.cola = [];
  const nr = p.mapa.rutas.length;
  for (const [tipo, n, cada, ini, ruta] of o.grupos) for (let i = 0; i < n; i++) p.cola.push({ t: ini + i * cada, tipo, r: ruta !== undefined ? ruta : i % nr });
  p.cola.sort((a, b) => a.t - b.t);
  p.t = 0;
  p.activa = true;
  p.estado = "oleada";
  p.ev.push({ t: "oleada", n: p.oleada + 1 });
  return true;
}

// td = tipo de daño del disparo; directo = golpe a un solo enemigo (el fantasma puede esquivarlo)
function danar(p, e, dano, td, directo) {
  if (!e.vivo) return;
  const def = ENEMIGOS[e.tipo];
  if (directo && def.esq && p.azar() < def.esq) { p.ev.push({ t: "esquiva", x: e.x, y: e.y }); return; }
  if (def.arm && td) dano *= td === "fisico" ? 1 - def.arm : td === "explosivo" ? 1 - def.arm * 0.5 : 1;
  e.hp -= dano;
  if (e.hp <= 0) matar(p, e);
}

function matar(p, e) {
  const def = ENEMIGOS[e.tipo];
  if (def.revive && !e.revivio) { // el esqueleto vuelve una vez
    e.revivio = true; e.hp = Math.round(e.hpMax * 0.5); e.venT = 0; e.congT = 0;
    p.ev.push({ t: "revive", x: e.x, y: e.y });
    return;
  }
  e.vivo = false;
  const oro = Math.round(def.oro * e.oroM);
  p.oro += oro;
  p.puntos += 10;
  p.matados++;
  p.ev.push({ t: "muerte", x: e.x, y: e.y, oro, tipo: e.tipo });
  if (def.parte) { // el slime se parte en 2
    const hijo = ENEMIGOS[def.parte], hp = Math.round(hijo.vida * e.mult);
    for (let i = 0; i < 2; i++) {
      const h = nuevoEnemigo(p, def.parte, e.r, hp, e.mult, e.oroM, Math.max(0, e.d + (i ? -7 : 7)));
      h.x = e.x; h.y = e.y; h.vuela = false;
      p.enemigos.push(h);
    }
  }
}

function frenar(e, lento, tlento) {
  if (!lento) return;
  if (e.lentoT <= 0 || lento < e.lentoF) e.lentoF = lento;
  e.lentoT = Math.max(e.lentoT, tlento);
}
function congelar(e, s) {
  if (!s || ENEMIGOS[e.tipo].inmCong || e.congT > 0 || e.inmT > 0) return;
  e.congT = s;
}
function envenenar(e, v) {
  if (!v) return;
  if (e.venT <= 0 || v.dps > e.venDps) e.venDps = v.dps;
  e.venT = Math.max(e.venT, v.t);
}
function efectos(e, py) { frenar(e, py.lento, py.tlento); congelar(e, py.congela); envenenar(e, py.veneno); }

function impacto(p, py) {
  const r = py.radio * CELDA;
  if (py.radio) {
    for (const e of p.enemigos) {
      if (!e.vivo || (py.noAire && e.vuela) || Math.hypot(e.x - py.tx, e.y - py.ty) > r + 6) continue;
      danar(p, e, py.dano, py.td, false);
      efectos(e, py);
    }
    p.ev.push({ t: "explosion", x: py.tx, y: py.ty, r, hielo: !!py.congela });
  } else if (py.obj.vivo) {
    danar(p, py.obj, py.dano, py.td, true);
    efectos(py.obj, py);
    p.ev.push({ t: "flecha", x: py.tx, y: py.ty, tipo: py.tipo });
  }
}

export function meteoro(p, x, y) {
  if (p.meteoroEspera > 0 || p.estado === "ganado" || p.estado === "perdido") return false;
  p.meteoroEspera = METEORO.espera;
  impacto(p, { radio: METEORO.radio, dano: METEORO.dano, tx: x, ty: y });
  p.ev.push({ t: "meteoro", x, y });
  return true;
}

// ----- A quién apunta cada torre -----
// PEGAJOSO = false: en cada momento apunta al mejor enemigo según su «prioridad» (así se calibraron los mapas).
// PEGAJOSO = true:  se queda con el mismo enemigo hasta que muera o salga de su alcance, y solo entonces elige otro.
// Para que un tipo de torre use otra regla, agrega «prioridad: "fuerte"» (o "cercano") en su definición de TORRES.
export const PEGAJOSO = false;
const PRIORIDAD = {
  primero: (e) => e.d,                                       // el que va más adelante en el camino (por defecto)
  fuerte: (e) => e.hp,                                       // el que más vida tiene
  cercano: (e, t) => -Math.hypot(e.x - t.x, e.y - t.y),      // el más cercano a la torre
};
function elegirObjetivo(p, t, r, dt_) {
  const def = TORRES[t.tipo], min = (dt_.minimo || 0) * CELDA;
  const enAlcance = (e) => {
    if (!e.vivo || (def.noAire && e.vuela)) return false;
    const dd = Math.hypot(e.x - t.x, e.y - t.y);
    return dd <= r && dd >= min;
  };
  if (PEGAJOSO && t.obj && enAlcance(t.obj)) return t.obj;
  const puntaje = PRIORIDAD[def.prioridad || "primero"];
  let mejor = null, mp = -Infinity;
  for (const e of p.enemigos) {
    if (!enAlcance(e)) continue;
    const s = puntaje(e, t);
    if (s > mp) { mp = s; mejor = e; }
  }
  return mejor;
}

// Cuarteles: los soldados frenan a los enemigos del suelo que pasan a su lado y los golpean; si los vencen, el cuartel queda caído 8 s
function cuarteles(p, dt) {
  for (const t of p.torres) {
    const d = datosTorre(t);
    if (!d.bloqueo) continue;
    if (t.caidoT > 0) { t.caidoT -= dt; if (t.caidoT <= 0) { t.hpSol = d.hpSol; p.ev.push({ t: "cuartelListo", x: t.x, y: t.y }); } continue; }
    const r = d.alcance * CELDA;
    t.enganchados = t.enganchados.filter((e) => e.vivo && !e.bloq && Math.hypot(e.x - t.x, e.y - t.y) <= r * 1.25);
    if (t.enganchados.length < d.bloqueo) {
      const libres = p.enemigos.filter((e) => e.vivo && !e.vuela && !e.bloq && !ENEMIGOS[e.tipo].jefe && !t.enganchados.includes(e) && Math.hypot(e.x - t.x, e.y - t.y) <= r)
        .sort((a, b) => b.d - a.d);
      while (t.enganchados.length < d.bloqueo && libres.length) t.enganchados.push(libres.shift());
    }
    for (const e of t.enganchados) {
      e.bloq = true;
      t.hpSol -= ENEMIGOS[e.tipo].dano * 1.5 * dt;
      danar(p, e, d.dano * dt, "fisico", false);
    }
    t.enganchados = t.enganchados.filter((e) => e.vivo);
    if (t.hpSol <= 0) { t.caidoT = 8; t.enganchados = []; p.ev.push({ t: "cuartelCae", x: t.x, y: t.y }); }
  }
}

// Avanza el juego dt segundos (juego-defendercastillo.js lo llama con pasos fijos de 1/60)
export function paso(p, dt) {
  if (p.estado === "ganado" || p.estado === "perdido") return;
  if (p.meteoroEspera > 0) p.meteoroEspera = Math.max(0, p.meteoroEspera - dt);

  // salen enemigos
  if (p.activa) {
    p.t += dt;
    const o = p.nivel.oleadas[p.oleada];
    while (p.cola.length && p.cola[0].t <= p.t) {
      const q = p.cola.shift(), def = ENEMIGOS[q.tipo], hp = Math.round(def.vida * o.vida);
      p.enemigos.push(nuevoEnemigo(p, q.tipo, q.r, hp, o.vida, o.oro || 1, 0));
    }
  }

  for (const e of p.enemigos) e.bloq = false;
  cuarteles(p, dt);

  // caminan
  for (const e of p.enemigos) {
    if (!e.vivo) continue;
    const def = ENEMIGOS[e.tipo];
    if (e.venT > 0) { e.venT -= dt; danar(p, e, e.venDps * (1 - (def.resVen || 0)) * dt, "perfora", false); if (!e.vivo) continue; }
    if (def.regen && e.hp < e.hpMax) e.hp = Math.min(e.hpMax, e.hp + e.hpMax * def.regen * dt);
    if (e.congT > 0) { e.congT -= dt; if (e.congT <= 0) e.inmT = 1.2; } else if (e.inmT > 0) e.inmT -= dt;
    if (e.lentoT > 0) { e.lentoT -= dt; if (e.lentoT <= 0) e.lentoF = 1; }
    if (!(e.congT > 0) && !e.bloq) e.d += def.vel * e.lentoF * dt;
    const ruta = e.vuela ? p.mapa.aire[e.r] : p.mapa.rutas[e.r];
    if (e.d >= ruta.largo) {
      e.vivo = false;
      p.vida = Math.max(0, p.vida - def.dano);
      p.ev.push({ t: "castillo", dano: def.dano });
      if (p.vida <= 0) { p.estado = "perdido"; p.activa = false; p.ev.push({ t: "fin", ganado: false }); }
      continue;
    }
    const pos = posicionEnCamino(ruta, e.d);
    e.x = pos.x; e.y = pos.y;
    if (def.cura) { // el brujo cura a los de alrededor
      e.curaT -= dt;
      if (e.curaT <= 0) {
        e.curaT = def.cura.cada;
        let n = 0;
        for (const o of p.enemigos) if (o !== e && o.vivo && o.hp < o.hpMax && Math.hypot(o.x - e.x, o.y - e.y) <= def.cura.radio * CELDA) { o.hp = Math.min(o.hpMax, o.hp + o.hpMax * def.cura.pct); n++; }
        if (n) p.ev.push({ t: "cura", x: e.x, y: e.y });
      }
    }
  }

  // torres disparan al enemigo que va más adelante dentro de su alcance (según su prioridad)
  for (const t of p.torres) {
    const dt_ = datosTorre(t);
    if (dt_.cadencia === undefined) { t.obj = null; continue; } // minas y cuarteles no disparan
    t.cd -= dt;
    const r = dt_.alcance * CELDA, def = TORRES[t.tipo];
    // la torre apunta (y juego-defendercastillo.js dibuja la flecha) todo el tiempo, también mientras recarga
    const mejor = elegirObjetivo(p, t, r, dt_);
    t.obj = mejor;
    if (mejor) t.ang = Math.atan2(mejor.y - t.y, mejor.x - t.x);
    if (t.cd > 0) continue;
    if (!mejor) { t.cd = 0; continue; }
    t.cd = dt_.cadencia;
    if (dt_.cadena !== undefined) {
      // rayo instantáneo: pega al primero y salta al más cercano que no haya sido golpeado
      const golpeados = [mejor], pts = [{ x: t.x, y: t.y }, { x: mejor.x, y: mejor.y }];
      let lx = mejor.x, ly = mejor.y, da = dt_.dano;
      danar(p, mejor, da, def.td, true);
      for (let j = 0; j < dt_.cadena; j++) {
        da *= 0.8;
        let sig = null, md = dt_.salto * CELDA;
        for (const e of p.enemigos) {
          if (!e.vivo || golpeados.includes(e)) continue;
          const dd = Math.hypot(e.x - lx, e.y - ly);
          if (dd <= md) { md = dd; sig = e; }
        }
        if (!sig) break;
        golpeados.push(sig);
        lx = sig.x; ly = sig.y;
        pts.push({ x: lx, y: ly });
        danar(p, sig, da, def.td, true);
      }
      p.ev.push({ t: "rayo", pts });
      continue;
    }
    p.proyectiles.push({ x: t.x, y: t.y, obj: mejor, tx: mejor.x, ty: mejor.y, dano: dt_.dano, radio: dt_.radio || 0, lento: dt_.lento || 0, tlento: dt_.tlento || 0,
      congela: dt_.congela || 0, veneno: dt_.veneno || null, td: def.td, noAire: !!def.noAire, tipo: t.tipo });
    p.ev.push({ t: "disparo", tipo: t.tipo });
  }

  // proyectiles
  for (const py of p.proyectiles) {
    if (py.obj.vivo) { py.tx = py.obj.x; py.ty = py.obj.y; }
    const dx = py.tx - py.x, dy = py.ty - py.y, dist = Math.hypot(dx, dy), mov = VEL_PROYECTIL * dt;
    if (dist <= mov + 2) { py.fin = true; impacto(p, py); }
    else { py.x += (dx / dist) * mov; py.y += (dy / dist) * mov; py.ang = Math.atan2(dy, dx); }
  }
  p.proyectiles = p.proyectiles.filter((py) => !py.fin);
  p.enemigos = p.enemigos.filter((e) => e.vivo);

  // fin de la oleada
  if (p.activa && !p.cola.length && !p.enemigos.length && p.estado === "oleada") {
    const o = p.nivel.oleadas[p.oleada];
    let minas = 0;
    for (const t of p.torres) {
      const d = datosTorre(t);
      if (d.oroOla) minas += d.oroOla;
      if (d.hpSol) { t.hpSol = d.hpSol; t.caidoT = 0; t.enganchados = []; } // los soldados se recuperan entre oleadas
    }
    p.oleada++;
    p.oro += o.bono + minas;
    p.puntos += 100;
    p.activa = false;
    p.proyectiles = [];
    if (p.oleada >= p.nivel.oleadas.length) {
      p.estado = "ganado";
      p.puntos += p.vida * 5;
      p.ev.push({ t: "fin", ganado: true });
    } else {
      p.estado = "preparando";
      p.ev.push({ t: "oleadaLista", bono: o.bono, minas });
    }
  }
}

// Estrellas según la vida que le queda al castillo al ganar
export const estrellas = (p) => (p.estado !== "ganado" ? 0 : p.vida >= p.nivel.vidaCastillo * 0.8 ? 3 : p.vida >= p.nivel.vidaCastillo * 0.4 ? 2 : 1);
