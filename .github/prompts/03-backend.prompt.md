---
agent: agent
description: Implementa backend Java/Spring Boot com segurança clínica, SQL explícito, concorrência controlada e evidência de testes.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 03 — Backend Sênior com Gate de Segurança

## Leia antes
- `input/application-story.md`
- `docs/memory-bank/`
- todos os `docs/specs/`
- `docs/diagrams/`
- `prototypes/`

## Regra de revisão cruzada
Código não pode inventar regra silenciosamente. Lacuna encontrada deve primeiro retroalimentar especificação/diagrama e depois ser implementada.

## Stack
Java 21; Spring Boot 3.x; Spring Web/Security/JDBC; PostgreSQL 16; Bean Validation; OpenAPI; SLF4J; SQL parametrizado; sem JPA/Hibernate.

## Arquitetura obrigatória
- módulos por capacidade;
- DTO de API separado de record de persistência;
- controller fino → use-case/service → repository;
- enums/constraints para estados críticos;
- timestamps em UTC + `business-zone` configurável;
- UUID;
- transações explícitas em mutações multi-etapa;
- migrações com ordem, exclusão mútua entre instâncias e verificação de integridade/checksum.

## Segurança P0
- deny-by-default;
- validar conta ativa e roles atuais em **toda requisição**, não confiar apenas em roles antigas do JWT;
- access token curto; estratégia documentada de revogação/rotação;
- proteção de brute force/rate limit no login antes de produção;
- row-level authorization para médico: agenda, paciente clínico, encounter, exame, resultado e follow-up;
- acesso administrativo excepcional a conteúdo clínico deve usar política break-glass, motivo e auditoria;
- autenticação bem/mal sucedida e autorização negada auditáveis;
- leitura de prontuário auditada;
- nenhuma PHI/token em log;
- CORS e headers restritos por ambiente;
- Swagger/Actuator com política de exposição por ambiente.

## Integridade P0
- conflito de agenda garantido pelo banco;
- disponibilidade calculada no fuso de negócio;
- atendimento FINAL imutável; correção por adendo;
- revisão de resultado idempotente/única sob concorrência;
- pagamento protegido contra corrida/overpayment;
- enums/status críticos protegidos também no banco;
- CPF/identificadores normalizados quando aplicável;
- audit/evento e mutação clínica devem possuir fronteira transacional coerente.

## APIs
Implementar apenas requisitos rastreados. Cada endpoint crítico deve:
- validar entrada;
- aplicar RBAC + escopo contextual;
- minimizar DTO de resposta;
- ter erro padronizado/correlationId;
- possuir teste de sucesso, negação e concorrência quando aplicável.

## Testes mínimos obrigatórios
1. unitários de máquina de estados;
2. integração PostgreSQL real/Testcontainers para migrations e SQL;
3. conflito de agenda concorrente;
4. médico A não lê/altera dados clínicos do médico B sem relação válida;
5. exame/resultado de outro médico negado;
6. usuário desativado com JWT ainda válido é negado;
7. pagamento concorrente não ultrapassa recebível;
8. revisão concorrente de resultado gera uma única revisão;
9. timezone: slot configurado em America/Sao_Paulo funciona mesmo com payload UTC;
10. atendimento finalizado não sofre update;
11. audit trail mínimo para login, prontuário e mutações críticas.

## CI obrigatório
`mvn clean verify`, PostgreSQL real para testes de integração, relatório de testes e falha do pipeline para P0.

## Definition of Done
“Compila” não é pronto. Só considerar concluído quando requisito→API→SQL→teste estiver rastreado e não houver P0 aberto em `docs/reviews/`.
