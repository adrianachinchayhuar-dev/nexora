import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ErrorApi, get, guardarToken, leerToken, post } from "./api";
import type { Cuenta, Rol, Sesion } from "./tipos";

interface Auth {
  rol: Rol;
  cuenta: Cuenta | null;
  cargando: boolean;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: Record<string, string>) => Promise<void>;
  salir: () => Promise<void>;
  actualizar: (c: Cuenta) => void;
}

const Contexto = createContext<Auth | null>(null);

const OTRO_ACCESO: Record<Rol, string> = {
  COMPRADOR: "Esta cuenta es de un proveedor. Ingresa desde el acceso para proveedores.",
  PROVEEDOR: "Esta cuenta es de un negocio comprador. Ingresa desde el acceso para bodegas.",
};

/** Sesión de un área de la aplicación: la del bodeguero (COMPRADOR) o la del proveedor (PROVEEDOR). */
export function ContextoSesion({ rol, children }: { rol: Rol; children: ReactNode }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!leerToken()) {
      setCargando(false);
      return;
    }
    get<Cuenta>("/auth/yo")
      .then((c) => {
        if (c.rol === rol) setCuenta(c);
        else guardarToken(null);
      })
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, [rol]);

  useEffect(() => {
    const vencida = () => setCuenta(null);
    window.addEventListener("nexora:sesion-vencida", vencida);
    return () => window.removeEventListener("nexora:sesion-vencida", vencida);
  }, []);

  const ingresar = useCallback(
    async (email: string, password: string) => {
      const s = await post<Sesion>("/auth/login", { email, password });
      guardarToken(s.token);
      if (s.cuenta.rol !== rol) {
        await post("/auth/salir").catch(() => undefined);
        guardarToken(null);
        throw new ErrorApi(403, OTRO_ACCESO[rol]);
      }
      setCuenta(s.cuenta);
    },
    [rol],
  );

  const registrar = useCallback(async (datos: Record<string, string>) => {
    const s = await post<Sesion>("/auth/registro", datos);
    guardarToken(s.token);
    setCuenta(s.cuenta);
  }, []);

  const salir = useCallback(async () => {
    try {
      await post("/auth/salir");
    } catch {
      /* si el servidor no responde, igual se cierra en este navegador */
    }
    guardarToken(null);
    setCuenta(null);
  }, []);

  const valor = useMemo(
    () => ({ rol, cuenta, cargando, ingresar, registrar, salir, actualizar: setCuenta }),
    [rol, cuenta, cargando, ingresar, registrar, salir],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAuth fuera de ContextoSesion");
  return c;
}
