import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EyeOff, HelpCircle, MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Girando } from "@/components/comun";
import { get, post } from "@/lib/api";
import { haceTiempo } from "@/lib/formato";
import type { ChatMensaje, MensajesCompra } from "@/lib/tipos";
import { cn } from "@/lib/utils";

/** Repite una consulta cada `ms` milisegundos mientras la pantalla está abierta (mensajería sin WebSocket). */
export function useConsultaPeriodica(fn: () => void, ms = 5000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, ms);
    return () => window.clearInterval(t);
  }, [ms]);
}

export function Burbujas({ mensajes, yo, vacio }: { mensajes: ChatMensaje[]; yo: "NEGOCIO" | "PROVEEDOR"; vacio: string }) {
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest" });
  }, [mensajes.length]);
  if (!mensajes.length) return <p className="py-6 text-center text-sm text-muted-foreground">{vacio}</p>;
  return (
    <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
      {mensajes.map((m) => {
        const mio = m.autor === yo;
        return (
          <div key={m.id} className={cn("flex", mio ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", mio ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
              <p className="whitespace-pre-wrap">{m.texto}</p>
              <p className={cn("mt-0.5 text-[11px]", mio ? "text-primary-foreground/75" : "text-muted-foreground")}>{haceTiempo(m.creadoEn)}</p>
            </div>
          </div>
        );
      })}
      <div ref={fin} />
    </div>
  );
}

export function CajaEscribir({
  onEnviar,
  placeholder,
  boton = "Enviar",
  deshabilitado,
  id,
}: {
  onEnviar: (texto: string) => Promise<boolean>;
  placeholder: string;
  boton?: string;
  deshabilitado?: boolean;
  id: string;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    if (await onEnviar(texto.trim())) setTexto("");
    setEnviando(false);
  };
  return (
    <form onSubmit={enviar} className="flex items-end gap-2">
      <Textarea
        id={id}
        aria-label={placeholder}
        value={texto}
        maxLength={500}
        disabled={deshabilitado}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviar();
          }
        }}
        placeholder={placeholder}
        className="min-h-[44px] flex-1 resize-none"
        rows={2}
      />
      <Button type="submit" disabled={deshabilitado || enviando || !texto.trim()}>
        {enviando ? <Girando /> : <Send />} {boton}
      </Button>
    </form>
  );
}

type Pestana = "preguntas" | "chat";

/** Preguntas anónimas y chat privado de una compra, vistos por el bodeguero. */
export function MensajesDeCompra({ compraId, inicial = "preguntas" }: { compraId: number | string; inicial?: Pestana }) {
  const [datos, setDatos] = useState<MensajesCompra | null>(null);
  const [pestana, setPestana] = useState<Pestana>(inicial);
  const cargar = useCallback(() => {
    get<MensajesCompra>(`/compras/${compraId}/mensajes`).then(setDatos).catch(() => undefined);
  }, [compraId]);
  useEffect(() => {
    cargar();
  }, [cargar]);
  useEffect(() => setPestana(inicial), [inicial]);
  useConsultaPeriodica(cargar, 5000);

  const enviar = (ruta: "preguntas" | "chat", exito: string) => async (texto: string) => {
    try {
      setDatos(await post<MensajesCompra>(`/compras/${compraId}/${ruta}`, { texto }));
      toast.success(exito);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar.");
      return false;
    }
  };

  const pendientes = datos?.preguntas.filter((p) => !p.respuesta).length ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-muted p-1" role="tablist">
        {(
          [
            ["preguntas", `Preguntas de la compra${datos ? ` (${datos.preguntas.length})` : ""}`, HelpCircle],
            ["chat", "Chat con el proveedor", MessageCircle],
          ] as const
        ).map(([clave, texto, Icono]) => (
          <button
            key={clave}
            role="tab"
            aria-selected={pestana === clave}
            onClick={() => setPestana(clave)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              pestana === clave ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icono className="size-4" /> {texto}
          </button>
        ))}
      </div>

      {!datos ? (
        <div className="flex justify-center py-6 text-primary">
          <Girando />
        </div>
      ) : pestana === "preguntas" ? (
        <div className="space-y-3">
          <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
            <EyeOff className="mt-0.5 size-4 shrink-0" /> Las preguntas son anónimas: todas las bodegas de la compra ven la pregunta y la respuesta, pero nadie sabe quién preguntó.
          </p>
          {datos.preguntas.length ? (
            <ul className="space-y-2">
              {datos.preguntas.map((p) => (
                <li key={p.id} className="rounded-xl border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{p.texto}</p>
                    {p.mia && <Badge variant="secondary">Tu pregunta</Badge>}
                  </div>
                  {p.respuesta ? (
                    <p className="mt-1.5 rounded-lg bg-exito-suave px-3 py-2 text-exito">
                      <b>{datos.proveedor.replace(/\s*\(.*\)$/, "")}:</b> {p.respuesta}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Esperando respuesta del proveedor · {haceTiempo(p.creadaEn)}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-center text-sm text-muted-foreground">Aún no hay preguntas. ¡Haz la primera!</p>
          )}
          {datos.puedeEscribir && (
            <CajaEscribir id={`pregunta-${compraId}`} placeholder="Ej: ¿Viene en caja o suelto?" boton="Preguntar" onEnviar={enviar("preguntas", "Pregunta publicada de forma anónima.")} />
          )}
          {pendientes > 0 && <p className="text-xs text-muted-foreground">{pendientes} pregunta(s) esperan respuesta. Te avisaremos cuando el proveedor responda.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-secondary-foreground">
            Chat privado con <b>{datos.proveedor.replace(/\s*\(.*\)$/, "")}</b>: úsalo para coordinar dirección, horario o detalles de tu pedido. Para dudas de todos, usa las preguntas.
          </p>
          <Burbujas mensajes={datos.chat} yo="NEGOCIO" vacio="Todavía no le escribes al proveedor." />
          {datos.puedeEscribir ? (
            <CajaEscribir id={`chat-${compraId}`} placeholder="Escribe tu mensaje…" onEnviar={enviar("chat", "Mensaje enviado.")} />
          ) : (
            <p className="text-center text-xs text-muted-foreground">Esta compra ya no recibe mensajes.</p>
          )}
        </div>
      )}
    </div>
  );
}
