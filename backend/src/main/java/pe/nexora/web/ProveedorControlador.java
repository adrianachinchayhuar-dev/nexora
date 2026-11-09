package pe.nexora.web;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.DemoServicio;
import pe.nexora.servicio.MensajeriaServicio;
import pe.nexora.servicio.ProveedorServicio;

/** Panel del proveedor (perfil PROVEEDOR). Cada acción verifica que la compra sea suya. */
@RestController
@RequestMapping("/api/proveedor")
public class ProveedorControlador {
    private final ProveedorServicio proveedor;
    private final DemoServicio demo;
    private final MensajeriaServicio mensajeria;
    private final UsuarioActual actual;

    public ProveedorControlador(ProveedorServicio proveedor, DemoServicio demo, MensajeriaServicio mensajeria,
                                UsuarioActual actual) {
        this.proveedor = proveedor;
        this.demo = demo;
        this.mensajeria = mensajeria;
        this.actual = actual;
    }

    // ---------- Mensajes y preguntas ----------

    @GetMapping("/mensajes")
    public Dto.BandejaProveedorVista mensajes() {
        return mensajeria.bandejaProveedor(actual.proveedor());
    }

    @GetMapping("/compras/{id}/chat/{negocioId}")
    public Dto.ChatProveedorVista chat(@PathVariable Long id, @PathVariable Long negocioId) {
        return mensajeria.chatProveedor(actual.proveedor(), id, negocioId);
    }

    @PostMapping("/compras/{id}/chat/{negocioId}")
    public Dto.ChatProveedorVista escribir(@PathVariable Long id, @PathVariable Long negocioId,
                                           @Valid @RequestBody Dto.TextoRequest req) {
        return mensajeria.responderChat(actual.proveedor(), id, negocioId, req.texto());
    }

    @PostMapping("/preguntas/{id}/responder")
    public Dto.MensajeVista responderPregunta(@PathVariable Long id, @Valid @RequestBody Dto.TextoRequest req) {
        mensajeria.responderPregunta(actual.proveedor(), id, req.texto());
        return new Dto.MensajeVista("Respuesta publicada para todas las bodegas de la compra.");
    }

    @GetMapping("/panel")
    public Dto.PanelProveedorVista panel() {
        return proveedor.panel(actual.proveedor());
    }

    @PostMapping("/compras/{id}/confirmar")
    public Dto.MensajeVista confirmar(@PathVariable Long id, @Valid @RequestBody Dto.ConfirmarRequest req) {
        proveedor.confirmar(actual.proveedor(), id, req);
        return new Dto.MensajeVista("Confirmaste la compra. Los negocios ya fueron avisados.");
    }

    @PostMapping("/compras/{id}/entrega")
    public Dto.MensajeVista entrega(@PathVariable Long id, @Valid @RequestBody Dto.EntregaRequest req) {
        proveedor.entrega(actual.proveedor(), id, req.estado());
        return new Dto.MensajeVista("Entrega actualizada. Los negocios ya fueron avisados.");
    }

    @PostMapping("/compras/{id}/aviso")
    public Dto.MensajeVista aviso(@PathVariable Long id, @Valid @RequestBody Dto.AvisoRequest req) {
        proveedor.publicarAviso(actual.proveedor(), id, req.texto());
        return new Dto.MensajeVista("Aviso publicado.");
    }

    @PostMapping("/incidencias/{id}/responder")
    public Dto.MensajeVista responder(@PathVariable Long id, @Valid @RequestBody Dto.RespuestaIncidenciaRequest req) {
        proveedor.responderIncidencia(actual.proveedor(), id, req);
        return new Dto.MensajeVista("Respuesta enviada al negocio.");
    }

    // ---------- Datos de prueba (solo para la sustentación) ----------

    @PostMapping("/prueba/restablecer")
    public Dto.MensajeVista restablecer() {
        actual.proveedor();
        demo.restablecer();
        return new Dto.MensajeVista("Datos de prueba restablecidos. Vuelve a ingresar en ambas ventanas.");
    }

    @PostMapping("/prueba/compras/{id}/sumar-bodega")
    public Dto.MensajeVista sumarBodega(@PathVariable Long id, @Valid @RequestBody Dto.SumarBodegaRequest req) {
        proveedor.propia(actual.proveedor(), id);
        demo.sumarBodega(id, req.cantidad());
        return new Dto.MensajeVista("Se sumó una bodega de prueba.");
    }

    @PostMapping("/prueba/compras/{id}/cerrar")
    public Dto.MensajeVista cerrar(@PathVariable Long id) {
        proveedor.propia(actual.proveedor(), id);
        demo.vencer(id);
        return new Dto.MensajeVista("La compra cerró sin confirmarse.");
    }
}
