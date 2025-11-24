const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const portfinder = require('portfinder'); // Import portfinder

// --- IMPORT AUTH SERVICE ---
const { registerAuthHandlers } = require('./authService');

// --- IMPORT LOCAL SERVER ---
// Assumes you created src/server/app.js as discussed
const createServer = require('../server/app'); 

// --- GLOBAL VARIABLES ---
let loginWindow;
let mainWindow;
let serverInstance; // To store the Express server instance
let apiPort = 3000; // Default port, will be updated by portfinder

// --- PATH DEFINITIONS ---
const userDataPath = app.getPath('userData');
const dbFolderPath = path.join(userDataPath, 'database');
const attachmentsFolderPath = path.join(userDataPath, 'attachments');
const settingsFilePath = path.join(dbFolderPath, 'settings.json');

// --- DETECT DEVELOPMENT ENVIRONMENT ---
function isDevelopment() {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

// --- BLOCK DEVTOOLS ---
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
        console.log('Data folders verified at:', userDataPath);
    } catch (error) {
        console.error('Error creating folders:', error);
    }
}

// --- START EXPRESS SERVER ---
async function startExpressServer() {
    try {
        // Find a free port starting from 3000
        const port = await portfinder.getPortPromise({ port: 3000 });
        const expressApp = createServer();
        
        serverInstance = expressApp.listen(port, () => {
            console.log(`Express Server running locally on port ${port}`);
            apiPort = port; // Store the port to send to Frontend later
        });
    } catch (err) {
        console.error("Critical Error starting Express Server:", err);
    }
}

// --- LOGIN WINDOW ---
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
            preload: path.join(__dirname, '../preload/loginPreload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDevelopment() 
        },
    });

    loginWindow.loadFile(path.join(__dirname, '../login/login.html'));

    blockDevTools(loginWindow);

    loginWindow.once('ready-to-show', () => {
        loginWindow.show();
    });

    loginWindow.on('closed', () => {
        loginWindow = null;
    });
};

// --- MAIN WINDOW ---
const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true, 
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            devTools: isDevelopment() 
        }
    });

    // Load the HTML
    mainWindow.loadFile(path.join(__dirname, '../renderer/windows/index.html'))
        .then(() => {
            // Once loaded, send the API Port to the renderer
            if (mainWindow) {
                console.log(`Sending API Port ${apiPort} to Main Window`);
                mainWindow.webContents.send('set-api-port', apiPort);
            }
        });

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

    // Initialize local server before creating windows
    await startExpressServer();

    if (!isDevelopment()) {
        Menu.setApplicationMenu(null);
    }

    // --- DATA HANDLERS (IPC) ---
    
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
                // File doesn't exist, normal
            }
            const newData = { ...currentData, ...dataToSave };
            await fs.writeFile(settingsFilePath, JSON.stringify(newData, null, 2));
            return { success: true };
        } catch (error) {
            console.error('Error saving data:', error);
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
            console.error('Error saving attachment:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('read-file', async (event, filePath) => {
        try {
            const buffer = await fs.readFile(filePath);
            return new Uint8Array(buffer);
        } catch (error) {
            console.error(`Error reading file: ${filePath}`, error);
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
            console.error('Error saving buffer:', error);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('open-data-folder', () => {
        shell.openPath(userDataPath);
    });

    // CORREÇÃO AQUI: Handler para o frontend pedir a porta da API
    ipcMain.handle('get-api-port', async () => {
        return apiPort;
    });

    // --- REGISTER LOGIN HANDLERS ---
    registerAuthHandlers({
        ipcMain,
        getLoginWindow: () => loginWindow,
        createMainWindow: createMainWindow
    });

    // --- INITIALIZATION ---
    createLoginWindow();

    app.on('activate', () => {
        if (!loginWindow && !mainWindow) {
            createLoginWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    // Close Express server cleanly
    if (serverInstance) {
        serverInstance.close();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});