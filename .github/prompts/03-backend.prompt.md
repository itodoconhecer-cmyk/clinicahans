---
agent: agent
description: Gera o backend em Java/Spring Boot usando SQL explícito e sem JPA/Hibernate.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
  - execute/runInTerminal
---

# Prompt 03 — Gerar Backend Java

## Leia antes de gerar
- `input/application-story.md`
- `docs/memory-bank/`
- `docs/specs/`
- `docs/architecture/`
- `docs/diagrams/`

## Objetivo
Gerar o backend completo conforme as especificações e a arquitetura vigente.

## Stack obrigatória
- Java 17+
- Spring Boot
- Spring Web
- Spring Security com JWT
- PostgreSQL
- SQL explícito/raiz, sem JPA/Hibernate
- OpenAPI/Swagger
- SLF4J

## Referência arquitetural
Seguir os padrões aplicáveis do repositório indicado em `docs/memory-bank/architecture.md`.

## O que gerar
### Domínio
- objetos de domínio e enums sem anotações de ORM;
- regras coerentes com especificações.

### Acesso a dados
- repositories/DAOs com SQL explícito;
- mapeamento controlado de linhas para objetos;
- transações apenas quando necessárias.

### Lógica de negócio
- services por família de casos de uso;
- regras extraídas da história e das especificações.

### Camada HTTP
- controllers REST finos;
- DTOs de request/response;
- validação de entrada;
- tratamento consistente de erros.

### Banco
- scripts SQL versionados no projeto;
- integridade referencial, índices e auditoria conforme necessidade;
- não usar Flyway ou ORM como dependência implícita.

### Segurança e auditoria
- JWT;
- autorização por perfil;
- logs sem conteúdo clínico sensível;
- trilha de auditoria para ações críticas.

### Testes
- testes unitários de regras;
- testes de integração dos endpoints e persistência críticos.

## Qualidade exigida
- código compilável;
- Swagger disponível;
- separação clara de responsabilidades;
- consistência entre SQL, domínio e DTOs;
- nenhum uso de JPA/Hibernate.
