# Relatório de integração visual — Clínica Hans

**Edição:** 30 de outubro de 2026. **Repositório técnico de referência:** `itodoconhecer-cmyk/clinicahans` no commit `a1907d6297fe7fd0c00cf8f968435ef0f575ede3`.

## Resultado verificável

- Livro mestre em DOCX e PDF com **23 pranchas visuais adicionais inseridas nos capítulos** sobre arquitetura, modelagem, frontend, UX, agenda, dados, dashboards, relatórios e LocalStack.
- **35 figuras anteriores preservadas**, totalizando **58 imagens inseridas** no arquivo Word.
- **213 páginas** no PDF final; lista de ilustrações recomposta e conferida com os números de página reais.
- Cada imagem nova possui identificação como **estudo conceitual de IA**, fonte, comentário de leitura crítica e links para o código e documentação.
- Atlas de 23 páginas em A3 e arquivos PNG originais disponíveis separadamente para ampliação. Não se declara resolução vetorial para as imagens geradas.
- Arquivo de diagramas formais editáveis em draw.io preservado no pacote.

## Distinção acadêmica obrigatória

As pranchas geradas por IA são **apoio visual**, não modelos formais certificados. Alguns exemplos visuais divergem da implementação:

- O desenho de **classes** supõe herança e operações não presentes nos `record` Java da base consultada.
- O **DER** visual apresenta nomes e multiplicidades ilustrativas; prevalece o SQL em `V001__initial_schema.sql` e as migrações seguintes.
- O BPMN visual mistura notações de raias e mensagens; a modelagem executável/validável está nos artefatos BPMN formais.
- A ilustração de **LocalStack** menciona serviços que não constam do inventário habilitado; prevalece `docs/diagrams/localstack-inventory.md`.
- O pipeline de **data marts/ETL** em visualização analítica é uma proposta, não comprovação de implantação.
- Os protótipos UI/UX são **mockups**, não capturas reais da execução no navegador.

Essas diferenças foram explicitadas no próprio livro para apoiar investigação, leitura de código e verificação de fontes.

## O que a validação cobre — e o que não cobre

Validação documental: 23/23 pranchas localizadas no texto do PDF, ilustrações anteriores preservadas no Word, posições de página da lista de ilustrações conferidas, hiperlinks para fontes presentes, renderização e inspeção de amostras de páginas críticas. Não houve execução da aplicação, validação técnica normativa independente de cada figura, análise por pares nem utilização direta do Miro.

Para adotar a obra oficialmente como bibliografia institucional, recomenda-se conferência do conteúdo e da conformidade ABNT pelo corpo docente.