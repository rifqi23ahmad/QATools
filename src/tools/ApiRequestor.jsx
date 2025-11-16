import React, { useEffect, useMemo, useState } from 'react';

// --- IMPORT ACE (langsung, tanpa Suspense/lazy) ---
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/ext-language_tools';

import styles from './ApiRequestor.module.css'; // <-- IMPOR BARU

// Utility: hitung tinggi editor berdasarkan jumlah baris
const calcEditorHeight = (text, opts = {}) => {
  const lineHeight = opts.lineHeight ?? 18; // px per baris
  const verticalPadding = opts.verticalPadding ?? 24; // padding atas+bawah
  const minHeight = opts.minHeight ?? 150; // px
  const maxHeight = opts.maxHeight ?? 480; // px (batas maksimal)
  const lines = (text || '').split('\n').length || 1;
  const raw = lines * lineHeight + verticalPadding;
  return Math.max(minHeight, Math.min(raw, maxHeight));
};

// Komponen "dumb" ApiRequestor (props dikendalikan oleh parent)
function ApiRequestor({
  requestState,       // { method, url, body, headers }
  responseState,      // { status: { ok, code, text }, time, size, body, headers }
  isLoading,
  responseTab,
  onResponseTabChange,
  onRequestChange,
  onSendRequest
}) {
  const [copyResponseText, setCopyResponseText] = useState('Copy');
  const { method, url, body, headers } = requestState || { method: 'GET', url: '', body: '', headers: [] };
  const response = responseState;

  // Editor sizing state (height in px)
  const [editorHeight, setEditorHeight] = useState(() => calcEditorHeight(body));

  useEffect(() => {
    // recalc height whenever body changes
    setEditorHeight(calcEditorHeight(body, { lineHeight: 18, verticalPadding: 24, minHeight: 150, maxHeight: 480 }));
  }, [body]);

  // --- Syntax highlight yang aman (menerima object atau string) ---
  function highlightJsonSyntax(jsonInput) {
    if (jsonInput === undefined || jsonInput === null) return '';
    let jsonString = typeof jsonInput === 'string' ? jsonInput : JSON.stringify(jsonInput, null, 2);
    // escape HTML
    jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        // --- PERUBAHAN KRUSIAL DI SINI ---
        let cls = styles.jsonNumber;
        if (/^"/.test(match)) { cls = /:$/.test(match) ? styles.jsonKey : styles.jsonString; }
        else if (/true|false/.test(match)) { cls = styles.jsonBoolean; }
        else if (/null/.test(match)) { cls = styles.jsonNull; }
        return `<span class="${cls}">${match}</span>`;
        // --- AKHIR PERUBAHAN ---
      }
    );
  }

  // --- Header helper handlers ---
  const handleHeaderChange = (id, field, value) => {
    const newHeaders = (headers || []).map(h => (h.id === id ? { ...h, [field]: value } : h));
    onRequestChange('headers', newHeaders);
  };

  const addHeaderRow = () => {
    const newHeaders = [...(headers || []), { id: Date.now() + Math.floor(Math.random() * 1000), key: '', value: '' }];
    onRequestChange('headers', newHeaders);
  };

  const removeHeaderRow = (id) => {
    const newHeaders = (headers || []).filter(h => h.id !== id);
    onRequestChange('headers', newHeaders);
  };

  // --- Parser cURL yang lebih tahan banting ---
  const parseCurlCommand = (curlString) => {
    if (!curlString) return alert('Input cURL tidak boleh kosong.');

    try {
      // ... (Logika parsing cURL Anda tidak berubah) ...
      const result = { method: '', url: '', headers: [], body: '' };
      // ... (parsing logic) ...
      
      // --- PERBAIKAN BUG STATE BATCH ---
      const updates = {
        method: result.method,
        url: (result.url || '').trim()
      };
      // ... (sisa logika parsing) ...
      onRequestChange(updates);
      // --- AKHIR PERBAIKAN BUG STATE BATCH ---

    } catch (error) {
      alert('Gagal mem-parsing cURL: ' + (error && error.message ? error.message : String(error)));
    }
  };

  // --- Primary action (kirim atau parse) ---
  const handlePrimaryAction = () => {
    const trimmedUrl = (url || '').trim();
    if (trimmedUrl.toLowerCase().startsWith('curl ')) {
      parseCurlCommand(trimmedUrl);
      return;
    }
    onSendRequest(requestState);
  };

  const isCurlInput = (url || '').trim().toLowerCase().startsWith('curl ');
  let buttonText = "Kirim";
  if (isCurlInput) buttonText = "Parse cURL";
  if (isLoading) buttonText = "Loading...";

  const handleCopyResponse = () => {
    if (!response || !response.body) return;
    const text = typeof response.body === 'string' ? response.body : JSON.stringify(response.body, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopyResponseText('Disalin!');
      setTimeout(() => setCopyResponseText('Copy'), 2000);
    });
  };

  const [requestTab, setRequestTab] = useState('headers');

  // Beautify (pretty print) body
  const beautifyBody = () => {
    if (!body) return;
    try {
      const parsed = JSON.parse(body);
      const pretty = JSON.stringify(parsed, null, 2);
      onRequestChange('body', pretty);
      // update editor height immediately
      setEditorHeight(calcEditorHeight(pretty, { lineHeight: 18, verticalPadding: 24, minHeight: 150, maxHeight: 480 }));
    } catch (err) {
      alert('Tidak bisa merapikan: isi bukan JSON valid.');
    }
  };

  // Helper untuk render response headers dalam format yang rapi
  const renderResponseHeaders = (rh) => {
    if (!rh) return '';
    // ... (Logika Anda tidak berubah) ...
    return String(rh);
  };

  // Memoized guarded Ace component (handles default export namespace)
  const AceComp = useMemo(() => {
    return (AceEditor && AceEditor.default) ? AceEditor.default : AceEditor;
  }, []);

  const isValidAce = AceComp && (typeof AceComp === 'function' || typeof AceComp === 'object');

  // --- Render ---
  return (
    <div className={styles.apiRequestor}> {/* <-- GANTI ID DENGAN CLASS */}
      <div className={styles.apiRequestZone}>
        <div className={styles.corsWarning}> {/* <-- GANTI CLASS */}
          <p>
            <strong>Jika kamu dapat response Peringatan CORS:</strong> Gunakan <strong>"Allow CORS"</strong> extension agar bisa berjalan di browser kamu.
          </p>
        </div>

        <div className={styles.apiRequestGrid}> {/* <-- GANTI CLASS */}
          <select
            id="api-method"
            className="select"
            style={{ maxWidth: '130px', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
            value={method}
            onChange={(e) => onRequestChange('method', e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>

          <textarea
            id="api-url"
            className="input textarea-editor"
            rows="2"
            placeholder="Tempel URL (https://...) atau perintah cURL (curl 'https://...')"
            value={url}
            onChange={(e) => onRequestChange('url', e.target.value)}
            // Tambahkan style inline dari CSS module jika perlu, atau pastikan .input .textarea-editor di components.css
            style={{ fontFamily: 'var(--monospace-font)', fontSize: '0.9rem', padding: '0.5rem 0.75rem', resize: 'vertical', minHeight: '38px' }}
          />

          <button id="api-send-btn" className="button primary" onClick={handlePrimaryAction} disabled={isLoading}>
            {isLoading ? (
              <div className="loader-spinner" />
            ) : isCurlInput ? (
              <i className="fas fa-magic" style={{ marginRight: '0.5rem' }} />
            ) : (
              <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }} />
            )}
            {buttonText}
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}> {/* Hapus .api-tabs-container jika tidak diperlukan */}
          <div className={styles.apiTabsNav} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={`${styles.apiTabBtn} ${requestTab === 'headers' ? styles.active : ''}`} onClick={() => setRequestTab('headers')}>Headers</button>
              <button className={`${styles.apiTabBtn} ${requestTab === 'body' ? styles.active : ''}`} onClick={() => setRequestTab('body')}>Body (JSON)</button>
            </div>

            {/* Beautify button visible when body tab selected */}
            <div style={{ marginLeft: 'auto' }}>
              {requestTab === 'body' && (
                <button
                  className="button secondary"
                  onClick={beautifyBody}
                  title="Beautify / Pretty-print JSON"
                  style={{ marginRight: '0.5rem', fontSize: '0.85rem' }}
                >
                  <i className="fas fa-magic" style={{ marginRight: '0.5rem' }} /> Beautify
                </button>
              )}
            </div>
          </div>

          <div id="tab-headers" className={`${styles.apiTabContent} ${requestTab === 'headers' ? styles.active : ''}`}>
            <div id="api-headers-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {(headers || []).map(h => (
                <div key={h.id} className={styles.apiHeaderRow} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="input header-key" placeholder="Key" value={h.key || ''} onChange={(e) => handleHeaderChange(h.id, 'key', e.target.value)} style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }} />
                  <input type="text" className="input header-value" placeholder="Value" value={h.value || ''} onChange={(e) => handleHeaderChange(h.id, 'value', e.target.value)} style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem' }} />
                  <button className={`button secondary ${styles.removeHeaderBtn}`} title="Hapus header" onClick={() => removeHeaderRow(h.id)}><i className="fas fa-trash-alt" /></button>
                </div>
              ))}
            </div>
            <button id="api-add-header-btn" className="button secondary" onClick={addHeaderRow} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} /> Tambah Header
            </button>
          </div>

          {/* --- Body tab dengan guarded AceEditor (fallback textarea jika import tidak valid) --- */}
          <div id="tab-body" className={`${styles.apiTabContent} ${requestTab === 'body' ? styles.active : ''}`}>

            {/* Render editor with dynamic height (editorHeight state) */}
            {isValidAce ? (
              <AceComp
                // ... (props)
              />
            ) : (
              <textarea
                // ... (props)
              />
            )}
            {/* ... (Pesan konten panjang) ... */}
          </div>
        </div>
      </div>

      <div className={styles.apiResponseZone}>
        <div className="card" id="api-response-section">
          {response ? (
            <>
              {/* ... (Status bar) ... */}

              <div className={styles.apiTabsContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', marginBottom: '1rem', flexShrink: 0 }}>
                  <div className={styles.apiTabsNav} style={{ marginBottom: '-1px', borderBottom: 'none' }}>
                    <button className={`${styles.apiTabBtn} ${responseTab === 'response-body' ? styles.active : ''}`} onClick={() => onResponseTabChange('response-body')}>Body</button>
                    <button className={`${styles.apiTabBtn} ${responseTab === 'response-headers' ? styles.active : ''}`} onClick={() => onResponseTabChange('response-headers')}>Headers</button>
                  </div>
                  {/* ... (Tombol Copy) ... */}
                </div>

                {/* --- PERBAIKAN SCROLL, WARNA, DAN TAB --- */}
                {responseTab === 'response-body' && (
                  <div id="tab-response-body" className={`${styles.apiTabContent} ${styles.active}`}>
                    <pre
                      id="api-response-body-output"
                      className={`textarea textarea-editor ${styles.responseOutput}`} // <-- GANTI CLASS
                      style={{
                        backgroundColor: '#2d3748',
                        color: '#e2e8f0',
                        whiteSpace: 'pre-wrap',
                        padding: '1rem',
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(response.body) }}
                    />
                  </div>
                )}

                {responseTab === 'response-headers' && (
                  <div id="tab-response-headers" className={`${styles.apiTabContent} ${styles.active}`}>
                    <pre
                      id="api-response-headers-output"
                      className={`textarea textarea-editor ${styles.responseOutput}`} // <-- GANTI CLASS
                      style={{
                        backgroundColor: '#f7fafc',
                        padding: '1rem',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {renderResponseHeaders(response.headers)}
                    </pre>
                  </div>
                )}
                {/* --- AKHIR PERBAIKAN --- */}

              </div>
            </>
          ) : (
            <div id="api-response-placeholder" style={{
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              minHeight: '150px'
            }}>
              {/* ... (Placeholder loading) ... */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiRequestor;