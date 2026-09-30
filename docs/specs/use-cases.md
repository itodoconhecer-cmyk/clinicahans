# Casos de Uso — Clínica Hans

## Atores
**Paciente**, **Recepcionista**, **Médico**, **Gestor**, **Administrador**, **Serviço de Notificação** e futuras **Integrações Externas**.

## UC-001 — Autenticar usuário
**Prioridade:** P0  
**Pré:** usuário ativo.  
**Fluxo principal:** credenciais → validação → emissão de token → perfil/permissões.  
**Exceções:** credencial inválida; conta inativa.  
**Pós:** sessão autenticada e evento técnico/auditoria conforme política.

## UC-010 — Cadastrar/atualizar paciente
**Ator:** Recepção. **Prioridade:** P0.  
1. Pesquisar antes de criar.
2. Informar dados administrativos.
3. Sistema valida CPF e possíveis duplicidades.
4. Salva e audita.
**Regra:** Recepção não cadastra evolução clínica nesta tela.

## UC-020 — Cadastrar médico
**Ator:** Gestão/Admin. **Prioridade:** P0.  
1. Informar identidade e contato.
2. Informar CRM/UF, RQE e especialidades.
3. Configurar status, duração e disponibilidade.
4. Validar unicidade de CRM/UF.
5. Salvar e auditar.

## UC-030 — Agendar consulta
**Ator:** Recepção. **Prioridade:** P0.  
1. Selecionar paciente.
2. Selecionar médico/especialidade/modalidade.
3. Consultar slots.
4. Reservar horário.
5. Banco/serviço impede sobreposição.
6. Registrar confirmação pendente.
7. Disparar notificação assíncrona quando configurada.
**Alternativas:** encaixe; fila de espera; reagendamento.

## UC-031 — Confirmar/cancelar/check-in
**Ator:** Recepção/Paciente integrado.  
Transições válidas atualizam histórico; cancelamento libera capacidade; check-in coloca paciente na sala de espera.

## UC-040 — Abrir prontuário com safety snapshot
**Ator:** Médico. **Prioridade:** P0.  
1. Autorizar acesso.
2. Registrar auditoria de leitura.
3. Carregar resumo clínico.
4. Exibir alertas críticos antes da evolução.
5. Exibir timeline paginada.
**Falha segura:** se usuário não autorizado, nenhum dado clínico é retornado.

## UC-041 — Realizar atendimento
**Ator:** Médico. **Prioridade:** P0.  
1. Abrir prontuário.
2. Reconhecer contexto crítico.
3. Iniciar atendimento.
4. Registrar queixa, avaliação e conduta.
5. Salvar rascunho opcional.
6. Criar pedidos de exame/acompanhamentos.
7. Finalizar.
8. Sistema registra versão final, autoria e evento na timeline.

## UC-042 — Corrigir atendimento finalizado
**Ator:** Médico autorizado. **Prioridade:** P0.  
1. Selecionar atendimento.
2. Criar adendo com motivo.
3. Registrar novo conteúdo sem alterar original.
4. Auditar.

## UC-050 — Registrar alergia/reação e alerta
**Ator:** Médico. **Prioridade:** P0.  
Dados mínimos: substância, descrição da reação, severidade, status, autor/data.  
Se crítica/ativa, o sistema mantém alerta visível em próximos atendimentos.

## UC-060 — Solicitar e acompanhar exame
**Ator:** Médico/Equipe autorizada.  
Pedido → prazo/prioridade → estado → resultado → revisão → conclusão.  
Resultado recebido sem revisão continua como pendência clínica quando configurado.

## UC-070 — Criar e resolver acompanhamento
**Ator:** Médico/Recepção conforme conteúdo. **Prioridade:** P0.  
Criar responsável/prazo/motivo → fila → tentativas → agendamento/ação → conclusão.  
Recepção visualiza apenas informação operacional necessária.

## UC-080 — Faturar atendimento
**Ator:** Financeiro/Recepção autorizada.  
Criar conta → pagador → valor → pagamento/pendência → eventual estorno auditado.

## UC-090 — Consultar indicadores
**Ator:** Gestor.  
Filtros de período, médico/especialidade e estado; dados consolidados; sem texto clínico.

## UC-100 — Auditar atividade
**Ator:** Admin/Auditor autorizado.  
Consultar por usuário, paciente/entidade, ação, período e correlationId; evento é somente leitura.

## Cenário ponta a ponta — Mariana
1. Mariana agenda com médico substituto.
2. Recepção confirma e faz check-in sem ver detalhes clínicos.
3. Médico abre prontuário.
4. Sistema registra acesso e apresenta reação medicamentosa crítica.
5. Médico atende com contexto longitudinal.
6. Solicita hemograma e retorno.
7. Sistema cria pedido e acompanhamento.
8. Resultado recebido entra na timeline e permanece “a revisar”.
9. Médico revisa; acompanhamento é concluído ou gera novo plano.
10. Gestão vê indicadores agregados sem conteúdo clínico.

## Casos futuros preparados
- UC-F01 Convênio/TISS/TUSS.
- UC-F02 Prescrição eletrônica e assinatura.
- UC-F03 Teleconsulta.
- UC-F04 Multiunidade e recursos/equipamentos.
- UC-F05 Portal/app do paciente.
