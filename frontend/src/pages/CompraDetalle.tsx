import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  EyeOff,
  LogOut,
  Megaphone,
  PackageCheck,
  ShieldCheck,
  Star,
  TriangleAlert,
  Truck,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CargandoLista, ErrorCarga, Girando } from "@/components/comun";
import { AvanceMinimo, EstadoBadge, ImagenProducto, LineaFechas, TEXTO_ENTREGA, TramosPrecio } from "@/components/compra";
import { get, post } from "@/lib/api";
import { ESTADO_INCIDENCIA, ETIQUETA_AHORRO, MOTIVOS_INCIDENCIA, entregaTexto, fechaConDia, haceTiempo, soles } from "@/lib/formato";
import type { Ahorro, Compra, EntregaEstado } from "@/lib/tipos";
import { cn } from "@/lib/utils";

function TextoAhorro({ ahorro, unidad }: { ahorro: Ahorro; unidad: string }) {
  const etiqueta = ETIQUETA_AHORRO[ahorro.etiqueta];
  const positivo = ahorro.monto > 0;
  return (
    <div className="rounded-xl bg-exito-suave p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-exito">{positivo ? "Ahorro estimado" : "Sin ahorro estimado"}</span>
        <Badge variant="outline" className="border-exito/30 bg-card text-exito" title={etiqueta.ayuda}>
          {etiqueta.texto}
        </Badge>
      </div>
      <div className="text-2xl font-extrabold text-exito">{soles(Math.max(0, ahorro.monto))}</div>
      <p className="text-xs text-exito/90">
        Comparado con {soles(ahorro.precioReferencia)} por {unidad.replace(/s$/, "")} ({etiqueta.ayuda.charAt(0).toLowerCase() + etiqueta.ayuda.slice(1)})
      </p>
    </div>
  );
}

const PASOS_ENTREGA: EntregaEstado[] = ["EN_PREPARACION", "EN_CAMINO", "ENTREGADA"];

function SeguimientoEntrega({ compra }: { compra: Compra }) {
  const estado = compra.entregaEstado ?? "EN_PREPARACION";
  const retrasada = estado === "RETRASADA";
  const indice = retrasada ? 1 : PASOS_ENTREGA.indexOf(estado);
  return (
    <div className="space-y-3">
      <ol className="grid grid-cols-3 gap-2">
        {PASOS_ENTREGA.map((p, i) => {
          const hecho = i <= indice;
          const esRetraso = retrasada && i === 1;
          return (
            <li key={p} className="text-center">
              <div
                className={cn(
                  "mx-auto flex size-9 items-center justify-center rounded-full border-2",
                  esRetraso ? "border-destructive bg-destructive/10 text-destructive" : hecho ? "border-exito bg-exito text-white" : "border-border text-muted-foreground",
                )}
              >
                {esRetraso ? <TriangleAlert className="size-4" /> : i === 0 ? <PackageCheck className="size-4" /> : i === 1 ? <Truck className="size-4" /> : <CheckCircle2 className="size-4" />}
              </div>
              <div className={cn("mt-1 text-xs font-semibold", hecho ? "text-foreground" : "text-muted-foreground", esRetraso && "text-destructive")}>
                {esRetraso ? "Retrasada" : TEXTO_ENTREGA[p]}
              </div>
            </li>
          );
        })}
      </ol>
      {retrasada && (
        <Alert variant="destructive">
          <TriangleAlert />
          <div>
            La entrega está retrasada.
            {compra.compensacion ? <> Compromiso del proveedor: <b>{compra.compensacion}</b>.</> : " El proveedor no registró una compensación."} NEXORA registra el
            compromiso; la compensación la aplica el proveedor.
          </div>
        </Alert>
      )}
    </div>
  );
}

export default function CompraDetalle() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [compra, setCompra] = useState<Compra | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [necesidadId, setNecesidadId] = useState<string>(params.get("pedido") ?? "");
  const [cantidad, setCantidad] = useState<string>("");
  const [ocupado, setOcupado] = useState(false);
  const [confirmarUnion, setConfirmarUnion] = useState(false);
  const [confirmarRetiro, setConfirmarRetiro] = useState(false);
  const [incidencia, setIncidencia] = useState(false);
  const [motivo, setMotivo] = useState("NO_LLEGO");
  const [descripcion, setDescripcion] = useState("");

  const cargar = async (cant?: string, nec?: string) => {
    const q = new URLSearchParams();
    if (cant && Number(cant) > 0) q.set("cantidad", cant);
    if (nec) q.set("necesidadId", nec);
    try {
      const c = await get<Compra>(`/compras/${id}${q.toString() ? "?" + q : ""}`);
      setCompra(c);
      setError(null);
      return c;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar la compra.");
      return null;
    }
  };

  // Primera carga: si llegó con un pedido, se usa su cantidad.
  useEffect(() => {
    cargar(undefined, necesidadId || undefined).then((c) => {
      if (!c) return;
      const nec = c.necesidadesCompatibles.find((n) => String(n.id) === necesidadId) ?? c.necesidadesCompatibles[0];
      if (nec) {
        setNecesidadId(String(nec.id));
        setCantidad(String(nec.cantidad));
      } else if (c.simulacion) {
        setCantidad(String(c.simulacion.cantidad));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // «Si te unes con…»: se recalcula al cambiar la cantidad o el pedido.
  useEffect(() => {
    if (!compra || compra.miParticipacion || !compra.puedeUnirse) return;
    const t = window.setTimeout(() => cargar(cantidad, necesidadId || undefined), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cantidad, necesidadId]);

  const accion = async (ruta: string, cuerpo: unknown, exito: string) => {
    setOcupado(true);
    try {
      const c = await post<Compra>(`/compras/${id}/${ruta}`, cuerpo);
      setCompra(c);
      toast.success(exito);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const unirse = async () => {
    const ok = await accion("unirse", { cantidad: Number(cantidad), necesidadId: necesidadId ? Number(necesidadId) : null }, "¡Te uniste a la compra conjunta!");
    if (ok) setConfirmarUnion(false);
  };

  const retirarse = async () => {
    const ok = await accion("retirarse", {}, "Te retiraste. Tu pedido sigue guardado.");
    if (ok) setConfirmarRetiro(false);
  };

  const reportar = async () => {
    setOcupado(true);
    try {
      await post(`/compras/${id}/incidencias`, { motivo, descripcion });
      toast.success("Incidencia registrada. El proveedor y el administrador fueron avisados.");
      setIncidencia(false);
      setDescripcion("");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo registrar.");
    } finally {
      setOcupado(false);
    }
  };

  if (error && !compra) return <ErrorCarga mensaje={error} reintentar={() => cargar()} />;
  if (!compra) return <CargandoLista filas={3} />;

  const { producto, proveedor, resumen, estadoVisible } = compra;
  const mia = compra.miParticipacion;
  const sim = compra.simulacion;
  const unidad = producto.unidad;
  const pendiente = estadoVisible.clave === "REUNIENDO" || estadoVisible.clave === "ESPERANDO_PROVEEDOR";
  const requerida = mia?.fechaRequerida ?? compra.necesidadesCompatibles.find((n) => String(n.id) === necesidadId)?.fechaRequerida ?? null;
  const necesidadElegida = compra.necesidadesCompatibles.find((n) => String(n.id) === necesidadId);

  return (
    <div className="space-y-6">
      <Link to="/compras" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Compras conjuntas
      </Link>

      {/* Cabecera */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <ImagenProducto nombre={producto.nombre} imagen={producto.imagen} className="size-24" />
          <div className="flex-1">
            <div className="flex flex-wrap gap-2">
              <EstadoBadge clave={estadoVisible.clave} texto={estadoVisible.texto} />
              {mia && <Badge variant="naranja">Participas con {mia.cantidad} {unidad}</Badge>}
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold">{producto.nombre}</h1>
            <p className="text-muted-foreground">
              {producto.marca} · {producto.presentacion} · se vende por {producto.unidadVenta} ({producto.equivalencia} {unidad}) · {compra.zona.nombre}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary px-5 py-3 text-center">
            <div className="text-xs font-semibold text-secondary-foreground">{compra.precioFinal ? "Precio final" : "Precio actual"}</div>
            <div className="text-3xl font-extrabold text-primary">{soles(compra.precioFinal ?? resumen.precioActual)}</div>
            <div className="text-xs text-muted-foreground">por {unidad.replace(/s$/, "")} · normal {soles(resumen.precioNormal)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          {/* Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fechas de la compra</CardTitle>
            </CardHeader>
            <CardContent>
              <LineaFechas compra={compra} requerida={requerida} />
              {pendiente && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Hasta el cierre puedes unirte o retirarte. Después, el proveedor confirma stock, precio final y la fecha de entrega.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Avance y tramos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Precio por volumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AvanceMinimo compra={compra} />
              <TramosPrecio tramos={compra.tramos} indice={resumen.indiceTramo} unidad={unidad} total={compra.total} />
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <EyeOff className="mt-0.5 size-4 shrink-0" />
                Ves cuántas bodegas participan ({compra.negocios}) y la cantidad total. Nadie ve el nombre de tu bodega ni tu cantidad; el proveedor los verá solo si la
                compra se confirma.
              </p>
            </CardContent>
          </Card>

          {/* Entrega (solo confirmadas) */}
          {estadoVisible.clave === "CONFIRMADA" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="size-5 text-primary" /> Seguimiento de la entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SeguimientoEntrega compra={compra} />
                <p className="text-sm text-muted-foreground">
                  Llega {entregaTexto(compra.entregaDesde, compra.entregaHasta)}.
                  {compra.compensacion && (
                    <span className="ml-1 inline-flex items-center gap-1 font-semibold text-exito">
                      <ShieldCheck className="size-4" /> Entrega garantizada por el proveedor: {compra.compensacion}
                    </span>
                  )}
                </p>
                {mia && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {mia.recibido ? (
                      <Badge variant="exito" className="w-fit px-3 py-1.5 text-sm">
                        <BadgeCheck /> Confirmaste que recibiste tu pedido
                      </Badge>
                    ) : (
                      <Button
                        onClick={() => accion("recibido", {}, "¡Gracias! Registramos que recibiste tu pedido.")}
                        disabled={ocupado || compra.entregaEstado === "EN_PREPARACION"}
                        title={compra.entregaEstado === "EN_PREPARACION" ? "Disponible cuando el pedido esté en camino" : undefined}
                      >
                        <PackageCheck /> Recibí mi pedido
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIncidencia(true)}>
                      <CircleAlert /> Reportar un problema
                    </Button>
                  </div>
                )}
                {mia?.incidencias.length ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold">Tus incidencias</h3>
                    {mia.incidencias.map((i) => (
                      <div key={i.id} className="rounded-xl border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{MOTIVOS_INCIDENCIA[i.motivo] ?? i.motivo}</span>
                          <Badge variant={i.estado === "RESUELTA" ? "exito" : i.estado === "EN_REVISION" ? "aviso" : "info"}>{ESTADO_INCIDENCIA[i.estado]}</Badge>
                        </div>
                        <p className="text-muted-foreground">{i.descripcion}</p>
                        <p className="text-xs text-muted-foreground">{haceTiempo(i.creadaEn)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Avisos del proveedor */}
          {compra.avisos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Megaphone className="size-5 text-primary" /> Avisos del proveedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {compra.avisos.map((a, i) => (
                  <div key={i} className="rounded-xl bg-muted p-3 text-sm">
                    <p>{a.texto}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{haceTiempo(a.creadoEn)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna de decisión */}
        <div className="min-w-0 space-y-4">
          {mia?.debeAceptarPrecio && (
            <Card className="border-naranja">
              <CardHeader>
                <CardTitle className="text-base">El proveedor confirmó con otro precio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Precio final <b>{soles(compra.precioFinal)}</b> (te uniste con {soles(mia.precioEstimado)}). Entrega {entregaTexto(compra.entregaDesde, compra.entregaHasta)}
                  {!mia.llegaATiempo && <b className="text-destructive"> · ya no llega a tiempo para tu fecha</b>}.
                </p>
                <p className="text-muted-foreground">Decide si continúas. Si te retiras, tu pedido queda guardado.</p>
                <div className="flex gap-2">
                  <Button onClick={() => accion("aceptar-precio", {}, "Aceptaste el precio final.")} disabled={ocupado}>
                    Acepto y continúo
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmarRetiro(true)} disabled={ocupado}>
                    Me retiro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {mia ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tu participación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cantidad</span>
                  <span className="font-semibold">
                    {mia.cantidad} {unidad}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total estimado</span>
                  <span className="font-semibold">{soles(mia.cantidad * (compra.precioFinal ?? resumen.precioActual))}</span>
                </div>
                {compra.costoTransporte !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo de entrega</span>
                    <span className="font-semibold">{Number(compra.costoTransporte) === 0 ? "Sin costo" : soles(compra.costoTransporte)}</span>
                  </div>
                )}
                <TextoAhorro ahorro={mia.ahorro} unidad={unidad} />
                {pendiente && !mia.debeAceptarPrecio && (
                  <Button variant="outline" className="w-full" onClick={() => setConfirmarRetiro(true)}>
                    <LogOut /> Retirarme de la compra
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">El pago y la entrega se coordinan directamente con el proveedor, fuera de NEXORA.</p>
              </CardContent>
            </Card>
          ) : compra.puedeUnirse ? (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">Únete a esta compra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {compra.necesidadesCompatibles.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="pedido">Con tu pedido</Label>
                    <NativeSelect
                      id="pedido"
                      value={necesidadId}
                      onChange={(e) => {
                        setNecesidadId(e.target.value);
                        const n = compra.necesidadesCompatibles.find((x) => String(x.id) === e.target.value);
                        if (n) setCantidad(String(n.cantidad));
                      }}
                    >
                      {compra.necesidadesCompatibles.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.cantidad} {unidad} · para el {fechaConDia(n.fechaRequerida)}
                        </option>
                      ))}
                      <option value="">Sin pedido (indico la cantidad)</option>
                    </NativeSelect>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="cantidad">Cantidad ({unidad})</Label>
                  <Input id="cantidad" type="number" min={1} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
                </div>
                {sim && Number(cantidad) > 0 && (
                  <div className="space-y-2 rounded-xl border border-dashed p-3">
                    <p className="text-sm">
                      <b>Si te unes</b> con {sim.cantidad} {unidad}, el grupo llega a <b>{sim.totalConmigo}</b> y el precio sería{" "}
                      <b className="text-primary">{soles(sim.precioConmigo)}</b>.{" "}
                      {sim.alcanzaMinimo ? "Se alcanza el mínimo." : `Aún faltarían ${compra.minimo - sim.totalConmigo} para el mínimo.`}
                    </p>
                    <TextoAhorro ahorro={sim.ahorro} unidad={unidad} />
                    {necesidadElegida && !sim.llegaATiempo && (
                      <Alert variant="destructive">
                        <TriangleAlert />
                        <div>La entrega llega después de tu fecha ({fechaConDia(necesidadElegida.fechaRequerida)}).</div>
                      </Alert>
                    )}
                  </div>
                )}
                <Button className="w-full" size="lg" onClick={() => setConfirmarUnion(true)} disabled={!(Number(cantidad) > 0)}>
                  <Users /> Unirme a la compra
                </Button>
                <p className="text-xs text-muted-foreground">Es voluntario: puedes retirarte hasta que el proveedor confirme.</p>
              </CardContent>
            </Card>
          ) : (
            <Alert variant="lila">
              <CircleAlert />
              <div>{compra.motivoNoUnirse}</div>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proveedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{proveedor.razonSocial}</p>
              {proveedor.puntualidad !== null ? (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Star className="size-4 fill-naranja text-naranja" /> Entregó a tiempo {proveedor.entregasATiempo} de {proveedor.entregasTotal} compras ·{" "}
                  <b className="text-foreground">{proveedor.puntualidad}%</b>
                </p>
              ) : (
                <p className="text-muted-foreground">Aún no tiene entregas registradas.</p>
              )}
              <p className="flex items-center gap-1 text-muted-foreground">
                <BadgeCheck className="size-4 text-primary" /> Proveedor aprobado por NEXORA
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={confirmarUnion} onOpenChange={setConfirmarUnion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Te unes con {cantidad} {unidad}?</DialogTitle>
            <DialogDescription>
              El precio estimado es {soles(sim?.precioConmigo ?? resumen.precioActual)} por {unidad.replace(/s$/, "")}. Cuando se alcance el mínimo, el proveedor confirmará el precio final: si no
              sube, se acepta solo; si sube, tú decides.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarUnion(false)}>
              Volver
            </Button>
            <Button onClick={unirse} disabled={ocupado}>
              {ocupado && <Girando />} Sí, unirme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmarRetiro} onOpenChange={setConfirmarRetiro}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Te retiras de esta compra?</DialogTitle>
            <DialogDescription>Se recalculan la cantidad total, el tramo y el ahorro de las demás bodegas. Tu pedido queda guardado para otra compra.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarRetiro(false)}>
              Volver
            </Button>
            <Button variant="destructive" onClick={retirarse} disabled={ocupado}>
              {ocupado && <Girando />} Sí, retirarme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={incidencia} onOpenChange={setIncidencia}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar un problema</DialogTitle>
            <DialogDescription>Le avisamos al proveedor y al administrador. Te notificaremos cada cambio de estado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivo">¿Qué pasó?</Label>
              <NativeSelect id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {Object.entries(MOTIVOS_INCIDENCIA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Cuéntanos brevemente</Label>
              <Textarea id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Llegaron 4 paquetes en lugar de 6." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidencia(false)}>
              Volver
            </Button>
            <Button onClick={reportar} disabled={ocupado || descripcion.trim().length < 5}>
              {ocupado && <Girando />} Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
