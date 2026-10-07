package br.com.clinicahans.model.identity;

import java.util.List;
import java.util.UUID;

public record UserAccount(UUID id, String username, String passwordHash, boolean active, List<String> roles) {}
