document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginButton = document.getElementById('login-btn');
    const errorMessage = document.getElementById('error-message');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // Desabilita o botão para evitar cliques múltiplos
        loginButton.disabled = true;
        loginButton.textContent = 'Entrando...';
        errorMessage.classList.add('hidden');

        // Envia os dados para o processo principal (main.js)
        // A API 'loginAPI' foi exposta pelo 'loginPreload.js'
        window.loginAPI.sendLoginAttempt(username, password);
    });

    // Ouve a resposta do processo principal
    window.loginAPI.onLoginResult((result) => {
        if (result.success) {
            // O main.js cuidará de fechar esta janela e abrir a principal
            console.log('Login bem-sucedido!');
        } else {
            // Mostra a mensagem de erro
            errorMessage.textContent = result.message || 'Usuário ou senha inválidos.';
            errorMessage.classList.remove('hidden');
            
            // Reabilita o botão
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    });
});