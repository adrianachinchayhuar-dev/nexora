import { Link } from "react-router-dom";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PASOS = [
  { titulo: "Registra lo que necesitas", texto: "Escríbelo como lo dirías o elígelo del catálogo. Guardar un pedido no es comprar." },
  { titulo: "Encuentra una compra en grupo", texto: "Te avisamos si otras bodegas de tu zona ya compran lo mismo y cuánto bajaría el precio." },
  { titulo: "Participa si te conviene", texto: "Tú decides. Si el proveedor sube el precio o la entrega no llega a tiempo, vuelves a decidir." },
];

/** «¿Cómo funciona NEXORA?»: se abre al entrar por primera vez, desde la barra lateral y desde Nexi. */
export function GuiaNexora({ abierta, onCambio, bienvenida = false }: { abierta: boolean; onCambio: (v: boolean) => void; bienvenida?: boolean }) {
  return (
    <Dialog open={abierta} onOpenChange={onCambio}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <img src="/img/nexi.webp" alt="" className="size-14 rounded-full bg-secondary" />
            <div>
              <DialogTitle>{bienvenida ? "¡Bienvenida a NEXORA!" : "¿Cómo funciona NEXORA?"}</DialogTitle>
              <DialogDescription>Soy Nexi. Te lo cuento en 3 pasos.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ol className="space-y-3">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 rounded-2xl bg-muted p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <div>
                <p className="font-bold">{p.titulo}</p>
                <p className="text-sm text-muted-foreground">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2 text-sm text-exito">
          <CheckCircle2 className="size-4" /> Nunca mostramos los nombres de las otras bodegas.
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onCambio(false)}>
            {bienvenida ? "Ver la app" : "Entendido"}
          </Button>
          <Button asChild onClick={() => onCambio(false)}>
            <Link to="/pedidos/nuevo">
              <Plus /> Registrar una necesidad
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
