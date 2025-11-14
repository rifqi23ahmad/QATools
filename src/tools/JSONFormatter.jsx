// src/tools/JSONFormatter.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

function JsonFormatter() {
  // --- State & DOM Elements (Tidak berubah) ---
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [fileLabel, setFileLabel] = useState('Pilih File...');

  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const inputLnRef = useRef(null);
  const outputLnRef = useRef(null);
  const urlInputRef = useRef(null);
  const spacesRef = useRef(null);
  const fileInputRef = useRef(null);

  const inputLineTimer = useRef(null);
  const outputLineTimer = useRef(null);
  const lastInputLines = useRef(0);
  const lastOutputLines = useRef(0);
  const savTimer = useRef(null);
  const LS_KEY = 'jsonformatter.last';

  // --- [PERBAIKAN 3] Optimasi updateLineNumbers (Tidak berubah) ---
  const updateLineNumbers = useCallback((element, container, cacheRef, forceUpdate = false) => {
    if (!element || !container) return;
    const text = element.textContent || '';
    
    const matches = text.match(/\n/g);
    const lines = matches ? matches.length + 1 : 1;
    
    const cache = cacheRef.current;
    
    if (lines === cache && !forceUpdate) {
      return;
    }
    
    cacheRef.current = lines;
    
    const LINE_LIMIT = 20000;
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
      lineHtml += `\n<span>...</span>\n<span>${lines}</span>`;
    }
    
    container.innerHTML = lineHtml;
  }, []);

  // --- Fungsi Helper Utama (Tidak berubah) ---
  const getInputRawText = useCallback(() => {
    return inputRef.current?.textContent || '';
  }, []);

  const getOutputRawText = useCallback(() => {
    return outputRef.current?.textContent || '';
  }, []);

  const highlightJsonSyntax = useCallback((jsonString) => {
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
  }, []);

  const formatText = useCallback((rawText, sp) => {
    try {
      const obj = JSON.parse(rawText);
      setMessage('✅ JSON valid');
      return sp === 0 ? JSON.stringify(obj) : JSON.stringify(obj, null, sp);
    } catch (e) {
      setMessage('❌ ' + e.message);
      return null;
    }
  }, []);

  // --- Fungsi Tombol (Tidak berubah) ---
  const validateJSON = useCallback(() => {
    const txt = getInputRawText();
    try {
      JSON.parse(txt);
      setMessage('✅ JSON valid');
      return true;
    } catch (e) {
      setMessage('❌ ' + e.message);
      return false;
    }
  }, [getInputRawText]);

  const beautifyJSON = useCallback(() => {
    const txt = getInputRawText();
    const sp = +(spacesRef.current?.value || '4');
    const prettyJson = formatText(txt, sp);
    
    if (prettyJson === null || !inputRef.current || !outputRef.current) return;
        
    const highlightedJson = highlightJsonSyntax(prettyJson);
    
    outputRef.current.innerHTML = highlightedJson;
    inputRef.current.innerHTML = highlightedJson;
    
    updateLineNumbers(outputRef.current, outputLnRef.current, lastOutputLines, true);
    updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines, true);
    
    setMessage('Beautified — shown in Output');
    localStorage.setItem(LS_KEY, prettyJson);
  }, [getInputRawText, formatText, highlightJsonSyntax, updateLineNumbers]);

  const minifyJSON = useCallback(() => {
    const txt = getInputRawText();
    const minifiedJson = formatText(txt, 0);

    if (minifiedJson === null || !inputRef.current || !outputRef.current) return;

    outputRef.current.textContent = minifiedJson;
    inputRef.current.textContent = minifiedJson;
    
    updateLineNumbers(outputRef.current, outputLnRef.current, lastOutputLines, true);
    updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines, true);
    
    setMessage('Minified — shown in Output');
    localStorage.setItem(LS_KEY, minifiedJson);
  }, [getInputRawText, formatText, updateLineNumbers]);

  const downloadOutput = useCallback(() => {
    const content = getOutputRawText() || getInputRawText();
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, [getOutputRawText, getInputRawText]);

  const copyOutput = useCallback(() => {
    const txt = getOutputRawText() || getInputRawText();
    navigator.clipboard.writeText(txt)
      .then(() => setMessage('Copied to clipboard ✅'))
      .catch(e => setMessage('Copy failed: ' + e));
  }, [getOutputRawText, getInputRawText]);

  const escapeCsv = (val) => {
    if (val == null) return '';
    const s = String(val);
    if (/[\",\n]/.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
    return s;
  };
  const jsonToCsv = (json) => {
    let arr;
    if (Array.isArray(json)) arr = json;
    else if (typeof json === 'object') {
      const firstArray = Object.values(json).find(v => Array.isArray(v));
      if (firstArray) arr = firstArray;
      else throw new Error('Root is not an array; cannot convert to CSV');
    } else throw new Error('Unsupported JSON structure for CSV conversion');
    if (arr.length === 0) return '';
    const keys = Array.from(arr.reduce((s, o) => { Object.keys(o || {}).forEach(k => s.add(k)); return s; }, new Set()));
    const rows = [keys.join(',')];
    for (const item of arr) rows.push(keys.map(k => escapeCsv(item[k])).join(','));
    return rows.join('\n');
  };
  const jsonToXml = (obj) => {
    const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function convert(o) {
      if (typeof o !== 'object' || o === null) return escapeHtml(String(o));
      if (Array.isArray(o)) return o.map(v => '<item>' + convert(v) + '</item>').join('');
      return Object.keys(o).map(k => '<' + k + '>' + convert(o[k]) + '</' + k + '>').join('');
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n<root>' + convert(obj) + '</root>';
  };
  const jsonToYaml = (obj, indent = 0) => {
    const pad = ' '.repeat(indent);
    if (obj === null) return 'null';
    if (Array.isArray(obj)) return obj.map(v => pad + '- ' + jsonToYaml(v, indent + 2).trim()).join('\n');
    if (typeof obj === 'object') return Object.entries(obj).map(([k, v]) => {
      if (typeof v === 'object' && v !== null) return pad + k + ':\n' + jsonToYaml(v, indent + 2);
      return pad + k + ': ' + String(v);
    }).join('\n');
    return String(obj);
  };

  const handleConvert = (type) => {
    (e) => e.preventDefault();
    setShowConvertMenu(false);
    try {
      const obj = JSON.parse(getInputRawText());
      let result = '';
      if (type === 'xml') {
        result = jsonToXml(obj);
        setMessage('Converted to XML');
      } else if (type === 'csv') {
        result = jsonToCsv(obj);
        setMessage('Converted to CSV');
      } else if (type === 'yaml') {
        result = jsonToYaml(obj);
        setMessage('Converted to YAML');
      }
      if (outputRef.current) {
        outputRef.current.textContent = result;
        updateLineNumbers(outputRef.current, outputLnRef.current, lastOutputLines, true);
      }
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
  };

  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileLabel(f.name);
    const r = new FileReader();
    r.onload = () => {
      if (inputRef.current) {
        inputRef.current.textContent = r.result;
        updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines, true);
        setMessage('File loaded');
      }
    };
    r.readAsText(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [updateLineNumbers]);

  const handleLoadUrl = useCallback(() => {
    const url = urlInputRef.current?.value.trim();
    if (!url) return setMessage('Please enter URL');
    
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.text();
      })
      .then(txt => {
        if (inputRef.current) {
          inputRef.current.textContent = txt;
          updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines, true);
        }
        setShowModal(false);
        setMessage('Loaded from URL');
      })
      .catch(e => setMessage('Load failed: ' + e.message));
  }, [updateLineNumbers]);


  // --- [PERBAIKAN 1 & 2] Event Handlers (didefinisikan dengan useCallback) ---

  // ##################################################
  // ### PERUBAHAN DI SINI ###
  // ##################################################
  const handlePlainTextPaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // MENGGANTI: document.execCommand('insertText', false, text);
    // DENGAN:
    if (e.target) {
      e.target.textContent = text;
    }
    // Ini akan mengganti seluruh konten, yang jauh lebih cepat
    // dan merupakan perilaku yang diinginkan untuk formatter.

  }, []); // dependensi kosong karena tidak bergantung pada state/props
  // ##################################################
  // ### AKHIR PERUBAHAN ###
  // ##################################################

  const handlePlainTextCopyCut = useCallback((e) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection) return;
    const plainText = selection.toString();
    e.clipboardData.setData('text/plain', plainText);

    if (e.type === 'cut') {
      document.execCommand('delete');
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const target = e.target;

    if (isCtrl && e.key === 'a') {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection) return;
      selection.selectAllChildren(target);
    } else if (isCtrl && (e.key === 'Enter' || e.key === 'enter')) {
      e.preventDefault();
      beautifyJSON();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
        const isSelectAll = (selection.toString().length === (target.textContent || '').length);
        
        if (isSelectAll) {
          target.textContent = '';
        } else {
          document.execCommand('insertText', false, '');
        }
        
        if (target.id === 'json-input') {
          clearTimeout(inputLineTimer.current);
          inputLineTimer.current = setTimeout(() => updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines, true), 50);
        } else {
          clearTimeout(outputLineTimer.current);
          outputLineTimer.current = setTimeout(() => updateLineNumbers(outputRef.current, outputLnRef.current, lastOutputLines, true), 50);
        }
      }
    }
  }, [beautifyJSON, updateLineNumbers]);

  const syncInputScroll = useCallback(() => {
    if (inputRef.current && inputLnRef.current) {
      inputLnRef.current.scrollTop = inputRef.current.scrollTop;
    }
  }, []);

  const syncOutputScroll = useCallback(() => {
    if (outputRef.current && outputLnRef.current) {
      outputLnRef.current.scrollTop = outputRef.current.scrollTop;
    }
  }, []);

  const handleInput = useCallback(() => {
    clearTimeout(inputLineTimer.current);
    inputLineTimer.current = setTimeout(() => updateLineNumbers(inputRef.current, inputLnRef.current, lastInputLines), 200);
    
    clearTimeout(savTimer.current);
    savTimer.current = setTimeout(() => {
      if (inputRef.current) localStorage.setItem(LS_KEY, inputRef.current.textContent || '');
    }, 800);
  }, [updateLineNumbers]);

  const handleOutputInput = useCallback(() => {
    clearTimeout(outputLineTimer.current);
    outputLineTimer.current = setTimeout(() => updateLineNumbers(outputRef.current, outputLnRef.current, lastOutputLines), 200);
  }, [updateLineNumbers]);

  
  // --- useEffect untuk Mount Logic (Tidak berubah) ---
  useEffect(() => {
    const last = localStorage.getItem(LS_KEY);
    const inputEl = inputRef.current;
    const outputEl = outputRef.current;
    const inputLnEl = inputLnRef.current;
    const outputLnEl = outputLnRef.current;

    if (!inputEl || !outputEl || !inputLnEl || !outputLnEl) return;

    if (last) {
      inputEl.textContent = last;
    }
    updateLineNumbers(inputEl, inputLnEl, lastInputLines, true);
    updateLineNumbers(outputEl, outputLnEl, lastOutputLines, true);

    // --- Pasang Event Listener NATIVE ---
    inputEl.addEventListener('paste', handlePlainTextPaste);
    inputEl.addEventListener('copy', handlePlainTextCopyCut);
    inputEl.addEventListener('cut', handlePlainTextCopyCut);
    inputEl.addEventListener('keydown', handleKeyDown);
    inputEl.addEventListener('scroll', syncInputScroll);
    inputEl.addEventListener('input', handleInput);

    outputEl.addEventListener('paste', handlePlainTextPaste);
    outputEl.addEventListener('copy', handlePlainTextCopyCut);
    outputEl.addEventListener('cut', handlePlainTextCopyCut);
    outputEl.addEventListener('keydown', handleKeyDown);
    outputEl.addEventListener('scroll', syncOutputScroll);
    outputEl.addEventListener('input', handleOutputInput);

    // --- Fungsi Cleanup ---
    return () => {
      inputEl.removeEventListener('paste', handlePlainTextPaste);
      inputEl.removeEventListener('copy', handlePlainTextCopyCut);
      inputEl.removeEventListener('cut', handlePlainTextCopyCut);
      inputEl.removeEventListener('keydown', handleKeyDown);
      inputEl.removeEventListener('scroll', syncInputScroll);
      inputEl.removeEventListener('input', handleInput);

      outputEl.removeEventListener('paste', handlePlainTextPaste);
      outputEl.removeEventListener('copy', handlePlainTextCopyCut);
      outputEl.removeEventListener('cut', handlePlainTextCopyCut);
      outputEl.removeEventListener('keydown', handleKeyDown);
      outputEl.removeEventListener('scroll', syncOutputScroll);
      outputEl.removeEventListener('input', handleOutputInput);
    };
  }, [ 
      handlePlainTextPaste, 
      handlePlainTextCopyCut, 
      handleKeyDown, 
      syncInputScroll, 
      handleInput, 
      syncOutputScroll, 
      handleOutputInput,
      updateLineNumbers
  ]);
  

  return (
    // --- JSX (Render) tidak berubah ---
    <div id="JsonFormatter">
      <div className="tool-header">
        <h1>JSON Formatter</h1>
        <p>Rapikan, validasi, dan kompres data JSON Anda dengan mudah.</p>
      </div>
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px 1fr', alignItems: 'start' }}>
          
          <div className="editor-wrapper">
            <div className="line-numbers" id="input-line-numbers" ref={inputLnRef}><span>1</span></div>
            <div 
              id="json-input" 
              className="textarea-editor" 
              contentEditable={true} 
              spellCheck={false} 
              tabIndex="0"
              ref={inputRef}
            ></div>
          </div>
          
          <div className="controls flex flex-col" style={{ gap: '0.75rem', padding: '10px 0' }}>
            <button id="btn-validate" className="button secondary" onClick={validateJSON}>Validate</button>
            <button id="btn-beautify" className="button primary" onClick={beautifyJSON}>Beautify</button>
            <button id="btn-minify" className="button secondary" onClick={minifyJSON}>Minify</button>
            <select id="spaces" className="select" ref={spacesRef} defaultValue="4">
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="0">Compact</option>
            </select>
            
            <label htmlFor="fileInput" className="button secondary">
              <i className="fas fa-upload" style={{ marginRight: '0.5rem' }}></i>
              <span>{fileLabel}</span>
            </label>
            <input 
              id="fileInput" 
              type="file" 
              accept="application/json" 
              className="is-hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            
            <button id="btn-load-url" className="button secondary" onClick={() => setShowModal(true)}>Load from URL</button>
            <button id="btn-download" className="button secondary" onClick={downloadOutput}>Download</button>
            <button id="btn-copy" className="button secondary" onClick={copyOutput}>Copy Output</button>
            <div className="dropdown">
              <button id="convertBtn" className="button secondary" onClick={() => setShowConvertMenu(s => !s)}>Convert to ▾</button>
              <div id="convertMenu" className="dropdown-menu" style={{ display: showConvertMenu ? 'block' : 'none', position: 'relative', marginTop: '8px' }}>
                <a href="#" id="to-xml" onClick={(e) => { e.preventDefault(); handleConvert('xml'); }}>JSON → XML</a><br/>
                <a href="#" id="to-csv" onClick={(e) => { e.preventDefault(); handleConvert('csv'); }}>JSON → CSV</a><br/>
                <a href="#" id="to-yaml" onClick={(e) => { e.preventDefault(); handleConvert('yaml'); }}>JSON → YAML</a>
              </div>
            </div>
          </div>

          <div className="editor-wrapper">
            <div className="line-numbers" id="output-line-numbers" ref={outputLnRef}><span>1</span></div>
            <div 
              id="json-output" 
              className="textarea-editor pre-output" 
              contentEditable={true} 
              spellCheck={false} 
              tabIndex="0"
              ref={outputRef}
            ></div>
          </div>
        </div>
        <div id="message" style={{ padding: '10px', color: '#333' }}>{message}</div>
      </div>

      <div id="loadUrlModal" style={{ display: showModal ? 'flex' : 'none', position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '90%', maxWidth: '600px', margin: 'auto' }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Load JSON from URL</h4>
          <input id="urlInput" className="input" placeholder="https://example.com/data.json" style={{ width: '100%' }} ref={urlInputRef} /><br/><br/>
          <button id="doLoadUrl" className="button primary" onClick={handleLoadUrl} style={{ marginRight: '0.5rem' }}>Load</button>
          <button id="closeLoadUrl" className="button secondary" onClick={() => setShowModal(false)}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default JsonFormatter;