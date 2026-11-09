import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEXTO_ENTREGA } from "@/components/compra";
import { get } from "@/lib/api";
import { entregaTexto, fechaCorta, soles } from "@/lib/formato";
import type { Compra, Necesidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";

/*
 * Nexi, asistente por reglas.
 * No usa un modelo de lenguaje: reconoce palabras clave de la pregunta y responde con los
 * datos reales del negocio (sus necesidades y sus participaciones). Así cada respuesta es
 * comprobable y no inventa información.
 */

export interface Respuesta {
  texto: string[];
  enlaces?: { texto: string; a: string }[];
  guia?: boolean;
  /** Preguntas que tiene sentido hacer después de esta respuesta. */
  siguientes?: string[];
}
interface Mensaje extends Respuesta {
  de: "yo" | "nexi";
}

export const SUGERENCIAS = ["¿Por qué mi pedido no tiene compra?", "¿Cuándo llega mi pedido?", "¿Qué significa cada estado?", "¿Cuánto estoy ahorrando?"];
const MAS = ["¿Cómo hablo con el proveedor?", "¿Cómo funciona NEXORA?"];

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,]/g, " ");

/** Si la pregunta nombra un producto, filtra por él. */
function filtrarPorProducto<T>(lista: T[], q: string, nombre: (x: T) => string): T[] {
  const palabras = q.split(/\s+/).filter((p) => p.length > 3);
  const hay = lista.filter((x) => palabras.some((p) => normalizar(nombre(x)).includes(p)));
  return hay.length ? hay : lista;
}

export const ESTADOS: [string, string][] = [
  ["Reuniendo negocios", "La compra está abierta y suma bodegas hasta alcanzar el mínimo del proveedor."],
  ["Esperando al proveedor", "Ya se alcanzó el mínimo; el proveedor debe confirmar precio y fecha de entrega."],
  ["Confirmada", "El proveedor confirmó. Verás el avance de la entrega: en preparación, en camino y entregada."],
  ["No se concretó", "No se llegó al mínimo a tiempo o el proveedor no confirmó. No pagas nada."],
];

export function responder(pregunta: string, necesidades: Necesidad[], compras: Compra[]): Respuesta {
  const q = normalizar(pregunta);

  if (/(no tiene|sin|falta).*compra|por que.*(pedido|necesidad)|no hay compra|no aparece/.test(q)) {
    const sin = filtrarPorProducto(
      necesidades.filter((n) => n.estado === "ACTIVA" && n.coincidencia.tipo !== "COMPRA" && n.coincidencia.tipo !== "UNIDO"),
      q,
      (n) => n.producto.nombre,
    );
    if (!sin.length)
      return {
        texto: ["Todas tus necesidades activas ya tienen una compra en grupo o ya estás unido a una. 🎉"],
        enlaces: [{ texto: "Ver mis necesidades", a: "/pedidos" }],
      };
    return {
      texto: [
        sin.length === 1 ? "Esto pasa con tu pedido:" : `Tienes ${sin.length} pedidos sin compra en grupo:`,
        ...sin.map((n) => `• ${n.producto.nombre} (${n.cantidad} ${n.producto.unidad}): ${n.coincidencia.mensaje}`),
        ...(sin.some((n) => n.coincidencia.tipo === "PROPONER") ? [] : ["Si no hay compra, puedes proponer una desde «Mis necesidades»."]),
      ],
      enlaces: [{ texto: "Ir a mis necesidades", a: "/pedidos" }],
      siguientes: ["¿Cuándo llega mi pedido?", "¿Qué significa cada estado?", "¿Cómo funciona NEXORA?"],
    };
  }

  if (/cuando llega|llega|entrega|llegara|demora|retras/.test(q)) {
    const activas = filtrarPorProducto(
      compras.filter((c) => c.estadoVisible.clave !== "NO_SE_CONCRETO" && !c.miParticipacion?.recibido),
      q,
      (c) => c.producto.nombre,
    );
    if (!activas.length)
      return {
        texto: ["No tienes entregas pendientes. Cuando te unas a una compra en grupo, aquí te diré cuándo llega."],
        enlaces: [{ texto: "Ver compras en grupo", a: "/compras" }],
      };
    return {
      texto: activas.map((c) => {
        const cuando = entregaTexto(c.entregaDesde, c.entregaHasta);
        if (c.estadoVisible.clave === "CONFIRMADA") {
          if (c.entregaEstado === "ENTREGADA") return `• ${c.producto.nombre}: el proveedor ya la entregó. Entra a la compra y pulsa «Recibí mi pedido».`;
          if (c.entregaHasta < c.hoy)
            return `• ${c.producto.nombre}: debía llegar el ${fechaCorta(c.entregaHasta)}. Si no llegó, repórtalo desde el detalle de la compra.`;
          return `• ${c.producto.nombre}: ${c.entregaEstado ? TEXTO_ENTREGA[c.entregaEstado].toLowerCase() : "confirmada"}, llega ${cuando}.${
            c.entregaEstado === "RETRASADA" ? " Puedes reportar una incidencia desde el detalle." : ""
          }`;
        }
        if (c.estadoVisible.clave === "ESPERANDO_PROVEEDOR") return `• ${c.producto.nombre}: el proveedor debe confirmar; la entrega prevista es ${cuando}.`;
        return `• ${c.producto.nombre}: aún reúne negocios (${c.total}/${c.minimo} ${c.producto.unidad}). Si se completa antes del ${fechaCorta(c.fechaCierre)}, llegaría ${cuando}.`;
      }),
      enlaces: [{ texto: "Ver seguimiento", a: "/seguimiento" }],
      siguientes: ["¿Qué significa cada estado?", "¿Cómo hablo con el proveedor?", "¿Cuánto estoy ahorrando?"],
    };
  }

  if (/significa|estado|que es|que quiere decir/.test(q)) {
    return {
      texto: ["Estos son los estados de una compra en grupo:", ...ESTADOS.map(([t, d]) => `• ${t}: ${d}`)],
      siguientes: ["¿Cuándo llega mi pedido?", "¿Por qué mi pedido no tiene compra?", "¿Cuánto estoy ahorrando?"],
    };
  }

  if (/ahorr|cuanto pago|precio/.test(q)) {
    const vigentes = compras.filter((c) => c.estadoVisible.clave !== "NO_SE_CONCRETO" && c.miParticipacion);
    const total = vigentes.reduce((s, c) => s + Math.max(c.miParticipacion!.ahorro.monto, 0), 0);
    if (!vigentes.length)
      return {
        texto: ["Aún no participas en compras en grupo, así que todavía no hay ahorro que calcular."],
        enlaces: [{ texto: "Ver compras en grupo", a: "/compras" }],
      };
    return {
      texto: [
        `Tu ahorro estimado es ${soles(total)}, comparado con el precio que nos dijiste que pagas hoy (o el precio normal del proveedor).`,
        ...vigentes.map((c) => {
          const m = c.miParticipacion!.ahorro.monto;
          return `• ${c.producto.nombre}: ${m > 0 ? `ahorras ${soles(m)}` : m < 0 ? `pagas ${soles(-m)} más que hoy` : "mismo precio que hoy"}`;
        }),
      ],
      siguientes: ["¿Cuándo llega mi pedido?", "¿Por qué mi pedido no tiene compra?"],
    };
  }

  if (/mensaje|pregunt|escrib|hablar|contactar|proveedor/.test(q)) {
    return {
      texto: [
        "En el detalle de cada compra tienes «Preguntas y mensajes»:",
        "• Preguntas: son anónimas y la respuesta del proveedor la ven todas las bodegas.",
        "• Chat: es privado entre tu negocio y el proveedor.",
      ],
      enlaces: [{ texto: "Ver mis mensajes", a: "/mensajes" }],
      siguientes: ["¿Cuándo llega mi pedido?", "¿Qué significa cada estado?"],
    };
  }

  if (/como funciona|guia|ayuda|que es nexora/.test(q)) {
    return { texto: ["Te muestro la guía de NEXORA en 3 pasos."], guia: true };
  }

  if (/^\s*(hola|buen|gracias)/.test(q)) return { texto: ["¡Hola! Pregúntame por tus pedidos, entregas, estados o ahorro."] };

  return { texto: ["Aún no sé responder eso. Prueba con una de estas preguntas o revisa la guía."], guia: true };
}

export function AsistenteNexi({ abierto, onCerrar, onGuia }: { abierto: boolean; onCerrar: () => void; onGuia: () => void }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ de: "nexi", texto: ["Hola, soy Nexi. Respondo con los datos de tu negocio. ¿En qué te ayudo?"] }]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  const preguntar = async (p: string) => {
    if (!p.trim() || pensando) return;
    setMensajes((m) => [...m, { de: "yo", texto: [p] }]);
    setTexto("");
    setPensando(true);
    try {
      const [necesidades, compras] = await Promise.all([get<Necesidad[]>("/necesidades"), get<Compra[]>("/participaciones")]);
      setMensajes((m) => [...m, { de: "nexi", ...responder(p, necesidades, compras) }]);
    } catch {
      setMensajes((m) => [...m, { de: "nexi", texto: ["No pude revisar tus datos ahora. Intenta de nuevo en un momento."] }]);
    } finally {
      setPensando(false);
    }
  };

  const ultima = [...mensajes].reverse().find((m) => m.de === "nexi");
  const preguntadas = new Set(mensajes.filter((m) => m.de === "yo").map((m) => m.texto[0]));
  const chips = (ultima?.siguientes ?? [...SUGERENCIAS, ...MAS].filter((x) => !preguntadas.has(x))).slice(0, 4);

  if (!abierto) return null;
  return (
    <div
      role="dialog"
      aria-label="Nexi, tu asistente"
      className="fixed inset-x-3 bottom-20 z-40 flex max-h-[70vh] flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[380px] lg:bottom-24"
    >
      <div className="flex items-center gap-3 border-b bg-secondary/60 px-4 py-3">
        <img src="/img/nexi.webp" alt="" className="size-10 rounded-full border-2 border-card object-cover" />
        <div className="flex-1">
          <p className="font-bold leading-tight">Nexi</p>
          <p className="text-xs text-muted-foreground">Asistente por reglas · usa tus datos</p>
        </div>
        <button onClick={onCerrar} className="rounded-full p-1.5 hover:bg-card" aria-label="Cerrar Nexi">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {mensajes.map((m, i) => (
          <div key={i} className={cn("flex", m.de === "yo" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] space-y-1 rounded-2xl px-3.5 py-2.5 text-sm", m.de === "yo" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              {m.texto.map((t, j) => (
                <p key={j}>{t}</p>
              ))}
              {(m.enlaces?.length || m.guia) && (
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {m.enlaces?.map((e) => (
                    <Link key={e.a} to={e.a} onClick={onCerrar} className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary hover:underline">
                      {e.texto}
                    </Link>
                  ))}
                  {m.guia && (
                    <button
                      onClick={onGuia}
                      className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <BookOpen className="size-3.5" /> Ver la guía
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {pensando && <p className="text-xs text-muted-foreground">Nexi está revisando tus datos…</p>}
        <div ref={fin} />
      </div>
      <p className="border-t px-4 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {mensajes.length > 1 ? "También puedes preguntar" : "Toca una pregunta"}
      </p>
      <div className="flex flex-wrap gap-1.5 px-3 pt-1.5">
        {chips.map((s) => (
          <button
            key={s}
            onClick={() => preguntar(s)}
            className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2 p-3"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          preguntar(texto);
        }}
      >
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu pregunta…" aria-label="Pregunta para Nexi" maxLength={200} />
        <Button type="submit" size="icon" disabled={!texto.trim() || pensando} aria-label="Preguntar">
          <Send />
        </Button>
      </form>
    </div>
  );
}
