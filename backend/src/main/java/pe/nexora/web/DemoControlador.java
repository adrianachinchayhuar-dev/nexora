package pe.nexora.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.servicio.DemoServicio;

import java.util.Map;

/**
 * Acciones simuladas del proveedor para la demostración (apartado 1.3.5 de la tesis).
 * En el VI ciclo las reemplaza el perfil proveedor real.
 */
@RestController
@RequestMapping("/api/demo")
public class DemoControlador {
    private final DemoServicio demo;

    public DemoControlador(DemoServicio demo) {
        this.demo = demo;
    }

    @PostMapping("/restablecer")
    public Dto.MensajeVista restablecer() {
        demo.restablecer();
        return new Dto.MensajeVista("Demo restablecida. Vuelve a iniciar sesión con " + DemoServicio.CORREO_DEMO + ".");
    }

    @PostMapping("/compras/{id}/sumar-bodega")
    public Dto.MensajeVista sumarBodega(@PathVariable Long id, @Valid @RequestBody Dto.SumarBodegaRequest req) {
        demo.sumarBodega(id, req.cantidad());
        return new Dto.MensajeVista("Se sumó una bodega simulada.");
    }

    @PostMapping("/compras/{id}/confirmar")
    public Dto.MensajeVista confirmar(@PathVariable Long id, @Valid @RequestBody Dto.ConfirmarRequest req) {
        demo.confirmarProveedor(id, req);
        return new Dto.MensajeVista("El proveedor confirmó la compra.");
    }

    @PostMapping("/compras/{id}/entrega")
    public Dto.MensajeVista entrega(@PathVariable Long id, @Valid @RequestBody Dto.EntregaRequest req) {
        demo.entrega(id, req.estado());
        return new Dto.MensajeVista("Entrega actualizada.");
    }

    @PostMapping("/compras/{id}/vencer")
    public Dto.MensajeVista vencer(@PathVariable Long id) {
        demo.vencer(id);
        return new Dto.MensajeVista("La compra cerró sin confirmarse.");
    }

    @PostMapping("/compras/{id}/aviso")
    public Dto.MensajeVista aviso(@PathVariable Long id, @RequestBody Map<String, String> cuerpo) {
        String texto = cuerpo.getOrDefault("texto", "").trim();
        if (texto.isEmpty()) {
            throw pe.nexora.config.ApiException.invalido("Escribe el aviso.");
        }
        demo.avisoProveedor(id, texto);
        return new Dto.MensajeVista("Aviso publicado.");
    }
}
