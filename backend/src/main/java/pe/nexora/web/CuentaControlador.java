package pe.nexora.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.CuentaServicio;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CuentaControlador {
    private final CuentaServicio cuentas;
    private final UsuarioActual actual;

    public CuentaControlador(CuentaServicio cuentas, UsuarioActual actual) {
        this.cuentas = cuentas;
        this.actual = actual;
    }

    @GetMapping("/salud")
    public Map<String, String> salud() {
        return Map.of("estado", "ok");
    }

    @GetMapping("/zonas")
    public List<Dto.ZonaVista> zonas() {
        return cuentas.zonas();
    }

    @PostMapping("/auth/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public Dto.SesionVista registro(@Valid @RequestBody Dto.RegistroRequest req) {
        return cuentas.registrar(req);
    }

    @PostMapping("/auth/login")
    public Dto.SesionVista login(@Valid @RequestBody Dto.LoginRequest req) {
        return cuentas.ingresar(req);
    }

    @PostMapping("/auth/salir")
    public Dto.MensajeVista salir(HttpServletRequest request) {
        String cabecera = request.getHeader("Authorization");
        cuentas.salir(cabecera != null && cabecera.startsWith("Bearer ") ? cabecera.substring(7).trim() : null);
        return new Dto.MensajeVista("Sesión cerrada.");
    }

    @GetMapping("/auth/yo")
    public Dto.CuentaVista yo() {
        return cuentas.cuenta(actual.id());
    }

    @PutMapping("/perfil")
    public Dto.CuentaVista perfil(@Valid @RequestBody Dto.PerfilRequest req) {
        return cuentas.actualizarPerfil(actual.id(), req);
    }
}
