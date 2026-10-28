package br.com.clinicahans.controller;

import br.com.clinicahans.UseCase.ManagementQueryUseCase;
import br.com.clinicahans.UseCase.AuditUseCase;
import br.com.clinicahans.DTO.ReportExportRequest;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/management")
@PreAuthorize("hasAnyRole('GESTAO','ADMIN')")
public class ManagementController {
    private final ManagementQueryUseCase managementQueryUseCase;
    private final AuditUseCase auditUseCase;
    public ManagementController(ManagementQueryUseCase managementQueryUseCase, AuditUseCase auditUseCase){
        this.managementQueryUseCase=managementQueryUseCase;
        this.auditUseCase=auditUseCase;
    }

    @GetMapping("/dashboard")
    public ManagementQueryUseCase.Dashboard dashboard(@RequestParam LocalDate from,@RequestParam LocalDate to){
        return managementQueryUseCase.dashboard(from,to);
    }

    @GetMapping("/reports/summary")
    public ManagementQueryUseCase.SummaryReport summary(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(required=false) UUID doctorId, @RequestParam(required=false) UUID specialtyId){
        auditUseCase.recordRequestContext(reportContext("SUMMARY", from, to, doctorId, specialtyId));
        return managementQueryUseCase.summary(from,to,doctorId,specialtyId);
    }

    @GetMapping("/reports/analysis")
    public ManagementQueryUseCase.AnalysisReport analysis(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="APPOINTMENTS") String type,
            @RequestParam(defaultValue="MONTH") String groupBy,
            @RequestParam(required=false) UUID doctorId, @RequestParam(required=false) UUID specialtyId,
            @RequestParam(required=false) String cohort, @RequestParam(required=false) UUID parentRunId){
        Map<String,String> context = reportContext("ANALYSIS", from, to, doctorId, specialtyId);
        context.put("type", type); context.put("groupBy", groupBy);
        if (cohort != null) context.put("cohort", cohort);
        if (parentRunId != null) { auditUseCase.validateReportParent(parentRunId, "/api/v1/management/reports/summary", context, "from", "to", "doctorId", "specialtyId"); context.put("parentRunId", parentRunId.toString()); }
        var result = managementQueryUseCase.analysis(from,to,type,groupBy,doctorId,specialtyId,cohort);
        Map<String,Object> auditedContext = new LinkedHashMap<>(context);
        auditedContext.put("groupKeys", result.rows().stream().map(row -> row.key()).toList());
        auditUseCase.recordRequestContext(auditedContext);
        return result;
    }

    @GetMapping("/reports/sources")
    public ManagementQueryUseCase.SourcesReport sources(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="APPOINTMENTS") String type,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="50") int size,
            @RequestParam(required=false) String groupBy,
            @RequestParam(required=false) String groupValue,
            @RequestParam(required=false) UUID doctorId, @RequestParam(required=false) UUID specialtyId,
            @RequestParam(required=false) String cohort, @RequestParam(required=false) UUID parentRunId){
        Map<String, String> context = reportContext("SOURCES", from, to, doctorId, specialtyId);
        context.put("type", type);
        context.put("from", from.toString());
        context.put("to", to.toString());
        context.put("page", String.valueOf(page));
        context.put("size", String.valueOf(size));
        if (groupBy != null) context.put("groupBy", groupBy);
        if (groupValue != null) context.put("groupValue", groupValue);
        if (cohort != null) context.put("cohort", cohort);
        if (parentRunId != null) { auditUseCase.validateReportParent(parentRunId, "/api/v1/management/reports/analysis", context, "from", "to", "doctorId", "specialtyId", "type", "groupBy", "cohort"); context.put("parentRunId", parentRunId.toString()); }
        var result = managementQueryUseCase.sources(from,to,type,page,size,groupBy,groupValue,doctorId,specialtyId,cohort);
        Map<String,Object> auditedContext = new LinkedHashMap<>(context);
        auditedContext.put("sourceIds", result.records().stream().map(row -> row.sourceId().toString()).toList());
        auditUseCase.recordRequestContext(auditedContext);
        return result;
    }

    @GetMapping("/reports/records/{type}/{id}")
    public ManagementQueryUseCase.RecordDetail record(@PathVariable String type, @PathVariable UUID id,
            @RequestParam(required=false) UUID parentRunId) {
        Map<String,String> context = new LinkedHashMap<>();
        context.put("report", "RECORD"); context.put("type", type); context.put("sourceId", id.toString());
        if (parentRunId != null) { auditUseCase.validateReportParent(parentRunId, "/api/v1/management/reports/sources", context, "type"); context.put("parentRunId", parentRunId.toString()); }
        auditUseCase.recordRequestContext(context);
        return managementQueryUseCase.record(type, id);
    }

    private static Map<String,String> reportContext(String report, LocalDate from, LocalDate to, UUID doctorId, UUID specialtyId) {
        Map<String,String> context = new LinkedHashMap<>();
        context.put("report", report); context.put("from", from.toString()); context.put("to", to.toString());
        if (doctorId != null) context.put("doctorId", doctorId.toString());
        if (specialtyId != null) context.put("specialtyId", specialtyId.toString());
        return context;
    }

    @PostMapping("/reports/exports")
    public Map<String, String> recordExport(@Valid @RequestBody ReportExportRequest request){
        Map<String, String> context = new LinkedHashMap<>();
        context.put("report", "EXPORT");
        context.put("reportRunId", request.reportRunId().toString());
        context.put("type", request.type());
        context.put("from", request.from().toString());
        context.put("to", request.to().toString());
        context.put("groupBy", request.groupBy() == null ? "" : request.groupBy());
        context.put("groupValue", request.groupValue() == null ? "" : request.groupValue());
        context.put("page", String.valueOf(request.page()));
        context.put("size", String.valueOf(request.size()));
        if (request.doctorId() != null) context.put("doctorId", request.doctorId().toString());
        if (request.specialtyId() != null) context.put("specialtyId", request.specialtyId().toString());
        if (request.cohort() != null) context.put("cohort", request.cohort());
        auditUseCase.validateReportParent(request.reportRunId(), "/api/v1/management/reports/sources", context,
            "type", "from", "to", "groupBy", "groupValue", "page", "size", "doctorId", "specialtyId", "cohort");
        auditUseCase.recordRequestContext(context);
        auditUseCase.recordReportExport(request.reportRunId());
        return Map.of("status", "RECORDED");
    }
}
