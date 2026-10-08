package br.com.clinicahans.config;

import br.com.clinicahans.model.identity.UserAccount;
import br.com.clinicahans.repository.UserAccountRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {
    private final JwtService jwt=mock(JwtService.class);
    private final UserAccountRepository users=mock(UserAccountRepository.class);
    private final JwtAuthenticationFilter filter=new JwtAuthenticationFilter(jwt,users);

    @Test
    void jwtValidoDeUsuarioDesativadoNaoAutentica() throws Exception {
        var request=new MockHttpServletRequest();
        request.addHeader("Authorization","Bearer token");
        var response=new MockHttpServletResponse();
        var chain=mock(FilterChain.class);
        when(jwt.parse("token")).thenReturn(new JwtService.TokenData("doctor",List.of("MEDICO")));
        when(users.findByUsername("doctor")).thenReturn(Optional.of(new UserAccount(
            UUID.randomUUID(),"doctor","hash",false,List.of("MEDICO"))));

        SecurityContextHolder.clearContext();
        filter.doFilter(request,response,chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        verify(chain).doFilter(request,response);
    }

    @Test
    void rolesDoBancoPrevalecemSobreRolesAntigasDoToken() throws Exception {
        var request=new MockHttpServletRequest();
        request.addHeader("Authorization","Bearer token");
        var response=new MockHttpServletResponse();
        var chain=mock(FilterChain.class);
        when(jwt.parse("token")).thenReturn(new JwtService.TokenData("user",List.of("ADMIN")));
        when(users.findByUsername("user")).thenReturn(Optional.of(new UserAccount(
            UUID.randomUUID(),"user","hash",true,List.of("RECEPCAO"))));

        SecurityContextHolder.clearContext();
        filter.doFilter(request,response,chain);

        var auth=SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertTrue(auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_RECEPCAO")));
        assertFalse(auth.getAuthorities().stream().anyMatch(a->a.getAuthority().equals("ROLE_ADMIN")));
        SecurityContextHolder.clearContext();
    }
}
