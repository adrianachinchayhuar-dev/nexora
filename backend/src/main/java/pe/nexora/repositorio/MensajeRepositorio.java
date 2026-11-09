package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Mensaje;

import java.util.List;


public interface MensajeRepositorio extends JpaRepository<Mensaje, Long> {
    List<Mensaje> findByCompraIdAndNegocioIdOrderByCreadoEnAsc(Long compraId, Long negocioId);

    List<Mensaje> findByNegocioIdOrderByCreadoEnDesc(Long negocioId);

    List<Mensaje> findByCompraIdInOrderByCreadoEnDesc(List<Long> compraIds);

    List<Mensaje> findByCompraIdOrderByCreadoEnAsc(Long compraId);
}
