package br.com.clinicahans.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class UserAccountRepository {
    private final JdbcTemplate jdbc;
    public UserAccountRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<UserAccount> findByUsername(String username) {
        var users = jdbc.query("""
            select id, username, password_hash, active from app_user where username = ?
            """, (rs, n) -> new BaseUser(
                rs.getObject("id", UUID.class), rs.getString("username"),
                rs.getString("password_hash"), rs.getBoolean("active")), username);
        if (users.isEmpty()) return Optional.empty();
        var user = users.getFirst();
        List<String> roles = jdbc.query("""
            select r.code from role r
            join user_role ur on ur.role_id = r.id
            where ur.user_id = ?
            order by r.code
            """, (rs, n) -> rs.getString(1), user.id());
        return Optional.of(new UserAccount(user.id(), user.username(), user.passwordHash(), user.active(), roles));
    }

    private record BaseUser(UUID id, String username, String passwordHash, boolean active) {}
    public record UserAccount(UUID id, String username, String passwordHash, boolean active, List<String> roles) {}
}
