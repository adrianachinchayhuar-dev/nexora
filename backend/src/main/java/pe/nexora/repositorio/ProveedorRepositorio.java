package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Proveedor;

public interface ProveedorRepositorio extends JpaRepository<Proveedor, Long> {
}
