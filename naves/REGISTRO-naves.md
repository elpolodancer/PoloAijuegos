# Para registrar «Naves» en el portal (estándar, sección 5)

## 1) juegos.js — al final de `JUEGOS`
```js
  { id: "naves", nombre: "Naves", icono: "🚀", descripcion: "Defiende tu base de enemigos que bajan en manada y en oleadas: mueve tu nave de lado a lado mientras dispara sola. Mapa de México con 32 estados de 10 niveles (320), 50 niveles de enemigos y 50 armas que compras en el Taller con las monedas que ganas; cada nivel se comprobó con un bot que encuentra, con retroceso, un camino para pasarlo.", carpeta: "naves" },
```
y en `EN_DESARROLLO` agrega `"naves"`.

## 2) sw.js — en `JUEGOS`
```js
  naves: ["juego.js", "logica.js", "niveles.js", "ia.js"],
```
(`verificar-naves.mjs` y `package.json` NO se agregan.) Sube `VERSION` a 152 y anota en el comentario: «152 = se agregó «naves» (…)».

## 3) README principal — fila para «Mapa de archivos»
| `naves/index-naves.html`, `juego-naves.js`, `logica-naves.js`, `niveles-naves.js`, `ia-naves.js`, `verificar-naves.mjs`, `README-naves.md` | Juego «Naves» (id `naves`): enemigos en manada y oleadas contra una nave que dispara sola. `logica-naves.js` = simulación determinista (50 tiers de arma y de enemigo, 5 tipos); `niveles-naves.js` = 320 niveles generados con semilla (mapa estándar de México); `ia-naves.js` = bots con backtracking que comprueban que cada nivel se puede pasar (`verificar-naves.mjs` los corre y anota `FACIL`). Progreso `naves_progreso_v1` = `{ max, hecho, arma, ganadas, gastadas, t }` (gana el máximo de cada dato). Detalle en `README-naves.md` |

## 4) Nota para «Estado»
- Naves (11 nov 2026, `sw.js` `VERSION` = 152): mapa de México (320 niveles), Taller con 50 armas, enemigos de 50 tiers y 5 tipos. Los 320 niveles se verificaron con los bots (todos con solución; 3 con ajuste en `FACIL`). Probado en Chrome de escritorio (mapa, Taller, partida, pausa); NO probado en celular real. Pendiente: jefes, mundo (194 países), juego libre, sonido, imagen de tarjeta, equilibrar jugando.
