/**
 * Finance Obsidian - Chart Service
 * Handles all Chart.js configurations and rendering
 */

let charts = {
    incomeExpenses: null,
    categories: null,
    balanceEvolution: null,
    homeEvolution: null
};

export const chartService = {
    /**
     * Renders the home view evolution chart
     */
    renderHomeEvolution(canvasId, labels, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (charts.homeEvolution) charts.homeEvolution.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 242, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');

        charts.homeEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo',
                    data: data,
                    borderColor: '#00F2FF',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#00F2FF',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2
                }]
            },
            options: chartOptions.line('Saldo', (val) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
        });
    },

    renderIncomeExpenses(canvasId, labels, incomeData, expenseData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (charts.incomeExpenses) charts.incomeExpenses.destroy();

        charts.incomeExpenses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Entradas',
                        data: incomeData,
                        backgroundColor: 'rgba(0, 242, 255, 0.6)',
                        borderColor: '#00F2FF',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Saídas',
                        data: expenseData,
                        backgroundColor: 'rgba(255, 61, 113, 0.6)',
                        borderColor: '#FF3D71',
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            options: chartOptions.bar()
        });
    },

    renderCategories(canvasId, labels, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (charts.categories) charts.categories.destroy();

        charts.categories = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#00F2FF', '#FF3D71', '#3b82f6', '#10b981', '#f59e0b', 
                        '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#64748b'
                    ],
                    borderWidth: 0,
                    hoverOffset: 20
                }]
            },
            options: chartOptions.doughnut()
        });
    },

    renderBalanceEvolution(canvasId, labels, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (charts.balanceEvolution) charts.balanceEvolution.destroy();

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        charts.balanceEvolution = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Acumulado',
                    data: data,
                    borderColor: '#3b82f6',
                    borderWidth: 3,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: chartOptions.line('Saldo Acumulado', (val) => 'R$ ' + val.toLocaleString('pt-BR'))
        });
    }
};

const chartOptions = {
    line: (label, formatter) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(13, 20, 30, 0.9)',
                titleColor: '#00F2FF',
                padding: 12,
                callbacks: { label: (context) => `${label}: ${formatter(context.parsed.y)}` }
            }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', callback: (value) => 'R$ ' + value.toLocaleString('pt-BR') }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    }),
    bar: () => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
            tooltip: { backgroundColor: 'rgba(13, 20, 30, 0.9)', padding: 12 }
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', callback: (value) => 'R$ ' + value.toLocaleString('pt-BR') }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    }),
    doughnut: () => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#94a3b8', padding: 20, font: { family: 'Inter', size: 12 } }
            }
        }
    })
};
