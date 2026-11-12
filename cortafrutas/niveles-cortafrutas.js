// Ruta: cortafrutas/niveles-cortafrutas.js
// Los 22 600 niveles FIJOS de Corta Frutas (los mismos para todos los jugadores). Los datos están en datos-niveles-cortafrutas.js (lo escribe
// generar-niveles-cortafrutas.mjs --unir): 226 etapas de 100 niveles; cada nivel es «oleadas|vidas que cuesta|puntaje máximo». Etapa = estado o país del mapa
// (compartido/etapas-mapa.js, crearEtapas({ porEtapa: 100 })). No cambies el orden después de publicar: el progreso de la gente va por número de nivel.
import { ETAPAS } from "./datos-niveles-cortafrutas.js";
import { deTexto, NIVELES_ETAPA, ETAPAS_TOTAL } from "./logica-cortafrutas.js";

export const TOTAL_NIVELES = ETAPAS_TOTAL * NIVELES_ETAPA;
let cache = { e: -1, lineas: [] };
// nivel(7) → { numero, n (carriles), texto, nivel: { n, ondas }, clase (0 fácil, 1 medio, 2 difícil = vidas que hay que sacrificar), maximo (puntaje máximo) }
export function nivel(numero) {
  const num = Math.min(TOTAL_NIVELES, Math.max(1, Math.floor(Number(numero)) || 1)), e = Math.floor((num - 1) / NIVELES_ETAPA);
  if (cache.e !== e) cache = { e, lineas: ETAPAS[e].split("\n") };
  const [texto, per, max] = cache.lineas[(num - 1) % NIVELES_ETAPA].split("|"), tablero = deTexto(texto);
  return { numero: num, n: tablero.n, texto, nivel: tablero, clase: Number(per), maximo: Number(max) };
}
