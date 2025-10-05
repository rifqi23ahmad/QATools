function initFileSplitter() {
    const page = document.getElementById('FileSplitter');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Pemecah File Handal</h1>
            <p>Unggah file .csv atau .txt, tentukan jumlah bagian, dan unduh hasilnya.</p>
        </div>
        <div class="card">
            <div class="flex flex-col" style="gap: 1.5rem;">
                <div>
                    <label class="label">1. Pilih File Anda</label>
                    <label for="fileSplitterInput" class="file-input-label">
                        <div id="file-splitter-info">
                            <i class="fas fa-file-arrow-up fa-3x" style="color: #cbd5e0;"></i>
                            <span style="margin-top: 1rem; display: block; font-weight: 500;">Klik untuk memilih file</span>
                            <span style="font-size: 0.8rem; color: var(--text-secondary);">CSV atau TXT</span>
                        </div>
                    </label>
                    <input type="file" id="fileSplitterInput" accept=".csv,.txt" class="is-hidden">
                </div>
                <div>
                    <label for="numParts" class="label">2. Bagi Menjadi Berapa File?</label>
                    <input type="number" id="numParts" value="3" min="2" class="input">
                </div>
                <button id="splitButton" class="button primary" style="padding: 0.8rem 1.5rem; font-size: 1.1rem;">
                    <i class="fas fa-bolt" style="margin-right: 0.5rem;"></i> Pecah & Unduh File
                </button>
            </div>
            <div id="splitter-status" class="text-center" style="margin-top: 1.5rem; min-height: 24px;"></div>
        </div>
    `;

    const fileInput = page.querySelector('#fileSplitterInput');
    const numPartsInput = page.querySelector('#numParts');
    const splitButton = page.querySelector('#splitButton');
    const statusDiv = page.querySelector('#splitter-status');
    const fileInfoDiv = page.querySelector('#file-splitter-info');

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileInfoDiv.innerHTML = `
                <i class="fas fa-check-circle fa-3x" style="color: var(--success-color);"></i>
                <span style="margin-top: 1rem; display: block; font-weight: 600;">${fileName}</span>
                <span style="font-size: 0.8rem; color: var(--text-secondary);">File siap diproses!</span>
            `;
            statusDiv.textContent = '';
        }
    });

    splitButton.addEventListener('click', () => {
        const file = fileInput.files[0];
        const numParts = parseInt(numPartsInput.value, 10);

        statusDiv.textContent = '';

        if (!file) {
            statusDiv.textContent = '❌ Harap pilih file terlebih dahulu!';
            statusDiv.style.color = 'var(--danger-color)';
            return;
        }
        if (isNaN(numParts) || numParts < 2) {
            statusDiv.textContent = '❌ Jumlah bagian harus 2 atau lebih!';
            statusDiv.style.color = 'var(--danger-color)';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
            const totalLines = lines.length;

            if (totalLines === 0) {
                statusDiv.textContent = `⚠️ File kosong atau tidak berisi data yang valid.`;
                statusDiv.style.color = 'var(--warning-color)';
                return;
            }
            if (totalLines < numParts) {
                statusDiv.textContent = `❌ Gagal: File hanya memiliki ${totalLines} baris, tidak bisa dibagi menjadi ${numParts} bagian.`;
                statusDiv.style.color = 'var(--danger-color)';
                return;
            }

            const linesPerFile = Math.ceil(totalLines / numParts);
            for (let i = 0; i < numParts; i++) {
                const start = i * linesPerFile;
                const end = start + linesPerFile;
                const chunkLines = lines.slice(start, end);

                if (chunkLines.length > 0) {
                    downloadFile(chunkLines.join('\n'), file.name, i + 1);
                }
            }
            statusDiv.textContent = `✅ Berhasil! ${numParts} file sedang diunduh.`;
            statusDiv.style.color = 'var(--success-color)';
        };
        
        reader.onerror = () => {
            statusDiv.textContent = '❌ Terjadi kesalahan saat membaca file.';
            statusDiv.style.color = 'var(--danger-color)';
        };

        reader.readAsText(file);
    });

    function downloadFile(content, originalFilename, partNumber) {
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
    }
}