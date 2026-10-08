package br.com.clinicahans.model.clinical;

import java.util.UUID;

public record Condition(UUID id, String description, String status) {}
