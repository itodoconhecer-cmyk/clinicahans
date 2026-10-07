# Requisitos Não Funcionais — Clínica Hans

## Premissas
Metas abaixo são alvos de engenharia para o projeto e devem ser validadas em produção conforme volume real.

## Segurança e privacidade
- **RNF-001 [P0] TLS:** tráfego externo apenas sobre HTTPS em produção.
- **RNF-002 [P0] Senhas:** hash adaptativo (BCrypt/Argon2), nunca reversível.
- **RNF-003 [P0] JWT:** access token curto; segredo/chaves fora do código; claims mínimas; validação de expiração, emissor e assinatura.
- **RNF-004 [P0] Autorização:** deny-by-default; RBAC explícito e regras contextuais nos serviços.
- **RNF-005 [P0] Dados de saúde:** tratados como dados pessoais sensíveis; minimizar coleta, exposição, logs e respostas.
- **RNF-006 [P0] Logs:** proibir anamnese, diagnóstico, reação, documento e token em logs.
- **RNF-007 [P0] Auditoria:** eventos clínicos e de autorização devem ser append-only para usuários comuns.
- **RNF-008 [P0] OWASP:** proteção contra injeção via prepared statements, validação de entrada, CORS restrito, headers e tratamento seguro de erro.
- **RNF-009 [P1] Sessão:** suportar revogação/inativação de usuário e rotação de segredo/chaves.
- **RNF-010 [P1] Segredos:** variáveis de ambiente/secret store; nenhum segredo real versionado.

## Integridade clínica
- **RNF-020 [P0] Imutabilidade lógica:** registros clínicos finalizados recebem adendo/versionamento; não UPDATE destrutivo do conteúdo original.
- **RNF-021 [P0] Transação:** finalização de atendimento + eventos dependentes críticos deve ser atômica quando necessário.
- **RNF-022 [P0] Concorrência:** agenda deve evitar dupla reserva por constraint/transação, não apenas validação de tela.
- **RNF-023 [P0] Relógio:** timestamps persistidos em UTC com apresentação no fuso da clínica.
- **RNF-024 [P1] Identificadores:** IDs internos devem usar UUID e não carregar significado de negócio.
- **RNF-025 [P1] Concorrência de edição:** cadastros e registros mutáveis críticos devem usar versão/controle otimista quando houver risco de perda de atualização.

## Disponibilidade, continuidade e recuperação
- **RNF-030 [P1] Disponibilidade alvo:** 99,5% mensal para MVP, excluindo janela planejada; alvo deve crescer conforme criticidade.
- **RNF-031 [P1] Backup:** backup automatizado e criptografado.
- **RNF-032 [P1] RPO/RTO inicial:** RPO <= 24h e RTO <= 4h para MVP; validar antes de produção real.
- **RNF-033 [P1] Restore drill:** restauração deve ser testada periodicamente.
- **RNF-034 [P1] Degradação:** falha de notificação não pode indisponibilizar agenda/atendimento.

## Performance e capacidade
- **RNF-040 [P1] API operacional:** p95 <= 500 ms para consultas simples sob carga nominal do MVP.
- **RNF-041 [P1] Timeline:** p95 <= 1,5 s para histórico paginado sem anexos binários.
- **RNF-042 [P1] Paginação:** endpoints de listas potencialmente grandes devem ser paginados e limitados.
- **RNF-043 [P1] Índices:** CPF, CRM/UF, agenda por médico/data, paciente/data e pendências devem possuir índices adequados.
- **RNF-044 [P1] Anexos:** binários não devem ser armazenados diretamente em colunas grandes do banco no desenho de produção; persistir metadados + storage apropriado.

## Observabilidade e operação
- **RNF-050 [P1] Correlation ID:** toda requisição deve receber/propagar identificador.
- **RNF-051 [P1] Health:** endpoints de liveness/readiness sem expor segredo.
- **RNF-052 [P1] Métricas:** erros, latência, autenticação negada e principais filas operacionais.
- **RNF-053 [P1] Erros:** contrato consistente com code, message segura, correlationId e fieldErrors.
- **RNF-054 [P1] Auditoria x log:** trilha de auditoria é domínio persistente; log técnico não substitui auditoria.

## Arquitetura e qualidade
- **RNF-060 [P0] Stack:** Java 25 LTS preferencial (mínimo 17), Spring Boot, Spring Web, Spring Security, PostgreSQL.
- **RNF-061 [P0] Persistência:** SQL explícito com JDBC/JdbcTemplate/NamedParameterJdbcTemplate; proibido JPA/Hibernate.
- **RNF-062 [P0] SQL parametrizado:** nenhuma concatenação de entrada do usuário em SQL.
- **RNF-063 [P1] Camadas:** controller → service/use-case → repository; DTO não vaza diretamente para domínio/persistência.
- **RNF-064 [P1] Migração própria:** scripts versionados e tabela de controle, sem dependência obrigatória de Flyway.
- **RNF-065 [P1] OpenAPI:** contratos HTTP documentados.
- **RNF-066 [P1] Testes:** unitários para regras e integração para SQL/endpoints críticos.
- **RNF-067 [P1] Testcontainers:** recomendado para integração PostgreSQL quando execução permitir.
- **RNF-068 [P1] Evolução:** módulos organizados por domínio/capacidade para reduzir acoplamento.

## UX, acessibilidade e interoperabilidade
- **RNF-070 [P1] Acessibilidade:** labels, teclado, foco e contraste nas ações críticas.
- **RNF-071 [P1] Responsividade:** recepção e médico utilizáveis em desktop/tablet.
- **RNF-072 [P1] API-first:** versionamento de API em /api/v1 e contratos estáveis.
- **RNF-073 [P2] Interoperabilidade:** modelo deve permitir TISS/TUSS e integrações futuras sem contaminar o núcleo clínico.
- **RNF-074 [P2] Terminologias:** códigos externos devem ser armazenados com sistema/versão, nunca hard-coded como enum eterno.

## LGPD e governança
- **RNF-080 [P0] Minimização e finalidade:** cada dado sensível deve ter finalidade de negócio/assistencial.
- **RNF-081 [P0] Controle de acesso auditável:** leitura relevante de prontuário precisa ser rastreável.
- **RNF-082 [P1] Retenção:** política formal por classe de dado antes da entrada em produção.
- **RNF-083 [P1] Exportação/portabilidade:** processos devem evitar vazamento de dados de terceiros.
- **RNF-084 [P1] Incidentes:** logs e arquitetura devem permitir investigação e contenção.

## Definition of Done técnica
Um endpoint crítico só está pronto se: valida entrada, aplica autorização, usa SQL parametrizado, possui teste, registra auditoria quando aplicável, não loga PHI, documenta OpenAPI e retorna erro padronizado.
