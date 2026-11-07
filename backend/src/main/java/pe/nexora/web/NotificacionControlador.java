package pe.nexora.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.NotificacionServicio;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionControlador {
    private final NotificacionServicio notificaciones;
    private final UsuarioActual actual;

    public NotificacionControlador(NotificacionServicio notificaciones, UsuarioActual actual) {
        this.notificaciones = notificaciones;
        this.actual = actual;
    }

    @GetMapping
    public Dto.NotificacionesVista listar() {
        return notificaciones.listar(actual.id());
    }

    @PostMapping("/{id}/leer")
    public Dto.MensajeVista leer(@PathVariable Long id) {
        notificaciones.leer(actual.id(), id);
        return new Dto.MensajeVista("Leída.");
    }

    @PostMapping("/leer-todas")
    public Dto.MensajeVista leerTodas() {
        notificaciones.leerTodas(actual.id());
        return new Dto.MensajeVista("Todas leídas.");
    }
}
