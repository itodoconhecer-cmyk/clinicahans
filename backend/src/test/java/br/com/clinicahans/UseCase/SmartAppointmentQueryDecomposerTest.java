package br.com.clinicahans.UseCase;

import br.com.clinicahans.model.workforce.MedicalSpecialtyCatalog;
import org.junit.jupiter.api.Test;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class SmartAppointmentQueryDecomposerTest {
    private final SmartAppointmentQueryDecomposer decomposer = new SmartAppointmentQueryDecomposer();
    private final List<String> specialties = List.of("Cardiologia", "Pneumologia", "Pediatria", "Endocrinologia");
    private final Map<String, String> databaseAliases = Map.of(
        "coracao", "Cardiologia", "pulmao", "Pneumologia", "nefrologista", "Nefrologia");

    @Test
    void combinesSpecialtyWeekdayAndPeriodRegardlessOfOrder() {
        var result = decompose("pela manhã, coração às sextas", specialties);

        assertEquals("cardiologia", result.criteria().specialty());
        assertEquals(5, result.criteria().weekday());
        assertEquals("MANHÃ", result.criteria().period());
        assertNull(result.criteria().doctor());
    }

    @Test
    void recognizesAccentInsensitiveSpecialtyAndPluralSaturday() {
        var result = decompose("pulmão aos sábados", specialties);

        assertEquals("pneumologia", result.criteria().specialty());
        assertEquals(6, result.criteria().weekday());
        assertNull(result.criteria().doctor());
    }

    @Test
    void keepsDoctorNameAndCorrectsOneCharacterWeekdayTypo() {
        var result = decompose("Dr. Judite as sextras pela manhã", specialties);

        assertEquals("judite", result.criteria().doctor());
        assertEquals(5, result.criteria().weekday());
        assertEquals("MANHÃ", result.criteria().period());
        assertNull(result.criteria().specialty());
    }

    @Test
    void extractsDateAndTimeAndLeavesUnrecognizedNameAsSearchTerm() {
        var result = decompose("Doutor Alexandre em 20/10/2026 às 14h30", specialties);

        assertEquals("alexandre", result.criteria().doctor());
        assertEquals(LocalDate.of(2026, 10, 20), result.criteria().date());
        assertEquals(LocalTime.of(14, 30), result.criteria().time());
        assertEquals("alexandre", result.generalTerm());
    }

    @Test
    void recognizesAllFiftyFiveCmeSpecialtiesByTheirOfficialNames() {
        assertEquals(55, MedicalSpecialtyCatalog.recognizedSpecialties().size());

        for (String officialName : MedicalSpecialtyCatalog.recognizedSpecialties()) {
            var result = decomposer.decompose(officialName, List.of());
            assertEquals(normalize(officialName), result.criteria().specialty(), officialName);
        }
    }

    @Test
    void acceptsDatabaseAliasesAndPrefersExactMatchesToTypoMatches() {
        var nephrology = decomposer.decompose("nefrologista", List.of(), databaseAliases);
        var neurology = decomposer.decompose("Neurologia", List.of(), databaseAliases);

        assertEquals("nefrologia", nephrology.criteria().specialty());
        assertEquals("neurologia", neurology.criteria().specialty());
    }

    private SmartAppointmentQueryDecomposer.Decomposition decompose(String query, List<String> knownSpecialties) {
        return decomposer.decompose(query, knownSpecialties, databaseAliases);
    }

    private static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
    }
}
