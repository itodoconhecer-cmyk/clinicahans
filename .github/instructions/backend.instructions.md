---
applyTo: "backend/**"
---

# Instruções para Backend

## Stack obrigatória
- Java 21 + Spring Boot
- Spring Web / Security / JDBC
- JWT
- PostgreSQL
- OpenAPI / Swagger
- SQL explícito, sem JPA/Hibernate

## Referência arquitetural normativa
O backend DEVE seguir a organização de:
https://github.com/itodoconhecer-cmyk/aulas_umc_2026_1_spring_boot/tree/master/src/main/java/aulas/umc/oo

Estrutura obrigatória sob `br/com/clinicahans`:
- `DTO/`
- `UseCase/`
- `command/`
- `controller/`
- `mapper/`
- `model/` e `model/valueObjects/`
- `repository/`
- `utilities/`
- `DatabaseInitializer.java`
- `ClinicHansApplication.java`

## Regras rigorosas
- É proibida organização raiz por feature como `patient/`, `appointment/`, `clinical/`, `doctor/`, `finance/` etc.
- Controllers tratam HTTP e delegam.
- DTOs de API ficam em `DTO/`, não aninhados em controllers.
- Regras/orquestração de negócio ficam em `UseCase/`; não criar camada de negócio `service/`.
- Commands representam intenção de negócio e ficam em `command/`.
- Mappers convertem DTO ↔ command/model/response e ficam em `mapper/`.
- Objetos de domínio e value objects ficam em `model/`.
- Persistência SQL fica em `repository/`.
- Infraestrutura transversal fica em `utilities/` ou `config/` quando estritamente configuração Spring.
- Não copiar cegamente defeitos do exemplo: usar DI do Spring, SQL parametrizado, transações e testes.
- `backend/verify-architecture.sh` é gate obrigatório de CI.
