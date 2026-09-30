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
