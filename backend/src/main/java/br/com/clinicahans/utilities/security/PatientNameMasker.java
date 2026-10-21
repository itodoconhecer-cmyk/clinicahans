package br.com.clinicahans.utilities.security;

import java.util.Arrays;

/** Masks patient names before calendar data leaves the backend. */
public final class PatientNameMasker {
    private PatientNameMasker() {}

    public static String mask(String name) {
        if (name == null || name.isBlank()) return "Paciente";
        return Arrays.stream(name.trim().split("\\s+"))
            .map(PatientNameMasker::maskWord)
            .reduce((left, right) -> left + " " + right)
            .orElse("Paciente");
    }

    private static String maskWord(String word) {
        int first = word.codePointAt(0);
        int length = word.codePointCount(0, word.length());
        if (length == 1) return "•";
        return new String(Character.toChars(first)) + "•".repeat(Math.max(2, length - 1));
    }
}
