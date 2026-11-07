package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.CompraConjunta;

import java.util.List;

public interface CompraConjuntaRepositorio extends JpaRepository<CompraConjunta, Long> {
    List<CompraConjunta> findByZonaIdOrderByFechaCierreAsc(String zonaId);

    List<CompraConjunta> findByZonaIdAndProductoId(String zonaId, Long productoId);
}
