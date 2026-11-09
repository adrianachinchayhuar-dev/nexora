package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.CompraOculta;

import java.util.List;
import java.util.Optional;

public interface CompraOcultaRepositorio extends JpaRepository<CompraOculta, Long> {
    List<CompraOculta> findByNegocioId(Long negocioId);

    Optional<CompraOculta> findByNegocioIdAndCompraId(Long negocioId, Long compraId);
}
