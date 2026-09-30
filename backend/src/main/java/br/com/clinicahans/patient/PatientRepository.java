package br.com.clinicahans.patient;

import br.com.clinicahans.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class PatientRepository {
    private final JdbcTemplate jdbc;
    public PatientRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Patient create(String fullName, String cpf, LocalDate birthDate, String phone, String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into patient(id,full_name,cpf,birth_date,phone,email)
            values (?,?,?,?,?,?)
            """, id, fullName, blankToNull(cpf), birthDate, blankToNull(phone), blankToNull(email));
        return get(id);
    }

    public Patient get(UUID id) {
        return jdbc.query("""
            select id,full_name,cpf,birth_date,phone,email,status,created_at,updated_at,version
            from patient where id = ?
            """, mapper(), id).stream().findFirst().orElseThrow(() -> new NotFoundException("Paciente não encontrado."));
    }

    public List<Patient> search(String term, int limit) {
        String q = "%" + (term == null ? "" : term.trim().toLowerCase()) + "%";
        return jdbc.query("""
            select id,full_name,cpf,birth_date,phone,email,status,created_at,updated_at,version
            from patient
            where lower(full_name) like ? or coalesce(cpf,'') like ? or coalesce(phone,'') like ?
            order by full_name limit ?
            """, mapper(), q, q, q, Math.min(Math.max(limit, 1), 100));
    }

    public Patient update(UUID id, String fullName, String phone, String email, int version) {
        int changed = jdbc.update("""
            update patient set full_name=?, phone=?, email=?, updated_at=now(), version=version+1
            where id=? and version=?
            """, fullName, blankToNull(phone), blankToNull(email), id, version);
        if (changed == 0) throw new br.com.clinicahans.exception.BusinessRuleException("Paciente foi alterado por outra operação; recarregue o cadastro.");
        return get(id);
    }

    private org.springframework.jdbc.core.RowMapper<Patient> mapper() {
        return (rs, n) -> new Patient(
            rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("cpf"),
            rs.getObject("birth_date", LocalDate.class), rs.getString("phone"), rs.getString("email"),
            rs.getString("status"), rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class), rs.getInt("version"));
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    public record Patient(UUID id, String fullName, String cpf, LocalDate birthDate, String phone, String email,
                          String status, OffsetDateTime createdAt, OffsetDateTime updatedAt, int version) {}
}
