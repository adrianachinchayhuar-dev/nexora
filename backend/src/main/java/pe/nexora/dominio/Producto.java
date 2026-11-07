package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "producto")
public class Producto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "proveedor_id")
    public Long proveedorId;
    @Column(name = "categoria_id")
    public String categoriaId;
    @Column(name = "nombre")
    public String nombre;
    @Column(name = "marca")
    public String marca;
    @Column(name = "presentacion")
    public String presentacion;
    /** Unidad equivalente en plural (botellas, kg, latas). */
    @Column(name = "unidad")
    public String unidad;
    /** Unidad en que vende el proveedor (caja de 12). */
    @Column(name = "unidad_venta")
    public String unidadVenta;
    @Column(name = "equivalencia")
    public int equivalencia;
    @Column(name = "palabras_clave")
    public String palabrasClave;
    @Column(name = "minimo")
    public int minimo;
    @Column(name = "plazo_entrega")
    public int plazoEntrega;
    /** Ids de zona separados por coma. */
    @Column(name = "zonas")
    public String zonas;
    @Column(name = "imagen")
    public String imagen;
    @Column(name = "activo")
    public boolean activo = true;

    public List<String> listaZonas() {
        return Arrays.stream(zonas.split(",")).map(String::trim).filter(z -> !z.isEmpty()).toList();
    }

    public List<String> listaPalabras() {
        return Arrays.stream(palabrasClave.split(",")).map(String::trim).filter(p -> !p.isEmpty()).toList();
    }
}
