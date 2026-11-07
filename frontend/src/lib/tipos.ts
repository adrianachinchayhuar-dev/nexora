// Tipos que devuelve la API (espejo de pe.nexora.web.Dto en el backend).

export interface Zona { id: string; distrito: string; nombre: string }

export interface Negocio {
  id: number; nombre: string; responsable: string; celular: string; distrito: string; zona: Zona;
  direccion: string; ruc: string | null; descripcion: string | null; horario: string | null;
}

export interface Cuenta { usuarioId: number; email: string; rol: string; negocio: Negocio | null }
export interface Sesion { token: string; cuenta: Cuenta }

export interface Tramo { desde: number; hasta: number | null; precio: number }
export interface Proveedor { id: number; razonSocial: string; puntualidad: number | null; entregasATiempo: number; entregasTotal: number }

export interface CompraCorta {
  id: number; estadoVisible: string; fechaCierre: string; entregaHasta: string; precioActual: number; total: number; minimo: number;
}

export interface Producto {
  id: number; nombre: string; marca: string; presentacion: string; categoriaId: string; categoria: string;
  unidad: string; unidadVenta: string; equivalencia: number; imagen: string | null; minimo: number; plazoEntrega: number;
  proveedor: Proveedor; tramos: Tramo[]; precioDesde: number; precioHasta: number; compraAbierta: CompraCorta | null;
}

export interface Categoria { id: string; nombre: string }

export type Confianza = "ALTA" | "MEDIA" | "BAJA";
export interface ItemInterpretado {
  fragmento: string; productoId: number | null; productoNombre: string | null; cantidad: number | null;
  unidad: string | null; confianza: Confianza; nota: string | null;
}

export type TipoCoincidencia = "UNIDO" | "COMPRA" | "TARDE" | "MARCA" | "PROPONER" | "SIN_OFERTA" | "CANCELADA";
export interface Coincidencia { tipo: TipoCoincidencia; compraId: number | null; mensaje: string }

export type EstadoNecesidad = "ACTIVA" | "EN_COMPRA" | "ATENDIDA" | "CANCELADA";
export interface Necesidad {
  id: number; producto: Producto; cantidad: number; marcaPreferida: string | null; aceptaEquivalente: boolean;
  precioActual: number | null; fechaRequerida: string; estado: EstadoNecesidad; textoOriginal: string | null;
  creadaEn: string; coincidencia: Coincidencia;
}

export type ClaveVisible = "REUNIENDO" | "ESPERANDO_PROVEEDOR" | "CONFIRMADA" | "NO_SE_CONCRETO";
export interface EstadoVisible { clave: ClaveVisible; texto: string }
export interface Resumen {
  indiceTramo: number; precioActual: number; precioNormal: number; alcanzaMinimo: boolean; faltaMinimo: number;
  faltanSiguiente: number | null; precioSiguiente: number | null;
}
export type EtiquetaAhorro = "REFERENCIAL" | "PRELIMINAR" | "CONFIRMADO";
export interface Ahorro { monto: number; etiqueta: EtiquetaAhorro; precioReferencia: number; precioCompra: number }

export interface Incidencia {
  id: number; compraId: number; producto: string; motivo: string; descripcion: string; estado: string;
  respuesta: string | null; creadaEn: string;
}

export interface MiParticipacion {
  id: number; cantidad: number; precioEstimado: number; precioAceptado: boolean; debeAceptarPrecio: boolean;
  recibido: boolean; necesidadId: number | null; fechaRequerida: string | null; llegaATiempo: boolean; ahorro: Ahorro;
  incidencias: Incidencia[];
}

export interface Simulacion {
  cantidad: number; totalConmigo: number; precioConmigo: number; alcanzaMinimo: boolean; ahorro: Ahorro; llegaATiempo: boolean;
}

export interface NecesidadCompatible { id: number; cantidad: number; fechaRequerida: string; llegaATiempo: boolean; precioActual: number | null }

export type EntregaEstado = "EN_PREPARACION" | "EN_CAMINO" | "ENTREGADA" | "RETRASADA";

export interface Compra {
  id: number; producto: Producto; proveedor: Proveedor; zona: Zona; estado: string; estadoVisible: EstadoVisible;
  estadoDesde: string; hoy: string; fechaCierre: string; entregaDesde: string; entregaHasta: string; tramos: Tramo[];
  minimo: number; total: number; negocios: number; otrasBodegas: number; resumen: Resumen; precioFinal: number | null;
  costoTransporte: number | null; compensacion: string | null; entregaEstado: EntregaEstado | null; puedeUnirse: boolean;
  motivoNoUnirse: string | null; miParticipacion: MiParticipacion | null; simulacion: Simulacion | null;
  necesidadesCompatibles: NecesidadCompatible[]; avisos: { texto: string; creadoEn: string }[];
}

export interface FechaProxima { tipo: "CIERRE" | "ENTREGA" | "REQUERIDA"; fecha: string; compraId: number | null; texto: string }

export interface Inicio {
  saludo: string; pedidosActivos: number; comprasActivas: number; ahorroEstimado: number; notificacionesSinLeer: number;
  proximasFechas: FechaProxima[]; pedidosConCompra: Necesidad[]; comprasCercanas: Compra[];
}

export interface Notificacion { id: number; tipo: string; texto: string; enlace: string | null; leida: boolean; creadaEn: string }
export interface Notificaciones { sinLeer: number; lista: Notificacion[] }
