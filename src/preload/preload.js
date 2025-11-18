const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadData: () => ipcRenderer.invoke('load-data'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    
    // Comunicação para salvar e ler arquivos
    saveFile: (options) => ipcRenderer.invoke('save-file-dialog', options),
    saveBuffer: (filePath, buffer) => ipcRenderer.invoke('save-buffer', filePath, buffer),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // Handlers para anexos
    saveAttachment: (attachment) => ipcRenderer.invoke('save-attachment', attachment),

    // Novo: Handler para abrir a pasta de dados
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
});

