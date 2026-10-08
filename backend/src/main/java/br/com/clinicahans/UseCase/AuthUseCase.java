package br.com.clinicahans.UseCase;

import br.com.clinicahans.DTO.LoginResult;
import br.com.clinicahans.repository.UserAccountRepository;

import br.com.clinicahans.config.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthUseCase {
    private final UserAccountRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthUseCase(UserAccountRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users; this.encoder = encoder; this.jwt = jwt;
    }

    public LoginResult login(String username, String password) {
        var user = users.findByUsername(username).orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));
        if (!user.active() || !encoder.matches(password, user.passwordHash())) {
            throw new BadCredentialsException("Credenciais inválidas");
        }
        return new LoginResult(jwt.issue(user.username(), user.roles()), "Bearer", user.roles());
    }
}
