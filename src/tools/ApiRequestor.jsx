import React, { useState } from 'react';

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

  // --- Syntax highlight yang aman (menerima object atau string) ---
  function highlightJsonSyntax(jsonInput) {
    if (jsonInput === undefined || jsonInput === null) return '';
    let jsonString = typeof jsonInput === 'string' ? jsonInput : JSON.stringify(jsonInput, null, 2);
    // escape HTML
    jsonString = jsonString.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) { cls = /:$/.test(match) ? 'json-key' : 'json-string'; }
        else if (/true|false/.test(match)) { cls = 'json-boolean'; }
        else if (/null/.test(match)) { cls = 'json-null'; }
        return `<span class="${cls}">${match}</span>`;
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
          // beberapa option tidak punya value; kita berusaha melihat apakah next terlihat seperti value (bukan option) -> jika bukan option, lewati next
          const next = tokens[i + 1];
          if (next && !next.startsWith('-')) i++;
          continue;
        }

        // jika bukan option dan belum ada URL -> treat as URL
        if (!result.url) {
          result.url = unquote(token);
        }
        // else ignore (positional args)
      }

      // Jika tidak ada metode tapi ada body -> POST; jika tidak ada metode dan tidak body -> GET
      if (!result.method) result.method = result.body ? 'POST' : 'GET';

      // --- PERBAIKAN BUG STATE BATCH ---
      // 1. Kumpulkan semua pembaruan dalam satu objek
      const updates = {
        method: result.method,
        url: (result.url || '').trim()
      };

      if (result.body !== undefined) {
        // coba parse JSON; jika berhasil, set pretty JSON; else set raw
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

      // 2. Panggil onRequestChange HANYA SEKALI dengan objek batch
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

  // Helper untuk render response headers dalam format yang rapi
  const renderResponseHeaders = (rh) => {
    if (!rh) return '';
    // Jika array of {key, value}
    if (Array.isArray(rh)) {
      return rh.map(h => {
        if (typeof h === 'string') return h;
        if (h.key !== undefined) return `${h.key}: ${h.value}`;
        // if object with name/value
        if (h.name !== undefined) return `${h.name}: ${h.value}`;
        return JSON.stringify(h);
      }).join('\n');
    }
    // Jika object map
    if (typeof rh === 'object') {
      return Object.entries(rh).map(([k, v]) => `${k}: ${v}`).join('\n');
    }
    // fallback: plain string
    return String(rh);
  };

  // --- Render ---
  return (
    <div id="ApiRequestor">
      <div className="api-request-zone">
        <div className="cors-warning">
          <p>
            <strong>Jika ada Peringatan CORS:</strong> Gunakan <strong>"Allow CORS"</strong> extension agar bisa berjalan di browser kamu.
          </p>
        </div>

        <div className="api-request-grid">
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

        <div className="api-tabs-container" style={{ marginTop: '1rem' }}>
          <div className="api-tabs-nav">
            <button className={`api-tab-btn ${requestTab === 'headers' ? 'active' : ''}`} onClick={() => setRequestTab('headers')}>Headers</button>
            <button className={`api-tab-btn ${requestTab === 'body' ? 'active' : ''}`} onClick={() => setRequestTab('body')}>Body (JSON)</button>
          </div>

          <div id="tab-headers" className={`api-tab-content ${requestTab === 'headers' ? 'active' : ''}`}>
            <div id="api-headers-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {(headers || []).map(h => (
                <div key={h.id} className="api-header-row" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="text" className="input header-key" placeholder="Key" value={h.key || ''} onChange={(e) => handleHeaderChange(h.id, 'key', e.target.value)} />
                  <input type="text" className="input header-value" placeholder="Value" value={h.value || ''} onChange={(e) => handleHeaderChange(h.id, 'value', e.target.value)} />
                  <button className="button secondary remove-header-btn" title="Hapus header" onClick={() => removeHeaderRow(h.id)}><i className="fas fa-trash-alt" /></button>
                </div>
              ))}
            </div>
            <button id="api-add-header-btn" className="button secondary" onClick={addHeaderRow}>
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }} /> Tambah Header
            </button>
          </div>

          <div id="tab-body" className={`api-tab-content ${requestTab === 'body' ? 'active' : ''}`}>
            <textarea
              id="api-body"
              className="textarea textarea-editor"
              rows="4"
              placeholder='{ "key": "value" }'
              value={body || ''}
              onChange={(e) => onRequestChange('body', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="api-response-zone">
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

              <div className="api-tabs-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', marginBottom: '1rem', flexShrink: 0 }}>
                  <div className="api-tabs-nav" style={{ marginBottom: '-1px', borderBottom: 'none' }}>
                    <button className={`api-tab-btn ${responseTab === 'response-body' ? 'active' : ''}`} onClick={() => onResponseTabChange('response-body')}>Body</button>
                    <button className={`api-tab-btn ${responseTab === 'response-headers' ? 'active' : ''}`} onClick={() => onResponseTabChange('response-headers')}>Headers</button>
                  </div>
                  <button
                    id="api-copy-response-btn"
                    className="button secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}
                    onClick={handleCopyResponse}
                  >
                    <i className={`fas ${copyResponseText === 'Disalin!' ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: '0.5rem' }} />
                    {copyResponseText}
                  </button>
                </div>

                {/* --- PERBAIKAN SCROLL, WARNA, DAN TAB --- */}
                {responseTab === 'response-body' && (
                  <div id="tab-response-body" className="api-tab-content active">
                    <pre
                      id="api-response-body-output"
                      className="textarea textarea-editor"
                      style={{
                        backgroundColor: '#2d3748',
                        color: '#e2e8f0',
                        whiteSpace: 'pre-wrap',
                        padding: '1rem',
                        // Solusi scroll "seperti header"
                        maxHeight: '40vh',
                        overflow: 'auto'
                      }}
                      dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(response.body) }}
                    />
                  </div>
                )}
                
                {responseTab === 'response-headers' && (
                  <div id="tab-response-headers" className="api-tab-content active">
                    <pre
                      id="api-response-headers-output"
                      className="textarea textarea-editor"
                      style={{
                        backgroundColor: '#f7fafc',
                        padding: '1rem',
                        whiteSpace: 'pre-wrap',
                        // Solusi scroll "seperti header"
                        maxHeight: '40vh',
                        overflow: 'auto'
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