package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Participacion;

import java.util.List;
import java.util.Optional;

public interface ParticipacionRepositorio extends JpaRepository<Participacion, Long> {
    List<Participacion> findByCompraIdAndEstado(Long compraId, Participacion.Estado estado);

    List<Participacion> findByNegocioIdOrderByCreadaEnDesc(Long negocioId);

    Optional<Participacion> findFirstByCompraIdAndNegocioIdAndEstado(Long compraId, Long negocioId, Participacion.Estado estado);
}
