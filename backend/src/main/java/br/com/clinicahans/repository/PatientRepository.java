package br.com.clinicahans.repository;

import br.com.clinicahans.model.patient.Patient;
import br.com.clinicahans.utilities.exception.BusinessRuleException;

import br.com.clinicahans.utilities.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.text.Normalizer;
import java.util.Locale;
import java.util.List;
import java.util.UUID;

@Repository
public class PatientRepository {
    private final JdbcTemplate jdbc;
    public PatientRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Patient create(String fullName, String cpf, LocalDate birthDate, String phone, String email, String insuranceCard) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
            insert into patient(id,full_name,cpf,birth_date,phone,email,insurance_card)
            values (?,?,?,?,?,?,?)
            """, id, fullName, blankToNull(cpf), birthDate, blankToNull(phone), blankToNull(email), blankToNull(insuranceCard));
        return get(id);
    }

    public Patient get(UUID id) {
        return jdbc.query("""
            select id,full_name,cpf,insurance_card,birth_date,phone,email,status,created_at,updated_at,version
            from patient where id = ?
            """, mapper(), id).stream().findFirst().orElseThrow(() -> new NotFoundException("Paciente não encontrado."));
    }

    public List<Patient> search(String term, int limit) {
        String q = "%" + (term == null ? "" : term.trim().toLowerCase()) + "%";
        return jdbc.query("""
            select id,full_name,cpf,insurance_card,birth_date,phone,email,status,created_at,updated_at,version
            from patient
            where lower(full_name) like ? or coalesce(cpf,'') like ? or coalesce(phone,'') like ? or lower(coalesce(insurance_card,'')) like ?
            order by full_name limit ?
            """, mapper(), q, q, q, q, Math.min(Math.max(limit, 1), 100));
    }

    public List<Patient> searchForDoctor(String term, int limit, UUID doctorId) {
        String q = "%" + (term == null ? "" : term.trim().toLowerCase()) + "%";
        return jdbc.query("""
            select distinct p.id,p.full_name,p.cpf,p.insurance_card,p.birth_date,p.phone,p.email,p.status,p.created_at,p.updated_at,p.version
            from patient p
            where (lower(p.full_name) like ? or coalesce(p.cpf,'') like ? or coalesce(p.phone,'') like ? or lower(coalesce(p.insurance_card,'')) like ?)
              and (
                exists(select 1 from encounter_locator e where e.patient_id=p.id and e.doctor_id=?)
                or exists(select 1 from appointment_locator a where a.patient_id=p.id and a.doctor_id=?
                  and a.status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED'))
              )
            order by p.full_name limit ?
            """, mapper(), q,q,q,q,doctorId,doctorId,Math.min(Math.max(limit,1),100));
    }

    public List<Patient> smartSearch(String term) {
        String text = term == null ? "" : Normalizer.normalize(term.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        String digits = text.replaceAll("[^0-9]", "");
        return jdbc.query("""
            select id,full_name,cpf,insurance_card,birth_date,phone,email,status,created_at,updated_at,version
            from patient
            where position(? in translate(lower(full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc'))>0
               or (?<>'' and position(? in regexp_replace(coalesce(cpf,''),'[^0-9]','','g'))>0)
               or (?<>'' and position(? in regexp_replace(lower(coalesce(insurance_card,'')),'[^0-9A-Za-z]','','g'))>0)
               or position(? in lower(coalesce(phone,'')))>0
               or position(? in lower(coalesce(email,'')))>0
            order by full_name limit 11
            """, mapper(), text, digits, digits, text.replaceAll("[^0-9A-Za-z]", ""),
            text.replaceAll("[^0-9A-Za-z]", ""), text, text);
    }

    public Patient update(UUID id, String fullName, String phone, String email, String insuranceCard, int version) {
        int changed = jdbc.update("""
            update patient set full_name=?, phone=?, email=?, insurance_card=?, updated_at=now(), version=version+1
            where id=? and version=?
            """, fullName, blankToNull(phone), blankToNull(email), blankToNull(insuranceCard), id, version);
        if (changed == 0) throw new br.com.clinicahans.utilities.exception.BusinessRuleException("Paciente foi alterado por outra operação; recarregue o cadastro.");
        return get(id);
    }

    private org.springframework.jdbc.core.RowMapper<Patient> mapper() {
        return (rs, n) -> new Patient(
            rs.getObject("id", UUID.class), rs.getString("full_name"), rs.getString("cpf"), rs.getString("insurance_card"),
            rs.getObject("birth_date", LocalDate.class), rs.getString("phone"), rs.getString("email"),
            rs.getString("status"), rs.getObject("created_at", OffsetDateTime.class),
            rs.getObject("updated_at", OffsetDateTime.class), rs.getInt("version"));
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

}
