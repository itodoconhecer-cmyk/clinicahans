package br.com.clinicahans.repository;

import br.com.clinicahans.DTO.AppointmentSlotResponse;
import br.com.clinicahans.DTO.AppointmentCalendarEventResponse;
import br.com.clinicahans.utilities.security.PatientNameMasker;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

@Repository
public class SmartAppointmentSearchRepository {
    private final JdbcTemplate jdbc;

    public SmartAppointmentSearchRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean doctorExists(String term) {
        Integer count = jdbc.queryForObject("""
            select count(*) from doctor where
              translate(lower(full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%'
            """, Integer.class, term);
        return count != null && count > 0;
    }

    /**
     * Returns active bookings across the matching days, without restricting the
     * requested period or exact time. They provide context around open slots.
     */
    public List<AppointmentCalendarEventResponse> searchAppointments(LocalDate from, LocalDate to, String zone,
            String doctorTerm, String specialtyTerm, String generalTerm) {
        return jdbc.query("""
            select a.id appointment_id,d.id doctor_id,d.full_name doctor_name,s.id specialty_id,s.name specialty_name,
              p.full_name patient_name,a.starts_at,a.ends_at,a.status
            from appointment a
            join doctor d on d.id=a.doctor_id
            join patient p on p.id=a.patient_id
            left join lateral (
              select sp.id,sp.name
              from doctor_specialty ds join specialty sp on sp.id=ds.specialty_id
              where ds.doctor_id=d.id
              order by (case when ?::text is not null and
                translate(lower(sp.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%' then 1 else 0 end) desc,
                ds.primary_specialty desc,sp.name
              limit 1
            ) s on true
            where a.starts_at >= (?::date::timestamp at time zone ?)
              and a.starts_at < ((?::date + 1)::timestamp at time zone ?)
              and a.starts_at > now()
              and a.status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED')
              and (?::text is null or translate(lower(d.full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%')
              and (?::text is null or exists (
                select 1 from doctor_specialty ds join specialty sp on sp.id=ds.specialty_id
                where ds.doctor_id=d.id and translate(lower(sp.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%'))
              and (?::text is null or
                translate(lower(d.full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%' or
                exists (select 1 from doctor_specialty ds join specialty sp on sp.id=ds.specialty_id
                  where ds.doctor_id=d.id and translate(lower(sp.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%'))
            order by a.starts_at,d.full_name limit 500
            """, (rs, row) -> new AppointmentCalendarEventResponse(
                rs.getObject("appointment_id", java.util.UUID.class),
                rs.getObject("doctor_id", java.util.UUID.class),rs.getString("doctor_name"),
                rs.getObject("specialty_id", java.util.UUID.class),rs.getString("specialty_name"),
                PatientNameMasker.mask(rs.getString("patient_name")),
                rs.getObject("starts_at", OffsetDateTime.class),rs.getObject("ends_at", OffsetDateTime.class),rs.getString("status")),
            specialtyTerm,specialtyTerm,from,zone,to,zone,doctorTerm,doctorTerm,
            specialtyTerm,specialtyTerm,generalTerm,generalTerm,generalTerm);
    }

    public List<AppointmentSlotResponse> search(LocalDate from, LocalDate to, String zone,
            String doctorTerm, String specialtyTerm, String generalTerm,
            Integer weekday, LocalTime fromTime, LocalTime toTime, LocalTime exactTime) {
        return jdbc.query("""
            with days as (
              select day::date as day from generate_series(?::date, ?::date, interval '1 day') day
            ), candidates as (
              select d.id doctor_id,d.full_name doctor_name,s.id specialty_id,s.name specialty_name,
                (slot_start at time zone ?) starts_at,
                ((slot_start + make_interval(mins => av.slot_minutes)) at time zone ?) ends_at
              from doctor d join doctor_availability av on av.doctor_id=d.id and av.active
              join days on extract(isodow from days.day)::int=av.weekday
              cross join lateral generate_series(days.day+av.starts_at,
                days.day+av.ends_at-make_interval(mins => av.slot_minutes),
                make_interval(mins => av.slot_minutes)) as slots(slot_start)
              left join lateral (
                select sp.id,sp.name from doctor_specialty ds join specialty sp on sp.id=ds.specialty_id
                where ds.doctor_id=d.id
                  and (?::text is null or translate(lower(sp.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%')
                order by ds.primary_specialty desc,sp.name limit 1
              ) s on true
              where d.status='ACTIVE'
                and (?::text is null or translate(lower(d.full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%')
                and (?::text is null or exists (select 1 from doctor_specialty ds3 join specialty sp3 on sp3.id=ds3.specialty_id
                  where ds3.doctor_id=d.id and translate(lower(sp3.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%'))
                and (?::text is null or (
                  translate(lower(d.full_name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%'
                  or exists (select 1 from doctor_specialty ds2 join specialty sp2 on sp2.id=ds2.specialty_id
                    where ds2.doctor_id=d.id and translate(lower(sp2.name),chr(225)||chr(224)||chr(226)||chr(227)||chr(228)||chr(233)||chr(232)||chr(234)||chr(235)||chr(237)||chr(236)||chr(238)||chr(239)||chr(243)||chr(242)||chr(244)||chr(245)||chr(246)||chr(250)||chr(249)||chr(251)||chr(252)||chr(231),'aaaaaeeeeiiiiooooouuuuc') like '%'||?||'%')
                ))
                and (?::int is null or av.weekday=?)
                and (?::time is null or slot_start::time>=?::time and slot_start::time<?::time)
                and (?::time is null or slot_start::time=?::time)
                and not exists (select 1 from schedule_block b where b.doctor_id=d.id
                  and b.starts_at < ((slot_start + make_interval(mins => av.slot_minutes)) at time zone ?)
                  and b.ends_at > (slot_start at time zone ?))
            )
            select distinct c.doctor_id,c.doctor_name,c.specialty_id,c.specialty_name,c.starts_at,c.ends_at,
              coalesce((select a.status from appointment a where a.doctor_id=c.doctor_id
                and a.status in ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_CARE','COMPLETED')
                and a.starts_at<c.ends_at and a.ends_at>c.starts_at order by a.starts_at limit 1),'AVAILABLE') status
            from candidates c where c.starts_at>now() order by c.starts_at,c.doctor_name limit 500
            """, (rs, row) -> new AppointmentSlotResponse(
                rs.getObject("doctor_id", java.util.UUID.class),rs.getString("doctor_name"),
                rs.getObject("specialty_id", java.util.UUID.class),rs.getString("specialty_name"),
                rs.getObject("starts_at", OffsetDateTime.class),rs.getObject("ends_at", OffsetDateTime.class),rs.getString("status")),
            from,to,zone,zone,specialtyTerm,specialtyTerm,doctorTerm,doctorTerm,specialtyTerm,specialtyTerm,
            generalTerm,generalTerm,generalTerm,weekday,weekday,fromTime,fromTime,toTime,
            exactTime,exactTime,zone,zone);
    }
}
