import React, { useState } from 'react';

// Fungsi helper untuk parsing
function parseSqlValues(valueStr) {
  const values = []; let currentVal = ''; let inString = false; let pLevel = 0; let strDelim = '';
  for (let i = 0; i < valueStr.length; i++) {
    const char = valueStr[i];
    if (inString) {
      if (char === strDelim) { if (i + 1 < valueStr.length && valueStr[i+1] === strDelim) { currentVal += char + char; i++; } else { inString = false; currentVal += char; } }
      else { currentVal += char; }
    } else {
      if (char === "'" || char === '"') { inString = true; strDelim = char; currentVal += char; } 
      else if (char === '(') { pLevel++; currentVal += char; } 
      else if (char === ')') { pLevel--; currentVal += char; } 
      else if (char === ',' && pLevel === 0) { values.push(currentVal.trim()); currentVal = ''; } 
      else { currentVal += char; }
    }
  }
  values.push(currentVal.trim());
  return values.map(v => {
    const jsonMatch = v.match(/^('.*')::json$/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1].slice(1, -1)); } catch (e) { return jsonMatch[1].slice(1, -1); } }
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) { return v.slice(1, -1); }
    return v;
  });
}

function formatSqlValue(value) {
  const valueStr = String(value).trim();
  if (valueStr.toUpperCase() === 'NULL') return 'NULL';
  const keywords = ['now()', 'public.uuid_generate_v4()'];
  if (keywords.includes(valueStr.toLowerCase())) return valueStr;
  if (valueStr.startsWith('{') && valueStr.endsWith('}')) { try { JSON.parse(valueStr); return `'${valueStr.replace(/'/g, "''")}'::json`; } catch (e) {} }
  if (valueStr === '') return "''";
  const isNum = /^-?\d+(\.\d+)?$/.test(valueStr);
  if (isNum && !(valueStr.length > 1 && valueStr.startsWith('0') && !valueStr.startsWith('0.'))) return valueStr;
  return `'${valueStr.replace(/'/g, "''")}'`;
}

// Komponen Utama
function SqlInjector() {
  // State untuk data
  const [sqlInput, setSqlInput] = useState('');
  const [sqlOutput, setSqlOutput] = useState('');
  const [dataRows, setDataRows] = useState([]); // Ini adalah pengganti tabel DOM
  
  // State untuk template
  const [tableName, setTableName] = useState('');
  const [originalColumns, setOriginalColumns] = useState([]);
  const [displayColumns, setDisplayColumns] = useState([]); // Kolom yg sdh di-flat
  const [jsonStructure, setJsonStructure] = useState({});
  const [templateValues, setTemplateValues] = useState([]);
  
  // State untuk UI
  const [showForm, setShowForm] = useState(false);
  const [showOutput, setShowOutput] = useState(false);

  const showToast = (message) => {
    // Implementasi toast sederhana
    alert(message);
  };

  const handleParse = () => {
    try {
      const insertRegex = /INSERT\s+INTO\s+((?:[a-zA-Z0-9_."]+\.)?[a-zA-Z0-9_."]+)\s*\((.*?)\)\s*values\s*\((.*)\)\s*;?/is;
      const match = sqlInput.match(insertRegex);
      if (!match) throw new Error("Format query INSERT tidak valid.");

      const newTableName = match[1].trim();
      const newOriginalColumns = match[2].trim().split(',').map(c => c.trim());
      const values = parseSqlValues(match[3].trim());

      if (newOriginalColumns.length !== values.length) throw new Error(`Jumlah kolom (${newOriginalColumns.length}) tidak cocok dengan jumlah nilai (${values.length}).`);

      let newDisplayColumns = [];
      let newJsonStructure = {};
      let initialDisplayValues = [];
      
      newOriginalColumns.forEach((colName, index) => {
        const cleanColName = colName.replace(/["`]/g, '');
        const val = values[index];
        let isJson = false, jsonObj = null;
        if (typeof val === 'object' && val !== null) { isJson = true; jsonObj = val; }
        else if (typeof val === 'string') {
          try { const p = JSON.parse(val); if (typeof p === 'object' && p !== null) { isJson = true; jsonObj = p; } } catch (e) {}
        }
        
        if (isJson) {
          const keys = Object.keys(jsonObj);
          if (keys.length > 0) {
            newJsonStructure[cleanColName] = keys;
            keys.forEach(key => {
              newDisplayColumns.push({ name: `${cleanColName}.${key}`, isJsonPart: true });
              initialDisplayValues.push(jsonObj[key] || '');
            });
            return;
          }
        }
        newDisplayColumns.push({ name: cleanColName, isJsonPart: false });
        initialDisplayValues.push(val);
      });

      // Set semua state bersamaan
      setTableName(newTableName);
      setOriginalColumns(newOriginalColumns);
      setDisplayColumns(newDisplayColumns);
      setJsonStructure(newJsonStructure);
      setTemplateValues(initialDisplayValues);
      
      // Buat baris data awal berdasarkan template
      const initialRow = {};
      newDisplayColumns.forEach((col, i) => {
        initialRow[col.name] = initialDisplayValues[i];
      });
      initialRow.id = Date.now(); // ID unik untuk React key
      setDataRows([initialRow]);
      
      setShowForm(true);
      setShowOutput(false);
      setSqlOutput('');

    } catch (error) {
      alert('Gagal menganalisis query: ' + error.message);
    }
  };

  const handleAddRow = () => {
    const newRow = {};
    displayColumns.forEach((col, i) => {
      newRow[col.name] = ''; // Baris baru defaultnya kosong
    });
    newRow.id = Date.now();
    setDataRows([...dataRows, newRow]);
  };

  const handleRemoveRow = (id) => {
    setDataRows(dataRows.filter(row => row.id !== id));
  };

  const handleDataChange = (id, columnName, value) => {
    setDataRows(dataRows.map(row => 
      row.id === id ? { ...row, [columnName]: value } : row
    ));
  };
  
  const handlePaste = (e, startRowId, startColumnName) => {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const parsedRows = pastedText.trim().split(/[\r\n]+/).map(row => row.split('\t'));
    if (parsedRows.length === 0) return;

    const startRowIndex = dataRows.findIndex(r => r.id === startRowId);
    const startColIndex = displayColumns.findIndex(c => c.name === startColumnName);
    
    let updatedDataRows = [...dataRows];
    let newRowsToAdd = [];

    parsedRows.forEach((rowData, rowIndex) => {
      const targetRowIndex = startRowIndex + rowIndex;
      
      if (targetRowIndex < updatedDataRows.length) {
        // Update baris yang ada
        let rowToUpdate = { ...updatedDataRows[targetRowIndex] };
        rowData.forEach((cellData, colIndex) => {
          const targetColIndex = startColIndex + colIndex;
          if (targetColIndex < displayColumns.length) {
            const colName = displayColumns[targetColIndex].name;
            rowToUpdate[colName] = cellData;
          }
        });
        updatedDataRows[targetRowIndex] = rowToUpdate;
      } else {
        // Buat baris baru
        let newRow = { id: Date.now() + rowIndex };
        templateValues.forEach((val, i) => newRow[displayColumns[i].name] = ''); // Isi default
        rowData.forEach((cellData, colIndex) => {
          const targetColIndex = startColIndex + colIndex;
          if (targetColIndex < displayColumns.length) {
            newRow[displayColumns[targetColIndex].name] = cellData;
          }
        });
        newRowsToAdd.push(newRow);
      }
    });
    
    setDataRows([...updatedDataRows, ...newRowsToAdd]);
  };

  const handleGenerateScript = () => {
    if (dataRows.length === 0) {
      alert("Tidak ada data untuk dibuatkan script.");
      return;
    }
    
    let finalScript = '';
    const columnsList = originalColumns.join(', ');

    dataRows.forEach(row => {
      const finalValues = [];
      let currentInputIndex = 0;
      
      originalColumns.forEach(colName => {
        const cleanColName = colName.replace(/["`]/g, '');
        if (jsonStructure[cleanColName]) {
          const jsonObj = {};
          jsonStructure[cleanColName].forEach(key => {
            const colFullName = `${cleanColName}.${key}`;
            let cellValue = row[colFullName].trim();
            if (cellValue === '') cellValue = templateValues[currentInputIndex];
            jsonObj[key] = cellValue;
            currentInputIndex++;
          });
          finalValues.push(formatSqlValue(JSON.stringify(jsonObj)));
        } else {
          let cellValue = row[cleanColName].trim();
          finalValues.push(formatSqlValue(cellValue === '' ? templateValues[currentInputIndex] : cellValue));
          currentInputIndex++;
        }
      });
      finalScript += `INSERT INTO ${tableName} (${columnsList})\nvalues\n(${finalValues.join(', ')});\n\n`;
    });
    
    setSqlOutput(finalScript);
    setShowOutput(true);
  };
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = window.XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) throw new Error("File Excel kosong atau hanya berisi header.");
        
        const excelHeaders = jsonData.shift().map(h => h.toString().trim());
        const colNames = displayColumns.map(c => c.name);
        const headerMap = colNames.map(name => {
          const index = excelHeaders.indexOf(name);
          if (index === -1) throw new Error(`Kolom "${name}" tidak ditemukan di file Excel.`);
          return index;
        });
        
        const newRows = jsonData.map((row, i) => {
          const newRowData = { id: Date.now() + i };
          headerMap.forEach((excelIndex, colIndex) => {
            const colName = displayColumns[colIndex].name;
            newRowData[colName] = row[excelIndex] || '';
          });
          return newRowData;
        });
        
        setDataRows(newRows);
        showToast("Data dari Excel berhasil diunggah!");
      } catch (error) {
        alert("Gagal memproses file Excel: " + error.message);
      } finally {
        event.target.value = ''; // Reset input file
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const headers = displayColumns.map(c => c.name);
    const ws = window.XLSX.utils.aoa_to_sheet([headers]);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Data Template");
    window.XLSX.writeFile(wb, "template_import.xlsx");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlOutput).then(() => showToast('Script disalin!'));
  };

  const handleClear = () => {
    setSqlInput(''); setSqlOutput(''); setDataRows([]);
    setTableName(''); setOriginalColumns([]); setDisplayColumns([]);
    setJsonStructure({}); setTemplateValues([]);
    setShowForm(false); setShowOutput(false);
  };
return (
    <div id="SqlInjector">
      <div className="tool-header">
        <h1>SQL INSERT Query Generator</h1>
        <p>Tempelkan query SQL Anda untuk membuat form input data secara otomatis.</p>
      </div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label className="label">1. Tempelkan Contoh Query INSERT</label>
       <textarea 
        id="sql-injector-input" 
        rows="8" 
        className="textarea textarea-editor" 
        placeholder={`Contoh: INSERT INTO users (id, name, address_data) values (1, 'John Doe', '{"city":"Jakarta"}');`}
        value={sqlInput}
        onChange={(e) => setSqlInput(e.target.value)}
      />
        <button id="parse-btn" className="button primary" style={{ marginTop: '1.rem' }} onClick={handleParse}>
          Analisis Query & Buat Form
        </button>
      </div>

      {showForm && (
        <div id="form-container" className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="label">2. Masukkan Data Baru</h2>
          {/* ... Teks tips ... */}
          <p style={{color: '#38a169', marginBottom: '1rem', fontSize: '0.9rem'}}><strong>Tips:</strong> Header miring berwarna hijau adalah bagian dari JSON.</p>
          <div id="data-table-container" className="results-table-wrapper" style={{ maxHeight: '50vh', overflow: 'auto' }}>
            <table className="results-table">
              <thead>
                <tr>
                  {displayColumns.map(col => (
                    <th key={col.name} style={col.isJsonPart ? { fontStyle: 'italic', backgroundColor: '#c6f6d5', color: '#22543d' } : {}}>
                      {col.name}
                    </th>
                  ))}
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="data-tbody">
                {dataRows.map((row) => (
                  <tr key={row.id}>
                    {displayColumns.map(col => (
                      <td key={col.name} style={{ padding: '0.25rem' }}>
                        <textarea 
                          rows="1" 
                          className="input" 
                          style={{ padding: '0.5rem', height: 'auto' }}
                          value={row[col.name]}
                          onChange={(e) => handleDataChange(row.id, col.name, e.target.value)}
                          onPaste={(e) => handlePaste(e, row.id, col.name)}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '0.25rem' }}>
                      <button className="button secondary remove-row-btn" style={{ width: '100%', backgroundColor: '#fed7d7', color: '#822727' }} onClick={() => handleRemoveRow(row.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex" style={{ marginTop: '1rem', gap: '0.75rem' }}>
            <button id="download-template-btn" className="button secondary" onClick={handleDownloadTemplate}>Download Template</button>
            <label htmlFor="excel-input" className="button secondary">Unggah Excel</label>
            <input type="file" id="excel-input" className="is-hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <button id="add-row-btn" className="button success" onClick={handleAddRow}>Tambah Baris</button>
            <button id="generate-script-btn" className="button primary" onClick={handleGenerateScript}>Buat Script SQL</button>
          </div>
        </div>
      )}

      {showOutput && (
        <div id="output-container" className="card">
          <label className="label">3. Hasil Script SQL</label>
          <textarea 
            id="sql-injector-output" 
            rows="10" 
            readOnly 
            className="textarea textarea-editor" 
            style={{ backgroundColor: '#2d3748', color: '#c6f6d5' }}
            value={sqlOutput}
          />
          <div className="flex" style={{ marginTop: '1rem', gap: '0.75rem' }}>
            <button id="copy-btn" className="button secondary" onClick={handleCopy}>Salin Script</button>
            <button id="clear-btn" className="button" style={{ backgroundColor: '#e53e3e', color: 'white' }} onClick={handleClear}>Mulai dari Awal</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SqlInjector;