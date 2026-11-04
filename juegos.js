// Ruta: juegos.js (raíz del repo)
// Lista de juegos del portal. Para agregar uno: copia la carpeta «ejemplo», cámbiale el nombre y añade una línea aquí.
// («ejemplo» / Reflejos no está en esta lista: se abre con el botón «Juego de prueba» de index.html).
// - Juego dentro de este repo:      { ..., carpeta: "ajedrez" }
// - Imagen del cuadro (opcional): imagen: "imagenes/nombre.webp"; si falta, se muestra el icono y el nombre.
// El orden de esta lista es el orden en que aparecen en el portal.
// - Juego pesado en su propio repo: { ..., url: "https://usuario.github.io/otro-repo/" }
export const JUEGOS = [
  { id: "piano", nombre: "Piano", icono: "🎹", descripcion: "Toca las teclas negras para tocar canciones clásicas y populares: elige una o juega en modo aleatorio.", carpeta: "piano", imagen: "imagenes/piano.webp" },
  { id: "doodle", nombre: "Saltarín", icono: "🦘", descripcion: "Sube lo más alto que puedas: plataformas trampa, enemigos, monedas y un gorro que te lanza 100 m (estilo Doodle Jump).", carpeta: "doodle" },
  { id: "corredor", nombre: "Corredor", icono: "🏃", descripcion: "Corre por las vías esquivando trenes y barreras y junta monedas (estilo Subway Surfers).", carpeta: "corredor", imagen: "imagenes/corredor.webp" },
  { id: "dulces", nombre: "Dulces", icono: "🍬", descripcion: "Junta 3 o más dulces del mismo color: rayas, envueltos, bombas de color, gelatina y 40 niveles (estilo Candy Crush).", carpeta: "dulces", imagen: "imagenes/dulces.webp" },
  { id: "solitario", nombre: "Solitario", icono: "🃏", descripcion: "El clásico Klondike: ordena las cartas en las 4 bases, con deshacer y puntos.", carpeta: "solitario", imagen: "imagenes/solitario.webp" },
  { id: "rompeladrillos", nombre: "Rompe Ladrillos", icono: "🧱", descripcion: "Mueve la paleta, rebota la pelota y rompe todos los ladrillos sin perder tus 3 vidas.", carpeta: "rompeladrillos" },
  { id: "gominolas", nombre: "Conecta gominolas", icono: "🐻", descripcion: "Arrastra el dedo por 3 o más gominolas iguales y juntas (también en diagonal) y junta puntos antes de que se acabe el tiempo.", carpeta: "gominolas", imagen: "imagenes/gominolas.webp" },
  { id: "burbujas", nombre: "Burbujas", icono: "🫧", descripcion: "Apunta y dispara burbujas de colores: junta 3 o más del mismo color para reventarlas y despeja el tablero (estilo Bubble Shooter).", carpeta: "burbujas" },
  { id: "globos", nombre: "Lluvia de globos", icono: "🎈", descripcion: "Una cubeta de globos de agua de colores se vacía en la pantalla: desliza el dedo por 3 o más globos pegados del mismo color para reventarlos y no dejes que la pila pase la línea roja.", carpeta: "globos" },
  { id: "puzles", nombre: "Pequeños puzles", icono: "🧩", descripcion: "Encaja piezas de formas raras en la cuadrícula: 70 niveles, algunos con límite de tiempo.", carpeta: "pequenos-puzles" },
  { id: "pixelart", nombre: "Pixelart por números", icono: "🎨", descripcion: "Sube una foto y píntala por números: se divide en 60 colores y hasta 100 millones de celdas (1000, 2500, 5000 o 10 000, este último con 120 colores).", carpeta: "pixelart" },
  { id: "supermercado", nombre: "Supermercado", icono: "🛒", descripcion: "Compra una estantería y un jardín, cultiva jitomates, colócalos para vender y atiende a los clientes: cada producto vale 1 dólar.", carpeta: "supermercado" },
  { id: "pradera", nombre: "Pradera", icono: "🦊", descripcion: "Corre y salta por la pradera, aplasta bichos, rompe ladrillos y llega al castillo antes de que se acabe el tiempo (estilo Mario).", carpeta: "pradera", imagen: "imagenes/pradera.webp" },
  { id: "rompecabezas", nombre: "Rompecabezas", icono: "🧩", descripcion: "Arma un rompecabezas con tu propia imagen: de 32 a 512 piezas, con zoom y guía; si entras con Google puedes guardar tus imágenes.", carpeta: "rompecabezas", imagen: "imagenes/rompecabezas.webp" },
  { id: "buscaminas", nombre: "Buscaminas", icono: "💣", descripcion: "Despeja el tablero sin pisar ninguna mina: toca para abrir, mantén pulsado para poner bandera. Tres niveles y tu mejor tiempo.", carpeta: "buscaminas", imagen: "imagenes/buscaminas.webp" },
  { id: "restaurantes", nombre: "Restaurantes", icono: "🍽️", descripcion: "Los clientes llegan solos: toca a cada familia en la recepción para darle mesa (si no hay, se van enojados). Lleva tú mismo cada platillo de la cocina a su mesa antes de que se enojen y se vayan: cada cliente paga $5 dólares y el baño cuesta $2 dólares. Mejora mesas y sillas: cada nivel suma 50 centavos por cliente. No tiene fin: juega todo el tiempo que quieras.", carpeta: "restaurantes", imagen: "imagenes/restaurante.webp" },
  { id: "defensa", nombre: "Defensa del castillo", icono: "🏰", descripcion: "Oleadas de monstruos avanzan por el camino hacia tu castillo: elige entre 10 mapas, coloca arqueros, cañones, magos, ballestas y torres de rayos, tala árboles, mejora tus defensas y usa el meteoro para aguantar hasta el jefe.", carpeta: "defendercastillo" },
  { id: "guerrerodepuntos", nombre: "Devorador", icono: "🐲", descripcion: "Salta de zona en zona: vence a los enemigos de nivel menor al tuyo, quédate con su nivel y crece hasta poder con el guardián.", carpeta: "guerrerodepuntos" },
  { id: "agario", nombre: "Agario", icono: "🟣", descripcion: "Come puntitos y células más chicas para crecer en un mapa enorme con 45 bots; divídete para atrapar a otros y huye de los más grandes.", carpeta: "agario", imagen: "imagenes/agario.webp" },
  { id: "botellascolores", nombre: "Botellas de colores", icono: "🍾", descripcion: "Vierte los colores de una botella a otra hasta que cada botella tenga un solo color: 50 niveles, con deshacer y reinicio.", carpeta: "botellascolores", imagen: "imagenes/botellascolores.webp" },
];
