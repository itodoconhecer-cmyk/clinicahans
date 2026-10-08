package br.com.clinicahans.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Component
public class CorrelationIdFilter implements Filter {
    public static final String HEADER = "X-Correlation-Id";
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
        var req = (HttpServletRequest) request;
        var res = (HttpServletResponse) response;
        String correlationId = Optional.ofNullable(req.getHeader(HEADER))
            .filter(v -> v.matches("[A-Za-z0-9._-]{1,64}"))
            .orElseGet(() -> UUID.randomUUID().toString());
        try {
            MDC.put("correlationId", correlationId);
            res.setHeader(HEADER, correlationId);
            chain.doFilter(request, response);
        } finally {
            MDC.remove("correlationId");
        }
    }
}
