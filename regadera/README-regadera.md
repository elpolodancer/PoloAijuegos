# Regadera (carpeta `regadera/`)

Archivos: `index-regadera.html`, `juego-regadera.js`, `README-regadera.md`. Id de puntos: `regadera`.

## Cómo se juega
- Jardín circular de **8 zonas × 3 anillos = 24 espacios**. Una regadera (manecilla) gira en sentido de las manecillas del reloj: **10 s por vuelta** (`VUELTA_S`).
- Al empezar solo se permiten **2 plantas** (`ESPACIOS_INICIO`). Se tocan los pastos para plantar (**50 monedas**) y el botón «Más espacio» sube el máximo de 1 en 1 (**100 monedas**, hasta 24).
- Cuando la regadera pasa por el centro de una zona, riega **una** planta de esa zona (de adentro hacia afuera, por turnos) y la que se regó en la pasada anterior **sale como soldado**:
  1ª pasada: solo riega (la planta se revive); 2ª: riega a la segunda y sale la primera; 3ª: sale la segunda… (con una sola planta, sale un soldado desde la 2ª pasada).
- Los enemigos (arañas) bajan por el camino hacia el centro y atacan a los soldados cercanos o al centro (30 de vida). Cada enemigo vencido da **15 monedas**.
- Una ola nueva cada 25 s (`SEG_OLA`): más enemigos y con más vida. Se guarda la mejor ola (`regadera_progreso_v1`, sincronizada con la cuenta).

## Supuestos que conviene confirmar
- «Cada soldado vale 50 monedas» se tomó como el **costo de poner una planta**; las monedas se ganan venciendo enemigos.
- Empiezas con 100 monedas y sin plantas puestas.
- Modo libre: 5 dificultades (cambian vida de enemigos y ritmo de aparición). No suma puntos al perfil.

## Pendiente
- Niveles y Mapa estándar (por ahora avisan «🚧 Los niveles todavía no están creados»).
- Registrar en `juegos.js` (y en `EN_DESARROLLO`), en `JUEGOS` de `sw.js` (`regadera: ["juego.js"]`) y subir `VERSION`; fila en el README principal.
- Probar en celular (tamaño del jardín en horizontal, toques sobre las parcelas). Solo se revisó la sintaxis y la secuencia de riego en Node.
