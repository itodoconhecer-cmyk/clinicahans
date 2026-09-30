# Benchmark de Mercado e Decisões de Produto — Clínica Hans

Data da pesquisa: 30/09/2026.

## Objetivo
Usar referências de produtos maduros de gestão clínica para elevar a qualidade da especificação sem copiar produto concorrente e sem transformar funcionalidades de mercado em requisitos obrigatórios sem rastreabilidade.

## Referências consultadas
- Feegow Clinic — agenda, prontuário, financeiro, relatórios, telemedicina e integração: https://feegowclinic.com.br/
- Ninsaúde Clinic — prontuário, protocolos, financeiro, faturamento, engajamento e análise: https://www.ninsaude.com/pt-br/
- Doctoralia Pro — prontuário, agenda, permissões, lembretes e telemedicina: https://pro.doctoralia.com.br/
- MV / SOUL MV / Clinic — prontuário, alertas, apoio à decisão, histórico, exames e integração: https://www.mv.com.br/
- ANS — Padrão TISS/TUSS vigente: https://www.gov.br/ans/
- ANPD — LGPD e dados pessoais sensíveis: https://www.gov.br/anpd/

## Padrões de produto identificados

### 1. Agenda é gestão de capacidade, não apenas calendário
Produtos maduros combinam agenda por profissional/unidade, confirmação, check-in/check-out, bloqueios, encaixes, fila/repescagem, recursos e modalidades presencial/remota.

**Decisão Hans:** MVP deve suportar profissional, disponibilidade, bloqueio, conflito, confirmação, cancelamento, ausência, check-in e fila de espera simples. Recursos físicos e multiunidade ficam preparados no modelo, mas podem entrar em fase posterior.

### 2. Prontuário é longitudinal e orientado ao risco
O prontuário maduro reúne histórico, alergias, medicamentos, condições, exames, documentos, formulários e alertas. O valor não é somente armazenar evolução; é tornar contexto e risco visíveis no ponto de decisão.

**Decisão Hans:** adotar Patient Timeline como conceito central, Alertas Clínicos como objeto explícito e registros finalizados com correção por adendo/retificação, nunca sobrescrita silenciosa.

### 3. Atendimento precisa gerar continuidade
Mercado forte integra atendimento a exames, prescrições, documentos e retorno.

**Decisão Hans:** todo atendimento pode gerar tarefas clínicas futuras: exame, retorno, revisão de resultado ou contato. Acompanhamento deve ter responsável, prazo, estado e motivo.

### 4. Operação e clínica precisam de segregação de acesso
Soluções maduras oferecem permissões por usuário/perfil; plataformas de saúde destacam segurança, certificação e auditoria.

**Decisão Hans:** RBAC como base + regras contextuais para dados clínicos; Recepção não recebe conteúdo clínico detalhado. Acesso ao prontuário gera auditoria.

### 5. Financeiro é consequência do evento assistencial
Soluções maduras associam agenda/atendimento a cobrança, convênio, repasse, contas a receber e análise.

**Decisão Hans:** MVP cobre conta do atendimento, pagador, valor, situação e recebimento. Convênios/TISS, repasses, glosas e DRE entram como evolução arquitetural preparada.

### 6. Interoperabilidade deve nascer preparada
TISS/TUSS é padrão obrigatório nas trocas aplicáveis da saúde suplementar. Sistemas maduros oferecem API e integrações.

**Decisão Hans:** não implementar TISS completo no primeiro backend sem caso de negócio confirmado, mas evitar modelo que impeça inclusão de convênio, guia, TUSS e integrações futuras.

## Matriz de escopo

| Capacidade | MVP | Próxima fase | Motivo |
|---|---|---|---|
| Paciente + dados administrativos | Sim | — | História |
| Médico, CRM/UF, especialidade, agenda | Sim | — | Protótipo + operação |
| Agenda, conflito, confirmação, cancelamento, falta | Sim | — | História |
| Check-in / sala de espera | Sim | — | Benchmark operacional |
| Fila de espera / repescagem simples | Sim | — | Redução de ociosidade |
| Prontuário longitudinal | Sim | — | Problema central |
| Alergias/reação e alertas críticos | Sim | — | Caso Mariana |
| Medicamentos/condições | Sim | — | História |
| Atendimento com rascunho/finalização | Sim | — | Protótipo |
| Exames e resultado | Sim | — | História |
| Retorno/acompanhamento | Sim | — | História |
| Documentos clínicos | Sim | — | Centralização |
| Faturamento particular básico | Sim | — | História/protótipo |
| Convênios e TISS/TUSS | Preparar | Sim | Mercado/regulação |
| Repasse médico | Preparar | Sim | Benchmark |
| Prescrição eletrônica/assinatura digital | Preparar | Sim | Benchmark |
| Telemedicina | Preparar | Sim | Benchmark |
| Estoque | Não | Avaliar | Fora do problema atual |
| Multiunidade | Preparar | Avaliar | Escalabilidade |
| Portal/App do paciente | API-ready | Sim | Engajamento |
| BI avançado | Indicadores básicos | Sim | Evolução |

## Princípios adotados
1. **Patient-centric:** o histórico pertence ao paciente.
2. **Safety-first:** risco clínico vence conveniência de interface.
3. **Event-driven auditability:** eventos importantes deixam rastro.
4. **Least privilege:** acesso mínimo necessário.
5. **Operational continuity:** consulta não termina no botão “finalizar”.
6. **No silent overwrite:** dado clínico assinado/finalizado é versionado por adendo.
7. **API-ready:** novas integrações não devem exigir reescrever domínio central.
8. **Measure what matters:** indicadores nascem de eventos operacionais, não de campos manuais.
