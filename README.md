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
| `compartido/configs.js` | Enlaces y ajustes comunes: URL del Apps Script que sube imágenes a imgbb (`URL_SUBIDA_IMAGENES`) y enlace de la hoja «Polo Ai Juegos» (`HOJA_JUEGOS`). Aquí no van claves secretas |
| `compartido/estilos.css` | Estilos comunes de todos los juegos |
| `compartido/pantalla-completa.js` | Botón flotante ⛶ de pantalla completa (solo en táctiles y si la app no está instalada). Se agrega con una línea `<script type="module">` al final del `<body>` de cada página |
| `sw.js` | Service worker: guarda el portal y los juegos para abrirlos sin internet (primero red, con copia de respaldo). Cada juego nuevo se anota en su lista `JUEGOS`; al cambiar esa lista se sube `VERSION` |
| `manifest.webmanifest` | Datos para instalar el portal como app (nombre, colores, íconos) |
| `iconos/` | `icono-180.png`, `icono-192.png`, `icono-512.png` (los usan el portal, el manifest y `sw.js`) |
| `apps-script/subir-imagen.gs` | Código del Apps Script que sube imágenes a imgbb (se pega en script.google.com, no lo lee la página) |
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
| `rompecabezas/index.html`, `rompecabezas/juego.js` | Juego «Rompecabezas»: piezas con lengüetas, 32/64/128/256/512 piezas (la cuadrícula se elige según la proporción de la imagen), zoom con pellizco/rueda/botones, imagen guía (👁) y galería de imágenes guardadas en `localStorage`. La imagen se elige de un archivo, se reduce a 2000 px, se convierte a WebP (JPEG si el navegador no puede) y se sube a imgbb con el Apps Script (`apps-script/subir-imagen.gs`, que guarda la key de imgbb y exige sesión de Google); solo se cargan imágenes de `ibb.co` (también con `?img=`). Los ajustes están al inicio de `juego.js`. Al perfil se envía 1 punto por cada 8 piezas (`PIEZAS_POR_PUNTO`) |
| `pixelart/index.html`, `pixelart/juego.js` | Juego «Pixelart por números»: se sube una imagen (se reduce a 2000 px y se sube a imgbb con el mismo Apps Script que Rompecabezas; la galería de URLs `ibb.co` vive en `localStorage`), se elige 1000, 2500, 5000 o 10000 celdas en el lado largo (10000 usa 120 colores, ver `COLORES_POR_TAMANO`; necesita ~115 MB de memoria y puede fallar en celulares modestos) (la otra se ajusta a la proporción) y se divide en hasta 60 colores numerados (corte por mediana + k-means, tabla de 5 bits por canal). Herramientas: pincel (solo pinta celdas del color elegido), relleno por zonas y mover; zoom con pellizco/rueda; los números se ven al acercar. El avance (bits pintados) se guarda en IndexedDB por imagen y tamaño. Al perfil se envían puntos proporcionales al avance (`PUNTOS_IMAGEN`: 40/100/200/400 al completar), sin repetir al reiniciar. Ajustes al inicio de `juego.js` |
| `jardin/index.html`, `jardin/juego.js`, `jardin/niveles.js` | Juego «Jardín contra zombis» (estilo Plants vs. Zombies, **meta: parecerse lo más posible al original**, ver sección «Jardín contra zombis» más abajo): cartas de plantas, soles, zombis, cortadoras, oleadas con bandera 🚩 y niveles desbloqueables. `juego.js` tiene los ajustes y los bloques `PLANTAS` y `ZOMBIS`; `niveles.js` tiene la lista `NIVELES` (filas activas, plantas disponibles, soles iniciales y oleadas). El progreso y el récord por nivel se guardan en `localStorage`; al perfil se envía 1 punto por cada 25 del juego (`PUNTOS_POR_PERFIL`) |
| `restaurantes/index.html`, `restaurantes/juego.js` | Juego «Restaurantes» (vista isométrica 2:1 estilo Clash of Clans; la lógica usa un mapa plano y `iso()` lo proyecta al dibujar, el fondo se pinta una vez en `armarFondo()`): ya no hay dado ni recepcionista: el juego no tiene fin: llegan grupos de 1, 2 o 4 clientes al azar (cada 4–9 s) sin parar, y el reloj solo cuenta cuánto llevas jugando y esperan frente a la recepción (máximo 2 grupos a la vez); el jugador toca a la familia para darle una de las 4 mesas (cada una con 2 bancas en lados opuestos y 2 personas por banca). Si no hay mesa libre, la recepción está llena o tardan más de 12 s sin que los atiendas (se enojan a los 7 s), se van enojados sin pagar. Ya sentados piden y la cocina prepara. Todavía no hay mesero: el jugador toca el platillo listo en la cocina y luego toca la mesa para entregarlo; a los 8 s de espera los clientes se enojan y a los 15 s se van sin pagar. Algunos van al baño (cuesta $1 dólar), comen y pagan $5 dólares cada uno en la recepción (más lo que sumen las mejoras de SU mesa: al tocar una mesa se abre su menú (el juego se pausa) con las pestañas Mejoras y Personal; en Mejoras: Mesa, Silla 1, Silla 2, Cubiertos, Condimentos, Bebidas y Decoración de la mesa, 5 mejoras cada una que suman 0.50, 0.50, 1, 1 y 1.50 dólares por cliente de esa mesa; cada mesa se mejora por separado y se ve en la mesa y sus sillas; el dinero va en dólares y se divide en monedas de 50 centavos). **Cocina:** al tocar la cocina (cuando no hay platillos listos; si los hay, se toma el platillo como siempre) o con el botón fijo «🍳 Cocina» se abre su menú de mejoras (el juego se pausa), con el mismo estilo que el de las mesas: Estufa (la tienes desde el inicio), Horno, Refri, Segundo refri (requiere el primero), Lavaplatos, Fregadero, Ventilación y Decoración; cada una se compra y luego tiene 5 mejoras. Se definen en `MEJORAS_COCINA` (precios, tipo de efecto y efecto por nivel): «vel» acorta el tiempo de cocina (estufa, horno, ventilación), «pago» suma dólares por cliente en todas las mesas (refris, fregadero, decoración; solo múltiplos de 0.50) y «paciencia» alarga lo que aguantan esperando el platillo (lavaplatos). Lo comprado se ve en el piso de la cocina y se guarda en la partida (`cocina`). **Inicio de partida:** se empieza con `DINERO_INICIAL` (700 dólares) y SIN cocinero: hay que contratarlo en 👥 Empleados por `PRECIO_COCINERO` (450 dólares); mientras no haya cocinero no se puede dar mesa a nadie (la recepcionista tampoco). El segundo cocinero ahora requiere al primero. Las partidas guardadas conservan su cocinero (las muy viejas, sin ese dato, se cargan con uno). También se empieza con un mesero (nivel 1) ya contratado (solo en partidas nuevas). **Sillas:** la 1.ª mejora de Silla 1 y Silla 2 cuesta $80 (`PRECIOS_SILLA`). **Oficina del jefe:** nueva habitación de «🏗️ Construir» (`oficina` en `HAB_NUEVAS`, $20,000, 120 de ancho, va en la pared del fondo y se mueve con 🛠️ Mover); los clientes no pasan por ella (`sinVisitas`) y por ahora no tiene otro efecto. Las 6 habitaciones no caben todas en la pared del fondo: siempre quedará una sin comprar. Los ajustes (frecuencia de llegadas, tamaños de grupo, paciencia en la recepción, pago, costo del baño, niveles del personal (recepcionistas y meseros tienen 10 niveles: `RECEP_TIEMPOS_MS`, `MESERO_VEL` y sus precios de mejora), `BONO_MEJORAS`, `PRECIOS_MEJORA` y `MEJORAS_MESA` (mejoras por mesa), tiempos de enojo y paciencia, probabilidad de baño) están al inicio de `juego.js`. Al perfil se envía 1 punto por cada dólar ganado (`DOLARES_POR_PUNTO`), por lotes de `PUNTOS_LOTE` mientras juegas y lo que falte al reiniciar o salir de la página; el récord (lo ganado en una partida) se guarda en el navegador en cuanto lo superas; hay menú inicial (▶️ Jugar sigue con la última partida; 💾 Partidas guardadas muestra 3 ranuras con Continuar / Nueva partida / Borrar) y autoguardado en el navegador (clave `restaurantes_partidas`, `localStorage`) en cada cobro o compra, cada 10 s (`AUTOGUARDADO_MS`) y al salir de la página: dinero, lo ganado, tiempo jugado, puntos ya enviados, mejoras de cada mesa, nivel de recepcionistas y meseros, terreno, segunda puerta y lugares de estacionamiento (no se guardan los clientes que están dentro en ese momento). El botón ☰ Menú vuelve al menú y Reiniciar vacía solo la ranura activa. El dinero de la versión anterior (`restaurantes_dinero`) pasa una vez a la Partida 1. Las partidas viven en el navegador del dispositivo (no en la nube) |
| `firestore.rules` | Reglas de seguridad; se pegan en la consola de Firebase |

**Regla de las carpetas:** cada juego vive en su carpeta (`nombre-del-juego/index.html` + sus archivos) y llama a lo común con `../compartido/...`. Esa ruta relativa en los `import` y en el `<link>` también indica dónde está cada archivo.

## Seguir el trabajo en otra sesión con Claude

1. Pasa **todos** los archivos que se van a tocar, y siempre este `README.md`. Para el Jardín: `jardin/index.html`, `jardin/juego.js` y `jardin/niveles.js`.
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
- Rompecabezas: primera versión hecha (sin probar en navegador). Falta: pegar `apps-script/subir-imagen.gs` en el Apps Script con sus propiedades (`IMGBB_KEY` nueva, `FIREBASE_API_KEY`, opcional `CORREOS_PERMITIDOS`), confirmar que `compartido/firebase.js` exporta `auth`, y probarlo a mano en el celular (tamaño de piezas, imán, zoom). Agregarlo a `juegos.js` y a `JUEGOS` de `sw.js` (y `compartido/configs.js` a `ARCHIVOS`)
- Pixelart por números: primera versión hecha (sin probar en navegador). Falta: probar subida a imgbb (necesita `auth` exportado en `compartido/firebase.js` y `URL_SUBIDA_IMAGENES` en `compartido/configs.js`), probar 5000×5000 en celular y subir la carpeta `pixelart/`. Pendiente: limpiar celdas sueltas (moda), pistas, compartir avance
- Hoja de Google Sheets «Polo Ai Juegos» (enlace en `compartido/configs.js`, `HOJA_JUEGOS`): creada por El Polo y disponible para usarse si hace falta (registro de subidas, ligas, etc.). Aún no la usa ningún juego; si se usa, anotar aquí qué pestañas/columnas se crearon
- Juegos: `ejemplo` (plantilla, escondida tras el botón «Juego de prueba» del portal), `doodle`, `piano`, `corredor`, `solitario`, `dulces`, `gominolas`, `rompeladrillos`, `burbujas`, `globos`, `pequenos-puzles`, `pixelart`. Pendientes: ajedrez (con puntos y ligas)
- Restaurantes: funciona en el portal; vista isométrica agregada (falta probarla a mano en el celular): llegadas al azar de 1/2/4 clientes durante 120 s, el jugador toca a la familia para darle mesa (sin recepcionista ni dado), cocina, baño y 4 mesas de 4 sillas, 25 pesos por cliente. Falta probarlo a mano en el celular (tamaño del lienzo, tiempos, equilibrio). Pendiente: niveles/dificultad creciente, propinas, mejoras del restaurante
- Juegos en repo propio (con `url` en `juegos.js`): ninguno por ahora

- Revisión de `compartido/` (31 oct 2026): `firestore.rules` ahora valida campos y topes de puntos (`MAX_ENVIO` = 1000, igual que `MAX_PUNTOS_POR_ENVIO` en `jugador.js`); `sumarPuntos` redondea y limita; `sw.js` en VERSION 3 (agregados `pantalla-completa.js` y `rompecabezas`, errores de caché controlados); `estilos.css` con `[hidden]` y foco visible; descripción del manifest corregida. **Falta pegar las nuevas reglas en la consola de Firebase** y subir los archivos al repo. Si un juego deja de guardar puntos tras pegar las reglas, revisar que no escriba campos distintos a `nombre/foto/actualizado/total/mejor`
- Pendiente (seguridad): restringir la `apiKey` de Firebase por dominio en Google Cloud Console (ver «Seguridad»); valorar Firebase App Check más adelante
- Jardín contra zombis: hecho con 4 plantas (girasol, lanzaguisantes, nuez, petardo), 2 zombis (normal, cono) y **25 niveles provisionales** en `niveles.js`. Los niveles 1-1 a 1-5 son «Día»; los llamados «Día 2-x» y «Día 3-x» son **relleno temporal** hecho con lo que ya existía (no son el Noche ni la Piscina reales): hay que reubicarlos o rehacerlos cuando existan esas mecánicas (ver plan por fases). Falta probarlo a mano en el celular. **Pendiente: agregar `jardin` a `juegos.js` y a `JUEGOS` de `sw.js` (subir `VERSION`)**, y que `sw.js` incluya `niveles.js` en sus archivos (`jardin: ["juego.js", "niveles.js"]`)
- Pendiente: `buscaminas` existe en el repo pero falta su línea en `juegos.js`; `ajedrez` aún no existe (está reservado en `sw.js`)

## Jardín contra zombis: meta y guía de Plants vs. Zombies (notas para seguir en otra sesión)

**META DEL PROYECTO:** que «Jardín contra zombis» se parezca **lo más posible al Plants vs. Zombies original** (modo aventura de 50 niveles). Ante cualquier duda de diseño, hacer lo que hace el original. Mantener lo ya acordado: todo con emojis y canvas (sin imágenes), sonidos con WebAudio, juego funcional sin internet, y niveles definidos en `niveles.js`. Si Claude no recuerda un dato del original, debe **buscarlo en la wiki** (Plants vs. Zombies Wiki en wiki.gg o StrategyWiki) en vez de inventarlo.

### Estructura del modo aventura original (5 zonas × 10 niveles = 50)

Regla general: al ganar cada nivel se obtiene una planta nueva, **excepto** los niveles terminados en 4 y 9. El nivel X-5 es un minijuego/especial y el X-10 es la «batalla final» de la zona (todas las plantas llegan por banda transportadora). Los niveles con 0 banderas son 1-1, 2-5, 4-5 y 5-10.

| Zona | Ambiente | Filas | Mecánica propia |
|---|---|---|---|
| 1 (1-1 a 1-10) | Día, jardín delantero | 5 | Caen soles del cielo |
| 2 (2-1 a 2-10) | Noche, jardín delantero | 5 | **No caen soles del cielo.** Aparecen **lápidas** (donde no se puede plantar hasta quitarlas con la «grave buster»); los zombis también salen de lápidas. Plantas «hongo» baratas |
| 3 (3-1 a 3-10) | Piscina, patio trasero (día) | **6** (las 2 de arriba y 2 de abajo son tierra; las **2 del medio son agua**) | En el agua solo se planta sobre **nenúfar** (lily pad) y llegan zombis acuáticos; en esas filas no hay cortadora (hay limpiapiscinas) |
| 4 (4-1 a 4-10) | Niebla, patio trasero (noche) | 6 | **Niebla** cubre la parte derecha; se despeja con farol (plantern) o soplador (blover). 4-5 es «Vasebreaker» (romper jarrones) |
| 5 (5-1 a 5-10) | Techo | 5 | **Todo se planta en macetas**; el techo es inclinado, así que casi todas las plantas que disparan no pasan de la pendiente (solo las catapultas llegan a todo el techo). 5-1 a 5-9 son de día; **5-10 es de noche** y es el jefe final (Dr. Edgar Zomboss) |

### Niveles y plantas nuevas (zonas 1 y 2, según la wiki)

**Zona 1 (Día):** 1-1 lanzaguisantes (solo 1 fila, 0 banderas) · 1-2 girasol (3 filas) · 1-3 petardo/cereza (3 filas) · 1-4 nuez (primera con 5 filas) · 1-5 **boliche de nueces** (banda transportadora, se gana la pala) · 1-6 mina de papa + zombi con garrocha · 1-7 lanzaguisantes de hielo (primer nivel de 2 banderas) · 1-8 planta carnívora (chomper; primer nivel donde hay que **elegir** las plantas porque hay más que ranuras) · 1-9 repetidora (2 banderas; al terminar llega la carta de los zombis, no una planta) · 1-10 **final del Día** con banda transportadora (lanzaguisantes, hielo, repetidora, chomper, nuez, mina, petardo), 2 banderas.

**Zona 2 (Noche):** 2-1 seta Puff (monedas aparecen aquí) · 2-2 seta solar · 2-3 seta Fume · 2-4 grave buster (primer zombi con garrocha de noche) · 2-5 «Whack-a-zombie» (especial, 0 banderas) · 2-6 seta hipnótica · 2-7 seta miedosa · 2-8 seta de hielo · 2-9 seta Doom · 2-10 final de la noche con banda transportadora (puff, fume, miedosa, hipnótica, hielo, doom, grave buster), 2 banderas.

**Zona 3 (Piscina):** 3-1 nenúfar · 3-2 calabaza aplastante (squash) · 3-3 tres-lanzaguisantes (threepeater) · 3-4 alga enredadora (tangle kelp) · 3-5 especial con banda y zombis miniatura · 3-6 jalapeño (aparece el equipo de trineo) · 3-7 pinchos (spikeweed) · 3-8 antorcha (torchwood) · 3-9 nuez alta (tall-nut) · 3-10 final de la piscina con banda.

**Zona 4 (Niebla):** 4-1 seta marina (sea-shroom) · 4-2 farol (plantern) · 4-3 cactus · 4-4 soplador (blover) · 4-5 Vasebreaker · 4-6 repetidora dividida (split pea) · 4-7 estrella (starfruit) · 4-8 calabaza (pumpkin) · 4-9 seta imán (magnet-shroom) · 4-10 final de la niebla (pantalla que parpadea).

**Zona 5 (Techo):** 5-1 catapulta de repollo (cabbage-pult) · 5-2 maceta (flower pot) · 5-3 catapulta de maíz (kernel-pult) · 5-4 café (coffee bean; luego aparece el Jardín Zen) · 5-5 banda transportadora · 5-6 ajo · 5-7 paraguas (umbrella leaf) · 5-8 caléndula (marigold) · 5-9 catapulta de sandía (melon-pult) · 5-10 jefe final Dr. Zomboss.

(Datos tomados de la wiki; si hay duda de un nivel concreto, verificar ahí.)

### Reglas del juego original que hay que copiar (de memoria; verificar números en la wiki al implementarlas)

- Empiezas con **50 soles**; cada sol vale **25**; en zonas de día cae uno del cielo cada ~10 s; el girasol produce 25 cada ~24 s. Las cartas tienen **recarga**: rápida ≈ 7.5 s (lanzaguisantes, girasol…), lenta ≈ 30 s (nuez, mina de papa), muy lenta ≈ 50 s (petardo).
- Costos de referencia: girasol 50 · lanzaguisantes 100 · petardo 150 · nuez 50 · mina de papa 25 · hielo 175 · chomper 150 · repetidora 200 · puff 0 · solar 25 · fume 75 · grave buster 75 · hipnótica 75 · miedosa 25 · seta de hielo 75 · Doom 125 · nenúfar 25 · squash 50 · threepeater 325 · tangle kelp 25 · jalapeño 125 · pinchos 100 · antorcha 175 · nuez alta 125 · maceta 25 · catapulta de repollo 100 · de maíz 100 · sandía 300 · café 75.
- **Cortadora** por fila (ya existe): al llegar un zombi a la casa recorre la fila y los mata a todos; si no hay cortadora, pierdes.
- **Oleadas y banderas:** la barra de progreso inferior muestra las banderas; la bandera es una oleada grande («Una enorme oleada de zombis se acerca») y al final hay una **última oleada** también enorme. (La barra y el aviso 🚩 ya existen.)
- **Selección de plantas:** antes de empezar se eligen las cartas (ranuras: 6 al inicio, hay una 7.ª que se compra, y más adelante hasta 8–10); al aparecer más plantas que ranuras, hay que elegir.
- **Pala** para quitar plantas (se gana en 1-5). **Banda transportadora:** en niveles especiales las cartas llegan solas, sin costo de soles, y no se eligen.
- Zombis de la zona 1: normal (~200 de vida), **cono** (~570), **cubeta** (~1300), **garrocha** (salta la primera planta; rápido al principio), y más adelante periódico, puerta de malla, futbolista, bailarín, etc. Los de piscina nadan con flotador/esnórquel/delfín; también existen Zomboni, trineo, globo, bungee, escalera, caja sorpresa y catapulta.
- **Hongos** de día duermen y se despiertan con café; de noche funcionan solos.

### Qué existe hoy y qué falta (plan por fases)

Hoy: 4 plantas (girasol, lanzaguisantes, nuez, petardo), 2 zombis (normal, cono), 5 filas fijas (`FILAS = 5` en `juego.js`; `NIVEL.filas` activa algunas), cortadoras, soles, oleadas con bandera, progreso en `localStorage`, 25 niveles provisionales.

- **Fase 1 – Zona 1 de verdad (Día, 10 niveles):** rehacer los niveles para que sigan la tabla de arriba (1-1 con una sola fila y solo lanzaguisantes, 1-2 y 1-3 con 3 filas, 1-4 con 5, etc.). Plantas nuevas: mina de papa, lanzaguisantes de hielo (ralentiza), chomper (se come un zombi y tarda en masticar), repetidora. Zombis nuevos: cubeta y **garrocha** (salta una planta). Mecánicas: **pantalla de elegir plantas** antes del nivel (con ranuras limitadas), **pala**, **banda transportadora** (1-5 con boliche de nueces y 1-10), 0 banderas en 1-1.
- **Fase 2 – Zona 2 (Noche):** fondo oscuro, **sin soles del cielo**, **lápidas** (casillas bloqueadas; los zombis también salen de ellas), plantas hongo (puff, solar, fume, grave buster, hipnótica, miedosa, de hielo, Doom), zombis periódico y puerta de malla, nivel 2-5 «Whack-a-zombie». Aquí hay que mover los niveles «Día 2-x» provisionales o reemplazarlos.
- **Fase 3 – Zona 3 (Piscina):** **6 filas** (cambiar `FILAS` a 6 y ajustar `ALTO` y `CELDA_H`/`Y0` del canvas), 2 filas de agua con nenúfar, zombis con flotador, plantas nenúfar/squash/threepeater/tangle kelp/jalapeño/pinchos/antorcha/nuez alta, limpiapiscinas en vez de cortadora en el agua.
- **Fase 4 – Zona 4 (Niebla):** niebla en el lado derecho (farol y soplador), 4-5 Vasebreaker, plantas cactus, estrella, calabaza, imán, repetidora dividida.
- **Fase 5 – Zona 5 (Techo):** macetas, pendiente (los disparos rectos no pasan), catapultas (parábola), café, ajo, paraguas, caléndula, jefe Dr. Zomboss.
- **Extras (cuando las zonas estén):** tienda de Crazy Dave y monedas, almanaque, Jardín Zen, minijuegos, modo supervivencia, repetir la aventura con más dificultad.

### Reglas para quien siga el trabajo

1. Primero lee este README y `jardin/juego.js`; no inventes plantas ni zombis que no estén en `PLANTAS`/`ZOMBIS` al escribir niveles: si hace falta uno nuevo, se agrega **primero** en `juego.js` (con su comportamiento) y luego se usa en `niveles.js`.
2. Una fase a la vez. Al terminar una, actualizar el **Estado** y la tabla de arriba.
3. Cada nivel nuevo se valida con un script (cuenta de zombis, `en` crecientes, plantas que existan) antes de entregarlo.
4. Los niveles se nombran con el esquema real: **zona-nivel** (1-1 … 5-10), y el nombre de la zona (Día, Noche, Piscina, Niebla, Techo) va según la tabla.

## Plan: muchos juegos y uso sin internet (notas para seguir en otra sesión)

Meta: llegar a cientos de juegos pequeños, que se puedan jugar sin internet una y otra vez (como una app de minijuegos), y que con internet sumen puntos y ranking.

**1. Un solo repo mientras sea posible.** Los juegos son solo código (HTML/JS/CSS de unas decenas de KB), así que cientos caben sin problema en un repo de GitHub Pages (los límites aproximados son ~1 GB de sitio y ~100 GB/mes de tráfico; confirmar en la documentación vigente de GitHub Pages). Lo que sí pesa son las imágenes y el audio: por eso los juegos usan emojis, canvas y sonidos generados con WebAudio, y conviene seguir así. Un solo repo = una sola app instalable, una sola sesión de Google, un solo caché.

**2. Cuándo dividir en varios repos.** Solo si el sitio se acerca a ~500 MB o un juego trae archivos pesados: ese juego va a su repo propio y en `juegos.js` se usa `url` en lugar de `carpeta`. Costo: cada repo es otra app/otro service worker/otro caché y no funciona sin internet desde el portal salvo que se abra antes. Si todos viven bajo el mismo usuario de `github.io`, comparten el mismo origen (mismo `localStorage` y misma sesión de Google), pero cada service worker solo controla su propia ruta. No dividir por «orden» ni «para no saturar»: no hace falta.

**3. Sin internet (cómo funciona hoy).** `sw.js` precarga el núcleo (portal, `compartido/`, íconos) y los archivos de cada juego listado en `JUEGOS`; después, todo lo que se abre con internet se guarda y se reutiliza sin conexión. Los archivos del SDK de Firebase se guardan la primera vez. Para que un juego nuevo funcione offline: agregarlo a `JUEGOS` de `sw.js` y subir `VERSION`. **Escalado:** al pasar de ~60 juegos, cambiar el precargado total por «núcleo + cada juego al abrirlo» (ya ocurre con lo visitado) y agregar un botón «Descargar para jugar sin internet» por juego (o por categoría) que le pida al SW guardar su carpeta.

**4. Progreso y puntos.** El progreso va en `localStorage` o IndexedDB (funciona sin internet). Los puntos al perfil (`sumarPuntos`) necesitan internet y sesión; si falla, se pierde ese envío. Pendiente: guardar los puntos no enviados en `localStorage` y reenviarlos al volver la conexión (respetando el tope de la regla).

**5. Imágenes sin internet (Pixelart, Rompecabezas).** Hoy suben la imagen a imgbb y guardan la URL `ibb.co`, por eso necesitan internet. Plan nativo: elegir el archivo → reducirlo con canvas → guardar el Blob en IndexedDB (por imagen) y usarlo desde ahí; imgbb queda solo como opción para respaldar/compartir. Ojo con la memoria en celulares modestos (Pixelart de 10 000 celdas).

**6. Organizar cientos de juegos.** Cuando la lista sea larga: agregar `categoria` a cada entrada de `juegos.js`, filtros por categoría y un buscador en el portal, y marcar favoritos/recientes en `localStorage`. El portal sigue leyendo solo `juegos.js`.

**7. Lista para cada juego nuevo.** (a) copiar `ejemplo/`, cambiar `ID` y la línea `Ruta:`; (b) línea en `juegos.js`; (c) carpeta en `JUEGOS` de `sw.js` y subir `VERSION`; (d) fila en el mapa de archivos y nota en **Estado**; (e) probar sin conexión (modo avión tras abrirlo una vez con internet).

## Seguridad (resumen)

- Nada secreto en el repo: la key de imgbb y la `apiKey` usada por el Apps Script viven en las **Propiedades del script**. La `apiKey` de `compartido/firebase.js` no es secreta, pero conviene **restringirla**: Google Cloud Console → APIs y servicios → Credenciales → esa clave → «Restricciones de sitios web» con `elpologr.github.io` y `localhost`.
- La seguridad real de los datos está en `firestore.rules` (solo escribes tu propio perfil, con campos y topes validados) y en los dominios autorizados de Firebase Authentication.
- Los puntos los calcula el navegador: las reglas solo limitan el daño (topes por envío), no impiden el truco por completo. Para ligas serias: Cloud Functions y/o Firebase App Check.
- Apps Script de imágenes: activar `CORREOS_PERMITIDOS` si solo lo usará una persona; el límite es 10 subidas por hora por usuario.

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
