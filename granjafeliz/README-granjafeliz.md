# Granja feliz (`granjafeliz`)

Juego estilo Farm Frenzy, **solo horizontal** (en vertical pide girar el celular). Id de puntos: `granjafeliz`. Sigue `ESTANDARES-juegos.md`: menú principal estándar (♾️ Modo libre · 🪜 Niveles · 🗺️ Mapa · 🚪 Salir), mapa de 22 600 niveles (100 por estado y por país), madera clara/oscura, ☰ Pausa, chip de monedas.

## Archivos
| Archivo | Qué es |
|---|---|
| `index-granjafeliz.html` | Menús, canvas del escenario y aviso «gira el celular» |
| `juego-granjafeliz.js` | Menú, mapa, partida (simulación + dibujo en canvas transparente), fin de nivel «Siguiente nivel ▶» sobre el tablero |
| `datos-granjafeliz.js` | **Aquí se agrega lo nuevo**: `PRODUCTOS` (valor y peso), `ANIMALES`, `EDIFICIOS` (recetas), `MEJORAS`, `NIVELES` y constantes |
| `economia-granjafeliz.js` | Estrellas y monedas por nivel; progreso `granjafeliz_progreso_v1` (`{ e: {nivel: estrellas}, gastado, t }`) sincronizado con `conectar()` |

## Hecho hasta ahora
- **Nivel 1** (único creado; los demás avisan «todavía no está creado»): meta = vender $1,000 en 5:00; empiezas con $150, 2 gallinas y 3 cargas de agua.
- **Animales que existen: solo la gallina** 🐔 ($100, máx. 12). **Nunca muere de hambre**: produce 1 huevo cada 5 s de producción y le da hambre tras 10 s produciendo; come pasto (2 mordidas; cada pasto da 4, y las gallinas **reservan** sus mordidas para no amontonarse en un mismo pasto). Sin pasto se queda quieta (😢) y su ciclo se **pausa** hasta que haya pasto otra vez.
- **Almacén por peso:** capacidad 30 (nivel base). Huevo = 1. Lleno = no se recoge nada más. Los productos del suelo desaparecen a los 12 s.
- **Mejoras dentro del nivel (almacén y camión):** cada caja tiene una franja «⬆ $costo · Nv N/5» al pie; tocarla paga la mejora con el dinero del nivel (dorada si alcanza). Capacidad y tiempo de viaje salen de `MEJORAS`. Se reinician en cada nivel, igual que el dinero.
- **Camión con tope:** lleva 10 de peso por viaje (6 s). Carga primero lo que más vale por peso; lo que no cabe se queda en el almacén. Si un producto pesa más que el camión avisa «No cabe en el camión».
- **Cómo se juega:** tocar el **pozo** (4 s) llena 3 cargas → tocar el **campo** planta pasto (1 agua, máx. 16) → las gallinas lo comen y ponen huevos → tocar cada **huevo** para llevarlo al **almacén** → tocar el **camión** vende → **Comprar** más gallinas.
- **Estrellas por tiempo:** 3★ antes de 2:30, 2★ antes de 3:40, 1★ después. **Monedas:** 15 / 30 / 45 por nivel; si mejoras solo pagan la diferencia. Modo libre no da monedas ni estrellas.
- **Sin probar en navegador/celular.** La lógica sí se probó en Node con un jugador automático (40 partidas por velocidad, todas ganadas, sin atascos); falta ver en pantalla el tamaño táctil de las franjas ⬆ y el dibujo de las cajas.
- **Nivel 1 calibrado (12 nov 2026)** con ese jugador automático: a 2.5 clics/s gana en ~1:45, a 1.5 clics/s en ~2:10, a 1 clic/s en ~2:55. Las personas suelen ser más lentas que el bot, así que conviene jugarlo y ajustar `estrellasSeg` en `datos-granjafeliz.js`.
- **Corregido: gallinas atascadas.** Antes varias gallinas iban al mismo pasto y se lo acababan a mordidas sueltas (ninguna llegaba a 2): con ~10+ gallinas podían quedarse con hambre y sin producir más de 2 minutos. Ahora cada gallina reserva un pasto con mordidas suficientes (`pastoLibre()`).

- **Edificios de procesamiento (13 nov 2026):** panadería (huevo → polvo), horno (polvo → pan), hilandería (lana → hilo) y tejeduría (hilo → tela) ya funcionan. Cada nivel los lista en `NIVELES[n].edificios` (máx. 4, de izquierda a derecha) y aparecen como espacios vacíos en una franja al pie del campo (los animales y el pasto quedan por encima; ahí no se planta). **Construir:** tocar el espacio vacío (paga `EDIFICIOS.costo` con el dinero del nivel). **Procesar:** tocar el edificio; descuenta del almacén hasta «lote» unidades de lo que entra, trabaja `seg` segundos y el producto sale al suelo junto al edificio (se recoge con un toque, como los huevos; si el almacén está lleno se queda en el suelo y desaparece a los 12 s). **Cola:** si ya está trabajando, cada toque agrega un lote a la cola (máx. 2, `MAX_COLA_EDIF`); los insumos se descuentan al tocar. **Mejorar:** franja «⬆ $costo · Nv N/5» al pie de cada edificio (dorada si alcanza), con los costos de `MEJORAS.fabrica1` / `fabrica2`; el nivel sube el **lote** (`MEJORAS.fabricaN.lote`: 1, 2, 3, 4, 5 unidades por toque, mismo tiempo). Todo se reinicia en cada nivel. La lógica se probó en Node con el juego real y un DOM falso (construir, sin dinero, sin insumos, cola, salida al suelo, mejora y lote, animales sin entrar a la franja); **el dibujo NO se ha visto en navegador/celular** (tamaño táctil de los espacios de 138×70 y de la franja ⬆ de 26).
- **Nivel 2 (PROVISIONAL, sin calibrar):** meta $3,000 en 7:00, $400 de inicio, 3 gallinas, panadería y horno; estrellas 3★ antes de 5:00, 2★ antes de 6:20. Se creó para poder usar los edificios; ajustar meta, tiempo y `estrellasSeg` jugándolo (aún no se publica, así que se puede cambiar). Ojo: el horno cuesta $1,000 y el pan pesa 10, así que con el camión base solo lleva 1 pan por viaje; conviene mejorar camión y almacén.

- **Pavo 🦃, oveja 🐑 y vaca 🐄 (13 nov 2026):** ya se dibujan, caminan, comen pasto, producen y se compran. Todo sale de `ANIMALES` (el juego los trata por datos). **De Gemini (sin confirmar):** precio ($1,000 / $10,000 / $100,000), ciclo (7 / 12 / 20 s) y producto (huevo de pavo / lana / leche). **Míos, para ajustar:** mordidas (3 / 4 / 5), `segHambre` (= 2 × ciclo, o sea comen cada 2 productos como la gallina), velocidad (30 / 26 / 22), máximo por nivel (8 / 6 / 4), tamaño del emoji y el emoji mismo.
- **Comprar varios animales:** cada nivel dice cuáles se compran con `NIVELES[n].comprables` (por defecto solo la gallina, así el nivel 1 queda igual). Con un animal, el botón «Comprar» grande de siempre; con 2 a 4, una columna de botones compactos (emoji, precio y `cantidad/máx`; con 4 miden ~27 de alto) bajo el camión.
- **Pasto compartido por animales de distinto tamaño:** como cada pasto da 4 mordidas, la vaca (5) no cabía en ninguno y la gallina (2) dejaba sobras. Ahora lo comido **se conserva** (`a.mord` solo vuelve a 0 al quedar lleno): si el pasto se acaba a la mitad, el animal sigue en otro. `pastoLibre()` prefiere un pasto donde quepa lo que le falta y, si no hay, uno con al menos 1 mordida libre (sigue reservando para que no se amontonen).
- **Nivel 3 (PROVISIONAL, banco de pruebas):** los 4 animales, los 4 edificios, $120,000 de inicio, meta $150,000 en 10:00, y empieza con almacén y camión en nivel 3 (`NIVELES[n].mejoras: { almacen: 2, camion: 2 }`, nuevo campo; por defecto 0) para que quepan la leche y la tela (peso 50). Sirve para ver todo junto; no es un nivel balanceado.
- **Pruebas en Node** (juego real, DOM falso, bot que planta, recoge y vende, 10 min por partida): en el nivel 3 los cuatro animales producen y nadie pasa más de ~13 s seguido con hambre; en el nivel 1 con 11 gallinas el resultado es igual que antes del cambio (849 vs 860 huevos, hambre máx. 12 vs 13 s). **El dibujo no se ha visto en pantalla** (los 4 botones de compra de ~27 de alto y los emojis grandes de vaca y oveja).

- **Osos, perro y gato (13 nov 2026):** un nivel activa los osos con `NIVELES[n].osos = { tipos: ["oso", "polar", "panda"] }` (opcional `primero` = segundos hasta el primero) y el gato con `gato: true`; el perro está en todo nivel con osos. Datos en `datos-granjafeliz.js` (`OSOS`, `PERRO`, `GATO`, `CASILLA`, `RADIO_OSO`, `PRIMER_OSO`, `OSOS_CADA`).
  - **Oso:** entra por un lado del campo a los ~25 s y luego cada 35-50 s; va hacia el animal más cercano (si no hay, al pasto; si no, merodea). **Destruye el pasto dentro de 2 casillas, elimina los animales que toca y borra los productos que pisa** (las jaulas no). Se captura **tocándolo** (oso 6 clics, polar 9, panda 12; barra amarilla de avance); al capturarlo deja su **jaula** en el suelo, que se recoge y se vende como un producto: pesos del README 15 / 25 / 30, valores $1,000 / $2,000 / $3,000 (míos). El camión base (10) no las lleva: hay que mejorarlo.
  - **Perro 🐕:** botón en la barra de arriba ($100 cada vez, solo si hay un oso suelto). Llega en 2-3 s y deja quieto al oso 5-8 s (no se mueve ni destruye; los clics siguen contando). Un perro a la vez.
  - **Gato 🐈:** botón en la barra de arriba ($1,000 una vez por nivel). **Recoge solo los productos del suelo** hacia el almacén (no las jaulas; si el almacén está lleno no recoge). Para que también recoja jaulas, quitar el filtro `jaula` en `actualizarGato()`.
  - **Míos, para confirmar:** 1 casilla = 32 px (el escenario no tiene casillas), los clics para capturar, la velocidad de cada oso, el costo del perro y del gato, los valores de las jaulas y los emojis (🐻‍❄️ puede verse como dos símbolos en sistemas viejos). «Ventas» de la barra se movió un poco a la izquierda para dar lugar a los botones.
  - **Nivel 3** ya trae osos y gato. Pruebas en Node (juego real, DOM falso): oso a los ~25 s, destruye pasto/productos/animales, se captura a clics, el perro llega y bloquea el tiempo correcto, el gato recoge productos y no jaulas ni con el almacén lleno; los niveles 1 y 2 no cambian. **El dibujo no se ha visto en pantalla** (botones de 32 de alto en la barra, oso de 42 px, jaula dibujada con barrotes).

## Decisiones confirmadas (12 nov 2026)

**Tiempos: se quedan los propios del juego (más ágiles que el original de 2006).** Camión: 6 s de ida y vuelta en el nivel base. Producto en el suelo: 12 s antes de desaparecer. Así la partida es activa y de clics rápidos, estilo arcade.

**Mejoras de almacén y camión** (5 niveles; el camión también se acorta con cada mejora, sin bajar de 2 s). Los costos son lo que se paga por subir A ese nivel:
| Elemento | Nivel 1 (base) | Nivel 2 | Nivel 3 | Nivel 4 | Nivel 5 (máx.) |
|---|---|---|---|---|---|
| **Almacén** (capacidad) | 30 · gratis | 100 · $500 | 300 · $2,000 | 1,000 · $8,000 | 3,000 · $25,000 |
| **Camión** (capacidad / viaje) | 10 · 6 s · gratis | 30 · 5 s · $300 | 100 · 4 s · $1,500 | 500 · 3 s · $6,000 | 2,000 · 2 s · $20,000 |

Cambios respecto a lo que había en `MEJORAS`: el almacén máximo baja de 10,000 a **3,000**, desaparecen los `null` de costos y el camión suma un tiempo de viaje por nivel (`seg`), que antes era fijo (`SEG_CAMION`). **Ya está en `datos-granjafeliz.js` y el juego la usa** (se eliminó `SEG_CAMION`; el viaje sale de `MEJORAS.camion.seg`).

## Datos ya cargados en `datos-granjafeliz.js` (de la conversación con Gemini; cifras sin confirmar contra el original)

**Productos** (valor / peso): huevo $10 / 1 · polvo de huevo $20 / 2 · pan $100 / 10 · huevo de pavo $50 / 5 · lana $1,000 / 10 · hilo $2,000 / 20 · tela $10,000 / 50 · leche $10,000 / 50. La hierba no se guarda.

**Edificios** (en `EDIFICIOS`; ya se usan en el nivel 2). Al tocarlos descuentan del almacén (1 al inicio; más con las mejoras), empiezan el temporizador y el producto sale al suelo junto al edificio:
| Edificio | Entra → Sale | Tiempo | Construcción |
|---|---|---|---|
| 🍞 Panadería | huevo → polvo | 3 s | $200 |
| 🔥 Horno | polvo → pan | 6 s | $1,000 |
| 🧵 Hilandería | lana → hilo | 4 s | $200 |
| 🧣 Tejeduría | hilo → tela | 8 s | $1,000 |
Nivel avanzado (sin receta cerrada): pastelería (pan → pastel $300) y sastrería (tela → ropa).

**Mejoras** (en `MEJORAS`; almacén, camión y fábricas ya se aplican en el juego, el pozo aún no; base + 4 compras): almacén 30 → 100 → 300 → 1,000 → 3,000 (ver «Decisiones confirmadas») · camión 10 → 30 → 100 → 500 → 2,000 · pozo 5 → 9 → 15 → 25 → 50 usos ($50/$150/$500/$2,000) · fábrica 1 $200 → 500 → 1,500 → 5,000 → 15,000 · fábrica 2 $1,000 → 3,000 → 10,000 → 30,000 → 100,000.

**Animales** (ya en `ANIMALES` y en el juego, ver «Pavo, oveja y vaca» arriba): pavo $1,000 (7 s, huevo de pavo) · oveja $10,000 (12 s, lana) · vaca $100,000 (20 s, leche).

**Osos, perro y gato** (ya en el juego, ver arriba): primer oso a los ~25 s y luego cada 35-50 s; destruye pasto en radio de 2 casillas, elimina animales y borra productos que pisa; se captura con clics (enjaulado pesa 15, polar/panda 25-30). El perro llega en 2-3 s y lo bloquea 5-8 s. El gato recoge solo los productos del suelo.

## Por resolver
1. **Pesos contra capacidades:** la leche y la tela (50) no caben en el camión hasta su nivel 3 (100) ni en el almacén base (30) hasta el nivel 2; el pan (10) llena el camión base. Los niveles con esos productos deben dar antes las mejoras.
2. Pozo: el original cobra $1 por rellenar y llega a «infinito o 50 usos» (elegir); aquí es gratis y de 4 s.
3. Edificios: la cola (2 lotes) y los lotes por nivel (1 a 5) son una propuesta mía, no cifras del original; confirmar o cambiar en `MAX_COLA_EDIF` y `MEJORAS.fabricaN.lote`. Con los valores actuales huevo, polvo y pan valen lo mismo por peso ($10), así que procesar multiplica el valor de cada huevo pero también su peso: el camión pasa a ser el cuello de botella.
4. Pavo vivo pesa 30 (si se vende vivo), sin mecánica todavía.

## Por construir poco a poco
1. Pavo, oveja y vaca: hechos. Falta confirmar sus cifras (mordidas, velocidad, máximo) y un dibujo mejor que el emoji; el pavo vivo pesa 30 y no se vende vivo todavía.
2. Edificios: hechos. Faltan pastelería (pan → pastel) y sastrería (tela → ropa) cuando haya receta cerrada, y probar el dibujo en celular.
3. Aplicar la mejora que falta de `MEJORAS`: pozo (hay que decidir qué significan los «usos» frente a `MAX_AGUA`). Las de almacén, camión y fábricas ya están.
4. Osos, perro y gato: hechos; falta confirmar sus cifras y verlos en pantalla.
5. Modo libre: 5 dificultades (hoy solo avisa «en construcción»).
6. Niveles 2 a 22 600: metas, tiempos y animales disponibles por nivel; reparto de dificultad con `compartido/dificultad-niveles.js` (sección 8 del estándar). No cambiar después de publicar.
7. Fin de nivel: más estrellas por otras metas, boosts y tienda con `eco.gastar()`.
8. Imagen de tarjeta (`imagenes/granjafeliz.webp`, anotarla en `ARCHIVOS` de `sw.js`), fila y nota «Estado» en el README principal.
