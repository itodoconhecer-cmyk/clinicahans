package br.com.clinicahans.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
@org.springframework.core.annotation.Order(0)
public class DatabaseMigrationRunner implements ApplicationRunner {
    private static final List<String> MIGRATIONS = List.of(
        "V001__initial_schema.sql", "V002__doctor_user_link.sql", "V003__waitlist_and_notification_outbox.sql",
        "V004__critical_integrity_constraints.sql", "V005__operation_audit_details.sql",
        "V006__patient_insurance_card.sql", "V007__cme_medical_specialty_catalog.sql",
        "V008__specialty_search_aliases.sql", "V009__appointment_calendar_search_index.sql",
        "V010__audit_request_context.sql", "V011__weekly_clinical_partitions.sql",
        "V012__partition_trigger_identity.sql");
    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public DatabaseMigrationRunner(DataSource dataSource, JdbcTemplate jdbc) {
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
                    String script;
                    try (var input = new ClassPathResource("db/migration/" + migration).getInputStream()) {
                        script = new String(input.readAllBytes(), StandardCharsets.UTF_8);
                    }
                    int statementNumber = 0;
                    for (String sql : splitStatements(script)) {
                        statementNumber++;
                        try (Statement statement = connection.createStatement()) {
                            statement.execute(sql);
                        } catch (Exception e) {
                            throw new IllegalStateException("Falha na migration " + migration + ", instrução " + statementNumber, e);
                        }
                    }
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

    private static List<String> splitStatements(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean singleQuoted = false;
        boolean doubleQuoted = false;
        boolean lineComment = false;
        boolean blockComment = false;
        String dollarQuote = null;

        for (int i = 0; i < script.length(); i++) {
            char c = script.charAt(i);
            char next = i + 1 < script.length() ? script.charAt(i + 1) : '\0';

            if (dollarQuote != null) {
                if (script.startsWith(dollarQuote, i)) {
                    current.append(dollarQuote);
                    i += dollarQuote.length() - 1;
                    dollarQuote = null;
                } else {
                    current.append(c);
                }
                continue;
            }
            if (lineComment) {
                current.append(c);
                if (c == '\n') lineComment = false;
                continue;
            }
            if (blockComment) {
                current.append(c);
                if (c == '*' && next == '/') {
                    current.append(next);
                    i++;
                    blockComment = false;
                }
                continue;
            }
            if (singleQuoted) {
                current.append(c);
                if (c == '\'' && next == '\'') {
                    current.append(next);
                    i++;
                } else if (c == '\'') {
                    singleQuoted = false;
                }
                continue;
            }
            if (doubleQuoted) {
                current.append(c);
                if (c == '"' && next == '"') {
                    current.append(next);
                    i++;
                } else if (c == '"') {
                    doubleQuoted = false;
                }
                continue;
            }
            if (c == '-' && next == '-') {
                current.append(c).append(next);
                i++;
                lineComment = true;
                continue;
            }
            if (c == '/' && next == '*') {
                current.append(c).append(next);
                i++;
                blockComment = true;
                continue;
            }
            if (c == '\'') {
                current.append(c);
                singleQuoted = true;
                continue;
            }
            if (c == '"') {
                current.append(c);
                doubleQuoted = true;
                continue;
            }
            if (c == '$') {
                int tagEnd = script.indexOf('$', i + 1);
                if (tagEnd >= 0) {
                    String tagBody = script.substring(i + 1, tagEnd);
                    if (tagBody.isEmpty() || tagBody.matches("[A-Za-z_][A-Za-z0-9_]*")) {
                        dollarQuote = script.substring(i, tagEnd + 1);
                        current.append(dollarQuote);
                        i = tagEnd;
                        continue;
                    }
                }
            }
            if (c == ';') {
                String statement = current.toString().trim();
                if (!statement.isEmpty()) statements.add(statement);
                current.setLength(0);
            } else {
                current.append(c);
            }
        }

        if (singleQuoted || doubleQuoted || blockComment || dollarQuote != null) {
            throw new IllegalArgumentException("Script SQL terminou com uma string ou comentário sem fechamento.");
        }
        String remainder = current.toString().trim();
        if (!remainder.isEmpty()) statements.add(remainder);
        return statements;
    }
}
