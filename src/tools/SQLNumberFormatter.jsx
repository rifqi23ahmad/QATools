import React, { useState, useCallback } from 'react';
import ToolHeader from '../components/ToolHeader';

function SqlFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Salin Hasil');

  const processFormatting = useCallback((text) => {
    const items = text.split(/[\s,;]+/).filter(item => item.trim() !== '');
    const formatted = items.length > 0 ? `'${items.join("',\n'")}'` : "";
    setOutput(formatted);
  }, []); // useCallback agar fungsi tidak dibuat ulang setiap render

  const handleInputChange = (e) => {
    const newText = e.target.value;
    setInput(newText);
    processFormatting(newText); // Langsung proses saat mengetik
  };

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
        title="SQL IN Clause Formatter"
        description="Ubah daftar ID (angka, UUID, teks, dll.) menjadi string yang diformat untuk klausa SQL IN."
      />
      <div className="card">
        <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
          <div className="flex flex-col">
            <label htmlFor="sql-input-formatter" className="label">1. Tempelkan Daftar ID Anda</label>
            <textarea 
              id="sql-input-formatter" 
              className="textarea textarea-editor" 
              style={{ height: '40vh' }} 
              placeholder="Pisahkan dengan spasi, koma, atau baris baru..."
              value={input}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="sql-output-formatter" className="label">2. Hasil Format SQL</label>
            <textarea 
              id="sql-output-formatter" 
              className="textarea textarea-editor" 
              style={{ height: '40vh' }} 
              readOnly
              placeholder="'12345',..."
              value={output}
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