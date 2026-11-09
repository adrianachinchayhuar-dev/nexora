package pe.nexora.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Objetos que entran y salen de la API. */
public final class Dto {
    private Dto() {
    }

    // ---------- Cuenta ----------

    public record RegistroRequest(
            @NotBlank(message = "Escribe el nombre de tu negocio.") @Size(max = 120) String nombreNegocio,
            @NotBlank(message = "Escribe el nombre del responsable.") @Size(max = 120) String responsable,
            @NotBlank(message = "Escribe tu celular.") @Pattern(regexp = "9\\d{8}", message = "El celular debe tener 9 dígitos y empezar con 9.") String celular,
            @NotBlank(message = "Escribe tu correo.") @Email(message = "El correo no es válido.") String email,
            @NotBlank(message = "Crea una contraseña.") @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres.") String password,
            @NotBlank(message = "Elige tu zona.") String zonaId,
            @NotBlank(message = "Escribe la dirección del negocio.") @Size(max = 200) String direccion) {
    }

    public record LoginRequest(@NotBlank(message = "Escribe tu correo.") String email,
                               @NotBlank(message = "Escribe tu contraseña.") String password) {
    }

    public record ZonaVista(String id, String distrito, String nombre) {
    }

    public record NegocioVista(Long id, String nombre, String responsable, String celular, String distrito,
                               ZonaVista zona, String direccion, String ruc, String descripcion, String horario) {
    }

    /** proveedor: razón social, solo para cuentas con perfil PROVEEDOR. */
    public record CuentaVista(Long usuarioId, String email, String rol, NegocioVista negocio, String proveedor) {
    }

    public record SesionVista(String token, CuentaVista cuenta) {
    }

    public record PerfilRequest(
            @NotBlank(message = "Escribe el nombre de tu negocio.") @Size(max = 120) String nombre,
            @NotBlank(message = "Escribe el nombre del responsable.") @Size(max = 120) String responsable,
            @NotBlank @Pattern(regexp = "9\\d{8}", message = "El celular debe tener 9 dígitos y empezar con 9.") String celular,
            @NotBlank(message = "Elige tu zona.") String zonaId,
            @NotBlank(message = "Escribe la dirección del negocio.") @Size(max = 200) String direccion,
            @Pattern(regexp = "^$|\\d{11}", message = "El RUC debe tener 11 dígitos.") String ruc,
            @Size(max = 300) String descripcion,
            @Size(max = 120) String horario) {
    }

    // ---------- Catálogo ----------

    public record TramoVista(int desde, Integer hasta, BigDecimal precio) {
    }

    public record ProveedorVista(Long id, String razonSocial, Integer puntualidad, int entregasATiempo,
                                 int entregasTotal) {
    }

    public record ProductoVista(Long id, String nombre, String marca, String presentacion, String categoriaId,
                                String categoria, String unidad, String unidadVenta, int equivalencia,
                                String imagen, int minimo, int plazoEntrega, ProveedorVista proveedor,
                                List<TramoVista> tramos, BigDecimal precioDesde, BigDecimal precioHasta,
                                CompraCorta compraAbierta) {
    }

    /** Resumen de la compra abierta de un producto en la zona del negocio. */
    public record CompraCorta(Long id, String estadoVisible, LocalDate fechaCierre, LocalDate entregaHasta,
                              BigDecimal precioActual, int total, int minimo) {
    }

    public record CategoriaVista(String id, String nombre) {
    }

    // ---------- Necesidades (pedidos) ----------

    public record InterpretarRequest(@NotBlank(message = "Escribe tu pedido.") @Size(max = 500) String texto) {
    }

    public record ItemInterpretado(String fragmento, Long productoId, String productoNombre, Integer cantidad,
                                   String unidad, String confianza, String nota) {
    }

    public record NecesidadItem(@NotNull(message = "Elige el producto.") Long productoId,
                                @NotNull(message = "Indica la cantidad.") @Positive(message = "La cantidad debe ser mayor que cero.") @Max(value = 10000, message = "La cantidad es demasiado alta.") Integer cantidad,
                                @Size(max = 80) String marcaPreferida,
                                Boolean aceptaEquivalente,
                                @Positive(message = "El precio debe ser mayor que cero.") BigDecimal precioActual,
                                @Size(max = 300) String textoOriginal) {
    }

    public record CrearNecesidadesRequest(@NotEmpty(message = "Agrega al menos un producto.") List<@Valid NecesidadItem> items,
                                          @NotNull(message = "Indica para cuándo lo necesitas.") @FutureOrPresent(message = "La fecha no puede ser pasada.") LocalDate fechaRequerida) {
    }

    public record EditarNecesidadRequest(@NotNull @Positive(message = "La cantidad debe ser mayor que cero.") Integer cantidad,
                                         @NotNull @FutureOrPresent(message = "La fecha no puede ser pasada.") LocalDate fechaRequerida,
                                         @Size(max = 80) String marcaPreferida,
                                         Boolean aceptaEquivalente,
                                         @Positive BigDecimal precioActual) {
    }

    /**
     * Resultado de buscar una compra para un pedido.
     * tipo: UNIDO, COMPRA (hay una abierta que llega a tiempo), TARDE, MARCA, PROPONER (no hay compra, pero se puede crear), SIN_OFERTA.
     */
    public record Coincidencia(String tipo, Long compraId, String mensaje) {
    }

    public record NecesidadVista(Long id, ProductoVista producto, int cantidad, String marcaPreferida,
                                 boolean aceptaEquivalente, BigDecimal precioActual, LocalDate fechaRequerida,
                                 String estado, String textoOriginal, LocalDateTime creadaEn,
                                 Coincidencia coincidencia) {
    }

    // ---------- Compras conjuntas ----------

    public record EstadoVisible(String clave, String texto) {
    }

    public record ResumenVista(int indiceTramo, BigDecimal precioActual, BigDecimal precioNormal,
                               boolean alcanzaMinimo, int faltaMinimo, Integer faltanSiguiente,
                               BigDecimal precioSiguiente) {
    }

    public record AhorroVista(BigDecimal monto, String etiqueta, BigDecimal precioReferencia, BigDecimal precioCompra) {
    }

    public record IncidenciaVista(Long id, Long compraId, String producto, String motivo, String descripcion,
                                  String estado, String respuesta, LocalDateTime creadaEn) {
    }

    public record MiParticipacion(Long id, int cantidad, BigDecimal precioEstimado, boolean precioAceptado,
                                  boolean debeAceptarPrecio, boolean recibido, Long necesidadId,
                                  LocalDate fechaRequerida, boolean llegaATiempo, AhorroVista ahorro,
                                  List<IncidenciaVista> incidencias) {
    }

    /** «Si te unes con X»: cómo quedaría la compra. */
    public record Simulacion(int cantidad, int totalConmigo, BigDecimal precioConmigo, boolean alcanzaMinimo,
                             AhorroVista ahorro, boolean llegaATiempo) {
    }

    public record NecesidadCompatible(Long id, int cantidad, LocalDate fechaRequerida, boolean llegaATiempo,
                                      BigDecimal precioActual) {
    }

    public record AvisoVista(String texto, LocalDateTime creadoEn) {
    }

    public record CompraVista(Long id, ProductoVista producto, ProveedorVista proveedor, ZonaVista zona,
                              String estado, EstadoVisible estadoVisible, LocalDateTime estadoDesde,
                              LocalDate hoy, LocalDate fechaCierre, LocalDate entregaDesde, LocalDate entregaHasta,
                              List<TramoVista> tramos, int minimo, int total, int negocios, int otrasBodegas,
                              ResumenVista resumen, BigDecimal precioFinal, BigDecimal costoTransporte,
                              String compensacion, String entregaEstado, boolean puedeUnirse,
                              String motivoNoUnirse, MiParticipacion miParticipacion, Simulacion simulacion,
                              List<NecesidadCompatible> necesidadesCompatibles, List<AvisoVista> avisos) {
    }

    public record UnirseRequest(Long necesidadId,
                                @NotNull(message = "Indica la cantidad.") @Positive(message = "La cantidad debe ser mayor que cero.") @Max(value = 10000) Integer cantidad) {
    }

    public record IncidenciaRequest(@NotBlank(message = "Elige el motivo.") String motivo,
                                    @NotBlank(message = "Cuéntanos brevemente qué pasó.") @Size(min = 5, max = 500, message = "La descripción debe tener entre 5 y 500 caracteres.") String descripcion) {
    }

    // ---------- Inicio ----------

    public record FechaProxima(String tipo, LocalDate fecha, Long compraId, String texto) {
    }

    public record InicioVista(String saludo, int pedidosActivos, int comprasActivas, BigDecimal ahorroEstimado,
                              int notificacionesSinLeer, List<FechaProxima> proximasFechas,
                              List<NecesidadVista> pedidosConCompra, List<CompraVista> comprasCercanas) {
    }

    // ---------- Notificaciones ----------

    public record NotificacionVista(Long id, String tipo, String texto, String enlace, boolean leida,
                                    LocalDateTime creadaEn) {
    }

    public record NotificacionesVista(long sinLeer, List<NotificacionVista> lista) {
    }

    // ---------- Perfil proveedor ----------

    /** Negocio que participa; sus datos solo se muestran cuando la compra está confirmada (privacidad). */
    public record ParticipanteVista(String negocio, String direccion, String celular, int cantidad, boolean recibido) {
    }

    public record IncidenciaProveedorVista(Long id, String negocio, String motivo, String descripcion, String estado,
                                           String respuesta, LocalDateTime creadaEn) {
    }

    public record CompraProveedorVista(Long id, String producto, String presentacion, String unidad, String imagen,
                                       ZonaVista zona, String estado, EstadoVisible estadoVisible, String tuTurno,
                                       LocalDate fechaCierre, LocalDate entregaDesde, LocalDate entregaHasta,
                                       int total, int minimo, int negocios, BigDecimal precioActual,
                                       List<TramoVista> tramos, BigDecimal precioFinal, BigDecimal costoTransporte,
                                       String compensacion, String entregaEstado, boolean puedeConfirmar,
                                       boolean puedeAvanzarEntrega, int aceptaronPrecio,
                                       List<ParticipanteVista> participantes, List<AvisoVista> avisos,
                                       List<IncidenciaProveedorVista> incidencias) {
    }

    public record PanelProveedorVista(String razonSocial, String ruc, Integer puntualidad, int entregasATiempo,
                                      int entregasTotal, int porConfirmar, int enCurso, int incidenciasAbiertas,
                                      int mensajesSinLeer, int preguntasSinResponder,
                                      List<CompraProveedorVista> compras) {
    }

    public record AvisoRequest(@NotBlank(message = "Escribe el aviso.") @Size(max = 300) String texto) {
    }

    public record RespuestaIncidenciaRequest(@NotBlank(message = "Escribe tu respuesta.") @Size(max = 500) String respuesta,
                                             @NotBlank String estado) {
    }

    // ---------- Mensajería: preguntas anónimas y chat privado ----------

    public record TextoRequest(@NotBlank(message = "Escribe el mensaje.") @Size(max = 500, message = "El mensaje es demasiado largo.") String texto) {
    }

    /** mia: la hizo el negocio que consulta (solo él lo sabe; para los demás es anónima). */
    public record PreguntaVista(Long id, String texto, String respuesta, boolean mia, LocalDateTime creadaEn,
                                LocalDateTime respondidaEn) {
    }

    /** autor: NEGOCIO o PROVEEDOR. */
    public record ChatMensaje(Long id, String autor, String texto, LocalDateTime creadoEn) {
    }

    public record MensajesCompraVista(Long compraId, String producto, String proveedor, boolean puedeEscribir,
                                      List<PreguntaVista> preguntas, List<ChatMensaje> chat) {
    }

    public record ConversacionVista(Long compraId, String producto, String imagen, String contraparte, Long negocioId,
                                    String ultimo, String ultimoAutor, LocalDateTime fecha, int sinLeer,
                                    int preguntas, int preguntasSinResponder) {
    }

    public record BandejaVista(int sinLeer, List<ConversacionVista> conversaciones) {
    }

    public record PreguntaProveedorVista(Long id, Long compraId, String producto, String texto, String respuesta,
                                         LocalDateTime creadaEn) {
    }

    public record BandejaProveedorVista(int sinLeer, int preguntasSinResponder, List<ConversacionVista> conversaciones,
                                        List<PreguntaProveedorVista> preguntas) {
    }

    public record ChatProveedorVista(Long compraId, Long negocioId, String producto, String negocio,
                                     List<ChatMensaje> mensajes) {
    }

    // ---------- Acciones del proveedor y datos de prueba ----------

    public record ConfirmarRequest(@Positive BigDecimal precioFinal, LocalDate entregaDesde, LocalDate entregaHasta,
                                   @Min(0) BigDecimal costoTransporte, @Size(max = 160) String compensacion) {
    }

    public record EntregaRequest(@NotBlank String estado) {
    }

    public record SumarBodegaRequest(@NotNull @Positive @Max(1000) Integer cantidad) {
    }

    public record MensajeVista(String mensaje) {
    }

}
