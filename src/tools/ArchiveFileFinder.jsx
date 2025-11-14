import React, { useState, useMemo } from 'react';

// Fungsi Bantuan Konversi CSV (dari file asli)
function convertArrayToCsv(data) {
    const csvRows = [];
    data.forEach(row => {
        const escapedRow = row.map(cell => {
            if (cell == null) return '';
            let cellString = String(cell);
            cellString = cellString.replace(/"/g, '""'); 
            if (cellString.search(/("|,|\n)/g) >= 0) { 
                cellString = `"${cellString}"`;
            }
            return cellString;
        });
        csvRows.push(escapedRow.join(','));
    });
    return csvRows.join('\n');
}

// Fungsi Bantuan Unduh (dari file asli)
function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function ArchiveFileFinder() {
  const [dataSourceMode, setDataSourceMode] = useState(null); // 'zip', 'csv', null
  const [fileList, setFileList] = useState([]); // { name: 'lowercase_name', entry: (ZipEntry or Array) }
  const [csvHeader, setCsvHeader] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkSearchText, setBulkSearchText] = useState('');
  const [csvBulkStatus, setCsvBulkStatus] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');

  // State untuk melacak item yang dipilih
  const [selected, setSelected] = useState(new Set());

  // Logika untuk upload
  const handleZipUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setDataSourceMode('zip');
    setUploadStatus('Membaca file zip... Ini mungkin perlu waktu.');
    
    try {
      const zip = await window.JSZip.loadAsync(file);
      const newFileList = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          newFileList.push({
            name: zipEntry.name.toLowerCase(), // Nama untuk pencarian
            originalName: zipEntry.name, // Nama untuk tampilan/unduh
            entry: zipEntry      
          });
        }
      });
      setFileList(newFileList);
      setUploadStatus(`Selesai! ${newFileList.length} file berhasil dimuat.`);
    } catch (error) {
      setUploadStatus('Gagal membaca file zip. Pastikan file tidak rusak.');
    }
  };

  const handleCsvUpload_asDatabase = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setDataSourceMode('csv');
    setUploadStatus('Membaca file CSV...');

    window.Papa.parse(file, {
      delimiter: "", skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setUploadStatus('File CSV kosong.');
          return;
        }
        const headers = results.data[0];
        const dataRows = results.data.slice(1);
        
        const newFileList = dataRows.map(row => ({
          name: row.join(' ').toLowerCase(), // Nama untuk pencarian
          originalName: row[0], // Gunakan kolom pertama sebagai ID
          entry: row // Data baris asli
        }));
        
        setCsvHeader(headers);
        setFileList(newFileList);
        setUploadStatus(`Selesai! ${headers.length} kolom dan ${newFileList.length} baris data dimuat.`);
      },
      error: (err) => setUploadStatus('Gagal membaca file CSV.')
    });
  };

  const handleCsvUpload_forBulk = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setCsvBulkStatus('Membaca CSV...');
    window.Papa.parse(file, {
      delimiter: "",
      complete: (results) => {
        if (results.data.length < 1) { 
          setCsvBulkStatus('File CSV kosong.');
          return;
        }
        const idsList = results.data.map(row => (row && row[0] ? row[0].trim() : '')).filter(id => id.length > 0);
        setBulkSearchText(idsList.join('\n'));
        setCsvBulkStatus(`Selesai! ${idsList.length} ID dimuat.`);
      },
      error: (err) => setCsvBulkStatus('Gagal membaca file CSV.')
    });
    event.target.value = ''; // Reset input
  };

  // Logika untuk seleksi
  const handleToggleSelect = (name) => {
    const newSelected = new Set(selected);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelected(newSelected);
  };
  
  const handleBulkSelect = () => {
    const idsToSelect = bulkSearchText.split('\n')
      .map(id => id.trim().toLowerCase())
      .filter(id => id.length > 0);
    if (idsToSelect.length === 0) return;

    const newSelected = new Set(selected);
    filteredList.forEach(item => {
      const isMatch = idsToSelect.some(id => item.name.includes(id));
      if (isMatch) {
        newSelected.add(item.name); // 'name' adalah ID unik
      }
    });
    setSelected(newSelected);
  };
  
  const handleClearSelection = () => {
    setSelected(new Set());
  };

  // Logika untuk mengunduh
  const handleDownloadSelected = async () => {
    if (selected.size === 0) return;
    setDownloadStatus('Mempersiapkan file...');
    
    try {
      if (dataSourceMode === 'zip') {
        const selectedFiles = fileList.filter(f => selected.has(f.name));
        if (selectedFiles.length === 1) {
          const blob = await selectedFiles[0].entry.async('blob');
          triggerDownload(blob, selectedFiles[0].originalName);
        } else {
          const newZip = new window.JSZip();
          for (const file of selectedFiles) {
            const blob = await file.entry.async('blob');
            newZip.file(file.originalName, blob);
          }
          const zipBlob = await newZip.generateAsync({ type: 'blob' });
          triggerDownload(zipBlob, 'arsip_terpilih.zip');
        }
      } else if (dataSourceMode === 'csv') {
        let selectedData = [csvHeader];
        fileList.forEach(f => {
          if (selected.has(f.name)) {
            selectedData.push(f.entry);
          }
        });
        const newCsvString = convertArrayToCsv(selectedData);
        const blob = new Blob([newCsvString], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, 'data_terpilih.csv');
      }
      setDownloadStatus('Unduhan selesai!');
    } catch (error) {
      setDownloadStatus('Terjadi kesalahan saat mengunduh file.');
    }
    setTimeout(() => setDownloadStatus(''), 3000);
  };

  // Logika untuk me-reset
  const handleReload = () => {
    setDataSourceMode(null); setFileList([]); setCsvHeader([]);
    setUploadStatus(''); setSearchQuery(''); setBulkSearchText('');
    setCsvBulkStatus(''); setDownloadStatus(''); setSelected(new Set());
  };

  // Memo-kan hasil filter agar tidak kalkulasi ulang di setiap render
  const filteredList = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return fileList;
    return fileList.filter(file => file.name.includes(query));
  }, [fileList, searchQuery]);

  // UI
  if (!dataSourceMode) {
    return (
      <div>
        <div className="tool-header">
          <h1>Pencari Arsip / Data</h1>
          <p>Unggah .zip untuk mencari file, atau .csv untuk mencari data di dalamnya.</p>
        </div>
        <div className="card" id="upload-section">
          {/* ... (UI Upload seperti di file HTML asli) ... */}
          <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
            <div style={{ border: '2px dashed var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <h3>Mode Arsip (ZIP)</h3>
              <label className="button primary" style={{marginTop: '1rem'}}>
                <i className="fas fa-file-archive" style={{marginRight: '0.5rem'}}></i> Pilih File .zip
                <input type="file" id="zip-uploader" accept=".zip" className="is-hidden" onChange={handleZipUpload} />
              </label>
            </div>
            <div style={{ border: '2px dashed var(--card-border)', padding: '1.5rem', textAlign: 'center' }}>
              <h3>Mode Data (CSV)</h3>
              <label className="button" style={{marginTop: '1rem', backgroundColor: '#6b46c1', color: 'white'}}>
                <i className="fas fa-file-csv" style={{marginRight: '0.5rem'}}></i> Pilih File .csv
                <input type="file" id="csv-uploader-database" accept=".csv" className="is-hidden" onChange={handleCsvUpload_asDatabase} />
              </label>
            </div>
          </div>
          <div id="upload-status" style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', minHeight: '1.5rem' }}>
            {uploadStatus}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header tidak perlu di-render ulang */}
      <div className="tool-header">
        <h1>Pencari Arsip / Data</h1>
        <p>Mode: {dataSourceMode.toUpperCase()} | {fileList.length} item dimuat.</p>
      </div>
      <div className="card" id="search-section">
        <div className="flex flex-col" style={{ gap: '1rem' }}>
          <div>
            <label htmlFor="search-input" className="label">Cari Data</label>
            <input 
              type="text" 
              id="search-input" 
              placeholder="Ketik kata kunci untuk memfilter data..." 
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ padding: '1rem', backgroundColor: '#f7fafc', border: '1px solid var(--card-border)' }}>
            <label htmlFor="bulk-search-area" className="label">Pencarian & Seleksi Bulk</label>
            <label className="button success" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
              <i className="fas fa-file-csv" style={{ marginRight: '0.5rem' }}></i> Pilih File .csv
              <input type="file" id="csv-uploader" accept=".csv" className="is-hidden" onChange={handleCsvUpload_forBulk} />
            </label>
            <span id="csv-status" style={{ marginLeft: '0.5rem' }}>{csvBulkStatus}</span>
            <textarea 
              id="bulk-search-area" 
              rows="5" 
              className="textarea textarea-editor" 
              placeholder="605323110066\n610423090101..."
              value={bulkSearchText}
              onChange={(e) => setBulkSearchText(e.target.value)}
            />
            <div className="flex" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
              <button id="bulk-select-btn" className="button primary" onClick={handleBulkSelect}>
                Pilih Otomatis
              </button>
              <button id="clear-selection-btn" className="button" style={{ backgroundColor: '#ecc94b', color: '#744210' }} onClick={handleClearSelection}>
                Bersihkan Pilihan
              </button>
            </div>
          </div>
          
          <label className="label" style={{ marginTop: '0.5rem' }}>Hasil Pencarian ({filteredList.length})</label>
          <div id="results-container" className="results-table-wrapper" style={{ maxHeight: '40vh', overflowY: 'auto', border: '1px solid var(--card-border)' }}>
            {dataSourceMode === 'csv' ? (
              <table className="results-table">
                <thead className="sticky top-0">
                  <tr>
                    <th>Pilih</th>
                    {csvHeader.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(file => (
                    <tr key={file.name}>
                      <td>
                        <input 
                          type="checkbox" 
                          className="result-checkbox"
                          checked={selected.has(file.name)}
                          onChange={() => handleToggleSelect(file.name)}
                        />
                      </td>
                      {file.entry.map((cell, i) => <td key={i}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              // Mode ZIP
              filteredList.map(file => (
                <div key={file.name} className="result-item">
                  <label className="result-item-label">
                    <input 
                      type="checkbox" 
                      className="result-checkbox"
                      style={{ marginRight: '0.75rem' }}
                      checked={selected.has(file.name)}
                      onChange={() => handleToggleSelect(file.name)}
                    />
                    <span title={file.originalName}>{file.originalName}</span>
                  </label>
                </div>
              ))
            )}
          </div>

          <div className="flex" style={{ gap: '0.75rem' }}>
            <button 
              id="download-selected-btn" 
              className="button success" 
              disabled={selected.size === 0}
              onClick={handleDownloadSelected}
            >
              Unduh {selected.size} Terpilih
            </button>
            <button id="reload-btn" className="button secondary" onClick={handleReload}>
              Mulai Ulang
            </button>
          </div>
          <div id="download-status" style={{ color: 'var(--primary-color)', minHeight: '1.5rem' }}>
            {downloadStatus}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArchiveFileFinder;