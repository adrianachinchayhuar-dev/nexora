import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Encabezado, Girando } from "@/components/comun";
import { ImagenProducto } from "@/components/compra";
import { AccionCoincidencia } from "@/pages/Pedidos";
import { post } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { fechaConDia, hoyLima, sumarDias } from "@/lib/formato";
import type { Compra, ItemInterpretado, Necesidad, Producto } from "@/lib/tipos";
import { cn } from "@/lib/utils";

interface Fila {
  clave: number;
  productoId: string;
  cantidad: string;
  precioActual: string;
  marcaPreferida: string;
  aceptaEquivalente: boolean;
  textoOriginal: string;
  nota: string | null;
  confianza: ItemInterpretado["confianza"] | null;
}

const EJEMPLOS = ["12 botellas de aceite y una caja de leche", "2 fardos de fideos", "media docena de detergente, 10 kilos de arroz"];

/** Domingo de esta semana; sábado y domingo apuntan al domingo siguiente (no da tiempo de cerrar y entregar). */
function finDeSemana(hoy: string) {
  const dia = new Date(hoy + "T12:00:00Z").getUTCDay();
  let d = (7 - dia) % 7;
  if (d < 2) d += 7;
  return sumarDias(hoy, d);
}

let contador = 0;
const filaVacia = (productoId = ""): Fila => ({
  clave: ++contador,
  productoId,
  cantidad: "",
  precioActual: "",
  marcaPreferida: "",
  aceptaEquivalente: true,
  textoOriginal: "",
  nota: null,
  confianza: null,
});

export default function NuevoPedido() {
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { datos: catalogo } = useApi<Producto[]>("/catalogo");
  // ?producto=1 o ?producto=1,4,7 (desde «Mi lista» del catálogo)
  const idsIniciales = (params.get("producto") ?? "").split(",").filter(Boolean);
  const [paso, setPaso] = useState<1 | 2 | 3>(idsIniciales.length ? 2 : 1);
  const [texto, setTexto] = useState(params.get("texto") ?? "");
  const [filas, setFilas] = useState<Fila[]>(() => idsIniciales.map((id) => filaVacia(id)));
  const [interpretando, setInterpretando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Necesidad[]>([]);

  const hoy = hoyLima();
  const opcionesFecha = useMemo(
    () => [
      { clave: "pronto", texto: "Lo antes posible", fecha: sumarDias(hoy, 3) },
      { clave: "semana", texto: "Esta semana", fecha: finDeSemana(hoy) },
      { clave: "proxima", texto: "Próxima semana", fecha: sumarDias(finDeSemana(hoy), 7) },
    ],
    [hoy],
  );
  const [opcionFecha, setOpcionFecha] = useState("semana");
  const [fechaElegida, setFechaElegida] = useState(sumarDias(hoy, 5));
  const fechaRequerida = opcionFecha === "elegir" ? fechaElegida : opcionesFecha.find((o) => o.clave === opcionFecha)!.fecha;

  const productoDe = (id: string) => catalogo?.find((p) => String(p.id) === id);

  const interpretar = async () => {
    setError(null);
    setInterpretando(true);
    try {
      const items = await post<ItemInterpretado[]>("/necesidades/interpretar", { texto });
      if (!items.length) {
        setError("No encontramos productos en lo que escribiste. Prueba con «12 botellas de aceite».");
        return;
      }
      setFilas(
        items.map((i) => ({
          ...filaVacia(i.productoId ? String(i.productoId) : ""),
          cantidad: i.cantidad ? String(i.cantidad) : "",
          textoOriginal: i.fragmento,
          nota: i.nota,
          confianza: i.confianza,
        })),
      );
      setPaso(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos interpretar tu pedido.");
    } finally {
      setInterpretando(false);
    }
  };

  // Si viene del inicio («¿Qué necesitas comprar?»), se ordena de inmediato.
  const yaOrdenado = useRef(false);
  useEffect(() => {
    if (params.get("texto") && !yaOrdenado.current) {
      yaOrdenado.current = true;
      interpretar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (clave: number, cambio: Partial<Fila>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  const filasValidas = filas.length > 0 && filas.every((f) => f.productoId && Number(f.cantidad) > 0);

  const guardar = async () => {
    setError(null);
    if (!filasValidas) {
      setError("Revisa que cada fila tenga producto y cantidad.");
      return;
    }
    if (fechaRequerida < hoy) {
      setError("La fecha no puede ser pasada.");
      return;
    }
    setGuardando(true);
    try {
      const creadas = await post<Necesidad[]>("/necesidades", {
        fechaRequerida,
        items: filas.map((f) => ({
          productoId: Number(f.productoId),
          cantidad: Number(f.cantidad),
          precioActual: f.precioActual ? Number(f.precioActual) : null,
          marcaPreferida: f.marcaPreferida || null,
          aceptaEquivalente: f.aceptaEquivalente,
          textoOriginal: f.textoOriginal || null,
        })),
      });
      setResultado(creadas);
      setPaso(3);
      toast.success(creadas.length === 1 ? "Pedido guardado." : `${creadas.length} pedidos guardados.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar tu pedido.");
    } finally {
      setGuardando(false);
    }
  };

  const proponer = async (n: Necesidad) => {
    try {
      const c = await post<Compra>(`/necesidades/${n.id}/proponer`);
      navegar(`/compras/${c.id}?pedido=${n.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo proponer.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Registrar necesidad" volver={{ a: "/pedidos", texto: "Mis necesidades" }} descripcion="Escribe, revisa y guarda tu pedido. Guardar no es comprar." />
      <ol className="mb-6 flex items-center gap-2 text-sm font-semibold" aria-label="Pasos">
        {["Escribe", "Revisa", "Listo"].map((t, i) => (
          <li key={t} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs",
                paso === i + 1 ? "bg-primary text-primary-foreground" : paso > i + 1 ? "bg-exito text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {paso > i + 1 ? "✓" : i + 1}
            </span>
            <span className={paso === i + 1 ? "text-foreground" : "text-muted-foreground"}>{t}</span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {paso === 1 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start gap-3">
              <img src="/img/nexi.webp" alt="" className="size-12 rounded-full bg-secondary" />
              <div className="rounded-2xl rounded-tl-sm bg-secondary px-4 py-3 text-sm">
                Hola, soy Nexi. Escribe tu pedido como se lo dirías a tu proveedor. Yo lo ordeno en productos y cantidades, y tú lo revisas.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="texto">Tu pedido</Label>
              <Textarea id="texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. 12 botellas de aceite y una caja de leche evaporada" />
            </div>
            <div className="flex flex-wrap gap-2">
              {EJEMPLOS.map((e) => (
                <button key={e} onClick={() => setTexto(e)} className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  {e}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilas([filaVacia()]);
                  setPaso(2);
                }}
              >
                Prefiero elegir del catálogo
              </Button>
              <Button size="lg" onClick={interpretar} disabled={!texto.trim() || interpretando}>
                {interpretando ? <Girando /> : <Wand2 />} Ordenar mi pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          {texto && (
            <Alert variant="lila">
              <Sparkles />
              <div>
                Interpretamos: «{texto}». Revisa cada producto; nada se guarda sin tu confirmación.
              </div>
            </Alert>
          )}
          {filas.map((f) => {
            const p = productoDe(f.productoId);
            return (
              <Card key={f.clave}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start gap-3">
                    {p ? <ImagenProducto nombre={p.nombre} imagen={p.imagen} className="size-14" /> : <div className="flex size-14 items-center justify-center rounded-xl bg-muted"><CircleHelp className="size-6 text-muted-foreground" /></div>}
                    <div className="flex-1 space-y-2">
                      {f.textoOriginal && (
                        <p className="text-xs text-muted-foreground">
                          Escribiste: «{f.textoOriginal}»{" "}
                          {f.confianza === "ALTA" && <Badge variant="exito">Reconocido</Badge>}
                          {f.confianza === "MEDIA" && <Badge variant="aviso">Revisa la cantidad</Badge>}
                          {f.confianza === "BAJA" && <Badge variant="destructive">Elige el producto</Badge>}
                        </p>
                      )}
                      <NativeSelect aria-label="Producto" value={f.productoId} onChange={(e) => cambiar(f.clave, { productoId: e.target.value })}>
                        <option value="">Elige el producto</option>
                        {catalogo?.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre} · {x.marca} · {x.presentacion}
                          </option>
                        ))}
                      </NativeSelect>
                      {f.nota && <p className="text-xs text-info">{f.nota}</p>}
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Quitar producto" onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}>
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`cant-${f.clave}`}>Cantidad {p ? `(${p.unidad})` : ""}</Label>
                      <Input id={`cant-${f.clave}`} type="number" min={1} inputMode="numeric" value={f.cantidad} onChange={(e) => cambiar(f.clave, { cantidad: e.target.value })} />
                      {p && Number(f.cantidad) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {(Number(f.cantidad) / p.equivalencia).toFixed(1).replace(".0", "")} {p.unidadVenta.split(" ")[0]}(s)
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`precio-${f.clave}`}>Hoy pagas c/u (opcional)</Label>
                      <Input id={`precio-${f.clave}`} type="number" step="0.01" min={0} placeholder="S/" value={f.precioActual} onChange={(e) => cambiar(f.clave, { precioActual: e.target.value })} />
                      <p className="text-xs text-muted-foreground">Así calculamos tu ahorro real.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`marca-${f.clave}`}>Marca preferida (opcional)</Label>
                      <Input id={`marca-${f.clave}`} placeholder={p?.marca ?? "Cualquiera"} value={f.marcaPreferida} onChange={(e) => cambiar(f.clave, { marcaPreferida: e.target.value })} />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" className="size-4 accent-[hsl(var(--primary))]" checked={f.aceptaEquivalente} onChange={(e) => cambiar(f.clave, { aceptaEquivalente: e.target.checked })} />
                        Acepto una marca equivalente
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <Button variant="outline" onClick={() => setFilas((fs) => [...fs, filaVacia()])}>
            <Plus /> Agregar otro producto
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">¿Para cuándo lo necesitas?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Fecha requerida">
                {[...opcionesFecha, { clave: "elegir", texto: "Elegir fecha", fecha: fechaElegida }].map((o) => (
                  <button
                    key={o.clave}
                    role="radio"
                    aria-checked={opcionFecha === o.clave}
                    onClick={() => setOpcionFecha(o.clave)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      opcionFecha === o.clave ? "border-primary bg-secondary" : "bg-card hover:bg-muted",
                    )}
                  >
                    <div className="text-sm font-bold">{o.texto}</div>
                    <div className="text-xs text-muted-foreground">{o.clave === "elegir" ? "Tú decides" : `Hasta el ${fechaConDia(o.fecha)}`}</div>
                  </button>
                ))}
              </div>
              {opcionFecha === "elegir" && (
                <Input type="date" min={hoy} value={fechaElegida} onChange={(e) => setFechaElegida(e.target.value)} aria-label="Fecha requerida" className="max-w-xs" />
              )}
              <p className="text-sm text-muted-foreground">
                Solo te mostraremos compras cuya entrega llegue a más tardar el <span className="font-semibold text-foreground">{fechaConDia(fechaRequerida)}</span>.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setPaso(1)}>
              <ArrowLeft /> Volver a escribir
            </Button>
            <Button size="lg" onClick={guardar} disabled={guardando || !filasValidas}>
              {guardando ? <Girando /> : <CheckCircle2 />} Confirmar y buscar compras
            </Button>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-4">
          <Alert variant="exito">
            <CheckCircle2 />
            <div>
              <div className="font-semibold">Tu pedido está guardado.</div>
              Esto encontramos para cada producto. Unirte a una compra siempre es tu decisión.
            </div>
          </Alert>
          {resultado.map((n) => (
            <Card key={n.id} className="p-4">
              <div className="flex gap-3">
                <ImagenProducto nombre={n.producto.nombre} imagen={n.producto.imagen} className="size-14" />
                <div className="flex-1">
                  <div className="font-bold">
                    {n.producto.nombre} · {n.cantidad} {n.producto.unidad}
                  </div>
                  <p className="text-sm text-muted-foreground">{n.coincidencia.mensaje}</p>
                  <div className="mt-2">
                    <AccionCoincidencia n={n} alProponer={proponer} />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-between">
            <Button asChild variant="ghost">
              <Link to="/pedidos">Ver mis pedidos</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTexto("");
                setFilas([]);
                setPaso(1);
              }}
            >
              Registrar otro pedido <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
