package br.com.clinicahans.config;

import br.com.clinicahans.UseCase.AuditUseCase;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

import java.util.UUID;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class OperationAuditInterceptor implements HandlerInterceptor {
    private static final Logger logger = LoggerFactory.getLogger(OperationAuditInterceptor.class);
    private static final String STARTED_AT = OperationAuditInterceptor.class.getName() + ".startedAt";
    private static final Pattern UUID_PATTERN = Pattern.compile(
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    private static final Pattern VARIABLE_NAME_PATTERN = Pattern.compile("^[A-Za-z][A-Za-z0-9]{0,39}$");

    private final AuditUseCase auditUseCase;

    public OperationAuditInterceptor(AuditUseCase auditUseCase) {
        this.auditUseCase = auditUseCase;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Object mappedPath = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        String path = mappedPath instanceof String pattern ? pattern : "unmapped-api-route";
        UUID auditId = auditUseCase.startRequestAudit(request.getMethod(), path, request.getRemoteAddr(),
            resourceIdentifiers(request));
        request.setAttribute(AuditUseCase.REQUEST_AUDIT_ID, auditId);
        request.setAttribute(STARTED_AT, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception exception)
        throws Exception {
        Object id = request.getAttribute(AuditUseCase.REQUEST_AUDIT_ID);
        Object startedAt = request.getAttribute(STARTED_AT);
        if (!(id instanceof UUID auditId) || !(startedAt instanceof Long startNanos)) return;

        int status = response.getStatus();
        long durationMillis = (System.nanoTime() - startNanos) / 1_000_000;
        auditUseCase.completeRequestAudit(auditId, status, durationMillis);

        String correlationId = MDC.get("correlationId");
        if (exception != null || status >= 500) {
            String exceptionType = exception == null ? "none" : exception.getClass().getSimpleName();
            logger.atError()
                .addKeyValue("event", "operation.completed")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("route", safeRoute(request))
                .addKeyValue("status", status)
                .addKeyValue("durationMs", durationMillis)
                .addKeyValue("exceptionType", exceptionType)
                .addKeyValue("correlationId", correlationId)
                .log("API operation failed");
        } else if (status >= 400) {
            logger.atWarn()
                .addKeyValue("event", "operation.completed")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("route", safeRoute(request))
                .addKeyValue("status", status)
                .addKeyValue("durationMs", durationMillis)
                .addKeyValue("correlationId", correlationId)
                .log("API operation returned a client error");
        } else {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String actor = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())
                ? auth.getName() : "anonymous";
            logger.atInfo()
                .addKeyValue("event", "operation.completed")
                .addKeyValue("method", request.getMethod())
                .addKeyValue("actor", actor)
                .addKeyValue("route", safeRoute(request))
                .addKeyValue("status", status)
                .addKeyValue("durationMs", durationMillis)
                .addKeyValue("correlationId", correlationId)
                .log("API operation completed");
        }
    }

    private static String safeRoute(HttpServletRequest request) {
        Object mappedPath = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return mappedPath instanceof String pattern ? pattern : "unmapped-api-route";
    }

    private static Map<String, String> resourceIdentifiers(HttpServletRequest request) {
        Object variables = request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);
        if (!(variables instanceof Map<?, ?> map)) return Map.of();
        Map<String, String> identifiers = new LinkedHashMap<>();
        map.forEach((key, value) -> {
            if (key instanceof String name && value instanceof String identifier
                && VARIABLE_NAME_PATTERN.matcher(name).matches() && UUID_PATTERN.matcher(identifier).matches()) {
                identifiers.put(name, identifier);
            }
        });
        return identifiers;
    }
}
