package pe.nexora.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.nexora.repositorio.SesionRepositorio;
import pe.nexora.repositorio.UsuarioRepositorio;

import java.io.IOException;
import java.util.List;

/** Lee «Authorization: Bearer <token>», valida la sesión y deja al usuario autenticado con su rol. */
public class FiltroToken extends OncePerRequestFilter {
    private final SesionRepositorio sesiones;
    private final UsuarioRepositorio usuarios;
    private final Reloj reloj;

    public FiltroToken(SesionRepositorio sesiones, UsuarioRepositorio usuarios, Reloj reloj) {
        this.sesiones = sesiones;
        this.usuarios = usuarios;
        this.reloj = reloj;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String cabecera = request.getHeader("Authorization");
        if (cabecera != null && cabecera.startsWith("Bearer ")) {
            String token = cabecera.substring(7).trim();
            sesiones.findById(token)
                    .filter(s -> s.expiraEn.isAfter(reloj.ahora()))
                    .flatMap(s -> usuarios.findById(s.usuarioId))
                    .filter(u -> "ACTIVO".equals(u.estado))
                    .ifPresent(u -> {
                        var auth = new UsernamePasswordAuthenticationToken(u.id, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + u.rol)));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
        }
        chain.doFilter(request, response);
    }
}
