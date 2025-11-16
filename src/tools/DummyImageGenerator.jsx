import React, { useState } from 'react';

// Komponen helper untuk status (Tidak berubah)
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

// --- Fungsi Helper ---

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// --- PERBAIKAN 2a: Tambahkan 'format' sebagai parameter ---
function wrapTextAndFill(context, text, format, x, y, maxWidth, maxHeight, lineHeight) {
  if (!text) return;
  let currentY = y;
  let lines = 0;
  const maxLines = Math.floor((maxHeight - y) / lineHeight);

  while (currentY < maxHeight && lines < maxLines) {
    const timestamp = new Date().toLocaleString('id-ID');
    // --- PERBAIKAN 2b: Ubah contentLine ---
    const contentLine = `FORMAT ${format.toUpperCase()} GENERATE ${timestamp} BY QA TOOLS`;
    const words = contentLine.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        lines++;
        if (currentY >= maxHeight || lines >= maxLines) break;
      } else {
        line = testLine;
      }
    }
    
    if (line && currentY < maxHeight && lines < maxLines) {
      context.fillText(line, x, currentY);
      currentY += lineHeight;
      lines++;
    }
    
    // --- PERBAIKAN 2c: 'break;' dihapus agar teks berulang ---
  }
}

/**
 * --- STRATEGI 1: KUALITAS DEFAULT (BISA DIBUKA) ---
 */
function createIntelligentImage(prompt, format, width = 1280, height = 720) {
    const canvas = document.createElement('canvas');
    const p_lower = prompt.toLowerCase();
    let internalType = 'GENERIC';
    if (p_lower.includes('ktp') || p_lower.includes('sim')) { 
        internalType = 'KTP/SIM';
    } else if (p_lower.includes('faktur') || p_lower.includes('invoice')) { 
        internalType = 'FAKTUR'; 
    }
    let config = { width, height, bgColor: '#f0f4f8', textColor: '#334e68', title: prompt.toUpperCase(), type: internalType };
    if (config.type === 'KTP/SIM') { 
        config = {...config, width: 1011, height: 638, bgColor: '#e6f0ff' }; 
    }
    
    canvas.width = config.width; canvas.height = config.height;
    const ctx = canvas.getContext('2d');
    const padding = 60;

    ctx.fillStyle = config.bgColor; ctx.fillRect(0, 0, config.width, config.height);

    // --- Tambahkan noise halus agar file lebih sulit dikompresi ---
    try {
        const imageData = ctx.getImageData(0, 0, config.width, config.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() * 4) - 2; // -2 s/d +2
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
    } catch (e) {
        console.warn("Gagal menambahkan noise pada canvas:", e);
    }
    // --- Akhir Noise ---
    
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.font = `bold ${config.width / 10}px Inter`;
    ctx.fillStyle = '#999999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(config.width / 2, config.height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText('QATOOLS', 0, 0);
    ctx.restore();

    ctx.strokeStyle = '#dbe9f5'; ctx.strokeRect(20, 20, config.width - 40, config.height - 40);

    ctx.fillStyle = config.textColor;
    ctx.font = `bold ${config.width / 25}px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText(config.title, config.width / 2, config.height * 0.15);
    
    ctx.textAlign = 'center';
    ctx.fillStyle = config.textColor;
    ctx.font = `${config.width / 60}px Inter`;
    const maxWidth = config.width - (padding * 2);
    const lineHeight = (config.width / 60) * 1.5;
    const startY = config.height * 0.25;
    const endY = config.height - padding - 20;

    // --- PERBAIKAN 2d: Teruskan 'format' ke wrapTextAndFill ---
    wrapTextAndFill(ctx, prompt, format, config.width / 2, startY, maxWidth, endY, lineHeight);
    
    ctx.font = `italic ${config.width / 80}px Inter`;
    ctx.fillStyle = '#718096';
    ctx.textAlign = 'left';
    ctx.fillText(`Generated: ${new Date().toLocaleString('id-ID')}`, padding, config.height - padding + 20);
    ctx.textAlign = 'right';
    ctx.fillText(`by QATools (File Type: ${format.toUpperCase()})`, config.width - padding, config.height - padding + 20);
    
    return canvas.toDataURL('image/png').split(',')[1];
}

/**
 * --- STRATEGI 2: UKURAN AKURAT (TIDAK BISA DIBUKA) ---
 */
async function createAccurateSizeBlob(targetKB, format) {
    const targetBytes = Math.max(0, Math.floor(targetKB * 1024));
    let header = new Uint8Array(0);
    let mimeType = 'application/octet-stream';

    if (format === 'pdf') {
        header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x33, 0x0A, 0x25]); 
        mimeType = 'application/pdf';
    } else if (format === 'png') {
        header = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        mimeType = 'image/png';
    } else if (format === 'jpg') {
        header = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]);
        mimeType = 'image/jpeg';
    } else if (['xlsx', 'docx', 'zip'].includes(format)) {
        header = new Uint8Array([0x50, 0x4B, 0x03, 0x04]);
        if (format === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (format === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (format === 'zip') mimeType = 'application/zip';
    } else if (format === 'txt') {
        mimeType = 'text/plain';
    }

    const paddingSize = Math.max(0, targetBytes - header.length);
    const paddingBuffer = new Uint8Array(paddingSize);
    if (paddingSize > 0) {
        paddingBuffer.fill(0xAA);
    }

    return new Blob([header, paddingBuffer.buffer], { type: mimeType });
}

// --- Helper untuk memuat jsPDF bila belum ada ---
async function ensureJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if (!window._loadingJsPDF) {
    window._loadingJsPDF = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error('jsPDF gagal dimuat'));
      };
      script.onerror = () => reject(new Error('Gagal memuat script jsPDF dari CDN'));
      document.head.appendChild(script);
    });
  }
  return window._loadingJsPDF;
}

// --- Helper: cari byte sequence di Uint8Array ---
function indexOfSequence(haystack, needle, fromIndex = 0) {
  const hLen = haystack.length, nLen = needle.length;
  if (nLen === 0) return -1;
  for (let i = fromIndex; i <= hLen - nLen; i++) {
    let match = true;
    for (let j = 0; j < nLen; j++) {
      if (haystack[i + j] !== needle[j]) { match = false; break; }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Convert base64 to blob for final formats (pdf/jpg/png) then adjust to EXACT target bytes.
 */
async function convertBase64ToBlob(base64Data, format, jsPDFParam, targetBytes = null) {
    if (format === 'pdf') {
        let jsPDFCtor = jsPDFParam;
        if (!jsPDFCtor) {
            try {
                jsPDFCtor = await ensureJsPDF();
            } catch (e) {
                console.warn('jsPDF tidak tersedia dan gagal dimuat otomatis:', e);
                const pngBlobFallback = await (await fetch('data:image/png;base64,' + base64Data)).blob();
                const fake = await createAccurateSizeBlob(Math.ceil((targetBytes || pngBlobFallback.size) / 1024), 'pdf');
                return fake;
            }
        }

        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = 'data:image/png;base64,' + base64Data;
        });

        const doc = new jsPDFCtor({ orientation: img.width > img.height ? 'l' : 'p', unit: 'px', format: [img.width, img.height] });
        doc.addImage(img, 'JPEG', 0, 0, img.width, img.height, undefined, 'MEDIUM');
        let blob = doc.output('blob');

        if (targetBytes) blob = await adjustBlobToTarget(blob, targetBytes, 'pdf');
        return blob;
    }

    const pngBlob = await (await fetch('data:image/png;base64,' + base64Data)).blob();
    let outBlob;
    if (format === 'jpg') {
         outBlob = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0,0,img.width, img.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            };
            img.onerror = () => resolve(pngBlob);
            img.src = 'data:image/png;base64,' + base64Data;
        });
    } else {
        outBlob = pngBlob; // png
    }

    if (targetBytes) outBlob = await adjustBlobToTarget(outBlob, targetBytes, format);
    return outBlob;
}

/**
 * --- PERBAIKAN 1: Menyesuaikan ukuran Blob agar tepat TARGET BYTES ---
 * (Logika pemotongan file (slice) dihapus agar file tidak korup)
 */
async function adjustBlobToTarget(blob, targetBytes, format) {
    const current = blob.size;
    if (current === targetBytes) return blob;

    // --- PERBAIKAN: Jika file > target, kembalikan apa adanya agar BISA DIBUKA ---
    if (current > targetBytes) {
        console.warn(`File ${format} (${current} bytes) lebih besar dari target (${targetBytes} bytes) agar bisa dibuka.`);
        return blob;
    }
    // --- AKHIR PERBAIKAN ---

    const padLen = targetBytes - current;
    // Jangan meminta terlalu banyak entropy ke crypto; gunakan pola berulang untuk padding besar.
    let padding;
    if (padLen <= 65536 && window.crypto && window.crypto.getRandomValues) {
        padding = new Uint8Array(padLen);
        window.crypto.getRandomValues(padding);
    } else {
        padding = new Uint8Array(padLen);
        // pola 0xAA sebagai compromise: tidak semua-zero (yang bisa dikompresi sangat baik)
        padding.fill(0xAA);
    }

    try {
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);

        if (format === 'pdf') {
            const needle = new TextEncoder().encode('%EOF');
            let idx = -1;
            let searchFrom = 0;
            while (true) {
                const found = indexOfSequence(bytes, needle, searchFrom);
                if (found === -1) break;
                idx = found;
                searchFrom = found + 1;
            }

            if (idx !== -1) {
                const before = bytes.slice(0, idx);
                const after = bytes.slice(idx);
                const combined = new Uint8Array(before.length + padding.length + after.length);
                combined.set(before, 0);
                combined.set(padding, before.length);
                combined.set(after, before.length + padding.length);
                return new Blob([combined.buffer], { type: blob.type });
            }
        }

        const combined = new Uint8Array(bytes.length + padding.length);
        combined.set(bytes, 0);
        combined.set(padding, bytes.length);
        return new Blob([combined.buffer], { type: blob.type });

    } catch (e) {
        console.warn('adjustBlobToTarget fallback karena error:', e);
        return new Blob([blob, padding.buffer], { type: blob.type });
    }
}

/**
 * --- FUNGSI UTAMA (DIPERBARUI) ---
 */
async function createFile(prompt, format, size, customSize, isCorrupt) {
    const { jsPDF } = window.jspdf || {};
    const cleanPrompt = prompt.replace(/\*/g, '').trim();
    let safeFilenameBase = cleanPrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || `file_${Date.now()}`;
    let blob;
    
    // --- PERBAIKAN 3a: Ambil nilai KB dari customSize ---
    const targetKB = parseFloat(customSize) || 1024; // Default 1MB
    const targetBytes = Math.max(0, Math.floor(targetKB * 1024));

    if (isCorrupt) {
        const filename = `${safeFilenameBase}_corrupted.${format}`;
        const corruptData = new Uint8Array(1024);
        crypto.getRandomValues(corruptData);
        blob = new Blob([corruptData]);
        return { blob, filename };
    }

    const isImageBasedFormat = ['png', 'jpg', 'pdf'].includes(format);

    if (size === 'custom') {
        safeFilenameBase += `_(${targetKB.toFixed(0)}KB_target)`;

        if (isImageBasedFormat) {
            let width, height;
            if (targetKB <= 500) { width = 1280; height = 720; }
            else if (targetKB <= 2048) { width = 1920; height = 1080; }
            else { width = 3840; height = 2160; }

            const base64Data = createIntelligentImage(prompt, format, width, height);
            blob = await convertBase64ToBlob(base64Data, format, jsPDF, targetBytes);

        } else {
            blob = await createAccurateSizeBlob(targetKB, format);
        }

    } else {
        if (isImageBasedFormat) {
            const base64Data = createIntelligentImage(prompt, format, 1280, 720);
            blob = await convertBase64ToBlob(base64Data, format, jsPDF);

        } else {
            let content = `Dummy file (Kualitas Default) untuk: ${prompt}
Format: ${format.toUpperCase()}`;
            let mime = 'text/plain';
            if (format === 'txt') mime = 'text/plain';
            if (['xlsx', 'docx', 'zip'].includes(format)) {
                 mime = 'application/octet-stream'; 
                 content = `[Konten dummy default untuk file ${format.toUpperCase()}: ${prompt}]`;
            }
            blob = new Blob([content], { type: mime });
        }
    }
    
    const filename = `${safeFilenameBase}.${format}`;
    return { blob, filename };
}


// --- Komponen Utama ---

function DummyImageGenerator() {
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState('normal'); 
  const [normalFormats, setNormalFormats] = useState({ 
    png: true, jpg: false, pdf: false, 
    xlsx: false, doc: false, zip: false, 
    txt: false 
  });
  const [corruptFormats, setCorruptFormats] = useState({ 
    pdf: true, jpg: false, png: false, 
    doc: false, xlsx: false, txt: false, 
    zip: false 
  });
  const [size, setSize] = useState('default');
  const [customSize, setCustomSize] = useState(''); // Sekarang dalam KB
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNormalFormatChange = (e) => {
    const { value, checked } = e.target;
    setNormalFormats(prev => ({ ...prev, [value]: checked }));
  };

  const handleCorruptFormatChange = (e) => {
    const { value, checked } = e.target;
    setCorruptFormats(prev => ({ ...prev, [value]: checked }));
  };
  
  // Logika 1-ke-1 (Sesuai Permintaan)
  const handleGeneration = async () => {
    // Regex fix (sudah ada)
    const prompts = textInput.split(/\r?\n/).map(p => p.trim()).filter(p => p !== '');
    if (prompts.length === 0) return setStatus('Harap masukkan setidaknya satu deskripsi.');

    setIsLoading(true);
    let successCount = 0;
    let totalFiles = 0;

    if (mode === 'normal') {
      let selectedFormats = Object.entries(normalFormats).filter(([key, val]) => val).map(([key]) => key);
      if (selectedFormats.length === 0) {
        setIsLoading(false);
        return setStatus('Harap centang setidaknya satu format file normal.');
      }

      // --- PERBAIKAN 3b: Validasi Ukuran (Min dan Max) ---
      const customSizeKB = parseFloat(customSize);
      if (size === 'custom') {
        if (isNaN(customSizeKB) || customSizeKB <= 0) {
          setIsLoading(false);
          return setStatus('Ukuran custom (KB) harus lebih besar dari 0.');
        }
        // Validasi MAX 10MB / 10000KB
        if (customSizeKB > 10000) { 
          setIsLoading(false);
          return setStatus('Ukuran custom tidak boleh melebihi 10.000 KB (10 MB).');
        }
      }
      // --- AKHIR PERBAIKAN 3b ---
      
      const isOneToOne = prompts.length === selectedFormats.length;
      totalFiles = prompts.length;
      setStatus(`Mempersiapkan ${totalFiles} file...`);

      for (let i = 0; i < prompts.length; i++) {
          const prompt = prompts[i];
          const format = isOneToOne 
            ? selectedFormats[i] 
            : selectedFormats[Math.floor(Math.random() * selectedFormats.length)];
          
          if (!format) {
              console.warn(`Skipping prompt index ${i} (no matching format in 1-to-1 mode)`);
              continue;
          }
          
          setStatus(`Memproses ${i + 1}/${totalFiles}: "${prompt.substring(0, 20)}.${format}"`);
          try {
              // Teruskan 'customSize' (bukan 'customSizeKB') karena fungsi createFile sudah menanganinya
              const { blob, filename } = await createFile(prompt, format, size, customSize, false);
              downloadBlob(blob, filename);
              successCount++;
              await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) { 
              console.error(`Gagal memproses: "${prompt}"`, error); 
          }
      }

    } else {
      // Logika file rusak (Tidak berubah)
      let selectedExtensions = Object.entries(corruptFormats).filter(([key, val]) => val).map(([key]) => key);
      if (selectedExtensions.length === 0) {
        setIsLoading(false);
        return setStatus('Harap pilih setidaknya satu ekstensi untuk file rusak.');
      }

      totalFiles = prompts.length * selectedExtensions.length;
      setStatus(`Mempersiapkan ${totalFiles} file rusak...`);

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        for (let j = 0; j < selectedExtensions.length; j++) {
          const extension = selectedExtensions[j];
          setStatus(`Memproses ${successCount + 1}/${totalFiles}: "${prompt.substring(0, 20)}.${extension}"`);
          try {
            const { blob, filename } = await createFile(prompt, extension, 'default', '', true);
            downloadBlob(blob, filename);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 150)); 
          } catch (error) {
            console.error(`Gagal memproses file rusak: "${prompt}.${extension}"`, error);
          }
        }
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
          {/* --- 1. Input Teks --- */}
          <div>
            <h3 className="label">1. Masukkan Deskripsi File</h3>
            <textarea 
              id="text-input" 
              rows="6" 
              className="textarea textarea-editor" 
              placeholder="Satu deskripsi per baris... (contoh: Laporan Keuangan Q1, KTP Budi, Faktur Pajak 123)"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          </div>
          
          {/* --- 2. Pilih Mode (Radio Button) --- */}
          <div>
            <h3 className="label">2. Pilih Mode</h3>
            <div className="flex" style={{ gap: '1.5rem', border: '1px solid var(--card-border)', padding: '1rem', borderRadius: '6px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="radio" 
                  value="normal" 
                  checked={mode === 'normal'} 
                  onChange={(e) => setMode(e.target.value)} 
                  style={{ marginRight: '0.5rem', width: '1.1rem', height: '1.1rem' }}
                />
                File Normal (Bisa Dibuka / Ukuran Target)
              </label>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="radio" 
                  value="corrupt" 
                  checked={mode === 'corrupt'} 
                  onChange={(e) => setMode(e.target.value)} 
                  style={{ marginRight: '0.5rem', width: '1.1rem', height: '1.1rem' }}
                />
                File Rusak (Hanya Ekstensi)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            {/* --- 3. Format File (Dinamis) --- */}
            <div>
              {mode === 'normal' ? (
                <>
                  <h3 className="label">3. Pilih Format File Normal</h3>
                  <div id="format-options" className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
                    {Object.keys(normalFormats).map(format => (
                      <div key={format}>
                        <input 
                          type="checkbox" 
                          id={`format-${format}`} 
                          value={format} 
                          className="is-hidden checkbox-input" 
                          checked={normalFormats[format]}
                          onChange={handleNormalFormatChange}
                        />
                        <label htmlFor={`format-${format}`} className="checkbox-label button secondary">
                          {format.toUpperCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    Tips: Jika jumlah baris input = jumlah format, akan dipetakan 1-ke-1.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="label">3. Pilih Ekstensi File Rusak (Bisa lebih dari 1)</h3>
                  <div id="corrupt-format-options" className="grid grid-cols-3" style={{ gap: '0.75rem' }}>
                    {Object.keys(corruptFormats).map(format => (
                      <div key={format}>
                        <input 
                          type="checkbox" 
                          id={`corrupt-format-${format}`} 
                          value={format} 
                          className="is-hidden checkbox-input" 
                          checked={corruptFormats[format]}
                          onChange={handleCorruptFormatChange}
                        />
                        <label htmlFor={`corrupt-format-${format}`} className="checkbox-label button secondary">
                          {format.toUpperCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    1 baris input x 3 ekstensi = 3 file.
                  </p>
                </>
              )}
            </div>
            
            {/* --- 4. Ukuran File (Dinamis) --- */}
            {mode === 'normal' ? (
              <div>
                <h3 className="label">4. Atur Ukuran</h3>
                <select id="size-select" className="select" value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="default">Kualitas Default (Bisa Dibuka, &lt; 2MB)</option>
                  <option value="custom">Ukuran Target (KB)...</option>
                </select>
                {size === 'custom' && (
                  <div id="custom-size-wrapper" style={{ marginTop: '0.75rem' }}>
                    <input 
                      type="number" 
                      id="custom-size-input" 
                      className="input" 
                      placeholder="Target Ukuran (KB) - Max 10000" 
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                    />
                  </div>
                )}
                 <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: '1.6' }}>
                  <b>Default:</b> File bisa dibuka, desain bagus, &lt; 2MB.
                  <br/>
                  <b>Ukuran Target (KB):</b>
                  <br/>- <b>PDF/JPG/PNG:</b> <b>BISA DIBUKA</b>. Ukuran file akan disesuaikan AKURAT ke nilai KB yang diminta (atau sedikit lebih besar agar tidak korup).
                  <br/>- <b>Lainnya (DOCX, dll):</b> <b>TIDAK BISA DIBUKA</b>. Ukuran byte akurat untuk tes upload.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="label">4. Atur Ukuran</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', padding: '0.75rem', background: '#f7fafc', borderRadius: '6px' }}>
                  Ukuran file tidak dapat diatur untuk mode file rusak (selalu kecil).
                </p>
              </div>
            )}
          </div>

          {/* --- Tombol Generate --- */}
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