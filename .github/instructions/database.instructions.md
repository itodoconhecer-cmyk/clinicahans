---
applyTo: "database/**"
---

# Instruções para Banco de Dados

## Banco-alvo
PostgreSQL

## Estratégia
- SQL explícito/raiz.
- Scripts versionados no próprio projeto.
- Sem JPA/Hibernate.
- Sem obrigação de Flyway; a evolução deve seguir o mecanismo próprio definido pelo projeto.

## Diretrizes
- Modelagem relacional clara.
- Chaves primárias simples, preferencialmente `bigserial` ou `uuid` conforme o domínio.
- Chaves estrangeiras explícitas.
- Índices para campos de busca, autenticação e relacionamentos críticos.
- Scripts legíveis, idempotentes quando apropriado e bem nomeados.
- Timestamps de auditoria (`created_at`, `updated_at`) quando fizer sentido.

## Convenções
- Tabelas em `snake_case`.
- Colunas em `snake_case`.
- Chaves estrangeiras com sufixo `_id`.

## Qualidade
- Garantir integridade referencial.
- Evitar ambiguidade em nomes.
- Manter aderência entre SQL, objetos de domínio e contratos da API.
- Evitar sobreengenharia.
