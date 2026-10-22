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
    public ManagementQueryUseCase.SummaryReport summary(@RequestParam LocalDate from,@RequestParam LocalDate to){
        auditUseCase.recordRequestContext(Map.of("report", "SUMMARY", "from", from.toString(), "to", to.toString()));
        return managementQueryUseCase.summary(from,to);
    }

    @GetMapping("/reports/analysis")
    public ManagementQueryUseCase.AnalysisReport analysis(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="APPOINTMENTS") String type,
            @RequestParam(defaultValue="MONTH") String groupBy){
        auditUseCase.recordRequestContext(Map.of("report", "ANALYSIS", "type", type, "groupBy", groupBy,
            "from", from.toString(), "to", to.toString()));
        return managementQueryUseCase.analysis(from,to,type,groupBy);
    }

    @GetMapping("/reports/sources")
    public ManagementQueryUseCase.SourcesReport sources(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="APPOINTMENTS") String type,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="50") int size,
            @RequestParam(required=false) String groupBy,
            @RequestParam(required=false) String groupValue){
        Map<String, String> context = new LinkedHashMap<>();
        context.put("report", "SOURCES");
        context.put("type", type);
        context.put("from", from.toString());
        context.put("to", to.toString());
        context.put("page", String.valueOf(page));
        context.put("size", String.valueOf(size));
        if (groupBy != null) context.put("groupBy", groupBy);
        if (groupValue != null) context.put("groupValue", groupValue);
        auditUseCase.recordRequestContext(context);
        return managementQueryUseCase.sources(from,to,type,page,size,groupBy,groupValue);
    }

    @PostMapping("/reports/exports")
    public Map<String, String> recordExport(@Valid @RequestBody ReportExportRequest request){
        Map<String, String> context = new LinkedHashMap<>();
        context.put("report", "EXPORT");
        context.put("reportRunId", request.reportRunId().toString());
        context.put("type", request.type());
        context.put("from", request.from().toString());
        context.put("to", request.to().toString());
        context.put("groupBy", request.groupBy());
        context.put("groupValue", request.groupValue());
        context.put("page", String.valueOf(request.page()));
        context.put("size", String.valueOf(request.size()));
        auditUseCase.recordRequestContext(context);
        auditUseCase.recordReportExport(request.reportRunId());
        return Map.of("status", "RECORDED");
    }
}
