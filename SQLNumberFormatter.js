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
                    <textarea id="sql-input" class="textarea textarea-editor" rows="8" placeholder="Contoh: 123 456, 789..."></textarea>
                </div>
            </div>
            <div class="flex" style="justify-content: center; margin-top: 1.5rem;">
                <button class="button primary" onclick="formatSqlNumbers()">Format ke SQL</button>
                <button id="sql-copy-btn" class="button secondary" onclick="copySqlOutput()">Salin Hasil</button>
            </div>
            <div class="field" style="margin-top: 1.5rem;">
                <label class="label" style="font-weight: 600;">Output SQL</label>
                <div class="control">
                    <textarea id="sql-output" class="textarea textarea-editor" rows="8" readonly></textarea>
                </div>
            </div>
        </div>
    `;
}

function formatSqlNumbers() {
    const input = document.getElementById("sql-input").value;
    let values = input.match(/[^,\s;]+/g);

    if (values) {
        // Hapus semua karakter kutip dua (") dari setiap nilai
        values = values.map(val => val.replace(/"/g, ''));
        document.getElementById("sql-output").value = `'${values.join("',\n'")}'`;
    } else {
        document.getElementById("sql-output").value = "";
    }
}

function copySqlOutput() {
    const output = document.getElementById("sql-output");
    const copyBtn = document.getElementById("sql-copy-btn");

    if (!output.value) {
        alert('Tidak ada hasil untuk disalin.');
        return;
    }

    output.select();
    navigator.clipboard.writeText(output.value).then(() => {
        // Ganti pop-up dengan mengubah teks tombol sementara
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = 'Berhasil disalin!';
        copyBtn.disabled = true;
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }, 2000); // Kembali normal setelah 2 detik
    }).catch(err => {
        alert('Gagal menyalin.');
    });
}