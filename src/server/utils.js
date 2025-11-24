const fs = require('fs').promises;
const mammoth = require('mammoth');
let pdfParse = require('pdf-parse');

// Garantir função correta em qualquer ambiente
pdfParse = pdfParse?.default ?? pdfParse;

async function extractText(filePath, mimeType) {
    console.log("[extractText] File:", filePath);
    console.log("[extractText] MIME:", mimeType);

    try {
        const buffer = await fs.readFile(filePath);
        console.log("[extractText] File loaded, size:", buffer.length);

        if (mimeType === 'application/pdf') {
            console.log("[extractText] Processing PDF...");

            try {
                if (typeof pdfParse !== "function") {
                    console.error("[extractText] pdfParse is NOT a function!", pdfParse);
                }

                const data = await pdfParse(buffer);

                console.log("[extractText] PDF parsed successfully");
                return data.text || "";
            } catch (pdfError) {
                console.error("Error reading PDF:", pdfError.stack || pdfError.message);
                return "";
            }
        }

        if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log("[extractText] Processing DOCX...");

            try {
                const result = await mammoth.extractRawText({ buffer });
                console.log("[extractText] DOCX parsed successfully");
                return result.value || "";
            } catch (docxError) {
                console.error("Error reading DOCX:", docxError.stack || docxError.message);
                return "";
            }
        }

        if (mimeType === 'text/plain' || mimeType === 'application/json') {
            console.log("[extractText] Processing TEXT/JSON...");
            return buffer.toString('utf-8');
        }

        console.warn(`[UTILS] Unsupported MIME type: ${mimeType}`);
        return "";

    } catch (error) {
        console.error(`General extraction error (${filePath}):`, error.stack || error.message);
        return ""; 
    }
}

module.exports = { extractText };
