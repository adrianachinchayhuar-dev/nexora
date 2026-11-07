import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Save, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Encabezado, Girando } from "@/components/comun";
import { useAuth } from "@/lib/auth";
import { get, put } from "@/lib/api";
import type { Cuenta, Zona } from "@/lib/tipos";

export default function Perfil() {
  const { cuenta, actualizar } = useAuth();
  const n = cuenta?.negocio;
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [f, setF] = useState({
    nombre: n?.nombre ?? "",
    responsable: n?.responsable ?? "",
    celular: n?.celular ?? "",
    zonaId: n?.zona.id ?? "",
    direccion: n?.direccion ?? "",
    ruc: n?.ruc ?? "",
    descripcion: n?.descripcion ?? "",
    horario: n?.horario ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    get<Zona[]>("/zonas").then(setZonas).catch(() => undefined);
  }, []);

  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      const c = await put<Cuenta>("/perfil", f);
      actualizar(c);
      toast.success("Datos del negocio guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const completos = [f.ruc, f.descripcion, f.horario].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Mi negocio" descripcion={cuenta?.email} />
      <form onSubmit={guardar} className="space-y-6">
        {error && <Alert variant="destructive">{error}</Alert>}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos principales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre del negocio</Label>
              <Input id="nombre" value={f.nombre} onChange={cambiar("nombre")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Input id="responsable" value={f.responsable} onChange={cambiar("responsable")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input id="celular" inputMode="numeric" maxLength={9} value={f.celular} onChange={cambiar("celular")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zona">Zona</Label>
              <NativeSelect id="zona" value={f.zonaId} onChange={cambiar("zonaId")}>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" value={f.direccion} onChange={cambiar("direccion")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completa tu perfil (opcional) · {completos} de 3</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ruc">RUC</Label>
              <Input id="ruc" inputMode="numeric" maxLength={11} value={f.ruc} onChange={cambiar("ruc")} placeholder="No es obligatorio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horario">Horario de atención</Label>
              <Input id="horario" value={f.horario} onChange={cambiar("horario")} placeholder="Lun a sáb, 7 a. m. – 10 p. m." />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" value={f.descripcion} onChange={cambiar("descripcion")} className="min-h-[80px]" />
            </div>
          </CardContent>
        </Card>

        <Alert variant="lila">
          <ShieldCheck />
          <div>
            Otras bodegas te ven solo como «Una bodega de {n?.zona.nombre}». El proveedor ve tu nombre y dirección únicamente cuando una compra en la que participas se
            confirma.
          </div>
        </Alert>

        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={guardando}>
            {guardando ? <Girando /> : <Save />} Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
