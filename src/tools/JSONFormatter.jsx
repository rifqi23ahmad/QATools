import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReusableAceEditor from '../components/ReusableAceEditor'; 


function JsonFormatter() {
  const [inputText, setInputText] = useState(''); 
  const [outputText, setOutputText] = useState('');
  
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [fileLabel, setFileLabel] = useState('Pilih File...');

  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // --- STATE BARU UNTUK FONT SIZE ---
  const [fontSize, setFontSize] = useState(15); 
  
  const containerRef = useRef(null);
  const inputEditorRef = useRef(null);
  const outputEditorRef = useRef(null);
  
  const isScrollUpdatingRef = useRef(false);

  const urlInputRef = useRef(null);
  const spacesRef = useRef(null);
  const fileInputRef = useRef(null);

  const savTimer = useRef(null);
  const LS_KEY = 'jsonformatter.last';

  const getInputRawText = useCallback(() => inputText, [inputText]);

  // --- LOGIKA FONT SIZE ---
  const handleFontSizeChange = (delta) => {
    setFontSize(prev => {
        const newSize = prev + delta;
        // Batasi ukuran antara 10px dan 25px
        if (newSize < 10) return 10;
        if (newSize > 25) return 25;
        return newSize;
    });
  };

  // --- LOGIKA FULLSCREEN ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        alert(`Error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);
  
  // --- LOGIKA SCROLL SYNC UTAMA ---
  const handleScrollSync = useCallback((sourceRef, targetRef) => {
    if (!isSyncing || isScrollUpdatingRef.current) return;

    const sourceEditor = sourceRef.current?.editor;
    const targetEditor = targetRef.current?.editor;

    if (sourceEditor && targetEditor) {
      isScrollUpdatingRef.current = true; 
      const scrollTop = sourceEditor.session.getScrollTop();
      const scrollLeft = sourceEditor.session.getScrollLeft();
      targetEditor.session.setScrollTop(scrollTop);
      targetEditor.session.setScrollLeft(scrollLeft);
      setTimeout(() => {
        isScrollUpdatingRef.current = false;
      }, 50); 
    }
  }, [isSyncing]);


  // --- useEffect untuk Memasang Listener Scroll ---
  useEffect(() => {
    const inputEditor = inputEditorRef.current?.editor;
    const outputEditor = outputEditorRef.current?.editor;

    if (!inputEditor || !outputEditor) return;
    
    if (!isSyncing) {
        isScrollUpdatingRef.current = false;
        return;
    }
    
    const syncInputToOutput = () => handleScrollSync(inputEditorRef, outputEditorRef);
    const syncOutputToInput = () => handleScrollSync(outputEditorRef, inputEditorRef);
    
    inputEditor.session.on('changeScrollTop', syncInputToOutput);
    inputEditor.session.on('changeScrollLeft', syncInputToOutput);
    outputEditor.session.on('changeScrollTop', syncOutputToInput);
    outputEditor.session.on('changeScrollLeft', syncOutputToInput);
    
    syncInputToOutput(); 

    return () => {
        inputEditor.session.off('changeScrollTop', syncInputToOutput);
        inputEditor.session.off('changeScrollLeft', syncInputToOutput);
        outputEditor.session.off('changeScrollTop', syncOutputToInput);
        outputEditor.session.off('changeScrollLeft', syncOutputToInput);
    };

  }, [isSyncing, handleScrollSync]); 
  // --- AKHIR LOGIKA SCROLL SYNC ---

  const formatText = useCallback((rawText, sp) => {
    try {
      const obj = JSON.parse(rawText.trim());
      setMessage('✅ JSON valid');
      return sp === 0 ? JSON.stringify(obj) : JSON.stringify(obj, null, sp);
    } catch (e) {
      setMessage('❌ ' + e.message);
      return null;
    }
  }, []);

  const validateJSON = useCallback(() => {
    const txt = getInputRawText();
    if (!txt) { setMessage('❌ Input kosong.'); return false; }
    try { JSON.parse(txt.trim()); setMessage('✅ JSON valid'); return true; } catch (e) { setMessage('❌ ' + e.message); return false; }
  }, [getInputRawText]);

  const beautifyJSON = useCallback(() => {
    const txt = getInputRawText();
    if (!txt) return setMessage('❌ Input kosong.');
    const sp = +(spacesRef.current?.value || '4');
    const prettyJson = formatText(txt, sp);
    if (prettyJson === null) return;
    setOutputText(prettyJson);
    setMessage('Beautified — shown in Output');
    localStorage.setItem(LS_KEY, prettyJson);
  }, [getInputRawText, formatText, setOutputText]);

  const minifyJSON = useCallback(() => {
    const txt = getInputRawText();
     if (!txt) return setMessage('❌ Input kosong.');
    const minifiedJson = formatText(txt, 0);
    if (minifiedJson === null) return;
    setOutputText(minifiedJson);
    setMessage('Minified — shown in Output');
    localStorage.setItem(LS_KEY, minifiedJson);
  }, [getInputRawText, formatText, setOutputText]);

  const downloadOutput = useCallback(() => {
    const content = outputText || inputText; 
    if (!content) return setMessage('❌ Tidak ada output untuk diunduh.');
    const blob = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }, [outputText, inputText]);

  const copyOutput = useCallback(() => {
    const txt = outputText || inputText;
    if (!txt) return setMessage('❌ Tidak ada output untuk disalin.');
    navigator.clipboard.writeText(txt)
      .then(() => setMessage('Copied to clipboard ✅'))
      .catch(e => setMessage('Copy failed: ' + e));
  }, [outputText, inputText]);

  const escapeCsv = (val) => {
    if (val == null) return '';
    const s = String(val);
    if (/[\",\n]/.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
    return s;
  };
  const jsonToCsv = (json) => {
    let arr;
    if (Array.isArray(json)) arr = json;
    else if (typeof json === 'object' && json !== null) {
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
      if (type === 'xml') result = jsonToXml(obj), setMessage('Converted to XML');
      else if (type === 'csv') result = jsonToCsv(obj), setMessage('Converted to CSV');
      else if (type === 'yaml') result = jsonToYaml(obj), setMessage('Converted to YAML');
      setOutputText(result); 
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
  };
  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileLabel(f.name);
    const r = new FileReader();
    r.onload = () => { setInputText(r.result); setMessage('File loaded'); };
    r.readAsText(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);
  const handleLoadUrl = useCallback(() => {
    const url = urlInputRef.current?.value.trim();
    if (!url) return setMessage('Please enter URL');
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`); return r.text(); })
      .then(txt => { setInputText(txt); setShowModal(false); setMessage('Loaded from URL'); })
      .catch(e => setMessage('Load failed: ' + e.message));
  }, []);

  
  useEffect(() => {
    const last = localStorage.getItem(LS_KEY);
    if (last) setInputText(last);
  }, []);
  useEffect(() => {
    clearTimeout(savTimer.current);
    savTimer.current = setTimeout(() => {
      localStorage.setItem(LS_KEY, inputText || '');
    }, 800);
  }, [inputText]);
  
  const editorHeight = isFullscreen ? 'calc(100vh - 100px)' : '70vh';


  return (
    <div id="JsonFormatter">
      <div className="tool-header">
        <h1>JSON Formatter</h1>
        <p>Rapikan, validasi, dan kompres data JSON Anda dengan mudah.</p>
      </div>
      
      <div 
        className="card" 
        ref={containerRef} 
        style={{ 
           backgroundColor: 'var(--card-bg, #ffffff)', 
           borderRadius: isFullscreen ? '0' : '8px',
           overflow: isFullscreen ? 'hidden' : 'visible',
           padding: isFullscreen ? '1rem' : '2rem'
        }}
      >
        <div className="grid" style={{ gridTemplateColumns: '1fr 220px 1fr', alignItems: 'start' }}>
          
          {/* --- SISI INPUT --- */}
          <div className="editor-wrapper" style={{ border: '1px solid var(--primary-color)' }}>
            <ReusableAceEditor
                ref={inputEditorRef} 
                mode="json"
                theme="textmate"
                onChange={setInputText}
                value={inputText}
                name="json-input-editor"
                height={editorHeight} 
                fontSize={fontSize} // <-- Meneruskan state font size
                wrapEnabled={true} 
                onLoad={(editor) => {
                  editor.session.on('changeScrollTop', () => handleScrollSync(inputEditorRef, outputEditorRef));
                  editor.session.on('changeScrollLeft', () => handleScrollSync(inputEditorRef, outputEditorRef));
                }}
            />
          </div>
          
          {/* --- KONTROL TENGAH --- */}
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
            
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>
            
            {/* --- KONTROL FONT SIZE BARU --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  id="btn-font-minus" 
                  className="button secondary" 
                  onClick={() => handleFontSizeChange(-1)} 
                  title="Perkecil Font"
                  style={{ width: '40%', padding: '0.5rem 0.8rem' }}
                >
                  <i className="fas fa-minus"></i>
                </button>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{fontSize}px</span>
                <button 
                  id="btn-font-plus" 
                  className="button secondary" 
                  onClick={() => handleFontSizeChange(1)} 
                  title="Perbesar Font"
                  style={{ width: '40%', padding: '0.5rem 0.8rem' }}
                >
                  <i className="fas fa-plus"></i>
                </button>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>

            <button 
              id="btn-fullscreen" 
              className={`button ${isFullscreen ? 'primary' : 'secondary'}`} 
              onClick={toggleFullscreen}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ marginRight: '0.5rem' }}></i>
              {isFullscreen ? 'Exit Full' : 'Fullscreen'}
            </button>

            <button 
              id="btn-sync-scroll" 
              className={`button ${isSyncing ? 'primary' : 'secondary'}`} 
              onClick={() => setIsSyncing(s => !s)}
            >
              <i className={`fas ${isSyncing ? 'fa-link' : 'fa-unlink'}`} style={{ marginRight: '0.5rem' }}></i>
              Scroll Sync
            </button>
            
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.5rem 0' }}></div>

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

          {/* --- SISI OUTPUT --- */}
          <div className="editor-wrapper">
            <ReusableAceEditor
                ref={outputEditorRef} 
                mode="json" 
                theme="textmate"
                onChange={setOutputText} 
                value={outputText}
                readOnly={false} 
                name="json-output-editor"
                height={editorHeight} 
                fontSize={fontSize} // <-- Meneruskan state font size
                wrapEnabled={true}
                onLoad={(editor) => {
                  editor.session.on('changeScrollTop', () => handleScrollSync(outputEditorRef, inputEditorRef));
                  editor.session.on('changeScrollLeft', () => handleScrollSync(outputEditorRef, inputEditorRef));
                }}
            />
          </div>
        </div>
        <div id="message" style={{ padding: '10px', color: '#333' }}>{message}</div>
      </div>

      {/* Modal Load URL */}
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