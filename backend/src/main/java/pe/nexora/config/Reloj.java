package pe.nexora.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/** Fecha y hora de Lima. Todas las reglas de fechas usan este reloj. */
@Component
public class Reloj {
    private final ZoneId zona;

    public Reloj(@Value("${nexora.zona-horaria:America/Lima}") String zona) {
        this.zona = ZoneId.of(zona);
    }

    public LocalDate hoy() {
        return LocalDate.now(zona);
    }

    public LocalDateTime ahora() {
        return LocalDateTime.now(zona);
    }
}
