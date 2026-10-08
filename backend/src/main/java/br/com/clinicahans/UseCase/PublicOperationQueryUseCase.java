package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.PublicOperationView;
import br.com.clinicahans.repository.AuditRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PublicOperationQueryUseCase {
    private final AuditRepository repository;

    public PublicOperationQueryUseCase(AuditRepository repository) {
        this.repository = repository;
    }

    public List<PublicOperationView> recent(int requestedLimit) {
        int limit = Math.min(Math.max(requestedLimit, 1), 100);
        return repository.recentOperations(limit).stream()
            .map(row -> new PublicOperationView(row.occurredAt(), row.method(), row.route(), row.status(), row.durationMs()))
            .toList();
    }
}
