# Rana golosa (`ranagolosa/`)

Juego de cortar cuerdas (idea general tipo «Cut the Rope», con personaje, niveles y dibujos propios). Id de puntos: `ranagolosa`.

- `logica-ranagolosa.js`: lógica pura (sin `document`): cuerdas con Verlet (solo jalan al estirarse), dulce, estrellas, rana. `crearMundo`, `paso`, `cortarSeg`, `cortarLinea`. Mundo 800×450.
- `niveles-ranagolosa.js`: 10 niveles (`dulce`, `cuerdas:[{x,y,len}]`, `rana`, `estrellas` de 1 a 3). **Generados con un bot** (ver abajo): cada uno se puede ganar con cortes que toleran ±0,08 s de error y las estrellas están sobre una trayectoria real.
- `juego-ranagolosa.js`: dibujo en canvas transparente, el dedo dibuja una línea y corta las cuerdas que cruce, menú de pausa, menú con cuadrícula de niveles, progreso y puntos.
- `index-ranagolosa.html`: estándar inmersivo.

## Reglas
- El dulce cuelga de 1 a 3 cuerdas. Corta con el dedo; si el dulce toca la boca de la rana, ganas. Si sale de la pantalla, pierdes.
- Cada nivel tiene 1 a 3 estrellas; el dulce las junta al tocarlas.
- Puntos (solo si mejoras): 60 la primera vez que pasas un nivel + 40 por cada estrella nueva (`encolarPuntos`).
- Un nivel se abre al pasar el anterior.
- Progreso: `localStorage` `ranagolosa_progreso_v1` = `{ est: { "nivel": estrellas+1 } }` (0 o ausente = sin pasar); `conectar()` + `unirMaximos`.

## Cómo hacer más niveles
Los niveles se generan con una herramienta aparte (`herramientas/generar.mjs`, no va al repo ni al `sw.js`): se definen dulce, anclas, altura de la rana y número de estrellas; el bot prueba cortes en distintos momentos, coloca la rana donde el dulce cae de forma estable y las estrellas sobre la mejor trayectoria, y escribe `niveles-ranagolosa.js`. No cambiar los niveles ya publicados (el progreso es por número).

## Pendiente
- Probar en navegador/celular (el bot corta a mitad de cuerda; el jugador puede cortar en cualquier parte).
- Mapa de niveles estándar (`montarMapa`), modo libre, monedas, sonido.
- Más mecánicas (burbujas, púas, anclas móviles, ventosas) y más niveles.
- Imagen de tarjeta `imagenes/ranagolosa.webp`.

## Registro
- `juegos.js`: `{ id: "ranagolosa", nombre: "Rana golosa", icono: "🐸", descripcion: "...", carpeta: "ranagolosa" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `ranagolosa: ["juego.js", "logica.js", "niveles.js"],` en `JUEGOS` y subir `VERSION` (152 si Lanzapájaros aún no se registró, 153 si ya).
