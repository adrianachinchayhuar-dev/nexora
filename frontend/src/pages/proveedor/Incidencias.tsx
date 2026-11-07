import { MessageSquareWarning } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CargandoLista, Encabezado, ErrorCarga, Vacio } from "@/components/comun";
import { FilaIncidencia } from "@/components/proveedor";
import { usePanel } from "@/layout/AplicacionProveedor";

export default function IncidenciasProveedor() {
  const { panel, error, recargar } = usePanel();
  const lista =
    panel?.compras
      .flatMap((c) => c.incidencias.map((i) => ({ i, producto: c.producto })))
      .sort((a, b) => (a.i.estado === "RESUELTA" ? 1 : 0) - (b.i.estado === "RESUELTA" ? 1 : 0) || b.i.creadaEn.localeCompare(a.i.creadaEn)) ?? [];

  return (
    <div>
      <Encabezado
        titulo="Incidencias"
        etiqueta="Atención a tus clientes"
        imagen="/img/proveedor/incidencias.webp"
        descripcion="Lo que reportan los negocios después de la entrega. Responde para que sepan qué harás."
      />
      {error && !panel && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {!panel && !error && <CargandoLista />}
      {panel && lista.length === 0 && (
        <Vacio icono={<MessageSquareWarning />} titulo="No tienes incidencias" texto="Si un negocio reporta un problema con una entrega, aparecerá aquí al momento." />
      )}
      {lista.length > 0 && (
        <Card className="px-5">
          <ul className="divide-y">
            {lista.map(({ i, producto }) => (
              <FilaIncidencia key={i.id} incidencia={i} producto={producto} alResponder={recargar} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
