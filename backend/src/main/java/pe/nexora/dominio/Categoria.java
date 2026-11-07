package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categoria")
public class Categoria {
    @Id
    @Column(name = "id")
    public String id;
    @Column(name = "nombre")
    public String nombre;

    public Categoria() {
    }

    public Categoria(String id, String nombre) {
        this.id = id;
        this.nombre = nombre;
    }
}
