package pe.nexora.servicio;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.ApiException;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Aviso;
import pe.nexora.dominio.Categoria;
import pe.nexora.dominio.CompraConjunta;
import pe.nexora.dominio.Necesidad;
import pe.nexora.dominio.Negocio;
import pe.nexora.dominio.Notificacion;
import pe.nexora.dominio.Participacion;
import pe.nexora.dominio.Producto;
import pe.nexora.dominio.Proveedor;
import pe.nexora.dominio.TramoPrecio;
import pe.nexora.dominio.Usuario;
import pe.nexora.dominio.Zona;
import pe.nexora.reglas.ReglasCompra;
import pe.nexora.reglas.ReglasCompra.Estado;
import pe.nexora.repositorio.AvisoRepositorio;
import pe.nexora.repositorio.CategoriaRepositorio;
import pe.nexora.repositorio.CompraConjuntaRepositorio;
import pe.nexora.repositorio.IncidenciaRepositorio;
import pe.nexora.repositorio.NecesidadRepositorio;
import pe.nexora.repositorio.NegocioRepositorio;
import pe.nexora.repositorio.NotificacionRepositorio;
import pe.nexora.repositorio.ParticipacionRepositorio;
import pe.nexora.repositorio.ProductoRepositorio;
import pe.nexora.repositorio.ProveedorRepositorio;
import pe.nexora.repositorio.SesionRepositorio;
import pe.nexora.repositorio.TramoPrecioRepositorio;
import pe.nexora.repositorio.UsuarioRepositorio;
import pe.nexora.repositorio.ZonaRepositorio;
import pe.nexora.web.Dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Datos de prueba para la sustentación: zonas, catálogo, la cuenta de Bodega Rosita y la del proveedor
 * Distribuidora Andina. Las otras bodegas de la zona no tienen cuenta (solo suman cantidades).
 * Las fechas se calculan desde «hoy» para que los datos nunca queden viejos.
 */
@Service
public class DemoServicio {
    public static final String CORREO_DEMO = "ana@nexora.pe";
    public static final String CLAVE_DEMO = "nexora123";
    public static final String CORREO_PROVEEDOR = "andina@nexora.pe";
    public static final String CLAVE_PROVEEDOR = "proveedor123";

    private final ZonaRepositorio zonas;
    private final UsuarioRepositorio usuarios;
    private final SesionRepositorio sesiones;
    private final NegocioRepositorio negocios;
    private final ProveedorRepositorio proveedores;
    private final CategoriaRepositorio categorias;
    private final ProductoRepositorio productos;
    private final TramoPrecioRepositorio tramos;
    private final CompraConjuntaRepositorio compras;
    private final NecesidadRepositorio necesidades;
    private final ParticipacionRepositorio participaciones;
    private final AvisoRepositorio avisos;
    private final NotificacionRepositorio notificacionesRepo;
    private final IncidenciaRepositorio incidencias;
    private final CompraServicio compraServicio;
    private final NotificacionServicio notificaciones;
    private final Vistas vistas;
    private final PasswordEncoder codificador;
    private final Reloj reloj;

    public DemoServicio(ZonaRepositorio zonas, UsuarioRepositorio usuarios, SesionRepositorio sesiones,
                        NegocioRepositorio negocios, ProveedorRepositorio proveedores, CategoriaRepositorio categorias,
                        ProductoRepositorio productos, TramoPrecioRepositorio tramos,
                        CompraConjuntaRepositorio compras, NecesidadRepositorio necesidades,
                        ParticipacionRepositorio participaciones, AvisoRepositorio avisos,
                        NotificacionRepositorio notificacionesRepo, IncidenciaRepositorio incidencias,
                        CompraServicio compraServicio, NotificacionServicio notificaciones, Vistas vistas,
                        PasswordEncoder codificador, Reloj reloj) {
        this.zonas = zonas;
        this.usuarios = usuarios;
        this.sesiones = sesiones;
        this.negocios = negocios;
        this.proveedores = proveedores;
        this.categorias = categorias;
        this.productos = productos;
        this.tramos = tramos;
        this.compras = compras;
        this.necesidades = necesidades;
        this.participaciones = participaciones;
        this.avisos = avisos;
        this.notificacionesRepo = notificacionesRepo;
        this.incidencias = incidencias;
        this.compraServicio = compraServicio;
        this.notificaciones = notificaciones;
        this.vistas = vistas;
        this.codificador = codificador;
        this.reloj = reloj;
    }

    // ======================================================================
    // Carga de datos
    // ======================================================================

    @Transactional
    public boolean cargarSiVacia() {
        if (usuarios.count() > 0) {
            return false;
        }
        cargar();
        return true;
    }

    /** Borra todo y vuelve a cargar la demo. */
    @Transactional
    public void restablecer() {
        incidencias.deleteAllInBatch();
        notificacionesRepo.deleteAllInBatch();
        avisos.deleteAllInBatch();
        participaciones.deleteAllInBatch();
        necesidades.deleteAllInBatch();
        compras.deleteAllInBatch();
        tramos.deleteAllInBatch();
        productos.deleteAllInBatch();
        categorias.deleteAllInBatch();
        proveedores.deleteAllInBatch();
        negocios.deleteAllInBatch();
        sesiones.deleteAllInBatch();
        usuarios.deleteAllInBatch();
        zonas.deleteAllInBatch();
        cargar();
    }

    private void cargar() {
        LocalDate hoy = reloj.hoy();
        LocalDateTime ahora = reloj.ahora();

        zonas.saveAll(List.of(
                new Zona("sa-centro", "Santa Anita", "Santa Anita · Centro"),
                new Zona("sa-norte", "Santa Anita", "Santa Anita · Norte"),
                new Zona("ves-1", "Villa El Salvador", "Villa El Salvador · Sector 1"),
                new Zona("ves-2", "Villa El Salvador", "Villa El Salvador · Sectores 2 y 3")));
        categorias.saveAll(List.of(
                new Categoria("abarrotes", "Abarrotes"),
                new Categoria("limpieza", "Limpieza"),
                new Categoria("descartables", "Descartables")));

        Proveedor andina = proveedor("Distribuidora Andina (demo)", "20601234561", "APROBADO", 18, 19);
        Proveedor limaSur = proveedor("Mayorista Lima Sur (demo)", "20509876543", "APROBADO", 27, 30);
        Proveedor norte = proveedor("Comercial Norte (demo, en revisión)", "20456789012", "EN_REVISION", 0, 0);
        String todas = "sa-centro,sa-norte,ves-1,ves-2";

        cuentaProveedor(andina, ahora.minusDays(60));

        Producto aceite = producto(andina, "abarrotes", "Aceite vegetal", "Girasol Andino", "Botella 1 L", "botellas",
                "caja de 12", 12, "aceite,aceite vegetal", 50, 2, todas, "aceite.webp",
                tramo(1, 49, "7.80"), tramo(50, 99, "7.00"), tramo(100, null, "6.40"));
        Producto detergente = producto(andina, "limpieza", "Detergente en polvo", "Espuma Plus", "Bolsa 800 g", "bolsas",
                "fardo de 12", 12, "detergente,jabon en polvo,ace", 30, 3, todas, "detergente.webp",
                tramo(1, 29, "12.50"), tramo(30, 59, "11.40"), tramo(60, null, "10.60"));
        Producto vasos = producto(andina, "descartables", "Vasos descartables", "Descartex", "Paquete x 50", "paquetes",
                "fardo de 20", 20, "vaso,vasos descartables,vasitos", 24, 1, todas, "vasos.webp",
                tramo(1, 23, "8.50"), tramo(24, 47, "7.90"), tramo(48, null, "7.48"));
        Producto arroz = producto(limaSur, "abarrotes", "Arroz extra", "Grano Real", "Por kilo", "kg",
                "saco de 50 kg", 50, "arroz", 100, 3, todas, "arroz.webp",
                tramo(1, 99, "4.20"), tramo(100, 199, "4.00"), tramo(200, null, "3.80"));
        producto(andina, "abarrotes", "Fideos tallarín", "Don Trigo", "Paquete 500 g", "paquetes",
                "fardo de 20", 20, "fideo,fideos,tallarin,tallarines", 60, 2, todas, "fideos.webp",
                tramo(1, 59, "2.60"), tramo(60, 119, "2.35"), tramo(120, null, "2.20"));
        Producto leche = producto(limaSur, "abarrotes", "Leche evaporada", "Vaca Feliz", "Lata 400 g", "latas",
                "caja de 48", 48, "leche,leche evaporada,tarro de leche", 96, 3, todas, "leche.webp",
                tramo(1, 95, "3.90"), tramo(96, 191, "3.60"), tramo(192, null, "3.40"));
        // Proveedor en revisión: su producto no se muestra (decisión D2).
        producto(norte, "abarrotes", "Azúcar rubia", "Dulce Norte", "Bolsa 1 kg", "bolsas",
                "saco de 50 kg", 50, "azucar", 100, 3, todas, null,
                tramo(1, 99, "3.80"), tramo(100, null, "3.50"));

        // Cuenta de demostración.
        Usuario ana = new Usuario();
        ana.email = CORREO_DEMO;
        ana.passwordHash = codificador.encode(CLAVE_DEMO);
        ana.rol = Usuario.Rol.COMPRADOR.name();
        ana.estado = "ACTIVO";
        ana.creadoEn = ahora.minusDays(20);
        usuarios.save(ana);
        Negocio rosita = negocio(ana.id, "Bodega Rosita", "Ana Quispe", "987654321", "sa-centro", "Jr. Las Begonias 245 (demo)");

        // Otras bodegas de la zona: simuladas, sin cuenta. Nunca se muestran sus nombres.
        Negocio lucho = negocio(null, "Bodega Don Lucho", "Luis (demo)", "900000001", "sa-centro", "Demo");
        Negocio pilar = negocio(null, "Minimarket Pilar", "Pilar (demo)", "900000002", "sa-centro", "Demo");
        Negocio sanMartin = negocio(null, "Bodega San Martín", "Martín (demo)", "900000003", "sa-centro", "Demo");
        Negocio esquina = negocio(null, "Bodega La Esquina", "Rosa (demo)", "900000004", "sa-centro", "Demo");
        Negocio donaRosa = negocio(null, "Tienda Doña Rosa", "Rosa (demo)", "900000005", "sa-centro", "Demo");
        Negocio ahorroN = negocio(null, "Bodega El Ahorro", "Carlos (demo)", "900000006", "sa-centro", "Demo");

        // 1. Aceite: reuniendo negocios (38 de 50).
        CompraConjunta cAceite = compra(aceite, "sa-centro", Estado.BUSCANDO_PARTICIPANTES, hoy.plusDays(3),
                hoy.plusDays(4), hoy.plusDays(5), null, null, null, ahora.minusDays(3));
        participar(cAceite, lucho, 14, "7.80", null);
        participar(cAceite, pilar, 12, "7.80", null);
        participar(cAceite, sanMartin, 12, "7.80", null);
        aviso(cAceite, "Ya vamos 38 botellas: con 50 el precio baja a S/ 7.00.", ahora.minusDays(1));
        aviso(cAceite, "La entrega sería en la mañana, uno o dos días después del cierre.", ahora.minusHours(5));

        // 2. Detergente: ya alcanzó el mínimo; espera la confirmación del proveedor.
        CompraConjunta cDetergente = compra(detergente, "sa-centro", Estado.EN_COTIZACION, hoy.plusDays(5),
                hoy.plusDays(6), hoy.plusDays(8), null, new BigDecimal("0.00"), null, ahora.minusDays(1));
        participar(cDetergente, esquina, 20, "11.40", null);
        participar(cDetergente, donaRosa, 20, "11.40", null);
        participar(cDetergente, ahorroN, 16, "11.40", null);
        aviso(cDetergente, "Ya se llegó al mínimo. Estamos revisando el precio final con el volumen reunido.", ahora.minusDays(1));

        // 3. Vasos: confirmada, con Bodega Rosita dentro. Sirve para mostrar el seguimiento de la entrega.
        CompraConjunta cVasos = compra(vasos, "sa-centro", Estado.CONFIRMADA, hoy.minusDays(1),
                hoy.plusDays(1), hoy.plusDays(1), new BigDecimal("7.48"), new BigDecimal("3.00"),
                "Si llega tarde, 5 % de descuento en el pedido", ahora.minusDays(1));
        cVasos.entregaEstado = CompraConjunta.EntregaEstado.EN_PREPARACION;
        compras.save(cVasos);
        participar(cVasos, esquina, 18, "7.48", null);
        participar(cVasos, pilar, 18, "7.48", null);
        participar(cVasos, lucho, 12, "7.48", null);
        Necesidad nVasos = necesidad(rosita, vasos, 6, new BigDecimal("8.50"), hoy.plusDays(2), Necesidad.Estado.EN_COMPRA,
                "6 paquetes de vasos", ahora.minusDays(4));
        participar(cVasos, rosita, 6, "7.90", nVasos.id).precioAceptado = true;
        aviso(cVasos, "Precio confirmado: S/ 7.48 por paquete. Tenemos stock para el lote completo.", ahora.minusDays(1));

        // 4. Arroz: no se concretó (cerró sin llegar al mínimo).
        CompraConjunta cArroz = compra(arroz, "sa-centro", Estado.VENCIDA, hoy.minusDays(2),
                hoy.minusDays(1), hoy.plusDays(1), null, null, null, ahora.minusDays(2));
        participar(cArroz, lucho, 25, "4.20", null);
        participar(cArroz, sanMartin, 20, "4.20", null);
        participar(cArroz, donaRosa, 15, "4.20", null);

        // Pedidos de Bodega Rosita: aceite coincide con la compra abierta; leche aún no tiene compra (se puede proponer).
        necesidad(rosita, aceite, 12, new BigDecimal("7.90"), hoy.plusDays(6), Necesidad.Estado.ACTIVA,
                "12 botellas de aceite", ahora.minusHours(20));
        necesidad(rosita, leche, 48, null, hoy.plusDays(10), Necesidad.Estado.ACTIVA,
                "una caja de leche evaporada", ahora.minusHours(3));

        notificacion(ana.id, "COMPRA", "Se formó una compra de aceite vegetal con 3 bodegas de tu zona.", "/compras/" + cAceite.id, false, ahora.minusHours(1));
        notificacion(ana.id, "COMPRA", "¡Compra de vasos descartables confirmada! Precio final S/ 7.48.", "/compras/" + cVasos.id, false, ahora.minusDays(1));
        notificacion(ana.id, "PEDIDO", "Tu pedido de aceite coincide con una compra conjunta. Revísala.", "/pedidos", false, ahora.minusHours(20));
        notificacion(ana.id, "BIENVENIDA", "Bienvenida a NEXORA. Tú decides si participas en cada compra conjunta.", "/", true, ahora.minusDays(20));
    }

    /** Agrega la cuenta del proveedor de prueba a una base cargada antes de que existiera ese perfil. */
    @Transactional
    public boolean asegurarProveedorDemo() {
        if (usuarios.existsByEmailIgnoreCase(CORREO_PROVEEDOR)) {
            return false;
        }
        return proveedores.findFirstByRazonSocialStartingWith("Distribuidora Andina")
                .filter(p -> p.usuarioId == null)
                .map(p -> {
                    cuentaProveedor(p, reloj.ahora());
                    return true;
                })
                .orElse(false);
    }

    private void cuentaProveedor(Proveedor p, LocalDateTime creado) {
        Usuario u = new Usuario();
        u.email = CORREO_PROVEEDOR;
        u.passwordHash = codificador.encode(CLAVE_PROVEEDOR);
        u.rol = Usuario.Rol.PROVEEDOR.name();
        u.estado = "ACTIVO";
        u.creadoEn = creado;
        usuarios.save(u);
        p.usuarioId = u.id;
        proveedores.save(p);
    }

    // ---------- Constructores pequeños ----------

    private Proveedor proveedor(String razon, String ruc, String estado, int aTiempo, int total) {
        Proveedor p = new Proveedor();
        p.razonSocial = razon;
        p.ruc = ruc;
        p.estado = estado;
        p.entregasATiempo = aTiempo;
        p.entregasTotal = total;
        return proveedores.save(p);
    }

    private record T(int desde, Integer hasta, String precio) {
    }

    private static T tramo(int desde, Integer hasta, String precio) {
        return new T(desde, hasta, precio);
    }

    private Producto producto(Proveedor prov, String categoria, String nombre, String marca, String presentacion,
                              String unidad, String unidadVenta, int equivalencia, String palabras, int minimo,
                              int plazo, String zonasTexto, String imagen, T... lista) {
        Producto p = new Producto();
        p.proveedorId = prov.id;
        p.categoriaId = categoria;
        p.nombre = nombre;
        p.marca = marca;
        p.presentacion = presentacion;
        p.unidad = unidad;
        p.unidadVenta = unidadVenta;
        p.equivalencia = equivalencia;
        p.palabrasClave = palabras;
        p.minimo = minimo;
        p.plazoEntrega = plazo;
        p.zonas = zonasTexto;
        p.imagen = imagen;
        p.activo = true;
        productos.save(p);
        for (T t : lista) {
            tramos.save(new TramoPrecio(p.id, t.desde(), t.hasta(), new BigDecimal(t.precio())));
        }
        return p;
    }

    private Negocio negocio(Long usuarioId, String nombre, String responsable, String celular, String zonaId, String direccion) {
        Negocio n = new Negocio();
        n.usuarioId = usuarioId;
        n.nombre = nombre;
        n.responsable = responsable;
        n.celular = celular;
        n.zonaId = zonaId;
        n.distrito = zonas.findById(zonaId).map(z -> z.distrito).orElse("");
        n.direccion = direccion;
        return negocios.save(n);
    }

    private CompraConjunta compra(Producto p, String zonaId, Estado estado, LocalDate cierre, LocalDate desde,
                                  LocalDate hasta, BigDecimal precioFinal, BigDecimal transporte, String compensacion,
                                  LocalDateTime estadoDesde) {
        CompraConjunta c = new CompraConjunta();
        c.productoId = p.id;
        c.proveedorId = p.proveedorId;
        c.zonaId = zonaId;
        c.estado = estado;
        c.estadoDesde = estadoDesde;
        c.fechaCierre = cierre;
        c.entregaDesde = desde;
        c.entregaHasta = hasta;
        c.precioFinal = precioFinal;
        c.costoTransporte = transporte;
        c.compensacion = compensacion;
        c.creadaEn = estadoDesde.minusDays(1);
        return compras.save(c);
    }

    private Participacion participar(CompraConjunta c, Negocio n, int cantidad, String precio, Long necesidadId) {
        Participacion p = new Participacion();
        p.compraId = c.id;
        p.negocioId = n.id;
        p.necesidadId = necesidadId;
        p.cantidad = cantidad;
        p.estado = Participacion.Estado.ACTIVA;
        p.precioEstimado = new BigDecimal(precio);
        p.precioAceptado = c.estado == Estado.CONFIRMADA;
        p.recibido = false;
        p.creadaEn = c.estadoDesde.minusHours(6);
        return participaciones.save(p);
    }

    private Necesidad necesidad(Negocio n, Producto p, int cantidad, BigDecimal precio, LocalDate requerida,
                                Necesidad.Estado estado, String texto, LocalDateTime creada) {
        Necesidad x = new Necesidad();
        x.negocioId = n.id;
        x.productoId = p.id;
        x.cantidad = cantidad;
        x.precioActual = precio;
        x.fechaRequerida = requerida;
        x.estado = estado;
        x.textoOriginal = texto;
        x.aceptaEquivalente = true;
        x.creadaEn = creada;
        return necesidades.save(x);
    }

    private void aviso(CompraConjunta c, String texto, LocalDateTime cuando) {
        Aviso a = new Aviso();
        a.compraId = c.id;
        a.texto = texto;
        a.creadoEn = cuando;
        avisos.save(a);
    }

    private void notificacion(Long usuarioId, String tipo, String texto, String enlace, boolean leida, LocalDateTime cuando) {
        Notificacion n = new Notificacion();
        n.usuarioId = usuarioId;
        n.tipo = tipo;
        n.texto = texto;
        n.enlace = enlace;
        n.leida = leida;
        n.creadaEn = cuando;
        notificacionesRepo.save(n);
    }

    // ======================================================================
    // Herramientas de prueba (se usan desde el panel del proveedor, sección «Datos de prueba»)
    // ======================================================================

    /** Otra bodega de la zona se une (para mostrar en vivo el cambio de tramo). */
    @Transactional
    public void sumarBodega(Long compraId, int cantidad) {
        CompraConjunta c = compraServicio.cargar(compraId);
        if (!c.estado.permiteUnirse()) {
            throw ApiException.conflicto("La compra ya no acepta negocios.");
        }
        long n = negocios.count() + 1;
        Negocio simulada = negocio(null, "Bodega simulada " + n, "Demo", "900000000", c.zonaId, "Demo");
        Producto p = productos.findById(c.productoId).orElseThrow();
        int total = vistas.total(c.id) + cantidad;
        BigDecimal precio = ReglasCompra.resumen(vistas.tramosDe(p.id), total, p.minimo).precioActual();
        participar(c, simulada, cantidad, precio.toPlainString(), null);
        notificaciones.avisarParticipantes(c.id, simulada.id, "COMPRA",
                "Una bodega de tu zona se unió a la compra de " + p.nombre.toLowerCase() + " con " + cantidad + " " + p.unidad + ".");
        compraServicio.refrescar(c);
    }

    /** Cierra la compra ya (fecha de cierre = ayer) para mostrar «No se concretó». */
    @Transactional
    public void vencer(Long compraId) {
        CompraConjunta c = compraServicio.cargar(compraId);
        if (!c.estado.pendiente()) {
            throw ApiException.conflicto("Solo se puede vencer una compra que aún no está confirmada.");
        }
        c.fechaCierre = reloj.hoy().minusDays(1);
        compras.save(c);
        compraServicio.refrescar(c);
    }
}
