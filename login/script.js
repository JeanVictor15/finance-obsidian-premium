// Finance Obsidian - Login Logic
const { SUPABASE_URL, SUPABASE_KEY } = window.FINANCE_CONFIG;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const showSignupLink = document.getElementById('show-signup');
const toggleText = document.getElementById('toggle-text');
const authMessage = document.getElementById('auth-message');

let isLoginMode = true;

// Check if user is already logged in
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = '../dashboard/index.html';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showMessage('Entrando...', 'success');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage(error.message, 'error');
    } else {
        window.location.href = '../dashboard/index.html';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    showMessage('Criando conta...', 'success');

    const { data, error } = await supabaseClient.auth.signUp({ 
        email, 
        password,
        options: {
            data: {
                full_name: name
            }
        }
    });

    if (error) {
        showMessage(error.message, 'error');
    } else {
        showMessage('Conta criada! Verifique seu e-mail para confirmar.', 'success');
        // Clear form
        signupForm.reset();
    }
}

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    isLoginMode = !isLoginMode;
    authMessage.textContent = '';
    authMessage.className = '';

    if (isLoginMode) {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        authTitle.textContent = 'Bem-vindo';
        authSubtitle.textContent = 'Entre na sua conta para continuar';
        toggleText.innerHTML = 'Não tem uma conta? <a href="#" id="show-signup">Cadastre-se</a>';
        document.getElementById('show-signup').addEventListener('click', toggleAuthMode);
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authTitle.textContent = 'Criar Conta';
        authSubtitle.textContent = 'Comece sua jornada financeira hoje';
        toggleText.innerHTML = 'Já tem uma conta? <a href="#" id="show-login">Faça Login</a>';
        document.getElementById('show-login').addEventListener('click', toggleAuthMode);
    }
}

function showMessage(msg, type) {
    authMessage.textContent = msg;
    authMessage.className = type === 'error' ? 'error-text' : 'success-text';
}

loginForm.addEventListener('submit', handleLogin);
signupForm.addEventListener('submit', handleSignup);
showSignupLink.addEventListener('click', toggleAuthMode);

checkSession();
