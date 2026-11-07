package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "zona")
public class Zona {
    @Id
    @Column(name = "id")
    public String id;
    @Column(name = "distrito")
    public String distrito;
    @Column(name = "nombre")
    public String nombre;

    public Zona() {
    }

    public Zona(String id, String distrito, String nombre) {
        this.id = id;
        this.distrito = distrito;
        this.nombre = nombre;
    }
}
