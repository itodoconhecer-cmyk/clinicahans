# Revisão Cruzada Prompt 02 ↔ Prompt 03

## Objetivo
Registrar decisões e correções descobertas ao transformar a especificação em backend executável.

## Lacunas encontradas e resolvidas
1. **Usuário MEDICO x cadastro médico:** a primeira especificação permitia interpretar os dois conceitos como independentes. Foi criado vínculo explícito e regra de ownership.
2. **Conflito de agenda:** validação apenas no serviço seria vulnerável à concorrência. O PostgreSQL recebeu constraint de exclusão por médico + intervalo para estados ativos.
3. **Histórico de estado:** agendamento passou a possuir histórico próprio; estado inicial não é tratado como transição artificial.
4. **Concorrência em edição:** Patient e Encounter usam versão para evitar lost update.
5. **Atendimento finalizado:** atualização comum só opera em DRAFT; correção posterior é Addendum.
6. **Exame recebido x revisado:** estados separados e revisão possui profissional/data.
7. **Follow-up operacional:** fila da Recepção retorna dados mínimos, sem texto clínico detalhado.
8. **Auditoria:** é persistência de domínio; correlationId liga evento à requisição sem transformar log técnico em prontuário.
9. **Primeiro administrador:** bootstrap somente por variáveis de ambiente; nenhuma credencial default no git.
10. **Anexos clínicos:** banco armazena storageKey, MIME/checksum e vínculo; binário fica fora do banco no desenho de produção.

## Invariantes implementadas em mais de uma camada
- sobreposição de agenda: service + PostgreSQL exclusion constraint;
- CRM/UF: validação de entrada + unique constraint;
- CPF: unique constraint quando informado;
- pagamento: service/repository impede valor acumulado acima do recebível;
- ownership médico: autorização contextual no service;
- integridade de atendimento: estado + versionamento + adendo.

## Pendências deliberadas para evolução
- TISS/TUSS completo e elegibilidade de convênio;
- assinatura digital/prescrição;
- storage real de documentos (S3/Blob equivalente);
- mensageria de notificações;
- multiunidade e recursos compartilhados;
- terminologias clínicas estruturadas.

Essas pendências estão preparadas arquiteturalmente, mas não foram inventadas como requisito obrigatório do MVP.
