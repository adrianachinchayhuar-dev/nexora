import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function Encabezado({ titulo, descripcion, accion, className }: { titulo: string; descripcion?: ReactNode; accion?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 max-w-2xl text-muted-foreground">{descripcion}</p>}
      </div>
      {accion}
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
