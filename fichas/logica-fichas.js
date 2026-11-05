// Ruta: fichas/logica-fichas.js
// Reglas del juego «Fichas de frutas» (sin pantalla): generación de niveles con solución garantizada
// y cálculo de qué fichas están libres (ninguna otra ficha las tapa).

export const COLS = 6;        // columnas de la cuadrícula (en fichas)
export const FILAS = 8;       // filas de la cuadrícula
export const RANURAS = 7;     // espacios de la bandeja
export const NIVELES = 100;
export const N_ICONOS = 14;   // cuántos dibujos distintos hay en piezas-fichas.js
const TIPOS_MAX = 12;         // máximo de tipos de ficha distintos en un nivel

// Generador de números al azar con semilla (el mismo nivel siempre sale igual)
export function crearAzar(semilla) {
  let s = (semilla >>> 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function mezclar(lista, azar = Math.random) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

// Dificultad de cada nivel: tipos distintos, tríos y capas
export function params(n) {
  const tipos = Math.min(3 + Math.floor((n - 1) / 2), TIPOS_MAX);
  const grupos = Math.min(4 + n, 36); // cada grupo = 3 fichas iguales
  const capas = n === 1 ? 1 : Math.min(2 + Math.floor(n / 6), 4);
  return { tipos, grupos, capas };
}

// Una ficha está libre si ninguna otra (que siga en el tablero) la tapa desde una capa superior
export function libre(fichas, f) {
  for (const g of fichas) {
    if (g !== f && !g.quitada && g.z > f.z && Math.abs(g.x - f.x) < 1 && Math.abs(g.y - f.y) < 1) return false;
  }
  return true;
}

function puntaje(modo, i, j, cols, filas, azar) {
  const cx = (cols - 1) / 2, cy = (filas - 1) / 2;
  switch (modo) {
    case 0: return Math.hypot((i - cx) * 0.9, j - cy) + azar() * 2;                      // un bloque central
    case 1: return Math.abs(Math.hypot((i - cx) * 0.9, j - cy) - 2.8) + azar() * 1.5;    // un anillo
    case 2: return Math.hypot(i - cols * 0.25, (j - cy) * 0.8) + azar() * 1.6;            // dos bloques
    default: return azar() * 10;                                                          // disperso
  }
}

// Reparte los tipos entre las fichas que siguen en el tablero de forma que SIEMPRE haya solución:
// se calcula un orden posible de retirada (cada ficha libre en su turno) y se le dan los tipos en
// grupos consecutivos. «grupos» = [{ tipo, n }] en el orden en que se resolverán (la suma de n debe
// ser igual a las fichas vivas). Devuelve ese orden de retirada.
export function repartirTipos(fichas, grupos, azar = Math.random) {
  const vivas = fichas.filter((f) => !f.quitada);
  const orden = [];
  while (orden.length < vivas.length) {
    const libres = vivas.filter((f) => !f.quitada && libre(fichas, f));
    const f = libres[Math.floor(azar() * libres.length)];
    f.quitada = true;
    orden.push(f);
  }
  orden.forEach((f) => { f.quitada = false; });
  let k = 0;
  for (const g of grupos) for (let m = 0; m < g.n; m++) orden[k++].tipo = g.tipo;
  return orden;
}

const PESOS = [[1], [0.6, 0.4], [0.45, 0.33, 0.22], [0.38, 0.28, 0.2, 0.14]];

// Devuelve { fichas, iconos, fondo, tipos, solucion }
//  - fichas: [{ x, y, z, tipo }] (x, y en unidades de ficha; las capas impares van a medio paso)
//  - iconos: para cada tipo, qué dibujo de piezas-fichas.js usa
//  - fondo: 0 playa, 1 atardecer, 2 pradera, 3 noche
//  - solucion: orden en que se pueden retirar las fichas sin que la bandeja pase de 2
export function generarNivel(n) {
  const { tipos, grupos, capas } = params(n);
  const azar = crearAzar(n * 7919 + 13);
  const total = grupos * 3;
  const modo = Math.floor(azar() * 4);
  const fichas = [];
  let puestas = 0;
  for (let z = 0; z < capas; z++) {
    const impar = z % 2 === 1;
    const cols = impar ? COLS - 1 : COLS;
    const filas = impar ? FILAS - 1 : FILAS;
    const d = impar ? 0.5 : 0;
    let cuota = z === capas - 1 ? total - puestas : Math.round(total * PESOS[capas - 1][z]);
    cuota = Math.max(0, Math.min(cuota, cols * filas));
    // se eligen casillas de la mitad izquierda y se reflejan para que el dibujo quede simétrico
    const cand = [];
    for (let j = 0; j < filas; j++) {
      for (let i = 0; i <= Math.floor((cols - 1) / 2); i++) cand.push({ i, j, p: puntaje(modo, i, j, cols, filas, azar) });
    }
    cand.sort((a, b) => a.p - b.p);
    let k = 0;
    for (const c of cand) {
      if (k >= cuota) break;
      fichas.push({ x: c.i + d, y: c.j + d, z, tipo: 0 });
      k++;
      const e = cols - 1 - c.i;
      if (e !== c.i && k < cuota) {
        fichas.push({ x: e + d, y: c.j + d, z, tipo: 0 });
        k++;
      }
    }
    puestas += k;
  }
  while (fichas.length % 3) fichas.pop();

  const nG = fichas.length / 3;
  const lista = [];
  for (let g = 0; g < nG; g++) lista.push(g % tipos);
  mezclar(lista, azar);
  const solucion = repartirTipos(fichas, lista.map((t) => ({ tipo: t, n: 3 })), azar);

  const iconos = mezclar(Array.from({ length: N_ICONOS }, (_, i) => i), azar).slice(0, tipos);
  const fondo = Math.floor((n - 1) / 5) % 4;
  return { fichas, iconos, fondo, tipos, solucion };
}
