import { Link } from "react-router-dom";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CargandoLista, Encabezado, ErrorCarga, Vacio } from "@/components/comun";
import { TarjetaCompra } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import type { Compra } from "@/lib/tipos";

export default function Seguimiento() {
  const { datos, error, cargando, recargar } = useApi<Compra[]>("/participaciones");

  const grupos = [
    {
      titulo: "Tienes algo pendiente",
      lista: datos?.filter((c) => c.miParticipacion?.debeAceptarPrecio || (c.entregaEstado && c.entregaEstado !== "EN_PREPARACION" && !c.miParticipacion?.recibido)) ?? [],
    },
    { titulo: "Reuniendo negocios o esperando al proveedor", lista: datos?.filter((c) => ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(c.estadoVisible.clave) && !c.miParticipacion?.debeAceptarPrecio) ?? [] },
    { titulo: "Confirmadas", lista: datos?.filter((c) => c.estadoVisible.clave === "CONFIRMADA" && (c.entregaEstado === "EN_PREPARACION" || c.miParticipacion?.recibido)) ?? [] },
    { titulo: "No se concretaron", lista: datos?.filter((c) => c.estadoVisible.clave === "NO_SE_CONCRETO") ?? [] },
  ];

  return (
    <div>
      <Encabezado
        titulo="Seguimiento"
        etiqueta="Tus compras en grupo"
        imagen="/img/cabeceras/seguimiento.webp"
        descripcion="Revisa tus participaciones: su estado, la entrega y lo que tienes que hacer."
      />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      {datos?.length === 0 && (
        <Vacio
          icono={<Truck />}
          titulo="Aún no participas en compras"
          texto="Cuando te unas a una compra en grupo, aquí verás su estado y la entrega."
          accion={
            <Button asChild>
              <Link to="/compras">Ver compras en grupo</Link>
            </Button>
          }
        />
      )}
      <div className="space-y-8">
        {grupos
          .filter((g) => g.lista.length)
          .map((g) => (
            <section key={g.titulo}>
              <h2 className="mb-3 text-lg font-bold">{g.titulo}</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {g.lista.map((c) => (
                  <TarjetaCompra key={c.id} compra={c} />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
