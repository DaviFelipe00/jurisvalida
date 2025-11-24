const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractText } = require('./utils');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const JSZip = require('jszip');

// --- SCHEMA DO GEMINI (Saída Estruturada) ---
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
            items: {
                type: "OBJECT",
                properties: {
                    nome: { type: "STRING" },
                    funcao: { type: "STRING" },
                    rgComOrgaoExpedidor: { type: "STRING" },
                    cpf: { type: "STRING" }
                }
            }
        },
        objetoContrato: { type: "STRING" },
        itensValores: { type: "STRING" },
        itensValoresStructured: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    item: { type: "STRING" },
                    servico: { type: "STRING" },
                    total: { type: "STRING" }
                }
            }
        },
        prazoExecucao: { type: "STRING" },
        observacoesContrato: { type: "STRING" },
    }
};

//
// ───────────────────────────────────────────
//  FUNÇÃO 1 — ANALISAR DOCUMENTOS
// ───────────────────────────────────────────
//
exports.analyzeDocuments = async (req, res) => {
    let uploadedFiles = [];

    try {
        const { apiKey } = req.body;
        const files = req.files;

        if (!apiKey) {
            return res.status(400).json({ error: "Chave da API não fornecida." });
        }

        if (!files || !files.proposta || !files.contrato) {
            return res.status(400).json({ error: "Proposta e Contrato são obrigatórios." });
        }

        Object.values(files).flat().forEach(f => uploadedFiles.push(f));

        console.log('[ANÁLISE] Extraindo texto...');

        const propostaText = await extractText(files.proposta[0].path, files.proposta[0].mimetype);
        const contratoText = await extractText(files.contrato[0].path, files.contrato[0].mimetype);

        let cnpjText = null;
        if (files.cnpj) {
            cnpjText = await extractText(files.cnpj[0].path, files.cnpj[0].mimetype);
        }

        if (!propostaText || propostaText.length < 50)
            return res.status(400).json({ error: "Texto da Proposta muito curto." });

        if (!contratoText || contratoText.length < 50)
            return res.status(400).json({ error: "Texto do Contrato muito curto." });

        console.log('[ANÁLISE] Textos OK');

        // ────────────────────────────────────────────────────────────
        // IA — Gemini 2.0 Flash Experimental (Exp)
        // ────────────────────────────────────────────────────────────
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            // === MODELO PEDIDO ===
            model: "gemini-2.0-flash-exp",

            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        let prompt = `
        Atue como um assistente jurídico sênior.
        Preencha a ficha de qualificação com base nos documentos.

        PRIORIDADE:
        1. Cartão CNPJ = Fonte principal (Razão Social, CNPJ, Endereço).
        2. Contrato Social = Representantes, regras de administração.
        3. Proposta = Objeto, valores, prazo.

        === PROPOSTA ===
        ${propostaText}

        === CONTRATO_SOCIAL ===
        ${contratoText}
        `;

        if (cnpjText) {
            prompt += `\n=== CARTAO_CNPJ ===\n${cnpjText}`;
        }

        let result;
        try {
            result = await model.generateContent(prompt);
        } catch (err) {
            console.error("[ERRO GEMINI]", err);
            return res.status(500).json({ error: "Erro API Gemini: " + err.message });
        }

        const responseText = result.response.text();
        let parsed;

        try {
            parsed = JSON.parse(responseText);
        } catch (err) {
            console.error("[ERRO PARSE]", responseText);
            return res.status(500).json({
                error: "A IA retornou JSON inválido.",
                raw: responseText
            });
        }

        return res.json(parsed);

    } catch (error) {
        console.error("[ERRO CRÍTICO]", error);
        res.status(500).json({ error: error.message });
    } finally {
        console.log('[LIMPEZA] Removendo arquivos...');
        for (const file of uploadedFiles) {
            try { await fs.unlink(file.path); } catch (e) {}
        }
    }
};


//
// ───────────────────────────────────────────
//  FUNÇÃO 2 — GERAR PDF
// ───────────────────────────────────────────
//
exports.generatePDF = async (req, res) => {
    try {
        const data = req.body;

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers = [];

        doc.on("data", d => buffers.push(d));
        doc.on("end", () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            const safe = (data.razaoSocial || 'Empresa').replace(/[^a-z0-9]/gi, '_');
            res.setHeader('Content-Disposition', `attachment; filename="Ficha_${safe}.pdf"`);
            res.send(pdfData);
        });

        const addField = (label, value) => {
            if (!value) return;
            if (doc.y > 700) doc.addPage();

            doc.font("Helvetica-Bold").text(label + ": ", { continued: true });
            doc.font("Helvetica").text(value);
            doc.moveDown(0.5);
        };

        doc.fontSize(16).font("Helvetica-Bold")
            .text("Ficha de Qualificação e Contratação", { align: "center" });
        doc.moveDown(1.5);

        doc.fontSize(12).font("Helvetica-Bold").text("Dados da Empresa");
        doc.moveDown(0.5);
        addField("Razão Social", data.razaoSocial);
        addField("CNPJ", data.cnpj);
        addField("Endereço", data.endereco);

        doc.moveDown();

        doc.fontSize(12).font("Helvetica-Bold").text("Representantes Legais");
        doc.moveDown(0.5);

        if (Array.isArray(data.representantes) && data.representantes.length > 0) {
            data.representantes.forEach((rep, i) => {
                doc.font("Helvetica-Bold").text(`Representante ${i + 1}`);
                doc.font("Helvetica").text(`Nome: ${rep.nome || ""}`);
                doc.text(`Função: ${rep.funcao || ""}`);
                doc.text(`CPF: ${rep.cpf || ""}`);
                doc.text(`RG: ${rep.rgComOrgaoExpedidor || ""}`);
                doc.moveDown();
            });
        } else {
            doc.font("Helvetica-Oblique").text("Nenhum representante listado.");
        }

        doc.moveDown();
        doc.fontSize(12).font("Helvetica-Bold").text("Dados da Contratação");
        doc.moveDown(0.5);
        addField("Objeto", data.objetoContrato);
        addField("Valor Global", data.itensValores);
        addField("Prazo", data.prazoExecucao);
        addField("Observações", data.observacoesContrato);

        doc.end();

    } catch (error) {
        console.error("[ERRO PDF]", error);
        res.status(500).json({ error: "Erro ao gerar PDF: " + error.message });
    }
};


//
// ───────────────────────────────────────────
//  FUNÇÃO 3 — GERAR EXCEL
// ───────────────────────────────────────────
//
exports.generateExcel = async (req, res) => {
    try {
        const data = req.body;
        const wb = XLSX.utils.book_new();

        const ws_data = [
            ['FICHA DE CONTRATAÇÃO'],
            [''],
            ['DADOS DA EMPRESA'],
            ['Razão Social', data.razaoSocial || ''],
            ['CNPJ', data.cnpj || ''],
            ['Endereço', data.endereco || ''],
            [''],
            ['DADOS DO CONTRATO'],
            ['Objeto', data.objetoContrato || ''],
            ['Valor', data.itensValores || ''],
            ['Prazo', data.prazoExecucao || ''],
            [''],
            ['REPRESENTANTES'],
            ['Nome', 'Função', 'CPF', 'RG']
        ];

        if (Array.isArray(data.representantes)) {
            data.representantes.forEach(r => {
                ws_data.push([
                    r.nome || '',
                    r.funcao || '',
                    r.cpf || '',
                    r.rgComOrgaoExpedidor || ''
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        XLSX.utils.book_append_sheet(wb, ws, "Ficha");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error("[ERRO EXCEL]", error);
        res.status(500).json({ error: "Erro ao gerar Excel." });
    }
};


//
// ───────────────────────────────────────────
//  FUNÇÃO 4 — GERAR ZIP
// ───────────────────────────────────────────
//
exports.generateZip = async (req, res) => {
    try {
        const { filePaths } = req.body;

        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        const zip = new JSZip();
        let success = 0;

        for (const fp of filePaths) {
            try {
                const normalized = path.normalize(decodeURIComponent(fp));

                if (normalized.includes("..")) continue;

                await fs.access(normalized);
                const file = await fs.readFile(normalized);
                zip.file(path.basename(normalized), file);
                success++;
            } catch (err) {
                console.warn(`[ZIP] Erro ao ler ${fp}`);
            }
        }

        if (success === 0) {
            return res.status(404).json({ error: "Nenhum arquivo válido." });
        }

        const output = await zip.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        res.setHeader('Content-Type', 'application/zip');
        res.send(output);

    } catch (error) {
        console.error("[ERRO ZIP]", error);
        res.status(500).json({ error: "Erro ao gerar ZIP: " + error.message });
    }
};
