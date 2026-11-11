# Nave y píxeles (`navepixeles/`)

Id de puntos: `navepixeles`. Archivos: `index-navepixeles.html`, `juego-navepixeles.js` (usa `compartido/menu-pausa.js`, `cola-puntos.js`, `progreso.js`, `jugador.js`). Sin niveles ni mapa (tipo B del estándar).

**Cómo se juega.** La nave dispara sola; se mueve arrastrando el dedo (o ← → / A D). Una pirámide de píxeles (formas «v», «a» y rombo, que se alternan) baja desde arriba: si un píxel toca la línea roja se acaba la partida. Al vaciarla llega la ola siguiente (más ancha hasta 20 columnas; después, píxeles más resistentes: color más claro = más golpes).
- **Izquierda, cuadros «+1»:** al romperlos ganas un soldado (máx. 10). Los soldados siguen a la nave y disparan balas simples. Cada soldado nuevo encarece los cuadros.
- **Derecha, cuadros con número:** golpes que faltan para subir **ARMA** (Cañón → Doble → Triple → Cuádruple → Perforante → Misiles → Tormenta), **CADENCIA** o **DAÑO**. El costo se duplica / sube ×1.5 / ×1.7 con cada nivel (`COSTE`).
- **Minas rojas** con número: bajan solas; al romperlas arrasan los píxeles cercanos.

**Puntos:** `píxeles destruidos / 4 + 10 por ola superada + 5 por mina` (máx. 1000 por partida) → `encolarPuntos`. Progreso (`{ o: mejor ola, p: mejores puntos, n: partidas }`) en `localStorage` (`navepixeles:progreso`) y sincronizado con `unirMaximos`.

**Ajustes de dificultad** (arriba de `juego-navepixeles.js` y en `crearOla`): velocidad `v` de la pirámide, `COSTE`, `intervalo()`, `costePuerta()`, resistencia `base` de los píxeles.

**Pendiente:** imagen de tarjeta (`imagenes/navepixeles.webp` y anotarla en `ARCHIVOS` de `sw.js`), sonidos, monedas (estándar del portal), probar en celular real. Se probó solo en Chromium de escritorio con un bot simple (sin errores de consola).
