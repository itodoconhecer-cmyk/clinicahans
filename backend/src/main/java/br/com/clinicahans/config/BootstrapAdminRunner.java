package br.com.clinicahans.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class BootstrapAdminRunner implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final String username;
    private final String password;

    public BootstrapAdminRunner(JdbcTemplate jdbc, PasswordEncoder encoder,
        @Value("${clinicahans.bootstrap-admin.username}") String username,
        @Value("${clinicahans.bootstrap-admin.password}") String password) {
        this.jdbc = jdbc; this.encoder = encoder; this.username = username; this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) return;
        Integer count = jdbc.queryForObject("select count(*) from app_user where username = ?", Integer.class, username);
        if (count != null && count > 0) return;
        UUID userId = UUID.randomUUID();
        jdbc.update("insert into app_user(id, username, password_hash, active) values (?,?,?,true)",
            userId, username, encoder.encode(password));
        jdbc.update("""
            insert into user_role(user_id, role_id)
            select ?, id from role where code = 'ADMIN'
            """, userId);
    }
}
