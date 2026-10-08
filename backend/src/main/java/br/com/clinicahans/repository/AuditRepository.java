package br.com.clinicahans.repository;

import br.com.clinicahans.model.audit.AuditEntry;
import br.com.clinicahans.model.audit.PublicOperationRecord;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class AuditRepository {
    private final JdbcTemplate jdbc;

    public AuditRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UUID findUserId(String username) {
        if (username == null) return null;
        return jdbc.query("select id from app_user where username = ?",
            (rs, row) -> rs.getObject("id", UUID.class), username).stream().findFirst().orElse(null);
    }

    public void recordEvent(UUID id, UUID userId, String username, String action, String entityType,
                           String entityId, String correlationId) {
        jdbc.update("""
            insert into audit_event(id,user_id,username,action,entity_type,entity_id,correlation_id)
            values (?,?,?,?,?,?,?)
            """, id, userId, username, action, entityType, entityId, correlationId);
    }

    public void startRequest(UUID id, UUID userId, String username, String method, String path,
                             String sourceIp, String correlationId, String entityId, String identifiersJson) {
        jdbc.update("""
            insert into audit_event(
              id,user_id,username,action,entity_type,entity_id,correlation_id,source_ip,
              request_method,request_path,resource_identifiers,outcome
            )
            values (?,?,?,?,?,?,?,?::inet,?,?,?::jsonb,?)
            """, id, userId, username, "API_REQUEST", "API_REQUEST", entityId, correlationId,
            sourceIp, method, path, identifiersJson, "IN_PROGRESS");
    }

    public void recordSecurityFailure(UUID id, UUID userId, String username, String action, String method,
                                      String sourceIp, String correlationId, int status) {
        jdbc.update("""
            insert into audit_event(
              id,user_id,username,action,entity_type,entity_id,correlation_id,source_ip,
              request_method,request_path,http_status,duration_ms,outcome
            )
            values (?,?,?,?,?,?,?,?::inet,?,?,?,?,?)
            """, id, userId, username, action, "SECURITY", "unmatched-api-route", correlationId,
            sourceIp, method, "/api/**", status, 0L, "CLIENT_ERROR");
    }

    public int identifyRequest(UUID requestId, UUID userId, String username) {
        return jdbc.update("""
            update audit_event set user_id=?, username=?
            where id=? and action='API_REQUEST'
            """, userId, username, requestId);
    }

    public int completeRequest(UUID id, int status, long durationMillis, String outcome, String previousJson) {
        return jdbc.update("""
            update audit_event
            set http_status=?, duration_ms=?, outcome=?, previous_values=?::jsonb
            where id=? and action='API_REQUEST'
            """, status, durationMillis, outcome, previousJson, id);
    }

    public List<AuditEntry> search(String entityType, String entityId, int limit) {
        return jdbc.query("""
            select id,username,action,entity_type,entity_id,correlation_id,occurred_at,
                   source_ip::text source_ip,request_method,request_path,http_status,duration_ms,outcome,
                   resource_identifiers::text resource_identifiers,previous_values::text previous_values
            from audit_event
            where (? is null or entity_type=?) and (? is null or entity_id=?)
            order by occurred_at desc limit ?
            """, (rs, row) -> new AuditEntry(
                rs.getObject("id", UUID.class), rs.getString("username"), rs.getString("action"),
                rs.getString("entity_type"), rs.getString("entity_id"), rs.getString("correlation_id"),
                rs.getObject("occurred_at", java.time.OffsetDateTime.class), rs.getString("source_ip"),
                rs.getString("request_method"), rs.getString("request_path"),
                (Integer) rs.getObject("http_status"), (Long) rs.getObject("duration_ms"),
                rs.getString("outcome"), rs.getString("resource_identifiers"), rs.getString("previous_values")),
            entityType, entityType, entityId, entityId, limit);
    }

    public List<PublicOperationRecord> recentOperations(int limit) {
        return jdbc.query("""
            select occurred_at, request_method, request_path, http_status, duration_ms
            from audit_event
            where action='API_REQUEST'
              and request_path <> '/api/v1/public/operations'
              and http_status is not null
            order by occurred_at desc
            limit ?
            """, (rs, row) -> new PublicOperationRecord(
                rs.getObject("occurred_at", java.time.OffsetDateTime.class),
                rs.getString("request_method"), rs.getString("request_path"),
                (Integer) rs.getObject("http_status"), (Long) rs.getObject("duration_ms")), limit);
    }
}
