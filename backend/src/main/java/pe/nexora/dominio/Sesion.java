package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "sesion")
public class Sesion {
    @Id
    @Column(name = "token")
    public String token;
    @Column(name = "usuario_id")
    public Long usuarioId;
    @Column(name = "expira_en")
    public LocalDateTime expiraEn;
}
