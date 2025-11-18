import React, { useState } from 'react';
import ToolHeader from '../components/ToolHeader';
import ReusableAceEditor from '../components/ReusableAceEditor';

function ExcelToJsonConverter() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('Pilih File Excel...');
  const [jsonOutput, setJsonOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Handle pemilihan file
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setStatusMessage('');
      setJsonOutput(''); // Reset output saat ganti file
    }
  };

  // Handle proses konversi
  const handleConvert = () => {
    if (!file) {
      setStatusMessage('❌ Harap pilih file Excel terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Memproses konversi...');

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        
        // Menggunakan window.XLSX sesuai pola di project Anda (BranchDataProcessor.jsx)
        // Pastikan script XLSX sudah termuat di index.html atau terinstall
        if (!window.XLSX) {
            throw new Error("Library XLSX tidak ditemukan.");
        }

        const workbook = window.XLSX.read(data, { type: 'array' });
        
        // Ambil sheet pertama
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Konversi ke JSON
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
        
        // Format JSON agar rapi (Pretty Print)
        const jsonString = JSON.stringify(jsonData, null, 2);
        
        setJsonOutput(jsonString);
        setStatusMessage(`✅ Berhasil mengonversi ${jsonData.length} baris data.`);
      } catch (error) {
        console.error(error);
        setStatusMessage('❌ Gagal mengonversi file. Pastikan format Excel valid.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setStatusMessage('❌ Terjadi kesalahan saat membaca file.');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Handle Download JSON
  const handleDownload = () => {
    if (!jsonOutput) return;

    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    // Buat nama file baru berdasarkan nama asli
    const newName = fileName.replace(/\.(xlsx|xls)$/i, '') + '.json';
    
    a.href = url;
    a.download = newName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Copy ke Clipboard
  const handleCopy = () => {
    if (!jsonOutput) return;
    navigator.clipboard.writeText(jsonOutput).then(() => {
      alert('JSON berhasil disalin ke clipboard!');
    });
  };

  return (
    <div>
      <ToolHeader 
        title="Excel to JSON Converter" 
        description="Ubah data dari file Excel (.xlsx, .xls) menjadi format JSON dengan mudah."
      />

      <div className="card">
        {/* Bagian Input */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1.5rem', alignItems: 'end' }}>
          <div>
            <label className="label">1. Upload File Excel</label>
            <input 
              type="file" 
              id="excel-upload" 
              accept=".xlsx, .xls" 
              className="is-hidden" 
              onChange={handleFileChange} 
            />
            <label 
              htmlFor="excel-upload" 
              className="button secondary" 
              style={{ 
                width: '100%', 
                justifyContent: 'flex-start', 
                cursor: 'pointer',
                overflow: 'hidden' 
              }}
            >
              <i className="fas fa-file-excel" style={{ marginRight: '0.75rem', color: '#107c41' }}></i>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fileName}
              </span>
            </label>
          </div>
          
          <div>
            <button 
              className="button primary" 
              style={{ width: '100%' }} 
              onClick={handleConvert}
              disabled={isLoading || !file}
            >
              {isLoading ? (
                <span><i className="fas fa-spinner fa-spin"></i> Memproses...</span>
              ) : (
                <span><i className="fas fa-exchange-alt"></i> Convert to JSON</span>
              )}
            </button>
          </div>
        </div>

        {/* Status Message */}
        <div style={{ marginTop: '1rem', minHeight: '20px', fontSize: '0.9rem' }} className={statusMessage.includes('❌') ? 'text-red-500' : 'text-green-600'}>
          {statusMessage}
        </div>

        {/* Bagian Output */}
        {jsonOutput && (
          <div style={{ marginTop: '2rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
              <label className="label">Hasil JSON</label>
              <div className="flex" style={{ gap: '0.5rem' }}>
                <button className="button secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleCopy}>
                  <i className="fas fa-copy"></i> Salin
                </button>
                <button className="button success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleDownload}>
                  <i className="fas fa-download"></i> Download JSON
                </button>
              </div>
            </div>

            <ReusableAceEditor
              mode="json"
              theme="textmate"
              value={jsonOutput}
              name="excel-to-json-output"
              height="50vh"
              width="100%"
              readOnly={true}
              wrapEnabled={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ExcelToJsonConverter;