import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, ClipboardList, MessageCircle, ShieldCheck, Sparkles, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CargandoLista, ErrorCarga, Vacio } from "@/components/comun";
import { ImagenProducto, TarjetaCompra } from "@/components/compra";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";
import { fechaConDia, fechaCorta, haceTiempo, relativo, soles } from "@/lib/formato";
import type { Bandeja, Compra, Inicio as TInicio, Necesidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const TIPO_FECHA = {
  CIERRE: { texto: "Cierre", clase: "bg-naranja-suave text-naranja-tinta" },
  ENTREGA: { texto: "Entrega", clase: "bg-exito-suave text-exito" },
  REQUERIDA: { texto: "Lo necesitas", clase: "bg-secondary text-secondary-foreground" },
};

const EJEMPLOS = ["12 aceites y 8 detergentes", "6 paquetes de vasos", "20 kilos de arroz"];

const ESTADO_NECESIDAD: Record<string, { texto: string; variante: "secondary" | "info" | "exito" | "muted" }> = {
  ACTIVA: { texto: "Guardada", variante: "secondary" },
  EN_COMPRA: { texto: "En compra en grupo", variante: "info" },
  ATENDIDA: { texto: "Recibida", variante: "exito" },
  CANCELADA: { texto: "Cancelada", variante: "muted" },
};

function QueNecesitas() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState("");
  const enviar = (e?: FormEvent, valor?: string) => {
    e?.preventDefault();
    const t = (valor ?? texto).trim();
    navegar(t ? `/pedidos/nuevo?texto=${encodeURIComponent(t)}` : "/pedidos/nuevo");
  };
  return (
    <Card className="p-5">
      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="que-necesitas" className="font-bold">
            ¿Qué necesitas comprar?
          </label>
          <p className="text-xs text-muted-foreground">Escríbelo como lo dirías, nosotros lo ordenamos.</p>
        </div>
        <Textarea
          id="que-necesitas"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ej: necesito 12 botellas de aceite y 8 bolsas de detergente para esta semana"
          className="min-h-[84px]"
        />
        <Button type="submit" className="w-full">
          Ordenar mi pedido <ArrowRight />
        </Button>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Prueba con:
          {EJEMPLOS.map((t) => (
            <button key={t} type="button" onClick={() => enviar(undefined, t)} className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-secondary-foreground hover:bg-lila">
              {t}
            </button>
          ))}
        </div>
        <Link to="/catalogo" className="inline-block text-sm font-semibold text-primary hover:underline">
          O elígelo en el Catálogo
        </Link>
      </form>
    </Card>
  );
}

export default function Inicio() {
  const { cuenta } = useAuth();
  const { datos, error, cargando, recargar } = useApi<TInicio>("/inicio");
  const { datos: compras } = useApi<Compra[]>("/compras");
  const { datos: necesidades } = useApi<Necesidad[]>("/necesidades");
  const { datos: bandeja } = useApi<Bandeja>("/mensajes");

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />;
  if (cargando && !datos) return <CargandoLista filas={4} />;
  if (!datos) return null;
  const hoy = datos.comprasCercanas[0]?.hoy ?? compras?.[0]?.hoy ?? new Date().toISOString().slice(0, 10);
  const nombre = cuenta?.negocio?.responsable?.split(/\s+/)[0] ?? "";

  // «Podrías ahorrar»: lo que ya ahorras donde participas + lo que ahorrarías con los pedidos que guardaste.
  const abiertas = (compras ?? []).filter((c) => c.puedeUnirse);
  const ahorroSiTeUnes = abiertas.reduce((s, c) => s + Math.max(0, c.simulacion?.ahorro.monto ?? 0), 0);
  const ahorroTotal = ahorroSiTeUnes + Number(datos.ahorroEstimado);
  const recientes = (necesidades ?? []).filter((n) => n.estado !== "CANCELADA").slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">
          ¡Hola, <span className="text-primary">{nombre || "bienvenida"}</span>!
        </h1>
        <p className="text-muted-foreground">
          {abiertas.length === 1 ? "Hay 1 compra en grupo cerca de ti." : `Hay ${abiertas.length} compras en grupo cerca de ti.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          {/* Hero: cuánto podría ahorrar */}
          <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-secondary via-secondary/80 to-muted">
            <img
              src="/img/inicio.webp"
              alt=""
              className="absolute inset-y-0 right-0 hidden h-full w-[48%] object-cover sm:block [mask-image:linear-gradient(to_right,transparent,black_30%)]"
            />
            <div className="relative max-w-[60%] p-6 max-sm:max-w-none sm:p-7">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">Si te unes a las compras en grupo</p>
              {ahorroTotal > 0 ? (
                <>
                  <p className="mt-1 text-3xl font-extrabold leading-tight text-primary sm:text-4xl">
                    Podrías ahorrar
                    <br />
                    {soles(ahorroTotal)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Ahorro estimado con los pedidos que ya guardaste.</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-3xl font-extrabold leading-tight text-primary">Compra junto a tu zona</p>
                  <p className="mt-2 text-sm text-muted-foreground">Registra lo que necesitas y te mostramos cuánto podrías ahorrar.</p>
                </>
              )}
              <Button asChild className="mt-4">
                <Link to="/compras">Ver compras en grupo</Link>
              </Button>
            </div>
          </section>

          {/* Indicadores */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icono: ClipboardList, valor: datos.pedidosActivos, texto: "pedidos guardados", a: "/pedidos" },
              { icono: Sparkles, valor: abiertas.length, texto: "compras en grupo abiertas", a: "/compras" },
              {
                icono: Users,
                valor: datos.comprasActivas || null,
                texto: datos.comprasActivas ? (datos.comprasActivas === 1 ? "compra en la que participas" : "compras en las que participas") : "Aún no te unes a ninguna",
                a: "/seguimiento",
              },
            ].map(({ icono: Icono, valor, texto, a }) => (
              <Link key={a} to={a}>
                <Card className="flex h-full items-center gap-3 p-3.5 transition-shadow hover:shadow-md">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <Icono className="size-4" />
                  </div>
                  <div className="text-sm leading-tight">
                    {valor !== null && <span className="mr-1 text-xl font-extrabold">{valor}</span>}
                    <span className="text-muted-foreground">{texto}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </section>

          {/* Compras en grupo cerca de ti */}
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                  <Users className="size-4" />
                </span>
                Compras en grupo cerca de ti
              </h2>
              <Link to="/compras" className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary hover:underline">
                Ver todas
              </Link>
            </div>
            {datos.comprasCercanas.length ? (
              <div className="space-y-3">
                {datos.comprasCercanas.map((c) => (
                  <TarjetaCompra key={c.id} compra={c} />
                ))}
              </div>
            ) : (
              <Vacio icono={<Sparkles />} titulo="No hay compras abiertas por ahora" texto="Registra tu necesidad: si no hay compra, puedes proponerla para que otras bodegas se sumen." />
            )}
          </Card>

          {/* Mis necesidades recientes */}
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                  <ClipboardList className="size-4" />
                </span>
                Mis necesidades recientes
              </h2>
              <Link to="/pedidos" className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary hover:underline">
                Ver todas
              </Link>
            </div>
            {recientes.length ? (
              <ul className="divide-y">
                {recientes.map((n) => (
                  <li key={n.id}>
                    <Link to={n.coincidencia.compraId ? `/compras/${n.coincidencia.compraId}?pedido=${n.id}` : "/pedidos"} className="flex items-center gap-3 rounded-xl px-1 py-3 hover:bg-muted">
                      <ImagenProducto nombre={n.producto.nombre} imagen={n.producto.imagen} className="size-11 bg-secondary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{n.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.cantidad} {n.producto.unidad} · Para el {fechaConDia(n.fechaRequerida)}
                        </p>
                        {n.coincidencia.tipo === "COMPRA" && <p className="text-xs font-semibold text-naranja-tinta">Hay una compra en grupo</p>}
                      </div>
                      <Badge variant={ESTADO_NECESIDAD[n.estado]?.variante ?? "secondary"}>{ESTADO_NECESIDAD[n.estado]?.texto ?? n.estado}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Todavía no guardas necesidades.</p>
            )}
          </Card>
        </div>

        {/* Columna derecha */}
        <div className="min-w-0 space-y-4">
          <QueNecesitas />

          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <MessageCircle className="size-5 text-primary" /> Mensajes recientes
              </h2>
              <Link to="/mensajes" className="text-sm font-semibold text-primary hover:underline">
                Abrir
              </Link>
            </div>
            {bandeja?.conversaciones.length ? (
              <ul className="space-y-1">
                {bandeja.conversaciones.slice(0, 2).map((c) => (
                  <li key={c.compraId}>
                    <Link to={`/mensajes?compra=${c.compraId}`} className="block rounded-xl p-2 hover:bg-muted">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{c.contraparte.replace(/\s*\(.*\)$/, "")}</span>
                        {c.sinLeer > 0 ? (
                          <span className="rounded-full bg-secondary px-2 text-[11px] font-bold text-primary">Sin leer</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{haceTiempo(c.fecha)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{c.producto}</p>
                      <p className="truncate text-sm">{c.ultimo}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Cuando le escribas a un proveedor o hagas una pregunta, la verás aquí.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <CalendarDays className="size-5 text-primary" /> Próximas fechas
            </h2>
            {datos.proximasFechas.length ? (
              <ol className="space-y-2">
                {datos.proximasFechas.map((f, i) => {
                  const contenido = (
                    <div className="flex items-start gap-3">
                      <div className="w-11 shrink-0 rounded-xl bg-muted py-1 text-center">
                        <div className="text-lg font-extrabold leading-none">{fechaCorta(f.fecha).split(" ")[0]}</div>
                        <div className="text-[11px] text-muted-foreground">{fechaCorta(f.fecha).split(" ")[1]}</div>
                      </div>
                      <div className="flex-1">
                        <Badge className={cn("border-transparent", TIPO_FECHA[f.tipo].clase)}>
                          {f.tipo === "ENTREGA" ? <Truck /> : null} {TIPO_FECHA[f.tipo].texto}
                        </Badge>
                        <div className="mt-0.5 text-sm font-semibold leading-snug">{f.texto}</div>
                        <div className="text-xs text-muted-foreground">{relativo(f.fecha, hoy)}</div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={i}>
                      {f.compraId ? (
                        <Link to={`/compras/${f.compraId}`} className="block rounded-xl p-1.5 hover:bg-muted">
                          {contenido}
                        </Link>
                      ) : (
                        <div className="p-1.5">{contenido}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Cuando participes en compras verás aquí sus cierres y entregas.</p>
            )}
          </Card>

          <Link to="/perfil" className="block">
            <Card className="flex items-center gap-3 bg-secondary/60 p-4 transition-shadow hover:shadow-md">
              <img src="/img/negocio.webp" alt="" className="size-16 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Mi negocio</p>
                <p className="truncate font-bold">{cuenta?.negocio?.nombre}</p>
                <p className="text-sm font-semibold text-primary underline">Ver perfil</p>
              </div>
            </Card>
          </Link>

          <p className="flex items-start gap-2 rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" /> Tú decides si te unes. Guardar un pedido no es comprar.
          </p>
        </div>
      </div>
    </div>
  );
}
