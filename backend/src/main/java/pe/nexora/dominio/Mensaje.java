package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Mensaje del chat privado entre un negocio y el proveedor de una compra conjunta. */
@Entity
@Table(name = "mensaje")
public class Mensaje {
    public static final String NEGOCIO = "NEGOCIO";
    public static final String PROVEEDOR = "PROVEEDOR";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "compra_id")
    public Long compraId;
    @Column(name = "negocio_id")
    public Long negocioId;
    /** NEGOCIO o PROVEEDOR. */
    @Column(name = "autor")
    public String autor;
    @Column(name = "texto")
    public String texto;
    @Column(name = "leido")
    public boolean leido;
    @Column(name = "creado_en")
    public LocalDateTime creadoEn;
}
