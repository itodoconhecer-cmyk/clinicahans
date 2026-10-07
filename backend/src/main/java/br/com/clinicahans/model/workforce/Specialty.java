package br.com.clinicahans.model.workforce;

import java.util.UUID;

public record Specialty(UUID id, String name, String externalSystem, String externalCode) {}
