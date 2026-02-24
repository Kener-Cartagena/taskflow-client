// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (token) {
        showApp();
        loadInitialData();
    } else {
        showAuth();
    }
});

function showTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const data = await API.login({ username, password });
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        
        showToast('¡Bienvenido de vuelta!', 'success');
        showApp();
        loadInitialData();
    } catch (error) {
        showToast(error.message || 'Error al iniciar sesión', 'error');
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        username: document.getElementById('reg-username').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        password_confirm: document.getElementById('reg-password2').value
    };
    
    try {
        await API.register(data);
        showToast('Cuenta creada exitosamente. Inicia sesión.', 'success');
        showTab('login');
        document.getElementById('register-form').reset();
    } catch (error) {
        showToast(error.message || 'Error al registrar', 'error');
    }
});

function showAuth() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('app-section').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    showAuth();
    showToast('Sesión cerrada', 'success');
}

async function loadUserProfile() {
    try {
        const user = await API.getProfile();
        document.getElementById('username-display').textContent = user.username;
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}