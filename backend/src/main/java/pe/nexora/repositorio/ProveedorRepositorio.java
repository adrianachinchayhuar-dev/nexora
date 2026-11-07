package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Proveedor;

import java.util.Optional;

public interface ProveedorRepositorio extends JpaRepository<Proveedor, Long> {
    Optional<Proveedor> findByUsuarioId(Long usuarioId);

    Optional<Proveedor> findFirstByRazonSocialStartingWith(String inicio);
}
