package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.TramoPrecio;

import java.util.List;

public interface TramoPrecioRepositorio extends JpaRepository<TramoPrecio, Long> {
    List<TramoPrecio> findByProductoIdOrderByDesdeAsc(Long productoId);
}
