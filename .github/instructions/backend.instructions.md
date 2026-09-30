---
applyTo: "backend/**"
---

# Instruções para Backend

## Stack obrigatória
- Java 17+
- Spring Boot
- Spring Web
- Spring Security
- JWT
- PostgreSQL
- OpenAPI / Swagger
- SQL explícito, sem JPA/Hibernate

## Referência arquitetural
Seguir a organização e os padrões aplicáveis do repositório de referência definido em `docs/memory-bank/architecture.md`.

## Diretrizes
- Usar arquitetura em camadas, mantendo HTTP, negócio e persistência separados.
- Preferir DTOs para entrada e saída.
- Validar entradas.
- Criar tratamento global de exceções.
- Usar logs estruturados com contexto e trilha de auditoria quando aplicável.
- Manter controllers finos e services claros.
- A camada de persistência deve usar SQL explícito e mapeamento controlado.
- Preparar código para testes unitários e de integração.

## Convenções
- `controller` para endpoints
- `service` para orquestração e regras
- `repository` ou `dao` para persistência SQL
- `domain` para objetos de domínio e enums
- `dto` para contratos
- `config` para configuração
- `exception` para erros
- `security` para autenticação e autorização

## Segurança
- Autenticação baseada em JWT.
- Perfis e permissões explícitos.
- Endpoints privados protegidos.
- Dados sensíveis não devem ser expostos em logs ou respostas indevidas.

## Banco
- Mudanças estruturais devem ser versionadas em scripts SQL próprios.
- Não usar JPA/Hibernate.
- Não depender de Flyway como requisito da fábrica, salvo decisão posterior registrada.
