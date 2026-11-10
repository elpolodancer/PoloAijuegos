# 🌲 Supervivencia

> Proyecto: **Juegos (portal)** · juego «Supervivencia» (id `supervivencia`, estilo Last Day on Earth)
> Ruta: `supervivencia/README-supervivencia.md`
> Archivos: `index-supervivencia.html`, `juego-supervivencia.js`
> Mundo: `localStorage` clave `supervivencia_mundo_v1` → `{ v: 1, piso, arboles, x, y, t }`
> Marcas: ✅ hecho · 🔜 por programar · ❓ por decidir

## 1. Estado actual (base)

- ✅ Mapa de **50×50** casillas en **vista isométrica** (rombos 2:1). Un solo `<canvas>` a pantalla completa y transparente (fuera del mapa se ve la madera del estándar). Borde de tierra al sur.
- ✅ **Piso**: madera, piedra y baldosas (losas de 4 px de grosor). Se coloca tocando o arrastrando; 🧽 lo quita.
- ✅ **Árboles**: roble y pino. Se generan al empezar (≈ 7 % de las casillas, algunos bosquecillos, el centro despejado). La herramienta 🌳 planta en una casilla vacía o tala si ya hay uno (al arrastrar hace lo mismo en todas las casillas del trazo). No se planta sobre piso ni sobre el personaje.
- ✅ **Personaje**: camina tocando el suelo (busca el camino rodeando árboles y lo suaviza) o con flechas / WASD (convertidas a la diagonal de la pantalla). Choca con los árboles y con el borde. La cámara lo sigue con suavidad.
- ✅ **Zoom**: dos dedos o rueda del ratón (0.55× a 1.8×).
- ✅ **Estándar del repo**: `🎮 Juegos` y `☰ Pausa` (con Info, «Mundo nuevo» en dos toques y Salir), fondo de madera clara/oscura, ⛶ pantalla completa, zonas de las esquinas respetadas (la barra de herramientas deja 52 px libres a cada lado y baja a 2 filas si no cabe).
- ✅ Guardado local: al cambiar el mapa (a los 0.8 s), cada 10 s si solo te moviste, al abrir ☰ Pausa y al cerrar o esconder la página.

## 2. Cómo está hecho (para seguir construyendo)

- La lógica vive en un **mapa plano** (x, y en casillas; la casilla (i, j) ocupa x∈[i, i+1), y∈[j, j+1)); solo se proyecta con `SX(x, y)` / `SY(x, y, z)`. `aMundo(sx, sy)` es la inversa (para saber qué casilla tocaste).
- Datos: `piso` y `arboles` son `Uint8Array(2500)`, índice `j * N + i`. Pisos 1 madera, 2 piedra, 3 baldosa; árboles 1 roble, 2 pino. **Para agregar un tipo de piso**: una entrada en `PISOS` y `PISO_DE`, un botón en el HTML (`data-h`) y su nombre en `NOMBRE_HERR`.
- Dibujo: primero el borde, luego el suelo por diagonales (de atrás hacia adelante), después la cuadrícula/resaltado de construcción y por último **árboles y personaje juntos, ordenados por `x + y`**. Cualquier objeto nuevo con altura (fogata, cofre, zombi…) se mete en esa lista `ents`.
- Choques: `bloqueado(i, j)` (árbol o fuera del mapa) y `libre(x, y)` (las 4 esquinas del cuerpo, radio `RADIO`). Rutas: búsqueda en anchura sobre las 2500 casillas + `suavizar()`.
- Todas las medidas (velocidad, radio, grosor del piso, zoom, colores del césped) son constantes al inicio de `juego-supervivencia.js`.
- El mundo guardado lleva `t` = `Date.now()` para poder usar `unirRecientes` de `compartido/progreso.js` cuando se sincronice con la cuenta.

## 3. Idea del juego (Last Day on Earth) — por decidir

Lo de esta base es solo el escenario. Lo que sigue, en el orden que parece más natural:

1. 🔜 **Recursos**: talar árboles con hacha (en vez de borrarlos al instante), madera y piedra en el inventario, rocas y arbustos en el mapa.
2. 🔜 **Construcción con costo**: el piso y las paredes gastan recursos; paredes y puertas con altura (usar el mismo orden por profundidad).
3. 🔜 **Barras de vida, hambre y sed**, comida y agua.
4. 🔜 **Enemigos (zombis)**, combate y armas; ciclo de día y noche.
5. 🔜 **Refugio y mapa más grande** (zonas, cuevas, casas para explorar).
6. ❓ ¿Cámara fija a la isométrica o poder girarla? ¿Mapa de 50×50 fijo o por zonas que se desbloquean?
7. ❓ ¿Cuenta (puntos) o solo avance local? Por ahora no usa Firebase ni puntos.

## 4. Pendiente de registrar en el repo

- `juegos.js`: agregar la línea del juego y su id a `EN_DESARROLLO`.
- `sw.js`: `supervivencia: ["juego.js"]` en `JUEGOS` y subir `VERSION`.
- Imagen de tarjeta (`imagenes/supervivencia.webp`) y anotarla en `ARCHIVOS` de `sw.js`.
- Sin probar en navegador ni celular real: toques, pellizco para zoom, rendimiento (se dibujan solo las casillas visibles, pero no se midió) y tamaño de los botones en horizontal.
