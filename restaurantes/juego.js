// Ruta: restaurantes/juego.js
// «Restaurantes» (vista isométrica estilo Clash of Clans): los grupos de clientes (1, 2 o 4) llegan SOLOS y al azar durante la jornada.
// Esperan frente a la recepción: TÚ tocas a la familia para darles una mesa. Si no hay mesa libre esperan 8 s (a los 5 s se enojan 😡) y luego se van; si tardas mucho en atenderlos, también se van enojados.
// Ya sentados piden, la cocina prepara y TÚ llevas el platillo a mano (clic en la cocina para tomarlo, clic en la mesa para entregarlo).
// Si tardas, se enojan y se van. Al terminar de comer se levantan TODOS y la mesa queda libre; algunos van al baño (cuesta 1 dólar) y
// los demás van directo a la recepción. Cada uno paga 5 dólares al salir (más lo que sumen las mejoras de SU mesa, que se tocan en la mesa; quien usó el baño paga además 1 dólar).
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
// TERRENOS: el restaurante ocupa la esquina inferior derecha de una cuadrícula de 3 × 3 manzanas; las otras 8 son pasto (sin carreteras entre ellas), a la izquierda y detrás.
// Los terrenos se compran en la tienda («Ampliar terreno»): las 8 manzanas de pasto son los terrenos 2.º a 9.º y se compran de uno en uno, solo los que tocan tu terreno actual (el restaurante o uno ya comprado).
// El precio sube con cada terreno (ver TERRENO_PRECIOS: $10,000 el 2.º ... $500,000 el 9.º). Las manzanas de pasto están en PASTO.
// HABITACIONES: la cocina, el baño y las nuevas (cafetería, heladería y pastelería, $20,000 cada una en «🏗️ Construir») van en la pared del fondo y se pueden cambiar de lugar con «🛠️ Mover»
// (ver errorHab: no pueden tapar el pasillo del centro ni empalmarse entre sí). Al terminar de comer, cada cliente va a 0-4 de esos lugares (ver PESOS_VISITAS) y gasta en cada uno.
// DECORACIONES: también en «🏗️ Construir»; cada una suma dinero a lo que paga cada cliente (ver DECORACIONES).
const ID = "restaurantes";

// ----- ESCALA: tamaño de los objetos respecto a la cuadra -----
// 1 = como antes. 0.5 = TODO lo que hay en la cuadra (mesas, sillas, gente, cocina, baño, recepción, autos, estacionamiento...) mide la MITAD respecto a la cuadra:
// la cuadra queda 2 veces más grande (en objetos) y caben muchas más mesas y cosas. Distribución, velocidades, zoom y toques se calculan a partir de este número (prueba 0.4, 0.6, 1...).
const ESCALA = 0.5;
const ESC_UI = (ESCALA + 1) / 2; // textos, globos y barras se encogen menos que los objetos, para que se sigan leyendo

// ----- Ajustes -----
// El juego NO tiene fin: los clientes llegan sin parar y se puede jugar el tiempo que quieras (el reloj solo cuenta cuánto llevas jugando).
const PRIMERA_LLEGADA_MS = 1500;  // cuándo llega el primer grupo
const LLEGADA_MIN_MS = 4000;      // los grupos llegan al azar: entre un grupo y el siguiente pasan entre estos dos tiempos
const LLEGADA_MAX_MS = 9000;
const OPCIONES = [1, 2, 4];       // clientes que pueden llegar en cada grupo
const ENOJO_RECEP_MS = 7000;      // un grupo esperando en la recepción sin que lo atiendas se ve enojado desde aquí...
const PACIENCIA_RECEP_MS = 12000; // ...y a estos ms se va sin entrar
const ENOJO_SIN_MESA_MS = 5000;      // si llegan y todas las mesas están ocupadas: a estos ms de espera aparece el 😡 sobre sus cabezas...
const PACIENCIA_SIN_MESA_MS = 8000;  // ...y a estos ms (8 s en total) se van sin entrar
const PAGO_POR_CLIENTE = 5;       // dólares que paga cada cliente (con mesas y sillas de nivel 1)
const COSTO_BANIO = 1;            // dólares que cuesta usar el baño
const ENOJO_MS = 8000;            // desde estos ms de espera (con el platillo ya listo) los clientes se ven enojados
const PACIENCIA_MS = 15000;       // a estos ms sin recibir el platillo, los clientes se van sin pagar
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
const PRECIO_COCINERO2 = 1500; // segundo cocinero (usa los mismos 10 niveles y precios de mejora que el primero)
const MESA_PRECIOS = [30, 60, 100, 160, 240, 350, 500, 700, 900, 1150, 1450, 1800]; // una por cada mesa nueva (12)
const RECEP_PRECIOS_MEJORA = [10, 20, 30, 45, 65, 90, 125, 170, 230]; // costo de subir al nivel 2, 3, 4 ... 10 de la recepcionista
const MESERO_PRECIOS_MEJORA = [10, 20, 30, 45, 65, 90, 125, 170, 230]; // ídem para el mesero
const PAUSA_MESERO_MS = 400;                             // ms que se detiene a tomar el platillo
// Mejoras de cada mesa: se tocan en la mesa misma (no en la tienda) y cada mesa se mejora POR SEPARADO.
// Cada cosa se puede mejorar 5 veces; cada mejora suma a lo que paga cada cliente que use ESA mesa: 50 centavos las dos primeras, 1 dólar la 3.ª y la 4.ª, y 1.50 dólares la 5.ª.
const BONO_MEJORAS = [0.5, 0.5, 1, 1, 1.5];   // lo que suma la 1.ª, 2.ª, 3.ª, 4.ª y 5.ª mejora de cada cosa (por cliente)
const PRECIOS_MEJORA = [10, 15, 25, 40, 60];  // lo que cuesta cada una de esas 5 mejoras
const MEJORAS_MESA = [
  { id: "mesa", ico: "🪑", nombre: "Mesa", precios: PRECIOS_MEJORA },
  { id: "sillas", ico: "💺", nombre: "Sillas", precios: PRECIOS_MEJORA },
  { id: "cubiertos", ico: "🍴", nombre: "Cubiertos", precios: PRECIOS_MEJORA },
  { id: "bebidas", ico: "🥤", nombre: "Bebidas", precios: PRECIOS_MEJORA },
  { id: "servilletas", ico: "🧻", nombre: "Servilletas", precios: PRECIOS_MEJORA },
];
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
const PRIMER_AUTO_MS = 3000;     // cuándo pasa el primer auto
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
const W = Math.round(W0 / ESCALA), H = Math.round(H0 / ESCALA);
const ACERA = 40, CALLE = 120;              // ancho de la acera y de las calles (en unidades de objeto)
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
// La cocina y el baño se pueden mover a lo largo de la pared del fondo (botón «🛠️ Mover»). KX y BX son cuánto se corrió cada uno respecto a su lugar de siempre.
const COC_X0 = 10 + DX, COC_ANCHO = 250;     // cocina: x de su esquina izquierda y ancho (lugar de siempre)
const BAN_X0 = 330 + DX, BAN_ANCHO = 220;    // baño: ídem
const HAB_Y0 = 10, HAB_Y1 = 160;             // de dónde a dónde (en y) van los dos cuartos
let KX = 0, BX = 0;
let PUERTA_COCINA, COCINA_DENTRO, RECT_COCINA, PUERTA_BANIO;
function recalcHab() {
  PUERTA_COCINA = [225 + DX + KX, 185];
  COCINA_DENTRO = [225 + DX + KX, 140];      // dentro de la cocina, frente a la puerta
  RECT_COCINA = [10 + DX + KX, HAB_Y0, 260 + DX + KX, HAB_Y1];
  PUERTA_BANIO = [430 + DX + BX, 185];
}
recalcHab();
// Habitaciones nuevas: se compran en «🏗️ Construir» y van en la pared del fondo (como la cocina y el baño; se mueven con «🛠️ Mover»).
// gasto = lo que paga el cliente cada vez que pasa por ahí (como el baño, que cuesta COSTO_BANIO). adornos = [x relativo al cuarto, y, emoji].
const HAB_NUEVAS = {
  cafeteria: { nombre: "la cafetería", etiqueta: "Cafetería", ico: "☕", ancho: 150, precio: 20000, gasto: 10, piso: ["#fbe9d7", "#f3d9bd"], pared: "#c8a27a", colorTexto: "#5d4037", adornos: [[35, 70, "☕"], [115, 70, "🥐"]] },
  heladeria: { nombre: "la heladería", etiqueta: "Heladería", ico: "🍦", ancho: 150, precio: 20000, gasto: 8, piso: ["#fde4ef", "#f9c9de"], pared: "#e8a2c0", colorTexto: "#8e2a58", adornos: [[35, 70, "🍦"], [115, 70, "🍨"]] },
  pasteleria: { nombre: "la pastelería", etiqueta: "Pastelería", ico: "🍰", ancho: 150, precio: 20000, gasto: 12, piso: ["#fff4c2", "#ffe9a0"], pared: "#e6c96a", colorTexto: "#7a5c00", adornos: [[35, 70, "🍰"], [115, 70, "🎂"]] },
};
let habsExtra = {}; // habitaciones nuevas compradas: id → x de su esquina izquierda
const x0Hab = (id) => (id === "cocina" ? COC_X0 + KX : id === "banio" ? BAN_X0 + BX : habsExtra[id]);
const anchoHab = (id) => (id === "cocina" ? COC_ANCHO : id === "banio" ? BAN_ANCHO : HAB_NUEVAS[id].ancho);
const nombreHab = (id) => (id === "cocina" ? "la cocina" : id === "banio" ? "el baño" : HAB_NUEVAS[id].nombre);
const habsPuestas = () => ["cocina", "banio", ...Object.keys(HAB_NUEVAS).filter((id) => habsExtra[id] !== undefined)];
const posHabs = () => Object.fromEntries(habsPuestas().map((id) => [id, x0Hab(id)]));
// Puerta (por donde se entra, en el pasillo de enfrente) y lugar dentro del cuarto
const puertaHab = (id) => (id === "cocina" ? PUERTA_COCINA : id === "banio" ? PUERTA_BANIO : [x0Hab(id) + HAB_NUEVAS[id].ancho / 2, 185]);
const dentroHab = (id, i) => (id === "banio" ? [400 + DX + BX + i * 22, 120] : [x0Hab(id) + 35 + (i % 4) * 26, 120]);
// ¿Se puede poner la habitación «cual» con su esquina izquierda en x0, estando las demás en «pos» (id → x0)? Devuelve el motivo si no, o "" si sí.
function errorHab(cual, x0, pos = posHabs()) {
  const x1 = x0 + anchoHab(cual);
  if (x0 < 10 || x1 > W - 10) return "No cabe ahí: se saldría del restaurante.";
  if (x0 < HALL_X + 50 && x1 > HALL_X - 20) return "Ahí estorbaría el pasillo del centro, por donde entran los clientes.";
  for (const [id, ox] of Object.entries(pos)) {
    if (id !== cual && x0 < ox + anchoHab(id) + 10 && x1 + 10 > ox) return "Ahí se empalmaría con " + nombreHab(id) + ".";
  }
  return "";
}
// Primer lugar libre (de izquierda a derecha) para una habitación nueva, o null si no cabe
function lugarLibreHab(id) {
  for (let x0 = 10; x0 + anchoHab(id) <= W - 10; x0 += 10) if (!errorHab(id, x0)) return x0;
  return null;
}
// Si no hay un hueco suficiente, busca un reacomodo de TODAS las habitaciones (cada lado del pasillo, una junto a otra) que deje lugar a «nueva» y mueva lo menos posible.
// Devuelve { id: x0 } o null si de plano no caben.
function reacomodoHabs(nueva) {
  const ids = [...habsPuestas(), ...(nueva ? [nueva] : [])];
  const orden = (id) => (id === nueva ? W : x0Hab(id)); // la nueva se pone al final de su lado
  const zonas = [[10, HALL_X - 20], [HALL_X + 50, W - 10]]; // [donde empieza, donde termina] cada lado del pasillo central
  let mejor = null;
  for (let mascara = 0; mascara < 1 << ids.length; mascara++) {
    const lados = [[], []], pos = {};
    ids.forEach((id, k) => lados[(mascara >> k) & 1].push(id));
    let cabe = true;
    lados.forEach((grupo, z) => {
      let x = zonas[z][0];
      for (const id of grupo.sort((a, b) => orden(a) - orden(b))) { pos[id] = x; x += anchoHab(id) + 10; }
      if (x - 10 > zonas[z][1]) cabe = false;
    });
    if (!cabe) continue;
    const costo = ids.reduce((t, id) => t + (id === nueva ? 0 : Math.abs(pos[id] - x0Hab(id))), 0);
    if (!mejor || costo < mejor.costo) mejor = { pos, costo };
  }
  return mejor && mejor.pos;
}
// Pone las habitaciones en las posiciones de «pos» (id → x0); quien estaba dentro de una que se mueve se va con ella
function aplicarPosHabs(pos) {
  const cambios = [];
  for (const id of habsPuestas()) {
    const dx = (pos[id] === undefined ? x0Hab(id) : pos[id]) - x0Hab(id);
    if (dx) cambios.push([[x0Hab(id), HAB_Y0, x0Hab(id) + anchoHab(id), HAB_Y1], dx]);
  }
  desplazarEntes(cambios);
  for (const id of Object.keys(pos)) {
    if (id === "cocina") KX = pos[id] - COC_X0; else if (id === "banio") BX = pos[id] - BAN_X0; else habsExtra[id] = pos[id];
  }
  recalcHab();
}
// Decoraciones: cada una que compras suma «bono» dólares a lo que paga CADA cliente (se ven en los costados del comedor)
const DECORACIONES = [
  { id: "plantas", ico: "🪴", nombre: "Plantas", precio: 2000, bono: 0.5, lugares: [[60, 330], [60, 780], [1060, 330], [1060, 780]] },
  { id: "cuadros", ico: "🖼️", nombre: "Cuadros", precio: 5000, bono: 1, lugares: [[130, 480], [130, 930], [990, 480], [990, 930]] },
  { id: "lamparas", ico: "💡", nombre: "Lámparas de pie", precio: 9000, bono: 1.5, lugares: [[60, 560], [60, 1010], [1060, 560], [1060, 1010]] },
  { id: "fuente", ico: "⛲", nombre: "Fuente", precio: 15000, bono: 2.5, lugares: [[80, 1170], [1040, 1170]] },
];
let decos = []; // ids de las decoraciones compradas
const bonoDeco = () => DECORACIONES.filter((d) => decos.includes(d.id)).reduce((t, d) => t + d.bono, 0);
const MESERO_POST = [HALL_X + 45, 210];     // dónde espera el mesero cuando no hay platillos listos
const MESERO_POST2 = [HALL_X - 45, 232];    // ídem para el segundo mesero
const MESAS_BASE = [
  { id: 1, cx: 150 + DX, cy: 290 }, { id: 2, cx: 410 + DX, cy: 290 },   // las mesas empiezan junto al núcleo; el resto del comedor queda libre para más mesas
  { id: 3, cx: 150 + DX, cy: 440 }, { id: 4, cx: 410 + DX, cy: 440 },
];
// El comedor tiene 16 mesas en 4 filas × 4 columnas (filas en y = 290, 440, 590 y 740; columnas en x = 0, 150, 410 y 560 + DX).
// Lugares de las mesas que se pueden comprar: primero las dos columnas de adentro (las de las mesas base), una fila (150 de alto) más abajo cada vez, y luego las dos de afuera. Se llenan en este orden.
const MESAS_EXTRA = [590, 740].flatMap((cy, f) => [
  { id: 5 + f * 2, cx: 150 + DX, cy }, { id: 6 + f * 2, cx: 410 + DX, cy },
]);
// Columnas de afuera (la 9.ª a la 16.ª): una a la izquierda de las mesas de la izquierda y otra a la derecha de las de la derecha, a 150 de las de adentro. «ext» = su camino
// pasa por los pasillos horizontales entre filas (y = fila - 70 y fila + 75), porque no pueden cruzar las mesas de adentro.
const MESAS_EXT = [290, 440, 590, 740].flatMap((cy, f) => [
  { id: 9 + f * 2, cx: 0 + DX, cy, ext: true }, { id: 10 + f * 2, cx: 560 + DX, cy, ext: true },
]);
const MESAS_TODAS = [...MESAS_BASE, ...MESAS_EXTRA, ...MESAS_EXT];
const ORDEN_SILLAS = ["cerca", "arriba", "abajo", "lejos"]; // 4 sillas por mesa; se ocupan en este orden
const CARAS = ["🧑", "👩", "👨", "🧓", "👧", "👦", "🧔", "👱"];

// ----- Terrenos que se pueden comprar (en el mapa plano) -----
// rect: zona que se pavimenta como plaza al comprarlo [x0, y0, x1, y1]; centro: donde se pone el cartel «En venta». Flechas = hacia dónde queda en pantalla.
// Cada manzana de pasto (PASTO) es un terreno; se identifica con su clave «i,j» (su lugar respecto a la del restaurante, que es 0,0).
// Pasos hacia ⬉ en pantalla = -i; pasos hacia ⬈ = -j. El nombre y la flecha salen de esos dos números.
const NOMBRES_LOTE = { // clave «-i,-j» → [flecha, nombre]
  "1,0": ["⬉", "Izquierda"], "0,1": ["⬈", "Atrás"], "1,1": ["⬆", "Fondo"],
  "2,0": ["⬉", "Izquierda lejana"], "0,2": ["⬈", "Atrás lejano"],
  "2,1": ["⬉", "Fondo izquierda"], "1,2": ["⬈", "Fondo derecha"], "2,2": ["⬆", "Esquina del fondo"],
};
const claveLote = (i, j) => i + "," + j;
const datosLote = (k) => { const [i, j] = k.split(",").map(Number), n = NOMBRES_LOTE[(-i) + "," + (-j)] || ["🌱", "Terreno"]; return { i, j, flecha: n[0], etiqueta: n[1] }; };
const ordenLote = (k) => { const [i, j] = k.split(",").map(Number); return (-i - j) * 10 - i; };
const precioTerreno = () => TERRENO_PRECIOS[lotes.length]; // undefined = ya compraste todos
// Terrenos que se pueden comprar con los terrenos «propios»: el pasto que toca el restaurante o uno ya comprado
function lotesDisponibles(propios = lotes) {
  const mio = (i, j) => (i === 0 && j === 0) || propios.includes(claveLote(i, j));
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
let reloj, proxLlegada, activos, ultimoSeg; // tiempo jugado (ms), cuándo llega el próximo grupo, grupos en el local
let llevando = null;                    // mesa cuyo platillo traes en la mano
let receps = [null, null], meseros = [null, null]; // personal contratado (null = todavía no): { nivel, ... }; [0] el de siempre, [1] el de la ampliación
let terreno2 = false, puerta2 = false;             // ampliación comprada / segunda puerta comprada
let lotes = []; // terrenos comprados (claves «i,j» de PASTO), en el orden en que se compraron
let usuario = null, perfilDatos = null, vistaPerfil = false; // jugador con sesión de Google (null = sin sesión), su perfil leído de Firebase, true = el panel abierto es el de «👤 Perfil»
let anuncios = {}, paginaWeb = false, vistaAnuncios = false; // anuncios: { id: momento del reloj en que termina }; página web comprada; true = el panel abierto es el de «📢 Anuncios»
let vistaConstruir = false; // true = el panel abierto es el de «🏗️ Construir» (habitaciones y decoraciones)
let modoMover = false, habSel = null, btnMover = null; // modo «🛠️ Mover» (cocina y baño): activo / cuarto elegido ("cocina" o "banio") / el botón
let puntosEnviados = 0, umbralPuntos = PUNTOS_LOTE, enviando = false; // puntos ya mandados al perfil, cuántos hacen falta para el siguiente envío, envío en curso
let ranura = null; // partida activa (0, 1 o 2); null = estás en el menú y no se guarda nada
let cocinero = 1, cocinero2 = 0, nMesas = MESAS_BASE.length; // nivel del cocinero (1 a 10), del segundo cocinero (0 = sin contratar) y mesas que hay en el comedor
let mesaMejora = null; // mesa cuyo panel de mejoras está abierto (null = la tienda de la recepción)
let vistaEmpleados = false; // true = el panel abierto es el de «Empleados» (botón fijo en la esquina de la pantalla)
const nuevasMejoras = () => Object.fromEntries(MEJORAS_MESA.map((c) => [c.id, 0])); // cuántas mejoras tiene cada cosa de una mesa (0 a 5)
const bonoAcum = (k) => BONO_MEJORAS.slice(0, k).reduce((t, b) => t + b, 0);        // lo que suman en total las primeras k mejoras
const bonoMesa = (m) => MEJORAS_MESA.reduce((t, c) => t + bonoAcum(m.mejoras[c.id]), 0); // extra por cliente de esa mesa
const pagoPorCliente = (m) => PAGO_POR_CLIENTE + bonoMesa(m) + bonoDeco();                        // lo que paga cada cliente que usa la mesa m
const totalMejoras = (m) => MEJORAS_MESA.reduce((t, c) => t + m.mejoras[c.id], 0);   // mejoras compradas en esa mesa (de 25 posibles)
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
// Espera que no continúa si se reinició la partida mientras tanto
const esp = (ms) => { const g = gen; return new Promise((r) => esperas.push({ fin: ahora() + ms, g, r })); };

const anuncioActivo = (a) => (anuncios[a.id] || 0) > reloj;
const bonoClientes = () => (paginaWeb ? BONO_WEB : 0) + ANUNCIOS.reduce((t, a) => t + (anuncioActivo(a) ? a.bono : 0), 0); // +X (0.06 = +6 %) de clientes que llegan
const crearMesa = (m) => ({ ...m, ocupada: false, plato: false, barra: null, esperando: false, tomado: false, enojo: false, listoDesde: 0, res: null, clientes: [], mejoras: nuevasMejoras(), slot: -1 });
function nuevaPartida(datos = null) { // datos: partida guardada que se carga (null = partida nueva)
  gen++; esperas = [];
  ents = []; globos = []; monedas = [];
  cocinero = 1; cocinero2 = 0; nMesas = MESAS_BASE.length;
  mesas = MESAS_BASE.map(crearMesa);
  recepcion = Array(SLOTS.length).fill(null);
  dinero = 0; ganado = 0; atendidos = 0; perdidos = 0; cocinando = 0; llevando = null; activos = 0; receps = [null, null]; meseros = [null, null];
  const habiaCambios = terreno2 || nEstac > ESTAC_INICIALES || KX !== 0 || BX !== 0 || Object.keys(habsExtra).length > 0; terreno2 = false; lotes = []; puerta2 = false; KX = 0; BX = 0; habsExtra = {}; decos = []; recalcHab(); salirMover();
  nEstac = ESTAC_INICIALES; autosPerdidos = 0; proxAuto = PRIMER_AUTO_MS;
  anuncios = {}; paginaWeb = false;
  CAJONES.forEach((k) => { k.usado = false; k.coche = null; k.pendientes = 0; });
  reloj = 0; proxLlegada = PRIMERA_LLEGADA_MS; ultimoSeg = -1; puntosEnviados = 0; umbralPuntos = PUNTOS_LOTE;
  if (datos) aplicarGuardado(datos);
  if (habiaCambios || datos) armarFondo(); // quita la plaza y los lugares de la partida anterior (o dibuja los de la partida cargada)
  cerrarTienda();
  $("tiempo").textContent = fmtTiempo(Math.floor(reloj / 1000));
  info("Los clientes llegan solos: toca a la familia en la recepción para darles mesa. Toca el mostrador 🛒 para comprar mesas, terreno y estacionamiento, una mesa para mejorarla, y 👥 Empleados (arriba a la derecha) para el personal.");
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
    mesas: mesas.map((m) => ({ id: m.id, mejoras: { ...m.mejoras } })),
    receps: receps.map((r) => (r ? r.nivel : 0)),
    meseros: meseros.map((w) => (w ? w.nivel : 0)),
    terreno2, lotes: lotes.slice(), kx: KX, bx: BX, habs: { ...habsExtra }, decos: decos.slice(), puerta2, nEstac, cocinero, cocinero2, nMesas,
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
  cocinero = Math.max(1, Math.min(COCINA_FACTOR.length, Math.floor(num(d.cocinero)) || 1));
  cocinero2 = Math.max(0, Math.min(COCINA_FACTOR.length, Math.floor(num(d.cocinero2)) || 0));
  nMesas = Math.max(MESAS_BASE.length, Math.min(MESAS_TODAS.length, Math.floor(num(d.nMesas)) || MESAS_BASE.length));
  for (let i = MESAS_BASE.length; i < nMesas; i++) mesas.push(crearMesa(MESAS_TODAS[i]));
  (Array.isArray(d.mesas) ? d.mesas : []).forEach((s) => {
    const m = s && mesas.find((x) => x.id === s.id);
    if (m && s.mejoras) MEJORAS_MESA.forEach((c) => (m.mejoras[c.id] = Math.max(0, Math.min(c.precios.length, Math.floor(num(s.mejoras[c.id]))))));
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
  { // cocina y baño movidos: solo si el lugar guardado es válido
    const kx = Math.round(num(d.kx) / 10) * 10, bx = Math.round(num(d.bx) / 10) * 10;
    if ((kx || bx) && !errorHab("cocina", COC_X0 + kx, { banio: BAN_X0 + bx }) && !errorHab("banio", BAN_X0 + bx, { cocina: COC_X0 + kx })) { KX = kx; BX = bx; }
    recalcHab();
    habsExtra = {}; // habitaciones nuevas y decoraciones: solo las válidas
    if (d.habs && typeof d.habs === "object") {
      for (const id of Object.keys(HAB_NUEVAS)) {
        const x0 = Math.round(num(d.habs[id]) / 10) * 10;
        if (d.habs[id] !== undefined && x0 > 0 && !errorHab(id, x0)) habsExtra[id] = x0;
      }
    }
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
  guardarPartida(); // autoguardado: cobros y compras pasan por aquí
  $("record").textContent = fmt(leerRecord());
  if (!$("tienda").hidden) pintarTienda();
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
function silla(m, tipo) {
  const lado = m.cx < HALL_X ? 1 : -1; // 1: la mesa está a la izquierda del pasillo
  if (tipo === "cerca") return { x: m.cx + 48 * lado, y: m.cy };
  if (tipo === "lejos") return { x: m.cx - 48 * lado, y: m.cy };
  if (tipo === "arriba") return { x: m.cx, y: m.cy - 48 };
  return { x: m.cx, y: m.cy + 48 };
}
// Camino desde la recepción hasta la silla i de la mesa m (siempre sale del pasillo, sin cruzar mesas)
function rutaIda(m, i, P = PUERTAS[0]) {
  const tipo = ORDEN_SILLAS[i], s = silla(m, tipo), E = P.entrada;
  if (m.ext) { // mesas de las columnas de afuera: por el pasillo de arriba (o el de abajo para la silla de abajo)
    const y = tipo === "abajo" ? m.cy + 75 : m.cy - 70;
    return [E, [HALL_X, y], [s.x, y], [s.x, s.y]];
  }
  if (tipo === "cerca") return [E, [HALL_X, m.cy], [s.x, s.y]];
  if (tipo === "lejos") return [E, [HALL_X, m.cy - 70], [s.x, m.cy - 70], [s.x, s.y]];
  return [E, [HALL_X, s.y], [s.x, s.y]];
}

// ----- Llegada de clientes (al azar) y atención en la recepción -----
const azar = (a, b) => a + Math.random() * (b - a);
const posEspera = (n, i, y) => [HALL_X + (i - (n - 1) / 2) * 34, y];

// Un grupo llega a la recepción. Hay que tocarlo para darle mesa; si no hay mesa o tardas, se va enojado
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
  const slot = SLOTS.findIndex((s, k) => s.p === pu && !recepcion[k]);

  if (slot < 0) { // los dos lugares de espera de esa puerta están ocupados: ni siquiera pasan de la puerta
    const g = { clientes, n, y: P.llenoY, pu };
    await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...camino, posEspera(n, i, g.y)]); }));
    await irseEnojados(g, "¡Todo está lleno!");
    return;
  }

  const g = { clientes, n, slot, pu, y: SLOTS[slot].y, esperando: false, enojo: false, desde: 0, res: null, razon: "", sinMesa: false, enojoMs: ENOJO_RECEP_MS, pacienciaMs: PACIENCIA_RECEP_MS };
  recepcion[slot] = g;
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 300); await ir(c, [...camino, posEspera(n, i, g.y)]); }));

  // Si todas las mesas están ocupadas NO se van de inmediato: esperan 8 s (a los 5 s se enojan) por si se libera una
  if (!mesas.some((m) => !m.ocupada)) { g.sinMesa = true; g.enojoMs = ENOJO_SIN_MESA_MS; g.pacienciaMs = PACIENCIA_SIN_MESA_MS; }
  const mesa = await esperarAtencion(g);                                                 // espera a que el jugador los toque
  if (!mesa) { await irseEnojados(g, g.sinMesa ? "¡No hay mesa!" : "¡Mucha espera!"); return; }

  recepcion[slot] = null;
  await Promise.all(clientes.map(async (c, i) => { await esp(i * 350); await ir(c, rutaIda(mesa, i, P)); }));
  await atender(n, clientes, mesa, pu);
}

// Se resuelve con la mesa asignada cuando tocas al grupo, o con null si no hay mesa o se acaba su paciencia (se revisa en cuadro())
function esperarAtencion(g) {
  return new Promise((res) => { g.desde = reloj; g.esperando = true; g.res = res; });
}
// El jugador tocó al grupo: se le asigna una mesa libre al azar (si no hay ninguna, el grupo sigue esperando hasta que se acabe su paciencia)
function darMesa(g, empleado) {
  const libres = mesas.filter((m) => !m.ocupada);
  if (!libres.length) { if (!empleado) info("No hay mesa libre todavía: están esperando."); return; }
  g.esperando = false; g.enojo = false;
  g.clientes.forEach((c) => (c.enojado = false));
  const r = g.res; g.res = null;
  const mesa = libres[Math.floor(Math.random() * libres.length)];
  mesa.ocupada = true;
  mesa.clientes = g.clientes;
  globo(HALL_X, g.y, "Mesa " + mesa.id + " 👍", 1500);
  info((empleado ? "La recepcionista les dio la mesa " : "Les diste la mesa ") + mesa.id + ".");
  if (r) r(mesa);
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
const velCocina = () => 1 / COCINA_FACTOR[cocinero - 1] + (cocinero2 ? 1 / COCINA_FACTOR[cocinero2 - 1] : 0);
const tiempoCocina = (n) => (T_COCINA_BASE + T_COCINA_POR_CLIENTE * n) / velCocina();

// ----- Un grupo ya sentado, de principio a fin -----
async function atender(n, clientes, mesa, pu = 0) {
  const P = PUERTAS[pu], miGen = gen; // miGen: si cambias de partida, lo que quedó pendiente de esta ya no cobra ni guarda nada
  const espera = (i) => [HALL_X + (i - (n - 1) / 2) * 34, P.pagoY]; // donde pagan, junto al escritorio de la recepción de su puerta

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

  // 4) Platillo listo: hay que llevarlo a mano. Si tardas demasiado, se van
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
  globo(mesa.cx, mesa.cy, "😋", 1200);
  mesa.barra = { t0: ahora(), dur: T_COMER, color: "#6fcf97" };
  await esp(T_COMER);
  mesa.barra = null;
  mesa.plato = false;
  globo(mesa.cx, mesa.cy, "🧾 La cuenta", 1200);
  const tarifa = pagoPorCliente(mesa); // lo que paga cada uno por haber usado ESTA mesa tal como está ahora
  // Terminaron de comer: se levantan todos y la mesa queda libre desde este momento (ya no se toca «mesa» para este grupo)
  mesa.ocupada = false;
  mesa.clientes = [];

  // 5) Cada quien decide a qué cuartos va (baño, cafetería, heladería, pastelería); luego todos pagan en la recepción (más lo que gastaron en cada cuarto) y se van
  await Promise.all(clientes.map(async (c, i) => {
    await esp(i * 300);
    const ida = rutaIda(mesa, i, P);
    let monto = tarifa;
    const visitas = elegirVisitas(); // a qué cuartos va (ninguno, uno o varios, en orden)
    if (visitas.length) {
      monto += await visitarHabs(c, ida, i, P, visitas);
      await ir(c, [espera(i)]);
    } else await ir(c, [...ida.slice(0, -1).reverse(), espera(i)]);
    if (miGen !== gen) return; // la partida cambió mientras caminaba: este cobro no es de la partida actual
    dinero += monto; ganado += monto;
    if (ganado > leerRecord()) { try { localStorage.setItem(KEY_RECORD, String(ganado)); } catch (e) {} } // sin final: el récord se guarda en cuanto lo superas
    atendidos++;
    monedas.push({ x: c.x, y: c.y, t0: ahora(), monto });
    actualizar();
    enviarPuntos(false);
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
const slotXY = (i) => [36 + DX + KX + (i % 6) * 34, 50 + Math.floor(i / 6) * 14];
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
  if (modoMover) { tocarMover(sx, sy); return; } // en «🛠️ Mover» los toques sirven para elegir y poner la cocina o el baño
  const [wx, wy] = aMundo(sx, sy, 20);
  const grupo = recepcion.find((g) => {
    if (!g || !g.esperando) return false;
    const xs = g.clientes.map((c) => c.x);
    const pad = 1 / ESCALA; // el aviso se toca igual de fácil que antes aunque la gente sea más chica
    return dentro([wx, wy], Math.min(...xs) - 28 * pad, g.y - 30 * pad, Math.max(...xs) + 28 * pad, g.y + 30 * pad);
  });
  if (grupo) { darMesa(grupo); return; }
  if (dentro(aMundo(sx, sy, 26), 335 + DX - TOL, 560 + DY - TOL, 465 + DX + TOL, 625 + DY + TOL) || dentro(aMundo(sx, sy, 0), 335 + DX - TOL, 560 + DY - TOL, 465 + DX + TOL, 650 + DY + TOL)) { abrirTienda(); return; } // mostrador de la recepción
  if (puerta2 && (dentro(aMundo(sx, sy, 26), 335 + DX - TOL, -75 - TOL, 465 + DX + TOL, -30 + TOL) || dentro(aMundo(sx, sy, 0), 335 + DX - TOL, -75 - TOL, 465 + DX + TOL, -30 + TOL))) { abrirTienda(); return; } // mostrador de la recepción 2
  const enCocina = dentro(aMundo(sx, sy, 0), ...RECT_COCINA) || dentro(aMundo(sx, sy, 30), ...RECT_COCINA);
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
  else if (enCocina) info("Todavía no hay platillos listos.");
}
function posEnLienzo(e) { const r = lienzo.getBoundingClientRect(); return [((e.clientX - r.left) * CW) / r.width, ((e.clientY - r.top) * CH) / r.height]; }

// Elige a qué cuartos va un cliente al levantarse: cuántos (0 a 4, cada vez menos probable) y cuáles (al azar, pero siempre en el orden de ORDEN_VISITAS)
function elegirVisitas() {
  const disp = ORDEN_VISITAS.filter((id) => id === "banio" || habsExtra[id] !== undefined);
  const pesos = PESOS_VISITAS.slice(0, disp.length + 1);
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0), n = 0;
  while (n < pesos.length - 1 && r >= pesos[n]) { r -= pesos[n]; n++; }
  const mezcla = disp.slice();
  for (let k = mezcla.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [mezcla[k], mezcla[j]] = [mezcla[j], mezcla[k]]; }
  const elegidas = mezcla.slice(0, n);
  return disp.filter((id) => elegidas.includes(id));
}
const gastoHab = (id) => (id === "banio" ? COSTO_BANIO : HAB_NUEVAS[id].gasto);
// El cliente recorre los cuartos «ids» en orden y sale hacia la recepción (ahí paga todo). Devuelve lo que gastó en los cuartos. «ida» es el camino de la entrada a su silla
async function visitarHabs(c, ida, i, P = PUERTAS[0], ids = []) {
  let total = 0;
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k], [px, py] = puertaHab(id);
    await ir(c, [...(k === 0 ? ida.slice(1, -1).reverse() : []), [HALL_X, 185], [px, py], dentroHab(id, i)]);
    await esp(1000);
    total += gastoHab(id);
    const [qx, qy] = puertaHab(id); // por si lo moviste mientras estaba dentro
    await ir(c, k === ids.length - 1 ? [[qx, qy], [HALL_X, 185], P.entrada] : [[qx, qy], [HALL_X, 185]]);
  }
  return total;
}

// ----- Tienda y personal -----
function abrirTienda(mesa = null, empleados = false, construir = false, anuncio = false, perfil = false) { // sin mesa: la tienda de la recepción; con mesa: el panel de mejoras de esa mesa; empleados: el panel de personal
  mesaMejora = mesa;
  vistaEmpleados = empleados;
  vistaConstruir = construir;
  vistaAnuncios = anuncio;
  vistaPerfil = perfil;
  if (perfil) cargarPerfil();
  pintarTienda();
  $("tienda").hidden = false;
  ponerPausa(true);
  info(mesa ? "⏸️ Juego en pausa mientras mejoras la mesa " + mesa.id + "." : empleados ? "⏸️ Juego en pausa mientras ves a tus empleados." : anuncio ? "⏸️ Juego en pausa mientras eliges tus anuncios." : perfil ? "⏸️ Juego en pausa mientras ves tu perfil." : construir ? "⏸️ Juego en pausa mientras construyes." : "⏸️ Juego en pausa mientras estás en la tienda.");
}
function abrirMejorasMesa(m) { abrirTienda(m); }
function cerrarTienda() {
  const estabaEnPausa = pausado;
  mesaMejora = null; vistaEmpleados = false; vistaConstruir = false; vistaAnuncios = false; vistaPerfil = false;
  $("tienda").hidden = true;
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
function pintarMejorasMesa(m, lista) {
  $("tiendaTitulo").textContent = "🪑 Mesa " + m.id;
  const res = document.createElement("small");
  res.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  res.textContent = "Cada cliente de esta mesa paga " + dolares(pagoPorCliente(m)) + (bonoMesa(m) || bonoDeco() ? " (" + dolares(PAGO_POR_CLIENTE) + (bonoMesa(m) ? " + " + dolares(bonoMesa(m)) + " de mejoras" : "") + (bonoDeco() ? " + " + dolares(bonoDeco()) + " de decoración" : "") + ")" : " (sin mejoras todavía)") + ". Las mejoras son solo de esta mesa.";
  lista.appendChild(res);
  const maxB = BONO_MEJORAS.length;
  for (const c of MEJORAS_MESA) {
    const k = m.mejoras[c.id];
    const txt = (nivel) => {
      const hechas = nivel - 1;
      return "Mejoras " + hechas + " de " + maxB + (hechas ? " · ya suma " + dolares(bonoAcum(hechas)) + " por cliente" : "") + (hechas < maxB ? " · la siguiente suma " + dolares(BONO_MEJORAS[hechas]) : " · al máximo");
    };
    lista.appendChild(filaTienda(c.ico, c.nombre, { nivel: k + 1 }, 0, c.precios, txt, null, () => mejorarCosaMesa(m, c.id)));
  }
}
function mejorarCosaMesa(m, id) {
  const c = MEJORAS_MESA.find((x) => x.id === id), k = m.mejoras[id], precio = c && c.precios[k];
  if (!c || precio === undefined || dinero < precio) return;
  dinero -= precio;
  m.mejoras[id]++;
  info("Mesa " + m.id + ": mejoraste " + c.nombre.toLowerCase() + " (" + m.mejoras[id] + " de " + BONO_MEJORAS.length + "). Ahora cada cliente de esa mesa paga " + dolares(pagoPorCliente(m)) + ".");
  actualizar();
}
function pintarTienda() {
  $("tiendaDinero").textContent = fmt(dinero);
  const lista = $("tiendaLista");
  lista.style.cssText = "max-height:52vh;overflow-y:auto"; // con tantas filas, la lista se desplaza
  lista.innerHTML = "";
  if (mesaMejora) { pintarMejorasMesa(mesaMejora, lista); return; }
  if (vistaEmpleados) { pintarEmpleados(lista); return; }
  if (vistaConstruir) { pintarConstruir(lista); return; }
  if (vistaAnuncios) { pintarAnuncios(lista); return; }
  if (vistaPerfil) { pintarPerfil(lista); return; }
  $("tiendaTitulo").textContent = "🛒 Tienda";
  const hint = document.createElement("small");
  hint.style.cssText = "display:block;margin:2px 0 6px;color:var(--suave)";
  hint.textContent = "El personal (cocineros, meseros y recepcionistas) está en el botón 👥 Empleados, arriba a la derecha.";
  lista.append(
    hint,
    filaMesaNueva(),
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
  let x0 = lugarLibreHab(id), reacomodo = false;
  if (x0 === null) { // sin hueco: se reacomodan todas las habitaciones para que quepa
    const pos = reacomodoHabs(id);
    if (!pos) return; // el panel ya avisa que no hay espacio
    x0 = pos[id]; delete pos[id];
    aplicarPosHabs(pos);
    reacomodo = true;
  }
  dinero -= h.precio;
  habsExtra[id] = x0;
  armarFondo();
  info("🏗️ ¡Compraste " + h.nombre + "! Algunos clientes pasarán por ahí al terminar de comer y gastarán " + dolares(h.gasto) + " cada vez." + (reacomodo ? " Reacomodé las habitaciones para que cupiera." : "") + " Puedes cambiarla de lugar con 🛠️ Mover.");
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
  lista.appendChild(seccion("🏠 Habitaciones", "Al terminar de comer, algunos clientes pasan por ellas (cuantas más tengas, más lugares pueden visitar) y gastan ahí. Van en la pared del fondo; cámbialas de lugar con 🛠️ Mover."));
  for (const id of Object.keys(HAB_NUEVAS)) {
    const h = HAB_NUEVAS[id], tengo = habsExtra[id] !== undefined, sinHueco = !tengo && lugarLibreHab(id) === null, sinLugar = sinHueco && !reacomodoHabs(id);
    lista.appendChild(filaSimple(h.ico, h.etiqueta,
      tengo ? "Comprada: cada cliente que pasa gasta " + dolares(h.gasto) + "."
        : sinLugar ? "No hay espacio en la pared del fondo."
        : "Cada cliente que pasa gasta " + dolares(h.gasto) + "." + (sinHueco ? " No hay un hueco libre: al comprarla se reacomodan las habitaciones." : ""),
      tengo ? "Comprada" : sinLugar ? "Sin espacio" : "Comprar " + dolares(h.precio), tengo || sinLugar || dinero < h.precio, () => comprarHab(id)));
  }
  lista.appendChild(seccion("🎨 Decoraciones", "Cada una que compres suma dinero a lo que paga CADA cliente, en todas las mesas."));
  for (const d of DECORACIONES) {
    const tengo = decos.includes(d.id);
    lista.appendChild(filaSimple(d.ico, d.nombre, (tengo ? "Comprada: " : "") + "cada cliente paga " + dolares(d.bono) + " más.", tengo ? "Comprada" : "Comprar " + dolares(d.precio), tengo || dinero < d.precio, () => comprarDeco(d.id)));
  }
}
function pintarEmpleados(lista) {
  $("tiendaTitulo").textContent = "👥 Empleados";
  const txtRecep = (n) => "Nivel " + n + " de " + (RECEP_PRECIOS_MEJORA.length + 1) + " · da mesa en " + (RECEP_TIEMPOS_MS[n - 1] / 1000).toFixed(1) + " s";
  const txtCocinero = (n) => "Nivel " + n + " de " + (COCINERO_PRECIOS_MEJORA.length + 1) + " · un pedido para 4 personas tarda " + (tiempoCocina(4) / 1000).toFixed(1) + " s (con todos los cocineros)";
  const txtMesero = (n) => "Nivel " + n + " de " + (MESERO_PRECIOS_MEJORA.length + 1) + " · lleva los platillos a su paso";
  const filas = [
    { existe: !!receps[0], f: () => filaTienda("🧑‍💼", "Recepcionista", receps[0], PRECIO_RECEP, RECEP_PRECIOS_MEJORA, txtRecep, () => contratarRecep(0), () => mejorarRecep(0)) },
    { existe: true, f: () => filaTienda("👨‍🍳", "Cocinero", { nivel: cocinero }, 0, COCINERO_PRECIOS_MEJORA, txtCocinero, null, mejorarCocinero) },
    { existe: !!cocinero2, f: () => filaTienda("👩‍🍳", "Segundo cocinero", cocinero2 ? { nivel: cocinero2 } : null, PRECIO_COCINERO2, COCINERO_PRECIOS_MEJORA, txtCocinero, contratarCocinero2, mejorarCocinero2) },
    { existe: !!meseros[0], f: () => filaTienda("🤵", "Mesero", meseros[0], PRECIO_MESERO, MESERO_PRECIOS_MEJORA, txtMesero, () => contratarMesero(0), () => mejorarMesero(0)) },
    { existe: !!meseros[1], f: () => filaTienda("🤵‍♀️", "Segundo mesero", meseros[1], PRECIO_MESERO2, MESERO_PRECIOS_MEJORA, txtMesero, () => contratarMesero(1), () => mejorarMesero(1),
      !meseros[0] ? "Primero contrata al mesero." : "") },
    { existe: !!receps[1], f: () => filaTienda("👩‍💼", "Segunda recepcionista", receps[1], PRECIO_RECEP2, RECEP_PRECIOS_MEJORA, txtRecep, () => contratarRecep(1), () => mejorarRecep(1),
      !receps[0] ? "Primero contrata a la recepcionista." : puerta2 ? "" : "Se desbloquea con la segunda puerta (se compra en la tienda, en el terreno nuevo).") },
  ];
  const titulo = (t) => { const e = document.createElement("small"); e.style.cssText = "display:block;margin:6px 0 2px;color:var(--suave);font-weight:700"; e.textContent = t; return e; };
  const hay = filas.filter((x) => x.existe), faltan = filas.filter((x) => !x.existe);
  lista.append(titulo("Contratados (" + hay.length + ")"), ...hay.map((x) => x.f()));
  if (faltan.length) lista.append(titulo("Por contratar"), ...faltan.map((x) => x.f()));
}
function contratarCocinero2() {
  if (cocinero2 || dinero < PRECIO_COCINERO2) return;
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
const SILLA = { tapa: "#bc9a8c", izq: "#8d6e63", der: "#6d4c41" };
// Aspecto según las mejoras de «Mesa» y de «Sillas» (0 a 5): las mesas pasan de madera a mesa con mantel, talavera azul y dorada; las sillas ganan un cojín de color
const MESA_ESTILOS = [
  MADERA,
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

// Cuarto con piso de azulejos, paredes altas al fondo y paredes bajas al frente (con hueco para la puerta)
function cuarto(c, x0, y0, x1, y1, claro, oscuro, pared, puertaX, puertaW) {
  const nx = 10, ny = 6, dx = (x1 - x0) / nx, dy = (y1 - y0) / ny;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) suelo(c, x0 + i * dx, y0 + j * dy, x0 + (i + 1) * dx, y0 + (j + 1) * dy, (i + j) % 2 ? oscuro : claro);
  const h = 56;
  poly(c, [iso(x0, y0, 0), iso(x1, y0, 0), iso(x1, y0, h), iso(x0, y0, h)], pared, "#5b4636");   // pared del fondo
  poly(c, [iso(x0, y0, 0), iso(x0, y1, 0), iso(x0, y1, h), iso(x0, y0, h)], pared, "#5b4636");   // pared izquierda
  poly(c, [iso(x0, y0, 0), iso(x0, y1, 0), iso(x0, y1, h), iso(x0, y0, h)], "rgba(0,0,0,.14)");  // sombra para dar volumen
  const baja = { tapa: "#a1887f", izq: "#8d6e63", der: "#6d4c41" };
  caja3d(c, x0, y1 - 5, puertaX, y1, 14, baja);
  caja3d(c, puertaX + puertaW, y1 - 5, x1, y1, 14, baja);
  caja3d(c, x1 - 5, y0, x1, y1 - 5, 14, baja);
}

// Todo lo que no se mueve se dibuja una sola vez en este lienzo oculto
const FOX = 900, FOY = 850, FW = 2650, FH = 1550; // el fondo es más grande que el lienzo: cubre x de -900 a 1750 y y de -850 a 700 (coordenadas base; ampliado para la zona de pasto)
const VISTA = { x0: -860, y0: -830, x1: 1700, y1: 650 }; // hasta dónde se puede mover la vista (coordenadas base)
const CENTRO_VISTA = [367, 290];                  // centro del restaurante en coordenadas base
const fondo = document.createElement("canvas");
fondo.width = FW; fondo.height = FH;

// ----- Ciudad alrededor del restaurante -----
// El restaurante es la manzana (0, 0): su acera mide ACERA y las calles CALLE. Las demás manzanas se llenan de edificios y parques.
// Los edificios de las manzanas de enfrente tienen tope de altura según su distancia, para que nunca tapen el restaurante.
const PX = W + 2 * ACERA + CALLE, PY = H + 2 * ACERA + CALLE; // separación entre manzanas
const COL_ASFALTO = "#555b64", COL_ACERA = "#d0d3d6", COL_PASTO = "#9ccc65";
// ZONA DE PASTO (terreno para ampliar el restaurante): manzanas que se ven como un solo pasto junto con la del restaurante, sin calles entre ellas.
// Cada una es [i, j] respecto a la del restaurante [0, 0]. En pantalla: [-1,-1] = arriba, [0,-1] = arriba a la derecha, [1,-1] = a la derecha.
// (más: [-1,0] = arriba a la izquierda, [1,0] = abajo a la derecha, [0,1] = abajo a la izquierda, [1,1] = abajo, [-1,1] = a la izquierda)
const PASTO = [[-2, -2], [-1, -2], [0, -2], [-2, -1], [-1, -1], [0, -1], [-2, 0], [-1, 0]]; // cuadrícula 3 × 3 con el restaurante [0,0] en la esquina inferior derecha: las otras 8 manzanas son pasto, sin carreteras entre ellas
const EDIFICIOS = [
  { tapa: "#d7ccc8", izq: "#bcaaa4", der: "#a1887f" },
  { tapa: "#ffe0b2", izq: "#ffcc80", der: "#ffb74d" },
  { tapa: "#bbdefb", izq: "#90caf9", der: "#64b5f6" },
  { tapa: "#c8e6c9", izq: "#a5d6a7", der: "#81c784" },
  { tapa: "#f8bbd0", izq: "#f48fb1", der: "#f06292" },
  { tapa: "#cfd8dc", izq: "#b0bec5", der: "#90a4ae" },
];
const CENTROS_X = [-3, -2, -1, 0, 1, 2, 3].map((i) => i * PX + W + ACERA + CALLE / 2); // calles de x constante
const CENTROS_Y = [-3, -2, -1, 0, 1, 2, 3].map((j) => j * PY + H + ACERA + CALLE / 2); // calles de y constante
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
  const esZona = (i, j) => (i === 0 && j === 0) || hayPasto(i, j);
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x0 = i * PX, y0 = j * PY, x1 = x0 + W, y1 = y0 + H;
    if (!visible(x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, 240)) continue;
    suelo(c, x0 - ACERA, y0 - ACERA, x1 + ACERA, y1 + ACERA, COL_ACERA); // acera de la manzana
    if (i === 0 && j === 0) continue;                                      // el restaurante se dibuja aparte
    if (hayPasto(i, j)) { suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, COL_PASTO); continue; } // zona de pasto: sin edificios
    if (ruido(i, j, 99) < 0.15) {                                          // parque
      suelo(c, x0 + 10, y0 + 10, x1 - 10, y1 - 10, "#9ccc65");
      for (let k = 0; k < 6; k++) {
        const ax = x0 + 80 + ruido(i, j, k) * (W - 160), ay = y0 + 80 + ruido(j, i, k + 9) * (H - 160);
        cola.push({ d: ax + ay, f: () => arbol(c, ax, ay, 34) });
      }
      continue;
    }
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const ex0 = x0 + a * (W / 2) + 14, ex1 = x0 + (a + 1) * (W / 2) - 14;
      const ey0 = y0 + b * (H / 2) + 14, ey1 = y0 + (b + 1) * (H / 2) - 14;
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
    const x0 = i * PX, y0 = j * PY, x1 = x0 + W, y1 = y0 + H, nx0 = ni * PX, ny0 = nj * PY;
    if (ejeX) {
      suelo(c, x1 + ACERA, y0 - ACERA, nx0 - ACERA, y1 + ACERA, COL_ACERA);
      suelo(c, hayPasto(i, j) ? x1 - 10 : x1 + ACERA, y0 + 10, hayPasto(ni, nj) ? nx0 + 10 : nx0 - ACERA, y1 - 10, COL_PASTO);
    } else {
      suelo(c, x0 - ACERA, y1 + ACERA, x1 + ACERA, ny0 - ACERA, COL_ACERA);
      suelo(c, x0 + 10, hayPasto(i, j) ? y1 - 10 : y1 + ACERA, x1 - 10, hayPasto(ni, nj) ? ny0 + 10 : ny0 - ACERA, COL_PASTO);
    }
  };
  for (const [i, j] of [[0, 0], ...PASTO]) { unir(i, j, true); unir(i, j, false); }
  // Donde se juntan 4 manzanas de la zona queda un cuadro de calle: se rellena de pasto (sin pisar la acera del restaurante)
  const cruce = (i, j) => {
    const cuatro = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]];
    if (!cuatro.every(([a, b]) => esZona(a, b))) return;
    const gx0 = i * PX + W - 10, gy0 = j * PY + H - 10, gx1 = (i + 1) * PX + 10, gy1 = (j + 1) * PY + 10;
    suelo(c, gx0, gy0, gx1, gy1, COL_PASTO);
    for (const [a, b] of cuatro) {
      if (hayPasto(a, b)) continue;
      const rx0 = Math.max(gx0, a * PX - ACERA), ry0 = Math.max(gy0, b * PY - ACERA), rx1 = Math.min(gx1, a * PX + W + ACERA), ry1 = Math.min(gy1, b * PY + H + ACERA);
      if (rx1 > rx0 && ry1 > ry0) suelo(c, rx0, ry0, rx1, ry1, COL_ACERA);
    }
  };
  for (let i = -3; i < 3; i++) for (let j = -3; j < 3; j++) cruce(i, j);
  cola.sort((p, q) => p.d - q.d).forEach((o) => o.f()); // de lo más lejano a lo más cercano
}
// Árboles en la acera del restaurante: los de atrás se dibujan antes del piso y los de enfrente después (así tapan lo correcto)
function arbolesAcera(c, lado) {
  const r = (v) => v / ESCALA; // la distancia entre árboles se ve igual que antes en pantalla
  const pts = lado === "atras"
    ? [[-20, r(90)], [-20, r(230)], [-20, r(370)], [-20, r(510)], [-20, r(640)], [r(90), -20], [r(230), -20], [r(370), -20], [r(510), -20]]
    : [[W + 20, r(230)], [W + 20, r(370)], [W + 20, r(510)], [W + 20, r(640)], [r(40), H + 20], [r(120), H + 20], [r(520), H + 20]];
  pts.filter(([x, y]) => !enPlaza(x, y)).sort((p, q) => p[0] + p[1] - (q[0] + q[1])).forEach(([x, y]) => arbol(c, x, y, 32)); // donde se pavimentó la plaza no hay árboles
}
// Plaza de los terrenos comprados. Se pavimentan: cada manzana comprada, la calle que la une con otra manzana tuya (o con el restaurante) y el cruce cuando las 4 de alrededor son tuyas.
function rectsPlaza() {
  const pos = [[0, 0], ...lotes.map((k) => k.split(",").map(Number))];
  const mio = (i, j) => pos.some((q) => q[0] === i && q[1] === j);
  const r = pos.slice(1).map(([i, j]) => [i * PX, j * PY, i * PX + W, j * PY + H]);
  for (const [i, j] of pos) {
    if (mio(i + 1, j)) r.push([i * PX + W, j * PY, (i + 1) * PX, j * PY + H]);
    if (mio(i, j + 1)) r.push([i * PX, j * PY + H, i * PX + W, (j + 1) * PY]);
    if (mio(i + 1, j) && mio(i, j + 1) && mio(i + 1, j + 1)) r.push([i * PX + W, j * PY + H, (i + 1) * PX, (j + 1) * PY]);
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
    const L = datosLote(k), [sx, sy] = iso(L.i * PX + W / 2, L.j * PY + H / 2);
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
  for (let i = 0; i < W / 40; i++) for (let j = 0; j < H / 40; j++) suelo(c, i * 40, j * 40, i * 40 + 40, j * 40 + 40, (i + j) % 2 ? "#e4cfa9" : "#ecd9b8");
  cuarto(c, 10 + DX + KX, HAB_Y0, 260 + DX + KX, HAB_Y1, "#eceff1", "#cfd8dc", "#b0bec5", 200 + DX + KX, 50);   // cocina
  cuarto(c, 330 + DX + BX, HAB_Y0, 550 + DX + BX, HAB_Y1, "#e1f5fa", "#b6e0ea", "#80c4d3", 400 + DX + BX, 60);   // baño
  const [kx, ky] = iso(135 + DX + KX, 10, 70); texto("Cocina", kx, ky, 14, "#37474f", "center", c);
  const [bx, by] = iso(440 + DX + BX, 10, 70); texto("Baño", bx, by, 14, "#1f5d70", "center", c);
  for (const id of Object.keys(HAB_NUEVAS)) { // habitaciones nuevas (si ya las compraste)
    if (habsExtra[id] === undefined) continue;
    const h = HAB_NUEVAS[id], x0 = habsExtra[id];
    cuarto(c, x0, HAB_Y0, x0 + h.ancho, HAB_Y1, h.piso[0], h.piso[1], h.pared, x0 + 50, 50);
    const [hx, hy] = iso(x0 + h.ancho / 2, 10, 70); texto(h.etiqueta, hx, hy, 14, h.colorTexto, "center", c);
  }
  const [cx, cy] = iso(40, 520, 0); texto("Comedor", cx, cy, 13, "rgba(91,70,54,.75)", "center", c);
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
function persona(e, x, y, z, tam) { sombra(x, y, 13); const [sx, sy] = iso(x, y, z); emoji(e, sx, sy, tam * ESCALA); }

function dibujarMesa(m) {
  caja3d(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, 22, MESA_ESTILOS[m.mejoras.mesa], "#5b4636");
  if (m.ocupada) suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#7c5cff");
  if (llevando === m) { suelo(ctx, m.cx - 32, m.cy - 32, m.cx + 32, m.cy + 32, null, 22, "#ffd54a"); suelo(ctx, m.cx - 34, m.cy - 34, m.cx + 34, m.cy + 34, null, 22, "#ffd54a"); }
  const [sx, sy] = iso(m.cx, m.cy, 22);
  const nm = totalMejoras(m);
  const etq = ESCALA < 0.8 ? String(m.id) : "Mesa " + m.id; // con objetos pequeños solo el número, para no tapar las sillas
  texto(etq + (nm ? " ★" + nm : ""), sx, sy + 9 * ESCALA, 10, nm ? "#ffe082" : "#fff", "center"); // ★ = mejoras compradas en esa mesa
  [["cubiertos", "🍴", -20, 14], ["bebidas", "🥤", 14, -20], ["servilletas", "🧻", 20, 18]].forEach(([id, em, dx, dy]) => {
    const k = m.mejoras[id];
    if (k) { const [ex, ey] = iso(m.cx + dx, m.cy + dy, 24); emoji(em, ex, ey, (10 + k * 1.6) * ESCALA); }
  });
  if (m.plato) emoji("🍽️", sx, sy - 4 * ESCALA, 22 * ESCALA);
  const bw = 48 * ESC_UI, bh = 7 * ESC_UI, by = sy - 38 * ESC_UI; // barras de paciencia y de avance
  if (m.esperando) { // paciencia: verde, y roja desde que se enojan
    const resta = Math.max(0, 1 - (ahora() - m.listoDesde) / PACIENCIA_MS);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - bw / 2, by, bw, bh);
    ctx.fillStyle = m.enojo ? "#e74c3c" : "#6fcf97"; ctx.fillRect(sx - bw / 2, by, bw * resta, bh);
    emoji(m.enojo ? "😡" : "⏳", sx, sy - 52 * ESC_UI, 20 * ESC_UI);
  }
  if (m.barra) {
    const f = Math.min(1, (ahora() - m.barra.t0) / m.barra.dur);
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - bw / 2, by, bw, bh);
    ctx.fillStyle = m.barra.color; ctx.fillRect(sx - bw / 2, by, bw * f, bh);
  }
}
function dibujarSilla(s, m) {
  caja3d(ctx, s.x - 10, s.y - 10, s.x + 10, s.y + 10, 10, SILLA, "#5b4636");
  const k = m.mejoras.sillas, cojin = SILLA_COJINES[k];
  if (cojin) caja3d(ctx, s.x - 8, s.y - 8, s.x + 8, s.y + 8, 10 + k, cojin, "#5b4636"); // cada nivel la hace un poco más alta
}
function dibujarMostrador() {
  caja3d(ctx, 20 + DX + KX, 40, 250 + DX + KX, 70, 26, ACERO, "#546e7a");
  const [dx, dy] = iso(32 + DX + KX, 55, 40); emoji("🍳", dx, dy, 26 * ESCALA);
  for (const m of mesas) { // platillos listos esperando que los tomes
    if (!m.esperando || m.tomado) continue;
    const [sx, sy] = iso(...slotXY(m.slot), 26);
    const resta = Math.max(0, 1 - (ahora() - m.listoDesde) / PACIENCIA_MS), u = ESC_UI;
    emoji("🍽️", sx, sy - 14 * ESCALA, 30 * ESCALA * (1 + Math.sin(ahora() / 180) * 0.08));
    texto(ESCALA < 0.8 ? String(m.id) : "Mesa " + m.id, sx, sy + 4 * u, 10, "#263238", "center");
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx - 16 * u, sy + 11 * u, 32 * u, 5 * u);
    ctx.fillStyle = m.enojo ? "#e74c3c" : "#2e9e5b"; ctx.fillRect(sx - 16 * u, sy + 11 * u, 32 * u * resta, 5 * u);
  }
}
function dibujarChef() {
  persona("🧑‍🍳", 110 + DX + KX, 112, 20 + (cocinando > 0 ? Math.abs(Math.sin(ahora() / 120)) * 5 : 0), 34);
  if (cocinero2) persona("👩‍🍳", 190 + DX + KX, 112, 20 + (cocinando > 0 ? Math.abs(Math.sin(ahora() / 120 + 1.5)) * 5 : 0), 34); // segundo cocinero, a la derecha del primero
  if (cocinando > 0) { const [sx, sy] = iso(150 + DX + KX, 100, 44); emoji("♨️", sx, sy, 20 * ESCALA); }
}
// Aviso sobre el grupo que espera en la recepción: «toca para dar mesa» y su barra de paciencia (roja cuando ya están enojados)
function dibujarEspera(g) {
  const [sx, sy0] = iso(HALL_X, g.y, g.slot % 2 === 0 ? 112 : 78);
  const sy = sy0 + Math.sin(ahora() / 200) * 3, f = ESC_UI;
  const t = mesas.some((m) => !m.ocupada) ? "👆 Toca para dar mesa" : "⏳ Esperando mesa";
  ctx.font = "700 " + 13 * f + "px system-ui, sans-serif";
  const w = ctx.measureText(t).width + 16 * f;
  ctx.fillStyle = "#fff"; caja(sx - w / 2, sy - 12 * f, w, 24 * f, 8 * f); ctx.fill();
  ctx.strokeStyle = g.enojo ? "#e74c3c" : "#7c5cff"; ctx.lineWidth = 2; ctx.stroke();
  texto(t, sx, sy, 13 * f, "#3b2a1a", "center");
  const resta = Math.max(0, 1 - (reloj - g.desde) / g.pacienciaMs);
  ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(sx - 30 * f, sy + 16 * f, 60 * f, 6 * f);
  ctx.fillStyle = g.enojo ? "#e74c3c" : "#6fcf97"; ctx.fillRect(sx - 30 * f, sy + 16 * f, 60 * f * resta, 6 * f);
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
  const f = Math.min(1, (reloj - r.t0) / RECEP_TIEMPOS_MS[r.nivel - 1]);
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
  if (modoMover) dibujarMover();
  // Todo se ordena por profundidad (x + y): lo más lejano primero, para que lo cercano tape a lo de atrás
  const cola = [];
  for (const m of mesas) {
    cola.push({ d: m.cx + m.cy, f: () => dibujarMesa(m) });
    for (const t of ORDEN_SILLAS) { const s = silla(m, t); cola.push({ d: s.x + s.y - 0.5, f: () => dibujarSilla(s, m) }); }
  }
  cola.push({ d: 190 + DX + KX, f: dibujarMostrador });
  cola.push({ d: 222 + DX + KX, f: dibujarChef });
  cola.push({ d: 1002 + DX + DY, f: dibujarEscritorio });
  if (puerta2) cola.push({ d: 347 + DX, f: dibujarEscritorio2 });
  receps.forEach((r, k) => { if (r) cola.push({ d: (k ? 318 : 975 + DY) + DX, f: () => dibujarRecepcionista(r, 400 + DX, k ? -84 : 572 + DY) }); });
  for (const id of Object.keys(HAB_NUEVAS)) { // adornos de las habitaciones nuevas
    if (habsExtra[id] === undefined) continue;
    HAB_NUEVAS[id].adornos.forEach(([dx, y, em]) => { const x = habsExtra[id] + dx; cola.push({ d: x + y, f: () => persona(em, x, y, 16, 30) }); });
  }
  DECORACIONES.filter((q) => decos.includes(q.id)).forEach((q) => q.lugares.forEach(([x, y]) => cola.push({ d: x + y, f: () => persona(q.ico, x, y, 18, 36) })));
  [[365, 85, "🚽"], [365, 125, "🚽"], [515, 85, "🚰"]].forEach(([x0, y, em]) => { const x = x0 + DX + BX; cola.push({ d: x + y, f: () => persona(em, x, y, 16, 30) }); });
  for (const e of ents) cola.push({ d: e.x + e.y + 0.1, f: () => dibujarEnt(e) });
  cola.sort((a, b) => a.d - b.d).forEach((o) => o.f());
  dibujarGlobos();
  dibujarMonedas();
  recepcion.forEach((g) => { if (g && g.esperando) dibujarEspera(g); });
  if (llevando) emoji("🍽️", puntero.x, puntero.y - 26 * ESC_UI, 34 * ESC_UI); // el platillo que traes en la mano
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (pausado) { ctx.fillStyle = "rgba(0,0,0,.55)"; caja(CW / 2 - 70, 8, 140, 30, 10); ctx.fill(); texto("⏸️ En pausa", CW / 2, 23, 16, "#fff", "center"); }
}

// ----- Mover las habitaciones (botón «🛠️ Mover») -----
// Se mueven a lo largo de la pared del fondo. Con un cuarto elegido, tocas dónde quieres ponerlo (se centra ahí). Todo lo demás (mostrador, cocineros, escusados, adornos, rutas) se corre con él.
const x0Deseado = (cual, wx) => Math.round((wx - anchoHab(cual) / 2) / 10) * 10; // centrado en wx y en múltiplos de 10
function salirMover() {
  modoMover = false; habSel = null;
  if (btnMover) btnMover.textContent = "🛠️ Mover";
}
function tocarMover(sx, sy) {
  const sobre = (cual) => {
    const x0 = x0Hab(cual), r = [x0, HAB_Y0, x0 + anchoHab(cual), HAB_Y1];
    return dentro(aMundo(sx, sy, 0), ...r) || dentro(aMundo(sx, sy, 30), ...r);
  };
  const tocado = habsPuestas().find((id) => sobre(id)) || null;
  if (tocado) { // tocar un cuarto lo elige (o le quita la elección si ya estaba elegido)
    habSel = habSel === tocado ? null : tocado;
    info(habSel ? "🛠️ Elegiste " + nombreHab(tocado) + ": toca el lugar donde quieres ponerlo (verde = se puede, rojo = no)." : "🛠️ Toca una habitación para elegirla.");
    return;
  }
  if (!habSel) { info("🛠️ Primero toca una habitación (cocina, baño...) para elegirla."); return; }
  moverHab(habSel, x0Deseado(habSel, aMundo(sx, sy, 0)[0]));
}
function moverHab(cual, x0) {
  const act = x0Hab(cual);
  if (x0 === act) { info("🛠️ Ya está ahí."); return; }
  const err = errorHab(cual, x0);
  if (err) { info("🛠️ " + err); return; }
  const dx = x0 - act;
  aplicarPosHabs({ [cual]: x0 }); // quien estaba dentro (o iba para allá) se corre con el cuarto
  armarFondo();
  info("🛠️ Listo, moviste " + nombreHab(cual) + ". Toca otro lugar para moverlo de nuevo, o «✅ Listo» arriba para terminar.");
  actualizar(); // guarda la partida
}
// cambios = [[rect del cuarto, dx], ...]: las personas que están dentro de un cuarto que se mueve (o van hacia él) se mueven dx con él; quien solo pasa por enfrente no se toca.
// Cada persona se mueve una sola vez, según el lugar donde estaba el cuarto ANTES de moverse
function desplazarEntes(cambios) {
  for (const e of ents) {
    if (e.coche) continue;
    const en = (r, x, y, ymax) => x >= r[0] && x <= r[2] && y >= r[1] && y <= ymax;
    const c = cambios.find(([r]) => en(r, e.x, e.y, r[3] + 5) || e.ruta.some((q) => en(r, q[0], q[1], r[3] + 5)));
    if (!c) continue;
    const [r, dx] = c;
    if (en(r, e.x, e.y, r[3] + 5)) e.x += dx;
    e.ruta.forEach((q) => { if (en(r, q[0], q[1], 200)) q[0] += dx; }); // incluye la puerta (y = 185)
  }
}
function dibujarMover() {
  for (const cual of habsPuestas()) {
    const x0 = x0Hab(cual), sel = cual === habSel;
    suelo(ctx, x0, HAB_Y0, x0 + anchoHab(cual), HAB_Y1, sel ? "rgba(255,213,74,.35)" : "rgba(124,92,255,.18)", 0, sel ? "#ffd54a" : "#7c5cff");
  }
  if (habSel && (puntero.x !== -99 || puntero.y !== -99)) { // vista previa de dónde quedaría
    const gx0 = x0Deseado(habSel, aMundo(puntero.x, puntero.y, 0)[0]), mal = errorHab(habSel, gx0);
    suelo(ctx, gx0, HAB_Y0, gx0 + anchoHab(habSel), HAB_Y1, mal ? "rgba(231,76,60,.4)" : "rgba(46,158,91,.4)", 0, mal ? "#e74c3c" : "#2e9e5b");
  }
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
  if (reloj >= proxLlegada) { llegar(OPCIONES[Math.floor(Math.random() * OPCIONES.length)]); proxLlegada = reloj + azar(LLEGADA_MIN_MS, LLEGADA_MAX_MS) / (1 + bonoClientes()); }
  if (reloj >= proxAuto) { llegarAuto(); proxAuto = reloj + azar(AUTO_MIN_MS, AUTO_MAX_MS) / (1 + bonoClientes()); }
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
  for (const m of mesas) {
    if (!m.esperando) continue;
    const espera = t - m.listoDesde;
    if (espera >= ENOJO_MS && !m.enojo) {
      m.enojo = true;
      m.clientes.forEach((c) => (c.enojado = true));
      globo(m.cx, m.cy, "😡 ¡Y mi comida!", 2000);
    }
    if (espera >= PACIENCIA_MS) { // se acabó la paciencia: se van
      m.esperando = false; m.enojo = false; m.tomado = false;
      if (llevando === m) llevando = null;
      const r = m.res; m.res = null;
      if (r) r(false);
    }
  }
  for (const g of recepcion) { // paciencia de quienes esperan que los atiendas en la recepción
    if (!g || !g.esperando) continue;
    const espera = reloj - g.desde;
    if (espera >= g.enojoMs && !g.enojo) {
      g.enojo = true;
      g.clientes.forEach((c) => (c.enojado = true));
      globo(HALL_X, g.y, g.sinMesa ? "😡 ¡Una mesa!" : "😡 ¡Atiéndannos!", 1800);
    }
    if (espera >= g.pacienciaMs) { g.razon = g.sinMesa ? "sinMesa" : "paciencia"; g.esperando = false; const r = g.res; g.res = null; if (r) r(null); }
  }
  receps.forEach((r, k) => { // cada recepcionista da mesa sola al grupo de SU puerta que más lleva esperando, pero tarda
    if (!r) return;
    if (r.g && !r.g.esperando) r.g = null; // lo atendiste tú o se fue
    if (!r.g) {
      const g = recepcion.filter((x) => x && x.esperando && x.pu === k).sort((a, b) => a.desde - b.desde)[0];
      if (g && mesas.some((m) => !m.ocupada)) { r.g = g; r.t0 = reloj; }
    } else if (reloj - r.t0 >= RECEP_TIEMPOS_MS[r.nivel - 1]) { const g = r.g; r.g = null; darMesa(g, true); }
  });
  for (const w of meseros) { // cada mesero libre va por el platillo que más lleva esperando (sin repetir el que otro ya va a buscar)
    if (!w || w.ocupado) continue;
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
btnMover = $("btnMover"); // si index.html no lo trae, se crea aquí junto al botón Reiniciar
if (!btnMover) {
  btnMover = document.createElement("button");
  btnMover.id = "btnMover";
  btnMover.className = "btn";
  btnMover.textContent = "🛠️ Mover";
  btnMover.title = "Mover las habitaciones";
  const rei = $("reiniciar");
  if (rei && rei.parentNode) rei.parentNode.insertBefore(btnMover, rei); else document.body.appendChild(btnMover);
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
btnMover.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (modoMover) { salirMover(); info("Listo: las habitaciones quedaron donde las pusiste."); return; }
  cerrarTienda();
  modoMover = true; habSel = null;
  btnMover.textContent = "✅ Listo";
  info("🛠️ Modo mover: toca una habitación (cocina, baño...) para elegirla y luego toca dónde quieres ponerla. Se mueven a lo largo de la pared del fondo, sin tapar el pasillo del centro.");
});
// ----- Botón «🏗️ Construir»: habitaciones y decoraciones -----
let btnConstruir = $("btnConstruir"); // si index.html no lo trae, se crea aquí junto a «Mover»
if (!btnConstruir) {
  btnConstruir = document.createElement("button");
  btnConstruir.id = "btnConstruir";
  btnConstruir.className = "btn";
  btnConstruir.textContent = "🏗️ Construir";
  btnConstruir.title = "Comprar habitaciones y decoraciones";
  if (btnMover && btnMover.parentNode) btnMover.parentNode.insertBefore(btnConstruir, btnMover); else document.body.appendChild(btnConstruir);
}
btnConstruir.addEventListener("click", () => {
  if ($("menu").hidden === false) return; // con el menú abierto no se usa
  if (!$("tienda").hidden && vistaConstruir) { cerrarTienda(); return; }
  salirMover();
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
      const mejoras = mes.reduce((tot, m) => tot + MEJORAS_MESA.reduce((s2, c) => s2 + Math.max(0, Math.min(5, Math.floor(num(m.mejoras && m.mejoras[c.id])))), 0), 0);
      const rec = (Array.isArray(d.receps) ? d.receps : []).filter((n) => num(n) > 0).length;
      const mer = (Array.isArray(d.meseros) ? d.meseros : []).filter((n) => num(n) > 0).length;
      const nLotes = Array.isArray(d.lotes) ? d.lotes.length : d.lote ? 1 : 0;
      const lineas = [
        "💰 $" + fmt(Math.max(0, Math.round(num(d.dinero) * 2) / 2)) + " dólares",
        "🪑 " + (Math.floor(num(d.nMesas)) || mes.length || MESAS_BASE.length) + " mesas · ✨ " + mejoras + " mejoras de mesa",
        "👨‍🍳 Cocinero nivel " + (Math.floor(num(d.cocinero)) || 1) + (num(d.cocinero2) > 0 ? " · 👩‍🍳 2.º nivel " + Math.floor(num(d.cocinero2)) : ""),
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
