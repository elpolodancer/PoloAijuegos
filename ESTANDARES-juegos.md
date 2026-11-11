# Estándares de todos los juegos del portal

Pegar en el README principal (o dejar como `ESTANDARES-juegos.md` en la raíz). La especificación de medidas y colores vive en `compartido/inmersivo.css`; aquí está lo que hay que respetar y por qué. Cada juego tiene su propio README con sus detalles.

Referencias: **Estacionamiento** (mapa, niveles, monedas, botones) y **Rubik** (juego sin niveles). De **Puzle deslizante** solo se tomó la idea del botón azul oscuro del portal.

## 1. Botones fijos (en TODOS los juegos)

| Botón | Esquina | Forma y color |
|---|---|---|
| **🎮 Juegos** (vuelve al portal, `href="../"`) | arriba-izquierda | **Alargado** (`b3d txt`), **azul oscuro** (`b-azuloscuro`: `#7d9cea → #3b63c4 → #1c3a82`). Siempre visible |
| **☰** (Pausa / Menú principal) | arriba-izquierda, justo debajo | **Alargado, del mismo ancho** que 🎮 Juegos, gris (`b-gris`). Oculto en el menú principal del juego |
| **🌙 / ☀️** (madera clara / oscura) | abajo-izquierda | 40×40, oro. Lo crea `compartido/fondo-madera.js` |
| **⛶ / ✕** (pantalla completa) | abajo-derecha | 40×40, gris. Lo crea `compartido/pantalla-completa.js` |

HTML del bloque de navegación (copiar tal cual):

```html
<nav class="nav-juego" aria-label="Navegación">
  <a class="b3d txt b-azuloscuro" href="../" title="Volver al portal de juegos"><span class="b-ico">🎮</span> Juegos</a>
  <button class="b3d txt b-gris" id="btn-menu" type="button" title="Pausa"><span class="b-ico">☰</span> Pausa</button>
</nav>
```

- El azul oscuro es **un poco más claro** que el de Deslizante, sin llegar a ser azul claro. Se define una sola vez en `compartido/inmersivo.css` (`.b-azuloscuro`); los juegos no lo redefinen (Deslizante todavía tiene su copia local, que se puede borrar).
- Dentro de una partida el ☰ dice «Pausa» y abre `compartido/menu-pausa.js` (Continuar / opciones del juego / Salir). En mapas y listas dice «Menú principal» y vuelve al menú del juego.
- Zonas reservadas: el juego no pone nada interactivo en esas esquinas (medidas en `inmersivo.css`).

## 2. Fondo de madera (clara y oscura)

- `<html class="inmersivo">` y `<body class="inmersivo">`. El juego **no** pone fondo propio en `html` ni `body`.
- Madera **clara** por defecto; **oscura con luna** con el botón 🌙/☀️ (la elección se guarda en el dispositivo y vale para todos los juegos).
- En el `<head>`: `<script>try{if(localStorage.getItem("fondo_madera")==="oscura")document.documentElement.classList.add("oscura")}catch(e){}</script>` (evita el parpadeo de la madera clara).
- Al final del `<body>`: `<script type="module" src="../compartido/fondo-madera.js"></script>` y `pantalla-completa.js`.
- Los `<canvas>` van **transparentes** (`clearRect`, nunca `fillRect` de fondo) para que se vea la madera.
- Textos sueltos sobre la madera: `var(--txt-fondo)`, `var(--txt-fondo-suave)`, `var(--sombra-txt)`. Los paneles oscuros conservan su color.

## 3. Monedas

Casi todos los juegos tendrán monedas. El chip es siempre el mismo: **dorado** (`chip chip-monedas`) con la moneda dibujada en CSS (`<span class="moneda"></span>`), ya que el emoji 🪙 no se ve en sistemas viejos. Los estilos están en `compartido/inmersivo.css`.

```html
<span class="chip chip-monedas"><span class="moneda"></span>1 250</span>
```

Va en una zona libre: arriba-derecha con los demás chips (`.hud-der`) o, como en Estacionamiento, en una fila de información debajo de ☰. Las monedas se gastan, así que su progreso se sincroniza con una regla propia (no con `unirMaximos`); Estacionamiento lo resuelve con `unirCartera`.

## 4. Dos tipos de juego

### A) Juegos por niveles (Estacionamiento y los que se parezcan)

El menú de niveles **siempre es un mapa**:

1. **México de cerca**, sobre fondo blanco, con la silueta del país. Cada estado terminado (**32 estados**, 100 niveles en Estacionamiento) hace **subir agua azul clara** dentro de la silueta, con oleaje (quieta con `prefers-reduced-motion`).
2. Al terminar todos los de México aparece el **mapa del mundo** (**194 países**), con el mismo efecto de agua por país. Hasta entonces el jugador no sabe que existe.
3. Cada estado o país es un punto: al tocarlo se ven sus niveles. Cuántos niveles tiene cada etapa lo decide cada juego (en Estacionamiento son 100; en Supermercado y Zuma, 10).
4. Los niveles se abren en orden; se guarda «nivel más alto abierto» y «más alto terminado».

**Menú de inicio** (el mapa es la pantalla principal) con estos botones, en este orden:

`▶ Continuar · nivel N` · **`♾️ Juego libre`** (a la derecha de Continuar) · `ℹ️ Info` · `🌍 Mundo` (solo cuando ya se desbloqueó).

- **Juego libre / infinito:** tableros al azar sin fin, sin mapa ni niveles. Propuesta general: **no da monedas ni puntos** (como el modo libre de Deslizante) para que no se pueda repetir sin límite; guarda mejor marca y cantidad resuelta. En Estacionamiento todavía está por hacer (ver su README, sección 12).

**Variante: juego con menú de inicio propio (Supermercado).** Si el juego ya tiene su menú (Nueva partida / Continuar / Niveles), el mapa NO es la pantalla principal: se abre con el botón «🗺️ Niveles». Dentro del mapa el ☰ dice «Menú principal» y vuelve a ese menú, y junto a «Continuar · nivel N» va un botón «♾️ Modo infinito» que hace lo mismo (es el equivalente de «Juego libre»). Un nivel es una partida aparte con sus propias metas y restricciones; el juego solo guarda cuántos niveles lleva terminados.

Código reutilizable (ya está en `compartido/`, anotado en `ARCHIVOS` de `sw.js`):

| Archivo | Qué es |
|---|---|
| `compartido/mapa-niveles.js` | El mapa con agua. `montarMapa({ prefijo, etapas, progreso, jugarNivel, infoNivel, leyenda, botonesExtra, alInfo, avisoPrincipal, alCambiarVista })`. Sin Firebase ni red |
| `compartido/etapas-mapa.js` | Orden de los 32 estados y 194 países y cuentas de progreso: `crearEtapas({ porEtapa, primeros })` |
| `compartido/geografia-mapa.js` | Contornos de México, continentes y lagos |

El juego solo indica cuántos niveles tiene cada etapa (`porEtapa`), el progreso `{ max, hecho }` y qué hace `jugarNivel(n)`. Según `sw.js`, Estacionamiento todavía lista sus propias copias en `estacionamiento/` (`mapa-estacionamiento.js`, etc.).

### B) Juegos sin niveles (Rubik)

**No llevan mapa ni niveles.** El menú principal tiene lo mínimo: el selector de lo que se juega (en Rubik, el modelo de cubo) y, dentro de la partida, el botón de revolver. Todo sobre el fondo de madera clara u oscura y con los botones fijos de la sección 1. Detalle en `rubik/README-rubik.md`.

## 5. Para registrar un juego nuevo o cambiado
Anotarlo en `juegos.js`, en `JUEGOS` de `sw.js`, subir `VERSION`, y agregar su fila y nota «Estado» al README principal.
