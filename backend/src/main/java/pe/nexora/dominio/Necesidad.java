package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "necesidad")
public class Necesidad {
    public enum Estado { ACTIVA, EN_COMPRA, ATENDIDA, CANCELADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "negocio_id")
    public Long negocioId;
    @Column(name = "producto_id")
    public Long productoId;
    @Column(name = "texto_original")
    public String textoOriginal;
    @Column(name = "cantidad")
    public int cantidad;
    @Column(name = "marca_preferida")
    public String marcaPreferida;
    @Column(name = "acepta_equivalente")
    public boolean aceptaEquivalente = true;
    @Column(name = "precio_actual")
    public BigDecimal precioActual;
    @Column(name = "fecha_requerida")
    public LocalDate fechaRequerida;
    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    public Estado estado;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
}
