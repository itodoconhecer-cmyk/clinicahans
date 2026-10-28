export const weeklySeries = [
  { key: 'records', label: 'Consultas', color: '#506bca' },
  { key: 'cancelled', label: 'Cancelamentos', color: '#a35a13' },
  { key: 'noShows', label: 'Faltas', color: '#a33b59' }
];

export function weeklyChart(type) {
  const name = type === 'line' ? 'Evolução semanal em linhas' : 'Comparativo semanal em colunas';
  return `<article class="panel weekly-chart"><h3>${name}</h3><p class="muted-copy">Quantidade por semana · início na segunda-feira</p><div class="weekly-chart-container" data-weekly-chart="${type}"></div></article>`;
}

export function mountWeeklyCharts(target, weeks) {
  const Highcharts = window.Highcharts;
  const containers = target.querySelectorAll('[data-weekly-chart]');
  if (!Highcharts?.chart) {
    containers.forEach(container => { container.textContent = 'Não foi possível carregar os gráficos. Consulte os valores na tabela abaixo.'; });
    return () => {};
  }
  const charts = [];
  try {
    containers.forEach(container => {
      const type = container.dataset.weeklyChart;
      charts.push(Highcharts.chart(container, {
        chart: { type, animation: false, height: 340, backgroundColor: 'transparent', style: { fontFamily: 'inherit' } },
        title: { text: null },
        lang: { decimalPoint: ',', thousandsSep: '.', accessibility: {
          chartContainerLabel: '{title}. Gráfico interativo.',
          defaultChartTitle: type === 'line' ? 'Evolução semanal em linhas' : 'Comparativo semanal em colunas',
          legend: { legendItem: 'Mostrar ou ocultar {itemName}' }
        } },
        accessibility: { enabled: true, description: 'Consultas incluem todos os agendamentos. Cancelamentos e faltas fazem parte desse total. Valores também disponíveis na tabela semanal abaixo.' },
        xAxis: { categories: weeks.map(week => week.label), crosshair: true,
          title: { text: 'Início da semana' }, lineColor: '#dbe3ff', tickLength: 0 },
        yAxis: { min: 0, allowDecimals: false, title: { text: 'Quantidade' }, gridLineColor: '#dbe3ff' },
        tooltip: { shared: true, headerFormat: '<span>Semana de {point.key}</span><br/>', valueDecimals: 0 },
        legend: { itemStyle: { color: '#18264f', fontWeight: '500' } },
        plotOptions: { series: { animation: false }, column: { borderRadius: 3, borderWidth: 0 },
          line: { lineWidth: 3, marker: { enabled: true, radius: 4 } } },
        series: weeklySeries.map((series, index) => ({ name: series.label, color: series.color,
          data: weeks.map(week => week[series.key]),
          ...(type === 'line' ? { dashStyle: ['Solid', 'Dash', 'ShortDot'][index], marker: { symbol: ['circle', 'diamond', 'square'][index] } } : {})
        })),
        responsive: { rules: [{ condition: { maxWidth: 400 }, chartOptions: { chart: { height: 320 },
          legend: { itemStyle: { fontSize: '11px' } }, yAxis: { title: { text: null } } } }] }
      }));
    });
  } catch {
    charts.forEach(chart => chart.destroy());
    containers.forEach(container => { container.textContent = 'Não foi possível desenhar os gráficos. Consulte os valores na tabela abaixo.'; });
    return () => {};
  }
  return () => charts.forEach(chart => chart.destroy());
}
