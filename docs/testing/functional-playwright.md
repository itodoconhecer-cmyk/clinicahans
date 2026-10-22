# Roteiros funcionais Playwright

## Escopo e execução

A suíte automatiza as telas HTML reais, os formulários e a navegação multipágina. Os cenários de tela e contrato usam respostas sintéticas interceptadas no navegador; assim, verificam a interação da interface e o método, rota e payload enviados sem gravar dados no banco. `scheduling.spec.mjs` continua sendo a integração principal com Spring Boot e PostgreSQL E2E: cobre reserva real, conflito, bloqueio, médico inativo, falha temporária, persistência, auditoria, outbox e transições de estado.

Os arquivos são:

- `tests/playwright/functional-screens.spec.mjs` — abertura das 47 telas cobertas pela suíte, renderização de listagens e estados, três visualizações de agenda e controle de acesso na interface; UI-101 Relatórios ainda não possui cobertura E2E;
- `tests/playwright/functional-operations.spec.mjs` — submissão dos formulários, navegação, contratos HTTP e payloads por domínio;
- `tests/playwright/scheduling.spec.mjs` — cenários integrados com banco dedicado, incluindo confirmação, check-in, atendimento, conclusão, cancelamento, ausência e rejeição de transições inválidas.

Execute a preparação conforme [`scheduling-playwright.md`](./scheduling-playwright.md) e rode `npm run test:e2e`. A configuração exige `E2E_DATABASE_URL` com nome contendo `e2e` ou `test` e `E2E_ADMIN_PASSWORD`. Não use base de dados de produção ou de desenvolvimento.

## Tipos de tela e de listagem cobertos

| Tipo | Roteiro e resultado esperado |
|---|---|
| Autenticação | Credencial inválida mostra mensagem genérica; credencial válida abre a visão geral. |
| Formulário de cadastro e edição | Campos são preenchidos, a ação envia o método e payload esperado, e a navegação seguinte abre a página ou lista correta. |
| Cartões pesquisáveis | Pacientes e médicos mostram cartões; a busca envia o termo e oferece acesso ao detalhe. |
| Tabela operacional | Fila, exames, retornos, faturamento, usuários e auditoria mostram linhas e ações válidas para cada estado. |
| Agenda | Alterna lista horizontal, agenda vertical e Grade 360°; busca de horário permite selecionar disponibilidade. |
| Prontuário e snapshot | Exibe resumos de alertas, alergias, medicamentos, condições, documentos e timeline; perfil sem permissão é redirecionado. |
| Timeline | Eventos são apresentados em ordem temporal com tipo, título e data. |
| Indicadores | Exibe métricas agregadas sem texto clínico. |
| Detalhe | Ficha do paciente, médico e evento de auditoria apresentam o registro associado ao identificador da rota. |
| Estado vazio e falha | Lista vazia não é erro; falha da API mostra mensagem segura e correlation ID, sem deixar a tela em branco. |
| Registros técnicos públicos | Atualiza a tabela com horário, rota, método, resultado e duração, sem identidade ou conteúdo clínico. |

## Matriz das telas inventariadas

| ID | Roteiro automatizado | Listagem ou resultado esperado |
|---|---|---|
| UI-001 | Login inválido e válido | Mensagem genérica; redirecionamento após autenticação |
| UI-010 | Abrir visão geral e validar indicadores/agenda por perfil | Cards de métricas e visualizações da agenda |
| UI-020 | Alternar as três visualizações da agenda | Tabela, agenda vertical e grade |
| UI-021 | Pesquisar horários, selecionar slot/paciente e confirmar | Disponibilidade e confirmação; integração real em `scheduling.spec.mjs` |
| UI-022 | Abrir fila de espera | Tabela operacional vazia/preenchida |
| UI-023 | Converter entrada da fila em agendamento | Envio de médico, data, duração e modalidade |
| UI-030 | Pesquisar paciente | Cartões e busca por termo |
| UI-031 | Cadastrar paciente administrativo | POST com dados administrativos; navega para ficha |
| UI-032 | Abrir ficha e seguir para edição | Detalhe administrativo do paciente |
| UI-033 | Atualizar paciente | PUT com versão recebida; retorno à ficha |
| UI-040 | Pesquisar médico | Cartões e acesso ao detalhe |
| UI-041 | Cadastrar médico | POST e navegação para detalhe |
| UI-042 | Abrir detalhe do médico | CRM/status e atalhos de configuração |
| UI-043 | Criar especialidade | Catálogo em tabela |
| UI-044 | Adicionar disponibilidade recorrente | POST com dia, faixa e duração do slot; listagem atualizada |
| UI-045 | Criar bloqueio temporário | POST com intervalo e motivo; listagem de bloqueios |
| UI-046 | Vincular usuário ao médico | POST com usuário ativo selecionado |
| UI-050 | Abrir prontuário integrado | Resumo de dados clínicos e atalhos |
| UI-051 | Abrir safety snapshot | Cards de alergias, medicamentos e condições e alertas críticos |
| UI-052 | Consultar linha do tempo | Lista temporal de eventos clínicos |
| UI-053 | Registrar alergia/alerta e desativar alerta | POST de alergia/alerta e DELETE auditável |
| UI-054 | Registrar medicamento | POST e atualização da seção de ativos |
| UI-055 | Registrar condição | POST com status e data opcional |
| UI-056 | Registrar metadados de documento clínico | POST com tipo, storage key, MIME e vínculo opcional |
| UI-060 | Iniciar atendimento de agendamento em check-in | POST e navegação para rascunho |
| UI-061 | Salvar queixa, avaliação e plano | PUT com versão otimista; navega para finalização |
| UI-062 | Finalizar atendimento | POST de finalização; mostra estado final e atalho para adendo |
| UI-063 | Registrar adendo ao atendimento finalizado | POST de motivo e conteúdo complementar |
| UI-064 | Solicitar exame durante o atendimento | POST e retorno à fila de exames |
| UI-065 | Criar follow-up clínico | POST e retorno à fila de acompanhamentos |
| UI-070 | Consultar exames pendentes e sua ação disponível | Tabela; resultado recebido abre revisão, demais abrem recebimento |
| UI-071 | Criar pedido de exame | POST com atendimento, nome, prioridade e prazo opcional |
| UI-072 | Receber resultado | POST com storage key e MIME; navega para revisão |
| UI-073 | Revisar resultado | POST de revisão e nota; retorno à lista |
| UI-080 | Consultar acompanhamentos e retornos | Tabela operacional e ação por item |
| UI-081 | Criar acompanhamento | POST com paciente, motivo, responsável/prioridade e prazo |
| UI-082 | Registrar ação e concluir acompanhamento | POST da ação com opção de fechamento |
| UI-090 | Consultar recebíveis | Tabela e atalho de pagamento para valores em aberto |
| UI-091 | Criar recebível | POST com atendimento, pagador, valor e vencimento opcional |
| UI-092 | Registrar pagamento parcial ou total | POST numérico com forma de pagamento |
| UI-100 | Consultar indicadores | Cards agregados de consultas, ausência, cancelamento e recebíveis |
| UI-110 | Consultar usuários | Tabela de perfil e estado ativo/inativo |
| UI-111 | Criar usuário com múltiplos perfis | Busca perfis disponíveis e envia seleção de checkboxes |
| UI-112 | Desativar usuário | POST de desativação e retorno à lista |
| UI-120 | Consultar auditoria recente | Tabela de eventos somente leitura |
| UI-121 | Pesquisar auditoria por entidade e identificador | GET filtrado e resultados em tabela |
| UI-122 | Abrir detalhe da auditoria | Tabela com ação, usuário, data e correlation ID |

## Operações sem ação visual disponível

A especificação prevê confirmar, cancelar, marcar ausência e fazer check-in de agendamentos. A tela `Agenda` atual apenas apresenta as três visualizações; ela ainda não fornece controles para essas transições. Por isso, o roteiro Playwright integrado exercita esses comandos pelo endpoint real, confere estado, histórico e auditoria no PostgreSQL e verifica cancelamento sem motivo e transição inválida. A interface deve ganhar controles antes de esses casos poderem ser automatizados como ações exclusivamente visuais.

A inclusão inicial na fila de espera e o vínculo de especialidade ao médico também não possuem formulário próprio nas telas atuais. Os roteiros criam essas pré-condições pelo endpoint autenticado; a conversão da fila e o cadastro de catálogo continuam sendo verificados pelas telas `UI-023` e `UI-043`. Esses fluxos de API não substituem a interface que falta.

## Privacidade dos dados de teste

Use nomes, identificadores, datas e documentos sintéticos. Os cenários com API simulada não incluem dados reais. Os cenários integrados usam banco E2E dedicado; a trilha e os anexos gerados pela suíte devem continuar sem senha, token, CPF, contato, nome real ou anotação clínica.
