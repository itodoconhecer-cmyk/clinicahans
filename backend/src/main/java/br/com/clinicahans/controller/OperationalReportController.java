package br.com.clinicahans.controller;

import br.com.clinicahans.UseCase.AuditUseCase;
import br.com.clinicahans.UseCase.OperationalReportUseCase;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/management/operational-reports")
@PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
public class OperationalReportController {
    private final OperationalReportUseCase reports;
    private final AuditUseCase audit;
    public OperationalReportController(OperationalReportUseCase reports, AuditUseCase audit) { this.reports=reports; this.audit=audit; }

    @GetMapping("/analysis")
    public OperationalReportUseCase.Report analysis(@RequestParam LocalDate from,@RequestParam LocalDate to,
        @RequestParam String type,@RequestParam(defaultValue="MONTH") String groupBy,
        @RequestParam(required=false) UUID doctorId,@RequestParam(required=false) UUID specialtyId,
        @RequestParam(required=false) UUID parentRunId) {
        var analysis = reports.analysis(from,to,type,groupBy,doctorId,specialtyId);
        context("ANALYSIS",from,to,type,groupBy,null,doctorId,specialtyId,parentRunId,"/api/v1/management/reports/summary",null,null,null,analysis.rows().stream().map(OperationalReportUseCase.Group::key).toList());
        return analysis;
    }
    @GetMapping("/sources")
    public OperationalReportUseCase.Listing sources(@RequestParam LocalDate from,@RequestParam LocalDate to,
        @RequestParam String type,@RequestParam String groupBy,@RequestParam String groupValue,
        @RequestParam(required=false) UUID doctorId,@RequestParam(required=false) UUID specialtyId,
        @RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int size,
        @RequestParam(required=false) UUID parentRunId) {
        var listing=reports.sources(from,to,type,groupBy,groupValue,doctorId,specialtyId,page,size);
        context("SOURCES",from,to,type,groupBy,groupValue,doctorId,specialtyId,parentRunId,"/api/v1/management/operational-reports/analysis",null,null,listing.records(),null);
        return listing;
    }
    @GetMapping("/records/{id}")
    public OperationalReportUseCase.Detail record(@PathVariable UUID id,@RequestParam LocalDate from,@RequestParam LocalDate to,
        @RequestParam String type,@RequestParam String groupBy,@RequestParam String groupValue,
        @RequestParam LocalDate sourceDate,@RequestParam(required=false) UUID doctorId,
        @RequestParam(required=false) UUID specialtyId,@RequestParam(required=false) UUID parentRunId) {
        context("RECORD",from,to,type,groupBy,groupValue,doctorId,specialtyId,parentRunId,"/api/v1/management/operational-reports/sources",id,sourceDate,null,null);
        return reports.detail(from,to,type,groupBy,groupValue,doctorId,specialtyId,id,sourceDate);
    }
    private void context(String level, LocalDate from, LocalDate to, String type, String groupBy, String groupValue,
                         UUID doctorId, UUID specialtyId, UUID parent, String expected, UUID sourceId, LocalDate sourceDate, java.util.List<OperationalReportUseCase.Source> sources, java.util.List<String> groupKeys) {
        Map<String,String> fields=new LinkedHashMap<>(); fields.put("report",level); fields.put("from",from.toString()); fields.put("to",to.toString()); fields.put("type",type); fields.put("groupBy",groupBy);
        if (groupValue!=null) fields.put("groupValue",groupValue); if (doctorId!=null) fields.put("doctorId",doctorId.toString()); if (specialtyId!=null) fields.put("specialtyId",specialtyId.toString());
        if (sourceId!=null) { fields.put("sourceId",sourceId.toString()); if (sourceDate != null) fields.put("sourceKey",sourceId+"|"+sourceDate); }
        if (parent!=null) {
            if (level.equals("ANALYSIS")) audit.validateReportParent(parent,expected,fields,"from","to","doctorId","specialtyId");
            else if (level.equals("SOURCES")) audit.validateReportParent(parent,expected,fields,"from","to","type","groupBy","doctorId","specialtyId");
            else audit.validateReportParent(parent,expected,fields,"from","to","type","groupBy","groupValue","doctorId","specialtyId");
            fields.put("parentRunId",parent.toString());
        }
        if (groupKeys!=null) { Map<String,Object> withGroups=new LinkedHashMap<>(fields); withGroups.put("groupKeys",groupKeys); audit.recordRequestContext(withGroups); }
        else if (sources==null) audit.recordRequestContext(fields);
        else { Map<String,Object> withIds=new LinkedHashMap<>(fields); withIds.put("sourceIds",sources.stream().map(s->s.sourceId().toString()).toList()); withIds.put("sourceKeys",sources.stream().map(s->s.sourceId()+"|"+s.sourceDate()).toList()); audit.recordRequestContext(withIds); }
    }
}
