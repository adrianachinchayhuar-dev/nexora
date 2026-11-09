import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { EyeOff, HelpCircle, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CargandoLista, Encabezado, ErrorCarga, Pildoras, Vacio } from "@/components/comun";
import { ImagenProducto } from "@/components/compra";
import { Burbujas, CajaEscribir, useConsultaPeriodica } from "@/components/mensajes";
import { usePanel } from "@/layout/AplicacionProveedor";
import { get, post } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { haceTiempo } from "@/lib/formato";
import type { BandejaProveedor, ChatProveedor } from "@/lib/tipos";
import { cn } from "@/lib/utils";

type Vista = "CHAT" | "PREGUNTAS";

function Chat({ compraId, negocioId, alCambiar }: { compraId: number; negocioId: number; alCambiar: () => void }) {
  const [datos, setDatos] = useState<ChatProveedor | null>(null);
  const cargar = useCallback(() => {
    get<ChatProveedor>(`/proveedor/compras/${compraId}/chat/${negocioId}`).then(setDatos).catch(() => undefined);
  }, [compraId, negocioId]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  useConsultaPeriodica(cargar, 5000);
  if (!datos) return <CargandoLista filas={2} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">{datos.negocio}</p>
          <p className="text-sm text-muted-foreground">Compra de {datos.producto.toLowerCase()}</p>
        </div>
        <Link to={`/proveedor/compras/${datos.compraId}`} className="text-sm font-semibold text-primary hover:underline">
          Ver compra
        </Link>
      </div>
      {datos.negocio.startsWith("Bodega ") && /^Bodega \d+$/.test(datos.negocio) && (
        <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
          <EyeOff className="mt-0.5 size-4 shrink-0" /> Por privacidad, verás el nombre del negocio cuando la compra esté confirmada.
        </p>
      )}
      <Burbujas mensajes={datos.mensajes} yo="PROVEEDOR" vacio="Sin mensajes." />
      <CajaEscribir
        id={`resp-${compraId}-${negocioId}`}
        placeholder="Escribe tu respuesta…"
        onEnviar={async (texto) => {
          try {
            setDatos(await post<ChatProveedor>(`/proveedor/compras/${compraId}/chat/${negocioId}`, { texto }));
            alCambiar();
            return true;
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
            return false;
          }
        }}
      />
    </div>
  );
}

export default function MensajesProveedor() {
  const { datos, error, cargando, recargar } = useApi<BandejaProveedor>("/proveedor/mensajes");
  const { recargar: recargarPanel } = usePanel();
  const [params, setParams] = useSearchParams();
  const vista: Vista = params.get("ver") === "preguntas" ? "PREGUNTAS" : "CHAT";
  useConsultaPeriodica(recargar, 6000);

  const clave = params.get("c");
  const actual = datos?.conversaciones.find((c) => `${c.compraId}-${c.negocioId}` === clave) ?? datos?.conversaciones[0];
  const refrescar = () => {
    recargar();
    recargarPanel();
  };

  return (
    <div>
      <Encabezado
        titulo="Mensajes"
        etiqueta="Atención a los negocios"
        imagen="/img/proveedor/incidencias.webp"
        descripcion="Responde las preguntas de cada compra (las ven todas las bodegas) y los mensajes privados de cada negocio."
      />
      <div className="mb-4">
        <Pildoras
          etiqueta="Tipo de mensaje"
          valor={vista}
          onCambio={(v) => setParams(v === "PREGUNTAS" ? { ver: "preguntas" } : {})}
          opciones={[
            { valor: "CHAT", texto: datos?.sinLeer ? `Conversaciones · ${datos.sinLeer} sin leer` : "Conversaciones", cuenta: datos?.conversaciones.length },
            { valor: "PREGUNTAS", texto: datos?.preguntasSinResponder ? `Preguntas · ${datos.preguntasSinResponder} sin responder` : "Preguntas", cuenta: datos?.preguntas.length },
          ]}
        />
      </div>
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}

      {datos && vista === "CHAT" &&
        (datos.conversaciones.length === 0 ? (
          <Vacio icono={<MessageCircle />} titulo="Aún no te escriben" texto="Cuando un negocio te escriba desde una compra, la conversación aparecerá aquí." />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="h-fit p-3">
              <ul className="space-y-1">
                {datos.conversaciones.map((c) => {
                  const k = `${c.compraId}-${c.negocioId}`;
                  const activa = actual && `${actual.compraId}-${actual.negocioId}` === k;
                  return (
                    <li key={k}>
                      <button onClick={() => setParams({ c: k })} className={cn("flex w-full gap-3 rounded-xl p-2.5 text-left", activa ? "bg-secondary" : "hover:bg-muted")}>
                        <ImagenProducto nombre={c.producto} imagen={c.imagen} className="size-11 bg-secondary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-semibold">{c.contraparte}</span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{haceTiempo(c.fecha)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.producto}</p>
                          <p className={cn("truncate text-sm", c.sinLeer ? "font-semibold" : "text-muted-foreground")}>
                            {c.ultimoAutor === "PROVEEDOR" ? "Tú: " : ""}
                            {c.ultimo}
                          </p>
                        </div>
                        {c.sinLeer > 0 && <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-naranja text-[11px] font-bold text-white">{c.sinLeer}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
            {actual && (
              <Card className="p-5">
                <Chat key={`${actual.compraId}-${actual.negocioId}`} compraId={actual.compraId} negocioId={actual.negocioId} alCambiar={refrescar} />
              </Card>
            )}
          </div>
        ))}

      {datos && vista === "PREGUNTAS" &&
        (datos.preguntas.length === 0 ? (
          <Vacio icono={<HelpCircle />} titulo="No hay preguntas" texto="Las preguntas de los negocios sobre tus compras aparecerán aquí." />
        ) : (
          <div className="space-y-3">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <EyeOff className="mt-0.5 size-4 shrink-0" /> Las preguntas son anónimas y tu respuesta la ven todas las bodegas de la compra.
            </p>
            {datos.preguntas.map((q) => (
              <Card key={q.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/proveedor/compras/${q.compraId}`} className="text-xs font-semibold text-primary hover:underline">
                    {q.producto}
                  </Link>
                  {q.respuesta ? <Badge variant="exito">Respondida</Badge> : <Badge variant="naranja">Sin responder</Badge>}
                </div>
                <p className="mt-1 font-semibold">{q.texto}</p>
                <p className="text-xs text-muted-foreground">Un negocio de la compra · {haceTiempo(q.creadaEn)}</p>
                {q.respuesta && <p className="mt-2 rounded-lg bg-exito-suave px-3 py-2 text-sm text-exito">Tu respuesta: {q.respuesta}</p>}
                <div className="mt-3">
                  <CajaEscribir
                    id={`preg-${q.id}`}
                    placeholder={q.respuesta ? "Actualizar la respuesta…" : "Escribe la respuesta para todas las bodegas…"}
                    boton={q.respuesta ? "Actualizar" : "Responder"}
                    onEnviar={async (texto) => {
                      try {
                        const r = await post<{ mensaje: string }>(`/proveedor/preguntas/${q.id}/responder`, { texto });
                        toast.success(r.mensaje);
                        refrescar();
                        return true;
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "No se pudo responder.");
                        return false;
                      }
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        ))}
    </div>
  );
}
