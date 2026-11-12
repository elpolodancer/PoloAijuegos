// Ruta: supervivencia/zonas-supervivencia.js
// SOLO DATOS (sin document): las zonas del MAPA GENERAL, a las que se viaja al salir de la base (README 6.2, 6.3, 6.4, 7.4–7.5).
//   Pinos al ESTE · Caliza (piedra y mucho hierro) al OESTE · Búnker al NORTE (vacío por ahora).
// null = dato que el README deja en ❓ o en «—». est:true = cifra MÍA (💡), no sale de tu README.
// pos = lugar en el mapa general, de 0 a 1 (x → derecha, y → abajo). La distancia al centro sigue 12 : 19 : 28 min (6.2).

export const DIFICULTADES = {
  verde:   { nombre: "Fácil",   color: "#3fbf5f", energia: 15 },   // 6.4
  naranja: { nombre: "Medio",   color: "#f0922b", energia: 22 },
  roja:    { nombre: "Difícil", color: "#e04b3a", energia: 33 },
};

export const BASE = { id: "base", nombre: "Tu base", ico: "🏠", pos: { x: 0.5, y: 0.56 }, lado: 35 };   // el mundo de 35×35 de hoy

// minutos = distancia relativa del original (12/19/28); viajeSeg = lo que dura el viaje en el juego (💡 est, 6.6: «comprimirlo»)
export const ZONAS = [
  // ---------- 🌲 Pino (este) ----------
  { id: "pino-verde", nombre: "Arbustos y Pinos", tipo: "pino", dificultad: "verde", ico: "🌲", lado: 30, minutos: 12, energia: 15, nivelJugador: null, viajeSeg: 3,
    pos: { x: 0.65, y: 0.46 }, rumbo: "este",
    recursos: { arbolesVivos: 27, arbolesMuertos: 3, fibra: 20, bayas: 30, caliza: 21, rocas: 9, hierro: 0 },
    nota: "6.5-1: «51 + 19 leños» no cuadra con 51 + 9; aquí se guardan 27 vivos + 3 muertos. «9 + 21 caliza» se tomó como 9 rocas + 21 sueltas (❓).",
    botin: { nivel: 1, cajas: [2, 3] }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris"] },
  { id: "pino-naranja", nombre: "Arboleda de Pinos", tipo: "pino", dificultad: "naranja", ico: "🌲", lado: 30, minutos: 19, energia: 22, nivelJugador: 10, viajeSeg: 5,
    pos: { x: 0.78, y: 0.65 }, rumbo: "este",
    recursos: { arbolesVivos: 54, arbolesMuertos: 6, fibra: 40, bayas: 30, caliza: null, rocas: null, hierro: 0 }, est: true,
    nota: "«~100 % más madera que Arbustos» → el doble de árboles (est). Piedra: «más que Arbustos», sin cifra (❓).",
    botin: { nivel: 2, cajas: [3, 4] }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris", "escupidor-toxico", "aplastador-orondo"], extra: { "escupidor-toxico": [1, 2], "aplastador-orondo": [1, 2] } },
  { id: "pino-roja", nombre: "Bosque de Pinos", tipo: "pino", dificultad: "roja", ico: "🌲", lado: 40, minutos: 28, energia: 33, nivelJugador: null, viajeSeg: 8,
    pos: { x: 0.88, y: 0.44 }, rumbo: "este",
    recursos: { arbolesVivos: 108, arbolesMuertos: 12, fibra: 60, bayas: 30, caliza: null, rocas: null, hierro: 0 }, est: true,
    nota: "«Madera máxima» sin cifra: se dobló la de la naranja (est).",
    botin: { nivel: 3, cajas: [3, 4] }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris", "escupidor-toxico", "aplastador-orondo", "the-big-one"] },

  // ---------- 🪨 Caliza (oeste): piedra y MUCHO hierro ----------
  { id: "caliza-verde", nombre: "Risco de Caliza", tipo: "caliza", dificultad: "verde", ico: "🪨", lado: 30, minutos: 12, energia: 15, nivelJugador: null, viajeSeg: 3,
    pos: { x: 0.35, y: 0.46 }, rumbo: "oeste",
    recursos: { rocas: 25, caliza: 20, hierro: 5, arbolesVivos: 7, arbolesMuertos: 0, fibra: null, bayas: null },
    botin: { nivel: 1, cajas: [3, 4], contenido: "comida, agua, recursos bajos" }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris"] },
  { id: "caliza-naranja", nombre: "Acantilados de Caliza", tipo: "caliza", dificultad: "naranja", ico: "🪨", lado: 30, minutos: 19, energia: 22, nivelJugador: null, viajeSeg: 5,
    pos: { x: 0.22, y: 0.65 }, rumbo: "oeste",
    recursos: { rocas: 20, caliza: 30, hierro: 30, arbolesVivos: 10, arbolesMuertos: 0, fibra: null, bayas: null },
    botin: { nivel: 2, cajas: [3, 4] }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris", "lobo-rabioso", "escupidor-toxico", "aplastador-orondo"], extra: { "escupidor-toxico": [1, 2], "aplastador-orondo": [1, 2] } },
  { id: "caliza-roja", nombre: "Torres de Caliza", tipo: "caliza", dificultad: "roja", ico: "🪨", lado: 40, minutos: 28, energia: 33, nivelJugador: null, viajeSeg: 8,
    pos: { x: 0.12, y: 0.44 }, rumbo: "oeste",
    recursos: { rocas: 40, caliza: 60, hierro: 50, arbolesVivos: 0, arbolesMuertos: 0, fibra: null, bayas: null }, est: true,
    nota: "Piedra «100 % más» y hierro «66 % más» que Acantilados (6.3): 50→100 de piedra (40 rocas + 60 sueltas, est) y 30→50 de hierro. Sin árboles («—»).",
    botin: { nivel: 3, cajas: [3, 4], contenido: "Katana, Glock 17, etc." }, enemigos: ["zombi-errante", "mordedor-rapido", "lobo-gris", "horda"] },

  // ---------- ☢️ Búnker (norte): EXISTE en el mapa pero todavía está VACÍO ----------
  { id: "bunker-bravo", nombre: "Búnker Bravo", tipo: "bunker", dificultad: null, ico: "☢️", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.50, y: 0.17 }, rumbo: "norte", vacio: true,
    recursos: {}, botin: null, enemigos: [],
    nota: "5.4 / 5.9-10: el README solo dice que existe (ropa NRBQ). Sin tamaño, costo, nivel ni contenido: todo ❓. La posición al norte es mía." },

  // ---------- 📍 Ubicaciones especiales (README 8.5 y 9.5). Existen en el mapa pero están VACÍAS por ahora ----------
  // `enemigosPrevistos` = lo que el README dice que vive ahí (ver ENEMIGOS_ESPECIALES); NO aparecen todavía (enemigos: []).
  // lado / energía / nivel / recursos: el README no los trae → null (❓). Un viaje con energía null no cuesta nada.
  { id: "bunker-alfa", nombre: "Búnker Alfa", tipo: "bunker", dificultad: null, ico: "☣️", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.30, y: 0.15 }, rumbo: "norte", vacio: true, recursos: {}, botin: null, enemigos: [],
    enemigosPrevistos: ["frenzied-giant", "numb-zombie", "the-blind-one"],
    previsto: { modoDificil: "The Blind One solo en Modo Difícil, piso 3 (8.5); la Key Card A+ (9.5) da arma de fuego y set CBRN",
      canje: [{ cupon: "Ration Coupon", cuesta: 20, caja: "Ration Box" }, { cupon: "Survival Kit Coupon", cuesta: 25, caja: "Survival Kit Box" }, { cupon: "Combat Gear Coupon", cuesta: 30, caja: "Combat Gear Box" }] },
    nota: "9.8: los cupones solo sirven aquí; 💡 quedan fuera hasta que haya una estación de canje. Se junta con la ropa NRBQ (5.4). Posición al noroeste: mía." },
  { id: "granja-crooked-creek", nombre: "Granja Crooked Creek", tipo: "granja", dificultad: null, ico: "🚜", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.64, y: 0.74 }, rumbo: "sur", vacio: true, recursos: {}, botin: null, enemigos: [],
    enemigosPrevistos: ["infected-bull", "savage-giant", "rotten-yokel", "lobo-enfermo", "ravager"], jefe: "ravager",
    nota: "«Crooked Creek Farm» (8.5). Jefe: Ravager (2000 de vida). Sin recursos ni cajas en el README. Posición al sur: mía." },
  { id: "comisaria-blackport", nombre: "Comisaría Blackport", tipo: "policia", dificultad: null, ico: "🚓", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.38, y: 0.74 }, rumbo: "sur", vacio: true, recursos: {}, botin: null, enemigos: [],
    enemigosPrevistos: ["brawler", "explosive-zombie", "hungry-chomper", "riot-zombie"],
    nota: "«Blackport PD» (8.5). El README solo trae sus enemigos. Posición al sur: mía." },
  // Atalayas: el README NO dice nada de ellas (ni nombre, ni enemigos, ni botín). Dos zonas vacías para rellenar (nombres neutros: 1 y 2).
  { id: "atalaya-1", nombre: "Atalaya 1", tipo: "atalaya", dificultad: null, ico: "🗼", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.10, y: 0.18 }, rumbo: "oeste", vacio: true, recursos: {}, botin: null, enemigos: [], enemigosPrevistos: [],
    nota: "Sin datos en el README: nombre, lugar y todo lo demás son 💡 míos." },
  { id: "atalaya-2", nombre: "Atalaya 2", tipo: "atalaya", dificultad: null, ico: "🗼", lado: null, minutos: null, energia: null, nivelJugador: null, viajeSeg: 4,
    pos: { x: 0.90, y: 0.18 }, rumbo: "este", vacio: true, recursos: {}, botin: null, enemigos: [], enemigosPrevistos: [],
    nota: "Sin datos en el README: nombre, lugar y todo lo demás son 💡 míos." },
];

// ---------- Enemigos de las ubicaciones especiales (README 8.5; Lobo Enfermo de 8.4). Aún no hay combate: solo datos ----------
// vida/vel/dano: número, [mín, máx] o null si el README pone «—». vel en unidades/seg (jugador ≈ 40, 1 casilla = 20 u).
export const ENEMIGOS_ESPECIALES = {
  "frenzied-giant":   { nombre: "Frenzied Giant",   vida: 500,        vel: null,    dano: 200,       velTxt: "lenta; muy rápida en Modo Difícil" },
  "the-blind-one":    { nombre: "The Blind One",    vida: 1000,       vel: 43,      dano: 50,        velTxt: null, nota: "Solo Modo Difícil, piso 3" },
  "numb-zombie":      { nombre: "Numb Zombie",      vida: 120,        vel: 42,      dano: 12 },
  "brawler":          { nombre: "Brawler",          vida: 240,        vel: null,    dano: 30 },
  "explosive-zombie": { nombre: "Explosive Zombie", vida: [100, 150], vel: null,    dano: [6, 30] },
  "hungry-chomper":   { nombre: "Hungry Chomper",   vida: 240,        vel: null,    dano: [15, 30],  velTxt: "normal y luego lenta" },
  "riot-zombie":      { nombre: "Riot Zombie",      vida: 150,        vel: null,    dano: [20, 30],  velTxt: "lenta" },
  "infected-bull":    { nombre: "Infected Bull",    vida: 300,        vel: 15,      dano: 200 },
  "savage-giant":     { nombre: "Savage Giant",     vida: 250,        vel: 20,      dano: 100 },
  "ravager":          { nombre: "Ravager",          vida: 2000,       vel: [9, 43], dano: 20,        nota: "Jefe de la granja" },
  "rotten-yokel":     { nombre: "Rotten Yokel",     vida: 150,        vel: 43,      dano: 6 },
  "lobo-enfermo":     { nombre: "Lobo Enfermo",     vida: 100,        vel: 57,      dano: 30 },
};

const PORID = new Map([[BASE.id, BASE], ...ZONAS.map((z) => [z.id, z])]);
export const zona = (id) => PORID.get(id) || null;
export const zonasDe = (tipo) => ZONAS.filter((z) => z.tipo === tipo);
// Costo real de un viaje: null (búnker sin decidir) cuenta como 0
export const costoEnergia = (z) => (z && z.energia > 0 ? z.energia : 0);

export function validarZonas() {
  const mal = [], ids = new Set();
  for (const z of ZONAS) {
    if (ids.has(z.id)) mal.push("repetida " + z.id); ids.add(z.id);
    if (!(z.pos.x > 0 && z.pos.x < 1 && z.pos.y > 0 && z.pos.y < 1)) mal.push("pos fuera de 0..1 " + z.id);
    if (z.dificultad && !DIFICULTADES[z.dificultad]) mal.push("dificultad " + z.id);
    if (z.dificultad && z.energia !== DIFICULTADES[z.dificultad].energia) mal.push("energía ≠ 15/22/33 en " + z.id);
    for (const e of z.enemigos || []) if (typeof e !== "string") mal.push("enemigo " + z.id);
    for (const e of z.enemigosPrevistos || []) if (!ENEMIGOS_ESPECIALES[e]) mal.push("enemigo previsto sin ficha: " + e + " en " + z.id);
    if (z.vacio && (z.enemigos.length || Object.keys(z.recursos).length || z.botin)) mal.push("zona vacía con contenido: " + z.id);
  }
  return mal;
}
