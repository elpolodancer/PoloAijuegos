# Botellas de colores — referencia de dificultad (juego que se tomó de modelo)

Ruta: `botellascolores/README-botellascolores.md`

Notas tomadas a mano de un juego parecido, para analizar sus patrones y mejorar la dificultad de nuestros niveles (los «bots»).
**Por ahora solo está la dificultad Fácil, niveles 1 a 21.** Faltan Medio, Difícil, Extra difícil y Ultra difícil.

## 1. Cómo leer las notas

- Cada botella se escribe **de abajo hacia arriba** (la primera capa es el fondo, la última es la que se ve arriba y se vierte primero).
- `x2`, `x3`… = capas seguidas del mismo color.
- Las botellas se dibujan en dos filas (mitad arriba, mitad abajo). En el nivel 1 son 3 y 3; en el 2, 2 arriba y 3 abajo; en el 3, 3 arriba y 4 abajo.
- «Capacidad» = cuántas capas caben en una botella.
- **Botella de compra:** en todos los niveles hay una botella extra, siempre la última, que **no se puede usar** hasta comprarla por **200 monedas**.
- **Botellas vacías:** 2 por nivel (el autor lo confirmó en el nivel 16; los niveles 1 a 8 lo cumplen).
- **Capas ocultas:** se ven como «?» y se descubren al dejar esa capa arriba de la botella.
- Monedas: el autor quiere que el nivel dé **pocas monedas**. Nuestro juego **todavía no tiene monedas ni botella de compra**: hoy solo da `PUNTOS_NIVEL = 10` puntos al perfil, la primera vez que se pasa el nivel.

## 2. Niveles dictados completos (fáciles 1 a 10 y 21)

Verificados: en cada nivel, cada color suma exactamente la capacidad.

| Nivel | Botellas | Capacidad | Colores | Llenas / vacías / compra | Ocultas |
|---|---|---|---|---|---|
| 1 | 6 | 3 | 3 | 3 / 2 / 1 | no |
| 2 | 5 | 5 (*) | 2 | 2 / 2 / 1 | no |
| 3 | 7 | 4 | 4 | 4 / 2 / 1 | no |
| 4 | 8 | 3 | 5 | 5 / 2 / 1 | las 2 capas de abajo |
| 5 | 9 | 3 | 6 | 6 / 2 / 1 | no |
| 6 | 7 | 4 | 4 | 4 / 2 / 1 | no |
| 7 | 10 | 3 | 7 | 7 / 2 / 1 | no |
| 8 | 8 | 4 (*) | 5 | 5 / 2 / 1 | las 3 capas de abajo |
| 9 | 10 | 3 | 8 | 8 / 1 / 1 (*) | no |
| 10 | no se dijo | 5 | 4 | 4 / 2 / 1 si son 7 botellas (*) | no |
| 21 | 15 | 3 | 12 | 12 / 2 / 1 | no |

(*) Ver «Dudas por confirmar» al final.

### Contenido de las botellas (de abajo hacia arriba)

**Nivel 1** (rojo, amarillo, azul)
1. rojo, rojo, amarillo
2. amarillo, azul, azul
3. amarillo, azul, rojo

**Nivel 2** (rojo, amarillo)
1. amarillo, rojo, rojo, amarillo, rojo
2. amarillo, amarillo, rojo, amarillo, rojo

**Nivel 3** (verde, amarillo, rojo, azul)
1. verde x3, amarillo
2. verde, rojo, amarillo x2
3. azul x2, rojo x2
4. amarillo, rojo, azul x2

**Nivel 4** (oculto: 2 capas de abajo). Dictado de arriba hacia abajo mientras las descubría; aquí ya convertido a abajo→arriba.
1. naranja, verde, verde
2. naranja, rojo, verde
3. naranja, amarillo, amarillo
4. azul, rojo, rojo
5. amarillo, azul, azul

**Nivel 5** (rosa, naranja, rojo, verde, azul, amarillo)
1. rosa, naranja, naranja
2. naranja, rojo, rojo
3. verde, verde, rosa
4. azul, amarillo, amarillo
5. rojo, azul, azul
6. amarillo, rosa, verde

**Nivel 6** (verde, rojo, azul, amarillo)
1. verde x2, rojo x2
2. azul, verde x2, rojo
3. amarillo, azul x2, rojo
4. amarillo x2, azul, amarillo

**Nivel 7** (azul claro, naranja, rosa, rojo, verde, amarillo, azul oscuro)
1. azul claro, naranja x2
2. rosa, rojo, verde
3. naranja, verde, amarillo
4. azul oscuro, rosa x2
5. azul oscuro x2, azul claro
6. rojo x2, azul claro
7. amarillo x2, verde

**Nivel 8** (oculto: 3 capas de abajo). Dictado de arriba hacia abajo; aquí ya convertido a abajo→arriba.
Ver duda: la botella 3 salió con 5 capas y la capacidad parece ser 4.
1. verde, naranja x2, verde
2. verde, rojo, naranja x2
3. azul oscuro x4, amarillo (¿azul oscuro x3?)
4. azul oscuro, amarillo x3
5. rojo x2, verde, rojo

**Nivel 9** (cafe, azul oscuro, azul claro, verde, rosa, naranja, amarillo, rojo)
1. cafe x2, azul oscuro
2. azul claro x2, verde
3. rosa x2, azul oscuro
4. naranja, amarillo, cafe
5. verde, rosa, rojo
6. azul oscuro, azul claro, verde
7. amarillo, naranja x2
8. amarillo, rojo x2

**Nivel 10** (rojo, verde, amarillo, azul oscuro)
1. rojo, verde x2, amarillo, azul oscuro
2. rojo x2, azul oscuro x3
3. amarillo, verde x3, amarillo
4. amarillo, azul oscuro, rojo, amarillo, rojo

**Nivel 21** (el que más le gustó: «se pone complicado a pesar de estar en Fácil»). 15 botellas, 12 colores, 3 verdes parecidos.
1. verde oscuro, verde medio, cafe
2. morado, blanco, verde claro
3. verde claro, verde oscuro, verde medio
4. cafe x2, morado
5. azul claro, rojo, azul claro
6. rosa, azul claro, blanco
7. naranja, verde oscuro, verde claro
8. verde medio, morado, amarillo
9. azul oscuro, blanco, rosa
10. rojo, azul oscuro x2
11. amarillo, rosa, rojo
12. amarillo, naranja x2

## 3. Niveles 11 a 20 (solo estructura, sin contenido)

| Nivel | Botellas | Capacidad | Colores (deducido) | Notas |
|---|---|---|---|---|
| 11 | 10 | 4 | 7 | |
| 12 | 12 | 3 | 9 | 9 llenas; 3 botellas con las 2 capas de abajo ocultas. Color nuevo: **verde claro** |
| 13 | 8 | 5 | 5 | |
| 14 | 7 | 8 | 4 | La botella más alta vista hasta ahora |
| 15 | 13 | 3 | 10 | 10 llenas. Color nuevo: **morado** |
| 16 | 10 | 4 | 7 | Las primeras 5 botellas tienen las 3 capas de abajo ocultas |
| 17 | 9 | 6 | 6 | |
| 18 | 8 | 5 | 5 | |
| 19 | 13 | 3 | 10 | Color nuevo: **verde oscuro** |
| 20 | 11 | 4 | 8 | En las primeras 5 botellas, las 3 capas de abajo ocultas |

«Colores deducido» = botellas − 3 (2 vacías + 1 de compra).

## 4. Patrones que se ven

1. **Botellas = colores + 3** (2 vacías + 1 de compra). La dificultad no sube dando menos espacio libre: sube con más colores y más capas.
2. **El nivel alterna dos tipos:**
   - **Anchos** (capacidad 3, muchos colores): 3, 5, 6, 7, 8, 9, 10, 10, 12 colores en los niveles 1, 4, 5, 7, 9, 12, 15, 19 y 21.
   - **Altos** (capacidad 4 a 8, pocos colores): 2 a 7 colores en los niveles 2, 3, 6, 8, 10, 11, 13, 14, 16, 17, 18 y 20.
   Un nivel ancho nuevo casi siempre trae más colores que el ancho anterior.
3. **Los colores nuevos aparecen poco a poco** (orden en que se vieron): rojo, amarillo, azul (nivel 1) → verde (3) → naranja (4) → rosa (5) → azul claro y azul oscuro (7) → cafe (9) → verde claro (12) → morado (15) → verde oscuro (19) → verde medio y blanco (21, a más tardar).
4. **Las capas ocultas llegan desde el nivel 4** y crecen: 2 capas de abajo (nivel 4), 3 capas (nivel 8), solo en algunas botellas (niveles 12, 16, 20: 3 y 5 botellas).
5. **Ninguna botella empieza resuelta**, y cada color queda repartido en 2 o 3 botellas (en los niveles de capacidad 3 casi siempre en 3).
6. **Colores parecidos como dificultad extra** (nivel 21): 3 verdes (oscuro, medio, claro) y 2 azules juntos hacen que equivocarse sea fácil sin que el nivel tenga más botellas.
7. Los niveles altos son tramposos porque las botellas empiezan con **capas intercaladas** (por ejemplo `amarillo, rojo, rojo, amarillo, rojo`), no con bloques grandes del mismo color.

## 5. Dudas por confirmar con el autor

- **Nivel 2:** se dijo «5 botellas de 3», pero cada botella tiene 5 capas. Lo anoté como capacidad 5 (cuadra: 5 rojos y 5 amarillos).
- **Nivel 8:** se dijo «8 botellas de 8», pero las botellas tienen 4 o 5 capas. Lo anoté como capacidad 4 y 5 colores. La botella 3 tendría un azul oscuro de más (¿x3 en vez de x4?).
- **Nivel 9:** solo suma 10 botellas con 8 llenas, o sea 1 vacía + 1 de compra y no 2 vacías. Falta saber si es así o si faltó una botella.
- **Nivel 10:** no se dijo el total de botellas (7 si sigue la regla de colores + 3).
- **Nivel 12 (y 16, 20):** no se dijo cuáles botellas llevan capas ocultas.
- **Nivel 21:** el «verde medio» podría ser el «verde» normal de los primeros niveles.

## 6. Qué tiene hoy nuestro juego (para comparar después)

- Los niveles de `niveles-botellascolores.js` se generan con semilla (`crear` en `logica-botellascolores.js`); el juego de referencia usa niveles escritos a mano.
- `oculto` en nuestro juego muestra solo el color de arriba; en el de referencia se ocultan **N capas de abajo** (2 o 3), algunas botellas o todas.
- No hay botella de compra ni monedas.
- Pendiente: el autor pasará la información de los demás niveles/bots (Medio, Difícil, Extra difícil, Ultra difícil) más adelante.

## 7. Revisión de estándares: inicio con mapa (24 nov 2026)

Se pasó el juego al **inicio con mapa** (`ESTANDARES-juegos.md`, sección 13; referencia: Puzle deslizante) y al **mapa solo de países** (A-bis).

**Qué estaba desactualizado y qué se cambió** (`index-botellascolores.html`, `juego-botellascolores.js`, `economia-botellascolores.js`, `logica-botellascolores.js`, `niveles-botellascolores.js`):

- **Inicio:** ya no hay columna de menú con Continuar/Niveles/Info. Pantalla de inicio (se ve una sola vez): ♾️ Modo libre · ▶ Jugar (el doble de alto) · 🗺️ Mapa · ⚙️ Ajustes. **El mapa es el menú principal.** «▶ Jugar» abre el nivel que toca (con 0 niveles pasados abre el mapa en el nivel 1).
- **Botones fijos:** 🎮 y ☰ cuadrados de solo icono (`nav-juego cuadrada`; ☰ en `b-verdeclaro`). El ☰ no se ve en el inicio ni en la vista principal del mapa; en vistas internas del mapa dice «Atrás»; en un nivel abre «¿Salir?»; en una partida libre abre «Pausa»; en las opciones del Modo libre abre el mapa.
- **Arriba a la derecha** (columna): 👤 sesión (tocable: abre Google; con sesión, dos toques la cierran), debajo el chip de monedas y ↩ Deshacer. En un nivel el chip de monedas pasa a la barra de arriba, a la izquierda del 🗺️.
- **En el nivel:** barra 🗺️ + botón verde «Nivel k · País» (pregunta «¿Salir?») y tres cuadros: Movimientos · Botellas listas · Tipo (Fácil/Normal/Difícil; en Modo libre, la ronda). Se quitó «🔄 Reiniciar nivel» de la pausa (se vuelve a empezar con «Repetir nivel» al ganar, o saliendo y entrando).
- **Mapa:** `crearEtapas({ porEtapa: 20, soloPaises: true })` = 195 países × 20 = **3 900 niveles**, `unPais: true`, `columnas: 4`. Fin de nivel «sobre el tablero» con «🗺️ Mapa»; al terminar un país, «Ver el mapa ▶» con el agua subiendo.
- **Modo libre:** grupo «Dificultad» primero, con las 5 estándar solo-emoji (😁 Muy fácil · 😬 Fácil · 😐 Normal · 😡 Difícil · 😈 Demoníaco; los ids `mf f m d e` no cambiaron, así que los récords guardados siguen valiendo), luego Colores y Capacidad. Sin monedas, sin puntos y sin boosts.
- **Puntos:** `encolarNivel(ID)` = **1 punto de portal** por nivel la primera vez (antes 10). Las monedas (4 / 6 / 10) siguen siendo del juego.
- **Progreso:** `botellas_progreso_v4` = `{ n, s, t }` con `n` = nivel más alto pasado (un solo número), `s` = monedas gastadas. Se migran solas las versiones `v3` (`{ h: lista, s, t }`) y `v2` (lista), tanto la local como la de la nube (`normalizar()` y `unirProgreso()` de `economia-botellascolores.js`).
- **Ajustes:** 📲 Instalar solo este juego (no se ofrece si ya está instalado), 💾 Copia de seguridad (`almacen.js`) y Cerrar. 🌙/☀️ sigue como botón flotante abajo a la izquierda. No incluye «Borrar historial» (ver pendientes).
- `NIVELES_POR_MUNDO` pasó de 100 a **20**. `MUNDOS` (fondos por etapa) ya no se usa: el fondo es la madera estándar.

**Pendiente (sección 10, antes de generar niveles):**
1. **Reescribir `generar-botellascolores.mjs`** para 3 900 niveles (195 × 20) con `dificultadDeNivel(n, 3900)` y el campo `tipo` en cada nivel. **Hoy el generador viejo importa `ETAPAS` de `mapa.js` y reescribe `NIVELES_POR_MUNDO` a 100:** no correrlo tal cual. Por eso `mapa.js` NO se borra todavía; cuando el generador ya no lo necesite se borra.
2. Subir `validar-botellascolores.mjs` a la nueva cantidad y pasar la muestra de todo el mapa.
3. `sw.js`: en `JUEGOS`, `botellascolores` debe llevar `economia-botellascolores.js` (hoy falta) y ya no `mapa.js`; subir `VERSION`.
4. Probar en navegador y en celular real (arrastre, botones en horizontal, barra del nivel sobre las botellas).
5. Opcionales: «Borrar historial» solo para pruebas (constante en `false` al publicar) e imagen de tarjeta.

### 7.1 Instalar SOLO este juego (24 nov 2026)

Mismo sistema que Puzle deslizante: el juego se instala como app propia y **no baja ningún otro juego del portal**.

| Archivo | Qué es |
|---|---|
| `manifest-botellascolores.webmanifest` | `id` `juego-botellascolores-el-polo`, nombre «Botellas de colores» (corto «Botellas»), `start_url` `./index-botellascolores.html?app=1`, `scope` `./`, colores `#d9a866` |
| `sw-botellascolores.js` | Service worker propio (alcance: esta carpeta). Caché `app-botellascolores-vN` (no empieza con `juegos-`, así `sw.js` del portal no la borra). Guarda el juego, `compartido/` que usa (incluye `almacen.js`), la madera y las banderas. **Subir su `VERSION` solo si se agregan o quitan archivos de su lista `ARCHIVOS`** (por ejemplo, un módulo nuevo de `compartido/` que importe el juego) |
| `icono-180/192/512-botellascolores.png` y `icono-maskable-512-botellascolores.png` | Tres botellas de colores sobre madera. «any» con esquinas redondeadas y el dibujo casi a todo el tamaño; «maskable» y 180 a sangre completa con el dibujo dentro del 70 % central |

- `index-botellascolores.html` trae el `<link rel="manifest">`, el `apple-touch-icon` y guarda el evento `beforeinstallprompt` en `window.__pwa`. `🎮` lleva `id="btn-portal"`.
- `juego-botellascolores.js` registra el service worker, ofrece el botón en ⚙️ Ajustes (con mensajes para iPhone, navegadores internos de otras apps y Chrome sin evento) y, si se abrió desde su propio icono (`?app=1` + modo standalone), oculta 🎮.
- Estos archivos (manifest, service worker de la app y PNG) **no van en `JUEGOS` de `sw.js`** del portal.
- Cada módulo nuevo de `compartido/` que use el juego debe sumarse también a `ARCHIVOS` de `sw-botellascolores.js`; las banderas se guardan «lo mejor posible».
- Si el sitio es un proyecto de GitHub Pages (`usuario.github.io/REPO/`), la app funciona; lo que no se puede hacer ahí es una TWA con `assetlinks.json`.
- Tras cambiar iconos hay que **desinstalar y volver a instalar** para ver el cambio.

## 8. Boosts, monedas y dificultades (constantes: `economia-botellascolores.js` y arriba de `logica-botellascolores.js`)

### 8.1 Las 5 dificultades del ♾️ Modo libre
El jugador elige aparte los colores (3, 4, 5, 6, 8, 10) y la capacidad (3, 4, 5, 6, 8). La dificultad cambia las botellas vacías y la niebla:

| Dificultad | Vacías | Niebla |
|---|---|---|
| 😊 Muy fácil | 3 | no |
| 🙂 Fácil | 2 | no |
| 😐 Medio | 1 (2 si con 1 no hay solución) | no |
| 😈 Difícil | 2 | sí |
| 💀 Experto | 1 (2 si con 1 no hay solución) | sí |

Toda ronda se comprueba con el solucionador antes de mostrarse. Sin monedas, sin puntos y sin boosts (récord por combinación, en `botellas_libre_v1`).

### 8.2 Los 3 tipos de nivel del mapa (`TIPOS_NIVEL`, provisional)
El reparto 50/40/10 → 25/40/35 % lo da `compartido/dificultad-niveles.js`. Cada tipo se parece a una dificultad del Modo libre:

| Tipo | Se parece a | Capas totales (colores × capacidad) | Probabilidad de niebla |
|---|---|---|---|
| fácil | 🙂 Fácil | 9 a 30 | 0 % |
| normal | 😐 Medio | 20 a 44 | 15 % |
| difícil | 😈 Difícil | 36 a 64 | 40 % |

El generador debe escribir el campo `tipo` en cada nivel (`"facil"`, `"normal"`, `"dificil"`): de ahí salen las monedas. Esta tabla se afina antes de generar y NO se cambia después de publicar.

### 8.3 Monedas
- Se ganan **la primera vez** que se pasa un nivel: fácil **4**, normal **6**, difícil **10**. Repetir un nivel no da nada. Regalo de bienvenida: **100**.
- Cuentas (con el reparto de la sección 8 de los estándares): 100 niveles dan unas **540** monedas al inicio, **615** a la mitad y **690** al final. En los 3 900 niveles, unas **24 000** (media 6,15 por nivel).
- Las monedas ganadas **no se guardan como número**: saldo = 100 + lo que dieron los niveles pasados − lo gastado. Así dos dispositivos que pasaron niveles distintos se unen sin perder ni duplicar monedas. Lo gastado sí se guarda (solo sube; al unir se queda el mayor, así que en el peor caso un dispositivo «devuelve» algunas monedas gastadas sin conexión, nunca quita).
- Progreso guardado: `botellas_progreso_v4` = `{ n: nivel más alto pasado, s: monedas gastadas, t }` y sincronizado con `unirProgreso()` (gana el mayor `n` y el mayor `s`). Las versiones `v3` y `v2` se migran solas al abrir.

### 8.4 Boosts (solo en niveles del mapa; se pagan al usarlos, sin inventario)
| Boost | Precio | Cuánto tarda en ganarse (inicio → final) | Qué hace |
|---|---|---|---|
| 💡 Pista | 25 | 4,6 → 3,6 niveles | Resalta de qué botella a cuál verter (dorado → celeste), con una solución corta (A* ponderado, máx. ~100 ms). Mientras la veas no se cobra otra vez; si haces ese vertido, la siguiente pista sigue el mismo camino. Si el estado ya no tiene solución avisa y no cobra |
| 👁️ Ver niebla | 60 | 11,1 → 8,7 niveles | Muestra todas las capas del nivel. Solo en niveles de niebla |
| 🍾 Botella extra | 200 | 37 → 29 niveles | Agrega una botella vacía. Una por nivel; deshacer no la quita |

El saldo de bienvenida alcanza para 4 pistas. «Reiniciar nivel» reinicia los boosts del nivel pero no devuelve monedas. El 200 de la botella viene del juego de referencia (sección 1). ↩ Deshacer es gratis e ilimitado.

### 8.5 Antes de generar los niveles
Revisar y confirmar: tabla 8.2, monedas y precios de 8.3 y 8.4. `MONEDAS_POR_TIPO` no se cambia después de publicar (cambiaría el saldo de quien ya jugó); los precios de los boosts sí se pueden ajustar.
