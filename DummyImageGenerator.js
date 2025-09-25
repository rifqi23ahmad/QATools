function initDummyImageGenerator() {
    const page = document.getElementById('DummyImageGenerator');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Dummy Image Generator</h1>
            <p>Satu file akan dibuat per deskripsi, dengan format acak dari pilihan Anda.</p>
        </div>
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <div>
                <label for="text-input" class="label">Deskripsi (satu per baris)</label>
                <textarea id="text-input" rows="6" class="textarea" placeholder="Contoh:\\nKTP Atas Nama John Doe\\nSurat Kuasa Pengambilan Barang\\nLogo untuk kedai kopi 'Senja Menyapa'"></textarea>
            </div>
            <div class="grid grid-cols-2" style="margin-top: 1.5rem;">
                <div>
                    <label class="label">Pilih Format yang Diizinkan</label>
                    <div id="format-options" class="grid grid-cols-3" style="gap: 0.5rem;">
                        <div><input type="checkbox" id="format-png" value="png" class="is-hidden checkbox-input" checked><label for="format-png" class="checkbox-label button secondary">PNG</label></div>
                        <div><input type="checkbox" id="format-jpg" value="jpg" class="is-hidden checkbox-input"><label for="format-jpg" class="checkbox-label button secondary">JPG</label></div>
                        <div><input type="checkbox" id="format-pdf" value="pdf" class="is-hidden checkbox-input"><label for="format-pdf" class="checkbox-label button secondary">PDF</label></div>
                        <div><input type="checkbox" id="format-xlsx" value="xlsx" class="is-hidden checkbox-input"><label for="format-xlsx" class="checkbox-label button secondary">XLSX</label></div>
                        <div><input type="checkbox" id="format-doc" value="doc" class="is-hidden checkbox-input"><label for="format-doc" class="checkbox-label button secondary">DOC</label></div>
                        <div><input type="checkbox" id="format-corrupt" value="corrupt" class="is-hidden checkbox-input"><label for="format-corrupt" class="checkbox-label button secondary">Rusak</label></div>
                    </div>
                </div>
                <div>
                    <label for="size-select" class="label">Pilih Ukuran (Per File)</label>
                    <select id="size-select" class="select">
                        <option value="default" selected>Default</option>
                        <option value="<2mb">&lt; 2MB (Acak)</option>
                        <option value="<5mb">&lt; 5MB (Acak)</option>
                        <option value=">2mb">&gt; 2MB (Acak)</option>
                        <option value=">5mb">&gt; 5MB (Acak)</option>
                        <option value="custom">Custom...</option>
                    </select>
                    <div id="custom-size-wrapper" class="is-hidden" style="margin-top: 0.5rem;">
                        <input type="number" id="custom-size-input" class="input" placeholder="Ukuran Custom (MB)">
                    </div>
                </div>
            </div>
            <div style="margin-top: 2rem;">
                <button id="generate-btn" class="button primary" style="width: 100%; padding: 0.8rem;">Buat File & Unduh ZIP</button>
            </div>
            <div id="status-area" style="margin-top: 1.5rem; text-align: center; min-height: 24px;"></div>
        </div>
    `;

    const generateBtn = page.querySelector('#generate-btn');
    const textInput = page.querySelector('#text-input');
    const sizeSelect = page.querySelector('#size-select');
    const customSizeWrapper = page.querySelector('#custom-size-wrapper');
    const customSizeInput = page.querySelector('#custom-size-input');
    const statusArea = page.querySelector('#status-area');
    const { jsPDF } = window.jspdf;

    sizeSelect.addEventListener('change', () => {
        customSizeWrapper.classList.toggle('is-hidden', sizeSelect.value !== 'custom');
    });

    generateBtn.addEventListener('click', handleGeneration);

    async function handleGeneration() {
        const prompts = textInput.value.split('\n').map(p => p.trim()).filter(p => p !== '');
        const selectedFormats = Array.from(page.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

        if (prompts.length === 0) { showStatus('Harap masukkan setidaknya satu deskripsi.', 'error'); return; }
        if (selectedFormats.length === 0) { showStatus('Harap centang setidaknya satu format.', 'error'); return; }

        let selectedSize = sizeSelect.value;
        let customSizeMB = (selectedSize === 'custom') ? parseFloat(customSizeInput.value) || 0 : 0;
        if (selectedSize === 'custom' && customSizeMB <= 0) { showStatus('Ukuran custom harus lebih besar dari 0.', 'error'); return; }
        if (customSizeMB > 100) { showStatus('Ukuran custom tidak boleh melebihi 100 MB.', 'error'); return; }
        
        const totalFiles = prompts.length;
        let processedFiles = 0;
        generateBtn.disabled = true;
        showStatus(`Mempersiapkan ${totalFiles} file...`, 'loading');

        const zip = new JSZip();
        let successCount = 0;

        for (const prompt of prompts) {
            const randomFormat = selectedFormats[Math.floor(Math.random() * selectedFormats.length)];
            processedFiles++;
            showStatus(`Memproses ${processedFiles}/${totalFiles}: "${prompt.substring(0, 20)}..."`, 'loading');
            
            try {
                await addFileToZip(zip, prompt, randomFormat, selectedSize, customSizeMB);
                successCount++;
            } catch (error) {
                console.error(`Gagal memproses: "${prompt}"`, error);
            }
        }

        if (successCount === 0) {
            showStatus('Gagal memproses semua file.', 'error');
            generateBtn.disabled = false;
            return;
        }

        showStatus('Mengemas file ZIP...', 'loading');
        try {
            const content = await zip.generateAsync({ type: "blob" });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `dummy-files-${timestamp}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            showStatus(`Berhasil! ${successCount} file telah diunduh.`, 'success');
        } catch (error) {
            showStatus('Gagal membuat file ZIP.', 'error');
        } finally {
            generateBtn.disabled = false;
        }
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            if (context.measureText(testLine).width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else { line = testLine; }
        }
        lines.push(line);
        let startY = y - ((lines.length - 1) * lineHeight) / 2;
        for(let i = 0; i < lines.length; i++) {
            context.fillText(lines[i].trim(), x, startY + (i * lineHeight));
        }
        return lines.length;
    }

    function createStandardTextImage(prompt) {
        const canvas = document.createElement('canvas');
        const [width, height] = [1200, 630];
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 1.5);
        bgGradient.addColorStop(0, '#2c3e50'); bgGradient.addColorStop(1, '#1a202c');
        ctx.fillStyle = bgGradient; ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(100, 100, width - 200, height - 200, [30]); ctx.fill(); ctx.stroke();
        
        const icon = (() => {
            const p = prompt.toLowerCase();
            if (p.includes('kopi')) return '☕️'; if (p.includes('dokumen') || p.includes('surat')) return '📄';
            if (p.includes('ktp') || p.includes('id')) return '💳'; if (p.includes('cinta') || p.includes('love')) return '❤️';
            if (p.includes('ide')) return '💡'; if (p.includes('musik')) return '🎵';
            if (p.includes('selamat')) return '🎉'; if (p.includes('uang') || p.includes('bayar')) return '💰';
            return '✨';
        })();
        
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '150px Inter'; ctx.globalAlpha = 0.9; ctx.fillText(icon, width / 2, height / 2 - 80); ctx.globalAlpha = 1.0;
        ctx.fillStyle = 'white'; ctx.font = 'bold 80px Inter';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; ctx.shadowBlur = 10;
        wrapText(ctx, prompt, width / 2, height / 2 + 120, width - 300, 90);
        ctx.shadowColor = 'transparent';
        return canvas.toDataURL('image/png').split(',')[1];
    }

    function createHardcodedDocumentImage(prompt) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const p = prompt.toLowerCase();

        if (p.includes('ktp') || p.includes('sim')) {
            const isKTP = !p.includes('sim');
            canvas.width = 1011; canvas.height = 638;
            ctx.fillStyle = isKTP ? '#e6f0ff' : '#ffe6e6'; ctx.fillRect(0, 0, 1011, 638);
            ctx.strokeStyle = isKTP ? '#b3d1ff' : '#ffb3b3'; ctx.lineWidth = 20; ctx.strokeRect(0, 0, 1011, 638);
            ctx.fillStyle = isKTP ? '#003a8c' : '#a80000'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Inter';
            ctx.fillText(isKTP ? 'KARTU TANDA PENDUDUK' : 'SURAT IZIN MENGEMUDI', 505, 80);
            const fields = isKTP ? ['NIK', 'Nama', 'Tempat/Tgl Lahir', 'Alamat', 'Agama'] : ['No. SIM', 'Nama', 'Alamat', 'Pekerjaan'];
            ctx.textAlign = 'left'; ctx.font = '28px Inter';
            fields.forEach((field, i) => ctx.fillText(`${field.padEnd(18, ' ')}: [DUMMY DATA]`, 320, 200 + (i * 45)));
        } else {
            canvas.width = 800; canvas.height = 1131;
            ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 800, 1131);
            ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.font = 'bold 28px Inter';
            wrapText(ctx, prompt.replace(/\*/g, '').trim().toUpperCase(), 400, 200, 600, 35);
        }
        return canvas.toDataURL('image/png').split(',')[1];
    }

    async function createLargeDummyBlob(targetMB, format, prompt) {
        const targetBytes = targetMB * 1024 * 1024;
        const fileInfo = `Deskripsi: ${prompt}\\nTarget Ukuran: ~${targetMB.toFixed(2)} MB`;
        if (format === 'pdf') {
            const doc = new jsPDF(); doc.text(fileInfo, 10, 10);
            const text = 'Dummy text. '.repeat(50); const numPages = Math.ceil(targetBytes / 2500);
            for (let i = 1; i < numPages; i++) { doc.addPage(); doc.text(`Page ${i + 1}`, 10, 10); doc.text(text, 10, 20); }
            return doc.output('blob');
        } else if (['png', 'jpg'].includes(format)) {
            const canvas = document.createElement('canvas'); const dim = Math.ceil(Math.sqrt(targetBytes / 1.5));
            canvas.width = dim; canvas.height = dim;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
            ctx.fillRect(0,0, dim, dim);
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, dim/2 - 50, dim, 100);
            ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = `bold ${dim/25}px Inter`;
            ctx.fillText(prompt, dim / 2, dim / 2);
            return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } else {
            const textData = 'Dummy data. '.repeat(Math.ceil(targetBytes / 12));
            return new Blob([fileInfo + '\\n\\n' + textData.substring(0, targetBytes)], { type: 'text/plain' });
        }
    }

    // --- FUNGSI UTAMA DENGAN LOGIKA YANG DIPERBARUI ---
    async function addFileToZip(zip, prompt, format, size, customSize) {
        const cleanPrompt = prompt.replace(/\*/g, '').trim();
        const safeFilename = cleanPrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || `file_${Date.now()}`;
        
        if (format === 'corrupt') {
            zip.file(`${safeFilename}_corrupted.txt`, `Corrupted file for: ${prompt}`);
            return;
        }

        const requiresLargeFile = size !== 'default';

        if (requiresLargeFile) {
            // --- JALUR KHUSUS UNTUK FILE UKURAN BESAR ---
            let targetMB;
            if (size === '<2mb') targetMB = Math.random() * 1.8 + 0.1;   // 0.1MB to 1.9MB
            else if (size === '<5mb') targetMB = Math.random() * 2.8 + 2.0; // 2.0MB to 4.8MB
            else if (size === '>2mb') targetMB = Math.random() * 3 + 2.2;   // 2.2MB to 5.2MB
            else if (size === '>5mb') targetMB = Math.random() * 5 + 5.2;   // 5.2MB to 10.2MB
            else if (size === 'custom') targetMB = customSize;
            
            const blobData = await createLargeDummyBlob(targetMB, format, prompt);
            zip.file(`${safeFilename}.${format}`, blobData);

        } else {
            // --- JALUR KHUSUS UNTUK FILE UKURAN DEFAULT (KECIL & PINTAR) ---
            let base64Data;
            const docKeywords = ['ktp', 'sim', 'surat', 'laporan', 'faktur', 'invoice', 'dokumen'];
            if (docKeywords.some(k => cleanPrompt.toLowerCase().includes(k))) {
                base64Data = createHardcodedDocumentImage(cleanPrompt);
            } else {
                base64Data = createStandardTextImage(cleanPrompt);
            }

            if (format === 'pdf') {
                const img = new Image();
                await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + base64Data; });
                const doc = new jsPDF({ orientation: img.width > img.height ? 'l' : 'p', unit: 'px', format: [img.width, img.height] });
                doc.addImage(img, 'PNG', 0, 0, img.width, img.height);
                zip.file(`${safeFilename}.pdf`, doc.output('blob'));
            } else if (['png', 'jpg'].includes(format)) {
                zip.file(`${safeFilename}.${format}`, base64Data, { base64: true });
            } else {
                zip.file(`${safeFilename}.${format}`, `Dummy file for: ${prompt}`);
            }
        }
    }

    function showStatus(message, type = 'idle') {
        let content = '';
        let color = (type === 'success') ? 'var(--success-color)' : (type === 'error') ? 'var(--danger-color)' : 'var(--text-secondary)';
        if (type === 'loading') {
            content = `<div class="flex items-center justify-center"><div class="loader-spinner" style="margin-right: 0.75rem;"></div><span style="color:${color};">${message}</span></div>`;
        } else {
            content = `<span style="font-weight: 500; color:${color};">${message}</span>`;
        }
        statusArea.innerHTML = content;
    }
}