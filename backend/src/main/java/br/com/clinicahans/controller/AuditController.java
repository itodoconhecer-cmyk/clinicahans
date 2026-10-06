package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {
    private final JdbcTemplate jdbc;
    public AuditController(JdbcTemplate jdbc){this.jdbc=jdbc;}

    @GetMapping
    public List<AuditEventView> search(@RequestParam(required=false) String entityType,
                                       @RequestParam(required=false) String entityId,
                                       @RequestParam(defaultValue="100") int limit){
        return jdbc.query("""
          select id,username,action,entity_type,entity_id,correlation_id,occurred_at
          from audit_event
          where (? is null or entity_type=?) and (? is null or entity_id=?)
          order by occurred_at desc limit ?
          """,(rs,n)->new AuditEventView(rs.getObject("id",UUID.class),rs.getString("username"),rs.getString("action"),
            rs.getString("entity_type"),rs.getString("entity_id"),rs.getString("correlation_id"),
            rs.getObject("occurred_at",OffsetDateTime.class)),entityType,entityType,entityId,entityId,Math.min(Math.max(limit,1),500));
    }

    
}
