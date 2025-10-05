function initJsonValueExtractor() {
    const page = document.getElementById('JsonValueExtractor');
    page.innerHTML = `
        <div class="tool-header">
            <h1>JSON Value Extractor</h1>
            <p>Ekstrak nilai dari JSON dan format untuk klausa SQL IN.</p>
        </div>
        <div class="card">
            <div class="grid grid-cols-2">
                <div class="flex flex-col" style="gap: 1.5rem;">
                    <div>
                        <label for="json-input" class="label">1. Tempelkan JSON Anda di sini</label>
                        <textarea id="json-input" rows="12" class="textarea textarea-editor" placeholder='[{"id": "abc"}, {"id": "def"}]'></textarea>
                    </div>
                    <div>
                        <label for="key-input" class="label">2. Masukkan Key yang Dicari</label>
                        <input type="text" id="key-input" class="input" placeholder="contoh: ticketGroupId">
                    </div>
                    <div>
                        <label for="filter-key-input" class="label">3. Filter (Opsional)</label>
                        <div class="flex" style="gap: 0.5rem;">
                            <input type="text" id="filter-key-input" class="input" placeholder="Key, cth: branchName">
                            <input type="text" id="filter-value-input" class="input" placeholder="Value, cth: BOGOR R4">
                        </div>
                    </div>
                    <button id="extract-btn" class="button primary">
                        Ekstrak Nilai
                    </button>
                </div>

                <div class="flex flex-col">
                    <label for="result-output" class="label">4. Hasil dalam Format SQL</label>
                    <div style="position: relative; flex-grow: 1;">
                        <textarea id="result-output" rows="18" class="textarea textarea-editor" readonly placeholder="'nilai1',\\n'nilai2',\\n'nilai3'"></textarea>
                        <button id="copy-btn" class="button secondary" style="position: absolute; top: 8px; right: 8px; padding: 0.25rem 0.6rem; font-size: 0.8rem;">
                            Salin
                        </button>
                    </div>
                    <div id="status-message" class="text-center" style="margin-top: 1rem; min-height: 20px;"></div>
                </div>
            </div>
        </div>
    `;

    // --- JavaScript Logic ---
    const jsonInput = page.querySelector('#json-input');
    const keyInput = page.querySelector('#key-input');
    const filterKeyInput = page.querySelector('#filter-key-input');
    const filterValueInput = page.querySelector('#filter-value-input');
    const extractBtn = page.querySelector('#extract-btn');
    const resultOutput = page.querySelector('#result-output');
    const copyBtn = page.querySelector('#copy-btn');
    const statusMessage = page.querySelector('#status-message');

    // --- PERBAIKAN: Fungsi untuk mencari array data utama ---
    function findDataArray(data) {
        if (Array.isArray(data)) {
            return data;
        }
        if (typeof data === 'object' && data !== null) {
            const commonKeys = ['data', 'payload', 'items', 'results', 'records', 'value'];
            for (const key of commonKeys) {
                if (data[key] && Array.isArray(data[key])) {
                    return data[key];
                }
            }
            if (data.payload && typeof data.payload === 'object') {
                const nestedData = findDataArray(data.payload);
                if (nestedData) return nestedData;
            }
        }
        return [data];
    }

    extractBtn.addEventListener('click', () => {
        const jsonString = jsonInput.value.trim();
        const keyToFind = keyInput.value.trim();
        const filterKey = filterKeyInput.value.trim();
        const filterValue = filterValueInput.value.trim();
        const hasFilter = filterKey && filterValue;
        
        resultOutput.value = '';
        statusMessage.textContent = '';

        if (!jsonString) {
            showError("Input JSON tidak boleh kosong.");
            return;
        }

        if (!keyToFind) {
            showError("Key yang dicari tidak boleh kosong.");
            return;
        }

        let jsonData;
        try {
            const sanitizedJson = jsonString.replace(/,\\s*([}\]])/g, '$1');
            jsonData = JSON.parse(sanitizedJson);
        } catch (error) {
             try {
                const wrappedJson = `[${jsonString.trim().replace(/}\\s*,\\s*{/g, '},{')}]`;
                jsonData = JSON.parse(wrappedJson);
             } catch (finalError) {
                showError(`Format JSON tidak valid. Pastikan data lengkap.`);
                console.error("JSON Parse Error:", finalError);
                return;
             }
        }

        // --- PERBAIKAN: Gunakan fungsi findDataArray untuk mendapatkan records ---
        const records = findDataArray(jsonData);
        const values = new Set();

        function findAllValuesForKey(data, key, resultSet) {
            if (Array.isArray(data)) {
                data.forEach(item => findAllValuesForKey(item, key, resultSet));
            } else if (typeof data === 'object' && data !== null) {
                for (const currentKey in data) {
                    if (Object.prototype.hasOwnProperty.call(data, currentKey)) {
                        if (currentKey === key) {
                            resultSet.add(data[currentKey]);
                        }
                        if (typeof data[currentKey] === 'object') {
                            findAllValuesForKey(data[currentKey], key, resultSet);
                        }
                    }
                }
            }
        }
        
        records.forEach(record => {
            if (hasFilter) {
                const filterValuesFound = new Set();
                findAllValuesForKey(record, filterKey, filterValuesFound);

                if (Array.from(filterValuesFound).some(val => String(val) === filterValue)) {
                    findAllValuesForKey(record, keyToFind, values);
                }
            } else {
                findAllValuesForKey(record, keyToFind, values);
            }
        });
        
        const uniqueValues = Array.from(values);

        if (uniqueValues.length === 0) {
            let errorMsg = `Key "${keyToFind}" tidak ditemukan.`;
            if (hasFilter) {
                errorMsg += ` dengan filter "${filterKey}" = "${filterValue}".`;
            }
            showError(errorMsg);
            return;
        }

        const formattedValues = uniqueValues.map(value => {
            const escapedValue = String(value).replace(/'/g, "''");
            return `'${escapedValue}'`;
        }).join(',\n');
        
        resultOutput.value = formattedValues;
        showSuccess(`Berhasil menemukan ${uniqueValues.length} nilai unik.`);
    });
    
    copyBtn.addEventListener('click', () => {
        if (!resultOutput.value) return;
        navigator.clipboard.writeText(resultOutput.value).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Disalin!';
            showSuccess('Hasil disalin ke clipboard!');
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            showError('Gagal menyalin.');
        });
    });

    function showError(message) {
        statusMessage.textContent = message;
        statusMessage.style.color = 'var(--danger-color)';
    }
    
    function showSuccess(message) {
        statusMessage.textContent = message;
        statusMessage.style.color = 'var(--success-color)';
    }
}