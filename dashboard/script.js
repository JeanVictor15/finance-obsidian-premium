// Finance Obsidian - Dashboard Logic
const SUPABASE_URL = 'https://xyglpcyzqrxtnzgrshqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z2xwY3l6cXJ4dG56Z3JzaHFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczOTQxNDQsImV4cCI6MjA5Mjk3MDE0NH0.WzMnlWe-5TqwcJaa73xl-3uYkkhqBOsfwdGIgiSDctk';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const transactionsList = document.getElementById('transactions-list');
const transactionForm = document.getElementById('transaction-form');
const accountsList = document.getElementById('accounts-list');
const accountForm = document.getElementById('account-form');
const alertsContainer = document.getElementById('alerts-container');
const fixedIncomeForm = document.getElementById('fixed-income-form');
const fixedIncomeList = document.getElementById('fixed-income-list');

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const monthlyBalanceEl = document.getElementById('monthly-balance');

const cancelEditBtn = document.getElementById('cancel-edit');
const cancelAccEditBtn = document.getElementById('cancel-acc-edit');
const formTitle = document.getElementById('form-title');
const accFormTitle = document.getElementById('account-form-title');

const userNameDisplay = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const filterMonth = document.getElementById('filter-month');
const filterYear = document.getElementById('filter-year');

// Navigation & Views
const viewHome = document.getElementById('view-home');
const viewReports = document.getElementById('view-reports');
const viewProjection = document.getElementById('view-projection');

const navHome = document.getElementById('nav-home');
const navReports = document.getElementById('nav-reports');
const navProjection = document.getElementById('nav-projection');

const projCurrentBalanceEl = document.getElementById('proj-current-balance');
const projFutureIncomeEl = document.getElementById('proj-future-income');
const projFutureExpenseEl = document.getElementById('proj-future-expense');
const projFinalBalanceEl = document.getElementById('proj-final-balance');
const projectionList = document.getElementById('projection-list');
const horizonBtns = document.querySelectorAll('.horizon-btn');


// State
let currentUser = null;
let allTransactions = [];
let allAccounts = [];
let allFixedIncomes = [];
let filteredTransactions = [];
let editingId = null;
let editingAccId = null;

// Chart Instances
let chartIncomeExpenses = null;
let chartCategories = null;
let chartBalanceEvolution = null;
let chartHomeEvolution = null;

let currentView = 'home';
let currentHorizon = 30;


async function init() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = '../login/index.html';
        return;
    }

    currentUser = session.user;
    
    // Display Name/Greeting (Premium refinement)
    const fullName = currentUser.user_metadata?.full_name;
    const displayName = fullName ? fullName.split(' ')[0] : currentUser.email.split('@')[0];
    userNameDisplay.textContent = displayName;
    
    // Add a tooltip or hover effect with the full email/name if needed
    userNameDisplay.title = currentUser.email;
    
    // Initialize Filters
    const now = new Date();
    filterMonth.value = String(now.getMonth() + 1).padStart(2, '0');
    setupYearFilter(now.getFullYear());
    
    document.getElementById('trans-date').valueAsDate = now;
    document.getElementById('acc-date').valueAsDate = now;
    
    refreshData();
    document.getElementById('dashboard').classList.remove('hidden');

    // Listen for auth changes
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!session) window.location.href = '../login/index.html';
    });

    // Filter Events
    filterMonth.addEventListener('change', updateFilteredData);
    filterYear.addEventListener('change', updateFilteredData);
    document.getElementById('filter-category').addEventListener('change', updateFilteredData);

    // Nav Events
    navHome.addEventListener('click', () => switchView('home'));
    navReports.addEventListener('click', () => switchView('reports'));
    navProjection.addEventListener('click', () => switchView('projection'));

    // Horizon Events
    horizonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            horizonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHorizon = parseInt(btn.dataset.days);
            updateProjection();
        });
    });

    // Form Submissions
    transactionForm.addEventListener('submit', handleTransactionSubmit);
    accountForm.addEventListener('submit', handleAccountSubmit);
    fixedIncomeForm.addEventListener('submit', handleFixedIncomeSubmit);

    // Cancel Buttons
    cancelEditBtn.addEventListener('click', resetForm);
    cancelAccEditBtn.addEventListener('click', resetAccountForm);

    logoutBtn.addEventListener('click', handleLogout);

    // Currency Masking
    ['trans-value', 'acc-value', 'fixed-value'].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener('input', e => formatCurrencyInput(e.target));
    });
}

function formatCurrencyInput(input) {
    let value = input.value.replace(/\D/g, '');
    value = (value / 100).toFixed(2) + '';
    value = value.replace(".", ",");
    value = value.replace(/(\d)(\?=(\d{3})+(?!\d))/g, "$1.");
    input.value = "R$ " + value;
}

function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
}

// Phase 8 - Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '🔔'}</span>
        <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4s
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}


function setupYearFilter(currentYear) {
    filterYear.innerHTML = '';
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) option.selected = true;
        filterYear.appendChild(option);
    }
}

async function refreshData() {
    await Promise.all([
        loadDashboardData(), 
        loadAccountsData(),
        loadFixedIncomesData()
    ]);
    updateAlerts(); // Ensure alerts consider the latest accounts and fixed incomes
}

async function loadDashboardData() {
    const { data, error } = await supabaseClient
        .from('movimentacoes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('data', { ascending: false });

    if (error) {
        console.error('Error loading transactions:', error);
        return;
    }

    allTransactions = data;
    updateFilteredData();
}

async function loadAccountsData() {
    const { data, error } = await supabaseClient
        .from('contas')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('vencimento', { ascending: true });

    if (error) {
        console.error('Error loading accounts:', error);
        return;
    }

    allAccounts = data;
    renderAccounts();
}
    
async function loadFixedIncomesData() {
    const { data, error } = await supabaseClient
        .from('receitas_fixas')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('dia_recebimento', { ascending: true });

    if (error) {
        console.error('Error loading fixed incomes:', error);
        return;
    }

    allFixedIncomes = data;
    renderFixedIncomes();
}

function updateFilteredData() {
    const selectedMonth = filterMonth.value;
    const selectedYear = filterYear.value;
    const selectedCategory = document.getElementById('filter-category').value;

    filteredTransactions = allTransactions.filter(t => {
        const [year, month] = t.data.split('-');
        const dateMatch = year === selectedYear && month === selectedMonth;
        const categoryMatch = selectedCategory === 'all' || t.categoria === selectedCategory;
        return dateMatch && categoryMatch;
    });

    renderTransactions();
    calculateSummary();
    updateCategoryLists();
    
    // Phase 9: Smart chart update
    if (currentView === 'reports') {
        updateCharts();
    } else if (currentView === 'home') {
        renderHomeEvolutionChart();
    }
}

function updateCategoryLists() {
    const categories = new Set();
    allTransactions.forEach(t => categories.add(t.categoria));
    allAccounts.forEach(a => categories.add(a.categoria));

    // Update Datalist for forms
    const datalist = document.getElementById('category-suggestions');
    datalist.innerHTML = Array.from(categories).map(cat => `<option value="${cat}">`).join('');

    // Update Report Filter Select (preserving "all")
    const categoryFilter = document.getElementById('filter-category');
    const currentValue = categoryFilter.value;
    
    let options = '<option value="all">Todas as Categorias</option>';
    Array.from(categories).sort().forEach(cat => {
        options += `<option value="${cat}" ${cat === currentValue ? 'selected' : ''}>${cat}</option>`;
    });
    categoryFilter.innerHTML = options;
}

function switchView(view) {
    currentView = view;
    
    // Toggle active state on buttons
    navHome.classList.toggle('active', view === 'home');
    navReports.classList.toggle('active', view === 'reports');
    navProjection.classList.toggle('active', view === 'projection');
    
    // Toggle view containers
    viewHome.classList.toggle('hidden', view !== 'home');
    viewReports.classList.toggle('hidden', view !== 'reports');
    viewProjection.classList.toggle('hidden', view !== 'projection');

    if (view === 'reports') {
        setTimeout(updateCharts, 50); // Small delay to allow DOM/dimensions update
    } else if (view === 'home') {
        setTimeout(renderHomeEvolutionChart, 50);
    } else if (view === 'projection') {
        updateProjection();
    }
}


function renderTransactions() {
    if (filteredTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma movimentação encontrada para este período.</p>
                <small>Cadastre uma nova movimentação à esquerda.</small>
            </div>
        `;
        return;
    }

    transactionsList.innerHTML = filteredTransactions.map(t => `
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
    if (allAccounts.length === 0) {
        accountsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma conta agendada.</p>
                <small>Cadastre contas a pagar no formulário abaixo.</small>
            </div>
        `;
        return;
    }

    accountsList.innerHTML = allAccounts.map(a => `
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
    if (allFixedIncomes.length === 0) {
        fixedIncomeList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma receita fixa cadastrada.</p>
                <small>Cadastre seus rendimentos mensais à esquerda.</small>
            </div>
        `;
        return;
    }

    fixedIncomeList.innerHTML = allFixedIncomes.map(f => `
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
    const totalBalance = allTransactions.reduce((acc, t) => {
        return t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor);
    }, 0);

    const monthlyIncome = filteredTransactions
        .filter(t => t.tipo === 'entrada')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    const monthlyExpense = filteredTransactions
        .filter(t => t.tipo === 'saida')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;

    totalBalanceEl.textContent = formatCurrency(totalBalance);
    totalBalanceEl.style.color = totalBalance >= 0 ? 'var(--primary)' : 'var(--error)';

    totalIncomeEl.textContent = formatCurrency(monthlyIncome);
    totalExpensesEl.textContent = formatCurrency(monthlyExpense);
    
    monthlyBalanceEl.textContent = formatCurrency(monthlyBalance);
    monthlyBalanceEl.style.color = monthlyBalance >= 0 ? '#3b82f6' : 'var(--error)';
}

function updateAlerts() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    const alerts = [];

    // 1. Check Accounts (Today, Soon, Overdue)
    allAccounts.forEach(a => {
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

    // 2. Check Fixed Incomes (Predicted for next 7 days) - Phase 8 New
    allFixedIncomes.forEach(f => {
        if (!f.ativo) return;
        
        let checkDate = new Date(today);
        for (let i = 0; i <= 7; i++) {
            if (checkDate.getDate() === f.dia_recebimento) {
                alerts.push({ type: 'vencendo', msg: `Receita <strong>"${f.nome}"</strong> prevista para dia ${f.dia_recebimento} (${formatCurrency(f.valor)})` });
                break; // Only alert once for the next occurrence
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
    });

    const notifCenter = document.getElementById('notification-center');
    if (alerts.length > 0) {
        notifCenter.classList.remove('hidden');
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.type}">
                <span class="alert-icon">✦</span>
                <span class="alert-text">${alert.msg}</span>
            </div>
        `).join('');
    } else {
        notifCenter.classList.add('hidden');
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const transactionData = {
        user_id: currentUser.id,
        tipo: document.getElementById('trans-type').value,
        valor: parseCurrency(document.getElementById('trans-value').value),
        descricao: document.getElementById('trans-desc').value,
        categoria: document.getElementById('trans-cat').value,
        data: document.getElementById('trans-date').value,
        observacao: document.getElementById('trans-obs').value
    };

    let result;
    if (editingId) {
        result = await supabaseClient.from('movimentacoes').update(transactionData).eq('id', editingId);
    } else {
        result = await supabaseClient.from('movimentacoes').insert([transactionData]);
    }

    if (result.error) {
        showToast('Erro ao salvar: ' + result.error.message, 'error');
    } else {
        showToast(editingId ? 'Movimentação atualizada!' : 'Movimentação cadastrada com sucesso!');
        resetForm();
        loadDashboardData();
    }
}

async function handleAccountSubmit(e) {
    e.preventDefault();
    const accountData = {
        user_id: currentUser.id,
        nome: document.getElementById('acc-name').value,
        valor: parseCurrency(document.getElementById('acc-value').value),
        vencimento: document.getElementById('acc-date').value,
        categoria: document.getElementById('acc-cat').value,
        status: 'pendente'
    };

    let result;
    if (editingAccId) {
        result = await supabaseClient.from('contas').update(accountData).eq('id', editingAccId);
    } else {
        result = await supabaseClient.from('contas').insert([accountData]);
    }

    if (result.error) {
        showToast('Erro ao salvar conta: ' + result.error.message, 'error');
    } else {
        showToast(editingAccId ? 'Conta atualizada!' : 'Conta agendada com sucesso!');
        resetAccountForm();
        loadAccountsData();
    }
}

async function handleFixedIncomeSubmit(e) {
    e.preventDefault();
    const fixedData = {
        user_id: currentUser.id,
        nome: document.getElementById('fixed-name').value,
        valor: parseCurrency(document.getElementById('fixed-value').value),
        dia_recebimento: parseInt(document.getElementById('fixed-day').value),
        ativo: true
    };

    const { error } = await supabaseClient.from('receitas_fixas').insert([fixedData]);

    if (error) {
        showToast('Erro ao cadastrar receita: ' + error.message, 'error');
    } else {
        showToast('Receita fixa cadastrada!');
        fixedIncomeForm.reset();
        loadFixedIncomesData();
    }
}

window.markAsPaid = async function(id) {
    const acc = allAccounts.find(a => a.id === id);
    if (!acc) return;

    if (!confirm(`Confirmar pagamento de "${acc.nome}"? Isso gerará uma movimentação de saída.`)) return;

    // 1. Mark account as paid
    const { error: accError } = await supabaseClient
        .from('contas')
        .update({ status: 'paga' })
        .eq('id', id);

    if (accError) {
        alert('Erro ao atualizar conta: ' + accError.message);
        return;
    }

    // 2. Create transaction
    const { error: transError } = await supabaseClient
        .from('movimentacoes')
        .insert([{
            user_id: currentUser.id,
            tipo: 'saida',
            valor: acc.valor,
            descricao: `PAGAMENTO: ${acc.nome}`,
            categoria: acc.categoria,
            data: new Date().toISOString().split('T')[0],
            observacao: 'Gerado automaticamente via Contas a Pagar'
        }]);

    if (transError) {
        showToast('Erro ao criar movimentação: ' + transError.message, 'error');
    } else {
        showToast('Pagamento confirmado com sucesso!');
    }

    refreshData();
}

window.deleteTransaction = async function(id) {
    if (!confirm('Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabaseClient.from('movimentacoes').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Movimentação excluída.');
        loadDashboardData();
    }
}

window.editTransaction = function(id) {
    const t = allTransactions.find(item => item.id === id);
    if (!t) return;
    editingId = id;
    formTitle.textContent = 'Editar Movimentação';
    document.getElementById('trans-type').value = t.tipo;
    
    // Apply formatting to the value field for consistent UX
    const valueInput = document.getElementById('trans-value');
    valueInput.value = (t.valor * 100).toString(); // Set raw cents
    formatCurrencyInput(valueInput); // Format to R$ mask
    
    document.getElementById('trans-desc').value = t.descricao;
    document.getElementById('trans-cat').value = t.categoria;
    document.getElementById('trans-date').value = t.data;
    document.getElementById('trans-obs').value = t.observacao || '';
    cancelEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.editAccount = function(id) {
    const a = allAccounts.find(item => item.id === id);
    if (!a) return;
    editingAccId = id;
    accFormTitle.textContent = 'Editar Conta';
    document.getElementById('acc-name').value = a.nome;
    
    // Apply formatting to the value field for consistent UX
    const valueInput = document.getElementById('acc-value');
    valueInput.value = (a.valor * 100).toString(); // Set raw cents
    formatCurrencyInput(valueInput); // Format to R$ mask
    
    document.getElementById('acc-date').value = a.vencimento;
    document.getElementById('acc-cat').value = a.categoria;
    cancelAccEditBtn.classList.remove('hidden');
    window.scrollTo({ top: 400, behavior: 'smooth' });
}

window.deleteAccount = async function(id) {
    if (!confirm('Deseja excluir este agendamento de conta?')) return;
    const { error } = await supabaseClient.from('contas').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
    } else {
        showToast('Conta excluída.');
        loadAccountsData();
    }
}

window.deleteFixedIncome = async function(id) {
    if (!confirm('Remover esta receita fixa da sua lista mensal?')) return;
    const { error } = await supabaseClient.from('receitas_fixas').delete().eq('id', id);
    if (error) {
        showToast('Erro ao remover: ' + error.message, 'error');
    } else {
        showToast('Receita fixa removida.');
        loadFixedIncomesData();
    }
}

function resetForm() {
    editingId = null;
    formTitle.textContent = 'Nova Movimentação';
    transactionForm.reset();
    document.getElementById('trans-date').valueAsDate = new Date();
    cancelEditBtn.classList.add('hidden');
}

function resetAccountForm() {
    editingAccId = null;
    accFormTitle.textContent = 'Nova Conta a Vencer';
    accountForm.reset();
    document.getElementById('acc-date').valueAsDate = new Date();
    cancelAccEditBtn.classList.add('hidden');
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = '../login/index.html';
}

function formatCurrency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
function formatDate(dateStr) { 
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-'); 
    return `${day}/${month}/${year}`; 
}

// Chart.js Logic (Fase 6)
function updateCharts() {
    // Only render reports charts if in reports view
    if (currentView !== 'reports') return;

    renderIncomeExpensesChart();
    renderCategoriesChart();
    renderBalanceEvolutionChart();
}

function renderHomeEvolutionChart() {
    const canvas = document.getElementById('chart-home-evolution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const selectedMonth = filterMonth.value;
    const selectedYear = filterYear.value;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    const dailyBalances = new Array(daysInMonth).fill(0);
    const initialBalance = allTransactions
        .filter(t => {
            const [y, m] = t.data.split('-');
            return (Number(y) < Number(selectedYear)) || (Number(y) === Number(selectedYear) && Number(m) < Number(selectedMonth));
        })
        .reduce((acc, t) => t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor), 0);

    let runningBalance = initialBalance;
    const labels = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${selectedMonth}-${String(day).padStart(2, '0')}`;
        const dayTransactions = filteredTransactions.filter(t => t.data === dateStr);
        dayTransactions.forEach(t => {
            runningBalance += (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor));
        });
        dailyBalances[day-1] = runningBalance;
        labels.push(day);
    }

    if (chartHomeEvolution) chartHomeEvolution.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 242, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 242, 255, 0)');

    chartHomeEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo',
                data: dailyBalances,
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
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(13, 20, 30, 0.9)',
                    titleColor: '#00F2FF',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Saldo: R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { 
                        color: '#94a3b8',
                        callback: function(value) { return 'R$ ' + value.toLocaleString('pt-BR'); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest',
            }
        }
    });
}

function renderIncomeExpensesChart() {
    const canvas = document.getElementById('chart-income-expenses');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const income = filteredTransactions
        .filter(t => t.tipo === 'entrada')
        .reduce((acc, t) => acc + Number(t.valor), 0);
    
    const expense = filteredTransactions
        .filter(t => t.tipo === 'saida')
        .reduce((acc, t) => acc + Number(t.valor), 0);

    if (chartIncomeExpenses) chartIncomeExpenses.destroy();

    chartIncomeExpenses = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['#10b981', '#f43f5e'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderCategoriesChart() {
    const canvas = document.getElementById('chart-categories');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const expensesByCategory = filteredTransactions
        .filter(t => t.tipo === 'saida')
        .reduce((acc, t) => {
            acc[t.categoria] = (acc[t.categoria] || 0) + Number(t.valor);
            return acc;
        }, {});

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    if (chartCategories) chartCategories.destroy();

    const colors = [
        '#10b981', '#3b82f6', '#f59e0b', '#f43f5e', 
        '#06b6d4', '#84cc16', '#ec4899', '#6366f1'
    ];

    chartCategories = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', padding: 20 }
                }
            },
            cutout: '70%'
        }
    });
}

function renderBalanceEvolutionChart() {
    const canvas = document.getElementById('chart-balance-evolution');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const selectedMonth = filterMonth.value;
    const selectedYear = filterYear.value;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    
    const dailyBalances = new Array(daysInMonth).fill(0);
    
    // Calculate initial balance (all transactions before this month)
    const initialBalance = allTransactions
        .filter(t => {
            const [y, m] = t.data.split('-');
            return (Number(y) < Number(selectedYear)) || (Number(y) === Number(selectedYear) && Number(m) < Number(selectedMonth));
        })
        .reduce((acc, t) => t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor), 0);

    let runningBalance = initialBalance;
    const labels = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${selectedMonth}-${String(day).padStart(2, '0')}`;
        const dayTransactions = filteredTransactions.filter(t => t.data === dateStr);
        
        dayTransactions.forEach(t => {
            runningBalance += (t.tipo === 'entrada' ? Number(t.valor) : -Number(t.valor));
        });
        
        dailyBalances[day-1] = runningBalance;
        labels.push(day);
    }

    if (chartBalanceEvolution) chartBalanceEvolution.destroy();

    chartBalanceEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo Acumulado',
                data: dailyBalances,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

// Projection Logic (Fase 7)
function updateProjection() {
    const horizon = currentHorizon;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + horizon);

    const currentBalance = allTransactions.reduce((acc, t) => {
        return t.tipo === 'entrada' ? acc + Number(t.valor) : acc - Number(t.valor);
    }, 0);

    let projectedIncome = 0;
    let projectedExpense = 0;
    const projectionItems = [];

    // 1. Process Fixed Incomes
    allFixedIncomes.forEach(f => {
        if (!f.ativo) return;
        
        // Find occurrences of this day within the horizon
        let checkDate = new Date(today);
        for (let i = 0; i <= horizon; i++) {
            if (checkDate.getDate() === f.dia_recebimento) {
                projectedIncome += Number(f.valor);
                projectionItems.push({
                    nome: f.nome,
                    valor: f.valor,
                    data: new Date(checkDate),
                    tipo: 'entrada',
                    icon: '💎'
                });
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }
    });

    // 2. Process Pending Accounts
    allAccounts.forEach(a => {
        if (a.status === 'paga') return;
        
        const vencimento = new Date(a.vencimento + 'T00:00:00');
        if (vencimento <= endDate) {
            projectedExpense += Number(a.valor);
            projectionItems.push({
                nome: a.nome,
                valor: a.valor,
                data: vencimento,
                tipo: 'saida',
                icon: '🕒'
            });
        }
    });

    // Sort items by date
    projectionItems.sort((a, b) => a.data - b.data);

    // Render Summary
    projCurrentBalanceEl.textContent = formatCurrency(currentBalance);
    projFutureIncomeEl.textContent = formatCurrency(projectedIncome);
    projFutureExpenseEl.textContent = formatCurrency(projectedExpense);
    
    const finalBalance = currentBalance + projectedIncome - projectedExpense;
    projFinalBalanceEl.textContent = formatCurrency(finalBalance);
    projFinalBalanceEl.style.color = finalBalance >= 0 ? 'var(--primary)' : 'var(--error)';

    // Render List
    if (projectionItems.length === 0) {
        projectionList.innerHTML = '<p class="empty-state">Nenhum evento previsto para este período.</p>';
    } else {
        projectionList.innerHTML = projectionItems.map(item => `
            <div class="transaction-item projection-item ${item.tipo}">
                <div class="item-icon ${item.tipo}">${item.icon}</div>
                <div class="item-info">
                    <h4>${item.nome}</h4>
                    <p>Previsto para: ${formatDate(item.data.toISOString().split('T')[0])}</p>
                </div>
                <div class="item-value ${item.tipo}">
                    ${item.tipo === 'entrada' ? '+' : '-'} ${formatCurrency(item.valor)}
                </div>
            </div>
        `).join('');
    }
}

// App Initialization
init();

