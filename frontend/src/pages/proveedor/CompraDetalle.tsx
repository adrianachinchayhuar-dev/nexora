import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, EyeOff, FlaskConical, Megaphone, PackageCheck, Truck, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { CargandoLista, ErrorCarga, Girando, Vacio } from "@/components/comun";
import { EstadoBadge, ImagenProducto, TEXTO_ENTREGA, TramosPrecio } from "@/components/compra";
import { FilaIncidencia } from "@/components/proveedor";
import { usePanel } from "@/layout/AplicacionProveedor";
import { post } from "@/lib/api";
import { fechaConDia, haceTiempo, hoyLima, rangoCorto, soles } from "@/lib/formato";
import type { CompraProveedor, EntregaEstado } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const PASOS_ENTREGA: EntregaEstado[] = ["EN_PREPARACION", "EN_CAMINO", "ENTREGADA"];

function useAccion(recargar: () => Promise<void>) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const ejecutar = async (clave: string, ruta: string, cuerpo: unknown = {}) => {
    setEnviando(clave);
    try {
      const r = await post<{ mensaje: string }>(ruta, cuerpo);
      toast.success(r.mensaje);
      await recargar();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar.");
      return false;
    } finally {
      setEnviando(null);
    }
  };
  return { enviando, ejecutar };
}

function Confirmar({ compra, recargar }: { compra: CompraProveedor; recargar: () => Promise<void> }) {
  const { enviando, ejecutar } = useAccion(recargar);
  const [f, setF] = useState({
    precioFinal: String(compra.precioActual),
    entregaDesde: compra.entregaDesde,
    entregaHasta: compra.entregaHasta,
    costoTransporte: String(compra.costoTransporte ?? 0),
    compensacion: compra.compensacion ?? "Si llega tarde, 5 % de descuento en el pedido",
  });
  const sube = Number(f.precioFinal) > compra.precioActual;
  const tarde = f.entregaHasta > compra.entregaHasta;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    ejecutar("confirmar", `/proveedor/compras/${compra.id}/confirmar`, {
      precioFinal: Number(f.precioFinal),
      entregaDesde: f.entregaDesde,
      entregaHasta: f.entregaHasta,
      costoTransporte: Number(f.costoTransporte || 0),
      compensacion: f.compensacion,
    });
  };

  return (
    <Card className="border-naranja/60 ring-1 ring-naranja/30">
      <CardHeader>
        <CardTitle>Confirma la compra</CardTitle>
        <CardDescription>
          Se alcanzó el mínimo con {compra.total} {compra.unidad}. Confirma stock, precio final por {compra.unidad.replace(/s$/, "")} y la fecha de entrega.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="precio">Precio final (S/)</Label>
            <Input id="precio" type="number" min="0.01" step="0.01" value={f.precioFinal} onChange={(e) => setF({ ...f, precioFinal: e.target.value })} />
            <p className="text-xs text-muted-foreground">Precio del tramo alcanzado: {soles(compra.precioActual)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transporte">Costo de entrega por negocio (S/)</Label>
            <Input id="transporte" type="number" min="0" step="0.10" value={f.costoTransporte} onChange={(e) => setF({ ...f, costoTransporte: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desde">Entrega desde</Label>
            <Input id="desde" type="date" min={hoyLima()} value={f.entregaDesde} onChange={(e) => setF({ ...f, entregaDesde: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hasta">Entrega hasta</Label>
            <Input id="hasta" type="date" min={f.entregaDesde || hoyLima()} value={f.entregaHasta} onChange={(e) => setF({ ...f, entregaHasta: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="compensacion">Compromiso si la entrega se retrasa</Label>
            <Input id="compensacion" value={f.compensacion} maxLength={160} onChange={(e) => setF({ ...f, compensacion: e.target.value })} />
          </div>
          {(sube || tarde) && (
            <p className="flex items-start gap-2 rounded-xl bg-aviso-suave p-3 text-sm text-aviso sm:col-span-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {sube ? "El precio es mayor que el del tramo alcanzado. " : ""}
              {tarde ? "La entrega es más tarde que la anunciada. " : ""}
              Los negocios afectados tendrán que aceptar antes de que la compra quede confirmada.
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={!!enviando || !Number(f.precioFinal) || !f.entregaHasta}>
              {enviando ? <Girando /> : <CheckCircle2 />} Confirmar stock, precio y entrega
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Entrega({ compra, recargar }: { compra: CompraProveedor; recargar: () => Promise<void> }) {
  const { enviando, ejecutar } = useAccion(recargar);
  const actual = compra.entregaEstado ?? "EN_PREPARACION";
  const indice = actual === "RETRASADA" ? 0 : PASOS_ENTREGA.indexOf(actual);
  const ruta = `/proveedor/compras/${compra.id}/entrega`;
  const recibidos = compra.participantes.filter((p) => p.recibido).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="size-5 text-primary" /> Entrega
        </CardTitle>
        <CardDescription>
          Llega {rangoCorto(compra.entregaDesde, compra.entregaHasta)} · Cada cambio avisa a los {compra.negocios} negocios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="grid grid-cols-3 gap-2">
          {PASOS_ENTREGA.map((p, i) => (
            <li key={p} className={cn("rounded-xl border p-3 text-center text-sm font-semibold", i <= indice && actual !== "RETRASADA" ? "border-primary bg-secondary text-primary" : "text-muted-foreground")}>
              {i < indice || actual === "ENTREGADA" ? <CheckCircle2 className="mx-auto mb-1 size-4" /> : <PackageCheck className="mx-auto mb-1 size-4" />}
              {TEXTO_ENTREGA[p]}
            </li>
          ))}
        </ol>
        {actual === "RETRASADA" && (
          <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            Marcaste la entrega como retrasada.{compra.compensacion ? ` Compromiso: ${compra.compensacion}.` : ""}
          </p>
        )}
        {actual === "ENTREGADA" ? (
          <p className="text-sm text-muted-foreground">
            Entrega registrada. {recibidos} de {compra.participantes.length} negocios confirmaron la recepción.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(actual === "EN_PREPARACION" || actual === "RETRASADA") && (
              <Button disabled={!!enviando} onClick={() => ejecutar("camino", ruta, { estado: "EN_CAMINO" })}>
                {enviando === "camino" ? <Girando /> : <Truck />} Marcar en camino
              </Button>
            )}
            {actual === "EN_CAMINO" && (
              <Button disabled={!!enviando} onClick={() => ejecutar("entregada", ruta, { estado: "ENTREGADA" })}>
                {enviando === "entregada" ? <Girando /> : <CheckCircle2 />} Registrar entrega
              </Button>
            )}
            {actual !== "RETRASADA" && (
              <Button variant="outline" disabled={!!enviando} onClick={() => ejecutar("retraso", ruta, { estado: "RETRASADA" })}>
                <TriangleAlert /> Avisar retraso
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Avisos({ compra, recargar }: { compra: CompraProveedor; recargar: () => Promise<void> }) {
  const { enviando, ejecutar } = useAccion(recargar);
  const [texto, setTexto] = useState("");
  const puede = compra.estadoVisible.clave !== "NO_SE_CONCRETO";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="size-5 text-primary" /> Avisos a los negocios
        </CardTitle>
        <CardDescription>Todos los participantes los ven en la compra y reciben una notificación.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {puede && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await ejecutar("aviso", `/proveedor/compras/${compra.id}/aviso`, { texto })) setTexto("");
            }}
          >
            <Textarea value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: Tenemos stock para el lote completo; la entrega sería en la mañana." aria-label="Nuevo aviso" />
            <Button type="submit" size="sm" disabled={!!enviando || !texto.trim()}>
              {enviando ? <Girando /> : <Megaphone />} Publicar aviso
            </Button>
          </form>
        )}
        {compra.avisos.length ? (
          <ul className="space-y-2">
            {compra.avisos.map((a, i) => (
              <li key={i} className="rounded-xl bg-muted px-3 py-2 text-sm">
                {a.texto}
                <span className="block text-xs text-muted-foreground">{haceTiempo(a.creadoEn)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no publicas avisos.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Prueba({ compra, recargar }: { compra: CompraProveedor; recargar: () => Promise<void> }) {
  const { enviando, ejecutar } = useAccion(recargar);
  const [cantidad, setCantidad] = useState("12");
  if (!["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(compra.estadoVisible.clave)) return null;
  return (
    <Card className="border-dashed bg-naranja-suave/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-naranja-tinta" /> Datos de prueba
        </CardTitle>
        <CardDescription>Solo para la sustentación: simula a otras bodegas de la zona.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-2">
        {compra.estadoVisible.clave === "REUNIENDO" && (
          <>
            <div className="space-y-1">
              <Label htmlFor="cant-prueba" className="text-xs">
                Cantidad
              </Label>
              <Input id="cant-prueba" type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="h-9 w-24" />
            </div>
            <Button size="sm" variant="outline" disabled={!!enviando || !(Number(cantidad) > 0)} onClick={() => ejecutar("sumar", `/proveedor/prueba/compras/${compra.id}/sumar-bodega`, { cantidad: Number(cantidad) })}>
              <Users /> Se une una bodega de prueba
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" disabled={!!enviando} onClick={() => ejecutar("cerrar", `/proveedor/prueba/compras/${compra.id}/cerrar`)}>
          Cerrar sin confirmar
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CompraProveedor() {
  const { id } = useParams();
  const { panel, error, recargar } = usePanel();
  useEffect(() => {
    recargar();
  }, [id, recargar]);

  if (error && !panel) return <ErrorCarga mensaje={error} reintentar={recargar} />;
  if (!panel) return <CargandoLista />;
  const compra = panel.compras.find((c) => String(c.id) === id);
  if (!compra)
    return (
      <Vacio
        icono={<EyeOff />}
        titulo="No encontramos esta compra"
        texto="Puede que no sea tuya o que se hayan restablecido los datos de prueba."
        accion={
          <Button asChild variant="outline">
            <Link to="/proveedor/compras">Volver a Compras en grupo</Link>
          </Button>
        }
      />
    );

  const confirmada = compra.estadoVisible.clave === "CONFIRMADA";
  const indiceTramo = Math.max(0, compra.tramos.findIndex((t) => compra.total >= t.desde && (t.hasta === null || compra.total <= t.hasta)));

  return (
    <div className="space-y-6">
      <Link to="/proveedor/compras" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Compras en grupo
      </Link>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ImagenProducto nombre={compra.producto} imagen={compra.imagen} className="size-24 bg-secondary" />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <EstadoBadge clave={compra.estadoVisible.clave} texto={compra.estadoVisible.texto} />
              {compra.entregaEstado && <Badge variant="secondary">{TEXTO_ENTREGA[compra.entregaEstado]}</Badge>}
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold">{compra.producto}</h1>
            <p className="text-muted-foreground">
              {compra.presentacion} · {compra.zona.nombre} · cierra el {fechaConDia(compra.fechaCierre)}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-muted-foreground">{compra.precioFinal ? "Precio final" : "Precio del tramo"}</div>
            <div className="text-3xl font-extrabold text-primary">{soles(compra.precioFinal ?? compra.precioActual)}</div>
            {compra.costoTransporte !== null && <div className="text-xs text-muted-foreground">+ {soles(compra.costoTransporte)} de entrega por negocio</div>}
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">{compra.tuTurno}</p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {compra.puedeConfirmar && <Confirmar compra={compra} recargar={recargar} />}
          {compra.estado === "PRECIO_POR_ACEPTAR" && (
            <Card className="p-5 text-sm">
              <p className="font-semibold">
                {compra.aceptaronPrecio} de {compra.negocios} negocios aceptaron tu precio y fecha.
              </p>
              <p className="text-muted-foreground">La compra queda confirmada cuando todos acepten. Quien no esté de acuerdo puede retirarse.</p>
            </Card>
          )}
          {confirmada && <Entrega compra={compra} recargar={recargar} />}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" /> Volumen reunido
              </CardTitle>
              <CardDescription>
                {compra.negocios} negocios · {compra.total} de {compra.minimo} {compra.unidad} (mínimo)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={compra.total} max={compra.minimo} label="Avance hacia el mínimo" barClassName={compra.total >= compra.minimo ? "bg-exito" : undefined} />
              <TramosPrecio tramos={compra.tramos} indice={indiceTramo} unidad={compra.unidad} total={compra.total} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Negocios para la entrega</CardTitle>
              <CardDescription>
                {confirmada ? "Datos para coordinar la entrega." : "Por privacidad, verás los negocios cuando la compra esté confirmada."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confirmada ? (
                <ul className="divide-y text-sm">
                  {compra.participantes.map((p, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <p className="font-semibold">{p.negocio}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.direccion} · {p.celular}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {p.cantidad} {compra.unidad}
                        </span>
                        {p.recibido && (
                          <Badge variant="exito">
                            <CheckCircle2 /> Recibió
                          </Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <EyeOff className="size-4" /> {compra.negocios} negocios participan.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card className="p-4">
            <p className="font-bold">Preguntas y mensajes</p>
            <p className="mb-3 text-sm text-muted-foreground">Las preguntas son anónimas y tu respuesta la ven todas las bodegas; el chat es privado con cada negocio.</p>
            <div className="grid gap-2">
              <Button asChild variant="outline">
                <Link to="/proveedor/mensajes?ver=preguntas">Responder preguntas</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/proveedor/mensajes">Ver conversaciones</Link>
              </Button>
            </div>
          </Card>
          <Avisos compra={compra} recargar={recargar} />
          {(confirmada || compra.incidencias.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Incidencias</CardTitle>
                <CardDescription>Reportes de los negocios sobre esta entrega.</CardDescription>
              </CardHeader>
              <CardContent>
                {compra.incidencias.length ? (
                  <ul className="divide-y">
                    {compra.incidencias.map((i) => (
                      <FilaIncidencia key={i.id} incidencia={i} alResponder={recargar} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin incidencias.</p>
                )}
              </CardContent>
            </Card>
          )}
          <Prueba compra={compra} recargar={recargar} />
        </div>
      </div>
    </div>
  );
}
