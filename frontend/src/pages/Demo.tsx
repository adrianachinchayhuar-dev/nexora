import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Clock4, FlaskConical, Megaphone, PackageCheck, RotateCcw, TrendingUp, Truck, TriangleAlert, UserPlus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CargandoLista, Encabezado, ErrorCarga } from "@/components/comun";
import { EstadoBadge, ImagenProducto, TEXTO_ENTREGA } from "@/components/compra";
import { useAuth } from "@/lib/auth";
import { post } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { fechaCorta, soles, sumarDias } from "@/lib/formato";
import type { Compra } from "@/lib/tipos";

/**
 * Panel para la demostración: simula lo que haría el proveedor (apartado 1.3.5 de la tesis).
 * No forma parte del perfil del bodeguero; en el VI ciclo lo reemplaza el perfil proveedor real.
 */
export default function Demo() {
  const { datos, error, cargando, recargar } = useApi<Compra[]>("/compras");
  const { salir } = useAuth();
  const navegar = useNavigate();
  const [aviso, setAviso] = useState<Record<number, string>>({});
  const [restablecer, setRestablecer] = useState(false);

  const hacer = async (ruta: string, cuerpo: unknown, mensaje: string) => {
    try {
      await post(`/demo/${ruta}`, cuerpo);
      toast.success(mensaje);
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo.");
    }
  };

  const reiniciar = async () => {
    try {
      await post("/demo/restablecer");
      toast.success("Demo restablecida. Vuelve a ingresar con la cuenta demo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo restablecer.");
    }
    await salir();
    navegar("/ingresar");
  };

  return (
    <div>
      <Encabezado
        titulo="Simular proveedor"
        descripcion="Solo para la demostración. En el MVP del V ciclo el perfil proveedor aún no está programado, así que sus acciones se simulan aquí."
        accion={
          <Button variant="outline" onClick={() => setRestablecer(true)}>
            <RotateCcw /> Restablecer demo
          </Button>
        }
      />
      <Alert variant="naranja" className="mb-5">
        <FlaskConical />
        <div>Haz una acción aquí y luego mira la compra o la campana: el bodeguero recibe la notificación como en el sistema real.</div>
      </Alert>
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      <div className="space-y-3">
        {datos?.map((c) => {
          const clave = c.estadoVisible.clave;
          return (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <ImagenProducto nombre={c.producto.nombre} imagen={c.producto.imagen} className="size-12" />
                <div className="min-w-[180px] flex-1">
                  <div className="font-bold">
                    {c.producto.nombre} <span className="font-normal text-muted-foreground">· {c.proveedor.razonSocial}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <EstadoBadge clave={clave} texto={c.estadoVisible.texto} />
                    {c.total}/{c.minimo} {c.producto.unidad} · {soles(c.precioFinal ?? c.resumen.precioActual)} · cierra {fechaCorta(c.fechaCierre)}
                    {c.entregaEstado && <> · entrega: {TEXTO_ENTREGA[c.entregaEstado]}</>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.puedeUnirse || (clave === "REUNIENDO" || c.estado === "EN_COTIZACION") ? (
                  <Button size="sm" variant="outline" onClick={() => hacer(`compras/${c.id}/sumar-bodega`, { cantidad: 12 }, "Se sumó otra bodega con 12.")}>
                    <UserPlus /> Sumar otra bodega (+12)
                  </Button>
                ) : null}
                {c.estado === "EN_COTIZACION" && (
                  <>
                    <Button size="sm" onClick={() => hacer(`compras/${c.id}/confirmar`, { compensacion: "Si llega tarde, 5 % de descuento en el pedido" }, "El proveedor confirmó con el precio estimado.")}>
                      <CheckCircle2 /> Confirmar (mismo precio)
                    </Button>
                    <Button
                      size="sm"
                      variant="naranja"
                      onClick={() =>
                        hacer(
                          `compras/${c.id}/confirmar`,
                          { precioFinal: Number((c.resumen.precioActual + 0.3).toFixed(2)), entregaHasta: sumarDias(c.entregaHasta, 1), entregaDesde: c.entregaDesde },
                          "Confirmó con un precio mayor: los bodegueros deben decidir.",
                        )
                      }
                    >
                      <TrendingUp /> Confirmar con precio mayor (+S/ 0.30)
                    </Button>
                  </>
                )}
                {clave === "CONFIRMADA" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => hacer(`compras/${c.id}/entrega`, { estado: "EN_CAMINO" }, "Pedido en camino.")}>
                      <Truck /> En camino
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => hacer(`compras/${c.id}/entrega`, { estado: "ENTREGADA" }, "Entrega registrada.")}>
                      <PackageCheck /> Entregada
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => hacer(`compras/${c.id}/entrega`, { estado: "RETRASADA" }, "Entrega marcada como retrasada.")}>
                      <TriangleAlert /> Retrasada
                    </Button>
                  </>
                )}
                {(clave === "REUNIENDO" || clave === "ESPERANDO_PROVEEDOR") && (
                  <Button size="sm" variant="ghost" onClick={() => hacer(`compras/${c.id}/vencer`, {}, "La compra cerró sin confirmarse.")}>
                    <Clock4 /> Cerrar sin confirmar
                  </Button>
                )}
              </div>
              {clave !== "NO_SE_CONCRETO" && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!aviso[c.id]?.trim()) return;
                    hacer(`compras/${c.id}/aviso`, { texto: aviso[c.id] }, "Aviso publicado.").then(() => setAviso({ ...aviso, [c.id]: "" }));
                  }}
                >
                  <Input placeholder="Publicar un aviso del proveedor…" value={aviso[c.id] ?? ""} onChange={(e) => setAviso({ ...aviso, [c.id]: e.target.value })} className="h-9" />
                  <Button size="sm" variant="secondary" type="submit">
                    <Megaphone /> Publicar
                  </Button>
                </form>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={restablecer} onOpenChange={setRestablecer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Restablecer toda la demo?</DialogTitle>
            <DialogDescription>Se borran los pedidos, compras y cuentas creadas, y se cargan de nuevo los datos de ejemplo con fechas desde hoy.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestablecer(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={reiniciar}>
              Sí, restablecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
