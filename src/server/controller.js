const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractText } = require('./utils');
const fs = require('fs').promises;

// Schema JSON para o Gemini (o mesmo que você já tinha)
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

exports.analyzeDocuments = async (req, res) => {
    try {
        const { apiKey } = req.body;
        const files = req.files;

        if (!apiKey) return res.status(400).json({ error: "API Key não fornecida." });
        if (!files || !files['proposta'] || !files['contrato']) {
            return res.status(400).json({ error: "Arquivos obrigatórios faltando." });
        }

        // 1. Extração de Texto (Backend)
        const propostaText = await extractText(files['proposta'][0].path, files['proposta'][0].mimetype);
        const contratoText = await extractText(files['contrato'][0].path, files['contrato'][0].mimetype);
        let cnpjText = null;

        if (files['cnpj']) {
            cnpjText = await extractText(files['cnpj'][0].path, files['cnpj'][0].mimetype);
        }

        // 2. Chamada Gemini (Backend)
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", // Modelo estável recomendado
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
        
        // Limpeza de arquivos temporários do upload
        Object.values(files).flat().forEach(file => fs.unlink(file.path).catch(() => {}));

        res.json(JSON.parse(responseText));

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};