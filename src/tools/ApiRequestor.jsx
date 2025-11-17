import React, { useEffect, useMemo, useState } from 'react';
// --- PERBAIKAN: Impor file CSS yang lengkap ---
import styles from './ApiRequestorManager.module.css'; 

// --- IMPORT ACE (langsung, tanpa Suspense/lazy) ---
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-tomorrow_night';
import 'ace-builds/src-noconflict/ext-language_tools';

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

  // --- PERBAIKAN: Fungsi ini sekarang menggunakan objek styles ---
  function highlightJsonSyntax(jsonInput) {
    if (jsonInput === undefined || jsonInput === null) return '';
    let jsonString = typeof jsonInput === 'string' ? jsonInput : JSON.stringify(jsonInput, null, 2);
    // escape HTML
    jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = styles.jsonNumber; // Default
        if (/^"/.test(match)) { cls = /:$/.test(match) ? styles.jsonKey : styles.jsonString; }
        else if (/true|false/.test(match)) { cls = styles.jsonBoolean; }
        else if (/null/.test(match)) { cls = styles.jsonNull; }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  }
  // --- AKHIR PERBAIKAN ---

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
      const result = { method: '', url: '', headers: [], body: '' };
      const unquote = (s) => {
        if (!s && s !== '') return s;
        const trimmed = s.trim();
        if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
          // remove quotes and unescape simple escapes
          return trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
        }
        return trimmed;
      };

      // 1) Gabungkan baris (backslash newline) -> spasi
      // 2) Normalisasi whitespace jadi spasi tunggal
      const singleLineCurl = curlString
        .replace(/\s*\\\s*\r?\n/g, ' ')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Tokenize: strings dalam '...' atau "..." atau token biasa
      const tokens = singleLineCurl.match(/'[^']*'|"[^"]*"|\S+/g) || [];

      let i = 0;
      if (tokens[i] && tokens[i].toLowerCase() === 'curl') i++;

      for (; i < tokens.length; i++) {
        const token = tokens[i];

        // panjang token kecil -> kemungkinan option
        if (token === '-X' || token === '--request') {
          const next = tokens[i + 1];
          if (next) {
            result.method = unquote(next).toUpperCase();
            i++;
          }
          continue;
        }

        if (token === '-H' || token === '--header') {
          const headerRaw = tokens[i + 1];
          if (headerRaw) {
            const header = unquote(headerRaw);
            const sep = header.indexOf(':');
            if (sep > -1) {
              const key = header.substring(0, sep).trim();
              const value = header.substring(sep + 1).trim();
              result.headers.push({ id: Date.now() + i + Math.floor(Math.random() * 1000), key, value });
            }
            i++;
          }
          continue;
        }

        if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-ascii') {
          const dataRaw = tokens[i + 1];
          if (dataRaw) {
            result.body = unquote(dataRaw);
            if (!result.method) result.method = 'POST';
            i++;
          } else {
            // mungkin next token tidak ada, cURL mendukung -d '' ; set empty body
            result.body = '';
          }
          continue;
        }

        if (token.startsWith('--url')) {
          // --url='http://...'
          const after = token.includes('=') ? token.split(/=(.+)/)[1] : tokens[i + 1];
          if (after) {
            result.url = unquote(after);
            if (!token.includes('=')) i++;
          }
          continue;
        }

        // panjang opsi bentuk --header:value (jarang) or unknown option -> lewati
        if (token.startsWith('-')) {
          // skip unknown option and possibly its immediate value
          const next = tokens[i + 1];
          if (next && !next.startsWith('-')) i++;
          continue;
        }

        // jika bukan option dan belum ada URL -> treat as URL
        if (!result.url) {
          result.url = unquote(token);
        }
      }

      // Jika tidak ada metode tapi ada body -> POST; jika tidak ada metode dan tidak body -> GET
      if (!result.method) result.method = result.body ? 'POST' : 'GET';

      // --- PERBAIKAN BUG STATE BATCH ---
      const updates = {
        method: result.method,
        url: (result.url || '').trim()
      };

      if (result.body !== undefined) {
        try {
          const parsed = JSON.parse(result.body);
          updates.body = JSON.stringify(parsed, null, 2);
        } catch {
          updates.body = result.body;
        }
      }

      if (result.headers.length > 0) {
        updates.headers = result.headers;
      }

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
    if (Array.isArray(rh)) {
      return rh.map(h => {
        if (typeof h === 'string') return h;
        if (h.key !== undefined) return `${h.key}: ${h.value}`;
        if (h.name !== undefined) return `${h.name}: ${h.value}`;
        return JSON.stringify(h);
      }).join('\n');
    }
    if (typeof rh === 'object') {
      return Object.entries(rh).map(([k, v]) => `${k}: ${v}`).join('\n');
    }
    return String(rh);
  };

  // Memoized guarded Ace component (handles default export namespace)
  const AceComp = useMemo(() => {
    return (AceEditor && AceEditor.default) ? AceEditor.default : AceEditor;
  }, []);

  const isValidAce = AceComp && (typeof AceComp === 'function' || typeof AceComp === 'object');

  // --- Render ---
  return (
    <div className={styles.apiRequestor}>
      
      <div className={styles.apiRequestZone}>
        <div className={styles.corsWarning}>
          <p>
            <strong>Jika kamu dapat response Peringatan CORS:</strong> Gunakan <strong>"Allow CORS"</strong> extension agar bisa berjalan di browser kamu.
          </p>
        </div>

        <div className={styles.apiRequestGrid}>
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

        <div className={styles.apiTabsContainer} style={{ marginTop: '1rem' }}>
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
                <div key={h.id} className={styles.apiHeaderRow} style={{ alignItems: 'center' }}>
                  <input type="text" className="input header-key" placeholder="Key" value={h.key || ''} onChange={(e) => handleHeaderChange(h.id, 'key', e.target.value)} />
                  <input type="text" className="input header-value" placeholder="Value" value={h.value || ''} onChange={(e) => handleHeaderChange(h.id, 'value', e.target.value)} />
                  <button className={`button secondary ${styles.removeHeaderBtn}`} title="Hapus header" onClick={() => removeHeaderRow(h.id)}><i className="fas fa-trash-alt" /></button>
                </div>
              ))}
            </div>
            <button id="api-add-header-btn" className="button secondary" onClick={addHeaderRow}>
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} /> Tambah Header
            </button>
          </div>

          {/* --- Body tab dengan guarded AceEditor (fallback textarea jika import tidak valid) --- */}
          <div id="tab-body" className={`${styles.apiTabContent} ${requestTab === 'body' ? styles.active : ''}`}>

            {/* Render editor with dynamic height (editorHeight state) */}
            {isValidAce ? (
              <AceComp
                mode="json"
                theme="tomorrow_night"
                onChange={(newValue) => onRequestChange('body', newValue)}
                value={body || ''}
                name="api-body-editor"
                editorProps={{ $blockScrolling: true }}
                width="100%"
                height={`${editorHeight}px`}
                fontSize={14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                setOptions={{
                  enableBasicAutocompletion: false,
                  enableLiveAutocompletion: false,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: true
                }}
                style={{ borderRadius: '6px', border: '1px solid var(--card-border)', overflow: 'auto' }}
              />
            ) : (
              <textarea
                value={body || ''}
                onChange={(e) => onRequestChange('body', e.target.value)}
                style={{
                  width: '100%',
                  height: `${editorHeight}px`,
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--card-border)',
                  fontFamily: 'monospace',
                  fontSize: 14,
                  background: 'var(--editor-bg, #0f172a)',
                  color: 'var(--editor-fg, #e2e8f0)',
                  overflow: 'auto',
                  resize: 'vertical' // masih boleh di-resize manual jika mau
                }}
                placeholder="JSON body..."
              />
            )}

            {/* If content taller than max, show small notice */}
            {(() => {
              const maxHeight = 480;
              const natural = calcEditorHeight(body, { lineHeight: 18, verticalPadding: 24, minHeight: 150, maxHeight });
              return natural >= maxHeight ? (
                <div style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Konten panjang — editor dibatasi maksimal {Math.round(maxHeight)}px dan akan muncul scroll.
                </div>
              ) : null;
            })()}
          </div>
          {/* --- AKHIR PERGANTIAN --- */}

        </div>
      </div>

      <div className={styles.apiResponseZone}>
        <div className="card" id="api-response-section">
          {response ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
                <h3 className="label" style={{ marginBottom: 0 }}>Respons</h3>
                <div id="api-response-status-bar" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <span>Status: <strong style={{ color: response.status && response.status.ok ? 'var(--success-color)' : 'var(--danger-color)' }}>{response.status ? `${response.status.code} ${response.status.text || ''}` : '—'}</strong></span>
                  <span>Waktu: <strong>{response.time ?? '—'} ms</strong></span>
                  <span>Ukuran: <strong>{response.size ? `(${(response.size / 1024).toFixed(2)} KB)` : '—'}</strong></span>
                </div>
              </div>

              <div className={styles.apiTabsContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', marginBottom: '1rem', flexShrink: 0 }}>
                  <div className={styles.apiTabsNav} style={{ marginBottom: '-1px', borderBottom: 'none' }}>
                    <button className={`${styles.apiTabBtn} ${responseTab === 'response-body' ? styles.active : ''}`} onClick={() => onResponseTabChange('response-body')}>Body</button>
                    <button className={`${styles.apiTabBtn} ${responseTab === 'response-headers' ? styles.active : ''}`} onClick={() => onResponseTabChange('response-headers')}>Headers</button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      id="api-copy-response-btn"
                      className="button secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={handleCopyResponse}
                    >
                      <i className={`fas ${copyResponseText === 'Disalin!' ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '0.5rem' }} />
                      {copyResponseText}
                    </button>
                  </div>
                </div>

                {/* --- PERBAIKAN: Menghapus style inline maxHeight & overflow --- */}
                {responseTab === 'response-body' && (
                  <div id="tab-response-body" className={`${styles.apiTabContent} ${styles.active}`}>
                    <pre
                      id="api-response-body-output"
                      className={`textarea textarea-editor ${styles.responseOutput}`}
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
                      className={`textarea textarea-editor ${styles.responseOutput}`}
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
              {isLoading ? (
                <div style={{ textAlign: 'center' }}>
                  <div className="loader-spinner" style={{ margin: '0 auto 1rem' }} />
                  <span>Menjalankan permintaan...</span>
                </div>
              ) : 'Tekan "Parse cURL" atau "Kirim" untuk melihat respons di sini'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiRequestor;