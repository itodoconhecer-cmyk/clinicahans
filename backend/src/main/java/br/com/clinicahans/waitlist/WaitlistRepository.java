package br.com.clinicahans.waitlist;

import br.com.clinicahans.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class WaitlistRepository {
    private final JdbcTemplate jdbc;
    public WaitlistRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public Entry create(UUID patientId,UUID doctorId,UUID specialtyId,OffsetDateTime from,OffsetDateTime to,int priority,UUID createdBy){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into waitlist_entry(id,patient_id,doctor_id,specialty_id,preferred_from,preferred_to,priority,created_by)
          values (?,?,?,?,?,?,?,?)
          """,id,patientId,doctorId,specialtyId,from,to,priority,createdBy);
        return get(id);
    }

    public Entry get(UUID id){
        return jdbc.query("""
          select id,patient_id,doctor_id,specialty_id,preferred_from,preferred_to,status,priority,created_at,resolved_at
          from waitlist_entry where id=?
          """,mapper(),id).stream().findFirst().orElseThrow(()->new NotFoundException("Entrada da fila de espera não encontrada."));
    }

    public List<Entry> waiting(UUID doctorId,UUID specialtyId,int limit){
        return jdbc.query("""
          select id,patient_id,doctor_id,specialty_id,preferred_from,preferred_to,status,priority,created_at,resolved_at
          from waitlist_entry
          where status='WAITING'
            and (? is null or doctor_id=?)
            and (? is null or specialty_id=?)
          order by priority desc,created_at
          limit ?
          """,mapper(),doctorId,doctorId,specialtyId,specialtyId,Math.min(Math.max(limit,1),100));
    }

    public void resolve(UUID id){
        int changed=jdbc.update("update waitlist_entry set status='RESOLVED',resolved_at=now() where id=? and status='WAITING'",id);
        if(changed==0) throw new br.com.clinicahans.exception.BusinessRuleException("Entrada da fila não está disponível para resolução.");
    }

    private org.springframework.jdbc.core.RowMapper<Entry> mapper(){
        return (rs,n)->new Entry(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
          rs.getObject("doctor_id",UUID.class),rs.getObject("specialty_id",UUID.class),
          rs.getObject("preferred_from",OffsetDateTime.class),rs.getObject("preferred_to",OffsetDateTime.class),
          rs.getString("status"),rs.getInt("priority"),rs.getObject("created_at",OffsetDateTime.class),
          rs.getObject("resolved_at",OffsetDateTime.class));
    }

    public record Entry(UUID id,UUID patientId,UUID doctorId,UUID specialtyId,OffsetDateTime preferredFrom,
                        OffsetDateTime preferredTo,String status,int priority,OffsetDateTime createdAt,OffsetDateTime resolvedAt){}
}
