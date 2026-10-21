package br.com.clinicahans.UseCase;

import br.com.clinicahans.model.scheduling.Appointment;
import br.com.clinicahans.model.scheduling.AppointmentStatus;
import br.com.clinicahans.model.scheduling.Availability;
import br.com.clinicahans.model.workforce.Doctor;
import br.com.clinicahans.repository.AppointmentRepository;
import br.com.clinicahans.repository.DoctorRepository;
import br.com.clinicahans.repository.PatientRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.security.UserIdentityService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AppointmentUseCaseTest {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final UUID PATIENT_ID = UUID.randomUUID();
    private static final UUID DOCTOR_ID = UUID.randomUUID();

    private final AppointmentRepository repository = mock(AppointmentRepository.class);
    private final PatientRepository patients = mock(PatientRepository.class);
    private final DoctorRepository doctors = mock(DoctorRepository.class);
    private final UserIdentityService users = mock(UserIdentityService.class);
    private final AuditUseCase auditUseCase = mock(AuditUseCase.class);
    private final AppointmentUseCase appointmentUseCase = new AppointmentUseCase(
        repository, patients, doctors, users, auditUseCase, BUSINESS_ZONE.getId());

    @Test
    void naoPermiteCriarAgendamentoNoPassado() {
        OffsetDateTime start = OffsetDateTime.now().minusMinutes(1);
        when(doctors.get(DOCTOR_ID)).thenReturn(doctor("ACTIVE", 30));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(repository, never()).hasConflict(any(), any(), any());
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void naoPermiteAgendamentoComMedicoInativo() {
        OffsetDateTime start = futureAt(13, 0);
        when(doctors.get(DOCTOR_ID)).thenReturn(doctor("INACTIVE", 30));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(doctors, never()).availability(DOCTOR_ID);
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(ints = {4, 481})
    void rejeitaDuracaoForaDosLimites(int minutes) {
        OffsetDateTime start = futureAt(13, 0);
        when(doctors.get(DOCTOR_ID)).thenReturn(doctor("ACTIVE", 30));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, minutes, "PRESENCIAL", null));

        verify(doctors, never()).availability(DOCTOR_ID);
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejeitaHorarioForaDaDisponibilidade() {
        OffsetDateTime start = futureAt(17, 0);
        prepareDoctor(start, "ACTIVE", 30);

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(repository, never()).hasScheduleBlock(any(), any(), any());
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejeitaHorarioQueNaoRespeitaOIntervaloDosSlots() {
        OffsetDateTime start = futureAt(13, 15);
        prepareDoctor(start, "ACTIVE", 30);

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(repository, never()).hasConflict(any(), any(), any());
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void bloqueioDaAgendaTemPrecedenciaSobreDisponibilidade() {
        OffsetDateTime start = futureAt(13, 0);
        prepareDoctor(start, "ACTIVE", 30);
        when(repository.hasScheduleBlock(DOCTOR_ID, start, start.plusMinutes(30))).thenReturn(true);

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(repository, never()).hasConflict(any(), any(), any());
        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void rejeitaSobreposicaoComAgendamentoAtivo() {
        OffsetDateTime start = futureAt(13, 0);
        prepareDoctor(start, "ACTIVE", 30);
        when(repository.hasConflict(DOCTOR_ID, start, start.plusMinutes(30))).thenReturn(true);

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, 30, "PRESENCIAL", null));

        verify(repository, never()).create(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void criaAgendamentoComDuracaoPadraoAuditoriaEEstadoInicial() {
        OffsetDateTime start = futureAt(13, 0);
        UUID actorId = UUID.randomUUID();
        UUID appointmentId = UUID.randomUUID();
        Appointment saved = appointment(appointmentId, start, AppointmentStatus.SCHEDULED);
        prepareDoctor(start, "ACTIVE", 30);
        when(users.currentUserId()).thenReturn(actorId);
        when(repository.create(PATIENT_ID, DOCTOR_ID, start, start.plusMinutes(30), "PRESENCIAL", null, actorId))
            .thenReturn(saved);
        when(repository.get(appointmentId)).thenReturn(saved);

        Appointment result = appointmentUseCase.create(PATIENT_ID, DOCTOR_ID, start, null, "PRESENCIAL", null);

        assertEquals(appointmentId, result.id());
        assertEquals(AppointmentStatus.SCHEDULED, result.status());
        verify(repository).create(PATIENT_ID, DOCTOR_ID, start, start.plusMinutes(30), "PRESENCIAL", null, actorId);
        verify(auditUseCase).record("APPOINTMENT_CREATED", "APPOINTMENT", appointmentId);
    }

    @Test
    void transicaoValidaAtualizaEstadoERegistraAuditoria() {
        UUID appointmentId = UUID.randomUUID();
        OffsetDateTime start = futureAt(13, 0);
        Appointment scheduled = appointment(appointmentId, start, AppointmentStatus.SCHEDULED);
        Appointment confirmed = appointment(appointmentId, start, AppointmentStatus.CONFIRMED);
        when(repository.get(appointmentId)).thenReturn(scheduled, confirmed);
        when(users.currentUserId()).thenReturn(UUID.randomUUID());

        Appointment result = appointmentUseCase.transition(appointmentId, AppointmentStatus.CONFIRMED, null);

        assertEquals(AppointmentStatus.CONFIRMED, result.status());
        verify(repository).changeStatus(eq(appointmentId), eq(AppointmentStatus.CONFIRMED), eq(null), any());
        verify(auditUseCase).recordPreviousValues(Map.of("appointment.status", "SCHEDULED"));
        verify(auditUseCase).record("APPOINTMENT_CONFIRMED", "APPOINTMENT", appointmentId);
    }

    @ParameterizedTest
    @CsvSource({
        "SCHEDULED, CONFIRMED", "SCHEDULED, CHECKED_IN", "SCHEDULED, CANCELLED", "SCHEDULED, NO_SHOW",
        "CONFIRMED, CHECKED_IN", "CONFIRMED, CANCELLED", "CONFIRMED, NO_SHOW",
        "CHECKED_IN, IN_CARE", "CHECKED_IN, CANCELLED", "IN_CARE, COMPLETED"
    })
    void aceitaSomenteTransicoesPrevistas(String currentValue, String targetValue) {
        UUID appointmentId = UUID.randomUUID();
        AppointmentStatus currentStatus = AppointmentStatus.valueOf(currentValue);
        AppointmentStatus targetStatus = AppointmentStatus.valueOf(targetValue);
        OffsetDateTime start = futureAt(13, 0);
        Appointment current = appointment(appointmentId, start, currentStatus);
        Appointment updated = appointment(appointmentId, start, targetStatus);
        when(repository.get(appointmentId)).thenReturn(current, updated);

        Appointment result = appointmentUseCase.transition(appointmentId, targetStatus,
            targetStatus == AppointmentStatus.CANCELLED ? "Teste operacional" : null);

        assertEquals(targetStatus, result.status());
        verify(repository).changeStatus(eq(appointmentId), eq(targetStatus), any(), any());
        verify(auditUseCase).record("APPOINTMENT_" + targetValue, "APPOINTMENT", appointmentId);
    }

    @ParameterizedTest
    @CsvSource({
        "COMPLETED, SCHEDULED", "CANCELLED, IN_CARE", "NO_SHOW, CONFIRMED", "IN_CARE, CANCELLED"
    })
    void rejeitaTransicoesNaoPrevistas(String currentValue, String targetValue) {
        UUID appointmentId = UUID.randomUUID();
        when(repository.get(appointmentId)).thenReturn(appointment(appointmentId, futureAt(13, 0),
            AppointmentStatus.valueOf(currentValue)));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.transition(appointmentId, AppointmentStatus.valueOf(targetValue), "Teste"));

        verify(repository, never()).changeStatus(any(), any(), any(), any());
    }

    @Test
    void cancelamentoExigeMotivo() {
        UUID appointmentId = UUID.randomUUID();
        when(repository.get(appointmentId)).thenReturn(
            appointment(appointmentId, futureAt(13, 0), AppointmentStatus.SCHEDULED));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.transition(appointmentId, AppointmentStatus.CANCELLED, "  "));

        verify(repository, never()).changeStatus(any(), any(), any(), any());
    }

    @Test
    void estadoFinalNaoPodeVoltarParaAtendimento() {
        UUID appointmentId = UUID.randomUUID();
        when(repository.get(appointmentId)).thenReturn(
            appointment(appointmentId, futureAt(13, 0), AppointmentStatus.CANCELLED));

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.transition(appointmentId, AppointmentStatus.IN_CARE, null));

        verify(repository, never()).changeStatus(any(), any(), any(), any());
    }

    @Test
    void medicoSoConsultaAgendamentoDoProprioCadastro() {
        UUID appointmentId = UUID.randomUUID();
        UUID otherDoctor = UUID.randomUUID();
        when(repository.get(appointmentId)).thenReturn(
            appointment(appointmentId, futureAt(13, 0), AppointmentStatus.SCHEDULED));
        when(users.currentUserHasRole("MEDICO")).thenReturn(true);
        when(users.currentDoctorId()).thenReturn(otherDoctor);

        assertThrows(BusinessRuleException.class, () -> appointmentUseCase.get(appointmentId));
    }

    @Test
    void rejeitaIntervaloDeConsultaInvalido() {
        OffsetDateTime from = futureAt(13, 0);

        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.list(from, from, null));
        assertThrows(BusinessRuleException.class,
            () -> appointmentUseCase.list(from, from.plusDays(94), null));

        verify(repository, never()).list(any(), any(), any());
    }

    @Test
    void agendaDoMedicoFicaLimitadaAoProprioCadastro() {
        OffsetDateTime from = futureAt(13, 0);
        OffsetDateTime to = from.plusDays(1);
        when(users.currentUserHasRole("MEDICO")).thenReturn(true);
        when(users.currentDoctorId()).thenReturn(DOCTOR_ID);

        appointmentUseCase.list(from, to, UUID.randomUUID());

        verify(repository).list(from, to, DOCTOR_ID);
    }

    private void prepareDoctor(OffsetDateTime start, String status, int defaultMinutes) {
        int weekday = start.atZoneSameInstant(BUSINESS_ZONE).getDayOfWeek().getValue();
        when(doctors.get(DOCTOR_ID)).thenReturn(doctor(status, defaultMinutes));
        when(doctors.availability(DOCTOR_ID)).thenReturn(List.of(new Availability(
            UUID.randomUUID(), weekday, LocalTime.of(13, 0), LocalTime.of(17, 0), 30, true)));
    }

    private Doctor doctor(String status, int defaultMinutes) {
        return new Doctor(DOCTOR_ID, "Dr. Teste", null, "12345", "SP", null,
            null, null, status, defaultMinutes, "PRESENCIAL", null);
    }

    private Appointment appointment(UUID id, OffsetDateTime start, AppointmentStatus status) {
        OffsetDateTime now = OffsetDateTime.now();
        return new Appointment(id, PATIENT_ID, DOCTOR_ID, start, start.plusMinutes(30), "PRESENCIAL",
            status, null, null, null, null, now, now);
    }

    private OffsetDateTime futureAt(int hour, int minute) {
        ZonedDateTime value = ZonedDateTime.now(BUSINESS_ZONE).plusDays(2)
            .withHour(hour).withMinute(minute).withSecond(0).withNano(0);
        return value.toOffsetDateTime();
    }
}
