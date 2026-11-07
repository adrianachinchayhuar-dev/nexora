package pe.nexora.reglas;

import org.junit.jupiter.api.Test;
import pe.nexora.reglas.InterpreteDePedidos.Confianza;
import pe.nexora.reglas.InterpreteDePedidos.Item;
import pe.nexora.reglas.InterpreteDePedidos.ProductoRef;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class InterpreteDePedidosTest {

    private static final List<ProductoRef> CATALOGO = List.of(
            new ProductoRef(1, "Aceite vegetal", List.of("aceite"), "botellas", "caja de 12", 12),
            new ProductoRef(2, "Leche evaporada", List.of("leche", "leche evaporada"), "latas", "caja de 48", 48),
            new ProductoRef(3, "Arroz extra", List.of("arroz"), "kg", "saco de 50 kg", 50),
            new ProductoRef(4, "Vasos descartables", List.of("vaso", "vasitos"), "paquetes", "fardo de 20", 20));

    @Test
    void variosProductosEnUnaSolaFrase() {
        List<Item> items = InterpreteDePedidos.interpretar("12 botellas de aceite, 10 kilos de arroz y dos paquetes de vasos", CATALOGO);
        assertEquals(3, items.size());
        assertEquals(1L, items.get(0).productoId());
        assertEquals(12, items.get(0).cantidad());
        assertEquals(3L, items.get(1).productoId());
        assertEquals(10, items.get(1).cantidad());
        assertEquals(4L, items.get(2).productoId());
        assertEquals(2, items.get(2).cantidad());
        assertEquals(Confianza.ALTA, items.get(2).confianza());
    }

    @Test
    void convierteLaUnidadDeVentaALaUnidadEquivalente() {
        Item cajas = InterpreteDePedidos.interpretar("2 cajas de aceite", CATALOGO).get(0);
        assertEquals(24, cajas.cantidad());
        Item docena = InterpreteDePedidos.interpretar("una docena de aceite", CATALOGO).get(0);
        assertEquals(12, docena.cantidad());
        Item media = InterpreteDePedidos.interpretar("media docena de leche", CATALOGO).get(0);
        assertEquals(6, media.cantidad());
    }

    @Test
    void noConfundeLaPresentacionConLaCantidad() {
        Item item = InterpreteDePedidos.interpretar("aceite de 1 litro 15 botellas", CATALOGO).get(0);
        assertEquals(15, item.cantidad());
    }

    @Test
    void tildesYMayusculasNoImportan() {
        Item item = InterpreteDePedidos.interpretar("Necesito VEINTE latas de LECHE evaporada", CATALOGO).get(0);
        assertEquals(2L, item.productoId());
        assertEquals(20, item.cantidad());
    }

    @Test
    void pideConfirmarCuandoNoReconoceOFaltaCantidad() {
        Item desconocido = InterpreteDePedidos.interpretar("3 bolsas de azucar", CATALOGO).get(0);
        assertNull(desconocido.productoId());
        assertEquals(Confianza.BAJA, desconocido.confianza());

        Item sinCantidad = InterpreteDePedidos.interpretar("arroz", CATALOGO).get(0);
        assertEquals(3L, sinCantidad.productoId());
        assertNull(sinCantidad.cantidad());
        assertEquals(Confianza.MEDIA, sinCantidad.confianza());
    }
}
