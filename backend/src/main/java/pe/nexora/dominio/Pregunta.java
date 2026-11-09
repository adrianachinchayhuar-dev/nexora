package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** Pregunta pública y anónima sobre una compra conjunta. */
@Entity
@Table(name = "pregunta")
public class Pregunta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "compra_id")
    public Long compraId;
    /** Solo para saber quién preguntó; nunca se muestra a los demás. */
    @Column(name = "negocio_id")
    public Long negocioId;
    @Column(name = "texto")
    public String texto;
    @Column(name = "respuesta")
    public String respuesta;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
    @Column(name = "respondida_en")
    public LocalDateTime respondidaEn;
}
