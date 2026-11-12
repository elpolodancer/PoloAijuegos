# Torre de pasteles (`torrepasteles`)

Juego estilo «apilar pasteles» de Talking Angela: un pastel se acerca a una torre cuadrada en el centro, hay que detenerlo lo más centrado posible y lo que sobresale se corta (el pastel queda del tamaño de lo que sí se apoyó).

**Estado: solo el menú principal.** La partida y los niveles se programan en pasos siguientes.

## Menú principal (hecho)
- Mapa estándar de México con agua y, al terminar México, el mundo (`compartido/mapa-niveles.js`): 226 etapas × 100 niveles = **22 600 niveles**, todavía sin niveles. «Continuar · nivel N» avisa que aún no están listos.
- Botones, en este orden: **♾️ Partida libre** (primero, como en Deslizante) · Continuar · nivel N · ℹ️ Info · 🌍 Mundo (cuando se desbloquea).
- **Partida libre** abre la elección de **5 dificultades**: 1 Muy fácil, 2 Fácil, 3 Normal, 4 Difícil, 5 Experto, cada una con su récord de pisos (`torrepasteles_marcas_v1`). Al elegir una se llama a `iniciarPartida(dif)`, que por ahora solo muestra un aviso.
- ☰ «Menú principal» solo aparece fuera del menú principal (en la elección de dificultad y en las listas de niveles).

## Archivos
| Archivo | Qué es |
|---|---|
| `index-torrepasteles.html` | Página con el estándar inmersivo (🎮 Juegos, ☰, 🌙/☀️, ⛶) |
| `juego-torrepasteles.js` | Menú: mapa, Partida libre, Info, avisos |

## localStorage
- `torrepasteles_progreso_v1` → `{ max, hecho }` (nivel más alto abierto / terminado). Aún no se sincroniza con la cuenta.
- `torrepasteles_marcas_v1` → `{ "1": pisos, … "5": pisos }`
- `torrepasteles_dificultad` → última dificultad elegida

## Pendiente
Partida (movimiento del pastel, corte, torre, puntos y monedas), velocidad y reglas de cada dificultad, niveles, imagen de tarjeta (`imagenes/torrepasteles.webp` y anotarla en `ARCHIVOS` de `sw.js`), sincronizar progreso y récords con `conectar()` y `encolarPuntos("torrepasteles", n)`.
