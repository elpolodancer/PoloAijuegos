// Ruta: dos/logica-dos.js
// Lógica pura de «Dos» (sin document): casa de 2 pisos, objetos, colisiones y reparto al azar. Mundo de 800×450 por piso.
//   COLISIONES[piso] = rectángulos sólidos (paredes y muebles) · CUARTOS[piso] · ESCALERA · BUNKER
//   generarItems(rand) · mover(x, y, dx, dy, piso) · dentroBunker(x, y, piso) · nombreItem(it) · valorItem(it)
export const W = 800, H = 450, TIEMPO = 120, ESPACIOS = 15, RADIO = 9, VEL = 125;
export const ESCALERA = { x: 600, y: 60, w: 110, h: 50 };      // misma posición en los dos pisos
export const LLEGADA = { x: 655, y: 140 };                      // dónde apareces al cambiar de piso
export const BUNKER = { x: 60, y: 230, w: 130, h: 170 };        // planta baja
export const INICIO = { x: 600, y: 330, piso: 0 };

// ---------- Objetos ----------
// salas = dónde es más probable encontrarlo; n = cuántos hay en la casa; valor = puntos si lo llevas al búnker
export const TIPOS = {
  agua:      { nombre: "Agua",                  valor: 12, n: 5, salas: ["cocina", "bano", "bano1", "comedor", "almacen"] },
  atun:      { nombre: "Lata de atún",          valor: 9,  n: 4, salas: ["cocina", "comedor", "almacen"] },
  frijoles:  { nombre: "Lata de frijoles",      valor: 9,  n: 4, salas: ["cocina", "comedor", "almacen"] },
  tomates:   { nombre: "Lata de tomates",       valor: 8,  n: 4, salas: ["cocina", "comedor", "almacen"] },
  hacha:     { nombre: "Hacha",                 valor: 10, n: 2, salas: ["almacen", "sala", "juegos"] },
  escopeta:  { nombre: "Escopeta",              valor: 6,  n: 2, salas: ["dorm1", "estudio", "almacen"], arma: true, valorCarga: 14 },
  pistola:   { nombre: "Pistola",               valor: 5,  n: 2, salas: ["dorm2", "dorm3", "estudio"], arma: true, valorCarga: 12 },
  cobija:    { nombre: "Cobija",                valor: 8,  n: 3, salas: ["dorm1", "dorm2", "dorm3", "sala"] },
  toallitas: { nombre: "Toallitas húmedas",     valor: 4,  n: 3, salas: ["bano", "bano1", "dorm1"] },
  dulces:    { nombre: "Dulces",                valor: 5,  n: 3, salas: ["sala", "juegos", "cocina", "dorm2"] },
  celular:   { nombre: "Celular",               valor: 3,  n: 2, salas: ["sala", "dorm1", "dorm2", "estudio", "pasillo"] },
  cartas:    { nombre: "Cartas de mesa",        valor: 4,  n: 2, salas: ["sala", "juegos", "comedor"] },
  juego:     { nombre: "Juego de mesa",         valor: 5,  n: 2, salas: ["juegos", "sala", "estudio"] },
  papel:     { nombre: "Papel de baño",         valor: 6,  n: 3, salas: ["bano", "bano1", "almacen"] },
  pasta:     { nombre: "Pasta de dientes",      valor: 5,  n: 2, salas: ["bano", "bano1"] },
  botiquin:  { nombre: "Botiquín",              valor: 15, n: 2, salas: ["bano", "bano1", "cocina", "almacen"] },
  extintor:  { nombre: "Extintor",              valor: 8,  n: 2, salas: ["cocina", "almacen", "pasillo", "rec1"] },
  mascara:   { nombre: "Máscara contra polvo",  valor: 8,  n: 2, salas: ["almacen", "estudio", "dorm3", "sala"] },
};
export const nombreItem = (it) => TIPOS[it.tipo].nombre + (TIPOS[it.tipo].arma ? (it.carga ? " (con balas)" : " (sin balas)") : "");
export const valorItem = (it) => { const t = TIPOS[it.tipo]; return t.arma && it.carga ? t.valorCarga : t.valor; };

// ---------- Paredes ----------
const G = 8; // grosor
function paredH(y, x1, x2, huecos = []) { return corta(x1, x2, huecos).map(([a, b]) => ({ x: a, y: y - G / 2, w: b - a, h: G })); }
function paredV(x, y1, y2, huecos = []) { return corta(y1, y2, huecos).map(([a, b]) => ({ x: x - G / 2, y: a, w: G, h: b - a })); }
function corta(a, b, huecos) { // tramos de a..b que quedan al quitar los huecos (puertas)
  const r = []; let p = a;
  for (const [h1, h2] of [...huecos].sort((u, v) => u[0] - v[0])) { if (h1 > p) r.push([p, h1]); p = h2; }
  if (p < b) r.push([p, b]);
  return r;
}
const caja = (x, y, w, h, t) => ({ x, y, w, h, t });
const marco = () => [...paredH(50, 56, 744), ...paredH(400, 56, 744), ...paredV(60, 50, 400), ...paredV(740, 50, 400)];

// Cada piso: paredes, muebles (sólidos) y cuartos { id, nombre, x, y, w, h, color }
export const PISOS = [
  { // planta baja: almacén, búnker, cocina, comedor, baño, recibidor (escalera) y sala
    nombre: "Planta baja",
    paredes: [...marco(), ...paredV(190, 50, 400, [[120, 160], [300, 340]]), ...paredV(430, 50, 400, [[100, 140], [290, 330]]),
      ...paredH(230, 60, 190), ...paredH(230, 190, 430, [[280, 330]]), ...paredH(200, 430, 740, [[480, 530], [640, 690]]), ...paredV(580, 50, 200, [[100, 140]])],
    muebles: [
      caja(70, 58, 110, 14, "estante"), caja(70, 190, 40, 30, "cajas"),
      caja(68, 240, 36, 62, "literas"), caja(150, 366, 30, 28, "mesa"),
      caja(200, 58, 190, 18, "barra"), caja(270, 130, 80, 50, "mesa"), caja(402, 80, 22, 36, "refri"),
      caja(260, 300, 110, 50, "mesa"), caja(200, 382, 100, 14, "trinchador"),
      caja(440, 58, 100, 34, "bañera"), caja(545, 160, 24, 24, "inodoro"), caja(440, 170, 40, 20, "lavabo"),
      caja(720, 250, 14, 110, "tele"), caja(480, 362, 120, 30, "sofá"), caja(520, 290, 60, 34, "mesita"),
    ],
    cuartos: [
      { id: "almacen", nombre: "Almacén", x: 60, y: 50, w: 130, h: 180, color: "#b59b7a" },
      { id: "bunker", nombre: "BÚNKER", x: 60, y: 230, w: 130, h: 170, color: "#8d9199" },
      { id: "cocina", nombre: "Cocina", x: 190, y: 50, w: 240, h: 180, color: "#e6d8b8" },
      { id: "comedor", nombre: "Comedor", x: 190, y: 230, w: 240, h: 170, color: "#d9b98a" },
      { id: "bano", nombre: "Baño", x: 430, y: 50, w: 150, h: 150, color: "#bfe3ea" },
      { id: "recibidor", nombre: "Recibidor", x: 580, y: 50, w: 160, h: 150, color: "#d6c3a3" },
      { id: "sala", nombre: "Sala", x: 430, y: 200, w: 310, h: 200, color: "#c9a477" },
    ],
  },
  { // piso 1: tres dormitorios, baño, estudio, cuarto de juegos y pasillo
    nombre: "Piso de arriba",
    paredes: [...marco(), ...paredH(190, 60, 740, [[130, 180], [330, 380], [500, 550], [600, 720]]), ...paredH(260, 60, 740, [[150, 200], [380, 430], [600, 650]]),
      ...paredV(260, 50, 190), ...paredV(460, 50, 190), ...paredV(590, 50, 190), ...paredV(300, 260, 400), ...paredV(520, 260, 400)],
    muebles: [
      caja(70, 58, 60, 90, "cama"), caja(225, 58, 28, 60, "closet"),
      caja(330, 58, 70, 90, "cama"), caja(410, 60, 24, 24, "buró"),
      caja(468, 58, 100, 34, "bañera"), caja(556, 120, 22, 22, "inodoro"),
      caja(68, 236, 60, 14, "repisa"),
      caja(70, 340, 90, 50, "cama"), caja(262, 268, 32, 50, "closet"),
      caja(310, 370, 120, 24, "escritorio"), caja(490, 268, 24, 100, "librero"),
      caja(600, 330, 90, 50, "mesa"), caja(530, 380, 60, 14, "sofá"),
    ],
    cuartos: [
      { id: "dorm1", nombre: "Dormitorio 1", x: 60, y: 50, w: 200, h: 140, color: "#d9c3a0" },
      { id: "dorm2", nombre: "Dormitorio 2", x: 260, y: 50, w: 200, h: 140, color: "#d4bd98" },
      { id: "bano1", nombre: "Baño", x: 460, y: 50, w: 130, h: 140, color: "#bfe3ea" },
      { id: "rec1", nombre: "Escalera", x: 590, y: 50, w: 150, h: 140, color: "#d6c3a3" },
      { id: "pasillo", nombre: "Pasillo", x: 60, y: 190, w: 680, h: 70, color: "#c8b08a" },
      { id: "dorm3", nombre: "Dormitorio 3", x: 60, y: 260, w: 240, h: 140, color: "#d9c3a0" },
      { id: "estudio", nombre: "Estudio", x: 300, y: 260, w: 220, h: 140, color: "#cdb48f" },
      { id: "juegos", nombre: "Cuarto de juegos", x: 520, y: 260, w: 220, h: 140, color: "#cfa97a" },
    ],
  },
];
export const COLISIONES = PISOS.map((p) => [...p.paredes, ...p.muebles]);

// ---------- Colisiones ----------
export function choca(x, y, piso, r = RADIO) {
  for (const b of COLISIONES[piso]) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w)), cy = Math.max(b.y, Math.min(y, b.y + b.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
  }
  return false;
}
// Mueve por ejes separados para deslizar junto a las paredes
export function mover(x, y, dx, dy, piso) {
  if (!choca(x + dx, y, piso)) x += dx;
  if (!choca(x, y + dy, piso)) y += dy;
  return { x, y };
}
export const dentroDe = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export const dentroBunker = (x, y, piso) => piso === 0 && dentroDe(x, y, BUNKER);

// ---------- Reparto al azar ----------
export function generarItems(rand = Math.random) {
  const items = [];
  const cuartos = PISOS.flatMap((p, piso) => p.cuartos.filter((c) => c.id !== "bunker").map((c) => ({ ...c, piso })));
  let id = 0;
  for (const [tipo, t] of Object.entries(TIPOS)) {
    for (let k = 0; k < t.n; k++) {
      const pref = cuartos.filter((c) => t.salas.includes(c.id));
      for (let intento = 0; intento < 200; intento++) {
        const c = rand() < 0.7 && pref.length ? pref[Math.floor(rand() * pref.length)] : cuartos[Math.floor(rand() * cuartos.length)];
        const x = c.x + 14 + rand() * (c.w - 28), y = c.y + 14 + rand() * (c.h - 28);
        if (choca(x, y, c.piso, 13)) continue;
        if (dentroDe(x, y, { x: ESCALERA.x - 14, y: ESCALERA.y - 14, w: ESCALERA.w + 28, h: ESCALERA.h + 28 })) continue;
        if (items.some((o) => o.piso === c.piso && Math.hypot(o.x - x, o.y - y) < 26)) continue;
        const it = { id: id++, tipo, x, y, piso: c.piso };
        if (t.arma) it.carga = rand() < 0.5;
        items.push(it); break;
      }
    }
  }
  return items;
}
