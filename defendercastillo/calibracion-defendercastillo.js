// Ruta: defendercastillo/calibracion-defendercastillo.js
// Una cifra por nivel de Michoacán (1 a 10): multiplica la vida de los enemigos. Para que los niveles sean cómodos para una persona
// (y no «al límite» para un bot perfecto), cada cifra se eligió dejando margen: los dos bots (bueno y de solo arqueros) ganan con casi toda
// la vida, y la dificultad sube poco a poco (el nivel 1 es el más holgado y el 10, el del jefe, el más ajustado).
// Si algún día se amplían los niveles, «node bot-defendercastillo.mjs calibrar» reescribe este archivo con otro criterio (ver su objetivo).
export const CALIB = [
  1.75, 1.8, 1.85, 1.85, 1.5, 0.6, 1.2, 1.4, 1.2, 1.15,
];
