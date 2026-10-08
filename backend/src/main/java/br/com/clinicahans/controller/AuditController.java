package br.com.clinicahans.controller;

import br.com.clinicahans.DTO.*;
import br.com.clinicahans.UseCase.AuditUseCase;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {
    private final AuditUseCase auditUseCase;
    public AuditController(AuditUseCase auditUseCase){this.auditUseCase=auditUseCase;}

    @GetMapping
    public List<AuditEventView> search(@RequestParam(required=false) String entityType,
                                       @RequestParam(required=false) String entityId,
                                       @RequestParam(defaultValue="100") int limit){
        return auditUseCase.search(entityType, entityId, limit).stream()
            .map(event -> new AuditEventView(event.id(), event.username(), event.action(), event.entityType(),
                event.entityId(), event.correlationId(), event.occurredAt(), event.sourceIp(),
                event.requestMethod(), event.requestPath(), event.httpStatus(), event.durationMs(),
                event.outcome(), event.resourceIdentifiers(), event.previousValues()))
            .toList();
    }

    
}
