// Ruta: zuma/metas-zuma.mjs
// Metas de dificultad de cada ronda: fracción mínima de partidas que deben ganar los jugadores simulados (bot-zuma.mjs).
// Ronda 1 = muy fácil (hasta el novato gana casi siempre); ronda 2 = media; ronda 3 = difícil pero posible.
// referencia: perfil cuya mediana de duración debe caer en «duracion» (segundos DEL BOT). En las rondas 1 y 2 es el novato,
// que es el que más se parece a quien juega por pasar el rato. Una persona tarda más que el bot (apunta, espera la bola,
// se equivoca), así que una ronda de ~60–110 s del bot se siente más larga jugando a mano.
export const META = [
  { minimos: { novato: 0.95, humano: 1, perfecto: 1 }, referencia: "novato", duracion: [55, 110] },
  { minimos: { novato: 0.5, humano: 0.9, perfecto: 1 }, referencia: "novato", duracion: [60, 110] },
  { minimos: { humano: 0.4, perfecto: 0.9 }, referencia: "humano", duracion: [65, 120] },
];
