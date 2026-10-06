package br.com.clinicahans.continuity;

import br.com.clinicahans.exception.BusinessRuleException;
import br.com.clinicahans.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class ContinuityRepository {
    private final JdbcTemplate jdbc;
    public ContinuityRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public ExamOrder createExam(UUID patientId,UUID encounterId,UUID requestedBy,String examName,String priority,LocalDate expectedBy){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into exam_order(id,patient_id,encounter_id,requested_by,exam_name,priority,status,expected_by)
          values (?,?,?,?,?,?,'REQUESTED',?)
          """,id,patientId,encounterId,requestedBy,examName,priority,expectedBy);
        return getExam(id);
    }

    public ExamOrder getExam(UUID id){
        return jdbc.query("""
          select id,patient_id,encounter_id,exam_name,priority,status,expected_by,created_at
          from exam_order where id=?
          """,(rs,n)->new ExamOrder(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
          rs.getObject("encounter_id",UUID.class),rs.getString("exam_name"),rs.getString("priority"),
          rs.getString("status"),rs.getObject("expected_by",LocalDate.class),rs.getObject("created_at",OffsetDateTime.class)),id)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Solicitação de exame não encontrada."));
    }

    public ExamResult receiveResult(UUID orderId,String storageKey,String mimeType){
        var order=getExam(orderId);
        if(!List.of("REQUESTED","PERFORMED").contains(order.status())) throw new BusinessRuleException("Exame não está apto a receber resultado.");
        UUID id=UUID.randomUUID();
        jdbc.update("insert into exam_result(id,exam_order_id,storage_key,mime_type) values (?,?,?,?)",id,orderId,storageKey,mimeType);
        jdbc.update("update exam_order set status='RESULT_RECEIVED' where id=?",orderId);
        return new ExamResult(id,orderId,storageKey,mimeType,OffsetDateTime.now());
    }

    public ExamResult findResultByOrder(UUID orderId){
        return jdbc.query("""
          select id,exam_order_id,storage_key,mime_type,received_at
          from exam_result where exam_order_id=?
          """,(rs,n)->new ExamResult(rs.getObject("id",UUID.class),rs.getObject("exam_order_id",UUID.class),
            rs.getString("storage_key"),rs.getString("mime_type"),rs.getObject("received_at",OffsetDateTime.class)),orderId)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Resultado do exame não encontrado."));
    }

    public ExamOrder getExamByResult(UUID resultId){
        return jdbc.query("""
          select o.id,o.patient_id,o.encounter_id,o.exam_name,o.priority,o.status,o.expected_by,o.created_at
          from exam_order o join exam_result r on r.exam_order_id=o.id
          where r.id=?
          """,(rs,n)->new ExamOrder(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getObject("encounter_id",UUID.class),rs.getString("exam_name"),rs.getString("priority"),
            rs.getString("status"),rs.getObject("expected_by",LocalDate.class),rs.getObject("created_at",OffsetDateTime.class)),resultId)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Resultado não encontrado."));
    }

    public void reviewResult(UUID resultId,UUID reviewedBy,String note){
        Integer count=jdbc.queryForObject("select count(*) from result_review where exam_result_id=?",Integer.class,resultId);
        if(count!=null && count>0) throw new BusinessRuleException("Resultado já foi revisado.");
        UUID orderId=jdbc.query("""
          select exam_order_id from exam_result where id=?
          """,(rs,n)->rs.getObject(1,UUID.class),resultId).stream().findFirst().orElseThrow(()->new NotFoundException("Resultado não encontrado."));
        jdbc.update("insert into result_review(id,exam_result_id,reviewed_by,note) values (?,?,?,?)",
            UUID.randomUUID(),resultId,reviewedBy,note);
        jdbc.update("update exam_order set status='REVIEWED' where id=?",orderId);
    }

    public FollowUp createFollowUp(UUID patientId,UUID encounterId,UUID owner,String reason,String priority,OffsetDateTime dueAt){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into follow_up(id,patient_id,encounter_id,owner_user_id,reason,priority,status,due_at)
          values (?,?,?,?,?,?,'OPEN',?)
          """,id,patientId,encounterId,owner,reason,priority,dueAt);
        return getFollowUp(id);
    }

    public FollowUp getFollowUp(UUID id){
        return jdbc.query("""
          select id,patient_id,encounter_id,owner_user_id,reason,priority,status,due_at,created_at,closed_at
          from follow_up where id=?
          """,(rs,n)->new FollowUp(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getObject("encounter_id",UUID.class),rs.getObject("owner_user_id",UUID.class),rs.getString("reason"),
            rs.getString("priority"),effectiveStatus(rs.getString("status"),rs.getObject("due_at",OffsetDateTime.class)),
            rs.getObject("due_at",OffsetDateTime.class),rs.getObject("created_at",OffsetDateTime.class),
            rs.getObject("closed_at",OffsetDateTime.class)),id).stream().findFirst()
          .orElseThrow(()->new NotFoundException("Acompanhamento não encontrado."));
    }

    public void addAction(UUID followUpId,UUID actor,String actionType,String note,boolean close){
        getFollowUp(followUpId);
        jdbc.update("""
          insert into follow_up_action(id,follow_up_id,actor_user_id,action_type,note)
          values (?,?,?,?,?)
          """,UUID.randomUUID(),followUpId,actor,actionType,note);
        if(close) jdbc.update("update follow_up set status='CLOSED',closed_at=now() where id=? and status<>'CLOSED'",followUpId);
    }

    public List<OperationalFollowUp> operationalQueue(int limit){
        return jdbc.query("""
          select f.id,f.patient_id,p.full_name,f.priority,f.status,f.due_at
          from follow_up f join patient p on p.id=f.patient_id
          where f.status='OPEN'
          order by case f.priority when 'CRITICAL' then 1 when 'HIGH' then 2 when 'MEDIUM' then 3 else 4 end,
                   f.due_at nulls last
          limit ?
          """,(rs,n)->new OperationalFollowUp(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getString("full_name"),rs.getString("priority"),
            effectiveStatus(rs.getString("status"),rs.getObject("due_at",OffsetDateTime.class)),
            rs.getObject("due_at",OffsetDateTime.class)),Math.min(Math.max(limit,1),100));
    }

    public List<ExamOrder> pendingExamsForDoctor(UUID doctorId,int limit){
        return jdbc.query("""
          select o.id,o.patient_id,o.encounter_id,o.exam_name,o.priority,o.status,o.expected_by,o.created_at
          from exam_order o join encounter e on e.id=o.encounter_id
          where e.doctor_id=? and o.status not in ('REVIEWED','CANCELLED')
          order by o.expected_by nulls last,o.created_at limit ?
          """,(rs,n)->new ExamOrder(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getObject("encounter_id",UUID.class),rs.getString("exam_name"),rs.getString("priority"),
            rs.getString("status"),rs.getObject("expected_by",LocalDate.class),rs.getObject("created_at",OffsetDateTime.class)),
            doctorId,Math.min(Math.max(limit,1),100));
    }

    public List<ExamOrder> pendingExams(int limit){
        return jdbc.query("""
          select id,patient_id,encounter_id,exam_name,priority,status,expected_by,created_at
          from exam_order where status not in ('REVIEWED','CANCELLED')
          order by expected_by nulls last, created_at limit ?
          """,(rs,n)->new ExamOrder(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getObject("encounter_id",UUID.class),rs.getString("exam_name"),rs.getString("priority"),
            rs.getString("status"),rs.getObject("expected_by",LocalDate.class),rs.getObject("created_at",OffsetDateTime.class)),
            Math.min(Math.max(limit,1),100));
    }

    private static String effectiveStatus(String status,OffsetDateTime dueAt){
        if("OPEN".equals(status)&&dueAt!=null&&dueAt.isBefore(OffsetDateTime.now())) return "OVERDUE";
        return status;
    }

    public record ExamOrder(UUID id,UUID patientId,UUID encounterId,String examName,String priority,String status,LocalDate expectedBy,OffsetDateTime createdAt){}
    public record ExamResult(UUID id,UUID examOrderId,String storageKey,String mimeType,OffsetDateTime receivedAt){}
    public record FollowUp(UUID id,UUID patientId,UUID encounterId,UUID ownerUserId,String reason,String priority,String status,OffsetDateTime dueAt,OffsetDateTime createdAt,OffsetDateTime closedAt){}
    public record OperationalFollowUp(UUID id,UUID patientId,String patientName,String priority,String status,OffsetDateTime dueAt){}
}
