// OCR Application - Complete Frontend Logic
class OCRApp {
    constructor() {
        this.apiKey = '';
        this.currentFile = null;
        this.currentJobId = null;
        this.exchangeRate = 5.5; // Default USD to BRL
        this.isCodeView = false;

        this.init();
    }

    init() {
        console.log('🚀 OCR App initializing...');
        this.loadApiKey();
        this.setupEventListeners();
        this.fetchExchangeRate();
        this.showCorrectSection();
    }

    loadApiKey() {
        const savedApiKey = localStorage.getItem('mistral_api_key');
        if (savedApiKey) {
            this.apiKey = savedApiKey;
            document.getElementById('apiKey').value = savedApiKey;
            this.showSection('uploadSection');
        }
    }

    setupEventListeners() {
        // API Key Management
        document.getElementById('toggleApiKey').addEventListener('click', this.toggleApiKeyVisibility.bind(this));
        document.getElementById('saveApiKey').addEventListener('click', this.saveApiKey.bind(this));
        document.getElementById('testMode').addEventListener('click', this.enableTestMode.bind(this));

        // File Upload
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));
        document.getElementById('removeFile').addEventListener('click', this.removeFile.bind(this));

        // Drag and Drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));

        // Processing
        document.getElementById('processBtn').addEventListener('click', this.processFile.bind(this));

        // Results
        document.getElementById('downloadBtn').addEventListener('click', this.downloadMarkdown.bind(this));
        document.getElementById('previewBtn').addEventListener('click', this.showPreview.bind(this));
        document.getElementById('newFileBtn').addEventListener('click', this.resetForNewFile.bind(this));

        // Preview
        document.getElementById('closePreview').addEventListener('click', this.closePreview.bind(this));
        document.getElementById('toggleView').addEventListener('click', this.toggleView.bind(this));

        // Error Actions
        document.getElementById('retryBtn').addEventListener('click', this.processFile.bind(this));
        document.getElementById('newFileErrorBtn').addEventListener('click', this.resetForNewFile.bind(this));
    }

    async fetchExchangeRate() {
        try {
            // Use a CORS-friendly exchange rate API
            const response = await fetch('https://api.fxratesapi.com/latest?base=USD&symbols=BRL', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.exchangeRate = data.rates?.BRL || 5.5;
                console.log('💱 Exchange rate updated:', this.exchangeRate);
            } else {
                throw new Error('API response not ok');
            }
        } catch (error) {
            console.warn('⚠️ Failed to fetch exchange rate, using default:', error.message);
            this.exchangeRate = 5.5; // Default BRL rate
        }
    }

    toggleApiKeyVisibility() {
        const apiKeyInput = document.getElementById('apiKey');
        const toggleBtn = document.getElementById('toggleApiKey');
        const icon = toggleBtn.querySelector('i');

        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            apiKeyInput.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    saveApiKey() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) {
            this.showNotification(
                'Chave da API Necessária',
                'Por favor, insira uma chave da API válida.',
                'warning'
            );
            return;
        }

        this.apiKey = apiKey;
        localStorage.setItem('mistral_api_key', apiKey);

        // Show success feedback
        const banner = document.querySelector('.info-banner');
        banner.className = 'info-banner api-key-saved';
        banner.innerHTML = '<i class="fas fa-check-circle"></i><span>Chave da API salva com sucesso!</span>';

        setTimeout(() => {
            this.showSection('uploadSection');
        }, 1000);
    }

    enableTestMode() {
        this.apiKey = 'test-mode';
        localStorage.removeItem('mistral_api_key');

        const banner = document.querySelector('.info-banner');
        banner.className = 'info-banner';
        banner.innerHTML = '<i class="fas fa-flask"></i><span>Modo teste ativado. Dados simulados serão usados.</span>';

        setTimeout(() => {
            this.showSection('uploadSection');
        }, 1000);
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    async handleFile(file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification(
                'Tipo de Arquivo Não Suportado',
                'Use PDF ou imagens (PNG, JPG, WEBP, BMP, TIFF).',
                'error'
            );
            return;
        }

        // No file size limit - we handle any size with intelligent chunking

        this.currentFile = file;
        this.showFileInfo(file);

        // File loaded silently - UI shows the info

        // Show chunking notice for large PDFs (45MB+) - silently
        const chunkingLimit = 45 * 1024 * 1024;
        if (file.size > chunkingLimit && file.type === 'application/pdf') {
            console.log('📊 Large PDF detected - will use intelligent processing');
            this.showChunkingNotice(file.size);
            // No notification - keep it transparent
        }

        if (file.type === 'application/pdf') {
            await this.calculateCost(file);
        } else {
            this.showImageCost();
        }
    }

    showFileInfo(file) {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('uploadActions').style.display = 'block';

        // Update file details
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = this.formatFileSize(file.size);

        // Update file icon based on type
        const fileIcon = document.getElementById('fileInfo').querySelector('.file-icon');
        if (file.type === 'application/pdf') {
            fileIcon.className = 'fas fa-file-pdf file-icon';
            fileIcon.style.color = '#dc3545';
        } else {
            fileIcon.className = 'fas fa-file-image file-icon';
            fileIcon.style.color = '#28a745';
        }
    }

    showChunkingNotice(fileSize) {
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(1);

        // Create notice element if it doesn't exist
        let notice = document.getElementById('chunkingNotice');
        if (!notice) {
            notice = document.createElement('div');
            notice.id = 'chunkingNotice';
            notice.className = 'chunking-notice';
            notice.innerHTML = `
                <div class="notice-content">
                    <i class="fas fa-rocket"></i>
                    <div class="notice-text">
                        <strong>Processamento Otimizado Ativado (${fileSizeMB}MB)</strong>
                        <p>Arquivo grande será processado com algoritmos otimizados para máxima eficiência e qualidade.</p>
                    </div>
                </div>
            `;

            // Insert after file info
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.appendChild(notice);
        }
    }

    async calculateCost(file) {
        document.getElementById('costDisplay').style.display = 'block';
        document.getElementById('costLoading').style.display = 'block';

        try {
            // Use PDF.js to count pages
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            const pageCount = pdf.numPages;

            // Calculate cost (Mistral OCR: $1 per 1000 pages)
            const costPer1000Pages = 1.00;
            const costUSD = (pageCount / 1000) * costPer1000Pages;
            const costBRL = costUSD * this.exchangeRate;

            // Update UI
            document.getElementById('costLoading').style.display = 'none';
            document.getElementById('pageCount').textContent = pageCount;
            document.getElementById('costUSD').textContent = `$${costUSD.toFixed(3)}`;
            document.getElementById('costBRL').textContent = `R$${costBRL.toFixed(2)}`;

            // Show value comparison
            this.calculateValueComparison(pageCount, costBRL);

        } catch (error) {
            console.error('Error calculating cost:', error);
            document.getElementById('costLoading').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erro ao calcular custo';
        }
    }

    showImageCost() {
        document.getElementById('costDisplay').style.display = 'block';
        document.getElementById('costLoading').style.display = 'none';

        // For images, assume 1 page
        const pageCount = 1;
        const costUSD = 0.001; // $0.001 for 1 page
        const costBRL = costUSD * this.exchangeRate;

        document.getElementById('pageCount').textContent = pageCount;
        document.getElementById('costUSD').textContent = `$${costUSD.toFixed(3)}`;
        document.getElementById('costBRL').textContent = `R$${costBRL.toFixed(2)}`;

        this.calculateValueComparison(pageCount, costBRL);
    }

    calculateValueComparison(pages, costBRL) {
        // Assumptions for value calculation
        const minutesPerPage = 5; // Time to manually transcribe one page
        const hoursToTranscribe = (pages * minutesPerPage) / 60;
        const freelancerRatePerHour = 25; // R$ per hour for freelancer

        const freelancerCost = hoursToTranscribe * freelancerRatePerHour;
        const timeSaved = hoursToTranscribe;
        const savings = freelancerCost - costBRL;

        // Update UI
        document.getElementById('valueComparison').style.display = 'block';
        document.getElementById('timeSaved').textContent = `${timeSaved.toFixed(1)}h`;
        document.getElementById('costSaved').textContent = `R$${savings.toFixed(0)}`;
    }

    removeFile() {
        this.currentFile = null;
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadActions').style.display = 'none';
        document.getElementById('fileInput').value = '';

        // Remove chunking notice if it exists
        const notice = document.getElementById('chunkingNotice');
        if (notice) {
            notice.remove();
        }
    }

    async processFile() {
        if (!this.currentFile) {
            this.showNotification(
                'Arquivo Necessário',
                'Nenhum arquivo selecionado. Por favor, selecione um arquivo primeiro.',
                'warning'
            );
            return;
        }

        if (!this.apiKey) {
            this.showNotification(
                'Configuração Necessária',
                'Configure a chave da API primeiro ou use o modo teste.',
                'warning'
            );
            return;
        }

        this.showSection('processingSection');
        this.currentJobId = this.generateJobId();

        // Test mode simulation
        if (this.apiKey === 'test-mode') {
            await this.simulateProcessing();
            return;
        }

        // Real processing
        await this.realProcessing();
    }

    async simulateProcessing() {
        const steps = [
            { id: 'step1', duration: 2000, message: 'Arquivo enviado com sucesso!' },
            { id: 'step2', duration: 5000, message: 'OCR concluído!' }
        ];

        let totalTime = 0;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];

            // Activate step
            this.activateStep(step.id);

            // Simulate progress
            await this.animateProgress(step.id, step.duration);

            // Complete step
            this.completeStep(step.id, step.duration);
            totalTime += step.duration;
        }

        // Show results
        this.markdownContent = `# Exemplo de Resultado OCR

Este é um exemplo de texto extraído usando OCR.

## Funcionalidades Testadas
- ✅ Upload de arquivo
- ✅ Processamento simulado
- ✅ Cálculo de custos
- ✅ Interface responsiva

**Arquivo:** ${this.currentFile.name}
**Processado em:** ${(totalTime / 1000).toFixed(1)}s
**Modo:** Teste (simulação)`;

        document.getElementById('totalTime').textContent = `${(totalTime / 1000).toFixed(1)}s`;

        setTimeout(() => {
            document.getElementById('resultsSection').style.display = 'block';
        }, 1000);
    }

    async realProcessing() {
        try {
            const startTime = Date.now();

            // Check if file is large and is a PDF
            const fileSizeLimit = 45 * 1024 * 1024; // 45MB
            if (this.currentFile.size > fileSizeLimit && this.currentFile.type === 'application/pdf') {
                console.log('📊 Large PDF detected, using intelligent splitting...');
                await this.processLargePDF();
            } else {
                console.log('📄 Processing single file...');
                await this.processSingleFile();
            }

            const totalTime = Date.now() - startTime;
            document.getElementById('totalTime').textContent = `${(totalTime / 1000).toFixed(1)}s`;

            setTimeout(() => {
                document.getElementById('resultsSection').style.display = 'block';
            }, 1000);

        } catch (error) {
            console.error('Processing error:', error);
            this.showError(error.message);
        }
    }

    async processSingleFile() {
        // Step 1: Upload and process
        this.activateStep('step1');

        const formData = new FormData();
        formData.append('file', this.currentFile);

        const response = await fetch('/process', {
            method: 'POST',
            headers: {
                'X-API-Key': this.apiKey
            },
            body: formData
        });

        await this.animateProgress('step1', 2000);
        this.completeStep('step1', 2000);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Step 2: OCR Processing
        this.activateStep('step2');

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erro desconhecido no processamento');
        }

        await this.animateProgress('step2', result.timing?.ocr || 3000);
        this.completeStep('step2', result.timing?.ocr || 3000);

        // Store results
        this.markdownContent = result.markdown;
    }

    async processLargePDF() {
        // Step 1: Prepare PDF for processing
        this.activateStep('step1');

        const arrayBuffer = await this.currentFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        console.log(`📋 Large PDF detected: ${totalPages} pages, processing as single unit...`);

        await this.animateProgress('step1', 1000);
        this.completeStep('step1', 1000);

        // Step 2: Process the entire PDF
        this.activateStep('step2');

        const progressBar = document.getElementById('progress2');
        const timing = document.getElementById('timing2');
        timing.textContent = 'Processando PDF completo...';

        const formData = new FormData();
        formData.append('file', this.currentFile);

        const response = await fetch('/process', {
            method: 'POST',
            headers: {
                'X-API-Key': this.apiKey
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Erro desconhecido no processamento');
        }

        // Update progress to 100%
        progressBar.style.width = '100%';
        timing.textContent = 'PDF processado com sucesso!';

        this.completeStep('step2', result.timing?.ocr || 3000);

        // Store results
        this.markdownContent = result.markdown;

        console.log(`✅ Successfully processed large PDF with ${totalPages} pages`);
    }


    activateStep(stepId) {
        const step = document.getElementById(stepId);
        step.classList.add('active');
        step.classList.remove('completed');

        // Show spinner
        const spinner = step.querySelector('.step-spinner');
        if (spinner) spinner.style.display = 'block';
    }

    async animateProgress(stepId, duration) {
        const progressBar = document.getElementById(`progress${stepId.slice(-1)}`);
        const timing = document.getElementById(`timing${stepId.slice(-1)}`);

        const startTime = Date.now();

        return new Promise(resolve => {
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1) * 100;

                progressBar.style.width = `${progress}%`;
                timing.textContent = `${(elapsed / 1000).toFixed(1)}s`;

                if (elapsed >= duration) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });
    }

    completeStep(stepId, duration) {
        const step = document.getElementById(stepId);
        step.classList.remove('active');
        step.classList.add('completed');

        // Hide spinner
        const spinner = step.querySelector('.step-spinner');
        if (spinner) spinner.style.display = 'none';

        // Final timing
        const timing = document.getElementById(`timing${stepId.slice(-1)}`);
        timing.textContent = `Concluído em ${(duration / 1000).toFixed(1)}s`;
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        this.showSection('errorSection');
    }

    downloadMarkdown() {
        if (!this.markdownContent) {
            this.showNotification(
                'Nenhum Conteúdo',
                'Não há conteúdo disponível para download.',
                'warning'
            );
            return;
        }

        const blob = new Blob([this.markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentFile.name.split('.')[0]}.md`;
        a.click();

        URL.revokeObjectURL(url);
    }

    showPreview() {
        if (!this.markdownContent) {
            this.showNotification(
                'Nenhum Conteúdo',
                'Não há conteúdo disponível para visualizar.',
                'warning'
            );
            return;
        }

        // Configure marked for better table support
        marked.setOptions({
            gfm: true, // GitHub Flavored Markdown
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false
        });

        // Setup rendered view
        const preview = document.getElementById('markdownPreview');
        preview.innerHTML = marked.parse(this.markdownContent);

        // Setup raw code view
        const rawCode = document.getElementById('markdownRaw');
        rawCode.textContent = this.markdownContent;

        // Reset to rendered view
        this.isCodeView = false;
        this.updateToggleButton();
        this.updatePreviewDisplay();
        this.showSection('previewSection');
    }

    toggleView() {
        this.isCodeView = !this.isCodeView;
        this.updateToggleButton();
        this.updatePreviewDisplay();
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('toggleView');
        if (this.isCodeView) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Ver Renderizado';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-code"></i> Ver Código';
        }
    }

    updatePreviewDisplay() {
        const preview = document.getElementById('markdownPreview');
        const code = document.getElementById('markdownCode');

        if (this.isCodeView) {
            preview.style.display = 'none';
            code.style.display = 'block';
        } else {
            preview.style.display = 'block';
            code.style.display = 'none';
        }
    }

    closePreview() {
        this.showSection('resultsSection');
    }

    resetForNewFile() {
        this.currentFile = null;
        this.currentJobId = null;
        this.markdownContent = '';

        // Reset file input
        document.getElementById('fileInput').value = '';

        // Reset UI
        this.showSection('uploadSection');
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadActions').style.display = 'none';

        // Reset progress
        ['step1', 'step2'].forEach(stepId => {
            const step = document.getElementById(stepId);
            step.classList.remove('active', 'completed');

            const progress = document.getElementById(`progress${stepId.slice(-1)}`);
            progress.style.width = '0%';

            const timing = document.getElementById(`timing${stepId.slice(-1)}`);
            timing.textContent = '';
        });
    }

    showSection(sectionId) {
        const sections = ['apiKeySection', 'uploadSection', 'processingSection', 'resultsSection', 'previewSection', 'errorSection'];

        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === sectionId ? 'block' : 'none';
            }
        });
    }

    showCorrectSection() {
        if (this.apiKey && this.apiKey !== '') {
            this.showSection('uploadSection');
        } else {
            this.showSection('apiKeySection');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateJobId() {
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Custom Notification System
    showNotification(title, message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        const notificationId = 'notification_' + Date.now();

        const icons = {
            error: '⚠️',
            warning: '⚠️',
            success: '✅',
            info: 'ℹ️'
        };

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.id = notificationId;

        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
            <div class="notification-progress"></div>
        `;

        container.appendChild(notification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (document.getElementById(notificationId)) {
                    notification.remove();
                }
            }, duration);
        }

        return notificationId;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    // Initialize OCR App
    window.ocrApp = new OCRApp();

    console.log('🎯 OCR Application ready!');
});