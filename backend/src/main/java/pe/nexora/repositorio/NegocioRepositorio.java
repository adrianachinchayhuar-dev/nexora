package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Negocio;

import java.util.Optional;

public interface NegocioRepositorio extends JpaRepository<Negocio, Long> {
    Optional<Negocio> findByUsuarioId(Long usuarioId);
}
