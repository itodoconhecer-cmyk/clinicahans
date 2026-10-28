package br.com.clinicahans.integration;

import br.com.clinicahans.UseCase.ManagementQueryUseCase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="CLINIC_REPORT_TEST_URL", matches=".+")
class ManagementReportIntegrationTest {
    @Test
    void filteredSummaryGroupsSourcesAndDetailsReconcile() {
        SingleConnectionDataSource dataSource = new SingleConnectionDataSource();
        dataSource.setUrl(System.getenv("CLINIC_REPORT_TEST_URL"));
        dataSource.setUsername(System.getenv().getOrDefault("CLINIC_REPORT_TEST_USER", "postgres"));
        dataSource.setPassword(System.getenv().getOrDefault("CLINIC_REPORT_TEST_PASSWORD", ""));
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        ManagementQueryUseCase reports = new ManagementQueryUseCase(jdbc);
        LocalDate from = jdbc.queryForObject("select min((starts_at at time zone 'America/Sao_Paulo')::date) from appointment", LocalDate.class);
        assertNotNull(from, "A base de teste precisa conter consultas.");
        LocalDate to = from.plusDays(6);
        UUID doctor = jdbc.queryForObject("select doctor_id from appointment group by doctor_id order by count(*) desc limit 1", UUID.class);
        UUID specialty = jdbc.queryForObject("select ds.specialty_id from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=? order by ds.primary_specialty desc,s.name,s.id limit 1", UUID.class, doctor);
        var summary = reports.summary(from, to, doctor, specialty);
        for (String type : new String[]{"APPOINTMENTS", "FINANCE"}) {
            var whole = reports.sources(from, to, type, 0, 100, null, null, doctor, specialty);
            assertTrue(whole.totalRecords() > 0, "A carga precisa conter registros do médico nos dois domínios.");
            if (type.equals("APPOINTMENTS")) assertEquals(summary.current().appointments(), whole.totalRecords());
            for (String grouping : new String[]{"DAY", "MONTH", "YEAR", "DOCTOR", "SPECIALTY"}) {
                var analysis = reports.analysis(from, to, type, grouping, doctor, specialty);
                assertEquals(whole.totalRecords(), analysis.rows().stream().mapToLong(ManagementQueryUseCase.AnalysisRow::records).sum());
                if (type.equals("FINANCE")) {
                    BigDecimal gross = analysis.rows().stream().map(ManagementQueryUseCase.AnalysisRow::gross).reduce(BigDecimal.ZERO, BigDecimal::add);
                    assertEquals(0, gross.compareTo(summary.current().receivables()));
                }
                for (var row : analysis.rows()) {
                    var sources = reports.sources(from, to, type, 0, 100, grouping, row.key(), doctor, specialty);
                    assertEquals(row.records(), sources.totalRecords());
                    if (!sources.records().isEmpty()) {
                        var source = sources.records().get(0);
                        var detail = reports.record(type, source.sourceId());
                        assertEquals(source.sourceId(), detail.sourceId());
                        assertEquals(doctor, detail.doctorId());
                        assertEquals(source.status(), detail.status());
                        if (type.equals("FINANCE")) {
                            assertEquals(0, source.amount().compareTo(detail.amount()));
                            BigDecimal payments = detail.payments().stream().map(ManagementQueryUseCase.PaymentDetail::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
                            assertEquals(0, detail.received().compareTo(payments));
                        }
                    }
                }
            }
        }
        assertThrows(IllegalArgumentException.class, () -> reports.analysis(from,to,"APPOINTMENTS","INVALID",doctor,specialty));
        for (String cohort : new String[]{"APPOINTMENTS", "NO_SHOWS", "CANCELLED", "COMPLETED", "CLOSED", "ENDED", "FIRST_VISIT", "LEAD_TIME", "RECEIVABLES", "RECEIVED", "PENDING"}) {
            String type = cohort.equals("RECEIVABLES") || cohort.equals("RECEIVED") || cohort.equals("PENDING") ? "FINANCE" : "APPOINTMENTS";
            var analysis = reports.analysis(from,to,type,"MONTH",doctor,specialty,cohort);
            var sources = reports.sources(from,to,type,0,100,null,null,doctor,specialty,cohort);
            assertEquals(sources.totalRecords(), analysis.rows().stream().mapToLong(ManagementQueryUseCase.AnalysisRow::records).sum());
            if (cohort.equals("FIRST_VISIT")) assertEquals(summary.current().newPatients(), sources.totalRecords());
            if (cohort.equals("NO_SHOWS")) assertEquals(summary.current().noShows(), sources.totalRecords());
            if (cohort.equals("CANCELLED")) assertEquals(summary.current().cancelled(), sources.totalRecords());
            if (cohort.equals("RECEIVED")) assertEquals(0, analysis.rows().stream().map(ManagementQueryUseCase.AnalysisRow::received).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(summary.current().received()));
            if (cohort.equals("PENDING")) assertEquals(0, analysis.rows().stream().map(ManagementQueryUseCase.AnalysisRow::pending).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(summary.current().pending()));
            if (cohort.equals("LEAD_TIME") && sources.totalRecords() > 0) {
                double weightedAverage = analysis.rows().stream().mapToDouble(row -> row.averageLeadTimeDays() * row.records()).sum() / sources.totalRecords();
                assertEquals(summary.current().averageLeadTimeDays(), weightedAverage, 0.000001);
            }
        }
        dataSource.destroy();
    }
}
