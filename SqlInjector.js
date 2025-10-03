function initSqlInjector() {
    const page = document.getElementById('SqlInjector');
    if (!page) return;

    page.innerHTML = `
        <div class="tool-header">
            <h1>SQL INSERT Query Generator</h1>
            <p>Tempelkan query SQL Anda untuk membuat form input data secara otomatis.</p>
        </div>
        <div class="card" style="margin-bottom: 1.5rem;">
            <label class="label">1. Tempelkan Contoh Query INSERT</label>
            <textarea id="sql-injector-input" rows="8" class="textarea textarea-editor" placeholder="Contoh: INSERT INTO users (id, name, address_data) values (1, 'John Doe', '{\\"city\\":\\"Jakarta\\",\\"zip\\":12345}');"></textarea>
            <button id="parse-btn" class="button primary" style="margin-top: 1rem;">
                <i class="fas fa-cogs" style="margin-right: 0.5rem;"></i> Analisis Query & Buat Form
            </button>
        </div>

        <div id="form-container" class="card is-hidden" style="margin-bottom: 1.5rem;">
            <h2 class="label">2. Masukkan Data Baru</h2>
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">Kolom JSON dipecah otomatis. Anda bisa langsung menempelkan data dari Excel.</p>
            <p style="color: #d69e2e; margin-bottom: 0.5rem; font-size: 0.9rem;"><strong>Tips:</strong> Kolom kosong akan otomatis menggunakan nilai dari baris contoh.</p>
             <p style="color: #38a169; margin-bottom: 1rem; font-size: 0.9rem;"><strong>Tips:</strong> Header miring berwarna hijau adalah bagian dari JSON.</p>
            <div id="data-table-container" class="results-table-wrapper" style="max-height: 50vh; overflow: auto;"></div>
            <div class="flex" style="margin-top: 1rem; gap: 0.75rem;">
                <button id="download-template-btn" class="button secondary">Download Template</button>
                <button id="upload-excel-btn" class="button secondary">Unggah Excel</button>
                <input type="file" id="excel-input" class="is-hidden" accept=".xlsx, .xls">
                <button id="add-row-btn" class="button success">Tambah Baris</button>
                <button id="generate-script-btn" class="button primary">Buat Script SQL</button>
            </div>
        </div>

        <div id="output-container" class="card is-hidden">
            <label class="label">3. Hasil Script SQL</label>
            <textarea id="sql-injector-output" rows="10" readonly class="textarea textarea-editor" style="background-color: #2d3748; color: #c6f6d5;"></textarea>
            <div class="flex" style="margin-top: 1rem; gap: 0.75rem;">
                <button id="copy-btn" class="button secondary">Salin Script</button>
                <button id="clear-btn" class="button" style="background-color: #e53e3e; color: white;">Mulai dari Awal</button>
            </div>
        </div>
        <div id="toast" style="position: fixed; top: 20px; right: 20px; background-color: var(--success-color); color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: opacity 0.3s; opacity: 0; pointer-events: none;">Pesan notifikasi!</div>
    `;

    // --- Global state and DOM Elements ---
    let tableName = '', originalColumns = [], displayColumns = [], jsonStructure = {}, templateValues = [];
    const $ = (selector) => page.querySelector(selector);
    const sqlInput = $('#sql-injector-input'), parseBtn = $('#parse-btn'), formContainer = $('#form-container');
    const outputContainer = $('#output-container'), sqlOutput = $('#sql-injector-output'), dataTableContainer = $('#data-table-container');
    const uploadExcelBtn = $('#upload-excel-btn'), excelInput = $('#excel-input');

    // --- Event Listeners ---
    parseBtn.addEventListener('click', handleParse);
    uploadExcelBtn.addEventListener('click', () => excelInput.click());
    excelInput.addEventListener('change', handleFileUpload);
    
    page.addEventListener('click', (e) => {
        if (e.target.id === 'download-template-btn') handleDownloadTemplate();
        if (e.target.id === 'add-row-btn') handleAddRow();
        if (e.target.id === 'generate-script-btn') handleGenerateScript();
        if (e.target.id === 'copy-btn') handleCopy();
        if (e.target.id === 'clear-btn') handleClear();
        if (e.target.classList.contains('remove-row-btn')) e.target.closest('tr').remove();
    });
    
    page.addEventListener('paste', handlePaste);
    
    // --- Core Functions ---
    function handleParse() {
        const query = sqlInput.value.trim();
        if (!query) { alert('Silakan masukkan query SQL terlebih dahulu.'); return; }
        
        try {
            const insertRegex = /INSERT\s+INTO\s+((?:[a-zA-Z0-9_."]+\.)?[a-zA-Z0-9_."]+)\s*\((.*?)\)\s*values\s*\((.*)\)\s*;?/is;
            const match = query.match(insertRegex);
            if (!match) throw new Error("Format query INSERT tidak valid.");

            tableName = match[1].trim();
            // --- PERBAIKAN 1: Mempertahankan format kolom asli (dengan/tanpa quotes) ---
            originalColumns = match[2].trim().split(',').map(c => c.trim());
            const values = parseValues(match[3].trim());

            if (originalColumns.length !== values.length) throw new Error(`Jumlah kolom (${originalColumns.length}) tidak cocok dengan jumlah nilai (${values.length}).`);

            displayColumns = []; jsonStructure = {}; let initialDisplayValues = [];
            originalColumns.forEach((colName, index) => {
                const cleanColName = colName.replace(/["`]/g, ''); // Nama bersih untuk di-mapping
                const val = values[index];
                let isJson = false, jsonObj = null;
                if (typeof val === 'object' && val !== null) { isJson = true; jsonObj = val; }
                else if (typeof val === 'string') {
                    try { const p = JSON.parse(val); if (typeof p === 'object' && p !== null) { isJson = true; jsonObj = p; } } catch (e) {}
                }
                
                if (isJson) {
                    const keys = Object.keys(jsonObj);
                    if (keys.length > 0) {
                        jsonStructure[cleanColName] = keys;
                        keys.forEach(key => {
                            displayColumns.push({ name: `${cleanColName}.${key}`, isJsonPart: true });
                            initialDisplayValues.push(jsonObj[key] || '');
                        });
                        return;
                    }
                }
                displayColumns.push({ name: cleanColName, isJsonPart: false });
                initialDisplayValues.push(val);
            });
            
            templateValues = [...initialDisplayValues];
            buildDataEntryTable(displayColumns, initialDisplayValues);
            formContainer.classList.remove('is-hidden');
            outputContainer.classList.add('is-hidden');
            sqlOutput.value = '';

        } catch (error) { alert('Gagal menganalisis query: ' + error.message); console.error(error); }
    }
    
    function parseValues(valueStr) {
        const values = []; let currentVal = ''; let inString = false; let pLevel = 0; let strDelim = '';
        for (let i = 0; i < valueStr.length; i++) {
            const char = valueStr[i];
            if (inString) {
                if (char === strDelim) { if (i + 1 < valueStr.length && valueStr[i+1] === strDelim) { currentVal += char + char; i++; } else { inString = false; currentVal += char; } }
                else { currentVal += char; }
            } else {
                if (char === "'" || char === '"') { inString = true; strDelim = char; currentVal += char; } 
                else if (char === '(') { pLevel++; currentVal += char; } 
                else if (char === ')') { pLevel--; currentVal += char; } 
                else if (char === ',' && pLevel === 0) { values.push(currentVal.trim()); currentVal = ''; } 
                else { currentVal += char; }
            }
        }
        values.push(currentVal.trim());
        return values.map(v => {
            const jsonMatch = v.match(/^('.*')::json$/);
            if (jsonMatch) { try { return JSON.parse(jsonMatch[1].slice(1, -1)); } catch (e) { return jsonMatch[1].slice(1, -1); } }
            if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) { return v.slice(1, -1); }
            return v;
        });
    }
    
    function buildDataEntryTable(columnsArr, initialValues) {
        const table = document.createElement('table');
        table.className = 'results-table';
        const thead = document.createElement('thead');
        let headerHtml = '<tr>';
        columnsArr.forEach(col => {
            let thStyles = col.isJsonPart ? 'font-style: italic; background-color: #c6f6d5; color: #22543d;' : '';
            headerHtml += `<th style="${thStyles}">${col.name}</th>`;
        });
        headerHtml += '<th>Aksi</th></tr>';
        thead.innerHTML = headerHtml;
        const tbody = document.createElement('tbody');
        tbody.id = 'data-tbody';
        table.append(thead, tbody);
        dataTableContainer.innerHTML = '';
        dataTableContainer.appendChild(table);
        addRowToTable(tbody, columnsArr, initialValues);
    }

    function addRowToTable(tbody, columnsArr, values = []) {
         const tr = document.createElement('tr');
         columnsArr.forEach((col, index) => {
             const value = values[index] || '';
             const td = document.createElement('td');
             td.style.padding = '0.25rem';
             td.innerHTML = `<textarea rows="1" class="input" style="padding: 0.5rem; height: auto;">${value.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>`;
             tr.appendChild(td);
         });
         const actionTd = document.createElement('td');
         actionTd.style.padding = '0.25rem';
         actionTd.innerHTML = `<button class="button secondary remove-row-btn" style="width: 100%; background-color: #fed7d7; color: #822727;">Hapus</button>`;
         tr.appendChild(actionTd);
         tbody.appendChild(tr);
    }
    
    function handlePaste(event) {
        const target = event.target;
        if (target.tagName !== 'TEXTAREA' || !target.closest('#data-table-container')) return;
        event.preventDefault();
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        const parsedRows = pastedText.trim().split(/[\r\n]+/).map(row => row.split('\t'));
        if (parsedRows.length === 0) return;

        const startRow = target.closest('tr');
        const tbody = startRow.parentElement;
        const allTextareas = Array.from(startRow.querySelectorAll('textarea'));
        const startIdx = allTextareas.indexOf(target);

        const firstRowData = parsedRows.shift(); 
        firstRowData.forEach((cellData, i) => { if (startIdx + i < allTextareas.length) allTextareas[startIdx + i].value = cellData; });

        parsedRows.forEach(rowData => {
            const newValues = Array(displayColumns.length).fill('');
            rowData.forEach((cellData, i) => { if (startIdx + i < newValues.length) newValues[startIdx + i] = cellData; });
            addRowToTable(tbody, displayColumns, newValues); 
        });
    }
    
    function handleFileUpload(event) {
        if (displayColumns.length === 0) { alert("Harap analisis query SQL terlebih dahulu."); event.target.value = ''; return; }
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (jsonData.length < 2) throw new Error("File Excel kosong atau hanya berisi header.");
                const excelHeaders = jsonData.shift().map(h => h.toString().trim());
                const colNames = displayColumns.map(c => c.name);
                const headerMap = colNames.map(name => {
                    const index = excelHeaders.indexOf(name);
                    if (index === -1) throw new Error(`Kolom "${name}" tidak ditemukan di file Excel.`);
                    return index;
                });
                const tbody = $('#data-tbody');
                tbody.innerHTML = ''; 
                jsonData.forEach(row => {
                    const newRowData = headerMap.map(idx => row[idx] || '');
                    addRowToTable(tbody, displayColumns, newRowData);
                });
                showToast("Data dari Excel berhasil diunggah!");
            } catch (error) { alert("Gagal memproses file Excel: " + error.message); } 
            finally { event.target.value = ''; }
        };
        reader.readAsArrayBuffer(file);
    }

    function handleDownloadTemplate() {
        if (displayColumns.length === 0) { alert("Harap analisis query SQL terlebih dahulu."); return; }
        const headers = displayColumns.map(c => c.name);
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Template");
        XLSX.writeFile(wb, "template_import.xlsx");
    }

    function handleAddRow() {
        const tbody = $('#data-tbody');
        if (tbody && displayColumns.length > 0) addRowToTable(tbody, displayColumns);
    }

    function handleGenerateScript() {
        const tbody = $('#data-tbody');
        if (!tbody || tbody.querySelectorAll('tr').length === 0) { alert("Tidak ada data untuk dibuatkan script."); return; }
        let finalScript = '';
        // --- PERBAIKAN 2: Menggunakan daftar kolom asli tanpa modifikasi ---
        const columnsList = originalColumns.join(', ');
        tbody.querySelectorAll('tr').forEach(row => {
            const inputs = Array.from(row.querySelectorAll('textarea'));
            const finalValues = []; let currentInputIndex = 0;
            originalColumns.forEach(colName => {
                const cleanColName = colName.replace(/["`]/g, '');
                if (jsonStructure[cleanColName]) {
                    const jsonObj = {};
                    jsonStructure[cleanColName].forEach(key => {
                        let cellValue = inputs[currentInputIndex].value.trim();
                        if (cellValue === '') cellValue = templateValues[currentInputIndex];
                        jsonObj[key] = cellValue;
                        currentInputIndex++;
                    });
                    finalValues.push(formatSqlValue(JSON.stringify(jsonObj)));
                } else {
                    let cellValue = inputs[currentInputIndex].value.trim();
                    finalValues.push(formatSqlValue(cellValue === '' ? templateValues[currentInputIndex] : cellValue));
                    currentInputIndex++;
                }
            });
            finalScript += `INSERT INTO ${tableName} (${columnsList})\nvalues\n(${finalValues.join(', ')});\n\n`;
        });
        sqlOutput.value = finalScript;
        outputContainer.classList.remove('is-hidden');
        outputContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    function formatSqlValue(value) {
        const valueStr = String(value).trim();
        if (valueStr.toUpperCase() === 'NULL') return 'NULL';
        const keywords = ['now()', 'public.uuid_generate_v4()'];
        if (keywords.includes(valueStr.toLowerCase())) return valueStr;
        if (valueStr.startsWith('{') && valueStr.endsWith('}')) { try { JSON.parse(valueStr); return `'${valueStr.replace(/'/g, "''")}'::json`; } catch (e) {} } // Menambahkan ::json untuk PostgreSQL
        if (valueStr === '') return "''";
        const isNum = /^-?\d+(\.\d+)?$/.test(valueStr);
        if (isNum && !(valueStr.length > 1 && valueStr.startsWith('0') && !valueStr.startsWith('0.'))) return valueStr;
        return `'${valueStr.replace(/'/g, "''")}'`;
    }
    
    function handleCopy() {
        if (!sqlOutput.value) return;
        navigator.clipboard.writeText(sqlOutput.value).then(() => showToast('Script disalin ke clipboard!')).catch(err => alert('Gagal menyalin.'));
    }

    function showToast(message) {
        const toast = $('#toast');
        toast.textContent = message;
        toast.style.opacity = '1';
        setTimeout(() => toast.style.opacity = '0', 3000);
    }

    function handleClear() {
        sqlInput.value = ''; sqlOutput.value = ''; dataTableContainer.innerHTML = '';
        formContainer.classList.add('is-hidden'); outputContainer.classList.add('is-hidden');
        tableName = ''; originalColumns = []; displayColumns = []; jsonStructure = {}; templateValues = [];
    }
}