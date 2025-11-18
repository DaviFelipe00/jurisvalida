const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// --- IMPORT AUTH SERVICE ---
// Como está na mesma pasta (src/main), usamos ./
const { registerAuthHandlers } = require('./authService');

// --- VARIÁVEIS GLOBAIS ---
let loginWindow;
let mainWindow;

// --- DEFINIÇÃO DE CAMINHOS ---
const userDataPath = app.getPath('userData');
const dbFolderPath = path.join(userDataPath, 'database');
const attachmentsFolderPath = path.join(userDataPath, 'attachments');
const settingsFilePath = path.join(dbFolderPath, 'settings.json');

// --- DETECTA AMBIENTE DE DESENVOLVIMENTO ---
function isDevelopment() {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

// --- BLOQUEIA DEVTOOLS ---
function blockDevTools(window) {
    if (!isDevelopment()) {
        window.setMenu(null);
        window.webContents.on('devtools-opened', () => {
            window.webContents.closeDevTools();
        });
        window.webContents.on('before-input-event', (event, input) => {
            if (
                input.key === 'F12' ||
                (input.control && input.shift && input.key === 'I') ||
                (input.control && input.shift && input.key === 'J') ||
                (input.control && input.shift && input.key === 'C')
            ) {
                event.preventDefault();
            }
        });
    }
}

async function ensureDataFoldersExist() {
    try {
        await fs.mkdir(dbFolderPath, { recursive: true });
        await fs.mkdir(attachmentsFolderPath, { recursive: true });
        console.log('Pastas de dados verificadas em:', userDataPath);
    } catch (error) {
        console.error('Erro ao criar pastas:', error);
    }
}

// --- JANELA DE LOGIN ---
const createLoginWindow = () => {
    loginWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        minWidth: 1000,
        minHeight: 600,
        center: true,
        resizable: true,
        maximizable: true,
        autoHideMenuBar: true,
        backgroundColor: '#0a3c74',
        webPreferences: {
            // CAMINHO CORRIGIDO: Sobe para src (..), entra em preload
            preload: path.join(__dirname, '../preload/loginPreload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDevelopment() 
        },
    });

    // CAMINHO CORRIGIDO: Sobe para src (..), entra em login
    loginWindow.loadFile(path.join(__dirname, '../login/login.html'));

    blockDevTools(loginWindow);

    loginWindow.once('ready-to-show', () => {
        loginWindow.show();
    });

    loginWindow.on('closed', () => {
        loginWindow = null;
    });
};

// --- JANELA PRINCIPAL ---
const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true, 
        webPreferences: {
            // CAMINHO CORRIGIDO: Sobe para src (..), entra em preload
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDevelopment() 
        }
    });

    // CAMINHO CORRIGIDO: Sobe para src (..), entra em renderer/windows
    // IMPORTANTE: Certifique-se de renomear a pasta 'windowns' para 'windows'
    mainWindow.loadFile(path.join(__dirname, '../renderer/windows/index.html'));

    blockDevTools(mainWindow);

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};

app.whenReady().then(async () => {
    await ensureDataFoldersExist();

    if (!isDevelopment()) {
        Menu.setApplicationMenu(null);
    }

    // --- HANDLERS DE DADOS (IPC) ---
    
    ipcMain.handle('load-data', async () => {
        try {
            const fileContent = await fs.readFile(settingsFilePath, 'utf-8');
            return JSON.parse(fileContent);
        } catch (error) {
            return {};
        }
    });

    ipcMain.handle('save-data', async (event, dataToSave) => {
        try {
            let currentData = {};
            try {
                const fileContent = await fs.readFile(settingsFilePath, 'utf-8');
                currentData = JSON.parse(fileContent);
            } catch (error) {
                // Arquivo não existe, normal.
            }
            const newData = { ...currentData, ...dataToSave };
            await fs.writeFile(settingsFilePath, JSON.stringify(newData, null, 2));
            return { success: true };
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('save-attachment', async (event, { name, buffer }) => {
        try {
            const uniqueName = `${Date.now()}-${name}`;
            const filePath = path.join(attachmentsFolderPath, uniqueName);
            await fs.writeFile(filePath, buffer);
            return { success: true, path: filePath, name: name }; 
        } catch (error) {
            console.error('Erro ao salvar anexo:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const buffer = await fs.readFile(filePath);
            return new Uint8Array(buffer);
        } catch (error) {
            console.error(`Erro ao ler arquivo: ${filePath}`, error);
            return null;
        }
    });

    ipcMain.handle('save-file-dialog', async (event, options) => {
        const { filePath } = await dialog.showSaveDialog(options);
        return filePath;
    });

    ipcMain.handle('save-buffer', async (event, filePath, buffer) => {
        try {
            await fs.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            console.error('Erro ao salvar buffer:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('open-data-folder', () => {
        shell.openPath(userDataPath);
    });

    // --- REGISTRA HANDLERS DE LOGIN ---
    registerAuthHandlers({
        ipcMain,
        getLoginWindow: () => loginWindow,
        createMainWindow: createMainWindow
    });

    // --- INICIALIZAÇÃO ---
    createLoginWindow();

    app.on('activate', () => {
        if (!loginWindow && !mainWindow) {
            createLoginWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});