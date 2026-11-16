// Ruta: ciudadzombi/logica-ciudadzombi.js
// NÚCLEO DE LOS MOBS de «Ciudad Zombi»: sin document, sin Firebase, sin red (se puede probar en Node).
// Todos los mobs (ciudadanos, policías, soldados y zombis) viven en arreglos tipados de tamaño fijo (MAX_MOBS), no en objetos:
// así 150 000 mobs ocupan ~4 MB y el recolector de basura no trabaja. Un «mob» es solo un número (su índice).
//
// REGLA DEL LÍMITE: MAX_MOBS = 150 000 mobs VIVOS en total (de cualquier tipo). Infectar a un humano NO usa lugar nuevo (el mismo
// índice pasa a zombi); soldados y zombis que coloca el jugador sí suman. Cada mob muerto (bala, bomba) libera su lugar.
// Con 100 000 ciudadanos al empezar quedan 50 000 lugares para zombis y soldados; si los ciudadanos se infectan o mueren, vuelven a abrirse.
//
// Reglas de movimiento y combate PROVISIONALES: sirven para medir rendimiento, se rehacen al programar la partida.

export const MAX_MOBS = 150000;
export const CASILLAS_POR_MANZANA = 24;      // 20 de manzana + 4 de calle; 100×100 manzanas = 2400×2400 casillas
export const TIPO = { LIBRE: 0, HUMANO: 1, SOLDADO: 2, ZOMBI: 3, POLICIA: 4 };
export const GOLPES = [0, 5, 15, 3, 5];      // resistencia: humano 5 golpes, soldado 15, zombi 3 balas (policía = como humano, por confirmar)
export const VELOCIDAD = [0, 1, 1.5, 0.5, 1];// relativa: 1 = la del humano
export const VEL_BASE = 4;                   // casillas por segundo con velocidad 1 (por afinar al probar en pantalla)
export const DISPAROS_POR_CARGA = 12;        // todo el que trae arma recarga cada 12 disparos
export const SEGUNDOS_RECARGA = 2;
export const COLORES = [0, "#ffe066", "#7a6a3a", "#2fb344", "#8a5cff"]; // provisional (el 0 no se dibuja)

const CELDA = 16;                            // lado de la cuadrícula de búsqueda, en casillas
const RADIO_VER = 14;                        // a qué distancia se notan zombis y víctimas
const RADIO_MORDER = 1.2;
export const RANURAS_MOVER = 4;              // cada mob se mueve 1 de cada 4 pasos (con dt×4)
export const RANURAS_PENSAR = 8;             // y piensa 1 de cada 8 (a 30 pasos/s, reacciona cada ~0.27 s). El juego puede subirlas si el celular va lento
const REHACER_CADA = 4;                      // las cuadrículas se rehacen cada 4 pasos
const MAX_VISTOS = 16;                       // tope de vecinos que revisa cada mob al pensar: el costo no crece con la multitud

function crearCuadricula(celdas, max) { return { inicio: new Int32Array(celdas * celdas + 1), lleno: new Int32Array(celdas * celdas), orden: new Int32Array(max), px: new Float32Array(max), py: new Float32Array(max) }; }

export function crearMundo(lado, max = MAX_MOBS) {
  const ancho = lado * CASILLAS_POR_MANZANA, celdas = Math.ceil(ancho / CELDA);
  const m = {
    lado, ancho, max, celdas,
    x: new Float32Array(max), y: new Float32Array(max), vx: new Float32Array(max), vy: new Float32Array(max),
    tipo: new Uint8Array(max), vida: new Uint8Array(max), armado: new Uint8Array(max),
    balas: new Uint8Array(max), recarga: new Float32Array(max),
    libres: new Int32Array(max), nLibres: max, cuenta: new Int32Array(5), vivos: 0,
    // dos cuadrículas de búsqueda que se reconstruyen en cada paso con un conteo (O(mobs)): una con los NO zombis (víctimas) y otra
    // con los zombis (amenazas). Así un zombi solo mira a las víctimas y un humano solo mira a los zombis, no a toda la multitud.
    ranurasMover: RANURAS_MOVER, ranurasPensar: RANURAS_PENSAR,
    celdaDe: new Int32Array(max), gH: crearCuadricula(celdas, max), gZ: crearCuadricula(celdas, max), semilla: 123456789,
  };
  for (let i = 0; i < max; i++) m.libres[i] = max - 1 - i; // el primero en salir es el 0
  return m;
}
export function azar(m) { // xorshift32 → [0, 1)
  let s = m.semilla; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; m.semilla = s >>> 0;
  return (s >>> 0) / 4294967296;
}

// ----- Alta, baja, infección, golpes -----
export function hayLugar(m, n = 1) { return m.vivos + n <= m.max; }
export function agregar(m, tipo, x, y, armado = 0) { // devuelve el índice o -1 si se llegó al límite
  if (m.nLibres === 0 || !(tipo > 0)) return -1;
  const i = m.libres[--m.nLibres];
  m.x[i] = x; m.y[i] = y; m.vx[i] = 0; m.vy[i] = 0;
  m.tipo[i] = tipo; m.vida[i] = GOLPES[tipo];
  m.armado[i] = armado ? 1 : (tipo === TIPO.SOLDADO || tipo === TIPO.POLICIA ? 1 : 0);
  m.balas[i] = DISPAROS_POR_CARGA; m.recarga[i] = 0;
  m.cuenta[tipo]++; m.vivos++;
  return i;
}
export function quitar(m, i) {
  const t = m.tipo[i];
  if (t === 0) return;
  m.tipo[i] = 0; m.cuenta[t]--; m.vivos--;
  m.libres[m.nLibres++] = i;
}
export function infectar(m, i) { // el mismo lugar pasa a zombi: no cambia m.vivos
  const t = m.tipo[i];
  if (t === 0 || t === TIPO.ZOMBI) return false;
  m.cuenta[t]--; m.cuenta[TIPO.ZOMBI]++;
  m.tipo[i] = TIPO.ZOMBI; m.vida[i] = GOLPES[TIPO.ZOMBI]; m.armado[i] = 0;
  return true;
}
export function golpear(m, i, dano = 1) { // true si murió
  if (m.tipo[i] === 0) return false;
  if (m.vida[i] > dano) { m.vida[i] -= dano; return false; }
  quitar(m, i);
  return true;
}
// Disparo con recarga: devuelve true si pudo disparar. Al gastar 12 balas empieza la recarga de 2 s (el humano corre a cubrirse).
export function disparar(m, i) {
  if (!m.armado[i] || m.recarga[i] > 0) return false;
  if (--m.balas[i] === 0) { m.recarga[i] = SEGUNDOS_RECARGA; m.balas[i] = DISPAROS_POR_CARGA; } // nunca se quedan sin balas
  return true;
}
export const recargando = (m, i) => m.recarga[i] > 0;

// ----- Cuadrícula de búsqueda -----
export function construirCuadricula(m) {
  const { celdas, celdaDe, x, y, tipo, max, gH, gZ } = m, tope = celdas - 1, nc = celdas * celdas;
  gH.inicio.fill(0); gZ.inicio.fill(0); gH.lleno.fill(0); gZ.lleno.fill(0);
  for (let i = 0; i < max; i++) {
    const t = tipo[i];
    if (t === 0) { celdaDe[i] = -1; continue; }
    let cx = (x[i] / CELDA) | 0, cy = (y[i] / CELDA) | 0;
    cx = cx < 0 ? 0 : cx > tope ? tope : cx; cy = cy < 0 ? 0 : cy > tope ? tope : cy;
    const c = cy * celdas + cx;
    celdaDe[i] = c; (t === TIPO.ZOMBI ? gZ : gH).inicio[c + 1]++;
  }
  for (let c = 0; c < nc; c++) { gH.inicio[c + 1] += gH.inicio[c]; gZ.inicio[c + 1] += gZ.inicio[c]; }
  for (let i = 0; i < max; i++) {
    const c = celdaDe[i];
    if (c < 0) continue;
    const g = tipo[i] === TIPO.ZOMBI ? gZ : gH;
    const k = g.inicio[c] + g.lleno[c]++;
    g.orden[k] = i; g.px[k] = x[i]; g.py[k] = y[i]; // copia de la posición en el orden de la cuadrícula: la búsqueda lee memoria seguida
  }
}
// Mobs dentro de un círculo: llama fn(i) por cada uno. g = m.gZ (zombis) o m.gH (los demás); usa la cuadrícula del último paso.
export function enCirculo(m, g, cx, cy, r, fn) {
  const { celdas, x, y, tipo } = m, { inicio, orden } = g, tope = celdas - 1, r2 = r * r;
  const x0 = Math.max(0, ((cx - r) / CELDA) | 0), x1 = Math.min(tope, ((cx + r) / CELDA) | 0);
  const y0 = Math.max(0, ((cy - r) / CELDA) | 0), y1 = Math.min(tope, ((cy + r) / CELDA) | 0);
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
    const c = gy * celdas + gx;
    for (let k = inicio[c], f = inicio[c + 1]; k < f; k++) {
      const i = orden[k];
      if (tipo[i] === 0) continue;
      const dx = x[i] - cx, dy = y[i] - cy;
      if (dx * dx + dy * dy <= r2) fn(i);
    }
  }
}
// Bomba: mata a los zombis (y, si soloZombis es false, también a los demás) dentro del radio. Devuelve cuántos mató.
export function bomba(m, cx, cy, radio, soloZombis = true) {
  const muertos = [];
  enCirculo(m, m.gZ, cx, cy, radio, (i) => { if (m.tipo[i] === TIPO.ZOMBI) muertos.push(i); });
  if (!soloZombis) enCirculo(m, m.gH, cx, cy, radio, (i) => muertos.push(i));
  for (const i of muertos) quitar(m, i);
  return muertos.length;
}

// ----- Paso de simulación (PROVISIONAL: sirve para medir rendimiento) -----
// - Zombi: va hacia el humano más cercano que vea; si no ve a ninguno, camina sin rumbo. Si lo alcanza, lo infecta.
// - Humano/policía/soldado: si ve zombis huye en sentido contrario; si no, camina despacio sin rumbo.
// Tres trucos para que 150 000 mobs quepan en un celular (ver README-ciudadzombi.md, sección «Rendimiento»):
//  1. Ranuras: en cada paso solo 1 de cada RANURAS_PENSAR mobs piensa y solo 1 de cada RANURAS_MOVER se mueve (con dt×RANURAS_MOVER).
//  2. Pensar se recorre EN ORDEN DE CUADRÍCULA (celda por celda), no por índice: los vecinos de un mob son los del mob siguiente, así
//     las posiciones ya están en la caché del procesador. Por índice, cada búsqueda cae en 9 zonas lejanas de memoria y es 10 veces más lenta.
//  3. Tope de vecinos revisados (MAX_VISTOS): una multitud de miles cuesta lo mismo que un grupo de 24.
function pensar(m, g, objetivo, esZombi, fase) {
  const rp = m.ranurasPensar, { celdas, x, y, vx, vy, tipo } = m, { inicio, orden } = g, tope = celdas - 1;
  const oi = objetivo.inicio, oo = objetivo.orden, opx = objetivo.px, opy = objetivo.py;
  const ver2 = RADIO_VER * RADIO_VER, morder2 = RADIO_MORDER * RADIO_MORDER;
  for (let cy = 0; cy <= tope; cy++) for (let cx = 0; cx <= tope; cx++) {
    const c = cy * celdas + cx, k0 = inicio[c], k1 = inicio[c + 1];
    if (k0 === k1) continue;
    const gy0 = cy > 0 ? cy - 1 : 0, gy1 = cy < tope ? cy + 1 : tope, gx0 = cx > 0 ? cx - 1 : 0, gx1 = cx < tope ? cx + 1 : tope;
    for (let k = k0; k < k1; k++) {
      if ((k % rp) !== fase) continue;
      const i = orden[k], t = tipo[i];
      if (t === 0 || (t === TIPO.ZOMBI) !== esZombi) continue; // murió o cambió de bando desde que se hizo la cuadrícula
      const xi = g.px[k], yi = g.py[k];
      let mejor = -1, mejorD = ver2, sx = 0, sy = 0, hayAmenaza = 0, vistos = 0;
      buscar: for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const cc = gy * celdas + gx;
        for (let q = oi[cc], f = oi[cc + 1]; q < f; q++) {
          if (++vistos > MAX_VISTOS) break buscar;
          const dx = opx[q] - xi, dy = opy[q] - yi, d = dx * dx + dy * dy;
          if (d > ver2) continue;
          if (esZombi) { if (d < mejorD) { mejorD = d; mejor = oo[q]; } }
          else { sx -= dx; sy -= dy; hayAmenaza++; }
        }
      }
      let dx = 0, dy = 0, rapidez = 1;
      if (esZombi && mejor >= 0) {
        dx = x[mejor] - x[i]; dy = y[mejor] - y[i];
        if (mejorD < morder2) infectar(m, mejor);
      } else if (hayAmenaza) { dx = sx; dy = sy; }
      else if (azar(m) < 0.25 || (vx[i] === 0 && vy[i] === 0)) { const a = azar(m) * 6.2831853; dx = Math.cos(a); dy = Math.sin(a); rapidez = 0.3; }
      else rapidez = 0; // sigue su rumbo (vx, vy ya traen la rapidez)
      if (rapidez > 0) {
        const n = Math.sqrt(dx * dx + dy * dy) || 1, v = VELOCIDAD[t] * VEL_BASE * rapidez;
        vx[i] = dx / n * v; vy[i] = dy / n * v;
      }
    }
  }
}
export function paso(m, dt, nPaso) {
  if (nPaso % REHACER_CADA === 0) construirCuadricula(m);
  const rm = m.ranurasMover, faseM = nPaso % rm, dtMob = dt * rm;
  pensar(m, m.gZ, m.gH, true, nPaso % m.ranurasPensar);   // los zombis buscan víctimas
  pensar(m, m.gH, m.gZ, false, nPaso % m.ranurasPensar);  // los demás buscan zombis de los que huir
  const { x, y, vx, vy, tipo, recarga, max, ancho } = m;
  for (let i = faseM; i < max; i += rm) { // moverse (la ciudad es un cuadrado cerrado)
    if (tipo[i] === 0) continue;
    if (recarga[i] > 0) recarga[i] = Math.max(0, recarga[i] - dtMob);
    let nx = x[i] + vx[i] * dtMob, ny = y[i] + vy[i] * dtMob;
    if (nx < 0 || nx > ancho) { vx[i] = -vx[i]; nx = nx < 0 ? 0 : ancho; }
    if (ny < 0 || ny > ancho) { vy[i] = -vy[i]; ny = ny < 0 ? 0 : ancho; }
    x[i] = nx; y[i] = ny;
  }
}

// ----- Dibujo: un píxel por mob, escrito directo en un Uint32Array (ImageData) -----
// Se llama con el buffer de un canvas: buf = new Uint32Array(imageData.data.buffer). No crea objetos ni llama a fillRect.
// escala = píxeles de pantalla por casilla; (camX, camY) = casilla en la esquina superior izquierda de la pantalla.
export function aColorU32(css) { // "#rrggbb" → entero ABGR (little-endian), opaco
  const n = parseInt(css.slice(1), 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16)) >>> 0;
}
const U32 = COLORES.map((c) => (c ? aColorU32(c) : 0));
export function pintarMobs(m, buf, W, H, camX, camY, escala, tam = 1) {
  const { x, y, tipo, max } = m;
  for (let i = 0; i < max; i++) {
    const t = tipo[i];
    if (t === 0) continue;
    const px = ((x[i] - camX) * escala) | 0, py = ((y[i] - camY) * escala) | 0;
    if (px < 0 || py < 0 || px + tam > W || py + tam > H) continue;
    const c = U32[t];
    if (tam === 1) buf[py * W + px] = c;
    else for (let a = 0; a < tam; a++) for (let b = 0; b < tam; b++) buf[(py + a) * W + px + b] = c;
  }
}
