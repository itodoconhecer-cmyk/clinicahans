package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.AppointmentCalendarEventResponse;
import br.com.clinicahans.DTO.AppointmentSlotResponse;
import br.com.clinicahans.repository.SmartAppointmentSearchRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
        var startsAt = java.time.OffsetDateTime.now().plusDays(3);
        var booking = new AppointmentCalendarEventResponse(UUID.randomUUID(), UUID.randomUUID(), "Dra Judite",
            UUID.randomUUID(), "Cardiologia", "M\u2022\u2022\u2022\u2022 S\u2022\u2022\u2022\u2022", startsAt, startsAt.plusMinutes(30), "CONFIRMED");
        when(repository.searchAppointments(any(LocalDate.class), any(LocalDate.class), anyString(),
            nullable(String.class), nullable(String.class), nullable(String.class)))
            .thenReturn(List.of(booking));

        var result = useCase.search("coração às sextas pela manhã");

        assertEquals("cardiologia", result.criteria().specialty());
        assertEquals(5, result.criteria().weekday());
        assertEquals(List.of(booking), result.appointments());
        assertEquals("M\u2022\u2022\u2022\u2022 S\u2022\u2022\u2022\u2022", result.appointments().getFirst().maskedPatientName());
        verify(repository).searchAppointments(any(LocalDate.class), any(LocalDate.class),
            eq("America/Sao_Paulo"), eq(null), eq("cardiologia"), eq(null));
    }

    @Test
    void rejectsMissingBlankAndOverlongQueries() {
        assertThrows(BusinessRuleException.class, () -> useCase.search(null));
        assertThrows(BusinessRuleException.class, () -> useCase.search("   "));
        assertThrows(BusinessRuleException.class, () -> useCase.search("x".repeat(161)));
    }

    @Test
    void returnsAnInstructionWhenNoSearchCriterionWasRecognized() {
        when(vocabulary.specialties()).thenReturn(List.of());
        when(vocabulary.aliases()).thenReturn(Map.of());

        var response = useCase.search("consulta para");

        assertNotNull(response.message());
        assertEquals(List.of(), response.slots());
        assertEquals(List.of(), response.appointments());
        verify(repository, org.mockito.Mockito.never()).search(any(), any(), anyString(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void returnsMatchingSlotsAndUsesTheRequestedBusinessDate() {
        LocalDate date = LocalDate.now(ZoneId.of("America/Sao_Paulo")).plusDays(4);
        var slot = new AppointmentSlotResponse(UUID.randomUUID(), "Dra. Teste", null, null,
            date.atTime(13, 0).atZone(ZoneId.of("America/Sao_Paulo")).toOffsetDateTime(),
            date.atTime(13, 30).atZone(ZoneId.of("America/Sao_Paulo")).toOffsetDateTime(), "AVAILABLE");
        LocalDate weekStart = date.with(DayOfWeek.MONDAY);
        var eventStart = weekStart.atTime(14, 0).atZone(ZoneId.of("America/Sao_Paulo")).toOffsetDateTime();
        var booking = new AppointmentCalendarEventResponse(UUID.randomUUID(), UUID.randomUUID(), "Dr. Contexto",
            null, null, "P*** T***", eventStart, eventStart.plusMinutes(30), "CONFIRMED");
        when(vocabulary.specialties()).thenReturn(List.of());
        when(vocabulary.aliases()).thenReturn(Map.of());
        when(repository.search(eq(date), eq(date), eq("America/Sao_Paulo"), any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(List.of(slot));
        when(repository.searchAppointments(eq(weekStart), eq(weekStart.plusDays(6)), eq("America/Sao_Paulo"), any(), any(), any()))
            .thenReturn(List.of(booking));

        var response = useCase.search(date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")));

        assertEquals(List.of(slot), response.slots());
        assertEquals(List.of(booking), response.appointments());
        assertEquals(date, response.criteria().date());
        assertEquals(null, response.message());
        verify(repository).searchAppointments(eq(weekStart), eq(weekStart.plusDays(6)),
            eq("America/Sao_Paulo"), any(), any(), any());
    }

    @Test
    void reportsDoctorWithoutAvailability() {
        when(vocabulary.specialties()).thenReturn(List.of());
        when(vocabulary.aliases()).thenReturn(Map.of());
        when(repository.search(any(LocalDate.class), any(LocalDate.class), anyString(), eq("desconhecido"),
            any(), any(), any(), any(), any(), any())).thenReturn(List.of());
        when(repository.searchAppointments(any(LocalDate.class), any(LocalDate.class), anyString(), eq("desconhecido"),
            any(), any())).thenReturn(List.of());
        when(repository.doctorExists("desconhecido")).thenReturn(false);

        var response = useCase.search("Dr. Desconhecido");

        assertEquals("Nenhum m\u00e9dico encontrado para a pesquisa informada.", response.message());
    }
}
