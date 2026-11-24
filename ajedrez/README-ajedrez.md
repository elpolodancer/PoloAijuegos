# Ajedrez (id de puntos `ajedrez`) — PROYECTO: Portal Juegos

Ruta: `ajedrez/README-ajedrez.md` · Estado: en la zona «Juegos en desarrollo» (`EN_DESARROLLO`). **Desde el 24 nov 2026 usa el inicio con mapa (ESTANDARES-juegos.md, sección 13) y el mapa solo de países (sección 4A-bis)**, igual que Puzle deslizante. Está todo listo para crear los niveles (sección 10 de los estándares), pero **todavía no se generan niveles nuevos**.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index-ajedrez.html` | Pantallas (inicio, Modo libre, juego) y estilos del tablero. Navegación, inicio, barra del nivel y Modo libre usan las clases compartidas de `compartido/inmersivo.css` (bloque «INICIO CON MAPA») |
| `juego-ajedrez.js` | Pantallas, partida, mapa, pausas, Ajustes, sesión y sincronización |
| `logica-ajedrez.js` | Solo las reglas (movimientos legales, enroque, al paso, coronación, mate, ahogado, tablas) |
| `ia-ajedrez.js` | La computadora: alfa-beta con profundización iterativa y límite de tiempo |
| `niveles-ajedrez.js` | `ETAPAS` (195 países × 20), progreso del mapa `{ max, hecho }` y `LISTA` con el contenido de los niveles hechos |

## Cómo abre (13.1 y 13.2)
- **Pantalla de inicio** (se ve UNA sola vez al abrir o recargar), sobre la madera y sin velo: ♾️ Modo libre (`b-morado`, 56) · ▶ Jugar (`b-verde`, 112) · 🗺️ Mapa (`b-azul`, 56) · ⚙️ Ajustes (`b-cielo`, 44). Sin ☰ en esa pantalla.
- **▶ Jugar** abre el nivel que toca; mientras no se haya pasado ninguno, abre el mapa en el nivel 1. Si el nivel que toca todavía no tiene contenido, abre el mapa en ese nivel (se ve 🚧).
- **Después, el menú principal ES el mapa** (vista del país donde va el jugador). «inicio» siempre significa «abrir el mapa». **Ya no hay capa «▶ Comenzar» ni menú de ☰ Pausa**: se quitó lo que había (la capa, `NIVEL_INICIO` —la partida contra el bot nivel 2 que se veía detrás— y el menú con Reiniciar / Modo libre / Niveles / Info / Menú principal).

## Botones fijos (13.3)
- **🎮** cuadrado 40 px, solo icono (`b3d chico b-azuloscuro`); **☰** cuadrado `b-verdeclaro`, solo icono. `<nav class="nav-juego cuadrada">`.
- **☰ según la pantalla:** inicio y vista principal del mapa → oculto · vistas internas del mapa (Mapa, Niveles) → «Atrás» (sube un paso) · opciones del Modo libre → «Volver al menú principal» (abre el mapa) · nivel → «Volver al menú principal» (abre «¿Salir?») · partida de Modo libre → «Pausa».
- **Arriba a la derecha** (`hud hud-der columna`): el chip de sesión (`#sesion`). Aquí es **tocable** (iniciar / cerrar sesión), porque el juego conservó esa función; los demás juegos con este inicio solo lo hacen tocable dentro de la app instalada sola. **No hay chip de monedas** (el Ajedrez todavía no tiene monedas).
- 🌙/☀️ (madera) abajo a la izquierda y ⛶ abajo a la derecha, como siempre. A diferencia de Deslizante, el botón 🌙/☀️ **sigue visible** (no se oculta con `data-madera-boton`).

## Mapa (13.4)
- `ETAPAS = crearEtapas({ porEtapa: 20, soloPaises: true })` → **195 países × 20 niveles = 3 900**. México primero (niveles 1-20); el orden de los países es `PAISES_MUNDO` (fijo). **No cambiar el orden ni `porEtapa` después de publicar.**
- `montarMapa({ unPais: true, columnas: 4, etiquetaContinuar, botonesExtra: [♾️ Modo libre], alCambiarVista, progreso, jugarNivel, infoNivel, alInfo })`. En el centro del país: «▶ Jugar» hasta pasar el primer nivel y «▶ Continuar» después. Arriba: ♾️ Modo libre, 🗺️ Mapa (el mundo con solo los países abiertos; al tocar uno se ven sus 20 niveles en 4 columnas), 🗂️ Niveles e ℹ️ Info.
- Los niveles sin contenido muestran 🚧; al tocarlos avisa «Los niveles todavía no están creados». Prueba: `index-ajedrez.html?dev=1` → al tocar un nivel sin contenido aparece «✅ Superar» (marca el nivel como pasado sin dar punto de portal).
- Progreso `{ max, hecho }` (un solo número cada uno) en `localStorage` `ajedrez:mapa`, sincronizado con `conectar("ajedrez-mapa", …)` (gana el más alto). La clave y el formato **no cambiaron**.
- **Qué cambió con la numeración:** antes eran 100 niveles por estado y por país (22 600). Los 21 niveles que existen siguen siendo los niveles 1-21: del 1 al 20 caen en México y **el 21 (una partida contra la computadora, ia 2) cae en Guatemala 1**. Si se prefiere que México tenga las tres primeras partidas completas, hay que decidirlo antes de crear niveles nuevos.
- Si algún dispositivo de pruebas guardó un `hecho` mayor a 3 900 (por usar `?dev=1` en el mapa viejo), el juego lo recorta a 3 900; se arregla con ⚙️ Ajustes → «Borrar todo el historial».

## Dentro de un nivel (13.6)
- **Arriba al centro** (`.barra-nivel`): 🗺️ (`b3d b-azul`) y el **botón verde con el nombre del nivel** («Nivel 3 · México»). Al tocar cualquiera de los dos se abre **«¿Salir?»** (`crearMenuPausa`): ▶ Seguir jugando · 🚪 Salir al mapa (ayuda «Se pierde lo avanzado en este tablero.» si ya hay jugadas). Mientras está abierta la computadora no mueve ni se tocan casillas; Esc la abre y la cierra.
- Abajo del tablero: ↩ Deshacer y 🔄 Reiniciar nivel (con confirmación si hay jugadas).
- **Fin de nivel** (sección 6, sobre el tablero, sin velo): «Siguiente nivel ▶» (grande) · Repetir nivel · Mapa · 👁️ Ver tablero. Al terminar los 20 niveles de un país el botón grande es «Ver el mapa» (el agua sube). En el último nivel con contenido el grande es «Repetir nivel». Derrota: «Reintentar» y «Mapa».
- **Pendiente de decidir:** los tres cuadros azules de datos (`.cuadros-datos`, 13.6) **no se pusieron**: el ajedrez no tiene cronómetro ni movimientos como contador natural. Si se quieren, hay que decidir qué tres datos mostrar (por ejemplo Jugadas · Capturas · Tiempo).

## ♾️ Modo libre (13.7)
- Pantalla propia (`.pant-menu`), sin niveles ni mapa. Título; **Dificultad** (5 botones solo con emoji, 😁 😬 😐 😡 😈; el elegido `b-oro on`, el resto `b-cielo`; el nombre va en `title`/`aria-label`) y debajo el nombre y la descripción de la elegida; **Tu color** (♔ Blancas / ♚ Negras); nota; «🏆» de esa dificultad (⭐ si ya se venció) y **▶ Jugar**. Se recuerda la última selección (`ajedrez:nivel`, `ajedrez:color`).
- **Dificultades estándar (cambio de nombres):** 😁 Muy fácil (antes Principiante, 🐣) · 😬 Fácil (Novato, 🐥) · 😐 Normal (Aficionado, 🙂) · 😡 Difícil (Avanzado, 🦉) · 😈 Demoníaco (Maestro, 👑). **El orden y los parámetros del motor no cambiaron**, así que las ⭐ guardadas en `ajedrez:ganados` (1 a 5) siguen correspondiendo a la misma fuerza.
- **Pausa del Modo libre** (☰ «Pausa» o el botón verde «♾️ Modo libre 😐»): ▶ Seguir jugando · 🚪 Salir a elegir tablero. **No hay «Guardar partida»** (el Ajedrez no tiene partidas guardadas).
- Fin de partida: «Jugar otra vez» y «⚙️ Cambiar dificultad».
- `PUNTOS_LIBRE = true` (en `juego-ajedrez.js`): el estándar (7.2 y 11) dice que el Modo libre **no** da puntos de perfil, pero el Ajedrez siempre dio ⭐ y puntos la primera vez que se vence cada dificultad y se conservó. Mientras `ajedrez` esté en `EN_DESARROLLO` esos puntos no suman al total de nadie. **Hay que decidirlo antes de pasarlo a «Juegos»**: poner `false` para cumplir el estándar.

## ⚙️ Ajustes (13.8)
Ventana `.pausa-fondo` + `.pausa-panel.aj-panel`, solo desde la pantalla de inicio. En orden: **💾 Copia de seguridad** (`abrirPanelCopias()` de `compartido/almacen.js`; las claves del Ajedrez ya están en `CLAVES_EXTRA`) · **🗑️ Borrar todo el historial y reiniciar** (dos toques; borra este dispositivo y la cuenta —`ajedrez` y `ajedrez-mapa`—, el agua del mapa y los puntos pendientes; **aparece solo mientras `ajedrez` esté en `EN_DESARROLLO`** y desaparece sola al pasarlo a «Juegos», sin tocar ninguna constante) · **Cerrar**. No lleva «📲 Instalar solo este juego» (el Ajedrez no tiene manifest ni service worker propios).

## Puntos y recompensas (sección 12)
- **Cada nivel del mapa da 1 punto al perfil, solo la primera vez que se pasa** (`encolarNivel("ajedrez")` en `superado()`; se envía con `vaciarPuntos()` cuando hay internet y sesión). Repetir un nivel no da nada; el botón «✅ Superar» de `?dev=1` tampoco.
- Sin monedas ni estrellas por ahora.

## Claves de `localStorage` (no cambiaron)
`ajedrez:mapa` `{ max, hecho }` · `ajedrez:ganados` `{ "1": true … "5": true }` · `ajedrez:nivel` · `ajedrez:color`. Más las del mapa compartido: `ajedrez-agua` y `ajedrez-mundo-visto`. Las cuatro primeras están en `CLAVES_EXTRA` de `almacen.js` (la copia de seguridad). Si se agrega otra clave `ajedrez:…`, anotarla ahí; el estándar pide que las nuevas terminen en `_v1`.

## Niveles hechos (país 1, México, y el primero de Guatemala)
1-3 peón · 4-6 torre · 7-9 caballo · 10-12 alfil · 13-15 dama (el 15: jaque mate) · 16-18 rey (el 18: enroque) · 19-20 primeras partidas (ia 1 con blancas y con negras) · **21 partida ia 2 (cae en Guatemala 1)**.
Son ejercicios de uso, no partidas: solo mueven las blancas. Datos en `LISTA` de `niveles-ajedrez.js`.

## Revisión del 24 nov 2026 (esta migración)
- Probado: sintaxis del JS, coincidencia de todos los ids entre HTML y JS, y en Node el mapa (`total` 3 900, nivel 1 = México, 20 = México 20, 21 = Guatemala 1, 3 900 = China), el progreso con `superarNivel` y `fusionarMapa`. **NO se probó en navegador ni en celular real**: inicio, mapa (botella, mundo, 4 columnas), «¿Salir?», la barra del nivel y el tablero en vertical, horizontal y celular horizontal bajo (el tablero ahora se mide con los márgenes de `.aj`), Ajustes y la sesión.
- La lógica de reglas (`logica-ajedrez.js`, perft en 5 posiciones) y el motor (`ia-ajedrez.js`) **no se tocaron**.

## Pendiente
- Probar todo en navegador y **celular real** (lista de arriba).
- Subir `VERSION` en `sw.js` (hoy 225) al publicar estos cambios. No hay archivos nuevos que anotar: los contornos, las posiciones de países y `almacen.js` ya están en la lista sin internet, y las banderas se guardan solas al verse.
- Decidir: `PUNTOS_LIBRE`; los tres cuadros de datos de la barra del nivel; si México lleva las tres primeras partidas (hoy la tercera cae en Guatemala); monedas/estrellas; imagen de tarjeta (`imagenes/ajedrez.webp` ya está anotada en `sw.js`).
- Texto de la tarjeta en `juegos.js`: dice «gana puntos la primera vez que vences cada nivel»; revisar cuando se decida `PUNTOS_LIBRE`.
- **Niveles del 22 en adelante** (sección 10: primero estándares, después niveles): tácticas (mate en 1/2/3, ganar material, defender) con la dificultad de la sección 8 (`compartido/dificultad-niveles.js`, `dificultadDeNivel(n, 3900)`), generadas y verificadas con `ia-ajedrez.js`, más un `verificar-niveles-ajedrez.mjs` de consola (que no va en `sw.js`).
