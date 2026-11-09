package pe.nexora.reglas;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Predicate;

/** Reglas de privacidad de la mensajería, sin dependencias de Spring ni de la base de datos. */
public final class ReglasMensajeria {

    private ReglasMensajeria() {
    }

    /**
     * Cómo ve el proveedor a cada negocio que le escribió en una compra. Por privacidad, ve su nombre real
     * solo si la compra está confirmada y ese negocio participa; antes, «Bodega 1», «Bodega 2»… según el
     * orden en que escribieron.
     *
     * @param autoresEnOrden ids de los negocios autores de cada mensaje, del más antiguo al más reciente
     */
    public static Map<Long, String> nombresParaProveedor(List<Long> autoresEnOrden, boolean confirmada, Predicate<Long> participa,
            Function<Long, String> nombreReal) {
        Map<Long, String> salida = new LinkedHashMap<>();
        int n = 0;
        for (Long negocioId : autoresEnOrden) {
            if (salida.containsKey(negocioId)) {
                continue;
            }
            n++;
            String alias = "Bodega " + n;
            if (confirmada && participa.test(negocioId)) {
                String real = nombreReal.apply(negocioId);
                if (real != null) {
                    alias = real;
                }
            }
            salida.put(negocioId, alias);
        }
        return salida;
    }

    /** El chat queda en solo lectura cuando la compra no se concretó. */
    public static boolean puedeEscribir(ReglasCompra.Estado estado) {
        return ReglasCompra.visible(estado) != ReglasCompra.Visible.NO_SE_CONCRETO;
    }
}
