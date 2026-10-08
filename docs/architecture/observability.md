# Observabilidade

## Objetivo
Permitir que a aplicação seja monitorável e auditável desde cedo.

## Diretrizes
- logs estruturados;
- correlação mínima por requisição, quando viável;
- mensagens de erro compreensíveis;
- logar eventos importantes do domínio e da segurança;
- diferenciar erro técnico de erro de negócio.

## Política implementada
- O Logback incluído pelo Spring Boot grava logs técnicos em JSON e faz rotação diária,
  com retenção de 30 dias e limite total de 5 GB. `LOG_DIR` altera o diretório.
- `WARN` e `ERROR` são habilitados em todos os ambientes. O nível `INFO` fica
  habilitado somente com os perfis `dev` e `homolog`; o padrão é `WARN`.
- Cada requisição de API gera trilha persistida com usuário (quando autenticado),
  horário UTC, método, rota, identificadores UUID do recurso, IP de origem, status,
  duração e correlation ID.
- Alterações guardam os valores anteriores disponíveis e relevantes; campos de conteúdo
  clínico são substituídos por `[REDACTED]`. Logs técnicos não recebem payload, token,
  documento ou conteúdo clínico.
- A consulta detalhada permanece restrita a ADMIN. A tela pública mostra apenas horário,
  método, rota parametrizada, status e duração; não mostra usuário, IP ou valores anteriores.

Para habilitar `INFO` em desenvolvimento ou homologação, use `SPRING_PROFILES_ACTIVE=dev`
ou `SPRING_PROFILES_ACTIVE=homolog`. Os arquivos diários são gravados em `logs/` por padrão.
