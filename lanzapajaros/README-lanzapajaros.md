# Lanzapájaros (`lanzapajaros/`)

Juego estilo Angry Birds, versión básica. Id de puntos: `lanzapajaros`.

- `index-lanzapajaros.html`: estándar inmersivo (🎮 Juegos, ☰ Pausa, 🌙/☀️, ⛶), menú principal con «Continuar · nivel N» y cuadrícula de 30 niveles.
- `juego-lanzapajaros.js`: física propia (pájaro y cerdos = círculos; bloques de madera = cajas que se rompen y caen si pierden apoyo), dibujo en canvas transparente, progreso y puntos.

## Reglas
- Arrastra el pájaro hacia atrás (máx. 70 px) y suelta. Se ve una guía de puntos.
- Ganas al eliminar todos los cerdos. Pierdes si se acaban los pájaros (cerdos + 2, máximo 7).
- 30 niveles generados con semilla (`generar(n)`): más torres y pisos conforme avanza. **No cambiar la semilla ni el generador después de publicar** (el progreso es por número de nivel).
- Puntos: solo la primera vez que se pasa un nivel: 100 + 50 por pájaro que sobre (`encolarPuntos`).
- Progreso: `localStorage` `lanzapajaros_progreso_v1` = `{ max, hecho, t }`, sincronizado con `conectar()` (gana el mayor de cada campo).

## Pendiente
- Probar en navegador/celular (afinar `K`, `G`, resistencia de bloques `hp` y umbrales de daño).
- Mapa de niveles estándar (`montarMapa`), modo libre, monedas, sonido, más tipos de pájaros y bloques (piedra, vidrio).
- Imagen de tarjeta `imagenes/lanzapajaros.webp`.

## Registro
- `juegos.js`: `{ id: "lanzapajaros", nombre: "Lanzapájaros", icono: "🐦", descripcion: "...", carpeta: "lanzapajaros" }` y su id en `EN_DESARROLLO`.
- `sw.js`: `lanzapajaros: ["juego.js"],` en `JUEGOS` y `VERSION` = 152.
- README principal: fila en «Mapa de archivos» y nota en «Estado».
