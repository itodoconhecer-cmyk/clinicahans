package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.AppointmentCalendarEventResponse;
import br.com.clinicahans.repository.SmartAppointmentSearchRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SmartAppointmentSearchUseCaseTest {
    private final SmartAppointmentSearchRepository repository = mock(SmartAppointmentSearchRepository.class);
    private final SpecialtySearchAliasCache vocabulary = mock(SpecialtySearchAliasCache.class);
    private final SmartAppointmentSearchUseCase useCase = new SmartAppointmentSearchUseCase(
        repository, new SmartAppointmentQueryDecomposer(), vocabulary, "America/Sao_Paulo");

    @Test
    void returnsBookingsForTheWholeMatchingDayEvenWhenSearchRequestsMorningOnly() {
        when(vocabulary.specialties()).thenReturn(List.of("Cardiologia"));
        when(vocabulary.aliases()).thenReturn(Map.of("coracao", "Cardiologia"));
        var booking = new AppointmentCalendarEventResponse(UUID.randomUUID(), "Dra Judite",
            UUID.randomUUID(), "Cardiologia", java.time.OffsetDateTime.now().plusDays(3),
            java.time.OffsetDateTime.now().plusDays(3).plusMinutes(30), "CONFIRMED");
        when(repository.searchAppointments(any(LocalDate.class), any(LocalDate.class), anyString(),
            nullable(String.class), nullable(String.class), nullable(String.class), nullable(Integer.class)))
            .thenReturn(List.of(booking));

        var result = useCase.search("coração às sextas pela manhã");

        assertEquals("cardiologia", result.criteria().specialty());
        assertEquals(5, result.criteria().weekday());
        assertEquals(List.of(booking), result.appointments());
        verify(repository).searchAppointments(any(LocalDate.class), any(LocalDate.class),
            eq("America/Sao_Paulo"), eq(null), eq("cardiologia"), eq(null), eq(5));
    }
}
