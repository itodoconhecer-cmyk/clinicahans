package br.com.clinicahans.config;

import br.com.clinicahans.UseCase.AuditUseCase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
        @Value("${clinicahans.cors.allowed-origins}") String allowedOrigins) {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
            .map(String::trim).filter(s -> !s.isBlank()).toList());
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type","X-Correlation-Id"));
        config.setExposedHeaders(List.of("X-Correlation-Id"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwt,
                                    @Qualifier("corsConfigurationSource") CorsConfigurationSource cors,
                                    AuditUseCase auditUseCase) throws Exception {
        return http
            .cors(c -> c.configurationSource(cors))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/v1/auth/login", "/api/v1/public/operations", "/actuator/health/**",
                    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((request,response,ex) -> {
                    auditUseCase.recordSecurityFailure("AUTHENTICATION_DENIED", request.getMethod(),
                        request.getRemoteAddr(), 401);
                    logger.atWarn()
                        .addKeyValue("event", "security.authentication.denied")
                        .addKeyValue("method", request.getMethod())
                        .addKeyValue("correlationId", MDC.get("correlationId"))
                        .log("Authentication denied");
                    response.sendError(401);
                })
                .accessDeniedHandler((request,response,ex) -> {
                    auditUseCase.recordSecurityFailure("AUTHORIZATION_DENIED", request.getMethod(),
                        request.getRemoteAddr(), 403);
                    logger.atWarn()
                        .addKeyValue("event", "security.authorization.denied")
                        .addKeyValue("method", request.getMethod())
                        .addKeyValue("correlationId", MDC.get("correlationId"))
                        .log("Authorization denied");
                    response.sendError(403);
                }))
            .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
