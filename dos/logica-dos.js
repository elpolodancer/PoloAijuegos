// Ruta: dos/logica-dos.js
// Lógica pura de «Dos» (sin document): casa de 2 pisos, objetos, colisiones y reparto al azar. Mundo de 800×450 por piso.
//   COLISIONES[piso] = rectángulos sólidos (paredes y muebles) · CUARTOS[piso] · ESCALERA · BUNKER (centro de la planta baja) · PUERTA_BUNKER
//   generarItems(rand) · mover(x, y, dx, dy, piso) · dentroBunker(x, y, piso) · nombreItem(it) · valorItem(it)
//   REFUGIO (piso 2: la habitación de abajo del búnker) · ESTANTES · MESA · RANURAS · acomodarEnRefugio(lista) · ranuraLibre(tipo, x, y, ocupadas)
export const W = 800, H = 450, TIEMPO = 120, ESPACIOS = 15, RADIO = 9, VEL = 125;
export const ESCALERA = { x: 600, y: 60, w: 110, h: 50 };      // misma posición en los dos pisos
export const LLEGADA = { x: 655, y: 140 };                      // dónde apareces al cambiar de piso
export const BUNKER = { x: 280, y: 140, w: 240, h: 170 };       // planta baja: en el CENTRO de la casa (la casa va de 60 a 740 en x y de 50 a 400 en y)
export const PUERTA_BUNKER = { x: 516, y: 215, w: 8, h: 50 };   // umbral en la pared este del búnker (se abre a la sala); debe coincidir con el hueco [215, 265] de la pared x = 520
export const INICIO = { x: 600, y: 330, piso: 0 };

// ---------- Objetos ----------
// salas = dónde es más probable encontrarlo; n = cuántos hay en la casa; valor = puntos si lo llevas al búnker;
// zona = dónde se acomoda en el refugio: "estante" (por defecto) o "mesa" (cosas de ocio)
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
  cartas:    { nombre: "Cartas de mesa",        valor: 4,  n: 2, salas: ["sala", "juegos", "comedor"], zona: "mesa" },
  juego:     { nombre: "Juego de mesa",         valor: 5,  n: 2, salas: ["juegos", "sala", "estudio"], zona: "mesa" },
  papel:     { nombre: "Papel de baño",         valor: 6,  n: 3, salas: ["bano", "bano1", "almacen"] },
  pasta:     { nombre: "Pasta de dientes",      valor: 5,  n: 2, salas: ["bano", "bano1"] },
  botiquin:  { nombre: "Botiquín",              valor: 15, n: 2, salas: ["bano", "bano1", "cocina", "almacen"] },
  extintor:  { nombre: "Extintor",              valor: 8,  n: 2, salas: ["cocina", "almacen", "pasillo", "rec1"] },
  mascara:   { nombre: "Máscara contra polvo",  valor: 8,  n: 2, salas: ["almacen", "estudio", "dorm3", "sala"] },
  cigarros:  { nombre: "Cigarros",               valor: 4,  n: 2, salas: ["sala", "estudio", "dorm1", "cocina"], zona: "mesa" },
  encendedor: { nombre: "Encendedor",            valor: 4,  n: 2, salas: ["cocina", "sala", "estudio", "pasillo"], zona: "mesa" },
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
  { // planta baja: el BÚNKER ocupa el centro de la casa y las demás habitaciones lo rodean
    //   Almacén  |  Cocina    | Recibidor (escalera)
    //            |------------|
    //   ---------|  BÚNKER    |---------
    //   Comedor  |------------|   Sala
    //            |  Baño      |
    // Puertas: almacén↔cocina, almacén↔comedor, comedor↔baño, baño↔sala, sala↔recibidor, recibidor↔cocina y sala↔búnker (la única del búnker).
    nombre: "Planta baja",
    paredes: [...marco(),
      ...paredV(280, 50, 400, [[80, 120], [335, 375]]),
      ...paredV(520, 50, 400, [[80, 120], [215, 265], [335, 375]]),   // [215, 265] = puerta del búnker
      ...paredH(140, 280, 520), ...paredH(310, 280, 520),             // paredes norte y sur del búnker (sin puertas)
      ...paredH(220, 60, 280, [[110, 160]]), ...paredH(200, 520, 740, [[630, 690]])],
    muebles: [
      caja(70, 58, 110, 14, "estante"), caja(214, 58, 56, 14, "estante"), caja(70, 178, 40, 30, "cajas"), caja(218, 176, 40, 34, "cajas"),   // almacén
      caja(100, 290, 110, 50, "mesa"), caja(70, 382, 100, 14, "trinchador"),                                                                  // comedor
      caja(296, 58, 150, 14, "barra"), caja(492, 58, 22, 24, "refri"),                                                                                    // cocina
      caja(288, 152, 44, 66, "literas"), caja(288, 228, 44, 66, "literas"), caja(350, 150, 120, 14, "estante"),                               // búnker
      caja(385, 236, 80, 40, "mesa"), caja(474, 150, 38, 34, "cajas"),
      caja(300, 316, 100, 30, "bañera"), caja(410, 318, 40, 20, "lavabo"), caja(460, 318, 24, 24, "inodoro"),                                // baño
      caja(540, 150, 50, 30, "mesita"),                                                                                                      // recibidor
      caja(722, 250, 14, 110, "tele"), caja(560, 362, 120, 30, "sofá"), caja(610, 280, 60, 34, "mesita"),                                    // sala
    ],
    // rot = dónde va el rótulo dentro del cuarto (por defecto arriba a la izquierda)
    cuartos: [
      { id: "almacen", nombre: "Almacén", x: 60, y: 50, w: 220, h: 170, color: "#b59b7a" },
      { id: "comedor", nombre: "Comedor", x: 60, y: 220, w: 220, h: 180, color: "#d9b98a" },
      { id: "cocina", nombre: "Cocina", x: 280, y: 50, w: 240, h: 90, color: "#e6d8b8", rot: [100, 44] },
      { id: "bunker", nombre: "BÚNKER", x: 280, y: 140, w: 240, h: 170, color: "#8d9199", rot: [100, 148] },
      { id: "bano", nombre: "Baño", x: 280, y: 310, w: 240, h: 90, color: "#bfe3ea", rot: [108, 50] },
      { id: "recibidor", nombre: "Recibidor", x: 520, y: 50, w: 220, h: 150, color: "#d6c3a3" },
      { id: "sala", nombre: "Sala", x: 520, y: 200, w: 220, h: 200, color: "#c9a477" },
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
// ---------- Refugio: la habitación a la que se baja por las escaleras del búnker ----------
// Es el «piso 2» (PISO_REFUGIO). No se llega caminando: se baja al terminar los 2 minutos estando dentro del búnker (bajarAlRefugio en juego-dos.js).
// Todo lo que se va a cambiar con el tiempo está en estas constantes: cuántos estantes, tablas y huecos hay (ESTANTES), la mesa (MESA)
// y qué va dónde (TIPOS[...].zona). Cada lugar donde puede quedar un objeto es una «ranura» (RANURAS).
export const PISO_REFUGIO = 2;
export const ESCALERA_REFUGIO = { x: 610, y: 120, w: 110, h: 50 };   // por donde bajaste (solo dibujo y sólido: no se puede volver a subir)
export const LLEGADA_REFUGIO = { x: 665, y: 205 };                   // dónde apareces, al pie de la escalera
// Estantes en fila contra la pared norte: n estantes, cada uno con «tablas» tablas y cada tabla con «huecos» objetos.
// dx = separación entre objetos, margen = borde de la tabla, z0 = altura de la tabla de abajo, dz = altura entre tablas.
export const ESTANTES = { n: 5, tablas: 5, huecos: 5, dx: 18, margen: 12, separacion: 10, x0: 70, y: 114, h: 18, z0: 6, dz: 17 };
ESTANTES.w = 2 * ESTANTES.margen + (ESTANTES.huecos - 1) * ESTANTES.dx;   // el ancho sale de cuántos huecos tiene
ESTANTES.paso = ESTANTES.w + ESTANTES.separacion;                           // de un estante al siguiente
export const MESA = { x: 280, y: 270, w: 170, h: 44, cols: 8, filas: 2, z: 12 };   // mesa de ocio: cols × filas ranuras sobre la tapa
export const rectEstante = (e) => ({ x: ESTANTES.x0 + e * ESTANTES.paso, y: ESTANTES.y, w: ESTANTES.w, h: ESTANTES.h });
export const ALTO_ESTANTE = ESTANTES.z0 + (ESTANTES.tablas - 1) * ESTANTES.dz + 8;

// Ranura = { i, zona: "estante"|"mesa", x, y, z, ... }. Orden: estante 0 (tabla de abajo, de izquierda a derecha, luego la siguiente tabla…), después la mesa.
// tabla t = 0 es la de abajo. x, y = dónde queda el objeto en la casa plana; z = a qué altura.
export const RANURAS = [];
for (let e = 0; e < ESTANTES.n; e++) {
  const r = rectEstante(e);
  for (let t = 0; t < ESTANTES.tablas; t++) for (let h = 0; h < ESTANTES.huecos; h++)
    RANURAS.push({ i: RANURAS.length, zona: "estante", e, t, h, x: r.x + ESTANTES.margen + h * ESTANTES.dx, y: r.y + 12, z: ESTANTES.z0 + t * ESTANTES.dz });
}
for (let f = 0; f < MESA.filas; f++) for (let c = 0; c < MESA.cols; c++)
  RANURAS.push({ i: RANURAS.length, zona: "mesa", f, c, x: MESA.x + 12 + c * ((MESA.w - 24) / (MESA.cols - 1)), y: MESA.y + 10 + f * 22, z: MESA.z });

export const REFUGIO = {
  nombre: "Refugio",
  paredes: [...paredH(110, 56, 744), ...paredH(400, 56, 744), ...paredV(60, 110, 400), ...paredV(740, 110, 400)],
  muebles: [],
  // sólidos que se dibujan aparte (estantes, mesa y escalera): solo cuentan para las colisiones
  solidos: [...Array.from({ length: ESTANTES.n }, (_, e) => rectEstante(e)), { x: MESA.x, y: MESA.y, w: MESA.w, h: MESA.h }, ESCALERA_REFUGIO],
  cuartos: [{ id: "refugio", nombre: "Refugio", x: 60, y: 110, w: 680, h: 290, color: "#8f8a82", rot: [8, 276] }],
};
export const ESCENAS = [...PISOS, REFUGIO];   // índice = piso (0, 1 y 2 = refugio). generarItems solo usa PISOS
export const COLISIONES = ESCENAS.map((p) => [...p.paredes, ...p.muebles, ...(p.solidos || [])]);

export const zonaDe = (tipo) => TIPOS[tipo].zona || "estante";
// Acomoda la lista de objetos salvados en el refugio: los agrupa por tipo (orden de TIPOS) y llena estantes o mesa según su zona.
// Si la mesa se llena, lo de ocio pasa a los estantes. Devuelve los que no cupieron (con el tamaño actual no pasa).
export function acomodarEnRefugio(lista) {
  const libres = { estante: RANURAS.filter((r) => r.zona === "estante"), mesa: RANURAS.filter((r) => r.zona === "mesa") };
  const orden = Object.keys(TIPOS), sobran = [];
  for (const it of [...lista].sort((a, b) => orden.indexOf(a.tipo) - orden.indexOf(b.tipo))) {
    const r = libres[zonaDe(it.tipo)].shift() || libres.estante.shift();
    if (!r) { sobran.push(it); continue; }
    Object.assign(it, { piso: PISO_REFUGIO, ranura: r.i, x: r.x, y: r.y, z: r.z });
  }
  return sobran;
}
// Ranura libre más cercana a (x, y) de la zona de ese objeto (si no hay, de los estantes). ocupadas = Set con los índices en uso. null si no hay lugar.
export function ranuraLibre(tipo, x, y, ocupadas) {
  const zonas = zonaDe(tipo) === "mesa" ? ["mesa", "estante"] : ["estante"];
  for (const z of zonas) {
    let mejor = null, d = Infinity;
    for (const r of RANURAS) {
      if (r.zona !== z || ocupadas.has(r.i)) continue;
      const k = Math.hypot(r.x - x, r.y - y) + r.z * 0.001;   // a igual distancia, la tabla más baja
      if (k < d) { d = k; mejor = r; }
    }
    if (mejor) return mejor;
  }
  return null;
}

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
// Dentro del búnker = con el centro del personaje pasado el umbral (un poco adentro de las paredes)
export const dentroBunker = (x, y, piso) => piso === 0 && dentroDe(x, y, { x: BUNKER.x + 4, y: BUNKER.y + 4, w: BUNKER.w - 8, h: BUNKER.h - 8 });

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
