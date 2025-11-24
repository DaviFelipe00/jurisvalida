const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

async function extractText(filePath, mimeType) {
    try {
        const buffer = await fs.readFile(filePath);

        if (mimeType === 'application/pdf') {
            try {
                const data = await pdfParse(buffer);
                let text = data.text;

                // CORREÇÃO: Removemos a tentativa de OCR em PDF aqui pois o Tesseract
                // não lê PDFs diretamente e converter PDF->Imagem no servidor é complexo.
                // Se o texto for curto, apenas retornamos o que foi possível extrair.
                if (text.trim().length < 50) {
                    console.warn("Aviso: Pouco ou nenhum texto extraído do PDF (pode ser uma imagem digitalizada).");
                    // Opcional: Adicionar um aviso no texto para o Gemini saber
                    return "[ALERTA: Este documento parece ser uma imagem digitalizada e o texto não pôde ser extraído completamente via servidor.] " + text;
                }
                return text;
            } catch (pdfError) {
                console.error("Erro ao processar estrutura do PDF:", pdfError);
                return "";
            }
        } 
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
            const result = await mammoth.extractRawText({ buffer: buffer });
            return result.value;
        } 
        else if (mimeType === 'text/plain') {
            return buffer.toString('utf-8');
        }
        // Suporte a Imagens (JPG/PNG) - Aqui o Tesseract funciona!
        else if (mimeType.startsWith('image/')) {
            console.log("Imagem detectada, iniciando OCR...");
            const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'por');
            return ocrText;
        }

        return "";
    } catch (error) {
        console.error("Erro na extração geral:", error);
        // Não lançar erro para não travar o controller, retornar string vazia
        return ""; 
    }
}

module.exports = { extractText };