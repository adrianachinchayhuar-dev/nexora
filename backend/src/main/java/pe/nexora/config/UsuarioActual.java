package pe.nexora.config;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Proveedor;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;

/** Datos de quien hace la petición. */
@Component
public class UsuarioActual {
    private final NegocioRepositorio negocios;
    private final ProveedorRepositorio proveedores;

    public UsuarioActual(NegocioRepositorio negocios, ProveedorRepositorio proveedores) {
        this.negocios = negocios;
        this.proveedores = proveedores;
    }

    public Long id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof Long id)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar.");
        }
        return id;
    }

    public Negocio negocio() {
        return negocios.findByUsuarioId(id())
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos el negocio de tu cuenta."));
    }

    public Proveedor proveedor() {
        return proveedores.findByUsuarioId(id())
                .orElseThrow(() -> ApiException.noEncontrado("No encontramos el proveedor de tu cuenta."));
    }
}
