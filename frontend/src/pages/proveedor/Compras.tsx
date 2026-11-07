import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CargandoLista, Encabezado, ErrorCarga, Pildoras, Vacio } from "@/components/comun";
import { TarjetaCompraProveedor } from "@/components/proveedor";
import { usePanel } from "@/layout/AplicacionProveedor";
import type { CompraProveedor } from "@/lib/tipos";

type Filtro = "TE_TOCA" | "REUNIENDO" | "CONFIRMADAS" | "NO_SE_CONCRETO" | "TODAS";
const FILTROS: { valor: Filtro; texto: string; cumple: (c: CompraProveedor) => boolean }[] = [
  { valor: "TE_TOCA", texto: "Te toca", cumple: (c) => c.puedeConfirmar || c.puedeAvanzarEntrega || c.incidencias.some((i) => i.estado !== "RESUELTA") },
  { valor: "REUNIENDO", texto: "Reuniendo negocios", cumple: (c) => ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(c.estadoVisible.clave) },
  { valor: "CONFIRMADAS", texto: "Confirmadas", cumple: (c) => c.estadoVisible.clave === "CONFIRMADA" },
  { valor: "NO_SE_CONCRETO", texto: "No se concretaron", cumple: (c) => c.estadoVisible.clave === "NO_SE_CONCRETO" },
  { valor: "TODAS", texto: "Todas", cumple: () => true },
];

export default function ComprasProveedor() {
  const { panel, error, recargar } = usePanel();
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const lista = panel?.compras.filter(FILTROS.find((f) => f.valor === filtro)!.cumple) ?? [];

  return (
    <div>
      <Encabezado
        titulo="Compras en grupo"
        etiqueta="Tus ventas por volumen"
        imagen="/img/proveedor/compras.webp"
        descripcion="Compras de tus productos que reúnen a varias bodegas. Verás los nombres de los negocios cuando la compra esté confirmada."
      />
      <div className="mb-5">
        <Pildoras
          etiqueta="Filtrar compras"
          valor={filtro}
          onCambio={setFiltro}
          opciones={FILTROS.map((f) => ({ valor: f.valor, texto: f.texto, cuenta: panel ? panel.compras.filter(f.cumple).length : undefined }))}
        />
      </div>
      {error && !panel && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {!panel && !error && <CargandoLista />}
      {panel && lista.length === 0 && <Vacio icono={<Sparkles />} titulo="No hay compras en esta vista" />}
      <div className="space-y-3">
        {lista.map((c) => (
          <TarjetaCompraProveedor key={c.id} compra={c} />
        ))}
      </div>
    </div>
  );
}
