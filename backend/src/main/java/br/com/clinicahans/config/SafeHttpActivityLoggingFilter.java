package br.com.clinicahans.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/** Logs only operational metadata; never records URLs, headers, tokens or request/response bodies. */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public final class SafeHttpActivityLoggingFilter extends OncePerRequestFilter {
    private static final Logger LOG = LoggerFactory.getLogger(SafeHttpActivityLoggingFilter.class);

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long startedAt = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            String correlationId = Optional.ofNullable(request.getHeader(CorrelationIdFilter.HEADER))
                    .filter(value -> value.matches("[A-Za-z0-9._-]{1,64}"))
                    .orElse("-");
            long elapsedMs = (System.nanoTime() - startedAt) / 1_000_000;
            LOG.info("http_activity method={} status={} durationMs={} correlationId={}",
                    request.getMethod(), response.getStatus(), elapsedMs, correlationId);
        }
    }
}
