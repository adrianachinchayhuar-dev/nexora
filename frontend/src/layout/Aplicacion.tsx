import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, ClipboardList, Home, LineChart, LogOut, MessageCircle, Plus, Sparkles, Store, UserRound } from "lucide-react";
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
import type { Bandeja, Compra, Notificaciones } from "@/lib/tipos";
import { GuiaNexora } from "@/components/guia";
import { AsistenteNexi } from "@/components/asistente";
import { cn } from "@/lib/utils";

type Cuenta = "compras" | "seguimiento" | "mensajes";
interface ItemNav { a: string; texto: string; corto: string; icono: typeof Home; fin?: boolean; cuenta?: Cuenta }

const SECCIONES: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: "Comprar",
    items: [
      { a: "/", texto: "Inicio", corto: "Inicio", icono: Home, fin: true },
      { a: "/pedidos", texto: "Mis necesidades", corto: "Necesidades", icono: ClipboardList },
      { a: "/compras", texto: "Compras en grupo", corto: "En grupo", icono: Sparkles, cuenta: "compras" },
      { a: "/catalogo", texto: "Catálogo", corto: "Catálogo", icono: Store },
    ],
  },
  {
    titulo: "Mi actividad",
    items: [
      { a: "/seguimiento", texto: "Seguimiento", corto: "Seguimiento", icono: LineChart, cuenta: "seguimiento" },
      { a: "/mensajes", texto: "Mensajes", corto: "Mensajes", icono: MessageCircle, cuenta: "mensajes" },
    ],
  },
];
const NAV = SECCIONES.flatMap((s) => s.items);

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
  const ubicacion = useLocation();
  const negocio = cuenta?.negocio;
  const iniciales = (negocio?.nombre ?? "N").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const [cuentas, setCuentas] = useState<Record<Cuenta, number>>({ compras: 0, seguimiento: 0, mensajes: 0 });
  const [guia, setGuia] = useState(false);
  const [nexi, setNexi] = useState(false);
  const [bienvenida, setBienvenida] = useState(false);
  const claveBienvenida = `nexora.bienvenida.${cuenta?.usuarioId}`;

  // Contadores de la barra lateral: compras abiertas, compras en las que participa y mensajes sin leer.
  useEffect(() => {
    const contar = () => {
    get<Compra[]>("/compras")
      .then((lista) =>
        setCuentas((x) => ({
          ...x,
          compras: lista.filter((c) => c.puedeUnirse || (c.miParticipacion && ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(c.estadoVisible.clave))).length,
          seguimiento: lista.filter((c) => c.miParticipacion && c.estadoVisible.clave !== "NO_SE_CONCRETO" && !c.miParticipacion.recibido).length,
        })),
      )
      .catch(() => undefined);
    get<Bandeja>("/mensajes")
      .then((b) => setCuentas((x) => ({ ...x, mensajes: b.sinLeer })))
      .catch(() => undefined);
      };
    contar();
    const t = window.setInterval(contar, 15000);
    return () => window.clearInterval(t);
  }, [ubicacion.pathname]);

  // La guía se muestra sola la primera vez que la cuenta entra en este navegador.
  useEffect(() => {
    try {
      if (cuenta && !localStorage.getItem(claveBienvenida)) {
        setBienvenida(true);
        setGuia(true);
        localStorage.setItem(claveBienvenida, "1");
      }
    } catch {
      /* sin almacenamiento: no se muestra la bienvenida */
    }
  }, [cuenta, claveBienvenida]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ubicacion.pathname]);

  const cerrar = async () => {
    await salir();
    navegar("/ingresar");
  };
  const abrirGuia = () => {
    setBienvenida(false);
    setGuia(true);
  };

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <Link to="/" className="flex h-[72px] items-center px-5" aria-label="NEXORA, ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-10 w-auto" />
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-2" aria-label="Principal">
          {SECCIONES.map((sec) => (
            <div key={sec.titulo}>
              <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/70">{sec.titulo}</p>
              <div className="space-y-1">
                {sec.items.map(({ a, texto, icono: Icono, fin, cuenta: c }) => (
                  <NavLink
                    key={a}
                    to={a}
                    end={fin}
                    className={({ isActive }) =>
                      cn(
                        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-secondary text-primary before:absolute before:inset-y-2 before:-left-3 before:w-1 before:rounded-r-full before:bg-primary"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )
                    }
                  >
                    <Icono className="size-[18px]" /> <span className="flex-1">{texto}</span>
                    {c && cuentas[c] > 0 && (
                      <span className={cn("rounded-full px-2 text-[11px] font-bold", c === "mensajes" ? "bg-naranja text-white" : "bg-muted text-muted-foreground")}>{cuentas[c]}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button
          onClick={abrirGuia}
          className="m-3 rounded-2xl bg-secondary p-3 text-left transition-colors hover:bg-lila focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src="/img/sidebar.webp" alt="" className="mx-auto h-28 w-auto" />
          <span className="mt-2 block text-sm font-bold">¿Cómo funciona NEXORA?</span>
          <span className="block text-xs text-muted-foreground">Te lo contamos en 3 pasos</span>
        </button>
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:gap-3 sm:px-6 lg:border-transparent">
        <Link to="/" className="lg:hidden" aria-label="NEXORA, ir al inicio">
          <img src="/img/logo.png" alt="NEXORA" className="h-8 w-auto" />
        </Link>
        <div className="flex-1" />
        {cuenta?.email === "ana@nexora.pe" && (
          <span className="hidden items-center gap-1.5 rounded-full border border-dashed border-naranja/60 px-3 py-1 text-xs font-semibold text-muted-foreground md:inline-flex" title="Cuenta con datos de prueba para la sustentación">
            <span className="size-1.5 rounded-full bg-naranja" /> Datos de prueba
          </span>
        )}
        <Button asChild className="hidden sm:inline-flex">
          <Link to="/pedidos/nuevo">
            <Plus /> Nueva necesidad
          </Link>
        </Button>
        <Campana />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border bg-card p-1 pr-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[#B0456B] to-primary text-xs font-bold text-white">{iniciales}</span>
              <span className="hidden text-sm font-semibold sm:block">{negocio?.nombre}</span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {negocio?.responsable}
              <span className="block text-xs font-normal text-muted-foreground">{cuenta?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navegar("/perfil")}>
              <UserRound /> Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={abrirGuia}>
              <Sparkles /> ¿Cómo funciona NEXORA?
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={cerrar} className="text-destructive focus:text-destructive">
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-12">
        <Outlet />
      </main>

      {/* Nexi: asistente por reglas (la guía sigue en el menú y en la barra lateral) */}
      <AsistenteNexi
        abierto={nexi}
        onCerrar={() => setNexi(false)}
        onGuia={() => {
          setNexi(false);
          abrirGuia();
        }}
      />
      <button
        onClick={() => setNexi((v) => !v)}
        aria-expanded={nexi}
        className="fixed bottom-20 right-4 z-30 size-14 overflow-hidden rounded-full border-4 border-card bg-secondary shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:bottom-6 lg:right-6"
        aria-label="Abrir Nexi, tu asistente"
      >
        <img src="/img/nexi.webp" alt="" className="h-full w-full object-cover" />
      </button>
      <GuiaNexora abierta={guia} onCambio={setGuia} bienvenida={bienvenida} />

      {/* Navegación inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Principal">
        {NAV.map(({ a, corto, icono: Icono, fin }) => (
          <NavLink
            key={a}
            to={a}
            end={fin}
            className={({ isActive }) =>
              cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <Icono className="size-5" />
            <span className="max-w-full truncate px-1">{corto}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
