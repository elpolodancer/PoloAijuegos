// Ruta: guerrerodepuntos/niveles-guerrerodepuntos.js
// Niveles del juego. En vez de dibujar cada zona a mano, el mapa se GENERA con una semilla fija
// (siempre sale el mismo mapa). Cambia la semilla o los números de abajo para obtener otro mapa.
//
// Reglas que el generador garantiza (el nivel siempre se puede ganar):
//  - Vences a un enemigo solo si tu nivel es MAYOR que el suyo, y su nivel se suma al tuyo.
//  - Existe un orden para comerte a los enemigos «principales» de modo que cada uno es más débil que tú en ese momento.
//  - Los guardianes, fortalezas y trampas están fuera del camino obligatorio o pensados con margen.
//
// Tipos de zona:
//  - normal:    enemigo pequeño o mediano. Son el camino para crecer.
//  - fortaleza: enemigo ENORME (de 2 a 4 veces tu nivel de cuando lo encuentras). Opcional: te da un salto gigante al vencerlo.
//  - pozo:      zona que parece vacía; al pisarla caes y regresas al inicio (sin perder nivel). Se queda marcada.
//  - veneno:    zona que parece vacía; al pisarla pierdes el 10 % de tu nivel (una sola vez).
//  - vacía:     zona sin nada (descanso).
//  - guardián:  enemigo muy fuerte que cuida la salida.

export const NIVEL_INICIAL = 5;

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generar(o) {
  const N = o.principales;
  const r = azar(o.semilla);
  const DMIN = 92;
  const zs = [{ x: 0, y: 0, rol: "inicio", padre: -1 }];

  function colocar(p, angBase) {
    let x = 0, y = 0;
    for (let t = 0; t < 400; t++) {
      const ang = angBase === undefined ? r() * Math.PI * 2 : angBase + (r() - 0.5) * 1.6;
      const d = 105 + r() * 50 + t * 1.2;
      x = zs[p].x + Math.cos(ang) * d;
      y = zs[p].y + Math.sin(ang) * d;
      if (zs.every((z) => Math.hypot(z.x - x, z.y - y) >= DMIN)) break;
    }
    return { x, y };
  }

  // 1) Zonas principales: cada una se pega a una anterior (casi siempre a una reciente, para formar caminos largos con ramas)
  for (let i = 1; i <= N; i++) {
    const k = Math.floor(r() * r() * Math.min(i, 12));
    const p = i - 1 - k;
    zs.push({ ...colocar(p), rol: "normal", padre: p, u: r(), g: r() });
  }

  // 2) Guardián (en la zona principal más lejana al inicio) y salida detrás de él
  let lejos = 1;
  for (let i = 1; i <= N; i++) if (Math.hypot(zs[i].x, zs[i].y) > Math.hypot(zs[lejos].x, zs[lejos].y)) lejos = i;
  const ang = Math.atan2(zs[lejos].y, zs[lejos].x);
  const iG = zs.length;
  zs.push({ ...colocar(lejos, ang), rol: "guardian", padre: lejos });
  const iS = zs.length;
  zs.push({ ...colocar(iG, ang), rol: "salida", padre: iG });

  // 3) Hojas opcionales pegadas a zonas principales (no al inicio)
  const hoja = (rol, extra) => {
    const p = 3 + Math.floor(r() * (N - 2));
    zs.push({ ...colocar(p), rol, padre: p, ...extra });
  };
  for (let i = 0; i < o.fortalezas; i++) hoja("fortaleza", { h: r() });
  for (let i = 0; i < o.pozos; i++) hoja("pozo");
  for (let i = 0; i < o.venenos; i++) hoja("veneno");
  for (let i = 0; i < o.vacias; i++) hoja("vacia");

  // 4) Puentes: el árbol + atajos extra entre zonas cercanas (sin trampas ni guardián)
  const enlaces = [];
  const unido = new Set();
  const clave = (a, b) => (a < b ? a + "-" + b : b + "-" + a);
  const unir = (a, b) => { unido.add(clave(a, b)); enlaces.push([a, b]); };
  for (let i = 1; i < zs.length; i++) unir(i, zs[i].padre);
  const ok = (z) => z.rol === "normal" || z.rol === "fortaleza" || z.rol === "inicio";
  for (let a = 0; a < zs.length; a++) {
    for (let b = a + 1; b < zs.length; b++) {
      if (!ok(zs[a]) || !ok(zs[b]) || unido.has(clave(a, b))) continue;
      if (Math.hypot(zs[a].x - zs[b].x, zs[a].y - zs[b].y) < 150 && r() < 0.3) unir(a, b);
    }
  }

  // 5) Niveles de los enemigos. Con «fb» más grande, los enemigos son más fuertes y se crece más rápido.
  // Cada enemigo es más débil que tú aunque ya hubieras caído en TODOS los venenos (SEG): así el nivel nunca se atora.
  const SEG = Math.pow(0.9, o.venenos);
  function calcular(fb) {
    let S = NIVEL_INICIAL;
    const e = [], antes = [];
    for (let i = 1; i <= N; i++) {
      const z = zs[i];
      const puerta = z.g < 0.12; // algunos enemigos «puerta» valen mucho (más de la mitad de tu nivel)
      const f = puerta ? 0.5 + 0.3 * (z.g / 0.12) : fb * (0.4 + 1.2 * z.u);
      const tope = Math.max(1, Math.floor(S * SEG) - 1);
      e[i] = Math.min(tope, Math.max(2, Math.round(S * f)));
      antes[i] = S;
      S += e[i];
    }
    return { e, antes, S };
  }
  let lo = 0.001, hi = 2;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (calcular(mid).S < o.meta) lo = mid; else hi = mid;
  }
  const res = calcular(hi);

  for (let i = 1; i <= N; i++) zs[i].enemigo = res.e[i];
  zs[iG].enemigo = Math.max(1, Math.floor(res.S * SEG) - 1);
  zs.forEach((z) => {
    if (z.rol === "fortaleza") z.enemigo = Math.round(res.antes[z.padre] * (2 + 2 * z.h));
    if (z.rol === "pozo" || z.rol === "veneno") z.trampa = z.rol;
  });

  // 6) Mover todo para que las coordenadas sean positivas
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  zs.forEach((z) => { x0 = Math.min(x0, z.x); y0 = Math.min(y0, z.y); x1 = Math.max(x1, z.x); y1 = Math.max(y1, z.y); });
  const M = 90;
  const zonas = zs.map((z) => {
    const o2 = { x: Math.round(z.x - x0 + M), y: Math.round(z.y - y0 + M) };
    if (z.enemigo != null) o2.enemigo = z.enemigo;
    if (z.trampa) o2.trampa = z.trampa;
    return o2;
  });
  return {
    nombre: o.nombre,
    pista: o.pista,
    zonas,
    enlaces,
    salida: iS,
    ancho: Math.round(x1 - x0 + M * 2),
    alto: Math.round(y1 - y0 + M * 2),
    nivelMaximoAprox: res.S,
  };
}

export const NIVELES = [
  generar({
    nombre: "Tierras salvajes",
    pista: "Cuidado: una zona vacía puede ser una trampa. Rodea a los monstruos rojos y busca otros caminos.",
    semilla: 20261104,
    principales: 100,  // zonas con enemigos que forman el camino para crecer
    meta: 220000,      // nivel aproximado al comerte todas las principales (con el guardián y las fortalezas llegas cerca de 1 millón)
    fortalezas: 16,    // monstruos gigantes opcionales
    pozos: 12,         // trampas que te mandan al inicio
    venenos: 4,        // trampas que te quitan el 10 % del nivel
    vacias: 8,         // zonas sin nada
  }),
];
