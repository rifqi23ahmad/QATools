function initArchiveFileFinder() {
    const page = document.getElementById('ArchiveFileFinder');
    if (!page) return;

    // --- HTML (Diadaptasi dari kode Anda agar sesuai dengan style.css) ---
    page.innerHTML = `
        <div class="tool-header">
            <h1>Pencari Arsip / Data</h1>
            <p>Unggah .zip untuk mencari file, atau .csv untuk mencari data di dalamnya.</p>
        </div>

        <div class="card" id="upload-section">
            <p style="color: var(--text-secondary); text-align: center; margin-bottom: 1.5rem;">
                Silakan pilih sumber data Anda.
            </p>
            
            <div class="grid grid-cols-2" style="gap: 1.5rem;">
                <div style="border: 2px dashed var(--card-border); border-radius: 8px; padding: 1.5rem; text-align: center;">
                    <h3 style="font-weight: 600; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.5rem;">Mode Arsip (ZIP)</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Cari file (PDF, doc, dll) di dalam arsip .zip.</p>
                    <div class="file-input-wrapper">
                        <button class="file-input-label button primary">
                            <i class="fas fa-file-archive" style="margin-right: 0.5rem;"></i> Pilih File .zip
                        </button>
                        <input type="file" id="zip-uploader" accept=".zip" title="Pilih file .zip untuk diunggah">
                    </div>
                </div>

                <div style="border: 2px dashed var(--card-border); border-radius: 8px; padding: 1.5rem; text-align: center;">
                    <h3 style="font-weight: 600; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.5rem;">Mode Data (CSV)</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Cari data (baris) di dalam file .csv.</p>
                    <div class="file-input-wrapper">
                        <button class="file-input-label button" style="background-color: #6b46c1; color: white; border-color: #6b46c1;">
                            <i class="fas fa-file-csv" style="margin-right: 0.5rem;"></i> Pilih File .csv
                        </button>
                        <input type="file" id="csv-uploader-database" accept=".csv" title="Pilih file .csv untuk diunggah">
                    </div>
                </div>
            </div>
            <div id="upload-status" style="margin-top: 1.5rem; text-align: center; color: var(--text-secondary); min-height: 1.5rem;"></div>
        </div>

        <div class="card is-hidden" id="search-section" style="margin-top: 1.5rem;">
            <div class="flex flex-col" style="gap: 1rem;">
                <div>
                    <label for="search-input" class="label">Cari Data</label>
                    <input type="text" id="search-input" placeholder="Ketik kata kunci untuk memfilter data..." class="input">
                </div>

                <div style="padding: 1rem; background-color: #f7fafc; border-radius: 6px; border: 1px solid var(--card-border);">
                    <label for="bulk-search-area" class="label">Pencarian & Seleksi Bulk</label>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">Tempel (paste) daftar NIP/ID di sini, atau unggah file .csv.</p>

                    <div style="margin-bottom: 0.75rem;">
                        <div class="file-input-wrapper">
                            <button class="file-input-label button success" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;">
                                <i class="fas fa-file-csv" style="margin-right: 0.5rem;"></i> Pilih File .csv
                            </button>
                            <input type="file" id="csv-uploader" accept=".csv" title="Pilih file .csv untuk diunggah">
                        </div>
                        <span id="csv-status" style="margin-left: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);"></span>
                    </div>

                    <textarea id="bulk-search-area" rows="5" class="textarea textarea-editor" placeholder="605323110066\n610423090101\n551223090168..."></textarea>
                    
                    <div class="flex" style="margin-top: 0.75rem; gap: 0.5rem;">
                        <button id="bulk-select-btn" class="button primary">
                            Pilih Otomatis
                        </button>
                        <button id="clear-selection-btn" class="button" style="background-color: #ecc94b; color: #744210; border-color: #ecc94b;">
                            Bersihkan Pilihan
                        </button>
                    </div>
                </div>
                <label class="label" style="margin-top: 0.5rem;">Hasil Pencarian</label>
                <div id="results-container" class="results-table-wrapper" style="max-height: 40vh; overflow-y: auto; overflow-x: auto; border: 1px solid var(--card-border); border-radius: 6px; min-height: 100px; background: white;">
                    </div>

                <div class="flex" style="gap: 0.75rem;">
                    <button id="download-selected-btn" class="button success" disabled>
                        Unduh Terpilih
                    </button>
                    <button id="reload-btn" class="button secondary">
                        Mulai Ulang
                    </button>
                </div>
                <div id="download-status" style="color: var(--primary-color); min-height: 1.5rem;"></div>
            </div>
        </div>
    `;

    // --- Logika JavaScript dari file Anda ---

    // Referensi ke elemen-elemen DOM
    const uploadSection = page.querySelector('#upload-section');
    const searchSection = page.querySelector('#search-section');
    const zipUploader = page.querySelector('#zip-uploader');
    const uploadStatus = page.querySelector('#upload-status');
    const searchInput = page.querySelector('#search-input');
    const resultsContainer = page.querySelector('#results-container');
    const downloadSelectedBtn = page.querySelector('#download-selected-btn');
    const reloadBtn = page.querySelector('#reload-btn');
    const downloadStatus = page.querySelector('#download-status');
    const bulkSearchArea = page.querySelector('#bulk-search-area');
    const bulkSelectBtn = page.querySelector('#bulk-select-btn');
    const clearSelectionBtn = page.querySelector('#clear-selection-btn');
    const csvUploader = page.querySelector('#csv-uploader');
    const csvStatus = page.querySelector('#csv-status');
    const csvUploader_database = page.querySelector('#csv-uploader-database');

    // Menyimpan daftar file/data
    let fileList = [];
    let csvHeader = []; 
    let dataSourceMode = null; 

    // --- 1. Event Listener untuk Upload ---
    zipUploader.addEventListener('change', handleZipUpload);
    csvUploader_database.addEventListener('change', handleCsvUpload_asDatabase);


    async function handleZipUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        dataSourceMode = 'zip'; 
        uploadStatus.textContent = 'Membaca file zip... Ini mungkin perlu waktu beberapa saat.';
        fileList = []; 
        csvHeader = []; 

        try {
            const zip = await JSZip.loadAsync(file);
            
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir) {
                    fileList.push({
                        name: zipEntry.name.toLowerCase(), // Langsung ubah ke lowercase
                        entry: zipEntry      
                    });
                }
            });

            uploadStatus.textContent = `Selesai! ${fileList.length} file berhasil dimuat.`;
            
            uploadSection.classList.add('is-hidden');
            searchSection.classList.remove('is-hidden');
            
            renderResults(); 

        } catch (error) {
            console.error("Error membaca file zip:", error);
            uploadStatus.textContent = 'Gagal membaca file zip. Pastikan file tidak rusak.';
        }
    }

    // --- Fungsi untuk Upload CSV sebagai Database ---
    function handleCsvUpload_asDatabase(event) {
        const file = event.target.files[0];
        if (!file) return;

        dataSourceMode = 'csv'; 
        uploadStatus.textContent = 'Membaca file CSV...';
        fileList = [];
        csvHeader = [];

        Papa.parse(file, {
            delimiter: "", // Deteksi otomatis
            skipEmptyLines: true,
            complete: function(results) {
                try {
                    if (results.data.length === 0) {
                        uploadStatus.textContent = 'File CSV kosong.';
                        return;
                    }
                    
                    csvHeader = results.data[0];
                    const dataRows = results.data.slice(1); 

                    dataRows.forEach(row => {
                        const rowString = row.join(' ').toLowerCase(); 
                        fileList.push({
                            name: rowString, // Ini yang akan dicari
                            entry: row        // Ini data baris asli (array)
                        });
                    });

                    uploadStatus.textContent = `Selesai! ${csvHeader.length} kolom dan ${fileList.length} baris data dimuat.`;
                    
                    uploadSection.classList.add('is-hidden');
                    searchSection.classList.remove('is-hidden');
                    renderResults();

                } catch (error) {
                    console.error("Error memproses CSV:", error);
                    uploadStatus.textContent = 'Gagal memproses data CSV.';
                }
            },
            error: function(err) {
                console.error("Error membaca CSV:", err);
                uploadStatus.textContent = 'Gagal membaca file CSV.';
            }
        });
    }


    // --- 2. Event Listener untuk Pencarian ---
    searchInput.addEventListener('input', renderResults);
    bulkSelectBtn.addEventListener('click', handleBulkSelect);
    clearSelectionBtn.addEventListener('click', handleClearSelection);
    csvUploader.addEventListener('change', handleCsvUpload_forBulk);

    // --- Logika Render ---
    function renderResults() {
        const query = searchInput.value.toLowerCase().trim();
        resultsContainer.innerHTML = '';
        
        const filteredList = fileList.filter(file => 
            file.name.includes(query) // 'file.name' sudah lowercase
        );

        if (filteredList.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Tidak ada data yang cocok dengan pencarian "${query}".</div>`;
            updateDownloadButtonState();
            return;
        }

        // --- ALUR 1: RENDER SEBAGAI TABEL (untuk CSV) ---
        if (dataSourceMode === 'csv') {
            const table = document.createElement('table');
            // Menggunakan kelas tabel dari style.css
            table.className = 'results-table'; 

            const thead = document.createElement('thead');
            // Kelas thead dari style.css
            thead.className = 'sticky top-0'; 
            let headerHtml = '<tr><th>Pilih</th>'; // Biarkan style.css menangani padding/border
            csvHeader.forEach(h => {
                headerHtml += `<th>${h}</th>`;
            });
            headerHtml += '</tr>';
            thead.innerHTML = headerHtml;
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            let bodyHtml = '';
            filteredList.forEach(file => {
                const rowData = file.entry; // Ambil data baris asli (array)
                const uniqueId = file.name.replace(/"/g, '&quot;'); 
                
                bodyHtml += `<tr class="hover-row">`; // Ganti hover:bg-gray-50
                // Kolom Checkbox
                bodyHtml += `<td><input type="checkbox" data-filename="${uniqueId}" class="result-checkbox"></td>`;
                // Kolom Data
                rowData.forEach(cell => {
                    bodyHtml += `<td>${cell}</td>`;
                });
                bodyHtml += `</tr>`;
            });
            
            tbody.innerHTML = bodyHtml;
            table.appendChild(tbody);
            resultsContainer.appendChild(table);
        }
        // --- ALUR 2: RENDER SEBAGAI DAFTAR (untuk ZIP) ---
        else {
            filteredList.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.className = 'result-item'; // Menggunakan kelas dari style.css
                const originalFileName = file.entry.name;
                const uniqueId = file.name.replace(/"/g, '&quot;');
                fileElement.innerHTML = `
                    <label class="result-item-label">
                        <input type="checkbox" data-filename="${uniqueId}" class="result-checkbox" style="margin-right: 0.75rem; height: 1.1rem; width: 1.1rem;">
                        <span title="${originalFileName}">${originalFileName}</span>
                    </label>
                `;
                resultsContainer.appendChild(fileElement);
            });
        }
        updateDownloadButtonState();
    }

    // --- 3. Event Listener untuk Checkbox ---
    resultsContainer.addEventListener('change', (event) => {
        if (event.target.classList.contains('result-checkbox')) {
            updateDownloadButtonState();
        }
    });

    function updateDownloadButtonState() {
        const checkedBoxes = page.querySelectorAll('.result-checkbox:checked');
        
        if (checkedBoxes.length > 0) {
            downloadSelectedBtn.disabled = false;
            if (dataSourceMode === 'zip') {
                downloadSelectedBtn.textContent = `Unduh ${checkedBoxes.length} File Terpilih`;
            } else if (dataSourceMode === 'csv') {
                downloadSelectedBtn.textContent = `Unduh ${checkedBoxes.length} Baris Terpilih`;
            }
        } else {
            downloadSelectedBtn.disabled = true;
            downloadSelectedBtn.textContent = 'Unduh Terpilih';
        }
    }

    // --- Fungsi untuk Bulk Select ---
    function handleBulkSelect() {
        const idsToSelect = bulkSearchArea.value.split('\n')
            .map(id => id.trim().toLowerCase()) 
            .filter(id => id.length > 0);

        if (idsToSelect.length === 0) return;

        const allCheckboxes = page.querySelectorAll('.result-checkbox');
        
        allCheckboxes.forEach(checkbox => {
            const dataId = checkbox.dataset.filename; // 'data-filename' sudah lowercase
            const isMatch = idsToSelect.some(id => dataId.includes(id));
            if (isMatch) {
                checkbox.checked = true;
            }
        });
        updateDownloadButtonState();
    }

    function handleClearSelection() {
        const allCheckboxes = page.querySelectorAll('.result-checkbox');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateDownloadButtonState();
    }

    // --- 4. Logika Download ---
    downloadSelectedBtn.addEventListener('click', handleDownloadSelected);

    async function handleDownloadSelected() {
        const checkedBoxes = page.querySelectorAll('.result-checkbox:checked');
        if (checkedBoxes.length === 0) return;

        downloadStatus.textContent = 'Mempersiapkan file...';
        
        try {
            // LOGIKA UNTUK MODE ZIP
            if (dataSourceMode === 'zip') {
                if (checkedBoxes.length === 1) {
                    const fileName = checkedBoxes[0].dataset.filename;
                    const file = fileList.find(f => f.name === fileName);
                    if (file) {
                        const blob = await file.entry.async('blob');
                        triggerDownload(blob, file.entry.name); // Gunakan nama asli
                    }
                } else {
                    const newZip = new JSZip();
                    const filePromises = [];
                    checkedBoxes.forEach(box => {
                        const fileName = box.dataset.filename;
                        const file = fileList.find(f => f.name === fileName);
                        if (file) {
                            filePromises.push(
                                file.entry.async('blob').then(blob => {
                                    newZip.file(file.entry.name, blob); // Gunakan nama asli
                                })
                            );
                        }
                    });
                    await Promise.all(filePromises);
                    const zipBlob = await newZip.generateAsync({ type: 'blob' });
                    triggerDownload(zipBlob, 'arsip_terpilih.zip');
                }
            } 
            // LOGIKA BARU UNTUK MODE CSV
            else if (dataSourceMode === 'csv') {
                let selectedData = [csvHeader]; // Tambahkan header
                
                checkedBoxes.forEach(box => {
                    const rowString = box.dataset.filename;
                    const file = fileList.find(f => f.name === rowString);
                    if (file) {
                        selectedData.push(file.entry); // file.entry berisi array row asli
                    }
                });

                const newCsvString = convertArrayToCsv(selectedData);
                const blob = new Blob([newCsvString], { type: 'text/csv;charset=utf-8;' });
                triggerDownload(blob, 'data_terpilih.csv');
            }
            downloadStatus.textContent = 'Unduhan selesai!';
        } catch (error) {
            console.error("Error saat mengunduh:", error);
            downloadStatus.textContent = 'Terjadi kesalahan saat mengunduh file.';
        }
        setTimeout(() => { downloadStatus.textContent = ''; }, 3000);
    }

    // --- 5. Event Listener untuk "Mulai Ulang" ---
    reloadBtn.addEventListener('click', () => {
        // Reset state
        fileList = [];
        csvHeader = [];
        dataSourceMode = null;
        searchInput.value = '';
        bulkSearchArea.value = '';
        csvStatus.textContent = '';
        resultsContainer.innerHTML = '';
        uploadStatus.textContent = '';
        zipUploader.value = '';
        csvUploader.value = '';
        csvUploader_database.value = '';
        
        // Tukar tampilan
        searchSection.classList.add('is-hidden');
        uploadSection.classList.remove('is-hidden');
        updateDownloadButtonState();
    });

    // --- Fungsi Bantuan untuk Memicu Unduhan ---
    function triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Fungsi Bantuan Konversi CSV ---
    function convertArrayToCsv(data) {
        const csvRows = [];
        data.forEach(row => {
            const escapedRow = row.map(cell => {
                if (cell == null) return '';
                let cellString = String(cell);
                cellString = cellString.replace(/"/g, '""'); 
                if (cellString.search(/("|,|\n)/g) >= 0) { 
                    cellString = `"${cellString}"`;
                }
                return cellString;
            });
            csvRows.push(escapedRow.join(','));
        });
        return csvRows.join('\n');
    }

    // --- Fungsi untuk Upload CSV (Bulk Select) ---
    function handleCsvUpload_forBulk(event) {
        const file = event.target.files[0];
        if (!file) return;
        csvStatus.textContent = 'Membaca CSV...';

        Papa.parse(file, {
            delimiter: "", // Deteksi otomatis
            complete: function(results) {
                if (results.data.length < 1) { 
                    csvStatus.textContent = 'File CSV kosong.';
                    return;
                }
                
                const idsList = results.data
                    .map(row => (row && row[0] ? row[0].trim() : '')) // Ambil kolom pertama
                    .filter(id => id.length > 0); 
                
                const idsString = idsList.join('\n');
                bulkSearchArea.value = idsString;
                csvStatus.textContent = `Selesai! ${idsList.length} ID dimuat.`;
                csvUploader.value = ''; 
            },
            error: function(err) {
                console.error("Error membaca CSV:", err);
                csvStatus.textContent = 'Gagal membaca file CSV.';
            }
        });
    }
}