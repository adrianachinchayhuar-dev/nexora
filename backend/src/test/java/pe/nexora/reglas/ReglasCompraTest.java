package pe.nexora.reglas;

import org.junit.jupiter.api.Test;
import pe.nexora.reglas.ReglasCompra.Estado;
import pe.nexora.reglas.ReglasCompra.EtiquetaAhorro;
import pe.nexora.reglas.ReglasCompra.Tramo;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReglasCompraTest {

    // Aceite 1 L del prototipo: 1–49 a S/ 7.80, 50–99 a S/ 7.00, 100 o más a S/ 6.40; mínimo 50.
    private static final List<Tramo> ACEITE = List.of(
            new Tramo(100, null, new BigDecimal("6.40")),
            new Tramo(1, 49, new BigDecimal("7.80")),
            new Tramo(50, 99, new BigDecimal("7.00")));

    @Test
    void tramoSegunCantidadTotal() {
        assertEquals(0, ReglasCompra.indiceTramo(ACEITE, 38));
        assertEquals(1, ReglasCompra.indiceTramo(ACEITE, 50));
        assertEquals(2, ReglasCompra.indiceTramo(ACEITE, 120));
    }

    @Test
    void resumenIndicaCuantoFaltaParaElMinimoYElSiguienteTramo() {
        ReglasCompra.Resumen r = ReglasCompra.resumen(ACEITE, 38, 50);
        assertEquals(new BigDecimal("7.80"), r.precioActual());
        assertFalse(r.alcanzaMinimo());
        assertEquals(12, r.faltaMinimo());
        assertEquals(12, r.faltanSiguiente());
        assertEquals(new BigDecimal("7.00"), r.precioSiguiente());

        ReglasCompra.Resumen tope = ReglasCompra.resumen(ACEITE, 130, 50);
        assertEquals(new BigDecimal("6.40"), tope.precioActual());
        assertNull(tope.faltanSiguiente());
    }

    @Test
    void alcanzarElMinimoPasaAEsperarAlProveedorYUnRetiroLoRegresa() {
        assertEquals(Estado.EN_COTIZACION, ReglasCompra.recalcular(Estado.BUSCANDO_PARTICIPANTES, 50, 50, true));
        assertEquals(Estado.BUSCANDO_PARTICIPANTES, ReglasCompra.recalcular(Estado.EN_COTIZACION, 49, 50, true));
        assertEquals(Estado.BUSCANDO_PARTICIPANTES, ReglasCompra.recalcular(Estado.PRECIO_POR_ACEPTAR, 10, 50, true));
        assertEquals(Estado.BUSCANDO_PARTICIPANTES, ReglasCompra.recalcular(Estado.PROPUESTA, 12, 50, true));
    }

    @Test
    void unirseNuncaConfirmaYLasCerradasNoCambian() {
        assertEquals(Estado.EN_COTIZACION, ReglasCompra.recalcular(Estado.EN_COTIZACION, 500, 50, true));
        assertEquals(Estado.CONFIRMADA, ReglasCompra.recalcular(Estado.CONFIRMADA, 0, 50, false));
        assertEquals(Estado.VENCIDA, ReglasCompra.recalcular(Estado.BUSCANDO_PARTICIPANTES, 60, 50, false));
    }

    @Test
    void cuatroEtiquetasVisibles() {
        assertEquals(ReglasCompra.Visible.REUNIENDO, ReglasCompra.visible(Estado.PROPUESTA));
        assertEquals(ReglasCompra.Visible.ESPERANDO_PROVEEDOR, ReglasCompra.visible(Estado.PRECIO_POR_ACEPTAR));
        assertEquals(ReglasCompra.Visible.CONFIRMADA, ReglasCompra.visible(Estado.CONFIRMADA));
        assertEquals(ReglasCompra.Visible.NO_SE_CONCRETO, ReglasCompra.visible(Estado.VENCIDA));
        assertEquals("Esperando confirmación del proveedor", ReglasCompra.Visible.ESPERANDO_PROVEEDOR.texto);
    }

    @Test
    void llegaATiempoCuentaElUltimoDiaDeLaEntrega() {
        LocalDate requerida = LocalDate.of(2026, 11, 20);
        assertTrue(ReglasCompra.llegaATiempo(LocalDate.of(2026, 11, 20), requerida));
        assertFalse(ReglasCompra.llegaATiempo(LocalDate.of(2026, 11, 21), requerida));
    }

    @Test
    void precioFinalIgualOMenorSeAceptaSolo() {
        assertTrue(ReglasCompra.aceptaSolo(new BigDecimal("7.00"), new BigDecimal("7.00")));
        assertTrue(ReglasCompra.aceptaSolo(new BigDecimal("6.90"), new BigDecimal("7.00")));
        assertFalse(ReglasCompra.aceptaSolo(new BigDecimal("7.20"), new BigDecimal("7.00")));
    }

    @Test
    void ahorroReferencialPreliminarYConfirmado() {
        ReglasCompra.Ahorro referencial = ReglasCompra.ahorro(12, null, new BigDecimal("7.80"), new BigDecimal("7.00"), null, false);
        assertEquals(new BigDecimal("9.60"), referencial.monto());
        assertEquals(EtiquetaAhorro.REFERENCIAL, referencial.etiqueta());

        ReglasCompra.Ahorro preliminar = ReglasCompra.ahorro(12, new BigDecimal("7.90"), new BigDecimal("7.80"), new BigDecimal("7.00"), null, false);
        assertEquals(new BigDecimal("10.80"), preliminar.monto());
        assertEquals(EtiquetaAhorro.PRELIMINAR, preliminar.etiqueta());

        ReglasCompra.Ahorro confirmado = ReglasCompra.ahorro(6, new BigDecimal("8.50"), new BigDecimal("8.50"), new BigDecimal("7.48"), new BigDecimal("3.00"), true);
        assertEquals(new BigDecimal("3.12"), confirmado.monto());
        assertEquals(EtiquetaAhorro.CONFIRMADO, confirmado.etiqueta());
    }

    @Test
    void fechasDeUnaCompraNuevaLleganATiempo() {
        LocalDate hoy = LocalDate.of(2026, 11, 9);
        ReglasCompra.Fechas f = ReglasCompra.fechasPropuesta(hoy, LocalDate.of(2026, 11, 20), 2);
        assertEquals(LocalDate.of(2026, 11, 14), f.cierre());
        assertEquals(LocalDate.of(2026, 11, 16), f.entregaHasta());
        assertTrue(ReglasCompra.llegaATiempo(f.entregaHasta(), LocalDate.of(2026, 11, 20)));

        ReglasCompra.Fechas justa = ReglasCompra.fechasPropuesta(hoy, LocalDate.of(2026, 11, 11), 2);
        assertEquals(hoy, justa.cierre());
        assertNull(ReglasCompra.fechasPropuesta(hoy, LocalDate.of(2026, 11, 10), 2));
    }

    @Test
    void puntualidadDelProveedor() {
        assertEquals(95, ReglasCompra.puntualidad(18, 19));
        assertNull(ReglasCompra.puntualidad(0, 0));
    }
}
