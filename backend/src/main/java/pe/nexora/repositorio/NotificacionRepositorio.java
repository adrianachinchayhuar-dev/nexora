package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Notificacion;

import java.util.List;

public interface NotificacionRepositorio extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findTop30ByUsuarioIdOrderByCreadaEnDesc(Long usuarioId);

    long countByUsuarioIdAndLeidaFalse(Long usuarioId);

    List<Notificacion> findByUsuarioIdAndLeidaFalse(Long usuarioId);
}
