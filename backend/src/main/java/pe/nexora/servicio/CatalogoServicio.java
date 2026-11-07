package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Producto;
import pe.nexora.dominio.Proveedor;
import pe.nexora.reglas.InterpreteDePedidos;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.web.Dto;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Catálogo visible para el bodeguero: solo productos activos de proveedores aprobados que atienden su zona (D2). */
@Service
public class CatalogoServicio {
    private final ProductoRepositorio productos;
    private final ProveedorRepositorio proveedores;
    private final CompraServicio compras;
    private final Vistas vistas;

    public CatalogoServicio(ProductoRepositorio productos, ProveedorRepositorio proveedores, CompraServicio compras,
                            Vistas vistas) {
        this.productos = productos;
        this.proveedores = proveedores;
        this.compras = compras;
        this.vistas = vistas;
    }

    @Transactional
    public List<Dto.ProductoVista> listar(Negocio yo, String categoria, String busqueda) {
        Map<Long, Proveedor> aprobados = proveedores.findAll().stream()
                .filter(p -> "APROBADO".equals(p.estado))
                .collect(Collectors.toMap(p -> p.id, Function.identity()));
        String q = busqueda == null ? "" : InterpreteDePedidos.normalizar(busqueda);
        return productos.findByActivoTrueOrderByNombreAsc().stream()
                .filter(p -> aprobados.containsKey(p.proveedorId))
                .filter(p -> p.listaZonas().contains(yo.zonaId))
                .filter(p -> categoria == null || categoria.isBlank() || categoria.equals(p.categoriaId))
                .filter(p -> q.isEmpty() || coincide(p, q))
                .peek(p -> compras.abiertas(yo.zonaId, p.id))
                .map(p -> vistas.producto(p, yo.zonaId))
                .toList();
    }

    private static boolean coincide(Producto p, String q) {
        String texto = InterpreteDePedidos.normalizar(p.nombre + " " + p.marca + " " + p.presentacion + " " + p.palabrasClave);
        return texto.contains(q);
    }

    public List<Dto.CategoriaVista> categorias() {
        return vistas.categorias();
    }
}
