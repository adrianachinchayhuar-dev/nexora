import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ClipboardList, PiggyBank, Plus, ShoppingBasket, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CargandoLista, ErrorCarga, Vacio } from "@/components/comun";
import { ImagenProducto, TarjetaCompra } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import { fechaConDia, relativo, soles } from "@/lib/formato";
import type { Inicio as TInicio } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const TIPO_FECHA = {
  CIERRE: { texto: "Cierre", clase: "bg-naranja-suave text-naranja-tinta" },
  ENTREGA: { texto: "Entrega", clase: "bg-exito-suave text-exito" },
  REQUERIDA: { texto: "Lo necesitas", clase: "bg-secondary text-secondary-foreground" },
};

export default function Inicio() {
  const { datos, error, cargando, recargar } = useApi<TInicio>("/inicio");

  if (error) return <ErrorCarga mensaje={error} reintentar={recargar} />;
  if (cargando && !datos) return <CargandoLista filas={4} />;
  if (!datos) return null;
  const hoy = datos.comprasCercanas[0]?.hoy ?? new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#4B1C70] text-primary-foreground">
        <img src="/img/inicio.webp" alt="" className="absolute inset-y-0 right-0 hidden h-full w-[45%] object-cover opacity-95 md:block [mask-image:linear-gradient(to_right,transparent,black_35%)]" />
        <div className="relative max-w-xl p-6 sm:p-8">
          <p className="text-sm font-semibold text-white/80">{datos.saludo}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">¿Qué necesita tu bodega esta semana?</h1>
          <p className="mt-2 text-white/85">Escríbelo como lo dirías: te mostramos si otras bodegas de tu zona ya están comprando lo mismo.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="naranja" size="lg">
              <Link to="/pedidos/nuevo">
                <Plus /> Registrar pedido
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/compras">Ver compras de mi zona</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icono: ClipboardList, valor: datos.pedidosActivos, texto: "pedidos activos", a: "/pedidos" },
          { icono: ShoppingBasket, valor: datos.comprasActivas, texto: "compras en las que participas", a: "/seguimiento" },
          { icono: PiggyBank, valor: soles(datos.ahorroEstimado), texto: "ahorro estimado en tus compras", a: "/seguimiento" },
        ].map(({ icono: Icono, valor, texto, a }) => (
          <Link key={texto} to={a}>
            <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-md">
              <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icono className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold">{valor}</div>
                <div className="text-sm text-muted-foreground">{texto}</div>
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          {datos.pedidosConCompra.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Tus pedidos ya tienen compra conjunta</h2>
              <div className="space-y-3">
                {datos.pedidosConCompra.map((n) => (
                  <Card key={n.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <ImagenProducto nombre={n.producto.nombre} imagen={n.producto.imagen} className="size-14" />
                    <div className="flex-1">
                      <div className="font-bold">
                        {n.producto.nombre} · {n.cantidad} {n.producto.unidad}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.coincidencia.mensaje}</p>
                    </div>
                    <Button asChild>
                      <Link to={`/compras/${n.coincidencia.compraId}?pedido=${n.id}`}>
                        Ver y unirme <ArrowRight />
                      </Link>
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Compras abiertas en tu zona</h2>
              <Link to="/compras" className="text-sm font-semibold text-primary hover:underline">
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
              <Vacio icono={<ShoppingBasket />} titulo="No hay compras abiertas por ahora" texto="Registra tu pedido: si no hay compra, puedes proponerla para que otras bodegas se sumen." />
            )}
          </section>
        </div>

        <Card className="h-fit min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" /> Próximas fechas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {datos.proximasFechas.length ? (
              <ol className="space-y-3">
                {datos.proximasFechas.map((f, i) => {
                  const contenido = (
                    <div className="flex items-start gap-3">
                      <div className="w-14 shrink-0 text-center">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">{fechaConDia(f.fecha).split(" ")[0]}</div>
                        <div className="text-xl font-extrabold leading-none">{fechaConDia(f.fecha).split(" ")[1]}</div>
                        <div className="text-xs text-muted-foreground">{fechaConDia(f.fecha).split(" ")[2]}</div>
                      </div>
                      <div className="flex-1 border-l pl-3">
                        <Badge className={cn("border-transparent", TIPO_FECHA[f.tipo].clase)}>
                          {f.tipo === "ENTREGA" ? <Truck /> : null} {TIPO_FECHA[f.tipo].texto}
                        </Badge>
                        <div className="mt-1 text-sm font-semibold">{f.texto}</div>
                        <div className="text-xs text-muted-foreground">{relativo(f.fecha, hoy)}</div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={i}>
                      {f.compraId ? (
                        <Link to={`/compras/${f.compraId}`} className="block rounded-xl p-1 hover:bg-muted">
                          {contenido}
                        </Link>
                      ) : (
                        <div className="p-1">{contenido}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Cuando participes en compras verás aquí sus cierres y entregas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
