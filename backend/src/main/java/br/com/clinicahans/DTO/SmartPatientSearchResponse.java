package br.com.clinicahans.DTO;

import java.util.List;

public record SmartPatientSearchResponse(List<PatientResponse> patients, boolean refineRequired, String message) {}
