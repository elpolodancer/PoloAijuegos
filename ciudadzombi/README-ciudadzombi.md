# Ciudad Zombi (`ciudadzombi/`, id de puntos `ciudadzombi`)

Simulador de apocalipsis zombi en una ciudad vista en 2D desde el cielo. Miles de ciudadanos del tamaño de un píxel viven, se esconden, salen por víveres y se defienden; el jugador suelta zombis sin límite, y también puede mandar soldados y bombas. La ciudad entera puede terminar infectada.

## 1. Cómo va a quedar al final (diseño completo)

### Ciudad
- Vista 2D desde arriba, cuadrícula de **manzanas** (cuadras con casas y calles).
- Tamaños: **15×15** (por defecto), **30×30**, **50×50** y **100×100** manzanas.
- Zonas especiales: **tiendas** (azules, donde van por víveres), **armería** (roja, donde algunos ciudadanos entran por armas), **escuela** (mucha gente), **supermercado** (mucha gente) y **estación de policía** (10 policías armados).

### Ciudadanos
- Se dibujan como píxeles muy pequeños. Cantidad a elegir: **20 000** (por defecto), **30 000**, **50 000** o **100 000**.
- Al notar una oleada de zombis **corren hacia las esquinas** o **se ocultan dentro de las casas** como supervivientes. De vez en cuando salen a buscar víveres a las tiendas azules.
- Algunos ciudadanos **ya traen arma** y se defienden; otros entran a la armería roja por una y luego pelean.
- Hay **grupos comunes de 4 humanos que traen arma los 4**.
- Un humano mordido por un zombi se infecta (la ciudad se puede infectar completa si los zombis van acercándose a la gente).

### Zombis
- **Todos los coloca el jugador** (sin límite). Caminan hacia la gente cercana para morderla.
- Pueden ser tantos que rodean cuadras y aparecen por todas partes.

### Tropas y herramientas del jugador
- Botón **Zombis**: colocar zombis donde se toque (sin límite).
- Botón **Soldados** (ejército): tropas armadas que matan zombis.
- Botón **Bombas**: dejar caer una bomba que mata a muchos zombis a la vez.

### Estadísticas

| | Resistencia | Velocidad |
|---|---|---|
| Humano | 5 golpes | 1 |
| Soldado | 15 golpes | 1.5 |
| Zombi | 3 balas | 0.5 |

(La velocidad es relativa: 1 = la del humano. La unidad real, casillas por segundo o píxeles por cuadro, se fija al programar el movimiento.)

### Armas y recarga
- Todo el que trae arma **recarga cada 12 disparos**; la recarga dura **2 segundos**.
- Mientras recarga, el humano **corre a cubrirse**.
- **Nunca se quedan sin balas** (la recarga siempre es posible).

### Policía
- 10 policías armados, con las mismas reglas de arma y recarga.

### Límite de mobs
- **150 000 mobs vivos en total** (`MAX_MOBS`), sumando ciudadanos, policías, soldados y zombis.
- Un ciudadano mordido se convierte en zombi **en el mismo lugar**: infectar no gasta espacio nuevo. Así, con 100 000 ciudadanos quedan 50 000 lugares para los zombis y soldados que ponga el jugador, y a medida que la ciudad se infecta esos zombis «salen» de los propios ciudadanos.
- Cada mob muerto (bala o bomba) libera su lugar: las bombas permiten volver a colocar zombis o soldados. Al llegar al límite los botones de zombis y soldados avisan «Límite de 150 000 alcanzado».
- No es un límite del juego sino del celular: la ciudad es de zombis «sin límite» hasta esos 150 000.

## 2. Menú principal (hecho)
Sigue el estándar (secciones 7 y 9 de `ESTANDARES-juegos.md`): ♾️ Modo libre · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir, más 👤 Iniciar sesión arriba a la derecha.

- **♾️ Modo libre** despliega: tamaño de la ciudad (15×15, 30×30, 50×50, 100×100), cantidad de ciudadanos (20 000, 30 000, 50 000, 100 000), un resumen con las manzanas y los ciudadanos por manzana, y las 5 dificultades (Muy fácil … Experto). Cualquier combinación de tamaño y ciudadanos es válida. La última elección se guarda en el dispositivo (`ciudadzombi_config_v1`, `{ lado, humanos, t }`).
- Al elegir una dificultad, por ahora solo aparece «🚧 La ciudad todavía no está creada» con lo elegido.
- **🪜 Niveles** y **🗺️ Mapa** abren el mapa estándar (`crearEtapas` + `montarMapa`, 32 estados y 194 países, 10 niveles por etapa de forma provisional). Sin niveles todavía: al tocar uno avisa «🚧 Los niveles todavía no están creados». Progreso en `ciudadzombi_progreso_v1` (`{ max, hecho }`).
- ☰ Pausa (solo en Niveles y Mapa): Continuar · 💾 Copia de seguridad · Salir (vuelve al menú).

## 3. Pendiente
- Qué significa cada dificultad (por ejemplo, proporción de armados, soldados disponibles o velocidad de reacción de la gente). **Por definir.**
- El motor de la ciudad: calles, manzanas, casas y zonas especiales para los 4 tamaños.
- Ciudadanos (comportamiento: huir, esconderse, víveres, armería, grupos de 4, escuela, supermercado) y policía.
- Zombis, mordidas e infección; soldados; bombas; armas y recarga.
- Probar el rendimiento EN CELULAR (ver sección 4): las cifras de abajo son de una computadora.
- Niveles del mapa (según la sección 10 de `ESTANDARES-juegos.md`, primero los estándares y las mecánicas, después los niveles).
- Imagen de tarjeta (`imagenes/ciudadzombi.webp`, anotarla en `ARCHIVOS` de `sw.js`).
- Puntos y sincronización del progreso con la cuenta (`conectar()`), si el juego llega a dar puntos.

## 4. Rendimiento con 150 000 mobs (`logica-ciudadzombi.js`, hecho y medido en Node)

**Cómo se guarda:** cada mob es un índice en arreglos tipados de tamaño fijo (`x`, `y`, `vx`, `vy`, `tipo`, `vida`, `armado`, `balas`, `recarga`): ~4 MB en total, sin objetos ni recolector de basura. Los lugares libres van en una pila, así que agregar y quitar mobs es instantáneo.

**Cómo busca vecinos:** dos cuadrículas de 16×16 casillas que se rehacen con un conteo (O(mobs)): una con los no zombis y otra con los zombis. Un zombi solo mira a las víctimas y un humano solo mira a los zombis. Las bombas usan la misma cuadrícula.

**Tres trucos que hicieron falta** (primera versión: 36 ms por paso en 100×100 y 684 ms en 15×15 con 150 000 mobs):
1. Cada mob se mueve 1 de cada 4 pasos y piensa 1 de cada 8 (`RANURAS_MOVER`, `RANURAS_PENSAR`). El juego puede subirlas solo si el celular va lento.
2. Pensar se recorre celda por celda, no por índice, para que los vecinos estén en la caché.
3. Cada mob revisa como máximo 16 vecinos (`MAX_VISTOS`): una multitud de miles cuesta lo mismo que un grupo chico.

**Dibujo:** un píxel por mob escrito directo en un `Uint32Array` (el buffer de un `ImageData`), sin `fillRect` por mob. Los `<canvas>` van transparentes (estándar); el fondo de la ciudad se dibuja aparte y se repinta solo cuando la cámara se mueve.

**Medido en Node (computadora), 150 000 mobs = 100 000 ciudadanos + 50 000 zombis, paso a 30 por segundo:**

| Ciudad | Paso (mediana) | Peor paso | Dibujo de toda la ciudad en 1280×720 |
|---|---|---|---|
| 100×100 manzanas | ≈ 7 ms | ≈ 14 ms | ≈ 3 ms |
| 15×15 manzanas | ≈ 3 ms | ≈ 9 ms | ≈ 2 ms |

Un celular medio puede ir 3 a 5 veces más lento, y el presupuesto es de 33 ms por paso, así que cabe con poco margen. Por eso hay que medir en el celular antes de dar por cerrado el límite de 150 000.

**Cuidado con la densidad:** 150 000 mobs en 15×15 manzanas (360×360 casillas) son más de 1 por casilla: los píxeles se encimarán al dibujar. Es válido (el menú permite cualquier combinación), pero conviene decidir si la manzana crece con la cantidad de ciudadanos.

**Para consola:** `node ciudadzombi/prueba-ciudadzombi.mjs` comprueba el límite, infectar sin gastar lugar, bombas que liberan lugares, golpes, recarga de 12 disparos / 2 s y mide el rendimiento. (Las reglas de movimiento de esa prueba son provisionales.)
