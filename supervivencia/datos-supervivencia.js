// Ruta: supervivencia/datos-supervivencia.js
// SOLO DATOS (sin document, sin Firebase): tabla ITEMS con todo lo de la sección 5 del README-supervivencia.md,
// más REFINAR, RECICLAR, RECETAS_S5 y DECISIONES. Importarlo no cambia el juego.
// Convenciones:
//   estado: "existe" (ya está en el juego) | "nuevo" (por programar)
//   null  = dato que el README marca con ❓ (todavía no decidido): NO se inventó ningún valor.
//   est:true = cifra MÍA (💡 propuesta), no sale de tu README; cámbiala cuando decidas.
//   fuente: dónde está el dato en el README (5.1, 9.4, 10.2…).

const I = (id, nombre, tipo, ico, apila, estado, o = {}) => ({ id, nombre, tipo, ico, apila, estado, ...o });

export const TIPOS = ["recurso", "refinado", "componente", "herramienta", "arma", "armadura", "viejo", "comida", "medicina"];
export const RANURAS_EQUIPO = ["cabeza", "torso", "piernas", "pies"];

export const ITEMS = [
  // ---------- 5.1 Recursos naturales ----------
  I("leno-pino",  "Leño de pino",  "recurso", "🪵", 50, "existe", { fuente: "5.1", nota: "Hoy es «Madera» (chip inv-madera). Los árboles pino y roble dan lo mismo." }),
  I("leno-roble", "Leño de roble", "recurso", "🪵", 50, "nuevo",  { fuente: "5.1", nota: "❓ 5.9-2: ¿en qué se diferencia del pino? Por defecto solo el nombre." }),
  I("caliza",     "Piedra caliza", "recurso", "🪨", 50, "existe", { fuente: "5.1", nota: "Hoy es «Piedra» (chip inv-piedra)." }),
  I("hierro",     "Mineral de hierro", "recurso", "⛏️", 50, "nuevo", { fuente: "5.1", nota: "Vulto nuevo (pico). ❓ golpes y cantidad.", golpes: null, da: null }),
  I("cobre",      "Cobre",         "recurso", "🟠", 50, "nuevo",  { fuente: "5.1", nota: "❓ 5.9-3: para qué sirve. En 10.2 se usa como Copper Bar (Lámpara, Wiring, Circuito).", golpes: null, da: null }),
  I("piel",       "Piel de animal", "recurso", "🦌", 20, "nuevo", { fuente: "5.1", nota: "Necesita animales (sección 8). 10.2 la llama Animal Rawhide." }),
  I("fibra",      "Fibra",         "recurso", "🌿", 50, "existe", { fuente: "5.1", nota: "Ya existe y no estaba en la lista; 💡 sirve para la cuerda (5.9-1)." }),

  // ---------- 5.2 Refinados y componentes ----------
  I("tablon",   "Tablón de pino", "refinado", "🟫", 50, "nuevo", { fuente: "5.2", de: "leno-pino" }),
  I("ladrillo", "Ladrillo",       "refinado", "🧱", 50, "nuevo", { fuente: "5.2", de: "caliza" }),
  I("barra-hierro", "Barra de hierro", "refinado", "▬", 50, "nuevo", { fuente: "10.2", de: "hierro", nota: "Iron Bar. Aparece en 10.2, no en 5.2; 💡 es el paso entre mineral y acero." }),
  I("acero",    "Acero",          "refinado", "🔩", 50, "nuevo", { fuente: "5.2", de: "hierro" }),
  I("cuerda",   "Cuerda",         "refinado", "🪢", 50, "nuevo", { fuente: "5.2", de: "fibra" }),
  I("aluminio", "Aluminio",       "refinado", "🥫", 50, "nuevo", { fuente: "5.2", de: "reciclar", nota: "❓ 5.9-4: 💡 solo se obtiene reciclando." }),
  I("plastico", "Plástico",       "refinado", "🧴", 50, "nuevo", { fuente: "5.2", de: "reciclar", nota: "❓ 5.9-4: 💡 solo se obtiene reciclando." }),
  I("tornillos",      "Tornillos",         "componente", "🔩", 50, "nuevo", { fuente: "5.2" }),
  I("cable-aluminio", "Cables de aluminio", "componente", "🔌", 50, "nuevo", { fuente: "5.2", nota: "10.2 lo llama Wiring (Cableado), nivel 52 con Copper Bar." }),
  I("goma",     "Piezas de goma", "componente", "⚫", 50, "nuevo", { fuente: "5.2" }),
  I("bateria",  "Baterías",       "componente", "🔋", 20, "nuevo", { fuente: "5.2" }),
  // Materiales que no están en 5.x pero las recetas de 10.2 de esta sección los piden:
  I("tela",       "Trozo de tela", "refinado", "🧵", 50, "nuevo", { fuente: "10.2", nota: "Piece of Cloth." }),
  I("tela-gruesa","Tela gruesa",   "refinado", "🧶", 50, "nuevo", { fuente: "10.2", nota: "Thick Fabric." }),
  I("cuero",      "Cuero",         "refinado", "🟤", 50, "nuevo", { fuente: "10.2", nota: "Leather; 💡 sale de la piel de animal." }),
  I("chatarra",   "Chatarra",      "componente", "⚙️", 50, "nuevo", { fuente: "10.2", nota: "Scrap Metal." }),
  I("cinta",      "Cinta americana","componente","🩹", 50, "nuevo", { fuente: "10.2", nota: "Duct Tape." }),

  // ---------- 5.3 Armas (daño: 9.4; receta/nivel: 10.2) ----------
  I("hacha", "Hacha", "herramienta", "🪓", 1, "existe", { fuente: "1", dano: null, nota: "❓ 5.3: ¿sirve de arma? Receta de hoy: 3 piedras + 3 fibras." }),
  I("pico",  "Pico",  "herramienta", "⛏️", 1, "existe", { fuente: "1", dano: null, nota: "❓ 5.3: ¿sirve de arma? Receta de hoy: 4 piedras + 3 fibras." }),
  I("martillo", "Martillo", "herramienta", "🔨", 1, "nuevo", { fuente: "5.3", dano: null }),
  I("palanca",  "Palanca",  "arma", "🪝", 1, "nuevo", { fuente: "5.3/9.4", clase: "cuerpo", dano: 17, rareza: "🟠" }),
  I("katana",   "Katana",   "arma", "🗡️", 1, "nuevo", { fuente: "5.3/9.4", clase: "cuerpo", dano: 35, rareza: "🔴", nota: "Solo botín (10.8)." }),
  I("mazo-sierra","Mazo con sierra","arma","🏏", 1, "nuevo", { fuente: "5.3/9.4", clase: "cuerpo", dano: 30, rareza: "🔴" }),
  I("arco",     "Arco",     "arma", "🏹", 1, "nuevo", { fuente: "5.3", clase: "distancia", dano: null, municion: "flecha", nota: "❓ munición (5.3)." }),
  I("glock17",  "Glock 17", "arma", "🔫", 1, "nuevo", { fuente: "5.3/9.4", clase: "fuego", dano: 20, rareza: "🔴", municion: "bala" }),
  I("ak47",     "AK-47",    "arma", "🔫", 1, "nuevo", { fuente: "5.3", clase: "fuego", dano: null, municion: "bala" }),
  I("fn-scar",  "FN SCAR",  "arma", "🔫", 1, "nuevo", { fuente: "5.3", clase: "fuego", dano: null, municion: "bala" }),
  I("vss",      "VSS Vintorez", "arma", "🔫", 1, "nuevo", { fuente: "5.3", clase: "fuego", dano: null, municion: "bala" }),
  I("minigun",  "Minigun",  "arma", "🔫", 1, "nuevo", { fuente: "5.3", clase: "fuego", dano: null, municion: "bala", nota: "💡 la última de la escala." }),
  I("flecha",   "Flecha",   "componente", "➶", 50, "nuevo", { fuente: "5.3", nota: "💡 munición del arco: madera y cuerda." }),
  I("bala",     "Bala",     "componente", "•", 100, "nuevo", { fuente: "5.3", nota: "💡 munición de fuego: acero y componentes." }),

  // ---------- 5.4 Armaduras (defensa: ❓) ----------
  I("camisa",        "Camisa",              "armadura", "👕", 1, "nuevo", { fuente: "5.4", nivelArmadura: "basica", ranura: "torso",  defensa: null }),
  I("pantalon-cargo","Pantalones cargo",    "armadura", "👖", 1, "nuevo", { fuente: "5.4", nivelArmadura: "basica", ranura: "piernas",defensa: null }),
  I("zapatillas",    "Zapatillas deportivas","armadura","👟", 1, "nuevo", { fuente: "5.4", nivelArmadura: "basica", ranura: "pies",   defensa: null }),
  I("gorro",         "Gorro",               "armadura", "🧢", 1, "nuevo", { fuente: "10.2", nivelArmadura: "basica", ranura: "cabeza", defensa: null, nota: "Dad Hat: 10.7-7 dice que Básica SÍ tiene cabeza." }),
  I("gorro-lana",    "Gorro de lana",       "armadura", "🧶", 1, "nuevo", { fuente: "5.4", nivelArmadura: "resistente", ranura: "cabeza", defensa: null }),
  I("chaqueta",      "Chaqueta gruesa",     "armadura", "🧥", 1, "nuevo", { fuente: "5.4", nivelArmadura: "resistente", ranura: "torso", defensa: null }),
  I("jeans",         "Jeans",               "armadura", "👖", 1, "nuevo", { fuente: "10.2", nivelArmadura: "resistente", ranura: "piernas", defensa: null, nota: "10.7-7: Resistente SÍ tiene piernas." }),
  I("botas-trabajo", "Botas de trabajo",    "armadura", "🥾", 1, "nuevo", { fuente: "5.4", nivelArmadura: "resistente", ranura: "pies", defensa: null }),
  I("casco-swat",    "Casco SWAT",          "armadura", "⛑️", 1, "nuevo", { fuente: "5.4", nivelArmadura: "militar", ranura: "cabeza", defensa: null, nota: "Solo botín." }),
  I("chaleco-swat",  "Chaleco antibalas SWAT","armadura","🦺", 1, "nuevo", { fuente: "5.4", nivelArmadura: "militar", ranura: "torso", defensa: null, nota: "Solo botín." }),
  I("pantalon-tactico","Pantalones tácticos","armadura", "👖", 1, "nuevo", { fuente: "5.4", nivelArmadura: "militar", ranura: "piernas", defensa: null, nota: "Solo botín." }),
  I("kevlar",        "Traje Kevlar",        "armadura", "🛡️", 1, "nuevo", { fuente: "5.4", nivelArmadura: "especial", ranura: "cuerpo", defensa: null, nota: "Cuerpo completo; defensa «muy poderosa». No creable (10.5)." }),
  I("nrbq",          "Ropa NRBQ",           "armadura", "☢️", 1, "nuevo", { fuente: "5.4", nivelArmadura: "especial", ranura: "cuerpo", defensa: null, nota: "Antirradiación; pide Búnker Bravo (5.9-10)." }),

  // ---------- 5.5 Objetos del Viejo Mundo ----------
  I("candado",    "Candado",    "viejo", "🔒", 10, "nuevo", { fuente: "5.5", nota: "Va con la construcción (puertas y cofres)." }),
  I("llave",      "Llave",      "viejo", "🔑", 10, "nuevo", { fuente: "5.5" }),
  I("cigarrillos","Cigarrillos","viejo", "🚬", 50, "nuevo", { fuente: "5.5", nota: "💡 moneda de trueque; ❓ 5.9-9 con quién." }),
  I("camara",     "Cámara",     "viejo", "📷", 5,  "nuevo", { fuente: "5.5", reciclable: true }),
  I("reloj",      "Reloj caro", "viejo", "⌚", 5,  "nuevo", { fuente: "5.5", reciclable: true }),
  I("usb",        "Memoria USB","viejo", "💾", 10, "nuevo", { fuente: "5.5", reciclable: true }),
  I("linterna",   "Linterna",   "viejo", "🔦", 5,  "nuevo", { fuente: "5.5", reciclable: true, nota: "💡 da luz con día y noche; también se recicla." }),

  // ---------- 5.6 Consumibles y medicinas (efecto: 💡 propuesta; cantidades ❓) ----------
  I("bayas",   "Bayas",           "comida", "🫐", 30, "existe", { fuente: "1", efecto: "hambre", cantidad: null, nota: "Ya existen; todavía no se pueden comer." }),
  I("judias",  "Judías en lata",  "comida", "🥫", 10, "nuevo", { fuente: "5.6", efecto: "hambre", cantidad: null }),
  I("baozi",   "Baozi",           "comida", "🥟", 10, "nuevo", { fuente: "5.6", efecto: "hambre", cantidad: null }),
  I("cerveza", "Cerveza",         "comida", "🍺", 10, "nuevo", { fuente: "5.6", efecto: "sed", cantidad: null, nota: "❓ ¿efecto malo?" }),
  I("antibioticos","Antibióticos","medicina","💊", 10, "nuevo", { fuente: "5.6", efecto: "infeccion", cantidad: null, nota: "❓ 5.9-8: si no hay infección, 💡 «curar vida»." }),
  I("antidoto",    "Antídoto",    "medicina","🧪", 10, "nuevo", { fuente: "5.6", efecto: "veneno",    cantidad: null, nota: "❓ 5.9-8: si no hay veneno, 💡 «curar vida»." }),
  I("adrenalina",  "Adrenalina",  "medicina","💉", 10, "nuevo", { fuente: "5.6", efecto: "impulso",   cantidad: null, nota: "💡 mejora corta de velocidad o vida." }),
];

const PORID = new Map(ITEMS.map((x) => [x.id, x]));
export const item = (id) => PORID.get(id) || null;
export const itemsDe = (tipo) => ITEMS.filter((x) => x.tipo === tipo);

// ---------- Recetas con costo de 10.2 (nivel del jugador, estación) para los objetos de esta sección ----------
// costo: [[id, cantidad], …]. Los ⚠️ (Titan, Tungsten, Ash) quedan fuera, como sugiere 10.7-2.
// Las que piden hierro/cuero/tela etc. dependen de refinar (REFINAR) y de animales.
export const RECETAS_S5 = [
  { item: "arco",          nivel: 10, estacion: null, costo: [["tablon",5],["barra-hierro",1],["cuerda",5],["cinta",3]] },
  { item: "palanca",       nivel: 22, estacion: null, costo: [["barra-hierro",7],["cuero",3]] },
  { item: "mazo-sierra",   nivel: 64, estacion: null, costo: [["barra-hierro",15],["tablon",10],["cinta",5],["chatarra",5],["cuero",12]] },
  { item: "gorro",         nivel: 10, estacion: null, costo: [["fibra",2],["tela",1]] },
  { item: "camisa",        nivel: 10, estacion: null, costo: [["fibra",3],["tela",3]] },
  { item: "pantalon-cargo",nivel: 10, estacion: null, costo: [["fibra",3],["tela",3],["cuerda",2]] },
  { item: "zapatillas",    nivel: 10, estacion: null, costo: [["fibra",2],["tela",1],["cuerda",2]] },
  { item: "gorro-lana",    nivel: 22, estacion: null, costo: [["tela-gruesa",3],["cuerda",5],["tela",5]] },
  { item: "chaqueta",      nivel: 22, estacion: null, costo: [["tela-gruesa",5],["cuerda",7],["cuero",5]] },
  { item: "jeans",         nivel: 22, estacion: null, costo: [["tela-gruesa",5],["cuerda",7],["cuero",5]] },
  { item: "botas-trabajo", nivel: 22, estacion: null, costo: [["tela-gruesa",1],["cuerda",7],["cuero",8]] },
  { item: "cable-aluminio",nivel: 52, estacion: null, costo: [["cobre",1],["tela",1],["cinta",1]], nota: "Wiring de 10.2 (Copper Bar = cobre fundido)." },
];

// ---------- 5.2 Refinar (💡 TODAS las cantidades son est:true: tu README no trae los costos, 10.7-6) ----------
// estacion: ids propuestos por 10.8. Mientras no existan estaciones, el juego puede ignorar `estacion`.
export const REFINAR = [
  { da: ["tablon", 1],       costo: [["leno-pino", 2]],     estacion: "banco-carpinteria", est: true },
  { da: ["ladrillo", 1],     costo: [["caliza", 2]],        estacion: "mesa-canteria",     est: true },
  { da: ["barra-hierro", 1], costo: [["hierro", 2]],        estacion: "horno",             est: true },
  { da: ["acero", 1],        costo: [["barra-hierro", 2]],  estacion: "horno",             est: true },
  { da: ["cuerda", 1],       costo: [["fibra", 3]],         estacion: null,                est: true },
];
// ---------- 5.2 / 5.5 Reciclar: aluminio, plástico, cables y baterías salen de aquí (💡 est) ----------
export const RECICLAR = {
  camara:   { da: [["aluminio",1],["plastico",2],["bateria",1]], est: true },
  reloj:    { da: [["aluminio",2],["bateria",1]],                est: true },
  usb:      { da: [["plastico",1],["cable-aluminio",1]],         est: true },
  linterna: { da: [["aluminio",1],["plastico",1],["bateria",1]], est: true },
};

// ---------- 5.9 Preguntas por decidir: la respuesta POR DEFECTO que usa este código (cámbiala cuando decidas) ----------
export const DECISIONES = {
  1: { pregunta: "¿Se conservan la fibra y las bayas?", por_defecto: "Sí (fibra → cuerda, bayas → comida)" },
  2: { pregunta: "¿Pino y roble se diferencian?", por_defecto: "Solo el nombre y el dibujo" },
  3: { pregunta: "¿Para qué sirve el cobre?", por_defecto: "Cable (Wiring) y lámpara, como en 10.2" },
  4: { pregunta: "¿Aluminio y plástico salen solo de reciclar?", por_defecto: "Sí" },
  5: { pregunta: "¿Hay estación de refinar?", por_defecto: "Sí, varias (10.8); sin construcción todavía → se refina desde 🛠️" },
  6: { pregunta: "¿Munición y durabilidad?", por_defecto: "Munición sí (flecha, bala); durabilidad no" },
  7: { pregunta: "¿Armaduras con 4 ranuras completas?", por_defecto: "Sí (10.7-7); Especial ocupa cuerpo completo" },
  8: { pregunta: "¿Veneno e infección?", por_defecto: "No: las medicinas curan vida" },
  9: { pregunta: "¿Cigarrillos intercambiables?", por_defecto: "Sin intercambio por ahora" },
  10: { pregunta: "¿Dónde está el Búnker Bravo?", por_defecto: "Sin decidir; la ropa NRBQ no se obtiene" },
};

// Revisión de coherencia (se usa en las pruebas): todo id citado debe existir en ITEMS
export function validar() {
  const mal = [];
  const ok = (id, donde) => { if (!PORID.has(id)) mal.push(donde + " → " + id); };
  const vistos = new Set();
  for (const x of ITEMS) { if (vistos.has(x.id)) mal.push("id repetido " + x.id); vistos.add(x.id); if (!TIPOS.includes(x.tipo)) mal.push("tipo " + x.id); }
  for (const r of RECETAS_S5) { ok(r.item, "receta"); for (const [id] of r.costo) ok(id, "costo de " + r.item); }
  for (const r of REFINAR) { ok(r.da[0], "refinar"); for (const [id] of r.costo) ok(id, "refinar " + r.da[0]); }
  for (const k in RECICLAR) { ok(k, "reciclar"); for (const [id] of RECICLAR[k].da) ok(id, "reciclar " + k); }
  return mal;
}
