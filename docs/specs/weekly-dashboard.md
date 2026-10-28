# Dashboard semanal básico

A tela Visão geral apresenta, para Gestão e Administração, o movimento das últimas 8 semanas, com seleção de 4 ou 12 semanas. Recepção e Médico mantêm a agenda existente.

- Consultas: total de agendamentos pela data prevista de início, incluindo todos os estados.
- Cancelamentos: agendamentos atualmente em CANCELLED.
- Faltas: agendamentos atualmente em NO_SHOW.
- Cancelamentos e faltas são subconjuntos de consultas; as três séries não devem ser somadas.
- Semanas começam na segunda-feira em America/Sao_Paulo. A semana atual termina no dia corrente e é identificada como parcial.
- Semanas sem registros são preenchidas com zero. O período inclui o dia corrente inteiro.

Os três totais, o gráfico de linhas, o gráfico de colunas agrupadas e a tabela acessível usam a mesma resposta de `GET /api/v1/management/reports/analysis`, com `type=APPOINTMENTS` e `groupBy=WEEK`. A agregação e a autorização permanecem no backend existente.

Os gráficos usam Highcharts 13.1.1 com módulo de acessibilidade, servidos localmente em `frontend/vendor/highcharts/`. Há tooltips compartilhados, legenda para mostrar/ocultar séries, escala inteira e layout responsivo. As instâncias são destruídas ao trocar de período e sair da página. Se a biblioteca não carregar, os totais e a tabela continuam disponíveis. Não são carregados módulos de exportação nem enviados dados a serviços de gráficos.

O painel mostra carregamento, erro com nova tentativa e vazio. Mudanças rápidas de período descartam respostas antigas. Os metadados ficam em Origem dos dados; o link Analisar consultas mantém período e agrupamento e inicia uma nova execução analítica. O contrato atual admite resumo como pai de análise, portanto o link não envia a execução analítica do dashboard como parentRunId. A partir do relatório, a cadeia análise → origens → registro segue o contrato existente.

Validação: `node frontend/verify-architecture.mjs`, `node --test tests/weekly-dashboard.test.mjs` e `npx playwright test --config tests/playwright/dashboard.config.mjs`.
