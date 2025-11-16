import React, { useState } from 'react';
import ToolHeader from '../components/ToolHeader';
import ReusableAceEditor from '../components/ReusableAceEditor'; // <-- Impor Ace Editor

// Komponen kecil untuk status message
const StatusMessage = ({ message, type }) => {
  if (!message) return <div style={{ minHeight: '20px' }}></div>;
  const color = type === 'error' ? 'var(--danger-color)' : 'var(--success-color)';
  return (
    <div id="status-message" className="text-center" style={{ color: color, minHeight: '20px', marginTop: '1rem' }}>
      {message}
    </div>
  );
};

function JsonValueExtractor() {
  const [jsonInput, setJsonInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [filterKeyInput, setFilterKeyInput] = useState('');
  const [filterValueInput, setFilterValueInput] = useState('');
  const [resultOutput, setResultOutput] = useState('');
  const [status, setStatus] = useState({ message: '', type: 'idle' });
  const [copyButtonText, setCopyButtonText] = useState('Salin');

  // --- Fungsi Helper (disalin dari file asli) ---
  function findDataArray(data) {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      const commonKeys = ['data', 'payload', 'items', 'results', 'records', 'value'];
      for (const key of commonKeys) {
        if (data[key] && Array.isArray(data[key])) return data[key];
      }
      if (data.payload && typeof data.payload === 'object') {
        const nestedData = findDataArray(data.payload);
        if (nestedData) return nestedData;
      }
    }
    return [data];
  }

  function findAllValuesForKey(data, key, resultSet) {
    if (Array.isArray(data)) {
      data.forEach(item => findAllValuesForKey(item, key, resultSet));
    } else if (typeof data === 'object' && data !== null) {
      for (const currentKey in data) {
        if (Object.prototype.hasOwnProperty.call(data, currentKey)) {
          if (currentKey === key) {
            resultSet.add(data[currentKey]);
          }
          if (typeof data[currentKey] === 'object') {
            findAllValuesForKey(data[currentKey], key, resultSet);
          }
        }
      }
    }
  }
  // --- Akhir Fungsi Helper ---

  const handleExtract = () => {
    const keyToFind = keyInput.trim();
    const filterKey = filterKeyInput.trim();
    const filterValue = filterValueInput.trim();
    const hasFilter = filterKey && filterValue;
    
    setResultOutput('');
    setStatus({ message: '', type: 'idle' });

    if (!jsonInput) {
      setStatus({ message: "Input JSON tidak boleh kosong.", type: 'error' });
      return;
    }
    if (!keyToFind) {
      setStatus({ message: "Key yang dicari tidak boleh kosong.", type: 'error' });
      return;
    }

    let jsonData;
    try {
      const sanitizedJson = jsonInput.replace(/,\\s*([}\]])/g, '$1');
      jsonData = JSON.parse(sanitizedJson);
    } catch (error) {
       try {
          const wrappedJson = `[${jsonInput.trim().replace(/}\\s*,\\s*{/g, '},{')}]`;
          jsonData = JSON.parse(wrappedJson);
       } catch (finalError) {
          setStatus({ message: "Format JSON tidak valid.", type: 'error' });
          return;
       }
    }

    const records = findDataArray(jsonData);
    const values = new Set();

    records.forEach(record => {
      if (hasFilter) {
        const filterValuesFound = new Set();
        findAllValuesForKey(record, filterKey, filterValuesFound);
        if (Array.from(filterValuesFound).some(val => String(val) === filterValue)) {
          findAllValuesForKey(record, keyToFind, values);
        }
      } else {
        findAllValuesForKey(record, keyToFind, values);
      }
    });
    
    const uniqueValues = Array.from(values);

    if (uniqueValues.length === 0) {
      let errorMsg = `Key "${keyToFind}" tidak ditemukan.`;
      if (hasFilter) errorMsg += ` dengan filter "${filterKey}" = "${filterValue}".`;
      setStatus({ message: errorMsg, type: 'error' });
      return;
    }

    const formattedValues = uniqueValues
      .map(value => `'${String(value).replace(/'/g, "''")}'`)
      .join(',\n');
    
    setResultOutput(formattedValues);
    setStatus({ message: `Berhasil menemukan ${uniqueValues.length} nilai unik.`, type: 'success' });
  };

  const handleCopy = () => {
    if (!resultOutput) return;
    navigator.clipboard.writeText(resultOutput).then(() => {
      setCopyButtonText('Disalin!');
      setStatus({ message: 'Hasil disalin ke clipboard!', type: 'success' });
      setTimeout(() => setCopyButtonText('Salin'), 2000);
    }).catch(err => {
      setStatus({ message: 'Gagal menyalin.', type: 'error' });
    });
  };

  return (
    <div>
      <ToolHeader 
        title="JSON Value Extractor"
        description="Ekstrak nilai dari JSON dan format untuk klausa SQL IN."
      />
      <div className="card">
        <div className="grid grid-cols-2">
          {/* Kolom Kiri */}
          <div className="flex flex-col" style={{ gap: '1.5rem' }}>
            <div>
              <label htmlFor="json-input" className="label">1. Tempelkan JSON Anda di sini</label>
              {/* --- DIGANTI DARI TEXTAREA --- */}
              <ReusableAceEditor
                mode="json"
                theme="textmate"
                onChange={setJsonInput} // Mengirim fungsi update state langsung
                value={jsonInput}
                height="30vh"
                width="100%"
                name="json-input-editor"
                placeholder='[{"id": "abc"}, {"id": "def"}]'
                wrapEnabled={true}
              />
            </div>
            <div>
              <label htmlFor="key-input" className="label">2. Masukkan Key yang Dicari</label>
              <input 
                type="text" 
                id="key-input" 
                className="input" 
                placeholder="contoh: ticketGroupId"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="filter-key-input" className="label">3. Filter (Opsional)</label>
              <div className="flex" style={{ gap: '0.5rem' }}>
                <input 
                  type="text" 
                  id="filter-key-input" 
                  className="input" 
                  placeholder="Key, cth: branchName"
                  value={filterKeyInput}
                  onChange={(e) => setFilterKeyInput(e.target.value)}
                />
                <input 
                  type="text" 
                  id="filter-value-input" 
                  className="input" 
                  placeholder="Value, cth: BOGOR R4"
                  value={filterValueInput}
                  onChange={(e) => setFilterValueInput(e.target.value)}
                />
              </div>
            </div>
            <button id="extract-btn" className="button primary" onClick={handleExtract}>
              Ekstrak Nilai
            </button>
          </div>

          {/* Kolom Kanan */}
          <div className="flex flex-col" style={{ height: '100%' }}>
            <label htmlFor="result-output" className="label">4. Hasil dalam Format SQL</label>
            <div style={{ position: 'relative', flexGrow: 1, minHeight: '300px' }}>
              {/* --- DIGANTI DARI TEXTAREA --- */}
              <ReusableAceEditor
                mode="sql" // Outputnya adalah SQL
                theme="textmate"
                value={resultOutput}
                height="100%" // Biarkan flexbox mengatur tinggi
                width="100%"
                name="result-output-editor"
                placeholder="'nilai1',..."
                readOnly={true}
                wrapEnabled={true}
              />
              <button 
                id="copy-btn" 
                className="button secondary" 
                style={{ position: 'absolute', top: '8px', right: '8px', padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                onClick={handleCopy}
              >
                {copyButtonText}
              </button>
            </div>
            <StatusMessage message={status.message} type={status.type} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default JsonValueExtractor;