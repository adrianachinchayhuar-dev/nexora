import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronRight, Clock3, PackageCheck, Truck, TriangleAlert, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { diasEntre, entregaTexto, fechaConDia, fechaCorta, imagenProducto, relativo, singular, soles } from "@/lib/formato";
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
          {resumen.alcanzaMinimo ? "Se alcanzó el mínimo." : `Faltan ${resumen.faltaMinimo} ${u} para el mínimo.`}
          {resumen.faltanSiguiente !== null && resumen.precioSiguiente !== null && (
            <>
              {" "}
              Con {resumen.faltanSiguiente} más, el precio baja a {soles(resumen.precioSiguiente)}.
            </>
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
            className={cn("rounded-xl border p-3 transition-colors", activo ? "border-primary bg-secondary" : "bg-card", pasado && "opacity-60")}
          >
            <div className="text-xs font-semibold text-muted-foreground">
              {t.hasta === null ? `${t.desde} o más` : `${t.desde} a ${t.hasta}`} {unidad}
            </div>
            <div className={cn("text-xl font-extrabold", activo && "text-primary")}>{soles(t.precio)}</div>
            <div className="text-xs text-muted-foreground">
              {activo ? (
                <span className="font-semibold text-primary">
                  Tramo actual · {total} {unidad}
                </span>
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

/** Una sola frase con la fecha que importa según el momento de la compra. */
export function fraseFecha(compra: Compra): string {
  const clave = compra.estadoVisible.clave;
  const { hoy } = compra;
  if (clave === "NO_SE_CONCRETO") return `Se cerró el ${fechaCorta(compra.fechaCierre)}`;
  if (clave === "CONFIRMADA") {
    if (compra.entregaEstado === "ENTREGADA") return "Ya fue entregada";
    if (compra.entregaHasta < hoy) return `Debía llegar el ${fechaCorta(compra.entregaHasta)}`;
    return `Llega ${entregaTexto(compra.entregaDesde, compra.entregaHasta)}`;
  }
  const cierre =
    compra.fechaCierre >= hoy
      ? `Puedes unirte hasta ${relativo(compra.fechaCierre, hoy) === "hoy" ? "hoy" : `el ${fechaConDia(compra.fechaCierre)}`}`
      : "Ya no recibe más negocios";
  return `${cierre} · llegaría ${entregaTexto(compra.entregaDesde, compra.entregaHasta)}`;
}

/** Ahorro en palabras: positivo en verde; si conviene menos que lo que pagas hoy, lo dice claro. */
export function TextoAhorro({ monto, si = false }: { monto: number; si?: boolean }) {
  if (monto > 0)
    return (
      <span className="font-semibold text-exito">
        {si ? "Ahorrarías" : "Ahorras"} {soles(monto)}
      </span>
    );
  if (monto < 0)
    return (
      <span className="font-semibold text-naranja-tinta">
        {si ? "Pagarías" : "Pagas"} {soles(-monto)} más que hoy
      </span>
    );
  return <span className="text-muted-foreground">Mismo precio que hoy</span>;
}

export function TarjetaCompra({ compra }: { compra: Compra }) {
  const { producto, estadoVisible, resumen } = compra;
  const clave = estadoVisible.clave;
  const pendiente = clave === "REUNIENDO" || clave === "ESPERANDO_PROVEEDOR";
  const mia = compra.miParticipacion;
  const sim = compra.simulacion;
  const u = producto.unidad;
  const llega = mia ? (mia.fechaRequerida ? mia.llegaATiempo : null) : sim ? sim.llegaATiempo : null;
  const precio = compra.precioFinal ?? resumen.precioActual;

  let avance: string;
  if (clave === "NO_SE_CONCRETO") avance = `No se juntó lo suficiente (${compra.total} de ${compra.minimo} ${u})`;
  else if (!resumen.alcanzaMinimo)
    avance =
      compra.negocios === 0
        ? `Sé la primera bodega · el grupo necesita ${resumen.faltaMinimo} ${u}`
        : `Faltan ${resumen.faltaMinimo} ${u} para llegar al mínimo`;
  else if (pendiente && resumen.faltanSiguiente !== null && resumen.precioSiguiente !== null)
    avance = `Mínimo alcanzado · con ${resumen.faltanSiguiente} ${u} más baja a ${soles(resumen.precioSiguiente)}`;
  else avance = `Se juntaron ${compra.total} ${u} ✓`;

  return (
    <Link to={`/compras/${compra.id}`} className="group block focus-visible:outline-none">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring sm:p-5">
        <div className="flex gap-4">
          <ImagenProducto nombre={producto.nombre} imagen={producto.imagen} className="size-16 bg-secondary sm:size-20" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <EstadoBadge clave={clave} texto={estadoVisible.texto} className="whitespace-normal" />
              {mia && (
                <Badge variant="naranja" className="whitespace-normal">
                  Estás dentro · {mia.cantidad} {u}
                </Badge>
              )}
              {compra.entregaEstado && compra.entregaEstado !== "EN_PREPARACION" && (
                <Badge variant={compra.entregaEstado === "RETRASADA" ? "destructive" : "secondary"}>
                  <PackageCheck /> {TEXTO_ENTREGA[compra.entregaEstado]}
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold leading-snug">{producto.nombre}</h3>
              <p className="truncate text-sm text-muted-foreground">
                {producto.presentacion} · {compra.proveedor.razonSocial}
              </p>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <CalendarClock className="size-4 shrink-0 text-primary" /> {fraseFecha(compra)}
            </p>
            {llega !== null && clave !== "NO_SE_CONCRETO" && (
              <Badge variant={llega ? "exito" : "destructive"} className="whitespace-normal">
                {llega ? <CheckCircle2 /> : <TriangleAlert />} {llega ? "Llega a tiempo para tu fecha" : "Llega después de tu fecha"}
              </Badge>
            )}
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-lila">
                <span
                  className={cn("block h-full rounded-full", clave === "CONFIRMADA" ? "bg-exito" : "bg-primary")}
                  style={{ width: `${Math.min(100, (compra.total / Math.max(1, compra.minimo)) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {avance}
                {compra.negocios > 0 && (
                  <>
                    {" "}
                    · <Users className="inline size-3.5" /> {compra.negocios} {compra.negocios === 1 ? "bodega" : "bodegas"}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-2">
              <span>
                <span className="text-xl font-extrabold">{soles(clave === "NO_SE_CONCRETO" ? resumen.precioActual : sim ? sim.precioConmigo : precio)}</span>
                <span className="text-sm text-muted-foreground"> por {singular(u)}</span>
              </span>
              {clave !== "NO_SE_CONCRETO" && sim && (
                <span className="text-sm">
                  Con tus {sim.cantidad} {u}: <TextoAhorro monto={sim.ahorro.monto} si />
                  {sim.ahorro.monto === 0 && resumen.precioSiguiente !== null && (
                    <span className="text-muted-foreground"> · baja a {soles(resumen.precioSiguiente)} si se suman más bodegas</span>
                  )}
                </span>
              )}
              {clave !== "NO_SE_CONCRETO" && mia && (
                <span className="text-sm">
                  <TextoAhorro monto={mia.ahorro.monto} />
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="size-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}
