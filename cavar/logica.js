// Ruta: cavar/logica.js
// Reglas de «Cavar» (sin pantalla): mundo, minerales, mejoras, mochila, venta y guardado.
// El dibujo, los controles y el sonido viven en juego.js.

// ----- Medidas del terreno (en casillas) -----
export const ANCHO = 32;            // ancho del terreno
export const FILA_SUELO = 6;        // fila donde camina el jugador (superficie); 0 m
export const PROFUNDIDAD = 100;     // metros que se pueden cavar
export const ALTO = FILA_SUELO + 1 + PROFUNDIDAD + 1; // cielo + superficie + tierra + roca del fondo
export const ZONA_X0 = 15;          // primera y última columna de la zona de excavación
export const ZONA_X1 = 26;
export const CAJA_X = 11;           // columna de la caja de venta (a su derecha se vende)
export const INICIO_X = 12;         // dónde aparece el jugador
export const VALLA_HASTA = 10;      // columnas 0..10 son la casa y su cerca (no se puede entrar)

// Tipos de casilla
export const T = { AIRE: 0, TIERRA: 1, ROCA: 2, CIELO: 3, VALLA: 4, CAJA: 5 };

// Dinero → puntos del perfil
export const DOLARES_POR_PUNTO = 2;

// ----- Capas de tierra (por metro de profundidad) -----
export const CAPAS = [
  { hasta: 15,  nombre: "Tierra",      dureza: 1,    color: "#7a5232", claro: "#8f6341", oscuro: "#64412a" },
  { hasta: 40,  nombre: "Arcilla",     dureza: 1.25, color: "#9b5c3c", claro: "#b06d49", oscuro: "#834b30" },
  { hasta: 70,  nombre: "Piedra",      dureza: 1.6,  color: "#74695f", claro: "#887c71", oscuro: "#5e554d" },
  { hasta: 101, nombre: "Roca oscura", dureza: 2,    color: "#4a4350", claro: "#5b5363", oscuro: "#39333f" },
];
export function capaDe(prof) {
  for (const c of CAPAS) if (prof <= c.hasta) return c;
  return CAPAS[CAPAS.length - 1];
}

// ----- Minerales -----
// centro / ancho / peso: a qué profundidad abunda cada uno (campana). Los caros no salen cerca de la superficie.
export const MINERALES = [
  { valor: 1,   nombre: "Carbón",    color: "#3a3a44", brillo: "#8a8a99", centro: 5,  ancho: 22, peso: 100 },
  { valor: 2,   nombre: "Cobre",     color: "#d9803a", brillo: "#ffc08a", centro: 14, ancho: 20, peso: 70 },
  { valor: 5,   nombre: "Plata",     color: "#c9d2dc", brillo: "#ffffff", centro: 28, ancho: 20, peso: 45 },
  { valor: 10,  nombre: "Oro",       color: "#ffc83d", brillo: "#fff2a8", centro: 42, ancho: 20, peso: 30 },
  { valor: 20,  nombre: "Esmeralda", color: "#2fd68c", brillo: "#c2ffe6", centro: 58, ancho: 20, peso: 20 },
  { valor: 50,  nombre: "Rubí",      color: "#ff3b5c", brillo: "#ffc0cb", centro: 75, ancho: 18, peso: 12 },
  { valor: 100, nombre: "Diamante",  color: "#7fe9ff", brillo: "#ffffff", centro: 92, ancho: 16, peso: 8 },
];
export const DENSIDAD_BASE = 0.09;   // proporción de casillas con mineral en la superficie
export const DENSIDAD_FONDO = 0.15;  // ... y en el fondo
export const PROB_VETA = 0.35;       // probabilidad de que un mineral traiga vecinos iguales

export function pesoMineral(i, prof) {
  const m = MINERALES[i];
  if (prof < m.centro - 1.3 * m.ancho) return 0;
  const z = (prof - m.centro) / m.ancho;
  return m.peso * Math.exp(-z * z);
}

export function elegirMineral(rng, prof) {
  let total = 0;
  const pesos = MINERALES.map((_, i) => { const p = pesoMineral(i, prof); total += p; return p; });
  if (total <= 0) return 0;
  let r = rng() * total;
  for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return i; }
  return 0;
}

// Generador pseudoaleatorio con semilla (el mismo terreno siempre para la misma semilla)
export function crearRng(semilla) {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----- Mundo -----
export const idx = (x, y) => y * ANCHO + x;
export const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
export const enZona = (x) => x >= ZONA_X0 && x <= ZONA_X1;
export const profundidad = (y) => Math.max(0, y - FILA_SUELO);

// flags: bit 1 = ya cavada, bit 2 = ya vista (el mineral se descubre al iluminarlo)
export function generarMundo(semilla) {
  const n = ANCHO * ALTO;
  const m = { tipo: new Uint8Array(n), mineral: new Uint8Array(n), flags: new Uint8Array(n) };
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      let t;
      if (y < FILA_SUELO) t = T.CIELO;
      else if (y === FILA_SUELO) t = x <= VALLA_HASTA ? T.VALLA : x === CAJA_X ? T.CAJA : T.AIRE;
      else if (y >= ALTO - 1) t = T.ROCA;
      else t = enZona(x) ? T.TIERRA : T.ROCA;
      m.tipo[idx(x, y)] = t;
    }
  }
  const rng = crearRng(semilla);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = FILA_SUELO + 1; y < ALTO - 1; y++) {
    const prof = y - FILA_SUELO;
    const p = DENSIDAD_BASE + (DENSIDAD_FONDO - DENSIDAD_BASE) * (prof / PROFUNDIDAD);
    for (let x = ZONA_X0; x <= ZONA_X1; x++) {
      const i = idx(x, y);
      if (m.mineral[i] || rng() >= p) continue;
      const tipo = elegirMineral(rng, prof);
      m.mineral[i] = tipo + 1;
      if (rng() < PROB_VETA) {
        const extra = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < extra; k++) {
          const d = DIRS[Math.floor(rng() * 4)];
          const nx = x + d[0], ny = y + d[1];
          if (nx < ZONA_X0 || nx > ZONA_X1 || ny <= FILA_SUELO || ny >= ALTO - 1) continue;
          const j = idx(nx, ny);
          if (!m.mineral[j]) m.mineral[j] = tipo + 1;
        }
      }
    }
  }
  return m;
}

export function pasable(m, x, y) { return dentro(x, y) && m.tipo[idx(x, y)] === T.AIRE; }
export function cavable(m, x, y) { return dentro(x, y) && m.tipo[idx(x, y)] === T.TIERRA; }

// Cava una casilla. Devuelve el tipo de mineral (0..6) que había, o -1 si era solo tierra.
export function cavarCelda(m, x, y) {
  const i = idx(x, y);
  const mineral = m.mineral[i] ? m.mineral[i] - 1 : -1;
  m.tipo[i] = T.AIRE;
  m.mineral[i] = 0;
  m.flags[i] |= 1 | 2;
  return mineral;
}

// Marca como «vistas» las casillas dentro del radio de la linterna. Devuelve cuántas son nuevas.
export function iluminar(m, cx, cy, radio) {
  let nuevas = 0;
  const r = Math.ceil(radio);
  for (let y = Math.max(0, cy - r); y <= Math.min(ALTO - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(ANCHO - 1, cx + r); x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > radio * radio) continue;
      const i = idx(x, y);
      if (!(m.flags[i] & 2)) { m.flags[i] |= 2; nuevas++; }
    }
  }
  return nuevas;
}

// ----- Mejoras -----
export const MEJORAS = {
  pala:     { nombre: "Pala",     icono: "⛏️", niveles: [1, 1.5, 2.1, 3, 4.2, 6],     costos: [0, 15, 60, 200, 700, 2500] },
  mochila:  { nombre: "Mochila",  icono: "🎒", niveles: [8, 14, 22, 34, 50, 80],       costos: [0, 20, 80, 260, 800, 2800] },
  linterna: { nombre: "Linterna", icono: "🔦", niveles: [2.3, 3.2, 4.2, 5.4, 7],       costos: [0, 30, 120, 450, 1500] },
};
export const COSTO_CUERDA = 120;

export const velPala = (est) => MEJORAS.pala.niveles[est.pala - 1];
export const capacidad = (est) => MEJORAS.mochila.niveles[est.mochila - 1];
export const radioLuz = (est) => MEJORAS.linterna.niveles[est.linterna - 1];

// Segundos que tarda en romperse una casilla
export function tiempoCavar(prof, conMineral, nivelPala) {
  const base = (0.42 + 0.011 * prof) * capaDe(prof).dureza * (conMineral ? 1.35 : 1);
  return base / MEJORAS.pala.niveles[nivelPala - 1];
}

// Costo del siguiente nivel (null si ya está al máximo)
export function costoSiguiente(est, clave) {
  const mj = MEJORAS[clave];
  const nivel = est[clave];
  return nivel >= mj.niveles.length ? null : mj.costos[nivel];
}

export function comprarMejora(est, clave) {
  const c = costoSiguiente(est, clave);
  if (c === null || est.dinero < c) return false;
  est.dinero -= c;
  est[clave] += 1;
  return true;
}

export function comprarCuerda(est) {
  if (est.cuerda || est.dinero < COSTO_CUERDA) return false;
  est.dinero -= COSTO_CUERDA;
  est.cuerda = true;
  return true;
}

// ----- Estado de la partida y mochila -----
export function estadoNuevo(semilla) {
  return {
    semilla: semilla || Math.floor(Math.random() * 2147483646) + 1,
    dinero: 0, ganado: 0,
    pala: 1, mochila: 1, linterna: 1, cuerda: false,
    bolsa: MINERALES.map(() => 0),
    hallados: MINERALES.map(() => 0),
    profMax: 0,
    ptsPend: 0,
  };
}

export const bolsaCantidad = (est) => est.bolsa.reduce((a, b) => a + b, 0);
export const bolsaValor = (est) => est.bolsa.reduce((a, n, i) => a + n * MINERALES[i].valor, 0);
export const bolsaLlena = (est) => bolsaCantidad(est) >= capacidad(est);

export function recoger(est, tipo) {
  if (bolsaLlena(est)) return false;
  est.bolsa[tipo]++;
  est.hallados[tipo]++;
  return true;
}

// Vende todo lo de la mochila. Devuelve los dólares ganados.
export function venderTodo(est) {
  const monto = bolsaValor(est);
  est.bolsa = MINERALES.map(() => 0);
  est.dinero += monto;
  est.ganado += monto;
  est.ptsPend += monto / DOLARES_POR_PUNTO;
  return monto;
}

// ----- Guardado del mapa (solo las banderas; el terreno sale de la semilla) -----
export function mapaAB64(m) {
  let s = "";
  const f = m.flags;
  for (let i = 0; i < f.length; i += 4096) s += String.fromCharCode.apply(null, f.subarray(i, i + 4096));
  return btoa(s);
}

export function aplicarMapaB64(m, b64) {
  try {
    const s = atob(b64);
    if (s.length !== m.flags.length) return false;
    for (let i = 0; i < s.length; i++) {
      const f = s.charCodeAt(i);
      m.flags[i] = f;
      if ((f & 1) && m.tipo[i] === T.TIERRA) { m.tipo[i] = T.AIRE; m.mineral[i] = 0; }
    }
    return true;
  } catch (e) {
    return false;
  }
}
