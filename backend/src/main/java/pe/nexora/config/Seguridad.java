package pe.nexora.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import pe.nexora.repositorio.SesionRepositorio;
import pe.nexora.repositorio.UsuarioRepositorio;

import java.util.List;

@Configuration
public class Seguridad {

    @Bean
    public SecurityFilterChain cadena(HttpSecurity http, SesionRepositorio sesiones, UsuarioRepositorio usuarios,
                                      Reloj reloj) throws Exception {
        http.csrf(c -> c.disable())
                .cors(Customizer.withDefaults())
                .httpBasic(b -> b.disable())
                .formLogin(f -> f.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/registro", "/api/auth/login", "/api/zonas", "/api/salud").permitAll()
                        .requestMatchers("/api/**").hasRole("COMPRADOR")
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            res.setStatus(401);
                            res.setContentType("application/json;charset=UTF-8");
                            res.getWriter().write("{\"mensaje\":\"Inicia sesión para continuar.\"}");
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType("application/json;charset=UTF-8");
                            res.getWriter().write("{\"mensaje\":\"Tu perfil no tiene acceso a esta sección.\"}");
                        }))
                .addFilterBefore(new FiltroToken(sesiones, usuarios, reloj), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${nexora.cors.origen}") String origen) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(origen.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/api/**", config);
        return fuente;
    }

    @Bean
    public PasswordEncoder codificador() {
        return new BCryptPasswordEncoder();
    }
}
