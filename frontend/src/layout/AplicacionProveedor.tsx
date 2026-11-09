import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ChevronDown, FlaskConical, Home, LogOut, MessageCircle, MessageSquareWarning, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import type { PanelProveedor } from "@/lib/tipos";
import { cn } from "@/lib/utils";

export interface ContextoPanel {
  panel: PanelProveedor | null;
  error: string | null;
  recargar: () => Promise<void>;
}

/** Datos del panel compartidos por todas las pantallas del proveedor. */
export function usePanel() {
  return useOutletContext<ContextoPanel>();
}

type Contador = "porConfirmar" | "incidenciasAbiertas" | "mensajes";
const NAV: { a: string; texto: string; corto: string; icono: typeof Home; fin?: boolean; cuenta?: Contador }[] = [
  { a: "/proveedor", texto: "Inicio", corto: "Inicio", icono: Home, fin: true },
  { a: "/proveedor/compras", texto: "Compras en grupo", corto: "Compras", icono: Sparkles, cuenta: "porConfirmar" },
  { a: "/proveedor/mensajes", texto: "Mensajes", corto: "Mensajes", icono: MessageCircle, cuenta: "mensajes" },
  { a: "/proveedor/incidencias", texto: "Incidencias", corto: "Incidencias", icono: MessageSquareWarning, cuenta: "incidenciasAbiertas" },
];

export default function AplicacionProveedor() {
  const { cuenta, salir } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { datos: panel, error, recargar } = useApi<PanelProveedor>("/proveedor/panel");
  const cuentas: Record<Contador, number> = {
    porConfirmar: panel?.porConfirmar ?? 0,
    incidenciasAbiertas: panel?.incidenciasAbiertas ?? 0,
    mensajes: (panel?.mensajesSinLeer ?? 0) + (panel?.preguntasSinResponder ?? 0),
  };
  const nombre = panel?.razonSocial ?? cuenta?.proveedor ?? "Proveedor";
  const nombreCorto = nombre.replace(/\s*\(.*\)\s*$/, "");
  const iniciales = nombreCorto.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // Se actualiza solo: así, en la sustentación, lo que hace el bodeguero en la otra ventana aparece aquí.
  useEffect(() => {
    const t = window.setInterval(recargar, 10000);
    return () => window.clearInterval(t);
  }, [recargar]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ubicacion.pathname]);

  const cerrar = async () => {
    await salir();
    navegar("/proveedor/ingresar");
  };

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-gradient-to-b from-card to-secondary/40 lg:flex">
        <Link to="/proveedor" className="flex h-[72px] items-center px-5" aria-label="NEXORA proveedores, ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-10 w-auto" />
        </Link>
        <p className="px-6 pb-4 text-sm font-bold text-primary">Portal del proveedor</p>
        <nav className="flex-1 space-y-1.5 px-3" aria-label="Principal">
          {NAV.map(({ a, texto, icono: Icono, fin, cuenta: c }) => (
            <NavLink
              key={a}
              to={a}
              end={fin}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                  isActive ? "bg-primary text-primary-foreground shadow-md" : "text-foreground/80 hover:bg-secondary",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icono className="size-[18px]" /> <span className="flex-1">{texto}</span>
                  {c && cuentas[c] > 0 && (
                    <span className={cn("rounded-full px-2 text-[11px] font-bold", isActive ? "bg-white/20" : "bg-naranja text-white")}>{cuentas[c]}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to="/proveedor/datos-de-prueba"
            className={({ isActive }) =>
              cn(
                "mt-4 flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm font-semibold",
                isActive ? "border-naranja bg-naranja-suave text-naranja-tinta" : "border-border text-muted-foreground hover:bg-secondary",
              )
            }
          >
            <FlaskConical className="size-[18px]" /> Datos de prueba
          </NavLink>
        </nav>
        <div className="m-3 rounded-2xl bg-secondary p-3">
          <img src="/img/proveedor/sidebar.webp" alt="" className="mx-auto h-28 w-auto" />
          <p className="mt-2 text-sm font-bold">Tú confirmas precio y entrega</p>
          <p className="text-xs text-muted-foreground">Los negocios solo ven tu razón social y tu puntualidad.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6 lg:border-transparent">
        <Link to="/proveedor" className="lg:hidden" aria-label="Ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-8 w-auto" />
        </Link>
        <span className="hidden text-sm font-bold text-primary sm:inline lg:hidden">Proveedores</span>
        <div className="flex-1" />
        <span className="hidden items-center gap-1.5 rounded-full border border-dashed border-naranja/60 px-3 py-1 text-xs font-semibold text-muted-foreground md:inline-flex">
          <span className="size-1.5 rounded-full bg-naranja" /> Datos de prueba
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border bg-card p-1 pr-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{iniciales}</span>
              <span className="hidden text-sm font-semibold sm:block">{nombreCorto}</span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {nombre}
              <span className="block text-xs font-normal text-muted-foreground">{cuenta?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navegar("/proveedor/datos-de-prueba")}>
              <FlaskConical /> Datos de prueba
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={cerrar} className="text-destructive focus:text-destructive">
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-12">
        <Outlet context={{ panel, error, recargar } satisfies ContextoPanel} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Principal">
        {[...NAV, { a: "/proveedor/datos-de-prueba", corto: "Prueba", icono: FlaskConical, fin: false }].map(({ a, corto, icono: Icono, fin }) => (
          <NavLink
            key={a}
            to={a}
            end={fin}
            className={({ isActive }) => cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")}
          >
            <Icono className="size-5" />
            <span>{corto}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
