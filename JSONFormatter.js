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
                    <div id="json-input" class="textarea-editor" contenteditable="true" spellcheck="false" tabindex="0"></div>
                </div>
                
                <div class="controls flex flex-col" style="gap: 0.75rem; padding: 10px 0;">
                    <button id="btn-validate" class="button secondary">Validate</button>
                    <button id="btn-beautify" class="button primary">Beautify</button>
                    <button id="btn-minify" class="button secondary">Minify</button>
                    <select id="spaces" class="select">
                        <option value="2">2 spaces</option>
                        <option value="4" selected>4 spaces</option>
                        <option value="0">Compact</option>
                    </select>
                    
                    <label for="fileInput" class="button secondary">
                        <i class="fas fa-upload" style="margin-right: 0.5rem;"></i>
                        <span>Pilih File...</span>
                    </label>
                    <input id="fileInput" type="file" accept="application/json" class="is-hidden" />
                    
                    <button id="btn-load-url" class="button secondary">Load from URL</button>
                    <button id="btn-download" class="button secondary">Download</button>
                    <button id="btn-copy" class="button secondary">Copy Output</button>
                    <div class="dropdown">
                        <button id="convertBtn" class="button secondary">Convert to ▾</button>
                        <div id="convertMenu" class="dropdown-menu" style="display:none; position:relative; margin-top: 8px;">
                            <a href="#" id="to-xml">JSON → XML</a><br/>
                            <a href="#" id="to-csv">JSON → CSV</a><br/>
                            <a href="#" id="to-yaml">JSON → YAML</a>
                        </div>
                    </div>
                </div>

                <div class="editor-wrapper">
                    <div class="line-numbers" id="output-line-numbers"><span>1</span></div>
                    <div id="json-output" class="textarea-editor pre-output" contenteditable="true" spellcheck="false" tabindex="0"></div>
                </div>
            </div>
            <div id="message" style="padding:10px;color:#333"></div>
        </div>

        <div id="loadUrlModal" style="display:none; position:fixed; left:0; right:0; top:0; bottom:0; background:rgba(0,0,0,0.6); align-items:center; justify-content:center;">
            <div style="background:#fff; padding:12px; width:90%; max-width:600px; margin:auto;">
                <h4>Load JSON from URL</h4>
                <input id="urlInput" class="input" placeholder="https://example.com/data.json" style="width:100%"/><br/><br/>
                <button id="doLoadUrl" class="btn">Load</button>
                <button id="closeLoadUrl" class="btn">Close</button>
            </div>
        </div>
    `;

    // --- State & DOM Elements ---
    const input = document.getElementById('json-input');
    const output = document.getElementById('json-output');
    const msg = document.getElementById('message');
    const inputLn = document.getElementById('input-line-numbers');
    const outputLn = document.getElementById('output-line-numbers');
    const fileInput = document.getElementById('fileInput');
    const fileInputLabelSpan = fileInput.previousElementSibling.querySelector('span');
    
    // Timer untuk Debounce
    let inputLineTimer;
    let outputLineTimer;
    // Cache untuk jumlah baris
    let lastInputLines = 0;
    let lastOutputLines = 0;

    // --- [PERBAIKAN 1] Intercept Copy/Cut/Paste to force Plain Text ---
    
    function handlePlainTextPaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
    }

    function handlePlainTextCopyCut(e) {
        e.preventDefault();
        const selection = window.getSelection();
        const plainText = selection.toString();
        e.clipboardData.setData('text/plain', plainText);

        if (e.type === 'cut') {
            document.execCommand('delete');
        }
    }

    // Terapkan listener ke kedua editor
    input.addEventListener('paste', handlePlainTextPaste);
    input.addEventListener('copy', handlePlainTextCopyCut);
    input.addEventListener('cut', handlePlainTextCopyCut);

    output.addEventListener('paste', handlePlainTextPaste);
    output.addEventListener('copy', handlePlainTextCopyCut);
    output.addEventListener('cut', handlePlainTextCopyCut);
    

    // --- [PERBAIKAN 2] Intercept Keydown untuk 'Ctrl+A' dan 'Delete' (Anti-Lag) ---
    function handleKeyDown(e) {
        const isCtrl = e.ctrlKey || e.metaKey;

        if (isCtrl && e.key === 'a') { // Ctrl+A (Select All)
            e.preventDefault(); 
            const selection = window.getSelection();
            selection.selectAllChildren(e.target);
        }
        else if (isCtrl && e.key === 'Enter') { // Ctrl+Enter (Beautify)
            e.preventDefault();
            beautifyJSON();
        }
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                 e.preventDefault();
                 
                 // [PERBAIKAN 2.1] Cek apakah SEMUA teks dipilih
                 const isSelectAll = (selection.toString().length === e.target.textContent.length);
                 
                 if (isSelectAll) {
                     // Ini adalah cara TERCEPAT untuk mengosongkan editor
                     e.target.textContent = '';
                 } else {
                     // Ini adalah cara tercepat untuk menghapus SEBAGIAN
                     document.execCommand('insertText', false, '');
                 }
                 
                 // [PERBAIKAN 2.2] Paksa update line number setelah delete
                 if(e.target.id === 'json-input') {
                    clearTimeout(inputLineTimer);
                    inputLineTimer = setTimeout(() => updateLineNumbers(input, inputLn, true), 50);
                 } else {
                    clearTimeout(outputLineTimer);
                    outputLineTimer = setTimeout(() => updateLineNumbers(output, outputLn, true), 50);
                 }
            }
        }
    }

    // Terapkan listener keydown baru ke kedua editor
    input.addEventListener('keydown', handleKeyDown);
    output.addEventListener('keydown', handleKeyDown);
    // --- End of PERBAIKAN ---


    // restore last input
    const LS_KEY = 'jsonformatter.last';
    const last = localStorage.getItem(LS_KEY);
    if(last) input.textContent = last;

    function setMessage(s){ msg.textContent = s || ''; }

    // --- [PERBAIKAN 3] Optimasi fungsi updateLineNumbers ---
    function updateLineNumbers(element, container, forceUpdate = false){
        const text = element.textContent;
        
        // [PERBAIKAN 3.1] Gunakan regex match (jauh lebih cepat dari split())
        const matches = text.match(/\n/g);
        const lines = matches ? matches.length + 1 : 1;
        
        const cache = (element.id === 'json-input') ? lastInputLines : lastOutputLines;
        
        // [PERBAIKAN 3.2] Hanya update DOM jika jumlah baris berubah (atau dipaksa)
        if (lines === cache && !forceUpdate) {
            return;
        }
        
        // Simpan cache baru
        if(element.id === 'json-input') { lastInputLines = lines; }
        else { lastOutputLines = lines; }
        
        // [PERBAIKAN 3.3] Buat satu string HTML, bukan jutaan node
        // Menggunakan Array(lines) untuk membuat array lalu di-map JAUH LEBIH CEPAT
        // daripada loop for manual yang menggabungkan string.
        const LINE_LIMIT = 20000; // Batas wajar untuk render DOM
        let actualLines = lines;
        if (lines > LINE_LIMIT) {
            actualLines = LINE_LIMIT;
        }

        const arr = new Array(actualLines);
        for (let i = 0; i < actualLines; i++) {
            arr[i] = `<span>${i + 1}</span>`;
        }

        let lineHtml = arr.join('\n');

        if (lines > LINE_LIMIT) {
            lineHtml += `\n<span>...</span>\n<span>${lines}</span>`; // Tampilkan ... dan total baris di akhir
        }
        
        container.innerHTML = lineHtml;
    }
    
    function syncScroll(src, dst){
        dst.scrollTop = src.scrollTop;
    }

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    function getOutputRawText(){
        return output.textContent || output.innerText || '';
    }

    function getInputRawText(){
        return input.textContent || input.innerText || '';
    }

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

    function validateJSON(){
        const txt = getInputRawText();
        try{ JSON.parse(txt); setMessage('✅ JSON valid'); return true; }
        catch(e){ setMessage('❌ '+e.message); return false; }
    }

    // --- [PERBAIKAN 4] Pisahkan update teks dan update UI ---
    function formatText(rawText, sp) {
        try {
            const obj = JSON.parse(rawText);
            return sp === 0 ? JSON.stringify(obj) : JSON.stringify(obj, null, sp);
        } catch(e) {
            setMessage('❌ '+e.message);
            return null;
        }
    }

    function beautifyJSON(){
        const txt = getInputRawText();
        const sp = +document.getElementById('spaces').value;
        const prettyJson = formatText(txt, sp);
        
        if (prettyJson === null) return;
            
        const highlightedJson = highlightJsonSyntax(prettyJson);
        
        output.innerHTML = highlightedJson;
        input.innerHTML = highlightedJson;
        
        // Paksa update line numbers
        updateLineNumbers(output, outputLn, true);
        updateLineNumbers(input, inputLn, true);
        
        setMessage('Beautified — shown in Output');
        localStorage.setItem(LS_KEY, prettyJson);
    }

    function minifyJSON(){
        const txt = getInputRawText();
        const minifiedJson = formatText(txt, 0);

        if (minifiedJson === null) return;

        output.textContent = minifiedJson;
        input.textContent = minifiedJson;
        
        // Paksa update line numbers
        updateLineNumbers(output, outputLn, true);
        updateLineNumbers(input, inputLn, true);
        
        setMessage('Minified — shown in Output');
        localStorage.setItem(LS_KEY, minifiedJson);
    }
    // --- End of PERBAIKAN 4 ---

    function toOutput(){
        output.textContent = getInputRawText();
        updateLineNumbers(output, outputLn, true);
        setMessage('Copied input to output');
    }

    function downloadOutput(){
        const content = getOutputRawText() || getInputRawText();
        const blob = new Blob([content], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'data.json';
        document.body.appendChild(a); a.click(); a.remove();
    }

    function copyOutput(){
        const txt = getOutputRawText() || getInputRawText();
        navigator.clipboard.writeText(txt).then(()=> setMessage('Copied to clipboard ✅')).catch(e=> setMessage('Copy failed: '+e));
    }

    // --- (Fungsi konverter CSV/XML/YAML tidak berubah) ---
    function jsonToCsv(json){
        let arr;
        if(Array.isArray(json)) arr = json;
        else if(typeof json === 'object'){
            const firstArray = Object.values(json).find(v=>Array.isArray(v));
            if(firstArray) arr = firstArray;
            else throw new Error('Root is not an array; cannot convert to CSV');
        }else throw new Error('Unsupported JSON structure for CSV conversion');
        if(arr.length===0) return '';
        const keys = Array.from(arr.reduce((s,o)=>{ Object.keys(o||{}).forEach(k=>s.add(k)); return s; }, new Set()));
        const rows = [keys.join(',')];
        for(const item of arr) rows.push(keys.map(k=>escapeCsv(item[k])).join(','));
        return rows.join('\n');
    }
    function escapeCsv(val){ if(val==null) return ''; const s = String(val); if(/[\",\n]/.test(s)) return '\"'+s.replace(/\"/g,'\"\"')+'\"'; return s; }

    function jsonToXml(obj){
        function convert(o){
            if(typeof o !== 'object' || o === null) return escapeHtml(String(o));
            if(Array.isArray(o)) return o.map(v=>'<item>'+convert(v)+'</item>').join('');
            return Object.keys(o).map(k=>'<'+k+'>'+convert(o[k])+'</'+k+'>').join('');
        }
        return '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<root>'+convert(obj)+'</root>';
    }

    function jsonToYaml(obj, indent=0){
        const pad = ' '.repeat(indent);
        if(obj === null) return 'null';
        if(Array.isArray(obj)) return obj.map(v=>pad+'- '+jsonToYaml(v, indent+2).trim()).join('\n');
        if(typeof obj === 'object') return Object.entries(obj).map(([k,v])=>{
            if(typeof v === 'object') return pad + k + ':\n' + jsonToYaml(v, indent+2);
            return pad + k + ': ' + String(v);
        }).join('\n');
        return String(obj);
    }
    // --- (Akhir fungsi konverter) ---

    // Bind events
    document.getElementById('btn-validate').addEventListener('click', validateJSON);
    document.getElementById('btn-beautify').addEventListener('click', beautifyJSON);
    document.getElementById('btn-minify').addEventListener('click', minifyJSON);
    document.getElementById('btn-download').addEventListener('click', downloadOutput);
    document.getElementById('btn-copy').addEventListener('click', copyOutput);

    document.getElementById('to-xml').addEventListener('click', function(e){
        e.preventDefault();
        try{ const obj = JSON.parse(getInputRawText()); output.textContent = jsonToXml(obj); updateLineNumbers(output, outputLn, true); setMessage('Converted to XML'); }
        catch(err){ setMessage('❌ '+err.message); }
    });
    document.getElementById('to-csv').addEventListener('click', function(e){
        e.preventDefault();
        try{ const obj = JSON.parse(getInputRawText()); output.textContent = jsonToCsv(obj); updateLineNumbers(output, outputLn, true); setMessage('Converted to CSV'); }
        catch(err){ setMessage('❌ '+err.message); }
    });
    document.getElementById('to-yaml').addEventListener('click', function(e){
        e.preventDefault();
        try{ const obj = JSON.parse(getInputRawText()); output.textContent = jsonToYaml(obj); updateLineNumbers(output, outputLn, true); setMessage('Converted to YAML'); }
        catch(err){ setMessage('❌ '+err.message); }
    });

    // Toggle convert menu
    document.getElementById('convertBtn').addEventListener('click', function(){ const m=document.getElementById('convertMenu'); m.style.display = m.style.display === 'none' ? 'block' : 'none'; });

    // File input
    fileInput.addEventListener('change', function(e){
        const f = e.target.files[0]; if(!f) return;
        fileInputLabelSpan.textContent = f.name;
        const r = new FileReader(); 
        r.onload = ()=>{ 
            input.textContent = r.result; 
            updateLineNumbers(input, inputLn, true); 
            setMessage('File loaded'); 
        }; 
        r.readAsText(f);
    });

    // Load URL modal handlers
    document.getElementById('btn-load-url').addEventListener('click', ()=> document.getElementById('loadUrlModal').style.display='flex');
    document.getElementById('closeLoadUrl').addEventListener('click', ()=> document.getElementById('loadUrlModal').style.display='none');
    document.getElementById('doLoadUrl').addEventListener('click', function(){
        const url = document.getElementById('urlInput').value.trim(); if(!url) return setMessage('Please enter URL');
        fetch(url).then(r=>r.text()).then(txt=>{ 
            input.textContent = txt; 
            updateLineNumbers(input, inputLn, true); 
            document.getElementById('loadUrlModal').style.display='none'; 
            setMessage('Loaded from URL'); 
        }).catch(e=>setMessage('Load failed: '+e));
    });

    // simple sync of line numbers on input and scroll
    input.addEventListener('scroll', ()=> syncScroll(input, inputLn) );
    output.addEventListener('scroll', ()=> syncScroll(output, outputLn) );
    
    // [PERBAIKAN 3] Terapkan Debounce pada 'input' event
    
    let savTimer;
    input.addEventListener('input', ()=>{ 
        clearTimeout(inputLineTimer);
        // Tunda update line number agar paste terasa instan
        inputLineTimer = setTimeout(() => updateLineNumbers(input, inputLn), 200); 
        
        clearTimeout(savTimer); 
        savTimer = setTimeout(()=> localStorage.setItem(LS_KEY, input.textContent), 800); 
    });
    
    output.addEventListener('input', ()=>{
        clearTimeout(outputLineTimer);
        // Tunda update line number agar paste terasa instan
        outputLineTimer = setTimeout(() => updateLineNumbers(output, outputLn), 200); 
    });

    // Panggil di awal untuk inisialisasi
    updateLineNumbers(input, inputLn, true);
    updateLineNumbers(output, outputLn, true);

    // (Listener keydown lama diganti oleh handleKeyDown)
}