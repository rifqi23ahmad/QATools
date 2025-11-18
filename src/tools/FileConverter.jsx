import React, { useState, useEffect, useRef } from 'react';
import ToolHeader from '../components/ToolHeader';
import ReusableAceEditor from '../components/ReusableAceEditor';

// --- FUNGSI HELPER KONVERSI XML KE JSON ---
function xmlToJson(xml) {
  try {
    let obj = {};
    if (xml.nodeType === 1) { // element
      if (xml.attributes.length > 0) {
        obj["@attributes"] = {};
        for (let j = 0; j < xml.attributes.length; j++) {
          const attribute = xml.attributes.item(j);
          obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType === 3) { // text
      obj = xml.nodeValue;
    }

    if (xml.hasChildNodes()) {
      for (let i = 0; i < xml.childNodes.length; i++) {
        const item = xml.childNodes.item(i);
        const nodeName = item.nodeName;
        if (typeof (obj[nodeName]) === "undefined") {
          obj[nodeName] = xmlToJson(item);
        } else {
          if (typeof (obj[nodeName].push) === "undefined") {
            const old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(xmlToJson(item));
        }
      }
    }
    return obj;
  } catch (e) {
    return {};
  }
}

// --- STYLING ---
const styles = {
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#2d3748',
    color: 'white',
    alignItems: 'center',
    borderRadius: '8px',
    margin: '1rem 0',
    flexWrap: 'wrap'
  },
  outputTabs: {
    display: 'flex',
    gap: '5px',
    padding: '0 10px',
    backgroundColor: '#1a202c',
    overflowX: 'auto',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
  },
  tab: {
    padding: '10px 20px',
    cursor: 'pointer',
    color: '#718096',
    borderBottom: '3px solid transparent',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'color 0.2s'
  },
  activeTab: {
    color: 'white',
    borderBottom: '3px solid #4299e1',
  },
  iconBtn: {
    background: 'transparent',
    border: '1px solid #4a5568',
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s'
  },
  tableContainer: {
    height: '300px', 
    overflow: 'auto', 
    backgroundColor: '#fff',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
  },
  // Style view toggle
  viewToggle: {
    display: 'flex', 
    backgroundColor: '#cbd5e0', 
    borderRadius: '6px', 
    padding: '2px'
  },
  viewToggleBtn: (active) => ({
    padding: '4px 12px', 
    borderRadius: '4px', 
    border: 'none', 
    cursor: 'pointer', 
    fontSize: '0.8rem',
    backgroundColor: active ? 'white' : 'transparent',
    color: active ? '#2d3748' : '#4a5568',
    fontWeight: active ? '600' : '400',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
  }),
  tableInput: {
    width: '100%', border: 'none', background: 'transparent',
    padding: '4px', fontFamily: 'inherit', fontSize: 'inherit',
    color: 'inherit', outline: 'none'
  },
  // Empty state background
  emptyOutput: {
    height: '300px',
    backgroundColor: '#1a202c', // Hitam gelap sesuai request
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4a5568',
    flexDirection: 'column',
    gap: '10px'
  }
};

function FileConverter() {
  // --- STATE ---
  const [inputText, setInputText] = useState(''); 
  const [inputFormat, setInputFormat] = useState('');
  const [inputViewMode, setInputViewMode] = useState('code'); // 'code' | 'table'
  
  const [outputFormat, setOutputFormat] = useState('json');
  const [outputViewMode, setOutputViewMode] = useState('code'); 
  const [outputText, setOutputText] = useState('');
  const [outputBlob, setOutputBlob] = useState(null);
  
  const [tableData, setTableData] = useState({ headers: [], rows: [] }); // Struktur Tabel
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('data');

  const formats = [
    { id: 'json', label: 'JSON' },
    { id: 'excel', label: 'Excel' },
    { id: 'csv', label: 'CSV' },
    { id: 'sql', label: 'SQL' },
    { id: 'xml', label: 'XML' },
    { id: 'yaml', label: 'YAML' },
  ];

  const fileInputRef = useRef(null);

  // --- PARSING HELPER ---
  const parseJsonToTable = (jsonStr) => {
    try {
      let data = JSON.parse(jsonStr);
      if (!Array.isArray(data)) {
         // Coba handle XML converted object yang biasanya bersarang
         if (data && typeof data === 'object') {
             const keys = Object.keys(data);
             if (keys.length === 1 && Array.isArray(data[keys[0]])) {
                 data = data[keys[0]];
             } else {
                 data = [data];
             }
         } else {
             data = [data];
         }
      }
      if (data.length === 0) return { headers: [], rows: [] };

      // Flatten object sederhana untuk tabel preview
      const headers = Array.from(new Set(data.flatMap(item => item ? Object.keys(item) : [])));
      const rows = data.map(item => headers.map(k => (item[k] && typeof item[k] === 'object') ? '[Object]' : (item[k] ?? '')));
      
      return { headers, rows };
    } catch (e) {
      return { headers: [], rows: [] };
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText) {
        setTableData(parseJsonToTable(inputText));
      } else {
        setTableData({ headers: [], rows: [] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputText]);


  // --- 1. HANDLER UPLOAD (SUPPORTS ALL FORMATS) ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    setFileName(file.name.replace(/\.[^/.]+$/, ""));
    setIsLoading(true);

    const reader = new FileReader();

    // A. EXCEL BINARY
    if (['xlsx', 'xls'].includes(ext)) {
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = window.XLSX.utils.sheet_to_json(firstSheet);
          
          setInputText(JSON.stringify(jsonData, null, 2));
          setInputFormat('Excel');
          setInputViewMode('table'); 
          setOutputFormat('json');
        } catch (err) {
          alert('Gagal membaca Excel: ' + err.message);
        } finally { setIsLoading(false); }
      };
      reader.readAsArrayBuffer(file);
    } 
    // B. TEXT BASED (CSV, JSON, XML, SQL, TXT)
    else {
      reader.onload = (ev) => {
        const content = ev.target.result;
        
        if (ext === 'csv') {
            try {
                const workbook = window.XLSX.read(content, { type: 'string' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = window.XLSX.utils.sheet_to_json(firstSheet);
                setInputText(JSON.stringify(jsonData, null, 2));
                setInputFormat('CSV');
                setInputViewMode('table');
                setOutputFormat('excel');
            } catch(e) { setInputText(content); setInputFormat('CSV (Raw)'); }
        } else if (ext === 'xml') {
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(content, "text/xml");
                const json = xmlToJson(xmlDoc);
                setInputText(JSON.stringify(json, null, 2));
                setInputFormat('XML');
                setInputViewMode('code'); // XML strukturnya sering nested
                setOutputFormat('json');
            } catch(e) { setInputText(content); setInputFormat('XML (Raw)'); }
        } else if (ext === 'json') {
            setInputText(content);
            setInputFormat('JSON');
            setInputViewMode('code');
            setOutputFormat('excel');
        } else {
            setInputText(content);
            setInputFormat(ext.toUpperCase());
            setInputViewMode('code');
            setOutputFormat('json');
        }
        setIsLoading(false);
      };
      reader.readAsText(file);
    }
    e.target.value = ''; 
  };


  // --- 2. HANDLER EDIT CELL ---
  const handleCellEdit = (rowIndex, colIndex, newValue) => {
    try {
      let data = JSON.parse(inputText);
      if (!Array.isArray(data)) data = [data];
      const headers = tableData.headers;
      const key = headers[colIndex];
      if (data[rowIndex]) {
        data[rowIndex][key] = newValue;
        setInputText(JSON.stringify(data, null, 2));
      }
    } catch (e) {}
  };


  // --- 3. ENGINE KONVERSI ---
  useEffect(() => {
    if (!inputText) {
      setOutputText('');
      setOutputBlob(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        let data;
        try {
          data = JSON.parse(inputText);
          // Normalisasi untuk konversi tabel
          if (!Array.isArray(data)) {
             // Coba flatten jika XML
             if (data && typeof data === 'object') {
                 const keys = Object.keys(data);
                 if (keys.length === 1 && Array.isArray(data[keys[0]])) {
                     data = data[keys[0]];
                 } else {
                     data = [data];
                 }
             } else {
                 data = [data];
             }
          }
        } catch (e) {
           // Jika input bukan JSON (misal SQL Raw), hanya bisa konversi ke format teks lain secara terbatas
           if (outputFormat !== 'json') {
             // Fallback: treat input as raw text wrapper
             data = [{ raw_content: inputText }]; 
           } else {
             data = [];
           }
        }

        switch (outputFormat) {
          case 'json':
            setOutputText(JSON.stringify(data, null, 2));
            setOutputBlob(null);
            setOutputViewMode('code');
            break;

          case 'excel':
            const wb = window.XLSX.utils.book_new();
            const ws = window.XLSX.utils.json_to_sheet(data);
            window.XLSX.utils.book_append_sheet(wb, ws, "Data");
            setOutputBlob(wb); 
            setOutputText(""); // Kosongkan teks karena binary
            setOutputViewMode('table'); // Preview tabel
            break;

          case 'csv':
            const wsCsv = window.XLSX.utils.json_to_sheet(data);
            const csvOut = window.XLSX.utils.sheet_to_csv(wsCsv);
            setOutputText(csvOut);
            setOutputBlob(null);
            setOutputViewMode('code');
            break;

          case 'sql':
            if (data.length === 0) { setOutputText(''); break; }
            const keys = Object.keys(data[0]);
            const sql = data.map(row => {
              const values = keys.map(k => {
                const val = row[k];
                return typeof val === 'number' ? val : `'${String(val).replace(/'/g, "''")}'`;
              }).join(', ');
              return `INSERT INTO table_name (${keys.join(', ')}) VALUES (${values});`;
            }).join('\n');
            setOutputText(sql);
            setOutputBlob(null);
            setOutputViewMode('code');
            break;
          
          case 'xml':
             // Simple XML Generator
             let xmlStr = '<root>\n';
             data.forEach(row => {
                 xmlStr += '  <row>\n';
                 Object.keys(row).forEach(k => {
                     xmlStr += `    <${k}>${row[k]}</${k}>\n`;
                 });
                 xmlStr += '  </row>\n';
             });
             xmlStr += '</root>';
             setOutputText(xmlStr);
             setOutputBlob(null);
             setOutputViewMode('code');
             break;

          case 'yaml':
             // Simple YAML Generator (Mockup)
             const yamlStr = data.map(row => 
                 '- ' + Object.entries(row).map(([k,v]) => `${k}: ${v}`).join('\n  ')
             ).join('\n');
             setOutputText(yamlStr);
             setOutputBlob(null);
             setOutputViewMode('code');
             break;

          default:
            setOutputText('');
        }
      } catch (err) {
        setOutputText('Error: ' + err.message);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputText, outputFormat]);


  // --- 4. ACTIONS ---
  const handleDownload = () => {
    if (outputFormat === 'excel' && outputBlob) {
      window.XLSX.writeFile(outputBlob, `${fileName}.xlsx`);
    } else {
      const mimeMap = { json: 'application/json', csv: 'text/csv', sql: 'text/plain', xml: 'text/xml', yaml: 'text/yaml' };
      const extMap = { json: '.json', csv: '.csv', sql: '.sql', xml: '.xml', yaml: '.yaml' };
      const blob = new Blob([outputText], { type: mimeMap[outputFormat] || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}${extMap[outputFormat]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCopy = () => {
    const textToCopy = (outputFormat === 'excel') ? JSON.stringify(JSON.parse(inputText), null, 2) : outputText;
    navigator.clipboard.writeText(textToCopy);
    alert('Copied to clipboard!');
  };

  const handleClear = () => {
    setInputText('');
    setFileName('data');
    setTableData({ headers: [], rows: [] });
    setInputFormat('');
  };

  const handleBeautify = () => { try { setInputText(JSON.stringify(JSON.parse(inputText), null, 2)); } catch (e) {} };
  const handleMinify = () => { try { setInputText(JSON.stringify(JSON.parse(inputText))); } catch (e) {} };

  // --- RENDER TABLE COMPONENT ---
  const RenderTable = ({ data, editable = false }) => {
    if (!data || data.rows.length === 0) {
      return (
        <div style={styles.emptyOutput}>
           <i className="fas fa-table fa-2x" style={{ opacity: 0.5 }}></i>
           <span>Tidak ada data tabel</span>
        </div>
      );
    }
    return (
      <div style={styles.tableContainer} className="results-table-wrapper">
        <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f1f5f9' }}>
            <tr>
              {data.headers.map((h, i) => (
                <th key={i} style={{ padding: '10px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.85rem', color: '#4a5568', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rIdx) => (
              <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {data.headers.map((_, cIdx) => (
                  <td key={cIdx} style={{ padding: '4px 10px', fontSize: '0.85rem', color: '#2d3748', borderRight: '1px solid #f7fafc' }}>
                    {editable ? (
                      <input 
                        style={styles.tableInput}
                        value={row[cIdx] !== undefined ? row[cIdx] : ''}
                        onChange={(e) => handleCellEdit(rIdx, cIdx, e.target.value)}
                      />
                    ) : (
                      <span>{row[cIdx] !== undefined ? String(row[cIdx]) : ''}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <ToolHeader title="Universal Converter" description="Konversi CSV, XML, Excel, SQL, JSON dengan editor dan preview." />

      {/* INPUT SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <div style={styles.sectionHeader}>
          <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-database" style={{ color: '#48bb78' }}></i>
            <span>Input {inputFormat || ''}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
             {inputText && (
                <div style={styles.viewToggle}>
                  <button onClick={() => setInputViewMode('table')} style={styles.viewToggleBtn(inputViewMode === 'table')}><i className="fas fa-table"></i> Table</button>
                  <button onClick={() => setInputViewMode('code')} style={styles.viewToggleBtn(inputViewMode === 'code')}><i className="fas fa-code"></i> Code</button>
                </div>
             )}
            <input type="file" ref={fileInputRef} className="is-hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.json,.csv,.xml,.sql,.txt" />
            <button className="button primary" style={{ fontSize: '0.85rem', padding: '6px 12px' }} onClick={() => fileInputRef.current.click()}>
              <i className="fas fa-upload" style={{ marginRight: '5px' }}></i> Upload
            </button>
          </div>
        </div>
        {inputViewMode === 'table' ? (
          <RenderTable data={tableData} editable={true} />
        ) : (
          <ReusableAceEditor
            mode="json" theme="textmate" value={inputText} onChange={setInputText}
            name="input_editor" height="300px" width="100%" placeholder="Paste data here..." wrapEnabled={true} style={{ border: 'none' }}
          />
        )}
      </div>

      {/* TOOLBAR */}
      <div style={styles.toolbar}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#a0aec0', marginRight: '10px' }}><i className="fas fa-tools"></i> Tools:</span>
        <button style={styles.iconBtn} onClick={handleClear} title="Clear"><i className="fas fa-trash-alt" style={{ color: '#fc8181' }}></i> Clear</button>
        <div style={{ width: '1px', height: '20px', background: '#4a5568', margin: '0 5px' }}></div>
        <button style={styles.iconBtn} onClick={handleBeautify} title="Format JSON"><i className="fas fa-indent"></i> Beautify</button>
        <button style={styles.iconBtn} onClick={handleMinify} title="Minify JSON"><i className="fas fa-compress-arrows-alt"></i> Minify</button>
        <span style={{ fontSize: '0.8rem', color: '#718096', fontStyle: 'italic', marginLeft: 'auto' }}>Edit data di atas untuk update hasil</span>
      </div>

      {/* OUTPUT SECTION */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', backgroundColor: '#1a202c' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a202c', paddingRight: '10px' }}>
          <div style={styles.outputTabs}>
            {formats.map(fmt => (
              <div key={fmt.id} style={{ ...styles.tab, ...(outputFormat === fmt.id ? styles.activeTab : {}) }} onClick={() => setOutputFormat(fmt.id)}>
                {fmt.label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {inputText && (outputFormat === 'excel' || outputFormat === 'csv') && (
               <div style={{ display: 'flex', backgroundColor: '#2d3748', borderRadius: '6px', padding: '2px', marginRight: '10px' }}>
                  <button onClick={() => setOutputViewMode('table')} style={{ ...styles.viewToggleBtn(outputViewMode === 'table'), color: outputViewMode === 'table' ? '#fff' : '#a0aec0' }}><i className="fas fa-table"></i></button>
                  <button onClick={() => setOutputViewMode('code')} style={{ ...styles.viewToggleBtn(outputViewMode === 'code'), color: outputViewMode === 'code' ? '#fff' : '#a0aec0' }}><i className="fas fa-code"></i></button>
               </div>
            )}
            <button className="button" style={{ background: '#2d3748', color: 'white', border: '1px solid #4a5568', padding: '4px 10px', fontSize: '0.8rem' }} onClick={handleCopy}><i className="fas fa-copy"></i></button>
            <button className="button success" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={handleDownload}><i className="fas fa-download"></i></button>
          </div>
        </div>

        {/* LOGIKA OUTPUT KOSONG / ISI */}
        {!inputText ? (
           <div style={styles.emptyOutput}>
              <i className="fas fa-file-import fa-3x"></i>
              <span>Belum ada data input</span>
              <span style={{fontSize: '0.8rem'}}>Upload file atau paste data di atas</span>
           </div>
        ) : (
           // Jika ada data, render sesuai View Mode
           outputViewMode === 'table' && (outputFormat === 'excel' || outputFormat === 'csv') ? (
              <div style={{ backgroundColor: 'white' }}>
                <RenderTable data={tableData} editable={false} />
              </div>
           ) : (
              <div style={{ padding: '0', backgroundColor: '#1a202c' }}>
                <ReusableAceEditor
                  mode={['sql','json','xml','yaml'].includes(outputFormat) ? outputFormat : 'text'}
                  theme="tomorrow_night" value={outputText} name="output_editor" height="300px" width="100%"
                  readOnly={true} wrapEnabled={true} showGutter={true} style={{ backgroundColor: '#1a202c' }} 
                />
              </div>
           )
        )}
        
        <div style={{ padding: '10px 15px', borderTop: '1px solid #2d3748', backgroundColor: '#1a202c', color: '#718096', fontSize: '0.85rem' }}>
          <i className="fas fa-info-circle"></i> {outputFormat === 'excel' ? 'Excel akan diunduh sebagai file binary (.xlsx).' : `Preview format ${outputFormat.toUpperCase()}.`}
        </div>
      </div>
    </div>
  );
}

export default FileConverter;