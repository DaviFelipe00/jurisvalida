const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('loginAPI', {
    // Envia uma tentativa de login para o processo principal
    sendLoginAttempt: (username, password) => {
        ipcRenderer.send('login-attempt', { username, password });
    },
    // Recebe uma resposta (sucesso/falha) do processo principal
    onLoginResult: (callback) => {
        ipcRenderer.on('login-result', (event, args) => callback(args));
    }
});