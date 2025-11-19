const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadData: () => ipcRenderer.invoke('load-data'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    
    // Communication for saving and reading files
    saveFile: (options) => ipcRenderer.invoke('save-file-dialog', options),
    saveBuffer: (filePath, buffer) => ipcRenderer.invoke('save-buffer', filePath, buffer),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // Handlers for attachments
    saveAttachment: (attachment) => ipcRenderer.invoke('save-attachment', attachment),

    // New: Handler to open data folder
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

    // New: Listener to receive the API Port from Main
    onSetApiPort: (callback) => ipcRenderer.on('set-api-port', (_event, port) => callback(port))
});