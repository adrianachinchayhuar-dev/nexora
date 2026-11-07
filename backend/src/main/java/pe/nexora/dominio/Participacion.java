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
import java.time.LocalDateTime;

@Entity
@Table(name = "participacion")
public class Participacion {
    public enum Estado { ACTIVA, RETIRADA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "compra_id")
    public Long compraId;
    @Column(name = "negocio_id")
    public Long negocioId;
    @Column(name = "necesidad_id")
    public Long necesidadId;
    @Column(name = "cantidad")
    public int cantidad;
    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    public Estado estado;
    /** Precio del tramo cuando se unió: sirve para aceptar solo si el precio final no sube. */
    @Column(name = "precio_estimado")
    public BigDecimal precioEstimado;
    @Column(name = "precio_aceptado")
    public boolean precioAceptado;
    @Column(name = "recibido")
    public boolean recibido;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
}
