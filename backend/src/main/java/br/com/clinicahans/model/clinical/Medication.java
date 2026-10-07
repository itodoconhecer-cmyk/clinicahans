package br.com.clinicahans.model.clinical;

import java.util.UUID;

public record Medication(UUID id, String name, String dosage, String frequency) {}
