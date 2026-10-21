package br.com.clinicahans.utilities.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PatientNameMaskerTest {
    @Test
    void preservesInitialsAndMasksTheRestOfEveryNamePart() {
        assertEquals("M\u2022\u2022\u2022\u2022 d\u2022\u2022 S\u2022\u2022\u2022\u2022",
            PatientNameMasker.mask("Maria da Silva"));
    }

    @Test
    void handlesBlankAndSingleCharacterNames() {
        assertEquals("Paciente", PatientNameMasker.mask("  "));
        assertEquals("\u2022", PatientNameMasker.mask("A"));
    }
}
