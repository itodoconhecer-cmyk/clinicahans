package br.com.clinicahans.DTO;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AuditEventView(UUID id,String username,String action,String entityType,String entityId,String correlationId,OffsetDateTime occurredAt) {}
