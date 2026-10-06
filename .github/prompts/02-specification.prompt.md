---
agent: agent
description: Produz especificação funcional e de domínio auditável, rastreável e pronta para implementação segura da Clínica Hans.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
---

# Prompt 02 — Especificação Sênior e Auditável

## Fontes obrigatórias
1. `input/application-story.md`
2. `prototypes/`
3. `docs/memory-bank/`
4. documentação já existente em `docs/specs/`
5. fontes oficiais e atuais aplicáveis ao Brasil (ANPD/LGPD, CFM/SBIS, ANS/TISS quando pertinente)
6. benchmark oficial de produtos maduros, apenas como referência de padrão, nunca como fonte automática de escopo

## Regra de precedência
História e decisões explícitas do projeto definem intenção. Regulação e segurança podem impor restrições. Benchmark sugere lacunas, mas não cria requisito sem classificação e justificativa.

## Método obrigatório
1. Mapear atores, jornadas e dados sensíveis.
2. Separar MVP, evolução preparada e fora de escopo.
3. Modelar bounded contexts/agregados, estados, transições e invariantes.
4. Definir autorização em duas camadas:
   - RBAC por perfil;
   - escopo contextual/row-level (ex.: médico só acessa paciente/agenda/exame quando houver relação assistencial válida).
5. Definir ciclo de vida completo de cada entidade: criar, consultar, alterar, encerrar/inativar, corrigir, arquivar quando aplicável.
6. Definir fuso de negócio explicitamente; timestamps técnicos em UTC.
7. Definir concorrência e idempotência para agenda, pagamento, revisão de resultado e outras mutações críticas.
8. Classificar dados (administrativo, financeiro, clínico sensível, credencial/auditoria) e aplicar minimização.
9. Definir auditoria incluindo autenticação, acesso negado, leitura sensível, mutação, before/after ou referência de versão.
10. Definir requisitos de retenção, exportação, incidentes, backup/restore e break-glass antes de produção.
11. Registrar toda lacuna ou decisão ainda não confirmada como **PENDÊNCIA**, nunca como requisito implementado.
12. Revisar coerência entre requisitos, casos de uso, regras, domínios, telas e diagramas.

## Rastreabilidade obrigatória
Gerar `docs/specs/traceability-matrix.md` com:
`História/Problema → RF → RN → UC → Domínio → API esperada → Tela esperada → Teste esperado → Status`.

Status permitido: `PLANEJADO | PARCIAL | IMPLEMENTADO_E_VERIFICADO | FORA_DO_MVP`.
Nunca marcar IMPLEMENTADO_E_VERIFICADO sem evidência no repositório e teste correspondente.

## Entregas obrigatórias
- `docs/specs/functional-requirements.md`
- `docs/specs/functional-specification.md`
- `docs/specs/non-functional-requirements.md`
- `docs/specs/use-cases.md`
- `docs/specs/business-rules.md`
- `docs/specs/domains.md`
- `docs/specs/market-benchmark.md`
- `docs/specs/traceability-matrix.md`
- `docs/specs/ui-screen-inventory.md`
- diagramas em `docs/diagrams/`

## Domínios mínimos
Identidade/acesso; Patient Registry; Clinical Workforce; Scheduling; Clinical Record; Care Continuity; Billing; Management; Audit; Integration.

## Gate de qualidade
A especificação falha se:
- uma regra crítica depende apenas da UI;
- houver permissão por perfil sem escopo contextual;
- um estado existir sem transições definidas;
- um ciclo de vida não possuir encerramento/correção quando necessário;
- houver requisito marcado implementado sem código+teste;
- houver referência regulatória desatualizada ou afirmação de conformidade/certificação sem evidência.
