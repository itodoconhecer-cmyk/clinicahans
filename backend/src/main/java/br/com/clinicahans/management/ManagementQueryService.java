package br.com.clinicahans.management;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class ManagementQueryService {
    private final JdbcTemplate jdbc;
    public ManagementQueryService(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public Dashboard dashboard(LocalDate from,LocalDate to){
        int appointments=value("select count(*) from appointment where starts_at>=?::date and starts_at<(?::date+interval '1 day')",from,to);
        int noShows=value("select count(*) from appointment where status='NO_SHOW' and starts_at>=?::date and starts_at<(?::date+interval '1 day')",from,to);
        int cancelled=value("select count(*) from appointment where status='CANCELLED' and starts_at>=?::date and starts_at<(?::date+interval '1 day')",from,to);
        int openFollowUps=jdbc.queryForObject("select count(*) from follow_up where status='OPEN'",Integer.class);
        int pendingExams=jdbc.queryForObject("select count(*) from exam_order where status not in ('REVIEWED','CANCELLED')",Integer.class);
        BigDecimal receivables=jdbc.queryForObject("""
          select coalesce(sum(amount),0) from receivable where created_at>=?::date and created_at<(?::date+interval '1 day')
          """,BigDecimal.class,from,to);
        double noShowRate=appointments==0?0.0:(noShows*100.0/appointments);
        return new Dashboard(appointments,noShows,cancelled,noShowRate,openFollowUps,pendingExams,receivables==null?BigDecimal.ZERO:receivables);
    }

    private int value(String sql,LocalDate from,LocalDate to){Integer v=jdbc.queryForObject(sql,Integer.class,from,to);return v==null?0:v;}
    public record Dashboard(int appointments,int noShows,int cancelled,double noShowRate,int openFollowUps,int pendingExams,BigDecimal grossReceivables){}
}
