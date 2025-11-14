import React, { useState } from 'react';
import ToolHeader from '../components/ToolHeader';

// Fungsi helper dari file asli Anda
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
function jsonToCsv(json) { /* ...logika dari file asli... */ }
function jsonToXml(obj) { /* ...logika dari file asli... */ }
function jsonToYaml(obj, indent=0) { /* ...logika dari file asli... */ }
// (Catatan: Anda harus menyalin-tempel logika lengkap untuk jsonToCsv, 
// jsonToXml, dan jsonToYaml dari file asli Anda ke sini)

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [outputHtml, setOutputHtml] = useState('');
  const [message, setMessage] = useState('');
  const [spaces, setSpaces] = useState('4');

  const showMessage = (msg, type = 'success') => {
    setMessage(msg);
    // (Anda bisa menambahkan logika timeout di sini jika mau)
  };

  const processInput = (action) => {
    let rawText = input;
    if (!rawText) return showMessage('Input kosong', 'error');
    
    try {
      const obj = JSON.parse(rawText);
      let resultText;
      
      switch(action) {
        case 'beautify':
          const indent = parseInt(spaces, 10);
          resultText = JSON.stringify(obj, null, indent === 0 ? undefined : indent);
          setOutputHtml(highlightJsonSyntax(resultText));
          setInput(resultText); // Update input juga
          showMessage('Beautified!');
          break;
        case 'minify':
          resultText = JSON.stringify(obj);
          setOutputHtml(resultText);
          setInput(resultText); // Update input juga
          showMessage('Minified!');
          break;
        case 'validate':
          showMessage('✅ JSON valid');
          break;
        case 'xml':
          resultText = jsonToXml(obj);
          setOutputHtml(escapeHtml(resultText)); // XML tidak di-highlight
          showMessage('Converted to XML');
          break;
        case 'csv':
          resultText = jsonToCsv(obj);
          setOutputHtml(escapeHtml(resultText)); // CSV tidak di-highlight
          showMessage('Converted to CSV');
          break;
        case 'yaml':
          resultText = jsonToYaml(obj);
          setOutputHtml(escapeHtml(resultText)); // YAML tidak di-highlight
          showMessage('Converted to YAML');
          break;
        default:
          break;
      }
    } catch(e) {
      showMessage(`❌ ${e.message}`, 'error');
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setInput(r.result);
      showMessage('File loaded');
    };
    r.readAsText(f);
  };
  
  // Helper untuk escape, karena output non-JSON tidak boleh dirender sebagai HTML
  const escapeHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  return (
    <div>
      <div className="tool-header">
        <h1>JSON Formatter</h1>
        <p>Rapikan, validasi, dan kompres data JSON Anda dengan mudah.</p>
      </div>
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px 1fr', alignItems: 'start' }}>
          {/* Editor Input */}
          <div className="editor-wrapper">
            <textarea 
              className="textarea-editor" 
              style={{ height: '70vh', border: 'none', resize: 'none' }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck="false"
            />
          </div>
          
          {/* Kontrol */}
          <div className="controls flex flex-col" style={{ gap: '0.75rem', padding: '10px 0' }}>
            <button className="button secondary" onClick={() => processInput('validate')}>Validate</button>
            <button className="button primary" onClick={() => processInput('beautify')}>Beautify</button>
            <button className="button secondary" onClick={() => processInput('minify')}>Minify</button>
            <select className="select" value={spaces} onChange={(e) => setSpaces(e.target.value)}>
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
              <option value="0">Compact</option>
            </select>
            
            <label htmlFor="fileInput" className="button secondary">
              <i className="fas fa-upload" style={{ marginRight: '0.5rem' }}></i>
              <span>Pilih File...</span>
            </label>
            <input id="fileInput" type="file" accept="application/json" className="is-hidden" onChange={handleFileChange} />
            
            {/* Konversi (Gaya dropdown disederhanakan) */}
            <button className="button secondary" onClick={() => processInput('xml')}>JSON → XML</button>
            <button className="button secondary" onClick={() => processInput('csv')}>JSON → CSV</button>
            <button className="button secondary" onClick={() => processInput('yaml')}>JSON → YAML</button>
          </div>

          {/* Editor Output */}
          <div className="editor-wrapper">
            <pre 
              className="textarea-editor pre-output" 
              style={{ height: '70vh', border: 'none', background: '#fbfdff' }}
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          </div>
        </div>
        <div id="message" style={{ padding: '10px', color: message.startsWith('❌') ? 'var(--danger-color)' : 'var(--text-primary)' }}>
          {message}
        </div>
      </div>
    </div>
  );
}

export default JsonFormatter;