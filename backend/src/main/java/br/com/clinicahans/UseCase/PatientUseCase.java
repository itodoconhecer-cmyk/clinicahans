package br.com.clinicahans.UseCase;

import br.com.clinicahans.command.CreatePatientCommand;
import br.com.clinicahans.command.UpdatePatientCommand;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.model.patient.Patient;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.UUID;

@Service
public class PatientUseCase {
    private final PatientRepository repository;
    private final AuditUseCase auditUseCase;
    private final UserIdentityService users;

    public PatientUseCase(PatientRepository repository, AuditUseCase auditUseCase, UserIdentityService users) {
        this.repository = repository;
        this.auditUseCase = auditUseCase;
        this.users = users;
    }

    @Transactional
    public Patient create(CreatePatientCommand command) {
        var patient = repository.create(command.fullName().trim(), command.cpf(), command.birthDate(), command.phone(), command.email());
        auditUseCase.record("PATIENT_CREATED", "PATIENT", patient.id());
        return patient;
    }

    public Patient get(UUID id) {
        assertPatientAdministrativeAccess(id);
        return repository.get(id);
    }

    public List<Patient> search(String term, int limit) {
        if (isDoctorOnly()) return repository.searchForDoctor(term, limit, users.currentDoctorId());
        return repository.search(term, limit);
    }

    @Transactional
    public Patient update(UUID id, UpdatePatientCommand command) {
        var current = repository.get(id);
        var previousValues = new LinkedHashMap<String, Object>();
        String name = command.fullName().trim();
        String phone = normalizeOptional(command.phone());
        String email = normalizeOptional(command.email());
        if (!Objects.equals(current.fullName(), name)) previousValues.put("patient.fullName", current.fullName());
        if (!Objects.equals(current.phone(), phone)) previousValues.put("patient.phone", current.phone());
        if (!Objects.equals(current.email(), email)) previousValues.put("patient.email", current.email());
        previousValues.put("patient.version", current.version());
        var patient = repository.update(id, command.fullName().trim(), command.phone(), command.email(), command.version());
        auditUseCase.recordPreviousValues(previousValues);
        auditUseCase.record("PATIENT_UPDATED", "PATIENT", id);
        return patient;
    }

    private static String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
