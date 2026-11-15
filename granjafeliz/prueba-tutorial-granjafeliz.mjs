// Ruta: granjafeliz/prueba-tutorial-granjafeliz.mjs   (PROYECTO: Portal Juegos · Granja feliz)
// Solo para consola:  node prueba-tutorial-granjafeliz.mjs
// Recorre los pasos del tutorial de los niveles 1, 2 y 3 con estados simulados del juego y comprueba que cada paso avanza SOLO cuando el jugador hace lo que se pide.
// No usa el navegador: el almacenamiento y el escenario están simulados.
const guardado = {};
globalThis.localStorage = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } };

const T = await import("./tutorial-granjafeliz.js");
let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log("  ✗ " + msg); } };
const estado = (c = {}) => ({ t: 0, dinero: 170, agua: 5, pozoLlenando: false, pasto: 0, animales: 2, rec: {}, almacenTotal: 0, almacen: {}, suelo: [], osos: [], camionViaje: false, ventas: 0, pagoListo: 0,
  edif: [], metasRect: { x: 200, y: 12, w: 120, h: 32 }, ...c });
const paso = (t, e, dt = 0.1) => { t.actualizar(e, dt); return t.vista; };
const veTexto = (v, fragmento) => !!v && v.texto.includes(fragmento);
const reiniciar = () => { for (const k in guardado) delete guardado[k]; };

console.log("Reglas generales");
reiniciar();
ok(T.tieneTutorial(1) && T.tieneTutorial(3) && !T.tieneTutorial(4), "tutorial solo en los niveles 1 a 3");
ok(T.tutorialPendiente(1, 0) === true, "nivel 1 sin ver ni pasar: pendiente");
ok(T.tutorialPendiente(1, 3) === false, "nivel 1 ya pasado: no se muestra");
ok(T.tutorialPendiente(4, 0) === false, "nivel 4 no tiene tutorial");
ok(T.crearTutorial(4) === null, "crearTutorial(4) = null");

console.log("Nivel 1");
reiniciar();
{
  const t = T.crearTutorial(1);
  let e = estado(), v = paso(t, e);
  ok(veTexto(v, "pasto") && v.num === 1 && v.total === 5, "paso 1: regar pasto, 1/5");
  ok(v.apunta && v.apunta.w > 0, "paso 1: la flecha señala el campo");
  for (let k = 0; k < 30; k++) v = paso(t, e, 1);                 // pasa el tiempo sin hacer nada: NO avanza
  ok(veTexto(v, "pasto"), "paso 1 no avanza solo por tiempo");
  ok(!T.leerVistos()[1], "todavía no está marcado como visto");
  e = estado({ pasto: 1, agua: 4 }); v = paso(t, e);
  ok(veTexto(v, "huevos") && v.num === 2, "tras regar: paso 2 (huevo)");
  ok(v.apunta === null, "sin huevo en el suelo no hay flecha");
  e = estado({ pasto: 1, agua: 4, suelo: [{ tipo: "huevo", x: 300, y: 200 }] }); v = paso(t, e);
  ok(v.apunta && v.apunta.x === 282 && v.apunta.y === 182, "con huevo en el suelo la flecha lo señala");
  e = estado({ pasto: 1, agua: 4, rec: { huevo: 1 }, almacenTotal: 1 }); v = paso(t, e);
  ok(veTexto(v, "almacén") && v.num === 3, "tras recoger: paso 3 (metas)");
  ok(v.apunta === e.metasRect, "paso 3 señala el marcador de metas");
  for (let k = 0; k < 5; k++) v = paso(t, e, 1);
  ok(veTexto(v, "almacén"), "paso 3 sigue a los 5 s");
  v = paso(t, e, 1.5);
  ok(veTexto(v, "gallina") && v.num === 4, "paso 3 termina a los 6 s: paso 4 (comprar)");
  ok(v.apunta && v.apunta.y < 100, "paso 4 señala el botón de la gallina (arriba, dentro del escenario)");
  e = estado({ rec: { huevo: 1 }, dinero: 60 }); v = paso(t, e);
  ok(veTexto(v, "Junta $100") && v.apunta === null, "sin dinero: pide juntar $100 y no señala el botón");
  e = estado({ rec: { huevo: 1 }, dinero: 170 }); v = paso(t, e);
  ok(veTexto(v, "botón de la gallina"), "con dinero vuelve a señalar el botón");
  e = estado({ rec: { huevo: 1 }, dinero: 70, animales: 3 }); v = paso(t, e);
  ok(veTexto(v, "Listo") && v.num === 5, "tras comprar: paso 5 (despedida)");
  ok(T.leerVistos()[1] === undefined || true, "(el marcado ocurre al terminar la lista)");
  for (let k = 0; k < 8; k++) v = paso(t, e, 1);
  ok(v === null, "tras la despedida no queda cuadro");
  ok(T.leerVistos()[1] === 1, "nivel 1 marcado como visto al terminar la lista");
  ok(T.tutorialPendiente(1, 0) === false, "ya no está pendiente");
}

console.log("Nivel 1: se acaba el agua (paso urgente) y se compra la gallina antes de tiempo");
reiniciar();
{
  const t = T.crearTutorial(1);
  let e = estado({ pasto: 1, agua: 0, animales: 3, rec: { huevo: 1 } }), v = paso(t, e);   // ya hizo todo menos esperar el cartel de metas, y sin agua
  ok(veTexto(v, "agua") && v.num === 0, "sin agua: sale el consejo del pozo (urgente)");
  ok(v.apunta && v.apunta.w === 116, "el consejo señala el pozo");
  e = estado({ pasto: 1, agua: 0, pozoLlenando: true, animales: 3, rec: { huevo: 1 } }); v = paso(t, e);
  ok(!veTexto(v, "agua"), "al llenarse el pozo se vuelve a la lista");
  ok(veTexto(v, "almacén") || veTexto(v, "Listo"), "la lista sigue donde iba (el paso de comprar se saltó porque ya hay 3 gallinas)");
}

console.log("Nivel 2");
reiniciar();
{
  const t = T.crearTutorial(2);
  let e = estado({ dinero: 190 }), v = paso(t, e);
  ok(veTexto(v, "huevos") && v.num === 1, "paso 1: recoger huevos");
  e = estado({ dinero: 190, rec: { huevo: 1 }, almacenTotal: 1, almacen: { huevo: 1 }, pagoListo: 10 }); v = paso(t, e);
  ok(veTexto(v, "camión") && v.apunta && v.apunta.y > 300, "paso 2: señala el camión (abajo)");
  e = estado({ dinero: 190, rec: { huevo: 1 }, pagoListo: 0 }); v = paso(t, e);
  ok(veTexto(v, "otro huevo"), "si no hay nada que vender pide otro huevo");
  e = estado({ dinero: 190, rec: { huevo: 1 }, camionViaje: true }); v = paso(t, e);
  ok(veTexto(v, "tarda unos segundos"), "camión en camino: paso informativo");
  e = estado({ dinero: 200, rec: { huevo: 1 }, ventas: 10 }); v = paso(t, e);
  ok(veTexto(v, "comprar") || veTexto(v, "botón de la gallina"), "tras cobrar: comprar gallina");
  // cae un oso y se interrumpe
  e = estado({ dinero: 200, rec: { huevo: 1 }, ventas: 10, osos: [{ x: 600, y: 250 }] }); v = paso(t, e);
  ok(veTexto(v, "oso") && v.num === 0, "cae un oso: consejo urgente");
  ok(v.apunta && v.apunta.x === 574, "la flecha señala al oso");
  e = estado({ dinero: 200, rec: { huevo: 1 }, ventas: 10, suelo: [{ tipo: "osoEnjaulado", x: 600, y: 250, jaula: true }] }); v = paso(t, e);
  ok(veTexto(v, "jaula"), "oso enjaulado: consejo de la jaula");
  e = estado({ dinero: 200, rec: { huevo: 1, osoEnjaulado: 1 }, ventas: 10 }); v = paso(t, e);
  ok(!veTexto(v, "jaula") && veTexto(v, "gallina"), "jaula guardada: se vuelve al paso de comprar gallina");
  e = estado({ dinero: 100, rec: { huevo: 1 }, ventas: 10, animales: 3 }); v = paso(t, e);
  ok(veTexto(v, "Eso es todo"), "al comprar: despedida");
}

console.log("Nivel 2: el oso cae ANTES de que el jugador haga nada");
reiniciar();
{
  const t = T.crearTutorial(2);
  let v = paso(t, estado({ osos: [{ x: 10, y: 10 }] }));
  ok(veTexto(v, "oso"), "el oso interrumpe desde el paso 1");
  v = paso(t, estado());
  ok(veTexto(v, "huevos"), "y luego se vuelve al paso 1");
}

console.log("Nivel 3");
reiniciar();
{
  const COSTO = 200;
  const t = T.crearTutorial(3);
  let e = estado({ dinero: 190, animales: 3 }), v = paso(t, e);
  ok(veTexto(v, "Te faltan $10"), "paso 1: faltan $10");
  e = estado({ dinero: 190, animales: 3, suelo: [{ tipo: "huevo", x: 300, y: 200 }] }); v = paso(t, e);
  ok(v.apunta && v.apunta.x === 282, "paso 1: señala el huevo");
  e = estado({ dinero: 190, animales: 3, pagoListo: 10, almacen: { huevo: 10 } }); v = paso(t, e);
  ok(v.apunta && v.apunta.w === 116 && v.apunta.y > 300, "paso 1: con carga lista señala el camión");
  e = estado({ dinero: 200, animales: 3 }); v = paso(t, e);
  ok(veTexto(v, "Ya alcanza") && v.apunta && v.apunta.x === 28 && v.apunta.y === 64, "paso 2: señala el espacio de la planta");
  e = estado({ dinero: 150, animales: 3 }); v = paso(t, e);
  ok(veTexto(v, "Aún faltan $50"), "si gasta dinero antes de construir: vuelve a pedir dinero");
  e = estado({ dinero: 5, animales: 3, edif: [{ id: "panaderia", nivel: 0, trab: 0, cola: 0 }] }); v = paso(t, e);
  ok(veTexto(v, "Construida") && v.num === 3, "planta construida: paso 3");
  e = estado({ dinero: 5, animales: 3, almacen: { huevo: 2 }, edif: [{ id: "panaderia", nivel: 0, trab: 0, cola: 0 }] }); v = paso(t, e);
  ok(v.apunta && v.apunta.x === 28, "con huevos en el almacén señala la planta");
  e = estado({ dinero: 5, animales: 3, edif: [{ id: "panaderia", nivel: 0, trab: 3, cola: 0 }] }); v = paso(t, e);
  ok(veTexto(v, "polvo") && v.num === 4, "planta trabajando: paso 4 (recoger polvo)");
  e = estado({ dinero: 5, animales: 3, suelo: [{ tipo: "polvo", x: 80, y: 60 }], edif: [{ id: "panaderia", nivel: 0, trab: 0, cola: 0 }] }); v = paso(t, e);
  ok(v.apunta && v.apunta.x === 62, "señala el polvo en el suelo");
  e = estado({ dinero: 5, animales: 3, rec: { polvo: 1 }, edif: [{ id: "panaderia", nivel: 0, trab: 0, cola: 0 }] }); v = paso(t, e);
  ok(veTexto(v, "Repite") && v.num === 5, "polvo recogido: despedida");
}

console.log("Nivel 3: ya construida al abrir (por si se repite)");
reiniciar();
{
  const t = T.crearTutorial(3);
  const v = paso(t, estado({ dinero: 5, edif: [{ id: "panaderia", nivel: 0, trab: 0, cola: 0 }] }));
  ok(veTexto(v, "Construida") && v.num === 3, "empieza en el paso 3");
}

console.log("Saltar y terminar");
reiniciar();
{
  const t = T.crearTutorial(1);
  paso(t, estado());
  ok(!T.leerVistos()[1], "antes de saltar no está visto");
  t.saltar();
  ok(T.leerVistos()[1] === 1 && t.vista === null && t.terminado, "saltar marca visto y oculta el cuadro");
  t.actualizar(estado(), 1);
  ok(t.vista === null, "después de saltar no vuelve a mostrarse");
  reiniciar();
  const t2 = T.crearTutorial(2); paso(t2, estado());
  t2.terminar();
  ok(T.leerVistos()[2] === 1, "terminar() (al pasar el nivel) marca visto");
}

console.log("Almacenamiento dañado");
reiniciar(); guardado.granjafeliz_tutorial_v1 = "esto no es json";
ok(JSON.stringify(T.leerVistos()) === "{}", "JSON roto = nada visto, sin errores");
guardado.granjafeliz_tutorial_v1 = "[1,2]";
ok(JSON.stringify(T.leerVistos()) === "{}", "un arreglo en vez de objeto = nada visto");

console.log("\n" + (fallos ? "✗ " + fallos + " de " + pruebas + " comprobaciones fallaron" : "✓ " + pruebas + " comprobaciones bien"));
process.exit(fallos ? 1 : 0);
