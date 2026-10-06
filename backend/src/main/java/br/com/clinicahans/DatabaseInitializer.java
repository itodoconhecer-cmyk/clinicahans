package br.com.clinicahans;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

@Component
public class DatabaseInitializer implements ApplicationRunner {
    private static final List<String> MIGRATIONS = List.of(
        "V001__initial_schema.sql", "V002__doctor_user_link.sql",
        "V003__waitlist_and_notification_outbox.sql", "V004__critical_integrity_constraints.sql");
    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public DatabaseInitializer(DataSource dataSource, JdbcTemplate jdbc) {
        this.dataSource = dataSource;
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        jdbc.execute("""
            create table if not exists schema_migration (
              version varchar(100) primary key,
              applied_at timestamptz not null default now()
            )
            """);
        for (String migration : MIGRATIONS) {
            Integer count = jdbc.queryForObject("select count(*) from schema_migration where version = ?", Integer.class, migration);
            if (count != null && count > 0) continue;
            try (Connection connection = dataSource.getConnection()) {
                connection.setAutoCommit(false);
                try {
                    ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/migration/" + migration));
                    try (var ps = connection.prepareStatement("insert into schema_migration(version) values (?)")) {
                        ps.setString(1, migration);
                        ps.executeUpdate();
                    }
                    connection.commit();
                } catch (Exception e) {
                    connection.rollback();
                    throw e;
                }
            }
        }
    }
}
