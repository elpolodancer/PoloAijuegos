// Ruta: juegos.js (raíz del repo)
// Lista de juegos del portal. El orden de esta lista es el orden en que aparecen las tarjetas.
//
// Campos de cada juego:
//   id           identificador corto y único del juego
//   nombre       título que se ve en el portal
//   icono        emoji que se muestra si no hay imagen
//   descripcion  una frase de qué trata (texto de ayuda de la tarjeta)
//   carpeta      carpeta del juego dentro de este repo ........ { carpeta: "jetpack" }
//   (la página del juego se abre sola como carpeta/index-carpeta.html: no hace falta anotarla)
//   url          (alternativa a «carpeta») juego pesado en su propio repo ... { url: "https://usuario.github.io/otro-repo/" }
//   imagen       (opcional) imagen del cuadro: "imagenes/nombre.webp"; si falta, se muestra el icono y el nombre
//
// Para agregar un juego:
//   1. Copia la carpeta «ejemplo», cámbiale el nombre y el ID de su juego-<carpeta>.js; renombra index-ejemplo.html a index-<carpeta>.html (y juego/logica/niveles/ia igual).
//   2. Añade una línea aquí.
//   3. Anota su carpeta en «JUEGOS» de sw.js y sube VERSION (así funciona sin internet).
//   4. Si tiene imagen, agrégala también a «ARCHIVOS» de sw.js.
//   5. Agrega su fila en el mapa de archivos del README y una nota en «Estado».
// «ejemplo» (Reflejos) no está en esta lista: se abre con el botón «Juego de prueba» de index.html.
export const JUEGOS = [
  { id: "piano", nombre: "Piano", icono: "🎹", descripcion: "Toca las teclas negras para tocar canciones clásicas y populares: elige una o juega en modo aleatorio.", carpeta: "piano", imagen: "imagenes/piano.webp" },
  { id: "doodle", nombre: "Saltarín", icono: "🦘", descripcion: "Sube lo más alto que puedas: plataformas trampa, enemigos, monedas y un gorro que te lanza 100 m (estilo Doodle Jump).", carpeta: "doodle", imagen: "imagenes/saltarin.webp" },
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
  { id: "defensa", nombre: "Defensa del castillo", icono: "🏰", descripcion: "Oleadas de monstruos avanzan por el camino hacia tu castillo: 10 mapas clásicos y 100 niveles de Michoacán de 30 a 38 oleadas, con 15 enemigos (voladores, blindados, que reviven, se parten, curan…) y 10 torres que se desbloquean al avanzar (arquero, cañón, mago, ballesta, rayos, mortero, hielo, veneno, mina de oro y cuartel). Tala árboles, mejora tus defensas, acelera hasta x5 y usa el meteoro.", carpeta: "defendercastillo" },
  { id: "guerrerodepuntos", nombre: "Devorador", icono: "🐲", descripcion: "Salta de zona en zona: vence a los enemigos de nivel menor al tuyo, quédate con su nivel y crece hasta poder con el guardián.", carpeta: "guerrerodepuntos" },
  { id: "agario", nombre: "Agario", icono: "🟣", descripcion: "Come puntitos y células más chicas para crecer en un mapa enorme con 45 bots; divídete para atrapar a otros y huye de los más grandes.", carpeta: "agario", imagen: "imagenes/agario.webp" },
  { id: "botellascolores", nombre: "Botellas de colores", icono: "🍾", descripcion: "Vierte los colores de una botella a otra hasta que cada botella tenga un solo color: mapa mundial y mapa de México con una etapa de 100 niveles por estado (los 32 estados listos, 3200 niveles), con 5 a 10 botellas y capacidades de 3 a 8; cada nivel tiene solución comprobada y varias formas de resolverlo. Modo niebla, deshacer y reinicio.", carpeta: "botellascolores", imagen: "imagenes/botellascolores.webp" },
  { id: "pantano", nombre: "Ataque al pantano", icono: "🐊", descripcion: "Defiende tu cabaña de los bichos del pantano: apunta, dispara y mejora tus armas (estilo Swamp Attack).", carpeta: "pantano", imagen: "imagenes/pantano.webp" },
  { id: "jardin", nombre: "Jardín contra zombis", icono: "🌻", descripcion: "Planta girasoles, lanzaguisantes, petardos y nueces para frenar a los zombis antes de que lleguen a tu casa: 15 niveles (estilo Plants vs. Zombies).", carpeta: "plantasvszombies" },
  { id: "ladrillos", nombre: "Ladrillos numerados", icono: "🧱", descripcion: "Lanza pelotas infinitas contra ladrillos con números hasta los miles: cada uno aguanta tantos golpes como su número. Consigue ×2, ×3 y ×10 pelotas, acelera o ralentiza y nunca pierdes.", carpeta: "ladrillosnumerados" },
  { id: "estacionamiento", nombre: "Estacionamiento", icono: "🚗", descripcion: "Saca todos los autos de un estacionamiento de 25×25 tocándolos: cada uno avanza hacia donde apunta su flecha y sale por las esquinas. 5 niveles en vista isométrica.", carpeta: "estacionamiento" },
  { id: "fusionanumeros", nombre: "Fusiona números", icono: "🔢", descripcion: "Deja caer bloques con números en 5 columnas: los iguales que quedan pegados se fusionan y suman sus valores, en cadena. Los números que salen suben conforme consigues bloques más altos, hasta cifras enormes.", carpeta: "fusionanumeros" },
  { id: "cadenanumeros", nombre: "Cadena de números", icono: "🔗", descripcion: "Desliza el dedo por números pegados (también en diagonal): empieza con dos iguales y sigue con uno igual o el doble del anterior. Se fusionan en uno solo y caen números nuevos.", carpeta: "cadenanumeros" },
  { id: "hoyo", nombre: "Hoyo", icono: "🕳️", descripcion: "Mueve tu hoyo por la ciudad o por una playa con islas y traga todo lo que quepa: crece, devora a los hoyos más chicos y termina en primer lugar (estilo Hole.io, en vista isométrica).", carpeta: "hoyo" },
  { id: "pelota", nombre: "Pelota", icono: "🔴", descripcion: "Rueda, brinca, empuja cajas y aplasta monstruos para llegar a la bandera: 5 niveles.", carpeta: "pelota" },
  { id: "rana", nombre: "Rana", icono: "🐸", descripcion: "Cruza carreteras y ríos saltando entre coches, camiones y troncos: 50 niveles cada vez más difíciles.", carpeta: "rana" },
  { id: "deslizante", nombre: "Puzle deslizante", icono: "🔢", descripcion: "Desliza las fichas numeradas hasta ponerlas en orden: empieza en 3×3 y sube hasta 8×8, con movimientos, tiempo y tu mejor marca por tamaño.", carpeta: "deslizante" },
  { id: "isla", nombre: "Isla", icono: "🏝️", descripcion: "Isla en vista isométrica: tala árboles, mina rocas, fabrica hacha y pico y construye pisos y paredes. Tu isla se guarda sola.", carpeta: "isla" },
  { id: "minas", nombre: "Minero Tycoon", icono: "⛏️", descripcion: "Compra pozos, sube de nivel a tus mineros, el ascensor y el almacén, contrata gerentes para que trabajen solos (también sin conexión) y haz prestigio para ganar estrellas.", carpeta: "minas" },
  { id: "cavar", nombre: "Cavar", icono: "⛏️", descripcion: "Cava un hoyo en el terreno junto a la casa y encuentra minerales de $1, $2, $5, $10, $20, $50 y $100: llena la mochila, véndela en la caja y mejora la pala, la mochila y la linterna para llegar a 100 m.", carpeta: "cavar" },
  { id: "paperio", nombre: "Paperio", icono: "🟦", descripcion: "Sal de tu territorio dejando una estela y vuelve para quedarte con todo lo que encierres: cuida tu estela, corta la de los 7 bots y llega al mayor territorio (estilo Paper.io).", carpeta: "paperio" },
  { id: "jetpack", nombre: "Jetpack", icono: "🚀", descripcion: "Vuela con tu jetpack: mantén pulsado para subir y suelta para bajar; esquiva zappers y misiles, junta monedas y llega lo más lejos que puedas (estilo Jetpack Joyride).", carpeta: "jetpack" },
  { id: "2048", nombre: "2048", icono: "🔢", descripcion: "Desliza el dedo para juntar números iguales y llegar al 2048 (y más allá): tablero de 4×4, 5×5 o 6×6, con deshacer y tu mejor puntaje por tamaño.", carpeta: "2048" },
  { id: "ajedrez", nombre: "Ajedrez", icono: "♟️", descripcion: "Ajedrez completo contra la computadora: 5 niveles, enroque, al paso, coronación y tablas; juega con blancas o negras y gana puntos la primera vez que vences cada nivel.", carpeta: "ajedrez" },
  { id: "imperio", nombre: "Imperio", icono: "🏛️", descripcion: "Estrategia isométrica estilo Age of Empires: explora un mapa con llanuras, bosques, zonas rocosas, mar y lagos; compra constructores, guerreros y recolectores, junta recursos, caza animales y maneja a tu personaje: pica árboles y rocas, fabrica tablones y construye cajones. Puedes guardar varias partidas.", carpeta: "imperio" },
  { id: "fichas", nombre: "Fichas de frutas", icono: "🍓", descripcion: "Toca las fichas libres y junta 3 iguales en la bandeja antes de que se llene: fichas en capas, 100 niveles y poderes de varita, mezclar y deshacer (estilo Tile Match).", carpeta: "fichas" },
  { id: "zuma", nombre: "Zuma", icono: "🐸", descripcion: "Dispara bolas de colores desde tu rana de piedra y junta 3 o más del mismo color antes de que la cadena llegue al hoyo: combos en cadena y sonidos de piedra (estilo Zuma). 10 niveles de Aguascalientes, iguales para todos los jugadores.", carpeta: "zuma" },
];
