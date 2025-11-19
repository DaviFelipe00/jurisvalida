// --- STATE MANAGEMENT ---
const state = {
    files: {
        proposta: null, // Stores the File object
        contrato: null, // Stores the File object
    },
    checklist: {}, // Stores File objects by ID
    checklistItems: [],
    representantes: [],
    selectedRepresentantes: [],
    tiposInstrumento: [],
    obras: [],
    testemunhasContratada: [],
    testemunhasContratante: [],
    itensValoresStructured: [],
};

// --- GLOBAL VARIABLES ---
let apiPort = 3000; // Default port, updated by Main process

// --- UI ELEMENTS ---
const ui = {
    analyzeBtn: document.getElementById('analyze-btn'),
    analyzeBtnText: document.getElementById('analyze-btn-text'),
    analyzeSpinner: document.getElementById('analyze-spinner'),
    errorBanner: document.getElementById('error-banner'),
    errorMessage: document.getElementById('error-message'),
    representanteCheckboxes: document.getElementById('representante-checkboxes'),
    respRepetirCheckbox: document.getElementById('resp-repetir'),
    respRepCheckboxesContainer: document.getElementById('resp-rep-checkboxes-container'),
    respRepCheckboxes: document.getElementById('resp-rep-checkboxes'),
    responsavelFields: document.getElementById('responsavel-fields'),
    checklistContainer: document.getElementById('checklist-container'),
    addChecklistItemBtn: document.getElementById('add-checklist-item-btn'),
    newChecklistItemNameInput: document.getElementById('new-checklist-item-name'),
    toggleDebugBtn: document.getElementById('toggle-debug'),
    debugSection: document.getElementById('debug-section'),
    debugProposta: document.getElementById('debug-proposta'),
    debugContrato: document.getElementById('debug-contrato'),
    debugCnpj: document.getElementById('debug-cnpj'),
    analysisStatus: document.getElementById('analysis-status'),
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    generateExcelBtn: document.getElementById('generate-excel-btn'),
    downloadZipBtn: document.getElementById('download-zip-btn'),
    sendEmailBtn: document.getElementById('send-email-btn'),
    emailModal: document.getElementById('email-modal'),
    emailLink: document.getElementById('email-link'),
    closeEmailModalBtn: document.getElementById('close-email-modal'),
    emailTo: document.getElementById('email-to'),
    emailCc: document.getElementById('email-cc'),
    addTipoInstrumentoBtn: document.getElementById('addTipoInstrumento'),
    deleteTipoInstrumentoBtn: document.getElementById('deleteTipoInstrumento'),
    addObraBtn: document.getElementById('addObra'),
    deleteObraBtn: document.getElementById('deleteObra'),
    addTestemunhaBtn: document.getElementById('add-testemunha-btn'),
    deleteTestemunhaBtn: document.getElementById('delete-testemunha-btn'),
    addTestemunhaBtnContratante: document.getElementById('add-testemunha-btn-contratante'),
    deleteTestemunhaBtnContratante: document.getElementById('delete-testemunha-btn-contratante'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyBtn: document.getElementById('save-api-key-btn'),
    openDataFolderBtn: document.getElementById('open-data-folder-btn'),
};

const formFields = {
    servico: document.getElementById('servico'),
    razaoSocial: document.getElementById('razaoSocial'),
    cnpj: document.getElementById('cnpj'),
    endereco: document.getElementById('endereco'),
    regraRepresentacao: document.getElementById('regraRepresentacao'),
    repNome: document.getElementById('repNome'),
    repFuncao: document.getElementById('repFuncao'),
    repRg: document.getElementById('repRg'),
    repCpf: document.getElementById('repCpf'),
    repEmail: document.getElementById('repEmail'),
    repTelefone: document.getElementById('repTelefone'),
    respNome: document.getElementById('respNome'),
    respTelefone: document.getElementById('respTelefone'),
    respEmail: document.getElementById('respEmail'),
    respCpf: document.getElementById('respCpf'),
    test1Nome: document.getElementById('test1Nome'),
    test1Cpf: document.getElementById('test1Cpf'),
    test1Email: document.getElementById('test1Email'),
    test2Nome: document.getElementById('test2Nome'),
    test2Cpf: document.getElementById('test2Cpf'),
    test2Email: document.getElementById('test2Email'),
    testemunhaSelect: document.getElementById('testemunha-select'),
    testemunhaSelectContratante: document.getElementById('testemunha-select-contratante'),
    tipoInstrumentoSelect: document.getElementById('tipoInstrumento'),
    newTipoInstrumentoInput: document.getElementById('newTipoInstrumento'),
    numeroInstrumento: document.getElementById('numeroInstrumento'),
    obraSelect: document.getElementById('obra'),
    newObraInput: document.getElementById('newObra'),
    nomeContratada: document.getElementById('nomeContratada'),
    objetoContrato: document.getElementById('objetoContrato'),
    itensValores: document.getElementById('itensValores'),
    prazoExecucao: document.getElementById('prazoExecucao'),
    obsContrato: document.getElementById('obsContrato'),
    adiantamentoCheckbox: document.getElementById('adiantamento-checkbox'),
    adiantamentoComment: document.getElementById('adiantamento-comment'),
    faturamentoCheckbox: document.getElementById('faturamento-checkbox'),
    faturamentoComment: document.getElementById('faturamento-comment'),
    permutaCheckbox: document.getElementById('permuta-checkbox'),
    permutaComment: document.getElementById('permuta-comment'),
};

// --- INITIALIZATION ---

function initializeApp() {
    const defaultChecklistItems = [
        "1 – CÓPIA DO CARTÃO DE CNPJ", "2 – CÓPIA DO CARTÃO DE INSCRIÇÃO ESTADUAL", "3 – CÓPIA DO CARTÃO DE INSCRIÇÃO MUNICIPAL (SERVIÇOS)",
        "4 – CÓPIA DO ESTATUTO SOCIAL OU CONTRATO SOCIAL", "5 – DADOS BANCÁRIOS (PESSOA JURÍDICA)", "6 – PROCURAÇÃO COM FIRMA RECONHECIDA DO RESPONSÁVEL*",
        "7 – DOCUMENTOS PESSOAIS DOS SÓCIOS, OU PROCURADOR (CPF E RG)", "8 – CERTIDÃO NEGATIVA DE DÉBITO JUNTO AOS CARTÓRIOS DE PROTESTO",
        "9 – CERTIDÃO NEGATIVA DE FALÊNCIA E CONCORDATA", "10 – CNDT (CERTIDÃO NEGATIVA DE DÉBITOS TRABALHISTAS)",
        "11 – CERTIDÃO DE REGULARIDADE DO FGTS – CRF", "12 – CERTIDÃO NEGATIVA DE DÉBITO JUNTO AO INSS", "13 – CERTIDÃO DE DÉBITOS RELATIVOS A CRÉDITOS TRIBUTÁRIOS FEDERAIS E À DÍVIDA ATIVA DA UNIÃO"
    ];
    state.checklistItems = defaultChecklistItems.map((text, index) => ({ id: index, text: text }));
    renderChecklist();
    loadDataFromLocalFile();
    setupEventListeners();
    
    // Listen for the API port from the Main process
    if (window.electronAPI && window.electronAPI.onSetApiPort) {
        window.electronAPI.onSetApiPort((port) => {
            console.log(`[Renderer] Porta da API definida para: ${port}`);
            apiPort = port;
        });
    }
}

function renderChecklist() {
    ui.checklistContainer.innerHTML = '';
    state.checklistItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'p-3 bg-gray-50 rounded-md border file-list-item';
        li.dataset.id = item.id;
        
        const attachedFile = state.checklist[item.id];
        const fileInfoHTML = attachedFile 
            ? `<span>${attachedFile.name}</span>` 
            : '';

        li.innerHTML = `
            <span class="text-sm text-gray-800 flex-1">${item.text}</span>
            <div class="text-sm text-green-700 mx-2">${fileInfoHTML}</div>
            <label class="bg-white border border-gray-300 text-gray-700 text-xs font-semibold py-1 px-3 rounded-md cursor-pointer hover:bg-gray-100">
                Anexar
                <input type="file" class="hidden" data-id="${item.id}">
            </label>
            <button class="ml-2 trash-icon" data-id="${item.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5Zm-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5ZM4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06Zm6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528ZM8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5Z"/></svg>
            </button>
        `;
        ui.checklistContainer.appendChild(li);
    });
}

function handleAddChecklistItem() {
    const name = ui.newChecklistItemNameInput.value.trim();
    if (name) {
        const newId = state.checklistItems.length > 0 ? Math.max(...state.checklistItems.map(i => i.id)) + 1 : 0;
        state.checklistItems.push({ id: newId, text: name });
        ui.newChecklistItemNameInput.value = '';
        renderChecklist();
    }
}

function handleChecklistEvent(e) {
    const target = e.target;
    if (target.matches('input[type="file"]')) {
        const id = target.dataset.id;
        const file = target.files[0];
        if (file) {
            state.checklist[id] = file;
            renderChecklist(); 
            // Note: Instant CNPJ analysis removed to favor centralized server analysis
        }
    }
    if (target.closest('button.trash-icon')) {
        const id = parseInt(target.closest('button.trash-icon').dataset.id, 10);
        state.checklistItems = state.checklistItems.filter(item => item.id !== id);
        delete state.checklist[id]; 
        renderChecklist();
    }
}


function setupEventListeners() {
    setupUploadArea('proposta');
    setupUploadArea('contrato');
    
    // Main analysis action
    ui.analyzeBtn.addEventListener('click', handleAnalysis);
   
    ui.representanteCheckboxes.addEventListener('change', updateRepresentanteFields);
    ui.respRepetirCheckbox.addEventListener('change', handleRepetirResponsavel);
    ui.respRepCheckboxesContainer.addEventListener('change', updateResponsavelFromSelection);
    ui.toggleDebugBtn.addEventListener('click', () => ui.debugSection.classList.toggle('hidden'));
    ui.generatePdfBtn.addEventListener('click', generatePDF);
    ui.generateExcelBtn.addEventListener('click', generateExcel);
    ui.downloadZipBtn.addEventListener('click', downloadAttachmentsAsZip);
    ui.sendEmailBtn.addEventListener('click', openEmailModal);
    ui.closeEmailModalBtn.addEventListener('click', () => ui.emailModal.classList.add('hidden'));
    
    ui.emailTo.addEventListener('input', updateEmailLink);
    ui.emailCc.addEventListener('input', updateEmailLink);

    ui.addTipoInstrumentoBtn.addEventListener('click', () => addItemToSelect('tiposInstrumento', formFields.newTipoInstrumentoInput, formFields.tipoInstrumentoSelect));
    ui.deleteTipoInstrumentoBtn.addEventListener('click', () => deleteItemFromSelect('tiposInstrumento', formFields.tipoInstrumentoSelect));
    ui.addObraBtn.addEventListener('click', () => addItemToSelect('obras', formFields.newObraInput, formFields.obraSelect));
    ui.deleteObraBtn.addEventListener('click', () => deleteItemFromSelect('obras', formFields.obraSelect));
    
    ui.addTestemunhaBtn.addEventListener('click', () => addTestemunha('contratada'));
    ui.deleteTestemunhaBtn.addEventListener('click', () => deleteTestemunha('contratada'));
    formFields.testemunhaSelect.addEventListener('change', () => selectTestemunha('contratada'));

    ui.addTestemunhaBtnContratante.addEventListener('click', () => addTestemunha('contratante'));
    ui.deleteTestemunhaBtnContratante.addEventListener('click', () => deleteTestemunha('contratante'));
    formFields.testemunhaSelectContratante.addEventListener('change', () => selectTestemunha('contratante'));

    ui.addChecklistItemBtn.addEventListener('click', handleAddChecklistItem);
    ui.checklistContainer.addEventListener('change', handleChecklistEvent);
    ui.checklistContainer.addEventListener('click', handleChecklistEvent);

    formFields.adiantamentoCheckbox.addEventListener('change', (e) => formFields.adiantamentoComment.classList.toggle('hidden', !e.target.checked));
    formFields.faturamentoCheckbox.addEventListener('change', (e) => formFields.faturamentoComment.classList.toggle('hidden', !e.target.checked));
    formFields.permutaCheckbox.addEventListener('change', (e) => formFields.permutaComment.classList.toggle('hidden', !e.target.checked));

    ui.saveApiKeyBtn.addEventListener('click', saveApiKey);
    ui.openDataFolderBtn.addEventListener('click', () => window.electronAPI.openDataFolder());
}

async function loadDataFromLocalFile() {
    const data = await window.electronAPI.loadData();
    if (data) {
        state.tiposInstrumento = data.tiposInstrumento || ['Contrato', 'Aditivo', 'Distrato'];
        state.obras = data.obras || [];
        state.testemunhasContratada = data.testemunhasContratada || [];
        state.testemunhasContratante = data.testemunhasContratante || [];
        if(data.apiKey) {
            ui.apiKeyInput.value = data.apiKey;
        }
    } else {
        state.tiposInstrumento = ['Contrato', 'Aditivo', 'Distrato'];
    }
    
    populateSelect(formFields.tipoInstrumentoSelect, state.tiposInstrumento);
    populateSelect(formFields.obraSelect, state.obras);
    populateTestemunhaSelect('contratada');
    populateTestemunhaSelect('contratante');
}

function populateSelect(selectElement, items) {
    selectElement.innerHTML = '';
    items.forEach(item => {
        selectElement.add(new Option(item, item));
    });
}

async function addItemToSelect(stateKey, inputElement, selectElement) {
    const newItem = inputElement.value.trim();
    if (newItem && !state[stateKey].includes(newItem)) {
        state[stateKey].push(newItem);
        await window.electronAPI.saveData({ [stateKey]: state[stateKey] });
        populateSelect(selectElement, state[stateKey]);
        selectElement.value = newItem;
        inputElement.value = '';
    }
}

async function deleteItemFromSelect(stateKey, selectElement) {
    const selectedValue = selectElement.value;
    if (selectedValue) {
        state[stateKey] = state[stateKey].filter(item => item !== selectedValue);
        await window.electronAPI.saveData({ [stateKey]: state[stateKey] });
        populateSelect(selectElement, state[stateKey]);
    }
}

function populateTestemunhaSelect(type) {
    const select = type === 'contratante' ? formFields.testemunhaSelectContratante : formFields.testemunhaSelect;
    const testemunhas = type === 'contratante' ? state.testemunhasContratante : state.testemunhasContratada;
    select.innerHTML = '<option value="">Selecione uma testemunha salva...</option>';
    testemunhas.forEach(t => {
        select.add(new Option(t.nome, t.id));
    });
}

async function addTestemunha(type) {
    const nomeInput = type === 'contratante' ? formFields.test1Nome : formFields.test2Nome;
    const cpfInput = type === 'contratante' ? formFields.test1Cpf : formFields.test2Cpf;
    const emailInput = type === 'contratante' ? formFields.test1Email : formFields.test2Email;
    const stateKey = type === 'contratante' ? 'testemunhasContratante' : 'testemunhasContratada';
    
    const nome = nomeInput.value.trim();
    const cpf = cpfInput.value.trim();
    const email = emailInput.value.trim();

    if (nome && (cpf || email)) {
        if (state[stateKey].some(t => t.nome === nome && t.cpf === cpf)) {
            return showError(`Esta testemunha (${type}) já está salva.`);
        }
        const newTestemunha = { id: Date.now(), nome, cpf, email };
        state[stateKey].push(newTestemunha);
        await window.electronAPI.saveData({ [stateKey]: state[stateKey] });
        populateTestemunhaSelect(type);
        const select = type === 'contratante' ? formFields.testemunhaSelectContratante : formFields.testemunhaSelect;
        select.value = newTestemunha.id;
    } else {
        showError("Preencha ao menos o nome e o CPF ou e-mail para salvar a testemunha.");
    }
}

async function deleteTestemunha(type) {
    const select = type === 'contratante' ? formFields.testemunhaSelectContratante : formFields.testemunhaSelect;
    const stateKey = type === 'contratante' ? 'testemunhasContratante' : 'testemunhasContratada';
    const idToDelete = Number(select.value);

    if (idToDelete) {
        state[stateKey] = state[stateKey].filter(t => t.id !== idToDelete);
        await window.electronAPI.saveData({ [stateKey]: state[stateKey] });
        populateTestemunhaSelect(type);
        if (type === 'contratante') {
            formFields.test1Nome.value = ''; formFields.test1Cpf.value = ''; formFields.test1Email.value = '';
        } else {
            formFields.test2Nome.value = ''; formFields.test2Cpf.value = ''; formFields.test2Email.value = '';
        }
    }
}

function selectTestemunha(type) {
    const select = type === 'contratante' ? formFields.testemunhaSelectContratante : formFields.testemunhaSelect;
    const testemunhas = type === 'contratante' ? state.testemunhasContratante : state.testemunhasContratada;
    const selectedId = Number(select.value);
    const testemunha = testemunhas.find(t => t.id === selectedId);

    const nomeInput = type === 'contratante' ? formFields.test1Nome : formFields.test2Nome;
    const cpfInput = type === 'contratante' ? formFields.test1Cpf : formFields.test2Cpf;
    const emailInput = type === 'contratante' ? formFields.test1Email : formFields.test2Email;

    if (testemunha) {
        nomeInput.value = testemunha.nome;
        cpfInput.value = testemunha.cpf;
        emailInput.value = testemunha.email;
    } else {
         nomeInput.value = '';
         cpfInput.value = '';
         emailInput.value = '';
    }
}

function setupUploadArea(type) {
    const uploadArea = document.getElementById(`upload-${type}`);
    const fileInput = document.getElementById(`file-${type}`);
    
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0], type));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, e => {
            e.preventDefault(); e.stopPropagation();
            if (['dragenter', 'dragover'].includes(eventName)) uploadArea.classList.add('dragover');
            else uploadArea.classList.remove('dragover');
        }, false);
    });
    uploadArea.addEventListener('drop', (e) => handleFileSelect(e.dataTransfer.files[0], type), false);
}

function handleFileSelect(file, type) {
    if (!file) return;
    state.files[type] = file;
    const infoDiv = document.getElementById(`info-${type}`);
    infoDiv.classList.remove('hidden');
    infoDiv.textContent = `Arquivo: ${file.name}`;
    document.getElementById(`upload-${type}`).classList.add('border-green-500');

    if (state.files.proposta && state.files.contrato) {
        ui.analyzeBtn.disabled = false;
    }
}

// --- CORE ANALYSIS LOGIC (UPDATED FOR BACKEND) ---

async function handleAnalysis() {
    setLoading(true);
    showError(null);
    ui.analysisStatus.textContent = 'Enviando arquivos para o servidor...';

    try {
        const apiKey = ui.apiKeyInput.value.trim();
        if (!apiKey) {
            throw new Error("Chave da API não encontrada. Por favor, insira sua chave da API do Google AI Studio nas Configurações e salve.");
        }

        // Prepare form data to send files to the backend
        const formData = new FormData();
        formData.append('apiKey', apiKey);
        formData.append('proposta', state.files.proposta);
        formData.append('contrato', state.files.contrato);

        // Check for CNPJ Card in checklist items
        const cartaoCnpjItem = state.checklistItems.find(item => item.text.toUpperCase().includes('CARTÃO DE CNPJ'));
        if (cartaoCnpjItem) {
            const cartaoCnpjFile = state.checklist[String(cartaoCnpjItem.id)];
            if (cartaoCnpjFile) {
                 console.log("Incluindo Cartão CNPJ na análise.");
                 formData.append('cnpj', cartaoCnpjFile);
            }
        }

        console.log(`Enviando requisição para http://localhost:${apiPort}/api/analyze`);
        
        // Call the Local Express Server
        const response = await fetch(`http://localhost:${apiPort}/api/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            let errorMsg = `Erro ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch(e) {}
            throw new Error(`Falha no servidor: ${errorMsg}`);
        }

        const data = await response.json();
        console.log("Resposta da análise recebida:", data);

        // Populate form with data received from backend
        populateForm(data);
        
        ui.debugProposta.value = "Texto processado no servidor (Backend).";
        ui.debugContrato.value = "Texto processado no servidor (Backend).";
        ui.debugCnpj.value = "Texto processado no servidor (Backend).";

        ui.analysisStatus.textContent = 'Análise concluída com sucesso!';

    } catch (error) {
        console.error("Erro na Análise:", error);
        showError(error.message);
        ui.analysisStatus.textContent = 'Erro na análise.';
    } finally {
        setLoading(false);
    }
}

function populateForm(data) {
    formFields.servico.value = data.servico || '';
    formFields.razaoSocial.value = data.razaoSocial || '';
    formFields.cnpj.value = (data.cnpj && data.cnpj.toLowerCase() !== 'null') ? data.cnpj : '';
    formFields.endereco.value = data.endereco || '';
    formFields.regraRepresentacao.value = data.regraRepresentacao || 'Não especificada';
    
    formFields.nomeContratada.value = data.razaoSocial || '';
    
    formFields.objetoContrato.value = data.objetoContrato || '';
    formFields.itensValores.value = data.itensValores || '';
    state.itensValoresStructured = data.itensValoresStructured || [];
    formFields.prazoExecucao.value = data.prazoExecucao || '';
    formFields.obsContrato.value = data.observacoesContrato || '';

    state.representantes = data.representantes || [];
    ui.representanteCheckboxes.innerHTML = '';
    if (state.representantes.length > 0) {
        state.representantes.forEach((rep, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `
                <input id="rep-${index}" type="checkbox" value="${index}" class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                <label for="rep-${index}" class="ml-2 block text-sm text-gray-900">${rep.nome}</label>
            `;
            ui.representanteCheckboxes.appendChild(div);
        });
    } else {
         ui.representanteCheckboxes.innerHTML = '<p class="text-xs text-gray-500">Nenhum representante encontrado.</p>';
    }
    updateRepresentanteFields();
}

function updateRepresentanteFields() {
    const selectedCheckboxes = ui.representanteCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    state.selectedRepresentantes = Array.from(selectedCheckboxes).map(cb => state.representantes[cb.value]);

    formFields.repNome.value = state.selectedRepresentantes.map(r => r.nome).join('; ') || '';
    formFields.repFuncao.value = state.selectedRepresentantes.map(r => r.funcao).join('; ') || '';
    formFields.repRg.value = state.selectedRepresentantes.map(r => r.rgComOrgaoExpedidor).join('; ') || '';
    formFields.repCpf.value = state.selectedRepresentantes.map(r => r.cpf).join('; ') || '';
    
    handleRepetirResponsavel();
}

function handleRepetirResponsavel() {
    const isChecked = ui.respRepetirCheckbox.checked;
    
    for (const input of ui.responsavelFields.querySelectorAll('input, textarea')) {
        input.readOnly = isChecked;
        if (isChecked) { input.classList.add('bg-gray-100'); } 
        else { input.classList.remove('bg-gray-100'); }
    }

    ui.respRepCheckboxesContainer.classList.toggle('hidden', !isChecked || state.selectedRepresentantes.length === 0);

    if (isChecked && state.selectedRepresentantes.length > 0) {
        ui.respRepCheckboxes.innerHTML = '';
        state.selectedRepresentantes.forEach((rep, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            div.innerHTML = `
                <input id="resp-rep-check-${index}" type="checkbox" value="${index}" class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                <label for="resp-rep-check-${index}" class="ml-2 block text-sm text-gray-900">${rep.nome}</label>
            `;
            ui.respRepCheckboxes.appendChild(div);
        });
    }
    
    if (!isChecked) {
        clearResponsavelFields();
    }
    updateResponsavelFromSelection();
}

function updateResponsavelFromSelection() {
    if (!ui.respRepetirCheckbox.checked) {
        return;
    }

    const checkedBoxes = ui.respRepCheckboxes.querySelectorAll('input[type="checkbox"]:checked');
    const indices = Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10));

    if (indices.length === 0) {
        clearResponsavelFields();
        return;
    }

    const allEmails = formFields.repEmail.value.split('\n');
    const allTelefones = formFields.repTelefone.value.split('\n');

    const nomes = [];
    const cpfs = [];
    const emails = [];
    const telefones = [];

    indices.forEach(index => {
        const rep = state.selectedRepresentantes[index];
        if (rep) {
            nomes.push(rep.nome);
            cpfs.push(rep.cpf);
            if (allEmails[index]) emails.push(allEmails[index]);
            if (allTelefones[index]) telefones.push(allTelefones[index]);
        }
    });

    formFields.respNome.value = nomes.join('; ');
    formFields.respCpf.value = cpfs.join('; ');
    formFields.respEmail.value = emails.join('\n');
    formFields.respTelefone.value = telefones.join('\n');
}

function clearResponsavelFields() {
     formFields.respNome.value = '';
     formFields.respCpf.value = '';
     formFields.respEmail.value = '';
     formFields.respTelefone.value = '';
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    
    try {
        const titleY = 20; 
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Ficha de Qualificação e Contratação', doc.internal.pageSize.width / 2, titleY, { align: 'center' });
        y = titleY + 15;

        const checkPageBreak = (neededHeight = 10) => {
            if (y + neededHeight > pageHeight - margin) {
                doc.addPage();
                y = 20;
            }
        };

        const addSection = (title) => {
            checkPageBreak(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text(title, margin, y);
            doc.setLineWidth(0.5);
            doc.line(margin, y + 2, doc.internal.pageSize.width - margin, y + 2);
            y += 10;
        };

        const addField = (label, value) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            const labelWidth = doc.getTextWidth(label + ':');
            const valueX = margin + labelWidth + 2;
            const valueMaxWidth = doc.internal.pageSize.width - margin - valueX;

            const splitValue = doc.splitTextToSize(value || 'Não preenchido', valueMaxWidth);
            const fieldHeight = (splitValue.length * 5) + 2;

            checkPageBreak(fieldHeight);
            
            doc.text(label + ':', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(splitValue, valueX, y);
            y += fieldHeight;
        };
        
        addSection('Ficha de Qualificação - Empresa');
        addField('Serviço', formFields.servico.value);
        addField('Razão Social', formFields.razaoSocial.value);
        addField('CNPJ', formFields.cnpj.value);
        addField('Endereço', formFields.endereco.value);
        
        addSection('Ficha de Qualificação - Representantes');
        addField('Regra de Representação', formFields.regraRepresentacao.value);
        addField('Nome(s)', formFields.repNome.value);
        addField('Função(ões)', formFields.repFuncao.value);
        addField('RG(s) / Órgão(s) Exp.', formFields.repRg.value);
        addField('CPF(s)', formFields.repCpf.value);
        addField('E-mail(s)', formFields.repEmail.value);
        addField('Telefone(s)', formFields.repTelefone.value);
        
        addSection('Ficha de Qualificação - Responsável');
        addField('Nome', formFields.respNome.value);
        addField('CPF', formFields.respCpf.value);
        addField('E-mail', formFields.respEmail.value);
        addField('Telefone', formFields.respTelefone.value);
        
        addSection('Ficha de Qualificação - Testemunhas');
        addField('Nome (Contratante)', formFields.test1Nome.value);
        addField('CPF (Contratante)', formFields.test1Cpf.value);
        addField('E-mail (Contratante)', formFields.test1Email.value);
        y += 3;
        addField('Nome (Contratada)', formFields.test2Nome.value);
        addField('CPF (Contratada)', formFields.test2Cpf.value);
        addField('E-mail (Contratada)', formFields.test2Email.value);

        addSection('Ficha de Contratação');
        addField('Tipo de Instrumento', formFields.tipoInstrumentoSelect.value);
        addField('Número do Instrumento', formFields.numeroInstrumento.value);
        addField('Obra', formFields.obraSelect.value);
        addField('Nome da Contratada', formFields.nomeContratada.value);
        addField('Objeto', formFields.objetoContrato.value);
        addField('Itens e Valores', formFields.itensValores.value);
        addField('Prazo de Execução', formFields.prazoExecucao.value);
        
        if (formFields.adiantamentoCheckbox.checked) {
            addField('Adiantamento', 'Sim');
            if (formFields.adiantamentoComment.value) addField('Comentário Adiant.', formFields.adiantamentoComment.value);
        }
        if (formFields.faturamentoCheckbox.checked) {
            addField('Faturamento Direto', 'Sim');
            if (formFields.faturamentoComment.value) addField('Comentário Fatur.', formFields.faturamentoComment.value);
        }
        if (formFields.permutaCheckbox.checked) {
            addField('Permuta', 'Sim');
            if (formFields.permutaComment.value) addField('Comentário Permuta', formFields.permutaComment.value);
        }
        
        addField('Observações Gerais', formFields.obsContrato.value);

        addSection('Checklist de Documentação Contratual');
        for (const item of state.checklistItems) {
            const file = state.checklist[item.id];
            const status = file ? `[X] Anexado: ${file.name}` : '[ ] Não anexado';
            const itemTextMaxWidth = 120;
            const statusXPosition = margin + itemTextMaxWidth + 4;

            const textLines = doc.splitTextToSize(item.text, itemTextMaxWidth);
            const statusLines = doc.splitTextToSize(status, doc.internal.pageSize.width - statusXPosition - margin);

            const textHeight = textLines.length * 4;
            const statusHeight = statusLines.length * 3;
            const itemHeight = Math.max(textHeight, statusHeight) + 3;

            checkPageBreak(itemHeight);

            doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
            doc.text(textLines, margin + 5, y);

            doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
            doc.text(statusLines, statusXPosition, y);
            
            y += itemHeight;
        }
        
        const pdfOutput = doc.output('arraybuffer');
        const buffer = new Uint8Array(pdfOutput);

        const filePath = await window.electronAPI.saveFile({
            title: "Salvar Ficha PDF",
            defaultPath: `Ficha_Completa_${formFields.razaoSocial.value.replace(/ /g,"_") || 'Fornecedor'}.pdf`,
            buttonLabel: "Salvar",
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
        });

        if (filePath) {
            await window.electronAPI.saveBuffer(filePath, buffer);
        }

    } catch (error) {
        showError("Falha crítica ao gerar PDF: " + error.message);
        console.error("PDF Generation failed:", error);
    }
}

async function generateExcel() {
    try {
        const wb = XLSX.utils.book_new();
        const ws_data = [];

        const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFD9EAD3" } }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
        const currencyFormat = '"R$" #,##0.00';

        ws_data.push(['TIPO DE INSTRUMENTO', 'NÚMERO INSTRUMENTO', 'NOME DA CONTRATADA:', 'OBRA:', null, 'OBJETO:']);
        ws_data.push([formFields.tipoInstrumentoSelect.value, formFields.numeroInstrumento.value, formFields.nomeContratada.value, formFields.obraSelect.value, null, formFields.objetoContrato.value]);
        ws_data.push([]); 
        
        ws_data.push(['ITEM', 'SERVIÇOS', null, null, null, '$ TOTAL']);

        let totalGeral = 0;
        const items = state.itensValoresStructured || [];
        if (items.length > 0) {
            items.forEach(item => {
                const valorText = item.total || '0';
                const valor = parseFloat(valorText.replace(/[^0-9,]+/g, "").replace(",", ".")) || 0;
                ws_data.push([item.item, item.servico, null, null, null, valor]);
                totalGeral += valor;
            });
        }
        for(let i = items.length; i < 4; i++) { ws_data.push([]); }

        ws_data.push(['TOTAL GERAL', null, null, null, null, totalGeral]);
        ws_data.push([]);
        
        ws_data.push(['Prazo de execução']);
        ws_data.push(['Início', null, null, 'Comentário:', formFields.prazoExecucao.value]);
        ws_data.push([]);
        
        ws_data.push(['Observações de Contrato:', formFields.obsContrato.value]);
        ws_data.push([]);
        
        ws_data.push(['CONDIÇÕES ESPECIAIS']);
         ws_data.push(['Adiantamento:', formFields.adiantamentoCheckbox.checked ? 'Sim' : 'Não', 'Comentário:', formFields.adiantamentoComment.value]);
         ws_data.push(['Faturamento Direto:', formFields.faturamentoCheckbox.checked ? 'Sim' : 'Não', 'Comentário:', formFields.faturamentoComment.value]);
         ws_data.push(['Permuta:', formFields.permutaCheckbox.checked ? 'Sim' : 'Não', 'Comentário:', formFields.permutaComment.value]);

        const ws = XLSX.utils.aoa_to_sheet(ws_data);

        ws['A1'].s = ws['B1'].s = ws['C1'].s = ws['D1'].s = ws['F1'].s = headerStyle;
        ws['A4'].s = ws['B4'].s = ws['F4'].s = headerStyle;
        
        const totalRow = 8;
        ws[`A${totalRow+1}`].s = ws[`F${totalRow+1}`].s = headerStyle;
        ws[`F${totalRow+1}`].t = 'n';
        ws[`F${totalRow+1}`].z = currencyFormat;

        for(let i = 0; i < items.length; i++){
            const row = 5 + i;
             ws[`F${row}`].t = 'n';
             ws[`F${row}`].z = currencyFormat;
        }

        ws['!merges'] = [
            { s: { r: 1, c: 5 }, e: { r: 1, c: 8 } }, { s: { r: 3, c: 1 }, e: { r: 3, c: 4 } },
            { s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 4 } }, { s: { r: totalRow + 2, c: 0 }, e: { r: totalRow + 2, c: 5 } },
            { s: { r: totalRow + 3, c: 4 }, e: { r: totalRow + 3, c: 8 } }, { s: { r: totalRow + 5, c: 1 }, e: { r: totalRow + 5, c: 8 } },
            { s: { r: totalRow + 7, c: 0 }, e: { r: totalRow + 7, c: 5 } }, { s: { r: totalRow + 8, c: 3 }, e: { r: totalRow + 8, c: 8 } },
            { s: { r: totalRow + 9, c: 3 }, e: { r: totalRow + 9, c: 8 } }, { s: { r: totalRow + 10, c: 3 }, e: { r: totalRow + 10, c: 8 } }, 
        ];
        for(let i=0; i < items.length; i++) {
            ws['!merges'].push({ s: { r: 4 + i, c: 1 }, e: { r: 4 + i, c: 4 } });
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Ficha de Contratacao');
        
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }); 
        const filePath = await window.electronAPI.saveFile({
            title: "Salvar Ficha Excel",
            defaultPath: `Ficha_de_Contratacao_${formFields.nomeContratada.value.replace(/ /g,"_") || 'Fornecedor'}.xlsx`,
            buttonLabel: "Salvar",
            filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
        });

        if (filePath) {
            await window.electronAPI.saveBuffer(filePath, new Uint8Array(buffer)); 
        }
    } catch (error) {
        showError("Falha crítica ao gerar Excel: " + error.message);
        console.error("Excel Generation failed:", error);
    }
}


async function downloadAttachmentsAsZip() {
    const attachedFiles = Object.values(state.checklist);
    if (attachedFiles.length === 0) {
        return showError("Nenhum documento foi anexado no checklist para compactar.");
    }

    setLoading(true);
    ui.analysisStatus.textContent = 'Gerando arquivo .zip...';
    try {
        const zip = new JSZip();
        for (const file of attachedFiles) {
            if (file instanceof File) {
                const content = await file.arrayBuffer(); 
                if (content) {
                    zip.file(file.name, content);
                }
            } else {
                 console.warn(`Item no checklist não é um objeto File: ${file.name}`);
            }
        }

        const zipContent = await zip.generateAsync({ type: 'uint8array' }); 
        
        const filePath = await window.electronAPI.saveFile({
            title: "Salvar Anexos .zip",
            defaultPath: `Anexos_${formFields.razaoSocial.value.replace(/ /g,"_") || 'Fornecedor'}.zip`,
            buttonLabel: "Salvar",
            filters: [{ name: 'Zip Files', extensions: ['zip'] }]
        });
        
        if (filePath) {
            await window.electronAPI.saveBuffer(filePath, zipContent);
        }

    } catch (error) {
        showError("Erro ao gerar o arquivo .zip: " + error.message);
        console.error(error);
    } finally {
        setLoading(false);
    }
}


function openEmailModal() {
    if (!formFields.razaoSocial.value) {
        return showError("Preencha os dados da empresa antes de abrir o modal de e-mail.");
    }
    ui.emailModal.classList.remove('hidden');
    updateEmailLink();
}

function updateEmailLink() {
    try {
        const to = ui.emailTo.value.replace(/[\s\n\r]+/g, ',').trim();
        if (!to) {
            ui.emailLink.setAttribute('data-disabled', 'true');
            ui.emailLink.href = '#';
            return;
        }
        
        const cc = ui.emailCc.value.replace(/[\s\n\r]+/g, ',').trim();
        const subject = `Solicitação de Instrumento: ${formFields.tipoInstrumentoSelect.value} - ${formFields.razaoSocial.value}`;
        let body = `Prezados,\n\nSegue a ficha completa para elaboração de ${formFields.tipoInstrumentoSelect.value} para o fornecedor ${formFields.razaoSocial.value}, referente à obra ${formFields.obraSelect.value}.\n\n`;
        body += `--- DADOS DA CONTRATAÇÃO ---\nObjeto: ${formFields.objetoContrato.value}\n\n`;
        body += `--- DOCUMENTOS ANEXADOS ---\n`;
        const attachedFiles = Object.values(state.checklist);
        if (attachedFiles.length > 0) {
               attachedFiles.forEach(file => { body += `- ${file.name}\n` });
        } else {
            body += `Nenhum documento foi anexado.\n`;
        }
        body += `\n\n--- INSTRUÇÕES ---\nPor favor, anexe a este e-mail o arquivo "Ficha_Completa.pdf", a "Ficha_de_Contratacao.xlsx" e o arquivo ".zip" com os documentos, todos gerados pelo assistente.\n\nAtenciosamente.`;
        
        const params = new URLSearchParams();
        params.append('subject', subject);
        if (cc) params.append('cc', cc);
        params.append('body', body);
        
        ui.emailLink.href = `mailto:${encodeURIComponent(to)}?${params.toString().replace(/\+/g, '%20')}`;
        ui.emailLink.removeAttribute('data-disabled');

    } catch (error) {
         showError("Não foi possível gerar o link de e-mail: " + error.message);
         ui.emailLink.setAttribute('data-disabled', 'true');
         ui.emailLink.href = '#';
    }
}

function setLoading(isLoading) {
    ui.analyzeBtn.disabled = isLoading;
    [ui.generatePdfBtn, ui.generateExcelBtn, ui.downloadZipBtn, ui.sendEmailBtn].forEach(btn => btn.disabled = isLoading);
    ui.analyzeSpinner.classList.toggle('hidden', !isLoading);
    ui.analyzeBtnText.classList.toggle('hidden', isLoading);
    ui.analysisStatus.textContent = isLoading ? 'Processando...' : '';
}

function showError(message) {
    if (message) {
        ui.errorMessage.textContent = message;
        ui.errorBanner.classList.remove('hidden');
    } else {
        ui.errorBanner.classList.add('hidden');
    }
}

async function saveApiKey() {
    const apiKey = ui.apiKeyInput.value.trim();
    if (!apiKey) {
        return showError("Por favor, insira uma chave de API antes de salvar.");
    }
    const result = await window.electronAPI.saveData({ apiKey: apiKey });
    if (result.success) {
        ui.saveApiKeyBtn.textContent = 'Salvo!';
        setTimeout(() => { ui.saveApiKeyBtn.textContent = 'Salvar'; }, 2000);
    } else {
        showError(`Falha ao salvar a chave da API: ${result.error}`);
    }
}

// --- SCRIPT EXECUTION ---
initializeApp();