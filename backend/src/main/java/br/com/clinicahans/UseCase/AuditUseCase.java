package br.com.clinicahans.UseCase;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.clinicahans.model.audit.AuditEntry;
import br.com.clinicahans.repository.AuditRepository;
import org.slf4j.MDC;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditUseCase {
    public static final String REQUEST_AUDIT_ID = AuditUseCase.class.getName() + ".requestAuditId";
    private static final String PREVIOUS_VALUES = AuditUseCase.class.getName() + ".previousValues";

    private final AuditRepository repository;
    private final ObjectMapper objectMapper;

    public AuditUseCase(AuditRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void record(String action, String entityType, Object entityId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String username = authenticatedUsername(auth == null ? null : auth.getName(),
            auth != null && auth.isAuthenticated());
        repository.recordEvent(UUID.randomUUID(), repository.findUserId(username), username, action, entityType,
            entityId == null ? null : entityId.toString(), MDC.get("correlationId"));
    }

    public UUID startRequestAudit(String method, String path, String sourceIp, Map<String, String> identifiers)
        throws JsonProcessingException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String username = authenticatedUsername(auth == null ? null : auth.getName(),
            auth != null && auth.isAuthenticated());
        UUID id = UUID.randomUUID();
        String identifiersJson = identifiers.isEmpty() ? null : objectMapper.writeValueAsString(identifiers);
        String entityId = identifiers.values().stream().findFirst().orElse(null);
        repository.startRequest(id, repository.findUserId(username), username, method, path, sourceIp,
            MDC.get("correlationId"), entityId, identifiersJson);
        return id;
    }

    public void recordSecurityFailure(String action, String method, String sourceIp, int status) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String username = authenticatedUsername(auth == null ? null : auth.getName(),
            auth != null && auth.isAuthenticated());
        repository.recordSecurityFailure(UUID.randomUUID(), repository.findUserId(username), username, action,
            method, sourceIp, MDC.get("correlationId"), status);
    }

    public void identifyCurrentRequest(UUID userId, String username) {
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (!(requestAttributes instanceof ServletRequestAttributes servletAttributes)) return;
        Object requestAuditId = servletAttributes.getRequest().getAttribute(REQUEST_AUDIT_ID);
        if (!(requestAuditId instanceof UUID id)) return;
        int updated = repository.identifyRequest(id, userId, username);
        if (updated != 1) throw new IllegalStateException("Não foi possível associar o usuário ao registro de auditoria.");
    }

    public void completeRequestAudit(UUID id, int status, long durationMillis) throws JsonProcessingException {
        Map<String, ?> previousValues = previousValuesFromRequest();
        String previousJson = previousValues == null ? null : objectMapper.writeValueAsString(previousValues);
        String outcome = status >= 500 ? "SERVER_ERROR" : status >= 400 ? "CLIENT_ERROR" : "SUCCESS";
        int updated = repository.completeRequest(id, status, durationMillis, outcome, previousJson);
        if (updated != 1) throw new IllegalStateException("Não foi possível finalizar o registro de auditoria da requisição.");
    }

    public List<AuditEntry> search(String entityType, String entityId, int requestedLimit) {
        int limit = Math.min(Math.max(requestedLimit, 1), 500);
        return repository.search(entityType, entityId, limit);
    }

    public void recordPreviousValues(Map<String, ?> values) {
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes servletAttributes) {
            var request = servletAttributes.getRequest();
            Map<String, ?> existing = previousValuesFromRequest();
            Map<String, Object> previous = existing == null ? new LinkedHashMap<>() : new LinkedHashMap<>(existing);
            previous.putAll(values);
            request.setAttribute(PREVIOUS_VALUES, previous);
        }
    }

    private Map<String, ?> previousValuesFromRequest() {
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (!(requestAttributes instanceof ServletRequestAttributes servletAttributes)) return null;
        Object value = servletAttributes.getRequest().getAttribute(PREVIOUS_VALUES);
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> values = new LinkedHashMap<>();
            map.forEach((key, item) -> {
                if (key instanceof String stringKey) values.put(stringKey, item);
            });
            return values;
        }
        return null;
    }

    private static String authenticatedUsername(String username, boolean authenticated) {
        return authenticated && username != null && !"anonymousUser".equals(username) ? username : null;
    }
}
