package br.com.clinicahans.controller;

import br.com.clinicahans.UseCase.AuditUseCase;
import br.com.clinicahans.UseCase.ManagementQueryUseCase;
import br.com.clinicahans.config.JwtService;
import br.com.clinicahans.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ManagementController.class)
@Import(ManagementReportAuthorizationTest.MethodSecurity.class)
class ManagementReportAuthorizationTest {
    @TestConfiguration @EnableMethodSecurity static class MethodSecurity { }
    @Autowired MockMvc mvc;
    @MockBean ManagementQueryUseCase reports;
    @MockBean AuditUseCase audit;
    @MockBean JwtService jwt;
    @MockBean UserAccountRepository users;

    @Test @WithMockUser(roles="RECEPCAO")
    void receptionCannotReadManagementDetails() throws Exception {
        mvc.perform(get("/api/v1/management/reports/records/APPOINTMENTS/" + UUID.randomUUID()))
            .andExpect(status().isForbidden());
        verifyNoInteractions(reports);
    }

    @Test @WithMockUser(roles="GESTAO")
    void managerAccessToDetailRecordsAuditContext() throws Exception {
        UUID id = UUID.randomUUID();
        mvc.perform(get("/api/v1/management/reports/records/APPOINTMENTS/" + id))
            .andExpect(status().isOk());
        verify(audit).recordRequestContext(Map.of("report", "RECORD", "type", "APPOINTMENTS", "sourceId", id.toString()));
        verify(reports).record("APPOINTMENTS", id);
    }

    @Test @WithMockUser(roles="GESTAO")
    void detailChecksItsParentListingAndAuditsTheLink() throws Exception {
        UUID id = UUID.randomUUID(), parent = UUID.randomUUID();
        mvc.perform(get("/api/v1/management/reports/records/APPOINTMENTS/" + id).param("parentRunId", parent.toString()))
            .andExpect(status().isOk());
        verify(audit).validateReportParent(parent, "/api/v1/management/reports/sources",
            Map.of("report", "RECORD", "type", "APPOINTMENTS", "sourceId", id.toString(), "parentRunId", parent.toString()), "type");
        verify(audit).recordRequestContext(Map.of("report", "RECORD", "type", "APPOINTMENTS", "sourceId", id.toString(), "parentRunId", parent.toString()));
    }
}
