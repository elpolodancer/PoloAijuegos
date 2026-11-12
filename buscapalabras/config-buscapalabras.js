// Ruta: buscapalabras/config-buscapalabras.js
// Ajustes de «Buscapalabras»: tamaños de tablero y niveles de dificultad de la partida libre. Solo datos: no usa document.
// PROVISIONAL: lo que significa cada dificultad (dirs) se puede cambiar cuando se haga el generador de tableros.
//   dirs = direcciones en que se puede esconder una palabra: E → · S ↓ · W ← · N ↑ · SE ↘ · NE ↗ · SW ↙ · NW ↖

export const TAMANOS = [8, 9, 10, 12, 15, 20]; // el tablero es de n × n letras

export const DIFICULTADES = [
  { id: 1, nombre: "Muy fácil", icono: "🙂", clase: "b-verde",  dirs: ["E", "S"], ayuda: "Las palabras van solo hacia la derecha → o hacia abajo ↓." },
  { id: 2, nombre: "Fácil",     icono: "😀", clase: "b-azul",   dirs: ["E", "S", "W", "N"], ayuda: "Horizontales y verticales, también al revés." },
  { id: 3, nombre: "Normal",    icono: "😐", clase: "b-morado", dirs: ["E", "S", "W", "N", "SE"], ayuda: "Suma la diagonal descendente ↘." },
  { id: 4, nombre: "Difícil",   icono: "😠", clase: "b-oro",    dirs: ["E", "S", "W", "N", "SE", "NE", "SW", "NW"], ayuda: "Las 8 direcciones, con las palabras cruzadas entre sí." },
  { id: 5, nombre: "Experto",   icono: "💀", clase: "b-rojo",   dirs: ["E", "S", "W", "N", "SE", "NE", "SW", "NW"], ayuda: "Las 8 direcciones, más palabras y más largas." },
];

export const LIBRE_POR_DEFECTO = { dif: 2, tam: 10 };
export const CLAVE_LIBRE = "buscapalabras_libre_v1"; // localStorage: última dificultad y tamaño elegidos

// ===================================================================================================================
// PLAN DE DIFICULTAD DE LOS NIVELES DEL MAPA (anotado ANTES de hacer los niveles; el generador debe respetarlo)
// El mapa tiene 226 etapas (32 estados + 194 países) × 100 niveles = 22 600 niveles. Cada etapa es un bloque de 100 niveles.
//   • Primeros 100 niveles (etapa 1):   50 % fáciles · 40 % medios · 10 % difíciles
//   • Últimos 100 niveles (etapa 226):  25 % fáciles · 40 % medios · 35 % difíciles
//   • Entre una y otra el reparto avanza poco a poco, etapa por etapa (lineal): los medios se quedan en 40 %, los fáciles
//     bajan de 50 a 25 y los difíciles suben de 10 a 35.
// «fácil / medio / difícil» es el tipo de nivel; todavía NO está decidido a qué DIFICULTADES (1 a 5) corresponde cada tipo.
// Una vez publicado el mapa con jugadores, no cambies estas cifras (cambiarían qué nivel es fácil o difícil).
// ===================================================================================================================
export const NIVELES_POR_ETAPA = 100;
export const TOTAL_ETAPAS = 226;
export const REPARTO_INICIO = { facil: 50, medio: 40, dificil: 10 }; // % en la primera etapa (niveles 1 a 100)
export const REPARTO_FINAL = { facil: 25, medio: 40, dificil: 35 };  // % en la última etapa (niveles 22 501 a 22 600)

// Porcentajes de la etapa i (0 = primera, TOTAL_ETAPAS - 1 = última)
export function repartoEtapa(i) {
  const t = Math.max(0, Math.min(1, i / (TOTAL_ETAPAS - 1)));
  const mezcla = (a, b) => a + (b - a) * t;
  return {
    facil: mezcla(REPARTO_INICIO.facil, REPARTO_FINAL.facil),
    medio: mezcla(REPARTO_INICIO.medio, REPARTO_FINAL.medio),
    dificil: mezcla(REPARTO_INICIO.dificil, REPARTO_FINAL.dificil),
  };
}
// Cuántos niveles de cada tipo tiene la etapa i (enteros que siempre suman NIVELES_POR_ETAPA)
export function nivelesPorTipo(i) {
  const p = repartoEtapa(i), tipos = ["facil", "medio", "dificil"];
  const exacto = tipos.map((k) => (p[k] * NIVELES_POR_ETAPA) / 100);
  const r = exacto.map(Math.floor);
  let faltan = NIVELES_POR_ETAPA - r.reduce((a, b) => a + b, 0);
  tipos.map((k, j) => j).sort((a, b) => (exacto[b] - r[b]) - (exacto[a] - r[a])).forEach((j) => { if (faltan > 0) { r[j]++; faltan--; } });
  return { facil: r[0], medio: r[1], dificil: r[2] };
}
