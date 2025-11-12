function initApiRequestor() {
    const page = document.getElementById('ApiRequestor');
    if (!page) return;

    page.innerHTML = `
        <div class="tool-header">
            <h1>API Requestor (cURL Runner)</h1>
            <p>Buat permintaan HTTP dan lihat responsnya langsung dari browser.</p>
        </div>

        <div class="card" style="background-color: #fffbea; border-color: #fbd38d; margin-bottom: 1.5rem;">
            <strong style="color: #c05621;">Peringatan CORS:</strong>
            <p style="color: #744210; margin: 0.25rem 0;">
                Fitur ini tunduk pada batasan CORS browser. Permintaan ke API yang tidak mengizinkan domain ini (termasuk <code>localhost</code>) akan gagal. Ini adalah batasan keamanan browser, bukan bug.
            </p>
        </div>

        <div class="card" id="api-curl-importer" style="margin-bottom: 1.5rem; background-color: #f7fafc;">
            <label for="api-curl-input" class="label" style="font-size: 1.1rem;">Impor dari cURL</label>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                Tempel (paste) seluruh perintah cURL Anda di sini untuk mengisi form di bawah secara otomatis.
            </p>
            <textarea id="api-curl-input" class="textarea textarea-editor" rows="6" placeholder="curl 'https://api.example.com' -H 'Auth:...' --data-raw '...'"></textarea>
            <button id="api-parse-curl-btn" class="button primary" style="margin-top: 1rem;">
                <i class="fas fa-magic" style="margin-right: 0.5rem;"></i> Parse cURL
            </button>
        </div>

        <div class="card" style="margin-bottom: 1.5rem;">
            <div class="api-request-grid">
                <select id="api-method" class="select" style="max-width: 150px;">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                </select>
                <input type="text" id="api-url" class="input" placeholder="https://api.example.com/v1/users">
                <button id="api-send-btn" class="button primary">
                    <i class="fas fa-paper-plane" style="margin-right: 0.5rem;"></i> Kirim
                </button>
            </div>
            
            <div class="api-tabs-container" style="margin-top: 1.5rem;">
                <div class="api-tabs-nav">
                    <button class="api-tab-btn active" data-tab="headers">Headers</button>
                    <button class="api-tab-btn" data-tab="body">Body (JSON)</button>
                </div>
                
                <div class="api-tab-content active" id="tab-headers">
                    <div id="api-headers-list" style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
                        </div>
                    <button id="api-add-header-btn" class="button secondary" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">
                        <i class="fas fa-plus" style="margin-right: 0.5rem;"></i> Tambah Header
                    </button>
                </div>
                
                <div class="api-tab-content" id="tab-body">
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 0.5rem;">
                        <button id="api-beautify-json-btn" class="button secondary" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">
                            <i class="fas fa-magic" style="margin-right: 0.5rem;"></i>
                            Beautify JSON
                        </button>
                    </div>
                    <textarea id="api-body" class="textarea textarea-editor" rows="10" placeholder='{ "key": "value" }'></textarea>
                </div>
            </div>
        </div>

        <div class="card is-hidden" id="api-response-section">
            <h3 class="label">Respons</h3>
            <div id="api-response-status-bar" style="display: flex; gap: 1.5rem; margin-bottom: 1rem; font-size: 0.9rem;">
                <span id="api-status-label"></span>
                <span id="api-time-label"></span>
                <span id="api-size-label"></span>
            </div>
            
            <div class="api-tabs-container">
                <div class="api-tabs-nav">
                    <button class="api-tab-btn active" data-tab="response-body">Body</button>
                    <button class="api-tab-btn" data-tab="response-headers">Headers</button>
                </div>
                
                <div class="api-tab-content active" id="tab-response-body">
                    <pre id="api-response-body-output" class="textarea textarea-editor" style="background-color: #2d3748; color: #e2e8f0; min-height: 200px; max-height: 50vh; overflow: auto;"></pre>
                </div>
                
                <div class="api-tab-content" id="tab-response-headers">
                    <pre id="api-response-headers-output" class="textarea textarea-editor" style="background-color: #f7fafc; min-height: 200px; max-height: 50vh; overflow: auto;"></pre>
                </div>
            </div>
        </div>
    `;

    // --- Helper untuk Syntax Highlighting (dicuplik dari JSONFormatter) ---
    function highlightJsonSyntax(jsonString) {
        if (!jsonString) return '';
        jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return jsonString.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    // --- DOM Elements ---
    const methodEl = page.querySelector('#api-method');
    const urlEl = page.querySelector('#api-url');
    const sendBtn = page.querySelector('#api-send-btn');
    const headersListEl = page.querySelector('#api-headers-list');
    const addHeaderBtn = page.querySelector('#api-add-header-btn');
    const bodyEl = page.querySelector('#api-body');
    const responseSectionEl = page.querySelector('#api-response-section');
    const statusLabelEl = page.querySelector('#api-status-label');
    const timeLabelEl = page.querySelector('#api-time-label');
    const sizeLabelEl = page.querySelector('#api-size-label');
    const responseBodyOutputEl = page.querySelector('#api-response-body-output');
    const responseHeadersOutputEl = page.querySelector('#api-response-headers-output');
    const tabButtons = page.querySelectorAll('.api-tab-btn');
    const tabContents = page.querySelectorAll('.api-tab-content');
    
    // Elemen untuk cURL Parser
    const curlInputEl = page.querySelector('#api-curl-input');
    const parseCurlBtn = page.querySelector('#api-parse-curl-btn');

    // Elemen untuk Beautify
    const beautifyBtn = page.querySelector('#api-beautify-json-btn');

    // --- Tab Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            const isResponseTab = tabName.startsWith('response-');
            const prefix = isResponseTab ? 'response-' : '';
            
            page.querySelectorAll(`.api-tab-btn[data-tab^="${prefix}"]`).forEach(btn => btn.classList.remove('active'));
            page.querySelectorAll(`.api-tab-content[id^="tab-${prefix}"]`).forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            page.querySelector(`#tab-${tabName}`).classList.add('active');
        });
    });

    // --- Headers Logic ---
    function createHeaderRow(key = '', value = '') {
        const row = document.createElement('div');
        row.className = 'api-header-row';
        row.innerHTML = `
            <input type="text" class="input header-key" placeholder="Key" value="${key}">
            <input type="text" class="input header-value" placeholder="Value" value="${value}">
            <button class="button secondary remove-header-btn" title="Hapus header">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        row.querySelector('.remove-header-btn').addEventListener('click', () => row.remove());
        headersListEl.appendChild(row);
    }
    
    addHeaderBtn.addEventListener('click', () => createHeaderRow());
    createHeaderRow('Content-Type', 'application/json'); 
    createHeaderRow('Accept', 'application/json');

    // --- cURL Parser Logic ---
    function unquote(s) {
        if (!s) return s;
        if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
            return s.slice(1, -1);
        }
        return s;
    }

    function parseCurlCommand(curlString) {
        const result = {
            method: 'GET', // Default
            url: '',
            headers: {},
            body: ''
        };

        const singleLineCurl = curlString.replace(/\\\n/g, ' ').replace(/\s+/g, ' ');
        const tokens = singleLineCurl.match(/'[^']*'|"[^"]*"|\S+/g) || [];

        if (tokens.length === 0) {
            throw new Error("Perintah cURL tidak valid.");
        }
        
        let i = 0;
        if (tokens[i] === 'curl') {
            i++; 
        }

        while (i < tokens.length && !result.url) {
            if (!tokens[i].startsWith('-')) {
                result.url = unquote(tokens[i]);
            }
            i++;
        }

        for (; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token) {
                case '-X':
                case '--request':
                    result.method = unquote(tokens[i + 1]).toUpperCase();
                    i++;
                    break;
                
                case '-H':
                case '--header':
                    const header = unquote(tokens[i + 1]);
                    const separatorIndex = header.indexOf(':');
                    if (separatorIndex > -1) {
                        const key = header.substring(0, separatorIndex).trim();
                        const value = header.substring(separatorIndex + 1).trim();
                        result.headers[key] = value;
                    }
                    i++;
                    break;
                
                case '-d':
                case '--data':
                case '--data-raw':
                    result.body = unquote(tokens[i + 1]);
                    if (result.method === 'GET') {
                        result.method = 'POST';
                    }
                    i++;
                    break;
            }
        }
        
        return result;
    }

    parseCurlBtn.addEventListener('click', () => {
        const curlString = curlInputEl.value.trim();
        if (!curlString) {
            alert('Silakan tempel (paste) perintah cURL Anda terlebih dahulu.');
            return;
        }

        try {
            const parsed = parseCurlCommand(curlString);
            
            methodEl.value = parsed.method;
            urlEl.value = parsed.url;
            bodyEl.value = parsed.body;

            headersListEl.innerHTML = '';
            for (const [key, value] of Object.entries(parsed.headers)) {
                createHeaderRow(key, value);
            }
            
            if (!parsed.headers['Content-Type'] && !parsed.headers['content-type']) {
                createHeaderRow('Content-Type', 'application/json');
            }

            if (bodyEl.value) {
                beautifyBtn.click(); 
            }

            alert('cURL berhasil diparsing!');

        } catch (error) {
            alert('Gagal mem-parsing cURL: ' + error.message);
            console.error(error);
        }
    });
    
    // --- Beautify JSON Logic ---
    beautifyBtn.addEventListener('click', () => {
        const currentBody = bodyEl.value.trim();
        if (!currentBody) return;

        try {
            const jsonObj = JSON.parse(currentBody);
            const formattedJson = JSON.stringify(jsonObj, null, 2); // 2-space indent
            bodyEl.value = formattedJson;
        } catch (error) {
            // Jika JSON tidak valid, beri tahu pengguna
            alert('Gagal mem-beautify: JSON tidak valid.\n\n' + error.message);
        }
    });

    // --- Send Request Logic ---
    sendBtn.addEventListener('click', async () => {
        const url = urlEl.value.trim();
        const method = methodEl.value;
        if (!url) {
            alert('URL tidak boleh kosong.');
            return;
        }

        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="loader-spinner"></div> Mengirim...';
        responseSectionEl.classList.remove('is-hidden');
        statusLabelEl.textContent = 'Memuat...';
        statusLabelEl.style.color = 'var(--text-secondary)';
        timeLabelEl.textContent = '';
        sizeLabelEl.textContent = '';
        responseBodyOutputEl.innerHTML = '';
        responseHeadersOutputEl.textContent = '';

        // --- [PERBAIKAN DIMULAI] ---
        // Atur ulang tab respons ke "Body" setiap kali mengirim permintaan baru
        page.querySelectorAll('.api-tab-btn[data-tab^="response-"]').forEach(btn => btn.classList.remove('active'));
        page.querySelectorAll('.api-tab-content[id^="tab-response-"]').forEach(content => content.classList.remove('active'));
        page.querySelector('.api-tab-btn[data-tab="response-body"]').classList.add('active');
        page.querySelector('#tab-response-body').classList.add('active');
        // --- [PERBAIKAN SELESAI] ---

        const headers = new Headers();
        page.querySelectorAll('.api-header-row').forEach(row => {
            const key = row.querySelector('.header-key').value.trim();
            const value = row.querySelector('.header-value').value.trim();
            if (key) {
                headers.append(key, value);
            }
        });

        const requestOptions = {
            method: method,
            headers: headers
        };
        
        if (method !== 'GET' && method !== 'HEAD') {
            const body = bodyEl.value.trim();
            if (body) {
                requestOptions.body = body;
            }
        }

        const startTime = performance.now();
        
        try {
            const response = await fetch(url, requestOptions);
            const endTime = performance.now();
            
            const statusColor = response.ok ? 'var(--success-color)' : 'var(--danger-color)';
            statusLabelEl.innerHTML = `Status: <strong style="color: ${statusColor};">${response.status} ${response.statusText}</strong>`;
            
            timeLabelEl.innerHTML = `Waktu: <strong>${(endTime - startTime).toFixed(0)} ms</strong>`;

            let responseHeadersText = '';
            response.headers.forEach((value, key) => {
                responseHeadersText += `${key}: ${value}\n`;
            });
            responseHeadersOutputEl.textContent = responseHeadersText;

            const responseText = await response.text();
            let size = response.headers.get('content-length');
            if (!size) {
                size = new TextEncoder().encode(responseText).length; 
            }
            sizeLabelEl.innerHTML = `Ukuran: <strong>(${(size / 1024).toFixed(2)} KB)</strong>`;

            try {
                const json = JSON.parse(responseText);
                responseBodyOutputEl.innerHTML = highlightJsonSyntax(JSON.stringify(json, null, 2));
            } catch (e) {
                responseBodyOutputEl.textContent = responseText;
            }

        } catch (error) {
            const endTime = performance.now();
            statusLabelEl.innerHTML = `Status: <strong style="color: var(--danger-color);">Gagal Fetch</strong>`;
            timeLabelEl.innerHTML = `Waktu: <strong>${(endTime - startTime).toFixed(0)} ms</strong>`;
            responseBodyOutputEl.innerHTML = `<span class="json-error">${error.message}\n\n(Ini kemungkinan besar adalah error CORS. Periksa konsol browser [F12] untuk detailnya.)</span>`;
            console.error("API Requestor Error:", error);
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane" style="margin-right: 0.5rem;"></i> Kirim';
        }
    });
}