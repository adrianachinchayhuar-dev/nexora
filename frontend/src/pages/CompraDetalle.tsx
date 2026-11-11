import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  EyeOff,
  HelpCircle,
  LogOut,
  Megaphone,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Star,
  TriangleAlert,
  Truck,
  Users,
  XCircle,
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
import { EstadoBadge, ImagenProducto, TEXTO_ENTREGA } from "@/components/compra";
import { MensajesDeCompra } from "@/components/mensajes";
import { get, post } from "@/lib/api";
import {
  ESTADO_INCIDENCIA,
  ETIQUETA_AHORRO,
  MOTIVOS_INCIDENCIA,
  entregaTexto,
  fechaConDia,
  fechaCorta,
  haceTiempo,
  rangoCorto,
  relativo,
  singular,
  soles,
} from "@/lib/formato";
import type { Ahorro, Compra, EntregaEstado } from "@/lib/tipos";
import { cn } from "@/lib/utils";

function TextoAhorro({ ahorro, unidad }: { ahorro: Ahorro; unidad: string }) {
  const etiqueta = ETIQUETA_AHORRO[ahorro.etiqueta];
  const positivo = ahorro.monto > 0;
  return (
    <div className={cn("rounded-xl p-3", positivo ? "bg-exito-suave" : "bg-naranja-suave")}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-sm font-semibold", positivo ? "text-exito" : "text-naranja-tinta")}>
          {positivo ? "Ahorro estimado" : ahorro.monto < 0 ? "Con esta compra pagarías más" : "Mismo precio que hoy"}
        </span>
        <Badge variant="outline" className="border-exito/30 bg-card text-exito" title={etiqueta.ayuda}>
          {etiqueta.texto}
        </Badge>
      </div>
      <div className={cn("text-2xl font-extrabold", positivo ? "text-exito" : "text-naranja-tinta")}>
        {ahorro.monto < 0 ? `+${soles(-ahorro.monto)}` : soles(ahorro.monto)}
      </div>
      <p className={cn("text-xs", positivo ? "text-exito/90" : "text-naranja-tinta")}>
        Comparado con {soles(ahorro.precioReferencia)} por {unidad.replace(/s$/, "")} ({etiqueta.ayuda.charAt(0).toLowerCase() + etiqueta.ayuda.slice(1)})
      </p>
    </div>
  );
}

/** «¿Me conviene?» en palabras simples, antes de unirse. */
function Veredicto({ sim, unidad, fecha }: { sim: NonNullable<Compra["simulacion"]>; unidad: string; fecha: string | null }) {
  const tarde = fecha !== null && !sim.llegaATiempo;
  const monto = sim.ahorro.monto;
  const caro = monto < 0;
  const conviene = !tarde && !caro;
  const u = singular(unidad);
  const puntos: { ok: boolean; texto: string }[] = [];
  if (fecha) puntos.push({ ok: !tarde, texto: tarde ? `Llega después de tu fecha (${fechaConDia(fecha)})` : "Llega a tiempo para tu fecha" });
  puntos.push({
    ok: !caro,
    texto:
      monto > 0
        ? `Ahorras ${soles(monto)} (de ${soles(sim.ahorro.precioReferencia)} a ${soles(sim.ahorro.precioCompra)} por ${u})`
        : caro
          ? `Pagarías ${soles(-monto)} más: hoy pagas ${soles(sim.ahorro.precioReferencia)} y aquí ${soles(sim.ahorro.precioCompra)} por ${u}`
          : "Pagarías lo mismo que hoy",
  });
  return (
    <div className={cn("rounded-xl p-3.5", conviene ? "bg-exito-suave" : "bg-naranja-suave")}>
      <p className={cn("text-base font-bold", conviene ? "text-exito" : "text-naranja-tinta")}>{conviene ? "👍 Te conviene" : "✋ Revisa antes de unirte"}</p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {puntos.map((p) => (
          <li key={p.texto} className="flex items-start gap-2">
            {p.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-exito" /> : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-naranja-tinta" />}
            <span>{p.texto}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Es un cálculo. El precio final lo confirma el proveedor y tú decides.</p>
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
                  esRetraso
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : hecho
                      ? "border-exito bg-exito text-white"
                      : "border-border text-muted-foreground",
                )}
              >
                {esRetraso ? (
                  <TriangleAlert className="size-4" />
                ) : i === 0 ? (
                  <PackageCheck className="size-4" />
                ) : i === 1 ? (
                  <Truck className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
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
            {compra.compensacion ? (
              <>
                {" "}
                Compromiso del proveedor: <b>{compra.compensacion}</b>.
              </>
            ) : (
              " El proveedor no registró una compensación."
            )}{" "}
            NEXORA registra el compromiso; la compensación la aplica el proveedor.
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
  const navegar = useNavigate();
  const ver = params.get("ver");
  const { hash } = useLocation();
  const [oculta, setOculta] = useState(false);

  useEffect(() => {
    get<number[]>("/compras/ocultas")
      .then((ids) => setOculta(ids.includes(Number(id))))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    // El chat privado vive en Mensajes; aquí quedan las preguntas de la compra.
    if (ver === "mensajes") navegar(`/mensajes?compra=${id}`, { replace: true });
    else if (ver === "preguntas" || hash === "#mensajes") {
      window.setTimeout(() => document.getElementById("mensajes")?.scrollIntoView({ behavior: "smooth", block: "start" }), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ver, hash, id]);

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
    const ok = await accion(
      "unirse",
      { cantidad: Number(cantidad), necesidadId: necesidadId ? Number(necesidadId) : null },
      "¡Te uniste a la compra en grupo!",
    );
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
  const clave = estadoVisible.clave;
  const pendiente = clave === "REUNIENDO" || clave === "ESPERANDO_PROVEEDOR";
  const abierta = pendiente && compra.fechaCierre >= compra.hoy;
  const requerida = mia?.fechaRequerida ?? compra.necesidadesCompatibles.find((n) => String(n.id) === necesidadId)?.fechaRequerida ?? null;
  const necesidadElegida = compra.necesidadesCompatibles.find((n) => String(n.id) === necesidadId);
  const llega = requerida ? compra.entregaHasta <= requerida : null;
  const hoyPagas = necesidadElegida?.precioActual ?? (mia ? mia.ahorro.precioReferencia : sim?.ahorro.precioReferencia) ?? resumen.precioNormal;
  const nombreProveedor = proveedor.razonSocial.replace(/\s*\(.*\)$/, "");
  const iniciales = nombreProveedor
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const tope = Math.max(compra.minimo * 2, compra.total, compra.tramos[compra.tramos.length - 1]?.desde ?? compra.minimo);
  const pct = (n: number) => `${Math.min(100, (n / tope) * 100)}%`;

  const verPreguntas = () => document.getElementById("mensajes")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const ocultar = async () => {
    try {
      const r = await post<{ mensaje: string }>(`/compras/${id}/${oculta ? "mostrar" : "ocultar"}`);
      toast.success(r.mensaje);
      if (oculta) setOculta(false);
      else navegar("/compras");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar.");
    }
  };

  const pasos = [
    { clave: "REUNIENDO", titulo: "Reuniendo negocios", texto: "Otros negocios se están sumando. Aún no hay precio final." },
    { clave: "ESPERANDO_PROVEEDOR", titulo: "Esperando precio del proveedor", texto: "Se alcanzó el mínimo; el proveedor confirma stock, precio y fecha." },
    { clave: "CONFIRMADA", titulo: "Confirmada", texto: "Precio y entrega comprometidos. El pago y la entrega se coordinan con el proveedor." },
  ];
  const indicePaso = pasos.findIndex((p) => p.clave === clave);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/compras" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Compras en grupo
        </Link>
        <h1 className="mt-1 text-3xl font-extrabold">{producto.nombre}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {abierta && <Badge variant="naranja">Abierta · cierra el {fechaCorta(compra.fechaCierre)}.</Badge>}
          <EstadoBadge clave={clave} texto={estadoVisible.texto} />
          {mia && (
            <Badge variant="naranja">
              Participas con {mia.cantidad} {unidad}
            </Badge>
          )}
          {oculta && <Badge variant="muted">Oculta: no te interesa</Badge>}
          <span className="text-sm text-muted-foreground">{producto.presentacion}</span>
        </div>
        {mia && mia.ahorro.monto > 0 && (
          <p className="mt-2 text-sm">
            Tu ahorro {mia.ahorro.etiqueta === "CONFIRMADO" ? "confirmado" : "estimado"}: <b className="text-exito">{soles(mia.ahorro.monto)}</b>
          </p>
        )}
      </div>

      {/* Fechas en una sola línea */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
        <span className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-5 text-primary" />
          <span className="text-muted-foreground">{compra.fechaCierre < compra.hoy ? "Cerró" : "Puedes unirte hasta"}</span>
          <b className="text-base">{fechaConDia(compra.fechaCierre)}</b>
          {compra.fechaCierre >= compra.hoy && <span className="text-xs text-muted-foreground">({relativo(compra.fechaCierre, compra.hoy)})</span>}
        </span>
        <span className="flex items-center gap-2 text-sm">
          <Truck className="size-5 text-exito" />
          <span className="text-muted-foreground">Llega</span>
          <b className="text-base">{rangoCorto(compra.entregaDesde, compra.entregaHasta)}</b>
        </span>
        {requerida && clave !== "NO_SE_CONCRETO" && (
          <span
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
              llega ? "bg-exito-suave text-exito" : "bg-destructive/10 text-destructive",
            )}
          >
            {llega ? <CheckCircle2 className="size-4" /> : <TriangleAlert className="size-4" />}
            Lo necesitas el {fechaCorta(requerida)} · {llega ? "llega a tiempo" : "llega tarde"}
          </span>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Producto */}
            <Card className="p-4">
              <div className="flex gap-3">
                <ImagenProducto nombre={producto.nombre} imagen={producto.imagen} className="size-24 bg-secondary" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Compra en grupo</p>
                  <p className="text-xl font-extrabold leading-tight">{producto.nombre}</p>
                  <p className="text-sm text-muted-foreground">{producto.presentacion}</p>
                  <p className="text-xs text-muted-foreground">
                    {producto.marca} · se vende por {producto.unidadVenta}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{compra.precioFinal ? "Precio final del grupo" : "Precio del grupo hoy"}</p>
                  <p className="text-lg font-extrabold">
                    {soles(compra.precioFinal ?? resumen.precioActual)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">por {singular(unidad)}</span>
                  </p>
                  {sim && !mia && sim.precioConmigo !== (compra.precioFinal ?? resumen.precioActual) && (
                    <p className="text-xs text-primary">Contigo bajaría a {soles(sim.precioConmigo)}</p>
                  )}
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Lo que pagas hoy</p>
                  <p className="text-lg font-extrabold">
                    {hoyPagas ? soles(hoyPagas) : "—"}{" "}
                    {hoyPagas ? <span className="text-xs font-normal text-muted-foreground">por {singular(unidad)}</span> : null}
                  </p>
                  {!hoyPagas && <p className="text-xs text-muted-foreground">Indícalo en tu pedido para comparar</p>}
                </div>
              </div>
            </Card>

            {/* ¿Qué pasa ahora? */}
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">
                  <Users className="size-4" />
                </span>
                ¿Qué pasa ahora?
              </h2>
              {clave === "NO_SE_CONCRETO" ? (
                <Alert variant="lila">
                  <XCircle />
                  <div>La compra cerró sin alcanzar el mínimo o sin la confirmación del proveedor. Tu pedido sigue guardado para otra compra.</div>
                </Alert>
              ) : (
                <ol className="space-y-3">
                  {pasos.map((p, i) => {
                    const actual = i === indicePaso;
                    const hecho = i < indicePaso;
                    return (
                      <li key={p.clave} className="flex gap-3">
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                            actual
                              ? "border-primary bg-primary text-primary-foreground"
                              : hecho
                                ? "border-exito bg-exito text-white"
                                : "border-border text-muted-foreground",
                          )}
                        >
                          {hecho ? <CheckCircle2 className="size-4" /> : i + 1}
                        </span>
                        <div>
                          <p className={cn("text-sm font-semibold", actual && "text-primary")}>{p.titulo}</p>
                          {actual && <p className="text-xs text-muted-foreground">{p.texto}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>

          {/* Precio por cantidad */}
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-bold">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">
                    <Users className="size-4" />
                  </span>
                  Precio por cantidad
                </h2>
                <p className="mt-2 text-3xl font-extrabold">
                  {compra.total} <span className="text-sm font-normal text-muted-foreground">{unidad} reunidas</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-primary">{soles(compra.precioFinal ?? resumen.precioActual)}</p>
                <p className="text-xs text-muted-foreground">por {singular(unidad)}</p>
              </div>
            </div>
            <div className="relative mt-6 h-3 rounded-full bg-lila">
              <div className="h-3 rounded-full bg-gradient-to-r from-primary to-naranja" style={{ width: pct(compra.total) }} />
              <div className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-naranja-tinta" style={{ left: pct(compra.minimo) }}>
                Mínimo {compra.minimo}
              </div>
              <div className="absolute -top-1 h-5 w-0.5 bg-naranja-tinta" style={{ left: pct(compra.minimo) }} />
              {compra.tramos
                .slice(1)
                .map((t) =>
                  t.desde !== compra.minimo ? (
                    <div key={t.desde} className="absolute -top-1 h-5 w-px bg-muted-foreground/50" style={{ left: pct(t.desde) }} />
                  ) : null,
                )}
            </div>
            <div className="relative mt-1 h-4 text-[10px] text-muted-foreground">
              {compra.tramos.slice(1).map((t) => (
                <span key={t.desde} className="absolute -translate-x-1/2" style={{ left: pct(t.desde) }}>
                  {t.desde}
                </span>
              ))}
            </div>
            {resumen.faltanSiguiente !== null && resumen.precioSiguiente !== null && pendiente && (
              <p className="mt-2 text-sm font-semibold">
                Faltan <span className="text-primary">{resumen.faltanSiguiente}</span> para bajar a{" "}
                <span className="text-primary">{soles(resumen.precioSiguiente)}</span>
              </p>
            )}
            {sim && !mia && Number(cantidad) > 0 && (
              <p className="mt-2 rounded-xl bg-naranja-suave px-3 py-2 text-sm text-naranja-tinta">
                Con tu pedido de {sim.cantidad} llegan a {sim.totalConmigo} y el precio sería <b>{soles(sim.precioConmigo)}</b>.
              </p>
            )}
            <ul className="mt-3 space-y-1">
              {compra.tramos.map((t, i) => (
                <li
                  key={t.desde}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                    i === resumen.indiceTramo ? "border-2 border-primary bg-secondary/50 font-semibold" : "text-muted-foreground",
                  )}
                >
                  <span>{t.hasta === null ? `desde ${t.desde} ${unidad}` : `de ${t.desde} a ${t.hasta} ${unidad}`}</span>
                  <span className="flex items-center gap-2">
                    <b className="text-foreground">{soles(t.precio)}</b>
                    {i === resumen.indiceTramo && <Badge variant="secondary">Precio actual</Badge>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Mínimo para comprar en grupo: {compra.minimo}
              {resumen.faltaMinimo > 0 ? ` · faltan ${resumen.faltaMinimo}.` : " · alcanzado."}
            </p>
          </Card>

          {/* Negocios unidos */}
          <Card className="p-5">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-primary">
                <Users className="size-4" />
              </span>
              Negocios unidos
            </h2>
            <div className="flex items-center gap-4">
              <p className="text-3xl font-extrabold">
                {compra.negocios} <span className="text-sm font-normal text-muted-foreground">negocios unidos</span>
              </p>
              <div className="flex flex-1 gap-1">
                {Array.from({ length: Math.min(compra.negocios, 12) }).map((_, i) => (
                  <span key={i} className="h-2 flex-1 rounded-full bg-primary" />
                ))}
              </div>
            </div>
            {compra.negocios === 0 && pendiente && (
              <p className="mt-1 text-sm font-semibold text-primary">Aún no se une nadie: ¡puedes ser la primera bodega!</p>
            )}
            <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <EyeOff className="mt-0.5 size-4 shrink-0" />
              Nadie ve el nombre de tu bodega ni tu cantidad; el proveedor los verá solo si la compra se confirma.
            </p>
          </Card>

          {/* Entrega (solo confirmadas) */}
          {clave === "CONFIRMADA" && (
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
                          <Badge variant={i.estado === "RESUELTA" ? "exito" : i.estado === "EN_REVISION" ? "aviso" : "info"}>
                            {ESTADO_INCIDENCIA[i.estado]}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{i.descripcion}</p>
                        {i.respuesta && <p className="mt-1.5 rounded-lg bg-exito-suave px-3 py-2 text-exito">Respuesta del proveedor: {i.respuesta}</p>}
                        <p className="mt-1 text-xs text-muted-foreground">{haceTiempo(i.creadaEn)}</p>
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

          {/* Mensajes */}
          <Card id="mensajes" className="scroll-mt-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="size-5 text-primary" /> Preguntas de la compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MensajesDeCompra compraId={compra.id} solo="preguntas" />
            </CardContent>
          </Card>
        </div>

        {/* Columna de decisión */}
        <div className="min-w-0 space-y-4">
          {mia?.debeAceptarPrecio && (
            <Card className="border-naranja ring-1 ring-naranja/30">
              <CardHeader>
                <CardTitle className="text-base">El proveedor confirmó con otro precio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Precio final <b>{soles(compra.precioFinal)}</b> (te uniste con {soles(mia.precioEstimado)}). Entrega{" "}
                  {entregaTexto(compra.entregaDesde, compra.entregaHasta)}
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-5 text-primary" /> Tu participación
                </CardTitle>
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
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="size-5 text-primary" /> Qué puedes hacer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                {sim && Number(cantidad) > 0 && <Veredicto sim={sim} unidad={unidad} fecha={necesidadElegida?.fechaRequerida ?? null} />}
                <Button className="w-full" size="lg" onClick={() => setConfirmarUnion(true)} disabled={!(Number(cantidad) > 0)}>
                  Unirme con {Number(cantidad) > 0 ? `${cantidad} ${unidad}` : "mi pedido"}
                </Button>
                <Button variant="outline" className="w-full" onClick={ocultar}>
                  {oculta ? "Volver a mostrar" : "No me interesa"}
                </Button>
                <p className="text-xs text-muted-foreground">Es voluntario: puedes retirarte hasta que el proveedor confirme.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <Alert variant="lila">
                <CircleAlert />
                <div>{compra.motivoNoUnirse}</div>
              </Alert>
              {!mia && (
                <Button variant="ghost" className="w-full" onClick={ocultar}>
                  {oculta ? "Volver a mostrar" : "No me interesa"}
                </Button>
              )}
            </div>
          )}

          <Card className="p-4">
            <div className="flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">{iniciales}</span>
              <div className="text-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Te vende</p>
                <p className="font-bold">{nombreProveedor}</p>
                <p className="text-muted-foreground">
                  {compra.negocios === 0
                    ? "Aún no se une ninguna bodega"
                    : `${compra.negocios} ${compra.negocios === 1 ? "bodega ya se unió" : "bodegas ya se unieron"}`}
                </p>
                {proveedor.puntualidad !== null ? (
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Star className="size-3.5 fill-naranja text-naranja" /> Entregó a tiempo {proveedor.entregasATiempo} de {proveedor.entregasTotal} compras ·{" "}
                    {proveedor.puntualidad}%
                  </p>
                ) : (
                  <p className="text-muted-foreground">Aún no tiene entregas registradas.</p>
                )}
                <p className="flex items-center gap-1 text-muted-foreground">
                  <BadgeCheck className="size-3.5 text-primary" /> Proveedor aprobado por NEXORA
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" onClick={() => navegar(`/mensajes?compra=${compra.id}`)}>
                <MessageCircle /> Escribir al proveedor (chat privado)
              </Button>
              <Button variant="ghost" size="sm" onClick={verPreguntas}>
                <HelpCircle /> Ver o hacer preguntas
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Diálogos */}
      <Dialog open={confirmarUnion} onOpenChange={setConfirmarUnion}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ¿Te unes con {cantidad} {unidad}?
            </DialogTitle>
            <DialogDescription>
              El precio estimado es {soles(sim?.precioConmigo ?? resumen.precioActual)} por {unidad.replace(/s$/, "")}. Cuando se alcance el mínimo, el
              proveedor confirmará el precio final: si no sube, se acepta solo; si sube, tú decides.
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
            <DialogDescription>
              Se recalculan la cantidad total, el tramo y el ahorro de las demás bodegas. Tu pedido queda guardado para otra compra.
            </DialogDescription>
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
