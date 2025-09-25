function initDataCompare() {
    const page = document.getElementById('DataCompare');
    page.innerHTML = `
        <div class="tool-header">
            <h1>Alat Perbandingan Data</h1>
            <p>Tempelkan dua set data (ID + Status) untuk melihat perbedaannya.</p>
        </div>
        <div class="card">
            <div class="grid grid-cols-2">
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Data Set 1 (Data Lama)</h3>
                    <textarea id="data1" rows="15" class="textarea textarea-editor" placeholder="Contoh:\nSS112233 A\nSS112244 L\n..."></textarea>
                </div>
                <div>
                    <h3 style="font-weight: 600; margin-bottom: 0.5rem;">Data Set 2 (Data Baru)</h3>
                    <textarea id="data2" rows="15" class="textarea textarea-editor" placeholder="Tempelkan data yang lebih baru di sini..."></textarea>
                </div>
            </div>
            <div class="text-center" style="margin-top: 2rem;">
                <button id="compareBtn" class="button primary" style="padding: 0.8rem 2.5rem; font-size: 1.1rem;">
                    Bandingkan Data
                </button>
            </div>
        </div>

        <div id="results" style="margin-top: 2rem;"></div>
        
        <div class="text-center is-hidden" id="export-container" style="margin-top: 1.5rem;">
             <button id="exportBtn" class="button success">
                <i class="fas fa-download" style="margin-right: 0.5rem;"></i> Ekspor ke CSV
            </button>
        </div>
    `;

    const compareBtn = page.querySelector('#compareBtn');
    const exportBtn = page.querySelector('#exportBtn');
    const exportContainer = page.querySelector('#export-container');
    const data1Textarea = page.querySelector('#data1');
    const data2Textarea = page.querySelector('#data2');
    const resultsDiv = page.querySelector('#results');

    function parseDataToMap(text) {
        const dataMap = new Map();
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
                const id = parts[0];
                const status = parts.slice(1).join(' ');
                dataMap.set(id, status);
            }
        });
        return dataMap;
    }

    compareBtn.addEventListener('click', () => {
        const data1Map = parseDataToMap(data1Textarea.value);
        const data2Map = parseDataToMap(data2Textarea.value);

        const removed = [], added = [], changed = [], identical = [];

        for (const [id, status1] of data1Map.entries()) {
            if (data2Map.has(id)) {
                const status2 = data2Map.get(id);
                if (status1 !== status2) {
                    changed.push({ id, status1, status2 });
                } else {
                    identical.push({ id, status1, status2 });
                }
            } else {
                removed.push({ id, status: status1 });
            }
        }
        
        for (const [id, status2] of data2Map.entries()) {
            if (!data1Map.has(id)) {
                added.push({ id, status: status2 });
            }
        }
        
        displayResults(removed, added, changed, identical);
    });
    
    function displayResults(removed, added, changed, identical) {
        resultsDiv.innerHTML = ''; 
        exportContainer.classList.add('is-hidden'); 

        const totalItems = identical.length + changed.length + added.length + removed.length;

        if (totalItems === 0) {
            resultsDiv.innerHTML = `<div class="card text-center"><p>Tidak ada data untuk dibandingkan. Silakan tempelkan data pada kedua kolom di atas.</p></div>`;
            return;
        }

        const summaryHtml = `
            <div class="summary-box">
                <h3 class="tool-header text-center" style="margin-bottom: 1.5rem;">Ringkasan Perbandingan</h3>
                <div class="grid grid-cols-4">
                    <div class="summary-item identical"><span class="count">${identical.length}</span><span class="label">Sama</span></div>
                    <div class="summary-item changed"><span class="count">${changed.length}</span><span class="label">Berubah</span></div>
                    <div class="summary-item added"><span class="count">${added.length}</span><span class="label">Baru</span></div>
                    <div class="summary-item removed"><span class="count">${removed.length}</span><span class="label">Dihapus</span></div>
                </div>
            </div>
        `;

        const allItems = [
            ...changed.map(item => ({ id: item.id, status1: item.status1, status2: item.status2, type: 'changed' })),
            ...added.map(item => ({ id: item.id, status1: '-', status2: item.status, type: 'added' })),
            ...removed.map(item => ({ id: item.id, status1: item.status, status2: '-', type: 'removed' })),
            ...identical.map(item => ({ id: item.id, status1: item.status1, status2: item.status2, type: 'identical' }))
        ].sort((a,b) => a.id.localeCompare(b.id));

        let tableRows = '';
        allItems.forEach((item, index) => {
            const typeClass = `row-${item.type}`;
            tableRows += `
                <tr class="${typeClass}">
                    <td>${index + 1}</td>
                    <td>${item.id}</td>
                    <td>${item.status1}</td>
                    <td>${item.status2}</td>
                    <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
                </tr>`;
        });

        resultsDiv.innerHTML = summaryHtml + `
            <div class="card">
                <div class="results-table-wrapper">
                    <table id="resultsTable" class="results-table">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>ID</th>
                                <th>Status Lama</th>
                                <th>Status Baru</th>
                                <th>Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        
        exportContainer.classList.remove('is-hidden');
    }

    function exportTableToCSV(filename) {
        const csv = [];
        const rows = page.querySelectorAll("#resultsTable tr");
        
        for (const row of rows) {
            const cols = row.querySelectorAll("td, th");
            const rowData = Array.from(cols).map(col => `"${col.innerText.replace(/"/g, '""')}"`);
            csv.push(rowData.join(","));
        }

        const csvFile = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
        const downloadLink = document.createElement("a");
        downloadLink.href = window.URL.createObjectURL(csvFile);
        downloadLink.download = filename;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    exportBtn.addEventListener('click', () => {
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        exportTableToCSV(`perbandingan_data_${timestamp}.csv`);
    });
}