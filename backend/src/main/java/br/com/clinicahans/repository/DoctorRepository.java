package br.com.clinicahans.repository;

import br.com.clinicahans.utilities.exception.NotFoundException;
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
          select id,full_name,cpf,crm,crm_state,rqe,phone,email,status,default_appointment_minutes,modality,user_id
          from doctor where id=?
          """, mapper(), id).stream().findFirst().orElseThrow(() -> new NotFoundException("Médico não encontrado."));
    }

    public List<Doctor> search(String term, int limit) {
        String q = "%" + (term == null ? "" : term.trim().toLowerCase()) + "%";
        return jdbc.query("""
          select id,full_name,cpf,crm,crm_state,rqe,phone,email,status,default_appointment_minutes,modality,user_id
          from doctor
          where lower(full_name) like ? or lower(crm) like ? or lower(coalesce(rqe,'')) like ? or lower(coalesce(email,'')) like ?
             or exists (
               select 1 from doctor_specialty ds join specialty s on s.id=ds.specialty_id
               where ds.doctor_id=doctor.id and lower(s.name) like ?
             )
          order by full_name limit ?
          """, mapper(), q,q,q,q,q,Math.min(Math.max(limit,1),100));
    }

    public Specialty createSpecialty(String name, String externalSystem, String externalCode) {
        UUID id=UUID.randomUUID();
        jdbc.update("insert into specialty(id,name,external_system,external_code) values (?,?,?,?)",
            id,name,blank(externalSystem),blank(externalCode));
        return new Specialty(id,name,blank(externalSystem),blank(externalCode));
    }

    public List<Specialty> listSpecialties() {
        return jdbc.query("select id,name,external_system,external_code from specialty order by name",
            (rs,n)->new Specialty(rs.getObject("id",UUID.class),rs.getString("name"),rs.getString("external_system"),rs.getString("external_code")));
    }

    public void linkSpecialty(UUID doctorId, UUID specialtyId, boolean primary) {
        get(doctorId);
        if(primary) jdbc.update("update doctor_specialty set primary_specialty=false where doctor_id=?",doctorId);
        jdbc.update("""
          insert into doctor_specialty(doctor_id,specialty_id,primary_specialty)
          values (?,?,?)
          on conflict (doctor_id,specialty_id) do update set primary_specialty=excluded.primary_specialty
          """,doctorId,specialtyId,primary);
    }

    public void addScheduleBlock(UUID doctorId, java.time.OffsetDateTime startsAt, java.time.OffsetDateTime endsAt, String reason) {
        get(doctorId);
        jdbc.update("insert into schedule_block(id,doctor_id,starts_at,ends_at,reason) values (?,?,?,?,?)",
            UUID.randomUUID(),doctorId,startsAt,endsAt,reason);
    }

    public List<ScheduleBlock> scheduleBlocks(UUID doctorId, java.time.OffsetDateTime from, java.time.OffsetDateTime to) {
        return jdbc.query("""
          select id,starts_at,ends_at,reason from schedule_block
          where doctor_id=? and starts_at < ? and ends_at > ?
          order by starts_at
          """,(rs,n)->new ScheduleBlock(rs.getObject("id",UUID.class),rs.getObject("starts_at",java.time.OffsetDateTime.class),
            rs.getObject("ends_at",java.time.OffsetDateTime.class),rs.getString("reason")),doctorId,to,from);
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
    public record Specialty(UUID id,String name,String externalSystem,String externalCode){}
    public record ScheduleBlock(UUID id,java.time.OffsetDateTime startsAt,java.time.OffsetDateTime endsAt,String reason){}
    public record Availability(UUID id,int weekday,java.time.LocalTime startsAt,java.time.LocalTime endsAt,int slotMinutes,boolean active){}
}
