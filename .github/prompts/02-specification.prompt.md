---
agent: agent
description: Transforma a história e o protótipo em especificação de produto e engenharia de nível sênior, com benchmark de mercado e rastreabilidade.
tools:
  - search/codebase
  - read/readFile
  - edit/editFiles
---

# Prompt 02 — Especificação Sênior da Clínica Hans

## Fontes obrigatórias
1. `input/application-story.md`
2. `prototypes/` — considerar funcionalidades já validadas no protótipo
3. `docs/memory-bank/`
4. pesquisa em fontes oficiais e produtos maduros do segmento de clínicas/saúde

## Método obrigatório
- Tratar a história como fonte da intenção do negócio.
- Usar benchmark para descobrir padrões e lacunas, nunca para inventar escopo obrigatório.
- Separar claramente: MVP, evolução preparada e fora de escopo.
- Modelar jornada longitudinal do paciente, não apenas telas/CRUD.
- Incluir critérios de aceite, estados, transições, autorização, auditoria e continuidade do cuidado.
- Diferenciar requisito funcional, regra de negócio, requisito não funcional e premissa.
- Para metas técnicas ainda não validadas, identificar como alvo de engenharia.
- Revisar coerência entre documentos e diagramas antes de encerrar.

## Benchmark mínimo
Avaliar padrões de produtos maduros de gestão clínica/prontuário, preferencialmente fontes oficiais de:
- iClinic / Feegow / Ninsaúde / Doctoralia Pro;
- MV / Philips / Epic ou equivalentes para padrões assistenciais;
- ANS para TISS/TUSS quando aplicável;
- ANPD/LGPD e referências brasileiras de segurança de dados de saúde.

Registrar síntese e decisões em `docs/specs/market-benchmark.md`.

## Gerar/atualizar
- `docs/specs/functional-requirements.md`
- `docs/specs/non-functional-requirements.md`
- `docs/specs/use-cases.md`
- `docs/specs/business-rules.md`
- `docs/specs/market-benchmark.md`
- `docs/diagrams/domain-model.mmd`
- `docs/diagrams/main-flow.mmd`
- `docs/diagrams/process.bpmn`
- `docs/diagrams/process.drawio`

## Domínios mínimos a validar
Identidade e acesso; pacientes; médicos/especialidades; disponibilidade; agenda/check-in/no-show; prontuário longitudinal; alergias/alertas/medicamentos/condições; atendimento e adendo; exames/resultados/revisão; acompanhamento/retorno; documentos; financeiro; indicadores; auditoria; extensibilidade para integrações.

## Qualidade de saída
A documentação deve permitir que um time sênior implemente o backend sem precisar adivinhar regras centrais. Toda lacuna encontrada durante implementação posterior deve retroalimentar estes documentos.
