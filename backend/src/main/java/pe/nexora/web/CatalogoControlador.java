package pe.nexora.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.nexora.config.UsuarioActual;
import pe.nexora.servicio.CatalogoServicio;
import pe.nexora.servicio.InicioServicio;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CatalogoControlador {
    private final CatalogoServicio catalogo;
    private final InicioServicio inicio;
    private final UsuarioActual actual;

    public CatalogoControlador(CatalogoServicio catalogo, InicioServicio inicio, UsuarioActual actual) {
        this.catalogo = catalogo;
        this.inicio = inicio;
        this.actual = actual;
    }

    @GetMapping("/inicio")
    public Dto.InicioVista inicio() {
        return inicio.inicio(actual.negocio());
    }

    @GetMapping("/catalogo")
    public List<Dto.ProductoVista> catalogo(@RequestParam(required = false) String categoria,
                                           @RequestParam(required = false) String q) {
        return catalogo.listar(actual.negocio(), categoria, q);
    }

    @GetMapping("/categorias")
    public List<Dto.CategoriaVista> categorias() {
        return catalogo.categorias();
    }
}
