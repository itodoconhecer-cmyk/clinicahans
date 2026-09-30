package br.com.clinicahans.security;

import br.com.clinicahans.exception.BusinessRuleException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class UserIdentityService {
    private final JdbcTemplate jdbc;
    public UserIdentityService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public UUID currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new BusinessRuleException("Usuário autenticado não encontrado.");
        var ids = jdbc.query("select id from app_user where username = ? and active = true",
            (rs, n) -> rs.getObject("id", UUID.class), auth.getName());
        if (ids.isEmpty()) throw new BusinessRuleException("Usuário autenticado não está ativo.");
        return ids.getFirst();
    }
}
