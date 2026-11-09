package pe.nexora.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.MensajeriaServicio;

import java.util.List;

/** Preguntas anónimas, chat privado con el proveedor y «No me interesa», vistos por el bodeguero. */
@RestController
@RequestMapping("/api")
public class MensajeriaControlador {
    private final MensajeriaServicio mensajeria;
    private final UsuarioActual actual;

    public MensajeriaControlador(MensajeriaServicio mensajeria, UsuarioActual actual) {
        this.mensajeria = mensajeria;
        this.actual = actual;
    }

    @GetMapping("/mensajes")
    public Dto.BandejaVista bandeja() {
        return mensajeria.bandeja(actual.negocio());
    }

    @GetMapping("/compras/{id}/mensajes")
    public Dto.MensajesCompraVista deCompra(@PathVariable Long id) {
        return mensajeria.deCompra(id, actual.negocio());
    }

    @PostMapping("/compras/{id}/preguntas")
    public Dto.MensajesCompraVista preguntar(@PathVariable Long id, @Valid @RequestBody Dto.TextoRequest req) {
        return mensajeria.preguntar(id, actual.negocio(), req.texto());
    }

    @PostMapping("/compras/{id}/chat")
    public Dto.MensajesCompraVista escribir(@PathVariable Long id, @Valid @RequestBody Dto.TextoRequest req) {
        return mensajeria.escribir(id, actual.negocio(), req.texto());
    }

    @GetMapping("/compras/ocultas")
    public List<Long> ocultas() {
        return mensajeria.ocultas(actual.negocio());
    }

    @PostMapping("/compras/{id}/ocultar")
    public Dto.MensajeVista ocultar(@PathVariable Long id) {
        mensajeria.ocultar(id, actual.negocio());
        return new Dto.MensajeVista("Listo: ya no verás esta compra en tus listas.");
    }

    @PostMapping("/compras/{id}/mostrar")
    public Dto.MensajeVista mostrar(@PathVariable Long id) {
        mensajeria.mostrar(id, actual.negocio());
        return new Dto.MensajeVista("La compra volvió a tus listas.");
    }
}
