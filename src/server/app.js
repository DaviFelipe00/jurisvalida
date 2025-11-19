const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const os = require('os');
const controller = require('./controller');

function createServer() {
    const app = express();
    
    // Configurações
    app.use(cors());
    app.use(express.json());

    // Configuração do Multer (Arquivos temporários)
    const upload = multer({ dest: path.join(os.tmpdir(), 'jurivalida-uploads') });

    // Rotas
    app.post('/api/analyze', 
        upload.fields([
            { name: 'proposta', maxCount: 1 },
            { name: 'contrato', maxCount: 1 },
            { name: 'cnpj', maxCount: 1 }
        ]), 
        controller.analyzeDocuments
    );

    app.get('/health', (req, res) => res.send('OK'));

    return app;
}

module.exports = createServer;