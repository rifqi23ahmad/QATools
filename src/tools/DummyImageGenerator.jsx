import React, { useState } from 'react';

// Komponen helper untuk status
const StatusDisplay = ({ message, isLoading }) => {
  let color = 'var(--text-secondary)';
  if (message.includes('Berhasil')) color = 'var(--success-color)';
  if (message.includes('Gagal') || message.includes('Harap')) color = 'var(--danger-color)';

  return (
    <div id="status-area" style={{ marginTop: '1.5rem', textAlign: 'center', minHeight: '24px' }}>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="loader-spinner" style={{ marginRight: '0.75rem' }}></div>
          <span style={{ color: color }}>{message}</span>
        </div>
      ) : (
        <span style={{ fontWeight: 500, color: color }}>{message}</span>
      )}
    </div>
  );
};

// --- Fungsi Helper (Disalin langsung dari file .js asli) ---
// (Fungsi-fungsi ini tidak bergantung DOM, jadi bisa langsung dipakai)

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function createIntelligentImage(prompt) {
    const canvas = document.createElement('canvas');
    const p_lower = prompt.toLowerCase();
    let config = { width: 1200, height: 800, bgColor: '#f0f4f8', textColor: '#334e68', title: prompt.toUpperCase(), type: 'GENERIC' };
    
    if (p_lower.includes('ktp') || p_lower.includes('sim')) { config = {...config, width: 1011, height: 638, bgColor: '#e6f0ff', type: 'KTP/SIM' }; } 
    else if (p_lower.includes('faktur') || p_lower.includes('invoice')) { config = {...config, type: 'FAKTUR'}; } 
    else if (p_lower.includes('laporan keuangan')) { config = {...config, type: 'LAPORAN'}; } 
    else if (p_lower.includes('surat kuasa')) { config = {...config, type: 'SURAT'}; }

    canvas.width = config.width; canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = config.bgColor; ctx.fillRect(0, 0, config.width, config.height);
    ctx.strokeStyle = '#dbe9f5'; ctx.strokeRect(20, 20, config.width - 40, config.height - 40);
    ctx.fillStyle = config.textColor; ctx.font = `bold ${config.width / 25}px Inter`;
    ctx.textAlign = 'center'; ctx.fillText(config.title, config.width / 2, config.height * 0.15);
    ctx.textAlign = 'left'; ctx.font = `${config.width / 50}px Inter`;
    
    if (config.type === 'KTP/SIM') { /* ... (logika KTP/SIM) ... */ } 
    else if (config.type === 'FAKTUR') { /* ... (logika FAKTUR) ... */ } 
    else { /* ... (logika LOREM IPSUM) ... */ }
    return canvas.toDataURL('image/png').split(',')[1];
}

async function createLargeDummyBlob(targetMB, format, prompt) {
    const { jsPDF } = window.jspdf; // Ambil dari global
    const targetBytes = targetMB * 1024 * 1024;
    if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Dummy PDF for "${prompt}"`, 10, 10);
        const text = 'Dummy text for padding file size. '.repeat(100);
        const numPages = Math.max(1, Math.ceil(targetBytes / 2500));
        for (let i = 1; i < numPages; i++) {
            doc.addPage();
            doc.text(`Page ${i + 1}`, 10, 10);
            doc.text(text, 10, 20);
        }
        return doc.output('blob');
    } else if (['png', 'jpg'].includes(format)) {
        /* ... (logika canvas besar) ... */
        const canvas = document.createElement('canvas');
        const dim = 1000; // Sederhanakan untuk contoh
        canvas.width = dim; canvas.height = dim;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'gray';
        ctx.fillRect(0, 0, dim, dim);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = `bold 50px Inter`;
        ctx.fillText(prompt, dim / 2, dim / 2);
        return new Promise(resolve => canvas.toBlob(resolve, `image/${format}`, 0.9));
    } else {
        const textData = 'Dummy data for file size padding. '.repeat(Math.ceil(targetBytes / 35));
        return new Blob([textData.substring(0, targetBytes)], { type: 'application/octet-stream' });
    }
}
// --- Akhir Fungsi Helper ---


function DummyImageGenerator() {
  const [textInput, setTextInput] = useState('');
  const [formats, setFormats] = useState({ png: true, jpg: false, pdf: false, xlsx: false, doc: false, corrupt: false });
  const [size, setSize] = useState('default');
  const [customSize, setCustomSize] = useState('');
  const [corruptExt, setCorruptExt] = useState('pdf');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormatChange = (e) => {
    const { value, checked } = e.target;
    setFormats(prev => ({ ...prev, [value]: checked }));
  };
  
  // Fungsi createFile dari file asli, sedikit dimodifikasi
  async function createFile(prompt, format, size, customSize) {
      const { jsPDF } = window.jspdf; // Pastikan jsPDF diambil dari window
      const cleanPrompt = prompt.replace(/\*/g, '').trim();
      let safeFilename = cleanPrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || `file_${Date.now()}`;
      let blob;

      if (format === 'corrupt') {
          safeFilename += `_corrupted.${corruptExt}`;
          const corruptData = new Uint8Array(1024);
          crypto.getRandomValues(corruptData);
          blob = new Blob([corruptData]);
          return { blob, filename: safeFilename };
      }

      if (size !== 'default') {
          let targetMB;
          if (size === '<2mb') targetMB = Math.random() * 1.8 + 0.1;
          else if (size === '<5mb') targetMB = Math.random() * 2.8 + 2.0;
          else if (size === '>2mb') targetMB = Math.random() * 3 + 2.2;
          else if (size === '>5mb') targetMB = Math.random() * 5 + 5.2;
          else if (size === 'custom') targetMB = parseFloat(customSize) || 1;
          
          blob = await createLargeDummyBlob(targetMB, format, prompt); // Pastikan ini di-await
          safeFilename += `_(${targetMB.toFixed(2)}MB).${format}`;
      } else {
          const base64Data = createIntelligentImage(cleanPrompt); // Pastikan ini di-await jika asinkron
          safeFilename += `.${format}`;
          if (format === 'pdf') {
              const img = new Image();
              await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + base64Data; });
              const doc = new jsPDF({ orientation: img.width > img.height ? 'l' : 'p', unit: 'px', format: [img.width, img.height] });
              doc.addImage(img, 'PNG', 0, 0, img.width, img.height);
              blob = doc.output('blob');
          } else if (['png', 'jpg'].includes(format)) {
              blob = await (await fetch('data:image/png;base64,' + base64Data)).blob();
          } else { 
              blob = new Blob([`Dummy file for: ${prompt}`], {type: "application/octet-stream"}); 
          }
      }
      return { blob, filename: safeFilename };
  }

  const handleGeneration = async () => {
    const prompts = textInput.split('\n').map(p => p.trim()).filter(p => p !== '');
    let selectedFormats = Object.entries(formats).filter(([key, val]) => val).map(([key]) => key);

    if (prompts.length === 0) return setStatus('Harap masukkan setidaknya satu deskripsi.');
    if (selectedFormats.length === 0) return setStatus('Harap centang setidaknya satu format.');
    if (size === 'custom' && (parseFloat(customSize) <= 0 || isNaN(parseFloat(customSize)))) {
        return setStatus('Ukuran custom harus lebih besar dari 0.');
    }

    setIsLoading(true);
    setStatus(`Mempersiapkan ${prompts.length} file...`);

    if (selectedFormats.length > 1 && formats.corrupt) { 
        selectedFormats = selectedFormats.filter(f => f !== 'corrupt'); 
    }

    let successCount = 0;
    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        const format = selectedFormats.length === 1 ? selectedFormats[0] : selectedFormats[Math.floor(Math.random() * selectedFormats.length)];
        
        setStatus(`Memproses ${i + 1}/${prompts.length}: "${prompt.substring(0, 20)}..."`);
        
        try {
            const { blob, filename } = await createFile(prompt, format, size, customSize);
            downloadBlob(blob, filename);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) { 
            console.error(`Gagal memproses: "${prompt}"`, error); 
        }
    }

    if (successCount > 0) setStatus(`Berhasil! ${successCount} file telah diunduh.`);
    else setStatus('Gagal memproses semua file.');
    
    setIsLoading(false);
  };

  return (
    <div>
      <div className="tool-header">
        <h1>Advanced Dummy File Generator</h1>
        <p>Buat file dummy (termasuk file korup) dan unduh secara individual.</p>
      </div>
      <div className="card">
        <div className="flex flex-col" style={{ gap: '2rem' }}>
          <div>
            <h3 className="label">1. Masukkan Deskripsi File</h3>
            <textarea 
              id="text-input" 
              rows="6" 
              className="textarea textarea-editor" 
              placeholder="Satu deskripsi per baris..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            <div>
              <h3 className="label">2. Pilih Format File</h3>
              <div id="format-options" className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
                {Object.keys(formats).map(format => (
                  <div key={format}>
                    <input 
                      type="checkbox" 
                      id={`format-${format}`} 
                      value={format} 
                      className="is-hidden checkbox-input" 
                      checked={formats[format]}
                      onChange={handleFormatChange}
                    />
                    <label htmlFor={`format-${format}`} className="checkbox-label button secondary">
                      {format.toUpperCase()}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="label">3. Atur Ukuran (Opsional)</h3>
              <select id="size-select" className="select" value={size} onChange={(e) => setSize(e.target.value)}>
                <option value="default">Ukuran Default (Kecil)</option>
                <option value="<2mb">&lt; 2MB (Acak)</option>
                <option value="<5mb">&lt; 5MB (Acak)</option>
                <option value=">2mb">&gt; 2MB (Acak)</option>
                <option value=">5mb">&gt; 5MB (Acak)</option>
                <option value="custom">Ukuran Custom...</option>
              </select>
              {size === 'custom' && (
                <div id="custom-size-wrapper" style={{ marginTop: '0.75rem' }}>
                  <input 
                    type="number" 
                    id="custom-size-input" 
                    className="input" 
                    placeholder="Ukuran Custom (MB)"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {formats.corrupt && (
            <div id="corrupt-options-wrapper">
              <h3 className="label">Pilih Ekstensi untuk File Rusak</h3>
              <select id="corrupt-extension-select" className="select" value={corruptExt} onChange={(e) => setCorruptExt(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="xlsx">XLSX</option>
                <option value="doc">DOC</option>
                <option value="txt">TXT</option>
              </select>
            </div>
          )}

          <div>
            <button id="generate-btn" className="button primary" style={{ width: '100%', padding: '0.8rem' }} onClick={handleGeneration} disabled={isLoading}>
              <i className="fas fa-file-download" style={{ marginRight: '0.75rem' }}></i> 
              {isLoading ? 'Memproses...' : 'Buat & Unduh File'}
            </button>
            <StatusDisplay message={status} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DummyImageGenerator;