import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CargandoLista, Encabezado, ErrorCarga, Pildoras, Vacio } from "@/components/comun";
import { ImagenProducto } from "@/components/compra";
import { MensajesDeCompra, useConsultaPeriodica } from "@/components/mensajes";
import { useApi } from "@/lib/useApi";
import { haceTiempo } from "@/lib/formato";
import type { Bandeja } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Filtro = "TODAS" | "SIN_LEER";

export default function Mensajes() {
  const { datos, error, cargando, recargar } = useApi<Bandeja>("/mensajes");
  const [params, setParams] = useSearchParams();
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [busqueda, setBusqueda] = useState("");
  useConsultaPeriodica(recargar, 8000);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos?.conversaciones ?? [])
      .filter((c) => filtro === "TODAS" || c.sinLeer > 0)
      .filter((c) => !q || c.producto.toLowerCase().includes(q) || c.contraparte.toLowerCase().includes(q));
  }, [datos, filtro, busqueda]);

  const elegida = params.get("compra") ?? (lista[0] ? String(lista[0].compraId) : null);
  const actual = datos?.conversaciones.find((c) => String(c.compraId) === elegida);
  useEffect(() => {
    if (elegida) recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elegida]);

  return (
    <div>
      <Encabezado titulo="Mensajes" etiqueta="Conversaciones" descripcion="Habla con los proveedores de tus compras en grupo y revisa las preguntas de cada compra." />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      {datos && datos.conversaciones.length === 0 && (
        <Vacio
          icono={<MessageCircle />}
          titulo="Aún no tienes conversaciones"
          texto="Desde una compra en grupo puedes escribirle al proveedor o hacer una pregunta anónima."
          accion={
            <Link to="/compras" className="font-semibold text-primary hover:underline">
              Ver compras en grupo
            </Link>
          }
        />
      )}
      {datos && datos.conversaciones.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="h-fit p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar proveedor o producto…" className="rounded-full pl-10" aria-label="Buscar conversaciones" />
            </div>
            <Pildoras
              etiqueta="Filtrar conversaciones"
              valor={filtro}
              onCambio={setFiltro}
              opciones={[
                { valor: "TODAS", texto: "Todas", cuenta: datos.conversaciones.length },
                { valor: "SIN_LEER", texto: "Sin leer", cuenta: datos.conversaciones.filter((c) => c.sinLeer > 0).length },
              ]}
            />
            <ul className="mt-3 space-y-1">
              {lista.map((c) => {
                const activa = String(c.compraId) === elegida;
                return (
                  <li key={c.compraId}>
                    <button
                      onClick={() => setParams({ compra: String(c.compraId) })}
                      className={cn("flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors", activa ? "bg-secondary" : "hover:bg-muted")}
                    >
                      <ImagenProducto nombre={c.producto} imagen={c.imagen} className="size-11 bg-secondary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-semibold">{c.contraparte.replace(/\s*\(.*\)$/, "")}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{haceTiempo(c.fecha)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.producto}</p>
                        <p className={cn("truncate text-sm", c.sinLeer ? "font-semibold" : "text-muted-foreground")}>{c.ultimo}</p>
                      </div>
                      {c.sinLeer > 0 && <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-naranja text-[11px] font-bold text-white">{c.sinLeer}</span>}
                    </button>
                  </li>
                );
              })}
              {lista.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">No hay conversaciones en esta vista.</li>}
            </ul>
          </Card>
          {actual && (
            <Card className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <ImagenProducto nombre={actual.producto} imagen={actual.imagen} className="size-12 bg-secondary" />
                  <div>
                    <p className="font-bold">{actual.contraparte.replace(/\s*\(.*\)$/, "")}</p>
                    <p className="text-sm text-muted-foreground">Proveedor · {actual.producto}</p>
                  </div>
                </div>
                <Link to={`/compras/${actual.compraId}`} className="text-sm font-semibold text-primary hover:underline">
                  Ver compra en grupo
                </Link>
              </div>
              <MensajesDeCompra key={actual.compraId} compraId={actual.compraId} inicial="chat" />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
