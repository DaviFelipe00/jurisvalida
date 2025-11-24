const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractText } = require('./utils');
const fs = require('fs').promises;

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

exports.analyzeDocuments = async (req, res) => {
    // Variável para garantir limpeza dos arquivos mesmo em caso de erro
    const uploadedFiles = []; 

    try {
        const { apiKey } = req.body;
        const files = req.files;

        if (files) {
            Object.values(files).flat().forEach(f => uploadedFiles.push(f));
        }

        if (!apiKey) return res.status(400).json({ error: "API Key não fornecida." });
        if (!files || !files['proposta'] || !files['contrato']) {
            return res.status(400).json({ error: "Arquivos obrigatórios (Proposta e Contrato) faltando." });
        }

        // 1. Extração de Texto (Backend)
        console.log("Iniciando extração de texto...");
        const propostaText = await extractText(files['proposta'][0].path, files['proposta'][0].mimetype);
        const contratoText = await extractText(files['contrato'][0].path, files['contrato'][0].mimetype);
        let cnpjText = null;

        if (files['cnpj']) {
            cnpjText = await extractText(files['cnpj'][0].path, files['cnpj'][0].mimetype);
        }

        // 2. Chamada Gemini (Backend)
        console.log("Iniciando chamada ao Gemini...");
        const genAI = new GoogleGenerativeAI(apiKey);
        
        // CORREÇÃO: Usando 'gemini-1.5-flash-latest' para evitar erro 404 de versão
        // Se ainda der erro, tente 'gemini-pro'
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash", 
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
        - IMPORTANTE: Se os textos estiverem vazios ou ilegíveis, retorne campos em branco, não invente dados.
        
        TEXTO_PROPOSTA: """${propostaText}"""
        TEXTO_CONTRATO_SOCIAL: """${contratoText}"""
        `;

        if (cnpjText) prompt += `\nTEXTO_CARTAO_CNPJ: """${cnpjText}"""`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        console.log("Análise concluída com sucesso.");
        res.json(JSON.parse(responseText));

    } catch (error) {
        console.error("Erro no controller analyzeDocuments:", error);
        
        // Melhor tratamento de mensagem de erro
        let errorMsg = error.message;
        if (error.message.includes("404") && error.message.includes("models")) {
            errorMsg = "Modelo de IA não encontrado ou API Key sem permissão. Tente verificar sua chave.";
        }

        res.status(500).json({ error: errorMsg });
    } finally {
        // Limpeza de arquivos temporários no bloco finally para garantir execução
        uploadedFiles.forEach(file => {
            fs.unlink(file.path).catch(err => console.error("Erro ao deletar temp:", err));
        });
    }
};