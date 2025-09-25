function initJsonFormatter() {
    const page = document.getElementById('JsonFormatter');
    page.innerHTML = `
        <div class="tool-header">
            <h1>JSON Formatter</h1>
            <p>Rapikan, validasi, dan kompres data JSON Anda dengan mudah.</p>
        </div>
        <div class="card">
            <div class="grid" style="grid-template-columns: 1fr 220px 1fr; align-items: start;">
                <div class="editor-wrapper">
                    <div class="line-numbers" id="input-line-numbers"><span>1</span></div>
                    <textarea id="json-input" class="textarea-editor" placeholder="Tempel JSON di sini..."></textarea>
                </div>
                <div class="flex flex-col" style="gap: 0.75rem;">
                    <button id="json-format-btn" class="button primary">Format / Beautify</button>
                    <button id="json-minify-btn" class="button secondary">Minify / Compact</button>
                    <select id="json-indent-select" class="select"><option value="2">2 Spasi</option><option value="4">4 Spasi</option><option value="tab">Tab</option></select>
                    <hr>
                    <button id="json-validate-btn" class="button secondary">Validate</button>
                    <button id="json-upload-btn" class="button secondary">Upload File</button>
                    <button id="json-copy-btn" class="button secondary">Copy Result</button>
                    <button id="json-download-btn" class="button secondary">Download</button>
                </div>
                <div class="editor-wrapper">
                    <div class="line-numbers" id="output-line-numbers"><span>1</span></div>
                    <pre id="json-output" class="pre-editor"></pre>
                </div>
            </div>
        </div>
        <input type="file" id="json-file-input" class="is-hidden" accept=".json,.txt">
    `;

    const inputArea = document.getElementById('json-input');
    const outputArea = document.getElementById('json-output');
    const inputLineNumbers = document.getElementById('input-line-numbers');
    const outputLineNumbers = document.getElementById('output-line-numbers');
    const formatBtn = document.getElementById('json-format-btn');
    const minifyBtn = document.getElementById('json-minify-btn');
    const validateBtn = document.getElementById('json-validate-btn');
    const copyBtn = document.getElementById('json-copy-btn');
    const indentSelect = document.getElementById('json-indent-select');
    const uploadBtn = document.getElementById('json-upload-btn');
    const fileInput = document.getElementById('json-file-input');
    const downloadBtn = document.getElementById('json-download-btn');

    if (!inputArea) return;

    const updateLineNumbers = (textArea, lineNumbersContainer) => {
        const lineCount = textArea.value.split('\n').length;
        lineNumbersContainer.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
    };
    
    const syncScroll = (source, target) => { target.scrollTop = source.scrollTop; };
    
    inputArea.addEventListener('input', () => updateLineNumbers(inputArea, inputLineNumbers));
    inputArea.addEventListener('scroll', () => syncScroll(inputArea, inputLineNumbers));
    outputArea.addEventListener('scroll', () => syncScroll(outputArea, outputLineNumbers));


    function highlightJsonSyntax(jsonString) {
        if (!jsonString) return '';
        jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) { cls = /:$/.test(match) ? 'json-key' : 'json-string'; }
            else if (/true|false/.test(match)) { cls = 'json-boolean'; }
            else if (/null/.test(match)) { cls = 'json-null'; }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    const processJson = (action) => {
        const jsonString = inputArea.value.trim();
        if (!jsonString) { outputArea.innerHTML = '<span class="json-error">Error: Input JSON kosong.</span>'; return; }
        try {
            const jsonObj = JSON.parse(jsonString);
            let formattedJson;
            if (action === 'format' || action === 'minify') {
                const indentValue = (action === 'minify') ? '' : (indentSelect.value === 'tab' ? '\t' : parseInt(indentSelect.value, 10));
                formattedJson = JSON.stringify(jsonObj, null, indentValue);
                outputArea.innerHTML = highlightJsonSyntax(formattedJson);
                const lineCount = formattedJson.split('\n').length;
                outputLineNumbers.innerHTML = Array.from({ length: lineCount }, (_, i) => `<span>${i + 1}</span>`).join('');
            } else if (action === 'validate') {
                outputArea.innerHTML = '<span style="color: green; font-weight: bold;">JSON valid!</span>';
                outputLineNumbers.innerHTML = '<span>1</span>';
            }
        } catch (e) {
            outputArea.innerHTML = `<span class="json-error">Error: JSON tidak valid.\n${e.message}</span>`;
            outputLineNumbers.innerHTML = '<span>1</span>';
        }
        updateLineNumbers(inputArea, inputLineNumbers);
    };

    formatBtn.addEventListener('click', () => processJson('format'));
    minifyBtn.addEventListener('click', () => processJson('minify'));
    validateBtn.addEventListener('click', () => processJson('validate'));
    copyBtn.addEventListener('click', () => navigator.clipboard.writeText(outputArea.textContent).then(() => alert('Hasil disalin!'), () => alert('Gagal menyalin.')));
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { inputArea.value = e.target.result; processJson('format'); };
            reader.readAsText(file);
        }
    });
    downloadBtn.addEventListener('click', () => {
        const content = outputArea.textContent;
        if (!content || outputArea.querySelector('.json-error')) { alert('Tidak ada konten valid untuk diunduh.'); return; }
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formatted.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    updateLineNumbers(inputArea, inputLineNumbers);
}