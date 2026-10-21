package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.AppointmentSearchCriteria;
import br.com.clinicahans.DTO.SmartAppointmentSearchResponse;
import br.com.clinicahans.repository.SmartAppointmentSearchRepository;
import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class SmartAppointmentSearchUseCase {
    private static final String NO_CRITERIA = "Não foi possível identificar os critérios da pesquisa. Informe médico, especialidade, dia ou período desejado.";

    private final SmartAppointmentSearchRepository repository;
    private final SmartAppointmentQueryDecomposer decomposer;
    private final SpecialtySearchAliasCache specialtyAliases;
    private final ZoneId zone;

    public SmartAppointmentSearchUseCase(SmartAppointmentSearchRepository repository,
            SmartAppointmentQueryDecomposer decomposer, SpecialtySearchAliasCache specialtyAliases,
            @Value("${clinicahans.business-zone:America/Sao_Paulo}") String businessZone) {
        this.repository = repository;
        this.decomposer = decomposer;
        this.specialtyAliases = specialtyAliases;
        this.zone = ZoneId.of(businessZone);
    }

    public SmartAppointmentSearchResponse search(String rawQuery) {
        if (rawQuery == null || rawQuery.isBlank() || rawQuery.length() > 160)
            throw new BusinessRuleException("Informe uma pesquisa de até 160 caracteres.");
        SmartAppointmentQueryDecomposer.Decomposition parsed = decomposer.decompose(rawQuery,
            specialtyAliases.specialties(), specialtyAliases.aliases());
        AppointmentSearchCriteria criteria = parsed.criteria();
        if (criteria.doctor() == null && criteria.specialty() == null && criteria.weekday() == null
                && criteria.period() == null && criteria.date() == null && criteria.time() == null)
            return new SmartAppointmentSearchResponse(criteria, List.of(), List.of(), NO_CRITERIA);

        LocalDate today = LocalDate.now(zone);
        LocalDate from = criteria.date() == null ? today : criteria.date();
        LocalDate to = criteria.date() != null ? criteria.date()
            : today.plusDays(criteria.weekday() == null ? 14 : 42);
        LocalTime fromTime = criteria.period() == null ? null : switch (criteria.period()) {
            case "MANHÃ" -> LocalTime.of(6, 0);
            case "TARDE" -> LocalTime.NOON;
            default -> LocalTime.of(18, 0);
        };
        LocalTime toTime = criteria.period() == null ? null : switch (criteria.period()) {
            case "MANHÃ" -> LocalTime.NOON;
            case "TARDE" -> LocalTime.of(18, 0);
            default -> LocalTime.of(23, 59, 59);
        };

        var slots = repository.search(from, to, zone.getId(), criteria.doctor(), criteria.specialty(),
            parsed.generalTerm(), criteria.weekday(), fromTime, toTime, criteria.time());
        var appointments = repository.searchAppointments(from, to, zone.getId(), criteria.doctor(),
            criteria.specialty(), parsed.generalTerm(), criteria.weekday());
        String message = null;
        if (slots.isEmpty()) {
            if (criteria.doctor() != null && !repository.doctorExists(criteria.doctor())) {
                message = "Nenhum médico encontrado para a pesquisa informada.";
            } else if (criteria.specialty() != null && specialtyAliases.specialties().stream()
                    .noneMatch(s -> s.equalsIgnoreCase(criteria.specialty()))) {
                message = "Nenhuma especialidade encontrada para a pesquisa informada.";
            } else if (!appointments.isEmpty()) {
                message = "Não há horários livres compatíveis; os agendamentos existentes estão visíveis na agenda.";
            } else {
                message = "Não foram encontrados horários disponíveis para os critérios informados.";
            }
        }
        return new SmartAppointmentSearchResponse(criteria, slots, appointments, message);
    }
}
