# Mapa general y franja exterior: cómo conectarlo a `juego-supervivencia.js`

Archivos nuevos (ninguno cambia el juego por sí solo): `zonas-supervivencia.js` (datos), `mapa-general-supervivencia.js` (franja + viaje),
`dibujo-mapa-mundo.js` (dibujo), `prueba-mapa-general.html` (vista previa), `prueba-mapa-general.mjs` (pruebas).
⚠️ Se escribió sin ver `juego-supervivencia.js`: los nombres `libre`, `bloqueado`, `ents`, `SX/SY` son los del README (sección 2); revisa que coincidan.

## 1. Franja exterior (2 casillas, se camina, no se construye, sin obstáculos)
1. `import { BORDE, PISO_ANILLO, COLOR_ANILLO, casillasAnillo, puedeConstruir, casillaLibre, limitesCaminables, salida, devolverAdentro, entrada } from "./mapa-general-supervivencia.js";`
2. **Caminar:** en `libre(x, y)` cambia los límites de `0..N` a `limitesCaminables(N)` (-2..37) y, para casillas dentro del anillo, devuelve libre sin mirar `objetos`
   (o usa `casillaLibre(i, j, N, (i, j) => bloqueado(i, j))`). La búsqueda en anchura (`suavizar()` incluido) debe aceptar casillas de -2 a 36: usa `indiceExt` para su arreglo de visitados.
3. **Dibujar:** después del suelo y antes de `ents`, recorre `casillasAnillo(N)` y píntalas con tu función de losa usando `COLOR_ANILLO.fondo` (caben en el mismo orden por diagonales).
4. **No construir:** en piso, 🧽 y 🌳 llama primero a `puedeConstruir(i, j, N)`; si es `false`, avisa «Aquí no se puede construir» y no hagas nada. `piso`, `objetos` y `dano` siguen siendo `Uint8Array(1225)`: el anillo no se guarda, es siempre igual.
5. **Sin obstáculos:** `generarMundo()` no cambia (solo llena 0..N-1). Nada que aparezca después (cajas, animales, enemigos) debe nacer donde `puedeHaberObjeto` sea `false`.
6. **Zoom/cámara:** que el límite de la cámara use también -2..N+2 para que se vea la franja entera.

## 2. Salir al mapa general
En el cuadro (`actualizar(dt)`), después de mover al personaje: `const lado = salida(p.x, p.y, N); if (lado) abrirMapaGeneral(lado);`
- `abrirMapaGeneral(lado)`: detiene al personaje, guarda (`guardar()`), muestra `#mundo` y dibuja con `dibujarMapaMundo(ctx, w, h, { estado: viaje, seleccion })`.
- Un toque elige la zona (`zonaEn(hits, x, y)`); un segundo toque sobre la misma llama `viajar(viaje, id)`; si `ok` muestra la carga `r.segundos` s y entra a la zona (`r.destino`).
  Si `!ok`: `textoRazon(r)` en la placa o un aviso. Si `r.destino.vacio` (búnker): entra a un mapa vacío o avisa «Todavía no tiene nada».
- Botón «⬅️ Volver a la base» → `Object.assign(p, devolverAdentro(p.x, p.y, N))` y cierra `#mundo` (así no se vuelve a disparar la salida).
- Al volver de una zona: `Object.assign(p, entrada(zona.rumbo, N))`.
- ☰ Pausa: mientras `#mundo` está abierto, `puedeAbrir: () => !mundoAbierto`.

## 3. HTML (pegar en `index-supervivencia.html`, junto a los demás `.ovl`)
```html
<div class="ovl" id="mundo" hidden>
  <h2>🗺️ Mapa general</h2>
  <canvas id="lienzoMundo" width="900" height="680" style="width:100%;max-width:900px;height:auto;touch-action:manipulation" aria-label="Mapa general con las zonas"></canvas>
  <div class="jugar"><button class="b3d txt b-azul" id="mundoVolver" type="button"><span class="b-ico">⬅️</span> Volver a la base</button></div>
</div>
```
Con pantalla retina: ajusta `width/height` del canvas a `css * devicePixelRatio` y usa `ctx.setTransform(dpr,0,0,dpr,0,0)`; `dibujarMapaMundo` recibe el tamaño en píxeles CSS.

## 4. Guardado (entra en el `v: 3` único)
Agregar al mundo guardado: `viaje: { energia, energiaMax, nivel, t }` y `zonaActual` (`"base"` o el id). Se guarda también la hora para `recargar(estado, minutosPasados)` al reabrir.

## 5. Notas del README principal (pegar)
| `supervivencia/zonas-supervivencia.js`, `mapa-general-supervivencia.js`, `dibujo-mapa-mundo.js` | Mapa general (README 6): 12 zonas (`ZONAS`: pino verde/naranja/roja al este, caliza verde/naranja/roja al oeste con 5/30/50 de hierro, y 6 ubicaciones especiales VACÍAS: Búnker Alfa y Bravo al norte, Granja Crooked Creek y Comisaría Blackport al sur, Atalaya 1 y 2 en las esquinas de arriba; `ENEMIGOS_ESPECIALES` guarda las fichas de 8.5), franja exterior de `BORDE = 2` casillas (se camina, no se construye: `puedeConstruir`), salida por el borde (`salida`) y viaje con energía 15/22/33 y nivel (`viajar`). Sin conectar todavía al juego; pruebas en Node y en Chromium. |
- Estado: lógica probada en Node (`prueba-mapa-general.mjs`) y dibujo revisado en Chromium; NO probado dentro del juego ni en celular real (toque sobre zonas, tamaño de textos en horizontal). Pendiente: mapas de tamaño variable por zona (30/40), contenido de las zonas, qué hay en el búnker, tamaño de la energía máxima y cómo se recarga (est: 100 y 1 por minuto), y si el nivel del jugador existe (hoy `nivel` vale 0).
