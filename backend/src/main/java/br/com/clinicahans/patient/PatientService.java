package br.com.clinicahans.patient;

import br.com.clinicahans.audit.AuditService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PatientService {
    private final PatientRepository repository;
    private final AuditService audit;
    public PatientService(PatientRepository repository, AuditService audit) { this.repository = repository; this.audit = audit; }

    public PatientRepository.Patient create(String name, String cpf, LocalDate birthDate, String phone, String email) {
        var patient = repository.create(name.trim(), cpf, birthDate, phone, email);
        audit.record("PATIENT_CREATED", "PATIENT", patient.id());
        return patient;
    }

    public PatientRepository.Patient get(UUID id) { return repository.get(id); }
    public List<PatientRepository.Patient> search(String term, int limit) { return repository.search(term, limit); }

    public PatientRepository.Patient update(UUID id, String name, String phone, String email, int version) {
        var patient = repository.update(id, name.trim(), phone, email, version);
        audit.record("PATIENT_UPDATED", "PATIENT", id);
        return patient;
    }
}
