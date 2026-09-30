---
agent: agent
description: Gera backend Java/Spring Boot de nível sênior para a Clínica Hans com SQL explícito, segurança clínica e revisão cruzada das especificações.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 03 — Backend Sênior da Clínica Hans

## Leia antes de gerar
- `input/application-story.md`
- `prototypes/`
- `docs/memory-bank/`
- `docs/specs/`
- `docs/architecture/` quando existir
- `docs/diagrams/`
- repositório de referência definido em `docs/memory-bank/architecture.md`

## Regra de revisão cruzada
Antes e durante a implementação, confronte código, SQL e contratos com Prompt 02. Se uma decisão de implementação revelar lacuna, ambiguidade ou inconsistência:
1. ajuste/enriqueça a especificação correspondente;
2. atualize diagrama se a estrutura de domínio mudar;
3. somente então consolide o código.

## Stack obrigatória
- Java 21 preferencial (mínimo 17)
- Spring Boot 3.x
- Spring Web
- Spring Security + JWT
- Spring JDBC / NamedParameterJdbcTemplate
- PostgreSQL 16
- Bean Validation
- OpenAPI/Swagger
- SLF4J
- SQL explícito; proibido JPA/Hibernate
- migrations próprias versionadas; sem dependência obrigatória de Flyway

## Arquitetura
- organização modular por capacidade de negócio;
- controllers finos;
- services/use-cases controlam transições e autorização contextual;
- repositories com SQL parametrizado e mapeamento explícito;
- DTOs separados de domínio/persistência;
- erros padronizados com correlationId;
- timestamps UTC;
- IDs UUID;
- constraints de banco para invariantes críticas.

## Segurança clínica obrigatória
- deny-by-default;
- menor privilégio;
- recepção sem conteúdo clínico detalhado;
- leitura de prontuário auditada;
- atendimento finalizado imutável no fluxo comum;
- correção por adendo;
- sem PHI/token em logs;
- prepared statements;
- segredos externos ao repositório.

## Entregas mínimas
### Infraestrutura
- `backend/pom.xml`
- configuração por ambiente
- OpenAPI
- segurança JWT
- correlation ID
- tratamento global de erros
- health/readiness
- migration runner próprio

### Banco
Schema inicial com usuários/perfis, paciente, médico/especialidade/disponibilidade, agenda e histórico de status, atendimento/adendo, alergia/alerta, medicamento/condição, exame/resultado/revisão, acompanhamento/ações, financeiro/pagamento e auditoria.

### APIs MVP
- autenticação;
- pacientes;
- médicos e disponibilidade;
- agenda + confirmação/cancelamento/check-in/no-show;
- safety snapshot/timeline;
- atendimento + finalização/adendo;
- alergias/alertas;
- exames/resultados/revisão;
- follow-ups;
- financeiro básico;
- auditoria e indicadores essenciais.

### Testes
- unitários para regras/transições;
- integração de persistência/endpoints críticos;
- teste de conflito de agenda;
- teste de autorização;
- teste de imutabilidade de atendimento.

## Definition of Done
Código compilável, sem JPA/Hibernate, Swagger disponível, SQL parametrizado, migrations reproduzíveis, regras críticas testadas, documentação revisada e nenhuma discrepância conhecida entre specs, banco, domínio e DTOs.
