import { showToast } from '../../js/utils.js';

// Finance Obsidian - Login Logic
const { SUPABASE_URL, SUPABASE_KEY } = window.FINANCE_CONFIG;
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const elements = {
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    authTitle: document.getElementById('auth-title'),
    authSubtitle: document.getElementById('auth-subtitle'),
    toggleText: document.getElementById('toggle-text'),
    authMessage: document.getElementById('auth-message')
};

let state = {
    isLoginMode: true
};

/**
 * Check if user is already logged in
 */
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = '../dashboard/index.html';
    }
}

/**
 * Handle user login
 */
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showToast('Entrando...', 'success');

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showToast(error.message, 'error');
        showMessage(error.message, 'error');
    } else {
        window.location.href = '../dashboard/index.html';
    }
}

/**
 * Handle user registration
 */
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        showToast('As senhas não coincidem.', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    showToast('Criando conta...', 'success');

    const { error } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                full_name: name
            }
        }
    });

    if (error) {
        showToast(error.message, 'error');
        showMessage(error.message, 'error');
    } else {
        showToast('Conta criada! Verifique seu e-mail.', 'success');
        elements.signupForm.reset();
        toggleAuthMode();
    }
}

/**
 * Toggle between Login and Signup modes
 */
function toggleAuthMode(e) {
    if (e) e.preventDefault();
    state.isLoginMode = !state.isLoginMode;
    
    elements.authMessage.textContent = '';
    elements.authMessage.className = '';

    if (state.isLoginMode) {
        elements.loginForm.classList.remove('hidden');
        elements.signupForm.classList.add('hidden');
        elements.authTitle.textContent = 'Bem-vindo';
        elements.authSubtitle.textContent = 'Entre na sua conta para continuar';
        elements.toggleText.innerHTML = 'Não tem uma conta? <a href="#" id="show-signup">Cadastre-se</a>';
        document.getElementById('show-signup').addEventListener('click', toggleAuthMode);
    } else {
        elements.loginForm.classList.add('hidden');
        elements.signupForm.classList.remove('hidden');
        elements.authTitle.textContent = 'Criar Conta';
        elements.authSubtitle.textContent = 'Comece sua jornada financeira hoje';
        elements.toggleText.innerHTML = 'Já tem uma conta? <a href="#" id="show-login">Faça Login</a>';
        document.getElementById('show-login').addEventListener('click', toggleAuthMode);
    }
}

/**
 * Show inline message for auth status
 */
function showMessage(msg, type) {
    elements.authMessage.textContent = msg;
    elements.authMessage.className = type === 'error' ? 'error-text' : 'success-text';
}

// Event Listeners
elements.loginForm.addEventListener('submit', handleLogin);
elements.signupForm.addEventListener('submit', handleSignup);
document.getElementById('show-signup').addEventListener('click', toggleAuthMode);

// Initialization
checkSession();
