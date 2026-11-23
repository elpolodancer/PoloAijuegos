// Ruta: herramientas/reiniciar-puntos.mjs
// Herramienta de DESARROLLO (solo consola; NO va en sw.js ni en el repo público si no quieres). Reinicia en Firebase los datos de «deslizante»
// y, si lo pides, los puntos del portal de TODOS los jugadores. Se hace desde aquí porque las reglas de Firestore no dejan bajar puntos desde el navegador.
//
// POR DEFECTO NO BORRA NADA: solo cuenta lo que borraría (simulacro). Para borrar de verdad agrega  --aplicar
//
//   Qué reinicia siempre:
//     · juegos/deslizante/jugadores/*          la mejor marca de cada jugador en este juego
//     · progreso/{uid}/juegos/deslizante       el progreso en la nube (niveles, récords, puntos del juego)
//   Con  --perfiles  además:
//     · perfiles/{uid}.total y .totalPrueba    pasan a 0 (el total del portal es UN solo número de TODOS los juegos: no se puede quitar
//                                              solo lo de deslizante, es todo o nada)
//
// Preparación (una sola vez):
//   1) Firebase → Configuración del proyecto → Cuentas de servicio → «Generar nueva clave privada» → guarda el .json FUERA del repo.
//   2) npm install firebase-admin
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json node herramientas/reiniciar-puntos.mjs                         (simulacro)
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json node herramientas/reiniciar-puntos.mjs --aplicar               (borra deslizante)
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/clave.json node herramientas/reiniciar-puntos.mjs --aplicar --perfiles    (y deja los puntos del portal en 0)
// En Windows (PowerShell):  $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\clave.json"; node herramientas/reiniciar-puntos.mjs
// La clave da control total del proyecto: NUNCA la subas a GitHub ni la compartas.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const JUEGO = "deslizante";
const aplicar = process.argv.includes("--aplicar");
const perfiles = process.argv.includes("--perfiles");

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Falta GOOGLE_APPLICATION_CREDENTIALS (ruta al .json de la cuenta de servicio). Ver las instrucciones al inicio de este archivo.");
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId: "elpolodancer" });
const db = getFirestore();
console.log(aplicar ? "⚠️  MODO REAL: se va a borrar." : "Simulacro: no se borra nada (agrega --aplicar para borrar).");

// 1) Mejores marcas del juego
const marcas = db.collection("juegos").doc(JUEGO).collection("jugadores");
const nMarcas = (await marcas.count().get()).data().count;
console.log("· Mejores marcas de «" + JUEGO + "»: " + nMarcas);
if (aplicar && nMarcas) await db.recursiveDelete(marcas);

// 2) Progreso en la nube de cada jugador (los documentos «progreso/{uid}» pueden no existir como tales: se listan sus referencias)
let nProg = 0;
for (const ref of await db.collection("progreso").listDocuments()) {
  const doc = ref.collection("juegos").doc(JUEGO);
  if (!(await doc.get()).exists) continue;
  nProg++;
  if (aplicar) await doc.delete();
}
console.log("· Progresos en la nube de «" + JUEGO + "»: " + nProg);

// 3) Puntos del portal (todos los juegos)
if (perfiles) {
  const todos = await db.collection("perfiles").get();
  const conPuntos = todos.docs.filter((d) => (d.data().total || 0) > 0 || (d.data().totalPrueba || 0) > 0);
  console.log("· Perfiles con puntos del portal: " + conPuntos.length + " de " + todos.size);
  if (aplicar) {
    for (let i = 0; i < conPuntos.length; i += 400) {
      const lote = db.batch();
      for (const d of conPuntos.slice(i, i + 400)) lote.update(d.ref, { total: 0, totalPrueba: 0 });
      await lote.commit();
    }
  }
} else console.log("· Puntos del portal: sin tocar (agrega --perfiles para dejarlos en 0).");

console.log(aplicar ? "✓ Listo." : "Simulacro terminado.");
