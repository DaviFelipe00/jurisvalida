const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;

async function extractText(filePath, mimeType) {
    try {
        const buffer = await fs.readFile(filePath);

        if (mimeType === 'application/pdf') {
            const data = await pdfParse(buffer);
            let text = data.text;

            // Se houver pouco texto, tenta OCR (lógica similar ao seu front)
            if (text.trim().length < 150) {
                console.log("PDF imagem detectado, iniciando OCR...");
                const { data: { text: ocrText } } = await Tesseract.recognize(buffer, 'por');
                return ocrText;
            }
            return text;
        } 
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') { // DOCX
            const result = await mammoth.extractRawText({ buffer: buffer });
            return result.value;
        } 
        else if (mimeType === 'text/plain') {
            return buffer.toString('utf-8');
        }
        return "";
    } catch (error) {
        console.error("Erro na extração:", error);
        throw new Error(`Falha ao ler arquivo: ${error.message}`);
    }
}

module.exports = { extractText };