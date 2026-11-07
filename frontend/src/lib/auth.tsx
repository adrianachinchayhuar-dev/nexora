import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { get, guardarToken, leerToken, post } from "./api";
import type { Cuenta, Sesion } from "./tipos";

interface Auth {
  cuenta: Cuenta | null;
  cargando: boolean;
  ingresar: (email: string, password: string) => Promise<void>;
  registrar: (datos: Record<string, string>) => Promise<void>;
  salir: () => Promise<void>;
  actualizar: (c: Cuenta) => void;
}

const Contexto = createContext<Auth | null>(null);

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!leerToken()) {
      setCargando(false);
      return;
    }
    get<Cuenta>("/auth/yo")
      .then(setCuenta)
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    const vencida = () => setCuenta(null);
    window.addEventListener("nexora:sesion-vencida", vencida);
    return () => window.removeEventListener("nexora:sesion-vencida", vencida);
  }, []);

  const ingresar = useCallback(async (email: string, password: string) => {
    const s = await post<Sesion>("/auth/login", { email, password });
    guardarToken(s.token);
    setCuenta(s.cuenta);
  }, []);

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

  const valor = useMemo(() => ({ cuenta, cargando, ingresar, registrar, salir, actualizar: setCuenta }), [cuenta, cargando, ingresar, registrar, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const c = useContext(Contexto);
  if (!c) throw new Error("useAuth fuera de ProveedorAuth");
  return c;
}
