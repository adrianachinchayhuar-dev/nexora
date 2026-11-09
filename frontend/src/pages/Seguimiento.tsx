import { Link } from "react-router-dom";
import { ChevronRight, CircleCheck, Clock, PiggyBank, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CargandoLista, Encabezado, ErrorCarga, Vacio } from "@/components/comun";
import { EstadoBadge, ImagenProducto, TEXTO_ENTREGA } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import { entregaTexto, soles } from "@/lib/formato";
import type { Compra } from "@/lib/tipos";

/** Lo que el negocio tiene que hacer ahora en esa compra (o null si nada). */
function pendiente(c: Compra): string | null {
  const p = c.miParticipacion;
  if (!p) return null;
  if (p.debeAceptarPrecio) return "Acepta el nuevo precio";
  if (c.entregaEstado === "ENTREGADA" && !p.recibido) return "Confirma que recibiste";
  if (c.entregaEstado === "RETRASADA") return "Revisa el retraso";
  return null;
}

function confirmacion(c: Compra): string {
  if (c.estadoVisible.clave === "NO_SE_CONCRETO") return "No se concretó";
  if (c.estadoVisible.clave === "CONFIRMADA") return c.miParticipacion?.recibido ? "Recibido" : c.entregaEstado ? TEXTO_ENTREGA[c.entregaEstado] : "Confirmada";
  if (c.estadoVisible.clave === "ESPERANDO_PROVEEDOR") return "Esperando al proveedor";
  return `Faltan ${Math.max(c.minimo - c.total, 0)} ${c.producto.unidad}`;
}

export default function Seguimiento() {
  const { datos, error, cargando, recargar } = useApi<Compra[]>("/participaciones");
  const lista = [...(datos ?? [])].sort((a, b) => Number(!!pendiente(b)) - Number(!!pendiente(a)));
  const enCurso = lista.filter((c) => ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(c.estadoVisible.clave)).length;
  const confirmadas = lista.filter((c) => c.estadoVisible.clave === "CONFIRMADA").length;
  const porHacer = lista.filter((c) => pendiente(c)).length;
  const ahorro = lista.filter((c) => c.estadoVisible.clave !== "NO_SE_CONCRETO").reduce((s, c) => s + Math.max(c.miParticipacion?.ahorro.monto ?? 0, 0), 0);

  const contadores = [
    { texto: "Te uniste", valor: String(lista.length), icono: Truck },
    { texto: "En curso", valor: String(enCurso), icono: Clock },
    { texto: "Confirmadas", valor: String(confirmadas), icono: CircleCheck },
    { texto: "Ahorro estimado", valor: soles(ahorro), icono: PiggyBank },
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
      {lista.length > 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {contadores.map(({ texto, valor, icono: Icono }) => (
              <Card key={texto} className="flex items-center gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icono className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xl font-extrabold leading-tight">{valor}</p>
                  <p className="text-xs text-muted-foreground">{texto}</p>
                </div>
              </Card>
            ))}
          </div>
          {porHacer > 0 && (
            <p className="rounded-xl bg-naranja-suave px-4 py-2.5 text-sm font-semibold text-naranja-tinta">
              Tienes {porHacer === 1 ? "1 compra que necesita" : `${porHacer} compras que necesitan`} tu respuesta.
            </p>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-baseline justify-between px-5 pt-4">
              <h2 className="text-lg font-bold">Mis participaciones</h2>
              <span className="text-sm text-muted-foreground">{lista.length === 1 ? "1 compra" : `${lista.length} compras`}</span>
            </div>
            {/* Escritorio: tabla */}
            <div className="hidden md:block">
              <table className="mt-3 w-full text-sm">
                <thead className="border-y bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-semibold">Producto</th>
                    <th className="px-3 py-2.5 font-semibold">Cantidad</th>
                    <th className="px-3 py-2.5 font-semibold">Proveedor</th>
                    <th className="px-3 py-2.5 font-semibold">Confirmación</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lista.map((c) => {
                    const p = pendiente(c);
                    return (
                      <tr key={c.id} className="hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <ImagenProducto nombre={c.producto.nombre} imagen={c.producto.imagen} className="size-10" />
                            <div className="min-w-0">
                              <p className="font-semibold leading-tight">{c.producto.nombre}</p>
                              <p className="text-xs text-muted-foreground">Entrega {entregaTexto(c.entregaDesde, c.entregaHasta)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold">
                          {c.miParticipacion?.cantidad} <span className="font-normal text-muted-foreground">{c.producto.unidad}</span>
                        </td>
                        <td className="px-3 py-3">{c.proveedor.razonSocial}</td>
                        <td className="px-3 py-3 text-muted-foreground">{confirmacion(c)}</td>
                        <td className="px-3 py-3">
                          <EstadoBadge clave={c.estadoVisible.clave} texto={c.estadoVisible.texto} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button asChild size="sm" variant={p ? "naranja" : "outline"}>
                            <Link to={`/compras/${c.id}`}>{p ?? "Ver detalle"}</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Celular: filas */}
            <ul className="mt-3 divide-y border-t md:hidden">
              {lista.map((c) => {
                const p = pendiente(c);
                return (
                  <li key={c.id}>
                    <Link to={`/compras/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                      <ImagenProducto nombre={c.producto.nombre} imagen={c.producto.imagen} className="size-11" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{c.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.miParticipacion?.cantidad} {c.producto.unidad} · {c.proveedor.razonSocial}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <EstadoBadge clave={c.estadoVisible.clave} texto={c.estadoVisible.texto} />
                          {p && <span className="text-xs font-semibold text-naranja-tinta">{p}</span>}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
