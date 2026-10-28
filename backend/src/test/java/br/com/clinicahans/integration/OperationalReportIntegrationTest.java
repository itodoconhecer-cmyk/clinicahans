package br.com.clinicahans.integration;

import br.com.clinicahans.UseCase.ManagementQueryUseCase;
import br.com.clinicahans.UseCase.OperationalReportUseCase;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="CLINIC_REPORT_TEST_URL", matches=".+")
class OperationalReportIntegrationTest {
    @ParameterizedTest(name = "Reconciles summary, breakdowns and sources for {0}")
    @ValueSource(strings = {"PENDING_EXAMS", "OPEN_FOLLOWUPS", "OCCUPIED", "CAPACITY"})
    void metricsBreakdownsAndSourcesReconcileWithSummary(String type) {
        var ds=new SingleConnectionDataSource();
        ds.setUrl(System.getenv("CLINIC_REPORT_TEST_URL"));
        ds.setUsername(System.getenv().getOrDefault("CLINIC_REPORT_TEST_USER","postgres"));
        ds.setPassword(System.getenv().getOrDefault("CLINIC_REPORT_TEST_PASSWORD",""));
        var jdbc=new JdbcTemplate(ds);
        var reports=new OperationalReportUseCase(new NamedParameterJdbcTemplate(ds));
        var management=new ManagementQueryUseCase(jdbc);
        LocalDate from=jdbc.queryForObject("select min((started_at at time zone 'America/Sao_Paulo')::date) from encounter",LocalDate.class);
        assertNotNull(from);
        LocalDate to=from.plusDays(6);
        UUID doctor=jdbc.queryForObject("select doctor_id from encounter order by started_at limit 1",UUID.class);
        UUID specialty=jdbc.queryForObject("select ds.specialty_id from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=? order by ds.primary_specialty desc,s.name,s.id limit 1",UUID.class,doctor);
        for (boolean scoped : new boolean[]{false,true}) {
            UUID selectedDoctor=scoped ? doctor : null, selectedSpecialty=scoped ? specialty : null;
            var summary=management.summary(from,to,selectedDoctor,selectedSpecialty).current();
            BigDecimal expected=switch(type) {
                case "PENDING_EXAMS" -> BigDecimal.valueOf(summary.pendingExams());
                case "OPEN_FOLLOWUPS" -> BigDecimal.valueOf(summary.openFollowUps());
                case "OCCUPIED" -> BigDecimal.valueOf(summary.occupiedMinutes());
                case "CAPACITY" -> BigDecimal.valueOf(summary.capacityMinutes());
                default -> throw new IllegalArgumentException("Unexpected report type: " + type);
            };
            for (String grouping:new String[]{"DAY","MONTH","YEAR","DOCTOR","SPECIALTY"}) {
                var analysis=reports.analysis(from,to,type,grouping,selectedDoctor,selectedSpecialty);
                var total=analysis.rows().stream().map(OperationalReportUseCase.Group::value).reduce(BigDecimal.ZERO,BigDecimal::add);
                assertEquals(0,expected.compareTo(total.setScale(0,RoundingMode.HALF_UP)),type+"/"+grouping);
                for (var row:analysis.rows()) {
                    var listing=reports.sources(from,to,type,grouping,row.key(),selectedDoctor,selectedSpecialty,0,100);
                    assertEquals(row.records(),listing.totalRecords());
                    if (!listing.records().isEmpty()) {
                        var source=listing.records().get(0);
                        var detail=reports.detail(from,to,type,grouping,row.key(),selectedDoctor,selectedSpecialty,source.sourceId(),source.sourceDate());
                        assertEquals(source,detail.record());
                    }
                }
            }
        }
        ds.destroy();
    }
}
