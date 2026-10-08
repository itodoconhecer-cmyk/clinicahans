package br.com.clinicahans.DTO;

import java.util.List;

public record LoginResult(String accessToken, String tokenType, List<String> roles) {}
