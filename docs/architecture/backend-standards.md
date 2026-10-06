# Padrões de Backend — Clínica Hans

## Referência obrigatória
A organização de pacotes segue o projeto UMC:
https://github.com/itodoconhecer-cmyk/aulas_umc_2026_1_spring_boot/tree/master/src/main/java/aulas/umc/oo

## Estrutura obrigatória
```text
br/com/clinicahans/
├── DTO/
├── UseCase/
├── command/
├── controller/
├── mapper/
├── model/
│   └── valueObjects/
├── repository/
├── utilities/
├── config/
├── DatabaseInitializer.java
└── ClinicHansApplication.java
```

A organização raiz por domínio/feature é proibida. Pacotes como `patient`, `appointment`, `clinical`, `doctor`, `finance` e equivalentes não devem voltar a existir.

## Fluxo de responsabilidade
Controller → DTO/Mapper → Command → UseCase → Model → Repository → PostgreSQL.

Nem todo endpoint precisa criar classes artificiais sem necessidade, mas nenhum controller deve concentrar regra de negócio ou DTO aninhado. A camada de negócio oficial é `UseCase`.

## Persistência e segurança
SQL explícito e parametrizado, sem JPA/Hibernate. Transações para operações multi-etapa, JWT/RBAC, auditoria, validação de entrada e tratamento global de erros.

## Gate
`backend/verify-architecture.sh` roda no CI e bloqueia regressão estrutural.
