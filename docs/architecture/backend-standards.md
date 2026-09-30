# Padrões de Backend

## Stack
- Java 17+
- Spring Boot
- Spring Web
- Spring Security + JWT
- PostgreSQL
- SQL explícito, sem JPA/Hibernate
- OpenAPI/Swagger

## Referência
A estrutura deve permanecer compatível com os padrões aplicáveis do repositório de referência informado em `docs/memory-bank/architecture.md`.

## Estrutura recomendada
- controller
- service
- repository/dao
- domain
- dto
- config
- exception
- security

## Convenções
- controllers finos;
- services concentram regras e orquestração;
- persistência com SQL explícito;
- DTOs para contratos externos;
- objetos de domínio sem dependência de ORM;
- tratamento global de erros;
- testes para regras e acessos críticos.
