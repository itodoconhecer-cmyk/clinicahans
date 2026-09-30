package br.com.clinicahans.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service = service; }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(service.login(request.username(), request.password()));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(401).body(new LoginError("INVALID_CREDENTIALS", "Credenciais inválidas."));
        }
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record LoginError(String code, String message) {}
}
