import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PropsEncabezado {
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
  className?: string;
  /** Con imagen se muestra como la cabecera ilustrada del prototipo. */
  imagen?: string;
  etiqueta?: string;
  volver?: { a: string; texto: string };
}

export function Encabezado({ titulo, descripcion, accion, className, imagen, etiqueta, volver }: PropsEncabezado) {
  const atras = volver && (
    <Link to={volver.a} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
      <ArrowLeft className="size-4" /> {volver.texto}
    </Link>
  );
  if (imagen) {
    return (
      <div className={cn("mb-6", className)}>
        {atras}
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-secondary via-secondary/80 to-muted">
          <img
            src={imagen}
            alt=""
            className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover sm:block [mask-image:linear-gradient(to_right,transparent,black_30%)]"
          />
          <div className="relative flex min-h-[132px] max-w-[60%] flex-col justify-center gap-1 px-6 py-6 max-sm:max-w-none sm:px-7">
            {etiqueta && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{etiqueta}</p>}
            <h1 className="text-2xl font-extrabold sm:text-[2rem] sm:leading-tight">{titulo}</h1>
            {descripcion && <p className="text-sm text-muted-foreground sm:text-[15px]">{descripcion}</p>}
            {accion && <div className="mt-2">{accion}</div>}
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className={cn("mb-6", className)}>
      {atras}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
          {descripcion && <p className="mt-1 max-w-2xl text-muted-foreground">{descripcion}</p>}
        </div>
        {accion}
      </div>
    </div>
  );
}

/** Lista de filtros en forma de píldoras con contador, como en el prototipo. */
export function Pildoras<T extends string>({
  opciones,
  valor,
  onCambio,
  etiqueta,
}: {
  opciones: { valor: T; texto: string; cuenta?: number }[];
  valor: T;
  onCambio: (v: T) => void;
  etiqueta: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={etiqueta}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => onCambio(o.valor)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              activa ? "border-primary/60 bg-secondary text-primary" : "bg-card text-foreground/80 hover:bg-muted",
            )}
          >
            {o.texto}
            {o.cuenta !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[11px]", activa ? "bg-card text-primary" : "bg-muted text-muted-foreground")}>{o.cuenta}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Vacio({ icono, titulo, texto, accion }: { icono: ReactNode; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-7">{icono}</div>
      <div>
        <h3 className="font-bold">{titulo}</h3>
        {texto && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{texto}</p>}
      </div>
      {accion}
    </Card>
  );
}

export function CargandoLista({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
      <p className="font-semibold">{mensaje}</p>
      {reintentar && (
        <button onClick={reintentar} className="mt-2 font-semibold underline">
          Intentar de nuevo
        </button>
      )}
    </Card>
  );
}

export function Girando({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} />;
}
