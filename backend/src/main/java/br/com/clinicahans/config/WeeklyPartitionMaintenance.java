package br.com.clinicahans.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Order(10)
public class WeeklyPartitionMaintenance implements ApplicationRunner {
    private final JdbcTemplate jdbc;

    public WeeklyPartitionMaintenance(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        provisionUpcomingWeeks();
    }

    @Scheduled(cron = "0 15 2 * * *", zone = "America/Sao_Paulo")
    public void provisionUpcomingWeeks() {
        jdbc.execute("select maintain_clinic_week_partitions()");
    }
}
