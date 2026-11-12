# Registrar «conectar» en el portal

## juegos.js (en `JUEGOS`, y agrega `"conectar"` al final de `EN_DESARROLLO`)
```js
{ id: "conectar", nombre: "Conecta los puntos", icono: "🔗", descripcion: "Une las parejas de puntos del mismo color con líneas que no se pueden cruzar: partida libre con 5 dificultades y tableros de 5×5 a 10×10, y mapa de 22 600 niveles (100 por estado de México y por país).", carpeta: "conectar" },
```

## sw.js
- En `JUEGOS`: `conectar: ["juego.js"],`
- Subir `VERSION` a 158 y anotar en el comentario: «158 = se agregó «conectar» (menú principal con Partida libre, Niveles y Mapa de 22 600 niveles por crear)».

## README.md
Fila para «Mapa de archivos»:
| `conectar/index-conectar.html`, `conectar/juego-conectar.js` | Juego «Conecta los puntos» (id de puntos `conectar`): por ahora solo el menú principal (♾️ Partida libre con 5 dificultades y tableros de 5×5 a 10×10, 🧩 Niveles sin niveles todavía y 🗺️ Mapa estándar de 22 600 niveles con `compartido/mapa-niveles.js`). Guarda en `localStorage`: `conectar_libre_v1` (dificultad y tamaño) y `conectar_progreso_v1` (`{ max, hecho }`) |

Nota para «Estado»: Conecta los puntos (11 nov 2026, `sw.js` `VERSION` = 158): hecho el menú principal; la pantalla NO se ha probado en navegador/celular. Pendiente: tablero, generador de niveles, regla de que las líneas no se crucen, menú de pausa, puntos y progreso sincronizado, imagen de tarjeta.
