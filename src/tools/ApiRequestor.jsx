import React, { useState } from 'react';

function ApiRequestor() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState([
    { id: 1, key: 'Content-Type', value: 'application/json' },
    { id: 2, key: 'Accept', value: 'application/json' },
  ]);
  const [body, setBody] = useState('');
  const [requestTab, setRequestTab] = useState('headers');
  const [responseTab, setResponseTab] = useState('response-body');
  
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [curlInput, setCurlInput] = useState('');

  // --- Fungsi Bantuan Syntax Highlighting ---
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

  // --- Logika Header ---
  const handleHeaderChange = (id, field, value) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const addHeaderRow = () => {
    setHeaders([...headers, { id: Date.now(), key: '', value: '' }]);
  };

  const removeHeaderRow = (id) => {
    setHeaders(headers.filter(h => h.id !== id));
  };

  // --- Logika Beautify JSON ---
  const beautifyJson = () => {
    try {
      const jsonObj = JSON.parse(body);
      setBody(JSON.stringify(jsonObj, null, 2));
    } catch (error) {
      alert('Gagal mem-beautify: JSON tidak valid.\n\n' + error.message);
    }
  };

  // --- Logika cURL Parser ---
  const parseCurlCommand = () => {
    const curlString = curlInput.trim();
      if (!curlString) return alert('Silakan tempel (paste) perintah cURL Anda.');
  
      try {
        const result = { method: 'GET', url: '', headers: [], body: '' };
        
        // GANTI DENGAN FUNGSI INI
        const unquote = (s) => {
          if (!s) return s;
          if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
              return s.slice(1, -1);
          }
          return s;
        };
  
        const singleLineCurl = curlString.replace(/\\\n/g, ' ').replace(/\s+/g, ' ');
        

      let i = 0;
      if (tokens[i] === 'curl') i++;
      
      while (i < tokens.length && !result.url) {
        if (!tokens[i].startsWith('-')) result.url = unquote(tokens[i]);
        i++;
      }

      for (; i < tokens.length; i++) {
        const token = tokens[i];
        switch (token) {
          case '-X': case '--request':
            result.method = unquote(tokens[i + 1]).toUpperCase(); i++; break;
          case '-H': case '--header':
            const header = unquote(tokens[i + 1]);
            const separatorIndex = header.indexOf(':');
            if (separatorIndex > -1) {
              const key = header.substring(0, separatorIndex).trim();
              const value = header.substring(separatorIndex + 1).trim();
              result.headers.push({ id: Date.now() + i, key, value });
            }
            i++; break;
          case '-d': case '--data': case '--data-raw':
            result.body = unquote(tokens[i + 1]);
            if (result.method === 'GET') result.method = 'POST';
            i++; break;
        }
      }

      setMethod(result.method);
      setUrl(result.url);
      setBody(result.body);
      setHeaders(result.headers.length > 0 ? result.headers : headers);
      if (result.body) beautifyJson();
      alert('cURL berhasil diparsing!');
    } catch (error) {
      alert('Gagal mem-parsing cURL: ' + error.message);
    }
  };

  // --- Logika Pengiriman Request ---
  const handleSend = async () => {
    if (!url) return alert('URL tidak boleh kosong.');

    setIsLoading(true);
    setResponse(null);
    setResponseTab('response-body'); // Reset ke tab body
    
    const requestHeaders = new Headers();
    headers.forEach(h => { if (h.key) requestHeaders.append(h.key, h.value) });

    const requestOptions = { method, headers: requestHeaders };
    if (method !== 'GET' && method !== 'HEAD' && body) {
      requestOptions.body = body;
    }

    const startTime = performance.now();
    let status = { code: 0, text: '' }, time = 0, size = 0;
    let responseBodyText = '', responseHeadersText = '';

    try {
      const res = await fetch(url, requestOptions);
      const endTime = performance.now();
      
      status = { code: res.status, text: res.statusText, ok: res.ok };
      time = (endTime - startTime).toFixed(0);
      
      res.headers.forEach((value, key) => {
        responseHeadersText += `${key}: ${value}\n`;
      });

      responseBodyText = await res.text();
      size = new TextEncoder().encode(responseBodyText).length;

    } catch (error) {
      const endTime = performance.now();
      status = { code: 'Error', text: 'Gagal Fetch', ok: false };
      time = (endTime - startTime).toFixed(0);
      responseBodyText = `${error.message}\n\n(Ini kemungkinan besar adalah error CORS. Periksa konsol browser [F12] untuk detailnya.)`;
    } finally {
      setIsLoading(false);
      setResponse({ status, time, size, body: responseBodyText, headers: responseHeadersText });
    }
  };

  return (
    <div>
      <div className="tool-header">
        <h1>API Requestor (cURL Runner)</h1>
        <p>Buat permintaan HTTP dan lihat responsnya langsung dari browser.</p>
      </div>

      <div className="card" style={{ backgroundColor: '#fffbea', borderColor: '#fbd38d', marginBottom: '1.5rem' }}>
        {/* ... Peringatan CORS ... */}
      </div>

      <div className="card" id="api-curl-importer" style={{ marginBottom: '1.5rem', backgroundColor: '#f7fafc' }}>
        <label htmlFor="api-curl-input" className="label" style={{ fontSize: '1.1rem' }}>Impor dari cURL</label>
        <textarea 
          id="api-curl-input" 
          className="textarea textarea-editor" 
          rows="6" 
          placeholder="curl 'https://api.example.com' -H 'Auth:...'"
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
        />
        <button id="api-parse-curl-btn" className="button primary" style={{ marginTop: '1rem' }} onClick={parseCurlCommand}>
          <i className="fas fa-magic" style={{ marginRight: '0.5rem' }}></i> Parse cURL
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="api-request-grid">
          <select id="api-method" className="select" style={{ maxWidth: '150px' }} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
          <input 
            type="text" 
            id="api-url" 
            className="input" 
            placeholder="https://api.example.com/v1/users"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button id="api-send-btn" className="button primary" onClick={handleSend} disabled={isLoading}>
            {isLoading ? (
              <div className="loader-spinner"></div>
            ) : (
              <i className="fas fa-paper-plane" style={{ marginRight: '0.5rem' }}></i>
            )}
            {isLoading ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
        
        <div className="api-tabs-container" style={{ marginTop: '1.5rem' }}>
          <div className="api-tabs-nav">
            <button className={`api-tab-btn ${requestTab === 'headers' ? 'active' : ''}`} onClick={() => setRequestTab('headers')}>Headers</button>
            <button className={`api-tab-btn ${requestTab === 'body' ? 'active' : ''}`} onClick={() => setRequestTab('body')}>Body (JSON)</button>
          </div>
          
          <div id="tab-headers" className={`api-tab-content ${requestTab === 'headers' ? 'active' : ''}`}>
            <div id="api-headers-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {headers.map(h => (
                <div key={h.id} className="api-header-row">
                  <input 
                    type="text" 
                    className="input header-key" 
                    placeholder="Key" 
                    value={h.key}
                    onChange={(e) => handleHeaderChange(h.id, 'key', e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="input header-value" 
                    placeholder="Value" 
                    value={h.value}
                    onChange={(e) => handleHeaderChange(h.id, 'value', e.target.value)}
                  />
                  <button className="button secondary remove-header-btn" title="Hapus header" onClick={() => removeHeaderRow(h.id)}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              ))}
            </div>
            <button id="api-add-header-btn" className="button secondary" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }} onClick={addHeaderRow}>
              <i className="fas fa-plus" style={{ marginRight: '0.5rem' }}></i> Tambah Header
            </button>
          </div>
          
          <div id="tab-body" className={`api-tab-content ${requestTab === 'body' ? 'active' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button id="api-beautify-json-btn" className="button secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }} onClick={beautifyJson}>
                Beautify JSON
              </button>
            </div>
            <textarea 
              id="api-body" 
              className="textarea textarea-editor" 
              rows="10" 
              placeholder='{ "key": "value" }'
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Bagian Respons */}
      {response && (
        <div className="card" id="api-response-section">
          <h3 className="label">Respons</h3>
          <div id="api-response-status-bar" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <span>Status: <strong style={{ color: response.status.ok ? 'var(--success-color)' : 'var(--danger-color)' }}>{response.status.code} {response.status.text}</strong></span>
            <span>Waktu: <strong>{response.time} ms</strong></span>
            <span>Ukuran: <strong>(${(response.size / 1024).toFixed(2)} KB)</strong></span>
          </div>
          
          <div className="api-tabs-container">
            <div className="api-tabs-nav">
              <button className={`api-tab-btn ${responseTab === 'response-body' ? 'active' : ''}`} onClick={() => setResponseTab('response-body')}>Body</button>
              <button className={`api-tab-btn ${responseTab === 'response-headers' ? 'active' : ''}`} onClick={() => setResponseTab('response-headers')}>Headers</button>
            </div>
            
            <div id="tab-response-body" className={`api-tab-content ${responseTab === 'response-body' ? 'active' : ''}`}>
              <pre 
                id="api-response-body-output" 
                className="textarea textarea-editor" 
                style={{ backgroundColor: '#2d3748', color: '#e2e8f0', minHeight: '200px' }}
                dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(response.body) }}
              />
            </div>
            
            <div id="tab-response-headers" className={`api-tab-content ${responseTab === 'response-headers' ? 'active' : ''}`}>
              <pre 
                id="api-response-headers-output" 
                className="textarea textarea-editor" 
                style={{ backgroundColor: '#f7fafc', minHeight: '200px' }}
              >
                {response.headers}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiRequestor;