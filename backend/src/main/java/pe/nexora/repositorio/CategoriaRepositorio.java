package pe.nexora.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.nexora.dominio.Categoria;

public interface CategoriaRepositorio extends JpaRepository<Categoria, String> {
}
