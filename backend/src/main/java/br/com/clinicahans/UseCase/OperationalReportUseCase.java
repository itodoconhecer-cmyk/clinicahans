package br.com.clinicahans.UseCase;

import br.com.clinicahans.utilities.exception.NotFoundException;
import org.slf4j.MDC;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.time.*;
import java.util.*;

/** Traceable operational indicator sources; no patient or clinical text is exposed. */
@Service
public class OperationalReportUseCase {
    private final NamedParameterJdbcTemplate jdbc;
    public OperationalReportUseCase(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final String SPECIALTY = " left join lateral (select s.id,s.name from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=d.id order by ds.primary_specialty desc,s.name,s.id limit 1) sp on true ";

    public Report analysis(LocalDate from, LocalDate to, String type, String groupBy, UUID doctorId, UUID specialtyId) {
        Query q = query(from, to, type, groupBy, doctorId, specialtyId, null);
        String sql = q.base + " select " + q.key + " as key," + q.label + " as label,count(*) as records,coalesce(sum(value),0)::numeric as value from sources s group by 1,2 order by 2";
        List<Group> rows = jdbc.query(sql, q.params, (rs,n) -> new Group(rs.getString("key"), rs.getString("label"), rs.getLong("records"), rs.getBigDecimal("value")));
        return new Report(metadata(from,to,q.type,q.group,doctorId,specialtyId),q.type,q.group,rows);
    }

    public Listing sources(LocalDate from, LocalDate to, String type, String groupBy, String groupValue,
                           UUID doctorId, UUID specialtyId, int page, int size) {
        if (page < 0 || page > 10000 || size < 1 || size > 100) throw new IllegalArgumentException("Pagina ou tamanho invalido.");
        if (groupValue == null || groupValue.isBlank()) throw new IllegalArgumentException("Informe o grupo.");
        Query q = query(from,to,type,groupBy,doctorId,specialtyId,groupValue);
        String where = " where " + q.key + "=:groupValue";
        Long total = jdbc.queryForObject(q.base + " select count(*) from sources s" + where,q.params,Long.class);
        q.params.addValue("limit",size).addValue("offset",(long)page*size);
        var rows = jdbc.query(q.base + " select * from sources s" + where + " order by occurred_at,source_id limit :limit offset :offset", q.params,
            (rs,n)->new Source(rs.getObject("source_id",UUID.class),rs.getObject("source_date",LocalDate.class),rs.getObject("occurred_at",OffsetDateTime.class),rs.getString("doctor_name"),rs.getString("status"),rs.getBigDecimal("value"),rs.getString("related_ids")));
        return new Listing(metadata(from,to,q.type,q.group,doctorId,specialtyId),q.type,q.group,page,size,total == null ? 0 : total,rows);
    }

    public Detail detail(LocalDate from, LocalDate to, String type, String groupBy, String groupValue,
                         UUID doctorId, UUID specialtyId, UUID id, LocalDate sourceDate) {
        Query q = query(from,to,type,groupBy,doctorId,specialtyId,groupValue);
        q.params.addValue("id",id).addValue("sourceDate",sourceDate);
        String dateFilter = sourceDate == null ? "" : " and s.source_date=:sourceDate";
        List<Source> result = jdbc.query(q.base + " select * from sources s where " + q.key + "=:groupValue and s.source_id=:id" + dateFilter,
            q.params,(rs,n)->new Source(rs.getObject("source_id",UUID.class),rs.getObject("source_date",LocalDate.class),rs.getObject("occurred_at",OffsetDateTime.class),rs.getString("doctor_name"),rs.getString("status"),rs.getBigDecimal("value"),rs.getString("related_ids")));
        if (result.size()!=1) throw new NotFoundException("Registro nao encontrado ou data da disponibilidade ausente.");
        return new Detail(metadata(from,to,q.type,q.group,doctorId,specialtyId),result.get(0));
    }

    private Query query(LocalDate from, LocalDate to, String type, String group, UUID doctorId, UUID specialtyId, String groupValue) {
        if (from == null || to == null || to.isBefore(from) || to.toEpochDay()-from.toEpochDay()>365) throw new IllegalArgumentException("Periodo invalido.");
        type=type.toUpperCase(Locale.ROOT); group=group.toUpperCase(Locale.ROOT);
        if (!Set.of("PENDING_EXAMS","OPEN_FOLLOWUPS","OCCUPIED","CAPACITY").contains(type)) throw new IllegalArgumentException("Indicador invalido.");
        if (!Set.of("DAY","MONTH","YEAR","DOCTOR","SPECIALTY").contains(group)) throw new IllegalArgumentException("Agrupamento invalido.");
        var params=new MapSqlParameterSource().addValue("start",from.atStartOfDay(ZONE).toOffsetDateTime()).addValue("end",to.plusDays(1).atStartOfDay(ZONE).toOffsetDateTime()).addValue("from",from).addValue("to",to).addValue("groupValue",groupValue);
        String scope="";
        if (doctorId!=null) { scope+=" and d.id=:doctorId"; params.addValue("doctorId",doctorId); }
        if (specialtyId!=null) { scope+=" and sp.id=:specialtyId"; params.addValue("specialtyId",specialtyId); }
        String base;
        if (type.equals("PENDING_EXAMS") || type.equals("OPEN_FOLLOWUPS")) {
            String table=type.equals("PENDING_EXAMS") ? "exam_order" : "follow_up";
            String condition=type.equals("PENDING_EXAMS") ? "x.status not in ('REVIEWED','CANCELLED')" : "x.status='OPEN'";
            base="with sources as (select x.id source_id,(x.created_at at time zone 'America/Sao_Paulo')::date source_date,x.created_at occurred_at,d.id doctor_id,d.full_name doctor_name,sp.id specialty_id,sp.name specialty_name,x.status,1::numeric value,null::text related_ids from " + table + " x left join encounter_locator el on el.id=x.encounter_id left join doctor d on d.id=el.doctor_id " + SPECIALTY + " where " + condition + " and x.created_at>=:start and x.created_at<:end" + scope + ")";
        } else if (type.equals("OCCUPIED")) {
            base="with sources as (select a.id source_id,(a.starts_at at time zone 'America/Sao_Paulo')::date source_date,a.starts_at occurred_at,d.id doctor_id,d.full_name doctor_name,sp.id specialty_id,sp.name specialty_name,a.status,(extract(epoch from (least(a.ends_at,:end)-greatest(a.starts_at,:start)))/60)::numeric value,null::text related_ids from appointment a join doctor d on d.id=a.doctor_id " + SPECIALTY + " where a.starts_at>=(:start::timestamptz-interval '8 hours') and a.starts_at<:end and a.ends_at>:start and a.status<>'CANCELLED'"+scope+")";
        } else {
            base="""
                with sources as (
                  select da.id source_id,day_value::date source_date,
                    (day_value::date + da.starts_at) at time zone 'America/Sao_Paulo' occurred_at,
                    d.id doctor_id,d.full_name doctor_name,sp.id specialty_id,sp.name specialty_name,
                    'ACTIVE'::text status,
                    greatest(0, extract(epoch from (da.ends_at-da.starts_at))/60-coalesce(blocked.minutes,0))::numeric value,
                    blocked.ids related_ids
                  from generate_series(:from::date,:to::date,interval '1 day') day_value
                  join doctor_availability da on da.active and da.weekday=extract(isodow from day_value)
                  join doctor d on d.id=da.doctor_id
                """ + SPECIALTY + """
                  left join lateral (
                    select sum(extract(epoch from (least((day_value::date+da.ends_at) at time zone 'America/Sao_Paulo',b.ends_at)-greatest((day_value::date+da.starts_at) at time zone 'America/Sao_Paulo',b.starts_at)))/60) minutes,
                           string_agg(b.id::text,',' order by b.id) ids
                    from schedule_block b where b.doctor_id=da.doctor_id and
                      tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange((day_value::date+da.starts_at) at time zone 'America/Sao_Paulo',(day_value::date+da.ends_at) at time zone 'America/Sao_Paulo','[)')
                  ) blocked on true where true
                """+scope+")";
        }
        String key=switch(group) { case "DAY"->"s.source_date::text"; case "MONTH"->"to_char(s.source_date,'YYYY-MM')"; case "YEAR"->"to_char(s.source_date,'YYYY')"; case "DOCTOR"->"coalesce(s.doctor_id::text,'NONE')"; default->"coalesce(s.specialty_id::text,'NONE')"; };
        String label=switch(group) { case "DOCTOR"->"coalesce(s.doctor_name,'Sem medico vinculado')"; case "SPECIALTY"->"coalesce(s.specialty_name,'Sem especialidade')"; default->key; };
        return new Query(type,group,base,key,label,params);
    }
    private Metadata metadata(LocalDate from, LocalDate to, String type, String group, UUID doctorId, UUID specialtyId) {
        UUID id=UUID.randomUUID(); var attrs=RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes sa && sa.getRequest().getAttribute(AuditUseCase.REQUEST_AUDIT_ID) instanceof UUID audit) id=audit;
        var auth=SecurityContextHolder.getContext().getAuthentication();
        return new Metadata(id,OffsetDateTime.now(ZoneOffset.UTC),auth==null?"sistema":auth.getName(),MDC.get("correlationId"),from,to,type,group,doctorId,specialtyId,"America/Sao_Paulo","2026-10-v2",
            type.equals("PENDING_EXAMS")||type.equals("OPEN_FOLLOWUPS")?"Criados no periodo informado; status atual na data da consulta":"Periodo informado; minutos estimados com disponibilidade atual e bloqueios");
    }
    private record Query(String type,String group,String base,String key,String label,MapSqlParameterSource params) {}
    public record Metadata(UUID reportRunId,OffsetDateTime generatedAt,String generatedBy,String correlationId,LocalDate from,LocalDate to,String type,String groupBy,UUID doctorId,UUID specialtyId,String timezone,String definitionVersion,String definition) {}
    public record Group(String key,String label,long records,java.math.BigDecimal value) {}
    public record Report(Metadata metadata,String type,String groupBy,List<Group> rows) {}
    public record Source(UUID sourceId,LocalDate sourceDate,OffsetDateTime occurredAt,String doctorName,String status,java.math.BigDecimal value,String relatedIds) {}
    public record Listing(Metadata metadata,String type,String groupBy,int page,int size,long totalRecords,List<Source> records) {}
    public record Detail(Metadata metadata, Source record) {}
}
