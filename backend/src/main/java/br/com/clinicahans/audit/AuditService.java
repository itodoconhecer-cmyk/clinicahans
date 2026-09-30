package br.com.clinicahans.audit;

import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;
    public AuditService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void record(String action, String entityType, Object entityId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null && auth.isAuthenticated() ? auth.getName() : null;
        UUID userId = null;
        if (username != null && !"anonymousUser".equals(username)) {
            var ids = jdbc.query("select id from app_user where username = ?", (rs, n) -> rs.getObject("id", UUID.class), username);
            if (!ids.isEmpty()) userId = ids.getFirst();
        }
        jdbc.update("""
            insert into audit_event(id,user_id,username,action,entity_type,entity_id,correlation_id)
            values (?,?,?,?,?,?,?)
            """, UUID.randomUUID(), userId, username, action, entityType,
            entityId == null ? null : entityId.toString(), MDC.get("correlationId"));
    }
}
