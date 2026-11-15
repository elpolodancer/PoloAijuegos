// Ruta: granjafeliz/prueba-almacen-camion-granjafeliz.mjs   (node prueba-almacen-camion-granjafeliz.mjs)
// Comprueba la conversión de las cajas de Farm Frenzy 1 a pesos (sesión 11): caja = 30 puntos, pesos de camión = 30 / máximo por caja, camión = cajas × 30,
// espacios de almacén (leche = 100, oso = 65 % de la leche) y tiempos de viaje de la guía. Sin DOM ni Firebase.
import * as D from "./datos-granjafeliz.js";
let bien = 0, mal = 0;
const ok = (n, c) => { if (c) bien++; else { mal++; console.log("FALLA:", n); } };

const MAX_CAJA = { huevo: 5, polvo: 10, pan: 15, lana: 3, hilo: 5, tela: 10, leche: 2, mantequilla: 5, queso: 10, osoEnjaulado: 1 };
ok("la caja es de 30 puntos", D.CAJA_CAMION === 30);
for (const k in MAX_CAJA) ok("peso de " + k + " = 30 / " + MAX_CAJA[k], D.PRODUCTOS[k].peso === D.CAJA_CAMION / MAX_CAJA[k]);
for (const k in D.PRODUCTOS) { const P = D.PRODUCTOS[k]; ok(k + ": espacio y peso son enteros > 0", Number.isInteger(P.espacio) && P.espacio > 0 && Number.isInteger(P.peso) && P.peso > 0); ok(k + ": sin fraccionAlmacen", !("fraccionAlmacen" in P)); }

// Camión: 2, 3, 4, 5 y 7 cajas
const cajas = [2, 3, 4, 5, 7];
D.MEJORAS.camion.capacidad.forEach((c, i) => ok("camión nivel " + i + " = " + cajas[i] + " cajas × 30", c === cajas[i] * 30));
ok("tiempos de viaje de la guía 20/15/12/10/4", JSON.stringify(D.MEJORAS.camion.seg) === "[20,15,12,10,4]");
ok("costos del camión 300/800/1500/5000", JSON.stringify(D.MEJORAS.camion.costo) === "[0,300,800,1500,5000]");

// Cada caja llena de un producto cabe exactamente
for (const k in MAX_CAJA) ok("una caja de " + k + " pesa 30", MAX_CAJA[k] * D.PRODUCTOS[k].peso === 30);
// Mezcla: oso + huevos aprovecha el camión base
const baseCam = D.MEJORAS.camion.capacidad[0];
ok("1 oso + 5 huevos = 60 = camión base", D.PRODUCTOS.osoEnjaulado.peso + 5 * D.PRODUCTOS.huevo.peso === baseCam);
ok("2 osos llenan el camión base", 2 * D.PRODUCTOS.osoEnjaulado.peso === baseCam);
ok("10 huevos (2 cajas) = camión base", 10 * D.PRODUCTOS.huevo.peso === baseCam);

// Almacén
ok("capacidades del almacén 100/300/1000/3000/10000", JSON.stringify(D.MEJORAS.almacen.capacidad) === "[100,300,1000,3000,10000]");
ok("costos del almacén 150/500/1000/12000 (la guía)", JSON.stringify(D.MEJORAS.almacen.costo) === "[0,150,500,1000,12000]");
ok("oso enjaulado vale $100 (la guía)", D.PRODUCTOS.osoEnjaulado.valor === 100);
ok("sin constantes viejas de capacidad", !("CAPACIDAD_ALMACEN" in D) && !("CAPACIDAD_CAMION" in D));
const E = (k) => D.PRODUCTOS[k].espacio;
ok("leche = 100 (referencia)", E("leche") === 100);
ok("oso = 65 % de la leche", E("osoEnjaulado") === 0.65 * E("leche"));
ok("orden de la guía: huevo < polvo ≈ pastelito < lana ≈ hilo < tela < leche ≤ mantequilla ≈ queso", E("huevo") < E("polvo") && E("polvo") === E("pan") && E("pan") < E("lana") && E("lana") === E("hilo") && E("hilo") < E("tela") && E("tela") < E("leche") && E("leche") <= E("mantequilla") && E("mantequilla") === E("queso"));
const cap0 = D.MEJORAS.almacen.capacidad[0], cap1 = D.MEJORAS.almacen.capacidad[1];
ok("almacén base guarda 1 oso (no 2)", Math.floor(cap0 / E("osoEnjaulado")) === 1);
ok("con la primera mejora caben al menos un par de osos", Math.floor(cap1 / E("osoEnjaulado")) >= 2);
ok("ningún producto cabe peor que el camión base", Object.values(D.PRODUCTOS).every((P) => P.peso <= baseCam));
ok("ningún producto es más grande que el almacén base", Object.values(D.PRODUCTOS).every((P) => P.espacio <= cap0));
console.log(mal ? "HAY FALLAS" : "Todo bien", bien + " bien /", mal, "mal");
process.exit(mal ? 1 : 0);
