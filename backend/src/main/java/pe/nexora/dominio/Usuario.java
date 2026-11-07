package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "usuario")
public class Usuario {
    public enum Rol { COMPRADOR, PROVEEDOR, ADMIN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    @Column(name = "email")
    public String email;
    @Column(name = "password_hash")
    public String passwordHash;
    @Column(name = "rol")
    public String rol;
    @Column(name = "estado")
    public String estado;
    @Column(name = "creado_en")
    public LocalDateTime creadoEn;
}
