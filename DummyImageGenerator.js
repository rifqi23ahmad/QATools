function initDummyImageGenerator() {
    const page = document.getElementById('DummyImageGenerator');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Advanced Dummy File Generator</h1>
            <p>Buat file dummy (termasuk file korup) dan unduh secara individual.</p>
        </div>
        <div class="card">
            <div class="flex flex-col" style="gap: 2rem;">

                <div>
                    <h3 class="label" style="font-size: 1.1rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">1. Masukkan Deskripsi File</h3>
                    <textarea id="text-input" rows="6" class="textarea textarea-editor" placeholder="Satu deskripsi per baris...\nSetiap baris akan menjadi satu file."></textarea>
                </div>

                <div class="grid grid-cols-2" style="gap: 2rem;">
                    <div>
                        <h3 class="label" style="font-size: 1.1rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">2. Pilih Format File</h3>
                        <div id="format-options" class="grid grid-cols-3" style="gap: 0.75rem;">
                            <div><input type="checkbox" id="format-png" value="png" class="is-hidden checkbox-input" checked><label for="format-png" class="checkbox-label button secondary">PNG</label></div>
                            <div><input type="checkbox" id="format-jpg" value="jpg" class="is-hidden checkbox-input"><label for="format-jpg" class="checkbox-label button secondary">JPG</label></div>
                            <div><input type="checkbox" id="format-pdf" value="pdf" class="is-hidden checkbox-input"><label for="format-pdf" class="checkbox-label button secondary">PDF</label></div>
                            <div><input type="checkbox" id="format-xlsx" value="xlsx" class="is-hidden checkbox-input"><label for="format-xlsx" class="checkbox-label button secondary">XLSX</label></div>
                            <div><input type="checkbox" id="format-doc" value="doc" class="is-hidden checkbox-input"><label for="format-doc" class="checkbox-label button secondary">DOC</label></div>
                            <div><input type="checkbox" id="format-corrupt" value="corrupt" class="is-hidden checkbox-input"><label for="format-corrupt" class="checkbox-label button secondary">Rusak</label></div>
                        </div>
                    </div>

                    <div>
                        <h3 class="label" style="font-size: 1.1rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">3. Atur Ukuran (Opsional)</h3>
                        <select id="size-select" class="select">
                            <option value="default" selected>Ukuran Default (Kecil)</option>
                            <option value="<2mb">&lt; 2MB (Acak)</option>
                            <option value="<5mb">&lt; 5MB (Acak)</option>
                            <option value=">2mb">&gt; 2MB (Acak)</option>
                            <option value=">5mb">&gt; 5MB (Acak)</option>
                            <option value="custom">Ukuran Custom...</option>
                        </select>
                        <div id="custom-size-wrapper" class="is-hidden" style="margin-top: 0.75rem;">
                            <input type="number" id="custom-size-input" class="input" placeholder="Ukuran Custom (MB)">
                        </div>
                    </div>
                </div>

                <div id="corrupt-options-wrapper" class="is-hidden">
                    <h3 class="label" style="font-size: 1.1rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">Pilih Ekstensi untuk File Rusak</h3>
                    <select id="corrupt-extension-select" class="select">
                        <option value="pdf">PDF</option>
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                        <option value="xlsx">XLSX</option>
                        <option value="doc">DOC</option>
                        <option value="txt">TXT</option>
                    </select>
                </div>

                <div>
                    <button id="generate-btn" class="button primary" style="width: 100%; padding: 0.8rem; font-size: 1.1rem;">
                        <i class="fas fa-file-download" style="margin-right: 0.75rem;"></i> Buat & Unduh File
                    </button>
                    <div id="status-area" style="margin-top: 1.5rem; text-align: center; min-height: 24px;"></div>
                </div>

            </div>
        </div>
    `;

    const generateBtn = page.querySelector('#generate-btn');
    const textInput = page.querySelector('#text-input');
    const sizeSelect = page.querySelector('#size-select');
    const customSizeWrapper = page.querySelector('#custom-size-wrapper');
    const customSizeInput = page.querySelector('#custom-size-input');
    const statusArea = page.querySelector('#status-area');
    const corruptCheckbox = page.querySelector('#format-corrupt');
    const corruptOptionsWrapper = page.querySelector('#corrupt-options-wrapper');
    const { jsPDF } = window.jspdf;

    sizeSelect.addEventListener('change', () => {
        customSizeWrapper.classList.toggle('is-hidden', sizeSelect.value !== 'custom');
    });
    
    corruptCheckbox.addEventListener('change', () => {
        corruptOptionsWrapper.classList.toggle('is-hidden', !corruptCheckbox.checked);
    });

    generateBtn.addEventListener('click', handleGeneration);

    function downloadBlob(blob, filename) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    }

    async function handleGeneration() {
        const prompts = textInput.value.split('\n').map(p => p.trim()).filter(p => p !== '');
        let selectedFormats = Array.from(page.querySelectorAll('#format-options input[type="checkbox"]:checked')).map(cb => cb.value);
        if (prompts.length === 0) { showStatus('Harap masukkan setidaknya satu deskripsi.', 'error'); return; }
        if (selectedFormats.length === 0) { showStatus('Harap centang setidaknya satu format.', 'error'); return; }
        let selectedSize = sizeSelect.value;
        let customSizeMB = (selectedSize === 'custom') ? parseFloat(customSizeInput.value) || 0 : 0;
        if (selectedSize === 'custom' && customSizeMB <= 0) { showStatus('Ukuran custom harus lebih besar dari 0.', 'error'); return; }
        if (customSizeMB > 100) { showStatus('Ukuran custom tidak boleh melebihi 100 MB.', 'error'); return; }
        
        generateBtn.disabled = true;
        showStatus(`Mempersiapkan ${prompts.length} file...`, 'loading');
        
        if (selectedFormats.length > 1) { 
            selectedFormats = selectedFormats.filter(f => f !== 'corrupt'); 
        }

        let successCount = 0;
        for (let i = 0; i < prompts.length; i++) {
            const prompt = prompts[i];
            const format = selectedFormats.length === 1 ? selectedFormats[0] : selectedFormats[Math.floor(Math.random() * selectedFormats.length)];
            
            showStatus(`Memproses ${i + 1}/${prompts.length}: "${prompt.substring(0, 20)}..."`, 'loading');
            
            try {
                const { blob, filename } = await createFile(prompt, format, selectedSize, customSizeMB);
                downloadBlob(blob, filename);
                successCount++;
                await new Promise(resolve => setTimeout(resolve, 300)); // Delay for smoother download experience
            } catch (error) { 
                console.error(`Gagal memproses: "${prompt}"`, error); 
            }
        }

        if (successCount > 0) { 
            showStatus(`Berhasil! ${successCount} file telah diunduh.`, 'success'); 
        } else { 
            showStatus('Gagal memproses semua file.', 'error'); 
        }
        
        generateBtn.disabled = false;
    }

    async function createFile(prompt, format, size, customSize) {
        const cleanPrompt = prompt.replace(/\*/g, '').trim();
        let safeFilename = cleanPrompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50) || `file_${Date.now()}`;
        let blob;

        if (format === 'corrupt') {
            const corruptExtension = page.querySelector('#corrupt-extension-select').value;
            safeFilename += `_corrupted.${corruptExtension}`;
            const corruptSize = 1024; 
            const corruptData = new Uint8Array(corruptSize);
            crypto.getRandomValues(corruptData); // Fill with random bytes
            blob = new Blob([corruptData]);
            return { blob, filename: safeFilename };
        }

        const requiresLargeFile = size !== 'default';
        if (requiresLargeFile) {
            let targetMB;
            if (size === '<2mb') targetMB = Math.random() * 1.8 + 0.1;
            else if (size === '<5mb') targetMB = Math.random() * 2.8 + 2.0;
            else if (size === '>2mb') targetMB = Math.random() * 3 + 2.2;
            else if (size === '>5mb') targetMB = Math.random() * 5 + 5.2;
            else if (size === 'custom') targetMB = customSize;
            
            blob = await createLargeDummyBlob(targetMB, format, prompt);
            safeFilename += `_(${targetMB.toFixed(2)}MB).${format}`;
        } else {
            const base64Data = createIntelligentImage(cleanPrompt);
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
                // For DOCX and XLSX, create a simple text blob as a placeholder
                blob = new Blob([`Dummy file for: ${prompt}`], {type: "application/octet-stream"}); 
            }
        }
        return { blob, filename: safeFilename };
    }

    async function createLargeDummyBlob(targetMB, format, prompt) {
        const targetBytes = targetMB * 1024 * 1024;
        if (format === 'pdf') {
            const doc = new jsPDF();
            doc.text(`Dummy PDF for "${prompt}"`, 10, 10);
            const text = 'Dummy text for padding file size. '.repeat(100);
            const numPages = Math.max(1, Math.ceil(targetBytes / 2500)); // Rough estimation
            for (let i = 1; i < numPages; i++) {
                doc.addPage();
                doc.text(`Page ${i + 1}`, 10, 10);
                doc.text(text, 10, 20);
            }
            return doc.output('blob');
        } else if (['png', 'jpg'].includes(format)) {
            const canvas = document.createElement('canvas');
            // Estimate dimensions based on 3 bytes per pixel (RGB)
            const estimatedPixels = targetBytes / 3; 
            const dim = Math.ceil(Math.sqrt(estimatedPixels));
            canvas.width = dim; canvas.height = dim;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(dim, dim);
            const data = imageData.data;
            // Fill with random noise for size
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.random() * 255;     // R
                data[i + 1] = Math.random() * 255; // G
                data[i + 2] = Math.random() * 255; // B
                data[i + 3] = 255;                 // A
            }
            ctx.putImageData(imageData, 0, 0);

            // Add text on top of the noise
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, dim / 2 - 50, dim, 100);
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.font = `bold ${Math.max(20, dim / 25)}px Inter`;
            ctx.fillText(prompt, dim / 2, dim / 2);

            return new Promise(resolve => canvas.toBlob(resolve, `image/${format}`, 0.9));
        } else {
            // Generic text-based large file for doc, xlsx, etc.
            const textData = 'Dummy data for file size padding. '.repeat(Math.ceil(targetBytes / 35));
            return new Blob([textData.substring(0, targetBytes)], { type: 'application/octet-stream' });
        }
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
        
        if (config.type === 'KTP/SIM') {
            const isKTP = !p_lower.includes('sim');
            const fields = isKTP ? ['NIK', 'Nama', 'Tempat/Tgl Lahir', 'Alamat', 'Agama'] : ['No. SIM', 'Nama', 'Alamat', 'Pekerjaan'];
            fields.forEach((field, i) => { ctx.fillText(`${field.padEnd(18, ' ')}: [DUMMY DATA GENERATED]`, config.width * 0.1, config.height * 0.35 + (i * 50)); });
            const photoBoxSize = config.width * 0.2;
            ctx.strokeRect(config.width * 0.7, config.height * 0.3, photoBoxSize, photoBoxSize * 1.25);
            ctx.textAlign = 'center';
            ctx.fillText("Pas Foto", config.width * 0.7 + photoBoxSize / 2, config.height * 0.3 + (photoBoxSize * 1.25) / 2);
        } else if (config.type === 'FAKTUR') {
            const items = [['Barang A', 2, 150000], ['Barang B', 1, 350000], ['Barang C', 5, 50000]]; let yPos = config.height * 0.35;
            ctx.font = `bold ${config.width / 50}px Inter`; 
            ctx.fillText("Deskripsi", config.width * 0.1, yPos); 
            ctx.textAlign = 'center';
            ctx.fillText("Jumlah", config.width * 0.6, yPos); 
            ctx.textAlign = 'right';
            ctx.fillText("Harga", config.width * 0.9, yPos);
            
            yPos += 50; 
            ctx.font = `${config.width / 50}px Inter`;
            items.forEach(([item, qty, price]) => { 
                ctx.textAlign = 'left';
                ctx.fillText(item, config.width * 0.1, yPos); 
                ctx.textAlign = 'center';
                ctx.fillText(qty.toString(), config.width * 0.6, yPos); 
                ctx.textAlign = 'right';
                ctx.fillText(price.toLocaleString('id-ID'), config.width * 0.9, yPos); 
                yPos += 40; 
            });
            ctx.font = `bold ${config.width / 45}px Inter`; 
            ctx.fillText("TOTAL: Rp 900.000", config.width * 0.9, yPos + 50);
        } else { 
            const dummyText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent laoreet, nunc ut faucibus sodales, enim magna placerat enim, a pulvinar est nunc vel lorem. Quisque hendrerit, quam et sodales molestie, velit purus fringilla sem, ac faucibus eros odio et augue."; 
            wrapText(ctx, dummyText, config.width / 2, config.height / 2, config.width * 0.8, 40); 
        }
        return canvas.toDataURL('image/png').split(',')[1];
    }

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' '); 
        let line = ''; 
        context.textAlign = 'center'; 
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) { 
            const testLine = line + words[n] + ' '; 
            if (context.measureText(testLine).width > maxWidth && n > 0) { 
                context.fillText(line, x, currentY); 
                line = words[n] + ' '; 
                currentY += lineHeight; 
            } else { 
                line = testLine; 
            } 
        }
        context.fillText(line, x, currentY);
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