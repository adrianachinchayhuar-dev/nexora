import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CargandoLista, Encabezado, ErrorCarga, Girando, Vacio } from "@/components/comun";
import { ImagenProducto } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import { del, post, put } from "@/lib/api";
import { fechaConDia, hoyLima, soles } from "@/lib/formato";
import type { Compra, Necesidad } from "@/lib/tipos";

const ESTADO: Record<string, { texto: string; variante: "info" | "exito" | "muted" | "naranja" | "secondary" }> = {
  ACTIVA: { texto: "Activo", variante: "secondary" },
  EN_COMPRA: { texto: "En compra en grupo", variante: "info" },
  ATENDIDA: { texto: "Recibido", variante: "exito" },
  CANCELADA: { texto: "Cancelado", variante: "muted" },
};

export function AccionCoincidencia({ n, alProponer }: { n: Necesidad; alProponer: (n: Necesidad) => void }) {
  const c = n.coincidencia;
  switch (c.tipo) {
    case "COMPRA":
      return (
        <Button asChild size="sm">
          <Link to={`/compras/${c.compraId}?pedido=${n.id}`}>
            Ver compra y unirme <ArrowRight />
          </Link>
        </Button>
      );
    case "UNIDO":
      return c.compraId ? (
        <Button asChild size="sm" variant="outline">
          <Link to={`/compras/${c.compraId}`}>Ver seguimiento</Link>
        </Button>
      ) : null;
    case "TARDE":
      return (
        <Button asChild size="sm" variant="outline">
          <Link to={`/compras/${c.compraId}?pedido=${n.id}`}>Ver la compra</Link>
        </Button>
      );
    case "PROPONER":
      return (
        <Button size="sm" variant="naranja" onClick={() => alProponer(n)}>
          <Plus /> Proponer compra en grupo
        </Button>
      );
    default:
      return null;
  }
}

export default function Pedidos() {
  const { datos, error, cargando, recargar } = useApi<Necesidad[]>("/necesidades");
  const navegar = useNavigate();
  const [editando, setEditando] = useState<Necesidad | null>(null);
  const [form, setForm] = useState({ cantidad: "", fechaRequerida: "", precioActual: "" });
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState<Necesidad | null>(null);

  const proponer = async (n: Necesidad) => {
    try {
      const c = await post<Compra>(`/necesidades/${n.id}/proponer`);
      toast.success("Propusiste una compra en grupo. Únete con tu pedido.");
      navegar(`/compras/${c.id}?pedido=${n.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo proponer.");
    }
  };

  const abrirEdicion = (n: Necesidad) => {
    setEditando(n);
    setForm({ cantidad: String(n.cantidad), fechaRequerida: n.fechaRequerida, precioActual: n.precioActual ? String(n.precioActual) : "" });
  };

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await put(`/necesidades/${editando.id}`, {
        cantidad: Number(form.cantidad),
        fechaRequerida: form.fechaRequerida,
        precioActual: form.precioActual ? Number(form.precioActual) : null,
        marcaPreferida: editando.marcaPreferida,
        aceptaEquivalente: editando.aceptaEquivalente,
      });
      toast.success("Pedido actualizado.");
      setEditando(null);
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async () => {
    if (!borrando) return;
    try {
      await del(`/necesidades/${borrando.id}`);
      toast.success("Pedido cancelado.");
      setBorrando(null);
      recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cancelar.");
    }
  };

  return (
    <div>
      <Encabezado
        titulo="Mis necesidades"
        etiqueta="Tus pedidos"
        imagen="/img/cabeceras/necesidades.webp"
        descripcion="Revisa qué necesitas y encuentra compras en grupo que lleguen a tiempo."
        accion={
          <Button asChild variant="naranja" size="lg">
            <Link to="/pedidos/nuevo">
              <Plus /> Nuevo pedido
            </Link>
          </Button>
        }
      />
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      {datos?.length === 0 && (
        <Vacio
          icono={<ClipboardList />}
          titulo="Aún no registras pedidos"
          texto="Escribe lo que necesitas, por ejemplo «12 botellas de aceite y una caja de leche»."
          accion={
            <Button asChild>
              <Link to="/pedidos/nuevo">Registrar mi primer pedido</Link>
            </Button>
          }
        />
      )}
      <div className="space-y-3">
        {datos?.map((n) => (
          <Card key={n.id} className="p-4">
            <div className="flex gap-3">
              <ImagenProducto nombre={n.producto.nombre} imagen={n.producto.imagen} className="size-16" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{n.producto.nombre}</h3>
                  <Badge variant={ESTADO[n.estado].variante}>{ESTADO[n.estado].texto}</Badge>
                </div>
                <p className="text-sm">
                  <span className="font-semibold">
                    {n.cantidad} {n.producto.unidad}
                  </span>
                  {n.precioActual && <span className="text-muted-foreground"> · hoy pagas {soles(n.precioActual)} c/u</span>}
                  {n.marcaPreferida && <span className="text-muted-foreground"> · prefieres {n.marcaPreferida}{n.aceptaEquivalente ? " (o equivalente)" : " (solo esa marca)"}</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <CalendarClock className="mr-1 inline size-4" />
                  Lo necesitas para el <span className="font-semibold text-foreground">{fechaConDia(n.fechaRequerida)}</span>
                </p>
              </div>
              {n.estado === "ACTIVA" && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar pedido" onClick={() => abrirEdicion(n)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Cancelar pedido" onClick={() => setBorrando(n)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-xl bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{n.coincidencia.mensaje}</p>
              <AccionCoincidencia n={n} alProponer={proponer} />
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pedido de {editando?.producto.nombre.toLowerCase()}</DialogTitle>
            <DialogDescription>Si cambias la fecha, volvemos a buscar una compra que llegue a tiempo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ed-cant">Cantidad ({editando?.producto.unidad})</Label>
              <Input id="ed-cant" type="number" min={1} value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-fecha">Lo necesitas para</Label>
              <Input id="ed-fecha" type="date" min={hoyLima()} value={form.fechaRequerida} onChange={(e) => setForm({ ...form, fechaRequerida: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ed-precio">¿Cuánto pagas hoy por cada uno? (opcional)</Label>
              <Input id="ed-precio" type="number" step="0.01" min={0} placeholder="Ej. 7.90" value={form.precioActual} onChange={(e) => setForm({ ...form, precioActual: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Volver
            </Button>
            <Button onClick={guardar} disabled={guardando || !form.cantidad || Number(form.cantidad) <= 0}>
              {guardando && <Girando />} Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!borrando} onOpenChange={(o) => !o && setBorrando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar este pedido?</DialogTitle>
            <DialogDescription>
              Dejarás de recibir avisos de compras de {borrando?.producto.nombre.toLowerCase()}. Puedes registrarlo de nuevo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrando(null)}>
              No, mantenerlo
            </Button>
            <Button variant="destructive" onClick={cancelar}>
              Sí, cancelar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
