package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Sesion;

public interface SesionRepositorio extends JpaRepository<Sesion, String> {
}
