package br.com.clinicahans.repository;

import br.com.clinicahans.utilities.exception.BusinessRuleException;
import br.com.clinicahans.utilities.exception.NotFoundException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class ClinicalRepository {
    private final JdbcTemplate jdbc;
    public ClinicalRepository(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public SafetySnapshot safetySnapshot(UUID patientId){
        String patientName=jdbc.query("select full_name from patient where id=?",
            (rs,n)->rs.getString(1),patientId).stream().findFirst().orElseThrow(()->new NotFoundException("Paciente não encontrado."));
        var alerts=jdbc.query("""
          select id,alert_type,severity,message,created_at from clinical_alert
          where patient_id=? and active=true order by
            case severity when 'CRITICAL' then 1 when 'HIGH' then 2 else 3 end, created_at desc
          """,(rs,n)->new Alert(rs.getObject("id",UUID.class),rs.getString("alert_type"),rs.getString("severity"),rs.getString("message"),rs.getObject("created_at",OffsetDateTime.class)),patientId);
        var allergies=jdbc.query("""
          select id,substance,reaction,severity from allergy where patient_id=? and active=true order by substance
          """,(rs,n)->new Allergy(rs.getObject("id",UUID.class),rs.getString("substance"),rs.getString("reaction"),rs.getString("severity")),patientId);
        var medications=jdbc.query("""
          select id,name,dosage,frequency from medication where patient_id=? and active=true order by name
          """,(rs,n)->new Medication(rs.getObject("id",UUID.class),rs.getString("name"),rs.getString("dosage"),rs.getString("frequency")),patientId);
        var conditions=jdbc.query("""
          select id,description,status from clinical_condition where patient_id=? and status <> 'RESOLVED' order by description
          """,(rs,n)->new Condition(rs.getObject("id",UUID.class),rs.getString("description"),rs.getString("status")),patientId);
        return new SafetySnapshot(patientId,patientName,alerts,allergies,medications,conditions);
    }

    public Encounter createEncounter(UUID patientId,UUID doctorId,UUID appointmentId,UUID userId){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into encounter(id,patient_id,doctor_id,appointment_id,status,created_by)
          values (?,?,?,?, 'DRAFT', ?)
          """,id,patientId,doctorId,appointmentId,userId);
        return getEncounter(id);
    }

    public Encounter getEncounter(UUID id){
        return jdbc.query("""
          select id,patient_id,doctor_id,appointment_id,chief_complaint,assessment,plan,status,version,started_at,completed_at
          from encounter where id=?
          """,(rs,n)->new Encounter(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
          rs.getObject("doctor_id",UUID.class),rs.getObject("appointment_id",UUID.class),rs.getString("chief_complaint"),
          rs.getString("assessment"),rs.getString("plan"),rs.getString("status"),rs.getInt("version"),
          rs.getObject("started_at",OffsetDateTime.class),rs.getObject("completed_at",OffsetDateTime.class)),id)
          .stream().findFirst().orElseThrow(()->new NotFoundException("Atendimento não encontrado."));
    }

    public Encounter saveDraft(UUID id,String chiefComplaint,String assessment,String plan,int version){
        int changed=jdbc.update("""
          update encounter set chief_complaint=?,assessment=?,plan=?,version=version+1
          where id=? and status='DRAFT' and version=?
          """,chiefComplaint,assessment,plan,id,version);
        if(changed==0) throw new BusinessRuleException("Atendimento não pode ser alterado ou foi modificado por outra operação.");
        return getEncounter(id);
    }

    public Encounter finalizeEncounter(UUID id,int version){
        int changed=jdbc.update("""
          update encounter set status='FINAL',completed_at=now(),version=version+1
          where id=? and status='DRAFT' and version=?
          """,id,version);
        if(changed==0) throw new BusinessRuleException("Somente atendimento em rascunho e na versão atual pode ser finalizado.");
        return getEncounter(id);
    }

    public Addendum addAddendum(UUID encounterId,UUID author,String reason,String content){
        var encounter=getEncounter(encounterId);
        if(!"FINAL".equals(encounter.status())) throw new BusinessRuleException("Adendo só pode ser criado para atendimento finalizado.");
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into encounter_addendum(id,encounter_id,author_user_id,reason,content)
          values (?,?,?,?,?)
          """,id,encounterId,author,reason,content);
        return jdbc.query("""
          select id,encounter_id,reason,content,created_at from encounter_addendum where id=?
          """,(rs,n)->new Addendum(rs.getObject("id",UUID.class),rs.getObject("encounter_id",UUID.class),rs.getString("reason"),
            rs.getString("content"),rs.getObject("created_at",OffsetDateTime.class)),id).getFirst();
    }

    public Medication createMedication(UUID patientId,String name,String dosage,String frequency,java.time.LocalDate startedOn){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into medication(id,patient_id,name,dosage,frequency,started_on,active)
          values (?,?,?,?,?,?,true)
          """,id,patientId,name,dosage,frequency,startedOn);
        return new Medication(id,name,dosage,frequency);
    }

    public Condition createCondition(UUID patientId,String description,String status,java.time.LocalDate onsetDate){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into clinical_condition(id,patient_id,description,status,onset_date)
          values (?,?,?,?,?)
          """,id,patientId,description,status,onsetDate);
        return new Condition(id,description,status);
    }

    public Alert createManualAlert(UUID patientId,String type,String severity,String message){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into clinical_alert(id,patient_id,alert_type,severity,source_type,source_id,message,active)
          values (?,?,?,?, 'MANUAL', null, ?, true)
          """,id,patientId,type,severity,message);
        return new Alert(id,type,severity,message,OffsetDateTime.now());
    }

    public void deactivateAlert(UUID patientId,UUID alertId){
        int changed=jdbc.update("update clinical_alert set active=false where id=? and patient_id=? and active=true",alertId,patientId);
        if(changed==0) throw new NotFoundException("Alerta ativo não encontrado.");
    }

    public ClinicalDocument createDocument(UUID patientId,UUID encounterId,String documentType,String storageKey,String mimeType,String checksum){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into clinical_document(id,patient_id,encounter_id,document_type,storage_key,mime_type,checksum)
          values (?,?,?,?,?,?,?)
          """,id,patientId,encounterId,documentType,storageKey,mimeType,checksum);
        return new ClinicalDocument(id,patientId,encounterId,documentType,storageKey,mimeType,checksum,OffsetDateTime.now());
    }

    public List<ClinicalDocument> documents(UUID patientId){
        return jdbc.query("""
          select id,patient_id,encounter_id,document_type,storage_key,mime_type,checksum,created_at
          from clinical_document where patient_id=? order by created_at desc
          """,(rs,n)->new ClinicalDocument(rs.getObject("id",UUID.class),rs.getObject("patient_id",UUID.class),
            rs.getObject("encounter_id",UUID.class),rs.getString("document_type"),rs.getString("storage_key"),
            rs.getString("mime_type"),rs.getString("checksum"),rs.getObject("created_at",OffsetDateTime.class)),patientId);
    }

    public Allergy createAllergy(UUID patientId,String substance,String reaction,String severity,UUID userId){
        UUID id=UUID.randomUUID();
        jdbc.update("""
          insert into allergy(id,patient_id,substance,reaction,severity,recorded_by)
          values (?,?,?,?,?,?)
          """,id,patientId,substance,reaction,severity,userId);
        if("HIGH".equals(severity)||"CRITICAL".equals(severity)){
            jdbc.update("""
              insert into clinical_alert(id,patient_id,alert_type,severity,source_type,source_id,message)
              values (?,?,?,?, 'ALLERGY', ?,?)
              """,UUID.randomUUID(),patientId,"MEDICATION_REACTION",severity,id,
              "Alergia/reação ativa: "+substance+(reaction==null||reaction.isBlank()?"":" — "+reaction));
        }
        return new Allergy(id,substance,reaction,severity);
    }

    public List<TimelineEvent> timeline(UUID patientId,int limit){
        return jdbc.query("""
          select event_type, event_id, title, occurred_at from (
            select 'ENCOUNTER' event_type, id event_id, 'Atendimento clínico' title, coalesce(completed_at,started_at) occurred_at
              from encounter where patient_id=?
            union all
            select 'ALLERGY', id, 'Alergia/reação: '||substance, recorded_at from allergy where patient_id=?
            union all
            select 'EXAM_ORDER', id, 'Exame: '||exam_name, created_at from exam_order where patient_id=?
            union all
            select 'FOLLOW_UP', id, 'Acompanhamento: '||reason, created_at from follow_up where patient_id=?
          ) x order by occurred_at desc limit ?
          """,(rs,n)->new TimelineEvent(rs.getString("event_type"),rs.getObject("event_id",UUID.class),
            rs.getString("title"),rs.getObject("occurred_at",OffsetDateTime.class)),patientId,patientId,patientId,patientId,Math.min(Math.max(limit,1),100));
    }

    public record SafetySnapshot(UUID patientId,String patientName,List<Alert> alerts,List<Allergy> allergies,List<Medication> medications,List<Condition> conditions){}
    public record Alert(UUID id,String type,String severity,String message,OffsetDateTime createdAt){}
    public record Allergy(UUID id,String substance,String reaction,String severity){}
    public record Medication(UUID id,String name,String dosage,String frequency){}
    public record Condition(UUID id,String description,String status){}
    public record Encounter(UUID id,UUID patientId,UUID doctorId,UUID appointmentId,String chiefComplaint,String assessment,String plan,String status,int version,OffsetDateTime startedAt,OffsetDateTime completedAt){}
    public record Addendum(UUID id,UUID encounterId,String reason,String content,OffsetDateTime createdAt){}
    public record ClinicalDocument(UUID id,UUID patientId,UUID encounterId,String documentType,String storageKey,String mimeType,String checksum,OffsetDateTime createdAt){}
    public record TimelineEvent(String type,UUID id,String title,OffsetDateTime occurredAt){}
}
