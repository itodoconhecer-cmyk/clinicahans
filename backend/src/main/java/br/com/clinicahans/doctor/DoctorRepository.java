package br.com.clinicahans.doctor;

import br.com.clinicahans.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class DoctorRepository {
    private final JdbcTemplate jdbc;
    public DoctorRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Doctor create(String name, String cpf, String crm, String crmState, String rqe,
                         String phone, String email, String status, int minutes, String modality) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
          insert into doctor(id,full_name,cpf,crm,crm_state,rqe,phone,email,status,default_appointment_minutes,modality)
          values (?,?,?,?,?,?,?,?,?,?,?)
          """, id, name, blank(cpf), crm, crmState.toUpperCase(), blank(rqe), blank(phone), blank(email), status, minutes, modality);
        return get(id);
    }

    public Doctor get(UUID id) {
        return jdbc.query("""
          select id,full_name,cpf,crm,crm_state,rqe,phone,email,status,default_appointment_minutes,modality,user_id,user_id
          from doctor where id=?
          """, mapper(), id).stream().findFirst().orElseThrow(() -> new NotFoundException("Médico não encontrado."));
    }

    public List<Doctor> search(String term, int limit) {
        String q = "%" + (term == null ? "" : term.trim().toLowerCase()) + "%";
        return jdbc.query("""
          select id,full_name,cpf,crm,crm_state,rqe,phone,email,status,default_appointment_minutes,modality
          from doctor
          where lower(full_name) like ? or lower(crm) like ? or lower(coalesce(rqe,'')) like ? or lower(coalesce(email,'')) like ?
          order by full_name limit ?
          """, mapper(), q,q,q,q,Math.min(Math.max(limit,1),100));
    }

    public void addAvailability(UUID doctorId, int weekday, java.time.LocalTime startsAt, java.time.LocalTime endsAt, int slotMinutes) {
        jdbc.update("""
          insert into doctor_availability(id,doctor_id,weekday,starts_at,ends_at,slot_minutes,active)
          values (?,?,?,?,?,?,true)
          """, UUID.randomUUID(), doctorId, weekday, startsAt, endsAt, slotMinutes);
    }

    public List<Availability> availability(UUID doctorId) {
        return jdbc.query("""
          select id,weekday,starts_at,ends_at,slot_minutes,active
          from doctor_availability where doctor_id=? order by weekday, starts_at
          """, (rs,n)->new Availability(rs.getObject("id",UUID.class),rs.getInt("weekday"),
            rs.getObject("starts_at",java.time.LocalTime.class),rs.getObject("ends_at",java.time.LocalTime.class),
            rs.getInt("slot_minutes"),rs.getBoolean("active")), doctorId);
    }

    private org.springframework.jdbc.core.RowMapper<Doctor> mapper() {
        return (rs,n)->new Doctor(rs.getObject("id",UUID.class),rs.getString("full_name"),rs.getString("cpf"),
          rs.getString("crm"),rs.getString("crm_state"),rs.getString("rqe"),rs.getString("phone"),rs.getString("email"),
          rs.getString("status"),rs.getInt("default_appointment_minutes"),rs.getString("modality"),rs.getObject("user_id",UUID.class));
    }
    private static String blank(String v){ return v==null||v.isBlank()?null:v.trim(); }

    public void linkUser(UUID doctorId, UUID userId) {
        get(doctorId);
        jdbc.update("update doctor set user_id=?, updated_at=now() where id=?", userId, doctorId);
    }

    public record Doctor(UUID id,String fullName,String cpf,String crm,String crmState,String rqe,String phone,String email,
                         String status,int defaultAppointmentMinutes,String modality,UUID userId){}
    public record Availability(UUID id,int weekday,java.time.LocalTime startsAt,java.time.LocalTime endsAt,int slotMinutes,boolean active){}
}
