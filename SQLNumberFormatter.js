function initSqlFormatter() {
    const page = document.getElementById('SqlFormatter');
    // --- PEROMBAKAN TAMPILAN HTML ---
    page.innerHTML = `
        <div class="tool-header">
            <h1>SQL IN Clause Formatter</h1>
            <p>Ubah daftar ID (angka, UUID, teks, dll.) menjadi string yang diformat untuk klausa SQL IN.</p>
        </div>
        <div class="card">
            <div class="grid grid-cols-2" style="gap: 1.5rem;">
                <div class="flex flex-col">
                    <label for="sql-input-formatter" class="label">1. Tempelkan Daftar ID Anda</label>
                    <textarea id="sql-input-formatter" class="textarea textarea-editor" style="height: 40vh;" placeholder="Pisahkan dengan spasi, koma, atau baris baru...\n\n12345\n67890\n21637b8f-cc53-498f-9c3f-b2f81997d30d"></textarea>
                </div>
                <div class="flex flex-col">
                    <label for="sql-output-formatter" class="label">2. Hasil Format SQL</label>
                    <textarea id="sql-output-formatter" class="textarea textarea-editor" style="height: 40vh;" readonly placeholder="'12345',\n'67890',\n'21637b8f-cc53-498f-9c3f-b2f81997d30d'"></textarea>
                </div>
            </div>
            <div class="flex" style="justify-content: center; margin-top: 1.5rem; gap: 1rem;">
                <button id="format-sql-btn" class="button primary" style="padding: 0.7rem 1.5rem;"><i class="fas fa-cogs" style="margin-right: 0.5rem;"></i> Format ke SQL</button>
                <button id="copy-sql-btn" class="button secondary" style="padding: 0.7rem 1.5rem;"><i class="fas fa-copy" style="margin-right: 0.5rem;"></i> Salin Hasil</button>
            </div>
        </div>
    `;

    const formatBtn = page.querySelector('#format-sql-btn');
    const copyBtn = page.querySelector('#copy-sql-btn');
    const inputArea = page.querySelector('#sql-input-formatter');
    const outputArea = page.querySelector('#sql-output-formatter');

    // --- PERBAIKAN LOGIKA INTI ---
    const processFormatting = () => {
        const input = inputArea.value;
        // Memisahkan input berdasarkan spasi, koma, titik koma, atau baris baru, lalu memfilter item kosong
        const items = input.split(/[\s,;]+/).filter(item => item.trim() !== '');
        
        // Menggabungkan kembali dengan format SQL
        outputArea.value = items.length > 0 ? `'${items.join("',\n'")}'` : "";
    };

    formatBtn.addEventListener('click', processFormatting);

    // Tambahkan event listener untuk memformat secara real-time saat pengguna mengetik
    inputArea.addEventListener('input', processFormatting);

    copyBtn.addEventListener('click', () => {
        if (!outputArea.value) {
            alert('Tidak ada hasil untuk disalin.');
            return;
        }
        navigator.clipboard.writeText(outputArea.value).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = `<i class="fas fa-check" style="margin-right: 0.5rem;"></i> Disalin!`;
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            alert('Gagal menyalin.');
        });
    });
}