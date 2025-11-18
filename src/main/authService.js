/**
 * @fileoverview Serviço de Autenticação
 * Este módulo lida com a lógica de verificação de login usando senhas com hash.
 */

// --- NOVO: Importa o bcrypt ---
const bcrypt = require('bcryptjs');


/**
 * Helper para normalizar strings (lowercase, sem acentos).
 * @param {string} str
 * @returns {string}
 */
const normalizeString = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD") // Decompõe acentos
        .replace(/[\u0300-\u036f]/g, ""); // Remove os caracteres de acento
};

const HASHED_DEFAULT_PASSWORD = '$2b$12$PxFisxGkcstttC0dkazQ.OLkl2KjwHgGW52CTulh9nxuJJ2qVXgR6';

// (O restante da configuração de usuários permanece o mesmo)
const fullNames = [
    "Mariana Ferreira",
    "João Henrique",
    "Amanda Xavier",
    "Júlia Batista",
    "Felipe Oliveira",
    "João Tavares",
    "Camila Palha",
    "Bianca Alonso",
    "Juliana Dutra",
    "Bárbara Maranhão",
    "Genésio Leão",
    "Cecília Soares",
    "Maria Clara",
    "Igor Pessoa",
    "Marcela Silva",
    "Matheus Ribeiro",
    "Katiane Ribeiro"
];

const allowedUsernames = fullNames.map(name => {
    const parts = normalizeString(name).split(' ');
    if (parts.length >= 2) {
        return `${parts[0]}.${parts[parts.length - 1]}`;
    }
    return parts[0];
});

const validUserSet = new Set(allowedUsernames);

console.log("Usuários válidos carregados:", Array.from(validUserSet));


// --- REGISTRO DOS HANDLERS ---

/**
 * Registra os handlers IPC para autenticação.
 * @param {object} options
 * @param {import('electron').IpcMain} options.ipcMain - A instância do ipcMain.
 * @param {() => import('electron').BrowserWindow | null} options.getLoginWindow - Função que retorna a janela de login atual.
 * @param {() => void} options.createMainWindow - Função que cria a janela principal.
 */
function registerAuthHandlers({ ipcMain, getLoginWindow, createMainWindow }) {

    // --- LÓGICA DE LOGIN ATUALIZADA ---
    ipcMain.on('login-attempt', (event, { username, password }) => {
        
        // 1. Normaliza e verifica o usuário
        const normalizedUsername = normalizeString(username);
        const isValidUser = validUserSet.has(normalizedUsername);

        if (!isValidUser) {
            event.sender.send('login-result', { success: false, message: `Usuário "${username}" não encontrado.` });
            return; // Encerra se o usuário não existir
        }

        // 2. Compara a senha (de forma assíncrona para não travar a thread)
        // O bcrypt.compare pega a senha que o usuário digitou (password)
        // e compara com o hash que temos salvo (HASHED_DEFAULT_PASSWORD).
        bcrypt.compare(password, HASHED_DEFAULT_PASSWORD, (err, isMatch) => {
            if (err) {
                // Se der erro no bcrypt, loga e avisa o usuário
                console.error("Erro ao comparar hash no bcrypt:", err);
                event.sender.send('login-result', { success: false, message: "Erro de autenticação. Tente novamente." });
                return;
            }

            if (isMatch) {
                // Sucesso! A senha bate com o hash.
                event.sender.send('login-result', { success: true });
                
                createMainWindow();
                
                const currentLoginWindow = getLoginWindow();
                if (currentLoginWindow) {
                    currentLoginWindow.close();
                }
            } else {
                // Falha! A senha está incorreta.
                event.sender.send('login-result', { success: false, message: "Senha incorreta." });
            }
        });
    });
}

module.exports = {
    registerAuthHandlers
};