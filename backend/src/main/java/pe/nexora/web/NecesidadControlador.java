package pe.nexora.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.NecesidadServicio;

import java.util.List;

/** Pedidos (necesidades de compra) del bodeguero. */
@RestController
@RequestMapping("/api/necesidades")
public class NecesidadControlador {
    private final NecesidadServicio necesidades;
    private final UsuarioActual actual;

    public NecesidadControlador(NecesidadServicio necesidades, UsuarioActual actual) {
        this.necesidades = necesidades;
        this.actual = actual;
    }

    @PostMapping("/interpretar")
    public List<Dto.ItemInterpretado> interpretar(@Valid @RequestBody Dto.InterpretarRequest req) {
        actual.id();
        return necesidades.interpretar(req.texto());
    }

    @GetMapping
    public List<Dto.NecesidadVista> listar() {
        return necesidades.listar(actual.negocio());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<Dto.NecesidadVista> crear(@Valid @RequestBody Dto.CrearNecesidadesRequest req) {
        return necesidades.crear(actual.negocio(), req);
    }

    @GetMapping("/{id}")
    public Dto.NecesidadVista detalle(@PathVariable Long id) {
        return necesidades.detalle(actual.negocio(), id);
    }

    @PutMapping("/{id}")
    public Dto.NecesidadVista editar(@PathVariable Long id, @Valid @RequestBody Dto.EditarNecesidadRequest req) {
        return necesidades.editar(actual.negocio(), id, req);
    }

    @DeleteMapping("/{id}")
    public Dto.MensajeVista cancelar(@PathVariable Long id) {
        necesidades.cancelar(actual.negocio(), id);
        return new Dto.MensajeVista("Pedido cancelado.");
    }

    @PostMapping("/{id}/proponer")
    public Dto.CompraVista proponer(@PathVariable Long id) {
        return necesidades.proponer(actual.negocio(), id);
    }
}
