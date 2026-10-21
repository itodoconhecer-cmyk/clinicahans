# Caso de uso — Login

O [diagrama de sequência em Mermaid](login.mmd) e a [versão editável em draw.io](login.drawio) representam o fluxo atual de autenticação da Clínica Hans.

## Objetivo

Autenticar um usuário individual da clínica. O fluxo começa no formulário de login e termina com a emissão do JWT, a persistência da sessão do navegador e o redirecionamento para a visão geral.

Pré-condições: frontend e backend disponíveis, banco acessível e conta cadastrada em `app_user`. O bootstrap do administrador ocorre na inicialização e fica fora deste caso de uso.

## Cenários

- Sucesso: usuário ativo e senha correta; resposta 200 e JWT emitido.
- Entrada inválida: validação do `LoginRequest` ou corpo JSON inválido; resposta 400.
- Usuário inexistente, inativo ou senha incorreta: resposta 401 com mensagem genérica.

## Segurança e auditoria

- O endpoint `/api/v1/auth/login` é público para permitir a autenticação; as demais rotas exigem JWT.
- `CorrelationIdFilter` valida ou gera `X-Correlation-Id` e propaga o identificador no MDC e na resposta.
- `OperationAuditInterceptor` cria e finaliza a auditoria de toda requisição HTTP. No sucesso, `AuthUseCase` associa o registro ao usuário autenticado antes de emitir o token.
- A senha é verificada com `BCryptPasswordEncoder.matches`. O hash contém o salt e o custo; novas senhas usam custo 12.
- O JWT contém emissor, usuário, emissão, expiração e roles. A chave vem de `JWT_SECRET` e a expiração padrão é configurável em `application.yml`.
- Senhas, tokens e dados clínicos não aparecem no diagrama nem devem aparecer em logs.

## Rastreabilidade

- [Tela de login](../../../../frontend/login/login.js)
- [Cliente HTTP](../../../../frontend/services/api.js)
- [Sessão do navegador](../../../../frontend/state/session.js)
- [Contrato de entrada](../../../../backend/src/main/java/br/com/clinicahans/DTO/LoginRequest.java)
- [Controller](../../../../backend/src/main/java/br/com/clinicahans/controller/AuthController.java)
- [Caso de uso](../../../../backend/src/main/java/br/com/clinicahans/UseCase/AuthUseCase.java)
- [Repositório e SQL](../../../../backend/src/main/java/br/com/clinicahans/repository/UserAccountRepository.java)
- [BCrypt e autorização](../../../../backend/src/main/java/br/com/clinicahans/config/SecurityConfig.java)
- [JWT](../../../../backend/src/main/java/br/com/clinicahans/config/JwtService.java)
- [Correlation ID](../../../../backend/src/main/java/br/com/clinicahans/config/CorrelationIdFilter.java)
- [Auditoria HTTP](../../../../backend/src/main/java/br/com/clinicahans/config/OperationAuditInterceptor.java)
- [Caso de uso de auditoria](../../../../backend/src/main/java/br/com/clinicahans/UseCase/AuditUseCase.java)
- [Tratamento de erros](../../../../backend/src/main/java/br/com/clinicahans/utilities/exception/GlobalExceptionHandler.java)
