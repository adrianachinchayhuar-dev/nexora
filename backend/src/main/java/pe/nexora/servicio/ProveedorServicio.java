package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Aviso;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.Incidencia;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Producto;
import pe.nexora.dominio.Proveedor;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.reglas.ReglasCompra.Estado;
import pe.nexora.repositorio.AvisoRepositorio;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.IncidenciaRepositorio;
import pe.nexora.repositorio.NecesidadRepositorio;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.web.Dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Perfil proveedor (versión mínima para la sustentación): ve solo sus compras conjuntas, confirma stock,
 * precio final y entrega, avanza la entrega, publica avisos y responde incidencias.
 * Privacidad: los nombres de los negocios solo se muestran cuando la compra ya está confirmada.
 */
@Service
public class ProveedorServicio {
    private final ProveedorRepositorio proveedores;
    private final CompraConjuntaRepositorio compras;
    private final ProductoRepositorio productos;
    private final ParticipacionRepositorio participaciones;
    private final NecesidadRepositorio necesidades;
    private final NegocioRepositorio negocios;
    private final AvisoRepositorio avisos;
    private final IncidenciaRepositorio incidencias;
    private final CompraServicio compraServicio;
    private final NotificacionServicio notificaciones;
    private final Vistas vistas;
    private final Reloj reloj;

    public ProveedorServicio(ProveedorRepositorio proveedores, CompraConjuntaRepositorio compras,
                             ProductoRepositorio productos, ParticipacionRepositorio participaciones,
                             NecesidadRepositorio necesidades, NegocioRepositorio negocios, AvisoRepositorio avisos,
                             IncidenciaRepositorio incidencias, CompraServicio compraServicio,
                             NotificacionServicio notificaciones, Vistas vistas, Reloj reloj) {
        this.proveedores = proveedores;
        this.compras = compras;
        this.productos = productos;
        this.participaciones = participaciones;
        this.necesidades = necesidades;
        this.negocios = negocios;
        this.avisos = avisos;
        this.incidencias = incidencias;
        this.compraServicio = compraServicio;
        this.notificaciones = notificaciones;
        this.vistas = vistas;
        this.reloj = reloj;
    }

    // ---------- Consultas ----------

    @Transactional
    public Dto.PanelProveedorVista panel(Proveedor yo) {
        List<Dto.CompraProveedorVista> lista = new ArrayList<>();
        for (CompraConjunta c : compras.findByProveedorIdOrderByFechaCierreAsc(yo.id)) {
            lista.add(vista(compraServicio.refrescar(c)));
        }
        // Primero lo que necesita acción del proveedor.
        lista.sort((a, b) -> Integer.compare(orden(a), orden(b)));
        int porConfirmar = (int) lista.stream().filter(Dto.CompraProveedorVista::puedeConfirmar).count();
        int enCurso = (int) lista.stream().filter(Dto.CompraProveedorVista::puedeAvanzarEntrega).count();
        int abiertas = (int) lista.stream().flatMap(c -> c.incidencias().stream())
                .filter(i -> !Incidencia.Estado.RESUELTA.name().equals(i.estado())).count();
        Proveedor p = proveedores.findById(yo.id).orElseThrow();
        return new Dto.PanelProveedorVista(p.razonSocial, p.ruc,
                ReglasCompra.puntualidad(p.entregasATiempo, p.entregasTotal), p.entregasATiempo, p.entregasTotal,
                porConfirmar, enCurso, abiertas, lista);
    }

    private static int orden(Dto.CompraProveedorVista c) {
        if (c.puedeConfirmar()) {
            return 0;
        }
        if (c.incidencias().stream().anyMatch(i -> !"RESUELTA".equals(i.estado()))) {
            return 1;
        }
        if (c.puedeAvanzarEntrega()) {
            return 2;
        }
        if ("REUNIENDO".equals(c.estadoVisible().clave())) {
            return 3;
        }
        if ("ESPERANDO_PROVEEDOR".equals(c.estadoVisible().clave())) {
            return 4;
        }
        return 5;
    }

    private Dto.CompraProveedorVista vista(CompraConjunta c) {
        Producto p = productos.findById(c.productoId).orElseThrow();
        List<Participacion> activas = participaciones.findByCompraIdAndEstado(c.id, Participacion.Estado.ACTIVA);
        int total = activas.stream().mapToInt(x -> x.cantidad).sum();
        int numNegocios = (int) activas.stream().map(x -> x.negocioId).distinct().count();
        int aceptaron = (int) activas.stream().filter(x -> x.precioAceptado).count();
        List<ReglasCompra.Tramo> tramos = vistas.tramosDe(p.id);
        BigDecimal precioActual = ReglasCompra.resumen(tramos, total, p.minimo).precioActual();
        boolean confirmada = c.estado == Estado.CONFIRMADA;

        List<Dto.ParticipanteVista> participantes = new ArrayList<>();
        if (confirmada) {
            for (Participacion x : activas) {
                Negocio n = negocios.findById(x.negocioId).orElse(null);
                if (n != null) {
                    participantes.add(new Dto.ParticipanteVista(n.nombre, n.direccion, n.celular, x.cantidad, x.recibido));
                }
            }
        }
        List<Dto.IncidenciaProveedorVista> listaIncidencias = incidencias.findByCompraIdOrderByCreadaEnDesc(c.id).stream()
                .map(i -> new Dto.IncidenciaProveedorVista(i.id,
                        negocios.findById(i.negocioId).map(n -> n.nombre).orElse("Un negocio"),
                        i.motivo.name(), i.descripcion, i.estado.name(), i.respuesta, i.creadaEn))
                .toList();
        List<Dto.AvisoVista> listaAvisos = avisos.findByCompraIdOrderByCreadoEnDesc(c.id).stream()
                .map(a -> new Dto.AvisoVista(a.texto, a.creadoEn)).toList();

        boolean puedeConfirmar = c.estado == Estado.EN_COTIZACION;
        boolean puedeAvanzar = confirmada && c.entregaEstado != CompraConjunta.EntregaEstado.ENTREGADA;
        return new Dto.CompraProveedorVista(c.id, p.nombre, p.presentacion, p.unidad, p.imagen, vistas.zona(c.zonaId),
                c.estado.name(), vistas.estadoVisible(c.estado), tuTurno(c, total, p.minimo), c.fechaCierre,
                c.entregaDesde, c.entregaHasta, total, p.minimo, numNegocios, precioActual, vistas.tramosVista(tramos),
                c.precioFinal, c.costoTransporte, c.compensacion,
                c.entregaEstado == null ? null : c.entregaEstado.name(), puedeConfirmar, puedeAvanzar, aceptaron,
                participantes, listaAvisos, listaIncidencias);
    }

    /** Qué le toca hacer al proveedor, en palabras simples. */
    private static String tuTurno(CompraConjunta c, int total, int minimo) {
        if (c.estado == Estado.EN_COTIZACION) {
            return "Se alcanzó el mínimo. Confirma stock, precio final y fecha de entrega.";
        }
        if (c.estado == Estado.PRECIO_POR_ACEPTAR) {
            return "Algunos negocios están revisando tu precio o fecha final.";
        }
        if (c.estado == Estado.BUSCANDO_PARTICIPANTES || c.estado == Estado.PROPUESTA) {
            return "Reuniendo negocios: faltan " + Math.max(0, minimo - total) + " para el mínimo.";
        }
        if (c.estado == Estado.CONFIRMADA) {
            if (c.entregaEstado == CompraConjunta.EntregaEstado.ENTREGADA) {
                return "Entrega registrada. Los negocios confirman la recepción.";
            }
            return "Compra confirmada. Actualiza el avance de la entrega.";
        }
        return "Esta compra no se concretó.";
    }

    // ---------- Acciones ----------

    /** Devuelve la compra solo si pertenece al proveedor que la pide. */
    @Transactional
    public CompraConjunta propia(Proveedor yo, Long compraId) {
        CompraConjunta c = compraServicio.cargar(compraId);
        if (!c.proveedorId.equals(yo.id)) {
            throw ApiException.noEncontrado("No encontramos esa compra entre las tuyas.");
        }
        return c;
    }

    /**
     * El proveedor confirma stock, precio final y entrega (decisión D3).
     * Cada negocio acepta solo si el precio no sube y la entrega le sigue llegando a tiempo; si no, debe decidir.
     */
    @Transactional
    public void confirmar(Proveedor yo, Long compraId, Dto.ConfirmarRequest req) {
        CompraConjunta c = compraServicio.refrescar(propia(yo, compraId));
        if (c.estado != Estado.EN_COTIZACION) {
            throw ApiException.conflicto("Solo se confirma una compra que ya alcanzó el mínimo y espera tu respuesta.");
        }
        Producto p = productos.findById(c.productoId).orElseThrow();
        BigDecimal actual = ReglasCompra.resumen(vistas.tramosDe(p.id), vistas.total(c.id), p.minimo).precioActual();
        c.precioFinal = req.precioFinal() != null ? req.precioFinal() : actual;
        if (req.entregaHasta() != null) {
            if (req.entregaHasta().isBefore(reloj.hoy())) {
                throw ApiException.invalido("La fecha de entrega no puede ser pasada.");
            }
            c.entregaHasta = req.entregaHasta();
            c.entregaDesde = req.entregaDesde() != null && !req.entregaDesde().isAfter(req.entregaHasta())
                    ? req.entregaDesde() : req.entregaHasta();
        }
        c.costoTransporte = req.costoTransporte() != null ? req.costoTransporte()
                : c.costoTransporte != null ? c.costoTransporte : BigDecimal.ZERO;
        c.compensacion = req.compensacion() == null || req.compensacion().isBlank() ? c.compensacion : req.compensacion().trim();

        boolean todos = true;
        for (Participacion part : participaciones.findByCompraIdAndEstado(c.id, Participacion.Estado.ACTIVA)) {
            LocalDate requerida = part.necesidadId == null ? null
                    : necesidades.findById(part.necesidadId).map(n -> n.fechaRequerida).orElse(null);
            boolean acepta = ReglasCompra.aceptaSolo(c.precioFinal, part.precioEstimado)
                    && ReglasCompra.llegaATiempo(c.entregaHasta, requerida);
            // Las bodegas de prueba no tienen cuenta: aceptan siempre para no bloquear la demostración.
            boolean dePrueba = negocios.findById(part.negocioId).map(n -> n.usuarioId == null).orElse(true);
            part.precioAceptado = acepta || dePrueba;
            participaciones.save(part);
            if (!part.precioAceptado) {
                todos = false;
                notificaciones.avisarNegocio(part.negocioId, "PRECIO", "El proveedor confirmó la compra de "
                        + p.nombre.toLowerCase() + " a S/ " + c.precioFinal + ", llega " + CompraServicio.entregaTexto(c)
                        + ". Revisa si continúas o te retiras.", "/compras/" + c.id);
            }
        }
        if (todos) {
            compraServicio.confirmar(c);
        } else {
            c.estado = Estado.PRECIO_POR_ACEPTAR;
            c.estadoDesde = reloj.ahora();
            compras.save(c);
        }
        aviso(c, "Confirmamos stock y precio final de S/ " + c.precioFinal + ". Entrega " + CompraServicio.entregaTexto(c) + ".");
    }

    /** Avanza la entrega: EN_PREPARACION, EN_CAMINO, ENTREGADA o RETRASADA. */
    @Transactional
    public void entrega(Proveedor yo, Long compraId, String estadoTexto) {
        CompraConjunta c = propia(yo, compraId);
        if (c.estado != Estado.CONFIRMADA) {
            throw ApiException.conflicto("La entrega solo avanza en compras confirmadas.");
        }
        CompraConjunta.EntregaEstado estado;
        try {
            estado = CompraConjunta.EntregaEstado.valueOf(estadoTexto);
        } catch (IllegalArgumentException e) {
            throw ApiException.invalido("Estado de entrega no válido.");
        }
        if (c.entregaEstado == CompraConjunta.EntregaEstado.ENTREGADA) {
            throw ApiException.conflicto("La entrega ya fue registrada.");
        }
        Producto p = productos.findById(c.productoId).orElseThrow();
        if (estado == CompraConjunta.EntregaEstado.ENTREGADA) {
            Proveedor prov = proveedores.findById(c.proveedorId).orElseThrow();
            prov.entregasTotal++;
            if (!reloj.hoy().isAfter(c.entregaHasta) && c.entregaEstado != CompraConjunta.EntregaEstado.RETRASADA) {
                prov.entregasATiempo++;
            }
            proveedores.save(prov);
        }
        c.entregaEstado = estado;
        compras.save(c);
        String producto = p.nombre.toLowerCase();
        String texto;
        if (estado == CompraConjunta.EntregaEstado.EN_PREPARACION) {
            texto = "El proveedor está preparando tu pedido de " + producto + ".";
        } else if (estado == CompraConjunta.EntregaEstado.EN_CAMINO) {
            texto = "Tu pedido de " + producto + " está en camino. Confirma cuando lo recibas.";
        } else if (estado == CompraConjunta.EntregaEstado.ENTREGADA) {
            texto = "El proveedor registró la entrega de " + producto + ". ¿Lo recibiste? Confírmalo.";
        } else {
            texto = "La entrega de " + producto + " está retrasada."
                    + (c.compensacion == null ? "" : " Compromiso del proveedor: " + c.compensacion + ".");
        }
        notificaciones.avisarParticipantes(c.id, null, "ENTREGA", texto);
    }

    @Transactional
    public void publicarAviso(Proveedor yo, Long compraId, String texto) {
        CompraConjunta c = propia(yo, compraId);
        if (!c.estado.pendiente() && c.estado != Estado.CONFIRMADA) {
            throw ApiException.conflicto("Esta compra ya no recibe avisos.");
        }
        aviso(c, texto.trim());
        notificaciones.avisarParticipantes(c.id, null, "AVISO", "Aviso del proveedor: " + texto.trim());
    }

    @Transactional
    public void responderIncidencia(Proveedor yo, Long incidenciaId, Dto.RespuestaIncidenciaRequest req) {
        Incidencia i = incidencias.findById(incidenciaId)
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos esa incidencia."));
        CompraConjunta c = propia(yo, i.compraId);
        Incidencia.Estado estado;
        try {
            estado = Incidencia.Estado.valueOf(req.estado());
        } catch (IllegalArgumentException e) {
            throw ApiException.invalido("Estado de incidencia no válido.");
        }
        i.respuesta = req.respuesta().trim();
        i.estado = estado;
        incidencias.save(i);
        String producto = productos.findById(c.productoId).map(p -> p.nombre.toLowerCase()).orElse("tu pedido");
        notificaciones.avisarNegocio(i.negocioId, "INCIDENCIA", "El proveedor respondió tu incidencia de " + producto
                + (estado == Incidencia.Estado.RESUELTA ? " y la marcó como resuelta." : ": la está revisando."),
                "/compras/" + c.id);
    }

    private void aviso(CompraConjunta c, String texto) {
        Aviso a = new Aviso();
        a.compraId = c.id;
        a.texto = texto;
        a.creadoEn = reloj.ahora();
        avisos.save(a);
    }
}
