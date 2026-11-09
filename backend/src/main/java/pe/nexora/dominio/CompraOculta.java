package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Compra que un negocio marcó como «No me interesa». */
@Entity
@Table(name = "compra_oculta")
public class CompraOculta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "negocio_id")
    public Long negocioId;
    @Column(name = "compra_id")
    public Long compraId;
}
