package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Aviso;

import java.util.List;

public interface AvisoRepositorio extends JpaRepository<Aviso, Long> {
    List<Aviso> findByCompraIdOrderByCreadoEnDesc(Long compraId);
}
