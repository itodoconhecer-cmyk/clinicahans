package br.com.clinicahans.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;

@Component
@Order(10)
@ConditionalOnProperty(name = "clinicahans.demo-data.enabled", havingValue = "true")
public class DemoDataRunner implements ApplicationRunner {
    private static final Logger logger = LoggerFactory.getLogger(DemoDataRunner.class);
    private final DataSource dataSource;

    public DemoDataRunner(DataSource dataSource) { this.dataSource = dataSource; }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (var connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/demo-data.sql"));
                connection.commit();
            } catch (Exception exception) {
                connection.rollback();
                throw exception;
            }
        }
        logger.info("Demo data initialized: 10 doctors, 20 patients and 1,000 appointments.");
    }
}
