package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Pregunta;

import java.util.List;


public interface PreguntaRepositorio extends JpaRepository<Pregunta, Long> {
    List<Pregunta> findByCompraIdOrderByCreadaEnDesc(Long compraId);

    List<Pregunta> findByCompraIdInOrderByCreadaEnDesc(List<Long> compraIds);

    List<Pregunta> findByNegocioIdOrderByCreadaEnDesc(Long negocioId);
}
