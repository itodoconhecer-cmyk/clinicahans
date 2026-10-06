package br.com.clinicahans.patient;

import br.com.clinicahans.audit.AuditService;
import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PatientService {
    private final PatientRepository repository;
    private final AuditService audit;
    private final UserIdentityService users;
    public PatientService(PatientRepository repository, AuditService audit, UserIdentityService users) {
        this.repository = repository; this.audit = audit; this.users = users;
    }

    @Transactional
    public PatientRepository.Patient create(String name, String cpf, LocalDate birthDate, String phone, String email) {
        var patient = repository.create(name.trim(), cpf, birthDate, phone, email);
        audit.record("PATIENT_CREATED", "PATIENT", patient.id());
        return patient;
    }

    public PatientRepository.Patient get(UUID id) {
        assertPatientAdministrativeAccess(id);
        return repository.get(id);
    }
    public List<PatientRepository.Patient> search(String term, int limit) {
        if (isDoctorOnly()) return repository.searchForDoctor(term,limit,users.currentDoctorId());
        return repository.search(term,limit);
    }

    @Transactional
    public PatientRepository.Patient update(UUID id, String name, String phone, String email, int version) {
        var patient = repository.update(id, name.trim(), phone, email, version);
        audit.record("PATIENT_UPDATED", "PATIENT", id);
        return patient;
    }
    private boolean isDoctorOnly() {
        return users.currentUserHasRole("MEDICO")
            && !users.currentUserHasRole("ADMIN")
            && !users.currentUserHasRole("RECEPCAO");
    }

    private void assertPatientAdministrativeAccess(UUID patientId) {
        if (isDoctorOnly() && !users.currentDoctorHasRelationshipWithPatient(patientId))
            throw new BusinessRuleException("Médico não possui relação assistencial válida com este paciente.");
    }
}

