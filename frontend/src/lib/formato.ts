// Formatos en español de Perú.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export function soles(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "S/ " + Number(n).toFixed(2);
}

function aFecha(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12));
}

export function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function sumarDias(iso: string, dias: number): string {
  const f = aFecha(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

/** «12 nov» */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = aFecha(iso);
  return `${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
}

/** «vie 12 nov» */
export function fechaConDia(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = aFecha(iso);
  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} ${MESES[f.getUTCMonth()]}`;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000);
}

/** «hoy», «mañana», «en 3 días», «ayer», «hace 2 días» */
export function relativo(iso: string, hoy: string): string {
  const n = diasEntre(hoy, iso);
  if (n === 0) return "hoy";
  if (n === 1) return "mañana";
  if (n > 1) return `en ${n} días`;
  if (n === -1) return "ayer";
  return `hace ${-n} días`;
}

/** «el 12 nov» o «entre el 12 y el 13 nov» */
export function entregaTexto(desde: string, hasta: string): string {
  if (!desde || desde === hasta) return "el " + fechaCorta(hasta);
  const a = fechaCorta(desde);
  const b = fechaCorta(hasta);
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return `entre el ${mismoMes ? a.split(" ")[0] : a} y el ${b}`;
}

export function haceTiempo(isoFechaHora: string): string {
  const t = new Date(isoFechaHora).getTime();
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Ayer" : `Hace ${d} días`;
}

export const ETIQUETA_AHORRO: Record<string, { texto: string; ayuda: string }> = {
  REFERENCIAL: { texto: "referencial", ayuda: "Calculado con el precio normal del proveedor porque no indicaste cuánto pagas hoy." },
  PRELIMINAR: { texto: "preliminar", ayuda: "Calculado con el precio que pagas hoy; puede cambiar cuando el proveedor confirme." },
  CONFIRMADO: { texto: "confirmado", ayuda: "El proveedor confirmó el precio final y el costo de entrega." },
};

export const MOTIVOS_INCIDENCIA: Record<string, string> = {
  NO_LLEGO: "No llegó",
  INCOMPLETO: "Llegó incompleto",
  DANADO: "Llegó dañado",
  TARDE: "Llegó tarde",
  PRECIO_DISTINTO: "Precio distinto al acordado",
};

export const ESTADO_INCIDENCIA: Record<string, string> = { ABIERTA: "Abierta", EN_REVISION: "En revisión", RESUELTA: "Resuelta" };

export function imagenProducto(nombre: string | null | undefined): string {
  return nombre ? `/img/productos/${nombre}` : "/img/productos/generico.webp";
}
