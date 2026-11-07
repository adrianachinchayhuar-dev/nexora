package pe.nexora.servicio;

import org.springframework.stereotype.Component;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Categoria;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.Incidencia;
import pe.nexora.dominio.Necesidad;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Producto;
import pe.nexora.dominio.Proveedor;
import pe.nexora.dominio.TramoPrecio;
import pe.nexora.dominio.Zona;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.repositorio.AvisoRepositorio;
import pe.nexora.repositorio.CategoriaRepositorio;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.IncidenciaRepositorio;
import pe.nexora.repositorio.NecesidadRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.repositorio.TramoPrecioRepositorio;
import pe.nexora.repositorio.ZonaRepositorio;
import pe.nexora.web.Dto;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Arma las respuestas de la API a partir de las entidades.
 * Aquí se aplica la privacidad parcial: las otras bodegas solo aparecen como un número, nunca con nombre ni cantidad.
 */
@Component
public class Vistas {
    private final ProductoRepositorio productos;
    private final ProveedorRepositorio proveedores;
    private final TramoPrecioRepositorio tramos;
    private final CategoriaRepositorio categorias;
    private final ZonaRepositorio zonas;
    private final CompraConjuntaRepositorio compras;
    private final ParticipacionRepositorio participaciones;
    private final NecesidadRepositorio necesidades;
    private final AvisoRepositorio avisos;
    private final IncidenciaRepositorio incidencias;
    private final Reloj reloj;

    public Vistas(ProductoRepositorio productos, ProveedorRepositorio proveedores, TramoPrecioRepositorio tramos,
                  CategoriaRepositorio categorias, ZonaRepositorio zonas, CompraConjuntaRepositorio compras,
                  ParticipacionRepositorio participaciones, NecesidadRepositorio necesidades,
                  AvisoRepositorio avisos, IncidenciaRepositorio incidencias, Reloj reloj) {
        this.productos = productos;
        this.proveedores = proveedores;
        this.tramos = tramos;
        this.categorias = categorias;
        this.zonas = zonas;
        this.compras = compras;
        this.participaciones = participaciones;
        this.necesidades = necesidades;
        this.avisos = avisos;
        this.incidencias = incidencias;
        this.reloj = reloj;
    }

    // ---------- Bloques simples ----------

    public Dto.ZonaVista zona(String zonaId) {
        Zona z = zonas.findById(zonaId).orElse(null);
        return z == null ? new Dto.ZonaVista(zonaId, "", zonaId) : new Dto.ZonaVista(z.id, z.distrito, z.nombre);
    }

    public Dto.NegocioVista negocio(Negocio n) {
        return new Dto.NegocioVista(n.id, n.nombre, n.responsable, n.celular, n.distrito, zona(n.zonaId), n.direccion,
                n.ruc, n.descripcion, n.horario);
    }

    public Dto.ProveedorVista proveedor(Long proveedorId) {
        Proveedor p = proveedores.findById(proveedorId).orElseThrow();
        return new Dto.ProveedorVista(p.id, p.razonSocial, ReglasCompra.puntualidad(p.entregasATiempo, p.entregasTotal),
                p.entregasATiempo, p.entregasTotal);
    }

    public List<ReglasCompra.Tramo> tramosDe(Long productoId) {
        return tramos.findByProductoIdOrderByDesdeAsc(productoId).stream()
                .map(t -> new ReglasCompra.Tramo(t.desde, t.hasta, t.precio)).toList();
    }

    public List<Dto.TramoVista> tramosVista(List<ReglasCompra.Tramo> lista) {
        return lista.stream().map(t -> new Dto.TramoVista(t.desde(), t.hasta(), t.precio())).toList();
    }

    public int total(Long compraId) {
        return participaciones.findByCompraIdAndEstado(compraId, Participacion.Estado.ACTIVA).stream()
                .mapToInt(p -> p.cantidad).sum();
    }

    public int negocios(Long compraId) {
        return (int) participaciones.findByCompraIdAndEstado(compraId, Participacion.Estado.ACTIVA).stream()
                .map(p -> p.negocioId).distinct().count();
    }

    public Dto.EstadoVisible estadoVisible(ReglasCompra.Estado e) {
        ReglasCompra.Visible v = ReglasCompra.visible(e);
        return new Dto.EstadoVisible(v.name(), v.texto);
    }

    public Dto.AhorroVista ahorro(ReglasCompra.Ahorro a) {
        return new Dto.AhorroVista(a.monto(), a.etiqueta().name(), a.precioReferencia(), a.precioCompra());
    }

    // ---------- Producto ----------

    /** Producto del catálogo; si se indica la zona, incluye la compra conjunta abierta en esa zona. */
    public Dto.ProductoVista producto(Producto p, String zonaId) {
        List<ReglasCompra.Tramo> lista = tramosDe(p.id);
        BigDecimal desde = lista.stream().map(ReglasCompra.Tramo::precio).min(Comparator.naturalOrder()).orElse(null);
        BigDecimal hasta = lista.stream().map(ReglasCompra.Tramo::precio).max(Comparator.naturalOrder()).orElse(null);
        String categoria = categorias.findById(p.categoriaId).map(c -> c.nombre).orElse(p.categoriaId);
        Dto.CompraCorta abierta = null;
        if (zonaId != null) {
            abierta = compras.findByZonaIdAndProductoId(zonaId, p.id).stream()
                    .filter(c -> c.estado.permiteUnirse() && !c.fechaCierre.isBefore(reloj.hoy()))
                    .min(Comparator.comparing(c -> c.fechaCierre))
                    .map(c -> {
                        int total = total(c.id);
                        ReglasCompra.Resumen r = ReglasCompra.resumen(lista, total, p.minimo);
                        return new Dto.CompraCorta(c.id, ReglasCompra.visible(c.estado).texto, c.fechaCierre,
                                c.entregaHasta, r.precioActual(), total, p.minimo);
                    }).orElse(null);
        }
        return new Dto.ProductoVista(p.id, p.nombre, p.marca, p.presentacion, p.categoriaId, categoria, p.unidad,
                p.unidadVenta, p.equivalencia, p.imagen, p.minimo, p.plazoEntrega, proveedor(p.proveedorId),
                tramosVista(lista), desde, hasta, abierta);
    }

    public Dto.ProductoVista producto(Long productoId, String zonaId) {
        return producto(productos.findById(productoId).orElseThrow(), zonaId);
    }

    public List<Dto.CategoriaVista> categorias() {
        return categorias.findAll().stream().sorted(Comparator.comparing((Categoria c) -> c.nombre))
                .map(c -> new Dto.CategoriaVista(c.id, c.nombre)).toList();
    }

    // ---------- Compra conjunta ----------

    /**
     * Vista completa de una compra para un negocio.
     *
     * @param simCantidad   cantidad para «si te unes con…» (opcional)
     * @param simNecesidad  pedido con el que se uniría (opcional, aporta precio individual y fecha requerida)
     */
    public Dto.CompraVista compra(CompraConjunta c, Negocio yo, Integer simCantidad, Long simNecesidad, boolean conAvisos) {
        Producto producto = productos.findById(c.productoId).orElseThrow();
        List<ReglasCompra.Tramo> lista = tramosDe(producto.id);
        List<Participacion> activas = participaciones.findByCompraIdAndEstado(c.id, Participacion.Estado.ACTIVA);
        int total = activas.stream().mapToInt(p -> p.cantidad).sum();
        int negocios = (int) activas.stream().map(p -> p.negocioId).distinct().count();
        Participacion mia = activas.stream().filter(p -> Objects.equals(p.negocioId, yo.id)).findFirst().orElse(null);
        ReglasCompra.Resumen r = ReglasCompra.resumen(lista, total, producto.minimo);
        BigDecimal primerTramo = lista.get(0).precio();
        boolean abierta = !c.fechaCierre.isBefore(reloj.hoy());

        Dto.MiParticipacion miVista = null;
        if (mia != null) {
            Necesidad nec = mia.necesidadId == null ? null : necesidades.findById(mia.necesidadId).orElse(null);
            BigDecimal precioCompra = c.precioFinal != null ? c.precioFinal : r.precioActual();
            ReglasCompra.Ahorro a = ReglasCompra.ahorro(mia.cantidad, nec == null ? null : nec.precioActual, primerTramo,
                    precioCompra, c.costoTransporte, c.precioFinal != null);
            boolean aTiempo = nec == null || ReglasCompra.llegaATiempo(c.entregaHasta, nec.fechaRequerida);
            List<Dto.IncidenciaVista> inc = incidencias.findByCompraIdAndNegocioIdOrderByCreadaEnDesc(c.id, yo.id)
                    .stream().map(i -> incidencia(i, producto.nombre)).toList();
            miVista = new Dto.MiParticipacion(mia.id, mia.cantidad, mia.precioEstimado, mia.precioAceptado,
                    c.estado == ReglasCompra.Estado.PRECIO_POR_ACEPTAR && !mia.precioAceptado, mia.recibido,
                    mia.necesidadId, nec == null ? null : nec.fechaRequerida, aTiempo, ahorro(a), inc);
        }

        String motivo = null;
        if (mia != null) {
            motivo = "Ya participas en esta compra.";
        } else if (!c.estado.permiteUnirse()) {
            ReglasCompra.Visible visible = ReglasCompra.visible(c.estado);
            if (visible == ReglasCompra.Visible.CONFIRMADA) {
                motivo = "La compra ya fue confirmada por el proveedor.";
            } else if (visible == ReglasCompra.Visible.NO_SE_CONCRETO) {
                motivo = "Esta compra no se concretó.";
            } else {
                motivo = "El proveedor está revisando el precio final; espera su respuesta.";
            }
        } else if (!abierta) {
            motivo = "La compra ya cerró.";
        } else if (!c.zonaId.equals(yo.zonaId)) {
            motivo = "Esta compra es de otra zona.";
        }
        boolean puedeUnirse = motivo == null;

        List<Necesidad> mias = necesidades.findByNegocioIdAndProductoIdAndEstado(yo.id, producto.id, Necesidad.Estado.ACTIVA);
        List<Dto.NecesidadCompatible> compatibles = mias.stream()
                .map(n -> new Dto.NecesidadCompatible(n.id, n.cantidad, n.fechaRequerida,
                        ReglasCompra.llegaATiempo(c.entregaHasta, n.fechaRequerida), n.precioActual))
                .toList();

        Dto.Simulacion sim = null;
        if (mia == null) {
            Necesidad base = simNecesidad == null ? null
                    : mias.stream().filter(n -> n.id.equals(simNecesidad)).findFirst().orElse(null);
            int cantidad = simCantidad != null && simCantidad > 0 ? simCantidad
                    : base != null ? base.cantidad
                    : !mias.isEmpty() ? mias.get(0).cantidad : 0;
            if (base == null && simCantidad == null && !mias.isEmpty()) {
                base = mias.get(0);
            }
            if (cantidad > 0) {
                ReglasCompra.Resumen con = ReglasCompra.resumen(lista, total + cantidad, producto.minimo);
                ReglasCompra.Ahorro a = ReglasCompra.ahorro(cantidad, base == null ? null : base.precioActual, primerTramo,
                        con.precioActual(), c.costoTransporte, false);
                sim = new Dto.Simulacion(cantidad, total + cantidad, con.precioActual(), con.alcanzaMinimo(), ahorro(a),
                        base == null || ReglasCompra.llegaATiempo(c.entregaHasta, base.fechaRequerida));
            }
        }

        List<Dto.AvisoVista> listaAvisos = conAvisos
                ? avisos.findByCompraIdOrderByCreadoEnDesc(c.id).stream().map(a -> new Dto.AvisoVista(a.texto, a.creadoEn)).toList()
                : List.of();

        return new Dto.CompraVista(c.id, producto(producto, null), proveedor(c.proveedorId), zona(c.zonaId),
                c.estado.name(), estadoVisible(c.estado), c.estadoDesde, reloj.hoy(), c.fechaCierre, c.entregaDesde,
                c.entregaHasta, tramosVista(lista), producto.minimo, total, negocios,
                mia == null ? negocios : negocios - 1,
                new Dto.ResumenVista(r.indiceTramo(), r.precioActual(), r.precioNormal(), r.alcanzaMinimo(),
                        r.faltaMinimo(), r.faltanSiguiente(), r.precioSiguiente()),
                c.precioFinal, c.costoTransporte, c.compensacion,
                c.entregaEstado == null ? null : c.entregaEstado.name(), puedeUnirse, motivo, miVista, sim,
                compatibles, listaAvisos);
    }

    public Dto.IncidenciaVista incidencia(Incidencia i, String producto) {
        return new Dto.IncidenciaVista(i.id, i.compraId, producto, i.motivo.name(), i.descripcion, i.estado.name(),
                i.respuesta, i.creadaEn);
    }

    public Dto.IncidenciaVista incidencia(Incidencia i) {
        String producto = compras.findById(i.compraId)
                .flatMap(c -> productos.findById(c.productoId)).map(p -> p.nombre).orElse("");
        return incidencia(i, producto);
    }

    public Dto.NecesidadVista necesidad(Necesidad n, String zonaId, Dto.Coincidencia coincidencia) {
        return new Dto.NecesidadVista(n.id, producto(n.productoId, zonaId), n.cantidad, n.marcaPreferida,
                n.aceptaEquivalente, n.precioActual, n.fechaRequerida, n.estado.name(), n.textoOriginal, n.creadaEn,
                coincidencia);
    }

    /** Las tramos de precio guardados, para quien necesite la entidad (por ejemplo, la demo). */
    public List<TramoPrecio> tramosEntidad(Long productoId) {
        return tramos.findByProductoIdOrderByDesdeAsc(productoId);
    }
}
