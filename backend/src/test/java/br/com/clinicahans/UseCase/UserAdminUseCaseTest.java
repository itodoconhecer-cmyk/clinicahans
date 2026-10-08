package br.com.clinicahans.UseCase;

import br.com.clinicahans.utilities.exception.BusinessRuleException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UserAdminUseCaseTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuditUseCase auditUseCase = mock(AuditUseCase.class);
    private final UserAdminUseCase useCase = new UserAdminUseCase(jdbc, encoder, auditUseCase);

    @Test
    void listaOsPerfisDisponiveisParaCadastro() {
        when(jdbc.query(eq("select code from role order by code"), ArgumentMatchers.<RowMapper<String>>any()))
            .thenReturn(List.of("ADMIN", "GESTAO", "MEDICO", "RECEPCAO"));

        assertEquals(List.of("ADMIN", "GESTAO", "MEDICO", "RECEPCAO"), useCase.availableRoles());
        verify(jdbc).query(eq("select code from role order by code"), ArgumentMatchers.<RowMapper<String>>any());
    }

    @Test
    void exigeAoMenosUmPerfil() {
        assertThrows(BusinessRuleException.class, () -> useCase.create("ana", "senha-segura-123", List.of()));
        verifyNoInteractions(jdbc, encoder, auditUseCase);
    }

    @Test
    void rejeitaPerfilDuplicado() {
        assertThrows(
            BusinessRuleException.class,
            () -> useCase.create("ana", "senha-segura-123", List.of("MEDICO", "MEDICO"))
        );
        verifyNoInteractions(jdbc, encoder, auditUseCase);
    }
}
