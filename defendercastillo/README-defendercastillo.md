<!-- Ruta: defendercastillo/README-defendercastillo.md -->
# Defensa del castillo

Tower defense: los monstruos caminan (o vuelan) hacia tu castillo y tú construyes torres para frenarlos. Al portal se le envía 1 punto por cada 25 del juego al terminar la partida.

## Cómo se juega

- Elige una torre abajo y toca un lugar libre del pasto junto al camino café. Toca una torre para mejorarla (3 niveles) o venderla.
- ▶ empieza la oleada, ☄️ es un **boost de pago**: cuesta 150 💵 (`METEORO.precio` en `logica-defendercastillo.js`), no tiene espera y se pueden acumular varios. Con el botón en «×0» el toque compra uno y lo deja listo; toca el mapa donde quieras que caiga (otro toque al botón cancela y lo guarda), 🪓 sirve para talar árboles y rocas (cuestan monedas) o vender torres con un toque, ⏩ acelera de x1 a x8, ⏸ pausa y 🗺️ vuelve al menú de mapas.
- Cada mapa tiene **10 oleadas** (las 3.ª, 6.ª, 9.ª y 10.ª son fuertes). El dinero se ve con un billete verde dibujado (no con el emoji 💵).
- Si un enemigo llega al castillo le quita vida (el castillo tiene 100). Terminas con 1 a 3 estrellas según la vida que te queda.

## Las dos pestañas del menú de mapas

### 📍 Michoacán (2 niveles por ahora)
Mapa de 12 × 18 generado por semilla (`generador-defendercastillo.js`), con 10 oleadas cada uno (`OLEADAS`). Se abren de uno en uno y cada nivel puede traer torres y enemigos nuevos. La vida de los enemigos de cada nivel está en `calibracion-defendercastillo.js`.

### 🔓 Desbloqueados (2 mapas publicados por ahora; hay 10 diseños guardados, meta: unos 200)
Mapas hechos a mano que se **abren al pasar un nivel de Michoacán** (el mapa 1 con el nivel 1, el 2 con el nivel 2…; el campo `req` de cada mapa lo dice) y después se pueden jugar todas las veces que quieras. Con `?todos` en la dirección se abren todos para probar.

- **Tamaño:** de 12 columnas × 18 filas como mínimo a 30 × 30 como máximo. El marco del juego toma la proporción de cada mapa (`--asp` en `index-defendercastillo.html`).
- **Torres y enemigos:** cada mapa ofrece una torre más que el anterior (el 1 trae arquero y cañón; el 9, las 10) y suma enemigos nuevos (el 1: goblin y lobo; el 9 ya trae golem y ogro). Al empezar un mapa se avisa de lo nuevo.
- **Oleadas:** 10 en todos los mapas (`OLEADAS`; antes 12 y antes de 20 a 40), con un mini-jefe (troll jefe) en la oleada 8 desde el mapa 6 y un jefe al final en los mapas 5 (troll), 8 (2 trolls) y 10 (2 dragones). La dificultad sube por la vida de los enemigos (calibración) y por lo que trae cada oleada.
- **Publicados hoy: D1 y D2.** Los otros 8 diseños siguen en `DISENOS_TODOS` del constructor y se publican subiendo `MAPAS_ACTIVOS`. Los 10 diseños:

| Id | Nombre | Tamaño | Camino | Dificultad |
|---|---|---|---|---|
| D1 | Valle tranquilo | 12×18 | serpentina, 1 entrada | Fácil |
| D2 | Camino del río | 14×20 | serpentina vertical, entra por arriba | Fácil |
| D3 | Espiral del dragón | 16×22 | espiral hacia el centro | Media |
| D4 | Dos puertas | 18×24 | 2 entradas (izquierda y derecha) | Media |
| D5 | Laberinto del bosque | 20×20 | serpentina ancha, entra por la derecha y el castillo queda arriba | Media |
| D6 | Tres entradas | 23×26 | 3 serpentinas (izquierda, centro y derecha) | Difícil |
| D7 | Gran espiral | 24×28 | espiral larga (360 celdas) | Difícil |
| D8 | Cruce de caminos | 26×28 | 2 entradas, arriba y abajo; castillo a la derecha | Difícil |
| D9 | Fortaleza de tres puertas | 29×28 | 3 serpentinas | Muy difícil |
| D10 | El gran castillo | 30×30 | espiral enorme (476 celdas) y jefe dragón | Muy difícil |

## Archivos

| Archivo | Qué es |
|---|---|
| `index-defendercastillo.html` | Página y estilos (dock inferior, menú de mapas, marco con proporción variable) |
| `juego-defendercastillo.js` | Pantalla, controles, sonido y menú de mapas |
| `logica-defendercastillo.js` | Reglas y números de equilibrio: torres (`TORRES`), enemigos (`ENEMIGOS`), oleadas, daño |
| `generador-defendercastillo.js` | Genera los niveles de Michoacán y el reparto de enemigos de cada oleada (`oleadasDe`, que también usan los mapas fijos) |
| `calibracion-defendercastillo.js` | **Generado** por el bot: vida de los enemigos de cada nivel de Michoacán |
| `mapas-desbloqueados-defendercastillo.js` | **Generado** por el constructor: los mapas fijos de «Desbloqueados» (caminos, castillo, obstáculos, torres, oleadas ya calibradas) |
| `bot-defendercastillo.mjs` | Herramienta de Node: un bot juega con las reglas reales (`nivel N`, `calibrar`, `validar`) |
| `constructor-mapas-defendercastillo.mjs` | Herramienta de Node: aquí se **diseñan** los mapas fijos (`ver`, `validar`, `calibrar`, `generar`) |
| `niveles-defendercastillo.js`, `niveles-pc-defendercastillo.js` | Los mapas clásicos de antes. Ya no los carga el juego (los reemplazaron los de «Desbloqueados»); se pueden borrar o guardar de respaldo |

## Cómo agregar o cambiar mapas de «Desbloqueados»

Todo se hace en `constructor-mapas-defendercastillo.mjs`, nunca en el archivo generado.

1. En `DISENOS` agrega un bloque `{ nombre, trazado, nW, jefe?, miniJefe? }`. `trazado` usa `serpH`, `doble`, `tres` o `espiral` (con `transponer`, `espejo` y `volteo` para cambiar por dónde entran los enemigos) o una lista de puntos escrita a mano. Las torres y enemigos de cada mapa salen de las listas `TODAS` y `E` (arriba del archivo).
2. `node constructor-mapas-defendercastillo.mjs ver N` dibuja el mapa en texto (`1`, `2`, `3` = rutas, `C` = castillo, `T` árbol, `R` roca) y revisa: tamaño, entradas fuera del mapa, caminos que se cruzan o se pegan, castillo, árboles de 20 monedas junto al camino y lugares para construir.
3. `node constructor-mapas-defendercastillo.mjs calibrar N` busca la vida de los enemigos para que un bot que juega bien gane con ~95 % de vida en el mapa 1 y ~72 % en el 10, y reescribe el archivo de mapas (de 10 a 110 s por mapa). Resultado actual del bot bueno: 96, 100, 91, 91, 94, 95, 88, 84, 80 y 50 de vida en los mapas 1 a 10. `validar` comprueba que el bot bueno gane y muestra si el de solo arqueros también gana.
4. Anota el archivo en `JUEGOS` de `sw.js` y sube `VERSION`.

Con 200 mapas el archivo sería enorme: cuando pasen de ~20 conviene repartirlos en tandas (`mapas-desbloqueados-1-defendercastillo.js`, `-2-`…) y unirlas en `juego-defendercastillo.js` con un `import` por tanda.

## Calibración sin meteoro (nov 2026)

El meteoro ya no se recarga solo, así que **el bot no lo usa** (antes lo lanzaba cada 40 s y los niveles se calibraron contando con él). Se recalibró todo con el bot sin meteoro, con objetivos 3 puntos más fáciles (`objetivo()` en el bot y en el constructor: ~98 % de vida al ganar el primer nivel) y con un **margen para humanos** (`MARGEN_HUMANO` = 0.9 en el generador): la dificultad tiene un «precipicio» (con ~8 % más de vida el bot ya pierde), así que la calibración se baja 10 % para que una persona tenga holgura. Resultado: Michoacán 1 y 2 con calibración 1.507 y 1.383 (antes 2.008 y 1.987, con meteoro gratis) y D1 y D2 con 1.668 y 1.65 (antes 2.019 y 1.834). Si se siente fácil o difícil, cambia `MARGEN_HUMANO` y corre `calibrar` (tarda segundos con 2 niveles). Para ampliar niveles: sube `NIVELES_MICHOACAN` (generador) o `MAPAS_ACTIVOS` (constructor) y corre `calibrar`.

## Pendiente

- El bot de solo arqueros también gana en 8 de los 10 mapas (todos menos D1 y D7): las torres nuevas todavía no hacen falta para ganar. Si quieres que obliguen a usar variedad, hay que subir la vida de los enemigos blindados o voladores en esos mapas.
- Los mapas 6 y 9 (tres entradas) y el 10 quedaron más lejos del objetivo de vida que el resto (95, 80 y 50 en vez de ~82, ~75 y ~67).
- Probar a mano en celular los mapas grandes (por ejemplo 29×28 o 30×30 en vertical, donde cada celda mide ~12 px y puede costar tocar con precisión); si hace falta, agregar zoom.
- Decidir cómo se desbloquean los mapas 11 a 200 cuando Michoacán tenga más niveles (hoy: mapa N con el nivel N de Michoacán, solo hasta el 10).
