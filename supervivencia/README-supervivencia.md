# 🌲 Supervivencia

> Proyecto: **Juegos (portal)** · juego «Supervivencia» (id `supervivencia`, estilo Last Day on Earth)
> Ruta: `supervivencia/README-supervivencia.md`
> Archivos: `index-supervivencia.html`, `juego-supervivencia.js`
> Mundo: `localStorage` clave `supervivencia_mundo_v1` → `{ v: 1, piso, arboles, x, y, t }`
> Marcas: ✅ hecho · 🔜 por programar · ❓ por decidir

## 1. Estado actual (base)

- ✅ Mapa de **35×35** casillas en **vista isométrica** (rombos 2:1). Un solo `<canvas>` a pantalla completa y transparente (fuera del mapa se ve la madera del estándar). Borde de tierra al sur.
- ✅ **Piso**: madera, piedra y baldosas (losas de 4 px de grosor). Se coloca tocando o arrastrando; 🧽 lo quita. No se coloca sobre un recurso.
- ✅ **Recursos** (se generan al empezar; el centro queda despejado y cerca siempre hay piedras y fibra):

| Recurso | Golpes | Herramienta | Da | Bloquea el paso |
|---|---|---|---|---|
| Piedra suelta | 1 (se recoge) | a mano | 1 piedra | no |
| Fibra | 1 (se recoge) | a mano | 1-2 fibra | no |
| Arbusto de bayas | **5** | a mano | 3-4 bayas | sí |
| Árbol (roble / pino) | **10** | **hacha** (obligatoria) | 3-5 madera | sí |
| Vulto de piedra | **8** | **pico** (obligatorio) | 4-6 piedras | sí |

- ✅ **Cómo se trabaja un recurso**: se toca (o se pulsa Espacio / E para el más cercano) y el personaje camina hasta alcanzarlo y lo golpea solo, un golpe cada 0.55 s, con animación del brazo y la herramienta, sacudida del recurso, barra «golpes/total» y textos «+4 Madera». Si falta la herramienta avisa y no hace nada. Los golpes ya dados se guardan (un árbol a medio talar sigue a medio talar). Los árboles muestran una muesca que crece; los vultos, grietas; el arbusto va perdiendo bayas.
- ✅ **Fabricar** (botón 🛠️): hacha = 3 piedras + 3 fibras; pico = 4 piedras + 3 fibras (`RECETAS`). No piden madera porque al empezar solo hay piedras y fibra sueltas; se pueden cambiar.
- ✅ **Inventario** en chips arriba (Madera, Piedra, Fibra, Bayas y las herramientas que ya tienes). Por ahora los recursos solo se acumulan: todavía no se gastan en nada más que en fabricar.
- ✅ 🌳 ahora **solo planta** árboles en casillas vacías; talarlos exige el hacha.
- ✅ **Personaje**: camina tocando el suelo (rodea obstáculos y suaviza el camino) o con flechas / WASD (en la diagonal de la pantalla). Choca con los recursos que bloquean y con el borde. La cámara lo sigue.
- ✅ **Zoom**: dos dedos o rueda del ratón (0.55× a 1.8×).
- ✅ **Estándar del repo**: `🎮 Juegos` y `☰ Pausa` (Info, «Mundo nuevo» en dos toques, que también borra recursos y herramientas, y Salir), fondo de madera clara/oscura, ⛶ pantalla completa, esquinas reservadas respetadas.
- ✅ Guardado local (`supervivencia_mundo_v2`): mapa, piso, recursos, golpes, inventario, herramientas y posición. Se guarda al cambiar algo (0.8 s), cada 10 s si solo caminaste, al abrir ☰ Pausa y al cerrar o esconder la página. El guardado de la versión anterior (35×35, `_v1`) ya no se usa.

## 2. Cómo está hecho (para seguir construyendo)

- La lógica vive en un **mapa plano** (x, y en casillas; la casilla (i, j) ocupa x∈[i, i+1), y∈[j, j+1)); solo se proyecta con `SX(x, y)` / `SY(x, y, z)`. `aMundo(sx, sy)` es la inversa.
- Datos: `piso`, `objetos` y `dano` son `Uint8Array(1225)`, índice `j * N + i`. Pisos 1 madera, 2 piedra, 3 baldosa. **Todo recurso está en la tabla `OBJ`** (golpes, herramienta, qué suelta, si bloquea): para agregar uno nuevo se pone ahí, se dibuja en `dibujarObjeto()` y se genera en `generarMundo()`.
- Flujo de un golpe: `elegirObjetivo()` (valida herramienta y calcula el camino) → `trabajar(dt)` cada cuadro (si ya alcanza, golpea con `ENFRIAR`) → `golpear(k)` → `romper(k)`.
- Dibujo: borde, suelo por diagonales, cuadrícula/resaltado, y **recursos y personaje juntos ordenados por `x + y`**; la barra de golpes y los textos van encima. Cualquier objeto nuevo con altura entra en esa lista `ents`.
- Choques: `bloqueado(i, j)` y `libre(x, y)`. Rutas: búsqueda en anchura sobre las 1225 casillas + `suavizar()`.
- Todas las cifras (velocidad, golpes, recetas, probabilidades de aparición) son constantes al inicio de `juego-supervivencia.js` o de `generarMundo()`.
- El mundo guardado lleva `t` = `Date.now()` para poder usar `unirRecientes` de `compartido/progreso.js` cuando se sincronice con la cuenta.

## 3. Idea del juego (Last Day on Earth) — por decidir

Lo de esta base es solo el escenario. Lo que sigue, en el orden que parece más natural:

1. ✅ ~~Recursos y herramientas~~ (hecho: piedras, fibra, bayas, árboles con hacha, vultos con pico).
2. 🔜 **Construcción con costo**: el piso y las paredes gastan madera y piedra; paredes y puertas con altura (usar el mismo orden por profundidad).
3. 🔜 **Barras de vida, hambre y sed**: comer las bayas; agua.
   ❓ ¿Los recursos reaparecen con el tiempo? Hoy lo que se rompe no vuelve.
4. 🔜 **Enemigos (zombis)**, combate y armas; ciclo de día y noche.
5. 🔜 **Refugio y mapa más grande** (zonas, cuevas, casas para explorar).
6. ❓ ¿Cámara fija a la isométrica o poder girarla? ¿Mapa de 35×35 fijo o por zonas que se desbloquean?
7. ❓ ¿Cuenta (puntos) o solo avance local? Por ahora no usa Firebase ni puntos.

## 4. Pendiente de registrar en el repo

- `juegos.js` y `sw.js`: ya registrados (`sw.js` `VERSION` = 143).
- Imagen de tarjeta (`imagenes/supervivencia.webp`) y anotarla en `ARCHIVOS` de `sw.js`.
- Sin probar en navegador ni celular real: toques, pellizco para zoom, rendimiento (se dibujan solo las casillas visibles, pero no se midió) y tamaño de los botones en horizontal.
