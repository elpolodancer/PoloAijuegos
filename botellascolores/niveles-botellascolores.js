// Ruta: botellascolores/niveles-botellascolores.js
// ARCHIVO GENERADO por generar-botellascolores.mjs: no se edita a mano (se pierde al volver a generar).
// Cada nivel: botellas (5 a 10 en total; las que sobran de «colores» quedan vacías), colores (distintos),
// capacidad (capas por botella, 3 a 8) y semilla (fija la mezcla). «oculto: true» = modo niebla.
// NIVELES está VACÍO a propósito: se borraron los 3 200 anteriores para regenerarlos cuando los estándares estén completos
// (ESTANDARES-juegos.md, sección 10). Todo lo que sigue (PALETA, NIVELES_POR_MUNDO y MUNDOS) se conserva.
export const NIVELES = [];

// 16 colores vivos (los 12 primeros no cambian, así los niveles anteriores se ven igual)
export const PALETA = [
  "#ff2d8a", "#ffb000", "#ffe033", "#3dbb4f", "#12a08e", "#29c4f6",
  "#3d5afe", "#8e2de2", "#e53935", "#b07a4f", "#8a8f98", "#e8dcc4",
  "#c6ff00", "#ff8a65", "#b39ddb", "#64ffda",
];

// OJO (24 nov 2026): el mapa ahora es solo de países, 20 niveles por país (195 × 20 = 3 900). MUNDOS ya no se usa (el fondo es la madera estándar); se conserva por si se retoma.
// Fondos (en desuso): la etapa k usa MUNDOS[k] (nombre = tema del fondo, fondo = 3 tonos del degradado, vidrio = color de las botellas, luna = color de la luna)
export const NIVELES_POR_MUNDO = 20;   // niveles por país (mapa solo de países, estándar A-bis)
export const MUNDOS = [
  { nombre: "Noche",            fondo: ["#1d2570", "#121a52", "#0a0f33"], vidrio: "#1b2260", luna: "#2d3b9a" },
  { nombre: "Medianoche",       fondo: ["#3a1d70", "#25124f", "#12082e"], vidrio: "#2a1a62", luna: "#6a3fc0" },
  { nombre: "Océano",           fondo: ["#0e5a73", "#0a3c52", "#061f30"], vidrio: "#0b3a58", luna: "#2aa6b8" },
  { nombre: "Bosque",           fondo: ["#1c5a3a", "#123d29", "#08201a"], vidrio: "#12402e", luna: "#5fae6e" },
  { nombre: "Atardecer",        fondo: ["#7a2f5e", "#4a1f50", "#1e0f33"], vidrio: "#4a1f55", luna: "#e08a5a" },
  { nombre: "Aurora",           fondo: ["#0f5c5a", "#1a3f6a", "#0a1530"], vidrio: "#12395f", luna: "#7affc8" },
  { nombre: "Volcán",           fondo: ["#6e1f1a", "#44130f", "#1d0806"], vidrio: "#4a1612", luna: "#ff8a3c" },
  { nombre: "Cosmos",           fondo: ["#2a1a5e", "#160f3a", "#06040f"], vidrio: "#1c1250", luna: "#b9a6ff" },
  { nombre: "Niebla",           fondo: ["#4b5b73", "#2f3b50", "#161d2b"], vidrio: "#2e3a52", luna: "#9fb2c8" },
  { nombre: "Gigantes",         fondo: ["#2a5c8a", "#173a5e", "#0a1c33"], vidrio: "#183a60", luna: "#ffd166" },
  { nombre: "Niebla profunda",  fondo: ["#3a3f4f", "#232733", "#0d0f16"], vidrio: "#252a3a", luna: "#8f9bb3" },
  { nombre: "Maestro",          fondo: ["#4a3a10", "#2c2208", "#100c02"], vidrio: "#33270a", luna: "#ffcc33" },
  { nombre: "Amanecer",       fondo: ["#8a3a52", "#5a2440", "#220f26"], vidrio: "#5a2444", luna: "#ffb4a2" },
  { nombre: "Desierto",       fondo: ["#8a5a1c", "#5a3a12", "#1f1406"], vidrio: "#5c3c14", luna: "#ffd98a" },
  { nombre: "Esmeralda",      fondo: ["#0f6a4a", "#0a4533", "#04201a"], vidrio: "#0b4a38", luna: "#6dffc0" },
  { nombre: "Tormenta",       fondo: ["#33405e", "#1f2842", "#0a0e1c"], vidrio: "#222c4a", luna: "#a8c0ff" },
  { nombre: "Coral",          fondo: ["#7a2f3e", "#4d1d2e", "#1e0a14"], vidrio: "#4d1f30", luna: "#ff8fa3" },
  { nombre: "Cobre",          fondo: ["#6b3a1f", "#42230f", "#1a0d05"], vidrio: "#46250f", luna: "#e89a5a" },
  { nombre: "Hielo",          fondo: ["#2c6a8a", "#1c4562", "#0a1f33"], vidrio: "#1c4663", luna: "#d6f3ff" },
  { nombre: "Orquídea",       fondo: ["#6a2a7a", "#431b52", "#1a0a24"], vidrio: "#451c55", luna: "#e6a8ff" },
  { nombre: "Selva",          fondo: ["#2a6a1c", "#1a4512", "#0a1f06"], vidrio: "#1a4512", luna: "#b8ff7a" },
  { nombre: "Crepúsculo",     fondo: ["#5a2a7a", "#2f1a5a", "#0d0a24"], vidrio: "#2c1a58", luna: "#ff9ad6" },
  { nombre: "Lavanda",        fondo: ["#5a4a8a", "#392e63", "#150f2a"], vidrio: "#3a2f66", luna: "#d6c8ff" },
  { nombre: "Ámbar",          fondo: ["#8a6a12", "#5a4208", "#201602"], vidrio: "#5e4508", luna: "#ffe07a" },
  { nombre: "Turquesa",       fondo: ["#0f7a7a", "#0a4f58", "#04222a"], vidrio: "#0b5058", luna: "#7affee" },
  { nombre: "Granate",        fondo: ["#7a1a2a", "#4d1019", "#1e060a"], vidrio: "#4e121b", luna: "#ff7a8a" },
  { nombre: "Pizarra",        fondo: ["#4a5a6a", "#2f3b48", "#12181f"], vidrio: "#2f3b4a", luna: "#c0d0e0" },
  { nombre: "Musgo",          fondo: ["#4a6a1a", "#304510", "#121c05"], vidrio: "#32481a", luna: "#d4ff8a" },
  { nombre: "Zafiro",         fondo: ["#1a3a9a", "#102566", "#060d2a"], vidrio: "#112768", luna: "#8ab4ff" },
  { nombre: "Rubí",           fondo: ["#9a1a4a", "#640f30", "#27061a"], vidrio: "#661232", luna: "#ff8ac0" },
  { nombre: "Plata",          fondo: ["#7a8290", "#4f5663", "#1c2028"], vidrio: "#515865", luna: "#f0f4ff" },
  { nombre: "Estelar",        fondo: ["#2a1a6a", "#170f45", "#05031a"], vidrio: "#190f48", luna: "#fff2a8" },
];
