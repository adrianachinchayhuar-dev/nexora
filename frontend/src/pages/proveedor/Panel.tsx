import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MessageSquareWarning, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CargandoLista, ErrorCarga, Vacio } from "@/components/comun";
import { TarjetaCompraProveedor } from "@/components/proveedor";
import { usePanel } from "@/layout/AplicacionProveedor";

const PASOS = ["Las bodegas se unen hasta llegar al mínimo", "Confirmas stock, precio final y entrega", "Entregas y respondes incidencias"];

export default function PanelProveedor() {
  const { panel, error, recargar } = usePanel();
  if (error && !panel) return <ErrorCarga mensaje={error} reintentar={recargar} />;
  if (!panel) return <CargandoLista filas={4} />;
  const nombre = panel.razonSocial.replace(/\s*\(.*\)\s*$/, "");
  const activas = panel.compras.filter((c) => c.estadoVisible.clave !== "NO_SE_CONCRETO" && c.entregaEstado !== "ENTREGADA");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-r from-[#FBF7EE] via-secondary/60 to-secondary">
        <img
          src="/img/proveedor/hero.webp"
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-[50%] object-cover sm:block [mask-image:linear-gradient(to_right,transparent,black_30%)]"
        />
        <div className="relative max-w-[58%] p-6 max-sm:max-w-none sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tu negocio en NEXORA</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight">
            ¡Hola, <span className="text-primary">{nombre}</span>!
          </h1>
          <p className="mt-2 text-muted-foreground">
            {panel.porConfirmar > 0
              ? `Tienes ${panel.porConfirmar === 1 ? "1 compra que espera" : `${panel.porConfirmar} compras que esperan`} tu confirmación.`
              : "Revisa tus compras en grupo y mantén informados a los negocios."}
            {panel.mensajesSinLeer + panel.preguntasSinResponder > 0 &&
              ` También tienes ${panel.mensajesSinLeer + panel.preguntasSinResponder} mensaje(s) o pregunta(s) por responder.`}
          </p>
          <Button asChild className="mt-4">
            <Link to="/proveedor/compras">
              Ver compras en grupo <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icono: Sparkles, valor: panel.porConfirmar, texto: "por confirmar", clase: "bg-naranja-suave/60", a: "/proveedor/compras" },
          { icono: Truck, valor: panel.enCurso, texto: "entregas en curso", clase: "bg-secondary/70", a: "/proveedor/compras" },
          {
            icono: MessageSquareWarning,
            valor: panel.mensajesSinLeer + panel.preguntasSinResponder + panel.incidenciasAbiertas,
            texto: `por responder (${panel.preguntasSinResponder} preguntas, ${panel.mensajesSinLeer} mensajes, ${panel.incidenciasAbiertas} incidencias)`,
            clase: "bg-info-suave/60",
            a: panel.incidenciasAbiertas > 0 ? "/proveedor/incidencias" : "/proveedor/mensajes",
          },
          {
            icono: BadgeCheck,
            valor: panel.puntualidad === null ? "—" : `${panel.puntualidad} %`,
            texto: `puntualidad (${panel.entregasATiempo} de ${panel.entregasTotal} a tiempo)`,
            clase: "bg-exito-suave/60",
            a: "/proveedor/compras",
          },
        ].map(({ icono: Icono, valor, texto, clase, a }) => (
          <Link key={texto} to={a}>
            <Card className={`flex h-full items-center gap-3 border-transparent p-4 transition-shadow hover:shadow-md ${clase}`}>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                <Icono className="size-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold leading-none">{valor}</div>
                <div className="mt-1 text-xs text-muted-foreground">{texto}</div>
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="size-5 text-primary" /> Tus compras en grupo
            </h2>
            <p className="text-sm text-muted-foreground">{activas.length === 1 ? "1 compra activa" : `${activas.length} compras activas`}</p>
          </div>
          <Link to="/proveedor/compras" className="text-sm font-semibold text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        {activas.length ? (
          <div className="space-y-3">
            {activas.slice(0, 4).map((c) => (
              <TarjetaCompraProveedor key={c.id} compra={c} />
            ))}
          </div>
        ) : (
          <Vacio icono={<Sparkles />} titulo="No tienes compras activas" texto="Cuando las bodegas de una zona pidan tus productos, aparecerán aquí." />
        )}
      </Card>

      <Card className="bg-secondary/50 p-5">
        <h2 className="mb-4 font-bold">¿Qué pasa ahora?</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {PASOS.map((p, i) => (
            <li key={p} className="flex items-center gap-3 sm:flex-col sm:text-center">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
              <span className="text-sm font-semibold">{p}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
