package br.com.clinicahans.command;

public record UpdatePatientCommand(String fullName, String phone, String email, String insuranceCard, int version) {}
