# Visão Geral da Solução

## Camadas
- Interface web
- API backend
- Persistência relacional
- Segurança
- Documentação e observabilidade

## Objetivo
Manter uma solução simples, moderna e compatível com demonstrações reais de geração assistida por IA.

## Fluxo macro
História → Especificação → Diagramas → Backend → Frontend → Revisão

## Escala de persistência
O banco usa particionamento declarativo semanal PostgreSQL para agendamentos, consultas, recebíveis, pagamentos, resultados de exames e prescrições. A estratégia suporta consultas por período com pruning, tabelas locator mantêm chaves UUID globais, e a manutenção provisiona seis meses de semanas futuras. Consultas por período devem sempre aplicar limite no timestamp particionado. A aplicação ainda precisa validar as metas de latência com carga representativa antes de produção.
