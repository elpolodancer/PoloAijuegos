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
