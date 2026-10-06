package br.com.clinicahans.command;

import java.time.LocalDate;

public record CreatePatientCommand(String fullName, String cpf, LocalDate birthDate, String phone, String email) {}
