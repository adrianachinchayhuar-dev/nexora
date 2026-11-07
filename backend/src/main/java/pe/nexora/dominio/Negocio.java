package pe.nexora.dominio;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "negocio")
public class Negocio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    public Long id;
    /** Null en las bodegas simuladas de la demo: no tienen cuenta. */
    @Column(name = "usuario_id")
    public Long usuarioId;
    @Column(name = "nombre")
    public String nombre;
    @Column(name = "responsable")
    public String responsable;
    @Column(name = "celular")
    public String celular;
    @Column(name = "distrito")
    public String distrito;
    @Column(name = "zona_id")
    public String zonaId;
    @Column(name = "direccion")
    public String direccion;
    @Column(name = "ruc")
    public String ruc;
    @Column(name = "descripcion")
    public String descripcion;
    @Column(name = "horario")
    public String horario;
}
