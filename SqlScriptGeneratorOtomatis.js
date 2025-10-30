function initSqlScriptGeneratorOtomatis() {
    const page = document.getElementById('SqlScriptGeneratorOtomatis');
    if (!page) return;

    page.innerHTML = `
        <div class="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">SQL Script Generator (Otomatis)</h1>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
                <h3 class="font-bold text-blue-800">Cara Penggunaan (v8):</h3>
                <ol class="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                    <li>Paste script \`INSERT INTO ... VALUES (...);\` Anda.</li>
                    <li>Klik <strong>"Deteksi Kolom & Nilai"</strong>.</li>
                    <li>Unggah file Excel Anda.</li>
                    <li>Tabel pemetaan akan muncul. Klik pada setiap dropdown untuk <strong>mencari dan memilih</strong> Header Excel, Fungsi SQL, atau "Tidak Ada Perubahan".</li>
                    <li>Klik <strong>"Generate Script"</strong> untuk melihat hasilnya.</li>
                </ol>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-6">
                    <div>
                        <label for="sql-template" class="block text-lg font-semibold text-gray-700 mb-2">1. Template Script SQL</label>
                        <textarea id="sql-template" class="w-full h-48 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm" placeholder="Paste script INSERT tunggal Anda di sini, diakhiri dengan );"></textarea>
                        <button id="detect-values-button" class="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition duration-200 shadow-md">2. Deteksi Kolom & Nilai</button>
                        <div id="detect-info" class="text-sm text-gray-600 mt-2"></div>
                    </div>
                    <div>
                        <label for="excel-upload" class="block text-lg font-semibold text-gray-700 mb-2">3. Unggah File Excel</label>
                        <input type="file" id="excel-upload" class="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" accept=".xlsx, .xls">
                        <div id="excel-info" class="text-sm text-gray-600 mt-2"></div>
                    </div>
                </div>
                <div class="space-y-6">
                    <div id="mapping-section" class="hidden">
                        <label class="block text-lg font-semibold text-gray-700 mb-2">4. Pemetaan Nilai</label>
                        <div class="border border-gray-300 rounded-md shadow-sm max-h-96 overflow-y-auto">
                            <table class="w-full min-w-full">
                                <thead class="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th class="p-3 text-left text-sm font-semibold text-gray-600">Kolom Script</th>
                                        <th class="p-3 text-left text-sm font-semibold text-gray-600">Nilai Acuan</th>
                                        <th class="p-3 text-left text-sm font-semibold text-gray-600">Ganti Dengan</th>
                                    </tr>
                                </thead>
                                <tbody id="mapping-table-body" class="bg-white"></tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <button id="generate-button" class="w-full bg-green-600 text-white px-4 py-3 rounded-md font-semibold hover:bg-green-700 transition duration-200 shadow-lg text-lg hidden">5. Generate Script</button>
                    </div>
                </div>
            </div>
            <div id="output-section" class="mt-8 hidden">
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-2xl font-semibold text-gray-800">Hasil Script</h2>
                    <button id="copy-button" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition duration-200">Copy</button>
                </div>
                <textarea id="output-sql" class="w-full h-80 p-3 border border-gray-300 rounded-md shadow-sm font-mono text-sm bg-gray-50" readonly></textarea>
                <div id="copy-success" class="text-green-600 font-semibold mt-2 hidden">Berhasil disalin ke clipboard!</div>
            </div>
        </div>
    `;

    // --- State & DOM Elements ---
    let excelHeaders = [];
    let excelData = [];
    let detectedMapping = [];
    const $ = (selector) => page.querySelector(selector);
    const sqlTemplateEl = $('#sql-template'), detectButton = $('#detect-values-button'), detectInfo = $('#detect-info');
    const excelUpload = $('#excel-upload'), excelInfo = $('#excel-info');
    const mappingSection = $('#mapping-section'), mappingTableBody = $('#mapping-table-body');
    const generateButton = $('#generate-button'), outputSection = $('#output-section'), outputSql = $('#output-sql');
    const copyButton = $('#copy-button'), copySuccess = $('#copy-success');

    // --- Event Listeners ---
    detectButton.addEventListener('click', handleDetectValues);
    excelUpload.addEventListener('change', handleExcelUpload);
    generateButton.addEventListener('click', handleGenerateScript);
    copyButton.addEventListener('click', copyToClipboard);

    // --- Custom Dropdown Logic ---
    page.addEventListener('click', (e) => {
        const trigger = e.target.closest('.custom-select-trigger');
        if (trigger) {
            const container = trigger.closest('.custom-select-container');
            const panel = container.querySelector('.custom-select-panel');
            const wasOpen = !panel.classList.contains('is-hidden');
            
            // Close all other dropdowns first
            page.querySelectorAll('.custom-select-panel').forEach(p => p.classList.add('is-hidden'));

            // If it wasn't open, open it
            if (!wasOpen) {
                 panel.classList.remove('is-hidden');
                 panel.querySelector('.custom-select-search').focus();
            }
        } else if (!e.target.closest('.custom-select-panel')) {
            // Clicked outside, close all dropdowns
            page.querySelectorAll('.custom-select-panel').forEach(p => p.classList.add('is-hidden'));
        }
    });

    page.addEventListener('input', (e) => {
        if (e.target.classList.contains('custom-select-search')) {
            const searchTerm = e.target.value.toLowerCase();
            const panel = e.target.closest('.custom-select-panel');
            panel.querySelectorAll('li').forEach(option => {
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }
    });

    mappingTableBody.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (option) {
            const container = option.closest('.custom-select-container');
            const trigger = container.querySelector('.custom-select-trigger');
            trigger.textContent = option.textContent;
            trigger.dataset.value = option.dataset.value;
            container.querySelector('.custom-select-panel').classList.add('is-hidden');
        }
    });

    // --- Helper Functions ---
    const excelSerialDateToJSDate = (serial) => {
        if (typeof serial !== 'number' || isNaN(serial)) return null;
        const utc_days = Math.floor(serial - 25569);
        const date_info = new Date(utc_days * 86400 * 1000);
        return date_info;
    };

    const formatDateToYYYYMMDD = (date) => {
        if (!date || !(date instanceof Date)) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // --- Core Logic Functions ---
    const parseValues = (content) => {
        let values = []; let currentToken = ""; let inString = false; let parenLevel = 0;
        content = content.trim();
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === "'") { inString = !inString; currentToken += char; }
            else if (!inString) {
                if (char === '(') { parenLevel++; currentToken += char; }
                else if (char === ')') { parenLevel--; currentToken += char; }
                else if (char === ',' && parenLevel === 0) { values.push(currentToken.trim()); currentToken = ""; }
                else { currentToken += char; }
            } else { currentToken += char; }
        }
        values.push(currentToken.trim()); return values.filter(v => v.length > 0);
    };

    const parseColumns = (content) => {
        return content.trim().split(',').map(c => c.trim().replace(/"/g, ''));
    };
    
    const parseJsonValue = (sqlValue) => {
        let jsonString = sqlValue.trim().replace(/::jsonb$|::json$/, '').trim();
        if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
            jsonString = jsonString.slice(1, -1).replace(/''/g, "'");
        }
        try {
            const jsonObj = JSON.parse(jsonString);
            if (jsonObj && typeof jsonObj === 'object') return { jsonObj, jsonKeys: Object.keys(jsonObj) };
        } catch (e) { /* ignore */ }
        return null;
    };

    function handleDetectValues() {
        // ... (fungsi ini tidak berubah dari versi sebelumnya)
        const template = sqlTemplateEl.value;
        const valMatch = template.match(/\bVALUES\b\s*\(([\s\S]+?)\)\s*;/i);
        if (!valMatch || !valMatch[1]) {
            detectInfo.textContent = 'Error: Tidak dapat menemukan klausa VALUES (...);. Pastikan script adalah query INSERT tunggal dan diakhiri dengan );';
            detectInfo.className = 'text-sm text-red-600 mt-2';
            return;
        }
        const colMatch = template.match(/INSERT\s+INTO\s+.*?\(([\s\S]+?)\)\s*VALUES/i);
        const valuesContent = valMatch[1];
        let values;
        try {
            values = parseValues(valuesContent);
        } catch (e) {
            console.error("Parsing error:", e);
            detectInfo.textContent = `Error saat parsing VALUES: ${e.message}`;
            detectInfo.className = 'text-sm text-red-600 mt-2';
            return;
        }
        detectedMapping = [];
        if (colMatch && colMatch[1]) {
            const colContent = colMatch[1];
            let columns;
            try {
                columns = parseColumns(colContent);
            } catch (e) {
                console.error("Parsing error:", e);
                detectInfo.textContent = `Error saat parsing NAMA KOLOM: ${e.message}`;
                detectInfo.className = 'text-sm text-red-600 mt-2';
                return;
            }
            if (columns.length !== values.length) {
                detectInfo.textContent = `Error: Jumlah kolom (${columns.length}) tidak cocok dengan jumlah nilai (${values.length})! Harap perbaiki script Anda.`;
                detectInfo.className = 'text-sm text-red-600 mt-2';
                return;
            }
            for (let i = 0; i < columns.length; i++) {
                const col = columns[i];
                const val = values[i];
                const jsonInfo = parseJsonValue(val);
                if (jsonInfo) {
                    detectedMapping.push({ col, val, isJson: true, originalJson: jsonInfo.jsonObj, jsonKeys: jsonInfo.jsonKeys });
                } else {
                    detectedMapping.push({ col, val, isJson: false });
                }
            }
            detectInfo.textContent = `Berhasil! Terdeteksi ${columns.length} kolom & nilai. Silakan unggah Excel.`;
        } else {
             // Fallback if no columns are defined
            for (let i = 0; i < values.length; i++) {
                const col = `Nilai #${i + 1}`;
                const val = values[i];
                const jsonInfo = parseJsonValue(val);
                if (jsonInfo) {
                    detectedMapping.push({ col, val, isJson: true, originalJson: jsonInfo.jsonObj, jsonKeys: jsonInfo.jsonKeys });
                } else {
                    detectedMapping.push({ col, val, isJson: false });
                }
            }
            detectInfo.textContent = `Berhasil! Terdeteksi ${values.length} nilai (tanpa nama kolom). Silakan unggah Excel.`;
        }
        detectInfo.className = 'text-sm text-green-600 mt-2';
        updateMappingUI();
    }
    
    function handleExcelUpload(event) {
        // ... (fungsi ini tidak berubah dari versi sebelumnya)
        const file = event.target.files[0];
        if (!file) return;
        excelInfo.textContent = 'Memproses file...';
        excelInfo.className = 'text-sm text-gray-600 mt-2';
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const dataAsArray = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (dataAsArray.length === 0) {
                    alert('Excel kosong.');
                    return;
                }
                excelHeaders = dataAsArray[0].map(String);
                excelData = XLSX.utils.sheet_to_json(worksheet);
                excelInfo.textContent = `File "${file.name}" dimuat. Terdeteksi ${excelHeaders.length} header dan ${excelData.length} baris data.`;
                excelInfo.classList.add('text-green-600');
                updateMappingUI();
            } catch (error) {
                console.error(error);
                excelInfo.textContent = 'Gagal memproses file Excel. Pastikan formatnya benar.';
                excelInfo.classList.add('text-red-600');
            }
        };
        reader.readAsArrayBuffer(file);
    }
    
    function createCustomDropdownHtml(isJson = false) {
        let optionsHtml = `
            <li class="custom-select-option" data-value="__NO_CHANGE__">-- Tidak Ada Perubahan (Acuan) --</li>
            <li class="custom-select-group">Fungsi SQL</li>
            <li class="custom-select-option" data-value="__UUID_V4__">uuid_generate_v4()</li>
            <li class="custom-select-option" data-value="__DATE_YYYY_MM_DD__">Format Tanggal (YYYY-MM-DD)</li>
            <li class="custom-select-group">${isJson ? 'Header dari Excel (JSON Utuh)' : 'Header dari Excel'}</li>
        `;
        excelHeaders.forEach(header => {
            optionsHtml += `<li class="custom-select-option" data-value="${header}">${header}</li>`;
        });

        return `
            <div class="custom-select-container">
                <button class="custom-select-trigger" data-value="__NO_CHANGE__">-- Tidak Ada Perubahan (Acuan) --</button>
                <div class="custom-select-panel is-hidden">
                    <input type="text" class="custom-select-search" placeholder="Cari opsi...">
                    <ul class="custom-select-options">${optionsHtml}</ul>
                </div>
            </div>`;
    }

    function updateMappingUI() {
        if (detectedMapping.length === 0 || excelHeaders.length === 0) return;
        mappingTableBody.innerHTML = '';
        detectedMapping.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200' + (item.isJson ? ' json-main-row' : '');
            tr.dataset.mappingIndex = index;
            
            const tdCol = `<td class="p-2"><code class="bg-gray-100 text-gray-800 px-2 py-1 rounded">${item.col}</code></td>`;
            const tdVal = `<td class="p-2 tooltip-cell" data-full-value="${item.val.replace(/"/g, '&quot;')}"><code class="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value" title="Nilai acuan">${item.val}</code></td>`;
            const tdSelect = `<td class="p-2">${createCustomDropdownHtml(item.isJson)}</td>`;
            tr.innerHTML = tdCol + tdVal + tdSelect;
            mappingTableBody.appendChild(tr);

            if (item.isJson && item.jsonKeys) {
                item.jsonKeys.forEach(key => {
                    const subTr = document.createElement('tr');
                    subTr.className = 'border-b border-gray-200 json-subkey-row';
                    subTr.dataset.isSubkey = 'true';
                    subTr.dataset.parentIndex = index;
                    subTr.dataset.subkeyName = key;
                    const originalSubValue = item.originalJson[key];
                    
                    const tdKey = `<td class="p-2"><code class="json-key-code px-2 py-1 rounded ml-4">${key}</code></td>`;
                    const tdSubVal = `<td class="p-2 tooltip-cell" data-full-value="${String(originalSubValue)}"><code class="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value" title="Nilai acuan key">${String(originalSubValue)}</code></td>`;
                    const tdSubSelect = `<td class="p-2">${createCustomDropdownHtml(false)}</td>`;
                    
                    subTr.innerHTML = tdKey + tdSubVal + tdSubSelect;
                    mappingTableBody.appendChild(subTr);
                });
            }
        });
        mappingSection.classList.remove('hidden');
        generateButton.classList.remove('hidden');
    }

    function handleGenerateScript() {
        const template = sqlTemplateEl.value;
        const valuesRegex = /(\bVALUES\b\s*\()([\s\S]+?)(\)\s*;)/i;
        const match = template.match(valuesRegex);
        if (!match) { alert('Error: Tidak dapat menemukan klausa "VALUES (...) ;".'); return; }
        
        const scriptPrefix = template.substring(0, match.index) + match[1] + '\n  ';
        const scriptSuffix = '\n' + match[3] + '\n\n';
        let finalScript = "";

        excelData.forEach(row => {
            let newValues = [];
            let jsonBuilders = {};

            // Pre-process all rows to build JSON objects first
            mappingTableBody.querySelectorAll('tr[data-is-subkey="true"]').forEach(tr => {
                const trigger = tr.querySelector('.custom-select-trigger');
                const parentIndex = parseInt(tr.dataset.parentIndex, 10);
                const subkeyName = tr.dataset.subkeyName;
                const mappedTarget = trigger.dataset.value;

                if (!jsonBuilders[parentIndex]) {
                    jsonBuilders[parentIndex] = { ...detectedMapping[parentIndex].originalJson }; // Clone
                }

                let subValue;
                if (mappedTarget === "__NO_CHANGE__") {
                    subValue = detectedMapping[parentIndex].originalJson[subkeyName];
                } else if (mappedTarget === "__DATE_YYYY_MM_DD__") {
                    const dateVal = excelSerialDateToJSDate(row[subkeyName]);
                    subValue = formatDateToYYYYMMDD(dateVal) || row[subkeyName];
                } else {
                   subValue = row[mappedTarget];
                }
                jsonBuilders[parentIndex][subkeyName] = subValue;
            });

            // Process main rows to construct final values list
            mappingTableBody.querySelectorAll('tr[data-mapping-index]').forEach(tr => {
                const mappingIndex = parseInt(tr.dataset.mappingIndex, 10);
                const item = detectedMapping[mappingIndex];
                const trigger = tr.querySelector('.custom-select-trigger');
                const mappedTarget = trigger.dataset.value;
                let formattedValue;

                if (item.isJson) {
                    const newJsonObject = jsonBuilders[mappingIndex] || item.originalJson;
                    const newJsonString = JSON.stringify(newJsonObject);
                    formattedValue = `'${newJsonString.replace(/'/g, "''")}'::jsonb`;
                } else {
                    if (mappedTarget === "__NO_CHANGE__") {
                        formattedValue = item.val;
                    } else if (mappedTarget === "__UUID_V4__") {
                        formattedValue = "public.uuid_generate_v4()";
                    } else if (mappedTarget === "__DATE_YYYY_MM_DD__") {
                        const headerToUse = Object.keys(row).find(k => k.toLowerCase() === item.col.toLowerCase().replace(/["`]/g, ''));
                        const rawValue = row[headerToUse];
                        const date = excelSerialDateToJSDate(rawValue);
                        formattedValue = date ? `'${formatDateToYYYYMMDD(date)}'` : 'NULL';
                    } else {
                        let value = row[mappedTarget];
                        if (value === null || typeof value === 'undefined') {
                            formattedValue = 'NULL';
                        } else if (typeof value === 'number' && String(value).match(/^\d{5}\.\d+$/)) {
                             const date = excelSerialDateToJSDate(value);
                             formattedValue = date ? `'${formatDateToYYYYMMDD(date)}'` : String(value);
                        } else if (typeof value === 'number') {
                            formattedValue = value;
                        } else {
                            formattedValue = "'" + String(value).replace(/'/g, "''") + "'";
                        }
                    }
                }
                newValues.push(formattedValue);
            });
            finalScript += scriptPrefix + newValues.join(',\n  ') + scriptSuffix;
        });
        outputSql.value = finalScript;
        outputSection.classList.remove('hidden');
    }

    function copyToClipboard() {
        // ... (fungsi ini tidak berubah dari versi sebelumnya)
        outputSql.select();
        try {
            document.execCommand('copy');
            copySuccess.classList.remove('hidden');
            setTimeout(() => {
                copySuccess.classList.add('hidden');
            }, 2000);
        } catch (err) {
            alert('Gagal menyalin. Silakan salin secara manual.');
        }
    }
}