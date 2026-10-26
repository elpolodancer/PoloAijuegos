// Ruta: juegos.js (raíz del repo)
// Lista de juegos del portal. Para agregar uno: copia la carpeta «ejemplo», cámbiale el nombre y añade una línea aquí.
// - Juego dentro de este repo:      { ..., carpeta: "ajedrez" }
// - Juego pesado en su propio repo: { ..., url: "https://usuario.github.io/otro-repo/" }
export const JUEGOS = [
  { id: "ejemplo", nombre: "Reflejos", icono: "🎯", descripcion: "Toca el blanco lo más rápido que puedas en 15 segundos.", carpeta: "ejemplo" },
  { id: "doodle", nombre: "Saltarín", icono: "🦘", descripcion: "Sube lo más alto que puedas: plataformas trampa, enemigos, monedas y un gorro que te lanza 100 m (estilo Doodle Jump).", carpeta: "doodle" },
  { id: "piano", nombre: "Piano", icono: "🎹", descripcion: "Toca las teclas negras que bajan sin fallar ninguna.", carpeta: "piano" },
  { id: "corredor", nombre: "Corredor", icono: "🏃", descripcion: "Corre por las vías esquivando trenes y barreras y junta monedas (estilo Subway Surfers).", carpeta: "corredor" },
  { id: "solitario", nombre: "Solitario", icono: "🃏", descripcion: "El clásico Klondike: ordena las cartas en las 4 bases, con deshacer y puntos.", carpeta: "solitario" },
  { id: "dulces", nombre: "Dulces", icono: "🍬", descripcion: "Junta 3 o más dulces del mismo color: rayas, envueltos, bombas de color, gelatina y 40 niveles (estilo Candy Crush).", carpeta: "dulces" },
];
