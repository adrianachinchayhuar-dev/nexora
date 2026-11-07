// Cliente de la API. En desarrollo Vite envía /api al backend (vite.config.ts).
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

/**
 * El comprador y el proveedor guardan su sesión por separado: así se pueden abrir las dos
 * ventanas lado a lado (por ejemplo, para la sustentación) sin que una cierre la otra.
 */
export function areaActual(): "proveedor" | "comprador" {
  return window.location.pathname.startsWith("/proveedor") ? "proveedor" : "comprador";
}
const claveToken = () => (areaActual() === "proveedor" ? "nexora.token.proveedor" : "nexora.token");

export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

export function leerToken(): string | null {
  try {
    return localStorage.getItem(claveToken());
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(claveToken(), token);
    else localStorage.removeItem(claveToken());
  } catch {
    /* el navegador no permite guardar: la sesión dura lo que dure la pestaña */
  }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const token = leerToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(BASE + ruta, {
      method: opciones.metodo ?? (opciones.cuerpo === undefined ? "GET" : "POST"),
      headers: {
        ...(opciones.cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ErrorApi(0, "No pudimos conectar con el servidor. Revisa que el backend esté encendido.");
  }
  if (respuesta.status === 401 && token) {
    guardarToken(null);
    window.dispatchEvent(new Event("nexora:sesion-vencida"));
  }
  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos?.mensaje ?? "Ocurrió un error. Intenta de nuevo.");
  }
  return datos as T;
}

export const get = <T,>(ruta: string) => api<T>(ruta);
export const post = <T,>(ruta: string, cuerpo: unknown = {}) => api<T>(ruta, { metodo: "POST", cuerpo });
export const put = <T,>(ruta: string, cuerpo: unknown) => api<T>(ruta, { metodo: "PUT", cuerpo });
export const del = <T,>(ruta: string) => api<T>(ruta, { metodo: "DELETE" });
