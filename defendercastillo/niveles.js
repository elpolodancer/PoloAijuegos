// Ruta: defendercastillo/niveles.js
// Lista de niveles de «Defensa del castillo». Para agregar uno: copia un bloque, cambia el camino y las oleadas.
// Coordenadas en CELDAS (la cuadrícula es de 8 columnas × 12 filas); x.5 = centro de la celda.
// - camino:    puntos por donde caminan los enemigos (el primero está fuera de la pantalla, el último es el castillo)
// - castillo:  rectángulo de celdas que ocupa el castillo (ahí no se construye)
// - obstaculos: [columna, fila, emoji] celdas donde no se puede construir
// - oleadas:   cada una con «vida» (multiplicador de vida de los enemigos), «bono» (monedas al terminarla)
//              y «grupos»: [tipo, cantidad, segundos entre uno y otro, segundos de espera antes del primero]
export const NIVELES = [
  {
    id: "1",
    nombre: "El camino del bosque",
    oroInicial: 180,
    vidaCastillo: 100,
    camino: [[-0.5, 1.5], [6.5, 1.5], [6.5, 4.5], [1.5, 4.5], [1.5, 7.5], [6.5, 7.5], [6.5, 9.5], [3.5, 9.5], [3.5, 10.6]],
    castillo: { c: 2, f: 10, w: 4, h: 2 },
    obstaculos: [[0, 0, "🌲"], [7, 0, "🌲"], [7, 2, "🪨"], [0, 3, "🌳"], [0, 6, "🪨"], [7, 5, "🌳"], [4, 8, "🌲"], [7, 8, "🪨"], [0, 10, "🌳"], [7, 11, "🌲"], [1, 11, "🌲"]],
    oleadas: [
      { vida: 1.0, bono: 40, grupos: [["goblin", 8, 1.2, 0]] },
      { vida: 1.1, bono: 40, grupos: [["goblin", 12, 0.9, 0], ["lobo", 4, 1.5, 6]] },
      { vida: 1.2, bono: 45, grupos: [["goblin", 10, 0.7, 0], ["orco", 2, 4, 8]] },
      { vida: 1.35, bono: 45, grupos: [["lobo", 12, 0.6, 0], ["goblin", 14, 0.6, 5]] },
      { vida: 1.5, bono: 50, grupos: [["orco", 6, 2.5, 0], ["goblin", 16, 0.5, 3]] },
      { vida: 1.7, bono: 55, grupos: [["lobo", 15, 0.5, 0], ["orco", 5, 2, 6], ["goblin", 20, 0.4, 12]] },
      { vida: 1.95, bono: 60, grupos: [["orco", 10, 1.8, 0], ["lobo", 16, 0.5, 5]] },
      { vida: 2.2, bono: 65, grupos: [["goblin", 30, 0.3, 0], ["orco", 8, 1.5, 4], ["lobo", 20, 0.4, 15]] },
      { vida: 2.5, bono: 70, grupos: [["orco", 14, 1.3, 0], ["lobo", 24, 0.4, 3], ["goblin", 30, 0.3, 10]] },
      { vida: 2.9, bono: 0, grupos: [["troll", 2, 9, 4], ["goblin", 40, 0.3, 0], ["orco", 12, 1.5, 10], ["lobo", 20, 0.4, 20]] },
    ],
  },
];
