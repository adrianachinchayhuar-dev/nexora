package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.CompraOculta;
import pe.nexora.dominio.Mensaje;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Pregunta;
import pe.nexora.dominio.Producto;
import pe.nexora.dominio.Proveedor;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.reglas.ReglasMensajeria;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.CompraOcultaRepositorio;
import pe.nexora.repositorio.MensajeRepositorio;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.PreguntaRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.web.Dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Comunicación vinculada a cada compra conjunta: preguntas públicas y anónimas, chat privado entre cada
 * negocio y el proveedor, y la opción «No me interesa». Los mensajes se consultan periódicamente desde la
 * aplicación (no se usa WebSocket en el MVP).
 */
@Service
public class MensajeriaServicio {
    private final CompraConjuntaRepositorio compras;
    private final ParticipacionRepositorio participaciones;
    private final PreguntaRepositorio preguntas;
    private final MensajeRepositorio mensajes;
    private final CompraOcultaRepositorio ocultas;
    private final NegocioRepositorio negocios;
    private final ProductoRepositorio productos;
    private final ProveedorRepositorio proveedores;
    private final NotificacionServicio notificaciones;
    private final Reloj reloj;

    public MensajeriaServicio(CompraConjuntaRepositorio compras, ParticipacionRepositorio participaciones,
                              PreguntaRepositorio preguntas, MensajeRepositorio mensajes, CompraOcultaRepositorio ocultas,
                              NegocioRepositorio negocios, ProductoRepositorio productos, ProveedorRepositorio proveedores,
                              NotificacionServicio notificaciones, Reloj reloj) {
        this.compras = compras;
        this.participaciones = participaciones;
        this.preguntas = preguntas;
        this.mensajes = mensajes;
        this.ocultas = ocultas;
        this.negocios = negocios;
        this.productos = productos;
        this.proveedores = proveedores;
        this.notificaciones = notificaciones;
        this.reloj = reloj;
    }

    // =====================================================================
    // Lado del bodeguero
    // =====================================================================

    /** El negocio solo accede a compras de su zona o a las que participa. */
    private CompraConjunta visible(Long compraId, Negocio yo) {
        CompraConjunta c = compras.findById(compraId)
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos esa compra conjunta."));
        if (!Objects.equals(c.zonaId, yo.zonaId) && !participa(c.id, yo.id)) {
            throw ApiException.noEncontrado("No encontramos esa compra conjunta.");
        }
        return c;
    }

    private boolean participa(Long compraId, Long negocioId) {
        return participaciones.findFirstByCompraIdAndNegocioIdAndEstado(compraId, negocioId, Participacion.Estado.ACTIVA).isPresent();
    }

    private static boolean abierta(CompraConjunta c) {
        return ReglasMensajeria.puedeEscribir(c.estado);
    }

    private String producto(CompraConjunta c) {
        return productos.findById(c.productoId).map(p -> p.nombre).orElse("Producto");
    }

    private String proveedor(CompraConjunta c) {
        return proveedores.findById(c.proveedorId).map(p -> p.razonSocial).orElse("Proveedor");
    }

    @Transactional
    public Dto.MensajesCompraVista deCompra(Long compraId, Negocio yo) {
        CompraConjunta c = visible(compraId, yo);
        List<Dto.PreguntaVista> lista = preguntas.findByCompraIdOrderByCreadaEnDesc(c.id).stream()
                .map(p -> new Dto.PreguntaVista(p.id, p.texto, p.respuesta, Objects.equals(p.negocioId, yo.id), p.creadaEn, p.respondidaEn))
                .toList();
        List<Mensaje> chat = mensajes.findByCompraIdAndNegocioIdOrderByCreadoEnAsc(c.id, yo.id);
        chat.stream().filter(m -> Mensaje.PROVEEDOR.equals(m.autor) && !m.leido).forEach(m -> m.leido = true);
        mensajes.saveAll(chat);
        return new Dto.MensajesCompraVista(c.id, producto(c), proveedor(c), abierta(c), lista,
                chat.stream().map(MensajeriaServicio::chatVista).toList());
    }

    @Transactional
    public Dto.MensajesCompraVista preguntar(Long compraId, Negocio yo, String texto) {
        CompraConjunta c = visible(compraId, yo);
        if (!abierta(c)) {
            throw ApiException.conflicto("Esta compra ya no recibe preguntas.");
        }
        Pregunta p = new Pregunta();
        p.compraId = c.id;
        p.negocioId = yo.id;
        p.texto = texto.trim();
        p.creadaEn = reloj.ahora();
        preguntas.save(p);
        return deCompra(compraId, yo);
    }

    @Transactional
    public Dto.MensajesCompraVista escribir(Long compraId, Negocio yo, String texto) {
        CompraConjunta c = visible(compraId, yo);
        if (!abierta(c)) {
            throw ApiException.conflicto("Esta compra ya no recibe mensajes.");
        }
        guardar(c.id, yo.id, Mensaje.NEGOCIO, texto);
        return deCompra(compraId, yo);
    }

    @Transactional(readOnly = true)
    public Dto.BandejaVista bandeja(Negocio yo) {
        // Compras con chat propio o en las que participa y tienen preguntas.
        Set<Long> ids = new LinkedHashSet<>();
        mensajes.findByNegocioIdOrderByCreadoEnDesc(yo.id).forEach(m -> ids.add(m.compraId));
        preguntas.findByNegocioIdOrderByCreadaEnDesc(yo.id).forEach(p -> ids.add(p.compraId));
        participaciones.findByNegocioIdOrderByCreadaEnDesc(yo.id).stream()
                .filter(p -> p.estado == Participacion.Estado.ACTIVA).forEach(p -> ids.add(p.compraId));
        List<Dto.ConversacionVista> lista = new ArrayList<>();
        int total = 0;
        for (Long id : ids) {
            CompraConjunta c = compras.findById(id).orElse(null);
            if (c == null) {
                continue;
            }
            List<Mensaje> chat = mensajes.findByCompraIdAndNegocioIdOrderByCreadoEnAsc(c.id, yo.id);
            List<Pregunta> pregs = preguntas.findByCompraIdOrderByCreadaEnDesc(c.id);
            if (chat.isEmpty() && pregs.isEmpty()) {
                continue;
            }
            int sinLeer = (int) chat.stream().filter(m -> Mensaje.PROVEEDOR.equals(m.autor) && !m.leido).count();
            total += sinLeer;
            Mensaje ultimo = chat.isEmpty() ? null : chat.get(chat.size() - 1);
            Pregunta ultimaPregunta = pregs.isEmpty() ? null : pregs.get(0);
            String texto;
            String autor;
            LocalDateTime fecha;
            if (ultimo != null && (ultimaPregunta == null || !ultimo.creadoEn.isBefore(momento(ultimaPregunta)))) {
                texto = ultimo.texto;
                autor = ultimo.autor;
                fecha = ultimo.creadoEn;
            } else {
                boolean respondida = ultimaPregunta.respuesta != null;
                texto = respondida ? "Respuesta: " + ultimaPregunta.respuesta : "Pregunta: " + ultimaPregunta.texto;
                autor = respondida ? Mensaje.PROVEEDOR : "PREGUNTA";
                fecha = momento(ultimaPregunta);
            }
            Producto p = productos.findById(c.productoId).orElse(null);
            lista.add(new Dto.ConversacionVista(c.id, p == null ? "Producto" : p.nombre, p == null ? null : p.imagen,
                    proveedor(c), yo.id, texto, autor, fecha, sinLeer, pregs.size(),
                    (int) pregs.stream().filter(x -> x.respuesta == null).count()));
        }
        lista.sort(Comparator.comparing(Dto.ConversacionVista::fecha).reversed());
        return new Dto.BandejaVista(total, lista);
    }

    private static LocalDateTime momento(Pregunta p) {
        return p.respondidaEn != null ? p.respondidaEn : p.creadaEn;
    }

    // ---------- «No me interesa» ----------

    @Transactional
    public void ocultar(Long compraId, Negocio yo) {
        visible(compraId, yo);
        if (ocultas.findByNegocioIdAndCompraId(yo.id, compraId).isEmpty()) {
            CompraOculta o = new CompraOculta();
            o.negocioId = yo.id;
            o.compraId = compraId;
            ocultas.save(o);
        }
    }

    @Transactional
    public void mostrar(Long compraId, Negocio yo) {
        ocultas.findByNegocioIdAndCompraId(yo.id, compraId).ifPresent(o -> ocultas.deleteById(o.id));
    }

    @Transactional(readOnly = true)
    public List<Long> ocultas(Negocio yo) {
        return ocultas.findByNegocioId(yo.id).stream().map(o -> o.compraId).toList();
    }

    // =====================================================================
    // Lado del proveedor
    // =====================================================================

    private CompraConjunta propia(Proveedor yo, Long compraId) {
        CompraConjunta c = compras.findById(compraId)
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos esa compra."));
        if (!Objects.equals(c.proveedorId, yo.id)) {
            throw ApiException.noEncontrado("No encontramos esa compra entre las tuyas.");
        }
        return c;
    }

    /**
     * Cómo ve el proveedor a un negocio: por privacidad, con su nombre solo si la compra está confirmada y el
     * negocio participa; antes, como «Bodega 1», «Bodega 2»… según el orden en que escribieron.
     */
    private Map<Long, String> nombres(CompraConjunta c) {
        List<Long> autores = mensajes.findByCompraIdOrderByCreadoEnAsc(c.id).stream().map(m -> m.negocioId).toList();
        return ReglasMensajeria.nombresParaProveedor(autores, c.estado == ReglasCompra.Estado.CONFIRMADA,
                negocioId -> participa(c.id, negocioId),
                negocioId -> negocios.findById(negocioId).map(x -> x.nombre).orElse(null));
    }

    @Transactional(readOnly = true)
    public Dto.BandejaProveedorVista bandejaProveedor(Proveedor yo) {
        List<CompraConjunta> mias = compras.findByProveedorIdOrderByFechaCierreAsc(yo.id);
        List<Dto.ConversacionVista> conversaciones = new ArrayList<>();
        List<Dto.PreguntaProveedorVista> pregs = new ArrayList<>();
        int sinLeer = 0;
        int pendientes = 0;
        for (CompraConjunta c : mias) {
            Producto p = productos.findById(c.productoId).orElse(null);
            String nombreProducto = p == null ? "Producto" : p.nombre;
            Map<Long, String> alias = nombres(c);
            for (Map.Entry<Long, String> e : alias.entrySet()) {
                List<Mensaje> chat = mensajes.findByCompraIdAndNegocioIdOrderByCreadoEnAsc(c.id, e.getKey());
                Mensaje ultimo = chat.get(chat.size() - 1);
                int noLeidos = (int) chat.stream().filter(m -> Mensaje.NEGOCIO.equals(m.autor) && !m.leido).count();
                sinLeer += noLeidos;
                conversaciones.add(new Dto.ConversacionVista(c.id, nombreProducto, p == null ? null : p.imagen, e.getValue(),
                        e.getKey(), ultimo.texto, ultimo.autor, ultimo.creadoEn, noLeidos, 0, 0));
            }
            for (Pregunta q : preguntas.findByCompraIdOrderByCreadaEnDesc(c.id)) {
                if (q.respuesta == null) {
                    pendientes++;
                }
                pregs.add(new Dto.PreguntaProveedorVista(q.id, c.id, nombreProducto, q.texto, q.respuesta, q.creadaEn));
            }
        }
        conversaciones.sort(Comparator.comparing(Dto.ConversacionVista::fecha).reversed());
        pregs.sort(Comparator.comparing((Dto.PreguntaProveedorVista q) -> q.respuesta() != null)
                .thenComparing(Dto.PreguntaProveedorVista::creadaEn, Comparator.reverseOrder()));
        return new Dto.BandejaProveedorVista(sinLeer, pendientes, conversaciones, pregs);
    }

    @Transactional
    public Dto.ChatProveedorVista chatProveedor(Proveedor yo, Long compraId, Long negocioId) {
        CompraConjunta c = propia(yo, compraId);
        String nombre = nombres(c).get(negocioId);
        if (nombre == null) {
            throw ApiException.noEncontrado("Ese negocio no te ha escrito en esta compra.");
        }
        List<Mensaje> chat = mensajes.findByCompraIdAndNegocioIdOrderByCreadoEnAsc(c.id, negocioId);
        chat.stream().filter(m -> Mensaje.NEGOCIO.equals(m.autor) && !m.leido).forEach(m -> m.leido = true);
        mensajes.saveAll(chat);
        return new Dto.ChatProveedorVista(c.id, negocioId, producto(c), nombre,
                chat.stream().map(MensajeriaServicio::chatVista).toList());
    }

    @Transactional
    public Dto.ChatProveedorVista responderChat(Proveedor yo, Long compraId, Long negocioId, String texto) {
        CompraConjunta c = propia(yo, compraId);
        if (!nombres(c).containsKey(negocioId)) {
            throw ApiException.noEncontrado("Ese negocio no te ha escrito en esta compra.");
        }
        guardar(c.id, negocioId, Mensaje.PROVEEDOR, texto);
        notificaciones.avisarNegocio(negocioId, "MENSAJE", proveedor(c) + " te escribió sobre la compra de "
                + producto(c).toLowerCase() + ".", "/compras/" + c.id + "?ver=mensajes");
        return chatProveedor(yo, compraId, negocioId);
    }

    @Transactional
    public void responderPregunta(Proveedor yo, Long preguntaId, String respuesta) {
        Pregunta q = preguntas.findById(preguntaId)
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos esa pregunta."));
        CompraConjunta c = propia(yo, q.compraId);
        boolean nueva = q.respuesta == null;
        q.respuesta = respuesta.trim();
        q.respondidaEn = reloj.ahora();
        preguntas.save(q);
        String texto = "El proveedor " + (nueva ? "respondió" : "actualizó la respuesta a") + " una pregunta sobre la compra de "
                + producto(c).toLowerCase() + ".";
        notificaciones.avisarParticipantes(c.id, q.negocioId, "PREGUNTA", texto);
        notificaciones.avisarNegocio(q.negocioId, "PREGUNTA", "El proveedor respondió tu pregunta sobre la compra de "
                + producto(c).toLowerCase() + ".", "/compras/" + c.id + "?ver=mensajes");
    }

    // ---------- comunes ----------

    private void guardar(Long compraId, Long negocioId, String autor, String texto) {
        Mensaje m = new Mensaje();
        m.compraId = compraId;
        m.negocioId = negocioId;
        m.autor = autor;
        m.texto = texto.trim();
        m.leido = false;
        m.creadoEn = reloj.ahora();
        mensajes.save(m);
    }

    private static Dto.ChatMensaje chatVista(Mensaje m) {
        return new Dto.ChatMensaje(m.id, m.autor, m.texto, m.creadoEn);
    }
}
