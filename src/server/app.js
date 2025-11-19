// src/server/app.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const os = require('os');
const controller = require('./controller');

function createServer() {
    const app = express();
    
    // Aumentar o limite do JSON para uploads grandes se necessário
    app.use(express.json({ limit: '50mb' })); 
    app.use(cors());

    const upload = multer({ dest: path.join(os.tmpdir(), 'jurivalida-uploads') });

    // Rota existente
    app.post('/api/analyze', 
        upload.fields([
            { name: 'proposta', maxCount: 1 },
            { name: 'contrato', maxCount: 1 },
            { name: 'cnpj', maxCount: 1 }
        ]), 
        controller.analyzeDocuments
    );

    // --- NOVAS ROTAS ---
    app.post('/api/generate-pdf', controller.generatePDF);
    app.post('/api/generate-excel', controller.generateExcel);
    app.post('/api/generate-zip', controller.generateZip); // Para o ZIP

    app.get('/health', (req, res) => res.send('OK'));

    return app;
}

module.exports = createServer;