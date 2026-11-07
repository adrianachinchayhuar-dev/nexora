package pe.nexora.reglas;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Reglas de una compra conjunta. Clase pura (sin Spring ni base de datos) para poder probarla sola.
 * Es la misma lógica del prototipo (NexoraCompra en datos-demo.js) llevada a Java.
 */
public final class ReglasCompra {

    private ReglasCompra() {
    }

    /** Estados internos del ciclo de vida (Figura 6 de la tesis). */
    public enum Estado {
        PROPUESTA, BUSCANDO_PARTICIPANTES, EN_COTIZACION, PRECIO_POR_ACEPTAR, CONFIRMADA, CANCELADA, VENCIDA;

        public boolean pendiente() {
            return this == PROPUESTA || this == BUSCANDO_PARTICIPANTES || this == EN_COTIZACION || this == PRECIO_POR_ACEPTAR;
        }

        public boolean permiteUnirse() {
            return this == PROPUESTA || this == BUSCANDO_PARTICIPANTES || this == EN_COTIZACION;
        }
    }

    /** Las cuatro etiquetas que ve el bodeguero. */
    public enum Visible {
        REUNIENDO("Reuniendo negocios"),
        ESPERANDO_PROVEEDOR("Esperando confirmación del proveedor"),
        CONFIRMADA("Confirmada"),
        NO_SE_CONCRETO("No se concretó");

        public final String texto;

        Visible(String texto) {
            this.texto = texto;
        }
    }

    public enum EtiquetaAhorro { REFERENCIAL, PRELIMINAR, CONFIRMADO }

    public record Tramo(int desde, Integer hasta, BigDecimal precio) {
    }

    public record Resumen(int total, int indiceTramo, int totalTramos, BigDecimal precioActual, BigDecimal precioNormal,
                          int minimo, boolean alcanzaMinimo, int faltaMinimo, Integer faltanSiguiente,
                          BigDecimal precioSiguiente) {
    }

    public record Ahorro(BigDecimal monto, EtiquetaAhorro etiqueta, BigDecimal precioReferencia, BigDecimal precioCompra) {
    }

    /** Fechas de una compra nueva: cierre, inicio y fin de la entrega. */
    public record Fechas(LocalDate cierre, LocalDate entregaDesde, LocalDate entregaHasta) {
    }

    public static Visible visible(Estado e) {
        return switch (e) {
            case PROPUESTA, BUSCANDO_PARTICIPANTES -> Visible.REUNIENDO;
            case EN_COTIZACION, PRECIO_POR_ACEPTAR -> Visible.ESPERANDO_PROVEEDOR;
            case CONFIRMADA -> Visible.CONFIRMADA;
            case CANCELADA, VENCIDA -> Visible.NO_SE_CONCRETO;
        };
    }

    public static List<Tramo> ordenar(List<Tramo> tramos) {
        return tramos.stream().sorted(Comparator.comparingInt(Tramo::desde)).toList();
    }

    /** Índice del tramo alcanzado por la cantidad total (el primero si no se alcanza ninguno). */
    public static int indiceTramo(List<Tramo> tramos, int total) {
        List<Tramo> lista = ordenar(tramos);
        int indice = 0;
        for (int i = 0; i < lista.size(); i++) {
            if (total >= lista.get(i).desde()) {
                indice = i;
            }
        }
        return indice;
    }

    public static Resumen resumen(List<Tramo> tramos, int total, int minimo) {
        if (tramos == null || tramos.isEmpty()) {
            throw new IllegalArgumentException("La compra no tiene precios por tramos");
        }
        List<Tramo> lista = ordenar(tramos);
        int i = indiceTramo(lista, total);
        Tramo actual = lista.get(i);
        Tramo siguiente = i + 1 < lista.size() ? lista.get(i + 1) : null;
        return new Resumen(total, i, lista.size(), actual.precio(), lista.get(0).precio(), minimo, total >= minimo,
                Math.max(0, minimo - total),
                siguiente == null ? null : siguiente.desde() - total,
                siguiente == null ? null : siguiente.precio());
    }

    /**
     * Estado después de un cambio de cantidad o de fecha.
     * Al alcanzar el mínimo pasa a esperar la confirmación del proveedor; si un retiro la deja por debajo, vuelve a reunir negocios.
     * Unirse nunca confirma la compra (decisión D3). Si venció el cierre sin confirmar, no se concreta.
     */
    public static Estado recalcular(Estado actual, int total, int minimo, boolean abierta) {
        if (!actual.pendiente()) {
            return actual;
        }
        if (!abierta) {
            return Estado.VENCIDA;
        }
        boolean alcanza = total >= minimo;
        if (alcanza && (actual == Estado.PROPUESTA || actual == Estado.BUSCANDO_PARTICIPANTES)) {
            return Estado.EN_COTIZACION;
        }
        if (!alcanza && (actual == Estado.EN_COTIZACION || actual == Estado.PRECIO_POR_ACEPTAR)) {
            return Estado.BUSCANDO_PARTICIPANTES;
        }
        if (actual == Estado.PROPUESTA && total > 0) {
            return Estado.BUSCANDO_PARTICIPANTES;
        }
        return actual;
    }

    /** La entrega llega a tiempo si su último día es igual o anterior a la fecha requerida. */
    public static boolean llegaATiempo(LocalDate entregaHasta, LocalDate requerida) {
        return entregaHasta == null || requerida == null || !entregaHasta.isAfter(requerida);
    }

    /** Si el precio final no supera al estimado, se acepta automáticamente. */
    public static boolean aceptaSolo(BigDecimal precioFinal, BigDecimal precioEstimado) {
        return precioFinal.compareTo(precioEstimado) <= 0;
    }

    /**
     * Ahorro neto estimado = cantidad × (precio de referencia − precio de la compra) − costo de transporte conocido.
     * Sin precio individual se usa el primer tramo y el ahorro es referencial.
     */
    public static Ahorro ahorro(int cantidad, BigDecimal precioIndividual, BigDecimal precioPrimerTramo,
                                BigDecimal precioCompra, BigDecimal costoTransporte, boolean precioConfirmado) {
        BigDecimal referencia = precioIndividual != null ? precioIndividual : precioPrimerTramo;
        BigDecimal monto = referencia.subtract(precioCompra).multiply(BigDecimal.valueOf(cantidad));
        if (costoTransporte != null) {
            monto = monto.subtract(costoTransporte);
        }
        EtiquetaAhorro etiqueta;
        if (precioIndividual == null) {
            etiqueta = EtiquetaAhorro.REFERENCIAL;
        } else if (precioConfirmado && costoTransporte != null) {
            etiqueta = EtiquetaAhorro.CONFIRMADO;
        } else {
            etiqueta = EtiquetaAhorro.PRELIMINAR;
        }
        return new Ahorro(monto.setScale(2, RoundingMode.HALF_UP), etiqueta, referencia, precioCompra);
    }

    /**
     * Fechas para proponer una compra nueva: cierra a más tardar en 5 días y antes de que la entrega deje de llegar a tiempo.
     * Devuelve null si con el plazo del proveedor ya no llega a tiempo.
     */
    public static Fechas fechasPropuesta(LocalDate hoy, LocalDate requerida, int plazoEntrega) {
        int plazo = Math.max(1, plazoEntrega);
        LocalDate ultimoCierre = requerida.minusDays(plazo);
        if (ultimoCierre.isBefore(hoy)) {
            return null;
        }
        LocalDate cierre = ultimoCierre.isBefore(hoy.plusDays(5)) ? ultimoCierre : hoy.plusDays(5);
        LocalDate desde = cierre.plusDays(1);
        LocalDate hasta = cierre.plusDays(plazo);
        if (desde.isAfter(hasta)) {
            desde = hasta;
        }
        return new Fechas(cierre, desde, hasta);
    }

    /** Puntualidad del proveedor en porcentaje entero; null si aún no tiene entregas. */
    public static Integer puntualidad(int aTiempo, int total) {
        if (total <= 0) {
            return null;
        }
        return Math.round(aTiempo * 100f / total);
    }
}
