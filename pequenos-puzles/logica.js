// Ruta: pequenos-puzles/logica.js
// Solo reglas (sin pantalla): celdas de una pieza y un solucionador para comprobar los niveles.

// Lista de celdas [x, y] de un dibujo de texto (orden: fila por fila)
export function celdas(forma) {
  const r = [];
  forma.forEach((fila, y) => [...fila].forEach((ch, x) => { if (ch === "X") r.push([x, y]); }));
  return r;
}

// Busca una solución (sin girar piezas). Devuelve [{pieza, x, y}, ...] o null.
export function resolver(nivel) {
  const { filas, columnas } = nivel;
  const piezas = nivel.piezas.map((p) => celdas(p.forma));
  const tablero = Array.from({ length: filas }, () => Array(columnas).fill(-1));
  const usada = piezas.map(() => false);
  const res = [];
  function siguienteVacia() {
    for (let y = 0; y < filas; y++) for (let x = 0; x < columnas; x++) if (tablero[y][x] < 0) return [x, y];
    return null;
  }
  function buscar() {
    const v = siguienteVacia();
    if (!v) return true;
    for (let i = 0; i < piezas.length; i++) {
      if (usada[i]) continue;
      const [fx, fy] = piezas[i][0]; // primera celda de la pieza (fila por fila)
      const ox = v[0] - fx, oy = v[1] - fy;
      const ok = piezas[i].every(([cx, cy]) => {
        const x = ox + cx, y = oy + cy;
        return x >= 0 && y >= 0 && x < columnas && y < filas && tablero[y][x] < 0;
      });
      if (!ok) continue;
      piezas[i].forEach(([cx, cy]) => { tablero[oy + cy][ox + cx] = i; });
      usada[i] = true; res.push({ pieza: i, x: ox, y: oy });
      if (buscar()) return true;
      res.pop(); usada[i] = false;
      piezas[i].forEach(([cx, cy]) => { tablero[oy + cy][ox + cx] = -1; });
    }
    return false;
  }
  return buscar() ? res.slice() : null;
}
