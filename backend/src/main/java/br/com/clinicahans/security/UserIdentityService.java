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

    public boolean currentUserHasRole(String role) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + role));
    }

    public boolean currentDoctorHasRelationshipWithPatient(UUID patientId) {
        if (currentUserHasRole("ADMIN")) return true;
        UUID doctorId = currentDoctorId();
        Integer count = jdbc.queryForObject("""
            select count(*) from (
              select 1 from appointment
               where doctor_id=? and patient_id=?
                 and status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED')
              union all
              select 1 from encounter where doctor_id=? and patient_id=?
            ) rel
            """, Integer.class, doctorId, patientId, doctorId, patientId);
        return count != null && count > 0;
    }

    public UUID currentDoctorId() {
        UUID userId = currentUserId();
        var ids = jdbc.query("select id from doctor where user_id = ? and status = 'ACTIVE'",
            (rs, n) -> rs.getObject("id", UUID.class), userId);
        if (ids.isEmpty()) throw new BusinessRuleException("Usuário médico não está vinculado a um cadastro médico ativo.");
        return ids.getFirst();
    }

    public UUID currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw new BusinessRuleException("Usuário autenticado não encontrado.");
        var ids = jdbc.query("select id from app_user where username = ? and active = true",
            (rs, n) -> rs.getObject("id", UUID.class), auth.getName());
        if (ids.isEmpty()) throw new BusinessRuleException("Usuário autenticado não está ativo.");
        return ids.getFirst();
    }
}
