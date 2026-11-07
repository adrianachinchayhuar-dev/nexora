package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Notificacion;
import pe.nexora.dominio.Participacion;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.NotificacionRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.web.Dto;

import java.util.Objects;

@Service
public class NotificacionServicio {
    private final NotificacionRepositorio notificaciones;
    private final NegocioRepositorio negocios;
    private final ParticipacionRepositorio participaciones;
    private final Reloj reloj;

    public NotificacionServicio(NotificacionRepositorio notificaciones, NegocioRepositorio negocios,
                                ParticipacionRepositorio participaciones, Reloj reloj) {
        this.notificaciones = notificaciones;
        this.negocios = negocios;
        this.participaciones = participaciones;
        this.reloj = reloj;
    }

    /** Avisa a un usuario. Las bodegas simuladas (sin cuenta) se ignoran. */
    public void avisar(Long usuarioId, String tipo, String texto, String enlace) {
        if (usuarioId == null) {
            return;
        }
        Notificacion n = new Notificacion();
        n.usuarioId = usuarioId;
        n.tipo = tipo;
        n.texto = texto;
        n.enlace = enlace;
        n.leida = false;
        n.creadaEn = reloj.ahora();
        notificaciones.save(n);
    }

    public void avisarNegocio(Long negocioId, String tipo, String texto, String enlace) {
        negocios.findById(negocioId).map((Negocio n) -> n.usuarioId).ifPresent(u -> avisar(u, tipo, texto, enlace));
    }

    /** Avisa a todos los negocios con cuenta que participan en la compra, salvo al indicado. */
    public void avisarParticipantes(Long compraId, Long excepto, String tipo, String texto) {
        participaciones.findByCompraIdAndEstado(compraId, Participacion.Estado.ACTIVA).stream()
                .map(p -> p.negocioId).distinct()
                .filter(id -> !Objects.equals(id, excepto))
                .forEach(id -> avisarNegocio(id, tipo, texto, "/compras/" + compraId));
    }

    @Transactional(readOnly = true)
    public Dto.NotificacionesVista listar(Long usuarioId) {
        var lista = notificaciones.findTop30ByUsuarioIdOrderByCreadaEnDesc(usuarioId).stream()
                .map(n -> new Dto.NotificacionVista(n.id, n.tipo, n.texto, n.enlace, n.leida, n.creadaEn)).toList();
        return new Dto.NotificacionesVista(notificaciones.countByUsuarioIdAndLeidaFalse(usuarioId), lista);
    }

    @Transactional
    public void leer(Long usuarioId, Long id) {
        Notificacion n = notificaciones.findById(id)
                .filter(x -> x.usuarioId.equals(usuarioId))
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos esa notificación."));
        n.leida = true;
        notificaciones.save(n);
    }

    @Transactional
    public void leerTodas(Long usuarioId) {
        var pendientes = notificaciones.findByUsuarioIdAndLeidaFalse(usuarioId);
        pendientes.forEach(n -> n.leida = true);
        notificaciones.saveAll(pendientes);
    }

    public long sinLeer(Long usuarioId) {
        return notificaciones.countByUsuarioIdAndLeidaFalse(usuarioId);
    }
}
