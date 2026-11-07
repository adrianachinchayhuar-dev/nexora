package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Necesidad;

import java.util.List;

public interface NecesidadRepositorio extends JpaRepository<Necesidad, Long> {
    List<Necesidad> findByNegocioIdOrderByCreadaEnDesc(Long negocioId);

    List<Necesidad> findByNegocioIdAndProductoIdAndEstado(Long negocioId, Long productoId, Necesidad.Estado estado);
}
