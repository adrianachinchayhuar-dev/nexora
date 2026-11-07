package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "tramo_precio")
public class TramoPrecio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "producto_id")
    public Long productoId;
    @Column(name = "desde")
    public int desde;
    @Column(name = "hasta")
    public Integer hasta;
    @Column(name = "precio")
    public BigDecimal precio;

    public TramoPrecio() {
    }

    public TramoPrecio(Long productoId, int desde, Integer hasta, BigDecimal precio) {
        this.productoId = productoId;
        this.desde = desde;
        this.hasta = hasta;
        this.precio = precio;
    }
}
