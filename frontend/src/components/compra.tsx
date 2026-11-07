import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock3, PackageCheck, Truck, TriangleAlert, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { diasEntre, entregaTexto, fechaConDia, fechaCorta, imagenProducto, relativo, soles } from "@/lib/formato";
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

// ---------- Tarjeta de compra ----------

export function TarjetaCompra({ compra }: { compra: Compra }) {
  const { producto, estadoVisible, resumen } = compra;
  const pendiente = estadoVisible.clave === "REUNIENDO" || estadoVisible.clave === "ESPERANDO_PROVEEDOR";
  const mia = compra.miParticipacion;
  return (
    <Link to={`/compras/${compra.id}`} className="group block focus-visible:outline-none">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div className="flex gap-3">
          <ImagenProducto nombre={producto.nombre} imagen={producto.imagen} className="size-16" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <EstadoBadge clave={estadoVisible.clave} texto={estadoVisible.texto} />
              {mia && <Badge variant="naranja">Participas · {mia.cantidad} {producto.unidad}</Badge>}
            </div>
            <h3 className="mt-1 truncate font-bold">{producto.nombre}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {producto.marca} · {producto.presentacion} · {compra.proveedor.razonSocial}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">{compra.precioFinal ? "Precio final" : "Precio ahora"}</div>
            <div className="text-lg font-extrabold text-primary">{soles(compra.precioFinal ?? resumen.precioActual)}</div>
            <div className="text-xs text-muted-foreground">por {producto.unidad.replace(/s$/, "")}</div>
          </div>
        </div>
        {pendiente && (
          <div className="mt-3">
            <AvanceMinimo compra={compra} compacto />
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {pendiente ? (
            <span className={cn("font-semibold", diasEntre(compra.hoy, compra.fechaCierre) <= 1 && "text-naranja-tinta")}>
              <Clock3 className="mr-1 inline size-4" />
              Cierra {relativo(compra.fechaCierre, compra.hoy)} ({fechaCorta(compra.fechaCierre)})
            </span>
          ) : null}
          {estadoVisible.clave !== "NO_SE_CONCRETO" && (
            <span className="text-muted-foreground">
              <Truck className="mr-1 inline size-4" />
              Llega {entregaTexto(compra.entregaDesde, compra.entregaHasta)}
            </span>
          )}
          {compra.entregaEstado && (
            <Badge variant={compra.entregaEstado === "RETRASADA" ? "destructive" : "secondary"}>
              <PackageCheck /> {TEXTO_ENTREGA[compra.entregaEstado]}
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
