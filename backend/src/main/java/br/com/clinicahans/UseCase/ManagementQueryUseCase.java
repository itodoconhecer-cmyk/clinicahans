package br.com.clinicahans.UseCase;

import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import br.com.clinicahans.utilities.exception.NotFoundException;

@Service
public class ManagementQueryUseCase {
    private static final ZoneId CLINIC_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final String DEFINITION_VERSION = "2026-10-v2";
    private static final String SOURCE_APPOINTMENTS = "appointment, patient_first_completed_appointment, doctor, specialty";
    private static final String SOURCE_FINANCE = "receivable, payment_locator, payment";
    private static final String SPECIALTY_JOIN = " left join lateral (select s.id,s.name from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=d.id order by ds.primary_specialty desc,s.name,s.id limit 1) sp on true ";
    private static final String PAID_JOIN = " left join lateral (select sum(p.amount) as total_paid from payment_locator pl join payment p on p.id=pl.id and p.paid_at=pl.partition_timestamp where pl.receivable_id=r.id) paid on true ";

    private final JdbcTemplate jdbc;

    public ManagementQueryUseCase(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Dashboard dashboard(LocalDate from, LocalDate to) {
        OffsetDateTime start = startOf(from);
        OffsetDateTime end = startOf(to.plusDays(1));
        int appointments = scalar("select count(*) from appointment where starts_at>=? and starts_at<?", Integer.class, start, end);
        int noShows = scalar("select count(*) from appointment where status='NO_SHOW' and starts_at>=? and starts_at<?", Integer.class, start, end);
        int completed = scalar("select count(*) from appointment where status='COMPLETED' and starts_at>=? and starts_at<?", Integer.class, start, end);
        int cancelled = scalar("select count(*) from appointment where status='CANCELLED' and starts_at>=? and starts_at<?", Integer.class, start, end);
        int openFollowUps = jdbc.queryForObject("select count(*) from follow_up where status='OPEN'", Integer.class);
        int pendingExams = jdbc.queryForObject("select count(*) from exam_order where status not in ('REVIEWED','CANCELLED')", Integer.class);
        BigDecimal receivables = jdbc.queryForObject("""
          select coalesce(sum(amount),0) from receivable where created_at>=? and created_at<?
          """, BigDecimal.class, start, end);
        double noShowRate = rate(noShows, completed + noShows);
        return new Dashboard(appointments, noShows, cancelled, noShowRate, openFollowUps, pendingExams,
            receivables == null ? BigDecimal.ZERO : receivables);
    }

    public SummaryReport summary(LocalDate from, LocalDate to) {
        return summary(from,to,null,null);
    }

    public SummaryReport summary(LocalDate from, LocalDate to, UUID doctorId, UUID specialtyId) {
        validateRange(from, to);
        long dayCount = to.toEpochDay() - from.toEpochDay() + 1;
        LocalDate previousTo = from.minusDays(1);
        LocalDate previousFrom = previousTo.minusDays(dayCount - 1);
        SummaryValues current = summarize(from, to, doctorId, specialtyId);
        SummaryValues previous = summarize(previousFrom, previousTo, doctorId, specialtyId);
        List<Suggestion> suggestions = suggestions(current);
        Map<String,String> filters = scopedFilters(doctorId, specialtyId); filters.put("view", "SUMMARY");
        return new SummaryReport(metadata(from, to, filters, SOURCE_APPOINTMENTS + "; continuity counts; " + SOURCE_FINANCE),
            current, previous, suggestions);
    }

    public AnalysisReport analysis(LocalDate from, LocalDate to, String type, String groupBy) {
        return analysis(from,to,type,groupBy,null,null);
    }

    public AnalysisReport analysis(LocalDate from, LocalDate to, String type, String groupBy, UUID doctorId, UUID specialtyId) {
        return analysis(from,to,type,groupBy,doctorId,specialtyId,null);
    }

    public AnalysisReport analysis(LocalDate from, LocalDate to, String type, String groupBy, UUID doctorId, UUID specialtyId, String cohort) {
        validateRange(from, to);
        String normalizedType = normalize(type, "APPOINTMENTS", "FINANCE");
        String normalizedGroup = normalizeGroup(normalizedType, groupBy);
        String normalizedCohort = normalizeCohort(normalizedType, cohort);
        OffsetDateTime start = startOf(from);
        OffsetDateTime end = startOf(to.plusDays(1));
        List<AnalysisRow> rows = "APPOINTMENTS".equals(normalizedType)
            ? appointmentAnalysis(start, end, normalizedGroup,doctorId,specialtyId,normalizedCohort)
            : financeAnalysis(start, end, normalizedGroup,doctorId,specialtyId,normalizedCohort);
        Map<String,String> filters = scopedFilters(doctorId, specialtyId); filters.put("type", normalizedType); filters.put("groupBy", normalizedGroup); filters.put("cohort", normalizedCohort);
        return new AnalysisReport(metadata(from, to, filters,
            "APPOINTMENTS".equals(normalizedType) ? SOURCE_APPOINTMENTS : SOURCE_FINANCE), normalizedType, normalizedGroup, rows);
    }

    public SourcesReport sources(LocalDate from, LocalDate to, String type, int page, int size,
                                 String groupBy, String groupValue) {
        return sources(from,to,type,page,size,groupBy,groupValue,null,null);
    }

    public SourcesReport sources(LocalDate from, LocalDate to, String type, int page, int size,
                                 String groupBy, String groupValue, UUID doctorId, UUID specialtyId) {
        return sources(from,to,type,page,size,groupBy,groupValue,doctorId,specialtyId,null);
    }

    public SourcesReport sources(LocalDate from, LocalDate to, String type, int page, int size,
                                 String groupBy, String groupValue, UUID doctorId, UUID specialtyId, String cohort) {
        validateRange(from, to);
        if (page < 0 || page > 10_000) throw new IllegalArgumentException("page deve estar entre zero e 10000.");
        int boundedSize = Math.min(Math.max(size, 1), 100);
        String normalizedType = normalize(type, "APPOINTMENTS", "FINANCE");
        String normalizedCohort = normalizeCohort(normalizedType, cohort);
        String normalizedGroup = groupBy == null || groupBy.isBlank() ? null : normalizeGroup(normalizedType, groupBy);
        if (normalizedGroup != null && (groupValue == null || groupValue.isBlank()))
            throw new IllegalArgumentException("groupValue é obrigatório quando groupBy é informado.");
        OffsetDateTime start = startOf(from);
        OffsetDateTime end = startOf(to.plusDays(1));
        List<Object> params = new java.util.ArrayList<>(List.of(start, end));
        String filter = "";
        if (normalizedGroup != null) {
            String expression = sourceGroupExpression(normalizedType, normalizedGroup);
            filter = " and " + expression + "=?";
            params.add(groupValue);
        }
        filter += scopeClause("d.id", doctorId, specialtyId, params) + cohortClause(normalizedCohort);
        String baseSql = "APPOINTMENTS".equals(normalizedType)
            ? "from appointment a join doctor d on d.id=a.doctor_id" + SPECIALTY_JOIN + " where a.starts_at>=? and a.starts_at<?" + filter
            : "from receivable r join encounter_locator el on el.id=r.encounter_id join doctor d on d.id=el.doctor_id" + SPECIALTY_JOIN + PAID_JOIN + " where r.created_at>=? and r.created_at<?" + filter;
        long total = count("select count(*) " + baseSql, params.toArray());
        params.add(boundedSize);
        params.add((long) page * boundedSize);
        List<SourceRecord> records = "APPOINTMENTS".equals(normalizedType)
            ? jdbc.query("select a.id,a.starts_at,d.full_name,a.status,extract(epoch from (a.starts_at-a.created_at))/86400.0 as lead_time_days " + baseSql + " order by a.starts_at,a.id limit ? offset ?",
                (rs, row) -> new SourceRecord(rs.getObject("id", UUID.class), rs.getObject("starts_at", OffsetDateTime.class),
                    rs.getString("full_name"), rs.getString("status"), null, null, null, rs.getDouble("lead_time_days")), params.toArray())
            : financeSources(baseSql, params);
        String sourceName = "APPOINTMENTS".equals(normalizedType) ? SOURCE_APPOINTMENTS : SOURCE_FINANCE;
        Map<String, String> filters = scopedFilters(doctorId, specialtyId);
        filters.put("type", normalizedType);
        filters.put("cohort", normalizedCohort);
        filters.put("page", String.valueOf(page));
        filters.put("size", String.valueOf(boundedSize));
        if (normalizedGroup != null) { filters.put("groupBy", normalizedGroup); filters.put("groupValue", groupValue); }
        return new SourcesReport(metadata(from, to, filters, sourceName), normalizedType, page, boundedSize, total, records);
    }

    private SummaryValues summarize(LocalDate from, LocalDate to, UUID doctorId, UUID specialtyId) {
        OffsetDateTime start = startOf(from);
        OffsetDateTime end = startOf(to.plusDays(1));
        List<Object> appointmentParams = new ArrayList<>(List.of(start, end));
        String appointmentScope = scopeClause("a.doctor_id", doctorId, specialtyId, appointmentParams);
        AppointmentTotals appointments = jdbc.queryForObject("""
            select count(*) as total,
              count(*) filter (where status='COMPLETED') as completed,
              count(*) filter (where status='NO_SHOW') as no_shows,
              count(*) filter (where status='CANCELLED') as cancelled
            from appointment a where starts_at>=? and starts_at<?
            """ + appointmentScope, (rs, row) -> new AppointmentTotals(rs.getInt("total"), rs.getInt("completed"),
                rs.getInt("no_shows"), rs.getInt("cancelled")), appointmentParams.toArray());

        int openFollowUps = continuityCount("follow_up", "x.status='OPEN'", start, end, doctorId, specialtyId);
        int pendingExams = continuityCount("exam_order", "x.status not in ('REVIEWED','CANCELLED')", start, end, doctorId, specialtyId);
        List<Object> newParams = new ArrayList<>(List.of(start,end));
        String newScope = scopeClause("al.doctor_id", doctorId, specialtyId, newParams);
        int newPatients = scalar("select count(*) from patient_first_completed_appointment f join appointment_locator al on al.id=f.appointment_id where f.first_completed_at>=? and f.first_completed_at<?" + newScope, Integer.class, newParams.toArray());
        Double averageWaitDays = jdbc.queryForObject("""
            select avg(extract(epoch from (starts_at-created_at))/86400.0)
            from appointment a where starts_at>=? and starts_at<? and status<>'CANCELLED'
            """ + appointmentScope, Double.class, appointmentParams.toArray());
        List<Object> financeParams = new ArrayList<>(List.of(start,end));
        String financeScope = scopeClause("el.doctor_id", doctorId, specialtyId, financeParams);
        BigDecimal[] finance = jdbc.queryForObject("""
            select coalesce(sum(r.amount),0) as receivables,
              coalesce(sum(coalesce(paid.total_paid,0)),0) as paid,
              coalesce(sum(greatest(r.amount-coalesce(paid.total_paid,0),0)),0) as pending
            from receivable r
            join encounter_locator el on el.id=r.encounter_id
            left join lateral (select sum(p.amount) as total_paid from payment_locator pl join payment p on p.id=pl.id and p.paid_at=pl.partition_timestamp where pl.receivable_id=r.id) paid on true
            where r.created_at>=? and r.created_at<?
            """ + financeScope, (rs, row) -> new BigDecimal[]{rs.getBigDecimal("receivables"), rs.getBigDecimal("paid"),
                rs.getBigDecimal("pending")}, financeParams.toArray());
        long[] capacity = occupancyMinutes(start, end, doctorId, specialtyId);
        double noShowRate = rate(appointments.noShows(), appointments.completed() + appointments.noShows());
        double cancellationRate = rate(appointments.cancelled(), appointments.completed() + appointments.noShows() + appointments.cancelled());
        double occupancyRate = rate(capacity[0], capacity[1]);
        return new SummaryValues(appointments.total(), appointments.completed(), appointments.noShows(),
            appointments.cancelled(), noShowRate, cancellationRate, capacity[0], capacity[1], occupancyRate, newPatients,
            averageWaitDays == null ? 0.0 : averageWaitDays,
            openFollowUps, pendingExams, zeroIfNull(finance[0]), zeroIfNull(finance[1]), zeroIfNull(finance[2]));
    }

    private long[] occupancyMinutes(OffsetDateTime start, OffsetDateTime end, UUID doctorId, UUID specialtyId) {
        List<Object> availableParams = new ArrayList<>(List.of(start.toLocalDate(), end.toLocalDate()));
        String availableScope = scopeClause("da.doctor_id",doctorId,specialtyId,availableParams);
        Long available = jdbc.queryForObject("""
            with clinic_days as (
              select days.day_value::date as clinic_day
              from generate_series(?::date, (?::date - interval '1 day'), interval '1 day') as days(day_value)
            ), availability_windows as (
              select da.doctor_id,
                tstzrange((d.clinic_day + da.starts_at) at time zone 'America/Sao_Paulo',
                          (d.clinic_day + da.ends_at) at time zone 'America/Sao_Paulo', '[)') as window
              from clinic_days d join doctor_availability da
                on da.active and da.weekday=extract(isodow from d.clinic_day) %s
            )
            select coalesce(sum(greatest(0,
              extract(epoch from (upper(w.window)-lower(w.window)))/60 - coalesce((
                select sum(extract(epoch from (least(upper(w.window),b.ends_at)-greatest(lower(w.window),b.starts_at)))/60)
                from schedule_block b where b.doctor_id=w.doctor_id
                  and tstzrange(b.starts_at,b.ends_at,'[)') && w.window
              ),0)
            )),0)::bigint from availability_windows w
            """.formatted(availableScope), Long.class, availableParams.toArray());
        List<Object> occupiedParams = new ArrayList<>(List.of(end,start,start.minusHours(8),end,start));
        String occupiedScope = scopeClause("a.doctor_id",doctorId,specialtyId,occupiedParams);
        Long occupied = jdbc.queryForObject("""
            select coalesce(sum(extract(epoch from (least(a.ends_at,?)-greatest(a.starts_at,?)))/60),0)::bigint
            from appointment a
            where a.starts_at>=? and a.starts_at<? and a.ends_at>? and a.status<>'CANCELLED'
            """ + occupiedScope, Long.class, occupiedParams.toArray());
        return new long[]{occupied == null ? 0L : occupied, available == null ? 0L : available};
    }

    private List<AnalysisRow> appointmentAnalysis(OffsetDateTime start, OffsetDateTime end, String groupBy, UUID doctorId, UUID specialtyId, String cohort) {
        String key;
        String label;
        String join;
        switch (groupBy) {
            case "DAY" -> { key = "date_trunc('day',a.starts_at at time zone 'America/Sao_Paulo')::date::text"; label = key; join = ""; }
            case "WEEK" -> { key = "date_trunc('week',a.starts_at at time zone 'America/Sao_Paulo')::date::text"; label = key; join = ""; }
            case "MONTH" -> { key = "to_char(a.starts_at at time zone 'America/Sao_Paulo','YYYY-MM')"; label = key; join = ""; }
            case "YEAR" -> { key = "to_char(a.starts_at at time zone 'America/Sao_Paulo','YYYY')"; label = key; join = ""; }
            case "DOCTOR" -> { key = "d.id::text"; label = "d.full_name"; join = "join doctor d on d.id=a.doctor_id"; }
            case "SPECIALTY" -> { key = "coalesce(sp.id::text,'NONE')"; label = "coalesce(sp.name,'Sem especialidade')"; join = "join doctor d on d.id=a.doctor_id left join lateral (select s.id,s.name from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=d.id order by ds.primary_specialty desc,s.name limit 1) sp on true"; }
            case "STATUS" -> { key = "a.status"; label = "a.status"; join = ""; }
            default -> throw new IllegalArgumentException("Agrupamento de consultas não permitido.");
        }
        join = "join doctor d on d.id=a.doctor_id" + SPECIALTY_JOIN;
        List<Object> params = new ArrayList<>(List.of(start,end));
        String scope = scopeClause("d.id",doctorId,specialtyId,params) + cohortClause(cohort);
        String sql = """
            select %s as row_key,%s as row_label,count(*) as total,
              count(*) filter (where a.status='COMPLETED') as completed,
              count(*) filter (where a.status='NO_SHOW') as no_shows,
              count(*) filter (where a.status='CANCELLED') as cancelled,
              coalesce(avg(extract(epoch from (a.starts_at-a.created_at))/86400.0) filter (where a.status<>'CANCELLED'),0) as average_lead_time_days
            from appointment a %s where a.starts_at>=? and a.starts_at<? %s
            group by row_key,row_label order by row_label
            """.formatted(key, label, join, scope);
        return jdbc.query(sql, (rs, row) -> appointmentAnalysisRow(rs), params.toArray());
    }

    private List<AnalysisRow> financeAnalysis(OffsetDateTime start, OffsetDateTime end, String groupBy, UUID doctorId, UUID specialtyId, String cohort) {
        String key;
        String label;
        switch (groupBy) {
            case "DAY" -> { key = "date_trunc('day',r.created_at at time zone 'America/Sao_Paulo')::date::text"; label = key; }
            case "WEEK" -> { key = "date_trunc('week',r.created_at at time zone 'America/Sao_Paulo')::date::text"; label = key; }
            case "MONTH" -> { key = "to_char(r.created_at at time zone 'America/Sao_Paulo','YYYY-MM')"; label = key; }
            case "YEAR" -> { key = "to_char(r.created_at at time zone 'America/Sao_Paulo','YYYY')"; label = key; }
            case "DOCTOR" -> { key = "d.id::text"; label = "d.full_name"; }
            case "SPECIALTY" -> { key = "coalesce(sp.id::text,'NONE')"; label = "coalesce(sp.name,'Sem especialidade')"; }
            case "PAYER_TYPE" -> { key = "r.payer_type"; label = "r.payer_type"; }
            case "STATUS" -> { key = "r.status"; label = "r.status"; }
            default -> throw new IllegalArgumentException("Agrupamento financeiro não permitido.");
        }
        List<Object> params = new ArrayList<>(List.of(start,end));
        String scope = scopeClause("d.id",doctorId,specialtyId,params) + cohortClause(cohort);
        String sql = """
            select %s as row_key,%s as row_label,count(*) as total,
              coalesce(sum(r.amount),0) as gross,
              coalesce(sum(coalesce(paid.total_paid,0)),0) as paid,
              coalesce(sum(greatest(r.amount-coalesce(paid.total_paid,0),0)),0) as balance
            from receivable r
            join encounter_locator el on el.id=r.encounter_id join doctor d on d.id=el.doctor_id
            %s
            left join lateral (select sum(p.amount) as total_paid from payment_locator pl join payment p on p.id=pl.id and p.paid_at=pl.partition_timestamp where pl.receivable_id=r.id) paid on true
            where r.created_at>=? and r.created_at<? %s
            group by row_key,row_label order by row_label
            """.formatted(key, label, SPECIALTY_JOIN, scope);
        return jdbc.query(sql, (rs, row) -> new AnalysisRow(rs.getString("row_key"), rs.getString("row_label"),
            rs.getLong("total"), 0, 0, 0, 0.0, rs.getBigDecimal("gross"), rs.getBigDecimal("paid"),
            rs.getBigDecimal("balance"), null), params.toArray());
    }

    private List<SourceRecord> financeSources(String baseSql, List<Object> params) {
        return jdbc.query("""
            select r.id,r.created_at,r.payer_type,r.status,r.amount,coalesce(paid.total_paid,0) as paid
            %s
            order by r.created_at,r.id limit ? offset ?
            """.formatted(baseSql), (rs, row) -> {
                BigDecimal amount = rs.getBigDecimal("amount");
                BigDecimal paid = zeroIfNull(rs.getBigDecimal("paid"));
                return new SourceRecord(rs.getObject("id", UUID.class), rs.getObject("created_at", OffsetDateTime.class),
                    rs.getString("payer_type"), rs.getString("status"), amount, paid, amount.subtract(paid).max(BigDecimal.ZERO), null);
            }, params.toArray());
    }

    public RecordDetail record(String type, UUID id) {
        String normalized = normalize(type, "APPOINTMENTS", "FINANCE");
        List<PaymentDetail> payments = "FINANCE".equals(normalized) ? jdbc.query("""
            select p.id,p.paid_at,p.amount,p.method from payment_locator l
            join payment p on p.id=l.id and p.paid_at=l.partition_timestamp
            where l.receivable_id=? order by p.paid_at,p.id
            """, (rs, row) -> new PaymentDetail(rs.getObject("id", UUID.class),
                rs.getObject("paid_at", OffsetDateTime.class), rs.getBigDecimal("amount"), rs.getString("method")), id) : List.of();
        String sql = "APPOINTMENTS".equals(normalized)
            ? "select a.id,a.starts_at as occurred_at,a.created_at,a.ends_at,d.id as doctor_id,d.full_name as doctor_name,sp.name as specialty,a.modality,a.status,null::numeric as amount,null::numeric as paid from appointment_locator al join appointment a on a.id=al.id and a.starts_at=al.partition_timestamp join doctor d on d.id=a.doctor_id" + SPECIALTY_JOIN + "where al.id=?"
            : "select r.id,r.created_at as occurred_at,r.created_at,null::timestamptz as ends_at,d.id as doctor_id,d.full_name as doctor_name,sp.name as specialty,r.payer_type as modality,r.status,r.amount,coalesce(paid.total_paid,0) as paid from receivable_locator rl join receivable r on r.id=rl.id and r.created_at=rl.partition_timestamp join encounter_locator el on el.id=r.encounter_id join doctor d on d.id=el.doctor_id" + SPECIALTY_JOIN + PAID_JOIN + "where rl.id=?";
        List<RecordDetail> found = jdbc.query(sql, (rs, row) -> {
            BigDecimal amount = rs.getBigDecimal("amount"), paid = rs.getBigDecimal("paid");
            OffsetDateTime occurred = rs.getObject("occurred_at", OffsetDateTime.class);
            LocalDate date = occurred.atZoneSameInstant(CLINIC_ZONE).toLocalDate();
            return new RecordDetail(metadata(date,date,Map.of("type", normalized, "sourceId", id.toString()),
                    "APPOINTMENTS".equals(normalized) ? SOURCE_APPOINTMENTS : SOURCE_FINANCE), rs.getObject("id", UUID.class), normalized,
                occurred, rs.getObject("created_at", OffsetDateTime.class), rs.getObject("ends_at", OffsetDateTime.class),
                rs.getObject("doctor_id", UUID.class), rs.getString("doctor_name"), rs.getString("specialty"),
                rs.getString("modality"), rs.getString("status"), amount, paid,
                amount == null ? null : amount.subtract(zeroIfNull(paid)).max(BigDecimal.ZERO), payments);
        }, id);
        if (found.isEmpty()) throw new NotFoundException("Registro de relatório não encontrado.");
        return found.get(0);
    }

    private int continuityCount(String table, String statusCondition, OffsetDateTime start, OffsetDateTime end, UUID doctorId, UUID specialtyId) {
        List<Object> params = new ArrayList<>(List.of(start,end));
        String scope = scopeClause("el.doctor_id", doctorId, specialtyId, params);
        String join = doctorId == null && specialtyId == null ? "" : " join encounter_locator el on el.id=x.encounter_id ";
        return scalar("select count(*) from " + table + " x " + join + " where x.created_at>=? and x.created_at<? and " + statusCondition + scope, Integer.class, params.toArray());
    }

    private static String scopeClause(String doctorColumn, UUID doctorId, UUID specialtyId, List<Object> params) {
        StringBuilder sql = new StringBuilder();
        if (doctorId != null) { sql.append(" and ").append(doctorColumn).append("=? "); params.add(doctorId); }
        if (specialtyId != null) {
            sql.append(" and (select ds.specialty_id from doctor_specialty ds join specialty s on s.id=ds.specialty_id where ds.doctor_id=")
                .append(doctorColumn).append(" order by ds.primary_specialty desc,s.name,s.id limit 1)=? ");
            params.add(specialtyId);
        }
        return sql.toString();
    }

    private static Map<String,String> scopedFilters(UUID doctorId, UUID specialtyId) {
        Map<String,String> filters = new LinkedHashMap<>();
        if (doctorId != null) filters.put("doctorId", doctorId.toString());
        if (specialtyId != null) filters.put("specialtyId", specialtyId.toString());
        return filters;
    }

    private static String normalizeCohort(String type, String cohort) {
        String candidate = cohort == null || cohort.isBlank() ? ("APPOINTMENTS".equals(type) ? "APPOINTMENTS" : "RECEIVABLES") : cohort;
        return "APPOINTMENTS".equals(type)
            ? normalize(candidate,"APPOINTMENTS","NO_SHOWS","CANCELLED","COMPLETED","CLOSED","ENDED","FIRST_VISIT","LEAD_TIME")
            : normalize(candidate,"RECEIVABLES","RECEIVED","PENDING");
    }

    private static String cohortClause(String cohort) {
        return switch (cohort) {
            case "NO_SHOWS" -> " and a.status='NO_SHOW' ";
            case "CANCELLED" -> " and a.status='CANCELLED' ";
            case "COMPLETED" -> " and a.status='COMPLETED' ";
            case "CLOSED" -> " and a.status in ('COMPLETED','NO_SHOW') ";
            case "ENDED" -> " and a.status in ('COMPLETED','NO_SHOW','CANCELLED') ";
            case "FIRST_VISIT" -> " and exists (select 1 from patient_first_completed_appointment f where f.appointment_id=a.id) ";
            case "LEAD_TIME" -> " and a.status<>'CANCELLED' ";
            case "RECEIVED" -> " and coalesce(paid.total_paid,0)>0 ";
            case "PENDING" -> " and r.amount>coalesce(paid.total_paid,0) ";
            default -> "";
        };
    }

    private static String sourceGroupExpression(String type, String groupBy) {
        if ("APPOINTMENTS".equals(type)) return switch (groupBy) {
            case "DAY" -> "date_trunc('day',a.starts_at at time zone 'America/Sao_Paulo')::date::text";
            case "WEEK" -> "date_trunc('week',a.starts_at at time zone 'America/Sao_Paulo')::date::text";
            case "MONTH" -> "to_char(a.starts_at at time zone 'America/Sao_Paulo','YYYY-MM')";
            case "YEAR" -> "to_char(a.starts_at at time zone 'America/Sao_Paulo','YYYY')";
            case "DOCTOR" -> "d.id::text";
            case "SPECIALTY" -> "coalesce(sp.id::text,'NONE')";
            case "STATUS" -> "a.status";
            default -> throw new IllegalArgumentException("Agrupamento de consultas não permitido.");
        };
        return switch (groupBy) {
            case "DAY" -> "date_trunc('day',r.created_at at time zone 'America/Sao_Paulo')::date::text";
            case "WEEK" -> "date_trunc('week',r.created_at at time zone 'America/Sao_Paulo')::date::text";
            case "MONTH" -> "to_char(r.created_at at time zone 'America/Sao_Paulo','YYYY-MM')";
            case "YEAR" -> "to_char(r.created_at at time zone 'America/Sao_Paulo','YYYY')";
            case "DOCTOR" -> "d.id::text";
            case "SPECIALTY" -> "coalesce(sp.id::text,'NONE')";
            case "PAYER_TYPE" -> "r.payer_type";
            case "STATUS" -> "r.status";
            default -> throw new IllegalArgumentException("Agrupamento financeiro não permitido.");
        };
    }

    private List<Suggestion> suggestions(SummaryValues values) {
        java.util.ArrayList<Suggestion> result = new java.util.ArrayList<>();
        if (values.completed() + values.noShows() >= 20 && values.noShowRate() > 7.0) {
            result.add(new Suggestion("SUG-NOSHOW-01", "Revisar a confirmação de consultas",
                "A taxa de ausência ultrapassou 7% com base mínima de 20 consultas encerradas.",
                String.format(java.util.Locale.ROOT, "%.1f%% (%d faltas em %d consultas encerradas)", values.noShowRate(),
                    values.noShows(), values.completed() + values.noShows()), "Avaliar horários e processo de lembrete.", "SUG-NOSHOW-01 v1"));
        }
        long appointmentClosures = values.completed() + values.noShows() + values.cancelled();
        if (appointmentClosures >= 20 && values.cancellationRate() > 10.0) {
            result.add(new Suggestion("SUG-CANCEL-01", "Revisar o fluxo de cancelamentos",
                "A taxa de cancelamento ultrapassou 10% com base mínima de 20 encerramentos.",
                String.format(java.util.Locale.ROOT, "%.1f%% (%d cancelamentos em %d encerramentos)", values.cancellationRate(),
                    values.cancelled(), appointmentClosures), "Revisar antecedência de cancelamento e uso da fila de espera.", "SUG-CANCEL-01 v1"));
        }
        return List.copyOf(result);
    }

    private ReportMetadata metadata(LocalDate from, LocalDate to, Map<String, String> filters, String source) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String actor = authentication != null && authentication.isAuthenticated() ? authentication.getName() : "sistema";
        UUID requestId = null;
        var requestAttributes = RequestContextHolder.getRequestAttributes();
        if (requestAttributes instanceof ServletRequestAttributes servletAttributes) {
            Object auditId = servletAttributes.getRequest().getAttribute(br.com.clinicahans.UseCase.AuditUseCase.REQUEST_AUDIT_ID);
            if (auditId instanceof UUID id) requestId = id;
        }
        if (requestId == null) requestId = UUID.randomUUID();
        return new ReportMetadata(requestId, OffsetDateTime.now(ZoneOffset.UTC), actor, MDC.get("correlationId"),
            from, to, CLINIC_ZONE.getId(), DEFINITION_VERSION, filters, source);
    }

    private static AnalysisRow appointmentAnalysisRow(ResultSet rs) throws SQLException {
        long completed = rs.getLong("completed");
        long noShows = rs.getLong("no_shows");
        long cancelled = rs.getLong("cancelled");
        return new AnalysisRow(rs.getString("row_key"), rs.getString("row_label"), rs.getLong("total"),
            completed, noShows, cancelled, rate(noShows, completed + noShows), BigDecimal.ZERO,
            BigDecimal.ZERO, BigDecimal.ZERO, rs.getDouble("average_lead_time_days"));
    }

    private static String normalize(String value, String... allowed) {
        String candidate = value == null ? "" : value.trim().toUpperCase(java.util.Locale.ROOT);
        for (String option : allowed) if (option.equals(candidate)) return candidate;
        throw new IllegalArgumentException("Tipo de relatório não permitido.");
    }

    private static String normalizeGroup(String type, String groupBy) {
        String candidate = groupBy == null ? "MONTH" : groupBy.trim().toUpperCase(java.util.Locale.ROOT);
        String[] allowed = "APPOINTMENTS".equals(type)
            ? new String[]{"DAY", "WEEK", "MONTH", "YEAR", "DOCTOR", "SPECIALTY", "STATUS"}
            : new String[]{"DAY", "WEEK", "MONTH", "YEAR", "DOCTOR", "SPECIALTY", "PAYER_TYPE", "STATUS"};
        return normalize(candidate, allowed);
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) throw new IllegalArgumentException("Informe um período válido.");
        if (to.toEpochDay() - from.toEpochDay() > 365) throw new IllegalArgumentException("O período máximo do relatório é de 366 dias.");
    }

    private static OffsetDateTime startOf(LocalDate date) {
        return date.atStartOfDay(CLINIC_ZONE).toOffsetDateTime();
    }

    private long count(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private <T> T scalar(String sql, Class<T> type, Object... args) {
        return jdbc.queryForObject(sql, type, args);
    }

    private static BigDecimal zeroIfNull(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    private static double rate(long numerator, long denominator) { return denominator == 0 ? 0.0 : numerator * 100.0 / denominator; }

    public record Dashboard(int appointments, int noShows, int cancelled, double noShowRate, int openFollowUps,
                            int pendingExams, BigDecimal grossReceivables) { }
    public record SummaryReport(ReportMetadata metadata, SummaryValues current, SummaryValues previous,
                                List<Suggestion> suggestions) { }
    public record SummaryValues(int appointments, int completed, int noShows, int cancelled, double noShowRate,
                                double cancellationRate,
                                long occupiedMinutes, long capacityMinutes, double occupancyRate, int newPatients,
                                double averageLeadTimeDays, int openFollowUps, int pendingExams,
                                BigDecimal receivables, BigDecimal received, BigDecimal pending) { }
    public record ReportMetadata(UUID reportRunId, OffsetDateTime generatedAt, String generatedBy,
                                 String correlationId, LocalDate from, LocalDate to, String timezone,
                                 String definitionVersion, Map<String, String> filters, String source) { }
    public record Suggestion(String ruleId, String title, String explanation, String evidence,
                             String proposedAction, String ruleVersion) { }
    public record AnalysisReport(ReportMetadata metadata, String type, String groupBy, List<AnalysisRow> rows) { }
    public record AnalysisRow(String key, String label, long records, long completed, long noShows,
                              long cancelled, double noShowRate, BigDecimal gross, BigDecimal received,
                              BigDecimal pending, Double averageLeadTimeDays) { }
    public record SourcesReport(ReportMetadata metadata, String type, int page, int size, long totalRecords,
                                List<SourceRecord> records) { }
    public record SourceRecord(UUID sourceId, OffsetDateTime occurredAt, String classification, String status,
                               BigDecimal amount, BigDecimal received, BigDecimal balance, Double leadTimeDays) { }
    public record RecordDetail(ReportMetadata metadata, UUID sourceId, String type, OffsetDateTime occurredAt, OffsetDateTime createdAt, OffsetDateTime endsAt,
                               UUID doctorId, String doctorName, String specialty, String modality, String status,
                               BigDecimal amount, BigDecimal received, BigDecimal balance, List<PaymentDetail> payments) { }
    public record PaymentDetail(UUID sourceId, OffsetDateTime paidAt, BigDecimal amount, String method) { }
    private record AppointmentTotals(int total, int completed, int noShows, int cancelled) { }
}
