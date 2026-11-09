import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ClipboardList, PackageSearch, Plus, Search, ShoppingBasket, Star, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CargandoLista, Encabezado, ErrorCarga, Vacio } from "@/components/comun";
import { ImagenProducto } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import { fechaCorta, soles } from "@/lib/formato";
import type { Categoria, Producto } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const CLAVE_LISTA = "nexora.miLista";
function leerLista(): Producto[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_LISTA) ?? "[]") as Producto[];
  } catch {
    return [];
  }
}

export default function Catalogo() {
  const navegar = useNavigate();
  const [miLista, setMiLista] = useState<Producto[]>(leerLista);
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_LISTA, JSON.stringify(miLista));
    } catch {
      /* sin almacenamiento: la lista vive solo en esta visita */
    }
  }, [miLista]);
  const enLista = (p: Producto) => miLista.some((x) => x.id === p.id);
  const alternar = (p: Producto) => setMiLista((xs) => (xs.some((x) => x.id === p.id) ? xs.filter((x) => x.id !== p.id) : [...xs, p]));
  const guardarLista = () => {
    const ids = miLista.map((p) => p.id).join(",");
    setMiLista([]);
    navegar(`/pedidos/nuevo?producto=${ids}`);
  };
  const [categoria, setCategoria] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const { datos: categorias } = useApi<Categoria[]>("/categorias");
  const ruta = `/catalogo?categoria=${encodeURIComponent(categoria)}&q=${encodeURIComponent(q)}`;
  const { datos, error, cargando, recargar } = useApi<Producto[]>(ruta);

  return (
    <div>
      <Encabezado
        titulo="Catálogo"
        etiqueta="Productos"
        imagen="/img/cabeceras/catalogo.webp"
        descripcion="Encuentra lo que necesita tu negocio. El precio baja por tramos cuando varias bodegas compran juntas."
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(busqueda.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Busca aceite, arroz, leche…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar producto"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Categorías">
        {[{ id: "", nombre: "Todo" }, ...(categorias ?? [])].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            aria-pressed={categoria === c.id}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              categoria === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {c.nombre}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
          {cargando && !datos && <CargandoLista />}
          {datos && datos.length === 0 && <Vacio icono={<PackageSearch />} titulo="No encontramos productos" texto="Prueba con otra palabra o categoría." />}
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {datos?.map((p) => (
              <Card key={p.id} className="flex flex-col p-4">
                <div className="flex gap-3">
                  <ImagenProducto nombre={p.nombre} imagen={p.imagen} className="size-20" />
                  <div className="min-w-0">
                    <Badge variant="muted">{p.categoria}</Badge>
                    <h3 className="mt-1 font-bold leading-tight">{p.nombre}</h3>
                    <p className="text-sm text-muted-foreground">
                      {p.marca} · {p.presentacion}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Se vende por {p.unidadVenta} ({p.equivalencia} {p.unidad})
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{p.proveedor.razonSocial}</span>
                  {p.proveedor.puntualidad !== null && (
                    <span className="inline-flex items-center gap-0.5">
                      · <Star className="size-3.5 fill-naranja text-naranja" /> {p.proveedor.puntualidad}% a tiempo
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {p.tramos.map((t, i) => (
                    <div key={t.desde} className={cn("rounded-lg bg-muted px-2 py-1.5 text-center", i === p.tramos.length - 1 && "bg-secondary")}>
                      <div className="text-sm font-bold">{soles(t.precio)}</div>
                      <div className="text-[11px] text-muted-foreground">{t.hasta === null ? `${t.desde}+` : `${t.desde}–${t.hasta}`}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Precio por {p.unidad.replace(/s$/, "")} según la cantidad total del grupo. Mínimo para comprar juntos: {p.minimo} {p.unidad}.
                </p>
                <div className="mt-auto pt-4">
                  {p.compraAbierta ? (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-exito-suave px-3 py-2 text-sm text-exito">
                        <ShoppingBasket className="mr-1 inline size-4" />
                        <span className="font-semibold">Compra abierta</span> · {p.compraAbierta.total}/{p.compraAbierta.minimo} · cierra el{" "}
                        {fechaCorta(p.compraAbierta.fechaCierre)}
                      </div>
                      <Button asChild className="w-full">
                        <Link to={`/compras/${p.compraAbierta.id}`}>Ver compra y unirme</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button variant={enLista(p) ? "secondary" : "outline"} className="w-full" onClick={() => alternar(p)} aria-pressed={enLista(p)}>
                      {enLista(p) ? <Check /> : <Plus />} {enLista(p) ? "En mi lista" : "Agregar a mi lista"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
        <Card className="h-fit p-5 lg:sticky lg:top-20">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Mi lista ({miLista.length})</h2>
          </div>
          {miLista.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Agrega los productos que necesitas. Luego indicas cantidades y fecha en un solo pedido.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {miLista.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-xl bg-muted/60 p-2">
                    <ImagenProducto nombre={p.nombre} imagen={p.imagen} className="size-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.nombre}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.presentacion}</p>
                    </div>
                    <button
                      onClick={() => alternar(p)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-card hover:text-foreground"
                      aria-label={`Quitar ${p.nombre}`}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button className="mt-4 w-full" onClick={guardarLista}>
                Guardar mi pedido
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">En el siguiente paso pones cantidades y fecha.</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
