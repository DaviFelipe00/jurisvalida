const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractText } = require('./utils');
const fs = require('fs').promises;
const path = require('path');

// Bibliotecas para geração de arquivos (Certifique-se que instalou: npm install jspdf xlsx jszip)
const { jsPDF } = require('jspdf');
const XLSX = require('xlsx');
const JSZip = require('jszip');

// Schema JSON para o Gemini
const responseSchema = {
    type: "OBJECT",
    properties: {
        servico: { type: "STRING" },
        razaoSocial: { type: "STRING" },
        cnpj: { type: "STRING" },
        endereco: { type: "STRING" },
        regraRepresentacao: { type: "STRING" },
        representantes: { 
            type: "ARRAY", 
            items: { type: "OBJECT", properties: { nome: { type: "STRING" }, funcao: { type: "STRING" }, rgComOrgaoExpedidor: { type: "STRING" }, cpf: { type: "STRING" } } } 
        },
        objetoContrato: { type: "STRING" },
        itensValores: { type: "STRING" },
        itensValoresStructured: { 
            type: "ARRAY", 
            items: { type: "OBJECT", properties: { item: { type: "STRING" }, servico: { type: "STRING" }, total: { type: "STRING" } } } 
        },
        prazoExecucao: { type: "STRING" },
        observacoesContrato: { type: "STRING" },
    }
};

// --- FUNÇÃO 1: ANÁLISE (Essencial para corrigir o erro) ---
exports.analyzeDocuments = async (req, res) => {
    try {
        const { apiKey } = req.body;
        const files = req.files;

        if (!apiKey) return res.status(400).json({ error: "API Key não fornecida." });
        // Verifica se os arquivos essenciais foram enviados
        if (!files || !files['proposta'] || !files['contrato']) {
            return res.status(400).json({ error: "Arquivos obrigatórios faltando (Proposta ou Contrato)." });
        }

        // 1. Extração de Texto
        const propostaText = await extractText(files['proposta'][0].path, files['proposta'][0].mimetype);
        const contratoText = await extractText(files['contrato'][0].path, files['contrato'][0].mimetype);
        let cnpjText = null;

        if (files['cnpj']) {
            cnpjText = await extractText(files['cnpj'][0].path, files['cnpj'][0].mimetype);
        }

        // 2. Chamada Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        let prompt = `
        Analise os textos para preencher um formulário jurídico.
        
        Regras:
        - Se TEXTO_CARTAO_CNPJ existir, use-o para razaoSocial, cnpj e endereco.
        - Caso contrário, use TEXTO_CONTRATO_SOCIAL.
        - TEXTO_PROPOSTA fornece servico, objeto, valores e prazos.
        - Extraia representantes da cláusula de administração do Contrato Social.
        
        TEXTO_PROPOSTA: """${propostaText}"""
        TEXTO_CONTRATO_SOCIAL: """${contratoText}"""
        `;

        if (cnpjText) prompt += `\nTEXTO_CARTAO_CNPJ: """${cnpjText}"""`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Limpeza de arquivos temporários
        Object.values(files).flat().forEach(file => fs.unlink(file.path).catch(() => {}));

        res.json(JSON.parse(responseText));

    } catch (error) {
        console.error("Erro na análise:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- FUNÇÃO 2: GERAR PDF ---
exports.generatePDF = async (req, res) => {
    try {
        const data = req.body;
        // Criação do PDF (necessário jspdf instalado)
        // Nota: jsPDF no Node funciona um pouco diferente do navegador,
        // mas para textos simples como este exemplo, a estrutura básica é compatível.
        // Se der erro de 'window not defined', precisaremos de um polyfill ou usar pdfkit.
        const doc = new jsPDF();
        
        let y = 20;
        const margin = 15;
        
        doc.setFontSize(18);
        doc.text('Ficha de Qualificação e Contratação', 105, y, { align: 'center' });
        y += 15;

        const addField = (label, value) => {
             doc.setFontSize(10);
             doc.setFont('helvetica', 'bold');
             doc.text(`${label}:`, margin, y);
             doc.setFont('helvetica', 'normal');
             
             const splitValue = doc.splitTextToSize(String(value || ''), 130);
             doc.text(splitValue, margin + 50, y);
             y += (splitValue.length * 5) + 2;
             
             if (y > 280) { doc.addPage(); y = 20; }
        };

        addField('Razão Social', data.razaoSocial);
        addField('CNPJ', data.cnpj);
        addField('Endereço', data.endereco);
        addField('Objeto', data.objetoContrato);
        addField('Valor', data.itensValores);

        const pdfOutput = doc.output('arraybuffer');
        const buffer = Buffer.from(pdfOutput);

        res.setHeader('Content-Type', 'application/pdf');
        res.send(buffer);

    } catch (error) {
        console.error("Erro PDF:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- FUNÇÃO 3: GERAR EXCEL ---
exports.generateExcel = async (req, res) => {
    try {
        const data = req.body;
        const wb = XLSX.utils.book_new();
        
        const ws_data = [
            ['TIPO DE INSTRUMENTO', 'NÚMERO', 'CONTRATADA', 'OBRA', 'OBJETO'],
            [data.tipoInstrumento, data.numeroInstrumento, data.nomeContratada, data.obra, data.objetoContrato],
            [],
            ['ITEM', 'SERVIÇOS', 'VALOR TOTAL']
        ];

        if (data.itens && Array.isArray(data.itens)) {
            data.itens.forEach(item => {
                ws_data.push([item.item, item.servico, item.total]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, 'Ficha');

        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error("Erro Excel:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- FUNÇÃO 4: GERAR ZIP ---
exports.generateZip = async (req, res) => {
    try {
        const { filePaths } = req.body; 
        
        if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
            return res.status(400).json({ error: "Nenhum arquivo fornecido" });
        }

        const zip = new JSZip();

        for (const filePath of filePaths) {
            try {
                const fileName = path.basename(filePath);
                await fs.access(filePath); // Verifica se existe
                const fileContent = await fs.readFile(filePath);
                zip.file(fileName, fileContent);
            } catch (err) {
                console.warn(`Erro ao ler arquivo para ZIP: ${filePath}`, err.message);
            }
        }

        const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
        
        res.setHeader('Content-Type', 'application/zip');
        res.send(zipContent);

    } catch (error) {
        console.error("Erro ZIP:", error);
        res.status(500).json({ error: error.message });
    }
};