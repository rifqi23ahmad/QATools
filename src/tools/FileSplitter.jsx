import React, { useState } from 'react';

// Komponen helper untuk status
const StatusMessage = ({ message, type }) => {
  if (!message) return <div className="text-center" style={{ minHeight: '24px' }}></div>;
  const color = type === 'error' ? 'var(--danger-color)' : 'var(--success-color)';
  return (
    <div className="text-center" style={{ marginTop: '1.5rem', minHeight: '24px', color: color }}>
      {message}
    </div>
  );
};

function FileSplitter() {
  const [file, setFile] = useState(null);
  // State baru untuk nama file, untuk ditampilkan di tombol
  const [fileName, setFileName] = useState('Pilih File (.csv, .txt, .sql)...'); 
  const [numParts, setNumParts] = useState(3);
  const [status, setStatus] = useState({ message: '', type: 'idle' });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name); // Atur nama file
      setStatus({ message: '', type: 'idle' }); // Reset status
    } else {
      setFile(null);
      setFileName('Pilih File (.csv, .txt, .sql)...'); // Reset ke default
      setStatus({ message: '', type: 'idle' });
    }
    // Reset value input agar bisa upload file yang sama lagi
    e.target.value = '';
  };

  const downloadFile = (content, originalFilename, partNumber) => {
    const name = originalFilename.substring(0, originalFilename.lastIndexOf('.'));
    const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
    const newFilename = `${name}_bagian_${partNumber}${extension}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = newFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSplit = () => {
    setStatus({ message: '', type: 'idle' });
    if (!file) {
      setStatus({ message: '❌ Harap pilih file terlebih dahulu!', type: 'error' });
      return;
    }
    if (isNaN(numParts) || numParts < 2) {
      setStatus({ message: '❌ Jumlah bagian harus 2 atau lebih!', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const records = content.split(';').filter(record => record.trim() !== '');
      const totalRecords = records.length;
      
      if (totalRecords === 0) {
        setStatus({ message: '❌ Gagal: Tidak ada data yang bisa dibaca di dalam file.', type: 'error' });
        return;
      }
      if (totalRecords < numParts) {
        setStatus({ message: `❌ Gagal: File hanya memiliki ${totalRecords} data, tidak bisa dibagi menjadi ${numParts} bagian.`, type: 'error' });
        return;
      }
      
      const recordsPerFile = Math.ceil(totalRecords / numParts);
      let filesToDownload = 0;
      for (let i = 0; i < numParts; i++) {
        const start = i * recordsPerFile;
        const end = start + recordsPerFile;
        const chunkRecords = records.slice(start, end);
        if (chunkRecords.length > 0) {
          filesToDownload++;
          const chunkContent = chunkRecords.join(';') + ';';
          setTimeout(() => {
            downloadFile(chunkContent, file.name, i + 1);
          }, i * 150);
        }
      }
      setStatus({ message: `✅ Berhasil! File sedang dipecah menjadi ${filesToDownload} bagian dan akan diunduh.`, type: 'success' });
    };
    reader.onerror = () => {
      setStatus({ message: '❌ Terjadi kesalahan saat membaca file.', type: 'error' });
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="tool-header">
        <h1>🚀 Alat Pemecah File</h1>
        <p>Unggah file Anda, tentukan jumlah bagian, dan file akan terunduh secara otomatis.</p>
      </div>
      <div className="card">
        {/* --- BLOK INPUT FILE YANG DIMODIFIKASI --- */}
        <div className="input-group">
          <label htmlFor="fileInput">1. Pilih File (.csv, .txt, .sql)</label>
          <label 
            htmlFor="fileInput" 
            className="button secondary" 
            style={{
              width: '100%', 
              justifyContent: 'flex-start',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
          >
            {file ? (
              <>
                <i className="fas fa-check-circle" style={{ color: 'var(--success-color)', marginRight: '0.75rem', flexShrink: 0 }}></i>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileName}
                </span>
              </>
            ) : (
              <>
                <i className="fas fa-upload" style={{ marginRight: '0.75rem', flexShrink: 0 }}></i>
                <span>{fileName}</span>
              </>
            )}
          </label>
          <input 
            type="file" 
            id="fileInput" 
            accept=".csv,.txt,.sql" 
            className="is-hidden" // Input asli disembunyikan
            onChange={handleFileChange}
          />
        </div>
        {/* --- AKHIR BLOK INPUT FILE --- */}

        <div className="input-group" style={{ marginTop: '1.5rem' }}>
          <label htmlFor="numParts">2. Ingin Dibagi Menjadi Berapa Bagian?</label>
          <input 
            type="number" 
            id="numParts" 
            value={numParts}
            min="2" 
            className="input"
            onChange={(e) => setNumParts(parseInt(e.target.value, 10))}
          />
        </div>
        <button id="splitButton" className="button primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.8rem' }} onClick={handleSplit}>
          Pecah & Unduh File
        </button>
        <StatusMessage message={status.message} type={status.type} />
      </div>
    </div>
  );
}

export default FileSplitter;