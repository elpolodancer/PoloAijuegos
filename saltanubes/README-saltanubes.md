# ☁️ Saltanubes — documento de diseño

Ruta: `saltanubes/README-saltanubes.md`. Juego **sin niveles** (tipo B de `ESTANDARES-juegos.md`): no lleva mapa de estados. Id de puntos: `saltanubes`.

## 1. Cómo se juega
- Filas desde abajo: **4 plataformas, 5, 4, 5…** sin fin. Las de 4 quedan entre las de 5, así que desde cualquier plataforma se salta **arriba a la izquierda o arriba a la derecha** (en las orillas solo hay un lado).
- **Tierra** (verde y café): te sostiene. **Nube** (blanca): la atraviesas y te caes (fin de la partida).
- El generador marca en cada fila una plataforma de tierra alcanzable desde la del camino anterior, así que **siempre hay un camino de tierra hacia arriba**. Las demás plataformas son tierra o nube al azar; hay más nubes cada vez (30 % al inicio, tope 70 %).
- **Monedas:** de 1 en algunas plataformas (14 %, también sobre nubes, para tentarte) y **una de 10 cada 100 filas** sobre el camino de tierra. Se suman a tu cartera al tomarlas.
- **Cohete** (tienda, 60 monedas, compra única): una vez comprado aparece en el mapa cada 35–50 filas sobre el camino. Al tomarlo subes **20 filas** volando y aterrizas en el camino de tierra; no te tocan los monstruos durante el vuelo ni 1 s después.
- **Monstruos** (desde la fila 8): van y vienen por una fila en un tramo de ~2 plataformas, rápido al centro y casi parados en las puntas; si te tocan, pierdes. Nunca hay dos filas seguidas con monstruo, así que al salir de una fila con monstruo la siguiente siempre está libre; el truco es calcular cuándo se aleja. Con la altura van un poco más rápido (tope: 2.2 s por vaivén).
- Controles: toca la mitad izquierda o derecha de la pantalla, o ← → (A / D). Un toque durante un salto se recuerda y se usa al aterrizar.
- El cielo oscurece conforme subes.

## 2. Pantallas
Menú (Jugar · Tienda · Ajustes, con tu mejor altura y monedas), partida, fin de partida (Jugar otra vez · Menú), tienda y ajustes (sonido, vibración, borrar progreso con doble toque, sin `confirm()`). Botones fijos estándar: 🎮 Juegos, ☰ (oculto en el menú; «Pausa» en partida; «Menú principal» en tienda y ajustes), 🌙/☀️ y ⛶. La pausa usa `compartido/menu-pausa.js` y se abre sola si la pestaña pasa a segundo plano.

## 3. Archivos
| Archivo | Para qué |
|---|---|
| `index-saltanubes.html` | Página, marcadores (altura y monedas), menú, tienda, ajustes y fin de partida |
| `juego-saltanubes.js` | Juego: saltos, cohete, monstruos, dibujo (canvas transparente sobre la madera), progreso, sonido |
| `generador-saltanubes.js` | **Generador** de filas (camino, nubes, monedas, cohete, monstruos). No usa `document`: se prueba en Node |

## 4. Progreso y puntos
- `localStorage` `saltanubes-progreso` = `{ t, monedas, mejor, cohete }`, sincronizado con `conectar()` y `unirRecientes` (gana la copia más reciente, porque las monedas se gastan). Limitación conocida: si se juega sin conexión en dos aparatos a la vez, uno de los dos pierde sus monedas nuevas al unirse. Ajustes aparte en `saltanubes-ajustes` (no se sincronizan).
- Puntos al perfil al terminar o salir: `altura + 5 × monedas de la partida` (`PUNTOS_POR_MONEDA`), con `encolarPuntos("saltanubes", n)`. Como el juego no tiene fin, no hay tope de puntos por repetir; si no se quiere, bajar o quitar `PUNTOS_POR_MONEDA`.

## 5. Números que se pueden ajustar
En `juego-saltanubes.js`: `PRECIO_COHETE`, `SUBE_COHETE`, `T_SALTO`, `RADIO_MON`, `PUNTOS_POR_MONEDA`. En `generador-saltanubes.js`: `pNube` (nubes), `0.14` (monedas), `proxCohete` (cada cuánto sale el cohete), y en `mon` el largo del tramo (`largo = 2.2`), `per` (segundos por vaivén) y la probabilidad `0.16 + r/1500` (tope 0.35).

## 6. Pruebas hechas / pendientes
- Generador probado en Node (200 mundos × 1500 filas): el camino siempre es tierra y alcanzable, 1 moneda de 10 cada 100 filas, sin filas seguidas con monstruo.
- Lógica probada en Node con un DOM de mentira: un bot que sigue el camino llegó a la fila 400 esquivando monstruos; uno ciego murió contra uno; otro cayó por una nube y se encolaron sus puntos; tomar el cohete sube 20 filas.
- **NO probado en navegador/celular:** aspecto del dibujo, tamaño táctil, rendimiento y sonido. Revisar sobre todo si el tramo del monstruo se entiende y si 0.17 s de salto se siente bien.
- Pendiente: imagen de tarjeta (`imagenes/saltanubes.webp`), más productos en la tienda, más tipos de monstruo.

## 7. Registro en el portal
En `juegos.js` (`JUEGOS`), después de `supervivencia`:
```js
  { id: "saltanubes", nombre: "Saltanubes", icono: "☁️", descripcion: "Salta de plataforma en plataforma hacia arriba, a la izquierda o a la derecha: la tierra te sostiene, las nubes te dejan caer. Junta monedas, esquiva monstruos y compra un cohete que te sube 20 filas.", carpeta: "saltanubes" },
```
y su id en `EN_DESARROLLO`. En `sw.js`, dentro de `JUEGOS`:
```js
  saltanubes: ["juego.js", "generador-saltanubes.js"],
```
y subir `VERSION` (hoy 149 → 150). Si tiene imagen, agregarla a `ARCHIVOS`.

Fila para la tabla «Mapa de archivos» del README principal:

| `saltanubes/index-saltanubes.html`, `juego-saltanubes.js`, `generador-saltanubes.js`, `README-saltanubes.md` | Juego «Saltanubes» (id de puntos `saltanubes`): sube saltando por filas de 4 y 5 plataformas; tierra firme vs. nubes, camino de tierra siempre garantizado, monedas (1 y 10 cada 100 filas), cohete de la tienda (+20 filas) y monstruos que patrullan su fila. Progreso `saltanubes-progreso` `{ t, monedas, mejor, cohete }` con `unirRecientes`. Detalle en `README-saltanubes.md` |

Nota para «Estado»: Saltanubes (11 nov 2026, `sw.js` `VERSION` = 150): hecho con menú, tienda (cohete), ajustes, monedas, monstruos y progreso sincronizado. Generador y lógica probados en Node; la pantalla NO se ha probado en navegador/celular. Pendiente: imagen de tarjeta y más productos.
