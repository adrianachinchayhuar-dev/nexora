package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "proveedor")
public class Proveedor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "razon_social")
    public String razonSocial;
    @Column(name = "ruc")
    public String ruc;
    /** APROBADO, EN_REVISION o SUSPENDIDO. */
    @Column(name = "estado")
    public String estado;
    @Column(name = "entregas_a_tiempo")
    public int entregasATiempo;
    @Column(name = "entregas_total")
    public int entregasTotal;
    /** Cuenta con la que el proveedor ingresa a su panel. */
    @Column(name = "usuario_id")
    public Long usuarioId;
}
