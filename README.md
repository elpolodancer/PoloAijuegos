# Juegos

Portal con un juego por carpeta. Cada juego solo carga lo suyo y lo común vive en `compartido/`.

## Mapa de archivos

Cada archivo trae en su **primera línea** su ruta dentro del repo (`Ruta: ...`). Si los archivos se suben sueltos (sin carpetas), esa línea dice dónde va cada uno.

| Ruta | Para qué sirve |
|---|---|
| `index.html` | Portal: muestra la lista de juegos y la sesión con Google (en la raíz del repo). Tiene un botón pequeño «Juego de prueba» junto al título que abre `ejemplo/` (Reflejos), que ya no aparece en la lista |
| `juegos.js` | Lista de juegos. Es lo único que se toca para agregar un juego al portal |
| `compartido/firebase.js` | Configuración de Firebase (se pega una sola vez) |
| `compartido/jugador.js` | Login con Google, puntos totales, mejor marca por juego y ranking |
| `compartido/estilos.css` | Estilos comunes de todos los juegos |
| `ejemplo/index.html` | Página del juego de plantilla «Reflejos» (no es el portal) |
| `ejemplo/juego.js` | Lógica de «Reflejos» |
| `doodle/index.html`, `doodle/juego.js` | Juego «Saltarín» (estilo Doodle Jump): plataformas normales, móviles, trampolín (salto doble), que se rompen y de un solo salto; enemigos, monedas, gorro de 100 m y marcador de metros. Los ajustes (gravedad, metros del gorro, puntos) están al inicio de `juego.js` |
| `piano/index.html`, `piano/juego.js` | Juego «Piano» (estilo Piano Tiles, con sonido): la banda solo avanza al acertar una tecla, cada acierto toca la siguiente nota de una melodía de dominio público (lista `MELODIAS` al inicio de `juego.js`; para agregar otra se copia una línea), menú con «Modo aleatorio» y «Elegir canción», límite de 1 minuto que se reinicia al completar la melodía (que entonces sigue en bucle) y progreso por canción (mejor puntaje, ⭐ al completarla) guardado en `localStorage` |
| `corredor/index.html`, `corredor/juego.js` | Juego «Corredor» (estilo Subway Surfers): 3 carriles en perspectiva, trenes, barreras, barras altas, monedas e imán. Los ajustes (velocidad, salto, puntos) están al inicio de `juego.js` |
| `solitario/index.html`, `solitario/juego.js` | Juego «Solitario» (Klondike clásico): 7 columnas, mazo, descarte y 4 bases; toca para seleccionar y mover, toca la carta seleccionada para subirla a la base, deshacer, tiempo y puntos estilo Windows. Los ajustes (cartas por robada `ROBAR`, puntos, bono de victoria) están al inicio de `juego.js` |
| `dulces/index.html`, `dulces/juego.js`, `dulces/logica.js`, `dulces/niveles.js` | Juego «Dulces» (estilo Candy Crush): 3 en línea, 4 en línea → dulce de rayas, L/T → envuelto, 5 en línea → bomba de color, combinaciones entre especiales, cascadas, gelatina, 3 tipos de objetivo (puntos, gelatina, recoger), 40 niveles con estrellas y bono por movimientos sobrantes. `logica.js` son solo las reglas (sin pantalla); `niveles.js` tiene los moldes y la tabla `AJUSTES` con movimientos/metas de cada nivel (calibrada con simulaciones). Al perfil se envía 1 punto por cada 50 del juego (`PUNTOS_POR_PERFIL` en `juego.js`); las estrellas se guardan en el navegador |
| `gominolas/index.html`, `gominolas/juego.js` | Juego «Conecta gominolas»: arrastra por 3 o más gominolas iguales y juntas (también en diagonal), 60 s con tiempo extra por cadenas largas. Los ajustes (tamaño, colores, tiempos, puntos) están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`); el récord se guarda en el navegador |
| `rompeladrillos/index.html`, `rompeladrillos/juego.js` | Juego «Rompe Ladrillos» (estilo Breakout): paleta con el dedo o las flechas, 3 vidas y un nivel de prueba de 5 filas × 7 columnas (todos los ladrillos se rompen de un golpe). La pelota se acelera con cada ladrillo y el rebote depende de dónde toque la paleta. Los ajustes (vidas, velocidades, puntos por fila, bonos) están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`); el récord se guarda en el navegador |
| `burbujas/index.html`, `burbujas/juego.js` | Juego «Burbujas» (estilo Bubble Shooter): apuntas con el dedo (o flechas) y sueltas, rejilla hexagonal de 10 columnas, 3 o más del mismo color revientan, las que quedan sin apoyo caen, rebote en paredes con guía punteada, burbuja siguiente que se cambia tocándola. **Especiales**: bomba 💣 (reventar 6+ de un tiro), arcoíris 🌈 (hacer caer 4+) y rayo ⚡ (racha de 3 tiros que revientan). **Niveles con formas** (lista `FORMAS`: triángulo, corazón, rombo, cortinas, cara, ondas, castillo, reloj de arena; para agregar una se copia un bloque) con fondo distinto y más colores/menos tiros por fila al avanzar. **Sonidos** generados con WebAudio (sin archivos) y botón 🔊/🔇 guardado en `localStorage`. Los ajustes están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`); el récord se guarda en el navegador |
| `globos/index.html`, `globos/juego.js` | Juego «Lluvia de globos»: caen globos y se revientan tocándolos; si un globo normal llega al suelo pierdes una vida (3 al inicio, máx. 5). Rachas sin fallar suben el multiplicador (hasta x5); tocar en vacío rompe la racha. Globos especiales: ⭐ dorado (50 pts, rápido), ❤️ vida extra, ❄️ hielo (frena todo 3 s) y 💣 bomba (no tocar: quita una vida). Cada 25 s llega una «lluvia» (ráfaga de 8 globos); la velocidad y la frecuencia suben durante ~2 min 30 s y el cielo pasa de día a atardecer. Sonidos con WebAudio y botón 🔊/🔇. Los ajustes (vidas, velocidades, probabilidades, tiempos) están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`); el récord se guarda en el navegador |
| `pequenos-puzles/index.html`, `pequenos-puzles/juego.js`, `pequenos-puzles/logica.js`, `pequenos-puzles/niveles.js` | Juego «Pequeños puzles»: arrastra piezas de formas raras (sin girarlas) para llenar la cuadrícula; 70 niveles previstos, menú de niveles con candado y progreso en `localStorage`. `niveles.js` guarda cada nivel como dibujo de texto (`X` = celda) y su `limite` en segundos si lo tiene (nivel 7: 10 s; el tiempo corre desde el primer toque); `logica.js` son solo reglas y un solucionador para comprobar que cada nivel tiene solución (sin pantalla). Los ajustes están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`), solo la primera vez que se pasa cada nivel |
| `firestore.rules` | Reglas de seguridad; se pegan en la consola de Firebase |

**Regla de las carpetas:** cada juego vive en su carpeta (`nombre-del-juego/index.html` + sus archivos) y llama a lo común con `../compartido/...`. Esa ruta relativa en los `import` y en el `<link>` también indica dónde está cada archivo.

## Seguir el trabajo en otra sesión con Claude

1. Pasa **todos** los archivos que se van a tocar, y siempre este `README.md`.
2. Si los archivos llegan sin carpetas, avisa: «los archivos están sin carpetas; sigue el mapa del README». Si hay dos con el mismo nombre (`index.html`), se distinguen por la línea `Ruta:`.
3. Al terminar cada sesión, actualiza el **Estado** de abajo (o pídeselo a Claude) para que la siguiente sesión sepa dónde quedaste.

## Estado (actualízalo al terminar cada sesión)

- [x] Configuración de Firebase pegada en `compartido/firebase.js` (proyecto `elpolodancer`)
- [ ] Authentication (Google) y Firestore activados; reglas pegadas
- [ ] Dominio `tuusuario.github.io` agregado en dominios autorizados
- [ ] Repo publicado en GitHub Pages
- Saltarín mejorado (enemigos, monedas, plataformas especiales, gorro de 100 m, metros de altura): hecho, probado con simulación; falta probarlo a mano en el navegador
- Corredor (estilo Subway Surfers): hecho y probado con simulación; falta probarlo a mano en el navegador
- Solitario (Klondike): hecho y probado con simulación de partidas (reglas y deshacer); falta probarlo a mano en el navegador
- Dulces (estilo Candy Crush): hecho; reglas probadas con simulaciones y la interfaz probada en un navegador (24 jugadas de un nivel hasta la victoria); falta probarlo a mano en el celular
- Piano: banda manual, 43 melodías, menú, límite de 1 minuto con bucle y progreso local por canción: hecho y probado con simulación; falta probarlo a mano en el navegador. Pendiente: respaldar el progreso en Firestore (ruta `perfiles/{uid}/progreso/{juego}`, con regla de acceso solo para el dueño)
- Gominolas: conectado al perfil (`sumarPuntos`); falta probarlo a mano en el navegador
- Rompe Ladrillos: nivel de prueba hecho y probado con simulación (ganar, perder y envío de puntos); falta probarlo a mano en el navegador. Pendiente: más niveles, ladrillos de varios golpes y mejoras (power-ups)
- Burbujas (estilo Bubble Shooter): versión 2 con especiales, 8 formas de nivel y sonidos; falta probarla a mano en el navegador/celular (sobre todo el equilibrio de los especiales y el volumen). Pendiente: más especiales, más formas, música de fondo
- Lluvia de globos: primera versión hecha y probada con simulación; falta probarla a mano en el celular (velocidad, tamaño de los globos, equilibrio de los especiales). Pendiente: más tipos de globo, modo por tiempo
- Burbujas y Lluvia de globos llaman a `sumarPuntos(juego, puntos)` igual que define `compartido/jugador.js` (revisado). Solo guardan puntos si ya hay sesión: entrar con Google desde el portal basta, la sesión se mantiene en los juegos
- Burbujas y Lluvia de globos usan paso fijo de 1/60 s (se ven igual en pantallas de 90/120 Hz)
- Pequeños puzles: niveles 1 a 10 hechos desde capturas y comprobados con el solucionador (`logica.js`); faltan los niveles 11 a 70 y probarlo a mano en el celular. Pendiente: confirmar que `sumarPuntos("puzles", puntos)` funciona con `compartido/jugador.js`
- Juegos: `ejemplo` (plantilla, escondida tras el botón «Juego de prueba» del portal), `doodle`, `piano`, `corredor`, `solitario`, `dulces`, `gominolas`, `rompeladrillos`, `burbujas`, `globos`, `pequenos-puzles`. Pendientes: ajedrez (con puntos y ligas)
- Juegos en repo propio (con `url` en `juegos.js`): ninguno por ahora

## Puesta en marcha
1. Crea el repo en GitHub, sube estos archivos (con sus carpetas) y activa **Settings → Pages** (rama main, carpeta raíz).
2. En Firebase: activa **Authentication → Google** y **Firestore Database**.
3. Pega la configuración web de tu proyecto en `compartido/firebase.js`.
4. En Firestore → Reglas, pega el contenido de `firestore.rules`.
5. En Authentication → Configuración → Dominios autorizados, agrega `tuusuario.github.io`.

Para probar en tu PC no abras el archivo con doble clic (los módulos no funcionan con `file://`): usa Live Server de VS Code o `npx serve`.

## Agregar un juego
1. Copia la carpeta `ejemplo/` con otro nombre y cambia su `ID` en `juego.js` y la línea `Ruta:` de sus archivos.
2. Agrega una línea en `juegos.js`.
3. Si un juego se vuelve pesado, muévelo a su propio repo y en `juegos.js` usa `url` en lugar de `carpeta`.

Nota: los puntos los calcula el navegador, así que un jugador con conocimientos podría falsearlos. Para ligas serias, más adelante conviene validarlos con Cloud Functions.
