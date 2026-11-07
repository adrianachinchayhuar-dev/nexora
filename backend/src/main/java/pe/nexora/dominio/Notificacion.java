package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "notificacion")
public class Notificacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "usuario_id")
    public Long usuarioId;
    @Column(name = "tipo")
    public String tipo;
    @Column(name = "texto")
    public String texto;
    @Column(name = "enlace")
    public String enlace;
    @Column(name = "leida")
    public boolean leida;
    @Column(name = "creada_en")
    public LocalDateTime creadaEn;
}
