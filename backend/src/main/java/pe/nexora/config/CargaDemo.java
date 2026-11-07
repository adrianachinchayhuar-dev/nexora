package pe.nexora.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import pe.nexora.servicio.DemoServicio;

/** Al arrancar con la base vacía, carga los datos de demostración. */
@Component
public class CargaDemo implements ApplicationRunner {
    private static final Logger LOG = LoggerFactory.getLogger(CargaDemo.class);
    private final DemoServicio demo;
    private final boolean activa;

    public CargaDemo(DemoServicio demo, @Value("${nexora.demo.cargar-al-iniciar:true}") boolean activa) {
        this.demo = demo;
        this.activa = activa;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!activa) {
            return;
        }
        if (demo.cargarSiVacia()) {
            LOG.info("Datos de prueba cargados. Bodeguero: {} / {}", DemoServicio.CORREO_DEMO, DemoServicio.CLAVE_DEMO);
        }
        // Bases creadas antes del perfil proveedor: se le agrega su cuenta sin borrar nada.
        if (demo.asegurarProveedorDemo()) {
            LOG.info("Cuenta de proveedor de prueba lista: {} / {}", DemoServicio.CORREO_PROVEEDOR, DemoServicio.CLAVE_PROVEEDOR);
        }
    }
}
