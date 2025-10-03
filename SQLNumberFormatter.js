function initSqlFormatter() {
    const page = document.getElementById('SqlFormatter');
    page.innerHTML = `
        <div class="tool-header">
            <h1>SQL Number Formatter</h1>
            <p>Ubah daftar angka menjadi string yang diformat untuk klausa IN di SQL.</p>
        </div>
        <div class="card" style="max-width: 800px; margin: 0 auto;">
            <div class="field">
                <label class="label" style="font-weight: 600;">Input Angka</label>
                <div class="control">
                    <textarea id="sql-input-formatter" class="textarea textarea-editor" rows="8" placeholder="Contoh: 123 456, 789..."></textarea>
                </div>
            </div>
            <div class="flex" style="justify-content: center; margin-top: 1.5rem;">
                <button id="format-sql-btn" class="button primary">Format ke SQL</button>
                <button id="copy-sql-btn" class="button secondary">Salin Hasil</button>
            </div>
            <div class="field" style="margin-top: 1.5rem;">
                <label class="label" style="font-weight: 600;">Output SQL</label>
                <div class="control">
                    <textarea id="sql-output-formatter" class="textarea textarea-editor" rows="8" readonly></textarea>
                </div>
            </div>
        </div>
    `;

    const formatBtn = page.querySelector('#format-sql-btn');
    const copyBtn = page.querySelector('#copy-sql-btn');
    const inputArea = page.querySelector('#sql-input-formatter');
    const outputArea = page.querySelector('#sql-output-formatter');

    formatBtn.addEventListener('click', () => {
        const input = inputArea.value;
        const numbers = input.match(/\d+/g);
        outputArea.value = numbers ? `'${numbers.join("',\n'")}'` : "";
    });

    copyBtn.addEventListener('click', () => {
        if (!outputArea.value) {
            alert('Tidak ada hasil untuk disalin.');
            return;
        }
        outputArea.select();
        navigator.clipboard.writeText(outputArea.value).then(() => {
            alert('Hasil disalin ke clipboard!');
        }).catch(err => {
            alert('Gagal menyalin.');
        });
    });
}