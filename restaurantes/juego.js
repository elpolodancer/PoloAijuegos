// Ruta: restaurantes/juego.js
// «Restaurantes» (vista isométrica estilo Clash of Clans): los grupos de clientes (1, 2 o 4) llegan SOLOS y al azar durante la jornada.
// Esperan frente a la recepción: la recepcionista tarda 10 s en atenderlos y ver si hay mesa (nadie se enoja ni se va por esperar). Si hay mesa libre (y cocinero en turno) se sientan y pagan $10 de entrada cada uno; si no hay mesa, se van.
// MESAS PEQUEÑAS: caben 2 personas (un grupo de 4 se sienta en 2 mesas). Cada elemento de la mesa tiene niveles con ingresos propios (ver MEJORAS_MESA).
// Ya sentados, cada persona paga lo de SU silla (no la de la otra banca) y lo de la mesa (cubiertos, condimentos, bebidas, decoración). La cocina prepara y TÚ (o el mesero) llevas el platillo (clic en la cocina para tomarlo, clic en la mesa para entregarlo).
// Nadie se va por tardar la comida. Al entregarla, cada uno paga $5 por la comida más lo que sumen las mejoras de la cocina. Al terminar de comer se levantan TODOS: el 100 % usa el baño (si ya lo compraste; cuesta 2 dólares y esperan su turno) y
// algunos van además a otras habitaciones; todos pasan por la recepción y se van.
// TIENDA: tocando el mostrador de la recepción (🛒) se abre la zona de compras. Ahí se contrata (y se mejora) a la recepcionista y al mesero.
// SEGUNDO COCINERO: se contrata en la tienda ($1500, sin otro requisito) y cocina junto con el primero: sus velocidades se suman (cada uno según su nivel).
// COCINERO Y MESAS: en la tienda se mejora al cocinero (10 niveles: cada nivel cocina más rápido) y se compran mesas nuevas para el comedor (hasta 16 en total, en filas y columnas de 4 × 4; precio creciente).
// AMPLIACIÓN: en la tienda se compra «Ampliar terreno» (una plaza detrás del restaurante, sobre el pasto). Solo entonces se desbloquea la SEGUNDA PUERTA (el SEGUNDO MESERO ya no la necesita: se compra desde el principio, con el primer mesero contratado, por $500)
// (entrada por atrás, con su propia fila de espera y su mostrador). La SEGUNDA RECEPCIONISTA solo se puede contratar cuando ya existe la segunda puerta.
// Empiezan lentos: cada mejora los hace más rápidos. Lo gastado sale de «dinero»; los puntos y el récord cuentan lo «ganado».
// CIUDAD Y VISTA: el restaurante está en una calle, rodeado de manzanas con edificios, parques y carreteras. La vista se acerca/aleja (➕ ➖, rueda o pellizco) con límites cortos y se mueve arrastrando.
// ANUNCIOS: el botón «📢 Anuncios» vende anuncios temporales (periódico, radio, televisión, redes) y la página web (compra única) que suben el % de clientes que llegan (ver ANUNCIOS).
// ESTACIONAMIENTO: alrededor de toda la cuadra hay 24 lugares posibles (adelante, a los lados y atrás), pero al empezar solo se ven y se usan 2.
// Los demás se compran en la tienda (precio creciente: ver ESTAC_PRECIOS). Los autos llegan por la calle de enfrente; cada auto trae SIEMPRE 4 personas.
// Si hay lugar, estaciona y las 4 personas van a la recepción como un grupo más; al terminar regresan al auto y se van. Si no hay lugar, el auto pasa de largo y no vuelve.
// TERRENOS: el restaurante es largo y ocupa 2 de las 9 manzanas de una cuadrícula de 3 × 3: la de la esquina inferior derecha y la central derecha (la de arriba). Las otras 7 son pasto (sin carreteras entre ellas).
// Los terrenos se compran en la tienda («Ampliar terreno»): las 7 manzanas de pasto son los terrenos 2.º a 8.º y se compran de uno en uno, solo los que tocan tu terreno actual (el restaurante o uno ya comprado).
// El precio sube con cada terreno (ver TERRENO_PRECIOS: $10,000 el 2.º ... $500,000 el 9.º). Las manzanas de pasto están en PASTO.
// HABITACIONES (lugares fijos, ver LUGARES): atrás generadores · cocina (centro) · oficina; debajo, el baño (izquierda) y la limpieza (derecha). La cafetería, la heladería y la pastelería van en las paredes de los lados. En la oficina (tócala) se compran las mesas, el baño y las habitaciones; la limpieza en «🏗️ Construir».
// Al terminar de comer, cada cliente va a 0-4 de esos lugares (ver PESOS_VISITAS) y gasta en cada uno.
// ENERGÍA: la «⚡ sala de generadores» ya viene construida. Empiezas con 22/33 de energía (usada/disponible); tocando la sala compras un generador cuadrado ($10) que se ve dentro y sube la energía disponible de 33 a 48 (ver ENERGIA_*).
// DECORACIONES: también en «🏗️ Construir»; cada una suma dinero a lo que paga cada cliente (ver DECORACIONES).
const ID = "restaurantes";

// ----- ESCALA: tamaño de los objetos respecto a la cuadra -----
// 1 = como antes. 0.5 = TODO lo que hay en la cuadra (mesas, sillas, gente, cocina, baño, recepción, autos, estacionamiento...) mide la MITAD respecto a la cuadra:
// la cuadra queda 2 veces más grande (en objetos) y caben muchas más mesas y cosas. Distribución, velocidades, zoom y toques se calculan a partir de este número (prueba 0.4, 0.6, 1...).
const ESCALA = 0.5;
const ESC_UI = (ESCALA + 1) / 2; // textos, globos y barras se encogen menos que los objetos, para que se sigan leyendo

// ----- Ajustes -----
// El juego NO tiene fin: los clientes llegan sin parar y se puede jugar el tiempo que quieras (el reloj solo cuenta cuánto llevas jugando).
const PRIMERA_LLEGADA_MS = 4000;  // cuándo llega el primer grupo
const LLEGADA_MIN_MS = 4000;      // los grupos llegan al azar: entre un grupo y el siguiente pasan entre estos dos tiempos
const LLEGADA_MAX_MS = 9000;
const RAMPA_INICIO = 0.2;         // al empezar una partida llega solo este porcentaje del ritmo normal de clientes (0.2 = 20 %; grupos a pie y autos)...
const RAMPA_MS = 5 * 60 * 1000;   // ...y sube poco a poco hasta el 100 % en este tiempo de juego (5 minutos)
const OPCIONES = [1, 2, 4];       // clientes que pueden llegar en cada grupo
const TIEMPO_RECEP_MS = 10000;    // lo que tarda la recepcionista en atender a un grupo y ver si hay mesa (siempre 10 s; nadie se enoja ni se va por esperar)
const ENTRADA_POR_CLIENTE = 10;   // dólares que paga CADA cliente en cuanto se le da mesa
const PAGO_POR_CLIENTE = 5;       // dólares que paga cada cliente cuando recibe su comida (más lo que sumen las mejoras de la cocina)
const COSTO_BANIO = 2;            // dólares que cuesta usar el baño
// HORARIO: el juego tiene hora del día. 1 hora del juego = 30 s reales (2 minutos de juego por segundo). Se calcula con «reloj» (el tiempo jugado), así que se guarda solo con la partida.
// Cada partida nueva empieza a las 9:30 AM del día 1. El restaurante abre de 9:30 AM a 11:30 PM; fuera de ese horario (la noche) no llegan clientes ni autos.
const MIN_JUEGO_POR_SEG = 2;
const HORA_ABRE = 9 * 60 + 30;      // 9:30 AM, en minutos desde la medianoche
const HORA_CIERRA = 23 * 60 + 30;   // 11:30 PM: el personal se retira
const HORA_CLIENTES_FIN = 23 * 60;  // 11:00 PM: desde aquí ya no se aceptan clientes nuevos (llegan hasta 30 min antes de que se retire el personal)
// PERSONAL: chef, mesero y recepción llegan a las 9:00 AM y se retiran a las 11:30 PM; el personal de limpieza trabaja de 6:00 AM a 9:00 AM.
const HORA_PERSONAL_LLEGA = 9 * 60;
const HORA_LIMPIEZA_LLEGA = 6 * 60;
const HORA_LIMPIEZA_SALE = 9 * 60;
const RETRETES = 2;               // retretes del baño (los 🚽 que se dibujan): solo entran tantos clientes a la vez como retretes haya
const BANIO_USO_MS = 10000;       // lo que tarda cada cliente en usar el retrete (10 s)
// ----- Energía -----
const ENERGIA_BASE = 33;           // energía disponible al empezar (sin generadores)
const ENERGIA_USADA = 22;          // energía que se está usando (por ahora fija: aún no hay cosas que gasten energía)
const ENERGIA_POR_GENERADOR = 15;  // cada generador suma esta energía disponible (33 → 48)
const GENERADOR_PRECIOS = [10];    // precio de cada generador, en orden. Para permitir más generadores, agrega más precios (hay lugar para 4: ver GEN_LUGARES)
const GEN_LUGARES = [[20, 50], [70, 50], [20, 100], [70, 100]]; // dónde va cada generador dentro de la sala: [x relativo al cuarto, y]
const GEN_LADO = 30;               // los generadores son cuadrados de este lado
const GEN_COLOR = { tapa: "#ffe082", izq: "#ffb300", der: "#e08e00" };
const PRECIO_BANIO = 20;          // dólares que cuesta CONSTRUIR el baño (al empezar no hay; se construye debajo de la sala de generadores, en 🏗️ Construir o en la oficina del jefe)
const DOLARES_POR_PUNTO = 1;        // al perfil se envía 1 punto por cada dólar ganado
const PUNTOS_LOTE = 25;           // como no hay final, los puntos se mandan al perfil de 25 en 25 mientras juegas (y al reiniciar o salir de la página)
const VEL = 150;                  // velocidad de la gente (px por segundo EN PANTALLA: con otra ESCALA se ajusta sola; igual MESERO_VEL y AUTO_VEL)
const T_COCINA_BASE = 3000;       // ms de cocina por pedido...
const T_COCINA_POR_CLIENTE = 500; // ...más estos ms por cada cliente de la mesa
const T_COMER = 5000;             // ms que tardan en comer
// Al terminar de comer, cada cliente va a 0, 1, 2, 3 o 4 «lugares» (baño, cafetería, heladería, pastelería), siempre en ese orden y entre los que ya tengas.
// PESOS_VISITAS[n] = qué tan probable es hacer n cosas (pesos relativos: 40/100 = 40 %). Entre más cosas, menos probable. Si tienes menos lugares, solo cuentan los primeros pesos.
// Con los 4 lugares: 0 → 40 %, 1 → 35 %, 2 → 15 %, 3 → 7 %, 4 → 3 %. Con solo el baño: se mantiene casi como antes (≈ 47 % va al baño).
const PESOS_VISITAS = [40, 35, 15, 7, 3];
const ORDEN_VISITAS = ["banio", "cafeteria", "heladeria", "pasteleria"];
// ----- Cocina: al tocarla (si no hay platillos listos) se abre su menú de mejoras (el juego se pausa) -----
// compra = lo que cuesta comprarlo (0 = ya lo tienes desde el principio). precios = lo que cuesta cada una de sus 5 mejoras.
// tipo: "vel" = multiplica el tiempo de cocina (menos = más rápido) · "pago" = suma dólares a lo que paga CADA cliente de TODAS las mesas
//       (solo múltiplos de 0.50: el dinero se reparte en monedas de 50 centavos) · "paciencia" = multiplica lo que aguantan esperando el platillo ya listo.
// ef[n-1] = efecto acumulado en el nivel n (nivel 1 = recién comprado; nivel 6 = con las 5 mejoras). requiere = id que hay que tener antes.
const MEJORAS_COCINA = [
  { id: "estufa", ico: "🔥", nombre: "Estufa", compra: 0, precios: [100, 250, 600, 1400, 3000], tipo: "vel", ef: [1, 0.92, 0.85, 0.78, 0.72, 0.66], desc: "Una estufa mejor cocina los pedidos más rápido." },
  { id: "horno", ico: "🍞", nombre: "Horno", compra: 500, precios: [200, 500, 1000, 2200, 4500], tipo: "vel", ef: [0.92, 0.86, 0.8, 0.74, 0.68, 0.62], desc: "Con horno se preparan más platillos al mismo tiempo: los pedidos salen antes." },
  { id: "refri", ico: "🧊", nombre: "Refri", compra: 800, precios: [250, 600, 1200, 2500, 5000], tipo: "pago", ef: [0.5, 1, 1.5, 2, 2.5, 3], desc: "Ingredientes más frescos: cada cliente paga más." },
  { id: "refri2", ico: "🧊", nombre: "Segundo refri", compra: 1500, precios: [400, 900, 1800, 3600, 7000], tipo: "pago", ef: [0.5, 1, 1.5, 2, 2.5, 3], requiere: "refri", desc: "Más variedad de ingredientes frescos: cada cliente paga más." },
  { id: "lavaplatos", ico: "🧼", nombre: "Lavaplatos", compra: 1200, precios: [300, 700, 1400, 2800, 5500], tipo: "paciencia", ef: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6], desc: "Siempre hay platos limpios y todo sale más ordenado: los clientes aguantan más esperando su platillo." },
  { id: "fregadero", ico: "🚰", nombre: "Fregadero", compra: 600, precios: [200, 450, 900, 1800, 3600], tipo: "pago", ef: [0.5, 1, 1, 1.5, 1.5, 2], desc: "Una cocina más limpia da buena fama: cada cliente paga más." },
  { id: "ventilacion", ico: "🌀", nombre: "Ventilación", compra: 1000, precios: [300, 700, 1400, 2800, 5500], tipo: "vel", ef: [0.95, 0.92, 0.89, 0.86, 0.83, 0.8], desc: "Una cocina fresca y sin humo: los cocineros trabajan más rápido." },
  { id: "decoracion", ico: "🌿", nombre: "Decoración", compra: 2000, precios: [500, 1200, 2500, 5000, 9000], tipo: "pago", ef: [0.5, 1, 1.5, 2, 3, 4], desc: "Una cocina bonita se luce a la vista: cada cliente paga más." },
];
const KEY_RECORD = "restaurantes_record";
const KEY_DINERO = "restaurantes_dinero"; // clave de la versión anterior (solo el saldo): se lee UNA vez para pasar ese dinero a la «Partida 1»
// Partidas guardadas: 6 ranuras (cuadrícula) con autoguardado en el navegador (localStorage). Se guarda dinero, lo ganado, tiempo jugado, mejoras de cada mesa,
// personal (nivel), terreno, segunda puerta y estacionamiento. NO se guardan los clientes que están en el local en ese momento.
const KEY_PARTIDAS = "restaurantes_partidas";
const NUM_PARTIDAS = 6; // recuadros de la cuadrícula de partidas
const AUTOGUARDADO_MS = 10000; // además de guardar en cada cobro/compra, se guarda cada tantos ms y al salir de la página

// ----- Personal (se contrata y mejora en el botón fijo «👥 Empleados», no en la tienda de la recepción) -----
const PRECIO_RECEP = 20;                                 // contratar a la recepcionista (da mesa sola)
const PRECIO_MESERO = 20;                                // contratar al mesero (lleva solo los platillos)
const RECEP_TIEMPOS_MS = [6500, 5000, 3800, 2800, 2000, 1600, 1300, 1050, 850, 700]; // por nivel (10 niveles): lo que tarda en dar mesa a un grupo (el nivel 1 es lento a propósito)
const MESERO_VEL = [70, 95, 125, 160, 200, 230, 260, 295, 330, 370]; // por nivel (10 niveles): velocidad al caminar (px/s; la gente normal va a VEL = 150)
// Cocinero: siempre existe (nivel 1); cada mejora lo hace más rápido. COCINA_FACTOR multiplica el tiempo de cocina de cada pedido (nivel 1 = 1 = como antes).
const COCINA_FACTOR = [1, 0.85, 0.72, 0.61, 0.52, 0.44, 0.38, 0.33, 0.29, 0.25];   // por nivel (10 niveles)
const COCINERO_PRECIOS_MEJORA = [10, 20, 30, 45, 65, 90, 125, 170, 230];            // costo de subir al nivel 2, 3, 4 ... 10
// Mesas nuevas: se compran en la tienda en este orden (la 5.ª, la 6.ª...). Después de las 4 iniciales caben 12 más (hasta 16 en total: 4 filas × 4 columnas).
const DINERO_INICIAL = 700;    // dólares con los que empieza una partida nueva
const PRECIO_COCINERO = 450;   // contratar al primer cocinero: al empezar NO hay ninguno y sin cocinero no se puede dar mesa a nadie
const PRECIO_COCINERO2 = 1500; // segundo cocinero (usa los mismos 10 niveles y precios de mejora que el primero)
const MESA_PRECIOS = [30, 60, 100, 160, 240, 350, 500, 700, 900, 1150, 1450, 1800]; // una por cada mesa nueva (12)
const RECEP_PRECIOS_MEJORA = [10, 20, 30, 45, 65, 90, 125, 170, 230]; // costo de subir al nivel 2, 3, 4 ... 10 de la recepcionista
const MESERO_PRECIOS_MEJORA = [10, 20, 30, 45, 65, 90, 125, 170, 230]; // ídem para el mesero
const PAUSA_MESERO_MS = 400;                             // ms que se detiene a tomar el platillo
// Mesas PEQUEÑAS: caben CAPACIDAD_MESA clientes (un grupo de 4 ocupa 2 mesas). Se mejoran tocando la mesa (menú con «Mejoras» y «Personal»); cada mesa se mejora POR SEPARADO.
// Cada elemento tiene NIVELES. «inicial» = nivel con el que viene la mesa (1 = ya lo tiene; 0 = sin comprar: la primera compra lo deja en nivel 1).
// ingresos[n-1] = dólares por cliente que da ese elemento estando en el nivel n (el 0 no da nada).  precios[j] = lo que cuesta la compra número j+1 (subir de nivel).
// Cada cliente paga solo LA SILLA que usa (silla 1 = banca de arriba, silla 2 = banca de abajo) más todo lo demás de su mesa.
// «viejo» = nombre que tenía en partidas guardadas antes del cambio.
const CAPACIDAD_MESA = 2;
const MEJORAS_MESA = [
  { id: "mesa", ico: "🪑", nombre: "Mesa", inicial: 1, ingresos: [3, 3.5, 4, 4.5, 5], precios: [450, 750, 1200, 1800] },                                      // nivel 1 = $3, nivel 2 = $3.50 (+0.50)...
  { id: "silla1", ico: "💺", nombre: "Silla 1", inicial: 1, ingresos: [2, 3, 4, 5, 6], precios: [80, 120, 190, 300], viejo: "sillas" },             // nivel 1 = $2 (+1 por cada mejora)
  { id: "silla2", ico: "💺", nombre: "Silla 2", inicial: 1, ingresos: [2, 3, 4, 5, 6], precios: [80, 120, 190, 300], viejo: "sillas" },
  { id: "cubiertos", ico: "🍴", nombre: "Cubiertos", inicial: 1, ingresos: [1, 1.5, 2, 3], precios: [50, 100, 160] },
  { id: "condimentos", ico: "🧂", nombre: "Condimentos", inicial: 0, ingresos: [1], precios: [50], viejo: "servilletas" },  // empiezan en nivel 0 (sin comprar)
  { id: "bebidas", ico: "🥤", nombre: "Bebidas", inicial: 0, ingresos: [1, 2, 2.5, 3], precios: [50, 100, 220, 380] },
  { id: "decoracion", ico: "🪴", nombre: "Decoración", inicial: 0, ingresos: [1, 2, 3], precios: [30, 100, 500] },                   // decoración de la propia mesa
];
const nivMax = (c) => c.inicial + c.precios.length;                          // nivel más alto de ese elemento
const TOTAL_NIVELES = MEJORAS_MESA.reduce((t, c) => t + nivMax(c), 0);       // suma de los niveles máximos (la barra de la mesa = suma de niveles actuales ÷ este total; con estos valores es 27)
const ingresoNivel = (c, n) => (n > 0 ? c.ingresos[Math.min(n, c.ingresos.length) - 1] : 0);
// PREMIOS: cada mesa regala dinero al llegar a cada 20 % de su barra (5 premios repartidos en el 100 %). Se cobran una sola vez por mesa.
const PREMIOS_MESA = [100, 250, 500, 1000, 2500];
const premiosLogrados = (m) => PREMIOS_MESA.filter((_, j) => sumaNiveles(m) * PREMIOS_MESA.length >= TOTAL_NIVELES * (j + 1)).length; // cuántos premios ya le tocan por su avance
const MESA_NV = 2;                                                           // versión del formato de guardado de las mejoras (2 = se guarda el NIVEL, no las compras)
// Ampliación (segundo terreno): cada cosa se desbloquea con la anterior
// Precio de cada terreno nuevo, en el orden en que se compran (el restaurante es el 1.º): 2.º, 3.º, 4.º ... 9.º. El primero que compres desbloquea la segunda puerta.
const TERRENO_PRECIOS = [10000, 20000, 40000, 70000, 100000, 150000, 300000, 500000];
const PRECIO_PUERTA2 = 40;   // segunda puerta de entrada (necesita el terreno ampliado)
const PRECIO_MESERO2 = 500;  // segundo mesero (solo necesita tener contratado al primero; no hace falta ampliar el terreno)
const PRECIO_RECEP2 = 40;    // segunda recepcionista (necesita la segunda puerta)

// ----- Estacionamiento -----
const ESTAC_INICIALES = 2;       // lugares visibles y disponibles al empezar
// Precio de cada lugar nuevo, en orden (el 1.º cuesta 20, el 2.º 50, ...). Después del último se sigue con ESTAC_FACTOR (ver precioEstac)
const ESTAC_PRECIOS = [20, 50, 80, 100, 130, 180, 250, 320, 400, 500, 620, 750, 900, 1500];
const ESTAC_FACTOR = 1.25;       // pasado el último precio de la lista, cada lugar cuesta 25 % más que el anterior
// ----- Anuncios (botón «📢 Anuncios») -----
// Cada anuncio sube el porcentaje de clientes que llegan (grupos a pie y autos) durante ANUNCIO_DURACION_MS de juego; si lo compras otra vez, suma ese tiempo.
// Los anuncios activos se suman entre sí. La página web es compra única y sube los clientes para siempre.
const ANUNCIO_DURACION_MS = 5 * 60 * 1000; // cuánto dura cada anuncio (tiempo de juego; con la tienda abierta no corre)
const ANUNCIOS = [
  { id: "periodico", ico: "📰", nombre: "Anuncio en el periódico", precio: 300, bono: 0.02 },
  { id: "radio", ico: "📻", nombre: "Anuncio en la radio", precio: 600, bono: 0.04 },
  { id: "television", ico: "📺", nombre: "Anuncio en la televisión", precio: 8000, bono: 0.06 },
  { id: "redes", ico: "📱", nombre: "Anuncio en redes sociales", precio: 1200, bono: 0.08 },
];
const PRECIO_WEB = 50000;  // página web (compra única)
const BONO_WEB = 0.10;     // +10 % de clientes para siempre
const PERSONAS_AUTO = 4;         // cada auto trae siempre 4 personas
const AUTO_MIN_MS = 1500;        // los autos llegan al azar: entre uno y el siguiente pasan entre estos dos tiempos
const AUTO_MAX_MS = 3000;
const PRIMER_AUTO_MS = 8000;     // cuándo pasa el primer auto
const AUTO_VEL = 230;            // velocidad de los autos (px por segundo)
const COCHES = [ // colores de carrocería (tapa, cara izquierda, cara derecha)
  { tapa: "#ef9a9a", izq: "#e53935", der: "#b71c1c" },
  { tapa: "#90caf9", izq: "#1e88e5", der: "#0d47a1" },
  { tapa: "#fff59d", izq: "#fdd835", der: "#f9a825" },
  { tapa: "#eceff1", izq: "#b0bec5", der: "#78909c" },
  { tapa: "#a5d6a7", izq: "#43a047", der: "#1b5e20" },
];
const VIDRIO = { tapa: "#cfe8f7", izq: "#90b4cc", der: "#7aa0b8" };

// ----- Vista (zoom y desplazamiento) -----
const ZOOM_INICIAL = 0.85;      // zoom al abrir el juego (1 = como antes de la ciudad)
const ZOOM_MIN = 0.7;           // lo más que se puede alejar (poco, para que la gente se siga viendo)
const ZOOM_MAX = 1.3 / ESCALA;   // lo más que se puede acercar (con objetos pequeños hace falta acercarse más: se ajusta con ESCALA)
const PASO_ZOOM = 0.15 / ESCALA; // lo que cambia cada vez que tocas ➕ o ➖
const UMBRAL_ARRASTRE_PX = 10;  // si el dedo se mueve más que esto (px de pantalla) es arrastre para mover la vista, no un toque

// ----- Mapa plano de la lógica (560 × 680); la vista isométrica se proyecta al dibujar -----
// La cuadra «de antes» medía 560 × 680 objetos; con ESCALA menor, la cuadra mide más (en unidades del mapa) porque los objetos son más chicos.
const W0 = 560, H0 = 680;
const ACERA = 40, CALLE = 120;              // ancho de la acera y de las calles (en unidades de objeto)
// PARCELA: el restaurante es largo y ocupa 2 de las 9 manzanas (la de la esquina inferior derecha, [0,0], y la central derecha de arriba, [0,-1]).
// BH = fondo de cada manzana; entre las dos queda una franja (acera + calle + acera) que forma parte del restaurante. H = fondo total de la parcela.
const W = Math.round(W0 / ESCALA);
const BH = 750;                              // fondo de cada manzana (cámbialo para hacer las manzanas más largas o más cortas)
const PX = W + 2 * ACERA + CALLE, PY = BH + 2 * ACERA + CALLE; // separación entre manzanas
const H = PY + BH;                          // fondo de la parcela del restaurante (2 manzanas + la franja que las une)
// Manzana (i, j): j = 0 es la de abajo (la del frente del restaurante) y j = -1 la de arriba. La parcela empieza en y = 0 (pared del fondo).
const bx0 = (i) => i * PX, by0 = (j) => (j + 1) * PY;
const HALL_X = W / 2;                       // pasillo central
// Cocina, baño y recepción forman un «núcleo» alrededor del pasillo: la cocina y el baño pegados a la pared de atrás y la recepción pegada a la puerta del frente.
// DX mueve el núcleo al centro de la cuadra; DY mueve lo de enfrente hasta la puerta. Con ESCALA = 1 ambos valen 0 y todo queda como antes.
const DX = (W - W0) / 2, DY = H - H0;
const ENTRADA = [HALL_X, 570 + DY];         // inicio del pasillo, junto a la recepción
// Lugares de espera: 2 por puerta (máximo 2 grupos esperando a la vez en cada una). «p» es la puerta (0 = la de siempre, 1 = la de atrás)
const SLOTS = [{ p: 0, y: 606 + DY }, { p: 0, y: 640 + DY }, { p: 1, y: -84 }, { p: 1, y: -44 }];
const PUERTAS = [
  { entrada: ENTRADA, spawn: [HALL_X, H + 30], pagoY: 585 + DY, llenoY: 664 + DY, salida: [[HALL_X, 640 + DY], [HALL_X, H + 40]], irse: (c) => [[HALL_X, Math.max(c.y, 640 + DY)], [HALL_X, H + 40]] },
  { entrada: [HALL_X, 14], spawn: [HALL_X, -190], pagoY: -24, llenoY: -130, salida: [[HALL_X, -90], [HALL_X, -200]], irse: (c) => [[HALL_X, Math.min(c.y, -90)], [HALL_X, -200]] },
];
// ----- Habitaciones: cada una tiene su lugar FIJO (como en el mapa de referencia) -----
// De izquierda a derecha y de atrás hacia adelante:
//   fila de atrás (y 10-160):  ⚡ generadores · 🍳 cocina (al centro, junto al pasillo) · 🕴️ oficina del jefe
//   segunda fila (y 170-320):  🚻 baño (debajo de los generadores) · 🧹 limpieza (debajo de la oficina)
// Las habitaciones de los lados abren su puerta hacia el pasillo; la cocina, hacia el frente. En las paredes de los lados, más adelante, van la cafetería, la heladería y la pastelería.
const COC_ANCHO = 250, LADO_ANCHO = 230;     // ancho de la cocina y de las habitaciones de los lados
const BAN_ANCHO = LADO_ANCHO;
const X_IZQ = 10, X_DER = W - 10 - LADO_ANCHO; // x de las habitaciones de la izquierda y de la derecha
const COC_X0 = HALL_X - COC_ANCHO / 2;       // cocina: centrada en el pasillo
const DXK = COC_X0 - 10;                     // cuánto está corrida la cocina (todo lo de la cocina estaba escrito como «10 + DX»)
const BAN_X0 = X_IZQ;
const HAB_Y0 = 10, HAB_Y1 = 160;             // fila de atrás (cocina, generadores y oficina)
let KX = 0, BX = 0;                          // las habitaciones ya no se mueven (quedan en 0; se conservan por las partidas guardadas)
let PUERTA_COCINA, COCINA_DENTRO, RECT_COCINA;
function recalcHab() {
  PUERTA_COCINA = [225 + DXK + KX, 185];
  COCINA_DENTRO = [225 + DXK + KX, 140];      // dentro de la cocina, frente a la puerta
  RECT_COCINA = [10 + DXK + KX, HAB_Y0, 260 + DXK + KX, HAB_Y1];
}
recalcHab();
// Habitaciones: cada una va en su lugar fijo (ver LUGARES más abajo).
// enOficina = se compra en la oficina del jefe (si no hay oficina, en «🏗️ Construir»). inicial = ya viene construida al empezar (la oficina).
// gasto = lo que paga el cliente cada vez que pasa por ahí (como el baño, que cuesta COSTO_BANIO). adornos = [x relativo al cuarto, y, emoji].
const HAB_NUEVAS = {
  cafeteria: { nombre: "la cafetería", etiqueta: "Cafetería", ico: "☕", ancho: 150, precio: 20000, enOficina: true, gasto: 10, piso: ["#fbe9d7", "#f3d9bd"], pared: "#c8a27a", colorTexto: "#5d4037", adornos: [[35, 70, "☕"], [115, 70, "🥐"]] },
  heladeria: { nombre: "la heladería", etiqueta: "Heladería", ico: "🍦", ancho: 150, precio: 20000, enOficina: true, gasto: 8, piso: ["#fde4ef", "#f9c9de"], pared: "#e8a2c0", colorTexto: "#8e2a58", adornos: [[35, 70, "🍦"], [115, 70, "🍨"]] },
  pasteleria: { nombre: "la pastelería", etiqueta: "Pastelería", ico: "🍰", ancho: 150, precio: 20000, enOficina: true, gasto: 12, piso: ["#fff4c2", "#ffe9a0"], pared: "#e6c96a", colorTexto: "#7a5c00", adornos: [[85, 70, "🍰"], [120, 70, "🎂"]] },
  // sinVisitas: los clientes NO pasan por ahí (no está en ORDEN_VISITAS); soloPara = quién la usa. Todavía no hacen nada más (gasto 0).
  oficina: { nombre: "la oficina del jefe", etiqueta: "Oficina del jefe", ico: "🕴️", ancho: LADO_ANCHO, precio: 20000, inicial: true, gasto: 0, sinVisitas: true, soloPara: "el jefe", piso: ["#e9dccb", "#d8c4a8"], pared: "#7b5b45", colorTexto: "#4e342e", adornos: [[110, 50, "🗄️"], [180, 50, "🕴️"]] },
  generadores: { nombre: "la sala de generadores", etiqueta: "Generadores", ico: "⚡", ancho: LADO_ANCHO, precio: 20000, inicial: true, gasto: 0, sinVisitas: true, soloPara: "la energía del restaurante", piso: ["#eceff1", "#cfd8dc"], pared: "#78909c", colorTexto: "#37474f", adornos: [] },
  limpieza: { nombre: "el cuarto de limpieza", etiqueta: "Limpieza", ico: "🧹", ancho: LADO_ANCHO, precio: 20000, inicial: true, gasto: 0, sinVisitas: true, soloPara: "los empleados de limpieza", piso: ["#e0f2f1", "#c5e4e1"], pared: "#4f9a94", colorTexto: "#00544f", adornos: [[110, 50, "🧹"], [180, 50, "🧽"]] },
};
let habsExtra = {}; // habitaciones nuevas compradas: id → x de su esquina izquierda
let banioComprado = false; // el baño ya no viene hecho: se compra (PRECIO_BANIO) en la oficina del jefe
let generadores = 0; // generadores comprados (cada uno suma ENERGIA_POR_GENERADOR de energía disponible)
const energiaTotal = () => ENERGIA_BASE + generadores * ENERGIA_POR_GENERADOR;
// Lugar de cada habitación: la y de su fila y de qué lado tiene la puerta («frente»; «der» = en la pared derecha de la habitación, hacia el pasillo; «izq» = en su pared izquierda).
// py = a qué y está la puerta de las habitaciones de los lados (por omisión, a la mitad). Las de las paredes (y 330 en adelante) tienen la puerta en la franja libre entre las filas de mesas.
const LUGARES = {
  cocina:      { y0: 10,  y1: 160, puerta: "frente" },
  generadores: { x0: X_IZQ, y0: 10,  y1: 160, puerta: "der" },
  banio:       { x0: X_IZQ, y0: 170, y1: 320, puerta: "der" },
  oficina:     { x0: X_DER, y0: 10,  y1: 160, puerta: "izq" },
  limpieza:    { x0: X_DER, y0: 170, y1: 320, puerta: "izq" },
  cafeteria:   { x0: X_IZQ, y0: 330, y1: 480, puerta: "der", py: 355 },
  heladeria:   { x0: X_IZQ, y0: 490, y1: 640, puerta: "der", py: 557 },
  pasteleria:  { x0: W - 10 - 150, y0: 330, y1: 480, puerta: "izq", py: 355 },
};
const x0Hab = (id) => (id === "cocina" ? COC_X0 + KX : LUGARES[id].x0);
const anchoHab = (id) => (id === "cocina" ? COC_ANCHO : id === "banio" ? BAN_ANCHO : HAB_NUEVAS[id].ancho);
const nombreHab = (id) => (id === "cocina" ? "la cocina" : id === "banio" ? "el baño" : HAB_NUEVAS[id].nombre);
const habsPuestas = () => ["cocina", ...(banioComprado ? ["banio"] : []), ...Object.keys(HAB_NUEVAS).filter((id) => habsExtra[id] !== undefined)];
const rectHab = (id) => [x0Hab(id), LUGARES[id].y0, x0Hab(id) + anchoHab(id), LUGARES[id].y1]; // [x0, y0, x1, y1] de la habitación
const pyHab = (id) => (LUGARES[id].py !== undefined ? LUGARES[id].py : (LUGARES[id].y0 + LUGARES[id].y1) / 2);
const PUERTA_ANCHO = 60;  // ancho del hueco de la puerta de las habitaciones de los lados
// Punto justo afuera de la puerta (por donde se entra)
function puertaHab(id) {
  const [x0, y0, x1, y1] = rectHab(id), L = LUGARES[id];
  if (L.puerta === "frente") return id === "cocina" ? PUERTA_COCINA : [(x0 + x1) / 2, y1 + 25];
  return L.puerta === "der" ? [x1 + 25, pyHab(id)] : [x0 - 25, pyHab(id)];
}
// Punto sobre la propia puerta (en el hueco de la pared)
function umbralHab(id) {
  const [x0, y0, x1, y1] = rectHab(id), L = LUGARES[id];
  if (L.puerta === "frente") return [puertaHab(id)[0], y1];
  return L.puerta === "der" ? [x1, pyHab(id)] : [x0, pyHab(id)];
}
// Camino desde el pasillo (HALL_X, 185) hasta justo afuera de la puerta de la habitación (para volver se recorre al revés)
function viaHab(id) {
  const L = LUGARES[id], [px, py] = puertaHab(id);
  if (L.puerta === "frente") return [[px, py]];
  if (L.y0 >= 330) return [[HALL_X, py], [px, py]];            // habitaciones de las paredes: por el pasillo del centro hasta su altura
  const ax = L.puerta === "der" ? px + 35 : px - 35;            // filas de atrás: por el pasillo que queda entre la cocina y la habitación
  return [[ax, 185], [ax, py], [px, py]];
}
// Dónde se para el cliente que usa el retrete s (junto a su 🚽) y dónde espera dentro de la habitación
const posRetrete = (s) => { const [x0, y0] = rectHab("banio"); return [x0 + 65, y0 + 75 + s * 40]; };
function dentroHab(id, i) {
  const [x0, y0, x1] = rectHab(id), L = LUGARES[id], k = i % 4;
  if (id === "banio") return [x1 - 55 - k * 22, y0 + 100];
  return L.puerta === "der" ? [x1 - 40 - k * 26, y0 + 110] : [x0 + 40 + k * 26, y0 + 110];
}
// Las habitaciones ya vienen en su lugar: «comprar» una solo la construye (ver comprarHab). La oficina, la sala de generadores y el cuarto de limpieza (debajo de la oficina) vienen construidos.
function ponerHabsIniciales() {
  for (const id of ["oficina", "generadores", "limpieza"]) if (habsExtra[id] === undefined) habsExtra[id] = LUGARES[id].x0;
}
// Decoraciones: cada una que compras suma «bono» dólares a lo que paga CADA cliente (se ven en los costados del comedor)
const DECORACIONES = [
  { id: "plantas", ico: "🪴", nombre: "Plantas", precio: 2000, bono: 0.5, lugares: [[60, 1020], [60, 1260], [1060, 1020], [1060, 1260]] },
  { id: "cuadros", ico: "🖼️", nombre: "Cuadros", precio: 5000, bono: 1, lugares: [[130, 1100], [130, 1340], [990, 1100], [990, 1340]] },
  { id: "lamparas", ico: "💡", nombre: "Lámparas de pie", precio: 9000, bono: 1.5, lugares: [[60, 1140], [60, 1380], [1060, 1140], [1060, 1380]] },
  { id: "fuente", ico: "⛲", nombre: "Fuente", precio: 15000, bono: 2.5, lugares: [[80, 1480], [1040, 1480]] },
];
let decos = []; // ids de las decoraciones compradas
const bonoDeco = () => DECORACIONES.filter((d) => decos.includes(d.id)).reduce((t, d) => t + d.bono, 0);
const MESERO_POST = [HALL_X + 45, 210];     // dónde espera el mesero cuando no hay platillos listos
const MESERO_POST2 = [HALL_X - 45, 232];    // ídem para el segundo mesero
const TY = 190; // las mesas empiezan más abajo que antes: arriba van las habitaciones (baño, limpieza...) y sus pasillos
const MESAS_BASE = [
  { id: 1, cx: 150 + DX, cy: 290 + TY }, { id: 2, cx: 410 + DX, cy: 290 + TY },   // las mesas empiezan junto a las habitaciones; el resto del comedor queda libre para más mesas
  { id: 3, cx: 150 + DX, cy: 440 + TY }, { id: 4, cx: 410 + DX, cy: 440 + TY },
];
// El comedor tiene 16 mesas en 4 filas × 4 columnas (filas en y = 290, 440, 590 y 740; columnas en x = 0, 150, 410 y 560 + DX).
// Lugares de las mesas que se pueden comprar: primero las dos columnas de adentro (las de las mesas base), una fila (150 de alto) más abajo cada vez, y luego las dos de afuera. Se llenan en este orden.
const MESAS_EXTRA = [590 + TY, 740 + TY].flatMap((cy, f) => [
  { id: 5 + f * 2, cx: 150 + DX, cy }, { id: 6 + f * 2, cx: 410 + DX, cy },
]);
// Columnas de afuera (la 9.ª a la 16.ª): una a la izquierda de las mesas de la izquierda y otra a la derecha de las de la derecha, a 150 de las de adentro. «ext» = su camino
// pasa por los pasillos horizontales entre filas (y = fila - 70 y fila + 75), porque no pueden cruzar las mesas de adentro.
const MESAS_EXT = [290 + TY, 440 + TY, 590 + TY, 740 + TY].flatMap((cy, f) => [
  { id: 9 + f * 2, cx: 0 + DX, cy, ext: true }, { id: 10 + f * 2, cx: 560 + DX, cy, ext: true },
]);
const MESAS_TODAS = [...MESAS_BASE, ...MESAS_EXTRA, ...MESAS_EXT];
// Cada mesa tiene 2 bancas en lados opuestos (arriba y abajo) y en cada banca caben 2 personas (4 por mesa, como antes).
const BANCAS = ["arriba", "abajo"];
const ORDEN_SILLAS = ["arriba", "abajo", "arriba", "abajo"]; // banca de cada lugar (0 a 3): primero uno en cada banca (los del fondo) y luego el segundo de cada banca
const BANCA_LARGO = 54;  // largo de cada banca
const ASIENTO_SEP = 14;  // distancia de cada persona al centro de su banca
const CARAS = ["🧑", "👩", "👨", "🧓", "👧", "👦", "🧔", "👱"];

// ----- Terrenos que se pueden comprar (en el mapa plano) -----
// rect: zona que se pavimenta como plaza al comprarlo [x0, y0, x1, y1]; centro: donde se pone el cartel «En venta». Flechas = hacia dónde queda en pantalla.
// Cada manzana de pasto (PASTO) es un terreno; se identifica con su clave «i,j» (su lugar respecto a la del restaurante, que es 0,0).
// Pasos hacia ⬉ en pantalla = -i; pasos hacia ⬈ = -j. El nombre y la flecha salen de esos dos números.
const NOMBRES_LOTE = { // clave «-i,-j» → [flecha, nombre]
  "1,0": ["⬉", "Izquierda del frente"], "1,1": ["⬉", "Izquierda del fondo"], "0,2": ["⬈", "Atrás"],
  "2,0": ["⬉", "Izquierda lejana del frente"], "2,1": ["⬉", "Izquierda lejana del fondo"],
  "1,2": ["⬈", "Atrás a la izquierda"], "2,2": ["⬆", "Esquina del fondo"],
};
const claveLote = (i, j) => i + "," + j;
const datosLote = (k) => { const [i, j] = k.split(",").map(Number), n = NOMBRES_LOTE[(-i) + "," + (-j)] || ["🌱", "Terreno"]; return { i, j, flecha: n[0], etiqueta: n[1] }; };
const ordenLote = (k) => { const [i, j] = k.split(",").map(Number); return (-i - j) * 10 - i; };
const precioTerreno = () => TERRENO_PRECIOS[lotes.length]; // undefined = ya compraste todos
// Terrenos que se pueden comprar con los terrenos «propios»: el pasto que toca el restaurante o uno ya comprado
function lotesDisponibles(propios = lotes) {
  const mio = (i, j) => (i === 0 && (j === 0 || j === -1)) || propios.includes(claveLote(i, j));
  return PASTO.filter(([i, j]) => !propios.includes(claveLote(i, j)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => mio(i + a, j + b)))
    .map(([i, j]) => claveLote(i, j))
    .sort((p, q) => ordenLote(p) - ordenLote(q));
}

// ----- Lugares de estacionamiento (en el mapa plano; se alinean con la acera que rodea la cuadra) -----
// lado: f = enfrente, d = derecha, i = izquierda, a = atrás. Los autos entran de frente al lugar (eje = hacia dónde apunta el auto).
// «acera» es donde bajan/suben las personas; «carril» es el punto de la calle desde donde el auto entra o sale.
// Orden de compra: primero los 4 de enfrente (los 2 primeros flanquean la puerta), luego la derecha, la izquierda y al final atrás.
const CAJON_ANCHO = 46, CAJON_FONDO = 60;
const CARRIL_F = H + 124;                                                                     // carril de la calle de enfrente
const ENT_AUTO = [-330, CARRIL_F], SAL_AUTO = [W + 340, CARRIL_F];                                         // por dónde entran y salen los autos (calle de enfrente)
const ESQ_AUTO = { C0: [-124, CARRIL_F], C1: [W + 124, CARRIL_F], C2: [W + 124, -124], C3: [-124, -124] };     // esquinas del carril que rodea la cuadra
const ACERA_Y = H + 22;                                                                         // acera de enfrente (donde caminan hacia la puerta)
function crearCajones() {
  const out = [], ys = [640, 568, 496, 424, 352, 280, 208, 136].map((y) => y + DY); // a los lados: de la puerta hacia atrás
  [-72, 72, 144, 216].forEach((dx) => { const x = HALL_X + dx; out.push({ lado: "f", x, y: H + 70, eje: "y", acera: [x, ACERA_Y], carril: [x, CARRIL_F] }); });
  ys.forEach((y) => out.push({ lado: "d", x: W + 70, y, eje: "x", acera: [W + 22, y], carril: [W + 124, y] }));
  ys.forEach((y) => out.push({ lado: "i", x: -70, y, eje: "x", acera: [-22, y], carril: [-124, y] }));
  [-88, -160, -232, 240].forEach((dx) => { const x = HALL_X + dx; out.push({ lado: "a", x, y: -70, eje: "y", acera: [x, -22], carril: [x, -124] }); });
  return out.map((c) => ({ ...c, usado: false, coche: null, pendientes: 0 }));
}
const CAJONES = crearCajones();
// Precio del siguiente lugar. k = cuántos lugares has comprado ya (0 = el primero). Pasada la lista: el último precio × ESTAC_FACTOR por cada lugar más
function precioEstac(k) {
  if (k < ESTAC_PRECIOS.length) return ESTAC_PRECIOS[k];
  return Math.round((ESTAC_PRECIOS[ESTAC_PRECIOS.length - 1] * Math.pow(ESTAC_FACTOR, k - ESTAC_PRECIOS.length + 1)) / 10) * 10;
}
// Camino del auto desde la entrada de la calle hasta el lugar (o, con saliendo = true, desde el lugar hasta la salida), por el lado más corto
function rutaCoche(k, saliendo) {
  const via = k.lado === "f" ? [] : k.lado === "d" ? [ESQ_AUTO.C1] : k.lado === "i" ? [ESQ_AUTO.C0]
    : k.x < HALL_X ? [ESQ_AUTO.C0, ESQ_AUTO.C3] : [ESQ_AUTO.C1, ESQ_AUTO.C2];
  if (!saliendo) return [ENT_AUTO, ...via, k.carril, [k.x, k.y]];
  return [k.carril, ...via.slice().reverse(), SAL_AUTO];
}
// Camino a pie desde la acera del lugar hasta la puerta (pu = 0: la de enfrente; pu = 1: la de atrás, solo desde los lugares de atrás)
function caminoAcera(k, pu) {
  if (pu === 1) return [k.acera];
  const r = [k.acera];
  if (k.lado === "d") r.push([W + 22, ACERA_Y]);
  if (k.lado === "i") r.push([-22, ACERA_Y]);
  if (k.lado === "a") r.push(k.x < HALL_X ? [-22, -22] : [W + 22, -22], k.x < HALL_X ? [-22, ACERA_Y] : [W + 22, ACERA_Y]);
  r.push([HALL_X, ACERA_Y]);
  return r;
}

const $ = (id) => document.getElementById(id);
// ----- Dólares: se pueden dividir en monedas de 50 centavos (5, 5.50, 6, ...). Los múltiplos de 0.5 son exactos, no hay errores de redondeo -----
const fmt = (n) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })); // 5 → «5», 5.5 → «5.50», 10000 → «10,000»
const dolares = (n) => "$" + fmt(n);                                    // 5.5 → «$5.50»
const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");

// ----- Estado de la partida -----
let gen = 0; // sube al reiniciar: lo que quedó pendiente de la partida anterior se descarta
let ents, globos, monedas, mesas, recepcion;
let dinero, ganado, atendidos, perdidos, cocinando; // «dinero» es lo que tienes para gastar; «ganado» es todo lo cobrado (puntos y récord)
let ultimoMin = -1, ultimoAbierto = null; // último minuto de juego pintado en el marcador / estado del horario en el cuadro anterior (0 cerrado, 1 sin clientes nuevos, 2 abierto; null = todavía no se sabe)
let limpiador = false, limpEnt = null; // empleado de limpieza contratado / su personaje cuando está en turno
let reloj, proxLlegada, activos, ultimoSeg; // tiempo jugado (ms), cuándo llega el próximo grupo, grupos en el local
let llevando = null;                    // mesa cuyo platillo traes en la mano
let receps = [null, null], meseros = [null, null]; // personal contratado (null = todavía no): { nivel, ... }; [0] el de siempre, [1] el de la ampliación
let terreno2 = false, puerta2 = false;             // ampliación comprada / segunda puerta comprada
let lotes = []; // terrenos comprados (claves «i,j» de PASTO), en el orden en que se compraron
let usuario = null, perfilDatos = null, vistaPerfil = false; // jugador con sesión de Google (null = sin sesión), su perfil leído de Firebase, true = el panel abierto es el de «👤 Perfil»
let anuncios = {}, paginaWeb = false, vistaAnuncios = false; // anuncios: { id: momento del reloj en que termina }; página web comprada; true = el panel abierto es el de «📢 Anuncios»
let vistaGeneradores = false; // true = el panel abierto es el de la «⚡ sala de generadores»
let vistaOficina = false; // true = el panel abierto es el de la «🕴️ oficina del jefe» (compras de mesas y zonas)
let vistaConstruir = false; // true = el panel abierto es el de «🏗️ Construir» (habitaciones y decoraciones)
let puntosEnviados = 0, umbralPuntos = PUNTOS_LOTE, enviando = false; // puntos ya mandados al perfil, cuántos hacen falta para el siguiente envío, envío en curso
let ranura = null; // partida activa (0, 1 o 2); null = estás en el menú y no se guarda nada
let cocinero = 0, cocinero2 = 0, nMesas = MESAS_BASE.length; // nivel del cocinero (0 = sin contratar, 1 a 10), del segundo cocinero (0 = sin contratar) y mesas que hay en el comedor
let menuMesaEl = null, tabMesa = "mejoras", cosaSel = "mesa"; // menú de la mesa: su elemento, pestaña abierta (mejoras / personal) y cosa elegida
let mesaMejora = null; // mesa cuyo panel de mejoras está abierto (null = la tienda de la recepción)
let vistaEmpleados = false; // true = el panel abierto es el de «Empleados» (botón fijo en la esquina de la pantalla)
const nuevasMejoras = () => Object.fromEntries(MEJORAS_MESA.map((c) => [c.id, c.inicial])); // nivel de cada cosa de una mesa (0 = sin comprar)
let cocinaNiv = {};                                  // nivel de cada cosa de la cocina: id → 0 (sin comprar) a 6 (la estufa siempre es al menos 1)
let vistaCocina = false, cosaCocina = "estufa";      // true = el menú abierto es el de la cocina; cosa elegida en él
const nivCoc = (id) => Math.max(id === "estufa" ? 1 : 0, cocinaNiv[id] || 0);
const efCoc = (c, n) => c.ef[Math.max(1, Math.min(c.ef.length, n)) - 1];
const factorCocina = (tipo) => MEJORAS_COCINA.reduce((t, c) => (c.tipo === tipo && nivCoc(c.id) > 0 ? t * efCoc(c, nivCoc(c.id)) : t), 1); // «vel» y «paciencia» multiplican
const bonoCocina = () => MEJORAS_COCINA.reduce((t, c) => (c.tipo === "pago" && nivCoc(c.id) > 0 ? t + efCoc(c, nivCoc(c.id)) : t), 0);      // «pago» suma
// Cada persona paga SOLO la silla que usa: la 0 y la 2 se sientan en la banca de arriba (silla1) y la 1 y la 3 en la de abajo (silla2)
const bonoMesaPersona = (m, i) => { const sa = ORDEN_SILLAS[i] === "arriba" ? "silla1" : "silla2"; return MEJORAS_MESA.reduce((t, c) => (c.id === "silla1" || c.id === "silla2") && c.id !== sa ? t : t + ingresoNivel(c, m.mejoras[c.id]), 0); }; // mesa, cubiertos, etc. + SOLO la silla de esa persona
const pagoSentado = (m, i) => bonoMesaPersona(m, i) + bonoDeco();      // lo que paga la persona i al sentarse (mesa, SU silla, cubiertos, etc. y decoraciones)
const pagoComida = () => PAGO_POR_CLIENTE + bonoCocina();             // lo que paga cada uno al recibir su comida (comida + mejoras de la cocina)
const pagoPorCliente = (m) => ENTRADA_POR_CLIENTE + pagoComida() + (pagoSentado(m, 0) + pagoSentado(m, 1)) / 2; // total que deja cada cliente de la mesa m (promedio de sus dos sillas)
const totalMejoras = (m) => MEJORAS_MESA.reduce((t, c) => t + Math.max(0, m.mejoras[c.id] - c.inicial), 0);   // compras hechas en esa mesa
const sumaNiveles = (m) => MEJORAS_MESA.reduce((t, c) => t + m.mejoras[c.id], 0);                             // suma de los niveles actuales (para la barra)
let nEstac = ESTAC_INICIALES, proxAuto = 0, autosPerdidos = 0; // lugares de estacionamiento disponibles, cuándo pasa el próximo auto, autos que no hallaron lugar
let puntero = { x: -99, y: -99 };       // último punto tocado/señalado en el lienzo (para dibujar el platillo)

// Reloj del juego: se detiene mientras la tienda está abierta (pausa). Todo lo que depende de «ahora()» y de «esp()» se congela con él.
let pausado = false, inicioPausa = 0, tiempoPausado = 0;
const ahora = () => (pausado ? inicioPausa : performance.now()) - tiempoPausado;
function ponerPausa(v) {
  if (v === pausado) return;
  if (v) inicioPausa = performance.now(); else tiempoPausado += performance.now() - inicioPausa;
  pausado = v;
}
let esperas = []; // esperas pendientes: { fin, g, r }
let retretes = Array(RETRETES).fill(false); // true = ese retrete está en uso
// Espera que no continúa si se reinició la partida mientras tanto
const esp = (ms) => { const g = gen; return new Promise((r) => esperas.push({ fin: ahora() + ms, g, r })); };

const minutoJuego = () => (HORA_ABRE + (reloj / 1000) * MIN_JUEGO_POR_SEG) % 1440;   // minuto del día (0 = medianoche)
const diaJuego = () => Math.floor((HORA_ABRE + (reloj / 1000) * MIN_JUEGO_POR_SEG) / 1440) + 1;
const estaAbierto = () => { const m = minutoJuego(); return m >= HORA_ABRE && m < HORA_CIERRA; };
const aceptaClientes = () => { const m = minutoJuego(); return m >= HORA_ABRE && m < HORA_CLIENTES_FIN; };
const estadoHorario = () => (aceptaClientes() ? 2 : estaAbierto() ? 1 : 0);
function enTurno(rol) { // ¿está trabajando ahora? rol: "limpieza" o cualquier otro (cocina, mesero, recepción)
  const m = minutoJuego();
  return rol === "limpieza" ? m >= HORA_LIMPIEZA_LLEGA && m < HORA_LIMPIEZA_SALE : m >= HORA_PERSONAL_LLEGA && m < HORA_CIERRA;
}
function fmtHora(m) { const h = Math.floor(m / 60) % 24, mi = Math.floor(m % 60); return (h % 12 || 12) + ":" + String(mi).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM"); }
function oscuridad() { // 0 = pleno día, hasta 0.45 = noche cerrada: anochece de 6 a 8 PM y amanece de 5 a 7 AM
  const h = minutoJuego() / 60, MAX = 0.45;
  if (h < 5) return MAX;
  if (h < 7) return MAX * (7 - h) / 2;
  if (h < 18) return 0;
  if (h < 20) return MAX * (h - 18) / 2;
  return MAX;
}
const anuncioActivo = (a) => (anuncios[a.id] || 0) > reloj;
const bonoClientes = () => (paginaWeb ? BONO_WEB : 0) + ANUNCIOS.reduce((t, a) => t + (anuncioActivo(a) ? a.bono : 0), 0); // +X (0.06 = +6 %) de clientes que llegan
const ritmoLlegadas = () => RAMPA_INICIO + (1 - RAMPA_INICIO) * Math.min(1, reloj / RAMPA_MS); // 0.2 al empezar → 1 pasada la rampa (se calcula con el tiempo jugado, así que una partida guardada no vuelve a empezar de cero)
const crearMesa = (m) => ({ ...m, ocupada: false, plato: false, barra: null, esperando: false, tomado: false, enojo: false, listoDesde: 0, res: null, clientes: [], mejoras: nuevasMejoras(), premios: 0, slot: -1 });
function nuevaPartida(datos = null) { // datos: partida guardada que se carga (null = partida nueva)
  gen++; esperas = []; retretes = Array(RETRETES).fill(false);
  ents = []; globos = []; monedas = [];
  cocinero = 0; cocinero2 = 0; limpiador = false; limpEnt = null; nMesas = MESAS_BASE.length; cocinaNiv = {};
  mesas = MESAS_BASE.map(crearMesa);
  recepcion = Array(SLOTS.length).fill(null);
  dinero = DINERO_INICIAL; ganado = 0; atendidos = 0; perdidos = 0; cocinando = 0; llevando = null; activos = 0; receps = [null, null]; meseros = [null, null];
  const habiaCambios = terreno2 || nEstac > ESTAC_INICIALES || KX !== 0 || BX !== 0 || Object.keys(habsExtra).length > 0; terreno2 = false; lotes = []; puerta2 = false; KX = 0; BX = 0; habsExtra = {}; banioComprado = false; generadores = 0; decos = []; recalcHab();
  nEstac = ESTAC_INICIALES; autosPerdidos = 0; proxAuto = PRIMER_AUTO_MS;
  anuncios = {}; paginaWeb = false;
  CAJONES.forEach((k) => { k.usado = false; k.coche = null; k.pendientes = 0; });
  reloj = 0; proxLlegada = PRIMERA_LLEGADA_MS; ultimoSeg = -1; ultimoMin = -1; ultimoAbierto = null; puntosEnviados = 0; umbralPuntos = PUNTOS_LOTE;
  if (datos) aplicarGuardado(datos);
  else { // partida nueva: ya empiezas con un cocinero, una recepcionista, un mesero y un empleado de limpieza (todos de nivel 1)
    cocinero = 1; limpiador = true;
    receps[0] = { nivel: 1, g: null, t0: 0, emoji: "🧑‍💼" };
    const ent = nuevaEnt("🤵", MESERO_POST[0], MESERO_POST[1]);
    ent.vel = MESERO_VEL[0];
    meseros[0] = { nivel: 1, ocupado: false, ent, post: MESERO_POST };
    ponerHabsIniciales(); // la oficina del jefe ya viene construida
  }
  armarFondo(); // quita la plaza y los lugares de la partida anterior (o dibuja los de la partida cargada)
  cerrarTienda();
  $("tiempo").textContent = fmtTiempo(Math.floor(reloj / 1000));
  info("Ya tienes cocinero, recepcionista, mesero y personal de limpieza. Los clientes llegan solos de 9:30 AM a 11:00 PM: la recepcionista tarda 10 s en atenderlos y, si hay mesa, cada cliente paga $10 de entrada. Toca el mostrador 🛒 para comprar terreno y estacionamiento, la 🕴️ oficina del jefe para comprar mesas y zonas, una mesa para mejorarla y 👥 Empleados (arriba a la derecha) para el personal.");
  actualizar();
}

// Tiempo jugado: 0:00, 12:34 o 1:05:09
function fmtTiempo(seg) {
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = seg % 60, dos = (n) => String(n).padStart(2, "0");
  return (h ? h + ":" + dos(m) : m) + ":" + dos(s);
}
function info(t) { $("estado").textContent = t; }
// ----- Partidas guardadas -----
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
function leerTodo() {
  let t = null;
  try { t = JSON.parse(localStorage.getItem(KEY_PARTIDAS)); } catch (e) {}
  if (!t || !Array.isArray(t.ranuras)) {
    t = { ultima: 0, ranuras: Array(NUM_PARTIDAS).fill(null) };
    try { // primera vez con partidas: si había dinero guardado de la versión anterior, pasa a la Partida 1
      const n = num(localStorage.getItem(KEY_DINERO));
      if (n > 0) t.ranuras[0] = { dinero: Math.round(n * 2) / 2, fecha: Date.now() };
    } catch (e) {}
  }
  while (t.ranuras.length < NUM_PARTIDAS) t.ranuras.push(null);
  if (!(t.ultima >= 0 && t.ultima < NUM_PARTIDAS)) t.ultima = 0;
  return t;
}
let avisoGuardado = false;
function escribirTodo(t) {
  try { localStorage.setItem(KEY_PARTIDAS, JSON.stringify(t)); avisoGuardado = false; return true; }
  catch (e) {
    if (!avisoGuardado) { avisoGuardado = true; info("⚠️ No se pudo guardar la partida: el navegador bloquea el almacenamiento (modo privado, sin espacio o permisos). Tu avance no se conservará."); }
    return false;
  }
}
// Foto de lo que se guarda de la partida actual
function instantanea() {
  return {
    dinero, ganado, atendidos, perdidos, reloj: Math.floor(reloj), puntosEnviados,
    mesas: mesas.map((m) => ({ id: m.id, nv: MESA_NV, premios: m.premios, mejoras: { ...m.mejoras } })),
    receps: receps.map((r) => (r ? r.nivel : 0)),
    meseros: meseros.map((w) => (w ? w.nivel : 0)),
    terreno2, lotes: lotes.slice(), kx: KX, bx: BX, habs: { ...habsExtra }, decos: decos.slice(), puerta2, nEstac, cocinero, cocinero2, limpiador, nMesas, cocina: { ...cocinaNiv }, banio: banioComprado, generadores,
    anuncios: { ...anuncios }, paginaWeb,
    fecha: Date.now(),
  };
}
function guardarPartida() {
  if (ranura === null || !mesas) return;
  const t = leerTodo();
  t.ranuras[ranura] = instantanea();
  t.ultima = ranura;
  escribirTodo(t);
}
// Pone en el estado del juego lo que había guardado (se llama dentro de nuevaPartida, con el estado ya en blanco). Todo se valida: un dato raro no rompe la partida.
function aplicarGuardado(d) {
  const med = (v) => Math.max(0, Math.round(num(v) * 2) / 2); // múltiplos de 50 centavos
  dinero = med(d.dinero); ganado = med(d.ganado);
  atendidos = Math.max(0, Math.floor(num(d.atendidos))); perdidos = Math.max(0, Math.floor(num(d.perdidos)));
  reloj = Math.max(0, num(d.reloj)); proxLlegada = reloj + PRIMERA_LLEGADA_MS; proxAuto = reloj + PRIMER_AUTO_MS;
  puntosEnviados = Math.max(0, Math.min(Math.floor(num(d.puntosEnviados)), Math.floor(ganado / DOLARES_POR_PUNTO))); // así no se mandan dos veces los mismos puntos al perfil
  cocinero = d.cocinero === undefined ? 1 : Math.max(0, Math.min(COCINA_FACTOR.length, Math.floor(num(d.cocinero)))); // una partida muy vieja (sin este dato) ya tenía cocinero
  limpiador = d.limpiador !== false; // las partidas de antes del personal de limpieza reciben uno
  cocinero2 = cocinero ? Math.max(0, Math.min(COCINA_FACTOR.length, Math.floor(num(d.cocinero2)) || 0)) : 0; // el segundo cocinero necesita al primero
  cocinaNiv = {}; // mejoras de la cocina: solo ids conocidos, niveles válidos y sin saltarse lo que hay que tener antes
  if (d.cocina && typeof d.cocina === "object") MEJORAS_COCINA.forEach((c) => { const n = Math.max(0, Math.min(c.precios.length + 1, Math.floor(num(d.cocina[c.id])))); if (n > 0) cocinaNiv[c.id] = n; });
  MEJORAS_COCINA.forEach((c) => { if (c.requiere && !cocinaNiv[c.requiere]) delete cocinaNiv[c.id]; });
  nMesas = Math.max(MESAS_BASE.length, Math.min(MESAS_TODAS.length, Math.floor(num(d.nMesas)) || MESAS_BASE.length));
  for (let i = MESAS_BASE.length; i < nMesas; i++) mesas.push(crearMesa(MESAS_TODAS[i]));
  (Array.isArray(d.mesas) ? d.mesas : []).forEach((s) => {
    const m = s && mesas.find((x) => x.id === s.id);
    if (m && s.mejoras) MEJORAS_MESA.forEach((c) => {
      const v = Math.max(0, Math.floor(num(s.mejoras[c.id] !== undefined ? s.mejoras[c.id] : s.mejoras[c.viejo])));
      // formato nuevo: ya es el nivel; formato viejo: era el número de mejoras (los elementos que ya venían puestos suman 1 nivel)
      m.mejoras[c.id] = Math.max(c.inicial, Math.min(nivMax(c), s.nv === MESA_NV ? v : v + c.inicial));
    });
    if (m && s.mejoras) m.premios = s.premios === undefined ? premiosLogrados(m) : Math.max(0, Math.min(PREMIOS_MESA.length, Math.floor(num(s.premios)))); // partidas sin este dato: no se regalan premios de golpe
  });
  // Terrenos: solo manzanas de pasto, sin repetir y pegadas a lo que ya es tuyo (un dato raro no deja terrenos «flotando»). Las partidas viejas guardaban un solo «lote».
  const pedidos = Array.isArray(d.lotes) ? d.lotes.filter((k) => typeof k === "string") : [];
  if (d.lote === "izq") pedidos.push("-1,0"); else if (d.lote === "atras") pedidos.push("0,-1");
  lotes = [];
  for (let hay = true; hay && lotes.length < TERRENO_PRECIOS.length;) {
    const disp = lotesDisponibles(lotes), k = pedidos.find((q) => disp.includes(q));
    hay = !!k;
    if (k) lotes.push(k);
  }
  terreno2 = lotes.length > 0;
  puerta2 = terreno2 && !!d.puerta2;
  { // habitaciones: ahora cada una tiene su lugar fijo (las posiciones guardadas en partidas de antes se ignoran)
    banioComprado = d.banio === undefined ? true : d.banio === true; // las partidas de antes del cambio ya tenían baño
    KX = 0; BX = 0;
    recalcHab();
    habsExtra = {}; // habitaciones nuevas y decoraciones: solo las válidas
    if (d.habs && typeof d.habs === "object") {
      for (const id of Object.keys(HAB_NUEVAS)) if (num(d.habs[id]) > 0) habsExtra[id] = LUGARES[id].x0;
    }
    ponerHabsIniciales(); // las partidas de antes no tenían oficina ni sala de generadores: se les construyen (si no cabe la oficina, las compras siguen en la tienda)
    generadores = habsExtra.generadores === undefined ? 0 : Math.max(0, Math.min(GENERADOR_PRECIOS.length, Math.floor(num(d.generadores)))); // sin la sala no hay generadores
    decos = Array.isArray(d.decos) ? DECORACIONES.map((q) => q.id).filter((id) => d.decos.includes(id)) : [];
  }
  nEstac = Math.max(ESTAC_INICIALES, Math.min(CAJONES.length, Math.floor(num(d.nEstac)) || ESTAC_INICIALES));
  paginaWeb = d.paginaWeb === true;
  ANUNCIOS.forEach((a) => { const fin = d.anuncios && typeof d.anuncios === "object" ? Math.max(0, num(d.anuncios[a.id])) : 0; if (fin > reloj) anuncios[a.id] = fin; });
  const rs = Array.isArray(d.receps) ? d.receps : [], ms = Array.isArray(d.meseros) ? d.meseros : [];
  [0, 1].forEach((k) => {
    const nr = Math.min(RECEP_TIEMPOS_MS.length, Math.floor(num(rs[k])));
    if (nr > 0 && (k === 0 || (puerta2 && receps[0]))) receps[k] = { nivel: nr, g: null, t0: 0, emoji: k ? "👩‍💼" : "🧑‍💼" };
    const nm = Math.min(MESERO_VEL.length, Math.floor(num(ms[k])));
    if (nm > 0 && (k === 0 || meseros[0])) {
      const post = k ? MESERO_POST2 : MESERO_POST;
      const ent = nuevaEnt(k ? "🤵‍♀️" : "🤵", post[0], post[1]);
      ent.vel = MESERO_VEL[nm - 1];
      meseros[k] = { nivel: nm, ocupado: false, ent, post };
    }
  });
}
function leerRecord() { try { return Number(localStorage.getItem(KEY_RECORD)) || 0; } catch (e) { return 0; } }
function actualizar() {
  $("dinero").textContent = fmt(dinero);
  $("energia").textContent = ENERGIA_USADA + "/" + energiaTotal();
  const ne = $("numEmpleados"); // total de empleados contratados (recepcionistas, cocineros y meseros)
  if (ne) ne.textContent = receps.filter(Boolean).length + (cocinero ? 1 : 0) + (cocinero2 ? 1 : 0) + (limpiador ? 1 : 0) + meseros.filter(Boolean).length;
  guardarPartida(); // autoguardado: cobros y compras pasan por aquí
  $("record").textContent = fmt(leerRecord());
  if (!$("tienda").hidden) pintarTienda();
  if (menuMesaEl && !menuMesaEl.hidden) pintarMenuMesa();
}

// ----- Personal de limpieza: llega a las 6:00 AM, recorre el pasillo y se va a las 9:00 AM -----
function turnoLimpieza() {
  const turno = limpiador && enTurno("limpieza");
  const P = PUERTAS[0];
  if (turno && !limpEnt) {
    const e = nuevaEnt("🧑‍🔧", P.salida[P.salida.length - 1][0], P.salida[P.salida.length - 1][1]);
    limpEnt = e;
    const g = gen;
    (async () => {
      await ir(e, [...P.salida.slice().reverse(), P.entrada, [HALL_X, 185]]);
      while (limpEnt === e && !e.saliendo && g === gen) { // va y viene entre los dos lugares del pasillo, barriendo
        await ir(e, [MESERO_POST2]); await esp(1500);
        if (limpEnt !== e || e.saliendo || g !== gen) return;
        await ir(e, [MESERO_POST]); await esp(1500);
      }
    })();
  } else if (!turno && limpEnt && !limpEnt.saliendo) {
    const e = limpEnt, g = gen;
    e.saliendo = true;
    ir(e, [[HALL_X, 185], P.entrada, ...P.salida]).then(() => { if (g === gen) { quitar(e); if (limpEnt === e) limpEnt = null; } });
  }
}

// ----- Personas que caminan -----
function nuevaEnt(emoji, x, y) {
  const e = { emoji, x, y, ruta: [], fin: null, lleva: false };
  ents.push(e);
  return e;
}
function quitar(e) { const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }
// Camina por los puntos de «ruta» y se resuelve al llegar al último
function ir(e, ruta) {
  return new Promise((res) => {
    e.ruta = ruta.map((p) => [p[0], p[1]]);
    e.fin = res;
    if (!e.ruta.length) { e.fin = null; res(); }
  });
}
function globo(x, y, texto, ms) { globos.push({ x, y, texto, hasta: ahora() + ms }); }

// ----- Sillas y rutas -----
function silla(m, tipo) { // centro de la banca de arriba o de abajo de la mesa
  return { x: m.cx, y: m.cy + (tipo === "arriba" ? -48 : 48) };
}
function asiento(m, i) { // dónde se sienta la persona i (0 a 3): 2 por banca; la 0 y la 1 se sientan al fondo (lejos del pasillo) y la 2 y la 3 junto al pasillo
  const lado = m.cx < HALL_X ? 1 : -1, tipo = ORDEN_SILLAS[i], b = silla(m, tipo);
  return { x: b.x + (i < 2 ? -1 : 1) * lado * ASIENTO_SEP, y: b.y, tipo };
}
// Camino desde la recepción hasta el lugar i de la mesa m (siempre sale del pasillo, sin cruzar mesas)
function rutaIda(m, i, P = PUERTAS[0]) {
  const s = asiento(m, i), E = P.entrada;
  if (m.ext) { // mesas de las columnas de afuera: por el pasillo de arriba (o el de abajo para la banca de abajo)
    const y = s.tipo === "abajo" ? m.cy + 75 : m.cy - 70;
    return [E, [HALL_X, y], [s.x, y], [s.x, s.y]];
  }
  return [E, [HALL_X, s.y], [s.x, s.y]];
}

// ----- Llegada de clientes (al azar) y atención en la recepción -----
const azar = (a, b) => a + Math.random() * (b - a);
const posEspera = (n, i, y) => [HALL_X + (i - (n - 1) / 2) * 34, y];

// Un grupo llega a la recepción: la recepcionista tarda 10 s en atenderlo y, si no hay mesa, se va
async function llegar(n, cajon = null) { // cajon: lugar de estacionamiento si vienen en auto (esos ya se contaron en activos al reservar el lugar)
  if (!cajon) activos++;
  // Puerta por la que llegan: al azar entre las abiertas que tengan lugar de espera (la de atrás solo existe si la compraste)
  const abiertas = puerta2 ? [0, 1] : [0];
  const conLugar = abiertas.filter((p) => SLOTS.some((s, k) => s.p === p && !recepcion[k]));
  const opciones = conLugar.length ? conLugar : abiertas;
  const pu = cajon ? (cajon.lado === "a" && puerta2 ? 1 : 0) : opciones[Math.floor(Math.random() * opciones.length)], P = PUERTAS[pu];
  const camino = cajon ? caminoAcera(cajon, pu) : [];      // a pie desde el auto hasta la puerta
  const origen = cajon ? cajon.acera : P.spawn;
  const clientes = Array.from({ length: n }, () => {
    const c = nuevaEnt(CARAS[Math.floor(Math.random() * CARAS.length)], origen[0], origen[1]);
    if (cajon) c.cajon = cajon;
    return c;
  });
  let slot = SLOTS.findIndex((s, k) => s.p === pu && !recepcion[k]), desdeFuera = false;

  if (slot < 0) { // los lugares de espera de esa puerta están ocupados: esperan afuera su turno (sin enojarse ni irse)
    desdeFuera = true;
    await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...camino, posEspera(n, i, P.llenoY)]); }));
    while ((slot = SLOTS.findIndex((s, k) => s.p === pu && !recepcion[k])) < 0) await esp(250);
  }

  const g = { clientes, n, slot, pu, y: SLOTS[slot].y, esperando: false, desde: 0, res: null };
  recepcion[slot] = g;
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...(desdeFuera ? [] : camino), posEspera(n, i, g.y)]); }));

  // La recepcionista tarda TIEMPO_RECEP_MS en atenderlos y ver si hay mesa (se resuelve en cuadro())
  const asignadas = await esperarAtencion(g);
  if (!asignadas) { await irseEnojados(g, "¡No hay mesa!"); return; }

  recepcion[slot] = null;
  if (asignadas.length > 1) activos += asignadas.length - 1; // cada mesa atiende a su parte del grupo y descuenta 1 al terminar
  await Promise.all(asignadas.map(async ({ mesa, clientes: cs }) => {
    await Promise.all(cs.map(async (c, i) => { await esp(i * 350); await ir(c, rutaIda(mesa, i, P)); }));
    await atender(cs.length, cs, mesa, pu);
  }));
}

// Se resuelve con las mesas asignadas (o con null si no hay) cuando la recepcionista termina de atender al grupo (se revisa en cuadro())
function esperarAtencion(g) {
  return new Promise((res) => { g.desde = reloj; g.esperando = true; g.res = res; });
}
// Pasaron TIEMPO_RECEP_MS: si hay cocinero en turno y mesas libres para todos (cada mesa pequeña admite CAPACIDAD_MESA personas: un grupo de 4 necesita 2 mesas),
// les da mesa al azar y cobra la entrada a cada uno; si no, se van. Se resuelve con una lista [{ mesa, clientes }] (una por mesa) o con null.
function resolverRecepcion(g) {
  g.esperando = false;
  const r = g.res; g.res = null;
  const cocina = hayCocinero(), libres = cocina ? mesas.filter((m) => !m.ocupada) : [], necesarias = Math.ceil(g.n / CAPACIDAD_MESA);
  if (libres.length < necesarias) {
    if (!cocina) info(cocineroContratado() ? "🍳 El cocinero ya se retiró: vuelve a las " + fmtHora(HORA_PERSONAL_LLEGA) + "." : "🍳 No hay cocinero: contrata uno en 👥 Empleados (" + dolares(PRECIO_COCINERO) + ") para poder dar mesa.");
    if (r) r(null);
    return;
  }
  for (let k = libres.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [libres[k], libres[j]] = [libres[j], libres[k]]; }
  const asignadas = libres.slice(0, necesarias).map((mesa, j) => {
    const clientes = g.clientes.slice(j * CAPACIDAD_MESA, (j + 1) * CAPACIDAD_MESA);
    mesa.ocupada = true;
    mesa.clientes = clientes;
    return { mesa, clientes };
  });
  const ids = asignadas.map((a) => a.mesa.id).join(" y ");
  globo(HALL_X, g.y, (asignadas.length > 1 ? "Mesas " : "Mesa ") + ids + " 👍", 1500);
  cobrar(g.n * ENTRADA_POR_CLIENTE, HALL_X, g.y, gen);
  info("La recepcionista les dio " + (asignadas.length > 1 ? "las mesas " : "la mesa ") + ids + ": pagaron " + dolares(g.n * ENTRADA_POR_CLIENTE) + " de entrada.");
  if (r) r(asignadas);
}
// Cobra «monto» (entra a tu dinero, a lo ganado y al récord) y muestra la moneda flotando en (x, y). Si la partida ya cambió (miGen), no cobra nada.
function cobrar(monto, x, y, miGen) {
  if (miGen !== gen || !(monto > 0)) return;
  dinero += monto; ganado += monto;
  if (ganado > leerRecord()) { try { localStorage.setItem(KEY_RECORD, String(ganado)); } catch (e) {} } // sin final: el récord se guarda en cuanto lo superas
  monedas.push({ x, y, t0: ahora(), monto });
  actualizar();
  enviarPuntos(false);
}
// El grupo se va de la recepción sin entrar, enojado, y no paga
async function irseEnojados(g, motivo) {
  perdidos += g.n;
  g.esperando = false;
  g.clientes.forEach((c) => (c.enojado = true));
  globo(HALL_X, g.y, "😡 " + motivo, 1800);
  info("Un grupo de " + g.n + (g.n === 1 ? " cliente" : " clientes") + " se fue enojado.");
  await esp(1200);
  if (g.slot !== undefined) recepcion[g.slot] = null;
  await Promise.all(g.clientes.map(async (c, i) => {
    await esp(i * 200);
    await ir(c, PUERTAS[g.pu].irse(c));
    await despedir(c, g.pu);
  }));
  activos--;
}

// ms que tarda la cocina en preparar un pedido de n personas con el cocinero actual
// Los dos cocineros trabajan juntos: sus velocidades (1 / factor) se suman. Con uno solo queda igual que antes; con dos del mismo nivel el pedido tarda la mitad.
const velCocina = () => (cocinero ? 1 / COCINA_FACTOR[cocinero - 1] : 0) + (cocinero2 ? 1 / COCINA_FACTOR[cocinero2 - 1] : 0); // 0 = no hay cocineros: no se cocina nada
const cocineroContratado = () => cocinero > 0 || cocinero2 > 0;
const hayCocinero = () => cocineroContratado() && enTurno("cocina"); // contratado y en su horario
const tiempoCocina = (n) => ((T_COCINA_BASE + T_COCINA_POR_CLIENTE * n) / velCocina()) * factorCocina("vel"); // estufa, horno y ventilación lo acortan

// ----- Un grupo ya sentado, de principio a fin -----
async function atender(n, clientes, mesa, pu = 0) {
  const P = PUERTAS[pu], miGen = gen; // miGen: si cambias de partida, lo que quedó pendiente de esta ya no cobra ni guarda nada
  const espera = (i) => [HALL_X + (i - (n - 1) / 2) * 34, P.pagoY]; // donde pagan, junto al escritorio de la recepción de su puerta

  // 2) Ya sentados: cada persona paga lo de SU silla (no la de la otra banca) y lo de la mesa
  clientes.forEach((c, i) => cobrar(pagoSentado(mesa, i), c.x, c.y, miGen));

  // 3) Piden y la cocina prepara
  await esp(700);
  globo(mesa.cx, mesa.cy, "📝 Pidiendo…", 1100);
  await esp(1100);
  const tCocina = Math.round(tiempoCocina(n));
  mesa.barra = { t0: ahora(), dur: tCocina, color: "#f2994a" };
  cocinando++;
  await esp(tCocina);
  cocinando--;
  mesa.barra = null;

  // 4) Platillo listo: hay que llevarlo a mano (los clientes esperan sin enojarse ni irse)
  info("¡Platillo listo para la mesa " + mesa.id + "! Tómalo en la cocina y llévalo.");
  const entregado = await esperarEntrega(mesa);
  if (!entregado) {
    perdidos += n;
    globo(mesa.cx, mesa.cy, "😡 ¡Nos vamos!", 1800);
    info("Los clientes de la mesa " + mesa.id + " se fueron sin su comida.");
    await Promise.all(clientes.map(async (c, i) => {
      await esp(i * 250);
      await ir(c, [...rutaIda(mesa, i, P).slice(0, -1).reverse(), ...P.salida]);
      await despedir(c, pu);
    }));
    cerrarGrupo(mesa);
    return;
  }
  mesa.plato = true;
  clientes.forEach((c) => cobrar(pagoComida(), c.x, c.y, miGen)); // al recibir la comida pagan por ella y por las mejoras de la cocina
  globo(mesa.cx, mesa.cy, "😋", 1200);
  mesa.barra = { t0: ahora(), dur: T_COMER, color: "#6fcf97" };
  await esp(T_COMER);
  mesa.barra = null;
  mesa.plato = false;
  globo(mesa.cx, mesa.cy, "🧾 La cuenta", 1200);
  // Terminaron de comer: se levantan todos y la mesa queda libre desde este momento (ya no se toca «mesa» para este grupo)
  mesa.ocupada = false;
  mesa.clientes = [];

  // 5) Cada quien decide a qué cuartos va (baño, cafetería, heladería, pastelería); luego todos pagan en la recepción (más lo que gastaron en cada cuarto) y se van
  await Promise.all(clientes.map(async (c, i) => {
    await esp(i * 300);
    const ida = rutaIda(mesa, i, P);
    let monto = 0; // lo gastado en las habitaciones (la entrada, la silla/mesa y la comida ya se pagaron antes)
    const visitas = elegirVisitas(); // a qué cuartos va (ninguno, uno o varios, en orden)
    if (visitas.length) {
      monto += await visitarHabs(c, ida, i, P, visitas);
      await ir(c, [espera(i)]);
    } else await ir(c, [...ida.slice(0, -1).reverse(), espera(i)]);
    if (miGen !== gen) return; // la partida cambió mientras caminaba: este cobro no es de la partida actual
    atendidos++;
    cobrar(monto, c.x, c.y, miGen);
    actualizar();
    await esp(500);
    await ir(c, P.salida);
    await despedir(c, pu);
  }));
  activos--; // la mesa ya estaba libre: solo se descuenta el grupo cuando el último sale del restaurante
}

function cerrarGrupo(mesa) {
  mesa.ocupada = false;
  mesa.clientes = [];
  activos--;
}

// ----- Entrega manual (todavía no hay mesero) -----
// Se resuelve con true si entregas el platillo a tiempo, o con false si se acaba la paciencia (se revisa en cuadro())
function esperarEntrega(m) {
  return new Promise((res) => { m.listoDesde = ahora(); m.esperando = true; m.tomado = false; m.res = res; asignarSlot(m); });
}
function entregar(m) {
  m.esperando = false; m.tomado = false; m.enojo = false;
  m.clientes.forEach((c) => (c.enojado = false));
  if (llevando === m) llevando = null;
  info("¡Entregado! La mesa " + m.id + " ya está comiendo.");
  const r = m.res; m.res = null;
  if (r) r(true);
}
// Posición del platillo de cada mesa sobre el mostrador de la cocina
// Lugares del mostrador: 6 por fila, 2 filas (caben los platillos de hasta 12 mesas). Cada platillo listo toma el primer lugar libre.
const slotXY = (i) => [36 + DXK + KX + (i % 6) * 34, 50 + Math.floor(i / 6) * 14];
function asignarSlot(m) {
  const usados = new Set(mesas.filter((x) => x !== m && x.esperando && x.slot >= 0).map((x) => x.slot));
  let i = 0; while (usados.has(i)) i++;
  m.slot = i;
}
const TOL = (1 / ESCALA - 1) * 20;                    // los objetos pequeños se tocan con un poco más de margen
const PAD_MESA = Math.min(72, 58 + (1 / ESCALA - 1) * 15); // cuánto alrededor de la mesa cuenta como tocarla (sin pisar a la mesa vecina)
const dentro = (p, x0, y0, x1, y1) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
// Del punto de pantalla al mapa plano, suponiendo que está a la altura z
function aMundo(sx, sy, z) { const u = (sx - OX) / ISO, v = ((sy + z * ESCALA - OY) * 2) / ISO; return [(u + v) / 2, (v - u) / 2]; }

function tocar(sx, sy) {
  if (pausado) return; // con la tienda abierta el juego está en pausa
  puntero = { x: sx, y: sy };
  const [wx, wy] = aMundo(sx, sy, 20);
  if (dentro(aMundo(sx, sy, 26), 335 + DX - TOL, 560 + DY - TOL, 465 + DX + TOL, 625 + DY + TOL) || dentro(aMundo(sx, sy, 0), 335 + DX - TOL, 560 + DY - TOL, 465 + DX + TOL, 650 + DY + TOL)) { abrirTienda(); return; } // mostrador de la recepción
  if (puerta2 && (dentro(aMundo(sx, sy, 26), 335 + DX - TOL, -75 - TOL, 465 + DX + TOL, -30 + TOL) || dentro(aMundo(sx, sy, 0), 335 + DX - TOL, -75 - TOL, 465 + DX + TOL, -30 + TOL))) { abrirTienda(); return; } // mostrador de la recepción 2
  const enCocina = dentro(aMundo(sx, sy, 0), ...RECT_COCINA) || dentro(aMundo(sx, sy, 30), ...RECT_COCINA);
  const RO = habsExtra.oficina === undefined ? null : rectHab("oficina");
  const enOficina = !!RO && (dentro(aMundo(sx, sy, 0), ...RO) || dentro(aMundo(sx, sy, 30), ...RO));
  const RG = habsExtra.generadores === undefined ? null : rectHab("generadores");
  const enGeneradores = !!RG && (dentro(aMundo(sx, sy, 0), ...RG) || dentro(aMundo(sx, sy, 30), ...RG));
  const mesaTocada = mesas.find((m) => dentro(aMundo(sx, sy, 22), m.cx - PAD_MESA, m.cy - PAD_MESA, m.cx + PAD_MESA, m.cy + PAD_MESA));
  if (llevando) {
    if (mesaTocada === llevando) entregar(llevando);
    else if (mesaTocada) info("Ese platillo es para la mesa " + llevando.id + ", no para la " + mesaTocada.id + ".");
    else if (enCocina) { llevando.tomado = false; info("Dejaste el platillo de la mesa " + llevando.id + " en la cocina."); llevando = null; }
    return;
  }
  const listos = mesas.filter((m) => m.esperando && !m.tomado && m.reservadoPor !== m.listoDesde); // sin los que el mesero ya va a buscar
  // Si tocas un platillo del mostrador, ese; si tocas otra parte de la cocina, el que lleva más tiempo esperando
  let elegido = listos.find((m) => { const [px, py] = iso(...slotXY(m.slot), 40); return Math.hypot(sx - px, sy - py) < Math.max(12, 28 * ESCALA); });
  if (!elegido && enCocina) elegido = listos.sort((a, b) => a.listoDesde - b.listoDesde)[0];
  if (elegido) { elegido.tomado = true; llevando = elegido; info("Llevas el platillo de la mesa " + elegido.id + ": toca esa mesa para entregarlo."); }
  else if (mesaTocada) abrirMejorasMesa(mesaTocada); // tocar una mesa (sin platillo en la mano) abre sus mejoras
  else if (enCocina) abrirCocina(); // sin platillos listos, tocar la cocina abre sus mejoras
  else if (enOficina) abrirTienda(null, false, false, false, false, true); // tocar la oficina del jefe: compras de mesas y zonas
  else if (enGeneradores) abrirTienda(null, false, false, false, false, false, true); // tocar la sala de generadores: comprar generadores
}
function posEnLienzo(e) { const r = lienzo.getBoundingClientRect(); return [((e.clientX - r.left) * CW) / r.width, ((e.clientY - r.top) * CH) / r.height]; }

// Elige a qué cuartos va un cliente al levantarse: cuántos (0 a 4, cada vez menos probable) y cuáles (al azar, pero siempre en el orden de ORDEN_VISITAS)
function elegirVisitas() {
  const otras = ORDEN_VISITAS.filter((id) => id !== "banio" && habsExtra[id] !== undefined); // el baño no cuenta aquí: lo usa el 100 % (si ya lo compraste)
  const pesos = PESOS_VISITAS.slice(0, otras.length + 1);
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0), n = 0;
  while (n < pesos.length - 1 && r >= pesos[n]) { r -= pesos[n]; n++; }
  const mezcla = otras.slice();
  for (let k = mezcla.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [mezcla[k], mezcla[j]] = [mezcla[j], mezcla[k]]; }
  const elegidas = mezcla.slice(0, n);
  return ORDEN_VISITAS.filter((id) => (id === "banio" ? banioComprado : elegidas.includes(id)));
}
const gastoHab = (id) => (id === "banio" ? COSTO_BANIO : HAB_NUEVAS[id].gasto);
// El cliente recorre los cuartos «ids» en orden y sale hacia la recepción (ahí paga todo). Devuelve lo que gastó en los cuartos. «ida» es el camino de la entrada a su silla
async function visitarHabs(c, ida, i, P = PUERTAS[0], ids = []) {
  let total = 0;
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k], via = viaHab(id), [px, py] = puertaHab(id), um = umbralHab(id);
    const venida = [...(k === 0 ? ida.slice(1, -1).reverse() : []), [HALL_X, 185]]; // de su silla (o de la habitación anterior) al pasillo
    if (id === "banio") {
      // Baño: solo entran tantos como retretes libres haya; los demás esperan en la puerta su turno
      const usados = retretes; // si la partida se reinicia, esta lista queda atrás junto con este cliente
      await ir(c, [...venida, ...via.slice(0, -1), [px, py + ((i % 4) - 1.5) * 12]]);
      let s = usados.indexOf(false);
      while (s < 0) { await esp(250); s = usados.indexOf(false); } // esperan su turno en la puerta (no se van)
      if (s >= 0) {
        usados[s] = true;
        await ir(c, [um, posRetrete(s)]);
        await esp(BANIO_USO_MS);
        total += gastoHab(id);
        usados[s] = false;
      }
    } else {
      await ir(c, [...venida, ...via, um, dentroHab(id, i)]);
      await esp(1000);
      total += gastoHab(id);
    }
    const volver = [um, ...via.slice().reverse(), [HALL_X, 185]]; // de la habitación al pasillo
    await ir(c, k === ids.length - 1 ? [...volver, P.entrada] : volver);
  }
  return total;
}

// ----- Tienda y personal -----
function abrirTienda(mesa = null, empleados = false, construir = false, anuncio = false, perfil = false, oficina = false, generador = false) { // sin mesa: la tienda de la recepción; con mesa: el panel de mejoras de esa mesa; empleados: el panel de personal
  if (menuMesaEl) menuMesaEl.hidden = true;
  vistaCocina = false;
  mesaMejora = mesa;
  vistaEmpleados = empleados;
  vistaConstruir = construir;
  vistaOficina = oficina;
  vistaGeneradores = generador;
  vistaAnuncios = anuncio;
  vistaPerfil = perfil;
  if (perfil) cargarPerfil();
  pintarTienda();
  $("tienda").hidden = false;
  ponerPausa(true);
  info(mesa ? "⏸️ Juego en pausa mientras mejoras la mesa " + mesa.id + "." : empleados ? "⏸️ Juego en pausa mientras ves a tus empleados." : anuncio ? "⏸️ Juego en pausa mientras eliges tus anuncios." : perfil ? "⏸️ Juego en pausa mientras ves tu perfil." : generador ? "⏸️ Juego en pausa mientras estás en la sala de generadores." : oficina ? "⏸️ Juego en pausa mientras estás en la oficina del jefe." : construir ? "⏸️ Juego en pausa mientras construyes." : "⏸️ Juego en pausa mientras estás en la tienda.");
}
function abrirMejorasMesa(m) { // tocar una mesa: menú con «Mejoras» y «Personal» (el juego se pausa)
  mesaMejora = m; tabMesa = "mejoras"; cosaSel = MEJORAS_MESA[0].id; vistaCocina = false;
  vistaEmpleados = false; vistaConstruir = false; vistaAnuncios = false; vistaPerfil = false; vistaOficina = false; vistaGeneradores = false;
  $("tienda").hidden = true;
  pintarMenuMesa();
  menuMesa().hidden = false;
  ponerPausa(true);
  info("⏸️ Juego en pausa mientras mejoras la mesa " + m.id + ".");
}
function abrirCocina() { // tocar la cocina: menú de mejoras de la cocina (el juego se pausa)
  mesaMejora = null; vistaEmpleados = false; vistaConstruir = false; vistaAnuncios = false; vistaPerfil = false; vistaOficina = false; vistaGeneradores = false;
  vistaCocina = true; cosaCocina = MEJORAS_COCINA[0].id;
  $("tienda").hidden = true;
  pintarMenuMesa();
  menuMesa().hidden = false;
  ponerPausa(true);
  info("⏸️ Juego en pausa mientras mejoras la cocina.");
}
function cerrarTienda() {
  const estabaEnPausa = pausado;
  vistaCocina = false; mesaMejora = null; vistaEmpleados = false; vistaConstruir = false; vistaAnuncios = false; vistaPerfil = false; vistaOficina = false; vistaGeneradores = false;
  $("tienda").hidden = true;
  if (menuMesaEl) menuMesaEl.hidden = true;
  ponerPausa(false);
  if (estabaEnPausa) info("▶️ Juego reanudado.");
}
function filaTienda(ico, nombre, p, precio, mejoras, texto, comprar, mejorar, bloqueo) {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = ico;
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = nombre;
  const d = document.createElement("small");
  const b = document.createElement("button");
  b.className = "btn";
  if (bloqueo) { // todavía no se puede comprar: se explica qué falta
    d.textContent = bloqueo;
    b.textContent = "🔒 Bloqueado";
    b.disabled = true;
  } else if (!p) {
    d.textContent = "Todavía no está contratado.";
    b.textContent = "Contratar " + dolares(precio);
    b.disabled = dinero < precio;
    b.addEventListener("click", comprar);
  } else if (p.nivel > mejoras.length) {
    d.textContent = texto(p.nivel);
    b.textContent = "Máximo";
    b.disabled = true;
  } else {
    const c = mejoras[p.nivel - 1];
    d.textContent = texto(p.nivel);
    b.textContent = "Mejorar " + dolares(c);
    b.disabled = dinero < c;
    b.addEventListener("click", mejorar);
  }
  t.append(n, d);
  fila.append(i, t, b);
  return fila;
}
// Fila de compra única (ampliar terreno, segunda puerta)
function filaSimple(ico, nombre, texto, boton, deshabilitado, accion) {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = ico;
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = nombre;
  const d = document.createElement("small");
  d.textContent = texto;
  const b = document.createElement("button");
  b.className = "btn";
  b.textContent = boton;
  b.disabled = deshabilitado;
  b.addEventListener("click", accion);
  t.append(n, d);
  fila.append(i, t, b);
  return fila;
}
// ----- Menú de la mesa (al tocarla): pestañas «Mejoras» y «Personal» -----
function menuMesa() { // se crea la primera vez que se necesita (junto con su estilo)
  if (menuMesaEl) return menuMesaEl;
  const st = document.createElement("style");
  st.textContent = [
    ".mm{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;padding:8px;background:rgba(10,6,2,.6)}",
    ".mm-caja{width:min(100%,470px);max-height:100%;overflow-y:auto;color:#fff;background:linear-gradient(#ff9440,#ffb74d 60%,#ffc870);border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.6);padding-bottom:14px}",
    ".mm-tabs{display:flex;gap:4px;padding:8px 8px 0;background:#8f2d00;border-radius:18px 18px 0 0}",
    ".mm-tab{flex:1;padding:10px 6px;font:inherit;font-size:1.05rem;font-weight:800;color:#ffd9b3;background:#b83c00;border:0;border-radius:14px 14px 0 0;cursor:pointer}",
    ".mm-tab.act{color:#fff;background:#ff9440}",
    ".mm-atras{flex:0 0 52px;font-size:1.3rem}",
    ".mm-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:10px 12px 8px}",
    ".mm-titulo{margin:0;font-size:1.9rem;font-weight:900;text-shadow:0 2px 0 rgba(120,40,0,.55)}",
    ".mm-pildora{padding:7px 12px;font-size:.85rem;font-weight:800;background:#7a2200;border-radius:999px}",
    ".mm-barra{position:relative;height:26px;margin:0 12px 10px;overflow:hidden;background:#c43e00;border-radius:8px}",
    ".mm-relleno{position:absolute;inset:0 auto 0 0;background:#12b3a6;border-radius:8px}",
    ".mm-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:900;text-shadow:0 1px 0 rgba(0,0,0,.4)}",
    ".mm-stats{display:flex;justify-content:space-around;gap:8px;margin:0 12px 12px;padding:8px 10px;font-size:1.15rem;font-weight:900;background:#5a1c00;border-radius:12px}",
    ".mm-card{margin:0 12px 14px;padding:12px;color:#5a2a12;background:#fff;border-radius:14px;box-shadow:0 3px 0 rgba(120,50,0,.35)}",
    ".mm-card-cab{display:flex;align-items:center;justify-content:space-between;gap:8px}",
    ".mm-card-nombre{font-size:1.3rem}",
    ".mm-nivel{padding:4px 18px;font-size:.8rem;font-weight:900;color:#fff;background:#5a1c00;border-radius:8px}",
    ".mm-card-cuerpo{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:8px}",
    ".mm-card-ico{font-size:3rem;line-height:1}",
    ".mm-card-txt{flex:1;min-width:140px}",
    ".mm-card-txt p{margin:0 0 8px;font-size:.85rem;font-weight:700;line-height:1.25}",
    ".mm-ingreso{display:flex;gap:18px;font-weight:900}",
    ".mm-mas{color:#1faa59}",
    ".mm-mejorar{min-width:104px;padding:8px 12px;font:inherit;font-weight:900;color:#fff;text-align:center;background:linear-gradient(#3fdc6a,#1faa59);border:0;border-radius:12px;box-shadow:0 4px 0 #148040;cursor:pointer}",
    ".mm-mejorar:disabled{background:#b7b7b7;box-shadow:0 4px 0 #8a8a8a;cursor:default}",
    ".mm-mejorar span{display:block}",
    ".mm-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px;padding:0 12px}",
    ".mm-tile{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px 6px;font:inherit;color:#fff;background:#c43e00;border:0;border-radius:12px;box-shadow:0 4px 0 #8f2d00;cursor:pointer}",
    ".mm-tile.sel{color:#5a2a12;background:#fff;box-shadow:0 4px 0 #c9a88a}",
    ".mm-tile-ico{font-size:1.9rem;line-height:1.1}",
    ".mm-tile-nom{font-size:.68rem;font-weight:800}",
    ".mm-tile-niv{padding:2px 6px;font-size:.62rem;font-weight:900;color:#fff;background:#5a1c00;border-radius:6px}",
    ".mm-tile-niv.ok{background:#1faa59}",
    ".mm-tile-niv.max{background:#d19a1f}",
    ".mm-personal{max-height:55vh;margin:0 12px;padding:4px 10px 8px;overflow-y:auto;background:#4a1a05;border-radius:14px}",
  ].join("\n");
  document.head.appendChild(st);
  menuMesaEl = document.createElement("div");
  menuMesaEl.className = "mm";
  menuMesaEl.hidden = true;
  menuMesaEl.setAttribute("role", "dialog");
  menuMesaEl.setAttribute("aria-label", "Menú de la mesa");
  menuMesaEl.addEventListener("click", (e) => { if (e.target === menuMesaEl) cerrarTienda(); }); // tocar fuera del cuadro lo cierra
  document.body.appendChild(menuMesaEl);
  return menuMesaEl;
}
function pintarMenuMesa() {
  if (vistaCocina) { pintarMenuCocina(); return; }
  const m = mesaMejora;
  if (!m) return;
  const raiz = menuMesa(), previo = raiz.firstChild ? raiz.firstChild.scrollTop : 0;
  raiz.innerHTML = "";
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const caja = el("div", "mm-caja");
  const personal = tabMesa === "personal";

  const tabs = el("div", "mm-tabs");
  const atras = el("button", "mm-tab mm-atras", "←");
  atras.setAttribute("aria-label", "Cerrar");
  atras.addEventListener("click", cerrarTienda);
  const tMejoras = el("button", "mm-tab" + (personal ? "" : " act"), "Mejoras");
  const tPersonal = el("button", "mm-tab" + (personal ? " act" : ""), "👥 Personal");
  tMejoras.addEventListener("click", () => { tabMesa = "mejoras"; pintarMenuMesa(); });
  tPersonal.addEventListener("click", () => { tabMesa = "personal"; pintarMenuMesa(); });
  tabs.append(atras, tMejoras, tPersonal);

  const cab = el("div", "mm-cab");
  cab.appendChild(el("h2", "mm-titulo", personal ? "Personal" : "Mesa " + m.id));
  if (!personal) cab.appendChild(el("span", "mm-pildora", "💵 Paga " + dolares(pagoPorCliente(m)) + " por cliente"));
  caja.append(tabs, cab);

  if (personal) {
    const stats = el("div", "mm-stats");
    stats.appendChild(el("span", null, "💰 " + dolares(dinero)));
    const lista = el("div", "mm-personal");
    pintarEmpleados(lista);
    caja.append(stats, lista);
  } else {
    const c = MEJORAS_MESA.find((x) => x.id === cosaSel) || MEJORAS_MESA[0], k = m.mejoras[c.id], max = nivMax(c), precio = c.precios[k - c.inicial];
    const pct = (sumaNiveles(m) / TOTAL_NIVELES) * 100;
    const barra = el("div", "mm-barra"), rel = el("div", "mm-relleno");
    rel.style.width = pct + "%";
    barra.append(rel, el("span", "mm-pct", "⬆ " + pct.toFixed(2) + "%"));

    const stats = el("div", "mm-stats");
    stats.append(el("span", null, "💰 " + dolares(dinero)), el("span", null, "💵 " + dolares(pagoPorCliente(m))), el("span", null, "👥 " + CAPACIDAD_MESA), el("span", null, m.premios >= PREMIOS_MESA.length ? "🎁 Todos los premios" : "🎁 " + dolares(PREMIOS_MESA[m.premios]) + " al " + Math.round(((m.premios + 1) / PREMIOS_MESA.length) * 100) + " %"));

    const tarj = el("div", "mm-card"), cab2 = el("div", "mm-card-cab");
    cab2.append(el("b", "mm-card-nombre", c.nombre), el("span", "mm-nivel", k >= max ? "Nivel: MÁX" : "Nivel: " + k));
    const cuerpo = el("div", "mm-card-cuerpo"), txt = el("div", "mm-card-txt"), ing = el("div", "mm-ingreso");
    ing.append(el("span", null, "💵 " + dolares(ingresoNivel(c, k))), el("span", "mm-mas", k < max ? "+" + dolares(ingresoNivel(c, k + 1) - ingresoNivel(c, k)) : "MÁX"));
    txt.append(el("p", null, k === 0 ? c.nombre + ": cómpralo para que cada cliente de esta mesa pague más." : c.nombre + ": mejora este elemento para aumentar el dinero recaudado en esta mesa."), ing);
    const btn = el("button", "mm-mejorar");
    btn.append(el("span", null, k >= max ? "MÁXIMO" : "💵 " + dolares(precio)), el("span", null, k >= max ? "" : k === 0 ? "COMPRAR" : "MEJORAR"));
    btn.disabled = k >= max || dinero < precio;
    btn.addEventListener("click", () => mejorarCosaMesa(m, c.id));
    cuerpo.append(el("div", "mm-card-ico", c.ico), txt, btn);
    tarj.append(cab2, cuerpo);

    const rej = el("div", "mm-rejilla");
    for (const q of MEJORAS_MESA) {
      const kk = m.mejoras[q.id], mx = nivMax(q), puede = kk < mx && dinero >= q.precios[kk - q.inicial];
      const t = el("button", "mm-tile" + (q.id === c.id ? " sel" : ""));
      t.title = q.nombre;
      t.append(el("span", "mm-tile-ico", q.ico), el("span", "mm-tile-nom", q.nombre),
        el("span", "mm-tile-niv" + (kk >= mx ? " max" : puede ? " ok" : ""), kk >= mx ? "MÁX" : (puede ? "⬆ " : "") + "Nivel: " + kk));
      t.addEventListener("click", () => { cosaSel = q.id; pintarMenuMesa(); });
      rej.appendChild(t);
    }
    caja.append(barra, stats, tarj, rej);
  }
  raiz.appendChild(caja);
  caja.scrollTop = previo;
}
// Efecto de una cosa de la cocina en el nivel n, en texto corto
function efTxtCocina(c, n) {
  if (n <= 0) return "—";
  const v = efCoc(c, n);
  return c.tipo === "vel" ? "⚡ ×" + (1 / v).toFixed(2) : c.tipo === "pago" ? "💵 +" + dolares(v) : "⏳ +" + Math.round((v - 1) * 100) + " %";
}
function pintarMenuCocina() {
  const raiz = menuMesa(), previo = raiz.firstChild ? raiz.firstChild.scrollTop : 0;
  raiz.innerHTML = "";
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const caja = el("div", "mm-caja");
  const tabs = el("div", "mm-tabs");
  const atras = el("button", "mm-tab mm-atras", "←");
  atras.setAttribute("aria-label", "Cerrar");
  atras.addEventListener("click", cerrarTienda);
  tabs.append(atras, el("button", "mm-tab act", "🍳 Cocina"));
  const cab = el("div", "mm-cab");
  cab.append(el("h2", "mm-titulo", "Cocina"), el("span", "mm-pildora", "💵 +" + dolares(bonoCocina()) + " por cliente"));
  caja.append(tabs, cab);

  const c = MEJORAS_COCINA.find((x) => x.id === cosaCocina) || MEJORAS_COCINA[0];
  const n = nivCoc(c.id), max = c.precios.length + 1, tiene = n > 0, tope = n >= max;
  const falta = c.requiere && !nivCoc(c.requiere) ? MEJORAS_COCINA.find((x) => x.id === c.requiere) : null; // lo que hay que tener antes
  const precio = tope ? 0 : tiene ? c.precios[n - 1] : c.compra;
  const totalNiv = MEJORAS_COCINA.reduce((t, q) => t + q.precios.length + 1, 0) - 1, pct = ((MEJORAS_COCINA.reduce((t, q) => t + nivCoc(q.id), 0) - 1) / (totalNiv)) * 100;
  const barra = el("div", "mm-barra"), rel = el("div", "mm-relleno");
  rel.style.width = pct + "%";
  barra.append(rel, el("span", "mm-pct", "⬆ " + pct.toFixed(2) + "%"));

  const stats = el("div", "mm-stats");
  stats.append(el("span", null, "💰 " + dolares(dinero)), el("span", null, "⏱️ " + (cocineroContratado() ? (tiempoCocina(4) / 1000).toFixed(1) + " s" : "—")), el("span", null, "⏳ ×" + factorCocina("paciencia").toFixed(2)));

  const tarj = el("div", "mm-card"), cab2 = el("div", "mm-card-cab");
  cab2.append(el("b", "mm-card-nombre", c.nombre), el("span", "mm-nivel", !tiene ? "Sin comprar" : tope ? "Nivel: MÁX" : "Nivel: " + n));
  const cuerpo = el("div", "mm-card-cuerpo"), txt = el("div", "mm-card-txt"), ing = el("div", "mm-ingreso");
  if (!tiene) ing.append(el("span", null, "Al comprarlo:"), el("span", "mm-mas", efTxtCocina(c, 1)));
  else ing.append(el("span", null, efTxtCocina(c, n)), el("span", "mm-mas", tope ? "MÁX" : "→ " + efTxtCocina(c, n + 1)));
  txt.append(el("p", null, c.desc + (c.tipo === "vel" ? " (×2.00 = la mitad de tiempo)" : "")), ing);
  if (falta) txt.append(el("p", null, "🔒 Primero compra: " + falta.nombre.toLowerCase() + "."));
  const btn = el("button", "mm-mejorar");
  btn.append(el("span", null, tope ? "MÁXIMO" : falta ? "🔒" : "💵 " + dolares(precio)), el("span", null, tope || falta ? "" : tiene ? "MEJORAR" : "COMPRAR"));
  btn.disabled = tope || !!falta || dinero < precio;
  btn.addEventListener("click", () => mejorarCocina(c.id));
  cuerpo.append(el("div", "mm-card-ico", c.ico), txt, btn);
  tarj.append(cab2, cuerpo);

  const rej = el("div", "mm-rejilla");
  for (const q of MEJORAS_COCINA) {
    const nq = nivCoc(q.id), tq = nq >= q.precios.length + 1, bq = !!(q.requiere && !nivCoc(q.requiere)), pq = nq > 0 ? q.precios[nq - 1] : q.compra;
    const puede = !tq && !bq && dinero >= pq;
    const t = el("button", "mm-tile" + (q.id === c.id ? " sel" : ""));
    t.title = q.nombre;
    t.append(el("span", "mm-tile-ico", q.ico), el("span", "mm-tile-nom", q.nombre),
      el("span", "mm-tile-niv" + (tq ? " max" : puede ? " ok" : ""), tq ? "MÁX" : bq ? "🔒" : nq === 0 ? (puede ? "⬆ " : "") + "Comprar" : (puede ? "⬆ " : "") + "Nivel: " + nq));
    t.addEventListener("click", () => { cosaCocina = q.id; pintarMenuCocina(); });
    rej.appendChild(t);
  }
  caja.append(barra, stats, tarj, rej);
  raiz.appendChild(caja);
  caja.scrollTop = previo;
}
function mejorarCocina(id) {
  const c = MEJORAS_COCINA.find((x) => x.id === id), n = c ? nivCoc(id) : 0;
  if (!c || n > c.precios.length || (c.requiere && !nivCoc(c.requiere))) return;
  const precio = n === 0 ? c.compra : c.precios[n - 1];
  if (dinero < precio) return;
  dinero -= precio;
  cocinaNiv[id] = n + 1;
  info(n === 0 ? "🍳 ¡Compraste " + c.nombre.toLowerCase() + "! " + efTxtCocina(c, 1) : "🍳 Mejoraste " + c.nombre.toLowerCase() + " (nivel " + (n + 1) + "). " + efTxtCocina(c, n + 1));
  actualizar();
}
function mejorarCosaMesa(m, id) {
  const c = MEJORAS_MESA.find((x) => x.id === id), k = c && m.mejoras[id], precio = c && c.precios[k - c.inicial];
  if (!c || precio === undefined || dinero < precio) return;
  dinero -= precio;
  m.mejoras[id]++;
  let regalo = 0;
  while (m.premios < premiosLogrados(m)) regalo += PREMIOS_MESA[m.premios++]; // regalo(s) por llegar a un nuevo 20 %
  if (regalo) { dinero += regalo; globo(m.cx, m.cy, "🎁 +" + dolares(regalo), 2500); }
  info("Mesa " + m.id + ": " + (k === 0 ? "compraste " : "mejoraste ") + c.nombre.toLowerCase() + " (nivel " + m.mejoras[id] + " de " + nivMax(c) + "). Ahora cada cliente de esa mesa paga " + dolares(pagoPorCliente(m)) + "." + (regalo ? " 🎁 ¡Premio de " + dolares(regalo) + " por avanzar en la mesa!" : ""));
  actualizar();
}
function pintarTienda() {
  $("tiendaDinero").textContent = fmt(dinero);
  const lista = $("tiendaLista");
  lista.style.cssText = "max-height:52vh;overflow-y:auto"; // con tantas filas, la lista se desplaza
  lista.innerHTML = "";
  if (vistaEmpleados) { pintarEmpleados(lista); return; }
  if (vistaConstruir) { pintarConstruir(lista); return; }
  if (vistaOficina) { pintarOficina(lista); return; }
  if (vistaGeneradores) { pintarGeneradores(lista); return; }
  if (vistaAnuncios) { pintarAnuncios(lista); return; }
  if (vistaPerfil) { pintarPerfil(lista); return; }
  $("tiendaTitulo").textContent = "🛒 Tienda";
  const hint = document.createElement("small");
  hint.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  hint.textContent = "El personal (cocineros, meseros y recepcionistas) está en el botón 👥 Empleados, arriba a la derecha." + (habsExtra.oficina !== undefined ? " Las mesas, el baño, la heladería, la cafetería y la pastelería se compran en la 🕴️ oficina del jefe: tócala en el restaurante." : "");
  lista.append(
    hint,
    ...(habsExtra.oficina === undefined ? [filaMesaNueva()] : []), // con oficina, las mesas se compran ahí
    filaTerreno(),
    filaSimple("🚪", "Segunda puerta",
      puerta2 ? "Los clientes también llegan por la puerta de atrás, con su propia fila y mostrador." : terreno2 ? "Una entrada nueva en el terreno de atrás: doble de lugares de espera." : "Se desbloquea al ampliar el terreno.",
      puerta2 ? "Comprada" : terreno2 ? "Comprar " + dolares(PRECIO_PUERTA2) : "🔒 Bloqueado", puerta2 || !terreno2 || dinero < PRECIO_PUERTA2, comprarPuerta2),
    filaEstac()
  );
}
// Panel «👤 Perfil»: tu sesión de Google, tus puntos y cómo vas en esta partida
async function cargarPerfil() {
  perfilDatos = null;
  if (!J || !usuario) return;
  try { perfilDatos = await J.leerPerfil(); } catch (e) {}
  if (vistaPerfil && !$("tienda").hidden) pintarTienda();
}
function pintarPerfil(lista) {
  $("tiendaTitulo").textContent = "👤 Perfil";
  const fila = (ico, texto, extra) => {
    const f = document.createElement("div");
    f.className = "tienda-fila";
    const i = document.createElement("span");
    i.className = "ico";
    if (typeof ico === "string") i.textContent = ico; else i.appendChild(ico);
    const t = document.createElement("div");
    t.className = "txt";
    t.append(...texto);
    f.append(i, t);
    if (extra) f.appendChild(extra);
    return f;
  };
  const negrita = (x) => { const b = document.createElement("b"); b.textContent = x; return b; };
  const peq = (x) => { const d = document.createElement("small"); d.textContent = x; return d; };
  const boton = (txt, fn) => { const b = document.createElement("button"); b.className = "btn"; b.textContent = txt; b.disabled = !J; b.addEventListener("click", fn); return b; };
  if (!usuario) {
    lista.appendChild(fila("👤", [negrita("Jugador sin sesión"), peq(J ? "Entra con Google para que tus puntos se guarden en tu perfil. Sin sesión el juego funciona igual, pero no se suman puntos." : "Conectando…")],
      boton("Entrar con Google", () => J.entrar().catch((e) => alert(e.message)))));
  } else {
    let avatar = "👤";
    if (usuario.photoURL) { avatar = document.createElement("img"); avatar.src = usuario.photoURL; avatar.alt = ""; avatar.referrerPolicy = "no-referrer"; avatar.style.cssText = "width:40px;height:40px;border-radius:50%;object-fit:cover;display:block"; }
    lista.appendChild(fila(avatar, [negrita(usuario.displayName || "Jugador"), peq(perfilDatos ? "Puntos de todos los juegos: " + fmt(perfilDatos.total || 0) : "Puntos de todos los juegos: …")], boton("Salir", () => J.salir())));
  }
  lista.appendChild(fila("🏆", [negrita("Esta partida"), peq("💰 Ganado: " + dolares(ganado) + " · Récord: " + dolares(leerRecord()) + " · ⏱️ Jugando " + fmtTiempo(Math.floor(reloj / 1000)))]));
  lista.appendChild(fila("🍽️", [negrita("Clientes"), peq("Atendidos: " + atendidos + " · Perdidos: " + perdidos + " · 🚗 Autos sin lugar: " + autosPerdidos)]));
}
// Panel «📢 Anuncios»: anuncios temporales y página web (compra única)
function pintarAnuncios(lista) {
  $("tiendaTitulo").textContent = "📢 Anuncios";
  const res = document.createElement("small");
  res.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  const b = Math.round(bonoClientes() * 100);
  res.textContent = (b ? "Ahora llegan " + b + " % más clientes." : "Todavía no tienes anuncios activos.") + " Cada anuncio dura " + fmtTiempo(ANUNCIO_DURACION_MS / 1000) + " de juego y se suma a los demás.";
  lista.appendChild(res);
  for (const a of ANUNCIOS) {
    const activo = anuncioActivo(a);
    lista.appendChild(filaSimple(a.ico, a.nombre,
      "+" + Math.round(a.bono * 100) + " % de clientes durante " + fmtTiempo(ANUNCIO_DURACION_MS / 1000) + (activo ? " · activo, quedan " + fmtTiempo(Math.ceil((anuncios[a.id] - reloj) / 1000)) + " (si lo compras otra vez se suma)" : "") + ".",
      (activo ? "Renovar " : "Comprar ") + dolares(a.precio), dinero < a.precio, () => comprarAnuncio(a.id)));
  }
  lista.appendChild(filaSimple("🌐", "Página web",
    paginaWeb ? "Tu página web atrae +" + Math.round(BONO_WEB * 100) + " % de clientes para siempre." : "Compra única: +" + Math.round(BONO_WEB * 100) + " % de clientes para siempre.",
    paginaWeb ? "Comprada" : "Comprar " + dolares(PRECIO_WEB), paginaWeb || dinero < PRECIO_WEB, comprarPaginaWeb));
}
function comprarAnuncio(id) {
  const a = ANUNCIOS.find((x) => x.id === id);
  if (!a || dinero < a.precio) return;
  dinero -= a.precio;
  anuncios[id] = Math.max(anuncios[id] || 0, reloj) + ANUNCIO_DURACION_MS;
  info("📢 ¡" + a.nombre + "! +" + Math.round(a.bono * 100) + " % de clientes durante " + fmtTiempo(ANUNCIO_DURACION_MS / 1000) + ". Ahora llegan " + Math.round(bonoClientes() * 100) + " % más clientes.");
  actualizar();
}
function comprarPaginaWeb() {
  if (paginaWeb || dinero < PRECIO_WEB) return;
  dinero -= PRECIO_WEB;
  paginaWeb = true;
  info("🌐 ¡Ya tienes página web! +" + Math.round(BONO_WEB * 100) + " % de clientes para siempre. Ahora llegan " + Math.round(bonoClientes() * 100) + " % más clientes.");
  actualizar();
}
// Panel «Empleados»: primero los contratados (con su nivel y su botón de mejora) y luego los que todavía se pueden contratar
// Panel «🏗️ Construir»: habitaciones nuevas y decoraciones
function comprarHab(id) {
  const h = HAB_NUEVAS[id];
  if (habsExtra[id] !== undefined || dinero < h.precio) return;
  dinero -= h.precio;
  habsExtra[id] = LUGARES[id].x0; // cada habitación tiene su lugar fijo
  armarFondo();
  info("🏗️ ¡Compraste " + h.nombre + "! " + (h.sinVisitas ? "Los clientes no pasan por ahí: es solo para " + h.soloPara + "." : "Algunos clientes pasarán por ahí al terminar de comer y gastarán " + dolares(h.gasto) + " cada vez.") + " Ya está en su lugar, como en el mapa.");
  actualizar();
}
function comprarDeco(id) {
  const d = DECORACIONES.find((q) => q.id === id);
  if (!d || decos.includes(id) || dinero < d.precio) return;
  dinero -= d.precio;
  decos.push(id);
  info("🎨 ¡Compraste " + d.nombre.toLowerCase() + "! Ahora cada cliente paga " + dolares(d.bono) + " más.");
  actualizar();
}
// Fila de compra de una habitación nueva (en la oficina del jefe o en «🏗️ Construir»)
function filaHab(id) {
  const h = HAB_NUEVAS[id], tengo = habsExtra[id] !== undefined;
  return filaSimple(h.ico, h.etiqueta,
      tengo ? (h.sinVisitas ? "Comprada: es solo para " + h.soloPara + ", los clientes no pasan por aquí." : "Comprada: cada cliente que pasa gasta " + dolares(h.gasto) + ".")
        : (h.sinVisitas ? "Solo para " + h.soloPara + ": los clientes no pasan por aquí." : "Cada cliente que pasa gasta " + dolares(h.gasto) + "."),
      tengo ? "Comprada" : "Comprar " + dolares(h.precio), tengo || dinero < h.precio, () => comprarHab(id));
}
// Fila de compra del baño (ya no viene hecho: se compra por PRECIO_BANIO)
function filaBanio() {
  return filaSimple("🚻", "Baño",
    banioComprado ? "Comprado: todos los clientes lo usan al terminar de comer y cada uno paga " + dolares(COSTO_BANIO) + ". Tiene " + RETRETES + " retretes; cada uso tarda " + BANIO_USO_MS / 1000 + " s y quien no encuentra lugar espera su turno."
      : "Todos los clientes irán al baño al terminar de comer y pagarán " + dolares(COSTO_BANIO) + " cada vez. Tiene " + RETRETES + " retretes; cada uso tarda " + BANIO_USO_MS / 1000 + " s.",
    banioComprado ? "Comprado" : "Comprar " + dolares(PRECIO_BANIO), banioComprado || dinero < PRECIO_BANIO, comprarBanio);
}
function comprarBanio() {
  if (banioComprado || dinero < PRECIO_BANIO) return;
  dinero -= PRECIO_BANIO;
  banioComprado = true; BX = 0; recalcHab();
  armarFondo();
  info("🚻 ¡Compraste el baño! Todos los clientes irán al terminar de comer y pagarán " + dolares(COSTO_BANIO) + " cada vez." + " Está a la izquierda, debajo de la sala de generadores.");
  actualizar();
}
// Panel de la «⚡ sala de generadores» (se abre tocándola): aquí se compran los generadores que dan energía
function pintarGeneradores(lista) {
  $("tiendaTitulo").textContent = "⚡ Sala de generadores";
  const nota = document.createElement("small");
  nota.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  nota.textContent = "Energía: usas " + ENERGIA_USADA + " de " + energiaTotal() + " disponibles. Cada generador se ve dentro de la sala.";
  const precio = GENERADOR_PRECIOS[generadores]; // undefined = ya compraste todos
  lista.append(nota, filaSimple("🟨", "Generador cuadrado",
    precio === undefined ? "Comprado: la energía disponible es " + energiaTotal() + "." : "Sube la energía disponible de " + energiaTotal() + " a " + (energiaTotal() + ENERGIA_POR_GENERADOR) + ".",
    precio === undefined ? "Comprado" : "Comprar " + dolares(precio), precio === undefined || dinero < precio, comprarGenerador));
}
function comprarGenerador() {
  const precio = GENERADOR_PRECIOS[generadores];
  if (precio === undefined || dinero < precio || habsExtra.generadores === undefined) return;
  const antes = energiaTotal();
  dinero -= precio;
  generadores++;
  info("⚡ ¡Compraste un generador! La energía disponible subió de " + antes + " a " + energiaTotal() + ".");
  actualizar();
}
// Panel de la «🕴️ oficina del jefe» (se abre tocándola): aquí se compran las mesas y las zonas del restaurante.
// Las filas con el botón gris «Próximamente» ya se ven con su información, pero todavía no hacen nada (se irán activando una por una).
function filaPronto(ico, nombre, texto, boton) { return filaSimple(ico, nombre, texto, boton, true, () => {}); }
function pintarOficina(lista) {
  $("tiendaTitulo").textContent = "🕴️ Oficina del jefe";
  const seccion = (titulo) => {
    const b = document.createElement("b");
    b.style.cssText = "display:block;margin:10px 0 0;padding-top:6px;border-top:2px solid var(--acento)";
    b.textContent = titulo;
    return b;
  };
  const nota = document.createElement("small");
  nota.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  nota.textContent = "Aquí se compran las mesas y las zonas del restaurante. Lo que dice «Próximamente» todavía no se puede comprar.";
  lista.append(nota);

  // Renovación
  lista.append(seccion("🏆 Renovación"),
    filaPronto("🥈", "Restaurante de Plata", "Haz crecer tu restaurante aún más desbloqueando la expansión de Plata. Progreso 0/5 · Gana 10x · Requiere ⭐5 · Tiempo: 1 h", "Renovar"));

  // Comedor
  lista.append(seccion("🍽️ Comedor"),
    filaMesaNueva(),
    filaPronto("🪑", "Mesa grande", "Una mesa grande para clientes de grandes bolsillos. 0/4 · Requiere ⚡0", dolares(3500)),
    filaPronto("⛱️", "Mesa exterior", "¡Una mesa exterior, más tranquila y con una linda vista! 0/2 · Requiere ⚡0", dolares(35000)));

  // Zonas
  lista.append(seccion("🏠 Zonas"),
    filaPronto("🥤", "Bar de malteadas", "¡No hay nada como una buena malteada después de una hamburguesa! Requiere ⚡10", dolares(10000)),
    filaBanio(),
    filaHab("heladeria"), filaHab("cafeteria"), filaHab("pasteleria"),
    filaPronto("🅿️", "Estacionamiento", "Los clientes pueden dejar sus autos aquí mientras comen, ¡y tú ganas dinero! (Por ahora se compra en el mostrador 🛒.)", "Próximamente"),
    filaPronto("🧹", "Limpieza", "Aquí es donde los limpiadores guardan sus elementos de trabajo. Ya está construida, debajo de la oficina del jefe.", "✓ Construida"),
    filaPronto("🍳", "Cocina", "Aquí es donde ocurre la magia; mejórala para aumentar la calidad de tu comida. Ya está construida: tócala en el restaurante para mejorarla.", "✓ Construida"));
}
function pintarConstruir(lista) {
  $("tiendaTitulo").textContent = "🏗️ Construir";
  const seccion = (titulo, texto) => {
    const d = document.createElement("div");
    d.style.cssText = "margin:8px 0 2px";
    const b = document.createElement("b");
    b.textContent = titulo;
    const s = document.createElement("small");
    s.style.cssText = "display:block;color:var(--suave)";
    s.textContent = texto;
    d.append(b, s);
    return d;
  };
  lista.appendChild(seccion("🏠 Habitaciones", "Cada una tiene su lugar fijo en el restaurante. El baño se construye aquí (debajo de la sala de generadores); la heladería, la cafetería y la pastelería se compran en la 🕴️ oficina del jefe (tócala en el restaurante)."));
  lista.appendChild(filaBanio());
  for (const id of Object.keys(HAB_NUEVAS)) {
    const h = HAB_NUEVAS[id];
    if (h.inicial || (h.enOficina && habsExtra.oficina !== undefined)) continue; // esas se compran (o ya vienen hechas) en la oficina del jefe
    lista.appendChild(filaHab(id));
  }
  lista.appendChild(seccion("🎨 Decoraciones", "Cada una que compres suma dinero a lo que paga CADA cliente, en todas las mesas."));
  for (const d of DECORACIONES) {
    const tengo = decos.includes(d.id);
    lista.appendChild(filaSimple(d.ico, d.nombre, (tengo ? "Comprada: " : "") + "cada cliente paga " + dolares(d.bono) + " más.", tengo ? "Comprada" : "Comprar " + dolares(d.precio), tengo || dinero < d.precio, () => comprarDeco(d.id)));
  }
}
function pintarEmpleados(lista) {
  $("tiendaTitulo").textContent = "👥 Empleados";
  const txtRecep = (n) => "Nivel " + n + " de " + (RECEP_PRECIOS_MEJORA.length + 1) + " · atiende a cada grupo en " + (TIEMPO_RECEP_MS / 1000) + " s";
  const txtCocinero = (n) => "Nivel " + n + " de " + (COCINERO_PRECIOS_MEJORA.length + 1) + " · un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s (con todos los cocineros)";
  const txtMesero = (n) => "Nivel " + n + " de " + (MESERO_PRECIOS_MEJORA.length + 1) + " · lleva los platillos a su paso";
  const conH = (f) => (n) => f(n) + " · Horario: " + fmtHora(HORA_PERSONAL_LLEGA) + " a " + fmtHora(HORA_CIERRA); // agrega el horario a cada fila
  const filas = [
    { existe: !!receps[0], f: () => filaTienda("🧑‍💼", "Recepcionista", receps[0], PRECIO_RECEP, RECEP_PRECIOS_MEJORA, conH(txtRecep), () => contratarRecep(0), () => mejorarRecep(0)) },
    { existe: !!cocinero, f: () => filaTienda("👨‍🍳", "Cocinero", cocinero ? { nivel: cocinero } : null, PRECIO_COCINERO, COCINERO_PRECIOS_MEJORA, conH(txtCocinero), contratarCocinero, mejorarCocinero) },
    { existe: !!cocinero2, f: () => filaTienda("👩‍🍳", "Segundo cocinero", cocinero2 ? { nivel: cocinero2 } : null, PRECIO_COCINERO2, COCINERO_PRECIOS_MEJORA, conH(txtCocinero), contratarCocinero2, mejorarCocinero2,
      !cocinero ? "Primero contrata al cocinero." : "") },
    { existe: !!meseros[0], f: () => filaTienda("🤵", "Mesero", meseros[0], PRECIO_MESERO, MESERO_PRECIOS_MEJORA, conH(txtMesero), () => contratarMesero(0), () => mejorarMesero(0)) },
    { existe: !!meseros[1], f: () => filaTienda("🤵‍♀️", "Segundo mesero", meseros[1], PRECIO_MESERO2, MESERO_PRECIOS_MEJORA, conH(txtMesero), () => contratarMesero(1), () => mejorarMesero(1),
      !meseros[0] ? "Primero contrata al mesero." : "") },
    { existe: !!receps[1], f: () => filaTienda("👩‍💼", "Segunda recepcionista", receps[1], PRECIO_RECEP2, RECEP_PRECIOS_MEJORA, conH(txtRecep), () => contratarRecep(1), () => mejorarRecep(1),
      !receps[0] ? "Primero contrata a la recepcionista." : puerta2 ? "" : "Se desbloquea con la segunda puerta (se compra en la tienda, en el terreno nuevo).") },
    { existe: limpiador, f: () => filaSimple("🧹", "Limpieza", "Horario: " + fmtHora(HORA_LIMPIEZA_LLEGA) + " a " + fmtHora(HORA_LIMPIEZA_SALE) + ". Deja todo limpio antes de que llegue el resto del personal.", "Contratado", true, () => {}) },
  ];
  const titulo = (t) => { const e = document.createElement("small"); e.style.cssText = "display:block;margin:6px 0 2px;color:var(--suave);font-weight:700"; e.textContent = t; return e; };
  const hay = filas.filter((x) => x.existe), faltan = filas.filter((x) => !x.existe);
  lista.append(titulo("Contratados (" + hay.length + ")"), ...hay.map((x) => x.f()));
  if (faltan.length) lista.append(titulo("Por contratar"), ...faltan.map((x) => x.f()));
}
function contratarCocinero() {
  if (cocinero || dinero < PRECIO_COCINERO) return;
  dinero -= PRECIO_COCINERO;
  cocinero = 1;
  info("👨‍🍳 ¡Contrataste al cocinero! Ya puedes dar mesa a los clientes: un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s. Mejóralo en 👥 Empleados.");
  actualizar();
}
function contratarCocinero2() {
  if (!cocinero || cocinero2 || dinero < PRECIO_COCINERO2) return;
  dinero -= PRECIO_COCINERO2;
  cocinero2 = 1;
  info("Contrataste al segundo cocinero: cocina junto con el primero y ahora un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s. Mejóralo en 👥 Empleados.");
  actualizar();
}
function mejorarCocinero2() {
  const precio = COCINERO_PRECIOS_MEJORA[cocinero2 - 1];
  if (!cocinero2 || precio === undefined || dinero < precio) return;
  dinero -= precio;
  cocinero2++;
  info("Mejoraste al segundo cocinero (nivel " + cocinero2 + "): ahora un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s.");
  actualizar();
}
function mejorarCocinero() {
  if (!cocinero) return;
  const precio = COCINERO_PRECIOS_MEJORA[cocinero - 1];
  if (precio === undefined || dinero < precio) return;
  dinero -= precio;
  cocinero++;
  info("Mejoraste al cocinero (nivel " + cocinero + "): ahora un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s. Los pedidos que ya se están cocinando siguen igual.");
  actualizar();
}
// Fila de compra de mesas nuevas
function filaMesaNueva() {
  const lleno = nMesas >= MESAS_TODAS.length, precio = MESA_PRECIOS[nMesas - MESAS_BASE.length];
  return filaSimple("🪑", "Comprar mesa",
    lleno ? "Ya tienes las " + MESAS_TODAS.length + " mesas: el comedor está lleno." : "Tienes " + nMesas + " de " + MESAS_TODAS.length + " mesas. La nueva (mesa " + (nMesas + 1) + ") queda en el comedor, con sus 4 sillas.",
    lleno ? "Comedor lleno" : "Comprar " + dolares(precio), lleno || dinero < precio, comprarMesa);
}
function comprarMesa() {
  if (nMesas >= MESAS_TODAS.length) return;
  const precio = MESA_PRECIOS[nMesas - MESAS_BASE.length];
  if (precio === undefined || dinero < precio) return;
  dinero -= precio;
  mesas.push(crearMesa(MESAS_TODAS[nMesas]));
  nMesas++;
  info("¡Compraste la mesa " + nMesas + "! Ya pueden sentarse ahí. Tócala para mejorarla.");
  actualizar();
}
// Fila de la tienda para ampliar el terreno: un botón por cada terreno que se puede comprar ahora (los que tocan tu terreno actual)
function filaTerreno() {
  const fila = document.createElement("div");
  fila.className = "tienda-fila";
  const i = document.createElement("span");
  i.className = "ico";
  i.textContent = "🌱";
  const t = document.createElement("div");
  t.className = "txt";
  const n = document.createElement("b");
  n.textContent = "Ampliar terreno";
  const d = document.createElement("small");
  const col = document.createElement("div");
  col.style.cssText = "display:flex;flex-direction:column;gap:4px";
  const precio = precioTerreno(), total = TERRENO_PRECIOS.length + 1;
  if (precio === undefined) {
    d.textContent = "¡Ya tienes los " + total + " terrenos! Todo el pasto de alrededor es tuyo.";
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = "Completo";
    b.disabled = true;
    col.appendChild(b);
  } else {
    d.textContent = "Terrenos: " + (lotes.length + 1) + " de " + total + ". El siguiente cuesta " + dolares(precio) + " y cada uno sale más caro. Solo puedes comprar los que tocan tu terreno actual." + (terreno2 ? "" : " El primero desbloquea la segunda puerta.");
    for (const k of lotesDisponibles()) {
      const L = datosLote(k), b = document.createElement("button");
      b.className = "btn";
      b.textContent = L.flecha + " " + L.etiqueta + " " + dolares(precio);
      b.disabled = dinero < precio;
      b.addEventListener("click", () => comprarTerreno(k));
      col.appendChild(b);
    }
  }
  t.append(n, d);
  fila.append(i, t, col);
  return fila;
}
function comprarTerreno(k) {
  const precio = precioTerreno();
  if (precio === undefined || !lotesDisponibles().includes(k) || dinero < precio) return;
  dinero -= precio;
  lotes.push(k);
  terreno2 = true;
  armarFondo(); // dibuja la plaza en el terreno comprado y actualiza los carteles
  info("¡Compraste el terreno " + (lotes.length + 1) + " de " + (TERRENO_PRECIOS.length + 1) + " (" + datosLote(k).etiqueta.toLowerCase() + ")!" + (lotes.length === 1 ? " Ya puedes comprar la segunda puerta." : ""));
  actualizar();
}
function comprarPuerta2() {
  if (!terreno2 || puerta2 || dinero < PRECIO_PUERTA2) return;
  dinero -= PRECIO_PUERTA2;
  puerta2 = true;
  armarFondo(); // dibuja la puerta de atrás
  info("¡Segunda puerta! Ahora también llegan clientes por atrás (arriba a la derecha). Ya puedes contratar a la segunda recepcionista.");
  actualizar();
}
function contratarRecep(k) {
  const precio = k ? PRECIO_RECEP2 : PRECIO_RECEP;
  if (receps[k] || dinero < precio || (k && (!puerta2 || !receps[0]))) return;
  dinero -= precio;
  receps[k] = { nivel: 1, g: null, t0: 0, emoji: k ? "👩‍💼" : "🧑‍💼" };
  info(k ? "Contrataste a la segunda recepcionista: atiende la puerta de atrás, pero todavía es lenta. Mejórala en 👥 Empleados."
         : "Contrataste a la recepcionista: da mesa sola, pero todavía es lenta. Mejórala en 👥 Empleados.");
  actualizar();
}
function mejorarRecep(k) {
  const r = receps[k], c = r && RECEP_PRECIOS_MEJORA[r.nivel - 1];
  if (!r || c === undefined || dinero < c) return;
  dinero -= c;
  r.nivel++;
  info((k ? "La segunda recepcionista" : "La recepcionista") + " subió al nivel " + r.nivel + ".");
  actualizar();
}
function contratarMesero(k) {
  const precio = k ? PRECIO_MESERO2 : PRECIO_MESERO;
  if (meseros[k] || dinero < precio || (k && !meseros[0])) return;
  dinero -= precio;
  const post = k ? MESERO_POST2 : MESERO_POST;
  const ent = nuevaEnt(k ? "🤵‍♀️" : "🤵", post[0], post[1]);
  ent.vel = MESERO_VEL[0];
  meseros[k] = { nivel: 1, ocupado: false, ent, post };
  info((k ? "Contrataste al segundo mesero" : "Contrataste al mesero") + ": lleva solo los platillos, pero camina despacio. Mejóralo en 👥 Empleados.");
  actualizar();
}
function mejorarMesero(k) {
  const w = meseros[k], c = w && MESERO_PRECIOS_MEJORA[w.nivel - 1];
  if (!w || c === undefined || dinero < c) return;
  dinero -= c;
  w.nivel++;
  w.ent.vel = MESERO_VEL[w.nivel - 1];
  info((k ? "El segundo mesero" : "El mesero") + " subió al nivel " + w.nivel + ".");
  actualizar();
}
// El mesero w va a la cocina por el platillo de la mesa m, lo lleva y vuelve a su lugar. Si la paciencia de la mesa se acaba en el camino, no entrega.
async function servir(m, w) {
  const t0 = m.listoDesde;
  const vigente = () => m.esperando && m.listoDesde === t0;
  const lado = m.cx < HALL_X ? 1 : -1;
  w.ocupado = true;
  m.reservadoPor = t0;
  await ir(w.ent, [[HALL_X, 185], PUERTA_COCINA, COCINA_DENTRO, [slotXY(m.slot)[0], 90]]);
  await esp(PAUSA_MESERO_MS);
  if (vigente() && !m.tomado) {
    m.tomado = true;
    w.ent.lleva = true;
    const entrega = [m.cx + 82 * lado, m.cy];
    await ir(w.ent, [COCINA_DENTRO, PUERTA_COCINA, [HALL_X, 185], ...(m.ext ? [[HALL_X, m.cy - 70], [entrega[0], m.cy - 70]] : [[HALL_X, m.cy]]), entrega]);
    w.ent.lleva = false;
    if (vigente()) entregar(m);
  }
  await ir(w.ent, w.ent.y < 160 ? [COCINA_DENTRO, PUERTA_COCINA, w.post] : m.ext ? [[w.ent.x, m.cy - 70], [HALL_X, m.cy - 70], w.post] : [[HALL_X, w.ent.y], w.post]);
  w.ocupado = false;
}

// ----- Estacionamiento: tienda, llegada y salida de autos -----
function filaEstac() {
  const total = CAJONES.length;
  if (nEstac >= total) return filaSimple("🅿️", "Estacionamiento", "Ya tienes los " + total + " lugares alrededor de la cuadra.", "Completo", true, () => {});
  const precio = precioEstac(nEstac - ESTAC_INICIALES);
  return filaSimple("🅿️", "Lugar de estacionamiento",
    "Tienes " + nEstac + " de " + total + ". Cada auto trae " + PERSONAS_AUTO + " personas; si no hay lugar, pasa de largo y no vuelve.",
    "Comprar " + dolares(precio), dinero < precio, comprarEstac);
}
function comprarEstac() {
  if (nEstac >= CAJONES.length) return;
  const precio = precioEstac(nEstac - ESTAC_INICIALES);
  if (dinero < precio) return;
  dinero -= precio;
  nEstac++;
  armarFondo(); // dibuja el lugar nuevo
  info("¡Nuevo lugar de estacionamiento! Ahora tienes " + nEstac + ".");
  actualizar();
}
// Pasa un auto por la calle de enfrente: si hay lugar libre estaciona (y sus 4 personas van a la recepción); si no, pasa de largo y se va para siempre
async function llegarAuto() {
  const k = CAJONES.slice(0, nEstac).find((x) => !x.usado);
  const a = nuevaEnt("", ENT_AUTO[0], ENT_AUTO[1]);
  a.coche = true; a.vel = AUTO_VEL; a.eje = "x";
  a.col = COCHES[Math.floor(Math.random() * COCHES.length)];
  if (!k) {
    autosPerdidos++;
    info("🚗 Un auto con " + PERSONAS_AUTO + " personas no encontró lugar y se fue para siempre.");
    await ir(a, [SAL_AUTO]);
    quitar(a);
    return;
  }
  k.usado = true; k.coche = a; k.pendientes = PERSONAS_AUTO;
  activos++; // el grupo cuenta como «en el local» desde que se reserva el lugar
  await ir(a, rutaCoche(k, false));
  await esp(500);
  llegar(PERSONAS_AUTO, k);
}
// El auto se va cuando suben sus 4 personas; el lugar queda libre en cuanto sale a la calle
async function irseAuto(k) {
  const a = k.coche;
  if (!a) return;
  const ruta = rutaCoche(k, true);
  await ir(a, [ruta[0]]);
  k.usado = false; k.coche = null;
  await ir(a, ruta.slice(1));
  quitar(a);
}
// Al terminar su camino de salida: quien vino a pie desaparece; quien vino en auto regresa a él y, cuando suben todos, el auto se va
async function despedir(c, pu = 0) {
  const k = c.cajon;
  if (!k || !k.coche) { quitar(c); return; }
  await ir(c, [...caminoAcera(k, pu)].reverse());
  quitar(c);
  k.pendientes--;
  if (k.pendientes <= 0) irseAuto(k);
}

// ----- Puntos al perfil (el juego no tiene final) -----
// Se mandan por lotes de PUNTOS_LOTE mientras juegas; «todo» manda lo que falte (al reiniciar o al salir de la página).
async function enviarPuntos(todo) {
  if (!J || (enviando && !todo)) return;
  const g = gen, total = Math.floor(ganado / DOLARES_POR_PUNTO), n = total - puntosEnviados;
  if (n <= 0 || (!todo && n < umbralPuntos)) return;
  puntosEnviados = total; enviando = true;
  let ok = false;
  try { ok = await J.sumarPuntos(ID, n); } catch (e) {}
  enviando = false;
  if (g !== gen) return; // se reinició la partida mientras tanto
  if (ok) umbralPuntos = PUNTOS_LOTE;
  else { puntosEnviados -= n; umbralPuntos = n + PUNTOS_LOTE; } // sin sesión o con error: se reintenta más adelante
}
document.addEventListener("visibilitychange", () => { if (document.hidden) { enviarPuntos(true); guardarPartida(); } });
addEventListener("pagehide", () => { enviarPuntos(true); guardarPartida(); });
setInterval(guardarPartida, AUTOGUARDADO_MS);

// ----- Dibujo (vista isométrica 2:1, estilo Clash of Clans) -----
// La lógica sigue usando el mapa plano (W × H) de arriba; aquí solo se proyecta cada punto a la pantalla.
let CW = 720;                           // ancho del lienzo en unidades del juego: se adapta a la pantalla (ver ajustarLienzo); el alto es fijo
const CH = 480;                         // alto del lienzo (debe coincidir con el <canvas> de index.html)
const ISO = 0.55 * ESCALA, OX = 400, OY = 100; // escala y origen de la proyección: la cuadra se ve del mismo tamaño en pantalla y los objetos se ven más chicos
const iso = (x, y, z = 0) => [OX + (x - y) * ISO, OY + ((x + y) * ISO) / 2 - z * ESCALA]; // la altura z también se encoge con ESCALA

function emoji(t, x, y, tam) { ctx.fillStyle = "#000"; ctx.font = tam + "px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); } // fillStyle opaco: si no, el emoji hereda la transparencia de la sombra
function caja(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function texto(t, x, y, tam, color, alinear, c = ctx) { c.font = "700 " + tam + "px system-ui, sans-serif"; c.fillStyle = color; c.textAlign = alinear || "left"; c.textBaseline = "middle"; c.fillText(t, x, y); }

function poly(c, pts, relleno, borde) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  if (relleno) { c.fillStyle = relleno; c.fill(); }
  if (borde) { c.strokeStyle = borde; c.lineWidth = 1.5; c.stroke(); }
}
function suelo(c, x0, y0, x1, y1, relleno, z = 0, borde) { poly(c, [iso(x0, y0, z), iso(x1, y0, z), iso(x1, y1, z), iso(x0, y1, z)], relleno, borde); }
// Caja con tapa y las dos caras que se ven desde la cámara (la de x1 y la de y1)
function caja3d(c, x0, y0, x1, y1, h, col, borde) {
  poly(c, [iso(x1, y0, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x1, y0, h)], col.der, borde);
  poly(c, [iso(x0, y1, 0), iso(x1, y1, 0), iso(x1, y1, h), iso(x0, y1, h)], col.izq, borde);
  poly(c, [iso(x0, y0, h), iso(x1, y0, h), iso(x1, y1, h), iso(x0, y1, h)], col.tapa, borde);
}
const MADERA = { tapa: "#c58b4e", izq: "#a06a35", der: "#85542a" };
const MADERA_OSCURA = { tapa: "#8d6e63", izq: "#6d4c41", der: "#5a3d33" };
const ACERO = { tapa: "#cfd8dc", izq: "#90a4ae", der: "#78909c" };
const SILLA = { tapa: "#d6453d", izq: "#a82a26", der: "#7d1d1a" }; // bancas rojas, como en el mapa de referencia
const SILLA_RESP = { tapa: "#b53630", izq: "#8f2420", der: "#6a1815" };
// Aspecto según las mejoras de «Mesa» y de «Sillas» (0 a 5): las mesas pasan de madera a mesa con mantel, talavera azul y dorada; las sillas ganan un cojín de color
const MESA_ESTILOS = [
  { tapa: "#46a39a", izq: "#2f7f77", der: "#216059" }, // mesa verde azulado (nivel 0)
  { tapa: "#d9a066", izq: "#b97a3d", der: "#9a6130" }, // madera barnizada
  { tapa: "#f4ecd8", izq: "#c9b99a", der: "#a8977a" }, // mantel crema
  { tapa: "#4f8fd6", izq: "#2f6db3", der: "#1f5590" }, // talavera azul
  { tapa: "#e0e0e0", izq: "#b0b0b0", der: "#8f8f8f" }, // mármol
  { tapa: "#f2c14e", izq: "#d19a1f", der: "#a87710" }, // dorada
];
const SILLA_COJINES = [
  null,
  { tapa: "#d7b98e", izq: "#b8946a", der: "#9a7a52" }, // cojín arena
  { tapa: "#ef9a9a", izq: "#e53935", der: "#b71c1c" }, // cojín rojo
  { tapa: "#80cbc4", izq: "#26a69a", der: "#00796b" }, // cojín verde
  { tapa: "#90caf9", izq: "#1e88e5", der: "#0d47a1" }, // cojín azul
  { tapa: "#f2c14e", izq: "#d19a1f", der: "#a87710" }, // cojín dorado
];

// Cuarto con piso de azulejos, paredes altas al fondo (y0 y x0) y paredes bajas al frente (y1 y x1).
// lado = dónde está la puerta: «frente» (hueco en la pared y1; «puerta» = x donde empieza), «der» (hueco en la pared x1) o «izq» (hueco en la pared x0): en esos dos «puerta» = y donde empieza el hueco; «ancho» = ancho del hueco.
function cuarto(c, x0, y0, x1, y1, claro, oscuro, pared, puerta, ancho, lado = "frente") {
  const nx = Math.max(4, Math.round((x1 - x0) / 25)), ny = Math.max(4, Math.round((y1 - y0) / 25)), dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) suelo(c, x0 + i * dx, y0 + j * dy, x0 + (i + 1) * dx, y0 + (j + 1) * dy, (i + j) % 2 ? oscuro : claro);
  const h = 56, borde = "#5b4636";
  poly(c, [iso(x0, y0, 0), iso(x1, y0, 0), iso(x1, y0, h), iso(x0, y0, h)], pared, borde);   // pared del fondo
  const izqTramo = (ya, yb) => poly(c, [iso(x0, ya, 0), iso(x0, yb, 0), iso(x0, yb, h), iso(x0, ya, h)], pared, borde);
  if (lado === "izq") { // pared izquierda con el hueco de la puerta (y un dintel encima)
    izqTramo(y0, puerta); izqTramo(puerta + ancho, y1);
    poly(c, [iso(x0, puerta, 40), iso(x0, puerta + ancho, 40), iso(x0, puerta + ancho, h), iso(x0, puerta, h)], pared, borde);
  } else izqTramo(y0, y1);
  poly(c, [iso(x0, y0, 0), iso(x0, y1, 0), iso(x0, y1, h), iso(x0, y0, h)], "rgba(0,0,0,.14)");  // sombra para dar volumen
  const baja = { tapa: "#a1887f", izq: "#8d6e63", der: "#6d4c41" };
  if (lado === "frente") { caja3d(c, x0, y1 - 5, puerta, y1, 14, baja); caja3d(c, puerta + ancho, y1 - 5, x1, y1, 14, baja); }
  else caja3d(c, x0, y1 - 5, x1, y1, 14, baja);
  if (lado === "der") { caja3d(c, x1 - 5, y0, x1, puerta, 14, baja); caja3d(c, x1 - 5, puerta + ancho, x1, y1 - 5, 14, baja); }
  else caja3d(c, x1 - 5, y0, x1, y1 - 5, 14, baja);
}

// Todo lo que no se mueve se dibuja una sola vez en este lienzo oculto
const FOX = 1300, FOY = 700, FW = 2700, FH = 1500; // el fondo es más grande que el lienzo: cubre x de -900 a 1750 y y de -850 a 700 (coordenadas base; ampliado para la zona de pasto)
const VISTA = { x0: -1200, y0: -520, x1: 1350, y1: 700 }; // hasta dónde se puede mover la vista (coordenadas base)
const CENTRO_VISTA = [200, 330];                  // centro del restaurante en coordenadas base
const fondo = document.createElement("canvas");
fondo.width = FW; fondo.height = FH;

// ----- Ciudad alrededor del restaurante -----
// El restaurante es la manzana (0, 0): su acera mide ACERA y las calles CALLE. Las demás manzanas se llenan de edificios y parques.
// Los edificios de las manzanas de enfrente tienen tope de altura según su distancia, para que nunca tapen el restaurante.
const COL_ASFALTO = "#555b64", COL_ACERA = "#d0d3d6", COL_PASTO = "#9ccc65";
// ZONA DE PASTO (terreno para ampliar el restaurante): manzanas que se ven como un solo pasto junto con la del restaurante, sin calles entre ellas.
// Cada una es [i, j] respecto a la del restaurante [0, 0]. En pantalla: [-1,-1] = arriba, [0,-1] = arriba a la derecha, [1,-1] = a la derecha.
// (más: [-1,0] = arriba a la izquierda, [1,0] = abajo a la derecha, [0,1] = abajo a la izquierda, [1,1] = abajo, [-1,1] = a la izquierda)
const PASTO = [[-2, -2], [-1, -2], [0, -2], [-2, -1], [-1, -1], [-2, 0], [-1, 0]]; // (la manzana [0,-1] es la mitad de atrás del restaurante) // cuadrícula 3 × 3 con el restaurante [0,0] en la esquina inferior derecha: las otras 8 manzanas son pasto, sin carreteras entre ellas
const EDIFICIOS = [
  { tapa: "#d7ccc8", izq: "#bcaaa4", der: "#a1887f" },
  { tapa: "#ffe0b2", izq: "#ffcc80", der: "#ffb74d" },
  { tapa: "#bbdefb", izq: "#90caf9", der: "#64b5f6" },
  { tapa: "#c8e6c9", izq: "#a5d6a7", der: "#81c784" },
  { tapa: "#f8bbd0", izq: "#f48fb1", der: "#f06292" },
  { tapa: "#cfd8dc", izq: "#b0bec5", der: "#90a4ae" },
];
const CENTROS_X = [-3, -2, -1, 0, 1, 2, 3].map((i) => i * PX + W + ACERA + CALLE / 2); // calles de x constante
const CENTROS_Y = [-3, -2, -1, 0, 1, 2, 3].map((j) => by0(j) + BH + ACERA + CALLE / 2); // calles de y constante
const ruido = (a, b, k) => { const s = Math.sin(a * 127.1 + b * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }; // «azar» fijo: la ciudad sale igual siempre
// ¿Se vería algo de este rectángulo (con altura h) dentro del fondo?
function visible(x0, y0, x1, y1, h) {
  const p = [iso(x0, y0), iso(x1, y0), iso(x0, y1), iso(x1, y1)];
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  return Math.max(...xs) > -FOX && Math.min(...xs) < FW - FOX && Math.max(...ys) > -FOY && Math.min(...ys) - h < FH - FOY;
}
function arbol(c, x, y, tam) {
  const [px, py] = iso(x, y);
  c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(px, py, tam * 0.45, tam * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.font = tam + "px serif"; c.fillStyle = "#000"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("🌳", px, py - tam * 0.4);
}
function ventanas(c, x0, y0, x1, y1, h) {
  const col = "rgba(227,242,253,.75)", k = 1 / ESCALA; // las ventanas son de la ciudad: se ven igual en pantalla
  for (let z = 16 * k; z + 14 * k <= h - 6 * k; z += 26 * k) {
    for (let x = x0 + 14 * k; x + 12 * k <= x1 - 10 * k; x += 26 * k) poly(c, [iso(x, y1, z), iso(x + 12 * k, y1, z), iso(x + 12 * k, y1, z + 14 * k), iso(x, y1, z + 14 * k)], col);
    for (let y = y0 + 14 * k; y + 12 * k <= y1 - 10 * k; y += 26 * k) poly(c, [iso(x1, y, z), iso(x1, y + 12 * k, z), iso(x1, y + 12 * k, z + 14 * k), iso(x1, y, z + 14 * k)], col);
  }
}
function edificio(c, x0, y0, x1, y1, h, col) {
  caja3d(c, x0, y0, x1, y1, h, col, "rgba(0,0,0,.25)");
  ventanas(c, x0, y0, x1, y1, h);
}
function armarCiudad(c) {
  c.fillStyle = COL_ASFALTO; c.fillRect(-FOX, -FOY, FW, FH); // todo es calle; encima van las aceras
  // línea central amarilla de cada calle (se interrumpe en los cruces)
  const enCruce = (v, centros) => centros.some((m) => Math.abs(v - m) < CALLE / 2 + 6);
  for (let p = -2400 / ESCALA; p < 2600 / ESCALA; p += 60) for (const xc of CENTROS_X) if (!enCruce(p + 15, CENTROS_Y)) suelo(c, xc - 2, p, xc + 2, p + 30, "#e8c547");
  for (let p = -2400 / ESCALA; p < 2600 / ESCALA; p += 60) for (const yc of CENTROS_Y) if (!enCruce(p + 15, CENTROS_X)) suelo(c, p, yc - 2, p + 30, yc + 2, "#e8c547");
  for (let k = 0; k < 6; k++) suelo(c, HALL_X - 210 + k * 20, CENTROS_Y[3] - 52, HALL_X - 200 + k * 20, CENTROS_Y[3] + 52, "#f5f5f5"); // paso de cebra frente al restaurante
  const cola = [];
  const hayPasto = (i, j) => PASTO.some((q) => q[0] === i && q[1] === j);
  const esRest = (i, j) => i === 0 && (j === 0 || j === -1);
  const esZona = (i, j) => esRest(i, j) || hayPasto(i, j);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x0 = bx0(i), y0 = by0(j), x1 = x0 + W, y1 = y0 + BH;
    if (!visible(x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, 240)) continue;
    suelo(c, x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, COL_ACERA); // acera de la manzana
    if (esRest(i, j)) continue;                                            // el restaurante se dibuja aparte
    if (hayPasto(i, j)) { suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, COL_PASTO); continue; } // zona de pasto: sin edificios
    if (ruido(i, j, 99) < 0.15) {                                          // parque
      suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, "#9ccc65");
      for (let k = 0; k < 6; k++) {
        const ax = x0 + 80 + ruido(i, j, k) * (W - 160), ay = y0 + 80 + ruido(j, i, k + 9) * (BH - 160);
        cola.push({ d: ax + ay, f: () => arbol(c, ax, ay, 34) });
      }
      continue;
    }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const ex0 = x0 + a * (W / 2) + 14, ex1 = x0 + (a + 1) * (W / 2) - 14;
      const ey0 = y0 + b * (BH / 2) + 14, ey1 = y0 + (b + 1) * (BH / 2) - 14;
      const tope = ex1 > 0 && ey1 > 0 ? 0.5 * Math.max(ex0 - W, ey0 - H) : 220 / ESCALA; // los de enfrente: más bajos cuanto más cerca del restaurante
      const h = Math.max(24 / ESCALA, Math.min((40 + ruido(i * 3 + a, j * 5 + b, 1) * 160) / ESCALA, tope, 220 / ESCALA)); // los edificios de la ciudad se ven igual de altos en pantalla
      const col = EDIFICIOS[Math.floor(ruido(i * 3 + a, j * 5 + b, 2) * EDIFICIOS.length)];
      cola.push({ d: (ex0 + ex1 + ey0 + ey1) / 2, f: () => edificio(c, ex0, ey0, ex1, ey1, h, col) });
    }
  }
  // Une cada manzana de pasto con sus vecinas de la zona (y con el restaurante): quita la calle de en medio y deja el pasto continuo
  const unir = (i, j, ejeX) => {
    const ni = ejeX ? i + 1 : i, nj = ejeX ? j : j + 1;
    if (!esZona(ni, nj) || !(hayPasto(i, j) || hayPasto(ni, nj))) return;
    const x0 = bx0(i), y0 = by0(j), x1 = x0 + W, y1 = y0 + BH, nx0 = bx0(ni), ny0 = by0(nj);
    if (ejeX) {
      suelo(c, x1 + ACERA, y0 - ACERA, nx0 - ACERA, y1 + ACERA, COL_ACERA);
      suelo(c, hayPasto(i, j) ? x1 - 10 : x1 + ACERA, y0 + 10, hayPasto(ni, nj) ? nx0 + 10 : nx0 - ACERA, y1 - 10, COL_PASTO);
    } else {
      suelo(c, x0 - ACERA, y1 + ACERA, x1 + ACERA, ny0 - ACERA, COL_ACERA);
      suelo(c, x0 + 10, hayPasto(i, j) ? y1 - 10 : y1 + ACERA, x1 - 10, hayPasto(ni, nj) ? ny0 + 10 : ny0 - ACERA, COL_PASTO);
    }
  };
  for (const [i, j] of [[0, 0], [0, -1], ...PASTO]) { unir(i, j, true); unir(i, j, false); }
  // Donde se juntan 4 manzanas de la zona queda un cuadro de calle: se rellena de pasto (sin pisar la acera del restaurante)
  const cruce = (i, j) => {
    const cuatro = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
    if (!cuatro.every(([a, b]) => esZona(a, b))) return;
    const gx0 = bx0(i) + W - 10, gy0 = by0(j) + BH - 10, gx1 = bx0(i + 1) + 10, gy1 = by0(j + 1) + 10;
    suelo(c, gx0, gy0, gx1, gy1, COL_PASTO);
    for (const [a, b] of cuatro) {
      if (hayPasto(a, b)) continue;
      const rx0 = Math.max(gx0, bx0(a) - ACERA), ry0 = Math.max(gy0, by0(b) - ACERA), rx1 = Math.min(gx1, bx0(a) + W + ACERA), ry1 = Math.min(gy1, by0(b) + BH + ACERA);
      if (rx1 > rx0 && ry1 > ry0) suelo(c, rx0, ry0, rx1, ry1, COL_ACERA);
    }
  };
  for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) cruce(i, j);
  suelo(c, -ACERA, -ACERA, W + ACERA, H + ACERA, COL_ACERA); // acera de la parcela del restaurante (las 2 manzanas y la franja que las une)
  cola.sort((p, q) => p.d - q.d).forEach((o) => o.f()); // de lo más lejano a lo más cercano
}
// Árboles en la acera del restaurante: los de atrás se dibujan antes del piso y los de enfrente después (así tapan lo correcto)
function arbolesAcera(c, lado) {
  const r = (v) => v / ESCALA; // la distancia entre árboles se ve igual que antes en pantalla
  const lados = []; for (let y = r(90); y < H - 60; y += r(140)) lados.push(y);
  const pts = lado === "atras"
    ? [...lados.filter((y) => y < H - 400).map((y) => [-20, y]), ...[90, 230, 370, 510].map((x) => [r(x), -20])]
    : [...lados.filter((y) => y > H - 520 && y < H - 60).map((y) => [W + 20, y]), [r(40), H + 20], [r(120), H + 20], [r(520), H + 20]];
  pts.filter(([x, y]) => !enPlaza(x, y)).sort((p, q) => p[0] + p[1] - (q[0] + q[1])).forEach(([x, y]) => arbol(c, x, y, 32)); // donde se pavimentó la plaza no hay árboles
}
// Plaza de los terrenos comprados. Se pavimentan: cada manzana comprada, la calle que la une con otra manzana tuya (o con el restaurante) y el cruce cuando las 4 de alrededor son tuyas.
function rectsPlaza() {
  const pos = [[0, 0], [0, -1], ...lotes.map((k) => k.split(",").map(Number))];
  const mio = (i, j) => pos.some((q) => q[0] === i && q[1] === j);
  const r = pos.slice(2).map(([i, j]) => [bx0(i), by0(j), bx0(i) + W, by0(j) + BH]);
  for (const [i, j] of pos) {
    if (mio(i + 1, j)) r.push([bx0(i) + W, by0(j), bx0(i + 1), by0(j) + BH]);
    if (mio(i, j + 1) && !(i === 0 && j === -1)) r.push([bx0(i), by0(j) + BH, bx0(i) + W, by0(j + 1)]);   // (la franja entre las 2 manzanas del restaurante ya es su piso)
    if (mio(i + 1, j) && mio(i, j + 1) && mio(i + 1, j + 1)) r.push([bx0(i) + W, by0(j) + BH, bx0(i + 1), by0(j + 1)]);
  }
  return r;
}
// ¿Cae este punto dentro de la plaza de los terrenos comprados?
function enPlaza(x, y) {
  return rectsPlaza().some((r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]);
}
function plazaLotes(c) {
  for (const [x0, y0, x1, y1] of rectsPlaza()) {
    for (let x = x0; x < x1; x += 40) for (let y = y0; y < y1; y += 40) suelo(c, x, y, Math.min(x + 40, x1), Math.min(y + 40, y1), ((x - x0) / 40 + (y - y0) / 40) % 2 ? "#d8cfbd" : "#e4dccb");
    suelo(c, x0, y0, x1, y1, null, 0, "#a1887f");
  }
}
// Carteles «En venta» sobre los terrenos que se pueden comprar ahora (con el precio del siguiente)
function carteles(c) {
  const precio = precioTerreno();
  if (precio === undefined) return;
  for (const k of lotesDisponibles()) {
    const L = datosLote(k), [sx, sy] = iso(bx0(L.i) + W / 2, by0(L.j) + BH / 2);
    const t = "🏷️ Terreno " + L.etiqueta.toLowerCase() + " · " + dolares(precio);
    c.font = "700 15px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 4; c.strokeStyle = "rgba(0,0,0,.55)"; c.strokeText(t, sx, sy);
    texto(t, sx, sy, 15, "#fff", "center", c);
  }
}
function puertaAtras(c) {
  caja3d(c, HALL_X - 30, -4, HALL_X + 30, 0, 5, MADERA_OSCURA);
  const [ex, ey] = iso(HALL_X, -130, 0);
  c.font = "700 13px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText("Entrada 2", ex, ey);
  texto("Entrada 2", ex, ey, 13, "#fff", "center", c);
}
// Lugares de estacionamiento comprados: casilla oscura con borde blanco y una «P». Si hay alguno atrás, se pinta también la calle de atrás
function estacionamiento(c) {
  const visibles = CAJONES.slice(0, nEstac);
  if (visibles.some((k) => k.lado === "a")) suelo(c, -150, -148, W + 140, -100, COL_ASFALTO);
  if (visibles.some((k) => k.lado === "i")) suelo(c, -148, -148, -100, H + 150, COL_ASFALTO); // a los lados ya no hay carretera: el carril se pinta al comprar lugares
  if (visibles.some((k) => k.lado === "d")) suelo(c, W + 100, -148, W + 148, H + 150, COL_ASFALTO);
  for (const k of visibles) {
    const ax = k.eje === "x" ? CAJON_FONDO : CAJON_ANCHO, ay = k.eje === "x" ? CAJON_ANCHO : CAJON_FONDO;
    suelo(c, k.x - ax / 2, k.y - ay / 2, k.x + ax / 2, k.y + ay / 2, "#454b53", 0, "#f5f5f5");
    const [px, py] = iso(k.x, k.y);
    texto("P", px, py, Math.max(7, 13 * ESCALA), "rgba(255,255,255,.55)", "center", c);
  }
}
function armarFondo() {
  fondo.width = FW; fondo.height = FH; // limpia el fondo (se vuelve a armar al ampliar el terreno)
  const c = fondo.getContext("2d");
  c.translate(FOX, FOY); // el fondo es más grande que el lienzo: caben la ciudad y las calles alrededor
  armarCiudad(c);        // calles, aceras, edificios y parques
  arbolesAcera(c, "atras");
  plazaLotes(c); // plaza en los terrenos comprados
  carteles(c);   // carteles «En venta» en los que se pueden comprar
  estacionamiento(c);
  // piso del comedor
  for (let i = 0; i < W / 40; i++) for (let j = 0; j < H / 40; j++) suelo(c, i * 40, j * 40, i * 40 + 40, j * 40 + 40, (i + j) % 2 ? "#d9c3a0" : "#f6f0e4");
  suelo(c, HALL_X - 40, 430 + TY - 190 + 40, HALL_X + 40, 980, "#b7313a", 0, "#8c1f28"); // alfombra roja por el pasillo del comedor
  { // paredes de afuera: altas y beige atrás y a la izquierda, bajas y blancas al frente y a la derecha
    const alta = { tapa: "#ffffff", izq: "#f2d89c", der: "#e2bf78" }, baja = { tapa: "#ffffff", izq: "#e6ebee", der: "#cfd8dc" }, ha = 64;
    caja3d(c, 0, -7, W, 0, ha, alta, "#a98a4a");                       // pared de atrás
    caja3d(c, -7, 0, 0, H, ha, alta, "#a98a4a");                       // pared de la izquierda
    for (let y = 340; y + 70 < H - 200; y += 170) poly(c, [iso(0, y, 24), iso(0, y + 70, 24), iso(0, y + 70, 52), iso(0, y, 52)], "#37474f", "#ffffff"); // ventanas
    caja3d(c, W, 0, W + 6, H, 14, baja, "#90a4ae");                    // pared de la derecha (baja)
    caja3d(c, 0, H, HALL_X - 30, H + 6, 14, baja, "#90a4ae");          // pared del frente, con hueco para la puerta
    caja3d(c, HALL_X + 30, H, W, H + 6, 14, baja, "#90a4ae");
  }
  cuarto(c, 10 + DXK + KX, HAB_Y0, 260 + DXK + KX, HAB_Y1, "#eceff1", "#cfd8dc", "#b0bec5", 200 + DXK + KX, 50);   // cocina (puerta al frente)
  const [kx, ky] = iso(135 + DXK + KX, 10, 70); texto("Cocina", kx, ky, 14, "#37474f", "center", c);
  const lado = (id) => LUGARES[id].puerta, hueco = (id) => pyHab(id) - PUERTA_ANCHO / 2;
  if (banioComprado) {
    const [x0, y0, x1, y1] = rectHab("banio");
    cuarto(c, x0, y0, x1, y1, "#e3e8eb", "#c4ced4", "#1f7a90", hueco("banio"), PUERTA_ANCHO, lado("banio"));   // baño (puerta hacia el pasillo)
    const [bx, by] = iso((x0 + x1) / 2, y0, 70); texto("Baño", bx, by, 14, "#1f5d70", "center", c);
  }
  for (const id of Object.keys(HAB_NUEVAS)) { // habitaciones nuevas (si ya las compraste o ya vienen hechas)
    if (habsExtra[id] === undefined) continue;
    const h = HAB_NUEVAS[id], [x0, y0, x1, y1] = rectHab(id);
    cuarto(c, x0, y0, x1, y1, h.piso[0], h.piso[1], h.pared, hueco(id), PUERTA_ANCHO, lado(id));
    const [hx, hy] = iso((x0 + x1) / 2, y0, 70); texto(h.etiqueta, hx, hy, h.etiqueta.length > 10 ? 11 : 14, h.colorTexto, "center", c);
  }
  const [cx, cy] = iso(40, 800, 0); texto("Comedor", cx, cy, 13, "rgba(91,70,54,.75)", "center", c);
  // puerta de entrada
  caja3d(c, HALL_X - 30, H - 4, HALL_X + 30, H, 5, MADERA_OSCURA);
  if (puerta2) puertaAtras(c);
  arbolesAcera(c, "enfrente");
  const [ex, ey] = iso(HALL_X, H, 0); // el letrero queda sobre la calle: letras blancas con contorno oscuro
  c.font = "700 13px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.6)"; c.strokeText("Entrada", ex + 4, ey + 30);
  texto("Entrada", ex + 4, ey + 30, 13, "#fff", "center", c);
}

function sombra(x, y, r) {
  const [sx, sy] = iso(x, y);
  ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.beginPath(); ctx.ellipse(sx, sy, r * ESCALA, r * ESCALA * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}
function dibujarGenerador(x, y) { // generador cuadrado: una caja amarilla con un rayo encima
  sombra(x + GEN_LADO / 2, y + GEN_LADO / 2, 20);
  caja3d(ctx, x, y, x + GEN_LADO, y + GEN_LADO, 22, GEN_COLOR, "#8d5a00");
  const [sx, sy] = iso(x + GEN_LADO / 2, y + GEN_LADO / 2, 22);
  emoji("⚡", sx, sy, 26 * ESCALA);
}
function persona(e, x, y, z, tam) { sombra(x, y, 13); const [sx, sy] = iso(x, y, z); emoji(e, sx, sy, tam * ESCALA); }

function dibujarMesa(m) {
  caja3d(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, 22, MESA_ESTILOS[m.mejoras.mesa], "#1b4a45");
  suelo(ctx, m.cx - 24, m.cy - 24, m.cx - 12, m.cy - 14, "#f4f6f6", 22); suelo(ctx, m.cx + 12, m.cy + 14, m.cx + 24, m.cy + 24, "#f4f6f6", 22); // platos
  if (m.ocupada) suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#7c5cff");
  if (llevando === m) { suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#ffd54a"); suelo(ctx, m.cx - 34, m.cy - 34, m.cx + 34, m.cy + 34, null, 22, "#ffd54a"); }
  const [sx, sy] = iso(m.cx, m.cy, 22);
  const nm = totalMejoras(m);
  const etq = ESCALA < 0.8 ? String(m.id) : "Mesa " + m.id; // con objetos pequeños solo el número, para no tapar las sillas
  texto(etq + (nm ? " ★" + nm : ""), sx, sy + 9 * ESCALA, 10, nm ? "#ffe082" : "#fff", "center"); // ★ = mejoras compradas en esa mesa
  [["cubiertos", "🍴", -20, 14], ["bebidas", "🥤", 14, -20], ["condimentos", "🧂", 20, 18], ["decoracion", "🪴", -22, -22]].forEach(([id, em, dx, dy]) => {
    const k = m.mejoras[id];
    if (k) { const [ex, ey] = iso(m.cx + dx, m.cy + dy, 24); emoji(em, ex, ey, (10 + k * 1.6) * ESCALA); }
  });
  if (m.plato) emoji("🍽️", sx, sy - 4 * ESCALA, 22 * ESCALA);
  const bw = 48 * ESC_UI, bh = 7 * ESC_UI, by = sy - 38 * ESC_UI; // barras de paciencia y de avance
  if (m.esperando) emoji("⏳", sx, sy - 52 * ESC_UI, 20 * ESC_UI); // esperando su platillo (sin límite de paciencia)
  if (m.barra) {
    const f = Math.min(1, (ahora() - m.barra.t0) / m.barra.dur);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - bw / 2, by, bw, bh);
    ctx.fillStyle = m.barra.color; ctx.fillRect(sx - bw / 2, by, bw * f, bh);
  }
}
function dibujarSilla(s, m, tipo) { // banca roja con respaldo para 2 personas: la de arriba es la «Silla 1» y la de abajo la «Silla 2»; la de arriba también dibuja el tope del extremo (la mesa queda en forma de «U»)
  const L = BANCA_LARGO / 2, arriba = tipo === "arriba", borde = "#4a1512";
  if (arriba) {
    const lado = m.cx < HALL_X ? 1 : -1, ex = m.cx - lado * (L + 4); // el extremo cerrado queda lejos del pasillo
    caja3d(ctx, ex - 4, m.cy - 58, ex + 4, m.cy + 58, 20, SILLA_RESP, borde);
  }
  caja3d(ctx, s.x - L, arriba ? s.y - 17 : s.y + 10, s.x + L, arriba ? s.y - 10 : s.y + 17, 24, SILLA_RESP, borde); // respaldo (del lado de afuera)
  caja3d(ctx, s.x - L, s.y - 10, s.x + L, s.y + 10, 10, SILLA, borde);
  const k = arriba ? m.mejoras.silla1 : m.mejoras.silla2, cojin = SILLA_COJINES[Math.max(0, k - 1)]; // nivel 1 = sin cojín
  if (cojin && k > 1) caja3d(ctx, s.x - L + 2, s.y - 8, s.x + L - 2, s.y + 8, 10 + k - 1, cojin, borde); // cada nivel la hace un poco más alta
}
function dibujarMostrador() {
  caja3d(ctx, 20 + DXK + KX, 40, 250 + DXK + KX, 70, 26, ACERO, "#546e7a");
  const [dx, dy] = iso(32 + DXK + KX, 55, 40); emoji("🍳", dx, dy, 26 * ESCALA);
  for (const m of mesas) { // platillos listos esperando que los tomes
    if (!m.esperando || m.tomado) continue;
    const [sx, sy] = iso(...slotXY(m.slot), 26);
    const u = ESC_UI;
    emoji("🍽️", sx, sy - 14 * ESCALA, 30 * ESCALA * (1 + Math.sin(ahora() / 180) * 0.08));
    texto(ESCALA < 0.8 ? String(m.id) : "Mesa " + m.id, sx, sy + 4 * u, 10, "#263238", "center");
  }
}
function dibujarEquipoCocina() { // lo que compraste (y la estufa) se ve en el piso de la cocina, en dos filas de cuatro
  MEJORAS_COCINA.forEach((c, i) => {
    if (nivCoc(c.id) <= 0) return;
    const [sx, sy] = iso(30 + DXK + KX + (i % 4) * 48, i < 4 ? 130 : 150, 14);
    emoji(c.ico, sx, sy, 26 * ESCALA);
  });
}
function dibujarChef() {
  dibujarEquipoCocina();
  if (cocinero && (enTurno("cocina") || cocinando > 0)) persona("🧑‍🍳", 110 + DXK + KX, 112, 20 + (cocinando > 0 ? Math.abs(Math.sin(ahora() / 120)) * 5 : 0), 34);
  if (cocinero2 && (enTurno("cocina") || cocinando > 0)) persona("👩‍🍳", 190 + DXK + KX, 112, 20 + (cocinando > 0 ? Math.abs(Math.sin(ahora() / 120 + 1.5)) * 5 : 0), 34); // segundo cocinero, a la derecha del primero
  if (cocinando > 0) { const [sx, sy] = iso(150 + DXK + KX, 100, 44); emoji("♨️", sx, sy, 20 * ESCALA); }
}
// Aviso sobre el grupo que está en la recepción: «Atendiendo…» y una barra que avanza hasta que la recepcionista ve si hay mesa
function dibujarEspera(g) {
  const [sx, sy0] = iso(HALL_X, g.y, g.slot % 2 === 0 ? 112 : 78);
  const sy = sy0 + Math.sin(ahora() / 200) * 3, f = ESC_UI;
  const t = "🧑‍💼 Atendiendo…";
  ctx.font = "700 " + 13 * f + "px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 16 * f;
  ctx.fillStyle = "#fff"; caja(sx - w / 2, sy - 12 * f, w, 24 * f, 8 * f); ctx.fill();
  ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 2; ctx.stroke();
  texto(t, sx, sy, 13 * f, "#3b2a1a", "center");
  const av = Math.min(1, Math.max(0, (reloj - g.desde) / TIEMPO_RECEP_MS));
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 30 * f, sy + 16 * f, 60 * f, 6 * f);
  ctx.fillStyle = "#7c5cff"; ctx.fillRect(sx - 30 * f, sy + 16 * f, 60 * f * av, 6 * f);
}
function dibujarEscritorio() {
  caja3d(ctx, 340 + DX, 585 + DY, 460 + DX, 619 + DY, 26, MADERA_OSCURA, "#3e2c23");
  const [sx, sy] = iso(400 + DX, 602 + DY, 26); texto("Recepción", sx, sy, 11 * ESC_UI, "#fff", "center");
  const [bx, by] = iso(400 + DX, 636 + DY, 0); // etiqueta que invita a abrir la tienda
  const t = "🛒 Tienda", f = ESC_UI;
  ctx.font = "700 " + 13 * f + "px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 16 * f;
  ctx.fillStyle = "#fff"; caja(bx - w / 2, by - 12 * f, w, 24 * f, 8 * f); ctx.fill();
  ctx.strokeStyle = "#7c5cff"; ctx.lineWidth = 2; ctx.stroke();
  texto(t, bx, by, 13 * f, "#3b2a1a", "center");
}
// Recepcionista contratada: de pie detrás del mostrador; mientras atiende se ve su barra de avance
function dibujarRecepcionista(r, x, y) {
  persona(r.emoji, x, y, 38, 34);
  if (!r.g) return;
  const f = Math.min(1, (reloj - r.t0) / TIEMPO_RECEP_MS);
  const [sx, sy] = iso(x, y, 78);
  const bw = 48 * ESC_UI, bh = 7 * ESC_UI;
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - bw / 2, sy, bw, bh);
  ctx.fillStyle = "#7c5cff"; ctx.fillRect(sx - bw / 2, sy, bw * f, bh);
}
// Mostrador de la segunda puerta (en el terreno de atrás)
function dibujarEscritorio2() {
  caja3d(ctx, 340 + DX, -70, 460 + DX, -36, 26, MADERA_OSCURA, "#3e2c23");
  const [sx, sy] = iso(400 + DX, -53, 26); texto("Recepción 2", sx, sy, 11 * ESC_UI, "#fff", "center");
}
// Caja que va de la altura z0 a z1 (para apilar la cabina sobre la carrocería)
function cajaAlta(c, x0, y0, x1, y1, z0, z1, col, borde) {
  poly(c, [iso(x1, y0, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x1, y0, z1)], col.der, borde);
  poly(c, [iso(x0, y1, z0), iso(x1, y1, z0), iso(x1, y1, z1), iso(x0, y1, z1)], col.izq, borde);
  poly(c, [iso(x0, y0, z1), iso(x1, y0, z1), iso(x1, y1, z1), iso(x0, y1, z1)], col.tapa, borde);
}
function dibujarCoche(e) {
  const horiz = e.eje === "x", a = horiz ? 26 : 12, b = horiz ? 12 : 26, ca = horiz ? 12 : 10, cb = horiz ? 10 : 12;
  sombra(e.x, e.y, 26);
  cajaAlta(ctx, e.x - a, e.y - b, e.x + a, e.y + b, 2, 12, e.col, "rgba(0,0,0,.35)");      // carrocería
  cajaAlta(ctx, e.x - ca, e.y - cb, e.x + ca, e.y + cb, 12, 21, VIDRIO, "rgba(0,0,0,.3)");  // cabina
}
function dibujarEnt(e) {
  if (e.oculto) return;
  if (e.coche) { dibujarCoche(e); return; }
  persona(e.emoji, e.x, e.y, 20, 34);
  if (e.lleva) { const [px, py] = iso(e.x, e.y, 56); emoji("🍽️", px, py, 20 * ESCALA); } // el mesero con un platillo en la mano
  if (e.enojado) { const [sx, sy] = iso(e.x, e.y, 52); emoji("😡", sx + Math.sin(ahora() / 60) * 2 * ESCALA, sy, 20 * ESCALA); }
}

function dibujarGlobos() {
  const t = ahora(), f = ESC_UI;
  globos = globos.filter((g) => t < g.hasta);
  for (const g of globos) {
    const [sx, sy] = iso(g.x, g.y, 72);
    ctx.font = "700 " + 13 * f + "px system-ui, sans-serif";
    const w = ctx.measureText(g.texto).width + 16 * f;
    ctx.fillStyle = "#fff"; caja(sx - w / 2, sy - 12 * f, w, 24 * f, 8 * f); ctx.fill();
    ctx.strokeStyle = "#5b4636"; ctx.lineWidth = 1.5; ctx.stroke();
    texto(g.texto, sx, sy, 13 * f, "#3b2a1a", "center");
  }
}
function dibujarMonedas() {
  const t = ahora(), f = ESC_UI;
  monedas = monedas.filter((c) => t - c.t0 < 1000);
  for (const c of monedas) {
    const a = (t - c.t0) / 1000, [sx, sy] = iso(c.x, c.y, 50);
    ctx.globalAlpha = 1 - a;
    texto("+" + dolares(c.monto), sx, sy - a * 40 * f, 17 * f, "#b8860b", "center");
    ctx.globalAlpha = 1;
  }
}

function dibujar() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.setTransform(camara.z, 0, 0, camara.z, -camara.vx * camara.z, -camara.vy * camara.z); // zoom y desplazamiento
  ctx.drawImage(fondo, -FOX, -FOY);
  // Todo se ordena por profundidad (x + y): lo más lejano primero, para que lo cercano tape a lo de atrás
  const cola = [];
  for (const m of mesas) {
    cola.push({ d: m.cx + m.cy, f: () => dibujarMesa(m) });
    for (const t of BANCAS) { const s = silla(m, t); cola.push({ d: s.x + s.y - 15, f: () => dibujarSilla(s, m, t) }); } // -15: la banca se pinta antes que las 2 personas sentadas en ella
  }
  cola.push({ d: 190 + DXK + KX, f: dibujarMostrador });
  cola.push({ d: 222 + DXK + KX, f: dibujarChef });
  cola.push({ d: 1002 + DX + DY, f: dibujarEscritorio });
  if (puerta2) cola.push({ d: 347 + DX, f: dibujarEscritorio2 });
  receps.forEach((r, k) => { if (r && (enTurno("recep") || r.g)) cola.push({ d: (k ? 318 : 975 + DY) + DX, f: () => dibujarRecepcionista(r, 400 + DX, k ? -84 : 572 + DY) }); });
  for (const id of Object.keys(HAB_NUEVAS)) { // adornos de las habitaciones nuevas
    if (habsExtra[id] === undefined) continue;
    HAB_NUEVAS[id].adornos.forEach(([dx, y0, em]) => { const x = habsExtra[id] + dx, y = y0 + LUGARES[id].y0 - 10; cola.push({ d: x + y, f: () => persona(em, x, y, 16, 30) }); });
  }
  if (habsExtra.generadores !== undefined) for (let i = 0; i < generadores; i++) { // generadores comprados, dentro de su sala
    const x = habsExtra.generadores + GEN_LUGARES[i][0], y = GEN_LUGARES[i][1];
    cola.push({ d: x + y + GEN_LADO, f: () => dibujarGenerador(x, y) });
  }
  DECORACIONES.filter((q) => decos.includes(q.id)).forEach((q) => q.lugares.forEach(([x, y]) => cola.push({ d: x + y, f: () => persona(q.ico, x, y, 18, 36) })));
  if (banioComprado) { // retretes y lavabo del baño (el lavabo va al fondo, lejos de la puerta)
    const [bx0, by0] = rectHab("banio");
    const CAB = { tapa: "#b0bec5", izq: "#78909c", der: "#546e7a" }; // cubículos grises
    [75, 115].forEach((dy) => { const x = bx0 + 12, y = by0 + dy; cola.push({ d: x + y + 40, f: () => {
      caja3d(ctx, x, y - 18, x + 38, y + 18, 44, CAB, "#37474f");
      const [p1x, p1y] = iso(x + 38, y - 12, 8), [p2x, p2y] = iso(x + 38, y + 12, 8), [p3x, p3y] = iso(x + 38, y + 12, 38), [p4x, p4y] = iso(x + 38, y - 12, 38);
      poly(ctx, [[p1x, p1y], [p2x, p2y], [p3x, p3y], [p4x, p4y]], "#90a4ae", "#37474f"); // puerta del cubículo
    } }); });
    cola.push({ d: bx0 + 160 + by0 + 30, f: () => { caja3d(ctx, bx0 + 150, by0 + 8, bx0 + 215, by0 + 30, 20, { tapa: "#eceff1", izq: "#b0bec5", der: "#90a4ae" }, "#546e7a"); const [lx, ly] = iso(bx0 + 182, by0 + 19, 22); emoji("🚰", lx, ly, 16 * ESCALA * 2); } });
  }
  for (const e of ents) cola.push({ d: e.x + e.y + 0.1, f: () => dibujarEnt(e) });
  cola.sort((a, b) => a.d - b.d).forEach((o) => o.f());
  dibujarGlobos();
  dibujarMonedas();
  recepcion.forEach((g) => { if (g && g.esperando) dibujarEspera(g); });
  if (llevando) emoji("🍽️", puntero.x, puntero.y - 26 * ESC_UI, 34 * ESC_UI); // el platillo que traes en la mano
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const osc = oscuridad(); // anochecer: se oscurece toda la escena
  if (osc > 0) { ctx.fillStyle = "rgba(10,20,60," + osc.toFixed(3) + ")"; ctx.fillRect(0, 0, CW, CH); }
  if (pausado) { ctx.fillStyle = "rgba(0,0,0,.55)"; caja(CW / 2 - 70, 8, 140, 30, 10); ctx.fill(); texto("⏸️ En pausa", CW / 2, 23, 16, "#fff", "center"); }
}

// ----- Bucle -----
let previo = ahora();
function cuadro() {
  const t = ahora();
  const dt = Math.min(0.05, (t - previo) / 1000);
  previo = t;
  if (esperas.length) { // las esperas vencidas se resuelven en orden (con el juego en pausa «ahora()» no avanza, así que no vence ninguna)
    const hoy = ahora(), vencidas = esperas.filter((w) => hoy >= w.fin).sort((a, b) => a.fin - b.fin);
    if (vencidas.length) { esperas = esperas.filter((w) => hoy < w.fin); vencidas.forEach((w) => { if (w.g === gen) w.r(); }); }
  }
  reloj += dt * 1000; // (con la tienda abierta «dt» es 0: el reloj también se pausa)
  const estado = estadoHorario(), abierto = estado === 2; // 2 = recibe clientes (9:30 AM a 11:00 PM), 1 = sin clientes nuevos hasta que se retire el personal, 0 = cerrado
  if (!abierto) { proxLlegada = Math.max(proxLlegada, reloj + 3000); proxAuto = Math.max(proxAuto, reloj + 3000); } // sin horario de clientes no llega nadie; al abrir, el primer cliente llega unos segundos después
  const min = Math.floor(minutoJuego());
  if (min !== ultimoMin) {
    ultimoMin = min;
    $("hora").textContent = fmtHora(min); $("dia").textContent = diaJuego();
    $("horario").textContent = estado === 2 ? "🟢 Abierto" : estado === 1 ? "🟡 Sin clientes nuevos" : "🔴 Cerrado";
  }
  if (ultimoAbierto !== null && estado !== ultimoAbierto) {
    info(estado === 2 ? "🌅 ¡El restaurante abrió! Recibe clientes de " + fmtHora(HORA_ABRE) + " a " + fmtHora(HORA_CLIENTES_FIN) + "."
      : estado === 1 ? "🌙 Son las " + fmtHora(HORA_CLIENTES_FIN) + ": ya no se aceptan clientes nuevos. El personal se retira a las " + fmtHora(HORA_CIERRA) + "."
      : "🌙 Son las " + fmtHora(HORA_CIERRA) + ": el personal se retiró. Mañana, limpieza de " + fmtHora(HORA_LIMPIEZA_LLEGA) + " a " + fmtHora(HORA_LIMPIEZA_SALE) + " y el resto del personal desde las " + fmtHora(HORA_PERSONAL_LLEGA) + ".");
  }
  ultimoAbierto = estado;
  turnoLimpieza();
  if (abierto && reloj >= proxLlegada) { llegar(OPCIONES[Math.floor(Math.random() * OPCIONES.length)]); proxLlegada = reloj + azar(LLEGADA_MIN_MS, LLEGADA_MAX_MS) / ((1 + bonoClientes()) * ritmoLlegadas()); }
  if (abierto && reloj >= proxAuto) { llegarAuto(); proxAuto = reloj + azar(AUTO_MIN_MS, AUTO_MAX_MS) / ((1 + bonoClientes()) * ritmoLlegadas()); }
  const seg = Math.floor(reloj / 1000);
  if (seg !== ultimoSeg) { ultimoSeg = seg; $("tiempo").textContent = fmtTiempo(seg); }
  for (const e of ents) {
    if (!e.ruta.length) continue;
    const [tx, ty] = e.ruta[0];
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy), paso = ((e.vel || VEL) * dt) / ESCALA;
    if (e.coche && d > 0) e.eje = Math.abs(dx) >= Math.abs(dy) ? "x" : "y"; // el auto apunta hacia donde avanza
    if (d <= paso) {
      e.x = tx; e.y = ty; e.ruta.shift();
      if (!e.ruta.length && e.fin) { const f = e.fin; e.fin = null; f(); }
    } else { e.x += (dx / d) * paso; e.y += (dy / d) * paso; }
  }
  for (const g of recepcion) { // la recepcionista tarda TIEMPO_RECEP_MS en atender a cada grupo y ver si hay mesa; nadie se enoja ni se va por esperar
    if (g && g.esperando && reloj - g.desde >= TIEMPO_RECEP_MS) resolverRecepcion(g);
  }
  receps.forEach((r, k) => { // la recepcionista de cada puerta se ve atendiendo al grupo que más lleva esperando (solo es visual: el tiempo lo lleva cada grupo)
    if (!r) return;
    if (r.g && !r.g.esperando) r.g = null;
    if (!r.g) { const g = recepcion.filter((x) => x && x.esperando && x.pu === k).sort((a, b) => a.desde - b.desde)[0]; if (g) { r.g = g; r.t0 = g.desde; } }
  });
  for (const w of meseros) { // cada mesero libre va por el platillo que más lleva esperando (sin repetir el que otro ya va a buscar)
    if (!w) continue;
    w.ent.oculto = !enTurno("mesero") && !w.ocupado; // fuera de su horario no se ve (si va con un platillo, termina antes de irse)
    if (w.ocupado || !enTurno("mesero")) continue;
    const m = mesas.filter((x) => x.esperando && !x.tomado && x.reservadoPor !== x.listoDesde).sort((a, b) => a.listoDesde - b.listoDesde)[0];
    if (m) servir(m, w);
  }
  dibujar();
  requestAnimationFrame(cuadro);
}

// ----- Sesión con Google (opcional: sin ella el juego funciona, pero no guarda puntos) -----
let J = null;
const zona = $("sesion");
zona.textContent = "Conectando…";
// En segundo plano: si Firebase tarda (o no hay internet) los botones del menú funcionan igual; la sesión aparece cuando termina de cargar
import("../compartido/jugador.js").then((m) => {
  J = m;
  J.alCambiarSesion((u) => {
    usuario = u; perfilDatos = null; pintarBotonPerfil(); if (vistaPerfil && !$("tienda").hidden) cargarPerfil();
    zona.innerHTML = "";
    const b = document.createElement("button");
    b.className = "btn";
    if (!u) {
      b.textContent = "Entrar con Google";
      b.addEventListener("click", () => J.entrar().catch((e) => alert(e.message)));
      zona.appendChild(b);
      return;
    }
    const t = document.createElement("span");
    t.textContent = (u.displayName || "Jugador") + " · ";
    b.textContent = "Salir";
    b.addEventListener("click", J.salir);
    zona.append(t, b);
  });
}).catch(() => { zona.textContent = "Sin sesión"; });

// ----- Vista: zoom (➕ ➖, rueda, pellizco) y desplazamiento (arrastrar) -----
// La lógica y el dibujo trabajan en «coordenadas base» (las de iso()); la cámara solo cambia cómo se ven en el lienzo.
const camara = { z: ZOOM_INICIAL, vx: 0, vy: 0 }; // vx, vy: esquina superior izquierda de lo que se ve, en coordenadas base
ctx.imageSmoothingQuality = "high";
const aBase = (p) => [camara.vx + p[0] / camara.z, camara.vy + p[1] / camara.z];
function limitarCamara() {
  const vw = CW / camara.z, vh = CH / camara.z;
  camara.vx = Math.max(VISTA.x0, Math.min(camara.vx, VISTA.x1 - vw));
  camara.vy = Math.max(VISTA.y0, Math.min(camara.vy, VISTA.y1 - vh));
}
function centrarCamara() {
  camara.vx = CENTRO_VISTA[0] - CW / camara.z / 2;
  camara.vy = CENTRO_VISTA[1] - CH / camara.z / 2;
  limitarCamara();
}
// El lienzo ocupa casi toda la pantalla: su ancho (CW) se ajusta a la forma del espacio disponible para que nada se estire; el alto (CH) no cambia
function ajustarLienzo() {
  const r = lienzo.getBoundingClientRect();
  if (!(r.width > 0 && r.height > 0)) return;
  const nuevo = Math.max(240, Math.min(1600, Math.round((CH * r.width) / r.height)));
  if (nuevo === CW) return;
  const cx = camara.vx + CW / camara.z / 2, cy = camara.vy + CH / camara.z / 2; // lo que se estaba viendo en el centro
  CW = nuevo;
  lienzo.width = CW; // al cambiar el tamaño el lienzo se borra; se vuelve a dibujar en el siguiente cuadro
  camara.vx = cx - CW / camara.z / 2;
  limitarCamara();
}
addEventListener("resize", ajustarLienzo);
addEventListener("orientationchange", () => setTimeout(ajustarLienzo, 250));
ajustarLienzo();
// Cambia el zoom dejando quieto el punto (fx, fy) del lienzo
function zoomEn(z, fx, fy) {
  z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  const [bx, by] = aBase([fx, fy]);
  camara.z = z;
  camara.vx = bx - fx / z;
  camara.vy = by - fy / z;
  limitarCamara();
}
// Un toque (sin arrastrar) ejecuta la acción al soltar; arrastrar mueve la vista y dos dedos hacen zoom
const dedos = new Map(); // id del puntero → posición en el lienzo
let gesto = null;        // { inicio, movido, d0, z0 }
const dosDedos = () => { const [a, b] = [...dedos.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
lienzo.addEventListener("pointerdown", (e) => {
  try { lienzo.setPointerCapture(e.pointerId); } catch (err) {}
  dedos.set(e.pointerId, posEnLienzo(e));
  if (dedos.size === 1) gesto = { inicio: posEnLienzo(e), movido: false };
  else if (gesto && dedos.size === 2) { gesto.movido = true; gesto.d0 = dosDedos(); gesto.z0 = camara.z; }
});
lienzo.addEventListener("pointermove", (e) => {
  const p = posEnLienzo(e), b = aBase(p);
  puntero = { x: b[0], y: b[1] };
  const previo = dedos.get(e.pointerId);
  if (!previo || !gesto) return;
  dedos.set(e.pointerId, p);
  if (dedos.size === 2) {
    const [a, c] = [...dedos.values()];
    if (gesto.d0 > 0) zoomEn(gesto.z0 * dosDedos() / gesto.d0, (a[0] + c[0]) / 2, (a[1] + c[1]) / 2);
  } else if (dedos.size === 1) {
    const umbral = (UMBRAL_ARRASTRE_PX * CW) / lienzo.getBoundingClientRect().width;
    if (!gesto.movido && Math.hypot(p[0] - gesto.inicio[0], p[1] - gesto.inicio[1]) > umbral) gesto.movido = true;
    if (gesto.movido) { camara.vx -= (p[0] - previo[0]) / camara.z; camara.vy -= (p[1] - previo[1]) / camara.z; limitarCamara(); }
  }
});
function soltar(e) {
  if (!dedos.delete(e.pointerId) || dedos.size) return;
  const g = gesto;
  gesto = null;
  if (g && !g.movido && e.type === "pointerup") { const [x, y] = aBase(posEnLienzo(e)); tocar(x, y); }
}
lienzo.addEventListener("pointerup", soltar);
lienzo.addEventListener("pointercancel", soltar);
lienzo.addEventListener("wheel", (e) => { e.preventDefault(); const [x, y] = posEnLienzo(e); zoomEn(camara.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), x, y); }, { passive: false });
$("acercar").addEventListener("click", () => zoomEn(camara.z + PASO_ZOOM, CW / 2, CH / 2));
$("alejar").addEventListener("click", () => zoomEn(camara.z - PASO_ZOOM, CW / 2, CH / 2));
$("centrar").addEventListener("click", centrarCamara);
$("cerrarTienda").addEventListener("click", cerrarTienda);
let btnEmpleados = $("btnEmpleados"); // botón anclado a la pantalla (no al mapa): se ve igual aunque muevas o acerques la vista
if (!btnEmpleados) { // si index.html es una versión vieja sin el botón, se crea desde aquí para que el personal nunca quede sin pantalla
  btnEmpleados = document.createElement("button");
  btnEmpleados.id = "btnEmpleados";
  btnEmpleados.className = "btn";
  btnEmpleados.textContent = "👥 Empleados";
  btnEmpleados.setAttribute("aria-label", "Empleados");
  btnEmpleados.style.cssText = "position:fixed;z-index:90;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));box-shadow:0 4px 14px rgba(0,0,0,.45)";
  (lienzo.parentNode || document.body).appendChild(btnEmpleados);
  const barra = document.querySelector(".barra");
  if (barra) barra.style.paddingRight = "150px"; // deja libre la esquina para el botón
}
{
  btnEmpleados.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (!$("tienda").hidden && vistaEmpleados) cerrarTienda();
  else abrirTienda(null, true);
  });
}
let btnPerfil = $("btnPerfil"); // botón redondo de la esquina superior derecha (foto de tu cuenta de Google, o 👤 si no hay sesión)
if (!btnPerfil) { // si index.html es una versión vieja sin el botón, se crea desde aquí
  btnPerfil = document.createElement("button");
  btnPerfil.id = "btnPerfil";
  btnPerfil.className = "btn";
  btnPerfil.setAttribute("aria-label", "Perfil del jugador");
  btnPerfil.style.cssText = "position:fixed;z-index:90;top:calc(8px + env(safe-area-inset-top,0px));right:calc(8px + env(safe-area-inset-right,0px));width:38px;height:38px;padding:0;border-radius:50%;overflow:hidden;font-size:1.2rem;box-shadow:0 4px 14px rgba(0,0,0,.45)";
  (lienzo.parentNode || document.body).appendChild(btnPerfil);
  btnEmpleados.style.top = "calc(54px + env(safe-area-inset-top,0px))"; // el de Empleados baja para dejarle su lugar
}
function pintarBotonPerfil() {
  btnPerfil.textContent = "";
  if (usuario && usuario.photoURL) {
    const im = document.createElement("img");
    im.src = usuario.photoURL; im.alt = ""; im.referrerPolicy = "no-referrer";
    im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
    im.addEventListener("error", () => { btnPerfil.textContent = "👤"; });
    btnPerfil.appendChild(im);
  } else btnPerfil.textContent = "👤";
  btnPerfil.title = usuario ? (usuario.displayName || "Jugador") : "Perfil";
}
pintarBotonPerfil();
btnPerfil.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (!$("tienda").hidden && vistaPerfil) cerrarTienda();
  else abrirTienda(null, false, false, false, true);
});
let btnAnuncios = $("btnAnuncios"); // si index.html no lo trae, se crea aquí junto al botón Reiniciar
if (!btnAnuncios) {
  btnAnuncios = document.createElement("button");
  btnAnuncios.id = "btnAnuncios";
  btnAnuncios.className = "btn";
  btnAnuncios.textContent = "📢 Anuncios";
  const rei2 = $("reiniciar");
  if (rei2 && rei2.parentNode) rei2.parentNode.insertBefore(btnAnuncios, rei2); else document.body.appendChild(btnAnuncios);
}
btnAnuncios.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (!$("tienda").hidden && vistaAnuncios) cerrarTienda();
  else abrirTienda(null, false, false, true);
});
// ----- Botón «🏗️ Construir»: habitaciones y decoraciones -----
let btnConstruir = $("btnConstruir"); // si index.html no lo trae, se crea aquí junto a «Reiniciar»
if (!btnConstruir) {
  btnConstruir = document.createElement("button");
  btnConstruir.id = "btnConstruir";
  btnConstruir.className = "btn";
  btnConstruir.textContent = "🏗️ Construir";
  btnConstruir.title = "Comprar habitaciones y decoraciones";
  const rei3 = $("reiniciar");
  if (rei3 && rei3.parentNode) rei3.parentNode.insertBefore(btnConstruir, rei3); else document.body.appendChild(btnConstruir);
}
btnConstruir.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (!$("tienda").hidden && vistaConstruir) { cerrarTienda(); return; }
  abrirTienda(null, false, true);
});
// ----- BOTÓN TEMPORAL DE PRUEBAS: «+$1,000» -----
// Sirve para probar el progreso sin esperar. Suma a «dinero» (lo que gastas), NO a «ganado»: no cuenta para puntos ni récord.
// Para quitarlo: pon BOTON_DINERO_PRUEBA en false (o borra este bloque).
const BOTON_DINERO_PRUEBA = true;
const DINERO_PRUEBA = 1000;
if (BOTON_DINERO_PRUEBA) {
  const bp = document.createElement("button");
  bp.id = "btnDineroPrueba";
  bp.className = "btn";
  bp.textContent = "💵 +" + dolares(DINERO_PRUEBA);
  bp.title = "Botón temporal de pruebas";
  bp.addEventListener("click", () => {
    if ($("menu").hidden === false || ranura === null) return; // solo mientras juegas una partida
    dinero += DINERO_PRUEBA;
    info("💵 Prueba: recibiste " + dolares(DINERO_PRUEBA) + ".");
    actualizar();
  });
  const rei2 = $("reiniciar");
  if (rei2 && rei2.parentNode) rei2.parentNode.insertBefore(bp, rei2); else document.body.appendChild(bp);
}
$("reiniciar").addEventListener("click", () => {
  if (!confirm("¿Empezar de cero esta partida?" + (ranura !== null ? " Se perderá lo que tienes guardado en la Partida " + (ranura + 1) + "." : ""))) return;
  enviarPuntos(true); // antes de empezar de cero, manda los puntos que falten
  nuevaPartida();     // (actualizar() guarda enseguida la partida en blanco en la misma ranura)
});

// ----- Menú inicial y partidas guardadas -----
const menu = $("menu");
let modoPartidas = "guardadas"; // la cuadrícula se abre desde «Nueva partida» ("nueva": elegir dónde crearla) o desde «Partidas guardadas» ("guardadas")
function mostrarMenu(vista = "inicio", modo = null) {
  if (modo) modoPartidas = modo;
  if (ranura !== null) { enviarPuntos(true); guardarPartida(); }
  ranura = null; // en el menú no se autoguarda nada
  cerrarTienda();
  ponerPausa(true);
  menu.hidden = false;
  $("menuInicio").hidden = vista !== "inicio";
  $("menuJugar").hidden = vista !== "jugar";
  $("menuPartidas").hidden = vista !== "partidas";
  if (vista === "partidas") pintarPartidas();
}
// Abre la ranura i: si tiene partida la carga; si está vacía empieza una nueva
function empezar(i) {
  ranura = i;
  nuevaPartida(leerTodo().ranuras[i]);
  guardarPartida();
  menu.hidden = true;
  ponerPausa(false);
  centrarCamara();
  info("💾 Jugando en la Partida " + (i + 1) + ": se guarda sola.");
}
const minimo = (...p) => { const e = document.createElement(p[0]); if (p[1]) e.className = p[1]; if (p[2] !== undefined) e.textContent = p[2]; return e; };
function pintarPartidas() {
  const t = leerTodo(), cont = $("listaPartidas"), esNueva = modoPartidas === "nueva";
  const poner = (id, txt) => { const e = $(id); if (e) e.textContent = txt; }; // si index.html es una versión vieja sin estos elementos, no se rompe
  poner("tituloPartidas", esNueva ? "🆕 Nueva partida" : "💾 Partidas guardadas");
  poner("avisoRanuras", esNueva
    ? "Elige un recuadro para crear tu partida: ahí se guardarán tus mejoras, mesas, terrenos y compras."
    : "Elige una partida para continuar, o un recuadro vacío para crear una nueva.");
  cont.innerHTML = "";
  t.ranuras.forEach((d, i) => {
    const caja = minimo("div", "ranura" + (d ? " llena" : " vacia"));
    caja.appendChild(minimo("b", "", "💾 Partida " + (i + 1)));
    const botones = minimo("div", "ranura-botones");
    const boton = (txt, fn, sec) => { const b = minimo("button", "btn" + (sec ? " sec" : ""), txt); b.addEventListener("click", fn); botones.appendChild(b); };
    if (!d) {
      caja.appendChild(minimo("small", "", "Vacía"));
      boton("➕ Crear aquí", () => crearEn(i));
    } else {
      const mes = Array.isArray(d.mesas) ? d.mesas : [];
      const mejoras = mes.reduce((tot, m) => tot + MEJORAS_MESA.reduce((s2, c) => s2 + Math.max(0, Math.min(nivMax(c), Math.floor(num(m.mejoras && (m.mejoras[c.id] !== undefined ? m.mejoras[c.id] : m.mejoras[c.viejo])))) - (m.nv === MESA_NV ? c.inicial : 0)), 0), 0);
      const rec = (Array.isArray(d.receps) ? d.receps : []).filter((n) => num(n) > 0).length;
      const mer = (Array.isArray(d.meseros) ? d.meseros : []).filter((n) => num(n) > 0).length;
      const nLotes = Array.isArray(d.lotes) ? d.lotes.length : d.lote ? 1 : 0;
      const lineas = [
        "💰 $" + fmt(Math.max(0, Math.round(num(d.dinero) * 2) / 2)) + " dólares",
        "🪑 " + (Math.floor(num(d.nMesas)) || mes.length || MESAS_BASE.length) + " mesas · ✨ " + mejoras + " mejoras de mesa",
        "👨‍🍳 " + (d.cocinero === undefined || num(d.cocinero) > 0 ? "Cocinero nivel " + (Math.floor(num(d.cocinero)) || 1) : "Sin cocinero") + (num(d.cocinero2) > 0 ? " · 👩‍🍳 2.º nivel " + Math.floor(num(d.cocinero2)) : ""),
        "🧑‍💼 " + rec + " recepcionista(s) · 🤵 " + mer + " mesero(s)",
        "🅿️ " + (Math.floor(num(d.nEstac)) || ESTAC_INICIALES) + " lugares" + (nLotes ? " · 🌱 " + (nLotes + 1) + " de " + (TERRENO_PRECIOS.length + 1) + " terrenos" : "") + (d.puerta2 ? " · 🚪 segunda puerta" : ""),
        "⏱️ " + fmtTiempo(Math.floor(num(d.reloj) / 1000)) + (d.fecha ? " · " + new Date(num(d.fecha)).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : ""),
      ];
      lineas.forEach((l) => caja.appendChild(minimo("small", "", l)));
      boton("▶️ Continuar", () => empezar(i));
      if (esNueva) boton("♻️ Empezar de cero", () => {
        if (!confirm("¿Empezar de cero en la Partida " + (i + 1) + "? Se perderá lo que tienes guardado ahí.")) return;
        crearEn(i);
      }, true);
      boton("🗑️ Borrar", () => {
        if (!confirm("¿Borrar la Partida " + (i + 1) + "? No se puede deshacer.")) return;
        const x = leerTodo(); x.ranuras[i] = null; escribirTodo(x); pintarPartidas();
      }, true);
    }
    caja.appendChild(botones);
    cont.appendChild(caja);
  });
}
// Partidas guardadas: apágalas/enciéndelas aquí. En false el botón sale desactivado («No disponible de momento»); en true abre la lista de partidas.
const PARTIDAS_GUARDADAS_DISPONIBLES = true;
// Crea una partida nueva (de cero) en la ranura i y empieza a jugar: queda guardada ahí con todas sus mejoras y compras
function crearEn(i) {
  ranura = i;
  nuevaPartida();
  guardarPartida();
  menu.hidden = true;
  ponerPausa(false);
  centrarCamara();
  info("💾 Partida " + (i + 1) + " creada: se guarda sola.");
}
$("jugar").addEventListener("click", () => mostrarMenu("jugar"));
$("btnNueva").addEventListener("click", () => mostrarMenu("partidas", "nueva"));
$("atrasJugar").addEventListener("click", () => mostrarMenu("inicio"));
$("btnPartidas").disabled = !PARTIDAS_GUARDADAS_DISPONIBLES;
$("avisoPartidas").hidden = PARTIDAS_GUARDADAS_DISPONIBLES;
if (PARTIDAS_GUARDADAS_DISPONIBLES) $("btnPartidas").addEventListener("click", () => mostrarMenu("partidas", "guardadas"));
$("volverMenu").addEventListener("click", () => mostrarMenu("jugar"));
$("menuBtn").addEventListener("click", () => mostrarMenu("inicio"));

centrarCamara();
armarFondo();
nuevaPartida(); // fondo del juego detrás del menú; no se guarda (ranura = null) hasta que elijas «Jugar» o una partida
mostrarMenu();
requestAnimationFrame(cuadro);
