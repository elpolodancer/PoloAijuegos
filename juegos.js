// Ruta: juegos.js (raíz del repo)
// Lista de juegos del portal. Para agregar uno: copia la carpeta «ejemplo», cámbiale el nombre y añade una línea aquí.
// («ejemplo» / Reflejos no está en esta lista: se abre con el botón «Juego de prueba» de index.html).
// - Juego dentro de este repo:      { ..., carpeta: "ajedrez" }
// El orden de esta lista es el orden en que aparecen en el portal.
// - Juego pesado en su propio repo: { ..., url: "https://usuario.github.io/otro-repo/" }
export const JUEGOS = [
  { id: "piano", nombre: "Piano", icono: "🎹", descripcion: "Toca las teclas negras para tocar canciones clásicas y populares: elige una o juega en modo aleatorio.", carpeta: "piano" },
  { id: "doodle", nombre: "Saltarín", icono: "🦘", descripcion: "Sube lo más alto que puedas: plataformas trampa, enemigos, monedas y un gorro que te lanza 100 m (estilo Doodle Jump).", carpeta: "doodle" },
  { id: "corredor", nombre: "Corredor", icono: "🏃", descripcion: "Corre por las vías esquivando trenes y barreras y junta monedas (estilo Subway Surfers).", carpeta: "corredor" },
  { id: "dulces", nombre: "Dulces", icono: "🍬", descripcion: "Junta 3 o más dulces del mismo color: rayas, envueltos, bombas de color, gelatina y 40 niveles (estilo Candy Crush).", carpeta: "dulces" },
  { id: "solitario", nombre: "Solitario", icono: "🃏", descripcion: "El clásico Klondike: ordena las cartas en las 4 bases, con deshacer y puntos.", carpeta: "solitario" },
  { id: "rompeladrillos", nombre: "Rompe Ladrillos", icono: "🧱", descripcion: "Mueve la paleta, rebota la pelota y rompe todos los ladrillos sin perder tus 3 vidas.", carpeta: "rompeladrillos" },
  { id: "gominolas", nombre: "Conecta gominolas", icono: "🐻", descripcion: "Arrastra el dedo por 3 o más gominolas iguales y juntas (también en diagonal) y junta puntos antes de que se acabe el tiempo.", carpeta: "gominolas" },
  { id: "burbujas", nombre: "Burbujas", icono: "🫧", descripcion: "Apunta y dispara burbujas de colores: junta 3 o más del mismo color para reventarlas y despeja el tablero (estilo Bubble Shooter).", carpeta: "burbujas" },
  { id: "globos", nombre: "Lluvia de globos", icono: "🎈", descripcion: "Revienta los globos que caen antes de que toquen el suelo: rachas con más puntos, estrellas, vidas extra, hielo y bombas que no debes tocar.", carpeta: "globos" },
  { id: "puzles", nombre: "Pequeños puzles", icono: "🧩", descripcion: "Encaja piezas de formas raras en la cuadrícula: 70 niveles, algunos con límite de tiempo.", carpeta: "pequenos-puzles" },
];
