/**
 * Finance Obsidian - Dashboard Main
 * Modularized version - Orchestrates API, UI and Charts
 */

import { api } from '../../js/api.js';
import { 
    formatCurrency, 
    formatDate, 
    formatCurrencyInput, 
    parseCurrency, 
    showToast 
} from '../../js/utils.js';
import { chartService } from '../../js/charts.js';

// DOM Elements
const elements = {
    transactionsList: document.getElementById('transactions-list'),
    transactionForm: document.getElementById('transaction-form'),
    accountsList: document.getElementById('accounts-list'),
    accountForm: document.getElementById('account-form'),
    alertsContainer: document.getElementById('alerts-container'),
    fixedIncomeForm: document.getElementById('fixed-income-form'),
    fixedIncomeList: document.getElementById('fixed-income-list'),
    totalBalanceEl: document.getElementById('total-balance'),
    totalIncomeEl: document.getElementById('total-income'),
    totalExpensesEl: document.getElementById('total-expenses'),
    monthlyBalanceEl: document.getElementById('monthly-balance'),
    cancelEditBtn: document.getElementById('cancel-edit'),
    cancelAccEditBtn: document.getElementById('cancel-acc-edit'),
    formTitle: document.getElementById('form-title'),
    accFormTitle: document.getElementById('account-form-title'),
    userNameDisplay: document.getElementById('user-name'),
    logoutBtn: document.getElementById('logout-btn'),
    filterMonth: document.getElementById('filter-month'),
    filterYear: document.getElementById('filter-year'),
    filterCategory: document.getElementById('filter-category'),
    navHome: document.getElementById('nav-home'),
    navReports: document.getElementById('nav-reports'),
    navProjection: document.getElementById('nav-projection'),
    viewHome: document.getElementById('view-home'),
    viewReports: document.getElementById('view-reports'),
    viewProjection: document.getElementById('view-projection'),
    projCurrentBalanceEl: document.getElementById('proj-current-balance'),
    projFutureIncomeEl: document.getElementById('proj-future-income'),
    projFutureExpenseEl: document.getElementById('proj-future-expense'),
    projFinalBalanceEl: document.getElementById('proj-final-balance'),
    projectionList: document.getElementById('projection-list'),
    horizonBtns: document.querySelectorAll('.horizon-btn'),
    categorySuggestions: document.getElementById('category-suggestions'),
    notificationCenter: document.getElementById('notification-center')
};

// State
let state = {
    currentUser: null,
    allTransactions: [],
    allAccounts: [],
    allFixedIncomes: [],
    filteredTransactions: [],
    editingId: null,
    editingAccId: null,
    currentView: 'home',
    currentHorizon: 30
};

// --- Initialization ---

async function init() {
    const { data: { session } } = await api.auth.getSession();
    
    if (!session) {
        window.location.href = '../login/index.html';
        return;
    }

    state.currentUser = session.user;
    
    // Display Name/Greeting
    const fullName = state.currentUser.user_metadata?.full_name;
    const displayName = fullName ? fullName.split(' ')[0] : state.currentUser.email.split('@')[0];
    elements.userNameDisplay.textContent = displayName;
    elements.userNameDisplay.title = state.currentUser.email;
    
    // Initialize Filters
    const now = new Date();
    elements.filterMonth.value = String(now.getMonth() + 1).padStart(2, '0');
    setupYearFilter(now.getFullYear());
    
    document.getElementById('trans-date').valueAsDate = now;
    document.getElementById('acc-date').valueAsDate = now;
    
    await refreshData();
    document.getElementById('dashboard').classList.remove('hidden');

    // Listen for auth changes
    api.auth.onAuthStateChange((_event, session) => {
        if (!session) window.location.href = '../login/index.html';
    });

    setupEventListeners();
}

function setupEventListeners() {
    elements.filterMonth.addEventListener('change', updateFilteredData);
    elements.filterYear.addEventListener('change', updateFilteredData);
    elements.filterCategory.addEventListener('change', updateFilteredData);

    elements.navHome.addEventListener('click', () => switchView('home'));
    elements.navReports.addEventListener('click', () => switchView('reports'));
    elements.navProjection.addEventListener('click', () => switchView('projection'));

    elements.horizonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.horizonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentHorizon = parseInt(btn.dataset.days);
            updateProjection();
        });
    });

    elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
    elements.accountForm.addEventListener('submit', handleAccountSubmit);
    elements.fixedIncomeForm.addEventListener('submit', handleFixedIncomeSubmit);

    elements.cancelEditBtn.addEventListener('click', resetForm);
    elements.cancelAccEditBtn.addEventListener('click', resetAccountForm);
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Currency Masking
    ['trans-value', 'acc-value', 'fixed-value'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', e => formatCurrencyInput(e.target));
    });
}

function setupYearFilter(currentYear) {
    elements.filterYear.innerHTML = '';
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        elements.filterYear.appendChild(option);
    }
}

// --- Data Operations ---

async function refreshData() {
    await Promise.all([
        loadDashboardData(), 
        loadAccountsData(),
        loadFixedIncomesData()
    ]);
    updateAlerts();
}

async function loadDashboardData() {
    const { data, error } = await api.transactions.getAll(state.currentUser.id);
    if (!error) {
        state.allTransactions = data;
        updateFilteredData();
    }
}

async function loadAccountsData() {
    const { data, error } = await api.accounts.getAll(state.currentUser.id);
    if (!error) {
        state.allAccounts = data;
        renderAccounts();
    }
}
    
async function loadFixedIncomesData() {
    const { data, error } = await api.fixedIncomes.getAll(state.currentUser.id);
    if (!error) {
        state.allFixedIncomes = data;
        renderFixedIncomes();
    }
}

function updateFilteredData() {
    const selectedMonth = elements.filterMonth.value;
    const selectedYear = elements.filterYear.value;
    const selectedCategory = elements.filterCategory.value;

    state.filteredTransactions = state.allTransactions.filter(t => {
        const [year, month] = t.data.split('-');
        const dateMatch = year === selectedYear && month === selectedMonth;
        const categoryMatch = selectedCategory === 'all' || t.categoria === selectedCategory;
        return dateMatch && categoryMatch;
    });

    renderTransactions();
    calculateSummary();
    updateCategoryLists();
    
    if (state.currentView === 'reports') {
        updateCharts();
    } else if (state.currentView === 'home') {
        renderHomeEvolutionChart();
    }
}

// --- UI Rendering ---

function switchView(view) {
    state.currentView = view;
    
    elements.navHome.classList.toggle('active', view === 'home');
    elements.navReports.classList.toggle('active', view === 'reports');
    elements.navProjection.classList.toggle('active', view === 'projection');
    
    elements.viewHome.classList.toggle('hidden', view !== 'home');
    elements.viewReports.classList.toggle('hidden', view !== 'reports');
    elements.viewProjection.classList.toggle('hidden', view !== 'projection');

    if (view === 'reports') {
        setTimeout(updateCharts, 50);
    } else if (view === 'home') {
        setTimeout(renderHomeEvolutionChart, 50);
    } else if (view === 'projection') {
        updateProjection();
    }
}

function renderTransactions() {
    if (state.filteredTransactions.length === 0) {
        elements.transactionsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma movimentação encontrada para este período.</p>
                <small>Cadastre uma nova movimentação à esquerda.</small>
            </div>
        `;
        return;
    }

    elements.transactionsList.innerHTML = state.filteredTransactions.map(t => `
        <div class="transaction-item">
            <div class="item-icon ${t.tipo}">
                ${t.tipo === 'entrada' ? '↑' : '↓'}
            </div>
            <div class="item-info">
                <h4>${t.descricao}</h4>
                <p>${t.categoria} • ${formatDate(t.data)}</p>
            </div>
            <div class="item-value ${t.tipo}">
                ${t.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(t.valor)}
            </div>
            <div class="item-actions">
                <button class="action-btn" onclick="editTransaction(${t.id})">Editar</button>
                <button class="action-btn delete" onclick="deleteTransaction(${t.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

function renderAccounts() {
    if (state.allAccounts.length === 0) {
        elements.accountsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma conta agendada.</p>
                <small>Cadastre contas a pagar no formulário abaixo.</small>
            </div>
        `;
        return;
    }

    elements.accountsList.innerHTML = state.allAccounts.map(a => `
        <div class="transaction-item">
            <div class="item-icon ${a.status}">
                🕒
            </div>
            <div class="item-info">
                <h4>${a.nome}</h4>
                <p>${a.categoria} • Vence em: ${formatDate(a.vencimento)}</p>
                <span class="status-badge ${a.status}">${a.status}</span>
            </div>
            <div class="item-value">
                ${formatCurrency(a.valor)}
            </div>
            <div class="item-actions">
                ${a.status === 'pendente' || a.status === 'atrasada' ? 
                    `<button class="action-btn pay" onclick="markAsPaid(${a.id})">Pagar</button>` : ''}
                <button class="action-btn" onclick="editAccount(${a.id})">Editar</button>
                <button class="action-btn delete" onclick="deleteAccount(${a.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

function renderFixedIncomes() {
    if (state.allFixedIncomes.length === 0) {
        elements.fixedIncomeList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma receita fixa cadastrada.</p>
                <small>Cadastre seus rendimentos mensais à esquerda.</small>
            </div>
        `;
        return;
    }

    elements.fixedIncomeList.innerHTML = state.allFixedIncomes.map(f => `
        <div class="transaction-item">
            <div class="item-icon entrada">
                💎
            </div>
            <div class="item-info">
                <h4>${f.nome}</h4>
                <p>Recebimento: Dia ${f.dia_recebimento}</p>
            </div>
            <div class="item-value entrada">
                ${formatCurrency(f.valor)}
            </div>
            <div class="item-actions">
                <button class="action-btn delete" onclick="deleteFixedIncome(${f.id})">Remover</button>
            </div>
        </div>
    `).join('');
}

function calculateSummary() {
    const totalBalance = state.allTransactions.reduce((acc, t) => {
        return t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor);
    }, 0);

    const monthlyIncome = state.filteredTransactions
        .filter(t => t.tipo === 'entrada')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    const monthlyExpense = state.filteredTransactions
        .filter(t => t.tipo === 'saida')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;

    elements.totalBalanceEl.textContent = formatCurrency(totalBalance);
    elements.totalBalanceEl.style.color = totalBalance >= 0 ? 'var(--primary)' : 'var(--error)';

    elements.totalIncomeEl.textContent = formatCurrency(monthlyIncome);
    elements.totalExpensesEl.textContent = formatCurrency(monthlyExpense);
    
    elements.monthlyBalanceEl.textContent = formatCurrency(monthlyBalance);
    elements.monthlyBalanceEl.style.color = monthlyBalance >= 0 ? '#3b82f6' : 'var(--error)';
}

function updateCategoryLists() {
    const categories = new Set();
    state.allTransactions.forEach(t => categories.add(t.categoria));
    state.allAccounts.forEach(a => categories.add(a.categoria));

    elements.categorySuggestions.innerHTML = Array.from(categories).map(cat => `<option value="${cat}">`).join('');

    const currentValue = elements.filterCategory.value;
    let options = '<option value="all">Todas as Categorias</option>';
    Array.from(categories).sort().forEach(cat => {
        options += `<option value="${cat}" ${cat === currentValue ? 'selected' : ''}>${cat}</option>`;
    });
    elements.filterCategory.innerHTML = options;
}

function updateAlerts() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const alerts = [];

    state.allAccounts.forEach(a => {
        if (a.status === 'paga') return;
        const vencimento = new Date(a.vencimento + 'T00:00:00');
        if (vencimento < today) {
            alerts.push({ type: 'atrasada', msg: `Conta <strong>"${a.nome}"</strong> está ATRASADA (Venceu em ${formatDate(a.vencimento)})` });
        } else if (vencimento.getTime() === today.getTime()) {
            alerts.push({ type: 'hoje', msg: `Conta <strong>"${a.nome}"</strong> vence HOJE!` });
        } else if (vencimento <= threeDaysLater) {
            alerts.push({ type: 'vencendo', msg: `Conta <strong>"${a.nome}"</strong> vence em breve (${formatDate(a.vencimento)})` });
        }
    });

    state.allFixedIncomes.forEach(f => {
        if (!f.ativo) return;
        let checkDate = new Date(today);
        for (let i = 0; i <= 7; i++) {
            if (checkDate.getDate() === f.dia_recebimento) {
                alerts.push({ type: 'vencendo', msg: `Receita <strong>"${f.nome}"</strong> prevista para dia ${f.dia_recebimento} (${formatCurrency(f.valor)})` });
                break;
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
    });

    if (alerts.length > 0) {
        elements.notificationCenter.classList.remove('hidden');
        elements.alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-icon">✦</span>
                <span class="alert-text">${alert.msg}</span>
            </div>
        `).join('');
    } else {
        elements.notificationCenter.classList.add('hidden');
    }
}

// --- Chart Rendering Wrappers ---

function renderHomeEvolutionChart() {
    const selectedMonth = elements.filterMonth.value;
    const selectedYear = elements.filterYear.value;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    const initialBalance = state.allTransactions
        .filter(t => {
            const [y, m] = t.data.split('-');
            return (Number(y) < Number(selectedYear)) || (Number(y) === Number(selectedYear) && Number(m) < Number(selectedMonth));
        })
        .reduce((acc, t) => t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor), 0);

    let runningBalance = initialBalance;
    const dailyBalances = [];
    const labels = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${selectedMonth}-${String(day).padStart(2, '0')}`;
        const dayTransactions = state.filteredTransactions.filter(t => t.data === dateStr);
        dayTransactions.forEach(t => {
            runningBalance += (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor));
        });
        dailyBalances.push(runningBalance);
        labels.push(day);
    }

    chartService.renderHomeEvolution('chart-home-evolution', labels, dailyBalances);
}

function updateCharts() {
    if (state.currentView !== 'reports') return;

    // Income vs Expenses Bar Chart
    const labels = ['Entradas', 'Saídas'];
    const income = state.filteredTransactions.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + Number(t.valor), 0);
    const expense = state.filteredTransactions.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + Number(t.valor), 0);
    chartService.renderIncomeExpenses('chart-income-expenses', ['Geral'], [income], [expense]);

    // Categories Pie
    const catTotals = {};
    state.filteredTransactions.filter(t => t.tipo === 'saida').forEach(t => {
        catTotals[t.categoria] = (catTotals[t.categoria] || 0) + Number(t.valor);
    });
    chartService.renderCategories('chart-categories', Object.keys(catTotals), Object.values(catTotals));

    // Balance Evolution (Monthly)
    // For simplicity, reusing home evolution logic or building monthly summary
    renderBalanceEvolutionChart();
}

function renderBalanceEvolutionChart() {
    // Simplified: Show last 6 months
    const labels = [];
    const balances = [];
    // Logic for historical balance...
    chartService.renderBalanceEvolution('chart-balance-evolution', ['Mês Atual'], [state.filteredTransactions.reduce((acc, t) => t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor), 0)]);
}

// --- Projection Logic ---

function updateProjection() {
    const horizon = state.currentHorizon;
    const today = new Date();
    today.setHours(0,0,0,0);
    const limitDate = new Date(today);
    limitDate.setDate(today.getDate() + horizon);

    const currentBalance = state.allTransactions.reduce((acc, t) => t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor), 0);
    
    let futureIncome = 0;
    let futureExpense = 0;
    const events = [];

    // Pending accounts
    state.allAccounts.forEach(a => {
        if (a.status === 'paga') return;
        const venc = new Date(a.vencimento + 'T00:00:00');
        if (venc <= limitDate) {
            futureExpense += Number(a.valor);
            events.push({ name: a.nome, value: a.valor, date: a.vencimento, type: 'expense' });
        }
    });

    // Fixed Incomes (Pro-rated)
    state.allFixedIncomes.forEach(f => {
        let checkDate = new Date(today);
        for (let i = 0; i < horizon; i++) {
            if (checkDate.getDate() === f.dia_recebimento) {
                futureIncome += Number(f.valor);
                events.push({ 
                    name: f.nome, 
                    value: f.valor, 
                    date: checkDate.toISOString().split('T')[0], 
                    type: 'income' 
                });
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
    });

    elements.projCurrentBalanceEl.textContent = formatCurrency(currentBalance);
    elements.projFutureIncomeEl.textContent = formatCurrency(futureIncome);
    elements.projFutureExpenseEl.textContent = formatCurrency(futureExpense);
    
    const finalBalance = currentBalance + futureIncome - futureExpense;
    elements.projFinalBalanceEl.textContent = formatCurrency(finalBalance);
    elements.projFinalBalanceEl.style.color = finalBalance >= 0 ? 'var(--primary)' : 'var(--error)';

    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    elements.projectionList.innerHTML = events.map(e => `
        <div class="transaction-item">
            <div class="item-icon ${e.type === 'income' ? 'entrada' : 'saida'}">
                ${e.type === 'income' ? '↑' : '↓'}
            </div>
            <div class="item-info">
                <h4>${e.name}</h4>
                <p>${formatDate(e.date)}</p>
            </div>
            <div class="item-value ${e.type === 'income' ? 'entrada' : 'saida'}">
                ${e.type === 'income' ? '+' : '-'} ${formatCurrency(e.value)}
            </div>
        </div>
    `).join('') || '<p class="empty-state">Nenhum evento previsto para este período.</p>';
}

// --- Form Handlers ---

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const transactionData = {
        user_id: state.currentUser.id,
        tipo: document.getElementById('trans-type').value,
        valor: parseCurrency(document.getElementById('trans-value').value),
        descricao: document.getElementById('trans-desc').value,
        categoria: document.getElementById('trans-cat').value,
        data: document.getElementById('trans-date').value,
        observacao: document.getElementById('trans-obs').value
    };

    const { error } = await api.transactions.upsert(transactionData, state.editingId);

    if (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
    } else {
        showToast(state.editingId ? 'Movimentação atualizada!' : 'Movimentação cadastrada!');
        resetForm();
        loadDashboardData();
    }
}

async function handleAccountSubmit(e) {
    e.preventDefault();
    const accountData = {
        user_id: state.currentUser.id,
        nome: document.getElementById('acc-name').value,
        valor: parseCurrency(document.getElementById('acc-value').value),
        vencimento: document.getElementById('acc-date').value,
        categoria: document.getElementById('acc-cat').value,
        status: 'pendente'
    };

    const { error } = await api.accounts.upsert(accountData, state.editingAccId);

    if (error) {
        showToast('Erro ao salvar conta: ' + error.message, 'error');
    } else {
        showToast(state.editingAccId ? 'Conta atualizada!' : 'Conta agendada!');
        resetAccountForm();
        loadAccountsData();
    }
}

async function handleFixedIncomeSubmit(e) {
    e.preventDefault();
    const fixedData = {
        user_id: state.currentUser.id,
        nome: document.getElementById('fixed-name').value,
        valor: parseCurrency(document.getElementById('fixed-value').value),
        dia_recebimento: parseInt(document.getElementById('fixed-day').value),
        ativo: true
    };

    const { error } = await api.fixedIncomes.insert(fixedData);

    if (error) {
        showToast('Erro ao cadastrar: ' + error.message, 'error');
    } else {
        showToast('Receita fixa cadastrada!');
        elements.fixedIncomeForm.reset();
        loadFixedIncomesData();
    }
}

// --- Global Actions (attached to window for HTML onclicks) ---

window.markAsPaid = async function(id) {
    const acc = state.allAccounts.find(a => a.id === id);
    if (!acc) return;

    if (!confirm(`Confirmar pagamento de "${acc.nome}"?`)) return;

    const { error: accError } = await api.accounts.markAsPaid(id);
    if (accError) return showToast(accError.message, 'error');

    const { error: transError } = await api.transactions.upsert({
        user_id: state.currentUser.id,
        tipo: 'saida',
        valor: acc.valor,
        descricao: `PAGAMENTO: ${acc.nome}`,
        categoria: acc.categoria,
        data: new Date().toISOString().split('T')[0],
        observacao: 'Gerado automaticamente via Contas a Pagar'
    });

    if (transError) {
        showToast('Erro ao criar movimentação: ' + transError.message, 'error');
    } else {
        showToast('Pagamento confirmado!');
    }

    refreshData();
};

window.deleteTransaction = async function(id) {
    if (!confirm('Excluir esta movimentação?')) return;
    const { error } = await api.transactions.delete(id);
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Movimentação excluída.');
        loadDashboardData();
    }
};

window.editTransaction = function(id) {
    const t = state.allTransactions.find(item => item.id === id);
    if (!t) return;
    state.editingId = id;
    elements.formTitle.textContent = 'Editar Movimentação';
    document.getElementById('trans-type').value = t.tipo;
    const valueInput = document.getElementById('trans-value');
    valueInput.value = (t.valor * 100).toString();
    formatCurrencyInput(valueInput);
    document.getElementById('trans-desc').value = t.descricao;
    document.getElementById('trans-cat').value = t.categoria;
    document.getElementById('trans-date').value = t.data;
    document.getElementById('trans-obs').value = t.observacao || '';
    elements.cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.editAccount = function(id) {
    const a = state.allAccounts.find(item => item.id === id);
    if (!a) return;
    state.editingAccId = id;
    elements.accFormTitle.textContent = 'Editar Conta';
    document.getElementById('acc-name').value = a.nome;
    const valueInput = document.getElementById('acc-value');
    valueInput.value = (a.valor * 100).toString();
    formatCurrencyInput(valueInput);
    document.getElementById('acc-date').value = a.vencimento;
    document.getElementById('acc-cat').value = a.categoria;
    elements.cancelAccEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 400, behavior: 'smooth' });
};

window.deleteAccount = async function(id) {
    if (!confirm('Excluir agendamento?')) return;
    const { error } = await api.accounts.delete(id);
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Conta excluída.');
        loadAccountsData();
    }
};

window.deleteFixedIncome = async function(id) {
    if (!confirm('Remover receita fixa?')) return;
    const { error } = await api.fixedIncomes.delete(id);
    if (error) {
        showToast(error.message, 'error');
    } else {
        showToast('Receita fixa removida.');
        loadFixedIncomesData();
    }
};

function resetForm() {
    state.editingId = null;
    elements.formTitle.textContent = 'Nova Movimentação';
    elements.transactionForm.reset();
    document.getElementById('trans-date').valueAsDate = new Date();
    elements.cancelEditBtn.classList.add('hidden');
}

function resetAccountForm() {
    state.editingAccId = null;
    elements.accFormTitle.textContent = 'Nova Conta a Vencer';
    elements.accountForm.reset();
    document.getElementById('acc-date').valueAsDate = new Date();
    elements.cancelAccEditBtn.classList.add('hidden');
}

async function handleLogout() {
    await api.auth.signOut();
    window.location.href = '../login/index.html';
}

// Start app
init();
