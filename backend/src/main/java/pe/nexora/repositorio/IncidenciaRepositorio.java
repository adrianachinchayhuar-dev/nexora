package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Incidencia;

import java.util.List;

public interface IncidenciaRepositorio extends JpaRepository<Incidencia, Long> {
    List<Incidencia> findByNegocioIdOrderByCreadaEnDesc(Long negocioId);

    List<Incidencia> findByCompraIdAndNegocioIdOrderByCreadaEnDesc(Long compraId, Long negocioId);

    List<Incidencia> findByCompraIdOrderByCreadaEnDesc(Long compraId);
}
