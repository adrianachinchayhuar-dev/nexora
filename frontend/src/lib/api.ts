// Cliente de la API. En desarrollo Vite envía /api al backend (vite.config.ts).
const BASE = import.meta.env.VITE_API_BASE ?? "/api";
const CLAVE_TOKEN = "nexora.token";

export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
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
