package pe.nexora.reglas;

import org.junit.jupiter.api.Test;
import pe.nexora.reglas.ReglasCompra.Estado;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReglasMensajeriaTest {

    private static final Map<Long, String> NOMBRES = Map.of(10L, "Bodega Rosita", 20L, "Minimarket Lucho", 30L, "Bodega Pilar");

    @Test
    void antesDeConfirmarElProveedorSoloVeAlias() {
        // Rosita escribe dos veces, luego Lucho: el alias sigue el orden del primer mensaje de cada negocio.
        Map<Long, String> n = ReglasMensajeria.nombresParaProveedor(List.of(10L, 10L, 20L), false, id -> true, NOMBRES::get);
        assertEquals("Bodega 1", n.get(10L));
        assertEquals("Bodega 2", n.get(20L));
        assertEquals(2, n.size());
    }

    @Test
    void confirmadaMuestraElNombreSoloDeQuienParticipa() {
        Set<Long> participan = Set.of(10L);
        Map<Long, String> n = ReglasMensajeria.nombresParaProveedor(List.of(20L, 10L), true, participan::contains, NOMBRES::get);
        assertEquals("Bodega 1", n.get(20L)); // escribió, pero no participa: sigue anónimo
        assertEquals("Bodega Rosita", n.get(10L));
    }

    @Test
    void sinNombreRealSeMantieneElAlias() {
        Map<Long, String> n = ReglasMensajeria.nombresParaProveedor(List.of(99L), true, id -> true, NOMBRES::get);
        assertEquals("Bodega 1", n.get(99L));
    }

    @Test
    void elChatSeCierraSiLaCompraNoSeConcreto() {
        assertTrue(ReglasMensajeria.puedeEscribir(Estado.BUSCANDO_PARTICIPANTES));
        assertTrue(ReglasMensajeria.puedeEscribir(Estado.CONFIRMADA));
        assertFalse(ReglasMensajeria.puedeEscribir(Estado.CANCELADA));
        assertFalse(ReglasMensajeria.puedeEscribir(Estado.VENCIDA));
    }
}
