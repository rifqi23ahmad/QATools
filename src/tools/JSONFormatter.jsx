import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReusableAceEditor from '../components/ReusableAceEditor';

// --- IMPORT TEMA & EXTENSION ---
import 'ace-builds/src-noconflict/theme-tomorrow_night'; 
import 'ace-builds/src-noconflict/ext-searchbox';

// --- ICON COMPONENTS (SVG) ---
const MaximizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
);

const MinimizeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>
  </svg>
);

// --- KOMPONEN INTERNAL: JSON TREE VIEWER ---
const JsonTreeViewer = ({ data, name = null, isLast = true, level = 0 }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const isObject = data !== null && typeof data === 'object';
  const isArray = Array.isArray(data);
  const isEmpty = isObject && Object.keys(data).length === 0;

  const colors = {
    key: '#e8eaed', index: '#a970ff', string: '#89e051', number: '#a970ff',
    boolean: '#f78c6c', null: '#79c0ff', arrow: '#9aa0a6', preview: '#808080', bracket: '#e8eaed'
  };

  const styles = {
    container: { fontFamily: 'Menlo, Consolas, monospace', fontSize: 'inherit', lineHeight: '1.6', color: '#d4d4d4', paddingLeft: level > 0 ? '1.2em' : 0, whiteSpace: 'nowrap', display: 'block' },
    arrow: { display: 'inline-block', width: '1.2em', marginRight: '0.2em', cursor: 'pointer', color: colors.arrow, fontSize: '0.8em', textAlign: 'center', transition: 'transform 0.1s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', userSelect: 'none' },
    keyWrapper: { marginRight: '0.5em', color: colors.key },
    indexWrapper: { marginRight: '0.5em', color: colors.index },
  };

  const generatePreview = (obj) => {
    if (Array.isArray(obj)) return `Array(${obj.length})`;
    const keys = Object.keys(obj);
    const slice = keys.slice(0, 5);
    const contents = slice.map(k => {
      const val = obj[k];
      let valStr = '';
      if (val === null) valStr = 'null';
      else if (typeof val === 'string') valStr = `"${val}"`;
      else if (typeof val === 'object') valStr = Array.isArray(val) ? '[...]' : '{...}';
      else valStr = String(val);
      return `${k}: ${valStr}`;
    });
    let str = contents.join(', ');
    if (keys.length > 5) str += ', …';
    return `{${str}}`;
  };

  if (!isObject) {
    let valColor = colors.string;
    let valDisplay = JSON.stringify(data);
    if (typeof data === 'number') { valColor = colors.number; valDisplay = String(data); }
    if (typeof data === 'boolean') { valColor = colors.boolean; valDisplay = String(data); }
    if (data === null) { valColor = colors.null; valDisplay = 'null'; }
    return (
      <div style={styles.container}>
        {name !== null && <span style={!isNaN(name) ? styles.indexWrapper : styles.keyWrapper}>{name}:</span>}
        <span style={{ color: valColor }}>{valDisplay}</span>
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div style={styles.container}>
        {name !== null && <span style={!isNaN(name) ? styles.indexWrapper : styles.keyWrapper}>{name}: </span>}
        <span style={{ color: colors.bracket }}>{isArray ? '[]' : '{}'}</span>
      </div>
    );
  }
  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={styles.arrow} onClick={() => setExpanded(!expanded)}>▶</span>
        {name !== null && <span style={{...(!isNaN(name) ? styles.indexWrapper : styles.keyWrapper), cursor:'pointer'}} onClick={() => setExpanded(!expanded)}>{name}:</span>}
        {!expanded ? (
          <span style={{ color: colors.preview, cursor: 'pointer', fontStyle: 'normal' }} onClick={() => setExpanded(true)}>{generatePreview(data)}</span>
        ) : (
          <span style={{ color: colors.bracket }}>{isArray ? '[' : '{'}</span>
        )}
      </div>
      {expanded && (
        <div>
          {Object.keys(data).map((key, idx, arr) => (
            <JsonTreeViewer key={key} name={key} data={data[key]} isLast={idx === arr.length - 1} level={level + 1} />
          ))}
          <div style={{ paddingLeft: '0.2em', color: colors.bracket }}>{isArray ? ']' : '}'}</div>
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
function JsonFormatter() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [fileLabel, setFileLabel] = useState('Pilih File...');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State Fullscreen & ViewMode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'left' | 'right'
  
  const [fontSize, setFontSize] = useState(14);
  const [outputMode, setOutputMode] = useState('code'); 

  const containerRef = useRef(null);
  const inputEditorRef = useRef(null);
  const outputEditorRef = useRef(null);
  const savTimer = useRef(null);
  const LS_KEY = 'jsonformatter.last';
  const isScrollUpdatingRef = useRef(false);
  const urlInputRef = useRef(null);
  const spacesRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const getInputRawText = useCallback(() => inputText, [inputText]);

  const handleFontSizeChange = (delta) => {
    setFontSize(prev => {
      const newSize = prev + delta;
      if (newSize < 10) return 10;
      if (newSize > 40) return 40;
      return newSize;
    });
  };

  const triggerSearch = (aceRef) => {
    const editor = aceRef.current?.editor;
    if (editor) { editor.execCommand('find'); editor.focus(); }
  };

  const safeResizeEditor = (aceRef) => {
    const ed = aceRef?.current?.editor;
    if (!ed) return;
    try {
      if (typeof ed.resize === 'function') ed.resize();
      if (ed.renderer && typeof ed.renderer.updateFull === 'function') ed.renderer.updateFull();
    } catch (_) {}
  };
  const resizeEditors = useCallback(() => {
    safeResizeEditor(inputEditorRef);
    safeResizeEditor(outputEditorRef);
  }, []);

  // --- LOGIC: Handle Fullscreen ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      // Masuk fullscreen mode Split (default)
      containerRef.current?.requestFullscreen().catch(err => alert(`Error: ${err?.message}`));
      setViewMode('split');
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleMaximize = (targetMode) => {
    if (isFullscreen && viewMode === targetMode) {
        // Jika sedang dimaksimalkan dan tombol diklik lagi -> kembali ke split (dalam fullscreen)
        setViewMode('split');
    } else {
        // Jika belum fullscreen -> masuk fullscreen langsung maximize panel tsb
        // Jika sudah fullscreen (tapi mode beda) -> pindah ke mode panel tsb
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => alert(`Error: ${err?.message}`));
            setIsFullscreen(true);
        }
        setViewMode(targetMode);
    }
  };

  useEffect(() => {
    const onFs = () => {
      const nowFs = !!document.fullscreenElement;
      setIsFullscreen(nowFs);
      // Jika keluar fullscreen, otomatis balik ke split
      if (!nowFs) setViewMode('split');
      requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
    };
    document.addEventListener('fullscreenchange', onFs);
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(() => {
        requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
      });
      resizeObserverRef.current.observe(containerRef.current);
    }
    requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      if (resizeObserverRef.current && containerRef.current) {
        resizeObserverRef.current.unobserve(containerRef.current);
      }
    };
  }, [resizeEditors]);

  const handleScrollSync = useCallback((sourceRef, targetRef) => {
    if (!isSyncing || isScrollUpdatingRef.current) return;
    const s = sourceRef?.current?.editor;
    const t = targetRef?.current?.editor;
    if (!s || !t) return;
    isScrollUpdatingRef.current = true;
    try {
      const top = s.session.getScrollTop();
      const left = s.session.getScrollLeft();
      t.session.setScrollTop(top);
      t.session.setScrollLeft(left);
    } finally {
      setTimeout(() => (isScrollUpdatingRef.current = false), 60);
    }
  }, [isSyncing]);

  useEffect(() => {
    const sEd = inputEditorRef.current?.editor;
    const oEd = outputEditorRef.current?.editor;
    if (!sEd || !oEd) return;
    try {
      sEd.session.off('changeScrollTop'); sEd.session.off('changeScrollLeft');
      oEd.session.off('changeScrollTop'); oEd.session.off('changeScrollLeft');
    } catch (_) {}
    if (!isSyncing) { isScrollUpdatingRef.current = false; return; }
    const syncInToOut = () => handleScrollSync(inputEditorRef, outputEditorRef);
    const syncOutToIn = () => handleScrollSync(outputEditorRef, inputEditorRef);
    sEd.session.on('changeScrollTop', syncInToOut);
    sEd.session.on('changeScrollLeft', syncInToOut);
    oEd.session.on('changeScrollTop', syncOutToIn);
    oEd.session.on('changeScrollLeft', syncOutToIn);
    syncInToOut();
    return () => {
      try {
        sEd.session.off('changeScrollTop', syncInToOut); sEd.session.off('changeScrollLeft', syncInToOut);
        oEd.session.off('changeScrollTop', syncOutToIn); oEd.session.off('changeScrollLeft', syncOutToIn);
      } catch (_) {}
    };
  }, [isSyncing, handleScrollSync]);

  const formatText = useCallback((rawText, sp) => {
    try {
      const obj = JSON.parse(rawText.trim());
      setMessage('✅ JSON valid');
      return sp === 0 ? JSON.stringify(obj) : JSON.stringify(obj, null, sp);
    } catch (e) { setMessage('❌ ' + e.message); return null; }
  }, []);

  const validateJSON = useCallback(() => {
    const txt = getInputRawText();
    if (!txt) { setMessage('❌ Input kosong.'); return false; }
    try { JSON.parse(txt.trim()); setMessage('✅ JSON valid'); return true; } catch (e) { setMessage('❌ ' + e.message); return false; }
  }, [getInputRawText]);

  const handleBeautifyAll = useCallback(() => {
    const txt = getInputRawText();
    if (!txt) return setMessage('❌ Input kosong.');
    const sp = +(spacesRef.current?.value || '4');
    const pretty = formatText(txt, sp);
    if (pretty === null) return;
    setInputText(pretty);
    setOutputText(pretty);
    setMessage('✅ Input & Output Beautified');
    localStorage.setItem(LS_KEY, pretty);
    requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
  }, [getInputRawText, formatText, resizeEditors]);

  const minifyJSON = useCallback(() => {
    const txt = getInputRawText();
    if (!txt) return setMessage('❌ Input kosong.');
    const minified = formatText(txt, 0);
    if (minified === null) return;
    setOutputText(minified);
    setMessage('Minified — shown in Output');
    localStorage.setItem(LS_KEY, minified);
    requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
  }, [getInputRawText, formatText, resizeEditors]);

  const downloadOutput = useCallback(() => {
    const content = outputText || inputText;
    if (!content) return setMessage('❌ Tidak ada output.');
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
    if (!txt) return setMessage('❌ Tidak ada output.');
    navigator.clipboard.writeText(txt).then(() => setMessage('Copied ✅')).catch(e => setMessage('Failed: ' + e));
  }, [outputText, inputText]);

  const handleConvert = (type) => {
    setShowConvertMenu(false);
    try {
        const obj = JSON.parse(getInputRawText());
        let result = JSON.stringify(obj); 
        if (type==='xml') result = `<root>XML logic here</root>`; 
        setOutputText(result);
    } catch(e) { setMessage('❌ ' + e.message); }
  };

  const handleFileChange = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFileLabel(f.name);
    const r = new FileReader();
    r.onload = () => { setInputText(r.result); setMessage('File loaded'); requestAnimationFrame(() => requestAnimationFrame(resizeEditors)); };
    r.readAsText(f);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [resizeEditors]);

  const handleLoadUrl = useCallback(() => {
    const url = urlInputRef.current?.value.trim();
    if (!url) return setMessage('Please enter URL');
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`); return r.text(); })
      .then(txt => { setInputText(txt); setShowModal(false); setMessage('Loaded from URL'); requestAnimationFrame(() => requestAnimationFrame(resizeEditors)); })
      .catch(e => setMessage('Load failed: ' + e.message));
  }, [resizeEditors]);

  useEffect(() => {
    const last = localStorage.getItem(LS_KEY);
    if (last) setInputText(last);
  }, []);
  useEffect(() => {
    clearTimeout(savTimer.current);
    savTimer.current = setTimeout(() => localStorage.setItem(LS_KEY, inputText || ''), 800);
    return () => clearTimeout(savTimer.current);
  }, [inputText]);
  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(resizeEditors));
  }, [viewMode, isFullscreen, outputMode, resizeEditors]);

  // --- STYLING ---
  const makeEditorContainerStyle = (visible) => ({
    display: 'flex',
    flexDirection: 'column',
    flex: visible ? '1 1 0%' : '0 0 0px',
    minWidth: 0,
    width: visible ? 'auto' : 0,
    overflow: 'hidden',
    transition: 'flex-basis 150ms ease, width 150ms ease',
    height: isFullscreen ? 'calc(100% - 0px)' : '70vh'
  });

  const editorWrapperStyle = {
    flex: 1, minHeight: 0, borderRadius: '6px', border: '1px solid var(--card-border, #e2e8f0)', 
    overflow: outputMode === 'preview' ? 'auto' : 'hidden',
    display: 'flex', flexDirection: 'column',
    backgroundColor: outputMode === 'preview' ? '#202124' : undefined 
  };

  const inputVisible = viewMode === 'split' || viewMode === 'left';
  const outputVisible = viewMode === 'split' || viewMode === 'right';

  const editorHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingRight: 2 };
  const labelStyle = { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' };
  const iconButtonStyle = { background: 'transparent', border: '1px solid var(--card-border, #ccc)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary, #333)', transition: 'background 0.2s', marginLeft: 6 };
  const tabBtnStyle = (isActive) => ({ background: isActive ? 'var(--primary-color, #007bff)' : 'transparent', color: isActive ? '#fff' : 'var(--text-secondary, #666)', border: '1px solid ' + (isActive ? 'var(--primary-color, #007bff)' : '#ccc'), borderRadius: '4px', padding: '2px 10px', fontSize: '0.8rem', cursor: 'pointer', marginLeft: 6 });

  const getPreviewData = () => {
    const txt = outputText || inputText;
    if(!txt) return null;
    try { return JSON.parse(txt); } catch(e) { return null; }
  };
  const previewData = getPreviewData();

  const isInputMaximized = isFullscreen && viewMode === 'left';
  const isOutputMaximized = isFullscreen && viewMode === 'right';

  return (
    <div id="JsonFormatter" style={isFullscreen ? {
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: 'var(--card-bg,#fff)', overflow: 'hidden'
    } : {}}>
      {!isFullscreen && <div className="tool-header" style={{ padding: '1rem 0' }}><h1>JSON Formatter</h1><p>Rapikan, validasi, dan kompres data JSON Anda dengan mudah.</p></div>}
      
      <div className="card" ref={containerRef} style={{ padding: isFullscreen ? 0 : '2rem', height: isFullscreen ? '100vh' : 'auto', display: 'flex', flexDirection: 'column', background: 'var(--card-bg,#fff)' }}>
        
        {/* TOP BAR CONTROL SAAT FULLSCREEN (AGAR BISA SWITCH MODE DENGAN MUDAH) */}
        {isFullscreen && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', gap: '1rem', borderBottom: '1px solid #e2e8f0' }}>
            <button className={`button ${viewMode === 'left' ? 'primary' : 'secondary'}`} onClick={() => setViewMode('left')}>Full Left</button>
            <button className={`button ${viewMode === 'split' ? 'primary' : 'secondary'}`} onClick={() => setViewMode('split')}>Split View</button>
            <button className={`button ${viewMode === 'right' ? 'primary' : 'secondary'}`} onClick={() => setViewMode('right')}>Full Right</button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', padding: isFullscreen ? 12 : 0, height: isFullscreen ? 'calc(100% - 64px)' : undefined }}>
          
          {/* --- INPUT SECTION --- */}
          <div style={makeEditorContainerStyle(inputVisible)}>
            <div style={editorHeaderStyle}>
              <span style={labelStyle}>Input</span>
              <div style={{display:'flex'}}>
                 <button style={iconButtonStyle} onClick={() => triggerSearch(inputEditorRef)} title="Cari teks (Ctrl+F)">🔍 Find</button>
                 {/* TOMBOL MAXIMIZE/RESTORE DI INPUT */}
                 <button 
                    style={iconButtonStyle} 
                    onClick={() => handleToggleMaximize('left')} 
                    title={isInputMaximized ? "Restore View" : "Maximize Input"}
                 >
                    {isInputMaximized ? <MinimizeIcon/> : <MaximizeIcon/>}
                 </button>
              </div>
            </div>
            <div style={editorWrapperStyle}>
              <ReusableAceEditor
                ref={inputEditorRef} mode="json" theme="tomorrow_night" onChange={setInputText} value={inputText} name="json-input-editor" height="100%" width="100%" fontSize={fontSize} wrapEnabled editorProps={{ $blockScrolling: true }}
                onLoad={(editor) => { try { editor.session.off('changeScrollTop'); editor.session.off('changeScrollLeft'); } catch (_) {} editor.session.on('changeScrollTop', () => handleScrollSync(inputEditorRef, outputEditorRef)); editor.session.on('changeScrollLeft', () => handleScrollSync(inputEditorRef, outputEditorRef)); requestAnimationFrame(() => requestAnimationFrame(() => safeResizeEditor(inputEditorRef))); }}
              />
            </div>
          </div>

          {/* --- CONTROLS (Tengah) --- */}
          <div style={{ width: isFullscreen ? 0 : 220, display: isFullscreen ? 'none' : 'flex', flexDirection: 'column', gap: 10, paddingTop: 34, paddingLeft: 6, paddingRight: 6 }}>
            <button id="btn-validate" className="button secondary" onClick={validateJSON}>Validate</button>
            <button id="btn-beautify" className="button primary" onClick={handleBeautifyAll}>Beautify</button>
            <button id="btn-minify" className="button secondary" onClick={minifyJSON}>Minify</button>
            <select id="spaces" ref={spacesRef} defaultValue="4" className="select"><option value="2">2 spaces</option><option value="4">4 spaces</option><option value="0">Compact</option></select>
            <label htmlFor="fileInput" className="button secondary" style={{ textAlign: 'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'block' }}>{fileLabel}</label>
            <input id="fileInput" type="file" accept="application/json" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
            <button id="btn-load-url" className="button secondary" onClick={() => setShowModal(true)}>Load URL</button>
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <button className="button secondary" onClick={() => handleFontSizeChange(-1)} style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}> - </button>
              <div style={{ fontWeight: 600, textAlign: 'center', flex: 1 }}>{fontSize}px</div>
              <button className="button secondary" onClick={() => handleFontSizeChange(1)} style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}> + </button>
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6 }} />
            
            {/* TOMBOL GLOBAL FULLSCREEN (KEMBALI ADA) */}
            <button id="btn-fullscreen" className="button secondary" onClick={toggleFullscreen}>
               Fullscreen
            </button>
            
            <button id="btn-sync-scroll" className={`button ${isSyncing ? 'primary' : 'secondary'}`} onClick={() => setIsSyncing(s => !s)}>Sync Scroll {isSyncing ? 'ON' : 'OFF'}</button>
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 6 }} />
            <button id="btn-download" className="button secondary" onClick={downloadOutput}>Download</button>
            <button id="btn-copy" className="button secondary" onClick={copyOutput}>Copy Output</button>
            <div>
              <button className="button secondary" style={{width: '100%'}} onClick={() => setShowConvertMenu(s => !s)}>Convert ▾</button>
              {showConvertMenu && (<div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}><button className="button text-only" style={{textAlign:'left'}} onClick={() => handleConvert('xml')}>to XML</button></div>)}
            </div>
          </div>

          {/* --- OUTPUT SECTION --- */}
          <div style={makeEditorContainerStyle(outputVisible)}>
            <div style={editorHeaderStyle}>
              <div style={{display:'flex', alignItems:'center'}}>
                <span style={labelStyle}>Output</span>
                <button style={tabBtnStyle(outputMode === 'code')} onClick={() => setOutputMode('code')}>Code</button>
                <button style={tabBtnStyle(outputMode === 'preview')} onClick={() => setOutputMode('preview')}>Preview</button>
              </div>
              <div style={{display:'flex'}}>
                {outputMode === 'code' && (<button style={iconButtonStyle} onClick={() => triggerSearch(outputEditorRef)} title="Cari teks (Ctrl+F)">🔍 Find</button>)}
                {/* TOMBOL MAXIMIZE/RESTORE DI OUTPUT */}
                <button 
                    style={iconButtonStyle} 
                    onClick={() => handleToggleMaximize('right')} 
                    title={isOutputMaximized ? "Restore View" : "Maximize Output"}
                 >
                    {isOutputMaximized ? <MinimizeIcon/> : <MaximizeIcon/>}
                 </button>
              </div>
            </div>
            
            <div style={editorWrapperStyle}>
              {outputMode === 'code' ? (
                <ReusableAceEditor
                  ref={outputEditorRef} mode="json" theme="tomorrow_night" onChange={setOutputText} value={outputText} name="json-output-editor" height="100%" width="100%" fontSize={fontSize} wrapEnabled editorProps={{ $blockScrolling: true }}
                  onLoad={(editor) => { try { editor.session.off('changeScrollTop'); editor.session.off('changeScrollLeft'); } catch (_) {} editor.session.on('changeScrollTop', () => handleScrollSync(outputEditorRef, inputEditorRef)); editor.session.on('changeScrollLeft', () => handleScrollSync(outputEditorRef, inputEditorRef)); requestAnimationFrame(() => requestAnimationFrame(() => safeResizeEditor(outputEditorRef))); }}
                />
              ) : (
                <div style={{ padding: '10px', height: '100%', boxSizing: 'border-box', overflow: 'auto', color:'#d4d4d4', fontSize: `${fontSize}px` }}>
                  {previewData ? <JsonTreeViewer data={previewData} /> : <div style={{ color: '#ff6b6b', fontFamily: 'sans-serif', padding:'20px', textAlign:'center' }}>Preview tidak tersedia. Format JSON tidak valid.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
        {!isFullscreen && <div id="message" style={{ padding: '10px', color: '#333', fontWeight: 500 }}>{message}</div>}
      </div>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 8, width: '90%', maxWidth: 500, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h4 style={{marginTop:0}}>Load JSON from URL</h4>
            <input ref={urlInputRef} className="input" placeholder="https://example.com/data.json" style={{ width: '100%', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="button secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="button primary" onClick={handleLoadUrl}>Load</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JsonFormatter;