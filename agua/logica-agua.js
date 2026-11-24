// Ruta: agua/logica-agua.js
// Simulación del agua por CASILLAS (sin DOM ni Firebase). La usa el generador para comprobar que cada nivel se puede pasar,
// y la usará la pantalla de juego para mover el agua de verdad.
//
// Un nivel es una cuadrícula de texto (nivel.celdas = una cadena por fila):
//   '.' aire · 't' tierra (se cava con el dedo) · '#' roca (no se cava) · 'A' ácido (destruye el agua) · 'M' meta (recibe el agua) · 'G' grifo (aire de donde sale el agua)
// El agua cae, se desliza en diagonal y corre de lado (conserva su sentido hasta chocar). Una gota que entra en la meta cuenta como
// «llegada»; una que entra en ácido, como «perdida». Todo es determinista: el mismo nivel y los mismos cortes dan siempre el mismo resultado.
export const AIRE = 0, TIERRA = 1, ROCA = 2, ACIDO = 3, META = 4;
const LETRAS = { ".": AIRE, G: AIRE, t: TIERRA, "#": ROCA, A: ACIDO, M: META };
export const CADA = 2; // el grifo suelta una gota cada 2 pasos

export function crearSim(nivel) {
  const W = nivel.ancho, H = nivel.alto;
  const celdas = new Uint8Array(W * H), agua = new Uint8Array(W * H), marca = new Uint32Array(W * H); // agua: 0 nada, 1 va a la izq., 2 va a la der.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) celdas[y * W + x] = LETRAS[nivel.celdas[y][x]] ?? ROCA;
  const grifo = nivel.grifo.y * W + nivel.grifo.x;
  const limite = nivel.emitir * CADA + (nivel.margen || 900);
  const s = { W, H, celdas, agua, tick: 0, emitidas: 0, llegadas: 0, perdidas: 0 };
  const libre = (j) => { const c = celdas[j]; return c !== TIERRA && c !== ROCA && agua[j] === 0; };
  function mover(a, b, dir) {
    agua[a] = 0;
    const c = celdas[b];
    if (c === META) s.llegadas++;
    else if (c === ACIDO) s.perdidas++;
    else { agua[b] = dir; marca[b] = s.tick; }
  }
  // Un paso de la simulación (el juego llama a esto en cada cuadro)
  s.paso = () => {
    s.tick++;
    if (s.emitidas < nivel.emitir && s.tick % CADA === 0 && agua[grifo] === 0) { agua[grifo] = s.emitidas & 1 ? 1 : 2; marca[grifo] = s.tick; s.emitidas++; }
    const alRev = (s.tick & 1) === 0; // alterna el sentido en que se recorre cada fila
    for (let y = H - 2; y >= 0; y--) {
      for (let k = 0; k < W; k++) {
        const x = alRev ? k : W - 1 - k, i = y * W + x, d = agua[i];
        if (!d || marca[i] === s.tick) continue;
        const b = i + W, p = d === 1 ? -1 : 1;
        if (libre(b)) { mover(i, b, d); continue; }
        let hecho = false;
        for (const sd of [p, -p]) { // en diagonal, primero hacia donde iba
          if (x + sd >= 0 && x + sd < W && libre(i + sd) && libre(b + sd)) { mover(i, b + sd, sd < 0 ? 1 : 2); hecho = true; break; }
        }
        if (hecho) continue;
        for (const sd of [p, -p]) { // de lado
          if (x + sd >= 0 && x + sd < W && libre(i + sd)) { mover(i, i + sd, sd < 0 ? 1 : 2); break; }
        }
      }
    }
  };
  // Cava la tierra alrededor de (cx, cy) con un pincel de radio r (en casillas). Devuelve cuántas casillas quitó.
  s.cavar = (cx, cy, r = 1) => {
    let n = 0;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 1 && celdas[y * W + x] === TIERRA) { celdas[y * W + x] = AIRE; n++; }
    }
    return n;
  };
  s.vivas = () => s.emitidas - s.llegadas - s.perdidas;
  s.terminado = () => (s.emitidas >= nivel.emitir && s.vivas() === 0) || s.tick >= limite;
  s.resultado = () => ({ emitidas: s.emitidas, llegadas: s.llegadas, perdidas: s.perdidas, fraccion: s.llegadas / nivel.emitir, llego: s.llegadas >= nivel.necesitas });
  return s;
}

// Corre un nivel completo después de quitar las casillas «cavadas» ([[x, y], …]). Devuelve el resultado (ver s.resultado).
export function simular(nivel, cavadas = []) {
  const s = crearSim(nivel);
  for (const [x, y] of cavadas) if (s.celdas[y * s.W + x] === TIERRA) s.celdas[y * s.W + x] = AIRE;
  while (!s.terminado()) s.paso();
  return s.resultado();
}
