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
│       ├── patient/
│       ├── workforce/
│       ├── scheduling/
│       ├── clinical/
│       ├── continuity/
│       ├── billing/
│       ├── identity/
│       └── valueObjects/
├── repository/
├── utilities/
├── config/
├── DatabaseInitializer.java
└── ClinicHansApplication.java
```

A organização raiz por domínio/feature é proibida: os pacotes diretamente sob `br.com.clinicahans` continuam sendo as camadas acima. O pacote `model` é a exceção intencional e contém subpacotes por domínio (por exemplo, `patient`, `workforce`, `scheduling`, `clinical`, `continuity`, `billing` e `identity`). Modelos de domínio são tipos de nível superior em arquivos próprios, nunca records aninhados em repositórios.

Objetos de valor compartilhados permanecem em `model/valueObjects`; não devem ser movidos para pastas de entidades. Projeções de leitura (`SafetySnapshot`, `TimelineEvent`, `OperationalFollowUp`) e projeções de apresentação (`Dashboard`, `UserView`) não são agregados e permanecem identificadas como projeções, sem serem relocadas para pastas de entidades. DTOs como `LoginResult` permanecem em `DTO/`.

## Fluxo de responsabilidade
Controller → DTO/Mapper → Command → UseCase → Model → Repository → PostgreSQL.

Nem todo endpoint precisa criar classes artificiais sem necessidade, mas nenhum controller deve concentrar regra de negócio ou DTO aninhado. A camada de negócio oficial é `UseCase`.

## Persistência e segurança
SQL explícito e parametrizado, sem JPA/Hibernate. Transações para operações multi-etapa, JWT/RBAC, auditoria, validação de entrada e tratamento global de erros.

## Gate
`backend/verify-architecture.sh` roda no CI e bloqueia regressão estrutural.
