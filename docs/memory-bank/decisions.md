# Memory Bank — Registro de Decisões

## DEC-001 — Stack padrão consolidada
Adotamos:
- frontend em HTML5, CSS3 e JavaScript moderno puro (ES Modules, classes e padrões simples), sem framework;
- backend em Java 17+ e Spring Boot, seguindo como referência arquitetural o repositório `https://github.com/itodoconhecer-cmyk/aulas_umc_2026_1_spring_boot`;
- persistência com SQL explícito/raiz e acesso a dados sem JPA/Hibernate;
- PostgreSQL;
- autenticação/autorização com JWT;
- documentação de API com OpenAPI/Swagger.

Motivo: manter a fábrica coerente com a arquitetura definida para este projeto, reduzir abstrações desnecessárias e tornar o fluxo didático e rastreável.

## DEC-002 — Processo em etapas
A geração deve ocorrer em etapas:
1. protótipo funcional;
2. especificação funcional e técnica;
3. diagramas e BPMN;
4. banco de dados e backend;
5. frontend;
6. revisão integrada.

Motivo: reduzir improviso e aumentar rastreabilidade.

## DEC-003 — Segurança desde o início
Toda solução deve considerar autenticação, autorização por perfil, logs, auditoria, proteção de dados sensíveis e tratamento de erros.

Motivo: a aplicação lida com dados clínicos e administrativos e deve nascer com segurança como requisito transversal.

## DEC-004 — Diagramas obrigatórios
Toda história deve gerar pelo menos um modelo de domínio, um fluxo Mermaid e um BPMN.

Motivo: reforçar compreensão e validação antes do código.

## DEC-005 — Hierarquia de fontes
Em caso de conflito entre documentos, aplicar a seguinte precedência:
1. `input/application-story.md` para intenção e escopo de negócio;
2. `docs/memory-bank/architecture.md` e este arquivo para decisões técnicas vigentes;
3. `docs/specs/` para requisitos refinados;
4. `docs/architecture/` para padrões de implementação;
5. prompts e agentes.

Motivo: impedir que prompts ou templates antigos sobrescrevam decisões vigentes.

## DEC-006 — Relatórios com proveniência e sugestões explicáveis
Relatórios sintéticos e analíticos devem mostrar período, filtros, definição/versionamento e fontes de cada indicador. Acesso, consulta e exportação são rastreáveis; detalhamento sempre respeita as permissões do domínio de origem. Sugestões são determinísticas e operacionais, apresentam evidência e regra, não executam alterações e não recomendam condutas clínicas.

Motivo: permitir decisões de gestão comparáveis e auditáveis sem ampliar exposição de dados de saúde.

## DEC-007 — Particionamento semanal dos registros de alto volume
Agendamentos, consultas, recebíveis, pagamentos, resultados de exames e prescrições são particionados por intervalo semanal sobre o timestamp do evento, com semanas iniciando às 00:00 de segunda-feira em `America/Sao_Paulo`. Cada tabela usa chave primária composta com o timestamp; tabelas locator preservam unicidade global do UUID e a integridade referencial. Um guard não particionado continua impondo a exclusão de horários sobrepostos entre médicos.

Motivo: suportar mais de um milhão de atendimentos mensais, permitindo poda de partições nas consultas temporais sem perder as relações existentes por UUID.

## DEC-008 — Modelo de prescrição preparado para particionamento
A migração cria armazenamento semanal de prescrições e itens; a emissão, a assinatura digital e a interface clínica continuam fora da API atual.

Motivo: cumprir a necessidade de retenção e escala da prescrição sem afirmar que o fluxo assistencial já foi implementado.
