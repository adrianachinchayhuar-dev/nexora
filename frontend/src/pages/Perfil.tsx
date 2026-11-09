import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CircleCheck, Circle, Clock, MapPin, Pencil, Phone, Save, ShieldCheck, Store, User } from "lucide-react";
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
import { useApi } from "@/lib/useApi";
import { soles } from "@/lib/formato";
import type { Compra, Cuenta, Necesidad, Zona } from "@/lib/tipos";

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
  const [editando, setEditando] = useState(false);
  const { datos: necesidades } = useApi<Necesidad[]>("/necesidades");
  const { datos: participaciones } = useApi<Compra[]>("/participaciones");

  useEffect(() => {
    get<Zona[]>("/zonas")
      .then(setZonas)
      .catch(() => undefined);
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
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const pasos = [
    { texto: "Datos principales", hecho: !!(f.nombre && f.responsable && f.celular && f.direccion) },
    { texto: "RUC", hecho: !!f.ruc },
    { texto: "Horario de atención", hecho: !!f.horario },
    { texto: "Descripción del negocio", hecho: !!f.descripcion },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;
  const zonaNombre = zonas.find((z) => z.id === f.zonaId)?.nombre ?? n?.zona.nombre;
  const ahorro = (participaciones ?? [])
    .filter((c) => c.estadoVisible.clave !== "NO_SE_CONCRETO")
    .reduce((t, c) => t + Math.max(c.miParticipacion?.ahorro.monto ?? 0, 0), 0);
  const actividad = [
    { texto: "Necesidades registradas", valor: String(necesidades?.length ?? "—"), a: "/pedidos" },
    { texto: "Compras en grupo en las que participas", valor: String(participaciones?.length ?? "—"), a: "/seguimiento" },
    { texto: "Ahorro estimado", valor: participaciones ? soles(ahorro) : "—", a: "/seguimiento" },
  ];

  if (!editando) {
    const filas = [
      { icono: Store, texto: "Negocio", valor: f.nombre },
      { icono: User, texto: "Responsable", valor: f.responsable },
      { icono: Phone, texto: "Celular", valor: f.celular },
      { icono: MapPin, texto: "Dirección", valor: `${f.direccion}${zonaNombre ? ` · ${zonaNombre}` : ""}` },
      { icono: Clock, texto: "Horario", valor: f.horario || "Sin indicar" },
    ];
    return (
      <div className="mx-auto max-w-6xl">
        <Encabezado titulo="Mi perfil" etiqueta="Tu negocio" imagen="/img/cabeceras/perfil.webp" descripcion="La información de tu negocio, siempre a mano." />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground">
                    {f.nombre
                      .split(/\s+/)
                      .map((x) => x[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{f.nombre}</h2>
                    <p className="text-sm text-muted-foreground">{cuenta?.email}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setEditando(true)}>
                  <Pencil /> Editar información
                </Button>
              </div>
              <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {filas.map(({ icono: Icono, texto, valor }) => (
                  <div key={texto} className="flex gap-3">
                    <Icono className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{texto}</dt>
                      <dd className="break-words font-semibold">{valor}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              {f.descripcion && <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm">{f.descripcion}</p>}
            </Card>
            <Alert variant="lila">
              <ShieldCheck />
              <div>
                Otras bodegas te ven solo como «Una bodega de {n?.zona.nombre}». El proveedor ve tu nombre y dirección únicamente cuando una compra en la que
                participas se confirma.
              </div>
            </Alert>
          </div>
          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="font-bold">
                Completa tu perfil{" "}
                <span className="font-normal text-muted-foreground">
                  ({hechos} de {pasos.length})
                </span>
              </h2>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {pasos.map((p) => (
                  <li key={p.texto} className="flex items-center gap-2">
                    {p.hecho ? <CircleCheck className="size-4 text-exito" /> : <Circle className="size-4 text-muted-foreground" />}
                    <span className={p.hecho ? "" : "text-muted-foreground"}>{p.texto}</span>
                  </li>
                ))}
              </ul>
              {hechos < pasos.length && (
                <Button variant="link" className="mt-1 h-auto px-0" onClick={() => setEditando(true)}>
                  Completar ahora
                </Button>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 font-bold">Tu actividad</h2>
              <ul className="divide-y">
                {actividad.map((x) => (
                  <li key={x.texto}>
                    <Link to={x.a} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary">
                      <span className="text-muted-foreground">{x.texto}</span>
                      <span className="text-base font-bold">{x.valor}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Encabezado titulo="Mi perfil" etiqueta="Tu negocio" imagen="/img/cabeceras/perfil.webp" descripcion="La información de tu negocio, siempre a mano." />
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
            <CardTitle className="text-base">Completa tu perfil (opcional)</CardTitle>
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
            Otras bodegas te ven solo como «Una bodega de {n?.zona.nombre}». El proveedor ve tu nombre y dirección únicamente cuando una compra en la que
            participas se confirma.
          </div>
        </Alert>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" disabled={guardando}>
            {guardando ? <Girando /> : <Save />} Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
