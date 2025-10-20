function initFileSplitter() {
    const page = document.getElementById('FileSplitter');
    // The new HTML from the prompt, adapted to fit the existing structure.
    page.innerHTML = `
        <div class="tool-header">
            <h1>🚀 Alat Pemecah File</h1>
            <p>Unggah file Anda, tentukan jumlah bagian, dan file akan terunduh secara otomatis.</p>
        </div>
        <div class="card">
            <div class="input-group">
                <label for="fileInput">1. Pilih File (.csv, .txt, .sql)</label>
                <input type="file" id="fileInput" accept=".csv,.txt,.sql" class="input">
            </div>
            <div class="input-group" style="margin-top: 1.5rem;">
                <label for="numParts">2. Ingin Dibagi Menjadi Berapa Bagian?</label>
                <input type="number" id="numParts" value="3" min="2" class="input">
            </div>
            <button id="splitButton" class="button primary" style="width: 100%; margin-top: 1.5rem; padding: 0.8rem;">Pecah & Unduh File</button>
            <div id="status" class="text-center" style="margin-top: 1.5rem; min-height: 24px;"></div>
        </div>
    `;

    // The new Javascript logic from the prompt.
    document.getElementById('splitButton').addEventListener('click', () => {
        const fileInput = document.getElementById('fileInput');
        const numPartsInput = document.getElementById('numParts');
        const statusDiv = document.getElementById('status');
        const file = fileInput.files[0];
        const numParts = parseInt(numPartsInput.value, 10);
        statusDiv.textContent = '';
        statusDiv.className = 'text-center';
        if (!file) {
            statusDiv.textContent = '❌ Harap pilih file terlebih dahulu!';
            statusDiv.className = 'text-center status-error';
            statusDiv.style.color = 'var(--danger-color)';
            return;
        }
        if (isNaN(numParts) || numParts < 2) {
            statusDiv.textContent = '❌ Jumlah bagian harus 2 atau lebih!';
            statusDiv.className = 'text-center status-error';
            statusDiv.style.color = 'var(--danger-color)';
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const records = content.split(';').filter(record => record.trim() !== '');
            const totalRecords = records.length;
            if (totalRecords === 0) {
                statusDiv.textContent = '❌ Gagal: Tidak ada data yang bisa dibaca di dalam file.';
                statusDiv.className = 'text-center status-error';
                statusDiv.style.color = 'var(--danger-color)';
                return;
            }
            if (totalRecords < numParts) {
                statusDiv.textContent = `❌ Gagal: File hanya memiliki ${totalRecords} data, tidak bisa dibagi menjadi ${numParts} bagian.`;
                statusDiv.className = 'text-center status-error';
                statusDiv.style.color = 'var(--danger-color)';
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
            statusDiv.textContent = `✅ Berhasil! File sedang dipecah menjadi ${filesToDownload} bagian dan akan diunduh.`;
            statusDiv.className = 'text-center status-success';
            statusDiv.style.color = 'var(--success-color)';
        };
        reader.onerror = () => {
            statusDiv.textContent = '❌ Terjadi kesalahan saat membaca file.';
            statusDiv.className = 'text-center status-error';
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