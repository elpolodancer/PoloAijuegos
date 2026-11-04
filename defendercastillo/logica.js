// Ruta: defendercastillo/logica.js
// Reglas de «Defensa del castillo» (sin pantalla): torres, enemigos, oro, oleadas y daño al castillo.
// juego.js solo dibuja y manda órdenes (colocar, mejorar, vender, iniciarOleada, paso).
// Los números de equilibrio (daño, precios, vida, velocidad) están aquí arriba; las oleadas, en niveles.js.
export const CELDA = 45;
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
    nombre: "Arquero", icono: "🏹", precio: 50, desc: "Barato y rápido",
    niveles: [
      { dano: 9, alcance: 2.4, cadencia: 0.65, sube: 60 },
      { dano: 16, alcance: 2.6, cadencia: 0.55, sube: 110 },
      { dano: 28, alcance: 2.9, cadencia: 0.45, sube: 0 },
    ],
  },
  canon: {
    nombre: "Cañón", icono: "💣", precio: 110, desc: "Daño en área",
    niveles: [
      { dano: 30, alcance: 2.6, cadencia: 2.0, radio: 0.95, sube: 100 },
      { dano: 52, alcance: 2.8, cadencia: 1.8, radio: 1.1, sube: 170 },
      { dano: 85, alcance: 3.0, cadencia: 1.6, radio: 1.25, sube: 0 },
    ],
  },
  mago: {
    nombre: "Mago", icono: "🔮", precio: 100, desc: "Frena a los enemigos",
    niveles: [
      { dano: 12, alcance: 2.3, cadencia: 1.0, lento: 0.55, tlento: 1.6, sube: 90 },
      { dano: 20, alcance: 2.5, cadencia: 0.9, lento: 0.45, tlento: 1.9, sube: 150 },
      { dano: 34, alcance: 2.8, cadencia: 0.8, lento: 0.35, tlento: 2.2, sube: 0 },
    ],
  },
  // Dispara lejos y fuerte pero lento: ideal contra orcos y trolls (poco útil contra montones de goblins)
  ballesta: {
    nombre: "Ballesta", icono: "🎯", precio: 230, desc: "Gran daño y alcance",
    niveles: [
      { dano: 95, alcance: 3.5, cadencia: 2.2, sube: 170 },
      { dano: 160, alcance: 3.8, cadencia: 2.0, sube: 260 },
      { dano: 260, alcance: 4.1, cadencia: 1.8, sube: 0 },
    ],
  },
  // Rayo instantáneo que salta a enemigos cercanos (cada salto pega 20 % menos): ideal contra montones.
  // cadena = cuántos saltos da; salto = distancia máxima de cada salto (celdas)
  rayos: {
    nombre: "Rayos", icono: "⚡", precio: 300, desc: "Salta entre enemigos",
    niveles: [
      { dano: 24, alcance: 2.5, cadencia: 1.15, cadena: 2, salto: 1.3, sube: 230 },
      { dano: 38, alcance: 2.7, cadencia: 1.05, cadena: 3, salto: 1.4, sube: 330 },
      { dano: 58, alcance: 2.9, cadencia: 0.95, cadena: 4, salto: 1.5, sube: 0 },
    ],
  },
};

// Talar: quitar un árbol o roca cuesta monedas y deja el lugar libre para construir
export const COSTE_TALAR = { arbol: 20, roca: 40 };
export const costeTalar = (o) => (o.e === "🪨" ? COSTE_TALAR.roca : COSTE_TALAR.arbol);

// vel en px/s; dano = golpe al castillo si llega; oro = monedas al matarlo
export const ENEMIGOS = {
  goblin: { nombre: "Goblin", icono: "👺", vida: 40, vel: 46, dano: 4, oro: 3, tam: 22 },
  lobo: { nombre: "Lobo", icono: "🐺", vida: 34, vel: 85, dano: 4, oro: 4, tam: 22 },
  orco: { nombre: "Orco", icono: "👹", vida: 220, vel: 32, dano: 10, oro: 11, tam: 28 },
  troll: { nombre: "Troll", icono: "🧌", vida: 2200, vel: 24, dano: 30, oro: 100, tam: 40 },
};

// Un nivel tiene «camino» (una ruta) o «caminos» (varias entradas; los enemigos se reparten entre ellas)
function prepararMapa(nivel) {
  const lista = nivel.caminos || [nivel.camino];
  const rutas = lista.map((cam) => {
    const pts = cam.map(([c, f]) => ({ x: c * CELDA, y: f * CELDA }));
    const segs = [];
    let largo = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a, b, l, ini: largo });
      largo += l;
    }
    return { segs, largo };
  });
  const bloq = Array.from({ length: FILAS }, () => Array(COLS).fill(false));
  for (const cam of lista) {
    for (let i = 0; i < cam.length - 1; i++) {
      const [c1, f1] = cam[i], [c2, f2] = cam[i + 1];
      for (let f = Math.max(0, Math.floor(Math.min(f1, f2))); f <= Math.min(FILAS - 1, Math.floor(Math.max(f1, f2))); f++)
        for (let c = Math.max(0, Math.floor(Math.min(c1, c2))); c <= Math.min(COLS - 1, Math.floor(Math.max(c1, c2))); c++) bloq[f][c] = true;
    }
  }
  const k = nivel.castillo;
  for (let f = k.f; f < k.f + k.h; f++) for (let c = k.c; c < k.c + k.w; c++) bloq[f][c] = true;
  (nivel.obstaculos || []).forEach(([c, f]) => (bloq[f][c] = true));
  return { rutas, bloq };
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

export function nuevaPartida(nivel) {
  return {
    nivel,
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
    estado: "preparando", // preparando | oleada | ganado | perdido
    ev: [],               // eventos para sonido/efectos; juego.js los vacía
    id: 1,
  };
}

export const celdaLibre = (p, c, f) =>
  c >= 0 && c < COLS && f >= 0 && f < FILAS && !p.mapa.bloq[f][c] && !p.torres.some((t) => t.c === c && t.f === f);
export const torreEn = (p, c, f) => p.torres.find((t) => t.c === c && t.f === f) || null;
export const datosTorre = (t) => TORRES[t.tipo].niveles[t.nivel];
export const valorTorre = (t) => t.invertido;

export function colocar(p, tipo, c, f) {
  const def = TORRES[tipo];
  if (!def || p.estado === "ganado" || p.estado === "perdido" || !celdaLibre(p, c, f) || p.oro < def.precio) return null;
  p.oro -= def.precio;
  const t = { id: p.id++, tipo, c, f, x: (c + 0.5) * CELDA, y: (f + 0.5) * CELDA, nivel: 0, cd: 0.3, invertido: def.precio };
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
  p.ev.push({ t: "talar", x: (c + 0.5) * CELDA, y: (f + 0.5) * CELDA, coste });
  return true;
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

function danar(p, e, dano) {
  if (!e.vivo) return;
  e.hp -= dano;
  if (e.hp <= 0) {
    e.vivo = false;
    p.oro += ENEMIGOS[e.tipo].oro;
    p.puntos += 10;
    p.matados++;
    p.ev.push({ t: "muerte", x: e.x, y: e.y, oro: ENEMIGOS[e.tipo].oro, tipo: e.tipo });
  }
}

function frenar(e, lento, tlento) {
  if (!lento) return;
  if (e.lentoT <= 0 || lento < e.lentoF) e.lentoF = lento;
  e.lentoT = Math.max(e.lentoT, tlento);
}

function impacto(p, py) {
  const r = py.radio * CELDA;
  if (py.radio) {
    for (const e of p.enemigos) if (e.vivo && Math.hypot(e.x - py.tx, e.y - py.ty) <= r + 6) { danar(p, e, py.dano); frenar(e, py.lento, py.tlento); }
    p.ev.push({ t: "explosion", x: py.tx, y: py.ty, r });
  } else if (py.obj.vivo) {
    danar(p, py.obj, py.dano);
    frenar(py.obj, py.lento, py.tlento);
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
function elegirObjetivo(p, t, r) {
  const enAlcance = (e) => e.vivo && Math.hypot(e.x - t.x, e.y - t.y) <= r;
  if (PEGAJOSO && t.obj && enAlcance(t.obj)) return t.obj;
  const puntaje = PRIORIDAD[TORRES[t.tipo].prioridad || "primero"];
  let mejor = null, mp = -Infinity;
  for (const e of p.enemigos) {
    if (!enAlcance(e)) continue;
    const s = puntaje(e, t);
    if (s > mp) { mp = s; mejor = e; }
  }
  return mejor;
}

// Avanza el juego dt segundos (juego.js lo llama con pasos fijos de 1/60)
export function paso(p, dt) {
  if (p.estado === "ganado" || p.estado === "perdido") return;
  if (p.meteoroEspera > 0) p.meteoroEspera = Math.max(0, p.meteoroEspera - dt);

  // salen enemigos
  if (p.activa) {
    p.t += dt;
    const o = p.nivel.oleadas[p.oleada];
    while (p.cola.length && p.cola[0].t <= p.t) {
      const q = p.cola.shift(), def = ENEMIGOS[q.tipo], hp = Math.round(def.vida * o.vida);
      p.enemigos.push({ id: p.id++, tipo: q.tipo, r: q.r, hp, hpMax: hp, d: 0, x: 0, y: 0, vivo: true, lentoT: 0, lentoF: 1 });
    }
  }

  // caminan
  for (const e of p.enemigos) {
    if (!e.vivo) continue;
    if (e.lentoT > 0) { e.lentoT -= dt; if (e.lentoT <= 0) e.lentoF = 1; }
    e.d += ENEMIGOS[e.tipo].vel * e.lentoF * dt;
    const ruta = p.mapa.rutas[e.r];
    if (e.d >= ruta.largo) {
      e.vivo = false;
      p.vida = Math.max(0, p.vida - ENEMIGOS[e.tipo].dano);
      p.ev.push({ t: "castillo", dano: ENEMIGOS[e.tipo].dano });
      if (p.vida <= 0) { p.estado = "perdido"; p.activa = false; p.ev.push({ t: "fin", ganado: false }); }
      continue;
    }
    const pos = posicionEnCamino(ruta, e.d);
    e.x = pos.x; e.y = pos.y;
  }

  // torres disparan al enemigo que va más adelante dentro de su alcance
  for (const t of p.torres) {
    t.cd -= dt;
    const dt_ = datosTorre(t), r = dt_.alcance * CELDA;
    // la torre apunta (y juego.js dibuja la flecha) todo el tiempo, también mientras recarga
    const mejor = elegirObjetivo(p, t, r);
    t.obj = mejor;
    if (mejor) t.ang = Math.atan2(mejor.y - t.y, mejor.x - t.x);
    if (t.cd > 0) continue;
    if (!mejor) { t.cd = 0; continue; }
    t.cd = dt_.cadencia;
    if (dt_.cadena !== undefined) {
      // rayo instantáneo: pega al primero y salta al más cercano que no haya sido golpeado
      const golpeados = [mejor], pts = [{ x: t.x, y: t.y }, { x: mejor.x, y: mejor.y }];
      let lx = mejor.x, ly = mejor.y, da = dt_.dano;
      danar(p, mejor, da);
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
        danar(p, sig, da);
      }
      p.ev.push({ t: "rayo", pts });
      continue;
    }
    p.proyectiles.push({ x: t.x, y: t.y, obj: mejor, tx: mejor.x, ty: mejor.y, dano: dt_.dano, radio: dt_.radio || 0, lento: dt_.lento || 0, tlento: dt_.tlento || 0, tipo: t.tipo });
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
    p.oleada++;
    p.oro += o.bono;
    p.puntos += 100;
    p.activa = false;
    p.proyectiles = [];
    if (p.oleada >= p.nivel.oleadas.length) {
      p.estado = "ganado";
      p.puntos += p.vida * 5;
      p.ev.push({ t: "fin", ganado: true });
    } else {
      p.estado = "preparando";
      p.ev.push({ t: "oleadaLista", bono: o.bono });
    }
  }
}

// Estrellas según la vida que le queda al castillo al ganar
export const estrellas = (p) => (p.estado !== "ganado" ? 0 : p.vida >= p.nivel.vidaCastillo * 0.8 ? 3 : p.vida >= p.nivel.vidaCastillo * 0.4 ? 2 : 1);
