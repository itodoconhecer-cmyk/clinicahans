package br.com.clinicahans.model.clinical;

import java.util.UUID;

public record Allergy(UUID id, String substance, String reaction, String severity) {}
