// Ruta: fate/datos-fate.js
// Datos del juego (aldeanos, misiones, monstruos, pueblo). Para agregar misiones o aldeanos se edita SOLO este archivo.
// Hoy: 5 aldeanos (+Tomás al rescatarlo) y 3 misiones (de Marta). La meta es 20 aldeanos con 10 misiones cada uno: ver README-fate.md.

export const MAX_VISIBLES = 3;          // de las 10 misiones de un aldeano solo se muestran 3 a la vez; al cumplir una aparece la siguiente
export const MISIONES_POR_ALDEANO = 10; // meta de diseño (hoy hay 3 hechas)
export const PRECIOS = { vida: 25, mana: 25 };   // monedas por poción
export const POCION = { vida: 50, mana: 40 };    // cuánto recupera cada una
export const ETIQUETA_TIPO = { persona: "Rescate", objeto: "Objeto perdido", monstruo: "Cacería" };

// Monstruos base (los de cada nivel de mazmorra se escalan con escala(n) de mazmorra-fate.js)
export const MONSTRUOS = {
  rata:       { nombre: "Rata",       vida: 22,  dano: 4, vel: 72,  xp: 6,  oro: [1, 4],   r: 11, aggro: 150 },
  slime:      { nombre: "Gelatina",   vida: 34,  dano: 5, vel: 46,  xp: 9,  oro: [2, 6],   r: 13, aggro: 130 },
  murcielago: { nombre: "Murciélago", vida: 16,  dano: 4, vel: 105, xp: 7,  oro: [1, 5],   r: 10, aggro: 190, vuela: true },
  reyRata:    { nombre: "Rey Rata",   vida: 190, dano: 9, vel: 64,  xp: 90, oro: [40, 60], r: 22, aggro: 260, jefe: true },
};

// Aldeanos presentes hoy. c, f = casilla del pueblo donde están. «misiones: true» = da misiones; «tienda: true» = vende pociones.
export const ALDEANOS = {
  marta:    { nombre: "Marta",   rol: "Alcaldesa", c: 5,  f: 8,  color: "#d85a8a", misiones: true,
              frases: ["Bienvenido al pueblo. La mazmorra de la colina nos tiene asustados."] },
  hugo:     { nombre: "Hugo",    rol: "Boticario", c: 24, f: 8,  color: "#3fae6a", tienda: true,
              frases: ["Pociones frescas, hechas esta mañana."] },
  lucia:    { nombre: "Lucía",   rol: "Panadera",  c: 7,  f: 12, color: "#e0a050",
              frases: ["Cuando todo esto pase, hornearé pan para todos.", "Dicen que en la mazmorra hay ratas enormes… yo no bajo ni loca."] },
  anselmo:  { nombre: "Anselmo", rol: "Leñador",   c: 16, f: 12, color: "#7a8a4a",
              frases: ["Mi hijo Tomás bajó a la mazmorra y no vuelve. Habla con Marta, quizá ella pueda ayudar."] },
  rosa:     { nombre: "Rosa",    rol: "Pastora",   c: 23, f: 12, color: "#9a6ad0",
              frases: ["Mis ovejas ya no se acercan a la colina."] },
};
// Aparece en el pueblo cuando lo rescatas (flag «tomasRescatado»)
export const TOMAS = { id: "tomas", nombre: "Tomás", rol: "Aventurero", c: 14, f: 10, color: "#e0b040",
  frases: ["¡Gracias por sacarme de esa jaula! Ahora entreno para bajar contigo algún día."] };

// Misiones por aldeano, EN ORDEN. «flag» es la marca que se enciende al cumplir el objetivo (se guarda en la partida).
// tipos: persona (rescatar a alguien), objeto (rescatar un objeto), monstruo (matar a un monstruo)
export const MISIONES = {
  marta: [
    { id: "marta1", tipo: "persona", titulo: "El hijo del leñador", flag: "tomasRescatado", oro: 40, xp: 40,
      texto: "Tomás, el hijo de Anselmo, bajó a la mazmorra y quedó encerrado en una jaula. Búscalo en el nivel 1 y ábrele la puerta.",
      pista: "Busca la jaula de Tomás en el nivel 1 de la mazmorra." },
    { id: "marta2", tipo: "objeto", titulo: "El relicario de la abuela", flag: "relicarioHallado", oro: 60, xp: 60,
      texto: "Un ladrón dejó caer en la mazmorra el relicario de mi abuela. Está en un cofre del nivel 1, tráemelo.",
      pista: "Abre el cofre del fondo del nivel 1 de la mazmorra." },
    { id: "marta3", tipo: "monstruo", titulo: "El Rey Rata", flag: "reyRataMuerto", oro: 120, xp: 120,
      texto: "Un Rey Rata manda sobre las ratas de la mazmorra y sale a robarnos el grano. Acaba con él antes de que crezca más.",
      pista: "El Rey Rata vive en la última sala del nivel 1, junto a la escalera. ¡Es fuerte!" },
    // 4 a 10: pendientes (ver README-fate.md, «Misiones de Marta»)
  ],
};

// ----- Pueblo (30 × 22 casillas de 32 px) -----
export const PUEBLO = {
  cols: 30, filas: 22, spawn: { c: 15, f: 10 },
  casas: [
    { c: 3,  f: 3,  w: 5, h: 4, pared: "#c58a4a", techo: "#8a3b2a", puerta: "abajo",  nombre: "Alcaldía" },
    { c: 22, f: 3,  w: 5, h: 4, pared: "#d9b45a", techo: "#2f6a5a", puerta: "abajo",  nombre: "Botica" },
    { c: 3,  f: 14, w: 5, h: 4, pared: "#c9a07a", techo: "#6a4a8a", puerta: "arriba", nombre: "" },
    { c: 22, f: 14, w: 5, h: 4, pared: "#b9b08a", techo: "#8a5a2a", puerta: "arriba", nombre: "" },
  ],
};
// Cuadrícula del pueblo: 0 = se puede caminar, 1 = bloqueado (borde de árboles, casas, árboles sueltos)
export function construirPueblo() {
  const { cols, filas, casas } = PUEBLO;
  const g = Array.from({ length: filas }, () => Array(cols).fill(0));
  for (let x = 0; x < cols; x++) g[0][x] = g[filas - 1][x] = 1;
  for (let y = 0; y < filas; y++) g[y][0] = g[y][cols - 1] = 1;
  for (const h of casas) for (let dy = 0; dy < h.h; dy++) for (let dx = 0; dx < h.w; dx++) g[h.f + dy][h.c + dx] = 1;
  let s = 12345; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 60; i++) { // árboles sueltos: nunca en la calle central (filas 7 a 13 y columnas 12 a 17), así todo queda alcanzable
    const c = 1 + Math.floor(r() * (cols - 2)), f = 1 + Math.floor(r() * (filas - 2));
    if ((c >= 12 && c <= 17) || (f >= 7 && f <= 13) || g[f][c]) continue;
    if (casas.some((h) => c >= h.c - 1 && c < h.c + h.w + 1 && f >= h.f - 1 && f < h.f + h.h + 1)) continue;
    g[f][c] = 1;
  }
  // la boca de la mazmorra (arriba al centro) es piso caminable
  return g;
}
