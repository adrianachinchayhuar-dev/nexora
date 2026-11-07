package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidencia")
public class Incidencia {
    public enum Motivo { NO_LLEGO, INCOMPLETO, DANADO, TARDE, PRECIO_DISTINTO }

    public enum Estado { ABIERTA, EN_REVISION, RESUELTA }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "compra_id")
    public Long compraId;
    @Column(name = "negocio_id")
    public Long negocioId;
    @Enumerated(EnumType.STRING)
    @Column(name = "motivo")
    public Motivo motivo;
    @Column(name = "descripcion")
    public String descripcion;
    @Enumerated(EnumType.STRING)
    @Column(name = "estado")
    public Estado estado;
    @Column(name = "respuesta")
    public String respuesta;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
}
