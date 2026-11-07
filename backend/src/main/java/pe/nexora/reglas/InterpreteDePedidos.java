package pe.nexora.reglas;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Interpreta un pedido escrito en lenguaje cotidiano («12 botellas de aceite, 2 cajas de leche y 10 kilos de arroz»).
 * Es la parte de reglas del enfoque híbrido de la tesis; la similitud con Sentence-BERT se sumará en el VI ciclo.
 * Clase pura: recibe el catálogo y devuelve propuestas que el usuario debe confirmar.
 */
public final class InterpreteDePedidos {

    private InterpreteDePedidos() {
    }

    public enum Confianza { ALTA, MEDIA, BAJA }

    /** Producto del catálogo tal como lo necesita el intérprete. */
    public record ProductoRef(long id, String nombre, List<String> palabrasClave, String unidad, String unidadVenta,
                              int equivalencia) {
    }

    public record Item(String fragmento, Long productoId, String productoNombre, Integer cantidad, String unidad,
                       Confianza confianza, String nota) {
    }

    private static final Map<String, Integer> NUMEROS = Map.ofEntries(
            Map.entry("un", 1), Map.entry("una", 1), Map.entry("uno", 1), Map.entry("dos", 2), Map.entry("tres", 3),
            Map.entry("cuatro", 4), Map.entry("cinco", 5), Map.entry("seis", 6), Map.entry("siete", 7),
            Map.entry("ocho", 8), Map.entry("nueve", 9), Map.entry("diez", 10), Map.entry("once", 11),
            Map.entry("doce", 12), Map.entry("quince", 15), Map.entry("veinte", 20), Map.entry("treinta", 30),
            Map.entry("cuarenta", 40), Map.entry("cincuenta", 50), Map.entry("cien", 100));

    private static final Pattern NUMERO = Pattern.compile("(\\d+)(?:[.,](\\d+))?");
    private static final Pattern PRESENTACION = Pattern.compile("(l|lt|lts|litro|litros|ml|g|gr|grs|gramos|cc)\\b");
    private static final Pattern SEPARADORES = Pattern.compile("[,;\\n]+|\\s+y\\s+|\\s+e\\s+|\\s+mas\\s+");

    public static String normalizar(String texto) {
        String sinTildes = Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9.,;\\n ]", " ").replaceAll("[ ]+", " ").trim();
    }

    public static List<Item> interpretar(String texto, List<ProductoRef> catalogo) {
        List<Item> items = new ArrayList<>();
        for (String bruto : SEPARADORES.split(normalizar(texto))) {
            String fragmento = bruto.trim();
            if (fragmento.isEmpty() || fragmento.length() < 2) {
                continue;
            }
            items.add(interpretarFragmento(fragmento, catalogo));
        }
        return items;
    }

    static Item interpretarFragmento(String fragmento, List<ProductoRef> catalogo) {
        ProductoRef producto = buscarProducto(fragmento, catalogo);
        Integer cantidad = buscarCantidad(fragmento);
        if (producto == null) {
            return new Item(fragmento, null, null, cantidad, null, Confianza.BAJA,
                    "No reconocimos el producto. Elígelo de la lista.");
        }
        String nota = null;
        Confianza confianza = Confianza.ALTA;
        if (cantidad == null) {
            confianza = Confianza.MEDIA;
            nota = "Indica la cantidad.";
        } else {
            String palabraVenta = primeraPalabra(producto.unidadVenta());
            if (fragmento.contains("media docena")) {
                cantidad = 6;
                nota = "Media docena = 6 " + producto.unidad() + ".";
            } else if (fragmento.contains("docena")) {
                cantidad = cantidad * 12;
                nota = "Convertimos docenas a " + producto.unidad() + ".";
            } else if (!palabraVenta.isEmpty() && contienePalabra(fragmento, palabraVenta)
                    && producto.equivalencia() > 1) {
                cantidad = cantidad * producto.equivalencia();
                nota = "1 " + producto.unidadVenta() + " = " + producto.equivalencia() + " " + producto.unidad() + ".";
            }
        }
        return new Item(fragmento, producto.id(), producto.nombre(), cantidad, producto.unidad(), confianza, nota);
    }

    static ProductoRef buscarProducto(String fragmento, List<ProductoRef> catalogo) {
        ProductoRef mejor = null;
        int mejorLargo = 0;
        for (ProductoRef p : catalogo) {
            for (String palabra : p.palabrasClave()) {
                String clave = normalizar(palabra);
                if (clave.isEmpty()) {
                    continue;
                }
                if (contienePalabra(fragmento, clave) && clave.length() > mejorLargo) {
                    mejor = p;
                    mejorLargo = clave.length();
                }
            }
        }
        return mejor;
    }

    static Integer buscarCantidad(String fragmento) {
        if (fragmento.contains("media docena")) {
            return 6;
        }
        Matcher m = NUMERO.matcher(fragmento);
        while (m.find()) {
            // «1 l», «400 g» o «500 ml» describen la presentación, no la cantidad pedida.
            String despues = fragmento.substring(m.end()).trim();
            if (PRESENTACION.matcher(despues).lookingAt()) {
                continue;
            }
            int entero = Integer.parseInt(m.group(1));
            return entero > 0 ? entero : null;
        }
        for (String palabra : fragmento.split(" ")) {
            Integer n = NUMEROS.get(palabra);
            if (n != null) {
                return n;
            }
        }
        if (fragmento.contains("docena")) {
            return 1;
        }
        return null;
    }

    /** Coincidencia por palabra, tolerante a plurales («botella» encuentra «botellas»). */
    static boolean contienePalabra(String fragmento, String clave) {
        for (String palabra : fragmento.split(" ")) {
            if (palabra.equals(clave) || palabra.equals(clave + "s") || palabra.equals(clave + "es")
                    || (clave.length() >= 5 && palabra.startsWith(clave))) {
                return true;
            }
        }
        return clave.contains(" ") && fragmento.contains(clave);
    }

    private static String primeraPalabra(String texto) {
        String n = normalizar(texto);
        int i = n.indexOf(' ');
        return i < 0 ? n : n.substring(0, i);
    }
}
