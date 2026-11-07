package pe.nexora.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.CompraServicio;

import java.util.List;

/** Compras conjuntas vistas por el bodeguero. */
@RestController
@RequestMapping("/api")
public class CompraControlador {
    private final CompraServicio compras;
    private final UsuarioActual actual;

    public CompraControlador(CompraServicio compras, UsuarioActual actual) {
        this.compras = compras;
        this.actual = actual;
    }

    /** filtro: REUNIENDO, ESPERANDO_PROVEEDOR, CONFIRMADA, NO_SE_CONCRETO o MIAS. */
    @GetMapping("/compras")
    public List<Dto.CompraVista> listar(@RequestParam(required = false) String filtro) {
        return compras.listar(actual.negocio(), filtro);
    }

    @GetMapping("/compras/{id}")
    public Dto.CompraVista detalle(@PathVariable Long id, @RequestParam(required = false) Integer cantidad,
                                   @RequestParam(required = false) Long necesidadId) {
        return compras.detalle(id, actual.negocio(), cantidad, necesidadId);
    }

    @PostMapping("/compras/{id}/unirse")
    public Dto.CompraVista unirse(@PathVariable Long id, @Valid @RequestBody Dto.UnirseRequest req) {
        return compras.unirse(id, actual.negocio(), req);
    }

    @PostMapping("/compras/{id}/retirarse")
    public Dto.CompraVista retirarse(@PathVariable Long id) {
        return compras.retirarse(id, actual.negocio());
    }

    @PostMapping("/compras/{id}/aceptar-precio")
    public Dto.CompraVista aceptarPrecio(@PathVariable Long id) {
        return compras.aceptarPrecio(id, actual.negocio());
    }

    @PostMapping("/compras/{id}/recibido")
    public Dto.CompraVista recibido(@PathVariable Long id) {
        return compras.confirmarRecepcion(id, actual.negocio());
    }

    @PostMapping("/compras/{id}/incidencias")
    @ResponseStatus(HttpStatus.CREATED)
    public Dto.IncidenciaVista incidencia(@PathVariable Long id, @Valid @RequestBody Dto.IncidenciaRequest req) {
        return compras.reportarIncidencia(id, actual.negocio(), req);
    }

    @GetMapping("/participaciones")
    public List<Dto.CompraVista> participaciones() {
        return compras.misParticipaciones(actual.negocio());
    }

    @GetMapping("/incidencias")
    public List<Dto.IncidenciaVista> incidencias() {
        return compras.misIncidencias(actual.negocio());
    }
}
