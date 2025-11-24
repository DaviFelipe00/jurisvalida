document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorMessage.classList.add('hidden');

        window.loginAPI.sendLoginAttempt(username, password);
    });

    window.loginAPI.onLoginResult((result) => {
        if (result.success) {
            console.log('Login bem-sucedido!');
        } else {
            const errorText = document.getElementById('error-text');
            errorText.textContent = result.message || 'Usuário ou senha inválidos.';
            errorMessage.classList.remove('hidden');
            
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    });
});