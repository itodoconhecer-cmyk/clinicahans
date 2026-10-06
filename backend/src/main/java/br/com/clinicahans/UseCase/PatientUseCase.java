package br.com.clinicahans.UseCase;

import br.com.clinicahans.command.CreatePatientCommand;
import br.com.clinicahans.command.UpdatePatientCommand;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class PatientUseCase {
    private final PatientRepository repository;
    private final AuditUseCase audit;
    private final UserIdentityService users;

    public PatientUseCase(PatientRepository repository, AuditUseCase audit, UserIdentityService users) {
        this.repository = repository;
        this.audit = audit;
        this.users = users;
    }

    @Transactional
    public PatientRepository.Patient create(CreatePatientCommand command) {
        var patient = repository.create(command.fullName().trim(), command.cpf(), command.birthDate(), command.phone(), command.email());
        audit.record("PATIENT_CREATED", "PATIENT", patient.id());
        return patient;
    }

    public PatientRepository.Patient get(UUID id) {
        assertPatientAdministrativeAccess(id);
        return repository.get(id);
    }

    public List<PatientRepository.Patient> search(String term, int limit) {
        if (isDoctorOnly()) return repository.searchForDoctor(term, limit, users.currentDoctorId());
        return repository.search(term, limit);
    }

    @Transactional
    public PatientRepository.Patient update(UUID id, UpdatePatientCommand command) {
        var patient = repository.update(id, command.fullName().trim(), command.phone(), command.email(), command.version());
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
