import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CargandoLista, Encabezado, ErrorCarga, Pildoras, Vacio } from "@/components/comun";
import { TarjetaCompra } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import type { Compra } from "@/lib/tipos";

type Filtro = "PARA_TI" | "ABIERTAS" | "CERRADAS" | "MIAS" | "TODAS";

const FILTROS: { valor: Filtro; texto: string; cumple: (c: Compra) => boolean }[] = [
  { valor: "PARA_TI", texto: "Para ti", cumple: (c) => c.puedeUnirse && (c.simulacion !== null || c.necesidadesCompatibles.length > 0) },
  { valor: "ABIERTAS", texto: "Abiertas", cumple: (c) => ["REUNIENDO", "ESPERANDO_PROVEEDOR"].includes(c.estadoVisible.clave) },
  { valor: "CERRADAS", texto: "Cerradas", cumple: (c) => ["CONFIRMADA", "NO_SE_CONCRETO"].includes(c.estadoVisible.clave) },
  { valor: "MIAS", texto: "Donde participo", cumple: (c) => c.miParticipacion !== null },
  { valor: "TODAS", texto: "Todas", cumple: () => true },
];

export default function Compras() {
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [busqueda, setBusqueda] = useState("");
  const { datos, error, cargando, recargar } = useApi<Compra[]>("/compras");

  const buscadas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (datos ?? []).filter(
      (c) => !q || c.producto.nombre.toLowerCase().includes(q) || c.proveedor.razonSocial.toLowerCase().includes(q) || c.producto.marca.toLowerCase().includes(q),
    );
  }, [datos, busqueda]);
  const actual = FILTROS.find((f) => f.valor === filtro)!;
  const lista = buscadas.filter(actual.cumple);

  return (
    <div>
      <Encabezado
        titulo="Compras en grupo"
        etiqueta="Compra junto a otros"
        imagen="/img/cabeceras/compras.webp"
        descripcion="Negocios cerca de ti que compran juntos para pagar menos. Ves cuántos participan, nunca sus nombres."
      />
      <div className="mb-5 space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar aceite, proveedor…" className="rounded-full pl-10" aria-label="Buscar compras" />
        </div>
        <Pildoras
          etiqueta="Filtrar compras"
          valor={filtro}
          onCambio={setFiltro}
          opciones={FILTROS.map((f) => ({ valor: f.valor, texto: f.texto, cuenta: datos ? buscadas.filter(f.cumple).length : undefined }))}
        />
      </div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Resultados</h2>
        {datos && <span className="text-sm text-muted-foreground">{lista.length === 1 ? "1 compra en grupo" : `${lista.length} compras en grupo`}</span>}
      </div>
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      {datos && lista.length === 0 && (
        <Vacio icono={<Sparkles />} titulo="No hay compras en esta vista" texto="Prueba con otro filtro o registra una necesidad para proponer una compra en grupo." />
      )}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {lista.map((c) => (
          <TarjetaCompra key={c.id} compra={c} />
        ))}
      </div>
    </div>
  );
}
