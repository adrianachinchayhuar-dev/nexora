package pe.nexora.servicio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Sesion;
import pe.nexora.dominio.Usuario;
import pe.nexora.dominio.Zona;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.repositorio.SesionRepositorio;
import pe.nexora.repositorio.UsuarioRepositorio;
import pe.nexora.repositorio.ZonaRepositorio;
import pe.nexora.web.Dto;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;

/** Registro libre del bodeguero (sin aprobación, decisión D6), inicio de sesión y perfil. */
@Service
public class CuentaServicio {
    private static final SecureRandom AZAR = new SecureRandom();

    private final UsuarioRepositorio usuarios;
    private final NegocioRepositorio negocios;
    private final ProveedorRepositorio proveedores;
    private final SesionRepositorio sesiones;
    private final ZonaRepositorio zonas;
    private final PasswordEncoder codificador;
    private final NotificacionServicio notificaciones;
    private final Vistas vistas;
    private final Reloj reloj;
    private final int horasSesion;

    public CuentaServicio(UsuarioRepositorio usuarios, NegocioRepositorio negocios, ProveedorRepositorio proveedores,
                          SesionRepositorio sesiones,
                          ZonaRepositorio zonas, PasswordEncoder codificador, NotificacionServicio notificaciones,
                          Vistas vistas, Reloj reloj, @Value("${nexora.sesion.horas:12}") int horasSesion) {
        this.usuarios = usuarios;
        this.negocios = negocios;
        this.proveedores = proveedores;
        this.sesiones = sesiones;
        this.zonas = zonas;
        this.codificador = codificador;
        this.notificaciones = notificaciones;
        this.vistas = vistas;
        this.reloj = reloj;
        this.horasSesion = horasSesion;
    }

    public List<Dto.ZonaVista> zonas() {
        return zonas.findAll().stream()
                .sorted(Comparator.comparing((Zona z) -> z.distrito).thenComparing(z -> z.nombre))
                .map(z -> new Dto.ZonaVista(z.id, z.distrito, z.nombre)).toList();
    }

    @Transactional
    public Dto.SesionVista registrar(Dto.RegistroRequest req) {
        String email = req.email().trim().toLowerCase();
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflicto("Ya existe una cuenta con ese correo. Inicia sesión.");
        }
        Zona zona = zonas.findById(req.zonaId()).orElseThrow(() -> ApiException.invalido("Elige una zona de la lista."));
        Usuario u = new Usuario();
        u.email = email;
        u.passwordHash = codificador.encode(req.password());
        u.rol = Usuario.Rol.COMPRADOR.name();
        u.estado = "ACTIVO";
        u.creadoEn = reloj.ahora();
        usuarios.save(u);

        Negocio n = new Negocio();
        n.usuarioId = u.id;
        n.nombre = req.nombreNegocio().trim();
        n.responsable = req.responsable().trim();
        n.celular = req.celular().trim();
        n.distrito = zona.distrito;
        n.zonaId = zona.id;
        n.direccion = req.direccion().trim();
        negocios.save(n);

        notificaciones.avisar(u.id, "BIENVENIDA", "Bienvenida a NEXORA. Tú decides si participas en cada compra conjunta.", "/");
        return new Dto.SesionVista(nuevaSesion(u.id), cuenta(u));
    }

    @Transactional
    public Dto.SesionVista ingresar(Dto.LoginRequest req) {
        Usuario u = usuarios.findByEmailIgnoreCase(req.email().trim())
                .filter(x -> codificador.matches(req.password(), x.passwordHash))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos."));
        if (!"ACTIVO".equals(u.estado)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tu cuenta está suspendida. Escríbenos para revisarla.");
        }
        // El administrador aún no tiene pantalla (VI ciclo); comprador y proveedor sí.
        if (Usuario.Rol.ADMIN.name().equals(u.rol)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "El panel de administración todavía no está disponible.");
        }
        return new Dto.SesionVista(nuevaSesion(u.id), cuenta(u));
    }

    @Transactional
    public void salir(String token) {
        if (token != null) {
            sesiones.deleteById(token);
        }
    }

    @Transactional(readOnly = true)
    public Dto.CuentaVista cuenta(Long usuarioId) {
        return cuenta(usuarios.findById(usuarioId).orElseThrow());
    }

    private Dto.CuentaVista cuenta(Usuario u) {
        Negocio n = negocios.findByUsuarioId(u.id).orElse(null);
        String proveedor = proveedores.findByUsuarioId(u.id).map(p -> p.razonSocial).orElse(null);
        return new Dto.CuentaVista(u.id, u.email, u.rol, n == null ? null : vistas.negocio(n), proveedor);
    }

    @Transactional
    public Dto.CuentaVista actualizarPerfil(Long usuarioId, Dto.PerfilRequest req) {
        Negocio n = negocios.findByUsuarioId(usuarioId).orElseThrow();
        Zona zona = zonas.findById(req.zonaId()).orElseThrow(() -> ApiException.invalido("Elige una zona de la lista."));
        n.nombre = req.nombre().trim();
        n.responsable = req.responsable().trim();
        n.celular = req.celular().trim();
        n.zonaId = zona.id;
        n.distrito = zona.distrito;
        n.direccion = req.direccion().trim();
        n.ruc = req.ruc() == null || req.ruc().isBlank() ? null : req.ruc().trim();
        n.descripcion = req.descripcion() == null || req.descripcion().isBlank() ? null : req.descripcion().trim();
        n.horario = req.horario() == null || req.horario().isBlank() ? null : req.horario().trim();
        negocios.save(n);
        return cuenta(usuarioId);
    }

    private String nuevaSesion(Long usuarioId) {
        byte[] bytes = new byte[32];
        AZAR.nextBytes(bytes);
        Sesion s = new Sesion();
        s.token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        s.usuarioId = usuarioId;
        s.expiraEn = reloj.ahora().plusHours(horasSesion);
        sesiones.save(s);
        return s.token;
    }
}
