package pe.nexora.servicio;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.nexora.config.Reloj;
import pe.nexora.dominio.Negocio;
import pe.nexora.web.Dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Resumen de la pantalla de inicio del bodeguero. */
@Service
public class InicioServicio {
    private final CompraServicio compras;
    private final NecesidadServicio necesidades;
    private final NotificacionServicio notificaciones;
    private final Reloj reloj;

    public InicioServicio(CompraServicio compras, NecesidadServicio necesidades, NotificacionServicio notificaciones,
                          Reloj reloj) {
        this.compras = compras;
        this.necesidades = necesidades;
        this.notificaciones = notificaciones;
        this.reloj = reloj;
    }

    @Transactional
    public Dto.InicioVista inicio(Negocio yo) {
        LocalDate hoy = reloj.hoy();
        List<Dto.CompraVista> zona = compras.listar(yo, null);
        List<Dto.CompraVista> mias = zona.stream().filter(c -> c.miParticipacion() != null).toList();
        List<Dto.NecesidadVista> pedidos = necesidades.listar(yo);

        int pedidosActivos = (int) pedidos.stream()
                .filter(n -> n.estado().equals("ACTIVA") || n.estado().equals("EN_COMPRA")).count();
        List<Dto.CompraVista> activas = mias.stream()
                .filter(c -> !c.estadoVisible().clave().equals("NO_SE_CONCRETO"))
                .filter(c -> !c.miParticipacion().recibido())
                .toList();
        BigDecimal ahorro = activas.stream()
                .map(c -> c.miParticipacion().ahorro().monto())
                .filter(m -> m.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Dto.FechaProxima> fechas = new ArrayList<>();
        for (Dto.CompraVista c : activas) {
            String producto = c.producto().nombre().toLowerCase();
            boolean pendiente = !c.estadoVisible().clave().equals("CONFIRMADA");
            if (pendiente && !c.fechaCierre().isBefore(hoy)) {
                fechas.add(new Dto.FechaProxima("CIERRE", c.fechaCierre(), c.id(), "Cierra la compra de " + producto));
            }
            if (!c.entregaHasta().isBefore(hoy)) {
                fechas.add(new Dto.FechaProxima("ENTREGA", c.entregaHasta(), c.id(),
                        (pendiente ? "Entrega estimada de " : "Llega tu pedido de ") + producto));
            }
        }
        for (Dto.NecesidadVista n : pedidos) {
            if (n.estado().equals("ACTIVA") && !n.fechaRequerida().isBefore(hoy)) {
                fechas.add(new Dto.FechaProxima("REQUERIDA", n.fechaRequerida(), null,
                        "Necesitas " + n.producto().nombre().toLowerCase()));
            }
        }
        fechas.sort(Comparator.comparing(Dto.FechaProxima::fecha));

        List<Dto.NecesidadVista> conCompra = pedidos.stream()
                .filter(n -> n.coincidencia() != null && n.coincidencia().tipo().equals("COMPRA"))
                .limit(3).toList();
        List<Dto.CompraVista> cercanas = zona.stream()
                .filter(c -> c.miParticipacion() == null && c.puedeUnirse())
                .limit(3).toList();

        return new Dto.InicioVista(saludo(yo), pedidosActivos, activas.size(), ahorro,
                (int) notificaciones.sinLeer(yo.usuarioId), fechas.stream().limit(6).toList(), conCompra, cercanas);
    }

    private String saludo(Negocio yo) {
        int hora = reloj.ahora().getHour();
        String parte = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
        String nombre = yo.responsable == null ? "" : yo.responsable.trim().split("\\s+")[0];
        return nombre.isEmpty() ? parte : parte + ", " + nombre;
    }
}
