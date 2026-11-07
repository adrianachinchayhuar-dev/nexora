import { useState } from "react";
import { toast } from "sonner";
import { Monitor, RotateCcw, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Encabezado, Girando } from "@/components/comun";
import { post } from "@/lib/api";

const CUENTAS = [
  { icono: Store, perfil: "Bodeguero (comprador)", ventana: "/ingresar", correo: "ana@nexora.pe", clave: "nexora123", negocio: "Bodega Rosita · Santa Anita" },
  { icono: Truck, perfil: "Proveedor", ventana: "/proveedor/ingresar", correo: "andina@nexora.pe", clave: "proveedor123", negocio: "Distribuidora Andina" },
];

const GUION = [
  "Ana ve el aceite «Reuniendo negocios» (38 de 50) y se une con sus 12 botellas: el precio baja de S/ 7.80 a S/ 7.00.",
  "El detergente ya llegó al mínimo: el proveedor lo confirma aquí con precio y fecha, y a Ana le llega la notificación.",
  "Los vasos están confirmados: el proveedor marca «En camino» y «Entregada»; Ana confirma que recibió o reporta una incidencia.",
  "El proveedor responde la incidencia y Ana ve la respuesta en su compra.",
];

export default function DatosPrueba() {
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const restablecer = async () => {
    setEnviando(true);
    try {
      const r = await post<{ mensaje: string }>("/proveedor/prueba/restablecer");
      toast.success(r.mensaje);
      setConfirmar(false);
      // Se borraron las sesiones: la siguiente petición lleva al acceso.
      window.location.assign("/proveedor/ingresar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo restablecer.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Datos de prueba"
        etiqueta="Para la sustentación"
        imagen="/img/proveedor/prueba.webp"
        descripcion="NEXORA viene con una zona, un catálogo y dos cuentas de prueba. Las otras bodegas de la zona no tienen cuenta: solo suman cantidades."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="size-5 text-primary" /> Abre dos ventanas, una al lado de la otra
          </CardTitle>
          <CardDescription>Cada perfil guarda su sesión por separado, así no se cierran entre sí.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {CUENTAS.map(({ icono: Icono, perfil, ventana, correo, clave, negocio }) => (
            <div key={perfil} className="rounded-2xl border bg-muted/50 p-4 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <Icono className="size-4 text-primary" /> {perfil}
              </p>
              <p className="text-muted-foreground">{negocio}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-muted-foreground">Dirección</dt>
                <dd className="break-all font-mono text-xs leading-5">{window.location.origin + ventana}</dd>
                <dt className="text-muted-foreground">Correo</dt>
                <dd className="font-mono text-xs leading-5">{correo}</dd>
                <dt className="text-muted-foreground">Clave</dt>
                <dd className="font-mono text-xs leading-5">{clave}</dd>
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guion sugerido</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {GUION.map((g, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                {g}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-naranja-tinta" /> Volver al inicio de la demostración
          </CardTitle>
          <CardDescription>
            Borra todo lo que se hizo (incluidos los negocios registrados) y vuelve a cargar los datos de prueba con fechas desde hoy. Ambas ventanas tendrán que volver a ingresar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setConfirmar(true)}>
            <RotateCcw /> Restablecer datos de prueba
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Restablecer los datos de prueba?</DialogTitle>
            <DialogDescription>Se borrará todo lo registrado en esta base de datos. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={enviando} onClick={restablecer}>
              {enviando ? <Girando /> : <RotateCcw />} Sí, restablecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
