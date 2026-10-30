// Ruta: pradera/niveles.js
// Nivel 1 de «Pradera». Cada casilla mide 16 unidades. Leyenda del dibujo:
//   .  aire         #  tierra       B  ladrillo (se rompe si eres grande)
//   ?  bloque con moneda            P  bloque con fruta (te hace grande)
//   U  bloque ya usado              T  tubería        S  bloque de piedra
//   c  moneda suelta                G  mástil de la meta
//   e  bicho (se aplasta)           t  tortuga (al aplastarla queda caparazón que se patea)
// El nivel se arma con ayudas (suelo, tuberia, escalera...) para que el tamaño siempre salga bien.
// Para crear otro nivel: copia la función, cambia las líneas y expórtalo.
const ANCHO = 150, ALTO = 15, FILA_SUELO = 13;

function construir() {
  const g = Array.from({ length: ALTO }, () => Array(ANCHO).fill("."));
  const pon = (x, y, c) => { if (x >= 0 && x < ANCHO && y >= 0 && y < ALTO) g[y][x] = c; };
  const fila = (x, y, s) => [...s].forEach((c, i) => pon(x + i, y, c));
  const suelo = (x0, x1) => { for (let x = x0; x <= x1; x++) { pon(x, FILA_SUELO, "#"); pon(x, FILA_SUELO + 1, "#"); } };
  const tuberia = (x, h) => { for (let k = 0; k < h; k++) { pon(x, FILA_SUELO - 1 - k, "T"); pon(x + 1, FILA_SUELO - 1 - k, "T"); } };
  // Escalera de n escalones; dir 1 = sube hacia la derecha, -1 = baja
  const escalera = (x, n, dir = 1) => {
    for (let i = 0; i < n; i++) for (let k = 0; k <= i; k++) pon(x + (dir === 1 ? i : n - 1 - i), FILA_SUELO - 1 - k, "S");
  };

  // Suelo con tres huecos: 53-54, 83-85 y 102-103
  suelo(0, 52); suelo(55, 82); suelo(86, 101); suelo(104, 149);

  // Tramo 1: bloques, primeros bichos y tuberías
  pon(12, 9, "?");
  fila(16, 9, "BPB?B");
  fila(23, 10, "ccc"); pon(26, 12, "e");
  tuberia(31, 2); pon(36, 12, "t");
  tuberia(41, 3);
  fila(45, 9, "?B?"); pon(38, 12, "e"); pon(47, 12, "e");
  fila(52, 9, "cccc");                       // arco de monedas sobre el primer hueco

  // Tramo 2: más bloques, tortuga y segundo hueco
  fila(58, 9, "B?BPB");
  pon(62, 12, "e"); pon(66, 12, "e"); fila(70, 10, "cc"); pon(73, 12, "t");
  tuberia(76, 2); pon(71, 12, "e");
  fila(83, 9, "ccc");

  // Tramo 3: dos escaleras con un valle en medio
  escalera(88, 3); pon(91, 12, "e"); fila(91, 8, "cc"); escalera(93, 3, -1);
  fila(101, 9, "cccc");

  // Tramo 4: bichos, tortuga y escalera final
  pon(109, 12, "e"); pon(111, 12, "e"); fila(114, 9, "B?B");
  tuberia(119, 2); pon(123, 12, "t"); pon(125, 12, "e");
  fila(127, 10, "ccccc");
  escalera(132, 8);

  // Meta: mástil en la columna 144 (base de piedra); el castillo se dibuja solo a partir de la columna 146
  pon(144, 12, "S");
  for (let y = 3; y <= 11; y++) pon(144, y, "G");

  return g.map((f) => f.join(""));
}

export const NIVEL_1 = construir();
