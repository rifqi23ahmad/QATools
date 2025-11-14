import React, { useState } from 'react';

// --- Helper & Data (dari file asli) ---
// Pindahkan mapping dan helper ke luar komponen agar tidak dibuat ulang
const branchMapping = { "ACEH": { "code": "5600", "id": 319 }, "ALUE BILIE": { "code": "5613", "id": 323 }, /* ... (salin sisa branchMapping Anda di sini) ... */ "YOGYAKARTA": { "code": "3000", "id": 218 } };

function generateUUID() { return crypto.randomUUID(); }
function getFormattedTimestamp() {
    const now = new Date();
    const pad = (num) => num.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${now.getMilliseconds().toString().padStart(3, '0')}`;
}
function escapeSqlString(value, isNumeric = false) {
    if (value === null || typeof value === 'undefined') return 'NULL';
    if (isNumeric) return value;
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
         return `'${value.replace(/'/g, "''")}'`;
    }
    return `'${String(value).replace(/'/g, "''")}'`;
}
function generateRandomEmail(name) {
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `${sanitizedName}${randomNum}@generatedmail.com`;
}
function generateRandomNumericString(length) {
    let result = '';
    for (let i = 0; i < length; i++) { result += Math.floor(Math.random() * 10); }
    return result;
}
function generateRandomNpwp() { return `${generateRandomNumericString(2)}.${generateRandomNumericString(3)}.${generateRandomNumericString(3)}.${generateRandomNumericString(1)}-${generateRandomNumericString(3)}.${generateRandomNumericString(3)}`; }
function parseCsvRow(row) {
    // Parser sederhana dari file asli
    const match = row.match(/([^,]+),([^,]+),([^,]+),([^,]+),(.*)/);
    if (!match) return null;
    return [ match[1].trim().replace(/^"|"$/g, ''), match[2].trim().replace(/^"|"$/g, ''), match[3].trim().replace(/^"|"$/g, ''), match[4].trim().replace(/^"|"$/g, ''), match[5].trim().replace(/^"|"$/g, '') ];
}
// --- Akhir Helper & Data ---

function SqlScriptGenerator() {
  const [csvData, setCsvData] = useState('');
  const [fileName, setFileName] = useState('');
  const [config, setConfig] = useState({
    createdBy: '2133',
    consumerType: 'AUCTION_HOUSE',
    branchCode: '0100',
    branchId: '179'
  });
  const [outputConsumer, setOutputConsumer] = useState('');
  const [outputMapping, setOutputMapping] = useState('');
  const [summary, setSummary] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (message, isError = false) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
    // (Anda bisa menambahkan class 'error' berdasarkan 'isError')
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCsvData(e.target.result);
        showToast(`${file.name} berhasil dimuat.`);
      };
      reader.onerror = () => {
        setCsvData('');
        setFileName('');
        showToast('Error saat membaca file.', true);
      };
      reader.readAsText(file);
    }
  };

  const handleConfigChange = (e) => {
    const { id, value } = e.target;
    setConfig(prev => ({ ...prev, [id]: value }));
  };

  const handleGenerate = () => {
    if (!csvData) {
      showToast('Error: Silakan unggah file CSV terlebih dahulu.', true);
      return;
    }

    const { createdBy, consumerType, branchCode: branchCodeDefault, branchId: branchIdFallback } = config;
    
    const allRows = csvData.trim().split(/\r\n|\n/).slice(1);
    const validRows = allRows.filter(row => row.trim() !== '');
    const warehouseMap = new Map();
    let consumerScript = '';
    let mappingScript = '';

    validRows.forEach(row => {
        const columns = parseCsvRow(row);
        if (!columns || columns.length < 5) return;
        const warehouseName = columns[0];
        if (!warehouseMap.has(warehouseName)) {
            warehouseMap.set(warehouseName, { id: generateUUID(), address: columns[4], picName: columns[3], phoneNumber: columns[2], lat: generateRandomNumericString(4), long: generateRandomNumericString(4), branchName: columns[1] });
        }
    });
    
    warehouseMap.forEach((consumerInfo, warehouseName) => {
         const now = getFormattedTimestamp();
         const foundBranchForWarehouse = branchMapping[warehouseName.toUpperCase()];
         const branchIdToUse = foundBranchForWarehouse ? foundBranchForWarehouse.id : branchIdFallback;
         const branchCodeToUse = foundBranchForWarehouse ? foundBranchForWarehouse.code : branchCodeDefault;
         const consumerNameFormatted = 'WAREHOUSE ' + warehouseName.toUpperCase();
         const picNameFormatted = consumerInfo.picName.toUpperCase();
         consumerScript += `INSERT INTO cash_management_schema.consumer (...) VALUES(...);\n\n`; // (Query SQL lengkap Anda di sini)
    });

    validRows.forEach(row => {
        const columns = parseCsvRow(row);
        if (!columns || columns.length < 5) return;
        const warehouseName = columns[0];
        const branchName = columns[1];
        const consumerInfo = warehouseMap.get(warehouseName);
        if (consumerInfo) {
            const now = getFormattedTimestamp();
            const foundBranch = branchMapping[branchName.toUpperCase()];
            const branchIdToUse = foundBranch ? foundBranch.id : 'NULL';
            const branchCodeToUse = foundBranch ? foundBranch.code : branchCodeDefault;
            const factoryAddressFormatted = 'WAREHOUSE ' + warehouseName.toUpperCase();
            const dataJson = JSON.stringify({ lat: consumerInfo.lat, long: consumerInfo.long, address: consumerInfo.address, factoryId: factoryAddressFormatted, factoryAddress: factoryAddressFormatted, picAuctionHouse: consumerInfo.picName.toUpperCase(), picAuctionHousePhone: consumerInfo.phoneNumber });
            mappingScript += `INSERT INTO cash_management_schema.consumer_auction_house_mapping (...) VALUES(...);\n\n`; // (Query SQL lengkap Anda di sini)
        }
    });

    setOutputConsumer(consumerScript.trim());
    setOutputMapping(mappingScript.trim());
    setSummary(`Berhasil membuat <b>${warehouseMap.size}</b> skrip consumer dan <b>${validRows.length}</b> skrip mapping.`);
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast('Skrip disalin!'));
  };

  return (
    <div>
      {toast && <div className="toast show">{toast}</div>}
      <div className="tool-header">
        <h1>Integrated SQL Script Generator</h1>
        <p>Satu input untuk menghasilkan skrip 'Consumer' dan 'Mapping' yang saling terkait.</p>
      </div>

      <div className="flex flex-col" style={{ gap: '1.5rem' }}>
        <div className="card">
          <div className="flex items-center mb-4">
            <span className="step-number">1</span>
            <h2 className="text-xl font-semibold" style={{ marginLeft: '1rem' }}>Unggah Data Afiliasi (.csv)</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', marginLeft: '3.5rem', marginBottom: '1rem' }}>
            Pilih file .csv dari komputer Anda. Pastikan urutan kolom: Warehouse, Cabang, No. HP, Nama PIC, Alamat Balai Lelang.
          </p>
          <div style={{ marginLeft: '3.5rem' }}>
            <label htmlFor="sql-gen-file-input" className="file-input-label" style={{border: '2px dashed var(--card-border)', padding: '2rem', display: 'block', textAlign: 'center', cursor: 'pointer'}}>
              <div id="sql-gen-file-label">
                {fileName ? (
                  <>
                    <i className="fas fa-check-circle fa-3x" style={{ color: 'var(--success-color)' }}></i>
                    <span style={{ marginTop: '1rem', display: 'block', fontWeight: 600 }}>{fileName}</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-arrow-up fa-3x" style={{ color: '#cbd5e0' }}></i>
                    <span style={{ marginTop: '1rem', display: 'block', fontWeight: 500 }}>Klik untuk mengunggah file .csv</span>
                  </>
                )}
              </div>
            </label>
            <input type="file" id="sql-gen-file-input" className="is-hidden" accept=".csv, text/csv" onChange={handleFileChange} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center mb-4">
            <span className="step-number">2</span>
            <h2 className="text-xl font-semibold" style={{ marginLeft: '1rem' }}>Konfigurasi & Generate</h2>
          </div>
          <div style={{ marginLeft: '3.5rem' }}>
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label htmlFor="createdBy" className="label">Created By / Updated By (ID)</label>
                <input type="text" id="createdBy" className="input" value={config.createdBy} onChange={handleConfigChange} />
              </div>
              <div>
                <label htmlFor="consumerType" className="label">Consumer Type</label>
                <input type="text" id="consumerType" className="input" value={config.consumerType} onChange={handleConfigChange} />
              </div>
              <div>
                <label htmlFor="branchCode" className="label">Branch Code (Fallback)</label>
                <input type="text" id="branchCode" className="input" value={config.branchCode} onChange={handleConfigChange} />
              </div>
              <div>
                <label htmlFor="branchId" className="label">Branch ID (Fallback)</label>
                <input type="text" id="branchId" className="input" value={config.branchId} onChange={handleConfigChange} />
              </div>
            </div>
            <button id="generateAll" className="button primary" style={{ width: '100%', padding: '0.8rem' }} onClick={handleGenerate}>
              Generate All Scripts
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center mb-4">
            <span className="step-number">3</span>
            <h2 className="text-xl font-semibold" style={{ marginLeft: '1rem' }}>Hasil Skrip SQL</h2>
          </div>
          <div id="summary" className="text-center" style={{ margin: '1rem 0', marginLeft: '3.5rem' }} dangerouslySetInnerHTML={{ __html: summary }} />
          <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginLeft: '3.5rem' }}>
            <div>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <h3 className="font-semibold">Consumer Table Scripts</h3>
                <button id="copyConsumer" className="button secondary" onClick={() => copyToClipboard(outputConsumer)}>Copy</button>
              </div>
              <textarea id="sqlOutputConsumer" className="textarea textarea-editor" style={{ height: '40vh' }} readOnly value={outputConsumer} />
            </div>
            <div>
              <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <h3 className="font-semibold">Consumer Mapping Scripts</h3>
                <button id="copyMapping" className="button secondary" onClick={() => copyToClipboard(outputMapping)}>Copy</button>
              </div>
              <textarea id="sqlOutputMapping" className="textarea textarea-editor" style={{ height: '40vh' }} readOnly value={outputMapping} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SqlScriptGenerator;