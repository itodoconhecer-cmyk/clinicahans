package br.com.clinicahans.UseCase;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
public class JwtService {
    private final SecretKey key;
    private final String issuer;
    private final long expirationMinutes;

    public JwtService(@Value("${clinicahans.jwt.secret}") String secret,
                      @Value("${clinicahans.jwt.issuer}") String issuer,
                      @Value("${clinicahans.jwt.expiration-minutes}") long expirationMinutes) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET deve possuir ao menos 32 caracteres.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.expirationMinutes = expirationMinutes;
    }

    public String issue(String username, List<String> roles) {
        Instant now = Instant.now();
        return Jwts.builder()
            .issuer(issuer).subject(username)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
            .claims(Map.of("roles", roles))
            .signWith(key)
            .compact();
    }

    @SuppressWarnings("unchecked")
    public TokenData parse(String token) {
        var claims = Jwts.parser().verifyWith(key).requireIssuer(issuer).build().parseSignedClaims(token).getPayload();
        return new TokenData(claims.getSubject(), claims.get("roles", List.class));
    }

    public record TokenData(String username, List<String> roles) {}
}
