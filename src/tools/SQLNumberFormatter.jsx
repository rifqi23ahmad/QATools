import React, { useState, useCallback } from 'react';
import ToolHeader from '../components/ToolHeader';
import ReusableAceEditor from '../components/ReusableAceEditor'; // <-- Impor Ace Editor

function SqlFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Salin Hasil');

  const processFormatting = useCallback((text) => {
    const items = text.split(/[\s,;]+/).filter(item => item.trim() !== '');
    const formatted = items.length > 0 ? `'${items.join("',\n'")}'` : "";
    setOutput(formatted);
  }, []); 

  // --- PERUBAHAN DI SINI ---
  // Ace Editor mengembalikan teks langsung, bukan event (e)
  const handleInputChange = (newText) => {
    setInput(newText);
    processFormatting(newText); // Langsung proses saat mengetik
  };
  // --- AKHIR PERUBAHAN ---

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopyButtonText('Disalin!');
      setTimeout(() => setCopyButtonText('Salin Hasil'), 2000);
    }).catch(err => {
      alert('Gagal menyalin.');
    });
  };

  return (
    <div>
      <ToolHeader 
        title="Value SQL Formatter" // <-- Nama sudah diubah di sini juga
        description="Ubah daftar ID (angka, UUID, teks, dll.) menjadi string yang diformat untuk klausa SQL IN."
      />
      <div className="card">
        <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
          <div className="flex flex-col">
            <label htmlFor="sql-input-formatter" className="label">1. Tempelkan Daftar ID Anda</label>
            
            {/* --- DIGANTI DARI TEXTAREA --- */}
            <ReusableAceEditor
              mode="text" // Mode teks biasa untuk input
              theme="textmate"
              onChange={handleInputChange}
              value={input}
              height="40vh"
              width="100%"
              name="sql-input-formatter"
              placeholder="Pisahkan dengan spasi, koma, atau baris baru..."
              wrapEnabled={true}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="sql-output-formatter" className="label">2. Hasil Format SQL</label>
            
            {/* --- DIGANTI DARI TEXTAREA --- */}
            <ReusableAceEditor
              mode="sql" // Mode SQL untuk output
              theme="textmate"
              value={output}
              height="40vh"
              width="100%"
              name="sql-output-formatter"
              placeholder="'12345',..."
              readOnly={true}
              wrapEnabled={true}
            />
          </div>
        </div>
        <div className="flex" style={{ justifyContent: 'center', marginTop: '1.5rem', gap: '1rem' }}>
          <button 
            id="copy-sql-btn" 
            className="button secondary" 
            style={{ padding: '0.7rem 1.5rem' }}
            onClick={copyToClipboard}
            dangerouslySetInnerHTML={{ __html: copyButtonText.includes('Disalin') ? '<i class="fas fa-check" style="margin-right: 0.5rem;"></i> Disalin!' : '<i class="fas fa-copy" style="margin-right: 0.5rem;"></i> Salin Hasil' }}
          />
        </div>
      </div>
    </div>
  );
}

export default SqlFormatter;