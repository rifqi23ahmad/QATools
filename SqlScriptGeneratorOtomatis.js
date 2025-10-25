function initSqlScriptGeneratorOtomatis() {
    const page = document.getElementById('SqlScriptGeneratorOtomatis');
    if (!page) return;

    page.innerHTML = `
        <div class="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">SQL Script Generator (Otomatis)</h1>
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
                <h3 class="font-bold text-blue-800">Cara Penggunaan (v6):</h3>
                <ol class="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
                    <li>Paste script \`INSERT INTO nama_tabel (kolom1, kolom2, ...) VALUES (nilai1, nilai2, ...);\`</li>
                    <li>Klik <strong>"Deteksi Kolom & Nilai"</strong>. Aplikasi akan otomatis mencocokkan kolom dan nilainya.</li>
                    <li>Jika ada kolom JSON, aplikasi akan otomatis **menampilkan sub-kolom (key) JSON** di bawahnya.</li>
                    <li><strong>Unggah file Excel</strong> Anda.</li>
                    <li>Tabel pemetaan akan muncul. Petakan setiap kolom (dan sub-kolom JSON) ke Header Excel, Fungsi SQL, atau "Tidak Ada Perubahan".</li>
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
                                        <th class="p-3 text-left text-sm font-semibold text-gray-600">Nilai Asli (Acuan)</th>
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

    // Variabel global untuk menyimpan state
    let excelHeaders = [];
    let excelData = [];
    let detectedMapping = []; // Menyimpan {col, val, isJson, originalJson, jsonKeys}

    // Ambil elemen DOM dari dalam 'page'
    const sqlTemplateEl = page.querySelector('#sql-template');
    const detectButton = page.querySelector('#detect-values-button');
    const detectInfo = page.querySelector('#detect-info');
    const excelUpload = page.querySelector('#excel-upload');
    const excelInfo = page.querySelector('#excel-info');
    const mappingSection = page.querySelector('#mapping-section');
    const mappingTableBody = page.querySelector('#mapping-table-body');
    const generateButton = page.querySelector('#generate-button');
    const outputSection = page.querySelector('#output-section');
    const outputSql = page.querySelector('#output-sql');
    const copyButton = page.querySelector('#copy-button');
    const copySuccess = page.querySelector('#copy-success');

    // Event Listener
    detectButton.addEventListener('click', handleDetectValues);
    excelUpload.addEventListener('change', handleExcelUpload);
    generateButton.addEventListener('click', handleGenerateScript);
    copyButton.addEventListener('click', copyToClipboard);

    function parseValues(content) {
        let values = [];
        let currentToken = "";
        let inString = false;
        let parenLevel = 0;
        content = content.trim();
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === "'") {
                inString = !inString;
                currentToken += char;
            } else if (!inString) {
                if (char === '(') {
                    parenLevel++;
                    currentToken += char;
                } else if (char === ')') {
                    parenLevel--;
                    currentToken += char;
                } else if (char === ',' && parenLevel === 0) {
                    values.push(currentToken.trim());
                    currentToken = "";
                } else {
                    currentToken += char;
                }
            } else {
                currentToken += char;
            }
        }
        values.push(currentToken.trim());
        return values.filter(v => v.length > 0);
    }

    function parseColumns(content) {
        let columns = [];
        let currentToken = "";
        let parenLevel = 0;
        content = content.trim();
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            if (char === '(') {
                parenLevel++;
                currentToken += char;
            } else if (char === ')') {
                parenLevel--;
                currentToken += char;
            } else if (char === ',' && parenLevel === 0) {
                columns.push(currentToken.trim().replace(/"/g, ''));
                currentToken = "";
            } else {
                currentToken += char;
            }
        }
        columns.push(currentToken.trim().replace(/"/g, ''));
        return columns.filter(c => c.length > 0);
    }

    function parseJsonValue(sqlValue) {
        let jsonString = sqlValue.trim();
        if (jsonString.endsWith('::jsonb')) {
            jsonString = jsonString.slice(0, -'::jsonb'.length).trim();
        }
        if (jsonString.endsWith('::json')) {
            jsonString = jsonString.slice(0, -'::json'.length).trim();
        }
        if (jsonString.startsWith('jsonb ')) {
            jsonString = jsonString.slice('jsonb '.length).trim();
        }
        if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
            jsonString = jsonString.slice(1, -1);
            jsonString = jsonString.replace(/''/g, "'");
            jsonString = jsonString.replace(/(\r\n|\n|\r)/gm, " ");
            jsonString = jsonString.replace(/\u00A0/g, " ");
        }
        try {
            const jsonObject = JSON.parse(jsonString);
            if (jsonObject && typeof jsonObject === 'object' && !Array.isArray(jsonObject)) {
                const jsonKeys = Object.keys(jsonObject);
                return { jsonObject, jsonKeys };
            }
            return null;
        } catch (e) {
            console.warn(`Gagal parse JSON (ini wajar jika nilai bukan JSON): ${e.message}`, {sqlValue, jsonString});
            return null;
        }
    }

    function handleDetectValues() {
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
                    detectedMapping.push({
                        col: col,
                        val: val,
                        isJson: true,
                        originalJson: jsonInfo.jsonObject,
                        jsonKeys: jsonInfo.jsonKeys
                    });
                } else {
                    detectedMapping.push({ col: col, val: val, isJson: false });
                }
            }
            detectInfo.textContent = `Berhasil! Terdeteksi ${columns.length} kolom & nilai. Silakan unggah Excel.`;
        } else {
            for (let i = 0; i < values.length; i++) {
                const col = `Nilai #${i + 1}`;
                const val = values[i];
                const jsonInfo = parseJsonValue(val);
                if (jsonInfo) {
                    detectedMapping.push({
                        col: col,
                        val: val,
                        isJson: true,
                        originalJson: jsonInfo.jsonObject,
                        jsonKeys: jsonInfo.jsonKeys
                    });
                } else {
                    detectedMapping.push({ col: col, val: val, isJson: false });
                }
            }
            detectInfo.textContent = `Berhasil! Terdeteksi ${values.length} nilai (tanpa nama kolom). Silakan unggah Excel.`;
        }
        detectInfo.className = 'text-sm text-green-600 mt-2';
        updateMappingUI();
    }

    function handleExcelUpload(event) {
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

    function updateMappingUI() {
        if (detectedMapping.length === 0 || excelHeaders.length === 0) {
            return;
        }
        mappingTableBody.innerHTML = '';
        detectedMapping.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200';
            tr.dataset.mappingIndex = index;
            if (item.isJson) {
                tr.classList.add('json-main-row');
            }
            const tdCol = document.createElement('td');
            tdCol.className = 'p-2';
            tdCol.innerHTML = `<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded">${item.col}</code>`;
            const tdVal = document.createElement('td');
            tdVal.className = 'p-2 tooltip-cell';
            tdVal.setAttribute('data-full-value', item.val.replace(/"/g, '&quot;'));
            tdVal.innerHTML = `<code class="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value" title="Nilai acuan">${item.val}</code>`;
            const tdSelect = document.createElement('td');
            tdSelect.className = 'p-2';
            const select = document.createElement('select');
            select.className = 'w-full p-2 border border-gray-300 rounded-md excel-header';
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "-- Pilih Opsi --";
            const noChangeOption = document.createElement('option');
            noChangeOption.value = "__NO_CHANGE__";
            noChangeOption.textContent = "-- Tidak Ada Perubahan (Acuan) --";
            noChangeOption.selected = true;
            if (item.isJson) {
                tr.classList.add('json-main-row');
                select.appendChild(defaultOption);
                select.appendChild(noChangeOption);
                const sqlGroup = document.createElement('optgroup');
                sqlGroup.label = "Fungsi SQL";
                const uuidOption = document.createElement('option');
                uuidOption.value = "__UUID_V4__";
                uuidOption.textContent = "uuid_generate_v4()";
                sqlGroup.appendChild(uuidOption);
                select.appendChild(sqlGroup);
                const excelGroup = document.createElement('optgroup');
                excelGroup.label = "Header dari Excel (JSON Utuh)";
                excelHeaders.forEach(header => {
                    const option = document.createElement('option');
                    option.value = header;
                    option.textContent = header;
                    excelGroup.appendChild(option);
                });
                select.appendChild(excelGroup);
            } else {
                select.appendChild(defaultOption);
                select.appendChild(noChangeOption);
                const sqlGroup = document.createElement('optgroup');
                sqlGroup.label = "Fungsi SQL";
                const uuidOption = document.createElement('option');
                uuidOption.value = "__UUID_V4__";
                uuidOption.textContent = "uuid_generate_v4()";
                sqlGroup.appendChild(uuidOption);
                select.appendChild(sqlGroup);
                const excelGroup = document.createElement('optgroup');
                excelGroup.label = "Header dari Excel";
                excelHeaders.forEach(header => {
                    const option = document.createElement('option');
                    option.value = header;
                    option.textContent = header;
                    excelGroup.appendChild(option);
                });
                select.appendChild(excelGroup);
            }
            tdSelect.appendChild(select);
            tr.appendChild(tdCol);
            tr.appendChild(tdVal);
            tr.appendChild(tdSelect);
            mappingTableBody.appendChild(tr);
            if (item.isJson && item.jsonKeys) {
                item.jsonKeys.forEach(key => {
                    const subTr = document.createElement('tr');
                    subTr.className = 'border-b border-gray-200 json-subkey-row';
                    subTr.dataset.isSubkey = 'true';
                    subTr.dataset.parentIndex = index;
                    subTr.dataset.subkeyName = key;
                    const tdKey = document.createElement('td');
                    tdKey.className = 'p-2';
                    tdKey.innerHTML = `<code class="json-key-code px-2 py-1 rounded ml-4">${key}</code>`;
                    const tdSubVal = document.createElement('td');
                    tdSubVal.className = 'p-2 tooltip-cell';
                    const originalSubValue = item.originalJson[key];
                    tdSubVal.setAttribute('data-full-value', String(originalSubValue));
                    tdSubVal.innerHTML = `<code class="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value" title="Nilai acuan key">${String(originalSubValue)}</code>`;
                    const tdSubSelect = document.createElement('td');
                    tdSubSelect.className = 'p-2';
                    tdSubSelect.innerHTML = createDropdownHtml();
                    subTr.appendChild(tdKey);
                    subTr.appendChild(tdSubVal);
                    subTr.appendChild(tdSubSelect);
                    mappingTableBody.appendChild(subTr);
                });
            }
        });
        mappingSection.classList.remove('hidden');
        generateButton.classList.remove('hidden');
    }

    function createDropdownHtml() {
        let html = `<select class="w-full p-2 border border-gray-300 rounded-md excel-header">
                <option value="">-- Pilih Opsi --</option>
                <option value="__NO_CHANGE__" selected>-- Tidak Ada Perubahan (Acuan) --</option>
                <optgroup label="Header dari Excel">`;
        excelHeaders.forEach(header => {
            html += `<option value="${header}">${header}</option>`;
        });
        html += `</optgroup></select>`;
        return html;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function handleGenerateScript() {
        const template = sqlTemplateEl.value;
        const valuesRegex = /(\bVALUES\b\s*\()([\s\S]+?)(\)\s*;)/i;
        const match = template.match(valuesRegex);
        if (!match) {
            alert('Error: Tidak dapat menemukan klausa "VALUES (...) ;" dalam template. Pastikan formatnya benar.');
            return;
        }
        const scriptPrefix = template.substring(0, match.index) + match[1] + '\n  ';
        const scriptSuffix = '\n' + match[3] + '\n\n';
        const mappingRows = mappingTableBody.querySelectorAll('tr');
        let finalScript = "";
        excelData.forEach(row => {
            let newValues = [];
            let jsonBuilders = {};
            mappingRows.forEach(tr => {
                if (tr.dataset.isSubkey === 'true') {
                    const select = tr.querySelector('.excel-header');
                    const parentIndex = parseInt(tr.dataset.parentIndex, 10);
                    const subkeyName = tr.dataset.subkeyName;
                    const mappedTarget = select.value;
                    if (!jsonBuilders[parentIndex]) {
                        jsonBuilders[parentIndex] = {};
                    }
                    let subValue;
                    if (mappedTarget && mappedTarget !== "" && mappedTarget !== "__NO_CHANGE__") {
                        subValue = row[mappedTarget];
                    } else {
                        subValue = detectedMapping[parentIndex].originalJson[subkeyName];
                    }
                    jsonBuilders[parentIndex][subkeyName] = subValue;
                }
            });
            let mappingIndex = 0;
            mappingRows.forEach(tr => {
                if (tr.dataset.isSubkey === 'true') {
                    return;
                }
                const item = detectedMapping[mappingIndex];
                const select = tr.querySelector('.excel-header');
                const mappedTarget = select.value;
                let formattedValue;
                if (item.isJson) {
                    if (mappedTarget && mappedTarget !== "" && mappedTarget !== "__NO_CHANGE__") {
                        if (mappedTarget === "__UUID_V4__") {
                            formattedValue = "uuid_generate_v4()";
                        } else {
                            let value = row[mappedTarget];
                            if (value === null || typeof value === 'undefined') {
                                formattedValue = 'NULL';
                            } else {
                                const jsonString = (typeof value === 'object') ? JSON.stringify(value) : String(value);
                                formattedValue = `'${jsonString.replace(/'/g, "''")}'::jsonb`;
                            }
                        }
                    } else {
                        const newJsonObject = jsonBuilders[mappingIndex] || {};
                        const newJsonString = JSON.stringify(newJsonObject);
                        formattedValue = `'${newJsonString.replace(/'/g, "''")}'::jsonb`;
                    }
                } else {
                    if (!mappedTarget || mappedTarget === "" || mappedTarget === "__NO_CHANGE__") {
                        formattedValue = item.val;
                    } else if (mappedTarget === "__UUID_V4__") {
                        formattedValue = "uuid_generate_v4()";
                    } else {
                        let value = row[mappedTarget];
                        if (value === null || typeof value === 'undefined') {
                            formattedValue = 'NULL';
                        } else if (typeof value === 'number') {
                            formattedValue = value;
                        } else {
                            formattedValue = "'" + String(value).replace(/'/g, "''") + "'";
                        }
                    }
                }
                newValues.push(formattedValue);
                mappingIndex++;
            });
            finalScript += scriptPrefix + newValues.join(',\n  ') + scriptSuffix;
        });
        outputSql.value = finalScript;
        outputSection.classList.remove('hidden');
    }

    function copyToClipboard() {
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