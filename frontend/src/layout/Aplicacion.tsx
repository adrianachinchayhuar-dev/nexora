import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ClipboardList, FlaskConical, Home, LogOut, PackageSearch, ShoppingBasket, Truck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { get, post } from "@/lib/api";
import { haceTiempo } from "@/lib/formato";
import type { Notificaciones } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const NAV = [
  { a: "/", texto: "Inicio", icono: Home, fin: true },
  { a: "/catalogo", texto: "Catálogo", icono: PackageSearch },
  { a: "/pedidos", texto: "Mis pedidos", icono: ClipboardList },
  { a: "/compras", texto: "Compras conjuntas", icono: ShoppingBasket },
  { a: "/seguimiento", texto: "Seguimiento", icono: Truck },
];

function Campana() {
  const [datos, setDatos] = useState<Notificaciones | null>(null);
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const cargar = () => get<Notificaciones>("/notificaciones").then(setDatos).catch(() => undefined);
  useEffect(() => {
    cargar();
    const t = window.setInterval(cargar, 20000);
    return () => window.clearInterval(t);
  }, [ubicacion.pathname]);

  const abrir = async (id: number, enlace: string | null) => {
    await post(`/notificaciones/${id}/leer`).catch(() => undefined);
    cargar();
    if (enlace) navegar(enlace);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones${datos?.sinLeer ? `, ${datos.sinLeer} sin leer` : ""}`}>
          <Bell className="!size-5" />
          {!!datos?.sinLeer && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full bg-naranja px-1 text-[10px] font-bold leading-[18px] text-white">
              {datos.sinLeer}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-bold">Notificaciones</span>
          {!!datos?.sinLeer && (
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={async (e) => {
                e.preventDefault();
                await post("/notificaciones/leer-todas").catch(() => undefined);
                cargar();
              }}
            >
              Marcar todo como leído
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto p-1.5">
          {datos?.lista.length ? (
            datos.lista.map((n) => (
              <DropdownMenuItem key={n.id} onSelect={() => abrir(n.id, n.enlace)} className="items-start gap-3 py-2.5">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.leida ? "bg-transparent" : "bg-naranja")} />
                <span className="flex-1">
                  <span className={cn("block text-sm leading-snug", !n.leida && "font-semibold")}>{n.texto}</span>
                  <span className="text-xs text-muted-foreground">{haceTiempo(n.creadaEn)}</span>
                </span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Aplicacion() {
  const { cuenta, salir } = useAuth();
  const navegar = useNavigate();
  const negocio = cuenta?.negocio;
  const iniciales = (negocio?.responsable ?? "N").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const cerrar = async () => {
    await salir();
    navegar("/ingresar");
  };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <Link to="/" className="flex h-20 items-center px-5" aria-label="NEXORA, ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-11 w-auto" />
        </Link>
        <nav className="flex-1 space-y-1 px-3" aria-label="Principal">
          {NAV.map(({ a, texto, icono: Icono, fin }) => (
            <NavLink
              key={a}
              to={a}
              end={fin}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              <Icono className="size-5" /> {texto}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 p-3">
          <NavLink
            to="/demo"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-sm font-semibold",
                isActive ? "border-naranja bg-naranja-suave text-naranja-tinta" : "text-muted-foreground hover:bg-muted",
              )
            }
          >
            <FlaskConical className="size-5" /> Simular proveedor
          </NavLink>
          <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{negocio?.nombre}</span>
            <br />
            {negocio?.zona.nombre}
          </div>
        </div>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur sm:px-6">
        <Link to="/" className="lg:hidden" aria-label="NEXORA, ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-8 w-auto" />
        </Link>
        <div className="flex-1" />
        <Campana />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{iniciales}</span>
              <span className="hidden text-left text-sm leading-tight sm:block">
                <span className="block font-semibold">{negocio?.responsable}</span>
                <span className="block text-xs text-muted-foreground">{negocio?.nombre}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{cuenta?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navegar("/perfil")}>
              <UserRound /> Mi negocio
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navegar("/demo")}>
              <FlaskConical /> Simular proveedor (demo)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={cerrar} className="text-destructive focus:text-destructive">
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
        <Outlet />
      </main>

      {/* Navegación inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Principal">
        {NAV.map(({ a, texto, icono: Icono, fin }) => (
          <NavLink
            key={a}
            to={a}
            end={fin}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <Icono className="size-5" />
            <span className="max-w-full truncate px-1">{texto.replace("Compras conjuntas", "Compras").replace("Mis pedidos", "Pedidos")}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
