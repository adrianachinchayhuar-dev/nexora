import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Girando } from "@/components/comun";
import { useAuth } from "@/lib/auth";
import { get } from "@/lib/api";
import type { Zona } from "@/lib/tipos";

function Marco({ imagen, titulo, subtitulo, children }: { imagen: string; titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-secondary lg:block">
        <img src={imagen} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A1F5C]/80 via-[#2A1F5C]/10 to-transparent" />
        <div className="absolute bottom-0 p-10 text-white">
          <p className="text-3xl font-extrabold leading-tight">Juntos compramos más y mejor.</p>
          <p className="mt-2 max-w-md text-white/85">
            Une tu pedido con otras bodegas de tu zona, accede al precio por volumen y decide tú si participas.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <img src="/img/logo.png" alt="NEXORA" className="mb-8 h-12 w-auto" />
          <h1 className="text-2xl font-extrabold">{titulo}</h1>
          <p className="mb-6 mt-1 text-muted-foreground">{subtitulo}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Ingresar() {
  const { ingresar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e?: FormEvent, demo?: boolean) => {
    e?.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await ingresar(demo ? "ana@nexora.pe" : email, demo ? "nexora123" : password);
      navegar("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Marco imagen="/img/acceso.webp" titulo="Ingresa a tu bodega" subtitulo="Revisa tus pedidos y las compras conjuntas de tu zona.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={enviando || !email || !password}>
          {enviando ? <Girando /> : <ArrowRight />} Ingresar
        </Button>
        <Button type="button" variant="outline" size="lg" className="w-full" disabled={enviando} onClick={() => enviar(undefined, true)}>
          <Sparkles /> Entrar con la cuenta demo (Bodega Rosita)
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Registra tu negocio
          </Link>
        </p>
      </form>
    </Marco>
  );
}

export function Registro() {
  const { registrar } = useAuth();
  const navegar = useNavigate();
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [f, setF] = useState({ nombreNegocio: "", responsable: "", celular: "", email: "", password: "", zonaId: "", direccion: "" });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    get<Zona[]>("/zonas").then(setZonas).catch(() => setError("No pudimos cargar las zonas. Revisa que el backend esté encendido."));
  }, []);

  const cambiar = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^9\d{8}$/.test(f.celular)) return setError("El celular debe tener 9 dígitos y empezar con 9.");
    if (f.password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    setEnviando(true);
    try {
      await registrar(f);
      toast.success("¡Tu bodega ya está en NEXORA!");
      navegar("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos registrar tu negocio.");
    } finally {
      setEnviando(false);
    }
  };

  const distritos = [...new Set(zonas.map((z) => z.distrito))];

  return (
    <Marco imagen="/img/registro.webp" titulo="Registra tu negocio" subtitulo="Solo los datos básicos. Lo demás lo completas después en tu perfil.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nombreNegocio">Nombre del negocio</Label>
            <Input id="nombreNegocio" value={f.nombreNegocio} onChange={cambiar("nombreNegocio")} placeholder="Bodega Rosita" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsable">Tu nombre</Label>
            <Input id="responsable" value={f.responsable} onChange={cambiar("responsable")} autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input id="celular" inputMode="numeric" maxLength={9} value={f.celular} onChange={cambiar("celular")} placeholder="9XXXXXXXX" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="zona">Zona</Label>
            <NativeSelect id="zona" value={f.zonaId} onChange={cambiar("zonaId")}>
              <option value="">Elige tu zona</option>
              {distritos.map((d) => (
                <optgroup key={d} label={d}>
                  {zonas.filter((z) => z.distrito === d).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">No usamos GPS: la zona sirve para juntarte con bodegas cercanas.</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="direccion">Dirección del negocio</Label>
            <Input id="direccion" value={f.direccion} onChange={cambiar("direccion")} placeholder="Jr. Las Begonias 245" />
            <p className="text-xs text-muted-foreground">Solo la ve el proveedor cuando una compra en la que participas se confirma.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="email" value={f.email} onChange={cambiar("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" autoComplete="new-password" value={f.password} onChange={cambiar("password")} placeholder="Mínimo 8 caracteres" />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? <Girando /> : <ArrowRight />} Crear mi cuenta
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/ingresar" className="font-semibold text-primary hover:underline">
            Ingresa
          </Link>
        </p>
      </form>
    </Marco>
  );
}
