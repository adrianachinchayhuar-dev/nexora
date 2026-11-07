import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronRight, Clock3, PackageCheck, Truck, TriangleAlert, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ETIQUETA_AHORRO, diasEntre, fechaConDia, fechaCorta, imagenProducto, rangoCorto, relativo, singular, soles } from "@/lib/formato";
import type { ClaveVisible, Compra, EntregaEstado, Tramo } from "@/lib/tipos";

// ---------- Estado visible (las 4 etiquetas de la tesis) ----------

const ESTILO_ESTADO: Record<ClaveVisible, { variante: "info" | "aviso" | "exito" | "muted"; icono: typeof Users }> = {
  REUNIENDO: { variante: "info", icono: Users },
  ESPERANDO_PROVEEDOR: { variante: "aviso", icono: Clock3 },
  CONFIRMADA: { variante: "exito", icono: CheckCircle2 },
  NO_SE_CONCRETO: { variante: "muted", icono: XCircle },
};

export function EstadoBadge({ clave, texto, className }: { clave: ClaveVisible; texto: string; className?: string }) {
  const e = ESTILO_ESTADO[clave];
  const Icono = e.icono;
  return (
    <Badge variant={e.variante} className={className}>
      <Icono /> {texto}
    </Badge>
  );
}

export const TEXTO_ENTREGA: Record<EntregaEstado, string> = {
  EN_PREPARACION: "En preparación",
  EN_CAMINO: "En camino",
  ENTREGADA: "Entregada",
  RETRASADA: "Retrasada",
};

// ---------- Imagen del producto ----------

export function ImagenProducto({ nombre, imagen, className }: { nombre: string; imagen: string | null; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted", className)}>
      <img src={imagenProducto(imagen)} alt={nombre} className="h-full w-full object-contain p-1.5" loading="lazy" />
    </div>
  );
}

// ---------- Avance hacia el mínimo ----------

export function AvanceMinimo({ compra, compacto = false }: { compra: Compra; compacto?: boolean }) {
  const { total, minimo, resumen, producto } = compra;
  const u = producto.unidad;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">
          {total} de {minimo} {u}
        </span>
        <span className="text-muted-foreground">
          <Users className="mr-1 inline size-3.5" />
          {compra.negocios} {compra.negocios === 1 ? "bodega" : "bodegas"}
        </span>
      </div>
      <Progress value={total} max={minimo} label="Avance hacia el mínimo" barClassName={resumen.alcanzaMinimo ? "bg-exito" : undefined} />
      {!compacto && (
        <p className="text-xs text-muted-foreground">
          {resumen.alcanzaMinimo
            ? "Se alcanzó el mínimo."
            : `Faltan ${resumen.faltaMinimo} ${u} para el mínimo.`}
          {resumen.faltanSiguiente !== null && resumen.precioSiguiente !== null && (
            <> Con {resumen.faltanSiguiente} más, el precio baja a {soles(resumen.precioSiguiente)}.</>
          )}
        </p>
      )}
    </div>
  );
}

// ---------- Tramos de precio ----------

export function TramosPrecio({ tramos, indice, unidad, total }: { tramos: Tramo[]; indice: number; unidad: string; total: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {tramos.map((t, i) => {
        const activo = i === indice;
        const pasado = i < indice;
        return (
          <div
            key={t.desde}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              activo ? "border-primary bg-secondary" : "bg-card",
              pasado && "opacity-60",
            )}
          >
            <div className="text-xs font-semibold text-muted-foreground">
              {t.hasta === null ? `${t.desde} o más` : `${t.desde} a ${t.hasta}`} {unidad}
            </div>
            <div className={cn("text-xl font-extrabold", activo && "text-primary")}>{soles(t.precio)}</div>
            <div className="text-xs text-muted-foreground">
              {activo ? (
                <span className="font-semibold text-primary">Tramo actual · {total} {unidad}</span>
              ) : i === 0 ? (
                "Precio normal"
              ) : (
                "Por volumen"
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Línea de tiempo de fechas: Hoy → Cierra → Entrega ----------

export function LineaFechas({ compra, requerida }: { compra: Compra; requerida?: string | null }) {
  const { hoy, fechaCierre, entregaDesde, entregaHasta } = compra;
  const llega = requerida ? entregaHasta <= requerida : null;
  const puntos = [
    { clave: "hoy", titulo: "Hoy", fecha: hoy, detalle: fechaConDia(hoy), icono: CalendarClock },
    {
      clave: "cierre",
      titulo: fechaCierre < hoy ? "Cerró" : "Cierra",
      fecha: fechaCierre,
      detalle: `${fechaConDia(fechaCierre)} · ${relativo(fechaCierre, hoy)}`,
      icono: Clock3,
    },
    {
      clave: "entrega",
      titulo: "Entrega",
      fecha: entregaHasta,
      detalle: entregaDesde === entregaHasta ? fechaConDia(entregaHasta) : `${fechaCorta(entregaDesde)} – ${fechaCorta(entregaHasta)}`,
      icono: Truck,
    },
  ];
  return (
    <div className="space-y-3">
      <ol className="grid grid-cols-3 gap-2">
        {puntos.map((p, i) => {
          const Icono = p.icono;
          return (
            <li key={p.clave} className="relative">
              {i < puntos.length - 1 && <div className="absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[17px] h-0.5 bg-lila" />}
              <div className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "relative z-10 flex size-9 items-center justify-center rounded-full border-2 bg-card",
                    p.clave === "hoy" ? "border-naranja text-naranja" : "border-primary text-primary",
                  )}
                >
                  <Icono className="size-4" />
                </div>
                <div className="mt-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{p.titulo}</div>
                <div className="text-sm font-semibold">{p.detalle}</div>
              </div>
            </li>
          );
        })}
      </ol>
      {requerida && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm",
            llega ? "bg-exito-suave text-exito" : "bg-destructive/10 text-destructive",
          )}
        >
          {llega ? <CheckCircle2 className="size-4" /> : <TriangleAlert className="size-4" />}
          <span className="font-semibold">{llega ? "Llega a tiempo" : "Llega tarde"}</span>
          <span>
            · Lo necesitas para el {fechaConDia(requerida)}
            {!llega && ` (${diasEntre(requerida, entregaHasta)} días después)`}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- Tarjeta de compra (como en el prototipo) ----------

function ChipFechas({ compra }: { compra: Compra }) {
  const pendiente = compra.estadoVisible.clave === "REUNIENDO" || compra.estadoVisible.clave === "ESPERANDO_PROVEEDOR";
  const abierta = compra.fechaCierre >= compra.hoy;
  const partes = [
    pendiente && abierta ? `Cierra ${relativo(compra.fechaCierre, compra.hoy)}` : `Cerró ${relativo(compra.fechaCierre, compra.hoy)}`,
    compra.estadoVisible.clave !== "NO_SE_CONCRETO" ? `Llega ${rangoCorto(compra.entregaDesde, compra.entregaHasta)}` : null,
  ].filter(Boolean);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
      <span className="size-1.5 rounded-full bg-foreground" /> {partes.join(" · ")}
    </span>
  );
}

function EtiquetaAhorro({ etiqueta }: { etiqueta: string }) {
  return <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 align-middle text-[10px] font-semibold text-muted-foreground">{ETIQUETA_AHORRO[etiqueta]?.texto ?? etiqueta.toLowerCase()}</span>;
}

export function TarjetaCompra({ compra }: { compra: Compra }) {
  const { producto, estadoVisible, resumen } = compra;
  const clave = estadoVisible.clave;
  const pendiente = clave === "REUNIENDO" || clave === "ESPERANDO_PROVEEDOR";
  const mia = compra.miParticipacion;
  const sim = compra.simulacion;
  const u = producto.unidad;
  const llega = mia ? (mia.fechaRequerida ? mia.llegaATiempo : null) : sim ? sim.llegaATiempo : null;

  let avance: string;
  if (clave === "NO_SE_CONCRETO") avance = `${compra.total} / ${compra.minimo} · no llegó al mínimo`;
  else if (resumen.faltanSiguiente !== null && resumen.precioSiguiente !== null && pendiente)
    avance = `${compra.total} / ${compra.minimo} · faltan ${resumen.faltanSiguiente} para ${soles(resumen.precioSiguiente)}`;
  else if (!resumen.alcanzaMinimo) avance = `${compra.total} / ${compra.minimo} · faltan ${resumen.faltaMinimo} para el mínimo`;
  else avance = `${compra.total} ${u} · mejor precio ${soles(compra.precioFinal ?? resumen.precioActual)}`;

  return (
    <Link to={`/compras/${compra.id}`} className="group block focus-visible:outline-none">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring sm:p-5">
        <div className="flex gap-4">
          <ImagenProducto nombre={producto.nombre} imagen={producto.imagen} className="mt-7 size-14 bg-secondary sm:size-16" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <ChipFechas compra={compra} />
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold leading-snug">{producto.nombre}</h3>
              {pendiente && compra.fechaCierre >= compra.hoy ? (
                <Badge variant="naranja" className="shrink-0">Cierra el {fechaCorta(compra.fechaCierre)}.</Badge>
              ) : clave === "NO_SE_CONCRETO" ? (
                <Badge variant="muted" className="shrink-0">Cerró el {fechaCorta(compra.fechaCierre)}.</Badge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {producto.presentacion} · {compra.proveedor.razonSocial}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <EstadoBadge clave={clave} texto={estadoVisible.texto} />
              {llega !== null && clave !== "NO_SE_CONCRETO" && (
                <Badge variant={llega ? "exito" : "destructive"}>
                  {llega ? <CheckCircle2 /> : <TriangleAlert />} {llega ? "Llega a tiempo para tu fecha" : "Llega tarde para tu fecha"}
                </Badge>
              )}
              {mia && <Badge variant="naranja">Participas · {mia.cantidad} {u}</Badge>}
              {compra.entregaEstado && (
                <Badge variant={compra.entregaEstado === "RETRASADA" ? "destructive" : "secondary"}>
                  <PackageCheck /> {TEXTO_ENTREGA[compra.entregaEstado]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-lila">
                <span
                  className={cn("block h-full rounded-full", resumen.alcanzaMinimo ? "bg-exito" : "bg-primary")}
                  style={{ width: `${Math.min(100, (compra.total / Math.max(1, compra.minimo)) * 100)}%` }}
                />
              </span>
              {avance}
            </div>
            <p className="text-xs text-muted-foreground">
              <Users className="mr-1 inline size-3.5" />
              {compra.negocios} {compra.negocios === 1 ? "negocio" : "negocios"}
            </p>
            <p className="text-sm">
              {clave === "NO_SE_CONCRETO" ? (
                <>Precio en grupo: {soles(resumen.precioActual)} por {singular(u)}</>
              ) : (
                <>
                  {compra.precioFinal ? "Precio final" : "Precio en grupo hoy"}: {soles(compra.precioFinal ?? resumen.precioActual)}
                  {sim && (
                    <>
                      {" "}· Si te unes: {soles(sim.precioConmigo)} · Ahorro estimado{" "}
                      <b className="text-exito">{soles(sim.ahorro.monto)}</b>
                      <EtiquetaAhorro etiqueta={sim.ahorro.etiqueta} />
                    </>
                  )}
                  {mia && mia.ahorro.monto > 0 && (
                    <>
                      {" "}· Tu ahorro {mia.ahorro.etiqueta === "CONFIRMADO" ? "confirmado" : "estimado"}{" "}
                      <b className="text-exito">{soles(mia.ahorro.monto)}</b>
                      {mia.ahorro.etiqueta !== "CONFIRMADO" && <EtiquetaAhorro etiqueta={mia.ahorro.etiqueta} />}
                    </>
                  )}
                </>
              )}
            </p>
            {(sim || mia) && (
              <p className="text-xs text-muted-foreground">
                Tu pedido: {mia ? mia.cantidad : sim!.cantidad} {u}
              </p>
            )}
          </div>
          <ChevronRight className="mt-8 size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
