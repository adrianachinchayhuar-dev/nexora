import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Girando } from "@/components/comun";
import { useAuth } from "@/lib/auth";
import { get } from "@/lib/api";
import type { Zona } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const PUNTOS_COMPRADOR = ["Agrupa tus pedidos con los de negocios cercanos", "Ve el ahorro estimado antes de decidir", "Participas solo si te conviene"];

export function Marco({
  imagen,
  titulo,
  subtitulo,
  children,
  lema = "Juntos compramos más y mejor.",
  texto,
  etiqueta,
  rol = "COMPRADOR",
  puntos = PUNTOS_COMPRADOR,
  insignia,
}: {
  imagen: string;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
  lema?: string;
  texto?: string;
  etiqueta?: string;
  rol?: "COMPRADOR" | "PROVEEDOR";
  puntos?: string[];
  insignia?: string;
}) {
  const esProveedor = rol === "PROVEEDOR";
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/60">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
        <Link to={esProveedor ? "/proveedor/ingresar" : "/ingresar"} className="flex items-center gap-3">
          <img src="/img/logo.png" alt="NEXORA" className="h-10 w-auto" />
          <span className="hidden border-l pl-3 text-xs leading-tight text-muted-foreground sm:block">
            Juntos
            <br />
            compramos más y mejor
          </span>
        </Link>
        <div className="flex-1" />
        {esProveedor ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/ingresar">Soy una bodega</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/ingresar">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/registro">Registrarse</Link>
            </Button>
          </>
        )}
      </header>
      <main className="mx-auto grid max-w-6xl items-start gap-8 px-5 pb-12 pt-2 lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden lg:block">
          <img src={imagen} alt="" className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-sm" />
          <div className="relative -mt-14 ml-4 mr-16 rounded-[1.75rem] bg-card/95 p-6 shadow-sm backdrop-blur">
            <p className="font-serif text-lg italic text-primary">{esProveedor ? "Tu negocio, más clientes" : "Tu negocio, no estás solo"}</p>
            <p className="text-2xl font-extrabold leading-tight">{lema}</p>
            {texto && <p className="mt-1 text-sm text-muted-foreground">{texto}</p>}
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {puntos.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <Check className="size-4 text-primary" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-[2rem] bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          <img src="/img/logo.png" alt="NEXORA" className="mx-auto mb-5 h-16 w-auto" />
          <div className="mb-4 flex justify-center gap-1.5" role="group" aria-label="Perfil">
            <Link
              to="/ingresar"
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", !esProveedor ? "border-primary/40 bg-secondary text-primary" : "text-muted-foreground hover:bg-muted")}
            >
              Comprador
            </Link>
            <Link
              to="/proveedor/ingresar"
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-semibold", esProveedor ? "border-primary/40 bg-secondary text-primary" : "text-muted-foreground hover:bg-muted")}
            >
              Proveedor
            </Link>
            <span className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-xs font-semibold text-muted-foreground/60" title="El perfil administrador está planificado para 2027">
              Administrador
            </span>
          </div>
          {(insignia || etiqueta) && (
            <span className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{insignia ?? etiqueta}</span>
          )}
          <h1 className="text-3xl font-extrabold">{titulo}</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">{subtitulo}</p>
          {children}
        </div>
      </main>
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
    <Marco imagen="/img/acceso.webp" insignia="Acceso para bodegas" titulo="Inicia sesión" subtitulo="Revisa tus necesidades y las compras en grupo de tu zona.">
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
          {enviando ? <Girando /> : <ArrowRight />} Iniciar sesión
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-auto min-h-12 w-full whitespace-normal py-2" disabled={enviando} onClick={() => enviar(undefined, true)}>
          <Sparkles /> Entrar con datos de prueba (Bodega Rosita)
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{" "}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Regístrate gratis
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
  const [confirmacion, setConfirmacion] = useState("");
  const [distrito, setDistrito] = useState("");
  const [mostrar, setMostrar] = useState(false);
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
    if (f.password !== confirmacion) return setError("Las contraseñas no coinciden.");
    if (!f.zonaId) return setError("Elige tu distrito y tu zona.");
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
    <Marco imagen="/img/registro.webp" insignia="Crea tu cuenta" titulo="Registra tu negocio" subtitulo="Es gratis y sin compromiso. Solo los datos básicos; lo demás lo completas después en tu perfil.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nombreNegocio">Nombre del negocio</Label>
            <Input id="nombreNegocio" value={f.nombreNegocio} onChange={cambiar("nombreNegocio")} placeholder="Bodega Rosita" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="responsable">Tu nombre</Label>
            <Input id="responsable" value={f.responsable} onChange={cambiar("responsable")} autoComplete="name" placeholder="Nombre y apellido" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="celular">Celular</Label>
            <Input id="celular" inputMode="numeric" maxLength={9} value={f.celular} onChange={cambiar("celular")} placeholder="9XX XXX XXX" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="email" value={f.email} onChange={cambiar("email")} placeholder="tucorreo@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input id="password" type={mostrar ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={cambiar("password")} placeholder="Mínimo 8 caracteres" className="pr-11" />
              <button type="button" onClick={() => setMostrar(!mostrar)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}>
                {mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <Input id="confirmar" type={mostrar ? "text" : "password"} autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} placeholder="Repite tu contraseña" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distrito">Distrito</Label>
            <NativeSelect
              id="distrito"
              value={distrito}
              onChange={(e) => {
                setDistrito(e.target.value);
                setF({ ...f, zonaId: "" });
              }}
            >
              <option value="">Elige tu distrito</option>
              {distritos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zona">Zona</Label>
            <NativeSelect id="zona" value={f.zonaId} onChange={cambiar("zonaId")} disabled={!distrito}>
              <option value="">{distrito ? "Elige tu zona" : "Elige primero el distrito"}</option>
              {zonas
                .filter((z) => z.distrito === distrito)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre}
                  </option>
                ))}
            </NativeSelect>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">No usamos GPS: la zona sirve para juntarte con bodegas cercanas.</p>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="direccion">Dirección del negocio</Label>
            <Input id="direccion" value={f.direccion} onChange={cambiar("direccion")} placeholder="Av. Los Ficus 123" />
            <p className="text-xs text-muted-foreground">Solo la ve el proveedor cuando una compra en la que participas se confirma.</p>
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
