package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.Necesidad;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Producto;
import pe.nexora.reglas.InterpreteDePedidos;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.NecesidadRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.web.Dto;

import java.util.ArrayList;
import java.util.List;

/** Pedidos del bodeguero: interpretación, registro, edición y búsqueda de compra conjunta. */
@Service
public class NecesidadServicio {
    private final NecesidadRepositorio necesidades;
    private final ProductoRepositorio productos;
    private final CompraConjuntaRepositorio compras;
    private final ParticipacionRepositorio participaciones;
    private final CompraServicio compraServicio;
    private final NotificacionServicio notificaciones;
    private final Vistas vistas;
    private final Reloj reloj;

    public NecesidadServicio(NecesidadRepositorio necesidades, ProductoRepositorio productos,
                             CompraConjuntaRepositorio compras, ParticipacionRepositorio participaciones,
                             CompraServicio compraServicio, NotificacionServicio notificaciones, Vistas vistas,
                             Reloj reloj) {
        this.necesidades = necesidades;
        this.productos = productos;
        this.compras = compras;
        this.participaciones = participaciones;
        this.compraServicio = compraServicio;
        this.notificaciones = notificaciones;
        this.vistas = vistas;
        this.reloj = reloj;
    }

    // ---------- Interpretación ----------

    @Transactional(readOnly = true)
    public List<Dto.ItemInterpretado> interpretar(String texto) {
        List<InterpreteDePedidos.ProductoRef> catalogo = productos.findByActivoTrueOrderByNombreAsc().stream()
                .map(p -> new InterpreteDePedidos.ProductoRef(p.id, p.nombre, p.listaPalabras(), p.unidad,
                        p.unidadVenta, p.equivalencia))
                .toList();
        return InterpreteDePedidos.interpretar(texto, catalogo).stream()
                .map(i -> new Dto.ItemInterpretado(i.fragmento(), i.productoId(), i.productoNombre(), i.cantidad(),
                        i.unidad(), i.confianza().name(), i.nota()))
                .toList();
    }

    // ---------- Registro y edición ----------

    @Transactional
    public List<Dto.NecesidadVista> crear(Negocio yo, Dto.CrearNecesidadesRequest req) {
        if (req.fechaRequerida().isBefore(reloj.hoy())) {
            throw ApiException.invalido("La fecha no puede ser pasada.");
        }
        List<Dto.NecesidadVista> salida = new ArrayList<>();
        for (Dto.NecesidadItem item : req.items()) {
            Producto p = productos.findById(item.productoId())
                    .filter(x -> x.activo)
                    .orElseThrow(() -> ApiException.invalido("Uno de los productos ya no está disponible."));
            List<Necesidad> repetidas = necesidades.findByNegocioIdAndProductoIdAndEstado(yo.id, p.id, Necesidad.Estado.ACTIVA);
            Necesidad n;
            if (!repetidas.isEmpty()) {
                // Pedido repetido: se actualiza el existente en lugar de duplicarlo.
                n = repetidas.get(0);
            } else {
                n = new Necesidad();
                n.negocioId = yo.id;
                n.productoId = p.id;
                n.estado = Necesidad.Estado.ACTIVA;
                n.creadaEn = reloj.ahora();
            }
            n.cantidad = item.cantidad();
            n.marcaPreferida = blancoANulo(item.marcaPreferida());
            n.aceptaEquivalente = item.aceptaEquivalente() == null || item.aceptaEquivalente();
            n.precioActual = item.precioActual();
            n.fechaRequerida = req.fechaRequerida();
            n.textoOriginal = blancoANulo(item.textoOriginal());
            necesidades.save(n);
            salida.add(vista(n, yo));
        }
        return salida;
    }

    @Transactional
    public Dto.NecesidadVista editar(Negocio yo, Long id, Dto.EditarNecesidadRequest req) {
        Necesidad n = cargar(yo, id);
        if (n.estado != Necesidad.Estado.ACTIVA) {
            throw ApiException.conflicto("Este pedido está en una compra conjunta. Retírate de la compra para editarlo.");
        }
        n.cantidad = req.cantidad();
        n.fechaRequerida = req.fechaRequerida();
        n.marcaPreferida = blancoANulo(req.marcaPreferida());
        n.aceptaEquivalente = req.aceptaEquivalente() == null || req.aceptaEquivalente();
        n.precioActual = req.precioActual();
        necesidades.save(n);
        return vista(n, yo);
    }

    @Transactional
    public void cancelar(Negocio yo, Long id) {
        Necesidad n = cargar(yo, id);
        if (n.estado == Necesidad.Estado.EN_COMPRA) {
            throw ApiException.conflicto("Primero retírate de la compra conjunta de este pedido.");
        }
        n.estado = Necesidad.Estado.CANCELADA;
        necesidades.save(n);
    }

    @Transactional
    public List<Dto.NecesidadVista> listar(Negocio yo) {
        return necesidades.findByNegocioIdOrderByCreadaEnDesc(yo.id).stream()
                .filter(n -> n.estado != Necesidad.Estado.CANCELADA)
                .map(n -> vista(n, yo)).toList();
    }

    @Transactional
    public Dto.NecesidadVista detalle(Negocio yo, Long id) {
        return vista(cargar(yo, id), yo);
    }

    private Necesidad cargar(Negocio yo, Long id) {
        return necesidades.findById(id).filter(n -> n.negocioId.equals(yo.id))
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos ese pedido."));
    }

    private Dto.NecesidadVista vista(Necesidad n, Negocio yo) {
        return vistas.necesidad(n, yo.zonaId, coincidencia(n, yo));
    }

    // ---------- Coincidencias ----------

    /** Busca una compra conjunta compatible: mismo producto, misma zona, abierta y que llegue a tiempo. */
    @Transactional
    public Dto.Coincidencia coincidencia(Necesidad n, Negocio yo) {
        if (n.estado == Necesidad.Estado.EN_COMPRA || n.estado == Necesidad.Estado.ATENDIDA) {
            Long compraId = participaciones.findByNegocioIdOrderByCreadaEnDesc(yo.id).stream()
                    .filter(p -> n.id.equals(p.necesidadId) && p.estado == Participacion.Estado.ACTIVA)
                    .map(p -> p.compraId).findFirst().orElse(null);
            return new Dto.Coincidencia("UNIDO", compraId, n.estado == Necesidad.Estado.ATENDIDA
                    ? "Pedido recibido." : "Este pedido ya está en una compra conjunta.");
        }
        if (n.estado == Necesidad.Estado.CANCELADA) {
            return new Dto.Coincidencia("CANCELADA", null, "Pedido cancelado.");
        }
        Producto p = productos.findById(n.productoId).orElseThrow();
        List<CompraConjunta> abiertas = compraServicio.abiertas(yo.zonaId, p.id);
        if (n.marcaPreferida != null && !n.aceptaEquivalente && !n.marcaPreferida.equalsIgnoreCase(p.marca)) {
            return new Dto.Coincidencia("MARCA", null, "Pediste solo la marca " + n.marcaPreferida
                    + " y el proveedor ofrece " + p.marca + ". Acepta equivalentes para ver la compra.");
        }
        for (CompraConjunta c : abiertas) {
            if (ReglasCompra.llegaATiempo(c.entregaHasta, n.fechaRequerida)) {
                return new Dto.Coincidencia("COMPRA", c.id, "Hay una compra conjunta de " + p.nombre.toLowerCase()
                        + " en tu zona. Cierra el " + CompraServicio.fecha(c.fechaCierre) + " y llega "
                        + CompraServicio.entregaTexto(c) + ".");
            }
        }
        if (!abiertas.isEmpty()) {
            CompraConjunta c = abiertas.get(0);
            return new Dto.Coincidencia("TARDE", c.id, "La compra abierta llega " + CompraServicio.entregaTexto(c)
                    + " y tú lo necesitas para el " + CompraServicio.fecha(n.fechaRequerida)
                    + ". Cambia la fecha de tu pedido si puedes esperar.");
        }
        if (p.listaZonas().contains(yo.zonaId)
                && ReglasCompra.fechasPropuesta(reloj.hoy(), n.fechaRequerida, p.plazoEntrega) != null) {
            return new Dto.Coincidencia("PROPONER", null, "Aún no hay una compra conjunta de " + p.nombre.toLowerCase()
                    + " en tu zona. Puedes proponerla para que otras bodegas se sumen.");
        }
        return new Dto.Coincidencia("SIN_OFERTA", null, "Por ahora ningún proveedor puede entregar "
                + p.nombre.toLowerCase() + " en tu zona antes del " + CompraServicio.fecha(n.fechaRequerida) + ".");
    }

    /** Crea una compra conjunta nueva a partir de un pedido; el bodeguero decide después si se une. */
    @Transactional
    public Dto.CompraVista proponer(Negocio yo, Long necesidadId) {
        Necesidad n = cargar(yo, necesidadId);
        Dto.Coincidencia actual = coincidencia(n, yo);
        if (!"PROPONER".equals(actual.tipo())) {
            if (actual.compraId() != null) {
                return compraServicio.detalle(actual.compraId(), yo, null, n.id);
            }
            throw ApiException.conflicto(actual.mensaje());
        }
        Producto p = productos.findById(n.productoId).orElseThrow();
        ReglasCompra.Fechas f = ReglasCompra.fechasPropuesta(reloj.hoy(), n.fechaRequerida, p.plazoEntrega);
        CompraConjunta c = new CompraConjunta();
        c.productoId = p.id;
        c.proveedorId = p.proveedorId;
        c.zonaId = yo.zonaId;
        c.estado = ReglasCompra.Estado.PROPUESTA;
        c.estadoDesde = reloj.ahora();
        c.fechaCierre = f.cierre();
        c.entregaDesde = f.entregaDesde();
        c.entregaHasta = f.entregaHasta();
        c.creadaEn = reloj.ahora();
        compras.save(c);
        notificaciones.avisarNegocio(yo.id, "COMPRA", "Propusiste una compra conjunta de " + p.nombre.toLowerCase()
                + ". Únete con tu pedido para que otras bodegas la vean avanzar.", "/compras/" + c.id);
        return compraServicio.detalle(c.id, yo, null, n.id);
    }

    private static String blancoANulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
