# Granja feliz (`granjafeliz`)

Juego estilo Farm Frenzy, **solo horizontal** (en vertical pide girar el celular). Id de puntos: `granjafeliz`. Sigue `ESTANDARES-juegos.md`: menú principal estándar (♾️ Modo libre · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), mapa de 22 600 niveles (100 por estado y por país), madera clara/oscura, ☰ Pausa, chip de monedas.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-granjafeliz.html` | Menús, canvas del escenario y aviso «gira el celular» |
| `juego-granjafeliz.js` | Menú, mapa, partida (simulación + dibujo en canvas transparente), fin de nivel «Siguiente nivel ▶» sobre el tablero |
| `datos-granjafeliz.js` | **Aquí se agrega lo nuevo**: `ANIMALES`, `PRODUCTOS`, `NIVELES` y constantes (agua, camión, almacén) |
| `economia-granjafeliz.js` | Estrellas y monedas por nivel; progreso `granjafeliz_progreso_v1` (`{ e: {nivel: estrellas}, gastado, t }`) sincronizado con `conectar()` |

## Hecho hasta ahora
- **Nivel 1** (único creado; los demás avisan «todavía no está creado»): meta = vender $500 en 5:00; empiezas con $150, 2 gallinas y 3 cargas de agua.
- **Animales que existen: solo la gallina** (`ANIMALES.gallina`): 🐔 cuesta $100, máx. 12; tiene hambre cada ~14 s, come pasto (2 mordidas), pone un huevo 3 s después; si pasa ~31 s de más con hambre, muere. Producto: huevo 🥚 = $10.
- **Cómo se juega:** tocar el **pozo** (4 s) llena 3 cargas de agua → tocar el **campo** planta pasto (1 agua, máx. 16 matas) → las gallinas lo comen y ponen huevos → tocar cada **huevo** para llevarlo al **almacén** (20 máx.; el huevo se pierde a los 12 s) → tocar el **camión** vende todo (viaje de 6 s) → **Comprar** más gallinas.
- **Estrellas por tiempo:** 3★ ganando antes de 3:00, 2★ antes de 4:00, 1★ después. **Monedas:** 15 / 30 / 45 por nivel; si mejoras solo pagan la diferencia. Modo libre no da monedas ni estrellas.
- **Sin probar en navegador/celular.** Los números del nivel 1 (precios, tiempos, hambre) son una primera propuesta sin calibrar.

## Por construir poco a poco
> La conversación con Gemini no llegó cuando se armó esta base. Lo de abajo son ideas del Farm Frenzy original que **hay que confirmar o reemplazar** con esos datos.

1. **Más animales** (con su producto y comida): `datos-granjafeliz.js` ya los trata por tabla; falta dibujar/mover cada uno y sus reglas. Ideas del original: avestruz (huevo grande), vaca (leche), oveja (lana), cerdo, etc.
2. **Procesamiento:** edificios que convierten productos (leche → queso, lana → telas…) con su cola y su tiempo.
3. **Mejoras** del pozo (más agua, más rápido), del almacén y del camión (más capacidad, viaje más corto); se pagarían con monedas del portal.
4. **Amenazas:** depredadores y ladrones que se espantan tocándolos; trampas.
5. **Modo libre:** 5 dificultades (hoy solo avisa «en construcción»).
6. **Niveles 2 a 22 600:** metas, tiempos y animales disponibles por nivel; reparto de dificultad con `compartido/dificultad-niveles.js` (sección 8 del estándar). No cambiar después de publicar.
7. **Fin de nivel:** más estrellas por otras metas (por ejemplo, no perder animales), boosts y la tienda con `eco.gastar()`.
8. Imagen de tarjeta (`imagenes/granjafeliz.webp`, anotarla en `ARCHIVOS` de `sw.js`), fila y nota «Estado» en el README principal.
