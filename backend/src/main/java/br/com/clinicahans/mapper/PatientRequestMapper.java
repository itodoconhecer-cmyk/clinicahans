package br.com.clinicahans.mapper;

import br.com.clinicahans.DTO.CreatePatientRequest;
import br.com.clinicahans.DTO.PatientResponse;
import br.com.clinicahans.DTO.UpdatePatientRequest;
import br.com.clinicahans.command.CreatePatientCommand;
import br.com.clinicahans.command.UpdatePatientCommand;
import br.com.clinicahans.model.patient.Patient;

public final class PatientRequestMapper {
    private PatientRequestMapper() {}

    public static CreatePatientCommand toCommand(CreatePatientRequest r) {
        return new CreatePatientCommand(r.fullName(), r.cpf(), r.birthDate(), r.phone(), r.email());
    }

    public static UpdatePatientCommand toCommand(UpdatePatientRequest r) {
        return new UpdatePatientCommand(r.fullName(), r.phone(), r.email(), r.version());
    }

    public static PatientResponse toResponse(Patient p) {
        return new PatientResponse(p.id(), p.fullName(), p.cpf(), p.birthDate(), p.phone(), p.email(),
            p.status(), p.createdAt(), p.updatedAt(), p.version());
    }
}
