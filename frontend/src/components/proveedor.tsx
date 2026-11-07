import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronRight, MessageSquareWarning, PackageCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Girando } from "@/components/comun";
import { EstadoBadge, ImagenProducto, TEXTO_ENTREGA } from "@/components/compra";
import { post } from "@/lib/api";
import { ESTADO_INCIDENCIA, MOTIVOS_INCIDENCIA, fechaCorta, haceTiempo, rangoCorto, soles } from "@/lib/formato";
import type { CompraProveedor, IncidenciaProveedor } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export function TarjetaCompraProveedor({ compra }: { compra: CompraProveedor }) {
  const abiertas = compra.incidencias.filter((i) => i.estado !== "RESUELTA").length;
  const pendiente = ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(compra.estadoVisible.clave);
  return (
    <Link to={`/proveedor/compras/${compra.id}`} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          "p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring",
          compra.puedeConfirmar && "border-naranja/60 ring-1 ring-naranja/30",
        )}
      >
        <div className="flex gap-4">
          <ImagenProducto nombre={compra.producto} imagen={compra.imagen} className="size-16 bg-secondary" />
          <div className="min-w-0 flex-1 space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-foreground" />
              {pendiente ? `Cierra el ${fechaCorta(compra.fechaCierre)}` : `Cerró el ${fechaCorta(compra.fechaCierre)}`} · Entrega {rangoCorto(compra.entregaDesde, compra.entregaHasta)}
            </span>
            <h3 className="font-bold">{compra.producto}</h3>
            <p className="text-sm text-muted-foreground">
              {compra.presentacion} · {compra.zona.nombre}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <EstadoBadge clave={compra.estadoVisible.clave} texto={compra.estadoVisible.texto} />
              {compra.puedeConfirmar && <Badge variant="naranja">Te toca confirmar</Badge>}
              {compra.entregaEstado && (
                <Badge variant={compra.entregaEstado === "RETRASADA" ? "destructive" : "secondary"}>
                  <PackageCheck /> {TEXTO_ENTREGA[compra.entregaEstado]}
                </Badge>
              )}
              {abiertas > 0 && (
                <Badge variant="destructive">
                  <MessageSquareWarning /> {abiertas} {abiertas === 1 ? "incidencia" : "incidencias"}
                </Badge>
              )}
            </div>
            <p className="text-sm">{compra.tuTurno}</p>
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="text-xs text-muted-foreground">{compra.precioFinal ? "Precio final" : "Precio en grupo"}</div>
            <div className="text-xl font-extrabold text-primary">{soles(compra.precioFinal ?? compra.precioActual)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              <Users className="mr-1 inline size-3.5" />
              {compra.negocios} negocios · {compra.total}/{compra.minimo} {compra.unidad}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

export function ResponderIncidencia({ incidencia, alResponder }: { incidencia: IncidenciaProveedor; alResponder: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const [respuesta, setRespuesta] = useState(incidencia.respuesta ?? "");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (estado: "EN_REVISION" | "RESUELTA") => {
    setEnviando(true);
    try {
      const r = await post<{ mensaje: string }>(`/proveedor/incidencias/${incidencia.id}/responder`, { respuesta, estado });
      toast.success(r.mensaje);
      setAbierta(false);
      alResponder();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo responder.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Button size="sm" variant={incidencia.estado === "RESUELTA" ? "outline" : "default"} onClick={() => setAbierta(true)}>
        {incidencia.estado === "RESUELTA" ? "Ver respuesta" : "Responder"}
      </Button>
      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{MOTIVOS_INCIDENCIA[incidencia.motivo] ?? incidencia.motivo}</DialogTitle>
            <DialogDescription>
              {incidencia.negocio} · {haceTiempo(incidencia.creadaEn)}
            </DialogDescription>
          </DialogHeader>
          <p className="rounded-2xl bg-muted p-3 text-sm">{incidencia.descripcion}</p>
          <div className="space-y-2">
            <Label htmlFor={`resp-${incidencia.id}`}>Tu respuesta al negocio</Label>
            <Textarea
              id={`resp-${incidencia.id}`}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              placeholder="Ej: Mañana a primera hora te llevamos los 2 paquetes que faltaron."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" disabled={enviando || !respuesta.trim()} onClick={() => enviar("EN_REVISION")}>
              Responder y seguir revisando
            </Button>
            <Button disabled={enviando || !respuesta.trim()} onClick={() => enviar("RESUELTA")}>
              {enviando && <Girando />} Marcar como resuelta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FilaIncidencia({ incidencia, producto, alResponder }: { incidencia: IncidenciaProveedor; producto?: string; alResponder: () => void }) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">{MOTIVOS_INCIDENCIA[incidencia.motivo] ?? incidencia.motivo}</span>
          <Badge variant={incidencia.estado === "RESUELTA" ? "exito" : incidencia.estado === "EN_REVISION" ? "aviso" : "destructive"}>
            {ESTADO_INCIDENCIA[incidencia.estado] ?? incidencia.estado}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {producto ? `${producto} · ` : ""}
          {incidencia.negocio} · {haceTiempo(incidencia.creadaEn)}
        </p>
        <p className="mt-1 text-sm">{incidencia.descripcion}</p>
        {incidencia.respuesta && <p className="mt-1 rounded-xl bg-secondary px-3 py-2 text-sm">Tu respuesta: {incidencia.respuesta}</p>}
      </div>
      <ResponderIncidencia incidencia={incidencia} alResponder={alResponder} />
    </li>
  );
}
