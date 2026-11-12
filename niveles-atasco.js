// Ruta: atasco/niveles-atasco.js
// Los 22 600 niveles FIJOS de Atasco (los mismos para todos los jugadores). Los datos están en datos-niveles-atasco.js (lo escribe
// generar-niveles-atasco.mjs --unir): 226 etapas de 100 niveles; cada nivel es «tablero|movimientos mínimos». Etapa = estado o país del mapa
// (compartido/etapas-mapa.js, crearEtapas({ porEtapa: 100 })). No cambies el orden después de publicar: el progreso de la gente va por número de nivel.
import { ETAPAS } from "./datos-niveles-atasco.js";
import { deTexto, claseDeMinimo, NIVELES_ETAPA, ETAPAS_TOTAL } from "./logica-atasco.js";

export const TOTAL_NIVELES = ETAPAS_TOTAL * NIVELES_ETAPA;
let cache = { e: -1, lineas: [] };
// nivel(7) → { numero, n (tamaño), texto, tablero, minimo, clase (0 fácil, 1 medio, 2 difícil) }
export function nivel(numero) {
  const num = Math.min(TOTAL_NIVELES, Math.max(1, Math.floor(Number(numero)) || 1)), e = Math.floor((num - 1) / NIVELES_ETAPA);
  if (cache.e !== e) cache = { e, lineas: ETAPAS[e].split("\n") };
  const [texto, min] = cache.lineas[(num - 1) % NIVELES_ETAPA].split("|"), tablero = deTexto(texto), minimo = Number(min);
  return { numero: num, n: tablero.n, texto, tablero, minimo, clase: claseDeMinimo(tablero.n, minimo) };
}
