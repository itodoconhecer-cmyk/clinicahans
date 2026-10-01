package br.com.clinicahans.appointment;

import br.com.clinicahans.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class AppointmentRepository {
    private final JdbcTemplate jdbc;
    public AppointmentRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public Appointment create(UUID patientId,UUID doctorId,OffsetDateTime start,OffsetDateTime end,String modality,String notes,UUID createdBy){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into appointment(id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,created_by)
          values (?,?,?,?,?,?, 'SCHEDULED', ?,?)
          """,id,patientId,doctorId,start,end,modality,notes,createdBy);
        jdbc.update("""
          insert into appointment_status_history(id,appointment_id,from_status,to_status,changed_by,reason)
          values (?,?,null,'SCHEDULED',?,'Criação do agendamento')
          """,UUID.randomUUID(),id,createdBy);
        jdbc.update("""
          insert into notification_outbox(id,aggregate_type,aggregate_id,recipient_ref,template_code,channel)
          values (?,'APPOINTMENT',?,?,'APPOINTMENT_CONFIRMATION',null)
          """,UUID.randomUUID(),id,patientId);
        return get(id);
    }

    public Appointment get(UUID id){
        return jdbc.query("""
          select id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,cancellation_reason,
                 confirmed_at,checked_in_at,created_at,updated_at
          from appointment where id=?
          """,mapper(),id).stream().findFirst().orElseThrow(()->new NotFoundException("Agendamento não encontrado."));
    }

    public List<Appointment> list(OffsetDateTime from,OffsetDateTime to,UUID doctorId){
        if(doctorId==null){
            return jdbc.query("""
              select id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,cancellation_reason,
                     confirmed_at,checked_in_at,created_at,updated_at
              from appointment where starts_at>=? and starts_at<? order by starts_at
              """,mapper(),from,to);
        }
        return jdbc.query("""
          select id,patient_id,doctor_id,starts_at,ends_at,modality,status,notes,cancellation_reason,
                 confirmed_at,checked_in_at,created_at,updated_at
          from appointment where starts_at>=? and starts_at<? and doctor_id=? order by starts_at
          """,mapper(),from,to,doctorId);
    }

    public boolean hasScheduleBlock(UUID doctorId,OffsetDateTime start,OffsetDateTime end){
        Integer count=jdbc.queryForObject("""
          select count(*) from schedule_block
          where doctor_id=? and starts_at < ? and ends_at > ?
          """,Integer.class,doctorId,end,start);
        return count!=null && count>0;
    }

    public boolean hasConflict(UUID doctorId,OffsetDateTime start,OffsetDateTime end){
        Integer count=jdbc.queryForObject("""
          select count(*) from appointment
          where doctor_id=? and status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE')
            and starts_at < ? and ends_at > ?
          """,Integer.class,doctorId,end,start);
        return count!=null && count>0;
    }

    public void changeStatus(UUID id,AppointmentStatus target,String reason,UUID actor){
        var current=get(id);
        OffsetDateTime confirmed=target==AppointmentStatus.CONFIRMED?OffsetDateTime.now():current.confirmedAt();
        OffsetDateTime checkin=target==AppointmentStatus.CHECKED_IN?OffsetDateTime.now():current.checkedInAt();
        jdbc.update("""
          update appointment set status=?, cancellation_reason=?, confirmed_at=?, checked_in_at=?, updated_at=now()
          where id=?
          """,target.name(),target==AppointmentStatus.CANCELLED?reason:current.cancellationReason(),confirmed,checkin,id);
        jdbc.update("""
          insert into appointment_status_history(id,appointment_id,from_status,to_status,changed_by,reason)
          values (?,?,?,?,?,?)
          """,UUID.randomUUID(),id,current.status().name(),target.name(),actor,reason);
    }

    private org.springframework.jdbc.core.RowMapper<Appointment> mapper(){
        return (rs,n)->new Appointment(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
          rs.getObject("doctor_id",UUID.class),rs.getObject("starts_at",OffsetDateTime.class),
          rs.getObject("ends_at",OffsetDateTime.class),rs.getString("modality"),
          AppointmentStatus.valueOf(rs.getString("status")),rs.getString("notes"),rs.getString("cancellation_reason"),
          rs.getObject("confirmed_at",OffsetDateTime.class),rs.getObject("checked_in_at",OffsetDateTime.class),
          rs.getObject("created_at",OffsetDateTime.class),rs.getObject("updated_at",OffsetDateTime.class));
    }

    public record Appointment(UUID id,UUID patientId,UUID doctorId,OffsetDateTime startsAt,OffsetDateTime endsAt,
      String modality,AppointmentStatus status,String notes,String cancellationReason,OffsetDateTime confirmedAt,
      OffsetDateTime checkedInAt,OffsetDateTime createdAt,OffsetDateTime updatedAt){}
}
