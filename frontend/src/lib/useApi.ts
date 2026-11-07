import { useCallback, useEffect, useRef, useState } from "react";
import { get } from "./api";

/** Carga datos de la API y permite recargarlos. */
export function useApi<T>(ruta: string | null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const vigente = useRef(0);

  const recargar = useCallback(async () => {
    if (!ruta) return;
    const id = ++vigente.current;
    setCargando(true);
    try {
      const d = await get<T>(ruta);
      if (id === vigente.current) {
        setDatos(d);
        setError(null);
      }
    } catch (e) {
      if (id === vigente.current) setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      if (id === vigente.current) setCargando(false);
    }
  }, [ruta]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { datos, error, cargando, recargar, setDatos };
}
