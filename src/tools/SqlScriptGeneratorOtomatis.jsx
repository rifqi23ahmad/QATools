import React, { useState, useMemo } from 'react';
import CustomDropdown from '../components/CustomDropdown'; // Impor komponen baru


// --- Helper Functions (Disalin dari file .js Anda) ---
const excelSerialDateToJSDate = (serial) => {
    if (typeof serial !== 'number' || isNaN(serial)) return null;
    const utc_days = Math.floor(serial - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    return date_info;
};

const formatDateToYYYYMMDD = (date) => {
    if (!date || !(date instanceof Date)) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseValues = (content) => {
    let values = []; let currentToken = ""; let inString = false; let parenLevel = 0;
    content = content.trim();
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === "'") { inString = !inString; currentToken += char; }
        else if (!inString) {
            if (char === '(') { parenLevel++; currentToken += char; }
            else if (char === ')') { parenLevel--; currentToken += char; }
            else if (char === ',' && parenLevel === 0) { values.push(currentToken.trim()); currentToken = ""; }
            else { currentToken += char; }
        } else { currentToken += char; }
    }
    values.push(currentToken.trim()); return values.filter(v => v.length > 0);
};

const parseColumns = (content) => {
    return content.trim().split(',').map(c => c.trim().replace(/"/g, ''));
};

const parseJsonValue = (sqlValue) => {
    let jsonString = sqlValue.trim().replace(/::jsonb$|::json$/, '').trim();
    if (jsonString.startsWith("'") && jsonString.endsWith("'")) {
        jsonString = jsonString.slice(1, -1).replace(/''/g, "'");
    }
    try {
        const jsonObj = JSON.parse(jsonString);
        if (jsonObj && typeof jsonObj === 'object') return { jsonObj, jsonKeys: Object.keys(jsonObj) };
    } catch (e) { /* ignore */ }
    return null;
};
// --- Akhir Helper Functions ---


function SqlScriptGeneratorOtomatis() {
  const [sqlTemplate, setSqlTemplate] = useState('');
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [detectedMapping, setDetectedMapping] = useState([]);
  const [mappingState, setMappingState] = useState({});
  const [outputSql, setOutputSql] = useState('');
  
  const [detectInfo, setDetectInfo] = useState('');
  const [excelInfo, setExcelInfo] = useState('');
  const [fileName, setFileName] = useState(''); // <-- State baru untuk nama file
  const [copySuccess, setCopySuccess] = useState(false);
  
  // State baru untuk output, menggantikan showOutputSection
  const [showOutput, setShowOutput] = useState(false);

  const showMappingTable = detectedMapping.length > 0 && excelHeaders.length > 0;
  const showGenerateButton = showMappingTable;
  const showOutputSection = outputSql.length > 0 && showOutput; // Tambahkan pengecekan showOutput

  const handleDetectValues = () => {
    setShowOutput(false); // Sembunyikan output lama saat deteksi baru
    setOutputSql('');     // Hapus SQL lama
    const template = sqlTemplate;
    const valMatch = template.match(/\bVALUES\b\s*\(([\s\S]+?)\)\s*;/i);
    if (!valMatch || !valMatch[1]) {
        setDetectInfo('Error: Tidak dapat menemukan klausa VALUES (...);. Pastikan script diakhiri dengan );');
        return;
    }
    const colMatch = template.match(/INSERT\s+INTO\s+.*?\(([\s\S]+?)\)\s*VALUES/i);
    const valuesContent = valMatch[1];
    let values;
    try {
        values = parseValues(valuesContent);
    } catch (e) {
        setDetectInfo(`Error saat parsing VALUES: ${e.message}`);
        return;
    }

    let newDetectedMapping = [];
    let columns = [];

    if (colMatch && colMatch[1]) {
        const colContent = colMatch[1];
        try {
            columns = parseColumns(colContent);
        } catch (e) {
            setDetectInfo(`Error saat parsing NAMA KOLOM: ${e.message}`);
            return;
        }
        if (columns.length !== values.length) {
            setDetectInfo(`Error: Jumlah kolom (${columns.length}) tidak cocok dengan jumlah nilai (${values.length})!`);
            return;
        }
    } else {
        columns = values.map((v, i) => `Nilai #${i + 1}`);
    }

    const newMappingState = {};
    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const val = values[i];
        const jsonInfo = parseJsonValue(val);
        const mappingItem = { col, val, isJson: false };
        
        if (jsonInfo) {
            mappingItem.isJson = true;
            mappingItem.originalJson = jsonInfo.jsonObj;
            mappingItem.jsonKeys = jsonInfo.jsonKeys;
            
            newMappingState[col] = '__NO_CHANGE__';
            jsonInfo.jsonKeys.forEach(key => {
                newMappingState[`${col}.${key}`] = '__NO_CHANGE__';
            });
        } else {
            newMappingState[col] = '__NO_CHANGE__';
        }
        newDetectedMapping.push(mappingItem);
    }

    setDetectedMapping(newDetectedMapping);
    setMappingState(newMappingState);
    setDetectInfo(`Berhasil! Terdeteksi ${columns.length} kolom & nilai. Silakan unggah Excel.`);
  };

  const handleExcelUpload = (event) => {
    setShowOutput(false); // Sembunyikan output lama saat unggah baru
    setOutputSql('');     // Hapus SQL lama
    const file = event.target.files[0];
    if (!file) {
      setFileName(''); // <-- Reset nama file jika batal
      setExcelInfo(''); // <-- Reset info jika batal
      return;
    }
    
    setFileName(file.name); // <-- Atur nama file
    setExcelInfo('Memproses file...');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            // Pastikan XLSX sudah dimuat di index.html
            if (typeof window.XLSX === 'undefined') {
              throw new Error('Library XLSX tidak ditemukan.');
            }
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const dataAsArray = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (dataAsArray.length === 0) throw new Error('Excel kosong.');
            
            const headers = dataAsArray[0].map(String);
            const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

            setExcelHeaders(headers);
            setExcelData(jsonData);
            setExcelInfo(`File "${file.name}" dimuat. ${headers.length} header dan ${jsonData.length} baris data.`);
        } catch (error) {
            console.error(error);
            setExcelInfo(`Gagal memproses file Excel. ${error.message}`);
            setFileName(''); // <-- Reset nama file jika error
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };
  
  const dropdownOptions = useMemo(() => {
    let opts = [
      { label: '-- Tidak Ada Perubahan (Acuan) --', value: '__NO_CHANGE__' },
      { label: 'Fungsi SQL', value: 'group1', isGroup: true },
      { label: 'uuid_generate_v4()', value: '__UUID_V4__' },
      { label: 'Format Tanggal (YYYY-MM-DD)', value: '__DATE_YYYY_MM_DD__' },
      { label: 'Header dari Excel', value: 'group2', isGroup: true },
    ];
    excelHeaders.forEach(header => {
      opts.push({ label: header, value: header });
    });
    return opts;
  }, [excelHeaders]);

  const handleMappingChange = (key, value) => {
    setMappingState(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateScript = () => {
    const template = sqlTemplate;
    const valuesRegex = /(\bVALUES\b\s*\()([\s\S]+?)(\)\s*;)/i;
    const match = template.match(valuesRegex);
    if (!match) { alert('Error: Tidak dapat menemukan klausa "VALUES (...) ;".'); return; }
    
    const scriptPrefix = template.substring(0, match.index) + match[1] + '\n  ';
    const scriptSuffix = '\n' + match[3] + '\n\n';
    let finalScript = "";

    excelData.forEach(row => {
        let newValues = [];
        let jsonBuilders = {};

        detectedMapping.forEach((item, parentIndex) => {
          if (item.isJson) {
            jsonBuilders[parentIndex] = { ...item.originalJson };
            item.jsonKeys.forEach(subkeyName => {
              const mappedTarget = mappingState[`${item.col}.${subkeyName}`];
              let subValue;
              if (mappedTarget === "__NO_CHANGE__") {
                  subValue = item.originalJson[subkeyName];
              } else if (mappedTarget === "__DATE_YYYY_MM_DD__") {
                  // Coba cari header yang cocok (case-insensitive) di data baris
                  const matchingHeader = Object.keys(row).find(h => h.toLowerCase() === subkeyName.toLowerCase());
                  const rawValue = matchingHeader ? row[matchingHeader] : row[subkeyName];
                  const dateVal = excelSerialDateToJSDate(rawValue);
                  subValue = formatDateToYYYYMMDD(dateVal) || rawValue; // Fallback ke nilai asli jika gagal format
              } else {
                 subValue = row[mappedTarget];
              }
              jsonBuilders[parentIndex][subkeyName] = subValue;
            });
          }
        });

        detectedMapping.forEach((item, mappingIndex) => {
            const mappedTarget = mappingState[item.col];
            let formattedValue;

            if (item.isJson) {
                const newJsonObject = jsonBuilders[mappingIndex];
                const newJsonString = JSON.stringify(newJsonObject);
                formattedValue = `'${newJsonString.replace(/'/g, "''")}'::jsonb`;
            } else {
                if (mappedTarget === "__NO_CHANGE__") {
                    formattedValue = item.val;
                } else if (mappedTarget === "__UUID_V4__") {
                    formattedValue = "public.uuid_generate_v4()";
                } else if (mappedTarget === "__DATE_YYYY_MM_DD__") {
                    // Coba cari header yang cocok (case-insensitive) di data baris
                    const headerToUse = Object.keys(row).find(k => k.toLowerCase() === item.col.toLowerCase().replace(/["`]/g, ''));
                    const rawValue = row[headerToUse];
                    const date = excelSerialDateToJSDate(rawValue);
                    formattedValue = date ? `'${formatDateToYYYYMMDD(date)}'` : 'NULL';
                } else {
                    let value = row[mappedTarget];
                    if (value === null || typeof value === 'undefined') {
                        formattedValue = 'NULL';
                    } else if (typeof value === 'number' && String(value).match(/^\d{5}\.\d+$/)) {
                         const date = excelSerialDateToJSDate(value);
                         formattedValue = date ? `'${formatDateToYYYYMMDD(date)}'` : String(value);
                    } else if (typeof value === 'number') {
                        formattedValue = value;
                    } else {
                        formattedValue = "'" + String(value).replace(/'/g, "''") + "'";
                    }
                }
            }
            newValues.push(formattedValue);
        });
        finalScript += scriptPrefix + newValues.join(',\n  ') + scriptSuffix;
    });
    
    setOutputSql(finalScript);
    setShowOutput(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputSql).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Menggunakan kelas dari style.css
  return (
    <div className="card" id="SqlScriptGeneratorOtomatis">
      <div className="tool-header">
        <h1 className="text-center">SQL Script Generator (Otomatis)</h1>
      </div>
      
      {/* Box instruksi ini menggunakan kelas-kelas yang didefinisikan di style.css */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
        <h3 className="font-bold text-blue-800">Cara Penggunaan (v8):</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
            <li>Paste satu script SQL (INSERT ... VALUES (...);) ke kotak "Template Script SQL".</li>
            <li>Klik tombol "Deteksi Kolom & Nilai".</li>
            <li>Jika berhasil, unggah file Excel yang berisi data Anda. Pastikan header Excel cocok.</li>
            <li>Tabel "Pemetaan Nilai" akan muncul.</li>
            <li>Untuk setiap "Kolom Script", pilih "Header dari Excel" yang sesuai di dropdown "Ganti Dengan".</li>
            <li>Jika nilai acuan adalah JSON, Anda dapat memetakan setiap sub-key di dalamnya.</li>
            <li>Gunakan opsi "Fungsi SQL" untuk hal seperti `uuid_generate_v4()` atau format tanggal.</li>
            <li>Klik "Generate Script". Hasilnya akan muncul di bawah.</li>
        </ol>
      </div>

      {/* Menggunakan .grid .grid-cols-2 dari style.css */}
      <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
        <div>
          <div>
            <label htmlFor="sql-template" className="label">1. Template Script SQL</label>
            <textarea 
              id="sql-template" 
              className="textarea textarea-editor font-mono" // Menggunakan .textarea
              style={{ height: '12rem', fontSize: '0.875rem' }} // Ganti h-48 dan text-sm
              placeholder="Paste script INSERT tunggal Anda di sini, diakhiri dengan );"
              value={sqlTemplate}
              onChange={(e) => setSqlTemplate(e.target.value)}
            />
            <button id="detect-values-button" className="button primary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={handleDetectValues}>
              2. Deteksi Kolom & Nilai
            </button>
            <div id="detect-info" className={`text-sm mt-2 ${detectInfo.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{detectInfo}</div>
          </div>
          
          {/* --- BLOK INPUT FILE YANG DIMODIFIKASI --- */}
          <div style={{ marginTop: '1.5rem' }}>
            <label htmlFor="excel-upload" className="label">3. Unggah File Excel</label>
            
            <label 
              htmlFor="excel-upload" 
              className="button secondary" 
              style={{
                width: '100%', 
                justifyContent: 'flex-start',
                overflow: 'hidden',
                cursor: 'pointer'
              }}
            >
              {fileName ? (
                <>
                  <i className="fas fa-check-circle" style={{ color: 'var(--success-color)', marginRight: '0.75rem', flexShrink: 0 }}></i>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileName}
                  </span>
                </>
              ) : (
                <>
                  <i className="fas fa-upload" style={{ marginRight: '0.75rem', flexShrink: 0 }}></i>
                  <span>Pilih File Excel...</span>
                </>
              )}
            </label>
            <input 
              type="file" 
              id="excel-upload" 
              className="is-hidden" // Input asli disembunyikan
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
            />
            
            <div 
              id="excel-info" 
              className={`text-sm mt-2 ${excelInfo.startsWith('Gagal') ? 'text-red-600' : 'text-green-600'}`}
              style={{minHeight: '1.25rem'}} // Mencegah layout "lompat"
            >
              {fileName ? excelInfo : 'Silakan pilih file untuk diproses.'}
            </div>
          </div>
          {/* --- AKHIR BLOK INPUT FILE --- */}

        </div>

        <div>
          {showMappingTable && (
            <div id="mapping-section">
              <label className="label">4. Pemetaan Nilai</label>
              {/* Ganti kelas layout dengan style inline atau wrapper dari style.css */}
              <div style={{ border: '1px solid var(--card-border)', borderRadius: '6px', maxHeight: '24rem', overflowY: 'auto' }}>
                <table className="results-table" style={{ minWidth: '100%' }}> {/* Ganti ke .results-table */}
                  <thead style={{ backgroundColor: '#f7fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Kolom Script</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nilai Acuan</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ganti Dengan</th>
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#ffffff' }}>
                    {detectedMapping.map((item, index) => (
                      <React.Fragment key={item.col}>
                        {/* Kelas-kelas ini (json-main-row, detected-value, dll) didefinisikan di style.css */}
                        <tr className={`border-b border-gray-200 ${item.isJson ? 'json-main-row' : ''}`}>
                          <td style={{ padding: '0.5rem' }}><code className="bg-gray-100 text-gray-800 px-2 py-1 rounded">{item.col}</code></td>
                          <td className="tooltip-cell" style={{ padding: '0.5rem' }} title={item.val}>
                            <code className="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value">{item.val}</code>
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <CustomDropdown 
                              options={dropdownOptions}
                              value={mappingState[item.col]}
                              onChange={(val) => handleMappingChange(item.col, val)}
                            />
                          </td>
                        </tr>
                        {item.isJson && item.jsonKeys.map(key => (
                          <tr key={key} className="border-b border-gray-200 json-subkey-row">
                            <td style={{ padding: '0.5rem' }}><code className="json-key-code px-2 py-1 rounded ml-4">{key}</code></td>
                            <td className="tooltip-cell" style={{ padding: '0.5rem' }} title={String(item.originalJson[key])}>
                              <code className="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value">{String(item.originalJson[key])}</code>
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              <CustomDropdown 
                                options={dropdownOptions}
                                value={mappingState[`${item.col}.${key}`]}
                                onChange={(val) => handleMappingChange(`${item.col}.${key}`, val)}
                              />
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {showGenerateButton && (
            <div style={{ marginTop: '1.5rem' }}> {/* Ganti space-y-6 */}
              <button id="generate-button" className="button success" style={{ width: '100%' }} onClick={handleGenerateScript}>
                5. Generate Script
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showOutputSection && (
        <div id="output-section" style={{ marginTop: '2rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Hasil Script</h2>
            <button id="copy-button" className="button secondary" onClick={copyToClipboard}>
              Copy
            </button>
          </div>
          <textarea id="output-sql" className="textarea textarea-editor font-mono" style={{ height: '20rem', backgroundColor: '#f7fafc', fontSize: '0.875rem' }} readOnly value={outputSql} />
          {copySuccess && (
            <div id="copy-success" className="text-green-600 font-semibold" style={{ marginTop: '0.5rem' }}>Berhasil disalin ke clipboard!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SqlScriptGeneratorOtomatis;