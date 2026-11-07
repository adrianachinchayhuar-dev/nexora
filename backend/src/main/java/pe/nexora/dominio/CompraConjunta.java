package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import pe.nexora.reglas.ReglasCompra;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "compra_conjunta")
public class CompraConjunta {
    public enum EntregaEstado { EN_PREPARACION, EN_CAMINO, ENTREGADA, RETRASADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "producto_id")
    public Long productoId;
    @Column(name = "proveedor_id")
    public Long proveedorId;
    @Column(name = "zona_id")
    public String zonaId;
    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    public ReglasCompra.Estado estado;
    @Column(name = "estado_desde")
    public LocalDateTime estadoDesde;
    @Column(name = "fecha_cierre")
    public LocalDate fechaCierre;
    @Column(name = "entrega_desde")
    public LocalDate entregaDesde;
    @Column(name = "entrega_hasta")
    public LocalDate entregaHasta;
    @Column(name = "precio_final")
    public BigDecimal precioFinal;
    /** Por negocio; null si aún no se conoce. */
    @Column(name = "costo_transporte")
    public BigDecimal costoTransporte;
    @Column(name = "compensacion")
    public String compensacion;
    @Enumerated(EnumType.STRING)
    @Column(name = "entrega_estado")
    public EntregaEstado entregaEstado;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
}
