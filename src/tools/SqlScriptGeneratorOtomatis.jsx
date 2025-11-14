// src/tools/SqlScriptGeneratorOtomatis.jsx

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
  const [copySuccess, setCopySuccess] = useState(false);
  
  const showMappingTable = detectedMapping.length > 0 && excelHeaders.length > 0;
  const showGenerateButton = showMappingTable;
  const showOutputSection = outputSql.length > 0;

  const handleDetectValues = () => {
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
        // Fallback jika tidak ada kolom
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
            
            newMappingState[col] = '__NO_CHANGE__'; // Mapping untuk objek JSON utama
            jsonInfo.jsonKeys.forEach(key => {
                newMappingState[`${col}.${key}`] = '__NO_CHANGE__'; // Mapping untuk setiap sub-key
            });
        } else {
            newMappingState[col] = '__NO_CHANGE__'; // Mapping untuk nilai non-JSON
        }
        newDetectedMapping.push(mappingItem);
    }

    setDetectedMapping(newDetectedMapping);
    setMappingState(newMappingState); // Simpan state mapping
    setDetectInfo(`Berhasil! Terdeteksi ${columns.length} kolom & nilai. Silakan unggah Excel.`);
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setExcelInfo('Memproses file...');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = window.XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const dataAsArray = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (dataAsArray.length === 0) throw new Error('Excel kosong.');
            
            setExcelHeaders(dataAsArray[0].map(String));
            setExcelData(window.XLSX.utils.sheet_to_json(worksheet));
            setExcelInfo(`File "${file.name}" dimuat. ${dataAsArray[0].length} header dan ${excelData.length} baris data.`);
        } catch (error) {
            setExcelInfo('Gagal memproses file Excel. Pastikan formatnya benar.');
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = ''; // Reset input file
  };
  
  // Buat opsi dropdown menggunakan useMemo
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

        // Pre-process all rows to build JSON objects first
        detectedMapping.forEach((item, parentIndex) => {
          if (item.isJson) {
            jsonBuilders[parentIndex] = { ...item.originalJson }; // Clone
            item.jsonKeys.forEach(subkeyName => {
              const mappedTarget = mappingState[`${item.col}.${subkeyName}`];
              let subValue;
              if (mappedTarget === "__NO_CHANGE__") {
                  subValue = item.originalJson[subkeyName];
              } else if (mappedTarget === "__DATE_YYYY_MM_DD__") {
                  const dateVal = excelSerialDateToJSDate(row[subkeyName]);
                  subValue = formatDateToYYYYMMDD(dateVal) || row[subkeyName];
              } else {
                 subValue = row[mappedTarget];
              }
              jsonBuilders[parentIndex][subkeyName] = subValue;
            });
          }
        });

        // Process main rows to construct final values list
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

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">SQL Script Generator (Otomatis)</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
        <h3 className="font-bold text-blue-800">Cara Penggunaan (v8):</h3>
        <ol className="list-decimal list-inside text-sm text-blue-700 mt-2 space-y-1">
            {/* ... (Instruksi) ... */}
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="sql-template" className="block text-lg font-semibold text-gray-700 mb-2">1. Template Script SQL</label>
            <textarea 
              id="sql-template" 
              className="w-full h-48 p-3 border border-gray-300 rounded-md shadow-sm font-mono text-sm" 
              placeholder="Paste script INSERT tunggal Anda di sini, diakhiri dengan );"
              value={sqlTemplate}
              onChange={(e) => setSqlTemplate(e.target.value)}
            />
            <button id="detect-values-button" className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-md" onClick={handleDetectValues}>
              2. Deteksi Kolom & Nilai
            </button>
            <div id="detect-info" className={`text-sm mt-2 ${detectInfo.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{detectInfo}</div>
          </div>
          <div>
            <label htmlFor="excel-upload" className="block text-lg font-semibold text-gray-700 mb-2">3. Unggah File Excel</label>
            <input 
              type="file" 
              id="excel-upload" 
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
            />
            <div id="excel-info" className={`text-sm mt-2 ${excelInfo.startsWith('Gagal') ? 'text-red-600' : 'text-green-600'}`}>{excelInfo}</div>
          </div>
        </div>

        <div className="space-y-6">
          {showMappingTable && (
            <div id="mapping-section">
              <label className="block text-lg font-semibold text-gray-700 mb-2">4. Pemetaan Nilai</label>
              <div className="border border-gray-300 rounded-md shadow-sm max-h-96 overflow-y-auto">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Kolom Script</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Nilai Acuan</th>
                      <th className="p-3 text-left text-sm font-semibold text-gray-600">Ganti Dengan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {detectedMapping.map((item, index) => (
                      <React.Fragment key={item.col}>
                        <tr className={`border-b border-gray-200 ${item.isJson ? 'json-main-row' : ''}`}>
                          <td className="p-2"><code className="bg-gray-100 text-gray-800 px-2 py-1 rounded">{item.col}</code></td>
                          <td className="p-2 tooltip-cell" title={item.val}>
                            <code className="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value">{item.val}</code>
                          </td>
                          <td className="p-2">
                            <CustomDropdown 
                              options={dropdownOptions}
                              value={mappingState[item.col]}
                              onChange={(val) => handleMappingChange(item.col, val)}
                            />
                          </td>
                        </tr>
                        {item.isJson && item.jsonKeys.map(key => (
                          <tr key={key} className="border-b border-gray-200 json-subkey-row">
                            <td className="p-2"><code className="json-key-code px-2 py-1 rounded ml-4">{key}</code></td>
                            <td className="p-2 tooltip-cell" title={String(item.originalJson[key])}>
                              <code className="bg-gray-100 text-gray-500 px-2 py-1 rounded detected-value">{String(item.originalJson[key])}</code>
                            </td>
                            <td className="p-2">
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
            <div>
              <button id="generate-button" className="w-full bg-green-600 text-white px-4 py-3 rounded-md" onClick={handleGenerateScript}>
                5. Generate Script
              </button>
            </div>
          )}
        </div>
      </div>
      
      {showOutputSection && (
        <div id="output-section" className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold text-gray-800">Hasil Script</h2>
            <button id="copy-button" className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md" onClick={copyToClipboard}>
              Copy
            </button>
          </div>
          <textarea id="output-sql" className="w-full h-80 p-3 border border-gray-300 rounded-md shadow-sm font-mono text-sm bg-gray-50" readOnly value={outputSql} />
          {copySuccess && (
            <div id="copy-success" className="text-green-600 font-semibold mt-2">Berhasil disalin ke clipboard!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SqlScriptGeneratorOtomatis;