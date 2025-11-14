import React, { useState } from 'react';

// Fungsi helper dari file asli Anda
function parseDataToMap(text) {
  const dataMap = new Map();
  const lines = text.trim().split('\n').filter(line => line.trim() !== '');
  
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const id = parts[0];
      const status = parts.slice(1).join(' ');
      dataMap.set(id, status);
    }
  });
  return dataMap;
}

function DataCompare() {
  const [data1, setData1] = useState('');
  const [data2, setData2] = useState('');
  
  // State untuk menyimpan hasil (bukan HTML)
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);

  const handleCompare = () => {
    const data1Map = parseDataToMap(data1);
    const data2Map = parseDataToMap(data2);

    const removed = [], added = [], changed = [], identical = [];

    for (const [id, status1] of data1Map.entries()) {
      if (data2Map.has(id)) {
        const status2 = data2Map.get(id);
        if (status1 !== status2) {
          changed.push({ id, status1, status2 });
        } else {
          identical.push({ id, status1, status2 });
        }
      } else {
        removed.push({ id, status: status1 });
      }
    }
    
    for (const [id, status2] of data2Map.entries()) {
      if (!data1Map.has(id)) {
        added.push({ id, status: status2 });
      }
    }
    
    // 1. Atur state ringkasan
    setSummary({
      identical: identical.length,
      changed: changed.length,
      added: added.length,
      removed: removed.length
    });
    
    // 2. Atur state hasil
    const allItems = [
      ...changed.map(item => ({ id: item.id, status1: item.status1, status2: item.status2, type: 'changed' })),
      ...added.map(item => ({ id: item.id, status1: '-', status2: item.status, type: 'added' })),
      ...removed.map(item => ({ id: item.id, status1: item.status, status2: '-', type: 'removed' })),
      ...identical.map(item => ({ id: item.id, status1: item.status1, status2: item.status2, type: 'identical' }))
    ].sort((a,b) => a.id.localeCompare(b.id));
    
    setResults(allItems);
  };

  const handleExport = () => {
    if (results.length === 0) return;

    // Buat CSV dari state 'results', bukan dari DOM
    const headers = ["No.", "ID", "Status Lama", "Status Baru", "Keterangan"];
    const csvRows = [headers.join(",")];

    results.forEach((item, index) => {
      const row = [
        index + 1,
        item.id,
        item.status1,
        item.status2,
        item.type.charAt(0).toUpperCase() + item.type.slice(1)
      ];
      // Escape tanda kutip dan tambahkan tanda kutip di sekitar setiap sel
      const escapedRow = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`);
      csvRows.push(escapedRow.join(","));
    });

    const csvFile = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(csvFile);
    
    const date = new Date();
    const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    downloadLink.download = `perbandingan_data_${timestamp}.csv`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Alat Perbandingan Data</h1>
        <p>Tempelkan dua set data (ID + Status) untuk melihat perbedaannya.</p>
      </div>
      <div className="card">
        <div className="grid grid-cols-2">
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Data Set 1 (Data Lama)</h3>
            <textarea 
              id="data1" 
              rows="15" 
              className="textarea textarea-editor" 
              placeholder="Contoh:..."
              value={data1}
              onChange={(e) => setData1(e.target.value)}
            />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Data Set 2 (Data Baru)</h3>
            <textarea 
              id="data2" 
              rows="15" 
              className="textarea textarea-editor" 
              placeholder="Tempelkan data yang lebih baru di sini..."
              value={data2}
              onChange={(e) => setData2(e.target.value)}
            />
          </div>
        </div>
        <div className="text-center" style={{ marginTop: '2rem' }}>
          <button id="compareBtn" className="button primary" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }} onClick={handleCompare}>
            Bandingkan Data
          </button>
        </div>
      </div>

      {/* Bagian Hasil: Dirender secara dinamis jika 'summary' ada */}
      {summary && (
        <div id="results" style={{ marginTop: '2rem' }}>
          <div className="summary-box">
            <h3 className="tool-header text-center" style={{ marginBottom: '1.5rem' }}>Ringkasan Perbandingan</h3>
            <div className="grid grid-cols-4">
              <div className="summary-item identical"><span className="count">{summary.identical}</span><span className="label">Sama</span></div>
              <div className="summary-item changed"><span className="count">{summary.changed}</span><span className="label">Berubah</span></div>
              <div className="summary-item added"><span className="count">{summary.added}</span><span className="label">Baru</span></div>
              <div className="summary-item removed"><span className="count">{summary.removed}</span><span className="label">Dihapus</span></div>
            </div>
          </div>
          <div className="card">
            <div className="results-table-wrapper">
              <table id="resultsTable" className="results-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>ID</th>
                    <th>Status Lama</th>
                    <th>Status Baru</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, index) => (
                    <tr key={item.id} className={`row-${item.type}`}>
                      <td>{index + 1}</td>
                      <td>{item.id}</td>
                      <td>{item.status1}</td>
                      <td>{item.status2}</td>
                      <td>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="text-center" id="export-container" style={{ marginTop: '1.5rem' }}>
             <button id="exportBtn" className="button success" onClick={handleExport}>
                <i className="fas fa-download" style={{ marginRight: '0.5rem' }}></i> Ekspor ke CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataCompare;