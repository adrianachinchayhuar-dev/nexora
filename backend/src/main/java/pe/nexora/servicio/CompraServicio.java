package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.Incidencia;
import pe.nexora.dominio.Necesidad;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Producto;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.reglas.ReglasCompra.Estado;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.IncidenciaRepositorio;
import pe.nexora.repositorio.NecesidadRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.web.Dto;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class CompraServicio {
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM", Locale.forLanguageTag("es-PE"));

    private final CompraConjuntaRepositorio compras;
    private final ParticipacionRepositorio participaciones;
    private final NecesidadRepositorio necesidades;
    private final ProductoRepositorio productos;
    private final IncidenciaRepositorio incidencias;
    private final NotificacionServicio notificaciones;
    private final Vistas vistas;
    private final Reloj reloj;

    public CompraServicio(CompraConjuntaRepositorio compras, ParticipacionRepositorio participaciones,
                          NecesidadRepositorio necesidades, ProductoRepositorio productos,
                          IncidenciaRepositorio incidencias, NotificacionServicio notificaciones, Vistas vistas,
                          Reloj reloj) {
        this.compras = compras;
        this.participaciones = participaciones;
        this.necesidades = necesidades;
        this.productos = productos;
        this.incidencias = incidencias;
        this.notificaciones = notificaciones;
        this.vistas = vistas;
        this.reloj = reloj;
    }

    public static String fecha(LocalDate d) {
        return d == null ? "" : d.format(FECHA);
    }

    // ---------- Estado ----------

    /** Aplica las reglas de estado (mínimo y cierre) y guarda si cambió. */
    @Transactional
    public CompraConjunta refrescar(CompraConjunta c) {
        Producto p = productos.findById(c.productoId).orElseThrow();
        Estado nuevo = ReglasCompra.recalcular(c.estado, vistas.total(c.id), p.minimo, !c.fechaCierre.isBefore(reloj.hoy()));
        if (nuevo != c.estado) {
            Estado anterior = c.estado;
            c.estado = nuevo;
            c.estadoDesde = reloj.ahora();
            compras.save(c);
            if (nuevo == Estado.VENCIDA) {
                liberarPedidos(c.id);
                notificaciones.avisarParticipantes(c.id, null, "COMPRA",
                        "La compra de " + p.nombre.toLowerCase() + " no se concretó: cerró sin la confirmación del proveedor.");
            } else if (nuevo == Estado.EN_COTIZACION) {
                notificaciones.avisarParticipantes(c.id, null, "COMPRA",
                        "¡Se alcanzó el mínimo de " + p.nombre.toLowerCase() + "! Ahora el proveedor confirma stock, precio final y entrega.");
            } else if (nuevo == Estado.BUSCANDO_PARTICIPANTES && anterior != Estado.PROPUESTA) {
                notificaciones.avisarParticipantes(c.id, null, "COMPRA",
                        "La compra de " + p.nombre.toLowerCase() + " quedó por debajo del mínimo y vuelve a reunir negocios.");
            }
        }
        return c;
    }

    private void liberarPedidos(Long compraId) {
        for (Participacion p : participaciones.findByCompraIdAndEstado(compraId, Participacion.Estado.ACTIVA)) {
            if (p.necesidadId != null) {
                necesidades.findById(p.necesidadId).ifPresent(n -> {
                    if (n.estado == Necesidad.Estado.EN_COMPRA) {
                        n.estado = Necesidad.Estado.ACTIVA;
                        necesidades.save(n);
                    }
                });
            }
        }
    }

    CompraConjunta cargar(Long id) {
        return compras.findById(id).orElseThrow(() -> ApiException.noEncontrado("No encontramos esa compra conjunta."));
    }

    // ---------- Consultas ----------

    /**
     * Compras de la zona del negocio y las de otras zonas en las que participa.
     *
     * @param filtro REUNIENDO, ESPERANDO_PROVEEDOR, CONFIRMADA, NO_SE_CONCRETO, MIAS o null (todas)
     */
    @Transactional
    public List<Dto.CompraVista> listar(Negocio yo, String filtro) {
        Map<Long, CompraConjunta> todas = new LinkedHashMap<>();
        compras.findByZonaIdOrderByFechaCierreAsc(yo.zonaId).forEach(c -> todas.put(c.id, c));
        participaciones.findByNegocioIdOrderByCreadaEnDesc(yo.id).stream()
                .filter(p -> p.estado == Participacion.Estado.ACTIVA)
                .forEach(p -> compras.findById(p.compraId).ifPresent(c -> todas.putIfAbsent(c.id, c)));
        List<Dto.CompraVista> salida = new ArrayList<>();
        for (CompraConjunta c : todas.values()) {
            refrescar(c);
            Dto.CompraVista v = vistas.compra(c, yo, null, null, false);
            boolean incluir = filtro == null || filtro.isBlank()
                    || ("MIAS".equals(filtro) && v.miParticipacion() != null)
                    || filtro.equals(v.estadoVisible().clave());
            if (incluir) {
                salida.add(v);
            }
        }
        salida.sort(Comparator.comparing((Dto.CompraVista v) -> orden(v.estadoVisible().clave()))
                .thenComparing(Dto.CompraVista::fechaCierre));
        return salida;
    }

    private static int orden(String clave) {
        return switch (clave) {
            case "REUNIENDO" -> 0;
            case "ESPERANDO_PROVEEDOR" -> 1;
            case "CONFIRMADA" -> 2;
            default -> 3;
        };
    }

    @Transactional
    public Dto.CompraVista detalle(Long id, Negocio yo, Integer cantidad, Long necesidadId) {
        CompraConjunta c = refrescar(cargar(id));
        return vistas.compra(c, yo, cantidad, necesidadId, true);
    }

    @Transactional
    public List<Dto.CompraVista> misParticipaciones(Negocio yo) {
        return listar(yo, "MIAS");
    }

    // ---------- Acciones del bodeguero ----------

    @Transactional
    public Dto.CompraVista unirse(Long id, Negocio yo, Dto.UnirseRequest req) {
        CompraConjunta c = refrescar(cargar(id));
        Producto producto = productos.findById(c.productoId).orElseThrow();
        if (participaciones.findFirstByCompraIdAndNegocioIdAndEstado(c.id, yo.id, Participacion.Estado.ACTIVA).isPresent()) {
            throw ApiException.conflicto("Ya participas en esta compra.");
        }
        if (!c.estado.permiteUnirse() || c.fechaCierre.isBefore(reloj.hoy())) {
            throw ApiException.conflicto("Esta compra ya no acepta nuevos negocios.");
        }
        if (!c.zonaId.equals(yo.zonaId)) {
            throw ApiException.conflicto("Solo puedes unirte a compras de tu zona.");
        }
        Necesidad necesidad = null;
        if (req.necesidadId() != null) {
            necesidad = necesidades.findById(req.necesidadId())
                    .filter(n -> n.negocioId.equals(yo.id))
                    .orElseThrow(() -> ApiException.noEncontrado("No encontramos ese pedido."));
            if (!necesidad.productoId.equals(c.productoId)) {
                throw ApiException.invalido("Ese pedido es de otro producto.");
            }
            if (necesidad.estado != Necesidad.Estado.ACTIVA) {
                throw ApiException.conflicto("Ese pedido ya está en una compra o fue cerrado.");
            }
        }
        int nuevoTotal = vistas.total(c.id) + req.cantidad();
        ReglasCompra.Resumen r = ReglasCompra.resumen(vistas.tramosDe(producto.id), nuevoTotal, producto.minimo);

        Participacion p = new Participacion();
        p.compraId = c.id;
        p.negocioId = yo.id;
        p.necesidadId = necesidad == null ? null : necesidad.id;
        p.cantidad = req.cantidad();
        p.estado = Participacion.Estado.ACTIVA;
        p.precioEstimado = r.precioActual();
        p.precioAceptado = false;
        p.recibido = false;
        p.creadaEn = reloj.ahora();
        participaciones.save(p);
        if (necesidad != null) {
            necesidad.estado = Necesidad.Estado.EN_COMPRA;
            necesidades.save(necesidad);
        }
        notificaciones.avisarNegocio(yo.id, "COMPRA", "Te uniste a la compra de " + producto.nombre.toLowerCase()
                + " con " + req.cantidad() + " " + producto.unidad + ". Cierra el " + fecha(c.fechaCierre) + ".", "/compras/" + c.id);
        notificaciones.avisarParticipantes(c.id, yo.id, "COMPRA",
                "Una bodega de tu zona se unió a la compra de " + producto.nombre.toLowerCase() + ".");
        refrescar(c);
        return vistas.compra(c, yo, null, null, true);
    }

    @Transactional
    public Dto.CompraVista retirarse(Long id, Negocio yo) {
        CompraConjunta c = refrescar(cargar(id));
        Participacion p = participaciones.findFirstByCompraIdAndNegocioIdAndEstado(c.id, yo.id, Participacion.Estado.ACTIVA)
                .orElseThrow(() -> ApiException.conflicto("No participas en esta compra."));
        if (!c.estado.pendiente()) {
            throw ApiException.conflicto("La compra ya fue confirmada; si tienes un problema, repórtalo como incidencia.");
        }
        p.estado = Participacion.Estado.RETIRADA;
        participaciones.save(p);
        if (p.necesidadId != null) {
            necesidades.findById(p.necesidadId).ifPresent(n -> {
                n.estado = Necesidad.Estado.ACTIVA;
                necesidades.save(n);
            });
        }
        Producto producto = productos.findById(c.productoId).orElseThrow();
        notificaciones.avisarNegocio(yo.id, "COMPRA", "Te retiraste de la compra de " + producto.nombre.toLowerCase()
                + ". Tu pedido sigue guardado.", "/compras/" + c.id);
        notificaciones.avisarParticipantes(c.id, yo.id, "COMPRA", "Una bodega se retiró de la compra de "
                + producto.nombre.toLowerCase() + ". Se recalcularon la cantidad, el tramo y el ahorro.");
        refrescar(c);
        confirmarSiTodosAceptaron(c);
        return vistas.compra(c, yo, null, null, true);
    }

    @Transactional
    public Dto.CompraVista aceptarPrecio(Long id, Negocio yo) {
        CompraConjunta c = cargar(id);
        if (c.estado != Estado.PRECIO_POR_ACEPTAR) {
            throw ApiException.conflicto("No hay un precio final pendiente de aceptar.");
        }
        Participacion p = participaciones.findFirstByCompraIdAndNegocioIdAndEstado(c.id, yo.id, Participacion.Estado.ACTIVA)
                .orElseThrow(() -> ApiException.conflicto("No participas en esta compra."));
        p.precioAceptado = true;
        participaciones.save(p);
        confirmarSiTodosAceptaron(c);
        return vistas.compra(c, yo, null, null, true);
    }

    /** Si todos los participantes aceptaron el precio final, la compra queda confirmada. */
    @Transactional
    public void confirmarSiTodosAceptaron(CompraConjunta c) {
        if (c.estado != Estado.PRECIO_POR_ACEPTAR) {
            return;
        }
        List<Participacion> activas = participaciones.findByCompraIdAndEstado(c.id, Participacion.Estado.ACTIVA);
        if (!activas.isEmpty() && activas.stream().allMatch(x -> x.precioAceptado)) {
            confirmar(c);
        }
    }

    /** Pasa la compra a Confirmada y avisa. Lo usan la aceptación y la confirmación simulada del proveedor. */
    @Transactional
    public void confirmar(CompraConjunta c) {
        Producto producto = productos.findById(c.productoId).orElseThrow();
        c.estado = Estado.CONFIRMADA;
        c.estadoDesde = reloj.ahora();
        c.entregaEstado = CompraConjunta.EntregaEstado.EN_PREPARACION;
        compras.save(c);
        notificaciones.avisarParticipantes(c.id, null, "COMPRA", "¡Compra de " + producto.nombre.toLowerCase()
                + " confirmada! Precio final S/ " + c.precioFinal + ". Llega " + entregaTexto(c) + ".");
    }

    public static String entregaTexto(CompraConjunta c) {
        if (c.entregaDesde == null || c.entregaDesde.equals(c.entregaHasta)) {
            return "el " + fecha(c.entregaHasta);
        }
        return "entre el " + fecha(c.entregaDesde) + " y el " + fecha(c.entregaHasta);
    }

    @Transactional
    public Dto.CompraVista confirmarRecepcion(Long id, Negocio yo) {
        CompraConjunta c = cargar(id);
        if (c.estado != Estado.CONFIRMADA || c.entregaEstado == CompraConjunta.EntregaEstado.EN_PREPARACION) {
            throw ApiException.conflicto("Podrás confirmar la recepción cuando el pedido esté en camino o entregado.");
        }
        Participacion p = participaciones.findFirstByCompraIdAndNegocioIdAndEstado(c.id, yo.id, Participacion.Estado.ACTIVA)
                .orElseThrow(() -> ApiException.conflicto("No participas en esta compra."));
        p.recibido = true;
        participaciones.save(p);
        if (p.necesidadId != null) {
            necesidades.findById(p.necesidadId).ifPresent(n -> {
                n.estado = Necesidad.Estado.ATENDIDA;
                necesidades.save(n);
            });
        }
        notificaciones.avisarNegocio(yo.id, "ENTREGA", "Registramos que recibiste tu pedido. ¡Gracias por confirmar!", "/compras/" + c.id);
        return vistas.compra(c, yo, null, null, true);
    }

    @Transactional
    public Dto.IncidenciaVista reportarIncidencia(Long id, Negocio yo, Dto.IncidenciaRequest req) {
        CompraConjunta c = cargar(id);
        if (c.estado != Estado.CONFIRMADA) {
            throw ApiException.conflicto("Solo puedes reportar incidencias de compras confirmadas.");
        }
        participaciones.findFirstByCompraIdAndNegocioIdAndEstado(c.id, yo.id, Participacion.Estado.ACTIVA)
                .orElseThrow(() -> ApiException.conflicto("No participas en esta compra."));
        Incidencia.Motivo motivo;
        try {
            motivo = Incidencia.Motivo.valueOf(req.motivo());
        } catch (IllegalArgumentException e) {
            throw ApiException.invalido("Elige un motivo de la lista.");
        }
        Incidencia i = new Incidencia();
        i.compraId = c.id;
        i.negocioId = yo.id;
        i.motivo = motivo;
        i.descripcion = req.descripcion().trim();
        i.estado = Incidencia.Estado.ABIERTA;
        i.creadaEn = reloj.ahora();
        incidencias.save(i);
        notificaciones.avisarNegocio(yo.id, "INCIDENCIA",
                "Registramos tu incidencia. El proveedor y el administrador ya fueron avisados.", "/compras/" + c.id);
        return vistas.incidencia(i);
    }

    @Transactional(readOnly = true)
    public List<Dto.IncidenciaVista> misIncidencias(Negocio yo) {
        return incidencias.findByNegocioIdOrderByCreadaEnDesc(yo.id).stream().map(vistas::incidencia).toList();
    }

    /** Compras abiertas de la zona para un producto (las usa la búsqueda de coincidencias). */
    @Transactional
    public List<CompraConjunta> abiertas(String zonaId, Long productoId) {
        List<CompraConjunta> lista = new ArrayList<>();
        for (CompraConjunta c : compras.findByZonaIdAndProductoId(zonaId, productoId)) {
            refrescar(c);
            if (c.estado.permiteUnirse() && !c.fechaCierre.isBefore(reloj.hoy())) {
                lista.add(c);
            }
        }
        lista.sort(Comparator.comparing(c -> c.fechaCierre));
        return lista;
    }

    boolean participa(Long compraId, Long negocioId) {
        return participaciones.findByCompraIdAndEstado(compraId, Participacion.Estado.ACTIVA).stream()
                .anyMatch(p -> Objects.equals(p.negocioId, negocioId));
    }
}
