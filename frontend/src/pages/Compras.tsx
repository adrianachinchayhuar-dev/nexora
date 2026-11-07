import { useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CargandoLista, Encabezado, ErrorCarga, Vacio } from "@/components/comun";
import { TarjetaCompra } from "@/components/compra";
import { useApi } from "@/lib/useApi";
import type { Compra } from "@/lib/tipos";

const FILTROS = [
  { valor: "", texto: "Todas" },
  { valor: "REUNIENDO", texto: "Reuniendo negocios" },
  { valor: "ESPERANDO_PROVEEDOR", texto: "Esperando al proveedor" },
  { valor: "CONFIRMADA", texto: "Confirmadas" },
  { valor: "NO_SE_CONCRETO", texto: "No se concretaron" },
  { valor: "MIAS", texto: "Mis compras" },
];

export default function Compras() {
  const [filtro, setFiltro] = useState("");
  const { datos, error, cargando, recargar } = useApi<Compra[]>(`/compras?filtro=${filtro}`);

  return (
    <div>
      <Encabezado
        titulo="Compras conjuntas"
        descripcion="Compras de tu zona que reúnen a varias bodegas para llegar al precio por volumen. Ves cuántas bodegas participan, nunca sus nombres."
      />
      <Tabs value={filtro} onValueChange={setFiltro} className="mb-5">
        <TabsList>
          {FILTROS.map((f) => (
            <TabsTrigger key={f.valor} value={f.valor}>
              {f.texto}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {error && <ErrorCarga mensaje={error} reintentar={recargar} />}
      {cargando && !datos && <CargandoLista />}
      {datos?.length === 0 && <Vacio icono={<ShoppingBasket />} titulo="No hay compras en esta vista" texto="Prueba con otro filtro o registra un pedido para proponer una compra." />}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {datos?.map((c) => (
          <TarjetaCompra key={c.id} compra={c} />
        ))}
      </div>
    </div>
  );
}
