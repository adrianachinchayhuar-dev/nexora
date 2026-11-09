import { useCallback, useEffect, useState } from "react";

/** Cómo se ve la barra lateral en escritorio. */
export type Barra = "completa" | "iconos" | "oculta";

function leer(clave: string, defecto: string): string {
  try {
    return localStorage.getItem(clave) ?? defecto;
  } catch {
    return defecto;
  }
}
function guardar(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la preferencia dura solo esta visita */
  }
}

/** Preferencias de vista de cada persona en este navegador: barra lateral y letra grande. */
export function usePreferencias() {
  const [barra, setBarraEstado] = useState<Barra>(() => leer("nexora.barra", "completa") as Barra);
  const [letraGrande, setLetraEstado] = useState(() => leer("nexora.letraGrande", "no") === "si");

  useEffect(() => {
    document.documentElement.style.fontSize = letraGrande ? "18px" : "";
  }, [letraGrande]);

  const setBarra = useCallback((b: Barra) => {
    setBarraEstado(b);
    guardar("nexora.barra", b);
  }, []);
  const alternarLetra = useCallback(() => {
    setLetraEstado((v) => {
      guardar("nexora.letraGrande", v ? "no" : "si");
      return !v;
    });
  }, []);

  /** Margen izquierdo del contenido según la barra. */
  const margen = barra === "completa" ? "lg:pl-64" : barra === "iconos" ? "lg:pl-[76px]" : "lg:pl-0";
  const ancho = barra === "completa" ? "lg:flex w-64" : barra === "iconos" ? "lg:flex w-[76px]" : "lg:hidden";
  return { barra, setBarra, letraGrande, alternarLetra, margen, ancho };
}

/** Siguiente estado al pulsar el botón de la barra: completa → solo íconos → oculta → completa. */
export const SIGUIENTE_BARRA: Record<Barra, { siguiente: Barra; texto: string }> = {
  completa: { siguiente: "iconos", texto: "Dejar solo íconos en el menú" },
  iconos: { siguiente: "oculta", texto: "Ocultar el menú" },
  oculta: { siguiente: "completa", texto: "Mostrar el menú completo" },
};
