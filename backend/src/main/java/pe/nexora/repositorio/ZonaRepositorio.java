package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Zona;

public interface ZonaRepositorio extends JpaRepository<Zona, String> {
}
